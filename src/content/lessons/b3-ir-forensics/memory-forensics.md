Diskda hech narsa topilmadi. Shubhali fayl yo'q, yangi dastur o'rnatilmagan, antivirus jim. Lekin tarmoq loglari aniq ko'rsatmoqda: shu kompyuter har daqiqada C2 serveriga ulanmoqda.

Qaysi dastur? `explorer.exe` — oddiy Windows Explorer, Microsoft imzosi bilan, to'g'ri papkada. Faqat uning **xotirasi ichida** — u yerga hech qachon tegishli bo'lmagan begona kod yashamoqda. Bu kod diskka hech qachon yozilmagan; kompyuter o'chsa, iz qoldirmay yo'qoladi.

Dalil yig'ish darsida xotira nusxasini nega birinchi olish kerakligini o'rgandingiz. Endi o'sha nusxadan nima topish mumkinligini ko'rasiz. Asosiy vosita — **Volatility**.

## Nega xotira tahlili

| Diskda yo'q, xotirada bor | Misol |
|---|---|
| **Faylsiz** zararli dasturlar | PowerShell orqali yuklanib, faqat xotirada ishlaydigan kod |
| **Kod in'ektsiyasi** | Qonuniy jarayon ichiga joylangan begona kod |
| **Yashirilgan jarayonlar** | Rootkit ro'yxatlardan olib tashlagan jarayonlar |
| Faol **tarmoq ulanishlari** | Hozirgi C2 aloqasi, qaysi jarayondan |
| **Ochilgan** skriptlar va buyruqlar | Diskda kodlangan, xotirada ochiq holda |
| Buyruq satri argumentlari | Jarayon qanday parametrlar bilan ishga tushgani |

Va eng muhimi: **rootkit xotira tasvirida yashirina olmaydi**. Ishlab turgan tizimda rootkit `tasklist` yoki `netstat` ga yolg'on gapira oladi (dalil yig'ish darsi). Lekin xotira tasviri — fayl; uni toza tizimda tahlil qilasiz, va u yerda hujumchi kodi ishlamaydi.

## Volatility 3

**Volatility** — xotira tahlili uchun eng mashhur ochiq kodli vosita (Python). Hozirgi versiyasi — **Volatility 3**; eski Volatility 2 bilan buyruqlar sintaksisi farq qiladi — internetdagi qo'llanmalarni o'qiganda qaysi versiya ekaniga e'tibor bering.

```bash
# O'rnatish (laboratoriya VM'ida, masalan REMnux yoki Ubuntu)
pip install volatility3

# Umumiy ko'rinish: buyruq + xotira fayli + plagin
vol -f xotira.raw windows.info
```

Volatility xotiradagi ma'lumot tuzilmalarini tushunish uchun **simvollar jadvali** (symbols) dan foydalanadi. Windows uchun u ularni Microsoft serveridan avtomatik yuklaydi — birinchi ishga tushirishda internet kerak bo'lishi mumkin. Linux uchun simvollar har bir yadro versiyasi uchun alohida tayyorlanadi — bu ancha murakkabroq.

`windows.info` — birinchi buyruq: Windows versiyasi, arxitektura va tasvir olingan **vaqt**. Agar bu ishlamasa, keyingi plaginlar ham ishlamaydi.

## Asosiy plaginlar

| Plagin | Nimani ko'rsatadi | Savol |
|---|---|---|
| `windows.pslist` | Jarayonlar ro'yxati (rasmiy ro'yxatdan) | Nima ishlayapti? |
| `windows.pstree` | Jarayonlar daraxti | Kim kimni ishga tushirgan? |
| `windows.psscan` | Xotiradan jarayon tuzilmalarini qidiradi | Yashirilgan yoki tugagan jarayonlar bormi? |
| `windows.cmdline` | Har bir jarayonning buyruq satri | Qanday argumentlar bilan? |
| `windows.netscan` | Tarmoq ulanishlari va tinglayotgan portlar | Kim qayerga ulangan? |
| `windows.dlllist` | Jarayon yuklagan DLL'lar | G'alati kutubxonalar bormi? |
| `windows.handles` | Jarayon ochgan fayllar, registr kalitlari va boshqalar | Nimaga murojaat qilyapti? |
| `windows.malfind` | In'ektsiya qilingan kod belgilari | Begona kod bormi? |
| `windows.svcscan` | Xizmatlar | Yangi yoki g'alati xizmat bormi? |
| `windows.filescan` | Xotiradagi fayl obyektlari | Qaysi fayllar ochilgan? |
| `windows.registry.printkey` | Xotiradagi registr kalitlari | Run kalitlarida nima bor? |

Plaginlar ro'yxati va parametrlari: `vol -h` va `vol windows.pslist -h`.

## Tahlil tartibi

b3 bosqichidagi barcha tahlillar singari — **umumiydan xususiyga**, va doim **normal bilan solishtirib**. EDR darsidagi Windows jarayonlarining normal daraxtini eslang.

### 1. Jarayonlar va daraxt

```bash
vol -f xotira.raw windows.pstree
```

Taxminiy natija (qisqartirilgan):

```
PID    PPID   ImageFileName     CreateTime
4      0      System            2026-11-16 08:01:02
* 392  4      smss.exe          2026-11-16 08:01:02
** 520 512    wininit.exe       2026-11-16 08:01:05
*** 640 520   services.exe      2026-11-16 08:01:05
**** 812 640  svchost.exe       2026-11-16 08:01:06
*** 652 520   lsass.exe         2026-11-16 08:01:05
...
* 3120 3088   explorer.exe      2026-11-16 08:03:40
** 4410 3120  OUTLOOK.EXE       2026-11-16 08:05:12
*** 5120 4410 WINWORD.EXE       2026-11-16 09:31:58
**** 6248 5120 powershell.exe   2026-11-16 09:32:14
** 6612 3120  svchost.exe       2026-11-16 09:32:18     ← otasi explorer.exe?!
```

Oxirgi qator darhol ko'zga tashlanadi: `svchost.exe` ning otasi `services.exe` emas, `explorer.exe`. EDR darsidagi qoida — bu **normal emas**. Yaratilgan vaqti esa `powershell.exe` dan 4 soniya keyin.

Tekshiriladigan narsalar:
- Otasi noto'g'ri jarayonlar (`svchost.exe`, `lsass.exe`, `services.exe` uchun).
- Bir nusxa bo'lishi kerak bo'lganlarning ko'p nusxasi (`lsass.exe`).
- Imlosi g'alati nomlar (`scvhost.exe`, `lsas.exe`).
- Yaratilgan vaqti insident vaqtiga mos keladigan jarayonlar.

### 2. Yashirilgan jarayonlar: pslist va psscan

Windows ishlayotgan jarayonlarni bog'langan ro'yxatda saqlaydi. `pslist` shu ro'yxatni o'qiydi. Rootkit jarayonni ro'yxatdan "uzib qo'yishi" mumkin — u ishlashda davom etadi, lekin ro'yxatda ko'rinmaydi.

`psscan` boshqacha ishlaydi: u butun xotirani jarayon tuzilmalarining **naqshi** bo'yicha skanerlaydi. Natijada ro'yxatdan yashirilgan jarayonlar ham, yaqinda tugagan jarayonlar ham topiladi.

```bash
vol -f xotira.raw windows.pslist > pslist.txt
vol -f xotira.raw windows.psscan > psscan.txt
# psscan'da bor, pslist'da yo'q PID'larni toping
```

`psscan` da bor, lekin `pslist` da yo'q jarayon — yo tugagan (ExitTime bor), yo **yashirilgan**. Ikkinchisi — juda kuchli belgi.

### 3. Buyruq satrlari

```bash
vol -f xotira.raw windows.cmdline --pid 6248 6612
```

```
6248  powershell.exe  powershell.exe -NoProfile -WindowStyle Hidden -enc <...>
6612  svchost.exe     C:\Users\d.karimova\AppData\Roaming\svchost.exe
```

Haqiqiy `svchost.exe` doim `C:\Windows\System32\svchost.exe -k <guruh>` ko'rinishida ishlaydi. Bu yerda — AppData'dan, `-k` siz. Sysmon darsidagi niqoblanish — endi xotiradan tasdiqlandi.

### 4. Tarmoq ulanishlari

```bash
vol -f xotira.raw windows.netscan
```

```
Proto  LocalAddr        LocalPort  ForeignAddr     ForeignPort  State        PID   Owner
TCPv4  10.10.10.23      52144      203.0.113.45    443          ESTABLISHED  6612  svchost.exe
TCPv4  10.10.10.23      52201      198.51.100.10   443          ESTABLISHED  3344  msedge.exe
TCPv4  0.0.0.0          135        0.0.0.0         0            LISTENING    812   svchost.exe
```

Birinchi qator — b1 bosqichidagi C2 manzili, endi **aniq jarayon raqami** bilan. Trafik tahlili darsida "qaysi jarayon?" degan savolga tarmoq loglari javob bera olmagan edi — xotira javob beradi.

Diqqat qiling: ichki manzil → tashqi manzil, `ESTABLISHED`, va jarayon — brauzer yoki ma'lum dastur emas.

### 5. Kod in'ektsiyasi: malfind

Dars boshidagi `explorer.exe` holati. Hujumchi o'z kodini qonuniy jarayon xotirasiga joylaydi — shunda kod ishonchli dastur nomidan ishlaydi va tarmoqqa uning nomidan chiqadi.

Normal dasturda bajariladigan kod diskdagi fayldan (`.exe` yoki `.dll`) yuklanadi va xotiraning "faqat o'qish va bajarish" sohasida turadi. In'ektsiya qilingan kod esa ko'pincha:
- diskdagi hech qanday faylga **bog'lanmagan** xotira sohasida joylashadi;
- bu soha bir vaqtda **yozish va bajarish** huquqiga ega (`PAGE_EXECUTE_READWRITE`);
- ba'zan boshida `MZ` sarlavhasi bor — xotiraga to'liq dastur joylangan.

`malfind` aynan shunday sohalarni qidiradi:

```bash
vol -f xotira.raw windows.malfind --pid 3120
```

```
PID   Process        Start VPN   End VPN     Protection               Hexdump
3120  explorer.exe   0x2a40000   0x2a5ffff   PAGE_EXECUTE_READWRITE   4d 5a 90 00 03 00 00 00 ...  MZ......
```

`explorer.exe` xotirasida, hech qanday faylga bog'lanmagan, yozish va bajarishga ruxsat berilgan sohada — `MZ` bilan boshlanadigan dastur. Bu — kod in'ektsiyasining klassik belgisi.

**False positive'lar:** brauzerlar, .NET va Java ilovalari kodni ish paytida yaratadi (JIT kompilyatsiya) va ular ham shunday sohalarga ega bo'lishi mumkin. Shuning uchun malfind natijasi — gipoteza (YARA darsidagi kabi): kontekst bilan tekshiring — qaysi jarayon, sohada nima bor, `MZ` bormi.

Shubhali sohani yoki jarayonni diskka chiqarib, keyin xesh, YARA va statik tahlil (shu bosqichdagi keyingi darslardan biri) bilan tekshirish mumkin:

```bash
vol -f xotira.raw -o chiqarilgan/ windows.malfind --pid 3120 --dump
vol -f xotira.raw -o chiqarilgan/ windows.pslist --pid 6612 --dump
```

### 6. Persistence va boshqalar

```bash
# Run kalitlari — xotiradagi registrdan
vol -f xotira.raw windows.registry.printkey --key "Software\Microsoft\Windows\CurrentVersion\Run"

# Xizmatlar
vol -f xotira.raw windows.svcscan

# Xotirani YARA qoidasi bilan skanerlash (b2 bosqichidagi YARA darsi)
vol -f xotira.raw windows.vadyarascan --yara-file qoida.yar
```

YARA darsidagi "qadoqlangan faylda satrlar yashirin, xotirada esa ochiq" degan fikr bu yerda amalda ishlaydi: diskda shifrlangan zararli dastur xotirada ochilgan holda turadi va YARA uni topadi.

:::key
**Xotira tahlilining asosiy savoli — "nima bu yerda bo'lmasligi kerak?"** Buning uchun normalni bilish shart: qaysi jarayon kimning bolasi, qayerdan ishga tushadi, nechta nusxada bo'ladi, qanday ulanishlar odatiy. SANS "Hunt Evil" plakati, EDR darsidagi daraxt va tajriba — sizning asosiy qurollaringiz. Va doim bir nechta belgini birlashtiring: g'alati ota + g'alati yo'l + tashqi ulanish + malfind natijasi = dalil. Har biri alohida — faqat gumon.
:::

## Linux xotirasi

Linux uchun xotira nusxasi LiME yoki AVML bilan olinadi (dalil yig'ish darsi). Volatility 3'da Linux plaginlari bor:

| Plagin | Nima |
|---|---|
| `linux.pslist`, `linux.pstree` | Jarayonlar |
| `linux.bash` | Xotiradagi **bash tarixi** — `.bash_history` o'chirilgan bo'lsa ham |
| `linux.lsof` | Ochiq fayllar |
| `linux.sockstat` | Tarmoq soketlari |
| `linux.check_syscall`, `linux.check_modules` | Rootkit belgilari |

Asosiy qiyinchilik — simvollar: har bir aniq yadro versiyasi uchun simvollar jadvali kerak va uni o'sha tizimdan olingan ma'lumotlardan tayyorlash kerak. Shuning uchun Linux xotira tahlili Windows'dagidan murakkabroq va tayyorgarlik (IR jarayoni darsi) talab qiladi.

`linux.bash` alohida e'tiborga loyiq: Linux darsida `.bash_history` ga ishonib bo'lmasligini aytgan edik — hujumchi uni o'chiradi. Lekin xotiradagi joriy bash jarayonlari tarixini saqlaydi.

## Boshqa manbalar va vositalar

| Manba yoki vosita | Izoh |
|---|---|
| `hiberfil.sys` | Uyqu rejimidagi xotira — disk tasvirida bo'lishi mumkin; maxsus vositalar bilan Volatility o'qiy oladigan formatga o'tkaziladi |
| `pagefile.sys` | Xotiraning bir qismi — to'liq emas, lekin qoldiqlar bor |
| VM xotira fayllari | Gipervizor snapshot'lari — dalil yig'ish darsi |
| **MemProcFS** | Xotira tasvirini virtual disk sifatida ochadi — jarayonlar papkalar ko'rinishida |
| **strings** | Eng oddiy usul: `strings -n 8 xotira.raw \| grep -i "example-cdn"` — IOC'lar bo'yicha tez qidiruv |

Oxirgi qator — b1 bosqichidagi `grep` yana yordamga keladi: Volatility ishlamasa ham, xom xotiradan domen, IP yoki buyruq qidirish mumkin.

## Xotira tahlili nimani qilmaydi

- **Nusxa olinmagan xotirani tiklamaydi** — kompyuter o'chirilgan bo'lsa, xotira yo'q (hiberfil va pagefile — qisman istisno).
- **O'tmishni to'liq ko'rsatmaydi** — xotira — bir lahzalik surat; tugagan jarayonlarning ko'pi allaqachon izsiz.
- **Simvollarsiz ishlamaydi** — ayniqsa Linux'da.
- **Avtomatik hukm chiqarmaydi** — malfind va boshqa plaginlar false positive beradi; talqin — tahlilchi ishi.
- **Nusxa olish paytida ham tizim o'zgaradi** — nusxa olish vositasining o'zi xotirada joy egallaydi; buni hujjatlashtiring.

:::try
**1. Tayyor tasvir bilan.** TryHackMe'dagi "Volatility" xonasini yoki CyberDefenders'dagi xotira forensikasi topshiriqlaridan birini oching (tayyor xotira tasvirlari bilan). Quyidagi buyruqlarni ketma-ket bajaring va har biri nima ko'rsatganini yozing:

```bash
vol -f xotira.raw windows.info
vol -f xotira.raw windows.pstree
vol -f xotira.raw windows.netscan
vol -f xotira.raw windows.cmdline
vol -f xotira.raw windows.malfind
```

**2. Shubhalini toping.** `pstree` natijasida otasi noto'g'ri yoki joyi g'alati jarayonni toping. Uning PID'i bo'yicha `cmdline`, `netscan` va `malfind` natijalarini solishtiring. Hikoyani 3–4 jumlada yozing.

**3. O'z VM'ingizdan nusxa.** Laboratoriyadagi Windows VM'ni gipervizorda pauzaga qo'ying yoki snapshot oling va xotira faylini toping (VirtualBox, VMware va Hyper-V'da turlicha). Uni Volatility bilan oching — `windows.info` ishladimi? `windows.pslist` da Sysmon va Wazuh agentini (b2 bosqichi) topa olasizmi?

**4. Mantiq.** `psscan` natijasida bor, `pslist` da yo'q jarayon topildi; uning ExitTime maydoni bo'sh. Bu nimani anglatishi mumkin?

*Javoblar: 4 — jarayon tugamagan (ExitTime yo'q), lekin rasmiy ro'yxatdan olib tashlangan — rootkit tomonidan yashirilgan bo'lishi mumkin; bu juda kuchli belgi va chuqur tekshiruvni talab qiladi. Agar ExitTime bo'lsa — shunchaki tugagan jarayon.*
:::

## Xulosa

- Xotirada diskda yo'q narsalar bor: **faylsiz kod, in'ektsiya, yashirilgan jarayonlar, faol ulanishlar, ochilgan skriptlar**; rootkit tasvirda yashirina olmaydi.
- **Volatility 3**: `vol -f xotira.raw <plagin>`; birinchi — `windows.info`; Windows simvollari avtomatik yuklanadi.
- Jarayonlar: `pslist`, `pstree` (normal daraxt bilan solishtiring), `psscan` (yashirilgan va tugaganlar).
- `cmdline` — argumentlar va yo'l; `netscan` — ulanishlar **jarayon raqami bilan**.
- `malfind` — faylga bog'lanmagan, **yozish+bajarish** huquqli, ko'pincha `MZ` bilan boshlanadigan sohalar; JIT false positive'lari bor.
- `--dump` bilan chiqarib, xesh, YARA va statik tahlil; `vadyarascan` — xotirani YARA bilan skanerlash.
- Linux: `linux.bash` — o'chirilgan tarix xotirada; simvollar — asosiy qiyinchilik.
- Bir nechta belgi birgalikda — dalil; bittasi — gumon.

:::quiz
? Nega rootkit xotira tasvirida yashirina olmaydi?
- Rootkit xotirada ishlamaydi
+ Tasvir toza tizimda tahlil qilinadi — u yerda hujumchi kodi ishlamaydi va natijalarni o'zgartira olmaydi
- Volatility rootkit'larni avtomatik o'chiradi
- Rootkit faqat diskda yashaydi
! Ishlab turgan tizimda rootkit buyruqlarga yolg'on gapira oladi, lekin fayl ko'rinishidagi tasvirda — yo'q.

? Volatility'da birinchi qaysi plaginni ishga tushirish tavsiya etiladi?
+ windows.info
- windows.malfind
- windows.dumpfiles
- windows.handles
! U Windows versiyasi va tasvir vaqtini ko'rsatadi; u ishlamasa, boshqalar ham ishlamaydi.

? pslist va psscan farqi nima?
- Farqi yo'q
+ pslist rasmiy jarayonlar ro'yxatini o'qiydi; psscan xotiradan jarayon tuzilmalarini naqsh bo'yicha qidiradi — yashirilgan va tugaganlarni ham topadi
- psscan faqat Linux uchun
- pslist tarmoq ulanishlarini ko'rsatadi
! psscan'da bor, pslist'da yo'q va tugamagan jarayon — yashirilgan bo'lishi mumkin.

? pstree natijasida svchost.exe ning otasi explorer.exe. Bu nimani anglatadi?
- Bu normal
+ Bu normal emas — haqiqiy svchost.exe ning otasi services.exe; niqoblangan jarayon bo'lishi mumkin
- explorer.exe buzilgan
- Volatility xato qilgan
! Normal jarayon daraxtini bilish g'ayritabiiy holatlarni ko'rishning sharti.

? Qaysi plagin tarmoq ulanishlarini jarayon raqami bilan ko'rsatadi?
- windows.cmdline
+ windows.netscan
- windows.dlllist
- windows.svcscan
! Tarmoq loglari “qaysi jarayon?” savoliga javob bermaydi — xotira beradi.

? windows.malfind qanday xotira sohalarini qidiradi?
+ Diskdagi faylga bog'lanmagan, yozish va bajarish huquqiga ega, ko'pincha kod yoki MZ sarlavhasi bor sohalarni
- Faqat bo'sh sohalarni
- Faqat DLL fayllarini
- Faqat tarmoq buferlarini
! Bu kod in'ektsiyasining klassik belgilari.

? malfind brauzer jarayonida natija ko'rsatdi. To'g'ri yondashuv qaysi?
- Albatta zararli — darhol hisobot
+ Ehtiyotkorlik bilan tekshirish: brauzer va .NET ilovalari JIT tufayli shunday sohalar yaratadi; MZ, kontekst va boshqa belgilarni ko'rish
- E'tiborsiz qoldirish
- Volatility'ni qayta o'rnatish
! malfind natijasi — gipoteza; JIT false positive'lari keng tarqalgan.

? .bash_history o'chirilgan. Hujumchi buyruqlarini qayerdan topish mumkin?
- Hech qayerdan
+ Xotira tasvirida linux.bash plagini bilan
- Faqat Windows registridan
- Prefetch'dan
! Xotiradagi bash jarayonlari o'z tarixini saqlaydi.

? Diskda shifrlangan zararli dasturni topish uchun xotira qanday yordam beradi?
- Xotira shifrni buzadi
+ Ishlash uchun dastur xotirada ochiladi — u yerda YARA bilan (vadyarascan) satrlarini topish mumkin
- Xotirada dasturlar saqlanmaydi
- Faqat disk yordam beradi
! Qadoqlangan yoki shifrlangan kod ishga tushganda xotirada ochiq holda turadi.

? Nega Linux xotira tahlili Windows'nikidan murakkabroq?
+ Har bir aniq yadro versiyasi uchun alohida simvollar jadvali tayyorlanishi kerak
- Linux'da xotira yo'q
- Volatility Linux'ni qo'llamaydi
- Linux jarayonlari yashirin
! Windows simvollari avtomatik yuklanadi; Linux uchun ular oldindan tayyorlanadi.
:::

:::cards
Xotirada nima bor, diskda yo'q? :: Faylsiz kod, in'ektsiya qilingan kod, yashirilgan jarayonlar, faol ulanishlar, ochilgan skriptlar, buyruq satrlari.
Volatility 3 buyruq tuzilishi? :: vol -f xotira.raw <plagin> [parametrlar]; birinchi — windows.info.
pslist, pstree, psscan? :: pslist — rasmiy ro'yxat; pstree — daraxt; psscan — xotiradan naqsh bo'yicha (yashirilgan va tugaganlar).
windows.cmdline? :: Har bir jarayonning to'liq buyruq satri — yo'l va argumentlar.
windows.netscan? :: Tarmoq ulanishlari va tinglayotgan portlar, PID va jarayon nomi bilan.
windows.malfind? :: In'ektsiya belgilari: faylga bog'lanmagan, PAGE_EXECUTE_READWRITE, ko'pincha MZ bilan boshlanadigan sohalar.
malfind false positive'lari? :: Brauzerlar, .NET va Java — JIT kompilyatsiya tufayli shunday sohalar yaratadi.
Xotiradan faylni chiqarish? :: -o papka va --dump parametri bilan (masalan, windows.pslist yoki windows.malfind).
Xotirani YARA bilan skanerlash? :: windows.vadyarascan --yara-file qoida.yar — xotirada ochilgan satrlarni topadi.
linux.bash? :: Xotiradagi bash tarixi — .bash_history o'chirilgan bo'lsa ham.
Xotira tahlilining asosiy savoli? :: Nima bu yerda bo'lmasligi kerak? — normal daraxt, yo'llar va ulanishlar bilan solishtirish.
Xotira tahlili cheklovlari? :: Nusxa olinmagan xotira yo'q; bir lahzalik surat; simvollar kerak; avtomatik hukm yo'q.
:::
