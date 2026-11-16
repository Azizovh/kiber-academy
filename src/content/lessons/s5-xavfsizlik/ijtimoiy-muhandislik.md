Kompaniya firewall'ga, shifrlashga, monitoring tizimiga katta mablag' sarfladi. Keyin buxgalterga "direktor"dan xat keldi: "Shoshilinch, mana bu hisobga pul o'tkazing, majlisdaman, qo'ng'iroq qilmang". Buxgalter o'tkazdi. Hech qanday texnik himoya buzilmadi — aldangan narsa **inson** edi.

Haqiqiy hujumlarning katta qismi aynan shunday boshlanadi. Shuning uchun xavfsizlikchi texnika bilan birga inson psixologiyasini ham tushunishi kerak — hujum qilish uchun emas, **tanib olish va himoyalash** uchun.

## Ijtimoiy muhandislik nima

[[social-engineering|Ijtimoiy muhandislik]] (social engineering) — texnik zaiflik emas, **insonning ishonchi, odatlari va his-tuyg'ularidan** foydalanib, ma'lumot yoki kirish huquqini qo'lga kiritish.

Nega u bunchalik keng tarqalgan? Chunki ko'pincha tizimni buzishdan ko'ra odamni ishontirish osonroq. Hujumchi qulfni ochishga urinmaydi — sizdan kalitni so'raydi, va shunday so'raydiki, siz o'zingiz berasiz.

Muhim nuqta: aldanish — ahmoqlik belgisi emas. Bu usullar inson miyasining **normal** ishlashiga tayanadi: biz boshliqqa quloq solamiz, yordam berishni xohlaymiz, shoshilganda kamroq o'ylaymiz. Tajribali mutaxassislar ham aldanadi. Himoya — "aqlliroq bo'lish" emas, **to'g'ri odatlar va jarayonlar**.

## Psixologik dastaklar

Deyarli har bir aldov quyidagi dastaklardan bir yoki bir nechtasini bosadi. Ularni tanib olish — himoyaning yarmi:

| Dastak | Qanday eshitiladi | Nega ishlaydi |
|---|---|---|
| **Shoshilinchlik** | "Hisobingiz 1 soatda bloklanadi" | Shoshilgan odam tekshirmaydi |
| **Obro'** (authority) | "Men direktorman / bank xodimiman / politsiyadanman" | Biz yuqori turuvchiga bo'ysunishga o'rganganmiz |
| **Qo'rquv** | "Kompyuteringizda virus topildi", "sizga jinoiy ish ochildi" | Qo'rquv fikrlashni o'chiradi |
| **Ochko'zlik / qiziqish** | "Siz yutdingiz", "ish haqi jadvali.xlsx" | Foyda yoki sir vasvasasi |
| **Yordam berish istagi** | "Yangi xodimman, yordam bera olasizmi?" | Rad etish noqulay |
| **Ko'pchilik** | "Barcha hamkasblaringiz allaqachon to'ldirdi" | Boshqalar qilsa, to'g'ri tuyuladi |
| **Tanishlik** | Do'stingiz hisobidan kelgan xabar | Tanish odamga ishonamiz |

Eng kuchli signal — **shoshilinchlik va maxfiylikning birikmasi**: "tez qil **va** hech kimga aytma". Qonuniy so'rov sizni tekshirishdan qaytarmaydi; aldov — doim qaytaradi.

## Phishing

[[phishing|Phishing]] — ishonchli manba niqobidagi soxta xabar orqali ma'lumot olish yoki zararli harakat qildirish. Eng keng tarqalgan ijtimoiy muhandislik turi.

Xabar odatda uch narsadan birini xohlaydi:

1. **Havolani bosib, ma'lumot kiritishingizni** — soxta kirish sahifasi.
2. **Ilovani ochishingizni** — zararli fayl.
3. **Biror amal bajarishingizni** — pul o'tkazish, ma'lumot yuborish, kod aytish.

### Turlari

| Tur | Mohiyati |
|---|---|
| **Ommaviy phishing** | Minglab odamga bir xil xat: "hisobingiz bloklandi" |
| [[spear-phishing|Spear phishing]] | **Aniq shaxsga** moslab yozilgan: ismi, lavozimi, loyihasi tilga olinadi |
| **Whaling** | Rahbariyatga qaratilgan spear phishing |
| **BEC** (Business Email Compromise) | Rahbar yoki hamkor nomidan pul o'tkazish yoki ma'lumot so'rash |
| [[vishing|Vishing]] | Telefon qo'ng'irog'i orqali |
| **Smishing** | SMS yoki messenjer orqali |
| **Quishing** | QR-kod orqali — havola kod ichida yashiringan |

Spear phishing ommaviydan ancha xavfli: hujumchi oldindan tayyorlanadi — LinkedIn, kompaniya sayti, ijtimoiy tarmoqlardan ma'lumot yig'adi (bu [[osint|OSINT]]) va xatni shunday yozadiki, u haqiqiy ish yozishmasidan farq qilmaydi.

Dars boshidagi misol — **BEC**. Unda ko'pincha na havola, na ilova bo'ladi — shuning uchun texnik filtrlar uni ushlay olmaydi. Faqat jarayon himoya qiladi: pul o'tkazmasini boshqa kanal orqali tasdiqlash.

### Soxta xatni tanish

Shubhali xatni ko'rganda tekshiriladigan narsalar:

**1. Jo'natuvchi manzili — ism emas, manzilning o'zi.**

```
Ko'rinadigan ism:   MyBank Xavfsizlik Xizmati
Haqiqiy manzil:     security@mybank-support.com
```

Ko'rinadigan ismga istalgan narsani yozish mumkin. Manzilga qarang: domen to'g'rimi? Harflar almashtirilmaganmi (`l` o'rniga `1`, `o` o'rniga `0`)? DNS darsidagi typosquatting — shu.

**2. Havola qayerga olib boradi.**

Sichqonchani havola ustiga olib boring (bosmasdan) — pastda haqiqiy manzil ko'rinadi. Matnda `bank.uz` yozilgan bo'lishi, havolaning o'zi esa boshqa joyga olib borishi mumkin.

Manzilni **o'ngdan chapga** o'qing — haqiqiy domen oxirgi sleshdan oldingi qism:

| Manzil | Haqiqiy domen |
|---|---|
| `https://bank.uz/kirish` | `bank.uz` ✓ |
| `https://bank.uz.xavfsiz-kirish.com/` | `xavfsiz-kirish.com` ✗ |
| `https://xavfsiz-kirish.com/bank.uz/` | `xavfsiz-kirish.com` ✗ |
| `https://bank-uz.com/` | `bank-uz.com` ✗ |

Ikkinchi qator eng ko'p aldaydi: `bank.uz` boshida turibdi, lekin u faqat subdomen. DNS darsida domen nomi o'ngdan chapga o'qilishini o'rgangansiz — mana uning amaliy foydasi.

**3. Ohang va mazmun.** Shoshilinchlik, tahdid, kutilmagan yutuq, g'ayrioddiy so'rov. Bank hech qachon xat orqali parol yoki SMS kodini so'ramaydi.

**4. Ilova.** Kutilmagan fayl — ayniqsa arxiv, makrosli hujjat yoki ikki kengaytmali fayl. "Fayl tizimlari" darsini eslang.

**5. Umumiy kontekst.** Men buni kutganmidim? Bu odam odatda menga shunday yozadimi? Shu kanal orqalimi?

:::warn
Bugun grammatik xatolarga tayanib bo'lmaydi. Sun'iy intellekt vositalari har qanday tilda ravon, xatosiz matn yozadi; ovozni va hatto videoni soxtalashtirish ham mumkin. "Xatoli yozilgan xat — phishing, ravon yozilgani — haqiqiy" degan qoida eskirdi. Ishoning emas — **tekshiring**.
:::

Qulf belgisi ham yordam bermaydi: HTTP darsidan bilasiz — phishing saytlari ham HTTPS da ishlaydi.

### Shubhalansangiz

1. **Havolani bosmang, ilovani ochmang.**
2. **Boshqa kanal orqali tekshiring.** Xatdagi raqamga emas — o'zingiz bilgan raqamga qo'ng'iroq qiling; saytga xatdagi havola orqali emas — manzilni o'zingiz yozib kiring.
3. **Xabar bering** — ishda xavfsizlik bo'limiga. Bitta xabar butun kompaniyani ogohlantiradi.
4. **Bosib qo'ygan bo'lsangiz** — yashirmang. Darhol xabar bering va parolni almashtiring. Tezlik zararni kamaytiradi; yashirish — ko'paytiradi.

To'rtinchi band tashkilot madaniyatiga bog'liq: xato qilgan xodim jazolanadigan joyda odamlar yashiradi. Yaxshi xavfsizlik madaniyati — xabar bergan odamni rag'batlantiradi.

## Boshqa usullar

| Usul | Mohiyati | Misol |
|---|---|---|
| [[pretexting|Pretexting]] | O'ylab topilgan vaziyat (bahona) bilan ishonchga kirish | "IT bo'limidanman, kompyuteringizni tekshiryapmiz, parolingizni ayting" |
| **Baiting** | O'lja tashlash | Avtoturargohda "Ish haqi 2026" yozuvli fleshka |
| **Quid pro quo** | Xizmat evaziga ma'lumot | "Internetingizni tuzatib beraman, faqat mana bu dasturni o'rnating" |
| **Tailgating** | Ruxsati bor odam ortidan binoga kirish | Qo'lida quti bilan: "eshikni ushlab turing, iltimos" |
| **Shoulder surfing** | Yelka osha qarab, parol yoki ekranni ko'rish | Kafeda, transportda |
| **Dumpster diving** | Chiqindidan hujjat qidirish | Maydalanmagan hisobotlar, stikerlar |
| **Watering hole** | Nishon tez-tez kiradigan saytni zararlash | Soha forumi, yetkazib beruvchi sayti |

Pretexting — ko'pchiligining asosi: hujumchi **rol o'ynaydi** — texnik yordam, kuryer, yangi xodim, tekshiruvchi. Rol qanchalik ishonchli va oddiy bo'lsa, shunchalik kam savol tug'iladi.

Jismoniy usullarga e'tibor bering: tailgating, shoulder surfing. Xavfsizlik faqat tarmoqda emas — binoga kirgan odam uchun ochiq qolgan kompyuter, monitordagi stiker va qulflanmagan server xonasi tayyor imkoniyat.

### Telefon firibgarligi

O'zbekistonda eng keng tarqalgan ko'rinish — "bank xavfsizlik xizmati"dan qo'ng'iroq: "kartangizdan shubhali o'tkazma bo'lyapti, uni to'xtatish uchun SMS dagi kodni ayting".

Bu yerda uch dastak birga ishlaydi: **obro'** (bank), **qo'rquv** (pulingiz ketyapti), **shoshilinchlik** (hozir!). Himoyasi bitta va juda oddiy:

:::key
**SMS kodi, karta ma'lumoti va parolni hech kimga — bank xodimiga ham, "politsiyaga" ham, yaqiningizga ham — aytmang.** Haqiqiy bank ularni hech qachon so'ramaydi. Shubhali qo'ng'iroqda — go'shakni qo'ying va bankning **rasmiy raqamiga o'zingiz** qo'ng'iroq qiling.
:::

Bu qoidani oila a'zolaringizga — ayniqsa katta yoshdagilarga — tushuntirish, ehtimol, bu darsdan chiqadigan eng foydali amaliy ish.

## Himoya: inson va jarayon

Texnik choralar yordam beradi, lekin ijtimoiy muhandislikka qarshi asosiy himoya — **odatlar va jarayonlar**.

### Shaxsiy odatlar

- **To'xtash.** Xabar sizni shoshiltirsa — aynan shu paytda sekinlashing.
- **Boshqa kanal orqali tekshirish.** G'ayrioddiy so'rov — har doim.
- **Har sayt uchun alohida parol + MFA.** Aldanib parol kiritib qo'ysangiz ham, zarar cheklanadi.
- **Ortiqcha ma'lumot ulashmaslik.** Ijtimoiy tarmoqdagi lavozim, hamkasblar, ta'til sanalari — spear phishing uchun xomashyo.
- **Ekranni qulflash** (`Win + L`) — joydan turganda har safar.

### Tashkilot jarayonlari

| Chora | Nimadan himoya qiladi |
|---|---|
| **Pul o'tkazmasi va rekvizit o'zgarishini ikkinchi kanal orqali tasdiqlash** | BEC |
| **"Parolni hech kim so'ramaydi" qoidasi** — IT ham | Pretexting |
| **Oson xabar berish kanali va jazolamaslik madaniyati** | Kech aniqlash |
| **Muntazam, qisqa o'qitish va sinov phishing xatlari** | Barcha turlari |
| **Mehmonlarni kuzatib yurish, propusk tizimi** | Tailgating |
| **Hujjatlarni maydalash** | Dumpster diving |

### Texnik qatlam

- **Pochta filtrlari** va jo'natuvchini tekshirish: SPF, DKIM, DMARC (tarmoq bosqichidan).
- **MFA** — ayniqsa phishing'ga chidamli turlari: apparat kalitlari va passkey'lar soxta saytda ishlamaydi, chunki ular sayt manzilini o'zi tekshiradi.
- **Parol menejeri** — u ham manzilni tekshiradi: soxta saytda parolni avtomatik to'ldirmaydi. Bu — phishing'ga qarshi kutilmagan, lekin kuchli himoya.
- **Tashqi xatlarni belgilash** ("Bu xat tashkilot tashqarisidan kelgan").
- **Makroslarni o'chirish**, ilovalarni xavfsiz muhitda ochish.

Qatlamli himoya g'oyasi shu yerda ham amal qiladi: filtr ko'p xatni ushlaydi; o'tib ketganini xodim taniydi; tanimay bosib qo'ysa — MFA to'xtatadi; to'xtatmasa — monitoring sezadi.

## Etika

Pentestda ijtimoiy muhandislik ham sinaladi — tashkilot buyurtmasi bilan sinov phishing xatlari yuboriladi, binoga kirishga urinib ko'riladi. Lekin bu yerda "Etika va qonun" darsidagi qoida ayniqsa qat'iy:

- Faqat **yozma ruxsat** va aniq belgilangan qamrov bilan.
- Maqsad — xodimni sharmanda qilish emas, **jarayonni yaxshilash**. Natijalar shaxslar bo'yicha emas, umumlashtirilgan holda beriladi.
- Odamlarning shaxsiy hayoti, sog'lig'i, oilasiga oid mavzular — taqiqlangan.

Ruxsatsiz birovni aldash — bu sinov emas, firibgarlik.

:::try
**1. O'z pochtangizdan namunalar.** Spam papkangizni oching va 3 ta phishing xatni toping. Har biri uchun aniqlang: qaysi psixologik dastak ishlatilgan? Jo'natuvchining haqiqiy manzili qanday? Havola qayerga olib boradi (bosmasdan, ustiga borib qarang)?

**2. Mashq.** Mavzu manbalaridagi **Google Phishing Quiz** ni o'ting — u haqiqiy va soxta xatlarni farqlashni sinaydi.

**3. Domenni o'qish.** Quyidagilardan qaysi biri haqiqatan `mybank.uz` ga tegishli?
`https://mybank.uz.tolov-tasdiq.com/`, `https://kabinet.mybank.uz/kirish`, `https://mybank-uz.com/`, `https://tolov.com/mybank.uz`

**4. Oilangiz.** Ota-onangiz yoki yaqinlaringizga "SMS kodini hech kimga aytmang" qoidasini tushuntiring.

*3-savol javobi: faqat ikkinchisi — `kabinet.mybank.uz` (`mybank.uz` ning subdomeni).*
:::

## Xulosa

- **Ijtimoiy muhandislik** — texnikani emas, insonni aldash; aldanish ahmoqlik emas.
- Dastaklar: **shoshilinchlik, obro', qo'rquv, ochko'zlik, yordam istagi**. Shoshilinchlik + maxfiylik — eng kuchli signal.
- **Phishing** turlari: ommaviy, spear, whaling, BEC, vishing, smishing.
- Tekshirish: jo'natuvchining **haqiqiy manzili**, havolaning **haqiqiy domeni** (o'ngdan chapga), ohang, ilova, kontekst.
- Ravon til va qulf belgisi — ishonch belgisi emas.
- Shubhalansangiz: bosmang → boshqa kanal orqali tekshiring → xabar bering.
- **Kod, parol va karta ma'lumotini hech kimga aytmang.**
- Himoya: odatlar + jarayonlar (ikkinchi kanal orqali tasdiqlash) + texnik qatlam (MFA, parol menejeri, filtrlar).

:::quiz
? Ijtimoiy muhandislik nimaga asoslanadi?
- Dasturdagi zaifliklarga
+ Insonning ishonchi, odatlari va his-tuyg'ulariga
- Tarmoq protokollaridagi xatolarga
- Kuchli kompyuterlarga
! Bu texnik emas, psixologik hujum: odam o'zi ma'lumot beradi yoki kerakli amalni bajaradi.

? “Hisobingiz 30 daqiqada bloklanadi, darhol tasdiqlang” degan xabar qaysi dastakni ishlatadi?
- Yordam berish istagi
+ Shoshilinchlik (va qo'rquv)
- Ko'pchilik
- Tanishlik
! Vaqt bosimi odamni tekshirmasdan harakat qilishga undaydi. Shoshiltirilganda — aynan shu paytda sekinlashing.

? `https://mybank.uz.kirish-tasdiq.com/login` manzilining haqiqiy domeni qaysi?
- mybank.uz
+ kirish-tasdiq.com
- login
- uz.kirish
! Domen o'ngdan chapga o'qiladi: birinchi sleshdan oldingi oxirgi qism — kirish-tasdiq.com. mybank.uz bu yerda faqat subdomen.

? Spear phishing ommaviy phishing'dan nimasi bilan farq qiladi?
- U faqat SMS orqali keladi
+ U aniq shaxs yoki tashkilotga moslab, oldindan yig'ilgan ma'lumot asosida tayyorlanadi
- U har doim ilova bilan keladi
- U xavfsizroq
! Nishonli xat ism, lavozim va haqiqiy kontekstni ishlatadi — shuning uchun uni tanish ancha qiyin.

? Buxgalterga “direktor”dan shoshilinch pul o'tkazish so'ralgan xat keldi. To'g'ri harakat qaysi?
- Darhol o'tkazish — direktor so'radi
- Xatga javob yozib so'rash
+ Direktorga o'zi bilgan boshqa kanal (telefon, shaxsan) orqali murojaat qilib tasdiqlash
- Xatni o'chirib, hech kimga aytmaslik
! BEC hujumida xatning o'ziga javob yozish hujumchi bilan gaplashish demakdir. Tasdiq faqat mustaqil kanal orqali.

? “Bank xodimi” qo'ng'iroq qilib, SMS dagi kodni so'radi. Nima qilasiz?
- Kodni aytaman — u bankdan
- Faqat kodning yarmini aytaman
+ Aytmayman, go'shakni qo'yaman va bankning rasmiy raqamiga o'zim qo'ng'iroq qilaman
- Karta raqamini aytaman, kodni emas
! Haqiqiy bank kod, parol yoki to'liq karta ma'lumotini hech qachon so'ramaydi.

? Saytda qulf belgisi (HTTPS) bor va matni xatosiz yozilgan. Bu sayt haqiqiy ekanini bildiradimi?
- Ha, ikkalasi ham ishonch belgisi
+ Yo'q — phishing saytlari ham HTTPS ishlatadi va matnni xatosiz yozish oson
- Ha, agar sayt tez ochilsa
- Faqat qulf yashil bo'lsa
! HTTPS faqat ulanish shifrlanganini bildiradi. Domenni tekshirish kerak.

? Avtoturargohda “Ish haqi 2026” yozuvli fleshka topdingiz. Bu qaysi usulga o'xshaydi?
- Tailgating
- Vishing
+ Baiting (o'lja)
- Shoulder surfing
! Qiziqish uyg'otadigan o'lja tashlanadi — uni kompyuterga ulagan odam zararli dasturni o'zi ishga tushiradi.

? Phishing havolasini bosib, parolingizni kiritib qo'yganingizni tushundingiz. Nima qilish kerak?
- Hech kimga aytmaslik — balki hech narsa bo'lmas
+ Darhol parolni almashtirish va (ishda) xavfsizlik bo'limiga xabar berish
- Kompyuterni bir hafta yoqmaslik
- Xatni o'chirish yetarli
! Tezlik hal qiladi: parol almashtirilsa va xabar berilsa, zarar cheklanadi. Yashirish hujumchiga vaqt beradi.

? Parol menejeri phishing'dan qanday himoya qiladi?
- U xatlarni o'chiradi
+ U parolni faqat haqiqiy sayt manzilida avtomatik to'ldiradi — soxta domenda taklif qilmaydi
- U internetni bloklaydi
- U himoya qilmaydi
! Menejer manzilni aniq solishtiradi: o'xshash, lekin boshqa domenda parol taklif etilmasligi — ogohlantirish belgisi.

? Tashkilotda xato qilgan (phishing'ga aldangan) xodimga qanday munosabat to'g'ri?
- Jazolash — boshqalarga saboq bo'lsin
+ Tez xabar berganini qo'llab-quvvatlash — aks holda odamlar xatoni yashiradi
- Ishdan bo'shatish
- E'tibor bermaslik
! Jazolash madaniyati yashirishga olib keladi va aniqlashni kechiktiradi. Tez xabar berish — eng qimmatli xatti-harakat.
:::

:::cards
Ijtimoiy muhandislik nima? :: Texnik zaiflik emas, inson psixologiyasidan foydalanib ma'lumot yoki kirish huquqini qo'lga kiritish.
Asosiy psixologik dastaklar? :: Shoshilinchlik, obro', qo'rquv, ochko'zlik/qiziqish, yordam berish istagi, ko'pchilik, tanishlik.
Phishing, spear phishing, whaling? :: Phishing — ommaviy soxta xabar; spear phishing — aniq shaxsga moslangan; whaling — rahbariyatga qaratilgan.
BEC nima? :: Business Email Compromise — rahbar yoki hamkor nomidan pul o'tkazish yoki ma'lumot so'rash; ko'pincha havola ham, ilova ham yo'q.
Vishing va smishing? :: Vishing — telefon orqali; smishing — SMS yoki messenjer orqali phishing.
Havoladagi haqiqiy domenni qanday aniqlanadi? :: Manzilni o'ngdan chapga o'qib: birinchi sleshdan oldingi oxirgi qism (masalan bank.uz.soxta.com → soxta.com).
Shubhali xabarda nima qilinadi? :: Bosmaslik, boshqa (mustaqil) kanal orqali tekshirish, xabar berish.
Pretexting va baiting? :: Pretexting — o'ylab topilgan bahona va rol bilan ishonchga kirish; baiting — o'lja tashlash (masalan fleshka).
Tailgating nima? :: Ruxsati bor odam ortidan binoga yoki xonaga kirib olish.
SMS kodi haqidagi oltin qoida? :: Kod, parol va karta ma'lumotini hech kimga aytmaslik — haqiqiy bank ularni so'ramaydi.
BEC ga qarshi asosiy jarayon? :: Pul o'tkazmasi va rekvizit o'zgarishini ikkinchi, mustaqil kanal orqali tasdiqlash.
:::
