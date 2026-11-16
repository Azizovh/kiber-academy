Sizga `Shartnoma.pdf` degan fayl keldi. Belgisi PDF'niki, nomi PDF. Ikki marta bosdingiz — va kompyuteringizda zararli dastur ishga tushdi. Qanday qilib?

Javob bu darsda. Fayllar bilan ishlash — eng oddiy ko'nikma bo'lib tuyuladi, lekin aynan shu yerda ko'p hujumlar va ko'p tergov topilmalari yashiringan.

## Fayl nima

Fayl — diskda saqlangan **baytlar ketma-ketligi** va u haqidagi **ma'lumotlar** (metadata):

- nomi;
- hajmi;
- yaratilgan, o'zgartirilgan va oxirgi ochilgan vaqti;
- egasi va [[permissions|ruxsatlari]].

E'tibor bering: fayl nomi va vaqtlari — faylning **ichida emas**, ular alohida saqlanadi. Bu keyinroq muhim bo'ladi.

Diskdagi baytlarni fayl va kataloglarga tartiblaydigan tizim [[file-system|fayl tizimi]] deyiladi:

| Fayl tizimi | Qayerda | Xususiyati |
|---|---|---|
| **NTFS** | Windows | Ruxsatlar, jurnal, katta fayllar |
| **ext4** | Linux | Linux'ning standart tizimi |
| **FAT32** | Fleshkalar, eski qurilmalar | Hamma joyda o'qiladi; fayl 4 GB dan oshmaydi, ruxsatlar yo'q |
| **exFAT** | Fleshka, tashqi disk | FAT32 ning cheklovlarsiz ko'rinishi |
| **APFS** | macOS | Apple'ning zamonaviy tizimi |

## Daraxt va yo'llar

Fayllar kataloglarga (papkalarga), kataloglar boshqa kataloglarga joylanadi — teskari daraxt hosil bo'ladi. Faylning shu daraxtdagi manzili — [[path|yo'l]] (path).

Yo'lning ikki turi bor va ularni farqlash — terminalda ishlashning asosi:

**Mutlaq yo'l** — ildizdan boshlab to'liq manzil. Qayerda turganingizdan qat'i nazar, doim bir xil faylni ko'rsatadi.

```
/home/ali/hujjatlar/reja.txt          ← Linux
C:\Users\Ali\Documents\reja.txt       ← Windows
```

**Nisbiy yo'l** — hozir turgan joyingizga nisbatan. Agar `/home/ali` da tursangiz:

```
hujjatlar/reja.txt
```

Nisbiy yo'lda ikki maxsus belgi ishlatiladi:

| Belgi | Ma'nosi |
|---|---|
| `.` | Hozirgi katalog |
| `..` | Bir pog'ona yuqoridagi (ota) katalog |

`../../etc/passwd` — "ikki pog'ona yuqoriga chiq, keyin `etc` ga kir, `passwd` faylini ol". Bu yozuvni eslab qoling: web xavfsizligida **path traversal** degan zaiflik aynan shunga asoslangan — hujumchi `..` yordamida ruxsat berilgan papkadan tashqariga "chiqib ketadi".

## Windows va Linux: ikki xil dunyo

| | Windows | Linux |
|---|---|---|
| Ildiz | Har disk alohida: `C:\`, `D:\` | Bitta ildiz: `/` |
| Ajratuvchi | `\` (teskari slesh) | `/` (slesh) |
| Katta-kichik harf | Farqlamaydi: `Reja.txt` = `reja.txt` | **Farqlaydi**: bular ikki xil fayl |
| Yashirin fayl | "Hidden" atributi | Nomi nuqta bilan boshlanadi: `.bashrc` |
| Foydalanuvchi papkasi | `C:\Users\Ali` | `/home/ali` |
| Tizim fayllari | `C:\Windows\System32` | `/bin`, `/etc`, `/usr` |
| Dasturlar | `C:\Program Files` | `/usr/bin`, `/opt` |
| Vaqtinchalik fayllar | `C:\Users\Ali\AppData\Local\Temp` | `/tmp` |

Linux'da fleshka yoki ikkinchi disk alohida harf olmaydi — u daraxtning biror katalogiga "ulanadi" (mount), masalan `/media/usb`.

Linux'ning asosiy kataloglarini hoziroq tanib oling — 3-bosqichda ular bilan har kuni ishlaysiz:

| Katalog | Nima bor |
|---|---|
| `/home` | Foydalanuvchilarning shaxsiy papkalari |
| `/root` | root foydalanuvchining uyi |
| `/etc` | Tizim va dasturlar sozlamalari |
| `/var/log` | Jurnallar (loglar) |
| `/tmp` | Vaqtinchalik fayllar — hamma yoza oladi |
| `/bin`, `/usr/bin` | Dasturlar |

:::info
`/tmp` va Windows'dagi `Temp` — hujumchilarning sevimli joyi: u yerga har qanday foydalanuvchi yoza oladi. Zararli fayllar ko'pincha aynan shu yerga tushadi. Tergovda birinchi qaraladigan joylardan biri.
:::

## Kengaytma aldaydi

Endi dars boshidagi savolga qaytamiz.

Fayl nomining oxiridagi `.pdf`, `.jpg`, `.exe` — **kengaytma**. Windows unga qarab faylni qaysi dastur bilan ochishni va qanday belgi ko'rsatishni hal qiladi.

Lekin kengaytma — **shunchaki nomning bir qismi**. Uni istalgan odam istalgan narsaga o'zgartirishi mumkin. Rasmni `rasm.txt` deb atasangiz, u matnga aylanmaydi — baytlar o'sha-o'sha.

### Sehrli baytlar

Faylning haqiqiy turi uning **ichida**, eng boshida yozilgan. Ko'pchilik formatlar aniq, o'zgarmas baytlar bilan boshlanadi — bular [[magic-bytes|sehrli baytlar]] (magic bytes) yoki **fayl imzosi** deyiladi.

| Fayl turi | Boshidagi baytlar (hex) | Matn ko'rinishi |
|---|---|---|
| PNG | `89 50 4E 47 0D 0A 1A 0A` | `.PNG....` |
| JPEG | `FF D8 FF` | — |
| PDF | `25 50 44 46` | `%PDF` |
| ZIP (va DOCX, XLSX, APK) | `50 4B 03 04` | `PK..` |
| Windows dasturi (EXE, DLL) | `4D 5A` | `MZ` |
| Linux dasturi (ELF) | `7F 45 4C 46` | `.ELF` |
| GIF | `47 49 46 38` | `GIF8` |

Oldingi darslar shu yerda birlashadi: `50 4B` — ASCII jadvalida `P` va `K`. Hex va ASCII'ni bilganingiz uchun endi fayl boshini **o'qiy olasiz**.

Qiziq fakt: DOCX, XLSX va APK fayllari aslida ZIP arxivlar. Kengaytmasini `.zip` ga o'zgartirib, ichini ochib ko'rish mumkin.

Linux'da `file` buyrug'i aynan shu baytlarga qarab fayl turini aytadi — kengaytmaga umuman e'tibor bermaydi:

```bash
$ file hisobot.pdf
hisobot.pdf: PE32+ executable (GUI) x86-64, for MS Windows
```

"PDF" aslida Windows dasturi ekan.

### Hujumchilar buni qanday ishlatadi

**Ikki kengaytma.** Fayl `Shartnoma.pdf.exe` deb nomlanadi. Windows standart sozlamada ma'lum kengaytmalarni **yashiradi** — foydalanuvchi faqat `Shartnoma.pdf` ni ko'radi. Hujumchi faylga PDF belgisini ham qo'yib qo'yadi. Ikki marta bosish — dasturni ishga tushirish.

**Soxta kengaytma.** Veb-sayt faqat rasm yuklashga ruxsat beradi va kengaytmani tekshiradi. Hujumchi zararli skriptni `rasm.jpg` deb nomlaydi yoki boshiga rasm imzosini qo'shib qo'yadi.

:::tip
Windows'da kengaytmalarni doim ko'rinadigan qiling: **File Explorer → View → Show → File name extensions**. Xavfsizlik bilan shug'ullanadigan odamning kompyuterida bu birinchi kundan yoqilgan bo'lishi kerak.
:::

## Yashirin fayllar

Yashirin fayl — himoyalangan fayl emas. U shunchaki standart ro'yxatda ko'rsatilmaydi.

- **Linux:** nuqta bilan boshlanadigan har qanday fayl yashirin. `ls` ko'rsatmaydi, `ls -a` ko'rsatadi.
- **Windows:** "Hidden" atributi. Explorer'da **Show → Hidden items**, terminalda `dir /a`.

Sozlamalar fayllari odatda yashirin (`.bashrc`, `.ssh/`). Hujumchilar ham o'z fayllarini shu yo'l bilan ko'zdan yashiradi — shuning uchun mutaxassis **doim yashirin fayllarni ham ko'radi**.

## Metadata — fayl haqidagi fayl

Fayl ichidagi asosiy ma'lumotdan tashqari, ko'p formatlar qo'shimcha ma'lumot saqlaydi:

- **Rasmlar (EXIF):** kamera modeli, suratga olingan vaqt, ba'zan GPS koordinatalari.
- **Ofis hujjatlari:** muallif ismi, kompaniya, tahrirlar tarixi, kompyuter nomi.
- **PDF:** qaysi dasturda yaratilgani, muallif.

Razvedkada bu — oltin kon: kompaniya saytidagi hujjatlardan xodimlarning ismlari, foydalanuvchi nomlari va ishlatiladigan dasturlar versiyalarini bilib olish mumkin. Himoya tomonida esa — hujjatni e'lon qilishdan oldin metadatani tozalash kerakligini bildiradi.

## O'chirish — yo'q qilish emas

Birinchi darsdan eslaysiz: faylni o'chirganingizda fayl tizimi faqat "bu joy bo'sh" deb belgilaydi. Baytlar joyida qoladi — ustiga boshqa narsa yozilmaguncha.

Bu ikki tomonlama qilich:

- **Tergovchi uchun** — imkoniyat: gumonlanuvchi o'chirgan fayllarni tiklash mumkin.
- **Himoyachi uchun** — xavf: eski diskni tashlab yuborish yoki sotish oldidan uni maxsus tozalash (ustiga yozish) yoki boshidanoq shifrlash kerak.

## Amaliyot

Endi fayl tizimida terminal orqali yurib ko'ring — yashirin fayl ham bor:

:::lab terminal-birinchi-qadam

## Xulosa

- Fayl — baytlar + metadata; fayl tizimi ularni tartiblaydi (NTFS, ext4, FAT32).
- **Mutlaq yo'l** ildizdan boshlanadi; **nisbiy yo'l** — hozirgi joydan. `..` — bir pog'ona yuqori.
- Windows: `C:\`, `\`, harf farqlanmaydi. Linux: `/`, harf **farqlanadi**.
- **Kengaytma — shunchaki nom.** Haqiqiy turni **sehrli baytlar** belgilaydi.
- Ikki kengaytma (`.pdf.exe`) — klassik aldov; kengaytmalarni doim ko'rinadigan qiling.
- Yashirin ≠ himoyalangan.
- Metadata ko'p narsani oshkor qiladi; o'chirilgan fayl tiklanishi mumkin.

:::quiz
? Siz `/home/ali/loyiha` katalogida turibsiz. `../hujjatlar/reja.txt` nisbiy yo'li qaysi faylni ko'rsatadi?
- /home/ali/loyiha/hujjatlar/reja.txt
+ /home/ali/hujjatlar/reja.txt
- /home/hujjatlar/reja.txt
- /hujjatlar/reja.txt
! `..` bir pog'ona yuqoriga — `/home/ali` ga chiqaradi. Keyin `hujjatlar/reja.txt` qo'shiladi.

? `hisobot.pdf` nomli faylning birinchi baytlari `4D 5A`. Bu aslida qanday fayl?
- PDF hujjat
- ZIP arxiv
+ Windows bajariladigan dasturi (EXE)
- PNG rasm
! `4D 5A` — ASCII'da “MZ”, Windows dasturlarining imzosi. PDF `25 50 44 46` (%PDF) bilan boshlanishi kerak edi.

? Nega `Shartnoma.pdf.exe` nomli fayl xavfli?
- Chunki PDF fayllar doim xavfli
+ Chunki Windows kengaytmani yashirsa, foydalanuvchi faqat `Shartnoma.pdf` ni ko'radi va uni hujjat deb o'ylaydi
- Chunki ikki kengaytmali faylni ochib bo'lmaydi
- Chunki u juda katta joy egallaydi
! Haqiqiy kengaytma — oxirgisi (.exe). Windows standart holatda ma'lum kengaytmalarni yashiradi, natijada dastur hujjatga o'xshab ko'rinadi.

? Linux'da `Reja.txt` va `reja.txt` haqida qaysi gap to'g'ri?
- Bu bitta fayl
+ Bular ikki xil fayl, chunki Linux katta-kichik harfni farqlaydi
- Ikkinchisi yashirin fayl
- Bunday nom berish mumkin emas
! Linux fayl nomlarida katta-kichik harf farqlanadi. Windows'da esa bular bir xil nom hisoblanadi.

? Linux'da faylni yashirin qilish uchun nima kerak?
- Maxsus parol o'rnatish
- Faylni shifrlash
+ Nomini nuqta bilan boshlash
- Uni /tmp katalogiga ko'chirish
! Nuqta bilan boshlanadigan fayllar oddiy `ls` da ko'rinmaydi, `ls -a` da ko'rinadi. Bu himoya emas — shunchaki ko'rsatmaslik.

? Kompaniya saytidagi PDF va Word hujjatlar metadatasidan hujumchi nimalarni bilib olishi mumkin?
+ Xodimlarning ismlari va foydalanuvchi nomlarini
+ Ishlatilgan dasturlar va ularning versiyalarini
- Kompaniya serverining root parolini
- Xodimlarning bank kartasi raqamlarini
! Hujjat metadatasida muallif, kompyuter nomi va dastur versiyasi saqlanadi. Bu razvedka uchun qimmatli, lekin parol yoki karta raqami u yerda bo'lmaydi.

? DOCX fayl aslida nima?
- Shifrlangan matn fayli
+ Ichida XML fayllar bo'lgan ZIP arxiv
- Bajariladigan dastur
- Rasm formati
! DOCX, XLSX, APK — hammasi `50 4B` (PK) imzoli ZIP arxivlar. Ularni arxivator bilan ochib, ichini ko'rish mumkin.
:::

:::cards
Mutlaq va nisbiy yo'l farqi? :: Mutlaq — ildizdan boshlanadigan to'liq manzil (/home/ali/a.txt). Nisbiy — hozirgi katalogga nisbatan (hujjatlar/a.txt).
Yo'ldagi . va .. nimani bildiradi? :: . — hozirgi katalog; .. — bir pog'ona yuqoridagi (ota) katalog.
Magic bytes (sehrli baytlar) nima? :: Fayl boshidagi, uning haqiqiy turini bildiradigan o'zgarmas baytlar. Kengaytmadan farqli o'laroq, turni aynan ular belgilaydi.
PDF, ZIP va Windows EXE fayllar qanday boshlanadi? :: PDF — 25 50 44 46 (%PDF). ZIP — 50 4B (PK). EXE — 4D 5A (MZ).
PNG fayl imzosi? :: 89 50 4E 47 (ikkinchi–to'rtinchi baytlar — “PNG”).
Linux'da yashirin fayl qanday yaratiladi va ko'riladi? :: Nomi nuqta bilan boshlanadi (.maxfiy). Ko'rish: ls -a
Windows va Linux fayl yo'llarining asosiy farqlari? :: Windows: C:\ kabi disk harflari, \ ajratuvchi, harf farqlanmaydi. Linux: yagona / ildiz, / ajratuvchi, harf farqlanadi.
Linux'da /etc, /var/log va /tmp da nima bor? :: /etc — sozlamalar; /var/log — jurnallar; /tmp — hamma yoza oladigan vaqtinchalik fayllar.
:::
