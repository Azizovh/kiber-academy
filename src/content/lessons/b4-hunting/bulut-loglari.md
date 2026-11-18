Dasturchi kodini GitHub'ga joyladi. Kod ichida — bir qator, u yerda unutilib qolgan bulut **access key**. 4 daqiqadan keyin noma'lum IP'dan shu kalit bilan kimdir kompaniya bulut hisobining barcha resurslari ro'yxatini so'raydi. 20 daqiqadan keyin hisobda o'zi qimmat serverlar ishga tushiriladi — kriptovalyuta qazish uchun. Ertalab — katta hisob-kitob va savol: "Hujumchi yana nimaga kirdi? Mijozlar ma'lumotlari saqlanadigan omborni ochganmi?"

Bu hujumda hech qanday kompyuter buzilmagan, hech qanday zararli dastur ishga tushmagan. EDR jim, Sysmon jim. Hamma narsa **bulutda** sodir bo'ldi — va javob faqat **bulut loglarida**.

Kompaniyalar tobora ko'proq bulutga ko'chmoqda. Shuning uchun zamonaviy SOC analitigi Windows va Linux loglari bilan birga bulut loglarini ham o'qiy olishi kerak. Cloud tarmog'ida bu mavzu chuqur o'rganiladi; bu darsda — SOC analitigi uchun asosiy narsalar.

## Bulutda nima boshqacha

[[cloud|Bulut]] xavfsizligi an'anaviy tarmoqdan bir necha muhim jihat bilan farq qiladi:

| An'anaviy tarmoq | Bulut |
|---|---|
| Chegara — firewall | Chegara — **identifikatsiya** (kim, qaysi kalit bilan) |
| Hujumchi avval kompyuterga kirishi kerak | Hujumchiga faqat **hisob ma'lumotlari** yoki kalit kerak — internetning istalgan joyidan |
| Server yaratish — kunlar | Server yaratish — **soniyalar** (va pul — darhol) |
| Loglar qurilmalarda | Loglar — **API chaqiruvlari** yozuvlari |
| Siz boshqarasiz | **Umumiy javobgarlik**: provayder infratuzilmani, siz — sozlamalar va kirishni |

Eng muhim qator — birinchisi. Bulutda deyarli hamma narsa **API orqali** bajariladi: konsolda tugma bosish ham, terminaldagi buyruq ham, dasturdagi kod ham — oxir-oqibat API chaqiruvi. Va har bir API chaqiruvi yoziladi. Shuning uchun bulut loglari asosan bitta savolga javob beradi: **kim, qachon, qayerdan, qaysi identifikatsiya bilan, qanday amal bajardi?**

## AWS CloudTrail

[[cloudtrail|CloudTrail]] — AWS'dagi audit jurnali. Har bir API chaqiruvi — bitta JSON yozuv:

```json
{
  "eventTime": "2026-11-16T22:14:07Z",
  "eventSource": "iam.amazonaws.com",
  "eventName": "CreateAccessKey",
  "awsRegion": "us-east-1",
  "sourceIPAddress": "203.0.113.77",
  "userAgent": "aws-cli/2.15.0 Python/3.11 Linux",
  "userIdentity": {
    "type": "IAMUser",
    "userName": "ci-deploy",
    "arn": "arn:aws:iam::111122223333:user/ci-deploy",
    "accessKeyId": "AKIA...EXAMPLE"
  },
  "requestParameters": { "userName": "backup-svc" },
  "responseElements": { "accessKey": { "userName": "backup-svc", "status": "Active" } },
  "errorCode": null
}
```

| Maydon | Savol |
|---|---|
| `eventTime` | Qachon (doim UTC — b1 bosqichidan beri yoqtirgan narsamiz) |
| `eventSource` | Qaysi xizmat (`iam`, `s3`, `ec2`, `signin`…) |
| `eventName` | Qanday amal |
| `userIdentity` | **Kim** — foydalanuvchi, rol, root, xizmat; qaysi kalit bilan |
| `sourceIPAddress` | Qayerdan |
| `userAgent` | Qanday vosita bilan (konsol, CLI, SDK) |
| `requestParameters` | Nima so'raldi |
| `errorCode` | Muvaffaqiyatsiz bo'ldimi (`AccessDenied`…) |
| `awsRegion` | Qaysi mintaqada |

Bu misolni o'qing: `ci-deploy` (CI/CD uchun xizmat hisobi) tashqi IP'dan CLI orqali **boshqa** foydalanuvchi uchun yangi kalit yaratdi. CI tizimi odatda bunday qilmaydi — bu hujumchining o'ziga zaxira kirish yo'lini yaratishi bo'lishi mumkin (b2 bosqichidagi ATT&CK: persistence).

### Muhim cheklovlar

- CloudTrail **Event history** standart holatda oxirgi **90 kunlik** boshqaruv hodisalarini ko'rsatadi. Uzoqroq saqlash va SIEM'ga yuborish uchun **trail** yaratish kerak (loglar S3 omboriga yoziladi).
- **Management events** (resurslarni yaratish, o'zgartirish, o'chirish) standart holatda yoziladi. **Data events** (masalan, S3 ombordagi har bir faylni o'qish) — alohida yoqiladi va pullik. Ya'ni "hujumchi mijozlar faylini **o'qidimi**?" degan savolga javob faqat data events yoqilgan bo'lsa bor.

Bu b1 bosqichidagi "audit sozlamalari" mavzusining bulutdagi ko'rinishi: **yozilmagan narsani tergov qilib bo'lmaydi.**

## Shubhali CloudTrail hodisalari

| Hodisa (`eventName`) | Nega shubhali | ATT&CK taktikasi |
|---|---|---|
| `ConsoleLogin` — notanish IP, MFA'siz, `root` | Hisob buzilishi | Initial Access |
| Har qanday amal `userIdentity.type = Root` | Root hisob kundalik ishda ishlatilmasligi kerak | — |
| `ListBuckets`, `DescribeInstances`, `GetCallerIdentity` — yangi kalitdan ketma-ket | Razvedka: "men kimman va bu yerda nima bor?" | Discovery |
| `CreateUser`, `CreateAccessKey`, `CreateLoginProfile` | Yangi kirish yo'li | Persistence |
| `AttachUserPolicy` / `PutUserPolicy` — `AdministratorAccess` | Huquqlarni oshirish | Privilege Escalation |
| **`StopLogging`, `DeleteTrail`, `UpdateTrail`** | **Audit jurnalini o'chirish** — Windows'dagi 1102 ning bulutdagi aynan o'zi | Defense Evasion |
| `DeleteDetector` (GuardDuty), `DisableKey` (KMS) | Himoya vositalarini o'chirish | Defense Evasion |
| `PutBucketPolicy`, `PutBucketAcl`, `PutPublicAccessBlock` o'zgarishi | Ombor ommaga ochilmoqda | Exfiltration |
| `AuthorizeSecurityGroupIngress` — `0.0.0.0/0` | Server portlari butun internetga ochilmoqda | — |
| `RunInstances` — g'ayrioddiy mintaqada, ko'p va kuchli serverlar | Kriptomayning — dars boshidagi holat | Impact |
| `GetSecretValue` — ko'p sirlar ketma-ket | Parol va kalitlarni yig'ish | Credential Access |

E'tibor bering: `StopLogging` — eng muhim ogohlantirishlardan biri. b1 bosqichidagi qoida bu yerda ham amal qiladi: oddiy ish kunida hech kim audit jurnalini o'chirmaydi.

### CloudTrail loglarini qidirish

Kichik hajm uchun — `jq` (Suricata darsidagi EVE JSON kabi):

```bash
# Barcha "StopLogging" va "DeleteTrail" hodisalari
jq -c '.Records[] | select(.eventName=="StopLogging" or .eventName=="DeleteTrail")
       | [.eventTime, .userIdentity.arn, .sourceIPAddress]' cloudtrail_*.json

# Muvaffaqiyatsiz amallar — kim ko'p "AccessDenied" oldi? (razvedka belgisi)
jq -r '.Records[] | select(.errorCode=="AccessDenied") | .userIdentity.arn' cloudtrail_*.json \
  | sort | uniq -c | sort -nr | head
```

Katta hajm uchun — SQL bilan (**Amazon Athena** yoki **CloudTrail Lake**) yoki SIEM'da:

```sql
SELECT eventtime, eventname, useridentity.arn, sourceipaddress, useragent
FROM cloudtrail_logs
WHERE eventname IN ('StopLogging', 'DeleteTrail', 'CreateAccessKey', 'AttachUserPolicy')
  AND eventtime > '2026-11-15'
ORDER BY eventtime;
```

Ikkinchi jq so'rovi muhim naqshni ko'rsatadi: o'g'irlangan kalit bilan hujumchi ko'pincha **ko'p turli amallarni sinab ko'radi** — va ko'pi `AccessDenied` bilan tugaydi. Bitta kalitdan qisqa vaqtda ko'p turli xizmatlarga ko'p rad etilgan so'rovlar — razvedka belgisi.

**GuardDuty** — AWS'ning boshqariladigan aniqlash xizmati: CloudTrail, tarmoq va DNS loglarini avtomatik tahlil qilib, shubhali holatlar haqida ogohlantiradi (masalan, kalit odatiy bo'lmagan joydan ishlatildi). U b2 bosqichidagi SIEM qoidalarining tayyor, bulutdagi ekvivalenti — lekin u ham faqat o'zi ko'radigan narsani aniqlaydi.

## Microsoft Azure va Entra ID

Microsoft bulutida loglar bir nechta joyda:

| Log | Nimani yozadi |
|---|---|
| **Entra ID Sign-in logs** | Barcha kirishlar: kim, qayerdan, qaysi ilovaga, MFA, natija |
| **Entra ID Audit logs** | Hisoblar, guruhlar, rollar, ilovalar o'zgarishlari |
| **Azure Activity log** | Azure resurslari ustidagi boshqaruv amallari (CloudTrail management events'ga o'xshash) |
| **Microsoft 365 Unified Audit Log** | Pochta, SharePoint, OneDrive, Teams faoliyati |

(Entra ID — avvalgi nomi Azure Active Directory.) Bu loglar odatda **Microsoft Sentinel**'ga yig'iladi va Elastic darsida tilga olingan **Kusto** (KQL) tilida qidiriladi:

```
// Bitta IP'dan ko'p hisobga muvaffaqiyatsiz kirish — password spraying (b1 bosqichi)
SigninLogs
| where TimeGenerated > ago(1d)
| where ResultType != "0"
| summarize urinishlar = count(), hisoblar = dcount(UserPrincipalName) by IPAddress
| where hisoblar > 10
| order by hisoblar desc
```

```
// Kimdir global administrator roliga qo'shildi
AuditLogs
| where OperationName has "Add member to role"
| extend Rol = tostring(TargetResources[0].modifiedProperties[1].newValue)
| where Rol has "Global Administrator"
| project TimeGenerated, InitiatedBy, TargetResources
```

Birinchi so'rov b2 bosqichidagi Splunk darsidagi `stats dc(user) by src_ip` ning Kusto versiyasi — g'oya bir xil. (Ikkinchi so'rovdagi maydon tuzilishi muhitga qarab farq qilishi mumkin — Splunk darsidagi "maydon nomlarini avval tekshiring" qoidasi.)

### Bulutda hisob buzilishining belgilari

| Belgi | Nega |
|---|---|
| **Imkonsiz sayohat** — Toshkent, keyin 20 daqiqada boshqa qit'a | Alert triage darsidagi misol |
| Ko'p **MFA so'rovlari**, keyin bittasi tasdiqlandi | **MFA charchatish**: hujumchi foydalanuvchi zerikib "Tasdiqlash"ni bosguncha so'rov yuboradi |
| Yangi **pochta qoidalari**: xatlarni o'chirish yoki tashqariga yo'naltirish | Hujumchi javoblarni yashiradi yoki xatlarni o'g'irlaydi — phishing va BEC (phishing darsi) |
| Yangi **ilovaga ruxsat** (OAuth consent) | Zararli ilova parolsiz doimiy kirish oladi |
| Eski protokollar orqali kirish (MFA'ni qo'llamaydigan) | MFA'ni chetlab o'tish |

Pochta qoidalari alohida e'tiborga loyiq: phishing orqali hisobni buzgan hujumchi ko'pincha "kimdan xat kelsa, papkaga ko'chir va o'qilgan deb belgila" kabi qoida yaratadi — xodim xavfsizlik bo'limining ogohlantirishlarini ko'rmaydi. Phishing darsidagi javob choralari jadvaliga shuni qo'shing: **parolni almashtirish yetarli emas — hujumchi qoldirgan qoidalar, ilovalar va kalitlarni ham tekshiring.**

## Google Cloud

**Cloud Audit Logs** — xuddi shu g'oya: **Admin Activity** (boshqaruv amallari, doim yoziladi), **Data Access** (ma'lumotlarga murojaat, alohida yoqiladi), **System Event**, **Policy Denied**. Tuzilishi boshqacha, savollar bir xil: kim, qachon, qayerdan, nima.

:::key
**Bulutda identifikatsiya — yangi chegara.** Firewall'lar va EDR'lar ko'pincha bulut hujumini ko'rmaydi, chunki hujumchi hech qanday qurilmani buzmaydi — u shunchaki **haqiqiy kalit yoki hisob bilan** API chaqiradi. Shuning uchun bulut monitoringining asosi: har bir kirish va har bir [[iam|IAM]] o'zgarishini kuzatish, root va administrator hisoblarini alohida nazorat qilish, audit jurnalining o'zini himoyalash (o'chirishga urinish — darhol ogohlantirish) va uzoq muddatli [[access-key|kalitlar]] o'rniga qisqa muddatli identifikatsiyalarni ishlatish. Va eng oddiy qoida: **kalitni hech qachon kodga yozmang** (SOAR darsidagi ogohlantirish).
:::

## Bulut insidentiga javob — birinchi qadamlar

Dars boshidagi holat uchun b3 bosqichidagi IR jarayoni:

```
CHEKLASH
 □ Sizib chiqqan kalitni DEAKTIVATSIYA qilish (o'chirishdan oldin — tergov uchun)
 □ Hujumchi yaratgan foydalanuvchi va kalitlarni deaktivatsiya qilish
 □ Hujumchi ishga tushirgan resurslarni to'xtatish (snapshot olgandan keyin — dalil)
 □ CloudTrail yoqilganini tekshirish; o'chirilgan bo'lsa — qayta yoqish

TAHLIL (CloudTrail)
 □ Kalit birinchi marta qachon va qayerdan ishlatilgan?
 □ Shu kalit / IP / foydalanuvchi agent bilan BARCHA amallar — barcha mintaqalarda
 □ Yaratilgan resurslar, foydalanuvchilar, kalitlar, rollar, siyosatlar
 □ Ma'lumotlarga murojaat (data events yoqilgan bo'lsa) — omborlar, sirlar

YO'Q QILISH VA TIKLASH
 □ Barcha persistence: yangi foydalanuvchilar, kalitlar, rollarga ishonch munosabatlari
 □ Kodni tozalash; Git tarixidan kalitni olib tashlash (faqat o'chirish yetarli emas — tarix qoladi)
 □ Kalitlarni sirlar omborida saqlashga o'tish
```

"Barcha mintaqalarda" — muhim: hujumchilar ko'pincha siz hech qachon ishlatmaydigan mintaqada resurs yaratadi — konsolda siz ularni ko'rmaysiz.

## Bulut loglari nimani qilmaydi

- **Yoqilmagan narsani yozmaydi** — data events, trail, uzoq muddatli saqlash — alohida sozlanadi.
- **Ichki mazmunni ko'rsatmaydi** — CloudTrail "kim omborni o'qidi"ni (data events bilan) ko'rsatadi, lekin serverda nima bo'lganini emas — buning uchun server loglari va EDR kerak.
- **O'z-o'zidan tahlil qilmaydi** — GuardDuty va Sentinel qoidalari yordam beradi, lekin triage — analitik ishi.
- **Bir zumda kelmaydi** — CloudTrail yozuvlari bir necha daqiqa kechikishi mumkin.
- **Provayderlar orasida bir xil emas** — har bir bulutning o'z formati va nomlari.

:::lab cloudtrail-tergovi

:::try
**1. JSON'ni o'qing.** Darsdagi CloudTrail yozuvini qayta o'qing va javob bering: kim, qachon (mahalliy vaqtda, UTC+5), qayerdan, qanday vosita bilan, nima qildi? Nega bu shubhali?

**2. jq mashqi.** Quyidagi kichik faylni `ct.json` sifatida saqlang va jq bilan (a) barcha `eventName` larni sanang, (b) `AccessDenied` olgan foydalanuvchini toping:

```json
{"Records":[
 {"eventTime":"2026-11-16T22:10:01Z","eventName":"GetCallerIdentity","userIdentity":{"arn":"arn:aws:iam::111122223333:user/ci-deploy"},"sourceIPAddress":"203.0.113.77","errorCode":null},
 {"eventTime":"2026-11-16T22:10:15Z","eventName":"ListBuckets","userIdentity":{"arn":"arn:aws:iam::111122223333:user/ci-deploy"},"sourceIPAddress":"203.0.113.77","errorCode":"AccessDenied"},
 {"eventTime":"2026-11-16T22:11:02Z","eventName":"DescribeInstances","userIdentity":{"arn":"arn:aws:iam::111122223333:user/ci-deploy"},"sourceIPAddress":"203.0.113.77","errorCode":null},
 {"eventTime":"2026-11-16T22:14:07Z","eventName":"CreateAccessKey","userIdentity":{"arn":"arn:aws:iam::111122223333:user/ci-deploy"},"sourceIPAddress":"203.0.113.77","errorCode":null},
 {"eventTime":"2026-11-16T22:20:44Z","eventName":"StopLogging","userIdentity":{"arn":"arn:aws:iam::111122223333:user/ci-deploy"},"sourceIPAddress":"203.0.113.77","errorCode":null}
]}
```

Hikoyani ATT&CK taktikalari bilan yozing.

**3. Bepul bulut laboratoriyasi.** AWS bepul darajasida (yoki o'quv muhitida) hisob oching, **root uchun MFA yoqing**, CloudTrail trail yarating va oddiy amallar bajaring (S3 ombor yarating, o'chiring). Event history'da o'z amallaringizni toping. Oxirida yaratganlaringizni o'chiring va xarajat ogohlantirishini (billing alert) yoqing.

**4. TryHackMe** — AWS va bulut xavfsizligi bo'yicha boshlang'ich xonalarni bajaring.

*Javoblar: 1 — `ci-deploy` xizmat hisobi, 17-noyabr 03:14 (UTC+5), 203.0.113.77 dan, AWS CLI orqali, `backup-svc` uchun yangi kalit yaratdi; CI hisobi odatda boshqa foydalanuvchilarga kalit yaratmaydi — persistence belgisi. 2a — `jq -r '.Records[].eventName' ct.json | sort | uniq -c`; 2b — `jq -r '.Records[] | select(.errorCode=="AccessDenied") | .userIdentity.arn' ct.json`. Hikoya: Discovery (GetCallerIdentity, ListBuckets, DescribeInstances) → Persistence (CreateAccessKey) → Defense Evasion (StopLogging).*
:::

## Xulosa

- Bulutda **identifikatsiya — chegara**; hamma narsa API orqali, har bir API chaqiruvi yoziladi.
- **CloudTrail**: `eventTime`, `eventSource`, `eventName`, **`userIdentity`**, `sourceIPAddress`, `userAgent`, `requestParameters`, `errorCode`, `awsRegion`.
- Event history — 90 kun; uzoq saqlash uchun **trail**; **data events** alohida yoqiladi.
- Shubhali hodisalar: root faoliyati, MFA'siz kirish, razvedka (`List*`, `Describe*`), `CreateAccessKey`, `AttachUserPolicy`, **`StopLogging`/`DeleteTrail`**, omborlarni ommaga ochish, g'ayrioddiy mintaqada `RunInstances`.
- Qidiruv: `jq`, Athena/CloudTrail Lake (SQL), SIEM; aniqlash: **GuardDuty**.
- Microsoft: **Sign-in**, **Audit**, **Activity** loglari, **Unified Audit Log**; Sentinel'da Kusto.
- Hisob buzilishi belgilari: imkonsiz sayohat, **MFA charchatish**, yangi pochta qoidalari, OAuth ilovalari, eski protokollar.
- Javob: kalitni deaktivatsiya, **barcha mintaqalarda** tahlil, barcha persistence'ni olib tashlash, Git tarixini tozalash.

:::quiz
? Nega bulutda “identifikatsiya — yangi chegara” deyiladi?
- Bulutda firewall yo'q
+ Hujumchiga qurilmani buzish shart emas — haqiqiy kalit yoki hisob bilan internetning istalgan joyidan API chaqirishi mumkin
- Bulutda parol ishlatilmaydi
- Identifikatsiya faqat bulutda mavjud
! Shuning uchun kirishlar va IAM o'zgarishlari bulut monitoringining asosi.

? CloudTrail yozuvidagi qaysi maydon amalni KIM bajarganini ko'rsatadi?
- eventSource
- awsRegion
+ userIdentity
- eventTime
! userIdentity — foydalanuvchi, rol, root yoki xizmat va ishlatilgan kalit.

? Qaysi CloudTrail hodisasi Windows'dagi 1102 (jurnal tozalandi) ga eng o'xshash?
- ListBuckets
+ StopLogging yoki DeleteTrail
- ConsoleLogin
- RunInstances
! Audit jurnalini o'chirish — himoyadan qochish; oddiy ishda deyarli bo'lmaydi.

? “Hujumchi S3 ombordagi mijozlar fayllarini o'qidimi?” degan savolga qachon javob bera olasiz?
- Har doim — CloudTrail hamma narsani yozadi
+ Faqat shu ombor uchun data events oldindan yoqilgan bo'lsa
- Hech qachon
- Faqat GuardDuty yoqilgan bo'lsa
! Management events standart holatda yoziladi; fayllarni o'qish (data events) — alohida va pullik.

? Yangi kalitdan qisqa vaqtda turli xizmatlarga ko'p so'rov, ko'pi AccessDenied bilan tugagan. Bu nima?
+ Razvedka — hujumchi o'g'irlangan kalit bilan nimalarga ruxsati borligini sinab ko'rmoqda
- Oddiy dasturiy xato
- AWS texnik nosozligi
- Yangi xodimning birinchi kuni
! Discovery taktikasi: “men kimman va bu yerda nima qila olaman?”

? Hujumchi nega ko'pincha siz ishlatmaydigan AWS mintaqasida server ishga tushiradi?
- U yerda arzonroq
+ Siz u mintaqani konsolda kuzatmaysiz va resurslar uzoq vaqt sezilmay qoladi
- Boshqa mintaqalarda server yaratib bo'lmaydi
- Bu tasodif
! Shuning uchun tahlil barcha mintaqalarda o'tkaziladi.

? MFA charchatish (MFA fatigue) nima?
- MFA qurilmasining batareyasi tugashi
+ Hujumchi foydalanuvchi zerikib tasdiqlaguncha ko'p MFA so'rovlari yuboradi
- MFA'ni o'chirish
- Parolni unutish
! Logda ko'p rad etilgan MFA so'rovlari, keyin bitta tasdiq ko'rinadi.

? Phishing orqali buzilgan Microsoft 365 hisobida parol almashtirildi. Yana nimani tekshirish kerak?
+ Hujumchi yaratgan pochta qoidalarini (yo'naltirish, o'chirish)
+ Ruxsat berilgan OAuth ilovalari va faol seanslarni
- Faqat kompyuter fon rasmini
- Hech narsani — parol yetarli
! Hujumchi qoldirgan qoidalar va ilovalar parol almashtirilgandan keyin ham ishlaydi.

? Sizib chiqqan access key bilan birinchi cheklash qadami qaysi?
- Butun AWS hisobini o'chirish
+ Kalitni deaktivatsiya qilish (tergov uchun o'chirishdan oldin)
- Hech narsa qilmaslik
- Faqat GitHub'dagi faylni tahrirlash
! Faylni tahrirlash yetarli emas — Git tarixida kalit qoladi; kalitning o'zi deaktivatsiya qilinishi kerak.

? Microsoft Sentinel'da Entra ID kirishlarini qaysi jadvaldan qidirasiz?
- AWSCloudTrail
+ SigninLogs
- Syslog
- DnsEvents
! AuditLogs esa hisob, guruh va rol o'zgarishlari uchun.
:::

:::cards
Bulutda nima boshqacha? :: Chegara — identifikatsiya; hamma narsa API orqali; resurslar soniyalarda yaratiladi; umumiy javobgarlik modeli.
CloudTrail nima? :: AWS'dagi har bir API chaqiruvini yozuvchi audit jurnali (JSON).
CloudTrail asosiy maydonlari? :: eventTime, eventSource, eventName, userIdentity, sourceIPAddress, userAgent, requestParameters, errorCode, awsRegion.
Event history va trail? :: Event history — 90 kunlik management events; trail — uzoq saqlash (S3) va SIEM'ga yuborish uchun.
Management va data events? :: Management — resurslarni boshqarish (standart); data — ma'lumotlarga murojaat, masalan S3 fayllarni o'qish (alohida, pullik).
Eng xavotirli CloudTrail hodisalari? :: Root faoliyati, MFA'siz ConsoleLogin, CreateAccessKey, AttachUserPolicy (Admin), StopLogging/DeleteTrail, ombor siyosati o'zgarishi.
Bulutdagi razvedka belgisi? :: Yangi kalitdan GetCallerIdentity, List*, Describe* — ko'pi AccessDenied bilan.
GuardDuty? :: AWS'ning CloudTrail, tarmoq va DNS loglarini tahlil qiluvchi boshqariladigan aniqlash xizmati.
Microsoft bulut loglari? :: Entra ID Sign-in va Audit logs, Azure Activity log, Microsoft 365 Unified Audit Log.
Bulutda hisob buzilishi belgilari? :: Imkonsiz sayohat, MFA charchatish, yangi pochta qoidalari, OAuth ilova ruxsatlari, eski protokollar.
Sizib chiqqan kalitga javob? :: Deaktivatsiya, barcha mintaqalarda CloudTrail tahlili, persistence'ni olib tashlash, Git tarixini tozalash, sirlar omboriga o'tish.
Bulut loglari cheklovlari? :: Yoqilmaganini yozmaydi, server ichini ko'rsatmaydi, kechikadi, provayderlar orasida formatlar farq qiladi.
:::
