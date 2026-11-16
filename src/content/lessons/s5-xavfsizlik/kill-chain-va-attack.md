Kinoda xaker klaviaturani bir daqiqa taqillatadi va "Men ichkaridaman" deydi. Haqiqiy hujum bunday emas: u kunlar, haftalar, ba'zan oylar davom etadigan **bosqichlar ketma-ketligi**. Hujumchi avval o'rganadi, keyin kiradi, o'rnashadi, huquqini oshiradi, tarmoq bo'ylab yuradi va shundan keyingina maqsadiga yetadi.

Bu — himoyachi uchun yaxshi xabar. Zanjirning **har bir bo'g'ini** — hujumni payqash va to'xtatish imkoniyati. Hujumchi muvaffaqiyat qozonishi uchun hamma bosqichdan o'tishi kerak; himoyachiga esa **bittasida** to'xtatish kifoya.

Bu darsda hujumni tasvirlashning ikki asosiy modeli bilan tanishasiz: **Cyber Kill Chain** va **MITRE ATT&CK**. Ular butun sohaning umumiy tili — SOC analitigi hodisani ular bilan tasniflaydi, pentester hisobotida ularga ishora qiladi.

## Cyber Kill Chain

[[kill-chain|Cyber Kill Chain]] — Lockheed Martin kompaniyasi 2011-yilda taklif qilgan model. U hujumni yetti bosqichga bo'ladi:

| № | Bosqich | Hujumchi nima qiladi | Himoyachi nima qila oladi |
|---|---|---|---|
| 1 | **Reconnaissance** (razvedka) | Nishon haqida ma'lumot yig'adi: xodimlar, domenlar, texnologiyalar | Ochiq ma'lumotni kamaytirish; skanerlashni payqash |
| 2 | **Weaponization** (qurollantirish) | Hujum vositasini tayyorlaydi | Bevosita ko'rinmaydi; tahdid razvedkasi |
| 3 | **Delivery** (yetkazish) | Vositani nishonga yetkazadi: xat, sayt, fleshka | Pochta va veb filtrlari; xodimlarni o'qitish |
| 4 | **Exploitation** (ekspluatatsiya) | Zaiflikdan foydalanib kod ishga tushadi | Yangilanishlar; himoya mexanizmlari |
| 5 | **Installation** (o'rnatish) | Tizimda mustahkam o'rnashadi | EDR; eng kam imtiyoz; avtomatik ishga tushish nuqtalarini kuzatish |
| 6 | **Command & Control** (C2) | Zararlangan tizim hujumchi serveri bilan aloqa o'rnatadi | Chiquvchi trafikni cheklash va kuzatish; DNS monitoringi |
| 7 | **Actions on Objectives** (maqsad) | Ma'lumotni o'g'irlaydi, shifrlaydi yoki buzadi | Segmentatsiya; ma'lumot sizishini aniqlash; zaxira nusxa |

O'ng ustunga qarang: shu paytgacha o'rgangan deyarli har bir himoya chorasi shu jadvalda o'z o'rnini topadi. Tarmoq bosqichidagi "chiquvchi trafikni ham cheklash kerak" degan gap — bu 6-bosqichni buzish. Linux darsidagi "cron va systemd'ni tekshirish" — 5-bosqichni payqash.

### Zanjirni uzish

Modelning asosiy g'oyasi:

:::key
**Zanjirning istalgan bo'g'inini uzsangiz — hujum to'xtaydi.** Hujumchi yetti bosqichning hammasida muvaffaqiyat qozonishi kerak; himoyachiga bittasi yetarli. Va qanchalik **erta** uzsangiz — zarar shunchalik kam: 3-bosqichda to'xtatilgan xat — shunchaki o'chirilgan xat; 7-bosqichda payqalgan hujum — insident, tergov va tiklash.
:::

Bundan ikki amaliy xulosa chiqadi:

1. **Bitta bosqichga tayanmang.** Faqat "kirishga yo'l qo'ymaslik"ka (3–4-bosqich) pul sarflagan tashkilot kirib olgan hujumchini ko'rmaydi. Har bir bosqichda — kamida bitta **to'siq** va bitta **ko'z**.
2. **Kechki bosqichlar — ikkinchi imkoniyat.** Hujumchi kirib oldi, lekin hali maqsadiga yetmadi. C2 aloqasini yoki tarmoq ichidagi harakatni payqasangiz — asosiy zarardan oldin to'xtatasiz.

### Bitta hujum — yetti bosqich

Odatiy ransomware hodisasini bosqichlarga ajratamiz:

| Bosqich | Nima sodir bo'ldi |
|---|---|
| Razvedka | Kompaniya saytidan buxgalteriya xodimlarining ismlari va pochta formati aniqlandi |
| Qurollantirish | "Hisob-faktura" ko'rinishidagi zararli hujjat tayyorlandi |
| Yetkazish | Hujjat "yetkazib beruvchi" nomidan buxgalterga yuborildi |
| Ekspluatatsiya | Buxgalter hujjatni ochib, makrosni yoqdi |
| O'rnatish | Zararli dastur o'zini avtomatik ishga tushish ro'yxatiga yozdi |
| C2 | Kompyuter tashqi serverga muntazam ulana boshladi |
| Maqsad | Hujumchi tarmoq bo'ylab tarqaldi, ma'lumotni olib chiqdi va fayllarni shifrladi |

Har bir qatorda "bu yerda nima to'xtatishi mumkin edi?" deb so'rang: pochta filtri, xodimning hushyorligi, makroslarning o'chirilgani, oddiy foydalanuvchi huquqi, EDR, chiquvchi trafik monitoringi, segmentatsiya, zaxira nusxa. **Sakkizta imkoniyat** — hujum faqat hammasi muvaffaqiyatsiz bo'lgandagina oxiriga yetadi.

### Modelning cheklovlari

Kill Chain — yaxshi boshlang'ich xarita, lekin kamchiliklari bor:

- U **tashqaridan kirish**ga qaratilgan; ichki tahdid yoki o'g'irlangan parol bilan kirish unga yaxshi sig'maydi.
- Kirgandan **keyingi** harakatlar (huquq oshirish, tarmoq ichida ko'chish) bitta bosqichga siqib qo'yilgan — holbuki haqiqiy hujumda aynan shu qism eng uzoq davom etadi.
- U juda umumiy: "ekspluatatsiya" deyish — **qanday** degan savolga javob bermaydi.

Bu kamchiliklarni keyingi model to'ldiradi.

## MITRE ATT&CK

[[mitre-attack|MITRE ATT&CK]] (Adversarial Tactics, Techniques & Common Knowledge) — hujumchilarning **haqiqatda kuzatilgan** xatti-harakatlari ochiq bazasi. Uni MITRE notijorat tashkiloti yuritadi va u real hodisalar tahlili asosida doimiy to'ldiriladi.

Kill Chain — yetti qadamli yo'l. ATT&CK — batafsil ensiklopediya: yuzlab usul, har biri tavsif, misollar, aniqlash va himoya yo'llari bilan.

### Uch daraja: taktika, texnika, protsedura

Qisqartmasi — [[ttp|TTP]]:

| Daraja | Savol | Misol |
|---|---|---|
| **Taktika** | **Nima uchun?** — hujumchining maqsadi | Persistence — tizimda saqlanib qolish |
| **Texnika** | **Qanday?** — maqsadga erishish usuli | Scheduled Task/Job — rejalashtirilgan vazifa orqali |
| **Protsedura** | **Aniq qanday?** — konkret amalga oshirish | Falon guruh shu vositani shu parametrlar bilan ishlatgan |

Har bir texnikaning identifikatori bor: `T1053` — Scheduled Task/Job; uning kichik turi (sub-technique) `T1053.003` — Cron. Linux darsida "cron — tekshiriladigan joy" deganimizni eslaysizmi? ATT&CK'da bu aniq raqam va tavsifga ega.

### O'n to'rt taktika

ATT&CK Enterprise matritsasining ustunlari — taktikalar. Ular taxminan hujum tartibida joylashgan:

| № | Taktika | Maqsad | Siz allaqachon bilgan misol |
|---|---|---|---|
| 1 | **Reconnaissance** | Ma'lumot yig'ish | DNS, sertifikat jurnallari, OSINT |
| 2 | **Resource Development** | Infratuzilma tayyorlash | O'xshash domen ro'yxatdan o'tkazish |
| 3 | **Initial Access** | Birinchi kirish | Phishing, ochiq xizmat, o'g'irlangan parol |
| 4 | **Execution** | Kod ishga tushirish | PowerShell, skriptlar |
| 5 | **Persistence** | Saqlanib qolish | Run kalitlari, cron, yangi hisob |
| 6 | **Privilege Escalation** | Huquqni oshirish | Noto'g'ri sozlama, zaiflik |
| 7 | **Defense Evasion** | Himoyadan yashirinish | Kodlash, jurnallarni tozalash |
| 8 | **Credential Access** | Parol va kalitlarni olish | Xotiradan, fayllardan, brauzerdan |
| 9 | **Discovery** | Muhitni o'rganish | `whoami`, `ipconfig`, `net user` |
| 10 | **Lateral Movement** | Tarmoq ichida ko'chish | SMB, RDP, SSH |
| 11 | **Collection** | Ma'lumot to'plash | Fayllar, pochta |
| 12 | **Command and Control** | Boshqaruv aloqasi | HTTPS, DNS orqali |
| 13 | **Exfiltration** | Ma'lumotni olib chiqish | Bulutga yuklash, DNS tunneling |
| 14 | **Impact** | Zarar yetkazish | Shifrlash, o'chirish, to'xtatish |

O'ng ustun — bu dasturning oldingi bosqichlari. Windows darsidagi "hujumchining birinchi buyruqlari" — bu **Discovery** taktikasi. DNS darsidagi tunneling — **Exfiltration**. "Ma'lumotni kodlash" darsidagi Base64 bilan yashirish — **Defense Evasion**. Siz hujum texnikalarining katta qismini allaqachon — himoya tomonidan — o'rgangansiz; ATT&CK ularga umumiy xarita va nom beradi.

Kill Chain bilan solishtirsak: uning "maqsad" degan bitta bosqichi ATT&CK'da to'qqizta alohida taktikaga yoyilgan (6–14). Haqiqiy hujumning asosiy vaqti aynan shu yerda o'tadi.

Yana bir farq: ATT&CK **chiziqli emas**. Hujumchi taktikalar orasida oldinga-orqaga yuradi: kirdi → o'rgandi → parol oldi → ko'chdi → yana o'rgandi → yana parol oldi…

### ATT&CK kim uchun va nima uchun

| Kim | Qanday ishlatadi |
|---|---|
| **SOC analitigi** | Ogohlantirishni texnikaga bog'laydi: "bu T1059 — keyingi qadam nima bo'lishi mumkin?" |
| **Aniqlash muhandisi** | Qamrovni o'lchaydi: qaysi texnikalarni ko'ramiz, qaysilarini — yo'q |
| **Threat hunter** | Gipoteza tuzadi: "tarmog'imizda T1053 belgilari bormi?" |
| **Tahdid razvedkasi** | Guruhlarni tavsiflaydi: "bu guruh odatda shu texnikalarni ishlatadi" |
| **Pentester / red team** | Topilmalarni umumiy tilda bayon qiladi; haqiqiy guruh xatti-harakatini taqlid qiladi |
| **Rahbariyat** | "Himoyamizda qayerda bo'shliq bor?" degan savolga xarita |

Har bir texnika sahifasida uch narsa bor: **tavsif**, **Mitigations** (qanday oldini olish) va **Detection** (qanday aniqlash, qaysi jurnal manbalari kerak). Shuning uchun ATT&CK — nafaqat hujum katalogi, balki himoya qo'llanmasi.

**ATT&CK Navigator** — matritsani bo'yab chiqish vositasi: "bularni aniqlay olamiz" — yashil, "bularni yo'q" — qizil. Natija — himoyangizning ko'rgazmali xaritasi.

Hamroh loyiha — **MITRE D3FEND**: xuddi shunday tuzilgan, lekin **himoya** usullari katalogi.

## Pyramid of Pain

Hujumni aniqlaganingizda, hujumchi haqida turli **belgilar**ga ega bo'lasiz. Ular bir xil qimmatli emas. Xavfsizlik tadqiqotchisi David Bianco buni piramida ko'rinishida tasvirlagan:

```
                    ▲
                   ╱ ╲
                  ╱TTP╲            ← qiyin: hujumchi butun uslubini o'zgartirishi kerak
                 ╱─────╲
                ╱Vositalar╲        ← mushkul
               ╱───────────╲
              ╱ Tarmoq/host  ╲     ← bezovta qiladi
             ╱   artefaktlari ╲
            ╱─────────────────╲
           ╱   Domen nomlari    ╲  ← oddiy
          ╱─────────────────────╲
         ╱     IP manzillar       ╲ ← oson
        ╱─────────────────────────╲
       ╱       Xesh qiymatlari      ╲ ← juda oson: bitta bayt o'zgartirilsa bas
      ╱───────────────────────────────╲
```

G'oya: siz qaysi belgini bloklasangiz, hujumchiga **shuncha "og'riq"** yetkazasiz.

| Daraja | Bloklasangiz, hujumchi nima qiladi |
|---|---|
| **Fayl xeshi** | Faylda bitta baytni o'zgartiradi — xesh butunlay boshqa (ko'chki effekti). Bir soniya |
| **IP manzil** | Boshqa serverga o'tadi. Bir necha daqiqa |
| **Domen** | Yangi domen ro'yxatdan o'tkazadi. Bir necha soat |
| **Artefaktlar** | Fayl nomlari, registry kalitlari, so'rov naqshlarini o'zgartirishi kerak |
| **Vositalar** | Yangi vosita topishi yoki yozishi kerak. Haftalar |
| **TTP** | **Butun ish uslubini** qayta o'ylashi kerak. Eng qiyin |

Pastki uch daraja — [[ioc|IOC]] (Indicator of Compromise): zararli IP, domen, xesh. Ular foydali va ularni albatta ishlatish kerak — lekin tez eskiradi.

:::key
Eng mustahkam aniqlash — **xatti-harakatga** (TTP) qaratilgan. "Shu xeshli faylni blokla" qoidasi ertaga foydasiz. "Ofis dasturi buyruq qobig'ini ishga tushirsa — xabar ber" qoidasi esa hujumchi qaysi faylni, qaysi serverdan yuborishidan qat'i nazar ishlaydi. Shuning uchun ATT&CK texnikalarga qurilgan, IOC ro'yxatlariga emas.
:::

Windows darsidagi `WINWORD.EXE → powershell.exe` misoli — aynan xatti-harakatga asoslangan aniqlash.

## Hodisani modellar bilan o'qish

Modellarning amaliy foydasi — **tartib**. Sizga shunday xabar keldi deylik:

*"Buxgalterning kompyuterida Word hujjati ochilgandan keyin PowerShell ishga tushgan, u tashqi manzildan fayl yuklab, uni foydalanuvchining AppData papkasiga saqlagan va avtomatik ishga tushish ro'yxatiga qo'shgan. Keyin kompyuter har 5 daqiqada notanish domenga ulanmoqda."*

Tartibsiz voqealar to'plami — modellar bilan aniq hikoyaga aylanadi:

| Kuzatuv | Kill Chain | ATT&CK taktikasi |
|---|---|---|
| Hujjat xat orqali kelgan | Delivery | Initial Access |
| Hujjat ochilgach PowerShell ishga tushgan | Exploitation | Execution |
| Fayl yuklab olingan va saqlangan | Installation | Command and Control (fayl uzatish) |
| Avtomatik ishga tushishga qo'shilgan | Installation | Persistence |
| Muntazam tashqi ulanish | Command & Control | Command and Control |

Va darhol keyingi savollar tug'iladi: zanjirning **davomi** bo'lganmi? Huquq oshirilganmi? Parollar olinganmi? Boshqa kompyuterlarga o'tilganmi? Ma'lumot chiqib ketganmi? Model sizga **nimani qidirish kerakligini** aytadi — tergov tasodifiy izlanishdan rejali ishga aylanadi.

## Boshqa modellar

Tanib olish uchun:

| Model | Mohiyati |
|---|---|
| **Unified Kill Chain** | Kill Chain va ATT&CK ni birlashtirgan 18 bosqichli model |
| **Diamond Model** | Har hodisani to'rt uchi bilan tavsiflaydi: hujumchi, infratuzilma, imkoniyat, qurbon |
| **NIST CSF** | Himoya funksiyalari: Govern, Identify, Protect, Detect, Respond, Recover |

Oxirgisi boshqa turdagi model — u hujumni emas, **himoya dasturini** tartibga soladi. Keyingi darsda unga qaytamiz.

:::try
**1. ATT&CK bilan tanishuv.** `attack.mitre.org` ni oching. Enterprise matritsasida **Persistence** ustunini toping va **Scheduled Task/Job** texnikasini oching. O'qing: tavsif, kichik texnikalar ro'yxati, **Mitigations** va **Detection** bo'limlari. Linux darsida o'rganganlaringizdan nimalar bu yerda tilga olingan?

**2. Tanish texnikalar.** Quyidagilarni ATT&CK'dan qidirib, taktika va identifikatorini yozing: *Phishing*, *Brute Force*, *Valid Accounts*. Har biriga bitta himoya chorasini ayting.

**3. Hodisani ajrating.** Birinchi darsdagi WannaCry voqeasini yoki yangiliklardagi istalgan hujumni Kill Chain'ning yetti bosqichiga ajrating. Har bosqichda nima to'xtatishi mumkin edi?

**4. Piramida.** O'ylab ko'ring: "shu IP manzildan kelgan trafikni blokla" va "bir daqiqada 50 dan ortiq muvaffaqiyatsiz kirish bo'lsa, xabar ber" — qaysi qoida uzoqroq xizmat qiladi va nega?

*4-savol javobi: ikkinchisi. Birinchisi piramidaning pastida — hujumchi manzilni almashtiradi. Ikkinchisi xatti-harakatga qaratilgan va manzilga bog'liq emas.*
:::

## Xulosa

- Hujum — bir lahza emas, **bosqichlar zanjiri**; har bir bo'g'in — aniqlash va to'xtatish imkoniyati.
- **Cyber Kill Chain**: razvedka → qurollantirish → yetkazish → ekspluatatsiya → o'rnatish → C2 → maqsad.
- Zanjirni qanchalik erta uzsangiz, zarar shunchalik kam; har bosqichda — to'siq va kuzatuv.
- **MITRE ATT&CK** — haqiqiy hujumlarga asoslangan taktika va texnikalar bazasi.
- **TTP**: taktika — nima uchun; texnika — qanday; protsedura — aniq qanday.
- 14 taktika: Initial Access, Execution, Persistence, Privilege Escalation, Discovery, Lateral Movement, Exfiltration, Impact va boshqalar.
- Har texnikada — oldini olish va aniqlash bo'yicha ko'rsatma.
- **Pyramid of Pain**: xesh va IP — tez eskiradi; TTP ga qaratilgan aniqlash — eng mustahkam.
- Modellar hodisani tartibga soladi va **keyin nimani qidirish kerakligini** aytadi.

:::quiz
? Cyber Kill Chain modelining asosiy g'oyasi nima?
- Hujumni to'xtatib bo'lmaydi
+ Hujum bosqichlardan iborat va istalgan bo'g'inni uzish uni to'xtatadi
- Faqat oxirgi bosqich muhim
- Hujumchilar doim bir xil vositadan foydalanadi
! Hujumchi barcha bosqichdan o'tishi kerak; himoyachiga bittasida to'xtatish yetarli.

? Zararlangan kompyuterning hujumchi serveri bilan muntazam aloqa o'rnatishi Kill Chain'ning qaysi bosqichi?
- Delivery
- Exploitation
+ Command & Control
- Reconnaissance
! C2 — boshqaruv aloqasi. Uni chiquvchi trafik va DNS monitoringi orqali payqash mumkin.

? Hujumni qaysi bosqichda to'xtatish eng kam zarar keltiradi?
- Oxirgisida — shunda hamma narsa ma'lum bo'ladi
+ Imkon qadar erta bosqichda
- Farqi yo'q
- Faqat C2 bosqichida
! Erta to'xtatilgan hujum — bloklangan xat. Kech payqalgan hujum — insident, tergov va tiklash.

? TTP qisqartmasidagi “taktika” va “texnika” farqi nima?
- Farqi yo'q
+ Taktika — hujumchining maqsadi (nima uchun); texnika — unga erishish usuli (qanday)
- Texnika — maqsad, taktika — vosita
- Taktika faqat harbiy atama
! Masalan: taktika — Persistence (saqlanib qolish); texnika — rejalashtirilgan vazifa orqali.

? Hujumchi tizimga kirgach `whoami`, `ipconfig`, `net user` buyruqlarini bajardi. Bu ATT&CK'ning qaysi taktikasi?
- Initial Access
- Persistence
+ Discovery
- Exfiltration
! Discovery — muhitni o'rganish: kim sifatida kirgani, qanday tarmoq, qanday hisoblar.

? Zararli dasturning Run kalitiga yoki cron'ga yozilishi qaysi taktikaga kiradi?
- Execution
+ Persistence
- Impact
- Collection
! Persistence — tizim qayta yuklanganda ham saqlanib qolish.

? Pyramid of Pain'ga ko'ra hujumchi uchun qaysi belgini o'zgartirish eng oson?
+ Fayl xeshi
- TTP (xatti-harakat uslubi)
- Vositalar
- Tarmoq artefaktlari
! Faylda bitta baytni o'zgartirish xeshni butunlay o'zgartiradi. Shuning uchun xeshga asoslangan bloklash tez eskiradi.

? Qaysi aniqlash qoidasi eng uzoq xizmat qiladi?
- Aniq xeshli faylni bloklash
- Aniq IP manzilni bloklash
+ Xatti-harakatni aniqlash: masalan, ofis dasturi buyruq qobig'ini ishga tushirsa
- Aniq domenni bloklash
! Xatti-harakatga (TTP) qaratilgan qoida hujumchi qaysi fayl yoki serverni ishlatishiga bog'liq emas.

? MITRE ATT&CK texnika sahifasida nimalar bor?
- Faqat hujum tavsifi
+ Tavsif, misollar, oldini olish (Mitigations) va aniqlash (Detection) bo'yicha ko'rsatmalar
- Faqat zararli dastur namunalari
- Parollar ro'yxati
! ATT&CK — nafaqat hujum katalogi, balki himoya va aniqlash qo'llanmasi ham.

? Kill Chain modeliga nisbatan ATT&CK ning asosiy afzalligi nima?
- U qisqaroq
+ U kirgandan keyingi harakatlarni batafsil tavsiflaydi va aniq texnikalarni beradi
- U faqat Windows uchun
- U hujumlarni to'xtatadi
! Kill Chain kirgandan keyingi bosqichlarni bittaga jamlaydi; ATT&CK ularni to'qqizta taktika va yuzlab texnikaga yoyadi.

? IOC nima?
- Hujum taktikasi
+ Buzilish belgisi: zararli IP manzil, domen, fayl xeshi
- Himoya vositasi
- Sertifikat turi
! Indicator of Compromise — foydali, lekin tez eskiradigan belgilar; piramidaning pastki qismi.

? Hodisa tahlilida modellarning amaliy foydasi nima?
- Ular hujumchini avtomatik topadi
+ Kuzatuvlarni tartibga soladi va zanjirning keyingi bo'g'inlarini qidirishga yo'naltiradi
- Ular jurnallarni o'chiradi
- Ular faqat hisobot uchun kerak
! Model “bundan oldin va keyin nima bo'lishi kerak edi?” degan savolni beradi — tergov rejali ishga aylanadi.
:::

:::cards
Cyber Kill Chain bosqichlari? :: Razvedka → qurollantirish → yetkazish → ekspluatatsiya → o'rnatish → C2 → maqsadga erishish.
Kill Chain'ning asosiy g'oyasi? :: Zanjirning istalgan bo'g'inini uzish hujumni to'xtatadi; qanchalik erta — shuncha yaxshi.
MITRE ATT&CK nima? :: Hujumchilarning haqiqatda kuzatilgan taktika va texnikalari ochiq bazasi; har texnikada aniqlash va himoya yo'llari.
TTP nima? :: Tactics (nima uchun), Techniques (qanday), Procedures (aniq qanday) — hujumchining xatti-harakat uslubi.
Persistence, Discovery, Lateral Movement? :: Persistence — saqlanib qolish; Discovery — muhitni o'rganish; Lateral Movement — tarmoq ichida ko'chish.
Initial Access va Exfiltration? :: Initial Access — birinchi kirish (phishing, ochiq xizmat); Exfiltration — ma'lumotni olib chiqish.
C2 nima? :: Command and Control — zararlangan tizim va hujumchi serveri orasidagi boshqaruv aloqasi.
Pyramid of Pain? :: Belgilarni hujumchi uchun o'zgartirish qiyinligi bo'yicha tartiblaydi: xesh → IP → domen → artefakt → vosita → TTP.
IOC nima? :: Indicator of Compromise — buzilish belgisi: zararli IP, domen, xesh. Foydali, lekin tez eskiradi.
Eng mustahkam aniqlash nimaga qaratiladi? :: Xatti-harakatga (TTP) — aniq fayl yoki manzilga emas.
ATT&CK Navigator nima uchun? :: Qaysi texnikalarni aniqlay olishimizni matritsada belgilab, himoya qamrovini ko'rish uchun.
:::
