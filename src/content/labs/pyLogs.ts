import type { Lab, LabCheckCtx } from '../types';
import type { SiemEvent } from '../../engine/siem/types';
import { fileAt } from './helpers';
import { pyCases, pyStr } from './pyHelpers';
import { edit, editFn } from './run';
import { QAYDNOMA, STUFF_WIN_IP } from './siem';

/* ── 2. Python log analysis scripts ──────────────────────────────────── */

const DIR = '/home/talaba/tahlil';
const T = `${DIR}/tahlil.py`;
const asc = (evs: SiemEvent[]) => [...evs].sort((a, b) => a._time - b._time);
const ACCESS = asc(QAYDNOMA.web).map((e) => e._raw).join('\n') + '\n';
const AUTH = asc(QAYDNOMA.linux).map((e) => e._raw).join('\n') + '\n';
const AUDIT = asc(QAYDNOMA.app).map((e) => e._raw).join('\n') + '\n';
const P = (f: string) => pyStr(`${DIR}/${f}`);

// Expected values, computed from the same data the files hold.
const WEB = QAYDNOMA.web;
const APP = QAYDNOMA.app;
const AUTH_FAILS = QAYDNOMA.linux.filter((e) => e.action === 'failure').length;
const byIp = new Map<string, number>();
for (const e of WEB) byIp.set(String(e.clientip), (byIp.get(String(e.clientip)) ?? 0) + 1);
const ranked = [...byIp.entries()].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1));
// The smallest n ≥ 3 whose cut does not fall inside a tie, so "top n" has one right answer.
const TOP_N = (() => {
  for (let n = 3; n < ranked.length; n++) if (ranked[n - 1]![1] !== ranked[n]![1]) return n;
  return ranked.length;
})();
const TOP = ranked.slice(0, TOP_N);
const STATUS = new Map<number, number>();
for (const e of WEB) STATUS.set(Number(e.status), (STATUS.get(Number(e.status)) ?? 0) + 1);
const STATUS_PY = `{${[...STATUS.entries()].map(([k, v]) => `${k}: ${v}`).join(', ')}}`;
const EVENTS = (ev: string) => APP.filter((e) => e.event === ev).length;
const failsByIp = new Map<string, number>();
for (const e of APP) if (e.event === 'login' && e.result !== 'success') failsByIp.set(String(e.src_ip), (failsByIp.get(String(e.src_ip)) ?? 0) + 1);
const BRUTE = (min: number) => [...failsByIp.entries()].filter(([, n]) => n >= min).map(([ip]) => ip).sort();
const winner = APP.filter((e) => e.src_ip === STUFF_WIN_IP).sort((a, b) => a._time - b._time);
const WIN_SPAN: [string, string, number] = [String(JSON.parse(winner[0]!._raw).ts), String(JSON.parse(winner[winner.length - 1]!._raw).ts), winner.length];
const SAMPLE_WEB = asc(WEB).find((e) => e.method === 'POST' && e.status === 401)!._raw;
const SAMPLE_WEB2 = asc(WEB).find((e) => e.uri === '/api/v1/notes?export=all')!._raw;

const STARTER = `# Qaydnoma loglarini tahlil qiluvchi funksiyalar.
# Fayllar: access.log (nginx), auth.log (SSH), audit.jsonl (ilova, har qatorda bitta JSON).
# Tekshirish: python3 tahlil.py
import re
import json
from collections import Counter
from datetime import datetime


def ip_ajrat(qator):
    """auth.log qatoridan "from IP port" dagi IP; topilmasa None."""
    pass


def xatolar_soni(yol):
    """auth.log da muvaffaqiyatsiz SSH urinishlari soni ("Failed password" yoki "Invalid user")."""
    pass


def top_ipler(yol, n):
    """access.log da eng ko'p so'rov yuborgan n ta IP: [(ip, soni), ...] kamayish tartibida."""
    pass


def parse_access(qator):
    """access.log qatorini lug'atga ajratadi: ip, method, path, status (int), bytes (int)."""
    pass


def status_soni(yol):
    """access.log da har status kodidan nechta: {200: ..., 404: ...} (kalitlar int)."""
    pass


def vaqt_ol(qator):
    """access.log qatoridagi vaqtni datetime ga aylantiradi (vaqt zonasi bilan)."""
    pass


def hodisalar_soni(yol, hodisa):
    """audit.jsonl da "event" maydoni berilgan hodisaga teng qatorlar soni."""
    pass


def brute_force(yol, chegara):
    """audit.jsonl da kamida chegara marta muvaffaqiyatsiz kirgan (event=login, result != success) IP'lar, saralangan ro'yxat."""
    pass


def ip_faoliyati(yol, ip):
    """audit.jsonl da shu IP ning (birinchi ts, oxirgi ts, hodisalar soni)."""
    pass


if __name__ == "__main__":
    print("tahlil.py ishga tushdi")
`;

const ran = (c: LabCheckCtx, file: string) => new RegExp(`^\\s*python3\\s+${file.replace('.', '\\.')}(\\s|$)`).test(c.line);
const RUN = 'python3 tahlil.py';

export const pyLogs: Lab = {
  id: 'python-log-tahlili',
  title: 'Python: log tahlili skriptlari',
  summary: "Qaydnoma'ning haqiqiy loglarini Python bilan tahlil qilish: re bilan ajratish, Counter, lug'atlar, datetime, JSON qatorlar, CSV va JSON hisobot, buyruq qatori argumentlari. Funksiyalar yashirin testlar bilan tekshiriladi.",
  minutes: 100,
  level: 2,
  panes: ['editor', 'terminal'],
  editor: { root: DIR, open: 'tahlil.py' },
  runtimes: ['python'],
  intro:
    "s4 bosqichidagi \"Python xavfsizlik uchun\" darsining amaliyoti va SIEM labining davomi: o'sha Qaydnoma loglari endi fayl bo'lib turibdi — `access.log` (nginx), `auth.log` (SSH) va `audit.jsonl` (ilova jurnali, har qatorda bitta JSON).\n\n" +
    "awk va SPL bilan qilgan ishlaringizni endi o'z skriptingiz qiladi. Skriptning afzalligi: uni qayta-qayta ishlatish, boshqa tizimga ulash va istalgan murakkablikdagi mantiqni yozish mumkin. Funksiyalarni `tahlil.py` da to'ldirasiz, har biri `python3 tahlil.py` da yashirin testlar bilan tekshiriladi.\n\n" +
    "Kerakli modullar faylning boshida import qilingan: `re` (muntazam ifodalar), `json`, `collections.Counter`, `datetime`.",
  shell: () => ({
    fs: { home: { talaba: { tahlil: { 'tahlil.py': STARTER, 'access.log': ACCESS, 'auth.log': AUTH, 'audit.jsonl': AUDIT, 'hisobot.py': "# Hisobot skripti: tahlil.py dagi funksiyalardan foydalaning\nfrom tahlil import top_ipler\n" } } }, tmp: {} },
    cwd: DIR,
  }),
  tasks: [
    {
      id: 'look',
      text: "Avval ma'lumotga qarang: `access.log` ning birinchi 3 qatori va `audit.jsonl` ning birinchi qatori. Ustunlar qayerda?",
      hint: '`head -n 3 access.log`, keyin `head -n 1 audit.jsonl` — JSON qatorni Python `json.loads` bilan lug\'atga aylantiradi.',
      solution: ['head -n 3 access.log', 'head -n 1 audit.jsonl'],
      check: ({ line, output }) => line.includes('audit.jsonl') && output.trim().startsWith('{'),
    },
    {
      id: 'regex',
      teach: ['python3 FAYL'],
      text: "`ip_ajrat(qator)`: auth.log qatoridan `from` va `port` orasidagi IP manzilni qaytarsin, bo'lmasa `None`. `re.search` dan foydalaning.",
      hint: "`m = re.search(r'from (\\S+) port', qator)` → `return m.group(1) if m else None`. `\\S+` — bo'sh joy bo'lmagan belgilar ketma-ketligi.",
      solution: [editFn('tahlil.py', 'ip_ajrat', "    m = re.search(r'from (\\S+) port', qator)\n    return m.group(1) if m else None"), RUN],
      ...pyCases(T, 'ip_ajrat', [
        [pyStr('Nov 18 03:00:05 qaydnoma-web-01 sshd[2201]: Failed password for root from 203.0.113.77 port 51022 ssh2'), '"203.0.113.77"'],
        [pyStr('Nov 18 03:01:10 qaydnoma-web-01 sshd[2209]: Invalid user oracle from 203.0.113.77 port 40122'), '"203.0.113.77"'],
        [pyStr('Nov 17 09:05:40 qaydnoma-web-01 sudo[1500]: deploy : TTY=pts/0 ; COMMAND=/usr/bin/systemctl restart qaydnoma'), 'None'],
      ]),
    },
    {
      id: 'count',
      text: "`xatolar_soni(yol)`: auth.log da `Failed password` yoki `Invalid user` bo'lgan qatorlar soni.",
      hint: "`with open(yol) as f:` → `return sum(1 for q in f if 'Failed password' in q or 'Invalid user' in q)`.",
      solution: [editFn('tahlil.py', 'xatolar_soni', "    with open(yol) as f:\n        return sum(1 for q in f if 'Failed password' in q or 'Invalid user' in q)"), RUN],
      ...pyCases(T, 'xatolar_soni', [[P('auth.log'), String(AUTH_FAILS)]]),
    },
    {
      id: 'counter',
      text: `\`top_ipler(yol, n)\`: access.log da eng ko'p so'rov yuborgan n ta IP — \`[(ip, soni), ...]\`. \`Counter\` va \`most_common(n)\` dan foydalaning.`,
      hint: "`ips = Counter(q.split()[0] for q in open(yol))` → `return ips.most_common(n)` — IP har qatorning birinchi so'zi.",
      solution: [editFn('tahlil.py', 'top_ipler', '    with open(yol) as f:\n        return Counter(q.split()[0] for q in f).most_common(n)'), RUN],
      ...pyCases(T, 'top_ipler', [[`${P('access.log')}, ${TOP_N}`, `[${TOP.map(([ip, n]) => `(${pyStr(ip)}, ${n})`).join(', ')}]`], [`${P('access.log')}, 1`, `[(${pyStr(TOP[0]![0])}, ${TOP[0]![1]})]`]]),
    },
    {
      id: 'parse',
      text: "`parse_access(qator)`: combined log qatorini lug'atga ajrating — `ip`, `method`, `path`, `status` (int), `bytes` (int). Regex guruhlari bilan qulay.",
      hint: "`m = re.match(r'(\\S+) \\S+ \\S+ \\[[^\\]]+\\] \"(\\S+) (\\S+) [^\"]*\" (\\d+) (\\d+)', qator)` → `ip, method, path, status, size = m.groups()` → lug'at, status va bytes uchun `int()`.",
      solution: [editFn('tahlil.py', 'parse_access', "    m = re.match(r'(\\S+) \\S+ \\S+ \\[[^\\]]+\\] \"(\\S+) (\\S+) [^\"]*\" (\\d+) (\\d+)', qator)\n    ip, method, path, status, size = m.groups()\n    return {'ip': ip, 'method': method, 'path': path, 'status': int(status), 'bytes': int(size)}"), RUN],
      ...pyCases(T, 'parse_access', [
        [pyStr(SAMPLE_WEB), `{"ip": ${pyStr(SAMPLE_WEB.split(' ')[0]!)}, "method": "POST", "path": "/login", "status": 401, "bytes": 64}`],
        [pyStr(SAMPLE_WEB2), `{"ip": ${pyStr(STUFF_WIN_IP)}, "method": "GET", "path": "/api/v1/notes?export=all", "status": 200, "bytes": 3412877}`],
      ]),
    },
    {
      id: 'status',
      text: "`status_soni(yol)`: har status kodidan nechta — `{200: 512, 404: 31, ...}` (kalitlar butun son). O'zingiz yozgan `parse_access` ni qayta ishlating.",
      hint: "`return dict(Counter(parse_access(q)['status'] for q in open(yol)))`",
      solution: [editFn('tahlil.py', 'status_soni', "    with open(yol) as f:\n        return dict(Counter(parse_access(q)['status'] for q in f))"), RUN],
      ...pyCases(T, 'status_soni', [[P('access.log'), STATUS_PY]]),
    },
    {
      id: 'datetime',
      text: "`vaqt_ol(qator)`: kvadrat qavs ichidagi vaqtni (`18/Nov/2026:02:17:41 +0000`) `datetime` ga aylantiring. Format: `%d/%b/%Y:%H:%M:%S %z`.",
      hint: "`matn = qator.split('[')[1].split(']')[0]` → `return datetime.strptime(matn, '%d/%b/%Y:%H:%M:%S %z')`.",
      solution: [editFn('tahlil.py', 'vaqt_ol', "    matn = qator.split('[')[1].split(']')[0]\n    return datetime.strptime(matn, '%d/%b/%Y:%H:%M:%S %z')"), RUN],
      ...pyCases(T, 'vaqt_ol', [[pyStr(SAMPLE_WEB2), (() => {
        const d = new Date(asc(WEB).find((e) => e.uri === '/api/v1/notes?export=all')!._time * 1000);
        return `__import__('datetime').datetime(${d.getUTCFullYear()}, ${d.getUTCMonth() + 1}, ${d.getUTCDate()}, ${d.getUTCHours()}, ${d.getUTCMinutes()}, ${d.getUTCSeconds()}, tzinfo=__import__('datetime').timezone.utc)`;
      })()]]),
    },
    {
      id: 'json',
      text: "`hodisalar_soni(yol, hodisa)`: audit.jsonl ning har qatorini `json.loads` bilan o'qib, `event` maydoni `hodisa` ga teng qatorlarni sanang.",
      hint: "`return sum(1 for q in open(yol) if json.loads(q).get('event') == hodisa)`",
      solution: [editFn('tahlil.py', 'hodisalar_soni', "    with open(yol) as f:\n        return sum(1 for q in f if json.loads(q).get('event') == hodisa)"), RUN],
      ...pyCases(T, 'hodisalar_soni', [[`${P('audit.jsonl')}, "login"`, String(EVENTS('login'))], [`${P('audit.jsonl')}, "note_share"`, String(EVENTS('note_share'))], [`${P('audit.jsonl')}, "yoq"`, '0']]),
    },
    {
      id: 'brute',
      text: "`brute_force(yol, chegara)`: audit.jsonl da kamida `chegara` marta muvaffaqiyatsiz kirgan (`event` = login, `result` success emas) IP'lar — saralangan ro'yxat.",
      hint: "Counter bilan `src_ip` larni sanang (faqat login va result != 'success'), keyin `sorted(ip for ip, n in c.items() if n >= chegara)`.",
      solution: [editFn('tahlil.py', 'brute_force', "    c = Counter()\n    with open(yol) as f:\n        for q in f:\n            h = json.loads(q)\n            if h.get('event') == 'login' and h.get('result') != 'success':\n                c[h['src_ip']] += 1\n    return sorted(ip for ip, n in c.items() if n >= chegara)"), RUN],
      ...pyCases(T, 'brute_force', [[`${P('audit.jsonl')}, 10`, `[${BRUTE(10).map(pyStr).join(', ')}]`], [`${P('audit.jsonl')}, 3`, `[${BRUTE(3).map(pyStr).join(', ')}]`], [`${P('audit.jsonl')}, 1000`, '[]']]),
    },
    {
      id: 'csv',
      text: `\`hisobot.py\` ni yozing: \`top_ipler\` bilan eng faol ${TOP_N} ta IP ni \`top_ip.csv\` fayliga \`ip,soni\` sarlavhasi bilan yozsin (\`csv\` moduli). Ishga tushiring va \`cat top_ip.csv\` bilan tekshiring.`,
      hint: `\`import csv\`, \`with open('top_ip.csv', 'w', newline='') as f:\` → \`w = csv.writer(f)\` → \`w.writerow(['ip', 'soni'])\` → \`w.writerows(top_ipler('access.log', ${TOP_N}))\`.`,
      solution: [edit('hisobot.py', `import csv\nfrom tahlil import top_ipler\n\nwith open('top_ip.csv', 'w', newline='') as f:\n    w = csv.writer(f)\n    w.writerow(['ip', 'soni'])\n    w.writerows(top_ipler('access.log', ${TOP_N}))\n`), 'python3 hisobot.py', 'cat top_ip.csv'],
      check: (c) => {
        const csv = (fileAt(c.state, `${DIR}/top_ip.csv`) ?? '').replace(/\r/g, '').trim();
        return csv === ['ip,soni', ...TOP.map(([ip, n]) => `${ip},${n}`)].join('\n');
      },
    },
    {
      id: 'json-out',
      text: "Xuddi shu skriptga JSON hisobot qo'shing: `hisobot.json` ga `{\"jami_sorovlar\": ..., \"xatolar\": ..., \"brute_force\": [...]}` (xatolar — auth.log dagi, brute_force — chegara 10). `json.dump(..., f, indent=2)`.",
      hint: "`from tahlil import xatolar_soni, brute_force` va `json.dump({'jami_sorovlar': sum(1 for _ in open('access.log')), 'xatolar': xatolar_soni('auth.log'), 'brute_force': brute_force('audit.jsonl', 10)}, f, indent=2)`.",
      solution: [edit('hisobot.py', "import csv, json\nfrom tahlil import top_ipler, xatolar_soni, brute_force\n\nwith open('hisobot.json', 'w') as f:\n    json.dump({'jami_sorovlar': sum(1 for _ in open('access.log')), 'xatolar': xatolar_soni('auth.log'), 'brute_force': brute_force('audit.jsonl', 10)}, f, indent=2)\n"), 'python3 hisobot.py', 'cat hisobot.json'],
      check: (c) => {
        try {
          const j = JSON.parse(fileAt(c.state, `${DIR}/hisobot.json`) ?? '') as Record<string, unknown>;
          return j.jami_sorovlar === WEB.length && j.xatolar === AUTH_FAILS && JSON.stringify(j.brute_force) === JSON.stringify(BRUTE(10));
        } catch {
          return false;
        }
      },
    },
    {
      id: 'argv',
      teach: ['python3 ARGUMENT'],
      text: "`tahlil.py` ni buyruq qatori vositasiga aylantiring: `python3 tahlil.py access.log 3` eng faol 3 IP ni `IP SONI` ko'rinishida (har biri alohida qatorda) chiqarsin. `if __name__ == \"__main__\":` blokini o'zgartiring.",
      hint: "`import sys` (blok ichida ham bo'ladi), `yol, n = sys.argv[1], int(sys.argv[2])`, `for ip, soni in top_ipler(yol, n): print(ip, soni)`.",
      solution: [edit('tahlil.py', 'TAHLIL_PLACEHOLDER'), `python3 tahlil.py access.log 3`],
      check: (c) => ran(c, 'tahlil.py') && /access\.log\s+(\d+)/.test(c.line) && c.output.trim() === ranked.slice(0, Number(/access\.log\s+(\d+)/.exec(c.line)![1])).map(([ip, n]) => `${ip} ${n}`).join('\n'),
    },
    {
      id: 'challenge',
      challenge: true,
      text: `Mustaqil vazifa. \`ip_faoliyati(yol, ip)\`: audit.jsonl da shu IP ga tegishli hodisalarning \`(birinchi ts, oxirgi ts, soni)\` — kortej (tuple). Masalan, hujumchi \`${STUFF_WIN_IP}\` uchun.`,
      hint: "Shu IP ning `ts` qiymatlarini ro'yxatga yig'ing; ISO vaqtlar matn sifatida ham to'g'ri saralanadi: `min()`, `max()`, `len()`. Topilmasa — `(None, None, 0)`.",
      solution: [editFn('tahlil.py', 'ip_faoliyati', "    vaqtlar = [json.loads(q)['ts'] for q in open(yol) if json.loads(q).get('src_ip') == ip]\n    if not vaqtlar:\n        return (None, None, 0)\n    return (min(vaqtlar), max(vaqtlar), len(vaqtlar))"), RUN],
      ...pyCases(T, 'ip_faoliyati', [[`${P('audit.jsonl')}, ${pyStr(STUFF_WIN_IP)}`, `(${pyStr(WIN_SPAN[0])}, ${pyStr(WIN_SPAN[1])}, ${WIN_SPAN[2]})`], [`${P('audit.jsonl')}, "0.0.0.0"`, '(None, None, 0)']]),
    },
  ],
};

// The argv task's sample solution is the full file with every function filled in and a command-line main block.
const FILLED = STARTER.replace(/if __name__ == "__main__":\n {4}print\("tahlil.py ishga tushdi"\)\n$/, 'if __name__ == "__main__":\n    import sys\n    yol, n = sys.argv[1], int(sys.argv[2])\n    for ip, soni in top_ipler(yol, n):\n        print(ip, soni)\n');
const argvTask = pyLogs.tasks.find((t) => t.id === 'argv')!;
argvTask.solution[0] = edit('tahlil.py', FILLED.replace('    """access.log da eng ko\'p so\'rov yuborgan n ta IP: [(ip, soni), ...] kamayish tartibida."""\n    pass', '    """access.log da eng ko\'p so\'rov yuborgan n ta IP: [(ip, soni), ...] kamayish tartibida."""\n    with open(yol) as f:\n        return Counter(q.split()[0] for q in f).most_common(n)'));
