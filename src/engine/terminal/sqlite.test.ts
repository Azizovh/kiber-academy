import { beforeAll, describe, expect, it } from 'vitest';
import { loadSql } from '../runtime/sql';
import { createShell, execLine } from './shell';

const SCHEMA = `
CREATE TABLE users (id INTEGER PRIMARY KEY, username TEXT NOT NULL, role TEXT);
CREATE TABLE logins (id INTEGER PRIMARY KEY, user_id INTEGER, ip TEXT, ok INTEGER);
INSERT INTO users VALUES (1, 'aziz', 'admin'), (2, 'nodira', 'user'), (3, 'jasur', NULL);
INSERT INTO logins (user_id, ip, ok) VALUES (1, '10.0.0.5', 1), (2, '203.0.113.64', 0), (2, '203.0.113.64', 1);
CREATE INDEX idx_logins_ip ON logins(ip);
`;

beforeAll(async () => {
  await loadSql();
});

function sh() {
  const state = createShell({ fs: { home: { talaba: { 'q.sql': "-- izoh\n.headers on\nSELECT username, role FROM users WHERE role = 'admin';\n" } }, tmp: {} }, sqlite: { '/home/talaba/app.db': SCHEMA } });
  return (line: string) => execLine(state, line);
}

describe('sqlite3', () => {
  it('runs queries in list mode and with headers', () => {
    const run = sh();
    expect(run('file app.db').output).toContain('app.db');
    expect(run('sqlite3 app.db "SELECT id, username FROM users ORDER BY id;"').output).toBe('1|aziz\n2|nodira\n3|jasur');
    expect(run('sqlite3 -header app.db "SELECT username, role FROM users WHERE id = 3;"').output).toBe('username|role\njasur|');
  });

  it('has column, box, csv and json modes', () => {
    const run = sh();
    expect(run('sqlite3 -column app.db "SELECT id, username FROM users WHERE id < 3"').output).toBe('id  username\n--  --------\n 1  aziz\n 2  nodira');
    expect(run('sqlite3 -box app.db "SELECT u.username, COUNT(*) AS n FROM logins l JOIN users u ON u.id = l.user_id GROUP BY u.username ORDER BY n DESC"').output).toBe(
      '┌──────────┬───┐\n│ username │ n │\n├──────────┼───┤\n│ nodira   │ 2 │\n│ aziz     │ 1 │\n└──────────┴───┘',
    );
    expect(run('sqlite3 -csv -header app.db "SELECT id, ip FROM logins LIMIT 1"').output).toBe('id,ip\n1,10.0.0.5');
    expect(run('sqlite3 -json app.db "SELECT id, role FROM users WHERE id IN (1,3)"').output).toBe('[{"id":1,"role":"admin"},\n{"id":3,"role":null}]');
  });

  it('dot commands, .read and writes back to the file', () => {
    const run = sh();
    expect(run('sqlite3 app.db ".tables"').output).toBe('logins  users');
    expect(run('sqlite3 app.db ".schema users"').output).toBe('CREATE TABLE users (id INTEGER PRIMARY KEY, username TEXT NOT NULL, role TEXT);');
    expect(run('sqlite3 app.db ".read q.sql"').output).toBe('username|role\naziz|admin');
    run('sqlite3 app.db "INSERT INTO users (username, role) VALUES (\'malika\', \'user\');"');
    expect(run('sqlite3 app.db "SELECT COUNT(*) FROM users"').output).toBe('4');
    run('sqlite3 new.db "CREATE TABLE t(x); INSERT INTO t VALUES (42);"');
    expect(run('sqlite3 new.db "SELECT x FROM t"').output).toBe('42');
  });

  it('reports errors like the sqlite3 shell', () => {
    const run = sh();
    expect(run('sqlite3 app.db "SELECT nme FROM users"').output).toBe('Parse error: no such column: nme');
    expect(run('sqlite3 app.db "SELEC 1"').output).toMatch(/^Parse error: near "SELEC": syntax error/);
    expect(run('sqlite3 q.sql "SELECT 1"').output).toMatch(/file is not a database/);
    expect(run('sqlite3 app.db').output).toMatch(/interaktiv rejim yo'q/);
  });
});
