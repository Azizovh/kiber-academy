Xodim ishdan ketishidan bir kun oldin kompyuteridagi "keraksiz" fayllarni o'chirgan va savatni tozalagan. Rahbariyat so'raydi: "U nima o'chirgan? Mijozlar bazasini o'zi bilan olib ketganmi?"

Ko'pchilik o'ylaydi: o'chirilgan fayl — yo'q bo'lgan fayl. Aslida ko'p hollarda **o'chirish faqat "bu joy bo'sh" degan belgini qo'yadi** — ma'lumotning o'zi diskda, ustiga yangi narsa yozilguncha turaveradi. Disk forensikasi shu qoldiqlarni topish, fayllarni tiklash va diskdagi barcha izlardan yagona hikoya tuzish san'ati.

Bu darsda eng mashhur bepul vosita — **Autopsy** bilan ishlaysiz.

## Fayl o'chirilganda nima bo'ladi

Windows forensikasi darsidan eslaysiz: NTFS'da har bir fayl haqidagi ma'lumot `$MFT` da saqlanadi, mazmuni esa diskning boshqa joyidagi **klasterlarda**.

```
FAYL BOR:
  $MFT yozuvi #4821:  "Mijozlar_2026.xlsx", 2,3 MB, klasterlar 10500–11080, [ishlatilmoqda]
  Klasterlar 10500–11080: [ fayl mazmuni ]

"O'CHIRILDI" (savat tozalandi):
  $MFT yozuvi #4821:  "Mijozlar_2026.xlsx", 2,3 MB, klasterlar 10500–11080, [BO'SH]   ← faqat belgi o'zgardi
  Klasterlar 10500–11080: [ fayl mazmuni hali shu yerda ]                              ← "ajratilmagan" joy

VAQT O'TDI:
  $MFT yozuvi #4821:  yangi fayl uchun qayta ishlatildi
  Klasterlar 10500–10700: yangi ma'lumot bilan ustiga yozildi
  Klasterlar 10701–11080: eski mazmun qoldiqlari                                       ← qisman tiklash mumkin
```

Bundan uchta holat kelib chiqadi:

| Holat | Tiklash |
|---|---|
| $MFT yozuvi va klasterlar butun | Fayl to'liq, nomi va vaqtlari bilan tiklanadi |
| $MFT yozuvi qayta ishlatilgan, klasterlar butun | **Carving** orqali mazmun tiklanadi, lekin nom va vaqtlarsiz |
| Klasterlar ustiga yozilgan | Tiklab bo'lmaydi (qisman qoldiqlar bo'lishi mumkin) |

### Savat (Recycle Bin)

Oddiy o'chirishda fayl avval savatga tushadi: `C:\$Recycle.Bin\<foydalanuvchi SID>\`. Har bir o'chirilgan fayl uchun ikki fayl yaratiladi:

| Fayl | Mazmuni |
|---|---|
| `$I......` | Metama'lumot: asl yo'li, hajmi, **o'chirilgan vaqti** |
| `$R......` | Faylning o'zi |

Savat tozalangan bo'lsa ham, `$I` va `$R` fayllarining o'zlari ham "o'chirilgan fayllar" sifatida tiklanishi mumkin.

### SSD va TRIM — muhim cheklov

An'anaviy qattiq disklarda (HDD) o'chirilgan ma'lumot oylab saqlanishi mumkin. **SSD**'larda boshqacha: operatsion tizim **TRIM** buyrug'i bilan SSD'ga "bu bloklar endi kerak emas" deydi, va SSD ularni o'z vaqtida fizik tozalaydi — ko'pincha daqiqalar yoki soatlar ichida. Natijada zamonaviy noutbuklarda o'chirilgan fayllarni tiklash imkoniyati ancha kam.

Bu dalil yig'ish darsidagi "tezlik" qoidasini yana bir bor tasdiqlaydi: SSD'li qurilmadan tasvirni qanchalik tez olsangiz, shunchalik ko'p narsa saqlanib qoladi. Lekin o'chirilgan fayl tiklanmasa ham, uning **izlari** qoladi: `$UsnJrnl` dagi yozuv, LNK fayl, Jump List, ShellBags — Windows forensikasi darsidagi artefaktlar.

## Carving — tuzilmasiz tiklash

Fayl tizimi ma'lumoti yo'qolgan bo'lsa (yozuv qayta ishlatilgan, disk formatlangan), mazmunni **fayl imzolari** bo'yicha qidirish mumkin. Kompyuter bosqichidagi **magic bytes** darsini eslang:

| Fayl turi | Boshi (hex) | Matn ko'rinishi |
|---|---|---|
| JPEG | `FF D8 FF` | |
| PNG | `89 50 4E 47` | `.PNG` |
| PDF | `25 50 44 46` | `%PDF` |
| ZIP (shuningdek DOCX, XLSX) | `50 4B 03 04` | `PK..` |
| Windows dasturi | `4D 5A` | `MZ` |

Carving vositasi diskni boshidan oxirigacha o'qiydi, shu imzolarni topadi va fayl oxirigacha (yoki ma'lum hajmgacha) nusxalaydi. Mashhur vositalar: **PhotoRec**, **Foremost**, **Scalpel**; Autopsy'da ham shunday modul bor.

Cheklovlar: fayl nomi va vaqtlari yo'q; bo'lingan (fragmentlangan) fayllar ko'pincha buzilgan holda chiqadi; ko'p "keraksiz" natija bo'ladi.

E'tibor bering: "Kengaytma aldaydi" CTF topshirig'ida xuddi shu bilim kerak — fayl nomi `hisobot.pdf`, lekin magic bytes boshqa narsani aytadi. Autopsy'ning "Extension Mismatch" moduli aynan shunday fayllarni avtomatik topadi.

## The Sleuth Kit va Autopsy

**The Sleuth Kit** (TSK) — disk tasvirlarini tahlil qilish uchun buyruq qatori vositalari to'plami. **Autopsy** — uning ustiga qurilgan grafik interfeys, ko'p qo'shimcha modullar bilan. Ikkalasi ham bepul va ochiq kodli.

### TSK — asosiy buyruqlar

Ichini tushunish uchun bir nechta TSK buyrug'ini bilish foydali:

```bash
# Tasvirdagi bo'limlar (partition) jadvali
mmls disk01.dd

# Fayl tizimi haqida ma'lumot (bo'lim boshlanish sektori -o bilan)
fsstat -o 2048 disk01.dd

# Fayllar ro'yxati, rekursiv; o'chirilganlari * bilan belgilanadi
fls -r -o 2048 disk01.dd

# Faqat o'chirilgan fayllar
fls -r -d -o 2048 disk01.dd

# MFT yozuvi (inode) raqami bo'yicha fayl mazmunini olish
icat -o 2048 disk01.dd 4821 > tiklangan.xlsx

# Fayl yozuvi haqida batafsil: vaqtlar, klasterlar
istat -o 2048 disk01.dd 4821
```

`fls` natijasida `*` belgisi — o'chirilgan fayl. Agar uning yozuvi hali butun bo'lsa, `icat` uni tiklaydi. Xuddi shu ishni Autopsy grafik interfeysda bajaradi.

### Autopsy bilan ishlash

**1. Yangi keys (Case).** Keys nomi, raqami, tergovchi ismi — chain of custody (dalil yig'ish darsi) bilan bog'liq ma'lumotlar.

**2. Ma'lumot manbasini qo'shish (Add Data Source).** Disk tasviri (raw yoki E01), mahalliy disk, alohida fayllar yoki boshqa manbalar. Tasvirning xeshi tekshiriladi.

**3. Ingest modullarini tanlash.** Bu Autopsy'ning kuchi — tasvirni avtomatik tahlil qiladigan modullar:

| Modul | Nima qiladi |
|---|---|
| **Recent Activity** | Brauzer tarixi, yuklab olishlar, oxirgi hujjatlar, USB, o'rnatilgan dasturlar — Windows artefaktlaridan |
| **Hash Lookup** | Fayl xeshlarini ma'lum bazalar bilan solishtiradi: ma'lum zararsiz (NSRL) va ma'lum zararli |
| **File Type Identification** | Fayl turini kengaytma emas, mazmun bo'yicha aniqlaydi |
| **Extension Mismatch Detector** | Kengaytmasi mazmuniga mos kelmaydigan fayllar |
| **Keyword Search** | Butun tasvirdan, shu jumladan o'chirilgan va ajratilmagan joydan so'z qidirish |
| **Email Parser** | Pochta arxivlari (PST, MBOX) |
| **EXIF Parser** | Rasmlar metama'lumoti: kamera, sana, GPS |
| **Embedded File Extractor** | ZIP, DOCX va boshqa konteynerlar ichidagi fayllarni ochadi |
| **Interesting Files** | Siz belgilagan qoidalar bo'yicha fayllarni ajratadi |
| **PhotoRec Carver** | Ajratilmagan joydan carving |
| **YARA Analyzer** | YARA qoidalari bilan skanerlash (b2 bosqichidagi YARA darsi) |

**Hash Lookup** ning NSRL (ma'lum dasturlar xeshlari bazasi) bilan ishlashi juda foydali: tizim fayllari va mashhur dasturlarning yuz minglab fayli "ma'lum, zararsiz" deb belgilanib, tahlildan chiqariladi. Diqqat — qolgan **noma'lum** fayllarga qaratiladi.

**4. Natijalarni ko'rish.** Chap panelda daraxt:

| Bo'lim | Ichida |
|---|---|
| **Data Sources** | Fayl tizimi — xuddi Explorer'dagidek, o'chirilgan fayllar qizil belgi bilan |
| **Views** | Fayl turlari bo'yicha, **Deleted Files**, hajm bo'yicha |
| **Data Artifacts** | Brauzer tarixi, yuklab olishlar, USB qurilmalar, o'rnatilgan dasturlar, ishga tushgan dasturlar |
| **Analysis Results** | Kalit so'z natijalari, xesh mosliklari, kengaytma nomuvofiqligi, qiziq fayllar |
| **Tags** | Siz belgilagan muhim fayllar — hisobot uchun |

**5. Teglash va hisobot.** Muhim topilmalarni teglaysiz ("Dalil", "Tekshirilsin"), izoh qo'shasiz. Oxirida Autopsy HTML yoki Excel hisobot yaratadi — teglangan fayllar, ularning xeshlari va metama'lumoti bilan.

### Timeline

Autopsy'ning **Timeline** oynasi diskdagi barcha vaqt belgilarini — fayl vaqtlari, brauzer tarixi, jurnallar, registr — bitta grafikka joylaydi. Muayyan vaqt oralig'ini kattalashtirib, "16-noyabr 18:40–18:50 da nima bo'lgan?" degan savolga javob olasiz:

```
18:42:10  USB qurilma ulandi (SanDisk, S/N 4C53...)                   [Registr]
18:43:55  C:\Users\a.yusupov\Documents\Mijozlar_2026.xlsx ochildi       [LNK]
18:44:02  E:\Mijozlar_2026.xlsx yaratildi                               [LNK / Jump List]
18:47:30  C:\Users\a.yusupov\Documents\Mijozlar_2026.xlsx o'chirildi    [$UsnJrnl]
18:48:01  Savat tozalandi                                               [$Recycle.Bin]
18:49:12  USB qurilma uzildi                                            [Jurnal]
```

Dars boshidagi savolga javob: fayl USB'ga ko'chirilgan, keyin asl nusxasi o'chirilgan. Har bir qatorning manbasi ko'rsatilgan — bu shu bosqichning oxirgi darsidagi hisobotga to'g'ridan-to'g'ri tushadi.

:::key
**"O'chirilgan" — "yo'q" degani emas, va "topilmadi" — "bo'lmagan" degani emas.** Bir tomondan, o'chirilgan fayllar ko'pincha tiklanadi va ularning izlari (LNK, jurnallar, ShellBags) yana uzoqroq yashaydi. Boshqa tomondan, SSD va TRIM, maxsus o'chirish dasturlari yoki shifrlash ko'p narsani butunlay yo'q qiladi. Hisobotda doim aniq yozing: nima topildi, nima topilmadi va **nega topilmagan bo'lishi mumkin**. Isbotlanmagan narsani "bo'lmagan" deb yozmang.
:::

## Kalit so'z qidiruvi — qanday to'g'ri qilish kerak

Keyword Search kuchli, lekin shovqinli. Yaxshi natija uchun:

- **Aniq iboralar** — "parol" emas, xodim ismi, loyiha nomi, mijoz raqami, hujumchi domeni.
- **Regex** — karta raqamlari, telefon raqamlari, pochta manzillari, IP manzillar ([[regex|regex]] Linux bosqichidan).
- **IOC'lar** — b2 bosqichidagi tahdid razvedkasidan domenlar, IP'lar, fayl nomlari.
- Autopsy matnni turli kodlashlarda (ASCII, UTF-16) qidiradi — YARA darsidagi `wide` modifikatori bilan bir xil sabab.

## Boshqa disk artefaktlari

| Joy | Nimani topish mumkin |
|---|---|
| `pagefile.sys` | Xotiradan diskka chiqarilgan qismlar — parollar, URL'lar, buyruqlar qoldiqlari |
| `hiberfil.sys` | Uyqu rejimidagi xotira nusxasi — xotira tahlili darsida ishlatish mumkin |
| Volume Shadow Copies | Windows'ning avtomatik "tiklash nuqtalari" — fayllarning **eski versiyalari**, o'chirilganlari ham |
| Brauzer profillari | Tarix, yuklab olishlar, cookie'lar, kesh |
| Pochta arxivlari | Xatlar va ilovalar |

**Volume Shadow Copies** alohida e'tiborga loyiq: ular hujumchi o'chirgan fayllarning oldingi holatini saqlab qolishi mumkin. Shuning uchun ransomware guruhlari ko'pincha shifrlashdan oldin aynan ularni o'chirishga harakat qiladi — va bu harakatning o'zi (masalan, `vssadmin` bilan) — kuchli aniqlash belgisi (b2 bosqichidagi EDR darsi).

## Disk tahlili nimani qilmaydi

- **TRIM qilingan SSD'dan** o'chirilgan ma'lumotlarni deyarli tiklamaydi.
- **Shifrlangan diskni kalitsiz ochmaydi** — BitLocker tasvirini tiklash kaliti yoki jonli yig'ish kerak.
- **Xotiradagi narsalarni ko'rmaydi** — faylsiz zararli dasturlar, faol ulanishlar (keyingi dars).
- **Avtomatik xulosa bermaydi** — modullar ma'lumot beradi, talqin — tahlilchi ishi.
- **Bulutdagi fayllarni** (faqat lokal keshi bo'lmasa) ko'rmaydi.

:::try
**1. Simulyatorda.** "Kengaytma aldaydi" CTF topshirig'ini yeching (magic bytes).

**2. Laboratoriyada tiklash.** Dalil yig'ish darsida olgan `disk.dd` tasviringizni (o'chirilgan fayl bilan) ishlating:

```bash
sudo apt install sleuthkit
mmls disk.dd                 # bo'lim bo'lmasa, fayl tizimi to'g'ridan-to'g'ri boshlanadi
fls -r disk.dd               # * belgili qatorlarni toping
fls -r -d disk.dd            # faqat o'chirilganlar
icat disk.dd <inode> > tiklangan.txt
cat tiklangan.txt
```

O'chirilgan fayl tiklandimi? (Bo'lim jadvali bo'lsa, `mmls` ko'rsatgan boshlanish sektorini `-o` bilan bering.)

**3. Autopsy.** Autopsy'ni o'rnating va xuddi shu tasvir bilan yangi keys oching. Barcha ingest modullarini ishga tushiring. O'chirilgan faylni **Deleted Files** bo'limida toping, uni teglang va HTML hisobot yarating.

**4. Haqiqiy mashq.** TryHackMe'dagi "Autopsy" xonasini yoki CyberDefenders'dagi disk forensikasi topshiriqlaridan birini bajaring.

*Javoblar: 1 — birinchi baytlarni darsdagi magic bytes jadvali bilan solishtiring (javobni bu yerda aytmaymiz — CTF o'zingizniki). 2 — agar fayl o'chirilgandan keyin diskka ko'p yozilmagan bo'lsa, fayl to'liq tiklanadi; ext4'da o'chirilgan fayllar tez yo'qolishi mumkin — natija bo'lmasa, bu ham o'rganish uchun natija (fayl tizimi farqlari). Laboratoriya diskini NTFS yoki FAT32 da formatlasangiz, tiklash odatda osonroq.*
:::

## Xulosa

- O'chirish odatda faqat **"bo'sh" belgisini** qo'yadi; mazmun ustiga yozilguncha qoladi.
- Holatlar: yozuv va klasterlar butun — to'liq tiklash; yozuv yo'q — **carving**; ustiga yozilgan — tiklab bo'lmaydi.
- **Savat**: `$I` (metama'lumot, o'chirilgan vaqt) va `$R` (fayl).
- **SSD va TRIM** tiklash imkoniyatini keskin kamaytiradi — lekin izlar (LNK, $UsnJrnl, ShellBags) qoladi.
- **Carving** — magic bytes bo'yicha; nom va vaqtlarsiz.
- **TSK**: `mmls`, `fsstat`, `fls` (`-d` — o'chirilganlar), `icat`, `istat`.
- **Autopsy**: keys → ma'lumot manbasi → ingest modullari (Recent Activity, Hash Lookup/NSRL, Extension Mismatch, Keyword Search, PhotoRec, YARA) → teglar → hisobot; **Timeline**.
- Boshqa manbalar: `pagefile.sys`, `hiberfil.sys`, **Volume Shadow Copies**.
- "Topilmadi" ≠ "bo'lmagan" — hisobotda sabablarni yozing.

:::quiz
? NTFS'da fayl o'chirilib, savat tozalanganda odatda nima bo'ladi?
- Fayl mazmuni darhol nollar bilan ustiga yoziladi
+ $MFT yozuvi “bo'sh” deb belgilanadi, mazmun esa ustiga yozilguncha diskda qoladi
- Disk avtomatik formatlanadi
- Fayl bulutga ko'chadi
! Shuning uchun o'chirilgan fayllar ko'pincha tiklanadi.

? Carving qanday ishlaydi?
+ Diskdan fayl imzolari (magic bytes) bo'yicha mazmunni qidirib, fayllarni tiklaydi
- Fayl tizimini qayta yaratadi
- Faylning asl nomini tiklaydi
- Faqat savatdan ishlaydi
! Carving fayl tizimi ma'lumotisiz ishlaydi, shuning uchun nom va vaqtlar odatda yo'qoladi.

? Nega zamonaviy SSD'dan o'chirilgan fayllarni tiklash ko'pincha muvaffaqiyatsiz bo'ladi?
- SSD'lar fayllarni saqlamaydi
+ TRIM buyrug'i tufayli SSD kerak emas deb belgilangan bloklarni tez fizik tozalaydi
- SSD'lar har doim shifrlangan
- Autopsy SSD'ni o'qiy olmaydi
! Lekin fayl izlari — LNK, $UsnJrnl, ShellBags — baribir qolishi mumkin.

? Savatdagi $I fayli nimani saqlaydi?
- Faylning o'zini
+ Asl yo'l, hajm va o'chirilgan vaqt kabi metama'lumotni
- Foydalanuvchi parolini
- Disk xeshini
! $R faylida esa o'chirilgan faylning o'zi bo'ladi.

? fls -r -d buyrug'i nima qiladi?
- Diskni formatlaydi
+ Tasvirdagi o'chirilgan fayllarni rekursiv ro'yxatlaydi
- Faylni tiklaydi
- Bo'limlar jadvalini ko'rsatadi
! Tiklash uchun icat ishlatiladi; bo'limlar uchun mmls.

? Autopsy'dagi Hash Lookup moduli NSRL bazasi bilan nima uchun foydali?
+ Ma'lum, zararsiz tizim va dastur fayllarini tahlildan chiqarib, noma'lum fayllarga e'tiborni qaratadi
- U parollarni topadi
- U diskni shifrlaydi
- U fayllarni o'chiradi
! Yuz minglab tizim faylini qo'lda ko'rib chiqishning keragi qolmaydi.

? Extension Mismatch Detector qanday fayllarni topadi?
- Juda katta fayllarni
+ Kengaytmasi mazmuniga (magic bytes) mos kelmaydigan fayllarni
- Faqat o'chirilgan fayllarni
- Shifrlangan fayllarni
! Masalan, aslida PNG yoki EXE bo'lgan “hisobot.pdf”.

? Volume Shadow Copies tergovda nima uchun qimmatli?
- Ular parollarni saqlaydi
+ Ular fayllarning eski versiyalarini, ba'zan o'chirilganlarini ham saqlaydi
- Ular tarmoq trafigini yozadi
- Ular faqat ransomware'ni bloklaydi
! Shuning uchun hujumchilar ularni o'chirishga urinadi — bu harakatning o'zi aniqlash belgisi.

? Disk tahlilida biror fayl izi topilmadi. Hisobotda qanday yozish to'g'ri?
- “Fayl hech qachon bo'lmagan”
+ “Iz topilmadi” va mumkin bo'lgan sabablar (TRIM, ustiga yozish, shifrlash, tozalash dasturlari)
- Hech narsa yozmaslik
- “Xodim aybsiz”
! Isbotlanmagan narsani isbotlangan deb yozish mumkin emas — ikkala tomonga ham.

? Autopsy Timeline oynasi nimani ko'rsatadi?
+ Fayl vaqtlari, brauzer tarixi, registr va jurnallardagi hodisalarni yagona vaqt shkalasida
- Faqat disk hajmini
- Faqat rasmlarni
- Tarmoq trafigini
! Bu “shu vaqt oralig'ida nima bo'lgan?” degan savolga javob beradi.
:::

:::cards
Fayl o'chirilganda NTFS'da nima bo'ladi? :: $MFT yozuvi “bo'sh” deb belgilanadi; mazmun klasterlarda ustiga yozilguncha qoladi.
Tiklashning uch holati? :: Yozuv va klasterlar butun — to'liq tiklash; yozuv qayta ishlatilgan — carving; klasterlar ustiga yozilgan — tiklab bo'lmaydi.
Savat fayllari? :: $I — asl yo'l, hajm, o'chirilgan vaqt; $R — faylning o'zi. Joyi: C:\$Recycle.Bin\<SID>\.
TRIM nima? :: SSD'ga kerak bo'lmagan bloklar haqida xabar; SSD ularni tez tozalaydi — o'chirilgan fayllarni tiklash qiyinlashadi.
Carving? :: Fayl tizimisiz, magic bytes bo'yicha mazmunni tiklash (PhotoRec, Foremost, Scalpel); nom va vaqtlar yo'q.
Asosiy magic bytes? :: JPEG FF D8 FF; PNG 89 50 4E 47; PDF 25 50 44 46 (%PDF); ZIP/DOCX 50 4B 03 04 (PK); EXE 4D 5A (MZ).
TSK buyruqlari? :: mmls — bo'limlar; fsstat — fayl tizimi; fls -r -d — o'chirilganlar; icat — mazmunni olish; istat — yozuv tafsilotlari.
Autopsy ish oqimi? :: Keys → ma'lumot manbasi → ingest modullari → natijalar (Data Artifacts, Analysis Results) → teglar → hisobot.
Muhim Autopsy modullari? :: Recent Activity, Hash Lookup (NSRL), File Type, Extension Mismatch, Keyword Search, PhotoRec, YARA, EXIF, Email.
Volume Shadow Copies? :: Windows tiklash nuqtalari — fayllarning eski versiyalari; ransomware ularni o'chirishga urinadi.
pagefile.sys va hiberfil.sys? :: pagefile — diskka chiqarilgan xotira qismlari; hiberfil — uyqu rejimidagi xotira nusxasi.
“Topilmadi” qanday yoziladi? :: “Iz topilmadi” + mumkin bo'lgan sabablar; hech qachon “bo'lmagan” deb emas.
:::
