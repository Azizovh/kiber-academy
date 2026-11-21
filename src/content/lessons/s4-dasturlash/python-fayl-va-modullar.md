O'tgan darsdagi jurnal tahlilchisi ishlaydi — lekin jurnal qatorlari kodning ichiga yozib qo'yilgan. Haqiqiy vosita **fayldan o'qiydi**, natijani **faylga yozadi**, kutilmagan holatda **qulab tushmaydi** va boshqalar yozgan tayyor **kutubxonalardan** foydalanadi.

Bu darsda Python dasturini "o'yinchoq"dan haqiqiy vositaga aylantiradigan to'rt narsani o'rganasiz.

## Fayldan o'qish

```python
with open("auth.log") as fayl:
    for qator in fayl:
        print(qator.strip())
```

Uch narsaga e'tibor bering:

- `open("auth.log")` — faylni ochadi.
- `with ... as fayl:` — blok tugagach faylni **o'zi yopadi**, hatto xato yuz bersa ham. Doim shu shaklni ishlating.
- `for qator in fayl:` — faylni **qatorma-qator** o'qiydi. Bu muhim: 5 gigabaytli jurnal xotiraga to'liq yuklanmaydi.

`.strip()` — qator oxiridagi yangi qator belgisini (`\n`) olib tashlaydi.

Boshqa usullar:

```python
with open("royxat.txt") as f:
    matn = f.read()             # butun fayl — bitta matn
    
with open("royxat.txt") as f:
    qatorlar = f.read().splitlines()    # qatorlar ro'yxati (\n siz)
```

`read()` — kichik fayllar uchun. Katta jurnal uchun — faqat qatorma-qator.

## Faylga yozish

```python
with open("hisobot.txt", "w") as f:
    f.write("Tekshiruv natijalari\n")
    f.write(f"Topilmalar: {soni}\n")
```

Ikkinchi argument — **rejim**:

| Rejim | Ma'nosi | Bash'dagi o'xshashi |
|---|---|---|
| `"r"` | O'qish (standart) | `<` |
| `"w"` | Yozish — **eski mazmun o'chadi** | `>` |
| `"a"` | Oxiriga qo'shish | `>>` |
| `"rb"`, `"wb"` | Ikkilik (bayt) rejimi — rasm, arxiv, xesh hisoblash uchun | |

`"w"` va `"a"` — Linux'dagi `>` va `>>` ning aynan o'zi, xavfi ham bir xil: `"w"` ogohlantirmasdan ustidan yozadi.

`write()` yangi qator belgisini o'zi qo'shmaydi — `\n` ni o'zingiz yozasiz.

### Kodlash

Matnli faylni ochganda kodlashni ko'rsatish — yaxshi odat ("Ma'lumotni kodlash" darsini eslang):

```python
with open("fayl.txt", encoding="utf-8") as f:
    ...
```

Usiz Windows'da o'zbekcha yoki ruscha matnli fayl `UnicodeDecodeError` berishi mumkin. Buzilgan baytlari bor jurnallar uchun: `errors="replace"`.

## Xatolarni ushlash

Fayl mavjud bo'lmasa nima bo'ladi?

```
FileNotFoundError: [Errno 2] No such file or directory: 'auth.log'
```

Dastur qulab tushadi. Vosita uchun bu yomon xulq. [[exception|Istisno]]larni `try / except` bilan ushlaymiz:

```python
try:
    with open("auth.log") as f:
        qatorlar = f.read().splitlines()
except FileNotFoundError:
    print("Xato: auth.log topilmadi")
    qatorlar = []
except PermissionError:
    print("Xato: faylni o'qishga ruxsat yo'q (sudo kerakdir?)")
    qatorlar = []
```

"`try` ichidagini bajarib ko'r; falon xato chiqsa — `except` ichidagini bajar."

Ikkinchi klassik misol — foydalanuvchi kiritgan narsa:

```python
try:
    port = int(input("Port: "))
except ValueError:
    print("Bu son emas")
```

To'liq shakli:

```python
try:
    ...            # xavfli amal
except ValueError:
    ...            # aniq shu xato uchun
else:
    ...            # xato BO'LMASA bajariladi
finally:
    ...            # har qanday holatda bajariladi (tozalash)
```

:::warn
Hech qachon yalang'och `except:` yoki `except Exception: pass` yozmang. Bu **hamma** xatoni — shu jumladan siz kutmagan, tuzatish kerak bo'lgan xatolarni ham — jimgina yutib yuboradi. Dastur "ishlayotgandek" ko'rinadi, lekin noto'g'ri natija beradi. **Faqat o'zingiz kutgan aniq xatoni ushlang.**
:::

Xavfsizlik nuqtai nazaridan ham muhim jihat: xato xabarida nima ko'rsatilishi. Veb-ilova foydalanuvchiga to'liq traceback'ni ko'rsatsa, u fayl yo'llari, kutubxona versiyalari va kod tuzilishini oshkor qiladi — hujumchi uchun bepul razvedka. Qoida: **foydalanuvchiga — qisqa xabar, batafsilini — jurnalga**.

## Modullar

Python'ning kuchi — tayyor kodda. [[module|Modul]] — `import` qilinadigan kod to'plami.

```python
import os
import hashlib
from datetime import datetime
from collections import Counter
```

Ikki shakl:

| Yozuv | Ishlatilishi |
|---|---|
| `import os` | `os.listdir(".")` — modul nomi orqali |
| `from os import listdir` | `listdir(".")` — to'g'ridan-to'g'ri |

### Standart kutubxona

Python bilan birga keladigan modullar — hech narsa o'rnatish shart emas. Xavfsizlik ishida eng ko'p kerak bo'ladiganlari:

| Modul | Nima uchun |
|---|---|
| `os`, `pathlib` | Fayllar, kataloglar, yo'llar |
| `sys` | Buyruq satri argumentlari, chiqish kodi |
| `re` | Regex — matndan namuna qidirish |
| `json`, `csv` | Ma'lumot formatlari |
| `hashlib` | Xesh hisoblash (MD5, SHA-256) |
| `base64` | Base64 kodlash va dekodlash |
| `datetime` | Sana va vaqt |
| `collections` | `Counter` va boshqa qulay tuzilmalar |
| `socket` | Tarmoq ulanishlari |
| `subprocess` | Tizim buyruqlarini ishga tushirish |
| `argparse` | Buyruq satri opsiyalarini qulay o'qish |

Tanish narsalar: "Ma'lumotni kodlash" darsida terminalda qilgan ishingiz — endi Python'da:

```python
import base64

base64.b64encode(b"Salom")              # b'U2Fsb20='
base64.b64decode("U2Fsb20=")            # b'Salom'
"Salom".encode().hex()                  # '53616c6f6d'
bytes.fromhex("53616c6f6d").decode()    # 'Salom'
```

`b"..."` — **baytlar** (bytes), oddiy matn emas. `.encode()` matnni baytga, `.decode()` baytni matnga aylantiradi. Kodlash va tarmoq bilan ishlaganda bu farq doim uchraydi.

### Argumentlar: sys.argv

Bash'dagi `$1` ning o'xshashi:

```python
import sys

if len(sys.argv) < 2:
    print(f"Ishlatilishi: {sys.argv[0]} FAYL")
    sys.exit(1)

fayl_nomi = sys.argv[1]
```

`sys.argv` — ro'yxat: `[0]` — skript nomi, `[1]` — birinchi argument. `sys.exit(1)` — xato kodi bilan chiqish (Bash darsidagi chiqish kodi).

### Regex: re moduli

`grep -oE` ning o'xshashi — matndan namuna bo'yicha qismlarni ajratib olish:

```python
import re

qator = "Failed password for root from 203.0.113.45 port 51122"
ip_namuna = r"\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}"

re.findall(ip_namuna, qator)        # ['203.0.113.45']
re.search(r"for (\w+) from", qator).group(1)    # 'root'
```

`r"..."` — "xom" matn: teskari slesh maxsus ma'no bermaydi. Regex doim shunday yoziladi. `\d` — raqam, `\w` — harf yoki raqam.

`split()[10]` qator formati sal o'zgarsa — buziladi. Regex esa IP manzilni qatorning qayerida bo'lmasin topadi.

### JSON

[[json|JSON]] — dasturlar orasida ma'lumot almashishning asosiy formati: API javoblari, sozlamalar, zamonaviy jurnallar.

```python
import json

matn = '{"ip": "10.0.0.5", "portlar": [22, 80], "tirik": true}'
malumot = json.loads(matn)          # matn → dict
malumot["portlar"][0]               # 22

json.dumps(malumot, indent=2)       # dict → chiroyli matn

with open("natija.json", "w") as f:
    json.dump(malumot, f, indent=2) # faylga yozish

with open("natija.json") as f:
    malumot = json.load(f)          # fayldan o'qish
```

JSON'ni o'qigach, u oddiy lug'at va ro'yxatlarga aylanadi — o'tgan darsdagi bilim to'liq ishlaydi.

## Tashqi kutubxonalar: pip

Standart kutubxonada yo'q narsalar [[pip|pip]] bilan o'rnatiladi:

```bash
pip install requests
pip list
pip show requests
```

Loyiha bog'liqliklari `requirements.txt` faylida yoziladi:

```bash
pip freeze > requirements.txt
pip install -r requirements.txt
```

### Virtual muhit

Har bir loyihaga alohida kutubxonalar to'plami — [[virtual-environment|virtual muhit]]:

```bash
python3 -m venv .venv               # yaratish
source .venv/bin/activate           # yoqish (Linux)
.venv\Scripts\activate              # yoqish (Windows)
pip install requests                # endi faqat shu loyihaga o'rnatiladi
deactivate                          # o'chirish
```

Nega kerak: bir vosita kutubxonaning eski versiyasini, boshqasi yangisini talab qiladi. Virtual muhitsiz ular bir-birini buzadi. Zamonaviy Kali va Ubuntu tizim Python'iga to'g'ridan-to'g'ri `pip install` qilishga yo'l ham qo'ymaydi (`externally-managed-environment` xatosi) — aynan shu sababdan.

:::warn
`pip install` — **begona kodni kompyuteringizda ishga tushirish**. Paketlar omborida hech kim ularni oldindan tekshirmaydi, va mashhur nomga o'xshash zararli paketlar muntazam topiladi (`requests` o'rniga `reqeusts`). Linux bosqichidagi qoida bu yerda ham amal qiladi:

- Nomni **aniq** yozing; hujjatdan nusxalang.
- Notanish paketni o'rnatishdan oldin sahifasini ko'ring: qachon yaratilgan, kim yuritadi, nechta foydalanuvchi.
- Sinov va notanish vositalar — virtual mashinada.
:::

## Hammasi birga: haqiqiy vosita

O'tgan darsdagi tahlilchini to'laqonli vositaga aylantiramiz:

```python
#!/usr/bin/env python3
"""kirish_tahlili.py — SSH jurnalidan kirish urinishlari hisoboti."""

import re
import sys
import json
from collections import Counter

IP_NAMUNA = re.compile(r"from (\d{1,3}(?:\.\d{1,3}){3})")


def jurnalni_oqi(yol):
    """Jurnaldan muvaffaqiyatsiz va muvaffaqiyatli kirish manzillarini sanaydi."""
    xato, muvaffaqiyat = Counter(), Counter()
    with open(yol, encoding="utf-8", errors="replace") as fayl:
        for qator in fayl:
            topildi = IP_NAMUNA.search(qator)
            if not topildi:
                continue
            ip = topildi.group(1)
            if "Failed password" in qator:
                xato[ip] += 1
            elif "Accepted" in qator:
                muvaffaqiyat[ip] += 1
    return xato, muvaffaqiyat


def main():
    if len(sys.argv) < 2:
        print(f"Ishlatilishi: {sys.argv[0]} JURNAL_FAYLI")
        sys.exit(1)

    try:
        xato, muvaffaqiyat = jurnalni_oqi(sys.argv[1])
    except FileNotFoundError:
        print(f"Xato: {sys.argv[1]} topilmadi")
        sys.exit(1)
    except PermissionError:
        print("Xato: faylni o'qishga ruxsat yo'q")
        sys.exit(1)

    print(f"Muvaffaqiyatsiz urinishlar: {sum(xato.values())}")
    for ip, soni in xato.most_common(5):
        print(f"  {soni:6}  {ip}")

    shubhali = [ip for ip in xato if ip in muvaffaqiyat and xato[ip] >= 3]
    for ip in shubhali:
        print(f"[!] {ip}: {xato[ip]} ta xato urinishdan keyin kirgan")

    with open("hisobot.json", "w") as f:
        json.dump({"xato": dict(xato), "shubhali": shubhali}, f, indent=2)
    print("Hisobot saqlandi: hisobot.json")


if __name__ == "__main__":
    main()
```

```bash
python3 kirish_tahlili.py /var/log/auth.log
```

Yangi narsalar:

- `#!/usr/bin/env python3` — shebang: `chmod +x` qilib, `./kirish_tahlili.py` deb ishga tushirish mumkin.
- `re.compile(...)` — namunani bir marta tayyorlab, ko'p marta ishlatish.
- `[ip for ip in xato if ...]` — **list comprehension**: sikl va shartni bir qatorda yozib, yangi ro'yxat hosil qilish.
- `if __name__ == "__main__":` — "bu fayl to'g'ridan-to'g'ri ishga tushirilgan bo'lsa". Fayl boshqa joyga `import` qilinganda `main()` o'zi ishga tushib ketmaydi.

Bu — 45 qator. U gigabaytli jurnalni o'qiydi, xatolarga chidamli, natijani ham odam, ham boshqa dastur o'qiy oladigan shaklda beradi. Siz hozir o'zingizning birinchi xavfsizlik vositangizni yozdingiz.

## Amaliyot: haqiqiy loglar bilan

Fayl o'qish, xatolarni ushlash, modul import qilish, CSV va JSON hisobot — Qaydnoma'ning haqiqiy loglari ustida. SIEM labida SPL bilan topgan hujumni endi o'z skriptingiz topadi.

:::lab python-log-tahlili

:::try
1. `kirish_tahlili.py` ni yozing va sinab ko'ring. Kali'da jurnal bo'sh bo'lsa, "Log tahlili" labidagi qatorlardan o'zingiz `namuna.log` fayl yarating.
2. Mavjud bo'lmagan fayl nomi bilan ishga tushiring — xato chiroyli chiqdimi?
3. Kengaytiring: hujumchi sinab ko'rgan **foydalanuvchi nomlarini** ham sanang (regex: `r"for (\w+) from"`).
4. `hisobot.json` ni ochib ko'ring. Keyin uni o'qib, shubhali manzillarni chiqaradigan alohida 5 qatorli skript yozing.
5. Virtual muhit yarating, yoqing va unda `pip install requests` bajaring — keyingi dars uchun kerak bo'ladi.
:::

## Xulosa

- `with open(fayl) as f:` — faylni xavfsiz ochish; `for qator in f:` — qatorma-qator.
- Rejimlar: `"r"` o'qish, `"w"` ustidan yozish, `"a"` qo'shish, `"rb"` baytlar.
- `try / except AniqXato:` — faqat kutilgan xatoni ushlang; yalang'och `except` — yomon.
- `import modul` — standart kutubxona: `os`, `sys`, `re`, `json`, `hashlib`, `base64`, `socket`.
- `sys.argv` — argumentlar; `sys.exit(kod)` — chiqish kodi.
- `re.findall`, `re.search` — matndan namuna bo'yicha ajratish.
- `json.load` / `json.dump` — JSON ↔ dict.
- `pip install` + **virtual muhit**; paket nomini aniq yozing.
- `if __name__ == "__main__":` — skriptning kirish nuqtasi.

:::quiz
? Faylni `with open(...) as f:` bilan ochishning afzalligi nima?
- Fayl tezroq o'qiladi
+ Blok tugagach fayl avtomatik yopiladi — xato yuz bersa ham
- Fayl shifrlanadi
- Fayl faqat o'qish uchun ochiladi
! with faylning yopilishini kafolatlaydi. Usiz yopishni unutish yoki xato tufayli yopilmay qolish mumkin.

? `open("natija.txt", "w")` mavjud faylni qanday ochadi?
- Oxiriga qo'shish uchun
+ Eski mazmunini o'chirib, yozish uchun
- Faqat o'qish uchun
- Xato beradi
! "w" — write: fayl bo'shatiladi. Oxiriga qo'shish uchun "a" (append) ishlatiladi.

? Katta jurnal faylini qanday o'qish to'g'ri?
- f.read() bilan butunlay xotiraga yuklab
+ for qator in f: bilan qatorma-qator
- Faylni avval nusxalab
- Faqat birinchi 100 qatorini
! Qatorma-qator o'qishda xotirada bir vaqtda faqat bitta qator turadi — fayl hajmi muhim emas.

? Nega yalang'och `except:` yozish yomon amaliyot?
- U sekin ishlaydi
+ U barcha xatolarni, jumladan kutilmagan va tuzatilishi kerak bo'lganlarini ham yashiradi
- U faqat Python 2 da ishlaydi
- U faylni o'chiradi
! Aniq xato turini ushlash kerak. Hammasini yutib yuborish dasturni “ishlayotgandek” ko'rsatadi, lekin natija noto'g'ri bo'ladi.

? `int("abc")` qanday xato beradi?
- TypeError
+ ValueError
- NameError
- FileNotFoundError
! Tur to'g'ri (matn), lekin qiymat songa aylanmaydi — bu ValueError.

? `sys.argv[1]` nima?
- Skript nomi
+ Skriptga berilgan birinchi argument
- Python versiyasi
- Oxirgi xato
! sys.argv[0] — skript nomi, sys.argv[1] — birinchi argument (Bash'dagi $1).

? `json.loads('{"port": 22}')` nima qaytaradi?
- Matn
+ Lug'at (dict): {"port": 22}
- Ro'yxat
- Fayl
! loads JSON matnini Python tuzilmasiga aylantiradi: obyekt → dict, massiv → list.

? Virtual muhit (venv) nima uchun kerak?
- Dasturni tezlashtirish uchun
+ Har bir loyihaning kutubxonalarini boshqalaridan ajratib saqlash uchun
- Kodni shifrlash uchun
- Internetga ulanish uchun
! Turli loyihalar bir kutubxonaning turli versiyalarini talab qilishi mumkin. Virtual muhit ularni bir-biridan ajratadi.

? `pip install reqeusts` (imlo xatosi bilan) nega xavfli bo'lishi mumkin?
- pip xato beradi va kompyuter o'chadi
+ Mashhur paket nomiga o'xshash zararli paket o'rnatilib qolishi mumkin
- Bu faqat sekinroq o'rnatiladi
- Hech qanday xavfi yo'q
! Paketlar ombori oldindan tekshirilmaydi; hujumchilar mashhur nomlarning xato yozilgan variantlarini ro'yxatdan o'tkazadi (typosquatting).

? `if __name__ == "__main__":` qatori nima uchun ishlatiladi?
- Dasturni shifrlash uchun
+ Kod faqat fayl to'g'ridan-to'g'ri ishga tushirilganda bajarilishi uchun
- Xatolarni yashirish uchun
- Kutubxona o'rnatish uchun
! Fayl import qilinganda bu blok bajarilmaydi — funksiyalarni boshqa joyda qayta ishlatish mumkin bo'ladi.

? Veb-ilova xato yuz berganda foydalanuvchiga to'liq traceback ko'rsatsa, bu nega muammo?
- Sahifa xunuk ko'rinadi
+ U fayl yo'llari, kutubxona versiyalari va kod tuzilishini oshkor qiladi
- Server sekinlashadi
- Brauzer buziladi
! Batafsil xato xabari hujumchiga tizim haqida ma'lumot beradi. Foydalanuvchiga qisqa xabar, tafsilot esa jurnalga yoziladi.
:::

:::cards
Faylni xavfsiz ochish shakli? :: with open("fayl", encoding="utf-8") as f: — blok tugagach fayl o'zi yopiladi.
"r", "w", "a" rejimlari? :: r — o'qish; w — ustidan yozish (eski mazmun o'chadi); a — oxiriga qo'shish.
Katta faylni qanday o'qiladi? :: for qator in f: — qatorma-qator, xotiraga to'liq yuklamasdan.
try / except nima uchun? :: Kutilgan xatoni ushlab, dastur qulamasdan davom etishi yoki chiroyli xabar berishi uchun.
Qaysi except yomon amaliyot? :: Yalang'och except: yoki except Exception: pass — barcha xatolarni yashiradi.
sys.argv nima? :: Buyruq satri argumentlari ro'yxati: [0] — skript nomi, [1] — birinchi argument.
JSON bilan ishlash funksiyalari? :: json.loads / json.load — o'qish (matn yoki fayldan); json.dumps / json.dump — yozish.
Matndan IP manzillarni ajratish (re)? :: re.findall(r"\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}", matn)
Virtual muhit yaratish va yoqish? :: python3 -m venv .venv, keyin source .venv/bin/activate (Windows: .venv\Scripts\activate).
bytes va str farqi? :: str — matn; bytes (b"...") — xom baytlar. .encode() matnni baytga, .decode() baytni matnga aylantiradi.
if __name__ == "__main__": nima uchun? :: Kod faqat fayl to'g'ridan-to'g'ri ishga tushirilganda bajarilishi uchun.
:::
