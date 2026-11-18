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
const BRUTE_LINES = ACCESS_LINES.filter((l) => l.startsWith(BRUTE_IP + ' ')).length;
const UNIQUE_IPS = new Set(ACCESS_LINES.map((l) => l.split(' ')[0])).size;
const COUNT_404 = ACCESS_LINES.filter((l) => l.split(' ')[8] === '404').length;
const NIKTO_COUNT = ACCESS_LINES.filter((l) => l.includes('Nikto')).length;
const EXTERNAL_COUNT = ACCESS_LINES.filter((l) => !l.startsWith('10.')).length;

export const webLogInvestigation: Lab = {
  id: 'veb-log-tergovi',
  title: 'Veb-server loglari: hujumni qayta tiklash',
  summary: "nginx access.log ni awk, sort va uniq bilan tahlil qilish: skaner, path traversal urinishlari, parol hujumi va ma'lumot yuklab olinishi.",
  minutes: 50,
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
      id: 'head',
      teach: ['head', 'head -n N'],
      text: 'Log formatini ko\'rish uchun birinchi 3 qatorni chiqaring.',
      hint: '`head -n 3 access.log` — IP, vaqt, so\'rov, status, hajm, User-Agent.',
      solution: ['head -n 3 access.log'],
      check: ({ line, output }) => /\bhead\b/.test(line) && output.split('\n').length === 3,
    },
    {
      id: 'count',
      teach: ['wc -l'],
      text: 'Logda nechta so\'rov bor?',
      hint: '`wc -l access.log`',
      solution: ['wc -l access.log'],
      check: ({ output }) => output.trim().startsWith(String(ACCESS_LINES.length)),
    },
    {
      id: 'tail',
      teach: ['tail -n N'],
      text: 'Kunning oxirgi 2 ta so\'rovini ko\'ring.',
      hint: '`tail -n 2 access.log`',
      solution: ['tail -n 2 access.log'],
      check: ({ line, output }) => /\btail\b/.test(line) && output.split('\n').length === 2,
    },
    {
      id: 'unique',
      teach: ['awk', 'awk {print $N}', 'sort -u'],
      text: 'Kun davomida nechta **turli** IP manzil saytga murojaat qilgan?',
      hint: "`awk '{print $1}' access.log | sort -u | wc -l` — $1: birinchi ustun (IP), sort -u: takrorsiz.",
      solution: ["awk '{print $1}' access.log | sort -u | wc -l"],
      check: ({ output }) => output.trim() === String(UNIQUE_IPS),
    },
    {
      id: 'top-ip',
      teach: ['uniq -c', 'sort -n', 'sort -r'],
      text: 'Qaysi IP manzillar eng ko\'p so\'rov yuborgan? Ro\'yxatni kamayish tartibida chiqaring.',
      hint: "`awk '{print $1}' access.log | sort | uniq -c | sort -rn`",
      solution: ["awk '{print $1}' access.log | sort | uniq -c | sort -rn"],
      check: ({ output }) => (output.split('\n')[0] ?? '').includes(BRUTE_IP) && output.includes(SCANNER_IP),
    },
    {
      id: 'status',
      text: 'Status kodlari qanday taqsimlangan? 404 va 401 ko\'pligi nimani anglatishi mumkin?',
      hint: "`awk '{print $9}' access.log | sort | uniq -c | sort -rn` — 404: mavjud bo'lmagan sahifa (skaner), 401: noto'g'ri parol.",
      solution: ["awk '{print $9}' access.log | sort | uniq -c | sort -rn"],
      check: ({ output }) => output.includes(' 401') && output.includes(' 404'),
    },
    {
      id: '404',
      teach: ['awk SHART'],
      text: 'Nechta so\'rov 404 bilan javob olgan? Faqat son bo\'lsin.',
      hint: "`awk '$9 == 404' access.log | wc -l` — shartdan keyin { print } yozilmasa, butun qator chiqadi.",
      solution: ["awk '$9 == 404' access.log | wc -l"],
      check: ({ output }) => output.trim() === String(COUNT_404),
    },
    {
      id: 'ua',
      teach: ['awk -F BELGI'],
      text: 'Qaysi dasturlar (User-Agent) so\'rov yuborgan? Avtomatik vositalarni ajrating.',
      hint: "`awk -F'\"' '{print $6}' access.log | sort | uniq -c` — qo'shtirnoq bo'yicha bo'lsak, 6-bo'lak User-Agent.",
      solution: ["awk -F'\"' '{print $6}' access.log | sort | uniq -c"],
      check: ({ output }) => output.includes('Nikto') && output.includes('python-requests'),
    },
    {
      id: 'nikto',
      teach: ['grep -c'],
      text: 'Nikto skaneri nechta so\'rov yuborgan?',
      hint: '`grep -c Nikto access.log`',
      solution: ['grep -c Nikto access.log'],
      check: ({ output }) => output.trim() === String(NIKTO_COUNT),
    },
    {
      id: 'external',
      teach: ['grep -v'],
      text: 'Ichki tarmoqdan (10.x) bo\'lmagan so\'rovlar soni qancha?',
      hint: '`grep -v "^10\\." access.log | wc -l` — ^: qator boshi, \\.: haqiqiy nuqta.',
      solution: ['grep -v "^10\\." access.log | wc -l'],
      check: ({ output }) => output.trim() === String(EXTERNAL_COUNT),
    },
    {
      id: 'scanner',
      teach: ['awk &&'],
      text: `Skaner (${SCANNER_IP}) topgan narsalar: uning so'rovlaridan qaysi biri **200** bilan javob olgan?`,
      hint: `\`awk '$1 == "${SCANNER_IP}" && $9 == 200 {print $7}' access.log\` — bu yo'l haqiqatan ochiq qolgan (a2 xavfsiz sozlamalar).`,
      solution: [`awk '$1 == "${SCANNER_IP}" && $9 == 200 {print $7}' access.log`],
      check: ({ output }) => output.trim() === '/.git/HEAD',
    },
    {
      id: 'git',
      teach: ['grep -F'],
      text: '`.git` katalogiga kimlar murojaat qilgan? Nuqtani regex emas, oddiy belgi sifatida qidiring.',
      hint: '`grep -F "/.git" access.log` — -F bilan nuqta "istalgan belgi" emas, aynan nuqta.',
      solution: ['grep -F "/.git" access.log'],
      check: ({ output }) => output.includes('/.git/HEAD') && output.split('\n').length === 1,
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
      id: 'brute-start',
      text: 'Parol hujumi qachon boshlangan? Shu IP ning birinchi so\'rovini chiqaring.',
      hint: `\`grep "^${BRUTE_IP} " access.log | head -n 1\` — 13:05.`,
      solution: [`grep "^${BRUTE_IP} " access.log | head -n 1`],
      check: ({ output }) => output.split('\n').length === 1 && output.includes('13:05') && output.includes(' 401 '),
    },
    {
      id: 'after',
      text: 'Urinishlardan keyin nima bo\'ldi? Shu IP ning 401 bo\'lmagan so\'rovlarini ko\'ring.',
      hint: `\`awk '$1 == "${BRUTE_IP}" && $9 != 401' access.log\` — 302 (kirdi), keyin /admin va katta hajmli eksport.`,
      solution: [`awk '$1 == "${BRUTE_IP}" && $9 != 401' access.log`],
      check: ({ output }) => output.includes('/admin/export') && !output.includes('" 401 '),
    },
    {
      id: 'big',
      text: 'Hajmi 1 MB dan katta javoblarni toping: kim, qaysi yo\'l, necha bayt?',
      hint: "`awk '$10 > 1000000 {print $1, $7, $10}' access.log` — $10: javob hajmi baytlarda.",
      solution: ["awk '$10 > 1000000 {print $1, $7, $10}' access.log"],
      check: ({ output }) => output.includes(BRUTE_IP) && output.includes('/admin/export'),
    },
    {
      id: 'lines',
      teach: ['grep -n'],
      text: 'Admin sahifalariga bo\'lgan so\'rovlar logning nechanchi qatorlarida?',
      hint: '`grep -n "/admin" access.log`',
      solution: ['grep -n "/admin" access.log'],
      check: ({ output }) => /^\d+:.*\/admin\/export/m.test(output),
    },
    {
      id: 'evidence',
      text: 'Hujumchining barcha so\'rovlarini dalil sifatida uy katalogingizdagi `dalil-203.0.113.77.log` fayliga saqlang.',
      hint: `\`grep "^${BRUTE_IP} " access.log > ~/dalil-${BRUTE_IP}.log\`, tekshirish: \`wc -l ~/dalil-${BRUTE_IP}.log\``,
      solution: [`grep "^${BRUTE_IP} " access.log > ~/dalil-${BRUTE_IP}.log`],
      check: ({ state }) => {
        const saved = fileAt(state, `${HOME}/dalil-${BRUTE_IP}.log`) ?? '';
        const lines = saved.trimEnd().split('\n').filter(Boolean);
        return lines.length === BRUTE_LINES && lines.every((l) => l.startsWith(BRUTE_IP));
      },
    },
    {
      id: 'timeline',
      teach: ['tee'],
      text: 'Hisobot uchun hujumchining vaqt chizig\'ini tuzing: vaqt, metod, yo\'l va status. Natijani ekranda ko\'ring va ayni paytda `~/vaqt-chizigi.txt` ga saqlang.',
      hint: `\`awk '$1 == "${BRUTE_IP}" {print $4, $6, $7, $9}' access.log | tee ~/vaqt-chizigi.txt\``,
      solution: [`awk '$1 == "${BRUTE_IP}" {print $4, $6, $7, $9}' access.log | tee ~/vaqt-chizigi.txt`],
      check: ({ output, state }) => output.includes('/admin/export') && (fileAt(state, `${HOME}/vaqt-chizigi.txt`) ?? '').split('\n').filter(Boolean).length === BRUTE_LINES,
    },
    {
      id: 'challenge',
      challenge: true,
      text: 'Mustaqil vazifa: hujumchi yuklab olgan eksport faylining hajmi necha bayt? Natija faqat son bo\'lsin.',
      hint: "Yo'l bo'yicha regex sharti: `awk '$7 ~ /export/ {print $10}' access.log`",
      solution: ["awk '$7 ~ /export/ {print $10}' access.log"],
      check: ({ output }) => output.trim() === '4813902',
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

  // Ordinary office traffic, including one mistyped password.
  push({ TimeCreated: t(7, 57, 40), EventID: 4625, TargetUserName: 'd.karimova', IpAddress: '10.10.20.31', LogonType: 3, Status: '0xC000006A' });
  push({ TimeCreated: t(7, 58, 2), EventID: 4624, TargetUserName: 'd.karimova', IpAddress: '10.10.20.31', LogonType: 3 });
  push({ TimeCreated: t(8, 1, 40), EventID: 4624, TargetUserName: 'a.tursunov', IpAddress: '10.10.20.44', LogonType: 3 });
  push({ TimeCreated: t(8, 45, 12), EventID: 4624, TargetUserName: 'b.aliyev', IpAddress: '10.10.20.52', LogonType: 3 });
  // 02:10 — password spraying over RDP from the internet.
  const users = ['administrator', 'admin', 'svc_backup', 'scanner', 'administrator', 'svc_backup', 'admin', 'test', 'svc_backup', 'administrator', 'backup', 'svc_backup'];
  users.forEach((u, i) =>
    push({ TimeCreated: t(2, 10 + Math.floor(i / 3), (i * 11) % 60), EventID: 4625, TargetUserName: u, IpAddress: RDP_IP, LogonType: 10, Status: '0xC000006D' }),
  );
  push({ TimeCreated: t(2, 13, 40), EventID: 4740, TargetUserName: 'administrator', SubjectUserName: 'SRV-FILE-01$' });
  push({ TimeCreated: t(2, 14, 51), EventID: 4624, TargetUserName: 'svc_backup', IpAddress: RDP_IP, LogonType: 10 });
  push({ TimeCreated: t(2, 14, 52), EventID: 4672, SubjectUserName: 'svc_backup', PrivilegeList: 'SeBackupPrivilege SeRestorePrivilege SeDebugPrivilege' });
  const proc = (h: number, m: number, s: number, image: string, cmd: string) =>
    push({ TimeCreated: t(h, m, s), EventID: 4688, SubjectUserName: 'svc_backup', NewProcessName: image, CommandLine: cmd, ParentProcessName: 'C:\\Windows\\System32\\cmd.exe' });
  proc(2, 15, 20, 'C:\\Windows\\System32\\whoami.exe', 'whoami /all');
  proc(2, 16, 5, 'C:\\Windows\\System32\\net.exe', 'net localgroup administrators');
  push({ TimeCreated: t(2, 18, 7), EventID: 4720, SubjectUserName: 'svc_backup', TargetUserName: 'helpdesk2' });
  push({ TimeCreated: t(2, 18, 30), EventID: 4732, SubjectUserName: 'svc_backup', MemberName: 'helpdesk2', TargetUserName: 'Administrators' });
  proc(2, 20, 40, 'C:\\Users\\Public\\svcupd.exe', 'C:\\Users\\Public\\svcupd.exe -install');
  push({
    TimeCreated: t(2, 21, 3),
    EventID: 7045,
    SubjectUserName: 'svc_backup',
    ServiceName: 'WinUpdateSvc',
    ImagePath: 'C:\\Users\\Public\\svcupd.exe',
    StartType: 'auto start',
  });
  push({ TimeCreated: t(2, 26, 44), EventID: 1102, SubjectUserName: 'svc_backup' });
  push({ TimeCreated: t(2, 27, 30), EventID: 4634, TargetUserName: 'svc_backup', LogonType: 10 });
  push({ TimeCreated: t(8, 30, 15), EventID: 4624, TargetUserName: 'd.karimova', IpAddress: '10.10.20.31', LogonType: 3 });
  // Keep the file in time order, as a SIEM export would be.
  ev.sort((a, b) => String(a.TimeCreated).localeCompare(String(b.TimeCreated)));
  return ev.map((e) => JSON.stringify(e)).join('\n') + '\n';
}

export const SECURITY_EVENTS = buildEvents();
type Ev = Record<string, string | number | undefined>;
const EVENTS = SECURITY_EVENTS.trim().split('\n').map((l) => JSON.parse(l) as Ev);
const FAILED_TOTAL = EVENTS.filter((e) => e.EventID === 4625).length;
const NIGHT_COUNT = EVENTS.filter((e) => String(e.TimeCreated) >= '2026-11-17T02:00' && String(e.TimeCreated) < '2026-11-17T03:00').length;
const ATTACKER_EVENTS = EVENTS.filter((e) => e.IpAddress === RDP_IP || e.SubjectUserName === 'svc_backup').length;
const SVC_FAILS = EVENTS.filter((e) => e.EventID === 4625 && e.TargetUserName === 'svc_backup').length;

export const windowsEvents: Lab = {
  id: 'windows-hodisalari',
  title: 'Windows hodisalari: RDP orqali kirish',
  summary: "SIEM'dan eksport qilingan Windows Security hodisalarini jq bilan tahlil qilish: 4625, 4740, 4624, 4672, 4688, 4720, 4732, 7045, 1102, 4634.",
  minutes: 50,
  level: 3,
  intro:
    "Fayl serveri `SRV-FILE-01` dan kechasi g'alati faollik haqida ogohlantirish keldi. SIEM'dan shu server hodisalarini JSON Lines formatida (har qatorda bitta JSON obyekt) eksport qildingiz: `security.json`.\n\n" +
    "Bu labda `jq` ishlatiladi — JSON bilan ishlashning asosiy vositasi. Asosiy shakllar: `jq .` (chiroyli chiqarish), `jq -r '.Maydon'` (qiymatni qo'shtirnoqsiz), `jq 'select(.EventID == 4625)'` (filtr), `jq -r '[.a, .b] | @tsv'` (bir nechta maydon jadval ko'rinishida).\n\n" +
    "Event ID'larni b1 bosqichidan eslang: 4625 — muvaffaqiyatsiz kirish, 4624 — muvaffaqiyatli, LogonType 10 — RDP, LogonType 3 — tarmoq (masalan, umumiy papka).",
  shell: () => ({
    fs: {
      home: { talaba: { 'security.json': SECURITY_EVENTS } },
      tmp: {},
    },
  }),
  tasks: [
    {
      id: 'count',
      teach: ['wc -l'],
      text: 'Eksportda nechta hodisa bor? (Har qatorda bitta hodisa.)',
      hint: '`wc -l security.json`',
      solution: ['wc -l security.json'],
      check: ({ output }) => output.trim().startsWith(String(EVENTS.length)),
    },
    {
      id: 'first',
      teach: ['jq', 'jq .'],
      text: 'Fayldagi birinchi hodisani chiroyli ko\'rinishda chiqaring va qaysi maydonlar borligini ko\'ring.',
      hint: '`head -n 1 security.json | jq .`',
      solution: ['head -n 1 security.json | jq .'],
      check: ({ output }) => output.includes('"EventID"') && output.includes('\n'),
    },
    {
      id: 'keys',
      teach: ['jq keys'],
      text: 'Birinchi hodisaning faqat maydon nomlarini bir qatorda chiqaring.',
      hint: "`head -n 1 security.json | jq -c 'keys'` — keys: maydon nomlari alifbo tartibida.",
      solution: ["head -n 1 security.json | jq -c 'keys'"],
      check: ({ output }) => output.trim().startsWith('[') && output.includes('"EventID"') && output.includes('"TimeCreated"'),
    },
    {
      id: 'total',
      teach: ['jq -s', 'jq length'],
      text: 'Hodisalar sonini endi jq bilan sanang: hamma qatorlarni bitta massivga yig\'ib, uzunligini oling.',
      hint: "`jq -s 'length' security.json` — wc -l bilan bir xil son chiqishi kerak.",
      solution: ["jq -s 'length' security.json"],
      check: ({ output }) => output.trim() === String(EVENTS.length),
    },
    {
      id: 'ids',
      teach: ['jq .maydon', 'jq -r'],
      text: 'Har bir Event ID necha marta uchraydi?',
      hint: "`jq -r '.EventID' security.json | sort | uniq -c | sort -rn`",
      solution: ["jq -r '.EventID' security.json | sort | uniq -c | sort -rn"],
      check: ({ output }) => output.includes(`${FAILED_TOTAL} 4625`),
    },
    {
      id: 'failed',
      teach: ['jq select(SHART)', 'jq -c'],
      text: 'Faqat muvaffaqiyatsiz kirishlarni (4625) har birini bir qatorda chiqaring va sanang.',
      hint: "`jq -c 'select(.EventID == 4625)' security.json | wc -l`",
      solution: ["jq -c 'select(.EventID == 4625)' security.json | wc -l"],
      check: ({ line, output }) => /select/.test(line) && output.trim() === String(FAILED_TOTAL),
    },
    {
      id: 'spray',
      teach: ['jq [.a, .b] | @tsv'],
      text: 'Muvaffaqiyatsiz kirishlar qaysi IP dan va qaysi akkauntlarga bo\'lgan?',
      hint: "`jq -r 'select(.EventID == 4625) | [.IpAddress, .TargetUserName] | @tsv' security.json | sort | uniq -c` — bir IP, ko'p akkaunt: password spraying.",
      solution: ["jq -r 'select(.EventID == 4625) | [.IpAddress, .TargetUserName] | @tsv' security.json | sort | uniq -c"],
      check: ({ output }) => output.includes(RDP_IP) && output.includes('svc_backup') && output.includes('administrator'),
    },
    {
      id: 'internal',
      teach: ['jq and / or'],
      text: 'Bitta muvaffaqiyatsiz kirish ichki tarmoqdan (LogonType 3). Uni toping — bu hujummi yoki xato terilgan parolmi?',
      hint: "`jq -c 'select(.EventID == 4625 and .LogonType == 3)' security.json` — d.karimova 22 soniyadan keyin muvaffaqiyatli kirgan: oddiy xato.",
      solution: ["jq -c 'select(.EventID == 4625 and .LogonType == 3)' security.json"],
      check: ({ output }) => output.includes('d.karimova') && !output.includes(RDP_IP),
    },
    {
      id: 'unique',
      teach: ['jq map(F)', 'jq unique'],
      text: 'Hujumchi qaysi akkaunt nomlarini sinab ko\'rgan? Takrorsiz ro\'yxatni bitta JSON massiv qilib chiqaring.',
      hint: "`jq -s -c 'map(select(.EventID == 4625 and .LogonType == 10) | .TargetUserName) | unique' security.json`",
      solution: ["jq -s -c 'map(select(.EventID == 4625 and .LogonType == 10) | .TargetUserName) | unique' security.json"],
      check: ({ output }) => output.trim() === '["admin","administrator","backup","scanner","svc_backup","test"]',
    },
    {
      id: 'start',
      text: 'Hujum qachon boshlangan? Shu IP dan kelgan birinchi hodisaning vaqtini chiqaring.',
      hint: `\`jq -r 'select(.IpAddress == "${RDP_IP}") | .TimeCreated' security.json | head -n 1\``,
      solution: [`jq -r 'select(.IpAddress == "${RDP_IP}") | .TimeCreated' security.json | head -n 1`],
      check: ({ output }) => output.trim() === '2026-11-17T02:10:00Z',
    },
    {
      id: 'lockout',
      text: 'Qaysi akkaunt bloklangan (4740)? Bloklash siyosati qaysi akkauntni himoya qildi?',
      hint: "`jq -c 'select(.EventID == 4740)' security.json` — administrator 3 marta xato kiritilgandan keyin bloklangan.",
      solution: ["jq -c 'select(.EventID == 4740)' security.json"],
      check: ({ output }) => output.includes('"EventID":4740') && output.includes('administrator'),
    },
    {
      id: 'success',
      text: 'Hujumchi IP sidan muvaffaqiyatli kirish (4624) bo\'lganmi? Qaysi akkaunt bilan?',
      hint: `\`jq -c 'select(.EventID == 4624 and .IpAddress == "${RDP_IP}")' security.json\` — svc_backup ga bloklash qo'llanmagan edi.`,
      solution: [`jq -c 'select(.EventID == 4624 and .IpAddress == "${RDP_IP}")' security.json`],
      check: ({ output }) => output.includes('"TargetUserName":"svc_backup"') && output.includes('"LogonType":10'),
    },
    {
      id: 'night',
      text: 'Tungi soat 02:00 dan 03:00 gacha nechta hodisa bo\'lgan? Vaqtni matn sifatida solishtiring.',
      hint: "`jq -c 'select(.TimeCreated >= \"2026-11-17T02:00\" and .TimeCreated < \"2026-11-17T03:00\")' security.json | wc -l` — ISO vaqt matn sifatida ham to'g'ri tartiblanadi.",
      solution: ["jq -c 'select(.TimeCreated >= \"2026-11-17T02:00\" and .TimeCreated < \"2026-11-17T03:00\")' security.json | wc -l"],
      check: ({ output }) => output.trim() === String(NIGHT_COUNT),
    },
    {
      id: 'privs',
      text: 'Kirish bilan birga akkauntga qanday maxsus huquqlar berilgan (4672)?',
      hint: "`jq -r 'select(.EventID == 4672) | .PrivilegeList' security.json` — SeDebugPrivilege: boshqa jarayonlar xotirasiga kirish; zaxira akkaunti uchun ortiqcha.",
      solution: ["jq -r 'select(.EventID == 4672) | .PrivilegeList' security.json"],
      check: ({ output }) => output.includes('SeDebugPrivilege'),
    },
    {
      id: 'procs',
      text: 'Kirgandan keyin qanday dasturlar ishga tushirilgan (4688)? Vaqt va buyruq qatorini chiqaring.',
      hint: "`jq -r 'select(.EventID == 4688) | [.TimeCreated, .CommandLine] | @tsv' security.json` — whoami va net localgroup: hujumchi o'z huquqlarini va adminlarni o'rganmoqda.",
      solution: ["jq -r 'select(.EventID == 4688) | [.TimeCreated, .CommandLine] | @tsv' security.json"],
      check: ({ output }) => output.includes('whoami /all') && output.includes('net localgroup administrators'),
    },
    {
      id: 'actions',
      text: '`svc_backup` nomidan bajarilgan barcha hodisalarni vaqt, Event ID va nishon bilan chiqaring.',
      hint: "`jq -r 'select(.SubjectUserName == \"svc_backup\") | [.TimeCreated, .EventID, .TargetUserName] | @tsv' security.json`",
      solution: ["jq -r 'select(.SubjectUserName == \"svc_backup\") | [.TimeCreated, .EventID, .TargetUserName] | @tsv' security.json"],
      check: ({ output }) => output.includes('4720') && output.includes('helpdesk2') && output.includes('4732'),
    },
    {
      id: 'group',
      text: 'Yangi yaratilgan akkaunt qaysi guruhga qo\'shilgan (4732)?',
      hint: "`jq -c 'select(.EventID == 4732)' security.json` — MemberName: kim qo'shildi, TargetUserName: qaysi guruhga.",
      solution: ["jq -c 'select(.EventID == 4732)' security.json"],
      check: ({ output }) => output.includes('"TargetUserName":"Administrators"') && output.includes('helpdesk2'),
    },
    {
      id: 'public',
      teach: ['jq test(REGEX)'],
      text: '`C:\\Users\\Public` — hamma yoza oladigan papka. U yerdan ishga tushgan jarayonni regex bilan toping.',
      hint: "`jq -r 'select(.NewProcessName | test(\"Public\")) | .CommandLine' security.json`",
      solution: ["jq -r 'select(.NewProcessName | test(\"Public\")) | .CommandLine' security.json"],
      check: ({ output }) => output.trim() === 'C:\\Users\\Public\\svcupd.exe -install',
    },
    {
      id: 'service',
      text: 'Shu dastur o\'zini xizmat sifatida o\'rnatgan (7045). Xizmat nomi nima va qachon avtomatik ishga tushadi?',
      hint: "`jq -r 'select(.EventID == 7045) | [.ServiceName, .ImagePath, .StartType] | @tsv' security.json` — auto start: har yuklanishda. Bu persistence.",
      solution: ["jq -r 'select(.EventID == 7045) | [.ServiceName, .ImagePath, .StartType] | @tsv' security.json"],
      check: ({ output }) => output.includes('WinUpdateSvc') && output.includes('auto start'),
    },
    {
      id: 'cleared',
      text: 'Hujumchi izlarini yashirishga urindi. Qaysi hodisa buni ko\'rsatadi va qachon bo\'lgan?',
      hint: "`jq -r 'select(.EventID == 1102) | [.TimeCreated, .SubjectUserName] | @tsv' security.json` — 1102: Security jurnali tozalandi. SIEM'ga yuborilgan nusxa saqlanib qoldi.",
      solution: ["jq -r 'select(.EventID == 1102) | [.TimeCreated, .SubjectUserName] | @tsv' security.json"],
      check: ({ output }) => output.includes('2026-11-17T02:26:44Z') && output.includes('svc_backup'),
    },
    {
      id: 'logoff',
      text: 'RDP sessiyasi qachon yopilgan (4634)? Hujumchi serverda qancha vaqt bo\'lgan?',
      hint: "`jq -r 'select(.EventID == 4634) | .TimeCreated' security.json` — 02:14:51 da kirgan, 02:27:30 da chiqqan: 13 daqiqaga yaqin.",
      solution: ["jq -r 'select(.EventID == 4634) | .TimeCreated' security.json"],
      check: ({ output }) => output.trim() === '2026-11-17T02:27:30Z',
    },
    {
      id: 'evidence',
      text: 'Hujumga oid barcha hodisalarni (hujumchi IP si **yoki** svc_backup nomidan) `~/dalil.json` ga, har birini bir qatorda saqlang.',
      hint: `\`jq -c 'select(.IpAddress == "${RDP_IP}" or .SubjectUserName == "svc_backup")' security.json > ~/dalil.json\``,
      solution: [`jq -c 'select(.IpAddress == "${RDP_IP}" or .SubjectUserName == "svc_backup")' security.json > ~/dalil.json`],
      check: ({ state }) => (fileAt(state, `${HOME}/dalil.json`) ?? '').split('\n').filter((l) => l.startsWith('{')).length === ATTACKER_EVENTS,
    },
    {
      id: 'challenge',
      challenge: true,
      text: 'Mustaqil vazifa: hujumchi topib olgan akkauntga (svc_backup) muvaffaqiyatli kirishdan oldin necha marta xato parol yuborilgan? Natija faqat son bo\'lsin.',
      hint: "Ikki shartni `and` bilan birlashtiring va natijani `wc -l` bilan sanang.",
      solution: ["jq -c 'select(.EventID == 4625 and .TargetUserName == \"svc_backup\")' security.json | wc -l"],
      check: ({ output }) => output.trim() === String(SVC_FAILS),
    },
  ],
};
