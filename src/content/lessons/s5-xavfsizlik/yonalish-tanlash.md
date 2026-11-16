Tabriklaymiz. Siz poydevorni tugatdingiz — bu butun yo'lning eng qiyin va eng muhim qismi. Orqaga qarang: bir necha oy oldin "port", "xesh", "subnet" degan so'zlar siz uchun hech narsa anglatmas edi. Endi siz paketning yo'lini kuzata olasiz, Linux terminalida ishlaysiz, Python'da vosita yozasiz va hujum zanjirini bosqichlarga ajratasiz.

Endi yo'l to'rtga ayriladi. Bu dars sizga tanlashda yordam beradi.

## Avval — nimani tanlayotganingiz

Ikki narsani aniq bilib oling.

**Bu umrbod hukm emas.** "Kasblar xaritasi" darsida aytilgan edi: yo'nalishlar orasida o'tish — odatiy hol. Ko'pchilik mutaxassislar karyerasi davomida ikki-uch marta yo'nalish almashtiradi, va har bir oldingi tajriba keyingisida ustunlik beradi. Siz **birinchi ishingizga olib boradigan yo'lni** tanlayapsiz, xolos.

**To'rttasi ham bir poydevorda turadi.** Hozirgacha o'rgangan hamma narsa — har birida kerak. Tanlov qaysi bilimni **chuqurlashtirishingizni** belgilaydi.

## To'rt yo'nalish — yonma-yon

| | Pentest / Red Team | SOC / Blue Team | AppSec | Cloud |
|---|---|---|---|---|
| **Asosiy savol** | "Buni qanday buzish mumkin?" | "Bu yerda nima sodir bo'lyapti?" | "Buni qanday xavfsiz qurish mumkin?" | "Bu infratuzilmani qanday himoyalash mumkin?" |
| **Kundalik ish** | Tizimlarni sinash, zaiflik topish, hisobot yozish | Ogohlantirishlarni tekshirish, jurnal tahlili, insidentga javob | Kod tahlili, loyihani ko'rib chiqish, dasturchilar bilan ishlash | Bulut va serverlarni sozlash, avtomatlashtirish, audit |
| **Asosiy poydevor** | Tarmoq, Linux, web | Tarmoq, jurnallar, Windows | Dasturlash, web | Linux, tarmoq, avtomatlashtirish |
| **Ish ritmi** | Loyihadan loyihaga | Smenali, doimiy oqim | Ishlab chiqish sikli bilan birga | Loyihalar va doimiy qo'llab-quvvatlash |
| **Birinchi lavozim** | Junior Pentester | SOC Analyst L1 | Junior AppSec Engineer | Junior Cloud / Security Engineer |
| **Kirish to'sig'i** | Yuqori: o'rinlar kam, raqobat kuchli | Eng past: o'rinlar ko'p | O'rta: dasturlash tajribasi kerak | O'rta: texnologiyalar ko'p |

Oxirgi qator — halol baho, uni e'tiborsiz qoldirmang.

## Har biri haqida batafsilroq

### Pentest / Red Team

**Sizga yoqadi, agar:** jumboq yechishni yaxshi ko'rsangiz; "bu qanday ishlaydi va uning chegarasi qayerda?" degan savol tinchlik bermasa; CTF topshiriqlari sizni soatlab ushlab qolgan bo'lsa.

**Bilishingiz kerak:** ishning yarmi — **hisobot yozish**. Mijoz siz topgan zaiflik uchun emas, uni tushunarli bayon qilib, tuzatish yo'lini ko'rsatganingiz uchun pul to'laydi. Yozishni yomon ko'rsangiz — bu yo'l qiyin bo'ladi.

**Qiyinligi:** junior o'rinlar kam. Ko'pchilik bu yerga boshqa lavozimdan (SOC, tizim ma'muri, dasturchi) keladi. To'g'ridan-to'g'ri kirish mumkin, lekin kuchli portfolio talab qiladi: writeup'lar, CTF natijalari, sertifikat.

### SOC / Blue Team

**Sizga yoqadi, agar:** detektivlik ishi — izlardan voqeani tiklash — qiziq bo'lsa; "Loglar" va "Wireshark" darslari sizga yoqqan bo'lsa; diqqatli va sabrli bo'lsangiz.

**Bilishingiz kerak:** birinchi darajadagi (L1) ish — ko'p takrorlanuvchi: o'nlab o'xshash ogohlantirishni tekshirish, aksariyati yolg'on signal. Ko'p joyda smenali ish va tungi navbatchilik bor. Bu bosqich vaqtinchalik — bir-ikki yilda L2 ga, tergov va ov ishiga o'tiladi.

**Afzalligi:** sohaga kirishning eng real yo'li. Har bir tashkilotga monitoring kerak. Va bu yerda siz **haqiqiy hujumlarni** ko'rasiz — bu tajriba keyin istalgan yo'nalishda qimmatli.

### AppSec

**Sizga yoqadi, agar:** dasturlash bosqichi sizga eng yoqqani bo'lsa; "bu xato nega paydo bo'lgan va uni qanday butunlay yo'q qilish mumkin?" degan savol "uni qanday topaman?" dan qiziqroq bo'lsa.

**Bilishingiz kerak:** dasturlashni chinakam bilish talab qilinadi — faqat o'qish emas, yozish ham. Ishning katta qismi — dasturchilar bilan muloqot: ularni ayblash emas, ularga yordam berish.

**Afzalligi:** agar dasturlash tajribangiz bo'lsa — bu eng qisqa yo'l. Talab o'sib bormoqda, mutaxassislar kam.

### Cloud va infratuzilma

**Sizga yoqadi, agar:** tizim qurish va uni tartibga keltirish yoqsa; Linux bosqichi va avtomatlashtirish sizga yaqin bo'lsa; "buni qo'lda emas, kod bilan qilaylik" degan fikr tabiiy tuyulsa.

**Bilishingiz kerak:** texnologiyalar ro'yxati uzun va tez o'zgaradi: bulut provayderi, konteynerlar, orkestratsiya, infratuzilmani kod bilan boshqarish. Doimiy o'rganish — majburiy.

**Afzalligi:** tashkilotlar ommaviy ravishda bulutga o'tmoqda; bulutni ham tushunadigan, ham himoyalay oladigan mutaxassislar yetishmaydi.

## O'zingizga beradigan savollar

"Qaysi biri eng zo'r?" yoki "qaysi biri ko'p pul to'laydi?" — noto'g'ri savollar. To'g'ri savol: **qaysi ishni har kuni, uzoq vaqt qilishga tayyorman?**

Orqaga qarang va halol javob bering:

**1. Poydevorning qaysi bosqichi eng qiziq o'tdi?**

| Eng yoqqani | Qaraydigan yo'nalish |
|---|---|
| Tarmoq va Wireshark | SOC yoki Pentest |
| Linux va avtomatlashtirish | Cloud |
| Dasturlash va web | AppSec |
| CTF topshiriqlari | Pentest |
| Jurnal tahlili, "nima bo'lganini tiklash" | SOC |

**2. Vaqt qanday o'tganini sezmagan paytingiz qachon bo'ldi?** Terminalda zanjir qurayotgandami, kod yozayotgandami, CTF yechayotgandami? Bu — eng ishonchli ko'rsatkich.

**3. Buzish, qurish yoki kuzatish?**

- Buzib ko'rish va chegarani topish → **Pentest**
- Kuzatish va voqeani tiklash → **SOC**
- To'g'ri qurish → **AppSec** yoki **Cloud**

**4. Sharoitingiz qanday?**

- Imkon qadar tezroq ish kerak → **SOC** (o'rinlar eng ko'p).
- Dasturchi tajribangiz bor → **AppSec**.
- Tizim ma'muri yoki DevOps tajribangiz bor → **Cloud**.
- Vaqtingiz bor va kuchli portfolio qurishga tayyorsiz → **Pentest**.

**5. Smenali ishga munosabatingiz?** SOC da bu ko'p uchraydi.

**6. Yozish va muloqot qilishga munosabatingiz?** Hamma yo'nalishda kerak, lekin Pentest'da hisobot, AppSec'da dasturchilar bilan ishlash — ishning yarmi.

:::tip
Ikkilanayotgan bo'lsangiz — **SOC** dan boshlash eng xavfsiz tanlov. U sohaga eng keng eshik, va u yerda olgan tajribangiz — haqiqiy hujumlarni ko'rish — keyin Pentest'ga ham, Cloud'ga ham o'tishda katta ustunlik beradi. "Avval himoyani o'rgan, keyin hujumga o't" — ko'p kuchli mutaxassislar bosib o'tgan yo'l.
:::

## Sinab ko'ring

Tanlashning eng yaxshi usuli — har biridan ozgina tatib ko'rish. Qaror qilishdan oldin bir hafta ajrating:

| Yo'nalish | Bir-ikki kunlik sinov |
|---|---|
| **Pentest** | TryHackMe'da bitta boshlang'ich mashina; PortSwigger'da 3–4 ta lab |
| **SOC** | TryHackMe yoki LetsDefend'da bitta jurnal/PCAP tahlili topshirig'i |
| **AppSec** | O'zingiz yozgan kichik dasturni "kirishga ishonmaslik" nuqtai nazaridan ko'rib chiqing; Juice Shop'ni ishga tushiring |
| **Cloud** | Bulut provayderining bepul darajasida akkaunt ochib, bitta server ko'taring; birinchi kuni MFA va byudjet ogohlantirishini yoqing |

Qaysi biridan keyin "yana qilgim kelyapti" degan his qolsa — javob shu.

## Tanlaganingizdan keyin

1. **Sozlamalarda yo'nalishni belgilang** (Sozlamalar → Yo'nalish yoki Yo'l xaritasidagi "Tanlash" tugmasi). Shundan keyin dastur rejangizni, keyingi mavzularni va taxminiy tugash sanasini shu yo'nalish bo'yicha hisoblaydi.

2. **Tanlangan tarmoq mavzulariga o'ting.** Diqqat: tarmoq bosqichlarining to'liq darslari hali yozilmoqda. Hozircha har bir mavzuda **o'quv maqsadlari** va **tanlangan manbalar** bor — yo'l xaritasi rejimida o'rganasiz: manbalar bo'yicha ishlab, maqsadlarni belgilab borasiz.

3. **Portfolio'ni hozirdan boshlang.** Git darsidagi maslahat: har bir yechilgan topshiriq, yozilgan vosita, tahlil — GitHub'ga. Yo'nalish oxirida ish beruvchiga ko'rsatadigan narsangiz bo'lishi kerak.

4. **Poydevorni unutmang.** Takrorlash kartochkalari bejiz emas — kuniga besh daqiqa, va bir yildan keyin ham subnetni boshingizda hisoblaysiz.

## Fikringiz o'zgarsa

Bu ham normal. Bir oy o'tib tushunsangizki, tanlagan yo'nalishingiz siz kutgandek emas — sozlamalarda almashtiring. Sarflangan vaqt bekor ketmaydi: har bir yo'nalishdagi bilim boshqalarida ham ishlaydi.

Hujumni bilgan himoyachi kuchliroq. Himoyani bilgan pentester — qimmatliroq. Kodni tushunadigan SOC analitigi kamdan-kam uchraydi. Bu sohada **keng bilim — hech qachon ortiqcha emas**.

:::key
Mukammal tanlov yo'q — **boshlangan yo'l** bor. Ikki oy ikkilanib yurgandan ko'ra, bir yo'nalishni tanlab, bir oy ishlab, kerak bo'lsa almashtirgan yaxshi. Harakat qilayotgan odam to'g'ri yo'lni topadi; kutib turgan — yo'q.
:::

## Xulosa

- Poydevor tugadi — to'rt yo'nalish ham shu bilimga tayanadi.
- Tanlov **birinchi ishga** olib boradigan yo'l; keyin o'zgartirish mumkin va odatiy.
- **Pentest** — buzib ko'rish va hisobot; o'rinlar kam.
- **SOC** — kuzatish va tergov; kirish eshigi eng keng.
- **AppSec** — xavfsiz qurish; dasturlash talab qilinadi.
- **Cloud** — infratuzilma va avtomatlashtirish; texnologiyalar ko'p.
- To'g'ri savol: **qaysi ishni har kuni qilishga tayyorman?**
- Ikkilansangiz — SOC; tanlashdan oldin har biridan tatib ko'ring.
- Tanlovni sozlamalarda belgilang va portfolio'ni hozirdan boshlang.

:::quiz
? Yo'nalish tanlashda eng to'g'ri savol qaysi?
- Qaysi biri eng ko'p pul to'laydi?
- Qaysi biri eng mashhur?
+ Qaysi ishni har kuni, uzoq vaqt qilishga tayyorman?
- Do'stlarim qaysi birini tanladi?
! Qiziqish bo'lmasa, bir-ikki yillik o'qishni oxiriga yetkazish qiyin. Kundalik ishning o'zi sizga mos kelishi kerak.

? Sohaga kirish uchun ish o'rinlari eng ko'p bo'lgan yo'nalish qaysi?
- Pentest / Red Team
+ SOC / Blue Team
- AppSec
- Malware tahlili
! Har bir tashkilotga doimiy monitoring kerak, shuning uchun SOC — eng keng kirish eshigi.

? Dasturchi sifatida tajribasi bor odam uchun eng tabiiy yo'nalish qaysi?
- SOC
- Pentest
+ AppSec
- Cloud
! AppSec dasturlash bilimiga tayanadi: kod tahlili, xavfsiz loyihalash va dasturchilar bilan ishlash.

? Pentester ishining katta qismini nima tashkil qiladi?
- Faqat zaiflik qidirish
+ Zaiflik topish bilan birga — topilmalarni tushunarli hisobotda bayon qilish
- Server sozlash
- Jurnallarni kuzatish
! Mijoz uchun qiymat — tushunarli hisobot va tuzatish yo'li. Yozish — ishning yarmi.

? Tanlagan yo'nalishingiz bir oydan keyin sizga mos kelmasligini tushundingiz. Nima qilasiz?
- O'qishni butunlay tashlayman
- Majburan davom ettiraman
+ Yo'nalishni almashtiraman — olingan bilim boshqa yo'nalishda ham ishlaydi
- Poydevorni boshidan o'qiyman
! Yo'nalishlar orasida o'tish odatiy; barchasi bitta poydevorga tayanadi.

? SOC L1 ishi haqida qaysi gap to'g'ri?
- U hech qachon takrorlanmaydi
+ Unda ko'p takrorlanuvchi tekshiruvlar va ko'pincha smenali ish bor, lekin u keyingi darajalarga yo'l ochadi
- U faqat dasturlashdan iborat
- Unga tajribasiz olinmaydi
! L1 — boshlang'ich bosqich: ko'p ogohlantirish, ko'p yolg'on signal. Bir-ikki yilda tergov va ov ishiga o'tiladi.

? Qaror qilishdan oldin eng foydali qadam qaysi?
- Internetda maoshlarni solishtirish
+ Har bir yo'nalishdan bir-ikki kunlik amaliy topshiriq bajarib ko'rish
- Eng qimmat kursni sotib olish
- Hech narsa — tasodifiy tanlash
! Amaliy sinov qaysi ish sizga chindan yoqishini ko'rsatadi — tavsiflardan ko'ra ishonchliroq.

? Yo'nalishni dasturda belgilash nima beradi?
- Hech narsa
+ Reja, keyingi mavzular va taxminiy tugash sanasi shu yo'nalish bo'yicha hisoblanadi
- Boshqa yo'nalishlar o'chiriladi
- Poydevor progressi tozalanadi
! Tanlov o'quv yo'lingizga tarmoq bosqichlarini qo'shadi; uni istalgan payt almashtirish mumkin.
:::

:::cards
To'rt yo'nalishning asosiy savollari? :: Pentest — qanday buzish mumkin; SOC — nima sodir bo'lyapti; AppSec — qanday xavfsiz qurish; Cloud — infratuzilmani qanday himoyalash.
Qaysi yo'nalishda kirish to'sig'i eng past? :: SOC / Blue Team — ish o'rinlari eng ko'p.
Pentest yo'nalishining asosiy qiyinligi? :: Junior o'rinlar kam va raqobat kuchli; kuchli portfolio va hisobot yozish ko'nikmasi kerak.
AppSec uchun asosiy talab? :: Dasturlashni chinakam bilish va dasturchilar bilan ishlay olish.
Cloud yo'nalishining xususiyati? :: Texnologiyalar ko'p va tez o'zgaradi; avtomatlashtirish va doimiy o'rganish talab qilinadi.
Yo'nalish tanlashda to'g'ri savol? :: Qaysi ishni har kuni, uzoq vaqt qilishga tayyorman?
Ikkilansangiz qaysi yo'nalish tavsiya etiladi? :: SOC — eng keng kirish eshigi va haqiqiy hujumlarni ko'rish tajribasi.
Tanlov o'zgarmasmi? :: Yo'q — yo'nalishlar orasida o'tish odatiy; barchasi bitta poydevorga tayanadi.
:::
