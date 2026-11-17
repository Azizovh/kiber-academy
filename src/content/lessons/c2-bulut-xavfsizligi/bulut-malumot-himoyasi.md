c1 bosqichidagi onlayn do'konni eslang: 40 000 mijozning ma'lumoti ochiq bucket'da. Do'kon egasi keyin aytadi: "Lekin bizda shifrlash yoqilgan edi! Konsolda yozilgan: *Default encryption: Enabled*."

Bu gap to'g'ri — va hech narsani o'zgartirmaydi. S3'ning sukut bo'yicha shifrlashi fayllarni AWS ma'lumot markazidagi **disklarda** himoya qiladi. Kimdir diskni o'g'irlasa — ma'lumot o'qilmaydi. Lekin bucket ommaga ochiq bo'lsa, S3 har bir so'rovchiga faylni **o'zi ochib**, tayyor holda beradi. Shifrlash bor edi; kirish nazorati yo'q edi.

Bu dars — bulutdagi ma'lumotni himoyalashning to'liq rasmi: ma'lumotni tasniflash, shifrlash turlari va ular aslida nimadan himoya qilishi, KMS va kalit siyosatlari, S3 ochiqligini tekshirish va ma'lumotni yo'qolishdan (o'chirish, ransomware) saqlash.

## Avval: qanday ma'lumot va qayerda

Himoya darajasi ma'lumotning qiymatiga bog'liq. Hamma narsani bir xil qattiq himoyalash qimmat va amaliy emas; hech narsani himoyalamaslik — falokat.

| Tasnif | Misol (Qaydnoma) | Talab |
|---|---|---|
| Ommaviy | Sayt logotipi, landing sahifasi | Yaxlitlik (o'zgartirilmasin) |
| Ichki | Ichki hujjatlar, jurnallar | Faqat xodimlar |
| Maxfiy | Foydalanuvchi qaydlari, emaillar | Shifrlash, qat'iy kirish, audit |
| Qat'iy cheklangan | Parol xeshlari, to'lov ma'lumotlari, sirlar | Alohida kalit, minimal kirish, har bir o'qish jurnalga |

Muammo: ko'p kompaniyalar maxfiy ma'lumot **qayerda** yotganini bilmaydi. Dasturchi test uchun baza nusxasini S3'ga tashlagan, jurnalga to'liq so'rov tanalari yozilyapti, eski bucket'da 2019-yilgi eksport. **Amazon Macie** S3'dagi obyektlarni skanerlab, shaxsiy ma'lumotlarni (ism, telefon, karta raqami, kalitlar) topadi — himoyalashdan oldin topish kerak.

## Shifrlash: qayerda va nimadan himoya qiladi

Kriptografiya bosqichidan (s5) bilasiz: [[encryption|shifrlash]] ikki holatda kerak.

| Holat | Bulutda | Nimadan himoya qiladi |
|---|---|---|
| **In transit** (uzatishda) | TLS: HTTPS, bazaga TLS ulanish | Tarmoqda tinglash, o'rtadagi odam |
| **At rest** (saqlashda) | S3, EBS, RDS shifrlash | Fizik diskning o'g'irlanishi, noto'g'ri utilizatsiya, ba'zi kirish xatolari (KMS bilan) |

S3'da saqlashdagi shifrlash turlari:

| Tur | Kalit kimda | Kalit ustidan nazorat | Jurnal |
|---|---|---|---|
| **SSE-S3** | AWS, to'liq avtomatik | Yo'q | Yo'q |
| **SSE-KMS** (AWS managed key) | KMS, `aws/s3` kaliti | Cheklangan | Har bir foydalanish CloudTrail'da |
| **SSE-KMS** (customer managed key) | KMS, o'zingiz yaratgan kalit | **To'liq**: kalit siyosati, o'chirish, almashtirish | Har bir foydalanish CloudTrail'da |
| **SSE-C** | Siz har so'rovda kalit yuborasiz | To'liq, lekin kalitni o'zingiz saqlaysiz | — |
| **Client-side** | Ilova yuklashdan oldin o'zi shifrlaydi | To'liq | AWS ma'lumotni umuman ko'rmaydi |

Dars boshidagi savolga qaytamiz. SSE-S3 bilan ochiq bucket — ma'lumot hammaga ochiq, chunki S3 avtomatik ochadi. **Customer managed KMS kaliti** bilan esa vaziyat boshqacha: obyektni o'qish uchun ikki ruxsat kerak — `s3:GetObject` **va** shu kalit bo'yicha `kms:Decrypt`. Anonim foydalanuvchida KMS ruxsati yo'q — bucket tasodifan ochilsa ham, SSE-KMS bilan shifrlangan obyektlar o'qilmaydi.

:::key
Saqlashdagi shifrlashning haqiqiy kuchi — algoritmda emas, **kalit ustidan nazoratda**. Customer managed KMS kaliti ma'lumotga ikkinchi, mustaqil kirish qatlamini qo'shadi: S3 ruxsati xato berilsa ham, KMS kalit siyosati to'xtatadi. Va har bir ochish urinishi CloudTrail'ga yoziladi.
:::

## KMS qanday ishlaydi

[[kms|KMS]] kalitlari maxsus apparat modullarida (HSM) saqlanadi va **u yerdan hech qachon chiqmaydi**. Lekin gigabaytlik faylni KMS'ga yuborib shifrlash amaliy emas (KMS to'g'ridan-to'g'ri faqat 4 KB gacha ma'lumotni shifrlaydi). Shuning uchun **envelope encryption** (konvert shifrlash) ishlatiladi:

```
 1. Ilova:  KMS, menga ma'lumot kaliti ber  ──▶  KMS: GenerateDataKey
                                                     │
            ◀── ochiq ma'lumot kaliti + shifrlangan ma'lumot kaliti
 2. Ilova ochiq kalit bilan faylni shifrlaydi (AES-256), ochiq kalitni xotiradan o'chiradi
 3. Saqlanadi:  [shifrlangan fayl] + [shifrlangan ma'lumot kaliti]

 O'qishda:
 4. Ilova shifrlangan ma'lumot kalitini KMS'ga yuboradi ──▶ KMS: Decrypt (ruxsat tekshiriladi!)
 5. KMS ochiq ma'lumot kalitini qaytaradi → ilova faylni ochadi
```

Natija: asosiy kalit (KMS key) hech qachon KMS'dan chiqmaydi; har bir faylning o'z ma'lumot kaliti bor; har bir ochish — `Decrypt` chaqiruvi, ya'ni ruxsat tekshiruvi va jurnal yozuvi. S3, EBS, RDS buni siz uchun avtomatik bajaradi.

## KMS kalit siyosati

Har bir KMS kalitining **kalit siyosati** (key policy) bor — bu resurs siyosati, va KMS'da u asosiy hisoblanadi: kalit siyosati ruxsat bermasa, IAM siyosati yolg'iz yetmaydi.

Sukut bo'yicha kalit siyosati hisobning o'ziga to'liq huquq beradi — bu "IAM siyosatlari ham bu kalitga ruxsat bera olsin" degani:

```json
{
  "Sid": "EnableIAMPolicies",
  "Effect": "Allow",
  "Principal": { "AWS": "arn:aws:iam::111122223333:root" },
  "Action": "kms:*",
  "Resource": "*"
}
```

(Bu yerda `root` — root foydalanuvchi emas, **butun hisob** degani.)

Yaxshi kalit siyosati vazifalarni ajratadi:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "KeyAdministrators",
      "Effect": "Allow",
      "Principal": { "AWS": "arn:aws:iam::111122223333:role/SecurityAdmin" },
      "Action": [
        "kms:Describe*", "kms:List*", "kms:Get*", "kms:Put*",
        "kms:Enable*", "kms:Disable*", "kms:Update*", "kms:TagResource",
        "kms:ScheduleKeyDeletion", "kms:CancelKeyDeletion"
      ],
      "Resource": "*"
    },
    {
      "Sid": "KeyUsers",
      "Effect": "Allow",
      "Principal": { "AWS": "arn:aws:iam::111122223333:role/qaydnoma-ec2-role" },
      "Action": ["kms:Encrypt", "kms:Decrypt", "kms:GenerateDataKey*"],
      "Resource": "*",
      "Condition": {
        "StringEquals": { "kms:ViaService": "s3.eu-central-1.amazonaws.com" }
      }
    }
  ]
}
```

(Kalit siyosatida `"Resource": "*"` — "shu kalitning o'zi" degani. Kalit siyosatini tahrirlaganda doim kamida bitta ishlaydigan administrator qolishiga ishonch hosil qiling: hech kim boshqara olmaydigan kalitni faqat AWS Support orqali qaytarish mumkin.)

| Rol | Nima qila oladi | Nima qila olmaydi |
|---|---|---|
| Kalit administratori (`SecurityAdmin`) | Siyosatni o'zgartirish, yoqish/o'chirish, o'chirishni rejalash | Ma'lumotni ochish (`Decrypt` yo'q) |
| Kalit foydalanuvchisi (`qaydnoma-ec2-role`) | Shifrlash va ochish — faqat S3 orqali | Kalitni boshqarish |

`kms:ViaService` sharti: ilova roli kalitni faqat S3 orqali ishlatadi. Rol kalitlari o'g'irlansa ham, hujumchi `aws kms decrypt` ni to'g'ridan-to'g'ri chaqira olmaydi.

Kalit hayot sikli:

- **Avtomatik almashtirish** (rotation) — customer managed kalitlar uchun yoqiladi (sukut bo'yicha yiliga bir marta). Eski versiyalar saqlanadi — eski ma'lumotni ochish ishlayveradi.
- **O'chirish** darhol emas — 7 dan 30 kungacha kutish davri. Kalit o'chirilsa, u bilan shifrlangan **hamma narsa abadiy o'qib bo'lmaydigan** bo'ladi. Buni ataylab ishlatish mumkin ("crypto-shredding" — ma'lumotni yo'q qilish usuli), lekin xato bilan qilish — falokat.

:::warn
Hujumchi nuqtai nazaridan: kalitni o'chirishni rejalashtirish (`ScheduleKeyDeletion`) yoki o'chirib qo'yish (`DisableKey`) — bulutdagi ransomware usuli bo'lishi mumkin. Bu hodisalar CloudTrail'da yuqori ustuvorlikdagi signal bo'lishi kerak (b4 bosqichidagi jadvalda `DisableKey` bor edi). Kutish davri aynan shuning uchun mavjud: 7–30 kun ichida `CancelKeyDeletion` bilan qaytarish mumkin.
:::

## S3 ochiq qolganini tekshirish

Bucket "ommaviy" bo'lishining bir nechta yo'li bor — hammasini tekshirish kerak:

| Mexanizm | Qanday ochadi | Tekshirish |
|---|---|---|
| Bucket policy | `Allow` + `Principal: "*"` | `get-bucket-policy-status` |
| ACL (eski) | `AllUsers` yoki `AuthenticatedUsers` guruhiga ruxsat | `get-bucket-acl` |
| Access point | Access point siyosati orqali | Access point ro'yxati |
| Presigned URL | Muddatli imzolangan havola | Bucket'da ko'rinmaydi — ilova kodida |
| Boshqa hisobga ruxsat | Bucket policy'da tashqi hisob ID | IAM Access Analyzer |

```bash
# Hisob darajasidagi Block Public Access — eng muhim to'siq
aws s3control get-public-access-block --account-id 111122223333

# Bitta bucket: AWS uni ommaviy deb hisoblaydimi?
aws s3api get-bucket-policy-status --bucket qaydnoma-uploads-111122223333
# { "PolicyStatus": { "IsPublic": false } }

aws s3api get-public-access-block --bucket qaydnoma-uploads-111122223333
aws s3api get-bucket-encryption   --bucket qaydnoma-uploads-111122223333
```

Barcha bucket'lar uchun bitta-bitta tekshirish o'rniga:

- **Hisob darajasida Block Public Access** — to'rttala sozlama yoqilgan bo'lsa, hech bir bucket siyosat yoki ACL orqali ommaga ochilmaydi. Haqiqatan ommaviy fayllar kerak bo'lsa (sayt rasmlari), ular odatda CloudFront orqali beriladi — bucket esa yopiq qoladi.
- **IAM Access Analyzer** — hisobdan tashqariga (ommaga yoki boshqa hisoblarga) ochilgan bucket, KMS kalit, rol va boshqa resurslarni avtomatik ro'yxatlaydi.
- **AWS Config** qoidalari (`s3-bucket-public-read-prohibited` va boshqalar) va Security Hub — doimiy kuzatuv (keyingi dars).

**Presigned URL** — alohida eslatma. Ilova foydalanuvchiga "shu faylni 10 daqiqa yuklab olish mumkin" degan imzolangan havola beradi. Bucket yopiq qoladi — bu to'g'ri usul. Xavf: havola muddati juda uzun bo'lsa (kunlar) yoki havola jurnallarga, chatlarga tushsa. Azure'dagi SAS token bilan bir xil g'oya va bir xil xavf.

## Snapshotlar — unutilgan eshik

EBS disk va RDS baza **snapshot**'larini boshqa hisoblar bilan ulashish — yoki butunlay **ommaviy** qilish mumkin. Ommaviy snapshot — butun diskning nusxasi, istalgan AWS foydalanuvchisi uni o'z hisobida tiklay oladi. Bunday holatlar real auditlarda topilgan.

```bash
# Ommaviy qilingan EBS snapshotlaringiz
aws ec2 describe-snapshots --owner-ids self --restorable-by-user-ids all \
  --query "Snapshots[].SnapshotId"

# RDS snapshot'ning ulashish atributlari
aws rds describe-db-snapshot-attributes --db-snapshot-identifier qaydnoma-final
```

Natija bo'sh bo'lishi kerak. Hisob darajasida EBS snapshotlarni ommaviy qilishni bloklash sozlamasi ham bor (Block public access for EBS snapshots).

## Ma'lumotni yo'qolishdan saqlash

Maxfiylik — himoyaning yarmi. Ikkinchi yarmi — **mavjudlik**: ma'lumot o'chirilmasin, shifrlanmasin, buzilmasin.

| Vosita | Nimadan himoya qiladi |
|---|---|
| **Versioning** | Xato bilan o'chirish yoki ustidan yozish — eski versiya qaytariladi |
| **Object Lock** (WORM) | Belgilangan muddatgacha obyektni **hech kim**, hatto root ham o'chira olmaydi (compliance rejimida) |
| **Replication** | Boshqa region yoki **boshqa hisobga** nusxa |
| **AWS Backup + Vault Lock** | Markaziy zaxira, o'chirib bo'lmaydigan saqlash |
| **RDS avtomatik zaxira, snapshotlar** | Bazani vaqtning istalgan nuqtasiga tiklash |

c1 bosqichidagi 3-2-1 qoidasi bulutda shunday ko'rinadi: zaxira **boshqa hisobda**, Object Lock yoki Vault Lock bilan. Nega boshqa hisobda? Hujumchi asosiy hisobda admin bo'lib olsa, u yerdagi zaxiralarni ham o'chiradi. Alohida hisobdagi, o'chirib bo'lmaydigan zaxira — ransomware'ga qarshi oxirgi qal'a.

## Boshqa ma'lumot omborlari

- **RDS**: shifrlash yaratish paytida yoqiladi. Mavjud shifrlanmagan bazani to'g'ridan-to'g'ri shifrlab bo'lmaydi — snapshot olinadi, shifrlangan nusxasi yaratiladi va undan yangi baza tiklanadi. Shuning uchun boshidan yoqing.
- **EBS**: hisob darajasida "har doim shifrlash" sozlamasi (EBS encryption by default) — yangi disklar avtomatik shifrlanadi.
- **Jurnallar**: CloudWatch Logs guruhlari ham KMS bilan shifrlanadi. Jurnalga maxfiy ma'lumot yozilmasligi — undan ham muhimroq (a2 bosqichidagi xavfsiz jurnallash).

## Shifrlash nimani qilmaydi

- Kalitga ruxsati bor ilova buzilsa, hujumchi ilova nomidan ochiq ma'lumotni oladi. Shifrlash ruxsatli kirishni to'xtatmaydi.
- SSE-S3 noto'g'ri berilgan S3 ruxsatlaridan himoya qilmaydi.
- Versioning ransomware'dan to'liq himoya qilmaydi: yetarli huquqli hujumchi eski versiyalarni ham o'chiradi. Object Lock va alohida hisob kerak.
- Macie topgan narsani o'zi himoyalamaydi — u xabar beradi.

:::try
1. O'quv hisobingizda `aws s3control get-public-access-block` ni ishga tushiring. To'rttala sozlama `true`mi?
2. Customer managed KMS kaliti yarating va kalit siyosatida administrator va foydalanuvchini ajrating. Shu kalit bilan bucket'ga fayl yuklang, so'ng CloudTrail'da `GenerateDataKey` va `Decrypt` hodisalarini toping.
3. Savol: bucket xato bilan ommaga ochildi. Ichida SSE-S3 bilan shifrlangan `a.txt` va customer managed SSE-KMS bilan shifrlangan `b.txt` bor. Anonim foydalanuvchi qaysi birini o'qiy oladi?
4. `describe-snapshots --restorable-by-user-ids all` ni ishga tushiring. Natija bo'shmi?
5. Qaydnoma uchun ma'lumot himoyasi rejasini 5 qatorda yozing: qaysi ma'lumot qayerda, qanday shifrlangan, kim ocha oladi, zaxira qayerda.

**Javoblar:**
1. Yangi hisoblarda odatda hammasi `true`. Biror biri `false` bo'lsa — nega ekanini aniqlang va yoqing.
2. `GenerateDataKey` — yuklashda, `Decrypt` — yuklab olishda. `userIdentity` maydonida kim, `requestParameters.encryptionContext` da qaysi bucket va obyekt ekani ko'rinadi.
3. Faqat `a.txt`. `b.txt` uchun `kms:Decrypt` ruxsati kerak — anonim foydalanuvchida u yo'q.
4. Bo'sh bo'lishi kerak. Bo'sh bo'lmasa — snapshot ichida nima borligini aniqlang, ommaviylikni olib tashlang va bu insident sifatida baholanishi kerak (kim, qachon ochgan — CloudTrail'da `ModifySnapshotAttribute`).
5. Misol: qaydlar — RDS, KMS customer key, faqat ilova roli; yuklamalar — S3 SSE-KMS, faqat ilova roli `ViaService` bilan; sirlar — Secrets Manager; zaxiralar — alohida hisobda AWS Backup Vault Lock bilan; jurnallar — log hisobida, maxfiy maydonlarsiz.
:::

## Xulosa

- Avval tasniflang va toping: qaysi ma'lumot qayerda (Macie). Himoya qiymatga mos bo'lsin.
- Uzatishda — TLS; saqlashda — SSE. SSE-S3 diskni himoya qiladi, noto'g'ri ruxsatni emas.
- Customer managed KMS kaliti — ikkinchi mustaqil kirish qatlami: `s3:GetObject` va `kms:Decrypt` ikkalasi kerak; har bir ochish jurnalga yoziladi.
- Envelope encryption: KMS kaliti chiqmaydi, har bir obyektning o'z ma'lumot kaliti.
- Kalit siyosati: administrator va foydalanuvchini ajrating; `kms:ViaService` bilan toraytiring. Kalit o'chirilishi — ma'lumot yo'qolishi; `ScheduleKeyDeletion` — signal.
- S3 ochiqligi: hisob darajasida Block Public Access, Access Analyzer, Config. Presigned URL — qisqa muddat.
- Ommaviy snapshotlarni tekshiring.
- Mavjudlik: versioning, Object Lock, alohida hisobdagi zaxira.

:::quiz
? Bucket ommaga ochiq, obyektlar SSE-S3 bilan shifrlangan. Anonim foydalanuvchi faylni o'qiy oladimi?
+ Ha, S3 obyektni avtomatik ochib beradi — SSE-S3 kirish nazorati emas
- Yo'q, shifrlangan fayl o'qilmaydi
- Faqat kalitni bilsa
- Faqat HTTPS orqali bo'lmasa
! SSE-S3 diskdagi ma'lumotni himoya qiladi; ruxsatli (bu holatda — hamma) so'rovga S3 ochilgan faylni beradi.

? Customer managed KMS kaliti bilan shifrlangan obyektni o'qish uchun nima kerak?
- Faqat `s3:GetObject`
+ `s3:GetObject` va shu kalit bo'yicha `kms:Decrypt`
- Faqat root parol
- Faqat bucket nomi
! KMS ikkinchi, mustaqil ruxsat qatlamini qo'shadi.

? Envelope encryption'da KMS asosiy kaliti qayerda bo'ladi?
- Ilova serverining diskida
- Shifrlangan fayl yonida
+ KMS ichida, u yerdan hech qachon chiqmaydi
- Foydalanuvchi brauzerida
! Faylni ma'lumot kaliti shifrlaydi; ma'lumot kalitini KMS kaliti shifrlaydi va asosiy kalit HSM'da qoladi.

? Kalit siyosatida administrator va foydalanuvchini ajratishdan maqsad nima?
- Kalitni tezlashtirish
+ Kalitni boshqaradigan odam ma'lumotni ocha olmasin, ma'lumotni ishlatadigan ilova kalitni boshqara olmasin
- AWS xarajatini kamaytirish
- Avtomatik almashtirishni o'chirish
! Vazifalarni ajratish — bitta buzilgan identifikatsiya hamma narsani bermasligi uchun.

? `kms:ViaService` sharti nima beradi?
- Kalitni ommaga ochadi
+ Kalitni faqat belgilangan AWS xizmati (masalan, S3) orqali ishlatishga ruxsat beradi
- Kalitni boshqa regionga ko'chiradi
- Kalitni o'chiradi
! Rol kalitlari o'g'irlansa ham, kalitni to'g'ridan-to'g'ri KMS API orqali ishlatib bo'lmaydi.

? KMS kaliti o'chirilsa, u bilan shifrlangan ma'lumot nima bo'ladi?
- AWS uni avtomatik boshqa kalit bilan qayta shifrlaydi
+ Abadiy o'qib bo'lmaydigan bo'ladi
- Ochiq holda saqlanib qoladi
- Faqat 7 kun o'qilmaydi
! Shuning uchun o'chirishda 7–30 kunlik kutish davri bor va `ScheduleKeyDeletion` monitoringda yuqori ustuvor.

? Hisobdagi biror bucket siyosat yoki ACL orqali ommaga ochilmasligining eng ishonchli umumiy to'sig'i qaysi?
- Har bir bucket'ga eslatma yozish
+ Hisob darajasida to'rttala Block Public Access sozlamasini yoqish
- SSE-S3'ni yoqish
- Versioning'ni yoqish
! Hisob darajasidagi Block Public Access barcha bucket'lar uchun siyosat va ACL orqali ommaviylikni bekor qiladi.

? Nega EBS va RDS snapshotlarini tekshirish kerak?
- Ular har doim shifrlanmagan
+ Ularni ommaviy qilish mumkin — butun disk yoki bazaning nusxasi istalgan AWS foydalanuvchisiga ochiladi
- Ular CloudTrail'ni o'chiradi
- Ular faqat root'ga ko'rinadi
! Ommaviy snapshot — to'liq ma'lumot sizib chiqishi; `--restorable-by-user-ids all` bilan tekshiriladi.

? Ransomware'ga qarshi zaxira uchun eng kuchli variant qaysi?
- Xuddi shu hisobdagi, versioningsiz bucket
- Xuddi shu serverdagi papka
+ Alohida hisobdagi, Object Lock yoki Vault Lock bilan o'chirib bo'lmaydigan zaxira
- Faqat RDS avtomatik zaxirasi
! Asosiy hisobda admin bo'lgan hujumchi u yerdagi zaxiralarni o'chira oladi; alohida hisob va WORM uni to'xtatadi.

? Amazon Macie nima qiladi?
- S3 bucket'larni avtomatik shifrlaydi
+ S3'dagi obyektlarni skanerlab, shaxsiy va maxfiy ma'lumotlarni topadi
- Ommaviy bucket'larni o'chiradi
- KMS kalitlarini almashtiradi
! Macie topadi va xabar beradi; himoyalash — sizning keyingi qadamingiz.
:::

:::cards
Encryption at rest :: Saqlashdagi shifrlash — disk o'g'irlanishidan himoya
Encryption in transit :: Uzatishdagi shifrlash (TLS) — tarmoqda tinglashdan himoya
SSE-S3 :: AWS to'liq boshqaradigan S3 shifrlashi; kirish nazorati emas
SSE-KMS (customer managed) :: Kalit siyosati, jurnal va ikkinchi ruxsat qatlami beradigan shifrlash
Envelope encryption :: Ma'lumotni ma'lumot kaliti, ma'lumot kalitini KMS kaliti shifrlaydi
Key policy :: KMS kalitining resurs siyosati; KMS'da asosiy ruxsat manbai
kms:ViaService :: Kalitni faqat belgilangan xizmat orqali ishlatish sharti
ScheduleKeyDeletion :: Kalitni 7–30 kundan keyin o'chirish; ransomware signali bo'lishi mumkin
Block Public Access :: S3'da siyosat va ACL orqali ommaviylikni bekor qiladigan sozlama
Presigned URL :: Muddatli imzolangan havola; bucket yopiq qoladi
Object Lock :: Obyektni belgilangan muddatgacha o'chirib bo'lmaydigan qiladi (WORM)
Amazon Macie :: S3'da maxfiy ma'lumotlarni topadigan xizmat
:::
