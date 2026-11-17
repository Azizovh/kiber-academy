Intervyuda savol: "Rezyumengizda 'Linux, tarmoq, Python, xavfsizlik asoslari' deb yozilgan. Menga bularning birortasini **ko'rsata olasizmi**?"

Ikki xil javob bor. Birinchisi: "Ha, men bularni o'rganganman, kurs o'tganman." Ikkinchisi: "Ha — mana GitHub'imda. Bu Python'da yozgan IOC tekshiruvchi skriptim. Bu — 12 ta CTF topshirig'i bo'yicha writeup'larim. Bu — uy laboratoriyamdagi hujum tahlili."

Ikkinchi nomzod bir xil bilimga ega bo'lishi mumkin. Lekin uning bilimi **ko'rinadi**. Portfolio — bu ko'rinadigan bilim.

SOC tarmog'ida bitta katta portfolio loyihasini (uy SOC laboratoriyasi) batafsil ko'rdingiz. Bu darsda — barcha yo'nalishlar uchun umumiy tamoyillar va portfolioning boshqa turlari: writeup'lar, kichik loyihalar va blog.

## Portfolio nimadan iborat

| Tur | Nima | Kimga eng foydali |
|---|---|---|
| **Loyihalar** | Laboratoriya, vosita, skript, avtomatlashtirish | Hamma yo'nalishlar |
| **Writeup'lar** | CTF va mashq topshiriqlarini qanday yechganingiz haqida tahlil | Pentest, SOC, forensika |
| **Hisobotlar** | Laboratoriyadagi insident yoki pentest hisoboti namunasi | SOC, IR, pentest |
| **Blog / maqolalar** | Biror mavzuni chuqur tushuntirish | Hamma — yozish ko'nikmasini ko'rsatadi |
| **Hissa** | Ochiq kodli loyihalarga yordam, qoidalar (Sigma, YARA), hujjatlar | Detection engineering, AppSec |
| **Musobaqalar** | CTF natijalari, jamoa | Pentest, umumiy |

Maqsad (curriculum'dagi kabi): **kamida 3 ta hujjatlashtirilgan loyiha va kamida 5 ta writeup.**

## Yo'nalishlar bo'yicha loyiha g'oyalari

| Yo'nalish | Loyiha g'oyalari |
|---|---|
| **Umumiy** | Uy laboratoriyasi (VM'lar, tarmoq sxemasi); o'z serveringizni xavfsiz sozlash (hardening) va hujjatlashtirish; parol kuchini tekshiruvchi oddiy dastur (faqat o'z parollaringiz uchun) |
| **SOC** | Uy SOC laboratoriyasi; aniqlash qoidalari to'plami (Sigma); IOC tekshiruvchi skript; log tahlili skripti; ov hisobotlari |
| **Pentest** | Laboratoriyada (o'zingizga tegishli zaif VM'lar) to'liq pentest hisoboti namunasi; ruxsat etilgan platformalardagi eskirgan mashinalar writeup'lari; razvedka natijalarini avtomatlashtiruvchi skript (faqat ruxsat etilgan nishonlar uchun) |
| **AppSec** | Ataylab zaif ilovani (masalan, OWASP Juice Shop) tahlil qilib, topilmalar va **tuzatishlar** hisoboti; xavfsiz kod namunalari; CI/CD'da xavfsizlik skanerlarini sozlash |
| **Cloud** | IaC (Terraform) bilan xavfsiz sozlangan bulut muhiti; bulut sozlamalarini tekshiruvchi skript; CloudTrail tahlili stsenariylari |

Eng yaxshi loyihalar — **muammo yechadigan** loyihalar. "Men Nmap natijalarini o'qishni o'rgandim" emas, balki "men laboratoriyamdagi barcha xizmatlarni avtomatik inventarizatsiya qiladigan va ularni CVE bazasi bilan solishtiradigan skript yozdim".

## Writeup — qanday yozish kerak

[[writeup|Writeup]] — topshiriqni qanday yechganingiz haqidagi tahlil. Yaxshi writeup faqat "javob"ni emas, **fikrlash jarayonini** ko'rsatadi — bu ish beruvchi uchun eng qimmatli narsa.

### Tuzilishi

```markdown
# [Platforma] — [Topshiriq nomi]

**Toifa:** Forensika · **Qiyinlik:** O'rta · **Sana:** 2026-11-20

## Qisqacha
Bir-ikki jumla: topshiriq nima haqida va asosiy saboq nima.

## Boshlang'ich ma'lumot
Nima berildi (fayl, IP, tavsif).

## Yechim yo'li
### 1. Dastlabki tekshiruv
Nima qildim va nega. Buyruq + natija (qisqartirilgan).

### 2. Birinchi topilma
...

### 3. Boshi berk ko'cha
Nimani sinab ko'rdim va nega ishlamadi — bu ham muhim!

### 4. Yechim
...

## Himoyachi nuqtai nazari
Bu hujum/topilmani haqiqiy muhitda qanday aniqlash va oldini olish mumkin?

## Saboqlar
- Yangi o'rgangan narsalarim
- Keyingi safar boshqacha nima qilardim
```

Ikkita bo'limga alohida e'tibor bering:

- **"Boshi berk ko'cha"** — ko'pchilik yashiradi, lekin aynan u sizning haqiqiy fikrlashingizni ko'rsatadi. Real ishda ham ko'p vaqt noto'g'ri yo'llarga ketadi — buni halol yozish professional belgisi.
- **"Himoyachi nuqtai nazari"** — hujum topshirig'i bo'lsa ham, uni qanday aniqlash va to'xtatish haqida 2–3 jumla. Bu sizni "faqat bayroq yig'uvchi"dan **xavfsizlik mutaxassisi**ga aylantiradi. Bu kursning barcha darslari shu tamoyil asosida yozilgan.

:::warn
**Writeup etikasi va qoidalari.**
- **Faol** (hali yechilayotgan) topshiriqlar va musobaqalar uchun writeup'ni ommaga joylash ko'p platformalarda **taqiqlangan** — faqat eskirgan (retired) topshiriqlar yoki musobaqa tugagandan keyin. Har bir platformaning qoidalarini o'qing.
- **Bayroqlarni (flag) va parollarni** to'liq ochiq yozmang — boshqalarning o'rganishini buzmaslik uchun (ko'pchilik `flag{...}` ni yashiradi).
- **Haqiqiy tashkilotlar, mijozlar yoki ish joyingiz** haqidagi har qanday ma'lumot — hech qachon. Bug bounty topilmalari — faqat dastur ruxsat bergan va tuzatilgandan keyin.
- **Ruxsatsiz tizimlar** haqida writeup — bu jinoyat isboti, portfolio emas.
:::

## GitHub profilini tayyorlash

GitHub — texnik portfolioning asosiy joyi. Ish beruvchi profilingizga bir necha soniya qaraydi — shu soniyalarda taassurot qoladi.

### Profil README

GitHub'da foydalanuvchi nomingiz bilan bir xil nomdagi ombor yaratsangiz (masalan, `username/username`), uning README fayli profilingizning bosh sahifasida ko'rinadi:

```markdown
# Salom, men [Ism] 👋

Kiberxavfsizlik bo'yicha boshlang'ich mutaxassis — **SOC / Blue Team** yo'nalishi.
Toshkent, O'zbekiston · O'zbek, rus, ingliz tillari

## 🔭 Hozir
- SOC uy laboratoriyasi: Wazuh + Sysmon + Suricata → [soc-home-lab](havola)
- CompTIA Security+ ga tayyorlanyapman

## 🛠 Loyihalar
| Loyiha | Tavsif |
|---|---|
| [soc-home-lab](havola) | 7 ta hujum stsenariysi, 9 ta sinalgan aniqlash qoidasi |
| [ioc-checker](havola) | IOC'larni VirusTotal va AbuseIPDB'da tekshiruvchi Python skript |
| [writeups](havola) | 15 ta CTF va forensika topshiriqlari tahlili |

## 📫 Aloqa
LinkedIn: ... · Blog: ...
```

(Bu namunadagi `|` belgilari Markdown jadvali uchun — GitHub uni chiroyli jadval qilib ko'rsatadi.)

### Har bir ombor uchun

| Element | Nega |
|---|---|
| **Aniq nom** | `soc-home-lab`, `ioc-checker` — `test123` yoki `project-final-v2` emas |
| **Qisqa tavsif** (About) | Bir jumlada nima ekani |
| **README** | Nima, nega, qanday ishlatish, natijalar, skrinshotlar |
| **Toza kod** | Izohlar, tushunarli nomlar, keraksiz fayllar yo'q |
| **Litsenziya** | Ochiq kod uchun (masalan, MIT) |
| **Sirlar yo'q** | API kalitlar, parollar — hech qachon (SOAR darsidagi ogohlantirish) |

### Pin qilingan omborlar

Profilda 6 tagacha omborni "pin" qilish mumkin — ular birinchi ko'rinadi. Eng yaxshi 3–6 ta loyihangizni tanlang. 40 ta yarim tugagan ombor emas, **6 ta yaxshi hujjatlashtirilgan** loyiha.

### Faollik

"Yashil kataklar" (commit tarixi) — yaxshi, lekin asosiy emas. Har kuni ma'nosiz commit qilish o'rniga — muntazam, haqiqiy ish: har hafta writeup, har oy loyihada yangilik. Muntazamlik **qiziqish va intizom**ni ko'rsatadi.

## Blog

Blog yozish — portfolioning eng kam baholanadigan qismi. U uchta narsani ko'rsatadi:

1. **Tushunish** — biror narsani boshqalarga tushuntira olsangiz, uni haqiqatan bilasiz.
2. **Yozish ko'nikmasi** — SOC tiketi, IR hisoboti, pentest hisoboti — xavfsizlik ishining katta qismi yozish (b3 bosqichidagi IR hisoboti darsi).
3. **Muloqot** — texnik bo'lmaganlarga tushuntirish qobiliyati.

| Platforma | Xususiyati |
|---|---|
| **GitHub Pages** | Bepul, o'z domeningiz bo'lishi mumkin, Markdown |
| **Medium**, **Hashnode**, **dev.to** | Tayyor platforma, auditoriya bor |
| **LinkedIn maqolalari** | Professional tarmog'ingiz darhol ko'radi |
| **Telegram kanal** | Mahalliy auditoriya uchun qulay |

**O'zbek tilida yozing.** Kiberxavfsizlik bo'yicha o'zbekcha sifatli kontent juda kam. O'zbek tilidagi yaxshi maqola — sizni ajratib turadi, mahalliy hamjamiyatga foyda keltiradi va mahalliy ish beruvchilar e'tiborini tortadi. Ingliz tilida ham yozsangiz — xalqaro auditoriya qo'shiladi. Ikkalasi — eng yaxshi.

Mavzu g'oyalari: o'rganganingiz biror mavzuni oddiy tilda tushuntirish ("Sysmon nima va nega kerak"), laboratoriyangizdagi tajriba, writeup'lar, kitob yoki konferensiya haqidagi xulosalar, yangi zaiflik tahlili (himoyachi nuqtai nazaridan).

:::key
**Portfolio — "men bilaman" emas, "mana, ko'ring".** Uning kuchi uchta narsada: **aniqlik** (raqamlar va dalillar: "9 ta sinalgan qoida", "15 ta writeup"), **fikrlash** (nima qildingiz, nega, nima ishlamadi, nima o'rgandingiz) va **halollik** (o'zingiz qilgan narsa, o'z so'zlaringiz bilan). Boshqalarning writeup'ini nusxalash yoki AI yozgan matnni o'zingiznikidek ko'rsatish intervyudagi birinchi aniq savolda fosh bo'ladi — va obro'ni butunlay yo'qotadi.
:::

## CTF — musobaqalar

**CTF** (Capture The Flag) musobaqalari — ko'nikmani sinash, jamoada ishlash va portfolio uchun natija olishning qiziqarli yo'li. Bu kursda o'z CTF topshiriqlaringizni yechgansiz.

| Tur | Format |
|---|---|
| **Jeopardy** | Toifalar bo'yicha topshiriqlar (web, kripto, forensika, reverse, OSINT) — boshlang'ich uchun eng mos |
| **Attack-Defense** | Jamoalar o'z xizmatlarini himoya qiladi va boshqalarnikiga hujum qiladi (musobaqa doirasida) |
| **Blue team CTF** | Loglar, PCAP, xotira tasvirlari tahlili — SOC uchun ideal |

**CTFtime.org** — musobaqalar taqvimi va jamoalar reytingi. Boshlang'ich uchun: oson musobaqalarni tanlang, jamoaga qo'shiling yoki o'zingiz tuzing, va musobaqadan keyin har bir yechgan topshirig'ingiz uchun writeup yozing.

## Portfolio va GitHub nimani qilmaydi

- **Sifatsiz ishni yashirmaydi** — ko'p yarim tugagan loyiha kam, lekin yaxshi loyihalardan yomonroq.
- **O'zi ish topib bermaydi** — uni rezyume, LinkedIn va intervyuda ko'rsatish kerak.
- **Bir marta qilinib, tugamaydi** — muntazam yangilanadi.
- **Qoidabuzarlikni oqlamaydi** — faol topshiriqlar yechimlari, ruxsatsiz tizimlar, maxfiy ma'lumotlar — portfolio emas, muammo.

:::try
**1. Profil.** GitHub'da profil README omborini yarating va yuqoridagi namuna asosida to'ldiring (hozircha bor narsalar bilan — "Hozir" va "Reja" bo'limlari bilan).

**2. Birinchi writeup.** Bu kursdagi CTF topshiriqlaridan birini (masalan, "Tungi mehmon") yoki TryHackMe'dagi bepul xonani shablon bo'yicha writeup qilib yozing — "Boshi berk ko'cha" va "Himoyachi nuqtai nazari" bo'limlari bilan. Bayroqni yashiring.

**3. Loyiha omborlari.** Kamida 3 ta loyiha uchun ombor yarating (SOAR darsidagi skript, laboratoriya, writeup'lar to'plami) va har biriga yaxshi README yozing. Eng yaxshilarini pin qiling.

**4. Blog post.** Kursdagi istalgan bitta mavzuni o'z so'zlaringiz bilan, o'zbek tilida, 600–1000 so'zda tushuntiring va joylang.

**5. Fikr oling.** GitHub profilingizni sohada ishlayotgan biror kishiga (yoki hamjamiyatda) ko'rsating va so'rang: "30 soniyada nimani tushundingiz?"
:::

## Xulosa

- **Portfolio — ko'rinadigan bilim**: loyihalar, writeup'lar, hisobotlar, blog, hissa, musobaqalar.
- Maqsad: **kamida 3 ta hujjatlashtirilgan loyiha va 5 ta writeup**.
- Eng yaxshi loyihalar **muammo yechadi**; yo'nalishingizga mos tanlang.
- Writeup: qisqacha → ma'lumot → yechim yo'li (**boshi berk ko'chalar bilan**) → **himoyachi nuqtai nazari** → saboqlar.
- Etika: faqat **eskirgan** topshiriqlar, bayroqlarni yashirish, haqiqiy tashkilot ma'lumotlari yo'q, ruxsatsiz tizimlar — hech qachon.
- GitHub: **profil README**, aniq nomlar, yaxshi README, sirlar yo'q, **6 ta pin qilingan** eng yaxshi loyiha.
- **Blog** — tushunish, yozish va muloqotni ko'rsatadi; **o'zbek tilida** yozish sizni ajratib turadi.
- CTF: CTFtime, jeopardy va blue team musobaqalari, har biridan keyin writeup.

:::quiz
? Portfolioning asosiy vazifasi nima?
+ Bilimni ko'rinadigan dalillar orqali isbotlash
- Rezyumeni uzaytirish
- Ijtimoiy tarmoqda mashhur bo'lish
- Sertifikat o'rnini bosish
! Ish beruvchi bilimingizni ko'ra olmaydi — u faqat dalillarni ko'radi.

? Yaxshi writeup'ning eng qimmatli qismlaridan biri qaysi?
- Faqat yakuniy bayroq
+ Fikrlash jarayoni, shu jumladan ishlamagan yo'llar (“boshi berk ko'cha”)
- Iloji boricha qisqa bo'lishi
- Boshqalarning yechimlaridan iqtiboslar
! Real ishda ham ko'p vaqt noto'g'ri yo'llarga ketadi — buni halol yozish professional belgisi.

? Nega hujum topshirig'i writeup'iga ham “Himoyachi nuqtai nazari” bo'limi qo'shiladi?
+ U sizni faqat bayroq yig'uvchi emas, hujumni aniqlash va oldini olishni ham tushunadigan mutaxassis sifatida ko'rsatadi
- Bu majburiy qonun talabi
- Bu writeup'ni uzaytirish uchun
- Bu faqat SOC uchun
! Ish beruvchilar himoyani tushunadigan mutaxassislarni qadrlaydi.

? Faol (hali yechilayotgan) CTF topshirig'i uchun writeup'ni ommaga joylash haqida qaysi gap to'g'ri?
- Har doim ruxsat etilgan
+ Ko'p platformalarda taqiqlangan — faqat eskirgan topshiriqlar yoki musobaqa tugagandan keyin
- Faqat ingliz tilida ruxsat
- Faqat bayroq bilan ruxsat
! Qoidabuzarlik hisobni yopishga va obro'ga zarar keltirishi mumkin.

? GitHub profilida qanday omborlarni pin qilish kerak?
- Barcha omborlarni
+ Eng yaxshi, to'liq hujjatlashtirilgan 3–6 ta loyihani
- Faqat birinchi yaratilgan omborlarni
- Faqat bo'sh omborlarni
! Ko'p yarim tugagan loyiha emas — oz, lekin sifatli.

? Qaysi ombor nomi eng yaxshi?
+ ioc-checker
- test123
- project-final-v2-new
- asdf
! Nom omborda nima borligini darhol aytishi kerak.

? Blog yozish ish beruvchiga nimani ko'rsatadi?
+ Mavzuni tushunish va uni boshqalarga tushuntira olish
+ Yozish ko'nikmasi — tiket, hisobot va IR hujjatlari uchun muhim
- Faqat ingliz tilini bilish
- Faqat dizayn qobiliyatini
! Xavfsizlik ishining katta qismi yozish va tushuntirish.

? Nega o'zbek tilida xavfsizlik bo'yicha yozish foydali?
- O'zbek tilida yozish mumkin emas
+ O'zbekcha sifatli kontent kam — bu sizni ajratib turadi va mahalliy hamjamiyat hamda ish beruvchilar e'tiborini tortadi
- Faqat o'zbek tilida yozish kerak, ingliz tili keraksiz
- Bu hech qanday ahamiyatga ega emas
! Ikkala tilda yozish — eng yaxshi variant.

? Boshqalarning writeup'ini o'zgartirib, o'zingiznikidek joylash nimaga olib keladi?
- Portfolio tezroq o'sadi
+ Intervyudagi birinchi aniq savolda fosh bo'lib, obro'ni butunlay yo'qotishga
- Hech narsaga
- Sertifikat olishga
! Portfolioning kuchi — halollik va o'z fikrlashingiz.

? Boshlang'ich uchun eng mos CTF formati qaysi?
+ Jeopardy — toifalar bo'yicha alohida topshiriqlar
- Faqat attack-defense
- Faqat professional ligalar
- CTF boshlang'ichlar uchun emas
! Blue team CTF'lar esa SOC yo'nalishi uchun ayniqsa foydali.
:::

:::cards
Portfolio turlari? :: Loyihalar, writeup'lar, hisobotlar, blog, ochiq kodga hissa, CTF natijalari.
Portfolio maqsadi (curriculum)? :: Kamida 3 ta hujjatlashtirilgan loyiha va kamida 5 ta writeup.
Yaxshi loyiha? :: Muammo yechadigan, natijalari raqamlarda, yaxshi README bilan.
Writeup tuzilishi? :: Qisqacha → boshlang'ich ma'lumot → yechim yo'li (boshi berk ko'chalar bilan) → himoyachi nuqtai nazari → saboqlar.
Writeup etikasi? :: Faqat eskirgan topshiriqlar, bayroqlarni yashirish, haqiqiy tashkilot ma'lumotlari yo'q, ruxsatsiz tizimlar haqida hech qachon.
GitHub profil README? :: username/username nomli ombor — README profil bosh sahifasida ko'rinadi.
Har bir ombor uchun nima kerak? :: Aniq nom, qisqa tavsif, README, toza kod, litsenziya, sirlar yo'q.
Pin qilingan omborlar? :: 6 tagacha; eng yaxshi, to'liq hujjatlashtirilgan loyihalar.
Blog nimani ko'rsatadi? :: Tushunish, yozish ko'nikmasi, texnik bo'lmaganlarga tushuntirish qobiliyati.
Blog platformalari? :: GitHub Pages, Medium, Hashnode, dev.to, LinkedIn maqolalari, Telegram kanal.
CTF turlari? :: Jeopardy (toifalar), attack-defense (jamoalar), blue team CTF (loglar, PCAP, xotira).
Portfolioning uch kuchi? :: Aniqlik (raqamlar, dalillar), fikrlash (nega, nima ishlamadi), halollik (o'z ishingiz).
:::
