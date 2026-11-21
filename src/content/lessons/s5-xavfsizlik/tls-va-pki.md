Brauzerda manzil yonidagi qulf belgisini minglab marta ko'rgansiz. HTTP darsida u "ulanish shifrlangan" degani ekanini o'rgandingiz. Lekin bir savol ochiq qoldi: brauzeringiz birinchi marta ko'rayotgan server bilan qanday qilib **maxfiy kalit kelishib oladi** — va u haqiqatan bank serveri ekanini, o'rtaga tushgan hujumchi emasligini **qayerdan biladi?**

Kriptografiya darsidagi uch vosita — simmetrik shifrlash, asimmetrik shifrlash va raqamli imzo — bu yerda bitta mexanizmga birlashadi. Uning nomi TLS.

## TLS nima

[[tls|TLS]] (Transport Layer Security) — ikki dastur orasidagi aloqani himoyalovchi protokol. U uch narsani beradi:

| Kafolat | Ma'nosi | Nima ta'minlaydi |
|---|---|---|
| **Maxfiylik** | Yo'ldagi kuzatuvchi o'qiy olmaydi | Simmetrik shifrlash |
| **Yaxlitlik** | Yo'lda sezdirmasdan o'zgartirib bo'lmaydi | Har xabarga tekshiruv qiymati |
| **Autentifikatsiya** | Server haqiqatan o'zi aytgan kishi | Sertifikat va raqamli imzo |

**SSL** — TLS ning eski nomi va eski versiyalari. Odamlar hali ham "SSL sertifikat" deyishadi, lekin SSL ning o'zi allaqachon xavfsiz emas.

| Versiya | Holati |
|---|---|
| SSL 2.0, SSL 3.0 | **Buzilgan** — ishlatilmasligi kerak |
| TLS 1.0, TLS 1.1 | **Eskirgan** — brauzerlar o'chirgan |
| **TLS 1.2** | Hali qabul qilinadi (to'g'ri sozlansa) |
| **TLS 1.3** | Zamonaviy standart: tezroq va xavfsizroq |

Serverda eski versiyalar yoqilgan bo'lsa — bu tekshiruvlarda doimiy topilma.

TLS faqat veb uchun emas: pochta (SMTP, IMAP), VPN, ma'lumotlar bazasi ulanishlari, API lar — hammasi shu protokol ostida ishlaydi. "HTTPS" — shunchaki "TLS ichidagi HTTP".

## Asosiy muammo: kimga ishonamiz?

Asimmetrik shifrlash kalit almashish muammosini hal qildi: server ochiq kalitini yuboradi, biz u bilan shifrlaymiz. Lekin yangi savol tug'iladi:

**Bu ochiq kalit haqiqatan bankniki ekanini qayerdan bilamiz?**

Tarmoq bosqichidagi Man-in-the-Middle'ni eslang. Hujumchi o'rtaga tushib, sizga **o'z** ochiq kalitini yuborsa:

```
Siz ◄──── hujumchi kaliti ──── Hujumchi ◄──── bank kaliti ──── Bank
    ────── shifrlangan ──────►   (o'qiydi)  ────── shifrlangan ──────►
```

Siz hujumchi bilan mukammal shifrlangan aloqa o'rnatasiz. Shifrlash ishlayapti — lekin noto'g'ri odam bilan.

Demak, shifrlashning o'zi yetarli emas. Kalit **kimga tegishli** ekanini tasdiqlaydigan narsa kerak. Bu — sertifikat.

## Sertifikat

[[certificate|Sertifikat]] — "bu ochiq kalit shu domenga tegishli" degan, ishonchli tashkilot **imzolagan** hujjat. Pasportga o'xshaydi: unda sizning ma'lumotingiz bor va uni davlat tasdiqlagan.

Sertifikat ichida:

| Maydon | Mazmuni |
|---|---|
| **Subject** | Kimga berilgan (domen nomi) |
| **Subject Alternative Name (SAN)** | Sertifikat amal qiladigan barcha domenlar |
| **Public Key** | Egasining ochiq kaliti |
| **Issuer** | Kim bergan (sertifikat markazi) |
| **Validity** | Amal qilish muddati: dan — gacha |
| **Serial Number** | Noyob raqami |
| **Signature** | Beruvchining raqamli imzosi |

Imzo — eng muhim qism. U sertifikatdagi ma'lumotni hech kim o'zgartirmaganini va uni haqiqatan o'sha markaz berganini isbotlaydi. Raqamli imzo darsidagi mexanizm — aynan shu.

Sertifikatning standart formati **X.509** deb ataladi.

## Sertifikat markazlari va ishonch zanjiri

Sertifikatni kim imzolaydi? [[ca|Sertifikat markazi]] — **CA** (Certificate Authority): DigiCert, Sectigo, Let's Encrypt va boshqalar.

Lekin CA ga nega ishonamiz? Chunki uning sertifikati operatsion tizimingiz va brauzeringizga **oldindan o'rnatilgan**. Bu ro'yxat — **ishonchli ildiz sertifikatlar ombori** — yuzga yaqin tashkilotni o'z ichiga oladi.

Amalda zanjir uch bo'g'inli:

```
┌──────────────────────────┐
│  Ildiz CA (Root)         │  ← kompyuteringizda oldindan o'rnatilgan;
│  o'zini o'zi imzolagan   │    yopiq kaliti oflayn seyfda saqlanadi
└────────────┬─────────────┘
             │ imzolaydi
┌────────────▼─────────────┐
│  Oraliq CA (Intermediate)│  ← kundalik ish uchun
└────────────┬─────────────┘
             │ imzolaydi
┌────────────▼─────────────┐
│  Sayt sertifikati        │  ← mybank.uz
│  (Leaf)                  │
└──────────────────────────┘
```

Brauzer zanjirni **pastdan yuqoriga** tekshiradi: sayt sertifikatini oraliq CA imzolaganmi? Oraliq CA ni ildiz imzolaganmi? Ildiz mening ishonchli omborimda bormi? Uchala javob "ha" bo'lsa — qulf paydo bo'ladi.

Bu butun tizim — sertifikatlar, markazlar, zanjirlar, bekor qilish mexanizmlari — [[pki|PKI]] (Public Key Infrastructure) deyiladi.

Ildiz kaliti nega oflayn saqlanadi? Chunki u o'g'irlansa, hujumchi **istalgan** sayt uchun ishonchli sertifikat chiqara oladi. Oraliq CA buzilsa — faqat u bekor qilinadi, ildiz saqlanib qoladi.

## Brauzer nimalarni tekshiradi

Har bir HTTPS ulanishda brauzer quyidagilarni tekshiradi:

1. **Zanjir** ishonchli ildizga olib boradimi?
2. **Imzolar** to'g'rimi?
3. **Muddat** — bugun amal qilish oralig'idami?
4. **Nom** — sertifikatdagi domen manzil satridagi bilan mos keladimi?
5. **Bekor qilinmaganmi?**

Birortasi bajarilmasa — to'liq ekranli ogohlantirish chiqadi.

| Ogohlantirish sababi | Odatiy izoh |
|---|---|
| Muddati tugagan | Ko'pincha ma'mur yangilashni unutgan |
| Nom mos kelmaydi | Noto'g'ri sozlama — yoki siz boshqa serverga tushib qoldingiz |
| Ishonchsiz beruvchi / o'zi imzolangan | Ichki tizim — yoki kimdir o'rtada turibdi |
| Bekor qilingan | Kalit oshkor bo'lgan |

:::warn
Sertifikat ogohlantirishini **"baribir davom etish"** bilan o'tkazib yuborish — TLS ning butun himoyasini o'chirib qo'yish. Brauzer sizga "men bu serverning kimligini tasdiqlay olmayapman" deyapti. Ochiq Wi-Fi'da, bank yoki pochta saytida bunday ogohlantirish — Man-in-the-Middle'ning klassik belgisi. O'tkazib yubormang.
:::

**O'zi imzolangan sertifikat** (self-signed) — CA emas, egasining o'zi imzolagan. Shifrlash ishlaydi, lekin "kimligini" hech kim tasdiqlamagan. Uy laboratoriyasi va ichki sinov uchun yaraydi; ommaviy sayt uchun — yo'q.

## TLS handshake

Endi hammasini birlashtiramiz. Ulanish boshida brauzer va server "salomlashadi" — TLS 1.3 da soddalashtirilgan ko'rinishi:

```
  Brauzer                                              Server
     │                                                    │
     │ ── ClientHello ──────────────────────────────────► │
     │    "TLS 1.3 ni bilaman, mana shu shifrlar           │
     │     va mening kalit almashish qismim"              │
     │                                                    │
     │ ◄───────────────────────────── ServerHello ─────── │
     │    "Shu shifrni tanladim, mana mening qismim"       │
     │ ◄─────────────────── Sertifikat + imzo ─────────── │
     │                                                    │
     │  [sertifikatni tekshiradi:                         │
     │   zanjir, muddat, nom, imzo]                       │
     │                                                    │
     │  Ikkala tomon umumiy simmetrik kalitni hisoblaydi  │
     │                                                    │
     │ ◄══════════ shifrlangan ma'lumot (AES) ══════════► │
```

Qadamlar:

1. **Kelishuv.** Tomonlar protokol versiyasi va algoritmlar to'plamini (**cipher suite**) tanlaydi.
2. **Kalit almashish.** Diffie–Hellman orqali — tinglovchi bila olmaydigan umumiy sir hosil qilinadi.
3. **Autentifikatsiya.** Server sertifikatini yuboradi va handshake ma'lumotini **yopiq kaliti bilan imzolaydi** — shu bilan sertifikat haqiqatan uniki ekanini isbotlaydi. (Sertifikat ochiq hujjat — uni istalgan kishi nusxalashi mumkin; lekin imzo qo'yish uchun yopiq kalit kerak.)
4. **Shifrlangan aloqa.** Butun keyingi trafik umumiy kalit bilan, simmetrik shifrlanadi.

Kriptografiya darsidagi **gibrid sxema** — mana uning haqiqiy ko'rinishi: asimmetrik vositalar kalit kelishish va kimlikni tasdiqlash uchun, simmetrik — ma'lumot uchun.

Har seansda yangi kalit hosil qilingani uchun **forward secrecy** ta'minlanadi: server kaliti kelajakda o'g'irlansa ham, bugun yozib olingan trafikni ochib bo'lmaydi.

Wireshark darsida `tls` filtri bilan `Client Hello` va `Server Hello` ni ko'rgansiz — endi ular nima ekanini bilasiz.

## Sertifikatni o'z ko'zingiz bilan ko'rish

**Brauzerda:** manzil yonidagi qulf (yoki sozlamalar belgisi) → **Connection is secure** → **Certificate is valid**. U yerda: kimga berilgan, kim bergan, muddati, SAN ro'yxati va butun zanjir.

**Terminalda:**

```bash
# Sertifikat va zanjirni ko'rish
openssl s_client -connect example.com:443 -servername example.com

# Faqat asosiy maydonlar
echo | openssl s_client -connect example.com:443 -servername example.com 2>/dev/null \
  | openssl x509 -noout -subject -issuer -dates

# Server qaysi TLS versiyalarini qabul qiladi
nmap --script ssl-enum-ciphers -p 443 example.com
```

O'z saytingiz sozlamalarini to'liq baholash uchun: **SSL Labs** (`ssllabs.com/ssltest`) — u A dan F gacha baho qo'yadi va har bir muammoni tushuntiradi.

## Sertifikat turlari

**Tekshiruv darajasiga ko'ra:**

| Tur | Nima tekshiriladi |
|---|---|
| **DV** (Domain Validation) | Faqat domenni boshqarishingiz. Avtomatik, bir necha daqiqada, bepul (Let's Encrypt) |
| **OV** (Organization Validation) | Domen + tashkilot haqiqatan mavjudligi |
| **EV** (Extended Validation) | Chuqurroq yuridik tekshiruv |

Muhim nuqta: uchalasida ham **shifrlash bir xil**. Farq — faqat egasi qanchalik tekshirilganida. DV sertifikatni istalgan kishi — firibgar ham — o'z domeniga bir daqiqada oladi. Shuning uchun phishing darsidagi qoida: **qulf sayt halolligini bildirmaydi**, faqat "siz manzil satridagi domen bilan shifrlangan holda gaplashyapsiz" degani. Domenning o'zi to'g'rimi — buni siz tekshirasiz.

**Qamroviga ko'ra:** bitta domen; **wildcard** (`*.example.com` — barcha birinchi darajali subdomenlar); ko'p domenli (SAN ro'yxati).

## Certificate Transparency

Har bir chiqarilgan ommaviy sertifikat ochiq, o'zgartirib bo'lmaydigan jurnallarga yoziladi — **Certificate Transparency** (CT). Maqsad: CA xato yoki g'arazli ravishda begona domenga sertifikat chiqarsa, domen egasi buni payqasin.

Yon ta'siri: bu jurnallar — razvedka uchun qimmatli ochiq manba. `crt.sh` saytida domen bo'yicha qidirsangiz, unga chiqarilgan barcha sertifikatlar — demak **subdomenlar** ham — ko'rinadi. DNS darsida "subdomenlar ochiq manbalardan topiladi" deganimiz shu. O'z tashkilotingiz uchun buni tekshirib ko'ring: unutilgan `test`, `dev`, `old` tizimlar ko'pincha shu yerda chiqadi.

## Keng tarqalgan xatolar

Tekshiruvlarda uchraydigan TLS muammolari:

| Muammo | Xavfi |
|---|---|
| Eskirgan protokollar yoqilgan (SSL 3.0, TLS 1.0/1.1) | Ma'lum hujumlarga ochiq |
| Zaif shifrlar (RC4, 3DES, eksport darajasidagi) | Shifrlash amalda buziladi |
| Muddati tugagan sertifikat | Foydalanuvchilar ogohlantirishni o'tkazib yuborishga o'rganadi |
| Sayt HTTP dan HTTPS ga yo'naltirmaydi | Birinchi so'rov ochiq ketadi |
| **HSTS** sarlavhasi yo'q | Foydalanuvchini HTTP ga "tushirish" mumkin |
| Sahifada HTTP orqali yuklanadigan resurslar (mixed content) | Shifrlanmagan qism o'zgartirilishi mumkin |
| Yopiq kalit zaif himoyalangan yoki repozitoriyga tushgan | Sertifikat hujumchi qo'lida |
| Dasturda sertifikat tekshiruvi o'chirilgan | Himoya butunlay yo'q |

Oxirgi qator — dasturchilarning klassik xatosi. Sinov paytida sertifikat xatosi chiqadi, dasturchi "tekshirma" degan sozlamani yoqadi (`verify=False`, `curl -k`) — va u ishlab chiqarishga shu holda ketadi. Shifrlash bor, lekin dastur **istalgan** sertifikatni qabul qiladi — o'rtadagi hujumchinikini ham. Kod tekshiruvida `verify=False` — qizil bayroq.

**HSTS** (Strict-Transport-Security) — Python darsidagi sarlavhalardan biri: brauzerga "bu saytga keyingi safar ham faqat HTTPS orqali kir" deydi.

## TLS nimani himoya qilmaydi

Chegaralarni bilish — vositani bilish kabi muhim:

- **Serverning o'zini.** TLS yo'lni himoya qiladi. Server buzilgan bo'lsa yoki ilovada zaiflik bo'lsa — foydasi yo'q.
- **Chekka nuqtalarni.** Kompyuteringizdagi zararli dastur ma'lumotni shifrlanishdan **oldin** ko'radi.
- **Metama'lumotni.** Kim bilan, qachon, qancha — ko'rinadi (HTTP darsi).
- **Saytning halolligini.** Phishing sayti ham to'g'ri sertifikatga ega.

Yana bir holat: **korporativ tekshiruv**. Ko'p tashkilotlar xodimlar trafigini zararli dasturlarga tekshirish uchun TLS ni proksi serverda ochadi: xodimlar kompyuteriga tashkilotning o'z ildiz sertifikati o'rnatiladi, proksi esa har sayt uchun "o'z" sertifikatini chiqaradi. Texnik jihatdan bu — ruxsat berilgan Man-in-the-Middle. Shuning uchun **ishonchli ildizlar ro'yxatiga nima qo'shilgani** — auditning muhim nuqtasi: u yerda notanish ildiz sertifikati bo'lsa, kimdir butun shifrlangan trafikni o'qiy olishi mumkin.

:::try
**1. Brauzerda.** Istalgan HTTPS saytda qulfni bosib, sertifikatni oching. Toping: kimga berilgan, kim bergan (Issuer), muddati qachon tugaydi, SAN ro'yxatida qaysi domenlar bor, zanjirda nechta bo'g'in.

**2. Ataylab buzilgan misollar.** `badssl.com` — sinov uchun mo'ljallangan sayt. `expired.badssl.com`, `wrong.host.badssl.com`, `self-signed.badssl.com` ni ochib ko'ring: brauzer har biriga qanday ogohlantirish beradi va ularda farq nimada?

**3. Terminalda** (Kali yoki Git Bash):

```bash
echo | openssl s_client -connect google.com:443 -servername google.com 2>/dev/null | openssl x509 -noout -subject -issuer -dates
```

**4. Ochiq jurnallar.** `crt.sh` saytida biror katta kompaniya domenini qidiring. Nechta subdomen ko'rindi?

**5. O'z saytingiz bo'lsa** — uni SSL Labs testidan o'tkazing.
:::

## Xulosa

- **TLS** maxfiylik, yaxlitlik va server autentifikatsiyasini beradi; SSL — eskirgan nomi.
- Zamonaviy: **TLS 1.3** (va 1.2); SSL va TLS 1.0/1.1 — o'chirilishi kerak.
- Shifrlashning o'zi yetarli emas — kalit **kimniki** ekanini **sertifikat** tasdiqlaydi.
- **Ishonch zanjiri**: sayt sertifikati ← oraliq CA ← ildiz CA (tizimga oldindan o'rnatilgan).
- Brauzer tekshiradi: zanjir, imzo, muddat, nom, bekor qilinmagani.
- **Handshake**: algoritmlarni kelishish → kalit almashish → sertifikat va imzo → simmetrik shifrlangan aloqa.
- DV, OV, EV — shifrlash bir xil; qulf sayt halolligini bildirmaydi.
- Sertifikat ogohlantirishini o'tkazib yubormang; kodda `verify=False` — qizil bayroq.
- TLS yo'lni himoya qiladi — serverni, chekka nuqtani va metama'lumotni emas.

:::quiz
? TLS qaysi uch narsani ta'minlaydi?
+ Maxfiylik, yaxlitlik va server autentifikatsiyasi
- Tezlik, siqish va keshlash
- Anonimlik, viruslardan himoya va zaxira nusxa
- Faqat shifrlash
! Shifrlash — maxfiylik; tekshiruv qiymatlari — yaxlitlik; sertifikat — server kimligini tasdiqlash.

? Sertifikat nimani tasdiqlaydi?
- Sayt xavfsiz va halol ekanini
+ Ochiq kalit ko'rsatilgan domenga tegishli ekanini — ishonchli markaz imzosi bilan
- Saytda virus yo'qligini
- Serverning tezligini
! Sertifikat kalit va domen o'rtasidagi bog'lanishni tasdiqlaydi. Sayt egasining niyati haqida hech narsa demaydi.

? Brauzer notanish saytning sertifikatiga nega ishonadi?
- Chunki hamma sertifikatlar ishonchli
+ Chunki uni imzolagan markazning ildiz sertifikati tizimga oldindan o'rnatilgan — ishonch zanjiri orqali
- Chunki sayt HTTPS ishlatadi
- Chunki foydalanuvchi ruxsat bergan
! Brauzer zanjirni tekshiradi: sayt ← oraliq CA ← ildiz CA. Ildiz ishonchli omborda bo'lsa — zanjir qabul qilinadi.

? Ochiq Wi-Fi'da bank saytiga kirayotganingizda brauzer sertifikat xatosi haqida ogohlantirdi. Nima qilasiz?
- “Baribir davom etish”ni bosaman
+ Davom etmayman — bu aloqa o'rtasida kimdir turganining belgisi bo'lishi mumkin
- Brauzerni almashtiraman va davom etaman
- Antivirusni o'chiraman
! Ogohlantirish — brauzer server kimligini tasdiqlay olmadi degani. O'tkazib yuborish TLS himoyasini bekor qiladi.

? TLS handshake'da asimmetrik kriptografiya nima uchun ishlatiladi?
- Butun trafikni shifrlash uchun
+ Simmetrik kalitni xavfsiz kelishish va server kimligini tasdiqlash uchun
- Trafikni siqish uchun
- Faqat cookie'larni himoyalash uchun
! Asimmetrik usul sekin — u faqat boshida ishlatiladi. Ma'lumotning o'zi tez simmetrik algoritm bilan shifrlanadi.

? Server sertifikatini istalgan kishi nusxalab olishi mumkin. Unda hujumchi nega uni ishlata olmaydi?
- Sertifikat shifrlangan
+ Handshake'da server yopiq kalit bilan imzo qo'yishi kerak — u esa faqat haqiqiy egasida
- Sertifikat faqat bir marta ishlaydi
- Brauzer IP manzilni tekshiradi
! Sertifikat ochiq hujjat. Unga egalikni isbotlash uchun mos yopiq kalit bilan imzolash talab qilinadi.

? DV sertifikatli phishing sayti brauzerda qanday ko'rinadi?
- Qizil ogohlantirish bilan
+ Oddiy qulf belgisi bilan — haqiqiy sayt kabi
- Umuman ochilmaydi
- “Xavfli” yozuvi bilan
! DV sertifikat faqat domenni boshqarishni tekshiradi; firibgar o'z domeniga uni bir necha daqiqada oladi.

? Dastur kodida `requests.get(url, verify=False)` qatorini ko'rdingiz. Bu nimani anglatadi?
- So'rov tezroq bajariladi
+ Sertifikat tekshiruvi o'chirilgan — dastur o'rtadagi hujumchining sertifikatini ham qabul qiladi
- So'rov shifrlanmaydi
- Bu standart sozlama
! Shifrlash qoladi, lekin kim bilan gaplashayotgani tekshirilmaydi — Man-in-the-Middle'dan himoya yo'qoladi.

? Qaysi protokol versiyalari bugun o'chirilgan bo'lishi kerak?
+ SSL 3.0, TLS 1.0 va TLS 1.1
- TLS 1.2 va TLS 1.3
- Faqat TLS 1.3
- Hech biri
! SSL va erta TLS versiyalarida ma'lum zaifliklar bor. Qabul qilinadiganlari — TLS 1.2 (to'g'ri sozlangan) va 1.3.

? O'zi imzolangan (self-signed) sertifikat haqida nima to'g'ri?
- U shifrlamaydi
+ Shifrlash ishlaydi, lekin egasining kimligini hech kim tasdiqlamagan
- U eng ishonchli tur
- Uni faqat banklar ishlatadi
! Imzolovchi — egasining o'zi; ishonch zanjiri yo'q. Laboratoriya uchun yaraydi, ommaviy sayt uchun emas.

? Certificate Transparency jurnallari razvedkada nega foydali?
- Ular parollarni saqlaydi
+ Ularda domenga chiqarilgan barcha sertifikatlar, demak subdomenlar ko'rinadi
- Ular trafikni shifrdan chiqaradi
- Ular faqat banklar uchun
! Har bir ommaviy sertifikat ochiq jurnalga yoziladi — undan subdomenlar ro'yxatini yig'ish mumkin.

? TLS quyidagilardan qaysi birini himoya qilmaydi?
- Yo'ldagi trafik mazmunini
- Trafikning yo'lda o'zgartirilishini
+ Buzilgan server yoki zararlangan kompyuterdagi ma'lumotni
- Parolning tarmoqda ushlab olinishini
! TLS faqat ikki nuqta orasidagi yo'lni himoya qiladi. Chekka nuqtalarning o'zi buzilgan bo'lsa — yordam bermaydi.
:::

:::cards
TLS nima beradi? :: Maxfiylik (shifrlash), yaxlitlik va server autentifikatsiyasi (sertifikat).
SSL va TLS farqi? :: SSL — eski, buzilgan versiyalar. Hozir TLS 1.2 va 1.3 ishlatiladi.
Sertifikat nima? :: “Bu ochiq kalit shu domenga tegishli” degan, sertifikat markazi imzolagan hujjat.
Ishonch zanjiri? :: Sayt sertifikati ← oraliq CA ← ildiz CA; ildiz tizimga oldindan o'rnatilgan.
Brauzer sertifikatda nimalarni tekshiradi? :: Zanjir, imzolar, amal qilish muddati, domen nomi mosligi, bekor qilinmagani.
TLS handshake bosqichlari? :: Algoritmlarni kelishish → kalit almashish → sertifikat va imzo → simmetrik shifrlangan aloqa.
DV, OV, EV farqi? :: Egasini tekshirish darajasi: DV — faqat domen; OV — tashkilot; EV — chuqur tekshiruv. Shifrlash bir xil.
Self-signed sertifikat? :: Egasining o'zi imzolagan: shifrlash bor, kimlik tasdiqlanmagan.
verify=False nega xavfli? :: Sertifikat tekshiruvi o'chadi — dastur istalgan, jumladan hujumchining sertifikatini qabul qiladi.
HSTS nima? :: Strict-Transport-Security sarlavhasi: brauzerni bu sayt bilan faqat HTTPS ishlatishga majburlaydi.
Certificate Transparency? :: Chiqarilgan sertifikatlarning ochiq jurnallari; crt.sh orqali subdomenlarni ko'rish mumkin.
TLS nimani himoya qilmaydi? :: Serverning o'zini, zararlangan qurilmani, metama'lumotni va saytning halolligini.
:::
