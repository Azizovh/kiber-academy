Qaydnoma yaxshi rivojlanmoqda. Bir kuni katta mijoz — `mybank.uz` banki — uni xodimlarining ichki qaydlari uchun ishlatmoqchi bo'ladi. Shartnoma oldidan bankning xarid bo'limi ikki narsa yuboradi: 200 savollik xavfsizlik so'rovnomasi ("Ma'lumotlar saqlashda shifrlanganmi? Kirish huquqlari qanchalik tez-tez ko'rib chiqiladi? Jurnallar qancha saqlanadi?") va bitta qisqa savol: "Sizda SOC 2 hisoboti yoki ISO 27001 sertifikati bormi?"

Rahbar sizga qaraydi: "Sen xavfsizlik muhandisisan. Bunga javob berib, kerak bo'lsa tayyorgarlikni boshqarasan."

Ko'p muhandislar "compliance" so'zini eshitganda zerikadi: hujjatlar, jadvallar, auditorlar. Lekin amalda muvofiqlik **xavfsizlik byudjetining** katta qismini harakatga keltiradi, va har bir nazoratni oxir-oqibat muhandis amalga oshiradi va **isbotlaydi**. Bu dars sizni GRC mutaxassisi qilmaydi (bu alohida kasb — Karyera bo'limidagi xaritani eslang), lekin bulut xavfsizligi muhandisi bilishi kerak bo'lgan narsalarni beradi: asosiy standartlar nimani talab qiladi, nazorat va dalil nima, va bularning hammasini bulutda qanday avtomatlashtirish mumkin.

## Asosiy tushunchalar

| Atama | Ma'nosi | Misol |
|---|---|---|
| **Qonun / regulyatsiya** | Majburiy, davlat talabi | Shaxsiy ma'lumotlar to'g'risidagi qonun, GDPR |
| **Standart / freymvork** | Ixtiyoriy (lekin shartnoma yoki bozor talab qilishi mumkin) | ISO 27001, SOC 2, NIST CSF |
| **Shartnoma talabi** | Mijoz yoki hamkor talabi | Karta tizimlari talab qiladigan PCI DSS |
| **Nazorat (control)** | Xavfni kamaytiradigan aniq chora | "Barcha admin hisoblarida MFA majburiy" |
| **Dalil (evidence)** | Nazorat haqiqatan ishlayotganining isboti | Siyosat eksporti + MFA'siz admin yo'qligini ko'rsatadigan hisobot |
| **Audit** | Mustaqil tekshiruv: nazoratlar bormi va ishlayaptimi | Tashqi auditor 3 kun hujjat va tizimlarni ko'radi |
| **Doira (scope)** | Audit qaysi tizimlar, jarayonlar, joylarni qamraydi | "Qaydnoma ishlab chiqarish muhiti va uni boshqaradigan jamoa" |
| **Gap analysis** | Hozirgi holat va talab o'rtasidagi farqni topish | "93 nazoratdan 61 tasi bor, 32 tasi yo'q yoki qisman" |

## Nazorat va dalil

Bu darsning eng muhim juftligi. Auditor sizning so'zingizga ishonmaydi — u **dalil** so'raydi. Va dalil bitta lahza emas, ko'pincha **vaqt davomida** ishlaganini ko'rsatishi kerak.

| Nazorat | Yaxshi dalil | Yomon dalil |
|---|---|---|
| Admin hisoblarida MFA majburiy | IdP'dagi Conditional Access siyosati eksporti + audit davridagi MFA'siz kirishlar yo'qligi haqida hisobot | "Ha, hammada MFA bor" degan email |
| Jurnallar 1 yil saqlanadi | CloudTrail S3 bucket'ining lifecycle sozlamasi + 11 oy oldingi jurnal faylining namunasi | Konsol skrinshoti, sanasiz |
| O'zgarishlar ko'rib chiqiladi | Branch himoyasi sozlamasi + audit davridan tasodifiy 25 ta PR, har birida tasdiq (a4, c3) | "Biz kod sharhi qilamiz" |
| Kirish huquqlari har chorakda ko'riladi | Har chorak uchun ro'yxat, kim ko'rgani, olib tashlangan huquqlar tiketlari | Bitta, bir yil oldingi jadval |
| Xodim ketganda kirish 24 soatda yopiladi | HR ro'yxati va hisob o'chirilgan vaqtlar solishtirmasi | Jarayon tavsifi, solishtirmasiz |
| Zaifliklar SLA bo'yicha tuzatiladi | Skaner hisobotlari + tuzatish vaqtlari, SLA buzilganlar va sabablari (a4) | "Biz Trivy ishlatamiz" |

Ko'rib turganingizdek, yaxshi dalil ko'pincha **tizimning o'zidan** keladi — sozlama eksporti, jurnal, tiket tarixi. Shuning uchun nazoratlarni kod va avtomatik jarayon sifatida qurgan jamoa (c3 — IaC, a4 — CI/CD) auditga ancha oson tayyorlanadi: dalil o'z-o'zidan yig'iladi.

Nazorat turlari ham bilish kerak (c2 CSPM darsidagi guardrails bilan bir xil mantiq):

| Turi | Maqsad | Misol |
|---|---|---|
| **Preventive** (oldini oluvchi) | Hodisa sodir bo'lishiga yo'l qo'ymaslik | SCP, MFA, branch himoyasi |
| **Detective** (aniqlovchi) | Sodir bo'lganini aniqlash | GuardDuty, Config qoidalari, jurnal monitoringi |
| **Corrective** (tuzatuvchi) | Zararni tuzatish | Zaxiradan tiklash, avtomatik remediation |

Va amalga oshirilish usuli bo'yicha: **texnik** (sozlamalar), **ma'muriy** (siyosatlar, o'qitish, jarayonlar), **fizik** (binolar, qulflar — bulutda asosan provayderda).

## Siyosat ierarxiyasi

Hujjatlarning ham tartibi bor — auditor ularni so'raydi:

```
 Siyosat (policy)        "NIMA va NEGA" — rahbariyat tasdiqlaydi
   │                     "Barcha maxfiy ma'lumotlar shifrlanadi."
   ▼
 Standart (standard)     "Aniq talablar"
   │                     "Saqlashda AES-256, uzatishda TLS 1.2+; kalitlar KMS'da."
   ▼
 Protsedura (procedure)  "QANDAY — qadamma-qadam"
                         "Yangi S3 bucket yaratishda: 1) Terraform moduli ... 2) ..."
```

Muhandis ko'pincha standart va protseduralarni yozadi yoki ularga hissa qo'shadi. Yaxshi protsedura — c4 IR darsidagi runbook kabi: aniq, sinalgan, eskirmagan.

## Asosiy standartlar

### ISO/IEC 27001

Xalqaro standart: **axborot xavfsizligini boshqarish tizimi** (ISMS) — tashkilot xavfsizlikni qanday boshqarishi: risklarni baholash, nazoratlarni tanlash, ularni ishlatish, o'lchash va yaxshilash.

- **Sertifikatlash**: akkreditatsiyalangan sertifikatlash organi audit o'tkazadi; sertifikat 3 yil amal qiladi, har yili kuzatuv auditi bilan.
- **Annex A** — nazoratlar ro'yxati. 2022-yilgi versiyada 93 ta nazorat to'rt mavzuga bo'lingan: tashkiliy, odamlar, fizik va texnologik.
- **Statement of Applicability (SoA)** — har bir Annex A nazorati qo'llanadimi, qanday amalga oshirilgan, qo'llanmasa — nega.
- Asosiy g'oya — **risk asosida**: hamma nazoratni ko'r-ko'rona emas, risk baholashiga mos tanlash.

### SOC 2

AQShda keng tarqalgan (va xalqaro SaaS bozorida ham talab qilinadigan) **attestatsiya hisoboti** — AICPA freymvorki asosida, mustaqil auditor (CPA firmasi) tomonidan.

- **Trust Services Criteria**: Security (majburiy), Availability, Processing Integrity, Confidentiality, Privacy — tashkilot qaysilarini doiraga kiritishini tanlaydi.
- **Type I** — nazoratlar **ma'lum bir sanada** to'g'ri loyihalanganmi.
- **Type II** — nazoratlar **davr davomida** (odatda 3–12 oy) haqiqatan ishlaganmi. Mijozlar odatda Type II'ni so'raydi — va aynan shu yerda "vaqt davomidagi dalil" muhim.
- Natija — sertifikat emas, **hisobot**: auditor fikri, nazoratlar tavsifi, sinov natijalari va istisnolar. Mijoz uni NDA ostida o'qiydi.

### PCI DSS

Karta ma'lumotlari (karta raqami va boshqalar) bilan ishlaydigan har bir tashkilot uchun to'lov kartalari sanoati standarti. 12 ta asosiy talab guruhi: tarmoq nazoratlari, xavfsiz sozlamalar, saqlangan karta ma'lumotini himoyalash, uzatishda shifrlash, zararli dasturdan himoya, xavfsiz dasturlash, kirishni cheklash, identifikatsiya va autentifikatsiya, fizik kirish, jurnallar va monitoring, muntazam sinov, siyosatlar.

Muhandis uchun eng muhim tushuncha — **doirani toraytirish**. Karta ma'lumoti tegadigan har bir tizim — audit doirasida. c1 bosqichidagi segmentatsiya darsini eslang: karta ma'lumotlari alohida segmentda bo'lsa, faqat o'sha segment audit qilinadi. Yana yaxshiroq — karta ma'lumotini umuman saqlamaslik (to'lov provayderining tokenizatsiyasi): saqlamagan narsangizni himoyalash shart emas.

### NIST Cybersecurity Framework (CSF)

AQSh NIST'ning ixtiyoriy freymvorki — xavfsizlik dasturini tashkil qilish va gapirish uchun **umumiy til**. 2.0 versiyasida oltita funksiya:

| Funksiya | Savol | Kursda |
|---|---|---|
| **Govern** | Xavfsizlik qanday boshqariladi: strategiya, rollar, siyosatlar, ta'minot zanjiri? | Shu dars, a3 |
| **Identify** | Bizda nima bor va qanday risklar? | c1 inventar, a3 tahdid modeli |
| **Protect** | Qanday himoyalaymiz? | c2 IAM, shifrlash, c3 konteynerlar |
| **Detect** | Hujumni qanday aniqlaymiz? | b-tarmoq, c2 monitoring |
| **Respond** | Qanday javob beramiz? | b3, c4 bulut IR |
| **Recover** | Qanday tiklanamiz? | c1–c2 zaxira, Object Lock |

NIST CSF sertifikatlanmaydi — u o'z-o'zini baholash va rahbariyat bilan gaplashish uchun xarita.

### CIS Controls

18 ta ustuvorlashtirilgan nazorat — "nimadan boshlash kerak?" degan savolga amaliy javob. Uchta amalga oshirish guruhi (IG1 — har bir tashkilot uchun minimal "kiber gigiyena", IG2, IG3 — yetukroq). c1–c3 darslaridagi CIS **Benchmarks** (aniq tizim sozlamalari) bilan adashtirmang: Controls — tashkilot darajasidagi dastur, Benchmarks — texnik sozlash qo'llanmasi.

### Jamlanma

| Standart | Turi | Kim uchun | Natija |
|---|---|---|---|
| ISO 27001 | Xalqaro standart | Har qanday tashkilot | Sertifikat |
| SOC 2 | Attestatsiya freymvorki | Xizmat ko'rsatuvchilar (SaaS) | Auditor hisoboti (Type I / II) |
| PCI DSS | Sanoat standarti | Karta ma'lumoti bilan ishlaydiganlar | Muvofiqlik hisoboti yoki o'z-o'zini baholash |
| NIST CSF | Ixtiyoriy freymvork | Har qanday tashkilot | O'z-o'zini baholash, profil |
| CIS Controls | Ustuvorlashtirilgan nazoratlar | Har qanday tashkilot | O'z-o'zini baholash |
| Shaxsiy ma'lumotlar qonunlari | Qonun | Shaxsiy ma'lumotga ishlov beruvchilar | Majburiy |

Standartlar bir-biriga ko'p jihatdan mos keladi: MFA, jurnallar, zaxira, kirishni ko'rib chiqish deyarli hammasida bor. Shuning uchun tashkilotlar **nazoratlarni bir marta** quradi va ularni bir nechta standartga "xaritalaydi".

## Bulutda muvofiqlik

**Umumiy javobgarlik — muvofiqlikda ham** (c1). Provayder o'z qismini isbotlaydi; siz — o'zingiznikini.

- **AWS Artifact** — AWS'ning o'z SOC 2 hisobotlari, ISO sertifikatlari va PCI hujjatlari. Auditor "ma'lumot markazi fizik xavfsizligi"ni so'raganda — dalil shu yerdan. Siz bu nazoratlarni provayderdan "meros" olasiz.
- Lekin c1 bosqichidagi ogohlantirish: provayder sertifikati **sizning** sozlamalaringizni qamramaydi.

Sizning qismingizni avtomatlashtirish vositalari:

| Vosita | Nima beradi |
|---|---|
| Security Hub standartlari | CIS, AWS FSBP, PCI DSS, NIST SP 800-53 bo'yicha doimiy tekshiruv (c2) |
| AWS Config + conformance packs | Standartga mos qoidalar to'plami va resurslar tarixi — vaqt davomidagi dalil |
| AWS Audit Manager | Nazoratlarni freymvorkka xaritalab, dalillarni (Config, CloudTrail, Security Hub) avtomatik yig'adi |
| IaC + policy as code | "Har bir bucket shifrlangan" — kodda va CI'da majburiy (c3) |
| Git tarixi va PR'lar | O'zgarishlarni boshqarish dalili |

Bu — **doimiy muvofiqlik** (continuous compliance): yilda bir marta auditdan oldin shoshilinch dalil yig'ish o'rniga, nazoratlar har kuni avtomatik tekshiriladi va dalil o'z-o'zidan to'planadi.

## Muvofiqlik ≠ xavfsizlik

:::warn
Tarixda yirik ma'lumot sizib chiqishlarining bir qismi buzilish paytida **amaldagi** muvofiqlik sertifikati yoki hisobotiga ega bo'lgan tashkilotlarda sodir bo'lgan. Audit — bir lahzaning yoki cheklangan davrning tanlab olingan tekshiruvi; u har bir tizimni, har kuni ko'rmaydi. "Biz muvofiqmiz" — "biz xavfsizmiz" degani emas.
:::

| Belgi bo'yicha muvofiqlik (checkbox) | Haqiqiy xavfsizlik |
|---|---|
| "Zaiflik skaneri bor" | Topilmalar saralanadi va SLA bo'yicha tuzatiladi |
| "Jurnallar yig'iladi" | Kimdir ularni o'qiydi va signallarga javob beradi |
| "IR rejasi bor" | Reja yiliga kamida bir marta mashqda sinalgan |
| "Yillik xavfsizlik treningi o'tkazildi" | Fishing simulyatsiyalari natijasi yaxshilanmoqda |

To'g'ri yo'nalish: **xavfsizlik muvofiqlikni harakatga keltiradi**, aksincha emas. Yaxshi qurilgan xavfsizlik dasturi auditdan deyarli tabiiy o'tadi; faqat audit uchun qurilgan "xavfsizlik" esa birinchi haqiqiy hujumda qulaydi.

## Muhandisning auditdagi roli

- **Nazorat matnini tushunish.** "Kirish eng kam imtiyoz asosida beriladi" — sizning tizimingizda bu aniq nimani anglatadi? (c2 IAM, c3 RBAC.)
- **Nazoratni kod sifatida qurish.** Qo'lda sozlangan narsa suriladi; koddagi narsa isbotlanadi.
- **Dalilni avtomatlashtirish.** Skrinshot emas — eksport, hisobot, jurnal.
- **Auditorga halol javob berish.** Bilmasangiz — "tekshirib, javob beraman". Mavjud bo'lmagan nazoratni "bor" deyish — eng yomon xato: auditor buni topadi va qolgan hamma narsaga ishonch yo'qoladi.
- **So'rovnomalarga javob.** Dars boshidagi 200 savol — har biriga aniq, tekshiriladigan javob. Tez-tez uchraydigan javoblar uchun "ishonch markazi" hujjati (trust center) yoki tayyor javoblar bazasi.
- **Istisnolarni boshqarish.** Har bir nazoratni bajarib bo'lmaydi; qabul qilingan risk — sababi, egasi va muddati bilan (c2 CSPM darsidagi istisnolar kabi).

## Muvofiqlik nimani qilmaydi

- Xavfsizlikni kafolatlamaydi — u minimal darajani va tartibni ta'minlaydi.
- Sizning tizimingizga mos riskni o'zi aniqlamaydi: standart umumiy, sizning tahdid modelingiz (a3) — xususiy.
- Bir martalik emas: sertifikat olingan kun — boshlanish. Type II va kuzatuv auditlari nazoratlarning doimiy ishlashini talab qiladi.
- Huquqiy maslahat emas: qonunlar talablari bo'yicha qarorlar huquqshunos bilan qabul qilinadi.

:::try
1. Dars boshidagi bank so'rovnomasidan beshta savolni tasavvur qiling (shifrlash, kirish, jurnallar, zaxira, insident). Har biriga Qaydnoma'ning c1–c4 bosqichlarida qurilgan infratuzilmasi asosida javob yozing va har bir javob uchun qanday **dalil** ko'rsatishingizni belgilang.
2. Quyidagi nazoratlarni preventive, detective yoki corrective'ga ajrating: SCP bilan regionlarni taqiqlash; GuardDuty; AWS Backup'dan tiklash; branch himoyasi; Config qoidasi `restricted-ssh`; Object Lock.
3. NIST CSF'ning oltita funksiyasining har biri uchun kursdan bitta darsni va undagi bitta aniq nazoratni yozing.
4. O'quv hisobingizda Security Hub'da "CIS AWS Foundations Benchmark" standartini yoqing. Natija foizi qancha va eng ko'p muvaffaqiyatsiz nazoratlar qaysi bo'limda?
5. Savol: startap SOC 2 Type I hisobotini oldi va bank Type II so'rayapti. Farq nimada va nega bank Type II so'raydi?

**Javoblar:**
1. Misol: "Ma'lumot saqlashda shifrlanganmi?" — Ha: RDS va S3 customer managed KMS kaliti bilan (c2). Dalil: Terraform kodi, Config `rds-storage-encrypted` va S3 shifrlash qoidalari natijasi audit davri uchun. "Jurnallar qancha saqlanadi?" — CloudTrail organization trail, log hisobida, 1 yil, validation bilan. Dalil: lifecycle sozlamasi, eng eski jurnal namunasi, `validate-logs` natijasi. "Insidentga javob rejasi bormi?" — Ha, runbook'lar (c4) va oxirgi mashq hisoboti.
2. Preventive: SCP, branch himoyasi, Object Lock (o'chirishni oldini oladi). Detective: GuardDuty, Config `restricted-ssh`. Corrective: zaxiradan tiklash. (Object Lock'ni corrective imkoniyatini ta'minlovchi deb ham asoslash mumkin — muhimi, mantiqni tushuntira olish.)
3. Misol: Govern — shu dars (siyosat ierarxiyasi); Identify — c1 teglar va inventar; Protect — c2 IAM eng kam imtiyoz; Detect — c2 GuardDuty; Respond — c4 kalit sizib chiqishi runbook'i; Recover — c2 boshqa hisobdagi Object Lock'li zaxira.
4. Yangi o'quv hisobida natija odatda past–o'rta bo'ladi; ko'p muvaffaqiyatsizliklar Monitoring (CloudWatch signallari) va Logging bo'limlarida.
5. Type I — nazoratlar bitta sanada to'g'ri loyihalangan. Type II — ular davr davomida (masalan, 6 oy) haqiqatan ishlaganini tanlab olingan dalillar bilan isbotlaydi. Bank uchun qog'ozdagi nazorat emas, ishlaydigan nazorat muhim.
:::

## Xulosa

- Muvofiqlik xavfsizlik byudjetini harakatga keltiradi; nazoratlarni muhandis quradi va isbotlaydi.
- Nazorat — xavfni kamaytiradigan chora; dalil — uning haqiqatan, ko'pincha vaqt davomida ishlaganining isboti. Yaxshi dalil tizimning o'zidan keladi.
- Nazorat turlari: preventive, detective, corrective; texnik, ma'muriy, fizik. Hujjatlar: siyosat → standart → protsedura.
- ISO 27001 — ISMS va sertifikat, Annex A, risk asosida; SOC 2 — Type I va Type II attestatsiya hisoboti; PCI DSS — karta ma'lumoti, segmentatsiya bilan doirani toraytirish; NIST CSF 2.0 — Govern, Identify, Protect, Detect, Respond, Recover; CIS Controls — 18 ustuvor nazorat.
- Bulutda: provayder o'z qismini (AWS Artifact) isbotlaydi; o'z qismingizni Security Hub, Config, Audit Manager, IaC va policy as code bilan doimiy avtomatlashtiring.
- Muvofiqlik ≠ xavfsizlik. Xavfsizlik muvofiqlikni harakatga keltirsin.

:::quiz
? Nazorat (control) va dalil (evidence) farqi nima?
+ Nazorat — xavfni kamaytiradigan chora; dalil — u haqiqatan ishlayotganining isboti
- Ular bir xil narsa
- Dalil — siyosat, nazorat — auditor
- Nazorat faqat fizik bo'ladi
! Auditor so'zga emas, dalilga ishonadi: sozlama eksporti, jurnallar, tiketlar.

? "Jurnallar 1 yil saqlanadi" nazorati uchun eng yaxshi dalil qaysi?
- "Ha, saqlanadi" degan email
- Sanasiz konsol skrinshoti
+ CloudTrail bucket'ining lifecycle sozlamasi va taxminan bir yil oldingi jurnal faylining namunasi
- Jamoa a'zosining og'zaki tasdig'i
! Dalil tekshiriladigan va vaqt davomidagi ishlashni ko'rsatadigan bo'lishi kerak.

? SOC 2 Type I va Type II farqi nimada?
- Type I faqat Yevropa uchun
+ Type I — nazoratlar bitta sanada to'g'ri loyihalanganmi; Type II — ular davr davomida haqiqatan ishlaganmi
- Type II — sertifikat, Type I — hisobot
- Farqi yo'q
! Mijozlar odatda Type II so'raydi — ishlaydigan nazoratni ko'rish uchun.

? ISO 27001'ning asosiy g'oyasi qaysi?
+ Axborot xavfsizligini boshqarish tizimi (ISMS): risklarni baholab, mos nazoratlarni tanlash, ishlatish va yaxshilash
- Faqat parol siyosati
- Faqat karta ma'lumotlarini himoyalash
- Faqat AQSh davlat idoralari uchun
! Annex A nazoratlari risk baholashiga ko'ra tanlanadi; SoA har birining holatini tushuntiradi.

? PCI DSS doirasini toraytirishning eng samarali usuli qaysi?
- Barcha serverlarni bitta tarmoqqa qo'yish
+ Karta ma'lumotlarini alohida segmentga ajratish yoki umuman saqlamaslik (tokenizatsiya)
- Auditordan so'ramaslik
- Ma'lumotni Base64 bilan kodlash
! Karta ma'lumoti tegmaydigan tizimlar audit doirasidan chiqadi.

? NIST CSF 2.0 da qaysi funksiya yangi qo'shilgan va boshqaruvni (strategiya, rollar, siyosatlar) qamraydi?
- Detect
- Recover
+ Govern
- Protect
! CSF 2.0: Govern, Identify, Protect, Detect, Respond, Recover.

? AWS Artifact nima beradi?
- Sizning hisobingiz sozlamalari auditini
+ AWS'ning o'z muvofiqlik hujjatlarini (SOC 2 hisobotlari, ISO sertifikatlari) — provayder qismining dalili
- Bepul ISO 27001 sertifikatini
- Zaiflik skanerini
! Provayder qismini meros olasiz; o'z qismingizni alohida isbotlaysiz.

? Qaysi nazorat detective (aniqlovchi) turiga kiradi?
- SCP bilan regionlarni taqiqlash
- Branch himoyasi
+ Config qoidasi `restricted-ssh` va GuardDuty
- Zaxiradan tiklash
! Detective nazorat hodisa sodir bo'lgach uni aniqlaydi.

? "Biz ISO 27001 sertifikatiga egamiz, demak buzilmaymiz." To'g'rimi?
- Ha, sertifikat kafolat beradi
+ Yo'q — audit tanlab olingan tekshiruv; sertifikat minimal tartibni ko'rsatadi, xavfsizlikni kafolatlamaydi
- Faqat bulutda to'g'ri
- Faqat SOC 2 bilan birga to'g'ri
! Muvofiqlik ≠ xavfsizlik.

? Auditor siz bilmagan nazorat haqida so'radi. To'g'ri javob?
- "Ha, bor" deb javob berish, keyin tuzatish
+ "Tekshirib, aniq javob beraman" deyish va haqiqiy holatni bilib, halol javob berish
- Savolni e'tiborsiz qoldirish
- Auditorni almashtirishni so'rash
! Mavjud bo'lmagan nazoratni "bor" deyish butun auditga ishonchni yo'qotadi.
:::

:::cards
Compliance :: Qonun, standart yoki shartnoma talablarini bajarish va buni dalil bilan ko'rsatish
Nazorat (control) :: Xavfni kamaytiradigan aniq chora
Dalil (evidence) :: Nazorat ishlayotganining tekshiriladigan isboti
Preventive / detective / corrective :: Oldini oluvchi / aniqlovchi / tuzatuvchi nazorat
Siyosat → standart → protsedura :: Nima va nega → aniq talablar → qadamma-qadam qanday
ISO 27001 :: ISMS standarti; sertifikat; Annex A nazoratlari; risk asosida
Statement of Applicability :: Har bir Annex A nazorati qo'llanishi va qanday bajarilishi hujjati
SOC 2 Type II :: Nazoratlar davr davomida ishlaganini tasdiqlovchi auditor hisoboti
PCI DSS :: Karta ma'lumotlari uchun standart; segmentatsiya doirani toraytiradi
NIST CSF 2.0 :: Govern, Identify, Protect, Detect, Respond, Recover
AWS Artifact :: AWS'ning o'z muvofiqlik hisobotlari va sertifikatlari
Continuous compliance :: Nazoratlarni har kuni avtomatik tekshirish va dalilni avtomatik yig'ish
:::
