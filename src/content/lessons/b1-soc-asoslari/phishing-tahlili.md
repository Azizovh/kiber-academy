Kompaniyaning "Phishing'ni xabar qilish" tugmasi bosildi. Xodim shubhali xatni yubordi:

> **Kimdan:** MyBank Xavfsizlik xizmati
> **Mavzu:** Hisobingiz vaqtincha bloklandi — 24 soat ichida tasdiqlang
>
> Hurmatli mijoz, hisobingizda shubhali faoliyat aniqlandi. Bloklanishning oldini olish uchun quyidagi havola orqali ma'lumotlaringizni tasdiqlang: **Hisobni tasdiqlash**

Xavfsizlik bosqichidagi ijtimoiy muhandislik darsida bunday xatlarni **foydalanuvchi** sifatida tanishni o'rgangansiz: shoshiltirish, qo'rqitish, noaniq murojaat. Endi siz — **analitik**. Sizning savollaringiz boshqacha: bu xat aslida qayerdan kelgan? Havola qayerga olib boradi? Yana kim bu xatni oldi? Kimdir havolani bosdimi?

[[phishing|Phishing]] — kompaniyalarga hujumlarning eng ko'p uchraydigan boshlanish nuqtasi. Shuning uchun phishing tahlili — L1 analitigining kundalik ishi.

## Xatning anatomiyasi

Pochta mijozida siz xatning faqat kichik qismini ko'rasiz. Har bir xatning ikki qatlami bor:

```
┌─ Sarlavhalar (headers) ─────────────────────────────┐
│  Received: from ... by ...      ← qaysi serverlardan o'tgan
│  Return-Path: <bounce@...>      ← texnik jo'natuvchi
│  From: "MyBank" <...>           ← ko'rinadigan jo'natuvchi
│  Reply-To: <...>                ← javob qayerga ketadi
│  Subject: ...                   
│  Message-ID: <...>              
│  Authentication-Results: ...    ← SPF, DKIM, DMARC natijalari
├─ Tana (body) ───────────────────────────────────────┤
│  Matn, HTML, havolalar                              
├─ Ilovalar (attachments) ────────────────────────────┤
│  faktura.pdf, ...                                   
└─────────────────────────────────────────────────────┘
```

Sarlavhalarni ko'rish uchun xatning **manbasini** oching: Gmail'da "Show original", Outlook'da "View message source" yoki xat xususiyatlari. Tahlil uchun xatni `.eml` fayl sifatida saqlash eng yaxshisi.

:::warn
Xodimdan shubhali xatni **ilova sifatida** yuborishni so'rang (yoki kompaniyaning maxsus "Report phishing" tugmasidan foydalaning). Oddiy "Forward" qilinganda asl sarlavhalar yo'qoladi — va ular bilan birga eng muhim dalillar ham. Va xodimdan havolani "tekshirib ko'rish uchun" bosmaslikni so'rang.
:::

## Uchta "jo'natuvchi"

Phishing tahlilidagi birinchi muhim tushuncha: xatda jo'natuvchi bir nechta joyda ko'rsatiladi va ular **bir-biriga mos kelishi shart emas**.

| Maydon | Nima | Kim ko'radi |
|---|---|---|
| **From** (header from) | Pochta mijozida ko'rinadigan jo'natuvchi | Foydalanuvchi |
| **Return-Path** (envelope from) | Serverlar o'rtasidagi texnik jo'natuvchi — xat qaytsa, shu manzilga | Serverlar |
| **Reply-To** | "Javob berish"ni bosganda qayerga ketadi | Foydalanuvchi javob berganda |

Bundan tashqari, From maydonining o'zi ikki qismdan iborat:

```
From: "MyBank Xavfsizlik xizmati" <security@mybank-uz-support.example>
       └──── ko'rsatiladigan nom ────┘ └────────── haqiqiy manzil ───────┘
```

Ko'rsatiladigan nom — **har qanday matn** bo'lishi mumkin; uni hech kim tekshirmaydi. Telefonda ko'pincha faqat shu nom ko'rinadi. Haqiqiy manzil esa — `mybank-uz-support.example` — bankka umuman aloqasi yo'q domen. Tarmoq loglari darsidagi qoida: domenni **o'ngdan chapga** o'qing.

`Reply-To` ning `From` dan farq qilishi ham tez-tez uchraydigan belgi: xat "bankdan" keladi, lekin javob begona pochta qutisiga ketadi.

## Received zanjiri: xatning yo'li

Har bir pochta serveri xatni qabul qilganda tepasiga bitta `Received:` qatorini qo'shadi. Natijada xatning to'liq yo'li yozilgan bo'ladi — **pastdan tepaga** o'qiladi:

```
Received: from mx.kompaniya.example (10.10.10.5) by mail.kompaniya.example ...    ← 3. oxirgi qadam
          Sun, 16 Nov 2026 09:14:22 +0500
Received: from mail.mybank-uz-support.example (203.0.113.45)
          by mx.kompaniya.example ...                                         ← 2. kompaniyamiz qabul qildi
          Sun, 16 Nov 2026 09:14:21 +0500
Received: from [198.51.100.77] by mail.mybank-uz-support.example ...    ← 1. xat shu yerdan boshlangan
          Sun, 16 Nov 2026 04:14:19 +0000
```

Eng pastdagi qator — xatning boshlanish nuqtasiga eng yaqin. Bir nechta muhim narsa:

- Sizning serveringiz yozgan qatorlarga **ishonsa bo'ladi**. Undan pastdagilarni jo'natuvchi o'zi yozgan bo'lishi mumkin — ular soxta bo'lishi mumkin.
- Eng ishonchli nuqta — **sizning serveringiz xatni kimdan qabul qilgani** (yuqoridagi 2-qator: `203.0.113.45`). Bu IP'ni obro' xizmatlarida tekshiring.
- Vaqt mintaqalariga e'tibor bering (`+0500` va `+0000`) — triage darsidagi tuzoq yana shu yerda.

## SPF, DKIM, DMARC — kim jo'natganini tekshirish

[[smtp|SMTP]] protokoli 1980-yillarda yaratilgan va u jo'natuvchini umuman tekshirmaydi: istalgan server istalgan nomdan xat yubora oladi. Bu muammoni hal qilish uchun keyinroq uchta mexanizm qo'shilgan. Ularning hammasi [[dns|DNS]] yozuvlariga asoslanadi.

### SPF — "kim mening nomimdan yubora oladi?"

[[spf|SPF]] — domen egasi DNS'da ruxsat etilgan jo'natuvchi serverlar ro'yxatini e'lon qiladi:

```
mybank.uz.   TXT   "v=spf1 ip4:198.51.100.0/24 include:_spf.example-mail.net -all"
```

Ma'nosi: "mybank.uz nomidan faqat `198.51.100.0/24` tarmog'idagi serverlar va `example-mail.net` xizmati yubora oladi; qolganlarning hammasi (`-all`) — rad etilsin." Tarmoq bosqichidagi [[cidr|CIDR]] yozuvini eslaysiz.

Natijalar: `pass`, `fail`, `softfail` (`~all` — shubhali, lekin qabul qilinadi), `neutral`, `none` (SPF yozuvi yo'q).

**Muhim cheklov:** SPF ko'rinadigan `From` ni emas, texnik **Return-Path** domenini tekshiradi. Hujumchi Return-Path'ga o'z domenini qo'yib, SPF'dan muvaffaqiyatli o'tishi mumkin — `From` da esa boshqa nom yozadi.

### DKIM — "xat haqiqatan shu domendan va o'zgartirilmagan"

[[dkim|DKIM]] — jo'natuvchi server xatga [[digital-signature|raqamli imzo]] qo'yadi. Qabul qiluvchi domenning DNS'dagi **ochiq kaliti** bilan imzoni tekshiradi. Kriptografiya darsidagi assimetrik shifrlashning amaliy qo'llanishi:

```
DKIM-Signature: v=1; a=rsa-sha256; d=mybank.uz; s=sel2026; h=from:subject:date; b=...
                                     └─ domen ─┘  └selektor┘
Ochiq kalit qayerda:  sel2026._domainkey.mybank.uz   TXT   "v=DKIM1; k=rsa; p=..."
```

DKIM ikki narsani isbotlaydi: xat `d=` domeni tomonidan imzolangan va yo'lda **o'zgartirilmagan**. Lekin u ham `From` dagi domen bilan bir xil bo'lishini talab qilmaydi.

### DMARC — "ikkalasini ko'rinadigan From bilan bog'lash"

[[dmarc|DMARC]] yuqoridagi bo'shliqni yopadi. U talab qiladi: SPF yoki DKIM dan o'tgan domen **ko'rinadigan From domeniga mos kelishi** kerak (bu "alignment" deyiladi). Va domen egasi tekshiruvdan o'tmagan xatlar bilan nima qilishni aytadi:

```
_dmarc.mybank.uz.   TXT   "v=DMARC1; p=reject; rua=mailto:dmarc@mybank.uz"
```

| Siyosat | Ma'nosi |
|---|---|
| `p=none` | Faqat kuzatish — hech narsa qilmaslik, hisobot yuborish |
| `p=quarantine` | Spam papkasiga |
| `p=reject` | Rad etish — xat yetib bormaydi |

### Authentication-Results — natijani o'qish

Qabul qiluvchi server tekshiruv natijalarini sarlavhaga yozadi:

```
Authentication-Results: mx.kompaniya.example;
    spf=pass smtp.mailfrom=mybank-uz-support.example;
    dkim=pass header.d=mybank-uz-support.example;
    dmarc=pass header.from=mybank-uz-support.example
```

Hammasi `pass`! Demak, xat xavfsizmi? **Yo'q.** Bu natija faqat bitta narsani isbotlaydi: xat haqiqatan `mybank-uz-support.example` domenidan kelgan. Lekin bu domenni hujumchi o'zi sotib olgan va to'g'ri sozlagan. U bankka tegishli emas.

:::key
**SPF, DKIM va DMARC "bu xat shu domendan keldimi?" degan savolga javob beradi — "bu domen yaxshimi?" degan savolga emas.** Ular haqiqiy `mybank.uz` nomini soxtalashtirishdan himoya qiladi. Lekin `mybank-uz-support.example` kabi o'xshatma domendan kelgan xat hammasidan bemalol o'tadi. Shuning uchun `pass` ni ko'rib to'xtamang — keyingi savol doim: **bu domen kimga tegishli va u qachon yaratilgan?** Va aksincha: `fail` ham har doim hujum emas — xatni qayta yo'naltirish (forwarding) va noto'g'ri sozlangan qonuniy xizmatlar ham SPF'ni buzadi.
:::

## Havolalarni tahlil qilish

Xat tanasida eng muhim narsa — havolalar. Ularning asosiy hiylasi: **ko'rinadigan matn va haqiqiy manzil turlicha bo'lishi mumkin.**

```
Ko'rinadi:    https://mybank.uz/verify
Aslida:       https://mybank.uz.account-verify.example/login?id=7f3a91
```

Xat manbasida (HTML'da) haqiqiy manzil `href` atributida yoziladi. Brauzerda havola ustiga sichqonchani olib borsangiz (bosmasdan!), pastki burchakda haqiqiy manzil ko'rinadi.

Havoladagi shubhali belgilar:

| Belgi | Misol |
|---|---|
| Haqiqiy nom subdomen sifatida | `mybank.uz.account-verify.example` |
| O'xshatma nom | `rnybank.uz`, `mybamk.uz` |
| Punycode (boshqa alifbo harflari) | `xn--...` bilan boshlanadigan domen — ko'rinishi `mybank.uz` ga o'xshash bo'lishi mumkin |
| Qisqartirilgan havola | Qisqa havola xizmatlari — haqiqiy manzil yashirin |
| Domen o'rniga IP | `http://203.0.113.45/login` |
| Ishonchli xizmatda joylashgan sahifa | Ommaviy hujjat yoki forma xizmatlarida yaratilgan "kirish sahifasi" |
| Noyob identifikator | `?id=7f3a91` — kim bosganini kuzatish uchun |

Oxirgi qatorga e'tibor bering: noyob identifikatorli havolani o'zingiz ochsangiz, hujumchi **xatni kimdir tekshirayotganini** bilib qoladi. Shuning uchun:

- Havolani **hech qachon** ish kompyuteringizda ochmang.
- **urlscan.io** kabi xizmatlar sahifani o'z serverlarida ochib, skrinshot va tafsilotlarni ko'rsatadi. Lekin ommaviy skanerlash natijalari **boshqalarga ko'rinadi** — maxfiy ma'lumotli havolalar uchun "Private" rejimdan foydalaning.
- Chuqur tahlil — faqat ajratilgan laboratoriya muhitida (sandbox, VM).

## Ilovalarni tahlil qilish

| Fayl turi | Nega xavfli |
|---|---|
| `.exe`, `.scr`, `.com` | To'g'ridan-to'g'ri ishga tushadigan dastur |
| `.js`, `.vbs`, `.hta`, `.wsf` | Windows'da ikki marta bosilsa ishga tushadigan skriptlar |
| `.docm`, `.xlsm` | Makrosli ofis hujjatlari — Word → PowerShell zanjiri (Sysmon darsi) |
| `.iso`, `.img`, `.zip`, `.rar` | Ichidagi faylni yashiradi; parolli arxivni pochta filtri ocha olmaydi |
| `.lnk` | Yorliq — istalgan buyruqni ishga tushirishi mumkin |
| `.html`, `.htm` | Kompyuterda ochiladigan soxta kirish sahifasi |
| `faktura.pdf.exe` | Ikki kengaytma — Windows ma'lum kengaytmalarni yashirsa, `faktura.pdf` bo'lib ko'rinadi |

Xatda "parol: 1234" bilan yuborilgan parolli arxiv — klassik belgi: parol pochta filtrlarini aylanib o'tish uchun.

Ilovani tekshirish tartibi — triage va trafik darslaridagi bilan bir xil:

1. **Xeshini oling** va xesh bo'yicha qidiring (faylni ommaviy xizmatga **yuklamang**).
2. Fayl turini **magic bytes** bo'yicha tekshiring — kengaytmaga ishonmang.
3. Ofis hujjatlarida makros bormi — statik tekshiruv vositalari bilan, faylni **ochmasdan**:

```bash
# oletools — ofis hujjatlarini ochmasdan tekshirish (laboratoriya VM'ida)
pip install oletools
oleid shubhali.docm        # umumiy belgilar: makros bormi, shifrlanganmi
olevba shubhali.docm       # makros matnini chiqarish va shubhali kalit so'zlarni belgilash
```

4. Kerak bo'lsa — kompaniyaning ichki **sandbox**ida dinamik tahlil: fayl ajratilgan muhitda ochiladi va nima qilishi kuzatiladi. Ommaviy sandbox'larga yuklangan fayllar ham ko'pincha ochiq bo'ladi — kompaniya qoidalarini bilib oling.

## Phishing turlari — nimani qidirayotganingizni biling

| Tur | Maqsad | Asosiy belgi |
|---|---|---|
| **Kirish ma'lumotlarini o'g'irlash** | Login va parol | Soxta kirish sahifasiga havola |
| **Zararli dastur yetkazish** | Qurilmani zararlash | Ilova yoki fayl yuklash havolasi |
| **BEC** (Business Email Compromise) | Pul o'tkazish yoki rekvizit almashtirish | Havola ham, ilova ham yo'q — faqat iltimos: "hisob raqamimiz o'zgardi" |
| **Spear phishing** | Aniq shaxs | Shaxsiy tafsilotlar, ishonchli kontekst |
| **QR phishing** | Telefon orqali | Havola QR kod rasmi ichida — matn filtrlari ko'rmaydi |

**BEC** — eng qiyini: unda texnik tekshirish uchun hech narsa yo'q. Xat ko'pincha haqiqiy, lekin buzilgan hamkor pochtasidan keladi va hammasi `pass` bo'ladi. Uni faqat **mazmun** va **jarayon** bilan to'xtatish mumkin: rekvizit o'zgarishini boshqa kanal orqali — ma'lum telefon raqamiga qo'ng'iroq qilib — tasdiqlash.

## Tahlildan keyin: javob choralari

Xat zararli deb topildi. Endi — uning **ta'sirini** aniqlash va to'xtatish. Bu yerda o'tgan barcha darslar birlashadi:

| Savol | Qayerdan javob | Chora |
|---|---|---|
| Yana kim shu xatni oldi? | Pochta tizimida jo'natuvchi, mavzu, havola bo'yicha qidiruv | Barcha qutilardan o'chirish |
| Kim havolani bosdi? | **Proxy va DNS loglari** — havola domeni bo'yicha | Ro'yxat tuzish |
| Kim ma'lumot kiritdi? | Proxy'da shu domenga **POST** so'rovlari | Parolni almashtirish, faol seanslarni bekor qilish, MFA'ni tekshirish |
| Kim ilovani ochdi? | **Sysmon** (Word → PowerShell), EDR | Qurilmani ajratish, eskalatsiya |
| Takrorlanishini qanday to'xtatish? | — | Domen, URL, jo'natuvchi va xeshlarni bloklash |

Ko'rib turganingizdek, phishing tahlili xatning o'zida tugamaydi: haqiqiy savol — **"kimdir aldandimi?"** Va bunga javob — proxy, DNS va qurilma loglarida.

## Hisobot

Phishing tahlili natijasi — qisqa va aniq hisobot (alert triage darsidagi tiket tuzilishi):

```
XULOSA:     Zararli — kirish ma'lumotlarini o'g'irlashga qaratilgan phishing.
            Kampaniya: 37 ta qutiga yetib borgan. 3 kishi bosgan, 1 kishi ma'lumot kiritgan.

XAT:        From: "MyBank Xavfsizlik xizmati" <security@mybank-uz-support[.]example>
            Reply-To: boshqa tashqi pochta manzili
            Mavzu: "Hisobingiz vaqtincha bloklandi — 24 soat ichida tasdiqlang"
            Jo'natuvchi server: 203.0.113[.]45
            SPF/DKIM/DMARC: pass (hujumchi domeni uchun) — domen 3 kun oldin ro'yxatdan o'tgan

HAVOLA:     hxxps://mybank.uz.account-verify[.]example/login — soxta kirish sahifasi

TA'SIR:     Bosganlar (proxy logi): a.yusupov, d.karimova, b.toshev
            Ma'lumot kiritgan (POST): d.karimova — 09:41

CHORALAR:   Xat 37 ta qutidan o'chirildi. Domen va jo'natuvchi bloklandi.
            d.karimova paroli almashtirildi, seanslari bekor qilindi (09:58).

IOC:        mybank-uz-support[.]example, account-verify[.]example, 203.0.113[.]45
```

## Phishing'ni nima to'xtatmaydi

Halol bo'laylik:

- **Pochta filtrlari** — yangi domen va noyob matnli xatlarning bir qismi baribir o'tadi.
- **SPF/DKIM/DMARC** — o'xshatma domenlarni va buzilgan haqiqiy qutilarni to'xtatmaydi.
- **Xodimlar treningi** — xatolarni kamaytiradi, lekin nolga tushirmaydi. Charchagan odam baribir bir kun bosadi.

Shuning uchun himoya qatlamli (himoya qatlamlari darsini eslang): filtr + autentifikatsiya + trening + **[[mfa|MFA]]** (parol o'g'irlansa ham) + tez xabar berish madaniyati + SOC monitoringi. Xodim "bosib qo'ydim" deb **tez** xabar bersa — bu muvaffaqiyat, jazolash sababi emas. Uyalgan xodim indamaydi — va hujumchi bir necha soat yutadi.

:::try
**1. Sarlavhalarni o'qing.** O'z pochta qutingizdagi istalgan **haqiqiy** reklama xatining manbasini oching ("Show original"). Toping: `Return-Path`, `From`, eng pastki `Received` qatori, `Authentication-Results` dagi SPF, DKIM, DMARC natijalari. `DKIM-Signature` dagi `d=` qaysi domen?

**2. DNS yozuvlari.** Terminalda istalgan katta pochta domeni uchun tekshiring:

```bash
nslookup -type=TXT example.com          # SPF yozuvi ("v=spf1 ...")
nslookup -type=TXT _dmarc.example.com   # DMARC siyosati
```

`-all` mi yoki `~all`? DMARC siyosati `none`, `quarantine` yoki `reject`?

**3. Havola tahlili (xayoliy).** Quyidagi havolalardan qaysi biri haqiqatan `mybank.uz` ga tegishli?
- `https://online.mybank.uz/login`
- `https://mybank.uz.secure-check.example/login`
- `https://mybank-uz.example/login`
- `https://www.mybank.uz/kartalar`

**4. TryHackMe** — "Phishing Analysis Fundamentals" va undan keyingi phishing xonalarini bajaring.

*Javoblar: 1 — reklama xatlarida ko'pincha Return-Path pochta tarqatish xizmati domenida bo'ladi, From esa kompaniya domenida — bu normal; DMARC'dan o'tishi uchun DKIM imzosi (`d=`) kompaniya domeniga mos bo'lishi kerak. 2 — katta kompaniyalarda ko'pincha `-all` yoki `~all` va `p=reject` yoki `p=quarantine`. 3 — faqat birinchi va to'rtinchisi: ikkalasida ham oxirgi qism `mybank.uz`. Ikkinchisining egasi — `secure-check.example`, uchinchisiniki — `mybank-uz.example`.*
:::

## Xulosa

- Xatni **manbasi** bilan tahlil qiling; xodimdan uni **ilova sifatida** yuborishni so'rang.
- Uchta "jo'natuvchi": **From** (ko'rinadigan), **Return-Path** (texnik), **Reply-To** (javob manzili). Ko'rsatiladigan nom — istalgan matn.
- **Received** zanjiri pastdan tepaga o'qiladi; faqat o'z serveringiz yozgan qatorlarga ishoning.
- **SPF** — ruxsat etilgan serverlar (Return-Path domeni uchun); **DKIM** — imzo va yaxlitlik; **DMARC** — ularni ko'rinadigan From bilan bog'laydi va siyosat belgilaydi.
- **`pass` ≠ xavfsiz**: o'xshatma domen hammasidan o'tadi. Keyingi savol — domen kimniki va qachon yaratilgan.
- Havola: ko'rinadigan matn ≠ haqiqiy manzil; domenni **o'ngdan chapga** o'qing; hech qachon ish kompyuterida ochmang.
- Ilova: xesh, magic bytes, makros tekshiruvi (ochmasdan), sandbox.
- Haqiqiy savol — **kimdir aldandimi?** Javob proxy, DNS va Sysmon loglarida.
- IOC'larni **defang** qilib yozing.

:::quiz
? Nega xodimdan shubhali xatni oddiy “Forward” emas, ilova sifatida yuborish so'raladi?
- Ilova tezroq yetib boradi
+ Oddiy forward qilinganda asl sarlavhalar yo'qoladi
- Forward qilingan xat avtomatik o'chadi
- Bu faqat odob qoidasi
! Sarlavhalar — Received zanjiri, Return-Path, autentifikatsiya natijalari — tahlilning asosiy dalillari.

? Xatda From: "MyBank Xavfsizlik" <security@mybank-uz-support.example> deb yozilgan. Haqiqiy jo'natuvchi domeni qaysi?
- mybank.uz
+ mybank-uz-support.example
- MyBank Xavfsizlik
- example
! Ko'rsatiladigan nom — istalgan matn. Haqiqiy manzil burchak qavslar ichida, domen esa @ dan keyin.

? Received sarlavhalari qanday tartibda o'qiladi?
- Tepadan pastga — eng tepadagisi xatning boshlanishi
+ Pastdan tepaga — eng pastdagisi xatning boshlanish nuqtasiga eng yaqin
- Tartibning ahamiyati yo'q
- Faqat birinchi qator o'qiladi
! Har bir server o'z qatorini tepaga qo'shadi, shuning uchun yo'l pastdan tepaga tiklanadi.

? SPF nimani tekshiradi?
+ Xat yuborgan server Return-Path domeni uchun ruxsat etilgan serverlar ro'yxatida bormi
- Xat mazmunida virus bormi
- Ko'rinadigan From nomi to'g'rimi
- Xat shifrlanganmi
! SPF Return-Path (envelope from) domenini tekshiradi, ko'rinadigan From ni emas — shuning uchun DMARC kerak.

? DMARC qanday muammoni hal qiladi?
- Xatlarni shifrlaydi
+ SPF yoki DKIM dan o'tgan domen ko'rinadigan From domeniga mos kelishini talab qiladi va o'tmagan xatlar uchun siyosat belgilaydi
- Ilovalarni antivirusdan o'tkazadi
- Spam xatlarni avtomatik o'chiradi
! DMARC “alignment” orqali soxta From ni ushlaydi va p=none/quarantine/reject siyosatini qo'llaydi.

? Xatda spf=pass, dkim=pass, dmarc=pass. To'g'ri xulosa qaysi?
- Xat aniq xavfsiz
+ Xat haqiqatan ko'rsatilgan domendan kelgan — lekin domenning o'zi hujumchiniki bo'lishi mumkin, uni alohida tekshirish kerak
- Xat albatta phishing
- Tekshiruvlar buzilgan
! Autentifikatsiya domenni isbotlaydi, niyatni emas. O'xshatma domen hammasidan o'tadi.

? Qaysi havola haqiqatan mybank.uz ga tegishli?
- https://mybank.uz.verify-account.example/login
- https://mybank-uz.example/login
+ https://online.mybank.uz/login
- https://rnybank.uz/login
! Domen o'ngdan chapga o'qiladi: faqat online.mybank.uz da oxirgi qism mybank.uz.

? Phishing havolasida ?id=7f3a91 kabi noyob identifikator bor. Nega uni o'z kompyuteringizda ochmaslik kerak?
- U kompyuterni sekinlashtiradi
+ Hujumchi xatni kimdir tekshirayotganini bilib qolishi mumkin; sahifa zararli bo'lishi ham mumkin
- Identifikator ishlamay qoladi
- Hech qanday xavf yo'q
! Noyob havolalar kim bosganini kuzatadi. Tahlil faqat urlscan (private) yoki ajratilgan muhitda.

? Qaysi phishing turini texnik tekshiruv bilan aniqlash eng qiyin?
- Zararli ilovali xat
- Soxta kirish sahifasiga havolali xat
+ BEC — havola ham, ilova ham yo'q, faqat pul o'tkazish iltimosi
- Parolli arxivli xat
! BEC'da texnik belgi deyarli yo'q; uni mazmun va jarayon (boshqa kanal orqali tasdiqlash) to'xtatadi.

? Phishing xati zararli deb topildi. Kim soxta sahifaga ma'lumot kiritganini qanday aniqlash mumkin?
- Pochta serverini qayta yuklab
+ Proxy loglarida havola domeniga yuborilgan POST so'rovlarini qidirib
- Barcha xodimlardan og'zaki so'rab
- Faqat DMARC hisobotidan
! Bosish — GET so'rovi; forma to'ldirish — odatda POST. Proxy loglari ikkalasini ko'rsatadi.

? Xodim “havolani bosib, parolimni kiritib qo'ydim” deb darhol xabar berdi. To'g'ri munosabat qaysi?
- Xodimni jazolash
+ Tez xabar bergani uchun minnatdorchilik bildirish va darhol parolni almashtirish, seanslarni bekor qilish
- Hech narsa qilmaslik — MFA bor
- Faqat xatni o'chirish
! Tez xabar berish — muvaffaqiyat. Jazolash madaniyati xodimlarni indamaslikka o'rgatadi.
:::

:::cards
Uchta “jo'natuvchi” maydoni? :: From — ko'rinadigan jo'natuvchi; Return-Path — texnik (envelope) jo'natuvchi; Reply-To — javob qayerga ketadi.
Ko'rsatiladigan nomga ishonsa bo'ladimi? :: Yo'q — u istalgan matn bo'lishi mumkin va tekshirilmaydi. Haqiqiy manzil va domenni ko'ring.
Received zanjiri qanday o'qiladi? :: Pastdan tepaga. Faqat o'z serveringiz yozgan qatorlarga ishonish mumkin.
SPF nima? :: Domen DNS'da qaysi serverlar uning nomidan yubora olishini e'lon qiladi. Return-Path domenini tekshiradi.
DKIM nima? :: Xatga raqamli imzo; ochiq kalit selektor._domainkey.domen da. Domen va yaxlitlikni isbotlaydi.
DMARC nima? :: SPF/DKIM natijasini ko'rinadigan From domeni bilan bog'laydi (alignment); siyosat — none, quarantine, reject.
spf=pass, dkim=pass, dmarc=pass — xavfsizmi? :: Yo'q. Faqat xat ko'rsatilgan domendan kelganini isbotlaydi; o'xshatma domen hammasidan o'tadi.
Havoladagi shubhali belgilar? :: Haqiqiy nom subdomen sifatida, o'xshatma nom, punycode (xn--), qisqartirilgan havola, IP manzil, noyob identifikator.
Xavfli ilova turlari? :: exe, scr, js, vbs, hta, makrosli docm/xlsm, iso/img, lnk, html, ikki kengaytmali fayllar, parolli arxivlar.
Ilovani qanday xavfsiz tekshirish mumkin? :: Xesh bo'yicha qidiruv, magic bytes, oletools bilan ochmasdan makros tekshiruvi, ichki sandbox.
BEC nima? :: Business Email Compromise — havola va ilovasiz, faqat pul o'tkazish yoki rekvizit o'zgartirish iltimosi. Boshqa kanal orqali tasdiqlash bilan to'xtatiladi.
Phishing'dan keyin kim aldanganini qanday bilish mumkin? :: Proxy va DNS loglarida havola domeni (bosganlar va POST — ma'lumot kiritganlar), Sysmon'da ilova ochilishi.
:::
