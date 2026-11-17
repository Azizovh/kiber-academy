Siz AppSec tarmog'ining oxiriga yetdingiz. a1 bosqichida "himoya qilish uchun avval qura olish kerak" degan g'oyadan boshlab, endi siz: web ilova yozasiz va uning har bir qatlamini tushunasiz; OWASP Top 10 zaifliklarini kodda topib tuzatasiz; tahdid modeli va tekshirsa bo'ladigan talablar yozasiz; kod ko'rib chiqasiz, Semgrep qoidalari yozasiz, ZAP bilan skanerlaysiz; va bularning hammasini CI/CD konveyeriga o'rnatasiz.

Endi savol — **buni ish beruvchiga qanday ko'rsatish va keyin qayerga o'sish**. Karyera bo'limida umumiy tamoyillarni (ish bozori, sertifikatlar xaritasi, rezyume, intervyu) o'rgangansiz; bu dars — AppSec'ga xos qismi.

## AppSec'da lavozimlar

| Lavozim | Nima qiladi | Qanday kiriladi |
|---|---|---|
| **AppSec muhandisi** | Kod ko'rib chiqish, tahdid modeli, vositalar, dasturchilar bilan ishlash | Ko'pincha dasturchilikdan yoki security champion'dan |
| **Product security muhandisi** | Mahsulot xavfsizligi butun hayot sikli bo'yicha — AppSec'ning kengroq shakli | AppSec tajribasidan keyin |
| **DevSecOps muhandisi** | Konveyerlar, avtomatlashtirish, konteyner va bulut xavfsizligi | DevOps yoki AppSec'dan |
| **Security champion** | Dasturchi + xavfsizlik bo'yicha mas'ul | **Dasturchi sifatida ishlab** — eng tabiiy kirish yo'li |
| **Web pentester** | Web ilovalarni ruxsat etilgan doirada sinash | AppSec + Pentest tarmog'i |
| **Secure code reviewer** | Kod auditi (ko'pincha konsalting) | Kuchli kod ko'rib chiqish tajribasi bilan |

Karyera bo'limidagi ish bozori darsidagi muhim kuzatuv bu yerda ayniqsa to'g'ri: **AppSec'ga ko'pincha dasturchilikdan o'tiladi.** Agar siz hozir dasturchi bo'lsangiz yoki bo'la olsangiz — bu yo'l ko'pincha to'g'ridan-to'g'ri "Junior AppSec" vakansiyasidan osonroq: dasturchi sifatida ishlab, jamoangizning security champion'iga aylanasiz, keyin AppSec jamoasiga o'tasiz.

## Sertifikatlar

Karyera bo'limidagi sertifikatlar xaritasidan AppSec qismi — batafsilroq:

| Sertifikat | Kim beradi | Turi | Kimga | Izoh |
|---|---|---|---|---|
| **CompTIA Security+** | CompTIA | Bilim | Boshlang'ich — barcha yo'nalishlar | Umumiy asos; rezyume filtrlari uchun foydali |
| **BSCP** (Burp Suite Certified Practitioner) | PortSwigger | **Amaliy** | Web xavfsizligi bo'yicha amaliy ko'nikmani isbotlash | PortSwigger Web Security Academy'ning bepul materiallari asosida; cheklangan vaqtda ataylab zaif ilovalarda zaifliklarni topish |
| **CSSLP** | ISC2 | Bilim | Xavfsiz dasturiy ta'minot hayot sikli bo'yicha mutaxassislar | Bir necha yillik tasdiqlangan tajriba talab qiladi — keyingi bosqich |
| **GWEB** / **GWAPT** | GIAC (SANS) | Bilim (ochiq kitob) | Web himoyasi / web pentest | Hurmatli, lekin qimmat — ko'pincha ish beruvchi to'laydi |
| **OSWE** | OffSec | **Amaliy** (white-box) | Kod tahlili orqali web zaifliklarni topish — yuqori daraja | Ilg'or; AppSec'dagi kod ko'rib chiqish ko'nikmasi bilan bevosita bog'liq |
| **CKS** (Certified Kubernetes Security Specialist) | CNCF / Linux Foundation | Amaliy | DevSecOps, konteyner xavfsizligi | Avval CKA talab qilinadi; Cloud tarmog'i bilan bog'liq |
| Bulut xavfsizlik sertifikatlari (AWS, Azure) | Bulut provayderlari | Bilim | DevSecOps va bulut | Cloud tarmog'i |

### Tavsiya etilgan yo'l

```
 Hozir:   Security+ (agar hech qanday sertifikat yo'q bo'lsa)
             │
             ├──► BSCP — web zaifliklar bo'yicha amaliy isbot
             │      (PortSwigger Academy'ning barcha laboratoriyalari — bepul tayyorgarlik)
             │
 Ishga kirgandan keyin (ko'pincha ish beruvchi hisobidan):
             ├──► CSSLP — tajriba to'plangach (SSDLC, jarayonlar)
             ├──► OSWE — chuqur kod tahlili
             └──► CKS / bulut xavfsizligi — DevSecOps yo'nalishida
```

**Muhim:** AppSec'da sertifikatdan ham muhimroq — **kod va portfolio**. Ko'p AppSec muhandislari sertifikatsiz, lekin kuchli dasturchilik va GitHub'dagi ishlar bilan ishga kiradi (karyera bo'limidagi sertifikatlar xaritasi darsi). Qaydnoma portfoliosi (o'tgan dars) + PortSwigger Academy'dagi laboratoriyalar soni — boshlang'ich uchun kuchli kombinatsiya.

:::info
**Narxlar, imtihon formatlari va talablar o'zgaradi.** Masalan, ba'zi amaliy imtihonlar ma'lum tijoriy vosita litsenziyasini talab qilishi, tajriba talablari esa ta'lim darajasiga qarab farq qilishi mumkin. Tayyorlanishni boshlashdan oldin har bir sertifikatning **rasmiy sahifasida** joriy formatni, talablarni va narxni tekshiring (SOC tarmog'idagi sertifikat darsidagi qoida).
:::

### BSCP'ga tayyorgarlik

BSCP — AppSec yo'nalishi uchun boshlang'ich amaliy sertifikatlar orasida eng mos keladiganlaridan biri, chunki:
- Tayyorgarlik materiallari — **PortSwigger Web Security Academy** — bepul va juda sifatli; siz bu tarmoq davomida ulardan foydalandingiz.
- U a2 bosqichidagi zaiflik sinflarini **amalda** tekshiradi.
- Tayyorgarlik paytida o'rganganlaringiz to'g'ridan-to'g'ri AppSec ishida kerak: zaiflikni qanday topish — uni qanday tuzatish va qanday aniqlashni tushunishning asosi.

Tayyorgarlik rejasi (SOC tarmog'idagi sertifikat darsi tuzilishida):

| Qadam | Nima |
|---|---|
| 1 | Academy'dagi har bir mavzu bo'yicha nazariya + Apprentice va Practitioner darajadagi laboratoriyalar |
| 2 | Har bir laboratoriyadan keyin: "bu zaiflikni kodda qanday tuzatardim?" — a2 bosqichidagi darsga bog'lab yozing |
| 3 | Academy'dagi rasmiy amaliy sinov imtihonlari (mock exam) |
| 4 | Barqaror natija — keyin imtihon |

2-qadam AppSec uchun ayniqsa muhim: pentester uchun laboratoriya "bayroq topildi" bilan tugaydi; AppSec muhandisi uchun — "va mana tuzatish, test va Semgrep qoidasi" bilan.

## AppSec intervyulari

Karyera bo'limidagi intervyu darsidagi umumiy tuzilma (HR → texnik → amaliy → yakuniy) AppSec'da o'ziga xos texnik qismlarga ega:

| Intervyu turi | Nima so'raladi | Qanday tayyorlanish |
|---|---|---|
| **Zaiflik va tuzatish** | "XSS'ni tushuntiring va kodda qanday tuzatasiz?", "IDOR'ni qanday oldini olasiz?" | a2 bosqichi; har bir zaiflik uchun: mexanizm → oqibat → tuzatish → test |
| **Kod ko'rib chiqish mashqi** | Kod parchasi beriladi: "Bu yerda qanday muammolar bor?" | a3 bosqichidagi kod ko'rib chiqish; manbadan sink'gacha; issiq nuqtalar ro'yxati |
| **Dizayn / tahdid modeli** | "Fayl yuklash funksiyasini loyihalang — xavfsizlik nuqtai nazaridan" | a3 bosqichidagi threat modeling; STRIDE bo'yicha ovoz chiqarib o'ylash |
| **Jarayon va vositalar** | "SAST'ni jamoaga qanday joriy etasiz?", "Dasturchilar topilmalarni e'tiborsiz qoldirsa nima qilasiz?" | a3–a4 bosqichlari; alert fatigue, paved road, security champions |
| **Uyga topshiriq** | Kichik omborni ko'rib chiqib, hisobot yozish | a2 bosqichidagi tuzatish hisobotlari formati |

Intervyu bazasidagi (ilovadagi **Intervyu** bo'limi) AppSec savollari bilan muntazam mashq qiling — va har bir javobni **Qaydnoma'dan aniq misol** bilan bog'lang: "Mening loyihamda bu shunday hal qilingan..." — bu nazariy javobdan ancha kuchliroq.

Kod ko'rib chiqish mashqiga tayyorlanishning eng yaxshi usuli: ataylab zaif kod parchalari (masalan, DVWA'ning turli darajalari, OWASP'ning kod ko'rib chiqish mashqlari, yoki o'zingizning `vulnerable` branch'ingiz) ustida **vaqt bilan** mashq qilish — 15–20 daqiqada qancha topa olasiz?

## Keyingi qadamlar

AppSec tarmog'i tugadi — lekin bu soha juda keng. Keyingi yo'nalishlar:

| Yo'nalish | Nega | Kursdagi joyi |
|---|---|---|
| **Cloud xavfsizligi** | Zamonaviy ilovalar bulutda; DevSecOps va IaC bilan bevosita davom | Cloud tarmog'i |
| **Web pentest** | Zaifliklarni topish ko'nikmasini chuqurlashtirish — hujum nuqtai nazari himoyani yaxshilaydi | Pentest tarmog'i |
| **SOC bilan bog'liqlik** | Ilovalardan qanday loglar kerak, ilova hujumlari qanday aniqlanadi | SOC tarmog'i (b1–b2) |
| **Ixtisoslik** | Mobil xavfsizlik, API xavfsizligi, kriptografiya, ta'minot zanjiri, detection engineering for apps | Mustaqil o'qish |

Eng yaxshi mutaxassislar bir nechta yo'nalishni biladi: hujumni tushunadigan himoyachi, himoyani tushunadigan pentester, va infratuzilmani tushunadigan AppSec muhandisi (karyera bo'limidagi birinchi 90 kun darsi).

### 12 oylik reja namunasi

```
1–3 OY     Portfolio (Qaydnoma) to'liq; PortSwigger Academy — barcha Apprentice laboratoriyalari;
           ochiq kodga birinchi hissa (qoida yoki CI tekshiruvi); rezyume va LinkedIn

4–6 OY     Academy — Practitioner laboratoriyalari, har biri uchun "tuzatish + test" yozuvi;
           BSCP (yoki Security+, vakansiya tahlilingizga qarab); faol ish qidirish

7–9 OY     Ishga kirish (AppSec, dasturchi + security champion, yoki DevSecOps);
           birinchi 90 kun rejasi

10–12 OY   Ish joyida: birinchi tahdid modeli, birinchi joriy etilgan qoida yoki vosita;
           keyingi yo'nalish tanlash (Cloud yoki Pentest tarmog'i); keyingi yil rejasi
```

:::key
**AppSec — dasturchilar va xavfsizlik o'rtasidagi ko'prik.** Bu sohada eng qadrlanadigan ko'nikma — zaiflikni topish emas, balki uni **tuzatish va qayta takrorlanmasligini ta'minlash**: dasturchiga tushunarli tuzatish, uni isbotlaydigan test, xatoni avtomatik ushlaydigan qoida va jarayon. Sertifikatlar (Security+, keyin BSCP) eshikni ochadi; Qaydnoma kabi to'liq portfolio va ochiq kodga haqiqiy hissa esa — siz shu ko'prikni qura olishingizni isbotlaydi.
:::

## Bu dars nimani bermaydi

- **Sertifikatlarning joriy narxlari va formatlarini** — rasmiy sahifalarda.
- **Karyera bo'limini takrorlash** — rezyume, LinkedIn, ish qidirish va intervyu o'sha yerda batafsil.
- **Kafolatni** — bozor, omad va vaqt ham rol o'ynaydi; lekin portfolio va muntazam o'rganish imkoniyatni ancha oshiradi.

:::try
**1. Vakansiya tahlili.** AppSec, Product Security va DevSecOps lavozimlari bo'yicha 10–15 ta vakansiyani karyera bo'limidagi jadval bo'yicha tahlil qiling: qaysi ko'nikmalar, vositalar (Semgrep, CodeQL, ZAP, Burp, Snyk…) va sertifikatlar eng ko'p tilga olinadi?

**2. Sertifikat rejasi.** Tahlilingiz asosida 1–2 ta sertifikat rejasini yozing (karyera bo'limidagi shablon bo'yicha) — va uni portfolio ishlari bilan parallel qiling.

**3. Academy progressi.** PortSwigger Web Security Academy'da hozirgacha nechta laboratoriya yechganingizni ko'ring. Keyingi 3 oy uchun haftalik maqsad belgilang (masalan, haftasiga 5 ta), har biriga "tuzatish va test" yozuvi bilan.

**4. Kod ko'rib chiqish mashqi.** Hamkoringiz bilan bir-biringizga 20 qatorlik zaif kod parchalarini bering (har birida 2–3 ta zaiflik). 15 daqiqada toping va tuzatishni yozing — intervyudagidek.

**5. Dizayn intervyusi.** "Qaydnoma'ga qaydlarni ommaviy havola orqali ulashish funksiyasini qo'shing" topshirig'ini ovoz chiqarib, 20 daqiqada loyihalang: tahdidlar (STRIDE), himoyalar, talablar va testlar.

*Yo'nalish (5): havola tokeni — `secrets.token_urlsafe` bilan uzun va tasodifiy (taxmin qilib bo'lmaydigan); muddatli va bekor qilinadigan; faqat o'qish huquqi; token bazada xeshlangan; `Referrer-Policy` bilan token boshqa saytlarga sizmaydi; havola orqali ochilgan sahifada tahrirlash funksiyalari yo'q; kirishlar loglanadi; rate limiting (tokenlarni sanab chiqishga qarshi); egasi barcha faol havolalarni ko'radi va bekor qila oladi.*
:::

## Xulosa

- AppSec lavozimlari: **AppSec muhandisi, product security, DevSecOps, security champion, web pentester, secure code reviewer**; ko'pincha **dasturchilikdan** o'tiladi — security champion — eng tabiiy yo'l.
- Sertifikatlar: **Security+** (asos) → **BSCP** (amaliy web) → ishdan keyin **CSSLP** (tajriba bilan), **OSWE**, **CKS**/bulut; narx va formatlarni rasmiy sahifadan tekshiring.
- AppSec'da **kod va portfolio** sertifikatdan muhimroq.
- BSCP tayyorgarligi — **PortSwigger Academy** (bepul); har laboratoriyadan keyin "tuzatish + test".
- AppSec intervyulari: **zaiflik va tuzatish, kod ko'rib chiqish mashqi, dizayn/tahdid modeli, jarayon va vositalar, uyga topshiriq** — har javobni Qaydnoma misoli bilan.
- Keyingi qadamlar: **Cloud**, **Pentest**, SOC bilan bog'liqlik, ixtisoslik; 12 oylik reja.
- AppSec — **dasturchilar va xavfsizlik o'rtasidagi ko'prik**: tuzatish, test, qoida, jarayon.

:::quiz
? AppSec'ga kirishning eng tabiiy yo'llaridan biri qaysi?
+ Dasturchi sifatida ishlab, jamoaning security champion'iga aylanish va keyin AppSec jamoasiga o'tish
- Faqat sertifikat olib, tajribasiz kirish
- Faqat SOC'da ishlash
- Faqat tarmoq muhandisi bo'lish
! AppSec dasturchilar bilan ishlaydi — ularning tilini bilish katta afzallik.

? BSCP nima uchun AppSec yo'nalishi uchun mos boshlang'ich amaliy sertifikat?
+ U web zaifliklarni amalda tekshiradi va bepul PortSwigger Web Security Academy materiallari asosida tayyorlanadi
- U eng arzon va hech qanday tayyorgarlik talab qilmaydi
- U faqat tarmoq xavfsizligi haqida
- U faqat nazariy savollardan iborat
! Tayyorgarlikdagi ko'nikmalar to'g'ridan-to'g'ri AppSec ishida kerak.

? CSSLP haqida qaysi gap to'g'ri?
+ U xavfsiz dasturiy ta'minot hayot sikli bo'yicha sertifikat bo'lib, bir necha yillik tasdiqlangan tajriba talab qiladi
- U boshlang'ichlar uchun birinchi sertifikat
- U faqat mobil xavfsizlik haqida
- U amaliy pentest imtihoni
! Odatda ishga kirgandan keyin, tajriba to'plangach olinadi.

? AppSec'da ishga kirish uchun sertifikatdan ham muhimroq nima?
+ Kod yozish ko'nikmasi va portfolio (masalan, to'liq xavfsizlashtirilgan loyiha)
- Ijtimoiy tarmoqdagi obunachilar
- Faqat diplom
- Kompyuter quvvati
! Ko'p AppSec muhandislari sertifikatsiz, kuchli portfolio bilan ishga kiradi.

? PortSwigger laboratoriyasini yechgandan keyin AppSec muhandisi uchun eng foydali qo'shimcha qadam qaysi?
+ Shu zaiflikni kodda qanday tuzatish, qanday test yozish va qanday qoida bilan ushlashni yozib qo'yish
- Darhol keyingisiga o'tish
- Bayroqni ijtimoiy tarmoqda e'lon qilish
- Laboratoriyani o'chirish
! Pentester “topdim” bilan tugaydi; AppSec — “tuzatdim va qaytmasligini ta'minladim” bilan.

? AppSec intervyularidagi kod ko'rib chiqish mashqiga qanday tayyorlanish kerak?
+ Ataylab zaif kod parchalari ustida vaqt bilan mashq qilish — manbadan sink'gacha va issiq nuqtalar ro'yxati bilan
- Faqat nazariya o'qish
- Faqat sertifikat olish
- Tayyorlanish shart emas
! 15–20 daqiqada qancha topa olishingizni o'lchang.

? Dizayn intervyusida “fayl yuklash funksiyasini xavfsiz loyihalang” degan topshiriqqa qanday yondashish kerak?
+ Tahdidlarni STRIDE bo'yicha ovoz chiqarib o'ylab, har biriga himoya, talab va test taklif qilish
- Darhol kod yozishni boshlash
- “Bu xavfsiz bo'ladi” deb javob berish
- Faqat bitta xavfni aytish
! a3 bosqichidagi threat modeling — intervyuda ham asosiy vosita.

? Intervyu javobini kuchliroq qilishning eng yaxshi usuli qaysi?
+ Har bir nazariy javobni o'z loyihangizdan aniq misol bilan bog'lash
- Iloji boricha uzun gapirish
- Faqat ta'riflarni yodlab aytish
- Savolga javob bermaslik
! “Mening loyihamda bu shunday hal qilingan...” — eng kuchli dalil.

? AppSec'dan keyin tabiiy davom etadigan yo'nalishlar qaysilar?
+ Cloud xavfsizligi (DevSecOps va IaC bilan bevosita bog'liq)
+ Web pentest (hujum nuqtai nazari himoyani yaxshilaydi)
- Faqat grafik dizayn
- Faqat ofis dasturlari
! Eng yaxshi mutaxassislar bir nechta yo'nalishni biladi.

? AppSec'ning asosiy qiymati qaysi jumlada eng yaxshi ifodalangan?
+ Zaiflikni topish bilan to'xtamasdan, uni tuzatish va qayta takrorlanmasligini ta'minlash — test, qoida va jarayon bilan
- Iloji boricha ko'p zaiflik topish
- Dasturchilarni bloklash
- Faqat hisobot yozish
! AppSec — dasturchilar va xavfsizlik o'rtasidagi ko'prik.
:::

:::cards
AppSec lavozimlari? :: AppSec muhandisi, product security, DevSecOps, security champion, web pentester, secure code reviewer.
AppSec'ga tabiiy kirish yo'li? :: Dasturchi → jamoaning security champion'i → AppSec jamoasi.
AppSec sertifikat yo'li? :: Security+ → BSCP (amaliy web) → ishdan keyin CSSLP, OSWE, CKS/bulut.
BSCP? :: PortSwigger'ning amaliy web xavfsizlik sertifikati; tayyorgarlik — bepul Web Security Academy.
CSSLP? :: ISC2'ning xavfsiz SDLC sertifikati — bir necha yillik tasdiqlangan tajriba talab qiladi.
OSWE? :: OffSec'ning white-box (kod tahlili orqali) web sertifikati — ilg'or daraja.
AppSec'da sertifikat va portfolio? :: Kod va portfolio ko'pincha muhimroq; sertifikat eshikni ochadi.
Academy laboratoriyasidan keyin? :: Tuzatish, test va qoida yozuvi — AppSec nuqtai nazari.
AppSec intervyu turlari? :: Zaiflik va tuzatish, kod ko'rib chiqish mashqi, dizayn/tahdid modeli, jarayon va vositalar, uyga topshiriq.
Kuchli intervyu javobi? :: Nazariya + o'z loyihangizdan aniq misol.
AppSec'dan keyingi yo'nalishlar? :: Cloud xavfsizligi, web pentest, SOC bilan bog'liqlik, ixtisosliklar (mobil, API, ta'minot zanjiri).
AppSec'ning mohiyati? :: Dasturchilar va xavfsizlik o'rtasidagi ko'prik — topish emas, tuzatish va takrorlanmaslik.
:::
