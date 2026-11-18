import type { Lab } from '../types';
import { fileAt } from './helpers';

const HOME = '/home/talaba';

/* ── 1. Web server access log ──────────────────────────────────────────── */

export const SCANNER_IP = '198.51.100.23';
export const BRUTE_IP = '203.0.113.77';

/** A day of nginx traffic on qaydnoma.example.com: ordinary users, a scanner, then a password attack that succeeds. */
function buildAccessLog(): string {
  const lines: string[] = [];
  let sec = 0;
  const at = (h: number, m: number) => {
    sec = (sec + 17) % 60;
    return `18/Nov/2026:${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')} +0000`;
  };
  const add = (ip: string, time: string, req: string, status: number, size: number, ua: string, ref = '-') =>
    lines.push(`${ip} - - [${time}] "${req} HTTP/1.1" ${status} ${size} "${ref}" "${ua}"`);
  const browser = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/131.0';
  const mobile = 'Mozilla/5.0 (Linux; Android 14) Mobile Safari/537.36';

  // Morning: real users.
  add('10.10.20.31', at(8, 2), 'GET /', 200, 5120, browser);
  add('10.10.20.31', at(8, 2), 'GET /static/app.css', 200, 18044, browser, 'https://qaydnoma.example.com/');
  add('10.10.20.31', at(8, 3), 'POST /login', 302, 0, browser);
  add('10.10.20.31', at(8, 3), 'GET /notes', 200, 9312, browser);
  add('192.0.2.14', at(8, 15), 'GET /', 200, 5120, mobile);
  add('192.0.2.14', at(8, 16), 'POST /login', 302, 0, mobile);
  add('192.0.2.14', at(8, 16), 'GET /notes', 200, 4410, mobile);

  // 09:12 — a scanner walks through common paths.
  const scan = ['/admin', '/wp-admin/', '/phpmyadmin/', '/.env', '/backup.zip', '/.git/HEAD', '/config.php.bak', '/server-status', '/api/v1/debug/config', '/old/'];
  const codes: Record<string, number> = { '/.git/HEAD': 200, '/api/v1/debug/config': 401, '/admin': 302 };
  scan.forEach((path, i) => add(SCANNER_IP, at(9, 12 + Math.floor(i / 4)), `GET ${path}`, codes[path] ?? 404, codes[path] === 200 ? 23 : 162, 'Mozilla/5.00 (Nikto/2.5.0)'));
  // Path traversal attempts against the download endpoint.
  for (const file of ['../../../../etc/passwd', '..%2f..%2f..%2fetc%2fshadow', '../../app/config.py']) {
    add(SCANNER_IP, at(9, 16), `GET /download?file=${file}`, 400, 0, 'Mozilla/5.00 (Nikto/2.5.0)');
  }

  add('10.10.20.31', at(10, 40), 'GET /notes/1042', 200, 2210, browser);

  // 13:05 — a password attack on one account, then success.
  for (let i = 0; i < 14; i++) add(BRUTE_IP, at(13, 5 + Math.floor(i / 5)), 'POST /login', 401, 64, 'python-requests/2.32.3');
  add(BRUTE_IP, at(13, 8), 'POST /login', 302, 0, 'python-requests/2.32.3');
  add(BRUTE_IP, at(13, 8), 'GET /notes', 200, 1830, 'python-requests/2.32.3');
  add(BRUTE_IP, at(13, 9), 'GET /admin', 200, 7021, 'python-requests/2.32.3');
  add(BRUTE_IP, at(13, 9), 'GET /admin/export?format=csv', 200, 4813902, 'python-requests/2.32.3');

  add('192.0.2.14', at(14, 1), 'GET /notes', 200, 4410, mobile);
  return lines.join('\n') + '\n';
}

export const ACCESS_LOG = buildAccessLog();
const ACCESS_LINES = ACCESS_LOG.trimEnd().split('\n');
const BRUTE_401 = ACCESS_LINES.filter((l) => l.startsWith(BRUTE_IP) && l.includes('" 401 ')).length;

export const webLogInvestigation: Lab = {
  id: 'veb-log-tergovi',
  title: 'Veb-server loglari: hujumni qayta tiklash',
  summary: "nginx access.log ni awk, sort va uniq bilan tahlil qilish: skaner, path traversal urinishlari, parol hujumi va ma'lumot yuklab olinishi.",
  minutes: 35,
  level: 2,
  intro:
    "Qaydnoma'ning `/var/log/nginx/access.log` fayli. Kechqurun admin panelidan kimdir barcha qaydlarni CSV qilib yuklab olgani ma'lum bo'ldi. Siz — SOC analitigi: logdan voqealar ketma-ketligini tiklang.\n\n" +
    "Combined log formatida ustunlar bo'sh joy bilan ajratilgan: `$1` — IP, `$4` — vaqt, `$6` — metod, `$7` — yo'l, `$9` — status kodi, `$10` — javob hajmi (bayt). User-Agent qo'shtirnoq ichida — uni `awk -F'\"' '{print $6}'` bilan olish qulay.",
  shell: () => ({
    host: 'srv01',
    fs: {
      home: { talaba: {} },
      var: { log: { nginx: { 'access.log': ACCESS_LOG } } },
      tmp: {},
    },
    cwd: '/var/log/nginx',
  }),
  tasks: [
    {
      id: 'count',
      text: 'Logda nechta so\'rov bor?',
      hint: '`wc -l access.log`',
      solution: ['wc -l access.log'],
      check: ({ output }) => output.trim().startsWith(String(ACCESS_LINES.length)),
    },
    {
      id: 'top-ip',
      text: 'Qaysi IP manzillar eng ko\'p so\'rov yuborgan? Ro\'yxatni kamayish tartibida chiqaring.',
      hint: "`awk '{print $1}' access.log | sort | uniq -c | sort -rn`",
      solution: ["awk '{print $1}' access.log | sort | uniq -c | sort -rn"],
      check: ({ output }) => (output.split('\n')[0] ?? '').includes(BRUTE_IP) && output.includes(SCANNER_IP),
    },
    {
      id: 'status',
      text: 'Status kodlari qanday taqsimlangan? 404 va 401 ko\'pligi nimani anglatishi mumkin?',
      hint: "`awk '{print $9}' access.log | sort | uniq -c | sort -rn`",
      solution: ["awk '{print $9}' access.log | sort | uniq -c | sort -rn"],
      check: ({ output }) => output.includes(' 401') && output.includes(' 404'),
    },
    {
      id: 'ua',
      text: 'Qaysi dasturlar (User-Agent) so\'rov yuborgan? Avtomatik vositalarni ajrating.',
      hint: "`awk -F'\"' '{print $6}' access.log | sort | uniq -c` — qo'shtirnoq bo'yicha bo'lsak, 6-bo'lak User-Agent.",
      solution: ["awk -F'\"' '{print $6}' access.log | sort | uniq -c"],
      check: ({ output }) => output.includes('Nikto') && output.includes('python-requests'),
    },
    {
      id: 'scanner',
      text: `Skaner (${SCANNER_IP}) topgan narsalar: uning so'rovlaridan qaysi biri **200** bilan javob olgan?`,
      hint: `\`awk '$1 == "${SCANNER_IP}" && $9 == 200 {print $7}' access.log\` — bu yo'l haqiqatan ochiq qolgan (a2 xavfsiz sozlamalar).`,
      solution: [`awk '$1 == "${SCANNER_IP}" && $9 == 200 {print $7}' access.log`],
      check: ({ output }) => output.trim() === '/.git/HEAD',
    },
    {
      id: 'traversal',
      text: 'Fayl yo\'lini aylanib o\'tish (path traversal) urinishlarini toping. Ular muvaffaqiyatli bo\'lganmi?',
      hint: '`grep "/download" access.log` — status 400: ilova so\'rovni rad etgan.',
      solution: ['grep "/download" access.log'],
      check: ({ output }) => output.includes('etc/passwd') && output.includes('" 400 '),
    },
    {
      id: 'brute',
      text: 'Qaysi IP login sahifasiga ko\'p marta noto\'g\'ri parol yuborgan (401)?',
      hint: "`awk '$9 == 401 {print $1}' access.log | sort | uniq -c`",
      solution: ["awk '$9 == 401 {print $1}' access.log | sort | uniq -c"],
      check: ({ output }) => output.includes(`${BRUTE_401} ${BRUTE_IP}`),
    },
    {
      id: 'after',
      text: 'Urinishlardan keyin nima bo\'ldi? Shu IP ning 401 bo\'lmagan so\'rovlarini ko\'ring.',
      hint: `\`awk '$1 == "${BRUTE_IP}" && $9 != 401' access.log\` — 302 (kirdi), keyin /admin va katta hajmli eksport.`,
      solution: [`awk '$1 == "${BRUTE_IP}" && $9 != 401' access.log`],
      check: ({ output }) => output.includes('/admin/export') && !output.includes('" 401 '),
    },
    {
      id: 'evidence',
      text: 'Hujumchining barcha so\'rovlarini dalil sifatida uy katalogingizdagi `dalil-203.0.113.77.log` fayliga saqlang.',
      hint: `\`grep "^${BRUTE_IP} " access.log > ~/dalil-${BRUTE_IP}.log\`, tekshirish: \`wc -l ~/dalil-${BRUTE_IP}.log\``,
      solution: [`grep "^${BRUTE_IP} " access.log > ~/dalil-${BRUTE_IP}.log`],
      check: ({ state }) => {
        const saved = fileAt(state, `${HOME}/dalil-${BRUTE_IP}.log`) ?? '';
        const lines = saved.trimEnd().split('\n').filter(Boolean);
        return lines.length === ACCESS_LINES.filter((l) => l.startsWith(BRUTE_IP + ' ')).length && lines.every((l) => l.startsWith(BRUTE_IP));
      },
    },
  ],
};

/* ── 2. Windows security events (JSON export from a SIEM) ──────────────── */

export const RDP_IP = '198.51.100.40';

function buildEvents(): string {
  const ev: Record<string, unknown>[] = [];
  let n = 0;
  const t = (h: number, m: number, s: number) => `2026-11-17T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}Z`;
  const host = 'SRV-FILE-01';
  const push = (e: Record<string, unknown>) => ev.push({ TimeCreated: '', Computer: host, ...e, RecordId: 88000 + ++n });

  push({ TimeCreated: t(7, 58, 2), EventID: 4624, TargetUserName: 'd.karimova', IpAddress: '10.10.20.31', LogonType: 3 });
  push({ TimeCreated: t(8, 1, 40), EventID: 4624, TargetUserName: 'a.tursunov', IpAddress: '10.10.20.44', LogonType: 3 });
  // 02:10 — password spraying over RDP from the internet.
  const users = ['administrator', 'admin', 'svc_backup', 'scanner', 'administrator', 'svc_backup', 'admin', 'test', 'svc_backup', 'administrator', 'backup', 'svc_backup'];
  users.forEach((u, i) =>
    push({ TimeCreated: t(2, 10 + Math.floor(i / 3), (i * 11) % 60), EventID: 4625, TargetUserName: u, IpAddress: RDP_IP, LogonType: 10, Status: '0xC000006D' }),
  );
  push({ TimeCreated: t(2, 14, 51), EventID: 4624, TargetUserName: 'svc_backup', IpAddress: RDP_IP, LogonType: 10 });
  push({ TimeCreated: t(2, 14, 52), EventID: 4672, SubjectUserName: 'svc_backup', PrivilegeList: 'SeBackupPrivilege SeRestorePrivilege SeDebugPrivilege' });
  push({ TimeCreated: t(2, 18, 7), EventID: 4720, SubjectUserName: 'svc_backup', TargetUserName: 'helpdesk2' });
  push({ TimeCreated: t(2, 18, 30), EventID: 4732, SubjectUserName: 'svc_backup', MemberName: 'helpdesk2', TargetUserName: 'Administrators' });
  push({
    TimeCreated: t(2, 21, 3),
    EventID: 7045,
    SubjectUserName: 'svc_backup',
    ServiceName: 'WinUpdateSvc',
    ImagePath: 'C:\\Users\\Public\\svcupd.exe',
    StartType: 'auto start',
  });
  push({ TimeCreated: t(2, 26, 44), EventID: 1102, SubjectUserName: 'svc_backup' });
  push({ TimeCreated: t(8, 30, 15), EventID: 4624, TargetUserName: 'd.karimova', IpAddress: '10.10.20.31', LogonType: 3 });
  // Keep the file in time order, as a SIEM export would be.
  ev.sort((a, b) => String(a.TimeCreated).localeCompare(String(b.TimeCreated)));
  return ev.map((e) => JSON.stringify(e)).join('\n') + '\n';
}

export const SECURITY_EVENTS = buildEvents();
const FAILED_FROM_RDP = SECURITY_EVENTS.split('\n').filter((l) => l.includes('"EventID":4625')).length;

export const windowsEvents: Lab = {
  id: 'windows-hodisalari',
  title: 'Windows hodisalari: RDP orqali kirish',
  summary: "SIEM'dan eksport qilingan Windows Security hodisalarini jq bilan tahlil qilish: 4625, 4624, 4672, 4720, 4732, 7045, 1102.",
  minutes: 35,
  level: 3,
  intro:
    "Fayl serveri `SRV-FILE-01` dan kechasi g'alati faollik haqida ogohlantirish keldi. SIEM'dan shu server hodisalarini JSON Lines formatida (har qatorda bitta JSON obyekt) eksport qildingiz: `security.json`.\n\n" +
    "Bu labda `jq` ishlatiladi — JSON bilan ishlashning asosiy vositasi. Asosiy shakllar: `jq .` (chiroyli chiqarish), `jq -r '.Maydon'` (qiymatni qo'shtirnoqsiz), `jq 'select(.EventID == 4625)'` (filtr), `jq -r '[.a, .b] | @tsv'` (bir nechta maydon jadval ko'rinishida).\n\n" +
    "Event ID'larni b1 bosqichidan eslang: 4625 — muvaffaqiyatsiz kirish, 4624 — muvaffaqiyatli, LogonType 10 — RDP.",
  shell: () => ({
    fs: {
      home: { talaba: { 'security.json': SECURITY_EVENTS } },
      tmp: {},
    },
  }),
  tasks: [
    {
      id: 'first',
      text: 'Fayldagi birinchi hodisani chiroyli ko\'rinishda chiqaring va qaysi maydonlar borligini ko\'ring.',
      hint: '`head -n 1 security.json | jq .`',
      solution: ['head -n 1 security.json | jq .'],
      check: ({ output }) => output.includes('"EventID"') && output.includes('\n'),
    },
    {
      id: 'ids',
      text: 'Har bir Event ID necha marta uchraydi?',
      hint: "`jq -r '.EventID' security.json | sort | uniq -c | sort -rn`",
      solution: ["jq -r '.EventID' security.json | sort | uniq -c | sort -rn"],
      check: ({ output }) => output.includes(`${FAILED_FROM_RDP} 4625`),
    },
    {
      id: 'spray',
      text: 'Muvaffaqiyatsiz kirishlar (4625) qaysi IP dan va qaysi akkauntlarga bo\'lgan?',
      hint: "`jq -r 'select(.EventID == 4625) | [.IpAddress, .TargetUserName] | @tsv' security.json | sort | uniq -c` — bir IP, ko'p akkaunt: password spraying.",
      solution: ["jq -r 'select(.EventID == 4625) | [.IpAddress, .TargetUserName] | @tsv' security.json | sort | uniq -c"],
      check: ({ output }) => output.includes(RDP_IP) && output.includes('svc_backup') && output.includes('administrator'),
    },
    {
      id: 'success',
      text: 'Shu IP dan muvaffaqiyatli kirish (4624) bo\'lganmi? Qaysi akkaunt bilan?',
      hint: `\`jq -c 'select(.EventID == 4624 and .IpAddress == "${RDP_IP}")' security.json\``,
      solution: [`jq -c 'select(.EventID == 4624 and .IpAddress == "${RDP_IP}")' security.json`],
      check: ({ output }) => output.includes('"TargetUserName":"svc_backup"') && output.includes('"LogonType":10'),
    },
    {
      id: 'actions',
      text: 'Kirgan akkaunt keyin nima qildi? `svc_backup` nomidan bajarilgan hodisalarni vaqt, Event ID va nishon bilan chiqaring.',
      hint: "`jq -r 'select(.SubjectUserName == \"svc_backup\") | [.TimeCreated, .EventID, .TargetUserName] | @tsv' security.json`",
      solution: ["jq -r 'select(.SubjectUserName == \"svc_backup\") | [.TimeCreated, .EventID, .TargetUserName] | @tsv' security.json"],
      check: ({ output }) => output.includes('4720') && output.includes('helpdesk2') && output.includes('4732'),
    },
    {
      id: 'group',
      text: 'Yangi akkaunt qaysi guruhga qo\'shilgan (4732)?',
      hint: "`jq -c 'select(.EventID == 4732)' security.json` — MemberName: kim qo'shildi, TargetUserName: qaysi guruhga.",
      solution: ["jq -c 'select(.EventID == 4732)' security.json"],
      check: ({ output }) => output.includes('"TargetUserName":"Administrators"') && output.includes('helpdesk2'),
    },
    {
      id: 'service',
      text: 'Hujumchi kirishni saqlab qolish (persistence) uchun xizmat o\'rnatgan (7045). Xizmat qaysi faylni ishga tushiradi?',
      hint: "`jq -r 'select(.EventID == 7045) | [.ServiceName, .ImagePath] | @tsv' security.json` — C:\\Users\\Public dan ishlaydigan xizmat juda shubhali.",
      solution: ["jq -r 'select(.EventID == 7045) | [.ServiceName, .ImagePath] | @tsv' security.json"],
      check: ({ output }) => output.includes('WinUpdateSvc') && output.includes('C:\\Users\\Public\\svcupd.exe'),
    },
    {
      id: 'cleared',
      text: 'Oxirida hujumchi izlarini yashirishga urindi. Qaysi hodisa buni ko\'rsatadi va qachon bo\'lgan?',
      hint: "`jq -r 'select(.EventID == 1102) | [.TimeCreated, .SubjectUserName] | @tsv' security.json` — 1102: Security jurnali tozalandi. SIEM'ga yuborilgan nusxa saqlanib qoldi.",
      solution: ["jq -r 'select(.EventID == 1102) | [.TimeCreated, .SubjectUserName] | @tsv' security.json"],
      check: ({ output }) => output.includes('2026-11-17T02:26:44Z') && output.includes('svc_backup'),
    },
  ],
};
