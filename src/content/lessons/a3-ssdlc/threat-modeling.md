a2 bosqichida Qaydnoma'dagi zaifliklarni **kod yozilgandan keyin** topib, tuzatdingiz. Har bir tuzatish — vaqt: kodni o'zgartirish, test yozish, qayta joylash. Ba'zilari esa arxitektura darajasida edi: masalan, administrator boshqalarning qaydlarini ko'ra oladimi — bu kod emas, **loyiha qarori**.

Tasavvur qiling, bu savollarning hammasi kod yozilishidan **oldin**, oq doska oldida, bir soatlik suhbatda berilgan bo'lsa. "Qayd ulashish funksiyasini qo'shamiz. Nima noto'g'ri ketishi mumkin?" — "Begona odam ID'ni o'zgartirib, birovning qaydini ko'rishi mumkin." — "Demak, markazlashgan ruxsat tekshiruvi kerak." Bitta jumla — va IDOR hech qachon paydo bo'lmaydi.

Bu — **threat modeling** (tahdid modellashtirish): tizimda nima noto'g'ri ketishi mumkinligini **tizimli** o'ylash. Xavfsizlik bosqichidagi risk tushunchasi va ATT&CK darsining dasturiy ta'minot loyihalashdagi qo'llanishi.

## To'rt savol

Threat modeling'ning eng mashhur va oddiy ramkasi — to'rt savol:

```
 1. Nima ustida ishlayapmiz?        → tizim modeli (diagramma)
 2. Nima noto'g'ri ketishi mumkin?   → tahdidlar (STRIDE)
 3. Bunga qarshi nima qilamiz?      → himoya choralari
 4. Yaxshi ish qildikmi?            → tekshirish (testlar, ko'rib chiqish)
```

Bu savollarni beradigan har qanday jarayon — threat modeling. Murakkab vositalar va hujjatlar ixtiyoriy; asosiysi — savollarni **kod yozishdan oldin** va **har bir muhim o'zgarishda** berish.

## 1. Tizim modeli: DFD

Tizimni tushunish uchun **[[dfd|DFD]]** (Data Flow Diagram — ma'lumot oqimi diagrammasi) chiziladi. Unda faqat beshta element bor:

| Element | Belgilanishi | Ma'nosi | Qaydnoma'da |
|---|---|---|---|
| **Tashqi obyekt** | To'rtburchak | Tizimdan tashqaridagi aktor | Foydalanuvchi, administrator, to'lov xizmati |
| **Jarayon** | Doira | Ma'lumotni qayta ishlaydigan kod | Qaydnoma web ilovasi, API |
| **Ma'lumot ombori** | Ikki parallel chiziq | Saqlanadigan ma'lumot | Ma'lumotlar bazasi, sessiya ombori, fayllar |
| **Ma'lumot oqimi** | Strelka | Ma'lumot harakati | HTTPS so'rovlar, SQL so'rovlar |
| **Ishonch chegarasi** | Uzuq chiziq | Ishonch darajasi o'zgaradigan joy | Internet ↔ server, ilova ↔ baza |

Qaydnoma'ning soddalashtirilgan DFD'si:

```
                    ┆ (ishonch chegarasi: Internet ↔ Qaydnoma)
 ┌─────────────┐    ┆                                      ┆
 │ Foydalanuv- │──1─┼──► (  Qaydnoma web/API  ) ──4──►═════╪═══ Ma'lumotlar bazasi ═══
 │ chi         │◄─2─┼─── (                    ) ◄──5──     ┆   (users, notes, shares)
 └─────────────┘    ┆           │      ▲                   ┆
 ┌─────────────┐    ┆           6      7                   ┆
 │ Administra- │──3─┼──►        ▼      │                   ┆
 │ tor         │    ┆    ═══ Sessiyalar ═══                ┆
 └─────────────┘    ┆                                      ┆
                    ┆           8 (webhook)                ┆
 ┌─────────────┐    ┆           │                          ┆
 │ To'lov      │────┼───────────┘                          ┆
 │ xizmati     │    ┆                                      ┆
 └─────────────┘    ┆           9 (havola oldindan ko'rish)┆
                    ┆  ◄────────┘  → Internetdagi saytlar  ┆ (ishonch chegarasi: ilova ↔ baza)

 1 — login, qayd yaratish/ko'rish (HTTPS)    5 — natijalar
 2 — HTML/JSON javoblar                      6, 7 — sessiya ma'lumotlari
 3 — admin funksiyalari                      8 — to'lov tasdiqlari (webhook)
 4 — SQL so'rovlar                           9 — server tashqi URL'larga so'rov (SSRF xavfi!)
```

Diagrammani chizishning o'zi foydali: ko'pincha jamoa birinchi marta **9-oqimni** — server o'zi tashqi saytlarga so'rov yuborishini — aniq ko'radi. Va har bir **ishonch chegarasini kesib o'tgan oqim** — tahdidlar qidiriladigan birinchi joy (a1 bosqichidagi ishonch chegarasi tushunchasi).

## 2. Nima noto'g'ri ketishi mumkin: STRIDE

[[stride|STRIDE]] — tahdidlarni o'ylashni tizimlashtiradigan oltita toifa. Har biri xavfsizlikning bir xususiyatini buzadi:

| Harf | Tahdid | Buziladigan xususiyat | Savol | Qaydnoma'da misol |
|---|---|---|---|---|
| **S** | **Spoofing** — o'zini boshqa deb ko'rsatish | Autentifikatsiya | Kimdir o'zini boshqa foydalanuvchi yoki xizmat deb ko'rsata oladimi? | O'g'irlangan sessiya cookie'si; soxta to'lov webhook'i |
| **T** | **Tampering** — o'zgartirish | Yaxlitlik | Ma'lumotni ruxsatsiz o'zgartirish mumkinmi? | Boshqa birovning qaydini tahrirlash; narxni o'zgartirish |
| **R** | **Repudiation** — inkor qilish | Hisobdorlik | Kimdir qilgan ishini inkor eta oladimi — bizda iz bormi? | Administrator foydalanuvchini o'chirdi, lekin log yo'q |
| **I** | **Information disclosure** — ma'lumot sizishi | Maxfiylik | Ma'lumot ruxsatsiz odamga ko'rinadimi? | IDOR; batafsil xato xabarlari; API'da `password_hash` |
| **D** | **Denial of service** — xizmatdan mahrum qilish | Foydalanuvchanlik | Tizimni ishlamaydigan qilish mumkinmi? | Limitsiz qidiruv; katta fayl yuklash |
| **E** | **Elevation of privilege** — huquqni oshirish | Avtorizatsiya | Kimdir o'ziga ruxsat etilmagan huquq olishi mumkinmi? | Mass assignment orqali `role=admin` |

Xavfsizlik bosqichidagi **CIA** uchligini eslang: STRIDE uni kengaytiradi — autentifikatsiya, hisobdorlik va avtorizatsiyani ham qo'shadi.

### STRIDE'ni qanday qo'llash

Eng oddiy usul: DFD'dagi **har bir element va oqim** uchun oltita harfni ketma-ket so'rash. Qaydnoma'ning bir nechta elementi uchun:

| Element | Tahdid (STRIDE) | Himoya | Holat |
|---|---|---|---|
| 1 — Login oqimi | **S**: parol terish | Rate limiting, MFA (ixtiyoriy), umumiy xato xabari | Qisman: rate limiting bor, MFA yo'q |
| 1 — Qayd ko'rish | **I**: IDOR | Markazlashgan `load_note()` + matritsa testlari | ✓ |
| 1 — Qayd yaratish | **T/E**: mass assignment (`owner_id`, `role`) | Kirish sxemalari, `owner_id` sessiyadan | ✓ |
| 2 — HTML javoblar | **T** (brauzerda): XSS | Avtomatik kodlash, sanitizatsiya, CSP | ✓ |
| 4 — SQL so'rovlar | **T/I**: injection | Parametrlangan so'rovlar, eng kam huquqli baza foydalanuvchisi | Parametrlash ✓; baza huquqlari — **ochiq** |
| Ma'lumotlar bazasi | **I**: zaxira nusxa sizishi | Zaxirani shifrlash, kirishni cheklash | **Ochiq** |
| 3 — Admin funksiyalari | **R**: kim nima qilgani noma'lum | Admin harakatlarini audit logiga yozish | **Ochiq** |
| 8 — Webhook | **S**: soxta "to'lov qilindi" | HMAC imzo, vaqt belgisi | ✓ |
| 9 — Havola oldindan ko'rish | **I/E**: SSRF → bulut kalitlari | IP tekshiruvi, egress proxy, IMDSv2 | Qisman |
| Qidiruv | **D**: og'ir so'rovlar | Rate limiting, natijalar chegarasi | ✓ |

"Ochiq" qatorlar — bu sizning **ish ro'yxatingiz**. Va ular — xuddi b2 bosqichidagi ATT&CK qamrov xaritasidagi bo'shliqlar kabi — tahdidlar tizimli o'ylab chiqilgani uchun ko'rindi.

### Hujum daraxtlari

Muayyan bitta maqsad uchun chuqurroq o'ylashda — **hujum daraxti**: ildizda hujumchi maqsadi, shoxlarda unga erishish yo'llari:

```
 MAQSAD: Boshqa foydalanuvchining qaydini o'qish
 ├── Qaydga to'g'ridan-to'g'ri murojaat
 │    ├── IDOR (ruxsat tekshiruvi yo'q endpoint)          → load_note() hamma joyda ✓
 │    └── Qidiruv/eksport orqali (filtrlanmagan ro'yxat)    → ro'yxatlarda ham filtr ✓
 ├── Foydalanuvchi nomidan harakat qilish
 │    ├── Sessiyani o'g'irlash (XSS → cookie)              → HttpOnly, CSP ✓
 │    ├── Parolni bilish (terish, sizib chiqqan parol)      → rate limiting; MFA — ochiq
 │    └── Parolni tiklashni suiiste'mol qilish              → bir martalik token, domen serverdan ✓
 ├── Ma'lumotlar bazasiga kirish
 │    ├── SQL injection                                     → parametrlash ✓
 │    └── Zaxira nusxa sizishi                              → ochiq
 └── Ulashish funksiyasini suiiste'mol qilish
      └── O'zini qaydga "ulashilgan" qilib qo'shish          → faqat egasi ulasha oladi (SHARE) ✓
```

Daraxt **yo'llarni** ko'rsatadi: hujumchiga faqat **bitta** shox yetarli, himoyachi esa hammasini yopishi kerak.

## 3. Nima qilamiz: himoya va qarorlar

Har bir tahdid uchun to'rtta yo'l bor:

| Qaror | Ma'nosi | Misol |
|---|---|---|
| **Kamaytirish** (mitigate) | Himoya chorasi qo'shish | Markazlashgan ruxsat tekshiruvi |
| **Yo'q qilish** (eliminate) | Funksiyani olib tashlash yoki o'zgartirish | Havola oldindan ko'rishni umuman qilmaslik |
| **O'tkazish** (transfer) | Javobgarlikni boshqaga berish | To'lovni tashqi xizmat qayta ishlaydi — karta ma'lumotlari bizda yo'q |
| **Qabul qilish** (accept) | Xavfni ongli qabul qilish, hujjatlashtirib | "Admin harakatlari audit logi — keyingi chorakda; hozircha qabul qilindi (rahbar: X)" |

"Qabul qilish" — normal va halol qaror, agar u **ongli** va **hujjatlashtirilgan** bo'lsa: kim qaror qildi, nega, qachon qayta ko'rib chiqiladi. Yashirin qabul qilish ("hech kim o'ylamadi") — qaror emas, bo'shliq.

### Xavfni baholash

Hamma tahdid bir xil muhim emas. Oddiy usul — **ehtimollik × ta'sir** (xavfsizlik bosqichidagi risk formulasi):

| | Past ta'sir | O'rta ta'sir | Yuqori ta'sir |
|---|---|---|---|
| **Yuqori ehtimollik** | O'rta | Yuqori | **Kritik** |
| **O'rta ehtimollik** | Past | O'rta | Yuqori |
| **Past ehtimollik** | Past | Past | O'rta |

Masalan: IDOR — yuqori ehtimollik (oson, keng tarqalgan) × yuqori ta'sir (barcha qaydlar) = kritik. Zaxira nusxa sizishi — past ehtimollik × yuqori ta'sir = o'rta. Ustuvorlik shundan kelib chiqadi.

## 4. Yaxshi ish qildikmi

Model — tirik hujjat. Tekshirish usullari:

- Har bir himoya **test** bilan isbotlanganmi? (a2 bosqichidagi xavfsiz kod amaliyoti)
- Kod ko'rib chiqish (keyingi darslardan biri) model taxminlariga mos keladimi?
- Pentest yoki DAST natijalari modelda yo'q tahdidni topdimi? — Modelni yangilang.
- Yangi funksiya qo'shildimi? — DFD va STRIDE jadvalini yangilang.

:::key
**Threat modeling — eng arzon xavfsizlik vositasi.** Loyihalash bosqichida topilgan muammo — doskadagi chiziqni o'chirish; ishlab chiqarishda topilgan — insident, tuzatish, qayta joylash va obro'. Muhimi — mukammallik emas, **muntazamlik**: har bir muhim funksiya uchun bir soatlik suhbat, to'rt savol va STRIDE jadvali. Murakkab vositalarsiz ham, oq doska va jamoaning o'zi bilan. Va eng muhimi — natija **harakatga** aylansin: har bir "ochiq" qator — vazifa, test yoki ongli qabul qilish.
:::

## Kim, qachon, qanday

| Savol | Javob |
|---|---|
| **Kim?** | Dasturchilar, arxitektor, mahsulot egasi va AppSec muhandisi — birgalikda. AppSec muhandisi jarayonni boshqaradi, lekin tizimni eng yaxshi biladigan — jamoa |
| **Qachon?** | Yangi tizim loyihalanganda; muhim funksiya qo'shilganda (to'lov, fayl yuklash, yangi integratsiya); arxitektura o'zgarganda; insidentdan keyin |
| **Qancha vaqt?** | Kichik funksiya — 30–60 daqiqa; katta tizim — bir necha sessiya |
| **Natija** | DFD, STRIDE jadvali (tahdid, himoya, holat, mas'ul), ochiq masalalar ro'yxati |

### Vositalar

| Vosita | Izoh |
|---|---|
| **Oq doska / qog'oz** | Eng tez — boshlash uchun yetarli |
| **OWASP Threat Dragon** | Bepul, ochiq kodli: DFD chizish va STRIDE tahdidlarini qo'shish |
| **Microsoft Threat Modeling Tool** | Bepul, Windows uchun; STRIDE avtomatik taklif qiladi |
| **Diagramma vositalari** (draw.io va boshqalar) | Diagramma + alohida jadval |
| **Elevation of Privilege** karta o'yini | Jamoada STRIDE'ni o'yin orqali o'rganish |

## Bu dars nimani bermaydi

- **Boshqa metodologiyalarning batafsil tavsifini** — PASTA, LINDDUN (maxfiylik uchun), attack trees chuqur — ular haqida OWASP Threat Modeling sahifasida.
- **Avtomatik tahdid aniqlashni** — vositalar taklif beradi, lekin fikrlash — jamoa ishi.
- **Mukammal modelni** — har qanday model tizimning soddalashtirilgan ko'rinishi; uning maqsadi — foydali bo'lish, to'liq bo'lish emas.

:::try
**1. DFD.** Qaydnoma uchun DFD'ni OWASP Threat Dragon'da (yoki qog'ozda) chizing: tashqi obyektlar, jarayonlar, omborlar, oqimlar va ishonch chegaralari. Raqamlangan oqimlar ro'yxatini yozing.

**2. STRIDE jadvali.** Kamida 6 ta element yoki oqim uchun STRIDE bo'yicha tahdidlarni sanang. Har biri uchun: himoya, holat (✓ / qisman / ochiq), xavf darajasi (ehtimollik × ta'sir).

**3. Hujum daraxti.** "Administrator huquqini olish" maqsadi uchun hujum daraxtini chizing va har bir shoxga Qaydnoma'dagi himoyani yozing.

**4. Yangi funksiya.** Qaydnoma'ga "qaydga fayl biriktirish" funksiyasi qo'shilmoqda. Kod yozishdan oldin uning tahdid modelini tuzing: qanday yangi oqimlar va omborlar paydo bo'ladi? STRIDE bo'yicha qanday tahdidlar bor?

**5. Portfolio.** DFD, STRIDE jadvali va qarorlarni Qaydnoma omboridagi `docs/threat-model.md` fayliga joylang — bu a4 bosqichidagi portfolio loyihasining talablaridan biri.

*Yo'nalish (4): yangi ombor (fayllar — disk yoki bulut ombori) va oqimlar (yuklash, yuklab olish). Tahdidlar: S — boshqa nomdan yuklash; T — mavjud faylni almashtirish, fayl nomi orqali yo'lni buzish (`../`); R — kim yuklagani logsiz; I — begona fayllarni yuklab olish (IDOR), fayllar ichidagi metama'lumot; D — juda katta fayllar, ko'p fayl; E — yuklangan faylni server bajarishi (masalan, skript) yoki brauzerda HTML/SVG sifatida ochilishi (XSS). Himoyalar: hajm va tur cheklovi (mazmun bo'yicha), tasodifiy nom bilan saqlash, veb-ildizdan tashqarida, `Content-Disposition: attachment`, `nosniff`, ruxsat tekshiruvi.*
:::

## Xulosa

- **Threat modeling** — tizimda nima noto'g'ri ketishi mumkinligini **kod yozishdan oldin** tizimli o'ylash; eng arzon xavfsizlik vositasi.
- To'rt savol: **nima ustida ishlayapmiz → nima noto'g'ri ketishi mumkin → nima qilamiz → yaxshi qildikmi**.
- **DFD**: tashqi obyekt, jarayon, ombor, oqim, **ishonch chegarasi**; chegarani kesgan oqimlar — birinchi qidiriladigan joy.
- **STRIDE**: Spoofing, Tampering, Repudiation, Information disclosure, Denial of service, Elevation of privilege — har bir element va oqim uchun.
- **Hujum daraxti** — bitta maqsadga barcha yo'llar.
- Qarorlar: **kamaytirish, yo'q qilish, o'tkazish, ongli qabul qilish** (hujjatlashtirilgan).
- Xavf = **ehtimollik × ta'sir** — ustuvorlik uchun.
- Model — tirik hujjat: testlar, kod ko'rib chiqish, pentest bilan tekshiriladi va o'zgarishlarda yangilanadi.

:::quiz
? Threat modeling'ning asosiy afzalligi nima?
+ Muammolarni kod yozilishidan oldin, eng arzon bosqichda topish
- U barcha zaifliklarni avtomatik tuzatadi
- U faqat pentesterlar uchun
- U kodni tezlashtiradi
! Loyihalashda topilgan muammo — doskadagi chiziq; ishlab chiqarishda — insident.

? Threat modeling'ning to'rt savoli qaysi?
+ Nima ustida ishlayapmiz? Nima noto'g'ri ketishi mumkin? Nima qilamiz? Yaxshi ish qildikmi?
- Kim? Qachon? Qayerda? Nega?
- Qancha turadi? Kim to'laydi? Qachon tugaydi? Kim tekshiradi?
- Qaysi til? Qaysi freymvork? Qaysi server? Qaysi baza?
! Bu savollarni beradigan har qanday jarayon — threat modeling.

? DFD'dagi qaysi element tahdidlar qidiriladigan birinchi joylarni ko'rsatadi?
+ Ishonch chegarasi — uni kesib o'tgan oqimlar
- Faqat ma'lumot omborlari
- Faqat tashqi obyektlar
- Diagramma rangi
! Ishonch darajasi o'zgaradigan joyda tekshiruv kerak.

? STRIDE'dagi “R” (Repudiation) qaysi xususiyatning buzilishi?
- Maxfiylik
+ Hisobdorlik — kimdir qilgan ishini inkor eta oladi, chunki iz (log) yo'q
- Foydalanuvchanlik
- Yaxlitlik
! Himoya — ishonchli audit loglari.

? Mass assignment orqali foydalanuvchi o'ziga role=admin berdi. Bu STRIDE'ning qaysi toifasi?
- Spoofing
- Repudiation
+ Elevation of privilege
- Denial of service
! Ruxsat etilmagan huquqni olish.

? IDOR orqali boshqa foydalanuvchining qaydini o'qish STRIDE'ning qaysi toifasi?
+ Information disclosure
- Denial of service
- Repudiation
- Spoofing
! Ma'lumot ruxsatsiz odamga ko'rinadi — maxfiylik buziladi.

? Tahdidga nisbatan qaysi qarorlar to'g'ri variantlar?
+ Kamaytirish (himoya qo'shish) yoki yo'q qilish (funksiyani olib tashlash)
+ O'tkazish (masalan, to'lovni tashqi xizmatga berish) yoki ongli va hujjatlashtirilgan qabul qilish
- E'tibor bermaslik va hujjatlashtirmaslik
- Faqat foydalanuvchilarga ogohlantirish yozish
! Yashirin “qabul qilish” — qaror emas, bo'shliq.

? Hujum daraxti nima uchun foydali?
+ Bitta hujumchi maqsadiga erishishning barcha yo'llarini ko'rsatadi — hujumchiga bitta shox yetarli, himoyachi hammasini yopishi kerak
- U faqat chiroyli diagramma
- U kodni avtomatik yozadi
- U faqat tarmoq uchun
! Har bir shoxga himoya yoziladi.

? Threat modeling qachon o'tkazilishi kerak?
+ Yangi tizim loyihalanganda, muhim funksiya qo'shilganda, arxitektura o'zgarganda va insidentdan keyin
- Faqat bir marta, loyiha oxirida
- Faqat pentestdan keyin
- Hech qachon — kod yozish muhimroq
! Model tirik hujjat — o'zgarishlarda yangilanadi.

? Threat modeling sessiyasida kim ishtirok etishi kerak?
+ Dasturchilar, arxitektor, mahsulot egasi va AppSec muhandisi birgalikda
- Faqat AppSec muhandisi yolg'iz
- Faqat rahbariyat
- Faqat tashqi auditor
! Tizimni eng yaxshi biladigan — jamoa; AppSec muhandisi jarayonni boshqaradi.
:::

:::cards
Threat modeling nima? :: Tizimda nima noto'g'ri ketishi mumkinligini kod yozishdan oldin tizimli o'ylash.
To'rt savol? :: Nima ustida ishlayapmiz? Nima noto'g'ri ketishi mumkin? Nima qilamiz? Yaxshi ish qildikmi?
DFD elementlari? :: Tashqi obyekt, jarayon, ma'lumot ombori, ma'lumot oqimi, ishonch chegarasi.
STRIDE? :: Spoofing (autentifikatsiya), Tampering (yaxlitlik), Repudiation (hisobdorlik), Information disclosure (maxfiylik), Denial of service (foydalanuvchanlik), Elevation of privilege (avtorizatsiya).
STRIDE'ni qanday qo'llash? :: DFD'dagi har bir element va oqim uchun oltita toifani ketma-ket so'rash.
STRIDE jadvali ustunlari? :: Element, tahdid, himoya, holat (✓/qisman/ochiq), xavf darajasi, mas'ul.
Hujum daraxti? :: Ildizda hujumchi maqsadi, shoxlarda unga erishish yo'llari; har shoxga himoya.
Tahdidga qarorlar? :: Kamaytirish, yo'q qilish, o'tkazish, ongli va hujjatlashtirilgan qabul qilish.
Xavfni baholash? :: Ehtimollik × ta'sir — ustuvorlik uchun.
Qachon threat modeling? :: Yangi tizim, muhim funksiya, arxitektura o'zgarishi, insidentdan keyin.
Threat modeling vositalari? :: Oq doska, OWASP Threat Dragon, Microsoft Threat Modeling Tool, Elevation of Privilege o'yini.
Yaxshi ish qildikmi — qanday tekshiriladi? :: Testlar, kod ko'rib chiqish, pentest/DAST natijalari; yangi funksiyada modelni yangilash.
:::
