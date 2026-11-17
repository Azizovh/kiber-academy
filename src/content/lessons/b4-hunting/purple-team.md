b2 bosqichida Sigma qoidasi yozdingiz: "Ofis dasturidan buyruq qobig'i ishga tushishi". ATT&CK Navigator'da T1059.001 katagi yashil bo'ldi. Siz himoyalanganmisiz?

Bilmaysiz. Qoida **yozilgan** — lekin u haqiqatan **ishlaydimi**? Maydon nomlari to'g'rimi? Log SIEM'ga yetib keladimi? Ogohlantirish to'g'ri odamga boradimi? ATT&CK darsidagi ogohlantirishni eslang: "yashil katak — himoyalanganmiz degani emas; qamrovni **sinov natijalari** bilan tasdiqlang."

Buni tekshirishning yagona ishonchli yo'li — texnikani **o'zingiz bajarib**, nima bo'lishini kuzatish. Bu — [[purple-team|purple team]] yondashuvi.

## Purple team nima

| Jamoa | Vazifasi |
|---|---|
| **Red team** | Hujumchi rolida: texnikalarni bajaradi, himoyani sinaydi |
| **Blue team** | Himoyachi rolida: aniqlaydi va javob beradi |
| **Purple team** | Ikkalasi **birgalikda**, ochiq: "men hozir T1053.005 ni bajaraman — siz ko'rdingizmi?" |

An'anaviy red team mashqi — maxfiy: blue team hujum qachon va qanday bo'lishini bilmaydi, oxirida hisobot keladi. Purple team esa — **hamkorlik**: har bir texnika bajarilgan zahoti natija muhokama qilinadi va kamchilik darhol tuzatiladi. Maqsad — "kim yutdi" emas, **aniqlashni yaxshilash**.

Kichik jamoada — yoki o'z laboratoriyangizda — siz ikkala rolni ham o'zingiz bajarasiz. Bu darsning maqsadi shu.

## Atomic Red Team

**Atomic Red Team** (Red Canary kompaniyasining ochiq loyihasi) — ATT&CK texnikalari bo'yicha **kichik, alohida sinovlar** ("atomic test") kutubxonasi. Har bir sinov:
- bitta aniq texnikani taqlid qiladi;
- qisqa va tushunarli (nima qilishi ochiq yozilgan);
- ko'pincha **tozalash** (cleanup) buyrug'iga ega — sinov izlarini olib tashlaydi.

Ularni boshqarish uchun **Invoke-AtomicRedTeam** PowerShell moduli bor.

:::warn
**Faqat izolyatsiyalangan laboratoriyada.** Atomic sinovlar haqiqiy hujumchi xatti-harakatlarini taqlid qiladi: hisob yaratadi, persistence o'rnatadi, jurnallarni tozalaydi. Ularni:
- faqat **o'zingizga tegishli laboratoriya VM'ida** (b2 bosqichidagi Wazuh laboratoriyasi) ishga tushiring — asosiy kompyuteringizda yoki ish tarmog'ida **hech qachon**;
- har bir sinovdan oldin **snapshot** oling;
- ishga tushirishdan oldin har bir sinovning **tafsilotlarini o'qing** (`-ShowDetails`) — ba'zilari tizimni o'zgartiradi yoki buzadi;
- ish joyida — faqat **yozma ruxsat** va kelishilgan reja bilan.

Antivirus va EDR sinovlarning ba'zilarini bloklashi kutiladi — bu ham natija (pastda).
:::

### O'rnatish va asosiy buyruqlar

O'rnatish uchun loyihaning rasmiy hujjatlaridagi (atomicredteam.io va Invoke-AtomicRedTeam GitHub wiki) yo'riqnomaga amal qiling — usul vaqti-vaqti bilan o'zgaradi. O'rnatilgandan keyin:

```powershell
Import-Module Invoke-AtomicRedTeam

# Texnika uchun mavjud sinovlar ro'yxati — qisqa
Invoke-AtomicTest T1547.001 -ShowDetailsBrief

# Sinov nima qilishini batafsil o'qish — ISHGA TUSHIRISHDAN OLDIN
Invoke-AtomicTest T1547.001 -TestNumbers 1 -ShowDetails

# Kerakli shartlar bajarilganmi?
Invoke-AtomicTest T1547.001 -TestNumbers 1 -CheckPrereqs

# Sinovni bajarish
Invoke-AtomicTest T1547.001 -TestNumbers 1

# Izlarni tozalash
Invoke-AtomicTest T1547.001 -TestNumbers 1 -Cleanup
```

`-ShowDetails` — eng muhim buyruq. Hech qachon tafsilotlarini o'qimagan sinovni ishga tushirmang — bu b1 bosqichidan beri takrorlanayotgan qoida: **nima qilayotganingizni tushunmasdan buyruq bajarmang**.

## Purple team mashqi — qadamlar

```
 1. Reja      — qaysi texnikalar? (ATT&CK bo'shliqlari, CTI, ov natijalari)
      ▼
 2. Kutish    — har bir texnika uchun: qaysi log, qaysi qoida ishlashi KERAK?
      ▼
 3. Bajarish  — snapshot → atomic sinov → vaqtni yozish
      ▼
 4. Kuzatish  — SIEM/EDR'da: bloklandimi? ogohlantirish chiqdimi? log bormi?
      ▼
 5. Natija    — jadvalga: bloklandi / ogohlantirish / faqat log / hech narsa
      ▼
 6. Tuzatish  — yetishmayotgan log yoki qoidani qo'shish
      ▼
 7. Qayta sinash — o'sha sinov yana → endi aniqlandimi?  ──► keyingi texnika
```

### Natija toifalari

| Natija | Ma'nosi | Keyingi qadam |
|---|---|---|
| **Bloklandi** | Himoya (EDR, application control) texnikani to'xtatdi | Yaxshi — lekin ogohlantirish ham chiqdimi? Bloklangan urinish ham signal |
| **Ogohlantirish** | Qoida ishladi, analitik xabardor bo'ldi | Ogohlantirishda kerakli kontekst bormi? (detection engineering darsi) |
| **Faqat log** | Hodisa SIEM'da bor, lekin qoida yo'q | **Qoida yozish** — eng tez va oson yutuq |
| **Hech narsa** | Log ham yo'q | **Ko'rinish bo'shlig'i** — avval log manbasini ulash yoki audit sozlamasini yoqish |

"Faqat log" — eng ko'p uchraydigan va eng qimmatli natija: ma'lumot allaqachon bor, faqat qoida yozish kerak. "Hech narsa" esa b2 bosqichidagi ATT&CK darsida gaplashgan **ma'lumot manbalari qamrovi** bo'shlig'ini aniq ko'rsatadi.

## Misol mashq: besh texnika

O'z laboratoriyangizda (Windows VM + Sysmon + Wazuh yoki Splunk) quyidagi texnikalarni sinab ko'ring. Ular nisbatan zararsiz va b1–b3 bosqichlarida batafsil o'rganilgan:

| Texnika | Nima kutiladi (log) | Qaysi dars |
|---|---|---|
| **T1136.001** — lokal hisob yaratish | Security 4720, Sysmon 1 (`net user /add`) | Windows Event loglari |
| **T1053.005** — rejalashtirilgan vazifa | Security 4698, Sysmon 1 (`schtasks /create`) | Threat hunting |
| **T1547.001** — Run kaliti | Sysmon 13 (`...\CurrentVersion\Run\...`) | Sysmon |
| **T1059.001** — PowerShell | Sysmon 1, PowerShell 4104 | Windows Event loglari |
| **T1070.001** — jurnalni tozalash | Security 1102 / System 104 | Windows Event loglari |

Mashq natijalari jadvali (misol):

| Texnika | Sinov | Vaqt (UTC) | Natija | Izoh | Harakat |
|---|---|---|---|---|---|
| T1136.001 | #1 | 10:02 | Ogohlantirish | Wazuh qoidasi ishladi | — |
| T1053.005 | #1 | 10:09 | **Faqat log** | Sysmon 1 bor, qoida yo'q | Sigma qoidasi yozildi, qayta sinaldi ✓ |
| T1547.001 | #1 | 10:15 | **Hech narsa** | Sysmon konfiguratsiyasida Run kalitlari chiqarib tashlangan ekan | Sysmon konfiguratsiyasi tuzatildi, qayta sinaldi ✓ |
| T1059.001 | #1 | 10:22 | Bloklandi + ogohlantirish | Defender bloklagan | Ogohlantirish matniga kontekst qo'shish |
| T1070.001 | #1 | 10:30 | Ogohlantirish | 1102 qoidasi ishladi | Jiddiylikni "critical" ga ko'tarish |

Uchinchi qatorga e'tibor bering: Sysmon darsidagi "har bir `exclude` — ko'r nuqta" ogohlantirishi amalda topildi. Bunday topilma faqat **sinab ko'rish** orqali chiqadi — qoidalar va konfiguratsiyani o'qib emas.

### Topilmagan texnika uchun qoida yozish

T1053.005 "faqat log" natijasini berdi. Detection engineering darsidagi hayot sikli bo'yicha:

1. **Log'ni toping** — sinov vaqtida Sysmon Event ID 1 dagi `schtasks.exe` yozuvi: buyruq satri, ota-jarayon, foydalanuvchi.
2. **Qoida yozing** — Sigma: `Image|endswith: '\schtasks.exe'` va `CommandLine|contains: '/create'`, oddiy foydalanuvchi papkalariga ishora qiluvchi qo'shimcha shartlar bilan (threat hunting darsidagi ov natijalari bo'yicha).
3. **Shovqinni tekshiring** — oxirgi 30 kunlik loglarda qancha natija? (laboratoriyada kam, haqiqiy muhitda — ko'p bo'lishi mumkin).
4. **Qayta sinang** — `Invoke-AtomicTest T1053.005 -TestNumbers 1` → ogohlantirish chiqdimi?
5. **Tozalang** — `-Cleanup`, keyin snapshot'ga qayting.

Endi Navigator'dagi yashil katak haqiqatan **sinalgan** yashil.

:::key
**Sinalmagan qoida — umid, himoya emas.** Purple team yondashuvining qiymati shundaki, u qamrovni da'volardan dalillarga aylantiradi: "bizda T1547.001 uchun qoida bor" o'rniga "T1547.001 #1 sinovi 20-noyabrda bajarildi va 40 soniyada ogohlantirish chiqdi". Qoidalar vaqt o'tishi bilan jimgina buziladi — log formati o'zgaradi, agent yangilanadi, konfiguratsiyaga istisno qo'shiladi. Shuning uchun etuk jamoalar atomic sinovlarni **muntazam** (masalan, har oy) qayta ishga tushiradi — himoyaning o'zi uchun "regression test".
:::

## Boshqa vositalar

| Vosita | Xususiyati |
|---|---|
| **MITRE Caldera** | Avtomatlashtirilgan hujumchi emulyatsiyasi: bir nechta texnikani zanjir qilib, haqiqiy hujumga o'xshash ketma-ketlikda bajaradi |
| **Atomic Red Team** | Alohida texnikalar — boshlash uchun eng oson |
| **Hujumchi emulyatsiya rejalari** | MITRE va boshqalar tomonidan haqiqiy guruhlar xatti-harakatiga asoslangan tayyor stsenariylar |
| **Tijoriy BAS platformalari** (Breach and Attack Simulation) | Doimiy avtomatik sinovlar va hisobotlar |

Boshlang'ich uchun Atomic Red Team yetarli. b2 bosqichidagi threat-informed defense g'oyasini eslang: sektoringizga hujum qiladigan guruh texnikalari ro'yxati → har biri uchun atomic sinov → natijalar jadvali. Bu — rahbariyatga "qanchalik himoyalanganmiz?" degan savolga eng yaxshi javob.

## Purple team nimani qilmaydi

- **Haqiqiy hujumchini to'liq taqlid qilmaydi** — atomic sinovlar alohida va oddiy; haqiqiy hujumchi texnikalarni o'zgartiradi va zanjir qiladi.
- **Bitta sinov = bitta procedure** — texnikaning boshqa ko'rinishlari aniqlanmasligi mumkin (ATT&CK darsidagi "yashil katak" ogohlantirishi).
- **Ruxsatsiz bajarilmaydi** — ish muhitida sinov — kelishilgan reja, vaqt va mas'ullar bilan.
- **Bir martalik emas** — muhit o'zgaradi; sinovlar takrorlanadi.
- **Ishlab chiqarish tizimlarida xavfsiz emas** — ba'zi sinovlar tizimlarni o'zgartiradi yoki to'xtatadi.

:::try
Barcha mashqlar — **faqat izolyatsiyalangan laboratoriya VM'ida**, snapshot bilan.

**1. O'qishdan boshlang.** Invoke-AtomicRedTeam'ni rasmiy hujjat bo'yicha o'rnating va hech narsani ishga tushirmasdan `Invoke-AtomicTest T1136.001 -ShowDetailsBrief` va `-ShowDetails` ni o'qing. Sinov aynan qanday buyruq bajaradi? Tozalash buyrug'i nima?

**2. Birinchi sinov.** Snapshot oling. `T1136.001` ning bitta sinovini bajaring va SIEM'ingizda (Wazuh yoki Splunk) natijani toping: 4720 bormi? Sysmon 1 bormi? Ogohlantirish chiqdimi? Keyin `-Cleanup` va snapshot'ga qaytish.

**3. To'liq mashq.** Yuqoridagi besh texnika bo'yicha mashq o'tkazing va natijalar jadvalini to'ldiring. Kamida bitta "faqat log" yoki "hech narsa" natijasi uchun tuzatish kiriting (qoida yoki log sozlamasi) va qayta sinang.

**4. Hujjatlashtiring.** Natijalar jadvalini va har bir yangi qoidani GitHub portfoliongizga joylang (keyingi dars). Navigator qatlamini sinov natijalari bilan yangilang: "sinalgan va aniqlandi", "sinalgan, aniqlanmadi", "sinalmagan".

**5. TryHackMe** — "Atomic Red Team" xonasini bajaring.

*Javoblar: 2 — Security auditida hisob boshqaruvi yoqilgan bo'lsa, 4720 paydo bo'ladi; Sysmon 1 da `net.exe`/`net1.exe` jarayonlari buyruq satri bilan ko'rinadi. Ogohlantirish chiqmasa — bu "faqat log" natijasi va qoida yozish uchun signal.*
:::

## Xulosa

- **Purple team** — red va blue jamoalarning ochiq hamkorligi; maqsad — aniqlashni yaxshilash, "yutish" emas.
- **Atomic Red Team** — ATT&CK texnikalari bo'yicha kichik sinovlar; **Invoke-AtomicRedTeam**: `-ShowDetailsBrief`, **`-ShowDetails`**, `-CheckPrereqs`, `-TestNumbers`, `-Cleanup`.
- Faqat **izolyatsiyalangan laboratoriyada**, snapshot bilan, tafsilotlarni o'qib; ish joyida — faqat ruxsat bilan.
- Mashq: **reja → kutish → bajarish → kuzatish → natija → tuzatish → qayta sinash**.
- Natijalar: **bloklandi / ogohlantirish / faqat log / hech narsa**; "faqat log" — eng tez yutuq, "hech narsa" — ko'rinish bo'shlig'i.
- Sinalmagan qoida — umid; sinovlarni muntazam takrorlang (regression).
- Boshqa vositalar: **Caldera**, emulyatsiya rejalari, BAS platformalari.

:::quiz
? Purple team'ning red team mashqidan asosiy farqi nima?
- Purple team faqat hujum qiladi
+ Red va blue jamoalar ochiq hamkorlik qiladi: har bir texnika bajarilgach, aniqlanishi birgalikda tekshiriladi va tuzatiladi
- Purple team faqat hisobot yozadi
- Farqi yo'q
! Maqsad — kim yutgani emas, aniqlash qobiliyatini yaxshilash.

? Atomic Red Team nima?
+ ATT&CK texnikalarini taqlid qiladigan kichik, alohida sinovlar kutubxonasi
- Antivirus dasturi
- SIEM tizimi
- Zararli dasturlar to'plami
! Har bir sinov bitta texnikani taqlid qiladi va ko'pincha tozalash buyrug'iga ega.

? Atomic sinovni ishga tushirishdan oldin qaysi buyruq eng muhim?
- -Cleanup
+ -ShowDetails — sinov aynan nima qilishini o'qish
- -GetPrereqs
- Hech qaysi
! Nima qilishini tushunmagan buyruqni hech qachon bajarmang.

? Atomic sinovlarni qayerda ishga tushirish mumkin?
- Asosiy ish kompyuterida
- Kompaniya serverlarida ruxsatsiz
+ Faqat o'zingizga tegishli izolyatsiyalangan laboratoriya VM'ida, snapshot bilan (ish joyida — faqat yozma ruxsat bilan)
- Do'stingizning kompyuterida
! Sinovlar haqiqiy hujumchi xatti-harakatlarini taqlid qiladi va tizimni o'zgartiradi.

? Sinov natijasi “faqat log”: hodisa SIEM'da bor, lekin ogohlantirish chiqmagan. Keyingi qadam qaysi?
+ Shu log asosida aniqlash qoidasi yozish va qayta sinash
- Log manbasini o'chirish
- Hech narsa qilmaslik
- Antivirusni almashtirish
! Bu eng tez yutuq — ma'lumot allaqachon bor, faqat qoida kerak.

? Sinov natijasi “hech narsa”: log ham, ogohlantirish ham yo'q. Bu nimani anglatadi?
- Hujum muvaffaqiyatsiz bo'lgan
+ Ko'rinish bo'shlig'i — avval kerakli log manbasini ulash yoki audit sozlamasini yoqish kerak
- Qoida juda yaxshi ishlagan
- SIEM o'chirilgan
! Masalan, Sysmon konfiguratsiyasidagi istisno Run kalitlarini ko'rinmas qilgan bo'lishi mumkin.

? Sinov EDR tomonidan bloklandi. Yana nimani tekshirish kerak?
+ Bloklash haqida ogohlantirish chiqdimi va analitik buni ko'radimi
- Hech narsani — bloklangan bo'lsa hammasi joyida
- EDR'ni o'chirib, qayta sinash
- Faqat snapshot'ga qaytish
! Bloklangan urinish ham hujumchi mavjudligining signali.

? Nega atomic sinovlarni muntazam qayta ishga tushirish tavsiya etiladi?
- Bu majburiy qonun talabi
+ Qoidalar log formati, agent yangilanishi yoki yangi istisnolar tufayli jimgina buzilishi mumkin
- Sinovlar har oy o'zgaradi
- SIEM buni talab qiladi
! Bu himoyaning “regression test”i.

? Purple team sinovining cheklovi qaysi?
+ Bitta sinov texnikaning faqat bitta procedure'sini tekshiradi — boshqa ko'rinishlari aniqlanmasligi mumkin
- U hech qanday foyda bermaydi
- U faqat Linux'da ishlaydi
- U hujumchini to'liq taqlid qiladi
! ATT&CK darsidagi “yashil katak” ogohlantirishi bu yerda ham amal qiladi.

? MITRE Caldera Atomic Red Team'dan nimasi bilan farq qiladi?
- Hech narsasi bilan
+ Caldera bir nechta texnikani zanjir qilib, avtomatik hujumchi emulyatsiyasini bajaradi; Atomic — alohida texnikalar
- Caldera faqat hisobot yozadi
- Caldera — antivirus
! Boshlash uchun Atomic Red Team osonroq.
:::

:::cards
Purple team nima? :: Red va blue jamoalarning ochiq hamkorligi: texnika bajariladi, aniqlanishi birgalikda tekshiriladi va darhol yaxshilanadi.
Atomic Red Team? :: Red Canary'ning ATT&CK texnikalari bo'yicha kichik, alohida sinovlar kutubxonasi.
Invoke-AtomicRedTeam asosiy parametrlari? :: -ShowDetailsBrief, -ShowDetails, -CheckPrereqs, -GetPrereqs, -TestNumbers, -Cleanup.
Atomic sinov xavfsizlik qoidalari? :: Faqat izolyatsiyalangan laboratoriya VM'ida, snapshot bilan, tafsilotlarni o'qib; ish joyida faqat yozma ruxsat bilan.
Purple team mashqi qadamlari? :: Reja → kutish → bajarish → kuzatish → natija → tuzatish → qayta sinash.
Natija toifalari? :: Bloklandi, ogohlantirish, faqat log, hech narsa.
“Faqat log” natijasi? :: Ma'lumot bor, qoida yo'q — qoida yozish eng tez yutuq.
“Hech narsa” natijasi? :: Ko'rinish bo'shlig'i — log manbasini ulash yoki audit sozlamasini yoqish kerak.
Nega sinovlar muntazam takrorlanadi? :: Qoidalar log formati, agent yangilanishi va istisnolar tufayli jimgina buziladi — regression test.
MITRE Caldera? :: Bir nechta texnikani zanjir qilib bajaradigan avtomatlashtirilgan hujumchi emulyatsiyasi platformasi.
Sinalgan qamrov qanday hujjatlashtiriladi? :: Natijalar jadvali (texnika, sinov, vaqt, natija, harakat) va Navigator qatlami: sinalgan/aniqlangan, sinalgan/aniqlanmagan, sinalmagan.
Purple team cheklovlari? :: Bitta sinov — bitta procedure; haqiqiy hujumchini to'liq taqlid qilmaydi; ruxsatsiz va ishlab chiqarishda xavfli.
:::
