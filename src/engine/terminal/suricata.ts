/*
 * Suricata in offline mode: `suricata -r capture.pcap -S rules.rules -l logdir` reads a capture file, runs the
 * rules and writes fast.log and eve.json (alerts) into the log directory, as the real engine does.
 *
 * Rule subset: actions alert/drop/pass; protocols ip, tcp, udp, icmp, http, dns, tls; addresses with variables
 * ($HOME_NET, $EXTERNAL_NET from /etc/suricata/suricata.yaml), CIDRs, lists and negation; ports with lists and
 * ranges; -> and <>. Keywords: msg, sid, rev, classtype, priority, reference, metadata, content (with |hex|,
 * negation, nocase, startswith, endswith, depth/offset accepted), sticky buffers http.uri / http.host /
 * http.user_agent / http.method / http.request_body / http.stat_code / dns.query / tls.sni, the old http_*
 * modifiers, pcre, flow, flags, threshold, detection_filter. Matching is per packet (no stream reassembly).
 */

import { decodeCapture, dissect, type Frame } from './pcap';
import { fail, ok, type Command, type CmdCtx } from './shell';
import { cidrMatch } from '../siem/values';
import { nodeAt, parseArgs, readText, writeText } from './toolio';

class RuleError extends Error {}

interface Addr {
  neg: boolean;
  any: boolean;
  items: Addr[] | string[];
}

interface Content {
  buffer: string;
  pattern: string;
  neg: boolean;
  nocase: boolean;
  startswith: boolean;
  endswith: boolean;
  regex?: RegExp;
}

interface Threshold {
  type: 'limit' | 'threshold' | 'both' | 'filter';
  track: 'by_src' | 'by_dst';
  count: number;
  seconds: number;
}

export interface SuriRule {
  raw: string;
  action: string;
  proto: string;
  src: Addr;
  sport: string;
  dir: '->' | '<>';
  dst: Addr;
  dport: string;
  msg: string;
  sid: number;
  rev: number;
  classtype: string;
  priority: number;
  contents: Content[];
  flags?: string;
  toServer?: boolean;
  toClient?: boolean;
  threshold?: Threshold;
}

const CLASSTYPES: Record<string, [string, number]> = {
  'attempted-recon': ['Attempted Information Leak', 2],
  'successful-recon-limited': ['Information Leak', 2],
  'web-application-attack': ['Web Application Attack', 1],
  'web-application-activity': ['Access to a potentially vulnerable web application', 2],
  'attempted-admin': ['Attempted Administrator Privilege Gain', 1],
  'attempted-user': ['Attempted User Privilege Gain', 1],
  'trojan-activity': ['A Network Trojan was detected', 1],
  'policy-violation': ['Potential Corporate Privacy Violation', 1],
  'bad-unknown': ['Potentially Bad Traffic', 2],
  'network-scan': ['Detection of a Network Scan', 3],
  'misc-activity': ['Misc activity', 3],
  'credential-theft': ['Successful Credential Theft Detected', 1],
  'command-and-control': ['Malware Command and Control Activity Detected', 1],
};

const BUFFERS: Record<string, string> = {
  'http.uri': 'http.request.uri',
  'http.host': 'http.host',
  'http.user_agent': 'http.user_agent',
  'http.method': 'http.request.method',
  'http.request_body': 'http.file_data',
  'http.stat_code': 'http.response.code',
  'dns.query': 'dns.qry.name',
  'tls.sni': 'tls.handshake.extensions_server_name',
};
const OLD_MODIFIERS: Record<string, string> = {
  http_uri: 'http.uri',
  http_host: 'http.host',
  http_user_agent: 'http.user_agent',
  http_method: 'http.method',
  http_client_body: 'http.request_body',
  http_stat_code: 'http.stat_code',
};
const IGNORED = ['reference', 'metadata', 'fast_pattern', 'depth', 'offset', 'distance', 'within', 'target', 'noalert', 'app-layer-protocol', 'bsize'];

/* ── parsing ─────────────────────────────────────────────────────── */

function parseAddr(text: string, vars: Record<string, string>, depth = 0): Addr {
  let s = text.trim();
  let neg = false;
  if (s.startsWith('!')) {
    neg = true;
    s = s.slice(1);
  }
  if (s.startsWith('$')) {
    const v = vars[s.slice(1)];
    if (v === undefined) throw new RuleError(`variable "${s}" is not defined in the address group`);
    if (depth > 5) throw new RuleError('address variable recursion');
    const inner = parseAddr(v, vars, depth + 1);
    return { neg: neg !== inner.neg, any: inner.any, items: inner.items };
  }
  if (s === 'any') return { neg, any: true, items: [] };
  if (s.startsWith('[') && s.endsWith(']')) {
    return { neg, any: false, items: splitList(s.slice(1, -1)).map((x) => parseAddr(x, vars, depth + 1)) };
  }
  if (!/^\d{1,3}(\.\d{1,3}){3}(\/\d{1,2})?$/.test(s)) throw new RuleError(`address "${s}" is invalid`);
  return { neg, any: false, items: [s] };
}

function splitList(s: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let cur = '';
  for (const c of s) {
    if (c === '[') depth++;
    if (c === ']') depth--;
    if (c === ',' && depth === 0) {
      out.push(cur.trim());
      cur = '';
    } else cur += c;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

function addrMatch(a: Addr, ip: string): boolean {
  let hit: boolean;
  if (a.any) hit = true;
  else hit = (a.items as (Addr | string)[]).some((x) => (typeof x === 'string' ? cidrMatch(x.includes('/') ? x : `${x}/32`, ip) : addrMatch(x, ip)));
  return a.neg ? !hit : hit;
}

function portMatch(spec: string, port: number | undefined, vars: Record<string, string>): boolean {
  let s = spec.trim();
  let neg = false;
  if (s.startsWith('!')) {
    neg = true;
    s = s.slice(1);
  }
  if (s.startsWith('$')) s = vars[s.slice(1)] ?? 'any';
  let hit: boolean;
  if (s === 'any') hit = true;
  else if (port === undefined) hit = false;
  else {
    const parts = s.startsWith('[') ? splitList(s.slice(1, -1)) : [s];
    hit = parts.some((p) => {
      if (p.startsWith('!')) return !portMatch(p.slice(1), port, vars);
      const m = /^(\d*):(\d*)$/.exec(p);
      if (m) return port >= (m[1] ? Number(m[1]) : 0) && port <= (m[2] ? Number(m[2]) : 65535);
      return Number(p) === port;
    });
  }
  return neg ? !hit : hit;
}

function unhex(s: string): string {
  // |2e 70 73| inside content means bytes.
  return s.replace(/\|([0-9a-fA-F\s]+)\|/g, (_, hex: string) =>
    hex
      .trim()
      .split(/\s+/)
      .map((h) => String.fromCharCode(parseInt(h, 16)))
      .join(''),
  );
}

function splitOptions(body: string): string[] {
  const out: string[] = [];
  let cur = '';
  let quote = false;
  for (let i = 0; i < body.length; i++) {
    const c = body[i]!;
    if (c === '\\' && i + 1 < body.length) {
      cur += c + body[++i];
      continue;
    }
    if (c === '"') quote = !quote;
    if (c === ';' && !quote) {
      if (cur.trim()) out.push(cur.trim());
      cur = '';
    } else cur += c;
  }
  if (quote) throw new RuleError('unterminated quoted string in rule options');
  if (cur.trim()) throw new RuleError(`no terminating ";" found`);
  return out;
}

const unquote = (s: string) => {
  const t = s.trim();
  return t.startsWith('"') && t.endsWith('"') ? t.slice(1, -1).replace(/\\(["\\;:])/g, '$1') : t;
};

export function parseRule(raw: string, vars: Record<string, string>): SuriRule {
  const m = /^(\S+)\s+(\S+)\s+(\S+|\[[^\]]*\])\s+(\S+|\[[^\]]*\])\s+(->|<>)\s+(\S+|\[[^\]]*\])\s+(\S+|\[[^\]]*\])\s*\((.*)\)\s*$/s.exec(raw.trim());
  if (!m) throw new RuleError('rule header is invalid: expected "action proto src_ip src_port -> dst_ip dst_port (options;)"');
  const [, action, proto, src, sport, dir, dst, dport, body] = m;
  if (!['alert', 'drop', 'pass', 'reject'].includes(action!)) throw new RuleError(`An invalid action "${action}" was given`);
  if (!['ip', 'tcp', 'udp', 'icmp', 'http', 'dns', 'tls'].includes(proto!)) throw new RuleError(`protocol "${proto}" cannot be used in a signature`);
  const rule: SuriRule = {
    raw: raw.trim(),
    action: action!,
    proto: proto!,
    src: parseAddr(src!, vars),
    sport: sport!,
    dir: dir as '->' | '<>',
    dst: parseAddr(dst!, vars),
    dport: dport!,
    msg: '',
    sid: 0,
    rev: 1,
    classtype: '',
    priority: 3,
    contents: [],
  };
  let sticky = 'payload';
  for (const opt of splitOptions(body!)) {
    const i = opt.indexOf(':');
    const key = (i < 0 ? opt : opt.slice(0, i)).trim();
    const val = i < 0 ? '' : opt.slice(i + 1).trim();
    const last = rule.contents[rule.contents.length - 1];
    if (key in BUFFERS) {
      sticky = key;
      continue;
    }
    if (key in OLD_MODIFIERS) {
      if (!last) throw new RuleError(`"${key}" needs a preceding content option`);
      last.buffer = OLD_MODIFIERS[key]!;
      continue;
    }
    switch (key) {
      case 'msg':
        rule.msg = unquote(val);
        break;
      case 'sid':
        if (!/^\d+$/.test(val)) throw new RuleError(`invalid sid "${val}"`);
        rule.sid = Number(val);
        break;
      case 'rev':
        rule.rev = Number(val) || 1;
        break;
      case 'classtype':
        if (!CLASSTYPES[val]) throw new RuleError(`unknown classtype: "${val}"`);
        rule.classtype = val;
        rule.priority = CLASSTYPES[val]![1];
        break;
      case 'priority':
        rule.priority = Number(val) || rule.priority;
        break;
      case 'content': {
        const neg = val.startsWith('!');
        const text = unquote(neg ? val.slice(1) : val);
        if (!text) throw new RuleError('content is empty');
        rule.contents.push({ buffer: sticky, pattern: unhex(text), neg, nocase: false, startswith: false, endswith: false });
        break;
      }
      case 'nocase':
      case 'startswith':
      case 'endswith':
        if (!last) throw new RuleError(`"${key}" needs a preceding content option`);
        last[key] = true;
        break;
      case 'pcre': {
        const pm = /^"?!?\/(.*)\/([ismxUR]*)"?$/s.exec(val);
        if (!pm) throw new RuleError(`pcre "${val}" is invalid`);
        let re: RegExp;
        try {
          re = new RegExp(pm[1]!, pm[2]!.replace(/[xUR]/g, ''));
        } catch {
          throw new RuleError(`pcre compile of "${pm[1]}" failed`);
        }
        rule.contents.push({ buffer: pm[2]!.includes('U') ? 'http.uri' : sticky, pattern: '', regex: re, neg: val.startsWith('!') || val.startsWith('"!'), nocase: false, startswith: false, endswith: false });
        break;
      }
      case 'flow':
        for (const f of val.split(',').map((x) => x.trim())) {
          if (f === 'to_server' || f === 'from_client') rule.toServer = true;
          else if (f === 'to_client' || f === 'from_server') rule.toClient = true;
          else if (!['established', 'stateless', 'not_established', 'only_stream', 'no_stream'].includes(f)) throw new RuleError(`invalid flow option "${f}"`);
        }
        break;
      case 'flags':
        rule.flags = val.split(',')[0]!.trim();
        break;
      case 'threshold':
      case 'detection_filter': {
        const parts = Object.fromEntries(val.split(',').map((x) => x.trim().split(/\s+/) as [string, string]));
        const type = key === 'detection_filter' ? 'filter' : parts.type;
        if (!['limit', 'threshold', 'both', 'filter'].includes(type ?? '')) throw new RuleError(`${key}: type must be limit, threshold or both`);
        if (!['by_src', 'by_dst'].includes(parts.track ?? '')) throw new RuleError(`${key}: track must be by_src or by_dst`);
        const count = Number(parts.count);
        const seconds = Number(parts.seconds);
        if (!(count > 0) || !(seconds > 0)) throw new RuleError(`${key}: count and seconds must be positive numbers`);
        rule.threshold = { type: type as Threshold['type'], track: parts.track as Threshold['track'], count, seconds };
        break;
      }
      default:
        if (IGNORED.includes(key)) break;
        throw new RuleError(`unknown rule keyword '${key}'.`);
    }
  }
  if (!rule.sid) throw new RuleError('Signature missing required value "sid".');
  if (!rule.msg) rule.msg = '';
  return rule;
}

/* ── matching ────────────────────────────────────────────────────── */

function bufferValues(fr: Frame, buffer: string): string[] {
  if (buffer === 'payload') return fr.p.data ? [fr.p.data] : [];
  if (buffer === 'dns.query' && Number(fr.fields.get('dns.flags.response')?.[0]) !== 0) return [];
  const field = BUFFERS[buffer]!;
  return (fr.fields.get(field) ?? []).map(String);
}

function contentMatch(c: Content, fr: Frame): boolean {
  const vals = bufferValues(fr, c.buffer);
  const hit = vals.some((v) => {
    if (c.regex) return c.regex.test(v);
    const hay = c.nocase ? v.toLowerCase() : v;
    const pat = c.nocase ? c.pattern.toLowerCase() : c.pattern;
    if (c.startswith && c.endswith) return hay === pat;
    if (c.startswith) return hay.startsWith(pat);
    if (c.endswith) return hay.endsWith(pat);
    return hay.includes(pat);
  });
  // A negated content on a buffer the packet does not have does not match either (the buffer must exist).
  if (c.neg) return vals.length > 0 && !hit;
  return hit;
}

function protoOk(rule: SuriRule, fr: Frame): boolean {
  const p = fr.p;
  switch (rule.proto) {
    case 'ip':
      return p.p !== 'ARP';
    case 'tcp':
      return p.p === 'TCP';
    case 'udp':
      return p.p === 'UDP';
    case 'icmp':
      return p.p === 'ICMP';
    case 'http':
      return fr.fields.has('http');
    case 'dns':
      return fr.fields.has('dns');
    case 'tls':
      return fr.fields.has('tls');
  }
  return false;
}

function headerOk(rule: SuriRule, fr: Frame, vars: Record<string, string>, reverse: boolean): boolean {
  const p = fr.p;
  const [sip, sp, dip, dp] = reverse ? [p.dst, p.dp, p.src, p.sp] : [p.src, p.sp, p.dst, p.dp];
  return addrMatch(rule.src, sip) && addrMatch(rule.dst, dip) && portMatch(rule.sport, sp, vars) && portMatch(rule.dport, dp, vars);
}

/** Server side of a packet's flow: the port a client connects to is the lower, well-known one. */
function toServer(fr: Frame): boolean {
  const p = fr.p;
  if (p.sp === undefined || p.dp === undefined) return true;
  if (fr.fields.has('http.request') || (fr.fields.has('dns') && Number(fr.fields.get('dns.flags.response')?.[0]) === 0)) return true;
  if (fr.fields.has('http.response')) return false;
  return p.dp < p.sp;
}

export interface Alert {
  rule: SuriRule;
  frame: Frame;
}

export function runRules(rules: SuriRule[], frames: Frame[], vars: Record<string, string>): Alert[] {
  const alerts: Alert[] = [];
  const state = new Map<string, { start: number; count: number; fired: number }>();
  for (const fr of frames) {
    for (const rule of rules) {
      if (rule.action === 'pass') continue;
      if (!protoOk(rule, fr)) continue;
      if (!headerOk(rule, fr, vars, false) && !(rule.dir === '<>' && headerOk(rule, fr, vars, true))) continue;
      if (rule.toServer && !toServer(fr)) continue;
      if (rule.toClient && toServer(fr)) continue;
      if (rule.flags) {
        // flags:S means exactly SYN; the simulator compares the set of flags.
        const want = rule.flags.replace(/[^SAFRPU]/g, '').split('').sort().join('');
        const got = (fr.p.fl ?? '').split('').sort().join('');
        if (want !== got) continue;
      }
      if (!rule.contents.every((c) => contentMatch(c, fr))) continue;
      const th = rule.threshold;
      if (!th) {
        alerts.push({ rule, frame: fr });
        continue;
      }
      const key = `${rule.sid}|${th.track === 'by_src' ? fr.p.src : fr.p.dst}`;
      let s = state.get(key);
      if (!s || fr.p.t - s.start > th.seconds) {
        s = { start: fr.p.t, count: 0, fired: 0 };
        state.set(key, s);
      }
      s.count++;
      if (th.type === 'limit' && s.fired < th.count) {
        s.fired++;
        alerts.push({ rule, frame: fr });
      } else if (th.type === 'threshold' && s.count % th.count === 0) {
        alerts.push({ rule, frame: fr });
      } else if (th.type === 'both' && s.count === th.count) {
        alerts.push({ rule, frame: fr });
      } else if (th.type === 'filter' && s.count > th.count) {
        alerts.push({ rule, frame: fr });
      }
    }
  }
  return alerts;
}

/* ── output ──────────────────────────────────────────────────────── */

const pad = (n: number, w = 2) => String(n).padStart(w, '0');

function fastTime(t: number): string {
  const d = new Date(Math.floor(t) * 1000);
  const us = Math.round((t % 1) * 1e6);
  return `${pad(d.getUTCMonth() + 1)}/${pad(d.getUTCDate())}/${d.getUTCFullYear()}-${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}.${pad(us, 6)}`;
}

function eveTime(t: number): string {
  const d = new Date(Math.floor(t) * 1000);
  const us = Math.round((t % 1) * 1e6);
  return `${d.toISOString().slice(0, 19)}.${pad(us, 6)}+0000`;
}

const appProto = (fr: Frame) => (fr.fields.has('http') ? 'http' : fr.fields.has('dns') ? 'dns' : fr.fields.has('tls') ? 'tls' : fr.fields.has('ssh') ? 'ssh' : fr.fields.has('ftp') ? 'ftp' : undefined);

export function fastLine(a: Alert): string {
  const p = a.frame.p;
  const [cls] = CLASSTYPES[a.rule.classtype] ?? ['(null)'];
  const ep = (ip: string, port?: number) => (port === undefined ? ip : `${ip}:${port}`);
  return `${fastTime(p.t)}  [**] [1:${a.rule.sid}:${a.rule.rev}] ${a.rule.msg} [**] [Classification: ${cls}] [Priority: ${a.rule.priority}] {${p.p}} ${ep(p.src, p.sp)} -> ${ep(p.dst, p.dp)}`;
}

export function eveLine(a: Alert, flowId: number): string {
  const p = a.frame.p;
  const f = a.frame.fields;
  const get = (k: string) => f.get(k)?.[0];
  const ev: Record<string, unknown> = {
    timestamp: eveTime(p.t),
    flow_id: flowId,
    event_type: 'alert',
    src_ip: p.src,
    ...(p.sp !== undefined ? { src_port: p.sp } : {}),
    dest_ip: p.dst,
    ...(p.dp !== undefined ? { dest_port: p.dp } : {}),
    proto: p.p,
    ...(appProto(a.frame) ? { app_proto: appProto(a.frame) } : {}),
    alert: {
      action: a.rule.action === 'drop' ? 'blocked' : 'allowed',
      gid: 1,
      signature_id: a.rule.sid,
      rev: a.rule.rev,
      signature: a.rule.msg,
      category: CLASSTYPES[a.rule.classtype]?.[0] ?? '',
      severity: a.rule.priority,
    },
  };
  if (f.has('http.request')) ev.http = { hostname: get('http.host'), url: get('http.request.uri'), http_user_agent: get('http.user_agent'), http_method: get('http.request.method') };
  if (f.has('dns')) ev.dns = { query: [{ rrname: get('dns.qry.name') }] };
  if (f.has('tls') && get('tls.handshake.extensions_server_name')) ev.tls = { sni: get('tls.handshake.extensions_server_name') };
  return JSON.stringify(ev);
}

/* ── command ─────────────────────────────────────────────────────── */

const DEFAULT_VARS: Record<string, string> = {
  HOME_NET: '[10.0.0.0/8,172.16.0.0/12,192.168.0.0/16]',
  EXTERNAL_NET: '!$HOME_NET',
  HTTP_SERVERS: '$HOME_NET',
  DNS_SERVERS: '$HOME_NET',
  HTTP_PORTS: '80',
  SSH_PORTS: '22',
};

/** Address and port variables: defaults, overridden by `NAME: "value"` lines in /etc/suricata/suricata.yaml. */
export function suricataVars(ctx: CmdCtx): Record<string, string> {
  const vars = { ...DEFAULT_VARS };
  const conf = nodeAt(ctx, '/etc/suricata/suricata.yaml').node;
  if (conf?.type === 'file') {
    for (const m of conf.content.matchAll(/^\s*([A-Z_]+):\s*"([^"]+)"/gm)) vars[m[1]!] = m[2]!;
  }
  return vars;
}

export function loadRuleFile(text: string, vars: Record<string, string>, file: string): { rules: SuriRule[]; errors: string[] } {
  const rules: SuriRule[] = [];
  const errors: string[] = [];
  const sids = new Set<number>();
  text.split('\n').forEach((line, i) => {
    const l = line.trim();
    if (!l || l.startsWith('#')) return;
    try {
      const r = parseRule(l, vars);
      if (sids.has(r.sid)) throw new RuleError(`Duplicate signature "${r.sid}"`);
      sids.add(r.sid);
      rules.push(r);
    } catch (e) {
      if (!(e instanceof RuleError)) throw e;
      errors.push(`E: detect-parse: ${e.message}`, `E: detect: error parsing signature "${l}" from file ${file} at line ${i + 1}`);
    }
  });
  return { rules, errors };
}

export const suricata: Command = (args, ctx) => {
  if (!args.length || args.includes('-h') || args.includes('--help')) {
    return ok('Suricata 7.0.7\nUSAGE: suricata [OPTIONS] [BPF FILTER]\n\n\t-r <path>      : run in pcap file/offline mode\n\t-S <file.rules>: use signature file (exclusively)\n\t-s <file.rules>: use signature file (in addition to loaded files)\n\t-l <dir>       : default log directory\n\t-k none        : disable checksum validation\n\t-V             : display Suricata version\n\t-T             : test configuration file (use with -S to test rules)');
  }
  if (args.includes('-V') || args.includes('--build-info')) return ok('This is Suricata version 7.0.7 RELEASE');
  const { opts } = parseArgs(args, ['-r', '-S', '-s', '-l', '-k', '-c', '--runmode']);
  const testOnly = opts['-T'] === true;
  const vars = suricataVars(ctx);
  const ruleFiles = [opts['-S'], opts['-s']].filter((x): x is string => typeof x === 'string' && !!x);
  if (!ruleFiles.length) {
    const def = nodeAt(ctx, '/var/lib/suricata/rules/suricata.rules').node;
    if (def?.type === 'file') ruleFiles.push('/var/lib/suricata/rules/suricata.rules');
  }
  const out = ['i: suricata: This is Suricata version 7.0.7 RELEASE running in ' + (testOnly ? 'SYSTEM' : 'USER') + ' mode'];
  const rules: SuriRule[] = [];
  let failed = 0;
  for (const f of ruleFiles) {
    const r = readText(ctx, f, 'suricata');
    if (!r.ok) {
      out.push(`E: detect: opening rule file ${f}: No such file or directory.`);
      continue;
    }
    const loaded = loadRuleFile(r.text, vars, f);
    rules.push(...loaded.rules);
    failed += loaded.errors.length / 2;
    out.push(...loaded.errors);
  }
  out.push(`i: detect: ${ruleFiles.length} rule files processed. ${rules.length} rules successfully loaded, ${failed} rules failed, 0`);
  if (testOnly) {
    out.push(failed ? 'E: suricata: Loading signatures failed.' : 'i: suricata: Configuration provided was successfully loaded. Exiting.');
    return { out: out.join('\n'), code: failed ? 1 : 0 };
  }
  const pcap = opts['-r'];
  if (typeof pcap !== 'string' || !pcap) return fail(out.concat('E: suricata: no capture file given: use -r <file.pcap> (live capture is not available in this simulator)').join('\n'));
  const logDir = typeof opts['-l'] === 'string' ? (opts['-l'] as string) : '/var/log/suricata';
  const ld = nodeAt(ctx, logDir).node;
  if (!ld || ld.type !== 'dir') return fail(out.concat(`E: suricata: The logging directory "${logDir}" supplied at the command line (-l ${logDir}) doesn't exist. Shutting down the engine.`).join('\n'));
  const r = readText(ctx, pcap, 'suricata');
  if (!r.ok) return fail(out.concat(`E: pcap: failed to open pcap file ${pcap}: No such file or directory`).join('\n'));
  const packets = decodeCapture(r.text);
  if (!packets) return fail(out.concat(`E: pcap: ${pcap}: unknown file format`).join('\n'));
  const frames = dissect(packets);
  const alerts = runRules(rules, frames, vars);
  const flowIds = new Map<string, number>();
  const flowOf = (a: Alert) => {
    const p = a.frame.p;
    const k = [p.src, p.sp, p.dst, p.dp].join('|');
    const rk = [p.dst, p.dp, p.src, p.sp].join('|');
    const id = flowIds.get(k) ?? flowIds.get(rk) ?? 1_000_000_000_000 + flowIds.size * 7919;
    flowIds.set(k, id);
    return id;
  };
  const dir = logDir.replace(/\/+$/, '');
  const e1 = writeText(ctx, `${dir}/fast.log`, alerts.map(fastLine).join('\n') + (alerts.length ? '\n' : ''));
  const e2 = writeText(ctx, `${dir}/eve.json`, alerts.map((a) => eveLine(a, flowOf(a))).join('\n') + (alerts.length ? '\n' : ''));
  if (e1 || e2) return fail(out.concat(`E: logopenfile: ${e1 ?? e2}`).join('\n'));
  const bytes = frames.reduce((s, f) => s + f.len, 0);
  out.push('i: threads: Threads created -> RX: 1 W: 4 FM: 1 FR: 1   Engine started.', 'i: suricata: Signal Received.  Stopping engine.', `i: pcap: read 1 file, ${frames.length} packets, ${bytes} bytes`);
  return { out: out.join('\n'), code: 0 };
};
