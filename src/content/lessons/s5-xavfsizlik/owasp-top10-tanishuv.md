Zamonaviy tashkilotning eng katta hujum yuzasi — uning veb-ilovalari: sayt, mijozlar kabineti, mobil ilova ortidagi API. Ular internetga ochiq bo'lishi **shart** — firewall ularni yashira olmaydi. Shuning uchun zaifliklarning katta qismi aynan shu yerda topiladi va xavfsizlikdagi ish o'rinlarining katta qismi ham shu bilan bog'liq.

Yaxshi xabar: veb-zaifliklar cheksiz emas. Ular bir necha takrorlanuvchi toifaga bo'linadi — va siz ularning ko'pini oldingi bosqichlarda allaqachon uchratgansiz. Bu dars ularni bitta xaritaga yig'adi.

## OWASP va Top 10

[[owasp|OWASP]] (Open Worldwide Application Security Project) — ilovalar xavfsizligi bo'yicha ochiq, notijorat hamjamiyat. Uning eng mashhur ishi — **OWASP Top 10**: veb-ilovalardagi eng jiddiy o'nta xavf toifasi ro'yxati.

Ro'yxat haqiqiy ma'lumotlarga asoslanadi (minglab ilovalar tekshiruvi natijalari) va bir necha yilda bir yangilanadi. U:

- dasturchilar uchun — "nimadan ehtiyot bo'lish kerak" ro'yxati;
- tekshiruvchilar uchun — minimal tekshiruv dasturi;
- butun soha uchun — umumiy til. Intervyuda "OWASP Top 10 ni bilasizmi?" — deyarli majburiy savol.

:::info
Top 10 — **xabardorlik hujjati**, to'liq standart emas. Unda yo'q zaiflik ham jiddiy bo'lishi mumkin. To'liq tekshiruv ro'yxatlari uchun OWASP'ning boshqa hujjatlari bor: **ASVS** (talablar standarti) va **WSTG** (sinov qo'llanmasi). Ular bilan AppSec va Pentest yo'nalishlarida ishlaysiz.
:::

## O'n toifa

Quyida 2021-yilgi nashr tartibi berilgan. Raqamlar va tartib nashrdan nashrga o'zgaradi — yodlash kerak bo'lgani **toifalarning o'zi va ularning ildizi**.

| № | Toifa | Bir jumlada |
|---|---|---|
| A01 | **Broken Access Control** | Foydalanuvchi o'ziga ruxsat etilmagan narsani qila oladi |
| A02 | **Cryptographic Failures** | Sezgir ma'lumot yomon himoyalangan yoki umuman himoyalanmagan |
| A03 | **Injection** | Kiritilgan ma'lumot buyruq sifatida bajariladi |
| A04 | **Insecure Design** | Xato kodda emas — loyihaning o'zida |
| A05 | **Security Misconfiguration** | Xavfsiz dastur noto'g'ri sozlangan |
| A06 | **Vulnerable and Outdated Components** | Ma'lum zaifligi bor kutubxona yoki dastur |
| A07 | **Identification and Authentication Failures** | Kimlikni tasdiqlash zaif |
| A08 | **Software and Data Integrity Failures** | Kod yoki ma'lumot yaxlitligi tekshirilmaydi |
| A09 | **Security Logging and Monitoring Failures** | Hujumni hech kim ko'rmaydi |
| A10 | **Server-Side Request Forgery (SSRF)** | Serverni hujumchi tanlagan manzilga so'rov yuborishga majburlash |

Har birini ko'rib chiqamiz — nima, nega sodir bo'ladi va qanday oldini olinadi.

### A01. Broken Access Control

Eng keng tarqalgani. Autentifikatsiya darsidan: tizim "kimsan?" deb so'raydi, lekin har bir amalda "bu senga mumkinmi?" deb so'rashni unutadi.

Ko'rinishlari:

- Manzildagi identifikatorni o'zgartirib, begona ma'lumotni ko'rish ([[idor|IDOR]]).
- Oddiy foydalanuvchining administrator funksiyasini chaqira olishi.
- Tizimga kirmasdan, manzilini bilgan holda himoyalangan sahifani ochish.
- Brauzerda yashirilgan, lekin serverda tekshirilmaydigan funksiya.

**Ildizi:** tekshiruv serverda emas, brauzerda; yoki ba'zi joylarda unutilgan.

**Himoya:** har bir so'rov serverda tekshiriladi; standart holat — taqiq (default deny); tekshiruv bir joyda markazlashgan; har bir obyekt uchun egalik tekshiriladi.

### A02. Cryptographic Failures

Sezgir ma'lumot — parollar, karta raqamlari, shaxsiy ma'lumotlar — yetarlicha himoyalanmagan.

Ko'rinishlari:

- Ma'lumot ochiq HTTP orqali uzatiladi.
- Parollar ochiq yoki tez xesh (MD5, SHA-1) bilan saqlanadi.
- Eskirgan algoritm va protokollar (DES, RC4, TLS 1.0).
- Kalit kodga yozilgan yoki ma'lumot yonida saqlanadi.
- Sertifikat tekshiruvi o'chirilgan.

Kriptografiya, xesh va TLS darslarining to'liq xulosasi.

**Himoya:** hamma joyda TLS; parollar — salt bilan sekin algoritmda; sinalgan kutubxonalar; kalitlarni to'g'ri boshqarish; va eng yaxshisi — kerak bo'lmagan sezgir ma'lumotni **saqlamaslik**.

### A03. Injection

Dasturlash bosqichidan tanish oila: kiritilgan **ma'lumot kodga aylanadi**.

| Turi | Ma'lumot nimaga aylanadi |
|---|---|
| [[sql-injection|SQL injection]] | Ma'lumotlar bazasi so'roviga |
| [[xss|XSS]] | Brauzerda bajariladigan JavaScript'ga |
| **Command injection** | Operatsion tizim buyrug'iga |
| **Template injection** | Shablon dvijogi ifodasiga |

Hammasining ildizi bitta: **ma'lumot va buyruq bir matnga aralashtirilgan**, va tizim ularni ajrata olmaydi.

**Himoya** ham umumiy g'oyaga ega — ularni **ajratish**:

- SQL uchun — parametrlangan so'rovlar.
- XSS uchun — chiqishda kontekstga mos kodlash (`<` → `&lt;`); zamonaviy freymvorklar buni standart holatda qiladi.
- Buyruqlar uchun — foydalanuvchi ma'lumotini buyruq satriga umuman qo'ymaslik; tayyor kutubxona funksiyalaridan foydalanish.
- Hamma joyda — kiritilgan ma'lumotni **serverda** tekshirish (kutilgan format, uzunlik, tur).

### A04. Insecure Design

Bu — boshqacha toifa: xato **kodda emas, g'oyaning o'zida**. Mukammal yozilgan kod ham noto'g'ri loyihani qutqarmaydi.

Misollar:

- Parolni tiklash "maxfiy savol" orqali — javobini topish oson.
- Urinishlar soni cheklanmagan: kodni yoki parolni cheksiz sinash mumkin.
- Chegirma kuponini cheksiz marta qo'llash mumkin.
- Muhim amal (pul o'tkazmasi) qayta tasdiqsiz bajariladi.

Bularni skaner topa olmaydi — ular **biznes mantig'idagi** xatolar.

**Himoya:** xavfsizlikni loyihalash bosqichidan o'ylash; **tahdidlarni modellashtirish** (CIA darsidagi besh savol); "bu funksiyani suiiste'mol qilsa nima bo'ladi?" degan savolni har bir yangi imkoniyat uchun berish.

### A05. Security Misconfiguration

Dastur xavfsiz, lekin noto'g'ri sozlangan. Linux va tarmoq bosqichlarining asosiy mavzusi.

Ko'rinishlari:

- Standart hisob va parollar o'zgartirilmagan.
- Keraksiz xizmat, port, sahifa yoki namunaviy fayllar qoldirilgan.
- Katalog ro'yxati ochiq; `.git` yoki zaxira fayllar veb-serverda.
- Foydalanuvchiga batafsil xato xabari va traceback ko'rsatiladi.
- Xavfsizlik sarlavhalari yo'q.
- Bulut saqlash joyi (bucket) hammaga ochiq.

**Himoya:** mustahkamlash (hardening) tartibi; barcha muhitlarda bir xil, avtomatlashtirilgan sozlama; keraksizni olib tashlash; sozlamalarni muntazam tekshirish.

### A06. Vulnerable and Outdated Components

Zamonaviy ilovaning aksariyat kodi — **boshqalar yozgan** kutubxonalar. Ularning birida zaiflik topilsa, u sizning ilovangizda ham bor.

O'tgan darsdagi Log4Shell — eng yorqin misol.

**Himoya:** ishlatiladigan komponentlar ro'yxatini bilish (**SBOM**); ularni CVE bazalari bilan muntazam solishtirish (bog'liqliklarni skanerlash vositalari); yangilab turish; qo'llab-quvvatlanmaydigan komponentlardan voz kechish.

### A07. Identification and Authentication Failures

Kimlikni tasdiqlash mexanizmidagi zaifliklar.

Ko'rinishlari:

- Zaif va keng tarqalgan parollarga ruxsat beriladi.
- Urinishlar cheklanmagan — parol terish mumkin.
- MFA yo'q.
- Sessiya identifikatori manzilda ko'rinadi, chiqishda bekor qilinmaydi yoki juda uzoq yashaydi.
- Parolni tiklash jarayoni zaif.

**Himoya:** MFA; sizib chiqqan parollarni rad etish; urinishlarni cheklash; sessiyalarni to'g'ri boshqarish; va o'z autentifikatsiya tizimini noldan yozmaslik — sinalgan yechimlardan foydalanish.

### A08. Software and Data Integrity Failures

Ilova kod yoki ma'lumotning **yaxlitligini tekshirmasdan** ishonadi.

Ko'rinishlari:

- Yangilanish imzo tekshiruvisiz o'rnatiladi.
- Kutubxonalar ishonchsiz manbadan, tekshiruvsiz yuklanadi.
- Yig'ish va joylash jarayoni (CI/CD) yetarlicha himoyalanmagan — unga kirgan kishi kodga o'z o'zgarishini qo'sha oladi.
- Ilova tashqaridan kelgan tuzilgan ma'lumotni (serializatsiya qilingan obyektni) tekshirmasdan qayta tiklaydi.

Bu — **ta'minot zanjiri** hujumlarining texnik asosi.

**Himoya:** raqamli imzolarni tekshirish; faqat ishonchli manbalar; yig'ish jarayonini himoyalash; ishonchsiz ma'lumotni tekshirmasdan obyektga aylantirmaslik.

### A09. Security Logging and Monitoring Failures

Hujum sodir bo'ldi — va hech kim bilmadi. O'tgan darsdagi **dwell time** aynan shu sababdan oylarga cho'ziladi.

Ko'rinishlari:

- Kirishlar, muvaffaqiyatsiz urinishlar, muhim amallar jurnalga yozilmaydi.
- Jurnallar faqat lokal saqlanadi — hujumchi ularni o'chira oladi.
- Jurnallar bor, lekin ularni hech kim ko'rmaydi; ogohlantirishlar sozlanmagan.
- Jurnalga sezgir ma'lumot (parol, token) yozib yuboriladi.

Bu toifa boshqalardan farq qiladi: u hujumga **yo'l ochmaydi**, lekin uni **ko'rinmas** qiladi.

**Himoya:** nimani yozish kerakligini belgilash; markazlashgan, o'zgartirib bo'lmaydigan saqlash; ogohlantirishlar va ularga javob berish jarayoni.

### A10. Server-Side Request Forgery (SSRF)

Ilova foydalanuvchi bergan manzilga **serverning o'zi** so'rov yuboradi — masalan, "rasmni shu havoladan yuklab ol" funksiyasi.

Muammo: server **ichki tarmoqda** turadi va tashqaridan ko'rinmaydigan manzillarga yeta oladi. Foydalanuvchi tashqi sayt o'rniga ichki manzilni bersa, server uning nomidan ichki xizmatga murojaat qiladi — firewall'ni ichkaridan aylanib o'tgan holda.

Bulut muhitida bu ayniqsa jiddiy: u yerda serverlar maxsus ichki manzil orqali o'z sozlamalari va vaqtinchalik kalitlarini oladi.

**Himoya:** ruxsat etilgan manzillar ro'yxati (allowlist); ichki manzillarga so'rovni taqiqlash; bunday funksiyani alohida, cheklangan tarmoq segmentida bajarish.

## Yangi nashr haqida

Ro'yxat davriy yangilanadi, va 2021-yildan keyingi nashrda toifalar qayta guruhlangan: ta'minot zanjiri xavflari kengroq alohida toifaga aylangan, xatolarni noto'g'ri boshqarish alohida ajratilgan, ba'zi toifalar birlashtirilgan.

Bundan chiqadigan xulosa: **raqamlarni emas, g'oyalarni o'rganing.** "A03" ertaga boshqa raqam oladi; "ma'lumotni buyruqdan ajrat" tamoyili esa o'zgarmaydi. Amaldagi ro'yxatni har doim rasmiy saytdan — `owasp.org` dan tekshiring.

## Umumiy ildizlar

O'nta toifaga diqqat bilan qarasangiz, ular bir necha asosiy xatoga borib taqaladi:

| Ildiz xato | Qaysi toifalar |
|---|---|
| **Kirishga ishonish** — tashqaridan kelgan ma'lumot tekshirilmaydi | Injection, SSRF, Integrity Failures |
| **Tekshiruvni unutish yoki brauzerga topshirish** | Broken Access Control, Authentication Failures |
| **Standart holat xavfsiz emas** | Misconfiguration |
| **Nima borligini bilmaslik** | Outdated Components |
| **Xavfsizlik oxirida "qo'shiladi"** | Insecure Design |
| **Ko'rmaslik** | Logging and Monitoring Failures |
| **Kriptografiyani noto'g'ri ishlatish** | Cryptographic Failures |

Chap ustun — CIA darsidagi tamoyillarning teskarisi: kirishga ishonmaslik, default deny, eng kam imtiyoz, xavfsiz standart holat, aniqlash.

:::key
Web xavfsizligining uch asosiy qoidasi — ular o'nta toifaning ko'pini qoplaydi:

1. **Klientdan kelgan hech narsaga ishonma.** Hammasi serverda tekshiriladi.
2. **Ma'lumotni buyruqdan ajrat.** Parametrlangan so'rovlar, chiqishda kodlash.
3. **Har bir so'rovda so'ra: "bu foydalanuvchiga shu amal mumkinmi?"**
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
**1. Toifani aniqlang.** Quyidagi har bir holat qaysi OWASP toifasiga kiradi?

a) Sayt xato yuz berganda foydalanuvchiga to'liq traceback va ma'lumotlar bazasi versiyasini ko'rsatadi.
b) Profil sahifasi manzilidagi raqamni o'zgartirib, boshqa foydalanuvchining ma'lumotini ko'rish mumkin.
c) Ilova uch yil oldingi, ma'lum zaifligi bor kutubxonadan foydalanadi.
d) Kirish sahifasida urinishlar soni cheklanmagan va MFA yo'q.
e) Hujumchi bir oy davomida tizimda yurgan, lekin jurnallarda hech narsa yo'q.
f) Qidiruv maydoniga kiritilgan matn so'rov matniga to'g'ridan-to'g'ri ulanadi.

**2. PortSwigger Academy.** Ro'yxatdan o'ting va "SQL injection" hamda "Access control" bo'limlaridagi birinchi (Apprentice) lablarni bajaring. Har birida avval nazariyani o'qing.

**3. O'z ko'zingiz bilan.** Har kuni ishlatadigan biror saytda `F12` → **Network** orqali kuzating: ilova qanday so'rovlar yuboradi, javoblarda sahifada ko'rsatilganidan ko'proq ma'lumot kelyaptimi? Faqat **kuzating** — hech narsani o'zgartirmang.

*1-savol javoblari: a) Security Misconfiguration; b) Broken Access Control; c) Vulnerable and Outdated Components; d) Identification and Authentication Failures; e) Security Logging and Monitoring Failures; f) Injection.*
:::

## Xulosa

- **OWASP Top 10** — veb-ilovalardagi eng jiddiy o'nta xavf toifasi; sohaning umumiy tili.
- **Broken Access Control** — eng keng tarqalgani: har so'rovda serverda tekshirish.
- **Injection** (SQL, XSS, buyruq) — ma'lumot kodga aylanadi; himoya — ajratish.
- **Cryptographic Failures** — ochiq uzatish, zaif xesh, yomon kalit boshqaruvi.
- **Insecure Design** — xato loyihaning o'zida; skaner topmaydi.
- **Misconfiguration** va **Outdated Components** — tartib-intizom masalasi.
- **Authentication Failures** — MFA, urinishlarni cheklash, sessiya boshqaruvi.
- **Integrity Failures** — imzo va manbani tekshirmaslik; ta'minot zanjiri.
- **Logging Failures** — hujum ko'rinmas qoladi.
- **SSRF** — server hujumchi tanlagan (ichki) manzilga so'rov yuboradi.
- Raqamlar o'zgaradi — **g'oyalarni** o'rganing: kirishga ishonmaslik, ajratish, har so'rovda tekshirish.

:::quiz
? OWASP Top 10 nima?
- Eng yaxshi o'nta xavfsizlik vositasi
+ Veb-ilovalardagi eng jiddiy o'nta xavf toifasi ro'yxati
- O'nta eng mashhur xaker
- Tarmoq protokollari standarti
! U haqiqiy ma'lumotlarga asoslangan xabardorlik hujjati va sohaning umumiy tili.

? Foydalanuvchi manzildagi identifikatorni o'zgartirib, boshqa odamning buyurtmasini ko'rdi. Bu qaysi toifa?
+ Broken Access Control
- Injection
- Cryptographic Failures
- SSRF
! Server obyekt shu foydalanuvchiga tegishli ekanini tekshirmagan — kirish nazorati buzilgan.

? Injection zaifliklarining umumiy ildizi nima?
- Server sekin ishlaydi
+ Foydalanuvchi kiritgan ma'lumot buyruq yoki kod bilan aralashib, bajariladi
- Parollar qisqa
- Jurnallar yo'q
! SQL injection, XSS va command injection — bitta xatoning ko'rinishlari: ma'lumot va buyruq ajratilmagan.

? Sayt parollarni MD5 bilan, salt'siz saqlaydi. Bu qaysi toifaga kiradi?
- Injection
+ Cryptographic Failures
- Security Misconfiguration
- SSRF
! Eskirgan, tez xesh algoritmi va salt yo'qligi — kriptografiyani noto'g'ri qo'llash.

? Insecure Design boshqa toifalardan nimasi bilan farq qiladi?
- U faqat mobil ilovalarda uchraydi
+ Xato kodda emas, loyihaning o'zida — to'g'ri yozilgan kod ham uni tuzatmaydi
- U eng xavfsiz toifa
- U faqat shifrlashga tegishli
! Masalan, cheklanmagan urinishlar yoki zaif tiklash jarayoni — bu mantiq va loyiha xatosi; skanerlar ularni topmaydi.

? Serverda standart `admin/admin` hisobi qoldirilgan va katalog ro'yxati ochiq. Bu qaysi toifa?
- Injection
- Broken Access Control
+ Security Misconfiguration
- Integrity Failures
! Dasturning o'zi zaif emas — u noto'g'ri sozlangan va mustahkamlanmagan.

? Security Logging and Monitoring Failures toifasining o'ziga xosligi nimada?
- U eng ko'p ma'lumot o'g'irlaydi
+ U hujumga yo'l ochmaydi, lekin uni ko'rinmas qiladi — aniqlash va javob berish kechikadi
- U faqat Windows'da uchraydi
- U xavfli emas
! Jurnal va monitoring bo'lmasa, hujumchi tizimda uzoq vaqt sezilmay yuradi.

? SSRF zaifligida nima sodir bo'ladi?
- Foydalanuvchi brauzeri boshqa saytga so'rov yuboradi
+ Server hujumchi ko'rsatgan manzilga — jumladan ichki tarmoqdagi manzilga — o'zi so'rov yuboradi
- Parol sizib chiqadi
- Sayt sekinlashadi
! Server ichki tarmoqqa yeta oladi; uning nomidan so'rov yuborish tashqi himoyani ichkaridan aylanib o'tadi.

? Ilova ma'lum zaifligi bor eski kutubxonadan foydalanadi. Buning oldini olishning asosiy sharti nima?
- Kutubxona nomini yashirish
+ Qanday komponentlar ishlatilishini bilish va ularni zaiflik bazalari bilan muntazam solishtirib, yangilab turish
- Firewall o'rnatish
- Kodni katta harfda yozish
! Bilmagan narsani yangilab bo'lmaydi — komponentlar ro'yxati (SBOM) va muntazam tekshiruv kerak.

? Web xavfsizligining asosiy qoidalaridan qaysi biri to'g'ri?
- Brauzerdagi tekshiruv yetarli
+ Klientdan kelgan hech narsaga ishonmaslik — hammasi serverda tekshiriladi
- HTTPS barcha zaifliklarni yopadi
- Yashirin maydonlar xavfsiz
! Foydalanuvchi so'rovning har bir qismini o'zgartira oladi. Ishonchli tekshiruv faqat serverda.

? Web zaifliklarini qayerda mashq qilish to'g'ri?
- Istalgan saytda — faqat o'rganish uchun
+ Atayin zaif qilingan o'quv muhitlarida (PortSwigger Academy, Juice Shop) va o'z ilovalarimda
- Do'stimning saytida, unga aytmasdan
- Davlat saytlarida
! Ruxsatsiz “tekshirib ko'rish” — qonunbuzarlik. O'quv platformalari aynan shu maqsadda yaratilgan.

? OWASP Top 10 nashrdan nashrga o'zgaradi. Bundan qanday xulosa chiqadi?
- Uni o'rganishning foydasi yo'q
+ Raqamlarni emas, toifalar ortidagi g'oya va tamoyillarni o'rganish kerak
- Faqat eng eski nashrni bilish kifoya
- Har yili boshidan o'rganish kerak
! Tartib va nomlar o'zgaradi; “kirishga ishonma, ma'lumotni buyruqdan ajrat, har so'rovda tekshir” — o'zgarmaydi.
:::

:::cards
OWASP Top 10 nima? :: Veb-ilovalardagi eng jiddiy o'nta xavf toifasi ro'yxati; davriy yangilanadi.
Broken Access Control? :: Foydalanuvchi ruxsat etilmagan ma'lumot yoki funksiyaga kira oladi. Himoya — har so'rovda serverda tekshirish, default deny.
Injection oilasi va himoyasi? :: SQL injection, XSS, command injection — ma'lumot kodga aylanadi. Himoya — parametrlangan so'rovlar, chiqishda kodlash, kirishni tekshirish.
Cryptographic Failures? :: Sezgir ma'lumot ochiq uzatiladi yoki zaif himoyalangan: eskirgan algoritm, tez xesh, yomon kalit boshqaruvi.
Insecure Design? :: Xato kodda emas, loyihada: cheklanmagan urinishlar, zaif tiklash jarayoni, biznes mantig'i xatolari.
Security Misconfiguration? :: Standart parollar, keraksiz xizmatlar, ochiq kataloglar, batafsil xato xabarlari.
Vulnerable and Outdated Components? :: Ma'lum zaifligi bor kutubxonalar. Himoya — komponentlar ro'yxati va muntazam yangilash.
Authentication Failures? :: Zaif parollar, cheklanmagan urinishlar, MFA yo'qligi, noto'g'ri sessiya boshqaruvi.
Integrity Failures? :: Kod yoki ma'lumot yaxlitligi tekshirilmaydi: imzosiz yangilanish, ishonchsiz manba — ta'minot zanjiri.
Logging and Monitoring Failures? :: Hodisalar yozilmaydi yoki kuzatilmaydi — hujum sezilmay qoladi.
SSRF? :: Server hujumchi ko'rsatgan manzilga, jumladan ichki tarmoqqa, o'zi so'rov yuboradi. Himoya — ruxsat etilgan manzillar ro'yxati.
Web xavfsizligining uch qoidasi? :: Klientga ishonma; ma'lumotni buyruqdan ajrat; har so'rovda “bu foydalanuvchiga mumkinmi?” deb tekshir.
:::
