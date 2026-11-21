Qaydnoma'ga yangi dasturchi qo'shildi va "tezroq ishlashi uchun" qidiruvni qayta yozdi. Kod ko'rib chiqishda siz bitta qatorni ko'rasiz:

```python
db.execute(f"SELECT id, title FROM notes WHERE owner_id = {uid} AND title LIKE '%{q}%'")
```

Hech qanday skaner hali hech narsa demagan, testlar o'tadi, qidiruv ishlaydi. Lekin siz bilasiz: bu qatorda foydalanuvchi matni SQL tilining **ichiga** kirib qolgan. a1 bosqichidagi asosiy tamoyil buzilgan: **kod va ma'lumot aralashtirilgan.**

Injection — o'nlab yillar davomida eng xavfli web zaifliklari ro'yxatining yuqorisida turgan sinf. U zaif nuqtadan butun ma'lumotlar bazasini o'qish, o'zgartirish yoki serverda buyruq bajarishgacha olib borishi mumkin. Yaxshi xabar: uning himoyasi oddiy va universal. Bu darsda injection'ning turlarini, ularni kodda **topish**ni va **tuzatish**ni o'rganasiz.

## Injection'ning umumiy formulasi

Har qanday injection bir xil tuzilishga ega:

```
  Foydalanuvchi ma'lumoti  ──►  satrga yopishtiriladi  ──►  boshqa til interpretatoriga yuboriladi
       (ishonchsiz)              (f-string, +, %)              (SQL, shell, LDAP, shablon, XPath…)

  Natija: ma'lumotdagi maxsus belgilar (qo'shtirnoq, ;, |, {{ }}) interpretator uchun KOD bo'ladi
```

| Turi | Interpretator | Xavfli kod namunasi |
|---|---|---|
| **SQL injection** | Ma'lumotlar bazasi | `f"... WHERE name = '{name}'"` |
| **NoSQL injection** | MongoDB va boshqalar | So'rovga foydalanuvchi obyektini to'g'ridan-to'g'ri berish |
| **OS command injection** | Shell (`sh`, `cmd`) | `os.system(f"ping {host}")` |
| **Shablon injection** (SSTI) | Shablon dvigateli | Foydalanuvchi matnini shablonning **o'zi** sifatida render qilish |
| **LDAP injection** | Katalog xizmati | `f"(uid={user})"` |
| **Log injection** | Log tizimi / SIEM | Foydalanuvchi matnidagi yangi qator belgilari soxta log yozuvi yaratadi |

Himoya ham har doim bir xil g'oya: **ma'lumotni koddan ajratadigan mexanizmdan foydalanish.**

## SQL injection

### Nima bo'ladi

Dars boshidagi kodda foydalanuvchi qidiruvga qo'shtirnoq (`'`) belgisini kiritsa, u SQL satrini "yopadi" va undan keyingi matn SQL **buyrug'i** sifatida talqin qilinadi. Natijada so'rovning mantig'i o'zgaradi — masalan, `owner_id` sharti chetlab o'tiladi va boshqa foydalanuvchilarning qaydlari qaytadi, yoki butunlay boshqa jadvallar (masalan, `users`) o'qiladi.

Mumkin bo'lgan oqibatlar:

| Oqibat | Misol |
|---|---|
| Ma'lumot o'g'irlanishi | Boshqa jadvallar, parol xeshlari |
| Autentifikatsiyani chetlab o'tish | Login so'rovidagi shartni "har doim rost" qilish |
| Ma'lumotni o'zgartirish yoki o'chirish | `UPDATE`, `DELETE` |
| Serverni egallash | Ba'zi bazalar va sozlamalarda — fayllarga yozish yoki buyruq bajarish |

### "Ko'r" SQL injection

Ilova xatolarni yoki natijalarni ko'rsatmasa ham, injection mavjud bo'lishi mumkin: hujumchi javobdagi farqlar (sahifa o'zgaradimi?) yoki javob **vaqti** orqali ma'lumotni bit-bit chiqaradi. Bu muhim saboq: **"xato xabari chiqmadi" — "zaiflik yo'q" degani emas.** Zaiflik kodda — natija ko'rinishida emas.

### To'g'ri himoya — parametrlangan so'rov

a1 bosqichidagi Qaydnoma'da allaqachon shunday yozgansiz:

```python
# ✅ Parametrlangan so'rov
rows = db.execute(
    "SELECT id, title FROM notes WHERE owner_id = ? AND title LIKE ?",
    (session["user_id"], f"%{q}%"),
).fetchall()
```

Turli tillar va kutubxonalarda belgilash farq qiladi, g'oya bir xil:

| Muhit | Parametr belgisi |
|---|---|
| Python `sqlite3` | `?` |
| Python `psycopg` (PostgreSQL) | `%s` (bu Python formatlash **emas** — kutubxona parametri!) |
| SQLAlchemy `text()` | `:nom` va alohida lug'at |
| Java JDBC | `PreparedStatement` + `?` |
| Node.js (pg) | `$1`, `$2` |
| PHP PDO | `?` yoki `:nom` |

`psycopg` dagi `%s` alohida tuzoq: `cur.execute("... WHERE id = %s", (nid,))` — xavfsiz; `cur.execute("... WHERE id = %s" % nid)` — **xavfli** (Python `%` operatori satrni yig'adi). Farq — bitta vergul va qavs. Kod ko'rib chiqishda aynan shunday detallar ushlanadi.

### Parametrlab bo'lmaydigan joylar

Parametr faqat **qiymatlar** uchun ishlaydi. Jadval nomi, ustun nomi, `ORDER BY` yo'nalishi — parametr bo'la olmaydi. Masalan, foydalanuvchi saralash ustunini tanlasa:

```python
# ❌ Ustun nomi to'g'ridan-to'g'ri satrga
db.execute(f"SELECT id, title FROM notes WHERE owner_id = ? ORDER BY {sort}", (uid,))

# ✅ Allowlist — faqat oldindan ma'lum qiymatlar
SORT_COLUMNS = {"title": "title", "newest": "id DESC", "oldest": "id ASC"}
order_by = SORT_COLUMNS.get(request.args.get("sort"), "id DESC")
db.execute(f"SELECT id, title FROM notes WHERE owner_id = ? ORDER BY {order_by}", (uid,))
```

Bu yerda f-string bor, lekin xavfsiz: satrga faqat **dasturchi yozgan** qiymatlardan biri kiradi, foydalanuvchi matni emas. Allowlist — injection himoyasining ikkinchi asosiy vositasi.

### Noto'g'ri "himoyalar"

| Usul | Nega yetarli emas |
|---|---|
| Qo'shtirnoqlarni "qochirish" (escape) qo'lda | Kodlash, belgilar to'plami va kontekstga qarab chetlab o'tiladi; unutish oson |
| "Xavfli so'zlar"ni (`SELECT`, `UNION`) olib tashlash | Katta-kichik harf, izohlar, kodlash bilan aylanib o'tiladi; qonuniy matnni buzadi |
| Faqat frontend'da tekshirish | Chetlab o'tiladi (a1 bosqichi) |
| WAF | Yordam beradi, lekin aylanib o'tiladi — qo'shimcha qatlam, tuzatish emas |
| Stored procedure | Faqat ichida dinamik SQL yo'q bo'lsa xavfsiz |

### Qo'shimcha qatlamlar

- **Bazaga eng kam huquq**: ilova foydalanuvchisi faqat kerakli jadvallarga va amallarga ruxsatga ega bo'lsin (masalan, `DROP` yo'q). Injection bo'lsa ham, zarar cheklanadi.
- **Xato xabarlarini yashirish**: foydalanuvchiga umumiy xabar, tafsilotlar — faqat logga.
- **[[input-validation|Kiritishni tekshirish]]**: ID raqam bo'lishi kerakmi — raqam ekanini tekshiring (Flask'dagi `<int:note_id>`). Bu himoyaning asosi emas, lekin hujum yuzasini kamaytiradi.

## NoSQL injection

"Biz MongoDB ishlatamiz — SQL yo'q, demak injection yo'q" — keng tarqalgan noto'g'ri fikr. NoSQL bazalarda so'rovlar obyektlar sifatida quriladi, va agar foydalanuvchi **obyekt** yubora olsa, u so'rov operatorlarini kiritishi mumkin:

```python
# ❌ JSON so'rov tanasidan kelgan qiymat to'g'ridan-to'g'ri so'rovga
user = db.users.find_one({"username": data["username"], "password": data["password"]})
# Agar data["password"] satr emas, balki operatorli obyekt bo'lsa — shart buziladi

# ✅ Turini qat'iy tekshirish va parolni xesh bilan solishtirish
username = data.get("username")
password = data.get("password")
if not isinstance(username, str) or not isinstance(password, str):
    abort(400)
user = db.users.find_one({"username": username})
if user is None or not check_password_hash(user["password_hash"], password):
    abort(401)
```

Himoya: **tur tekshiruvi** (satr kutilsa — faqat satr), sxema validatsiyasi (masalan, Pydantic yoki JSON Schema), va parolni hech qachon so'rov ichida solishtirmaslik.

## OS command injection

Ilova tizim buyrug'ini chaqiradi — masalan, Qaydnoma'ga "qaydni PDF'ga eksport" funksiyasi qo'shildi va u tashqi dasturni ishga tushiradi:

```python
import subprocess

# ❌ Shell orqali, foydalanuvchi matni satr ichida
subprocess.run(f"wkhtmltopdf {url} /tmp/{filename}.pdf", shell=True)
```

`shell=True` bilan butun satr shell tomonidan talqin qilinadi — va shell uchun `;`, `&&`, `|`, `$( )`, teskari qo'shtirnoqlar maxsus ma'noga ega. Linux bosqichidagi quvurlar va buyruqlar ketma-ketligini eslang: ular aynan shu belgilar orqali ishlaydi. Foydalanuvchi matnida ular bo'lsa — qo'shimcha buyruqlar bajariladi.

```python
# ✅ Argumentlar ro'yxati, shell yo'q, qiymatlar tekshirilgan
import re
from urllib.parse import urlparse

if not re.fullmatch(r"[A-Za-z0-9_-]{1,64}", filename):
    abort(400)
if urlparse(url).scheme not in {"http", "https"}:
    abort(400)
subprocess.run(["wkhtmltopdf", "--", url, f"/tmp/{filename}.pdf"], check=True, timeout=30)
```

| Himoya | Nega |
|---|---|
| **Argumentlar ro'yxati, `shell=True` yo'q** | Har bir argument dasturga alohida beriladi — shell talqini yo'q. Bu — buyruq uchun "parametrlangan so'rov" |
| `--` | Ko'p dasturlarda "bundan keyin opsiyalar emas" degani — `-` bilan boshlanadigan qiymat opsiya bo'lib qolmaydi |
| Allowlist tekshiruvi | Fayl nomi faqat ruxsat etilgan belgilardan |
| Iloji bo'lsa — tashqi buyruq o'rniga kutubxona | Python'ning o'zida PDF, rasm, arxiv kutubxonalari bor — eng xavfsiz buyruq — chaqirilmagan buyruq |

Kod ko'rib chiqishda qidiriladigan funksiyalar: `os.system`, `os.popen`, `subprocess.*(..., shell=True)`, `eval`, `exec`; boshqa tillarda — `Runtime.exec` (Java), `child_process.exec` (Node.js), `system`/`exec`/`passthru` (PHP).

## Shablon injection (SSTI)

a1 bosqichida Jinja2 shablonlari foydalanuvchi ma'lumotini **xavfsiz** ko'rsatishini ko'rdingiz — `{{ note.body }}`. Muammo boshqa joyda: foydalanuvchi matnini shablonning **o'zi** sifatida render qilish.

```python
from flask import render_template_string

# ❌ Foydalanuvchi matni shablon kodiga aylanadi
render_template_string(f"<h1>Salom, {username}!</h1>")

# ✅ Shablon — doimiy, foydalanuvchi matni — o'zgaruvchi
render_template_string("<h1>Salom, {{ name }}!</h1>", name=username)
```

Birinchi holatda foydalanuvchi ismida shablon sintaksisi (`{{ ... }}`) bo'lsa, shablon dvigateli uni **bajaradi** — bu ko'pincha serverda kod bajarishgacha olib boradi. Ikkinchi holatda ism — oddiy qiymat, avtomatik kodlanadi. Farq — yana kod va ma'lumotni ajratish.

## Log injection

Kam e'tibor beriladi, lekin SOC uchun muhim (b1–b2 bosqichlari). Agar foydalanuvchi matni (masalan, login nomi) to'g'ridan-to'g'ri logga yozilsa va unda yangi qator belgisi bo'lsa — hujumchi **soxta log yozuvlari** yaratishi mumkin: "admin muvaffaqiyatli kirdi" kabi. SIEM ularni haqiqiy deb o'qiydi.

Himoya: tuzilgan loglash (JSON — har bir maydon alohida), yoki yangi qator va boshqaruv belgilarini kodlash.

```python
import json, logging
logging.info(json.dumps({"event": "login_failed", "username": username, "ip": request.remote_addr}))
```

:::key
**Injection'ga qarshi tartib — har doim bir xil:** (1) ma'lumotni koddan ajratadigan **API**dan foydalaning — parametrlangan so'rov, argumentlar ro'yxati, shablon o'zgaruvchilari; (2) parametr bo'la olmaydigan joylarda — **allowlist**; (3) **turini va formatini** tekshiring; (4) zararni cheklang — eng kam huquq, umumiy xato xabarlari. "Xavfli belgilarni tozalash" yoki "taqiqlangan so'zlar ro'yxati" — himoya emas. Agar dasturchi "lekin men qo'shtirnoqlarni olib tashlayman" desa — sizning javobingiz: "parametrlangan so'rov bir qator, va u har doim ishlaydi".
:::

## Kodda injection'ni topish

AppSec muhandisi sifatida siz ko'pincha kodni o'qiysiz (a3 bosqichidagi kod ko'rib chiqish). Qidiruv usuli — **manbadan sink'gacha**:

- **Manba** (source) — ishonchsiz ma'lumot kiradigan joy: `request.args`, `request.form`, `request.json`, sarlavhalar, cookie'lar, fayllar.
- **Sink** — xavfli funksiya: `execute`, `raw`, `subprocess`, `os.system`, `render_template_string`, `eval`.
- **Savol**: manbadan kelgan ma'lumot sink'ga **tekshirilmasdan va ajratilmasdan** yetib boradimi?

Tez qidiruv uchun (keyinroq bu Semgrep qoidalariga aylanadi, a3):

```bash
grep -rnE "execute\(f\"|execute\(\".*%|\.raw\(|text\(f\"" .
grep -rnE "shell=True|os\.system|os\.popen|eval\(|exec\(" .
grep -rn "render_template_string" .
```

`grep` faqat boshlang'ich nuqta — har bir topilmani qo'lda tekshirasiz: bu yerda foydalanuvchi ma'lumoti bormi?

## Amaliyot: tuzatish va isbotlash

Quyidagi labda Qaydnoma'ning baza qatlamidagi satr ulab yig'ilgan so'rovlarni testlar va semgrep bilan topasiz, parametrli so'rovlar va ustun nomlari uchun ruxsat ro'yxati bilan tuzatasiz va testlar bilan isbotlaysiz. Ish himoyachi tomonidan: hujum qilish emas, kodni xavfsiz qilish.

:::lab python-sql-injection

## Sinash — faqat o'z ilovangizda

O'z Qaydnoma'ingizda (yoki PortSwigger Academy, OWASP Juice Shop kabi ruxsat etilgan laboratoriyalarda):

- Qidiruv maydoniga bitta qo'shtirnoq (`'`) kiriting — parametrlangan versiyada oddiy natija, zaif versiyada xato yoki g'alati natija.
- Qaydnoma'da ataylab zaif versiyani yarating (dars boshidagi qator), farqni ko'ring, keyin tuzating va **test yozing** (shu bosqichning oxirgi darsi).

Boshqalarning saytlarida "sinab ko'rish" — ruxsatsiz bo'lsa, jinoyat. Bu kursning boshidan takrorlanayotgan qoida.

## Bu dars nimani bermaydi

- **Hujum texnikalari katalogini** — maqsad himoya va topish; amaliy mashqlar uchun PortSwigger Academy'ning ruxsat etilgan laboratoriyalari bor.
- **Har bir baza va tilning tafsilotlarini** — OWASP SQL Injection Prevention va Injection Prevention cheat sheet'lari.
- **Avtomatik aniqlashni** — SAST va DAST a3 bosqichida.

:::try
**1. Zaif versiya va tuzatish.** Qaydnoma qidiruvini vaqtincha dars boshidagi f-string versiyaga o'zgartiring. Qidiruvga `'` kiriting — nima bo'ldi? Keyin parametrlangan versiyaga qaytaring va yana sinang. Git'da zaif versiyani commit qilmang.

**2. Saralash.** Qaydlar ro'yxatiga `?sort=` parametri bilan saralashni qo'shing — allowlist usulida.

**3. Kodni o'qing.** Quyidagi qatorlardan qaysilari xavfli va nega?
- (a) `cur.execute("SELECT * FROM notes WHERE id = %s", (nid,))`
- (b) `cur.execute("SELECT * FROM notes WHERE id = %s" % nid)`
- (c) `subprocess.run(["convert", path, out])`
- (d) `subprocess.run("convert " + path + " " + out, shell=True)`
- (e) `render_template_string("Salom {{ n }}", n=name)`

**4. grep bilan qidiring.** Yuqoridagi `grep` buyruqlarini o'z Qaydnoma loyihangizda va GitHub'dagi istalgan kichik ochiq Flask loyihasida ishga tushiring. Topilmalarni tahlil qiling: haqiqiy zaiflikmi yoki false positive?

**5. PortSwigger Academy.** SQL injection bo'limidagi nazariy qismni va dastlabki ikki laboratoriyani bajaring.

*Javoblar: 3 — (a) xavfsiz (kutubxona parametri); (b) xavfli (Python `%` satrni yig'adi); (c) xavfsizroq (ro'yxat, shell yo'q — lekin `path` `-` bilan boshlanmasligini tekshirish yoki `--` qo'shish foydali); (d) xavfli (shell + satr yig'ish); (e) xavfsiz (doimiy shablon, qiymat o'zgaruvchi sifatida).*
:::

## Xulosa

- **Injection** = ishonchsiz ma'lumot boshqa tilning (SQL, shell, shablon, LDAP, log) kodiga aylanadi.
- **SQL injection**: ma'lumot o'g'irlanishi, autentifikatsiyani chetlab o'tish, o'zgartirish; "ko'r" variantlari ham bor — xato ko'rinmasligi xavfsizlik emas.
- Himoya: **parametrlangan so'rov** (`?`, `%s` — kutubxona parametri sifatida!, `:nom`, `$1`); parametr bo'la olmaydigan joylarda — **allowlist**.
- Escape, "taqiqlangan so'zlar", frontend tekshiruvi, WAF — **yetarli emas**; qo'shimcha: eng kam huquq, umumiy xato xabarlari, tur tekshiruvi.
- **NoSQL injection** — tur va sxema tekshiruvi.
- **Command injection** — argumentlar ro'yxati, `shell=True` yo'q, `--`, allowlist; iloji bo'lsa kutubxona.
- **SSTI** — foydalanuvchi matni shablon kodi emas, o'zgaruvchi.
- **Log injection** — tuzilgan (JSON) loglash.
- Kodda topish: **manba → sink**; `grep` — boshlang'ich nuqta.

:::quiz
? Injection zaifliklarining umumiy sababi nima?
+ Ishonchsiz ma'lumot boshqa tilning (SQL, shell, shablon) kodi ichiga yopishtiriladi va kod sifatida talqin qilinadi
- Server juda sekin ishlaydi
- Parol juda qisqa
- HTTPS ishlatilmaydi
! Kod va ma'lumot aralashtirilgan — himoya ham ularni ajratish.

? Psycopg (PostgreSQL) uchun qaysi qator xavfsiz?
+ cur.execute("SELECT * FROM notes WHERE id = %s", (nid,))
- cur.execute("SELECT * FROM notes WHERE id = %s" % nid)
- cur.execute(f"SELECT * FROM notes WHERE id = {nid}")
- cur.execute("SELECT * FROM notes WHERE id = " + str(nid))
! Birinchisida %s — kutubxona parametri; boshqalarida Python satrni o'zi yig'adi.

? Foydalanuvchi saralash ustunini tanlaydi (ORDER BY). Qanday himoyalash kerak?
- Ustun nomini parametr (?) sifatida berish
+ Faqat oldindan belgilangan qiymatlar ro'yxatidan (allowlist) tanlash
- Qo'shtirnoqlarni olib tashlash
- Faqat frontend'da tekshirish
! Ustun va jadval nomlari parametr bo'la olmaydi — allowlist kerak.

? Ilova xato xabarlarini ko'rsatmaydi. SQL injection haqida qaysi xulosa to'g'ri?
- Zaiflik yo'q, chunki xato ko'rinmaydi
+ Zaiflik baribir bo'lishi mumkin — ko'r injection javob farqlari yoki vaqt orqali ishlaydi
- Faqat NoSQL zaif bo'ladi
- WAF bo'lsa, zaiflik yo'q
! Zaiflik kodda, natija ko'rinishida emas.

? Qaysi usul SQL injection'ga qarshi yetarli himoya EMAS?
+ “SELECT”, “UNION” kabi so'zlarni matndan olib tashlash
- Parametrlangan so'rovlar
- ORM'ning standart so'rov usullari
- Parametr bo'la olmaydigan joylarda allowlist
! Taqiqlangan so'zlar ro'yxati osongina aylanib o'tiladi va qonuniy matnni buzadi.

? MongoDB ishlatadigan ilova uchun qaysi gap to'g'ri?
- SQL yo'q, shuning uchun injection mumkin emas
+ Foydalanuvchi obyekt yubora olsa, so'rov operatorlarini kiritishi mumkin — tur va sxema tekshiruvi kerak
- NoSQL bazalar har doim xavfsiz
- Faqat parolni shifrlash yetarli
! NoSQL injection — kutilgan satr o'rniga operatorli obyekt.

? OS buyrug'ini chaqirishning xavfsiz usuli qaysi?
- subprocess.run(f"ping {host}", shell=True)
- os.system("ping " + host)
+ subprocess.run(["ping", "-c", "1", "--", host], timeout=10) va host'ni oldindan tekshirish
- eval("ping " + host)
! Argumentlar ro'yxati shell talqinini yo'q qiladi — buyruq uchun “parametrlangan so'rov”.

? Server-side template injection (SSTI) qachon paydo bo'ladi?
+ Foydalanuvchi matni shablonning o'zi (kodi) sifatida render qilinganda
- Shablonda {{ o'zgaruvchi }} ishlatilganda
- Shablon fayli diskda saqlanganda
- CSS ishlatilganda
! To'g'ri yo'l: shablon doimiy, foydalanuvchi matni — o'zgaruvchi.

? Log injection'ning SOC uchun xavfi nima?
+ Hujumchi foydalanuvchi matnidagi yangi qator belgilari orqali soxta log yozuvlari yaratib, SIEM'ni chalg'itishi mumkin
- Loglar o'chib ketadi
- Server to'xtaydi
- Hech qanday xavf yo'q
! Himoya — tuzilgan (JSON) loglash yoki boshqaruv belgilarini kodlash.

? Kodda injection'ni qidirishning “manbadan sink'gacha” usuli nima?
+ Ishonchsiz ma'lumot kiradigan joydan (request) xavfli funksiyagacha (execute, subprocess) uning tekshirilmasdan yetib borishini kuzatish
- Faqat fayl nomlarini o'qish
- Faqat testlarni ishga tushirish
- Faqat izohlarni o'qish
! Bu usul SAST vositalarining ham asosi (a3 bosqichi).
:::

:::cards
Injection formulasi? :: Ishonchsiz ma'lumot → satrga yopishtiriladi → interpretator (SQL, shell, shablon) uni kod sifatida bajaradi.
Injection turlari? :: SQL, NoSQL, OS command, shablon (SSTI), LDAP, log injection.
SQL injection oqibatlari? :: Ma'lumot o'g'irlanishi, autentifikatsiyani chetlab o'tish, o'zgartirish/o'chirish, ba'zan serverni egallash.
Ko'r SQL injection? :: Xato va natija ko'rinmasa ham — javob farqlari yoki vaqt orqali; zaiflik baribir bor.
Parametrlangan so'rov belgilari? :: sqlite3 — ?; psycopg — %s (kutubxona parametri); SQLAlchemy text — :nom; JDBC — ?; Node pg — $1.
Parametr bo'la olmaydigan joylar? :: Jadval va ustun nomlari, ORDER BY — allowlist bilan.
Yetarli bo'lmagan himoyalar? :: Qo'lda escape, taqiqlangan so'zlar, frontend tekshiruvi, faqat WAF.
NoSQL injection himoyasi? :: Tur tekshiruvi (satr kutilsa — satr), sxema validatsiyasi, parolni so'rovda solishtirmaslik.
Command injection himoyasi? :: Argumentlar ro'yxati, shell=True yo'q, --, allowlist, iloji bo'lsa kutubxona.
SSTI himoyasi? :: Shablon doimiy, foydalanuvchi matni faqat o'zgaruvchi sifatida.
Log injection himoyasi? :: Tuzilgan (JSON) loglash, yangi qator va boshqaruv belgilarini kodlash.
Kodda topish usuli? :: Manba (request) → sink (execute, subprocess, eval, render_template_string); grep — boshlang'ich nuqta.
:::
