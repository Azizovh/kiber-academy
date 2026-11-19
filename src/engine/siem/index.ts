import { runKusto } from './kusto';
import { runSpl } from './spl';
import type { Row, SiemLang, SiemResult, SiemState } from './types';
import { cellText, fmtTime } from './values';

export * from './types';
export { createSiem } from './types';
export { eventFields } from './spl';

export function runSiem(state: SiemState, lang: SiemLang, query: string): SiemResult {
  return lang === 'kql' ? runKusto(state, query) : runSpl(state, query);
}

/** One cell as the results table prints it. */
export function cell(result: SiemResult, row: Row, column: string): string {
  return cellText(row[column], result.timeColumns.includes(column), result.lang === 'kql');
}

/**
 * Plain-text form of a result, for lab checks and the solution tests: an error line, raw events one per line
 * ("time  raw"), or a tab-separated table with a header row. Multivalue cells join with ", ".
 */
export function resultText(result: SiemResult): string {
  if (result.error) return result.error;
  if (result.mode === 'events') return result.rows.map((r) => `${fmtTime(r._time as number)}  ${r._raw}`).join('\n');
  const lines = [result.columns.join('\t')];
  for (const r of result.rows) lines.push(result.columns.map((c) => cell(result, r, c).replace(/\n/g, ', ')).join('\t'));
  return lines.join('\n');
}

/** Values of one column, as printed. */
export function column(result: SiemResult, name: string): string[] {
  return result.rows.map((r) => cell(result, r, name));
}
