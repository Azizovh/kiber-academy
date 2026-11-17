2019-yilda yirik bankdan 100 milliondan ortiq mijozning ma'lumoti o'g'irlandi. Hujumchi hech qanday murakkab zararli dastur yozmagan, nol-kunlik zaiflik topmagan. Zanjir uch bo'g'indan iborat edi:

1. Bankning bulutdagi web filtri noto'g'ri sozlangan edi — u tashqaridan kelgan so'rov bo'yicha **ichki manzillarga** so'rov yubora olardi ([[ssrf|SSRF]]).
2. Shu orqali hujumchi serverning **metadata xizmatidan** unga biriktirilgan rolning vaqtinchalik kalitlarini oldi.
3. Rolda keragidan ancha ko'p ruxsat bor edi — jumladan, mijozlar ma'lumoti saqlangan S3 bucket'larni o'qish.

Har bir bo'g'in alohida olganda "kichik" sozlama xatosi edi. Birgalikda — tarixdagi eng katta bank ma'lumotlari sizib chiqishlaridan biri.

Bu dars bulutdagi eng keng tarqalgan xatolar haqida: ular qanday ishlaydi, nega xavfli va qanday yopiladi. c2 bosqichining oldingi darslarida har bir himoya qatlamini alohida o'rgandik; endi ularni hujum zanjiri ichida ko'ramiz. Amaliy mashq — faqat buning uchun yaratilgan qonuniy laboratoriyalarda (flaws.cloud, CloudGoat).

## Eng keng tarqalgan xatolar

| Xato | Oqibat | Qaysi darsda himoyasi |
|---|---|---|
| Ochiq ombor (S3, blob, snapshot) | Ma'lumot to'g'ridan-to'g'ri sizib chiqadi | Ma'lumot himoyasi |
| Ortiqcha IAM ruxsatlari | Kichik buzilish katta zararga aylanadi | IAM chuqur |
| Sizib chiqqan kalitlar | Hujumchi siz nomingizdan API ishlatadi | Sirlarni boshqarish |
| IMDSv1 + SSRF | Server roli kalitlari o'g'irlanadi | Shu dars |
| Ochiq boshqaruv portlari va bazalar | To'g'ridan-to'g'ri kirish urinishlari | Tarmoq xavfsizligi |
| O'chirilgan yoki to'liq bo'lmagan jurnallar | Hujum ko'rinmaydi, tergov qilib bo'lmaydi | Monitoring |
| Ommaviy resurs siyosatlari (SQS, SNS, Lambda, KMS) | Begona hisoblar resursingizdan foydalanadi | IAM, Access Analyzer |
| Rol trust policy'sida `"AWS": "*"` | Har qanday AWS hisobi rolni kiya oladi | IAM chuqur |

Umumiy xususiyat: bularning hech biri provayder zaifligi emas. Hammasi — umumiy javobgarlik modelining **mijoz tomoni** (c1).

## 1. Ochiq omborlar

Ma'lumot himoyasi darsida ochiq bucket'ni qanday tekshirishni ko'rdik. Hujumchi tomonidan savol: u bucket nomini qayerdan biladi?

- Saytning manba kodida rasmlar va skriptlar manzili: `https://qaydnoma-assets.s3.amazonaws.com/logo.png`.
- DNS yozuvlari (CNAME bucket'ga ishora qiladi).
- Mobil ilova ichidagi konfiguratsiya fayllari.
- Taxmin qilish: `kompaniya-backup`, `kompaniya-dev`, `kompaniya-logs`… Avtomatik vositalar shunday ro'yxatlarni sinab chiqadi.

Shuning uchun **bucket nomini yashirish himoya emas**. Himoya — hisob darajasidagi Block Public Access va Access Analyzer. Ommaga haqiqatan kerak bo'lgan fayllar (sayt rasmlari) alohida bucket'da, CloudFront orqali — va u bucket'da boshqa hech narsa yo'q.

Xuddi shu muammo boshqa joylarda ham: ommaviy EBS va RDS snapshotlari, ommaviy AMI'lar (ichida eski parollar yoki kalitlar bilan), Azure'da anonim blob kirishi, GCP'da `allUsers` ga berilgan ruxsat.

## 2. Metadata xizmati va SSRF

### IMDS nima

Har bir EC2 server ichidan maxsus manzil ochiladi — `169.254.169.254`. Bu [[imds|IMDS]] (Instance Metadata Service): server o'zi haqida ma'lumot oladigan joy — qaysi regionda, qanday IP bilan, qanday user data bilan ishga tushgan va eng muhimi — **unga biriktirilgan IAM rolning vaqtinchalik kalitlari**.

c1 bosqichida "kalit o'rniga rol" dedik. Rol kalitlari aynan IMDS orqali beriladi: AWS SDK ularni avtomatik shu yerdan oladi. Bu to'g'ri dizayn — kalit hech qayerda yozilmaydi. Lekin bitta shart bilan: IMDS'ga **faqat serverning o'zi** murojaat qilishi kerak.

### SSRF qanday aralashadi

AppSec tarmog'idagi SSRF darsini eslang (a2): ilova foydalanuvchi bergan manzilga so'rov yuboradi (masalan, "rasmni URL bo'yicha yuklash" funksiyasi). Agar ilova manzilni tekshirmasa, hujumchi unga **ichki** manzil beradi. So'rov server ichidan ketadi — demak, IMDS uchun bu "serverning o'zi".

```
 Hujumchi                Ilova (EC2)                       IMDS 169.254.169.254
    │  "shu URL'dan          │                                    │
    │   rasm yukla: ichki    │                                    │
    │   manzil"              │                                    │
    │───────────────────────▶│  GET (server ichidan)              │
    │                        │───────────────────────────────────▶│
    │                        │◀──────── rol kalitlari (JSON) ──────│
    │◀── javobni qaytaradi ──│                                    │
    │                                                             │
    │  Kalitlar bilan o'z kompyuteridan AWS API ──▶ S3, ...        │
```

Oxirgi qator — oldingi darsdagi GuardDuty topilmasi: `InstanceCredentialExfiltration.OutsideAWS`. Rol kalitlari AWS tashqarisidan ishlatilmoqda.

### IMDSv1 va IMDSv2

| | IMDSv1 | IMDSv2 |
|---|---|---|
| So'rov | Oddiy `GET` | Avval `PUT` bilan sessiya tokeni olinadi, keyin `GET` sarlavhada shu token bilan |
| SSRF bilan | Ko'pincha ishlaydi — SSRF odatda oddiy GET yuboradi | Ancha qiyin — ko'pchilik SSRF zaifliklari `PUT` yubora olmaydi va maxsus sarlavha qo'sha olmaydi |
| Tarmoqdan chiqish | — | Token javobining TTL (hop limit) sukut bo'yicha 1 — paket serverdan tashqariga, konteyner yoki proksi orqali o'tmaydi |
| `X-Forwarded-For` bilan so'rov | Qabul qiladi | Rad etadi — proksi orqali kelgan so'rovlarga qarshi |

O'z serveringiz ichidan IMDSv2 qanday ishlatilishini AWS hujjatlari ko'rsatadi:

```bash
# Serverning o'zida — avval token, keyin so'rov
TOKEN=$(curl -s -X PUT "http://169.254.169.254/latest/api/token" \
  -H "X-aws-ec2-metadata-token-ttl-seconds: 21600")
curl -s -H "X-aws-ec2-metadata-token: $TOKEN" \
  http://169.254.169.254/latest/meta-data/placement/region
```

### Himoya — qatlamlab

| Qatlam | Chora |
|---|---|
| IMDS | **IMDSv2 majburiy** (`HttpTokens=required`), hop limit 1 |
| Hisob darajasi | Yangi serverlar uchun sukut sozlamasi — IMDSv2 majburiy |
| Siyosat | SCP yoki IAM sharti: `ec2:MetadataHttpTokens` = `required` bo'lmagan `RunInstances` rad etilsin |
| Ilova | SSRF'ning o'zini yopish: ruxsat etilgan manzillar ro'yxati, ichki va link-local manzillarni rad etish (a2) |
| Rol | Eng kam imtiyoz — kalitlar o'g'irlansa ham, zarar kichik |
| Rol sharti | Ba'zi xizmatlar uchun `aws:SourceVpc` / `aws:SourceVpce` — kalit faqat VPC ichidan ishlasin |
| Aniqlash | GuardDuty, CloudTrail'da rol kalitlarining tashqi IP'dan ishlatilishi |
| Kerak bo'lmasa | IMDS'ni butunlay o'chirish (`HttpEndpoint=disabled`) |

```bash
# Mavjud serverda IMDSv2'ni majburiy qilish
aws ec2 modify-instance-metadata-options --instance-id i-0abc123def4567890 \
  --http-tokens required --http-put-response-hop-limit 1

# Hisob darajasidagi sukut — shu regionda yangi serverlar uchun
aws ec2 modify-instance-metadata-defaults --http-tokens required

# Qaysi serverlarda hali IMDSv1 ruxsat etilgan
aws ec2 describe-instances \
  --query "Reservations[].Instances[?MetadataOptions.HttpTokens=='optional'].InstanceId"
```

:::warn
IMDSv2'ni majburiy qilishdan oldin serverdagi dasturlar uni qo'llab-quvvatlashini tekshiring: juda eski AWS SDK yoki agentlar faqat v1 bilan ishlashi mumkin. CloudWatch'dagi `MetadataNoToken` metrikasi — v1 so'rovlari soni. U nolga tushgach, majburiy qiling.
:::

:::key
Dars boshidagi zanjirning har bir bo'g'ini alohida yopilishi mumkin edi: SSRF'ni tuzatish, IMDSv2, rol ruxsatlarini toraytirish, tashqi IP'dan rol ishlatilishini aniqlash. Chuqur himoyaning ma'nosi — **bitta** bo'g'in uzilsa ham, zanjir ishlamaydi.
:::

## 3. Sizib chiqqan kalitlar

Doimiy access key'lar qayerda sizib chiqadi:

| Joy | Qanday |
|---|---|
| Git repozitoriylar | Kodga yoki `.env` faylga yozilgan va commit qilingan; keyin o'chirilgan bo'lsa ham, Git tarixida qoladi |
| Konteyner image'lari | `COPY . .` bilan image'ga tushgan `.aws/credentials` |
| CI/CD jurnallari | Debug uchun muhit o'zgaruvchilarini chop etish |
| Mobil ilovalar | Ilova ichiga "faqat o'qish uchun" deb joylangan kalit |
| Frontend JavaScript | Brauzerdan to'g'ridan-to'g'ri S3'ga yuklash uchun |
| Chat va tiketlar | "Shu kalit bilan sinab ko'r" |

Ommaviy GitHub'ga tushgan kalitni avtomatik botlar **daqiqalar** ichida topadi — c1 bosqichidagi talaba hikoyasi. GitHub secret scanning ma'lum formatdagi AWS kalitlarini topib, AWS'ga xabar beradi; AWS esa kalitga maxsus karantin siyosatini biriktirib, hisob egasiga xat yuboradi. Bu foydali xavfsizlik to'ri, lekin unga tayanmang: u hamma joyni qamramaydi va kalit sizib chiqqan daqiqadan to karantingacha vaqt o'tadi.

Himoya — a3 bosqichidagi sirlarni boshqarish va shu bosqichning sirlar darsi:

- Doimiy kalitlar o'rniga rollar va vaqtinchalik kalitlar (Identity Center, IAM role, OIDC).
- Pre-commit va CI'da sir skanerlash (gitleaks va shu kabilar).
- Mavjud kalitlarning yoshi va oxirgi ishlatilishi monitoringi (credential report).
- Kalit sizib chiqqanda — darhol o'chirish, keyin tergov (c4 bosqichi).

## 4. Boshqa tez-tez uchraydiganlar

- **Lambda muhit o'zgaruvchilaridagi sirlar** — funksiya konfiguratsiyasini o'qiy oladigan har kim ularni ko'radi.
- **User data'dagi sirlar** — IMDS orqali va `DescribeInstanceAttribute` bilan o'qiladi (c1 bosqichidagi eslatma).
- **Ommaviy SQS, SNS, Lambda siyosatlari** — `Principal: "*"` bilan; begona hisoblar xabar yuboradi yoki funksiyani chaqiradi.
- **Keng trust policy** — `"Principal": {"AWS": "*"}` shartsiz: istalgan AWS hisobidagi istalgan kishi rolni kiya oladi. Access Analyzer buni darhol ko'rsatadi.
- **Ishlatilmayotgan, unutilgan resurslar** — eski test serveri, yangilanmagan va jurnalga ulanmagan. Hujumchi uchun eng qulay kirish nuqtasi. Teglar va muntazam inventarizatsiya (c1).

## Hujumchi zanjiri va ATT&CK

MITRE ATT&CK'ning bulut matritsasi (b2 bosqichi) bu usullarni nomlaydi:

| Bosqich | Usul | ATT&CK |
|---|---|---|
| Kirish | Sizib chiqqan yoki o'g'irlangan kalit bilan kirish | T1078.004 Valid Accounts: Cloud Accounts |
| Kalitlarni olish | Metadata xizmatidan kalitlar | T1552.005 Unsecured Credentials: Cloud Instance Metadata API |
| O'rganish | Hisobdagi resurslarni ro'yxatlash | Discovery taktikasi (Cloud Service Discovery va boshqalar) |
| Ma'lumot olish | Bulut omboridan ma'lumot | T1530 Data from Cloud Storage |
| Ta'sir | Kriptomayning uchun resurs | T1496 Resource Hijacking |

Har bir usul uchun detection rule va himoya chorasi bor — bu bosqichdagi darslar aynan shu jadvalning ikkinchi yarmi.

## Qonuniy amaliyot

Bulut hujumlarini faqat **buning uchun yaratilgan** muhitlarda yoki **o'z** hisobingizda mashq qiling. Begona hisob yoki bucket'ga ruxsatsiz kirish urinishi — qonunbuzarlik, hatto bucket "ochiq turgan" bo'lsa ham.

| Laboratoriya | Nima | Eslatma |
|---|---|---|
| **flaws.cloud** | Brauzer orqali, ketma-ket darajalar; har biri bitta keng tarqalgan xatoni o'rgatadi | Bepul, o'rnatish shart emas. Har darajada maslahatlar bor |
| **flaws2.cloud** | Ikki yo'l: hujumchi va **himoyachi** (jurnallar orqali tergov) | Himoyachi yo'li c4 bosqichidagi bulut IR uchun ideal |
| **CloudGoat** | Zaif stsenariylarni **o'z** AWS hisobingizda Terraform bilan ko'taradi | Pullik resurslar bo'lishi mumkin; har mashqdan keyin `destroy` |

flaws.cloud yechimlarini bu yerda bermaymiz — har bir darajani o'zingiz yechish, so'ng **har bir xatoni qaysi sozlama yopishini** yozib chiqish maqsadga muvofiq. Har bir daraja uchun shunday jadval tuzing:

| Daraja | Xato | Qanday topiladi (himoyachi) | Qanday yopiladi |
|---|---|---|---|
| 1 | … | … | … |

Bu jadval portfolio uchun ham yaxshi material (c4).

## Bu darsdagi choralar nimani qilmaydi

- IMDSv2 SSRF zaifligini yo'q qilmaydi — u faqat bitta, eng xavfli natijasini qiyinlashtiradi. SSRF orqali boshqa ichki xizmatlarga so'rov yuborish imkoni qoladi.
- Block Public Access ruxsatli, lekin buzilgan identifikatsiya orqali o'g'irlashni to'xtatmaydi.
- Kalit skanerlash allaqachon sizib chiqqan va nusxalangan kalitni qaytarmaydi.
- Bitta tekshiruv — bitta lahza. Ertaga kimdir yangi bucket yoki server yaratadi. Shuning uchun keyingi dars — avtomatik va doimiy tekshiruv.

:::try
1. flaws.cloud'ning birinchi uchta darajasini yeching. Har biri uchun yuqoridagi jadvalni to'ldiring.
2. O'quv hisobingizda `describe-instances` buyrug'i bilan IMDSv1 ruxsat etilgan serverlarni toping. Ularni IMDSv2'ga o'tkazing.
3. Hisob darajasidagi IMDS sukut sozlamasini o'rnating va yangi server ko'tarib, uning `MetadataOptions` qiymatini tekshiring.
4. Dars boshidagi bank zanjiri uchun har bir bo'g'inga qarshi bitta oldini olish va bitta aniqlash chorasini yozing.
5. Savol: server IMDSv2 bilan, lekin unga `AdministratorAccess` rol biriktirilgan. Bu holat xavfsizmi?

**Javoblar:**
1. Yechimlar o'zingizda qolsin. Jadvalning "qanday yopiladi" ustunida odatda Block Public Access, eng kam imtiyoz, sirlarni koddan olib tashlash, IMDSv2 kabi shu bosqich mavzulari takrorlanadi — bu tasodif emas.
2. Natija bo'sh bo'lishi kerak. Bo'sh bo'lmasa, avval `MetadataNoToken` metrikasini tekshiring, so'ng `modify-instance-metadata-options`.
3. Yangi serverda `HttpTokens: required` ko'rinadi.
4. Misol: (1) SSRF — oldini olish: manzillar ro'yxati, ichki manzillarni rad etish; aniqlash: WAF va ilova jurnallarida ichki manzilli so'rovlar. (2) IMDS — oldini olish: IMDSv2; aniqlash: `MetadataNoToken`, GuardDuty. (3) Keng rol — oldini olish: faqat kerakli bucket va amallar; aniqlash: rol kalitlarining tashqi IP'dan ishlatilishi, odatdan tashqari ko'p `GetObject` (data events).
5. Yo'q. IMDSv2 bitta yo'lni qiyinlashtiradi, lekin server buzilsa (masalan, ilovada kod bajarish zaifligi), hujumchi kalitlarni server ichidan oladi va butun hisobni boshqaradi. Eng kam imtiyoz — mustaqil, majburiy qatlam.
:::

## Xulosa

- Bulutdagi yirik buzilishlar ko'pincha bir nechta "kichik" sozlama xatosining zanjiri.
- Ochiq omborlar: bucket nomi sir emas; himoya — Block Public Access, Access Analyzer, ommaviy fayllar uchun alohida bucket va CloudFront.
- IMDS server roli kalitlarini beradi. SSRF + IMDSv1 — kalit o'g'irlash yo'li. Himoya: IMDSv2 majburiy, hop limit 1, hisob sukut sozlamasi, SCP sharti, SSRF'ni tuzatish, eng kam imtiyoz, GuardDuty.
- Doimiy kalitlar Git, image, CI jurnali, mobil ilova va frontend orqali sizib chiqadi; botlar ularni daqiqalarda topadi.
- Lambda va user data'dagi sirlar, ommaviy resurs siyosatlari, `"AWS": "*"` trust policy — tez-tez uchraydigan qolgan xatolar.
- Amaliyot faqat qonuniy laboratoriyalarda: flaws.cloud, flaws2.cloud, o'z hisobingizda CloudGoat.

:::quiz
? Dars boshidagi bank hodisasida hujum zanjiri qaysi?
- Nol-kunlik zaiflik → zararli dastur → shifrlash
+ SSRF → metadata xizmatidan rol kalitlari → keng ruxsatli rol orqali S3'dan ma'lumot
- Fishing → parol → VPN
- DDoS → xizmat to'xtashi
! Uch "kichik" sozlama xatosi birgalikda katta sizib chiqishga olib keldi.

? IMDS nima beradi?
- Barcha AWS hisoblari ro'yxatini
+ Server haqida ma'lumot va unga biriktirilgan IAM rolning vaqtinchalik kalitlarini
- Root parolni
- S3 bucket mazmunini
! IMDS server ichidan ochiladigan 169.254.169.254 manzilidagi xizmat; SDK rol kalitlarini shu yerdan oladi.

? Nega IMDSv2 SSRF'ga qarshi IMDSv1 dan ancha kuchliroq?
+ U avval PUT so'rovi bilan token olishni va keyin uni sarlavhada yuborishni talab qiladi — ko'pchilik SSRF zaifliklari buni qila olmaydi
- U shifrlashdan foydalanadi, v1 esa yo'q
- U kalitlarni umuman bermaydi
- U faqat Windows'da ishlaydi
! Oddiy GET bilan ishlaydigan SSRF v2 tokenini ololmaydi; hop limit 1 esa tokenning serverdan tashqariga chiqishini to'xtatadi.

? IMDSv2'ni majburiy qilishdan oldin nimani tekshirish kerak?
- Server qaysi regionda ekanini
+ Serverdagi dasturlar v2'ni qo'llab-quvvatlashini, masalan `MetadataNoToken` metrikasi orqali
- Root MFA yoqilganini
- Bucket nomini
! Eski SDK yoki agentlar faqat v1 bilan ishlashi mumkin; metrika nolga tushgach majburiy qilish xavfsiz.

? Nega S3 bucket nomini yashirish himoya emas?
- Bucket nomlari umuman ishlatilmaydi
+ Nomlar sayt kodida, DNS'da, mobil ilovalarda ko'rinadi yoki avtomatik taxmin qilinadi
- AWS nomlarni o'zi e'lon qiladi
- Yashirilgan nom ishlamaydi
! Himoya — kirish nazorati (Block Public Access, siyosatlar), nomning maxfiyligi emas.

? GitHub'ga tushgan AWS kaliti uchun qaysi gap to'g'ri?
- Commit o'chirilsa, xavf yo'qoladi
+ Botlar uni daqiqalarda topishi mumkin; commit o'chirilsa ham Git tarixida qoladi — kalitni darhol o'chirish kerak
- AWS kalitni avtomatik va darhol o'chiradi, hech narsa qilish shart emas
- Faqat xususiy repozitoriylar xavfli
! GitHub va AWS karantin to'ri foydali, lekin unga tayanmasdan kalitni o'zingiz o'chirasiz.

? Rol trust policy'sida shartsiz `"Principal": {"AWS": "*"}` nimani anglatadi?
- Faqat o'z hisobingiz rolni kiya oladi
+ Istalgan AWS hisobidagi istalgan identifikatsiya rolni kiya oladi
- Hech kim rolni kiya olmaydi
- Faqat EC2 xizmati
! Bu jiddiy xato; IAM Access Analyzer uni tashqi kirish sifatida ko'rsatadi.

? Server IMDSv2 bilan, lekin unga AdministratorAccess biriktirilgan. Xavfsizmi?
- Ha, IMDSv2 yetarli
+ Yo'q — server boshqa yo'l bilan buzilsa, hujumchi kalitlarni ichkaridan olib butun hisobni boshqaradi; eng kam imtiyoz alohida kerak
- Ha, agar SSH yopiq bo'lsa
- Faqat dam olish kunlari xavfli
! Himoya qatlamlari bir-birini almashtirmaydi.

? MITRE ATT&CK'da metadata xizmatidan kalit olish qaysi usulga to'g'ri keladi?
- T1530 Data from Cloud Storage
+ T1552.005 Unsecured Credentials: Cloud Instance Metadata API
- T1496 Resource Hijacking
- T1078.004 Valid Accounts: Cloud Accounts
! T1552.005 — aynan bulut metadata API orqali kalitlarni olish.

? Bulut hujumlarini qayerda mashq qilish to'g'ri?
- Ochiq turgan har qanday bucket'da, chunki u ochiq
- Kompaniyaning ishlab chiqarish hisobida, ruxsatsiz
+ flaws.cloud, flaws2.cloud kabi maxsus laboratoriyalarda va o'z hisobingizda (CloudGoat)
- Raqobatchi kompaniya hisobida
! Ruxsatsiz kirish urinishi resurs ochiq bo'lsa ham qonunbuzarlik.
:::

:::cards
IMDS :: 169.254.169.254 — server metama'lumoti va rol kalitlarini beradigan ichki xizmat
IMDSv2 :: PUT bilan token, keyin sarlavhali GET; SSRF'ga qarshi ancha kuchli
Hop limit 1 :: IMDSv2 token javobi serverdan tashqariga o'tmasligi uchun TTL
HttpTokens=required :: IMDSv2'ni majburiy qiladigan sozlama
MetadataNoToken :: IMDSv1 so'rovlari sonini ko'rsatadigan CloudWatch metrikasi
SSRF → IMDS :: Ilova orqali ichki metadata manziliga so'rov yuborib, rol kalitlarini olish
Bucket nomi :: Sir emas — himoya kirish nazorati bilan
Sizib chiqqan kalit :: Darhol o'chiriladi; Git tarixidan o'chirish yetmaydi
"AWS": "*" trust policy :: Istalgan AWS hisobiga rolni kiyish imkonini beradigan xato
T1552.005 :: ATT&CK: bulut metadata API orqali kalitlarni olish
flaws.cloud :: Bulut xatolarini o'rgatadigan bepul qonuniy laboratoriya
CloudGoat :: O'z hisobingizda zaif stsenariylar ko'taradigan vosita; keyin destroy
:::
