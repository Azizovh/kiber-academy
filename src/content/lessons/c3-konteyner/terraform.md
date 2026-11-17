c1 bosqichida uch qatlamli Qaydnoma'ni konsolda qurdingiz: VPC, oltita subnet, route table'lar, security group zanjiri, ALB, Auto Scaling, RDS. Bir necha soat ish. Keyin uni o'chirdingiz — yana bir soat, tartibni eslab.

Endi uch vaziyat:

- Jamoa aytadi: "Test muhiti kerak — ishlab chiqarishning **aynan** nusxasi." Qo'lda qayta qurasizmi? Va u haqiqatan aynan nusxa bo'ladimi?
- Uch oydan keyin auditor so'raydi: "Bu security group'dagi 22-port qoidasini kim, qachon va nega qo'shgan?" Konsolda buning tarixi yo'q (c2 bosqichidagi Config bo'lmasa).
- Kimdir "tez tuzatish" uchun konsolda sozlamani o'zgartirdi. Endi haqiqiy infratuzilma hech qayerda yozilmagan holatda.

Javob — infratuzilmani **kod** sifatida yozish ([[iac|IaC]]). a4 bosqichida CI/CD konveyeri va IaC skanerlash haqida qisqacha gaplashdik. Bu dars — eng keng tarqalgan IaC vositasi [[terraform|Terraform]] bilan amaliy ish va uning eng nozik xavfsizlik nuqtasi: **state fayli**.

## Nega kod

| Konsolda qo'lda | Kod bilan |
|---|---|
| Nima qilingani — odamning xotirasida | Nima qilingani — faylda, Git'da |
| Har safar biroz boshqacha | Har safar bir xil |
| O'zgarishni hech kim ko'rib chiqmaydi | O'zgarish — pull request, kod sharhi (a3) |
| Tarix yo'q | `git log` — kim, qachon, nega |
| Muhitlarni qayta qurish — soatlar | `terraform apply` — daqiqalar |
| Xavfsizlik tekshiruvi — ishlab chiqarishda (CSPM) | Joylashdan **oldin** ham (keyingi dars) |

Xavfsizlik uchun eng muhim qatorlar — 3-chi va oxirgisi: infratuzilma o'zgarishi kod sharhidan va avtomatik tekshiruvdan o'tadi, xuddi ilova kodi kabi.

## Terraform qanday ishlaydi

```
 .tf fayllar (siz yozasiz)          state (Terraform eslab qoladi)
   "kerakli holat"                    "oxirgi ma'lum holat"
          │                                  │
          └──────────┬───────────────────────┘
                     ▼
              terraform plan  ──▶  bulut API'sidan haqiqiy holatni o'qiydi
                     │             va uchalasini solishtiradi
                     ▼
         "+ 6 yaratiladi, ~ 1 o'zgaradi, - 0 o'chiriladi"
                     │
                     ▼
              terraform apply ──▶  provider bulut API'sini chaqiradi
                                   ──▶ state yangilanadi
```

| Tushuncha | Ma'nosi |
|---|---|
| **Provider** | Bulut yoki xizmat bilan gaplashadigan plagin (`aws`, `azurerm`, `google`, `kubernetes`…) |
| **Resource** | Yaratiladigan narsa: `aws_vpc`, `aws_instance`, `aws_s3_bucket` |
| **Data source** | Mavjud narsani o'qish (masalan, eng yangi Ubuntu AMI) |
| **Variable / output** | Kirish parametrlari va natija qiymatlari |
| **State** | Terraform yaratgan resurslar va ularning atributlari ro'yxati |
| **Module** | Qayta ishlatiladigan resurslar to'plami (masalan, "standart VPC") |

Asosiy buyruqlar:

```bash
terraform init       # provider va modullarni yuklab olish, backend'ni sozlash
terraform fmt        # kodni formatlash
terraform validate   # sintaksis va ichki moslik
terraform plan       # nima o'zgarishini ko'rsatadi — hech narsa qilmaydi
terraform apply      # rejani bajarish (tasdiq so'raydi)
terraform destroy    # hammasini o'chirish
```

## Qaydnoma: VPC va server kod bilan

```hcl
# versions.tf
terraform {
  required_version = ">= 1.6"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.region
  default_tags {
    tags = {
      Project = "qaydnoma"
      Env     = var.env
      Owner   = "aziz"
    }
  }
}
```

`default_tags` — c1 bosqichidagi teglash qoidasi endi avtomatik: har bir resurs teglanadi.

```hcl
# variables.tf
variable "region" {
  type    = string
  default = "eu-central-1"
}

variable "env" {
  type = string
}

variable "admin_cidr" {
  description = "SSH ruxsat etilgan yagona manzil (yoki umuman bo'sh qoldiring — Session Manager)"
  type        = string
}
```

```hcl
# network.tf
resource "aws_vpc" "main" {
  cidr_block           = "10.10.0.0/16"
  enable_dns_hostnames = true
}

resource "aws_subnet" "public_a" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.10.1.0/24"
  availability_zone = "${var.region}a"
}

resource "aws_security_group" "web" {
  name   = "qaydnoma-web-${var.env}"
  vpc_id = aws_vpc.main.id

  ingress {
    description = "HTTPS"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    description = "HTTPS chiqish (yangilanishlar, AWS API)"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
}
```

(Internet gateway va route table'lar ham xuddi shunday resurslar — qisqalik uchun tushirib qoldirildi.)

```hcl
# compute.tf
data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"]   # Canonical — rasmiy Ubuntu image'lari egasi
  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd-gp3/ubuntu-noble-24.04-amd64-server-*"]
  }
}

resource "aws_instance" "web" {
  ami                    = data.aws_ami.ubuntu.id
  instance_type          = "t3.micro"
  subnet_id              = aws_subnet.public_a.id
  vpc_security_group_ids = [aws_security_group.web.id]
  iam_instance_profile   = aws_iam_instance_profile.web.name

  metadata_options {
    http_tokens                 = "required"   # IMDSv2 (c2 bosqichi)
    http_put_response_hop_limit = 1
  }

  root_block_device {
    encrypted = true
  }
}
```

Bu kodda c1 va c2 bosqichlarining qarorlari **yozib qo'yilgan**: SSH porti yo'q, IMDSv2 majburiy, disk shifrlangan, teglar bor. Endi har bir yangi muhit avtomatik shunday bo'ladi — kimdir unutishi mumkin emas.

`owners` filtri muhim: AMI'ni faqat nomi bo'yicha qidirsangiz, kimdir xuddi shunday nomli **o'z** image'ini ommaviy qilib qo'ygan bo'lishi mumkin. Rasmiy egasi bo'yicha filtrlash — ta'minot zanjiri himoyasi.

## Plan'ni o'qish — xavfsizlik ko'zi bilan

```
Terraform will perform the following actions:

  # aws_security_group.web will be updated in-place
  ~ resource "aws_security_group" "web" {
      ~ ingress = [
          + {
              + cidr_blocks = ["0.0.0.0/0"]
              + from_port   = 22
              + to_port     = 22
              ...
            },
        ]
    }

  # aws_db_instance.main must be replaced
-/+ resource "aws_db_instance" "main" {
      ~ storage_encrypted = false -> true # forces replacement
        ...
    }

Plan: 1 to add, 1 to change, 1 to destroy.
```

| Belgi | Ma'nosi | E'tibor |
|---|---|---|
| `+` | Yaratiladi | Yangi ommaviy resurs emasmi? |
| `~` | Joyida o'zgaradi | Security group, siyosat, shifrlash o'zgarishlari |
| `-/+` | O'chirilib, qayta yaratiladi | **Baza!** Ma'lumot yo'qolishi mumkin |
| `-` | O'chiriladi | Kutilganmi? |

Bu plan'da ikkita qizil bayroq: 22-port butun internetga ochilmoqda va baza **qayta yaratilmoqda**. Ikkinchisi yaxshi niyatdan kelib chiqqan — kimdir shifrlashni yoqmoqchi bo'lgan. Lekin c2 bosqichidagi ma'lumot himoyasi darsidan eslang: mavjud RDS bazasini joyida shifrlab bo'lmaydi, shuning uchun Terraform uni o'chirib, yangisini (bo'sh!) yaratishni rejalashtirgan. To'g'ri yo'l — snapshot orqali ko'chirish. Plan — kod sharhining eng muhim qismi: kod qatorlarini emas, **natijani** ko'rsatadi. Muhim resurslarga `lifecycle { prevent_destroy = true }` qo'yiladi — Terraform ularni o'chiradigan rejani bajarishdan bosh tortadi.

## State fayli — eng nozik nuqta

Terraform yaratgan har bir resursni state faylida (`terraform.tfstate`, JSON) eslab qoladi — **barcha atributlari bilan**. Bunga quyidagilar kirishi mumkin:

- baza parollari (agar Terraform orqali berilgan bo'lsa);
- Terraform yaratgan maxfiy kalitlar va tokenlar;
- ichki IP manzillar, resurs ID'lari — hujumchi uchun xarita.

```json
{
  "type": "aws_db_instance",
  "name": "main",
  "instances": [{
    "attributes": {
      "username": "qaydnoma_admin",
      "password": "ochiq-matndagi-parol",
      "endpoint": "qaydnoma-prod.xxxx.eu-central-1.rds.amazonaws.com:5432"
    }
  }]
}
```

:::warn
`sensitive = true` belgisi qiymatni faqat **terminal chiqishida** yashiradi (`(sensitive value)`). State faylida u baribir ochiq turadi. State'ni o'qiy oladigan har kim — sirni o'qiy oladi.
:::

State'ni himoyalash:

| Chora | Qanday |
|---|---|
| Git'ga hech qachon | `.gitignore`: `*.tfstate`, `*.tfstate.*`, `.terraform/` |
| Masofaviy backend | S3 bucket — Block Public Access, shifrlash (KMS), versioning (buzilgan state'ni tiklash uchun) |
| Kirish | Faqat CI roli va bir-ikki ma'mur; c2 bosqichidagi bucket siyosati va IAM |
| Qulflash (locking) | Ikki kishi bir vaqtda `apply` qilib state'ni buzmasligi uchun |
| Sirlarni state'ga kiritmaslik | RDS uchun `manage_master_user_password = true` — parolni RDS va Secrets Manager boshqaradi, state'da yo'q (c2 sirlar darsi) |
| Muhitlar bo'yicha ajratish | Prod va dev — alohida state, alohida bucket yoki hisob |

```hcl
terraform {
  backend "s3" {
    bucket       = "qaydnoma-tfstate-111122223333"
    key          = "prod/network.tfstate"
    region       = "eu-central-1"
    encrypt      = true
    use_lockfile = true    # S3'ning o'zida qulflash (Terraform 1.10+); eskiroq versiyalarda DynamoDB jadvali
  }
}
```

Terraform'ning yangi versiyalarida state'ga umuman yozilmaydigan "ephemeral" qiymatlar ham paydo bo'ldi — sirlar bilan ishlashda hujjatlarni tekshiring. Lekin eng ishonchli yo'l — sirni Terraform orqali umuman o'tkazmaslik.

## Drift — kod va haqiqat farqi

Kimdir konsolda security group'ga qoida qo'shdi. Kod o'zgarmadi. Endi:

```bash
terraform plan
# ~ aws_security_group.web will be updated in-place
#   - ingress { from_port = 3389 ... cidr_blocks = ["0.0.0.0/0"] }
```

Terraform kodda yo'q qoidani **olib tashlashni** taklif qilmoqda — chunki kod — haqiqat manbai. Bu **drift**: haqiqiy infratuzilma koddan chetga chiqqan.

Drift xavfsizlik uchun ikki tomonlama signal:

- Kimdir kod sharhini aylanib o'tib o'zgartirish qilgan — siyosat buzilishi yoki hujum (c2 monitoring darsidagi CloudTrail `AuthorizeSecurityGroupIngress`).
- Kod endi haqiqatni tasvirlamaydi — audit va IR uchun xavfli.

Qoida: **ishlab chiqarishda konsol — faqat o'qish uchun**. O'zgarish faqat kod orqali. Muntazam (masalan, har kecha) `terraform plan` ishga tushirilib, drift topilsa xabar beriladi.

## Kim `apply` qiladi

a4 bosqichidagi CI/CD xavfsizligi tamoyillari infratuzilmaga qo'llanadi:

```
 PR ochildi ──▶ CI: fmt, validate, skanerlash (keyingi dars), plan  ──▶ plan PR'ga izoh sifatida
                     (faqat o'qish huquqli rol, OIDC orqali)
        │
   kod sharhi + plan sharhi + tasdiq
        │
 main'ga merge ──▶ CI: apply  (yozish huquqli rol, OIDC, faqat main branch'dan,
                               environment himoyasi — qo'lda tasdiq)
```

- Odamlarda ishlab chiqarishga yozish huquqi yo'q — faqat konveyerda.
- CI bulutga **doimiy kalitsiz**, OIDC orqali kiradi (a4, c2).
- Plan va apply rollari ajratilgan: PR'dagi begona kod faqat o'qish huquqli rol bilan ishlaydi.
- Plan va apply bir xil bo'lishi uchun saqlangan plan fayli ishlatiladi (`terraform plan -out=tfplan`, keyin `terraform apply tfplan`).

## Modullar va ta'minot zanjiri

Terraform kodi ham bog'liqliklarga ega — provider'lar va modullar. a3 bosqichidagi SCA tamoyillari:

- Provider versiyasini cheklang (`version = "~> 5.0"`) va **`.terraform.lock.hcl`** faylini Git'ga qo'shing — u provider'larning aniq versiyasi va xeshlarini qotiradi.
- Ommaviy registry'dagi modullardan foydalanayotganda versiyani aniq ko'rsating va manbasini tekshiring: modul sizning hisobingizda istalgan narsani yarata oladi.
- O'z tashkilotingiz uchun xavfsiz "standart" modullar yarating (masalan, "Flow Logs yoqilgan, IMDSv2 majburiy VPC va EC2") — jamoalar ularni ishlatadi va xavfsiz sozlamalar avtomatik meros qoladi.

(Eslatma: 2023-yilda Terraform litsenziyasi o'zgargach, uning ochiq manbali tarmog'i — **OpenTofu** paydo bo'ldi. Sintaksis va tushunchalar deyarli bir xil.)

## Terraform nimani qilmaydi

- Noto'g'ri sozlamani tuzatmaydi — u xatoni **takrorlanadigan** qiladi. Kodda `0.0.0.0/0` bo'lsa, u har bir muhitda bo'ladi. Shuning uchun kod skanerlanadi (keyingi dars).
- Konsoldagi o'zgarishlarni o'zi to'xtatmaydi — faqat keyingi plan'da ko'rsatadi.
- State'ni o'zi himoyalamaydi.
- Ilovani va server ichini sozlamaydi (buning uchun Ansible, image yig'ish vositalari yoki konteynerlar).

:::try
O'quv hisobingizda (byudjet ogohlantirishi yoqilgan holda):

1. Yuqoridagi kodni (internet gateway va route table'larni qo'shib) yozing, `init`, `plan`, `apply` qiling. Konsolda resurslar teglanganini tekshiring.
2. Konsolda security group'ga qo'lda qoida qo'shing. `terraform plan` nima ko'rsatadi?
3. `terraform.tfstate` faylini oching (lokal backend'da). Ichida qanday ma'lumotlar bor? Server ommaviy IP'si, AMI ID'si, security group qoidalari ko'rinadimi?
4. Backend'ni shifrlangan, versioningli S3 bucket'ga ko'chiring (`terraform init -migrate-state`).
5. `terraform destroy` bilan hammasini o'chiring. c1 bosqichidagi qo'lda o'chirish bilan solishtiring.
6. Savol: dasturchi RDS parolini `variable "db_password" { sensitive = true }` orqali bermoqda va "parol yashirin" deydi. To'g'rimi?

**Javoblar:**
1. Konsolda har bir resursda `Project`, `Env`, `Owner` teglari — `default_tags` ishlagan.
2. Plan qo'lda qo'shilgan qoidani olib tashlashni taklif qiladi (`~ update in-place`). Bu — drift.
3. Ha — resurslarning deyarli barcha atributlari ochiq JSON'da. Sir bo'lmasa ham, bu infratuzilmaning to'liq xaritasi.
4. Migratsiyadan keyin lokal `terraform.tfstate` bo'shaydi yoki o'chiriladi, S3'da `key` yo'lida fayl paydo bo'ladi; bucket versioning'i har bir `apply` dan keyingi nusxani saqlaydi.
5. Bitta buyruq va bog'liqliklar tartibini Terraform o'zi hal qiladi.
6. Qisman. Parol terminalda va plan chiqishida yashiriladi, lekin state faylida ochiq yoziladi. Yaxshiroq: `manage_master_user_password = true` — parol umuman Terraform orqali o'tmaydi.
:::

## Xulosa

- IaC: infratuzilma Git'da, kod sharhidan va avtomatik tekshiruvdan o'tadi, har safar bir xil quriladi.
- Terraform: provider, resource, data source, variable, module; `init → plan → apply → destroy`.
- Xavfsiz qarorlarni kodga yozing: IMDSv2, shifrlash, teglar, SSH'siz — har bir muhit ularni avtomatik oladi. AMI'ni rasmiy egasi bo'yicha filtrlang.
- Plan — sharhning eng muhim qismi: `-/+` (qayta yaratish) va ochilayotgan portlarga qarang; muhim resurslarga `prevent_destroy`.
- State faylida barcha atributlar, jumladan sirlar, ochiq turadi; `sensitive` faqat terminalda yashiradi. State — Git'da emas, shifrlangan, versioningli, qulflanadigan, cheklangan S3 backend'da.
- Drift — kod va haqiqat farqi; prod'da konsol faqat o'qish uchun, muntazam plan bilan drift aniqlash.
- `apply` — faqat konveyerda, OIDC bilan; plan va apply rollari ajratilgan.
- Provider va modul versiyalarini qotiring, `.terraform.lock.hcl` Git'da.

:::quiz
? IaC'ning xavfsizlik uchun asosiy foydasi qaysi?
- Bulut xarajati nolga tushadi
+ Infratuzilma o'zgarishi kod sharhi va avtomatik tekshiruvdan o'tadi, tarixi Git'da saqlanadi
- Zaifliklar avtomatik yo'qoladi
- Konsol kerak bo'lmaydi va u o'chiriladi
! Infratuzilma ilova kodi kabi ko'rib chiqiladi, tekshiriladi va takrorlanadi.

? `terraform plan` nima qiladi?
+ Kod, state va haqiqiy holatni solishtirib, nima o'zgarishini ko'rsatadi — hech narsani o'zgartirmaydi
- Barcha resurslarni yaratadi
- State faylini o'chiradi
- Faqat sintaksisni tekshiradi
! Plan — sharh uchun natija; apply uni bajaradi.

? Plan'da baza uchun `-/+` belgisi ko'rindi. Bu nimani bildiradi?
- Baza joyida yangilanadi
+ Baza o'chirilib, qayta yaratiladi — ma'lumot yo'qolishi mumkin
- Baza o'zgarmaydi
- Baza zaxiralanadi
! Bunday o'zgarish alohida e'tibor talab qiladi; `prevent_destroy` himoya qiladi.

? Terraform state faylida nima bo'lishi mumkin?
- Faqat resurs nomlari
+ Resurslarning barcha atributlari, jumladan Terraform orqali berilgan parollar va yaratilgan kalitlar
- Faqat provider versiyasi
- Hech qanday maxfiy narsa
! State — infratuzilma xaritasi va ko'pincha sirlar ombori; uni shunga yarasha himoyalash kerak.

? `sensitive = true` belgilangan o'zgaruvchi haqida qaysi gap to'g'ri?
- Qiymat state'ga yozilmaydi
+ Qiymat terminal chiqishida yashiriladi, lekin state faylida ochiq turadi
- Qiymat KMS bilan shifrlanadi
- Qiymat Git'dan avtomatik o'chiriladi
! Sirni state'dan butunlay chiqarish uchun uni Terraform orqali o'tkazmaslik kerak (masalan, RDS managed password).

? Masofaviy state backend uchun qaysi sozlamalar muhim?
- Ommaviy bucket, qulay bo'lishi uchun
+ Shifrlash, versioning, qulflash va qat'iy cheklangan kirish
- Faqat bucket nomi
- State'ni Git'da saqlash
! State buzilishi, sizib chiqishi va bir vaqtdagi apply'lardan himoya.

? Drift nima?
+ Haqiqiy infratuzilmaning koddan chetga chiqishi — masalan, konsolda qilingan o'zgarish
- Terraform versiyasining yangilanishi
- Regionlar orasidagi kechikish
- Provider xatosi
! Drift — kod sharhini aylanib o'tgan o'zgarish signali; muntazam plan bilan aniqlanadi.

? Nega AMI'ni nomi bo'yicha emas, `owners` bilan ham filtrlash kerak?
- Tezroq ishlaydi
+ Boshqa kimdir xuddi shunday nomli image'ni ommaviy qilib qo'ygan bo'lishi mumkin; rasmiy egasi bo'yicha filtr ta'minot zanjirini himoyalaydi
- Owners filtri bo'lmasa Terraform ishlamaydi
- Bu faqat Windows AMI'lari uchun
! Rasmiy Ubuntu image'lari Canonical hisobiga tegishli.

? Ishlab chiqarishga `terraform apply` kim tomonidan bajarilishi tavsiya etiladi?
- Har bir dasturchi o'z noutbukidan, doimiy kalit bilan
+ CI/CD konveyeri, main branch'dan, OIDC orqali olingan rol bilan va tasdiqdan keyin
- Faqat root foydalanuvchi
- Hech kim — konsoldan qilinadi
! Odamlarda prod yozish huquqi yo'q; plan va apply rollari ajratilgan.

? `.terraform.lock.hcl` faylini Git'ga qo'shish nima beradi?
- State faylini himoyalaydi
+ Provider'larning aniq versiyalari va xeshlarini qotiradi — har bir ishga tushishda aynan o'sha provider ishlatiladi
- Parollarni shifrlaydi
- Modullarni o'chiradi
! Bu Terraform uchun bog'liqliklarni qotirish — a3 bosqichidagi SCA tamoyili.
:::

:::cards
IaC :: Infratuzilmani kod fayllari orqali tasvirlash va boshqarish
Terraform provider :: Bulut yoki xizmat API'si bilan gaplashadigan plagin
terraform plan :: Nima o'zgarishini ko'rsatadi; hech narsani o'zgartirmaydi
-/+ (replace) :: Resurs o'chirilib qayta yaratiladi — bazalar uchun xavfli
prevent_destroy :: Muhim resursni o'chiradigan rejani bajarishni taqiqlaydi
State fayli :: Terraform yaratgan resurslarning barcha atributlari; ko'pincha sirlar ham
sensitive = true :: Qiymatni faqat terminalda yashiradi; state'da ochiq qoladi
S3 backend :: Shifrlangan, versioningli, qulflanadigan masofaviy state ombori
Drift :: Haqiqiy infratuzilmaning koddan chetga chiqishi
default_tags :: Provider darajasida barcha resurslarga avtomatik teglar
.terraform.lock.hcl :: Provider versiyalari va xeshlarini qotiradigan fayl
OpenTofu :: Terraform'ning ochiq manbali tarmog'i
:::
