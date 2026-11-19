/*
 * Git for the terminal: repositories with full history (commits as snapshots), branches, tags, remotes, reflog and
 * stash; a working tree in the simulator's file system and an index. Enough of git to investigate history the way
 * security reviews do (log -S, blame, show REV:path, reflog) and to fix it (rm --cached, commit, filter-repo).
 */
import { getNode, resolvePath, type FsDir, type FsNode } from './fs';
import { fail, ok, type CmdCtx, type CmdResult, type Command, type ShellState } from './shell';
import { sha256Hex } from './text';

export interface CommitSpec {
  /** Branch the commit is made on (default main). A new branch starts from `from` (a branch name or commit id). */
  branch?: string;
  from?: string;
  /** Merge this branch's tip as the second parent. */
  merge?: string;
  /** Not reachable from any ref any more (reset away): visible only in the reflog. */
  orphan?: boolean;
  author: string;
  date: number;
  message: string;
  changes: Record<string, string | null>;
}

export interface GitRepoSpec {
  /** Absolute path of the working tree. */
  path: string;
  commits: CommitSpec[];
  head?: string;
  tags?: Record<string, string>;
  remotes?: Record<string, string>;
  /** Remote-tracking branches: "origin/main" → branch or commit it points to. */
  remoteBranches?: Record<string, string>;
  /** Uncommitted changes in the working tree (null deletes). */
  worktree?: Record<string, string | null>;
  /** Explicit reflog lines, newest first: [commit message or branch ref, action]. */
  reflog?: { target: string; action: string }[];
  stash?: { message: string; changes: Record<string, string | null>; date: number }[];
  user?: { name: string; email: string };
  now?: number;
}

export interface Commit {
  id: string;
  parents: string[];
  author: string;
  date: number;
  message: string;
  snapshot: Record<string, string>;
  orphan?: boolean;
}

export interface Repo {
  path: string;
  commits: Map<string, Commit>;
  order: string[];
  branches: Map<string, string>;
  head: string;
  tags: Map<string, string>;
  remotes: Map<string, string>;
  remoteBranches: Map<string, string>;
  index: Record<string, string>;
  reflog: { id: string; action: string }[];
  stash: { id: string; message: string; snapshot: Record<string, string>; base: string; date: number }[];
  user: { name: string; email: string };
  now: number;
}

export type GitState = Map<string, Repo>;

const TZ = 5 * 3600_000;

function commitId(seed: string): string {
  return sha256Hex(seed).slice(0, 40);
}

export function createRepos(specs: GitRepoSpec[], root: FsDir): GitState {
  const state: GitState = new Map();
  for (const spec of specs) {
    const commits = new Map<string, Commit>();
    const order: string[] = [];
    const branches = new Map<string, string>();
    const byMessage = new Map<string, string>();
    for (const c of spec.commits) {
      const branch = c.branch ?? 'main';
      let parent = branches.get(branch);
      if (!parent && c.from) parent = branches.get(c.from) ?? byMessage.get(c.from) ?? c.from;
      // A new branch without `from` starts where the default branch is at that moment.
      if (!parent && !c.from && branch !== (spec.head ?? 'main')) parent = branches.get(spec.head ?? 'main');
      if (c.orphan && !parent) parent = branches.get(branch);
      const parents = parent ? [parent] : [];
      const base = parent ? { ...commits.get(parent)!.snapshot } : {};
      if (c.merge) {
        const other = branches.get(c.merge)!;
        parents.push(other);
        Object.assign(base, commits.get(other)!.snapshot);
      }
      for (const [p, v] of Object.entries(c.changes)) {
        if (v === null) delete base[p];
        else base[p] = v;
      }
      const id = commitId(`${parents.join(',')}|${c.author}|${c.date}|${c.message}|${JSON.stringify(c.changes)}`);
      commits.set(id, { id, parents, author: c.author, date: c.date, message: c.message, snapshot: base, ...(c.orphan ? { orphan: true } : {}) });
      order.push(id);
      byMessage.set(c.message, id);
      if (!c.orphan) branches.set(branch, id);
    }
    const head = spec.head ?? 'main';
    const resolveRef = (r: string) => branches.get(r) ?? byMessage.get(r) ?? r;
    const repo: Repo = {
      path: spec.path,
      commits,
      order,
      branches,
      head,
      tags: new Map(Object.entries(spec.tags ?? {}).map(([k, v]) => [k, resolveRef(v)])),
      remotes: new Map(Object.entries(spec.remotes ?? {})),
      remoteBranches: new Map(Object.entries(spec.remoteBranches ?? (spec.remotes?.origin ? { 'origin/main': 'main' } : {})).map(([k, v]) => [k, resolveRef(v)])),
      index: { ...(commits.get(branches.get(head)!)?.snapshot ?? {}) },
      reflog: [],
      stash: [],
      user: spec.user ?? { name: 'Talaba', email: 'talaba@qaydnoma.lab' },
      now: spec.now ?? Date.UTC(2026, 10, 18, 9, 0, 0),
    };
    // Reflog: explicit lines, or the first-parent history of HEAD.
    if (spec.reflog) repo.reflog = spec.reflog.map((r) => ({ id: resolveRef(r.target), action: r.action }));
    else {
      const chain = firstParentChain(repo, branches.get(head)!);
      repo.reflog = chain.map((id, i) => ({ id, action: `commit${i === chain.length - 1 ? ' (initial)' : ''}: ${subject(commits.get(id)!.message)}` }));
    }
    for (const st of spec.stash ?? []) {
      const baseId = branches.get(head)!;
      const snap = { ...commits.get(baseId)!.snapshot };
      for (const [p, v] of Object.entries(st.changes)) {
        if (v === null) delete snap[p];
        else snap[p] = v;
      }
      repo.stash.push({ id: commitId(`stash|${st.message}|${st.date}`), message: st.message, snapshot: snap, base: baseId, date: st.date });
    }
    // Working tree = HEAD snapshot + uncommitted changes; plus a .git directory.
    writeTree(root, spec.path, repo.index);
    for (const [p, v] of Object.entries(spec.worktree ?? {})) setFile(root, `${spec.path}/${p}`, v);
    setFile(root, `${spec.path}/.git/HEAD`, `ref: refs/heads/${head}\n`);
    setFile(root, `${spec.path}/.git/config`, `[core]\n\trepositoryformatversion = 0\n${[...repo.remotes].map(([n, u]) => `[remote "${n}"]\n\turl = ${u}\n`).join('')}`);
    state.set(spec.path, repo);
  }
  return state;
}

/* ── file system helpers ── */

function setFile(root: FsDir, abs: string, content: string | null) {
  const parts = abs.split('/').filter(Boolean);
  let dir: FsDir = root;
  for (const part of parts.slice(0, -1)) {
    let next = dir.children[part];
    if (!next) {
      if (content === null) return;
      next = { type: 'dir', children: {}, mode: 0o755, owner: 'talaba' };
      dir.children[part] = next;
    }
    if (next.type !== 'dir') return;
    dir = next;
  }
  const name = parts[parts.length - 1]!;
  if (content === null) delete dir.children[name];
  else dir.children[name] = { type: 'file', content, mode: 0o644, owner: 'talaba' };
}

function writeTree(root: FsDir, base: string, snap: Record<string, string>) {
  for (const [p, v] of Object.entries(snap)) setFile(root, `${base}/${p}`, v);
}

function readTree(root: FsDir, base: string): Record<string, string> {
  const out: Record<string, string> = {};
  const node = getNode(root, base);
  const walk = (n: FsNode, rel: string) => {
    if (n.type === 'file') {
      out[rel] = n.content;
      return;
    }
    for (const [name, child] of Object.entries(n.children)) {
      if (!rel && name === '.git') continue;
      walk(child, rel ? `${rel}/${name}` : name);
    }
  };
  if (node) walk(node, '');
  return out;
}

function removeEmptyDirs(dir: FsDir) {
  for (const [name, child] of Object.entries(dir.children)) {
    if (child.type === 'dir' && name !== '.git') {
      removeEmptyDirs(child);
      if (!Object.keys(child.children).length) delete dir.children[name];
    }
  }
}

/* ── history helpers ── */

const subject = (msg: string) => msg.split('\n')[0]!;

function firstParentChain(repo: Repo, tip: string): string[] {
  const out: string[] = [];
  let cur: string | undefined = tip;
  while (cur) {
    out.push(cur);
    cur = repo.commits.get(cur)?.parents[0];
  }
  return out;
}

/** All commits reachable from the given tips, newest first by date. */
function reachable(repo: Repo, tips: string[]): Commit[] {
  const seen = new Set<string>();
  const stack = [...tips];
  while (stack.length) {
    const id = stack.pop()!;
    if (seen.has(id) || !repo.commits.has(id)) continue;
    seen.add(id);
    stack.push(...repo.commits.get(id)!.parents);
  }
  return [...seen].map((id) => repo.commits.get(id)!).sort((a, b) => b.date - a.date || repo.order.indexOf(b.id) - repo.order.indexOf(a.id));
}

const headId = (repo: Repo) => repo.branches.get(repo.head) ?? (repo.commits.has(repo.head) ? repo.head : '');

export function resolveRev(repo: Repo, rev: string): string | null {
  const m = /^(.+?)((?:[~^]\d*)*)$/.exec(rev);
  if (!m) return null;
  let base = m[1]!;
  let id: string | undefined;
  if (base === 'HEAD') id = headId(repo);
  else if (repo.branches.has(base)) id = repo.branches.get(base);
  else if (repo.tags.has(base)) id = repo.tags.get(base);
  else if (repo.remoteBranches.has(base)) id = repo.remoteBranches.get(base);
  else if (/^stash@\{(\d+)\}$/.test(base) || base === 'stash') {
    const n = base === 'stash' ? 0 : Number(/\d+/.exec(base)![0]);
    return repo.stash[n]?.id ?? null;
  } else if (/^HEAD@\{(\d+)\}$/.test(base)) id = repo.reflog[Number(/\d+/.exec(base)![0])]?.id;
  else if (/^[0-9a-f]{4,40}$/.test(base)) {
    const hits = [...repo.commits.keys()].filter((k) => k.startsWith(base));
    if (hits.length === 1) id = hits[0];
  }
  if (!id) return null;
  const ops = m[2]!.match(/[~^]\d*/g) ?? [];
  for (const op of ops) {
    const n = op.length > 1 ? Number(op.slice(1)) : 1;
    if (op[0] === '~') for (let i = 0; i < n; i++) id = repo.commits.get(id!)?.parents[0];
    else id = repo.commits.get(id!)?.parents[n - 1];
    if (!id) return null;
  }
  return id ?? null;
}

function snapshotOf(repo: Repo, id: string): Record<string, string> {
  const st = repo.stash.find((s) => s.id === id);
  if (st) return st.snapshot;
  return repo.commits.get(id)?.snapshot ?? {};
}

/* ── dates and decorations ── */

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const p2 = (n: number) => String(n).padStart(2, '0');

export function gitDate(ms: number, mode: string = 'default'): string {
  const d = new Date(ms + TZ);
  const ymd = `${d.getUTCFullYear()}-${p2(d.getUTCMonth() + 1)}-${p2(d.getUTCDate())}`;
  const hms = `${p2(d.getUTCHours())}:${p2(d.getUTCMinutes())}:${p2(d.getUTCSeconds())}`;
  if (mode === 'short') return ymd;
  if (mode === 'iso') return `${ymd} ${hms} +0500`;
  return `${DAYS[d.getUTCDay()]} ${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()} ${hms} ${d.getUTCFullYear()} +0500`;
}

function relDate(now: number, ms: number): string {
  const s = Math.round((now - ms) / 1000);
  if (s < 3600) return `${Math.max(1, Math.round(s / 60))} minutes ago`;
  if (s < 86400) return `${Math.round(s / 3600)} hours ago`;
  if (s < 86400 * 14) return `${Math.round(s / 86400)} days ago`;
  if (s < 86400 * 60) return `${Math.round(s / 86400 / 7)} weeks ago`;
  return `${Math.round(s / 86400 / 30)} months ago`;
}

function decorations(repo: Repo, id: string): string {
  const out: string[] = [];
  const head = headId(repo);
  for (const [b, t] of repo.branches) if (t === id) out.push(b === repo.head && head === id ? `HEAD -> ${b}` : b);
  if (repo.commits.has(repo.head) && repo.head === id) out.unshift('HEAD');
  for (const [b, t] of repo.remoteBranches) if (t === id) out.push(b);
  for (const [tg, t] of repo.tags) if (t === id) out.push(`tag: ${tg}`);
  out.sort((a, b) => (a.startsWith('HEAD') ? -1 : b.startsWith('HEAD') ? 1 : 0));
  return out.length ? ` (${out.join(', ')})` : '';
}

const authorName = (a: string) => a.replace(/\s*<.*>$/, '');
const authorEmail = (a: string) => /<(.*)>/.exec(a)?.[1] ?? '';

/* ── diffs ── */

export function lcsMatch(a: string[], b: string[]): [number, number][] {
  const n = a.length;
  const m = b.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) dp[i]![j] = a[i] === b[j] ? dp[i + 1]![j + 1]! + 1 : Math.max(dp[i + 1]![j]!, dp[i]![j + 1]!);
  const pairs: [number, number][] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      pairs.push([i, j]);
      i++;
      j++;
    } else if (dp[i + 1]![j]! >= dp[i]![j + 1]!) i++;
    else j++;
  }
  return pairs;
}

const lines = (s: string | undefined) => (s === undefined || s === '' ? [] : s.replace(/\n$/, '').split('\n'));

interface FileDiff {
  path: string;
  status: 'A' | 'M' | 'D';
  added: number;
  removed: number;
  patch: string;
}

function fileDiff(path: string, before: string | undefined, after: string | undefined): FileDiff | null {
  if (before === after) return null;
  const a = lines(before);
  const b = lines(after);
  const pairs = lcsMatch(a, b);
  const ops: { t: ' ' | '-' | '+'; s: string; ai: number; bi: number }[] = [];
  let i = 0;
  let j = 0;
  for (const [pi, pj] of [...pairs, [a.length, b.length] as [number, number]]) {
    while (i < pi) ops.push({ t: '-', s: a[i]!, ai: i++, bi: j });
    while (j < pj) ops.push({ t: '+', s: b[j]!, ai: i, bi: j++ });
    if (i < a.length && j < b.length) ops.push({ t: ' ', s: a[i]!, ai: i++, bi: j++ });
  }
  // Hunks with 3 lines of context.
  const hunks: string[] = [];
  const changed = ops.map((o, k) => (o.t !== ' ' ? k : -1)).filter((k) => k >= 0);
  let k = 0;
  while (k < changed.length) {
    let start = Math.max(0, changed[k]! - 3);
    let end = Math.min(ops.length - 1, changed[k]! + 3);
    while (k + 1 < changed.length && changed[k + 1]! - 3 <= end + 1) {
      k++;
      end = Math.min(ops.length - 1, changed[k]! + 3);
    }
    const slice = ops.slice(start, end + 1);
    const aStart = slice.find((o) => o.t !== '+')?.ai ?? ops[start]!.ai;
    const bStart = slice.find((o) => o.t !== '-')?.bi ?? ops[start]!.bi;
    const aLen = slice.filter((o) => o.t !== '+').length;
    const bLen = slice.filter((o) => o.t !== '-').length;
    hunks.push(`@@ -${aLen ? aStart + 1 : aStart},${aLen} +${bLen ? bStart + 1 : bStart},${bLen} @@`, ...slice.map((o) => o.t + o.s));
    k++;
    void start;
  }
  const status = before === undefined ? 'A' : after === undefined ? 'D' : 'M';
  const header = [
    `diff --git a/${path} b/${path}`,
    ...(status === 'A' ? ['new file mode 100644'] : status === 'D' ? ['deleted file mode 100644'] : []),
    `index ${before === undefined ? '0000000' : sha256Hex(before).slice(0, 7)}..${after === undefined ? '0000000' : sha256Hex(after).slice(0, 7)}${status === 'M' ? ' 100644' : ''}`,
    `--- ${status === 'A' ? '/dev/null' : 'a/' + path}`,
    `+++ ${status === 'D' ? '/dev/null' : 'b/' + path}`,
  ];
  return { path, status, added: ops.filter((o) => o.t === '+').length, removed: ops.filter((o) => o.t === '-').length, patch: [...header, ...hunks].join('\n') };
}

function treeDiff(a: Record<string, string>, b: Record<string, string>, paths?: string[]): FileDiff[] {
  const all = [...new Set([...Object.keys(a), ...Object.keys(b)])].sort();
  const inScope = (p: string) => !paths?.length || paths.some((q) => p === q || p.startsWith(q.replace(/\/$/, '') + '/'));
  return all.filter(inScope).map((p) => fileDiff(p, a[p], b[p])).filter((d): d is FileDiff => !!d);
}

function statText(diffs: FileDiff[]): string {
  if (!diffs.length) return '';
  const w = Math.max(...diffs.map((d) => d.path.length));
  const rows = diffs.map((d) => ` ${d.path.padEnd(w)} | ${String(d.added + d.removed).padStart(3)} ${'+'.repeat(Math.min(d.added, 40))}${'-'.repeat(Math.min(d.removed, 40))}`);
  const ins = diffs.reduce((n, d) => n + d.added, 0);
  const del = diffs.reduce((n, d) => n + d.removed, 0);
  const summary = ` ${diffs.length} file${diffs.length > 1 ? 's' : ''} changed${ins ? `, ${ins} insertion${ins > 1 ? 's' : ''}(+)` : ''}${del ? `, ${del} deletion${del > 1 ? 's' : ''}(-)` : ''}`;
  return [...rows, summary].join('\n');
}

function commitDiffs(repo: Repo, c: Commit, paths?: string[]): FileDiff[] {
  const parent = c.parents[0] ? repo.commits.get(c.parents[0])!.snapshot : {};
  return treeDiff(parent, c.snapshot, paths);
}

/* ── ignore rules ── */

function ignored(repo: Repo, worktree: Record<string, string>, path: string): string | null {
  const gi = worktree['.gitignore'];
  if (!gi) return null;
  for (const raw of gi.split('\n')) {
    const pat = raw.trim();
    if (!pat || pat.startsWith('#') || pat.startsWith('!')) continue;
    const dirOnly = pat.endsWith('/');
    const core = pat.replace(/^\//, '').replace(/\/$/, '');
    const re = new RegExp('^' + core.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*\*/g, '\u0000').replace(/\*/g, '[^/]*').replace(/\?/g, '[^/]').replace(/\u0000/g, '.*') + (dirOnly ? '/' : '(/|$)'));
    const segments = path.split('/');
    const candidates = pat.includes('/') && !dirOnly ? [path] : segments.map((_, i) => segments.slice(i).join('/'));
    if (candidates.some((c) => re.test(c) || re.test(c + '/'))) return pat;
    void repo;
  }
  return null;
}

/* ── the command ── */

function findRepo(state: ShellState, cwd: string): Repo | null {
  const repos = state.git;
  if (!repos) return null;
  let best: Repo | null = null;
  for (const r of repos.values()) if ((cwd === r.path || cwd.startsWith(r.path + '/')) && (!best || r.path.length > best.path.length)) best = r;
  return best;
}

const NOT_REPO = 'fatal: not a git repository (or any of the parent directories): .git';

function relPath(repo: Repo, ctx: CmdCtx, p: string): string {
  const abs = resolvePath(ctx.state.cwd, p, ctx.state.home);
  return abs === repo.path ? '' : abs.startsWith(repo.path + '/') ? abs.slice(repo.path.length + 1) : p;
}

function formatCommit(repo: Repo, c: Commit, fmt: string, dateMode: string): string {
  return fmt.replace(/%(a[nedr]|c[ne]|[Hhsdb%])/g, (m, f: string) => {
    switch (f) {
      case 'H': return c.id;
      case 'h': return c.id.slice(0, 7);
      case 'an': case 'cn': return authorName(c.author);
      case 'ae': case 'ce': return authorEmail(c.author);
      case 'ad': return gitDate(c.date, dateMode);
      case 'ar': return relDate(repo.now, c.date);
      case 's': return subject(c.message);
      case 'b': return c.message.split('\n').slice(1).join('\n').trim();
      case 'd': return decorations(repo, c.id);
      case '%': return '%';
    }
    return m;
  });
}

function logHeader(repo: Repo, c: Commit, dateMode: string): string {
  return [`commit ${c.id}${decorations(repo, c.id)}`, ...(c.parents.length > 1 ? [`Merge: ${c.parents.map((p) => p.slice(0, 7)).join(' ')}`] : []), `Author: ${c.author}`, `Date:   ${gitDate(c.date, dateMode)}`, '', ...c.message.split('\n').map((l) => `    ${l}`)].join('\n');
}

function countOccurrences(s: string | undefined, needle: string): number {
  if (!s) return 0;
  return s.split(needle).length - 1;
}

function gitLog(repo: Repo, ctx: CmdCtx, args: string[]): CmdResult {
  let n = Infinity;
  let oneline = false;
  let all = false;
  let patch = false;
  let stat = false;
  let nameOnly = false;
  let nameStatus = false;
  let graph = false;
  let author: string | undefined;
  let grep: string | undefined;
  let pickaxe: string | undefined;
  let format: string | undefined;
  let dateMode = 'default';
  let filter: string | undefined;
  let icase = false;
  const revs: string[] = [];
  let paths: string[] = [];
  for (let i = 0; i < args.length; i++) {
    const a = args[i]!;
    if (a === '--') {
      paths = args.slice(i + 1).map((p) => relPath(repo, ctx, p));
      break;
    }
    if (a === '--oneline') oneline = true;
    else if (a === '--all') all = true;
    else if (a === '-p' || a === '--patch') patch = true;
    else if (a === '--stat') stat = true;
    else if (a === '--name-only') nameOnly = true;
    else if (a === '--name-status') nameStatus = true;
    else if (a === '--graph') graph = true;
    else if (a === '-i' || a === '--regexp-ignore-case') icase = true;
    else if (a === '-n') n = Number(args[++i]);
    else if (/^-\d+$/.test(a)) n = Number(a.slice(1));
    else if (/^-n\d+$/.test(a)) n = Number(a.slice(2));
    else if (a.startsWith('--max-count=')) n = Number(a.slice(12));
    else if (a.startsWith('--author=')) author = a.slice(9);
    else if (a === '--author') author = args[++i];
    else if (a.startsWith('--grep=')) grep = a.slice(7);
    else if (a === '--grep') grep = args[++i];
    else if (a.startsWith('-S')) pickaxe = a.length > 2 ? a.slice(2) : args[++i];
    else if (a.startsWith('--pretty=format:') || a.startsWith('--format=')) format = a.replace(/^--pretty=format:|^--format=/, '');
    else if (a === '--pretty=oneline') oneline = true;
    else if (a.startsWith('--date=')) dateMode = a.slice(7);
    else if (a.startsWith('--diff-filter=')) filter = a.slice(14);
    else if (a === '--decorate' || a === '--no-decorate' || a === '--abbrev-commit') continue;
    else if (a.startsWith('-')) return fail(`fatal: unrecognized argument: ${a}\n(simulyatorda: --oneline -n --all -p --stat --name-only --name-status --graph --author= --grep= -S --format= --date= --diff-filter= -- YO'L)`);
    else revs.push(a);
  }
  const tips = all ? [...repo.branches.values(), ...repo.tags.values(), ...repo.remoteBranches.values(), ...repo.stash.map((s) => s.base)] : revs.length ? revs.map((r) => resolveRev(repo, r)) : [headId(repo)];
  if (tips.some((t) => !t)) return fail(`fatal: ambiguous argument '${revs.find((r) => !resolveRev(repo, r))}': unknown revision or path not in the working tree.`);
  if (!headId(repo) && !all && !revs.length) return fail(`fatal: your current branch '${repo.head}' does not have any commits yet`);
  let list = reachable(repo, tips as string[]);
  if (author) list = list.filter((c) => c.author.toLowerCase().includes(author!.toLowerCase()));
  if (grep) list = list.filter((c) => (icase ? c.message.toLowerCase().includes(grep!.toLowerCase()) : c.message.includes(grep!)));
  if (pickaxe) {
    list = list.filter((c) => {
      const parent = c.parents[0] ? repo.commits.get(c.parents[0])!.snapshot : {};
      const files = new Set([...Object.keys(parent), ...Object.keys(c.snapshot)]);
      return [...files].some((f) => (!paths.length || paths.some((p) => f === p || f.startsWith(p + '/'))) && countOccurrences(parent[f], pickaxe!) !== countOccurrences(c.snapshot[f], pickaxe!));
    });
  }
  if (paths.length || filter) {
    list = list.filter((c) => {
      const diffs = commitDiffs(repo, c, paths.length ? paths : undefined);
      return diffs.length > 0 && (!filter || diffs.some((d) => filter!.includes(d.status)));
    });
  }
  list = list.slice(0, n);
  const out: string[] = [];
  for (const c of list) {
    let diffs = patch || stat || nameOnly || nameStatus ? commitDiffs(repo, c, paths.length ? paths : undefined) : [];
    if (filter) diffs = diffs.filter((d) => filter!.includes(d.status));
    const g = graph ? '* ' : '';
    if (format !== undefined) out.push(g + formatCommit(repo, c, format.replace(/\\t/g, '\t'), dateMode));
    else if (oneline) out.push(`${g}${c.id.slice(0, 7)}${decorations(repo, c.id)} ${subject(c.message)}`);
    else out.push(g + logHeader(repo, c, dateMode).split('\n').join('\n' + (graph ? '| ' : '')) + (diffs.length || patch ? '' : '\n'));
    if (nameOnly) out.push(diffs.map((d) => d.path).join('\n') + (oneline || format !== undefined ? '' : '\n'));
    if (nameStatus) out.push(diffs.map((d) => `${d.status}\t${d.path}`).join('\n') + (oneline || format !== undefined ? '' : '\n'));
    if (stat) out.push((oneline || format !== undefined ? '' : '\n') + statText(diffs) + '\n');
    if (patch) out.push((oneline || format !== undefined ? '' : '\n') + diffs.map((d) => d.patch).join('\n') + '\n');
  }
  return ok(out.join('\n').replace(/\n+$/, ''));
}

function gitShow(repo: Repo, _ctx: CmdCtx, args: string[]): CmdResult {
  const flags = new Set(args.filter((a) => a.startsWith('-')));
  const revArg = args.find((a) => !a.startsWith('-')) ?? 'HEAD';
  const colon = revArg.indexOf(':');
  if (colon >= 0) {
    const rev = revArg.slice(0, colon) || 'HEAD';
    const path = revArg.slice(colon + 1).replace(/^\.\//, '');
    const id = resolveRev(repo, rev);
    if (!id) return fail(`fatal: invalid object name '${rev}'.`);
    const snap = snapshotOf(repo, id);
    if (!(path in snap)) {
      const dir = Object.keys(snap).filter((p) => p.startsWith(path ? path + '/' : ''));
      if (dir.length) return ok(`tree ${revArg}\n\n${[...new Set(dir.map((p) => p.slice(path ? path.length + 1 : 0).split('/')[0]! + (p.slice(path ? path.length + 1 : 0).includes('/') ? '/' : '')))].sort().join('\n')}`);
      return fail(`fatal: path '${path}' does not exist in '${rev}'`);
    }
    return { out: snap[path]!.replace(/\n$/, ''), code: 0 };
  }
  const id = resolveRev(repo, revArg);
  if (!id) return fail(`fatal: ambiguous argument '${revArg}': unknown revision or path not in the working tree.`);
  const st = repo.stash.find((s) => s.id === id);
  if (st) {
    const diffs = treeDiff(repo.commits.get(st.base)!.snapshot, st.snapshot);
    return ok([`commit ${st.id}`, `Author: ${repo.user.name} <${repo.user.email}>`, `Date:   ${gitDate(st.date)}`, '', `    ${st.message}`, '', ...diffs.map((d) => d.patch)].join('\n'));
  }
  const c = repo.commits.get(id)!;
  const diffs = commitDiffs(repo, c);
  const head = logHeader(repo, c, 'default');
  if (flags.has('--stat')) return ok(`${head}\n\n${statText(diffs)}`);
  if (flags.has('--name-only')) return ok(`${head}\n\n${diffs.map((d) => d.path).join('\n')}`);
  if (flags.has('--name-status')) return ok(`${head}\n\n${diffs.map((d) => `${d.status}\t${d.path}`).join('\n')}`);
  return ok(`${head}\n\n${diffs.map((d) => d.patch).join('\n')}`.trimEnd());
}

function worktreeOf(repo: Repo, ctx: CmdCtx): Record<string, string> {
  return readTree(ctx.state.root, repo.path);
}

function gitDiff(repo: Repo, ctx: CmdCtx, args: string[]): CmdResult {
  const dash = args.indexOf('--');
  const paths = dash >= 0 ? args.slice(dash + 1).map((p) => relPath(repo, ctx, p)) : [];
  const opts = dash >= 0 ? args.slice(0, dash) : args;
  const flags = new Set(opts.filter((a) => a.startsWith('-')));
  const revs = opts.filter((a) => !a.startsWith('-'));
  const wt = worktreeOf(repo, ctx);
  const tracked = (snap: Record<string, string>) => Object.fromEntries(Object.entries(wt).filter(([p]) => p in snap || p in repo.index));
  let a: Record<string, string>;
  let b: Record<string, string>;
  const range = revs.length === 1 && revs[0]!.includes('..') ? revs[0]!.split(/\.\.\.?/) : null;
  const ids = (range ?? revs).map((r) => resolveRev(repo, r));
  if (ids.some((x) => !x)) return fail(`fatal: ambiguous argument '${(range ?? revs).find((r) => !resolveRev(repo, r))}': unknown revision or path not in the working tree.`);
  if (flags.has('--cached') || flags.has('--staged')) {
    a = ids[0] ? snapshotOf(repo, ids[0]) : snapshotOf(repo, headId(repo));
    b = repo.index;
  } else if (ids.length === 2) {
    a = snapshotOf(repo, ids[0]!);
    b = snapshotOf(repo, ids[1]!);
  } else if (ids.length === 1) {
    a = snapshotOf(repo, ids[0]!);
    b = tracked(a);
  } else {
    a = repo.index;
    b = tracked(repo.index);
  }
  const diffs = treeDiff(a, b, paths);
  if (flags.has('--stat')) return ok(statText(diffs));
  if (flags.has('--name-only')) return ok(diffs.map((d) => d.path).join('\n'));
  if (flags.has('--name-status')) return ok(diffs.map((d) => `${d.status}\t${d.path}`).join('\n'));
  return ok(diffs.map((d) => d.patch).join('\n'));
}

function gitStatus(repo: Repo, ctx: CmdCtx, args: string[]): CmdResult {
  const wt = worktreeOf(repo, ctx);
  const headSnap = headId(repo) ? snapshotOf(repo, headId(repo)) : {};
  const staged = treeDiff(headSnap, repo.index);
  const unstaged = treeDiff(repo.index, Object.fromEntries(Object.entries(wt).filter(([p]) => p in repo.index)));
  for (const p of Object.keys(repo.index)) if (!(p in wt) && !unstaged.some((d) => d.path === p)) unstaged.push({ path: p, status: 'D', added: 0, removed: 0, patch: '' });
  const untracked = Object.keys(wt).filter((p) => !(p in repo.index) && !ignored(repo, wt, p)).sort();
  // Untracked files are listed by their top directory, as git does.
  const untrackedShown = [...new Set(untracked.map((p) => (p.includes('/') && !Object.keys(repo.index).some((q) => q.startsWith(p.split('/')[0]! + '/')) ? p.split('/')[0]! + '/' : p)))];
  if (args.includes('-s') || args.includes('--short') || args.includes('--porcelain')) {
    const rows = new Map<string, [string, string]>();
    for (const d of staged) rows.set(d.path, [d.status, ' ']);
    for (const d of unstaged) rows.set(d.path, [rows.get(d.path)?.[0] ?? ' ', d.status]);
    return ok([...[...rows].sort().map(([p, [x, y]]) => `${x}${y} ${p}`), ...untrackedShown.map((p) => `?? ${p}`)].join('\n'));
  }
  const out = [`On branch ${repo.head}`];
  const tracking = repo.remoteBranches.get(`origin/${repo.head}`);
  if (tracking) {
    const ahead = reachable(repo, [headId(repo)]).filter((c) => !reachable(repo, [tracking]).some((x) => x.id === c.id)).length;
    out.push(ahead ? `Your branch is ahead of 'origin/${repo.head}' by ${ahead} commit${ahead > 1 ? 's' : ''}.\n  (use "git push" to publish your local commits)` : `Your branch is up to date with 'origin/${repo.head}'.`);
  }
  const word = { A: 'new file:   ', M: 'modified:   ', D: 'deleted:    ' };
  if (staged.length) out.push('', 'Changes to be committed:', '  (use "git restore --staged <file>..." to unstage)', ...staged.map((d) => `\t${word[d.status]}${d.path}`));
  if (unstaged.length) out.push('', 'Changes not staged for commit:', '  (use "git add <file>..." to update what will be committed)', '  (use "git restore <file>..." to discard changes in working directory)', ...unstaged.map((d) => `\t${word[d.status]}${d.path}`));
  if (untrackedShown.length) out.push('', 'Untracked files:', '  (use "git add <file>..." to include in what will be committed)', ...untrackedShown.map((p) => `\t${p}`));
  if (!staged.length && !unstaged.length && !untrackedShown.length) out.push('', 'nothing to commit, working tree clean');
  else if (!staged.length) out.push('', unstaged.length ? 'no changes added to commit (use "git add" and/or "git commit -a")' : 'nothing added to commit but untracked files present (use "git add" to track)');
  return ok(out.join('\n'));
}

function matchPaths(all: string[], specs: string[]): string[] {
  return all.filter((p) => specs.some((s) => s === '.' || s === '' || p === s || p.startsWith(s.replace(/\/$/, '') + '/') || (s.includes('*') && new RegExp('^' + s.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*') + '$').test(p))));
}

function gitAdd(repo: Repo, ctx: CmdCtx, args: string[]): CmdResult {
  const force = args.includes('-f') || args.includes('--force');
  const specs = args.filter((a) => !a.startsWith('-')).map((p) => relPath(repo, ctx, p));
  if (args.includes('-A') || args.includes('--all')) specs.push('.');
  if (!specs.length) return fail('Nothing specified, nothing added.\nhint: Maybe you wanted to say \'git add .\'?');
  const wt = worktreeOf(repo, ctx);
  const candidates = [...new Set([...Object.keys(wt), ...Object.keys(repo.index)])];
  const hits = matchPaths(candidates, specs);
  const explicitIgnored = specs.filter((s) => s !== '.' && s in wt && !(s in repo.index) && ignored(repo, wt, s));
  if (explicitIgnored.length && !force) {
    return fail(`The following paths are ignored by one of your .gitignore files:\n${explicitIgnored.join('\n')}\nhint: Use -f if you really want to add them.`);
  }
  if (!hits.length) return fail(`fatal: pathspec '${specs[0]}' did not match any files`);
  for (const p of hits) {
    if (!(p in repo.index) && !force && ignored(repo, wt, p)) continue;
    if (p in wt) repo.index[p] = wt[p]!;
    else delete repo.index[p];
  }
  return ok('');
}

function gitRm(repo: Repo, ctx: CmdCtx, args: string[]): CmdResult {
  const cached = args.includes('--cached');
  const recursive = args.includes('-r');
  const specs = args.filter((a) => !a.startsWith('-')).map((p) => relPath(repo, ctx, p));
  const out: string[] = [];
  for (const s of specs) {
    const hits = Object.keys(repo.index).filter((p) => p === s || (recursive && p.startsWith(s.replace(/\/$/, '') + '/')));
    if (!hits.length) return fail(`fatal: pathspec '${s}' did not match any files`);
    if (!recursive && hits.length === 1 && hits[0] !== s) return fail(`fatal: not removing '${s}' recursively without -r`);
    for (const p of hits) {
      delete repo.index[p];
      if (!cached) setFile(ctx.state.root, `${repo.path}/${p}`, null);
      out.push(`rm '${p}'`);
    }
  }
  return ok(out.join('\n'));
}

function gitCommit(repo: Repo, ctx: CmdCtx, args: string[]): CmdResult {
  let msg: string | undefined;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '-m' || args[i] === '--message') msg = args[++i];
    else if (/^-am$/.test(args[i]!)) {
      args.push('-a');
      msg = args[++i];
    }
  }
  if (args.includes('-a') || args.includes('--all')) {
    const wt = worktreeOf(repo, ctx);
    for (const p of Object.keys(repo.index)) {
      if (p in wt) repo.index[p] = wt[p]!;
      else delete repo.index[p];
    }
  }
  if (msg === undefined) return fail('Bu simulyatorda matn muharriri ochilmaydi: git commit -m "xabar"');
  const parent = headId(repo);
  const parentSnap = parent ? snapshotOf(repo, parent) : {};
  const diffs = treeDiff(parentSnap, repo.index);
  if (!diffs.length) return { out: `On branch ${repo.head}\nnothing to commit, working tree clean`, code: 1 };
  const date = repo.now + ctx.state.history.length * 1000;
  const author = `${repo.user.name} <${repo.user.email}>`;
  const id = commitId(`${parent}|${author}|${date}|${msg}|${JSON.stringify(repo.index)}`);
  repo.commits.set(id, { id, parents: parent ? [parent] : [], author, date, message: msg, snapshot: { ...repo.index } });
  repo.order.push(id);
  repo.branches.set(repo.head, id);
  repo.reflog.unshift({ id, action: `commit: ${subject(msg)}` });
  const created = diffs.filter((d) => d.status === 'A').map((d) => ` create mode 100644 ${d.path}`);
  const deleted = diffs.filter((d) => d.status === 'D').map((d) => ` delete mode 100644 ${d.path}`);
  return ok([`[${repo.head} ${id.slice(0, 7)}] ${subject(msg)}`, statText(diffs).split('\n').pop()!, ...created, ...deleted].join('\n'));
}

function checkoutTo(repo: Repo, ctx: CmdCtx, target: string, label: string): CmdResult | null {
  const wt = worktreeOf(repo, ctx);
  const dirty = treeDiff(repo.index, Object.fromEntries(Object.entries(wt).filter(([p]) => p in repo.index)));
  const staged = treeDiff(snapshotOf(repo, headId(repo)), repo.index);
  const snap = snapshotOf(repo, target);
  const conflicts = [...dirty, ...staged].filter((d) => snap[d.path] !== snapshotOf(repo, headId(repo))[d.path]).map((d) => d.path);
  if (conflicts.length) return fail(`error: Your local changes to the following files would be overwritten by checkout:\n\t${conflicts.join('\n\t')}\nPlease commit your changes or stash them before you switch branches.\nAborting`);
  // Only files that differ between the two commits change; local edits to other files come along, as in git.
  const cur = snapshotOf(repo, headId(repo));
  for (const p of new Set([...Object.keys(cur), ...Object.keys(snap)])) {
    if (cur[p] === snap[p]) continue;
    setFile(ctx.state.root, `${repo.path}/${p}`, snap[p] ?? null);
    if (p in snap) repo.index[p] = snap[p]!;
    else delete repo.index[p];
  }
  const node = getNode(ctx.state.root, repo.path);
  if (node?.type === 'dir') removeEmptyDirs(node);
  void label;
  return null;
}

function gitCheckout(repo: Repo, ctx: CmdCtx, args: string[], isSwitch: boolean): CmdResult {
  const dash = args.indexOf('--');
  if (!isSwitch && dash >= 0) {
    // git checkout [REV] -- PATH: restore files.
    const rev = args.slice(0, dash).find((a) => !a.startsWith('-'));
    const id = rev ? resolveRev(repo, rev) : null;
    const source = id ? snapshotOf(repo, id) : repo.index;
    for (const p of args.slice(dash + 1).map((x) => relPath(repo, ctx, x))) {
      if (!(p in source)) return fail(`error: pathspec '${p}' did not match any file(s) known to git`);
      setFile(ctx.state.root, `${repo.path}/${p}`, source[p]!);
      if (id) repo.index[p] = source[p]!;
    }
    return ok(`Updated ${args.length - dash - 1} path${args.length - dash - 1 > 1 ? 's' : ''} from ${id ? 'the index' : 'the index'}`);
  }
  const create = args.includes('-b') || args.includes('-c');
  const name = args.filter((a) => !a.startsWith('-'))[0];
  if (!name) return fail(isSwitch ? 'fatal: missing branch or commit argument' : 'error: pathspec did not match');
  const prev = repo.head;
  if (create) {
    if (repo.branches.has(name)) return fail(`fatal: a branch named '${name}' already exists`);
    repo.branches.set(name, headId(repo));
    repo.head = name;
    repo.reflog.unshift({ id: headId(repo), action: `checkout: moving from ${prev} to ${name}` });
    return ok(`Switched to a new branch '${name}'`);
  }
  if (repo.branches.has(name)) {
    if (name === repo.head) return ok(`Already on '${name}'`);
    const err = checkoutTo(repo, ctx, repo.branches.get(name)!, name);
    if (err) return err;
    repo.head = name;
    repo.reflog.unshift({ id: headId(repo), action: `checkout: moving from ${prev} to ${name}` });
    return ok(`Switched to branch '${name}'`);
  }
  const remote = [...repo.remoteBranches.keys()].find((r) => r.endsWith('/' + name));
  if (remote) {
    const err = checkoutTo(repo, ctx, repo.remoteBranches.get(remote)!, name);
    if (err) return err;
    repo.branches.set(name, repo.remoteBranches.get(remote)!);
    repo.head = name;
    return ok(`branch '${name}' set up to track '${remote}'.\nSwitched to a new branch '${name}'`);
  }
  if (isSwitch) return fail(`fatal: invalid reference: ${name}`);
  const id = resolveRev(repo, name);
  if (!id) return fail(`error: pathspec '${name}' did not match any file(s) known to git`);
  const err = checkoutTo(repo, ctx, id, name);
  if (err) return err;
  repo.head = id;
  return ok(`Note: switching to '${name}'.\n\nYou are in 'detached HEAD' state. You can look around, make experimental\nchanges and commit them, and you can discard any commits you make in this\nstate without impacting any branches by switching back to a branch.\n\nHEAD is now at ${id.slice(0, 7)} ${subject(repo.commits.get(id)!.message)}`);
}

function gitRestore(repo: Repo, ctx: CmdCtx, args: string[]): CmdResult {
  const staged = args.includes('--staged') || args.includes('-S');
  const paths = args.filter((a) => !a.startsWith('-')).map((p) => relPath(repo, ctx, p));
  const headSnap = snapshotOf(repo, headId(repo));
  for (const p of paths) {
    if (staged) {
      if (p in headSnap) repo.index[p] = headSnap[p]!;
      else delete repo.index[p];
    } else {
      if (!(p in repo.index)) return fail(`error: pathspec '${p}' did not match any file(s) known to git`);
      setFile(ctx.state.root, `${repo.path}/${p}`, repo.index[p]!);
    }
  }
  return ok('');
}

function gitBlame(repo: Repo, ctx: CmdCtx, args: string[]): CmdResult {
  const lIdx = args.indexOf('-L');
  let range: [number, number] | null = null;
  if (lIdx >= 0) {
    const m = /^(\d+),(\d+)$/.exec(args[lIdx + 1] ?? '');
    if (!m) return fail('fatal: -L: bu simulyatorda faqat -L BOSH,OXIR (masalan -L 10,20)');
    range = [Number(m[1]), Number(m[2])];
  }
  const file = args.filter((a, i) => !a.startsWith('-') && args[i - 1] !== '-L').pop();
  if (!file) return fail('usage: git blame [<options>] [<rev-opts>] [<rev>] [--] <file>');
  const path = relPath(repo, ctx, file);
  const chain = firstParentChain(repo, headId(repo)).reverse();
  let owners: { id: string; line: string }[] = [];
  let prev: string[] = [];
  for (const id of chain) {
    const content = repo.commits.get(id)!.snapshot[path];
    const cur = lines(content);
    if (content === undefined) {
      owners = [];
      prev = [];
      continue;
    }
    const pairs = new Map(lcsMatch(prev, cur).map(([a, b]) => [b, a]));
    owners = cur.map((line, j) => (pairs.has(j) ? owners[pairs.get(j)!]! : { id, line }));
    prev = cur;
  }
  if (!owners.length) return fail(`fatal: no such path '${path}' in HEAD`);
  const w = String(owners.length).length;
  const nameW = Math.max(...owners.map((o) => authorName(repo.commits.get(o.id)!.author).length));
  const rows = owners.map((o, i) => {
    const c = repo.commits.get(o.id)!;
    return `${c.id.slice(0, 8)} (${authorName(c.author).padEnd(nameW)} ${gitDate(c.date, 'iso')} ${String(i + 1).padStart(w)}) ${o.line}`;
  });
  return ok((range ? rows.slice(range[0] - 1, range[1]) : rows).join('\n'));
}

function gitGrep(repo: Repo, ctx: CmdCtx, args: string[]): CmdResult {
  const flags = new Set<string>();
  const rest: string[] = [];
  let paths: string[] = [];
  for (let i = 0; i < args.length; i++) {
    const a = args[i]!;
    if (a === '--') {
      paths = args.slice(i + 1).map((p) => relPath(repo, ctx, p));
      break;
    }
    if (a === '-e') rest.unshift(args[++i]!);
    else if (/^-[a-zA-Z]+$/.test(a)) for (const ch of a.slice(1)) flags.add(ch);
    else rest.push(a);
  }
  const [pattern, ...revs] = rest;
  if (!pattern) return fail('usage: git grep [<options>] [-e] <pattern> [<rev>...] [[--] <path>...]');
  const re = new RegExp(flags.has('F') ? pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') : pattern, flags.has('i') ? 'i' : '');
  const sources: [string, Record<string, string>][] = revs.length
    ? revs.map((r) => {
        const id = resolveRev(repo, r);
        if (!id) throw new Error(`fatal: unable to resolve revision: ${r}`);
        return [`${r}:`, snapshotOf(repo, id)];
      })
    : [['', Object.fromEntries(Object.entries(worktreeOf(repo, ctx)).filter(([p]) => p in repo.index))]];
  const out: string[] = [];
  for (const [prefix, snap] of sources) {
    for (const p of Object.keys(snap).sort()) {
      if (paths.length && !paths.some((q) => p === q || p.startsWith(q.replace(/\/$/, '') + '/'))) continue;
      const ls = lines(snap[p]);
      if (flags.has('l')) {
        if (ls.some((l) => re.test(l))) out.push(prefix + p);
        continue;
      }
      if (flags.has('c')) {
        const n = ls.filter((l) => re.test(l)).length;
        if (n) out.push(`${prefix}${p}:${n}`);
        continue;
      }
      ls.forEach((l, i) => {
        if (re.test(l)) out.push(`${prefix}${p}:${flags.has('n') ? `${i + 1}:` : ''}${l}`);
      });
    }
  }
  return { out: out.join('\n'), code: out.length ? 0 : 1 };
}

function gitBranch(repo: Repo, args: string[]): CmdResult {
  const all = args.includes('-a') || args.includes('--all');
  const remote = args.includes('-r');
  const verbose = args.includes('-v') || args.includes('-vv');
  const del = args.includes('-d') || args.includes('-D');
  const name = args.find((a) => !a.startsWith('-'));
  if (del) {
    if (!name || !repo.branches.has(name)) return fail(`error: branch '${name ?? ''}' not found.`);
    if (name === repo.head) return fail(`error: Cannot delete branch '${name}' checked out at '${repo.path}'`);
    const id = repo.branches.get(name)!;
    repo.branches.delete(name);
    return ok(`Deleted branch ${name} (was ${id.slice(0, 7)}).`);
  }
  if (name) {
    if (repo.branches.has(name)) return fail(`fatal: a branch named '${name}' already exists`);
    repo.branches.set(name, headId(repo));
    return ok('');
  }
  const row = (label: string, id: string, current: boolean) => `${current ? '* ' : '  '}${label}${verbose ? ` ${id.slice(0, 7)} ${subject(repo.commits.get(id)!.message)}` : ''}`;
  const out: string[] = [];
  if (!remote) for (const [b, id] of [...repo.branches].sort()) out.push(row(b, id, b === repo.head));
  if (all || remote) for (const [b, id] of [...repo.remoteBranches].sort()) out.push(row(all ? `remotes/${b}` : b, id, false));
  if (verbose) {
    const w = Math.max(...out.map((l) => l.split(' ')[1]!.length));
    return ok(out.map((l) => l.replace(/^(\* | {2})(\S+)/, (_m, p: string, n: string) => p + n.padEnd(w))).join('\n'));
  }
  return ok(out.join('\n'));
}

/* ── filter-repo ── */

function filterRepo(repo: Repo, ctx: CmdCtx, args: string[]): CmdResult {
  const paths: string[] = [];
  let invert = false;
  let replaceFile: string | undefined;
  const force = args.includes('--force');
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--path') paths.push(args[++i]!);
    else if (args[i] === '--invert-paths') invert = true;
    else if (args[i] === '--replace-text') replaceFile = args[++i];
  }
  if (!paths.length && !replaceFile) return fail("Ishlatilishi: git filter-repo --path FAYL --invert-paths [--force]  |  git filter-repo --replace-text QOIDALAR.txt [--force]");
  if (!force) return fail('Aborting: Refusing to destructively overwrite repo history since\nthis does not look like a fresh clone.\n  (expected freshly packed repo)\nPlease operate on a fresh clone instead.  If you want to proceed\nanyway, use --force.');
  let replacements: [string | RegExp, string][] = [];
  if (replaceFile) {
    const node = getNode(ctx.state.root, resolvePath(ctx.state.cwd, replaceFile, ctx.state.home));
    if (!node || node.type !== 'file') return fail(`Error: Cannot read ${replaceFile}`);
    replacements = node.content.split('\n').filter((l) => l.trim()).map((l) => {
      const [lhs, rhs = '***REMOVED***'] = l.split('==>');
      if (lhs!.startsWith('regex:')) return [new RegExp(lhs!.slice(6), 'g'), rhs];
      return [lhs!.replace(/^literal:/, ''), rhs];
    });
  }
  const apply = (snap: Record<string, string>): Record<string, string> => {
    const out: Record<string, string> = {};
    for (const [p, v] of Object.entries(snap)) {
      const hit = paths.some((q) => p === q || p.startsWith(q.replace(/\/$/, '') + '/'));
      if (paths.length && (invert ? hit : !hit)) continue;
      let content = v;
      for (const [from, to] of replacements) content = typeof from === 'string' ? content.split(from).join(to) : content.replace(from, to);
      out[p] = content;
    }
    return out;
  };
  const mapping = new Map<string, string>();
  const newCommits = new Map<string, Commit>();
  const newOrder: string[] = [];
  let parsed = 0;
  for (const oldId of repo.order) {
    const c = repo.commits.get(oldId)!;
    if (c.orphan) continue;
    parsed++;
    const parents = c.parents.map((p) => mapping.get(p)).filter((p): p is string => !!p);
    const snapshot = apply(c.snapshot);
    const parentSnap = parents[0] ? newCommits.get(parents[0])!.snapshot : {};
    // Commits that become empty are pruned, like filter-repo does.
    if (parents.length <= 1 && JSON.stringify(parentSnap) === JSON.stringify(snapshot) && parents.length) {
      mapping.set(oldId, parents[0]!);
      continue;
    }
    const id = commitId(`rewritten|${parents.join(',')}|${c.author}|${c.date}|${c.message}|${JSON.stringify(snapshot)}`);
    newCommits.set(id, { ...c, id, parents, snapshot });
    newOrder.push(id);
    mapping.set(oldId, id);
  }
  repo.commits = newCommits;
  repo.order = newOrder;
  for (const [b, id] of repo.branches) repo.branches.set(b, mapping.get(id) ?? id);
  for (const [t, id] of repo.tags) repo.tags.set(t, mapping.get(id) ?? id);
  repo.remoteBranches.clear();
  repo.remotes.clear();
  repo.reflog = [];
  repo.stash = [];
  const headSnap = snapshotOf(repo, headId(repo));
  for (const p of Object.keys(repo.index)) if (!(p in headSnap)) setFile(ctx.state.root, `${repo.path}/${p}`, null);
  writeTree(ctx.state.root, repo.path, headSnap);
  repo.index = { ...headSnap };
  return ok(`Parsed ${parsed} commits\nNew history written in 0.04 seconds; now repacking/cleaning...\nRepacking your repo and cleaning out old unneeded objects\nHEAD is now at ${headId(repo).slice(0, 7)} ${subject(repo.commits.get(headId(repo))!.message)}\nEnumerating objects: ${parsed * 4}, done.\nCompletely finished after 0.21 seconds.`);
}

/* ── git ── */

export const git: Command = (args, ctx) => {
  const [sub, ...rest] = args;
  if (sub === undefined || sub === '--help' || sub === 'help') {
    return ok('usage: git <command> [<args>]\n\nSimulyatordagi buyruqlar: status, log, show, diff, add, rm, commit, restore, checkout, switch, branch, blame, grep, tag, remote, reflog, stash, config, cat-file, filter-repo\nBatafsil: man git');
  }
  if (sub === 'version' || sub === '--version') return ok('git version 2.47.1');
  if (sub === 'clone' || sub === 'push' || sub === 'pull' || sub === 'fetch') return fail(`fatal: bu simulyatorda tarmoq yo'q (git ${sub} ishlamaydi): repozitoriy allaqachon klonlangan`);
  const repo = findRepo(ctx.state, ctx.state.cwd);
  if (sub === 'init') return ok(`Initialized empty Git repository in ${ctx.state.cwd}/.git/`);
  if (!repo) return fail(NOT_REPO);
  try {
    switch (sub) {
      case 'status':
        return gitStatus(repo, ctx, rest);
      case 'log':
        return gitLog(repo, ctx, rest);
      case 'show':
        return gitShow(repo, ctx, rest);
      case 'diff':
        return gitDiff(repo, ctx, rest);
      case 'add':
        return gitAdd(repo, ctx, rest);
      case 'rm':
        return gitRm(repo, ctx, rest);
      case 'commit':
        return gitCommit(repo, ctx, rest);
      case 'restore':
        return gitRestore(repo, ctx, rest);
      case 'checkout':
        return gitCheckout(repo, ctx, rest, false);
      case 'switch':
        return gitCheckout(repo, ctx, rest, true);
      case 'branch':
        return gitBranch(repo, rest);
      case 'blame':
        return gitBlame(repo, ctx, rest);
      case 'grep':
        return gitGrep(repo, ctx, rest);
      case 'tag':
        if (rest.length && !rest[0]!.startsWith('-')) {
          repo.tags.set(rest[0]!, resolveRev(repo, rest[1] ?? 'HEAD')!);
          return ok('');
        }
        return ok([...repo.tags.keys()].sort().join('\n'));
      case 'remote':
        if (rest.includes('-v')) return ok([...repo.remotes].flatMap(([n, u]) => [`${n}\t${u} (fetch)`, `${n}\t${u} (push)`]).join('\n'));
        return ok([...repo.remotes.keys()].join('\n'));
      case 'reflog':
        return ok(repo.reflog.map((r, i) => `${r.id.slice(0, 7)} HEAD@{${i}}: ${r.action}`).join('\n'));
      case 'stash':
        if (!rest.length || rest[0] === 'list') return ok(repo.stash.map((s, i) => `stash@{${i}}: On ${repo.head}: ${s.message}`).join('\n'));
        if (rest[0] === 'show') {
          const n = Number(/\d+/.exec(rest.find((a) => a.startsWith('stash@')) ?? '0')?.[0] ?? 0);
          const st = repo.stash[n];
          if (!st) return fail(`error: stash@{${n}} is not a valid reference`);
          const diffs = treeDiff(repo.commits.get(st.base)!.snapshot, st.snapshot);
          return ok(rest.includes('-p') ? diffs.map((d) => d.patch).join('\n') : statText(diffs));
        }
        return fail('Bu simulyatorda: git stash list | git stash show [-p] stash@{N}');
      case 'config': {
        const key = rest.filter((a) => !a.startsWith('-'))[0];
        if (rest.includes('-l') || rest.includes('--list')) return ok(`user.name=${repo.user.name}\nuser.email=${repo.user.email}\ncore.repositoryformatversion=0\n${[...repo.remotes].map(([n, u]) => `remote.${n}.url=${u}`).join('\n')}`);
        if (key === 'user.name') return ok(repo.user.name);
        if (key === 'user.email') return ok(repo.user.email);
        return { out: '', code: 1 };
      }
      case 'cat-file': {
        const rev = rest.find((a) => !a.startsWith('-'));
        const id = rev ? resolveRev(repo, rev) : null;
        if (!id) return fail(`fatal: Not a valid object name ${rev ?? ''}`);
        if (rest.includes('-t')) return ok('commit');
        const c = repo.commits.get(id)!;
        const ts = `${Math.floor(c.date / 1000)} +0500`;
        return ok([`tree ${sha256Hex(JSON.stringify(c.snapshot)).slice(0, 40)}`, ...c.parents.map((p) => `parent ${p}`), `author ${c.author} ${ts}`, `committer ${c.author} ${ts}`, '', c.message].join('\n'));
      }
      case 'check-ignore': {
        const wt = worktreeOf(repo, ctx);
        const out: string[] = [];
        for (const p of rest.filter((a) => !a.startsWith('-'))) {
          const rel = relPath(repo, ctx, p);
          const rule = ignored(repo, wt, rel);
          if (rule) out.push(rest.includes('-v') ? `.gitignore:${(wt['.gitignore'] ?? '').split('\n').findIndex((l) => l.trim() === rule) + 1}:${rule}\t${p}` : p);
        }
        return { out: out.join('\n'), code: out.length ? 0 : 1 };
      }
      case 'filter-repo':
        return filterRepo(repo, ctx, rest);
      case 'rev-list':
        if (rest.includes('--all')) {
          const list = reachable(repo, [...repo.branches.values(), ...repo.tags.values()]);
          return ok(rest.includes('--count') ? String(list.length) : list.map((c) => c.id).join('\n'));
        }
        return fail('Bu simulyatorda: git rev-list --all [--count]');
      default:
        return fail(`git: '${sub}' is not a git command. See 'git --help'.`);
    }
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('fatal:')) return fail(e.message);
    throw e;
  }
};

/** For gitleaks: every commit reachable from refs (branches, tags, stash), with its added lines per file. */
export function historyForScan(repo: Repo): { commit: Commit; file: string; line: number; text: string }[] {
  const tips = [...repo.branches.values(), ...repo.tags.values(), ...repo.stash.map((s) => s.base)];
  const out: { commit: Commit; file: string; line: number; text: string }[] = [];
  const stashCommits: Commit[] = repo.stash.map((s) => ({ id: s.id, parents: [s.base], author: `${repo.user.name} <${repo.user.email}>`, date: s.date, message: `On ${repo.head}: ${s.message}`, snapshot: s.snapshot }));
  for (const c of [...reachable(repo, tips), ...stashCommits]) {
    const parent = c.parents[0] ? snapshotOf(repo, c.parents[0]) : {};
    for (const [file, content] of Object.entries(c.snapshot)) {
      if (parent[file] === content) continue;
      const before = lines(parent[file]);
      const after = lines(content);
      const kept = new Set(lcsMatch(before, after).map(([, j]) => j));
      after.forEach((text, j) => {
        if (!kept.has(j)) out.push({ commit: c, file, line: j + 1, text });
      });
    }
  }
  return out;
}

export { findRepo };
