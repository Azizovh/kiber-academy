Dushanba kuni yangi qoida yozdingiz: "PowerShell kodlangan buyruq bilan ishga tushsa — ogohlantirish". Seshanba ertalab navbatda 4 000 ta ogohlantirish. Ma'lum bo'lishicha, kompaniyaning boshqaruv tizimi har bir kompyuterda har soatda aynan shunday buyruqni ishga tushirar ekan.

Chorshanba kuni qoidaga istisno qo'shdingiz: "`C:\ProgramData\` papkasidagi skriptlarni hisobga olma". Ogohlantirishlar yo'qoldi. Bir oydan keyin ma'lum bo'ladi: hujumchi o'z skriptini aynan shu papkaga joylagan edi.

Qoida yozish — oson. **Yaxshi** qoida yozish — alohida kasb. Uni **detection engineering** (aniqlash muhandisligi) deyishadi va bu SOC'dagi eng tez o'sayotgan, eng yaxshi to'lanadigan yo'nalishlardan biri.

## Yaxshi qoida qanday bo'ladi

Har bir [[detection-rule|aniqlash qoidasi]] ikki xil xato qilishi mumkin:

| Xato | Nima | Narxi |
|---|---|---|
| **False positive** | Zararsiz narsaga ogohlantirish | Analitik vaqti, alert fatigue, ishonch yo'qolishi |
| **False negative** | Haqiqiy hujumni o'tkazib yuborish | Insident |

Ikkalasini birdan nolga tushirish mumkin emas: qoidani qattiqroq qilsangiz — ko'proq o'tkazib yuborasiz; yumshoqroq qilsangiz — shovqin oshadi. Aniqlash muhandisining ishi — **muvozanat**.

Yaxshi qoidaning belgilari:

| Xususiyat | Ma'nosi |
|---|---|
| **Aniq maqsad** | Qaysi hujum xatti-harakatini qidiradi — bir jumlada aytib bera olasiz |
| **Mustahkamlik** | Hujumchi kichik o'zgarish bilan aylanib o'ta olmaydi |
| **Past shovqin** | Ishlaganda — odatda tekshirishga arziydigan narsa |
| **Kontekst** | Ogohlantirishda analitikka kerak bo'ladigan hamma narsa bor |
| **Yo'riqnoma** | Ishlaganda nima qilish kerakligi yozilgan (playbook) |
| **Sinab ko'rilgan** | Haqiqiy hujum simulyatsiyasida ishlashi tasdiqlangan |

### Mo'rt va mustahkam qoidalar

Bir xil hujumni turli darajada aniqlash mumkin:

| Qoida | Hujumchi qanday aylanib o'tadi | Baho |
|---|---|---|
| Fayl xeshi `a3f5…` ga teng bo'lsa | Faylda bitta baytni o'zgartiradi | Juda mo'rt |
| Fayl nomi `mimi.exe` bo'lsa | Nomini o'zgartiradi | Mo'rt |
| Buyruq satrida aniq bitta so'z bo'lsa | Katta-kichik harf, qisqartma, boshqa yozuv | O'rtacha |
| **Ofis dasturi buyruq qobig'ini ishga tushirsa** | Butun yetkazish usulini o'zgartirishi kerak | Mustahkam |
| **Oddiy foydalanuvchi jarayoni tizim parollari saqlanadigan jarayon xotirasiga murojaat qilsa** | Asosiy maqsadidan voz kechishi kerak | Juda mustahkam |

Qoida qanchalik **xatti-harakatga** (nima qilinmoqda) yaqin bo'lsa va **artefaktdan** (nima bilan qilinmoqda) uzoq bo'lsa, shunchalik mustahkam. Bu g'oyani tahdid razvedkasi darsida **Pyramid of Pain** sifatida yana ko'rasiz.

## Qoidaning hayot sikli

```
 1. Gipoteza ──► 2. Ma'lumot bormi? ──► 3. Yozish ──► 4. Sinash ──► 5. Sozlash ──► 6. Ishga tushirish
      ▲                                                                                   │
      └──────────────────────── 7. Kuzatish va qayta ko'rib chiqish ◄─────────────────────┘
```

**1. Gipoteza.** Qaysi hujumni aniqlamoqchisiz? Manbalar: tahdid razvedkasi hisobotlari, ATT&CK texnikalari (keyingi dars), o'tgan insidentlar, red team topilmalari. Misol: "Hujumchilar phishing orqali makrosli hujjat yuboradi; makros PowerShell'ni ishga tushiradi."

**2. Ma'lumot bormi?** Bu xatti-harakat qaysi logda ko'rinadi va **u log SIEM'ga keladimi?** Misol: Sysmon Event ID 1 (ota-jarayon kerak). Agar Sysmon yo'q bo'lsa — 4688 buyruq satri bilan. Agar u ham yoqilmagan bo'lsa — qoida yozish emas, avval log manbasini ulash kerak. Windows darsidagi "yozuv yo'q ≠ hodisa yo'q" qoidasini eslang.

**3. Yozish.** Mantiqni SIEM tiliga yoki — yaxshiroq — Sigma formatiga o'giring (pastda).

**4. Sinash** — ikki yo'nalishda:
- **Ishlaydimi?** Hujumni laboratoriyada simulyatsiya qiling va ogohlantirish chiqqanini tekshiring. Buning uchun himoyachilar uchun yaratilgan ochiq vositalar bor — masalan, **Atomic Red Team**: ATT&CK texnikalari bo'yicha kichik, xavfsiz sinov skriptlari to'plami. Faqat o'z laboratoriyangizda.
- **Qancha shovqin?** So'rovni oxirgi 30 kunlik haqiqiy loglar ustida ishga tushiring. Nechta natija? Ulardan nechtasi haqiqatan shubhali?

**5. Sozlash** — false positive'larni kamaytirish (pastda batafsil).

**6. Ishga tushirish** — jadval, jiddiylik darajasi, playbook.

**7. Kuzatish** — qoida qancha ishlayapti, nechtasi true positive? Muhit o'zgaradi: yangi dastur o'rnatildi — eski qoida shovqin chiqara boshlaydi. Log formati o'zgardi — qoida jimgina ishlamay qoladi.

## Sigma — qoidalarning umumiy tili

Tasavvur qiling: siz Splunk'da ajoyib qoida yozdingiz. Hamkasbingiz Elastic ishlatadi, boshqasi Sentinel. Har biri qoidani o'z tiliga qayta yozishi kerak. Yoki kompaniya SIEM'ni almashtirdi — 300 ta qoida qayta yoziladi.

[[sigma|Sigma]] bu muammoni hal qiladi: qoida bir marta **SIEM'ga bog'liq bo'lmagan** YAML formatida yoziladi, keyin istalgan SIEM so'roviga avtomatik aylantiriladi. Bu YARA darsidagi fayllar uchun qoidalar va Suricata darsidagi tarmoq qoidalarining loglar uchun ekvivalenti.

Sysmon darsidagi "Word → PowerShell" naqshi Sigma'da:

```yaml
title: Ofis dasturidan buyruq qobig'i ishga tushishi
id: b517c7a3-539f-4f20-89a3-fdc5a59d545a
status: experimental
description: >
  Word, Excel yoki Outlook buyruq qobig'i yoki skript interpretatorini ishga tushirdi.
  Makrosli zararli hujjatlarning odatiy belgisi.
author: KiberAkademiya o'quvchisi
date: 2026-11-16
tags:
  - attack.execution
  - attack.t1204.002
  - attack.t1059.001
logsource:
  category: process_creation
  product: windows
detection:
  selection_parent:
    ParentImage|endswith:
      - '\WINWORD.EXE'
      - '\EXCEL.EXE'
      - '\OUTLOOK.EXE'
  selection_child:
    Image|endswith:
      - '\powershell.exe'
      - '\pwsh.exe'
      - '\cmd.exe'
      - '\wscript.exe'
      - '\mshta.exe'
  condition: selection_parent and selection_child
falsepositives:
  - Ofis uchun ba'zi qonuniy plaginlar va avtomatlashtirish makroslari
level: high
```

### Qism-qism

| Maydon | Ma'nosi |
|---|---|
| `title`, `description` | Qoida nima qiladi — odam uchun |
| `id` | Noyob identifikator (UUID) |
| `status` | `experimental` → `test` → `stable` |
| `tags` | ATT&CK taktika va texnikalari |
| `logsource` | Qaysi turdagi loglar: `category` (process_creation, network_connection, dns_query…), `product` (windows, linux…) |
| `detection` | Qidiruv mantiqi |
| `condition` | Tanlovlar qanday birlashtiriladi |
| `falsepositives` | Ma'lum zararsiz holatlar — analitik uchun |
| `level` | `informational`, `low`, `medium`, `high`, `critical` |

### detection bo'limi

**Tanlov** (selection) — maydon va qiymatlar. Qoidalar:
- Bir tanlov ichidagi **turli maydonlar** — VA (ikkalasi ham).
- Bitta maydon uchun **qiymatlar ro'yxati** — YOKI (birortasi).

**Modifikatorlar** — `|` dan keyin yoziladi:

| Modifikator | Ma'nosi |
|---|---|
| `\|endswith` | Shu bilan tugaydi |
| `\|startswith` | Shu bilan boshlanadi |
| `\|contains` | Ichida bor |
| `\|contains\|all` | Ro'yxatdagi hammasi ichida bor |
| `\|re` | Regex |
| `\|cidr` | IP tarmoq oralig'ida (`10.0.0.0/8`) |

**Condition** — tanlovlarni birlashtirish: `and`, `or`, `not`, qavslar, `1 of selection_*` (birortasi), `all of selection_*` (hammasi). Istisno uchun odatiy naqsh:

```yaml
  filter_sccm:
    ParentImage|endswith: '\CcmExec.exe'
  condition: selection and not filter_sccm
```

### Sigma'ni SIEM so'roviga aylantirish

Buning uchun rasmiy **sigma-cli** vositasi bor (Python):

```bash
pip install sigma-cli
sigma plugin list                       # mavjud backend'lar (splunk, elasticsearch, ...)
sigma plugin install splunk
sigma list pipelines                    # maydon nomlarini moslash "quvurlari"
sigma convert -t splunk -p <pipeline> office_shell.yml
```

**Pipeline** — Sigma'dagi umumiy maydon nomlarini (`Image`, `ParentImage`) sizning SIEM'ingizdagi haqiqiy nomlarga moslaydi (masalan, ECS'da `process.executable`). Splunk darsidagi ogohlantirishni eslang: noto'g'ri maydon nomi xato bermaydi — bo'sh natija beradi. Shuning uchun aylantirilgan so'rovni doim o'z ma'lumotlaringizda sinang.

Natija Splunk uchun taxminan shunday bo'ladi:

```
ParentImage IN ("*\\WINWORD.EXE", "*\\EXCEL.EXE", "*\\OUTLOOK.EXE")
Image IN ("*\\powershell.exe", "*\\pwsh.exe", "*\\cmd.exe", "*\\wscript.exe", "*\\mshta.exe")
```

**SigmaHQ** omborida (GitHub) hamjamiyat yozgan **3 000 dan ortiq** tayyor qoida bor. Ular — o'rganish uchun bebaho: har bir texnika uchun tajribali muhandislar qanday fikrlashini ko'rasiz. Lekin ularni o'ylamasdan ommaviy yoqish — alert fatigue'ga eng tez yo'l.

## False positive'larni sozlash

Qoida ishga tushdi va shovqin chiqaryapti. Sozlash — eng nozik qism, chunki har bir istisno — **potentsial ko'r nuqta**.

### To'g'ri va noto'g'ri istisnolar

| Noto'g'ri (keng) | To'g'ri (tor) |
|---|---|
| `user` = `admin` bo'lsa e'tiborsiz qoldir | Faqat `admin` + aniq bitta skript yo'li + aniq server |
| `C:\ProgramData\` papkasidagi hamma narsa | To'liq yo'l: `C:\ProgramData\Vendor\agent\update.ps1` |
| `host` = `SRV-01` dan kelgan hammasi | `SRV-01` + aniq ota-jarayon + aniq buyruq satri naqshi |
| Buyruq satrida `update` so'zi bo'lsa | Imzolangan, ma'lum ishlab chiqaruvchining fayli |

Dars boshidagi hikoya — aynan chap ustundagi xato: butun papka istisno qilindi va hujumchi o'sha papkaga yashirindi. Sysmon darsidagi konfiguratsiya istisnolari haqidagi ogohlantirish bilan bir xil fikr.

Qoida: istisnoni **iloji boricha ko'p shart** bilan yozing. Hujumchi bitta shartni (masalan, papka nomini) takrorlashi oson; to'rttasini birdan — qiyin.

### Boshqa sozlash usullari

| Usul | Qachon |
|---|---|
| **Chegarani oshirish** | "1 ta urinish" emas, "10 daqiqada 20 ta" |
| **Kontekst qo'shish** | Faqat muhim serverlarda yoki faqat ish vaqtidan tashqari |
| **Jiddiylikni pasaytirish** | Ogohlantirish emas, tahdid ovi uchun "signal" sifatida saqlash |
| **Risk-based alerting** | Har bir kichik belgi foydalanuvchi yoki qurilmaga "risk ball" qo'shadi; ball chegaradan oshsagina ogohlantirish |

Oxirgi usul zamonaviy SOC'larda tobora ommalashmoqda: o'nta zaif signal birgalikda bitta kuchli ogohlantirishga aylanadi — va analitik yuzta kichik ogohlantirish o'rniga bitta mazmunlisini oladi.

:::key
**Har bir istisnoni hujumchi ko'zi bilan ko'ring.** Istisno qo'shishdan oldin so'rang: "Agar men hujumchi bo'lsam va bu istisnoni bilsam, undan qanday foydalanardim?" Javob oson bo'lsa — istisno juda keng. Va har bir istisnoni **kim, qachon, nega** qo'shganini yozib qo'ying: bir yildan keyin hech kim "nega bu server istisno qilingan?" degan savolga javob bera olmaydi.
:::

## Detection-as-code

Zamonaviy jamoalar qoidalarni dasturiy kod kabi boshqaradi:

- Qoidalar **Git** omborida saqlanadi (dasturlash bosqichidagi Git darsi) — har bir o'zgarish tarixi bor.
- Har bir yangi qoida yoki o'zgarish **ko'rib chiqiladi** (code review).
- Avtomatik **testlar**: qoida sintaksisi to'g'rimi, namuna hujum loglarida ishlaydimi, zararsiz loglarda jimmi.
- SIEM'ga **avtomatik joylanadi**.

Bu ish e'lonlarida "Detection Engineer" lavozimining asosiy talablaridan biri: Sigma, Git, Python va SIEM so'rov tili.

## Ogohlantirish ichida nima bo'lishi kerak

Yaxshi qoida faqat "nimadir bo'ldi" demaydi. Triage darsidagi analitikni eslang — unga nima kerak edi?

| Element | Misol |
|---|---|
| Aniq sarlavha | "Word'dan PowerShell ishga tushdi — WS-BUX-014" |
| Asosiy maydonlar | Foydalanuvchi, qurilma, ota-jarayon, buyruq satri, vaqt |
| Nega shubhali | Qoida tavsifi va ATT&CK texnikasi |
| Ma'lum false positive'lar | "Moliya bo'limidagi X plagini ham shunday qiladi" |
| Keyingi qadamlar | Playbook havolasi: nimani tekshirish, qachon eskalatsiya |
| Tayyor so'rovlar | "Shu qurilmaning ±15 daqiqalik faoliyati" havolasi |

Analitik ogohlantirishni ochganda kontekst yig'ishga 10 daqiqa sarflamasligi kerak — eng muhimi allaqachon oldida bo'lishi kerak.

## Amaliyot: qoidani sinash va sozlash

Yuqoridagi hayot siklini o'zingiz bosib o'ting: quyidagi labda uchta Sigma qoidasini `sigma check` bilan tekshirasiz, `sigma convert` bilan SPL va KQL'ga o'girasiz, SIEM'da sinaysiz, false positive'larni filtr bilan olib tashlaysiz va oxirida o'z qoidangizni yozasiz.

:::lab aniqlash-sigma

## Aniqlash qoidalari nimani qilmaydi

- **Ko'rinmas ma'lumotni ko'rmaydi** — log manbasi bo'lmasa, qoida ham yo'q.
- **Yangi usullarni o'zi o'rganmaydi** — qoidalar ma'lum xatti-harakatlarni qidiradi; noma'lumlari uchun tahdid ovi kerak (keyingi bosqich).
- **Abadiy ishlamaydi** — muhit va hujumchilar o'zgaradi; qoidalar muntazam qayta ko'rib chiqilishi kerak.
- **Ko'p qoida ≠ yaxshi himoya** — 1 000 ta shovqinli qoidadan 50 ta yaxshi sozlangan qoida yaxshiroq.

:::try
**1. Sigma o'qing.** SigmaHQ omboridan `rules/windows/process_creation/` papkasidagi istalgan 3 ta qoidani oching. Har biri uchun: nimani aniqlaydi? qaysi tanlovlar va condition? qanday false positive'lar ko'rsatilgan?

**2. O'zingiz yozing.** Windows darsidagi Event ID 1102 (Security jurnali tozalandi) uchun Sigma qoidasi yozing. Maslahat: `logsource` da `product: windows`, `service: security`; `detection` da `EventID: 1102`.

**3. Istisnoni baholang.** Quyidagi istisnolardan qaysi biri xavfli va nega?
- (a) `User: 'CORP\svc-sccm'` bo'lsa — e'tiborsiz qoldir.
- (b) `ParentImage: 'C:\Windows\CCM\CcmExec.exe'` VA `CommandLine|contains: '-File C:\Windows\CCM\SystemTemp\'` VA `User: 'NT AUTHORITY\SYSTEM'`.

**4. Aylantiring.** `sigma-cli` ni o'rnating va 2-mashqdagi qoidangizni Splunk yoki Elasticsearch so'roviga aylantiring.

*Javoblar: 2 — taxminan: `logsource: {product: windows, service: security}`, `detection: {selection: {EventID: 1102}, condition: selection}`, `level: high`, `tags: [attack.defense-evasion, attack.t1070.001]`. 3 — (a) xavfli: bitta hisob bo'yicha istisno — bu hisob buzilsa, uning barcha harakatlari ko'rinmaydi; (b) ancha yaxshi — uch shart birgalikda, takrorlash qiyin (lekin baribir hujjatlashtiring va vaqti-vaqti bilan qayta ko'rib chiqing).*
:::

## Xulosa

- Har bir qoida ikki xil xato qiladi: **false positive** (shovqin) va **false negative** (o'tkazib yuborish); vazifa — muvozanat.
- **Mustahkam** qoida xatti-harakatni qidiradi, artefaktni emas (xesh va nom — mo'rt).
- Hayot sikli: **gipoteza → ma'lumot bormi → yozish → sinash (simulyatsiya + tarixiy loglar) → sozlash → ishga tushirish → kuzatish**.
- **Sigma** — SIEM'ga bog'liq bo'lmagan YAML qoidalar: `logsource`, `detection` (tanlovlar, modifikatorlar, `condition`), `falsepositives`, `level`, ATT&CK `tags`; `sigma-cli` bilan aylantiriladi.
- Istisnolar — **tor va ko'p shartli**; har birini hujumchi ko'zi bilan baholang va hujjatlashtiring.
- **Detection-as-code**: Git, review, testlar, avtomatik joylash.
- Ogohlantirishda kontekst va playbook bo'lishi kerak.

:::quiz
? False negative nima?
- Zararsiz narsaga chiqqan ogohlantirish
+ Qoida haqiqiy hujumni aniqlamay o'tkazib yuborishi
- To'g'ri ishlagan qoida
- Sintaksis xatosi
! False positive — shovqin; false negative — o'tkazib yuborilgan hujum. Ikkinchisi odatda qimmatroq.

? Qaysi qoida eng mustahkam?
- Fayl xeshi ma'lum qiymatga teng bo'lsa
- Fayl nomi ma'lum nomga teng bo'lsa
+ Ofis dasturi buyruq qobig'ini ishga tushirsa
- Buyruq satrida aniq bitta so'z bo'lsa
! Xatti-harakatni aniqlaydigan qoidani aylanib o'tish uchun hujumchi butun usulini o'zgartirishi kerak.

? Qoida yozishdan oldin nimani tekshirish kerak?
- SIEM narxini
+ Kerakli xatti-harakat qaysi logda ko'rinishi va u log SIEM'ga kelayotganini
- Qoidaning nomi chiroyli ekanini
- Hech narsani
! Ma'lumot bo'lmasa, qoida hech qachon ishlamaydi — avval log manbasini ulash kerak.

? Sigma'ning asosiy afzalligi nima?
+ Qoida bir marta yoziladi va turli SIEM'larning so'rovlariga aylantiriladi
- U hujumlarni avtomatik bloklaydi
- U faqat Splunk'da ishlaydi
- U loglarni shifrlaydi
! Sigma — loglar uchun umumiy qoida formati; sigma-cli uni Splunk, Elastic va boshqa tillarga o'giradi.

? Sigma'da bitta tanlov ichida ikki xil maydon yozilsa, ular qanday birlashadi?
+ VA — ikkala shart ham bajarilishi kerak
- YOKI — birortasi yetarli
- Faqat birinchisi hisobga olinadi
- Xato beradi
! Turli maydonlar — VA; bitta maydon uchun qiymatlar ro'yxati — YOKI.

? Sigma'dagi ParentImage|endswith modifikatori nima qiladi?
- Maydon qiymati aniq teng bo'lishini talab qiladi
+ Maydon qiymati ko'rsatilgan matn bilan tugashini tekshiradi
- Maydonni o'chiradi
- Regex ishlatadi
! endswith — to'liq yo'l har xil bo'lsa ham, fayl nomi bo'yicha moslashtirish uchun qulay.

? Sigma pipeline nima uchun kerak?
- Qoidani tezlashtirish uchun
+ Sigma'dagi umumiy maydon nomlarini aniq SIEM'dagi haqiqiy maydon nomlariga moslash uchun
- Qoidani shifrlash uchun
- Qoidani o'chirish uchun
! Noto'g'ri maydon nomi bo'sh natija beradi, shuning uchun aylantirilgan so'rovni doim sinash kerak.

? Qaysi istisno eng xavfli?
- Aniq skript yo'li + aniq ota-jarayon + aniq server
+ C:\ProgramData\ papkasidagi hamma narsani e'tiborsiz qoldirish
- Imzolangan, ma'lum ishlab chiqaruvchi fayli + aniq buyruq satri
- Faqat bitta test VM'dagi aniq vazifa
! Keng istisno hujumchi uchun tayyor yashirinish joyi — u o'z faylini o'sha papkaga joylaydi.

? Qoidani sinashning ikki yo'nalishi qaysi?
+ Laboratoriyada hujumni simulyatsiya qilib, qoida ishlashini tekshirish
+ Tarixiy haqiqiy loglarda ishga tushirib, shovqin darajasini baholash
- Qoidani darhol barcha qurilmalarda yoqib, natijani kutish
- Faqat sintaksisni tekshirish
! Qoida hujumni ushlashi ham, kundalik ishda shovqin chiqarmasligi ham kerak.

? Risk-based alerting qanday ishlaydi?
- Har bir kichik belgi uchun darhol ogohlantirish chiqaradi
+ Kichik belgilar foydalanuvchi yoki qurilmaga risk ball qo'shadi; ball chegaradan oshganda bitta ogohlantirish chiqadi
- Barcha ogohlantirishlarni o'chiradi
- Faqat tunda ishlaydi
! Ko'p zaif signal birgalikda bitta mazmunli ogohlantirishga aylanadi va shovqin kamayadi.

? Detection-as-code nimani anglatadi?
- Qoidalarni qog'ozda saqlash
+ Qoidalarni Git'da saqlash, ko'rib chiqish, avtomatik test qilish va avtomatik joylash
- Faqat Python'da qoida yozish
- Qoidalarni hech qachon o'zgartirmaslik
! Dasturlash amaliyotlari qoidalar sifatini va o'zgarishlar tarixini ta'minlaydi.
:::

:::cards
False positive va false negative? :: FP — zararsiz narsaga ogohlantirish (shovqin); FN — haqiqiy hujumni o'tkazib yuborish.
Mustahkam qoida nima? :: Artefakt (xesh, nom) emas, xatti-harakatni (masalan, Word → PowerShell) aniqlaydigan, aylanib o'tish qiyin qoida.
Qoidaning hayot sikli? :: Gipoteza → ma'lumot bormi → yozish → sinash → sozlash → ishga tushirish → kuzatish va qayta ko'rib chiqish.
Qoidani qanday sinash kerak? :: Laboratoriyada hujum simulyatsiyasi (masalan, Atomic Red Team) va tarixiy loglarda shovqin darajasini tekshirish.
Sigma nima? :: SIEM'ga bog'liq bo'lmagan YAML formatidagi aniqlash qoidalari; sigma-cli bilan Splunk, Elastic va boshqalarga aylantiriladi.
Sigma qoidasining asosiy qismlari? :: title, id, status, tags (ATT&CK), logsource, detection (tanlovlar + condition), falsepositives, level.
Sigma tanlov mantiqi? :: Turli maydonlar — VA; bitta maydon uchun qiymatlar ro'yxati — YOKI.
Sigma modifikatorlari? :: endswith, startswith, contains, contains|all, re, cidr.
Sigma pipeline nima? :: Umumiy maydon nomlarini aniq SIEM maydonlariga moslaydigan qatlam.
To'g'ri istisno qanday bo'ladi? :: Tor va ko'p shartli: aniq yo'l + ota-jarayon + hisob + server; kim, qachon, nega qo'shgani yozilgan.
Risk-based alerting? :: Kichik belgilar risk ballini oshiradi; chegaradan oshganda bitta mazmunli ogohlantirish chiqadi.
Detection-as-code? :: Qoidalar Git'da, code review, avtomatik testlar va avtomatik joylash bilan boshqariladi.
:::
