Juma, soat 23:10. Telefoningizga xabar keladi:

```
GuardDuty finding — HIGH
UnauthorizedAccess:IAMUser/InstanceCredentialExfiltration.OutsideAWS
Resource: qaydnoma-ec2-role (i-0abc123def4567890)
Remote IP: 198.51.100.200
```

Tarjimasi: Qaydnoma serveriga berilgan rolning vaqtinchalik kalitlari **AWS tashqarisidagi** IP manzildan ishlatilmoqda. Rolning kalitlari faqat serverning o'zida bo'lishi kerak edi. Demak, kimdir ularni serverdan olib chiqqan — ehtimol ilovadagi zaiflik orqali (keyingi darsning mavzusi).

Bu xabar keldi, chunki kimdir oldindan **monitoringni yoqib qo'ygan** edi. Aks holda bu hujum hech kim bilmasdan davom etardi — c1 bosqichidagi talabaning hisob-kitobi kabi, oy oxirida.

SOC tarmog'ida bulut loglarini tahlilchi sifatida o'qigansiz (b4). Bu dars — muhandis tomoni: qaysi xizmatlar nimani ko'radi, ularni qanday to'g'ri yoqish va sozlash kerak va kelgan topilma bilan nima qilish kerak.

## AWS monitoring xizmatlari

| Xizmat | Savol | Qanday ma'lumot |
|---|---|---|
| **CloudTrail** | Kim qanday API amalini bajardi? | Har bir API chaqiruvi |
| **CloudWatch** | Tizim qanday ishlayapti? | Metrikalar, jurnallar, signallar (alarm) |
| **EventBridge** | Hodisa bo'lganda darhol nima qilish kerak? | Hodisalar oqimi va qoidalar |
| **GuardDuty** | Hisobda tahdid bormi? | CloudTrail, VPC Flow Logs, DNS tahlili → topilmalar |
| **Config** | Resurs qanday sozlangan va qachon o'zgargan? | Konfiguratsiya tarixi va qoidalar |
| **Security Hub** | Umumiy xavfsizlik holati qanday? | Barcha xizmatlar topilmalarini yig'adi, standartlar bo'yicha tekshiradi |
| **Inspector** | Serverlarda va image'larda zaiflik bormi? | EC2, ECR, Lambda skanerlash |
| **Detective** | Topilma atrofida nima bo'lgan? | Tergov uchun bog'lanishlar grafi |
| **Macie** | Maxfiy ma'lumot qayerda? | S3 skanerlash (oldingi dars) |

Ular bir-birini almashtirmaydi — har biri boshqa savolga javob beradi.

:::key
Kichik hisob uchun minimal to'plam: **CloudTrail + GuardDuty + Config + Security Hub**, signallar EventBridge orqali. Bularni hisob ochilgan **birinchi kuni** yoqing: insident sodir bo'lgandan keyin yoqilgan monitoring o'tmishni ko'rsatmaydi.
:::

## CloudTrail: to'g'ri sozlash

[[cloudtrail|CloudTrail]] Event history sukut bo'yicha oxirgi 90 kunlik boshqaruv hodisalarini ko'rsatadi (b4). Haqiqiy himoya uchun **trail** kerak:

| Sozlama | Nega |
|---|---|
| **Barcha regionlar** | Hujumchi siz qaramaydigan regionda ishlaydi |
| **Organization trail** | Tashkilotdagi barcha hisoblar bitta trail bilan, hisob admini uni o'chira olmaydi |
| **Alohida log hisobi** | Jurnallar asosiy hisobdan tashqarida — u buzilsa ham jurnallar omon qoladi |
| **Log file validation** | Har soatlik "digest" fayllar — jurnal o'zgartirilgan yoki o'chirilganini isbotlash mumkin |
| **KMS shifrlash** | Jurnallarni o'qish ham alohida ruxsat talab qiladi |
| **Data events** (tanlab) | Maxfiy bucket'larda kim qaysi faylni o'qiganini ko'rish — pullik, shuning uchun faqat muhim joylarda |
| **SCP: StopLogging taqiqi** | IAM darsidagi qoida |

```bash
aws cloudtrail create-trail --name org-trail \
  --s3-bucket-name log-archive-cloudtrail-444455556666 \
  --is-multi-region-trail --is-organization-trail \
  --enable-log-file-validation --kms-key-id <kms-key-arn>
aws cloudtrail start-logging --name org-trail

# Jurnal yaxlitligini tekshirish
aws cloudtrail validate-logs --trail-arn <trail-arn> --start-time 2026-11-01T00:00:00Z
```

Jurnallarni qidirish — **Athena** (S3'dagi fayllarga SQL so'rov) yoki CloudTrail Lake orqali. b2 bosqichidagi SIEM so'rovlari bilan bir xil fikrlash:

```sql
SELECT eventtime, eventname, sourceipaddress, useridentity.arn
FROM cloudtrail_logs
WHERE useridentity.arn LIKE '%qaydnoma-ec2-role%'
  AND sourceipaddress NOT LIKE '10.10.%'
  AND eventtime > '2026-11-13T00:00:00Z'
ORDER BY eventtime;
```

(Eslatma: serverning AWS API'ga chaqiruvlarida `sourceIPAddress` odatda uning ommaviy yoki NAT manzili bo'ladi, VPC endpoint orqali esa — xususiy manzil. So'rovni o'z arxitekturangizga moslang.)

## Real vaqtdagi signallar: EventBridge

CloudTrail'ni qidirish — tergov uchun. Lekin ba'zi hodisalar haqida **darhol** bilish kerak. EventBridge qoidasi hodisa naqshiga mos kelganini ushlaydi va harakat qiladi (SNS orqali email/Telegram, Lambda, SIEM):

```json
{
  "source": ["aws.signin"],
  "detail-type": ["AWS Console Sign In via CloudTrail"],
  "detail": {
    "userIdentity": { "type": ["Root"] }
  }
}
```

"Root konsolga kirdi" — darhol xabar. Shunga o'xshash qoidalar uchun nomzodlar (CIS AWS Foundations Benchmark'dagi monitoring tavsiyalari asosida):

| Hodisa | Nega darhol |
|---|---|
| Root foydalanish | Root kundalik ishlatilmaydi |
| MFA'siz konsolga kirish | Siyosat buzilishi yoki hisob buzilishi |
| CloudTrail o'zgarishi (`StopLogging`, `UpdateTrail`) | Izlarni yashirish |
| IAM siyosatlari o'zgarishi | Imtiyoz oshirish (IAM darsi) |
| KMS kalitini o'chirish yoki rejalashtirish | Ma'lumot yo'qolishi |
| Security group'ga `0.0.0.0/0` qo'shilishi | Eshik ochildi |
| S3 bucket siyosati o'zgarishi | Ommaga ochilishi mumkin |
| GuardDuty `HIGH` topilma | Tahdid |

Har bir qoida — b2 bosqichidagi detection rule: u **amaliy** bo'lishi kerak. Har kuni 200 ta xabar keladigan qoida e'tiborsiz qoladi (alert fatigue).

## GuardDuty: tahdidlarni aniqlash

[[guardduty|GuardDuty]] — bitta tugma bilan yoqiladigan va darhol ishlaydigan xizmat. U quyidagilarni o'zi o'qiydi — ularni alohida yoqish shart emas:

- CloudTrail boshqaruv hodisalari;
- VPC Flow Logs;
- DNS so'rovlari jurnallari.

Qo'shimcha himoya rejalari (alohida yoqiladi, pullik): S3 data events, EKS va konteyner runtime, EC2 diskini zararli dasturga skanerlash, RDS kirishlari, Lambda tarmoq faolligi.

GuardDuty nimani qidiradi: ma'lum yomon IP va domenlar bilan aloqa (threat intelligence, b2), g'ayrioddiy xatti-harakat (yangi joydan, yangi vaqtda, odatda qilinmaydigan amallar), ma'lum hujum naqshlari.

**Topilma nomini o'qish.** Format: `ThreatPurpose:ResourceType/ThreatFamily.Mechanism!Artifact`

| Topilma | Ma'nosi |
|---|---|
| `Recon:IAMUser/MaliciousIPCaller` | Ma'lum yomon IP'dan hisobni o'rganish (List, Describe) |
| `UnauthorizedAccess:IAMUser/InstanceCredentialExfiltration.OutsideAWS` | Server roli kalitlari AWS tashqarisidan ishlatilmoqda |
| `CryptoCurrency:EC2/BitcoinTool.B!DNS` | Server kriptovalyuta bilan bog'liq domenlarga DNS so'rov yubormoqda |
| `Backdoor:EC2/C&CActivity.B` | Server ma'lum C2 serveri bilan aloqada |
| `Stealth:IAMUser/CloudTrailLoggingDisabled` | CloudTrail o'chirildi |
| `Policy:IAMUser/RootCredentialUsage` | Root ishlatildi |
| `Discovery:S3/MaliciousIPCaller` | Yomon IP'dan S3 o'rganilmoqda |

`ThreatPurpose` qismi ATT&CK taktikalariga yaqin (b2 bosqichi): Recon, Discovery, Persistence, Stealth (Defense Evasion), CredentialAccess, Exfiltration, Impact.

## Topilmani tahlil qilish

SOC tarmog'idagi alert triage (b1) — xuddi o'sha jarayon, bulut ma'lumotlari bilan. Dars boshidagi topilma uchun:

| Qadam | Savol | Qayerdan |
|---|---|---|
| 1. Kontekst | Qaysi resurs, qaysi identifikatsiya, qachon, qayerdan? | Topilma tafsilotlari |
| 2. Tasdiqlash | Bu haqiqatan sodir bo'ldimi? Soxta ijobiy emasmi? | CloudTrail: shu rol bilan qilingan barcha chaqiruvlar, `sourceIPAddress` |
| 3. Ko'lam | Hujumchi kalit bilan nima qildi? | CloudTrail: `eventName` ro'yxati — List, Get, Create… |
| 4. Manba | Kalit qanday chiqib ketdi? | Server jurnallari, ALB access logs (g'ayrioddiy so'rovlar), Flow Logs |
| 5. Qaror | Insidentmi? Kim xabardor qilinadi? | IR rejasi (b3, c4) |

Soxta ijobiy bo'lishi mumkin bo'lgan holatlar: kompaniya VPN'i orqali ishlayotgan ma'mur, ruxsat berilgan pentest, yangi CI tizimi. Shuning uchun ishonchli IP'lar ro'yxati (trusted IP list) va bostirish qoidalari (suppression rules) sozlanadi.

:::warn
Bostirish qoidasini iloji boricha tor yozing: aniq topilma turi + aniq resurs + aniq manba. "Shu turdagi barcha topilmalarni bostir" degan qoida keyingi haqiqiy hujumni ham jimgina yashiradi. Har bir bostirish qoidasining sababi va egasi yozib qo'yilsin.
:::

Bu holatda haqiqiy insident bo'lsa, birinchi choralar (c4 bosqichida batafsil): rol sessiyalarini bekor qilish (rolga "shu vaqtdan oldin berilgan barcha sessiyalarni rad et" degan siyosat), serverni izolyatsiya qilish (alohida "karantin" security group), dalillarni saqlash (disk snapshot).

## AWS Config: kim nimani qachon o'zgartirdi

CloudTrail amallarni yozadi; Config resurslarning **holatini** yozadi. Har bir resurs uchun vaqt chizig'i: "Bu security group 3-noyabrda qanday edi, 4-noyabrda qanday bo'ldi, o'zgarishni qaysi CloudTrail hodisasi qildi."

Bulut tarmoq xavfsizligi darsi boshidagi "temp — Jasur uchun" qoidani eslang: Config uni qo'shilgan kunning o'zida ko'rsatib berardi.

**Config qoidalari** — resurslar doimiy tekshiriladi:

| Qoida (AWS managed) | Nimani tekshiradi |
|---|---|
| `root-account-mfa-enabled` | Root'da MFA |
| `restricted-ssh` | Security group'larda 22-port `0.0.0.0/0` ga ochilmagan |
| `s3-bucket-public-read-prohibited` | Bucket ommaviy o'qishga ochilmagan |
| `cloudtrail-enabled` | CloudTrail yoqilgan |
| `encrypted-volumes` | EBS disklar shifrlangan |
| `iam-user-no-policies-check` | Siyosatlar to'g'ridan-to'g'ri user'larga emas, guruh yoki rollarga biriktirilgan |

Mos kelmagan resurs — "NON_COMPLIANT". Ba'zi qoidalarga avtomatik tuzatish (remediation) ulash mumkin — masalan, ochilgan bucket'ga Block Public Access'ni qaytarish. Avtomatik tuzatishni ehtiyotkorlik bilan yoqing: u ishlab turgan tizimni ham "tuzatib" buzishi mumkin.

## Security Hub: hammasi bir joyda

Security Hub GuardDuty, Inspector, Macie, Config, Access Analyzer va uchinchi tomon vositalari topilmalarini bitta formatda (ASFF) yig'adi va standartlar bo'yicha hisobot beradi:

- **AWS Foundational Security Best Practices** — AWS'ning o'z tavsiyalari;
- **CIS AWS Foundations Benchmark** — keyingi darslarda batafsil.

Ko'p hisobli tashkilotda **delegated administrator** — bitta xavfsizlik hisobi barcha hisoblarning GuardDuty, Security Hub va Config natijalarini ko'radi. Ishlab chiqish jamoalari o'z hisoblarida bu xizmatlarni o'chira olmaydi.

```
  Ishlab chiqarish  Test  Dev  ...
  hisoblari ───────────────────────┐
                                    ▼
             ┌────────────────────────────────────┐
             │ Security hisobi (delegated admin)  │
             │ GuardDuty · Security Hub · Config  │──▶ EventBridge ──▶ SIEM / xabar
             └────────────────────────────────────┘
             ┌────────────────────────────────────┐
             │ Log archive hisobi                 │
             │ CloudTrail, Config, Flow Logs (S3) │──▶ SIEM
             └────────────────────────────────────┘
```

SIEM'ga ulash (b2 bosqichi): CloudTrail va Flow Logs S3'dan, topilmalar EventBridge orqali. Shunda bulut hodisalari Windows va tarmoq jurnallari bilan bitta joyda korrelyatsiya qilinadi — WS-BUX-014 insidentidagi kabi hujum bulutga o'tsa, uni bitta vaqt chizig'ida ko'rasiz.

## Monitoring nimani qilmaydi

- GuardDuty **bloklamaydi** — u xabar beradi. Javobni siz (yoki avtomatlashtirish, b4 bosqichidagi SOAR) berasiz.
- Real vaqt emas: topilmalar odatda daqiqalar ichida keladi. Bir necha daqiqada ko'p narsa qilish mumkin.
- Ilova ichini ko'rmaydi: Qaydnoma'dagi IDOR orqali boshqa foydalanuvchi qaydini o'qish — AWS uchun oddiy, ruxsatli `GetObject`. Ilova darajasidagi hujumlarni ilovaning o'z jurnallari ko'rsatadi.
- Yoqilmagan narsa ishlamaydi: data events o'chiq bo'lsa, "hujumchi qaysi fayllarni o'qidi?" degan savolga javob yo'q.
- Hech kim o'qimaydigan xabar — monitoring emas. Kimga, qanday kanal orqali, kechasi kim javob beradi — bu ham sozlamaning bir qismi.

:::try
O'quv hisobingizda:

1. GuardDuty'ni yoqing va Settings → "Generate sample findings" bilan namuna topilmalar yarating. Uchta turli topilmani tanlab, nomini yuqoridagi format bo'yicha "tarjima" qiling.
2. Barcha regionlar uchun trail yarating, log file validation bilan. `validate-logs` ni ishga tushiring.
3. Root konsolga kirganda email yuboradigan EventBridge qoidasini SNS bilan sozlang va sinab ko'ring.
4. Config'ni yoqib, `restricted-ssh` qoidasini qo'shing. Test security group'da 22-portni `0.0.0.0/0` ga oching va qoida qancha vaqtda NON_COMPLIANT ko'rsatishini kuzating. Keyin qoidani o'chiring.
5. Savol: `Recon:IAMUser/MaliciousIPCaller` topilmasi keldi, identifikatsiya — `ci-deploy`. Birinchi uchta harakatingiz?

**Javoblar:**
1. Namuna topilmalar nomida `[SAMPLE]` belgisi bo'ladi. Masalan, `CryptoCurrency:EC2/BitcoinTool.B!DNS`: maqsad — kriptomayning, resurs — EC2, aniqlash — DNS so'rovlari orqali.
2. `validate-logs` "valid" natija beradi; digest fayllar `CloudTrail-Digest/` papkasida paydo bo'ladi.
3. SNS obunasini email orqali tasdiqlash kerak — aks holda xabar kelmaydi (klassik xato).
4. Odatda bir necha daqiqa (o'zgarish asosida tekshiriladigan qoida). Config'ning resurs vaqt chizig'ida o'zgarishni qilgan CloudTrail hodisasi ko'rinadi.
5. (a) CloudTrail'da `ci-deploy` ning shu IP'dan va oxirgi 24 soatdagi barcha amallarini ko'rish — faqat Recon'mi yoki Create/Attach ham bormi; (b) bu IP CI tizimiga tegishli emasligini tasdiqlash; (c) tasdiqlansa — `ci-deploy` kalitini o'chirish (deactivate) va IR jarayonini boshlash. Va keyin — nega CI hisobida doimiy kalit borligi haqida savol (a4 bosqichidagi OIDC).
:::

## Xulosa

- Minimal to'plam: CloudTrail (amallar) + GuardDuty (tahdidlar) + Config (holat va o'zgarishlar) + Security Hub (umumiy rasm), signallar EventBridge orqali.
- CloudTrail: barcha regionlar, organization trail, alohida log hisobi, log file validation, KMS, muhim joylarda data events.
- EventBridge: root, MFA'siz kirish, CloudTrail va IAM o'zgarishlari, KMS o'chirish, ochilgan portlar — darhol xabar. Kam, lekin amaliy.
- GuardDuty CloudTrail, Flow Logs va DNS'ni o'zi o'qiydi. Topilma nomi: maqsad, resurs, oila, mexanizm.
- Topilma tahlili — b1 triage: kontekst, tasdiqlash, ko'lam, manba, qaror.
- Config — resurs vaqt chizig'i va doimiy qoidalar; avtomatik tuzatish ehtiyotkorlik bilan.
- Monitoring bloklamaydi, ilova ichini ko'rmaydi va yoqilmagan narsani yozmaydi.

:::quiz
? Qaysi xizmat "kim qanday API amalini bajardi?" savoliga javob beradi?
+ CloudTrail
- CloudWatch metrikalari
- Inspector
- Macie
! CloudTrail har bir API chaqiruvini yozadi: kim, qachon, qayerdan, nima.

? Nega trail barcha regionlar uchun yoqilishi kerak?
- Bu bepul
+ Hujumchi ko'pincha siz qaramaydigan regionda resurs yaratadi
- Bitta regionda CloudTrail ishlamaydi
- Bu GuardDuty'ni o'chiradi
! Bitta regiondagi trail boshqa regionlardagi amallarni yozmasligi mumkin.

? CloudTrail log file validation nima beradi?
- Jurnallarni tezroq yozadi
+ Digest fayllar orqali jurnal o'zgartirilgan yoki o'chirilganini aniqlash imkonini beradi
- Jurnallarni avtomatik o'chiradi
- Faqat root'ga ko'rsatadi
! Yaxlitlik isboti tergov va sudda muhim (b3 bosqichidagi chain of custody).

? GuardDuty qaysi ma'lumot manbalarini alohida yoqmasdan o'zi tahlil qiladi?
- Faqat S3 obyektlari mazmunini
+ CloudTrail boshqaruv hodisalari, VPC Flow Logs va DNS jurnallari
- Ilova kodini
- Faqat Windows Event Log'larni
! Asosiy manbalar avtomatik; S3, EKS, malware kabi himoya rejalari alohida yoqiladi.

? `UnauthorizedAccess:IAMUser/InstanceCredentialExfiltration.OutsideAWS` topilmasi nimani bildiradi?
- Root parol o'zgartirildi
+ EC2 serverga berilgan rolning kalitlari AWS tashqarisidagi manzildan ishlatilmoqda
- S3 bucket shifrlanmagan
- Serverda disk to'lgan
! Rol kalitlari server ichida qolishi kerak edi — ular olib chiqilgan.

? GuardDuty yuqori darajali topilma topdi. U nima qiladi?
- Hujumchini avtomatik bloklaydi
- Serverni o'chiradi
+ Topilma yaratadi va xabar beradi; javob choralari siz yoki avtomatlashtirish tomonidan amalga oshiriladi
- Kalitlarni o'zi almashtiradi
! GuardDuty aniqlash xizmati; bloklash uchun EventBridge + Lambda yoki SOAR kerak.

? CloudTrail va AWS Config farqi nimada?
+ CloudTrail amallarni (kim nima qildi), Config resurslar holatini va uning vaqt bo'yicha o'zgarishini yozadi
- Ular bir xil
- Config faqat xarajatni ko'rsatadi
- CloudTrail faqat S3 uchun
! Ikkalasi birgalikda: Config "security group qanday o'zgardi", CloudTrail "buni kim qildi".

? Nega har bir hodisa uchun EventBridge xabarini yoqish yomon fikr?
- EventBridge pullik emas
+ Juda ko'p xabar e'tiborsiz qoladi (alert fatigue) va haqiqiy signal yo'qoladi
- EventBridge faqat bitta qoidani qo'llab-quvvatlaydi
- Xabarlar shifrlanmaydi
! Detection rule'lar kam va amaliy bo'lishi kerak — b2 bosqichidagi qoida.

? Hujumchi Qaydnoma'dagi IDOR orqali boshqa foydalanuvchilar fayllarini yuklab olmoqda. GuardDuty buni aniqlaydimi?
- Ha, har doim
+ Ehtimol yo'q — AWS uchun bu ilova roli bilan qilingan oddiy ruxsatli so'rov; buni ilova jurnallari ko'rsatishi kerak
- Ha, agar Config yoqilgan bo'lsa
- Faqat Shield Advanced bilan
! Bulut monitoringi ilova mantiqini tushunmaydi; ilova darajasidagi hujumlar ilovaning o'z jurnallarida ko'rinadi.

? Ko'p hisobli tashkilotda jurnallarni qayerda saqlash tavsiya etiladi?
- Har bir hisobning o'zida, hisob admini boshqaradi
+ Alohida log archive hisobida — asosiy hisob buzilsa ham jurnallar omon qoladi
- Dasturchining noutbukida
- Jurnallarni saqlash shart emas
! Jurnallar ular tasvirlagan muhitdan tashqarida bo'lishi kerak.
:::

:::cards
CloudTrail trail :: Barcha regionlar, uzoq muddat, S3'da saqlanadigan API jurnali
Organization trail :: Tashkilotdagi barcha hisoblar uchun bitta, hisob adminlari o'chira olmaydigan trail
Log file validation :: Digest fayllar bilan jurnal yaxlitligini isbotlash
EventBridge qoidasi :: Hodisa naqshiga mos kelganda darhol harakat (xabar, Lambda)
GuardDuty :: CloudTrail, Flow Logs va DNS'ni tahlil qilib tahdid topilmalari chiqaradi
GuardDuty topilma nomi :: Maqsad:Resurs/Oila.Mexanizm!Artefakt
AWS Config :: Resurs konfiguratsiyasi tarixi va doimiy tekshiruv qoidalari
NON_COMPLIANT :: Config qoidasiga mos kelmagan resurs holati
Security Hub :: Barcha xavfsizlik topilmalarini yig'adi va standartlar bo'yicha baholaydi
Delegated administrator :: Barcha hisoblarning xavfsizlik xizmatlarini boshqaradigan alohida hisob
Suppression rule :: Ma'lum soxta ijobiy topilmalarni bostirish; juda keng bo'lsa xavfli
:::
