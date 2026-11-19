/*
 * Zeek offline: `zeek -r capture.pcap` writes conn.log, dns.log, http.log and ssl.log (only those with entries)
 * into the current directory in Zeek's TSV format, and `zeek-cut` picks columns from them. The logs carry Zeek's
 * real column names; the simulator writes the main columns of each log, not every one.
 */

import { decodeCapture, dissect, type Frame } from './pcap';
import { fail, ok, type Command } from './shell';
import { parseArgs, readText, writeText } from './toolio';

type Cell = string | number | null;

interface Log {
  path: string;
  fields: string[];
  types: string[];
  rows: Cell[][];
}

function uidOf(key: string): string {
  // Deterministic, Zeek-looking connection ids: "C" + 17 base62 characters.
  const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  for (let i = 0; i < key.length; i++) {
    h1 = Math.imul(h1 ^ key.charCodeAt(i), 16777619);
    h2 = Math.imul(h2 ^ key.charCodeAt(i), 2246822519);
  }
  let out = 'C';
  let a = h1 >>> 0;
  let b = h2 >>> 0;
  for (let i = 0; i < 17; i++) {
    const v = (a ^ (b >>> (i % 7))) % 62;
    out += chars[v];
    a = Math.imul(a ^ (a >>> 13), 1103515245) >>> 0;
    b = (b * 31 + v) >>> 0;
  }
  return out;
}

const ts = (t: number) => t.toFixed(6);

interface Flow {
  key: string;
  uid: string;
  orig: string;
  origPort: number | null;
  resp: string;
  respPort: number | null;
  proto: 'tcp' | 'udp' | 'icmp';
  frames: Frame[];
}

function flows(frames: Frame[]): Flow[] {
  const map = new Map<string, Flow>();
  for (const fr of frames) {
    const p = fr.p;
    if (p.p === 'ARP') continue;
    const proto = p.p.toLowerCase() as Flow['proto'];
    const a = `${p.src}|${p.sp ?? ''}`;
    const b = `${p.dst}|${p.dp ?? ''}`;
    const fwd = `${proto}|${a}|${b}`;
    const rev = `${proto}|${b}|${a}`;
    let f = map.get(fwd) ?? map.get(rev);
    if (!f) {
      const icmp = p.p === 'ICMP';
      f = {
        key: fwd,
        uid: uidOf(fwd + p.t),
        orig: p.src,
        origPort: icmp ? (p.icmp?.type === 'reply' ? 0 : 8) : (p.sp ?? null),
        resp: p.dst,
        respPort: icmp ? 0 : (p.dp ?? null),
        proto,
        frames: [],
      };
      map.set(fwd, f);
    }
    f.frames.push(fr);
  }
  return [...map.values()].sort((x, y) => x.frames[0]!.p.t - y.frames[0]!.p.t);
}

function connRow(f: Flow): Cell[] {
  const first = f.frames[0]!.p.t;
  const last = f.frames[f.frames.length - 1]!.p.t;
  const fromOrig = (fr: Frame) => fr.p.src === f.orig && (f.origPort === null || f.proto === 'icmp' || fr.p.sp === f.origPort);
  let ob = 0;
  let rb = 0;
  let op = 0;
  let rp = 0;
  let opb = 0;
  let rpb = 0;
  let hist = '';
  const addHist = (c: string) => {
    if (!hist.includes(c)) hist += c;
  };
  for (const fr of f.frames) {
    const o = fromOrig(fr);
    if (o) {
      ob += fr.payload;
      op++;
      opb += fr.len - 14;
    } else {
      rb += fr.payload;
      rp++;
      rpb += fr.len - 14;
    }
    if (f.proto === 'tcp') {
      const fl = fr.p.fl ?? '';
      if (fl.includes('S') && !fl.includes('A')) addHist(o ? 'S' : 's');
      else if (fl.includes('S') && fl.includes('A')) addHist(o ? 'H' : 'h');
      else {
        if (fl.includes('A') && !fr.payload && !fl.includes('F') && !fl.includes('R')) addHist(o ? 'A' : 'a');
        if (fr.payload) addHist(o ? 'D' : 'd');
        if (fl.includes('F')) addHist(o ? 'F' : 'f');
        if (fl.includes('R')) addHist(o ? 'R' : 'r');
      }
    } else addHist(o ? 'D' : 'd');
  }
  let state = 'OTH';
  if (f.proto === 'tcp') {
    const has = (c: string) => hist.includes(c);
    if (has('S') && has('r') && !has('h')) state = 'REJ';
    else if (has('S') && !has('h')) state = has('R') ? 'RSTOS0' : 'S0';
    else if (has('h') && has('R')) state = 'RSTO';
    else if (has('h') && has('r')) state = 'RSTR';
    else if (has('F') && has('f')) state = 'SF';
    else if (has('h')) state = 'S1';
  } else if (f.proto === 'udp') state = rp ? 'SF' : 'S0';
  const svc = (() => {
    const fl = (k: string) => f.frames.some((fr) => fr.fields.has(k));
    if (fl('http')) return 'http';
    if (fl('dns')) return 'dns';
    if (fl('tls')) return 'ssl';
    if (fl('ssh')) return 'ssh';
    if (fl('ftp')) return 'ftp';
    if (fl('smtp')) return 'smtp';
    return null;
  })();
  const local = (ip: string) => (/^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(ip) ? 'T' : 'F');
  return [ts(first), f.uid, f.orig, f.origPort, f.resp, f.respPort, f.proto, svc, f.frames.length > 1 ? (last - first).toFixed(6) : null, f.frames.length > 1 || ob ? ob : null, f.frames.length > 1 || rb ? rb : null, state, local(f.orig), local(f.resp), 0, hist || null, op, opb, rp, rpb, null];
}

export function zeekLogs(frames: Frame[]): Log[] {
  const fl = flows(frames);
  const uidFor = new Map<Frame, Flow>();
  for (const f of fl) for (const fr of f.frames) uidFor.set(fr, f);
  const id = (f: Flow): Cell[] => [f.orig, f.origPort, f.resp, f.respPort];

  const conn: Log = {
    path: 'conn',
    fields: ['ts', 'uid', 'id.orig_h', 'id.orig_p', 'id.resp_h', 'id.resp_p', 'proto', 'service', 'duration', 'orig_bytes', 'resp_bytes', 'conn_state', 'local_orig', 'local_resp', 'missed_bytes', 'history', 'orig_pkts', 'orig_ip_bytes', 'resp_pkts', 'resp_ip_bytes', 'tunnel_parents'],
    types: ['time', 'string', 'addr', 'port', 'addr', 'port', 'enum', 'string', 'interval', 'count', 'count', 'string', 'bool', 'bool', 'count', 'string', 'count', 'count', 'count', 'count', 'set[string]'],
    rows: fl.map(connRow),
  };

  const dns: Log = {
    path: 'dns',
    fields: ['ts', 'uid', 'id.orig_h', 'id.orig_p', 'id.resp_h', 'id.resp_p', 'proto', 'trans_id', 'rtt', 'query', 'qclass', 'qclass_name', 'qtype', 'qtype_name', 'rcode', 'rcode_name', 'AA', 'TC', 'RD', 'RA', 'Z', 'answers', 'TTLs', 'rejected'],
    types: ['time', 'string', 'addr', 'port', 'addr', 'port', 'enum', 'count', 'interval', 'string', 'count', 'string', 'count', 'string', 'count', 'string', 'bool', 'bool', 'bool', 'bool', 'count', 'vector[string]', 'vector[interval]', 'bool'],
    rows: [],
  };
  const queries = frames.filter((fr) => fr.p.dns && !fr.p.dns.qr);
  for (const q of queries) {
    const f = uidFor.get(q)!;
    const resp = frames.find((fr) => fr.p.dns?.qr && fr.p.dns.id === q.p.dns!.id && fr.p.dst === q.p.src && fr.p.t >= q.p.t);
    const d = resp?.p.dns;
    const qtypes: Record<string, number> = { A: 1, NS: 2, CNAME: 5, MX: 15, TXT: 16, AAAA: 28 };
    dns.rows.push([
      ts(q.p.t), f.uid, ...id(f), 'udp', q.p.dns!.id, resp ? (resp.p.t - q.p.t).toFixed(6) : null, q.p.dns!.name, 1, 'C_INTERNET', qtypes[q.p.dns!.type] ?? 1, q.p.dns!.type,
      d ? (d.rcode === 'NXDOMAIN' ? 3 : 0) : null, d ? d.rcode ?? 'NOERROR' : null, 'F', 'F', 'T', d ? 'T' : 'F', 0,
      d?.ans?.length ? d.ans.join(',') : null, d?.ans?.length ? d.ans.map(() => '300.000000').join(',') : null, 'F',
    ]);
  }

  const http: Log = {
    path: 'http',
    fields: ['ts', 'uid', 'id.orig_h', 'id.orig_p', 'id.resp_h', 'id.resp_p', 'trans_depth', 'method', 'host', 'uri', 'referrer', 'version', 'user_agent', 'request_body_len', 'response_body_len', 'status_code', 'status_msg'],
    types: ['time', 'string', 'addr', 'port', 'addr', 'port', 'count', 'string', 'string', 'string', 'string', 'string', 'string', 'count', 'count', 'count', 'string'],
    rows: [],
  };
  const depth = new Map<Flow, number>();
  for (const fr of frames.filter((x) => x.fields.has('http.request'))) {
    const f = uidFor.get(fr)!;
    const n = (depth.get(f) ?? 0) + 1;
    depth.set(f, n);
    const g = (k: string) => fr.fields.get(k)?.[0];
    const resp = f.frames.find((x) => x.fields.has('http.response') && x.p.t > fr.p.t);
    const rg = (k: string) => resp?.fields.get(k)?.[0];
    const reqBody = String(g('http.file_data') ?? '');
    const respBody = String(rg('http.file_data') ?? '');
    http.rows.push([ts(fr.p.t), f.uid, ...id(f), n, String(g('http.request.method') ?? ''), (g('http.host') as string) ?? null, String(g('http.request.uri') ?? ''), (g('http.referer') as string) ?? null, '1.1', (g('http.user_agent') as string) ?? null, new TextEncoder().encode(reqBody).length, new TextEncoder().encode(respBody).length, (rg('http.response.code') as number) ?? null, (rg('http.response.phrase') as string) ?? null]);
  }

  const ssl: Log = {
    path: 'ssl',
    fields: ['ts', 'uid', 'id.orig_h', 'id.orig_p', 'id.resp_h', 'id.resp_p', 'version', 'cipher', 'curve', 'server_name', 'resumed', 'established', 'ssl_history'],
    types: ['time', 'string', 'addr', 'port', 'addr', 'port', 'string', 'string', 'string', 'string', 'bool', 'bool', 'string'],
    rows: [],
  };
  for (const fr of frames.filter((x) => x.p.tls?.hs === 'ClientHello')) {
    const f = uidFor.get(fr)!;
    const est = f.frames.some((x) => x.p.tls?.hs === 'ServerHello');
    ssl.rows.push([ts(fr.p.t), f.uid, ...id(f), est ? 'TLSv13' : null, est ? 'TLS_AES_128_GCM_SHA256' : null, est ? 'x25519' : null, fr.p.tls!.sni ?? null, 'F', est ? 'T' : 'F', est ? 'CsiI' : 'C']);
  }
  return [conn, dns, http, ssl].filter((l) => l.rows.length);
}

const OPEN = '2026-11-19-06-00-00';

export function formatLog(log: Log): string {
  const cell = (c: Cell) => (c === null || c === '' ? '-' : String(c));
  return [
    '#separator \\x09',
    '#set_separator\t,',
    '#empty_field\t(empty)',
    '#unset_field\t-',
    `#path\t${log.path}`,
    `#open\t${OPEN}`,
    `#fields\t${log.fields.join('\t')}`,
    `#types\t${log.types.join('\t')}`,
    ...log.rows.map((r) => r.map(cell).join('\t')),
    `#close\t${OPEN}`,
  ].join('\n') + '\n';
}

export const zeek: Command = (args, ctx) => {
  if (args.includes('--version') || args.includes('-v')) return ok('zeek version 7.0.3');
  if (!args.length || args.includes('-h') || args.includes('--help')) return ok('usage: zeek [options] [file ...]\n    -r|--readfile <readfile>  | read from given tcpdump file\n    -C|--no-checksums         | ignore checksums\n    -v|--version              | print version and exit');
  const { opts } = parseArgs(args, ['-r', '--readfile']);
  const file = (opts['-r'] ?? opts['--readfile']) as string | undefined;
  if (!file) return fail('zeek: no input: use -r <file.pcap> (live capture is not available in this simulator)');
  const r = readText(ctx, file, 'zeek');
  if (!r.ok) return fail(`fatal error: problem with trace file ${file} (${file}: No such file or directory)`);
  const packets = decodeCapture(r.text);
  if (!packets) return fail(`fatal error: problem with trace file ${file} (unknown file format)`);
  const logs = zeekLogs(dissect(packets));
  for (const log of logs) {
    const err = writeText(ctx, `${log.path}.log`, formatLog(log));
    if (err) return fail(`error: can't open ${log.path}.log: ${err.split(': ').pop()}`);
  }
  return ok('');
};

/** zeek-cut: reads a Zeek log on stdin and prints the chosen columns. */
export const zeekCut: Command = (args, ctx) => {
  const { opts, rest } = parseArgs(args, ['-F']);
  if (opts['-h'] || opts['--help']) return ok('zeek-cut [options] [<columns>]\n\n  -c  include the first format header block in the output\n  -d  convert time values into human-readable format\n  -u  like -d, but specify UTC\n  -n  print all fields *except* those specified\n  -F  output field separator');
  if (ctx.stdin === null) return fail('zeek-cut: reads a Zeek log from standard input: cat conn.log | zeek-cut COLUMNS');
  const sep = typeof opts['-F'] === 'string' ? (opts['-F'] as string) : '\t';
  const human = !!(opts['-d'] || opts['-u']);
  const lines = ctx.stdin.split('\n');
  let fields: string[] = [];
  let types: string[] = [];
  const header: string[] = [];
  const out: string[] = [];
  let pick: number[] = [];
  const iso = (t: string) => {
    const n = Number(t);
    if (!Number.isFinite(n)) return t;
    return new Date(Math.floor(n) * 1000).toISOString().replace(/\.\d{3}Z$/, '+0000');
  };
  for (const line of lines) {
    if (!line) continue;
    if (line.startsWith('#')) {
      if (line.startsWith('#fields\t')) {
        fields = line.split('\t').slice(1);
        pick = rest.length ? (opts['-n'] ? fields.map((_, i) => i).filter((i) => !rest.includes(fields[i]!)) : rest.map((c) => fields.indexOf(c))) : fields.map((_, i) => i);
        if (opts['-c']) header.push(`#fields\t${pick.map((i) => fields[i] ?? '').join('\t')}`);
      } else if (line.startsWith('#types\t')) {
        types = line.split('\t').slice(1);
        if (opts['-c']) header.push(`#types\t${pick.map((i) => types[i] ?? '').join('\t')}`);
      } else if (opts['-c'] && !line.startsWith('#close') && !line.startsWith('#fields') && !line.startsWith('#types')) header.push(line);
      continue;
    }
    const cols = line.split('\t');
    out.push(pick.map((i) => (i < 0 ? '' : human && types[i] === 'time' ? iso(cols[i] ?? '') : (cols[i] ?? ''))).join(sep));
  }
  if (!fields.length) return fail('zeek-cut: no "#fields" header found: the input is not a Zeek log');
  return ok([...header, ...out].join('\n'));
};
