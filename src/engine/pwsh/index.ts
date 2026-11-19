import { getNode } from '../terminal/fs';
import type { ShellState } from '../terminal/shell';
import { ALIASES, CMDLETS, resolveCommand, runPs } from './eval';
import { resolveWin } from './cmdlets/files';

export function runPsLine(state: ShellState, line: string): { output: string; code: number; clear: boolean } {
  return runPs({ state, win: state.win!, errors: [] }, line);
}

const NAMES = () => [...new Set([...[...CMDLETS.values()].map((c) => c.name.replace(/\.exe$/, '')), ...Object.keys(ALIASES).filter((a) => /^[a-z]/.test(a))])];

/** Tab completion for PowerShell: cmdlet names, -Parameters of the current command, and C:\ paths. */
export function completePs(state: ShellState, line: string): { line: string; options: string[] } {
  const m = /(?:^|[\s|;(])([^\s|;(]*)$/.exec(line);
  const word = m ? m[1]! : '';
  const before = line.slice(0, line.length - word.length);
  const isCommand = /(^|[|;(]\s*)$/.test(before);
  let candidates: string[];
  let base = '';
  let caseless = true;
  if (isCommand && !/[\\/]/.test(word)) {
    candidates = NAMES();
  } else if (word.startsWith('-')) {
    const seg = before.split(/[|;]/).pop() ?? '';
    const cmdName = /^\s*(\S+)/.exec(seg)?.[1];
    const cmd = cmdName ? resolveCommand(cmdName) : null;
    candidates = cmd ? cmd.params.map((p) => '-' + p.name) : [];
  } else {
    const quote = word.startsWith("'") || word.startsWith('"') ? word[0]! : '';
    const raw = word.slice(quote.length);
    const slash = Math.max(raw.lastIndexOf('\\'), raw.lastIndexOf('/'));
    base = quote + (slash === -1 ? '' : raw.slice(0, slash + 1));
    const dir = getNode(state.root, resolveWin(state, slash === -1 ? '.' : raw.slice(0, slash + 1) || '\\'));
    if (!dir || dir.type !== 'dir') return { line, options: [] };
    candidates = Object.entries(dir.children).map(([n, node]) => (node.type === 'dir' ? n + '\\' : n));
    caseless = true;
  }
  const prefix = word.slice(base.length);
  const hits = candidates.filter((c) => (caseless ? c.toLowerCase().startsWith(prefix.toLowerCase()) : c.startsWith(prefix))).sort((a, b) => a.localeCompare(b));
  if (!hits.length) return { line, options: [] };
  if (hits.length === 1) {
    const hit = hits[0]!;
    const needsQuote = hit.includes(' ') && !base.startsWith("'") && !base.startsWith('"');
    const text = needsQuote ? `'${base}${hit}${hit.endsWith('\\') ? '' : "'"}` : base + hit;
    return { line: before + text + (hit.endsWith('\\') ? '' : ' '), options: [] };
  }
  let common = hits[0]!;
  for (const h of hits) while (!h.toLowerCase().startsWith(common.toLowerCase())) common = common.slice(0, -1);
  return { line: before + base + (common.length >= prefix.length ? common : prefix), options: common.length > prefix.length ? [] : hits };
}
