import type { CtfChallenge } from './types';
import { strftime } from '../engine/siem/values';
import { prng, utc } from './labs/siem';

/*
 * Python challenges (editor + terminal, real Python). Flags are stored as hashes; plain answers and the scripts that
 * find them live in content.test.ts. Flag text inside data is assembled from parts so it is not greppable here.
 */

/* ── a XOR-ed malware configuration ──────────────────────────────────── */

function xorConfig(): string {
  const json = JSON.stringify({ c2: 'https://cdn-sync.example/gate', sleep: 300, jitter: 0.2, id: ['flag{', 'xor_kaliti', '_bir_bayt}'].join('') });
  let bin = '';
  for (const ch of json) bin += String.fromCharCode(ch.charCodeAt(0) ^ 0x5a);
  // Wrapped at 64 characters, as config blobs often are in reports.
  return btoa(bin).replace(/(.{64})/g, '$1\n') + '\n';
}

/* ── one address, many browsers ──────────────────────────────────────── */

function uaLog(): string {
  const rnd = prng(808);
  const agents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_6) AppleWebKit/605.1.15 Version/18.1 Safari/605.1.15',
    'Mozilla/5.0 (X11; Linux x86_64; rv:132.0) Gecko/20100101 Firefox/132.0',
    'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/131.0 Mobile Safari/537.36',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:132.0) Gecko/20100101 Firefox/132.0',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Edg/131.0',
    'curl/8.4.0',
    'python-requests/2.32.3',
    'Wget/1.21.4',
  ];
  const lines: string[] = [];
  const t0 = utc('2026-11-18T06:00:00Z');
  const add = (t: number, ip: string, path: string, status: number, ua: string) =>
    lines.push(`${ip} - - [${strftime(t, '%d/%b/%Y:%H:%M:%S +0000')}] "GET ${path} HTTP/1.1" ${status} ${1000 + Math.floor(rnd() * 9000)} "-" "${ua}"`);
  // Ordinary visitors: one or two browsers each; a few heavy users with many requests.
  for (let i = 0; i < 40; i++) {
    const ip = `192.0.2.${10 + i}`;
    const mine = [agents[i % 7]!, ...(i % 5 === 0 ? [agents[(i + 3) % 7]!] : [])];
    const n = i < 3 ? 60 : 3 + Math.floor(rnd() * 12);
    for (let k = 0; k < n; k++) add(t0 + Math.floor(rnd() * 36000), ip, ['/', '/notes', '/notes/1042', '/static/app.css'][k % 4]!, 200, mine[k % mine.length]!);
  }
  // A scraper rotates its User-Agent on every request to look like many people; fewer requests than the heavy users.
  for (let k = 0; k < 30; k++) add(t0 + 3600 * 3 + k * 7, '198.51.100.199', `/notes/${1000 + k}`, k % 3 ? 200 : 403, agents[k % agents.length]!);
  lines.sort((a, b) => a.split('[')[1]!.localeCompare(b.split('[')[1]!));
  return lines.join('\n') + '\n';
}

/* ── code review: which query can be injected ────────────────────────── */

const REVIEW = `# Qaydnoma — baza funksiyalari (kod tekshiruvi uchun)
import sqlite3

c = sqlite3.connect('qaydnoma.db')


def qayd_ol(qayd_id, egasi_id):
    return c.execute("SELECT * FROM qaydlar WHERE id = ? AND egasi_id = ?", (qayd_id, egasi_id)).fetchone()


def qayd_qidir(egasi_id, soz):
    naqsh = f"%{soz}%"
    return c.execute("SELECT id, sarlavha FROM qaydlar WHERE egasi_id = ? AND sarlavha LIKE ?", (egasi_id, naqsh)).fetchall()


def qayd_saralangan(egasi_id, ustun):
    ruxsat = {"id": "id", "sana": "yaratilgan"}
    if ustun not in ruxsat:
        raise ValueError("ruxsat etilmagan ustun")
    return c.execute("SELECT * FROM qaydlar WHERE egasi_id = ? ORDER BY " + ruxsat[ustun], (egasi_id,)).fetchall()


def qayd_eksport(egasi_id, format_):
    sorov = "SELECT id, sarlavha, matn FROM qaydlar WHERE egasi_id = %s AND format = '%s'" % (egasi_id, format_)
    return c.execute(sorov).fetchall()


def qayd_ulash(qayd_id, egasi_id, kimga):
    c.execute("INSERT INTO ulashishlar (qayd_id, kimga) SELECT id, ? FROM qaydlar WHERE id = ? AND egasi_id = ?", (kimga, qayd_id, egasi_id))
    c.commit()
`;

export const CTF_PYTHON: CtfChallenge[] = [
  {
    id: 'py-config-decode',
    title: 'Sozlama bloki',
    category: 'forensics',
    level: 2,
    description:
      "Zararli dastur namunasining ichidan sozlama bloki ajratib olindi — `~/ctf/config.txt`. Tahlilchi yozuvi: \"Base64, ichida bitta baytli **XOR** (kalit `0x5A`), natija — JSON.\" Python bilan oching: JSON'dagi `id` maydoni — flag.\n\n" +
      "Flag: `flag{...}` — `id` maydonining qiymati.",
    hints: [
      "Base64 ni ochganda baytlar chiqadi: `data = base64.b64decode(open('config.txt').read())` — `b64decode` qator ko'chishlarini o'zi o'tkazib yuboradi.",
      "Har baytni kalit bilan XOR qiling: `bytes(b ^ 0x5A for b in data)`, keyin `.decode()` va `json.loads(...)`.",
    ],
    flagHash: '12fb8e796ffd80',
    panes: ['editor', 'terminal'],
    editor: { root: '/home/talaba/ctf', open: 'och.py' },
    runtimes: ['python'],
    shell: () => ({ fs: { home: { talaba: { ctf: { 'config.txt': xorConfig(), 'och.py': '# Sozlama blokini ochuvchi skript: python3 och.py\nimport base64\nimport json\n' } } }, tmp: {} }, cwd: '/home/talaba/ctf' }),
  },
  {
    id: 'py-ua-rotation',
    title: "Ko'p brauzerli manzil",
    category: 'loglar',
    level: 2,
    description:
      "`~/ctf/access.log` — Qaydnoma'ning bir kunlik veb-logi. Bot o'zini ko'p odam qilib ko'rsatish uchun har so'rovda User-Agent'ini almashtiradi. Eng ko'p so'rov yuborgan IP — bu emas (faol foydalanuvchilar bor). Har bir IP **nechta turli User-Agent** ishlatganini hisoblang.\n\n" +
      'Flag: `flag{IP}`.',
    hints: [
      "Har qatordan IP (birinchi so'z) va User-Agent'ni (oxirgi qo'shtirnoqlar ichi: `qator.split('\"')[-2]`) oling.",
      "`dict` ichida `set` yig'ing: `uas.setdefault(ip, set()).add(ua)`, keyin `max(uas, key=lambda ip: len(uas[ip]))`.",
    ],
    flagHash: '1e5d1d32430fd8',
    panes: ['editor', 'terminal'],
    editor: { root: '/home/talaba/ctf', open: 'tahlil.py' },
    runtimes: ['python'],
    shell: () => ({ fs: { home: { talaba: { ctf: { 'access.log': uaLog(), 'tahlil.py': '# python3 tahlil.py\n' } } }, tmp: {} }, cwd: '/home/talaba/ctf' }),
  },
  {
    id: 'py-code-review',
    title: 'Kod tekshiruvi',
    category: 'web',
    level: 1,
    description:
      "`~/ctf/baza.py` da beshta funksiya bor. Ulardan **bittasi** SQL injection'ga ochiq: foydalanuvchi kiritgan qiymat so'rov matniga qo'shilib ketadi. Qaysi biri? (a2 bosqichi va SQL injection labidan: `?` parametrlari xavfsiz; ustun nomi ruxsat ro'yxatidan olinsa — xavfsiz.)\n\n" +
      'Flag: `flag{funksiya_nomi}`.',
    hints: [
      "Har `execute` ga qarang: so'rov matni qiymatlardan alohida bormi (`?` va kortej), yoki matn qiymat bilan yig'ilganmi?",
      "`%` operatori bilan satr formatlash (`\"... '%s'\" % (x,)`) — f-satr yoki `+` bilan ulash bilan bir xil xavf. `grep -n execute baza.py` ham yordam beradi.",
    ],
    flagHash: '1a90f97306d301',
    panes: ['editor', 'terminal'],
    editor: { root: '/home/talaba/ctf', open: 'baza.py' },
    shell: () => ({ fs: { home: { talaba: { ctf: { 'baza.py': REVIEW } } }, tmp: {} }, cwd: '/home/talaba/ctf' }),
  },
];
