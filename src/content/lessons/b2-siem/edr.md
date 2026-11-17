Antivirus jim. Hech qanday zararli fayl topilmadi. Lekin EDR konsolida ogohlantirish bor, va unda bitta rasm:

```
explorer.exe
 └─ OUTLOOK.EXE
     └─ WINWORD.EXE  "C:\Users\d.karimova\...\Hisob-faktura_1147.docm"
         └─ powershell.exe  -NoProfile -WindowStyle Hidden -enc <...>
             ├─ (tarmoq) 203.0.113.45:443
             ├─ (fayl)   C:\Users\d.karimova\AppData\Roaming\svchost.exe
             └─ svchost.exe  (AppData\Roaming)
                 └─ (registr) HKCU\...\CurrentVersion\Run\Updater
```

Antivirus nega jim qoldi? Chunki bu zanjirdagi har bir dastur — Outlook, Word, PowerShell — qonuniy va imzolangan. Zararli narsa fayllarda emas, ularning **xatti-harakatida**. Buni ko'rish uchun boshqa turdagi vosita kerak — **EDR**.

## Antivirusdan EDR'gacha

| Vosita | Asosiy savol | Qanday ishlaydi |
|---|---|---|
| **Klassik antivirus** | "Bu fayl ma'lum zararli dasturmi?" | Imzolar (xesh, bayt naqshlari) |
| **NGAV** (yangi avlod AV) | "Bu fayl zararliga o'xshaydimi?" | Imzolar + mashinaviy o'rganish + xulq evristikasi |
| **EDR** | "Bu qurilmada nima bo'lyapti va bu normalmi?" | Doimiy telemetriya, xulq qoidalari, tergov va javob vositalari |
| **XDR** | "Butun muhitda nima bo'lyapti?" | EDR + tarmoq + pochta + bulut + identifikatsiya |
| **MDR** | — | Xizmat: EDR/XDR'ni tashqi SOC jamoasi kuzatadi |

[[edr|EDR]] — Endpoint Detection and Response. Uning ikki yarmi nomida:

- **Detection** — qurilmadagi faoliyatni doimiy yozib boradi va xulq qoidalari bilan tahlil qiladi.
- **Response** — analitikka masofadan choralar ko'rish imkonini beradi: qurilmani ajratish, jarayonni to'xtatish, faylni karantinga olish.

Sysmon darsidagi taqqoslashni eslang: Sysmon ko'radi, lekin tahlil qilmaydi va to'xtatmaydi. EDR — Sysmon + aniqlash qoidalari + javob vositalari + markaziy konsol, bitta mahsulotda.

## EDR nimani ko'radi

EDR agenti operatsion tizim yadrosi darajasida ishlaydi va quyidagi telemetriyani yig'adi:

| Telemetriya | Misol | Sysmon'dagi o'xshashi |
|---|---|---|
| Jarayonlar | Kim kimni, qanday buyruq satri bilan ishga tushirdi | Event ID 1 |
| Tarmoq | Qaysi jarayon qayerga ulandi | Event ID 3 |
| DNS | Qaysi jarayon qaysi domenni so'radi | Event ID 22 |
| Fayllar | Yaratish, o'zgartirish, o'chirish | Event ID 11, 23 |
| Registr | Kalitlar va qiymatlar | Event ID 12–14 |
| Modullar | Jarayon qaysi DLL'larni yukladi | Event ID 7 |
| Jarayonlararo | Bir jarayon boshqasining xotirasiga murojaat qildi yoki unga kod joyladi | Event ID 8, 10 |
| Skriptlar | PowerShell va boshqa skriptlar mazmuni | 4104 (Windows darsi) |
| Foydalanuvchi | Kirishlar, huquq o'zgarishlari | Security jurnali |

Bundan tashqari, ko'p EDR'lar har bir fayl uchun qo'shimcha kontekst beradi:

- **Imzo** — kim imzolagan, imzo haqiqiymi?
- **Tarqalganlik** (prevalence) — bu fayl kompaniyadagi nechta qurilmada bor?
- **Birinchi ko'rilgan vaqt** — bu fayl kompaniyada qachon paydo bo'lgan?
- **Obro'** — ishlab chiqaruvchining global bazasidagi baho.

Tarqalganlik — triage'dagi eng kuchli savollardan biri. 3 000 ta kompyuterning hammasida bor fayl — deyarli albatta korporativ dastur. Faqat **bitta** kompyuterda, faqat **bugun** paydo bo'lgan va **imzosiz** fayl — darhol e'tiborga loyiq.

## Jarayon daraxtini o'qish

EDR ogohlantirishining markazida deyarli har doim **jarayon daraxti** turadi. Uni o'qish uchun avval **normal** daraxtni bilish kerak — Sysmon darsidagi SANS "Hunt Evil" plakatini eslang.

### Windows'ning normal "oila daraxti"

```
System
 └─ smss.exe
     ├─ csrss.exe                         (sessiya 0)
     ├─ wininit.exe
     │   ├─ services.exe
     │   │   └─ svchost.exe -k ...        (ko'p nusxa, har biri -k parametri bilan)
     │   └─ lsass.exe                     (FAQAT bitta nusxa)
     ├─ csrss.exe                         (foydalanuvchi sessiyasi)
     └─ winlogon.exe
         └─ userinit.exe                  (ishini tugatib chiqadi)
             └─ explorer.exe              (foydalanuvchi ish stoli)
                 └─ foydalanuvchi ishga tushirgan dasturlar
```

Bu daraxtdan bir nechta qoida kelib chiqadi:

| Jarayon | Normal holati | Shubhali belgi |
|---|---|---|
| `svchost.exe` | Otasi — `services.exe`; yo'li — `C:\Windows\System32\` | Boshqa ota yoki boshqa papka |
| `lsass.exe` | Faqat **bitta**, otasi — `wininit.exe` | Ikkinchi nusxa yoki boshqa ota; oddiy dasturlarning unga murojaati |
| `services.exe` | Bitta, otasi — `wininit.exe` | Bir nechta nusxa |
| `explorer.exe` | Har foydalanuvchiga bitta; otasi tugagan `userinit.exe` | Boshqa yo'l yoki g'alati ota |
| `csrss.exe`, `smss.exe`, `wininit.exe` | Faqat `System32` dan | Boshqa joydan |

`lsass.exe` alohida e'tiborga loyiq: u tizimga kirgan foydalanuvchilarning hisob ma'lumotlarini xotirada saqlaydi. Shuning uchun **oddiy dasturlarning lsass xotirasiga murojaati** (Sysmon Event ID 10) — eng muhim aniqlash belgilaridan biri. Detection engineering darsidagi "juda mustahkam qoida" misoli aynan shu edi.

### Daraxtdagi shubhali naqshlar

Sysmon darsidagi ota-bola juftliklarini EDR daraxtda yanada aniq ko'rsatadi:

1. **G'alati ota** — Word, Excel, brauzer, pochta mijozi → buyruq qobig'i yoki skript interpretatori.
2. **G'alati joy** — tizim nomli fayl tizim papkasidan tashqarida; `Temp`, `AppData`, `Downloads`, `C:\Users\Public` dan ishga tushgan dasturlar.
3. **Uzun zanjir** — `cmd → powershell → cmd → powershell` — odamlar bunday ishlamaydi.
4. **Chuqurlikda tarmoq** — daraxtning pastidagi jarayon tashqi manzilga ulanadi.
5. **Razvedka buyruqlari to'plami** — qisqa vaqtda `whoami`, `ipconfig`, `net user`, `net group`, `nltest` — hujumchi "qayerdaman, kimman?" deb o'rganmoqda (ATT&CK'da — Discovery taktikasi).

Beshinchi naqsh ayniqsa foydali: bu buyruqlarning har biri alohida — administrator uchun normal. Lekin oddiy foydalanuvchi kompyuterida, PowerShell ichidan, bir daqiqada beshtasi — kuchli signal. Risk-based alerting (detection engineering darsi) aynan shunday holatlar uchun.

## LOLBins — tizimning o'z vositalari

Dars boshidagi savolni eslang: nega antivirus jim qoldi? Zamonaviy hujumchilar iloji boricha **o'z dasturlarini olib kelmaslikka** harakat qiladi. Ular Windows'da allaqachon bor, Microsoft imzolagan qonuniy dasturlardan foydalanadi. Buni "living off the land" (yer nima bersa, shu bilan yashash) deyishadi, bunday dasturlarni esa — [[lolbins|LOLBins]].

Nega bu hujumchi uchun qulay:
- Fayl imzolangan va ishonchli — antivirus uni bloklamaydi.
- Dastur har bir kompyuterda bor — hech narsa yuklab olish shart emas.
- Administratorlar ham ularni ishlatadi — shovqin orasida yashirinish oson.

**LOLBAS** loyihasi (lolbas-project.github.io) — bunday Windows dasturlari va ularning suiiste'mol qilinish yo'llari katalogi. Linux uchun o'xshash loyiha — **GTFOBins**. Himoyachilar ulardan "qaysi dasturlarni kuzatish kerak" ro'yxati sifatida foydalanadi.

Eng ko'p kuzatiladigan Windows LOLBins'lari — himoyachi nuqtai nazaridan:

| Dastur | Qonuniy vazifasi | Nimaga e'tibor berish kerak |
|---|---|---|
| `powershell.exe` | Avtomatlashtirish va boshqaruv | Kodlangan buyruqlar, yashirin oyna, ofis dasturidan ishga tushish, internetdan yuklash |
| `certutil.exe` | Sertifikatlarni boshqarish | Buyruq satrida internet manzili yoki Base64 dekodlash — sertifikat ishi uchun g'ayrioddiy |
| `mshta.exe` | HTML ilovalarini (HTA) ishga tushirish | Internetdan yoki ofis dasturidan ishga tushirilishi; bugun deyarli hech kim qonuniy ishlatmaydi |
| `rundll32.exe` | DLL funksiyalarini chaqirish | Foydalanuvchi papkalaridagi DLL'lar, argumentsiz ishga tushish, tashqi tarmoq ulanishi |
| `regsvr32.exe` | Komponentlarni ro'yxatdan o'tkazish | Buyruq satrida tarmoq manzili |
| `bitsadmin.exe` | Fon rejimida fayl yuklash | Foydalanuvchi papkalariga notanish manzildan yuklash |
| `wmic.exe` | Tizim boshqaruvi | Masofaviy qurilmalarda jarayon yaratish |
| `msbuild.exe`, `installutil.exe` | Dasturchi vositalari | Dasturchi bo'lmagan xodimlar kompyuterida ishlatilishi |

E'tibor bering: qoida hech qachon "**certutil ishga tushdi — ogohlantirish**" bo'lmaydi — bu shovqin. Qoida doim **kontekst** bilan: qanday argumentlar, kim, qayerdan, qanday ota-jarayondan. Bu — detection engineering darsidagi "mustahkam qoida" tamoyilining aynan o'zi.

:::key
LOLBins hujumlariga qarshi eng yaxshi himoya — faqat aniqlash emas, **cheklash**. Ko'p kompaniyalarda xodimlarga `mshta.exe`, `wmic.exe` yoki PowerShell'ning to'liq rejimi umuman kerak emas. **Application control** (masalan, Windows'dagi WDAC yoki AppLocker) bilan ularni oddiy foydalanuvchilar uchun bloklash, PowerShell'ni **Constrained Language Mode**ga o'tkazish va ofis makroslarini internetdan kelgan hujjatlar uchun o'chirish — butun bir hujum sinfini yopadi. Himoya qatlamlari darsini eslang: aniqlash — oxirgi qatlam, birinchisi emas.
:::

## Javob choralari

EDR'ning "R" qismi — analitikning qo'llari:

| Chora | Nima qiladi | Ehtiyot bo'lish kerak |
|---|---|---|
| **Qurilmani ajratish** (isolate) | Qurilmani tarmoqdan uzadi, faqat EDR konsoli bilan aloqa qoladi | Foydalanuvchi ishsiz qoladi; muhim serverni ajratish — biznes uzilishi |
| **Jarayonni to'xtatish** | Aniq jarayonni o'ldiradi | Avval dalillarni (xotira, daraxt) saqlang |
| **Faylni karantinga olish** | Faylni xavfsiz joyga ko'chiradi | Qonuniy dastur bo'lsa — ishni buzadi |
| **Xesh bo'yicha bloklash** | Shu fayl hech qayerda ishga tushmaydi | Tarqalganlikni tekshiring |
| **Triage paketini yig'ish** | Jurnallar, jarayonlar ro'yxati, avtoyuklash joylari va h.k. | Keyingi bosqichdagi forensika uchun |
| **Live response** | Qurilmada masofaviy buyruq qatori | Har bir buyruq yoziladi; ehtiyotkorlik bilan |

Tartib muhim: **avval dalil, keyin chora.** Jarayonni o'ldirsangiz, uning xotirasidagi ma'lumot yo'qoladi. Qurilmani qayta yuklasangiz (Linux darsidagi ogohlantirish), juda ko'p iz yo'qoladi. Ko'p tashkilotlarda L1 analitigi faqat **ajratish** huquqiga ega — bu hujumchini to'xtatadi, lekin dalillarni saqlaydi. Qolganini IR jamoasi qiladi (keyingi bosqich).

## EDR ogohlantirishini triage qilish

Alert triage darsidagi besh qadam EDR'da ham amal qiladi. EDR'ga xos tekshiruv ro'yxati:

| Savol | Qayerdan |
|---|---|
| Daraxtning **ildizi** nima? Hammasi qayerdan boshlangan? | Jarayon daraxti — yuqoriga qarab |
| Buyruq satri nima deydi? | Jarayon tafsilotlari |
| Fayl imzolanganmi? Kim tomonidan? | Fayl tafsilotlari |
| **Tarqalganlik**: nechta qurilmada bor? Qachondan beri? | Fayl tafsilotlari |
| Jarayon tarmoqqa chiqdimi? Qayerga? | Tarmoq hodisalari |
| Persistence yaratildimi? (Run kaliti, xizmat, vazifa) | Registr va fayl hodisalari |
| Xuddi shu narsa **boshqa qurilmalarda** ham bormi? | Xesh, domen, buyruq satri bo'yicha butun muhitda qidiruv |

Oxirgi savol ko'pincha unutiladi: bitta zararlangan qurilma topdingiz — ajoyib. Lekin xuddi shu phishing xati 37 kishiga kelgan edi (phishing tahlili darsi). EDR'ning butun muhit bo'ylab qidiruvi aynan shu uchun.

## EDR bozori va laboratoriya

| Mahsulot | Eslatma |
|---|---|
| **Microsoft Defender for Endpoint** | Microsoft 365 muhitidagi kompaniyalarda keng tarqalgan |
| **CrowdStrike Falcon**, **SentinelOne** | Yirik tijoriy yechimlar |
| **Elastic Defend** | Elastic Security tarkibida; laboratoriyada bepul ishlatish mumkin |
| **Wazuh** + **Sysmon** | To'liq EDR emas, lekin telemetriya va qoidalar uchun yaxshi bepul asos |
| **osquery**, **Velociraptor** | Ochiq kodli: qurilmalarni so'rov bilan tekshirish va tergov |

Laboratoriyangizda (Wazuh darsidagi tuzilma) Elastic Defend'ni yoki Wazuh + Sysmon kombinatsiyasini sinab ko'ring. Asosiy maqsad — jarayon daraxtini o'qishni mashq qilish.

## EDR nimani qilmaydi

- **Agent yo'q joyni ko'rmaydi** — printerlar, eski serverlar, xodimlarning shaxsiy qurilmalari, ba'zi tarmoq qurilmalari. Ular uchun tarmoq loglari kerak (b1 bosqichi).
- **Istisnolar — ko'r nuqtalar.** Serverlarda unumdorlik uchun qo'shilgan keng istisnolar (butun papka yoki jarayon) hujumchi uchun tayyor yashirinish joyi.
- **O'zi ham nishon.** Hujumchilar EDR'ni o'chirishga urinadi. Himoya: **tamper protection** yoqilgan bo'lishi va **javob bermay qolgan agentlar** kuzatilishi (Splunk darsidagi "jim qolgan manbalar" so'rovi).
- **Hamma platformada bir xil chuqurlikda emas** — Linux va macOS telemetriyasi ko'pincha Windows'nikidan kamroq.
- **Odamsiz ishlamaydi** — ogohlantirishlarni kimdir triage qilishi kerak; aks holda EDR — qimmat log yig'uvchi.

:::try
**1. Normal daraxt.** O'z Windows kompyuteringizda Sysinternals'dan **Process Explorer**'ni yuklab oling va ishga tushiring (daraxt ko'rinishida). Toping: `wininit.exe` ning bolalari kimlar? `lsass.exe` nechta? `svchost.exe` ning otasi kim? `explorer.exe` ning otasi ko'rinadimi — nega?

**2. Tarqalganlik fikri.** Quyidagi uch fayldan qaysi biri eng shubhali va nega?
- (a) `C:\Program Files\Zoom\bin\Zoom.exe` — imzolangan, 2 400 qurilmada, 2 yildan beri.
- (b) `C:\Users\b.toshev\AppData\Local\Temp\upd_x64.exe` — imzosiz, 1 qurilmada, 20 daqiqa oldin paydo bo'lgan.
- (c) `C:\Windows\System32\certutil.exe` — Microsoft imzosi, barcha qurilmalarda.

**3. LOLBAS.** lolbas-project.github.io saytida `certutil.exe` va `mshta.exe` sahifalarini oching. Har biri uchun qaysi suiiste'mol toifalari (Download, Execute, Encode…) ko'rsatilgan? Har biriga mos bitta aniqlash g'oyasini (ota-jarayon, argument yoki tarmoq bo'yicha) o'z so'zingiz bilan yozing.

**4. TryHackMe** — "Intro to Endpoint Security" xonasini bajaring.

*Javoblar: 1 — `wininit.exe` → `services.exe`, `lsass.exe` (va ba'zan boshqalar); `lsass.exe` — bitta; `svchost.exe` ning otasi — `services.exe`; `explorer.exe` ning otasi (`userinit.exe`) ishini tugatgani uchun ota "mavjud bo'lmagan jarayon" sifatida ko'rinadi — bu normal. 2 — (b): imzosiz, yagona, yangi, Temp papkasida. (c) o'zi normal — uning **qanday ishlatilgani** muhim.*
:::

## Xulosa

- **AV** — fayl ma'lum zararlimi? **EDR** — qurilmada nima bo'lyapti va bu normalmi? **XDR** — butun muhit bo'ylab; **MDR** — xizmat.
- EDR telemetriyasi: jarayonlar, tarmoq, DNS, fayllar, registr, modullar, jarayonlararo murojaat, skriptlar — Sysmon'dan kengroq, aniqlash va javob bilan.
- Fayl konteksti: **imzo, tarqalganlik, birinchi ko'rilgan vaqt, obro'**.
- **Normal daraxtni bilish** — g'ayritabiiyni ko'rishning sharti: `services.exe → svchost.exe`, bitta `lsass.exe`, tizim fayllari faqat `System32` da.
- **LOLBins** — qonuniy, imzolangan tizim dasturlarining suiiste'moli; aniqlash kontekst bilan, eng yaxshi himoya — cheklash (application control).
- Javob: ajratish, jarayonni to'xtatish, karantin, bloklash, triage paketi — **avval dalil, keyin chora**.
- EDR agent yo'q joyni ko'rmaydi, istisnolar — ko'r nuqtalar, agentning o'zi ham nishon.

:::quiz
? Dars boshidagi hujumda antivirus nega jim qoldi?
- Antivirus o'chirilgan edi
+ Zanjirdagi dasturlar qonuniy va imzolangan; zararli narsa fayllarda emas, xatti-harakatda edi
- Hujum juda tez bo'ldi
- Antivirus faqat Linux'da ishlaydi
! Klassik AV fayllarni imzolar bo'yicha tekshiradi; xatti-harakat zanjirini ko'rish uchun EDR kerak.

? EDR'ning klassik antivirusdan asosiy farqi nima?
+ Qurilmadagi faoliyatni doimiy yozib boradi, xulq bo'yicha aniqlaydi va masofaviy javob choralarini beradi
- U faqat fayl xeshlarini tekshiradi
- U internet tezligini oshiradi
- U parollarni boshqaradi
! Detection + Response: telemetriya va tahlil, keyin ajratish, to'xtatish, karantin.

? Fayl tarqalganligi (prevalence) nima uchun foydali?
- U faylning hajmini ko'rsatadi
+ Faqat bitta qurilmada, yaqinda paydo bo'lgan fayl ming qurilmada yillar davomida bor fayldan ancha shubhali
- U faylni avtomatik o'chiradi
- U faqat Linux fayllari uchun
! Korporativ dasturlar ko'p qurilmada bo'ladi; yagona va yangi fayl — e'tiborga loyiq.

? Normal Windows'da svchost.exe ning otasi qaysi jarayon?
- explorer.exe
+ services.exe
- WINWORD.EXE
- lsass.exe
! svchost.exe xizmatlarni ishga tushiradi va uning otasi services.exe bo'ladi; boshqa ota — shubhali belgi.

? Nega oddiy dasturning lsass.exe xotirasiga murojaati muhim aniqlash belgisi?
- lsass.exe brauzer tarixini saqlaydi
+ lsass.exe tizimga kirgan foydalanuvchilarning hisob ma'lumotlarini xotirada saqlaydi
- lsass.exe tarmoqni boshqaradi
- Bu muhim emas
! Hisob ma'lumotlarini o'g'irlash — ko'p hujumlarning asosiy qadami; shuning uchun bu murojaat kuzatiladi.

? LOLBins nima?
- Yangi turdagi zararli dastur
+ Tizimda allaqachon mavjud, imzolangan qonuniy dasturlar — hujumchilar ularni suiiste'mol qiladi
- Antivirus imzolari
- Tarmoq protokoli
! Ular ishonchli va hamma joyda bor, shuning uchun hujumchiga o'z dasturini olib kelish shart bo'lmaydi.

? Qaysi qoida LOLBins uchun eng yaxshi?
- certutil.exe ishga tushsa — har doim ogohlantirish
+ certutil.exe buyruq satrida internet manzili bo'lsa va oddiy foydalanuvchi kompyuterida ishga tushsa
- Barcha imzolangan dasturlarni e'tiborsiz qoldirish
- Faqat fayl nomi bo'yicha ogohlantirish
! Kontekstsiz qoida shovqin chiqaradi; argument, kim va qayerdan — muhim.

? Shubhali jarayon topildi. To'g'ri tartib qaysi?
- Darhol jarayonni o'ldirish va qurilmani qayta yuklash
+ Avval dalillarni saqlash (daraxt, xotira, triage paketi), keyin chora — ko'pincha avval qurilmani ajratish
- Hech narsa qilmaslik
- Faylni o'z kompyuteringizga ko'chirib ochish
! Jarayonni o'ldirish yoki qayta yuklash xotiradagi dalillarni yo'q qiladi; ajratish hujumchini to'xtatadi va dalilni saqlaydi.

? LOLBins hujumlariga qarshi eng samarali qatlam qaysi?
- Faqat ko'proq ogohlantirish qoidalari
+ Application control bilan keraksiz tizim vositalarini oddiy foydalanuvchilar uchun cheklash
- Antivirusni o'chirish
- Internetni butunlay o'chirish
! Aniqlash — oxirgi qatlam; foydalanib bo'lmaydigan vosita bilan hujum ham bo'lmaydi.

? Qaysi holat EDR uchun ko'r nuqta?
+ Unumdorlik uchun butun papka yoki jarayon istisno qilingan server
+ EDR agenti o'rnatilmagan printer va eski serverlar
- Agent o'rnatilgan, istisnosiz xodim kompyuteri
- Tamper protection yoqilgan qurilma
! Agent yo'q joy va keng istisnolar — EDR ko'rmaydigan joylar; ular uchun tarmoq loglari va tor istisnolar kerak.
:::

:::cards
AV, EDR, XDR, MDR? :: AV — fayl ma'lum zararlimi; EDR — qurilmadagi xulq va javob; XDR — butun muhit; MDR — EDR/XDR'ni tashqi SOC kuzatadigan xizmat.
EDR telemetriyasi? :: Jarayonlar, tarmoq, DNS, fayllar, registr, modullar, jarayonlararo murojaat, skriptlar, foydalanuvchi faoliyati.
Fayl konteksti? :: Imzo, tarqalganlik (nechta qurilmada), birinchi ko'rilgan vaqt, obro'.
Normal svchost.exe? :: Otasi services.exe, yo'li C:\Windows\System32, -k parametri bilan, ko'p nusxa.
Normal lsass.exe? :: Faqat bitta nusxa, otasi wininit.exe; oddiy dasturlarning unga murojaati shubhali.
Shubhali jarayon daraxti naqshlari? :: G'alati ota (Word → PowerShell), g'alati joy (Temp, AppData), uzun zanjir, chuqurlikda tarmoq, razvedka buyruqlari to'plami.
LOLBins? :: Hujumchilar suiiste'mol qiladigan qonuniy, imzolangan tizim dasturlari; katalog — LOLBAS (Windows), GTFOBins (Linux).
LOLBins'ni qanday aniqlash kerak? :: Kontekst bilan: argumentlar, foydalanuvchi, ota-jarayon, tarmoq ulanishi — dastur nomining o'zi emas.
LOLBins'ga qarshi eng yaxshi himoya? :: Application control (WDAC, AppLocker), PowerShell Constrained Language Mode, internetdan kelgan makroslarni o'chirish.
EDR javob choralari? :: Qurilmani ajratish, jarayonni to'xtatish, karantin, xesh bo'yicha bloklash, triage paketi, live response.
Javobdagi asosiy tartib? :: Avval dalil, keyin chora: ajratish dalilni saqlaydi, jarayonni o'ldirish va qayta yuklash — yo'q qiladi.
EDR ko'r nuqtalari? :: Agent yo'q qurilmalar, keng istisnolar, o'chirilgan yoki javob bermayotgan agentlar.
:::
