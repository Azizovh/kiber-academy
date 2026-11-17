a2 bosqichida Qaydnoma'ning zaifliklarini himoyachi sifatida tuzatdingiz: markaziy avtorizatsiya, parametrli so'rovlar, chiqishni kodlash, CSRF tokenlari. p2 da [[burp-suite|Burp Suite]] va web razvedkani o'rgandingiz. Endi savol: bu bilimlarni **haqiqiy, katta, ataylab zaif qilingan** ilovada qanday mashq qilish kerak — qonuniy, xavfsiz va tizimli?

Javob — maxsus o'quv ilovalari va laboratoriyalar. Ular aynan shu maqsadda yaratilgan: [[owasp|OWASP]] Juice Shop'da yuzdan ortiq topshiriq bor, PortSwigger Web Security Academy'da esa har bir zaiflik turi bo'yicha nazariya va o'nlab laboratoriyalar. Bu dars ularni qanday xavfsiz o'rnatish, qanday tartibda ishlash va har bir yechilgan topshiriqni himoya bilimiga qanday aylantirishni ko'rsatadi.

:::warn
**Faqat o'z kompyuteringizda yoki platformaning o'z laboratoriyasida.** Bu darsdagi usullarni faqat o'zingiz ishga tushirgan o'quv ilovalarida va PortSwigger kabi platformalar bergan laboratoriya manzillarida qo'llang. Haqiqiy saytlarda "faqat sinab ko'rish" — ruxsatsiz faoliyat (p1 metodologiya darsi). Juice Shop va DVWA ataylab zaif: ularni hech qachon internetdan ochiq manzilda ishga tushirmang.
:::

## Mashq maydonlari

| Laboratoriya | Nima | Qayerda ishlaydi | Kim uchun |
|---|---|---|---|
| **OWASP Juice Shop** | Zamonaviy onlayn do'kon (Node.js, Angular, REST API), 100+ topshiriq, 6 qiyinlik darajasi | O'z kompyuteringizda (Docker) | Asosiy amaliyot: zamonaviy SPA va API |
| **PortSwigger Web Security Academy** | Har bir zaiflik turi bo'yicha nazariya va laboratoriyalar: Apprentice, Practitioner, Expert | Brauzerda, PortSwigger serverlarida (bepul) | Har bir mavzuni alohida chuqur |
| **DVWA** | Klassik PHP ilova, har bir zaiflik uchun past/o'rta/yuqori/imkonsiz darajalar | O'z kompyuteringizda | Bitta zaiflikning himoya darajalarini solishtirish |
| **TryHackMe web xonalari** | Yo'riqnomali xonalar, jumladan Juice Shop | TryHackMe laboratoriyasi | Boshlang'ich yo'riqnoma |

DVWA'ning eng foydali xususiyati — "impossible" darajasi: u har bir zaiflikning **to'g'ri tuzatilgan** versiyasining manba kodini ko'rsatadi. Past darajadagi zaif kodni imkonsiz darajadagi kod bilan solishtirish — a2 bosqichidagi tuzatishlarning boshqa tildagi (PHP) ko'rinishi.

## Juice Shop'ni xavfsiz o'rnatish

c3 bosqichidagi Docker darsidan foydalanamiz:

```bash
# Faqat lokal manzilda tinglaydi: 127.0.0.1 — tarmoqdagi boshqa qurilmalar ko'rmaydi
docker run -d --name juice-shop -p 127.0.0.1:3000:3000 bkimminich/juice-shop

# Ishlayotganini tekshiring
docker ps --filter name=juice-shop
curl -sI http://127.0.0.1:3000 | head -1      # HTTP/1.1 200 OK

# Ishingiz tugagach — to'xtating (konteyner o'chmaydi, keyin docker start bilan davom etasiz)
docker stop juice-shop
```

| Sozlama | Nega |
|---|---|
| `-p 127.0.0.1:3000:3000` | Faqat shu kompyuterdan ochiladi. `-p 3000:3000` barcha tarmoq interfeyslarida ochadi — uy yoki ofis tarmog'idagi har kim zaif ilovaga kira oladi |
| Alohida virtual mashina (ixtiyoriy, lekin yaxshi) | Asosiy tizim va shaxsiy ma'lumotlardan ajratish |
| Burp proxy orqali brauzer | Barcha so'rovlar HTTP history'da — keyin hisobot uchun dalil (p2 Burp darsi) |

:::info
Juice Shop har safar ishga tushganda o'z ma'lumotlar bazasini qaytadan yaratadi — siz o'zgartirgan narsalar (foydalanuvchilar, sharhlar) yo'qoladi. Yechilgan topshiriqlar ro'yxatini esa Juice Shop brauzeringizda saqlab qo'yadi va qayta ishga tushganda tiklashga harakat qiladi; bu imkoniyat versiyaga qarab farq qilishi mumkin, shuning uchun rasmiy hujjatni tekshiring. Eng ishonchli taraqqiyot yozuvi baribir o'z eslatmalaringiz.
:::

## Juice Shop bilan ishlash tartibi

1. **Score Board'ni toping.** Bu sahifa menyuda ko'rinmaydi — uni topish birinchi topshiriq va web razvedka darsining mashqi (JavaScript fayllarini o'qing).
2. **Ilovani oddiy foydalanuvchi kabi o'rganing.** Ro'yxatdan o'ting, mahsulot qidiring, savatga qo'shing, sharh yozing, buyurtma bering — barchasi Burp orqali. Site map'ni tuzing.
3. **Bir yulduzli topshiriqlardan boshlang.** Score Board topshiriqlarni qiyinlik (1–6 yulduz) va toifa (Broken Access Control, Injection, XSS va h.k.) bo'yicha ko'rsatadi.
4. **Bitta toifani oxirigacha.** Masalan, avval barcha oson access control topshiriqlari — bu a2 dagi ruxsatlar matritsasini mustahkamlaydi.
5. **Har bir topshiriqdan keyin — yozing** (quyidagi qolip).

Juice Shop'ning o'z **ichki maslahat tizimi** va rasmiy "Pwning OWASP Juice Shop" kitobi bor (bepul, onlayn): unda har bir topshiriq uchun bosqichma-bosqich maslahatlar, oxirida esa yechimlar ilovasi. Oldingi darsdagi vaqt chegarasi qoidasi bu yerda ham amal qiladi: avval o'zingiz, keyin maslahat, yechim — eng oxirida.

## PortSwigger Academy bilan ishlash tartibi

PortSwigger — Burp Suite yaratuvchilari — Academy'ni bepul taqdim etadi va u web pentestning eng yaxshi o'quv manbalaridan biri hisoblanadi.

```
 Har bir mavzu (masalan, Access control):
   1. Nazariya sahifasini o'qing           ← zaiflik qanday paydo bo'ladi
   2. Apprentice laboratoriyalari          ← asosiy holatlar
   3. Practitioner laboratoriyalari        ← himoyasi bor, lekin noto'g'ri qurilgan holatlar
   4. "How to prevent" bo'limi             ← a2 bilan solishtiring
   5. Expert                               ← keyinroq, tajriba bilan
```

| Tavsiya etilgan tartib | Nega |
|---|---|
| Access control, Authentication | a2 dagi eng muhim mavzular; bug bounty'da eng ko'p qabul qilinadi |
| Information disclosure, Business logic | Skanerlar topmaydi — qo'lda fikrlash |
| SQL injection, XSS, CSRF | Klassik mavzular; nazariyani a2 bilan solishtiring |
| SSRF, File upload, Path traversal, OS command injection | Server tomonidagi zaifliklar |
| API testing, JWT, OAuth | Zamonaviy ilovalar (p2 API mavzusi roadmap'da) |

Academy'da har bir laboratoriya uchun rasmiy yechim bor. U ham vaqt chegarasidan keyin o'qiladi — va eng foydalisi: yechimni o'qigandan keyin laboratoriyani **qayta, yechimga qaramasdan** bajarish.

:::key
**Har bir yechilgan topshiriq — uch savol:** (1) Zaiflik **nega** mavjud edi — ildiz sabab nima? (2) Qaysi a2 himoya chorasi uni to'xtatgan bo'lardi? (3) Buni hisobotda qanday yozgan bo'lardim — nom, ta'sir, tavsiya? Shu uch savolga javob bermagan topshiriq "yechilgan", lekin hali "o'rganilmagan".
:::

## Amaliyot jurnali

Har bir topshiriq uchun qisqa yozuv — p4 hisobot darsidagi topilma qolipining kichik ko'rinishi:

```
 ## Juice Shop — <topshiriq nomi> (2 yulduz, Broken Access Control)   2026-11-18
 Holat: yechildi (maslahat: 1, yechim: yo'q)

 Ildiz sabab:   API buyurtma egasini tekshirmaydi
 Ta'sir:        boshqa foydalanuvchining savati/buyurtmasini ko'rish
 Himoya (a2):   markaziy avtorizatsiya funksiyasi + ikki foydalanuvchili test
 Hisobot nomi:  "Boshqa foydalanuvchilarning savatini ko'rish mumkin"
 O'rganganim:   Burp Repeater'da tokenni almashtirish tartibi
```

Bu jurnal uch ish qiladi: takrorlash orqali bilimni mustahkamlaydi, intervyuda "qanday zaifliklarni topganmisiz?" savoliga aniq misollar beradi va portfolio uchun xom ashyo bo'ladi.

**Taraqqiyot jadvali:**

| Toifa | Juice Shop (yechildi / jami) | PortSwigger Apprentice | PortSwigger Practitioner |
|---|---|---|---|
| Access control | ... | ... | ... |
| Authentication | ... | ... | ... |
| Injection | ... | ... | ... |
| XSS | ... | ... | ... |
| ... | | | |

Roadmap maqsadlari: Juice Shop topshiriqlarining kamida yarmi va PortSwigger'dagi barcha Apprentice laboratoriyalari.

## Himoya tomoniga qaytish

Bu bosqichning eng kuchli mashqi — **ikki tomonlama**:

1. Juice Shop yoki DVWA'da zaiflikni toping.
2. Ilovaning manba kodida (ikkalasi ham ochiq kodli, GitHub'da) zaif joyni toping.
3. a2 dagi usul bilan tuzatishni yozing va qayta tekshiring — endi topshiriq ishlamasligi kerak.

Bu mashq sizni pentester sifatida ham kuchliroq qiladi (zaiflik qanday kodda paydo bo'lishini ko'rasiz) va AppSec lavozimlariga ham tayyorlaydi. DVWA'ning "impossible" darajasi uchinchi qadam uchun tayyor namuna.

:::tip
**Portfolio g'oyasi.** "Juice Shop: 50 ta topshiriq — har biri uchun ildiz sabab va tuzatish" nomli GitHub repozitoriysi ishga kirishda kuchli dalil bo'ladi. Juice Shop — ochiq o'quv loyihasi va uning yechimlari allaqachon rasmiy kitobda bor, shuning uchun o'z yozuvlaringizni e'lon qilish muammo emas. Lekin qiymat yechimda emas, **sizning tahlilingizda**: ildiz sabab, a2 himoyasi va hisobot ko'rinishidagi tavsif.
:::

## Amaliyot

:::try
**1. Juice Shop'ni ishga tushiring.** Yuqoridagi buyruq bilan konteynerni ishga tushiring va faqat lokal manzilda tinglayotganini tekshiring.

*Tekshirish:* `docker port juice-shop` natijasi `127.0.0.1:3000` ni ko'rsatadi (`0.0.0.0` emas). Brauzerda `http://127.0.0.1:3000` ochiladi.

**2. Score Board'ni toping.** Burp orqali ilovani oching va JavaScript fayllarini o'qib, Score Board sahifasining yo'lini toping (web razvedka darsidagi usul).

*Tekshirish:* Score Board ochilganda Juice Shop "topshiriq yechildi" xabarini ko'rsatadi.

**3. Birinchi o'nta.** Bir yulduzli topshiriqlardan o'ntasini yeching va har biri uchun amaliyot jurnali yozuvini to'ldiring.

**4. PortSwigger'da bitta mavzu.** Academy'da bepul akkaunt oching va "Access control" mavzusining nazariya sahifasini o'qib, barcha Apprentice laboratoriyalarini yeching. Har biri uchun "How to prevent" bo'limini a2 dagi markaziy avtorizatsiya yondashuvi bilan solishtiring.

**5. Ikki tomonlama mashq.** DVWA'dagi bitta zaiflikning "low" va "impossible" darajalari manba kodini yonma-yon qo'ying. Farqni 3–5 gapda yozing: qaysi himoya qo'shilgan va u a2 dagi qaysi qoidaga mos keladi?
:::

## Xulosa

- Web pentestni faqat ataylab zaif qilingan o'quv ilovalarida va platforma laboratoriyalarida mashq qiling.
- Juice Shop — zamonaviy SPA va API, 100+ topshiriq; PortSwigger Academy — har bir mavzu bo'yicha nazariya va laboratoriyalar; DVWA — himoya darajalarini solishtirish.
- Juice Shop'ni faqat `127.0.0.1` da ishga tushiring; Burp orqali ishlang.
- Tartib: ilovani o'rganish → oson topshiriqlar → bitta toifani oxirigacha; avval o'zingiz, keyin maslahat, yechim eng oxirida.
- Har bir topshiriq uchun uch savol: ildiz sabab, a2 himoyasi, hisobotdagi ko'rinish.
- Amaliyot jurnali va taraqqiyot jadvali — bilim, intervyu va portfolio uchun.
- Ikki tomonlama mashq: zaiflikni topish, manba kodda ko'rish, tuzatish va qayta tekshirish.

:::quiz
? Juice Shop'ni qanday ishga tushirish xavfsiz?
- `-p 3000:3000` bilan, boshqalar ham foydalansin
+ `-p 127.0.0.1:3000:3000` bilan, faqat lokal manzilda
- Bulut serverida ochiq IP bilan
! Ataylab zaif ilova tarmoqdagi boshqa qurilmalarga ochilmasligi kerak.

? DVWA'ning "impossible" darajasi nima uchun foydali?
- Eng qiyin topshiriqlarni beradi
+ Zaiflikning to'g'ri tuzatilgan kodini ko'rsatadi
- Faqat tajribali pentesterlar uchun
! Zaif va tuzatilgan kodni solishtirish a2 dagi himoya bilimini mustahkamlaydi.

? PortSwigger Academy laboratoriyalari qayerda ishlaydi?
+ PortSwigger serverlarida, brauzer orqali, bepul
- Faqat o'z kompyuteringizda Docker bilan
- Faqat Burp Suite Professional bilan
! Academy laboratoriyalari platformaning o'zi bergan qonuniy nishonlar.

? Juice Shop'da birinchi topshiriq qaysi web razvedka ko'nikmasini talab qiladi?
- Port skanerlash
+ JavaScript fayllarini o'qib, yashirin sahifani topish
- Parollarni tanlash
! Score Board menyuda yo'q — uni frontend kodidan topish kerak.

? Topshiriqni haqiqatan "o'rgangan" deyish uchun nima kerak?
- Score Board'da yashil belgi
+ Ildiz sababni, a2 himoyasini va hisobotdagi ko'rinishini tushuntira olish
- Yechimni yoddan bilish
! Uch savolga javob — yechilgan topshiriqni bilimga aylantiradi.

? Rasmiy yechimdan qanday foydalanish eng foydali?
- Birinchi bo'lib o'qish va takrorlash
+ Vaqt chegarasidan keyin o'qish, keyin laboratoriyani yechimga qaramasdan qayta bajarish
- Umuman o'qimaslik
! Qayta mustaqil bajarish bilimni mustahkamlaydi.

? Ikki tomonlama mashq nimadan iborat?
- Ikkita brauzerda bir vaqtda ishlash
+ Zaiflikni topish, manba kodda ko'rish, tuzatish va qayta tekshirish
- Ikki xil skaner bilan tekshirish
! Hujum va himoyani birlashtirish pentester va AppSec ko'nikmalarini birga rivojlantiradi.

? PortSwigger'da qaysi mavzulardan boshlash tavsiya etildi?
+ Access control va authentication
- Faqat Expert laboratoriyalari
- Faqat XSS
! Bu mavzular a2 da eng muhim va bug bounty'da eng ko'p qabul qilinadi.

? Juice Shop konteynerini o'chirmasdan to'xtatib, keyin qayta ishga tushirish uchun qaysi buyruqlar mos?
- `docker rm juice-shop`
+ `docker stop` va keyin `docker start`
- `docker rmi bkimminich/juice-shop`
! `rm` konteynerni o'chiradi; `stop`/`start` uni saqlab qoladi.

? O'quv usullarini haqiqiy saytda "faqat sinab ko'rish" mumkinmi?
- Ha, agar hech narsa o'zgartirmasangiz
+ Yo'q, bu ruxsatsiz faoliyat
- Ha, agar sayt zaif ko'rinsa
! Yozma ruxsatsiz tekshiruv — huquqbuzarlik; faqat o'quv ilovalari va laboratoriyalar.
:::

:::cards
Web amaliyot maydonlari? :: OWASP Juice Shop, PortSwigger Web Security Academy, DVWA, TryHackMe web xonalari.
Juice Shop? :: Zamonaviy zaif onlayn do'kon: Node.js, Angular, REST API, 100+ topshiriq.
Juice Shop'ni xavfsiz ishga tushirish? :: Docker'da faqat 127.0.0.1 manzilida, Burp proxy orqali.
DVWA impossible darajasi? :: Zaiflikning to'g'ri tuzatilgan kodini ko'rsatadi.
PortSwigger Academy tuzilmasi? :: Nazariya, Apprentice, Practitioner, Expert laboratoriyalari va "How to prevent" bo'limi.
Score Board? :: Juice Shop topshiriqlari sahifasi; uni topish birinchi topshiriq.
Har bir topshiriqdan keyingi uch savol? :: Ildiz sabab, qaysi a2 himoyasi to'xtatardi, hisobotda qanday yoziladi.
Yechimdan foydalanish? :: Vaqt chegarasidan keyin o'qish va laboratoriyani yechimga qaramasdan qayta bajarish.
Ikki tomonlama mashq? :: Zaiflikni topish, manba kodda ko'rish, tuzatish va qayta tekshirish.
Amaliyot jurnalining foydasi? :: Bilimni mustahkamlash, intervyu uchun misollar va portfolio uchun xom ashyo.
:::
