Yakshanba, soat 06:30. Pochtangizda ikki xat. Birinchisi — GitHub'dan: "Repozitoriyingizda AWS kaliti topildi." Ikkinchisi — AWS'dan: "Hisobingizdagi access key ommaviy joyda ko'rindi." (c2 bosqichidagi misconfig darsidan eslang: AWS bunday kalitga karantin siyosatini biriktiradi, lekin bu hamma amalni to'xtatmaydi va sizning tergovingiz o'rnini bosmaydi.) Billing sahifasida esa kechagi xarajat odatdagidan yuz baravar ko'p.

SOC tarmog'idagi bulut loglari darsida (b4) aynan shu hikoyani tahlilchi sifatida ko'rgansiz: `ci-deploy` kaliti sizib chiqdi, notanish IP'dan razvedka, boshqa foydalanuvchi uchun yangi kalit, kriptomayning serverlari. O'shanda savol "nima bo'ldi?" edi. Endi siz **bulut insidentiga javob beruvchi** muhandissiz va savollar boshqacha: hujumchini qanday to'xtatamiz? U qayerda iz qoldirdi? Qanday qilib dalillarni yo'qotmasdan tozalaymiz? Va qayta takrorlanmasligi uchun nima qilamiz?

b3 bosqichida insidentga javob jarayoni va kompyuter forensikasini o'rgandingiz. Bu dars — ularning bulutdagi ko'rinishi, ikki eng keng tarqalgan stsenariy misolida: **sizib chiqqan kalit** va **buzilgan server**.

## Bulutda IR nimasi bilan boshqacha

| An'anaviy IR | Bulutda |
|---|---|
| Kompyuterni tarmoqdan uzish | Kalitni o'chirish, sessiyalarni bekor qilish, security group almashtirish — API orqali, soniyalarda |
| Diskni fizik nusxalash (write blocker, b3) | EBS **snapshot** — bitta API chaqiruvi |
| Hujumchi tarmoq ichida harakatlanadi | Hujumchi **API orqali** harakatlanadi — barcha regionlarda, istalgan xizmatda |
| Dalil — disk va xotira | Asosiy dalil — **CloudTrail**; disk va xotira — server stsenariylarida |
| Zarar — ma'lumot | Zarar — ma'lumot **va pul** (har daqiqada xarajat) |
| Vaqt — soatlar, kunlar | Avtomatlashtirilgan hujum daqiqalarda ishlaydi |

Eng muhim farq: bulutda insident ko'pincha **identifikatsiya** insidenti. Hech qanday kompyuter buzilmagan — kimdir sizning kalitingiz bilan sizning nomingizdan ish ko'rmoqda (c1 bosqichidagi "chegara — identifikatsiya").

## Tayyorgarlik — insidentdan oldin

b3 bosqichidagi NIST jarayonining birinchi bosqichi bulutda ayniqsa hal qiluvchi: insident paytida yoqilgan jurnal o'tmishni ko'rsatmaydi.

| Tayyorgarlik | Nega | Qaysi dars |
|---|---|---|
| CloudTrail barcha regionlarda, log hisobida, validation bilan | Vaqt chizig'i aynan shundan quriladi | c2 monitoring |
| Muhim bucket'lar uchun data events | "Qaysi fayllar o'qildi?" savoliga javob | c2 monitoring |
| GuardDuty, Config, VPC Flow Logs | Aniqlash va tarmoq dalillari | c2 |
| **IR roli** xavfsizlik hisobida | Insident paytida kerakli huquqlar oldindan tayyor va sinalgan | — |
| **Break-glass** hisobi | SSO ishlamay qolsa yoki buzilsa — seyfdagi favqulodda kirish | — |
| Tayyor karantin security group | Bir buyruq bilan serverni izolyatsiya qilish | Shu dars |
| Alohida **forensika hisobi** | Snapshot'larni toza muhitda tahlil qilish | Shu dars |
| Runbook'lar (playbook'lar) | 3 da tunda o'ylab o'tirmaslik | b3, b4 |
| Teglar va inventar | "Bu server kimniki?" savoliga darhol javob | c1 |

## 1-stsenariy: sizib chiqqan access key

### Aniqlash va tasdiqlash

```bash
# Kalit qaysi foydalanuvchiga tegishli va qachon oxirgi marta ishlatilgan
aws iam get-access-key-last-used --access-key-id AKIA...EXAMPLE
# { "UserName": "ci-deploy",
#   "AccessKeyLastUsed": { "LastUsedDate": "2026-11-16T23:41:00Z",
#                          "ServiceName": "ec2", "Region": "ap-southeast-1" } }
```

`ap-southeast-1` — kompaniya umuman ishlatmaydigan region. Tasdiqlandi: insident.

### Cheklash (containment) — tartib muhim

**1. Kalitni o'chirish emas — faolsizlantirish.**

```bash
aws iam update-access-key --user-name ci-deploy \
  --access-key-id AKIA...EXAMPLE --status Inactive
```

Nega `Inactive`, `delete` emas? O'chirilgan kalitning ID'si dalil sifatida kerak bo'ladi, faolsizlantirish esa bir zumda ta'sir qiladi va kerak bo'lsa qaytariladi.

**2. Undan olingan vaqtinchalik sessiyalarni bekor qilish.** c2 bosqichidagi IAM darsidan: doimiy kalit bilan `GetSessionToken` yoki `AssumeRole` orqali olingan **vaqtinchalik** kalitlar (`ASIA...`) asosiy kalit o'chirilgandan keyin ham muddati tugaguncha ishlaydi. Hujumchi ehtiyotkor bo'lsa, u aynan shunday qiladi. Yechim — foydalanuvchiga "shu vaqtdan oldin berilgan barcha tokenlarni rad et" degan siyosat:

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Deny",
    "Action": "*",
    "Resource": "*",
    "Condition": {
      "DateLessThan": { "aws:TokenIssueTime": "2026-11-17T06:45:00Z" }
    }
  }]
}
```

Rollar uchun konsolda tayyor tugma bor — "Revoke active sessions": u rolga xuddi shunday shartli `Deny` siyosatini qo'shadi.

**3. Hujumchi yaratgan kirish yo'llarini ham cheklash** — keyingi bosqichda topiladi, lekin topilishi bilan darhol faolsizlantiriladi.

### Ko'lamni aniqlash — vaqt chizig'i

Asosiy savol: **bu kalit bilan nima qilingan?** CloudTrail'dan (c2 monitoring darsidagi Athena yondashuvi):

```sql
SELECT eventtime, awsregion, eventsource, eventname,
       sourceipaddress, errorcode, requestparameters
FROM cloudtrail_logs
WHERE useridentity.accesskeyid = 'AKIA...EXAMPLE'
   OR useridentity.arn LIKE '%ci-deploy%'
ORDER BY eventtime;
```

Natijadan vaqt chizig'i (b3 bosqichidagi timeline darsi kabi, hamma vaqt UTC):

| Vaqt (UTC) | Region | Hodisa | Talqin |
|---|---|---|---|
| 11-16 22:10 | — | Kalit ommaviy repozitoriyga push qilindi (Git tarixidan) | Sizib chiqish nuqtasi |
| 22:14 | us-east-1 | `GetCallerIdentity` — 203.0.113.77 | "Men kimman?" — klassik birinchi qadam |
| 22:14 | us-east-1 | `CreateAccessKey` — `backup-svc` uchun | **Persistence**: zaxira kirish yo'li |
| 22:15–22:19 | barcha regionlar | `DescribeInstances`, `ListBuckets`, `ListUsers` | Discovery |
| 22:26 | ap-southeast-1 | `RunInstances` × 20, katta GPU turlari | Impact: kriptomayning |
| 22:40 | eu-central-1 | `GetSecretValue` × 7 | Credential Access — **qaysi sirlar?** |
| 22:52 | eu-central-1 | `GetObject` — `qaydnoma-backups` (data events) | Exfiltration ehtimoli |
| 23:05 | us-east-1 | `StopLogging` — `AccessDenied` | Izlarni yashirishga urinish — SCP to'xtatdi (c2 IAM darsi) |
| 11-17 06:45 | — | Kalit faolsizlantirildi, sessiyalar bekor qilindi | Cheklash |

Bu jadval — IR hisobotining yuragi. U uchta narsani ko'rsatdi: hujumchi **o'z kalitini yaratgan** (`backup-svc`), **sirlarni o'qigan** va **zaxira bucket'idan fayl olgan**. Birinchisi — darhol cheklash kerak; ikkinchisi — o'sha yetti sirni almashtirish kerak; uchinchisi — ma'lumot sizib chiqishi, ehtimol huquqiy majburiyatlar bilan.

Endi `backup-svc` ning yangi kaliti bilan ham xuddi shu so'rov — hujumchi u bilan nima qildi?

### Hujumchi qayerda iz qoldiradi

Bulutda persistence (qaytib kirish yo'li) uchun tekshiriladigan joylar:

| Joy | Nima qidiriladi | CloudTrail hodisasi |
|---|---|---|
| IAM foydalanuvchilar | Yangi user, yangi access key, konsol paroli | `CreateUser`, `CreateAccessKey`, `CreateLoginProfile` |
| IAM rollar | Trust policy'ga tashqi hisob qo'shilgan | `UpdateAssumeRolePolicy`, `CreateRole` |
| Siyosatlar | Admin huquqi biriktirilgan | `AttachUserPolicy`, `PutRolePolicy`, `CreatePolicyVersion` |
| Hisoblash | Barcha regionlarda yangi serverlar, Lambda funksiyalari | `RunInstances`, `CreateFunction` |
| Tarmoq | Ochilgan portlar | `AuthorizeSecurityGroupIngress` |
| Ma'lumot | Ommaviy qilingan bucket yoki snapshot | `PutBucketPolicy`, `ModifySnapshotAttribute` |
| Identity Center / SSO | Yangi foydalanuvchi yoki ruxsat to'plami | Identity Center hodisalari |

Barcha regionlarni tekshiring — hujumchi aynan siz qaramaydigan joyni tanlaydi (c1).

### Tozalash va tiklash

1. **Dalillarni saqlang**: CloudTrail natijalari, hujumchi serverlarining snapshot'lari (ichida nima borligini bilish uchun) — keyin o'chiring.
2. Hujumchi yaratgan barcha resurslarni o'chiring: serverlar, foydalanuvchilar, kalitlar, rollar, funksiyalar.
3. Hujumchi o'qigan **yetti sirni almashtiring** (c2 sirlar darsi) — ular endi oshkor.
4. `ci-deploy` ga doimiy kalitni qaytarmang: konveyerni **OIDC** ga o'tkazing (a4). Ildiz sabab — doimiy kalit va uning admin huquqlari (c2 IAM darsi boshidagi `"Action": "*"`).
5. Kuzatuvni kuchaytiring: bir necha hafta davomida shu IP'lar va shu naqshlar uchun alohida signal.
6. Xarajat bo'yicha AWS Support'ga murojaat — hujum natijasidagi xarajatlar ba'zan qayta ko'rib chiqiladi, lekin bunga tayanmang.

## 2-stsenariy: buzilgan EC2 server

c2 monitoring darsidagi topilma: `InstanceCredentialExfiltration.OutsideAWS` — `qaydnoma-web` serveri roli kalitlari tashqarida ishlatilmoqda. Server ichida nimadir bor (ehtimol SSRF yoki kod bajarish zaifligi).

:::warn
Birinchi instinkt — serverni o'chirish (terminate). **Bunday qilmang.** Bu b3 bosqichidagi "kompyuterni o'chirmang" qoidasining bulutdagi ko'rinishi: o'chirilgan server bilan birga xotira, vaqtinchalik fayllar va ko'pincha diskning o'zi (`DeleteOnTermination`) yo'qoladi. Hujumchi qanday kirganini bilmasangiz, tozalangan yangi server ham xuddi shunday buziladi.
:::

### Tartib — o'zgaruvchanlik tartibi bo'yicha

b3 bosqichidagi **order of volatility** — eng tez yo'qoladigan dalil birinchi:

```bash
# 0. Tasodifan o'chib ketmasin va kimniki ekani yozilsin
aws ec2 modify-instance-attribute --instance-id i-0abc123def4567890 --disable-api-termination
aws ec2 create-tags --resources i-0abc123def4567890 \
  --tags Key=IR-Case,Value=IR-2026-014 Key=IR-Status,Value=Quarantined

# 1. Metama'lumotni saqlash (IP'lar, rol, security group'lar, ishga tushirilgan vaqt)
aws ec2 describe-instances --instance-ids i-0abc123def4567890 > ir-2026-014-instance.json

# 2. Xotira — kerak bo'lsa va imkon bo'lsa, Session Manager orqali xotira nusxalash vositasi bilan
#    (izolyatsiyadan OLDIN — keyin SSM agenti ulanolmay qolishi mumkin)

# 3. Auto Scaling Group'dan ajratish — aks holda ASG "sog'lom emas" deb uni o'zi o'chiradi
aws autoscaling detach-instances --instance-ids i-0abc123def4567890 \
  --auto-scaling-group-name qaydnoma-asg --no-should-decrement-desired-capacity

# 4. Izolyatsiya: qoidalarsiz karantin security group
aws ec2 modify-instance-attribute --instance-id i-0abc123def4567890 --groups sg-0quarantine

# 5. Disk dalili
aws ec2 create-snapshot --volume-id vol-0abc... \
  --description "IR-2026-014 qaydnoma-web root volume" \
  --tag-specifications 'ResourceType=snapshot,Tags=[{Key=IR-Case,Value=IR-2026-014}]'
```

Va parallel ravishda — **identifikatsiya**: server rolining sessiyalarini bekor qiling ("Revoke active sessions"), chunki tashqariga chiqib ketgan kalitlar hali ham ishlaydi. Ko'lam — 1-stsenariydagi kabi CloudTrail so'rovi, endi rol ARN'i bo'yicha.

`--no-should-decrement-desired-capacity` — ASG buzilgan server o'rniga **yangi, toza** server ko'taradi; sayt ishlashda davom etadi, buzilgan server esa tergov uchun alohida qoladi.

:::key
Security group almashtirilganda allaqachon o'rnatilgan (kuzatilayotgan) ulanishlar darhol uzilmasligi mumkin — security group stateful (c2 tarmoq darsi). To'liq uzish kerak bo'lsa, subnet darajasida NACL bilan yoki serverni alohida izolyatsiya subnetiga ko'chirish bilan qo'shimcha to'siq qo'yiladi. Runbook'da bu nuance oldindan yozilgan bo'lishi kerak.
:::

### Tahlil — forensika hisobida

Snapshot'ni alohida **forensika hisobiga** ulashing, u yerda undan disk yaratib, maxsus tahlil serveriga **faqat o'qish uchun** ulang. b3 bosqichidagi disk forensikasi va Linux forensikasi — shu yerda: `auth.log`, bash tarixi, web server jurnallari, cron, yangi fayllar, vaqt chizig'i. Hujumchi qanday kirganini topgach — o'sha zaiflik **barcha** serverlarda va image'da tuzatiladi.

## Avtomatlashtirish

b4 bosqichidagi SOAR g'oyasi: takrorlanadigan cheklash qadamlari avtomatlashtiriladi.

```
 GuardDuty HIGH topilma ──▶ EventBridge qoidasi ──▶ Step Functions / Lambda:
                                                     1. teglash, termination protection
                                                     2. snapshot
                                                     3. ASG'dan ajratish
                                                     4. karantin SG
                                                     5. Telegram/Slack'ga xabar + tiket
```

Avtomatik javob tez — lekin xato topilmada ishlab chiqarishni to'xtatishi mumkin. Ko'p jamoalar avval dalil yig'ish va xabarni avtomatlashtiradi, izolyatsiyani esa odam tasdig'iga qoldiradi (yoki faqat aniq topilma turlari uchun avtomatik).

## Muloqot va huquqiy tomon

- Insident komandiri, texnik jamoa, rahbariyat, huquqshunos — b3 bosqichidagi rollar.
- Shaxsiy ma'lumot sizib chiqqan bo'lsa (yuqoridagi `qaydnoma-backups`), qonunchilik foydalanuvchilar va regulyatorni xabardor qilishni talab qilishi mumkin — bu qarorni huquqshunos bilan birga qabul qiling.
- AWS'ning o'z javob jamoasi va Support xizmati yordam berishi mumkin; umumiy javobgarlik modeliga ko'ra esa hisobingiz ichidagi tergov — sizning ishingiz.
- Hisobot (b3 bosqichidagi IR hisobot): qisqa xulosa rahbariyat uchun, vaqt chizig'i, ildiz sabab, ta'sir, choralar, saboqlar.

## Qonuniy amaliyot: flaws2.cloud

**flaws2.cloud** ning **Defender** yo'li aynan shu dars uchun yaratilgan: sizga buzilgan hisobning CloudTrail jurnallari beriladi va hujumchining yo'lini tiklash vazifasi qo'yiladi. Athena bilan so'rovlar, vaqt chizig'i, "hujumchi qaysi rolni qanday ishlatdi?" Bu c2 bosqichidagi flaws.cloud'ning himoyachi tomoni.

## Bulut IR nimani qilmaydi

- Jurnalsiz tergov yo'q: data events yoqilmagan bo'lsa, "qaysi fayllar o'qildi?" degan savolga javob bo'lmaydi. Tayyorgarlik — insidentning yarmi.
- Kalitni faolsizlantirish undan olingan vaqtinchalik sessiyalarni to'xtatmaydi — alohida bekor qilish kerak.
- Tozalash ildiz sababni tuzatmasa, insident takrorlanadi.
- Avtomatlashtirish noto'g'ri sozlansa, o'zi insidentga aylanadi.

:::try
1. Yuqoridagi vaqt chizig'ini o'qing va javob bering: hujumchi kirgandan persistence yaratguncha qancha vaqt o'tdi? Bizning javobimiz qancha kechikdi? Qaysi oldindan sozlangan nazorat haqiqatan ishladi?
2. O'quv hisobingizda test IAM foydalanuvchi va kalit yarating. Uni `Inactive` qiling, so'ng `get-access-key-last-used` bilan tekshiring. Keyin foydalanuvchiga `aws:TokenIssueTime` shartli `Deny` siyosatini qo'shing.
3. Bulutda buzilgan server uchun bir sahifalik runbook yozing: qadamlar, buyruqlar, kim nima qiladi, qaysi qadamni hech qachon qilmaslik kerak.
4. flaws2.cloud'ning Defender yo'lini o'ting va hujumchi vaqt chizig'ini jadval sifatida yozing.
5. Savol: kalit faolsizlantirildi, lekin 15 daqiqadan keyin CloudTrail'da xuddi shu foydalanuvchi nomidan yangi `ASIA...` kaliti bilan amallar ko'rinmoqda. Nima bo'lyapti va nima qilasiz?

**Javoblar:**
1. Kirish (22:14) va `CreateAccessKey` (22:14) — bir daqiqa ichida: avtomatlashtirilgan hujum. Javob ~8,5 soat kechikdi (06:45) — tunda signalga hech kim javob bermagan. Haqiqatan ishlagan nazorat — `StopLogging` ni taqiqlagan SCP; shuning uchun vaqt chizig'i to'liq. Saboq: yuqori ustuvor signallar uchun tungi navbatchilik yoki avtomatik cheklash.
2. `Inactive` dan keyin `LastUsedDate` yangilanmaydi. Shartli siyosat qo'shilgach, siyosat vaqtidan oldin olingan barcha sessiya tokenlari `AccessDenied` oladi.
3. Asosiy elementlar: termination protection va teglar → metama'lumot → (xotira) → ASG'dan ajratish → karantin SG (+ kerak bo'lsa NACL) → snapshot → rol sessiyalarini bekor qilish → forensika hisobida tahlil. "Hech qachon": serverni darhol o'chirmaslik, buzilgan server ichida tahlil vositalarini o'rnatmaslik.
4. Defender yo'lida odatda: hujumchi qaysi rol bilan nima so'raganini, qaysi resursni ko'rganini va qaysi bucket'dan nima olganini ketma-ket tiklaysiz.
5. Hujumchi kalit faolsizlantirilishidan oldin `GetSessionToken` yoki `AssumeRole` bilan vaqtinchalik kalit olgan; u muddati tugaguncha ishlaydi. `aws:TokenIssueTime` shartli `Deny` siyosatini qo'shing (rollar uchun — "Revoke active sessions") va o'sha `ASIA` kaliti bilan qilingan amallarni ko'lam tahliliga qo'shing.
:::

## Xulosa

- Bulut insidenti ko'pincha identifikatsiya insidenti: hujumchi API orqali, barcha regionlarda, daqiqalarda ishlaydi; zarar — ma'lumot va pul.
- Tayyorgarlik hal qiluvchi: CloudTrail (barcha regionlar, log hisobi, data events), GuardDuty, IR roli, break-glass, karantin SG, forensika hisobi, runbook'lar.
- Sizib chiqqan kalit: faolsizlantirish (o'chirmaslik) → vaqtinchalik sessiyalarni `aws:TokenIssueTime` bilan bekor qilish → CloudTrail vaqt chizig'i → persistence qidirish (barcha regionlar) → tozalash, sirlarni almashtirish, ildiz sababni tuzatish (OIDC).
- Buzilgan server: o'chirmang. Termination protection, teglar, metama'lumot, (xotira), ASG'dan ajratish, karantin SG, snapshot, rol sessiyalarini bekor qilish, forensika hisobida tahlil.
- Stateful security group mavjud ulanishlarni darhol uzmasligi mumkin — kerak bo'lsa NACL.
- Avtomatlashtirish: dalil yig'ish va xabar — avtomatik; izolyatsiya — ehtiyotkorlik bilan.
- Amaliyot: flaws2.cloud Defender yo'li.

:::quiz
? Sizib chiqqan access key bilan birinchi nima qilinadi?
- Kalitni darhol o'chirib (delete), hammasini unutish
+ Kalitni faolsizlantirish (Inactive) — darhol ta'sir qiladi va ID dalil sifatida saqlanadi
- Foydalanuvchiga xat yozib, kutish
- Hisobni yopish
! Inactive bir zumda ishlaydi va qaytariladi; o'chirish dalilni yo'qotishi mumkin.

? Asosiy kalit faolsizlantirildi, lekin hujumchi hali ham ishlamoqda. Sababi?
- AWS kalitni sekin o'chiradi
+ U oldindan vaqtinchalik sessiya kalitlarini olgan; ular muddati tugaguncha ishlaydi
- CloudTrail noto'g'ri
- Hujumchi root parolini biladi
! Yechim: `aws:TokenIssueTime` shartli Deny siyosati yoki rol uchun "Revoke active sessions".

? Bulut insidentida vaqt chizig'ining asosiy manbasi qaysi?
+ CloudTrail
- Server diskidagi brauzer tarixi
- Billing sahifasi
- Foydalanuvchi intervyusi
! CloudTrail barcha API amallarini yozadi — kim, qachon, qayerdan, nima.

? Vaqt chizig'ida `CreateAccessKey` boshqa foydalanuvchi uchun ko'rindi. Bu qaysi taktika?
- Discovery
+ Persistence — hujumchi o'ziga zaxira kirish yo'lini yaratmoqda
- Impact
- Initial Access
! Asosiy kalit o'chirilsa ham hujumchi yangi kalit bilan qaytadi — u ham topilib, cheklanishi kerak.

? Buzilgan EC2 serverni darhol terminate qilish nega xato?
- Bu juda qimmat
+ Xotira, vaqtinchalik fayllar va ko'pincha disk yo'qoladi; kirish yo'li noma'lum qoladi va takrorlanadi
- AWS bunga ruxsat bermaydi
- Server o'zi tiklanadi
! b3 bosqichidagi qoida: avval dalil, keyin izolyatsiya va tahlil.

? Nega buzilgan serverni Auto Scaling Group'dan ajratish kerak?
- Server tezroq ishlashi uchun
+ Aks holda ASG uni sog'lom emas deb o'zi o'chirishi va dalillar yo'qolishi mumkin
- ASG CloudTrail'ni o'chiradi
- Bu majburiy emas
! `--no-should-decrement-desired-capacity` bilan ASG o'rniga toza server ko'taradi.

? Server karantin security group'iga o'tkazildi, lekin hujumchining mavjud ulanishi hali ishlayapti. Sababi?
+ Security group stateful — allaqachon kuzatilayotgan ulanishlar darhol uzilmasligi mumkin; NACL kabi qo'shimcha to'siq kerak
- Karantin SG noto'g'ri yaratilgan
- Bu imkonsiz
- CloudTrail kechikmoqda
! Runbook'da bu nuance oldindan yozilishi kerak.

? Snapshot'ni qayerda tahlil qilish tavsiya etiladi?
- Buzilgan serverning o'zida
+ Alohida forensika hisobida, undan yaratilgan diskni faqat o'qish uchun ulab
- Dasturchining noutbukida
- Ishlab chiqarish serverlaridan birida
! Toza, izolyatsiyalangan muhit dalil yaxlitligini saqlaydi va hujumchi ta'siridan himoya qiladi.

? Hujumchi `GetSecretValue` bilan yetti sirni o'qigan. Tozalash bosqichida nima qilinadi?
- Hech narsa, sirlar shifrlangan
+ O'sha yetti sir almashtiriladi — ular endi oshkor
- Faqat CloudTrail'ni o'chirish
- Sirlarni boshqa nomga o'zgartirish
! O'qilgan sir — oshkor sir; rotation uni eskirtiradi.

? GuardDuty topilmasiga avtomatik javobni qanday sozlash ehtiyotkorroq?
- Har qanday topilmada barcha serverlarni avtomatik o'chirish
+ Dalil yig'ish va xabarni avtomatlashtirish, izolyatsiyani esa aniq topilmalar uchun yoki odam tasdig'i bilan
- Avtomatlashtirishdan umuman voz kechish
- Faqat oyiga bir marta tekshirish
! Noto'g'ri avtomatik izolyatsiya ishlab chiqarishni to'xtatishi mumkin.
:::

:::cards
Bulut insidenti :: Ko'pincha identifikatsiya insidenti — hujumchi sizning kalitingiz bilan API orqali ishlaydi
Inactive, delete emas :: Kalitni faolsizlantirish darhol ta'sir qiladi va dalilni saqlaydi
aws:TokenIssueTime :: Shu vaqtdan oldin berilgan sessiya tokenlarini rad etish sharti
Revoke active sessions :: Rolning mavjud vaqtinchalik sessiyalarini bekor qilish
CloudTrail vaqt chizig'i :: Kim, qachon, qaysi regionda, qanday amal — IR hisobotining yuragi
Persistence joylari :: Yangi user va kalitlar, rol trust policy, siyosatlar, serverlar, Lambda, barcha regionlarda
Termination protection :: Serverni tasodifan yoki ataylab o'chirishdan himoya
Karantin security group :: Qoidalarsiz SG — serverni tarmoqdan izolyatsiya qilish
EBS snapshot :: Bulutdagi disk dalili; forensika hisobida tahlil qilinadi
Forensika hisobi :: Dalillarni toza va izolyatsiyalangan muhitda tahlil qilish uchun alohida hisob
Break-glass hisobi :: SSO ishlamaganda ishlatiladigan seyfdagi favqulodda kirish
flaws2.cloud Defender :: CloudTrail jurnallaridan hujumchi yo'lini tiklash mashqi
:::
