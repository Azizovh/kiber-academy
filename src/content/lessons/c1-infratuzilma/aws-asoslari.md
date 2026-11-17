Talaba AWS'da hisob ochdi, bir-ikki server bilan o'ynadi va unutdi. Uch hafta o'tib pochtasiga hisob keladi — bir necha ming dollar. Nima bo'lgan? U o'rganish uchun yozgan kichik skriptni GitHub'ga yuklagan, skript ichida esa **root hisobining access key**'i qolgan. Bot uni bir necha daqiqada topgan va barcha regionlarda kuchli serverlar ko'tarib, kriptovalyuta qazishni boshlagan. Hisobda byudjet ogohlantirishi yo'q edi, root'da MFA yo'q edi, CloudTrail'ga hech kim qaramagan.

Bu hikoya bulut kurslarida shu qadar ko'p takrorlanadiki, deyarli an'anaga aylangan. SOC tarmog'idagi bulut loglari darsida (b4) uni tahlilchi ko'zi bilan ko'rgansiz. Endi siz **hisob egasi**siz — va buning oldini olish birinchi soatdagi to'rt-besh qadamga bog'liq.

Bu darsda [[aws|AWS]] — eng katta bulut provayderi — bilan amalda tanishamiz: hisobni xavfsiz ochish, asosiy xizmatlar (IAM, VPC, EC2, S3, RDS, Lambda) va ularni bir-biriga ulash. Maqsad — keyingi bosqichlarda himoya qiladigan narsalarni o'z qo'lingiz bilan qurish.

## Birinchi soat: hisobni himoyalash

AWS hisobini ochganingizda siz **root user** bo'lasiz — ro'yxatdan o'tgan email bilan kiriladigan, hisobdagi **hamma narsaga** cheksiz huquqli foydalanuvchi. Uni hech qanday siyosat cheklay olmaydi (tashkilot darajasidagi siyosatlardan tashqari). Shuning uchun:

| # | Qadam | Nega |
|---|---|---|
| 1 | Root'ga **MFA** qo'shish (ilova yoki apparat kalit) | Parol sizib chiqsa ham kirib bo'lmaydi |
| 2 | Root uchun **access key yaratmaslik** (bor bo'lsa — o'chirish) | Dars boshidagi hikoya |
| 3 | Kundalik ish uchun alohida admin foydalanuvchi | Root faqat seyfda turadi |
| 4 | **Byudjet ogohlantirishi** (AWS Budgets) | Xarajat — birinchi anomaliya signali |
| 5 | CloudTrail trail'ini yaratish | Hamma amallar uzoq muddat saqlansin |

Byudjet ogohlantirishi: Billing → Budgets → "Zero spend budget" yoki oylik, masalan, 10 dollar chegarasi bilan; xarajat 80% ga yetganda pochtaga xat. Bu bir daqiqalik ish va u xavfsizlik vositasi: kriptomayning hujumi birinchi navbatda **hisob-kitobda** ko'rinadi.

:::warn
AWS bepul daraja (Free Tier) shartlari vaqti-vaqti bilan o'zgaradi — 2025-yilda yangi hisoblar uchun kredit asosidagi modelga o'tildi. Hisob ochishdan oldin `aws.amazon.com/free` sahifasida joriy shartlarni o'qing. Bepul daraja hamma narsani qamramaydi: masalan, NAT gateway va ba'zi baza turlari darhol pullik. Shuning uchun 4-qadam ixtiyoriy emas.
:::

Kundalik admin uchun AWS tavsiyasi — **IAM Identity Center** (SSO): foydalanuvchilar bitta portal orqali kiradi, terminal uchun esa vaqtinchalik kalitlar oladi. Kichik o'quv hisobida MFA bilan himoyalangan oddiy IAM foydalanuvchi ham bo'ladi — lekin unga **doimiy access key** berishdan qoching.

## IAM: kim nima qila oladi

[[iam|IAM]] (Identity and Access Management) — AWS'dagi har bir so'rov uchun bitta savolga javob beradigan xizmat: **bu identifikatsiya bu resurs ustida bu amalni bajara oladimi?**

| Tushuncha | Nima | Misol |
|---|---|---|
| **User** | Odam yoki dastur uchun doimiy identifikatsiya | `aziz` |
| **Group** | Foydalanuvchilar to'plami; siyosat guruhga biriktiriladi | `developers` |
| **Role** | Vaqtincha "kiyiladigan" identifikatsiya; doimiy paroli yoki kaliti yo'q | `qaydnoma-ec2-role` — serverga beriladi |
| **Policy** | JSON hujjat: nimaga ruxsat yoki taqiq | "S3'dagi bitta bucket'ni o'qish" |

Oddiy siyosat:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:GetObject", "s3:PutObject"],
      "Resource": "arn:aws:s3:::qaydnoma-uploads-111122223333/*"
    }
  ]
}
```

O'qing: "**Ruxsat** — S3'dan obyekt olish va qo'yish — faqat `qaydnoma-uploads-...` bucket ichidagi obyektlar uchun." Sukut bo'yicha AWS'da **hamma narsa taqiqlangan**; siyosat aniq ruxsat beradi. Bu oldingi darslardagi `policy drop` g'oyasining IAM'dagi ko'rinishi. Siyosat mantig'ini c2 bosqichida chuqur o'rganamiz.

AWS'da har bir resursning noyob nomi — **ARN** (Amazon Resource Name):

```
arn:aws:s3:::qaydnoma-uploads-111122223333/*
arn:aws:iam::111122223333:role/qaydnoma-ec2-role
arn:aws:ec2:eu-central-1:111122223333:instance/i-0abc123def4567890
 │   │   │      │             │            │
 │   │   │      region        hisob ID     resurs
 │   │   xizmat
 │   bo'lim (aws)
 prefiks
```

(S3 va IAM global xizmatlar — shuning uchun ularning ARN'ida region bo'sh.)

## CLI va kalitlar

Konsol qulay, lekin muhandislar ko'pincha **AWS CLI** bilan ishlaydi:

```bash
# Yaxshi yo'l — Identity Center orqali vaqtinchalik kalitlar
aws configure sso
aws sso login --profile oquv

# Kimligimni tekshirish — har qanday ish oldidan foydali odat
aws sts get-caller-identity --profile oquv
# {
#   "UserId": "AROA...EXAMPLE:aziz",
#   "Account": "111122223333",
#   "Arn": "arn:aws:sts::111122223333:assumed-role/AdministratorAccess/aziz"
# }
```

`aws configure` bilan doimiy access key kiritish ham mumkin — lekin bu kalit `~/.aws/credentials` faylida ochiq matnda yotadi va o'chirilmaguncha amal qiladi. Uni skriptga, `.env` faylga, Git'ga tushirish — dars boshidagi hikoya. a3 bosqichidagi qoida: **doimiy kalit o'rniga vaqtinchalik**.

## VPC: o'z tarmog'ingiz

[[vpc|VPC]] — bulut ichidagi sizga tegishli virtual tarmoq. Oldingi darsdagi segmentatsiya rejasi shu yerda amalga oshadi:

```
 VPC qaydnoma-vpc  10.10.0.0/16   (eu-central-1)
 ┌──────────────────────────────────────────────────────────┐
 │                                                          │
 │  Public subnet 10.10.1.0/24        Private subnet 10.10.2.0/24
 │  ┌───────────────────────┐         ┌───────────────────┐ │
 │  │  EC2 qaydnoma-web-01  │ ──────▶ │  RDS postgres     │ │
 │  │  (ommaviy IP bor)     │  5432   │  (ommaviy IP yo'q)│ │
 │  └──────────┬────────────┘         └───────────────────┘ │
 │             │                                            │
 │     route: 0.0.0.0/0 → IGW                               │
 └─────────────┼────────────────────────────────────────────┘
               │
        Internet Gateway (IGW)
               │
            Internet
```

| Qism | Vazifasi |
|---|---|
| **VPC** | Butun tarmoq, o'z CIDR bloki bilan (`10.10.0.0/16`) |
| **Subnet** | VPC ichidagi kichik tarmoq; har biri bitta AZ'da |
| **Internet Gateway (IGW)** | VPC'ni internetga ulaydigan eshik |
| **Route table** | Subnetdagi paketlar qayerga ketishini belgilaydi |
| **Public subnet** | Route table'ida `0.0.0.0/0 → IGW` bor subnet |
| **Private subnet** | Internetga to'g'ridan-to'g'ri yo'li yo'q subnet |
| **NAT gateway** | Private subnetdagi serverlarga internetga **chiqish** imkonini beradi (yangilanish uchun), lekin ichkariga kirish yo'q |

"Public" va "private" — subnetning o'zida turgan belgi emas, **route table'dagi bitta qator**. Tarmoq bosqichidagi marshrutlash va NAT shu yerda butunlay qaytib keladi.

:::warn
NAT gateway bepul darajaga kirmaydi va soatbay to'lanadi. O'quv laboratoriyasida uni kerak bo'lganda yarating va ish tugagach o'chiring — aks holda oylik hisobning eng katta qatori aynan u bo'ladi.
:::

```bash
aws ec2 create-vpc --cidr-block 10.10.0.0/16 \
  --tag-specifications 'ResourceType=vpc,Tags=[{Key=Name,Value=qaydnoma-vpc}]'
aws ec2 create-subnet --vpc-id vpc-0abc... --cidr-block 10.10.1.0/24 --availability-zone eu-central-1a
aws ec2 create-subnet --vpc-id vpc-0abc... --cidr-block 10.10.2.0/24 --availability-zone eu-central-1a
aws ec2 create-internet-gateway
# ... IGW'ni VPC'ga ulash, route table yaratib 0.0.0.0/0 → IGW qo'shish, public subnetga biriktirish
```

Birinchi marta buni **konsolda** qiling ("VPC and more" ustasi butun sxemani chizib beradi) — har bir qism qanday bog'langanini ko'rasiz. CLI va keyin Terraform (c3) — takrorlash uchun.

## EC2: virtual server

[[ec2|EC2]] — oldingi darsdagi `qaydnoma-web-01` ning bulutdagi ko'rinishi. Server yaratishda tanlanadiganlar:

| Parametr | Ma'nosi | Xavfsizlik nuqtai nazaridan |
|---|---|---|
| AMI | Server tasviri (Ubuntu, Amazon Linux…) | Rasmiy va yangi AMI tanlang |
| Instance type | Kuch: `t3.micro`, `m6i.large`… | Kichikdan boshlang — xarajat |
| Key pair | SSH ochiq kaliti | Yoki umuman SSH'siz — Session Manager |
| Subnet | Qaysi subnetda | Web — public, qolgani — private |
| Security group | Server firewall'i | Faqat kerakli portlar |
| IAM role | Server qaysi AWS amallarini bajara oladi | Kalit o'rniga rol |
| User data | Birinchi ishga tushishda bajariladigan skript | Sir yozmang — u metadata orqali o'qiladi |
| Metadata options | IMDS sozlamasi | IMDSv2 majburiy (c2 bosqichi) |

```bash
# AMI ID regionga bog'liq — konsoldan yoki rasmiy Ubuntu sahifasidan oling
aws ec2 run-instances \
  --image-id ami-0abc... \
  --instance-type t3.micro \
  --subnet-id subnet-0pub... \
  --security-group-ids sg-0web... \
  --iam-instance-profile Name=qaydnoma-ec2-role \
  --metadata-options "HttpTokens=required,HttpEndpoint=enabled" \
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=qaydnoma-web-01}]'
```

**Security group** — server darajasidagi [[security-group|stateful firewall]]. Web server uchun:

| Yo'nalish | Port | Manba | Izoh |
|---|---|---|---|
| Kiruvchi | 443 | `0.0.0.0/0` | Sayt hamma uchun |
| Kiruvchi | 80 | `0.0.0.0/0` | HTTPS'ga yo'naltirish uchun |
| Kiruvchi | 22 | `198.51.100.10/32` | Faqat sizning IP'ingiz — yoki umuman yo'q |
| Chiquvchi | hammasi | `0.0.0.0/0` | Sukut bo'yicha (c2 da toraytiramiz) |

**Server ichidagi hamma narsa** — oldingi darsdagi kabi: yangilash, SSH sozlamalari, nginx. Bulut uni bekor qilmaydi; IaaS'da OS — sizniki.

**IAM role** — muhim g'oya. Qaydnoma S3'ga fayl yozishi kerak. Yomon yo'l: serverga access key qo'yish. Yaxshi yo'l: serverga rol biriktirish — AWS serverga avtomatik **vaqtinchalik** kalitlar beradi va ularni o'zi almashtirib turadi. Kalit hech qayerda yozilmaydi, Git'ga tushmaydi.

SSH o'rniga **Session Manager** (Systems Manager xizmati) — serverga brauzer yoki CLI orqali kirish, 22-port umuman ochilmaydi, har bir seans CloudTrail'ga yoziladi. Oldingi darsdagi "SSH faqat VPN orqali" g'oyasining AWS'dagi boshqariladigan varianti.

## S3: obyekt ombori

[[s3|S3]] — fayllar ("obyektlar") **bucket** deb ataladigan konteynerlarda saqlanadigan xizmat. Fayl tizimi emas: papkalar yo'q, faqat nomida `/` bo'lgan obyektlar.

```bash
aws s3api create-bucket --bucket qaydnoma-uploads-111122223333 \
  --region eu-central-1 \
  --create-bucket-configuration LocationConstraint=eu-central-1

aws s3 cp hisobot.pdf s3://qaydnoma-uploads-111122223333/2026/hisobot.pdf
aws s3 ls s3://qaydnoma-uploads-111122223333/2026/
```

Bucket nomi **butun dunyo bo'yicha noyob** bo'lishi kerak — shuning uchun hisob ID yoki tasodifiy qo'shimcha qo'shiladi.

S3 xavfsizligining asosiy qismlari:

| Sozlama | Nima qiladi | Hozirgi sukut |
|---|---|---|
| **Block Public Access** | Bucket yoki butun hisob darajasida ommaviy kirishni bloklaydi — siyosat ruxsat bersa ham | Yangi bucket'larda yoqilgan |
| **Object Ownership / ACL** | Eski ACL mexanizmini o'chiradi; ruxsat faqat siyosatlar orqali | ACL'lar o'chirilgan |
| **Bucket policy** | Bucket uchun resurs siyosati | Yo'q |
| **Shifrlash** | Diskda shifrlangan saqlash | Yangi obyektlar avtomatik shifrlanadi (SSE-S3) |
| **Versioning** | O'chirilgan yoki ustidan yozilgan faylning eski versiyasi saqlanadi | O'chirilgan |

Dars boshidagi do'kon kabi voqealar ko'p bo'lgani uchun AWS sukut sozlamalarini xavfsizroq qildi. Lekin eski bucket'lar va kimdir "tez yechim" uchun Block Public Access'ni o'chirgan holatlar hali ham ko'p — c2 bosqichida ularni qanday topishni o'rganamiz.

Bucket policy misoli — shifrlanmagan (HTTP) ulanishlarni taqiqlash:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "DenyInsecureTransport",
      "Effect": "Deny",
      "Principal": "*",
      "Action": "s3:*",
      "Resource": [
        "arn:aws:s3:::qaydnoma-uploads-111122223333",
        "arn:aws:s3:::qaydnoma-uploads-111122223333/*"
      ],
      "Condition": { "Bool": { "aws:SecureTransport": "false" } }
    }
  ]
}
```

`Principal: "*"` bu yerda qo'rqinchli emas — chunki `Effect: Deny`. Hamma uchun **taqiq**. `Allow` bilan `Principal: "*"` esa — butun internetga ruxsat. Bitta so'z farqi.

## RDS va Lambda

**RDS** — boshqariladigan baza (PostgreSQL, MySQL va boshqalar). Bu PaaS: OS va baza dvigatelini yangilashni AWS bajaradi, zaxira (snapshot) avtomatik. Siz uchun asosiy sozlamalar:

- **Publicly accessible: No** — baza faqat private subnetda.
- Security group: 5432 portga faqat web server security group'idan (IP emas, **SG identifikatori** manba sifatida).
- Shifrlash yoqilgan, avtomatik zaxira saqlash muddati belgilangan.
- Master parol — Secrets Manager'da (c2).

**Lambda** — serverless funksiya. Masalan, S3'ga yangi fayl yuklanganda uni tekshiradigan kichik funksiya. Server yo'q — lekin funksiyaning **IAM roli**, kodi va kutubxonalari bor. Lambda'da xavfsizlik savollari: rolda ortiqcha ruxsat yo'qmi, muhit o'zgaruvchilarida sir yo'qmi, kutubxonalar yangilanganmi (a3 bosqichidagi SCA).

## Hammasi birga

```
 Foydalanuvchi ─▶ 443 ─▶ [EC2: nginx + Qaydnoma] ─▶ 5432 ─▶ [RDS postgres]
                          │  public subnet              private subnet
                          │  SG: 443, 80
                          │  IAM role: qaydnoma-ec2-role
                          ▼
                   [S3: qaydnoma-uploads-...]
                    Block Public Access, faqat HTTPS
 Hamma API amallari ─▶ CloudTrail ─▶ S3 (jurnal bucket)
```

Keyingi darsda Azure va GCP'dagi muqobillarini, undan keyin esa shu sxemani to'liq "uch qatlamli" ilovaga aylantirishni ko'ramiz.

## AWS nimani qilmaydi

- Byudjet ogohlantirishi xarajatni **to'xtatmaydi** — faqat xabar beradi. To'xtatish uchun avtomatik choralar alohida sozlanadi; asosiy himoya baribir kalitlarni sizdirmaslik.
- Security group va Block Public Access tarmoq va kirishni boshqaradi, ilovadagi zaiflikni emas.
- AWS sizning EC2 serveringiz OS'ini yangilamaydi va ichiga qaramaydi.
- Sukut sozlamalarining yaxshilangani eski resurslarga avtomatik qo'llanmaydi.

:::try
O'quv AWS hisobida (byudjet ogohlantirishini **birinchi** qo'yib):

1. Root'ga MFA qo'shing. IAM → Security recommendations'da nima ko'rinadi?
2. `aws sts get-caller-identity` natijasidagi `Arn` ni o'qing: siz user'misiz yoki assumed-role?
3. "VPC and more" ustasi bilan public va private subnetli VPC yarating (NAT gateway: **None**). Public subnetning route table'ida qaysi qator uni "public" qiladi?
4. S3 bucket yarating va Permissions → Block public access holatini tekshiring. Yuqoridagi `DenyInsecureTransport` siyosatini qo'shing.
5. Ish tugagach: EC2, NAT, Elastic IP, RDS — hammasini o'chiring. Billing → Bills'da ertasi kuni nima qolganini tekshiring.

**Javoblar:**
1. Root MFA qo'shilgach, tegishli tavsiya yashil belgi bilan bajarilgan ko'rinadi; root access key bo'lsa — uni o'chirish tavsiyasi chiqadi.
2. Identity Center orqali kirgan bo'lsangiz — `assumed-role/...`; doimiy kalitli IAM user bo'lsangiz — `user/...`. Birinchisi afzal.
3. `0.0.0.0/0 → igw-...` qatori. Private subnetning route table'ida faqat `10.10.0.0/16 → local` bor.
4. To'rtta katakchaning hammasi "On". Siyosat saqlangandan keyin `http://` orqali so'rov `AccessDenied` qaytaradi.
5. Odatiy "unutilganlar": Elastic IP (serverga ulanmagan bo'lsa ham pullik), EBS snapshotlar, boshqa regionda qolgan resurslar. Konsol yuqorisidagi region tanlovchini tekshiring.
:::

## Xulosa

- Birinchi soat: root'ga MFA, root access key yo'q, alohida admin, byudjet ogohlantirishi, CloudTrail trail.
- IAM: user, group, role, policy. Sukut bo'yicha hamma narsa taqiqlangan; siyosat aniq ruxsat beradi.
- Doimiy access key o'rniga vaqtinchalik: Identity Center, serverlar uchun IAM role.
- VPC: subnet "public" bo'lishi — route table'dagi `0.0.0.0/0 → IGW` qatori. Baza private subnetda.
- EC2: security group — stateful firewall; server ichi (OS, SSH) baribir sizniki; SSH o'rniga Session Manager.
- S3: Block Public Access, ACL'siz, shifrlash — yangi bucket'larda sukut; `Allow` + `Principal: "*"` — butun internetga ochish.
- RDS — publicly accessible emas; manba sifatida IP emas, security group.
- Ish tugagach resurslarni o'chiring: NAT gateway va Elastic IP — klassik unutilganlar.

:::quiz
? AWS hisobini ochgandan keyin root foydalanuvchi bilan birinchi navbatda nima qilish kerak?
+ MFA qo'shish va root uchun access key yaratmaslik
- Root uchun access key yaratib, skriptlarda ishlatish
- Root parolini hamkasblarga ulashish
- Root'ni o'chirish
! Root hisobdagi hamma narsaga cheksiz huquqli; uni MFA bilan himoyalab, kundalik ishda ishlatmaslik kerak.

? Nega byudjet ogohlantirishi xavfsizlik vositasi hisoblanadi?
- U hujumlarni bloklaydi
+ O'g'irlangan kalit bilan kriptomayning kabi hujumlar ko'pincha birinchi bo'lib xarajatda ko'rinadi
- U root parolini almashtiradi
- U CloudTrail'ni yoqadi
! Xarajat anomaliyasi — erta signal. Lekin ogohlantirish xarajatni to'xtatmaydi, faqat xabar beradi.

? Subnetni "public" qiladigan narsa nima?
- Subnet nomidagi "public" so'zi
+ Uning route table'idagi `0.0.0.0/0` → Internet Gateway marshruti
- Subnetning CIDR bloki katta bo'lishi
- Subnetda EC2 bo'lishi
! Public/private — marshrutlash xususiyati: internet gateway'ga yo'l bor yoki yo'q.

? Qaydnoma serveri S3'ga fayl yozishi kerak. Eng xavfsiz yo'l qaysi?
- Access key'ni kodga yozish
- Access key'ni `.env` faylga yozib Git'ga yuklash
+ EC2'ga kerakli ruxsatli IAM role biriktirish
- Bucket'ni ommaviy qilish
! Rol serverga avtomatik almashtiriladigan vaqtinchalik kalitlar beradi; doimiy kalit hech qayerda yozilmaydi.

? Bucket policy'da `"Effect": "Allow"` va `"Principal": "*"` nimani anglatadi?
- Faqat hisob ichidagi foydalanuvchilarga ruxsat
+ Shartlar cheklamasa — butun internetga ruxsat
- Hech kimga ruxsat yo'q
- Faqat root'ga ruxsat
! Principal "*" — har qanday kishi. Allow bilan birga bu ommaviy kirish (Block Public Access buni to'sishi mumkin).

? `"Effect": "Deny"`, `"Principal": "*"` va `aws:SecureTransport = false` sharti nima qiladi?
+ HTTPS'siz kelgan barcha so'rovlarni hamma uchun taqiqlaydi
- Bucket'ni ommaviy qiladi
- Faqat HTTP'ga ruxsat beradi
- Shifrlashni o'chiradi
! Deny + "*" — hamma uchun taqiq; shart faqat shifrlanmagan ulanishlarga qo'llanadi.

? RDS bazasi uchun to'g'ri sozlama qaysi?
- Public subnet, Publicly accessible: Yes, 5432 port `0.0.0.0/0` dan
+ Private subnet, Publicly accessible: No, 5432 faqat web server security group'idan
- Har qanday subnet, parolsiz
- Public subnet, lekin port 5433
! Baza internetdan ko'rinmasligi va faqat kerakli ilova serveridan ulanishi kerak.

? NAT gateway nima uchun kerak?
- Private subnetga internetdan kirish uchun
+ Private subnetdagi serverlarga internetga chiqish (masalan, yangilanish) imkonini berish uchun, ichkariga kirishsiz
- S3 bucket'ni shifrlash uchun
- IAM foydalanuvchilarni boshqarish uchun
! NAT faqat chiquvchi ulanishlarni o'tkazadi. Esda tuting: u soatbay to'lanadi.

? Session Manager'ning SSH'ga nisbatan xavfsizlik afzalligi qaysi?
- U tezroq
+ 22-port ochilmaydi va har bir seans CloudTrail'ga yoziladi
- Parol kerak emas, shuning uchun hamma kira oladi
- U faqat Windows'da ishlaydi
! Kirish IAM orqali boshqariladi, tarmoq porti ochilmaydi, seanslar audit qilinadi.

? `aws sts get-caller-identity` buyrug'i nima beradi?
- Barcha foydalanuvchilar ro'yxatini
+ Joriy so'rov qaysi hisob va qaysi identifikatsiya (user yoki rol) nomidan ketayotganini
- Hisobning oylik xarajatini
- Root parolini
! Har qanday muhim ishdan oldin "men kimman va qaysi hisobdaman" deb tekshirish — foydali odat. Hujumchilar ham o'g'irlangan kalit bilan birinchi shu so'rovni yuboradi.
:::

:::cards
Root user :: AWS hisobidagi cheksiz huquqli foydalanuvchi; MFA bilan, kundalik ishda ishlatilmaydi
IAM role :: Doimiy kaliti yo'q, vaqtincha "kiyiladigan" identifikatsiya; serverlar va xizmatlar uchun
IAM policy :: Nimaga ruxsat yoki taqiq ekanini belgilaydigan JSON hujjat
ARN :: AWS resursining noyob nomi: arn:aws:xizmat:region:hisob:resurs
VPC :: Bulut ichidagi o'zingizga tegishli virtual tarmoq
Public subnet :: Route table'ida 0.0.0.0/0 → IGW bor subnet
NAT gateway :: Private subnetdan internetga chiqish imkoni; pullik
Security group :: EC2 darajasidagi stateful firewall
Block Public Access :: S3'da ommaviy kirishni siyosatdan ustun turib bloklaydigan sozlama
Session Manager :: Port ochmasdan, IAM orqali va audit bilan serverga kirish
Byudjet ogohlantirishi :: Xarajat chegarasidan oshganda xabar; to'xtatmaydi
aws sts get-caller-identity :: Qaysi hisob va qaysi identifikatsiya nomidan ishlayotganimni ko'rsatadi
:::
