import { buildFs, canAccess, chownTree, getNode, resolvePath, dirname, type FsDir, type FsSpec } from './fs';
import { COMMANDS } from './commands';

export interface ShellInit {
  fs: FsSpec;
  user?: string;
  host?: string;
  /** Defaults to the user's home directory. */
  cwd?: string;
}

export interface ShellState {
  root: FsDir;
  cwd: string;
  prevCwd: string;
  user: string;
  host: string;
  home: string;
  history: string[];
}

export interface CmdResult {
  out: string;
  /** Error text; shown in the terminal even inside a pipeline. */
  err?: string;
  code: number;
  clear?: boolean;
}

export interface CmdCtx {
  state: ShellState;
  /** Effective user (root under sudo). */
  user: string;
  stdin: string | null;
  /** Run another command line as `user` (used by sudo). */
  run: (argv: string[], user: string) => CmdResult;
  commandNames: () => string[];
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
  const home = user === 'root' ? '/root' : `/home/${user}`;
  const root = buildFs(init.fs);
  const homeNode = getNode(root, home);
  if (homeNode) chownTree(homeNode, user);
  const tmp = getNode(root, '/tmp');
  if (tmp) tmp.mode = 0o777;
  return {
    root,
    cwd: init.cwd ?? (homeNode ? home : '/'),
    prevCwd: init.cwd ?? (homeNode ? home : '/'),
    user,
    host: init.host ?? 'kali',
    home,
    history: [],
  };
}

export function promptPath(state: ShellState): string {
  if (state.cwd === state.home) return '~';
  if (state.cwd.startsWith(state.home + '/')) return '~' + state.cwd.slice(state.home.length);
  return state.cwd;
}

/* ── tokenizer ───────────────────────────────────────────────────────── */

type Token = { kind: 'word'; text: string; quoted: boolean } | { kind: 'op'; text: string };

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
      cur += line.slice(i + 1, end);
      has = true;
      quoted = true;
      i = end + 1;
      continue;
    }
    if (ch === '\\' && i + 1 < line.length) {
      cur += line[i + 1];
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

/** Expand ~, $VARS and * on an unquoted word. */
function expandWord(state: ShellState, tok: { text: string; quoted: boolean }): string[] {
  let text = tok.text.replace(/\$(\w+)/g, (_, name: string) => {
    if (name === 'HOME') return state.home;
    if (name === 'USER') return state.user;
    if (name === 'PWD') return state.cwd;
    return '';
  });
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

function runArgv(
  state: ShellState,
  argv: string[],
  user: string,
  stdin: string | null,
  custom: Record<string, CustomCommand>,
): CmdResult {
  const [name, ...args] = argv;
  if (!name) return ok();
  const ctx: CmdCtx = {
    state,
    user,
    stdin,
    run: (innerArgv, asUser) => runArgv(state, innerArgv, asUser, stdin, custom),
    commandNames: () => [...new Set([...Object.keys(COMMANDS), ...Object.keys(custom)])].sort(),
  };
  const lab = custom[name];
  if (lab) {
    const res = lab(args, ctx);
    return typeof res === 'string' ? ok(res) : res;
  }
  const cmd = COMMANDS[name];
  if (!cmd) return fail(`${name}: command not found\n(bunday buyruq yo'q — ro'yxat uchun: help)`, 127);
  return cmd(args, ctx);
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

function runPipeline(state: ShellState, stages: Stage[], custom: Record<string, CustomCommand>): CmdResult {
  let stdin: string | null = null;
  let errors = '';
  let last: CmdResult = ok();
  for (const stage of stages) {
    last = runArgv(state, stage.argv, state.user, stdin, custom);
    if (last.err) errors += (errors ? '\n' : '') + last.err;
    if (last.clear) return last;
    if (stage.redirect) {
      const problem = writeRedirect(state, stage.redirect, last.out);
      if (problem) return fail((errors ? errors + '\n' : '') + problem);
      last = { ...last, out: '' };
    }
    stdin = last.out;
  }
  return { out: last.out, err: errors || undefined, code: last.code };
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

  const tokens = tokenize(trimmed);
  if (typeof tokens === 'string') return { output: `xato: ${tokens}`, code: 2, clear: false };

  // Split into chains (&&, ;) of pipelines (|) of stages.
  const chains: { stages: Stage[]; andNext: boolean }[] = [];
  let stages: Stage[] = [];
  let stage: Stage = { argv: [] };
  const endStage = () => {
    if (stage.argv.length || stage.redirect) stages.push(stage);
    stage = { argv: [] };
  };
  const endChain = (andNext: boolean) => {
    endStage();
    if (stages.length) chains.push({ stages, andNext });
    stages = [];
  };
  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i]!;
    if (tok.kind === 'word') {
      stage.argv.push(...expandWord(state, tok));
      continue;
    }
    if (tok.text === '|') {
      if (!stage.argv.length) return { output: "xato: `|` dan oldin buyruq yo'q", code: 2, clear: false };
      endStage();
    } else if (tok.text === '>' || tok.text === '>>') {
      const target = tokens[++i];
      if (!target || target.kind !== 'word') {
        return { output: `xato: \`${tok.text}\` dan keyin fayl nomi kerak`, code: 2, clear: false };
      }
      stage.redirect = { path: expandWord(state, target)[0]!, append: tok.text === '>>' };
    } else {
      endChain(tok.text === '&&');
    }
  }
  endChain(false);

  const parts: string[] = [];
  let code = 0;
  let clear = false;
  for (const chain of chains) {
    const res = runPipeline(state, chain.stages, custom);
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

/** Tab completion: the completed line, or the candidates when ambiguous. */
export function complete(
  state: ShellState,
  line: string,
  custom: Record<string, CustomCommand> = {},
): { line: string; options: string[] } {
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
