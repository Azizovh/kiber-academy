Tungi soat 03:14. Bank xodimlari uxlayapti, ofis qorong'i. Lekin bitta xonada ekranlar yoniq: kimdir hozirgina 800 ta muvaffaqiyatsiz urinishdan keyin serverga kirgan hisobni payqadi. Yigirma daqiqadan keyin o'sha hisob bloklangan, server tarmoqdan ajratilgan, navbatchi muhandis uyg'otilgan.

Bu xona — SOC. Poydevorda siz hujumlar qanday ishlashini va ular qanday iz qoldirishini o'rgandingiz. Endi shu izlarni topish **kasbingizga** aylanadi. Bu dars — ish joyingiz bilan tanishuv.

## SOC nima

[[soc|SOC]] (Security Operations Center) — tashkilot tizimlarini uzluksiz kuzatadigan, hujumlarni aniqlaydigan va ularga javob beradigan **jamoa, jarayonlar va vositalar** birligi.

E'tibor bering: SOC — xona yoki dastur emas. "Himoya qatlamlari" darsidagi uchlik: **odamlar, jarayonlar, texnologiya**. Eng qimmat [[siem|SIEM]] ham ogohlantirishlarni hech kim ko'rmasa — foydasiz.

SOC NIST funksiyalaridan ikkitasiga javob beradi: **Detect** (payqash) va **Respond** (javob berish). Uning asosiy vazifasi — o'tgan darsdagi **dwell time**ni qisqartirish: hujumchi kirgan paytdan uni payqashgacha o'tgan vaqt.

SOC nima qiladi:

| Vazifa | Mohiyati |
|---|---|
| **Monitoring** | Jurnallar va ogohlantirishlarni kecha-kunduz kuzatish |
| **Triage** | Har bir ogohlantirish haqiqiymi yoki yo'qligini aniqlash |
| **Tergov** | Nima bo'lgani, qanday va qayergacha yetgani |
| **Javob** | Cheklash, yo'q qilish, tiklashda qatnashish |
| **Aniqlashni yaxshilash** | Yangi qoidalar yozish, yolg'on signallarni kamaytirish |
| **Threat hunting** | Ogohlantirishni kutmasdan, yashiringan hujumchini izlash |
| **Hisobot** | Nima sodir bo'ldi va himoya qanday ishlayapti |

## Darajalar: L1, L2, L3

Ko'p SOC'lar uch darajali tuzilgan. Ogohlantirish pastdan yuqoriga "ko'tariladi":

```
   Ogohlantirishlar oqimi
            │
            ▼
   ┌─────────────────┐   yolg'on signal → yopiladi
   │  L1  Triage     │──────────────────────────────►
   └────────┬────────┘
            │ eskalatsiya: haqiqiy yoki noaniq
            ▼
   ┌─────────────────┐
   │  L2  Tergov     │   chuqur tahlil, cheklash
   └────────┬────────┘
            │ eskalatsiya: murakkab insident
            ▼
   ┌─────────────────┐
   │  L3  Ekspert    │   forensics, malware tahlili, hunting
   └─────────────────┘
```

| Daraja | Nomi | Nima qiladi | Tajriba |
|---|---|---|---|
| **L1** | Triage Analyst | Ogohlantirishlarni birlamchi tekshiradi, yolg'onlarini yopadi, haqiqiylarini uzatadi | 0–2 yil |
| **L2** | Incident Responder | Chuqur tergov, qamrovni aniqlash, cheklash choralari | 2–4 yil |
| **L3** | Threat Hunter / Senior | Murakkab insidentlar, forensics, zararli dastur tahlili, ov, yangi aniqlash usullari | 4+ yil |

Siz **L1** dan boshlaysiz. Halol tavsif: bu ish ko'p takrorlanadi — kuniga o'nlab o'xshash ogohlantirish, ularning aksariyati yolg'on signal. Lekin aynan shu yerda "normal" qanday ko'rinishini o'rganasiz — usiz "g'ayrioddiy"ni tanib bo'lmaydi.

Atrofdagi boshqa rollar:

| Rol | Vazifasi |
|---|---|
| **SOC Manager** | Jamoa, jarayonlar, rahbariyat bilan aloqa |
| **Detection Engineer** | Aniqlash qoidalarini yozadi va sozlaydi |
| **SIEM Engineer** | Jurnal manbalarini ulaydi, platformani yuritadi |
| **Threat Intelligence Analyst** | Hujumchilar va ularning usullari haqida ma'lumot yig'adi |
| **Incident Response jamoasi** (CSIRT) | Katta insidentlarni boshqaradi |

Kichik tashkilotda bularning hammasini ikki-uch kishi bajaradi; ba'zilari SOC ni tashqi kompaniyaga topshiradi (**MSSP** — Managed Security Service Provider). Birinchi ishingiz aynan shunday kompaniyada bo'lishi ehtimoli katta: u yerda bir vaqtda o'nlab mijozni ko'rasiz — tez o'sish uchun yaxshi maktab.

## Uch so'z: event, alert, incident

Bu atamalarni adashtirmaslik — kasbiy savodxonlikning birinchi belgisi:

| Atama | Ma'nosi | Misol | Kuniga taxminan |
|---|---|---|---|
| **Event** (hodisa) | Tizimda sodir bo'lgan va yozib olingan har qanday narsa | Foydalanuvchi tizimga kirdi | Millionlab |
| [[alert|Alert]] (ogohlantirish) | Qoidaga mos kelgan, e'tibor talab qiladigan hodisa(lar) | 5 daqiqada 50 ta muvaffaqiyatsiz kirish | Yuzlab |
| [[incident|Incident]] (insident) | Tasdiqlangan xavfsizlik buzilishi yoki jiddiy tahdid | Hujumchi hisobni egallab olgan | Bir nechta yoki nol |

```
Millionlab hodisa ──► yuzlab ogohlantirish ──► bir nechta insident
        (SIEM qoidalari)            (triage — sizning ishingiz)
```

Bu voronka — SOC ishining mohiyati. SIEM millionni yuzga tushiradi; **siz** yuzni bir nechtaga tushirasiz. Va bu yerda ikki xato mumkin: haqiqiyni o'tkazib yuborish yoki yolg'onga vaqt sarflash.

## To'rt natija

Har bir ogohlantirish to'rt holatdan biriga tushadi:

| | Hujum **bor** | Hujum **yo'q** |
|---|---|---|
| **Ogohlantirish bor** | [[true-positive|True positive]] — to'g'ri ushlandi | [[false-positive|False positive]] — yolg'on signal |
| **Ogohlantirish yo'q** | **False negative** — o'tkazib yuborildi | True negative — hammasi joyida |

- **False positive** — vaqtingizni oladi. Juda ko'p bo'lsa, analitiklar charchaydi va ogohlantirishlarga ishonmay qo'yadi.
- **False negative** — eng xavflisi: hujum bor, lekin hech kim bilmaydi.

Ikkalasi bir-biriga bog'liq: qoidani "sezgirroq" qilsangiz — yolg'on signallar ko'payadi; "qattiqroq" qilsangiz — haqiqiy hujum o'tib ketishi mumkin. Muvozanatni topish — aniqlash muhandisligining san'ati.

Amalda uchinchi toifa ham bor — **benign true positive**: qoida to'g'ri ishladi, harakat haqiqatan sodir bo'ldi, lekin u qonuniy (masalan, administrator rejali ish qilyapti). Buni hujjatlashtirish kerak, aks holda ertaga yana tekshirasiz.

:::key
**Alert fatigue** (ogohlantirishdan charchash) — SOC ning asosiy kasalligi. Kuniga yuzlab yolg'on signal ko'rgan analitik oxiri hammasini "yana o'sha" deb yopa boshlaydi — va haqiqiysi ham shular qatorida ketadi. Shuning uchun yolg'on signallarni **kamaytirish** — ularni tez yopishdan muhimroq ish. Takrorlanayotgan yolg'on signal haqida doim xabar bering.
:::

## Ish kuni qanday o'tadi

L1 analitigining odatiy smenasi:

1. **Smenani qabul qilish.** Oldingi navbatchi nimalarni qoldirdi: ochiq tiketlar, kuzatilayotgan holatlar.
2. **Navbatdagi ogohlantirish.** Ustuvorlik bo'yicha: kritik → yuqori → o'rta.
3. **Triage.** Kontekst yig'ish, tekshirish, qaror qabul qilish (keyingi dars).
4. **Hujjatlashtirish.** Nima ko'rildi, nima tekshirildi, qanday xulosa.
5. **Yopish yoki eskalatsiya.**
6. **Smenani topshirish.**

Ko'p SOC'lar 24/7 ishlaydi — demak smenalar: kunduzgi, kechki, tungi. Hujumchilar dam olish kunlari va tunni afzal ko'radi: himoyachilar kam, javob sekin.

Tezlik o'lchanadi. Asosiy ko'rsatkichlar:

| Ko'rsatkich | Ma'nosi |
|---|---|
| **MTTD** (Mean Time To Detect) | Hujum boshlanganidan aniqlanguncha o'rtacha vaqt |
| **MTTA** (Mean Time To Acknowledge) | Ogohlantirish chiqqanidan analitik uni olguncha |
| **MTTR** (Mean Time To Respond) | Aniqlangandan bartaraf etilguncha |

Har bir ustuvorlik uchun javob muddati belgilanadi — [[sla|SLA]]: masalan, kritik ogohlantirish 15 daqiqa ichida olinishi kerak.

## Vositalar

Poydevorda ularning ko'pi bilan tanishgansiz — endi ular kundalik qurolingiz:

| Vosita | Vazifasi |
|---|---|
| [[siem|SIEM]] | Jurnallarni yig'ish, qidirish, ogohlantirish — asosiy ish oynasi |
| [[edr|EDR]] | Qurilmalardagi jarayonlar va xatti-harakat; qurilmani ajratish |
| **Tiket tizimi** | Har bir holat va bajarilgan ish yozuvi |
| **SOAR** | Takroriy qadamlarni avtomatlashtirish |
| **Tahdid razvedkasi manbalari** | IP, domen, xesh obro'sini tekshirish |
| **Sandbox** | Shubhali faylni xavfsiz muhitda ishga tushirib ko'rish |
| **Tarmoq vositalari** | Wireshark, IDS jurnallari |

Mahsulot nomlari tashkilotdan tashkilotga farq qiladi (Splunk, Elastic, Microsoft Sentinel, Wazuh…), lekin g'oya bir xil. Birini o'rgangan odam ikkinchisiga bir necha haftada o'tadi — shuning uchun avval **g'oyani**, keyin tugmalarni o'rganing.

## Jarayonlar va playbook

Tungi soat uchda, charchagan holda, "endi nima qilaman?" deb o'ylab o'tirish yaramaydi. Shuning uchun har bir keng tarqalgan ogohlantirish turi uchun [[playbook|playbook]] bor — qadam-baqadam yo'riqnoma:

```
PLAYBOOK: Ko'p muvaffaqiyatsiz kirish urinishi

1. Qaysi hisob(lar)? Bitta yoki ko'pmi?
2. Manba qayerdan: ichki yoki tashqi IP? Obro'si qanday?
3. Shu manbadan MUVAFFAQIYATLI kirish bo'lganmi?
   ├─ Ha  → ESKALATSIYA (L2). Hisobni bloklash tartibi: ...
   └─ Yo'q → 4-qadam
4. Hisob egasi bilan tasdiqlash mumkinmi? (parolni unutganmi?)
5. Manba tashqi va zararli bo'lsa — bloklash so'rovi.
6. Tiketga yozish va yopish.
```

Uchinchi qadam tanishmi? "Loglar va SSH" darsidagi asosiy naqsh: **muvaffaqiyatsiz urinishlar — shovqin; ulardan keyingi muvaffaqiyatli kirish — signal.** Poydevorda o'rganganingiz endi rasmiy jarayonga aylandi.

Playbook fikrlashni almashtirmaydi — u **minimal** darajani kafolatlaydi: hech kim muhim qadamni unutmaydi.

## Yaxshi analitikni nima ajratadi

Texnik bilim — kirish chiptasi. Ajratib turadigan narsalar boshqa:

| Xislat | Nega muhim |
|---|---|
| **Qiziquvchanlik** | "Bu nega bunday?" degan savolni oxirigacha yetkazish |
| **Shubha — lekin vahimasiz** | Har narsani tekshirish, lekin har narsada hujum ko'rmaslik |
| **Aniq yozish** | Tiketingizni tungi soatda boshqa odam o'qiydi va unga tayanib qaror qiladi |
| **"Bilmayman" deya olish** | Noaniq holatni yopib yuborgandan ko'ra eskalatsiya qilish yaxshi |
| **Normalni bilish** | G'ayrioddiyni faqat odatiyni bilgan odam taniydi |
| **Sovuqqonlik** | Haqiqiy insident paytida reja bo'yicha ishlash |

:::tip
Yangi analitikning eng keng tarqalgan xatosi — noaniq ogohlantirishni "ehtimol hech narsa emas" deb yopish. Qoida: **isbotlay olmasangiz — yopmang.** "Bu yolg'on signal, chunki…" jumlasini tugatib bera olmasangiz, tergovni davom ettiring yoki eskalatsiya qiling. Ortiqcha eskalatsiya uchun hech kim jazolamaydi; o'tkazib yuborilgan insident uchun — ha.
:::

## Kasbiy yo'l

SOC — sohaga kirish eshigi va undan ko'p yo'l ochiladi:

```
SOC L1 ──► SOC L2 ──► ┬─► Incident Response / Forensics
                      ├─► Threat Hunting
                      ├─► Detection Engineering
                      ├─► Threat Intelligence
                      ├─► Malware Analysis
                      └─► (hujum tomoniga) Pentest / Red Team
```

Oxirgi qator ham haqiqiy: haqiqiy hujumlarni ko'rgan analitik pentestga o'tganda nimani va qanday izlashni allaqachon biladi.

Bu tarmoqning keyingi darslari sizni aynan L1 ishiga tayyorlaydi: triage, Windows va Linux jurnallari, tarmoq trafigi, phishing tahlili.

:::try
**1. Vakansiyalarni o'qing.** LinkedIn yoki mahalliy ish saytlaridan 5 ta "SOC Analyst" (yoki "Axborot xavfsizligi mutaxassisi") e'lonini toping. Jadval tuzing: qaysi vositalar, qaysi ko'nikmalar, qaysi sertifikatlar eng ko'p so'ralgan? Shu ro'yxat — sizning o'quv rejangiz.

**2. Tasniflang.** Quyidagilar event, alert yoki incident?
a) Foydalanuvchi soat 09:02 da tizimga kirdi.
b) Bitta hisobga bir daqiqada 40 ta muvaffaqiyatsiz kirish urinishi qayd etildi va SIEM xabar berdi.
c) Tergov hujumchi xodim pochtasiga kirib, xatlarni yo'naltirish qoidasini o'rnatganini tasdiqladi.

**3. To'rt natija.** Antivirus administratorning qonuniy masofaviy boshqaruv vositasini "zararli" deb belgiladi. Bu qaysi natija? Uni shunchaki yopish to'g'rimi?

**4. Amaliyot.** TryHackMe'dagi "Junior Security Analyst Intro" xonasini o'ting (mavzu manbalarida).

*Javoblar: 2) a — event, b — alert, c — incident. 3) False positive (yoki benign true positive); yopishdan oldin haqiqatan o'sha administrator ekanini tasdiqlash va takrorlanmasligi uchun xabar berish kerak.*
:::

## Xulosa

- **SOC** — odamlar, jarayonlar va texnologiya: kuzatish, aniqlash, javob berish.
- Darajalar: **L1** — triage; **L2** — tergov va cheklash; **L3** — ekspert tahlili va ov.
- **Event** → **alert** → **incident**: millionlardan bir nechtagacha.
- To'rt natija: true/false positive, true/false negative; eng xavflisi — **false negative**.
- **Alert fatigue** — asosiy xavf; yolg'on signallarni kamaytirish kerak.
- Ko'rsatkichlar: MTTD, MTTA, MTTR; javob muddati — SLA.
- **Playbook** — har ogohlantirish turi uchun qadam-baqadam reja.
- Isbotlay olmasangiz — yopmang: tergov yoki eskalatsiya.

:::quiz
? SOC nimalardan iborat?
- Faqat SIEM dasturidan
+ Odamlar, jarayonlar va texnologiyadan
- Faqat monitorlar o'rnatilgan xonadan
- Faqat antivirusdan
! Vosita ogohlantirish beradi, lekin uni tekshiradigan odam va tartib bo'lmasa, foyda yo'q.

? L1 analitigining asosiy vazifasi nima?
- Zararli dasturni chuqur tahlil qilish
+ Ogohlantirishlarni birlamchi tekshirish: yolg'onini yopish, haqiqiysini yuqoriga uzatish
- SIEM platformasini o'rnatish
- Xavfsizlik siyosatini yozish
! L1 — triage. Chuqur tergov L2 da, ekspert tahlili va ov L3 da.

? Event, alert va incident orasidagi farq qaysi qatorda to'g'ri berilgan?
- Uchalasi bir xil narsa
+ Event — har qanday yozilgan hodisa; alert — qoidaga mos kelgan ogohlantirish; incident — tasdiqlangan buzilish
- Alert — eng jiddiysi, incident — eng yengili
- Event faqat tarmoqqa tegishli
! Millionlab hodisadan qoidalar yuzlab ogohlantirish ajratadi; triage ulardan bir nechta insidentni aniqlaydi.

? Hujum sodir bo'ldi, lekin hech qanday ogohlantirish chiqmadi. Bu qaysi natija?
- True positive
- False positive
+ False negative
- True negative
! Eng xavfli holat: hujum bor, lekin himoya uni ko'rmadi.

? Alert fatigue nima va nega xavfli?
- Kompyuterning qizib ketishi
+ Juda ko'p yolg'on signaldan charchash — analitik haqiqiy ogohlantirishni ham e'tiborsiz qoldira boshlaydi
- Jurnallar hajmining ortishi
- Parolning eskirishi
! Shuning uchun yolg'on signallarni kamaytirish — ularni tez yopishdan muhimroq.

? Ogohlantirish noaniq: zararli ekanini ham, zararsiz ekanini ham isbotlay olmadingiz. Nima qilasiz?
- “Ehtimol hech narsa emas” deb yopaman
+ Tergovni davom ettiraman yoki eskalatsiya qilaman
- O'chirib yuboraman
- Ertagacha qoldiraman
! Qoida: isbotlay olmasangiz — yopmang. Ortiqcha eskalatsiya o'tkazib yuborilgan insidentdan ancha arzon.

? Playbook nima uchun kerak?
- Analitik o'ylamasligi uchun
+ Har bir ogohlantirish turi uchun muhim qadamlar unutilmasligini ta'minlash uchun
- Jurnallarni saqlash uchun
- Faqat hisobot uchun
! Playbook minimal darajani kafolatlaydi; fikrlashni almashtirmaydi.

? MTTD nimani o'lchaydi?
- Insidentni bartaraf etish vaqtini
+ Hujum boshlanganidan aniqlanguncha o'tgan o'rtacha vaqtni
- Analitikning ish soatlarini
- Jurnallar saqlanish muddatini
! Mean Time To Detect. Bartaraf etish vaqti — MTTR.

? Qoidani juda sezgir qilib sozlasangiz nima bo'ladi?
- False negative ko'payadi
+ False positive ko'payadi
- Ogohlantirishlar butunlay to'xtaydi
- Hech narsa o'zgarmaydi
! Sezgirlik va aniqlik o'rtasida muvozanat bor: sezgirroq qoida ko'proq yolg'on signal beradi.

? “Benign true positive” nima?
- Qoida noto'g'ri ishlagan holat
+ Qoida to'g'ri ishladi va harakat haqiqatan bo'ldi, lekin u qonuniy edi
- Hujum o'tkazib yuborilgan holat
- Jurnal yozilmagan holat
! Masalan, administratorning rejali ishi. Uni hujjatlashtirish kerak, aks holda qayta-qayta tekshiriladi.
:::

:::cards
SOC nima? :: Tashkilot tizimlarini uzluksiz kuzatadigan, hujumlarni aniqlaydigan va javob beradigan jamoa, jarayonlar va vositalar birligi.
L1, L2, L3 vazifalari? :: L1 — triage (birlamchi tekshiruv); L2 — chuqur tergov va cheklash; L3 — ekspert tahlili, forensics, ov.
Event, alert, incident? :: Event — yozilgan har qanday hodisa; alert — qoidaga mos kelgan ogohlantirish; incident — tasdiqlangan buzilish.
True/false positive va negative? :: TP — hujum to'g'ri ushlandi; FP — yolg'on signal; FN — hujum o'tkazib yuborildi; TN — hujum ham, signal ham yo'q.
Eng xavfli natija qaysi? :: False negative — hujum bor, lekin ogohlantirish yo'q.
Alert fatigue? :: Yolg'on signallar ko'pligidan charchash; haqiqiy ogohlantirish ham e'tiborsiz qoladi.
MTTD, MTTA, MTTR? :: Aniqlashgacha, ogohlantirishni olishgacha va bartaraf etishgacha o'rtacha vaqt.
Playbook nima? :: Ma'lum turdagi ogohlantirish uchun qadam-baqadam harakatlar rejasi.
Noaniq ogohlantirish qoidasi? :: Isbotlay olmasangiz — yopmang: tergovni davom ettiring yoki eskalatsiya qiling.
MSSP nima? :: Managed Security Service Provider — boshqa tashkilotlar uchun SOC xizmatini ko'rsatuvchi kompaniya.
:::
