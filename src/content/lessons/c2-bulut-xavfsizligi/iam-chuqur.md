SOC tarmog'idagi bulut loglari darsini eslang: `ci-deploy` — CI/CD konveyeri uchun yaratilgan xizmat hisobi — tashqi IP'dan **boshqa foydalanuvchi uchun** yangi access key yaratdi. Tahlilchi sifatida siz "bu shubhali" dedingiz. Endi bulut xavfsizligi muhandisi sifatida boshqa savol berasiz: **nega bu hisob umuman bunga qodir edi?**

Javobni topish uchun uning siyosatini ochasiz va ko'rasiz:

```json
{ "Effect": "Allow", "Action": "*", "Resource": "*" }
```

Kimdir bir yil oldin konveyer "ruxsat yo'q" xatosi bilan to'xtab qolganda, uni tezda tuzatish uchun to'liq admin huquqi bergan. "Keyin toraytiramiz" degan. Hech kim toraytirmagan.

Oldingi bosqichda bulutda chegara — identifikatsiya ekanini aytdik. Bu dars — o'sha chegaraning o'zi: IAM siyosatlari qanday tuzilgan, AWS ularni qanday baholaydi, eng kam imtiyozli siyosat qanday yoziladi va qaysi ruxsatlar "admin bilan teng" hisoblanadi.

## Siyosat anatomiyasi

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "ReadQaydnomaUploads",
      "Effect": "Allow",
      "Action": ["s3:GetObject"],
      "Resource": "arn:aws:s3:::qaydnoma-uploads-111122223333/*",
      "Condition": {
        "StringEquals": { "aws:PrincipalOrgID": "o-exampleorgid" }
      }
    }
  ]
}
```

| Element | Savol | Izoh |
|---|---|---|
| `Version` | Siyosat tili versiyasi | Doim `2012-10-17` (bu sana, versiya raqami) |
| `Sid` | Qoida nomi | Ixtiyoriy, o'qish uchun |
| `Effect` | Ruxsatmi yoki taqiqmi? | `Allow` yoki `Deny` |
| `Principal` | **Kimga?** | Faqat resurs siyosatlarida (bucket policy, trust policy) |
| `Action` | **Qanday amal?** | `xizmat:Amal`, masalan `s3:GetObject` |
| `Resource` | **Qaysi resursda?** | ARN, `*` belgisi bilan ham |
| `Condition` | **Qanday sharoitda?** | IP, MFA, tashkilot, region, teg… |

Xavfli belgilar:

- `"Action": "*"` yoki `"iam:*"` — hamma amallar.
- `"Resource": "*"` — hisobdagi barcha resurslar.
- `NotAction` bilan `Allow` — "ro'yxatdagilardan **tashqari** hamma narsa". Yangi xizmatlar paydo bo'lganda ular ham avtomatik ruxsat ichiga tushadi.
- `"Principal": "*"` bilan `Allow` (resurs siyosatida) — butun internet, shart cheklamasa.

## Siyosat turlari

| Tur | Qayerga biriktiriladi | Nima qiladi |
|---|---|---|
| **Identity-based** | User, group, role | "Bu identifikatsiya nimaga qodir" |
| **Resource-based** | S3 bucket, KMS kalit, SQS, rolning trust policy'si | "Bu resursga kim nima qila oladi" |
| **Permission boundary** | User yoki role | Maksimal chegara: identity siyosati undan oshib ruxsat bera olmaydi |
| **SCP** (Organizations) | Account yoki OU | Butun hisob uchun maksimal chegara, root'ni ham cheklaydi |
| **Session policy** | Vaqtinchalik sessiya | Rol assume qilinganda qo'shimcha toraytirish |

Identity siyosatlari ham ikki xil: **AWS managed** (AWS tayyorlagan, masalan `ReadOnlyAccess`) va **customer managed** (o'zingiz yozgan). AWS managed siyosatlar qulay, lekin ko'pincha keng — ular hammaga mos bo'lishi uchun yozilgan.

## AWS siyosatlarni qanday baholaydi

Har bir so'rov uchun AWS barcha tegishli siyosatlarni yig'ib, quyidagi mantiq bilan qaror qiladi:

```
 So'rov keldi
     │
     ▼
 Biror siyosatda aniq DENY bormi? ──── ha ───▶  RAD ETILADI
     │ yo'q
     ▼
 SCP / permission boundary ruxsat doirasidami? ── yo'q ──▶  RAD ETILADI
     │ ha
     ▼
 Identity yoki resource siyosatida ALLOW bormi? ── yo'q ──▶  RAD ETILADI (sukut)
     │ ha
     ▼
 RUXSAT
```

Uchta qoida esda qolishi kerak:

1. **Sukut bo'yicha — taqiq.** Hech narsa yozilmagan bo'lsa — yo'q.
2. **Aniq `Deny` har doim yutadi.** O'nta `Allow` bo'lsa ham, bitta `Deny` hal qiladi.
3. **Chegaralar kesishadi.** SCP va boundary ruxsat bermaydi — ular faqat maksimalni belgilaydi. Haqiqiy ruxsat = identity `Allow` ∩ boundary ∩ SCP.

(Hisoblararo so'rovlarda mantiq yanada qat'iy: ikkala tomon ham ruxsat berishi kerak — so'rov yuborgan hisobdagi identity siyosati va resurs siyosati.)

Shuning uchun `Deny` — kuchli himoya vositasi. Masalan, butun tashkilot uchun SCP: "CloudTrail'ni hech kim o'chira olmasin" — hatto hisobdagi admin ham.

```json
{
  "Effect": "Deny",
  "Action": ["cloudtrail:StopLogging", "cloudtrail:DeleteTrail"],
  "Resource": "*"
}
```

b4 darsidagi jadvalni eslang: `StopLogging` — hujumchining izlarni yashirish urinishi. SCP bilan u **imkonsiz** bo'ladi.

## Rollar va vaqtinchalik kalitlar

Rolning ikki siyosati bor — buni chalkashtirmang:

| | Trust policy | Permission policy |
|---|---|---|
| Savol | **Kim** bu rolni kiya oladi? | Rolni kiygan kishi **nima** qila oladi? |
| Turi | Resource-based (rolning o'zida) | Identity-based |
| Misol | "EC2 xizmati" yoki "111122223333 hisobidagi `aziz`" | "Bitta bucket'dan o'qish" |

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": { "Service": "ec2.amazonaws.com" },
    "Action": "sts:AssumeRole"
  }]
}
```

Rolni kiyish — **STS** (Security Token Service) orqali: `AssumeRole` chaqiruvi uchta qiymat qaytaradi — access key ID, secret key va session token — hammasi vaqtinchalik (sukut bo'yicha bir soat). Loglarda farqlash oson:

| Kalit prefiksi | Turi |
|---|---|
| `AKIA...` | Doimiy (IAM user kaliti) — o'chirilmaguncha amal qiladi |
| `ASIA...` | Vaqtinchalik (STS) — muddati tugaydi |

Insidentda bu farq muhim: `AKIA` kaliti sizib chiqsa, uni darhol o'chirish kerak; `ASIA` kaliti o'zi tugaydi, lekin uni bergan rol va uning trust policy'si tekshiriladi (c4 bosqichi).

**Uchinchi tomonga rol berish.** Masalan, xavfsizlik skaneri xizmati hisobingizni tekshirishi kerak. Siz unga rol yaratasiz va trust policy'da uning hisobini ko'rsatasiz. Muammo: o'sha xizmat **boshqa mijozlar** uchun ham ishlaydi; kimdir sizning rolingiz ARN'ini bilib, xizmatdan "shu rolni tekshir" deb so'rasa-chi? Bu "confused deputy" muammosi. Yechim — **external ID**: trust policy'ga shart qo'shiladi, faqat siz bilan kelishilgan noyob qiymat bilan kelgan so'rov qabul qilinadi.

## Eng kam imtiyozli siyosat yozish

Qaydnoma serverining roli. Unga nima kerak?

- Yuklangan fayllarni o'qish va yozish — bitta bucket, bitta prefiks.
- Baza parolini olish — bitta sir.
- Bucket KMS kaliti bilan shifrlangan bo'lsa — shu kalit bilan shifrlash va ochish.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "UploadsReadWrite",
      "Effect": "Allow",
      "Action": ["s3:GetObject", "s3:PutObject"],
      "Resource": "arn:aws:s3:::qaydnoma-uploads-111122223333/notes/*"
    },
    {
      "Sid": "DbSecret",
      "Effect": "Allow",
      "Action": "secretsmanager:GetSecretValue",
      "Resource": "arn:aws:secretsmanager:eu-central-1:111122223333:secret:qaydnoma/db-*"
    },
    {
      "Sid": "UploadsKey",
      "Effect": "Allow",
      "Action": ["kms:Decrypt", "kms:GenerateDataKey"],
      "Resource": "arn:aws:kms:eu-central-1:111122223333:key/<key-id>"
    }
  ]
}
```

Yo'q narsalar ham muhim: `s3:DeleteObject` yo'q (ilova o'chirmaydi — agar o'chirsa, qo'shiladi), `s3:ListBucket` yo'q (ilova fayl nomlarini bazadan biladi), boshqa sirlar yo'q. (Secrets Manager sir ARN'ining oxiriga tasodifiy olti belgi qo'shadi — shuning uchun `db-*`.)

Amalda eng kam imtiyozga qanday yetiladi:

| Usul | Qanday |
|---|---|
| Kerakdan boshlash | "Ilova nima qiladi?" — ro'yxat, keyin siyosat. "Hammasini ber, keyin toraytiramiz" emas |
| IAM Access Analyzer policy generation | CloudTrail'dagi haqiqiy amallarga qarab siyosat loyihasini yaratadi |
| Last accessed ma'lumoti | IAM konsolida: qaysi xizmat va amallar 90 kun davomida ishlatilmagan — olib tashlash nomzodlari |
| Access Analyzer tekshiruvi | Siyosatni yozish paytida xatolar va keng ruxsatlar haqida ogohlantiradi |
| Teglar bilan shart (ABAC) | `aws:ResourceTag/Project = qaydnoma` — faqat o'z loyihasi resurslari |

:::key
"Keyin toraytiramiz" — bulut xavfsizligidagi eng qimmat va'da. Dars boshidagi `ci-deploy` shundan tug'ildi. Eng kam imtiyoz boshida qiyin tuyuladi, lekin keng ruxsatni keyin toraytirish undan ham qiyin: kim nimaga bog'liqligini hech kim bilmaydi va "biror narsa buzilib qolmasin" qo'rquvi hamma narsani muzlatadi.
:::

## Admin bilan teng ruxsatlar

IAM'dagi nozik haqiqat: ba'zi ruxsatlar o'zi "admin" deb atalmaydi, lekin ularga ega identifikatsiya **o'zini admin qila oladi**. Bulut xavfsizligi bo'yicha adabiyotda bu "IAM privilege escalation" deb ataladi. Himoyachi uchun muhimi — bunday ruxsatlarni tanish va ularni admin huquqi kabi qattiq nazorat qilish.

| Ruxsat toifasi | Nega xavfli | Misol amallar |
|---|---|---|
| O'z siyosatlarini o'zgartirish | Identifikatsiya o'ziga istalgan ruxsatni qo'sha oladi | `iam:PutUserPolicy`, `iam:AttachRolePolicy`, `iam:CreatePolicyVersion` |
| Boshqa identifikatsiyalar uchun kirish yaratish | Kuchliroq hisob nomidan ish ko'rish mumkin bo'ladi | `iam:CreateAccessKey`, `iam:CreateLoginProfile`, `iam:UpdateLoginProfile` |
| Rollarning trust policy'sini o'zgartirish | O'zini kuchli rolni kiya oladiganlar ro'yxatiga qo'shish | `iam:UpdateAssumeRolePolicy` |
| Rolni xizmatga uzatish | Kuchli rolni server yoki funksiyaga biriktirib, uning nomidan kod ishlatish | `iam:PassRole` + server yoki funksiya yaratish huquqi |

Bu jadvalning maqsadi — **audit**: siyosatlarni ko'rib chiqayotganda shu amallar `"Resource": "*"` bilan uchrasa, bu hisob amalda admin hisoblanadi. Amaliy hujum zanjirlarini qonuniy laboratoriyalarda o'rganish mumkin (roadmap'dagi CloudGoat — **o'z** o'quv hisobingizda ko'tariladi).

Himoya:

- `iam:*` va yuqoridagi amallar faqat haqiqiy adminlarda, MFA bilan.
- `iam:PassRole` doim aniq `Resource` bilan — faqat ilova o'zi kiyishi kerak bo'lgan rol ARN'i, `*` emas.
- **Permission boundary**: dasturchilarga rol yaratish huquqi berilsa ham, ular yaratgan har bir rol boundary'dan oshmasligi sharti bilan.
- **SCP**: butun hisob uchun eng xavfli amallarni taqiqlash (CloudTrail o'chirish, regionlardan tashqariga chiqish).
- **Monitoring**: CloudTrail'da `CreatePolicyVersion`, `AttachUserPolicy`, `PutUserPolicy`, `CreateAccessKey`, `UpdateAssumeRolePolicy` — SIEM'da alohida qoida (b2 bosqichidagi detection engineering).
- **IAM Access Analyzer**: tashqi hisoblarga yoki ommaga ochilgan resurslarni va ishlatilmayotgan ruxsatlarni topadi.

## IAM gigiyenasi

| Tekshiruv | Qanday | Maqsad |
|---|---|---|
| Doimiy kalitli user'lar | Credential report (IAM → Credential report) | Ularni rollarga ko'chirish |
| Eski kalitlar | `access_key_1_last_rotated` 90 kundan oshgan | Almashtirish yoki o'chirish |
| Ishlatilmagan kalitlar | `access_key_1_last_used_date` bo'sh yoki eski | O'chirish |
| MFA'siz konsol user'lar | Credential report, `mfa_active = false` | MFA majburiy |
| Ishlatilmagan rollar | Last activity | O'chirish |
| `AdministratorAccess` biriktirilganlar | Siyosat → "Entities attached" | Ro'yxat qisqa va asosli bo'lishi kerak |

```bash
aws iam generate-credential-report
aws iam get-credential-report --query Content --output text | base64 -d > report.csv
```

## IAM nimani qilmaydi

- Qonuniy ruxsatli identifikatsiyaning **suiiste'molini** to'xtatmaydi. Kalit o'g'irlansa, AWS uchun hujumchi — shu identifikatsiya. Buni faqat monitoring (keyingi darslar) ko'radi.
- Murakkablik o'zi xavf: o'nlab siyosat, boundary va SCP kesishganda "bu odam aslida nimaga qodir?" savoliga qo'lda javob berish qiyin. Shuning uchun Access Analyzer va CSPM vositalari (c2 oxiri) kerak.
- Ilova ichidagi ruxsatlar (Qaydnoma'da kim qaysi qaydni ko'radi) IAM emas — bu a2 bosqichidagi `can()` va `load_note()`.

:::try
Har bir siyosat nimaga ruxsat beradi? Xavfli joy bormi?

**A:**
```json
{ "Effect": "Allow", "Action": "s3:*", "Resource": "*" }
```

**B:**
```json
{ "Effect": "Allow", "NotAction": "iam:*", "Resource": "*" }
```

**C:**
```json
{
  "Effect": "Allow",
  "Action": ["ec2:RunInstances", "iam:PassRole"],
  "Resource": "*"
}
```

**D:** Foydalanuvchida `AdministratorAccess` bor, lekin hisobga SCP biriktirilgan: `Deny` `cloudtrail:StopLogging`. U CloudTrail'ni to'xtata oladimi?

O'quv hisobingizda: credential report yarating va har bir user uchun MFA va kalit yoshini tekshiring.

**Javoblar:**
- **A:** Hisobdagi **barcha** bucket'lar ustida hamma amallar: o'qish, o'chirish, siyosatni o'zgartirish (ommaga ochish), Block Public Access'ni o'chirish. Faqat kerakli bucket va amallar bilan almashtiring.
- **B:** IAM'dan tashqari **hamma narsa** — amalda deyarli admin. Bundan tashqari, AWS yangi xizmat chiqarsa, u ham avtomatik ruxsatga kiradi.
- **C:** Istalgan server ko'tarish va unga **istalgan** rolni biriktirish — jumladan admin rolini. Bu admin bilan teng ruxsatlar jadvalining oxirgi qatori. `iam:PassRole` uchun `Resource` aniq rol ARN'i bo'lishi kerak.
- **D:** Yo'q. SCP'dagi aniq `Deny` hisob ichidagi har qanday `Allow` dan ustun turadi.
:::

## Xulosa

- Siyosat: Effect, Principal (resurs siyosatlarida), Action, Resource, Condition. Xavfli belgilar: `*`, `NotAction` + `Allow`, `Principal: "*"`.
- Siyosat turlari: identity, resource, permission boundary, SCP, session. Boundary va SCP ruxsat bermaydi — chegarani belgilaydi.
- Baholash: sukut — taqiq; aniq `Deny` har doim yutadi; haqiqiy ruxsat — barcha qatlamlar kesishmasi.
- Rolda ikki siyosat: trust (kim kiya oladi) va permission (nima qila oladi). STS kalitlari vaqtinchalik (`ASIA`), user kalitlari doimiy (`AKIA`).
- Eng kam imtiyoz: kerakdan boshlash, Access Analyzer, last accessed, aniq ARN'lar. "Keyin toraytiramiz" — ishlamaydi.
- Ba'zi IAM ruxsatlari admin bilan teng; ular `Resource: "*"` bilan uchrasa — admin deb hisoblang. Himoya: aniq PassRole, boundary, SCP, monitoring.

:::quiz
? Identity siyosatida `Allow s3:*`, bucket siyosatida esa shu foydalanuvchi uchun `Deny s3:DeleteObject` bor. Foydalanuvchi obyektni o'chira oladimi?
- Ha, chunki Allow kengroq
+ Yo'q, aniq Deny har doim yutadi
- Faqat konsoldan
- Faqat root ruxsat bersa
! AWS baholash mantig'ida aniq Deny har qanday Allow'dan ustun.

? Permission boundary nima qiladi?
- Foydalanuvchiga qo'shimcha ruxsat beradi
+ Identity siyosati oshib o'ta olmaydigan maksimal chegarani belgilaydi
- Root hisobni o'chiradi
- Faqat S3 uchun ishlaydi
! Boundary o'zi ruxsat bermaydi; haqiqiy ruxsat — identity Allow va boundary kesishmasi.

? Rolning trust policy'si qaysi savolga javob beradi?
+ Kim bu rolni kiya (assume qila) oladi
- Rol qaysi bucket'larni o'qiy oladi
- Rol qancha turadi
- Rol qaysi regionda
! Trust policy — rolning resurs siyosati: kim AssumeRole qila oladi. Nima qila olishi — permission policy'da.

? CloudTrail'da `AKIA` bilan boshlanadigan kalit ko'rindi. Bu nimani bildiradi?
- Vaqtinchalik STS kaliti, o'zi tugaydi
+ IAM user'ning doimiy kaliti — o'chirilmaguncha amal qiladi
- Root parol
- KMS kaliti
! AKIA — doimiy, ASIA — vaqtinchalik. Sizib chiqqan doimiy kalit darhol o'chirilishi kerak.

? `"Effect": "Allow", "NotAction": "iam:*", "Resource": "*"` siyosati haqida qaysi gap to'g'ri?
- U faqat IAM'ga ruxsat beradi
+ U IAM'dan tashqari hamma narsaga ruxsat beradi, jumladan kelajakdagi yangi xizmatlarga ham
- U hech narsaga ruxsat bermaydi
- U faqat o'qishga ruxsat beradi
! NotAction + Allow — "ro'yxatdagilardan tashqari hammasi"; juda keng va kutilmagan.

? Nega `iam:PassRole` doimo aniq `Resource` (rol ARN'i) bilan berilishi kerak?
- PassRole umuman xavfsiz, farqi yo'q
+ `*` bilan u istalgan rolni, jumladan admin rolini server yoki funksiyaga biriktirib, uning nomidan ish ko'rish imkonini beradi
- Aks holda siyosat saqlanmaydi
- PassRole faqat root uchun
! PassRole + resurs yaratish huquqi `*` bilan amalda admin huquqiga teng.

? Butun tashkilotda hech kim, hatto hisob admini ham CloudTrail'ni o'chira olmasligi uchun nima ishlatiladi?
- Har bir foydalanuvchiga eslatma
- Permission boundary faqat bitta user'ga
+ SCP'da `cloudtrail:StopLogging` va `DeleteTrail` uchun Deny
- Bucket policy
! SCP hisob darajasida ishlaydi va hisob ichidagi har qanday Allow'ni cheklaydi.

? Uchinchi tomon xizmatiga rol berishda external ID qaysi muammoni hal qiladi?
- Parol uzunligini
+ Confused deputy — xizmat boshqa mijozning so'rovi bilan sizning rolingizni kiyib qolishini
- Kalit almashtirishni
- Region tanlashni
! External ID faqat siz bilan kelishilgan qiymat bilan kelgan AssumeRole so'rovini qabul qiladi.

? Eng kam imtiyozli siyosat yozishda qaysi AWS vositasi CloudTrail'dagi haqiqiy amallarga qarab siyosat loyihasini yarata oladi?
- AWS Budgets
+ IAM Access Analyzer (policy generation)
- Route 53
- CloudFront
! Access Analyzer ishlatilgan amallar asosida siyosat taklif qiladi; uni ko'rib chiqib toraytirasiz.

? Hujumchi o'g'irlangan, lekin qonuniy ruxsatli kalit bilan S3'dan fayllarni o'qiyapti. IAM buni to'xtatadimi?
- Ha, IAM g'ayrioddiy xatti-harakatni avtomatik bloklaydi
+ Yo'q, IAM uchun bu ruxsatli identifikatsiya; buni monitoring va aniqlash vositalari ko'rishi kerak
- Ha, agar siyosatda Sid bo'lsa
- Faqat SCP bo'lmasa
! IAM "kim nimaga ruxsatli" ni tekshiradi, niyatni emas. O'g'irlangan kalit — monitoringning ishi.
:::

:::cards
IAM siyosati elementlari :: Effect, Principal, Action, Resource, Condition
Sukut bo'yicha :: Hamma narsa taqiqlangan — ruxsat faqat aniq Allow bilan
Aniq Deny :: Har qanday Allow'dan ustun turadi
Permission boundary :: Identity siyosati oshib o'ta olmaydigan maksimal chegara
SCP :: Organizations'da butun hisob uchun maksimal chegara, root'ni ham cheklaydi
Trust policy :: Rolni kim kiya olishini belgilaydigan resurs siyosati
STS AssumeRole :: Rolni kiyish — vaqtinchalik kalitlar (ASIA) qaytaradi
AKIA va ASIA :: AKIA — doimiy user kaliti; ASIA — vaqtinchalik STS kaliti
External ID :: Uchinchi tomon rollarida confused deputy muammosiga qarshi shart
NotAction + Allow :: Ro'yxatdagilardan tashqari hammasi — juda keng
iam:PassRole :: Rolni xizmatga uzatish; doim aniq rol ARN'i bilan
Credential report :: Barcha user'lar, MFA holati va kalitlar yoshi haqida CSV hisobot
:::
