Bitta SOC analitigi vakansiyasiga 200 ta rezyume keldi. HR mutaxassisi har biriga o'rtacha **10–20 soniya** qaraydi. Undan oldin esa, ko'p kompaniyalarda, rezyumeni avtomatik tizim saralaydi — va rezyumelarning bir qismi hech qachon odam ko'ziga yetib bormaydi.

Siz bu kursda yuzlab soat o'qidingiz, laboratoriya qurdingiz, writeup'lar yozdingiz. Endi bularning hammasini **bir sahifaga**, **20 soniyada tushuniladigan** qilib joylash kerak.

Rezyume — sizning tarjimai holingiz emas. U — **reklama**: uning yagona vazifasi — sizni intervyuga olib borish.

## Rezyume qayerdan o'tadi

```
 Sizning rezyume
      │
      ▼
 ┌─────────────────────┐
 │ ATS (avtomatik)     │  ← kalit so'zlar, formatni o'qiy olishi
 └─────────┬───────────┘
           ▼
 ┌─────────────────────┐
 │ HR (10–20 soniya)   │  ← lavozimga mosmi? aniq va tartiblimi?
 └─────────┬───────────┘
           ▼
 ┌─────────────────────┐
 │ Texnik rahbar       │  ← qanday ko'nikmalar, qanday loyihalar, dalillar bormi?
 └─────────┬───────────┘
           ▼
       INTERVYU
```

Har bir bosqich boshqa narsaga qaraydi, va rezyume uchalasidan ham o'tishi kerak.

### ATS — avtomatik saralash

[[ats|ATS]] (Applicant Tracking System) — rezyumelarni qabul qiladigan, saqlaydigan va ko'pincha kalit so'zlar bo'yicha saralaydigan tizim. U bilan do'st bo'lish uchun:

| Qiling | Qilmang |
|---|---|
| Oddiy, bir ustunli tuzilish | Murakkab ikki-uch ustunli dizayn, jadvallar ichida matn |
| Standart bo'lim nomlari: "Experience", "Projects", "Skills", "Education" | Ijodiy nomlar ("Mening sarguzashtlarim") |
| Vakansiyadagi **aniq atamalar** (agar ular sizda haqiqatan bo'lsa): "SIEM", "Splunk", "incident response" | Faqat qisqartmalar yoki faqat to'liq nomlar — ikkalasini bering: "Security Information and Event Management (SIEM)" |
| PDF (agar boshqacha so'ralmagan bo'lsa) yoki DOCX | Rasm ko'rinishidagi rezyume, matn rasm ichida |
| Oddiy shriftlar | Ko'p ikonkalar, grafiklar, "ko'nikma darajasi" chiziqlari |

"Ko'nikma darajasi" chiziqlari ("Python ████░ 80%") haqida alohida: ular ATS uchun foydasiz va texnik rahbar uchun ma'nosiz — "80% Python" nima degani? O'rniga — Python bilan **nima qilganingizni** yozing.

## Tuzilishi — bir sahifa

Boshlang'ich mutaxassis uchun: **bir sahifa**. Har bir qator o'z o'rnini oqlashi kerak.

```
┌────────────────────────────────────────────────────────────────┐
│ ISM FAMILIYA                                                   │
│ SOC Analyst (Junior) · Toshkent · email · telefon              │
│ linkedin.com/in/... · github.com/... · blog                    │
├────────────────────────────────────────────────────────────────┤
│ QISQACHA (2–3 qator)                                           │
│ Kim siz, nima qila olasiz, nimaga intilasiz                    │
├────────────────────────────────────────────────────────────────┤
│ KO'NIKMALAR (guruhlangan)                                      │
├────────────────────────────────────────────────────────────────┤
│ LOYIHALAR  ← tajriba yo'q bo'lsa, eng muhim bo'lim             │
├────────────────────────────────────────────────────────────────┤
│ TAJRIBA (agar bor bo'lsa — IT bo'lmagan ish ham)               │
├────────────────────────────────────────────────────────────────┤
│ SERTIFIKATLAR · TA'LIM                                         │
├────────────────────────────────────────────────────────────────┤
│ TILLAR                                                         │
└────────────────────────────────────────────────────────────────┘
```

Tajribangiz bo'lmasa, **Loyihalar** bo'limini Tajriba'dan **yuqoriga** qo'ying — eng kuchli dalillaringiz birinchi ko'rinsin.

### Sarlavha

- **Ism** — katta.
- **Maqsad lavozim** — vakansiyadagi nom bilan ("SOC Analyst", "Junior Penetration Tester").
- **Aloqa**: professional email (`ism.familiya@...`, `hackerboy2005@...` emas), telefon, shahar (to'liq manzil shart emas).
- **Havolalar**: LinkedIn, **GitHub** (portfolio!), blog.

### Qisqacha (Summary)

2–3 qator. Yomon va yaxshi misol:

```
YOMON:
Mehnatkash, tez o'rganuvchi, jamoada ishlay oladigan, kiberxavfsizlikka qiziquvchi yigit.

YAXSHI:
Junior SOC analyst with a hands-on home SOC lab (Wazuh, Sysmon, Suricata).
Wrote and tested 9 detection rules mapped to MITRE ATT&CK and documented
7 simulated attack investigations. Preparing for CompTIA Security+.
```

Birinchisini har kim yozishi mumkin — u hech narsani isbotlamaydi. Ikkinchisi — **aniq, tekshirsa bo'ladigan, raqamlar bilan**.

### Ko'nikmalar — guruhlab

```
Security:   SIEM (Splunk, Wazuh), Sysmon, Windows Event Logs, Suricata, Zeek,
            MITRE ATT&CK, Sigma, YARA, incident response, phishing analysis
Systems:    Windows, Linux (Ubuntu), Active Directory basics, virtualization
Networking: TCP/IP, DNS, HTTP/S, Wireshark, firewall concepts
Scripting:  Python (requests, automation), Bash, PowerShell, SPL, KQL
```

Faqat **haqiqatan bilgan** narsalaringizni yozing. Intervyuda har bir so'z bo'yicha savol berilishi mumkin — va "rezyumemda bor, lekin bilmayman" eng yomon holat.

### Loyihalar — eng muhim bo'lim

Har bir loyiha: **nomi + havola + 2–3 ta natijali qator**.

```
SOC Home Lab — github.com/.../soc-home-lab
• Built a 4-VM SOC lab (Wazuh, Sysmon, auditd, Suricata) with all log sources verified in the SIEM
• Wrote 9 detection rules (Sigma/Wazuh/Suricata) and validated each with Atomic Red Team
• Found and fixed a Sysmon config exclusion that hid registry Run-key persistence

IOC Enrichment Script — github.com/.../ioc-checker
• Python tool that checks hashes, IPs and domains against VirusTotal and AbuseIPDB
• Filters private IPs before external lookups; handles API rate limits and errors
```

### "Nima qildim" emas — "nimaga erishdim"

Har bir qator uchun formula:

**Harakat fe'li + nima qildingiz + natija / raqam / ta'sir**

| Kuchsiz | Kuchli |
|---|---|
| "Wazuh bilan ishladim" | "Wazuh'da 5 ta log manbasini ulab, har birining parsing'ini tekshirdim" |
| "Python bilaman" | "IOC tekshirishni avtomatlashtiruvchi Python skript yozdim — qo'lda 15 daqiqalik ishni 1 daqiqaga qisqartirdi" |
| "CTF'larda qatnashdim" | "20 ta forensika va web topshiriqlarini yechib, writeup'larini nashr qildim" |
| "Phishing haqida bilaman" | "SPF/DKIM/DMARC va sarlavhalar tahlili bo'yicha 10 ta phishing namunasini tahlil qilib, hisobot yozdim" |
| "Helpdesk'da ishladim" | "Kuniga 30+ so'rovni hal qildim; parolni tiklash jarayonini hujjatlashtirib, takroriy so'rovlarni 20% ga kamaytirdim" |

Oxirgi qatorga e'tibor bering: **IT bo'lmagan yoki xavfsizlik bo'lmagan tajriba ham qimmatli**, agar uni to'g'ri yozsangiz. Helpdesk — foydalanuvchilar bilan ishlash, muammolarni hal qilish, hujjatlashtirish. Sotuvchi — muloqot, bosim ostida ishlash. O'qituvchi — tushuntirish ko'nikmasi. Bularning hammasi SOC'da kerak — bu [[soft-skills|soft skills]].

Raqamlar haqida halol bo'ling: faqat haqiqiy, tekshirsa bo'ladigan raqamlar. Intervyuda "20% ni qanday o'lchadingiz?" deb so'rashlari mumkin.

## Vakansiyaga moslash

Bitta rezyumeni 100 ta vakansiyaga yuborish — eng keng tarqalgan xato. To'g'ri yo'l:

1. **Asosiy rezyume** — barcha loyihalar, ko'nikmalar, tajriba (bir sahifadan uzunroq bo'lishi mumkin — bu sizning "ombor"ingiz).
2. Har bir muhim vakansiya uchun — **moslashtirilgan nusxa**:
   - Vakansiyadagi kalit so'zlarni (sizda **haqiqatan** bor bo'lganlarini) ko'nikmalar va loyihalarda ishlating.
   - Eng mos loyihalarni yuqoriga qo'ying.
   - Qisqachani shu lavozimga moslang.

Masalan, vakansiyada "Microsoft Sentinel, KQL" ko'p tilga olingan bo'lsa — Elastic/Wazuh darsidagi Kusto bilimingizni va bulut loglari darsidagi Sentinel so'rovlarini oldinga chiqaring.

:::warn
**Hech qachon yolg'on yozmang.** Bilmagan vositani "bilaman" deb yozish, bo'lmagan tajribani o'ylab topish yoki boshqaning loyihasini o'zingiznikidek ko'rsatish — kiberxavfsizlikda ayniqsa xavfli. Bu soha **ishonch** ustiga qurilgan: sizga tizimlar, ma'lumotlar va insidentlar ishoniladi. Yolg'on intervyuda yoki sinov muddatida fosh bo'ladi, va xavfsizlik hamjamiyati kichik — obro' tez tarqaladi. "O'rganyapman" yoki "laboratoriyada" deb yozish — mutlaqo normal va halol.
:::

## Til va mahalliy odatlar

| Savol | Tavsiya |
|---|---|
| Qaysi tilda? | Vakansiya tilida. Xalqaro va IT kompaniyalar — ko'pincha **ingliz**; mahalliy kompaniyalar — o'zbek yoki rus tilida ham. Ikki-uch tilda tayyor nusxa foydali |
| Rasm kerakmi? | Xalqaro amaliyotda — odatda **yo'q**. Mahalliy kompaniyalarda ba'zan kutiladi — vakansiyaga va kompaniya madaniyatiga qarang. Qo'ysangiz — professional, oddiy fon |
| Yosh, oilaviy holat, millat | Xalqaro rezyumelarda yozilmaydi; mahalliy bozorda ba'zan so'raladi — faqat so'ralsa |
| Imlo | Bitta imlo xatosi ham "e'tiborsiz" degan taassurot qoldiradi — ayniqsa e'tibor muhim bo'lgan xavfsizlik sohasida. Kimgadir o'qiting |

## Eng keng tarqalgan xatolar

| Xato | Tuzatish |
|---|---|
| 2–3 sahifa, hamma narsa | Bir sahifa, faqat lavozimga tegishli |
| Har bir ish o'rni — vazifalar ro'yxati | Natijalar va raqamlar |
| "Mehnatkash, tez o'rganuvchi" | Dalil: "3 oyda 4 bosqichli SOC kursini tugatdim va laboratoriya qurdim" |
| GitHub havolasi yo'q | Portfolio — eng kuchli dalilingiz; havola sarlavhada |
| Bitta rezyume hamma joyga | Har bir muhim vakansiyaga moslash |
| Murakkab dizayn | Oddiy, bir ustun, ATS o'qiy oladigan |
| Bilmagan narsalar ko'nikmalarda | Faqat haqiqatan bilganlar |
| Fayl nomi `rezyume.pdf` | `Ism_Familiya_SOC_Analyst.pdf` |

:::key
**Rezyumening har bir qatori bitta savolga javob berishi kerak: "Bu meni shu lavozim uchun yaxshiroq nomzod qiladimi?"** Javob "yo'q" bo'lsa — o'chiring. Boshlang'ich mutaxassisning eng kuchli kozirlari — **loyihalar, raqamlar va havolalar**: ular so'zlarni dalillarga aylantiradi. HR 20 soniyada "bu odam nimadir **qilgan**" degan taassurot olsa — rezyume o'z vazifasini bajardi.
:::

## Fikr olish

Rezyumeni o'zingiz baholay olmaysiz — ko'zingiz o'rganib qolgan. Curriculum'dagi maqsad: **kamida bitta odamga ko'rsatib, fikr olish**.

Kimga ko'rsatish mumkin:
- Sohada ishlayotgan tanish yoki hamjamiyatdagi odam (keyingi dars).
- HR yoki ishga qabul tajribasi bor odam.
- Hamjamiyatlardagi rezyume tahlili kanallari.

So'rash kerak bo'lgan savollar: "20 soniyada nimani tushundingiz? Qaysi lavozimga mos deb o'ylaysiz? Nima ortiqcha? Nima yetishmaydi?"

## Rezyume nimani qilmaydi

- **Ishni o'zi bermaydi** — u faqat intervyuga olib boradi.
- **Hamma vakansiyaga bir xil ishlamaydi** — moslash kerak.
- **Dalillarsiz kuchli bo'lmaydi** — portfolio va havolalar uni qo'llab-quvvatlaydi.
- **Bir marta yozilib, tugamaydi** — har bir yangi loyiha, sertifikat va tajriba bilan yangilanadi.

:::try
**1. Asosiy rezyume.** Yuqoridagi tuzilish bo'yicha "asosiy" rezyume yozing — barcha loyihalar, ko'nikmalar va tajriba bilan.

**2. Qatorlarni kuchaytiring.** Har bir loyiha va tajriba qatorini "harakat + nima + natija/raqam" formulasi bo'yicha qayta yozing. Kamida 5 ta qatorda aniq raqam bo'lsin (haqiqiy!).

**3. Moslashtiring.** Ish bozori darsidagi jadvalingizdan bitta vakansiyani tanlang va rezyumeni unga moslab bir sahifali nusxa tayyorlang. Vakansiyadagi kalit so'zlardan qaysilari rezyumengizda bor?

**4. ATS tekshiruvi.** Rezyumeni PDF qilib saqlang, keyin undagi matnni nusxalab oddiy matn muharririga joylang. Matn tartibli chiqdimi? Ustunlar aralashib ketmadimi? Agar aralashsa — ATS ham shunday o'qiydi.

**5. Fikr oling.** Kamida bitta odamga ko'rsating va yuqoridagi to'rt savolni bering. Fikrga ko'ra tuzating.
:::

## Xulosa

- Rezyume — **reklama**: vazifasi — intervyuga olib borish; HR 10–20 soniya qaraydi.
- Uch filtr: **ATS** (kalit so'zlar, oddiy format), **HR** (moslik, aniqlik), **texnik rahbar** (dalillar).
- **Bir sahifa**: sarlavha (lavozim, havolalar) → qisqacha → ko'nikmalar (guruhlab) → **loyihalar** (tajriba yo'q bo'lsa — yuqorida) → tajriba → sertifikatlar va ta'lim → tillar.
- Har qator: **harakat + nima + natija/raqam**; IT bo'lmagan tajriba ham soft skills sifatida qimmatli.
- Har bir muhim vakansiyaga **moslang**; faqat haqiqatan bor ko'nikmalar.
- **Hech qachon yolg'on** — xavfsizlik ishonch ustiga qurilgan.
- Til va odatlar — vakansiyaga qarab; imlo xatosiz; fayl nomi aniq.
- Kamida bitta odamdan **fikr oling**.

:::quiz
? Rezyumening asosiy vazifasi nima?
- Butun hayotingizni batafsil tasvirlash
+ Sizni intervyuga olib borish
- Ish shartnomasi o'rnini bosish
- Ko'nikmalarni foizda ko'rsatish
! Rezyume — reklama; batafsil suhbat intervyuda bo'ladi.

? ATS bilan muammo bo'lmasligi uchun qaysi tavsiya to'g'ri?
+ Oddiy bir ustunli tuzilish, standart bo'lim nomlari va vakansiyadagi aniq atamalar (agar haqiqatan bor bo'lsa)
- Murakkab uch ustunli dizayn va ko'p ikonkalar
- Rezyumeni rasm ko'rinishida yuborish
- Ijodiy bo'lim nomlari
! ATS matnni o'qiy olishi va kalit so'zlarni topishi kerak.

? Ish tajribasi yo'q boshlang'ich mutaxassis rezyumesida qaysi bo'lim yuqorida bo'lishi kerak?
- Sevimli mashg'ulotlar
+ Loyihalar
- Maktab baholari
- Oilaviy holat
! Eng kuchli dalillar birinchi ko'rinishi kerak.

? Qaysi qator eng kuchli?
- “Wazuh bilan ishladim”
- “Mehnatkash va tez o'rganuvchiman”
+ “Wazuh'da 5 ta log manbasini ulab, 9 ta aniqlash qoidasi yozdim va har birini Atomic Red Team bilan sinadim”
- “Kiberxavfsizlikka qiziqaman”
! Harakat + nima + natija/raqam formulasi.

? “Python ████░ 80%” kabi ko'nikma darajasi chiziqlari haqida qaysi gap to'g'ri?
- Ular eng yaxshi usul
+ Ular ATS uchun foydasiz va texnik rahbar uchun ma'nosiz — Python bilan nima qilganingizni yozish kerak
- Ular majburiy
- Ular faqat xalqaro kompaniyalar uchun
! “80% Python” hech narsani o'lchamaydi.

? Helpdesk tajribasini SOC lavozimiga rezyumeda qanday ko'rsatish kerak?
- Umuman yozmaslik
+ Natijalar va soft skills bilan: muammolarni hal qilish, foydalanuvchilar bilan ishlash, hujjatlashtirish, raqamlar
- Faqat ish joyi nomini yozish
- Uni xavfsizlik tajribasi deb ko'rsatish
! IT bo'lmagan yoki xavfsizlik bo'lmagan tajriba ham to'g'ri yozilsa qimmatli.

? Bitta rezyumeni 100 ta vakansiyaga yuborishning muammosi nima?
- Hech qanday muammo yo'q
+ Har bir vakansiyaning kalit so'zlari va talablariga moslashmagani uchun filtrlardan o'tish ehtimoli past
- Bu juda qimmat
- Bu qonunga zid
! Asosiy rezyume + muhim vakansiyalar uchun moslashtirilgan nusxalar.

? Nega kiberxavfsizlik rezyumesida yolg'on ayniqsa xavfli?
+ Soha ishonch ustiga qurilgan; yolg'on intervyuda yoki sinov muddatida fosh bo'ladi va obro' tez tarqaladi
- Chunki rezyumeni hech kim o'qimaydi
- Chunki yolg'on aniqlanmaydi
- Bu boshqa sohalardan farq qilmaydi
! “O'rganyapman” yoki “laboratoriyada” deb yozish — halol va normal.

? Rezyumeni PDF'dan nusxalab matn muharririga joylash nima uchun foydali?
- Rezyumeni chiroyli qilish uchun
+ ATS uni qanday o'qishini taxminan tekshirish uchun — matn aralashib ketsa, formatni soddalashtirish kerak
- Fayl hajmini kamaytirish uchun
- Imloni avtomatik tuzatish uchun
! Ustunlar va jadvallar ko'pincha matnni aralashtirib yuboradi.

? Rezyumega fikr olishda qaysi savol eng foydali?
+ “20 soniyada nimani tushundingiz va qaysi lavozimga mos deb o'ylaysiz?”
- “Shrift chiroylimi?”
- “Rezyume uzunmi?”
- “Menga ish berasizmi?”
! Bu savol rezyumening asosiy vazifasini — tez va aniq taassurotni — tekshiradi.
:::

:::cards
Rezyumening vazifasi? :: Reklama — sizni intervyuga olib borish; HR 10–20 soniya qaraydi.
Rezyume o'tadigan uch filtr? :: ATS (avtomatik, kalit so'zlar), HR (moslik va aniqlik), texnik rahbar (dalillar).
ATS uchun qoidalar? :: Bir ustun, standart bo'lim nomlari, aniq atamalar (qisqartma + to'liq nom), PDF/DOCX, rasm ichida matn yo'q.
Boshlang'ich rezyume tuzilishi? :: Sarlavha → qisqacha → ko'nikmalar → loyihalar → tajriba → sertifikatlar va ta'lim → tillar; bir sahifa.
Sarlavhada nima bo'ladi? :: Ism, maqsad lavozim, professional email, telefon, shahar, LinkedIn, GitHub, blog.
Kuchli qator formulasi? :: Harakat fe'li + nima qildingiz + natija/raqam/ta'sir.
Qisqacha (summary) qanday yoziladi? :: 2–3 qator, aniq va tekshirsa bo'ladigan: laboratoriya, qoidalar soni, tahlillar, sertifikat rejasi.
Ko'nikmalar qanday yoziladi? :: Guruhlab (Security, Systems, Networking, Scripting), faqat haqiqatan bilganlar.
Vakansiyaga moslash? :: Asosiy rezyumedan nusxa; haqiqatan bor kalit so'zlar, eng mos loyihalar yuqorida, qisqacha moslangan.
IT bo'lmagan tajriba? :: Soft skills va natijalar bilan yoziladi: muloqot, muammo hal qilish, hujjatlashtirish.
Til va mahalliy odatlar? :: Vakansiya tilida; rasm va shaxsiy ma'lumotlar — kompaniya amaliyotiga qarab; imlo xatosiz.
Rezyumening oltin savoli? :: Bu qator meni shu lavozim uchun yaxshiroq nomzod qiladimi? Yo'q bo'lsa — o'chiring.
:::
