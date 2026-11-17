Bulut xavfsizligi muhandisi lavozimiga ikki nomzod. Birinchisining rezyumesida: "AWS, IAM, Terraform, Kubernetes, CSPM bilan tajriba." Ikkinchisining rezyumesida bitta havola: GitHub repozitoriy. Ichida — Terraform bilan to'liq quriladigan, himoyalangan va monitoring qilingan infratuzilma, arxitektura sxemasi, tahdid modeli, insident runbook'lari, "oldin va keyin" Prowler hisobotlari va CI konveyeri, har bir PR'da kodni skanerlaydigan. README'da: "`terraform apply` — 15 daqiqa, `terraform destroy` — 10 daqiqa, oylik xarajat — bir necha dollar."

Intervyuer birinchi nomzodga savollar beradi va so'zlarni tekshirishga harakat qiladi. Ikkinchisi bilan esa **uning kodini birga ochib, gaplashadi**.

Karyera bo'limidagi portfolio darsida (k1) umumiy tamoyillarni, AppSec tarmog'ida (a4) Qaydnoma ilovasi portfoliosini ko'rdingiz. Bu dars — Cloud tarmog'ining yakuniy loyihasi: c1–c4 bosqichlarida o'rganganlaringizni bitta, ishlaydigan va **tekshiriladigan** infratuzilmaga aylantirish.

## Loyiha: Qaydnoma uchun xavfsiz bulut platformasi

Maqsad — Qaydnoma'ni (yoki istalgan oddiy web ilovani) AWS'da joylaydigan to'liq infratuzilma, quyidagi talablar bilan:

| Talab | Qaysi darsdan |
|---|---|
| Hammasi Terraform'da, qo'lda konsol ishi yo'q | c3 Terraform |
| Uch qatlam: ALB → ilova (private) → RDS (private, internetsiz) | c1 uch qatlamli ilova |
| Security group zanjiri, VPC endpoints, egress cheklangan | c2 tarmoq |
| Eng kam imtiyozli IAM rollari, doimiy kalitlar yo'q | c2 IAM |
| KMS bilan shifrlash, Block Public Access, Object Lock'li zaxira | c2 ma'lumot himoyasi |
| Sirlar Secrets Manager'da, RDS managed password | c2 sirlar |
| IMDSv2 majburiy, SSH yo'q, Session Manager | c2 misconfig |
| CloudTrail, GuardDuty, Config, Security Hub, signallar | c2 monitoring |
| Konteyner varianti: hardening, imzolangan image (ixtiyoriy) | c3 Docker, Kubernetes |
| CI: fmt, validate, Checkov, plan — OIDC orqali | c3 IaC skanerlash, a4 |
| Runbook'lar: sizib chiqqan kalit, buzilgan server | c4 bulut IR |
| Prowler va Checkov'da jiddiy topilma qolmagan | c2 CSPM |

Bu ro'yxat qo'rqinchli ko'rinadi, lekin har bir qatorni siz allaqachon alohida qilgansiz. Portfolio — ularni **bir joyga** yig'ish va hujjatlashtirish.

## Repozitoriy tuzilishi

```
qaydnoma-cloud/
├── README.md                    ← 2 daqiqalik taassurot
├── docs/
│   ├── architecture.md          ← sxema + tushuntirish
│   ├── architecture.png         ← (yoki Mermaid kodi)
│   ├── threat-model.md          ← STRIDE, ishonch chegaralari (a3)
│   ├── decisions/               ← "nega shunday qildim" — qisqa qaror yozuvlari
│   └── runbooks/
│       ├── leaked-access-key.md
│       └── compromised-instance.md
├── infra/
│   ├── modules/
│   │   ├── network/             ← VPC, subnetlar, endpoints, flow logs
│   │   ├── security-baseline/   ← CloudTrail, GuardDuty, Config, Security Hub, budgets
│   │   ├── app/                 ← ALB, ASG yoki ECS, IAM rollar
│   │   └── data/                ← RDS, S3, KMS, backup
│   ├── envs/
│   │   └── lab/                 ← main.tf, backend.tf, terraform.tfvars.example
│   └── policies/                ← o'z Checkov / OPA qoidalaringiz
├── reports/
│   ├── prowler-before.md        ← birinchi skan, qisqa xulosa
│   ├── prowler-after.md
│   └── checkov.md
├── .github/workflows/
│   ├── infra-pr.yml             ← fmt, validate, checkov, plan
│   └── infra-apply.yml          ← main'dan, tasdiq bilan
└── .gitignore                   ← *.tfstate, .terraform/, *.tfvars
```

:::warn
**Ommaviy repozitoriyga hech qachon:** state fayllari, `terraform.tfvars` (haqiqiy qiymatlar bilan), access key'lar, kubeconfig, haqiqiy sirlar. Push qilishdan oldin sir skaneri (gitleaks, a3) bilan tekshiring va pre-commit'ga qo'ying. c1 bosqichidagi talaba hikoyasini o'zingizning portfoliongizda takrorlamang — bu intervyuda eng yomon "namoyish" bo'lardi. Hisob ID va ichki IP'lar sir emas, lekin hujjatlarda ularni `111122223333` kabi namunalar bilan almashtirish yaxshi odat.
:::

## README — birinchi ikki daqiqa

Intervyuer README'ni bir-ikki daqiqa o'qiydi. Shu vaqtda uchta savolga javob bo'lishi kerak: **bu nima, nima uchun qiziq va bu odam nimani biladi?**

```markdown
# Qaydnoma Cloud — AWS'da xavfsiz uch qatlamli platforma

Web ilovani AWS'da joylaydigan, butunlay Terraform bilan quriladigan infratuzilma.
Maqsad: bulut xavfsizligi tamoyillarini ishlaydigan, tekshiriladigan loyihada ko'rsatish.

## Natijalar bir qarashda
- Prowler (CIS AWS Foundations): FAIL 47 → 3 (qolgan 3 tasi asoslangan istisno — reports/prowler-after.md)
- Checkov: har bir PR'da, 0 ta ochiq topilma; 2 ta o'z siyosatim (policies/)
- Doimiy access key: 0 — CI OIDC orqali, serverlar IAM rollar bilan
- `terraform apply` ≈ 15 daqiqa, `destroy` ≈ 10 daqiqa, lab xarajati ≈ N $/kun

## Arxitektura
(sxema) — batafsil: docs/architecture.md

## Xavfsizlik nazoratlari
| Qatlam | Nazorat | Qayerda |
|---|---|---|
| Identifikatsiya | ... | infra/modules/... |

## Insidentga tayyorgarlik
GuardDuty → EventBridge → xabar; runbook'lar: docs/runbooks/

## Ishga tushirish
...
```

"Natijalar bir qarashda" — eng muhim bo'lim. Raqamlar **haqiqiy** bo'lishi kerak: o'zingiz o'lchagan, hisobot bilan tasdiqlangan. Yuqoridagi raqamlar — namuna, o'zingiznikini yozing.

## Arxitektura hujjati

c1 bosqichidagi sxema talablari: VPC, subnetlar va CIDR'lar, AZ'lar, har bir komponent va uning security group'i, oqimlar (port va protokol), ishonch chegaralari, ma'lumot qayerda va qanday shifrlangan, jurnallar qayerga ketadi.

Sxemadan keyin — **qarorlar** va ularning sabablari. Masalan:

| Qaror | Muqobil | Nega shunday |
|---|---|---|
| Session Manager, SSH yo'q | Bastion + SSH | 22-port umuman ochilmaydi, har bir seans CloudTrail'da |
| NAT o'rniga VPC endpoints (qisman) | Hammasi NAT orqali | Egress kamroq, xarajat kamroq, `aws:SourceVpce` sharti |
| RDS managed master password | Terraform'dagi parol | Parol state faylida yo'q |
| Single-AZ RDS (lab) | Multi-AZ | Lab xarajati; ishlab chiqarishda Multi-AZ — hujjatda qayd etilgan |

Oxirgi qator muhim: **murosalarni yashirmang**. Intervyuer "nega Multi-AZ emas?" deb so'raydi; "lab xarajati uchun, ishlab chiqarishda Multi-AZ bo'lardi, mana shu qatorni o'zgartirish kifoya" — muhandislik javobi.

## Tahdid modeli

a3 bosqichidagi tahdid modellashtirish — infratuzilmaga qo'llanadi. Qisqa va aniq:

| Tahdid (STRIDE) | Misol | Nazorat | Qoldiq risk |
|---|---|---|---|
| Spoofing | O'g'irlangan CI kaliti | OIDC, doimiy kalitlar yo'q | GitHub hisobi buzilishi — MFA, branch himoyasi |
| Tampering | Konsolda security group o'zgartirildi | Config, drift aniqlash, EventBridge signali | Signallarga javob vaqti |
| Repudiation | "Men buni qilmaganman" | CloudTrail log hisobida, validation | — |
| Information disclosure | Ommaviy bucket | Hisob darajasida Block Public Access, SCP | Presigned URL'lar muddati |
| Denial of service | Trafik toshqini | Shield Standard, WAF rate-based | Yirik DDoS — Shield Advanced kerak bo'lardi |
| Elevation of privilege | SSRF → IMDS → rol kalitlari | IMDSv2, eng kam imtiyozli rol, egress cheklovi | Ilova zaifliklari — AppSec qatlami |

Oxirgi ustun — "qoldiq risk" — yetuklik belgisi: hech bir tizim mutlaq xavfsiz emas va buni tan olish ishonch uyg'otadi.

## Hisobotlar: oldin va keyin

Portfolio'ning eng kuchli qismi — **o'lchangan yaxshilanish**:

1. Loyihaning birinchi, "sodda" versiyasini ko'taring (yoki toza hisobning o'zini) va Prowler'ni ishga tushiring. Natijani `reports/prowler-before.md` ga **qisqa xulosa** sifatida yozing: nechta FAIL, qaysi bo'limlarda, eng muhim 5 tasi.
2. Nazoratlarni bosqichma-bosqich qo'shing (har biri alohida PR — Git tarixi o'zi hikoya qiladi).
3. Yakuniy skan — `reports/prowler-after.md`: qolgan topilmalar va har biri uchun asoslangan istisno (c2 CSPM darsi).

```markdown
## Prowler — yakuniy natija (CIS AWS Foundations, lab hisobi)

| | Oldin | Keyin |
|---|---|---|
| Critical | 3 | 0 |
| High | 11 | 0 |
| Medium | 21 | 2 |
| Low | 12 | 1 |

Qolgan topilmalar:
- <tekshiruv>: <resurs> — <nega qabul qilingan, egasi, muddat>
```

To'liq xom hisobotni (HTML, CSV) ommaviy repozitoriyga qo'ymang — unda keraksiz tafsilotlar ko'p. Qisqa xulosa va asoslar yetarli.

## Insidentni namoyish qilish

Monitoring "yoqilgan" deyish oson. Uning **ishlashini** ko'rsating:

- GuardDuty'da namuna topilmalarni yarating (c2 monitoring darsi) — EventBridge orqali xabar kelganini skrinshot yoki qisqa video bilan ko'rsating.
- Lab hisobida test foydalanuvchi va kalit yarating, so'ng runbook bo'yicha "sizib chiqqan kalit" mashqini o'tkazing: faolsizlantirish, sessiyalarni bekor qilish, CloudTrail so'rovi bilan vaqt chizig'i (c4 bulut IR). Natijani `docs/runbooks/leaked-access-key.md` oxiriga "Mashq: 2026-11-xx" bo'limi sifatida qo'shing.

Bu — "bilaman"ni "qildim"ga aylantiradi. SOC tarmog'idagi portfolio darsi bilan ham bog'lanadi: bulut IR — Blue Team'ning bulutdagi qismi.

## Xarajat va xavfsizlik — lab gigiyenasi

- **Byudjet ogohlantirishi** — loyiha boshlanishidan oldin (c1).
- Hammasi teglangan (`default_tags`) — Cost Explorer'da loyiha xarajati alohida ko'rinadi.
- Ishlatmaganingizda — `terraform destroy`. Portfolio "doim ishlab turishi" shart emas: sxema, kod, hisobotlar va skrinshotlar yetarli; kerak bo'lsa intervyudan oldin 15 daqiqada ko'tarasiz.
- Alohida lab hisobi (asosiy shaxsiy hisobingiz emas) — c2 bosqichidagi "hisob — izolyatsiya chegarasi".

## Variantlar va kengaytirishlar

Asosiy loyiha tayyor bo'lgach, qiziqishingizga qarab:

| Kengaytirish | Nima ko'rsatadi |
|---|---|
| Ilovani ECS Fargate yoki EKS'ga ko'chirish, Pod Security va network policy bilan | c3 konteyner va Kubernetes xavfsizligi |
| cosign bilan image imzolash va admission'da tekshirish | Ta'minot zanjiri xavfsizligi |
| Azure yoki GCP'da xuddi shu arxitektura (qisqa) | Ko'p bulutli fikrlash (c1 tarjima lug'ati) |
| Avtomatik cheklash: GuardDuty → Step Functions → karantin | c4 IR avtomatlashtirish, b4 SOAR |
| flaws.cloud / flaws2.cloud bo'yicha "o'rganganlarim" yozuvi — yechimlarsiz, himoya nuqtai nazaridan | Bulut xatolarini tushunish |
| Bitta CSPM topilmasi bo'yicha chuqur blog post | Yozish ko'nikmasi |

## Intervyuda ko'rsatish

Portfolio — suhbat uchun mavzu. Tayyorlaning:

- **3 daqiqalik hikoya:** muammo → arxitektura → asosiy nazoratlar → o'lchangan natija → keyingi qadam.
- **Bitta chuqur mavzu**, masalan: "IMDS va SSRF — loyihamda buni qanday yopganman" yoki "state faylidagi sirlar muammosi va yechimim".
- **Murosalar va qoldiq risklar** — "nima qilmadim va nega".
- **Kodni ochib ko'rsatish** — ekranni ulashib, IAM siyosati yoki security group modulini tushuntirish.

Ehtimoliy savollar: "Bu infratuzilmada eng zaif joy qayerda?", "Ilova serveri buzilsa, hujumchi qayerga yeta oladi?", "Ertaga yangi jamoa a'zosi qo'shilsa, unga qanday ruxsat berasiz?", "Kalit sizib chiqsa, birinchi besh daqiqada nima qilasiz?"

## Bu dars nimani bermaydi

- Portfolio ish tajribasini to'liq almashtirmaydi — lekin "tajribasiz" va "isbotlangan ko'nikmali" o'rtasidagi farqni yaratadi.
- Lab hisobi ishlab chiqarish emas: haqiqiy trafik, haqiqiy foydalanuvchilar va haqiqiy hujumlar yo'q. Buni intervyuda halol ayting.
- Prowler'dagi "0 FAIL" xavfsizlik kafolati emas (c2) — bu ham hujjatda yozilsin.
- Nusxalangan loyiha — portfolio emas. Har bir qarorni o'zingiz tushuntira olishingiz kerak; intervyuer aynan shuni tekshiradi.

:::try
1. Repozitoriy tuzilishini yarating va README'ning "Natijalar bir qarashda" bo'limini bo'sh shablon sifatida yozing — raqamlarni loyiha davomida to'ldirasiz.
2. Sodda variantni ko'tarib, Prowler'ning birinchi skanini oling va `prowler-before.md` ni yozing.
3. Nazoratlarni kamida 6 ta alohida PR bilan qo'shing (har biri bitta mavzu: tarmoq, IAM, shifrlash, monitoring, CI, runbook'lar). Har bir PR tavsifida "nima o'zgardi va qaysi risk kamaydi" deb yozing.
4. "Sizib chiqqan kalit" mashqini o'tkazib, runbook'ga natijani qo'shing.
5. Do'stingiz yoki hamjamiyatdagi kimdir bilan 3 daqiqalik hikoyani mashq qiling va unga loyihaning eng zaif joyini topishni topshiring.
6. Savol: intervyuer so'raydi: "Prowler'da 0 ta FAIL — demak sizning infratuzilmangiz xavfsizmi?" Javobingiz?

**Javoblar:**
1–4. Bu topshiriqlarning "to'g'ri javobi" — sizning repozitoriyingiz. O'zingizni tekshirish uchun: README'ni birinchi marta ko'rayotgan odam 2 daqiqada loyiha nima ekanini, qanday nazoratlar borligini va qanday o'lchanganini tushunadimi? Har bir nazorat uchun kodda aniq joyni ko'rsata olasizmi?
5. Yaxshi belgi — sherigingiz topgan zaif joy hujjatingizdagi "qoldiq risklar" ro'yxatida allaqachon bor. Agar yo'q bo'lsa — uni qo'shing; bu ham portfolio'ni yaxshilaydi.
6. Yo'q: Prowler faqat ma'lum sozlama qoidalarini tekshiradi. Ilova zaifliklari, o'g'irlangan hisob ma'lumotlari, ichki tahdid, ish vaqtidagi hujumlar uning doirasidan tashqarida. Shuning uchun loyihada monitoring, runbook'lar va tahdid modeli ham bor — va qoldiq risklar ro'yxati.
:::

## Xulosa

- Portfolio so'zlarni tekshiriladigan ishga aylantiradi: intervyuer siz bilan kodingiz haqida gaplashadi.
- Loyiha: Terraform bilan to'liq quriladigan, uch qatlamli, eng kam imtiyozli, shifrlangan, monitoring qilingan, CI'da skanerlanadigan infratuzilma va runbook'lar.
- Tuzilma: README (natijalar bir qarashda), arxitektura va qarorlar, tahdid modeli, runbook'lar, modullar, o'z siyosatlar, qisqa hisobotlar, CI.
- Ommaviy repozitoriyda state, tfvars, kalitlar va sirlar yo'q — sir skaneri pre-commit'da.
- Eng kuchli dalil — o'lchangan yaxshilanish (Prowler oldin va keyin) va insident mashqi.
- Murosalarni va qoldiq risklarni yashirmang. Lab gigiyenasi: byudjet, teglar, `destroy`.
- Intervyu uchun: 3 daqiqalik hikoya, bitta chuqur mavzu, kodni ochib tushuntirish.

:::quiz
? Bulut portfolio loyihasining eng kuchli dalili qaysi?
- Rezyumedagi texnologiyalar ro'yxati
+ O'lchangan yaxshilanish (masalan, Prowler oldin va keyin) va ishlashi namoyish qilingan nazoratlar
- Eng ko'p xizmatlardan foydalanish
- Repozitoriyning yulduzlari soni
! Raqamlar va namoyish "bilaman"ni "qildim"ga aylantiradi.

? Ommaviy portfolio repozitoriyiga nima hech qachon qo'yilmaydi?
- Terraform modullari
- Arxitektura sxemasi
+ State fayllari, haqiqiy tfvars, access key'lar va sirlar
- Runbook'lar
! Push'dan oldin sir skaneri; state esa ichida sirlar bo'lishi mumkin bo'lgan infratuzilma xaritasi.

? README'dagi "Natijalar bir qarashda" bo'limida nima bo'lishi kerak?
+ O'zingiz o'lchagan va hisobot bilan tasdiqlangan aniq raqamlar
- Umumiy so'zlar: "juda xavfsiz"
- Boshqa loyihadan ko'chirilgan raqamlar
- Faqat texnologiyalar logotiplari
! Intervyuer raqamlarni tekshirishi mumkin — ular haqiqiy bo'lishi shart.

? Lab'da RDS Single-AZ tanlandi. Hujjatda buni qanday ko'rsatish to'g'ri?
- Yashirish
+ Qaror sifatida yozish: xarajat sababli lab'da Single-AZ, ishlab chiqarishda Multi-AZ va buni qanday o'zgartirish
- Multi-AZ deb yozish
- Umuman eslatmaslik
! Murosalarni ochiq ko'rsatish — muhandislik yetukligi.

? Tahdid modelidagi "qoldiq risk" ustuni nima uchun kerak?
- Hujjatni uzunroq qilish uchun
+ Hech bir tizim mutlaq xavfsiz emasligini va nazoratlardan keyin qolgan xavfni halol ko'rsatish uchun
- Auditorlarni chalg'itish uchun
- Faqat AWS talab qilgani uchun
! Qoldiq riskni bilish keyingi qadamlarni ham belgilaydi.

? Nega nazoratlarni bitta katta commit emas, alohida PR'lar bilan qo'shish tavsiya etiladi?
- Bu tezroq
+ Git tarixi o'zi hikoya qiladi: har bir PR bitta mavzu va kamaygan riskni ko'rsatadi
- GitHub katta commit'larni qabul qilmaydi
- Bu Terraform talabi
! Kod sharhi madaniyati va o'zgarishlarni boshqarishni ham namoyish qiladi.

? Monitoring "yoqilgan"ini qanday ishonchli ko'rsatish mumkin?
- README'da "monitoring bor" deb yozish
+ GuardDuty namuna topilmalari orqali xabar kelishini va runbook bo'yicha mashq natijasini ko'rsatish
- Monitoring kodini yashirish
- Faqat CloudWatch logotipini qo'yish
! Ishlashi namoyish qilingan nazorat — eng kuchli dalil.

? Portfolio infratuzilmasi doim ishlab turishi kerakmi?
- Ha, aks holda portfolio hisoblanmaydi
+ Shart emas: kod, sxema, hisobotlar va skrinshotlar yetarli; kerak bo'lsa `terraform apply` bilan tez ko'tariladi
- Ha, va ishlab chiqarish trafigi bilan
- Faqat Multi-AZ bilan
! Lab gigiyenasi: ishlatmaganda destroy — xarajat va hujum yuzasi kamayadi.

? Intervyuer: "Ilova serveri buzilsa, hujumchi qayerga yeta oladi?" Yaxshi javob qanday?
+ Arxitektura asosida aniq: faqat bazaning 5432 portiga, rol ruxsat bergan S3 prefiksi va sirga; IMDSv2, egress cheklovi va monitoring qolganini to'sadi
- "Hech qayerga, tizim mutlaq xavfsiz"
- "Bilmayman"
- "Hamma joyga"
! Bu savol c1 bosqichidagi "hujumchi ko'zi bilan qarash" mashqi.

? "Prowler'da 0 FAIL — demak xavfsiz" degan da'vo haqida to'g'ri javob?
- Ha, bu xavfsizlik kafolati
+ Yo'q, Prowler faqat ma'lum sozlama qoidalarini tekshiradi; ilova zaifliklari, o'g'irlangan hisoblar va ish vaqtidagi hujumlar uning doirasidan tashqarida
- Faqat Azure'da to'g'ri
- Prowler umuman foydasiz
! Shuning uchun loyihada monitoring, runbook'lar va tahdid modeli ham bor.
:::

:::cards
Cloud portfolio :: Terraform bilan quriladigan, himoyalangan, monitoring qilingan va hujjatlashtirilgan infratuzilma
Natijalar bir qarashda :: README'dagi o'lchangan, tasdiqlangan raqamlar bo'limi
Qaror yozuvi :: Nima tanlangani, muqobili va nega — murosalar bilan
Qoldiq risk :: Nazoratlardan keyin qolgan va ochiq tan olingan xavf
Prowler oldin/keyin :: O'lchangan yaxshilanishning eng kuchli dalili
Insident mashqi :: Runbook bo'yicha amalda o'tkazilgan va natijasi yozilgan mashq
Sir skaneri pre-commit'da :: Portfolio repozitoriyiga kalit tushishining oldini olish
Lab gigiyenasi :: Byudjet ogohlantirishi, teglar, alohida hisob, ishlatmaganda destroy
3 daqiqalik hikoya :: Muammo → arxitektura → nazoratlar → natija → keyingi qadam
Kengaytirishlar :: EKS/ECS, image imzolash, Azure varianti, avtomatik cheklash
:::
