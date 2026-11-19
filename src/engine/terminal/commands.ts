import { canAccess, dirname, getNode, resolvePath, type FsNode } from './fs';
import { fail, ok, type CmdCtx, type CmdResult, type Command } from './shell';
import {
  basenameCmd,
  cat,
  cp,
  df,
  diff,
  dirnameCmd,
  du,
  find,
  grep,
  head,
  ln,
  ls,
  mkdir,
  mv,
  nl,
  readlink,
  realpath,
  rm,
  rmdir,
  stat,
  tail,
  tee,
  touch,
  tree,
  wc,
  xargs,
} from './files';
import { curl, dig, host, ip, nc, nslookup, ping, traceroute, wget } from './net';
import {
  apt,
  crontab,
  date,
  env,
  exportCmd,
  free,
  groups,
  id,
  last,
  passwd,
  su,
  uname,
  unset,
  uptime,
  useradd,
  userdel,
  usermod,
  w,
  who,
} from './users';
import { getDoc, manText } from './docs';
import { journalctl, kill, pgrep, ps, ss, systemctl } from './system';
import { awk, jq, sed, sha256sum } from './text';
import { capinfos, tcpdump, tshark } from './pcaptools';
import { docker, hadolint, trivy } from './docker';
import { kubectl } from './kube';
import { git } from './git';
import { gitleaks, npm, semgrep } from './codesec';
import { sigma } from './sigma';
import { suricata } from './suricata';
import { zeek, zeekCut } from './zeek';
import { yara } from './yara';
import { PCAP_MAGIC } from './pcap';

/*
 * Error texts are the real English ones on purpose: learners must recognise
 * "Permission denied" and "No such file or directory" on a real machine.
 */
const ENOENT = 'No such file or directory';
const EACCES = 'Permission denied';
const EISDIR = 'Is a directory';
const ENOTDIR = 'Not a directory';

/* ── helpers ─────────────────────────────────────────────────────────── */

interface Located {
  abs: string;
  node: FsNode | null;
  /** A directory on the way could not be traversed. */
  denied: boolean;
}

export function locate(ctx: CmdCtx, path: string): Located {
  const abs = resolvePath(ctx.state.cwd, path, ctx.state.home);
  let node: FsNode = ctx.state.root;
  for (const part of abs.split('/')) {
    if (!part) continue;
    if (node.type !== 'dir') return { abs, node: null, denied: false };
    if (!canAccess(node, ctx.user, 'x')) return { abs, node: null, denied: true };
    const next: FsNode | undefined = node.children[part];
    if (!next) return { abs, node: null, denied: false };
    node = next;
  }
  return { abs, node, denied: false };
}

interface Flags {
  flags: Set<string>;
  values: Record<string, string>;
  rest: string[];
}

/** Split "-la -n 5 file" into flags, flag values and positional arguments. */
export function parseFlags(args: string[], valueFlags = ''): Flags {
  const flags = new Set<string>();
  const values: Record<string, string> = {};
  const rest: string[] = [];
  for (let i = 0; i < args.length; i++) {
    const a = args[i]!;
    if (a === '--') {
      rest.push(...args.slice(i + 1));
      break;
    }
    if (a.length > 1 && a.startsWith('-') && !/^-\d+$/.test(a)) {
      const body = a.replace(/^--?/, '');
      if (a.startsWith('--')) {
        flags.add(body);
        continue;
      }
      for (let j = 0; j < body.length; j++) {
        const ch = body[j]!;
        if (valueFlags.includes(ch)) {
          const inline = body.slice(j + 1);
          values[ch] = inline || args[++i] || '';
          break;
        }
        flags.add(ch);
      }
    } else {
      rest.push(a);
    }
  }
  return { flags, values, rest };
}

export function toLines(text: string): string[] {
  if (text === '') return [];
  const lines = text.split('\n');
  if (lines[lines.length - 1] === '') lines.pop();
  return lines;
}

/** Text of the given files, or stdin when no file is named. */
export function readInput(name: string, files: string[], ctx: CmdCtx): { text: string } | { err: string } {
  if (!files.length) {
    if (ctx.stdin === null) return { err: `${name}: kirish ma'lumoti yo'q (fayl nomini bering yoki | orqali uzating)` };
    return { text: ctx.stdin };
  }
  let text = '';
  for (const f of files) {
    const found = locate(ctx, f);
    if (found.denied) return { err: `${name}: ${f}: ${EACCES}` };
    let node: FsNode | null = found.node;
    let abs = found.abs;
    // Reading a symbolic link reads what it points to (a few hops at most).
    for (let hop = 0; hop < 8 && node?.type === 'file' && node.link !== undefined; hop++) {
      abs = resolvePath(dirname(abs), node.link, ctx.state.home);
      node = getNode(ctx.state.root, abs);
    }
    if (!node) return { err: `${name}: ${f}: ${ENOENT}` };
    if (node.type === 'dir') return { err: `${name}: ${f}: ${EISDIR}` };
    if (!canAccess(node, ctx.user, 'r')) return { err: `${name}: ${f}: ${EACCES}` };
    text += node.content;
  }
  return { text };
}

/**
 * Like readInput, but byte-exact for piped text: the newline a real program prints at the end is added back unless
 * the previous stage was echo -n. Used where bytes matter (base64, xxd, wc -c, sha256sum).
 */
export function readBytes(name: string, files: string[], ctx: CmdCtx): { text: string } | { err: string } {
  const input = readInput(name, files, ctx);
  if ('err' in input || files.length || !input.text || ctx.stdinNoNewline || input.text.endsWith('\n')) return input;
  return { text: input.text + '\n' };
}

export function trimEnd(text: string): string {
  return text.endsWith('\n') ? text.slice(0, -1) : text;
}

function utf8ToBase64(text: string): string {
  let bin = '';
  for (const byte of new TextEncoder().encode(text)) bin += String.fromCharCode(byte);
  return btoa(bin);
}

function base64ToUtf8(b64: string): string {
  const bin = atob(b64.replace(/\s+/g, ''));
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
}

function expandSet(set: string): string {
  // tr understands \n, \t and \\ escapes, as the real one does.
  const unescaped = set.replace(/\\([nt\\])/g, (_m, c: string) => (c === 'n' ? '\n' : c === 't' ? '\t' : '\\'));
  return unescaped.replace(/(.)-(.)/g, (_, a: string, b: string) => {
    let out = '';
    for (let c = a.charCodeAt(0); c <= b.charCodeAt(0); c++) out += String.fromCharCode(c);
    return out;
  });
}

/* ── commands ────────────────────────────────────────────────────────── */

const help: Command = (_args, ctx) => {
  const names = ctx.commandNames();
  const rows = names.map((n) => `  ${n.padEnd(11)} ${getDoc(n)?.summary ?? "lab buyrug'i"}`);
  return ok(['Mavjud buyruqlar:', ...rows, '', "Batafsil (barcha flaglar va misollar): man BUYRUQ   ·   Tab — to'ldirish   ·   ↑/↓ — tarix"].join('\n'));
};

const man: Command = (args) => {
  const name = args[0];
  if (!name) return fail('Qaysi buyruq? Masalan: man ls');
  const doc = getDoc(name);
  if (!doc) return fail(`man: ${name} uchun qo'llanma yo'q`);
  return ok(manText(doc));
};

const pwd: Command = (_a, ctx) => ok(ctx.state.cwd);

const cd: Command = (args, ctx) => {
  const target = args[0] ?? '~';
  const path = target === '-' ? ctx.state.prevCwd : target;
  const { abs, node, denied } = locate(ctx, path);
  if (denied) return fail(`cd: ${target}: ${EACCES}`);
  if (!node) return fail(`cd: ${target}: ${ENOENT}`);
  if (node.type !== 'dir') return fail(`cd: ${target}: ${ENOTDIR}`);
  if (!canAccess(node, ctx.user, 'x')) return fail(`cd: ${target}: ${EACCES}`);
  ctx.state.prevCwd = ctx.state.cwd;
  ctx.state.cwd = abs;
  return ok();
};

const echo: Command = (args) => {
  let parts = args;
  let escapes = false;
  let noNewline = false;
  while (parts[0] === '-n' || parts[0] === '-e') {
    if (parts[0] === '-e') escapes = true;
    if (parts[0] === '-n') noNewline = true;
    parts = parts.slice(1);
  }
  let text = parts.join(' ');
  if (escapes) text = text.replace(/\\n/g, '\n').replace(/\\t/g, '\t');
  return { out: text, code: 0, noNewline };
};

const sort: Command = (args, ctx) => {
  const { flags, values, rest } = parseFlags(args, 'kt');
  const input = readInput('sort', rest, ctx);
  if ('err' in input) return fail(input.err);
  let lines = toLines(input.text);
  // -k N[,N]: sort by the N-th field (whitespace-separated, or by -t); "-k3n" style suffixes are accepted.
  const keySpec = values.k ? /^(\d+)/.exec(values.k) : null;
  const numeric = flags.has('n') || /n/.test(values.k ?? '');
  const sep = values.t;
  const key = (line: string): string => {
    if (!keySpec) return line;
    const fields = sep ? line.split(sep) : line.trim().split(/\s+/);
    return fields[Number(keySpec[1]) - 1] ?? '';
  };
  lines.sort(
    numeric
      ? (a, b) => (parseFloat(key(a)) || 0) - (parseFloat(key(b)) || 0)
      : (a, b) => {
          // -f: ignore upper/lower case.
          const ka = flags.has('f') ? key(a).toLowerCase() : key(a);
          const kb = flags.has('f') ? key(b).toLowerCase() : key(b);
          return ka < kb ? -1 : ka > kb ? 1 : 0;
        },
  );
  if (flags.has('r')) lines.reverse();
  if (flags.has('u')) lines = lines.filter((l, i) => i === 0 || l !== lines[i - 1]);
  return ok(lines.join('\n'));
};

const uniq: Command = (args, ctx) => {
  const { flags, rest } = parseFlags(args);
  const input = readInput('uniq', rest, ctx);
  if ('err' in input) return fail(input.err);
  const groups: { line: string; count: number }[] = [];
  const same = (a: string, b: string) => (flags.has('i') ? a.toLowerCase() === b.toLowerCase() : a === b);
  for (const line of toLines(input.text)) {
    const last = groups[groups.length - 1];
    if (last && same(last.line, line)) last.count++;
    else groups.push({ line, count: 1 });
  }
  // -d: only lines that repeat; -u: only lines that do not.
  const kept = groups.filter((g) => (flags.has('d') ? g.count > 1 : flags.has('u') ? g.count === 1 : true));
  return ok(kept.map((g) => (flags.has('c') ? `${String(g.count).padStart(7)} ${g.line}` : g.line)).join('\n'));
};

const cut: Command = (args, ctx) => {
  const { values, rest } = parseFlags(args, 'dfc');
  const spec = values.f ?? values.c;
  if (!spec) return fail("cut: -f (ustun) yoki -c (belgi) ko'rsatilishi kerak. Masalan: cut -d ':' -f 1");
  const wanted: number[] = [];
  for (const part of spec.split(',')) {
    // N, N-M, N- (to the end) and -M (from the start).
    const m = /^(\d*)(-?)(\d*)$/.exec(part);
    if (!m || (!m[1] && !m[3])) return fail(`cut: invalid field value '${part}'`);
    const from = m[1] ? Number(m[1]) : 1;
    const to = m[2] ? (m[3] ? Number(m[3]) : 999) : from;
    for (let i = from; i <= to; i++) wanted.push(i);
  }
  const input = readInput('cut', rest, ctx);
  if ('err' in input) return fail(input.err);
  const delim = values.d ?? '\t';
  const out = toLines(input.text).map((line) => {
    if (values.c) return wanted.map((i) => line[i - 1] ?? '').join('');
    const fields = line.split(delim);
    return wanted.map((i) => fields[i - 1]).filter((f) => f !== undefined).join(delim);
  });
  return ok(out.join('\n'));
};

const tr: Command = (args, ctx) => {
  if (ctx.stdin === null) return fail("tr: kirish ma'lumoti yo'q. Masalan: cat fayl | tr 'a-z' 'A-Z'");
  if (args[0] === '-d') {
    const drop = new Set(expandSet(args[1] ?? ''));
    return ok([...ctx.stdin].filter((c) => !drop.has(c)).join(''));
  }
  if (args.length < 2) return fail("tr: ikkita to'plam kerak. Masalan: tr 'a-z' 'A-Z'");
  const from = expandSet(args[0]!);
  const to = expandSet(args[1]!);
  return ok(
    [...ctx.stdin]
      .map((c) => {
        const i = from.indexOf(c);
        return i === -1 ? c : (to[Math.min(i, to.length - 1)] ?? c);
      })
      .join(''),
  );
};

const rev: Command = (args, ctx) => {
  const input = readInput('rev', args, ctx);
  if ('err' in input) return fail(input.err);
  return ok(toLines(input.text).map((l) => [...l].reverse().join('')).join('\n'));
};

const fileCmd: Command = (args, ctx) => {
  if (!args.length) return fail('Ishlatilishi: file FAYL');
  const out: string[] = [];
  for (const p of args) {
    const { node } = locate(ctx, p);
    if (!node) out.push(`${p}: cannot open (${ENOENT})`);
    else if (node.type === 'dir') out.push(`${p}: directory`);
    else if (!node.content) out.push(`${p}: empty`);
    else if (node.content.startsWith('#!')) out.push(`${p}: script, ASCII text executable`);
    else if (node.content.startsWith('\x89PNG')) out.push(`${p}: PNG image data`);
    else if (node.content.startsWith('%PDF')) out.push(`${p}: PDF document`);
    else if (node.content.startsWith('PK')) out.push(`${p}: Zip archive data`);
    else if (node.content.startsWith(PCAP_MAGIC)) out.push(`${p}: pcap capture file, microsecond ts (little-endian) - version 2.4 (Ethernet, capture length 262144)`);
    else out.push(`${p}: ASCII text`);
  }
  return ok(out.join('\n'));
};

function applySymbolic(mode: number, spec: string): number | null {
  let result = mode;
  for (const clause of spec.split(',')) {
    const m = /^([ugoa]*)([+\-=])([rwxst]*)$/.exec(clause);
    if (!m) return null;
    const who = m[1] === '' || m[1]!.includes('a') ? 'ugo' : m[1]!;
    let bits = 0;
    if (m[3]!.includes('r')) bits |= 4;
    if (m[3]!.includes('w')) bits |= 2;
    if (m[3]!.includes('x')) bits |= 1;
    // s on u sets setuid, on g setgid; t is the sticky bit.
    let special = 0;
    if (m[3]!.includes('s')) special |= (who.includes('u') ? 0o4000 : 0) | (who.includes('g') ? 0o2000 : 0);
    if (m[3]!.includes('t')) special |= 0o1000;
    if (m[2] === '+') result |= special;
    else if (m[2] === '-') result &= ~special;
    for (const w of who) {
      const shift = w === 'u' ? 6 : w === 'g' ? 3 : 0;
      if (m[2] === '+') result |= bits << shift;
      else if (m[2] === '-') result &= ~(bits << shift);
      else result = (result & ~(7 << shift)) | (bits << shift);
    }
  }
  return result;
}

const chmod: Command = (args, ctx) => {
  // Modes like "-x" look like flags, so the arguments are read positionally.
  const raw = args.filter((a) => a !== '-R');
  const spec = raw[0];
  const files = raw.slice(1);
  if (!spec || !files.length) return fail('Ishlatilishi: chmod REJIM FAYL   (masalan: chmod 600 kalit.txt yoki chmod u+x skript.sh)');
  for (const p of files) {
    const { node } = locate(ctx, p);
    if (!node) return fail(`chmod: cannot access '${p}': ${ENOENT}`);
    if (ctx.user !== 'root' && node.owner !== ctx.user) {
      return fail(`chmod: changing permissions of '${p}': Operation not permitted`);
    }
    if (/^[0-7]{3,4}$/.test(spec)) node.mode = parseInt(spec, 8) & 0o7777;
    else {
      const next = applySymbolic(node.mode, spec);
      if (next === null) return fail(`chmod: invalid mode: '${spec}'`);
      node.mode = next;
    }
  }
  return ok();
};

const chown: Command = (args, ctx) => {
  const [owner, ...files] = args;
  if (!owner || !files.length) return fail('Ishlatilishi: chown EGA FAYL');
  for (const p of files) {
    const { node } = locate(ctx, p);
    if (!node) return fail(`chown: cannot access '${p}': ${ENOENT}`);
    if (ctx.user !== 'root') return fail(`chown: changing ownership of '${p}': Operation not permitted`);
    node.owner = owner.split(':')[0]!;
  }
  return ok();
};

const sudo: Command = (args, ctx) => {
  if (!args.length) return fail('Ishlatilishi: sudo BUYRUQ');
  if (args[0] === '-l') return ok(`User ${ctx.state.user} may run the following commands on ${ctx.state.host}:\n    (ALL : ALL) ALL`);
  if (args[0] === 'su' || args[0] === '-i' || args[0] === '-s') {
    return fail("Bu simulyatorda root sessiyasiga o'tilmaydi. Har buyruq oldidan sudo yozing: sudo cat /etc/shadow");
  }
  return ctx.run(args, 'root');
};

const history: Command = (_a, ctx) =>
  ok(ctx.state.history.map((h, i) => `${String(i + 1).padStart(4)}  ${h}`).join('\n'));

const which: Command = (args, ctx) => {
  const known = ctx.commandNames();
  const out = args.filter((a) => known.includes(a)).map((a) => `/usr/bin/${a}`);
  return { out: out.join('\n'), code: out.length === args.length && args.length ? 0 : 1 };
};

const base64: Command = (args, ctx) => {
  const { flags, rest } = parseFlags(args);
  const input = readBytes('base64', rest, ctx);
  if ('err' in input) return fail(input.err);
  if (flags.has('d') || flags.has('D') || flags.has('decode')) {
    try {
      return ok(trimEnd(base64ToUtf8(input.text)));
    } catch {
      return fail('base64: invalid input');
    }
  }
  return ok(utf8ToBase64(input.text));
};

const xxd: Command = (args, ctx) => {
  const { flags, rest } = parseFlags(args);
  const input = readBytes('xxd', rest, ctx);
  if ('err' in input) return fail(input.err);
  if (flags.has('r')) {
    const hex = input.text.replace(/[^0-9a-fA-F]/g, '');
    if (hex.length % 2) return fail("xxd: hex belgilar soni juft bo'lishi kerak");
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
    return ok(trimEnd(new TextDecoder().decode(bytes)));
  }
  const bytes = new TextEncoder().encode(input.text);
  const hex = [...bytes].map((b) => b.toString(16).padStart(2, '0'));
  if (flags.has('p')) return ok(hex.join(''));
  const rows: string[] = [];
  for (let i = 0; i < hex.length; i += 16) {
    const chunk = hex.slice(i, i + 16);
    const groups: string[] = [];
    for (let j = 0; j < chunk.length; j += 2) groups.push(chunk.slice(j, j + 2).join(''));
    const ascii = [...bytes.slice(i, i + 16)].map((b) => (b >= 32 && b < 127 ? String.fromCharCode(b) : '.')).join('');
    rows.push(`${i.toString(16).padStart(8, '0')}: ${groups.join(' ').padEnd(39)}  ${ascii}`);
  }
  return ok(rows.join('\n'));
};

const noEditor: Command = () =>
  fail("Bu simulyatorda matn muharriri yo'q. Faylga yozish uchun: echo \"matn\" > fayl.txt   (qo'shish uchun >>)");

export const COMMANDS: Record<string, Command> = {
  help,
  man,
  pwd,
  cd,
  ls,
  cat,
  less: cat,
  more: cat,
  echo,
  mkdir,
  touch,
  rm,
  rmdir,
  cp,
  mv,
  grep,
  head,
  tail,
  wc,
  sort,
  uniq,
  cut,
  tr,
  rev,
  find,
  file: fileCmd,
  chmod,
  chown,
  sudo,
  whoami: (_a, ctx) => ok(ctx.user),
  id,
  groups,
  useradd,
  usermod,
  userdel,
  passwd,
  su,
  who,
  w,
  last,
  uptime,
  free,
  crontab,
  apt,
  'apt-get': apt,
  export: exportCmd,
  unset,
  ip,
  ping,
  traceroute,
  dig,
  nslookup,
  host,
  nc,
  curl,
  wget,
  hostname: (_a, ctx) => ok(ctx.state.host),
  uname,
  date,
  history,
  which,
  base64,
  xxd,
  env,
  clear: (): CmdResult => ({ out: '', code: 0, clear: true }),
  nano: noEditor,
  vim: noEditor,
  vi: noEditor,
  nl,
  tree,
  stat,
  du,
  df,
  ln,
  readlink,
  diff,
  tee,
  xargs,
  basename: basenameCmd,
  dirname: dirnameCmd,
  realpath,
  ps,
  pgrep,
  kill,
  systemctl,
  journalctl,
  ss,
  awk,
  sed,
  jq,
  sha256sum,
  tcpdump,
  tshark,
  capinfos,
  docker,
  kubectl,
  trivy,
  hadolint,
  git,
  gitleaks,
  npm,
  semgrep,
  sigma,
  suricata,
  zeek,
  'zeek-cut': zeekCut,
  yara,
  bash: () => fail('Ishlatilishi: bash SKRIPT.sh   (bu simulyator allaqachon bash ichida ishlaydi)'),
  sh: () => fail('Ishlatilishi: sh SKRIPT.sh'),
  exit: () => ok("Bu simulyator — yopish shart emas. Chiqish uchun sahifadan chiqing."),
};
