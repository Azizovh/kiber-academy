Tergovchi so'raydi: "`svchost.exe` ni AppData papkasidan **ishga tushirilgan**ligini isbotlay olasizmi? Qachon? Necha marta? Va shu kompyuterga oxirgi hafta qanday USB qurilmalar ulangan?"

Sysmon yo'q edi. EDR o'rnatilmagan edi. Security jurnali ikki kunlik — undan oldingisi ustiga yozilgan. Javob yo'qmi?

Bor. Windows o'z ishini osonlashtirish uchun juda ko'p narsani **eslab qoladi**: dasturlarni tezroq ochish uchun, oxirgi ochilgan hujjatlarni ko'rsatish uchun, qurilmalarni tanish uchun. Bu "xotira" — forensika tahlilchisi uchun oltin koni. Bu izlarni [[artifact|artefaktlar]] deyiladi.

## Asosiy savollar va artefaktlar

Windows forensikasi odatda bir nechta savolga javob qidiradi. Har biri uchun bir nechta artefakt bor — va yaxshi tahlilchi doim **bir nechtasini** solishtiradi:

| Savol | Artefaktlar |
|---|---|
| **Dastur ishga tushganmi?** | Prefetch, Amcache, BAM, UserAssist, SRUM, jurnallar (4688, Sysmon 1) |
| **Fayl yoki papka ochilganmi?** | LNK fayllar, Jump Lists, ShellBags, RecentDocs |
| **Fayl qachon yaratilgan, o'zgartirilgan?** | `$MFT`, `$UsnJrnl` |
| **Qaysi USB ulangan?** | Registr (USBSTOR, MountedDevices), `setupapi.dev.log`, jurnallar |
| **Qanday tarmoq faoliyati?** | SRUM, jurnallar, brauzer tarixi |
| **Kim kirgan?** | Security jurnali (b1 bosqichi), SAM, profil papkalari |
| **Persistence bormi?** | Run kalitlari, xizmatlar, vazifalar (b1 bosqichi) |

## Registr — Windows'ning ma'lumotlar bazasi

Kompyuter bosqichida [[registry|registr]] bilan tanishgansiz. Forensikada u asosiy manbalardan biri. Registr diskda bir nechta faylda (**hive**) saqlanadi:

| Hive | Joylashuvi | Nimani saqlaydi |
|---|---|---|
| **SYSTEM** | `C:\Windows\System32\config\` | Qurilmalar (USB), xizmatlar, kompyuter nomi, vaqt mintaqasi, BAM |
| **SOFTWARE** | `C:\Windows\System32\config\` | O'rnatilgan dasturlar, tarmoq profillari, OS versiyasi |
| **SAM** | `C:\Windows\System32\config\` | Lokal foydalanuvchilar, oxirgi kirish, kirishlar soni |
| **SECURITY** | `C:\Windows\System32\config\` | Xavfsizlik siyosatlari |
| **NTUSER.DAT** | `C:\Users\<foydalanuvchi>\` | Foydalanuvchi faoliyati: UserAssist, RecentDocs, RunMRU, TypedPaths |
| **UsrClass.dat** | `C:\Users\<foydalanuvchi>\AppData\Local\Microsoft\Windows\` | ShellBags |
| **Amcache.hve** | `C:\Windows\AppCompat\Programs\` | Ishga tushgan va mavjud dasturlar, SHA-1 xeshlari bilan |

Ishlab turgan tizimda bu fayllar qulflangan — ularni oddiy nusxalab bo'lmaydi. Shuning uchun ular disk tasviridan yoki maxsus vositalar (KAPE, FTK Imager) bilan olinadi. Har bir hive yonida `.LOG1`, `.LOG2` tranzaksiya fayllari bor — ularni ham oling: so'nggi o'zgarishlar ko'pincha hali asosiy faylga yozilmagan bo'ladi.

Har bir registr kalitining **LastWrite** vaqti bor — kalit oxirgi marta qachon o'zgargan. Bu ko'p artefaktlarda "qachon?" savoliga javob beradi.

### Birinchi qadam: tizim haqida asosiy ma'lumot

Tahlilni boshlashdan oldin kontekstni bilib oling — ayniqsa **vaqt mintaqasini**:

| Ma'lumot | Kalit |
|---|---|
| Kompyuter nomi | `SYSTEM\ControlSet001\Control\ComputerName\ComputerName` |
| Vaqt mintaqasi | `SYSTEM\ControlSet001\Control\TimeZoneInformation` |
| OS versiyasi | `SOFTWARE\Microsoft\Windows NT\CurrentVersion` |
| Oxirgi o'chirilish | `SYSTEM\ControlSet001\Control\Windows` (ShutdownTime) |
| Tarmoq interfeyslari | `SYSTEM\ControlSet001\Services\Tcpip\Parameters\Interfaces` |

Diskdan o'qilganda `CurrentControlSet` bo'lmaydi — u faqat ishlab turgan tizimda mavjud. Qaysi `ControlSet00X` faol ekanini `SYSTEM\Select` kaliti aytadi.

## Dastur ishga tushganini isbotlash

Dars boshidagi savol. Javob — bir nechta mustaqil artefakt.

### Prefetch

Windows dasturlarni tezroq ochish uchun ular haqida ma'lumotni [[prefetch|Prefetch]] fayllarida saqlaydi:

```
C:\Windows\Prefetch\SVCHOST.EXE-1A2B3C4D.pf
                    └ nom ─┘ └ yo'l xeshi┘
```

| Prefetch nimani beradi | Izoh |
|---|---|
| Dastur nomi | Fayl nomida |
| **Ishga tushishlar soni** | Necha marta |
| **Oxirgi ishga tushish vaqtlari** | Windows 8 dan beri — oxirgi 8 tasi |
| Birinchi ishga tushish (taxminan) | Fayl yaratilgan vaqt |
| Dastur yuklagan fayllar va papkalar | Qayerdan ishga tushgani, qaysi fayllar bilan ishlagani |

Nom oxiridagi xesh **to'liq yo'ldan** hisoblanadi. Shuning uchun `System32\svchost.exe` va `AppData\Roaming\svchost.exe` turli Prefetch fayllarga ega bo'ladi — Sysmon darsidagi niqoblanishni Prefetch ham ko'rsatadi.

Cheklovlar: Prefetch Windows serverlarida standart holatda ko'pincha **o'chirilgan**; fayllar soni cheklangan (eskilari o'chadi); hujumchi papkani tozalashi mumkin.

### Amcache

`Amcache.hve` — Windows'ning dasturlar muvofiqligi bazasi. Unda bajariladigan fayllar haqida yo'l, hajm, kompilyatsiya vaqti va — eng muhimi — **SHA-1 xeshi** saqlanadi. Fayl o'chirilgan bo'lsa ham, uning xeshi Amcache'da qolishi mumkin — tahdid razvedkasi darsidagi kabi xesh bo'yicha qidirasiz.

Ehtiyot bo'ling: Amcache'dagi yozuv faylning tizimda **mavjud bo'lganini** ko'rsatadi; bu har doim ham **ishga tushganini** isbotlamaydi. Boshqa artefaktlar bilan tasdiqlang.

### BAM, UserAssist va boshqalar

| Artefakt | Joylashuvi | Nimani beradi |
|---|---|---|
| **BAM** (Background Activity Moderator) | `SYSTEM\...\Services\bam\State\UserSettings\<SID>` | Har bir foydalanuvchi uchun dastur yo'li va **oxirgi ishga tushish vaqti** (Windows 10+) |
| **UserAssist** | `NTUSER.DAT\...\Explorer\UserAssist` | Foydalanuvchi grafik interfeys orqali ochgan dasturlar, soni, oxirgi vaqt; nomlar ROT13 bilan "kodlangan" |
| **ShimCache** (AppCompatCache) | `SYSTEM\...\Control\Session Manager\AppCompatCache` | Tizim "ko'rgan" bajariladigan fayllar — yangi Windows'da ishga tushganining isboti emas |
| **SRUM** | `C:\Windows\System32\sru\SRUDB.dat` | Har bir dasturning resurs sarfi, **tarmoq orqali yuborgan va olgan baytlari** — taxminan oxirgi 30–60 kun |
| **RunMRU** | `NTUSER.DAT\...\Explorer\RunMRU` | `Win + R` oynasiga kiritilgan buyruqlar |

SRUM alohida e'tiborga loyiq: trafik tahlili darsidagi "yuborilgan > olingan" savoliga **qurilmaning o'zida** javob beradi — qaysi dastur qancha ma'lumot yuborgan, hatto PCAP bo'lmasa ham.

### Bir nechta artefaktni birlashtirish

```
Savol: AppData\Roaming\svchost.exe ishga tushganmi?

Prefetch:  SVCHOST.EXE-<boshqa xesh>.pf — 14 marta, birinchisi 2026-11-16 09:32:17
Amcache:   C:\Users\d.karimova\AppData\Roaming\svchost.exe, SHA-1: ..., imzosiz
BAM:       d.karimova SID ostida, oxirgi ishga tushish 2026-11-18 08:01:44
SRUM:      svchost.exe (AppData) — 2026-11-16 dan beri 14,2 MB yuborgan
Registr:   NTUSER.DAT\...\Run\Updater → shu fayl (LastWrite 09:32:18)

Xulosa: yuqori ishonch bilan — fayl 16-noyabr 09:32 da birinchi marta ishga tushgan,
Run kaliti orqali har kirishda qayta ishga tushgan va ma'lumot yuborgan.
```

To'rt mustaqil artefakt bitta hikoyani aytadi — va b1 bosqichidagi tarmoq tahlili bilan mos keladi. Bitta artefakt — gumon; bir nechtasi — dalil.

:::key
**Har bir artefakt nimani isbotlaydi va nimani isbotlamaydi — buni aniq biling.** Amcache va ShimCache faylning mavjudligini ko'rsatadi; Prefetch va BAM — ishga tushganini; UserAssist — foydalanuvchi grafik interfeys orqali ochganini. Vaqtlar ham turlicha: ba'zilari birinchi ishga tushishni, ba'zilari oxirgisini, ba'zilari registr kaliti o'zgargan vaqtni bildiradi. "Amcache'da bor — demak ishga tushgan" degan xulosa sudda yoki hisobotda sizni noqulay ahvolga solishi mumkin. 13Cubed va SANS plakatlari har bir artefaktning aniq ma'nosini ko'rsatadi.
:::

## Fayl va papkalarga murojaat

| Artefakt | Joylashuvi | Nimani beradi |
|---|---|---|
| **LNK fayllar** | `C:\Users\<u>\AppData\Roaming\Microsoft\Windows\Recent\` | Ochilgan fayl yo'li, uning vaqtlari, hajmi, **disk seriya raqami** (USB'dan ochilganmi?) |
| **Jump Lists** | `...\Recent\AutomaticDestinations\` | Har bir dastur uchun oxirgi ochilgan fayllar |
| **ShellBags** | `UsrClass.dat`, `NTUSER.DAT` | Explorer'da ochilgan **papkalar** — o'chirilgan yoki USB'dagi papkalar ham |
| **RecentDocs** | `NTUSER.DAT\...\Explorer\RecentDocs` | Oxirgi ochilgan hujjatlar, kengaytma bo'yicha |
| **TypedPaths** | `NTUSER.DAT\...\Explorer\TypedPaths` | Explorer manzil qatoriga yozilgan yo'llar |

LNK fayl, ayniqsa, qimmatli: foydalanuvchi faylni ochganda yaratiladi va asl fayl o'chirilgandan keyin ham qoladi. Ichida faylning to'liq yo'li va qaysi diskda bo'lgani yozilgan — "xodim maxfiy hujjatni USB'dan ochganmi?" degan savolga javob.

## NTFS: MFT va vaqtlar

NTFS fayl tizimidagi har bir fayl haqidagi ma'lumot [[mft|`$MFT`]] (Master File Table) da saqlanadi: nom, hajm, joylashuv va **vaqtlar**.

Har bir faylning to'rtta asosiy vaqti bor — **MACB**:

| Harf | Vaqt | Qachon o'zgaradi |
|---|---|---|
| **M** | Modified | Fayl mazmuni o'zgarganda |
| **A** | Accessed | Faylga murojaat qilinganda (yangi Windows'da ko'pincha yangilanmaydi) |
| **C** | Changed ($MFT) | Fayl yozuvi (metama'lumot) o'zgarganda |
| **B** | Born | Fayl yaratilganda |

Va bu vaqtlar **ikki joyda** saqlanadi:

| Atribut | Kim o'zgartira oladi |
|---|---|
| `$STANDARD_INFORMATION` ($SI) | Oddiy dasturlar ham (Windows API orqali) — Explorer shuni ko'rsatadi |
| `$FILE_NAME` ($FN) | Asosan faqat Windows yadrosi |

Bu farq **timestomping**ni (vaqtlarni soxtalashtirish) aniqlashga yordam beradi. Hujumchi zararli faylining vaqtini "2019-yil" qilib qo'yishi mumkin — u Explorer'da eski, zararsiz fayldek ko'rinadi. Lekin agar $SI vaqti $FN vaqtidan **oldin** bo'lsa, yoki vaqtlarda soniya kasrlari aniq nol bo'lsa — bu shubhali.

**`$UsnJrnl`** (Change Journal) — fayl tizimidagi har bir o'zgarishning jurnali: yaratildi, nomi o'zgardi, o'chirildi. Fayl o'chirilgan va $MFT yozuvi qayta ishlatilgan bo'lsa ham, jurnalda "bu nomli fayl shu vaqtda yaratilgan va shu vaqtda o'chirilgan" degan iz qolishi mumkin.

## USB qurilmalar tarixi

"Kompaniya ma'lumotlarini USB'ga ko'chirib ketganmi?" — ichki tergovlarning eng ko'p savollaridan biri.

| Manba | Nimani beradi |
|---|---|
| `SYSTEM\...\Enum\USBSTOR` | Ishlab chiqaruvchi, model, **seriya raqami** |
| `SYSTEM\MountedDevices` | Qurilmaga berilgan disk harfi |
| `SOFTWARE\Microsoft\Windows Portable Devices\Devices` | Qurilmaning foydalanuvchiga ko'ringan nomi (disk yorlig'i) |
| `NTUSER.DAT\...\Explorer\MountPoints2` | **Qaysi foydalanuvchi** qurilmani ishlatgan |
| `C:\Windows\INF\setupapi.dev.log` | Qurilma **birinchi marta** ulangan vaqt |
| Jurnallar (masalan, `Microsoft-Windows-Partition/Diagnostic`) | Ulanish va uzilish vaqtlari (versiyaga qarab) |

Keyin LNK fayllar va ShellBags bilan solishtirasiz: shu seriya raqamli qurilmadan qaysi fayllar va papkalar ochilgan? Natijada hikoya chiqadi: "Seriya raqami X bo'lgan USB 16-noyabr 18:42 da `a.yusupov` sessiyasida ulangan, E: harfi berilgan, 18:44 da `E:\Mijozlar_2026.xlsx` ochilgan."

## Eric Zimmerman vositalari

Bu artefaktlarni qo'lda o'qish deyarli imkonsiz: ular binar formatda. Sohada standartga aylangan bepul vositalar to'plami bor — **Eric Zimmerman tools** (EZ Tools):

| Vosita | Nima uchun |
|---|---|
| **Registry Explorer** / **RECmd** | Registr hive'larini ko'rish va qidirish (tranzaksiya loglarini ham hisobga oladi) |
| **PECmd** | Prefetch |
| **AmcacheParser** | Amcache |
| **AppCompatCacheParser** | ShimCache |
| **LECmd** / **JLECmd** | LNK fayllar / Jump Lists |
| **SBECmd** / **ShellBags Explorer** | ShellBags |
| **MFTECmd** | `$MFT`, `$UsnJrnl` va boshqa NTFS fayllari |
| **EvtxECmd** | `.evtx` jurnallar |
| **SrumECmd** | SRUM |
| **Timeline Explorer** | Barcha CSV natijalarni ko'rish, filtrlash va saralash |

Ularning ko'pi bir xil ishlaydi: kirish fayli yoki papkasi → CSV natija:

```powershell
# Prefetch papkasini tahlil qilish (triage yig'ilgan nusxadan)
PECmd.exe -d C:\Case01\Prefetch --csv C:\Case01\Natija

# Amcache
AmcacheParser.exe -f C:\Case01\Amcache.hve --csv C:\Case01\Natija

# MFT
MFTECmd.exe -f "C:\Case01\$MFT" --csv C:\Case01\Natija

# Barcha jurnallar
EvtxECmd.exe -d C:\Case01\Logs --csv C:\Case01\Natija
```

Keyin CSV fayllarni **Timeline Explorer**'da ochasiz — xuddi Excel'dek, lekin millionlab qator uchun va qulay filtrlar bilan. Dalil yig'ish darsidagi **KAPE** ham shu vositalarni avtomatik ishga tushira oladi: yig'ish va tahlil bitta buyruqda.

:::warn
**Vaqt mintaqasi — Windows forensikasidagi eng klassik tuzoq.** Ba'zi artefaktlar UTC'da saqlanadi, ba'zilari mahalliy vaqtda; vositalar odatda UTC'da ko'rsatadi; foydalanuvchi esa "soat 6 larda" deydi va mahalliy vaqtni nazarda tutadi. Tahlil boshida tizimning vaqt mintaqasini registrdan aniqlang, hamma narsani UTC'da yuriting va hisobotda buni aniq yozing. b1 bosqichidagi triage va Linux loglari darslaridagi ogohlantirish bu yerda ham amal qiladi.
:::

## Windows forensikasi nimani qilmaydi

- **Har bir artefakt har doim mavjud emas** — sozlamalar, Windows versiyasi va tozalash dasturlari ularni o'chirishi yoki yaratilishiga yo'l qo'ymasligi mumkin.
- **Artefaktlar o'zgartirilishi mumkin** — timestomping, registrni tozalash, Prefetch'ni o'chirish; shuning uchun bir nechta manba solishtiriladi.
- **"Kim" savoliga har doim javob bermaydi** — artefakt hisobni ko'rsatadi, klaviatura oldida o'tirgan odamni emas.
- **Talqin talab qiladi** — xom vaqt belgisi emas, uning ma'nosi muhim.

:::try
**1. O'z kompyuteringizda (faqat o'qish).** Eric Zimmerman vositalarini rasmiy saytdan yuklab oling. Administrator sifatida PowerShell'da:

```powershell
PECmd.exe -d C:\Windows\Prefetch --csv C:\EZ-natija
```

Natijani Timeline Explorer'da oching. Brauzeringiz necha marta ishga tushgan? Oxirgi 8 ta vaqt qaysi? Siz tanimagan dastur bormi?

**2. Registry Explorer.** O'z kompyuteringizning hive'larini ochish uchun ularni avval nusxalash kerak (qulflangan) — buning o'rniga TryHackMe'dagi "Windows Forensics 1" xonasining tayyor fayllaridan foydalaning. Toping: kompyuter nomi, vaqt mintaqasi, oxirgi ulangan USB qurilmaning seriya raqami.

**3. Mantiq.** Quyidagi artefaktlardan qaysi biri dasturning **ishga tushganini** eng ishonchli isbotlaydi va nega? (a) Amcache yozuvi; (b) Prefetch fayli 3 ta ishga tushish vaqti bilan; (c) ShimCache yozuvi.

**4. TryHackMe** — "Windows Forensics 1" va "Windows Forensics 2" xonalarini bajaring. 13Cubed YouTube kanalidagi "Introduction to Windows Forensics" seriyasini ko'ring.

*Javoblar: 3 — (b): Prefetch ishga tushish soni va vaqtlarini saqlaydi; Amcache va ShimCache asosan faylning mavjudligini ko'rsatadi. Eng yaxshisi — bir nechtasini birgalikda.*
:::

## Xulosa

- Windows ko'p narsani **eslab qoladi** — bu izlar (artefaktlar) tergovning asosiy manbai; doim **bir nechtasini** solishtiring.
- Registr hive'lari: **SYSTEM, SOFTWARE, SAM, SECURITY** (`System32\config`), **NTUSER.DAT**, **UsrClass.dat**, **Amcache.hve**; tranzaksiya loglarini ham oling; boshida vaqt mintaqasini aniqlang.
- Ishga tushish: **Prefetch** (soni, oxirgi 8 vaqt, yo'l xeshi), **BAM**, **UserAssist**, **SRUM** (tarmoq baytlari); mavjudlik: **Amcache** (SHA-1), **ShimCache**.
- Fayl va papkalar: **LNK, Jump Lists, ShellBags, RecentDocs**.
- NTFS: **$MFT** va **MACB** vaqtlari; **$SI va $FN** farqi — timestomping belgisi; **$UsnJrnl** — o'zgarishlar jurnali.
- USB: **USBSTOR** (seriya), MountedDevices, MountPoints2 (foydalanuvchi), `setupapi.dev.log` (birinchi ulanish) + LNK.
- **Eric Zimmerman vositalari** → CSV → **Timeline Explorer**; KAPE bilan avtomatlashtiriladi.

:::quiz
? Foydalanuvchi faoliyati (UserAssist, RecentDocs) qaysi registr faylida saqlanadi?
- SAM
- SYSTEM
+ NTUSER.DAT
- SECURITY
! NTUSER.DAT har bir foydalanuvchining profil papkasida joylashgan.

? Prefetch fayli nimani ko'rsatadi?
+ Dastur nomi, ishga tushishlar soni va oxirgi ishga tushish vaqtlari
- Faqat faylning hajmini
- Foydalanuvchi parolini
- Tarmoq trafigi mazmunini
! Windows 8 dan beri Prefetch oxirgi 8 ta ishga tushish vaqtini saqlaydi.

? Nega System32\svchost.exe va AppData\svchost.exe turli Prefetch fayllariga ega bo'ladi?
- Ular turli hajmda
+ Prefetch fayl nomidagi xesh dasturning to'liq yo'lidan hisoblanadi
- Windows xato qiladi
- Bittasi har doim o'chiriladi
! Shuning uchun Prefetch niqoblanishni ham ko'rsatishi mumkin.

? Amcache'da fayl yozuvi bor. Qaysi xulosa eng ehtiyotkor va to'g'ri?
- Fayl albatta ishga tushgan
+ Fayl tizimda mavjud bo'lgan; ishga tushganini boshqa artefaktlar bilan tasdiqlash kerak
- Fayl albatta zararli
- Fayl hech qachon bo'lmagan
! Amcache asosan mavjudlikni va SHA-1 xeshni beradi.

? SRUM nima uchun ayniqsa qimmatli?
- U parollarni saqlaydi
+ U har bir dastur tarmoq orqali qancha bayt yuborgan va olganini ko'rsatadi — PCAP bo'lmasa ham
- U faqat xatolarni yozadi
- U USB qurilmalarni bloklaydi
! Ma'lumot olib chiqilishi savoliga qurilmaning o'zida javob beradi.

? Timestomping nima va uni qanday aniqlash mumkin?
- Diskni formatlash; MFT orqali
+ Fayl vaqtlarini soxtalashtirish; $STANDARD_INFORMATION vaqtining $FILE_NAME vaqtidan oldin bo'lishi kabi nomuvofiqliklar orqali
- Parolni o'zgartirish; SAM orqali
- Tarmoqni uzish; SRUM orqali
! $SI ni oddiy dasturlar o'zgartira oladi, $FN ni asosan yadro yozadi — farq shubha uyg'otadi.

? USB qurilmaning seriya raqamini qayerdan topish mumkin?
+ SYSTEM hive'idagi USBSTOR kalitidan
- SAM hive'idan
- Prefetch papkasidan
- Brauzer tarixidan
! Seriya raqami keyin LNK fayllar va MountPoints2 bilan solishtiriladi.

? Qaysi artefakt USB qurilmani qaysi foydalanuvchi ishlatganini ko'rsatadi?
- USBSTOR
+ NTUSER.DAT dagi MountPoints2
- setupapi.dev.log
- Amcache
! MountPoints2 foydalanuvchining shaxsiy registr faylida bo'ladi.

? LNK fayllar nega forensikada qimmatli?
- Ular dasturlarni tezlashtiradi
+ Ular ochilgan faylning yo'li, vaqtlari va qaysi diskda (masalan, USB) bo'lganini saqlaydi — asl fayl o'chirilgandan keyin ham
- Ular parollarni saqlaydi
- Ular faqat ish stolidagi yorliqlar
! LNK fayllar foydalanuvchi faylni ochganda avtomatik yaratiladi.

? Disk tasvirida CurrentControlSet kaliti yo'q. Nima qilish kerak?
- Tahlilni to'xtatish
+ SYSTEM\Select kalitidan qaysi ControlSet00X faol ekanini aniqlash
- Registrni qayta o'rnatish
- Kompyuterni yoqish
! CurrentControlSet faqat ishlab turgan tizimdagi havola; diskda haqiqiy ControlSet001/002 bo'ladi.

? Eric Zimmerman vositalarining odatiy ish oqimi qanday?
+ Artefakt fayli yoki papkasi → vosita (masalan, PECmd) → CSV → Timeline Explorer'da tahlil
- Faqat grafik interfeysda qo'lda o'qish
- Vositalar faqat Linux'da ishlaydi
- Natija faqat PDF
! KAPE yig'ish va bu vositalarni ishga tushirishni avtomatlashtiradi.
:::

:::cards
Windows forensikasidagi asosiy savollar? :: Dastur ishga tushganmi, fayl ochilganmi, fayl vaqtlari, USB ulanganmi, tarmoq faoliyati, kim kirgan, persistence.
Asosiy registr hive'lari? :: SYSTEM, SOFTWARE, SAM, SECURITY (System32\config), NTUSER.DAT, UsrClass.dat (foydalanuvchi), Amcache.hve.
LastWrite vaqti? :: Registr kaliti oxirgi marta o'zgargan vaqt — ko'p artefaktlarda “qachon?” javobi.
Prefetch? :: C:\Windows\Prefetch\*.pf — dastur nomi, ishga tushishlar soni, oxirgi 8 vaqt, yuklangan fayllar; nomdagi xesh yo'ldan.
Amcache? :: Bajariladigan fayllar yo'li, metama'lumot va SHA-1 xeshi; mavjudlikni ko'rsatadi, ishga tushishni har doim emas.
BAM va UserAssist? :: BAM — foydalanuvchi bo'yicha dasturning oxirgi ishga tushish vaqti; UserAssist — GUI orqali ochilgan dasturlar (ROT13).
SRUM? :: SRUDB.dat — dasturlarning resurs va tarmoq sarfi (yuborilgan/olingan baytlar), taxminan 30–60 kun.
LNK, Jump Lists, ShellBags? :: LNK — ochilgan fayllar va ularning diski; Jump Lists — dastur bo'yicha oxirgi fayllar; ShellBags — ochilgan papkalar.
MACB? :: Modified, Accessed, Changed ($MFT yozuvi), Born — fayl vaqtlari.
$SI va $FN? :: $STANDARD_INFORMATION — dasturlar o'zgartira oladi; $FILE_NAME — asosan yadro. Nomuvofiqlik — timestomping belgisi.
USB tarixi manbalari? :: USBSTOR (seriya), MountedDevices (harf), MountPoints2 (foydalanuvchi), setupapi.dev.log (birinchi ulanish), LNK fayllar.
Eric Zimmerman vositalari? :: RECmd/Registry Explorer, PECmd, AmcacheParser, LECmd, JLECmd, SBECmd, MFTECmd, EvtxECmd, SrumECmd, Timeline Explorer.
:::
