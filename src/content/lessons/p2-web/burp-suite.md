AppSec tarmog'ida Qaydnoma'dagi IDOR'ni topganingizni eslang (a2): `GET /api/notes/1042` so'rovida raqamni o'zgartirib, boshqa foydalanuvchining qaydini ko'rdingiz. O'shanda buni `curl` bilan qildingiz. Endi tasavvur qiling: ilovada 200 ta endpoint, har birida bir nechta parametr, ikki xil foydalanuvchi va admin — va hammasini ikki hafta ichida tekshirish kerak. `curl` bilan har bir so'rovni qo'lda yozish — imkonsiz.

Web pentesterning asosiy quroli — **intercepting proxy**: brauzer va server orasida turib, har bir so'rovni ko'rsatadigan, to'xtatadigan, o'zgartiradigan va qayta yuboradigan vosita. Sohada eng keng tarqalgani — [[burp-suite|Burp Suite]] (PortSwigger kompaniyasi), uning bepul muqobili — OWASP ZAP.

Tarmoq bosqichidagi HTTP darsi (s2) va AppSec'dagi HTTP chuqur darsi (a1) — shu darsning poydevori. Burp HTTP'ni yangi narsaga aylantirmaydi; u uni **ko'rinadigan va boshqariladigan** qiladi.

## Burp qanday ishlaydi

```
 Brauzer  ──▶  Burp Proxy (127.0.0.1:8080)  ──▶  Server (qaydnoma.example.com)
          ◀──        │ ko'rsatadi, to'xtatadi,  ◀──
                     │ o'zgartiradi, saqlaydi
                     ▼
          HTTP history · Repeater · Intruder · Decoder · Comparer
```

HTTPS'ni ko'rish uchun Burp har bir sayt uchun o'zining sertifikatini yaratadi. Brauzer unga ishonishi uchun Burp'ning **CA sertifikatini** o'rnatasiz. s5 bosqichidagi PKI darsi shu yerda: bu — o'zingiz uchun ataylab qilingan "o'rtadagi odam" (MITM). Shuning uchun:

:::warn
Burp CA sertifikatini faqat **alohida, test uchun ishlatiladigan brauzer profiliga** o'rnating (Burp'ning o'rnatilgan brauzeri bunga juda qulay). Asosiy brauzeringizga o'rnatilgan va unutilgan CA sertifikati — sizning butun HTTPS trafigingizni ochiq qiladigan xavf. Bu sertifikat bilan ishlaydigan proxy faqat sizning kompyuteringizda (`127.0.0.1`) tinglashi kerak.
:::

## Scope — birinchi sozlama

Qamrov darsidagi qoida Burp'da texnik sozlama sifatida: **Target → Scope**.

```
Include in scope:
  https://qaydnoma.example.com
  https://api.qaydnoma.example.com
  https://staging.qaydnoma.example.com      (mijoz yozma tasdiqladi)
Exclude:
  https://qaydnoma.example.com/logout       (sessiyani tasodifan uzmaslik uchun)
```

Keyin Proxy sozlamalarida "faqat scope'dagi elementlarni ushlash" va HTTP history'da "faqat scope'dagilarni ko'rsatish". Natija: brauzer shrift, analitika va reklama serverlariga yuborayotgan yuzlab so'rovlar shovqin bo'lmaydi — va tasodifan qamrovdan tashqaridagi saytga skaner yoki Intruder yuborilmaydi.

## Asosiy qismlar

| Qism | Vazifasi | Pentestda |
|---|---|---|
| **Proxy → HTTP history** | Barcha so'rov va javoblar tarixi | Ilova xaritasi, dalillar manbasi |
| **Proxy → Intercept** | So'rovni yuborishdan oldin to'xtatib o'zgartirish | Brauzerda o'zgartirib bo'lmaydigan narsalar (yashirin maydonlar, JSON) |
| **Repeater** | Bitta so'rovni qo'lda o'zgartirib, qayta-qayta yuborish | Asosiy tekshiruv ish joyi |
| **Intruder** | So'rovning belgilangan joylariga ro'yxatdan qiymatlar qo'yib, ko'p so'rov yuborish | Parametr qiymatlarini saralash, ID diapazonlari |
| **Decoder** | Base64, URL, HTML, hex kodlash va dekodlash | Token va parametrlarni o'qish (s1 kodlash darsi) |
| **Comparer** | Ikki javobni solishtirish | Farqni ko'rish: tester1 va tester2 javoblari |
| **Logger** | Barcha vositalar (Repeater, Intruder…) yuborgan so'rovlar | Faoliyat jurnali |
| **Scanner** (faqat Professional) | Avtomatik zaiflik skaneri | Qo'lda tekshiruvni to'ldiradi |
| **Collaborator** (faqat Professional) | Tashqi "qo'ng'iroq" serveri | Ko'rinmas (out-of-band) zaifliklar — SSRF darsi |

**Community** (bepul) va **Professional** (pullik) versiyalar farqi: bepul versiyada Scanner va Collaborator yo'q, Intruder esa ataylab sekinlashtirilgan. O'qish va PortSwigger laboratoriyalari uchun Community yetarli.

## Repeater — asosiy ish joyi

Pentester vaqtining katta qismi Repeater'da o'tadi. Ish oqimi:

1. Brauzerda ilovadan oddiy foydalaning (tester1 sifatida) — HTTP history to'ladi.
2. Qiziq so'rovni tanlang — o'ng tugma → **Send to Repeater**.
3. Bitta narsani o'zgartiring, yuboring, javobni kuzating.
4. Javob nima o'zgardi? Status kodi, uzunlik, mazmun, vaqt?

Qaydnoma misoli — a2 dagi IDOR tekshiruvi, endi metodik:

```http
GET /api/notes/1042 HTTP/2
Host: api.qaydnoma.example.com
Cookie: session=<tester1-sessiyasi>
```

```http
HTTP/2 200 OK
Content-Type: application/json

{"id":1042,"owner":"tester1","title":"Xarid ro'yxati","body":"..."}
```

Repeater'da faqat cookie'ni tester2 sessiyasiga almashtirasiz va yuborasiz. Javob `404` bo'lsa — avtorizatsiya ishlayapti (a2 bosqichidagi `load_note()` tuzatishi). `200` va tester1 qaydi qaytsa — topilma. Isbot faqat **o'zingizning ikki test hisobingiz** orasida — haqiqiy foydalanuvchilar ma'lumotiga tegilmaydi.

## Intruder — ko'p so'rov, ehtiyotkorlik bilan

Intruder so'rovning belgilangan joylariga (§ belgilari bilan) qiymatlar ro'yxatini qo'yib, har biri uchun so'rov yuboradi:

```http
GET /api/notes/§1042§ HTTP/2
Host: api.qaydnoma.example.com
Cookie: session=<tester2-sessiyasi>
```

Qiymatlar: tester1 yaratgan beshta qaydning ID'lari. Natija jadvalida status kodi va javob uzunligi bo'yicha saralaysiz — `200` qaytganlari IDOR.

Hujum turlari: **Sniper** (bitta joy, bitta ro'yxat), **Battering ram** (barcha joylarga bir xil qiymat), **Pitchfork** (har bir joyga o'z ro'yxati, parallel), **Cluster bomb** (barcha kombinatsiyalar — tez o'sadi).

Intruder — eng ko'p xavf tug'diradigan qism: u minglab so'rov yuborishi mumkin. Mijoz tizimida:

| Qoida | Nega |
|---|---|
| Faqat scope'dagi nishonga | Qamrov |
| Tezlik cheklovi (resource pool: bir vaqtda kam so'rov, kechikish bilan) | Ishlab chiqarishni yuklamaslik, WAF/IPS'ni tasodifan ishga tushirmaslik |
| Login va parol tiklash endpointlarida — RoE'dagi urinishlar cheklovi | Hisoblarni bloklamaslik (p1 parol hujumlari) |
| Ma'lumot yaratadigan endpointlarga (POST) — juda ehtiyotkor | Minglab soxta yozuv, xat yoki buyurtma |

## Dalillar

Hisobot uchun har bir topilmaga **so'rov va javob** kerak. Burp'da:

- HTTP history yoki Repeater'dagi so'rov/javob — o'ng tugma → saqlash yoki nusxalash.
- Muhim so'rovlarga **izoh va rang** (Highlight, Comment) — ikki haftadan keyin topish oson.
- Loyiha faylini saqlash (Professional'da) — butun tarix bitta faylda; bu mijoz ma'lumoti, shifrlangan joyda saqlanadi va loyiha oxirida kelishilgan muddatda o'chiriladi (qamrov darsi).

Dalil so'rovlarida sessiya cookie'lari va tokenlarni hisobotda qisqartiring yoki yashiring — hisobot ko'p qo'llardan o'tadi.

## Kengaytmalar

BApp Store'da yuzlab kengaytma bor. Boshlang'ich uchun foydalilari:

| Kengaytma | Nima uchun |
|---|---|
| **Autorize** | Har bir so'rovni avtomatik ravishda boshqa (pastroq huquqli) foydalanuvchi sessiyasi bilan qayta yuborib, ruxsat xatolarini belgilaydi — access control darsi |
| **JWT Editor** | JWT tokenlarni o'qish va tahrirlash — autentifikatsiya darsi |
| **Logger++** | Kengaytirilgan jurnal va filtrlar |
| **Param Miner** | Yashirin parametrlarni topish |

## Himoyachi nimani ko'radi

Burp — brauzerdan kelayotgandek ko'rinadigan HTTP so'rovlar. Lekin u ham iz qoldiradi:

- Repeater'dagi qo'lda o'zgartirishlar — web jurnallarida "g'alati" so'rovlar: noodatiy parametr qiymatlari, bir xil endpointga qisqa vaqtda ko'p o'zgartirilgan so'rovlar.
- Intruder — bir manbadan bir endpointga ko'p so'rovlar, ketma-ket ID'lar — WAF va rate limiting buni ko'radi (a2 API darsi).
- Scanner — ko'p 400/500 xatolar va ma'lum test qatorlari.

AppSec tomondan xulosa: ilova **brauzerni boshqarib bo'lmaydi**, deb o'ylashi xato. Brauzerda yashirilgan maydon, faol bo'lmagan tugma, JavaScript tekshiruvi — Burp bilan bir soniyada aylanib o'tiladi. Shuning uchun barcha tekshiruvlar **serverda** (a2 asosiy saboqlaridan biri).

:::key
Burp yangi zaiflik yaratmaydi va o'zi zaiflik topmaydi (Scanner'dan tashqari). Uning qiymati — sizga HTTP darajasida to'liq nazorat berishi. Zaiflikni topadigan — sizning metodik savollaringiz: "Bu parametrni boshqa foydalanuvchi qiymatiga almashtirsam-chi? Bu maydonni olib tashlasam-chi? Bu so'rovni admin bo'lmagan sessiya bilan yuborsam-chi?"
:::

## Burp nimani qilmaydi

- Qamrovni o'zi nazorat qilmaydi — scope'ni siz sozlaysiz.
- Biznes mantiqni tushunmaydi.
- Community versiyasida avtomatik skaner yo'q — va bu o'rganish uchun yaxshi: qo'lda tekshirishni o'rganasiz.

:::try
1. Burp Suite Community'ni o'rnating va uning o'rnatilgan brauzerini oching. O'z laboratoriyangizdagi Juice Shop yoki DVWA'ni (p2 oxirgi darsi) yoki PortSwigger laboratoriyasini oching.
2. Scope'ni faqat laboratoriya manziliga sozlang va HTTP history'da faqat scope'dagilarni ko'rsating. Filtrdan oldin va keyin nechta so'rov ko'rinadi?
3. Login so'rovini Repeater'ga yuboring. Parolni o'zgartirib, javob status kodi, uzunligi va matni qanday farq qilishini kuzating.
4. Decoder'da Juice Shop yoki o'z ilovangizdagi biror cookie yoki tokenni Base64 dan dekodlang. Ichida nima bor?
5. PortSwigger Web Security Academy'da ro'yxatdan o'ting va "Getting started" materiallarini o'qing.
6. Savol: brauzerda "O'chirish" tugmasi oddiy foydalanuvchi uchun faol emas (kulrang). Bu himoya hisoblanadimi?

**Javoblar:**
1. Burp'ning o'rnatilgan brauzeri CA sertifikati bilan oldindan sozlangan — asosiy brauzeringizga hech narsa o'rnatish shart emas.
2. Filtrsiz — shriftlar, analitika va boshqa uchinchi tomon so'rovlari ham; filtr bilan — faqat laboratoriya ilovasi.
3. Ko'p ilovalarda noto'g'ri parol uchun boshqacha xabar yoki uzunlik — autentifikatsiya darsida bu foydalanuvchi enumeratsiyasi bilan bog'liq.
4. Ko'pincha JSON tuzilmasi (masalan, JWT'ning sarlavha va payload qismlari) — imzo esa o'qiladigan matn emas. Dekodlash — shifrni ochish emas.
5. Akademiya bepul; laboratoriyalar ruxsat etilgan o'quv nishonlari.
6. Yo'q. Tugmaning holati — faqat brauzerdagi ko'rinish. So'rov Burp bilan to'g'ridan-to'g'ri yuborilishi mumkin. Haqiqiy himoya — serverdagi ruxsat tekshiruvi; pentestda aynan shu tekshiriladi.
:::

## Xulosa

- Burp — intercepting proxy: brauzer va server orasida so'rovlarni ko'rish, to'xtatish, o'zgartirish va qayta yuborish.
- HTTPS uchun Burp CA sertifikati — faqat alohida test brauzeriga.
- Birinchi sozlama — scope: faqat qamrovdagi manzillar, logout kabi xavfli yo'llar istisno.
- Proxy history — xarita va dalil; Repeater — asosiy ish joyi; Intruder — ko'p so'rov, tezlik cheklovi bilan; Decoder, Comparer, Logger — yordamchilar.
- Dalillar: so'rov/javob, izoh, rang; sessiya ma'lumotlari hisobotda yashiriladi; loyiha fayli — mijoz ma'lumoti.
- Foydali kengaytmalar: Autorize, JWT Editor, Logger++, Param Miner.
- Brauzerdagi cheklovlar himoya emas — barcha tekshiruvlar serverda bo'lishi kerak.

:::quiz
? Intercepting proxy nima qiladi?
+ Brauzer va server orasida turib, HTTP so'rovlarini ko'rsatadi, to'xtatadi, o'zgartiradi va qayta yuboradi
- Saytni avtomatik buzadi
- Faqat parollarni saqlaydi
- Serverni tezlashtiradi
! Burp va ZAP — web pentestning asosiy vositalari.

? Nega Burp CA sertifikati faqat alohida test brauzeriga o'rnatilishi kerak?
- Aks holda Burp ishlamaydi
+ Asosiy brauzerdagi unutilgan CA sertifikati barcha HTTPS trafikni o'rtadagi odam hujumiga ochiq qiladi
- Test brauzeri tezroq
- Litsenziya talabi
! Burp ataylab MITM qiladi — bu faqat test muhitida bo'lishi kerak.

? Burp'da scope sozlamasi nima beradi?
+ Shovqinni kamaytiradi va vositalar tasodifan qamrovdan tashqaridagi saytlarga so'rov yubormasligini ta'minlaydi
- Saytni tezroq ochadi
- Parollarni shifrlaydi
- Barcha saytlarni skanerlaydi
! Qamrov — texnik sozlama sifatida ham.

? Repeater'ning asosiy vazifasi nima?
- Minglab so'rovlarni avtomatik yuborish
+ Bitta so'rovni qo'lda o'zgartirib, qayta-qayta yuborish va javobni kuzatish
- Base64 dekodlash
- Saytni skanerlash
! Pentester vaqtining katta qismi Repeater'da o'tadi.

? IDOR'ni Burp bilan xavfsiz tekshirishning to'g'ri usuli qaysi?
+ Tester1 qaydiga so'rovni tester2 sessiyasi bilan qayta yuborib, javobni solishtirish — faqat o'z test hisoblari orasida
- Haqiqiy foydalanuvchilar ID'larini birma-bir ochish
- Barcha qaydlarni yuklab olish
- Admin parolini taxmin qilish
! Isbot test hisoblari orasida — haqiqiy foydalanuvchi ma'lumotiga tegilmaydi.

? Intruder'ni mijoz tizimida ishlatishda qaysi qoida muhim?
- Maksimal tezlik
+ Tezlik cheklovi, faqat scope, login endpointlarida RoE cheklovlari va ma'lumot yaratadigan so'rovlarda ehtiyotkorlik
- Faqat tunda, cheklovsiz
- Faqat Cluster bomb rejimi
! Intruder minglab so'rov yuborishi va ishlab chiqarishni buzishi mumkin.

? Burp Community va Professional farqlaridan biri qaysi?
- Community'da Repeater yo'q
+ Community'da Scanner va Collaborator yo'q, Intruder sekinlashtirilgan
- Professional faqat Linux'da
- Farqi yo'q
! O'qish uchun Community yetarli.

? Autorize kengaytmasi nima qiladi?
- JWT'larni tahrirlaydi
+ So'rovlarni pastroq huquqli sessiya bilan avtomatik qayta yuborib, ruxsat xatolarini belgilaydi
- Parollarni buzadi
- Saytni tezlashtiradi
! Access control tekshiruvini tizimli qilish uchun foydali.

? Brauzerda oddiy foydalanuvchi uchun "O'chirish" tugmasi faol emas. Bu himoyami?
- Ha, foydalanuvchi bosa olmaydi
+ Yo'q — so'rov proxy orqali to'g'ridan-to'g'ri yuborilishi mumkin; himoya serverda bo'lishi kerak
- Faqat mobil ilovada himoya
- Ha, agar JavaScript yoqilgan bo'lsa
! Brauzerdagi cheklovlar — faqat ko'rinish.

? Hisobotga Burp so'rov/javob dalilini qo'yishda nima qilinadi?
- Hamma narsa o'zgarishsiz qo'yiladi
+ Sessiya cookie'lari va tokenlar qisqartiriladi yoki yashiriladi
- Faqat javob qo'yiladi
- Dalil qo'yilmaydi
! Hisobot ko'p qo'llardan o'tadi; amaldagi sessiya ma'lumotlari unda bo'lmasligi kerak.
:::

:::cards
Burp Suite :: PortSwigger'ning intercepting proxy asosidagi web xavfsizligi vositasi
OWASP ZAP :: Burp'ning bepul ochiq manbali muqobili
Burp CA sertifikati :: HTTPS'ni ko'rish uchun — faqat test brauzeriga
Scope :: Faqat qamrovdagi manzillar bilan ishlash sozlamasi
HTTP history :: Barcha so'rov va javoblar tarixi — xarita va dalil
Repeater :: Bitta so'rovni qo'lda o'zgartirib qayta yuborish
Intruder :: Belgilangan joylarga ro'yxatdan qiymatlar qo'yib ko'p so'rov yuborish
Decoder :: Base64, URL, hex kodlash va dekodlash
Comparer :: Ikki javobni solishtirish
Collaborator :: Out-of-band zaifliklar uchun tashqi qo'ng'iroq serveri (Professional)
Autorize :: Ruxsat xatolarini avtomatik tekshiruvchi kengaytma
:::
