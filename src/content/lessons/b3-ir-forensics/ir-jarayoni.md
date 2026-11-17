Juma kuni, soat 23:40. Navbatchi analitikka buxgalteriyadan qo'ng'iroq: "Kompyuterimdagi barcha fayllar nomi o'zgarib qolgan, ekranda 'fayllaringiz shifrlandi' degan yozuv." Besh daqiqadan keyin yana ikki qo'ng'iroq. Keyin fayl serveri ham.

Hozir nima qilish kerak? Kimga qo'ng'iroq qilish? Kompyuterlarni o'chirish kerakmi? Internetni uzishmi? Hujumchilar bilan gaplashishmi? Kim qaror qabul qiladi — va kim mijozlarga xabar beradi?

Bu savollarga **insident paytida** javob qidirgan kompaniya soatlarini yo'qotadi — ransomware esa har daqiqada yangi qurilmalarga tarqaladi. Javoblar **oldindan** yozilgan bo'lishi kerak. Bu — [[incident-response|incident response]] (IR) jarayoni.

## Insident nima — va nima emas

SOC tuzilmasi darsidan eslaysiz: **event → alert → incident**. Insident — xavfsizlik siyosatining **haqiqiy** buzilishi yoki uning bevosita tahdidi:

| Hodisa | Insidentmi? |
|---|---|
| Firewall internetdan 10 000 ta skanerlashni blokladi | Yo'q — oddiy fon |
| Xodim phishing xatini oldi, lekin bosmadi va xabar berdi | Yo'q — muvaffaqiyatli himoya (lekin kampaniya kuzatiladi) |
| Xodim soxta sahifaga parolini kiritdi | **Ha** |
| Kompyuterda C2 serveriga beaconing aniqlandi | **Ha** |
| Mijozlar ma'lumotlar bazasi internetga ochiq qolib ketgan | **Ha** — hujum bo'lmagan bo'lsa ham |
| Fayllar shifrlanmoqda | **Ha — kritik** |

### Jiddiylik darajalari

Har bir tashkilot o'z shkalasini belgilaydi, lekin odatda shunday:

| Daraja | Misol | Javob |
|---|---|---|
| **Past** | Bitta kompyuterda zararli dastur, tez bloklandi | SOC navbatchisi hal qiladi |
| **O'rta** | Bitta hisob buzilgan, chegaralangan ta'sir | IR jamoasi, ish vaqtida |
| **Yuqori** | Bir nechta tizim, ma'lumot chiqib ketishi ehtimoli | IR jamoasi darhol, rahbariyatga xabar |
| **Kritik** | Ransomware tarqalmoqda, asosiy tizimlar to'xtagan | Barcha resurslar, 24/7, rahbariyat, huquqshunoslar |

Darajani ikki savol belgilaydi (SOC tuzilmasi darsidagi kabi): **ta'sir qanchalik katta** va **qanchalik tez tarqalmoqda**.

## IR modellari: NIST va SANS

Ikki eng mashhur model deyarli bir xil narsani turlicha guruhlaydi.

**NIST SP 800-61** (AQSh standartlar instituti) — to'rt bosqich:

```
 ┌──────────────┐   ┌──────────────────────┐   ┌──────────────────────────────┐   ┌────────────────┐
 │ 1. Tayyorgar-│──►│ 2. Aniqlash va tahlil│──►│ 3. Cheklash, yo'q qilish va  │──►│ 4. Insidentdan │
 │    lik       │   │                      │◄──│    tiklash                   │   │    keyingi ish │
 └──────────────┘   └──────────────────────┘   └──────────────────────────────┘   └───────┬────────┘
        ▲                                                                                  │
        └──────────────────────────────── saboqlar ────────────────────────────────────────┘
```

**SANS** — olti bosqich, qisqartmasi **PICERL**:

| SANS | NIST'dagi o'rni |
|---|---|
| **P**reparation — tayyorgarlik | 1 |
| **I**dentification — aniqlash | 2 |
| **C**ontainment — cheklash | 3 |
| **E**radication — yo'q qilish | 3 |
| **R**ecovery — tiklash | 3 |
| **L**essons learned — saboqlar | 4 |

NIST'ning yangi tahriri (Rev. 3) IR'ni umumiy kiberxavfsizlik boshqaruvi (NIST CSF 2.0) bilan bog'laydi, lekin bosqichlar mantig'i o'zgarmagan. Intervyuda ikkala modelni ham aytib bera olishingiz kerak.

E'tibor bering, NIST diagrammasidagi teskari o'q: cheklash paytida yangi narsa topilsa (masalan, yana bir buzilgan server), **tahlilga qaytasiz**. IR — chiziqli emas, aylanma jarayon.

## 1. Tayyorgarlik — eng muhim bosqich

Insident paytidagi har bir muvaffaqiyat aslida tayyorgarlikda qo'lga kiritiladi.

| Nima | Nega |
|---|---|
| **IR rejasi** | Kim, nima, qachon — rasman tasdiqlangan hujjat |
| **Playbook'lar** | Insident turlari bo'yicha qadam-baqadam yo'riqnomalar: ransomware, phishing, hisob buzilishi |
| **Kontaktlar ro'yxati** | IR jamoasi, rahbariyat, huquqshunos, PR, tashqi IR kompaniyasi, sug'urta, provayder — **qog'ozda ham** |
| **Zaxira aloqa kanali** | Pochta va messenjer buzilgan bo'lishi mumkin — hujumchi sizning rejalaringizni o'qiydi |
| **Log va telemetriya** | SIEM, EDR, yetarli saqlash muddati (b1 va b2 bosqichlari) |
| **Zaxira nusxalar** | **Oflayn** yoki o'zgartirib bo'lmaydigan — va tiklash muntazam sinab ko'rilgan |
| **Aktivlar ro'yxati** | Qaysi tizim muhim, kimga tegishli, nimaga bog'liq |
| **Vositalar** | Forensika vositalari, toza noutbuk, tashqi disklar — oldindan tayyor |
| **Mashqlar** | **Tabletop** — stol atrofida "agar shunday bo'lsa-chi?" stsenariysini o'ynash |

Tabletop mashqlari ayniqsa qimmatli: ular hech qanday texnik xarajatsiz rejadagi bo'shliqlarni ko'rsatadi. "Ransomware fayl serverini shifrladi. Kim birinchi qo'ng'iroq qiladi?" — va birdan ma'lum bo'ladi: huquqshunosning telefon raqami hech kimda yo'q, zaxira nusxalar esa xuddi shu domen hisobi bilan boshqariladi.

:::key
**Insident paytida o'rganishga vaqt yo'q.** Har bir kompaniyada ertami-kechmi jiddiy insident bo'ladi. Farq — unga qanday kirishda: oldindan yozilgan reja, sinalgan zaxira nusxalar va kim nima qilishini biladigan jamoa bilan — yoki 23:40 da kimning raqamini qidirib. Tayyorgarlik — IR'ning eng zerikarli va eng qimmatli qismi.
:::

## 2. Aniqlash va tahlil

Bu bosqichda b1 va b2 bosqichlarida o'rganganlaringizning hammasi ishlaydi: triage, loglar, SIEM so'rovlari, EDR. Asosiy savollar:

| Savol | Nega muhim |
|---|---|
| Haqiqatan insidentmi? | Triage darsi — false positive'lar uchun IR jamoasini uyg'otmaslik |
| **Qamrov** (scope) qanday? | Nechta qurilma, hisob, tizim? Faqat ko'ringan qismmi yoki ko'proq? |
| **Boshlang'ich nuqta** (patient zero) qayer? | Qanday kirildi — buni bilmasangiz, yopib bo'lmaydi |
| Hujumchi hali ham ichkaridami? | Faol insident va tugagan insident — boshqa-boshqa javob |
| Qanday ma'lumot xavf ostida? | Shaxsiy ma'lumot — qonuniy majburiyatlar |

Bu bosqichda **hujjatlashtirish** boshlanadi va hech qachon to'xtamaydi: har bir topilma, har bir qaror, har bir harakat — vaqti bilan. Keyinroq "nega serverni soat 02:00 da o'chirdik?" degan savolga javob shu yozuvlarda bo'ladi.

Qamrovni aniqlashda tahdid razvedkasi darsidagi usul ishlaydi: bitta qurilmada topilgan IOC'larni (xesh, domen, IP) **butun muhitda** qidiring — EDR va SIEM orqali. Bitta topilgan qurilma — odatda aysbergning uchi.

## 3. Cheklash, yo'q qilish, tiklash

### Cheklash (containment)

[[containment|Cheklash]] maqsadi — **zararni to'xtatish**, muammoni hal qilish emas. Ikki turi bor:

| Tur | Misol |
|---|---|
| **Qisqa muddatli** — darhol | Qurilmani EDR orqali tarmoqdan ajratish; buzilgan hisobni bloklash; C2 domenini DNS'da bloklash; firewall'da IP'ni to'sish |
| **Uzoq muddatli** — yo'q qilishgacha | Tarmoq segmentlarini ajratish; vaqtinchalik qo'shimcha monitoring; muhim tizimlarni toza nusxaga ko'chirish |

Cheklashdagi eng qiyin qaror — **qachon**. Juda erta harakat qilsangiz, hujumchi sezadi va boshqa yo'llarini ishga soladi yoki izlarini o'chiradi. Juda kech — zarar ortadi. Ransomware kabi tez tarqaladigan hujumda javob aniq — darhol. Sekin, yashirin hujumda esa ba'zan avval butun qamrovni aniqlab, keyin **hammasini bir vaqtda** cheklash yaxshiroq.

EDR darsidagi qoida: **avval dalil, keyin chora.** Qurilmani **o'chirmang** — ajrating. Elektr o'chganda xotiradagi dalillar (jarayonlar, tarmoq ulanishlari, shifrlash kalitlari) yo'qoladi. Keyingi darsda batafsil.

### Yo'q qilish (eradication)

Hujumchining barcha izlarini olib tashlash:

- Zararli fayllar va **persistence**: xizmatlar, vazifalar, Run kalitlari, `authorized_keys`, cron (b1 bosqichidagi barcha joylar).
- Hujumchi yaratgan hisoblar.
- Buzilgan hisoblarning parollarini almashtirish va faol seanslarni bekor qilish.
- Kirish yo'lini yopish: zaiflikni yamash, sozlamani tuzatish, MFA'ni yoqish.

Ko'pincha eng ishonchli yo'l — buzilgan tizimni "tozalash" emas, **noldan qayta o'rnatish**. Bitta o'tkazib yuborilgan persistence mexanizmi — va hujumchi bir haftadan keyin qaytadi.

### Tiklash (recovery)

Tizimlarni xavfsiz ishga qaytarish:

- **Toza** zaxira nusxadan tiklash — va zaxira nusxaning o'zi buzilmaganini tekshirish (hujumchi u yerda ham persistence qoldirgan bo'lishi mumkin).
- Tizimlarni bosqichma-bosqich, eng muhimlaridan boshlab yoqish.
- **Kuchaytirilgan monitoring** — keyingi haftalar va oylarda xuddi shu IOC va TTP'larni kuzatish.

## 4. Insidentdan keyingi ish

Insident yopilgandan 1–2 hafta ichida **saboqlar yig'ilishi** (lessons learned, post-mortem):

- Nima bo'ldi? (vaqt chizig'i — shu bosqichning oxirgi darsi)
- Nima yaxshi ishladi?
- Nima ishlamadi yoki sekin bo'ldi?
- Qanday qilib tezroq aniqlash mumkin edi? — **yangi aniqlash qoidalari** (b2 bosqichi)
- Qanday qilib umuman oldini olish mumkin edi?
- Reja va playbook'larga qanday o'zgartirishlar kerak?

Muhim tamoyil — **aybdorni qidirmaslik** (blameless). Phishing darsidagi "bosib qo'ydim" deb tez xabar bergan xodimni eslang. Yig'ilish odamlarni emas, **jarayon va tizimlarni** yaxshilash uchun. Aks holda keyingi safar hech kim xatosini tan olmaydi.

## IR jamoasi — rollar

| Rol | Vazifasi |
|---|---|
| **Incident commander** | Umumiy rahbarlik, qarorlar, ustuvorliklar — o'zi texnik ish qilmaydi |
| **Texnik rahbar** | Tahlil va texnik choralarni muvofiqlashtirish |
| **Tahlilchilar / forensika** | Dalil yig'ish, tahlil, qamrovni aniqlash |
| **Kotib** (scribe) | Barcha qarorlar va harakatlarni vaqti bilan yozib borish |
| **Aloqa** | Rahbariyat, xodimlar, mijozlar, ommaviy axborot vositalari |
| **Huquqshunos** | Qonuniy majburiyatlar, regulyatorlarga xabar, dalillarning qonuniyligi |
| **Biznes egalari** | Qaysi tizim qachon ishlashi kerak — biznes nuqtai nazaridan |

Kichik kompaniyada bir odam bir nechta rolni bajaradi — lekin **incident commander** va **kotib** doim aniq belgilangan bo'lishi kerak. Ko'p kompaniyalar tashqi IR kompaniyasi bilan oldindan shartnoma tuzadi (retainer) — insident paytida shartnoma muhokamasiga vaqt bo'lmaydi.

## Ransomware playbook

Dars boshidagi stsenariy uchun soddalashtirilgan playbook. Haqiqiy playbook kompaniyaga moslashtiriladi va har bir qadamda **kim** javobgarligi yoziladi.

```
DARHOL (birinchi soat)
 □ Incident commander tayinlash; zaxira aloqa kanalini ochish (pochta buzilgan bo'lishi mumkin)
 □ Zararlangan qurilmalarni TARMOQDAN AJRATISH (EDR, kabel, Wi-Fi) — O'CHIRMASLIK
 □ Zaxira nusxalarni himoyalash: zaxira tizimini tarmoqdan ajratish, kirishni cheklash
 □ Shubhali hisoblarni bloklash; administrator hisoblari faoliyatini tekshirish
 □ Shifrlash xabari, fayl nomlari, kengaytmalar — suratga olish (dalil)
 □ Rahbariyat, huquqshunos, sug'urtaga xabar

TAHLIL (birinchi kun)
 □ Qamrov: qaysi tizimlar shifrlangan, qaysilari xavf ostida?
 □ Patient zero va kirish yo'li: phishing? ochiq RDP? VPN zaifligi?
 □ Ma'lumot chiqib ketganmi? (ko'p guruhlar avval ma'lumot o'g'irlaydi, keyin shifrlaydi)
 □ Ransomware turini aniqlash — ba'zilari uchun bepul dekriptorlar mavjud (No More Ransom loyihasi)
 □ Xotira va disk nusxalari (keyingi darslar)

QARORLAR (rahbariyat + huquqshunos)
 □ Huquqni muhofaza qilish organlariga va regulyatorlarga xabar berish
 □ Mijozlar va xodimlar bilan aloqa
 □ To'lov masalasi — bu texnik emas, biznes va huquqiy qaror; to'lov ma'lumotlar qaytishini
   ham, qayta hujum bo'lmasligini ham kafolatlamaydi va ba'zi holatlarda qonun bilan cheklangan

YO'Q QILISH VA TIKLASH
 □ Kirish yo'lini yopish; barcha persistence'ni olib tashlash
 □ Barcha imtiyozli hisoblar parollarini almashtirish (domen buzilgan bo'lsa — butun domen)
 □ Toza zaxira nusxalardan, eng muhim tizimlardan boshlab tiklash
 □ Kuchaytirilgan monitoring

KEYIN
 □ Saboqlar yig'ilishi; aniqlash qoidalari va playbook'ni yangilash
```

:::warn
**Hujumchi sizni kuzatayotgan bo'lishi mumkin.** Jiddiy insidentda hujumchi ko'pincha pochta tizimiga, messenjerga, hatto SIEM yoki EDR konsoliga kirgan bo'ladi. IR jamoasi buzilgan pochta orqali "ertaga soat 9 da barcha parollarni almashtiramiz" deb yozsa — hujumchi bunga tayyorlanadi. Shuning uchun tayyorgarlikda **zaxira aloqa kanali** (alohida messenjer, shaxsiy telefonlar, kerak bo'lsa — yuzma-yuz) oldindan belgilanadi.
:::

## IR nimani qilmaydi

- **Insidentni oldini olmaydi** — u oqibatlarni kamaytiradi; oldini olish — himoya qatlamlari ishi.
- **Faqat texnik ish emas** — eng qiyin qarorlar (to'lov, xabar berish, tizimlarni to'xtatish) biznes va huquqiy qarorlar.
- **Hujjatlarsiz ishlamaydi** — yozilmagan reja insident paytida mavjud emas.
- **Bir marta tuzilib, abadiy ishlamaydi** — xodimlar, tizimlar va tahdidlar o'zgaradi; reja va kontaktlar muntazam yangilanadi va mashq qilinadi.

:::try
**1. Tasniflang.** Quyidagilardan qaysilari insident va qanday darajada?
- (a) Xodimning noutbuki taksida qolib ketgan; disk shifrlangan, MFA yoqilgan.
- (b) Veb-serverda noma'lum PHP fayl topildi, u buyruqlarni bajaradi.
- (c) Kecha soat 03:00 da domen administratori hisobi tashqi IP'dan VPN orqali kirgan; administrator o'sha paytda uxlagan.

**2. Tabletop.** Do'stingiz yoki hamkasbingiz bilan 30 daqiqalik mashq o'tkazing: "Dushanba ertalab fayl serveridagi barcha fayllar shifrlangan." Birinchi soatdagi har bir qadamni ayting: kim, nima, qaysi vosita bilan. Qayerda "bilmayman" dedingiz? Bu — rejadagi bo'shliq.

**3. Playbook.** Phishing tahlili darsidagi stsenariy uchun (xodim soxta sahifaga parolini kiritdi) PICERL bosqichlari bo'yicha qisqa playbook yozing.

**4. O'qing.** NIST SP 800-61 hujjatining insident javob sikli tasvirlangan bo'limini o'qing.

*Javoblar: 1a — past daraja yoki insident emas: disk shifrlangan, MFA bor; lekin qayd etiladi va masofadan bloklanadi. 1b — yuqori: veb-server buzilgan (web shell), qamrovni darhol aniqlash kerak. 1c — kritik: eng muhim hisob buzilgan bo'lishi mumkin — darhol bloklash va keng qamrovli tergov. 3 — aniqlash (kim kiritdi — proxy POST), cheklash (parolni almashtirish, seanslarni bekor qilish, MFA tekshiruvi), yo'q qilish (hisobdagi pochta qoidalari va qurilmalar), tiklash (monitoring), saboqlar (filtr va trening).*
:::

## Xulosa

- **Insident** — xavfsizlikning haqiqiy buzilishi yoki bevosita tahdidi; jiddiylik — ta'sir va tarqalish tezligiga qarab.
- **NIST**: tayyorgarlik → aniqlash va tahlil → cheklash, yo'q qilish, tiklash → insidentdan keyingi ish. **SANS PICERL**: Preparation, Identification, Containment, Eradication, Recovery, Lessons learned.
- **Tayyorgarlik** — eng muhim: reja, playbook'lar, kontaktlar, zaxira aloqa kanali, oflayn zaxira nusxalar, tabletop mashqlari.
- Tahlil: qamrov, patient zero, hujumchi hali ichkaridami; hammasini vaqti bilan yozish.
- **Cheklash** zararni to'xtatadi: qurilmani **ajratish, o'chirmaslik**; qachon cheklash — strategik qaror.
- Yo'q qilish — barcha persistence va kirish yo'lini yopish; ko'pincha qayta o'rnatish ishonchliroq.
- Saboqlar yig'ilishi — **aybdorni qidirmasdan**, jarayonni yaxshilash uchun.
- Rollar: incident commander, texnik rahbar, tahlilchilar, kotib, aloqa, huquqshunos.

:::quiz
? NIST SP 800-61 modelidagi to'rt bosqich qaysi tartibda?
+ Tayyorgarlik → Aniqlash va tahlil → Cheklash, yo'q qilish va tiklash → Insidentdan keyingi ish
- Aniqlash → Tayyorgarlik → Tiklash → Cheklash
- Cheklash → Aniqlash → Tayyorgarlik → Saboqlar
- Tiklash → Aniqlash → Cheklash → Tayyorgarlik
! SANS esa xuddi shuni olti bosqichga bo'ladi: PICERL.

? SANS PICERL qisqartmasidagi “C” va “E” nimani bildiradi?
- Communication va Evaluation
+ Containment (cheklash) va Eradication (yo'q qilish)
- Collection va Encryption
- Control va Escalation
! Preparation, Identification, Containment, Eradication, Recovery, Lessons learned.

? IR'ning qaysi bosqichi eng muhim hisoblanadi va nega?
- Tiklash — chunki tizimlar ishga tushadi
+ Tayyorgarlik — insident paytidagi tezlik va to'g'ri qarorlar oldindan tayyorlangan reja, vositalar va mashqlarga bog'liq
- Saboqlar — chunki u oxirgi
- Hech biri muhim emas
! Insident paytida o'rganish va kontakt qidirishga vaqt bo'lmaydi.

? Ransomware tarqalmoqda. Zararlangan kompyuter bilan nima qilish kerak?
- Darhol elektrdan o'chirish
+ Tarmoqdan ajratish (EDR, kabel, Wi-Fi), lekin yoqiq qoldirish
- Hech narsa qilmaslik
- Qayta yuklash
! Ajratish tarqalishni to'xtatadi; o'chirish esa xotiradagi dalillarni (ba'zan shifrlash kalitlarini ham) yo'qotadi.

? Nega jiddiy insidentda zaxira aloqa kanali kerak?
- U arzonroq
+ Hujumchi korporativ pochta va messenjerga kirgan bo'lishi va IR rejalarini o'qishi mumkin
- Qonun talab qiladi
- Korporativ pochta sekin
! Hujumchi rejalaringizni bilsa, ularga oldindan tayyorlanadi.

? Yashirin, sekin hujumda nega ba'zan cheklashni darhol emas, qamrov aniqlangandan keyin bir vaqtda qilish yaxshiroq?
- Chunki hujumchi zarar yetkazmaydi
+ Erta qisman harakat hujumchini ogohlantiradi — u boshqa kirish yo'llarini ishga soladi yoki izlarini o'chiradi
- Chunki cheklash qimmat
- Bu hech qachon yaxshi emas
! Ransomware kabi tez tarqaladigan hujumda esa javob — darhol cheklash.

? Yo'q qilish bosqichida ko'pincha eng ishonchli yo'l qaysi?
- Faqat zararli faylni o'chirish
+ Buzilgan tizimni noldan qayta o'rnatish va kirish yo'lini yopish
- Antivirus bilan bir marta skanerlash
- Kompyuterni qayta yuklash
! Bitta o'tkazib yuborilgan persistence mexanizmi hujumchining qaytishiga imkon beradi.

? Saboqlar yig'ilishining asosiy tamoyili qaysi?
- Aybdorni topib, jazolash
+ Aybdorni qidirmasdan (blameless) jarayon va tizimlarni yaxshilash
- Faqat texnik jamoa ishtirok etadi
- Faqat rahbariyat uchun hisobot
! Jazolash madaniyati odamlarni xatolarini yashirishga o'rgatadi.

? Incident commander'ning asosiy vazifasi nima?
- Barcha texnik tahlilni o'zi bajarish
+ Umumiy rahbarlik, ustuvorliklar va qarorlarni muvofiqlashtirish
- Faqat jurnalistlar bilan gaplashish
- Faqat zaxira nusxalarni tiklash
! Commander texnik detallarga botib qolmasdan butun manzarani ko'rishi kerak.

? Ransomware to'lovi masalasi haqida qaysi gap to'g'ri?
- To'lov har doim ma'lumotlarni qaytaradi
+ Bu biznes va huquqiy qaror; to'lov ma'lumotlar qaytishini ham, qayta hujum bo'lmasligini ham kafolatlamaydi
- Texnik analitik o'zi hal qiladi
- To'lov har doim qonuniy
! Qaror rahbariyat va huquqshunoslar bilan, qonunchilikni hisobga olib qabul qilinadi.

? Tabletop mashqi nima?
- Haqiqiy hujumni amalga oshirish
+ Stol atrofida insident stsenariysini muhokama qilib, rejadagi bo'shliqlarni topish
- Serverlarni almashtirish
- Antivirus sinovi
! Texnik xarajatsiz, lekin rejadagi zaif joylarni juda yaxshi ko'rsatadi.
:::

:::cards
Insident nima? :: Xavfsizlik siyosatining haqiqiy buzilishi yoki uning bevosita tahdidi (event → alert → incident).
NIST IR bosqichlari? :: Tayyorgarlik; aniqlash va tahlil; cheklash, yo'q qilish va tiklash; insidentdan keyingi ish.
SANS PICERL? :: Preparation, Identification, Containment, Eradication, Recovery, Lessons learned.
Tayyorgarlikda nima bo'ladi? :: IR rejasi, playbook'lar, kontaktlar (qog'ozda ham), zaxira aloqa kanali, oflayn zaxira nusxalar, vositalar, tabletop mashqlari.
Tahlil bosqichidagi asosiy savollar? :: Haqiqiy insidentmi, qamrov, patient zero va kirish yo'li, hujumchi hali ichkaridami, qanday ma'lumot xavf ostida.
Cheklash maqsadi? :: Zararni to'xtatish: qurilmani ajratish, hisobni bloklash, C2'ni bloklash. Muammoni hal qilish emas.
Nega qurilmani o'chirmaslik kerak? :: Xotiradagi dalillar (jarayonlar, ulanishlar, kalitlar) yo'qoladi. To'g'ri — tarmoqdan ajratish.
Yo'q qilish nimani o'z ichiga oladi? :: Zararli fayllar va persistence'ni olib tashlash, hujumchi hisoblari, parollarni almashtirish, kirish yo'lini yopish.
Tiklash qoidasi? :: Toza va tekshirilgan zaxiradan, muhim tizimlardan boshlab, keyin kuchaytirilgan monitoring.
Saboqlar yig'ilishi? :: 1–2 hafta ichida, aybdorni qidirmasdan: nima ishladi, nima ishlamadi, yangi qoidalar va reja o'zgarishlari.
IR jamoasi rollari? :: Incident commander, texnik rahbar, tahlilchilar, kotib, aloqa, huquqshunos, biznes egalari.
Ransomware'da birinchi qadamlar? :: Commander va zaxira kanal, qurilmalarni ajratish (o'chirmasdan), zaxiralarni himoyalash, hisoblarni bloklash, rahbariyat va huquqshunosga xabar.
:::
