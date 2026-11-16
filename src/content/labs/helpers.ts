import { getNode, type FsNode } from '../../engine/terminal/fs';
import type { ShellState } from '../../engine/terminal/shell';

export function nodeAt(state: ShellState, path: string): FsNode | null {
  return getNode(state.root, path);
}

/** File content at an absolute path, or null when it is missing or a directory. */
export function fileAt(state: ShellState, path: string): string | null {
  const node = nodeAt(state, path);
  return node && node.type === 'file' ? node.content : null;
}

export function isDir(state: ShellState, path: string): boolean {
  return nodeAt(state, path)?.type === 'dir';
}

export function modeAt(state: ShellState, path: string): number | null {
  return nodeAt(state, path)?.mode ?? null;
}
