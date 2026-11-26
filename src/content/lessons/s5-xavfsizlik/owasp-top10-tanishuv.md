Zamonaviy tashkilotning eng katta hujum yuzasi — uning veb-ilovalari: sayt, mijozlar kabineti, mobil ilova ortidagi API. Ular internetga ochiq bo'lishi **shart** — firewall ularni yashira olmaydi. Shuning uchun zaifliklarning katta qismi aynan shu yerda topiladi va xavfsizlikdagi ish o'rinlarining katta qismi ham shu bilan bog'liq.

Yaxshi xabar: veb-zaifliklar cheksiz emas. Ular bir necha takrorlanuvchi toifaga bo'linadi — va siz ularning ko'pini oldingi bosqichlarda allaqachon uchratgansiz. Bu dars ularni bitta xaritaga yig'adi.

## OWASP va Top 10

[[owasp|OWASP]] (Open Worldwide Application Security Project) — ilovalar xavfsizligi bo'yicha ochiq, notijorat hamjamiyat. Uning eng mashhur ishi — **OWASP Top 10**: veb-ilovalardagi eng jiddiy o'nta xavf toifasi ro'yxati.

Ro'yxat bir necha yilda bir yangilanadi. Amaldagisi — **2025-yilgi nashr** (undan oldingisi 2021-yilda chiqqan). U qanday tuzilgan:

- **Ma'lumotlar:** bir nechta xavfsizlik kompaniyasi bergan tekshiruv natijalari — 2,8 milliondan ortiq ilova. O'lchov — zaiflik turi kamida bir marta uchragan ilovalar ulushi.
- **Hamjamiyat so'rovnomasi:** test natijalarida yaxshi ko'rinmaydigan xavflar uchun. O'nta toifadan sakkiztasi ma'lumotlar asosida, ikkitasi so'rovnoma asosida tanlangan.
- **CWE:** har bir toifa — aniq zaiflik turlari ([[cwe|CWE]] raqamlari) guruhi. 2025-yilgi nashrda o'nta toifaga 248 ta CWE kiritilgan.

Ro'yxat:

- dasturchilar uchun — "nimadan ehtiyot bo'lish kerak" ro'yxati;
- tekshiruvchilar uchun — minimal tekshiruv dasturi;
- butun soha uchun — umumiy til. Intervyuda "OWASP Top 10 ni bilasizmi?" — deyarli majburiy savol.

:::info
Top 10 — **xabardorlik hujjati**, to'liq standart emas. Unda yo'q zaiflik ham jiddiy bo'lishi mumkin. To'liq tekshiruv ro'yxatlari uchun OWASP'ning boshqa hujjatlari bor: **ASVS** (talablar standarti) va **WSTG** (sinov qo'llanmasi). Ular bilan AppSec va Pentest yo'nalishlarida ishlaysiz.
:::

## O'n toifa (2025)

Raqamlar va tartib nashrdan nashrga o'zgaradi — yodlash kerak bo'lgani **toifalarning o'zi va ularning ildizi**.

| № | Toifa | Bir jumlada |
|---|---|---|
| A01 | **Broken Access Control** | Foydalanuvchi o'ziga ruxsat etilmagan narsani qila oladi (SSRF ham shu yerda) |
| A02 | **Security Misconfiguration** | Xavfsiz dastur noto'g'ri sozlangan |
| A03 | **Software Supply Chain Failures** | Begona kod, yig'ish yoki tarqatish zanjiri buzilgan |
| A04 | **Cryptographic Failures** | Sezgir ma'lumot yomon himoyalangan yoki umuman himoyalanmagan |
| A05 | **Injection** | Kiritilgan ma'lumot buyruq sifatida bajariladi |
| A06 | **Insecure Design** | Xato kodda emas — loyihaning o'zida |
| A07 | **Authentication Failures** | Kimlikni tasdiqlash zaif |
| A08 | **Software or Data Integrity Failures** | Kod yoki ma'lumot yaxlitligi tekshirilmaydi |
| A09 | **Security Logging and Alerting Failures** | Hujumni hech kim ko'rmaydi va hech kim ogohlantirilmaydi |
| A10 | **Mishandling of Exceptional Conditions** | Kutilmagan holatda tizim xavfli tomonga yiqiladi |

Har birini ko'rib chiqamiz — nima, nega sodir bo'ladi va qanday oldini olinadi.

### A01. Broken Access Control

Eng keng tarqalgani — ikki nashrdan beri birinchi o'rinda. Autentifikatsiya darsidan: tizim "kimsan?" deb so'raydi, lekin har bir amalda "bu senga mumkinmi?" deb so'rashni unutadi.

Ko'rinishlari:

- Manzildagi identifikatorni o'zgartirib, begona ma'lumotni ko'rish ([[idor|IDOR]]).
- Oddiy foydalanuvchining administrator funksiyasini chaqira olishi.
- Tizimga kirmasdan, manzilini bilgan holda himoyalangan sahifani ochish.
- Brauzerda yashirilgan, lekin serverda tekshirilmaydigan funksiya.
- Fayl yo'lini o'zgartirib, ruxsat etilmagan faylni o'qish ([[path-traversal|path traversal]]).

**SSRF ham endi shu toifada.** 2021-yilda u alohida, o'ninchi toifa edi. [[ssrf|SSRF]]da ilova foydalanuvchi bergan manzilga **serverning o'zi** so'rov yuboradi — masalan, "rasmni shu havoladan yuklab ol" funksiyasi. Server **ichki tarmoqda** turadi: foydalanuvchi tashqi sayt o'rniga ichki manzilni bersa, server uning nomidan ichki xizmatga murojaat qiladi — firewall'ni ichkaridan aylanib o'tgan holda. Bulutda bu ayniqsa jiddiy: u yerda serverlar maxsus ichki manzil orqali o'z sozlamalari va vaqtinchalik kalitlarini oladi. Mohiyatan bu ham kirish nazorati xatosi: server foydalanuvchiga o'zi yeta olmaydigan joyga yetishga ruxsat berib qo'yadi.

**Ildizi:** tekshiruv serverda emas, brauzerda; yoki ba'zi joylarda unutilgan.

**Himoya:** har bir so'rov serverda tekshiriladi; standart holat — taqiq (default deny); tekshiruv bir joyda markazlashgan; har bir obyekt uchun egalik tekshiriladi. SSRF uchun — ruxsat etilgan manzillar ro'yxati (allowlist) va ichki manzillarga so'rovni taqiqlash.

### A02. Security Misconfiguration

Dastur xavfsiz, lekin noto'g'ri sozlangan. 2021-yilda beshinchi edi, endi ikkinchi: zamonaviy ilovaning xatti-harakati tobora ko'proq **sozlamalarga** bog'liq — freymvork, server, konteyner, bulut. Linux va tarmoq bosqichlarining asosiy mavzusi.

Ko'rinishlari:

- Standart hisob va parollar o'zgartirilmagan.
- Keraksiz xizmat, port, sahifa yoki namunaviy fayllar qoldirilgan.
- Katalog ro'yxati ochiq; `.git` yoki zaxira fayllar veb-serverda.
- Foydalanuvchiga batafsil xato xabari va traceback ko'rsatiladi.
- Xavfsizlik sarlavhalari yo'q; cookie'da `HttpOnly` kabi atributlar qo'yilmagan.
- XML tahlilchisida tashqi obyektlar yoqilgan ([[xxe|XXE]] — u ham shu toifaga kiritilgan).
- Bulut saqlash joyi (bucket) hammaga ochiq.

**Himoya:** mustahkamlash (hardening) tartibi; barcha muhitlarda bir xil, avtomatlashtirilgan sozlama; keraksizni olib tashlash; sozlamalarni muntazam tekshirish.

### A03. Software Supply Chain Failures

Zamonaviy ilovaning aksariyat kodi — **boshqalar yozgan** kutubxonalar. U kod sizga uzun zanjir orqali yetib keladi: muallif → paketlar ombori → yig'ish tizimi (CI/CD) → tarqatish va yangilash. Zanjirning istalgan bo'g'ini buzilsa, natija sizning ilovangizda.

Bu toifa 2021-yilgi **Vulnerable and Outdated Components** ("eski, zaif komponentlar") toifasining kengaytirilgani. Farqi: endi gap faqat **ma'lum zaifligi bor** kutubxona haqida emas, balki butun [[supply-chain|ta'minot zanjiri]] haqida:

| Xavf | Misol |
|---|---|
| Ma'lum zaifligi bor komponent | O'tgan darsdagi Log4Shell |
| Qo'llab-quvvatlanmaydigan komponent | Muallifi tashlab ketgan kutubxona — zaiflik topilsa, tuzatish chiqmaydi |
| Ataylab buzilgan paket | Mashhur paketga o'xshash nomli soxta paket; buzilgan muallif hisobi orqali chiqarilgan zararli versiya |
| Buzilgan yig'ish yoki tarqatish | CI/CD tizimiga kirgan hujumchi tayyor dasturga o'z kodini qo'shadi |

Hamjamiyat so'rovnomasida qatnashganlarning roppa-rosa yarmi aynan shu toifani birinchi o'ringa qo'ygan. Lekin bunday hodisalar uchun CVE raqamlari juda kam — ularni test natijalarida ko'rish qiyin, so'rovnoma esa amaliyotchilar nimadan xavotirda ekanini ko'rsatadi.

**Himoya:** ishlatiladigan komponentlar ro'yxatini bilish ([[sbom|SBOM]]); ularni CVE bazalari bilan muntazam solishtirish; yangilab turish va qo'llab-quvvatlanmaydiganidan voz kechish; versiyalarni qotirish; yig'ish tizimini himoyalash; imzolangan artefaktlar; yangilanishni bosqichma-bosqich chiqarish.

### A04. Cryptographic Failures

Sezgir ma'lumot — parollar, karta raqamlari, shaxsiy ma'lumotlar — yetarlicha himoyalanmagan. 2021-yilda ikkinchi edi, endi to'rtinchi — lekin jiddiyligi kamaymagan.

Ko'rinishlari:

- Ma'lumot ochiq HTTP orqali uzatiladi.
- Parollar ochiq yoki tez xesh (MD5, SHA-1) bilan saqlanadi.
- Eskirgan algoritm va protokollar (DES, RC4, TLS 1.0).
- Kalit kodga yozilgan yoki ma'lumot yonida saqlanadi.
- Tasodifiy son zaif generatordan olinadi — token yoki kalitni taxmin qilish mumkin bo'lib qoladi.
- Sertifikat tekshiruvi o'chirilgan.

Kriptografiya, xesh va TLS darslarining to'liq xulosasi.

**Himoya:** hamma joyda TLS; parollar — salt bilan sekin algoritmda; tasodifiy qiymatlar — kriptografik generatordan; sinalgan kutubxonalar; kalitlarni to'g'ri boshqarish; va eng yaxshisi — kerak bo'lmagan sezgir ma'lumotni **saqlamaslik**.

### A05. Injection

Dasturlash bosqichidan tanish oila: kiritilgan **ma'lumot kodga aylanadi**.

| Turi | Ma'lumot nimaga aylanadi |
|---|---|
| [[sql-injection|SQL injection]] | Ma'lumotlar bazasi so'roviga |
| [[xss|XSS]] | Brauzerda bajariladigan JavaScript'ga |
| **Command injection** | Operatsion tizim buyrug'iga |
| **Template injection** | Shablon dvijogi ifodasiga |

XSS ham shu toifaga kiradi: CVE soni bo'yicha u eng ko'p uchraydigan zaiflik turlaridan, lekin bitta XSS ta'siri odatda SQL injection'nikidan kichikroq.

Hammasining ildizi bitta: **ma'lumot va buyruq bir matnga aralashtirilgan**, va tizim ularni ajrata olmaydi.

**Himoya** ham umumiy g'oyaga ega — ularni **ajratish**:

- SQL uchun — parametrlangan so'rovlar.
- XSS uchun — chiqishda kontekstga mos kodlash (`<` → `&lt;`); zamonaviy freymvorklar buni standart holatda qiladi.
- Buyruqlar uchun — foydalanuvchi ma'lumotini buyruq satriga umuman qo'ymaslik; tayyor kutubxona funksiyalaridan foydalanish.
- Hamma joyda — kiritilgan ma'lumotni **serverda** tekshirish (kutilgan format, uzunlik, tur).

### A06. Insecure Design

Bu — boshqacha toifa: xato **kodda emas, g'oyaning o'zida**. Mukammal yozilgan kod ham noto'g'ri loyihani qutqarmaydi. OWASP buni aniq ajratadi: "xavfsiz bo'lmagan loyiha" va "xavfsiz bo'lmagan amalga oshirish" — boshqa-boshqa narsa.

Misollar:

- Parolni tiklash "maxfiy savol" orqali — javobini topish oson.
- Urinishlar soni cheklanmagan: kodni yoki parolni cheksiz sinash mumkin.
- Chegirma kuponini cheksiz marta qo'llash mumkin.
- Muhim amal (pul o'tkazmasi) qayta tasdiqsiz bajariladi.

Bularni skaner topa olmaydi — ular **biznes mantig'idagi** xatolar.

**Himoya:** xavfsizlikni loyihalash bosqichidan o'ylash; **tahdidlarni modellashtirish** (CIA darsidagi besh savol) — ayniqsa autentifikatsiya, kirish nazorati va pul bilan bog'liq jarayonlar uchun; sinalgan xavfsiz loyiha andozalaridan foydalanish; "bu funksiyani suiiste'mol qilsa nima bo'ladi?" degan savolni har bir yangi imkoniyat uchun berish.

### A07. Authentication Failures

Kimlikni tasdiqlash mexanizmidagi zaifliklar. 2021-yilda nomi uzunroq edi — "Identification and Authentication Failures"; mazmuni o'sha.

Ko'rinishlari:

- Zaif va keng tarqalgan parollarga ruxsat beriladi.
- Urinishlar cheklanmagan — sizib chiqqan login-parol juftliklarini ommaviy sinab ko'rish ([[credential-stuffing|credential stuffing]]) mumkin.
- MFA yo'q.
- Parol yoki kalit kodga yozib qo'yilgan.
- Sessiya identifikatori manzilda ko'rinadi, chiqishda bekor qilinmaydi yoki juda uzoq yashaydi.
- Parolni tiklash jarayoni zaif.

**Himoya:** MFA; sizib chiqqan parollarni rad etish; urinishlarni cheklash; sessiyalarni to'g'ri boshqarish; va o'z autentifikatsiya tizimini noldan yozmaslik — sinalgan yechimlardan foydalanish.

### A08. Software or Data Integrity Failures

Ilova kod yoki ma'lumotning **yaxlitligini tekshirmasdan** ishonadi. A03 bilan yaqin, lekin pastroq darajada: A03 — butun zanjir, A08 — ilovaning o'zi qabul qilayotgan aniq kod va ma'lumot.

Ko'rinishlari:

- Yangilanish imzo tekshiruvisiz o'rnatiladi.
- Sahifa skriptni begona manbadan, tekshiruvsiz yuklaydi.
- Ilova tashqaridan kelgan tuzilgan ma'lumotni (serializatsiya qilingan obyektni) tekshirmasdan qayta tiklaydi — xavfli [[deserialization|deserializatsiya]].
- Foydalanuvchi yuborgan maydonlar obyektning istalgan xususiyatini o'zgartira oladi (masalan, `is_admin`).

**Himoya:** raqamli imzolarni tekshirish; faqat ishonchli manbalar; ishonchsiz ma'lumotni tekshirmasdan obyektga aylantirmaslik; o'zgartirsa bo'ladigan maydonlarni aniq ro'yxat bilan cheklash.

### A09. Security Logging and Alerting Failures

Hujum sodir bo'ldi — va hech kim bilmadi. O'tgan darsdagi **dwell time** aynan shu sababdan oylarga cho'ziladi. 2021-yilda toifa "Logging and **Monitoring**" deb atalgan edi; yangi nomdagi **Alerting** (ogohlantirish) so'zi asosiy fikrni ta'kidlaydi: jurnal yozishning o'zi yetmaydi, muhim hodisa **kimnidir harakatga keltirishi** kerak.

Ko'rinishlari:

- Kirishlar, muvaffaqiyatsiz urinishlar, muhim amallar jurnalga yozilmaydi.
- Jurnallar faqat lokal saqlanadi — hujumchi ularni o'chira oladi.
- Jurnallar bor, lekin ularni hech kim ko'rmaydi; ogohlantirishlar sozlanmagan.
- Jurnalga sezgir ma'lumot (parol, token) yozib yuboriladi.
- Foydalanuvchi kiritgan matn jurnalga tozalanmasdan yoziladi — hujumchi soxta yozuvlar qo'sha oladi.

Bu toifa boshqalardan farq qiladi: u hujumga **yo'l ochmaydi**, lekin uni **ko'rinmas** qiladi.

**Himoya:** nimani yozish kerakligini belgilash; markazlashgan, o'zgartirib bo'lmaydigan saqlash; ogohlantirishlar va ularga javob berish jarayoni.

### A10. Mishandling of Exceptional Conditions

2025-yilgi nashrdagi **butunlay yangi** toifa. Dasturlash bosqichida Python'da `try` / `except` ni o'rgandingiz: [[exception|istisno]] — kutilmagan holat (fayl yo'q, tarmoq uzildi, ma'lumot noto'g'ri formatda). Bu toifa — shunday holatlar **noto'g'ri ishlanganda** paydo bo'ladigan zaifliklar.

Ko'rinishlari:

- **Ochiq holatda yiqilish (fail open).** Ruxsatni tekshiruvchi xizmat javob bermadi — va ilova "xato bo'lsa, o'tkazib yuboramiz" deb qaror qiladi.
- **Xato xabarida sezgir ma'lumot.** Traceback, so'rov matni, ichki yo'llar foydalanuvchiga ko'rsatiladi.
- **Resurslar bo'shatilmaydi.** Xatodan keyin ulanish yoki fayl ochiq qoladi; takror-takror xato chaqirib, hujumchi tizimni ishdan chiqaradi ([[dos|DoS]]).
- **Yarim bajarilgan amal.** Ko'p bosqichli jarayon (pul o'tkazmasi) o'rtasida xato — pul bir hisobdan yechilgan, boshqasiga tushmagan, holat buzilgan.

**Himoya:** xato bo'lganda **yopiq holatda yiqilish** (fail closed) — shubha bo'lsa, rad etish; foydalanuvchiga umumiy xato sahifasi, tafsilotlar esa faqat jurnalga; resurslarni har qanday holatda bo'shatish (`finally`, `with`); ko'p bosqichli amallarni butunlay bajarish yoki butunlay bekor qilish (tranzaksiya).

## 2021 → 2025: nima o'zgardi

Ko'p kitob, kurs va sertifikat hali 2021-yilgi raqamlardan foydalanadi, shuning uchun ikkalasini bog'lay olish foydali:

| 2021 | 2025 | Nima bo'ldi |
|---|---|---|
| A01 Broken Access Control | A01 | O'z o'rnida; SSRF unga qo'shildi |
| A02 Cryptographic Failures | A04 | Ikki pog'ona pastga |
| A03 Injection | A05 | Ikki pog'ona pastga; XSS hamon shu yerda |
| A04 Insecure Design | A06 | Ikki pog'ona pastga |
| A05 Security Misconfiguration | A02 | Uch pog'ona yuqoriga |
| A06 Vulnerable and Outdated Components | A03 Software Supply Chain Failures | Butun ta'minot zanjiriga kengaydi |
| A07 Identification and Authentication Failures | A07 Authentication Failures | Nomi qisqardi |
| A08 Software and Data Integrity Failures | A08 Software or Data Integrity Failures | Nomi biroz aniqlashtirildi |
| A09 Security Logging and Monitoring Failures | A09 Security Logging and Alerting Failures | Ogohlantirishga urg'u |
| A10 Server-Side Request Forgery | — | A01 ichiga kirdi |
| — | A10 Mishandling of Exceptional Conditions | Yangi toifa |

Bundan chiqadigan xulosa: **raqamlarni emas, g'oyalarni o'rganing.** Injection ikki nashr orasida uchinchidan beshinchiga tushdi — lekin "ma'lumotni buyruqdan ajrat" tamoyili o'zgarmadi. Amaldagi ro'yxatni har doim rasmiy saytdan — `owasp.org` dan tekshiring.

:::warn
Pastga tushish "endi xavfsiz" degani emas. Injection hamon minglab ilovalarda uchraydi; tartib — nisbiy o'lchov: boshqa toifalar tez-tez uchragani uchun ular yuqoriga ko'tarilgan.
:::

## Umumiy ildizlar

O'nta toifaga diqqat bilan qarasangiz, ular bir necha asosiy xatoga borib taqaladi:

| Ildiz xato | Qaysi toifalar |
|---|---|
| **Kirishga ishonish** — tashqaridan kelgan ma'lumot tekshirilmaydi | Injection, SSRF (Access Control ichida), Integrity Failures |
| **Tekshiruvni unutish yoki brauzerga topshirish** | Broken Access Control, Authentication Failures |
| **Standart holat xavfsiz emas** | Misconfiguration, Exceptional Conditions (fail open) |
| **Nimaga tayanayotganini bilmaslik** | Supply Chain Failures |
| **Xavfsizlik oxirida "qo'shiladi"** | Insecure Design |
| **Ko'rmaslik** | Logging and Alerting Failures |
| **Kriptografiyani noto'g'ri ishlatish** | Cryptographic Failures |

Chap ustun — CIA darsidagi tamoyillarning teskarisi: kirishga ishonmaslik, default deny, eng kam imtiyoz, xavfsiz standart holat, aniqlash.

:::key
Web xavfsizligining uch asosiy qoidasi — ular o'nta toifaning ko'pini qoplaydi:

1. **Klientdan kelgan hech narsaga ishonma.** Hammasi serverda tekshiriladi.
2. **Ma'lumotni buyruqdan ajrat.** Parametrlangan so'rovlar, chiqishda kodlash.
3. **Har bir so'rovda so'ra: "bu foydalanuvchiga shu amal mumkinmi?"** — va javob olinmasa, rad et.
:::

## Ikki tomondan qarash

Bu ro'yxat ikkala yo'nalish uchun ham xarita:

| | Tekshiruvchi (Pentest) | Quruvchi (AppSec) |
|---|---|---|
| Savol | "Bu ilovada qaysi toifalar buzilgan?" | "Bu toifalar ilovamizda paydo bo'lmasligi uchun nima qilamiz?" |
| Ish | Topish, isbotlash, hisobot | Loyihalash, kod tahlili, avtomatik tekshiruvlar |
| Natija | Topilmalar ro'yxati | Zaiflik umuman paydo bo'lmasligi |

Ikkala tomon ham bir xil bilimga tayanadi. Qaysi biri sizga yaqinroq ekanini keyingi — oxirgi — darsda hal qilasiz.

## Xavfsiz mashq qilish

Web zaifliklarini o'rganishning yagona yo'li — amaliyot. Buning uchun **atayin zaif qilingan** o'quv ilovalar bor:

| Platforma | Nima |
|---|---|
| **PortSwigger Web Security Academy** | Har bir zaiflik turi bo'yicha bepul nazariya va brauzerda ishlaydigan lablar. Eng yaxshi boshlang'ich nuqta |
| **OWASP Juice Shop** | Zamonaviy ko'rinishdagi zaif onlayn do'kon — o'z kompyuteringizda ishga tushiriladi |
| **DVWA** | Klassik zaif ilova, qiyinlik darajalari bilan |
| **TryHackMe / Hack The Box** | Yo'riqnomali xonalar va mashinalar |

:::warn
Bu ko'nikmalarni **faqat** shunday o'quv muhitlarida va o'zingizga tegishli ilovalarda sinang. Haqiqiy saytda "shunchaki tekshirib ko'rish" — ruxsatsiz kirishga urinish, niyatingizdan qat'i nazar. O'quv ilovalarni o'z kompyuteringizda ishga tushirganda ularni tarmoqdan yoping ("Virtualizatsiya" darsidagi qoida) — ular atayin zaif.
:::

Amaliyot bo'limidagi **"Manba kodida nima bor?"** topshirig'i — bu yo'nalishdagi birinchi qadam: u "klient tomondagi tekshiruv himoya emas" degan g'oyani ko'rsatadi.

:::try
**1. Toifani aniqlang.** Quyidagi har bir holat 2025-yilgi ro'yxatning qaysi toifasiga kiradi?

a) Sayt xato yuz berganda foydalanuvchiga to'liq traceback va ma'lumotlar bazasi versiyasini ko'rsatadi.
b) Profil sahifasi manzilidagi raqamni o'zgartirib, boshqa foydalanuvchining ma'lumotini ko'rish mumkin.
c) Ilova muallifi tashlab ketgan, ma'lum zaifligi bor kutubxonadan foydalanadi.
d) Kirish sahifasida urinishlar soni cheklanmagan va MFA yo'q.
e) Hujumchi bir oy davomida tizimda yurgan; jurnallar bor edi, lekin hech qanday ogohlantirish ishlamagan.
f) Qidiruv maydoniga kiritilgan matn so'rov matniga to'g'ridan-to'g'ri ulanadi.
g) To'lov xizmati javob bermaganda, do'kon buyurtmani "to'langan" deb belgilaydi.
h) "Rasmni havoladan yuklash" funksiyasiga ichki tarmoqdagi manzil berilsa, server uni ochib beradi.

**2. 2021 bilan bog'lang.** (c) va (h) holatlar 2021-yilgi ro'yxatda qaysi toifalarda bo'lgan bo'lardi?

**3. PortSwigger Academy.** Ro'yxatdan o'ting va "SQL injection" hamda "Access control" bo'limlaridagi birinchi (Apprentice) lablarni bajaring. Har birida avval nazariyani o'qing.

**4. O'z ko'zingiz bilan.** Har kuni ishlatadigan biror saytda `F12` → **Network** orqali kuzating: ilova qanday so'rovlar yuboradi, javoblarda sahifada ko'rsatilganidan ko'proq ma'lumot kelyaptimi? Faqat **kuzating** — hech narsani o'zgartirmang.

*1-savol javoblari: a) Security Misconfiguration (sezgir ma'lumotli xato xabari A10 bilan ham chegaradosh); b) Broken Access Control; c) Software Supply Chain Failures; d) Authentication Failures; e) Security Logging and Alerting Failures; f) Injection; g) Mishandling of Exceptional Conditions — fail open; h) Broken Access Control (SSRF).*

*2-savol javoblari: (c) — A06:2021 Vulnerable and Outdated Components; (h) — A10:2021 Server-Side Request Forgery.*
:::

## Xulosa

- **OWASP Top 10** — veb-ilovalardagi eng jiddiy o'nta xavf toifasi; sohaning umumiy tili. Amaldagi nashr — **2025**.
- **Broken Access Control** — eng keng tarqalgani: har so'rovda serverda tekshirish. **SSRF** endi shu toifada.
- **Security Misconfiguration** — ikkinchi o'ringa ko'tarildi: sozlamalar tobora ko'proq narsani hal qiladi.
- **Software Supply Chain Failures** — eski komponentlardan butun zanjirga: paketlar, yig'ish, tarqatish.
- **Cryptographic Failures** — ochiq uzatish, zaif xesh, zaif tasodifiylik, yomon kalit boshqaruvi.
- **Injection** (SQL, XSS, buyruq) — ma'lumot kodga aylanadi; himoya — ajratish.
- **Insecure Design** — xato loyihaning o'zida; skaner topmaydi; himoya — tahdidlarni modellashtirish.
- **Authentication Failures** — MFA, urinishlarni cheklash, sessiya boshqaruvi.
- **Integrity Failures** — imzo va manbani tekshirmaslik, xavfli deserializatsiya.
- **Logging and Alerting Failures** — hujum ko'rinmas qoladi; jurnal yetmaydi, ogohlantirish kerak.
- **Mishandling of Exceptional Conditions** — yangi: xatoda ochiq yiqilish, sezgir xato xabarlari; himoya — fail closed.
- Raqamlar o'zgaradi — **g'oyalarni** o'rganing: kirishga ishonmaslik, ajratish, har so'rovda tekshirish.

:::quiz
? OWASP Top 10 nima?
- Eng yaxshi o'nta xavfsizlik vositasining yillik reytingi
+ Veb-ilovalardagi eng jiddiy o'nta xavf toifasi ro'yxati
- Veb-serverlar uchun majburiy o'nta sozlama standarti
- Eng ko'p zarar keltirgan o'nta hujumchi guruh ro'yxati
! U haqiqiy ma'lumotlar va hamjamiyat so'rovnomasiga asoslangan xabardorlik hujjati va sohaning umumiy tili.

? Foydalanuvchi manzildagi identifikatorni o'zgartirib, boshqa odamning buyurtmasini ko'rdi. Bu qaysi toifa?
+ Broken Access Control
- Injection
- Cryptographic Failures
- Software or Data Integrity Failures
! Server obyekt shu foydalanuvchiga tegishli ekanini tekshirmagan — kirish nazorati buzilgan.

? 2025-yilgi nashrda SSRF bilan nima bo'ldi?
- Ro'yxatdan butunlay chiqarildi, chunki endi uchramaydi
+ Alohida toifa bo'lmay qoldi — Broken Access Control ichiga kiritildi
- Injection toifasiga qo'shildi
- Birinchi o'ringa ko'tarildi
! SSRF'da server foydalanuvchiga o'zi yeta olmaydigan ichki manzillarga yetishga yo'l beradi — mohiyatan kirish nazorati xatosi.

? 2021-yilgi "Vulnerable and Outdated Components" 2025-yilda qanday toifaga aylandi?
- Security Misconfiguration ichiga kirdi
- Software or Data Integrity Failures bilan birlashtirildi
+ Software Supply Chain Failures — butun ta'minot zanjirini qamraydigan kengroq toifa
- Ro'yxatdan chiqarildi, chunki skanerlar uni hal qildi
! Endi gap faqat ma'lum zaifligi bor kutubxona haqida emas: buzilgan paketlar, yig'ish tizimi va tarqatish ham shu toifada.

? To'lov xizmati javob bermadi va do'kon buyurtmani baribir "to'langan" deb belgiladi. Bu 2025-yilgi qaysi toifa?
- Insecure Design
+ Mishandling of Exceptional Conditions
- Security Logging and Alerting Failures
- Software Supply Chain Failures
! Kutilmagan holatda tizim "ochiq" tomonga yiqildi (fail open). To'g'risi — shubha bo'lsa, rad etish (fail closed).

? Injection zaifliklarining umumiy ildizi nima?
- Server sekin ishlaydi va so'rovlar navbatda qoladi
+ Foydalanuvchi kiritgan ma'lumot buyruq yoki kod bilan aralashib, bajariladi
- Parollar qisqa va oddiy so'zlardan iborat
- Jurnallar markazlashgan joyga yuborilmaydi
! SQL injection, XSS va command injection — bitta xatoning ko'rinishlari: ma'lumot va buyruq ajratilmagan.

? Sayt parollarni MD5 bilan, salt'siz saqlaydi. Bu qaysi toifaga kiradi?
- Injection
+ Cryptographic Failures
- Security Misconfiguration
- Authentication Failures
! Eskirgan, tez xesh algoritmi va salt yo'qligi — kriptografiyani noto'g'ri qo'llash.

? Insecure Design boshqa toifalardan nimasi bilan farq qiladi?
- U faqat mobil ilovalarda, server tomonida emas, uchraydi
+ Xato kodda emas, loyihaning o'zida — to'g'ri yozilgan kod ham uni tuzatmaydi
- U faqat shifrlash algoritmlarini tanlashga tegishli
- Uni avtomatik skanerlar boshqalaridan osonroq topadi
! Masalan, cheklanmagan urinishlar yoki zaif tiklash jarayoni — bu mantiq va loyiha xatosi; skanerlar ularni topmaydi.

? Nega A09 toifasining nomida "Monitoring" o'rniga "Alerting" so'zi paydo bo'ldi?
- Jurnal yozish endi talab qilinmaydi, faqat ogohlantirish kerak
+ Jurnal yozishning o'zi yetmaydi — muhim hodisa kimnidir harakatga keltirishi kerak
- Monitoring vositalari eskirgani uchun
- Bu toifa faqat elektron pochta xabarlariga tegishli bo'lib qoldi
! Jurnal bor, lekin hech kim ogohlantirilmasa, hujum baribir oylab sezilmaydi.

? 2025-yilgi ro'yxatda Injection beshinchi o'ringa tushdi. Bundan qanday xulosa chiqadi?
- Injection endi deyarli uchramaydi, uni o'rganmasa ham bo'ladi
+ Tartib nisbiy: boshqa toifalar ko'proq uchragan; injection hamon jiddiy va himoya tamoyili o'zgarmagan
- Parametrlangan so'rovlar endi kerak emas
- Faqat 2021-yilgi ro'yxatni o'rganish kerak
! Raqamlarni emas, g'oyalarni o'rganing: "ma'lumotni buyruqdan ajrat" tamoyili har nashrda amal qiladi.

? Web xavfsizligining asosiy qoidalaridan qaysi biri to'g'ri?
- Brauzerdagi tekshiruv serverdagidan ishonchliroq
+ Klientdan kelgan hech narsaga ishonmaslik — hammasi serverda tekshiriladi
- HTTPS yoqilgan bo'lsa, boshqa himoya kerak emas
- Yashirin forma maydonlarini foydalanuvchi o'zgartira olmaydi
! Foydalanuvchi so'rovning har bir qismini o'zgartira oladi. Ishonchli tekshiruv faqat serverda.

? Web zaifliklarini qayerda mashq qilish to'g'ri?
- Istalgan saytda, agar faqat o'rganish niyatida bo'lsa
+ Atayin zaif qilingan o'quv muhitlarida (PortSwigger Academy, Juice Shop) va o'z ilovalarimda
- Do'stimning saytida, unga keyin aytib qo'ygan holda
- Katta kompaniyalar saytlarida, chunki ular baribir himoyalangan
! Ruxsatsiz “tekshirib ko'rish” — qonunbuzarlik. O'quv platformalari aynan shu maqsadda yaratilgan.
:::

:::cards
OWASP Top 10 nima? :: Veb-ilovalardagi eng jiddiy o'nta xavf toifasi ro'yxati; amaldagi nashr — 2025; ma'lumotlar va hamjamiyat so'rovnomasiga asoslanadi.
Broken Access Control (A01)? :: Foydalanuvchi ruxsat etilmagan ma'lumot yoki funksiyaga kira oladi; SSRF ham shu yerda. Himoya — har so'rovda serverda tekshirish, default deny.
Security Misconfiguration (A02)? :: Standart parollar, keraksiz xizmatlar, ochiq kataloglar, batafsil xato xabarlari, XXE. 2025-yilda ikkinchi o'ringa ko'tarildi.
Software Supply Chain Failures (A03)? :: Begona kod zanjiri buzilgan: zaif yoki tashlab ketilgan kutubxona, soxta paket, buzilgan CI/CD. Himoya — SBOM, yangilash, imzolar.
Cryptographic Failures (A04)? :: Ochiq uzatish, eskirgan algoritm, tez xesh, zaif tasodifiylik, yomon kalit boshqaruvi.
Injection (A05)? :: SQL injection, XSS, command injection — ma'lumot kodga aylanadi. Himoya — parametrlangan so'rovlar, chiqishda kodlash.
Insecure Design (A06)? :: Xato kodda emas, loyihada: cheklanmagan urinishlar, zaif tiklash, biznes mantig'i. Himoya — tahdidlarni modellashtirish.
Authentication Failures (A07)? :: Zaif parollar, cheklanmagan urinishlar, MFA yo'qligi, kodga yozilgan parol, noto'g'ri sessiya boshqaruvi.
Software or Data Integrity Failures (A08)? :: Kod yoki ma'lumot yaxlitligi tekshirilmaydi: imzosiz yangilanish, xavfli deserializatsiya.
Security Logging and Alerting Failures (A09)? :: Hodisalar yozilmaydi yoki hech kim ogohlantirilmaydi — hujum sezilmay qoladi.
Mishandling of Exceptional Conditions (A10)? :: Yangi toifa: kutilmagan holatda fail open, sezgir xato xabari, bo'shatilmagan resurslar. Himoya — fail closed.
Web xavfsizligining uch qoidasi? :: Klientga ishonma; ma'lumotni buyruqdan ajrat; har so'rovda “bu foydalanuvchiga mumkinmi?” deb tekshir.
:::
