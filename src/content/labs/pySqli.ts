import type { Lab, LabCheckCtx } from '../types';
import { sha256Hex } from '../../engine/terminal/text';
import { pyCases } from './pyHelpers';
import { edit, editFn } from './run';
import { inserts } from './sqlHelpers';

/* ── 4. SQL injection: find it, fix it, prove it ─────────────────────── */

const DIR = '/home/talaba/ilova';
const B = `${DIR}/baza.py`;

const USERS: [number, string, string, string][] = [
  [1, 'aziz', 'Admin-Tog-2026', 'admin'],
  [2, 'nodira', 'Bahor-shamoli-7', 'user'],
  [3, 'jasur', 'Qor-yogdi-kecha', 'user'],
  [4, "o'tkir", 'Daryo-boyida-3', 'user'],
];
const NOTES: [number, number, string][] = [
  [1, 1, 'Admin: server parollari joyi'],
  [2, 1, 'Admin: zaxira rejasi'],
  [3, 2, 'Xarid ro\'yxati'],
  [4, 2, 'Loyiha rejasi'],
  [5, 2, 'Kitoblar ro\'yxati'],
  [6, 3, 'Majlis bayonnomasi'],
  [7, 3, 'Loyiha g\'oyalari'],
  [8, 4, 'Ta\'til rejasi'],
];
const DB_SQL = [
  'CREATE TABLE users (id INTEGER PRIMARY KEY, ism TEXT UNIQUE NOT NULL, parol_hash TEXT NOT NULL, rol TEXT NOT NULL);',
  'CREATE TABLE qaydlar (id INTEGER PRIMARY KEY, egasi_id INTEGER NOT NULL, sarlavha TEXT NOT NULL, yaratilgan TEXT NOT NULL);',
  inserts('users', ['id', 'ism', 'parol_hash', 'rol'], USERS.map(([id, ism, parol, rol]) => [id, ism, sha256Hex(parol), rol])),
  inserts('qaydlar', ['id', 'egasi_id', 'sarlavha', 'yaratilgan'], NOTES.map(([id, e, s], i) => [id, e, s, `2026-11-${String(10 + i).padStart(2, '0')}`])),
].join('\n');

const BAZA = `# Qaydnoma ilovasining baza qatlami. Har funksiya kirishni (ism, so'z, ustun) foydalanuvchidan oladi.
import hashlib
import sqlite3

BAZA = 'qaydnoma.db'


def ulan():
    return sqlite3.connect(BAZA)


def foydalanuvchi_top(ism):
    """Ism bo'yicha foydalanuvchi: (id, ism, rol) yoki None."""
    c = ulan()
    qator = c.execute(f"SELECT id, ism, rol FROM users WHERE ism = '{ism}'").fetchone()
    c.close()
    return qator


def kirish(ism, parol):
    """Ism va parol to'g'ri bo'lsa foydalanuvchi id si, aks holda None."""
    h = hashlib.sha256(parol.encode()).hexdigest()
    c = ulan()
    qator = c.execute(f"SELECT id FROM users WHERE ism = '{ism}' AND parol_hash = '{h}'").fetchone()
    c.close()
    return qator[0] if qator else None


def qidirish(egasi_id, soz):
    """Foydalanuvchining sarlavhasida so'z bor qaydlari: [(id, sarlavha), ...] id bo'yicha."""
    c = ulan()
    qatorlar = c.execute("SELECT id, sarlavha FROM qaydlar WHERE egasi_id = " + str(egasi_id) + " AND sarlavha LIKE '%" + soz + "%' ORDER BY id").fetchall()
    c.close()
    return qatorlar


def saralangan(egasi_id, ustun):
    """Foydalanuvchi qaydlari ustun bo'yicha: ustun faqat 'id', 'sarlavha' yoki 'yaratilgan'."""
    c = ulan()
    qatorlar = c.execute(f"SELECT id, sarlavha FROM qaydlar WHERE egasi_id = ? ORDER BY {ustun}", (egasi_id,)).fetchall()
    c.close()
    return qatorlar


def ochirish(qayd_id, egasi_id):
    """Qaydni o'chiradi, faqat egasi bo'lsa. O'chirilgan bo'lsa True, aks holda False."""
    pass
`;

const TESTLAR = `# Baza qatlami testlari: oddiy ish va xavfsizlik. Ishga tushirish: python3 testlar.py
import baza

natijalar = []


def test(nomi, shart):
    natijalar.append(shart)
    print(('OK   ' if shart else 'XATO ') + nomi)


def xavfsiz(fn, *args):
    """Funksiyani chaqiradi; kutilmagan istisno bo'lsa uni natija sifatida qaytaradi (test yiqilmasin)."""
    try:
        return fn(*args)
    except Exception as e:
        return e


# Oddiy ish
test("foydalanuvchi_top('nodira') topadi", xavfsiz(baza.foydalanuvchi_top, 'nodira') == (2, 'nodira', 'user'))
test("apostrofli ism (o'tkir) ham ishlaydi", xavfsiz(baza.foydalanuvchi_top, "o'tkir") == (4, "o'tkir", 'user'))
test("kirish to'g'ri parol bilan", xavfsiz(baza.kirish, 'nodira', 'Bahor-shamoli-7') == 2)
test("kirish noto'g'ri parol bilan", xavfsiz(baza.kirish, 'nodira', 'xato') is None)
test("qidirish('rejasi') faqat o'z qaydlari", xavfsiz(baza.qidirish, 2, 'rejasi') == [(4, 'Loyiha rejasi')])
test("saralangan sarlavha bo'yicha", [q[0] for q in xavfsiz(baza.saralangan, 2, 'sarlavha')] == [5, 4, 3])

# Xavfsizlik: maxsus belgilar ma'lumot bo'lib qolishi kerak, so'rovning bir qismi emas
test("ism sifatida SQL bo'lagi hech kimni topmaydi", xavfsiz(baza.foydalanuvchi_top, "' OR '1'='1") is None)
test("parolsiz kirib bo'lmaydi (izoh belgisi)", xavfsiz(baza.kirish, "aziz' --", 'har-qanday') is None)
r = xavfsiz(baza.qidirish, 2, "' OR egasi_id != 2 OR '")
test("qidiruv boshqa foydalanuvchi qaydlarini ko'rsatmaydi", isinstance(r, list) and all(q[0] in (3, 4, 5) for q in r))
test("noma'lum ustun bilan saralash rad etiladi (ValueError)", isinstance(xavfsiz(baza.saralangan, 2, 'id; DROP TABLE qaydlar'), ValueError))

print(f"{sum(natijalar)}/{len(natijalar)} test o'tdi")
`;

const RULES = `rules:
  - id: python-sql-string-building
    languages: [python]
    severity: ERROR
    message: |
      SQL so'rovi satrlarni ulash yoki f-satr bilan yig'ilgan. Foydalanuvchi kiritgan qiymat so'rovning
      bir qismiga aylanishi mumkin (SQL injection). Parametrli so'rov ishlating: execute("... = ?", (qiymat,))
    pattern-regex: 'execute\\((f"|f''|"[^"]*"\\s*\\+|''[^'']*''\\s*\\+|"[^"]*"\\s*%)'
`;

const ran = (c: LabCheckCtx, file: string) => new RegExp(`^\\s*python3\\s+${file.replace('.', '\\.')}(\\s|$)`).test(c.line);
const ALL_OK = "10/10 test o'tdi";

export const pySqli: Lab = {
  id: 'python-sql-injection',
  title: "SQL injection: topish, tuzatish va test bilan isbotlash",
  summary: "Qaydnoma'ning baza qatlamidagi satr ulab yig'ilgan so'rovlarni testlar va semgrep bilan topish, parametrli so'rovlar va ustun nomlari uchun ruxsat ro'yxati bilan tuzatish, egasini tekshiradigan o'chirish funksiyasini yozish.",
  minutes: 80,
  level: 2,
  panes: ['editor', 'terminal'],
  editor: { root: DIR, open: 'baza.py' },
  runtimes: ['python', 'sql'],
  intro:
    "a2 bosqichidagi injection darsining amaliyoti — **himoyachi** tomondan. `~/ilova/baza.py` — Qaydnoma'ning bazaga murojaat qiladigan funksiyalari. Ular ishlaydi, lekin so'rovlar foydalanuvchi kiritgan matnni to'g'ridan-to'g'ri ulab yig'adi.\n\n" +
    "`testlar.py` — oddiy ish testlari va xavfsizlik testlari. Xavfsizlik testi so'raydi: maxsus belgili kirish (apostrof, izoh belgisi) **ma'lumot** bo'lib qoladimi yoki so'rovning bir qismiga aylanadimi? Sizning vazifangiz — barcha testlar `OK` bo'lguncha funksiyalarni tuzatish.\n\n" +
    "Asosiy qoida: qiymatlar so'rovga `?` o'rniga, alohida beriladi — `c.execute(\"SELECT ... WHERE ism = ?\", (ism,))`. Shunda baza matnni hech qachon SQL deb o'qimaydi. Ustun nomlari esa `?` bilan berilmaydi — ular uchun ruxsat etilganlar ro'yxati kerak.",
  shell: () => ({
    fs: { home: { talaba: { ilova: { 'baza.py': BAZA, 'testlar.py': TESTLAR, 'sqli.yml': RULES } } }, tmp: {} },
    sqlite: { [`${DIR}/qaydnoma.db`]: DB_SQL },
    cwd: DIR,
  }),
  tasks: [
    {
      id: 'tests',
      teach: ['python3 FAYL'],
      text: "Testlarni ishga tushiring. Qaysilari `XATO`? Oddiy ish testlaridan ham biri yiqiladi — qaysi va nega?",
      hint: "`python3 testlar.py` — apostrofli ism (o'tkir) so'rovni buzadi: xuddi shu muammo xavfsizlik teshigi ham.",
      solution: ['python3 testlar.py'],
      check: (c) => ran(c, 'testlar.py') && c.output.includes('XATO') && c.output.includes("test o'tdi"),
    },
    {
      id: 'semgrep',
      teach: ['semgrep', 'semgrep --config'],
      text: "Xuddi shu muammoni statik tahlil bilan toping: `sqli.yml` qoidasi bilan `baza.py` ni skanerlang. Nechta qator topildi?",
      hint: '`semgrep --config sqli.yml baza.py` — a3 bosqichidagi SAST darsidan: qoida kod andozasini qidiradi, ishga tushirmaydi.',
      solution: ['semgrep --config sqli.yml baza.py'],
      check: ({ line, output }) => line.includes('semgrep') && /4 Code Findings/.test(output),
    },
    {
      id: 'find',
      teach: ['sqlite3', 'sqlite3 .schema'],
      text: "Baza tuzilishini ko'ring: `users` va `qaydlar` jadvallari.",
      hint: '`sqlite3 qaydnoma.db ".schema"`',
      solution: ['sqlite3 qaydnoma.db ".schema"'],
      check: ({ output }) => output.includes('CREATE TABLE qaydlar'),
    },
    {
      id: 'fix-find',
      text: "`foydalanuvchi_top(ism)` ni tuzating: f-satr o'rniga `?` va qiymatlar korteji. Keyin `python3 testlar.py` — ikki test (apostrof va SQL bo'lagi) `OK` bo'lishi kerak.",
      hint: "`qator = c.execute(\"SELECT id, ism, rol FROM users WHERE ism = ?\", (ism,)).fetchone()` — `(ism,)` dagi vergul uni kortej qiladi.",
      solution: [edit('baza.py', 'FIX1'), 'python3 testlar.py'],
      ...pyCases(B, 'foydalanuvchi_top', [['"nodira"', '(2, "nodira", "user")'], [`"o'tkir"`, `(4, "o'tkir", "user")`], [`"' OR '1'='1"`, 'None'], ['"yoq"', 'None']]),
    },
    {
      id: 'fix-login',
      text: "`kirish(ism, parol)` ni tuzating — ikkala qiymat ham parametr bo'lsin.",
      hint: "`c.execute(\"SELECT id FROM users WHERE ism = ? AND parol_hash = ?\", (ism, h))`",
      solution: [edit('baza.py', 'FIX2'), 'python3 testlar.py'],
      ...pyCases(B, 'kirish', [['"nodira", "Bahor-shamoli-7"', '2'], ['"nodira", "xato"', 'None'], [`"aziz' --", "har-qanday"`, 'None'], [`"o'tkir", "Daryo-boyida-3"`, '4']]),
    },
    {
      id: 'fix-search',
      text: "`qidirish(egasi_id, soz)` ni tuzating. `LIKE` uchun foizlar qiymatning bir qismi: `'%' + soz + '%'` ni Python'da yasab, parametr qilib bering (yoki SQL'da `'%' || ? || '%'`).",
      hint: "`c.execute(\"SELECT id, sarlavha FROM qaydlar WHERE egasi_id = ? AND sarlavha LIKE ? ORDER BY id\", (egasi_id, f\"%{soz}%\"))` — f-satr bu yerda faqat qiymatni yasaydi, so'rovni emas.",
      solution: [edit('baza.py', 'FIX3'), 'python3 testlar.py'],
      ...pyCases(B, 'qidirish', [['2, "rejasi"', '[(4, "Loyiha rejasi")]'], ['2, "ro\'yxati"', `[(3, "Xarid ro'yxati"), (5, "Kitoblar ro'yxati")]`], [`2, "' OR egasi_id != 2 OR '"`, '[]'], ['3, ""', `[(6, "Majlis bayonnomasi"), (7, "Loyiha g'oyalari")]`]]),
    },
    {
      id: 'fix-order',
      text: "`saralangan(egasi_id, ustun)`: ustun nomini `?` bilan berib bo'lmaydi (baza uni qiymat deb o'qiydi). Ruxsat ro'yxati qiling: lug'atda har ruxsat etilgan ustun uchun tayyor so'rov; ro'yxatda yo'q bo'lsa — `raise ValueError(...)`.",
      hint: "`SOROVLAR = {'id': 'SELECT id, sarlavha FROM qaydlar WHERE egasi_id = ? ORDER BY id', 'sarlavha': '... ORDER BY sarlavha', 'yaratilgan': '... ORDER BY yaratilgan'}`; `if ustun not in SOROVLAR: raise ValueError('ruxsat etilmagan ustun')`. Shunda so'rov matni hech qachon kirishdan yig'ilmaydi.",
      solution: [edit('baza.py', 'FIX4'), 'python3 testlar.py'],
      ...pyCases(B, 'saralangan', [['2, "sarlavha"', `[(5, "Kitoblar ro'yxati"), (4, "Loyiha rejasi"), (3, "Xarid ro'yxati")]`], ['2, "id"', `[(3, "Xarid ro'yxati"), (4, "Loyiha rejasi"), (5, "Kitoblar ro'yxati")]`], ['2, "id; DROP TABLE qaydlar"', 'raises ValueError'], ['2, "parol_hash"', 'raises ValueError']]),
    },
    {
      id: 'all-ok',
      text: 'Barcha testlar o\'tishi kerak. Ishga tushirib tekshiring.',
      hint: "`python3 testlar.py` — `10/10 test o'tdi`.",
      solution: ['python3 testlar.py'],
      check: (c) => ran(c, 'testlar.py') && c.output.trim().endsWith(ALL_OK),
    },
    {
      id: 'rescan',
      text: 'semgrep bilan qayta skanerlang — endi topilma bo\'lmasligi kerak. (Testlar ishlashni isbotlaydi, statik tahlil esa xavfli andoza qaytib kelmaganini kuzatadi — CI/CD da ikkalasi ham ishlaydi.)',
      hint: '`semgrep --config sqli.yml baza.py` — `0 Code Findings`.',
      solution: ['semgrep --config sqli.yml baza.py'],
      check: ({ line, output }) => line.includes('semgrep') && /0 Code Findings/.test(output),
    },
    {
      id: 'challenge',
      challenge: true,
      text: "Mustaqil vazifa. `ochirish(qayd_id, egasi_id)` ni yozing: qaydni **faqat egasi** o'chira olsin (a2 dagi `load_note(id, Action)` g'oyasi), so'rov parametrli bo'lsin, `commit()` qiling. O'chirilgan bo'lsa `True`, aks holda `False`.",
      hint: "Bitta so'rov ikkala shartni ham tekshiradi: `DELETE FROM qaydlar WHERE id = ? AND egasi_id = ?`; `cur.rowcount` — o'chirilgan qatorlar soni.",
      solution: [editFn('baza.py', 'ochirish', '    c = ulan()\n    cur = c.execute("DELETE FROM qaydlar WHERE id = ? AND egasi_id = ?", (qayd_id, egasi_id))\n    c.commit()\n    c.close()\n    return cur.rowcount == 1'), 'python3 testlar.py'],
      ...pyCases(B, 'ochirish', [['3, 3', 'False'], ['"3 OR 1=1", 3', 'False'], ['3, 2', 'True'], ['3, 2', 'False']]),
    },
  ],
};

// Sample solutions: baza.py after each fix (cumulative), written as the learner would in the editor.
const FIXES: [string, string][] = [
  [`    qator = c.execute(f"SELECT id, ism, rol FROM users WHERE ism = '{ism}'").fetchone()`, `    qator = c.execute("SELECT id, ism, rol FROM users WHERE ism = ?", (ism,)).fetchone()`],
  [`    qator = c.execute(f"SELECT id FROM users WHERE ism = '{ism}' AND parol_hash = '{h}'").fetchone()`, `    qator = c.execute("SELECT id FROM users WHERE ism = ? AND parol_hash = ?", (ism, h)).fetchone()`],
  [`    qatorlar = c.execute("SELECT id, sarlavha FROM qaydlar WHERE egasi_id = " + str(egasi_id) + " AND sarlavha LIKE '%" + soz + "%' ORDER BY id").fetchall()`, `    qatorlar = c.execute("SELECT id, sarlavha FROM qaydlar WHERE egasi_id = ? AND sarlavha LIKE ? ORDER BY id", (egasi_id, f"%{soz}%")).fetchall()`],
  [`    c = ulan()\n    qatorlar = c.execute(f"SELECT id, sarlavha FROM qaydlar WHERE egasi_id = ? ORDER BY {ustun}", (egasi_id,)).fetchall()`, `    sorovlar = {\n        'id': "SELECT id, sarlavha FROM qaydlar WHERE egasi_id = ? ORDER BY id",\n        'sarlavha': "SELECT id, sarlavha FROM qaydlar WHERE egasi_id = ? ORDER BY sarlavha",\n        'yaratilgan': "SELECT id, sarlavha FROM qaydlar WHERE egasi_id = ? ORDER BY yaratilgan",\n    }\n    if ustun not in sorovlar:\n        raise ValueError('ruxsat etilmagan ustun: ' + ustun)\n    c = ulan()\n    qatorlar = c.execute(sorovlar[ustun], (egasi_id,)).fetchall()`],
];
let text = BAZA;
FIXES.forEach(([from, to], i) => {
  if (!text.includes(from)) throw new Error(`pySqli: fix ${i + 1} does not apply`);
  text = text.replace(from, () => to);
  const task = pySqli.tasks.find((t) => t.solution[0] === edit('baza.py', `FIX${i + 1}`))!;
  task.solution[0] = edit('baza.py', text);
});
