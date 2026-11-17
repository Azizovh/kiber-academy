2019-yilda ikki professional pentester tunda sud binosiga kirishga urinayotganda hibsga olindi. Ularda shartnoma bor edi, ruxsat xati bor edi, ular buyurtmachi bilan kelishgan holda ishlashardi. Muammo: ruxsat bergan tashkilot binoga egalik qilmas edi — bino boshqa idoraga tegishli edi va u hech narsadan xabardor emas edi. Mutaxassislar bir necha kunni qamoqda o'tkazdi, ish yillar davomida muhokama qilindi va butun soha uchun saboqqa aylandi.

Kichikroq, lekin tez-tez uchraydigan hikoya: tester "203.0.113.0/24 tarmog'ini tekshiring" degan topshiriqni oladi. Diapazondagi IP'lardan biri bir oy oldin bulut provayderiga qaytarilgan va endi **boshqa kompaniyaga** tegishli. Tester uni ham skanerlaydi. Endi u — begona tizimga ruxsatsiz hujum qilgan odam.

Oldingi darsda aytdik: pentesterni jinoyatchidan faqat yozma ruxsat va doiraga rioya ajratadi. Bu dars — o'sha ruxsat va doira aniq nimadan iborat, qaysi hujjatlar kerak va loyiha davomida nima kutilmagan holatlar bo'lishi mumkin.

## Hujjatlar to'plami

| Hujjat | Nima uchun | Kim imzolaydi |
|---|---|---|
| **Shartnoma / SOW** (Statement of Work) | Xizmat, muddat, narx, natija, javobgarlik | Ikki kompaniya rahbariyati |
| **NDA** | Maxfiylik — tester ko'rgan narsalar sir | Ikki tomon |
| **Scope** (qamrov) | Aniq nima tekshiriladi va nima tekshirilmaydi | Mijozning texnik egasi + tester |
| **[[roe|Rules of Engagement]]** | Qanday tekshiriladi: vaqt, usullar, cheklovlar, aloqa | Ikki tomon |
| **Ruxsat xati** (authorization letter) | "Bu odamlar bizning nomimizdan shu tizimlarni tekshirish huquqiga ega" | Aktivlar egasi — vakolatli shaxs |
| **Uchinchi tomon ruxsati** | Hosting, bulut, SaaS provayderi yoki bino egasi | Kerak bo'lsa |

Ruxsat xatini pentesterlar hazil bilan "qamoqdan chiqish kartasi" deyishadi. Lekin dars boshidagi hikoya ko'rsatadi: u faqat **imzolagan odam haqiqatan vakolatli bo'lsa** ishlaydi. Shuning uchun tekshiriladi: imzolovchi bu aktivlarga egalik qiladimi yoki ularni boshqarish huquqiga egami?

## Qamrov (scope)

Qamrov — har bir aktiv uchun aniq javob: **ichkarida yoki tashqarida**.

```
 PT-2026-07 — Qaydnoma — QAMROV

 Ichkarida (in scope):
   - https://qaydnoma.example.com          (web ilova, barcha yo'llar)
   - https://api.qaydnoma.example.com/v1    (REST API, hujjat ilova qilingan)
   - 203.0.113.16/29                        (tashqi infratuzilma — 8 manzil,
                                             egalik: mijozning bulut hisobi, IP ro'yxati ilovada)
   - Test hisoblari: tester1 (foydalanuvchi), tester2 (foydalanuvchi), testadmin (admin)

 Tashqarida (out of scope):
   - status.qaydnoma.example.com            (uchinchi tomon SaaS)
   - Pochta serveri va xodimlar (ijtimoiy injineriya yo'q)
   - Haqiqiy foydalanuvchilar hisoblari va ma'lumotlari
   - Ofis tarmog'i, fizik kirish
   - DoS / yuklama sinovi
```

E'tibor bering:

- **Aniq manzillar**, "Qaydnoma'ning barcha serverlari" emas. Diapazon bo'lsa — mijoz har bir IP egaligini tasdiqlagan ro'yxat.
- **Subdomen ≠ avtomatik doirada.** `status.qaydnoma.example.com` mijoz domenida, lekin uchinchi tomon xizmatida ishlaydi — uni tekshirish o'sha xizmat egasining ruxsatini talab qiladi.
- **Test hisoblari** beriladi — haqiqiy foydalanuvchilar hisoblari va ma'lumotlariga tegilmaydi.

## Rules of Engagement

RoE — "qanday" degan savolga javob. Odatiy bo'limlar:

| Bo'lim | Misol (PT-2026-07) |
|---|---|
| Vaqt oynasi | Ish kunlari 09:00–18:00 (UTC+5); agressiv skanerlar — faqat kelishilgan kechalarda |
| Manba IP | Tester trafigi faqat `198.51.100.50` dan — SOC uni tanisin |
| Ruxsat etilgan usullar | Qo'lda tekshiruv, avtomatik skanerlar (cheklangan tezlikda), kelishilgan zaifliklarni minimal isbotlash |
| Taqiqlangan | DoS, ma'lumotni o'chirish yoki o'zgartirish, ijtimoiy injineriya, doiradan tashqariga o'tish, haqiqiy foydalanuvchi ma'lumotini yuklab olish |
| Parol hujumlari | Login formada: har bir hisobga soatiga 5 tadan ko'p urinish yo'q (bloklashning oldini olish) |
| Ma'lumot bilan ishlash | Maxfiy ma'lumot ko'rilsa — faqat isbot uchun minimal qismi, shifrlangan saqlash, loyihadan 90 kun keyin o'chirish |
| Kritik topilma | Darhol (24 soat kutmasdan) texnik aloqa shaxsiga xabar |
| Favqulodda to'xtatish | Mijoz "STOP" desa — darhol to'xtatish; tester ham xizmat buzilganini sezsa to'xtatib xabar beradi |
| Aloqa | Ikki tomonning texnik va favqulodda aloqa shaxslari, telefonlari (ish vaqtidan tashqari ham) |
| Hisobot | Test tugaganidan keyin 10 ish kuni ichida; retest — tuzatishdan keyin |

Manba IP bo'limi alohida muhim: SOC tarmog'ida o'rgangan tahlilchi — mijozning SOC jamoasi — sizning skanerlaringizni ko'radi. Ular bu sizmi yoki haqiqiy hujumchimi, bilishi kerak. Ba'zi loyihalarda SOC ataylab xabardor qilinmaydi (ularning javobini ham sinash uchun) — bu ham RoE'da yozilgan qaror bo'lishi kerak, tasodif emas.

## Bulut va uchinchi tomonlar

Mijozning serveri bulutda bo'lsa, u fizik jihatdan provayderga tegishli. Provayderlarning pentest siyosatlari bor:

- AWS, Azure va Google Cloud mijozlarga **o'z** resurslarini oldindan ruxsat so'ramasdan tekshirishga ruxsat beradi — lekin ro'yxatdagi xizmatlar uchun va ma'lum usullarsiz (masalan, DoS, provayderning o'z infratuzilmasiga hujum taqiqlangan).
- SaaS xizmatlari (pochta, CRM, status sahifasi) — ko'pincha umuman taqiqlangan yoki faqat ularning o'z bug bounty dasturi orqali.

Siyosatlar o'zgaradi — har loyihada joriy versiyasini o'qing va qamrovda havolasini qayd eting.

## Doiradan tashqariga chiqish

Pentest davomida doiradan tashqaridagi narsalar doim uchraydi:

- Skanerlash vaqtida diapazonda notanish IP javob berdi.
- Ilova ichida boshqa domendagi API'ga murojaat ko'rindi.
- Server konfiguratsiyasida boshqa tarmoqqa ulanish ma'lumotlari topildi.

Qoida oddiy: **to'xtang, yozib qo'ying, xabar bering.** Doirani kengaytirish kerak bo'lsa — yozma ravishda, mijoz tasdig'i bilan. "Faqat bir ko'z tashlab chiqaman" — dars boshidagi hikoyaning boshlanishi.

:::warn
Doiradan tashqariga chiqishning oqibatlari faqat huquqiy emas. Siz begona kompaniya tizimini buzishingiz, mijoz bilan munosabatlarni yo'qotishingiz va firmangizni javobgarlikka tortishingiz mumkin. Professional pentester uchun doiraga qat'iy rioya — texnik mahoratdan ham muhimroq obro'.
:::

## Kritik topilmalar va kutilmagan holatlar

| Holat | Nima qilinadi |
|---|---|
| Kritik zaiflik (masalan, autentifikatsiyasiz admin panel) | RoE'dagi tartib bo'yicha darhol xabar; hisobotni kutmaslik |
| **Avvalgi buzilish izlari** (begona web shell, notanish admin hisobi) | Darhol to'xtatish va xabar — bu endi pentest emas, insident (b3). Dalilni buzmaslik |
| Maxfiy ma'lumot ko'rindi (parollar, karta raqamlari) | Minimal isbot, saqlamaslik yoki shifrlab saqlash, xabar |
| Xizmat ishdan chiqdi | To'xtatish, faoliyat jurnali bilan birga xabar |
| Tester trafigi bloklandi (WAF, IPS) | Aylanib o'tishga urinmaslik — mijoz bilan kelishish (himoya ishlagani — ham topilma) |

Ikkinchi qator muhim: sizdan oldin kimdir kirgan bo'lishi mumkin. SOC tarmog'idagi bilim shu yerda: dalilni buzmaslik, darhol xabar berish va IR jamoasiga topshirish.

## Ma'lumotlar bilan ishlash

Tester ko'p maxfiy narsalarni ko'radi: konfiguratsiyalar, ichki IP'lar, ba'zan foydalanuvchi ma'lumotlari. Bu ma'lumot — **mijozniki**.

- Eslatmalar va dalillar shifrlangan diskda.
- Isbot uchun minimal miqdor: "bu jadvalda 40 000 qator bor" — ustunlar nomi va qatorlar soni, ma'lumotning o'zi emas.
- Hisobot shifrlangan kanal orqali yuboriladi.
- Loyiha tugagach, kelishilgan muddatda ma'lumotlar o'chiriladi.
- Ijtimoiy tarmoqda "bugun bitta bankni buzdim" — NDA buzilishi va professional o'z joniga qasd.

## Bug bounty siyosati — ommaviy qamrov

Bug bounty va VDP dasturlarida (p4 bosqichi) shartnoma o'rnini **ommaviy siyosat** egallaydi: qaysi domenlar doirada, qaysi zaiflik turlari qabul qilinmaydi, qanday usullar taqiqlangan (odatda DoS, ijtimoiy injineriya, avtomatik skanerlarning yuqori tezligi) va **safe harbor** — siyosatga rioya qilgan tadqiqotchiga qarshi da'vo qilmaslik majburiyati. Siyosatni o'qimasdan tekshirish — ruxsatsiz tekshiruv.

## Boshlashdan oldingi tekshiruv ro'yxati

- [ ] Shartnoma va NDA imzolangan
- [ ] Qamrov hujjati — har bir aktiv aniq, egaligi tasdiqlangan
- [ ] RoE — vaqt, usullar, taqiqlar, aloqa, favqulodda tartib
- [ ] Ruxsat xati vakolatli shaxs tomonidan imzolangan
- [ ] Bulut va uchinchi tomon siyosatlari tekshirilgan
- [ ] Test hisoblari ishlaydi
- [ ] Manba IP mijozga ma'lum (yoki ataylab ma'lum emas — yozma qaror)
- [ ] Aloqa shaxslari bilan bog'lanish sinab ko'rilgan
- [ ] Eslatmalar papkasi shifrlangan muhitda tayyor

:::try
1. Quyidagi holatlarni baholang — tester nima qilishi kerak? (a) Qamrovda `qaydnoma.example.com`, skanerlashda `mail.qaydnoma.example.com` topildi; (b) ilovada test hisobi bilan boshqa foydalanuvchining qaydlari ko'rindi (IDOR); (c) serverda sanasi bir oy oldingi notanish `.php` fayli topildi; (d) WAF tester IP'sini blokladi.
2. O'zingiz uchun bitta sahifalik RoE shablonini yozing (yuqoridagi jadval bo'limlari bilan).
3. AWS'ning joriy pentest siyosatini o'qing: qaysi usullar oldindan ruxsatsiz taqiqlangan?
4. HackerOne yoki Bugcrowd'dagi istalgan ommaviy dastur siyosatini oching. Doiradagi va doiradan tashqaridagi aktivlarni, taqiqlangan usullarni va safe harbor bandini toping.
5. Savol: mijozning IT bo'limi xodimi telefonda "ofis Wi-Fi'ni ham tekshirib qo'ying" dedi. Nima qilasiz?

**Javoblar:**
1. (a) Doirada emas — yozib qo'yish va mijozdan doirani kengaytirish yoki yo'qligini yozma so'rash. (b) Bu topilma — minimal isbot (test hisoblari orasida yoki boshqa qaydning faqat ID va sarlavhasi), haqiqiy ma'lumotni yuklab olmaslik, kritik bo'lsa darhol xabar. (c) Avvalgi buzilish belgisi — to'xtatish, faylga tegmaslik, darhol xabar. (d) Aylanib o'tmaslik; mijozga xabar berib, IP'ni ruxsat ro'yxatiga qo'shish yoki WAF ortidagi tekshiruvni kelishish. WAF bloklagani ham hisobotda ijobiy kuzatuv sifatida yoziladi.
2. Shablonda kamida: vaqt oynasi, manba IP, ruxsat etilgan va taqiqlangan usullar, ma'lumot bilan ishlash, kritik topilma va favqulodda to'xtatish tartibi, aloqa shaxslari.
3. Odatda DoS va stress-test, provayderning o'z infratuzilmasiga yoki boshqa mijozlarga hujum taqiqlangan; ba'zi faoliyatlar uchun alohida so'rov formasi bor.
4. Doiradan tashqarida ko'pincha uchinchi tomon xizmatlari, marketing saytlari va DoS; "qabul qilinmaydigan topilmalar" ro'yxati ham bo'ladi.
5. Og'zaki so'rov — ruxsat emas. Yozma ravishda doirani kengaytirish so'raladi: aktiv, usullar, vaqt va vakolatli shaxs imzosi bilan. Shungacha Wi-Fi'ga tegilmaydi.
:::

## Xulosa

- Hujjatlar: shartnoma/SOW, NDA, qamrov, RoE, ruxsat xati, kerak bo'lsa uchinchi tomon ruxsati. Imzolovchi aktivlarga haqiqatan vakolatli bo'lishi shart.
- Qamrov — har bir aktiv aniq: ichkarida yoki tashqarida. Subdomen avtomatik doirada emas; IP egaligi tasdiqlanadi.
- RoE: vaqt, manba IP, ruxsat etilgan va taqiqlangan usullar, parol urinishlari cheklovi, ma'lumot bilan ishlash, kritik topilma va favqulodda to'xtatish, aloqa.
- Bulut va SaaS provayderlarining o'z pentest siyosatlari bor.
- Doiradan tashqari narsa uchrasa: to'xtang, yozing, xabar bering. Kengaytirish — faqat yozma.
- Avvalgi buzilish izlari — pentest emas, insident: to'xtatish va IR'ga topshirish.
- Ma'lumot — mijozniki: minimal isbot, shifrlash, o'chirish, sir saqlash.
- Bug bounty'da siyosat — ommaviy qamrov va safe harbor.

:::quiz
? Ruxsat xati qachon haqiqiy himoya beradi?
- Har qanday xodim imzolasa
+ Uni tekshiriladigan aktivlarga egalik qiluvchi yoki ularni boshqarishga vakolatli shaxs imzolagan bo'lsa
- Faqat og'zaki kelishilgan bo'lsa
- Tester o'zi yozgan bo'lsa
! Dars boshidagi hikoya: imzolovchi binoga egalik qilmagan.

? Qamrovda `qaydnoma.example.com` bor. `status.qaydnoma.example.com` uchinchi tomon SaaS'da ishlaydi. Uni tekshirish mumkinmi?
- Ha, chunki u mijoz domenida
+ Yo'q — u qamrovda aniq ko'rsatilmagan va uchinchi tomon ruxsatini talab qiladi
- Faqat tunda
- Faqat avtomatik skaner bilan
! Subdomen avtomatik ravishda doirada emas; egalik va ruxsat muhim.

? RoE'da tester manba IP'sini ko'rsatish nega muhim?
+ Mijozning SOC jamoasi tester trafigini haqiqiy hujumdan ajrata olishi uchun
- IP manzil chiroyli ko'rinishi uchun
- Bu talab qilinmaydi
- Faqat soliq uchun
! Aks holda SOC test faolligini insident deb qabul qilishi yoki aksincha haqiqiy hujumni test deb o'tkazib yuborishi mumkin.

? Skanerlash vaqtida qamrovdan tashqaridagi IP javob berdi. To'g'ri harakat?
- Tez skanerlab, keyin mijozga aytish
- E'tiborsiz qoldirib, hech kimga aytmaslik
+ To'xtatish, yozib qo'yish va mijozga xabar berish; kengaytirish faqat yozma tasdiq bilan
- Uni ham qamrovga kiritilgan deb hisoblash
! Doiradan tashqari harakat — ruxsatsiz tekshiruv.

? Serverda tester bir oy oldin joylangan notanish skript faylini topdi. Nima qilish kerak?
- Faylni o'chirib, tozalash
- Faylni ishlatib ko'rish
+ To'xtatish, faylga tegmaslik va darhol mijozga xabar berish — bu avvalgi buzilish belgisi
- Hisobotda keyin eslatib o'tish
! Bu endi insident; dalilni buzmaslik va IR jamoasiga topshirish kerak.

? WAF tester IP'sini blokladi. Qaysi harakat to'g'ri?
- Boshqa IP'lardan aylanib o'tish
- WAF'ni o'chirishga urinish
+ Mijozga xabar berib, keyingi qadamni kelishish; himoya ishlaganini kuzatuv sifatida yozish
- Testni tugatib, hisobot yozmaslik
! Himoyani kelishuvsiz aylanib o'tish RoE buzilishi bo'lishi mumkin.

? RoE'da "har bir hisobga soatiga 5 tadan ko'p login urinishi yo'q" degan cheklov nima uchun kerak?
- Testni tezlashtirish uchun
+ Haqiqiy foydalanuvchilar hisoblarini bloklab, xizmatni buzmaslik uchun
- Parollarni o'g'irlash uchun
- Bu ma'nosiz cheklov
! Agressiv parol urinishlari hisob bloklanishiga va biznes uzilishiga olib keladi.

? Tester maxfiy ma'lumotlar jadvalini topdi. Isbot uchun nima yetarli?
- Butun jadvalni yuklab olish
+ Jadval va ustunlar nomi, qatorlar soni — ma'lumotning o'zisiz
- Ma'lumotni ijtimoiy tarmoqqa joylash
- Jadvalni o'chirish
! Ma'lumot mijozniki; isbot minimal bo'lishi kerak.

? Mijoz xodimi telefonda qo'shimcha tizimni tekshirishni so'radi. Nima qilinadi?
- Darhol tekshirish
+ Yozma ravishda, vakolatli shaxs tasdig'i bilan qamrovni kengaytirishni so'rash
- Rad etib, loyihani to'xtatish
- Faqat bir qismini tekshirish
! Og'zaki so'rov ruxsat emas.

? Bug bounty dasturidagi "safe harbor" bandi nimani bildiradi?
+ Siyosatga rioya qilgan tadqiqotchiga qarshi tashkilot huquqiy da'vo qilmaslikka va'da beradi
- Har qanday usul ruxsat etilgan
- Tadqiqotchi pul to'laydi
- Qamrov cheksiz
! Safe harbor faqat siyosat doirasidagi harakatlarni himoya qiladi.
:::

:::cards
SOW :: Statement of Work — xizmat, muddat, natija va javobgarlikni belgilaydigan hujjat
Scope :: Aniq qaysi aktivlar tekshiriladi va qaysilari tekshirilmaydi
Rules of Engagement :: Qanday tekshiriladi: vaqt, usullar, taqiqlar, aloqa, favqulodda tartib
Ruxsat xati :: Vakolatli egasi imzolagan tekshirish huquqi hujjati
Out of scope :: Tekshirilmaydigan aktivlar va usullar (masalan, DoS, ijtimoiy injineriya)
Manba IP :: Tester trafigi keladigan manzil — SOC uni taniydi
Kritik topilma tartibi :: Hisobotni kutmasdan darhol xabar berish
Favqulodda to'xtatish :: Mijoz yoki tester xavf sezsa, darhol to'xtatish
Avvalgi buzilish izlari :: Pentest emas, insident — to'xtatish va IR'ga topshirish
Minimal ma'lumot :: Isbot uchun faqat kerakli qism; mijoz ma'lumoti saqlanmaydi
Safe harbor :: Siyosatga rioya qilgan tadqiqotchiga qarshi da'vo qilmaslik majburiyati
:::
