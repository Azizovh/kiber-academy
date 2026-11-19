import { canAccess, dirname, getNode, resolvePath, basename } from './fs';
import { fail, ok, type CmdCtx, type CmdResult, type Command } from './shell';
import {
  clock,
  decodeCapture,
  dissect,
  encodeCapture,
  FilterError,
  matchBpf,
  matchDisplay,
  parseBpf,
  parseDisplayFilter,
  PORT_NAMES,
  type Frame,
} from './pcap';

/* ── reading and writing capture files ── */

function loadFrames(name: string, path: string | undefined, ctx: CmdCtx): Frame[] | CmdResult {
  if (!path) return fail(`${name}: -r FAYL kerak (bu simulyatorda jonli tarmoqdan yozib olinmaydi, faqat tayyor fayl o'qiladi)`);
  const abs = resolvePath(ctx.state.cwd, path, ctx.state.home);
  const node = getNode(ctx.state.root, abs);
  if (!node) return fail(name === 'tshark' ? `tshark: The file "${path}" doesn't exist.` : `${name}: ${path}: No such file or directory`);
  if (node.type === 'dir') return fail(`${name}: ${path}: Is a directory`);
  if (!canAccess(node, ctx.user, 'r')) return fail(`${name}: ${path}: Permission denied`);
  const packets = decodeCapture(node.content);
  if (!packets) {
    return fail(
      name === 'tshark'
        ? `tshark: The file "${path}" isn't a capture file in a format TShark understands.`
        : `${name}: ${path}: unknown file format`,
    );
  }
  return dissect(packets);
}

function writeCapture(ctx: CmdCtx, path: string, frames: Frame[]): string | null {
  const abs = resolvePath(ctx.state.cwd, path, ctx.state.home);
  const parent = getNode(ctx.state.root, dirname(abs));
  if (!parent || parent.type !== 'dir') return `${path}: No such file or directory`;
  if (!canAccess(parent, ctx.user, 'w')) return `${path}: Permission denied`;
  parent.children[basename(abs)] = { type: 'file', content: encodeCapture(frames.map((f) => f.p)), mode: 0o644, owner: ctx.user };
  return null;
}

/* ── tcpdump ── */

function hexDump(text: string): string {
  const bytes = new TextEncoder().encode(text);
  const rows: string[] = [];
  for (let i = 0; i < bytes.length; i += 16) {
    const chunk = [...bytes.slice(i, i + 16)];
    const hex: string[] = [];
    for (let j = 0; j < chunk.length; j += 2) hex.push(chunk.slice(j, j + 2).map((b) => b.toString(16).padStart(2, '0')).join(''));
    const ascii = chunk.map((b) => (b >= 32 && b < 127 ? String.fromCharCode(b) : '.')).join('');
    rows.push(`\t0x${i.toString(16).padStart(4, '0')}:  ${hex.join(' ').padEnd(40)}  ${ascii}`);
  }
  return rows.join('\n');
}

const tcpdumpFlags = (fl: string) => {
  let s = '';
  if (fl.includes('S')) s += 'S';
  if (fl.includes('F')) s += 'F';
  if (fl.includes('R')) s += 'R';
  if (fl.includes('P')) s += 'P';
  if (fl.includes('A')) s += '.';
  return s || 'none';
};

export const tcpdump: Command = (args, ctx) => {
  let nLevel = 0;
  const opts = new Set<string>();
  let file: string | undefined;
  let count: number | undefined;
  let write: string | undefined;
  const expr: string[] = [];
  for (let i = 0; i < args.length; i++) {
    const a = args[i]!;
    if (/^-[A-Za-z]+$/.test(a)) {
      const body = a.slice(1);
      for (let j = 0; j < body.length; j++) {
        const ch = body[j]!;
        if (ch === 'n') nLevel++;
        else if (ch === 'r' || ch === 'c' || ch === 'w') {
          const v = body.slice(j + 1) || args[++i];
          if (ch === 'r') file = v;
          if (ch === 'c') count = Number(v);
          if (ch === 'w') write = v;
          break;
        } else if ('AXetvq'.includes(ch)) opts.add(ch);
        else if (ch === 'i' || ch === 's') {
          i++;
          break;
        } else return fail(`tcpdump: invalid option -- '${ch}'`);
      }
    } else expr.push(a);
  }
  if (!file) return fail("tcpdump: eth0: You don't have permission to capture on that device\n(Bu simulyatorda jonli yozib olish yo'q: tayyor faylni o'qing — tcpdump -r fayl.pcap)");
  const frames = loadFrames('tcpdump', file, ctx);
  if (!Array.isArray(frames)) return frames;
  let filter;
  try {
    filter = parseBpf(expr);
  } catch (e) {
    if (e instanceof FilterError) return fail(`tcpdump: ${e.message}`);
    throw e;
  }
  let shown = frames.filter((f) => matchBpf(filter, f));
  if (count !== undefined) shown = shown.slice(0, count);
  const header = `reading from file ${file}, link-type EN10MB (Ethernet), snapshot length 262144`;
  if (write) {
    const err = writeCapture(ctx, write, shown);
    return err ? fail(`tcpdump: ${err}`) : { out: '', err: header, code: 0 };
  }
  // Without -n tcpdump shows names: hosts from the DNS answers seen in this capture, ports from /etc/services.
  const names = new Map<string, string>();
  if (nLevel === 0) for (const f of frames) if (f.p.dns?.qr && f.p.dns.type === 'A') for (const a of f.p.dns.ans ?? []) if (!names.has(a)) names.set(a, f.p.dns.name);
  const host = (ip: string) => names.get(ip) ?? ip;
  const port = (n: number | undefined) => (n === undefined ? '' : nLevel < 2 && PORT_NAMES[n] ? PORT_NAMES[n] : String(n));
  const addr = (ip: string, p?: number) => (p === undefined ? host(ip) : `${host(ip)}.${port(p)}`);
  const lines = shown.map((fr) => {
    const p = fr.p;
    const time = opts.has('t') ? '' : clock(p.t) + ' ';
    const eth = opts.has('e') ? `${fr.fields.get('eth.src')![0]} > ${fr.fields.get('eth.dst')![0]}, ethertype ${p.p === 'ARP' ? 'ARP (0x0806)' : 'IPv4 (0x0800)'}, length ${fr.len}: ` : '';
    let line: string;
    if (p.p === 'ARP') {
      line = p.arp?.op === 'reply' ? `ARP, Reply ${p.src} is-at ${p.arp.mac}, length 28` : `ARP, Request who-has ${p.dst} tell ${p.src}, length 28`;
    } else if (p.p === 'ICMP') {
      const t = p.icmp?.type ?? 'request';
      line = `IP ${host(p.src)} > ${host(p.dst)}: ICMP ${t === 'unreachable' ? `${host(p.src)} udp port unreachable` : `echo ${t}, id ${p.icmp?.id ?? 1}, seq ${p.icmp?.seq ?? 1}`}, length ${t === 'unreachable' ? 36 : 64}`;
    } else if (p.p === 'UDP') {
      const d = p.dns;
      const plen = fr.payload;
      const body = d
        ? d.qr
          ? d.rcode === 'NXDOMAIN'
            ? `${d.id} NXDomain 0/1/0 (${plen})`
            : `${d.id} ${d.ans?.length ?? 0}/0/0 ${(d.ans ?? []).map((a) => `${d.type} ${a}`).join(', ')} (${plen})`
          : `${d.id}+ ${d.type}? ${d.name}. (${plen})`
        : `UDP, length ${plen}`;
      line = `IP ${addr(p.src, p.sp)} > ${addr(p.dst, p.dp)}: ${body}`;
    } else {
      const fl = p.fl ?? 'A';
      const len = fr.payload;
      const seq = p.seq ?? 0;
      const seqPart = len > 0 ? `${seq}:${seq + len}` : `${seq}`;
      const http = fr.proto === 'HTTP' ? `: HTTP: ${(p.data ?? '').split(/\r?\n/)[0]}` : '';
      line = `IP ${addr(p.src, p.sp)} > ${addr(p.dst, p.dp)}: Flags [${tcpdumpFlags(fl)}], seq ${seqPart}${fl.includes('A') ? `, ack ${p.ack ?? 0}` : ''}, win ${p.win ?? (fl.includes('S') ? 64240 : 502)}, length ${len}${http}`;
    }
    let out = time + eth + line;
    if (opts.has('A') && p.data) out += '\n' + p.data.replace(/\r/g, '').replace(/\n$/, '');
    if (opts.has('X') && p.data) out += '\n' + hexDump(p.data);
    return out;
  });
  return { out: lines.join('\n'), err: header, code: 0 };
};

/* ── tshark ── */

const fmtBytes = (n: number) => `${n.toLocaleString('en-US')} bytes`;

function conversations(frames: Frame[], kind: 'ip' | 'tcp' | 'udp'): string {
  type Conv = { a: string; b: string; ab: [number, number]; ba: [number, number]; start: number; end: number };
  const convs = new Map<string, Conv>();
  for (const f of frames) {
    const p = f.p;
    if (p.p === 'ARP') continue;
    if (kind !== 'ip' && p.p !== kind.toUpperCase()) continue;
    const ea = kind === 'ip' ? p.src : `${p.src}:${p.sp}`;
    const eb = kind === 'ip' ? p.dst : `${p.dst}:${p.dp}`;
    const [a, b] = ea < eb ? [ea, eb] : [eb, ea];
    const key = `${a}|${b}`;
    const c = convs.get(key) ?? { a, b, ab: [0, 0], ba: [0, 0], start: f.rel, end: f.rel };
    const dir = ea === a ? c.ab : c.ba;
    dir[0]++;
    dir[1] += f.len;
    c.end = f.rel;
    convs.set(key, c);
  }
  const rows = [...convs.values()].sort((x, y) => y.ab[1] + y.ba[1] - (x.ab[1] + x.ba[1]));
  const title = { ip: 'IPv4 Conversations', tcp: 'TCP Conversations', udp: 'UDP Conversations' }[kind];
  const w = kind === 'ip' ? 20 : 26;
  return [
    '='.repeat(80),
    title,
    'Filter:<No Filter>',
    `${''.padEnd(w * 2 + 5)}|       <-      | |       ->      | |     Total     |    Relative    |   Duration   |`,
    `${''.padEnd(w * 2 + 5)}| Frames  Bytes | | Frames  Bytes | | Frames  Bytes |      Start     |              |`,
    ...rows.map(
      (c) =>
        `${c.a.padEnd(w)} <-> ${c.b.padEnd(w)} ${String(c.ba[0]).padStart(6)} ${fmtBytes(c.ba[1]).padStart(12)} ${String(c.ab[0]).padStart(6)} ${fmtBytes(c.ab[1]).padStart(12)} ${String(c.ab[0] + c.ba[0]).padStart(6)} ${fmtBytes(c.ab[1] + c.ba[1]).padStart(12)} ${c.start.toFixed(9).padStart(15)} ${(c.end - c.start).toFixed(4).padStart(13)}`,
    ),
    '='.repeat(80),
  ].join('\n');
}

function endpoints(frames: Frame[]): string {
  const eps = new Map<string, { pk: number; by: number; txp: number; txb: number; rxp: number; rxb: number }>();
  const get = (a: string) => {
    const e = eps.get(a) ?? { pk: 0, by: 0, txp: 0, txb: 0, rxp: 0, rxb: 0 };
    eps.set(a, e);
    return e;
  };
  for (const f of frames) {
    if (f.p.p === 'ARP') continue;
    const s = get(f.p.src);
    const d = get(f.p.dst);
    s.pk++;
    s.by += f.len;
    s.txp++;
    s.txb += f.len;
    d.pk++;
    d.by += f.len;
    d.rxp++;
    d.rxb += f.len;
  }
  const rows = [...eps.entries()].sort((x, y) => y[1].by - x[1].by);
  return [
    '='.repeat(80),
    'IPv4 Endpoints',
    'Filter:<No Filter>',
    '                       |  Packets  | |  Bytes  | | Tx Packets | | Tx Bytes | | Rx Packets | | Rx Bytes |',
    ...rows.map(([a, e]) => `${a.padEnd(22)} ${String(e.pk).padStart(11)} ${String(e.by).padStart(11)} ${String(e.txp).padStart(14)} ${String(e.txb).padStart(12)} ${String(e.rxp).padStart(14)} ${String(e.rxb).padStart(12)}`),
    '='.repeat(80),
  ].join('\n');
}

function hierarchy(frames: Frame[]): string {
  const counts = new Map<string, { frames: number; bytes: number }>();
  for (const f of frames) {
    const layers = String(f.fields.get('frame.protocols')![0]).split(':');
    for (let i = 1; i <= layers.length; i++) {
      const key = layers.slice(0, i).join(':');
      const c = counts.get(key) ?? { frames: 0, bytes: 0 };
      c.frames++;
      c.bytes += f.len;
      counts.set(key, c);
    }
  }
  const keys = [...counts.keys()].sort((a, b) => {
    const pa = a.split(':');
    const pb = b.split(':');
    for (let i = 0; i < Math.min(pa.length, pb.length); i++) {
      if (pa[i] !== pb[i]) return counts.get(pb.slice(0, i + 1).join(':'))!.frames - counts.get(pa.slice(0, i + 1).join(':'))!.frames || pa[i]!.localeCompare(pb[i]!);
    }
    return pa.length - pb.length;
  });
  return [
    '='.repeat(67),
    'Protocol Hierarchy Statistics',
    'Filter: ',
    '',
    ...keys.map((k) => {
      const depth = k.split(':').length - 1;
      const name = k.split(':').pop()!;
      const c = counts.get(k)!;
      return `${'  '.repeat(depth)}${name}`.padEnd(41) + `frames:${c.frames} bytes:${c.bytes}`;
    }),
    '='.repeat(67),
  ].join('\n');
}

function follow(frames: Frame[], stream: number): string {
  const fs = frames.filter((f) => f.stream === stream);
  if (!fs.length) return `tshark: tcp.stream ${stream} not found`;
  const first = fs[0]!.p;
  const client = `${first.src}:${first.sp}`;
  const lines = ['='.repeat(67), 'Follow: tcp,ascii', `Filter: tcp.stream eq ${stream}`, `Node 0: ${client}`, `Node 1: ${first.dst}:${first.dp}`];
  for (const f of fs) {
    if (!f.p.data) continue;
    const fromClient = `${f.p.src}:${f.p.sp}` === client;
    const text = f.p.data.replace(/\r/g, '');
    lines.push(`${fromClient ? '' : '\t'}${f.payload}`, text.replace(/\n$/, ''));
  }
  lines.push('='.repeat(67));
  return lines.join('\n');
}

function ioStat(frames: Frame[], interval: number): string {
  const end = frames.length ? frames[frames.length - 1]!.rel : 0;
  const buckets: { frames: number; bytes: number }[] = [];
  for (let t = 0; t <= end; t += interval) buckets.push({ frames: 0, bytes: 0 });
  for (const f of frames) {
    const b = buckets[Math.floor(f.rel / interval)]!;
    b.frames++;
    b.bytes += f.len;
  }
  const w = String(Math.ceil(end)).length + 2;
  return [
    '='.repeat(40),
    '| IO Statistics                        |',
    `| Interval: ${interval} secs`.padEnd(39) + '|',
    '|' + ' Interval'.padEnd(w * 2 + 6) + '| Frames | Bytes |',
    ...buckets.map((b, i) => `| ${String(i * interval).padStart(w)} <> ${String(Math.min((i + 1) * interval, Math.ceil(end) || interval)).padStart(w)} | ${String(b.frames).padStart(6)} | ${String(b.bytes).padStart(5)} |`),
    '='.repeat(40),
  ].join('\n');
}

export const tshark: Command = (args, ctx) => {
  let file: string | undefined;
  let display: string | undefined;
  let fieldsMode = false;
  const fields: string[] = [];
  const stats: string[] = [];
  let sep = '\t';
  let header = false;
  let quiet = false;
  let count: number | undefined;
  for (let i = 0; i < args.length; i++) {
    const a = args[i]!;
    const next = () => args[++i];
    if (a === '-r') file = next();
    else if (a === '-Y' || a === '-R') display = next();
    else if (a === '-T') {
      const v = next();
      if (v === 'fields') fieldsMode = true;
      else return fail(`tshark: Invalid -T parameter "${v}" (simulyatorda: -T fields)`);
    } else if (a === '-e') fields.push(next() ?? '');
    else if (a === '-E') {
      const v = next() ?? '';
      const m = /^(separator|header)=(.*)$/.exec(v);
      if (!m) return fail(`tshark: Invalid -E parameter "${v}" (simulyatorda: separator=, header=y)`);
      if (m[1] === 'separator') sep = m[2] === '/t' ? '\t' : m[2] === '/s' ? ' ' : m[2]!;
      else header = m[2] === 'y';
    } else if (a === '-z') stats.push(next() ?? '');
    else if (a === '-c') count = Number(next());
    else if (a === '-q') quiet = true;
    else if (a === '-n' || a === '-V' || a === '-2') continue;
    else if (/^-r.+/.test(a)) file = a.slice(2);
    else return fail(`tshark: invalid option -- '${a.replace(/^-/, '')}'\n(simulyatorda: -r, -Y, -T fields, -e, -E, -c, -q, -z)`);
  }
  if (!file) return fail('tshark: Capture interface "eth0" requires root (bu simulyatorda faqat tayyor fayl: tshark -r fayl.pcap)');
  const frames = loadFrames('tshark', file, ctx);
  if (!Array.isArray(frames)) return frames;
  let shown = frames;
  if (display) {
    try {
      const tree = parseDisplayFilter(display);
      shown = frames.filter((f) => matchDisplay(tree, f));
    } catch (e) {
      if (e instanceof FilterError) return fail(`tshark: ${e.message}\n    ${display}`);
      throw e;
    }
  }
  if (count !== undefined) shown = shown.slice(0, count);
  const out: string[] = [];
  if (!quiet) {
    if (fieldsMode) {
      if (!fields.length) return fail('tshark: "-T fields" was specified, but no fields were specified with "-e".');
      if (header) out.push(fields.join(sep));
      let prev: number | null = null;
      for (const f of shown) {
        out.push(
          fields
            .map((name) => {
              if (name === 'frame.time_delta_displayed') {
                const d = prev === null ? 0 : f.p.t - prev;
                return d.toFixed(6);
              }
              return (f.fields.get(name) ?? []).map(String).join(',');
            })
            .join(sep),
        );
        prev = f.p.t;
      }
    } else {
      for (const f of shown) {
        out.push(`${String(f.n).padStart(5)} ${f.rel.toFixed(6).padStart(11)} ${f.p.src.padStart(15)} → ${f.p.dst.padEnd(15)} ${f.proto.padEnd(7)} ${String(f.len).padStart(4)} ${f.info}`);
      }
    }
  }
  for (const z of stats) {
    const conv = /^conv,(ip|tcp|udp)$/.exec(z);
    const fol = /^follow,tcp,ascii,(\d+)$/.exec(z);
    const io = /^io,stat,(\d+(?:\.\d+)?)$/.exec(z);
    if (conv) out.push(conversations(shown, conv[1] as 'ip' | 'tcp' | 'udp'));
    else if (z === 'endpoints,ip') out.push(endpoints(shown));
    else if (z === 'io,phs') out.push(hierarchy(shown));
    else if (fol) out.push(follow(frames, Number(fol[1])));
    else if (io) out.push(ioStat(shown, Number(io[1])));
    else return fail(`tshark: Invalid -z argument "${z}" (simulyatorda: conv,ip  conv,tcp  conv,udp  endpoints,ip  io,phs  io,stat,N  follow,tcp,ascii,N)`);
  }
  return ok(out.join('\n'));
};

/* ── capinfos ── */

export const capinfos: Command = (args, ctx) => {
  const files = args.filter((a) => !a.startsWith('-'));
  if (!files.length) return fail('Ishlatilishi: capinfos FAYL');
  const blocks: string[] = [];
  for (const file of files) {
    const frames = loadFrames('capinfos', file, ctx);
    if (!Array.isArray(frames)) return frames;
    const bytes = frames.reduce((n, f) => n + f.len, 0);
    const first = frames[0]?.p.t ?? 0;
    const last = frames[frames.length - 1]?.p.t ?? 0;
    const dur = last - first;
    const ts = (t: number) => {
      const d = new Date(Math.floor(t * 1000));
      return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')} ${clock(t)}`;
    };
    blocks.push(
      [
        ['File name', file],
        ['File type', 'Wireshark/tcpdump/... - pcap'],
        ['File encapsulation', 'Ethernet'],
        ['Number of packets', String(frames.length)],
        ['File size', `${bytes + 24 + frames.length * 16} bytes`],
        ['Data size', `${bytes} bytes`],
        ['Capture duration', `${dur.toFixed(6)} seconds`],
        ['First packet time', ts(first)],
        ['Last packet time', ts(last)],
        ['Data byte rate', `${dur > 0 ? Math.round(bytes / dur) : 0} bytes/s`],
        ['Average packet size', `${frames.length ? (bytes / frames.length).toFixed(2) : '0'} bytes`],
      ]
        .map(([k, v]) => `${(k + ':').padEnd(21)}${v}`)
        .join('\n'),
    );
  }
  return ok(blocks.join('\n\n'));
};
