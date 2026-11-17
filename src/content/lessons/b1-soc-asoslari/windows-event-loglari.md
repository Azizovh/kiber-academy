Dushanba ertalab. Moliya bo'limi xodimi: "Kompyuterim kechasi o'zidan-o'zi yoniq qolgan edi, ekranda qandaydir oyna ochilib yopildi." Hech qanday antivirus ogohlantirishi yo'q. Hech kim hech narsani ko'rmagan.

Lekin Windows ko'rgan. Har bir kirish, har bir yangi hisob, har bir o'rnatilgan xizmat — hammasi jurnalga yoziladi. Savol faqat bitta: siz bu jurnalni o'qiy olasizmi?

Kompaniyalardagi kompyuterlarning katta qismi Windows'da ishlaydi. Shuning uchun **Windows Event Log** — SOC analitigining eng ko'p ochadigan manbasi. Bu darsda uni o'qishni, eng muhim [[event-id|Event ID]]larni va ularning ortidagi hikoyani o'rganasiz.

## Jurnal qayerda va qanday tuzilgan

Kompyuter bosqichidan eslaysiz: [[os|operatsion tizim]] o'z ishini doimiy yozib boradi. Windows bu yozuvlarni [[event-log|Event Log]]ga — `.evtx` formatidagi fayllarga saqlaydi:

```
C:\Windows\System32\winevt\Logs\
  Security.evtx       ← kirishlar, hisoblar, huquqlar
  System.evtx         ← xizmatlar, drayverlar, tizim xatolari
  Application.evtx    ← dasturlar xabarlari
  Microsoft-Windows-PowerShell%4Operational.evtx
  Microsoft-Windows-Sysmon%4Operational.evtx   (Sysmon o'rnatilgan bo'lsa)
  ...
```

Bu fayllar matn emas — ularni Notepad'da ochib bo'lmaydi. Ular uchun maxsus vositalar bor (pastda).

Har bir yozuv (event) bir xil tuzilishga ega:

| Maydon | Ma'nosi | Misol |
|---|---|---|
| **Log Name** | Qaysi jurnal | Security |
| **Event ID** | Hodisa turi raqami | 4625 |
| **TimeCreated** | Qachon | 2026-11-16 02:14:07 |
| **Computer** | Qaysi qurilma | WS-BUX-014.corp.local |
| **Level** | Daraja | Information, Warning, Error |
| **Keywords** | Security jurnalida: muvaffaqiyat yoki muvaffaqiyatsizlik | Audit Failure |
| **EventData** | Hodisaga xos tafsilotlar | Hisob nomi, IP, jarayon… |

Eng muhim qism — **EventData**. Event ID nima bo'lganini aytadi, EventData esa **kim, qayerdan, qanday** ekanini.

### Asosiy jurnallar

| Jurnal | Nima yoziladi | SOC uchun ahamiyati |
|---|---|---|
| **Security** | Kirish/chiqish, hisob o'zgarishlari, huquqlardan foydalanish, audit | Eng muhim; faqat administrator o'qiy oladi |
| **System** | Xizmatlar ishga tushishi va o'rnatilishi, drayverlar, qayta yuklash | Yangi xizmat — klassik shubhali belgi |
| **Application** | Dasturlar xatolari va xabarlari | Ba'zan antivirus va ma'lumotlar bazasi xabarlari |
| **PowerShell/Operational** | PowerShell skriptlari mazmuni | Zararli skriptlarni ko'rish uchun |
| **Sysmon/Operational** | Batafsil jarayon, tarmoq, fayl hodisalari | Keyingi darsda |

## Yoddan bilinadigan Event ID'lar

Windows'da minglab Event ID bor. Yaxshi xabar: kundalik ishda sizga **yigirmaga yaqini** kerak bo'ladi. Ularni yoddan bilish — intervyularda eng ko'p so'raladigan narsalardan biri.

### Kirish (logon)

| ID | Jurnal | Hodisa |
|---|---|---|
| **4624** | Security | Muvaffaqiyatli kirish |
| **4625** | Security | Muvaffaqiyatsiz kirish |
| **4634** / **4647** | Security | Chiqish (logoff) |
| **4648** | Security | Boshqa hisob ma'lumotlari bilan aniq kirish (masalan, "Run as") |
| **4672** | Security | Yangi seansga maxsus (administrator darajasidagi) huquqlar berildi |
| **4740** | Security | Hisob bloklandi (juda ko'p noto'g'ri parol) |

### Hisoblar va guruhlar

| ID | Hodisa | Nega muhim |
|---|---|---|
| **4720** | Yangi foydalanuvchi hisobi yaratildi | Hujumchi o'ziga "zaxira eshik" ochishi mumkin |
| **4722** | Hisob yoqildi | O'chirilgan eski hisobni qayta tiriltirish |
| **4724** | Parolni tiklashga urinish | Boshqa birovning parolini almashtirish |
| **4726** | Hisob o'chirildi | Izlarni yo'qotish |
| **4728** / **4732** / **4756** | Hisob guruhga qo'shildi (global / lokal / universal) | Ayniqsa "Administrators" yoki "Domain Admins" ga |

### Jarayonlar, xizmatlar, vazifalar

| ID | Jurnal | Hodisa |
|---|---|---|
| **4688** | Security | Yangi jarayon yaratildi (alohida yoqilishi kerak!) |
| **7045** | System | Yangi xizmat o'rnatildi |
| **4697** | Security | Yangi xizmat o'rnatildi (audit yoqilgan bo'lsa) |
| **4698** | Security | Rejalashtirilgan vazifa (scheduled task) yaratildi |

Nega yangi xizmat va rejalashtirilgan vazifa muhim? Linux bosqichidagi `cron` va `systemd` ni eslang: ular dasturni **avtomatik** ishga tushiradi. Hujumchi kompyuter qayta yuklangandan keyin ham o'z kodi ishlab turishini xohlaydi (buni **persistence** deyiladi) — va xizmat yoki vazifa buning eng oddiy yo'li. Shuning uchun 7045 va 4698 har doim e'tiborga loyiq.

### Izlarni yo'qotish

| ID | Jurnal | Hodisa |
|---|---|---|
| **1102** | Security | Security jurnali tozalandi |
| **104** | System | System jurnali tozalandi |

Oddiy ish kunida hech kim jurnallarni tozalamaydi. **1102 — deyarli har doim eskalatsiya sababi.** Va e'tibor bering: jurnal tozalanganda ham, tozalanganligi haqidagi yozuv qoladi.

### Kerberos va NTLM (domen muhitida)

| ID | Hodisa |
|---|---|
| **4768** | Kerberos asosiy chipta (TGT) so'raldi — domen kontrollerida |
| **4769** | Kerberos xizmat chiptasi so'raldi |
| **4771** | Kerberos oldindan autentifikatsiya muvaffaqiyatsiz |
| **4776** | NTLM orqali hisob ma'lumotlari tekshirildi |

Bularni hozircha "bor ekan" deb biling — Active Directory hujumlarini aniqlashda (keyingi bosqichlarda) ular asosiy manba bo'ladi.

:::tip
Yodlash usuli: **46xx — kirish va jarayonlar, 47xx — hisoblar va guruhlar, 7045 — xizmat, 1102 — tozalash.** Flashcard'larni har kuni takrorlang — ikki haftada bu raqamlar o'z-o'zidan esingizda turadi.
:::

## Logon turlari — 4624 ning eng muhim maydoni

"Muvaffaqiyatli kirish" degani o'zi ko'p narsa demaydi. Muhimi — **qanday** kirilgan. Buni **Logon Type** maydoni aytadi:

| Tur | Nomi | Qachon | Misol |
|---|---|---|---|
| **2** | Interactive | Klaviatura oldida o'tirib kirish | Xodim ertalab kompyuterini yoqdi |
| **3** | Network | Tarmoq orqali resursga ulanish | Umumiy papka, printer, [[smb|SMB]] |
| **4** | Batch | Rejalashtirilgan vazifa | Har kecha ishlaydigan skript |
| **5** | Service | Xizmat ishga tushdi | Zaxira nusxa xizmati |
| **7** | Unlock | Bloklangan ekranni ochish | Tushlikdan qaytdi |
| **8** | NetworkCleartext | Parol tarmoqda ochiq uzatildi | Eski IIS sozlamasi — o'zi muammo |
| **9** | NewCredentials | `runas /netonly` | Boshqa hisob bilan tarmoqqa |
| **10** | RemoteInteractive | Masofaviy ish stoli | [[rdp|RDP]] orqali kirish |
| **11** | CachedInteractive | Saqlangan ma'lumot bilan | Noutbuk ofisdan tashqarida |

Eng ko'p uchraydiganlari: **2, 3, 10**. Ularning farqini darhol aytib bera olishingiz kerak.

Endi bir xil 4624 ning turli ma'nolarini ko'ring:

```
4624, Type 2,  hisob: d.karimova,  09:02, qurilma: WS-BUX-014
  → Xodim o'z kompyuterini yoqdi. Odatiy.

4624, Type 10, hisob: d.karimova,  03:40, manba IP: 198.51.100.77
  → Buxgalter tunda, tashqi manzildan RDP orqali kirdi?! Tekshirish kerak.

4624, Type 3,  hisob: administrator, 14:15, 40 ta turli serverga 2 daqiqada
  → Bitta hisob qisqa vaqtda ko'p serverga tarmoq orqali ulanmoqda —
    tarmoq ichida harakatlanish (lateral movement) belgisi bo'lishi mumkin.
```

Bir xil Event ID — uch xil hikoya. Alert triage darsidagi qoida yana ishladi: **kontekst hal qiladi.**

## 4625: nega kirish muvaffaqiyatsiz bo'ldi?

Muvaffaqiyatsiz kirishda Windows **sababini** ham yozadi — `Status` va `Sub Status` maydonlarida:

| Kod | Ma'nosi | Nimani anglatishi mumkin |
|---|---|---|
| `0xC000006A` | Parol noto'g'ri | Hisob bor, parol terilmoqda |
| `0xC0000064` | Bunday foydalanuvchi yo'q | Hisob nomlari taxmin qilinmoqda |
| `0xC0000234` | Hisob bloklangan | Urinishlar davom etmoqda |
| `0xC0000072` | Hisob o'chirilgan | Eski hisobdan foydalanishga urinish |
| `0xC0000071` | Parol muddati o'tgan | Ko'pincha zararsiz |
| `0xC000006F` | Ruxsat etilmagan vaqtda | Ish vaqtidan tashqari kirish |

Bu kodlar orqali turli naqshlarni farqlay olasiz:

| Naqsh | Belgilari |
|---|---|
| **Parol terish** ([[brute-force|brute force]]) | Bitta hisob, ko'p `0xC000006A`, qisqa vaqtda |
| **Parol purkash** (password spraying) | Ko'p hisob, har biriga 1–2 urinish, bitta manbadan |
| **Hisob nomlarini taxmin qilish** | Ko'p `0xC0000064` — mavjud bo'lmagan nomlar |
| **Eski parol bilan ishlayotgan xizmat** | Bir xil oraliqda takrorlanadi, bitta ichki manba — triage darsidagi `svc-backup` misoli |

Eng xavotirli naqsh: **ko'p 4625, keyin bitta 4624** — xuddi shu manbadan. Bu urinishlar oxir-oqibat muvaffaqiyatli bo'lganini anglatishi mumkin.

:::key
Bitta Event ID — bu faqat bitta kadr. Hikoya **ketma-ketlikda** ko'rinadi. Masalan: `4625 × 200 → 4624 (Type 10) → 4672 → 4720 → 4732` — "parol terildi, RDP orqali kirildi, administrator huquqi olindi, yangi hisob yaratildi va administratorlar guruhiga qo'shildi". Har bir qator alohida olganda hech narsa emas; birgalikda — aniq insident. SIEM qoidalari ko'pincha aynan shunday **zanjirlarni** qidiradi.
:::

## Jurnallarni o'qish vositalari

### Event Viewer (grafik)

`Win + R` → `eventvwr.msc`. Chap tomonda: *Windows Logs → Security*. O'ng panelda **Filter Current Log** — Event ID va vaqt bo'yicha saralash.

Qulay, lekin sekin: minglab yozuvni ko'zdan kechirish uchun yaramaydi. Bitta yozuvni batafsil ko'rish uchun — **Details** yorlig'i → **XML View**: u yerda barcha maydonlar nomlari bilan ko'rinadi.

### PowerShell — haqiqiy ish quroli

[[powershell|PowerShell]]dagi `Get-WinEvent` buyrug'i jurnallarni tez qidiradi. Security jurnali uchun PowerShell **administrator sifatida** ochilishi kerak.

```powershell
# Security jurnalidagi oxirgi 20 ta yozuv
Get-WinEvent -LogName Security -MaxEvents 20

# Oxirgi 24 soatdagi muvaffaqiyatsiz kirishlar
Get-WinEvent -FilterHashtable @{
    LogName   = 'Security'
    Id        = 4625
    StartTime = (Get-Date).AddHours(-24)
}

# Bir nechta ID birdan: yangi hisob va guruhga qo'shish
Get-WinEvent -FilterHashtable @{ LogName = 'Security'; Id = 4720, 4732 }

# Yangi o'rnatilgan xizmatlar
Get-WinEvent -FilterHashtable @{ LogName = 'System'; Id = 7045 } |
    Select-Object TimeCreated, Message
```

`-FilterHashtable` muhim: u filtrlashni Windows'ning o'ziga topshiradi va juda tez ishlaydi. `Get-WinEvent ... | Where-Object` esa avval **hammasini** o'qib, keyin saralaydi — katta jurnalda daqiqalab kutasiz.

EventData maydonlarini nomi bilan olish uchun yozuvni XML ga aylantirish qulay:

```powershell
# Muvaffaqiyatsiz kirishlar: hisob nomi, manba IP va sabab
Get-WinEvent -FilterHashtable @{ LogName = 'Security'; Id = 4625 } -MaxEvents 200 |
    ForEach-Object {
        $d = @{}
        ([xml]$_.ToXml()).Event.EventData.Data | ForEach-Object { $d[$_.Name] = $_.'#text' }
        [pscustomobject]@{
            Vaqt   = $_.TimeCreated
            Hisob  = $d.TargetUserName
            IP     = $d.IpAddress
            Sabab  = $d.SubStatus
            Tur    = $d.LogonType
        }
    } |
    Group-Object IP | Sort-Object Count -Descending | Select-Object Count, Name
```

Oxirgi qator Linux bosqichidagi `sort | uniq -c | sort -nr` ning PowerShell'dagi aynan o'zi: qaysi IP'dan nechta muvaffaqiyatsiz urinish bo'lganini sanaydi. G'oya bir xil — vosita boshqa.

### wevtutil — eski, lekin hamma joyda bor

```powershell
# Security jurnalidan oxirgi 5 ta yozuv, eng yangisi birinchi, matn ko'rinishida
wevtutil qe Security /c:5 /rd:true /f:text

# Jurnal haqida ma'lumot (hajmi, yozuvlar soni)
wevtutil gli Security
```

## Hamma narsa yozilavermaydi: audit sozlamalari

Bu Windows jurnallarining eng katta tuzog'i. **Standart sozlamalarda ko'p muhim hodisalar umuman yozilmaydi.**

| Hodisa | Standart holatda | Nima qilish kerak |
|---|---|---|
| 4624 / 4625 kirishlar | Yoziladi | — |
| **4688 yangi jarayon** | **Yozilmaydi** | "Audit Process Creation" ni yoqish |
| 4688 dagi **buyruq satri** | **Yozilmaydi** | Alohida sozlama: "Include command line in process creation events" |
| PowerShell skript mazmuni (**4104**) | Odatda yozilmaydi | "Script Block Logging" ni yoqish |
| Fayllarga murojaat | Yozilmaydi | Faqat kerakli papkalar uchun yoqiladi — aks holda jurnal to'lib ketadi |

Joriy audit sozlamalarini ko'rish:

```powershell
auditpol /get /category:*
```

Amaliy oqibat: tergov paytida "4688 yo'q" degani **jarayon ishga tushmagan** degani emas. Ehtimol, shunchaki yozilmagan. Kompaniyada nimalar yoziladi va nimalar yozilmaydi — buni SOC ishga kirgan birinchi haftangizda bilib olishingiz kerak.

:::warn
**Jurnal hajmi ham cheklangan.** Security jurnali standart holatda nisbatan kichik va to'lganda eski yozuvlar ustiga yoziladi. Faol serverda bu bir necha soat bo'lishi mumkin. Shuning uchun haqiqiy kompaniyalarda jurnallar qurilmada qolmaydi: ular **markaziy joyga** — SIEM ga — yuboriladi (Windows Event Forwarding yoki agent orqali). Bundan tashqari, kompyuterni buzib kirgan hujumchi mahalliy jurnalni o'chirishi mumkin, markaziy nusxani esa — qiyinroq.
:::

## PowerShell jurnallari

PowerShell — administratorlar uchun kuchli vosita, shuning uchun hujumchilar ham uni yaxshi ko'radi: u har bir Windows'da allaqachon bor va hech narsa o'rnatish shart emas.

| ID | Jurnal | Nima |
|---|---|---|
| **4104** | PowerShell/Operational | Script Block Logging — ishga tushgan skriptning **mazmuni** |
| **4103** | PowerShell/Operational | Module Logging — chaqirilgan buyruqlar |
| **400** / **403** | Windows PowerShell | PowerShell dvigateli ishga tushdi / to'xtadi |

4104 ning kuchi shundaki, skript yashirilgan yoki kodlangan holda yuborilgan bo'lsa ham, PowerShell uni **ishga tushirishdan oldin ochadi** — va jurnalga aynan ochilgan holati yoziladi.

Analitik sifatida PowerShell yozuvlarida nimalar e'tiborni tortadi:

| Belgi | Nega shubhali |
|---|---|
| `-EncodedCommand` (yoki `-enc`) | Buyruqni Base64 ichiga yashirish — kodlash bosqichidan eslaysiz |
| `-WindowStyle Hidden`, `-NoProfile` | Oynasiz, sezdirmasdan ishlash |
| Internetdan yuklash (`DownloadString`, `Invoke-WebRequest`) va darhol ishga tushirish | Kod diskka tushmaydi |
| Ota-jarayon — Word, Excel, brauzer | Ofis hujjati PowerShell ochmasligi kerak |
| Hisob — oddiy xodim | Administratorlar uchun odatiy, buxgalter uchun emas |

Lekin unutmang: bu belgilarning har biri qonuniy dasturlarda ham uchraydi. Ko'p korporativ boshqaruv tizimlari ham `-EncodedCommand` ishlatadi. Bitta belgi — gumon; bir nechtasi birgalikda va noodatiy kontekstda — eskalatsiya.

## Bu jurnallar nimani ko'rsatmaydi

Halol bo'laylik — Windows'ning standart jurnallarida katta bo'shliqlar bor:

- **Tarmoq ulanishlari** — qaysi jarayon qaysi manzilga ulangani standart holatda yozilmaydi.
- **Fayl xeshlari** — ishga tushgan dasturning xeshi yo'q, faqat nomi (va nomini o'zgartirish oson).
- **Ota-jarayon zanjiri** — 4688 da bor, lekin cheklangan.
- **Fayl yaratilishi, registr o'zgarishlari** — faqat maxsus sozlangan auditda.
- **DNS so'rovlari** — qurilma qaysi domenlarni so'raganini bilmaysiz.

Aynan shu bo'shliqlarni to'ldirish uchun **Sysmon** yaratilgan — keyingi darsning mavzusi.

:::try
Bu mashqlarni **o'z Windows kompyuteringizda** bajaring. PowerShell'ni administrator sifatida oching.

**1. O'z kirishlaringizni toping.** Kompyuterni bloklang (`Win + L`) va qayta oching. Keyin oxirgi 4624 yozuvlarini toping. Qaysi Logon Type ko'rindi?

**2. Muvaffaqiyatsiz kirish yarating.** Ekranni bloklang va ataylab bir marta noto'g'ri parol tering, keyin to'g'risini. 4625 yozuvini toping va `SubStatus` maydonini o'qing.

**3. Audit sozlamalari.** `auditpol /get /category:*` ni ishga tushiring. "Process Creation" yoqilganmi? Demak, sizning kompyuteringizda 4688 yoziladimi?

**4. Xizmatlar tarixi.** `Get-WinEvent -FilterHashtable @{LogName='System'; Id=7045} -MaxEvents 10 | Select TimeCreated, Message` — oxirgi o'rnatilgan xizmatlar qaysilar? Har birini taniysizmi?

**5. TryHackMe** — "Windows Event Logs" xonasini bajaring.

*Javoblar: 1 — ekranni ochish **Type 7** (Unlock), kompyuterni yoqib kirish **Type 2**; Windows ba'zan bir vaqtda bir nechta yozuv qoldiradi. 2 — noto'g'ri parol uchun `0xC000006A`. 3 — oddiy uy kompyuterlarida ko'pincha "No Auditing": demak 4688 yo'q. 4 — odatda drayverlar va dastur yangilanish xizmatlari; tanimagan nomni qidiruv tizimida tekshiring — triage odati.*
:::

## Xulosa

- Windows jurnallari `C:\Windows\System32\winevt\Logs\` da, `.evtx` formatida; eng muhimi — **Security**.
- Har yozuvda Event ID **nima** bo'lganini, EventData **kim, qayerdan, qanday** ekanini aytadi.
- Yoddan: **4624/4625** kirish, **4672** maxsus huquqlar, **4688** jarayon, **4720** yangi hisob, **4732** guruhga qo'shish, **7045** yangi xizmat, **4698** vazifa, **1102** jurnal tozalandi.
- Logon turlari: **2** — klaviatura, **3** — tarmoq, **10** — RDP.
- 4625 dagi **SubStatus** sababni aytadi; naqshlar: brute force, spraying, eski parol.
- Hikoya bitta yozuvda emas, **ketma-ketlikda** ko'rinadi.
- `Get-WinEvent -FilterHashtable` — tez qidiruv; Event Viewer — bitta yozuvni ko'rish uchun.
- Standart holatda 4688, buyruq satri va PowerShell mazmuni **yozilmaydi** — "yozuv yo'q" ≠ "hodisa yo'q".
- Jurnallar markaziy SIEM ga yuborilishi kerak: mahalliy jurnal kichik va o'chirilishi mumkin.

:::quiz
? Event ID 4625 nimani bildiradi?
- Muvaffaqiyatli kirish
+ Muvaffaqiyatsiz kirish
- Yangi hisob yaratilishi
- Jurnal tozalanishi
! 4624 — muvaffaqiyatli, 4625 — muvaffaqiyatsiz kirish. Bu juftlik SOC'da eng ko'p ko'riladigan yozuvlardan.

? Logon Type 10 qanday kirishni bildiradi?
- Klaviatura oldida o'tirib kirish
- Umumiy papkaga tarmoq orqali ulanish
+ Masofaviy ish stoli (RDP) orqali kirish
- Ekranni qulfdan ochish
! Type 2 — interaktiv, Type 3 — tarmoq, Type 7 — unlock, Type 10 — RemoteInteractive (RDP).

? Qaysi Event ID yangi xizmat o'rnatilganini bildiradi (System jurnalida)?
- 4624
- 1102
+ 7045
- 4720
! 7045 — yangi xizmat. Xizmatlar avtomatik ishga tushadi, shuning uchun ular hujumchilarning tizimda qolish (persistence) usuli bo'lishi mumkin.

? Security jurnalida Event ID 1102 paydo bo'ldi. Bu nima va qanday munosabatda bo'lish kerak?
- Oddiy yangilanish — e'tibor bermaslik kerak
+ Jurnal tozalangan — oddiy ishda deyarli bo'lmaydi, odatda eskalatsiya sababi
- Yangi foydalanuvchi qo'shilgan
- Kompyuter qayta yuklangan
! Izlarni yo'qotish urinishi bo'lishi mumkin. Tozalashning o'zi ham yozuv qoldiradi.

? Bitta tashqi IP'dan 30 ta turli hisobga har biriga 1–2 tadan muvaffaqiyatsiz kirish urinishi bo'lgan. Bu qaysi naqsh?
- Eski parol bilan ishlayotgan xizmat
+ Parol purkash (password spraying)
- Oddiy foydalanuvchi xatosi
- Jurnal tozalash
! Spraying'da hujumchi bloklanmaslik uchun ko'p hisobga oz urinish qiladi. Brute force'da esa bitta hisobga ko'p urinish bo'ladi.

? 4625 dagi SubStatus 0xC0000064 nimani anglatadi?
- Parol noto'g'ri
+ Bunday foydalanuvchi mavjud emas
- Hisob bloklangan
- Parol muddati o'tgan
! 0xC000006A — noto'g'ri parol, 0xC0000064 — foydalanuvchi yo'q. Ko'p 0xC0000064 hisob nomlarini taxmin qilish belgisi bo'lishi mumkin.

? Tergov paytida 4688 (yangi jarayon) yozuvlari umuman topilmadi. To'g'ri xulosa qaysi?
- Hech qanday jarayon ishga tushmagan
- Hujumchi barcha jurnallarni o'chirgan
+ Avval jarayon yaratish auditi yoqilganmi — tekshirish kerak; standart holatda u yozilmaydi
- Kompyuter o'chiq bo'lgan
! “Yozuv yo'q” va “hodisa bo'lmagan” — ikki xil narsa. Avval nima yozilishini bilish kerak.

? Nega Get-WinEvent da -FilterHashtable, Where-Object dan yaxshiroq?
- U chiroyliroq natija beradi
+ Filtrlash Windows'ning o'zida bajariladi va tez ishlaydi; Where-Object avval hamma yozuvlarni o'qiydi
- Where-Object Security jurnalida ishlamaydi
- Farqi yo'q
! Katta jurnallarda bu farq soniyalar va daqiqalar o'rtasidagi farq.

? Qaysi ketma-ketlik eng xavotirli?
- 4624 Type 2, ertalab 9 da, xodimning o'z kompyuterida
- Bitta 4625, keyin darhol 4624 — foydalanuvchi parolni xato terib, qayta tergan
+ Bitta tashqi manbadan yuzlab 4625, keyin 4624 Type 10, keyin 4720 va 4732
- Har kecha bir xil vaqtda 4624 Type 5
! Parol terish, RDP orqali kirish, yangi hisob yaratish va uni guruhga qo'shish — klassik insident zanjiri.

? Script Block Logging (4104) nima uchun qimmatli?
- U PowerShell'ni tezlashtiradi
+ U skriptning mazmunini, hatto kodlangan bo'lsa ham, ochilgan holatda yozadi
- U zararli skriptlarni avtomatik bloklaydi
- U faqat xatolarni yozadi
! PowerShell skriptni bajarishdan oldin ochadi, va 4104 aynan shu ochilgan matnni saqlaydi. U bloklamaydi — faqat ko'rsatadi.
:::

:::cards
4624 va 4625? :: 4624 — muvaffaqiyatli kirish; 4625 — muvaffaqiyatsiz kirish (Security jurnali).
4672? :: Yangi seansga maxsus (administrator darajasidagi) huquqlar berildi.
4688? :: Yangi jarayon yaratildi. Standart holatda yozilmaydi; buyruq satri uchun alohida sozlama kerak.
4720 va 4732? :: 4720 — yangi foydalanuvchi hisobi; 4732 — hisob lokal xavfsizlik guruhiga qo'shildi.
7045? :: Yangi xizmat o'rnatildi (System jurnali). Persistence belgisi bo'lishi mumkin.
4698? :: Rejalashtirilgan vazifa yaratildi.
1102? :: Security jurnali tozalandi — deyarli har doim eskalatsiya sababi.
Logon Type 2, 3, 10? :: 2 — interaktiv (klaviatura), 3 — tarmoq (umumiy papka), 10 — RDP.
4625 SubStatus 0xC000006A va 0xC0000064? :: 0xC000006A — parol noto'g'ri; 0xC0000064 — foydalanuvchi mavjud emas.
Brute force va password spraying farqi? :: Brute force — bitta hisobga ko'p urinish; spraying — ko'p hisobga oz urinish.
4104? :: PowerShell Script Block Logging — ishga tushgan skript mazmuni.
Windows jurnallari qayerda saqlanadi? :: C:\Windows\System32\winevt\Logs\ papkasida, .evtx formatida.
:::
