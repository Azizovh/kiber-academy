Birinchi darsda CIA uchligi, tahdid, zaiflik va xavf bilan tanishgan edingiz — o'shanda bular shunchaki yangi so'zlar edi. Endi orqangizda to'rt bosqich bor: kompyuter, tarmoq, Linux va kod qanday ishlashini bilasiz. Shu bilim bilan o'sha tushunchalarga qaytamiz — bu safar chuqur.

Bu dars — xavfsizlikda **qanday o'ylash** haqida. Texnik vositalar o'zgaradi; fikrlash usuli — yo'q. Tajribali mutaxassisni boshlovchidan ajratadigan narsa aynan shu: u "qaysi vositani o'rnataman?" deb emas, "nimani, nimadan va qancha kuch sarflab himoya qilaman?" deb so'raydi.

## CIA uchligi — chuqurroq

[[cia|CIA uchligi]]: **C**onfidentiality, **I**ntegrity, **A**vailability. Endi har biriga siz allaqachon bilgan mexanizmlarni bog'laymiz.

### Maxfiylik (Confidentiality)

Ma'lumotni faqat ruxsati bor kishi ko'radi.

| Qanday buziladi | Nima himoya qiladi |
|---|---|
| Tarmoqni tinglash (shifrlanmagan protokol) | Shifrlash: TLS, VPN, SSH |
| Ortiqcha keng ruxsatlar | Kirish nazorati, eng kam imtiyoz |
| O'g'irlangan yoki yo'qolgan qurilma | Diskni shifrlash |
| Kodda yoki Git tarixida qolgan sirlar | Sirlarni alohida saqlash |
| Xodimning xatosi (noto'g'ri manzilga xat) | O'qitish, ma'lumot sizishini nazorat qilish |

### Yaxlitlik (Integrity)

Ma'lumot ruxsatsiz yoki sezdirmasdan o'zgartirilmagan.

| Qanday buziladi | Nima himoya qiladi |
|---|---|
| Yo'lda o'zgartirish (Man-in-the-Middle) | TLS, raqamli imzo |
| Fayl yoki dasturni almashtirish | Xesh tekshiruvi, yaxlitlik monitoringi |
| Bazadagi yozuvni o'zgartirish | Kirish nazorati, audit jurnali |
| Jurnallarni tozalash | Markazlashgan jurnal yig'ish |

Yaxlitlik ko'pincha e'tibordan chetda qoladi, lekin oqibati eng og'ir bo'lishi mumkin: o'g'irlangan ma'lumot haqida bilasiz, **sezdirmay o'zgartirilgan** ma'lumotga esa ishonib ishlayverasiz.

### Foydalanuvchanlik (Availability)

Tizim kerak paytda ishlaydi.

| Qanday buziladi | Nima himoya qiladi |
|---|---|
| DoS/DDoS hujumi | Filtrlash, yuklamani taqsimlash |
| Ransomware | Zaxira nusxa, segmentatsiya |
| Apparat nosozligi, elektr uzilishi | Zaxira quvvat, takrorlash (redundancy) |
| Xato sozlama yoki yangilanish | Sinov muhiti, orqaga qaytarish rejasi |

E'tibor bering: foydalanuvchanlikni faqat hujumchi emas, oddiy nosozlik va xato ham buzadi. Xavfsizlik — faqat "yomon odamlar"dan himoya emas.

### Uchlik o'rtasidagi muvozanat

Uch maqsad ko'pincha bir-biriga **zid** keladi:

- Maxfiylikni maksimal oshirsangiz (hamma narsa qulf ostida, har qadamda tasdiq) — foydalanuvchanlik pasayadi: odamlar ishlay olmaydi.
- Foydalanuvchanlikni maksimal oshirsangiz (hamma narsa hammaga ochiq) — maxfiylik yo'qoladi.

Shuning uchun "eng xavfsiz tizim" degan narsa yo'q — **shu vazifa uchun to'g'ri muvozanat** bor. Shifoxona tizimida shifokor bemor ma'lumotiga tez yetishi hayot-mamot masalasi; harbiy tizimda esa kechikish maqbul, sizib chiqish — yo'q.

:::info
Uchlikka ko'pincha yana ikki tushuncha qo'shiladi. **Autentiklik** (authenticity) — ma'lumot va uning manbai haqiqiy ekani. **Rad etib bo'lmaslik** (non-repudiation) — amalni bajargan kishi keyin "men qilmaganman" deya olmasligi; buni raqamli imzo va ishonchli jurnallar ta'minlaydi.
:::

## Xavf tili

Endi aniq ta'riflar. Bu to'rt so'zni adashtirmaslik — kasbiy savodxonlik belgisi.

| Tushuncha | Ta'rif | Misol |
|---|---|---|
| [[asset|Aktiv]] | Himoya qilinadigan qimmatli narsa | Mijozlar bazasi |
| [[vulnerability|Zaiflik]] | Aktivdagi yoki uning himoyasidagi kamchilik | Yangilanmagan veb-server |
| [[threat|Tahdid]] | Zaiflikdan foydalanishi mumkin bo'lgan narsa | Internetni skanerlayotgan jinoiy guruh |
| [[risk|Xavf]] | Tahdid zaiflikdan foydalanish **ehtimoli** × **oqibati** | Baza o'g'irlanishi va jarima |

Bog'lanish:

```
Tahdid  ──foydalanadi──►  Zaiflik  ──zarar yetkazadi──►  Aktiv
                              │
                    Xavf = Ehtimol × Oqibat
```

Uchtasidan biri bo'lmasa — xavf yo'q: qimmatli narsa bo'lmasa, himoya qiladigan narsa yo'q; zaiflik bo'lmasa, tahdid hech narsa qila olmaydi; tahdid bo'lmasa, zaiflikdan hech kim foydalanmaydi.

Yana ikki atama:

- **Hujum yuzasi** ([[attack-surface|attack surface]]) — tahdid murojaat qila oladigan barcha nuqtalar. Tarmoq bosqichidan tanish.
- **Himoya chorasi** ([[control|control]]) — xavfni kamaytiradigan har qanday narsa.

## Xavfni baholash

Hamma narsani bir xil himoyalab bo'lmaydi — pul, vaqt va odam cheklangan. Shuning uchun xavflar **baholanadi va tartiblanadi**.

Eng oddiy usul — ehtimol va oqibatni uch darajada baholab, jadvalga qo'yish:

| | Oqibat: past | Oqibat: o'rta | Oqibat: yuqori |
|---|---|---|---|
| **Ehtimol: yuqori** | O'rta | Yuqori | **Juda yuqori** |
| **Ehtimol: o'rta** | Past | O'rta | Yuqori |
| **Ehtimol: past** | Past | Past | O'rta |

Kichik onlayn do'kon uchun misol:

| Xavf | Ehtimol | Oqibat | Daraja |
|---|---|---|---|
| Administrator paroli terib topilishi (MFA yo'q) | Yuqori | Yuqori | **Juda yuqori** |
| Ransomware (zaxira nusxa yo'q) | O'rta | Yuqori | Yuqori |
| Saytga DDoS | O'rta | O'rta | O'rta |
| Ma'lumot markazida yong'in | Past | Yuqori | O'rta |
| Bosh sahifadagi rasmning almashtirilishi | Past | Past | Past |

Jadval darhol aytadi: avval nimaga pul va vaqt sarflash kerak. Birinchi qator — MFA yoqish — deyarli bepul va eng katta xavfni yopadi. Yaxshi xavfsizlik ishi ko'pincha shunday ko'rinadi: zerikarli, arzon va samarali.

:::key
Xavfsizlikning maqsadi — xavfni **nolga tushirish emas** (bu imkonsiz va cheksiz qimmat), balki uni **maqbul darajaga** keltirish. Qaysi daraja maqbul ekanini xavfsizlikchi emas, biznes egasi hal qiladi. Sizning vazifangiz — unga aniq manzarani ko'rsatish: nima sodir bo'lishi mumkin, qanchalik ehtimoli bor, qanchaga tushadi va uni kamaytirish qancha turadi.
:::

## Xavf bilan nima qilinadi

Har bir aniqlangan xavf uchun to'rt yo'ldan biri tanlanadi:

| Strategiya | Ma'nosi | Misol |
|---|---|---|
| **Kamaytirish** (mitigate) | Ehtimol yoki oqibatni pasaytirish | MFA yoqish, zaxira nusxa olish |
| **O'tkazish** (transfer) | Oqibatni boshqaga yuklash | Kibersug'urta, xizmatni provayderga topshirish |
| **Qochish** (avoid) | Xavfli faoliyatdan voz kechish | Karta ma'lumotlarini umuman saqlamaslik |
| **Qabul qilish** (accept) | Ongli ravishda hech narsa qilmaslik | Himoya narxi ehtimoliy zarardan qimmat |

To'rtinchisi — to'g'ri va qonuniy tanlov, **agar u ongli va hujjatlashtirilgan bo'lsa**. "Bilamiz, baholadik, qabul qildik" va "bilmagan edik" — butunlay boshqa narsalar.

## Himoya choralari turlari

Choralar ikki o'lcham bo'yicha tasniflanadi.

**Tabiatiga ko'ra:**

| Tur | Misollar |
|---|---|
| **Texnik** | Firewall, shifrlash, MFA, antivirus |
| **Ma'muriy** | Siyosatlar, o'qitish, ishga olishdagi tekshiruv, jarayonlar |
| **Jismoniy** | Qulf, kamera, qo'riqchi, server xonasiga kirish nazorati |

**Vazifasiga ko'ra:**

| Tur | Nima qiladi | Misol |
|---|---|---|
| **Oldini oluvchi** (preventive) | Hodisaga yo'l qo'ymaydi | Firewall, MFA |
| **Aniqlovchi** (detective) | Hodisani sezadi | Jurnallar, IDS, monitoring |
| **Tuzatuvchi** (corrective) | Oqibatni bartaraf etadi | Zaxiradan tiklash, yamoq o'rnatish |
| **To'xtatuvchi** (deterrent) | Niyatdan qaytaradi | Ogohlantirish yozuvi, kamera borligi |

Yangi boshlovchilar faqat **oldini olish** haqida o'ylaydi. Tajribali mutaxassis biladi: har qanday to'siq bir kun yengiladi. Shuning uchun **aniqlash** va **tiklash** bir xil muhim. "Bizni buzib bo'lmaydi" degan tashkilot emas, "buzilganimizni bir soatda bilamiz va bir kunda tiklaymiz" degan tashkilot xavfsiz.

## Asosiy tamoyillar

Shu paytgacha turli darslarda uchragan g'oyalarni bir joyga yig'amiz. Bular — xavfsizlikda qaror qabul qilishning tayanchlari:

| Tamoyil | Mohiyati | Qayerda uchratdingiz |
|---|---|---|
| **Eng kam imtiyoz** | Faqat ish uchun zarur huquq | Linux ruxsatlari, baza hisobi |
| **Qatlamli himoya** | Bitta to'siqqa ishonmaslik | Tarmoq himoyasi |
| **Default deny** | Aniq ruxsat berilmagani — taqiqlangan | Firewall qoidalari |
| **Hujum yuzasini kichraytirish** | Keraksiz narsani o'chirish | Xizmatlar, portlar |
| **Vazifalarni ajratish** | Muhim amalni bir kishi yolg'iz bajara olmaydi | To'lovni biri kiritadi, boshqasi tasdiqlaydi |
| **Xavfsiz standart holat** | Sozlanmagan tizim ham xavfsiz bo'lishi kerak | Standart parollar muammosi |
| **Kirishga ishonmaslik** | Tashqaridan kelgan har narsa tekshiriladi | HTTP, SQL, formalar |
| **Soddalik** | Murakkab tizimni himoyalash qiyin | — |
| **Ochiq dizayn** | Xavfsizlik sirli tuzilishga emas, kalitga tayanadi | Port raqamini yashirish himoya emas |

Oxirgisi alohida nomga ega: **"security through obscurity"** (yashirish orqali xavfsizlik) — himoyani faqat "hech kim bilmaydi" degan umidga qurish. SSH portini ko'chirish, admin sahifasini g'alati manzilga yashirish — bular shovqinni kamaytiradi, lekin himoya emas.

## Xavfsizlikchi kabi o'ylash

Har qanday tizimga qaraganingizda besh savol bering — bu **tahdidlarni modellashtirish**ning eng sodda shakli:

1. **Nimani himoya qilyapmiz?** (aktivlar)
2. **Kimdan?** (tahdidlar: tasodifiy skaner, raqobatchi, norozi xodim?)
3. **Qanday hujum qilishi mumkin?** (zaifliklar, hujum yuzasi)
4. **Sodir bo'lsa, oqibati qanday?** (C, I yoki A dan qaysi biri, qanchaga tushadi)
5. **Buni kamaytirish uchun nima qila olamiz va u arziydimi?** (choralar)

Bu savollarni har kuni o'zingizga bering: yangi dastur o'rnatayotganda, ochiq Wi-Fi'ga ulanayotganda, saytda ro'yxatdan o'tayotganda. Bir necha oyda bu odatga aylanadi — va shu odatning o'zi mutaxassislik.

:::try
**O'z raqamli hayotingizning xavf jadvali.** Qog'ozga yozing:

1. **Aktivlar:** sizning eng qimmatli 5 ta raqamli narsangiz (pochta, bank ilovasi, fotosuratlar, messenjer, ish hujjatlari…).
2. Har biri uchun: **eng ehtimolli tahdid** nima? (parol sizishi, telefon yo'qolishi, phishing, disk buzilishi…)
3. **Ehtimol** va **oqibat**ni baholang (past / o'rta / yuqori).
4. Eng yuqori ikki xavf uchun **bitta aniq chora** yozing — va bugun bajaring.

Maslahat: ko'pchilikda birinchi o'rinda **asosiy pochta** turadi — chunki boshqa barcha hisoblarning parolini aynan u orqali tiklash mumkin.
:::

## Xulosa

- **CIA**: maxfiylik, yaxlitlik, foydalanuvchanlik — ular orasida muvozanat izlanadi.
- **Aktiv** — qimmatli narsa; **zaiflik** — kamchilik; **tahdid** — undan foydalanuvchi; **xavf** = ehtimol × oqibat.
- Xavf baholanadi va tartiblanadi; maqsad — nol emas, **maqbul daraja**.
- To'rt strategiya: **kamaytirish, o'tkazish, qochish, qabul qilish**.
- Choralar: texnik / ma'muriy / jismoniy; oldini oluvchi / aniqlovchi / tuzatuvchi.
- Faqat oldini olish yetarli emas — **aniqlash va tiklash** ham kerak.
- Tamoyillar: eng kam imtiyoz, qatlamli himoya, default deny, kirishga ishonmaslik.
- Yashirish — himoya emas.

:::quiz
? Hujumchi kompaniya bazasidagi mijoz manzillarini sezdirmasdan o'zgartirib qo'ydi. CIA ning qaysi qismi buzildi?
- Maxfiylik
+ Yaxlitlik
- Foydalanuvchanlik
- Hech biri
! Ma'lumot ruxsatsiz o'zgartirildi — bu yaxlitlik. Ma'lumot o'g'irlanganida maxfiylik, tizim ishlamay qolganida foydalanuvchanlik buzilgan bo'lardi.

? Xavf (risk) qanday aniqlanadi?
- Zaifliklar soni bilan
+ Tahdid zaiflikdan foydalanish ehtimoli va oqibatining kattaligi bilan
- Firewall'lar soni bilan
- Kompaniya hajmi bilan
! Xavf = ehtimol × oqibat. Zaiflik bor, lekin ehtimol yoki oqibat juda past bo'lsa — xavf ham past.

? Kompaniya karta ma'lumotlarini o'zida saqlamaslikka va to'lovni to'liq to'lov xizmatiga topshirishga qaror qildi. Bu qaysi strategiya?
- Qabul qilish
- Kamaytirish
+ Qochish (va qisman o'tkazish)
- E'tiborsiz qoldirish
! Xavfli faoliyatning o'zidan voz kechish — qochish. Javobgarlikning bir qismi xizmat ko'rsatuvchiga o'tadi.

? Xavfni “qabul qilish” qachon to'g'ri qaror hisoblanadi?
- Hech qachon
+ U baholangan, himoya narxi ehtimoliy zarardan yuqori va qaror ongli hamda hujjatlashtirilgan bo'lsa
- Xavf haqida hech kim bilmasa
- Har doim — bu eng arzon yo'l
! Qabul qilish — qonuniy strategiya, lekin faqat ongli tanlov sifatida. Bilmasdan e'tiborsiz qoldirish — boshqa narsa.

? Jurnallarni kuzatib, shubhali kirishni xabar qiladigan tizim qaysi turdagi chora?
- Oldini oluvchi
+ Aniqlovchi
- Tuzatuvchi
- Jismoniy
! U hodisaga to'sqinlik qilmaydi, balki uni sezadi — bu aniqlovchi (detective) chora.

? Nega faqat oldini oluvchi choralarga tayanish yetarli emas?
- Ular juda qimmat
+ Har qanday to'siq bir kun yengilishi mumkin — shuning uchun aniqlash va tiklash ham kerak
- Ular qonunga zid
- Ular faqat Linux'da ishlaydi
! Mukammal himoya yo'q. Hodisani tez aniqlash va tiklana olish — oldini olish kabi muhim.

? “Security through obscurity” nima va nega yomon?
- Kuchli shifrlash usuli
+ Himoyani faqat tizim tuzilishi sir saqlanishiga qurish — sir oshkor bo'lsa, himoya qolmaydi
- Ikki bosqichli autentifikatsiya
- Jurnallarni yashirish
! Portni ko'chirish yoki manzilni yashirish shovqinni kamaytiradi, lekin haqiqiy himoya emas.

? Maxfiylikni maksimal darajaga ko'tarish odatda nimaga salbiy ta'sir qiladi?
- Yaxlitlikka
+ Foydalanuvchanlikka — tizimdan foydalanish qiyinlashadi
- Hech narsaga
- Internet tezligiga
! CIA maqsadlari o'zaro muvozanatda: haddan tashqari qat'iy cheklovlar ishni to'xtatib qo'yishi mumkin.

? “Vazifalarni ajratish” tamoyiliga qaysi misol mos?
- Hamma xodim administrator
+ To'lovni bir xodim kiritadi, boshqasi tasdiqlaydi
- Parol hech qachon o'zgartirilmaydi
- Bitta xodim hamma tizimni yolg'iz boshqaradi
! Muhim amal uchun kamida ikki kishi kerak bo'lsa, bitta odamning xatosi yoki yomon niyati yetarli bo'lmaydi.

? Xavfning qaysi darajasi maqbul ekanini kim hal qiladi?
- Xavfsizlik mutaxassisi yolg'iz o'zi
+ Biznes egasi yoki rahbariyat — mutaxassis taqdim etgan baho asosida
- Hujumchi
- Antivirus dasturi
! Mutaxassis manzarani ko'rsatadi: ehtimol, oqibat, chora narxi. Qaror va javobgarlik — biznesda.
:::

:::cards
CIA uchligi va har biriga bittadan himoya? :: Maxfiylik — shifrlash va kirish nazorati; yaxlitlik — xesh va imzo; foydalanuvchanlik — zaxira nusxa va takrorlash.
Aktiv, zaiflik, tahdid, xavf? :: Aktiv — qimmatli narsa; zaiflik — kamchilik; tahdid — undan foydalanuvchi; xavf — ehtimol × oqibat.
Xavf bilan ishlashning to'rt strategiyasi? :: Kamaytirish, o'tkazish, qochish, qabul qilish.
Himoya choralarining uch turi (tabiatiga ko'ra)? :: Texnik, ma'muriy va jismoniy.
Oldini oluvchi, aniqlovchi, tuzatuvchi choralar? :: Oldini oluvchi — yo'l qo'ymaydi (firewall); aniqlovchi — sezadi (jurnal, IDS); tuzatuvchi — tiklaydi (zaxira).
Xavfsizlikning maqsadi nima? :: Xavfni nolga emas, maqbul darajaga keltirish.
Security through obscurity nima? :: Himoyani faqat tuzilishni sir saqlashga qurish — haqiqiy himoya emas.
Tahdidlarni modellashtirishning besh savoli? :: Nimani himoya qilamiz? Kimdan? Qanday hujum qilinadi? Oqibati qanday? Nima qila olamiz va arziydimi?
Vazifalarni ajratish tamoyili? :: Muhim amalni bir kishi yolg'iz bajara olmaydi — kamida ikki kishi ishtirok etadi.
Hujum yuzasi nima? :: Tahdid murojaat qila oladigan barcha nuqtalar yig'indisi.
:::
