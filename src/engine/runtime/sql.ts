/*
 * SQLite in the browser (sql.js, WebAssembly). Loading is asynchronous, but once loaded every call is synchronous,
 * so the terminal's `sqlite3` command can stay a plain synchronous command. Labs that need it declare
 * `runtimes: ['sql']`; the lab page (and the tests) await loadSql() before creating the shell.
 */

import type { Database, SqlJsStatic } from 'sql.js';

let SQL: SqlJsStatic | null = null;
let loading: Promise<SqlJsStatic> | null = null;

export function getSql(): SqlJsStatic | null {
  return SQL;
}

export function loadSql(): Promise<SqlJsStatic> {
  if (SQL) return Promise.resolve(SQL);
  loading ??= (async () => {
    const init = (await import('sql.js')).default;
    if (typeof window === 'undefined') {
      // Node (tests): sql.js finds its .wasm next to itself.
      SQL = await init();
    } else {
      const wasm = (await import('sql.js/dist/sql-wasm.wasm?url')).default;
      SQL = await init({ locateFile: () => wasm } as unknown as Parameters<typeof init>[0]);
    }
    return SQL;
  })();
  return loading;
}

/** Files in the simulated file system hold one character per byte. */
export function bytesToText(bytes: Uint8Array): string {
  let s = '';
  for (let i = 0; i < bytes.length; i += 8192) s += String.fromCharCode(...bytes.subarray(i, i + 8192));
  return s;
}

export function textToBytes(text: string): Uint8Array {
  const out = new Uint8Array(text.length);
  for (let i = 0; i < text.length; i++) out[i] = text.charCodeAt(i) & 0xff;
  return out;
}

export const SQLITE_MAGIC = 'SQLite format 3\u0000';

/** Builds a database file (as file-system text) from an SQL script. Needs loadSql() to have finished. */
export function buildDatabase(script: string): string {
  if (!SQL) throw new Error('SQL runtime is not loaded: await loadSql() before creating this shell');
  const db: Database = new SQL.Database();
  try {
    db.exec(script);
    return bytesToText(db.export());
  } finally {
    db.close();
  }
}
