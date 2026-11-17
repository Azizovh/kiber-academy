Siz AWS'ni o'rgandingiz, VPC qurdingiz, IAM siyosatlarini o'qiysiz. Birinchi intervyuga borasiz va savol: "Bizda hamma narsa Azure'da. Entra ID'dagi Conditional Access bilan ishlaganmisiz?" Yoki boshqa kompaniya: "Ma'lumotlar tahlili Google Cloud'da, qolgani AWS'da."

Xavotir olmang: bulut provayderlari bir xil muammolarni hal qiladi va **tushunchalar ko'chadi**. Virtual server — virtual server, firewall qoidasi — firewall qoidasi, eng kam imtiyoz — eng kam imtiyoz. Farq — nomlarda, ierarxiyada, sukut sozlamalarida va har bir provayderning o'ziga xos "tuzoqlari"da.

Bu dars Azure va Google Cloud (GCP) ni chuqur o'rgatmaydi — u **tarjima lug'ati**: AWS'da bilganingizni boshqa provayderga qanday ko'chirish va qayerda ehtiyot bo'lish kerakligi. Alohida e'tibor — Microsoft Entra ID'ga, chunki u Microsoft 365 ishlatadigan deyarli har bir kompaniyada allaqachon bor, hatto ular "bulutda emasmiz" desa ham.

## Xizmatlar tarjimasi

| Vazifa | AWS | Azure | Google Cloud |
|---|---|---|---|
| Virtual server | EC2 | Virtual Machines | Compute Engine |
| Obyekt ombori | S3 | Blob Storage (Storage account ichida) | Cloud Storage |
| Virtual tarmoq | VPC | Virtual Network (VNet) | VPC (global) |
| Tarmoq firewall'i | Security group, NACL | Network Security Group (NSG) | VPC firewall rules |
| Boshqariladigan baza | RDS | Azure SQL, Azure Database for PostgreSQL | Cloud SQL |
| Serverless funksiya | Lambda | Azure Functions | Cloud Run functions |
| Kubernetes | EKS | AKS | GKE |
| Identifikatsiya | IAM, Identity Center | Entra ID + Azure RBAC | Cloud IAM (+ Cloud Identity) |
| Server uchun rol | IAM role (instance profile) | Managed identity | Service account |
| Audit jurnali | CloudTrail | Activity Log, Entra sign-in/audit logs | Cloud Audit Logs |
| Tahdidlarni aniqlash | GuardDuty | Microsoft Defender for Cloud | Security Command Center |
| Sirlar va kalitlar | Secrets Manager, KMS | Key Vault | Secret Manager, Cloud KMS |
| SIEM | (Security Lake + uchinchi tomon) | Microsoft Sentinel | Google Security Operations |
| Natural IaC | CloudFormation | ARM shablonlari, Bicep | Infrastructure Manager (Terraform asosida) |

Xizmat nomlari vaqti-vaqti bilan o'zgaradi (Azure AD → Entra ID, Cloud Functions → Cloud Run functions). Intervyuda eski nomni aytsangiz, xato emas — lekin yangisini bilish ishonch beradi.

## Resurslar ierarxiyasi — ruxsatlar qayerdan meros qoladi

Uch provayderda resurslar turli daraxtga joylashadi. Bu xavfsizlik uchun juda muhim: **yuqori darajada berilgan ruxsat pastdagi hamma narsaga meros qoladi.**

```
 AWS                         Azure                          Google Cloud
 Organization                Entra ID tenant                Organization
   └─ OU (bo'lim)              └─ Management group            └─ Folder
       └─ Account                  └─ Subscription                └─ Project
           └─ resurslar                └─ Resource group               └─ resurslar
                                           └─ resurslar
```

| | AWS | Azure | GCP |
|---|---|---|---|
| Asosiy izolyatsiya chegarasi | Account | Subscription | Project |
| Ruxsat qayerda beriladi | Har bir account ichidagi IAM | Istalgan darajada (meros bilan) | Istalgan darajada (meros bilan) |
| Yuqoridan cheklash | SCP (Organizations) | Azure Policy | Organization Policy |

Amaliy xulosa: Azure'da management group darajasida "Owner" rolini berish — undagi **barcha** subscription'lar ustidan to'liq hokimiyat. GCP'da organizatsiya darajasidagi "Editor" — barcha loyihalarda. Auditda birinchi savol: "Eng yuqori darajalarda kimning roli bor?"

## Microsoft Entra ID

[[entra-id|Entra ID]] (2023-yilgacha Azure Active Directory) — Microsoft'ning bulutdagi identifikatsiya xizmati. Microsoft 365, Azure va minglab boshqa SaaS ilovalar uchun foydalanuvchilar, guruhlar, kirish va MFA shu yerda.

:::warn
Nomi o'xshash bo'lsa ham, Entra ID — **Active Directory emas**. Ofisdagi Active Directory (Windows domeni) Kerberos, LDAP va Group Policy bilan ishlaydi, kompyuterlarni domenga qo'shadi. Entra ID web protokollari — OAuth 2.0, OIDC, SAML (a1 bosqichidagi autentifikatsiya darsi) bilan ishlaydi. Ko'p kompaniyalarda ikkalasi ham bor va **Entra Connect** orqali sinxronlanadi — bu "gibrid identifikatsiya".
:::

Asosiy tushunchalar:

| Tushuncha | Nima | AWS'dagi o'xshashi |
|---|---|---|
| Tenant | Tashkilotning Entra ID nusxasi (`mybank.onmicrosoft.com`) | Organization (taxminan) |
| User, group | Odamlar va guruhlar | IAM Identity Center foydalanuvchilari |
| App registration / service principal | Ilova yoki skript uchun identifikatsiya | IAM user (dastur uchun) |
| Managed identity | Azure resursiga avtomatik beriladigan identifikatsiya, sirsiz | EC2 IAM role |
| Conditional Access | "Agar … bo'lsa, kirishga ruxsat / MFA talab qil / blokla" qoidalari | (natural o'xshashi yo'q) |
| PIM | Privileged Identity Management — admin rolini vaqtincha, so'rov bilan faollashtirish | (qisman — rolni assume qilish) |

**Ikki xil rol tizimi** — Azure'dagi eng ko'p chalkashtiriladigan narsa:

| | Entra rollari | Azure RBAC rollari |
|---|---|---|
| Nimani boshqaradi | Katalogning o'zi: foydalanuvchilar, guruhlar, ilovalar, sozlamalar | Azure resurslari: VM, storage, tarmoq |
| Eng kuchli rol | Global Administrator | Owner |
| Misollar | User Administrator, Security Reader | Contributor, Reader |

Global Administrator — tenantdagi eng xavfli hisob: u boshqa har qanday rolni o'ziga bera oladi. Microsoft tavsiyasi — bunday hisoblar **beshtadan kam** bo'lsin, ular MFA bilan himoyalangan va PIM orqali faqat kerak bo'lganda faollashtirilsin.

**Conditional Access** — Entra ID'ning kuchli tomoni. Qoida misollari:

```
 AGAR  foydalanuvchi = har kim
   VA  ilova = Microsoft 365
 UNDA  MFA talab qilinsin

 AGAR  joylashuv = ishonchli mamlakatlardan tashqari
 UNDA  kirish bloklansin

 AGAR  rol = admin
   VA  qurilma = kompaniya boshqarmaydigan
 UNDA  kirish bloklansin
```

Bu c4 bosqichidagi [[zero-trust|zero trust]] g'oyasining amaliy ko'rinishi: har bir kirish kim, qayerdan, qaysi qurilmadan ekaniga qarab baholanadi.

SOC tarmog'idan eslang: Entra **sign-in logs** — "imkonsiz sayohat" (Toshkentdan kirish, 20 daqiqadan keyin boshqa qit'adan), MFA charchatish hujumlari, eski protokollar orqali kirish urinishlari aynan shu yerda ko'rinadi.

## Azure: nimaga e'tibor berish kerak

- **NSG** subnetga ham, alohida tarmoq interfeysiga ham biriktiriladi. Ikkalasida qoida bo'lsa, trafik ikkalasidan o'tishi kerak. Qoidalar ustuvorlik raqami bo'yicha tekshiriladi (kichik raqam — birinchi).
- **Storage account**'da anonim (ommaviy) blob kirishini yoqib qo'yish mumkin — S3'dagi ochiq bucket'ning Azure'dagi ko'rinishi.
- **SAS token** (Shared Access Signature) — storage'ga kirish uchun imzolangan havola. U ichida ruxsatlar va amal qilish muddati yozilgan. Muammo: juda keng ruxsatli va juda uzoq muddatli SAS havola kodga yoki ochiq repozitoriyga tushsa — bu doimiy kalit sizib chiqishi bilan bir xil. Bunday holatlar haqiqatan bo'lgan: yirik tadqiqot jamoasi ochiq repozitoriyda butun storage account'ga yillar davomida amal qiladigan havolani joylashtirgan. Qoida: SAS — minimal ruxsat, qisqa muddat, iloji bo'lsa managed identity.
- **Microsoft Defender for Cloud** — tavsiyalar va "secure score" beradi, CSPM vazifasini bajaradi (c2 bosqichi).

## Google Cloud: nimaga e'tibor berish kerak

- **Project** — asosiy chegara. Ruxsatlar loyiha, papka yoki organizatsiya darajasida "binding" sifatida beriladi: "shu a'zo — shu rol — shu resursda".
- **Basic rollar** (Owner, Editor, Viewer) juda keng. Editor deyarli hamma resursni o'zgartira oladi. Ularning o'rniga aniq (predefined) rollar ishlatiladi.
- **Service account kalitlari** — JSON fayl ko'rinishidagi doimiy kalit. AWS'dagi doimiy access key'ning aynan o'zi va xuddi shunday sizib chiqadi. Google'ning o'z tavsiyasi: kalit faylidan qoching; GCP ichida biriktirilgan service account, tashqaridan (masalan, GitHub Actions) — **Workload Identity Federation** (a4 bosqichidagi OIDC g'oyasi).
- **Default service account**'lar: tarixan Compute Engine'ning sukut bo'yicha service account'i loyihada Editor rolini olardi. Yangi tashkilotlarda bu sukut organizatsiya siyosati bilan o'chirilgan, lekin eski loyihalarda hali ham uchraydi — auditda tekshiriladigan klassik nuqta.
- **VPC global**: bitta VPC barcha regionlarni qamraydi, subnetlar esa regional. Firewall qoidalari serverlarga **tarmoq teglari** yoki service account orqali qo'llanadi.

## Nima ko'chadi, nima ko'chmaydi

| Ko'chadi (tushuncha) | Ko'chmaydi (tafsilot) |
|---|---|
| Eng kam imtiyoz, rollar, vaqtinchalik kalitlar | Siyosat sintaksisi va baholash mantiqi |
| Public/private subnet, firewall, segmentatsiya | Firewall qayerga biriktirilishi, stateful/stateless farqlari |
| Audit jurnali — hamma API amallari yoziladi | Jurnal nomi, maydonlari, sukut bo'yicha saqlash muddati |
| Ommaviy ombor — xavf | Ochish usuli (bucket policy, anonim blob, `allUsers` binding) |
| Umumiy javobgarlik modeli | Har bir xizmatda chiziq qayerdan o'tishi |

Shuning uchun bitta provayderni chuqur bilish + qolganlarining **tarjima lug'atini** bilish — junior uchun to'g'ri strategiya. Ish joyida kerak bo'lgan provayderni chuqurlashtirasiz.

## O'rganish yo'li

| Provayder | Boshlang'ich | Xavfsizlik |
|---|---|---|
| Azure | AZ-900 (Azure Fundamentals) | AZ-500 (Security Engineer), SC-200 (SOC analitik) |
| Google Cloud | Cloud Digital Leader | Professional Cloud Security Engineer |

Microsoft Learn va Google Cloud Skills Boost'da bepul o'quv yo'llari va laboratoriyalar bor (roadmap'dagi havolalar). Microsoft 365 ishlatadigan kompaniyalar ko'p bo'lgani uchun SOC'ga yo'nalgan bo'lsangiz ham SC-200 va Entra ID bilimi qadrli.

:::try
1. Qaydnoma arxitekturasini (EC2 + RDS + S3, public va private subnet, security group'lar, IAM role) Azure va GCP atamalariga "tarjima" qiling. Har bir qism uchun xizmat nomini yozing.
2. Azure'da yangi xodimga "Global Administrator" berildi, chunki "u hamma narsani sozlay olishi kerak". Qanday xavf bor va nima tavsiya qilasiz?
3. GCP loyihasida CI/CD konveyeri uchun service account JSON kaliti yaratilib, GitHub sirlariga qo'yilgan. Bu nima uchun xavfli va qanday muqobil bor?
4. Kompaniya: "Biz bulutda emasmiz, faqat Microsoft 365 ishlatamiz." Xavfsizlik nuqtai nazaridan bu gap nima uchun to'liq to'g'ri emas?

**Javoblar:**
1. Azure: Virtual Machine + Azure Database for PostgreSQL + Blob Storage; VNet subnetlari; NSG; managed identity. GCP: Compute Engine + Cloud SQL + Cloud Storage; VPC subnetlari; firewall rules (teglar bilan); biriktirilgan service account.
2. Global Administrator butun tenant ustidan hokimiyat beradi, jumladan boshqa rollarni berish. Hisob buzilsa — butun tashkilot. Tavsiya: aniq vazifa uchun tor rol (masalan, User Administrator yoki Azure RBAC'da kerakli resurs guruhida Contributor), MFA, admin rollar uchun PIM.
3. JSON kalit — doimiy va muddatsiz; sizib chiqsa, kim ishlatayotganini bilmaysiz. Muqobil: Workload Identity Federation — GitHub OIDC tokeni evaziga qisqa muddatli kirish, hech qanday saqlanadigan kalitsiz.
4. Microsoft 365 — SaaS, uning ortida Entra ID tenant bor. Foydalanuvchilar, MFA, Conditional Access, ulashilgan fayllar, uchinchi tomon ilovalariga berilgan ruxsatlar — hammasi mijoz javobgarligidagi bulut identifikatsiyasi.
:::

## Xulosa

- Bulut tushunchalari provayderlar orasida ko'chadi; nomlar, ierarxiya, sukut sozlamalari va tuzoqlar farq qiladi.
- Ierarxiya: AWS — Organization/OU/Account; Azure — tenant/management group/subscription/resource group; GCP — organization/folder/project. Yuqorida berilgan ruxsat pastga meros qoladi.
- Entra ID — bulut identifikatsiyasi (OAuth, OIDC, SAML), Active Directory emas; ko'pincha u bilan sinxronlanadi.
- Azure'da ikki rol tizimi: Entra rollari (katalog) va Azure RBAC (resurslar). Global Administrator — eng xavfli, kam va PIM orqali.
- Conditional Access — kirishni sharoitga qarab boshqarish: zero trust amalda.
- Doimiy kalitning har bir provayderdagi ko'rinishi (access key, SAS token, service account JSON) — bir xil xavf; muqobili — managed identity, biriktirilgan rol, workload identity federation.

:::quiz
? AWS'dagi EC2 IAM role'ning Azure'dagi o'xshashi qaysi?
- Global Administrator
+ Managed identity
- SAS token
- Resource group
! Managed identity Azure resursiga avtomatik beriladi va sir saqlashni talab qilmaydi — EC2'ga biriktirilgan rol kabi.

? Azure'da management group darajasida Owner roli berildi. Natija?
- Faqat management group sozlamalari o'zgartiriladi
+ Undagi barcha subscription va resurslar ustidan to'liq huquq meros qoladi
- Hech qanday resursga ta'sir qilmaydi
- Faqat o'qish huquqi beriladi
! Azure va GCP'da yuqori darajadagi ruxsat pastdagi hamma narsaga meros qoladi.

? Entra ID va ofisdagi Active Directory haqida qaysi gap to'g'ri?
- Ular bir xil mahsulot, faqat nomi boshqa
+ Entra ID web protokollari (OAuth, OIDC, SAML) bilan ishlaydigan bulut identifikatsiyasi; AD esa Kerberos, LDAP, Group Policy bilan
- Entra ID kompyuterlarni Kerberos orqali domenga qo'shadi
- Active Directory faqat bulutda ishlaydi
! Ular boshqa-boshqa tizimlar; ko'p kompaniyalarda Entra Connect orqali sinxronlanadi.

? Azure'da Entra rollari va Azure RBAC rollari farqi nimada?
+ Entra rollari katalogni (foydalanuvchilar, ilovalar) boshqaradi; Azure RBAC — Azure resurslarini (VM, storage)
- Ular bir xil
- Entra rollari faqat o'qish uchun
- Azure RBAC faqat Microsoft 365 uchun
! Ikki alohida tizim: Global Administrator — katalog, Owner — resurslar.

? Conditional Access nima qiladi?
- Barcha foydalanuvchilarni bloklaydi
+ Foydalanuvchi, ilova, joylashuv, qurilma kabi sharoitlarga qarab kirishga ruxsat beradi, MFA talab qiladi yoki bloklaydi
- Faqat parol uzunligini tekshiradi
- VM'larni o'chiradi
! Conditional Access — sharoitga asoslangan kirish siyosati; zero trust'ning amaliy vositasi.

? GCP'da CI/CD uchun service account JSON kalitini GitHub sirlarida saqlashning xavfsizroq muqobili qaysi?
- Kalitni repozitoriyga to'g'ridan-to'g'ri yozish
- Kalitni har oy qo'lda almashtirish va baribir saqlash
+ Workload Identity Federation — OIDC tokeni evaziga qisqa muddatli kirish
- Loyihaga Owner basic rolini berish
! Saqlanadigan doimiy kalit umuman bo'lmaydi; bu a4 bosqichidagi OIDC yondashuvi.

? Azure SAS token qachon ayniqsa xavfli bo'ladi?
- Agar u faqat bitta faylni o'qishga ruxsat bersa va bir soatda tugasa
+ Agar u keng ruxsatli, uzoq muddatli bo'lib, ochiq joyga (kod, repozitoriy) tushsa
- Agar u HTTPS orqali ishlatilsa
- Hech qachon — SAS token har doim xavfsiz
! Keng va uzoq muddatli SAS havola sizib chiqishi doimiy kalit sizib chiqishi bilan teng.

? GCP'dagi basic Editor rolining muammosi nima?
- U hech narsaga ruxsat bermaydi
+ U deyarli barcha resurslarni o'zgartirishga ruxsat beradi — eng kam imtiyozga zid
- U faqat billing uchun
- U faqat bitta VM uchun
! Basic rollar juda keng; ularning o'rniga aniq predefined yoki custom rollar ishlatiladi.

? Qaysi gap bir nechta provayderni o'rganish strategiyasi haqida to'g'ri?
- Hamma provayderni bir xil chuqurlikda bilish shart
- Faqat bitta provayderni bilish yetarli, boshqalari haqida bilish shart emas
+ Bittasini chuqur bilib, qolganlarining tushunchalar tarjimasini bilish junior uchun to'g'ri yo'l
- Provayderlar umuman o'xshamaydi, shuning uchun noldan o'rganish kerak
! Tushunchalar ko'chadi; ish joyida kerakli provayderni chuqurlashtirasiz.

? Kompaniya faqat Microsoft 365 ishlatadi. Ularda bulut identifikatsiyasi bormi?
+ Ha — Microsoft 365 ortida Entra ID tenant bor; hisoblar, MFA va ruxsatlar mijoz javobgarligida
- Yo'q, SaaS'da identifikatsiya yo'q
- Faqat Azure subscription bo'lsa
- Faqat Active Directory o'rnatilgan bo'lsa
! SaaS'da ham foydalanuvchilar va kirish nazorati mijozda; Entra ID shu ishni bajaradi.
:::

:::cards
Entra ID :: Microsoft'ning bulut identifikatsiya xizmati (avval Azure AD); OAuth, OIDC, SAML
Entra Connect :: Ofisdagi Active Directory'ni Entra ID bilan sinxronlaydigan vosita
Managed identity :: Azure resursiga avtomatik beriladigan, sirsiz identifikatsiya
Global Administrator :: Entra tenantidagi eng kuchli rol; kam, MFA va PIM bilan
Conditional Access :: Sharoitga qarab kirishga ruxsat, MFA yoki blok qoidalari
PIM :: Admin rolini vaqtincha va so'rov bilan faollashtirish
NSG :: Azure'dagi tarmoq firewall'i; subnet yoki tarmoq interfeysiga biriktiriladi
SAS token :: Azure storage'ga imzolangan kirish havolasi; minimal ruxsat, qisqa muddat
GCP project :: Google Cloud'dagi asosiy izolyatsiya chegarasi
Service account kaliti :: GCP'dagi doimiy JSON kalit; Workload Identity Federation bilan almashtiriladi
Ruxsat merosi :: Azure va GCP'da yuqori darajadagi ruxsat pastdagi barcha resurslarga o'tadi
:::
