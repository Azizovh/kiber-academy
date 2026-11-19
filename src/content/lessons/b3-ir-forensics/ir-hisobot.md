Uch hafta tergov. Sizda Sysmon loglari, proxy va DNS yozuvlari, xotira tasviridan chiqarilgan jarayonlar, Prefetch va Amcache natijalari, Autopsy timeline'i, ikki namunaning statik va dinamik tahlili bor. Yuzlab fakt, o'nlab jadval.

Ertaga rahbariyat yig'ilishi. Bosh direktor bitta savol beradi: "**Nima bo'ldi, qanchalik jiddiy, va bu yana takrorlanmasligi uchun nima qilyapmiz?**" Unga Prefetch jadvali kerak emas. Huquqshunosga esa aniq sanalar va qaysi ma'lumotlar xavf ostida bo'lgani kerak. Texnik jamoaga — aniq IOC'lar va tuzatishlar ro'yxati.

Tergov qanchalik yaxshi bo'lmasin, agar natija tushunarli hikoyaga aylanmasa — u **ishlatilmaydi**. Bu darsda tarqoq topilmalardan yagona [[timeline|vaqt chizig'i]] va to'liq IR hisobotini qanday tuzishni o'rganasiz. Bu — b1 bosqichidan boshlab o'rgangan hamma narsangizning yakuni.

## Vaqt chizig'i — tergovning umurtqasi

Har bir manba o'z qismini biladi:

| Manba | Nimani biladi |
|---|---|
| Pochta tizimi | Xat qachon keldi |
| Proxy, DNS | Qachon, qaysi domenga murojaat |
| Sysmon, EDR | Qaysi jarayon, qachon, kimdan |
| Windows artefaktlari | Dastur qachon va necha marta ishga tushgan |
| `$MFT`, `$UsnJrnl` | Fayl qachon yaratilgan, o'zgartirilgan, o'chirilgan |
| Xotira tasviri | Nusxa olingan paytdagi holat |
| Firewall, Zeek | Qancha ma'lumot, qachon chiqib ketgan |

Ularni **vaqt bo'yicha bitta ro'yxatga** joylashtirsangiz — hikoya o'z-o'zidan paydo bo'ladi. Shu bilan birga bo'shliqlar ham ko'rinadi: "09:33 dan 10:05 gacha nima bo'lgan?" — bu keyingi tekshiruv yo'nalishi.

### Vaqt chizig'ini tuzish qoidalari

1. **Bitta vaqt mintaqasi — UTC.** b1 bosqichidan beri takrorlanayotgan ogohlantirish. Har bir manbaning vaqt mintaqasini aniqlang va hammasini UTC'ga keltiring. Hisobotda mahalliy vaqtni qavs ichida berish mumkin.
2. **Har bir qatorda manba.** "Qayerdan bilasiz?" degan savolga darhol javob bo'lishi kerak.
3. **Fakt va talqinni ajrating.** "09:32:14 da `powershell.exe` ishga tushdi" — fakt. "Foydalanuvchi makrosni yoqdi" — talqin (ehtimol to'g'ri, lekin boshqa dalil kerak).
4. **Soatlar aniqligiga e'tibor bering.** Turli tizimlarning soatlari bir necha soniya yoki daqiqa farq qilishi mumkin (SIEM darsidagi NTP). Muhim ketma-ketliklarda buni hisobga oling.
5. **Muhim hodisalarni ajrating.** Super-timeline millionlab qatordan iborat bo'lishi mumkin; hisobotga faqat hikoyani tashkil etadiganlari kiradi.

### Super timeline: plaso

Qo'lda yig'ish o'rniga avtomatik vosita bor — **plaso** (log2timeline). U disk tasviri yoki triage arxividan barcha mumkin bo'lgan vaqt belgilarini — fayl tizimi, registr, jurnallar, brauzer tarixi, Prefetch va yuzlab boshqa formatlarni — yagona bazaga yig'adi:

```bash
# 1. Tasvirdan barcha vaqt belgilarini yig'ish
log2timeline.py --storage-file case01.plaso disk01.E01

# 2. Insident oralig'ini CSV'ga chiqarish
psort.py -o dynamic -w timeline.csv case01.plaso \
  "date > '2026-11-16 09:00:00' AND date < '2026-11-16 11:00:00'"
```

Natijani Windows forensikasi darsidagi **Timeline Explorer**'da ochasiz: filtrlash, rang bilan belgilash, qidirish. Eric Zimmerman vositalarining CSV natijalarini ham shu yerga qo'shish mumkin. Autopsy'ning Timeline oynasi (disk tahlili darsi) — xuddi shu g'oyaning grafik ko'rinishi.

Super-timeline — xomashyo. Uni "tergov vaqt chizig'i"ga aylantirish — tahlilchi ishi: muhim qatorlarni tanlash, manbalarni bog'lash, izoh yozish.

## Yakuniy vaqt chizig'i — misol

b1 bosqichidan beri kuzatib kelayotgan hodisaning yakuniy, tozalangan vaqt chizig'i:

| Vaqt (UTC) | Hodisa | Manba | Ishonch |
|---|---|---|---|
| 11-13 | `update-check.example-cdn.net` domeni ro'yxatdan o'tgan | whois | Yuqori |
| 11-16 04:14:21 | Phishing xati 37 ta qutiga yetkazilgan | Pochta loglari | Yuqori |
| 11-16 04:31:58 | d.karimova (WS-BUX-014) `Hisob-faktura_1147.docm` ni ochgan | Sysmon 1, LNK | Yuqori |
| 11-16 04:32:14 | `WINWORD.EXE` → `powershell.exe -enc …` | Sysmon 1, xotira (pstree, cmdline) | Yuqori |
| 11-16 04:32:15 | `/a.ps1` va `/upd.bin` yuklangan | Proxy, PCAP | Yuqori |
| 11-16 04:32:17 | `AppData\Roaming\svchost.exe` yaratilgan va ishga tushgan | Sysmon 11/1, Prefetch, $MFT | Yuqori |
| 11-16 04:32:18 | `Run\Updater` persistence | Sysmon 13, registr, dinamik tahlil | Yuqori |
| 11-16 04:33 → | 203.0.113.45:443 ga har ~60 s beacon | Zeek, firewall, netscan | Yuqori |
| 11-16 04:41 | 2 boshqa xodim havolani bosgan; ilova ochilmagan | Proxy | Yuqori |
| 11-16 05:05:40 | 14 MB ma'lumot 203.0.113.45 ga yuborilgan | Zeek conn.log, SRUM | Yuqori |
| 11-16 05:05 | Yuborilgan ma'lumot — ehtimol buxgalteriya hujjatlari | Fayl murojaatlari (LNK, Jump Lists) | **O'rtacha** |
| 11-16 05:41 | SOC ogohlantirishi (Sigma: Word → PowerShell) | SIEM | Yuqori |
| 11-16 05:52 | WS-BUX-014 EDR orqali ajratilgan | EDR | Yuqori |
| 11-16 06:10 | Xotira tasviri olingan | IR jurnali | Yuqori |
| 11-16 07:30 | IOC'lar butun muhit bo'ylab qidirilgan — boshqa zararlangan qurilma topilmagan | SIEM, EDR | O'rtacha–yuqori |

Bu jadvaldan bir qarashda muhim **ko'rsatkichlar** chiqadi:

| Ko'rsatkich | Qiymat |
|---|---|
| Birinchi zararlanishdan aniqlashgacha (dwell time / MTTD) | ~1 soat 9 daqiqa |
| Aniqlashdan cheklashgacha | 11 daqiqa |
| Ta'sir qilgan qurilmalar | 1 |
| Ta'sir qilgan hisoblar | 1 |
| Chiqib ketgan ma'lumot | ~14 MB, ehtimol buxgalteriya hujjatlari |

SOC tuzilmasi darsidagi MTTD va MTTR ko'rsatkichlari endi aniq raqamlarga ega.

Bu jadvalni o'qish bir narsa, uni loglardan o'zingiz tiklash — boshqa. Quyidagi labda xuddi shu insident SIEM'da: har bir qatorni (phishing xati, Word → PowerShell, payload, Run kaliti, beacon, 14 MB) so'rov bilan topasiz.

:::lab siem-ws-bux-014

## IR hisoboti tuzilishi

Bitta hisobot turli o'quvchilarga xizmat qiladi. Shuning uchun u **qatlamli** tuziladi: eng muhimi boshida, tafsilotlar oxirida.

```
1. Asosiy xulosa (Executive summary)          ← rahbariyat: 1 sahifa
2. Insident haqida umumiy ma'lumot             ← kim, qachon, qanday aniqlandi
3. Qamrov va ta'sir                            ← qaysi tizimlar, hisoblar, ma'lumotlar
4. Vaqt chizig'i                               ← yuqoridagi kabi
5. Texnik tahlil                               ← kirish yo'li, xatti-harakat, dalillar
6. Ildiz sabab (root cause)                    ← nega bu mumkin bo'ldi
7. Ko'rilgan choralar                          ← cheklash, yo'q qilish, tiklash
8. Tavsiyalar                                  ← ustuvorlik va mas'ul bilan
9. Ilovalar                                    ← IOC'lar, ATT&CK, dalillar ro'yxati, vositalar
```

### 1. Asosiy xulosa

Eng muhim va eng qiyin qism. Texnik bo'lmagan o'quvchi uchun, bir sahifada. Uchta savolga javob: **nima bo'ldi, qanchalik jiddiy, nima qilinmoqda.**

```
ASOSIY XULOSA

2026-yil 16-noyabr kuni buxgalteriya xodimining kompyuteri soxta hisob-faktura
ko'rinishidagi elektron pochta xati orqali zararlandi. Hujumchi taxminan bir soat
davomida kompyuterga masofadan kirish imkoniga ega bo'ldi va taxminan 14 MB
ma'lumotni tashqi serverga yubordi; bu ma'lumot, ehtimol, buxgalteriya
hujjatlarini o'z ichiga oladi.

Xavfsizlik markazi hujumni avtomatik qoida orqali 1 soat 9 daqiqada aniqladi va
11 daqiqada kompyuterni tarmoqdan ajratdi. Boshqa kompyuterlarga tarqalish
belgilari topilmadi. Mijozlar ma'lumotlar bazasi ta'sirlanmagan.

Asosiy sabab: internetdan kelgan hujjatlarda makroslar bloklanmagan edi.
Ustuvor tavsiyalar: (1) internetdan kelgan hujjatlarda makroslarni bloklash —
2 hafta ichida; (2) buxgalteriya hujjatlari ro'yxatini huquqshunos bilan ko'rib
chiqish va xabar berish majburiyatlarini baholash — darhol.
```

E'tibor bering: jargon yo'q ("C2", "beaconing", "Sysmon" — yo'q), raqamlar aniq, noaniqlik ochiq aytilgan ("ehtimol"), harakatlar mas'uliyat va muddat bilan.

### 5. Texnik tahlil

Texnik o'quvchi uchun: dalillarga havolalar bilan, takrorlanadigan darajada. Odatda ATT&CK taktikalari tartibida (b2 bosqichidagi ATT&CK darsi):

```
5.1 Boshlang'ich kirish (T1566.001)
    Xat 04:14:21 da "Hisob-faktura №1147" mavzusi bilan
    security@mybank-uz-support[.]example manzilidan kelgan (Ilova B, xat sarlavhalari).
    SPF/DKIM/DMARC — hujumchi domeni uchun "pass"; domen 3 kun oldin ro'yxatdan o'tgan.

5.2 Bajarilish (T1204.002, T1059.001)
    Sysmon Event ID 1 (Ilova C, 1-qator): WINWORD.EXE (PID 5120) → powershell.exe (PID 6248),
    buyruq satri Base64 kodlangan. Ochilgan buyruq: /a.ps1 ni yuklab, xotirada ishga tushirish
    (Script Block Logging 4104, Ilova C, 4-qator).
...
```

Har bir da'vo — dalil bilan. Har bir dalil — ilovadagi aniq joyga havola.

### 6. Ildiz sabab

"Xodim xatni ochdi" — ildiz sabab **emas**. Bu — bevosita sabab. Ildiz sabab — buni nima **mumkin qildi**? "5 nega" usuli:

```
Nega kompyuter zararlandi?         → Xodim makrosli hujjatni ochdi.
Nega makros ishladi?               → Internetdan kelgan hujjatlarda makroslar bloklanmagan.
Nega bloklanmagan?                 → Siyosat buxgalteriya uchun istisno qilingan (eski makroslar uchun).
Nega istisno hali ham bor?         → Istisnolar muntazam qayta ko'rib chiqilmaydi.
Nega xat filtrdan o'tdi?           → Yangi domen, noyob matn — filtr imzolari yo'q edi.
```

Ildiz sabablar odatda **jarayon va sozlamalarda**, odamlarda emas — IR jarayoni darsidagi "aybdorni qidirmaslik" tamoyili.

### 8. Tavsiyalar

Har bir tavsiya: **nima, nega (qaysi topilmaga bog'liq), kim, qachon, ustuvorlik.**

| # | Tavsiya | Topilma | Mas'ul | Muddat | Ustuvorlik |
|---|---|---|---|---|---|
| 1 | Internetdan kelgan hujjatlarda makroslarni bloklash; buxgalteriya istisnosini qayta ko'rib chiqish | 5.2, 6 | IT infratuzilma | 2 hafta | Yuqori |
| 2 | "Ofis → skript interpretatori" qoidasini barcha qurilmalarda "high" darajada | 5.2 | SOC | 1 hafta | Yuqori |
| 3 | Yangi ro'yxatdan o'tgan domenlarga murojaatni proxy'da cheklash | 5.1, 5.4 | Tarmoq jamoasi | 1 oy | O'rta |
| 4 | Buxgalteriya xodimlari uchun phishing treningi (hisob-faktura stsenariysi) | 5.1 | HR / xavfsizlik | 1 oy | O'rta |
| 5 | Script Block Logging'ni barcha qurilmalarda yoqish | 5.2 | IT infratuzilma | 1 oy | O'rta |

Tavsiyalar **himoya qatlamlari** bo'yicha tarqalganiga e'tibor bering: oldini olish (1, 3), aniqlash (2, 5), odamlar (4). Xavfsizlik bosqichidagi defense in depth.

### 9. Ilovalar

- **IOC'lar** — defang qilingan (trafik tahlili darsi), turi bo'yicha guruhlangan, mashina o'qiy oladigan formatda ham (CSV yoki STIX — tahdid razvedkasi darsi).
- **ATT&CK texnikalari** ro'yxati.
- **Dalillar ro'yxati** — xeshlar va chain of custody havolalari bilan (dalil yig'ish darsi).
- **Ishlatilgan vositalar** va versiyalari — takrorlanuvchanlik uchun.

## Yaxshi hisobotning tamoyillari

| Tamoyil | Yomon misol | Yaxshi misol |
|---|---|---|
| **Aniqlik** | "Ertalab zararli dastur ishga tushdi" | "04:32:17 UTC da `svchost.exe` (SHA-256: …) ishga tushdi" |
| **Fakt va baho ajratilgan** | "Hujumchi mijozlar bazasini o'g'irladi" | "14 MB yuborildi (fakt); mazmun, ehtimol, buxgalteriya hujjatlari (o'rtacha ishonch) — mijozlar bazasiga murojaat izi topilmadi" |
| **Ishonch darajasi** | Hamma narsa bir xil ishonch bilan | "Yuqori / o'rtacha / past ishonch" — asoslari bilan |
| **O'quvchiga mos** | Bosh direktorga Prefetch jadvali | Qatlamli tuzilish |
| **Neytral til** | "Beparvo xodim xatni ochib qo'ydi" | "Xodim hujjatni ochdi; makroslar bloklanmagan edi" |
| **Chegaralar ochiq** | Bo'shliqlar haqida jimlik | "Xotira tasviri cheklashdan 18 daqiqa keyin olingan; bu oraliqdagi faoliyat to'liq tiklanmagan" |

Oxirgi qator — b1 bosqichidagi tiket tuzilishidagi "**Tekshirilmadi**" bo'limining katta ko'rinishi. Halol chegaralar hisobotni zaif emas, **ishonchli** qiladi.

:::key
**Hisobot — tergovning mahsuloti.** Rahbariyat, huquqshunoslar, auditorlar va kelajakdagi tahlilchilar tergovni faqat hisobot orqali ko'radi. Yaxshi hisobot uch narsani beradi: **qaror qabul qilish uchun aniq manzara** (asosiy xulosa), **tekshirsa bo'ladigan dalillar** (vaqt chizig'i va texnik tahlil, manbalar bilan) va **takrorlanmaslik uchun aniq harakatlar** (tavsiyalar, mas'ul va muddat bilan). Hisobotni tergov oxirida emas, **tergov davomida** yozing — IR jarayoni darsidagi kotib yozuvlari va sizning jurnalingiz uning asosi.
:::

## O'rganish uchun eng yaxshi manba

**The DFIR Report** (thedfirreport.com) — haqiqiy insidentlarning batafsil, ommaviy tahlillari: vaqt chizig'i, har bir bosqich, ATT&CK texnikalari, IOC'lar va aniqlash qoidalari (Sigma, YARA, Suricata). Ularni o'qish — hisobot yozishni va hujumchilar haqiqatda qanday ishlashini o'rganishning eng yaxshi yo'li.

Har bir o'qilgan hisobotdan keyin o'zingizdan so'rang:
- Qaysi bosqichda men ularni ushlagan bo'lardim — qaysi log va qaysi qoida bilan?
- Qaysi texnikalar uchun mening laboratoriyamda (b2 bosqichi) qoida yo'q?

## Hisobot nimani qilmaydi

- **Topilmagan narsani isbotlamaydi** — "iz topilmadi" va "bo'lmagan" farqi (disk tahlili darsi).
- **Tavsiyalarni o'zi bajarmaydi** — ular kuzatilishi kerak; saboqlar yig'ilishida (IR jarayoni darsi) holati tekshiriladi.
- **Kech yozilsa, to'liq bo'lmaydi** — tafsilotlar tez unutiladi.
- **Bir xil formatda hamma uchun ishlamaydi** — huquqiy jarayon, sug'urta yoki regulyator o'z talablariga ega bo'lishi mumkin; huquqshunos bilan kelishing.

:::try
**1. Vaqt chizig'i.** Quyidagi tartibsiz faktlarni UTC bo'yicha tartiblang va har biriga manba yozing (server vaqt mintaqasi — UTC+5, SIEM — UTC):
- Server auth.log: `Nov 16 07:19:52 ... Accepted password for deploy from 203.0.113.45`
- SIEM ogohlantirishi: `2026-11-16T02:40:00Z — SSH brute force`
- Server auth.log: `Nov 16 07:14:07 ... Failed password for root from 203.0.113.45` (birinchi)
- auditd: `2026-11-16 07:21:40 (mahalliy) useradd backup2`

**2. Asosiy xulosa.** b1 bosqichidagi Linux loglari darsi hodisasi uchun (SSH brute force → `deploy` → `backup2` sudo guruhiga) bir sahifalik asosiy xulosa yozing — texnik jargonsiz, aniq raqamlar va tavsiyalar bilan.

**3. Ildiz sabab.** Xuddi shu hodisa uchun "5 nega" tahlilini qiling.

**4. The DFIR Report.** Saytdan istalgan bitta hisobotni o'qing. Uning vaqt chizig'idan 5 ta asosiy qadamni ATT&CK texnikalari bilan yozing va har biri uchun "men buni qaysi log bilan ko'rardim?" degan savolga javob bering.

**5. Yakuniy loyiha.** CyberDefenders yoki TryHackMe'dagi to'liq DFIR topshiriqlaridan birini (disk yoki xotira tasviri bilan) yeching va shu darsdagi tuzilishda **to'liq hisobot** yozing. Uni GitHub portfoliongizga joylang (topshiriq qoidalari ruxsat bersa).

*Javoblar: 1 — UTC'da: 02:14:07 birinchi Failed (07:14:07 − 5 soat) → 02:19:52 Accepted → 02:21:40 useradd → 02:40:00 SIEM ogohlantirishi. Ko'rinib turibdiki, ogohlantirish hujum muvaffaqiyatli bo'lganidan 20 daqiqa keyin chiqqan — bu saboqlar yig'ilishi uchun muhim topilma. 3 — taxminan: nega kirildi? → parol taxmin qilindi; nega mumkin bo'ldi? → SSH'da parol bilan kirish yoqilgan va internetga ochiq; nega? → standart sozlama o'zgartirilmagan; nega? → serverlar uchun xavfsiz sozlash standarti (hardening) yo'q.*
:::

## Xulosa

- **Vaqt chizig'i** — barcha manbalarni bitta ro'yxatga birlashtiradi; hikoya va bo'shliqlarni ko'rsatadi.
- Qoidalar: **UTC**, har qatorda **manba**, **fakt va talqin ajratilgan**, soat farqlarini hisobga olish, faqat muhim hodisalar.
- **plaso** (log2timeline + psort) — super-timeline; **Timeline Explorer** — tahlil; tahlilchi uni tergov vaqt chizig'iga aylantiradi.
- Vaqt chizig'idan ko'rsatkichlar: **dwell time / MTTD**, cheklash vaqti, ta'sir qamrovi.
- Hisobot **qatlamli**: asosiy xulosa → umumiy ma'lumot → qamrov va ta'sir → vaqt chizig'i → texnik tahlil → **ildiz sabab** → choralar → **tavsiyalar** (mas'ul va muddat bilan) → ilovalar (IOC, ATT&CK, dalillar, vositalar).
- Asosiy xulosa — jargonsiz, aniq raqamlar, noaniqlik ochiq.
- Ildiz sabab — **jarayon va sozlamalarda** ("5 nega"), odamlarda emas.
- Tamoyillar: aniqlik, ishonch darajasi, neytral til, **chegaralar ochiq**.

:::quiz
? Vaqt chizig'ini tuzishda nega barcha vaqtlar bitta mintaqaga (UTC) keltiriladi?
- Bu chiroyliroq ko'rinadi
+ Turli manbalar turli mintaqalarda yozadi; aks holda hodisalar ketma-ketligi buziladi
- Qonun shuni talab qiladi
- UTC eng aniq soat
! Klassik xato: UTC+5'dagi server va UTC'dagi SIEM vaqtlarini aralashtirib, noto'g'ri hikoya tuzish.

? Vaqt chizig'idagi har bir qatorda nima bo'lishi shart?
+ Vaqt, hodisa va uning manbasi (qayerdan bilinadi)
- Faqat vaqt
- Faqat tahlilchi ismi
- Faqat jiddiylik darajasi
! Manba — “qayerdan bilasiz?” degan savolga javob va tekshirish imkoniyati.

? Qaysi biri fakt emas, balki talqin?
- 04:32:14 da powershell.exe ishga tushdi
- 05:05:40 da 14 MB yuborildi
+ Yuborilgan ma'lumot buxgalteriya hujjatlari edi
- Xat 04:14:21 da keldi
! Yuborilgan ma'lumot mazmuni bilvosita dalillar asosidagi baho — ishonch darajasi bilan yoziladi.

? plaso (log2timeline) nima qiladi?
- Tarmoq trafigini bloklaydi
+ Disk tasviri yoki artefaktlardan barcha vaqt belgilarini yagona super-timeline'ga yig'adi
- Hisobotni avtomatik yozadi
- Zararli dasturni o'chiradi
! Natija psort bilan filtrlanib, Timeline Explorer'da tahlil qilinadi.

? Asosiy xulosa (executive summary) qanday yoziladi?
- Batafsil texnik tafsilotlar va barcha IOC'lar bilan
+ Bir sahifada, jargonsiz: nima bo'ldi, qanchalik jiddiy, nima qilinmoqda — aniq raqamlar va noaniqlik ochiq aytilgan holda
- Faqat ATT&CK texnikalari ro'yxati
- Faqat tavsiyalar
! Rahbariyat qaror qabul qilish uchun aniq manzarani olishi kerak.

? “Xodim xatni ochdi” nega ildiz sabab emas?
- Chunki bu yolg'on
+ Bu bevosita sabab; ildiz sabab — buni nima mumkin qilgani (masalan, makroslar bloklanmagan va istisnolar qayta ko'rilmagan)
- Chunki xodimlar hech qachon aybdor emas
- Chunki ildiz sabab har doim texnik
! “5 nega” usuli jarayon va sozlamalardagi asl sababga olib boradi.

? Yaxshi tavsiyada nima bo'lishi kerak?
+ Nima qilish, qaysi topilmaga asoslanishi, mas'ul, muddat va ustuvorlik
- Faqat umumiy maslahat: “xavfsizlikni oshirish”
- Faqat vosita nomi
- Faqat aybdor xodim ismi
! Mas'ul va muddatsiz tavsiya odatda bajarilmaydi.

? Hisobotda “xotira tasviri cheklashdan 18 daqiqa keyin olingan, bu oraliq to'liq tiklanmagan” deb yozish nega to'g'ri?
- Bu hisobotni uzaytiradi
+ Chegaralarni ochiq aytish hisobotni ishonchli qiladi va o'quvchiga nima noma'lumligini ko'rsatadi
- Bu tahlilchini ayblaydi
- Bu majburiy emas va zararli
! Halol chegaralar — b1 bosqichidagi tiketning “Tekshirilmadi” bo'limining kattaroq ko'rinishi.

? Vaqt chizig'idan qaysi ko'rsatkichni to'g'ridan-to'g'ri hisoblash mumkin?
+ Birinchi zararlanishdan aniqlashgacha bo'lgan vaqt (dwell time / MTTD)
- Xodimlar maoshi
- Disk hajmi
- Antivirus versiyasi
! Shuningdek, aniqlashdan cheklashgacha vaqt va ta'sir qamrovi.

? Nega hisobotni tergov oxirida emas, davomida yozish tavsiya etiladi?
- Bu tezroq tugatish uchun
+ Tafsilotlar tez unutiladi; kotib yozuvlari va tahlil jurnali hisobotning asosi bo'ladi
- Rahbariyat talab qiladi
- Tergov oxirida vaqt bo'lmaydi
! Kech yozilgan hisobot to'liq va aniq bo'lmaydi.
:::

:::cards
Vaqt chizig'i nima? :: Turli manbalardagi hodisalarni vaqt bo'yicha tartiblangan yagona ro'yxati — hikoyani va bo'shliqlarni ko'rsatadi.
Vaqt chizig'i qoidalari? :: UTC, har qatorda manba, fakt va talqin ajratilgan, soat farqlarini hisobga olish, faqat muhim hodisalar.
plaso? :: log2timeline — barcha vaqt belgilarini super-timeline'ga yig'adi; psort — filtrlab CSV'ga chiqaradi.
Vaqt chizig'idan ko'rsatkichlar? :: Dwell time / MTTD, aniqlashdan cheklashgacha vaqt, ta'sir qilgan qurilmalar, hisoblar va ma'lumotlar.
IR hisoboti tuzilishi? :: Asosiy xulosa, umumiy ma'lumot, qamrov va ta'sir, vaqt chizig'i, texnik tahlil, ildiz sabab, choralar, tavsiyalar, ilovalar.
Asosiy xulosa qoidalari? :: Bir sahifa, jargonsiz, aniq raqamlar, noaniqlik ochiq; nima bo'ldi, qanchalik jiddiy, nima qilinmoqda.
Texnik tahlil qanday tuziladi? :: ATT&CK taktikalari tartibida, har bir da'vo dalil va ilovadagi aniq joyga havola bilan.
Ildiz sabab va “5 nega”? :: Bevosita sababdan (xat ochildi) ketma-ket “nega?” bilan jarayon va sozlamalardagi asl sababga yetish.
Yaxshi tavsiya? :: Nima, qaysi topilmaga asoslangan, mas'ul, muddat, ustuvorlik; himoya qatlamlari bo'yicha tarqalgan.
Hisobot ilovalari? :: Defang qilingan IOC'lar (CSV/STIX ham), ATT&CK ro'yxati, dalillar xeshlari va chain of custody, vositalar va versiyalari.
Yaxshi hisobot tamoyillari? :: Aniqlik, fakt va baho ajratilgan, ishonch darajasi, o'quvchiga mos, neytral til, chegaralar ochiq.
The DFIR Report? :: Haqiqiy insidentlarning batafsil ommaviy tahlillari — vaqt chizig'i, ATT&CK, IOC va aniqlash qoidalari bilan.
:::
