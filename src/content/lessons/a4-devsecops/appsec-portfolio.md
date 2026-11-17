AppSec muhandisi intervyusida eng ko'p beriladigan savollardan biri: "Bizga o'zingiz xavfsizlashtirgan biror loyihani ko'rsating." Nazariy savollarga ("XSS turlari qanday?") javob berish oson. Lekin "Mana mening ilovam: mana uning tahdid modeli, mana topilgan va tuzatilgan zaifliklar, mana har bir tuzatish uchun test, mana PR'da ishlaydigan Semgrep qoidalarim va konveyer" — bu boshqa daraja.

Yaxshi xabar: siz buni allaqachon qildingiz. AppSec tarmog'i butun davomida bitta loyiha ustida ishladingiz — **Qaydnoma**. a1 da uni qurdingiz, a2 da zaifliklarini topib tuzatdingiz, a3 da tahdid modelini, talablarini va avtomatik tahlilni qo'shdingiz, a4 da konveyer, konteyner va jarayonlarni. Bu dars — shularning hammasini **ish beruvchi ko'radigan** portfolio loyihasiga aylantirish.

Karyera bo'limidagi portfolio va GitHub darsining umumiy tamoyillari va SOC tarmog'idagi uy laboratoriyasi darsi bu yerda ham amal qiladi; bu dars — AppSec'ga xos qismi.

## Portfolio loyihasining tarkibi

Curriculum'dagi maqsad: "O'z ilovangiz: tahdid modeli + xavfsiz kod + CI tekshiruvlari + hisobot." To'liq tarkib:

| Qism | Nima | Qaysi darsda yaratilgan |
|---|---|---|
| **Ilova** | Ishlaydigan Qaydnoma (Flask, application factory) | a1 — backend amaliyot; a2 — xavfsiz kod amaliyoti |
| **Tahdid modeli** | DFD, STRIDE jadvali, qarorlar | a3 — threat modeling |
| **Xavfsizlik talablari** | ASVS asosidagi talablar, "qanday tekshiriladi" ustuni bilan | a3 — xavfsizlik talablari |
| **Xavfsiz kod** | Markazlashgan avtorizatsiya, sxemalar, kodlash, CSP, CSRF… | a1–a2 |
| **Xavfsizlik testlari** | Har himoya uchun test, kirish nazorati matritsasi | a2 — xavfsiz kod amaliyoti |
| **O'z SAST qoidalari** | Semgrep qoidalari + ularning testlari | a3 — SAST |
| **CI/CD konveyeri** | Testlar, Semgrep, pip-audit, Gitleaks, Trivy, Checkov | a4 — CI/CD, konteynerlar |
| **DAST natijalari** | ZAP baseline/autentifikatsiyali skan hisoboti va tuzatishlar | a3 — DAST |
| **Ta'minot zanjiri** | Xeshli lock fayl, Dependabot, SBOM | a3 — SCA |
| **Konteyner** | Xavfsiz Dockerfile, `.dockerignore`, skan natijalari | a4 — konteynerlar |
| **Tuzatish hisobotlari** | Zaif branch'da topilgan va tuzatilgan zaifliklar | a2 — xavfsiz kod amaliyoti |
| **security.txt va siyosat** | Tashqi xabarlar uchun | a4 — zaifliklarni boshqarish |

## Ombor tuzilishi

```
qaydnoma/
├── README.md                         ← eng muhim fayl (pastda)
├── qaydnoma/                         ← ilova kodi
│   ├── __init__.py, auth.py, notes.py, access.py, api.py, security.py ...
├── tests/
│   ├── test_security.py              ← har himoya uchun test
│   └── test_access.py                ← kirish nazorati matritsasi
├── rules/                            ← o'z Semgrep qoidalaringiz
│   ├── sql-fstring.yaml + sql-fstring.py (testlar)
│   └── ...
├── docs/
│   ├── threat-model.md               ← DFD + STRIDE + qarorlar
│   ├── security-requirements.md      ← talablar va ularni tekshirish usullari
│   ├── findings/                     ← tuzatish hisobotlari
│   │   ├── QAYD-SEC-001-sqli-search.md
│   │   └── ...
│   └── zap-report.html               ← (yoki uning qisqa xulosasi)
├── .github/
│   ├── workflows/security.yml        ← konveyer
│   ├── dependabot.yml
│   └── CODEOWNERS
├── Dockerfile, .dockerignore
├── requirements.in, requirements.txt (xeshlar bilan)
├── SECURITY.md                       ← zaiflik haqida qanday xabar berish
└── .pre-commit-config.yaml
```

Muhim qaror: **zaif branch'ni** (`vulnerable`) saqlab qo'yish — uni README'da tushuntirib ("o'quv maqsadida ataylab zaif qilingan versiya; ishga tushirmang") — ish beruvchi "oldin" va "keyin"ni solishtira oladi. Yoki zaifliklarni tuzatish tarixini **alohida, tushunarli commit'lar** sifatida saqlash: har bir commit — bitta tuzatish, test bilan.

## README — 2 daqiqalik taassurot

SOC tarmog'idagi portfolio darsidagi qoida: ish beruvchi omborga taxminan 2 daqiqa sarflaydi. README shu vaqtda hamma narsani aytishi kerak:

```markdown
# Qaydnoma — xavfsizlik bilan qurilgan web ilova

Flask'dagi qaydlar ilovasi, unda men AppSec hayot siklini to'liq qo'lladim:
tahdid modeli → xavfsizlik talablari (OWASP ASVS L2) → xavfsiz kod → avtomatik testlar →
CI/CD'da SAST, SCA, sir va konteyner skanerlash → DAST.

## Natijalar bir qarashda
- 12 ta zaiflik topildi va tuzatildi (SQLi, stored XSS, IDOR, CSRF, mass assignment, …) —
  har biri hisobot va regressiya testi bilan → docs/findings/
- 28 ta xavfsizlik testi, shu jumladan 40 qatorlik kirish nazorati matritsasi
- 6 ta o'z Semgrep qoidam (testlari bilan) — loyihaning arxitektura qarorlarini majburlaydi
- Har PR'da: pytest, Semgrep, pip-audit, Gitleaks, Trivy, Checkov — hammasi yashil
- ZAP autentifikatsiyali skan: barcha High/Medium topilmalar tuzatilgan

## Xavfsizlik arxitekturasi
- Markazlashgan avtorizatsiya: barcha obyektlar `load_note(id, Action)` orqali, standart — rad etish
- Kirish/chiqish sxemalari (Pydantic, `extra="forbid"`)
- Nonce asosidagi CSP, Secure/HttpOnly/SameSite cookie, CSRF tokenlari
- Argon2id, `secrets`, sirlar faqat muhitdan, fail-closed konfiguratsiya
- Konteyner: slim + digest, multi-stage, root emas, read-only

## Hujjatlar
- [Tahdid modeli](docs/threat-model.md) · [Xavfsizlik talablari](docs/security-requirements.md)
- [Tuzatish hisobotlari](docs/findings/) · [Konveyer](.github/workflows/security.yml)

## Eng qiziq topilma
Qidiruv va ro'yxat endpointlari bitta qaydni ko'rsatishdan farqli ravishda ruxsat filtrini
chetlab o'tgan edi — boshqa foydalanuvchilarning qayd sarlavhalari ko'rinardi. Tuzatish va
matritsa testi: docs/findings/QAYD-SEC-007.md

## Ishga tushirish
...
```

"Natijalar bir qarashda" bo'limidagi raqamlar — **haqiqiy** bo'lishi kerak (rezyume darsidagi halollik qoidasi). Va "Eng qiziq topilma" — intervyudagi suhbat uchun tayyor mavzu.

## Tuzatish hisobotlari — portfolio markazi

Har bir zaiflik uchun a2 bosqichidagi formatdagi hisobot. Ular sizning **fikrlashingizni** ko'rsatadi — kod emas, aynan fikrlash ish beruvchi uchun eng qimmatli:

- **Ildiz sabab** — nega bu zaiflik paydo bo'ldi (dizayn xatosimi, unutilgan tekshiruvmi)?
- **Tuzatish** — nega aynan shu usul (masalan, "escape" emas, parametrlash)?
- **Test** — tuzatish ishlashining isboti.
- **O'xshash joylar** — butun sinfni qidirganingiz.
- **Oldini olish** — "bu endi Semgrep qoidasi bilan tekshiriladi" (a3).

Bitta zaiflikning to'liq hikoyasi — topishdan qoida yozishgacha — 20 ta yuzaki topilmadan qimmatroq.

## Ochiq kodga hissa

Curriculum'dagi ikkinchi maqsad: "Ochiq kodli loyihaga xavfsizlik bo'yicha hissa qo'shdim yoki zaiflik haqida xabar berdim." Bu — portfolioning eng kuchli qismlaridan biri, chunki u **haqiqiy** loyihada, **boshqalar tasdiqlagan** ish.

### Hissa qo'shish yo'llari — osondan qiyinga

| Yo'l | Misol | Qiyinligi |
|---|---|---|
| **Hujjatlarni yaxshilash** | Loyihaning xavfsizlik bo'limiga tushuntirish qo'shish; `SECURITY.md` yo'q loyihaga uni taklif qilish | Oson |
| **Xavfsizlik vositalari qoidalari** | Semgrep qoidalari ombori, Sigma qoidalari (b2), YARA qoidalari (b2), Nuclei shablonlari — yangi qoida yoki false positive tuzatish | O'rta |
| **CI'ga xavfsizlik tekshiruvi qo'shish** | Kichik loyihaga Dependabot, CodeQL yoki pip-audit qo'shadigan PR | O'rta |
| **Xavfsizlik vositalarining o'ziga hissa** | ZAP, Semgrep, Trivy kabi loyihalarda "good first issue" | O'rta–qiyin |
| **Zaiflik topish va xabar berish** | Ochiq loyiha kodini ko'rib chiqib (a3), zaiflik topish | Qiyin |

Birinchi uch yo'l — boshlang'ich uchun eng realistik va baribir juda qimmatli: "Men Semgrep qoidalari omboriga Flask uchun yangi qoida qo'shdim va u qabul qilindi" — intervyuda kuchli jumla.

### Zaiflik topsangiz — mas'uliyatli oshkor qilish

```
 1. TO'XTANG — zaiflikdan "yana bir oz" foydalanmang, boshqalarning ma'lumotiga tegmang
       ▼
 2. Loyihaning SECURITY.md fayli yoki security.txt'ni toping — xabar berish yo'li
       ▼
 3. XUSUSIY xabar bering (GitHub'ning "Report a vulnerability" funksiyasi, email) —
    ochiq issue EMAS
       ▼
 4. Aniq hisobot: nima, qayerda, qanday qayta hosil qilish, ta'sir, tuzatish taklifi
       ▼
 5. Kuting — odatda tuzatish uchun vaqt beriladi (ko'pincha 90 kunga yaqin muddat odatiy)
       ▼
 6. Tuzatish chiqqandan KEYIN — kelishilgan holda writeup (portfolio darsi)
```

| Qiling | Qilmang |
|---|---|
| Faqat kodni o'qib yoki **o'z** lokal nusxangizda sinab topish | Loyihaning ishlab chiqarish serverida yoki boshqalarning o'rnatmalarida sinash |
| Xususiy, aniq, hurmatli xabar | Ochiq issue, ijtimoiy tarmoqdagi post, tuzatishdan oldin |
| Qo'llab-quvvatlovchilarga vaqt berish | Pul yoki mukofot talab qilish (bu tovlamachilikka o'xshaydi), agar loyihada rasmiy dastur bo'lmasa |
| Tuzatish chiqqandan keyin kelishib yozish | Tuzatishsiz zaiflik tafsilotlarini e'lon qilish |

### Bug bounty

HackerOne, Bugcrowd kabi platformalardagi bug bounty dasturlari — tajriba va ba'zan daromad. Lekin muhim qoidalar:

- **Faqat dasturning qamrovi** (scope) ichida — qamrovdan tashqari tizimlar ruxsatsiz.
- Dastur **qoidalari**ni o'qing: qanday sinash usullari taqiqlangan (masalan, DoS, ijtimoiy muhandislik).
- Boshlang'ich uchun natija **sekin va kam** bo'lishi tabiiy — raqobat katta. Ko'pchilik uchun asosiy foyda — o'rganish va hisobot yozish tajribasi.
- VDP (mukofotsiz oshkor qilish dasturlari) ham yaxshi tajriba manbai.

:::key
**AppSec portfoliosi — "men zaifliklar haqida bilaman" emas, "men xavfsiz dasturiy ta'minotni qanday qurishni ko'rsata olaman".** Bitta to'liq loyiha — tahdid modelidan konveyergacha, har bir tuzatish test bilan, har bir saboq qoidaga aylangan — o'nlab tarqoq mashqlardan kuchliroq. Unga ochiq kodga bitta haqiqiy hissa qo'shing (qoida, CI tekshiruvi yoki mas'uliyatli xabar) — va siz boshqa boshlang'ich nomzodlardan ajralib turasiz. Va doim: faqat ruxsat etilgan nishonlar, faqat xususiy oshkor qilish.
:::

## Intervyuda ko'rsatish

Karyera bo'limidagi intervyu darsidagi tamoyillar — AppSec misolida:

- **5 daqiqalik namoyish**: README → tahdid modeli (bitta oqim va uning STRIDE tahdidlari) → bitta tuzatish hisoboti (zaif kod → tuzatish → test) → konveyerning qizil bo'lgan PR'i (Semgrep qoidangiz ushlagan).
- **STAR hikoyasi**: "Qidiruv endpointi ruxsat filtrini chetlab o'tganini topdim" — vaziyat, vazifa, **harakat** (qanday topdingiz, qanday tuzatdingiz, qanday test va qoida qo'shdingiz), natija.
- **Savollarga tayyor bo'ling**: "Nega `escape` emas, parametrlash?", "Nega admin qaydlarni o'qiy olmaydi?", "Semgrep qoidangiz qanday false positive berishi mumkin?" — har bir qaroringizni tushuntira olishingiz kerak.

## Bu dars nimani bermaydi

- **Har bir ochiq kod loyihasining hissa qoidalarini** — har bir loyihaning `CONTRIBUTING.md` va `SECURITY.md` fayllarini o'qing.
- **Bug bounty strategiyasini batafsil** — alohida keng mavzu.
- **Karyera bo'limini takrorlash** — rezyume, LinkedIn, ish qidirish o'sha yerda.

:::try
**1. Inventarizatsiya.** Yuqoridagi "tarkib" jadvali bo'yicha Qaydnoma omboringizda nima bor va nima yo'qligini belgilang. Yetishmayotganlar uchun reja tuzing.

**2. README.** Namuna asosida README'ni qayta yozing — faqat **haqiqiy** raqamlar bilan. Do'stingizga 2 daqiqa ko'rsating va so'rang: "Bu loyiha nima haqida va men nima qila olaman?"

**3. Tuzatish hisobotlari.** Kamida 5 ta zaiflik uchun `docs/findings/` ga hisobot yozing — ildiz sabab, tuzatish, test, o'xshash joylar va oldini olish bilan.

**4. Ochiq kodga birinchi hissa.** Uchta yo'ldan birini tanlang: (a) GitHub'da `SECURITY.md` yo'q kichik loyihaga uni taklif qiladigan PR; (b) Semgrep qoidalari omborida "good first issue" yoki false positive tuzatish; (c) kichik loyihaga Dependabot yoki CodeQL qo'shadigan PR. Natijani portfolioga qo'shing.

**5. Intervyu namoyishi.** 5 daqiqalik namoyishni yozing va ovoz chiqarib mashq qiling (rozilik bilan yozib olib, keyin tomosha qiling).
:::

## Xulosa

- AppSec portfoliosi — **Qaydnoma**: a1–a4 bosqichlaridagi barcha ishlar bitta loyihada.
- Tarkib: ilova, **tahdid modeli**, **talablar**, xavfsiz kod, **xavfsizlik testlari**, **o'z Semgrep qoidalari**, **CI/CD konveyeri**, DAST natijalari, ta'minot zanjiri, konteyner, **tuzatish hisobotlari**, `SECURITY.md`.
- Ombor — tushunarli tuzilma; zaif branch yoki alohida tuzatish commit'lari — "oldin va keyin".
- **README** — 2 daqiqalik taassurot, haqiqiy raqamlar, eng qiziq topilma.
- Tuzatish hisobotlari — **fikrlashni** ko'rsatadi: ildiz sabab, tuzatish usuli, test, o'xshash joylar, oldini olish.
- **Ochiq kodga hissa**: hujjatlar, qoidalar, CI tekshiruvlari, vositalar — yoki **mas'uliyatli oshkor qilish** (xususiy xabar, vaqt berish, tuzatishdan keyin writeup).
- Bug bounty — faqat **qamrov va qoidalar** ichida.
- Intervyu: 5 daqiqalik namoyish, STAR hikoyasi, har bir qarorni tushuntirish.

:::quiz
? AppSec portfoliosining eng kuchli shakli qaysi?
+ Bitta to'liq loyiha — tahdid modelidan konveyergacha, har bir tuzatish test bilan va saboqlar qoidaga aylangan
- O'nlab tarqoq, tugallanmagan mashqlar
- Faqat sertifikatlar ro'yxati
- Faqat nazariy maqolalar
! U “men xavfsiz dasturiy ta'minotni qura olaman” degan dalil.

? Tuzatish hisobotlari portfolioda nega qimmatli?
+ Ular fikrlashni ko'rsatadi — ildiz sabab, tuzatish usuli, test, o'xshash joylar va oldini olish
- Ular hujjatni uzaytiradi
- Ular faqat kod nusxalari
- Ular majburiy formallik
! Ish beruvchi uchun eng qimmatli narsa — fikrlash jarayoni.

? README'dagi “Natijalar bir qarashda” bo'limida nima muhim?
+ Raqamlar aniq va haqiqiy bo'lishi
- Raqamlar iloji boricha katta bo'lishi, haqiqiy bo'lmasa ham
- Raqamlar umuman bo'lmasligi
- Faqat rangli rasmlar
! Intervyuda har bir raqam bo'yicha savol berilishi mumkin.

? Ochiq kodli loyihada zaiflik topsangiz, birinchi navbatda nima qilish kerak?
+ To'xtash, loyihaning SECURITY.md'sini topish va xususiy xabar berish
- Ochiq GitHub issue yaratish
- Ijtimoiy tarmoqda e'lon qilish
- Zaiflikdan foydalanib, ta'sirini ko'rsatish
! Ochiq e'lon tuzatish chiqmaguncha foydalanuvchilarni xavf ostida qoldiradi.

? Mas'uliyatli oshkor qilishda qaysi harakatlar NOTO'G'RI?
+ Loyihaning ishlab chiqarish serverida zaiflikni sinash
+ Tuzatish chiqmasdan zaiflik tafsilotlarini e'lon qilish
- O'z lokal nusxangizda sinab ko'rish
- Qo'llab-quvvatlovchilarga tuzatish uchun vaqt berish
! Faqat o'z nusxangizda va faqat xususiy kanal orqali.

? Boshlang'ich AppSec mutaxassisi uchun ochiq kodga hissa qo'shishning eng realistik yo'llari qaysi?
+ Hujjatlarni yaxshilash, xavfsizlik vositalari qoidalarini yozish yoki kichik loyihaga CI xavfsizlik tekshiruvi qo'shish
- Faqat yangi zaiflik topish
- Faqat yirik loyihalarni qayta yozish
- Hissa qo'shish boshlang'ichlar uchun mumkin emas
! Qabul qilingan qoida yoki PR — intervyuda kuchli dalil.

? Bug bounty dasturlarida qaysi qoida eng muhim?
+ Faqat dasturning qamrovi va qoidalari ichida sinash
- Istalgan tizimni sinash mumkin
- Qoidalarni o'qish shart emas
- DoS hujumlari har doim ruxsat etilgan
! Qamrovdan tashqari — ruxsatsiz.

? Nega zaif branch'ni (yoki alohida tuzatish commit'larini) portfolioda saqlash foydali?
+ Ish beruvchi “oldin” va “keyin”ni solishtirib, har bir tuzatishni ko'ra oladi
- U omborni kattaroq qiladi
- U ilovani tezlashtiradi
- U majburiy talab
! README'da u o'quv maqsadida ataylab zaif ekanini aniq yozing.

? Intervyuda portfolioni namoyish qilishda qaysi yondashuv eng samarali?
+ Qisqa tuzilgan namoyish: README → tahdid modeli → bitta tuzatish hikoyasi → konveyer ushlagan PR, va har bir qarorni tushuntirishga tayyorlik
- Butun kodni qatorma-qator o'qib berish
- Faqat sertifikatlarni ko'rsatish
- Hech narsa ko'rsatmaslik
! Aniq hikoya — eng kuchli dalil.

? Ochiq kod loyihasi rasmiy mukofot dasturiga ega bo'lmasa, zaiflik haqida xabar berganda pul talab qilish haqida qaysi gap to'g'ri?
+ Bu tovlamachilikka o'xshab qolishi mumkin — xabar beg'araz va hurmatli bo'lishi kerak
- Har doim pul talab qilish kerak
- Pul berilmasa, zaiflikni e'lon qilish kerak
- Bu normal amaliyot
! Rasmiy dastur bo'lsa — uning qoidalari amal qiladi.
:::

:::cards
AppSec portfolio tarkibi? :: Ilova, tahdid modeli, talablar, xavfsiz kod, xavfsizlik testlari, o'z Semgrep qoidalari, CI/CD, DAST natijalari, ta'minot zanjiri, konteyner, tuzatish hisobotlari, SECURITY.md.
Portfolio ombori tuzilishi? :: qaydnoma/, tests/, rules/, docs/ (threat-model, security-requirements, findings), .github/ (workflows, dependabot, CODEOWNERS), Dockerfile, lock fayl, SECURITY.md.
Oldin va keyin? :: Zaif branch (README'da ogohlantirish bilan) yoki har tuzatish — alohida commit, test bilan.
Yaxshi README? :: Loyiha nima, haqiqiy raqamlar, xavfsizlik arxitekturasi, hujjatlar havolalari, eng qiziq topilma — 2 daqiqada.
Tuzatish hisobotining qimmatli qismlari? :: Ildiz sabab, tuzatish usuli sababi, test, o'xshash joylar, oldini olish (qoida).
Ochiq kodga hissa yo'llari? :: Hujjatlar va SECURITY.md, xavfsizlik vositalari qoidalari, CI tekshiruvlari, vositalarning o'ziga hissa, zaiflik xabari.
Mas'uliyatli oshkor qilish qadamlari? :: To'xtash → SECURITY.md → xususiy xabar → aniq hisobot → vaqt berish → tuzatishdan keyin writeup.
Mas'uliyatli oshkor qilishda qilinmaydi? :: Ishlab chiqarishda sinash, ochiq issue, tuzatishdan oldin e'lon, mukofotsiz dasturda pul talab qilish.
Bug bounty qoidalari? :: Faqat qamrov va qoidalar ichida; boshlang'ich uchun natija sekin — asosiy foyda tajriba.
Intervyu namoyishi? :: README → tahdid modeli → bitta tuzatish (zaif kod → tuzatish → test) → konveyer ushlagan PR; qarorlarni tushuntirish.
STAR hikoyasi AppSec'da? :: Vaziyat, vazifa, harakat (topish, tuzatish, test, qoida), natija va saboq.
AppSec portfoliosining g'oyasi? :: “Zaifliklarni bilaman” emas, “xavfsiz dasturiy ta'minotni qura olaman” degan dalil.
:::
