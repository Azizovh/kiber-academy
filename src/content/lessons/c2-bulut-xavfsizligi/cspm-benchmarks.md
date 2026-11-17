Birinchi ish haftangiz. Rahbar aytadi: "Bizning AWS hisoblarimizni tekshirib chiq, qanchalik yomon ekanini bilaylik." Hisoblarda — 17 regionda tarqalgan 40 ta bucket, 120 ta security group, 300 dan ortiq IAM rol va hech kim to'liq eslay olmaydigan Lambda funksiyalari.

Oldingi darslardagi har bir tekshiruvni (`describe-security-groups`, `get-public-access-block`, credential report…) qo'lda bajarsangiz — bir hafta. Ertaga esa kimdir yangi bucket yaratadi va hisobot eskiradi.

Siz avtomatik vositani ishga tushirasiz. 20 daqiqadan keyin hisobot tayyor: **1 847 ta muvaffaqiyatsiz tekshiruv**. Endi haqiqiy savol: bularning qaysi biri bilan dushanba kuni boshlaysiz?

Bu dars — bulut akkauntini avtomatik audit qilish ([[cspm|CSPM]]), CIS Benchmark kabi standartlar va eng muhimi — topilmalar tog'idan **amaliy tuzatish rejasi** chiqarish.

## CSPM nima

**Cloud Security Posture Management** — bulut hisobidagi sozlamalarni ma'lum qoidalar to'plami bilan avtomatik va muntazam solishtirish:

```
 Bulut API ──▶ [CSPM vositasi] ──▶ har bir resurs × har bir qoida ──▶ PASS / FAIL
  (faqat o'qish)   qoidalar to'plami:                                    │
                   CIS, AWS FSBP, PCI DSS...                             ▼
                                                              hisobot, trend, xabar
```

| Vosita | Turi | Xususiyati |
|---|---|---|
| **Prowler** | Ochiq manbali CLI | AWS, Azure, GCP, Kubernetes; yuzlab tekshiruv; ko'plab muvofiqlik freymvorklari |
| **ScoutSuite** | Ochiq manbali | Ko'p bulutli, HTML hisobot |
| **AWS Security Hub** | Natural xizmat | Config asosida doimiy tekshiruv, CIS va AWS FSBP standartlari |
| **Microsoft Defender for Cloud** | Natural (Azure) | Secure score, ko'p bulutli |
| Tijorat CNAPP platformalari | Tijorat | CSPM + zaiflik + identifikatsiya + "hujum yo'li" tahlili |

Hammasi bir xil g'oyada ishlaydi: bulut API'sidan **faqat o'qish** huquqi bilan konfiguratsiyani olib, qoidalarga solishtirish.

## CIS AWS Foundations Benchmark

[[cis|CIS]] Benchmarks — c1 bosqichidan tanish (server uchun). AWS uchun ham bor: hisobning eng muhim xavfsizlik sozlamalari ro'yxati, har biri uchun "nimani tekshirish" va "qanday tuzatish" bilan.

| Bo'lim | Misol tavsiyalar | Qaysi darsimiz |
|---|---|---|
| Identity and Access Management | Root'da MFA, root access key yo'q, eski kalitlar almashtirilgan, siyosatlar guruh yoki rollarga biriktirilgan | IAM chuqur |
| Storage | S3 Block Public Access, faqat HTTPS, EBS shifrlash sukut bo'yicha, RDS shifrlangan va ommaviy emas | Ma'lumot himoyasi |
| Logging | CloudTrail barcha regionlarda, log file validation, KMS, Config yoqilgan, VPC Flow Logs | Monitoring |
| Monitoring | Root ishlatilishi, MFA'siz kirish, IAM va CloudTrail o'zgarishlari haqida signallar | Monitoring |
| Networking | 22 va 3389 `0.0.0.0/0` dan ochiq emas, default security group trafikni cheklaydi, IMDSv2 | Tarmoq, misconfig |

Ko'rib turganingizdek, c2 bosqichining deyarli har bir darsi CIS ro'yxatidagi bir nechta qatorga to'g'ri keladi. Benchmark — yangi bilim emas, **o'rgangan narsangizni tekshiriladigan ro'yxatga** aylantirish.

Ikki daraja:

- **Level 1** — asosiy, ishlashga deyarli ta'sir qilmaydigan sozlamalar. Har bir hisob uchun.
- **Level 2** — chuqurroq himoya, ba'zan qulaylik yoki xarajat hisobiga. Yuqori talabli muhitlar uchun.

Benchmark versiyalari muntazam yangilanadi — tekshiruvni har doim joriy versiya bo'yicha olib boring va hisobotda qaysi versiya ishlatilganini yozing.

## Prowler bilan audit

**Audit uchun alohida rol.** Auditor ham eng kam imtiyoz tamoyiliga bo'ysunadi. Prowler hujjatlari AWS'ning ikki tayyor siyosatini tavsiya qiladi — `SecurityAudit` va `ViewOnlyAccess` (va bir nechta qo'shimcha o'qish ruxsatlari). Ular hech narsani **o'zgartira olmaydi**. Kirish — vaqtinchalik kalitlar bilan (rol yoki Identity Center).

:::warn
Faqat o'qish huquqi ham sezgir: auditor rolini kiygan kishi butun hisob arxitekturasini, barcha siyosatlarni va resurs nomlarini ko'radi — bu hujumchi uchun xarita. Audit rolini kim kiya olishini cheklang va uni ishlatish CloudTrail'da kuzatilsin. Va audit faqat sizga **ruxsat berilgan** hisoblarda o'tkaziladi.
:::

```bash
pip install prowler          # yoki rasmiy Docker image
prowler --version

# Butun hisob, barcha regionlar
prowler aws --profile audit

# Faqat bitta freymvork bo'yicha (nomlar ro'yxati: --list-compliance)
prowler aws --profile audit --list-compliance
prowler aws --profile audit --compliance <cis-freymvork-nomi>

# Faqat muvaffaqiyatsiz va yuqori darajadagilar, CSV va HTML hisobot bilan
prowler aws --profile audit --status FAIL --severity critical high \
  --output-formats csv html
```

(Flag nomlari Prowler versiyalari orasida o'zgarishi mumkin — `prowler aws --help` ni tekshiring.)

Hisobotdagi har bir qator taxminan shunday:

| Status | Severity | Check | Resurs | Region |
|---|---|---|---|---|
| FAIL | critical | Root hisobda MFA yoqilmagan | root | global |
| FAIL | high | S3 bucket ommaviy o'qishga ochiq | `old-marketing-2019` | eu-central-1 |
| FAIL | high | Security group 22-portni `0.0.0.0/0` ga ochgan | `sg-0a1b` (`legacy-bastion`) | us-east-1 |
| FAIL | high | EC2 IMDSv1 ruxsat etilgan | 37 ta instans | turli |
| FAIL | medium | CloudTrail log file validation o'chiq | `main-trail` | global |
| FAIL | medium | IAM user kaliti 90 kundan eski | `ci-deploy` | global |
| FAIL | low | S3 bucket'da server access logging yo'q | 39 ta bucket | turli |
| FAIL | low | VPC Flow Logs yoqilmagan | 17 ta VPC | turli |

## Saralash: severity ≠ risk

Vosita bergan **severity** — qoidaning umumiy og'irligi. Sizga kerak bo'lgani — **risk**: shu hisobda, shu resurs uchun, haqiqiy kontekstda. a4 bosqichidagi zaiflik boshqaruvi darsidagi fikr bu yerda ham ishlaydi.

Har bir topilma uchun to'rt savol:

| Savol | Riskni oshiradi |
|---|---|
| Internetdan yetib bo'ladimi? | Ommaviy IP, ommaviy siyosat, `0.0.0.0/0` |
| Qanday ma'lumot yoki huquq bor? | Mijoz ma'lumotlari, admin huquqli rol |
| Muhit qaysi? | Ishlab chiqarish > test > sandbox |
| Boshqa topilmalar bilan zanjir hosil qiladimi? | Ochiq port + IMDSv1 + keng rol = dars boshidagi bank zanjiri |

Yuqoridagi jadvalga qo'llaymiz:

| # | Topilma | Kontekst | Ustuvorlik |
|---|---|---|---|
| 1 | Root'da MFA yo'q | Butun hisob | **Bugun** |
| 2 | `old-marketing-2019` ommaviy | Ichida — eski mijozlar eksporti (Macie tasdiqladi) | **Bugun**, insident sifatida baholash |
| 3 | `legacy-bastion` 22-port | us-east-1 — kompaniya bu regionni ishlatmaydi deb o'ylardi; server 2 yildan beri yangilanmagan | **Bugun** — va nega u yerda ekanini tekshirish |
| 4 | `ci-deploy` eski kaliti | Kalitda `AdministratorAccess` | **Shu hafta** — OIDC'ga ko'chirish |
| 5 | 37 serverda IMDSv1 | 3 tasi ommaviy va URL qabul qiladigan ilova bilan | Ommaviy 3 tasi — **shu hafta**; qolgani — reja bilan |
| 6 | Log file validation | Muhim, lekin hozir hujum yo'li emas | Shu oy |
| 7 | Flow Logs yo'q | Tergov qobiliyati yo'q | Shu oy |
| 8 | 39 bucket'da access logging | Ko'pchiligi ichki | Reja bo'yicha |

E'tibor bering: 3-qator vositada "high", lekin kontekst bilan kritik — ishlatilmaydigan regiondagi unutilgan server (c1 bosqichidagi ogohlantirish). 5-qatordagi 37 ta topilma esa bir xil emas: ommaviy uchtasi — boshqa toifa.

:::key
CSPM hisobotidagi raqam (1 847) — hisob qanchalik xavfli ekanining o'lchovi emas. Ko'pincha topilmalarning katta qismi bir nechta **ildiz sababga** borib taqaladi, va eng xavflilari ro'yxat boshida emas, kontekstda yashiringan. Muhandisning qiymati — vositani ishga tushirishda emas, natijani saralashda.
:::

## Ildiz sabab bo'yicha guruhlash

1 847 topilmani 1 847 ta tiket qilib ochmang. Guruhlang:

| Ildiz sabab | Topilmalar | Bitta tuzatish |
|---|---|---|
| Hisob darajasida Block Public Access o'chiq | 12 ta bucket | Hisob darajasida yoqish (avval ommaviy fayllarni CloudFront'ga ko'chirib) |
| IMDS sukut sozlamasi yo'q | 37 ta server | Hisob sukut sozlamasi + launch template'lar + eski serverlarni almashtirish |
| Organization trail yo'q | Har bir hisobda 5–6 tadan | Bitta organization trail |
| Flow Logs IaC shablonida yo'q | 17 VPC | Terraform moduliga qo'shish (c3) |

Ildiz sababni tuzatish nafaqat hozirgi topilmalarni yopadi, balki **yangilarining paydo bo'lishini** to'xtatadi.

## Istisnolar va qabul qilingan risk

Ba'zi topilmalar haqiqatan muammo emas:

- Sayt rasmlari uchun bucket ommaviy bo'lishi kerak (garchi CloudFront yaxshiroq bo'lsa ham).
- Sandbox hisobida Flow Logs ataylab o'chiq — xarajat uchun.

Ular uchun **istisno** yoziladi — lekin qoidalar bilan:

| Maydon | Misol |
|---|---|
| Topilma va resurs | S3 ommaviy — `qaydnoma-public-assets` |
| Sabab | Faqat sayt logotiplari, maxfiy ma'lumot yo'q (Macie skan sanasi bilan) |
| Kim qabul qildi | Mahsulot egasi + xavfsizlik |
| Muddati | 6 oy — keyin qayta ko'rib chiqiladi |

Prowler'da buning uchun **mutelist** fayli bor: aniq tekshiruv + aniq resurs + izoh. Muddatsiz va keng istisnolar — GuardDuty'dagi keng bostirish qoidasi kabi xavfli.

## Tuzatish rejasi

Natija — rahbar va jamoalar uchun tushunarli hujjat:

| # | Topilma (guruh) | Risk | Egasi | Chora | Muddat | Tekshirish |
|---|---|---|---|---|---|---|
| 1 | Root MFA | Kritik | Platforma jamoasi | Apparat kalit, seyfda | Bugun | Prowler qayta skan |
| 2 | Ommaviy eksport bucket | Kritik | Marketing + xavfsizlik | Yopish, tergov, kerak bo'lsa xabardor qilish | Bugun | `get-bucket-policy-status` |
| 3 | `legacy-bastion` | Kritik | Infratuzilma | Snapshot (dalil), o'chirish, regionni SCP bilan taqiqlash | Bugun | Inventar |
| 4 | `ci-deploy` kaliti | Yuqori | DevOps | OIDC rol, kalitni o'chirish | 7 kun | Credential report |
| 5 | IMDSv1 | Yuqori / o'rta | Ilova jamoalari | Sukut sozlama, metrikaga qarab majburiy | 7 / 30 kun | `describe-instances` |

Muddatlar (SLA) — tashkilot siyosatidan, odatda severity bo'yicha (a4 bosqichi). "Tekshirish" ustuni muhim: tuzatildi deb **ishonmang** — qayta skan bilan isbotlang.

## Takrorlanmasligi uchun

Tuzatish — bir martalik. Takrorlanishni to'xtatish uchun "to'siqlar" (guardrails) kerak:

| Qatlam | Misol |
|---|---|
| **Oldini olish** (preventive) | SCP: ishlatilmaydigan regionlar taqiqlangan, Block Public Access'ni o'chirish taqiqlangan; IMDSv2'siz server yaratish rad etiladi |
| **Aniqlash** (detective) | Security Hub / Config doimiy tekshiruv, yangi FAIL haqida xabar |
| **Tuzatish** (corrective) | Ba'zi qoidalar uchun avtomatik remediation |
| **Chapga siljitish** (shift left) | Terraform kodini joylashdan **oldin** skanerlash (c3 bosqichidagi IaC skanerlash) |

Eng arzon xato — hech qachon ishlab chiqarishga yetib bormagan xato.

**O'lchovlar** rahbariyat uchun: kritik va yuqori topilmalar soni vaqt bo'yicha (trend), o'rtacha tuzatish vaqti (MTTR), istisnolar soni. Bitta hisobotdagi raqam emas — **yo'nalish** muhim.

## CSPM nimani qilmaydi

- Faqat **konfiguratsiyani** ko'radi: server ichidagi zararli jarayonni, ilovadagi SQL injection'ni, buzilgan foydalanuvchi qilayotgan ishlarni — yo'q. Buning uchun monitoring, EDR va AppSec kerak.
- Faqat ma'lum qoidalarni tekshiradi. Yashil hisobot — "xavfsiz" degani emas, "shu ro'yxatdagi xatolar yo'q" degani.
- Kontekstni bilmaydi: qaysi bucket'da nima borligini, qaysi server muhimligini — buni siz qo'shasiz.
- Muvofiqlik hisobotidagi "CIS 92%" — auditor uchun foydali, lekin hujumchi qolgan 8% ni tanlaydi.

:::try
1. O'quv hisobingizda audit rolini yarating (`SecurityAudit` + `ViewOnlyAccess`) va Prowler'ni shu rol bilan ishga tushiring.
2. Natijadan faqat FAIL'larni oling. Ularni ildiz sabab bo'yicha guruhlang — nechta guruh chiqdi?
3. Eng muhim 5 ta topilma uchun "to'rt savol" bo'yicha riskni baholang va tuzatish rejasi jadvalini to'ldiring.
4. 2 tasini tuzating va Prowler'ni qayta ishga tushirib, PASS bo'lganini tasdiqlang.
5. Savol: hisobotda "CIS: 95% PASS". Rahbar: "Demak biz xavfsizmiz." Nima deysiz?

**Javoblar:**
1. Agar ba'zi tekshiruvlar "AccessDenied" bilan o'tkazib yuborilsa — Prowler hujjatlaridagi qo'shimcha o'qish ruxsatlarini qo'shing.
2. Yangi o'quv hisobida odatda bir necha o'nlab FAIL va 5–10 guruh: root MFA, CloudTrail sozlamalari, Flow Logs, default security group, IAM parol siyosati, Config yoqilmagan va hokazo.
3. O'quv hisobida deyarli hech narsa internetga ochiq emas — shuning uchun root MFA va CloudTrail kabi hisob darajasidagi narsalar birinchi o'ringa chiqadi.
4. Qayta skanda ayni tekshiruv PASS bo'lishi kerak. Bo'lmasa — tuzatish noto'g'ri regionda yoki noto'g'ri resursda qilingan bo'lishi mumkin.
5. 95% faqat ro'yxatdagi sozlamalar haqida. Qolgan 5% ichida ommaviy bucket yoki ochiq port bo'lishi mumkin; ilova zaifliklari, o'g'irlangan kalitlar va ichki tahdidlar CIS'ga umuman kirmaydi. Savol — "qaysi 5% va ularning konteksti qanday?"
:::

## Xulosa

- CSPM bulut sozlamalarini qoidalar to'plami bilan faqat o'qish huquqi orqali avtomatik solishtiradi: Prowler, ScoutSuite, Security Hub, Defender for Cloud.
- CIS AWS Foundations Benchmark: IAM, Storage, Logging, Monitoring, Networking; Level 1 va Level 2. Bu bosqichdagi darslarning tekshiriladigan ro'yxati.
- Audit roli — faqat o'qish, vaqtinchalik kalitlar; u ham sezgir.
- Severity ≠ risk: internetga ochiqlik, ma'lumot va huquqlar, muhit, zanjirlar.
- Topilmalarni ildiz sabab bo'yicha guruhlang; istisnolar — sabab, egasi va muddati bilan.
- Tuzatish rejasi: egasi, muddati va qayta skan bilan tekshirish.
- Takrorlanmasligi uchun: SCP (oldini olish), doimiy tekshiruv (aniqlash), IaC skanerlash (chapga siljitish).
- CSPM konfiguratsiyani ko'radi, xatti-harakatni va ilovani emas; yashil hisobot — xavfsizlik kafolati emas.

:::quiz
? CSPM vositasi asosan nimani tekshiradi?
- Server ichidagi jarayonlarni
- Ilova kodidagi zaifliklarni
+ Bulut resurslari konfiguratsiyasini qoidalar to'plamiga solishtiradi
- Foydalanuvchilar parollarini
! CSPM — sozlamalar auditi; ish vaqtidagi xatti-harakat va ilova boshqa vositalarning ishi.

? Prowler uchun audit roliga qanday ruxsatlar beriladi?
- AdministratorAccess
+ Faqat o'qish uchun — masalan, SecurityAudit va ViewOnlyAccess
- Root foydalanuvchi kalitlari
- S3 uchun to'liq ruxsat
! Auditor ham eng kam imtiyoz bilan ishlaydi; u hech narsani o'zgartirmasligi kerak.

? CIS Benchmark'dagi Level 1 va Level 2 farqi nimada?
+ Level 1 — asosiy, ishlashga deyarli ta'sir qilmaydigan; Level 2 — chuqurroq, ba'zan qulaylik yoki xarajat hisobiga
- Level 1 faqat Azure uchun
- Level 2 faqat test muhitlari uchun
- Farqi yo'q
! Har bir hisob kamida Level 1 ni bajarishi kerak; Level 2 — yuqori talabli muhitlar uchun.

? Vosita "high" deb belgilagan topilma kontekst bilan kritik bo'lishi mumkinmi?
+ Ha — masalan, ishlatilmaydigan regiondagi yangilanmagan, 22-porti ochiq unutilgan server
- Yo'q, vosita severity'si har doim yakuniy
- Faqat medium topilmalar o'zgaradi
- Faqat Azure'da
! Risk kontekstga bog'liq: internetga ochiqlik, ma'lumot, muhit va zanjirlar.

? 37 serverda IMDSv1 topildi. To'g'ri yondashuv qaysi?
- 37 ta alohida tiket ochib, hammasini bir xil muddat bilan tuzatish
+ Ommaviy va URL qabul qiladigan serverlarni birinchi tuzatish, keyin ildiz sababni (sukut sozlama, shablonlar) yopish
- Topilmani e'tiborsiz qoldirish
- Barcha serverlarni darhol o'chirish
! Bir xil topilmalar ichida ham risk farq qiladi; ildiz sabab tuzatilsa, yangilari paydo bo'lmaydi.

? Yaxshi istisno (qabul qilingan risk) yozuvida nima bo'lishi kerak?
- Faqat "muammo emas" degan izoh
+ Aniq topilma va resurs, sabab, kim qabul qilgani va qayta ko'rib chiqish muddati
- Barcha topilmalar uchun umumiy istisno
- Muddatsiz istisno
! Keng va muddatsiz istisnolar kelajakdagi haqiqiy muammolarni yashiradi.

? Topilma tuzatildi deb qanday ishonch hosil qilinadi?
- Jamoa "tuzatdik" desa
+ Qayta skan qilib, tekshiruv PASS bo'lganini ko'rish
- Tiketni yopish
- Bir hafta kutish
! Tuzatishni isbotlash kerak; noto'g'ri region yoki resursda tuzatish keng tarqalgan xato.

? Qaysi chora "oldini olish" (preventive) to'sig'iga misol?
- Security Hub'da yangi FAIL haqida xabar
+ SCP bilan ishlatilmaydigan regionlarda resurs yaratishni taqiqlash
- Har oy Prowler hisobotini o'qish
- Insidentdan keyin tergov
! Preventive to'siq xatoni sodir bo'lishidan oldin to'xtatadi; detective — keyin aniqlaydi.

? Rahbar: "CIS bo'yicha 95% PASS, demak xavfsizmiz." Eng to'g'ri javob?
- Ha, 95% yetarli
+ Bu faqat ro'yxatdagi sozlamalar haqida; qolgan 5% va ro'yxatga kirmaydigan xavflar (ilova, o'g'irlangan kalitlar) baholanishi kerak
- Yo'q, 100% bo'lmaguncha hisobni o'chirish kerak
- CIS umuman ahamiyatsiz
! Muvofiqlik foizi yo'nalishni ko'rsatadi, lekin xavfsizlik kafolati emas.

? Nega CSPM topilmalarini ildiz sabab bo'yicha guruhlash kerak?
- Hisobot chiroyliroq ko'rinadi
+ Bitta tuzatish ko'p topilmani yopadi va yangilarining paydo bo'lishini to'xtatadi
- Vosita boshqacha ishlamaydi
- Bu severity'ni oshiradi
! Masalan, hisob darajasidagi Block Public Access yoki IaC moduliga qo'shilgan Flow Logs.
:::

:::cards
CSPM :: Bulut konfiguratsiyasini qoidalar bilan avtomatik va doimiy tekshirish
Prowler :: AWS, Azure, GCP va Kubernetes uchun ochiq manbali CSPM vositasi
CIS AWS Foundations Benchmark :: AWS hisobining asosiy xavfsizlik sozlamalari ro'yxati
CIS Level 1 :: Har bir hisob uchun asosiy, kam ta'sirli tavsiyalar
SecurityAudit + ViewOnlyAccess :: Audit roli uchun tavsiya etilgan faqat o'qish siyosatlari
Severity va risk :: Severity — qoidaning umumiy og'irligi; risk — kontekstdagi haqiqiy xavf
Ildiz sabab :: Ko'p topilmani keltirib chiqaradigan bitta sabab; uni tuzatish takrorlanishni to'xtatadi
Mutelist :: Prowler'da aniq topilma va resurs uchun asoslangan istisno
Preventive guardrail :: Xatoni oldindan to'xtatadigan to'siq (SCP)
Detective guardrail :: Xatoni sodir bo'lgach aniqlaydigan nazorat (Config, Security Hub)
Shift left :: Tekshiruvni joylashdan oldinga, IaC kodiga ko'chirish
:::
