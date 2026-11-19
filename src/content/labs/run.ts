/*
 * Runs one line of a lab solution: a shell command, or a SIEM search written "spl> query" / "kql> query".
 * Used by the content tests; the lab page calls the terminal and the SIEM pane directly with the same results.
 */

import { resultText, runSiem } from '../../engine/siem';
import type { SiemLang } from '../../engine/siem/types';
import { execLine, type CustomCommand, type ShellState } from '../../engine/terminal/shell';
import type { LabCheckCtx } from '../types';

export const spl = (q: string) => `spl> ${q}`;
export const kql = (q: string) => `kql> ${q}`;

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

export function runLabLine(state: ShellState, line: string, lines: string[], commands?: Record<string, CustomCommand>): LabCheckCtx {
  lines.push(line);
  const s = siemLine(line);
  if (s) return siemCtx(state, s[0], s[1], [...lines]);
  const res = execLine(state, line, commands);
  return { state, line, output: res.output, lines: [...lines] };
}
