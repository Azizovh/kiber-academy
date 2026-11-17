Ichki pentestlarda tez-tez takrorlanadigan manzara: tester kompaniya hisoblari ro'yxatini oladi (oldingi darslardagi enumeratsiya), so'ng **bitta** parolni — fasl nomi va yil, masalan "Qish2026!" — barcha hisoblarda bir martadan sinaydi. Hech bir hisob bloklanmaydi: har biriga faqat bitta urinish. Natija: 400 xodimdan 7 tasi shu parolni ishlatgan. Ulardan biri — IT bo'limida.

Hech qanday zaiflik ishlatilmadi. Faqat odamlarning parol tanlash odati va bloklash siyosatining zaif joyi.

Parollar — kurs davomida doim qaytib keladigan mavzu: s5 bosqichida xeshlash va tuz, a2 bosqichida bcrypt va Argon2, b1 bosqichida brute force va 4625 hodisalari. Bu dars — ularni tester ko'zi bilan birlashtirish: parol hujumlari turlari, xesh turlarini aniqlash, nega ba'zi xeshlar soatlarda, boshqalari esa hech qachon "ochilmaydi", pentestda parol siyosatini qanday xavfsiz tekshirish va himoyachi nima qilishi kerak. Amaliy parol buzish mashqlari — TryHackMe'dagi o'quv xonalarida, faqat o'quv xeshlari bilan.

## Hujum turlari

| Tur | Qanday | Qayerda | Asosiy to'siq |
|---|---|---|---|
| **[[brute-force|Brute force]]** | Barcha kombinatsiyalarni ketma-ket | Onlayn yoki oflayn | Uzunlik; onlayn — bloklash |
| **[[dictionary-attack|Lug'at hujumi]]** | Mashhur parollar va sizib chiqqan parollar ro'yxati | Onlayn yoki oflayn | Noyob, uzun parol |
| **Qoidalar (rules)** | Lug'at so'zlariga o'zgartirishlar: bosh harf, oxiriga yil va belgi, harf → raqam | Asosan oflayn | Odatiy "murakkablik" naqshlaridan qochish |
| **[[password-spraying|Password spraying]]** | Bitta parol — ko'p hisoblarga | Onlayn | MFA, sizib chiqqan va zaif parollar taqiqi, aniqlash |
| **[[credential-stuffing|Credential stuffing]]** | Boshqa saytdan sizib chiqqan login-parol juftliklari | Onlayn | Parolni qayta ishlatmaslik, MFA, sizib chiqqan parollar tekshiruvi |

**Onlayn va oflayn** farqi — eng muhim tushuncha:

| | Onlayn | Oflayn |
|---|---|---|
| Nima hujum qilinadi | Login forma, SSH, RDP, VPN — jonli xizmat | Qo'lga tushgan **xesh** |
| Tezlik | Sekin — tarmoq va xizmat cheklaydi | Juda tez — faqat hisoblash quvvati cheklaydi |
| Himoyachi ko'radimi | Ha — har urinish jurnalda | Yo'q — hammasi hujumchi kompyuterida |
| To'siqlar | Bloklash, rate limiting, MFA, CAPTCHA | Faqat xesh algoritmining sekinligi va parolning kuchi |

Oflayn hujumda bloklash ham, MFA ham, monitoring ham ishlamaydi. Xesh qo'lga tushdimi — qolgan himoya faqat **algoritm va parol uzunligi**.

## Xesh turlarini aniqlash

Xesh qo'lga tushganda (baza sizib chiqishi, konfiguratsiya fayli, tizim fayli) birinchi savol — qanday algoritm? Ko'p formatlar o'z prefiksiga ega:

| Ko'rinishi | Algoritm | Tez yoki sekin |
|---|---|---|
| 32 ta hex belgi | MD5 yoki NTLM (kontekst hal qiladi) | **Juda tez** |
| 40 ta hex belgi | SHA-1 | Juda tez |
| 64 ta hex belgi | SHA-256 | Tez |
| `$1$...` | md5crypt (eski Unix) | O'rtacha |
| `$6$...` | sha512crypt (Unix) | Sekin (ko'p raund) |
| `$y$...` | yescrypt (zamonaviy Debian/Ubuntu `/etc/shadow`) | Sekin, xotiraga og'ir |
| `$2a$`, `$2b$`, `$2y$` | bcrypt | Sekin, sozlanadigan |
| `$argon2id$...` | Argon2id | Sekin, xotiraga og'ir — eng zamonaviy |

Kontekst ham muhim: Windows hisob ma'lumotlari — NTLM; Linux `/etc/shadow` — yescrypt yoki sha512crypt; veb ilova bazasi — nima bo'lishi mumkin, eski loyihalarda hatto tuzsiz MD5 ham.

## Nega ba'zi xeshlar tez "ochiladi"

s5 bosqichidan: xesh bir tomonlama — uni "teskari hisoblab" bo'lmaydi. Oflayn hujum — **taxmin qilish**: nomzod parolni xeshlab, natijani solishtirish. Demak, hujum tezligi = bitta xeshni hisoblash tezligi.

| Algoritm turi | Bitta GPU'da taxminiy tartib | Natija |
|---|---|---|
| Tez xeshlar (MD5, NTLM, SHA-1) | Soniyasiga milliardlab urinish | Qisqa va lug'atdagi parollar — daqiqalarda |
| Sekin xeshlar (bcrypt, yescrypt, Argon2) | Soniyasiga ming–o'n minglab | Kuchli parol — amalda ochilmaydi |

(Aniq raqamlar uskuna va sozlamalarga bog'liq — muhimi, farq millionlab marta.)

Shuning uchun a2 bosqichidagi qoida: parollar uchun **faqat** sekin, tuzli algoritmlar — Argon2id yoki bcrypt. MD5 va SHA-256 parol uchun emas — ular tezlik uchun yaratilgan, va aynan tezlik bu yerda dushman.

**[[salt|Tuz]]** (salt) ikkinchi himoya: har bir parolga noyob tasodifiy qo'shimcha. Tuzsiz bir xil parollar bir xil xeshga ega — bitta hisoblash hammasini ochadi va oldindan hisoblangan jadvallar ishlaydi. Tuz bilan har bir xesh alohida hujum talab qiladi.

**Qoidalar** nega xavfli: "Murakkab parol: kamida bitta bosh harf, raqam va belgi" siyosati odamlarni bashorat qilinadigan naqshga undaydi — `Qish2026!`, `Parol123!`. Qoidalar aynan shu naqshlarni minglab so'zlarga avtomatik qo'llaydi. Uzun parol iborasi (masalan, to'rt-besh tasodifiy so'z) — ham eslash oson, ham taxmin qilish ancha qiyin.

## Pentestda parol siyosatini tekshirish

Parol hujumlari — pentestning eng ko'p xizmatni buzishi mumkin bo'lgan qismlaridan biri: noto'g'ri bajarilsa, yuzlab xodimlar hisoblari bloklanadi va ish to'xtaydi. Shuning uchun:

| Qadam | Nima |
|---|---|
| RoE | Parol hujumlari ruxsat etilganmi? Qaysi xizmatlarda? Urinishlar chegarasi qancha? (qamrov darsidagi "soatiga 5 tadan ko'p emas") |
| Bloklash siyosatini bilish | Nechta xato urinishdan keyin hisob bloklanadi va qancha vaqtga? Grey box'da — mijozdan so'raladi |
| Chegaradan past qolish | Masalan, bloklash 5 urinishda bo'lsa — kuzatuv oynasi ichida hisobga 1–2 urinishdan ko'p emas |
| Test hisoblari | Iloji bo'lsa, avval test hisoblarida bloklash xatti-harakatini tekshirish |
| Faoliyat jurnali | Har bir urinish seriyasi vaqti — SOC solishtirishi uchun |
| Muvaffaqiyatli login | Darhol hujjatlashtirish; RoE doirasida minimal isbot; foydalanuvchi ma'lumotlarini o'qimaslik |

Oflayn buzish — faqat **loyiha davomida qonuniy olingan** xeshlar bilan (masalan, ichki pentestda RoE ruxsat bergan holda olingan hisob ma'lumotlari), mijoz ma'lumoti sifatida shifrlangan muhitda, va natija — hisobotda **statistika** sifatida: "1200 xeshdan 310 tasi 4 soat ichida lug'at va standart qoidalar bilan topildi; ulardan 45 tasi — fasl va yil naqshi". Parollarning o'zi hisobotda yozilmaydi.

Vositalar haqida: onlayn sinov uchun **Hydra** kabi vositalar, oflayn uchun **Hashcat** va **John the Ripper** sohada standart. Ularni sozlash va ishlatish TryHackMe'dagi "John the Ripper" va "Hydra" kabi xonalarda o'quv xeshlari va o'quv nishonlarida mashq qilinadi.

:::warn
Begona hisobga — hatto o'zingizniki deb o'ylagan, lekin boshqa tashkilot tizimidagi hisobga — parol taxmin qilish, boshqa odamning xeshini buzish yoki sizib chiqqan bazalardan parol olish — qonunbuzarlik. O'z laboratoriyangizda o'zingiz yaratgan hisoblar va xeshlar bilan, yoki o'quv platformalarida mashq qiling.
:::

## Aniqlash: himoyachi nima ko'radi

b1 bosqichidagi Windows hodisalari va loglari bu yerda to'liq ishlaydi:

| Hujum | Jurnal naqshi |
|---|---|
| Brute force (bitta hisob) | Bitta hisobga qisqa vaqtda ko'p muvaffaqiyatsiz kirish (Windows 4625, Linux `auth.log` "Failed password") |
| **Password spraying** | **Ko'p hisoblarga**, har biriga 1–2 urinish, ko'pincha bitta manbadan yoki bir xil vaqt oralig'ida; Kerberos'da 4771 hodisalari |
| Credential stuffing | Ko'p turli hisoblar, ko'p turli IP'lar (botnet), ba'zilari muvaffaqiyatli |
| Muvaffaqiyatli taxmin | Ketma-ket muvaffaqiyatsizliklardan keyin muvaffaqiyatli kirish (4624) — eng muhim signal |

Spraying'ni bitta hisob bo'yicha chegara bilan ushlab bo'lmaydi — u **ko'p hisoblar bo'yicha agregatsiya** talab qiladi: "bitta manbadan 10 daqiqada 50 ta turli hisobga muvaffaqiyatsiz kirish". Bu b2 bosqichidagi detection engineering misoli.

## Himoya

| Chora | Nimadan himoya qiladi |
|---|---|
| **MFA** (fishingga chidamli — c4 zero trust) | Onlayn hujumlarning ko'pchiligi, stuffing, spraying |
| Bloklash va rate limiting | Onlayn brute force (lekin spraying'ga qarshi yetarli emas) |
| **Sizib chiqqan va zaif parollar taqiqi** | Lug'at, spraying, stuffing — parol o'rnatilayotganda ma'lum ro'yxatlar bilan tekshirish |
| Uzunlikka urg'u, majburiy "murakkablik" naqshlari emas | Qoidalar bilan topiladigan bashorat qilinadigan parollar |
| Sekin, tuzli xeshlash (Argon2id, bcrypt) | Oflayn buzish |
| Parol menejeri | Har bir xizmatga noyob, uzun parol — stuffing ishlamaydi |
| Xizmat hisoblari uchun uzun tasodifiy parollar yoki boshqariladigan hisoblar | Oflayn hujumlar (p3 bosqichidagi Kerberos hujumlari) |
| Spraying va stuffing uchun aniqlash qoidalari | Hujumni erta ko'rish |

NIST'ning raqamli identifikatsiya bo'yicha tavsiyalari (SP 800-63B) shu yo'nalishda: uzunlik, sizib chiqqan parollar ro'yxatiga qarshi tekshirish, majburiy murakkablik qoidalari va sababsiz davriy almashtirish o'rniga — MFA va ehtiyot choralari.

## Parol hujumlari mavzusi nimani anglatmaydi

- Parol buzish pentestning maqsadi emas — maqsad parol siyosati va xeshlash zaifligini ko'rsatish va tuzatish.
- Kuchli parol yolg'iz yetmaydi: fishing parolni to'g'ridan-to'g'ri so'rab oladi — MFA va o'qitish kerak (b1).
- MFA ham mutlaq emas: push charchatish va real vaqt fishing proksilari bor (c4) — shuning uchun fishingga chidamli usullar.

:::try
1. O'z Linux VM'ingizda `/etc/shadow` dagi o'z hisobingiz qatorini (faqat o'zingizniki!) `sudo` bilan ko'ring. Xesh qaysi prefiks bilan boshlanadi va bu qaysi algoritm?
2. Quyidagilarni tez yoki sekin xeshga ajrating: MD5, bcrypt, NTLM, Argon2id, SHA-256, yescrypt.
3. "Qish2026!", "Parol123!", "Toshkent2025" va "olma-velosiped-daryo-kitob" parollarini solishtiring: qaysi biri lug'at va qoidalar bilan tez topiladi va nega?
4. b2 bosqichidagi Sigma uslubida password spraying uchun aniqlash qoidasining mantiqini yozing (qaysi hodisa, nima bo'yicha guruhlash, qanday chegara).
5. TryHackMe'dagi "John the Ripper" xonasini o'ting — o'quv xeshlari bilan.
6. Savol: pentest davomida mijozning eski veb ilovasi bazasida tuzsiz MD5 parol xeshlari topildi. Hisobotda nima yozasiz va qanday tavsiya berasiz?

**Javoblar:**
1. Zamonaviy Debian va Ubuntu'da odatda `$y$` (yescrypt), eskiroq tizimlarda `$6$` (sha512crypt).
2. Tez: MD5, NTLM, SHA-256. Sekin: bcrypt, Argon2id, yescrypt.
3. Dastlabki uchtasi — so'z + yil + belgi naqshi; qoidalar ularni darhol topadi. To'rt tasodifiy so'zdan iborat ibora uzunroq va naqshsiz — taxmin qilish ancha qiyin (lekin so'zlar haqiqatan tasodifiy tanlangan bo'lishi kerak).
4. Masalan: Windows 4625 (yoki 4771) hodisalari; manba IP bo'yicha guruhlash; 10–15 daqiqalik oynada **turli** hisoblar soni chegaradan oshsa (masalan, 20 dan ortiq) — ogohlantirish; keyingi muvaffaqiyatli 4624 bilan korrelyatsiya — yuqori ustuvorlik.
5. Xona xesh turlarini aniqlash va lug'at hujumlarini o'quv fayllarida ko'rsatadi.
6. Topilma: "Parollar tuzsiz MD5 bilan saqlanadi" — yuqori yoki kritik (baza sizib chiqsa, parollarning katta qismi tez topiladi va boshqa xizmatlarda qayta ishlatilishi mumkin). Dalil — jadval va ustun nomi, xesh formati, yozuvlar soni (xeshlarning o'zisiz). Tavsiya: Argon2id yoki bcrypt'ga o'tish (foydalanuvchi keyingi kirishida qayta xeshlash), barcha foydalanuvchilarga parolni almashtirish taklifi, MFA, sizib chiqqan parollar tekshiruvi.
:::

## Xulosa

- Turlar: brute force, lug'at, qoidalar, password spraying, credential stuffing.
- Onlayn hujum jurnalda ko'rinadi va bloklash, MFA bilan cheklanadi; oflayn hujumda faqat algoritm va parol kuchi qoladi.
- Xesh turi prefiks va uzunlik bilan aniqlanadi: hex — tez xeshlar; `$2b$`, `$y$`, `$argon2id$` — sekin.
- Tez xeshlar soniyasiga milliardlab, sekin xeshlar minglab urinishga imkon beradi — parollar uchun faqat Argon2id yoki bcrypt, tuz bilan.
- "Murakkablik" naqshlari qoidalar bilan topiladi; uzunlik va noyoblik muhimroq.
- Pentestda: RoE, bloklash chegarasidan past, faoliyat jurnali, natija — statistika, parollarning o'zi emas.
- Spraying ko'p hisoblar bo'yicha agregatsiya bilan aniqlanadi; muvaffaqiyatsizliklardan keyingi muvaffaqiyat — eng muhim signal.
- Himoya: MFA, sizib chiqqan parollar taqiqi, uzunlik, sekin xeshlash, parol menejeri, aniqlash qoidalari.

:::quiz
? Onlayn va oflayn parol hujumlarining asosiy farqi nima?
+ Onlayn — jonli xizmatga urinish, jurnalda ko'rinadi va bloklanadi; oflayn — qo'lga tushgan xeshni hujumchi kompyuterida taxmin qilish, himoyachi ko'rmaydi
- Oflayn faqat internetsiz ishlaydi
- Onlayn hujum har doim tezroq
- Farqi yo'q
! Oflayn hujumda bloklash, MFA va monitoring ishlamaydi.

? Password spraying nima?
- Bitta hisobga ko'p parollar
+ Bitta keng tarqalgan parolni ko'p hisoblarga, har biriga kam urinish bilan sinash
- Sizib chiqqan login-parol juftliklarini sinash
- Xeshni oflayn buzish
! Har bir hisobga kam urinish bloklash chegarasidan pastda qoladi.

? Nega bitta hisob bo'yicha chegara qoidasi spraying'ni ushlamaydi?
+ Har bir hisobga faqat 1–2 urinish bo'ladi; aniqlash uchun ko'p hisoblar bo'yicha agregatsiya kerak
- Spraying jurnalga yozilmaydi
- Spraying faqat Linux'da
- Chegara qoidalari umuman ishlamaydi
! Masalan, bitta manbadan qisqa vaqtda ko'p turli hisoblarga muvaffaqiyatsiz kirish.

? `$2b$` bilan boshlanadigan xesh qaysi algoritm?
- MD5
- NTLM
+ bcrypt
- SHA-1
! bcrypt — sekin, sozlanadigan, tuzli parol xeshlash algoritmi.

? Nega MD5 va NTLM parollar uchun yaroqsiz?
+ Ular juda tez — oflayn hujumda soniyasiga milliardlab taxmin qilish mumkin
- Ular juda sekin
- Ular shifrlash algoritmi
- Ular uzun xesh beradi
! Parollar uchun tezlik — dushman; Argon2id yoki bcrypt kerak.

? Tuz (salt) nimadan himoya qiladi?
- Onlayn brute force'dan
+ Bir xil parollarning bir xil xeshga ega bo'lishidan va oldindan hisoblangan jadvallardan — har bir xesh alohida hujum talab qiladi
- Fishingdan
- MFA'ni aylanib o'tishdan
! Tuz noyob va tasodifiy bo'lishi kerak.

? "Kamida bitta bosh harf, raqam va belgi" siyosatining zaif tomoni qaysi?
- Parollar juda uzun bo'ladi
+ Odamlar bashorat qilinadigan naqshlarga (so'z + yil + belgi) o'tadi, qoidalar ularni tez topadi
- Uni hech kim bajarmaydi
- U MFA'ni o'chiradi
! Uzunlik va sizib chiqqan parollar tekshiruvi samaraliroq.

? Pentestda parol hujumlarini xavfsiz o'tkazish uchun nima muhim?
- Maksimal tezlikda barcha hisoblarga urinish
+ RoE ruxsati, bloklash chegarasidan past qolish, faoliyat jurnali va iloji bo'lsa test hisoblarida avval tekshirish
- Mijozga aytmasdan bajarish
- Faqat admin hisoblariga hujum qilish
! Noto'g'ri bajarilgan parol hujumi yuzlab hisoblarni bloklab, ishni to'xtatishi mumkin.

? Pentest hisobotida oflayn buzish natijasi qanday ko'rsatiladi?
- Barcha topilgan parollar ro'yxati
+ Statistika: nechta xesh, qancha vaqtda, qanday naqshlar — parollarning o'zisiz
- Faqat admin paroli
- Umuman ko'rsatilmaydi
! Parollar — mijoz ma'lumoti; hisobot uchun naqsh va miqdor yetarli.

? Credential stuffing'ga qarshi eng samarali choralar qaysi?
+ MFA, parolni qayta ishlatmaslik (parol menejeri) va sizib chiqqan parollar tekshiruvi
- Faqat parolni har oy almashtirish
- Faqat CAPTCHA
- SSH portini o'zgartirish
! Stuffing boshqa saytdan sizib chiqqan juftliklarni ishlatadi — noyob parollar va MFA uni to'xtatadi.
:::

:::cards
Brute force :: Barcha kombinatsiyalarni ketma-ket sinash
Lug'at hujumi :: Mashhur va sizib chiqqan parollar ro'yxati bo'yicha taxmin
Qoidalar (rules) :: Lug'at so'zlariga bashorat qilinadigan o'zgartirishlar qo'llash
Password spraying :: Bitta parol — ko'p hisoblar, har biriga kam urinish
Credential stuffing :: Boshqa saytdan sizib chiqqan juftliklarni sinash
Onlayn hujum :: Jonli xizmatga — jurnalda ko'rinadi, bloklanadi
Oflayn hujum :: Qo'lga tushgan xeshni taxmin qilish — himoyachi ko'rmaydi
Tez xeshlar :: MD5, NTLM, SHA-1, SHA-256 — parollar uchun yaroqsiz
Sekin xeshlar :: bcrypt, yescrypt, Argon2id — parollar uchun to'g'ri tanlov
$y$ / $2b$ / $argon2id$ :: yescrypt / bcrypt / Argon2id xesh prefikslari
Spraying aniqlash :: Ko'p hisoblar bo'yicha agregatsiya: bitta manba, ko'p turli hisoblar
NIST SP 800-63B :: Uzunlik, sizib chiqqan parollar tekshiruvi, MFA — majburiy murakkablik o'rniga
:::
