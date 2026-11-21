import type { Lab, LabCheckCtx } from '../types';
import { pyCases, pyStr } from './pyHelpers';
import { edit, editFn } from './run';

/* ── 1. Python basics ────────────────────────────────────────────────── */

const DIR = '/home/talaba/python';
const F = `${DIR}/funksiyalar.py`;

const FUNKSIYALAR = `# Har bir topshiriqda shu fayldagi bitta funksiyani to'ldirasiz.
# "pass" — bo'sh joy: uning o'rniga kodingizni yozing.
# Tekshirish: terminalda  python3 funksiyalar.py  (yashirin testlar ishga tushadi)


def baho(ball):
    """100 ballik natijani bahoga aylantiradi."""
    pass


def juft_sonlar(n):
    """0 dan n gacha (n ham kiradi) juft sonlar ro'yxati."""
    pass


def parol_uzunmi(parol):
    """Parol kamida 12 belgimi? True yoki False."""
    pass


def toza_email(email):
    """Chetdagi bo'sh joylarni olib tashlab, kichik harfga o'tkazadi."""
    pass


def eng_katta(sonlar):
    """Ro'yxatdagi eng katta son; ro'yxat bo'sh bo'lsa None."""
    pass


def sanash(sozlar):
    """Har bir so'z necha marta uchrashini lug'at (dict) qilib qaytaradi."""
    pass


def songa(matn):
    """Matnni butun songa aylantiradi; bo'lmasa None."""
    pass


def qatorlar_soni(yol):
    """Fayldagi qatorlar soni."""
    pass


def parol_kuchi(parol):
    """0–4 ball: uzunlik >= 12, raqam bor, katta harf bor, belgi (harf ham raqam ham emas) bor."""
    pass


if __name__ == "__main__":
    # Bu qism faqat fayl o'zi ishga tushirilganda bajariladi (import qilinganda emas).
    print("funksiyalar.py ishga tushdi")
`;

const SALOM = '# Birinchi dastur\nprint("Salom, dunyo!")\n';
const TALABALAR = 'Aziz,92\nDilnoza,78\nJasur,55\nMalika,86\nBekzod,64\n';
const SALOMLASH = '# Ishga tushirish: python3 salomlash.py ISM\nimport sys\n\n# sys.argv — buyruq qatoridagi so\'zlar ro\'yxati: [skript nomi, 1-argument, ...]\n';
const HISOBOT = '# talabalar.csv dagi har bir talabaning bahosini chiqaradi\nfrom funksiyalar import baho\n\n';

const ran = (c: LabCheckCtx, file: string) => new RegExp(`^\\s*python3\\s+${file.replace('.', '\\.')}(\\s|$)`).test(c.line);
const RUN = 'python3 funksiyalar.py';

export const pyBasics: Lab = {
  id: 'python-asoslari',
  title: 'Python asoslari: birinchi dasturlardan funksiyalargacha',
  summary: "Haqiqiy Python 3 brauzerda: print, o'zgaruvchilar, if, for, satrlar, ro'yxat va lug'atlar, try/except, fayl o'qish, sys.argv va modullar. Funksiyalar yashirin testlar bilan tekshiriladi.",
  minutes: 100,
  level: 1,
  panes: ['editor', 'terminal'],
  editor: { root: DIR, open: 'salom.py' },
  runtimes: ['python'],
  intro:
    "s4 bosqichidagi Python darslarining amaliyoti. Bu yerda **haqiqiy Python 3** ishlaydi — kompyuteringizga hech narsa o'rnatish shart emas.\n\n" +
    "Ish tartibi: **Kod** oynasida faylni tahrirlaysiz (u avtomatik saqlanadi), **Terminal**da `python3 fayl.py` bilan ishga tushirasiz. Ko'p topshiriqlarda `funksiyalar.py` dagi bitta funksiyani to'ldirasiz — `python3 funksiyalar.py` ni ishga tushirganingizda funksiya **yashirin testlar** bilan tekshiriladi; xato bo'lsa, qaysi kirishda nima kutilgani sariq rangda ko'rsatiladi.\n\n" +
    "Python'da **chekinish** (indent) muhim: funksiya yoki `if` ichidagi qatorlar 4 bo'sh joy bilan boshlanadi — muharrirda Tab buni o'zi qiladi. Xato chiqsa, oxirgi qatorini o'qing: xato turi va sababi o'sha yerda. Cheksiz sikl yozib qo'ysangiz, dastur 5 soniyadan keyin to'xtatiladi.",
  shell: () => ({
    fs: { home: { talaba: { python: { 'salom.py': SALOM, 'funksiyalar.py': FUNKSIYALAR, 'talabalar.csv': TALABALAR, 'salomlash.py': SALOMLASH, 'hisobot.py': HISOBOT } } }, tmp: {} },
    cwd: DIR,
  }),
  tasks: [
    {
      id: 'version',
      teach: ['python3', 'python3 --version'],
      text: 'Python qaysi versiyada? Terminalda tekshiring.',
      hint: '`python3 --version`',
      solution: ['python3 --version'],
      check: ({ output }) => /^Python 3\.\d+/.test(output),
    },
    {
      id: 'run',
      teach: ['python3 FAYL'],
      text: "`salom.py` ni ishga tushiring (Kod oynasida ichini ko'rishingiz mumkin).",
      hint: '`python3 salom.py`',
      solution: ['python3 salom.py'],
      check: (c) => ran(c, 'salom.py') && c.output.trim() === 'Salom, dunyo!',
    },
    {
      id: 'edit',
      text: "**Kod** oynasida `salom.py` ni o'zgartiring: u `Salom, KiberAkademiya!` deb chiqarsin. Keyin qayta ishga tushiring.",
      hint: 'Qo\'shtirnoq ichidagi matnni almashtiring: `print("Salom, KiberAkademiya!")`, keyin `python3 salom.py`.',
      solution: [edit('salom.py', 'print("Salom, KiberAkademiya!")\n'), 'python3 salom.py'],
      check: (c) => ran(c, 'salom.py') && c.output.trim() === 'Salom, KiberAkademiya!',
    },
    {
      id: 'arith',
      teach: ['python3 -c'],
      text: "Bir qatorli kod: bir haftada necha soniya bor (7 × 24 × 60 × 60)?",
      hint: '`python3 -c "print(7 * 24 * 60 * 60)"`',
      solution: ['python3 -c "print(7 * 24 * 60 * 60)"'],
      check: ({ line, output }) => /^\s*python3\b/.test(line) && output.trim() === '604800',
    },
    {
      id: 'if',
      text: "`funksiyalar.py` dagi `baho(ball)` ni yozing: 86 va yuqori — `\"a'lo\"`, 71–85 — `\"yaxshi\"`, 56–70 — `\"qoniqarli\"`, qolgani — `\"qoniqarsiz\"`. So'ng `python3 funksiyalar.py`.",
      hint: "`if ball >= 86:` → `return \"a'lo\"`, keyin `elif ball >= 71:` ... va oxirida `return \"qoniqarsiz\"`. `return` funksiyadan natija qaytaradi.",
      solution: [editFn('funksiyalar.py', 'baho', `    if ball >= 86:\n        return "a'lo"\n    elif ball >= 71:\n        return "yaxshi"\n    elif ball >= 56:\n        return "qoniqarli"\n    return "qoniqarsiz"`), RUN],
      ...pyCases(F, 'baho', [['100', `"a'lo"`], ['86', `"a'lo"`], ['85', '"yaxshi"'], ['71', '"yaxshi"'], ['70', '"qoniqarli"'], ['56', '"qoniqarli"'], ['55', '"qoniqarsiz"'], ['0', '"qoniqarsiz"']]),
    },
    {
      id: 'for',
      text: "`juft_sonlar(n)`: 0 dan n gacha (n ham) juft sonlar ro'yxati. `for` va `range()` bilan yozing.",
      hint: "`natija = []`, `for i in range(n + 1):`, `if i % 2 == 0:` → `natija.append(i)`, oxirida `return natija`. (Qisqasi: `list(range(0, n + 1, 2))`.)",
      solution: [editFn('funksiyalar.py', 'juft_sonlar', '    natija = []\n    for i in range(n + 1):\n        if i % 2 == 0:\n            natija.append(i)\n    return natija'), RUN],
      ...pyCases(F, 'juft_sonlar', [['10', '[0, 2, 4, 6, 8, 10]'], ['7', '[0, 2, 4, 6]'], ['0', '[0]'], ['1', '[0]']]),
    },
    {
      id: 'len',
      text: '`parol_uzunmi(parol)`: parol kamida 12 belgi bo\'lsa `True`, aks holda `False`.',
      hint: '`return len(parol) >= 12` — solishtirishning o\'zi True/False beradi.',
      solution: [editFn('funksiyalar.py', 'parol_uzunmi', '    return len(parol) >= 12'), RUN],
      ...pyCases(F, 'parol_uzunmi', [['"qisqa"', 'False'], ['"aniq12belgi!"', 'True'], ['"11belgi1234"', 'False'], ['""', 'False'], ['"Juda-uzun-parol-2026"', 'True']]),
    },
    {
      id: 'strings',
      text: "`toza_email(email)`: chetdagi bo'sh joylarni olib tashlab (`strip`), kichik harfga (`lower`) o'tkazsin. Foydalanuvchi kiritgan ma'lumotni solishtirishdan oldin shunday tozalash kerak.",
      hint: '`return email.strip().lower()` — usullarni zanjir qilib chaqirish mumkin.',
      solution: [editFn('funksiyalar.py', 'toza_email', '    return email.strip().lower()'), RUN],
      ...pyCases(F, 'toza_email', [['"  Aziz@Qaydnoma.Example.COM "', '"aziz@qaydnoma.example.com"'], ['"nodira@example.com"', '"nodira@example.com"'], ['"\\tDILNOZA@MAIL.EXAMPLE\\n"', '"dilnoza@mail.example"']]),
    },
    {
      id: 'list',
      text: "`eng_katta(sonlar)`: ro'yxatdagi eng katta son; ro'yxat bo'sh bo'lsa `None`. (Avval bo'shligini tekshiring — `max([])` xato beradi.)",
      hint: '`if not sonlar:` → `return None`; keyin `return max(sonlar)`.',
      solution: [editFn('funksiyalar.py', 'eng_katta', '    if not sonlar:\n        return None\n    return max(sonlar)'), RUN],
      ...pyCases(F, 'eng_katta', [['[3, 17, 5]', '17'], ['[-4, -2, -9]', '-2'], ['[42]', '42'], ['[]', 'None']]),
    },
    {
      id: 'dict',
      text: "`sanash(sozlar)`: har bir so'z necha marta uchrashini lug'at qilib qaytarsin: `['a', 'b', 'a']` → `{'a': 2, 'b': 1}`. Log tahlilining asosiy amali shu.",
      hint: "`natija = {}`, `for s in sozlar:` → `natija[s] = natija.get(s, 0) + 1`, `return natija`. (Yoki `collections.Counter`.)",
      solution: [editFn('funksiyalar.py', 'sanash', '    natija = {}\n    for s in sozlar:\n        natija[s] = natija.get(s, 0) + 1\n    return natija'), RUN],
      ...pyCases(F, 'sanash', [[`["root", "admin", "root"]`, `{"root": 2, "admin": 1}`], ['[]', '{}'], [`["a", "a", "a", "b"]`, `{"a": 3, "b": 1}`]]),
    },
    {
      id: 'try',
      text: "`songa(matn)`: `int(matn)` ni qaytarsin, lekin matn son bo'lmasa (`ValueError`) — `None`. Dasturlar kirishdagi xato tufayli yiqilmasligi kerak.",
      hint: '`try:` → `return int(matn)`, `except ValueError:` → `return None`.',
      solution: [editFn('funksiyalar.py', 'songa', '    try:\n        return int(matn)\n    except ValueError:\n        return None'), RUN],
      ...pyCases(F, 'songa', [['"42"', '42'], ['"-7"', '-7'], ['"qirq"', 'None'], ['"3.5"', 'None'], ['""', 'None']]),
    },
    {
      id: 'file',
      text: "`qatorlar_soni(yol)`: fayldagi qatorlar soni. `with open(...)` bilan oching.",
      hint: "`with open(yol) as f:` → `return len(f.readlines())` — `with` faylni o'zi yopadi.",
      solution: [editFn('funksiyalar.py', 'qatorlar_soni', '    with open(yol) as f:\n        return len(f.readlines())'), RUN],
      ...pyCases(F, 'qatorlar_soni', [[pyStr(`${DIR}/talabalar.csv`), '5'], [pyStr(`${DIR}/salom.py`), 'len(open(' + pyStr(`${DIR}/salom.py`) + ').readlines())']]),
    },
    {
      id: 'argv',
      teach: ['python3 ARGUMENT'],
      text: "`salomlash.py` ni to'ldiring: buyruq qatorida berilgan ism bilan salomlashsin — `python3 salomlash.py Aziz` → `Salom, Aziz!`.",
      hint: "`sys.argv[1]` — birinchi argument: `print(f\"Salom, {sys.argv[1]}!\")`. f-satrda `{}` ichidagi ifoda qiymati qo'yiladi.",
      solution: [edit('salomlash.py', 'import sys\n\nprint(f"Salom, {sys.argv[1]}!")\n'), 'python3 salomlash.py Aziz'],
      check: (c) => ran(c, 'salomlash.py') && /^Salom, (\S+)!$/.test(c.output.trim()) && c.output.trim() === `Salom, ${c.line.trim().split(/\s+/)[2]}!`,
    },
    {
      id: 'import',
      text: "`hisobot.py` ni yozing: `talabalar.csv` ni o'qib, har bir qator uchun `Ism: baho` chiqarsin (`baho` funksiyasi `funksiyalar.py` dan import qilingan). Masalan: `Aziz: a'lo`.",
      hint: "`for qator in open('talabalar.csv'):` → `ism, ball = qator.strip().split(',')` → `print(f\"{ism}: {baho(int(ball))}\")`.",
      solution: [edit('hisobot.py', "from funksiyalar import baho\n\nfor qator in open('talabalar.csv'):\n    ism, ball = qator.strip().split(',')\n    print(f\"{ism}: {baho(int(ball))}\")\n"), 'python3 hisobot.py'],
      check: (c) => ran(c, 'hisobot.py') && c.output.trim() === "Aziz: a'lo\nDilnoza: yaxshi\nJasur: qoniqarsiz\nMalika: a'lo\nBekzod: qoniqarli",
    },
    {
      id: 'error',
      text: "Xatolarni o'qishni o'rganing: `python3 -c \"print(10 / 0)\"` ni ishga tushiring. Oxirgi qatorda qaysi xato turi yozilgan?",
      hint: "`ZeroDivisionError: division by zero` — `Traceback` dan pastdagi oxirgi qator eng muhim: xato turi va sababi.",
      solution: ['python3 -c "print(10 / 0)"'],
      check: ({ output }) => output.includes('ZeroDivisionError'),
    },
    {
      id: 'challenge',
      challenge: true,
      text: "Mustaqil vazifa. `parol_kuchi(parol)`: 0 dan 4 gacha ball — har biriga 1 ball: uzunligi kamida 12; kamida bitta raqam; kamida bitta katta harf; kamida bitta belgi (harf ham, raqam ham emas, masalan `!` yoki `-`).",
      hint: "`any(ch.isdigit() for ch in parol)` — biror belgi raqammi; `isupper()`, `isalnum()` ham bor. Har shart uchun `ball += 1`.",
      solution: [editFn('funksiyalar.py', 'parol_kuchi', '    ball = 0\n    if len(parol) >= 12:\n        ball += 1\n    if any(ch.isdigit() for ch in parol):\n        ball += 1\n    if any(ch.isupper() for ch in parol):\n        ball += 1\n    if any(not ch.isalnum() for ch in parol):\n        ball += 1\n    return ball'), RUN],
      ...pyCases(F, 'parol_kuchi', [['"parol"', '0'], ['"Parol123!"', '3'], ['"juda-uzun-parol-bu"', '2'], ['"Juda-Uzun-Parol-2026"', '4'], ['"123456789012"', '2'], ['""', '0']]),
    },
  ],
};
