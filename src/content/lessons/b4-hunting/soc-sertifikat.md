Ish e'lonini o'qiyapsiz: "SOC analitigi (L1). Talablar: SIEM bilan ishlash tajribasi, tarmoq va operatsion tizimlar asoslari, **Security+ yoki unga teng sertifikat afzallik**."

Siz bu kursda yuzlab soat o'qidingiz, laboratoriya qurdingiz, qoidalar yozdingiz. Bilim bor. Lekin rezyumeni filtrlaydigan HR mutaxassisi (yoki avtomatik tizim) buni qanday biladi? Ko'pincha — sertifikat orqali.

Sertifikat — sehrli kalit emas. Lekin boshlang'ich darajada u eshikni ochishga yordam beradi: rezyume filtrlaridan o'tish, bilimni xalqaro standart bo'yicha tasdiqlash va o'zingizga ham "men tayyorman" degan ishonch berish. Bu darsda SOC yo'nalishi uchun to'g'ri sertifikatni tanlash va unga samarali tayyorlanishni o'rganasiz.

## Sertifikat nima beradi — va nima bermaydi

| Beradi | Bermaydi |
|---|---|
| Rezyume filtrlaridan o'tish (HR, avtomatik tizimlar) | Amaliy ko'nikmani kafolatlamaydi |
| Bilimni tizimli tartibga solish | Ish tajribasining o'rnini bosmaydi |
| Ba'zi lavozimlar va davlat shartnomalari uchun rasmiy talab | Intervyudagi texnik savollarga javob o'rniga o'tmaydi |
| O'zingizga aniq maqsad va muddat | Portfoliosiz kuchli emas |

Eng kuchli kombinatsiya — **sertifikat + portfolio** (o'tgan dars): biri "bilaman" deydi, ikkinchisi "qila olaman" deydi.

## SOC yo'nalishi uchun sertifikatlar

Sertifikatlar ikki turga bo'linadi: **bilim** (test savollari) va **amaliy** (haqiqiy tergov topshiriqlari).

| Sertifikat | Kim beradi | Turi | Daraja | Izoh |
|---|---|---|---|---|
| **CompTIA Security+** | CompTIA | Bilim + bir nechta amaliy savol | Boshlang'ich | Eng keng tan olingan boshlang'ich sertifikat; ko'p e'lonlarda tilga olinadi |
| **BTL1** (Blue Team Level 1) | Security Blue Team | **Amaliy** (uzun tergov imtihoni) | Boshlang'ich–o'rta | Phishing, SIEM, forensika, IR — aynan SOC ishi |
| **CCD** (Certified CyberDefender) | CyberDefenders | **Amaliy** | O'rta | SIEM, forensika, tahdid ovi |
| **CompTIA CySA+** | CompTIA | Bilim + amaliy savollar | O'rta | Security+ dan keyingi qadam, tahlilchi uchun |
| **Splunk Core Certified User / Power User** | Splunk | Bilim | Boshlang'ich | Splunk ishlatadigan kompaniyalar uchun |
| **Microsoft SC-200** | Microsoft | Bilim | O'rta | Sentinel va Defender — Microsoft muhitidagi SOC uchun |
| **GIAC** (GSEC, GCIH, GCIA va boshqalar) | SANS / GIAC | Bilim (ochiq kitob) | O'rta–yuqori | Juda hurmatli, lekin juda qimmat — ko'pincha ish beruvchi to'laydi |

Shuningdek, ba'zi o'quv platformalari ham o'z amaliy sertifikatlarini taklif qiladi — ular arzonroq va amaliy ko'nikmani yaxshi ko'rsatadi, lekin tan olinishi kamroq.

:::info
**Narxlar, imtihon versiyalari va tarkiblar muntazam o'zgaradi.** Masalan, CompTIA imtihonlari taxminan har uch yilda yangi versiyaga o'tadi (kodi o'zgaradi: SY0-701 va h.k.). Tayyorlanishni boshlashdan oldin rasmiy saytda **joriy versiya kodini**, imtihon tarkibini (exam objectives) va narxni tekshiring — eski versiya uchun materiallar bilan tayyorlanish vaqtni behuda sarflash bo'lishi mumkin.
:::

## Qaysi yo'l siz uchun

Oddiy qaror daraxti:

```
 Sizda IT yoki xavfsizlik bo'yicha hech qanday sertifikat yo'qmi?
   │
   ├─ Ha → CompTIA Security+  (rezyume filtrlari uchun eng foydali boshlanish)
   │         │
   │         └─► keyin amaliy: BTL1 yoki CCD  (SOC ko'nikmasini isbotlash)
   │
   └─ Yo'q, Security+ bor yoki IT tajribangiz bor
             │
             ├─ Maqsad: SOC L1 tezroq → BTL1
             ├─ Maqsad: tahlilchi sifatida o'sish → CySA+
             └─ Kompaniya Microsoft yoki Splunk ishlatadi → SC-200 / Splunk sertifikatlari
```

Kurs tavsiyasi — curriculum'dagi yo'l: **Security+ → BTL1 yoki CySA+.** Ko'p hollarda birinchi ishga kirish uchun Security+ va yaxshi portfolio yetarli; qolganlari — ishga kirgandan keyin, ko'pincha ish beruvchi hisobidan.

**Mahalliy bozorni ham tekshiring.** O'zbekistondagi va siz mo'ljallagan mamlakatlardagi ish e'lonlarini 20–30 tasini o'qing: qaysi sertifikatlar eng ko'p tilga olinadi? Karyera bo'limidagi "Ish bozori va lavozimlar" darsida bu tahlilni batafsil qilasiz.

## Bu kurs va Security+ — qanday bog'liq

Security+ tarkibining katta qismini siz allaqachon o'rgangansiz. Taxminiy moslik:

| Security+ mavzu sohasi | Kursdagi joyi |
|---|---|
| Umumiy xavfsizlik tushunchalari (CIA, autentifikatsiya, kriptografiya, PKI) | s5 bosqichi — xavfsizlik asoslari |
| Tahdidlar, zaifliklar va himoya choralari | s5 (hujum turlari, CVE/CVSS, ijtimoiy muhandislik), b1–b2 |
| Xavfsizlik arxitekturasi (tarmoq, bulut, segmentatsiya) | s2 — tarmoq; himoya qatlamlari; bulut loglari darsi |
| Xavfsizlik operatsiyalari (monitoring, IR, forensika, avtomatlashtirish) | **b1–b4** — butun SOC tarmog'i |
| Xavfsizlik dasturini boshqarish (risk, siyosatlar, muvofiqlik) | s5 qisman — **qo'shimcha o'qish kerak** |

Oxirgi qator — eng ko'p "yangi" material bo'ladigan joy: risk boshqaruvi, siyosatlar, standartlar va qonunchilik, uchinchi tomon xavfi, xavfsizlik madaniyati. Rasmiy imtihon tarkibini (exam objectives PDF) yuklab olib, har bir bandni "bilaman / qisman / bilmayman" deb belgilang — bu sizning shaxsiy o'quv rejangiz bo'ladi.

## Tayyorgarlik rejasi

### 1. Asos: rasmiy imtihon tarkibi

Har qanday sertifikat uchun birinchi hujjat — **exam objectives** (imtihon tarkibi). Unda imtihonda nima bo'lishi aniq yozilgan. Uni jadvalga aylantiring:

| Band | Holat | Manba | Sana |
|---|---|---|---|
| 1.2 — Asosiy xavfsizlik tushunchalari | Bilaman | s5 bosqichi | ✓ |
| 2.4 — Zararli faoliyat belgilari | Bilaman | b1–b3 | ✓ |
| 5.2 — Risk boshqaruvi jarayoni | **Bilmayman** | Video kurs + qaydlar | 3-hafta |
| … | | | |

### 2. Manbalar

| Manba turi | Misollar | Nima uchun |
|---|---|---|
| **Video kurs** | Professor Messer (bepul), boshqa mashhur o'qituvchilar | Tarkibni tartibli o'tish |
| **Kitob** | Rasmiy yoki mashhur o'quv qo'llanmalari | Chuqurroq tushuntirish |
| **Sinov testlari** | Bir nechta turli manbalardan | Bo'shliqlarni topish, imtihon formatiga ko'nikish |
| **Amaliyot** | Bu kursdagi laboratoriyalar | Amaliy savollar (PBQ) uchun |
| **Takrorlash** | Ilovadagi **Takrorlash** bo'limi (flashcard'lar) | Atamalar, portlar, Event ID'lar |

### 3. Jadval

Kunlik vaqtingizga qarab (ilovadagi sozlamalar bilan bir xil mantiq):

| Kunlik vaqt | Security+ uchun taxminiy muddat (bu kursdan keyin) |
|---|---|
| 30 daqiqa | 3–4 oy |
| 1 soat | 6–10 hafta |
| 2 soat | 4–6 hafta |

Bu taxminlar — sizda bu kurs asoslari bor deb faraz qiladi. Noldan tayyorlanayotgan odam uchun muddat ancha uzoqroq.

### 4. Sinov testlari — to'g'ri ishlatish

Sinov testlari — o'rganish vositasi, faqat baholash emas:

- **Har bir xato javobni tahlil qiling** — nega noto'g'ri? Qaysi bandga tegishli? Shu mavzuni qayta o'qing.
- **To'g'ri javoblarni ham** — taxmin bilan topganlaringizni belgilang.
- **Turli manbalardan** testlar ishlating — bitta manbadagi savollarni yodlab olish xavfli.
- **Barqaror natija** — imtihonga yozilish uchun yaxshi signal: turli testlarda bir necha marta ketma-ket **85%+** (curriculum'dagi maqsad).

:::key
**Savollarni yodlash emas, tushunish.** Internetda "haqiqiy imtihon savollari" deb sotiladigan to'plamlar ("brain dump") — imtihon qoidalarini buzadi, sertifikatni bekor qilishga olib kelishi mumkin va eng muhimi — sizga hech narsa o'rgatmaydi. Intervyuda "Security+ bor ekan, unda nega DNS qanday ishlashini tushuntira olmaysiz?" degan holat — eng yomon natija. Sertifikat — bilimingizning **natijasi** bo'lishi kerak, uning o'rnini bosuvchi emas. Bu kursda qilgan ishingiz aynan shunday asos beradi.
:::

## Imtihon kuni

| Narsa | Maslahat |
|---|---|
| **Format** | Onlayn (uyda, kamera bilan nazorat) yoki test markazida — qoidalarni oldindan o'qing |
| **Onlayn imtihon** | Xona bo'sh, stol toza, internet barqaror; tizim tekshiruvini **bir kun oldin** o'tkazing |
| **Til** | Ko'p imtihonlar ingliz tilida — atamalar bu kursda inglizcha qoldirilgani shuning uchun ham foydali |
| **Amaliy savollar (PBQ)** | Ko'p vaqt oladi; ba'zan ularni oxiriga qoldirish tavsiya etiladi — avval tez savollarga javob bering |
| **Vaqt** | Har bir savolga qancha vaqt ketishini kuzating; qiyin savolni belgilab, keyin qayting |
| **Savollarni o'qish** | "**Eng** yaxshi", "**birinchi** qadam", "**eng** samarali" — kalit so'zlarga e'tibor bering |

Oxirgi qator muhim: imtihon savollarida ko'pincha bir nechta javob "to'g'ri", lekin bittasi "eng to'g'ri". Bu kursdagi test savollari ham shu uslubda yozilgan — masalan, "Ransomware tarqalmoqda — birinchi qadam?" (IR jarayoni darsi).

## Sertifikatdan keyin

- **Rezyume va LinkedIn'ga** qo'shing — sertifikat raqami yoki tasdiqlash havolasi bilan.
- **Portfolio bilan bog'lang** — "Security+ bilimlarimni laboratoriyada qo'lladim: …".
- **Muddatini kuzating** — ko'p sertifikatlar (masalan, CompTIA) bir necha yildan keyin yangilanishi kerak: uzluksiz ta'lim ballari (CE) yoki yangi imtihon orqali. Bu kursdagi keyingi bosqichlar va amaliy platformalar shu ballarni yig'ishga ham yordam berishi mumkin — shartlarni tekshiring.
- **Keyingi qadam** — ishga kirgandan keyin: BTL1 yoki CySA+, keyin — ixtisoslik (forensika, ov, bulut, aniqlash muhandisligi).

## Karyera bo'limiga ko'prik

Sertifikat va portfolio — ishga kirishning ikki ustuni. Qolganlari — rezyume, LinkedIn, ish qidirish strategiyasi, intervyuga tayyorgarlik va birinchi 90 kun — kursning **Karyera** bo'limida. Ilovadagi **Intervyu** sahifasidagi savollar bilan har kuni 10–15 daqiqa mashq qiling: SOC intervyularida ko'p so'raladigan savollar (Event ID'lar, triage, phishing tahlili, TCP/UDP, IR bosqichlari) — aynan siz o'rgangan narsalar.

Siz SOC tarmog'ining oxiriga yetdingiz. b1 bosqichida "SOC nima?" degan savoldan boshlab, endi loglarni o'qiysiz, SIEM'da so'rov yozasiz, qoidalar yaratasiz, xotira va diskdan dalil topasiz, ov qilasiz va hisobot yozasiz. Bu — SOC analitigi ishining o'zi.

:::try
**1. Bozor tahlili.** O'zbekiston va siz mo'ljallagan 1–2 mamlakatdagi 20 ta SOC analitigi ish e'lonini o'qing. Jadval tuzing: qaysi sertifikatlar, qaysi vositalar (Splunk, Sentinel, Wazuh, EDR nomlari), qaysi ko'nikmalar eng ko'p tilga olingan?

**2. Imtihon tarkibi.** Tanlagan sertifikatingizning rasmiy imtihon tarkibini (exam objectives) yuklab oling va har bir bandni "bilaman / qisman / bilmayman" deb belgilang. "Bilmayman" bandlari uchun manba va sana yozing.

**3. Reja.** Kunlik vaqtingizga qarab haftalik reja tuzing: qaysi hafta qaysi bandlar, qachon birinchi sinov testi, imtihonga taxminiy sana.

**4. Birinchi sinov testi.** Bepul sinov testlaridan birini hozir — tayyorlanishdan **oldin** — yeching. Natijangiz va eng zaif sohalaringizni yozing. Bu — boshlang'ich nuqtangiz.

**5. Intervyu mashqi.** Ilovadagi Intervyu bo'limidan har kuni 5 ta savolga ovoz chiqarib javob bering — xuddi haqiqiy intervyudagidek.
:::

## Xulosa

- Sertifikat — **rezyume filtrlaridan o'tish** va bilimni tasdiqlash vositasi; ko'nikmani isbotlamaydi — buning uchun **portfolio**.
- SOC uchun asosiy yo'l: **Security+** (boshlang'ich, eng keng tan olingan) → **BTL1** yoki **CCD** (amaliy) yoki **CySA+** (tahlilchi); muhitga qarab — **SC-200**, **Splunk**; keyinroq — GIAC.
- Mahalliy ish e'lonlarini tahlil qiling — qaysi sertifikatlar talab qilinishini o'zingiz ko'ring.
- Versiyalar, narxlar va tarkiblar o'zgaradi — **rasmiy saytni** tekshiring.
- Tayyorgarlik: **rasmiy imtihon tarkibi** → bo'shliqlar jadvali → video/kitob → **sinov testlari** (xatolar tahlili, turli manbalar, barqaror **85%+**) → amaliyot → takrorlash.
- "Brain dump" — qoidabuzarlik va foydasiz; **tushunish**, yodlash emas.
- Imtihonda: format va qoidalarni oldindan bilish, PBQ va vaqtni boshqarish, "eng yaxshi / birinchi" kalit so'zlari.

:::quiz
? Boshlang'ich SOC lavozimiga ariza berishda sertifikatning asosiy foydasi nima?
+ Rezyume filtrlaridan o'tish va bilimni xalqaro standart bo'yicha tasdiqlash
- Amaliy ko'nikmani to'liq kafolatlash
- Intervyuni o'tkazmaslik
- Ish tajribasini to'liq almashtirish
! Ko'nikmani esa portfolio isbotlaydi — eng kuchli kombinatsiya ikkalasi birga.

? Hech qanday sertifikati yo'q odam uchun SOC yo'nalishida eng keng tan olingan boshlang'ich sertifikat qaysi?
- GIAC GCIH
+ CompTIA Security+
- Microsoft SC-200
- CySA+
! Security+ ko'p ish e'lonlarida tilga olinadi va keyingi sertifikatlar uchun asos bo'ladi.

? BTL1 va CCD kabi sertifikatlarning asosiy xususiyati nima?
- Ular faqat nazariy savollardan iborat
+ Ular amaliy — haqiqiy tergov topshiriqlarini yechishni talab qiladi
- Ular faqat bulut uchun
- Ular bepul va imtihonsiz
! Amaliy sertifikatlar SOC ish ko'nikmalarini bevosita ko'rsatadi.

? Tayyorlanishni boshlashdan oldin birinchi navbatda nimani tekshirish kerak?
+ Rasmiy saytdagi joriy imtihon versiyasi kodi va imtihon tarkibi (exam objectives)
- Do'stlaringizning fikrini
- Eng arzon kitobni
- Faqat imtihon narxini
! Eski versiya uchun tayyorlanish — vaqtni behuda sarflash bo'lishi mumkin.

? Sinov testlarini qanday ishlatish eng samarali?
- Bitta manbadagi savollarni yodlab olish
+ Har bir xato (va taxminiy to'g'ri) javobni tahlil qilish, turli manbalardan foydalanish, barqaror natijaga intilish
- Faqat imtihondan bir kun oldin bitta test yechish
- Natijaga qaramaslik
! Sinov testlari — bo'shliqlarni topuvchi o'rganish vositasi.

? “Brain dump” (haqiqiy imtihon savollari to'plami) haqida qaysi gap to'g'ri?
- Bu tayyorlanishning eng yaxshi usuli
+ Bu imtihon qoidalarini buzadi, sertifikat bekor qilinishiga olib kelishi mumkin va hech narsa o'rgatmaydi
- Bu qonuniy va tavsiya etiladi
- Bu faqat amaliy imtihonlar uchun
! Sertifikat bilimning natijasi bo'lishi kerak, uning o'rnini bosuvchi emas.

? Imtihonga yozilish uchun yaxshi signal qaysi?
+ Turli manbalardagi sinov testlarida bir necha marta ketma-ket barqaror 85%+ natija
- Bitta testda bir marta 70%
- Barcha video darslarni ko'rib chiqish
- Kitobni bir marta o'qish
! Barqarorlik va turli manbalar — tasodifiy omadni istisno qiladi.

? Imtihon savolida “birinchi qadam” yoki “eng yaxshi” degan so'zlar bo'lsa, nimaga e'tibor berish kerak?
- Ular ahamiyatsiz
+ Bir nechta javob to'g'ri bo'lishi mumkin, lekin faqat bittasi shu shartga eng mos keladi
- Doim eng uzun javobni tanlash kerak
- Doim birinchi javobni tanlash kerak
! Masalan, ransomware'da “birinchi qadam” — tarmoqdan ajratish, garchi boshqa choralar ham kerak bo'lsa.

? Security+ tarkibining qaysi sohasi bu kursda eng kam yoritilgan va qo'shimcha o'qishni talab qiladi?
- Xavfsizlik operatsiyalari (monitoring, IR)
- Tarmoq asoslari
+ Xavfsizlik dasturini boshqarish (risk, siyosatlar, muvofiqlik)
- Tahdidlar va zaifliklar
! Imtihon tarkibini band-band belgilash shaxsiy bo'shliqlaringizni ko'rsatadi.

? Sertifikat olingandan keyin qaysi harakat muhim?
+ Uni rezyume va LinkedIn'ga tasdiqlash havolasi bilan qo'shish va yangilanish muddatini kuzatish
- Uni hech kimga aytmaslik
- O'qishni butunlay to'xtatish
- Portfolioni o'chirish
! Ko'p sertifikatlar uzluksiz ta'lim yoki qayta imtihon bilan yangilanadi.
:::

:::cards
Sertifikat nima beradi va nima bermaydi? :: Beradi — rezyume filtrlaridan o'tish, bilimni tasdiqlash, maqsad. Bermaydi — amaliy ko'nikma kafolati, ish tajribasi.
SOC uchun boshlang'ich sertifikat? :: CompTIA Security+ — eng keng tan olingan.
Amaliy SOC sertifikatlari? :: BTL1 (Security Blue Team), CCD (CyberDefenders) — haqiqiy tergov topshiriqlari.
Security+ dan keyingi yo'llar? :: BTL1/CCD (amaliy), CySA+ (tahlilchi), SC-200 (Microsoft), Splunk sertifikatlari; keyinroq GIAC.
Tayyorgarlikning birinchi qadami? :: Rasmiy saytdan joriy versiya kodi va imtihon tarkibini (exam objectives) olish.
Imtihon tarkibi bilan qanday ishlash? :: Har bir bandni “bilaman / qisman / bilmayman” deb belgilab, manba va sana bilan reja tuzish.
Tayyorgarlik manbalari? :: Video kurs (masalan, Professor Messer), kitob, turli sinov testlari, laboratoriya, flashcard'lar.
Sinov testlari qoidalari? :: Xatolarni tahlil qilish, turli manbalar, barqaror 85%+ natija.
Brain dump? :: “Haqiqiy savollar” to'plami — qoidabuzarlik, sertifikat bekor qilinishi xavfi, hech narsa o'rgatmaydi.
Imtihon kuni maslahatlari? :: Format qoidalarini bilish, onlaynda tizim tekshiruvi oldindan, PBQ va vaqtni boshqarish, “eng / birinchi” so'zlariga e'tibor.
Sertifikatdan keyin? :: Rezyume/LinkedIn'ga havola bilan, portfolio bilan bog'lash, yangilanish muddatini kuzatish, keyingi ixtisoslik.
Ishga kirishning ikki ustuni? :: Sertifikat (bilaman) va portfolio (qila olaman).
:::
