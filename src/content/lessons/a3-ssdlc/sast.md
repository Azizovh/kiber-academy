O'tgan darsda 600 qatorlik PR'ni 40 daqiqada ko'rib chiqdingiz va `grep` bilan issiq nuqtalarni topdingiz. Endi tasavvur qiling: kompaniyada 30 ta dasturchi, kuniga 50 ta PR, 400 000 qatorli kod bazasi. Hammasini qo'lda ko'rib chiqish — imkonsiz.

Va `grep` aqlli emas: `execute(f"` ni topadi, lekin `query = f"..."` bir qatorda, `db.execute(query)` boshqa qatorda bo'lsa — o'tkazib yuboradi. Izohdagi `execute(f"` ni esa topadi.

Yechim — **SAST** (Static Application Security Testing): kodni **tushunadigan** vositalar. Ular kodni matn sifatida emas, tuzilma sifatida (sintaksis daraxti, ma'lumot oqimi) tahlil qiladi va o'tgan darsdagi "manbadan sink'gacha" kuzatishni avtomatlashtiradi. Va eng muhimi — ular **har bir PR'da**, avtomatik, charchamasdan ishlaydi.

## SAST nima qiladi va nima qilmaydi

[[sast|SAST]] kodni **ishga tushirmasdan** tahlil qiladi:

| Daraja | Qanday | Misol |
|---|---|---|
| **Naqsh** (pattern) | Kod tuzilmasini shablon bilan solishtirish | `$DB.execute(f"...")` — qaerda bo'lsa ham, qanday formatlangan bo'lsa ham |
| **Ma'lumot oqimi / taint** | Ishonchsiz ma'lumotni manbadan sink'gacha kuzatish | `request.args` → bir nechta o'zgaruvchi → `execute()` |

| SAST yaxshi topadi | SAST yomon topadi |
|---|---|
| Ma'lum xavfli naqshlar: injection, xavfli funksiyalar, zaif kriptografiya, kodga yozilgan sirlar | **Kirish nazorati** — qaysi endpointda qanday ruxsat kerakligini bilmaydi |
| Keng qamrov — butun kod bazasi, har PR | **Biznes mantiq** |
| Erta — kod yozilayotganda (IDE, PR) | Ish vaqti konfiguratsiyasi, ishlab turgan muhit (DAST darsi) |
| Takroriylik — bir xil xatoni hech qachon "unutmaydi" | Kontekst: "bu ma'lumot aslida ishonchli" |

Shuning uchun SAST qo'lda ko'rib chiqishni **almashtirmaydi** — u takroriy, mexanik qismni oladi, va inson e'tiborini skaner ko'rmaydigan joyga bo'shatadi.

### False positive va false negative

b2 bosqichidagi aniqlash qoidalari darsini eslang — SAST'da ham xuddi shu muvozanat:

| | Ma'nosi | Oqibati |
|---|---|---|
| **False positive** | Skaner xavfsiz kodni zaif deydi | Dasturchilar natijalarga ishonmay qo'yadi, e'tiborsiz qoldiradi — "alert fatigue" |
| **False negative** | Skaner zaif kodni ko'rmaydi | Soxta xotirjamlik |

SAST'ni joriy etishdagi eng katta xato — yuzlab qoidani birdan yoqish va dasturchilarni minglab ogohlantirishga ko'mish. Natija: hech kim natijalarni o'qimaydi. To'g'ri yo'l — kam, **aniq**, sozlangan qoidalardan boshlash.

## Semgrep

**Semgrep** — ochiq kodli, tez, ko'p tilli SAST vositasi. Uning asosiy afzalligi: qoidalar **kodga o'xshab** yoziladi — yangi qoida yozish uchun murakkab til o'rganish shart emas.

```bash
pip install semgrep

# Tayyor qoidalar to'plamlari bilan skanerlash
semgrep scan --config p/python --config p/flask
semgrep scan --config p/owasp-top-ten

# Natijani SARIF formatida (GitHub va boshqa vositalar uchun)
semgrep scan --config p/python --sarif -o semgrep.sarif
```

Tayyor qoidalar — boshlash uchun yaxshi. Lekin Semgrep'ning haqiqiy kuchi — **o'z qoidalaringiz**: loyihangizga xos naqshlar, o'z xatolaringizdan o'rganilgan saboqlar.

### Birinchi qoida: f-string bilan SQL

```yaml
# rules/sql-fstring.yaml
rules:
  - id: qaydnoma-sql-fstring
    languages: [python]
    severity: ERROR
    message: >
      SQL so'rovi f-string bilan qurilgan. Foydalanuvchi ma'lumoti SQL kodiga aylanishi mumkin.
      Parametrlangan so'rov ishlating: db.execute("... WHERE x = ?", (qiymat,))
    pattern-either:
      - pattern: $DB.execute(f"...", ...)
      - pattern: $DB.execute("..." % $X, ...)
      - pattern: $DB.execute("..." + $X, ...)
```

| Qism | Ma'nosi |
|---|---|
| `$DB`, `$X` | **Metavariable** — istalgan ifoda (o'zgaruvchi, atribut, chaqiruv) |
| `f"..."` | Istalgan f-string |
| `...` | Istalgan argumentlar yoki kod |
| `pattern-either` | Shablonlardan birortasi mos kelsa |
| `message` | Dasturchiga **nima** noto'g'ri va **qanday** tuzatish — kod ko'rib chiqish izohi kabi |

Bu qoida `grep` dan aqlliroq: u faqat haqiqiy `execute` chaqiruvlarini topadi (izohlarni emas), qatorlarga bo'lingan kodni ham, turli bo'shliqlarni ham.

```bash
semgrep scan --config rules/ .
```

### Taint rejimi: manbadan sink'gacha

Yuqoridagi qoida `query = f"..."` va `db.execute(query)` alohida qatorlarda bo'lsa — o'tkazib yuboradi. Ma'lumot oqimini kuzatish uchun — **taint** rejimi:

```yaml
rules:
  - id: qaydnoma-request-to-sql
    mode: taint
    languages: [python]
    severity: ERROR
    message: >
      Foydalanuvchi ma'lumoti (flask.request) SQL so'rovi matniga yetib bormoqda.
      Qiymatni parametr sifatida bering, so'rov matniga yopishtirmang.
    pattern-sources:
      - pattern: flask.request.$ATTR
    pattern-sinks:
      - patterns:
          - pattern: $DB.execute($QUERY, ...)
          - focus-metavariable: $QUERY
```

| Qism | Ma'nosi |
|---|---|
| `pattern-sources` | Ishonchsiz ma'lumot qayerdan keladi — `request.args`, `request.form`, `request.json`… |
| `pattern-sinks` | Qayerga yetib borsa xavfli — `execute` ning **birinchi argumenti** (so'rov matni) |
| `focus-metavariable: $QUERY` | Faqat so'rov matni sink; ikkinchi argument (parametrlar kortesji) — xavfsiz, shuning uchun hisobga olinmaydi |

Endi bu qoida foydalanuvchi ma'lumoti so'rov **matniga** qanday yo'l bilan — bir nechta o'zgaruvchi orqali ham — yetib borishini kuzatadi, lekin parametr sifatida berilganini xato deb hisoblamaydi. Bu — o'tgan darsdagi qo'lda kuzatishning avtomatlashtirilgan shakli.

Taint qoidalarida **sanitizer** ham ko'rsatish mumkin (`pattern-sanitizers`) — masalan, `int(...)` orqali o'tgan qiymat xavfsiz deb hisoblanadi.

### Qaydnoma'ga xos qoidalar

Eng qimmatli qoidalar — loyihangizning **arxitektura qarorlarini** himoya qiladigan qoidalar. a2 bosqichida biz "barcha qayd endpointlari `load_note()` dan o'tadi" deb qaror qildik. Buni Semgrep bilan majburlash mumkin:

```yaml
rules:
  - id: qaydnoma-note-query-outside-access-layer
    languages: [python]
    severity: WARNING
    message: >
      notes jadvali access.py'dan tashqarida to'g'ridan-to'g'ri so'ralmoqda.
      Ruxsat tekshiruvi chetlab o'tilishi mumkin — load_note(note_id, Action.X) ishlating.
    patterns:
      - pattern: $DB.execute("...FROM notes...", ...)
    paths:
      exclude:
        - qaydnoma/access.py
        - tests/
```

```yaml
rules:
  - id: qaydnoma-no-safe-filter
    languages: [generic]
    severity: ERROR
    message: "Jinja2 |safe filtri avtomatik kodlashni o'chiradi (XSS). Sanitizatsiya funksiyasidan foydalaning."
    pattern: "| safe"
    paths:
      include:
        - "*.html"
```

(Ikkinchi qoida `generic` rejimida — Semgrep tushunmaydigan fayl turlari uchun oddiy matn qidiruvi. Bo'shliqsiz yozilgan `|safe` uchun ikkinchi naqsh qo'shish yoki regex qoidasi kerak bo'lishi mumkin — qoidangizni testlar bilan tekshiring.)

Bu qoidalar a3 bosqichidagi xavfsizlik talablariga to'g'ridan-to'g'ri bog'lanadi: "ACC-1: barcha qayd endpointlari `load_note()` orqali — Semgrep qoidasi bilan tekshiriladi". Talab endi **avtomatik** tekshiriladi.

### Qoidalarni sinash

Qoida ham kod — u ham test talab qiladi. Semgrep'da test fayli qoida yonida turadi va izohlar bilan belgilanadi:

```python
# rules/sql-fstring.py
def bad(db, q):
    # ruleid: qaydnoma-sql-fstring
    db.execute(f"SELECT * FROM notes WHERE title = '{q}'")

def good(db, q):
    # ok: qaydnoma-sql-fstring
    db.execute("SELECT * FROM notes WHERE title = ?", (q,))
```

```bash
semgrep --test rules/
```

`ruleid:` — bu qatorda qoida **ishlashi kerak**; `ok:` — **ishlamasligi kerak**. a2 bosqichidagi "qizil → yashil" tamoyili qoidalarga ham tegishli: qoida haqiqatan zaif kodni ushlashini va xavfsiz kodda jim turishini isbotlang.

## Natijalarni saralash (triage)

SAST natijasi — **gumon**, hukm emas (YARA darsidagi kabi). Har bir natija uchun:

| Savol | Natija |
|---|---|
| Ma'lumot haqiqatan foydalanuvchidan keladimi? | Yo'q → false positive |
| Yo'lda tekshiruv yoki kodlash bormi? | Bor → ehtimol false positive (qoidani sanitizer bilan yaxshilang) |
| Kod haqiqatan ishlatiladimi (test, o'lik kod emasmi)? | O'lik kod → past ustuvorlik (lekin o'chirish yaxshi) |
| Hammasi tasdiqlandi | **True positive** → tuzatish + test |

False positive'larni **asoslab** belgilash:

```python
db.execute(f"SELECT {column} FROM notes WHERE id = ?", (nid,))  # nosemgrep: qaydnoma-sql-fstring -- column SORT_COLUMNS allowlist'idan
```

`nosemgrep` izohi **sabab** bilan yozilishi kerak — b2 bosqichidagi "har bir istisnoni kim, qachon, nega qo'shganini yozing" qoidasi. Sababsiz bekor qilish — kod ko'rib chiqishda savol tug'dirishi kerak.

## Boshqa SAST vositalari

| Vosita | Xususiyati |
|---|---|
| **Semgrep** | Ko'p tilli, oson qoidalar, tez; bepul ochiq versiya va tijoriy platforma |
| **CodeQL** | GitHub'ning vositasi: kodni **ma'lumotlar bazasiga** aylantirib, maxsus so'rov tili (QL) bilan chuqur oqim tahlili; ochiq omborlar uchun GitHub'da bepul ("code scanning") |
| **Bandit** | Faqat Python, oddiy va tez — `bandit -r qaydnoma/` |
| **ESLint xavfsizlik plaginlari** | JavaScript/TypeScript |
| **SonarQube** | Kod sifati + xavfsizlik; keng tarqalgan korporativ vosita |
| **Tijoriy SAST** | Checkmarx, Veracode, Fortify va boshqalar — yirik kompaniyalarda |

### CodeQL haqida qisqacha

CodeQL boshqacha ishlaydi: avval kod **ma'lumotlar bazasiga** aylantiriladi, keyin unga so'rovlar beriladi. Bu chuqurroq oqim tahlilini beradi (funksiyalar va fayllar orasida), lekin sekinroq va qoida yozish murakkabroq.

Eng oson yo'l — GitHub'da: ombor sozlamalarida **Code scanning → CodeQL** ni yoqish ("default setup"). Har bir push va PR'da tayyor xavfsizlik so'rovlari ishlaydi, natijalar "Security" yorlig'ida ko'rinadi. Qaydnoma omboringizda buni bir necha bosishda yoqasiz (a4 bosqichidagi CI/CD darsida batafsil).

## SAST'ni jarayonga kiritish

```
 IDE (dasturchi kompyuterida)  ──►  PR (CI'da)  ──►  Asosiy branch (to'liq skan)
 darhol fikr                         yangi natijalar     muntazam to'liq hisobot
                                     PR izohi sifatida
```

Muvaffaqiyatli joriy etish tamoyillari:

| Tamoyil | Nega |
|---|---|
| **Kam, aniq qoidalardan boshlang** | Ishonch — eng qimmat resurs; birinchi haftada 2 000 ta false positive uni yo'q qiladi |
| **Faqat yangi natijalar PR'ni to'xtatsin** | Eski kod bazasidagi minglab natija — alohida reja bilan; yangi kod esa toza bo'lsin |
| **Natija — tuzatish yo'li bilan** | `message` da nima noto'g'ri va qanday tuzatish — dasturchi qoidani o'qib o'rganadi |
| **O'z qoidalaringiz** — o'z xatolaringizdan | Har bir topilgan zaiflik (kod ko'rib chiqish, pentest, insident) — "buni qoidaga aylantira olamanmi?" (b4 bosqichidagi ov tamoyili) |
| **False positive'larni tez sozlash** | Dasturchi shikoyati — qoidani yaxshilash signali |

:::key
**SAST qoidasi — bir marta qilingan kod ko'rib chiqishning abadiy nusxasi.** Har safar qo'lda ko'rib chiqishda, pentestda yoki insidentda yangi zaif naqsh topsangiz, so'rang: "Buni Semgrep qoidasiga aylantira olamanmi?" Agar ha — o'sha xato loyihaning hech bir joyida, hech qachon qaytib kelmaydi, chunki har bir PR'da tekshiriladi. Bu b4 bosqichidagi "bugungi ov — ertangi ogohlantirish" tamoyilining AppSec'dagi aynan o'zi.
:::

## Bu dars nimani bermaydi

- **Semgrep va CodeQL'ning barcha imkoniyatlarini** — rasmiy hujjatlar va Semgrep playground (brauzerda qoidalarni sinash).
- **Har bir til uchun eng yaxshi vositalarni** — loyihangiz texnologiyasiga qarab tanlanadi.
- **CI'ga ulashni batafsil** — a4 bosqichi.

:::try
**1. Tayyor qoidalar.** Qaydnoma'da `semgrep scan --config p/python --config p/flask` ni ishga tushiring. Nechta natija chiqdi? Har birini saralang: true positive / false positive.

**2. Zaif branch'da.** a2 bosqichidagi `vulnerable` branch'da xuddi shu skanni ishga tushiring. 8 ta kiritilgan zaiflikdan nechtasini topdi? Qaysilarini topmadi va nega? (Kirish nazorati va biznes mantiq haqida o'ylang.)

**3. O'z qoidalaringiz.** Yuqoridagi uchta qoidani (`sql-fstring`, `request-to-sql`, `no-safe-filter`) `rules/` papkasiga yozing va har biri uchun `ruleid:` va `ok:` izohli test fayli yarating. `semgrep --test rules/` — hammasi o'tishi kerak.

**4. Arxitektura qoidasi.** `qaydnoma-note-query-outside-access-layer` qoidasini qo'shing. Uni sinash uchun vaqtincha biror endpointda `notes` jadvalini to'g'ridan-to'g'ri so'rang — qoida ushladimi?

**5. CodeQL.** Qaydnoma omboringizda (GitHub'da) Code scanning'ni CodeQL "default setup" bilan yoqing. Natijalar "Security" yorlig'ida chiqdimi?

**6. Semgrep playground.** semgrep.dev/playground'da `subprocess` ni `shell=True` bilan chaqirishni topadigan qoida yozing va sinang.

*Yo'nalish (2): odatda SAST injection, `|safe`, zaif `random` kabi naqshlarni topadi; IDOR (egalik tekshiruvi yo'qligi), biznes mantiq (limit faqat formada) va ko'pincha CSRF'ni (agar maxsus qoida bo'lmasa) topmaydi — ular qo'lda ko'rib chiqish va testlar sohasi.*
:::

## Xulosa

- **SAST** — kodni ishga tushirmasdan, tuzilma va ma'lumot oqimi bo'yicha tahlil; `grep` dan aqlli, har PR'da avtomatik.
- Yaxshi topadi: ma'lum naqshlar (injection, xavfli funksiyalar, kriptografiya, sirlar). Yomon: **kirish nazorati, biznes mantiq**, ish vaqti konfiguratsiyasi.
- **Semgrep**: qoidalar kodga o'xshab yoziladi — metavariable'lar (`$X`), `...`, `pattern-either`; **taint rejimi** — `pattern-sources` → `pattern-sinks` (`focus-metavariable`), sanitizer'lar.
- Eng qimmatli — **loyihaga xos qoidalar**, arxitektura qarorlarini himoya qiladi (masalan, `load_note()`).
- Qoidalar ham test talab qiladi: `ruleid:` / `ok:` va `semgrep --test`.
- Natija — gumon: saralash; false positive — **sabab bilan** `nosemgrep`.
- **CodeQL** — chuqur oqim tahlili, GitHub code scanning; boshqalar: Bandit, SonarQube.
- Joriy etish: **kam aniq qoidalar**, faqat yangi natijalar PR'ni to'xtatadi, har bir topilma — yangi qoida uchun nomzod.

:::quiz
? SAST nima?
+ Kodni ishga tushirmasdan, uning tuzilmasi va ma'lumot oqimi bo'yicha zaifliklarni qidirish
- Ishlab turgan ilovani tashqaridan skanerlash
- Kutubxonalardagi zaifliklarni qidirish
- Tarmoqni skanerlash
! Ishlab turgan ilovani sinash — DAST.

? Qaysi zaifliklarni SAST odatda yomon topadi?
+ Kirish nazorati (IDOR) va biznes mantiq xatolari
- f-string bilan qurilgan SQL so'rovlari
- shell=True bilan subprocess
- Kodga yozilgan sirlar
! Skaner qaysi endpointda qanday ruxsat kerakligini bilmaydi.

? Semgrep qoidasidagi $DB kabi belgi nima?
+ Metavariable — istalgan ifodaga mos keladi
- Muhit o'zgaruvchisi
- Ma'lumotlar bazasi nomi
- Izoh
! ... esa istalgan argumentlar yoki kod.

? Taint rejimidagi qoida oddiy naqsh qoidasidan nimasi bilan ustun?
+ U ishonchsiz ma'lumotni manbadan sink'gacha, bir nechta o'zgaruvchi orqali ham kuzatadi
- U tezroq ishlaydi
- U false positive bermaydi
- U faqat JavaScript uchun
! Masalan, query = f"..." bir qatorda, execute(query) boshqasida bo'lsa ham topadi.

? Taint qoidasidagi focus-metavariable: $QUERY nima uchun kerak?
+ Faqat execute'ning so'rov matni argumentini sink deb hisoblash — parametrlar kortesjidagi qiymatlar xato deb belgilanmasligi uchun
- Qoidani tezlashtirish uchun
- Natijani rangli qilish uchun
- Faylni o'chirish uchun
! Parametr sifatida berilgan qiymat xavfsiz.

? Nega loyihaga xos Semgrep qoidalari (masalan, notes jadvali faqat access.py'da so'ralsin) qimmatli?
+ Ular arxitektura qarorlarini avtomatik majburlaydi — xavfsizlik talabi har PR'da tekshiriladi
- Ular tayyor qoidalardan tezroq
- Ular faqat chiroyli
- Ular CodeQL o'rnini bosadi
! Talab endi avtomatik tekshiriladi.

? Semgrep qoidasini qanday sinash kerak?
+ Test faylida ruleid: (ishlashi kerak) va ok: (ishlamasligi kerak) izohlarini yozib, semgrep --test ishga tushirish
- Qoidani ishlab chiqarishda sinash
- Qoidani sinash shart emas
- Faqat qoida nomini tekshirish
! Qoida ham kod — u ham testlanadi.

? SAST natijasi false positive bo'lsa, qanday belgilash kerak?
+ nosemgrep izohi bilan, nima uchun xavfsiz ekanini sabab sifatida yozib
- Qoidani butunlay o'chirib
- Izohsiz nosemgrep qo'yib
- Natijani e'tiborsiz qoldirib
! Sababsiz bekor qilish kod ko'rib chiqishda savol tug'dirishi kerak.

? SAST'ni yangi joriy etishda eng katta xato qaysi?
+ Yuzlab qoidani birdan yoqib, dasturchilarni minglab ogohlantirishga ko'mish
- Kam aniq qoidalardan boshlash
- Faqat yangi natijalar PR'ni to'xtatishi
- Natijalarga tuzatish yo'lini yozish
! Alert fatigue — dasturchilar natijalarni o'qimay qo'yadi.

? Kod ko'rib chiqishda yoki pentestda yangi zaif naqsh topilsa, SAST nuqtai nazaridan nima qilish kerak?
+ Uni Semgrep qoidasiga aylantirish mumkinligini tekshirish — shunda u hech qachon qaytib kelmaydi
- Faqat bir joyda tuzatish
- Hech narsa
- Butun kodni qayta yozish
! Qoida — bir marta qilingan ko'rib chiqishning abadiy nusxasi.
:::

:::cards
SAST? :: Kodni ishga tushirmasdan tuzilma va ma'lumot oqimi bo'yicha zaifliklarni qidirish.
SAST yaxshi va yomon topadi? :: Yaxshi — injection, xavfli funksiyalar, kriptografiya, sirlar; yomon — kirish nazorati, biznes mantiq, ish vaqti konfiguratsiyasi.
Semgrep qoida elementlari? :: id, languages, severity, message, pattern/pattern-either/patterns, metavariable'lar ($X), ... .
Semgrep taint rejimi? :: mode: taint; pattern-sources (request), pattern-sinks (execute), focus-metavariable, pattern-sanitizers.
Loyihaga xos qoidalar? :: Arxitektura qarorlarini majburlash: masalan, notes jadvali faqat access.py'da so'raladi; |safe taqiqlanadi.
Semgrep qoidalarini sinash? :: Test faylida ruleid: va ok: izohlari; semgrep --test rules/.
SAST natijasini saralash? :: Ma'lumot foydalanuvchidanmi? Yo'lda tekshiruv bormi? Kod ishlatiladimi? → true/false positive.
False positive belgilash? :: nosemgrep: qoida-id -- sabab; sababsiz bekor qilish — savol.
CodeQL? :: Kodni ma'lumotlar bazasiga aylantirib QL so'rovlari bilan chuqur oqim tahlili; GitHub code scanning.
Boshqa SAST vositalari? :: Bandit (Python), ESLint plaginlari, SonarQube, tijoriy (Checkmarx, Veracode, Fortify).
SAST joriy etish tamoyillari? :: Kam aniq qoidalar, faqat yangi natijalar PR'ni to'xtatadi, message'da tuzatish yo'li, o'z xatolaridan qoidalar, false positive'larni tez sozlash.
SAST qoidasi qiymati? :: Bir marta qilingan kod ko'rib chiqishning abadiy nusxasi — xato hech qachon qaytmaydi.
:::
