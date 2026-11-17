Bir kuni ijtimoiy tarmoqda o'qiysiz: "19 yoshli tadqiqotchi bitta zaiflik uchun 20 000 dollar oldi." Ertasi kuni HackerOne'da akkaunt ochib, eng mashhur dasturni tanlaysiz, avtomatik skanerni ishga tushirasiz va uchta "topilma" yuborasiz. Bir haftadan keyin javoblar keladi: "Duplicate", "Out of scope", "Informative". Reputatsiya balingiz minusga tushadi.

Bu ko'p yangi boshlovchilarning tajribasi. [[bug-bounty|Bug bounty]] — haqiqiy, qonuniy va ba'zan juda daromadli yo'l, lekin u lotereya emas. U qoidalarni diqqat bilan o'qishni, bitta nishonni chuqur o'rganishni va p4 hisobot darsidagi yozish ko'nikmasini talab qiladi. Bu dars tizimni ichkaridan ko'rsatadi: dasturlar qanday ishlaydi, qoidalar nimani taqiqlaydi, hisobot qanday triaj qilinadi va birinchi natijaga qanday real yo'l bilan borish mumkin.

## Bug bounty nima va nima emas

Tashkilot ommaga e'lon qiladi: "Bizning tizimlarimizda zaiflik topsangiz va qoidalarimizga rioya qilsangiz, xabar bering — biz sizni sudga bermaymiz va jiddiylikka qarab mukofot to'laymiz."

| | Pentest | Bug bounty |
|---|---|---|
| Shartnoma | Mijoz bilan individual shartnoma, RoE | Ommaviy dastur qoidalari — hamma uchun bir xil |
| To'lov | Ish vaqti uchun, natijadan qat'i nazar | Faqat **birinchi** topilgan, qabul qilingan zaiflik uchun |
| Qamrov | Kelishilgan, odatda tor | Dastur belgilaydi, ba'zan juda keng |
| Vaqt | Belgilangan muddat (masalan, 2 hafta) | Cheklanmagan, o'zingiz tanlaysiz |
| Natija | To'liq hisobot, barcha topilmalar | Har bir zaiflik uchun alohida qisqa hisobot |
| Raqobat | Yo'q | Minglab tadqiqotchilar bir xil nishonda |

Muhim xulosa: bug bounty'da **ikkinchi bo'lish — hech narsa** degani. Shu sababli mashhur nishonlardagi oddiy zaifliklarni allaqachon kimdir topgan bo'ladi.

## Dastur turlari

| Tur | Nima | Kimlar uchun |
|---|---|---|
| **VDP** (Vulnerability Disclosure Program) | Xabar qabul qilinadi, odatda pulsiz (ba'zan minnatdorchilik, "hall of fame") | Boshlang'ich: raqobat kamroq, tajriba va reputatsiya |
| **Ommaviy BBP** (Bug Bounty Program) | Pul mukofoti, hamma qatnasha oladi | Tajriba bilan |
| **Xususiy dastur** | Faqat taklif qilinganlar uchun; raqobat kam | Platformada reputatsiya to'plaganlarga taklif keladi |

Asosiy platformalar: **HackerOne**, **Bugcrowd**, **Intigriti**, **YesWeHack**. Ko'p kompaniyalar o'z saytida ham `security.txt` fayli (`/.well-known/security.txt`) orqali xabar berish manzilini e'lon qiladi — bu [[responsible-disclosure|mas'uliyatli oshkor qilish]] uchun standart usul.

## Dastur qoidalarini o'qish

Bug bounty'da RoE — dastur sahifasi (policy). Uni har safar to'liq o'qing; ko'p qoidabuzarliklar e'tiborsizlikdan kelib chiqadi.

```
 Qaydnoma Bug Bounty Program (o'quv namunasi)
 ─────────────────────────────────────────────────────────────
 Qamrovda (in scope):
   api.qaydnoma.example.com         — mukofot: to'liq
   qaydnoma.example.com             — mukofot: to'liq
   *.staging.qaydnoma.example.com   — mukofot: yarmi
 Qamrovda emas (out of scope):
   blog.qaydnoma.example.com        — uchinchi tomon xizmati
   status.qaydnoma.example.com
 Taqiqlangan:
   - DoS va yuklama testlari, avtomatik skanerlar sekundiga 5 so'rovdan ko'p
   - ijtimoiy muhandislik, fizik kirish
   - boshqa foydalanuvchilar ma'lumotlarini ko'rish yoki o'zgartirish:
     faqat o'z test akkauntlaringiz
   - topilgan zaiflikdan isbotdan ortiq foydalanish
 Mukofot berilmaydigan topilmalar:
   - xavfsizlik sarlavhalari yo'qligi, versiya ko'rinishi
   - self-XSS, logout CSRF, SPF/DMARC sozlamalari
   - skaner natijasi isbotsiz
 Talablar:
   - so'rovlarga "X-Bug-Bounty: <username>" sarlavhasini qo'shing
   - dastur ruxsatisiz oshkor qilmang
 Safe harbor: qoidalarga rioya qilgan tadqiqot ruxsat etilgan hisoblanadi.
```

| Qoida | Nega muhim |
|---|---|
| Qamrov ro'yxati | Qamrovdan tashqaridagi domen — boshqa kompaniyaniki bo'lishi mumkin; uni tekshirish ruxsatsiz faoliyat |
| Tezlik cheklovi | Ishlab chiqarish tizimi; agressiv skaner xizmatni buzishi va sizni bloklashi mumkin |
| Boshqa foydalanuvchilar ma'lumotlari | Haqiqiy mijozlar; IDOR'ni ikkita **o'z** akkauntingiz bilan isbotlang |
| Mukofotsiz ro'yxat | Bu topilmalar yuborilsa — "Informative" yoki "N/A", reputatsiya pasayadi |
| Oshkor qilish | Ruxsatsiz e'lon — dasturdan chetlatish va safe harbor'ni yo'qotish |

:::warn
**[[safe-harbor|Safe harbor]] faqat qoidalarga rioya qilganda ishlaydi.** Qamrovdan chiqish, taqiqlangan usuldan foydalanish, boshqa foydalanuvchilarning ma'lumotlarini yuklab olish yoki "mukofot bermasangiz e'lon qilaman" degan talab — bularning har biri sizni tadqiqotchidan huquqbuzarga aylantiradi. Shubha bo'lsa, harakat qilishdan oldin dastur jamoasiga savol bering — ko'p platformalarda buning uchun alohida kanal bor.
:::

## Hisobot hayoti: triaj

Yuborilgan hisobot bir necha bosqichdan o'tadi:

```
 Yuborildi ──► Triaj ──► Kompaniya ko'rib chiqadi ──► Tuzatildi ──► Yopildi
   (siz)     (platforma     (jiddiylik, mukofot)                 (ixtiyoriy:
             jamoasi:                                             oshkor qilish
             takrorlanadimi?)                                     kelishuv bilan)
```

Hisobot qanday holatlarda yopiladi:

| Holat | Ma'nosi | Odatiy sabab |
|---|---|---|
| **Resolved** | Qabul qilindi va tuzatildi | Yaxshi isbot, qamrovda |
| **Duplicate** | Kimdir avvalroq yuborgan | Mashhur nishon, oddiy zaiflik |
| **Informative** | Zaiflik emas yoki xavfi juda kam | Mukofotsiz ro'yxatdagi topilma |
| **N/A** (Not Applicable) | Noto'g'ri yoki qamrovdan tashqari | Qoidalarni o'qimaslik |
| **Spam** | Mazmunsiz, avtomatik | Skaner natijasini ko'chirish |

Platformalar **signal** yoki reputatsiya ballini yuritadi: N/A va spam ballni pasaytiradi, qabul qilingan hisobotlar ko'taradi. Past reputatsiya bilan xususiy dasturlarga taklif kelmaydi.

## Yaxshi bug bounty hisoboti

p4 hisobot darsidagi topilma qolipi — qisqartirilgan holda:

```
 Sarlavha: api.qaydnoma.example.com — boshqa foydalanuvchining qaydini
           GET /api/v1/notes/{id} orqali o'qish mumkin (IDOR)

 Qisqacha: endpoint qayd egasini tekshirmaydi; ro'yxatdan o'tgan
           istalgan foydalanuvchi boshqa qaydlarni o'qiy oladi.

 Takrorlash (o'z ikki akkauntim: rsrch_a, rsrch_b):
   1. rsrch_b sifatida qayd yarating — id 88213.
   2. rsrch_a tokeni bilan GET /api/v1/notes/88213 yuboring.
   3. Javob: 200 OK, rsrch_b qaydi matni. Kutilgan: 404.

 Ta'sir: barcha foydalanuvchilarning shaxsiy qaydlari maxfiyligi.
 Taklif etilgan jiddiylik: CVSS 3.1 — 6.5 (vektor ...)
 Isbot: so'rov/javob (token yashirilgan), qisqa video.
 Eslatma: faqat o'z akkauntlarim ishlatildi; boshqa id'lar so'ralmadi.
```

Triaj jamoasi kuniga yuzlab hisobot o'qiydi. Ular **besh daqiqada** takrorlay oladigan hisobot tez qabul qilinadi. Ta'sirni bo'rttirmang: "butun kompaniya buziladi" degan, lekin isboti zaif hisobot ishonchni yo'qotadi.

:::key
**Bug bounty hisobotining oltin qoidasi:** aniq sarlavha (qayerda + nima), qisqa va to'liq takrorlash qadamlari, kutilgan va haqiqiy natija, real ta'sir (bo'rttirmasdan), minimal isbot va faqat o'z akkauntlaringiz. Bir hisobot — bitta zaiflik.
:::

## Qanday boshlash kerak

Realistik yo'l, kursning tartibida:

| Qadam | Nima | Natija |
|---|---|---|
| 1 | p2 web asoslari, PortSwigger Academy (Apprentice va Practitioner) | Zaifliklarni lablarda topa olasiz |
| 2 | **Hacker101** (HackerOne'ning bepul kursi va CTF'i) | Platforma ishlash tartibi, ba'zan xususiy taklif |
| 3 | 1–2 ta **VDP** yoki kam raqobatli dastur | Birinchi qabul qilingan hisobot |
| 4 | **Bitta** dasturni chuqur: ilovani oddiy foydalanuvchi sifatida haftalab o'rganish | Boshqalar ko'rmagan funksiyalar |
| 5 | Ommaviy hisobotlarni (disclosed reports) o'qish | Qanday zaifliklar qabul qilinadi, qanday yoziladi |

Tajribali tadqiqotchilarning umumiy maslahati: **kenglik emas, chuqurlik**. Yuzlab dasturni yuzaki skanerlagandan ko'ra, bitta murakkab ilovaning biznes mantig'ini (a2 biznes mantiq darsi) to'liq tushunish ko'proq natija beradi — chunki skanerlar aynan mantiq xatolarini topa olmaydi va minglab boshqa ishtirokchilar ham xuddi shu skanerlarni ishlatadi.

**Topilmalarning eng ko'p qabul qilinadigan turlari** odatda access control va IDOR, biznes mantiq xatolari, autentifikatsiya oqimidagi kamchiliklar va ma'lumot sizib chiqishi bo'ladi — a2 bosqichida himoyachi tomondan o'rgangan narsalaringiz. Ularni qanday isbotlashni PortSwigger lablarida mashq qiling.

:::info
**Daromad haqida halol.** Ko'p tadqiqotchilar birinchi oylarda hech qanday pul olmaydi; platformalar statistikasi ham mukofotlarning katta qismini kichik guruh tajribali tadqiqotchilar olishini ko'rsatadi. Bug bounty'ni boshida **o'qish va portfolio** yo'li deb qarang: qabul qilingan hisobotlar va platformadagi reputatsiya rezyumeda pentest ishiga kirishda kuchli dalil bo'ladi. Barqaror daromad uchun uni asosiy ish o'rniga emas, unga qo'shimcha sifatida rejalashtiring.
:::

## Oshkor qilish va axloq

- **Dastur ruxsatisiz hech narsani e'lon qilmang** — hatto tuzatilgandan keyin ham. Ko'p platformalarda "disclosure request" tugmasi bor: kompaniya rozi bo'lsa, hisobot ommaviy bo'ladi.
- **Dasturi yo'q tashkilotda zaiflik ko'rsangiz** — uni tekshirishda davom etmang. `security.txt` yoki rasmiy aloqa orqali qisqa xabar bering; ba'zi mamlakatlarda milliy CERT orqali xabar berish mumkin. Ruxsatsiz chuqur tekshiruv — mas'uliyatli oshkor qilish emas.
- **Pul talab qilmang.** "Mukofot bersangiz, tafsilotlarni aytaman" — bu tovlamachilik deb qaralishi mumkin.
- **Topilgan ma'lumotlarni saqlamang.** Isbot uchun ko'rgan har qanday shaxsiy ma'lumotni hisobotdan keyin o'chiring va buni hisobotda aytib o'ting.

## Amaliyot

:::try
**1. Dastur qoidalarini tahlil qiling.** HackerOne yoki Bugcrowd'dagi istalgan ommaviy dastur sahifasini oching (hech narsani tekshirmasdan, faqat o'qing). Yozing: qamrovdagi uchta aktiv, qamrovdan tashqaridagi ikkita, uchta taqiqlangan harakat va mukofot berilmaydigan uchta topilma turi. Safe harbor bandi bormi?

*Tekshirish:* barcha bo'limlar to'ldirilgan; tezlik cheklovi yoki maxsus sarlavha talabi bo'lsa — ular ham yozilgan.

**2. Ommaviy hisobotlarni o'qing.** HackerOne Hacktivity bo'limida access control yoki IDOR bo'yicha oshkor qilingan uchta hisobotni o'qing. Har biri uchun: sarlavha qanday tuzilgan, takrorlash necha qadam, ta'sir qanday asoslangan?

*Javob yo'nalishi:* yaxshi hisobotlarda sarlavha joy va ta'sirni aytadi, qadamlar qisqa, isbot o'z akkauntlari bilan.

**3. Hacker101 bilan boshlang.** hacker101.com'da ro'yxatdan o'ting, birinchi videoni ko'ring va Hacker101 CTF'ining eng oson topshirig'ini yeching (bu platformaning o'z o'quv nishoni — qonuniy).

**4. Yuqoridagi namunani tahlil qiling.** "Qaydnoma BBP" qoidalari bo'yicha quyidagilar qabul qilinadimi? (a) `blog.qaydnoma.example.com` dagi XSS; (b) `api` da HSTS yo'qligi; (c) ikki o'z akkauntingiz bilan isbotlangan IDOR; (d) sekundiga 50 so'rov bilan login sinovi.

*Javob:* (a) yo'q — qamrovdan tashqari; (b) yo'q — mukofotsiz ro'yxatda; (c) ha; (d) yo'q — tezlik cheklovini buzadi va taqiqlangan.
:::

## Xulosa

- Bug bounty — ommaviy qoidalar asosida qonuniy tadqiqot; mukofot faqat birinchi, qabul qilingan topilma uchun.
- Dastur turlari: VDP (odatda pulsiz, boshlash uchun yaxshi), ommaviy BBP, xususiy dasturlar.
- Dastur sahifasi — sizning RoE'ingiz: qamrov, taqiqlar, tezlik, mukofotsiz topilmalar, oshkor qilish tartibi.
- Safe harbor faqat qoidalarga rioya qilganda amal qiladi.
- Triaj natijalari: Resolved, Duplicate, Informative, N/A, Spam — reputatsiyaga ta'sir qiladi.
- Yaxshi hisobot: aniq sarlavha, qisqa takrorlash, real ta'sir, minimal isbot, faqat o'z akkauntlaringiz.
- Yo'l: PortSwigger → Hacker101 → VDP → bitta dasturni chuqur o'rganish; kenglik emas, chuqurlik.
- Ruxsatsiz oshkor qilmang, pul talab qilmang, ko'rgan ma'lumotni saqlamang.

:::quiz
? Bug bounty va pentestning asosiy farqi?
- Bug bounty'da qamrov bo'lmaydi
+ Bug bounty'da to'lov faqat birinchi topilgan va qabul qilingan zaiflik uchun
- Pentest qonuniy emas, bug bounty qonuniy
! Pentestda ish vaqti uchun to'lanadi; bug bounty'da natija va birinchilik muhim.

? VDP nima?
+ Zaiflik xabarlarini qabul qilish dasturi, odatda pul mukofotisiz
- Faqat taklif qilinganlar uchun pulli dastur
- Avtomatik skanerlash xizmati
! VDP — xabar berish kanali; boshlovchilar uchun raqobat kamroq.

? Qamrov ro'yxatida bo'lmagan subdomenda zaiflik ko'rsangiz nima qilasiz?
- Mukofot ko'proq bo'lishi uchun chuqurroq tekshirasiz
+ Tekshirmaysiz; kerak bo'lsa dastur jamoasidan qamrov haqida so'raysiz
- Darhol ijtimoiy tarmoqda e'lon qilasiz
! Qamrovdan tashqari aktiv boshqa tashkilotniki bo'lishi mumkin; uni tekshirish ruxsatsiz.

? IDOR'ni bug bounty'da qanday isbotlash kerak?
- Ko'proq haqiqiy foydalanuvchilarning ma'lumotlarini yuklab olib
+ O'zingizning ikkita test akkauntingiz bilan
- Hech qanday isbotsiz, faqat tavsif bilan
! Boshqa foydalanuvchilarning ma'lumotlari taqiqlangan; ikkita o'z akkaunt yetarli isbot.

? Safe harbor qachon amal qiladi?
- Har doim, ro'yxatdan o'tgan bo'lsangiz
+ Faqat dastur qoidalariga rioya qilganingizda
- Faqat pulli dasturlarda
! Qoidalarni buzgan tadqiqotchi himoyani yo'qotadi.

? "Duplicate" holati nimani anglatadi?
- Hisobot ikki marta yuborilgan
+ Zaiflikni boshqa tadqiqotchi avvalroq yuborgan
- Zaiflik qamrovdan tashqarida
! Bug bounty'da ikkinchi bo'lish odatda mukofotsiz.

? Qaysi topilma odatda mukofotsiz ro'yxatda bo'ladi?
- Ikki akkaunt bilan isbotlangan IDOR
+ Xavfsizlik sarlavhasi yo'qligi
- Admin funksiyalariga oddiy foydalanuvchi kirishi
! Sarlavhalar yo'qligi va versiya ko'rinishi ko'p dasturlarda "informative" hisoblanadi.

? Boshlovchi uchun eng samarali strategiya?
- Yuzlab dasturni avtomatik skaner bilan yuzaki tekshirish
+ Bitta dasturni tanlab, ilova va uning biznes mantig'ini chuqur o'rganish
- Faqat eng mashhur va eng pulli dasturlarni tanlash
! Kenglik emas, chuqurlik: mantiq xatolarini skanerlar topmaydi.

? Tuzatilgan zaiflik haqida blog yozish mumkinmi?
- Ha, tuzatilgandan keyin har doim
+ Faqat dastur yoki kompaniya ruxsati bilan
- Faqat mukofot berilmagan bo'lsa
! Oshkor qilish dastur qoidalariga bog'liq; ruxsatsiz e'lon — qoidabuzarlik.

? Qaysi harakat tovlamachilik deb qaralishi mumkin?
- Dastur jamoasiga qamrov haqida savol berish
+ "Mukofot bersangiz, tafsilotlarni aytaman" deyish
- Hisobotni qisqa video bilan to'ldirish
! Pul talab qilish mas'uliyatli oshkor qilishga zid va huquqiy muammoga olib kelishi mumkin.
:::

:::cards
Bug bounty nima? :: Tashkilotning ommaviy dasturi: qoidaga rioya qilib zaiflik topgan tadqiqotchiga mukofot va huquqiy himoya.
Pentest va bug bounty to'lovi? :: Pentest — ish vaqti uchun; bug bounty — faqat birinchi qabul qilingan topilma uchun.
VDP va BBP farqi? :: VDP — xabar qabul qilish, odatda pulsiz; BBP — pul mukofotli dastur.
Asosiy platformalar? :: HackerOne, Bugcrowd, Intigriti, YesWeHack; kompaniya saytida security.txt.
Dastur sahifasida nimani o'qiysiz? :: Qamrov va undan tashqari aktivlar, taqiqlar, tezlik cheklovi, mukofotsiz topilmalar, oshkor qilish tartibi.
Safe harbor? :: Qoidaga rioya qilgan tadqiqotchiga qarshi huquqiy choralar ko'rilmasligi va'dasi.
Triaj natijalari? :: Resolved, Duplicate, Informative, N/A, Spam.
Yaxshi hisobot? :: Aniq sarlavha, qisqa takrorlash, kutilgan va haqiqiy natija, real ta'sir, minimal isbot.
Boshlash yo'li? :: PortSwigger, Hacker101, VDP, keyin bitta dasturni chuqur o'rganish.
Kenglik yoki chuqurlik? :: Chuqurlik — bitta ilovaning biznes mantig'ini to'liq tushunish.
Dasturi yo'q tashkilotda zaiflik? :: Tekshirishni to'xtatib, security.txt yoki rasmiy aloqa orqali qisqa xabar berish.
:::
