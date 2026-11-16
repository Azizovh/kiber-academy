O'rta asr qal'asini tasavvur qiling. Xandaq, ko'tarma ko'prik, tashqi devor, ichki devor, minoralar, qorovullar va eng ichkarida — xazina. Dushman xandaqdan o'tsa — devor bor. Devordan oshsa — qorovul ko'radi. Hech bir quruvchi "devorimiz baland, qolgani kerak emas" demagan.

Oldingi darslarda hujumning har xil turlarini va bosqichlarini ko'rdingiz. Endi savolning ikkinchi yarmi: **himoya qanday quriladi?** Javob — bitta mukammal devor emas, bir-birini to'ldiruvchi qatlamlar tizimi.

## Defense in depth

[[defense-in-depth|Qatlamli himoya]] (defense in depth) — bir necha **mustaqil** himoya qatlamini ustma-ust qo'yish. Asosida uchta halol tan olish yotadi:

1. **Har qanday himoya chorasi bir kun yengiladi.** Firewall noto'g'ri sozlanadi, antivirus yangi namunani tanimaydi, xodim havolani bosadi.
2. **Har bir vositaning ko'r nuqtasi bor.** Firewall ruxsat etilgan port ichidagi hujumni ko'rmaydi; shifrlash zararlangan qurilmadan qutqarmaydi.
3. **Xatolar bo'ladi.** Odamlar charchaydi, shoshiladi, unutadi.

Shuning uchun maqsad — hech narsa o'tmaydigan devor emas, balki **bitta xato halokatga olib kelmaydigan** tizim.

Buni "shveytsariya pishlog'i modeli" bilan tasvirlashadi: har bir qatlam — teshikli pishloq bo'lagi. Bitta bo'lakdan narsa o'tib ketadi. Lekin bir necha bo'lakni ustma-ust qo'ysangiz, teshiklar bir-biriga to'g'ri kelishi ehtimoli keskin kamayadi.

## Qatlamlar

Himoyani tashqaridan ichkariga qarab tasavvur qilish qulay. Markazda — himoya qilinayotgan narsa: **ma'lumot**.

```
┌───────────────────────────────────────────────────────────┐
│  SIYOSAT, JARAYON, ODAMLAR                                │
│ ┌───────────────────────────────────────────────────────┐ │
│ │  JISMONIY                                             │ │
│ │ ┌───────────────────────────────────────────────────┐ │ │
│ │ │  TARMOQ CHEGARASI                                 │ │ │
│ │ │ ┌───────────────────────────────────────────────┐ │ │ │
│ │ │ │  ICHKI TARMOQ                                 │ │ │ │
│ │ │ │ ┌───────────────────────────────────────────┐ │ │ │ │
│ │ │ │ │  QURILMA (HOST)                           │ │ │ │ │
│ │ │ │ │ ┌───────────────────────────────────────┐ │ │ │ │ │
│ │ │ │ │ │  ILOVA                                │ │ │ │ │ │
│ │ │ │ │ │ ┌───────────────────────────────────┐ │ │ │ │ │ │
│ │ │ │ │ │ │           MA'LUMOT                │ │ │ │ │ │ │
│ │ │ │ │ │ └───────────────────────────────────┘ │ │ │ │ │ │
│ │ │ │ │ └───────────────────────────────────────┘ │ │ │ │ │
│ │ │ │ └───────────────────────────────────────────┘ │ │ │ │
│ │ │ └───────────────────────────────────────────────┘ │ │ │
│ │ └───────────────────────────────────────────────────┘ │ │
│ └───────────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────────┘
```

| Qatlam | Nima himoya qiladi | Asosiy choralar |
|---|---|---|
| **Siyosat va odamlar** | Qoidalar va xatti-harakat | Siyosatlar, o'qitish, ishga olish va bo'shatish tartibi |
| **Jismoniy** | Bino, server xonasi, qurilmalar | Qulf, propusk, kamera, ekranni qulflash |
| **Tarmoq chegarasi** | Tashqi dunyo bilan chegara | Firewall, VPN, pochta va veb filtrlari, DDoS himoyasi |
| **Ichki tarmoq** | Tizimlar orasidagi harakat | Segmentatsiya, ichki firewall, IDS/IPS |
| **Qurilma** | Kompyuter va serverlar | Yangilash, antivirus/EDR, mustahkamlash, disk shifrlash |
| **Ilova** | Dasturlar | Xavfsiz kod, autentifikatsiya, kirishni tekshirish, WAF |
| **Ma'lumot** | Ma'lumotning o'zi | Shifrlash, kirish nazorati, zaxira nusxa, tasniflash |

Bu jadvaldagi deyarli hamma narsa sizga tanish — endi ular bir manzaraga yig'ildi. Har qatlamni qisqacha ko'rib chiqamiz.

### Siyosat va odamlar

Eng tashqi va eng asosiy qatlam. Texnik vosita "nima qilish mumkin"ni cheklaydi; siyosat "nima qilish kerak"ni belgilaydi: parol talablari, kim nimaga kira oladi, hodisa yuz bersa kimga xabar beriladi, xodim ketganda nima qilinadi.

Ijtimoiy muhandislik darsidan: ko'p hujumlar texnikani emas, odamni nishonga oladi. Shuning uchun **o'qitish** va **xabar berish madaniyati** — himoyaning to'laqonli qatlami.

### Jismoniy

Ko'pincha unutiladi. Lekin server xonasiga kirgan kishi uchun firewall mavjud emas; qulflanmagan noutbuk uchun parol siyosati ham.

### Tarmoq chegarasi va ichki tarmoq

Tarmoq bosqichidan: [[firewall|firewall]] va **default deny**, DMZ, VPN. Va eng muhim g'oya — **segmentatsiya**: chegara yengilganda hujumchi butun tarmoqqa emas, faqat bitta bo'lakka tushadi.

### Qurilma

Har bir kompyuter va server o'zini mustaqil himoya qilishi kerak — go'yo tarmoq himoyasi yo'qdek. Bunga [[hardening|mustahkamlash]] (hardening) deyiladi:

- keraksiz xizmat va dasturlarni olib tashlash;
- standart parollarni almashtirish;
- yangilab turish;
- host firewall;
- eng kam imtiyoz; kundalik ish — oddiy hisobda;
- jurnallarni yoqish.

Linux bosqichining yarmi shu haqida edi.

### Ilova

Dasturlash bosqichidan: kirishga ishonmaslik, parametrlangan so'rovlar, serverda tekshirish. Keyingi darsda — web zaifliklar xaritasi.

### Ma'lumot

Eng ichki qatlam. Boshqa hamma narsa yengilsa ham ishlaydigan choralar:

- **Shifrlash** — o'g'irlangan ma'lumot o'qilmaydi.
- **Zaxira nusxa** — yo'q qilingan ma'lumot tiklanadi (3-2-1 qoidasi).
- **Minimallashtirish** — saqlanmagan ma'lumot o'g'irlanmaydi. Kerak bo'lmagan ma'lumotni **yig'mang**.
- **Tasniflash** — nima ommaviy, nima ichki, nima maxfiy; himoya darajasi shunga mos.

## Himoya vositalari xaritasi

Shu paytgacha turli darslarda ko'p vosita nomlarini uchratdingiz. Ularni bir joyga yig'amiz. Har birining yonida — eng muhim savol: **u nimani ko'rmaydi?**

| Vosita | Nima qiladi | Nimani ko'rmaydi |
|---|---|---|
| **Firewall** | Trafikni manzil va port bo'yicha filtrlaydi | Ruxsat etilgan port ichidagi hujum |
| **WAF** | HTTP so'rovlar mazmunini tekshiradi | Mantiqiy xatolar; kirish nazorati xatolari |
| [[ids|IDS / IPS]] | Hujumga o'xshash trafikni aniqlaydi / bloklaydi | Shifrlangan trafik ichi; yangi usullar |
| **Antivirus** | Ma'lum zararli fayllarni topadi | Yangi va faylsiz hujumlar |
| [[edr|EDR]] | Qurilmadagi **xatti-harakatni** kuzatadi va javob beradi | Agent o'rnatilmagan qurilmalar |
| **Pochta filtri** | Spam, zararli ilova va havolalarni to'sadi | Havolasiz, ilovasiz aldov (BEC) |
| **DLP** | Sezgir ma'lumot chiqib ketishini kuzatadi | Shifrlangan yoki o'zgartirilgan ma'lumot |
| [[siem|SIEM]] | Barcha jurnallarni yig'ib, bog'lab tahlil qiladi | Unga yuborilmagan jurnallar |
| **Zaiflik skaneri** | Ma'lum zaifliklarni topadi | Mantiqiy xatolar; noma'lum zaifliklar |
| **MFA** | O'g'irlangan parolni foydasiz qiladi | O'g'irlangan sessiya; aldangan foydalanuvchi |
| **Zaxira nusxa** | Yo'qolgan ma'lumotni tiklaydi | Ma'lumot **sizib chiqishi** |

O'ng ustun — qatlamli himoyaning asosi. **Har bir vositaning ko'r nuqtasini boshqasi yopadi.** "X ni sotib oldik — endi xavfsizmiz" degan gap doim noto'g'ri.

### Antivirus va EDR farqi

| | Antivirus | EDR |
|---|---|---|
| Qanday aniqlaydi | Asosan ma'lum namunalar (signatura) bo'yicha | Xatti-harakat bo'yicha: jarayon nima qilyapti |
| Nimani ko'radi | Fayllarni | Jarayonlar daraxti, tarmoq ulanishlari, o'zgarishlar |
| Topgach | Bloklaydi yoki karantinga oladi | + tergov uchun ma'lumot, qurilmani tarmoqdan ajratish |

O'tgan darsdagi Pyramid of Pain: antivirus piramidaning pastida (xeshlar) ishlaydi, EDR — tepasida (xatti-harakat). `WINWORD.EXE → powershell.exe` zanjirini antivirus ko'rmasligi mumkin — ikkala dastur ham qonuniy. EDR ko'radi.

**XDR** — EDR g'oyasining kengaytmasi: qurilma, tarmoq, pochta va bulut ma'lumotlarini birlashtiradi.

### SIEM — himoyaning miyasi

Har bir vosita o'z jurnalini yuritadi. Alohida-alohida ular kam narsa aytadi. SIEM ularni **bir joyga yig'adi va bog'laydi**:

```
Firewall ──┐
Serverlar ─┤
Pochta ────┼──►  SIEM  ──►  Ogohlantirish  ──►  SOC analitigi
EDR ───────┤     (yig'ish, normallashtirish,
Bulut ─────┘      korrelyatsiya)
```

Alohida hodisalar: "VPN ga muvaffaqiyatli kirish" — oddiy. "Fayl serveridan katta hajmda nusxalash" — oddiy. Ikkalasi birga, tungi soat uchda, xodim hech qachon bormagan mamlakatdan — bu allaqachon signal. Bunday **korrelyatsiyani** faqat hamma narsani ko'radigan tizim qila oladi.

Linux darsidagi "jurnallar markaziy serverga yuboriladi" — SIEM'ning boshlanishi. SOC yo'nalishi shu vosita atrofida quriladi.

## Aniqlash va javob: ikkinchi yarim

Yuqoridagi qatlamlar asosan **oldini olish** haqida. Lekin CIA darsidan: har qanday to'siq yengiladi. Shuning uchun himoyaning ikkinchi yarmi — **nima bo'lganini bilish va unga javob bera olish**.

Buni tartibga soluvchi mashhur tuzilma — **NIST Cybersecurity Framework**. U butun himoya dasturini funksiyalarga bo'ladi:

| Funksiya | Savol | Misollar |
|---|---|---|
| **Govern** (boshqarish) | Kim javobgar va qoidalar qanday? | Siyosat, rollar, xavfni boshqarish |
| **Identify** (aniqlab olish) | Bizda nima bor va nima xavf ostida? | Inventarizatsiya, xavfni baholash |
| **Protect** (himoyalash) | Qanday oldini olamiz? | Kirish nazorati, shifrlash, yangilash, o'qitish |
| **Detect** (payqash) | Sodir bo'lganini qanday bilamiz? | Monitoring, jurnallar, SIEM, EDR |
| **Respond** (javob berish) | Sodir bo'lganda nima qilamiz? | Insidentga javob rejasi, cheklash, tergov |
| **Recover** (tiklash) | Qanday tiklanamiz? | Zaxiradan tiklash, saboqlar |

Ko'p tashkilotlar byudjetning deyarli hammasini **Protect** ga sarflaydi va qolganini unutadi. Natija: hujumchi ichkarida oylab yuradi va hech kim bilmaydi. Hujumchi kirgan paytdan uni payqashgacha o'tgan vaqt — **dwell time** — himoya sifatining eng muhim ko'rsatkichlaridan biri.

:::key
Yetuk xavfsizlikning belgisi — "bizni buzib bo'lmaydi" degan ishonch emas, balki uchta savolga aniq javob: **Buzilganimizni qancha vaqtda bilamiz? Uni qancha vaqtda to'xtatamiz? Qancha vaqtda tiklanamiz?** Bu vaqtlarni qisqartirish — oldini olish kabi muhim.
:::

### Insidentga javob

[[incident|Insident]] yuz berganda vahima emas, **oldindan tayyorlangan reja** ishlaydi. Klassik bosqichlar:

| Bosqich | Mohiyati |
|---|---|
| **1. Tayyorgarlik** | Reja, rollar, aloqa ro'yxati, vositalar, mashqlar — hodisadan **oldin** |
| **2. Aniqlash va tahlil** | Bu haqiqatan insidentmi? Qamrovi qanday? |
| **3. Cheklash** | Tarqalishni to'xtatish: qurilmani tarmoqdan ajratish, hisobni bloklash |
| **4. Yo'q qilish** | Sababni bartaraf etish: zararli dastur, zaiflik, hujumchi hisoblari |
| **5. Tiklash** | Tizimlarni toza holatda ishga qaytarish va kuzatish |
| **6. Saboqlar** | Nima bo'ldi, nega bo'ldi, nimani o'zgartiramiz |

Birinchi bosqich — eng muhimi. Kimga qo'ng'iroq qilish kerakligini yong'in paytida emas, undan oldin bilish kerak. Va oltinchisi — eng ko'p o'tkazib yuboriladigani: usiz xuddi shu hodisa takrorlanadi.

Oldingi darslardan ikki qoida shu yerga tegishli: **dalilni saqlang** (buzilgan kompyuterni darhol o'chirmang — xotiradagi izlar yo'qoladi) va **avval cheklang, keyin tozalang** (shoshilib tozalash hujumchiga payqalganini bildiradi, tarqalish yo'llari esa ochiq qoladi).

SOC yo'nalishida bu jarayon — asosiy ish.

## Zaxira va uzluksizlik

Oxirgi himoya chizig'i — hammasi yengilgan taqdirda ham **tiklana olish**.

3-2-1 qoidasini bilasiz. Qo'shimcha ikki o'lchov:

| Ko'rsatkich | Savol |
|---|---|
| **RPO** (Recovery Point Objective) | Qancha ma'lumotni yo'qotishga chidaymiz? (Oxirgi zaxira qachon?) |
| **RTO** (Recovery Time Objective) | Qancha vaqt ishlamasdan tura olamiz? |

Kunda bir marta zaxira = RPO 24 soat: eng yomon holatda bir kunlik ish yo'qoladi. Bu maqbulmi — biznes hal qiladi.

Va eng muhim qoida takror: **tiklash sinab ko'rilmagan zaxira — zaxira emas, umid.** Ko'p tashkilotlar zaxirasi ishlamasligini aynan kerak bo'lgan kuni bilib oladi.

## Asosiy gigiyena

Murakkab vositalardan oldin — oddiy narsalar. Hujum turlari darsidan: aksariyat hujumlar ommaviy va ular **asosiy gigiyena** bilan to'xtatiladi.

Kichik tashkilot yoki o'z tizimlaringiz uchun birinchi navbatdagi ro'yxat:

| № | Chora | Qaysi hujumni to'xtatadi |
|---|---|---|
| 1 | **Inventarizatsiya**: nima borligini bilish | Unutilgan, himoyasiz tizimlar |
| 2 | **Yangilab turish** | Ma'lum zaifliklar |
| 3 | **MFA** — ayniqsa pochta, masofaviy kirish, administratorlar | O'g'irlangan parollar |
| 4 | **Alohida parollar + parol menejeri** | Credential stuffing |
| 5 | **Eng kam imtiyoz**; kundalik ish oddiy hisobda | Zararli dasturning to'liq huquq olishi |
| 6 | **Zaxira nusxa** (3-2-1, sinab ko'rilgan) | Ransomware, nosozlik |
| 7 | **Keraksizni o'chirish**: xizmat, port, hisob | Hujum yuzasi |
| 8 | **Jurnallarni yoqish va saqlash** | Sezilmay qolish |
| 9 | **Xodimlarni o'qitish** | Phishing |
| 10 | **Insidentga javob rejasi** | Vahima va xatolar |

Bu ro'yxat — **CIS Controls** kabi tan olingan to'plamlarning soddalashtirilgan ko'rinishi. Unda birorta qimmat mahsulot yo'q — faqat tartib-intizom.

:::warn
Xavfsizlikda eng keng tarqalgan xato — asoslarni o'tkazib yuborib, murakkab vositalarga sakrash. Yangilanmagan serverlar va MFA siz administrator hisoblari turgan tarmoqqa o'rnatilgan eng qimmat tizim ham hech narsani o'zgartirmaydi. Avval — poydevor.
:::

## Xavfsizlik va qulaylik

Oxirgi, lekin muhim fikr. Har bir himoya chorasi kimgadir noqulaylik tug'diradi. Agar noqulaylik haddan oshsa, odamlar himoyani **aylanib o'tadi**: parolni stikerga yozadi, ish fayllarini shaxsiy pochtaga yuboradi, taqiqlangan dastur o'rniga boshqasini topadi.

Aylanib o'tilgan himoya — yo'q himoyadan yomon: u xavfsizlik bor degan **yolg'on tasavvur** beradi.

Shuning uchun yaxshi xavfsizlikchi faqat "yo'q" demaydi. U so'raydi: "Sizga nima kerak? Buni xavfsiz qilish yo'lini topaylik." **To'g'ri yo'l — eng oson yo'l bo'lishi kerak.** Parol menejeri, SSO, passkey — xavfsizlikni ham, qulaylikni ham oshiradigan misollar.

:::try
**1. O'z qatlamlaringiz.** Uy tarmog'ingiz va shaxsiy qurilmalaringiz uchun jadval tuzing: har bir qatlamda (jismoniy, tarmoq, qurilma, ilova/hisoblar, ma'lumot) sizda **nima bor** va **nima yo'q**? Eng bo'sh qatlam qaysi?

**2. Gigiyena ro'yxati.** Yuqoridagi 10 banddan nechasi sizning shaxsiy tizimlaringizda bajarilgan? Bajarilmaganlaridan birini shu hafta bajaring.

**3. Ko'r nuqtalar.** Vositalar jadvaliga qarang va javob bering: xodim kutilmagan xatdagi havolani bosib, soxta sahifaga parolini kiritdi. Qaysi vositalar buni **to'xtatmaydi** va qaysi qatlam qutqarishi mumkin?

**4. Tiklash sinovi.** Zaxira nusxangizdan bitta faylni tiklab ko'ring. Qancha vaqt oldi? Oxirgi zaxira qachon olingan — ya'ni sizning RPO ingiz qancha?

*3-savol javobi: firewall, antivirus va disk shifrlash bu yerda yordam bermaydi — hech qanday zararli fayl yo'q, trafik ruxsat etilgan portda. Qutqarishi mumkin: pochta filtri (xatni ushlasa), parol menejeri (soxta domenda to'ldirmaydi), MFA (parol yolg'iz o'zi yetmaydi), SIEM (g'ayrioddiy kirishni payqaydi).*
:::

## Xulosa

- **Qatlamli himoya**: bir necha mustaqil qatlam; har birining ko'r nuqtasini boshqasi yopadi.
- Qatlamlar: siyosat va odamlar → jismoniy → tarmoq → qurilma → ilova → **ma'lumot**.
- Har bir vosita haqida so'rang: **u nimani ko'rmaydi?**
- **Antivirus** — ma'lum fayllar; **EDR** — xatti-harakat; **SIEM** — hamma jurnallarni bog'laydi.
- Himoya faqat oldini olish emas: **Identify, Protect, Detect, Respond, Recover**.
- Asosiy ko'rsatkichlar: qancha vaqtda payqaymiz, to'xtatamiz, tiklanamiz.
- **Insidentga javob**: tayyorgarlik → aniqlash → cheklash → yo'q qilish → tiklash → saboqlar.
- Zaxira: 3-2-1, **RPO** va **RTO**, tiklash sinab ko'rilgan.
- Avval **asosiy gigiyena**, keyin murakkab vositalar.
- Aylanib o'tiladigan himoya — himoya emas; to'g'ri yo'l oson bo'lishi kerak.

:::quiz
? Qatlamli himoya (defense in depth) g'oyasi nimaga asoslanadi?
- Bitta juda kuchli himoya vositasi yetarli
+ Har qanday chora yengilishi mumkin — shuning uchun bir necha mustaqil qatlam kerak
- Himoya faqat tarmoq chegarasida bo'lishi kerak
- Eng qimmat vosita eng yaxshi
! Bitta qatlam yengilganda keyingisi to'xtatadi yoki hech bo'lmaganda sezadi.

? Firewall nimani ko'rmaydi?
- Yopiq portlarga kelgan so'rovlarni
+ Ruxsat etilgan port orqali kelgan hujum mazmunini
- IP manzillarni
- Hech narsani — u hamma narsani ko'radi
! Oddiy firewall manzil va portga qaraydi. 443-port ochiq bo'lsa, undagi veb-hujum ham o'tadi.

? Antivirus va EDR o'rtasidagi asosiy farq nima?
- EDR arzonroq
+ Antivirus asosan ma'lum fayllarni taniydi; EDR qurilmadagi xatti-harakatni kuzatadi va tergov imkonini beradi
- Antivirus faqat Linux uchun
- Farqi yo'q
! EDR jarayonlar daraxti, ulanishlar va o'zgarishlarni ko'radi — qonuniy dasturlar orqali qilingan hujumni ham payqaydi.

? SIEM ning asosiy vazifasi nima?
- Viruslarni o'chirish
+ Turli manbalardan jurnallarni yig'ib, bog'lab, shubhali hodisalar haqida ogohlantirish
- Parollarni saqlash
- Trafikni shifrlash
! Alohida oddiy ko'rinadigan hodisalar birgalikda hujumni ko'rsatishi mumkin — buni korrelyatsiya deyiladi.

? “Dwell time” nima?
- Serverning ishlash vaqti
+ Hujumchi tizimga kirgan paytdan uni payqashgacha o'tgan vaqt
- Parolning amal qilish muddati
- Zaxira nusxa olish vaqti
! Bu vaqt qancha qisqa bo'lsa, zarar shuncha kam. Uni qisqartirish — aniqlash qatlamining vazifasi.

? Insidentga javobning qaysi bosqichi hodisadan OLDIN bajariladi?
+ Tayyorgarlik
- Cheklash
- Yo'q qilish
- Tiklash
! Reja, rollar, aloqa ro'yxati va mashqlar oldindan tayyorlanadi — hodisa paytida ularni tuzishga vaqt bo'lmaydi.

? Zararlangan kompyuter aniqlandi. Birinchi navbatda nima qilish to'g'ri?
- Darhol o'chirib, diskni formatlash
+ Tarqalishni cheklash (tarmoqdan ajratish) va dalilni saqlash
- Hech narsa qilmay kuzatish
- Antivirusni qayta o'rnatish
! Avval cheklash, keyin tozalash. Darhol o'chirish xotiradagi dalillarni yo'q qiladi.

? RPO nimani bildiradi?
- Qancha vaqt ishlamasdan tura olamiz
+ Qancha hajmdagi (vaqt bo'yicha) ma'lumotni yo'qotishga chidaymiz
- Zaxira nusxa narxi
- Parol uzunligi
! RPO oxirgi zaxiradan beri o'tgan vaqt bilan bog'liq: kunlik zaxira — eng yomon holatda bir kunlik yo'qotish. RTO esa tiklanish vaqti.

? Tashkilot yangilanmagan serverlar va MFA siz administrator hisoblari bilan ishlaydi, lekin qimmat xavfsizlik tizimi sotib olmoqchi. To'g'ri maslahat qaysi?
- Sotib olish — u hammasini hal qiladi
+ Avval asoslarni tuzatish: yangilash, MFA, eng kam imtiyoz, zaxira
- Hech narsa qilmaslik
- Ikkita tizim sotib olish
! Asosiy gigiyena ommaviy hujumlarning katta qismini to'xtatadi va hech bir vosita uning o'rnini bosmaydi.

? Xavfsizlik qoidalari juda noqulay bo'lsa, odatda nima bo'ladi?
- Xodimlar ularga qat'iy rioya qiladi
+ Xodimlar ularni aylanib o'tadi — va himoya faqat qog'ozda qoladi
- Hujumlar to'xtaydi
- Hech narsa o'zgarmaydi
! Aylanib o'tilgan himoya yolg'on xotirjamlik beradi. To'g'ri yo'l — eng oson yo'l bo'lishi kerak.

? NIST CSF funksiyalaridan qaysi biri “sodir bo'lganini qanday bilamiz?” savoliga javob beradi?
- Protect
+ Detect
- Recover
- Identify
! Detect — monitoring, jurnallar, SIEM, EDR. Protect — oldini olish, Recover — tiklash.

? Ma'lumot qatlamidagi “minimallashtirish” nimani anglatadi?
- Fayllarni siqish
+ Kerak bo'lmagan ma'lumotni umuman yig'maslik va saqlamaslik
- Parolni qisqartirish
- Jurnallarni o'chirish
! Saqlanmagan ma'lumot sizib chiqmaydi — bu eng ishonchli himoya.
:::

:::cards
Defense in depth nima? :: Bir-birini to'ldiruvchi bir necha mustaqil himoya qatlami — bitta xato halokatga olib kelmasligi uchun.
Himoya qatlamlari (tashqaridan ichkariga)? :: Siyosat va odamlar → jismoniy → tarmoq chegarasi → ichki tarmoq → qurilma → ilova → ma'lumot.
Antivirus va EDR farqi? :: Antivirus — ma'lum fayllarni taniydi; EDR — qurilmadagi xatti-harakatni kuzatadi va javob beradi.
SIEM nima qiladi? :: Barcha manbalardan jurnallarni yig'adi, bog'laydi (korrelyatsiya) va ogohlantiradi.
NIST CSF funksiyalari? :: Govern, Identify, Protect, Detect, Respond, Recover.
Insidentga javob bosqichlari? :: Tayyorgarlik → aniqlash va tahlil → cheklash → yo'q qilish → tiklash → saboqlar.
Dwell time? :: Hujumchi kirgan paytdan uni payqashgacha o'tgan vaqt.
RPO va RTO? :: RPO — qancha ma'lumot yo'qotishga chidaymiz; RTO — qancha vaqt ishlamasdan tura olamiz.
Hardening nima? :: Tizimni mustahkamlash: keraksizni o'chirish, standart parollarni almashtirish, yangilash, eng kam imtiyoz.
Asosiy gigiyenaning eng muhim bandlari? :: Inventarizatsiya, yangilash, MFA, alohida parollar, eng kam imtiyoz, sinab ko'rilgan zaxira.
Har bir himoya vositasi haqida asosiy savol? :: U nimani ko'rmaydi? — va shu ko'r nuqtani qaysi qatlam yopadi?
:::
