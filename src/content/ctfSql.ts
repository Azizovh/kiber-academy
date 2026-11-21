import type { CtfChallenge } from './types';
import { prng } from './labs/siem';
import { inserts } from './labs/sqlHelpers';

/*
 * SQL challenges on real SQLite databases (terminal + editor). Flags are stored as hashes; plain answers and the
 * queries that find them live in content.test.ts.
 */

const pad = (n: number) => String(n).padStart(2, '0');

/* ── a quietly added administrator ───────────────────────────────────── */

function staffScript(): string {
  const rnd = prng(2207);
  const first = ['aziz', 'dilnoza', 'jasur', 'malika', 'bekzod', 'sardor', 'kamola', 'umid', 'zarina', 'olim', 'gulnora', 'shoxrux', 'nigora', 'rustam', 'feruza', 'temur', 'lola', 'akmal', 'madina', 'sherzod'];
  const users: (string | number | null)[][] = [];
  first.forEach((u, i) => {
    const role = i === 0 || i === 19 ? 'admin' : i % 7 === 3 ? 'kassir' : 'xodim';
    users.push([i + 1, u, `${u}@dokon.example.com`, role, `2025-${pad(1 + (i % 11))}-${pad(3 + ((i * 3) % 24))} ${pad(9 + (i % 8))}:${pad((i * 11) % 60)}:00`, 'aziz']);
  });
  // Ordinary accounts added by HR during the day, all as staff.
  for (let i = 0; i < 12; i++) users.push([21 + i, `xodim${i + 1}`, `xodim${i + 1}@dokon.example.com`, 'xodim', `2026-11-${pad(3 + i)} ${pad(10 + (i % 6))}:${pad(Math.floor(rnd() * 60))}:00`, 'sherzod']);
  // One more "helpdesk" account: created at night, with an outside mailbox, straight into admin, by an account that never creates users.
  users.push([33, 'helpdesk1', 'helpdesk1@dokon.example.com', 'xodim', '2026-10-02 11:20:00', 'sherzod']);
  users.push([34, 'helpdesk2', 'support.desk@mail.example', 'admin', '2026-11-17 03:12:44', 'kamola']);
  const audit: (string | number | null)[][] = users.map((u) => [String(u[4]), String(u[5]), 'create_user', String(u[1])]);
  audit.push(['2026-11-17 03:09:02', 'kamola', 'login', 'ip=198.51.100.140'], ['2026-11-17 03:13:10', 'kamola', 'logout', '']);
  for (let i = 0; i < 60; i++) {
    const u = first[Math.floor(rnd() * first.length)]!;
    audit.push([`2026-11-${pad(10 + Math.floor(rnd() * 8))} ${pad(9 + Math.floor(rnd() * 9))}:${pad(Math.floor(rnd() * 60))}:00`, u, 'login', `ip=10.20.0.${10 + first.indexOf(u)}`]);
  }
  audit.sort((a, b) => String(a[0]).localeCompare(String(b[0])));
  return [
    'CREATE TABLE users (id INTEGER PRIMARY KEY, username TEXT UNIQUE, email TEXT, role TEXT, created TEXT, created_by TEXT);',
    'CREATE TABLE audit (id INTEGER PRIMARY KEY, ts TEXT, actor TEXT, action TEXT, detail TEXT);',
    inserts('users', ['id', 'username', 'email', 'role', 'created', 'created_by'], users),
    inserts('audit', ['ts', 'actor', 'action', 'detail'], audit),
  ].join('\n');
}

/* ── reading other people's notes ────────────────────────────────────── */

function notesScript(): string {
  const rnd = prng(3713);
  const users = ['aziz', 'dilnoza', 'nodira', 'jasur', 'malika', 'bekzod', 'sardor', 'kamola', 'umid', 'zarina'];
  const notes: (string | number)[][] = [];
  for (let i = 0; i < 300; i++) notes.push([1001 + i, users[i % users.length]!, `Qayd ${1001 + i}`]);
  const owner = (id: number) => String(notes[id - 1001]![1]);
  const shares: (string | number)[][] = [];
  const reads: (string | number)[][] = [];
  const t = () => `2026-11-${pad(10 + Math.floor(rnd() * 8))} ${pad(8 + Math.floor(rnd() * 10))}:${pad(Math.floor(rnd() * 60))}:${pad(Math.floor(rnd() * 60))}`;
  // Everyone reads their own notes.
  for (const u of users) for (let k = 0; k < 25; k++) {
    const own = notes.filter((n) => n[1] === u);
    reads.push([t(), u, Number(own[Math.floor(rnd() * own.length)]![0])]);
  }
  // malika is the team lead: 40 notes are shared with her, and she reads them — allowed.
  const forMalika = notes.filter((n) => n[1] !== 'malika').slice(0, 40);
  for (const n of forMalika) {
    shares.push([Number(n[0]), 'malika']);
    reads.push([t(), 'malika', Number(n[0])]);
  }
  // A few ordinary shares among colleagues.
  for (let k = 0; k < 30; k++) {
    const n = notes[100 + k * 5]!;
    const to = users[(k * 3 + 1) % users.length]!;
    if (to === n[1]) continue;
    shares.push([Number(n[0]), to]);
    reads.push([t(), to, Number(n[0])]);
  }
  // sardor walks through note ids that nobody shared with him: 37 distinct notes, some read twice.
  const taken = new Set(shares.filter((s) => s[1] === 'sardor').map((s) => Number(s[0])));
  const victims = notes.map((n) => Number(n[0])).filter((id) => owner(id) !== 'sardor' && !taken.has(id) && id > 1150).slice(0, 37);
  victims.forEach((id, i) => {
    reads.push([`2026-11-17 23:${pad(10 + Math.floor(i / 2))}:${pad((i * 13) % 60)}`, 'sardor', id]);
    if (i % 5 === 0) reads.push([`2026-11-17 23:${pad(40 + Math.floor(i / 5))}:00`, 'sardor', id]);
  });
  reads.sort((a, b) => String(a[0]).localeCompare(String(b[0])));
  return [
    'CREATE TABLE notes (id INTEGER PRIMARY KEY, owner TEXT, title TEXT);',
    'CREATE TABLE shares (note_id INTEGER, shared_with TEXT);',
    'CREATE TABLE access_log (id INTEGER PRIMARY KEY, ts TEXT, user TEXT, note_id INTEGER);',
    inserts('notes', ['id', 'owner', 'title'], notes),
    inserts('shares', ['note_id', 'shared_with'], shares),
    inserts('access_log', ['ts', 'user', 'note_id'], reads),
  ].join('\n');
}

export const CTF_SQL: CtfChallenge[] = [
  {
    id: 'sql-hidden-admin',
    title: 'Yashirin administrator',
    category: 'loglar',
    level: 1,
    description:
      "Do'konning ichki tizimi bazasi — `~/ctf/dokon.db` (`users`, `audit`). Kecha tunda kimdir **yangi administrator** yaratgan. Uni toping: qachon, qaysi pochta bilan va kim yaratgani g'alati bo'lgan hisob.\n\n" +
      'Flag: `flag{username}`.',
    hints: [
      "`sqlite3 -box dokon.db \"SELECT username, email, created, created_by FROM users WHERE role = 'admin';\"`",
      "Yaratilgan vaqtni (tun), pochta domenini va `created_by` ni solishtiring; `audit` jadvalida yaratgan hisob o'sha tunda qayerdan kirganini ko'ring.",
    ],
    flagHash: '0bf9ee11290c64',
    panes: ['terminal', 'editor'],
    editor: { root: '/home/talaba/ctf', open: 'sorov.sql' },
    runtimes: ['sql'],
    shell: () => ({ fs: { home: { talaba: { ctf: { 'sorov.sql': "-- sqlite3 -box dokon.db \".read sorov.sql\"\n" } } }, tmp: {} }, sqlite: { '/home/talaba/ctf/dokon.db': staffScript() }, cwd: '/home/talaba/ctf' }),
  },
  {
    id: 'sql-foreign-notes',
    title: 'Begona qaydlar',
    category: 'web',
    level: 2,
    description:
      "Qaydnoma'ning murojaat jurnali — `~/ctf/qaydlar.db`: `notes` (qayd egasi), `shares` (kimga ulashilgan), `access_log` (kim qaysi qaydni ochgan). a2 bosqichidagi ruxsat nazorati darsidan eslang: qaydni faqat egasi yoki u **ulashgan** odam ochishi kerak. Kimdir ruxsatsiz qaydlarni ochgan (IDOR).\n\n" +
      "Flag: `flag{user_N}` — foydalanuvchi va u ruxsatsiz ochgan **turli** qaydlar soni (masalan `flag{aziz_12}`).",
    hints: [
      "Begona qaydlar: `access_log` ni `notes` bilan bog'lab, `a.user != n.owner`. Lekin ehtiyot bo'ling: ulashilgan qaydni ochish — ruxsat etilgan.",
      "`LEFT JOIN shares s ON s.note_id = a.note_id AND s.shared_with = a.user` va `WHERE s.note_id IS NULL`; keyin `COUNT(DISTINCT a.note_id)`.",
    ],
    flagHash: '0ffd81633bb041',
    panes: ['terminal', 'editor'],
    editor: { root: '/home/talaba/ctf', open: 'sorov.sql' },
    runtimes: ['sql'],
    shell: () => ({ fs: { home: { talaba: { ctf: { 'sorov.sql': "-- sqlite3 -box qaydlar.db \".read sorov.sql\"\n" } } }, tmp: {} }, sqlite: { '/home/talaba/ctf/qaydlar.db': notesScript() }, cwd: '/home/talaba/ctf' }),
  },
];
