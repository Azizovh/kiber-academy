c1 bosqichida Qaydnoma'ning sirlari — baza paroli va Flask `SECRET_KEY` — serverdagi `/etc/qaydnoma/env` faylida, `600` ruxsat bilan turardi. Bitta server uchun bu yomon emas edi.

Keyin uch qatlamli arxitekturaga o'tdik: Auto Scaling Group kechasi yuk oshganda **yangi** serverlar ko'taradi. Yangi server sirni qayerdan oladi? Variantlar:

- Sirni AMI (server tasviri) ichiga "pishirib" qo'yish — tasvirga kirish huquqi bor har kim parolni ko'radi, almashtirish uchun yangi tasvir kerak.
- User data skriptiga yozish — IMDS orqali va konsolda o'qiladi (c1 va oldingi darsdagi ogohlantirish).
- Terraform kodiga yozish — Git'ga tushadi.

Uchalasi ham yomon. To'g'ri javob — sirlarni **markaziy sir omborida** saqlash, ilova esa ularni ishga tushganda o'z IAM roli orqali olishi. a3 bosqichida sirlarni boshqarishning umumiy tamoyillarini o'rgandingiz; bu dars — ularning AWS'dagi amaliy ko'rinishi.

## Sirlarni qayerda saqlash mumkin

| Joy | Kim ko'radi | Almashtirish | Audit | Baho |
|---|---|---|---|---|
| Koddagi o'zgaruvchi | Repozitoriyga kirgan har kim, abadiy | Kod o'zgarishi | Yo'q | Hech qachon |
| AMI yoki konteyner image | Image'ga kirgan har kim | Yangi image | Yo'q | Hech qachon |
| User data | IMDS, `DescribeInstanceAttribute` huquqi borlar | Server qayta yaratish | Yo'q | Yo'q |
| Lambda yoki ECS muhit o'zgaruvchisi (ochiq qiymat) | Konfiguratsiyani o'qiy oladigan har kim | Qayta joylash | Qisman | Faqat sir bo'lmagan sozlamalar uchun |
| Serverdagi fayl (`600`) | Server root'i | Qo'lda, har bir serverda | Yo'q | Bitta server uchun chidasa bo'ladi |
| **SSM Parameter Store** (SecureString) | IAM ruxsati borlar | API orqali | CloudTrail | Yaxshi |
| **Secrets Manager** | IAM va resurs siyosati ruxsati borlar | **Avtomatik** | CloudTrail | Eng yaxshi (sirlar uchun) |
| HashiCorp Vault | Vault siyosati | Dinamik sirlar | O'z jurnali | Ko'p bulutli, murakkab |

## SSM Parameter Store

Parameter Store — konfiguratsiya va sirlar uchun ierarxik kalit-qiymat ombori. Uch tur bor: `String`, `StringList` va **`SecureString`** — oxirgisi KMS bilan shifrlanadi.

```
/qaydnoma/
  ├── prod/
  │     ├── db_host        (String)
  │     ├── secret_key     (SecureString)
  │     └── smtp_password  (SecureString)
  └── dev/
        ├── db_host
        └── secret_key
```

Ierarxiya ruxsatlar uchun qulay: prod serverlari roliga faqat `/qaydnoma/prod/*`, dev'ga — faqat `/qaydnoma/dev/*`.

```bash
# Qiymatni buyruq qatoriga yozmang — u shell tarixiga tushadi.
# Fayldan o'qish (keyin faylni xavfsiz o'chiring):
aws ssm put-parameter --name /qaydnoma/prod/secret_key \
  --type SecureString --key-id alias/qaydnoma-prod \
  --value file://secret_key.txt

aws ssm get-parameter --name /qaydnoma/prod/secret_key --with-decryption \
  --query Parameter.Value --output text
```

Parameter Store'ning standart darajasi bepul. Lekin unda **avtomatik almashtirish yo'q** — buning uchun Secrets Manager.

## Secrets Manager

Secrets Manager — aynan sirlar uchun yaratilgan xizmat: shifrlash (KMS), versiyalar, resurs siyosati, hisoblararo ulashish va eng muhimi — **avtomatik rotation**. Narxi — har bir sir uchun oylik to'lov va API chaqiruvlari.

```bash
aws secretsmanager create-secret --name qaydnoma/prod/db \
  --kms-key-id alias/qaydnoma-prod \
  --secret-string file://db-secret.json
# db-secret.json: {"username": "qaydnoma_app", "password": "...", "host": "...", "port": 5432}
```

Qaydnoma (Python) ichida:

```python
import json
import boto3

def load_db_config() -> dict:
    # Kalit kerak emas: boto3 server roli kalitlarini IMDS'dan o'zi oladi
    client = boto3.client("secretsmanager", region_name="eu-central-1")
    resp = client.get_secret_value(SecretId="qaydnoma/prod/db")
    return json.loads(resp["SecretString"])

DB = load_db_config()   # ilova ishga tushganda bir marta
```

Har bir so'rovda sirni qayta so'ramang — sekin va qimmat. Ishga tushganda olish yoki qisqa muddatli kesh (AWS'ning tayyor kesh kutubxonalari bor) ishlatiladi. Lekin keshni **rotation** bilan moslang: kesh muddati tugagach yoki baza "parol noto'g'ri" xatosini qaytarganda sir qayta olinadi.

Sir hech qachon jurnalga tushmasin: `print(DB)`, xato izidagi (traceback) lokal o'zgaruvchilar, debug rejimidagi muhit o'zgaruvchilari dampi — a2 bosqichidagi xavfsiz jurnallash.

## Rotation — almashtirish

Nega sirni almashtirish kerak? Chunki siz uning sizib chiqqanini **bilmasligingiz** mumkin. Har 30 kunda almashtiriladigan parol sizib chiqsa, hujumchining imkoniyat oynasi — eng ko'pi bilan 30 kun. Hech qachon almashtirilmaydigan parol — abadiy.

Secrets Manager rotation'i Lambda funksiyasi orqali, to'rt qadamda bajariladi va har bir sir versiyasiga **bosqich belgisi** (staging label) biriktiriladi:

```
 1. createSecret  — yangi parol yaratiladi, AWSPENDING belgisi bilan saqlanadi
 2. setSecret     — bazada parol yangisiga o'zgartiriladi
 3. testSecret    — yangi parol bilan bazaga ulanib tekshiriladi
 4. finishSecret  — AWSCURRENT yangi versiyaga ko'chadi, eskisi AWSPREVIOUS bo'ladi

   v1: AWSCURRENT  ──▶  v1: AWSPREVIOUS
   v2: AWSPENDING  ──▶  v2: AWSCURRENT
```

`GetSecretValue` sukut bo'yicha `AWSCURRENT` ni qaytaradi — ilova kodi o'zgarmaydi.

Ikki strategiya:

| Strategiya | Qanday | Muammo |
|---|---|---|
| Bitta foydalanuvchi | Bitta baza foydalanuvchisining paroli almashtiriladi | Almashtirish va ilova keshi yangilanishi orasida qisqa vaqt eski parol ishlamaydi |
| Navbatma-navbat foydalanuvchilar | Ikki foydalanuvchi (`app_a`, `app_b`), har safar ikkinchisining paroli almashtirilib, unga o'tiladi | Biroz murakkabroq, lekin uzilishsiz |

RDS uchun eng oddiy yo'l — **RDS'ning Secrets Manager bilan integratsiyasi**: master parolni RDS o'zi yaratadi, Secrets Manager'da saqlaydi va o'zi almashtiradi. Hech kim parolni hatto ko'rmaydi (c1 bosqichidagi uch qatlamli arxitekturada shu ishlatilgan).

:::key
Eng yaxshi sir — **mavjud bo'lmagan** sir. Imkon bo'lgan joyda doimiy sirni umuman yo'q qiling:
- AWS xizmatlariga — kalit emas, **IAM role**.
- CI/CD'dan AWS'ga — kalit emas, **OIDC** (a4 bosqichi).
- RDS'ga — parol emas, **IAM database authentication**: ilova o'z roli bilan 15 daqiqalik token oladi.
Sir ombori — qolgan, chindan yo'q qilib bo'lmaydigan sirlar uchun (uchinchi tomon API kalitlari, SMTP paroli, imzolash kalitlari).
:::

## Kirish nazorati

Sirlarga kirish — IAM darsidagi tamoyillar, ammo eng qat'iy ko'rinishda:

```json
{
  "Sid": "QaydnomaProdSecretsOnly",
  "Effect": "Allow",
  "Action": "secretsmanager:GetSecretValue",
  "Resource": "arn:aws:secretsmanager:eu-central-1:111122223333:secret:qaydnoma/prod/*"
}
```

| Chora | Nega |
|---|---|
| Har bir ilova faqat o'z sirlariga | Bitta ilova buzilsa, boshqalarning sirlari omon |
| Prod va dev — alohida hisoblarda | Dasturchining dev ruxsati prod sirlariga yetmaydi |
| Har bir muhit uchun alohida KMS kaliti | Kalit siyosati — ikkinchi to'siq (ma'lumot himoyasi darsi) |
| Sirning resurs siyosati | "Faqat shu rol va faqat shu VPC endpoint orqali" |
| Odamlar uchun — favqulodda kirish | Kundalik ishda odam prod sirini ko'rmaydi; kerak bo'lsa — so'rov va jurnal bilan |

## Audit va signallar

Har bir `GetSecretValue` — CloudTrail'dagi yozuv. SOC tarmog'idagi b4 jadvalini eslang: "`GetSecretValue` — ko'p sirlar ketma-ket" — parol va kalitlarni yig'ish (Credential Access).

Detection g'oyalari (b2 bosqichidagi detection engineering):

| Signal | Nima bo'lishi mumkin |
|---|---|
| Bitta identifikatsiya qisqa vaqtda ko'p turli sirlarni o'qidi | Sir yig'ish |
| Ilova roli o'z sirlaridan boshqasini so'radi (`AccessDenied`) | Buzilgan server atrofni o'rganmoqda |
| Odam foydalanuvchi prod sirini o'qidi | Siyosat buzilishi yoki favqulodda holat — tekshirish |
| `DeleteSecret`, `PutResourcePolicy` | Sirni yo'q qilish yoki tashqariga ochish |
| Rotation muvaffaqiyatsiz | Sir eskiryapti, ehtimol ilova uzilishi yaqin |

## Konteynerlar va serverless

c3 bosqichida batafsil, hozir — g'oya:

- **ECS**: task definition'da `secrets` maydoni sirning ARN'iga ishora qiladi — ECS konteyner ishga tushishida qiymatni o'zi olib, muhit o'zgaruvchisiga qo'yadi. Task definition'da qiymatning o'zi yo'q.
- **Lambda**: muhit o'zgaruvchisida ochiq sir emas — funksiya ishga tushishda Secrets Manager'dan oladi (yoki AWS'ning Parameters and Secrets Lambda Extension orqali keshlab).
- **Kubernetes**: Kubernetes `Secret` obyekti sukut bo'yicha faqat Base64 — shifrlash emas (s5 bosqichidagi kodlash va shifrlash farqi!). Shuning uchun tashqi sir omborini ulaydigan vositalar ishlatiladi (External Secrets Operator, Secrets Store CSI driver).

## Tez-tez uchraydigan xatolar

- Sir ombori bor, lekin ilova roli `secretsmanager:GetSecretValue` ga `"Resource": "*"` bilan ega — barcha sirlarni o'qiy oladi.
- Sir Terraform orqali yaratilgan va qiymati Terraform **state** faylida ochiq yotibdi (c3 bosqichidagi Terraform darsi).
- Sir almashtirildi, lekin ilova eskisini keshda saqlab, soatlab ishlamay qoldi — rotation sinalmagan.
- O'chirilgan sir: Secrets Manager darhol o'chirmaydi (7–30 kunlik tiklash oynasi). Bu xato o'chirishdan himoya — lekin bir xil nomli sirni darhol qayta yaratib bo'lmaydi.
- Sir ombori ishlamay qolsa (masalan, endpoint yoki ruxsat xatosi), yangi serverlar ishga tushmaydi. Monitoring va sinov kerak.

## Sir ombori nimani qilmaydi

- Ilova buzilsa, hujumchi uning **o'z roli** bilan sirlarni oladi. Ombor buni to'xtatmaydi — lekin zarar shu ilova sirlari bilan cheklanadi, har bir o'qish jurnalga yoziladi va rotation hujumchi olgan nusxani eskirtiradi.
- Allaqachon sizib chiqqan sirni qaytarmaydi — uni darhol almashtirish kerak.
- Kodga yozilgan sirni o'zi topmaydi — buning uchun sir skanerlash (a3).

:::try
1. Parameter Store'da `/oquv/dev/greeting` (`String`) va `/oquv/dev/api_key` (`SecureString`) yarating. `get-parameter` bilan `--with-decryption` dan oldin va keyin natijani solishtiring.
2. Secrets Manager'da `oquv/dev/db` sirini yarating. Kichik Python skripti bilan uni o'qing (o'quv hisobingizdagi rol yoki Identity Center sessiyasi bilan).
3. CloudTrail'da 2-qadamdagi `GetSecretValue` hodisasini toping. Javob qiymati jurnalda bormi?
4. Faqat `oquv/dev/*` sirlarini o'qiy oladigan IAM siyosatini yozing va `oquv/prod/test` sirini o'qishga urinib, natijani tekshiring.
5. Savol: Kubernetes `Secret` obyektida `cGFyb2wxMjM=` qiymati turibdi. Bu shifrlanganmi?

**Javoblar:**
1. `--with-decryption` siz SecureString shifrlangan matn (uzun Base64 qator) bo'lib qaytadi; flag bilan — ochiq qiymat (agar KMS ruxsati bo'lsa).
2. `boto3` kalitni o'zi topadi (`~/.aws` dagi profil yoki muhitdagi sessiya). `AccessDenied` bo'lsa — IAM va KMS ruxsatlarini tekshiring.
3. Yo'q. CloudTrail kim, qachon, qaysi sirni so'raganini yozadi, lekin sir qiymatini **yozmaydi** — `responseElements` bo'sh.
4. `oquv/prod/test` uchun `AccessDeniedException`. Bu natija CloudTrail'da ham `errorCode` bilan ko'rinadi — yuqoridagi signal jadvalining ikkinchi qatori.
5. Yo'q — bu Base64. Terminalda `echo cGFyb2wxMjM= | base64 -d` uni ochiq matnga aylantiradi. Kodlash — shifrlash emas.
:::

## Xulosa

- Ko'p serverli va avtomatik kengayadigan muhitda sirlar AMI, user data, kod yoki ochiq muhit o'zgaruvchilarida emas — markaziy omborda.
- Parameter Store (SecureString) — oddiy va arzon; Secrets Manager — sirlar uchun, avtomatik rotation bilan.
- Ilova sirni o'z IAM roli bilan oladi; keshlaydi, lekin rotation'ni hisobga oladi; sir jurnalga tushmaydi.
- Rotation: AWSPENDING → AWSCURRENT → AWSPREVIOUS. RDS uchun — boshqariladigan master parol.
- Eng yaxshi sir — yo'q sir: IAM role, OIDC, IAM database authentication.
- Kirish: har bir ilova faqat o'z sirlariga, prod va dev alohida hisoblarda, alohida KMS kalitlari.
- CloudTrail'da `GetSecretValue` — kim nimani o'qidi (qiymatsiz). Ko'p sirlarni ketma-ket o'qish — signal.
- Kubernetes `Secret` — Base64, shifrlash emas.

:::quiz
? Auto Scaling Group'dagi yangi server baza parolini qayerdan olishi to'g'ri?
- AMI ichiga yozilgan fayldan
- User data skriptidan
+ Ishga tushganda o'z IAM roli orqali Secrets Manager yoki Parameter Store'dan
- Terraform kodidagi o'zgaruvchidan
! Sir markaziy omborda, kirish — rol orqali, har bir o'qish jurnalga yoziladi.

? SSM Parameter Store'ning qaysi turi KMS bilan shifrlanadi?
- String
- StringList
+ SecureString
- Hammasi bir xil
! SecureString qiymati KMS kaliti bilan shifrlanadi; o'qish uchun KMS ruxsati ham kerak.

? Secrets Manager'ning Parameter Store'dan asosiy afzalligi qaysi?
+ Avtomatik rotation (va sirlar uchun maxsus imkoniyatlar)
- Bepul
- Shifrlash umuman ishlatilmaydi
- Faqat bitta regionda ishlaydi
! Secrets Manager Lambda yoki RDS integratsiyasi orqali sirlarni avtomatik almashtiradi.

? Nega sirlarni muntazam almashtirish kerak?
- Parollar vaqt o'tib zaiflashadi
+ Sir sizib chiqqanini bilmasligingiz mumkin; rotation hujumchining imkoniyat oynasini cheklaydi
- AWS buni talab qilgani uchun
- Bu ilovani tezlashtiradi
! Almashtirilmaydigan sir sizib chiqsa, abadiy ishlaydi.

? Rotation jarayonida `AWSPENDING` belgisi nimani bildiradi?
- O'chirilgan eski versiya
+ Yaratilgan, lekin hali tekshirilmagan va faollashtirilmagan yangi versiya
- Hozir ishlatilayotgan versiya
- Shifrlanmagan versiya
! Test muvaffaqiyatli bo'lgach, AWSCURRENT yangi versiyaga ko'chadi.

? Qaysi yondashuv doimiy sirni butunlay yo'q qiladi?
- Parolni 64 belgili qilish
+ RDS uchun IAM database authentication — ilova o'z roli bilan qisqa muddatli token oladi
- Parolni Base64 bilan kodlash
- Parolni ikki faylga bo'lib saqlash
! Token 15 daqiqa amal qiladi va IAM orqali beriladi; saqlanadigan parol yo'q.

? CloudTrail'dagi `GetSecretValue` yozuvida nima bo'lmaydi?
- Kim so'ragani
- Qaysi sir so'ralgani
- Qachon so'ralgani
+ Sirning qiymati
! CloudTrail sir qiymatini yozmaydi — faqat kirish fakti.

? Ilova roli `secretsmanager:GetSecretValue` ga `"Resource": "*"` bilan ega. Muammo nima?
- Muammo yo'q
+ Ilova buzilsa, hujumchi hisobdagi barcha sirlarni o'qiy oladi
- Ilova o'z sirini o'qiy olmaydi
- Rotation ishlamaydi
! Har bir ilova faqat o'z sirlariga, aniq ARN yoki prefiks bilan ruxsat oladi.

? Kubernetes `Secret` obyektidagi qiymat haqida qaysi gap to'g'ri?
- U sukut bo'yicha AES-256 bilan shifrlangan
+ U sukut bo'yicha faqat Base64 bilan kodlangan — shifrlash emas
- Uni hech kim o'qiy olmaydi
- U avtomatik Secrets Manager'ga yuboriladi
! Kodlash — shifrlash emas (s5). Tashqi sir ombori yoki etcd shifrlash kerak.

? Hujumchi Qaydnoma serverini buzdi. Secrets Manager nima beradi?
- Hujumchi sirlarni umuman ololmaydi
+ Hujumchi ilova roli ruxsat bergan sirlarni oladi, lekin zarar shu bilan cheklanadi, o'qishlar jurnalga yoziladi va rotation olingan nusxani eskirtiradi
- Secrets Manager serverni avtomatik izolyatsiya qiladi
- Hech qanday foyda bermaydi
! Sir ombori ruxsatli kirishni to'xtatmaydi, lekin ko'lam, audit va rotation orqali zararni kamaytiradi.
:::

:::cards
Sir ombori :: Sirlarni markaziy, shifrlangan, ruxsat va audit bilan saqlaydigan xizmat
SSM Parameter Store :: Ierarxik konfiguratsiya va sirlar ombori; SecureString — KMS bilan
Secrets Manager :: Sirlar uchun xizmat: versiyalar, resurs siyosati, avtomatik rotation
Rotation :: Sirni muntazam almashtirish — sizib chiqqan nusxa eskiradi
AWSCURRENT :: Secrets Manager'da hozir ishlatilayotgan sir versiyasi
AWSPENDING :: Yaratilgan, lekin hali faollashtirilmagan yangi versiya
RDS managed master password :: RDS o'zi yaratadigan va almashtiradigan, hech kim ko'rmaydigan parol
IAM database authentication :: Parol o'rniga rol orqali olinadigan 15 daqiqalik token
Eng yaxshi sir :: Mavjud bo'lmagan sir — role, OIDC, IAM auth
GetSecretValue signali :: Qisqa vaqtda ko'p sirni o'qish — sir yig'ish belgisi
Kubernetes Secret :: Sukut bo'yicha Base64 — shifrlash emas
:::
