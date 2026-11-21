/* Shared pieces for SQL labs: SQL text from rows, querying a lab database, and result checks. */

import type { LabCheckCtx } from '../types';
import { getSql, textToBytes } from '../../engine/runtime/sql';
import { getNode } from '../../engine/terminal/fs';
import type { ShellState, SqlResultSet } from '../../engine/terminal/shell';

type Cell = string | number | null;

const lit = (v: Cell) => (v === null ? 'NULL' : typeof v === 'number' ? String(v) : `'${v.replace(/'/g, "''")}'`);

/** INSERT statements for rows, in batches (one statement per 200 rows keeps scripts quick to run). */
export function inserts(table: string, columns: string[], rows: Cell[][]): string {
  const out: string[] = [];
  for (let i = 0; i < rows.length; i += 200) {
    const chunk = rows.slice(i, i + 200).map((r) => `(${r.map(lit).join(', ')})`);
    out.push(`INSERT INTO ${table} (${columns.join(', ')}) VALUES\n${chunk.join(',\n')};`);
  }
  return out.join('\n');
}

/** Runs a query against a database file of the lab's file system (checks call this at run time, after loadSql). */
export function queryDb(state: ShellState, abs: string, sql: string): SqlResultSet {
  const SQL = getSql();
  const node = getNode(state.root, abs);
  if (!SQL || !node || node.type !== 'file') return { columns: [], rows: [] };
  const db = new SQL.Database(textToBytes(node.content));
  try {
    const r = db.exec(sql)[0];
    return { columns: r?.columns ?? [], rows: (r?.values ?? []) as SqlResultSet['rows'] };
  } finally {
    db.close();
  }
}

export const cellText = (v: unknown) => (v === null || v === undefined ? '' : String(v));

/** The last result set of the sqlite3 command the learner just ran (null if the line was not sqlite3). */
export function lastResult(c: LabCheckCtx): SqlResultSet | null {
  if (!/^\s*sqlite3\b/.test(c.line) || c.output.startsWith('Parse error') || c.output.startsWith('Runtime error')) return null;
  const last = c.state.sqliteLast?.results;
  return last && last.length ? last[last.length - 1]! : null;
}

/** Values of the column whose name matches (case-insensitive), or of column `i` when a number is given. */
export function column(r: SqlResultSet | null, name: string | number): string[] | null {
  if (!r) return null;
  const i = typeof name === 'number' ? name : r.columns.findIndex((c) => c.toLowerCase() === name.toLowerCase());
  if (i < 0) return null;
  return r.rows.map((row) => cellText(row[i]));
}

export function sameSet(a: string[] | null, b: string[]): boolean {
  if (!a || a.length !== b.length) return false;
  return [...a].sort().join('\n') === [...b].sort().join('\n');
}

/** True when every expected row appears in the result as a row containing all of its values (any columns, any order). */
export function hasRows(r: SqlResultSet | null, expected: Cell[][]): boolean {
  if (!r) return false;
  const rows = r.rows.map((row) => row.map(cellText));
  return expected.every((e) => rows.some((row) => e.every((v) => row.includes(cellText(v)))));
}

/** Expected rows from the lab's own database, as text. */
export function expectRows(state: ShellState, abs: string, sql: string): string[][] {
  return queryDb(state, abs, sql).rows.map((r) => r.map(cellText));
}
