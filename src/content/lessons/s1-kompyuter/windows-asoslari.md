Xavfsizlik vositalarining ko'pi Linux'da ishlaydi, lekin **himoya qilinadigan kompyuterlarning ko'pi — Windows**. Buxgalterning noutbuki, direktorning kompyuteri, kompaniyaning butun ichki tarmog'i. Hujumchi birinchi bo'lib aynan shularga kiradi, SOC analitigi aynan shularning jurnallarini o'qiydi.

Siz Windows'dan yillar davomida foydalangansiz. Endi unga boshqa ko'z bilan — mutaxassis ko'zi bilan qaraymiz.

## Tizim qayerda yashaydi

Avval xarita. Windows'da hamma narsaning o'z joyi bor:

| Papka | Nima bor | Nega muhim |
|---|---|---|
| `C:\Windows` | Operatsion tizimning o'zi | Tegmaslik kerak bo'lgan joy |
| `C:\Windows\System32` | Tizim dasturlari va kutubxonalari | Hujumchilar o'z faylini shu yerdagi nomlarga o'xshatadi |
| `C:\Program Files` | O'rnatilgan dasturlar (64-bit) | |
| `C:\Users\<ism>` | Foydalanuvchining shaxsiy fayllari | Hujjatlar, yuklamalar, ish stoli |
| `C:\Users\<ism>\AppData` | Dasturlarning foydalanuvchiga oid ma'lumotlari | **Yashirin.** Brauzer parollari, kesh — va zararli dasturlarning sevimli joyi |
| `C:\Windows\Temp` | Vaqtinchalik fayllar | Zararli fayllar ko'p tushadigan joy |

`AppData` ga e'tibor bering: u standart holatda ko'rinmaydi va oddiy foydalanuvchi unga administrator huquqisiz yoza oladi. Shu ikki xususiyat uni hujumchi uchun ideal yashirinish joyiga aylantiradi.

## Foydalanuvchilar, guruhlar va UAC

O'tgan darsdan bilasiz: Windows'da uch daraja bor.

- **Standard user** — o'z fayllari bilan ishlaydi, tizimni o'zgartira olmaydi.
- [[administrator|Administrator]] — dastur o'rnatadi, sozlamalarni o'zgartiradi, boshqalarning fayllarini ko'radi.
- **SYSTEM** — operatsion tizimning o'z hisobi. Administratordan ham yuqori. Unga odam sifatida kirib bo'lmaydi, lekin ko'p xizmatlar shu nomdan ishlaydi.

Foydalanuvchilar **guruhlarga** birlashtiriladi va huquqlar odatda guruhga beriladi. Eng muhimi — `Administrators` guruhi: unga kirgan har kim administrator.

### UAC

Dastur o'rnatayotganingizda ekran qorayib, "Bu dasturga o'zgartirish kiritishga ruxsat berasizmi?" degan oyna chiqadi. Bu — [[uac|UAC]] (User Account Control).

G'oyasi shunday: siz administrator bo'lsangiz ham, dasturlaringiz odatda **oddiy huquqda** ishlaydi. Biror dastur haqiqiy administrator huquqini so'rasa — tizim sizdan tasdiq oladi.

:::warn
UAC oynasini o'qimasdan "Ha" bosish — uni o'chirib qo'yish bilan barobar. Oyna kutilmaganda, siz hech narsa o'rnatmayotgan paytda chiqdimi? Bu — nimadir sizning nomingizdan administrator huquqini olmoqchi degani. "Yo'q" bosing.
:::

## Mutaxassisning besh oynasi

Quyidagi vositalar Windows'ning o'zida bor. Ularning har birini hozir ochib ko'ring — nomini `Win + R` oynasiga yozing.

| Vosita | Qanday ochiladi | Nima ko'rsatadi |
|---|---|---|
| **Task Manager** | `Ctrl + Shift + Esc` | Jarayonlar, resurslar, avtomatik ishga tushadigan dasturlar |
| **Services** | `services.msc` | Fonda ishlaydigan barcha xizmatlar |
| **Event Viewer** | `eventvwr.msc` | Tizim jurnallari |
| **Registry Editor** | `regedit` | Sozlamalar bazasi |
| **Computer Management** | `compmgmt.msc` | Foydalanuvchilar, guruhlar, disklar, rejalashtirilgan vazifalar |

### Xizmatlar

[[service|Xizmat]] — fonda, oynasiz ishlaydigan dastur. `services.msc` da har birining nomi, holati, **ishga tushish turi** (Automatic — tizim bilan birga) va **qaysi hisobdan** ishlashi ko'rinadi.

Ko'p xizmatlar SYSTEM nomidan ishlaydi. Agar shunday xizmatning dastur faylini oddiy foydalanuvchi almashtira olsa — u o'z kodini SYSTEM huquqida ishlatadi. Bu Windows'da imtiyozni oshirishning eng klassik yo'llaridan biri.

### Event Viewer — tizimning xotirasi

Windows deyarli har bir muhim hodisani jurnalga yozadi. **Windows Logs** ostida uchta asosiy jurnal bor:

- **Security** — kirishlar, chiqishlar, huquqlardan foydalanish. Eng muhimi.
- **System** — tizim va xizmatlar hodisalari.
- **Application** — dasturlar hodisalari.

Har bir hodisaning raqami — **Event ID** bor. Ikkitasini hoziroq eslab qoling, SOC ishida ular har kuni uchraydi:

| Event ID | Ma'nosi |
|---|---|
| **4624** | Tizimga muvaffaqiyatli kirildi |
| **4625** | Kirishga urinish muvaffaqiyatsiz |

Bir daqiqada yuzlab 4625, keyin bitta 4624 — parol terib topilganining izi.

### Registry

[[registry|Registry]] (reyestr) — Windows va dasturlarning sozlamalari saqlanadigan ulkan ierarxik baza. Papkalarga o'xshash **kalitlar** va ularning ichidagi **qiymatlardan** iborat.

Ikki asosiy bo'lim:

- `HKEY_LOCAL_MACHINE` (**HKLM**) — butun kompyuterga tegishli sozlamalar. O'zgartirish uchun administrator kerak.
- `HKEY_CURRENT_USER` (**HKCU**) — hozirgi foydalanuvchining sozlamalari. O'zi o'zgartira oladi.

Xavfsizlik uchun eng mashhur joy:

```
HKCU\Software\Microsoft\Windows\CurrentVersion\Run
HKLM\Software\Microsoft\Windows\CurrentVersion\Run
```

Bu kalitlarga yozilgan dasturlar foydalanuvchi tizimga **har kirganida avtomatik ishga tushadi**. Zararli dastur kompyuter o'chirib yoqilgandan keyin ham "tirik" qolishining eng oddiy usuli — o'zini shu yerga yozib qo'yish. Buni **persistence** (mustahkam o'rnashish) deyiladi.

:::warn
Reyestrni **ko'ring, lekin o'zgartirmang**. Noto'g'ri o'zgartirilgan bitta qiymat tizimni yuklanmaydigan qilib qo'yishi mumkin. Tajribalar uchun — virtual mashina va snapshot.
:::

## Buyruqlar satri: CMD

Sichqoncha bilan bitta kompyuterni boshqarsa bo'ladi. Yuzta kompyuterni yoki masofadagi serverni — faqat buyruqlar bilan. Hujumchi ham tizimga kirganda ko'pincha faqat buyruqlar satriga ega bo'ladi.

**CMD** (Command Prompt) — Windows'ning eski, sodda buyruq qobig'i. `Win + R` → `cmd`.

| Buyruq | Nima qiladi | Linux'dagi o'xshashi |
|---|---|---|
| `dir` | Katalog ichidagilarni ko'rsatadi | `ls` |
| `cd papka` | Katalogni almashtiradi | `cd` |
| `type fayl.txt` | Fayl mazmunini chiqaradi | `cat` |
| `copy`, `move`, `del` | Nusxalash, ko'chirish, o'chirish | `cp`, `mv`, `rm` |
| `whoami` | Men kimman? | `whoami` |
| `hostname` | Kompyuter nomi | `hostname` |
| `ipconfig` | Tarmoq sozlamalari | `ip a` |
| `tasklist` | Ishlayotgan jarayonlar | `ps` |
| `netstat -ano` | Tarmoq ulanishlari va portlar | `ss -tulpn` |
| `net user` | Foydalanuvchilar ro'yxati | `cat /etc/passwd` |
| `systeminfo` | Tizim haqida to'liq ma'lumot | `uname -a` |

Bu jadval tasodifiy emas: `whoami`, `hostname`, `ipconfig`, `net user`, `systeminfo` — hujumchi yangi tizimga kirgan zahoti yozadigan birinchi buyruqlar. U "qayerdaman va kimman?" degan savolga javob qidiradi. Himoyachi esa aynan shu buyruqlar ketma-ketligini jurnalda ko'rib, hujumni taniydi.

## PowerShell

[[powershell|PowerShell]] — Windows'ning zamonaviy va ancha kuchli qobig'i. `Win + R` → `powershell`.

Uning buyruqlari **cmdlet** deyiladi va `Fe'l-Ot` shaklida yoziladi — nomidan nima qilishi tushunarli:

```powershell
Get-Process                    # jarayonlar
Get-Service                    # xizmatlar
Get-ChildItem C:\Users         # katalog ichidagilar (dir, ls ham ishlaydi)
Get-Content fayl.txt           # fayl mazmuni
Get-LocalUser                  # lokal foydalanuvchilar
Get-Help Get-Process           # yordam
```

PowerShell'ning asosiy kuchi — **pipeline** (`|`): bir buyruq natijasini keyingisiga uzatish.

```powershell
Get-Process | Sort-Object CPU -Descending | Select-Object -First 5
```

"Jarayonlarni ol → protsessor sarfi bo'yicha saralab → eng yuqori beshtasini ko'rsat."

```powershell
Get-Service | Where-Object Status -eq "Running"
```

"Xizmatlarni ol → faqat ishlab turganlarini qoldir."

:::info
PowerShell har bir Windows'da bor, juda kuchli va unga tizim ishonadi. Shu uch sababga ko'ra uni hujumchilar ham juda yaxshi ko'radi: begona dastur olib kirish o'rniga tizimning o'z vositasidan foydalanadi. Bu usul **“living off the land”** deyiladi. Shuning uchun PowerShell'ni bilish ikkala tomon uchun ham majburiy.
:::

## O'rnatilgan himoya

Windows'ning o'zida uchta asosiy himoya vositasi bor:

- **Microsoft Defender** — [[antivirus|antivirus]]. Zamonaviy versiyalari ancha kuchli.
- **Windows Firewall** — tarmoq ulanishlarini filtrlaydi ([[firewall|firewall]]).
- **Windows Update** — tuzatishlarni o'rnatadi.

Ko'p hujumlarning birinchi qadami — aynan shularni o'chirishga urinish. Shuning uchun "Defender o'chirildi" degan hodisa SOC uchun jiddiy signal.

:::try
Quyidagilarni **o'z kompyuteringizda** bajaring — hammasi xavfsiz, faqat ma'lumot ko'rsatadi.

CMD'da:

```
whoami
hostname
ipconfig
net user
tasklist
```

PowerShell'da:

```powershell
Get-Service | Where-Object Status -eq "Running"
Get-Process | Sort-Object WorkingSet -Descending | Select-Object -First 5
```

Keyin Task Manager → **Startup apps** yorlig'ini oching: tizim bilan birga nimalar ishga tushyapti? Hammasini taniysizmi?
:::

## Xulosa

- Himoya qilinadigan kompyuterlarning ko'pi — Windows.
- `AppData` va `Temp` — yashirin va yoziladigan joylar; zararli fayllar ko'pincha shu yerda.
- Uch daraja: Standard user → Administrator → **SYSTEM**. **UAC** huquq oshirilishidan oldin tasdiq so'raydi.
- Beshta vosita: Task Manager, Services, Event Viewer, Registry Editor, Computer Management.
- **Event ID 4624** — muvaffaqiyatli kirish, **4625** — muvaffaqiyatsiz.
- Registry'dagi **Run** kalitlari — avtomatik ishga tushish, ya'ni persistence joyi.
- `whoami`, `ipconfig`, `net user`, `systeminfo` — hujumchining ham, himoyachining ham birinchi buyruqlari.
- **PowerShell** — `Fe'l-Ot` cmdlet'lar va pipeline; hujumchilar ham sevadi.

:::quiz
? Windows'da muvaffaqiyatsiz kirish urinishi qaysi Event ID bilan yoziladi?
- 4624
+ 4625
- 4688
- 7045
! 4625 — muvaffaqiyatsiz kirish, 4624 — muvaffaqiyatli. Ko'p 4625 dan keyin kelgan 4624 — parol terib topilgan bo'lishi mumkin.

? Zararli dastur o'zini `HKCU\Software\Microsoft\Windows\CurrentVersion\Run` kalitiga yozdi. Maqsadi nima?
- Antivirusni o'chirish
- Administrator huquqini olish
+ Foydalanuvchi tizimga har kirganida avtomatik ishga tushish
- Fayllarni shifrlash
! Run kalitlaridagi dasturlar foydalanuvchi kirganida avtomatik ishga tushadi. Bu persistence — kompyuter qayta yoqilgandan keyin ham saqlanib qolish usuli.

? Hech narsa o'rnatmayotgan paytingizda kutilmaganda UAC oynasi chiqdi. Nima qilish kerak?
- “Ha” bosish — tizim o'zi biladi
+ “Yo'q” bosish va nima so'rayotganini tekshirish
- Kompyuterni o'chirib yoqish
- UAC'ni o'chirib qo'yish
! Kutilmagan UAC — nimadir sizning nomingizdan administrator huquqini so'rayapti. Sababini bilmasangiz, rad eting.

? Windows'dagi qaysi hisob eng yuqori huquqqa ega?
- Standard user
- Administrator
+ SYSTEM
- Guest
! SYSTEM — operatsion tizimning o'z hisobi, u administratordan ham yuqori. Ko'p xizmatlar shu nomdan ishlaydi.

? Nega `C:\Users\<ism>\AppData` papkasi zararli dasturlar uchun qulay?
+ U standart holatda yashirin
+ Unga yozish uchun administrator huquqi kerak emas
- U antivirus tomonidan hech qachon tekshirilmaydi
- Undagi fayllar avtomatik SYSTEM huquqida ishlaydi
! AppData yashirin va oddiy foydalanuvchi yoza oladigan joy. Lekin antivirus uni tekshiradi va undagi fayllar foydalanuvchi huquqida ishlaydi.

? Qaysi PowerShell buyrug'i faqat ishlab turgan xizmatlarni ko'rsatadi?
- Get-Process | Running
- Get-Service -Only Running
+ Get-Service | Where-Object Status -eq "Running"
- Show-Service Running
! Get-Service barcha xizmatlarni beradi, pipeline orqali Where-Object ularni holati bo'yicha filtrlaydi.

? Hujumchi tizimga kirgach `whoami`, `hostname`, `ipconfig`, `net user` buyruqlarini ketma-ket yozdi. U nima qilyapti?
- Tizimni buzyapti
- Ma'lumotlarni o'chiryapti
+ Qayerda ekanini va kim sifatida kirganini aniqlayapti (razvedka)
- Parolni o'zgartiryapti
! Bu birlamchi razvedka buyruqlari: foydalanuvchi, kompyuter nomi, tarmoq va boshqa hisoblar. Himoyachi aynan shu ketma-ketlikni jurnalda qidiradi.

? “Living off the land” nimani anglatadi?
- Zararli dasturni internetdan yuklab olish
+ Hujumda tizimning o'zida mavjud qonuniy vositalardan (masalan, PowerShell) foydalanish
- Kompyuterni jismonan o'g'irlash
- Faqat Linux tizimlariga hujum qilish
! Hujumchi begona dastur olib kirmaydi — tizim ishonadigan o'rnatilgan vositalarni ishlatadi, shuning uchun uni aniqlash qiyinroq.
:::

:::cards
Event ID 4624 va 4625 nimani bildiradi? :: 4624 — tizimga muvaffaqiyatli kirish; 4625 — muvaffaqiyatsiz kirish urinishi.
Windows'dagi uch huquq darajasi? :: Standard user → Administrator → SYSTEM (eng yuqori, tizimning o'z hisobi).
UAC nima? :: User Account Control — dastur administrator huquqini so'raganda foydalanuvchidan tasdiq oladigan mexanizm.
Registry'dagi Run kalitlari nima uchun muhim? :: Ularga yozilgan dasturlar foydalanuvchi har kirganida avtomatik ishga tushadi — zararli dasturlar persistence uchun ishlatadi.
HKLM va HKCU farqi? :: HKLM — butun kompyuter sozlamalari (administrator kerak); HKCU — hozirgi foydalanuvchi sozlamalari.
Xizmatlar, jurnallar va reyestr qaysi buyruqlar bilan ochiladi? :: services.msc, eventvwr.msc, regedit
Windows'da tarmoq sozlamalari va ochiq ulanishlarni ko'rsatadigan buyruqlar? :: ipconfig va netstat -ano
PowerShell cmdlet'lari qanday shaklda nomlanadi? :: Fe'l-Ot: Get-Process, Get-Service, Get-Content.
Living off the land nima? :: Hujumda begona dastur o'rniga tizimning o'z qonuniy vositalaridan foydalanish.
Persistence nima? :: Hujumchining tizimda qayta yuklanishdan keyin ham saqlanib qolish usuli.
:::
