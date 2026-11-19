import { buildFs, canAccess, chownTree, getNode, resolvePath, dirname, type FsDir, type FsSpec } from './fs';
import { COMMANDS } from './commands';
import { createNet, type NetSpec, type NetState } from './net';
import { createSystem, type SystemSpec, type SystemState } from './system';
import { createPackages, type SysInfoSpec } from './users';
import { createWin, type WinSpec, type WinState } from '../pwsh/state';
import { completePs, runPsLine } from '../pwsh';

export interface ShellInit {
  fs: FsSpec;
  user?: string;
  host?: string;
  /** Defaults to the user's home directory. */
  cwd?: string;
  /** Running processes, services and sockets (ps, systemctl, ss). */
  system?: SystemSpec;
  /** Extra hosts on the simulated network (ip, ping, curl, dig, nc). */
  net?: NetSpec;
  /** Sessions, logins, memory and installed packages (who, last, free, apt). */
  sysinfo?: SysInfoSpec;
  /** A Windows machine: the terminal becomes PowerShell and `fs` is the C: drive. */
  windows?: WinSpec;
}

export interface ShellState {
  root: FsDir;
  cwd: string;
  prevCwd: string;
  user: string;
  host: string;
  home: string;
  history: string[];
  system: SystemState;
  net: NetState;
  sysinfo: SysInfoSpec;
  packages: Set<string>;
  /** Shell variables set with NAME=value (also inside scripts). */
  vars: Record<string, string>;
  /** Present when the terminal is PowerShell on a Windows machine. */
  win?: WinState;
}

export interface CmdResult {
  out: string;
  /** Error text; shown in the terminal even inside a pipeline. */
  err?: string;
  code: number;
  clear?: boolean;
  /** Output does not end a line (echo -n); the next command in a pipe then gets no trailing newline. */
  noNewline?: boolean;
}

export interface CmdCtx {
  state: ShellState;
  /** Effective user (root under sudo). */
  user: string;
  stdin: string | null;
  /** Run another command line as `user` (used by sudo). */
  run: (argv: string[], user: string) => CmdResult;
  commandNames: () => string[];
  /** Output goes to a pipe or a file, not the screen (ls then prints one name per line, as the real one does). */
  piped?: boolean;
  /** Real programs print a final newline; piped text here has it stripped. True when the previous stage was echo -n. */
  stdinNoNewline?: boolean;
}

export type Command = (args: string[], ctx: CmdCtx) => CmdResult;
/** A lab-specific command; returning a string means success with that output. */
export type CustomCommand = (args: string[], ctx: CmdCtx) => CmdResult | string;

export interface ExecResult {
  output: string;
  code: number;
  clear: boolean;
}

export const ok = (out = ''): CmdResult => ({ out, code: 0 });
export const fail = (err: string, code = 1): CmdResult => ({ out: '', err, code });

export function createShell(init: ShellInit): ShellState {
  const user = init.user ?? 'talaba';
  const home = init.windows ? `/Users/${user}` : user === 'root' ? '/root' : `/home/${user}`;
  const root = buildFs(init.fs);
  const homeNode = getNode(root, home);
  if (homeNode) chownTree(homeNode, user);
  const tmp = getNode(root, '/tmp');
  // /tmp: everyone may write, only the owner may delete (sticky bit), as on a real system.
  if (tmp) tmp.mode = 0o1777;
  return {
    root,
    cwd: init.cwd ?? (homeNode ? home : '/'),
    prevCwd: init.cwd ?? (homeNode ? home : '/'),
    user,
    host: init.host ?? (init.windows ? init.windows.computer ?? 'WIN-LAB' : 'kali'),
    home,
    history: [],
    system: createSystem(init.system),
    net: createNet(init.net),
    sysinfo: init.sysinfo ?? {},
    packages: createPackages(init.sysinfo),
    vars: {},
    ...(init.windows ? { win: createWin(init.windows, user) } : {}),
  };
}

export function promptPath(state: ShellState): string {
  if (state.win) return 'C:' + (state.cwd === '/' ? '\\' : state.cwd.replace(/\//g, '\\'));
  if (state.cwd === state.home) return '~';
  if (state.cwd.startsWith(state.home + '/')) return '~' + state.cwd.slice(state.home.length);
  return state.cwd;
}

/* ── tokenizer ───────────────────────────────────────────────────────── */

type Token = { kind: 'word'; text: string; quoted: boolean } | { kind: 'op'; text: string };

/** Stands for a `$` that must not be expanded (inside single quotes or escaped as \$). */
const LITERAL_DOLLAR = '\u0001';

const OPS = ['&&', '>>', '|', '>', ';'];

function tokenize(line: string): Token[] | string {
  const tokens: Token[] = [];
  let i = 0;
  let cur = '';
  let has = false;
  let quoted = false;
  const push = () => {
    if (has) tokens.push({ kind: 'word', text: cur, quoted });
    cur = '';
    has = false;
    quoted = false;
  };
  while (i < line.length) {
    const ch = line[i]!;
    if (ch === ' ' || ch === '\t') {
      push();
      i++;
      continue;
    }
    if (ch === "'" || ch === '"') {
      const end = line.indexOf(ch, i + 1);
      if (end === -1) return "yopilmagan qo'shtirnoq";
      const body = line.slice(i + 1, end);
      // Single quotes keep $ literal (awk '{print $1}' depends on it); the marker survives variable expansion.
      // In double quotes, \$ and \\ are escapes, as in bash.
      cur +=
        ch === "'"
          ? body.replace(/\$/g, LITERAL_DOLLAR)
          : body.replace(/\\([$\\])/g, (_, c: string) => (c === '$' ? LITERAL_DOLLAR : c));
      has = true;
      quoted = true;
      i = end + 1;
      continue;
    }
    if (ch === '\\' && i + 1 < line.length) {
      cur += line[i + 1] === '$' ? LITERAL_DOLLAR : line[i + 1];
      has = true;
      quoted = true;
      i += 2;
      continue;
    }
    const op = OPS.find((o) => line.startsWith(o, i));
    if (op) {
      push();
      tokens.push({ kind: 'op', text: op });
      i += op.length;
      continue;
    }
    cur += ch;
    has = true;
    i++;
  }
  push();
  return tokens;
}

function globToRegExp(glob: string): RegExp {
  const src = glob.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '[^/]*').replace(/\?/g, '[^/]');
  return new RegExp(`^${src}$`);
}

/** Expand ~, $VARS (and $1..$9 inside scripts) and * on an unquoted word. */
function expandWord(state: ShellState, tok: { text: string; quoted: boolean }, positional: string[] = []): string[] {
  let text = tok.text
    .replace(/\$(\w+|@|#)/g, (_, name: string) => {
      if (/^\d+$/.test(name)) return positional[Number(name)] ?? '';
      if (name === '@') return positional.slice(1).join(' ');
      if (name === '#') return String(Math.max(0, positional.length - 1));
      if (name === 'HOME') return state.home;
      if (name === 'USER') return state.user;
      if (name === 'PWD') return state.cwd;
      return state.vars[name] ?? '';
    })
    .replaceAll(LITERAL_DOLLAR, '$');
  if (tok.quoted) return [text];
  if (text === '~' || text.startsWith('~/')) text = state.home + text.slice(1);
  if (!/[*?]/.test(text)) return [text];

  const slash = text.lastIndexOf('/');
  const dirPart = slash === -1 ? '' : text.slice(0, slash + 1);
  const pattern = slash === -1 ? text : text.slice(slash + 1);
  const dirNode = getNode(state.root, resolvePath(state.cwd, dirPart || '.', state.home));
  if (!dirNode || dirNode.type !== 'dir') return [text];
  const re = globToRegExp(pattern);
  const matches = Object.keys(dirNode.children)
    .filter((name) => re.test(name) && (pattern.startsWith('.') || !name.startsWith('.')))
    .sort()
    .map((name) => dirPart + name);
  return matches.length ? matches : [text];
}

/* ── execution ───────────────────────────────────────────────────────── */

interface Stage {
  argv: string[];
  redirect?: { path: string; append: boolean };
}

/** Scripts may call scripts; a cap keeps a script that runs itself from hanging the page. */
const MAX_SCRIPT_DEPTH = 5;

function runArgv(
  state: ShellState,
  argv: string[],
  user: string,
  stdin: string | null,
  custom: Record<string, CustomCommand>,
  depth = 0,
  piped = false,
  stdinNoNewline = false,
): CmdResult {
  const [name, ...args] = argv;
  if (!name) return ok();
  const ctx: CmdCtx = {
    state,
    user,
    stdin,
    run: (innerArgv, asUser) => runArgv(state, innerArgv, asUser, stdin, custom, depth, piped),
    commandNames: () => [...new Set([...Object.keys(COMMANDS), ...Object.keys(custom)])].sort(),
    piped,
    stdinNoNewline,
  };
  if ((name === 'bash' || name === 'sh') && args.length && !args[0]!.startsWith('-')) {
    return runScript(state, args[0]!, args.slice(1), user, custom, depth, false);
  }
  if (name.includes('/')) return runScript(state, name, args, user, custom, depth, true);
  const lab = custom[name];
  if (lab) {
    const res = lab(args, ctx);
    return typeof res === 'string' ? ok(res) : res;
  }
  const cmd = COMMANDS[name];
  if (!cmd) return fail(`${name}: command not found\n(bunday buyruq yo'q — ro'yxat uchun: help)`, 127);
  return cmd(args, ctx);
}

/**
 * Runs a shell script line by line. Supported: commands, pipes, redirects, && and ;, NAME=value variables, $1..$9,
 * $@ and $#, comments, exit, set -e. Not supported (said so when met): if, for, while, functions, $(...).
 */
function runScript(
  state: ShellState,
  path: string,
  args: string[],
  user: string,
  custom: Record<string, CustomCommand>,
  depth: number,
  direct: boolean,
): CmdResult {
  const abs = resolvePath(state.cwd, path, state.home);
  const node = getNode(state.root, abs);
  if (!node) return fail(`bash: ${path}: No such file or directory`, 127);
  if (node.type === 'dir') return fail(`bash: ${path}: Is a directory`, 126);
  if (!canAccess(node, user, 'r')) return fail(`bash: ${path}: Permission denied`, 126);
  // Running ./script needs the execute bit; "bash script" only needs to read it.
  if (direct && !canAccess(node, user, 'x')) {
    return fail(`bash: ${path}: Permission denied\n(Bajarish ruxsati yo'q: chmod +x ${path})`, 126);
  }
  if (depth >= MAX_SCRIPT_DEPTH) return fail("bash: skriptlar juda chuqur chaqirildi (ehtimol skript o'zini chaqiryapti)");

  const positional = [path, ...args];
  const out: string[] = [];
  let code = 0;
  let stopOnError = false;
  const lines = node.content.split('\n');
  for (let n = 0; n < lines.length; n++) {
    const line = lines[n]!.trim();
    if (!line || line.startsWith('#')) continue;
    if (/^set\s+-e\b/.test(line)) {
      stopOnError = true;
      continue;
    }
    if (/^(if|then|else|elif|fi|for|while|until|do|done|case|esac|function)\b/.test(line) || line.includes('$(')) {
      out.push(`${path}: ${n + 1}-qator: bu simulyatorda if, for, while, funksiyalar va $(...) yo'q — skript qatorma-qator bajariladi`);
      code = 2;
      break;
    }
    const exit = /^exit(?:\s+(\d+))?$/.exec(line);
    if (exit) {
      code = Number(exit[1] ?? 0);
      break;
    }
    const res = runLine(state, line, custom, user, positional, depth + 1);
    if (res.output) out.push(res.output);
    code = res.code;
    if (code !== 0 && stopOnError) break;
  }
  return { out: out.join('\n'), code };
}

function writeRedirect(state: ShellState, redirect: { path: string; append: boolean }, text: string): string | null {
  const abs = resolvePath(state.cwd, redirect.path, state.home);
  const parent = getNode(state.root, dirname(abs));
  if (!parent || parent.type !== 'dir') return `bash: ${redirect.path}: No such file or directory`;
  const name = abs.slice(abs.lastIndexOf('/') + 1);
  const existing = parent.children[name];
  const body = text === '' ? '' : text + '\n';
  // The shell itself opens the file, so `sudo cmd > file` still writes as the plain user.
  if (existing) {
    if (existing.type === 'dir') return `bash: ${redirect.path}: Is a directory`;
    if (!canAccess(existing, state.user, 'w')) return `bash: ${redirect.path}: Permission denied`;
    existing.content = redirect.append ? existing.content + body : body;
  } else {
    if (!canAccess(parent, state.user, 'w')) return `bash: ${redirect.path}: Permission denied`;
    parent.children[name] = { type: 'file', content: body, mode: 0o644, owner: state.user };
  }
  return null;
}

function runPipeline(
  state: ShellState,
  stages: Stage[],
  custom: Record<string, CustomCommand>,
  user: string,
  depth: number,
): CmdResult {
  let stdin: string | null = null;
  let prevNoNewline = false;
  let errors = '';
  let last: CmdResult = ok();
  for (const [index, stage] of stages.entries()) {
    last = runArgv(state, stage.argv, user, stdin, custom, depth, index < stages.length - 1 || !!stage.redirect, !!prevNoNewline);
    if (last.err) errors += (errors ? '\n' : '') + last.err;
    if (last.clear) return last;
    if (stage.redirect) {
      const problem = writeRedirect(state, stage.redirect, last.out);
      if (problem) return fail((errors ? errors + '\n' : '') + problem);
      last = { ...last, out: '' };
    }
    stdin = last.out;
    prevNoNewline = !!last.noNewline;
  }
  return { out: last.out, err: errors || undefined, code: last.code };
}

type WordToken = { kind: 'word'; text: string; quoted: boolean };
type RawStage = { words: WordToken[]; redirect?: { target: WordToken; append: boolean } };

const ASSIGNMENT = /^([A-Za-z_]\w*)=(.*)$/s;

function runLine(
  state: ShellState,
  line: string,
  custom: Record<string, CustomCommand>,
  user: string,
  positional: string[],
  depth: number,
): ExecResult {
  const tokens = tokenize(line);
  if (typeof tokens === 'string') return { output: `xato: ${tokens}`, code: 2, clear: false };

  // Split into chains (&&, ;) of pipelines (|) of stages. Words are expanded when their chain runs,
  // so "A=1; echo $A" already sees the new value.
  const chains: { stages: RawStage[]; andNext: boolean }[] = [];
  let stages: RawStage[] = [];
  let stage: RawStage = { words: [] };
  const endStage = () => {
    if (stage.words.length || stage.redirect) stages.push(stage);
    stage = { words: [] };
  };
  const endChain = (andNext: boolean) => {
    endStage();
    if (stages.length) chains.push({ stages, andNext });
    stages = [];
  };
  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i]!;
    if (tok.kind === 'word') {
      stage.words.push(tok);
      continue;
    }
    if (tok.text === '|') {
      if (!stage.words.length) return { output: "xato: `|` dan oldin buyruq yo'q", code: 2, clear: false };
      endStage();
    } else if (tok.text === '>' || tok.text === '>>') {
      const target = tokens[++i];
      if (!target || target.kind !== 'word') {
        return { output: `xato: \`${tok.text}\` dan keyin fayl nomi kerak`, code: 2, clear: false };
      }
      stage.redirect = { target, append: tok.text === '>>' };
    } else {
      endChain(tok.text === '&&');
    }
  }
  endChain(false);

  const parts: string[] = [];
  let code = 0;
  let clear = false;
  for (const chain of chains) {
    const first = chain.stages[0]!;
    const assign =
      chain.stages.length === 1 && first.words.length === 1 && !first.redirect ? ASSIGNMENT.exec(first.words[0]!.text) : null;
    if (assign) {
      state.vars[assign[1]!] = expandWord(state, { text: assign[2]!, quoted: true }, positional)[0] ?? '';
      code = 0;
      continue;
    }
    const expanded: Stage[] = chain.stages.map((s) => ({
      argv: s.words.flatMap((w) => expandWord(state, w, positional)),
      redirect: s.redirect
        ? { path: expandWord(state, s.redirect.target, positional)[0]!, append: s.redirect.append }
        : undefined,
    }));
    const res = runPipeline(state, expanded, custom, user, depth);
    code = res.code;
    if (res.clear) {
      clear = true;
      parts.length = 0;
      continue;
    }
    if (res.err) parts.push(res.err);
    if (res.out) parts.push(res.out);
    if (chain.andNext && code !== 0) break;
  }
  return { output: parts.join('\n'), code, clear };
}

/** Execute one command line; mutates `state`. */
export function execLine(
  state: ShellState,
  line: string,
  custom: Record<string, CustomCommand> = {},
): ExecResult {
  const trimmed = line.trim();
  if (!trimmed) return { output: '', code: 0, clear: false };
  state.history.push(trimmed);
  if (state.win) return runPsLine(state, trimmed);
  return runLine(state, trimmed, custom, state.user, [], 0);
}

/** Tab completion: the completed line, or the candidates when ambiguous. */
export function complete(
  state: ShellState,
  line: string,
  custom: Record<string, CustomCommand> = {},
): { line: string; options: string[] } {
  if (state.win) return completePs(state, line);
  const m = /(?:^|[\s|;&>])([^\s|;&>]*)$/.exec(line);
  const word = m ? m[1]! : '';
  const before = line.slice(0, line.length - word.length);
  const isCommand = /(^|[|;&]\s*)$/.test(before) || /^\s*sudo\s+$/.test(before);

  let candidates: string[];
  let base = '';
  if (isCommand && !word.includes('/')) {
    candidates = [...new Set([...Object.keys(COMMANDS), ...Object.keys(custom)])];
  } else {
    const slash = word.lastIndexOf('/');
    base = slash === -1 ? '' : word.slice(0, slash + 1);
    const dirNode = getNode(state.root, resolvePath(state.cwd, base || '.', state.home));
    if (!dirNode || dirNode.type !== 'dir') return { line, options: [] };
    candidates = Object.entries(dirNode.children).map(([name, n]) => (n.type === 'dir' ? name + '/' : name));
  }
  const prefix = word.slice(base.length);
  const hits = candidates.filter((c) => c.startsWith(prefix) && (prefix.startsWith('.') || !c.startsWith('.'))).sort();
  if (!hits.length) return { line, options: [] };
  if (hits.length === 1) {
    const hit = hits[0]!;
    return { line: before + base + hit + (hit.endsWith('/') ? '' : ' '), options: [] };
  }
  let common = hits[0]!;
  for (const h of hits) while (!h.startsWith(common)) common = common.slice(0, -1);
  return { line: before + base + common, options: common.length > prefix.length ? [] : hits };
}
