/* File access shared by the detection tools (sigma, suricata, zeek, yara): read, write, list, with real errors. */

import { basename, canAccess, dirname, getNode, resolvePath, walk, type FsNode } from './fs';
import type { CmdCtx } from './shell';

export type Read = { ok: true; text: string; abs: string } | { ok: false; error: string };

export function readText(ctx: CmdCtx, path: string, tool: string): Read {
  const abs = resolvePath(ctx.state.cwd, path, ctx.state.home);
  const node = getNode(ctx.state.root, abs);
  if (!node) return { ok: false, error: `${tool}: ${path}: No such file or directory` };
  if (node.type === 'dir') return { ok: false, error: `${tool}: ${path}: Is a directory` };
  if (!canAccess(node, ctx.user, 'r')) return { ok: false, error: `${tool}: ${path}: Permission denied` };
  return { ok: true, text: node.content, abs };
}

export function nodeAt(ctx: CmdCtx, path: string): { abs: string; node: FsNode | null } {
  const abs = resolvePath(ctx.state.cwd, path, ctx.state.home);
  return { abs, node: getNode(ctx.state.root, abs) };
}

/** Writes (creates or replaces) a file; the parent directory must exist. Returns an error text or null. */
export function writeText(ctx: CmdCtx, path: string, content: string, append = false): string | null {
  const abs = resolvePath(ctx.state.cwd, path, ctx.state.home);
  const parent = getNode(ctx.state.root, dirname(abs));
  if (!parent || parent.type !== 'dir') return `${path}: No such file or directory`;
  if (!canAccess(parent, ctx.user, 'w')) return `${path}: Permission denied`;
  const name = basename(abs);
  const old = parent.children[name];
  if (old && old.type === 'dir') return `${path}: Is a directory`;
  parent.children[name] = { type: 'file', content: append && old?.type === 'file' ? old.content + content : content, mode: 0o644, owner: ctx.user, mtime: Date.UTC(2026, 10, 19, 6, 0, 0) };
  return null;
}

/** Files under a path: the file itself, a directory's direct files, or (recursive) every file below it. */
export function listFiles(ctx: CmdCtx, path: string, recursive: boolean): { path: string; display: string; content: string }[] | null {
  const abs = resolvePath(ctx.state.cwd, path, ctx.state.home);
  const node = getNode(ctx.state.root, abs);
  if (!node) return null;
  if (node.type === 'file') return [{ path: abs, display: path, content: node.content }];
  if (recursive) {
    return walk(ctx.state.root, abs)
      .filter((e) => e.node.type === 'file' && canAccess(e.node, ctx.user, 'r'))
      .map((e) => ({ path: e.path, display: joinShown(path, e.path.slice(abs.length + 1)), content: (e.node as { content: string }).content }));
  }
  return Object.keys(node.children)
    .sort()
    .filter((n) => node.children[n]!.type === 'file')
    .map((n) => ({ path: `${abs}/${n}`, display: joinShown(path, n), content: (node.children[n] as { content: string }).content }));
}

function joinShown(base: string, rel: string): string {
  return `${base.replace(/\/+$/, '')}/${rel}`;
}

/** Simple getopt: flags that take a value are listed in `withValue`. Unknown flags are returned for an error. */
export function parseArgs(args: string[], withValue: string[]): { opts: Record<string, string | true>; rest: string[]; unknown: string[] } {
  const opts: Record<string, string | true> = {};
  const rest: string[] = [];
  const unknown: string[] = [];
  for (let i = 0; i < args.length; i++) {
    const a = args[i]!;
    if (a.startsWith('-') && a !== '-') {
      const eq = a.indexOf('=');
      const name = eq > 0 ? a.slice(0, eq) : a;
      if (withValue.includes(name)) {
        opts[name] = eq > 0 ? a.slice(eq + 1) : (args[++i] ?? '');
      } else opts[name] = true;
      if (!withValue.includes(name)) unknown.push(name);
    } else rest.push(a);
  }
  return { opts, rest, unknown };
}
