/** In-memory file system for the terminal simulator. */

export interface FsFile {
  type: 'file';
  content: string;
  mode: number;
  owner: string;
  /** Last modification, ms since epoch; unset means the lab's base date (see mtimeOf). */
  mtime?: number;
  /** Symbolic link target (ln -s). Reading the link reads the target. */
  link?: string;
}

export interface FsDir {
  type: 'dir';
  children: Record<string, FsNode>;
  mode: number;
  owner: string;
  mtime?: number;
}

/** The date every lab file has unless the lab says otherwise: 16 Nov 2026, 09:00 UTC. */
export const BASE_TIME = Date.UTC(2026, 10, 16, 9, 0, 0);

export function mtimeOf(node: FsNode): number {
  return node.mtime ?? BASE_TIME;
}

export type FsNode = FsFile | FsDir;

/**
 * Compact tree description used by labs:
 *   { home: { ali: { 'notes.txt': 'salom' } }, etc: { shadow: file('...', 0o600) } }
 * A string is a file, a plain object is a directory.
 */
export type FsSpec = { [name: string]: FsSpecEntry };
export type FsSpecEntry =
  | string
  | FsSpec
  | { $file: string; mode?: number; owner?: string; mtime?: number }
  | { $dir: FsSpec; mode?: number; owner?: string };

export function file(content: string, mode = 0o644, owner?: string, mtime?: number): FsSpecEntry {
  return { $file: content, mode, owner, mtime };
}

export function dir(children: FsSpec, mode = 0o755, owner?: string): FsSpecEntry {
  return { $dir: children, mode, owner };
}

function isFileSpec(e: FsSpecEntry): e is { $file: string; mode?: number; owner?: string; mtime?: number } {
  return typeof e === 'object' && '$file' in e && typeof e.$file === 'string';
}

function isDirSpec(e: FsSpecEntry): e is { $dir: FsSpec; mode?: number; owner?: string } {
  return typeof e === 'object' && '$dir' in e && typeof e.$dir === 'object';
}

export function buildFs(spec: FsSpec, owner = 'root', mode = 0o755): FsDir {
  const children: Record<string, FsNode> = {};
  for (const [name, entry] of Object.entries(spec)) {
    if (typeof entry === 'string') {
      children[name] = { type: 'file', content: entry, mode: 0o644, owner };
    } else if (isFileSpec(entry)) {
      children[name] = {
        type: 'file',
        content: entry.$file,
        mode: entry.mode ?? 0o644,
        owner: entry.owner ?? owner,
        ...(entry.mtime !== undefined ? { mtime: entry.mtime } : {}),
      };
    } else if (isDirSpec(entry)) {
      children[name] = buildFs(entry.$dir, entry.owner ?? owner, entry.mode ?? 0o755);
    } else {
      children[name] = buildFs(entry, owner);
    }
  }
  return { type: 'dir', children, mode, owner };
}

/** Make every node under `path` belong to `owner` (used for the home directory). */
export function chownTree(node: FsNode, owner: string): void {
  node.owner = owner;
  if (node.type === 'dir') for (const child of Object.values(node.children)) chownTree(child, owner);
}

/** Absolute, normalised path ("/a/b"); understands ~, . and .. */
export function resolvePath(cwd: string, path: string, home: string): string {
  let p = path;
  if (p === '~') p = home;
  else if (p.startsWith('~/')) p = home + p.slice(1);
  if (!p.startsWith('/')) p = (cwd === '/' ? '' : cwd) + '/' + p;
  const out: string[] = [];
  for (const part of p.split('/')) {
    if (!part || part === '.') continue;
    if (part === '..') out.pop();
    else out.push(part);
  }
  return '/' + out.join('/');
}

export function getNode(root: FsDir, abs: string): FsNode | null {
  let node: FsNode = root;
  for (const part of abs.split('/')) {
    if (!part) continue;
    if (node.type !== 'dir') return null;
    const next: FsNode | undefined = node.children[part];
    if (!next) return null;
    node = next;
  }
  return node;
}

export function dirname(abs: string): string {
  const i = abs.lastIndexOf('/');
  return i <= 0 ? '/' : abs.slice(0, i);
}

export function basename(abs: string): string {
  return abs.slice(abs.lastIndexOf('/') + 1);
}

export type Access = 'r' | 'w' | 'x';

/** Simplified UNIX check: root may do anything; owner bits, otherwise "other" bits. */
export function canAccess(node: FsNode, user: string, access: Access): boolean {
  if (user === 'root') return true;
  const shift = node.owner === user ? 6 : 0;
  const bit = access === 'r' ? 4 : access === 'w' ? 2 : 1;
  return ((node.mode >> shift) & bit) !== 0;
}

export function modeString(node: FsNode): string {
  const bits = 'rwxrwxrwx';
  const chars = [...bits].map((b, i) => (node.mode & (1 << (8 - i)) ? b : '-'));
  // setuid / setgid / sticky replace the matching x: s or S, s or S, t or T.
  const special: [number, number, string][] = [
    [0o4000, 2, 's'],
    [0o2000, 5, 's'],
    [0o1000, 8, 't'],
  ];
  for (const [bit, pos, ch] of special) {
    if (node.mode & bit) chars[pos] = chars[pos] === 'x' ? ch : ch.toUpperCase();
  }
  if (node.type === 'file' && node.link !== undefined) return 'lrwxrwxrwx';
  return (node.type === 'dir' ? 'd' : '-') + chars.join('');
}

export function cloneNode<T extends FsNode>(node: T): T {
  if (node.type === 'file') return { ...node };
  const children: Record<string, FsNode> = {};
  for (const [name, child] of Object.entries(node.children)) children[name] = cloneNode(child);
  return { ...node, children };
}

/** Every path under `abs` (inclusive), depth-first, sorted by name. */
export function walk(root: FsDir, abs: string): { path: string; node: FsNode }[] {
  const start = getNode(root, abs);
  if (!start) return [];
  const out: { path: string; node: FsNode }[] = [];
  const visit = (path: string, node: FsNode) => {
    out.push({ path, node });
    if (node.type === 'dir') {
      for (const name of Object.keys(node.children).sort()) {
        visit((path === '/' ? '' : path) + '/' + name, node.children[name]!);
      }
    }
  };
  visit(abs, start);
  return out;
}
