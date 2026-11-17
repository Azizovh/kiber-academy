Ekranda yangi ogohlantirish: **"Shubhali PowerShell faoliyati — WS-BUX-014"**. Navbatda yana o'n yettitasi turibdi. Bu haqiqiy hujumning boshlanishimi yoki administrator odatiy skriptini ishga tushirdimi? Javobni topish uchun sizda o'n besh daqiqa bor — va noto'g'ri javobning narxi ikki xil: yo vaqt, yo kompaniya.

Bu jarayon — **triage** — L1 analitigining asosiy ishi. Uni yaxshi qiladigan odam tez o'sadi. Yaxshi xabar: bu sezgi emas, **usul** — va uni o'rgansa bo'ladi.

## Triage nima

[[triage|Triage]] so'zi tibbiyotdan olingan: tez yordam bo'limida bemorlar kelish tartibida emas, **og'irligiga qarab** ko'riladi. SOC'da ham shunday.

Har bir ogohlantirish uchun uch savolga javob berasiz:

1. **Bu haqiqiymi?** — true positive yoki false positive.
2. **Qanchalik jiddiy?** — ustuvorlik.
3. **Keyin nima qilinadi?** — yopish, kuzatish yoki [[escalation|eskalatsiya]].

Triage — to'liq tergov **emas**. Maqsadingiz hujumning butun tarixini tiklash emas, balki **tez va asosli qaror** qabul qilish: "bu L2 e'tiborini talab qiladi" yoki "bu yolg'on signal, sababi shu".

## Besh qadam

### 1. Ogohlantirishni o'qing — to'liq

Sarlavhani emas, **butun** ogohlantirishni. Undan ajratib oling:

| Savol | Nimani qidirasiz |
|---|---|
| **Nima** sodir bo'ldi? | Qaysi qoida ishladi va u aslida nimani tekshiradi |
| **Kim?** | Foydalanuvchi hisobi |
| **Qayerda?** | Qurilma nomi, IP manzili |
| **Qachon?** | Vaqt — va vaqt mintaqasi! |
| **Qayerdan / qayerga?** | Manba va manzil |
| **Qanday?** | Jarayon, buyruq satri, fayl |

Qoidaning **mantig'ini** tushunish — eng ko'p o'tkazib yuboriladigan qadam. "Shubhali PowerShell" degan nom hech narsa demaydi; qoida aslida nimani ushlagan — kodlangan buyruqnimi, internetdan yuklashnimi, ofis dasturidan ishga tushishnimi? Bilmasangiz — qoida tavsifini oching.

### 2. Kontekst yig'ing

Ogohlantirishning o'zi — bitta nuqta. Unga ma'no beradigan narsa — atrofidagi ma'lumot:

**Qurilma haqida:** bu nima — xodim noutbukimi, veb-servermi, domen kontrollerimi? Qanchalik muhim?

**Foydalanuvchi haqida:** kim, qaysi bo'lim, qanday huquqlari bor? Buxgalter uchun PowerShell — g'alati; tizim ma'muri uchun — kundalik ish.

**Oldin va keyin:** shu qurilma va hisobda ogohlantirishdan 15 daqiqa oldin va keyin nima bo'lgan? Kirish, fayl yaratilishi, tarmoq ulanishi?

**Tarix:** bu ogohlantirish shu qurilmada avval chiqqanmi? Qanday yopilgan?

**Tashqi ma'lumot:** IP manzil, domen yoki fayl xeshi ma'lum zararlilar ro'yxatida bormi?

:::key
Triage'dagi eng muhim savol: **"Bu shu foydalanuvchi, shu qurilma, shu vaqt uchun odatiymi?"** Xuddi shu harakat bir sharoitda mutlaqo normal, boshqasida — aniq hujum belgisi. Zaxira nusxa serveri har kecha gigabaytlab ma'lumot uzatadi — bu uning ishi. Buxgalterning kompyuteri shunday qilsa — bu tashvish. Kontekstsiz ogohlantirish — shunchaki shovqin.
:::

Odatiy holat [[baseline|baseline]] deyiladi. Uni bilish tajriba bilan keladi — shuning uchun L1 da o'tgan oylar bekor emas.

### 3. Gipoteza tuzing va tekshiring

Kontekstga qarab ikki raqobatdosh izoh tuzing:

- **Zararsiz izoh:** "Administrator rejali ish qilyapti."
- **Zararli izoh:** "Phishing orqali kirilgan va zararli kod ishga tushirilgan."

Keyin so'rang: **har biri to'g'ri bo'lsa, yana nimani ko'rishim kerak edi?**

| Agar zararsiz bo'lsa | Agar zararli bo'lsa |
|---|---|
| Foydalanuvchi — IT xodimi | Foydalanuvchi — IT ga aloqasi yo'q |
| Ish vaqtida | G'ayrioddiy vaqtda |
| Ma'lum, hujjatlashtirilgan skript | Kodlangan yoki yashirilgan buyruq |
| Ichki manzillarga ulanish | Notanish tashqi manzilga ulanish |
| Avval ham ko'p marta bo'lgan | Birinchi marta |
| O'zgartirish so'rovi (change ticket) bor | Hech qanday yozuv yo'q |

Endi jurnallardan aynan shu belgilarni qidirasiz. Bu — tasodifiy qarab chiqish emas, **maqsadli tekshiruv**.

Ehtiyot bo'ling: odam birinchi taxminiga yopishib oladi va faqat uni tasdiqlaydigan dalillarni ko'radi (**tasdiq xatosi**). Shuning uchun ataylab **qarama-qarshi** izohni ham tekshiring: "agar men nohaq bo'lsam, buni qayerdan bilardim?"

### 4. Qaror qabul qiling

| Xulosa | Harakat |
|---|---|
| **False positive** — aniq sababi bilan | Yopish; takrorlansa — qoidani sozlash haqida xabar berish |
| **Benign true positive** — qonuniy harakat | Tasdiqlash (egasi bilan), yozish, yopish |
| **True positive** | Eskalatsiya — playbook bo'yicha darhol choralar |
| **Noaniq** | Eskalatsiya — nimani tekshirganingiz va nima ochiq qolgani bilan |

To'rtinchi qator — halol va to'g'ri natija. O'tgan darsdagi qoida: **isbotlay olmasangiz — yopmang.**

Ustuvorlikni ikki narsa belgilaydi (birinchi darsdagi xavf formulasi): **qanchalik aniq** va **nima xavf ostida**. Domen kontrolleridagi shubhali kirish — mehmon Wi-Fi'dagi skanerlashdan muhimroq, garchi ikkinchisi "balandroq" ko'rinsa ham.

### 5. Hujjatlashtiring

Yozilmagan tekshiruv — bajarilmagan tekshiruv. [[ticket|Tiket]]ingizni boshqa odam, boshqa smenada, sizdan so'ray olmagan holda o'qiydi.

Yaxshi yozuv tuzilishi:

```
XULOSA:      True positive — eskalatsiya (L2)

NIMA BO'LDI: 14:32 da WS-BUX-014 da (foydalanuvchi: d.karimova, buxgalteriya)
             WINWORD.EXE dan powershell.exe ishga tushgan, kodlangan buyruq bilan.

TEKSHIRILDI:
 - Foydalanuvchi IT xodimi emas; PowerShell avval ishlatilmagan (30 kun).
 - 14:31 da pochta orqali "Hisob-faktura_1147.docm" olingan va ochilgan.
 - 14:32 da qurilma 203.0.113.45:443 ga ulangan — manzil tahdid ro'yxatida bor.
 - 14:33 da AppData\Roaming da yangi .exe fayl yaratilgan.

TEKSHIRILMADI: Boshqa qurilmalarga tarqalish; shu xatni yana kim olgani.

BAJARILDI:   Qurilma EDR orqali tarmoqdan ajratildi (14:41). Foydalanuvchiga
             xabar berildi.

TAVSIYA:     Hisob parolini almashtirish; xatni barcha qutilardan qidirish.
```

E'tibor bering:

- **Xulosa birinchi qatorda** — o'quvchi oxirigacha o'qimasa ham asosiysini biladi.
- **Faktlar va vaqt**, taxminlar emas. "Shubhali ko'rindi" emas — aniq nima.
- **"Tekshirilmadi"** bo'limi — eng qimmatlisi: keyingi odam nimadan boshlashni biladi.
- Yolg'on signal uchun ham xuddi shunday: **nega** yolg'on ekanini yozing. "FP" degan bir so'z — yozuv emas.

## Uchta misol

### Misol 1: Imkonsiz sayohat

**Ogohlantirish:** bitta hisob 10:05 da Toshkentdan, 10:40 da Germaniyadan kirgan.

**Kontekst:** foydalanuvchi — savdo bo'limi xodimi. Ikkinchi kirish manzili — mashhur VPN xizmatiga tegishli. Qurilma — xodimning odatiy noutbuki (bir xil qurilma identifikatori). MFA ikkala kirishda ham o'tgan.

**Gipotezalar:** xodim VPN yoqdi / hisob o'g'irlangan.

**Tekshiruv:** qurilma bir xil, MFA o'tgan, xodim avval ham shu VPN manzillaridan kirgan.

**Qaror:** benign true positive — qoida to'g'ri ishladi, lekin sabab qonuniy. Yopiladi; shu xodim uchun takrorlanayotgan bo'lsa — qoidani sozlash taklifi.

Agar qurilma **boshqa** bo'lsa va MFA so'rovi bir necha marta rad etilib, keyin qabul qilingan bo'lsa-chi? Xuddi shu ogohlantirish — butunlay boshqa xulosa: eskalatsiya.

### Misol 2: Ko'p muvaffaqiyatsiz kirish

**Ogohlantirish:** `svc-backup` hisobiga 5 daqiqada 240 ta muvaffaqiyatsiz kirish.

**Kontekst:** manba — ichki server `APP-07`. Hisob — xizmat hisobi. Urinishlar aniq har 1,2 soniyada.

**Gipotezalar:** parol terish hujumi / xizmat eski parol bilan ulanishga urinmoqda.

**Tekshiruv:** kecha `svc-backup` paroli almashtirilgan (o'zgartirish yozuvi bor). `APP-07` da shu hisobni ishlatadigan rejalashtirilgan vazifa bor. Urinishlar bir xil oraliqda — odam emas, dastur. Boshqa hisoblarga urinish yo'q.

**Qaror:** false positive (noto'g'ri sozlama). Yopiladi; tizim ma'murlariga xabar: vazifadagi parolni yangilash kerak.

Saboq: mashina tezligidagi, bir tekis urinishlar ko'pincha **buzilgan sozlama**. Lekin bu faqat taxmin — uni **o'zgartirish yozuvi** tasdiqladi.

### Misol 3: Ofis dasturidan buyruq qobig'i

Bu — yuqoridagi tiket namunasi. Windows darsidagi klassik naqsh: `WINWORD.EXE → powershell.exe`. Kontekst (buxgalter, yangi hujjat, tashqi ulanish, yangi fayl) zararli izohni to'liq tasdiqlaydi. Qaror — darhol eskalatsiya va qurilmani ajratish.

Uchala misolda ham ogohlantirishning **o'zi** javob bermadi. Javobni kontekst berdi.

## Tez tekshirish vositalari

Triage paytida tashqi belgilarni tekshirish uchun:

| Nimani | Qayerda |
|---|---|
| IP manzil obro'si | AbuseIPDB, VirusTotal |
| Domen | VirusTotal, whois (qachon ro'yxatdan o'tgan?) |
| Fayl xeshi | VirusTotal |
| URL | urlscan.io |
| Jarayon yoki fayl nomi | Qidiruv tizimi; LOLBAS loyihasi (qonuniy vositalarning suiiste'mol qilinishi) |

:::warn
**Ommaviy xizmatlarga fayl yuklamang.** VirusTotal'ga yuklangan fayl uning mijozlariga ochiq bo'ladi. Shubhali ilova ichida kompaniyangizning maxfiy hujjati bo'lishi mumkin — va nishonli hujumda hujumchi o'z fayli tekshirilayotganini shu orqali bilib oladi. To'g'ri yo'l: faylni emas, uning **xeshini** qidiring. Xuddi shunday — ichki manzillar va nomlarni tashqi xizmatlarga kiritmang.
:::

Tashqi xizmatning "toza" degan javobi — hukm emas. Yangi domen yoki hozirgina yaratilgan fayl haqida hech kim hali bilmaydi. "Ro'yxatda yo'q" va "xavfsiz" — ikki xil narsa.

## Eskalatsiya — to'g'ri topshirish

Eskalatsiya — muvaffaqiyatsizlik emas, jarayonning oddiy qismi. Lekin uni to'g'ri qilish kerak: L2 siz bajargan ishni **takrorlamasligi** kerak.

Yaxshi eskalatsiyada:

- **Bir jumlada xulosa:** nima va nega jiddiy.
- **Nima tekshirildi** va natijalari.
- **Nima tekshirilmadi.**
- **Qanday chora ko'rildi** (qurilma ajratildimi? hisob bloklandimi?).
- **Dalillar:** so'rovlar, jurnal qatorlari, vaqtlar.

Qachon **darhol**, to'liq tekshirmasdan eskalatsiya qilinadi: muhim tizimlar (domen kontrolleri, to'lov tizimi); faol davom etayotgan hujum belgilari; ma'lumot chiqib ketayotgani; ransomware belgilari. Bunday holatda tezlik to'liqlikdan muhim.

## Keng tarqalgan xatolar

| Xato | Nega yomon |
|---|---|
| Faqat sarlavhaga qarab yopish | "Bu doim yolg'on bo'ladi" — bir kun bo'lmaydi |
| Kontekstsiz xulosa | Xuddi shu harakat turli sharoitda turli ma'no beradi |
| Birinchi taxminga yopishib olish | Qarama-qarshi dalillar ko'rinmay qoladi |
| Bitta ogohlantirishga soatlab sho'ng'ish | Navbat o'sadi; triage — tergov emas |
| "FP" deb yozib yopish | Ertaga boshqa odam xuddi shu ishni qayta qiladi |
| Tashqi xizmat "toza" degani uchun yopish | Yangi tahdidlar hali hech qayerda yo'q |
| Eskalatsiyadan uyalish | O'tkazib yuborilgan insident ancha qimmat |
| Vaqt mintaqasini tekshirmaslik | Jurnallar UTC da, siz mahalliy vaqtda — voqealar tartibi buziladi |

Oxirgi qator — yangi analitiklarning klassik tuzog'i: turli tizimlar turli vaqt mintaqasida yozadi. Voqealar ketma-ketligini tiklashdan oldin hammasini bitta mintaqaga keltiring.

:::try
**1. O'zingiz triage qiling.** Quyidagi ogohlantirish uchun: (a) qanday kontekst so'raysiz? (b) zararsiz va zararli izohlarni tuzing; (c) har biri uchun qanday dalil qidirasiz?

*"Foydalanuvchi a.yusupov (marketing) hisobidan soat 02:47 da fayl serveridan 4,2 GB ma'lumot yuklab olindi."*

**2. Tiketni baholang.** Quyidagi yozuvda nima yetishmaydi? *"Tekshirdim, shubhali emas. FP. Yopildi."*

**3. Amaliyot.** LetsDefend yoki TryHackMe'dagi "SOC Fundamentals" bo'limida kamida 5 ta ogohlantirishni triage qiling. Har biri uchun yuqoridagi tuzilishda tiket yozing — hatto platforma talab qilmasa ham. Yozish odati — hozirdan.

*1-savol uchun yo'nalish: kontekst — bu xodim odatda qancha va qachon yuklaydi; kirish qayerdan (ofis, VPN, notanish manzil); MFA; ertaga ta'tilga yoki ishdan ketyaptimi; fayllar qaysi papkalardan. Zararsiz: kampaniya uchun materiallarni uyda ishlash uchun olgan. Zararli: hisob o'g'irlangan yoki xodim ma'lumot olib chiqmoqda. 2-savol: nima tekshirilgani, qanday dalil asosida va nega FP ekani yozilmagan.*
:::

## Xulosa

- **Triage** — tez va asosli qaror: haqiqiymi, qanchalik jiddiy, keyin nima.
- Besh qadam: **o'qish → kontekst → gipoteza va tekshiruv → qaror → hujjatlashtirish**.
- Asosiy savol: bu **shu foydalanuvchi, qurilma va vaqt uchun odatiymi?**
- Ikki raqobatdosh izoh tuzing va har biri uchun dalil qidiring; tasdiq xatosidan ehtiyot bo'ling.
- Natijalar: false positive, benign true positive, true positive, **noaniq → eskalatsiya**.
- Tiket: xulosa birinchi qatorda, faktlar va vaqt, **nima tekshirilmagani**.
- Faylni emas, **xeshini** tekshiring; "ro'yxatda yo'q" ≠ "xavfsiz".
- Muhim tizim yoki faol hujumda — darhol eskalatsiya.

:::quiz
? Triage'ning maqsadi nima?
- Hujumning to'liq tarixini tiklash
+ Ogohlantirish haqida tez va asosli qaror qabul qilish: haqiqiymi, qanchalik jiddiy, keyin nima
- Barcha ogohlantirishlarni yopish
- Yangi qoidalar yozish
! Triage — to'liq tergov emas. Chuqur tahlil eskalatsiyadan keyin, L2 da bajariladi.

? Triage'dagi eng muhim savol qaysi?
- Ogohlantirish qaysi rangda?
+ Bu harakat shu foydalanuvchi, shu qurilma va shu vaqt uchun odatiymi?
- Qoidani kim yozgan?
- Navbatda nechta ogohlantirish bor?
! Xuddi shu harakat bir sharoitda normal, boshqasida hujum belgisi. Kontekst hal qiladi.

? Xizmat hisobiga ichki serverdan aniq bir xil oraliqda yuzlab muvaffaqiyatsiz kirish bo'lmoqda. Eng ehtimolli izoh va uni nima tasdiqlaydi?
- Albatta hujum — hech narsa tekshirish shart emas
+ Eski parol bilan ishlayotgan xizmat yoki vazifa; buni yaqinda parol almashtirilgani va shu hisobni ishlatadigan vazifa borligi tasdiqlaydi
- Internet uzilishi
- Antivirus xatosi
! Mashina tezligidagi bir tekis urinishlar ko'pincha noto'g'ri sozlama. Lekin bu taxmin — uni dalil bilan tasdiqlash kerak.

? Nega ikkita raqobatdosh gipoteza (zararsiz va zararli) tuzish tavsiya etiladi?
- Tiket uzunroq bo'lishi uchun
+ Birinchi taxminga yopishib qolmaslik va har ikki izoh uchun dalil qidirish uchun
- Bu qonun talabi
- Vaqtni cho'zish uchun
! Tasdiq xatosi: odam faqat o'z taxminini tasdiqlaydigan narsani ko'radi. Qarama-qarshi izohni ataylab tekshirish undan saqlaydi.

? Shubhali faylni tekshirishning to'g'ri yo'li qaysi?
- Uni darhol ommaviy xizmatga yuklash
+ Uning xeshini ommaviy xizmatdan qidirish
- Uni o'z kompyuterida ochib ko'rish
- Hamkasblarga pochta orqali yuborish
! Yuklangan fayl boshqalarga ochiq bo'ladi va ichida maxfiy ma'lumot bo'lishi mumkin. Xesh hech narsani oshkor qilmaydi.

? Tashqi xizmat domenni “toza” deb ko'rsatdi. Bu nimani anglatadi?
- Domen aniq xavfsiz
+ Faqat u ma'lum zararlilar ro'yxatida yo'qligini — yangi tahdidlar hali hech qayerda qayd etilmagan bo'lishi mumkin
- Ogohlantirishni yopish mumkin
- Qoida noto'g'ri ishlagan
! “Ro'yxatda yo'q” va “xavfsiz” — ikki xil narsa. Yangi ro'yxatdan o'tgan domen ayniqsa shubhali.

? Yaxshi tiketda nima birinchi qatorda turadi?
- Analitikning ismi
+ Xulosa: natija va keyingi harakat
- Barcha jurnal qatorlari
- Ogohlantirish raqami
! O'quvchi oxirigacha o'qimasa ham asosiy narsani bilishi kerak.

? Tiketdagi “Tekshirilmadi” bo'limi nega qimmatli?
- U tiketni uzaytiradi
+ Keyingi analitik nimadan boshlashni va nima ochiq qolganini biladi
- U analitikni himoya qiladi
- U majburiy emas va foydasiz
! Halol chegara ko'rsatilsa, ish takrorlanmaydi va bo'shliqlar ko'rinadi.

? Qaysi holatda to'liq tekshirmasdan darhol eskalatsiya qilinadi?
- Har doim
+ Muhim tizim, faol davom etayotgan hujum, ma'lumot chiqib ketishi yoki ransomware belgilari bo'lsa
- Hech qachon
- Faqat smena oxirida
! Bunday holatlarda tezlik to'liqlikdan muhim — har daqiqa zararni oshiradi.

? Turli tizimlar jurnalidan voqealar ketma-ketligini tiklashda nimaga alohida e'tibor berish kerak?
- Shrift o'lchamiga
+ Vaqt mintaqasiga — hamma yozuvni bitta mintaqaga keltirish kerak
- Fayl nomlariga
- Jurnallar rangiga
! Bir tizim UTC da, boshqasi mahalliy vaqtda yozsa, voqealar tartibi noto'g'ri ko'rinadi.
:::

:::cards
Triage nima? :: Ogohlantirishni birlamchi saralash: haqiqiymi, qanchalik jiddiy va keyin nima qilinadi.
Triage'ning besh qadami? :: O'qish → kontekst yig'ish → gipoteza va tekshiruv → qaror → hujjatlashtirish.
Triage'dagi asosiy savol? :: Bu harakat shu foydalanuvchi, shu qurilma va shu vaqt uchun odatiymi?
Qanday kontekst yig'iladi? :: Qurilma (nima va qanchalik muhim), foydalanuvchi (rol, huquqlar), oldin va keyingi hodisalar, tarix, tashqi obro' ma'lumotlari.
Triage natijalari? :: False positive, benign true positive, true positive (eskalatsiya), noaniq (eskalatsiya).
Tasdiq xatosi nima? :: Faqat birinchi taxminni tasdiqlaydigan dalillarni ko'rish. Himoya — qarama-qarshi izohni ataylab tekshirish.
Yaxshi tiket tuzilishi? :: Xulosa → nima bo'ldi (faktlar, vaqt) → nima tekshirildi → nima tekshirilmadi → nima bajarildi → tavsiya.
Nega faylni emas, xeshini tekshiramiz? :: Ommaviy xizmatga yuklangan fayl boshqalarga ochiq bo'ladi va maxfiy ma'lumotni oshkor qilishi mumkin.
Yaxshi eskalatsiyada nima bo'ladi? :: Bir jumlada xulosa, tekshirilgan va tekshirilmagan narsalar, ko'rilgan choralar, dalillar.
Qachon darhol eskalatsiya qilinadi? :: Muhim tizim, faol hujum, ma'lumot chiqishi yoki ransomware belgilari bo'lganda.
Baseline nima? :: Tizim yoki foydalanuvchining odatiy holati; undan chetlanish tekshirish uchun sabab.
:::
