/*
 * Runs one line of a lab solution: a shell command, a SIEM search written "spl> query" / "kql> query", or an edit
 * the learner would make in the code editor ("edit> {json}", from edit() / editFn()). Used by the content tests; the
 * lab page calls the terminal, the SIEM pane and the editor directly with the same results.
 */

import { resultText, runSiem } from '../../engine/siem';
import type { SiemLang } from '../../engine/siem/types';
import { execLine, type CustomCommand, type ShellState } from '../../engine/terminal/shell';
import { basename, dirname, getNode, resolvePath } from '../../engine/terminal/fs';
import type { LabCheckCtx } from '../types';

export const spl = (q: string) => `spl> ${q}`;
export const kql = (q: string) => `kql> ${q}`;

/** The learner writes a whole file in the editor. */
export const edit = (path: string, content: string) => `edit> ${JSON.stringify({ path, content })}`;
/** The learner fills in a stub `def name(...):\n    """doc"""\n    pass` with a body (lines indented by 4). */
export const editFn = (path: string, fn: string, body: string) => `edit> ${JSON.stringify({ path, fn, body })}`;

/** "spl> index=web" → ['spl', 'index=web']; anything else → null. */
export function siemLine(line: string): [SiemLang, string] | null {
  const m = /^(spl|kql)> ([\s\S]*)$/.exec(line);
  return m ? [m[1] as SiemLang, m[2]!] : null;
}

/** Runs a search in the SIEM and returns the check context a lab task sees afterwards. */
export function siemCtx(state: ShellState, lang: SiemLang, query: string, lines: string[]): LabCheckCtx {
  if (!state.siem) throw new Error('This lab has no SIEM');
  const result = runSiem(state.siem, lang, query);
  return { state, line: query, output: resultText(result), lines, siem: { lang, query, result } };
}

function applyEdit(state: ShellState, spec: { path: string; content?: string; fn?: string; body?: string }) {
  const abs = resolvePath(state.cwd, spec.path, state.home);
  const parent = getNode(state.root, dirname(abs));
  if (!parent || parent.type !== 'dir') throw new Error(`edit: no directory for ${abs}`);
  const node = parent.children[basename(abs)];
  if (spec.content !== undefined) {
    if (node && node.type === 'file') node.content = spec.content;
    else parent.children[basename(abs)] = { type: 'file', content: spec.content, mode: 0o644, owner: state.user };
    return;
  }
  if (!node || node.type !== 'file') throw new Error(`edit: ${abs} does not exist`);
  const re = new RegExp(`(def ${spec.fn}\\([^)]*\\):\\n(?:    """[\\s\\S]*?"""\\n)?)    pass\\n`);
  if (!re.test(node.content)) throw new Error(`edit: no stub for ${spec.fn} in ${abs}`);
  const body = spec.body!.replace(/\n?$/, '\n');
  node.content = node.content.replace(re, (_, head: string) => head + body);
}

export function runLabLine(state: ShellState, line: string, lines: string[], commands?: Record<string, CustomCommand>): LabCheckCtx {
  if (line.startsWith('edit> ')) {
    applyEdit(state, JSON.parse(line.slice(6)) as never);
    return { state, line: '', output: '', lines: [...lines] };
  }
  lines.push(line);
  const s = siemLine(line);
  if (s) return siemCtx(state, s[0], s[1], [...lines]);
  const res = execLine(state, line, commands);
  return { state, line, output: res.output, lines: [...lines] };
}
