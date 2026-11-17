Bank direktori xavfsizlik bo'limiga savol beradi: "Har yili pentest qildiramiz, har yili hisobotda yigirmata zaiflik, har yili tuzatamiz. Lekin agar haqiqiy jinoiy guruh bizni nishonga olsa — SOC'imiz buni payqaydimi? Qancha vaqtda? Va to'xtata oladimi?"

Pentest bu savolga javob bermaydi. Pentest — "qanday zaifliklar bor?" degan savolga javob: iloji boricha ko'p zaiflikni, belgilangan muddatda, SOC'ga oldindan xabar berib topish. Direktorning savoli boshqa: **"Bizning himoyamiz — odamlar, jarayonlar va texnologiya birgalikda — haqiqiy hujumga bardosh beradimi?"** Bunga javob beradigan xizmat — **red team**.

Bu dars red team'ni himoyachi va tashkilot nuqtai nazaridan tushuntiradi: u pentestdan nimasi bilan farq qiladi, qanday rejalashtiriladi va boshqariladi, C2 nima va uni SOC qanday ko'radi, natijalari himoyani qanday kuchaytiradi. b4 bosqichidagi purple team darsi shu mavzuning himoya tomoni edi.

## Pentest, red team, purple team

| | Pentest | Red team | Purple team |
|---|---|---|---|
| Savol | Qanday zaifliklar bor? | Haqiqiy hujumchi maqsadiga yeta oladimi va biz uni payqaymizmi? | Har bir texnikani aniqlay olamizmi va qanday yaxshilaymiz? |
| Maqsad | Iloji boricha ko'p topilma | Bitta yoki bir nechta **biznes maqsad** ("to'lov tizimiga yetish") | Aniqlash qoidalarini birga sinash va tuzatish |
| SOC biladimi | Ha, odatda oldindan | Yo'q — faqat kichik nazorat guruhi biladi | Ha, birga ishlaydi |
| Muddat | 1–3 hafta | Haftalar yoki oylar | Bir necha kunlik sessiyalar |
| Shovqin | Ahamiyatsiz — skanerlar ham ishlatiladi | Iloji boricha kam, haqiqiy hujumchi kabi | Ataylab, bitta-bitta |
| Natija | Zaifliklar ro'yxati va tavsiyalar | Hujum hikoyasi, aniqlash va javob bo'shliqlari | Yangi va yaxshilangan aniqlash qoidalari |

[[red-team|Red team]] — yetuk tashkilotlar uchun. Agar asosiy zaifliklar hali yopilmagan, SOC yo'q yoki jurnallar yig'ilmagan bo'lsa, red team pul isrofi: natija oldindan ma'lum — "hech narsa payqanmadi". Avval pentest, zaifliklarni boshqarish va SOC (b-tarmoq), keyin red team.

## Hujumchini taqlid qilish

Red team "o'zicha" hujum qilmaydi. U ma'lum bir tahdidni taqlid qiladi — buni [[adversary-emulation|adversary emulation]] deyiladi:

```
 1. Tahdid razvedkasi (CTI, b4)      "Bizning sohamizga qaysi guruhlar hujum qiladi?"
          │                          masalan: moliya sektorini nishonga oluvchi guruh
          ▼
 2. Ularning TTP'lari (ATT&CK)       Initial Access: spear-phishing (T1566)
          │                          Execution: PowerShell (T1059.001)
          │                          Credential Access: ...
          ▼
 3. Emulyatsiya rejasi               qaysi texnikalar, qaysi tartibda,
          │                          qaysi maqsadga, qanday cheklovlar bilan
          ▼
 4. Bajarish (nazorat ostida)  ──►   5. Hisobot: har bir qadam — aniqlandimi?
                                        qachon? kim javob berdi?
```

Bu yondashuvning qiymati — natija **real tahdidga** bog'langan. "Red team domen administratoriga yetdi" o'z-o'zidan kam ma'lumot beradi; "moliya sektoriga hujum qiluvchi guruhlar ishlatadigan 14 texnikadan 9 tasi aniqlanmadi" — himoya rejasi uchun aniq kirish ma'lumoti.

[[mitre-attack|MITRE ATT&CK]] bu yerda umumiy til: red team rejasini texnika ID'lari bilan yozadi, SOC esa aynan shu ID'lar bo'yicha o'z aniqlash qoidalarini tekshiradi (b2 bosqichi). MITRE'ning ochiq **CTID Adversary Emulation Library** to'plamida ma'lum guruhlar uchun tayyor emulyatsiya rejalari bor.

Ba'zi mamlakatlarda moliya sektori uchun rasmiy freymvorklar mavjud — masalan, Yevropada **TIBER-EU**: tahdid razvedkasi provayderi, red team provayderi va regulyator alohida rollarda ishlaydi.

## Boshqaruv: oq hujayra va qoidalar

Red team haqiqiy hujumga o'xshaydi, lekin u qat'iy boshqariladigan loyiha. Pentestdagi [[roe|RoE]] bu yerda yanada batafsil:

| Element | Mazmuni |
|---|---|
| **Oq hujayra (white cell / control group)** | Tashkilot tomonidan red team haqida biladigan 2–4 kishi: odatda CISO va yuridik bo'lim. Ular to'qnashuvlarni hal qiladi |
| **Maqsadlar ("crown jewels")** | Nimaga yetish kerak: "to'lov serveri", "direktorning pochtasi", "mijozlar bazasiga yozish huquqi" |
| **Taqiqlangan harakatlar** | Ishlab chiqarishni to'xtatish, haqiqiy mijoz ma'lumotlarini olib chiqish, ma'lum tizimlarga tegish |
| **Deconfliction** | SOC haqiqiy insidentni ko'rsa — bu red team'mi yoki haqiqiy hujumchi? Oq hujayra tez aniqlaydi |
| **To'xtatish shartlari** | Haqiqiy hujumchi izlari topilsa, tizim nosozlansa — red team darhol to'xtaydi va xabar beradi |
| **Ma'lumotlar bilan ishlash** | Har qanday "o'g'irlangan" ma'lumot — soxta yoki maxsus belgilangan "bayroq" fayllar |

:::warn
**Red team — faqat shartnoma va to'liq huquqiy kelishuv bilan.** Fishing, fizik kirish va ijtimoiy muhandislik xodimlarning shaxsiy huquqlariga tegadi va ko'p mamlakatlarda alohida huquqiy talablar bor. Hech qanday "mashq" tashkilot rahbariyati va yuridik bo'limining yozma ruxsatisiz o'tkazilmaydi. O'quv bosqichida bu mavzularni faqat TryHackMe va o'z laboratoriyangizda o'rganing.
:::

## C2 nima

Hujumchi tizimga kirgandan keyin u bilan doimiy aloqa kerak: buyruq yuborish va natija olish. Buning uchun **Command and Control** ([[c2|C2]]) infratuzilmasi ishlatiladi. SOC tarmog'idan tanish: b-bosqichdagi WS-BUX-014 insidentida zararlangan kompyuter `update-check.example-cdn.net` ga muntazam murojaat qilgan edi — bu C2 aloqasi, uning muntazam "qo'ng'iroqlari" esa [[beaconing|beaconing]] edi.

Umumiy tuzilma (tushuncha darajasida):

```
  Operator ──► C2 server ──► Redirector ──── internet ────► Agent (implant)
  (red team)   (buyruqlar,    (oraliq server:               nishon kompyuterda;
               natijalar)     haqiqiy serverni              vaqti-vaqti bilan
                              yashiradi)                    "buyruq bormi?" deb so'raydi
```

| Tushuncha | Ma'nosi | SOC uchun belgisi |
|---|---|---|
| **Agent / implant** | Nishon tizimdagi dastur, C2 bilan aloqa qiladi | Notanish jarayon, g'ayrioddiy ota-jarayon (b2) |
| **Beaconing** | Agentning muntazam "qo'ng'irog'i" — masalan, har 60 soniyada | Bir xil oraliqdagi ulanishlar — b2 beaconing aniqlash |
| **Jitter** | Oraliqni tasodifiy o'zgartirish | Oraliq tahlilini qiyinlashtiradi, lekin hajm va manzil qoladi |
| **Kanal** | HTTP(S), DNS va boshqalar | Yosh domenlar, g'alati DNS so'rovlari, noodatiy User-Agent |
| **Redirector** | C2 serverini yashiruvchi oraliq | Manzil reputatsiyasi, CTI ma'lumotlari |

Ochiq kodli C2 freymvorklari mavjud (masalan, Sliver, Mythic, Havoc) va ular haqiqiy hujumchilar tomonidan ham ishlatiladi — shu sababli SOC ham ularni bilishi kerak. Ko'p xavfsizlik kompaniyalari bu freymvorklar uchun aniqlash qoidalari va Sigma/YARA qoidalarini ommaga e'lon qiladi.

:::tip
**C2 bilan qonuniy tanishish.** Roadmap'dagi TryHackMe "Red Team Fundamentals" va C2 bo'yicha xonalari tayyor, izolyatsiyalangan muhitda ishlaydi. Agar o'z laboratoriyangizda sinab ko'rsangiz — internetdan to'liq ajratilgan host-only tarmoqda, faqat o'z virtual mashinalaringiz bilan. Eng foydali mashq — **ikki tomonlama**: agentni o'z laboratoriyangizda ishga tushirib, keyin uni b4 uy SOC laboratoriyangizda (Sysmon, Wazuh, Zeek) qanday ko'rinishini kuzatish. Aynan shu "ikki tomonlama" tajriba purple team va SOC intervyularida eng kuchli dalil.
:::

## OPSEC: himoyachi nima kuzatadi

[[opsec|OPSEC]] — o'z harakatlaringiz haqidagi ma'lumotni raqibdan yashirish intizomi. Red team uchun bu: harakatlarni himoyachilar sezmaydigan darajada ehtiyotkorlik bilan bajarish. Himoyachi uchun esa OPSEC xatolari — eng yaxshi aniqlash imkoniyatlari.

Shuning uchun bu mavzuni himoyachi ko'zi bilan o'rganish foydali: red team qayerda "shovqin" qilishga majbur?

| Hujum bosqichi | Hujumchi muqarrar qoldiradigan iz | Himoya manbasi |
|---|---|---|
| Dastlabki kirish | Fishing xati, havola bosilishi | Pochta shlyuzi, proxy jurnallari |
| Bajarish | Yangi jarayon, g'ayrioddiy ota-jarayon | EDR, Sysmon Event ID 1 |
| Aloqa | Tashqi manzilga muntazam ulanish | Proxy, DNS, NetFlow |
| Ma'lumot to'plash | Ko'p LDAP so'rovlari, ulashilgan papkalarni ko'zdan kechirish | DC jurnallari, fayl serveri auditi |
| Ko'chish | Yangi tizimga tarmoq orqali kirish | Event ID 4624 (logon type 3, 10), 7045 |
| Maqsad | Ma'lumotlarni ko'p hajmda o'qish yoki olib chiqish | DLP, chiquvchi trafik hajmi |

b2 bosqichidagi "pyramid of pain" g'oyasini eslang: IP manzil va xeshni almashtirish oson, lekin **xatti-harakat** — TTP — o'zgartirish qiyin. Red team hisobotining eng qimmatli qismi aynan shu: qaysi xatti-harakatlar payqalmadi.

## Natija va hisobot

Red team hisoboti pentest hisobotidan farq qiladi (p4 hisobot darsini solishtiring):

```
 Hujum hikoyasi (vaqt chizig'i)
 ─────────────────────────────────────────────────────────────────────
 kun 1  09:14  Fishing xati 40 xodimga        → 6 kishi havolani bosdi
                                                SOC: aniqlanmadi
 kun 1  09:31  Birinchi agent ishga tushdi    → EDR: ogohlantirish (o'rta)
                                                SOC: 3 soatdan keyin yopildi,
                                                "false positive" deb
 kun 3  14:02  Domen ma'lumotlari to'plandi   → aniqlanmadi
 ...
 kun 12 11:47  Maqsad: to'lov serveriga       → aniqlanmadi
               o'qish huquqi (bayroq fayl)
 ─────────────────────────────────────────────────────────────────────
 Aniqlash bo'shliqlari: 1) ... 2) ... 3) ...
 Ijobiy: EDR 2 ta texnikani to'g'ri aniqladi; ...
```

| Ko'rsatkich | Ma'nosi |
|---|---|
| **Time to Detect** | Hujum boshlanishidan birinchi aniqlashgacha |
| **Time to Respond** | Aniqlashdan javob harakatigacha |
| Aniqlangan / aniqlanmagan texnikalar | ATT&CK bo'yicha qamrov xaritasi |
| Jarayon xatolari | Ogohlantirish bor edi, lekin noto'g'ri yopildi (yuqoridagi "false positive") |

Ko'pincha eng muhim topilma texnik emas, **jarayon** xatosi bo'ladi: ogohlantirish ishladi, lekin analitik uni tekshirmasdan yopdi. Bu SOC triaj darsidagi (b1) muammoning haqiqiy hayotdagi ko'rinishi.

Yakunda ko'pincha **purple team sessiyasi** o'tkaziladi: red team har bir qadamni SOC bilan birga takrorlaydi, SOC yangi aniqlash qoidalarini yozadi va darhol sinab ko'radi (b4).

## Kasb yo'li

Red team — boshlang'ich lavozim emas. Odatda yo'l: pentester (yoki SOC analitigi) → katta pentester → red team operatori. Kerakli asos: Windows va Active Directory'ni chuqur bilish, tarmoq, dasturlash (skriptlash), va eng muhimi — himoya vositalari qanday ishlashini tushunish (keyingi dars). Sertifikatlardan **CRTO** (Certified Red Team Operator) kabi red team yo'naltirilganlari bor, lekin ular odatda OSCP darajasidan keyin.

## Amaliyot

:::try
**1. Pentest yoki red team?** Quyidagi so'rovlar uchun qaysi xizmat to'g'ri: (a) "Yangi mobil ilovamizni chiqarishdan oldin tekshiring"; (b) "SOC'imiz haqiqiy hujumni payqaydimi, bilmoqchimiz"; (c) "Yangi Sigma qoidalarimiz ishlayaptimi, birga tekshiraylik"; (d) "Hali SOC yo'q, birinchi marta xavfsizlik tekshiruvi kerak".

*Javob:* (a) pentest; (b) red team; (c) purple team; (d) pentest — red team uchun hali erta.

**2. Emulyatsiya rejasi chizmasi.** MITRE ATT&CK saytida istalgan ma'lum guruh sahifasini oching (Groups bo'limi). Ular ishlatgan 5 ta texnikani tanlang va har biri uchun yozing: taktika, texnika ID'si va SOC buni qaysi jurnal manbasida ko'rishi mumkin (yuqoridagi OPSEC jadvalidan foydalaning). Hech qanday texnikani bajarmang — bu reja faqat himoya qamrovini baholash uchun.

*Tekshirish:* har bir qatorda taktika, ID va jurnal manbasi bor.

**3. Beaconing'ni tanib oling.** Quyidagi proxy jurnalidan qaysi qator C2'ga o'xshaydi va nega?

```
 10.10.20.31 → cdn.example.org        har xil oraliqlar, 12 ta so'rov, ish vaqtida
 10.10.20.47 → api.example-sync.net   har 300±15 soniyada, 288 ta so'rov, 24 soat
 10.10.20.52 → mail.example.com       ish vaqtida, foydalanuvchi faolligi bilan
```

*Javob:* ikkinchisi — kechayu kunduz deyarli bir xil oraliq (jitter bilan), foydalanuvchi faolligiga bog'liq emas; b2 beaconing belgilari. Keyingi qadam: domen yoshi va reputatsiyasi, jarayon nomi (EDR'da).

**4. TryHackMe.** Roadmap'dagi "Red Team Fundamentals" xonasini tugating va undagi tushunchalarni ushbu darsdagi jadvallar bilan solishtiring.
:::

## Xulosa

- Pentest: "qanday zaifliklar bor?"; red team: "haqiqiy hujumchi maqsadiga yeta oladimi va biz payqaymizmi?"; purple team: "birga sinab, aniqlashni yaxshilaymiz".
- Red team — yetuk tashkilotlar uchun; avval pentest, zaifliklarni boshqarish va SOC.
- Adversary emulation: CTI → ATT&CK bo'yicha TTP'lar → reja → nazorat ostida bajarish → har bir qadamni aniqlash bo'yicha baholash.
- Boshqaruv: oq hujayra, maqsadlar, taqiqlar, deconfliction, to'xtatish shartlari, soxta "bayroq" ma'lumotlar.
- C2: operator → server → redirector → agent; SOC uni beaconing, yangi jarayonlar va noodatiy domenlar orqali ko'radi.
- OPSEC xatolari — himoyachi uchun aniqlash imkoniyati; TTP'ni yashirish eng qiyin.
- Hisobot: hujum hikoyasi, Time to Detect/Respond, aniqlash bo'shliqlari, jarayon xatolari; yakunda purple team.

:::quiz
? Red team asosan qaysi savolga javob beradi?
- Ilovada qancha zaiflik bor?
+ Haqiqiy hujumchi maqsadiga yeta oladimi va tashkilot buni payqaydimi?
- Serverlar yangilanganmi?
! Red team butun himoyani — odamlar, jarayonlar, texnologiyani — real hujum ssenariysida sinaydi.

? Red team qachon pul isrofi bo'ladi?
+ Asosiy zaifliklar yopilmagan va SOC yo'q bo'lsa
- SOC yaxshi ishlasa
- Tashkilot oldin pentest qildirgan bo'lsa
! Natija oldindan ma'lum bo'ladi; avval asoslar kerak.

? Red team loyihasi haqida tashkilotda kim biladi?
- Butun SOC jamoasi
+ Kichik oq hujayra (masalan, CISO va yuridik bo'lim)
- Hech kim, hatto rahbariyat ham
! Oq hujayra boshqaruv va deconfliction uchun kerak; SOC bilmaydi, aks holda sinov real bo'lmaydi.

? Deconfliction nima?
- Red team va SOC o'rtasidagi bahsni sudda hal qilish
+ SOC ko'rgan faollik red team'mi yoki haqiqiy hujummi — tezda aniqlash
- C2 serverini yashirish usuli
! Haqiqiy hujumchi red team bilan bir vaqtda bo'lishi mumkin; oq hujayra buni tez ajratadi.

? Adversary emulation'ning qiymati?
- Hujum tasodifiy va kutilmagan bo'ladi
+ Natija tashkilotga real tahdid soluvchi guruhlarning TTP'lariga bog'langan
- Faqat avtomatik skanerlardan foydalaniladi
! CTI va ATT&CK asosidagi reja himoya qamrovini aniq ko'rsatadi.

? C2 aloqasini SOC qanday belgilar orqali ko'rishi mumkin?
+ Muntazam oraliqdagi tashqi ulanishlar, yosh domenlar, notanish jarayonlar
- Faqat antivirus ogohlantirishi orqali
- C2 aloqasini aniqlab bo'lmaydi
! Beaconing, domen reputatsiyasi va jarayon tahlili — b2 dan tanish aniqlash usullari.

? Jitter nima?
- C2 serverining nomi
+ Beaconing oralig'ini tasodifiy o'zgartirish
- Shifrlash algoritmi
! Jitter oraliq tahlilini qiyinlashtiradi, lekin manzil va hajm belgilari qoladi.

? Red team topilmalari orasida ko'pincha eng muhimi nima bo'ladi?
- Eng yuqori CVSS balli zaiflik
+ Jarayon xatosi: ogohlantirish ishlagan, lekin noto'g'ri yopilgan
- Skanerlar topgan versiyalar
! Texnologiya ishlasa ham, jarayon va odamlar bo'shlig'i hujumni o'tkazib yuborishi mumkin.

? Red team "o'g'irlagan" ma'lumot qanday bo'ladi?
- Haqiqiy mijozlar bazasining nusxasi
+ Oldindan kelishilgan soxta yoki belgilangan "bayroq" fayllar
- Tasodifiy tanlangan fayllar
! Haqiqiy ma'lumotlarni olib chiqish taqiqlangan; maqsadga yetish bayroq bilan isbotlanadi.

? Red team loyihasidan keyin odatda nima qilinadi?
- Hech narsa, hisobot arxivlanadi
+ Purple team sessiyasi: qadamlar SOC bilan birga takrorlanib, aniqlash qoidalari yaxshilanadi
- Yangi red team darhol boshlanadi
! Purple team red team natijasini aniq aniqlash qoidalariga aylantiradi.
:::

:::cards
Pentest, red team, purple team? :: Pentest — zaifliklar; red team — real hujum ssenariysi va aniqlash; purple team — birga sinab, aniqlashni yaxshilash.
Red team qachon kerak? :: Tashkilot yetuk bo'lganda: zaifliklar boshqariladi, SOC ishlaydi, jurnallar yig'iladi.
Adversary emulation? :: Ma'lum guruhning ATT&CK TTP'larini nazorat ostida takrorlab, himoyani sinash.
Oq hujayra? :: Red team haqida biladigan kichik guruh (CISO, yuridik); boshqaruv va deconfliction.
Deconfliction? :: SOC ko'rgan faollik red team'mi yoki haqiqiy hujumchimi — tez aniqlash.
C2 tuzilmasi? :: Operator, C2 server, redirector, nishon tizimdagi agent.
Beaconing va jitter? :: Agentning muntazam murojaati; jitter — oraliqni tasodifiy o'zgartirish.
SOC C2'ni qanday ko'radi? :: Muntazam ulanishlar, yosh domenlar, noodatiy jarayonlar va ota-jarayonlar.
OPSEC himoyachi uchun? :: Hujumchining OPSEC xatolari — aniqlash imkoniyatlari; TTP'ni yashirish eng qiyin.
Red team hisoboti? :: Hujum hikoyasi, Time to Detect/Respond, aniqlangan va aniqlanmagan texnikalar, jarayon xatolari.
Red team'ga yo'l? :: Pentester yoki SOC analitigi, keyin katta pentester, keyin red team operatori.
:::
