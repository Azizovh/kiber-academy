b3 bosqichining oxirgi darsidagi hisobotni eslang: hujumchi bir soat davomida sezilmay yurdi. Bu — yaxshi natija. Ko'p haqiqiy insidentlarda bu vaqt **haftalar yoki oylar** bo'ladi. Nega? Chunki hujumchi hech qanday qoidani buzmagan: u qonuniy vositalardan foydalangan (EDR darsidagi LOLBins), haqiqiy hisoblar bilan kirgan, shovqin orasida yashiringan.

SOC'ning ko'p ishi **reaktiv**: ogohlantirish chiqadi — analitik javob beradi. Lekin qoida yozilmagan hujumga ogohlantirish chiqmaydi. Uni topishning yagona yo'li — **o'zingiz izlash**.

Bu — [[threat-hunting|threat hunting]]: "bizning tarmog'imizda allaqachon hujumchi bor" deb faraz qilib, uni ogohlantirishni kutmasdan faol qidirish.

## Ov — monitoring emas

| | **Monitoring / triage** | **Threat hunting** |
|---|---|---|
| Boshlanish | Ogohlantirish chiqdi | Gipoteza yoki savol |
| Yo'nalish | Reaktiv | Proaktiv |
| Nimani topadi | Qoida yozilgan narsalarni | Qoida **yozilmagan** narsalarni |
| Natija | Ogohlantirish yopildi yoki eskalatsiya | Topilma — **yoki** yangi aniqlash qoidasi, **yoki** ko'rinishdagi bo'shliq |
| Kim qiladi | L1–L2 analitiklar | Tajribali analitiklar, hunter'lar |

Ovning asosiy g'oyasi — **"buzilish allaqachon bo'lgan" deb faraz qilish** (assume breach). Bu pessimizm emas, realizm: himoya qatlamlari qanchalik yaxshi bo'lmasin, birortasi qachondir o'tkazib yuboradi.

Muhim: muvaffaqiyatli ov har doim ham hujumchini topmaydi. "Bu texnika bizda yo'q" degan **asosli** xulosa ham — natija. Va deyarli har bir ov qo'shimcha natija beradi: noto'g'ri sozlamalar, eskirgan tizimlar, log bo'shliqlari, yangi qoidalar uchun g'oyalar.

## Ov turlari

| Tur | Boshlanish nuqtasi | Misol |
|---|---|---|
| **Gipotezaga asoslangan** | ATT&CK texnikasi yoki hujumchi xatti-harakati | "Hujumchilar rejalashtirilgan vazifalar orqali persistence yaratadi — bizda g'ayritabiiy vazifalar bormi?" |
| **Razvedkaga asoslangan** | CTI hisoboti, yangi IOC yoki TTP | "Hisobotdagi guruh certutil orqali fayl yuklaydi — bizda shunday holatlar bormi?" |
| **Ma'lumotga asoslangan** (anomaliya) | Statistik g'alatilik | "Qaysi jarayonlar faqat bitta qurilmada ishlaydi?" |
| **Vaziyatga asoslangan** | Muhim voqea | Yangi zaiflik e'lon qilindi — undan bizda foydalanishga urinishgan-mi? |

## Ov sikli

```
  1. Gipoteza       — Nimani qidiryapman va nega? (ATT&CK, CTI, tajriba)
        ▼
  2. Ma'lumot       — Bu xatti-harakat qaysi logda ko'rinadi? U log bizda bormi?
        ▼
  3. Qidiruv        — So'rovlar, statistik tahlil, vizualizatsiya
        ▼
  4. Tahlil         — Topilganlarni triage qilish: normal yoki shubhali?
        ▼
  5. Xulosa         — Topildi → IR jarayoni. Topilmadi → asosli xulosa.
        ▼
  6. Natijani mustahkamlash — Qoida yozish, bo'shliqlarni yopish, hujjatlashtirish
        │
        └──────────► yangi gipoteza
```

### 1. Yaxshi gipoteza

Yaxshi gipoteza — **aniq, tekshirsa bo'ladigan va harakatga olib boradigan**:

| Yomon | Nega yomon | Yaxshi |
|---|---|---|
| "Tarmoqda hujumchi bormi?" | Juda keng — qayerdan boshlash noma'lum | "Hujumchi Run kalitlari orqali persistence yaratgan bo'lishi mumkin (T1547.001); oxirgi 30 kunda imzosiz yoki foydalanuvchi papkalaridan ishga tushadigan yangi Run qiymatlari bormi?" |
| "PowerShell xavfli" | Gipoteza emas | "Oddiy foydalanuvchilar kompyuterlarida kodlangan PowerShell buyruqlari kamdan-kam; oxirgi 14 kunda ularni administrator bo'lmaganlar ishga tushirganmi?" |
| "Ma'lumot o'g'irlanyaptimi?" | Ma'lumot manbasi aniq emas | "Ma'lumot olib chiqilishi odatda katta yuborish hajmi bilan bog'liq; qaysi qurilmalar oxirgi 7 kunda notanish domenlarga o'z baseline'idan 10 baravar ko'p yuborgan?" |

Formula: **[Hujumchi] [texnika] orqali [maqsad]ga erishishi mumkin; bu [ma'lumot manbasi]da [belgi] sifatida ko'rinadi.**

Gipoteza manbalari:
- **ATT&CK** — b2 bosqichidagi Navigator'da qamrovsiz qolgan texnikalar — eng yaxshi boshlanish.
- **CTI** — sektoringizga hujum qilayotgan guruhlar haqidagi hisobotlar (tahdid razvedkasi darsi).
- **The DFIR Report** — haqiqiy insidentlardagi texnikalar (IR hisoboti darsi).
- **O'z insidentlaringiz** — saboqlar yig'ilishidagi xulosalar.
- **Red team va purple team** natijalari (shu bosqichdagi alohida dars).

### 2. Ma'lumot bormi?

Detection engineering darsidagi savol: **"bu xatti-harakat qaysi logda ko'rinadi va u log bizda bormi?"** Ko'pincha ov aynan shu yerda birinchi topilmani beradi: "Run kalitlarini qidirmoqchi edik — lekin Sysmon Event ID 13 faqat serverlarda yoqilgan ekan." Bu ham natija: ko'rinishdagi bo'shliq hujjatlashtiriladi va yopiladi.

### 3–4. Qidiruv va tahlil usullari

Ovda ishlatiladigan asosiy usullar:

| Usul | G'oya | Misol |
|---|---|---|
| **Qidirish** (searching) | Aniq belgini qidirish | `CommandLine` da `-enc` |
| **Guruhlash** (grouping) | Bir xil narsalarni birlashtirib, naqsh ko'rish | Har bir ota-bola jarayon juftligi nechta |
| **Stacking** (sanash) | Qiymatlarni sanab, **eng kam** uchraydiganlarni ko'rish | Barcha Run kalit qiymatlari — faqat 1–2 qurilmada bo'lganlari |
| **Klasterlash** | O'xshash xatti-harakatli guruhlarni topish | Odatiy ish vaqtidan tashqari faol hisoblar |
| **Vizualizatsiya** | Grafikda cho'qqilar va muntazamlik | `timechart` — beaconing "taroq"i |

**Stacking** — ovchining eng sevimli usuli. Splunk darsidagi `rare` va tarmoq loglari darsidagi "uzun dum" g'oyasi:

```
index=sysmon EventCode=13 TargetObject="*\\CurrentVersion\\Run\\*" earliest=-30d
| stats dc(host) as qurilmalar values(host) as qaysilar by Details
| where qurilmalar <= 2
| sort qurilmalar
```

Bu so'rov barcha Run kalit qiymatlarini (ishga tushadigan dasturlarni) sanaydi va faqat **1–2 ta qurilmada** uchraydiganlarini ko'rsatadi. 3 000 ta kompyuterning hammasida bor qiymat — korporativ dastur. Faqat bittasida bor `C:\Users\d.karimova\AppData\Roaming\svchost.exe` — b1 bosqichidan beri tanish holat.

EDR darsidagi **tarqalganlik** (prevalence) tushunchasi xuddi shu: kam uchraydigan — shubhali.

### Misol ov: rejalashtirilgan vazifalar

**Gipoteza:** Hujumchilar persistence uchun rejalashtirilgan vazifalardan foydalanadi (T1053.005). Bu Windows Security jurnalida 4698 va Sysmon/EDR'da `schtasks.exe` jarayonlari sifatida ko'rinadi. Oxirgi 30 kunda g'ayritabiiy vazifalar yaratilganmi?

**Ma'lumot:** 4698 audit yoqilgan (tekshirildi — faqat 70% qurilmada; bo'shliq qayd etildi). Sysmon Event ID 1 barcha qurilmalarda.

**Qidiruv:**

```
index=sysmon EventCode=1 Image="*\\schtasks.exe" CommandLine="*/create*" earliest=-30d
| stats count dc(host) as qurilmalar values(User) as foydalanuvchilar values(ParentImage) as otalar by CommandLine
| sort qurilmalar
```

**Tahlil:** 214 ta noyob buyruq satri. Ulardan 190 tasi — boshqaruv tizimi (bir xil ota-jarayon, yuzlab qurilmada). Qolgan 24 tasini triage qilamiz (b1 bosqichidagi usul): kim yaratgan, qaysi dasturni ishga tushiradi, u dastur qayerda va imzolanganmi? 23 tasi — IT jamoasining hujjatlashtirilgan skriptlari. **Bittasi**: oddiy foydalanuvchi, ota-jarayoni `powershell.exe`, vazifa har soatda `C:\Users\Public\upd.vbs` ni ishga tushiradi.

**Xulosa:** bitta shubhali topilma → IR jarayoniga eskalatsiya (b3 bosqichi).

**Mustahkamlash:**
- Yangi Sigma qoidasi: "oddiy foydalanuvchi PowerShell orqali foydalanuvchi papkasidagi skriptni ishga tushiruvchi vazifa yaratdi".
- 4698 auditini qolgan 30% qurilmalarda yoqish.
- 23 ta qonuniy vazifa ro'yxati — kelajakdagi ovlar uchun baseline.

## Ovni hujjatlashtirish

Har bir ov — xulosa topilganmi yoki yo'qmi — hujjatlashtiriladi. Odatiy shablon:

```
OV:            HUNT-2026-007 — Rejalashtirilgan vazifalar orqali persistence
SANA, MUALLIF: 2026-11-20, A. Rahimov
GIPOTEZA:      T1053.005 — oddiy foydalanuvchilar g'ayritabiiy vazifalar yaratgan bo'lishi mumkin
MANBA:         ATT&CK qamrov xaritasidagi bo'shliq; sektor CTI hisoboti
MA'LUMOT:      Sysmon EID 1 (100%), Security 4698 (70% — bo'shliq)
DAVR:          2026-10-21 — 2026-11-20
SO'ROVLAR:     (ilova — so'rovlar matni)
NATIJA:        1 ta shubhali vazifa → INC-2026-031 ga eskalatsiya
               23 ta qonuniy vazifa — baseline ro'yxatiga qo'shildi
BO'SHLIQLAR:   4698 auditi 30% qurilmada yoqilmagan
HARAKATLAR:    Sigma qoidasi DET-112 yaratildi; audit sozlamasi — IT, 2 hafta
KEYINGI OV:    T1543.003 — yangi xizmatlar
```

Bu yozuvlar uch narsani beradi: **takrorlash** (bir yildan keyin xuddi shu ovni qayta o'tkazish mumkin), **o'lchash** (nechta ov, nechta topilma, nechta yangi qoida), va **portfolio** (shu bosqichning laboratoriya darsi — "Kamida 3 ta ovni hujjatlashtirdim" maqsadi).

:::key
**Yaxshi ovning eng qimmatli natijasi ko'pincha topilma emas — yangi aniqlash qoidasi.** Ov — qimmat, qo'lda bajariladigan ish. Uning maqsadi: bir marta qo'lda topgan narsani keyingi safar **avtomatik** topish. Har bir ov oxirida so'rang: "Buni qoidaga aylantira olamanmi?" Javob "ha" bo'lsa — detection engineering darsidagi hayot sikli bo'yicha qoida yozing. Shunday qilib, ov SOC'ning qamrovini doimiy kengaytiradi: bugungi ov — ertangi ogohlantirish.
:::

## Ovchi uchun nima kerak

| Ko'nikma | Qayerda o'rgangansiz |
|---|---|
| Normal holatni bilish (baseline) | b1 — triage, Sysmon, EDR darslari |
| Log manbalari va ular nimani ko'rsatadi | b1 bosqichi |
| So'rov tillari (SPL, KQL) | b2 — Splunk, Elastic darslari |
| Hujumchi texnikalari | b2 — ATT&CK, CTI darslari |
| Forensika va IR | b3 bosqichi |
| Statistik fikrlash | Stacking, baseline, chetlanishlar |
| Qiziquvchanlik va sabr | Har bir "g'alati" narsaning sababini topmaguncha to'xtamaslik |

Oxirgi qator jiddiy: eng yaxshi hunter'lar — "bu nima uchun shunday?" degan savolni hech qachon qo'ymaydigan odamlar emas. Har bir g'alatilikning javobi bo'lishi kerak — va ko'pincha javob zerikarli (noto'g'ri sozlangan dastur). Lekin bir kuni — yo'q.

## Ov yetuklik modeli

Tashkilotlar ov qobiliyati bo'yicha farq qiladi. Mashhur model (Hunting Maturity Model) besh darajani ajratadi:

| Daraja | Tavsif |
|---|---|
| **0 — Boshlang'ich** | Faqat avtomatik ogohlantirishlar; ov yo'q |
| **1 — Minimal** | IOC'lar bo'yicha qidiruv (tahdid razvedkasi asosida) |
| **2 — Protsedurali** | Boshqalar yozgan tayyor ov protseduralarini bajarish |
| **3 — Innovatsion** | O'z gipotezalari va usullarini yaratish |
| **4 — Yetakchi** | Muvaffaqiyatli ovlarni avtomatlashtirish — qoidalarga aylantirish |

Boshlang'ich analitik sifatida 1–2 darajadan boshlaysiz. Maqsad — 3 va 4: o'z gipotezalaringiz va ularni qoidaga aylantirish.

### Ovni mashq qilish

Amaliyot bo'limidagi SIEM CTF'lari — kichik ovlar: **kam uchraydigan jarayon** (`rare` bilan stack counting), **muntazam qo'ng'iroq** (beaconing'ni oraliq bo'yicha topish), **parol purkash** va **imkonsiz sayohat**. Har birida avval gipotezani yozing, keyin so'rovni.

:::lab siem-ws-bux-014

## Ov nimani qilmaydi

- **Har doim hujumchini topmaydi** — va bu muvaffaqiyatsizlik emas, agar xulosa asosli bo'lsa.
- **Ma'lumotsiz ishlamaydi** — log bo'lmagan joyda ov ham yo'q (lekin bo'shliqni ko'rsatadi).
- **Monitoringning o'rnini bosmaydi** — u to'ldiradi.
- **Tasodifiy qidiruv emas** — gipotezasiz "nimadir g'alati topaman" — vaqtni behuda sarflash.
- **Bir martalik emas** — muhit va hujumchilar o'zgaradi; ovlar takrorlanadi.

:::try
**1. Gipoteza yozing.** Quyidagi texnikalar uchun formula bo'yicha aniq gipoteza yozing (texnika → maqsad → ma'lumot manbai → belgi):
- (a) T1136.001 — lokal hisob yaratish
- (b) T1071.004 — DNS orqali C2
- (c) T1021.001 — RDP orqali tarmoq ichida harakatlanish

**2. Stacking.** O'z laboratoriyangizdagi (b2 bosqichi) Wazuh yoki Splunk'da barcha jarayonlar uchun stacking qiling: qaysi `Image` lar faqat bitta qurilmada ishlagan? Har birini tushuntirib bera olasizmi?

**3. To'liq ov.** Laboratoriyangizda yuqoridagi "rejalashtirilgan vazifalar" ovini to'liq o'tkazing: gipoteza, ma'lumot tekshiruvi, so'rov, tahlil, xulosa — va shablon bo'yicha hujjatlashtiring. Bu sizning birinchi portfolio ovingiz.

**4. TryHackMe** — "Threat Hunting: Introduction" va undan keyingi ov xonalarini bajaring.

*Javoblar: 1a — "Hujumchi persistence uchun yangi lokal hisob yaratishi mumkin (T1136.001); bu Security 4720 va `net user /add` buyruq satrlarida ko'rinadi; oxirgi 30 kunda IT jamoasidan tashqari kim lokal hisob yaratgan?" 1b — "C2 DNS orqali bo'lishi mumkin; DNS loglarida bitta qurilmadan bitta domen ostida ko'p noyob, uzun subdomenlar ko'rinadi." 1c — "O'g'irlangan hisob bilan RDP orqali harakatlanish 4624 Type 10 da ko'rinadi; qaysi hisoblar oxirgi 14 kunda odatda ulanmaydigan serverlarga RDP qilgan?"*
:::

## Xulosa

- **Threat hunting** — ogohlantirishni kutmasdan, "buzilish allaqachon bo'lgan" deb faraz qilib faol qidirish; qoida **yozilmagan** narsalarni topadi.
- Turlari: **gipotezaga**, **razvedkaga**, **ma'lumotga** (anomaliya) va **vaziyatga** asoslangan.
- Sikl: **gipoteza → ma'lumot bormi → qidiruv → tahlil → xulosa → mustahkamlash** (qoida, bo'shliqlarni yopish).
- Yaxshi gipoteza — aniq, tekshirsa bo'ladigan: **texnika + maqsad + ma'lumot manbai + belgi**; manbalar — ATT&CK bo'shliqlari, CTI, DFIR hisobotlari.
- Usullar: qidirish, guruhlash, **stacking** (kam uchraydiganlar), klasterlash, vizualizatsiya.
- Har bir ov hujjatlashtiriladi; eng qimmatli natija — **yangi aniqlash qoidasi**.
- "Topilmadi" — asosli bo'lsa, natija; log bo'shliqlari — ham natija.

:::quiz
? Threat hunting'ning monitoringdan asosiy farqi nima?
- Hunting faqat tunda bajariladi
+ Hunting ogohlantirishni kutmasdan, gipoteza asosida qoida yozilmagan narsalarni faol qidiradi
- Hunting faqat antivirus bilan bajariladi
- Farqi yo'q
! Monitoring reaktiv — ogohlantirishga javob beradi; hunting proaktiv.

? “Assume breach” tamoyili nimani anglatadi?
+ Hujumchi allaqachon ichkarida bo'lishi mumkin deb faraz qilib, uni qidirish
- Barcha tizimlarni o'chirish
- Hech qachon himoya qatlamlariga ishonmaslik va ularni olib tashlash
- Faqat tashqi hujumlarni kuzatish
! Himoya qatlamlari qanchalik yaxshi bo'lmasin, birortasi qachondir o'tkazib yuboradi.

? Qaysi gipoteza eng yaxshi?
- “Tarmog'imizda hujumchi bormi?”
- “PowerShell xavfli”
+ “Hujumchi Run kalitlari orqali persistence yaratgan bo'lishi mumkin; oxirgi 30 kunda imzosiz yoki foydalanuvchi papkalaridan ishga tushadigan yangi Run qiymatlari bormi?”
- “Hamma narsani tekshiramiz”
! Yaxshi gipoteza aniq texnika, ma'lumot manbai va tekshirsa bo'ladigan belgini o'z ichiga oladi.

? Stacking usulining g'oyasi nima?
- Eng ko'p uchraydigan qiymatlarni topish
+ Qiymatlarni sanab, eng kam uchraydiganlarini ko'rish — ular ko'pincha shubhali
- Loglarni o'chirish
- Faqat bitta qurilmani tekshirish
! Hamma qurilmada bor narsa — odatda korporativ; faqat bittasida bor — e'tiborga loyiq.

? Ov davomida kerakli log faqat 70% qurilmada yoqilgani ma'lum bo'ldi. Bu nima?
- Ovning muvaffaqiyatsizligi
+ Muhim natija — ko'rinishdagi bo'shliq hujjatlashtiriladi va yopiladi
- E'tiborsiz qoldiriladigan narsa
- Ovni to'xtatish sababi
! Ko'p ovlarning birinchi foydali natijasi aynan log bo'shliqlarini topish.

? Ov hech qanday zararli faoliyat topmadi. Bu qanday baholanadi?
+ Agar xulosa asosli va hujjatlashtirilgan bo'lsa — bu ham natija
- Vaqt behuda ketgan
- Ov noto'g'ri qilingan
- Ovni yashirish kerak
! “Bu texnika bizda kuzatilmadi” degan asosli xulosa ham qiymatga ega.

? Ovning eng qimmatli uzoq muddatli natijasi ko'pincha nima?
- Hisobot sahifalari soni
+ Qo'lda topilgan narsani avtomatik topadigan yangi aniqlash qoidasi
- Yangi vosita sotib olish
- Ko'proq log yig'ish
! Bugungi ov — ertangi ogohlantirish.

? Qaysi manba ov gipotezalari uchun eng yaxshi boshlanish nuqtalaridan biri?
+ ATT&CK Navigator'dagi qamrovsiz qolgan texnikalar
+ Sektoringizga hujum qilayotgan guruhlar haqidagi CTI hisobotlari
- Tasodifiy tanlangan log yozuvlari
- Faqat eng ko'p uchraydigan jarayonlar
! Tahdid va qamrov bo'shliqlari ovni eng foydali joyga yo'naltiradi.

? Ov hujjatida “Keyingi ov” bo'limi nima uchun kerak?
- Hujjatni uzaytirish uchun
+ Ovlar uzluksiz siklga aylanishi va bir ov keyingisiga gipoteza berishi uchun
- Rahbariyat talab qiladi
- Bu majburiy emas va foydasiz
! Ov sikli: har bir xulosa yangi savolga olib keladi.

? Hunting Maturity Model'ning eng yuqori darajasi nimani anglatadi?
- Faqat IOC qidirish
- Tayyor protseduralarni bajarish
+ Muvaffaqiyatli ovlarni avtomatlashtirish — ularni doimiy qoidalarga aylantirish
- Ov qilmaslik
! 0 — ov yo'q; 1 — IOC; 2 — protseduralar; 3 — o'z gipotezalari; 4 — avtomatlashtirish.
:::

:::cards
Threat hunting nima? :: Ogohlantirishni kutmasdan, gipoteza asosida yashirin hujumchi izlarini faol qidirish.
Assume breach? :: Hujumchi allaqachon ichkarida bo'lishi mumkin degan faraz bilan ishlash.
Ov turlari? :: Gipotezaga, razvedkaga (CTI), ma'lumotga (anomaliya) va vaziyatga asoslangan.
Ov sikli? :: Gipoteza → ma'lumot bormi → qidiruv → tahlil → xulosa → mustahkamlash (qoida, bo'shliq) → yangi gipoteza.
Yaxshi gipoteza formulasi? :: [Hujumchi] [texnika] orqali [maqsad]ga erishishi mumkin; bu [ma'lumot manbai]da [belgi] sifatida ko'rinadi.
Gipoteza manbalari? :: ATT&CK qamrov bo'shliqlari, CTI hisobotlari, The DFIR Report, o'z insidentlaringiz, purple team natijalari.
Ov usullari? :: Qidirish, guruhlash, stacking, klasterlash, vizualizatsiya.
Stacking? :: Qiymatlarni sanab, eng kam uchraydiganlarini (masalan, 1–2 qurilmada) ko'rish.
Ov hujjatida nima bo'ladi? :: Gipoteza, manba, ma'lumot va qamrov, davr, so'rovlar, natija, bo'shliqlar, harakatlar, keyingi ov.
Ovning eng qimmatli natijasi? :: Yangi aniqlash qoidasi — qo'lda topilgan narsani keyingi safar avtomatik topish.
“Topilmadi” natijasi? :: Asosli va hujjatlashtirilgan bo'lsa — qimmatli xulosa; log bo'shliqlari ham natija.
Hunting Maturity Model? :: 0 — ov yo'q; 1 — IOC; 2 — protseduralar; 3 — o'z gipotezalari; 4 — avtomatlashtirish.
:::
