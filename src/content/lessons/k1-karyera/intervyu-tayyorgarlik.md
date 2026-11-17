Intervyuchi so'raydi: "Bir IP manzildan 5 daqiqada 500 ta muvaffaqiyatsiz kirish ogohlantirishi keldi. Nima qilasiz?"

Siz bu savolga javobni bilasiz — b1 bosqichida alert triage, Windows loglari va Linux loglari darslarida aynan shuni o'rgangansiz. Lekin intervyuda, hayajon ichida, javob "Ee... IP'ni bloklayman" bo'lib chiqishi mumkin. Bilim bor — uni **tartibli, ishonchli va tushunarli** aytish ko'nikmasi yo'q.

Intervyu — bilim imtihoni emas. U — **suhbat**: siz qanday fikrlaysiz, qanday muloqot qilasiz va jamoaga mos kelasizmi. Va bu ko'nikmani boshqa har qanday ko'nikma kabi mashq qilish mumkin.

## Intervyu bosqichlari

Ko'p kompaniyalarda jarayon bir necha bosqichdan iborat:

| Bosqich | Kim bilan | Nima tekshiriladi | Davomiyligi |
|---|---|---|---|
| **1. HR suhbati** (screening) | HR yoki rekruter | Asosiy moslik, motivatsiya, til, kutilmalar | 15–30 daqiqa |
| **2. Texnik intervyu** | Jamoa a'zosi yoki rahbari | Asosiy bilimlar, fikrlash | 45–90 daqiqa |
| **3. Amaliy topshiriq** | Jamoa | Real ishga o'xshash vazifa | Bir necha soatdan bir necha kungacha |
| **4. Yakuniy suhbat** | Rahbar, ba'zan jamoa | Madaniyat, xulq-atvor, jamoaga moslik | 30–60 daqiqa |

Har bir kompaniyada tartib boshqacha — ba'zan bosqichlar birlashtiriladi. HR'dan oldindan so'rash mumkin va normal: "Jarayon qanday bosqichlardan iborat?"

## 1. O'zingiz haqingizda — 2 daqiqalik hikoya

Deyarli har bir intervyu shu savol bilan boshlanadi: **"O'zingiz haqingizda gapirib bering."** Bu — birinchi taassurot, va unga tayyor bo'lmaslik — eng keng tarqalgan xato.

Tuzilish: **o'tmish → hozir → kelajak**

```
O'TMISH (20 soniya):
  Qayerdan keldingiz — ta'lim yoki oldingi ish, va kiberxavfsizlikka qanday keldingiz.

HOZIR (60 soniya) — eng muhim qism:
  Nimani o'rgandingiz va QILDINGIZ — aniq misollar va raqamlar bilan.
  "Uy SOC laboratoriyasini qurdim: Wazuh, Sysmon, Suricata. 9 ta aniqlash
   qoidasini yozib, har birini Atomic Red Team bilan sinadim. Eng qiziq topilma —
   Sysmon konfiguratsiyasidagi istisno Run kalitlarini ko'rinmas qilib qo'ygan ekan."

KELAJAK (30 soniya):
  Nega aynan shu lavozim va shu kompaniya.
  "SOC jamoasida real hodisalar bilan ishlab, keyinchalik detection engineering
   yo'nalishida o'smoqchiman. Sizning kompaniyangizda ... ekanini o'qidim."
```

Yozing, ovoz chiqarib mashq qiling, vaqtni o'lchang. Yod olmang — **tuzilishni** biling, so'zlar har safar biroz farq qilsin. Ilovadagi **Intervyu** bo'limida ham bu savol bor.

## 2. Texnik savollar

### Savol turlari

| Tur | Misol | Nima tekshiriladi |
|---|---|---|
| **Asosiy tushunchalar** | "TCP va UDP farqi?", "Shifrlash va xeshlash farqi?" | Poydevor (s0–s5 bosqichlari) |
| **Yo'nalish bilimi** | "4624 va 4625 nima?", "Sysmon Event ID 1?" | Mutaxassislik (b1–b4) |
| **Stsenariy** | "500 ta muvaffaqiyatsiz kirish — nima qilasiz?" | **Fikrlash jarayoni** |
| **Tushuntirish** | "Brauzerga sayt nomini yozganda nima bo'ladi?" | Chuqurlik va muloqot |
| **"Qanday bilib olasiz?"** | "Yangi zaiflikdan qanday xabardor bo'lasiz?" | O'rganish odatlari |

### Stsenariy savollariga javob berish

Stsenariy savollari — eng muhimi. Ularda **to'g'ri javob**dan ko'ra **tartibli fikrlash** muhim. Formula — b1 bosqichidagi triage tartibi:

```
1. Aniqlashtiruvchi savol bering  → "IP ichkimi yoki tashqimi? Qaysi xizmat — RDP, SSH, VPN?"
2. Ma'lumot yig'ing               → "Qaysi hisoblar? IP obro'si? Odatiymi?"
3. Eng muhim savolni ayting        → "Eng muhimi — shu IP'dan keyin MUVAFFAQIYATLI kirish bo'lganmi?"
4. Ikki yo'lni ko'rsating          → "Agar bo'lgan bo'lsa — insident: ... Agar bo'lmagan bo'lsa — ..."
5. Hujjatlashtirish va eskalatsiya → "Tiketga yozaman: nima ko'rildi, nima qilindi, xulosa."
6. (Bonus) Oldini olish            → "Uzoq muddatda: MFA, lockout siyosati, RDP'ni internetdan yopish."
```

Aniqlashtiruvchi savol berish — zaiflik emas, **professionallik** belgisi. Haqiqiy SOC'da ham kontekstsiz qaror qabul qilinmaydi (triage darsidagi asosiy tamoyil).

### Bilmagan savolga duch kelganda

Albatta bo'ladi. Uchta qadam:

1. **Halol tan oling**: "Buni aniq bilmayman."
2. **Fikrlashni ko'rsating**: "Lekin bilganlarim asosida taxmin qilsam: ..."
3. **Qanday topishingizni ayting**: "Haqiqiy vaziyatda men ... hujjatlarini ko'rardim yoki laboratoriyada sinab ko'rardim."

Yolg'on javob — eng yomon variant. Tajribali intervyuchi uni darhol sezadi, va xavfsizlikda "bilmaydi, lekin biladi deb o'ylaydi" — juda xavfli sifat.

:::tip
**Ilovadagi Intervyu bo'limidan foydalaning.** Unda umumiy, Pentest, SOC, AppSec va Cloud yo'nalishlari bo'yicha savollar va namunaviy javoblar bor. Ulardan to'g'ri foydalanish: avval savolni o'qing, **o'zingiz ovoz chiqarib** javob bering (yoki yozing), keyingina namunaviy javobni oching va solishtiring. Javoblarni yodlash emas — tuzilishni va asosiy fikrlarni o'zlashtirish. Har kuni 5–10 ta savol — 2–3 haftada sezilarli farq.
:::

## 3. Amaliy topshiriqlar

Ko'p xavfsizlik kompaniyalari real ishga o'xshash topshiriq beradi:

| Yo'nalish | Odatiy topshiriq |
|---|---|
| **SOC** | Log fayli yoki PCAP tahlili; phishing xati tahlili; SIEM'da so'rov yozish; ogohlantirishni triage qilib tiket yozish |
| **Pentest** | Laboratoriya muhitida topshiriq va hisobot |
| **AppSec** | Kod namunasidagi zaifliklarni topish va tuzatish taklifi |
| **Cloud** | Bulut sozlamalari yoki IaC faylini tekshirish |

Bu kursning har bir darsidagi `:::try` bo'limlari va laboratoriyalaringiz aynan shunga tayyorlagan.

Amaliy topshiriq bo'yicha maslahatlar:

- **Hisobot — natijaning yarmi.** b3 bosqichidagi IR hisoboti darsi tuzilishi: qisqacha xulosa, topilmalar dalillar bilan, ishonch darajasi, tavsiyalar. Ko'p nomzodlar to'g'ri topadi, lekin yomon yozadi.
- **Fikrlashni yozing** — faqat javobni emas: qanday qidirdingiz, nima ishlamadi.
- **Chegaralarni halol ko'rsating** — "buni tekshirishga ulgurmadim" — "Tekshirilmadi" bo'limi (b1 bosqichidagi tiket).
- **Vaqtni hurmat qiling** — belgilangan muddatda topshiring.
- **Xavfsizlik** — ish qidirish darsidagi ogohlantirish: notanish fayllar va kodni faqat izolyatsiyalangan muhitda oching.

Agar uyda bajariladigan topshiriq juda katta bo'lsa (masalan, bir necha kunlik bepul ish) — bu haqda muloyim so'rash normal.

## 4. Xulq-atvor savollari

"Qiyin vaziyat haqida gapirib bering", "Jamoadagi kelishmovchilik", "Xato qilgan vaqtingiz", "Bosim ostida ishlash" — bu savollar sizning qanday ishlashingizni tushunish uchun.

Javob tuzilishi — [[star-method|STAR usuli]]:

| Harf | Nima | Ulushi |
|---|---|---|
| **S** — Situation | Vaziyat, qisqa kontekst | 15% |
| **T** — Task | Sizning vazifangiz yoki muammo | 15% |
| **A** — Action | **Siz** aniq nima qildingiz ("biz" emas, "men") | 50% |
| **R** — Result | Natija — va **nima o'rgandingiz** | 20% |

Misol — "Qiyin texnik muammoni qanday hal qilgansiz?":

```
S: Uy laboratoriyamda Run kaliti orqali persistence uchun qoida yozdim.
T: Atomic Red Team sinovi qoida ishlamasligini ko'rsatdi — sababini topish kerak edi.
A: Avval qoida sintaksisini tekshirdim — to'g'ri. Keyin SIEM'da xom hodisalarni
   qidirdim — Sysmon Event ID 13 umuman yo'q ekan. Sysmon konfiguratsiyasini
   ko'rib, HKCU\...\Run kalitlari exclude qilinganini topdim. Istisnoni
   toraytirdim va sinovni qayta o'tkazdim.
R: Qoida 38 soniyada ishladi. Saboq: qoidani yozish yetarli emas, uni sinash
   kerak — endi har bir qoidamni simulyatsiya bilan tekshiraman.
```

Tajribangiz kam bo'lsa — laboratoriya, o'qish, oldingi ish (IT bo'lmagan ham), jamoaviy loyihalar, CTF misollaridan foydalaning. Oldindan 5–6 ta hikoya tayyorlang: qiyin muammo, xato, jamoa, bosim, o'rganish, tashabbus — ular turli savollarga moslashadi.

## 5. Sizning savollaringiz

Intervyu oxirida deyarli har doim: **"Sizda savollar bormi?"** "Yo'q" — yomon javob: qiziqish yo'qdek ko'rinadi. 2–3 ta savol tayyorlang:

| Yaxshi savollar | Nimani bilib olasiz |
|---|---|
| "Bu lavozimda odatiy kun qanday o'tadi?" | Haqiqiy ish |
| "Jamoada yangi xodim qanday o'rgatiladi? Mentor bormi?" | O'rganish imkoniyati |
| "Qaysi vositalar va SIEM ishlatiladi?" | Texnik muhit |
| "Smenalar qanday tashkil etilgan?" | Ish rejimi (SOC uchun muhim) |
| "Bu lavozimda birinchi 3–6 oyda muvaffaqiyat qanday ko'rinadi?" | Kutilmalar |
| "Jamoa hozir qanday muammolar ustida ishlayapti?" | Kontekst va qiziqish |
| "Sertifikatlar va o'qish uchun qo'llab-quvvatlash bormi?" | O'sish |

Intervyu — **ikki tomonlama**: siz ham kompaniyani baholaysiz.

## 6. Maosh haqida savol

"Qancha maosh kutasiz?" — oldindan tayyor bo'ling:

- **Bozorni o'rganing** — ish bozori darsidagi tahlil: shu lavozim va mintaqa uchun oraliq.
- **Oraliq ayting**, aniq bitta raqam emas — va u siz uchun maqbul bo'lsin.
- Boshlang'ich darajada maoshdan tashqari narsalarni ham ko'ring: o'qish, sertifikatlar, mentor, o'sish imkoniyati (ish bozori darsi).
- Agar erta bosqichda so'ralsa va hali bilmasangiz: "Lavozim va mas'uliyatlar haqida ko'proq bilib olgach aniqroq aytaman; bozor oralig'i ... atrofida deb tushunaman" — normal javob.

## Onlayn intervyu

| Narsa | Maslahat |
|---|---|
| Texnika | Kamera, mikrofon, internet — **oldindan sinang**; zaxira (telefon internet) |
| Joy | Tinch, yorug', oddiy fon |
| Ekran ulashish | Faqat kerakli oyna; shaxsiy bildirishnomalarni o'chiring; laboratoriyangizni ko'rsatishga tayyor bo'ling (portfolio darsi) |
| Qayd | Qog'oz va qalam — savollarni yozish uchun |
| Vaqt | 5 daqiqa oldin tayyor bo'ling |

## Intervyudan keyin

- **Qisqa minnatdorchilik xati** — 24 soat ichida: rahmat, suhbatdagi bitta aniq mavzu, qiziqishingiz.
- **O'zingiz uchun qaydlar** — qanday savollar berildi, qaysilariga yaxshi javob berdingiz, qaysilariga yo'q. Bu keyingi intervyu uchun eng qimmatli tayyorgarlik.
- **Kuzatuv jadvalini yangilang** (ish qidirish darsi).

:::key
**Intervyuda ish beruvchi uchta savolga javob qidiradi: "U qila oladimi? U o'rgana oladimi? U bilan ishlash yoqimli bo'ladimi?"** Birinchisiga — texnik javoblar va portfolio. Ikkinchisiga — bilmagan savolga munosabatingiz, "hozir nima o'rganyapsiz", qiziqishingiz. Uchinchisiga — muloqot, halollik, xulq-atvor hikoyalari. Boshlang'ich darajada ikkinchi va uchinchi savollar ko'pincha birinchisidan ham muhimroq: bilimni o'rgatish mumkin, munosabatni — qiyin.
:::

## Sinov intervyusi

Curriculum'dagi maqsad: **kamida bitta sinov intervyusidan o'tish.** Bu — eng samarali tayyorgarlik.

- **Kim bilan**: sohada ishlayotgan tanish, hamjamiyatdagi odam (LinkedIn va hamjamiyat darsi), o'quv hamkori. Ba'zi hamjamiyatlar va platformalar sinov intervyulari tashkil qiladi.
- **Qanday**: haqiqiydek — vaqt bilan, kamera bilan, 3–4 ta texnik savol + 1 ta stsenariy + 1 ta xulq-atvor savoli.
- **Oxirida**: fikr so'rang — nima yaxshi, nima tushunarsiz, qayerda ishonchsiz ko'rindingiz.
- **Yozib oling** (rozilik bilan) va keyin o'zingizni tomosha qiling — noqulay, lekin juda foydali.

## Intervyu tayyorgarligi nimani qilmaydi

- **Bilimning o'rnini bosmaydi** — tayyorgarlik bilimni ko'rsatishga yordam beradi, uni yaratmaydi.
- **Har bir savolni oldindan bilishni** — lekin tuzilish (triage tartibi, STAR) har qanday savolga moslashadi.
- **Har doim taklif bilan tugamaydi** — har bir intervyu esa keyingisi uchun mashq.

:::try
**1. 2 daqiqalik hikoya.** "O'tmish → hozir → kelajak" tuzilishida o'zingiz haqingizdagi hikoyani yozing, keyin ovoz chiqarib aytib, vaqtni o'lchang. 3 marta takrorlang.

**2. Intervyu bazasi.** Ilovadagi Intervyu bo'limidan o'z yo'nalishingiz va "Umumiy" bo'yicha barcha savollarga avval o'zingiz javob bering, keyin namunaviy javob bilan solishtiring. Qiyin bo'lganlarini belgilab, tegishli darsni qayta o'qing.

**3. Stsenariy.** Quyidagi stsenariyga 6 qadamli formula bo'yicha javob yozing: *"EDR'dan ogohlantirish: buxgalteriya xodimining kompyuterida WINWORD.EXE powershell.exe'ni kodlangan buyruq bilan ishga tushirdi."*

**4. STAR hikoyalari.** 5 ta STAR hikoyasi tayyorlang: qiyin muammo, xato, jamoaviy ish, bosim ostida ishlash, o'zingiz o'rgangan yangi narsa.

**5. Sinov intervyusi.** Kamida bitta odam bilan 30–45 daqiqalik sinov intervyusini o'tkazing va fikr oling.

*Yo'nalish (3): aniqlashtirish (qurilma, foydalanuvchi, vaqt) → kontekst (xat kelganmi, hujjat qayerdan, kodlangan buyruq nima qiladi — 4104) → eng muhim savol (tarmoqqa chiqdimi, fayl yaratdimi, persistence bormi — Sysmon 3/11/13) → qaror: haqiqiy bo'lsa — qurilmani ajratish, eskalatsiya, IOC'larni butun muhitda qidirish; xat boshqalarga ham kelganmi → tiket → oldini olish: internetdan kelgan hujjatlarda makroslarni bloklash.*
:::

## Xulosa

- Intervyu — **suhbat**: qila oladimi, o'rgana oladimi, u bilan ishlash yoqimlimi.
- Bosqichlar: **HR → texnik → amaliy topshiriq → yakuniy**.
- **2 daqiqalik hikoya**: o'tmish → **hozir (aniq misollar va raqamlar)** → kelajak; tuzilishni biling, yodlamang.
- Stsenariy savollari: **aniqlashtirish → ma'lumot → eng muhim savol → ikki yo'l → hujjatlashtirish → oldini olish**.
- Bilmagan savol: **halol tan olish → fikrlash → qanday topardim**; yolg'on — hech qachon.
- Amaliy topshiriq: hisobot — natijaning yarmi; fikrlash va chegaralarni yozing; notanish fayllar — izolyatsiyada.
- Xulq-atvor: **STAR** (Action — 50%), oldindan 5–6 ta hikoya.
- O'z savollaringizni tayyorlang; maosh uchun bozor oralig'ini biling.
- Keyin: minnatdorchilik xati, o'zingiz uchun qaydlar; **sinov intervyulari** — eng yaxshi tayyorgarlik.

:::quiz
? “O'zingiz haqingizda gapirib bering” savoliga eng yaxshi tuzilish qaysi?
+ O'tmish → hozir (aniq misollar va raqamlar bilan) → kelajak (nega shu lavozim)
- To'liq tarjimai hol tug'ilgandan boshlab
- Faqat sevimli mashg'ulotlar
- “Rezyumemda hammasi yozilgan”
! Eng muhim qism — hozir nima qila olishingiz, dalillar bilan.

? Stsenariy savoliga javob berishda birinchi qadam nima bo'lishi mumkin?
+ Aniqlashtiruvchi savol berish (masalan, IP ichki yoki tashqi, qaysi xizmat)
- Darhol IP'ni bloklash
- Javob bermaslik
- Eng uzun javobni berish
! Kontekstsiz qaror qabul qilmaslik — triage'ning asosiy tamoyili va professionallik belgisi.

? Javobini bilmagan texnik savolga qanday javob berish kerak?
- Ishonch bilan taxminiy javobni haqiqat sifatida aytish
+ Halol tan olish, bilganlaringiz asosida fikrlashni ko'rsatish va javobni qanday topishingizni aytish
- Mavzuni o'zgartirish
- Intervyuni tugatish
! Xavfsizlikda “bilmaydi, lekin biladi deb o'ylaydi” — xavfli sifat.

? STAR usulida qaysi qism eng ko'p vaqt olishi kerak?
- Situation
- Task
+ Action — siz aniq nima qildingiz
- Hech qaysi
! Intervyuchi aynan sizning harakatlaringiz va qarorlaringizni bilmoqchi.

? STAR hikoyasida “biz” o'rniga “men” deyish nega muhim?
+ Intervyuchi aynan sizning hissangiz va harakatlaringizni baholaydi
- “Biz” deyish odobsizlik
- Bu grammatika qoidasi
- Farqi yo'q
! Jamoaviy loyihada ham o'zingizning aniq rolingizni ayting.

? Amaliy topshiriqda ko'p nomzodlar qayerda yutqazadi?
- Topshiriqni umuman ochmaydi
+ To'g'ri topadi, lekin hisobotni yomon yozadi — tuzilishsiz, dalillarsiz, chegaralarsiz
- Juda tez topshiradi
- Savol beradi
! Hisobot — natijaning yarmi.

? Intervyu oxirida “Savollaringiz bormi?” deb so'rashganda nima qilish kerak?
- “Yo'q” deyish
+ Oldindan tayyorlangan 2–3 ta savol berish (odatiy kun, o'qitish, vositalar, muvaffaqiyat mezonlari)
- Faqat maosh haqida so'rash
- Intervyuchining shaxsiy hayoti haqida so'rash
! Savollar qiziqishingizni ko'rsatadi va kompaniyani baholashga yordam beradi.

? Maosh haqida so'ralganda qaysi yondashuv to'g'ri?
+ Bozor tahlili asosida o'zingiz uchun maqbul oraliqni aytish
- “Qancha bersangiz ham bo'ladi”
- Bozordan bir necha baravar yuqori raqam
- Javob bermaslik
! Boshlang'ich darajada o'rganish va o'sish imkoniyatlari ham muhim.

? Intervyudan keyin eng foydali ikki harakat qaysi?
+ 24 soat ichida qisqa minnatdorchilik xati yuborish
+ Qaysi savollarga yaxshi va qaysilariga yomon javob berganingizni yozib qo'yish
- Har kuni kompaniyaga qo'ng'iroq qilish
- Ijtimoiy tarmoqda intervyu savollarini e'lon qilish
! Qaydlar — keyingi intervyu uchun eng qimmatli tayyorgarlik.

? Ish beruvchi intervyuda qaysi uch savolga javob qidiradi?
+ U qila oladimi? U o'rgana oladimi? U bilan ishlash yoqimli bo'ladimi?
- U qayerda tug'ilgan? Necha yoshda? Qaysi maktabni bitirgan?
- U qancha sertifikatga ega? Qancha CTF yechgan? Qancha obunachisi bor?
- Faqat: u hamma narsani biladimi?
! Boshlang'ich darajada o'rganish qobiliyati va munosabat ko'pincha hal qiluvchi.
:::

:::cards
Intervyu bosqichlari? :: HR suhbati → texnik intervyu → amaliy topshiriq → yakuniy suhbat.
2 daqiqalik hikoya tuzilishi? :: O'tmish (20 s) → hozir: aniq misollar va raqamlar (60 s) → kelajak: nega shu lavozim (30 s).
Texnik savol turlari? :: Asosiy tushunchalar, yo'nalish bilimi, stsenariy, tushuntirish, “qanday bilib olasiz”.
Stsenariy javobi formulasi? :: Aniqlashtirish → ma'lumot yig'ish → eng muhim savol → ikki yo'l → hujjatlashtirish va eskalatsiya → oldini olish.
Bilmagan savolga javob? :: Halol tan olish → bilganlar asosida fikrlash → qanday topardim.
Amaliy topshiriq maslahatlari? :: Hisobot tuzilishi, fikrlashni yozish, chegaralarni ko'rsatish, muddatni hurmat qilish, notanish fayllar — izolyatsiyada.
STAR usuli? :: Situation, Task, Action (50%, “men”), Result (va saboq).
Tayyor STAR hikoyalari? :: Qiyin muammo, xato, jamoaviy ish, bosim ostida ishlash, yangi narsa o'rganish, tashabbus.
Intervyuchiga savollar? :: Odatiy kun, o'qitish va mentor, vositalar, smenalar, 3–6 oydagi muvaffaqiyat, jamoa muammolari, o'qish uchun qo'llab-quvvatlash.
Maosh savoli? :: Bozor tahlili asosida maqbul oraliq; maoshdan tashqari o'sish imkoniyatlarini ham hisobga olish.
Intervyudan keyin? :: 24 soat ichida minnatdorchilik xati, o'zingiz uchun qaydlar, kuzatuv jadvalini yangilash.
Sinov intervyusi? :: Haqiqiydek: vaqt, kamera, texnik + stsenariy + xulq-atvor savollari, oxirida fikr, rozilik bilan yozib olish.
:::
