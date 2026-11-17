Ish e'lonlarini ko'zdan kechirasiz: "Cloud Security Engineer — talablar: AWS yoki Azure tajribasi, IaC, IAM chuqur bilimi. **AWS Security Specialty yoki AZ-500 afzallik.**" Boshqasi: "Junior Cloud Engineer — AWS Solutions Architect Associate bo'lsa yaxshi." Uchinchisi umuman sertifikat so'ramaydi, faqat "GitHub'dagi IaC loyihalaringizni ko'rsating."

Bulut yo'nalishida sertifikatlar boshqa yo'nalishlarga qaraganda **ko'proq** so'raladi — chunki ular aniq provayder bilimini tasdiqlaydi va ko'p kompaniyalar provayder bilan hamkorlik dasturlarida sertifikatlangan xodimlar soniga qiziqadi. Lekin oldingi darsdagi portfolio va c1–c4 dagi amaliy ish baribir asosiy narsa.

Karyera bo'limidagi sertifikatlar xaritasida (k1) Cloud qatori qisqacha berilgan edi. Bu dars — batafsil: qaysi lavozimga qaysi sertifikat, qaysi tartibda, qanday tayyorlanish va imtihon savollarini qanday o'qish.

## Bulut xavfsizligidagi lavozimlar

| Lavozim | Nima qiladi | Kursdagi asos |
|---|---|---|
| Cloud / DevOps Engineer (xavfsizlikka moyil) | Infratuzilmani quradi va boshqaradi, xavfsizlik — ishining bir qismi | c1, c3 |
| **Cloud Security Engineer** | IAM, tarmoq, shifrlash, CSPM, IaC skanerlash, guardrails | c2, c3 — butun tarmoq |
| Cloud SOC / Detection Engineer | Bulut jurnallari, GuardDuty, signallar, bulut IR | b-tarmoq + c2 monitoring, c4 IR |
| DevSecOps Engineer | Konveyer, konteyner, Kubernetes xavfsizligi | a4 + c3 |
| Cloud Security Architect | Ko'p hisobli arxitektura, standartlar, zero trust | Yillar tajribasidan keyin |

Ko'pchilik bulut xavfsizligiga **to'g'ridan-to'g'ri** emas, oldin cloud/DevOps yoki SOC lavozimi orqali keladi. Bu normal — va sertifikat yo'lini ham shunga moslash mumkin.

## Sertifikatlar

| Sertifikat | Kim beradi | Daraja | Izoh |
|---|---|---|---|
| **AWS Certified Cloud Practitioner** | AWS | Boshlang'ich | AWS'ning umumiy tushunchalari, xizmatlar, narxlash. Texnik bo'lmaganlar uchun ham. Kurs c1 ni o'tgan bo'lsangiz — ixtiyoriy |
| **AWS Certified Solutions Architect – Associate** | AWS | O'rta | AWS arxitekturasi: VPC, IAM, EC2, S3, RDS, ishonchlilik, xarajat. Bulut ishlari uchun eng ko'p so'raladigan sertifikatlardan |
| **AWS Certified Security – Specialty** | AWS | Ixtisoslashgan | IAM, aniqlash, IR, ma'lumot himoyasi, infratuzilma xavfsizligi — c2 va c4 ning deyarli to'liq qamrovi |
| **AZ-900** Azure Fundamentals | Microsoft | Boshlang'ich | Azure asoslari |
| **AZ-104** Azure Administrator | Microsoft | O'rta | Azure'ni amalda boshqarish |
| **AZ-500** Azure Security Engineer | Microsoft | Ixtisoslashgan | Entra ID, tarmoq, ma'lumot va ilova xavfsizligi, Defender for Cloud |
| **SC-200** Security Operations Analyst | Microsoft | O'rta | Sentinel, Defender — Microsoft muhitidagi SOC (b-tarmoq bilan bog'liq) |
| **Google Professional Cloud Security Engineer** | Google | Ixtisoslashgan | GCP xavfsizligi |
| **CCSK** | Cloud Security Alliance | Vendor-neutral | Bulut xavfsizligi tushunchalari, provayderga bog'liq emas; onlayn, ochiq kitob formatida |
| **CCSP** | ISC2 | Yuqori | Bir necha yillik tasdiqlangan tajriba talab qiladi — keyingi bosqich |
| **HashiCorp Terraform Associate** | HashiCorp | Boshlang'ich–o'rta | Terraform asoslari (c3) |
| **CKA** / **CKS** | CNCF / Linux Foundation | Amaliy | Kubernetes ma'murligi / xavfsizligi; CKS uchun avval CKA kerak; terminalda amaliy imtihon |

:::info
**Imtihon tarkibi, kodlari, narxlari va talablari o'zgaradi.** Provayderlar imtihonlarni muntazam yangilaydi, ba'zilarini nafaqaga chiqaradi va yangilarini qo'shadi. Tayyorlanishni boshlashdan oldin har bir sertifikatning **rasmiy sahifasida** joriy versiyani, imtihon qo'llanmasini (exam guide) va narxni tekshiring — SOC va AppSec sertifikat darslaridagi qoida.
:::

## Tavsiya etilgan yo'l

Kurs tavsiyasi — curriculum'dagi yo'l: **Cloud Practitioner → Solutions Architect Associate → Security Specialty yoki AZ-500**.

```
 Asos (agar umumiy xavfsizlik sertifikati yo'q bo'lsa — Security+, k1 bosqichi)
   │
   ├──► AWS Cloud Practitioner     — ixtiyoriy; bulutga butunlay yangi bo'lsangiz
   │
   ├──► AWS Solutions Architect – Associate   ← ASOSIY QADAM
   │      "bulutni bilaman" ning eng tan olingan isboti
   │
   └──► Ixtisoslashuv (ish joyingiz provayderiga qarab):
          ├── AWS Security – Specialty
          └── yoki AZ-500 (Microsoft muhiti)

 Qo'shimcha, yo'nalishga qarab:
   DevSecOps / konteyner  → CKA → CKS
   IaC                    → Terraform Associate
   Vendor-neutral         → CCSK
   Microsoft SOC          → SC-200
```

Nega Security Specialty'dan oldin Solutions Architect? Chunki xavfsizlik savollari arxitekturani biladi deb faraz qiladi: "VPC endpoint", "cross-account role", "KMS key policy" — bular tushunchalar emas, **qurish** bilimi. Va ko'pchilik ish e'lonlarida aynan Associate darajasi so'raladi.

Qaysi provayder? Mahalliy bozorni o'rganing (k1 bosqichidagi ish bozori darsi): qaysi kompaniyalarda qaysi bulut ishlatiladi. Microsoft 365 ishlatadigan kompaniyalar ko'p bo'lgani uchun Entra ID va Azure bilimi ham qadrli (c1 Azure darsi). Bitta provayderni chuqur — qolganlarini tarjima lug'ati darajasida.

## Tayyorlanish rejasi

### 1. Imtihon qo'llanmasi — asos

Har bir AWS va Microsoft imtihonining rasmiy **exam guide**'i bor: domenlar (bo'limlar), ularning foizdagi vazni va har birida nima so'ralishi. Bu sizning o'quv rejangiz. Domenlarni kurs darslariga xaritalang:

| Security Specialty taxminiy domenlari | Kursdagi darslar |
|---|---|
| Threat detection va incident response | c2 monitoring, c4 bulut IR, b-tarmoq |
| Security logging va monitoring | c2 monitoring |
| Infrastructure security | c2 tarmoq, c3 Docker va Kubernetes |
| Identity and access management | c2 IAM, c1 Azure darsi (identifikatsiya) |
| Data protection | c2 ma'lumot himoyasi, c2 sirlar |
| Management va security governance | c2 CSPM, c4 compliance, c3 IaC |

(Domen nomlari va vaznlari imtihon versiyasiga qarab o'zgaradi — jadvalni joriy qo'llanmaga qarab yangilang.)

### 2. Manbalar

| Manba | Nima uchun |
|---|---|
| **AWS Skill Builder** (bepul qism) | Rasmiy kurslar, rasmiy namuna savollar |
| **Microsoft Learn** | AZ-900, AZ-500, SC-200 uchun bepul o'quv yo'llari |
| Rasmiy hujjatlar va **whitepaper**'lar | Security pillar (Well-Architected), Security Incident Response Guide — roadmap havolalari |
| **O'z lab hisobingiz** | c1–c3 dagi amaliyot; portfolio loyihasi — eng yaxshi tayyorgarlik |
| Mustaqil sinov testlari | Imtihon formatiga ko'nikish |

Amaliyotsiz o'qish bilan Associate'dan o'tish mumkin, lekin Specialty savollari "bu ikki nazoratning qaysi biri aynan shu stsenariyda ishlaydi?" darajasida — buni qo'l bilan qilmagan odamga qiyin.

### 3. Sinov testlari — to'g'ri ishlatish

Kurs maqsadi — sinov testlaridan **barqaror 85%+**. "Barqaror" so'ziga e'tibor bering:

- Har bir test — **yangi** savollar to'plami bilan. Bir xil testni takrorlab 95% olish — savollarni yodlash, bilim emas.
- **Har bir xato javobni tahlil qiling**: nega to'g'ri javob to'g'ri va nega sizniki noto'g'ri. Tushunmagan mavzuni hujjatlardan o'qing yoki lab'da sinab ko'ring.
- To'g'ri topgan, lekin **ishonchsiz** javoblarni ham ko'rib chiqing — ular omad.
- Xatolarni domen bo'yicha hisoblang: qaysi domen zaif — o'sha yerga vaqt.
- Vaqtni o'lchang: imtihondagi kabi sharoitda.

### 4. Jadval namunasi

| Hafta | Associate (≈ 8 hafta) | Security Specialty (≈ 8–10 hafta) |
|---|---|---|
| 1–2 | Exam guide, IAM, VPC (c1 takrori) | Exam guide, IAM chuqur (c2) |
| 3–4 | EC2, ELB, Auto Scaling, S3, RDS | Monitoring, GuardDuty, IR (c2, c4) |
| 5–6 | Ishonchlilik, xarajat, serverless | KMS, ma'lumot himoyasi, sirlar |
| 7 | Sinov testlari, zaif domenlar | Tarmoq va infratuzilma xavfsizligi, governance |
| 8 | Sinov testlari (85%+ barqaror) → imtihon | Sinov testlari → imtihon |

Kuniga 1–2 soat bilan. Ish bilan birga bo'lsa — uzunroq, bu normal.

## Imtihon savollarini o'qish

AWS savollari ko'pincha **stsenariy** shaklida va bir nechta "to'g'ri" javobdan **eng yaxshisini** tanlashni talab qiladi. Kalit so'zlar javobni belgilaydi:

| Kalit so'z | Nimani bildiradi |
|---|---|
| "most secure" | Xavfsizlik birinchi, qulaylik va xarajat ikkinchi |
| "least operational overhead" | Boshqariladigan xizmat, avtomatlashtirish — qo'lda skript emas |
| "most cost-effective" | Arzonroq variant, talablarni bajargan holda |
| "least privilege" | Eng tor ruxsat — aniq resurs va amal |
| "without changing application code" | Infratuzilma darajasidagi yechim |

Misol savol (o'quv uchun tuzilgan):

> Kompaniya EC2 serverlarida ishlaydigan ilova S3 bucket'dan fayl o'qishi kerak. Hozir access key ilova konfiguratsiya faylida saqlanadi. Xavfsizlik jamoasi doimiy kalitlarni yo'q qilishni va **eng kam operatsion yuk** bilan yechim talab qiladi. Nima qilish kerak?
>
> A. Kalitni Secrets Manager'ga ko'chirish va har 30 kunda almashtirish
> B. EC2 serverlariga kerakli S3 ruxsatli IAM rol biriktirish
> C. Kalitni KMS bilan shifrlab, konfiguratsiyada saqlash
> D. S3 bucket'ni faqat VPC'dan ochiq qilib, kalitsiz kirish

To'g'ri javob — **B**. A va C kalitni yaxshiroq saqlaydi, lekin doimiy kalit qoladi (talab — yo'q qilish). D — kalitsiz anonim kirish xavfli va eng kam imtiyozga zid. B — kalit umuman yo'q, AWS vaqtinchalik kalitlarni o'zi beradi va almashtiradi (c1, c2). Ko'rib turganingizdek, kurs darslarini tushungan odam uchun savol — mantiq, yodlash emas.

## Imtihon kuni

- Onlayn (uyda, kuzatuvchi bilan) yoki test markazida. Onlayn imtihonning qat'iy qoidalari bor: toza stol, xonada hech kim yo'q, kamera doim yoqilgan. Qoidalarni oldindan o'qing va kompyuteringizni tizim tekshiruvidan o'tkazing.
- Uzun stsenariylarni o'qishdan oldin **savolning oxirgi gapini** o'qing — nima so'ralayotganini biling, keyin stsenariydan kerakli ma'lumotni qidiring.
- Ishonchsiz savollarni belgilab, keyin qayting. Javobsiz savol qoldirmang — noto'g'ri javob uchun jarima odatda yo'q (rasmiy qoidalarni tekshiring).
- Imtihon tili — ko'pincha ingliz tili. Kursda texnik atamalar ataylab inglizcha qoldirilgan — bu shu yerda yordam beradi.

## Sertifikatdan keyin

- LinkedIn'da va rezyumeda (k1 bosqichi) — sertifikat nomi va rasmiy tasdiqlash havolasi (badge).
- AWS odatda imtihondan o'tganlarga keyingi imtihon uchun chegirma beradi — shartlarni sertifikat portalida tekshiring.
- Sertifikatlarning amal qilish muddati bor (AWS — 3 yil, Microsoft — yillik bepul onlayn yangilash). Yangilashni rejalashtiring.
- Sertifikat — eshik; ichkariga portfolio va intervyuda ko'rsatgan tushunchangiz olib kiradi.

## Intervyuga tayyorgarlik

Bulut xavfsizligi intervyularida tez-tez uchraydigan mavzular — har biri kursdagi darsga bog'langan:

| Savol | Dars |
|---|---|
| Shared responsibility modelini tushuntiring | c1 bulut tushunchalari |
| IAM siyosati qanday baholanadi? Explicit deny nima? | c2 IAM |
| Security group va NACL farqi? | c2 tarmoq |
| SSRF va IMDS — qanday bog'liq va qanday himoyalanasiz? | c2 misconfig |
| Access key sizib chiqdi — birinchi qadamlaringiz? | c4 bulut IR |
| Terraform state'da qanday xavf bor? | c3 Terraform |
| Kubernetes'da pod buzilsa, hujumchi qayerga yeta oladi? | c3 Kubernetes xavfsizligi |
| Zero trust nima va uni qanday joriy qilasiz? | c4 zero trust |
| CSPM natijasidagi yuzlab topilmani qanday saralaysiz? | c2 CSPM |

Ilovadagi intervyu savollari bankida Cloud bo'limi ham bor — ularni ovoz chiqarib javob berib mashq qiling.

## Bu dars nimani bermaydi

- Sertifikat amaliy tajribani almashtirmaydi. Sinov testlarini yodlab olingan sertifikat intervyudagi birinchi chuqur savolda ko'rinib qoladi.
- Narx va talablar bo'yicha aniq ma'lumot — rasmiy sahifalarda; bu dars umumiy yo'nalish beradi.
- Har bir ish beruvchi bir xil sertifikatni qadrlamaydi. Mahalliy bozor va aniq e'lonlar — eng yaxshi yo'riqnoma.

:::try
1. O'zingiz uchun sertifikat rejasini yozing: qaysi provayder (nega?), qaysi ikkita sertifikat, qaysi tartibda va taxminiy sanalar.
2. Tanlagan birinchi sertifikatingizning rasmiy exam guide'ini yuklab oling va domenlarni kurs darslariga xaritalang (yuqoridagi jadval kabi).
3. Rasmiy namuna savollarni (Skill Builder yoki Microsoft Learn) yeching. Har bir xato uchun: qaysi dars va qaysi tushuncha?
4. Yuqoridagi misol savol uslubida o'zingiz bitta savol tuzing — c2 yoki c3 dagi mavzu bo'yicha, to'rt variant va tushuntirish bilan.
5. Intervyu savollari jadvalidagi uchta savolga ovoz chiqarib, 2 daqiqadan javob bering va yozib oling.

**Javoblar:**
1. Odatiy reja: AWS (mahalliy bozorda keng tarqalgan bo'lsa) — Solutions Architect Associate (3 oy ichida), keyin Security Specialty (yana 3–4 oy), parallel ravishda portfolio loyihasi. Microsoft muhitli kompaniyalarga yo'nalgan bo'lsangiz — AZ-104/AZ-500 yoki SOC uchun SC-200.
2. Har bir domen kamida bitta darsga to'g'ri kelishi kerak; to'g'ri kelmaganlari — qo'shimcha o'qish ro'yxatingiz.
3. Xatolar ko'pincha bitta-ikkita mavzuda to'planadi (masalan, KMS key policy yoki hisoblararo kirish) — o'sha darslarni qayta o'qing va lab'da sinab ko'ring.
4. Yaxshi savolda noto'g'ri variantlar ham "deyarli to'g'ri" bo'ladi va bitta kalit so'z (masalan, "least privilege") to'g'ri javobni hal qiladi.
5. Yozuvni tinglang: javobingiz aniq tuzilganmi (ta'rif → mexanizm → himoya → misol)? Qaysi joyda ikkilandingiz — o'sha darsni takrorlang.
:::

## Xulosa

- Bulut yo'nalishida sertifikatlar boshqa yo'nalishlarga qaraganda ko'proq so'raladi, lekin portfolio va amaliyot baribir asosiy.
- Lavozimlar: cloud/DevOps, Cloud Security Engineer, cloud SOC, DevSecOps, arxitektor. Ko'pchilik bulut xavfsizligiga qo'shni lavozim orqali keladi.
- Yo'l: (Cloud Practitioner) → Solutions Architect Associate → Security Specialty yoki AZ-500; yo'nalishga qarab CKA/CKS, Terraform Associate, CCSK, SC-200.
- Tayyorgarlik: rasmiy exam guide → domenlarni darslarga xaritalash → Skill Builder / Microsoft Learn → lab amaliyoti → sinov testlari (yangi savollar, har bir xato tahlili, barqaror 85%+).
- Savollarni kalit so'zlar bilan o'qing: most secure, least operational overhead, least privilege.
- Narx, kod va talablar o'zgaradi — doim rasmiy sahifani tekshiring. Sertifikat — eshik, ichkariga tushuncha olib kiradi.

:::quiz
? Kurs tavsiya qilgan AWS sertifikat yo'li qaysi?
+ Cloud Practitioner (ixtiyoriy) → Solutions Architect Associate → Security Specialty
- To'g'ridan-to'g'ri Security Specialty, boshqasi kerak emas
- Faqat Cloud Practitioner yetarli
- Avval CCSP, keyin Cloud Practitioner
! Security savollari arxitektura bilimini faraz qiladi; Associate ish e'lonlarida ham ko'p so'raladi.

? Nega Security Specialty'dan oldin Solutions Architect Associate tavsiya etiladi?
- U arzonroq
+ Xavfsizlik savollari VPC, rollar, endpoint'lar kabi arxitektura bilimini faraz qiladi
- Specialty'ga Associate'siz yozilib bo'lmaydi
- Associate xavfsizlikni o'z ichiga olmaydi
! Avval qurishni bilish, keyin himoyalash.

? Microsoft muhitidagi xavfsizlik muhandisi uchun qaysi sertifikat to'g'ri keladi?
- CKA
+ AZ-500
- Terraform Associate
- Cloud Practitioner
! AZ-500 — Azure Security Engineer: Entra ID, tarmoq, ma'lumot va Defender for Cloud.

? Sinov testlaridan to'g'ri foydalanish qaysi?
- Bitta testni 95% olguncha takrorlash
+ Har safar yangi savollar, har bir xato va ishonchsiz javobni tahlil qilish, zaif domenlarni aniqlash
- Faqat to'g'ri javoblarni yodlash
- Sinov testlarini umuman ishlatmaslik
! Barqaror 85%+ yangi savollarda — haqiqiy tayyorlik belgisi.

? Imtihon savolida "least operational overhead" iborasi nimani bildiradi?
+ Boshqariladigan xizmat yoki avtomatlashtirilgan yechim — qo'lda boshqariladigan skript emas
- Eng arzon variant
- Eng xavfsiz variant, narxidan qat'i nazar
- Kod o'zgartirish talab qiladigan variant
! Kalit so'zlar bir nechta ishlaydigan variantdan eng mosini tanlashni hal qiladi.

? Misol savolda (EC2 ilovasi S3'dan o'qiydi, doimiy kalitlarni yo'q qilish kerak) qaysi javob to'g'ri?
- Kalitni Secrets Manager'ga ko'chirish
- Kalitni KMS bilan shifrlash
+ EC2'ga kerakli ruxsatli IAM rol biriktirish
- Bucket'ni anonim kirish uchun ochish
! Rol bilan doimiy kalit umuman yo'q; AWS vaqtinchalik kalitlarni o'zi beradi.

? CKS sertifikatiga yozilishdan oldin nima talab qilinadi?
- AWS Security Specialty
+ Amaldagi CKA sertifikati
- CCSP
- Hech narsa
! CKS — Kubernetes xavfsizligi bo'yicha amaliy imtihon, CKA'dan keyin.

? Imtihon qo'llanmasi (exam guide) nima uchun asosiy manba?
+ U domenlarni, ularning vaznini va nima so'ralishini belgilaydi — o'quv rejasining asosi
- U imtihon savollarining javoblarini beradi
- U faqat narxni ko'rsatadi
- U ixtiyoriy va foydasiz
! Domenlarni kurs darslariga xaritalab, zaif joylarni topasiz.

? Sertifikat narxi va imtihon kodlari haqida qaysi gap to'g'ri?
- Ular hech qachon o'zgarmaydi
+ Ular muntazam o'zgaradi — tayyorlanishdan oldin rasmiy sahifani tekshirish kerak
- Ularni faqat forumlardan bilish mumkin
- Barcha sertifikatlar bepul
! Provayderlar imtihonlarni yangilaydi, nafaqaga chiqaradi va yangilarini qo'shadi.

? Sertifikat va portfolio munosabati haqida qaysi gap to'g'ri?
- Sertifikat bo'lsa, portfolio kerak emas
- Portfolio bo'lsa, sertifikat hech qachon kerak emas
+ Sertifikat — eshik (filtrlar, e'lonlar), portfolio va tushuncha esa intervyuda hal qiluvchi
- Ikkalasi ham ahamiyatsiz
! Yodlab olingan sertifikat birinchi chuqur savolda ko'rinib qoladi.
:::

:::cards
Solutions Architect Associate :: AWS arxitekturasi bo'yicha eng ko'p so'raladigan o'rta darajali sertifikat
Security Specialty :: AWS xavfsizligi: IAM, aniqlash, IR, ma'lumot himoyasi, infratuzilma
AZ-500 :: Azure Security Engineer — Entra ID, tarmoq, ma'lumot, Defender for Cloud
SC-200 :: Microsoft Sentinel va Defender bilan SOC analitik sertifikati
CCSK :: Cloud Security Alliance'ning provayderga bog'liq bo'lmagan sertifikati
CKA / CKS :: Kubernetes ma'murligi / xavfsizligi — amaliy imtihonlar
Exam guide :: Imtihon domenlari, vaznlari va mazmuni — o'quv rejasining asosi
Barqaror 85%+ :: Yangi savollarda doimiy natija — tayyorlik belgisi
Least operational overhead :: Boshqariladigan yoki avtomatlashtirilgan yechimni tanlash ishorasi
Sertifikat muddati :: AWS — 3 yil; Microsoft — yillik bepul yangilash
Sertifikat va portfolio :: Sertifikat eshik ochadi, tushuncha va portfolio ichkariga olib kiradi
:::
