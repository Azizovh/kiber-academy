import {
  basename,
  canAccess,
  cloneNode,
  dirname,
  getNode,
  modeString,
  resolvePath,
  type FsDir,
  type FsNode,
} from './fs';
import { fail, ok, type CmdCtx, type CmdResult, type Command } from './shell';

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

function locate(ctx: CmdCtx, path: string): Located {
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

function parentDir(ctx: CmdCtx, abs: string): FsDir | null {
  const node = getNode(ctx.state.root, dirname(abs));
  return node && node.type === 'dir' ? node : null;
}

interface Flags {
  flags: Set<string>;
  values: Record<string, string>;
  rest: string[];
}

/** Split "-la -n 5 file" into flags, flag values and positional arguments. */
function parseFlags(args: string[], valueFlags = ''): Flags {
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

function toLines(text: string): string[] {
  if (text === '') return [];
  const lines = text.split('\n');
  if (lines[lines.length - 1] === '') lines.pop();
  return lines;
}

/** Text of the given files, or stdin when no file is named. */
function readInput(name: string, files: string[], ctx: CmdCtx): { text: string } | { err: string } {
  if (!files.length) {
    if (ctx.stdin === null) return { err: `${name}: kirish ma'lumoti yo'q (fayl nomini bering yoki | orqali uzating)` };
    return { text: ctx.stdin };
  }
  let text = '';
  for (const f of files) {
    const { node, denied } = locate(ctx, f);
    if (denied) return { err: `${name}: ${f}: ${EACCES}` };
    if (!node) return { err: `${name}: ${f}: ${ENOENT}` };
    if (node.type === 'dir') return { err: `${name}: ${f}: ${EISDIR}` };
    if (!canAccess(node, ctx.user, 'r')) return { err: `${name}: ${f}: ${EACCES}` };
    text += node.content;
  }
  return { text };
}

function trimEnd(text: string): string {
  return text.endsWith('\n') ? text.slice(0, -1) : text;
}

function toRegExp(pattern: string, flags: string): RegExp {
  try {
    return new RegExp(pattern, flags);
  } catch {
    return new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), flags);
  }
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
  return set.replace(/(.)-(.)/g, (_, a: string, b: string) => {
    let out = '';
    for (let c = a.charCodeAt(0); c <= b.charCodeAt(0); c++) out += String.fromCharCode(c);
    return out;
  });
}

const STAMP = 'Nov 16 09:00';

function longLine(name: string, node: FsNode): string {
  const size = node.type === 'dir' ? 4096 : node.content.length;
  return `${modeString(node)} 1 ${node.owner.padEnd(6)} ${node.owner.padEnd(6)} ${String(size).padStart(5)} ${STAMP} ${name}`;
}

/* ── manual ──────────────────────────────────────────────────────────── */

export const MANUAL: Record<string, { usage: string; text: string }> = {
  help: { usage: 'help', text: "Mavjud buyruqlar ro'yxati." },
  man: { usage: 'man BUYRUQ', text: "Buyruq haqida qisqa qo'llanma." },
  pwd: { usage: 'pwd', text: "Hozir turgan katalogingizning to'liq yo'lini ko'rsatadi (print working directory)." },
  ls: { usage: 'ls [-l] [-a] [YO\'L]', text: "Katalog ichidagilarni ko'rsatadi. -l batafsil (ruxsatlar, egasi, hajmi), -a yashirin (nuqta bilan boshlanuvchi) fayllarni ham." },
  cd: { usage: 'cd [KATALOG]', text: "Katalogni almashtiradi. `cd ..` — bir pog'ona yuqoriga, `cd ~` yoki `cd` — uy katalogiga, `cd -` — oldingi joyga." },
  cat: { usage: 'cat FAYL...', text: "Fayl mazmunini ekranga chiqaradi." },
  echo: { usage: 'echo MATN', text: "Matnni chiqaradi. `echo salom > fayl.txt` — faylga yozadi, `>>` — oxiriga qo'shadi." },
  mkdir: { usage: 'mkdir [-p] KATALOG', text: "Yangi katalog yaratadi. -p — oraliq kataloglarni ham yaratadi." },
  touch: { usage: 'touch FAYL', text: "Bo'sh fayl yaratadi." },
  rm: { usage: 'rm [-r] FAYL', text: "Faylni o'chiradi. -r — katalogni ichidagilari bilan. Ehtiyot bo'ling: savat yo'q!" },
  rmdir: { usage: 'rmdir KATALOG', text: "Bo'sh katalogni o'chiradi." },
  cp: { usage: 'cp [-r] MANBA MANZIL', text: "Nusxa oladi. Katalog uchun -r kerak." },
  mv: { usage: 'mv MANBA MANZIL', text: "Ko'chiradi yoki nomini o'zgartiradi." },
  grep: { usage: 'grep [-i] [-n] [-v] [-c] [-r] NAMUNA [FAYL]', text: "Namuna uchragan qatorlarni topadi. -i harf katta-kichikligiga qaramaydi, -n qator raqami, -v teskarisi, -c soni, -r kataloglar ichida." },
  head: { usage: 'head [-n N] [FAYL]', text: "Boshidagi N ta qator (odatda 10)." },
  tail: { usage: 'tail [-n N] [FAYL]', text: "Oxiridagi N ta qator (odatda 10)." },
  wc: { usage: 'wc [-l] [-w] [-c] [FAYL]', text: "Qatorlar (-l), so'zlar (-w), belgilar (-c) sonini sanaydi." },
  sort: { usage: 'sort [-r] [-n] [-u] [FAYL]', text: "Qatorlarni saralaydi. -r teskari, -n son bo'yicha, -u takrorlarsiz." },
  uniq: { usage: 'uniq [-c] [FAYL]', text: "Ketma-ket takrorlangan qatorlarni bittaga qisqartiradi. -c — necha marta uchraganini sanaydi. Odatda `sort | uniq -c`." },
  cut: { usage: "cut -d 'AJRATGICH' -f N [FAYL]", text: "Har qatordan kerakli ustunni kesib oladi." },
  tr: { usage: "tr 'TO\\'PLAM1' 'TO\\'PLAM2'", text: "Belgilarni almashtiradi. Masalan: `tr 'a-z' 'A-Z'`. -d — belgilarni o'chiradi." },
  rev: { usage: 'rev [FAYL]', text: "Har qatorni teskari yozadi." },
  find: { usage: 'find [YO\'L] [-name NAMUNA] [-type f|d]', text: "Fayllarni qidiradi. Masalan: `find / -name \"*.txt\"`." },
  file: { usage: 'file FAYL', text: "Fayl turini aniqlaydi." },
  chmod: { usage: 'chmod REJIM FAYL', text: "Ruxsatlarni o'zgartiradi. Raqamli: `chmod 644 f` yoki belgili: `chmod u+x f`." },
  chown: { usage: 'chown EGA FAYL', text: "Fayl egasini o'zgartiradi (faqat root)." },
  sudo: { usage: 'sudo BUYRUQ', text: "Buyruqni root (administrator) nomidan bajaradi." },
  whoami: { usage: 'whoami', text: "Joriy foydalanuvchi nomi." },
  id: { usage: 'id', text: "Foydalanuvchi va guruh identifikatorlari." },
  hostname: { usage: 'hostname', text: "Kompyuter nomi." },
  uname: { usage: 'uname [-a]', text: "Tizim haqida ma'lumot." },
  date: { usage: 'date', text: "Joriy sana va vaqt." },
  history: { usage: 'history', text: "Kiritilgan buyruqlar tarixi." },
  which: { usage: 'which BUYRUQ', text: "Buyruq dasturi qayerda joylashganini ko'rsatadi." },
  base64: { usage: 'base64 [-d] [FAYL]', text: "Base64 ga kodlaydi; -d — qayta ochadi (dekodlaydi)." },
  xxd: { usage: 'xxd [-p] [-r -p] [FAYL]', text: "Hex ko'rinish. -p — faqat hex; -r -p — hex'dan matnga qaytaradi." },
  env: { usage: 'env', text: "Muhit o'zgaruvchilari." },
  clear: { usage: 'clear', text: "Ekranni tozalaydi." },
};

/* ── commands ────────────────────────────────────────────────────────── */

const help: Command = (_args, ctx) => {
  const names = ctx.commandNames();
  const rows = names.map((n) => `  ${n.padEnd(10)} ${MANUAL[n]?.text.split('.')[0] ?? "lab buyrug'i"}`);
  return ok(['Mavjud buyruqlar:', ...rows, '', "Batafsil: man BUYRUQ   ·   Tab — to'ldirish   ·   ↑/↓ — tarix"].join('\n'));
};

const man: Command = (args) => {
  const name = args[0];
  if (!name) return fail('Qaysi buyruq? Masalan: man ls');
  const entry = MANUAL[name];
  if (!entry) return fail(`man: ${name} uchun qo'llanma yo'q`);
  return ok(`${name.toUpperCase()}\n\n  Ishlatilishi: ${entry.usage}\n\n  ${entry.text}`);
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

const ls: Command = (args, ctx) => {
  const { flags, rest } = parseFlags(args);
  const long = flags.has('l');
  const all = flags.has('a') || flags.has('A');
  const paths = rest.length ? rest : ['.'];
  const blocks: string[] = [];
  const errors: string[] = [];

  for (const p of paths) {
    const { node, denied } = locate(ctx, p);
    if (denied) {
      errors.push(`ls: cannot access '${p}': ${EACCES}`);
      continue;
    }
    if (!node) {
      errors.push(`ls: cannot access '${p}': ${ENOENT}`);
      continue;
    }
    if (node.type === 'file') {
      blocks.push(long ? longLine(p, node) : p);
      continue;
    }
    if (!canAccess(node, ctx.user, 'r')) {
      errors.push(`ls: cannot open directory '${p}': ${EACCES}`);
      continue;
    }
    const names = Object.keys(node.children)
      .filter((n) => all || !n.startsWith('.'))
      .sort((a, b) => a.localeCompare(b));
    const body = long
      ? names.map((n) => longLine(n, node.children[n]!)).join('\n')
      : names.map((n) => (node.children[n]!.type === 'dir' ? n + '/' : n)).join('  ');
    blocks.push(paths.length > 1 ? `${p}:\n${body}` : body);
  }
  return { out: blocks.join(paths.length > 1 ? '\n\n' : '\n'), err: errors.join('\n') || undefined, code: errors.length ? 2 : 0 };
};

const cat: Command = (args, ctx) => {
  const { rest } = parseFlags(args);
  const input = readInput('cat', rest, ctx);
  return 'err' in input ? fail(input.err) : ok(trimEnd(input.text));
};

const echo: Command = (args) => {
  let parts = args;
  let escapes = false;
  while (parts[0] === '-n' || parts[0] === '-e') {
    if (parts[0] === '-e') escapes = true;
    parts = parts.slice(1);
  }
  let text = parts.join(' ');
  if (escapes) text = text.replace(/\\n/g, '\n').replace(/\\t/g, '\t');
  return ok(text);
};

const mkdir: Command = (args, ctx) => {
  const { flags, rest } = parseFlags(args);
  if (!rest.length) return fail('mkdir: missing operand');
  for (const p of rest) {
    const abs = resolvePath(ctx.state.cwd, p, ctx.state.home);
    if (getNode(ctx.state.root, abs)) {
      if (flags.has('p')) continue;
      return fail(`mkdir: cannot create directory '${p}': File exists`);
    }
    // Walk down, creating missing levels when -p is given.
    let node: FsNode = ctx.state.root;
    const parts = abs.split('/').filter(Boolean);
    for (let i = 0; i < parts.length; i++) {
      if (node.type !== 'dir') return fail(`mkdir: cannot create directory '${p}': ${ENOTDIR}`);
      const part = parts[i]!;
      const next: FsNode | undefined = node.children[part];
      const isLast = i === parts.length - 1;
      if (next) {
        node = next;
        continue;
      }
      if (!isLast && !flags.has('p')) return fail(`mkdir: cannot create directory '${p}': ${ENOENT}`);
      if (!canAccess(node, ctx.user, 'w')) return fail(`mkdir: cannot create directory '${p}': ${EACCES}`);
      const created: FsDir = { type: 'dir', children: {}, mode: 0o755, owner: ctx.user };
      node.children[part] = created;
      node = created;
    }
  }
  return ok();
};

const touch: Command = (args, ctx) => {
  if (!args.length) return fail('touch: missing file operand');
  for (const p of args) {
    const abs = resolvePath(ctx.state.cwd, p, ctx.state.home);
    if (getNode(ctx.state.root, abs)) continue;
    const parent = parentDir(ctx, abs);
    if (!parent) return fail(`touch: cannot touch '${p}': ${ENOENT}`);
    if (!canAccess(parent, ctx.user, 'w')) return fail(`touch: cannot touch '${p}': ${EACCES}`);
    parent.children[basename(abs)] = { type: 'file', content: '', mode: 0o644, owner: ctx.user };
  }
  return ok();
};

const rm: Command = (args, ctx) => {
  const { flags, rest } = parseFlags(args);
  if (!rest.length) return fail('rm: missing operand');
  const recursive = flags.has('r') || flags.has('R');
  for (const p of rest) {
    const { abs, node } = locate(ctx, p);
    if (!node) {
      if (flags.has('f')) continue;
      return fail(`rm: cannot remove '${p}': ${ENOENT}`);
    }
    if (abs === '/') return fail("rm: '/' ni o'chirib bo'lmaydi — haqiqiy tizimda bu hamma narsani yo'q qiladi!");
    if (node.type === 'dir' && !recursive) return fail(`rm: cannot remove '${p}': ${EISDIR}`);
    const parent = parentDir(ctx, abs)!;
    if (!canAccess(parent, ctx.user, 'w')) return fail(`rm: cannot remove '${p}': ${EACCES}`);
    delete parent.children[basename(abs)];
  }
  return ok();
};

const rmdir: Command = (args, ctx) => {
  if (!args.length) return fail('rmdir: missing operand');
  for (const p of args) {
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

    for (const s of sources) {
      const src = locate(ctx, s);
      if (!src.node) return fail(`${name}: cannot stat '${s}': ${ENOENT}`);
      if (src.node.type === 'dir' && name === 'cp' && !flags.has('r') && !flags.has('R')) {
        return fail(`cp: -r not specified; omitting directory '${s}'`);
      }
      if (name === 'cp' && !canAccess(src.node, ctx.user, 'r')) return fail(`cp: cannot open '${s}': ${EACCES}`);

      const targetAbs = dest.node?.type === 'dir' ? (dest.abs === '/' ? '' : dest.abs) + '/' + basename(src.abs) : dest.abs;
      if (targetAbs === src.abs) return fail(`${name}: '${s}' and '${destArg}' are the same file`);
      const targetParent = parentDir(ctx, targetAbs);
      if (!targetParent) return fail(`${name}: cannot create '${destArg}': ${ENOENT}`);
      if (!canAccess(targetParent, ctx.user, 'w')) return fail(`${name}: cannot create '${destArg}': ${EACCES}`);

      if (name === 'mv') {
        const srcParent = parentDir(ctx, src.abs)!;
        if (!canAccess(srcParent, ctx.user, 'w')) return fail(`mv: cannot move '${s}': ${EACCES}`);
        delete srcParent.children[basename(src.abs)];
        targetParent.children[basename(targetAbs)] = src.node;
      } else {
        const copy = cloneNode(src.node);
        copy.owner = ctx.user;
        targetParent.children[basename(targetAbs)] = copy;
      }
    }
    return ok();
  };
}

const grep: Command = (args, ctx) => {
  const { flags, rest } = parseFlags(args);
  const pattern = rest[0];
  if (pattern === undefined) return fail('Ishlatilishi: grep [-i] [-n] [-v] [-c] [-r] NAMUNA [FAYL]...', 2);
  const re = toRegExp(pattern, flags.has('i') ? 'i' : '');
  const recursive = flags.has('r') || flags.has('R');
  let targets = rest.slice(1);
  if (!targets.length && recursive) targets = ['.'];

  const sources: { label: string; text: string }[] = [];
  const errors: string[] = [];
  if (!targets.length) {
    if (ctx.stdin === null) return fail("grep: kirish ma'lumoti yo'q (fayl nomini bering yoki | orqali uzating)", 2);
    sources.push({ label: '', text: ctx.stdin });
  }
  const addFile = (label: string, node: FsNode) => {
    if (node.type === 'dir') {
      if (!recursive) {
        errors.push(`grep: ${label}: ${EISDIR}`);
        return;
      }
      if (!canAccess(node, ctx.user, 'r')) {
        errors.push(`grep: ${label}: ${EACCES}`);
        return;
      }
      for (const name of Object.keys(node.children).sort()) {
        addFile(label === '.' ? name : `${label.replace(/\/$/, '')}/${name}`, node.children[name]!);
      }
      return;
    }
    if (!canAccess(node, ctx.user, 'r')) {
      errors.push(`grep: ${label}: ${EACCES}`);
      return;
    }
    sources.push({ label, text: node.content });
  };
  for (const t of targets) {
    const { node, denied } = locate(ctx, t);
    if (denied) errors.push(`grep: ${t}: ${EACCES}`);
    else if (!node) errors.push(`grep: ${t}: ${ENOENT}`);
    else addFile(t, node);
  }

  const showName = sources.length > 1 || recursive;
  const out: string[] = [];
  let total = 0;
  for (const src of sources) {
    let count = 0;
    toLines(src.text).forEach((line, i) => {
      if (re.test(line) === flags.has('v')) return;
      count++;
      if (flags.has('c') || flags.has('l')) return;
      out.push((showName ? `${src.label}:` : '') + (flags.has('n') ? `${i + 1}:` : '') + line);
    });
    total += count;
    if (flags.has('c')) out.push((showName ? `${src.label}:` : '') + count);
    else if (flags.has('l') && count) out.push(src.label);
  }
  return { out: out.join('\n'), err: errors.join('\n') || undefined, code: total ? 0 : 1 };
};

function headTail(name: 'head' | 'tail'): Command {
  return (args, ctx) => {
    let n = 10;
    const files: string[] = [];
    for (let i = 0; i < args.length; i++) {
      const a = args[i]!;
      if (a === '-n') n = Number(args[++i]);
      else if (/^-n\d+$/.test(a)) n = Number(a.slice(2));
      else if (/^-\d+$/.test(a)) n = Number(a.slice(1));
      else files.push(a);
    }
    if (!Number.isFinite(n) || n < 0) return fail(`${name}: invalid number of lines`);
    const input = readInput(name, files, ctx);
    if ('err' in input) return fail(input.err);
    const lines = toLines(input.text);
    return ok((name === 'head' ? lines.slice(0, n) : n === 0 ? [] : lines.slice(-n)).join('\n'));
  };
}

const wc: Command = (args, ctx) => {
  const { flags, rest } = parseFlags(args);
  const input = readInput('wc', rest, ctx);
  if ('err' in input) return fail(input.err);
  const lines = toLines(input.text).length;
  const words = input.text.split(/\s+/).filter(Boolean).length;
  const chars = input.text.length;
  const picked: number[] = [];
  if (flags.has('l')) picked.push(lines);
  if (flags.has('w')) picked.push(words);
  if (flags.has('c') || flags.has('m')) picked.push(chars);
  const nums = picked.length ? picked : [lines, words, chars];
  const label = rest.length === 1 ? ' ' + rest[0] : '';
  return ok(nums.join(' ') + label);
};

const sort: Command = (args, ctx) => {
  const { flags, rest } = parseFlags(args);
  const input = readInput('sort', rest, ctx);
  if ('err' in input) return fail(input.err);
  let lines = toLines(input.text);
  lines.sort(flags.has('n') ? (a, b) => (parseFloat(a) || 0) - (parseFloat(b) || 0) : (a, b) => (a < b ? -1 : a > b ? 1 : 0));
  if (flags.has('r')) lines.reverse();
  if (flags.has('u')) lines = lines.filter((l, i) => i === 0 || l !== lines[i - 1]);
  return ok(lines.join('\n'));
};

const uniq: Command = (args, ctx) => {
  const { flags, rest } = parseFlags(args);
  const input = readInput('uniq', rest, ctx);
  if ('err' in input) return fail(input.err);
  const groups: { line: string; count: number }[] = [];
  for (const line of toLines(input.text)) {
    const last = groups[groups.length - 1];
    if (last && last.line === line) last.count++;
    else groups.push({ line, count: 1 });
  }
  return ok(groups.map((g) => (flags.has('c') ? `${String(g.count).padStart(7)} ${g.line}` : g.line)).join('\n'));
};

const cut: Command = (args, ctx) => {
  const { values, rest } = parseFlags(args, 'dfc');
  const spec = values.f ?? values.c;
  if (!spec) return fail("cut: -f (ustun) yoki -c (belgi) ko'rsatilishi kerak. Masalan: cut -d ':' -f 1");
  const wanted: number[] = [];
  for (const part of spec.split(',')) {
    const m = /^(\d+)(?:-(\d+))?$/.exec(part);
    if (!m) return fail(`cut: invalid field value '${part}'`);
    for (let i = Number(m[1]); i <= Number(m[2] ?? m[1]); i++) wanted.push(i);
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

const find: Command = (args, ctx) => {
  let start = '.';
  let namePattern: RegExp | null = null;
  let type: string | null = null;
  for (let i = 0; i < args.length; i++) {
    const a = args[i]!;
    if (a === '-name' || a === '-iname') {
      const glob = args[++i] ?? '*';
      const src = glob.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.');
      namePattern = new RegExp(`^${src}$`, a === '-iname' ? 'i' : '');
    } else if (a === '-type') type = args[++i] ?? null;
    else if (!a.startsWith('-')) start = a;
  }
  const root = locate(ctx, start);
  if (!root.node) return fail(`find: '${start}': ${ENOENT}`);
  const out: string[] = [];
  const errors: string[] = [];
  const visit = (label: string, node: FsNode) => {
    const matchesName = !namePattern || namePattern.test(basename(label) || label);
    const matchesType = !type || (type === 'd' ? node.type === 'dir' : node.type === 'file');
    if (matchesName && matchesType) out.push(label);
    if (node.type !== 'dir') return;
    if (!canAccess(node, ctx.user, 'r') || !canAccess(node, ctx.user, 'x')) {
      errors.push(`find: '${label}': ${EACCES}`);
      return;
    }
    for (const name of Object.keys(node.children).sort()) {
      visit(label.replace(/\/$/, '') + '/' + name, node.children[name]!);
    }
  };
  visit(start, root.node);
  return { out: out.join('\n'), err: errors.join('\n') || undefined, code: errors.length ? 1 : 0 };
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
    else out.push(`${p}: ASCII text`);
  }
  return ok(out.join('\n'));
};

function applySymbolic(mode: number, spec: string): number | null {
  let result = mode;
  for (const clause of spec.split(',')) {
    const m = /^([ugoa]*)([+\-=])([rwx]*)$/.exec(clause);
    if (!m) return null;
    const who = m[1] === '' || m[1]!.includes('a') ? 'ugo' : m[1]!;
    let bits = 0;
    if (m[3]!.includes('r')) bits |= 4;
    if (m[3]!.includes('w')) bits |= 2;
    if (m[3]!.includes('x')) bits |= 1;
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
    if (/^[0-7]{3,4}$/.test(spec)) node.mode = parseInt(spec, 8) & 0o777;
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

const id: Command = (_a, ctx) =>
  ok(ctx.user === 'root' ? 'uid=0(root) gid=0(root) groups=0(root)' : `uid=1000(${ctx.user}) gid=1000(${ctx.user}) groups=1000(${ctx.user}),27(sudo)`);

const uname: Command = (args, ctx) =>
  ok(args.includes('-a') ? `Linux ${ctx.state.host} 6.8.11-kali-amd64 #1 SMP PREEMPT_DYNAMIC x86_64 GNU/Linux` : 'Linux');

const history: Command = (_a, ctx) =>
  ok(ctx.state.history.map((h, i) => `${String(i + 1).padStart(4)}  ${h}`).join('\n'));

const which: Command = (args, ctx) => {
  const known = ctx.commandNames();
  const out = args.filter((a) => known.includes(a)).map((a) => `/usr/bin/${a}`);
  return { out: out.join('\n'), code: out.length === args.length && args.length ? 0 : 1 };
};

const base64: Command = (args, ctx) => {
  const { flags, rest } = parseFlags(args);
  const input = readInput('base64', rest, ctx);
  if ('err' in input) return fail(input.err);
  if (flags.has('d') || flags.has('D') || flags.has('decode')) {
    try {
      return ok(trimEnd(base64ToUtf8(input.text)));
    } catch {
      return fail('base64: invalid input');
    }
  }
  return ok(utf8ToBase64(trimEnd(input.text)));
};

const xxd: Command = (args, ctx) => {
  const { flags, rest } = parseFlags(args);
  const input = readInput('xxd', rest, ctx);
  if ('err' in input) return fail(input.err);
  if (flags.has('r')) {
    const hex = input.text.replace(/[^0-9a-fA-F]/g, '');
    if (hex.length % 2) return fail("xxd: hex belgilar soni juft bo'lishi kerak");
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
    return ok(trimEnd(new TextDecoder().decode(bytes)));
  }
  const bytes = new TextEncoder().encode(trimEnd(input.text));
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
  cp: copyOrMove('cp'),
  mv: copyOrMove('mv'),
  grep,
  head: headTail('head'),
  tail: headTail('tail'),
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
  hostname: (_a, ctx) => ok(ctx.state.host),
  uname,
  date: () => ok(new Date().toString()),
  history,
  which,
  base64,
  xxd,
  env: (_a, ctx) => ok(`USER=${ctx.state.user}\nHOME=${ctx.state.home}\nPWD=${ctx.state.cwd}\nSHELL=/bin/bash`),
  clear: (): CmdResult => ({ out: '', code: 0, clear: true }),
  nano: noEditor,
  vim: noEditor,
  vi: noEditor,
  exit: () => ok("Bu simulyator — yopish shart emas. Chiqish uchun sahifadan chiqing."),
};
