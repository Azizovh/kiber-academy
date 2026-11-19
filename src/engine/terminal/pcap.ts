/*
 * Packet captures for the terminal: a capture file holds packets at the level a learner reads them (addresses, ports,
 * TCP flags, application payload), and tcpdump, tshark and capinfos dissect them the way the real tools print.
 * The file starts with the pcap magic bytes and stores the packets Base64-encoded, so `cat` shows noise, `file`
 * recognises it, and the tools are the way in — as with a real capture.
 */

export interface Pkt {
  /** Seconds since the epoch, UTC, with microseconds. */
  t: number;
  smac?: string;
  dmac?: string;
  src: string;
  dst: string;
  p: 'TCP' | 'UDP' | 'ICMP' | 'ARP';
  sp?: number;
  dp?: number;
  /** TCP flags as letters: S, A, P, F, R (e.g. "SA", "PA", "FA", "RA"). */
  fl?: string;
  seq?: number;
  ack?: number;
  win?: number;
  /** Application payload as text. */
  data?: string;
  /** Payload length when there is no readable payload (encrypted). */
  plen?: number;
  dns?: { id: number; qr: boolean; name: string; type: string; ans?: string[]; rcode?: 'NOERROR' | 'NXDOMAIN' };
  icmp?: { type: 'request' | 'reply' | 'unreachable'; id?: number; seq?: number };
  arp?: { op: 'request' | 'reply'; mac: string };
  tls?: { hs: 'ClientHello' | 'ServerHello' | 'AppData'; sni?: string };
}

export const PCAP_MAGIC = 'ÔÃ²¡\u0002\u0000\u0004\u0000';

export function encodeCapture(packets: Pkt[]): string {
  const json = JSON.stringify(packets);
  const bytes = new TextEncoder().encode(json);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return PCAP_MAGIC + btoa(bin);
}

export function decodeCapture(content: string): Pkt[] | null {
  if (!content.startsWith(PCAP_MAGIC)) return null;
  try {
    const bin = atob(content.slice(PCAP_MAGIC.length).trim());
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
    return JSON.parse(new TextDecoder().decode(bytes)) as Pkt[];
  } catch {
    return null;
  }
}

/* ── dissection ─────────────────────────────────────────────────────────── */

type FieldValue = string | number;

export interface Frame {
  n: number;
  p: Pkt;
  rel: number;
  len: number;
  proto: string;
  info: string;
  stream: number | null;
  fields: Map<string, FieldValue[]>;
  /** Application payload length (bytes), for statistics and TCP Len=. */
  payload: number;
}

const enc = (s: string) => new TextEncoder().encode(s).length;

const DNS_TYPES: Record<string, number> = { A: 1, NS: 2, CNAME: 5, MX: 15, TXT: 16, AAAA: 28 };

export const PORT_NAMES: Record<number, string> = {
  20: 'ftp-data', 21: 'ftp', 22: 'ssh', 23: 'telnet', 25: 'smtp', 53: 'domain', 80: 'http', 110: 'pop3', 143: 'imap',
  443: 'https', 445: 'microsoft-ds', 3306: 'mysql', 3389: 'ms-wbt-server', 8080: 'http-alt',
};

function tcpFlagNames(fl: string): string[] {
  const names: string[] = [];
  if (fl.includes('F')) names.push('FIN');
  if (fl.includes('S')) names.push('SYN');
  if (fl.includes('R')) names.push('RST');
  if (fl.includes('P')) names.push('PSH');
  if (fl.includes('A')) names.push('ACK');
  return names;
}

interface HttpMsg {
  request: boolean;
  method?: string;
  uri?: string;
  code?: number;
  phrase?: string;
  headers: Record<string, string>;
  body: string;
}

function parseHttp(data: string): HttpMsg | null {
  const req = /^(GET|POST|PUT|DELETE|HEAD|OPTIONS|PATCH) (\S+) HTTP\/1\.[01]/.exec(data);
  const res = /^HTTP\/1\.[01] (\d{3}) ?([^\r\n]*)/.exec(data);
  if (!req && !res) return null;
  const [head, ...rest] = data.split(/\r?\n\r?\n/);
  const headers: Record<string, string> = {};
  for (const line of head!.split(/\r?\n/).slice(1)) {
    const i = line.indexOf(':');
    if (i > 0) headers[line.slice(0, i).trim().toLowerCase()] = line.slice(i + 1).trim();
  }
  const body = rest.join('\n\n');
  return req ? { request: true, method: req[1], uri: req[2], headers, body } : { request: false, code: Number(res![1]), phrase: res![2], headers, body };
}

function streamKey(p: Pkt): string {
  const a = `${p.src}:${p.sp}`;
  const b = `${p.dst}:${p.dp}`;
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

export function dissect(packets: Pkt[]): Frame[] {
  const sorted = [...packets].sort((a, b) => a.t - b.t);
  const t0 = sorted[0]?.t ?? 0;
  const streams = new Map<string, number>();
  return sorted.map((p, i) => {
    const f = new Map<string, FieldValue[]>();
    const set = (k: string, ...v: (FieldValue | undefined)[]) => {
      const vals = v.filter((x): x is FieldValue => x !== undefined);
      if (vals.length) f.set(k, [...(f.get(k) ?? []), ...vals]);
    };
    const flag = (k: string) => f.set(k, [1]);
    const data = p.data ?? '';
    let payload = p.data !== undefined ? enc(data) : p.plen ?? 0;
    let proto: string = p.p;
    let info = '';
    let stream: number | null = null;
    const smac = p.smac ?? '00:50:56:a1:00:' + (p.src.split('.').pop() ?? '01').padStart(2, '0').slice(-2);
    const dmac = p.dmac ?? '00:50:56:a1:00:' + (p.dst.split('.').pop() ?? '01').padStart(2, '0').slice(-2);
    flag('eth');
    set('eth.src', smac);
    set('eth.dst', dmac);
    let len = 14;
    if (p.p === 'ARP') {
      flag('arp');
      set('arp.opcode', p.arp?.op === 'reply' ? 2 : 1);
      set('arp.src.proto_ipv4', p.src);
      set('arp.dst.proto_ipv4', p.dst);
      set('arp.src.hw_mac', p.arp?.op === 'reply' ? p.arp.mac : smac);
      len = 42;
      info = p.arp?.op === 'reply' ? `${p.src} is at ${p.arp.mac}` : `Who has ${p.dst}? Tell ${p.src}`;
    } else {
      flag('ip');
      set('ip.src', p.src);
      set('ip.dst', p.dst);
      set('ip.addr', p.src, p.dst);
      len += 20;
      if (p.p === 'ICMP') {
        flag('icmp');
        const type = p.icmp?.type ?? 'request';
        set('icmp.type', type === 'request' ? 8 : type === 'reply' ? 0 : 3);
        set('icmp.seq', p.icmp?.seq);
        payload = type === 'unreachable' ? 28 : 56;
        len += 8 + payload;
        info =
          type === 'unreachable'
            ? 'Destination unreachable (Port unreachable)'
            : `Echo (ping) ${type}  id=0x${(p.icmp?.id ?? 1).toString(16).padStart(4, '0')}, seq=${p.icmp?.seq ?? 1}/${(p.icmp?.seq ?? 1) * 256}, ttl=${type === 'request' ? 64 : 117}`;
      } else if (p.p === 'UDP') {
        flag('udp');
        set('udp.srcport', p.sp);
        set('udp.dstport', p.dp);
        set('udp.port', p.sp, p.dp);
        if (p.dns) {
          const d = p.dns;
          proto = 'DNS';
          flag('dns');
          set('dns.id', `0x${d.id.toString(16).padStart(4, '0')}`);
          set('dns.flags.response', d.qr ? 1 : 0);
          set('dns.qry.name', d.name);
          set('dns.qry.type', DNS_TYPES[d.type] ?? 1);
          set('dns.flags.rcode', d.rcode === 'NXDOMAIN' ? 3 : 0);
          if (d.qr) {
            set('dns.count.answers', d.ans?.length ?? 0);
            if (d.type === 'A') set('dns.a', ...(d.ans ?? []));
            if (d.type === 'TXT') set('dns.txt', ...(d.ans ?? []));
            if (d.type === 'CNAME') set('dns.cname', ...(d.ans ?? []));
          }
          payload = 12 + d.name.length + 2 + 4 + (d.qr ? (d.ans ?? []).reduce((n, a) => n + 12 + (d.type === 'A' ? 4 : a.length + 1), 0) : 0);
          const idHex = `0x${d.id.toString(16).padStart(4, '0')}`;
          info = d.qr
            ? d.rcode === 'NXDOMAIN'
              ? `Standard query response ${idHex} No such name ${d.type} ${d.name}`
              : `Standard query response ${idHex} ${d.type} ${d.name}${(d.ans ?? []).map((a) => ` ${d.type} ${a}`).join('')}`
            : `Standard query ${idHex} ${d.type} ${d.name}`;
        } else {
          info = `${p.sp} → ${p.dp} Len=${payload}`;
        }
        set('udp.length', 8 + payload);
        len += 8 + payload;
      } else {
        flag('tcp');
        const key = streamKey(p);
        if (!streams.has(key)) streams.set(key, streams.size);
        stream = streams.get(key)!;
        const fl = p.fl ?? 'A';
        set('tcp.srcport', p.sp);
        set('tcp.dstport', p.dp);
        set('tcp.port', p.sp, p.dp);
        set('tcp.stream', stream);
        set('tcp.seq', p.seq ?? 0);
        set('tcp.ack', p.ack ?? 0);
        set('tcp.len', payload);
        set('tcp.flags.syn', fl.includes('S') ? 1 : 0);
        set('tcp.flags.ack', fl.includes('A') ? 1 : 0);
        set('tcp.flags.fin', fl.includes('F') ? 1 : 0);
        set('tcp.flags.reset', fl.includes('R') ? 1 : 0);
        set('tcp.flags.push', fl.includes('P') ? 1 : 0);
        len += (fl.includes('S') ? 40 : 32) + payload;
        const names = tcpFlagNames(fl);
        const win = p.win ?? (fl.includes('S') ? 64240 : 502);
        info = `${p.sp} → ${p.dp} [${names.join(', ')}] Seq=${p.seq ?? 0}${fl.includes('A') ? ` Ack=${p.ack ?? 0}` : ''} Win=${win} Len=${payload}`;
        const port = (n: number) => p.sp === n || p.dp === n;
        const fromClient = (n: number) => p.dp === n;
        if (payload > 0 || p.tls) {
          const http = p.data ? parseHttp(p.data) : null;
          if (http) {
            proto = 'HTTP';
            flag('http');
            const h = http.headers;
            if (http.request) {
              flag('http.request');
              set('http.request.method', http.method);
              set('http.request.uri', http.uri);
              set('http.host', h.host);
              if (h.host) set('http.request.full_uri', `http://${h.host}${http.uri}`);
              set('http.user_agent', h['user-agent']);
              set('http.authorization', h.authorization);
              set('http.cookie', h.cookie);
              set('http.content_type', h['content-type']);
              set('http.referer', h.referer);
              if (h['content-length']) set('http.content_length', Number(h['content-length']));
              if (http.body) set('http.file_data', http.body);
              info = `${http.method} ${http.uri} HTTP/1.1${http.method === 'POST' && h['content-type'] ? `  (${h['content-type']})` : ''}`;
            } else {
              flag('http.response');
              set('http.response.code', http.code);
              set('http.response.phrase', http.phrase);
              set('http.content_type', h['content-type']);
              set('http.server', h.server);
              set('http.location', h.location);
              set('http.set_cookie', h['set-cookie']);
              if (h['content-length']) set('http.content_length', Number(h['content-length']));
              if (http.body) set('http.file_data', http.body);
              info = `HTTP/1.1 ${http.code} ${http.phrase}${h['content-type'] ? `  (${h['content-type'].split(';')[0]})` : ''}`;
            }
          } else if (port(21)) {
            proto = 'FTP';
            flag('ftp');
            const line = data.replace(/\r?\n$/, '');
            if (fromClient(21)) {
              const [cmd, ...arg] = line.split(' ');
              set('ftp.request.command', cmd);
              if (arg.length) set('ftp.request.arg', arg.join(' '));
              info = `Request: ${line}`;
            } else {
              const m = /^(\d{3})[ -]?(.*)$/.exec(line);
              if (m) {
                set('ftp.response.code', Number(m[1]));
                set('ftp.response.arg', m[2]);
              }
              info = `Response: ${line}`;
            }
          } else if (port(23)) {
            proto = 'TELNET';
            flag('telnet');
            set('telnet.data', data);
            info = 'Telnet Data ...';
          } else if (port(25)) {
            proto = 'SMTP';
            flag('smtp');
            const line = data.replace(/\r?\n$/, '').split(/\r?\n/)[0]!;
            if (fromClient(25)) {
              const [cmd, ...arg] = line.split(' ');
              set('smtp.req.command', cmd);
              if (arg.length) set('smtp.req.parameter', arg.join(' '));
              info = `C: ${line}`;
            } else {
              set('smtp.response.code', Number(line.slice(0, 3)));
              info = `S: ${line}`;
            }
            if (data.length > 200 || !/^[A-Z]{4}/.test(line)) set('smtp.data.fragment', data);
          } else if (port(22)) {
            proto = 'SSH';
            flag('ssh');
            const who = fromClient(22) ? 'Client' : 'Server';
            if (data.startsWith('SSH-')) {
              set('ssh.protocol', data.trim());
              info = `${who}: Protocol (${data.trim()})`;
            } else info = `${who}: Encrypted packet (len=${payload})`;
          } else if (p.tls || port(443)) {
            proto = 'TLSv1.3';
            flag('tls');
            if (p.tls?.hs === 'ClientHello') {
              set('tls.handshake.type', 1);
              set('tls.handshake.extensions_server_name', p.tls.sni);
              if (!payload) payload = 517;
              info = `Client Hello${p.tls.sni ? ` (SNI=${p.tls.sni})` : ''}`;
            } else if (p.tls?.hs === 'ServerHello') {
              set('tls.handshake.type', 2);
              if (!payload) payload = 1380;
              info = 'Server Hello, Change Cipher Spec, Application Data';
            } else {
              set('tls.app_data', payload);
              info = 'Application Data';
            }
            set('tcp.len', payload);
            f.set('tcp.len', [payload]);
            len = 14 + 20 + 32 + payload;
          } else if (p.data) {
            set('data.text', data);
          }
        }
      }
    }
    set('frame.number', i + 1);
    set('frame.len', len);
    set('frame.time_relative', Number((p.t - t0).toFixed(6)));
    set('frame.time_epoch', p.t);
    set('frame.time', fmtFrameTime(p.t));
    set('frame.protocols', ['eth', p.p === 'ARP' ? 'arp' : 'ip', ...(p.p === 'ARP' ? [] : [p.p.toLowerCase()]), ...(proto !== p.p ? [proto.toLowerCase().replace(/v1\.3$/, '')] : [])].join(':'));
    return { n: i + 1, p, rel: Math.round((p.t - t0) * 1e6) / 1e6, len, proto, info, stream, fields: f, payload };
  });
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const pad = (n: number, w = 2) => String(n).padStart(w, '0');

function fmtFrameTime(t: number): string {
  const total = Math.round(t * 1e6);
  const d = new Date(Math.floor(total / 1e6) * 1000);
  const us = total % 1e6;
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}.${pad(us, 6)}000 UTC`;
}

export function clock(t: number): string {
  const total = Math.round(t * 1e6);
  const d = new Date(Math.floor(total / 1e6) * 1000);
  return `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}.${pad(total % 1e6, 6)}`;
}

/* ── Wireshark display filters ──────────────────────────────────────────── */

type DNode =
  | { k: 'and' | 'or'; a: DNode; b: DNode }
  | { k: 'not'; a: DNode }
  | { k: 'has'; field: string }
  | { k: 'cmp'; field: string; op: string; value: string };

export class FilterError extends Error {}

const KNOWN_PREFIXES = ['frame', 'eth', 'arp', 'ip', 'icmp', 'udp', 'tcp', 'dns', 'http', 'ftp', 'telnet', 'smtp', 'ssh', 'tls', 'data'];

function tokenizeDisplay(src: string): string[] {
  const out: string[] = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i]!;
    if (/\s/.test(c)) {
      i++;
      continue;
    }
    if (c === '"') {
      let j = i + 1;
      let s = '';
      while (j < src.length && src[j] !== '"') {
        if (src[j] === '\\' && j + 1 < src.length) {
          s += src[j + 1];
          j += 2;
        } else s += src[j++];
      }
      out.push('"' + s);
      i = j + 1;
      continue;
    }
    const two = src.slice(i, i + 2);
    if (['==', '!=', '>=', '<=', '&&', '||'].includes(two)) {
      out.push(two);
      i += 2;
      continue;
    }
    if ('()<>!'.includes(c)) {
      out.push(c);
      i++;
      continue;
    }
    let j = i;
    while (j < src.length && !/[\s()"=!<>&|]/.test(src[j]!)) j++;
    out.push(src.slice(i, j));
    i = j;
  }
  return out;
}

export function parseDisplayFilter(src: string): DNode {
  const toks = tokenizeDisplay(src);
  let i = 0;
  const peek = () => toks[i];
  const word = (w: string, ...alts: string[]) => [w, ...alts].includes((peek() ?? '').toLowerCase());
  const or = (): DNode => {
    let a = and();
    while (word('or', '||')) {
      i++;
      a = { k: 'or', a, b: and() };
    }
    return a;
  };
  const and = (): DNode => {
    let a = not();
    while (word('and', '&&')) {
      i++;
      a = { k: 'and', a, b: not() };
    }
    return a;
  };
  const not = (): DNode => {
    if (word('not', '!')) {
      i++;
      return { k: 'not', a: not() };
    }
    return atom();
  };
  const atom = (): DNode => {
    const t = peek();
    if (t === undefined) throw new FilterError('Unexpected end of filter string.');
    if (t === '(') {
      i++;
      const n = or();
      if (peek() !== ')') throw new FilterError('Expected ")".');
      i++;
      return n;
    }
    const field = t;
    i++;
    if (!/^[a-z][a-z0-9_.]*$/.test(field) || !KNOWN_PREFIXES.includes(field.split('.')[0]!)) {
      throw new FilterError(`"${field}" is not a valid protocol or protocol field.`);
    }
    const opTok = (peek() ?? '').toLowerCase();
    const ops: Record<string, string> = { '==': '==', eq: '==', '!=': '!=', ne: '!=', '>': '>', gt: '>', '<': '<', lt: '<', '>=': '>=', ge: '>=', '<=': '<=', le: '<=', contains: 'contains', matches: 'matches' };
    if (!(opTok in ops)) return { k: 'has', field };
    i++;
    const v = peek();
    if (v === undefined) throw new FilterError(`"${field}" ${opTok} needs a value.`);
    i++;
    return { k: 'cmp', field, op: ops[opTok]!, value: v.startsWith('"') ? v.slice(1) : v };
  };
  const tree = or();
  if (i < toks.length) throw new FilterError(`"${toks[i]}" was unexpected in this context.`);
  return tree;
}

const ipNum = (ip: string) => ip.split('.').reduce((n, o) => n * 256 + Number(o), 0);

function cmpValue(actual: FieldValue, op: string, want: string): boolean {
  if (op === 'contains') return String(actual).includes(want);
  if (op === 'matches') return new RegExp(want, 'i').test(String(actual));
  const cidr = /^(\d+\.\d+\.\d+\.\d+)\/(\d+)$/.exec(want);
  if (cidr && typeof actual === 'string' && /^\d+\.\d+\.\d+\.\d+$/.test(actual)) {
    const bits = Number(cidr[2]);
    const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0;
    const inNet = ((ipNum(actual) & mask) >>> 0) === ((ipNum(cidr[1]!) & mask) >>> 0);
    return op === '==' ? inNet : op === '!=' ? !inNet : false;
  }
  const an = typeof actual === 'number' ? actual : /^-?\d+(\.\d+)?$/.test(actual) ? Number(actual) : NaN;
  const wn = /^0x[0-9a-f]+$/i.test(want) ? parseInt(want, 16) : /^-?\d+(\.\d+)?$/.test(want) ? Number(want) : NaN;
  if (!Number.isNaN(an) && !Number.isNaN(wn)) {
    switch (op) {
      case '==': return an === wn;
      case '!=': return an !== wn;
      case '>': return an > wn;
      case '<': return an < wn;
      case '>=': return an >= wn;
      case '<=': return an <= wn;
    }
  }
  const a = String(actual);
  switch (op) {
    case '==': return a === want;
    case '!=': return a !== want;
    case '>': return a > want;
    case '<': return a < want;
    case '>=': return a >= want;
    case '<=': return a <= want;
  }
  return false;
}

export function matchDisplay(node: DNode, fr: Frame): boolean {
  switch (node.k) {
    case 'and':
      return matchDisplay(node.a, fr) && matchDisplay(node.b, fr);
    case 'or':
      return matchDisplay(node.a, fr) || matchDisplay(node.b, fr);
    case 'not':
      return !matchDisplay(node.a, fr);
    case 'has':
      return fr.fields.has(node.field);
    case 'cmp': {
      // "http contains x", "frame contains x": search the protocol's bytes (here: the payload).
      if (!node.field.includes('.') && (node.op === 'contains' || node.op === 'matches')) {
        return fr.fields.has(node.field) && cmpValue(fr.p.data ?? fr.p.dns?.name ?? '', node.op, node.value);
      }
      const vals = fr.fields.get(node.field) ?? [];
      // Wireshark 4: "a != b" means "not (a == b)" — no value equals b.
      if (node.op === '!=') return !vals.some((v) => cmpValue(v, '==', node.value));
      return vals.some((v) => cmpValue(v, node.op, node.value));
    }
  }
}

/* ── BPF (tcpdump) filters ──────────────────────────────────────────────── */

type BNode = { k: 'and' | 'or'; a: BNode; b: BNode } | { k: 'not'; a: BNode } | { k: 'prim'; test: (p: Pkt, len: number) => boolean };

const FLAG_BITS: Record<string, number> = { 'tcp-fin': 1, 'tcp-syn': 2, 'tcp-rst': 4, 'tcp-push': 8, 'tcp-ack': 16, 'tcp-urg': 32 };

function flagBits(fl: string | undefined): number {
  const f = fl ?? '';
  return (f.includes('F') ? 1 : 0) | (f.includes('S') ? 2 : 0) | (f.includes('R') ? 4 : 0) | (f.includes('P') ? 8 : 0) | (f.includes('A') ? 16 : 0);
}

export function parseBpf(words: string[]): BNode | null {
  const src = words.join(' ').trim();
  if (!src) return null;
  // Flag tests are written in one piece: tcp[tcpflags] & (tcp-syn|tcp-ack) == tcp-syn
  const toks = src
    .replace(/tcp\[(tcpflags|13)\]\s*&\s*(\([^)]*\)|[\w-]+)\s*(==|!=|=)\s*([\w-]+)/g, (_m, _f, mask: string, op: string, val: string) => `__flags:${mask.replace(/[()\s]/g, '')}:${op}:${val}`)
    .replace(/tcp\[(tcpflags|13)\]\s*(==|=)\s*([\w-|]+)/g, (_m, _f, op: string, val: string) => `__flags:255:${op}:${val}`)
    .replace(/\(/g, ' ( ')
    .replace(/\)/g, ' ) ')
    .split(/\s+/)
    .filter(Boolean);
  let i = 0;
  const peek = () => toks[i]?.toLowerCase();
  const val = (s: string) => s.split('|').reduce((n, x) => n | (FLAG_BITS[x] ?? Number(x)), 0);
  const or = (): BNode => {
    let a = and();
    while (peek() === 'or' || peek() === '||') {
      i++;
      a = { k: 'or', a, b: and() };
    }
    return a;
  };
  const and = (): BNode => {
    let a = not();
    for (;;) {
      if (peek() === 'and' || peek() === '&&') {
        i++;
        a = { k: 'and', a, b: not() };
      } else return a;
    }
  };
  const not = (): BNode => {
    if (peek() === 'not' || peek() === '!') {
      i++;
      return { k: 'not', a: not() };
    }
    return prim();
  };
  const prim = (): BNode => {
    const t = peek();
    if (!t) throw new FilterError('syntax error in filter expression');
    if (t === '(') {
      i++;
      const n = or();
      if (peek() !== ')') throw new FilterError('syntax error in filter expression: missing )');
      i++;
      return n;
    }
    i++;
    if (t.startsWith('__flags:')) {
      const [, mask, op, v] = t.split(':');
      const m = val(mask!);
      const want = val(v!);
      return { k: 'prim', test: (p) => p.p === 'TCP' && (op === '!=' ? (flagBits(p.fl) & m) !== want : (flagBits(p.fl) & m) === want) };
    }
    if (['tcp', 'udp', 'icmp', 'arp'].includes(t)) return { k: 'prim', test: (p) => p.p === t.toUpperCase() };
    if (t === 'ip') return { k: 'prim', test: (p) => p.p !== 'ARP' };
    if (t === 'greater' || t === 'less') {
      const n = Number(toks[i++]);
      return { k: 'prim', test: (_p, len) => (t === 'greater' ? len >= n : len <= n) };
    }
    let dir: 'src' | 'dst' | null = null;
    let kind = t;
    if (t === 'src' || t === 'dst') {
      dir = t;
      kind = peek() ?? '';
      if (['host', 'port', 'net'].includes(kind)) i++;
      else kind = 'host';
    }
    if (kind === 'host' || kind === 'port' || kind === 'net') {
      const arg = toks[i++];
      if (arg === undefined) throw new FilterError(`syntax error: ${kind} needs a value`);
      if (kind === 'host') return { k: 'prim', test: (p) => (dir !== 'dst' && p.src === arg) || (dir !== 'src' && p.dst === arg) };
      if (kind === 'port') {
        const n = Number(arg) || Number(Object.entries(PORT_NAMES).find(([, nm]) => nm === arg)?.[0]);
        return { k: 'prim', test: (p) => (dir !== 'dst' && p.sp === n) || (dir !== 'src' && p.dp === n) };
      }
      const m = /^(\d+(?:\.\d+){0,3})(?:\/(\d+))?$/.exec(arg);
      if (!m) throw new FilterError(`invalid net ${arg}`);
      const octets = m[1]!.split('.');
      const bits = m[2] ? Number(m[2]) : octets.length * 8;
      const base = ipNum([...octets, '0', '0', '0'].slice(0, 4).join('.'));
      const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0;
      const inNet = (ip: string) => /^\d+\.\d+\.\d+\.\d+$/.test(ip) && ((ipNum(ip) & mask) >>> 0) === ((base & mask) >>> 0);
      return { k: 'prim', test: (p) => (dir !== 'dst' && inNet(p.src)) || (dir !== 'src' && inNet(p.dst)) };
    }
    // A bare address means "host ADDRESS".
    if (/^\d+\.\d+\.\d+\.\d+$/.test(t)) return { k: 'prim', test: (p) => p.src === t || p.dst === t };
    throw new FilterError(`syntax error in filter expression near '${t}'`);
  };
  const tree = or();
  if (i < toks.length) throw new FilterError(`syntax error in filter expression near '${toks[i]}'`);
  return tree;
}

export function matchBpf(node: BNode | null, fr: Frame): boolean {
  if (!node) return true;
  switch (node.k) {
    case 'and':
      return matchBpf(node.a, fr) && matchBpf(node.b, fr);
    case 'or':
      return matchBpf(node.a, fr) || matchBpf(node.b, fr);
    case 'not':
      return !matchBpf(node.a, fr);
    case 'prim':
      return node.test(fr.p, fr.len);
  }
}
