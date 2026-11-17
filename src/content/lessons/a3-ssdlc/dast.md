SAST Qaydnoma kodida hech narsa topmadi. Kod ko'rib chiqish ham toza. Lekin ishlab chiqarish serverida:

- nginx sozlamasida CSP sarlavhasi yo'q — Flask qo'shgan sarlavhani proxy o'chirib yuborgan.
- Xato sahifasi — Flask'niki emas, proxy'niki, va u nginx versiyasini ko'rsatadi.
- Sessiya cookie'sida `Secure` yo'q — chunki ishlab chiqarishda `DevConfig` yuklangan.

Bularning hech biri kodda ko'rinmaydi. Ular faqat **ishlab turgan** ilovada, haqiqiy server, proxy va sozlamalar bilan birga ko'rinadi. Buni tekshiradigan vosita — **DAST**.

## DAST nima

[[dast|DAST]] (Dynamic Application Security Testing) ilovani **tashqaridan**, ishlab turgan holatda, HTTP so'rovlari orqali sinaydi — xuddi foydalanuvchi yoki hujumchi kabi, lekin kodni ko'rmasdan.

| | SAST (o'tgan dars) | DAST |
|---|---|---|
| Nimani ko'radi | Manba kodni | Ishlab turgan ilovani (HTTP) |
| Qachon | Kod yozilayotganda, PR'da | Ilova joylangandan keyin (test muhitida) |
| Kuchli tomoni | Kod ichidagi naqshlar, aniq qator | **Ish vaqti**: konfiguratsiya, sarlavhalar, cookie, server, proxy — hammasi birga |
| Zaif tomoni | Konfiguratsiya va muhitni ko'rmaydi | Kodning qaysi qatorida ekanini aytmaydi; barcha kod yo'llariga yetib bormaydi |
| False positive | Ko'proq | Kamroq (haqiqiy javobni ko'radi), lekin bor |

Ular bir-birini to'ldiradi: SAST "qayerda" deydi, DAST "haqiqatan ishlaydimi" deydi.

:::warn
**DAST — haqiqiy so'rovlar yuboradi, va faol skan ilovani o'zgartiradi.** Faol skaner formalarni to'ldiradi, ma'lumotlar yaratadi, o'chirish tugmalarini bosishi mumkin, va yuzlab-minglab so'rov yuboradi. Shuning uchun:
- **Faqat o'z ilovangizni yoki yozma ruxsat olingan nishonni** skanerlang. Ruxsatsiz skanerlash — boshqalarning tizimiga hujum, qonunbuzarlik (kursning boshidan takrorlanayotgan qoida).
- **Ishlab chiqarishni emas, test muhitini** skanerlang — sinov ma'lumotlari bilan.
- Ishlab chiqarishda faqat **passiv** tekshiruvlar (pastda) — va kelishilgan holda.
:::

## OWASP ZAP

**ZAP** (Zed Attack Proxy) — eng mashhur bepul, ochiq kodli DAST vositasi. U ikki rejimda ishlaydi:

```
 1. PROXY REJIMI (qo'lda sinash)

    Brauzer ──► ZAP (proxy, 8080) ──► Qaydnoma
                 │
                 └─ barcha so'rov va javoblarni yozadi, o'zgartirishga imkon beradi,
                    passiv tekshiruvlarni avtomatik bajaradi

 2. AVTOMATIK SKAN

    ZAP ──► spider (sahifalarni topish) ──► passiv skan ──► (ixtiyoriy) faol skan ──► hisobot
```

### Skan turlari

| Tur | Nima qiladi | Xavfsizmi | Qachon |
|---|---|---|---|
| **Passiv skan** | Faqat **kuzatadi**: o'tgan so'rov va javoblarni tahlil qiladi — sarlavhalar, cookie atributlari, ma'lumot sizishi | Ha — hech narsa yubormaydi | Har doim, proxy rejimida ham |
| **Spider** | Havolalar va formalarni kuzatib, sahifalarni topadi | Asosan (GET so'rovlari, lekin formalarni ham yuborishi mumkin) | Skan boshida |
| **AJAX spider** | Brauzer orqali JavaScript ilovalardagi sahifalarni topadi | Asosan | SPA'lar uchun |
| **Faol skan** | Har bir parametrga hujum naqshlarini yuborib, javobni tahlil qiladi | **Yo'q** — ma'lumotni o'zgartirishi mumkin | Faqat test muhitida |

### Docker bilan tez boshlash

ZAP rasmiy Docker image'iga ega va bir nechta tayyor skriptlar bilan keladi:

```bash
# Baseline skan — spider + PASSIV skan; xavfsiz, tez (bir necha daqiqa)
docker run --rm -t ghcr.io/zaproxy/zaproxy:stable \
  zap-baseline.py -t https://staging.qaydnoma.example

# HTML hisobot bilan (joriy papkaga)
docker run --rm -v "$(pwd)":/zap/wrk:rw -t ghcr.io/zaproxy/zaproxy:stable \
  zap-baseline.py -t https://staging.qaydnoma.example -r zap-hisobot.html

# API skan — OpenAPI spetsifikatsiyasi asosida
docker run --rm -t ghcr.io/zaproxy/zaproxy:stable \
  zap-api-scan.py -t https://staging.qaydnoma.example/openapi.json -f openapi

# To'liq skan — spider + FAOL skan; faqat test muhitida!
docker run --rm -t ghcr.io/zaproxy/zaproxy:stable \
  zap-full-scan.py -t https://staging.qaydnoma.example
```

| Skript | Ichida | Ishlab chiqarishda? |
|---|---|---|
| `zap-baseline.py` | Spider + passiv | Kelishilgan holda — mumkin |
| `zap-api-scan.py` | OpenAPI asosida + faol | Yo'q — test muhiti |
| `zap-full-scan.py` | Spider + faol | Yo'q — test muhiti |

a2 bosqichidagi API darsidagi **OpenAPI** spetsifikatsiyasi bu yerda foydali bo'ladi: ZAP undan barcha endpointlar va parametrlarni o'qiydi — spider topa olmaydigan API'larni ham.

Lokal sinovda Qaydnoma `localhost:5000` da ishlasa, Docker konteyneri uni `localhost` deb ko'rmaydi (konteynerning o'z localhost'i bor) — `host.docker.internal` yoki `--network host` (Linux'da) ishlatiladi.

## Autentifikatsiyali skan

Qaydnoma'ning deyarli hamma narsasi login ortida. Autentifikatsiyasiz skaner faqat `/login` va `/register` ni ko'radi — bu ilovaning 5 foizi. Curriculum'dagi maqsad: "ZAP bilan autentifikatsiyali skan o'tkaza olaman."

ZAP'ga quyidagilarni aytish kerak:

| Element | Ma'nosi | Qaydnoma'da |
|---|---|---|
| **Context** | Skan qilinadigan ilova chegarasi (URL'lar) | `https://staging.qaydnoma.example/.*` |
| **Authentication** | Qanday kiriladi | Forma asosida: `POST /login`, `username`, `password` maydonlari (yoki API uchun Bearer token sarlavhasi) |
| **Users** | Qaysi hisob bilan | Maxsus test hisobi: `zap_tester` |
| **Session management** | Sessiya qanday saqlanadi | Cookie asosida |
| **Verification** | Kirilganini qanday bilish | Javobda "Chiqish" tugmasi bor / `/login` ga yo'naltirilmagan |
| **Exclusions** | Nimani skanerlamaslik | `/logout` (aks holda skaner o'zi chiqib ketadi!), administrator o'chirish funksiyalari |

`/logout` ni chiqarib tashlash — eng keng tarqalgan tuzoq: skaner spider paytida "Chiqish" havolasini topadi, bosadi, va qolgan skan autentifikatsiyasiz o'tadi — natijada hech narsa topilmaydi va siz "hammasi toza" deb o'ylaysiz.

CSRF tokeni bor formalar uchun ZAP'da token nomini ko'rsatish kerak (`csrf_token`) — u tokenni har safar sahifadan olib, so'rovga qo'shadi.

### ZAP Automation Framework

Murakkab sozlamalarni (kontekst, autentifikatsiya, skan turlari, hisobot) bitta **YAML reja** sifatida saqlash mumkin — bu takrorlanadigan va CI'ga mos:

```yaml
# zap-plan.yaml (soddalashtirilgan)
env:
  contexts:
    - name: qaydnoma
      urls: ["https://staging.qaydnoma.example"]
      excludePaths: ["https://staging.qaydnoma.example/logout.*"]
      authentication:
        method: form
        parameters:
          loginPageUrl: "https://staging.qaydnoma.example/login"
          loginRequestUrl: "https://staging.qaydnoma.example/login"
          loginRequestBody: "username={%username%}&password={%password%}"
        verification:
          method: response
          loggedInRegex: "Chiqish"
      users:
        - name: zap_tester
          credentials:
            username: "zap_tester"
            password: "${ZAP_TEST_PASSWORD}"     # muhit o'zgaruvchisidan — sir kodda emas
jobs:
  - type: spider
    parameters: { context: qaydnoma, user: zap_tester }
  - type: passiveScan-wait
  - type: activeScan
    parameters: { context: qaydnoma, user: zap_tester }
  - type: report
    parameters: { template: traditional-html, reportFile: zap-hisobot.html }
```

```bash
docker run --rm -v "$(pwd)":/zap/wrk:rw -e ZAP_TEST_PASSWORD -t ghcr.io/zaproxy/zaproxy:stable \
  zap.sh -cmd -autorun /zap/wrk/zap-plan.yaml
```

Aniq maydon nomlari va sintaksis ZAP versiyasiga qarab biroz farq qilishi mumkin — rasmiy Automation Framework hujjatini oching va rejani ZAP'ning grafik interfeysida yaratib, eksport qilish eng oson yo'l.

## Natijalarni o'qish va saralash

ZAP natijalari xavf darajasi (High, Medium, Low, Informational) va **ishonch** (Confirmed, High, Medium, Low) bilan beriladi. Qaydnoma uchun odatiy natijalar va ularning a1–a2 bosqichlaridagi darslari:

| ZAP ogohlantirishi | Ma'nosi | Qaysi dars |
|---|---|---|
| Content Security Policy Header Not Set | CSP yo'q | a1 — brauzer xavfsizlik modeli |
| Cookie No HttpOnly Flag / Without Secure Flag / Without SameSite | Cookie atributlari | a1 — HTTP chuqur |
| Missing Anti-clickjacking Header | `frame-ancestors` / `X-Frame-Options` yo'q | a1 |
| X-Content-Type-Options Header Missing | `nosniff` yo'q | a1 |
| Server Leaks Version Information | `Server: nginx/1.x` | a2 — konfiguratsiya |
| Application Error Disclosure | Batafsil xato sahifasi | a2 — konfiguratsiya |
| Cross Site Scripting (Reflected / Persistent) | Faol skan XSS topdi | a2 — XSS |
| SQL Injection | Faol skan injection belgilarini topdi | a2 — injection |
| Absence of Anti-CSRF Tokens | Formada CSRF tokeni yo'q | a2 — CSRF |

Saralash tartibi — SAST'dagi kabi:
1. **Haqiqiymi?** So'rov va javobni ZAP'da oching, qayta yuboring, qo'lda tasdiqlang.
2. **Qayerda?** URL va parametrni koddagi joyga bog'lang — DAST qatorni aytmaydi, siz topasiz.
3. **Qanchalik jiddiy?** Kontekst: "Cookie without SameSite" — CSRF tokeni bo'lsa, past; bo'lmasa — yuqori.
4. **Tuzating va test yozing** — a2 bosqichidagi qoida.
5. False positive bo'lsa — ZAP'da qoidani o'sha URL uchun **asos bilan** o'chiring (alert filter).

## DAST'ni CI'ga ulash

Curriculum'dagi ikkinchi maqsad: "ZAP'ni CI'ga ulay olaman." Eng oddiy yo'l — GitHub Actions'dagi rasmiy ZAP action'lari (a4 bosqichidagi CI/CD darsida to'liq konveyer):

```yaml
# .github/workflows/dast.yml (soddalashtirilgan)
name: DAST
on:
  workflow_dispatch:
  schedule:
    - cron: "0 2 * * 1"          # har dushanba tungi soat 2 da
jobs:
  zap:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: ZAP baseline
        uses: zaproxy/action-baseline@v0.12.0
        with:
          target: "https://staging.qaydnoma.example"
          rules_file_name: ".zap/rules.tsv"    # qaysi ogohlantirishlar e'tiborsiz/ogohlantirish/xato
```

`rules.tsv` faylida har bir ZAP qoidasi uchun qaror: `IGNORE` (asos bilan), `WARN` yoki `FAIL` — FAIL bo'lsa konveyer qizil bo'ladi. Bu — SAST'dagi "kam, aniq qoidalar PR'ni to'xtatsin" tamoyilining DAST'dagi ko'rinishi.

Action versiyasini doim rasmiy sahifadan tekshiring va aniq versiyaga bog'lang (a4 bosqichidagi CI xavfsizligi darsi).

Odatiy konveyer:

| Bosqich | Skan | Qachon |
|---|---|---|
| Har PR | Baseline (passiv) — vaqtinchalik test muhitiga | Tez fikr: sarlavhalar, cookie |
| Har kecha / har hafta | To'liq autentifikatsiyali skan (faol) — staging'ga | Chuqurroq tekshiruv |
| Relizdan oldin | To'liq skan + qo'lda tekshiruv | Kafolat |

## DAST'ning cheklovlari

- **Qamrov** — skaner topmagan sahifa yoki parametr sinalmaydi. Murakkab oqimlar (ko'p bosqichli formalar), JavaScript'ga bog'liq sahifalar va login ortidagi qismlar ko'pincha qisman qoladi.
- **Biznes mantiq va kirish nazorati** — skaner "bu qayd shu foydalanuvchinikimi?" deb so'ramaydi. IDOR uchun ikki foydalanuvchi bilan qo'lda yoki maxsus vositalar bilan sinash kerak (a2 bosqichi).
- **Ko'r zaifliklar** — javobda ko'rinmaydigan muammolar (masalan, ko'r SSRF) ko'pincha qo'shimcha vositalarsiz topilmaydi.
- **Vaqt va shovqin** — to'liq faol skan soatlab davom etadi va loglarni to'ldiradi; SOC'ni oldindan ogohlantiring (b1 bosqichi: skaner trafigi IDS ogohlantirishlarini qo'zg'atadi).

:::key
**DAST — "ishlab turgan haqiqat"ni tekshiradi.** Kod to'g'ri bo'lishi mumkin, lekin proxy sarlavhani o'chirgan, noto'g'ri konfiguratsiya yuklangan yoki yangi kutubxona kutilmagan xatti-harakat qo'shgan. DAST bularni faqat bitta yo'l bilan topadi — haqiqiy so'rov yuborib. Uning eng katta qiymati — **avtomatik va muntazam** (har PR'da baseline, har hafta to'liq skan): bir marta to'g'ri sozlangan, u konfiguratsiya regressiyasini darhol ushlaydi. Va eng katta xavfi — **noto'g'ri nishon**: faqat o'zingizniki, faqat test muhiti.
:::

## Bu dars nimani bermaydi

- **ZAP'ning barcha imkoniyatlarini** — rasmiy hujjatlar, ZAP'ning o'z o'quv videolari.
- **Qo'lda pentest texnikalarini** — Pentest tarmog'i; amaliyot uchun PortSwigger Academy (Burp Suite bilan).
- **Burp Suite'ni** — ZAP'ning tijoriy (va bepul Community versiyali) muqobili; tushunchalar bir xil.

:::try
Barcha mashqlar — **faqat o'z Qaydnoma'ingizda** (lokal yoki o'z test serveringizda).

**1. Proxy rejimi.** ZAP'ni o'rnating, brauzerni ZAP proxy orqali sozlang (yoki ZAP'ning o'rnatilgan brauzerini oching) va Qaydnoma'da ro'yxatdan o'ting, kiring, qayd yarating. "History" va "Alerts" yorliqlarida nima ko'rindi? Passiv skan qanday ogohlantirishlar berdi?

**2. Baseline.** `zap-baseline.py` bilan Qaydnoma'ni skanerlang (Docker'da `host.docker.internal:5000`). HTML hisobotni oching. Har bir ogohlantirishni yuqoridagi jadval bo'yicha darsga bog'lang.

**3. Konfiguratsiya regressiyasi.** a1 bosqichidagi `security_headers` funksiyasini vaqtincha o'chiring va baseline'ni qayta ishga tushiring. Qaysi yangi ogohlantirishlar paydo bo'ldi? Qaytaring.

**4. Autentifikatsiyali skan.** ZAP'da kontekst, forma autentifikatsiyasi, test foydalanuvchisi va `/logout` istisnosini sozlang. Spider autentifikatsiyasiz va autentifikatsiya bilan nechta URL topdi?

**5. Zaif branch.** a2 bosqichidagi `vulnerable` branch'ni lokal ishga tushirib, unga to'liq faol skan qiling. 8 ta kiritilgan zaiflikdan nechtasini topdi? SAST natijalari bilan solishtiring: qaysilarini faqat SAST, qaysilarini faqat DAST, qaysilarini hech biri topmadi?

**6. CI.** GitHub Actions'da ZAP baseline workflow'ini sozlang (test muhiti yoki workflow ichida ishga tushirilgan ilova bilan).

*Yo'nalish (5): odatda DAST reflected/stored XSS, ba'zan SQL injection, CSRF tokeni yo'qligi va batafsil xato sahifasini topadi; IDOR va biznes mantiqni (limit) deyarli topmaydi; zaif `random` tokenini esa faqat SAST yoki kod ko'rib chiqish ko'radi. Bu — vositalar bir-birini to'ldirishining amaliy isboti.*
:::

## Xulosa

- **DAST** — ishlab turgan ilovani tashqaridan, HTTP orqali sinash; **konfiguratsiya, sarlavhalar, cookie, server va proxy**ni birga ko'radi; SAST bilan bir-birini to'ldiradi.
- **Faqat o'z yoki ruxsat etilgan nishon; faol skan — faqat test muhitida.**
- **ZAP**: proxy rejimi va avtomatik skan; **passiv** (xavfsiz), **spider**, **faol** (ma'lumotni o'zgartiradi).
- Docker skriptlari: `zap-baseline.py` (passiv), `zap-api-scan.py` (OpenAPI), `zap-full-scan.py` (faol).
- **Autentifikatsiyali skan**: context, forma autentifikatsiyasi, test foydalanuvchisi, verification, **`/logout` istisnosi**, CSRF tokeni; **Automation Framework** — YAML reja, sirlar muhitdan.
- Natijalar — saralanadi: tasdiqlash, koddagi joyni topish, kontekstda baholash, tuzatish + test.
- CI: **har PR — baseline, har hafta — to'liq skan**, `rules.tsv` bilan FAIL/WARN/IGNORE.
- Cheklovlar: qamrov, **kirish nazorati va biznes mantiq**, ko'r zaifliklar, shovqin.

:::quiz
? DAST SAST'dan nimasi bilan farq qiladi?
+ U ishlab turgan ilovani tashqaridan HTTP so'rovlari orqali sinaydi va konfiguratsiya, sarlavhalar, cookie, server va proxy'ni birga ko'radi
- U manba kodni o'qiydi
- U faqat kutubxonalarni tekshiradi
- Farqi yo'q
! SAST — “qayerda”, DAST — “haqiqatan ishlaydimi”.

? Faol skan haqida qaysi gap to'g'ri?
+ U har bir parametrga hujum naqshlarini yuboradi va ma'lumotni o'zgartirishi mumkin — faqat test muhitida o'tkaziladi
- U hech narsa yubormaydi, faqat kuzatadi
- U ishlab chiqarishda xavfsiz
- U faqat rasmlarni tekshiradi
! Passiv skan esa faqat o'tgan trafikni tahlil qiladi.

? Qaysi ZAP skripti faqat spider va passiv skanni bajaradi?
+ zap-baseline.py
- zap-full-scan.py
- zap-api-scan.py
- Hech qaysi
! Baseline tez va xavfsiz — PR'larda ishlatish uchun qulay.

? Autentifikatsiyali skanda nega /logout ni istisno qilish kerak?
+ Aks holda spider “Chiqish”ni bosib, qolgan skan autentifikatsiyasiz o'tadi va natijalar soxta toza ko'rinadi
- /logout eng zaif sahifa
- ZAP /logout'ni o'qiy olmaydi
- Bu tezlik uchun
! Eng keng tarqalgan autentifikatsiyali skan tuzog'i.

? DAST skanerini qaysi nishonga qarshi ishlatish mumkin?
+ Faqat o'z ilovangiz yoki yozma ruxsat olingan nishonga, faol skan — test muhitida
- Istalgan ochiq saytga
- Raqobatchi kompaniya saytiga
- Davlat saytlariga, chunki ular ochiq
! Ruxsatsiz skanerlash — boshqalarning tizimiga hujum.

? ZAP “Content Security Policy Header Not Set” deb ogohlantirdi, lekin kodda CSP qo'shilgan. Mumkin bo'lgan sabab nima?
+ Reverse proxy yoki boshqa qatlam sarlavhani o'chirgan yoki boshqa konfiguratsiya yuklangan — DAST aynan shunday ish vaqti muammolarini topadi
- ZAP doim xato qiladi
- CSP kodda bo'lsa, muammo yo'q
- Bu faqat dizayn ogohlantirishi
! Kod to'g'ri bo'lsa ham, muhit uni buzishi mumkin.

? OpenAPI spetsifikatsiyasi DAST uchun nima beradi?
+ Skanerga barcha API endpointlari va parametrlarini — spider topa olmaydiganlarini ham — ko'rsatadi
- U skanni sekinlashtiradi
- U faqat hujjat, skanerga foydasiz
- U parollarni saqlaydi
! zap-api-scan.py spetsifikatsiyani o'qiydi.

? DAST qaysi zaiflik turlarini odatda yomon topadi?
+ IDOR va biznes mantiq xatolari
- Yo'q sarlavhalar
- Cookie atributlari
- Batafsil xato sahifalari
! Skaner obyekt kimga tegishli ekanini so'ramaydi.

? CI'dagi ZAP konfiguratsiyasidagi rules.tsv nima uchun kerak?
+ Har bir qoida uchun FAIL, WARN yoki IGNORE (asos bilan) belgilash — konveyer qachon to'xtashini aniqlash
- Parollarni saqlash
- Skan vaqtini belgilash
- Hisobot rangini tanlash
! Kam, aniq qoidalar konveyerni to'xtatsin.

? Nega to'liq faol skandan oldin SOC'ni ogohlantirish kerak?
+ Skaner trafigi IDS va SIEM'da ko'plab ogohlantirishlarni qo'zg'atadi va haqiqiy hujumdek ko'rinishi mumkin
- SOC skanerni o'chiradi
- Bu qonun talabi
- SOC skanerni boshqaradi
! Muvofiqlashtirish — b1 bosqichidagi triage'ni behuda yuklamaslik uchun.
:::

:::cards
DAST? :: Ishlab turgan ilovani tashqaridan HTTP orqali sinash — kodni ko'rmasdan, ish vaqti muhiti bilan.
SAST va DAST farqi? :: SAST — kod, qayerda; DAST — ishlab turgan ilova, konfiguratsiya, haqiqatan ishlaydimi.
DAST xavfsizlik qoidalari? :: Faqat o'z/ruxsat etilgan nishon; faol skan — test muhitida; SOC'ni ogohlantirish.
ZAP rejimlari? :: Proxy rejimi (qo'lda sinash, passiv tekshiruv) va avtomatik skan.
Skan turlari? :: Passiv (faqat kuzatish), spider/AJAX spider (sahifalarni topish), faol (hujum naqshlari — ma'lumotni o'zgartiradi).
ZAP Docker skriptlari? :: zap-baseline.py (passiv), zap-api-scan.py (OpenAPI), zap-full-scan.py (faol).
Autentifikatsiyali skan elementlari? :: Context, autentifikatsiya usuli, test foydalanuvchisi, session management, verification, istisnolar (/logout), CSRF tokeni.
ZAP Automation Framework? :: Kontekst, autentifikatsiya, skanlar va hisobotni YAML reja sifatida saqlash — takrorlanadigan va CI'ga mos.
DAST natijasini saralash? :: Tasdiqlash, koddagi joyni topish, kontekstda baholash, tuzatish + test; false positive — asos bilan filtr.
DAST CI'da? :: Har PR — baseline; har hafta — to'liq autentifikatsiyali skan; rules.tsv: FAIL/WARN/IGNORE.
DAST cheklovlari? :: Qamrov, kirish nazorati va biznes mantiq, ko'r zaifliklar, vaqt va shovqin.
DAST'ning eng katta qiymati? :: Avtomatik va muntazam ishlab, konfiguratsiya regressiyasini darhol ushlash.
:::
