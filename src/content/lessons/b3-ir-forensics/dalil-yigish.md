Tergov bir oy davom etdi. Hujumchi topildi, ish sudga yetib bordi. Himoyachi advokat bitta savol beradi: "Siz bu diskni tahlil qilganingizda, unga hech narsa yozilmaganini qanday isbotlaysiz? Va disk bir oy davomida kimning qo'lida bo'lgan?"

Javob bo'lmasa — eng kuchli dalil ham sud uchun qiymatsiz. Va sud bo'lmasa ham, ichki tergovda xodimni ishdan bo'shatish yoki sug'urta to'lovi aynan shu dalillarga asoslanadi.

[[forensics|Raqamli forensika]]ning birinchi qoidasi: **dalilni topishdan oldin uni saqlashni o'rganing.** Bu darsda dalilni buzmasdan qanday yig'ish, qaysi tartibda va qanday hujjatlashtirishni o'rganasiz.

## Forensikaning asosiy tamoyillari

| Tamoyil | Ma'nosi |
|---|---|
| **Aslini o'zgartirmaslik** | Tahlil asl dalil ustida emas, uning aniq nusxasi ustida qilinadi |
| **Yaxlitlikni isbotlash** | Nusxa aslining aynan o'zi ekani xesh bilan tasdiqlanadi |
| **Hujjatlashtirish** | Har bir harakat — kim, qachon, nima, nega — yoziladi |
| **Takrorlanuvchanlik** | Boshqa mutaxassis xuddi shu nusxadan xuddi shu natijani olishi kerak |
| **Minimal ta'sir** | Har bir harakat tizimni o'zgartiradi — ta'sirni kamaytiring va yozing |

Oxirgi tamoyil ayniqsa muhim. Ishlab turgan kompyuterda **har qanday** harakat — sichqonchani qimirlatish, fayl ochish, buyruq ishga tushirish — nimanidir o'zgartiradi: fayl vaqtlari, xotira tarkibi, loglar. Forensika mutaxassisi bunga yo'l qo'ymaslikka emas (bu imkonsiz), balki **ta'sirni kamaytirish va har bir harakatni yozishga** intiladi.

## O'zgaruvchanlik tartibi

Ba'zi dalillar soniyalarda yo'qoladi, boshqalari yillab saqlanadi. Shuning uchun yig'ish tartibi muhim — **eng tez yo'qoladiganidan boshlab**. Bu [[order-of-volatility|order of volatility]] deyiladi (RFC 3227 standartida tasvirlangan):

| Tartib | Dalil | Qancha yashaydi |
|---|---|---|
| 1 | Protsessor registrlari, kesh | Nanosoniyalar |
| 2 | **Operativ xotira (RAM)**: jarayonlar, tarmoq ulanishlari, ARP keshi, ochiq fayllar | Elektr o'chguncha |
| 3 | Vaqtinchalik fayl tizimlari, swap | Qayta yuklanguncha |
| 4 | **Disk** | Yillar (lekin o'zgarib boradi) |
| 5 | Masofaviy loglar va monitoring (SIEM) | Saqlash muddatigacha |
| 6 | Fizik konfiguratsiya, tarmoq topologiyasi | Uzoq |
| 7 | Arxiv nusxalari | Yillar |

Amalda bu shunday ko'rinadi: shubhali kompyuterga yaqinlashdingiz. **Birinchi** — xotira nusxasi. **Keyin** — disk. Teskari tartibda qilsangiz, disk nusxasini olish paytida xotiradagi ko'p narsa o'zgaradi yoki yo'qoladi.

### Xotirada nima bor — va nega u shunchalik qimmatli

| Faqat xotirada bo'ladigan narsa | Nega muhim |
|---|---|
| Ishlayotgan jarayonlar, shu jumladan diskda fayli yo'q jarayonlar | Faylsiz zararli dasturlar faqat xotirada yashaydi |
| Faol tarmoq ulanishlari | C2 serveri bilan joriy aloqa |
| Ochilgan (shifrlanmagan) ma'lumot | Diskda shifrlangan skript xotirada ochiq holda turadi |
| Buyruq tarixi, vaqtinchalik ma'lumotlar | Hujumchi nima kiritgan |
| Shifrlash kalitlari | Ba'zan shifrlangan disk yoki fayllarni ochish imkonini beradi |

IR jarayoni darsidagi "qurilmani o'chirmang" qoidasining sababi aynan shu jadval.

## Jonli va o'lik tahlil

| | **Jonli** (live) | **O'lik** (dead-box) |
|---|---|---|
| Holat | Kompyuter yoqiq | Kompyuter o'chirilgan, disk alohida tekshiriladi |
| Nima olinadi | Xotira, jarayonlar, ulanishlar + disk | Faqat disk |
| Afzallik | O'zgaruvchan dalillar | Tizim o'zgarmaydi, toza muhit |
| Xavf | Har bir harakat tizimni o'zgartiradi; hujumchi vositalari yolg'on gapirishi mumkin | Xotiradagi hamma narsa yo'qoladi |

Zamonaviy IR'da deyarli har doim **jonli yig'ish** bilan boshlanadi: avval xotira va tezkor "triage" ma'lumotlari, keyin disk.

Ehtiyot bo'lish kerak bo'lgan narsa: buzilgan tizimning o'z buyruqlariga to'liq ishonib bo'lmaydi. Rootkit `ps` yoki `netstat` natijasidan o'z jarayonini yashirishi mumkin. Shuning uchun:
- Vositalarni **tashqi, toza** manbadan (USB yoki tarmoq ulashmasi) ishga tushiring.
- Natijalarni buzilgan diskka emas, **tashqi** diskka yoki tarmoqqa yozing.
- Xotira nusxasini olib, keyin uni toza tizimda tahlil qiling — rootkit xotira tasvirida yashirina olmaydi (xotira tahlili darsi).

## Xotira nusxasini olish

| Tizim | Vositalar (misollar) |
|---|---|
| Windows | WinPmem, DumpIt, Magnet RAM Capture, FTK Imager |
| Linux | LiME (yadro moduli), AVML |
| Virtual mashina | Gipervizor orqali: VM'ni "pauza" yoki snapshot — xotira fayli (`.vmem` va boshqalar) |
| Bulut | Provayder vositalari va agentlar orqali; disk snapshot'lari |

Asosiy qoidalar:
- Vositani **tashqi diskdan** ishga tushiring va natijani **tashqi diskka** yozing — buzilgan diskka emas.
- Xotira hajmi qancha bo'lsa, fayl ham shuncha (16 GB RAM → ~16 GB fayl) — yetarli joy oldindan tayyorlang.
- Olingan fayl uchun darhol **xesh** hisoblang va yozing.
- Vaqtni yozing: nusxa qachon boshlandi va tugadi.

Virtual mashinalar forensika uchun qulay: gipervizor VM'ning xotirasi va diskini tizimga hech narsa o'rnatmasdan olishi mumkin. Kompyuter bosqichidagi snapshot tushunchasini eslang.

## Disk nusxasini olish

[[forensic-image|Forensik tasvir]] — diskning **bitma-bit** nusxasi: nafaqat fayllar, balki bo'sh joy, o'chirilgan fayllar qoldiqlari va fayl tizimi tuzilmalari ham. Oddiy "fayllarni nusxalash" bularning hech birini olmaydi.

### Write blocker

Diskni boshqa kompyuterga ulashning o'zi xavfli: operatsion tizim avtomatik ravishda unga yozishi mumkin (indekslash, vaqt belgilari, jurnal). [[write-blocker|Write blocker]] — diskni faqat **o'qish** rejimida ulaydigan qurilma (yoki dastur). Jismoniy write blocker'lar sud uchun eng ishonchli hisoblanadi.

### Formatlar va vositalar

| Format | Xususiyati |
|---|---|
| **Raw** (`.dd`, `.raw`, `.img`) | Oddiy bitma-bit nusxa; har qanday vosita o'qiydi; siqilmagan — disk hajmicha |
| **E01** (EnCase) | Siqilgan, ichida metama'lumot va xeshlar; forensikada eng keng tarqalgan |
| **AFF4** | Ochiq, zamonaviy format |

```bash
# Linux'da: dc3dd — forensika uchun moslashtirilgan dd (xesh va jurnal bilan)
sudo dc3dd if=/dev/sdb of=/mnt/dalil/disk01.dd hash=sha256 log=/mnt/dalil/disk01.log

# Oddiy dd bilan (keyin xeshni alohida hisoblash kerak)
sudo dd if=/dev/sdb of=/mnt/dalil/disk01.dd bs=4M conv=noerror,sync status=progress
sha256sum /dev/sdb /mnt/dalil/disk01.dd
```

Diqqat: `if` (kirish) va `of` (chiqish) ni adashtirish — dalilni **butunlay yo'q qilish** demakdir. Disk nomini (`/dev/sdb`) `lsblk` bilan ikki marta tekshiring. Linux bosqichidagi "root huquqi bilan ehtiyot bo'ling" qoidasining eng yorqin misoli.

Windows'da eng mashhur bepul vosita — **FTK Imager**: grafik interfeys orqali disk yoki xotira nusxasini E01 yoki raw formatida oladi va xeshlarni avtomatik hisoblaydi.

### Xesh — yaxlitlik isboti

Kriptografiya darsidan eslaysiz: bitta bit o'zgarsa, xesh butunlay o'zgaradi. Forensikada bu shunday ishlatiladi:

```
1. Asl diskning xeshi:        sha256(/dev/sdb)          = A
2. Nusxaning xeshi:           sha256(disk01.dd)         = A   ✓ nusxa aniq
3. Tahlildan keyin nusxaning: sha256(disk01.dd)         = A   ✓ tahlil nusxani o'zgartirmagan
```

Xeshlar hujjatga yoziladi. Har qanday paytda — bir oydan yoki bir yildan keyin — xeshni qayta hisoblab, dalil o'zgarmaganini isbotlash mumkin. Dars boshidagi advokat savoliga javob — shu.

Tahlil hech qachon asl nusxa ustida qilinmaydi: **asl** → saqlanadi; **ishchi nusxa** → tahlil qilinadi. Ishchi nusxa buzilsa, asldan yangisi olinadi.

## Triage yig'ish — tezkor yo'l

To'liq disk tasviri 1 TB disk uchun soatlab davom etadi va katta joy talab qiladi. Ko'p insidentlarda o'nlab qurilmani tez tekshirish kerak. Buning uchun **triage yig'ish** — faqat eng muhim artefaktlarni olish:

| Nima olinadi | Misol |
|---|---|
| Registr fayllari | SYSTEM, SOFTWARE, SAM, NTUSER.DAT |
| Jurnallar | `.evtx` fayllar |
| Bajarilish izlari | Prefetch, Amcache (Windows forensikasi darsi) |
| Fayl tizimi metama'lumoti | `$MFT`, `$UsnJrnl` |
| Brauzer tarixi, LNK fayllar, vazifalar | |

Vositalar: **KAPE** (Windows, mashhur bepul vosita), **Velociraptor** (EDR darsida tilga olingan — ko'p qurilmadan masofadan yig'adi), **UAC** (Linux va boshqa Unix tizimlari uchun), EDR'larning triage paketi funksiyasi. Natija — gigabaytlar emas, megabaytlar; minutlar, soatlar emas.

## Chain of custody — dalil saqlash zanjiri

[[chain-of-custody|Chain of custody]] — dalil topilgan paytdan to sudgacha (yoki tergov tugaguncha) **kimning qo'lida, qayerda va qanday** bo'lgani haqidagi uzluksiz yozuv. Bitta bo'shliq — va himoyachi "bu vaqt ichida dalilga kim tegishi mumkin edi?" deb so'raydi.

Odatiy shakl:

```
DALIL RAQAMI:   IR-2026-014-D01
TAVSIF:         Noutbuk, Dell Latitude, S/N: ABC1234; ichidagi SSD 512 GB, S/N: XYZ9876
EGASI:          d.karimova (buxgalteriya), qurilma: WS-BUX-014
TOPILGAN JOY:   3-qavat, 312-xona, stol ustida, yoqiq holatda
TOPILGAN VAQT:  2026-11-16 10:12 (UTC+5)
XESH (SHA-256): disk tasviri: ...  /  xotira tasviri: ...

| Sana, vaqt         | Kimdan        | Kimga         | Maqsad                      | Imzo |
|--------------------|---------------|---------------|-----------------------------|------|
| 2026-11-16 10:40   | A. Rahimov    | Dalil xonasi  | Saqlash uchun topshirildi    |      |
| 2026-11-17 09:05   | Dalil xonasi  | B. Saidova    | Tasvir olish                 |      |
| 2026-11-17 14:30   | B. Saidova    | Dalil xonasi  | Qaytarildi, muhr bilan       |      |
```

Jismoniy dalillar raqamlangan, muhrlangan paketlarda, kirish cheklangan joyda saqlanadi. Raqamli tasvirlar — kirish huquqi cheklangan saqlash tizimida, xeshlari bilan.

:::key
**Hamma narsani yozing — darhol.** Forensikada "keyinroq eslab yozaman" ishlamaydi. Har bir harakat: vaqti (va vaqt mintaqasi!), nima qildingiz, qaysi vosita va versiyasi, natija, xesh. Telefon bilan ekran va qurilmani suratga oling — kabel ulanishlari, ekrandagi xabarlar, qurilma holati. Bu yozuvlar keyinchalik hisobot, sud yoki saboqlar yig'ilishining asosi bo'ladi. Va eng muhimi — ular **sizni** himoya qiladi: "nega buni qildingiz?" degan savolga javobingiz tayyor.
:::

## Huquqiy va axloqiy jihatlar

- **Vakolat.** Kimning qurilmasini tekshirishga haqingiz bor? Kompaniya qurilmasi va kompaniya siyosati — odatda ha; xodimning shaxsiy telefoni — odatda yo'q, alohida rozilik yoki qonuniy asos kerak.
- **Maxfiylik.** Tergov paytida shaxsiy ma'lumotlarga duch kelasiz — ularni faqat tergov maqsadida ishlating.
- **Huquqni muhofaza qilish organlari** jalb qilinishi mumkin bo'lsa — huquqshunos bilan oldindan maslahatlashing: ularning talablari qat'iyroq bo'lishi mumkin.
- **Qonunchilik** mamlakatga qarab farq qiladi — tashkilotingiz huquqshunosi bilan aniqlang.

Xavfsizlik bosqichidagi "ruxsat — eng muhim chegara" qoidasi bu yerda ham amal qiladi.

:::warn
**Kompyuterda "o'zingiz tekshirib ko'rish" — dalillarni buzishning eng keng tarqalgan yo'li.** Yaxshi niyatli IT xodimi shubhali kompyuterda antivirus ishga tushiradi, fayllarni ochib ko'radi, keraksiz deb o'ylagan narsalarni o'chiradi va oxirida qayta yuklaydi. Natija: xotira yo'qolgan, minglab fayl vaqtlari o'zgargan, zararli fayl karantinda (yoki o'chirilgan), loglar yangi yozuvlar bilan to'lgan. Jiddiy insidentda qoida: **ajratish, tegmaslik, IR jamoasini chaqirish.**
:::

## Dalil yig'ish nimani qilmaydi

- **Barcha dalillarni saqlab qolmaydi** — xotira o'chsa, u qaytmaydi; SSD'lardagi o'chirilgan ma'lumotlar TRIM tufayli tez yo'qoladi (disk tahlili darsi).
- **Tahlilning o'rnini bosmaydi** — yig'ilgan, lekin tahlil qilinmagan dalil — shunchaki fayl.
- **Shifrlangan diskni avtomatik ochmaydi** — BitLocker kabi shifrlashda yoqiq kompyuterdan jonli yig'ish yoki kalitlar kerak; o'chirilgan shifrlangan diskdan kalitsiz deyarli hech narsa olinmaydi.
- **Bulut ma'lumotlarini o'zi olmaydi** — bulut loglari va ma'lumotlari provayder imkoniyatlari va saqlash muddatlariga bog'liq.

:::try
**1. Tartib.** Yoqiq, shubhali Windows kompyuter oldida turibsiz. Quyidagi harakatlarni to'g'ri tartibga qo'ying: (a) disk tasvirini olish; (b) ekran va qurilmani suratga olish; (c) xotira nusxasini olish; (d) qurilmani tarmoqdan ajratish; (e) chain of custody hujjatini boshlash.

**2. Laboratoriyada tasvir oling.** Linux VM'ga kichik (1 GB) ikkinchi virtual disk qo'shing, unga bir nechta fayl yozing, keyin bittasini o'chiring. So'ng:

```bash
lsblk                                            # diskni toping (masalan, /dev/sdb)
sudo dd if=/dev/sdb of=~/disk.dd bs=4M status=progress
sha256sum /dev/sdb ~/disk.dd                     # ikki xesh bir xilmi?
```

Tasvir faylini saqlang — disk tahlili darsida undan o'chirilgan faylni tiklaysiz.

**3. Xesh tajribasi.** Tasvir nusxasini oling (`cp disk.dd nusxa.dd`), nusxaning oxiriga bitta bayt qo'shing (`echo -n x >> nusxa.dd`) va ikkala xeshni solishtiring.

**4. Chain of custody.** 2-mashqdagi virtual disk uchun yuqoridagi namuna asosida chain of custody hujjatini to'ldiring.

*Javoblar: 1 — (b) va (e) → (d) → (c) → (a). Ba'zi holatlarda tarmoqdan ajratish birinchi bo'ladi (masalan, ransomware faol tarqalayotganda); lekin har doim xotira diskdan oldin. 2 — ha, xeshlar bir xil bo'lishi kerak (agar disk o'sha paytda ishlatilmagan bo'lsa). 3 — xeshlar butunlay farq qiladi — bitta bayt yetarli.*
:::

## Xulosa

- Forensika tamoyillari: **aslini o'zgartirmaslik, xesh bilan yaxlitlik, hujjatlashtirish, takrorlanuvchanlik, minimal ta'sir**.
- **O'zgaruvchanlik tartibi**: xotira → vaqtinchalik fayllar → disk → loglar → arxivlar; **xotira diskdan oldin**.
- Xotirada: jarayonlar (faylsizlari ham), ulanishlar, ochilgan ma'lumotlar, kalitlar.
- Jonli tahlil — vositalar tashqi manbadan, natija tashqi diskka; buzilgan tizim buyruqlariga to'liq ishonmang.
- Disk tasviri — **bitma-bit**, **write blocker** bilan; formatlar: raw, **E01**; `if`/`of` ni adashtirmang.
- **Xesh** — nusxa aniq va tahlildan keyin o'zgarmaganining isboti; tahlil faqat ishchi nusxada.
- **Triage yig'ish** (KAPE, Velociraptor, UAC) — ko'p qurilmani tez tekshirish uchun.
- **Chain of custody** — kim, qachon, qayerda, nima uchun — uzluksiz.
- Vakolat va maxfiylik; "o'zingiz tekshirib ko'rish" — dalillarni buzish.

:::quiz
? O'zgaruvchanlik tartibiga ko'ra nima birinchi yig'iladi?
- Disk tasviri
+ Operativ xotira (RAM)
- Arxiv zaxira nusxalari
- SIEM loglari
! Xotira elektr o'chganda yo'qoladi; disk esa saqlanib qoladi.

? Qaysi dalil faqat xotirada bo'lishi mumkin?
+ Diskda fayli yo'q (faylsiz) zararli jarayon
- Prefetch fayllari
- Registr fayllari
- Eski loglar
! Faylsiz zararli dasturlar faqat xotirada yashaydi — shuning uchun xotira nusxasi juda qimmatli.

? Forensik tasvir oddiy fayl nusxalashdan nimasi bilan farq qiladi?
- Hech narsasi bilan
+ U diskning bitma-bit nusxasi: bo'sh joy, o'chirilgan fayllar qoldiqlari va fayl tizimi tuzilmalari bilan
- U faqat hujjatlarni oladi
- U faylarni siqadi va shifrlaydi
! Oddiy nusxalash faqat ko'rinadigan fayllarni oladi.

? Write blocker nima uchun kerak?
- Diskni tezroq o'qish uchun
+ Diskni faqat o'qish rejimida ulab, unga hech narsa yozilmasligini ta'minlash uchun
- Diskni shifrlash uchun
- Viruslarni o'chirish uchun
! Operatsion tizim ulangan diskka avtomatik yozishi mumkin — bu dalilni o'zgartiradi.

? Tasvir olingandan keyin asl disk va tasvirning SHA-256 xeshlari bir xil. Bu nimani isbotlaydi?
+ Tasvir aslining aniq nusxasi
- Diskda zararli dastur yo'q
- Disk shifrlangan
- Tahlil tugagan
! Bitta bit farqi ham xeshni butunlay o'zgartiradi.

? Tahlil qaysi nusxa ustida qilinadi?
- Asl disk ustida
+ Ishchi nusxa ustida; asl nusxa o'zgarmasdan saqlanadi
- Faqat xotira ustida
- Hech qanday nusxa kerak emas
! Ishchi nusxa buzilsa, asldan yangisi olinadi.

? Nega buzilgan tizimning o'z buyruqlariga (ps, netstat) to'liq ishonib bo'lmaydi?
- Ular juda sekin
+ Rootkit ularning natijasidan o'z jarayonlari va ulanishlarini yashirishi mumkin
- Ular faqat administratorga ishlaydi
- Ular xotirani o'chiradi
! Vositalar tashqi toza manbadan ishga tushiriladi va xotira tasviri toza tizimda tahlil qilinadi.

? dd buyrug'ida if va of ni adashtirish nimaga olib keladi?
- Hech narsaga
+ Asl dalil diskining ustiga yozib, uni butunlay yo'q qilishga
- Faqat xatolik xabariga
- Tasvir siqilib qoladi
! if — kirish, of — chiqish. Disk nomini lsblk bilan ikki marta tekshiring.

? Chain of custody nima?
- Dalilni shifrlash usuli
+ Dalil kimning qo'lida, qachon, qayerda va nima uchun bo'lgani haqidagi uzluksiz yozuv
- Disk tasvir formati
- Xesh algoritmi
! Bitta bo'shliq dalilning qonuniy qiymatini shubha ostiga qo'yadi.

? Shubhali kompyuterda IT xodimi antivirus ishga tushirib, fayllarni ko'rib chiqib, uni qayta yukladi. Asosiy muammo nima?
- Antivirus eskirgan
+ Xotira yo'qoldi, fayl vaqtlari va loglar o'zgardi, ehtimoliy dalillar o'chirildi
- Hech qanday muammo yo'q
- Kompyuter sekinlashdi
! Jiddiy insidentda: ajratish, tegmaslik, IR jamoasini chaqirish.

? Triage yig'ish (masalan, KAPE bilan) to'liq disk tasviridan nimasi bilan farq qiladi?
+ Faqat eng muhim artefaktlar olinadi — ko'p qurilmani tez tekshirish uchun
- U ko'proq ma'lumot oladi
- U faqat xotirani oladi
- Farqi yo'q
! Megabaytlar va minutlar — gigabaytlar va soatlar o'rniga; lekin bo'sh joy va o'chirilgan fayllar olinmaydi.
:::

:::cards
Forensikaning asosiy tamoyillari? :: Aslini o'zgartirmaslik, xesh bilan yaxlitlik, hujjatlashtirish, takrorlanuvchanlik, minimal ta'sir.
O'zgaruvchanlik tartibi? :: Registrlar/kesh → RAM → vaqtinchalik fayllar va swap → disk → masofaviy loglar → konfiguratsiya → arxivlar.
Xotirada nima bor? :: Jarayonlar (faylsizlari ham), tarmoq ulanishlari, ochilgan ma'lumotlar, buyruq tarixi, shifrlash kalitlari.
Jonli va o'lik tahlil? :: Jonli — yoqiq tizimdan xotira va disk; o'lik — o'chirilgan diskdan. Jonli o'zgaruvchan dalillarni beradi.
Xotira nusxasi vositalari? :: Windows — WinPmem, DumpIt, Magnet RAM Capture, FTK Imager; Linux — LiME, AVML; VM — gipervizor.
Forensik tasvir nima? :: Diskning bitma-bit nusxasi, bo'sh joy va o'chirilgan fayllar qoldiqlari bilan.
Disk tasvir formatlari? :: Raw (.dd, .img) — oddiy; E01 — siqilgan, metama'lumot va xesh bilan; AFF4 — ochiq.
Write blocker? :: Diskni faqat o'qish rejimida ulaydigan qurilma yoki dastur.
Xeshning forensikadagi roli? :: Nusxa asliga tengligini va tahlildan keyin o'zgarmaganini isbotlash.
Triage yig'ish vositalari? :: KAPE (Windows), Velociraptor (masofadan, ko'p qurilma), UAC (Linux/Unix), EDR triage paketi.
Chain of custody? :: Dalil kimning qo'lida, qachon, qayerda va nima uchun bo'lgani haqidagi uzluksiz, imzolangan yozuv.
Shubhali kompyuter bilan nima qilinmaydi? :: Antivirus, fayllarni ochish, o'chirish, qayta yuklash. To'g'ri — ajratish, tegmaslik, IR jamoasini chaqirish.
:::
