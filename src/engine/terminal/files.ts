import {
  basename,
  canAccess,
  cloneNode,
  dirname,
  getNode,
  modeString,
  mtimeOf,
  resolvePath,
  BASE_TIME,
  type FsDir,
  type FsNode,
} from './fs';
import { locate, parseFlags, readBytes, readInput, toLines, trimEnd } from './commands';
import { fail, ok, type CmdCtx, type CmdResult, type Command } from './shell';

/*
 * File commands with the flags the course teaches. Error texts are the real English ones; Uzbek notes appear only
 * where the simulator deliberately does less than the real tool (and says so).
 */

const ENOENT = 'No such file or directory';
const EACCES = 'Permission denied';
const EISDIR = 'Is a directory';
const ENOTDIR = 'Not a directory';

/** Simulator clock: two days after the lab files were made, advancing one second per command typed. */
export function nowMs(ctx: CmdCtx): number {
  return BASE_TIME + 2 * 86_400_000 + 3_600_000 + ctx.state.history.length * 1000;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function lsDate(ms: number): string {
  const d = new Date(ms);
  return `${MONTHS[d.getUTCMonth()]} ${String(d.getUTCDate()).padStart(2)} ${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
}

function isoDate(ms: number): string {
  return new Date(ms).toISOString().replace('T', ' ').replace(/\.\d+Z$/, '.000000000 +0000');
}

export function sizeOf(node: FsNode): number {
  if (node.type === 'dir') return 4096;
  return new TextEncoder().encode(node.content).length;
}

function treeSize(node: FsNode): number {
  if (node.type === 'file') return sizeOf(node);
  return Object.values(node.children).reduce((s, c) => s + treeSize(c), 0);
}

export function human(n: number): string {
  if (n < 1024) return `${n}`;
  const units = ['K', 'M', 'G', 'T'];
  let v = n / 1024;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v < 10 ? v.toFixed(1) : Math.round(v)}${units[i]}`;
}

/** Follows a symbolic link (one level per hop, at most 8). */
function follow(ctx: CmdCtx, abs: string, node: FsNode | null): { abs: string; node: FsNode | null } {
  let cur = { abs, node };
  for (let i = 0; i < 8 && cur.node?.type === 'file' && cur.node.link !== undefined; i++) {
    const target = resolvePath(dirname(cur.abs), cur.node.link, ctx.state.home);
    cur = { abs: target, node: getNode(ctx.state.root, target) };
  }
  return cur;
}

function parentDir(ctx: CmdCtx, abs: string): FsDir | null {
  const node = getNode(ctx.state.root, dirname(abs));
  return node && node.type === 'dir' ? node : null;
}

/** Write (or append) text to a file the way a program would; used by tee. */
function writeFile(ctx: CmdCtx, path: string, text: string, append: boolean): string | null {
  const abs = resolvePath(ctx.state.cwd, path, ctx.state.home);
  const parent = parentDir(ctx, abs);
  if (!parent) return `${path}: ${ENOENT}`;
  const existing = parent.children[basename(abs)];
  if (existing) {
    if (existing.type === 'dir') return `${path}: ${EISDIR}`;
    if (!canAccess(existing, ctx.user, 'w')) return `${path}: ${EACCES}`;
    existing.content = append ? existing.content + text : text;
    existing.mtime = nowMs(ctx);
  } else {
    if (!canAccess(parent, ctx.user, 'w')) return `${path}: ${EACCES}`;
    parent.children[basename(abs)] = { type: 'file', content: text, mode: 0o644, owner: ctx.user, mtime: nowMs(ctx) };
  }
  return null;
}

/* ── ls ────────────────────────────────────────────────────────────────── */

function longLine(name: string, node: FsNode, h: boolean): string {
  const size = h ? human(sizeOf(node)) : String(sizeOf(node));
  const shown = node.type === 'file' && node.link !== undefined ? `${name} -> ${node.link}` : name;
  return `${modeString(node)} 1 ${node.owner.padEnd(8)} ${node.owner.padEnd(8)} ${size.padStart(6)} ${lsDate(mtimeOf(node))} ${shown}`;
}

function classify(name: string, node: FsNode): string {
  if (node.type === 'dir') return name + '/';
  if (node.link !== undefined) return name + '@';
  if (node.mode & 0o111) return name + '*';
  return name;
}

export const ls: Command = (args, ctx) => {
  // '-1' looks like a number to the flag parser, so it is renamed first.
  const { flags, rest } = parseFlags(args.map((x) => (x === '-1' ? '--one' : x)));
  const long = flags.has('l');
  const all = flags.has('a');
  const almost = flags.has('A');
  const h = flags.has('h');
  const one = flags.has('one') || long || !!ctx.piped;
  const recursive = flags.has('R');
  const paths = rest.length ? rest : ['.'];
  const blocks: string[] = [];
  const errors: string[] = [];

  const sortNames = (dir: FsDir, names: string[]) => {
    const byName = (a: string, b: string) => a.replace(/^\./, '').localeCompare(b.replace(/^\./, ''));
    let sorted = [...names].sort(byName);
    if (flags.has('t')) sorted.sort((a, b) => mtimeOf(dir.children[b]!) - mtimeOf(dir.children[a]!) || byName(a, b));
    if (flags.has('S')) sorted.sort((a, b) => sizeOf(dir.children[b]!) - sizeOf(dir.children[a]!) || byName(a, b));
    if (flags.has('r')) sorted = sorted.reverse();
    return sorted;
  };

  const listDir = (label: string, dir: FsDir, header: boolean) => {
    if (!canAccess(dir, ctx.user, 'r')) {
      errors.push(`ls: cannot open directory '${label}': ${EACCES}`);
      return;
    }
    let names = Object.keys(dir.children).filter((n) => all || almost || !n.startsWith('.'));
    names = sortNames(dir, names);
    const entries: [string, FsNode][] = names.map((n) => [n, dir.children[n]!]);
    if (all) entries.unshift(['.', dir], ['..', dir]);
    const lines = entries.map(([n, node]) =>
      long ? longLine(n, node, h) : flags.has('F') || node.type === 'dir' ? classify(n, node) : n,
    );
    const total = long ? [`total ${entries.reduce((s, [, n]) => s + Math.ceil(sizeOf(n) / 1024), 0) * 4}`] : [];
    const body = one ? [...total, ...lines].join('\n') : lines.join('  ');
    blocks.push(header ? `${label}:\n${body}` : body);
    if (recursive) {
      for (const [n, node] of entries) {
        if (node.type === 'dir' && n !== '.' && n !== '..') listDir(`${label.replace(/\/$/, '')}/${n}`, node, true);
      }
    }
  };

  for (const p of paths) {
    const { node, denied } = locate(ctx, p);
    if (denied) errors.push(`ls: cannot access '${p}': ${EACCES}`);
    else if (!node) errors.push(`ls: cannot access '${p}': ${ENOENT}`);
    else if (node.type === 'file' || flags.has('d')) blocks.push(long ? longLine(p, node, h) : p);
    else listDir(p, node, paths.length > 1 || recursive);
  }
  return { out: blocks.join(recursive || paths.length > 1 ? '\n\n' : '\n'), err: errors.join('\n') || undefined, code: errors.length ? 2 : 0 };
};

/* ── cat, nl, head, tail, wc ───────────────────────────────────────────── */

export const cat: Command = (args, ctx) => {
  const { flags, rest } = parseFlags(args);
  const input = readInput('cat', rest, ctx);
  if ('err' in input) return fail(input.err);
  let lines = toLines(input.text);
  if (flags.has('s')) lines = lines.filter((l, i) => !(l === '' && lines[i - 1] === ''));
  if (flags.has('E')) lines = lines.map((l) => l + '$');
  if (flags.has('n') || flags.has('b')) {
    let n = 0;
    lines = lines.map((l) => (flags.has('b') && l === '' ? l : `${String(++n).padStart(6)}\t${l}`));
  }
  return ok(flags.size ? lines.join('\n') : trimEnd(input.text));
};

export const nl: Command = (args, ctx) => {
  const input = readInput('nl', args.filter((a) => !a.startsWith('-')), ctx);
  if ('err' in input) return fail(input.err);
  let n = 0;
  return ok(toLines(input.text).map((l) => (l === '' ? '' : `${String(++n).padStart(6)}\t${l}`)).join('\n'));
};

function headTail(name: 'head' | 'tail'): Command {
  return (args, ctx) => {
    let n = 10;
    let bytes: number | null = null;
    let fromStart = false;
    const files: string[] = [];
    for (let i = 0; i < args.length; i++) {
      const a = args[i]!;
      const value = (v: string | undefined) => {
        if (name === 'tail' && v?.startsWith('+')) fromStart = true;
        return Number(v?.replace(/^\+/, ''));
      };
      if (a === '-n') n = value(args[++i]);
      else if (/^-n[+\d]/.test(a)) n = value(a.slice(2));
      else if (a === '-c') bytes = Number(args[++i]);
      else if (/^-c\d+$/.test(a)) bytes = Number(a.slice(2));
      else if (/^-\d+$/.test(a)) n = Number(a.slice(1));
      else if (a === '-f' || a === '-F') return fail(`${name}: -f (faylni kuzatish) bu simulyatorda yo'q — fayl o'zgarmaydi. Oxirgi qatorlar: tail -n 20 FAYL`);
      else files.push(a);
    }
    if (!Number.isFinite(n) || n < 0) return fail(`${name}: invalid number of lines`);
    const input = readInput(name, files, ctx);
    if ('err' in input) return fail(input.err);
    if (bytes !== null) return ok(name === 'head' ? input.text.slice(0, bytes) : input.text.slice(-bytes));
    const lines = toLines(input.text);
    if (name === 'head') return ok(lines.slice(0, n).join('\n'));
    if (fromStart) return ok(lines.slice(Math.max(0, n - 1)).join('\n'));
    return ok((n === 0 ? [] : lines.slice(-n)).join('\n'));
  };
}

export const head = headTail('head');
export const tail = headTail('tail');

export const wc: Command = (args, ctx) => {
  const { flags, rest } = parseFlags(args);
  const count = (text: string) => ({
    l: toLines(text).length,
    w: text.split(/\s+/).filter(Boolean).length,
    c: new TextEncoder().encode(text).length,
    m: [...text].length,
    L: Math.max(0, ...toLines(text).map((l) => l.length)),
  });
  const pick = (c: ReturnType<typeof count>) => {
    const keys = (['l', 'w', 'm', 'c', 'L'] as const).filter((k) => flags.has(k));
    return (keys.length ? keys : (['l', 'w', 'c'] as const)).map((k) => c[k]);
  };
  if (rest.length <= 1) {
    const input = readBytes('wc', rest, ctx);
    if ('err' in input) return fail(input.err);
    return ok(pick(count(input.text)).join(' ') + (rest[0] ? ' ' + rest[0] : ''));
  }
  const rows: string[] = [];
  const total = { l: 0, w: 0, c: 0, m: 0, L: 0 };
  for (const f of rest) {
    const input = readInput('wc', [f], ctx);
    if ('err' in input) return fail(input.err);
    const c = count(input.text);
    total.l += c.l;
    total.w += c.w;
    total.c += c.c;
    total.m += c.m;
    total.L = Math.max(total.L, c.L);
    rows.push(`${pick(c).map((v) => String(v).padStart(5)).join(' ')} ${f}`);
  }
  rows.push(`${pick(total).map((v) => String(v).padStart(5)).join(' ')} total`);
  return ok(rows.join('\n'));
};

/* ── grep ──────────────────────────────────────────────────────────────── */

export const grep: Command = (args, ctx) => {
  const { flags, values, rest } = parseFlags(args, 'ABCme');
  const pattern = values.e ?? rest.shift();
  if (pattern === undefined) return fail('Ishlatilishi: grep [-i -n -v -c -l -o -w -x -E -F -r -A N -B N -C N] NAMUNA [FAYL]...', 2);
  const fixed = flags.has('F');
  let src = fixed ? pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') : pattern;
  if (flags.has('w')) src = `\\b(?:${src})\\b`;
  if (flags.has('x')) src = `^(?:${src})$`;
  let re: RegExp;
  try {
    re = new RegExp(src, flags.has('i') ? 'gi' : 'g');
  } catch {
    re = new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), flags.has('i') ? 'gi' : 'g');
  }
  const test = (line: string) => {
    re.lastIndex = 0;
    return re.test(line);
  };
  const recursive = flags.has('r') || flags.has('R');
  let targets = rest;
  if (!targets.length && recursive) targets = ['.'];

  const sources: { label: string; text: string }[] = [];
  const errors: string[] = [];
  if (!targets.length) {
    if (ctx.stdin === null) return fail("grep: kirish ma'lumoti yo'q (fayl nomini bering yoki | orqali uzating)", 2);
    sources.push({ label: '(standard input)', text: ctx.stdin });
  }
  const addFile = (label: string, node: FsNode) => {
    if (node.type === 'dir') {
      if (!recursive) return errors.push(`grep: ${label}: ${EISDIR}`);
      if (!canAccess(node, ctx.user, 'r')) return errors.push(`grep: ${label}: ${EACCES}`);
      for (const name of Object.keys(node.children).sort()) {
        addFile(label === '.' ? name : `${label.replace(/\/$/, '')}/${name}`, node.children[name]!);
      }
      return;
    }
    if (!canAccess(node, ctx.user, 'r')) return errors.push(`grep: ${label}: ${EACCES}`);
    sources.push({ label, text: node.content });
  };
  for (const t of targets) {
    const { node, denied } = locate(ctx, t);
    if (denied) errors.push(`grep: ${t}: ${EACCES}`);
    else if (!node) errors.push(`grep: ${t}: ${ENOENT}`);
    else addFile(t, node);
  }

  const after = Number(values.A ?? values.C ?? 0);
  const before = Number(values.B ?? values.C ?? 0);
  const max = values.m !== undefined ? Number(values.m) : Infinity;
  const showName = flags.has('H') || ((sources.length > 1 || recursive) && !flags.has('h'));
  const out: string[] = [];
  let total = 0;
  for (const s of sources) {
    const lines = toLines(s.text);
    let count = 0;
    let lastPrinted = -1;
    const prefix = (i: number, sep: string) => (showName ? `${s.label}${sep}` : '') + (flags.has('n') ? `${i + 1}${sep}` : '');
    for (let i = 0; i < lines.length && count < max; i++) {
      const line = lines[i]!;
      if (test(line) === flags.has('v')) continue;
      count++;
      if (flags.has('c') || flags.has('l') || flags.has('L') || flags.has('q')) continue;
      if (flags.has('o') && !flags.has('v')) {
        re.lastIndex = 0;
        for (const m of line.matchAll(re)) if (m[0]) out.push(prefix(i, ':') + m[0]);
        continue;
      }
      const from = Math.max(lastPrinted + 1, i - before);
      if ((before || after) && lastPrinted >= 0 && from > lastPrinted + 1) out.push('--');
      for (let j = from; j < i; j++) out.push(prefix(j, '-') + lines[j]);
      out.push(prefix(i, ':') + line);
      lastPrinted = i;
      for (let j = i + 1; j <= Math.min(lines.length - 1, i + after); j++) {
        if (test(lines[j]!) !== flags.has('v')) break;
        out.push(prefix(j, '-') + lines[j]);
        lastPrinted = j;
      }
    }
    total += count;
    if (flags.has('c')) out.push((showName ? `${s.label}:` : '') + count);
    else if (flags.has('l') && count) out.push(s.label);
    else if (flags.has('L') && !count) out.push(s.label);
  }
  if (flags.has('q')) return { out: '', code: total ? 0 : 1 };
  return { out: out.join('\n'), err: errors.join('\n') || undefined, code: total ? 0 : 1 };
};

/* ── mkdir, touch, rm, cp, mv, ln ──────────────────────────────────────── */

export const mkdir: Command = (args, ctx) => {
  const { flags, values, rest } = parseFlags(args, 'm');
  if (!rest.length) return fail('mkdir: missing operand');
  const mode = values.m && /^[0-7]{3,4}$/.test(values.m) ? parseInt(values.m, 8) : 0o755;
  const notes: string[] = [];
  for (const p of rest) {
    const abs = resolvePath(ctx.state.cwd, p, ctx.state.home);
    if (getNode(ctx.state.root, abs)) {
      if (flags.has('p')) continue;
      return fail(`mkdir: cannot create directory '${p}': File exists`);
    }
    let node: FsNode = ctx.state.root;
    const parts = abs.split('/').filter(Boolean);
    let path = '';
    for (let i = 0; i < parts.length; i++) {
      if (node.type !== 'dir') return fail(`mkdir: cannot create directory '${p}': ${ENOTDIR}`);
      const part = parts[i]!;
      path += '/' + part;
      const next: FsNode | undefined = node.children[part];
      if (next) {
        node = next;
        continue;
      }
      if (i < parts.length - 1 && !flags.has('p')) return fail(`mkdir: cannot create directory '${p}': ${ENOENT}`);
      if (!canAccess(node, ctx.user, 'w')) return fail(`mkdir: cannot create directory '${p}': ${EACCES}`);
      const created: FsDir = { type: 'dir', children: {}, mode: i === parts.length - 1 ? mode : 0o755, owner: ctx.user, mtime: nowMs(ctx) };
      node.children[part] = created;
      node = created;
      if (flags.has('v')) notes.push(`mkdir: created directory '${path}'`);
    }
  }
  return ok(notes.join('\n'));
};

/** "2026-11-01", "2026-11-01 14:30", "yesterday", "3 days ago". */
function parseDate(text: string, ctx: CmdCtx): number | null {
  const now = nowMs(ctx);
  if (text === 'now') return now;
  if (text === 'yesterday') return now - 86_400_000;
  const ago = /^(\d+)\s+(day|hour|minute)s?\s+ago$/.exec(text);
  if (ago) return now - Number(ago[1]) * { day: 86_400_000, hour: 3_600_000, minute: 60_000 }[ago[2] as 'day'];
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}))?$/.exec(text);
  if (!m) return null;
  return Date.UTC(+m[1]!, +m[2]! - 1, +m[3]!, +(m[4] ?? 0), +(m[5] ?? 0));
}

export const touch: Command = (args, ctx) => {
  const { flags, values, rest } = parseFlags(args, 'dr');
  if (!rest.length) return fail('touch: missing file operand');
  let when = nowMs(ctx);
  if (values.d !== undefined) {
    const parsed = parseDate(values.d, ctx);
    if (parsed === null) return fail(`touch: invalid date format '${values.d}' (masalan: -d "2026-11-01 14:30" yoki -d yesterday)`);
    when = parsed;
  }
  if (values.r !== undefined) {
    const ref = locate(ctx, values.r);
    if (!ref.node) return fail(`touch: failed to get attributes of '${values.r}': ${ENOENT}`);
    when = mtimeOf(ref.node);
  }
  for (const p of rest) {
    const abs = resolvePath(ctx.state.cwd, p, ctx.state.home);
    const existing = getNode(ctx.state.root, abs);
    if (existing) {
      if (existing.owner !== ctx.user && ctx.user !== 'root' && !canAccess(existing, ctx.user, 'w')) {
        return fail(`touch: cannot touch '${p}': ${EACCES}`);
      }
      existing.mtime = when;
      continue;
    }
    if (flags.has('c')) continue;
    const parent = parentDir(ctx, abs);
    if (!parent) return fail(`touch: cannot touch '${p}': ${ENOENT}`);
    if (!canAccess(parent, ctx.user, 'w')) return fail(`touch: cannot touch '${p}': ${EACCES}`);
    parent.children[basename(abs)] = { type: 'file', content: '', mode: 0o644, owner: ctx.user, mtime: when };
  }
  return ok();
};

export const rm: Command = (args, ctx) => {
  const { flags, rest } = parseFlags(args);
  if (!rest.length) return fail('rm: missing operand');
  const recursive = flags.has('r') || flags.has('R');
  const notes: string[] = [];
  for (const p of rest) {
    const { abs, node } = locate(ctx, p);
    if (!node) {
      if (flags.has('f')) continue;
      return fail(`rm: cannot remove '${p}': ${ENOENT}`);
    }
    if (abs === '/') return fail("rm: '/' ni o'chirib bo'lmaydi — haqiqiy tizimda bu hamma narsani yo'q qiladi!");
    if (node.type === 'dir' && !recursive && !(flags.has('d') && !Object.keys(node.children).length)) {
      return fail(`rm: cannot remove '${p}': ${EISDIR}`);
    }
    const parent = parentDir(ctx, abs)!;
    if (!canAccess(parent, ctx.user, 'w')) return fail(`rm: cannot remove '${p}': ${EACCES}`);
    delete parent.children[basename(abs)];
    if (flags.has('v')) notes.push(node.type === 'dir' ? `removed directory '${p}'` : `removed '${p}'`);
  }
  if (flags.has('i')) notes.unshift("(Diqqat: -i haqiqiy tizimda har fayl uchun tasdiq so'raydi; simulyator so'ramaydi.)");
  return ok(notes.join('\n'));
};

export const rmdir: Command = (args, ctx) => {
  if (!args.length) return fail('rmdir: missing operand');
  for (const p of args.filter((a) => !a.startsWith('-'))) {
    const { abs, node } = locate(ctx, p);
    if (!node) return fail(`rmdir: failed to remove '${p}': ${ENOENT}`);
    if (node.type !== 'dir') return fail(`rmdir: failed to remove '${p}': ${ENOTDIR}`);
    if (Object.keys(node.children).length) return fail(`rmdir: failed to remove '${p}': Directory not empty`);
    const parent = parentDir(ctx, abs)!;
    if (!canAccess(parent, ctx.user, 'w')) return fail(`rmdir: failed to remove '${p}': ${EACCES}`);
    delete parent.children[basename(abs)];
  }
  return ok();
};

function copyOrMove(name: 'cp' | 'mv'): Command {
  return (args, ctx) => {
    const { flags, rest } = parseFlags(args);
    if (rest.length < 2) return fail(`${name}: missing file operand`);
    const destArg = rest[rest.length - 1]!;
    const sources = rest.slice(0, -1);
    const dest = locate(ctx, destArg);
    if (sources.length > 1 && dest.node?.type !== 'dir') return fail(`${name}: target '${destArg}' is not a directory`);
    const notes: string[] = [];

    for (const s of sources) {
      const src = locate(ctx, s);
      if (!src.node) return fail(`${name}: cannot stat '${s}': ${ENOENT}`);
      if (src.node.type === 'dir' && name === 'cp' && !flags.has('r') && !flags.has('R') && !flags.has('a')) {
        return fail(`cp: -r not specified; omitting directory '${s}'`);
      }
      if (name === 'cp' && !canAccess(src.node, ctx.user, 'r')) return fail(`cp: cannot open '${s}' for reading: ${EACCES}`);

      const targetAbs = dest.node?.type === 'dir' ? (dest.abs === '/' ? '' : dest.abs) + '/' + basename(src.abs) : dest.abs;
      if (targetAbs === src.abs) return fail(`${name}: '${s}' and '${destArg}' are the same file`);
      const targetParent = parentDir(ctx, targetAbs);
      if (!targetParent) return fail(`${name}: cannot create regular file '${destArg}': ${ENOENT}`);
      if (!canAccess(targetParent, ctx.user, 'w')) return fail(`${name}: cannot create regular file '${destArg}': ${EACCES}`);
      const exists = targetParent.children[basename(targetAbs)];
      if (exists && flags.has('n')) continue;
      const shownTarget = dest.node?.type === 'dir' ? `${destArg.replace(/\/$/, '')}/${basename(src.abs)}` : destArg;

      if (name === 'mv') {
        const srcParent = parentDir(ctx, src.abs)!;
        if (!canAccess(srcParent, ctx.user, 'w')) return fail(`mv: cannot move '${s}': ${EACCES}`);
        delete srcParent.children[basename(src.abs)];
        targetParent.children[basename(targetAbs)] = src.node;
        if (flags.has('v')) notes.push(`renamed '${s}' -> '${shownTarget}'`);
      } else {
        const copy = cloneNode(src.node);
        // -p / -a keep owner, mode and time; a plain copy belongs to whoever made it, with a fresh time.
        if (!flags.has('p') && !flags.has('a')) {
          copy.owner = ctx.user;
          copy.mtime = nowMs(ctx);
        }
        targetParent.children[basename(targetAbs)] = copy;
        if (flags.has('v')) notes.push(`'${s}' -> '${shownTarget}'`);
      }
    }
    if (flags.has('i')) notes.unshift("(Diqqat: -i haqiqiy tizimda ustiga yozishdan oldin so'raydi; simulyator so'ramaydi.)");
    return ok(notes.join('\n'));
  };
}

export const cp = copyOrMove('cp');
export const mv = copyOrMove('mv');

export const ln: Command = (args, ctx) => {
  const { flags, rest } = parseFlags(args);
  if (rest.length !== 2) return fail('Ishlatilishi: ln [-s] MANBA HAVOLA   (masalan: ln -s /var/log/syslog jurnal)');
  const [target, linkArg] = rest as [string, string];
  const linkAbs = resolvePath(ctx.state.cwd, linkArg, ctx.state.home);
  const parent = parentDir(ctx, linkAbs);
  if (!parent) return fail(`ln: failed to create link '${linkArg}': ${ENOENT}`);
  if (parent.children[basename(linkAbs)] && !flags.has('f')) return fail(`ln: failed to create symbolic link '${linkArg}': File exists`);
  if (!canAccess(parent, ctx.user, 'w')) return fail(`ln: failed to create link '${linkArg}': ${EACCES}`);
  if (flags.has('s')) {
    parent.children[basename(linkAbs)] = { type: 'file', content: '', mode: 0o777, owner: ctx.user, link: target, mtime: nowMs(ctx) };
    return ok(flags.has('v') ? `'${linkArg}' -> '${target}'` : '');
  }
  const src = locate(ctx, target);
  if (!src.node) return fail(`ln: failed to access '${target}': ${ENOENT}`);
  if (src.node.type === 'dir') return fail(`ln: ${target}: hard link not allowed for directory`);
  // A hard link is the same file under a second name: both names share one node.
  parent.children[basename(linkAbs)] = src.node;
  return ok();
};

export const readlink: Command = (args, ctx) => {
  const p = args.filter((a) => !a.startsWith('-'))[0];
  if (!p) return fail('Ishlatilishi: readlink HAVOLA');
  const { abs, node } = locate(ctx, p);
  if (!node) return fail(`readlink: ${p}: ${ENOENT}`, 1);
  if (args.includes('-f')) return ok(follow(ctx, abs, node).abs);
  if (node.type !== 'file' || node.link === undefined) return { out: '', code: 1 };
  return ok(node.link);
};

/* ── find ──────────────────────────────────────────────────────────────── */

export const find: Command = (args, ctx) => {
  const starts: string[] = [];
  const tests: ((label: string, node: FsNode, depth: number) => boolean)[] = [];
  let maxDepth = Infinity;
  let minDepth = 0;
  let exec: string[] | null = null;
  let del = false;
  const now = nowMs(ctx);
  let i = 0;
  while (i < args.length && !args[i]!.startsWith('-')) starts.push(args[i++]!);
  for (; i < args.length; i++) {
    const a = args[i]!;
    const v = () => args[++i] ?? '';
    switch (a) {
      case '-name':
      case '-iname': {
        const glob = v();
        const src = glob.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.');
        const re = new RegExp(`^${src}$`, a === '-iname' ? 'i' : '');
        tests.push((label) => re.test(basename(label) || label));
        break;
      }
      case '-type': {
        const t = v();
        tests.push((_l, n) => (t === 'd' ? n.type === 'dir' : t === 'l' ? n.type === 'file' && n.link !== undefined : t === 'f' ? n.type === 'file' && n.link === undefined : false));
        break;
      }
      case '-perm': {
        const m = /^([-/]?)([0-7]{3,4})$/.exec(v());
        if (!m) return fail('find: bu simulyatorda -perm faqat raqamli: -perm -4000 (SUID), -perm -0002 (hamma yoza oladi)');
        const want = parseInt(m[2]!, 8);
        tests.push((_l, n) => (m[1] === '-' ? (n.mode & want) === want : m[1] === '/' ? (n.mode & want) !== 0 : (n.mode & 0o7777) === want));
        break;
      }
      case '-user': {
        const u = v();
        tests.push((_l, n) => n.owner === u);
        break;
      }
      case '-size': {
        const m = /^([+-]?)(\d+)([ckMG]?)$/.exec(v());
        if (!m) return fail('find: -size misollari: -size +100k, -size -1k, -size 0c');
        const unit = { c: 1, k: 1024, M: 1024 ** 2, G: 1024 ** 3, '': 512 }[m[3] as 'c'];
        const n = Number(m[2]) * unit;
        tests.push((_l, node) => {
          if (node.type === 'dir') return false;
          const s = sizeOf(node);
          return m[1] === '+' ? s > n : m[1] === '-' ? s < n : Math.ceil(s / unit) === Number(m[2]);
        });
        break;
      }
      case '-mtime':
      case '-mmin': {
        const m = /^([+-]?)(\d+)$/.exec(v());
        if (!m) return fail(`find: ${a} misollari: ${a} -1 (yaqinda), ${a} +7 (eskiroq)`);
        const unit = a === '-mtime' ? 86_400_000 : 60_000;
        tests.push((_l, node) => {
          const age = Math.floor((now - mtimeOf(node)) / unit);
          return m[1] === '+' ? age > Number(m[2]) : m[1] === '-' ? age < Number(m[2]) : age === Number(m[2]);
        });
        break;
      }
      case '-newer': {
        const ref = locate(ctx, v());
        if (!ref.node) return fail(`find: '${args[i]}': ${ENOENT}`);
        const t = mtimeOf(ref.node);
        tests.push((_l, node) => mtimeOf(node) > t);
        break;
      }
      case '-empty':
        tests.push((_l, n) => (n.type === 'dir' ? !Object.keys(n.children).length : n.content === ''));
        break;
      case '-maxdepth':
        maxDepth = Number(v());
        break;
      case '-mindepth':
        minDepth = Number(v());
        break;
      case '-exec': {
        const cmd: string[] = [];
        while (i + 1 < args.length && args[i + 1] !== ';' && args[i + 1] !== '+') cmd.push(args[++i]!);
        i++;
        exec = cmd;
        break;
      }
      case '-delete':
        del = true;
        break;
      case '-print':
        break;
      default:
        return fail(`find: unknown predicate '${a}' (bu simulyatorda: -name -iname -type -size -mtime -mmin -newer -perm -user -empty -maxdepth -mindepth -exec -delete)`);
    }
  }
  const out: string[] = [];
  const errors: string[] = [];
  const hits: { label: string; abs: string }[] = [];
  for (const start of starts.length ? starts : ['.']) {
    const root = locate(ctx, start);
    if (!root.node) {
      errors.push(`find: '${start}': ${ENOENT}`);
      continue;
    }
    const visit = (label: string, abs: string, node: FsNode, depth: number) => {
      if (depth >= minDepth && tests.every((t) => t(label, node, depth))) hits.push({ label, abs });
      if (node.type !== 'dir' || depth >= maxDepth) return;
      if (!canAccess(node, ctx.user, 'r') || !canAccess(node, ctx.user, 'x')) {
        errors.push(`find: '${label}': ${EACCES}`);
        return;
      }
      for (const name of Object.keys(node.children).sort()) {
        visit(label.replace(/\/$/, '') + '/' + name, (abs === '/' ? '' : abs) + '/' + name, node.children[name]!, depth + 1);
      }
    };
    visit(start, root.abs, root.node, 0);
  }
  for (const h of hits) {
    if (exec) {
      const res = ctx.run(exec.map((p) => (p === '{}' ? h.label : p)), ctx.user);
      if (res.out) out.push(res.out);
      if (res.err) errors.push(res.err);
    } else if (del) {
      const parent = parentDir(ctx, h.abs);
      if (parent && canAccess(parent, ctx.user, 'w')) delete parent.children[basename(h.abs)];
      else errors.push(`find: cannot delete '${h.label}': ${EACCES}`);
    } else out.push(h.label);
  }
  return { out: out.join('\n'), err: errors.join('\n') || undefined, code: errors.length ? 1 : 0 };
};

/* ── tree, stat, du, df ────────────────────────────────────────────────── */

export const tree: Command = (args, ctx) => {
  const { flags, values, rest } = parseFlags(args, 'L');
  const start = rest[0] ?? '.';
  const { node } = locate(ctx, start);
  if (!node) return fail(`${start} [error opening dir]`);
  const max = values.L ? Number(values.L) : Infinity;
  let dirs = 0;
  let files = 0;
  const lines = [start];
  const walk = (dir: FsDir, prefix: string, depth: number) => {
    if (depth > max || !canAccess(dir, ctx.user, 'r')) return;
    const names = Object.keys(dir.children)
      .filter((n) => flags.has('a') || !n.startsWith('.'))
      .filter((n) => !flags.has('d') || dir.children[n]!.type === 'dir')
      .sort();
    names.forEach((n, i) => {
      const child = dir.children[n]!;
      const last = i === names.length - 1;
      const label = child.type === 'file' && child.link !== undefined ? `${n} -> ${child.link}` : n;
      lines.push(`${prefix}${last ? '└── ' : '├── '}${label}`);
      if (child.type === 'dir') {
        dirs++;
        walk(child, prefix + (last ? '    ' : '│   '), depth + 1);
      } else files++;
    });
  };
  if (node.type === 'dir') walk(node, '', 1);
  lines.push('', `${dirs} directories${flags.has('d') ? '' : `, ${files} files`}`);
  return ok(lines.join('\n'));
};

export const stat: Command = (args, ctx) => {
  const paths = args.filter((a) => !a.startsWith('-'));
  if (!paths.length) return fail('stat: missing operand');
  const out: string[] = [];
  for (const p of paths) {
    const { node } = locate(ctx, p);
    if (!node) return fail(`stat: cannot statx '${p}': ${ENOENT}`);
    const kind = node.type === 'dir' ? 'directory' : node.link !== undefined ? 'symbolic link' : node.content ? 'regular file' : 'regular empty file';
    const mode = (node.mode & 0o7777).toString(8).padStart(4, '0');
    const t = isoDate(mtimeOf(node));
    out.push(
      `  File: ${p}${node.type === 'file' && node.link !== undefined ? ` -> ${node.link}` : ''}`,
      `  Size: ${sizeOf(node)}\tBlocks: ${Math.ceil(sizeOf(node) / 512)}\tIO Block: 4096   ${kind}`,
      `Access: (${mode}/${modeString(node)})  Uid: (${node.owner === 'root' ? 0 : 1000}/${node.owner.padStart(8)})   Gid: (${node.owner === 'root' ? 0 : 1000}/${node.owner.padStart(8)})`,
      `Modify: ${t}`,
      `Change: ${t}`,
    );
  }
  return ok(out.join('\n'));
};

export const du: Command = (args, ctx) => {
  const { flags, values, rest } = parseFlags(args, 'd');
  const h = flags.has('h');
  const fmt = (n: number) => (h ? human(n) : String(Math.ceil(n / 1024)));
  const depth = flags.has('s') ? 0 : values.d !== undefined ? Number(values.d) : Infinity;
  const out: string[] = [];
  let grand = 0;
  for (const p of rest.length ? rest : ['.']) {
    const { node } = locate(ctx, p);
    if (!node) return fail(`du: cannot access '${p}': ${ENOENT}`);
    const visit = (label: string, n: FsNode, d: number): number => {
      if (n.type === 'file') {
        const s = sizeOf(n);
        if (flags.has('a') && d <= depth) out.push(`${fmt(s)}\t${label}`);
        return s;
      }
      let sum = 0;
      if (canAccess(n, ctx.user, 'r')) {
        for (const name of Object.keys(n.children).sort()) sum += visit(`${label.replace(/\/$/, '')}/${name}`, n.children[name]!, d + 1);
      } else out.push(`du: cannot read directory '${label}': ${EACCES}`);
      if (d <= depth) out.push(`${fmt(sum)}\t${label}`);
      return sum;
    };
    grand += visit(p, node, 0);
  }
  if (flags.has('c')) out.push(`${fmt(grand)}\ttotal`);
  return ok(out.join('\n'));
};

export const df: Command = (args, ctx) => {
  const h = args.some((a) => a.startsWith('-') && a.includes('h'));
  const used = treeSize(ctx.state.root);
  const rows: [string, number, number, string][] = [
    ['/dev/sda1', 40 * 1024 ** 3, 17.6 * 1024 ** 3 + used, '/'],
    ['tmpfs', 2 * 1024 ** 3, 1.2 * 1024 ** 2, '/run'],
    ['/dev/sda2', 100 * 1024 ** 3, 91.3 * 1024 ** 3, '/var'],
  ];
  const fmt = (n: number) => (h ? human(n) : String(Math.round(n / 1024)));
  const lines = [`Filesystem     ${h ? ' Size  Used Avail' : '1K-blocks     Used Available'} Use% Mounted on`];
  for (const [fs, size, u, mount] of rows) {
    const pct = Math.round((u / size) * 100);
    lines.push(`${fs.padEnd(14)} ${fmt(size).padStart(h ? 5 : 9)} ${fmt(u).padStart(h ? 5 : 8)} ${fmt(size - u).padStart(h ? 5 : 9)} ${String(pct).padStart(3)}% ${mount}`);
  }
  return ok(lines.join('\n'));
};

/* ── diff, tee, xargs, basename, dirname, realpath ─────────────────────── */

type DiffOp = { op: ' ' | '-' | '+'; a: number; b: number };

/** Line diff via longest common subsequence; each op keeps the index in its file. */
function lcsDiff(a: string[], b: string[]): DiffOp[] {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array<number>(n + 1).fill(0));
  for (let i = m - 1; i >= 0; i--) for (let j = n - 1; j >= 0; j--) dp[i]![j] = a[i] === b[j] ? dp[i + 1]![j + 1]! + 1 : Math.max(dp[i + 1]![j]!, dp[i]![j + 1]!);
  const out: DiffOp[] = [];
  let i = 0;
  let j = 0;
  while (i < m || j < n) {
    if (i < m && j < n && a[i] === b[j]) out.push({ op: ' ', a: i++, b: j++ });
    else if (j < n && (i >= m || dp[i]![j + 1]! >= dp[i + 1]![j]!)) out.push({ op: '+', a: i, b: j++ });
    else out.push({ op: '-', a: i++, b: j });
  }
  return out;
}

export const diff: Command = (args, ctx) => {
  const { flags, rest } = parseFlags(args);
  if (rest.length !== 2) return fail('Ishlatilishi: diff [-u] [-q] [-i] ESKI YANGI');
  const [fa, fb] = rest as [string, string];
  const ia = readInput('diff', [fa], ctx);
  if ('err' in ia) return fail(ia.err, 2);
  const ib = readInput('diff', [fb], ctx);
  if ('err' in ib) return fail(ib.err, 2);
  const norm = (l: string) => (flags.has('i') ? l.toLowerCase() : l);
  const a = toLines(ia.text);
  const b = toLines(ib.text);
  if (a.map(norm).join('\n') === b.map(norm).join('\n')) return ok();
  if (flags.has('q')) return { out: `Files ${fa} and ${fb} differ`, code: 1 };
  const ops = lcsDiff(a.map(norm), b.map(norm));
  if (flags.has('u')) {
    const body = ops.map((o) => (o.op === '+' ? `+${b[o.b]}` : `${o.op}${a[o.a]}`));
    return { out: [`--- ${fa}`, `+++ ${fb}`, `@@ -1,${a.length} +1,${b.length} @@`, ...body].join('\n'), code: 1 };
  }
  // Normal format: "3c3", "< old", "---", "> new".
  const out: string[] = [];
  let k = 0;
  while (k < ops.length) {
    if (ops[k]!.op === ' ') {
      k++;
      continue;
    }
    const startA = ops[k]!.a;
    const startB = ops[k]!.b;
    const del: string[] = [];
    const add: string[] = [];
    while (k < ops.length && ops[k]!.op !== ' ') {
      const o = ops[k]!;
      if (o.op === '-') del.push(a[o.a]!);
      else add.push(b[o.b]!);
      k++;
    }
    const range = (s: number, len: number) => (len > 1 ? `${s + 1},${s + len}` : `${s + (len ? 1 : 0)}`);
    const code = del.length && add.length ? 'c' : del.length ? 'd' : 'a';
    out.push(`${range(startA, del.length)}${code}${range(startB, add.length)}`);
    out.push(...del.map((l) => `< ${l}`));
    if (del.length && add.length) out.push('---');
    out.push(...add.map((l) => `> ${l}`));
  }
  return { out: out.join('\n'), code: 1 };
};

export const tee: Command = (args, ctx) => {
  const append = args.includes('-a');
  const files = args.filter((a) => !a.startsWith('-'));
  const text = ctx.stdin ?? '';
  const body = text === '' ? '' : text.endsWith('\n') ? text : text + '\n';
  for (const f of files) {
    const problem = writeFile(ctx, f, body, append);
    if (problem) return { out: trimEnd(text), err: `tee: ${problem}`, code: 1 };
  }
  return ok(trimEnd(text));
};

export const xargs: Command = (args, ctx) => {
  let n = Infinity;
  let replace: string | null = null;
  let i = 0;
  for (; i < args.length; i++) {
    const a = args[i]!;
    if (a === '-n') n = Number(args[++i]);
    else if (a === '-I') replace = args[++i] ?? '{}';
    else if (a === '-0' || a === '-r') continue;
    else break;
  }
  const cmd = args.slice(i);
  if (!cmd.length) cmd.push('echo');
  const items = (ctx.stdin ?? '').split(replace ? /\n/ : /\s+/).filter(Boolean);
  if (!items.length) return ok();
  const runs: string[][] = [];
  if (replace) for (const item of items) runs.push(cmd.map((p) => p.split(replace!).join(item)));
  else for (let k = 0; k < items.length; k += Number.isFinite(n) ? n : items.length) runs.push([...cmd, ...items.slice(k, k + (Number.isFinite(n) ? n : items.length))]);
  const out: string[] = [];
  const errs: string[] = [];
  let code = 0;
  for (const argv of runs) {
    const res: CmdResult = ctx.run(argv, ctx.user);
    if (res.out) out.push(res.out);
    if (res.err) errs.push(res.err);
    if (res.code) code = res.code;
  }
  return { out: out.join('\n'), err: errs.join('\n') || undefined, code };
};

export const basenameCmd: Command = (args) => {
  const [p, suffix] = args.filter((a) => !a.startsWith('-'));
  if (!p) return fail('basename: missing operand');
  let b = basename(p.replace(/\/+$/, '')) || '/';
  if (suffix && b.endsWith(suffix) && b !== suffix) b = b.slice(0, -suffix.length);
  return ok(b);
};

export const dirnameCmd: Command = (args) => {
  const p = args[0];
  if (!p) return fail('dirname: missing operand');
  const clean = p.replace(/\/+$/, '');
  const i = clean.lastIndexOf('/');
  return ok(i < 0 ? '.' : i === 0 ? '/' : clean.slice(0, i));
};

export const realpath: Command = (args, ctx) => {
  const p = args.filter((a) => !a.startsWith('-'))[0] ?? '.';
  const { abs, node } = locate(ctx, p);
  if (!node) return fail(`realpath: ${p}: ${ENOENT}`);
  return ok(follow(ctx, abs, node).abs);
};

export { follow };
