import type { Lab } from '../types';
import type { Row, SiemEvent, SiemResult } from '../../engine/siem/types';
import { cell, column } from '../../engine/siem';
import { cidrMatch, strftime } from '../../engine/siem/values';
import { spl } from './run';

/* ── shared helpers ──────────────────────────────────────────────────── */

/** Deterministic pseudo-random numbers, so every lab run (and test) sees the same data. */
export function prng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const utc = (iso: string) => Date.parse(iso) / 1000;

/** True when the SIEM result is a table whose `col` holds exactly `expected` (order ignored unless `ordered`). */
export function colIs(r: SiemResult | undefined, col: string, expected: string[], ordered = false): boolean {
  if (!r || r.error || !r.columns.includes(col)) return false;
  const got = column(r, col);
  if (got.length !== expected.length) return false;
  if (ordered) return got.every((v, i) => v === expected[i]);
  return [...got].sort().join('\n') === [...expected].sort().join('\n');
}

/** Finds the row whose `col` equals `value`. */
export function rowWhere(r: SiemResult | undefined, col: string, value: string): Row | undefined {
  if (!r || r.error) return undefined;
  return r.rows.find((row) => cell(r, row, col) === value);
}

/** The single number a one-cell (or one-row) table holds in `col`, or the first numeric cell. */
export function oneNumber(r: SiemResult | undefined, col?: string): number | null {
  if (!r || r.error || r.rows.length !== 1) return null;
  const row = r.rows[0]!;
  const c = col ?? r.columns.find((k) => typeof row[k] === 'number');
  if (!c) return null;
  const v = Number(cell(r, row, c));
  return Number.isFinite(v) ? v : null;
}

/* ── 1. SPL basics on Qaydnoma's logs ────────────────────────────────── */

export const STUFF_IPS = Array.from({ length: 10 }, (_, i) => `203.0.113.${60 + i}`);
export const STUFF_WIN_IP = '203.0.113.64';
export const STUFF_USER = 'nodira';
const SCANNER = '198.51.100.23';
const SSH_BRUTE = '203.0.113.77';
const WEB_HOST = 'qaydnoma-web-01';

const USERS = ['aziz', 'dilnoza', 'nodira', 'jasur', 'malika', 'bekzod', 'sardor', 'kamola', 'umid', 'zarina'];
const USER_IP: Record<string, string> = Object.fromEntries(USERS.map((u, i) => [u, `192.0.2.${11 + i * 3}`]));
// The leaked list the attacker sprays: a few real accounts among many that do not exist.
const LEAKED = ['admin', 'test', 'info', 'olim', 'gulnora', 'nodira', 'aziz', 'user1', 'support', 'manager', 'kassa', 'hr', 'buxgalter', 'ali', 'vali', 'sales', 'shoxrux', 'dilnoza', 'root', 'demo', 'office', 'nigora', 'rustam', 'guest'];

const BROWSER = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0 Safari/537.36';
const MOBILE = 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/131.0 Mobile Safari/537.36';
const NIKTO = 'Mozilla/5.00 (Nikto/2.5.0) (Evasions:None) (Test:007251)';
const STUFFER = 'python-requests/2.32.3';

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const clf = (t: number) => strftime(t, '%d/%b/%Y:%H:%M:%S +0000');
const syslogTime = (t: number) => `${MON[new Date(t * 1000).getUTCMonth()]} ${strftime(t, '%e %H:%M:%S')}`;

interface QaydnomaData {
  web: SiemEvent[];
  linux: SiemEvent[];
  app: SiemEvent[];
}

function buildQaydnoma(): QaydnomaData {
  const rnd = prng(20261118);
  const web: SiemEvent[] = [];
  const linux: SiemEvent[] = [];
  const app: SiemEvent[] = [];
  const pick = <T,>(xs: T[]) => xs[Math.floor(rnd() * xs.length)]!;

  const addWeb = (t: number, ip: string, method: string, path: string, status: number, bytes: number, ua: string) => {
    const [uri_path, query] = path.split('?');
    web.push({
      _time: t,
      _raw: `${ip} - - [${clf(t)}] "${method} ${path} HTTP/1.1" ${status} ${bytes} "-" "${ua}"`,
      index: 'web',
      sourcetype: 'access_combined',
      host: WEB_HOST,
      source: '/var/log/nginx/access.log',
      clientip: ip,
      method,
      uri: path,
      uri_path: uri_path!,
      ...(query ? { uri_query: query } : {}),
      status,
      bytes,
      useragent: ua,
    });
  };
  const addApp = (t: number, fields: Record<string, string | number>) => {
    const json = JSON.stringify({ ts: strftime(t, '%Y-%m-%dT%H:%M:%SZ'), ...fields });
    app.push({ _time: t, _raw: json, index: 'app', sourcetype: 'qaydnoma:audit', host: WEB_HOST, source: '/var/log/qaydnoma/audit.json', ...fields });
  };
  const addLinux = (t: number, process: string, pid: number, msg: string, fields: Record<string, string | number>) => {
    linux.push({ _time: t, _raw: `${syslogTime(t)} ${WEB_HOST} ${process}[${pid}]: ${msg}`, index: 'linux', sourcetype: 'linux_secure', host: WEB_HOST, source: '/var/log/auth.log', process, ...fields });
  };

  // Two ordinary days: each user logs in a few times and works with notes.
  const day0 = utc('2026-11-17T00:00:00Z');
  for (let d = 0; d < 2; d++) {
    for (const user of USERS) {
      const sessions = 2 + Math.floor(rnd() * 3);
      for (let s = 0; s < sessions; s++) {
        const ip = USER_IP[user]!;
        const ua = rnd() < 0.7 ? BROWSER : MOBILE;
        let t = day0 + d * 86400 + Math.floor((5 + rnd() * 12) * 3600);
        addWeb(t, ip, 'GET', '/', 200, 5120, ua);
        addWeb(t, ip, 'GET', '/static/app.css', 200, 18044, ua);
        t += 3;
        // Now and then a typo in the password first.
        if (rnd() < 0.15) {
          addWeb(t, ip, 'POST', '/login', 401, 64, ua);
          addApp(t, { event: 'login', user, src_ip: ip, result: 'fail' });
          t += 9;
        }
        addWeb(t, ip, 'POST', '/login', 302, 0, ua);
        addApp(t, { event: 'login', user, src_ip: ip, result: 'success' });
        t += 2;
        addWeb(t, ip, 'GET', '/notes', 200, 8000 + Math.floor(rnd() * 4000), ua);
        const actions = 2 + Math.floor(rnd() * 5);
        for (let a = 0; a < actions; a++) {
          t += 20 + Math.floor(rnd() * 300);
          const id = 1000 + Math.floor(rnd() * 400);
          const r = rnd();
          if (r < 0.55) addWeb(t, ip, 'GET', `/notes/${id}`, 200, 1500 + Math.floor(rnd() * 3000), ua);
          else if (r < 0.8) {
            addWeb(t, ip, 'POST', '/notes', 201, 310, ua);
            addApp(t, { event: 'note_create', user, src_ip: ip, note_id: id });
          } else if (r < 0.92) {
            addWeb(t, ip, 'POST', `/notes/${id}/share`, 200, 120, ua);
            addApp(t, { event: 'note_share', user, src_ip: ip, note_id: id, target: pick(USERS.filter((u) => u !== user)) + '@qaydnoma.example.com' });
          } else addWeb(t, ip, 'GET', '/api/v1/notes?page=1', 200, 4200, ua);
        }
        t += 30;
        addWeb(t, ip, 'POST', '/logout', 302, 0, ua);
      }
    }
    // The administrator's legitimate daily export from the office.
    const tExp = day0 + d * 86400 + 10 * 3600 + 30 * 60;
    addWeb(tExp, USER_IP.aziz!, 'GET', '/admin/export?format=csv', 200, 912_344, BROWSER);
    addApp(tExp, { event: 'admin_export', user: 'aziz', src_ip: USER_IP.aziz!, rows: 1840 });
    // The deploy account logs in with its key and restarts the service.
    const tDep = day0 + d * 86400 + 9 * 3600 + 5 * 60;
    addLinux(tDep, 'sshd', 1400 + d, 'Accepted publickey for deploy from 10.10.0.5 port 50122 ssh2: ED25519 SHA256:q1w2e3r4', { action: 'success', user: 'deploy', src_ip: '10.10.0.5', auth: 'publickey' });
    addLinux(tDep + 40, 'sudo', 1500 + d, 'deploy : TTY=pts/0 ; PWD=/srv/qaydnoma ; USER=root ; COMMAND=/usr/bin/systemctl restart qaydnoma', { user: 'deploy', command: '/usr/bin/systemctl restart qaydnoma', run_as: 'root' });
    addLinux(tDep + 600, 'sshd', 1400 + d, 'Disconnected from user deploy 10.10.0.5 port 50122', { action: 'logoff', user: 'deploy', src_ip: '10.10.0.5' });
  }

  // 11-17 22:10 — a scanner walks through common paths.
  const scanPaths = ['/admin', '/wp-admin/', '/wp-login.php', '/phpmyadmin/', '/.env', '/.env.bak', '/backup.zip', '/backup.sql', '/.git/HEAD', '/.git/config', '/config.php.bak', '/server-status', '/api/v1/debug/config', '/old/', '/test/', '/.DS_Store', '/robots.txt', '/sitemap.xml', '/cgi-bin/test.cgi', '/console', '/actuator/health', '/.svn/entries', '/web.config', '/info.php', '/xmlrpc.php', '/admin/login', '/uploads/', '/storage/logs/laravel.log', '/.htaccess', '/composer.json'];
  const scanOk: Record<string, [number, number]> = { '/.git/HEAD': [200, 23], '/.git/config': [200, 312], '/robots.txt': [200, 68], '/admin': [302, 0], '/api/v1/debug/config': [401, 64], '/admin/login': [200, 2210] };
  let ts = utc('2026-11-17T22:10:04Z');
  for (const path of scanPaths) {
    const [status, bytes] = scanOk[path] ?? [404, 162];
    addWeb(ts, SCANNER, 'GET', path, status, bytes, NIKTO);
    ts += 1 + Math.floor(rnd() * 3);
  }

  // 11-18 02:00 — credential stuffing: ten addresses, each trying many accounts from a leaked list.
  let tc = utc('2026-11-18T02:00:11Z');
  const winAt = utc('2026-11-18T02:17:41Z');
  let won = false;
  for (let round = 0; round < 3; round++) {
    for (const ip of STUFF_IPS) {
      const tries = 6 + Math.floor(rnd() * 4);
      for (let k = 0; k < tries; k++) {
        tc += 2 + Math.floor(rnd() * 4);
        const user = LEAKED[(round * 7 + STUFF_IPS.indexOf(ip) * 3 + k * 5) % LEAKED.length]!;
        const hit = !won && ip === STUFF_WIN_IP && tc >= winAt - 60 && user === STUFF_USER;
        if (hit) {
          won = true;
          addWeb(winAt, ip, 'POST', '/login', 302, 0, STUFFER);
          addApp(winAt, { event: 'login', user, src_ip: ip, result: 'success' });
        } else {
          addWeb(tc, ip, 'POST', '/login', 401, 64, STUFFER);
          addApp(tc, { event: 'login', user, src_ip: ip, result: USERS.includes(user) ? 'fail' : 'unknown_user' });
        }
      }
    }
  }
  if (!won) {
    addWeb(winAt, STUFF_WIN_IP, 'POST', '/login', 302, 0, STUFFER);
    addApp(winAt, { event: 'login', user: STUFF_USER, src_ip: STUFF_WIN_IP, result: 'success' });
  }
  // What the attacker did with nodira's session.
  const after: [number, string, string, number, number][] = [
    [8, 'GET', '/notes', 200, 6120],
    [15, 'GET', '/api/v1/notes?export=all', 200, 3_412_877],
    [40, 'POST', '/notes/1207/share', 200, 120],
    [44, 'POST', '/notes/1213/share', 200, 120],
    [51, 'POST', '/account/email', 200, 98],
  ];
  for (const [dt, method, path, status, bytes] of after) addWeb(winAt + dt, STUFF_WIN_IP, method, path, status, bytes, STUFFER);
  addApp(winAt + 15, { event: 'notes_export', user: STUFF_USER, src_ip: STUFF_WIN_IP, rows: 214 });
  addApp(winAt + 40, { event: 'note_share', user: STUFF_USER, src_ip: STUFF_WIN_IP, note_id: 1207, target: 'drop.box@example.net' });
  addApp(winAt + 44, { event: 'note_share', user: STUFF_USER, src_ip: STUFF_WIN_IP, note_id: 1213, target: 'drop.box@example.net' });
  addApp(winAt + 51, { event: 'email_change', user: STUFF_USER, src_ip: STUFF_WIN_IP, target: 'drop.box@example.net' });

  // 11-18 03:00 — SSH password guessing against the server itself; it never gets in (keys only).
  let tsh = utc('2026-11-18T03:00:02Z');
  const sshUsers = ['root', 'root', 'admin', 'ubuntu', 'root', 'test', 'oracle', 'postgres', 'root', 'git', 'deploy', 'user'];
  for (let i = 0; i < 48; i++) {
    tsh += 1 + Math.floor(rnd() * 4);
    const user = sshUsers[i % sshUsers.length]!;
    const port = 40000 + Math.floor(rnd() * 20000);
    const exists = ['root', 'deploy'].includes(user);
    if (exists) addLinux(tsh, 'sshd', 2200 + i, `Failed password for ${user} from ${SSH_BRUTE} port ${port} ssh2`, { action: 'failure', user, src_ip: SSH_BRUTE });
    // Invalid-user lines carry no user field on purpose: the lab extracts it with rex.
    else addLinux(tsh, 'sshd', 2200 + i, `Invalid user ${user} from ${SSH_BRUTE} port ${port}`, { action: 'failure', src_ip: SSH_BRUTE });
  }
  return { web, linux, app };
}

export const QAYDNOMA = buildQaydnoma();

const IP_REPUTATION: Row[] = [
  ...STUFF_IPS.map((ip) => ({ ip, category: 'proxy', note: 'Ochiq proksi tarmog\'i' })),
  { ip: SCANNER, category: 'scanner', note: 'Ommaviy skaner' },
  { ip: SSH_BRUTE, category: 'bruteforce', note: 'SSH parol tanlash' },
  { ip: '10.10.0.5', category: 'internal', note: 'CI/CD server' },
];

// Expected answers, computed from the data the lab searches.
const W = QAYDNOMA.web;
const A = QAYDNOMA.app;
const L = QAYDNOMA.linux;
const day18 = utc('2026-11-18T00:00:00Z');
const WEB_TOTAL = W.length;
const WEB_404 = W.filter((e) => e.status === 404).length;
const WEB_POST = W.filter((e) => e.method === 'POST').length;
const WEB_DAY18 = W.filter((e) => e._time >= day18).length;
const NIKTO_COUNT = W.filter((e) => String(e.useragent).includes('Nikto')).length;
const SCANNER_200 = W.filter((e) => e.clientip === SCANNER && e.status === 200).map((e) => String(e.uri_path));
const ipCounts = new Map<string, number>();
for (const e of W) ipCounts.set(String(e.clientip), (ipCounts.get(String(e.clientip)) ?? 0) + 1);
const TOP_IP = [...ipCounts.entries()].sort((a, b) => b[1] - a[1])[0]![0];
const failsByIp = new Map<string, Set<string>>();
for (const e of A) if (e.event === 'login' && e.result !== 'success') {
  if (!failsByIp.has(String(e.src_ip))) failsByIp.set(String(e.src_ip), new Set());
  failsByIp.get(String(e.src_ip))!.add(String(e.user));
}
const SPRAY_IPS = [...failsByIp.entries()].filter(([, s]) => s.size > 5).map(([ip]) => ip);
const STUFF_BYTES = W.filter((e) => e.clientip === STUFF_WIN_IP).reduce((s, e) => s + Number(e.bytes), 0);
const STUFF_MB = Number((STUFF_BYTES / 1048576).toFixed(1));
const BIG_PATHS = W.filter((e) => Number(e.bytes) > 1_000_000).map((e) => String(e.uri));
const INVALID_USERS = [...new Set(L.filter((e) => /Invalid user/.test(e._raw)).map((e) => /Invalid user (\S+)/.exec(e._raw)![1]!))];
const SSH_FAIL_USERS = [...new Set(L.filter((e) => e.action === 'failure' && e.user).map((e) => String(e.user)))];
const REP_CATEGORIES = [...new Set(W.map((e) => IP_REPUTATION.find((r) => r.ip === e.clientip)?.category).filter(Boolean) as string[])];

const isSpl = (s: { lang: string } | undefined) => s?.lang === 'spl';

export const splBasics: Lab = {
  id: 'siem-spl-asoslari',
  title: "SIEM: SPL asoslari — Qaydnoma loglari",
  summary: "Splunk SPL bilan Qaydnoma'ning veb, ilova va SSH loglarini tahlil qilish: qidiruv, stats, timechart, where, eval, rex, lookup. Skaner, credential stuffing va SSH hujumini topish.",
  minutes: 75,
  level: 2,
  panes: ['siem'],
  intro:
    "Qaydnoma (a1 bosqichidagi Flask ilovasi) endi SIEM'ga ulangan. Uch indeks bor:\n\n" +
    "- `index=web` — nginx access log (`clientip`, `method`, `uri_path`, `status`, `bytes`, `useragent`)\n" +
    "- `index=app` — ilovaning audit jurnali, JSON (`event`, `user`, `src_ip`, `result`, `note_id`, `target`)\n" +
    "- `index=linux` — serverning `/var/log/auth.log` (SSH va sudo)\n\n" +
    "Davr: 2026-yil 17–18-noyabr, vaqtlar UTC. Ertalab xodim **nodira** \"parolimni o'zgartirmagan edim, lekin pochtam boshqa\" deb yozdi. Siz — SOC analitigi. Avval SPL bilan tanishasiz, keyin voqealar zanjirini tiklaysiz.\n\n" +
    "Har topshiriqdan oldin yangi so'rov qismi tushuntiriladi. **Indekslar** tugmasi qanday ma'lumot borligini ko'rsatadi. Hodisani bossangiz, uning barcha maydonlari ochiladi; chapdagi maydon qiymatini bossangiz, u qidiruvga qo'shiladi.",
  shell: () => ({
    fs: { home: { talaba: {} } },
    siem: { now: '2026-11-19T06:00:00Z', indexes: { web: QAYDNOMA.web, app: QAYDNOMA.app, linux: QAYDNOMA.linux }, lookups: { ip_reputation: IP_REPUTATION } },
  }),
  tasks: [
    {
      id: 'all-web',
      teach: ['spl:search', 'spl:search index='],
      text: "`index=web` bilan barcha veb so'rovlarni chiqaring. Nechta hodisa bor?",
      hint: '`index=web` — natija tepasida hodisalar soni yoziladi. Eng yangisi birinchi.',
      solution: [spl('index=web')],
      check: ({ siem }) => isSpl(siem) && siem!.result.mode === 'events' && siem!.result.rows.length === WEB_TOTAL,
    },
    {
      id: 'status-404',
      teach: ['spl:search maydon=qiymat'],
      text: "Faqat 404 (topilmadi) javoblarini qoldiring.",
      hint: '`index=web status=404`',
      solution: [spl('index=web status=404')],
      check: ({ siem }) => isSpl(siem) && siem!.result.rows.length === WEB_404 && siem!.result.rows.every((r) => r.status === 404),
    },
    {
      id: 'post',
      text: "Nechta POST so'rov bo'lgan? Qiymatni kichik harf bilan yozib ko'ring: `method=post` — ishlaydimi?",
      hint: "`index=web method=post` — search'da qiymat katta-kichik harfga sezgir emas. Maydon NOMI esa sezgir: `METHOD=post` hech narsa topmaydi.",
      solution: [spl('index=web method=post')],
      check: ({ siem }) => isSpl(siem) && /method=post/i.test(siem!.query) && siem!.result.mode === 'events' && siem!.result.rows.length === WEB_POST,
    },
    {
      id: 'day18',
      teach: ['spl:search earliest='],
      text: "Faqat 18-noyabr (UTC 00:00 dan keyingi) so'rovlarni oling.",
      hint: '`index=web earliest="11/18/2026:00:00:00"` — sana formati OO/KK/YYYY:SS:DD:SS.',
      solution: [spl('index=web earliest="11/18/2026:00:00:00"')],
      check: ({ siem }) => isSpl(siem) && siem!.query.includes('earliest') && siem!.result.mode === 'events' && siem!.result.rows.length === WEB_DAY18,
    },
    {
      id: 'by-status',
      teach: ['spl:stats', 'spl:stats count', 'spl:stats by'],
      text: "Status kodlari qanday taqsimlangan? Har status uchun nechta so'rov?",
      hint: '`index=web | stats count by status`',
      solution: [spl('index=web | stats count by status')],
      check: ({ siem }) => isSpl(siem) && !!rowWhere(siem!.result, 'status', '404') && cell(siem!.result, rowWhere(siem!.result, 'status', '404')!, 'count') === String(WEB_404),
    },
    {
      id: 'top-ip',
      teach: ['spl:sort', 'spl:sort -', 'spl:head'],
      text: "Eng ko'p so'rov yuborgan 5 ta IP'ni kamayish tartibida chiqaring.",
      hint: '`index=web | stats count by clientip | sort - count | head 5`',
      solution: [spl('index=web | stats count by clientip | sort - count | head 5')],
      check: ({ siem }) => isSpl(siem) && siem!.result.rows.length === 5 && column(siem!.result, 'clientip')[0] === TOP_IP,
    },
    {
      id: 'top-cmd',
      teach: ['spl:top', 'spl:top limit='],
      text: "Xuddi shu savolga qisqaroq javob: `top` buyrug'i bilan eng faol 3 IP va ularning foizi.",
      hint: '`index=web | top limit=3 clientip`',
      solution: [spl('index=web | top limit=3 clientip')],
      check: ({ siem }) => isSpl(siem) && siem!.result.columns.includes('percent') && siem!.result.rows.length === 3 && column(siem!.result, 'clientip')[0] === TOP_IP,
    },
    {
      id: 'scanner',
      text: "404 javoblarini qaysi IP eng ko'p olgan? Ko'p 404 — skanerning belgisi.",
      hint: '`index=web status=404 | stats count by clientip | sort - count`',
      solution: [spl('index=web status=404 | stats count by clientip | sort - count')],
      check: ({ siem }) => isSpl(siem) && column(siem!.result, 'clientip')[0] === SCANNER,
    },
    {
      id: 'nikto',
      teach: ["spl:search so'z"],
      text: "Skaner o'zini User-Agent'da tanishtirgan. `Nikto` so'zini maydonsiz qidiring. Keyin `nikt` deb sinab ko'ring — nega natija yo'q?",
      hint: "`index=web Nikto` — so'z xom matndan butun token sifatida qidiriladi. Qisqartma uchun yulduzcha kerak: `nikt*`.",
      solution: [spl('index=web Nikto')],
      check: ({ siem }) => isSpl(siem) && /nikto/i.test(siem!.query) && siem!.result.mode === 'events' && siem!.result.rows.length === NIKTO_COUNT,
    },
    {
      id: 'scanner-found',
      teach: ['spl:table'],
      text: "Skaner nimani **topdi**? Uning 200 javob olgan so'rovlarini `_time`, `uri_path`, `bytes` ustunlari bilan jadval qiling.",
      hint: `\`index=web clientip=${SCANNER} status=200 | table _time uri_path bytes\` — /.git/ ochiq qolgani jiddiy topilma.`,
      solution: [spl(`index=web clientip=${SCANNER} status=200 | table _time uri_path bytes`)],
      check: ({ siem }) => isSpl(siem) && colIs(siem!.result, 'uri_path', SCANNER_200),
    },
    {
      id: 'app-fails',
      text: "Endi ilova jurnali. Muvaffaqiyatsiz kirishlar (`event=login`, `result` — `success` emas) IP bo'yicha qanday taqsimlangan?",
      hint: '`index=app event=login result!=success | stats count by src_ip | sort - count`',
      solution: [spl('index=app event=login result!=success | stats count by src_ip | sort - count')],
      check: ({ siem }) => isSpl(siem) && STUFF_IPS.every((ip) => !!rowWhere(siem!.result, 'src_ip', ip)),
    },
    {
      id: 'spray',
      teach: ['spl:stats dc', 'spl:stats as', 'spl:where'],
      text: "Credential stuffing belgisi — bitta IP'dan **ko'p turli hisob**. Har IP uchun urinishlar soni va nechta turli `user` sinalganini hisoblang; faqat 5 tadan ko'p hisob sinaganlarni qoldiring.",
      hint: '`index=app event=login result!=success | stats count, dc(user) as hisoblar by src_ip | where hisoblar > 5`',
      solution: [spl('index=app event=login result!=success | stats count, dc(user) as hisoblar by src_ip | where hisoblar > 5')],
      check: ({ siem }) => isSpl(siem) && colIs(siem!.result, 'src_ip', SPRAY_IPS),
    },
    {
      id: 'timechart',
      teach: ['spl:timechart', 'spl:timechart span=', 'spl:timechart by'],
      text: "Hujum qachon bo'lganini grafikda ko'ring: kirish urinishlari 10 daqiqalik oraliqlarda, `result` bo'yicha alohida chiziqlar.",
      hint: '`index=app event=login | timechart span=10m count by result` — cho\'qqi 02:00 atrofida.',
      solution: [spl('index=app event=login | timechart span=10m count by result')],
      check: ({ siem }) => isSpl(siem) && !!siem!.result.chart && siem!.result.columns.includes('unknown_user') && siem!.query.includes('span=10m'),
    },
    {
      id: 'winner',
      teach: ['spl:search *'],
      text: "Hujum IP'lari `203.0.113.6x` oralig'ida. Ulardan qaysi biri **muvaffaqiyatli** kirgan va qaysi hisobga?",
      hint: '`index=app event=login result=success src_ip=203.0.113.6*`',
      solution: [spl('index=app event=login result=success src_ip=203.0.113.6*')],
      check: ({ siem }) => isSpl(siem) && siem!.result.rows.length === 1 && siem!.result.rows[0]!.user === STUFF_USER,
    },
    {
      id: 'after',
      teach: ['spl:sort +'],
      text: `Hujumchi \`${STUFF_WIN_IP}\` dan kirgach nima qildi? Uning veb so'rovlarini vaqt bo'yicha **o'sish** tartibida \`_time method uri status bytes\` jadvali qilib chiqaring.`,
      hint: `\`index=web clientip=${STUFF_WIN_IP} status!=401 | sort _time | table _time method uri status bytes\``,
      solution: [spl(`index=web clientip=${STUFF_WIN_IP} status!=401 | sort _time | table _time method uri status bytes`)],
      check: ({ siem }) => {
        const r = siem?.result;
        if (!isSpl(siem) || !r || !r.columns.includes('uri')) return false;
        const uris = column(r, 'uri');
        return uris.includes('/api/v1/notes?export=all') && uris.includes('/account/email') && uris.indexOf('/api/v1/notes?export=all') < uris.indexOf('/account/email');
      },
    },
    {
      id: 'big',
      text: "Butun saytda javobi 1 000 000 baytdan katta bo'lgan so'rovlarni toping (`where` bilan): `_time clientip uri bytes`.",
      hint: '`index=web | where bytes > 1000000 | table _time clientip uri bytes` — biri administratorning odatiy eksporti, biri — hujumchiniki.',
      solution: [spl('index=web | where bytes > 1000000 | table _time clientip uri bytes')],
      check: ({ siem }) => isSpl(siem) && colIs(siem!.result, 'uri', BIG_PATHS),
    },
    {
      id: 'mb',
      teach: ['spl:eval', 'spl:eval round', 'spl:stats sum'],
      text: `Hujumchi IP'si (\`${STUFF_WIN_IP}\`) jami necha megabayt ma'lumot olgan? Yig'indini hisoblab, MB ga o'tkazing (1 MB = 1048576 bayt, 1 xona aniqlik).`,
      hint: `\`index=web clientip=${STUFF_WIN_IP} | stats sum(bytes) as jami | eval mb=round(jami/1048576, 1)\``,
      solution: [spl(`index=web clientip=${STUFF_WIN_IP} | stats sum(bytes) as jami | eval mb=round(jami/1048576, 1)`)],
      check: ({ siem }) => isSpl(siem) && siem!.result.columns.includes('mb') && oneNumber(siem!.result, 'mb') === STUFF_MB,
    },
    {
      id: 'shares',
      text: "Hujumchi `nodira` nomidan qaydlarni kimga ulashgan va pochtani nimaga o'zgartirgan? Ilova jurnalidan `nodira`ning 18-noyabrdagi hodisalarini `_time event src_ip note_id target` jadvali qiling.",
      hint: '`index=app user=nodira earliest="11/18/2026:00:00:00" | table _time event src_ip note_id target`',
      solution: [spl('index=app user=nodira earliest="11/18/2026:00:00:00" | table _time event src_ip note_id target')],
      check: ({ siem }) => isSpl(siem) && column(siem!.result, 'target').includes('drop.box@example.net') && column(siem!.result, 'event').includes('email_change'),
    },
    {
      id: 'ssh-users',
      text: "Endi server. `index=linux` da muvaffaqiyatsiz SSH urinishlari qaysi **mavjud** hisoblarga qilingan (`user` maydoni bo'yicha)?",
      hint: '`index=linux action=failure | stats count by user` — "Invalid user" qatorlarida user maydoni yo\'q, shuning uchun ular bu yerda chiqmaydi.',
      solution: [spl('index=linux action=failure | stats count by user')],
      check: ({ siem }) => isSpl(siem) && colIs(siem!.result, 'user', SSH_FAIL_USERS),
    },
    {
      id: 'rex',
      teach: ['spl:rex'],
      text: "\"Invalid user\" qatorlarida hisob nomi faqat matnda. `rex` bilan uni `baduser` maydoniga ajrating va qaysi nomlar sinalganini sanang.",
      hint: '`index=linux "Invalid user" | rex "Invalid user (?<baduser>\\S+) from" | stats count by baduser`',
      solution: [spl('index=linux "Invalid user" | rex "Invalid user (?<baduser>\\S+) from" | stats count by baduser')],
      check: ({ siem }) => isSpl(siem) && colIs(siem!.result, 'baduser', INVALID_USERS),
    },
    {
      id: 'dedup',
      teach: ['spl:dedup'],
      text: "SSH orqali kim **muvaffaqiyatli** kirgan? Har foydalanuvchining eng oxirgi kirishini `_time user src_ip auth` jadvali bilan ko'rsating.",
      hint: '`index=linux action=success | dedup user | table _time user src_ip auth` — faqat deploy, kalit bilan: brute force muvaffaqiyatsiz.',
      solution: [spl('index=linux action=success | dedup user | table _time user src_ip auth')],
      check: ({ siem }) => isSpl(siem) && colIs(siem!.result, 'user', ['deploy']) && siem!.result.columns.includes('auth'),
    },
    {
      id: 'lookup-see',
      teach: ['spl:inputlookup'],
      text: "SOC jamoasi IP obro'si jadvalini yuritadi. `ip_reputation` lookup jadvalida nima borligini ko'ring.",
      hint: '`| inputlookup ip_reputation` — so\'rov | bilan boshlanadi.',
      solution: [spl('| inputlookup ip_reputation')],
      check: ({ siem }) => isSpl(siem) && siem!.result.rows.length === IP_REPUTATION.length && siem!.query.includes('inputlookup'),
    },
    {
      id: 'lookup',
      teach: ['spl:lookup', 'spl:lookup AS', 'spl:lookup OUTPUT'],
      text: "Veb so'rovlarni shu jadval bilan boyiting: `clientip` ni jadvaldagi `ip` bilan solishtirib `category` ni qo'shing va har toifadan nechta so'rov kelganini sanang.",
      hint: '`index=web | lookup ip_reputation ip AS clientip OUTPUT category | stats count by category`',
      solution: [spl('index=web | lookup ip_reputation ip AS clientip OUTPUT category | stats count by category')],
      check: ({ siem }) => isSpl(siem) && colIs(siem!.result, 'category', REP_CATEGORIES),
    },
    {
      id: 'rename',
      teach: ['spl:rename'],
      text: "Hisobot uchun: hujum IP'lari ro'yxatini (`stats count by src_ip` + `where`), ustunlarni o'zbekcha nomlab chiqaring — `src_ip` → `\"Manba IP\"`, `count` → `Urinishlar`.",
      hint: '`index=app event=login result!=success | stats count, dc(user) as hisoblar by src_ip | where hisoblar > 5 | rename src_ip AS "Manba IP", count AS Urinishlar`',
      solution: [spl('index=app event=login result!=success | stats count, dc(user) as hisoblar by src_ip | where hisoblar > 5 | rename src_ip AS "Manba IP", count AS Urinishlar')],
      check: ({ siem }) => isSpl(siem) && siem!.result.columns.includes('Manba IP') && siem!.result.columns.includes('Urinishlar') && siem!.result.rows.length === SPRAY_IPS.length,
    },
    {
      id: 'challenge',
      challenge: true,
      text: "Mustaqil vazifa. Bitta so'rov bilan hisobot jadvali tuzing: 5 tadan ko'p hisob sinagan har bir IP uchun **birinchi** va **oxirgi** urinish vaqti (`HH:MM:SS` matn ko'rinishida, ustun nomlari `boshi` va `oxiri`) hamda sinalgan hisoblar soni; jadval birinchi urinish bo'yicha o'sish tartibida bo'lsin.",
      hint: "stats'da `min(_time)` va `max(_time)` vaqtni son qilib beradi; uni `eval ... = strftime(..., \"%H:%M:%S\")` bilan matnga aylantiring. Saralashni strftime'dan oldin qiling yoki matn bo'yicha saralang — HH:MM:SS ham to'g'ri saralanadi.",
      solution: [spl('index=app event=login result!=success | stats min(_time) as boshi, max(_time) as oxiri, dc(user) as hisoblar by src_ip | where hisoblar > 5 | sort boshi | eval boshi=strftime(boshi, "%H:%M:%S"), oxiri=strftime(oxiri, "%H:%M:%S")')],
      check: ({ siem }) => {
        const r = siem?.result;
        if (!isSpl(siem) || !r || r.error || !r.columns.includes('boshi') || !r.columns.includes('oxiri')) return false;
        const ips = column(r, 'src_ip');
        const starts = column(r, 'boshi');
        return colIs(r, 'src_ip', SPRAY_IPS) && ips.length === SPRAY_IPS.length && starts.every((s) => /^\d{2}:\d{2}:\d{2}$/.test(s)) && starts.every((s, i) => i === 0 || starts[i - 1]! <= s);
      },
    },
  ],
};

/** Used by the incident lab and CTFs: is this an internal address? */
export const isInternal = (ip: string) => cidrMatch('10.0.0.0/8', ip);
