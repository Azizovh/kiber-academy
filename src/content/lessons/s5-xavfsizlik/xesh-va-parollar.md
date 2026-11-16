Yangiliklarda: "Sayt buzildi, 50 million foydalanuvchi ma'lumoti sizib chiqdi". Birinchi savol: parollar ham ketdimi? Javob sayt ularni **qanday saqlaganiga** bog'liq. To'g'ri saqlangan bo'lsa — hujumchi qo'lida deyarli foydasiz qiymatlar. Noto'g'ri saqlangan bo'lsa — millionlab odamning paroli ochiq, va ular o'sha parolni boshqa saytlarda ham ishlatgan.

Bu dars ikki savolga javob beradi: tizimlar parolni qanday saqlashi kerak va odamlar parolni qanday tanlashi kerak. Ikkalasining markazida bitta vosita turadi — **xesh**.

## Xesh funksiya

[[hash|Xesh funksiya]] istalgan hajmdagi ma'lumotni olib, **qat'iy uzunlikdagi** qiymat qaytaradi — "barmoq izi".

```
"salom"                    →  038f270ca678c66f5bf393f958e8eebc...  (SHA-256)
"Salom"                    →  butunlay boshqa 64 ta belgi
Urush va tinchlik (matni)  →  yana 64 ta belgi
4 gigabaytli film          →  yana 64 ta belgi
```

Yaxshi kriptografik xesh funksiyaning to'rt xususiyati:

| Xususiyat | Ma'nosi |
|---|---|
| **Aniqlik** | Bir xil kirish — doim bir xil natija |
| **Bir tomonlamalik** | Xeshdan asl ma'lumotni hisoblab bo'lmaydi |
| **Ko'chki effekti** | Kirishda bitta bit o'zgarsa — natija butunlay o'zgaradi |
| **To'qnashuvga chidamlilik** | Bir xil xesh beradigan ikki xil kirishni topish amalda mumkin emas |

Bir tomonlamalik — eng muhimi. Shifrlashni kalit bilan qaytarish mumkin; xeshni — **hech qanday kalit bilan** qaytarib bo'lmaydi. Go'shtdan qiyma qilish mumkin, qiymadan go'sht — yo'q.

### Algoritmlar

| Algoritm | Uzunligi | Holati |
|---|---|---|
| **MD5** | 128 bit (32 hex) | **Buzilgan** — to'qnashuvlar oson topiladi |
| **SHA-1** | 160 bit (40 hex) | **Eskirgan** — to'qnashuv amalda namoyish etilgan |
| **SHA-256** (SHA-2 oilasi) | 256 bit (64 hex) | Bugungi standart |
| **SHA-3** | Turli | Zamonaviy muqobil |

Xeshni uzunligiga qarab taxminan tanish mumkin: 32 ta hex belgi — MD5, 40 — SHA-1, 64 — SHA-256.

### Xesh qayerda ishlatiladi

Siz ularning hammasini allaqachon uchratgansiz:

| Qo'llanilishi | Qanday |
|---|---|
| **Fayl yaxlitligi** | Yuklab olingan fayl xeshini saytdagi bilan solishtirish; yaxlitlik monitoringi |
| **Raqamli imzo** | Hujjatning o'zi emas, xeshi imzolanadi |
| **Git** | Har bir commit — mazmunining xeshi |
| **Zararli dastur identifikatori** | Namuna xeshi bo'yicha bazalardan qidirish |
| **Parol saqlash** | Bu darsning asosiy mavzusi |

Xesh yaxlitlikni tekshiradi, lekin o'zi **kim yuborganini** isbotlamaydi: faylni almashtirgan hujumchi yonidagi xeshni ham almashtirishi mumkin. Shuning uchun xesh ishonchli kanaldan olinadi yoki imzolanadi. Kalit qo'shilgan xesh — **HMAC** — ham yaxlitlikni, ham jo'natuvchini tasdiqlaydi; API so'rovlarini imzolashda keng ishlatiladi.

## Parolni qanday saqlash kerak

Tizim foydalanuvchi parolini tekshira olishi kerak. Savol: bazada nima saqlanadi?

### 1-usul: ochiq matn — eng yomoni

| foydalanuvchi | parol |
|---|---|
| ali | Bahor2026! |
| vali | qwerty123 |

Baza sizib chiqsa — barcha parollar darhol oshkor. Bundan tashqari, ularni baza ma'muri ham, zaxira nusxaga yetgan har kim ham ko'radi. Agar sayt "parolni unutdingizmi?" ga javoban **eski parolingizni** yuborsa — u parolni ochiq yoki qaytariladigan shaklda saqlayapti. Bu jiddiy belgi.

### 2-usul: shifrlash — baribir noto'g'ri

Shifrlangan parolni kalit bilan ochish mumkin. Kalit esa shu serverda turadi — bazaga yetgan hujumchi odatda kalitga ham yetadi. Parolni tizimning o'zi ham **bilmasligi** kerak.

### 3-usul: oddiy xesh — yaxshiroq, lekin yetarli emas

| foydalanuvchi | parol_xeshi |
|---|---|
| ali | 5e884898da28047151d0e56f8dc62927… |
| vali | 5e884898da28047151d0e56f8dc62927… |

Tekshirish: foydalanuvchi parol kiritadi → tizim uni xeshlaydi → bazadagi xesh bilan solishtiradi. Parolning o'zi hech qayerda saqlanmaydi.

Lekin uchta muammo bor:

**Bir xil parol — bir xil xesh.** Jadvalga qarang: Ali va Valining xeshi bir xil — demak parollari ham. Eng ko'p takrorlangan xesh — eng keng tarqalgan parol.

**Tayyor jadvallar.** Xeshni "orqaga" hisoblab bo'lmaydi, lekin "oldinga" — bemalol: keng tarqalgan millionlab parollarning xeshini **oldindan** hisoblab, jadval tuzib qo'yish mumkin. Bunday jadvallar ([[rainbow-table|rainbow table]]) tayyor holda mavjud. Xesh jadvalda bo'lsa — parol bir lahzada ma'lum.

**Tezlik.** SHA-256 juda tez ishlash uchun yaratilgan — bu fayl tekshirishda afzallik, parol saqlashda esa **kamchilik**: zamonaviy videokarta soniyasiga milliardlab variantni sinab ko'ra oladi.

### 4-usul: salt + sekin xesh — to'g'ri yo'l

**Salt.** [[salt|Salt]] — har bir foydalanuvchi uchun alohida yaratiladigan tasodifiy qiymat. U parolga qo'shiladi va birga xeshlanadi:

```
xesh = H( salt + parol )
```

| foydalanuvchi | salt | parol_xeshi |
|---|---|---|
| ali | 8f3a1c… | 2b7e9d… |
| vali | c41d07… | 91ffa3… |

Salt sir emas — u xesh yonida ochiq saqlanadi. Uning vazifasi boshqa:

- Bir xil parollar endi **har xil xesh** beradi.
- Oldindan tuzilgan jadvallar **foydasiz**: har bir salt uchun alohida jadval kerak bo'lardi.
- Hujumchi har bir foydalanuvchini **alohida** terishga majbur.

**Sekin funksiya.** Parol uchun maxsus, **ataylab sekin** ishlaydigan algoritmlar bor:

| Algoritm | Izoh |
|---|---|
| **Argon2id** | Zamonaviy tavsiya; xotirani ham ko'p talab qiladi |
| **bcrypt** | Sinalgan, keng tarqalgan |
| **scrypt** | Xotira talab qiluvchi |
| **PBKDF2** | Eski standart; hali ham qabul qilinadi |

Ular hisoblashni minglab marta takrorlaydi. Bitta kirish uchun 0,1 soniya — foydalanuvchi sezmaydi. Lekin milliardlab variantni sinamoqchi bo'lgan kishi uchun bu yillarga aylanadi. Sekinlik darajasi sozlanadi va kompyuterlar tezlashgani sari oshiriladi.

:::key
Parol saqlashning to'g'ri usuli: **har foydalanuvchiga alohida salt + sekin algoritm (Argon2id, bcrypt)**. Bu algoritmlar salt'ni o'zi yaratadi va natija ichida saqlaydi. Dasturchining vazifasi — ularni **tayyor kutubxona** orqali ishlatish; "SHA-256 ga salt qo'shib qo'ydim" — hali ham noto'g'ri, chunki tez.
:::

Linux'dagi `/etc/shadow` ni eslang:

```
talaba:$y$j9T$Kx8...$uzun_xesh...:19800:0:99999:7:::
        │  │    │
        │  │    └─ salt
        │  └────── sozlamalar (sekinlik darajasi)
        └───────── algoritm: $y$ = yescrypt, $6$ = SHA-512 (ko'p takrorli), $2b$ = bcrypt
```

Endi bu qatorni to'liq o'qiy olasiz.

## Nega zaif parol baribir yengiladi

Eng yaxshi saqlash usuli ham zaif parolni qutqarmaydi. Sababi oddiy: xeshni qaytarib bo'lmaydi, lekin **taxmin qilib tekshirish** mumkin. Baza sizib chiqqach, hujumchi o'z kompyuterida, shoshilmasdan, taxminlarni xeshlab, solishtiradi — va eng ehtimolli parollardan boshlaydi.

Odamlar esa bashorat qilinadigan parollar tanlaydi:

| Odat | Misol |
|---|---|
| Lug'atdagi so'z | `password`, `toshkent`, `parol` |
| Klaviatura ketma-ketligi | `qwerty`, `123456`, `1q2w3e` |
| Ism + yil | `Dilshod1995`, `Madina2003` |
| "Murakkablashtirilgan" so'z | `P@ssw0rd`, `Parol123!` |
| Fasl + yil | `Bahor2026!` |

Oxirgi ikki qatorga e'tibor bering. `P@ssw0rd` qoidalarga to'liq mos keladi: katta harf, raqam, belgi. Lekin bu almashtirishlar (`a` → `@`, `o` → `0`) hammaga ma'lum va birinchilardan sinab ko'riladi. **Murakkab ko'rinish — kuch emas.**

Parol kuchini ikki narsa belgilaydi:

1. **Uzunlik.** Har bir qo'shimcha belgi variantlar sonini ko'p baravar oshiradi. 8 belgili parol va 16 belgili parol orasidagi farq — ikki baravar emas, trillionlab baravar.
2. **Bashorat qilib bo'lmaslik.** Uzun, lekin mashhur ibora (`salomdunyo123`) — zaif.

## Yaxshi parol amaliyoti

Zamonaviy tavsiyalar (masalan, AQSH standartlar instituti NIST ko'rsatmalari) ko'pchilik o'rgangan eski qoidalardan farq qiladi:

| Eski qoida | Zamonaviy yondashuv |
|---|---|
| "Kamida 8 belgi, katta harf, raqam, belgi" | **Uzunlik** muhimroq: 12–16+ belgi. Majburiy belgi turlari — kam foyda |
| "Har 90 kunda almashtiring" | Majburiy davriy almashtirish **tavsiya etilmaydi** — odamlar `Parol1` → `Parol2` qiladi. Faqat sizish gumoni bo'lsa almashtiriladi |
| "Yodlab oling, hech qayerga yozmang" | **Parol menejeri** ishlating |
| Maxfiy savol ("onangizning qizlik familiyasi") | Zaif — javobni topish oson |
| — | Yangi parolni **sizib chiqqan parollar ro'yxati** bilan solishtirish |

### Parol menejeri

Insonning xotirasi yuzlab noyob, uzun, tasodifiy parolni eslab qola olmaydi. Shuning uchun odamlar bitta parolni hamma joyda ishlatadi — va credential stuffing hujumi ishlaydi (o'tgan dars).

[[password-manager|Parol menejeri]] bu muammoni hal qiladi:

- har bir sayt uchun **alohida, tasodifiy, uzun** parol yaratadi;
- ularni **shifrlangan** holda saqlaydi;
- siz faqat **bitta** bosh parolni eslaysiz;
- manzilni tekshiradi — soxta saytda parolni to'ldirmaydi (phishing darsidan).

"Hamma tuxum bitta savatda" degan e'tiroz o'rinli, lekin amalda muqobili — bitta parol hamma joyda yoki daftardagi ro'yxat — ancha xavfliroq. Bosh parol uzun bo'lishi va menejerning o'zi MFA bilan himoyalanishi kerak.

### Esda qoladigan kuchli parol

Bosh parol kabi bir necha parolni baribir yodlash kerak. Usul — **parol ibora** (passphrase): bir necha tasodifiy, bir-biriga bog'liq bo'lmagan so'z.

```
tuya-qalam-shimol-olcha-kitob
```

Uzun (28 belgi), eslab qolish oson, terish qulay — va `Tr0ub4dor&3` kabi "murakkab" paroldan ancha kuchli. So'zlar **tasodifiy** tanlanishi shart: sevimli she'r satri yoki mashhur ibora — yaramaydi.

### MFA — parol yetarli emasligini tan olish

Parol qanchalik kuchli bo'lmasin, uni aldab olish, ushlab qolish yoki sizib chiqarish mumkin. Shuning uchun muhim hisoblarda [[mfa|ko'p omilli autentifikatsiya]] — ikkinchi, mustaqil tasdiq. Keyingi darslardan birida batafsil.

:::key
Shaxsiy xavfsizlikning uchta eng samarali qadami: **parol menejeri** (har joyda alohida parol), **MFA** (hamma muhim hisobda), va **asosiy pochtani** ayniqsa qattiq himoyalash — chunki boshqa hamma hisob paroli u orqali tiklanadi.
:::

## Tizim tomonidagi himoya

Parolni to'g'ri saqlash — bitta qatlam. Yaxshi tizim yana quyidagilarni qiladi:

| Chora | Nimadan himoya qiladi |
|---|---|
| **Urinishlarni cheklash** (rate limiting), vaqtincha bloklash | Onlayn parol terishdan |
| **Sizib chiqqan parollarni rad etish** | Hammaga ma'lum parollardan |
| **MFA** | O'g'irlangan paroldan |
| **Bir xil xato xabari** ("login yoki parol noto'g'ri") | Qaysi loginlar mavjudligini aniqlashdan |
| **Xavfsiz tiklash**: bir martalik, qisqa muddatli havola | Tiklash jarayoni orqali egallab olishdan |
| **Kirishlarni jurnalga yozish va g'ayrioddiy kirishni aniqlash** | Sezilmay qolishdan |
| **Standart parollarni majburiy almashtirish** | `admin/admin` dan |

Oxirgi qator alohida ahamiyatga ega: router, kamera, printer va ko'p dasturlar zavoddan bir xil parol bilan chiqadi, va bu parollar ochiq ro'yxatlarda turadi. O'zgartirilmagan standart parol — eng ko'p uchraydigan topilmalardan biri.

Xato xabari haqida: "Bunday foydalanuvchi yo'q" va "Parol noto'g'ri" degan ikki xil javob hujumchiga qaysi loginlar mavjudligini aytib beradi. To'g'ri javob — ikkalasi uchun bir xil.

## Auditda nimaga qaraladi

O'z tizimingiz yoki ruxsat berilgan tizimni tekshirganda:

- Parollar qanday saqlanadi? Algoritm qaysi? (`$2b$`, `$argon2id$` — yaxshi; 32 belgili hex — MD5, yomon.)
- Bir xil xeshlar bormi? (Demak salt yo'q.)
- Parol siyosati qanday: minimal uzunlik, keng tarqalgan parollar rad etiladimi?
- Urinishlar cheklanganmi?
- MFA bormi — ayniqsa administratorlar va masofaviy kirish uchun?
- Standart hisoblar va parollar qolmaganmi?
- Kodda, skriptlarda, sozlama fayllarida va Git tarixida parollar yo'qmi?

Bu savollar — keyingi bosqichlarda ishlatadigan tekshiruv ro'yxatining boshi.

:::try
**1. Xeshni his qiling.** Python'da:

```python
import hashlib
for soz in ["parol", "Parol", "parol1"]:
    print(soz, hashlib.sha256(soz.encode()).hexdigest())
```

Bitta harf o'zgarganda natija qanchalik o'zgardi? Bu — ko'chki effekti.

**2. Salt nima qiladi.**

```python
import hashlib, os
parol = b"qwerty123"
for _ in range(2):
    salt = os.urandom(8)
    print(salt.hex(), hashlib.sha256(salt + parol).hexdigest())
```

Bir xil parol — ikki xil xesh. (Eslatma: bu faqat salt g'oyasini ko'rsatish uchun; haqiqiy tizimda SHA-256 emas, bcrypt yoki Argon2 kutubxonasi ishlatiladi.)

**3. O'z parollaringiz.** `haveibeenpwned.com/Passwords` sahifasi parol sizib chiqqan ro'yxatlarda uchraganini tekshiradi (parol saytga yuborilmaydi — faqat xeshining boshi). Eski parollaringizdan birini sinab ko'ring.

**4. Amaliy qadam.** Parol menejeri o'rnating (Bitwarden — bepul va ochiq kodli; KeePassXC — oflayn). Eng muhim 5 ta hisobingiz parolini menejer yaratgan tasodifiy parolga almashtiring va ularda MFA yoqing.
:::

## Xulosa

- **Xesh**: qat'iy uzunlik, bir tomonlama, bitta bit o'zgarsa — butunlay boshqa natija.
- **MD5 va SHA-1** — eskirgan; **SHA-256** — standart (fayl va imzo uchun).
- Parolni **ochiq** yoki **shifrlab** saqlash — noto'g'ri; **oddiy xesh** — yetarli emas.
- To'g'risi: **har foydalanuvchiga alohida salt + sekin algoritm** (Argon2id, bcrypt).
- **Salt** bir xil parollarni farqli qiladi va tayyor jadvallarni foydasiz qiladi.
- Zaif parolni hech qanday saqlash usuli qutqarmaydi: kuch — **uzunlik va bashorat qilib bo'lmaslik**.
- Zamonaviy amaliyot: uzun parol yoki parol ibora, **parol menejeri**, **MFA**; majburiy davriy almashtirish — yo'q.
- Tizim: urinishlarni cheklash, bir xil xato xabari, standart parollarni almashtirish.

:::quiz
? Xesh funksiyaning shifrlashdan asosiy farqi nima?
- Xesh sekinroq
+ Xesh bir tomonlama — uni hech qanday kalit bilan qaytarib bo'lmaydi
- Xesh faqat matn uchun
- Farqi yo'q
! Shifrlangan ma'lumot kalit bilan ochiladi. Xeshdan asl ma'lumotni hisoblab chiqarish mumkin emas.

? Sayt “parolni unutdingizmi?” so'roviga javoban eski parolingizni pochtaga yubordi. Bu nimani anglatadi?
- Sayt juda qulay
+ Sayt parolni ochiq yoki qaytariladigan shaklda saqlaydi — bu jiddiy xavfsizlik muammosi
- Sayt xeshni qaytara oladi
- Hech narsani
! To'g'ri saqlangan (xeshlangan) parolni tizimning o'zi ham bilmaydi. U faqat yangi parol o'rnatishni taklif qila oladi.

? Salt nima uchun kerak?
- Parolni shifrlash uchun
+ Bir xil parollar har xil xesh berishi va oldindan tuzilgan jadvallar foydasiz bo'lishi uchun
- Parolni qisqartirish uchun
- Xeshni tezlashtirish uchun
! Har foydalanuvchiga alohida tasodifiy salt qo'shiladi. U sir emas — xesh yonida saqlanadi.

? Nega parol saqlash uchun SHA-256 emas, bcrypt yoki Argon2 tavsiya etiladi?
- SHA-256 buzilgan
+ SHA-256 juda tez — hujumchi soniyasiga juda ko'p taxminni sinay oladi; parol algoritmlari ataylab sekin
- bcrypt qisqaroq natija beradi
- SHA-256 faqat fayllar uchun ishlaydi
! Tezlik fayl tekshirishda afzallik, parol saqlashda — kamchilik. Sekin funksiya taxmin qilishni juda qimmat qiladi.

? Bazada ikki foydalanuvchining parol xeshi aynan bir xil. Bu nimani bildiradi?
- Tasodif
+ Ularning parollari bir xil va salt ishlatilmagan
- Baza buzilgan
- Ular bitta odam
! Salt bo'lsa, bir xil parollar ham har xil xesh berardi. Bir xil xeshlar — salt yo'qligining belgisi.

? Qaysi parol eng kuchli?
- P@ssw0rd!
- Dilshod1995
+ tuya-qalam-shimol-olcha-kitob
- Qwerty123
! Kuchni uzunlik va bashorat qilib bo'lmaslik belgilaydi. Bir necha tasodifiy so'zdan iborat ibora “murakkab ko'rinadigan” qisqa paroldan ancha kuchli.

? `P@ssw0rd` nega zaif parol hisoblanadi?
- U juda uzun
+ Keng tarqalgan so'z va hammaga ma'lum almashtirishlar birinchilardan sinab ko'riladi
- Unda raqam yo'q
- U faqat lotin harflaridan iborat
! Belgi turlari qoidasiga mos kelish — kuch degani emas. Bashorat qilinadigan naqshlar tez topiladi.

? Zamonaviy tavsiyalarga ko'ra parolni har 90 kunda majburiy almashtirish haqida nima deyiladi?
- Bu eng muhim qoida
+ Tavsiya etilmaydi — odamlar bashorat qilinadigan o'zgartirishlar qiladi; parol faqat sizish gumoni bo'lganda almashtiriladi
- Har hafta almashtirish kerak
- Bu qonun talabi
! Majburiy almashtirish Parol1 → Parol2 kabi naqshlarga olib keladi. Uzun noyob parol va MFA — samaraliroq.

? Parol menejeri qanday muammoni hal qiladi?
- Internetni tezlashtiradi
+ Har bir sayt uchun alohida, uzun, tasodifiy parol ishlatish imkonini beradi
- Parollarni butunlay keraksiz qiladi
- Antivirus o'rnini bosadi
! Inson yuzlab noyob parolni eslay olmaydi. Menejer ularni yaratadi va shifrlangan holda saqlaydi.

? Kirish sahifasi “Bunday foydalanuvchi mavjud emas” va “Parol noto'g'ri” degan ikki xil xabar beradi. Bu nega muammo?
- Foydalanuvchini chalg'itadi
+ U qaysi loginlar mavjudligini oshkor qiladi
- Sahifa sekinlashadi
- Muammo emas
! Ikki xil javob orqali mavjud hisoblar ro'yxatini aniqlash mumkin. To'g'risi — ikkala holatda bir xil xabar.

? 32 ta hex belgidan iborat parol xeshi ko'rdingiz. Bu katta ehtimol bilan qaysi algoritm?
+ MD5
- SHA-256
- bcrypt
- Argon2
! MD5 — 128 bit, ya'ni 32 hex belgi. SHA-256 — 64 belgi. bcrypt va Argon2 xeshlari `$2b$`, `$argon2id$` kabi belgi bilan boshlanadi.

? Xeshning “ko'chki effekti” nimani anglatadi?
- Katta fayllar sekin xeshlanadi
+ Kirishdagi kichik o'zgarish natijani butunlay o'zgartiradi
- Xesh vaqt o'tishi bilan o'zgaradi
- Xesh uzunligi kirishga bog'liq
! Bitta bit o'zgarsa, natijaning taxminan yarim bitlari o'zgaradi — o'xshash kirishlar o'xshash xesh bermaydi.
:::

:::cards
Xesh funksiyaning asosiy xususiyatlari? :: Qat'iy uzunlik, bir tomonlamalik, ko'chki effekti (kichik o'zgarish — butunlay boshqa natija), to'qnashuvga chidamlilik.
Qaysi xesh algoritmlari eskirgan? :: MD5 va SHA-1. Fayl va imzo uchun standart — SHA-256.
Parol qanday saqlanishi kerak? :: Har foydalanuvchiga alohida salt bilan, ataylab sekin algoritmda (Argon2id, bcrypt) xeshlab.
Salt nima va nima uchun? :: Parolga qo'shiladigan tasodifiy qiymat; bir xil parollarni farqli qiladi va tayyor jadvallarni foydasiz qiladi.
Nega parol uchun tez xesh (SHA-256) yaramaydi? :: Tezlik hujumchiga soniyasiga juda ko'p taxminni sinash imkonini beradi.
Rainbow table nima? :: Ko'p parollar uchun oldindan hisoblangan xeshlar jadvali. Salt uni foydasiz qiladi.
Parol kuchini nima belgilaydi? :: Uzunlik va bashorat qilib bo'lmaslik — belgi turlari emas.
Parol ibora (passphrase)? :: Bir necha tasodifiy, bog'liq bo'lmagan so'z: uzun, eslab qolish oson, kuchli.
Parol menejeri nima beradi? :: Har sayt uchun alohida tasodifiy parol, shifrlangan saqlash, soxta saytda to'ldirmaslik.
Xeshni uzunligidan tanish? :: 32 hex — MD5; 40 — SHA-1; 64 — SHA-256; $2b$ — bcrypt; $argon2id$ — Argon2.
Shaxsiy xavfsizlikning uch asosiy qadami? :: Parol menejeri, MFA va asosiy pochtani alohida qattiq himoyalash.
:::
