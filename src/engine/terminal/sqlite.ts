/*
 * The sqlite3 command-line shell, one-shot mode: `sqlite3 [options] DB "SQL or .command"`. Real SQLite runs the
 * statements (sql.js); the database file lives in the simulated file system as bytes and is written back when a
 * statement changes it. Output modes: list (default, "|"), csv, column, box, table, markdown, json, line; -header.
 * Dot commands: .tables .schema .indexes .headers .mode .read .help .quit. There is no interactive prompt (the
 * terminal runs one line at a time); `.read file.sql` runs a script written in the editor.
 */

import type { Database, SqlValue } from 'sql.js';
import { bytesToText, getSql, SQLITE_MAGIC, textToBytes } from '../runtime/sql';
import { fail, ok, type Command, type CmdCtx } from './shell';
import { nodeAt, readText, writeText } from './toolio';

type Mode = 'list' | 'csv' | 'column' | 'box' | 'table' | 'markdown' | 'json' | 'line' | 'tabs';

interface Opts {
  mode: Mode;
  header: boolean | null;
  separator: string;
  nullValue: string;
}

const MODES: Mode[] = ['list', 'csv', 'column', 'box', 'table', 'markdown', 'json', 'line', 'tabs'];

function fmtValue(v: SqlValue, o: Opts): string {
  if (v === null) return o.nullValue;
  if (v instanceof Uint8Array) return bytesToText(v);
  return String(v);
}

function csvCell(s: string): string {
  return /[",\n\r]/.test(s) || /^\s|\s$/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function jsonValue(v: SqlValue): string {
  if (v === null) return 'null';
  if (typeof v === 'number') return String(v);
  return JSON.stringify(v instanceof Uint8Array ? bytesToText(v) : v);
}

/** Visible width of a cell (box drawing counts every character as one column). */
const width = (s: string) => [...s].length;
const padEnd = (s: string, w: number) => s + ' '.repeat(Math.max(0, w - width(s)));

function render(columns: string[], rows: SqlValue[][], o: Opts): string {
  // Modern sqlite3 turns headers on for the tabular modes.
  const tabular = ['column', 'box', 'table', 'markdown'].includes(o.mode);
  const header = o.header ?? tabular;
  const cells = rows.map((r) => r.map((v) => fmtValue(v, o)));
  switch (o.mode) {
    case 'list':
    case 'tabs': {
      const sep = o.mode === 'tabs' ? '\t' : o.separator;
      const lines = cells.map((r) => r.join(sep));
      return (header ? [columns.join(sep), ...lines] : lines).join('\n');
    }
    case 'csv': {
      const lines = cells.map((r) => r.map(csvCell).join(','));
      return (header ? [columns.map(csvCell).join(','), ...lines] : lines).join('\n');
    }
    case 'json':
      if (!rows.length) return '';
      return '[' + rows.map((r) => '{' + columns.map((c, i) => `${JSON.stringify(c)}:${jsonValue(r[i]!)}`).join(',') + '}').join(',\n') + ']';
    case 'line': {
      const w = Math.max(...columns.map(width));
      return cells.map((r) => columns.map((c, i) => `${' '.repeat(w - width(c))}${c} = ${r[i]}`).join('\n')).join('\n\n');
    }
  }
  const widths = columns.map((c, i) => Math.max(header ? width(c) : 0, ...cells.map((r) => width(r[i] ?? ''))));
  const num = columns.map((_, i) => rows.length > 0 && rows.every((r) => typeof r[i] === 'number' || r[i] === null));
  const cell = (s: string, i: number) => (num[i] ? ' '.repeat(widths[i]! - width(s)) + s : padEnd(s, widths[i]!));
  if (o.mode === 'column') {
    const lines = cells.map((r) => r.map(cell).join('  ').trimEnd());
    return (header ? [columns.map((c, i) => padEnd(c, widths[i]!)).join('  ').trimEnd(), widths.map((w) => '-'.repeat(w)).join('  '), ...lines] : lines).join('\n');
  }
  if (o.mode === 'markdown') {
    const line = (r: string[]) => `| ${r.map(cell).join(' | ')} |`;
    return [line(columns.map((c, i) => padEnd(c, widths[i]!))), `|${widths.map((w, i) => (num[i] ? '-'.repeat(w + 1) + ':' : ':' + '-'.repeat(w + 1))).join('|')}|`, ...cells.map(line)].join('\n');
  }
  const [h, v, tl, tm, tr, ml, mm, mr, bl, bm, br] = o.mode === 'box' ? ['─', '│', '┌', '┬', '┐', '├', '┼', '┤', '└', '┴', '┘'] : ['-', '|', '+', '+', '+', '+', '+', '+', '+', '+', '+'];
  const rule = (l: string, m: string, r: string) => l + widths.map((w) => h.repeat(w + 2)).join(m) + r;
  const row = (r: string[], head = false) => `${v} ${r.map((s, i) => (head ? padEnd(s, widths[i]!) : cell(s, i))).join(` ${v} `)} ${v}`;
  const out = [rule(tl, tm, tr)];
  if (header) out.push(row(columns, true), rule(ml, mm, mr));
  out.push(...cells.map((r) => row(r)), rule(bl, bm, br));
  return out.join('\n');
}

/** Splits a script into dot-command lines and complete SQL statements, in order. */
function splitScript(script: string): { dot?: string; sql?: string }[] {
  const out: { dot?: string; sql?: string }[] = [];
  let buf = '';
  let quote: string | null = null;
  let lineStart = true;
  for (let i = 0; i < script.length; i++) {
    const c = script[i]!;
    if (!quote && lineStart && !buf.trim() && c === '.') {
      const end = script.indexOf('\n', i);
      out.push({ dot: script.slice(i, end < 0 ? undefined : end).trim() });
      i = end < 0 ? script.length : end;
      buf = '';
      lineStart = true;
      continue;
    }
    if (!quote && c === '-' && script[i + 1] === '-') {
      const end = script.indexOf('\n', i);
      i = end < 0 ? script.length : end - 1;
      continue;
    }
    buf += c;
    if (quote) {
      if (c === quote) quote = null;
    } else if (c === "'" || c === '"') quote = c;
    else if (c === ';') {
      if (buf.trim() !== ';') out.push({ sql: buf.trim() });
      buf = '';
    }
    lineStart = c === '\n' || (lineStart && /\s/.test(c));
  }
  if (buf.trim()) out.push({ sql: buf.trim() });
  return out;
}

const HELP = `.headers on|off          Turn display of headers on or off
.help                    Show this message
.indexes ?TABLE?         Show names of indexes
.mode MODE               Set output mode: box column csv json line list markdown table tabs
.quit                    Exit this program
.read FILE               Read input from FILE
.schema ?PATTERN?        Show the CREATE statements matching PATTERN
.separator SEP           Change the column separator for list mode
.tables ?TABLE?          List names of tables matching LIKE pattern TABLE`;

interface RunState {
  db: Database;
  o: Opts;
  out: string[];
  results: { columns: string[]; rows: SqlValue[][] }[];
  error: string | null;
  depth: number;
}

function runDot(line: string, st: RunState, ctx: CmdCtx): boolean {
  const [cmd, ...args] = line.split(/\s+/);
  const arg = args.join(' ').replace(/^['"]|['"]$/g, '');
  const q = (sql: string, params: SqlValue[] = []) => {
    const res = st.db.exec(sql, params);
    return res[0]?.values ?? [];
  };
  switch (cmd) {
    case '.tables': {
      const names = q("SELECT name FROM sqlite_master WHERE type IN ('table','view') AND name NOT LIKE 'sqlite_%' AND name LIKE ? ORDER BY name", [arg || '%']).map((r) => String(r[0]));
      if (names.length) st.out.push(names.join('  '));
      return true;
    }
    case '.schema': {
      const rows = q("SELECT sql FROM sqlite_master WHERE sql IS NOT NULL AND name NOT LIKE 'sqlite_%' AND (tbl_name LIKE ? OR name LIKE ?) ORDER BY type DESC, name", [arg || '%', arg || '%']);
      for (const r of rows) st.out.push(`${r[0]};`);
      return true;
    }
    case '.indexes':
    case '.indices': {
      const names = q("SELECT name FROM sqlite_master WHERE type='index' AND tbl_name LIKE ? ORDER BY name", [arg || '%']).map((r) => String(r[0]));
      if (names.length) st.out.push(names.join('\n'));
      return true;
    }
    case '.headers':
    case '.header':
      st.o.header = /^(on|1|yes|true)$/i.test(arg);
      return true;
    case '.mode':
      if (!MODES.includes(arg as Mode)) {
        st.error = `Error: mode should be one of: ${MODES.join(' ')}`;
        return false;
      }
      st.o.mode = arg as Mode;
      return true;
    case '.separator':
      st.o.separator = arg.replace(/\\t/g, '\t');
      return true;
    case '.nullvalue':
      st.o.nullValue = arg;
      return true;
    case '.help':
      st.out.push(HELP);
      return true;
    case '.quit':
    case '.exit':
      return false;
    case '.read': {
      if (!arg) {
        st.error = 'Usage: .read FILE';
        return false;
      }
      if (st.depth > 5) {
        st.error = 'Error: .read nested too deeply';
        return false;
      }
      const r = readText(ctx, arg, 'sqlite3');
      if (!r.ok) {
        st.error = `Error: cannot open "${arg}"`;
        return false;
      }
      st.depth++;
      const cont = runScript(r.text, st, ctx);
      st.depth--;
      return cont;
    }
    default:
      st.error = `Error: unknown command or invalid arguments:  "${(cmd ?? '').slice(1)}". Enter ".help" for help`;
      return false;
  }
}

function runScript(script: string, st: RunState, ctx: CmdCtx): boolean {
  for (const part of splitScript(script)) {
    if (part.dot !== undefined) {
      if (!runDot(part.dot, st, ctx)) return false;
      continue;
    }
    try {
      for (const stmt of st.db.iterateStatements(part.sql!)) {
        const columns = stmt.getColumnNames();
        const rows: SqlValue[][] = [];
        while (stmt.step()) rows.push(stmt.get());
        stmt.free();
        if (columns.length) st.results.push({ columns, rows });
        if (columns.length && rows.length) st.out.push(render(columns, rows, st.o));
      }
    } catch (e) {
      const msg = (e as Error).message;
      const kind = /syntax error|no such|ambiguous|incomplete|unrecognized|near "/.test(msg) ? 'Parse error' : 'Runtime error';
      st.error = `${kind}: ${msg}`;
      return false;
    }
  }
  return true;
}

export const sqlite3: Command = (args, ctx) => {
  const SQL = getSql();
  if (!SQL) return fail('sqlite3: SQLite hali yuklanmagan — sahifani qayta oching.');
  const o: Opts = { mode: 'list', header: null, separator: '|', nullValue: '' };
  const rest: string[] = [];
  for (let i = 0; i < args.length; i++) {
    const a = args[i]!;
    const m = /^--?([a-z]+)$/.exec(a);
    if (m && a !== '-') {
      const name = m[1]!;
      if (MODES.includes(name as Mode)) o.mode = name as Mode;
      else if (name === 'header' || name === 'headers') o.header = true;
      else if (name === 'noheader') o.header = false;
      else if (name === 'separator') o.separator = args[++i] ?? '|';
      else if (name === 'nullvalue') o.nullValue = args[++i] ?? '';
      else if (name === 'version') return ok('3.49.1 2025-02-18 (sql.js)');
      else if (name === 'help') return ok('Usage: sqlite3 [OPTIONS] FILENAME [SQL]\nOPTIONS include:\n   -box                 set output mode to \'box\'\n   -column              set output mode to \'column\'\n   -csv                 set output mode to \'csv\'\n   -header              turn headers on\n   -json                set output mode to \'json\'\n   -line                set output mode to \'line\'\n   -list                set output mode to \'list\'\n   -markdown            set output mode to \'markdown\'\n   -separator SEP       set output column separator. Default: \'|\'\n   -table               set output mode to \'table\'');
      else return fail(`sqlite3: Error: unknown option: ${a}\nUse -help for a list of options.`);
    } else rest.push(a);
  }
  const [file, ...sqlParts] = rest;
  if (!file) return fail('Usage: sqlite3 [OPTIONS] FILENAME [SQL]');
  const sql = sqlParts.join(' ');
  if (!sql.trim()) {
    return fail(`sqlite3: bu simulyatorda interaktiv rejim yo'q. So'rovni qo'shtirnoqda bering:\n  sqlite3 ${file} "SELECT * FROM jadval LIMIT 5;"\nyoki faylga yozib:  sqlite3 ${file} ".read sorov.sql"`);
  }
  const { node } = nodeAt(ctx, file);
  if (node && node.type === 'dir') return fail(`Error: unable to open database "${file}": unable to open database file`);
  if (node && node.content && !node.content.startsWith(SQLITE_MAGIC)) return fail('Parse error: file is not a database (26)');
  const original = node?.content ?? '';
  const db = original ? new SQL.Database(textToBytes(original)) : new SQL.Database();
  const st: RunState = { db, o, out: [], results: [], error: null, depth: 0 };
  try {
    runScript(sql, st, ctx);
    const after = bytesToText(db.export());
    // Like sqlite3, a new database file appears only once something is written to it.
    const changed = original ? after !== original : db.exec("SELECT 1 FROM sqlite_master LIMIT 1").length > 0;
    if (changed) {
      const err = writeText(ctx, file, after);
      if (err) st.error = `Runtime error: attempt to write a readonly database (8)`;
    }
  } finally {
    db.close();
  }
  ctx.state.sqliteLast = { file: nodeAt(ctx, file).abs, sql, results: st.results };
  const text = st.out.join('\n');
  if (st.error) return { out: text, err: st.error, code: 1 };
  return ok(text);
};
