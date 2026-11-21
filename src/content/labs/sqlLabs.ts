import type { Lab, LabCheckCtx } from '../types';
import { prng } from './siem';
import { fileAt } from './helpers';
import { column, expectRows, hasRows, inserts, lastResult, queryDb, sameSet } from './sqlHelpers';

const HOME = '/home/talaba';

/* ── 1. SQL basics on Qaydnoma's database ────────────────────────────── */

const SQL_DIR = `${HOME}/sql`;
const DB = `${SQL_DIR}/qaydnoma.db`;
const ATTACKER = '203.0.113.64';

const NAMES = ['aziz', 'dilnoza', 'nodira', 'jasur', 'malika', 'bekzod', 'sardor', 'kamola', 'umid', 'zarina', 'olim', 'gulnora', 'shoxrux', 'nigora', 'rustam', 'feruza', 'temur', 'lola', 'akmal', 'madina', 'sherzod', 'dildora', 'bobur', 'sevara', 'otabek'];
const ROLES: Record<string, string> = { aziz: 'admin', sherzod: 'admin', dilnoza: 'moderator', temur: 'moderator' };
const EXTERNAL = ['olim', 'feruza', 'bobur', 'sevara', 'lola'];
const NEVER = ['otabek', 'dildora', 'akmal'];
const NO_NOTES = ['otabek', 'dildora', 'akmal', 'rustam'];

function qaydnomaScript(): string {
  const rnd = prng(1701);
  const pad = (n: number) => String(n).padStart(2, '0');
  const users = NAMES.map((ism, i) => {
    const y = i < 12 ? 2025 : 2026;
    const created = `${y}-${pad(1 + ((i * 5) % 10))}-${pad(1 + ((i * 7) % 27))}`;
    return [i + 1, ism, `${ism}@${EXTERNAL.includes(ism) ? 'mail.example' : 'qaydnoma.example.com'}`, ROLES[ism] ?? 'foydalanuvchi', created, NEVER.includes(ism) ? null : `2026-11-${pad(12 + (i % 7))} ${pad(8 + (i % 9))}:${pad((i * 13) % 60)}:00`];
  });
  const id = (ism: string) => NAMES.indexOf(ism) + 1;

  const titles = ['Majlis bayonnomasi', 'Xarid ro\'yxati', 'Loyiha rejasi', 'Hisobot qoralamasi', 'Parollar emas!', 'Mijozlar bilan uchrashuv', 'Kitoblar', 'Shartnoma shartlari', 'G\'oyalar', 'Ta\'til rejasi'];
  const notes: (string | number | null)[][] = [];
  let noteId = 1001;
  const owners = NAMES.filter((n) => !NO_NOTES.includes(n));
  for (let i = 0; i < 240; i++) {
    // nodira owns notes 1207 and 1213 — the ones the attacker shared.
    const owner = noteId === 1207 || noteId === 1213 ? 'nodira' : owners[Math.floor(rnd() * owners.length)]!;
    notes.push([noteId, id(owner), titles[Math.floor(rnd() * titles.length)]!, `2026-${pad(1 + Math.floor(rnd() * 10))}-${pad(1 + Math.floor(rnd() * 27))}`, rnd() < 0.3 ? 1 : 0]);
    noteId++;
  }
  const shares: (string | number | null)[][] = [];
  for (let i = 0; i < 40; i++) {
    const note = notes[Math.floor(rnd() * notes.length)]!;
    const to = NAMES[Math.floor(rnd() * NAMES.length)]!;
    shares.push([note[0]!, `${to}@qaydnoma.example.com`, `2026-${pad(1 + Math.floor(rnd() * 10))}-${pad(1 + Math.floor(rnd() * 27))} 10:00:00`]);
  }
  shares.push([1207, 'drop.box@example.net', '2026-11-18 02:18:21'], [1213, 'drop.box@example.net', '2026-11-18 02:18:25']);

  const log: (string | number | null)[][] = [];
  for (let d = 12; d <= 18; d++) {
    for (const [i, ism] of NAMES.entries()) {
      if (NEVER.includes(ism) || rnd() < 0.3) continue;
      const ip = EXTERNAL.includes(ism) ? `198.51.100.${100 + i}` : `192.0.2.${11 + i}`;
      const t = `2026-11-${d} ${pad(7 + Math.floor(rnd() * 11))}:${pad(Math.floor(rnd() * 60))}:${pad(Math.floor(rnd() * 60))}`;
      if (rnd() < 0.12) log.push([t, ism, ip, 'xato']);
      log.push([t.replace(/:(\d\d)$/, (_, s: string) => `:${pad(Math.min(59, Number(s) + 9))}`), ism, ip, 'ok']);
    }
  }
  // 11-18 02:00–02:17 — credential stuffing from one address; nodira's reused password works.
  const leaked = ['admin', 'test', 'aziz', 'olim', 'info', 'nodira', 'support', 'kassa', 'malika', 'hr', 'guest', 'demo'];
  for (let i = 0; i < 26; i++) log.push([`2026-11-18 02:${pad(Math.floor(i * 0.65))}:${pad((i * 23) % 60)}`, leaked[i % leaked.length]!, ATTACKER, 'xato']);
  log.push(['2026-11-18 02:17:41', 'nodira', ATTACKER, 'ok']);
  // 11-16 — a scanner tries the admin account a few times and gives up.
  for (let i = 0; i < 7; i++) log.push([`2026-11-16 22:1${i}:05`, 'admin', '198.51.100.23', 'xato']);
  log.sort((a, b) => String(a[0]).localeCompare(String(b[0])));

  return [
    'CREATE TABLE foydalanuvchilar (id INTEGER PRIMARY KEY, ism TEXT NOT NULL UNIQUE, email TEXT NOT NULL, rol TEXT NOT NULL, yaratilgan TEXT NOT NULL, oxirgi_kirish TEXT);',
    'CREATE TABLE qaydlar (id INTEGER PRIMARY KEY, egasi_id INTEGER NOT NULL REFERENCES foydalanuvchilar(id), sarlavha TEXT NOT NULL, yaratilgan TEXT NOT NULL, maxfiy INTEGER NOT NULL DEFAULT 0);',
    'CREATE TABLE ulashishlar (id INTEGER PRIMARY KEY, qayd_id INTEGER NOT NULL REFERENCES qaydlar(id), kimga TEXT NOT NULL, vaqt TEXT NOT NULL);',
    'CREATE TABLE kirish_jurnali (id INTEGER PRIMARY KEY, vaqt TEXT NOT NULL, foydalanuvchi TEXT NOT NULL, ip TEXT NOT NULL, natija TEXT NOT NULL);',
    'CREATE TABLE insidentlar (id INTEGER PRIMARY KEY, vaqt TEXT NOT NULL, sarlavha TEXT NOT NULL, holat TEXT NOT NULL);',
    inserts('foydalanuvchilar', ['id', 'ism', 'email', 'rol', 'yaratilgan', 'oxirgi_kirish'], users),
    inserts('qaydlar', ['id', 'egasi_id', 'sarlavha', 'yaratilgan', 'maxfiy'], notes),
    inserts('ulashishlar', ['qayd_id', 'kimga', 'vaqt'], shares),
    inserts('kirish_jurnali', ['vaqt', 'foydalanuvchi', 'ip', 'natija'], log),
  ].join('\n');
}

const QAYDNOMA_SQL = qaydnomaScript();
const SOROV = "-- So'rovingizni shu yerga yozing, keyin terminalda:\n--   sqlite3 -box qaydnoma.db \".read sorov.sql\"\n\nSELECT * FROM foydalanuvchilar LIMIT 3;\n";

const exp = (c: LabCheckCtx, sql: string) => expectRows(c.state, DB, sql);
const names = (c: LabCheckCtx, sql: string) => exp(c, sql).map((r) => r[0]!);

const FAILS_BY_IP = "SELECT ip, COUNT(*) AS urinishlar FROM kirish_jurnali WHERE natija = 'xato' GROUP BY ip ORDER BY urinishlar DESC";
const ATTACK_IPS = "SELECT ip FROM kirish_jurnali WHERE natija = 'xato' GROUP BY ip HAVING COUNT(*) >= 5";

export const sqlBasics: Lab = {
  id: 'sql-asoslari',
  title: "SQL asoslari: Qaydnoma bazasi",
  summary: "Haqiqiy SQLite bazasida SELECT, WHERE, ORDER BY, GROUP BY, HAVING, LIKE, JOIN, ichki so'rov, UPDATE va INSERT; so'rovlarni muharrirda yozib, terminalda bajarish va credential stuffing izlarini SQL bilan topish.",
  minutes: 75,
  level: 1,
  panes: ['terminal', 'editor'],
  editor: { root: SQL_DIR, open: 'sorov.sql' },
  runtimes: ['sql'],
  intro:
    "s4 bosqichidagi SQL darsining amaliyoti. `~/sql/qaydnoma.db` — Qaydnoma ilovasining **haqiqiy SQLite** bazasi: `foydalanuvchilar`, `qaydlar`, `ulashishlar`, `kirish_jurnali` va bo'sh `insidentlar` jadvallari.\n\n" +
    "Ikki oyna bor. **Terminal**da `sqlite3 qaydnoma.db \"SO'ROV;\"` bilan qisqa so'rovlarni bajarasiz. **Kod** oynasida uzun so'rovni `sorov.sql` fayliga yozasiz (u avtomatik saqlanadi) va terminalda `sqlite3 -box qaydnoma.db \".read sorov.sql\"` bilan ishga tushirasiz — dasturchilar ham aynan shunday ishlaydi.\n\n" +
    "SQL'da matn **bitta** qo'shtirnoqda yoziladi: `'admin'`. Terminalda butun so'rov qo'sh qo'shtirnoq ichida bo'lgani uchun bu qulay. Bazani buzib qo'ysangiz — terminaldagi \"Qayta boshlash\" uni asl holiga qaytaradi.",
  shell: () => ({
    fs: { home: { talaba: { sql: { 'sorov.sql': SOROV } } }, tmp: {} },
    sqlite: { [DB]: QAYDNOMA_SQL },
    cwd: SQL_DIR,
  }),
  tasks: [
    {
      id: 'file',
      teach: ['file'],
      text: "`qaydnoma.db` qanday fayl? Turini aniqlang.",
      hint: '`file qaydnoma.db` — SQLite bazasi: butun baza bitta faylda.',
      solution: ['file qaydnoma.db'],
      check: ({ output }) => output.includes('SQLite 3.x database'),
    },
    {
      id: 'tables',
      teach: ['sqlite3', 'sqlite3 .tables'],
      text: 'Bazada qanday jadvallar bor?',
      hint: '`sqlite3 qaydnoma.db ".tables"`',
      solution: ['sqlite3 qaydnoma.db ".tables"'],
      check: ({ line, output }) => line.includes('.tables') && output.includes('kirish_jurnali') && output.includes('foydalanuvchilar'),
    },
    {
      id: 'schema',
      teach: ['sqlite3 .schema'],
      text: "`foydalanuvchilar` jadvalining tuzilishini ko'ring: qanday ustunlar va turlar bor?",
      hint: '`sqlite3 qaydnoma.db ".schema foydalanuvchilar"` — INTEGER — son, TEXT — matn, PRIMARY KEY — birlamchi kalit.',
      solution: ['sqlite3 qaydnoma.db ".schema foydalanuvchilar"'],
      check: ({ output }) => output.startsWith('CREATE TABLE foydalanuvchilar'),
    },
    {
      id: 'select',
      teach: ['sql:select', 'sql:select *', 'sql:select LIMIT'],
      text: "Birinchi so'rov: `foydalanuvchilar` jadvalidan 5 ta qator, barcha ustunlar bilan.",
      hint: '`sqlite3 qaydnoma.db "SELECT * FROM foydalanuvchilar LIMIT 5;"` — ustunlar `|` bilan ajratilgan.',
      solution: ['sqlite3 qaydnoma.db "SELECT * FROM foydalanuvchilar LIMIT 5;"'],
      check: (c) => lastResult(c)?.rows.length === 5 && lastResult(c)?.columns.length === 6,
    },
    {
      id: 'box',
      teach: ['sqlite3 -box'],
      text: "O'qish oson bo'lsin: faqat `id`, `ism`, `rol` ustunlarini `-box` ko'rinishida chiqaring (10 ta qator).",
      hint: '`sqlite3 -box qaydnoma.db "SELECT id, ism, rol FROM foydalanuvchilar LIMIT 10;"`',
      solution: ['sqlite3 -box qaydnoma.db "SELECT id, ism, rol FROM foydalanuvchilar LIMIT 10;"'],
      check: (c) => c.line.includes('-box') && lastResult(c)?.columns.join() === 'id,ism,rol',
    },
    {
      id: 'where',
      teach: ['sql:where', 'sql:where ='],
      text: 'Kimlar administrator (`rol` = admin)? Ism va emailini chiqaring.',
      hint: "`sqlite3 -box qaydnoma.db \"SELECT ism, email FROM foydalanuvchilar WHERE rol = 'admin';\"`",
      solution: ["sqlite3 -box qaydnoma.db \"SELECT ism, email FROM foydalanuvchilar WHERE rol = 'admin';\""],
      check: (c) => sameSet(column(lastResult(c), 'ism'), names(c, "SELECT ism FROM foydalanuvchilar WHERE rol = 'admin'")),
    },
    {
      id: 'null',
      teach: ['sql:where IS NULL'],
      text: "Hech qachon tizimga kirmagan hisoblar (`oxirgi_kirish` bo'sh) — ishlatilmayotgan hisob xavfsizlik uchun xavf. Ularning ismini chiqaring.",
      hint: '`sqlite3 qaydnoma.db "SELECT ism FROM foydalanuvchilar WHERE oxirgi_kirish IS NULL;"` — `= NULL` hech narsa topmaydi: NULL bilan solishtirish natijasi ham NULL.',
      solution: ['sqlite3 qaydnoma.db "SELECT ism FROM foydalanuvchilar WHERE oxirgi_kirish IS NULL;"'],
      check: (c) => sameSet(column(lastResult(c), 'ism'), NEVER),
    },
    {
      id: 'order',
      teach: ['sql:order', 'sql:order DESC'],
      text: "Eng oxirgi ro'yxatdan o'tgan 3 foydalanuvchi: ism va `yaratilgan`, eng yangisi birinchi.",
      hint: '`sqlite3 -box qaydnoma.db "SELECT ism, yaratilgan FROM foydalanuvchilar ORDER BY yaratilgan DESC LIMIT 3;"`',
      solution: ['sqlite3 -box qaydnoma.db "SELECT ism, yaratilgan FROM foydalanuvchilar ORDER BY yaratilgan DESC LIMIT 3;"'],
      check: (c) => (column(lastResult(c), 'ism') ?? []).join() === names(c, 'SELECT ism FROM foydalanuvchilar ORDER BY yaratilgan DESC LIMIT 3').join(),
    },
    {
      id: 'group',
      teach: ['sql:group', 'sql:group COUNT'],
      text: 'Har bir rolda nechta foydalanuvchi bor?',
      hint: '`sqlite3 -box qaydnoma.db "SELECT rol, COUNT(*) AS soni FROM foydalanuvchilar GROUP BY rol;"`',
      solution: ['sqlite3 -box qaydnoma.db "SELECT rol, COUNT(*) AS soni FROM foydalanuvchilar GROUP BY rol;"'],
      check: (c) => lastResult(c)?.rows.length === 3 && hasRows(lastResult(c), exp(c, 'SELECT rol, COUNT(*) FROM foydalanuvchilar GROUP BY rol')),
    },
    {
      id: 'like',
      teach: ['sql:like', 'sql:like NOT LIKE'],
      text: "Kompaniya domenidan (`@qaydnoma.example.com`) boshqa pochta bilan ro'yxatdan o'tganlar kim?",
      hint: "`sqlite3 qaydnoma.db \"SELECT ism, email FROM foydalanuvchilar WHERE email NOT LIKE '%@qaydnoma.example.com';\"`",
      solution: ["sqlite3 qaydnoma.db \"SELECT ism, email FROM foydalanuvchilar WHERE email NOT LIKE '%@qaydnoma.example.com';\""],
      check: (c) => sameSet(column(lastResult(c), 'ism'), EXTERNAL),
    },
    {
      id: 'read',
      teach: ['sqlite3 .read'],
      text: "Uzunroq so'rov uchun **Kod** yorlig'iga o'ting. `sorov.sql` ga muvaffaqiyatsiz kirishlarni (`natija` = xato) IP bo'yicha sanaydigan, eng ko'pidan boshlab saralangan so'rov yozing va terminalda `.read` bilan bajaring.",
      hint: "sorov.sql ichiga:\n`SELECT ip, COUNT(*) AS urinishlar FROM kirish_jurnali WHERE natija = 'xato' GROUP BY ip ORDER BY urinishlar DESC;` — keyin `sqlite3 -box qaydnoma.db \".read sorov.sql\"`",
      solution: [`echo "${FAILS_BY_IP};" > sorov.sql`, 'sqlite3 -box qaydnoma.db ".read sorov.sql"'],
      check: (c) => c.line.includes('.read') && sameSet(column(lastResult(c), 0), exp(c, FAILS_BY_IP).map((r) => r[0]!)) && hasRows(lastResult(c), exp(c, FAILS_BY_IP).slice(0, 1)),
    },
    {
      id: 'having',
      teach: ['sql:group HAVING'],
      text: "Kamida 5 marta xato qilgan IP manzillarni qoldiring — bular odamning tasodifiy xatosi emas.",
      hint: "`... WHERE natija = 'xato' GROUP BY ip HAVING COUNT(*) >= 5 ORDER BY urinishlar DESC;` — WHERE guruhlashdan oldin, HAVING keyin filtrlaydi.",
      solution: [`echo "SELECT ip, COUNT(*) AS urinishlar FROM kirish_jurnali WHERE natija = 'xato' GROUP BY ip HAVING COUNT(*) >= 5 ORDER BY urinishlar DESC;" > sorov.sql`, 'sqlite3 -box qaydnoma.db ".read sorov.sql"'],
      check: (c) => sameSet(column(lastResult(c), 'ip'), names(c, ATTACK_IPS)),
    },
    {
      id: 'hours',
      teach: ['sql:date', 'sql:date strftime'],
      text: "18-noyabrda xatolar soat bo'yicha qanday taqsimlangan? Soatni `strftime('%H', vaqt)` bilan ajrating.",
      hint: "`SELECT strftime('%H', vaqt) AS soat, COUNT(*) FROM kirish_jurnali WHERE natija = 'xato' AND date(vaqt) = '2026-11-18' GROUP BY soat;` — 02 da keskin ko'tarilish.",
      solution: [`echo "SELECT strftime('%H', vaqt) AS soat, COUNT(*) AS soni FROM kirish_jurnali WHERE natija = 'xato' AND date(vaqt) = '2026-11-18' GROUP BY soat;" > sorov.sql`, 'sqlite3 -box qaydnoma.db ".read sorov.sql"'],
      check: (c) => hasRows(lastResult(c), exp(c, "SELECT strftime('%H', vaqt), COUNT(*) FROM kirish_jurnali WHERE natija = 'xato' AND date(vaqt) = '2026-11-18' GROUP BY 1")),
    },
    {
      id: 'winner',
      teach: ['sql:where AND'],
      text: `Hujum manzili (\`${ATTACKER}\`) dan **muvaffaqiyatli** kirish bo'lganmi? Qachon va qaysi hisobga?`,
      hint: `\`sqlite3 qaydnoma.db "SELECT vaqt, foydalanuvchi FROM kirish_jurnali WHERE ip = '${ATTACKER}' AND natija = 'ok';"\``,
      solution: [`sqlite3 qaydnoma.db "SELECT vaqt, foydalanuvchi FROM kirish_jurnali WHERE ip = '${ATTACKER}' AND natija = 'ok';"`],
      check: (c) => hasRows(lastResult(c), [['nodira']]) && lastResult(c)?.rows.length === 1,
    },
    {
      id: 'join',
      teach: ['sql:join', 'sql:join ON'],
      text: "Kimning qaydlari eng ko'p? `qaydlar` ni `foydalanuvchilar` bilan bog'lab, har foydalanuvchi uchun qaydlar sonini chiqaring (eng ko'pidan, 5 ta).",
      hint: "`SELECT f.ism, COUNT(*) AS qaydlar FROM qaydlar q JOIN foydalanuvchilar f ON q.egasi_id = f.id GROUP BY f.ism ORDER BY qaydlar DESC LIMIT 5;`",
      solution: [`echo "SELECT f.ism, COUNT(*) AS qaydlar FROM qaydlar q JOIN foydalanuvchilar f ON q.egasi_id = f.id GROUP BY f.ism ORDER BY qaydlar DESC LIMIT 5;" > sorov.sql`, 'sqlite3 -box qaydnoma.db ".read sorov.sql"'],
      check: (c) => lastResult(c)?.rows.length === 5 && hasRows(lastResult(c), exp(c, 'SELECT f.ism, COUNT(*) AS n FROM qaydlar q JOIN foydalanuvchilar f ON q.egasi_id = f.id GROUP BY f.ism ORDER BY n DESC LIMIT 1')),
    },
    {
      id: 'left-join',
      teach: ['sql:join LEFT JOIN'],
      text: "Birorta ham qaydi yo'q foydalanuvchilar kim? Oddiy JOIN ularni ko'rsatmaydi — `LEFT JOIN` kerak.",
      hint: "`SELECT f.ism FROM foydalanuvchilar f LEFT JOIN qaydlar q ON q.egasi_id = f.id WHERE q.id IS NULL;`",
      solution: [`echo "SELECT f.ism FROM foydalanuvchilar f LEFT JOIN qaydlar q ON q.egasi_id = f.id WHERE q.id IS NULL;" > sorov.sql`, 'sqlite3 qaydnoma.db ".read sorov.sql"'],
      check: (c) => sameSet(column(lastResult(c), 'ism'), NO_NOTES),
    },
    {
      id: 'shares',
      text: "Qaydlar kompaniyadan tashqariga ulashilganmi? `ulashishlar` ni `qaydlar` va `foydalanuvchilar` bilan bog'lang: qayd egasi, qayd sarlavhasi, kimga va qachon — faqat `@qaydnoma.example.com` bo'lmagan manzillar.",
      hint: "`SELECT f.ism, q.sarlavha, u.kimga, u.vaqt FROM ulashishlar u JOIN qaydlar q ON u.qayd_id = q.id JOIN foydalanuvchilar f ON q.egasi_id = f.id WHERE u.kimga NOT LIKE '%@qaydnoma.example.com';`",
      solution: [`echo "SELECT f.ism, q.sarlavha, u.kimga, u.vaqt FROM ulashishlar u JOIN qaydlar q ON u.qayd_id = q.id JOIN foydalanuvchilar f ON q.egasi_id = f.id WHERE u.kimga NOT LIKE '%@qaydnoma.example.com';" > sorov.sql`, 'sqlite3 -box qaydnoma.db ".read sorov.sql"'],
      check: (c) => hasRows(lastResult(c), [['nodira', 'drop.box@example.net']]) && lastResult(c)?.rows.length === 2,
    },
    {
      id: 'subquery',
      teach: ['sql:subquery', 'sql:subquery IN'],
      text: "Ichki so'rov: kamida 5 marta xato bo'lgan IP'lardan **muvaffaqiyatli** kirgan foydalanuvchilar (takrorsiz).",
      hint: "`SELECT DISTINCT foydalanuvchi FROM kirish_jurnali WHERE natija = 'ok' AND ip IN (SELECT ip FROM kirish_jurnali WHERE natija = 'xato' GROUP BY ip HAVING COUNT(*) >= 5);`",
      solution: [`echo "SELECT DISTINCT foydalanuvchi FROM kirish_jurnali WHERE natija = 'ok' AND ip IN (${ATTACK_IPS});" > sorov.sql`, 'sqlite3 qaydnoma.db ".read sorov.sql"'],
      check: (c) => sameSet(column(lastResult(c), 0), names(c, `SELECT DISTINCT foydalanuvchi FROM kirish_jurnali WHERE natija = 'ok' AND ip IN (${ATTACK_IPS})`)),
    },
    {
      id: 'update',
      teach: ['sql:update', 'sql:update WHERE'],
      text: "Buzilgan hisobni bloklang: `nodira` ning rolini `bloklangan` qiling. Avval xuddi shu WHERE bilan SELECT qilib, faqat bitta qator tanlanishiga ishonch hosil qiling — keyin UPDATE.",
      hint: "`sqlite3 qaydnoma.db \"SELECT id, ism, rol FROM foydalanuvchilar WHERE ism = 'nodira';\"`, keyin `sqlite3 qaydnoma.db \"UPDATE foydalanuvchilar SET rol = 'bloklangan' WHERE ism = 'nodira';\"`",
      solution: ["sqlite3 qaydnoma.db \"SELECT id, ism, rol FROM foydalanuvchilar WHERE ism = 'nodira';\"", "sqlite3 qaydnoma.db \"UPDATE foydalanuvchilar SET rol = 'bloklangan' WHERE ism = 'nodira';\""],
      check: (c) => {
        const r = queryDb(c.state, DB, "SELECT ism FROM foydalanuvchilar WHERE rol = 'bloklangan'");
        return r.rows.length === 1 && r.rows[0]![0] === 'nodira';
      },
    },
    {
      id: 'insert',
      teach: ['sql:insert'],
      text: "Insidentni qayd eting: `insidentlar` jadvaliga vaqt, sarlavha va holat (`ochiq`) bilan bitta yozuv qo'shing.",
      hint: "`sqlite3 qaydnoma.db \"INSERT INTO insidentlar (vaqt, sarlavha, holat) VALUES ('2026-11-18 02:17', 'nodira hisobi credential stuffing bilan buzilgan', 'ochiq');\"`",
      solution: ["sqlite3 qaydnoma.db \"INSERT INTO insidentlar (vaqt, sarlavha, holat) VALUES ('2026-11-18 02:17', 'nodira hisobi credential stuffing bilan buzilgan', 'ochiq');\""],
      check: (c) => queryDb(c.state, DB, "SELECT COUNT(*) FROM insidentlar WHERE holat = 'ochiq'").rows[0]?.[0] === 1,
    },
    {
      id: 'csv',
      teach: ['sqlite3 -csv', 'sqlite3 -header'],
      text: "Hisobot uchun: hujum manzillaridan kelgan barcha urinishlarni (vaqt, foydalanuvchi, ip, natija) sarlavhali CSV qilib `hisobot.csv` fayliga yozing.",
      hint: `\`sqlite3 -header -csv qaydnoma.db "SELECT vaqt, foydalanuvchi, ip, natija FROM kirish_jurnali WHERE ip IN (${ATTACK_IPS}) ORDER BY vaqt;" > hisobot.csv\`, keyin \`head -n 3 hisobot.csv\``,
      solution: [`sqlite3 -header -csv qaydnoma.db "SELECT vaqt, foydalanuvchi, ip, natija FROM kirish_jurnali WHERE ip IN (${ATTACK_IPS}) ORDER BY vaqt;" > hisobot.csv`, 'head -n 3 hisobot.csv'],
      check: (c) => {
        const csv = fileAt(c.state, `${SQL_DIR}/hisobot.csv`) ?? '';
        const want = queryDb(c.state, DB, `SELECT COUNT(*) FROM kirish_jurnali WHERE ip IN (${ATTACK_IPS})`).rows[0]?.[0];
        return csv.startsWith('vaqt,foydalanuvchi,ip,natija') && csv.trim().split('\n').length === Number(want) + 1;
      },
    },
    {
      id: 'challenge',
      challenge: true,
      text: "Mustaqil vazifa. Bitta so'rov bilan har bir hujum manzili (kamida 5 xato) uchun: IP, nechta **turli** hisob sinalgan, birinchi va oxirgi urinish vaqti va muvaffaqiyatli kirishlar soni. Eng ko'p hisob sinaganidan boshlab saralang.",
      hint: "GROUP BY ip va HAVING; `COUNT(DISTINCT foydalanuvchi)`, `MIN(vaqt)`, `MAX(vaqt)`; muvaffaqiyatlar uchun `SUM(CASE WHEN natija = 'ok' THEN 1 ELSE 0 END)` yoki `SUM(natija = 'ok')` (SQLite'da rost = 1).",
      solution: [`echo "SELECT ip, COUNT(DISTINCT foydalanuvchi) AS hisoblar, MIN(vaqt) AS boshi, MAX(vaqt) AS oxiri, SUM(natija = 'ok') AS kirgan FROM kirish_jurnali GROUP BY ip HAVING SUM(natija = 'xato') >= 5 ORDER BY hisoblar DESC;" > sorov.sql`, 'sqlite3 -box qaydnoma.db ".read sorov.sql"'],
      check: (c) => {
        const r = lastResult(c);
        const want = exp(c, `SELECT ip, COUNT(DISTINCT foydalanuvchi), MIN(vaqt), MAX(vaqt), SUM(natija = 'ok') FROM kirish_jurnali GROUP BY ip HAVING SUM(natija = 'xato') >= 5 ORDER BY 2 DESC`);
        return !!r && r.rows.length === want.length && sameSet(column(r, 0), want.map((w) => w[0]!)) && hasRows(r, want);
      },
    },
  ],
};
