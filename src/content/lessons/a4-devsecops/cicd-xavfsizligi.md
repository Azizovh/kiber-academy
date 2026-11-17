a2–a3 bosqichlarida Qaydnoma uchun ko'p xavfsizlik vositalarini o'rgandingiz: xavfsizlik testlari, Semgrep qoidalari, pip-audit, Gitleaks, ZAP baseline. Hammasi siz ularni **qo'lda ishga tushirganingizda** ishlaydi. Ertaga yangi dasturchi qo'shiladi, u ularni ishga tushirishni bilmaydi yoki unutadi — va zaif kod ishlab chiqarishga ketadi.

Yechim — barcha tekshiruvlarni **CI/CD** konveyeriga o'rnatish: har bir pull request'da, avtomatik, hech kim unutmasdan. Bu — **DevSecOps** g'oyasining yuragi: xavfsizlik — alohida bosqich emas, ishlab chiqish jarayonining o'zi.

Lekin bitta muhim burilish bor: CI/CD konveyerining o'zi ham — **hujum nishoni**. Unda sirlar bor (joylash kalitlari, bulut tokenlari), u ishlab chiqarishga kod joylaydi, va u har bir PR'dagi kodni ishga tushiradi. Konveyerni buzgan hujumchi — ishlab chiqarishni buzgan hujumchi. Bu darsda ikkala tomonni ko'rasiz: **konveyerda xavfsizlik** va **konveyerning xavfsizligi**.

## CI/CD qisqacha

[[ci-cd|CI/CD]] — Continuous Integration / Continuous Delivery:

```
 Dasturchi ── push / PR ──► CI: yig'ish → testlar → xavfsizlik tekshiruvlari ──► ko'rib chiqish ──► main
                                                                                                    │
                                                                    CD: artefakt (image) → joylash ◄┘
                                                                         staging → ishlab chiqarish
```

Bu darsda misollar **GitHub Actions** da — Qaydnoma ombori GitHub'da. GitLab CI, Jenkins va boshqalarda tamoyillar bir xil.

## 1-qism: konveyerda xavfsizlik

### Qaydnoma uchun xavfsizlik workflow'i

```yaml
# .github/workflows/security.yml
name: security

on:
  pull_request:
  push:
    branches: [main]

permissions:
  contents: read                       # eng kam huquq — pastda batafsil

jobs:
  test-and-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@<commit-SHA>          # v4 — SHA'ga qotirish, pastda
      - uses: actions/setup-python@<commit-SHA>      # v5
        with:
          python-version: "3.12"

      - name: Bog'liqliklar (xeshlar bilan)
        run: |
          pip install --require-hashes -r requirements.txt
          pip install pytest semgrep pip-audit

      - name: Xavfsizlik testlari (a2)
        run: pytest -q

      - name: SAST — Semgrep (a3)
        run: semgrep scan --config rules/ --config p/python --error

      - name: SCA — pip-audit (a3)
        run: pip-audit -r requirements.txt

  secrets:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@<commit-SHA>
        with:
          fetch-depth: 0                 # butun tarix — sirlar eski commit'larda ham bo'lishi mumkin
      - name: Sir skaneri — Gitleaks (a3)
        uses: gitleaks/gitleaks-action@<commit-SHA>
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

| Bosqich | Nimani ushlaydi | Qaysi dars |
|---|---|---|
| `pytest` | IDOR, XSS kodlash, CSRF, cookie, sarlavhalar regressiyalari | a2 — xavfsiz kod amaliyoti |
| `semgrep --error` | Injection naqshlari, `\|safe`, `load_note` chetlab o'tilishi | a3 — SAST |
| `pip-audit` | Ma'lum zaifli bog'liqliklar | a3 — SCA |
| Gitleaks | Commit qilingan sirlar | a3 — sirlarni boshqarish |
| (alohida, staging'ga) ZAP baseline | Sarlavhalar, cookie, konfiguratsiya | a3 — DAST |

`--error` flagi Semgrep'ni topilma bo'lsa nol bo'lmagan kod bilan tugatadi — konveyer **qizil** bo'ladi. pip-audit ham zaiflik topilsa qizil qiladi.

(Gitleaks action'ining ba'zi foydalanish turlari uchun litsenziya shartlari bor — rasmiy sahifani tekshiring yoki Gitleaks'ni oddiy buyruq sifatida ishga tushiring.)

### Branch himoyasi — tekshiruvlarni majburiy qilish

Workflow qizil bo'lsa ham, kimdir uni e'tiborsiz qoldirib birlashtirishi mumkin. GitHub'dagi **branch protection** (yoki rulesets) sozlamalari:

| Sozlama | Nega |
|---|---|
| **Required status checks** — `security` workflow o'tishi shart | Qizil PR birlashtirilmaydi |
| **Required reviews** — kamida 1 ta tasdiq | Kod ko'rib chiqish (a3) majburiy |
| **CODEOWNERS** — muhim fayllar uchun majburiy ko'rib chiquvchilar | `access.py`, `.github/workflows/`, `rules/` — AppSec jamoasi ko'rib chiqadi |
| **To'g'ridan-to'g'ri `main` ga push taqiqlangan** | Barcha o'zgarishlar PR orqali |
| **Force push va o'chirish taqiqlangan** | Tarixni qayta yozib bo'lmaydi |

```
# .github/CODEOWNERS
/qaydnoma/access.py        @qaydnoma/appsec
/qaydnoma/auth.py          @qaydnoma/appsec
/.github/workflows/        @qaydnoma/appsec
/rules/                    @qaydnoma/appsec
```

Oxirgi ikki qatorga e'tibor bering: **workflow fayllari va Semgrep qoidalari** ham himoyalangan. Aks holda dasturchi (yoki hujumchi) PR'da Semgrep qoidasini o'chirib, zaif kodni o'tkazib yuborishi mumkin.

### Ishonch va tezlik muvozanati

a3 bosqichidagi SAST joriy etish tamoyillari konveyerga ham tegishli:

- **Faqat yangi topilmalar** PR'ni to'xtatsin; eski kod bazasidagi topilmalar — alohida reja.
- **Tez** bo'lsin: PR tekshiruvlari bir necha daqiqada; og'ir skanlar (to'liq DAST) — tungi jadvalda.
- **Tushunarli** bo'lsin: qizil konveyer nima noto'g'ri va qanday tuzatishni aytsin.
- False positive'lar uchun **asoslangan istisno** mexanizmi bo'lsin (`nosemgrep` sabab bilan).

## 2-qism: konveyerning xavfsizligi

OWASP buning uchun alohida ro'yxat yuritadi — **OWASP Top 10 CI/CD Security Risks**:

| # | Xavf | Qisqacha |
|---|---|---|
| 1 | Insufficient Flow Control | Ko'rib chiqishsiz yoki tekshiruvsiz ishlab chiqarishga yetib borish mumkin |
| 2 | Inadequate Identity and Access Management | Ortiqcha huquqli hisoblar, eskirgan kirishlar |
| 3 | Dependency Chain Abuse | Ta'minot zanjiri hujumlari (a3) |
| 4 | **Poisoned Pipeline Execution (PPE)** | Hujumchi konveyerda o'z kodini ishga tushiradi |
| 5 | Insufficient PBAC | Konveyer bosqichlari keragidan ko'p narsaga kira oladi |
| 6 | **Insufficient Credential Hygiene** | Sirlar loglarda, uzoq muddatli tokenlar, keng huquqlar |
| 7 | Insecure System Configuration | CI tizimining o'zi noto'g'ri sozlangan |
| 8 | **Ungoverned Usage of 3rd Party Services** | Tekshirilmagan uchinchi tomon action'lari va integratsiyalar |
| 9 | Improper Artifact Integrity Validation | Artefakt yo'lda almashtirilsa — sezilmaydi |
| 10 | Insufficient Logging and Visibility | Konveyerda nima bo'lgani noma'lum |

Eng amaliy va keng tarqalgan muammolar:

### Eng kam huquqli token

GitHub har bir workflow'ga `GITHUB_TOKEN` beradi. Standart huquqlari omborning sozlamalariga bog'liq va ba'zan keng bo'ladi. Workflow boshida **aniq** belgilang:

```yaml
permissions:
  contents: read          # faqat kodni o'qish
```

Va faqat kerakli job'ga kerakli huquqni qo'shing (masalan, SARIF natijalarini yuklash uchun `security-events: write`). b2 bosqichidan beri takrorlanayotgan eng kam huquq tamoyili — konveyer uchun.

### Uchinchi tomon action'larini qotirish

`uses: biror-muallif/action@v2` — `v2` **ko'chuvchi teg**: muallif (yoki uning hisobini buzgan hujumchi) uni istalgan paytda boshqa kodga yo'naltirishi mumkin. Bunday holatlar haqiqatan sodir bo'lgan: mashhur action buzilib, ming-minglab omborlarning CI loglaridan sirlarni sizdirgan.

```yaml
# ❌ Ko'chuvchi teg
- uses: some-org/some-action@v2

# ✅ To'liq commit SHA'ga qotirish (izohda versiya — o'qish uchun)
- uses: some-org/some-action@<40-belgili-commit-SHA>   # v2.3.1
```

(Haqiqiy SHA'ni action'ning rasmiy relizidan — reliz tegining commit'idan — oling.) Dependabot SHA'ga qotirilgan action'larni ham yangilab turishi mumkin — xavfsizlik va yangilanish birga. a3 bosqichidagi "versiyalarni qotirish va xeshlar" tamoyili — konveyer uchun.

Shuningdek: action'ni qo'shishdan oldin uni **bog'liqlik** sifatida baholang (a3 bosqichidagi SCA darsidagi savollar) va iloji bo'lsa — rasmiy (`actions/*`) yoki tanilgan tashkilotlarning action'larini tanlang.

### Skript injection — konveyerdagi injection

a2 bosqichidagi injection darsi CI'da ham amal qiladi. PR sarlavhasi, branch nomi, izoh matni — **foydalanuvchi ma'lumoti**. Agar ular `run:` skriptiga to'g'ridan-to'g'ri qo'yilsa:

```yaml
# ❌ PR sarlavhasi shell skript matniga to'g'ridan-to'g'ri qo'yiladi
- run: echo "Tekshirilmoqda: ${{ github.event.pull_request.title }}"

# ✅ Avval muhit o'zgaruvchisiga — keyin shell uni oddiy qiymat sifatida ko'radi
- env:
    PR_TITLE: ${{ github.event.pull_request.title }}
  run: echo "Tekshirilmoqda: $PR_TITLE"
```

Birinchi holatda `${{ ... }}` ifodasi skript **matni**ga joylashtiriladi, shell ishga tushishidan oldin — sarlavhadagi shell belgilari buyruq sifatida bajariladi (a2 bosqichidagi command injection). Ikkinchi holatda qiymat muhit o'zgaruvchisi orqali — **ma'lumot** sifatida — beriladi. Yana bir bor: kod va ma'lumotni ajratish.

### Fork'lardan kelgan PR'lar va `pull_request_target`

Ochiq omborda istalgan odam fork qilib PR ochishi mumkin — va uning kodi sizning CI'ingizda ishlaydi. GitHub buni hisobga olgan: `pull_request` hodisasida fork'dan kelgan PR'ga **sirlar berilmaydi** va token faqat o'qish huquqiga ega.

Xavfli naqsh — `pull_request_target` hodisasi: u **asosiy omborning** kontekstida, sirlar va yozish huquqlari bilan ishlaydi. Agar shu workflow'da fork'dagi kod checkout qilinib, ishga tushirilsa — bu **Poisoned Pipeline Execution**: begona odamning kodi sizning sirlaringiz bilan ishlaydi.

| Qoida | Nega |
|---|---|
| Ishonchsiz kodni ishga tushirish kerak bo'lsa — `pull_request` | Sirlarsiz, cheklangan token |
| `pull_request_target` — faqat ishonchsiz kodni **ishga tushirmaydigan** ishlar uchun (masalan, yorliq qo'yish) | Sirlar va yozish huquqi bor |
| Fork'dan kelgan PR uchun workflow'ni ishga tushirishdan oldin tasdiq | Ombor sozlamasi |
| Ochiq omborlarda **self-hosted runner** ishlatmaslik | Begona kod sizning serveringizda ishlaydi |

### Sirlar va OIDC

a3 bosqichidagi sirlarni boshqarish darsi — konveyer uchun:

| Yomon | Yaxshi |
|---|---|
| Uzoq muddatli bulut kaliti GitHub secrets'da | **OIDC**: workflow bulutdan qisqa muddatli token oladi — statik kalit umuman yo'q |
| `echo $SECRET` yoki `set -x` loglarda | GitHub sirlarni loglarda yashirishga harakat qiladi, lekin o'zgartirilgan (masalan, Base64) qiymatni yashira olmaydi — sirlarni chiqarmang |
| Bitta keng huquqli token hamma uchun | Har bir muhit (staging, production) uchun alohida, minimal huquqli |
| Ishlab chiqarish sirlari har PR'da mavjud | **Environments** + tasdiq: production sirlari faqat tasdiqlangan joylashda |

OIDC — b4 bosqichidagi bulut loglari darsidagi "statik kalitlar o'rniga qisqa muddatli identifikatsiya" tamoyilining CI'dagi ko'rinishi:

```yaml
permissions:
  id-token: write          # OIDC token so'rash huquqi
  contents: read

steps:
  - uses: aws-actions/configure-aws-credentials@<commit-SHA>
    with:
      role-to-assume: arn:aws:iam::111122223333:role/qaydnoma-deploy
      aws-region: eu-central-1
```

Bulut tomonida rol **faqat** shu ombor va shu branch (masalan, `main`) uchun ishonch beradigan qilib sozlanadi — boshqa ombor yoki PR bu rolni ola olmaydi (Cloud tarmog'ida batafsil).

### Artefakt yaxlitligi

Konveyer yaratgan artefakt (konteyner image'i) joylashguncha almashtirilmasligi kerak:
- Image'ni **digest** (xesh) bo'yicha joylash, teg bo'yicha emas.
- Image'ni **imzolash** (masalan, Sigstore `cosign` — a3 bosqichidagi SCA darsi) va joylashda imzoni tekshirish.
- **SBOM**'ni har relizda yaratib, artefakt bilan saqlash (a3).

:::key
**Konveyer — ishlab chiqarishga eng qisqa yo'l, shuning uchun u ishlab chiqarishdek himoyalanadi.** Ikki tomonlama qoida: **konveyerda xavfsizlik** — testlar, SAST, SCA, sir skaneri har PR'da va majburiy (branch protection); **konveyerning xavfsizligi** — eng kam huquqli token, SHA'ga qotirilgan action'lar, `run:` da foydalanuvchi ma'lumoti yo'q, `pull_request_target` bilan ishonchsiz kod yo'q, statik sirlar o'rniga OIDC, workflow fayllari CODEOWNERS ostida. Birinchisisiz zaif kod o'tadi; ikkinchisisiz — hujumchi o'tadi.
:::

## Bu dars nimani bermaydi

- **GitHub Actions'ning to'liq sintaksisini** — rasmiy hujjatlar (Security hardening for GitHub Actions bo'limi alohida o'qishga arziydi).
- **Boshqa CI tizimlarini batafsil** — GitLab CI, Jenkins: tamoyillar bir xil.
- **Bulut tomonidagi OIDC sozlamasini** — Cloud tarmog'i.

:::try
**1. Workflow.** Qaydnoma omboringizda yuqoridagi `security.yml` ni yarating (action'larni rasmiy relizlarning to'liq SHA'siga qotiring). PR oching — barcha bosqichlar yashilmi?

**2. Qizil konveyer.** Alohida branch'da ataylab zaif qator qo'shing (a2 bosqichidagi f-string SQL) va PR oching. Qaysi bosqich qizil bo'ldi? Xabar tushunarlimi?

**3. Branch himoyasi.** `main` uchun required status checks, required reviews va to'g'ridan-to'g'ri push taqiqini yoqing. `CODEOWNERS` faylini qo'shing.

**4. Skript injection.** Workflow'ingizda `${{ github.event.* }}` qiymatlari `run:` ichida to'g'ridan-to'g'ri ishlatilgan joylar bormi? Ularni `env:` orqali o'tkazing.

**5. Eng kam huquq.** Har bir workflow boshiga `permissions:` blokini qo'shing. Qaysi job'ga qanday huquq kerakligini yozing.

**6. Audit.** OWASP Top 10 CI/CD Security Risks ro'yxati bo'yicha Qaydnoma konveyeringizni tekshiring: har bir band uchun "bajarilgan / qisman / yo'q".
:::

## Xulosa

- **DevSecOps**: xavfsizlik tekshiruvlari — konveyerning bir qismi, har PR'da avtomatik.
- Qaydnoma konveyeri: **testlar + Semgrep + pip-audit + Gitleaks** (PR'da), **ZAP** (staging'ga, jadval bilan).
- **Branch protection**: majburiy tekshiruvlar va ko'rib chiqish, to'g'ridan-to'g'ri push yo'q; **CODEOWNERS** — muhim kod, workflow'lar va qoidalar uchun.
- Konveyerning o'zi — nishon: **OWASP Top 10 CI/CD Security Risks**.
- **`permissions:`** — eng kam huquqli token.
- Uchinchi tomon action'lari — **to'liq commit SHA'ga qotirish**, bog'liqlik sifatida baholash.
- **Skript injection**: `${{ }}` ni `run:` ga qo'ymang — `env:` orqali.
- **`pull_request_target`** bilan ishonchsiz kodni ishga tushirmang; ochiq omborda self-hosted runner yo'q.
- Sirlar: **OIDC** (statik kalitlar o'rniga), Environments + tasdiq, sirlarni loglarga chiqarmaslik.
- Artefakt: **digest** bo'yicha joylash, imzolash, SBOM.

:::quiz
? DevSecOps'ning asosiy g'oyasi nima?
+ Xavfsizlik tekshiruvlari alohida bosqich emas, ishlab chiqish konveyerining bir qismi bo'lib, har o'zgarishda avtomatik ishlaydi
- Xavfsizlik jamoasi barcha kodni qo'lda tekshiradi
- Faqat yilda bir marta pentest
- Dasturchilar xavfsizlik bilan shug'ullanmaydi
! Tekshiruvlar hech kim unutmasdan har PR'da ishlaydi.

? Nega Semgrep qoidalari va workflow fayllari CODEOWNERS bilan himoyalanishi kerak?
+ Aks holda PR'da qoidani o'chirib yoki workflow'ni o'zgartirib, zaif kodni tekshiruvlardan o'tkazib yuborish mumkin
- Ular juda katta fayllar
- Bu GitHub talabi
- Ular faqat dizayn uchun
! Himoya mexanizmlarining o'zi ham himoyalanishi kerak.

? Workflow'dagi permissions: contents: read nima uchun kerak?
+ GITHUB_TOKEN'ga faqat kerakli minimal huquq berish — eng kam huquq tamoyili
- Workflow'ni tezlashtirish uchun
- Barcha huquqlarni berish uchun
- Faqat chiroyli ko'rinishi uchun
! Buzilgan bosqich keng huquqli token bilan ko'proq zarar keltiradi.

? Nega uchinchi tomon action'ini @v2 kabi teg emas, to'liq commit SHA'ga qotirish tavsiya etiladi?
+ Teg ko'chuvchi — muallif yoki uning hisobini buzgan hujumchi uni istalgan paytda boshqa kodga yo'naltirishi mumkin
- SHA tezroq yuklanadi
- Teglar ishlamaydi
- Bu faqat estetik tanlov
! Buzilgan mashhur action'lar orqali sirlar sizib chiqqan holatlar bo'lgan.

? Quyidagi qator nega xavfli: run: echo "${{ github.event.pull_request.title }}"?
+ PR sarlavhasi (foydalanuvchi ma'lumoti) skript matniga joylashtiriladi va undagi shell belgilari buyruq sifatida bajarilishi mumkin
- echo buyrug'i taqiqlangan
- PR sarlavhasi bo'sh bo'lishi mumkin
- Bu faqat sekin ishlaydi
! To'g'ri yo'l — qiymatni env: orqali berish.

? pull_request_target hodisasidan foydalanishdagi asosiy xavf nima?
+ U asosiy ombor kontekstida sirlar va yozish huquqi bilan ishlaydi — fork'dagi kod ishga tushirilsa, begona kod sirlaringiz bilan ishlaydi
- U juda sekin
- U fork'larni qo'llamaydi
- Unda testlar ishlamaydi
! Bu — Poisoned Pipeline Execution'ning klassik ko'rinishi.

? CI'dan bulutga joylash uchun eng xavfsiz autentifikatsiya usuli qaysi?
+ OIDC — workflow bulutdan faqat shu ombor va branch uchun ruxsat etilgan qisqa muddatli token oladi
- Uzoq muddatli administrator kaliti GitHub secrets'da
- Kalitni workflow fayliga yozish
- Kalitni PR izohida yuborish
! Statik kalit yo'q — sizib chiqadigan narsa yo'q.

? Qaysilar OWASP Top 10 CI/CD Security Risks ro'yxatidagi xavflar?
+ Poisoned Pipeline Execution
+ Insufficient Credential Hygiene
- SQL injection in templates
- Weak password policy for end users
! Ro'yxat konveyerning o'ziga qaratilgan.

? Konveyer zaif kodni topdi (qizil), lekin dasturchi baribir birlashtirdi. Buni nima to'xtatadi?
+ Branch protection'dagi required status checks
- Workflow'ni o'chirish
- Ko'proq izoh yozish
- Dasturchiga xat yuborish
! Majburiy tekshiruvsiz qizil konveyer — faqat maslahat.

? Konteyner image'ini joylashda yaxlitlikni ta'minlash uchun nima qilinadi?
+ Image'ni digest bo'yicha joylash, imzolash va imzoni tekshirish, SBOM saqlash
- Image'ni har doim latest tegi bilan joylash
- Image'ni ZIP qilib yuborish
- Faqat image nomini tekshirish
! Teg bo'yicha joylashda image yo'lda almashtirilishi mumkin.
:::

:::cards
DevSecOps? :: Xavfsizlik tekshiruvlarini ishlab chiqish konveyeriga o'rnatish — har o'zgarishda avtomatik.
Qaydnoma xavfsizlik konveyeri? :: PR'da: pytest (xavfsizlik testlari), Semgrep --error, pip-audit, Gitleaks; staging'ga: ZAP baseline.
Branch protection? :: Majburiy status tekshiruvlari, majburiy ko'rib chiqish, to'g'ridan-to'g'ri push va force push taqiqi.
CODEOWNERS? :: Muhim fayllar (access.py, workflow'lar, Semgrep qoidalari) uchun majburiy ko'rib chiquvchilar.
OWASP Top 10 CI/CD muhim xavflari? :: Flow control, IAM, dependency chain, Poisoned Pipeline Execution, credential hygiene, 3rd party services, artifact integrity.
Eng kam huquqli token? :: Workflow boshida permissions: contents: read; job'ga faqat kerakli huquq.
Action'larni qotirish? :: To'liq commit SHA'ga, izohda versiya; teglar ko'chuvchi.
Skript injection CI'da? :: ${{ github.event.* }} ni run: ga qo'ymaslik — env: orqali berish.
pull_request_target xavfi? :: Sirlar va yozish huquqi bilan ishlaydi — fork kodini ishga tushirmaslik.
Self-hosted runner? :: Ochiq omborlarda ishlatmaslik — begona kod serveringizda ishlaydi.
CI sirlari? :: OIDC (qisqa muddatli), Environments + tasdiq, alohida minimal tokenlar, sirlarni loglarga chiqarmaslik.
Artefakt yaxlitligi? :: Digest bo'yicha joylash, cosign bilan imzolash, SBOM saqlash.
:::
