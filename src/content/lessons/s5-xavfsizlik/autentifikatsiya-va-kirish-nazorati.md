Har bir tizim eshigida ikki savol turadi: **"Sen kimsan?"** va **"Senga nima mumkin?"** Birinchisiga noto'g'ri javob bergan tizimga begona odam kiradi. Ikkinchisiga noto'g'ri javob bergan tizimda oddiy foydalanuvchi boshqalarning ma'lumotini ko'radi yoki administrator ishini bajaradi.

Bu ikki savol shunchalik muhimki, ularning buzilishi yildan-yilga eng keng tarqalgan zaifliklar ro'yxatining tepasida turadi. Bu darsda ikkalasini ajratib, har birining mexanizmlarini ko'rib chiqamiz.

## Uch qadam: identifikatsiya, autentifikatsiya, avtorizatsiya

| Qadam | Savol | Misol |
|---|---|---|
| **Identifikatsiya** | Kimman deb da'vo qilyapsan? | Login kiritish: `ali` |
| [[authentication|Autentifikatsiya]] | Buni isbotla | Parol, kod, barmoq izi |
| [[authorization|Avtorizatsiya]] | Senga nima mumkin? | Ali o'z buyurtmalarini ko'radi, boshqalarnikini — yo'q |

Va to'rtinchisi — **hisobdorlik** (accounting): kim nima qilgani yozib boriladi. Uchtasi birga qisqacha **AAA** deyiladi: Authentication, Authorization, Accounting.

Aeroport misoli: pasportingizni ko'rsatasiz (autentifikatsiya) — bu sizni **kim** ekaningizni tasdiqlaydi. Lekin chiptangiz biznes-klassga emas (avtorizatsiya) — demak u yerga o'tira olmaysiz. Ikkalasi — mustaqil tekshiruvlar.

:::key
**Autentifikatsiyadan o'tish — hamma narsaga ruxsat olish emas.** Tizimga to'g'ri kirgan foydalanuvchi faqat o'ziga tegishli narsalar bilan ishlashi kerak. Eng ko'p uchraydigan xato aynan shu: tizim "sen kimsan?" deb so'raydi, lekin har bir amalda "bu senga mumkinmi?" deb so'rashni unutadi.
:::

Inglizcha qisqartmalari: **authn** — autentifikatsiya, **authz** — avtorizatsiya.

## Autentifikatsiya omillari

Kimlikni isbotlash usullari uch toifaga bo'linadi:

| Omil | Mohiyati | Misollar | Zaif tomoni |
|---|---|---|---|
| **Bilgan narsangiz** | Faqat siz biladigan sir | Parol, PIN | Taxmin qilinadi, aldab olinadi, sizib chiqadi |
| **Egalik qilgan narsangiz** | Faqat sizda bor buyum | Telefon, apparat kalit, smart-karta | Yo'qoladi, o'g'irlanadi |
| **O'zingiz** | Tanangizning xususiyati | Barmoq izi, yuz, ko'z | Almashtirib bo'lmaydi |

Ba'zan qo'shimcha belgilar ham hisobga olinadi: **qayerdasiz** (IP manzil, mamlakat) va **qanday tutasiz** (odatiy vaqt, qurilma).

Har bir omilning o'z kamchiligi bor — shuning uchun ular **birlashtiriladi**.

## Ko'p omilli autentifikatsiya

[[mfa|MFA]] (Multi-Factor Authentication) — **turli toifadagi** kamida ikki omil. Ikki omil bo'lsa — **2FA**.

Muhim: omillar **har xil toifadan** bo'lishi kerak. Parol + maxfiy savol — ikki omil emas, chunki ikkalasi ham "bilgan narsangiz": bittasini bilib olgan odam ikkinchisini ham shu yo'l bilan bilib oladi.

MFA nega bunchalik samarali? Chunki parol o'g'irlash oson va ommaviy (phishing, sizish, credential stuffing), lekin shu bilan birga **sizning telefoningizni ham** qo'lga kiritish — butunlay boshqa darajadagi ish. O'tgan darslardagi parol hujumlarining ko'pi MFA bor joyda to'xtaydi.

### Ikkinchi omil turlari

Hammasi bir xil kuchli emas:

| Usul | Qanday ishlaydi | Kuchi | Zaif tomoni |
|---|---|---|---|
| **SMS kod** | Kod telefon raqamiga keladi | Past | SIM-kartani firibgarlik bilan qayta chiqarish; kodni aldab olish |
| **Email kod** | Kod pochtaga keladi | Past | Pochta buzilgan bo'lsa — foydasiz |
| **TOTP ilovasi** | Ilova har 30 soniyada yangi kod hisoblaydi | O'rta | Kodni soxta saytga kiritib qo'yish mumkin |
| **Push tasdiq** | Telefonga "Bu sizmisiz?" so'rovi | O'rta | Ketma-ket so'rovlar bilan charchatish |
| **Apparat kalit / passkey** (FIDO2) | Kriptografik tasdiq; sayt manzili tekshiriladi | **Yuqori** | Qurilma kerak; yo'qotish ehtimoli |

**TOTP** (Time-based One-Time Password) — Google Authenticator, Aegis kabi ilovalar. Sozlashda sayt ilovaga maxfiy kalit beradi (QR-kod orqali); keyin ikkalasi ham shu kalit va joriy vaqtdan bir xil 6 xonali kodni hisoblaydi. Internet ham, SMS ham kerak emas.

**Push charchatish** (MFA fatigue): hujumchi parolni biladi va qayta-qayta kirishga urinadi; qurbonning telefoni to'xtovsiz "tasdiqlaysizmi?" deb so'raydi; oxiri u zerikib yoki adashib "ha" ni bosadi. Himoya: so'rovda ekrandagi raqamni kiritish talabi — va oddiy qoida: **o'zingiz boshlamagan kirishni hech qachon tasdiqlamang**.

**Passkey va apparat kalitlar** — eng kuchli usul va uning sababi kriptografiya darsidan tanish: bu asimmetrik juftlik. Yopiq kalit qurilmangizda qoladi; sayt faqat ochiq kalitni biladi. Eng muhimi — kalit **aniq domenga bog'langan**: soxta `mybank-kirish.com` saytida u shunchaki ishlamaydi. Foydalanuvchi aldanib qolsa ham, beradigan narsasi yo'q. Shuning uchun bu usul **phishing'ga chidamli** deyiladi.

:::info
Har qanday MFA — MFA yo'qligidan ancha yaxshi. SMS kod zaif, lekin u ham ommaviy hujumlarning katta qismini to'xtatadi. Tartib: iloji bo'lsa — passkey yoki apparat kalit; bo'lmasa — TOTP ilovasi; hech bo'lmasa — SMS.
:::

### Zaxira kodlar

MFA yoqqanda sayt odatda bir martalik **zaxira kodlar** beradi — telefon yo'qolsa, kirish uchun. Ularni parol menejerida yoki chop etib, xavfsiz joyda saqlang. Aks holda telefon bilan birga hisobni ham yo'qotasiz.

Hujumchilar buni biladi: MFA ni to'g'ridan-to'g'ri yenga olmasa, **tiklash jarayoniga** hujum qiladi — "telefonimni yo'qotdim" deb qo'llab-quvvatlash xizmatini ishontirishga urinadi. Tizimning kuchi eng zaif kirish yo'li bilan o'lchanadi.

## Sessiyalar va tokenlar

Autentifikatsiyadan o'tgach, tizim sizni har so'rovda qayta so'ramaydi. HTTP darsidan bilasiz: buning uchun [[session|sessiya]] ishlatiladi.

Ikki asosiy yondashuv:

| | Server sessiyasi | Token (masalan JWT) |
|---|---|---|
| Brauzerda nima saqlanadi | Tasodifiy identifikator | Imzolangan ma'lumot: kim, qachongacha |
| Holat qayerda | Serverda | Tokenning o'zida |
| Bekor qilish | Oson — serverdan o'chiriladi | Qiyinroq — muddati tugashini kutish kerak |

Ikkalasida ham bitta qoida amal qiladi: **sessiya identifikatori yoki token — vaqtinchalik parol**. Kimda u bo'lsa, o'sha siz hisoblanadi — parol ham, MFA ham so'ralmaydi. Infostealer darsidagi gap shu.

Yaxshi sessiya boshqaruvi:

- identifikator uzun va tasodifiy;
- cookie'da `HttpOnly`, `Secure`, `SameSite`;
- muddati cheklangan; harakatsizlikdan keyin tugaydi;
- **chiqish** (logout) sessiyani serverda ham yo'q qiladi;
- parol o'zgarganda barcha sessiyalar bekor qilinadi;
- muhim amallar (parol o'zgartirish, pul o'tkazish) oldidan qayta tasdiq.

## SSO va federatsiya

Xodim kuniga o'nlab tizimdan foydalanadi. Har biriga alohida parolmi?

[[sso|SSO]] (Single Sign-On) — bir marta kirib, hamma tizimdan foydalanish. Kimlikni bitta markaziy xizmat — **identity provider** (IdP) — tasdiqlaydi; qolgan tizimlar unga ishonadi.

"Google orqali kirish" tugmasi — shu g'oyaning ommaviy ko'rinishi. Ortidagi protokollar: **OAuth 2.0** (ruxsat berish), **OpenID Connect** (kimlikni tasdiqlash), **SAML** (korporativ muhitda).

| Afzalligi | Xavfi |
|---|---|
| Parollar soni kamayadi | Bitta hisob — hamma eshikning kaliti |
| MFA va siyosat bir joyda boshqariladi | IdP ishlamasa — hech narsa ishlamaydi |
| Xodim ketganda bitta hisob o'chiriladi | IdP buzilsa — oqibat juda katta |

Shuning uchun SSO hisobi — eng qattiq himoyalanadigan narsa: albatta MFA bilan, iloji bo'lsa phishing'ga chidamli.

## Avtorizatsiya: kirish nazorati

Endi ikkinchi savol: "senga nima mumkin?" [[access-control|Kirish nazorati]]ning bir necha modeli bor:

| Model | Kim hal qiladi | Qayerda uchraydi |
|---|---|---|
| **DAC** (Discretionary) | Resurs **egasi** | Linux fayl ruxsatlari: egasi `chmod` qiladi |
| **MAC** (Mandatory) | **Tizim siyosati** — egasi ham o'zgartira olmaydi | Maxfiylik darajalari; SELinux, AppArmor |
| [[rbac|RBAC]] (Role-Based) | **Rol**: huquq rolga beriladi, odam rolga biriktiriladi | Deyarli barcha tashkilotlar |
| **ABAC** (Attribute-Based) | **Atributlar**: bo'lim, vaqt, joy, qurilma | Murakkab, nozik siyosatlar |

**RBAC** — eng keng tarqalgani:

```
Foydalanuvchi ──► Rol ──► Huquqlar

Ali      ──► Buxgalter     ──► hisobotlarni ko'rish, to'lov kiritish
Vali     ──► Buxgalter
Sami     ──► Bosh buxgalter ──► + to'lovni tasdiqlash
Dilnoza  ──► Auditor        ──► faqat o'qish
```

Afzalligi: yangi buxgalter keldi — uni rolga qo'shasiz, yigirmata alohida huquq bermaysiz. Ketdi — roldan chiqarasiz. Linux darsidagi **guruhlar** — aynan shu g'oya.

Sxemada CIA darsidagi **vazifalarni ajratish** ham ko'rinadi: to'lovni kirituvchi va tasdiqlovchi — turli rollar.

## Kirish nazoratining tamoyillari

| Tamoyil | Mohiyati |
|---|---|
| [[least-privilege|Eng kam imtiyoz]] | Faqat ish uchun zarur huquq |
| **Default deny** | Aniq ruxsat berilmagani — taqiqlangan |
| **Bilishi zarur** (need to know) | Lavozim yuqoriligi — hamma ma'lumotni ko'rish huquqi emas |
| **Vazifalarni ajratish** | Muhim amalni bir kishi yolg'iz bajara olmaydi |
| **Vaqtinchalik huquq** (just-in-time) | Yuqori huquq faqat kerak paytda va cheklangan muddatga |
| **Muntazam ko'rib chiqish** | Kimda qanday huquq borligi davriy tekshiriladi |

Oxirgi qator amalda eng ko'p buziladigani. Huquqlar faqat **qo'shiladi**: xodim bo'limdan bo'limga o'tadi, yangi huquq oladi, eskisi qoladi. Bir necha yilda oddiy xodim yarim kompaniyaga kirish huquqiga ega bo'lib qoladi — bu **huquqlarning yig'ilishi** (privilege creep).

Xuddi shunday xavf: **tashlab ketilgan hisoblar**. Ishdan ketgan xodimning hisobi, sinov uchun yaratilgan hisob, pudratchining hisobi — ularni hech kim ishlatmaydi, hech kim kuzatmaydi, paroli hech qachon almashtirilmaydi. Hujumchi uchun ideal kirish nuqtasi.

### Imtiyozli hisoblar

Administrator, root, xizmat hisoblari — **imtiyozli hisoblar**. Ular buzilsa — hamma narsa buziladi. Shuning uchun:

- kundalik ish uchun **alohida oddiy hisob**, ma'muriy ish uchun — alohida;
- **MFA** — majburiy;
- har bir amal **jurnalga yoziladi**;
- umumiy hisob (`admin` — beshta odam biladi) — yo'q: kim nima qilganini bilib bo'lmaydi;
- xizmat hisoblari faqat o'z vazifasi uchun kerakli huquqqa ega.

Linux darsidagi `sudo` — aynan shu g'oya: har kim o'z hisobida, yuqori huquq — faqat kerak paytda va jurnal bilan.

## Kirish nazorati qanday buziladi

Bu xatolar veb-ilovalarda eng keng tarqalgan zaiflik turidir. Ularning hammasi bitta sababga borib taqaladi: **server tekshirishni unutgan**.

| Xato | Mohiyati |
|---|---|
| [[idor|IDOR]] | Manzil yoki so'rovdagi identifikatorni o'zgartirib, begona obyektga kirish |
| **Gorizontal oshirish** | Bir xil darajadagi boshqa foydalanuvchi ma'lumotiga kirish |
| **Vertikal oshirish** | Yuqoriroq rol funksiyasiga kirish |
| **Yashirin sahifa** | Admin sahifasi menyuda yo'q, lekin manzilini bilgan kishi kira oladi |
| **Klient tomondagi tekshiruv** | Tugma yashirilgan, lekin server so'rovni baribir bajaradi |

Web darsidagi misol — manzildagi buyurtma raqamini o'zgartirish — bu IDOR. To'g'ri yozilgan ilova **har bir so'rovda** tekshiradi: "bu obyekt shu foydalanuvchiga tegishlimi?" Identifikatorni bilish — ruxsat emas.

Ikki umumiy qoida:

1. **Har bir so'rov serverda tekshiriladi** — brauzerda emas ("Web asoslari" darsi).
2. **Tekshiruv markazlashgan** — har bir sahifada alohida yozilgan tekshiruvlardan bittasi albatta unutiladi.

## Zero Trust

An'anaviy model: "tarmoq ichida — ishonchli, tashqarida — ishonchsiz". Qal'a va xandaq. Muammosi tarmoq bosqichidan ma'lum: hujumchi bitta kompyuterni egallab ichkariga kirsa, u "ishonchli" bo'lib qoladi.

[[zero-trust|Zero Trust]] bu taxminni rad etadi:

:::key
**"Hech qachon sukut bo'yicha ishonma, har doim tekshir."** Tarmoqdagi joylashuv ishonch bermaydi. Har bir so'rov — ichkaridan kelsa ham — autentifikatsiya va avtorizatsiyadan o'tadi; qaror kim, qaysi qurilmadan, nimaga va qanday sharoitda murojaat qilayotganiga qarab qabul qilinadi.
:::

Amaliy ko'rinishi: hamma joyda MFA, qurilma holatini tekshirish, tarmoqni mayda segmentlarga bo'lish, eng kam imtiyoz va doimiy monitoring. Bu bitta mahsulot emas — yondashuv.

## Auditda nimaga qaraladi

- MFA yoqilganmi — ayniqsa administratorlar, masofaviy kirish va pochta uchun?
- Umumiy va standart hisoblar bormi?
- Ishdan ketganlarning hisoblari o'chirilganmi? Oxirgi kirishi yillar oldin bo'lgan hisoblar?
- Kimda administrator huquqi bor va u hammaga kerakmi?
- Xizmat hisoblari qanday huquqqa ega?
- Sessiya qachon tugaydi? Chiqish haqiqatan ishlaydimi?
- Ilova har bir so'rovda kirish huquqini serverda tekshiradimi?
- Kirishlar va huquq o'zgarishlari jurnalga yoziladimi?

:::try
**1. O'z hisoblaringiz.** Asosiy pochta, bank ilovasi va ijtimoiy tarmoqlaringizda MFA yoqilganmi? Qaysi usul bilan? Yoqilmaganlarida hozir yoqing — TOTP ilovasi bilan (masalan, Aegis yoki Google Authenticator). Zaxira kodlarni saqlab qo'ying.

**2. Faol sessiyalar.** Google, Telegram yoki boshqa hisobingiz sozlamalaridan "qurilmalar" yoki "faol sessiyalar" ro'yxatini toping. Hammasini taniysizmi? Notanishini yoping.

**3. Ulangan ilovalar.** Google hisobingizda "uchinchi tomon ilovalari" ro'yxatini ko'ring: qachondir "Google orqali kirish"ni bosgan saytlaringiz. Ishlatmaydiganlaringiz ruxsatini bekor qiling.

**4. Linux'da.** `id`, `sudo -l` va `getent group sudo` buyruqlari bilan o'z huquqlaringizni va kim sudo guruhida ekanini ko'ring. Bu — kichik miqyosdagi huquqlar auditi.

**5. O'ylab ko'ring.** Onlayn do'kon uchun uchta rol o'ylab toping (masalan: mijoz, operator, administrator) va har biriga nima mumkinligini jadvalga yozing. Qaysi amal uchun ikki kishi kerak bo'lishi lozim?
:::

## Xulosa

- **Autentifikatsiya** — kimsan?; **avtorizatsiya** — senga nima mumkin?; **hisobdorlik** — nima qilding?
- Uch omil: **bilgan** narsang, **egalik qilgan** narsang, **o'zing**. MFA — turli toifadagi kamida ikkitasi.
- MFA kuchi: SMS < TOTP < **apparat kalit / passkey** (phishing'ga chidamli).
- O'zingiz boshlamagan kirishni tasdiqlamang; zaxira kodlarni saqlang.
- Sessiya identifikatori va token — vaqtinchalik parol.
- **SSO** — qulay, lekin bitta hisobga hamma narsa bog'lanadi.
- Modellar: DAC, MAC, **RBAC**, ABAC.
- Tamoyillar: eng kam imtiyoz, default deny, vazifalarni ajratish, muntazam ko'rib chiqish.
- Xavflar: huquqlarning yig'ilishi, tashlab ketilgan hisoblar, umumiy admin hisobi.
- Kirish nazorati **har bir so'rovda, serverda** tekshiriladi.
- **Zero Trust**: tarmoqdagi joy ishonch bermaydi.

:::quiz
? Autentifikatsiya va avtorizatsiya farqi nima?
- Ular bir xil narsa
+ Autentifikatsiya — kimligingizni tasdiqlash; avtorizatsiya — sizga nima mumkinligini belgilash
- Avtorizatsiya parolni tekshiradi
- Autentifikatsiya faqat administratorlar uchun
! Avval kimlik tasdiqlanadi, keyin shu kimlikka qaysi amallar ruxsat etilgani tekshiriladi.

? Quyidagilardan qaysi biri haqiqiy ikki omilli autentifikatsiya?
- Parol va maxfiy savol
- Ikki xil parol
+ Parol va telefondagi ilova kodi
- Login va parol
! Omillar turli toifadan bo'lishi kerak: parol — “bilgan narsangiz”, telefon — “egalik qilgan narsangiz”. Parol va maxfiy savol — ikkalasi ham bilim.

? Qaysi ikkinchi omil phishing'ga eng chidamli?
- SMS kod
- Email kod
- TOTP ilovasi kodi
+ Apparat kalit yoki passkey
! Kalit aniq domenga bog'langan — soxta saytda ishlamaydi. Kodlarni esa foydalanuvchi soxta sahifaga kiritib qo'yishi mumkin.

? Telefoningizga siz boshlamagan kirish uchun ketma-ket “tasdiqlaysizmi?” so'rovlari kelyapti. Nima qilasiz?
- To'xtashi uchun “ha” ni bosaman
+ Hech birini tasdiqlamayman va parolni darhol almashtiraman — kimdir uni biladi
- Telefonni o'chirib qo'yaman va unutaman
- Bu oddiy nosozlik
! Bu “MFA charchatish” hujumi: hujumchi parolni biladi va tasdiqni kutyapti. So'rovlar — parol oshkor bo'lganining belgisi.

? Sessiya cookie'si haqida qaysi gap to'g'ri?
- U faqat parol bilan birga ishlaydi
+ U vaqtinchalik parol kabi: uni qo'lga kiritgan kishi foydalanuvchi nomidan ishlay oladi
- U hech qanday xavf tug'dirmaydi
- U MFA dan keyin foydasiz bo'ladi
! Sessiya autentifikatsiyadan keyingi holatni ifodalaydi — uni olgan kishidan parol ham, MFA ham so'ralmaydi.

? RBAC modelida huquqlar qanday beriladi?
- Har bir foydalanuvchiga alohida
+ Rollarga beriladi; foydalanuvchilar rollarga biriktiriladi
- Faqat administrator barcha huquqqa ega
- Tasodifiy
! Rol orqali boshqarish huquqlarni qo'shish va olib tashlashni soddalashtiradi va xatolarni kamaytiradi.

? Foydalanuvchi manzildagi `hisob/1500` ni `hisob/1501` ga o'zgartirib, boshqa odamning hisobini ko'rdi. Bu qanday zaiflik?
- SQL injection
- XSS
+ IDOR — kirish nazorati xatosi
- DDoS
! Server obyekt shu foydalanuvchiga tegishli ekanini tekshirmagan. Identifikatorni bilish ruxsat bo'lmasligi kerak.

? “Privilege creep” (huquqlarning yig'ilishi) nima?
- Hujumchining huquqni oshirishi
+ Xodimning vaqt o'tishi bilan keraksiz huquqlarni to'plab qolishi
- Parolning eskirishi
- Sessiyaning tugashi
! Lavozim o'zgarganda yangi huquq qo'shiladi, eskisi olib tashlanmaydi. Yechim — muntazam ko'rib chiqish.

? Nega umumiy `admin` hisobidan bir necha kishi foydalanishi yomon?
- Parol tez eskiradi
+ Kim qaysi amalni bajarganini aniqlab bo'lmaydi
- Tizim sekinlashadi
- Bu qimmatga tushadi
! Hisobdorlik yo'qoladi; biri ketsa, parolni hamma uchun almashtirish kerak; va parol ko'p qo'lda tarqaladi.

? Zero Trust yondashuvining asosiy g'oyasi nima?
- Hech kimga hech qachon kirish bermaslik
+ Tarmoqdagi joylashuv ishonch bermaydi — har bir so'rov tekshiriladi
- Faqat firewall'ga ishonish
- Parollardan voz kechish
! Ichki tarmoqdan kelgan so'rov ham autentifikatsiya va avtorizatsiyadan o'tadi.

? Kirish huquqi tekshiruvi qayerda bajarilishi kerak?
- Brauzerda, JavaScript bilan
+ Serverda, har bir so'rovda
- Faqat kirish sahifasida, bir marta
- Foydalanuvchi kompyuterida
! Brauzerdagi cheklovlarni foydalanuvchi chetlab o'ta oladi. Ishonchli tekshiruv faqat serverda.

? SSO ning asosiy xavfi nima?
- U juda sekin
+ Bitta hisob buzilsa, unga bog'langan barcha tizimlarga yo'l ochiladi
- U parollarni ko'paytiradi
- U MFA bilan ishlamaydi
! Qulaylikning narxi — markazlashuv. Shuning uchun SSO hisobi eng qattiq himoyalanadi.
:::

:::cards
Autentifikatsiya va avtorizatsiya? :: Autentifikatsiya — kimligingizni isbotlash; avtorizatsiya — sizga nima mumkinligini belgilash.
AAA nima? :: Authentication (kimlik), Authorization (ruxsat), Accounting (hisobdorlik — kim nima qilgani).
Autentifikatsiyaning uch omili? :: Bilgan narsangiz (parol), egalik qilgan narsangiz (telefon, kalit), o'zingiz (biometriya).
MFA nima? :: Turli toifadagi kamida ikki omil bilan autentifikatsiya.
Ikkinchi omillar kuchi bo'yicha? :: SMS/email kod (past) → TOTP ilovasi, push (o'rta) → apparat kalit / passkey (yuqori, phishing'ga chidamli).
TOTP qanday ishlaydi? :: Ilova va sayt umumiy maxfiy kalit va joriy vaqtdan bir xil qisqa muddatli kodni hisoblaydi.
RBAC nima? :: Huquqlar rollarga beriladi, foydalanuvchilar rollarga biriktiriladi.
DAC va MAC farqi? :: DAC — resurs egasi hal qiladi (Linux ruxsatlari); MAC — tizim siyosati, egasi o'zgartira olmaydi.
IDOR nima? :: Identifikatorni o'zgartirib begona obyektga kirish — server egalikni tekshirmagan.
Privilege creep? :: Vaqt o'tishi bilan keraksiz huquqlarning to'planishi; yechim — muntazam ko'rib chiqish.
Zero Trust? :: “Hech qachon sukut bo'yicha ishonma, har doim tekshir” — tarmoqdagi joylashuv ishonch bermaydi.
SSO nima va xavfi? :: Bir marta kirib ko'p tizimdan foydalanish; bitta hisob buzilsa — hammasi ochiladi.
:::
