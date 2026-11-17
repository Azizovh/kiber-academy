Kichik onlayn do'kon mijozlar buyurtmalarini bulutdagi fayl omboriga saqlardi. Bir kuni jurnalist do'konga xat yozadi: "Sizning omboringiz internetga ochiq, unda 40 000 mijozning ismi, telefoni va manzili bor." Do'kon egasi hayron: "Qanday qilib? Biz katta, mashhur bulut provayderidan foydalanamiz. Ularda xavfsizlik bo'limi, sertifikatlar, qo'riqchilar bor. Bu **ularning** aybi emasmi?"

Javob — yo'q. Provayderning ma'lumot markazi buzilmagan, uning dasturida xato yo'q. Omborni ochiq qilib qo'ygan — do'konning o'z dasturchisi, bitta sozlama bilan. Bulutda kim nimaga javob berishini bilmaslik — bulutdagi ma'lumot sizib chiqishlarining eng keng tarqalgan sababi.

Bu darsda bulutning o'zi nima ekanini, uning qanday turlari borligini va eng muhimi — **xavfsizlik uchun javobgarlik qanday bo'linishini** o'rganamiz. Oldingi darsda serverni qo'lda sozladingiz; endi o'sha serverni kimdir siz uchun ushlab turganda nima o'zgarishini ko'ramiz.

## Bulut nima

Eng sodda ta'rif: **boshqa birovning kompyuterlari, siz ularni internet orqali, ijaraga, kerak bo'lganda va kerak bo'lgancha ishlatasiz.** Lekin "birovning serverida sayt saqlash" (hosting) 1990-yillardan beri bor edi. [[cloud|Bulut]]ni undan ajratadigan narsalar — NIST tomonidan berilgan beshta xususiyat:

| Xususiyat | Ma'nosi | Misol |
|---|---|---|
| On-demand self-service | Odam bilan gaplashmasdan, o'zingiz resurs olasiz | Konsolda tugma — 40 soniyada server |
| Broad network access | Hamma narsa tarmoq orqali, standart usullar bilan | Konsol, API, CLI |
| Resource pooling | Provayderning ulkan resurslari ko'p mijozlar orasida bo'linadi | Sizning serveringiz begona kompaniya serveri bilan bitta fizik mashinada |
| Rapid elasticity | Tez kengayish va qisqarish | Kechqurun 10 ta server, tunda 2 ta |
| Measured service | Ishlatganingizcha to'laysiz | Soat, gigabayt, so'rov bo'yicha hisob |

Har bir xususiyatning xavfsizlik tomoni bor — buni darsning oxirida jamlaymiz.

## Xizmat modellari: IaaS, PaaS, SaaS

Bulut provayderi sizga turli "qavatlarni" beradi. Qancha ko'p qavatni provayder boshqarsa, sizga shuncha kam ish — va shuncha kam nazorat.

```
                  On-premise   IaaS       PaaS       SaaS
                  (o'zingiz)
 Ma'lumot          SIZ         SIZ        SIZ        SIZ
 Foydalanuvchilar  SIZ         SIZ        SIZ        SIZ
 Ilova             SIZ         SIZ        SIZ        provayder
 Runtime / OS      SIZ         SIZ        provayder  provayder
 Virtualizatsiya   SIZ         provayder  provayder  provayder
 Server, tarmoq    SIZ         provayder  provayder  provayder
 Bino, quvvat      SIZ         provayder  provayder  provayder
```

| Model | Siz olasiz | Siz boshqarasiz | Misollar |
|---|---|---|---|
| [[iaas|IaaS]] | Virtual server, disk, tarmoq | OS, yangilanishlar, firewall, ilova, ma'lumot | AWS EC2, Azure VM, Google Compute Engine |
| [[paas|PaaS]] | Tayyor platforma — kodni yuklaysiz | Ilova kodi, sozlamalari, ma'lumot | AWS Elastic Beanstalk, Azure App Service, Heroku, boshqariladigan bazalar (RDS) |
| [[saas|SaaS]] | Tayyor ilova | Foydalanuvchilar, ruxsatlar, ma'lumot, sozlamalar | Gmail, Microsoft 365, Slack, Jira |

Ikki qo'shimcha model tez-tez uchraydi:

- **Serverless / FaaS** (Function as a Service) — siz faqat funksiya yozasiz, u so'rov kelganda ishga tushadi. Server haqida umuman o'ylamaysiz. Misol: AWS Lambda.
- **Konteyner platformalari** — siz konteyner beradi, provayder uni ishlatadi (AWS ECS/EKS, Google Cloud Run). c3 bosqichida batafsil.

Oldingi darsdagi `qaydnoma-web-01` — IaaS. U yerda yadro yangilash, SSH, firewall — hammasi siz edingiz. Agar Qaydnoma'ni PaaS'ga joylasak, OS va nginx'ni provayder yangilaydi — lekin ilovadagi IDOR zaifligi (a2) baribir **sizniki** bo'lib qoladi.

## Umumiy javobgarlik modeli

Bulut xavfsizligining eng muhim tushunchasi — [[shared-responsibility|shared responsibility]] (umumiy javobgarlik). AWS uni qisqa ifodalaydi:

- Provayder — **bulutning xavfsizligi** uchun (security **of** the cloud): binolar, serverlar, tarmoq uskunalari, virtualizatsiya, o'z xizmatlarining dasturi.
- Mijoz — **bulut ichidagi xavfsizlik** uchun (security **in** the cloud): nima qurganingiz va qanday sozlaganingiz.

| Kim uchun | IaaS (EC2) | PaaS (RDS) | SaaS (Microsoft 365) |
|---|---|---|---|
| Ma'lumot va uning tasnifi | Mijoz | Mijoz | Mijoz |
| Hisoblar, MFA, ruxsatlar | Mijoz | Mijoz | Mijoz |
| Tarmoq sozlamalari (kim ulana oladi) | Mijoz | Mijoz | Asosan provayder |
| Ilova kodi | Mijoz | Mijoz | Provayder |
| OS yangilanishlari | Mijoz | Provayder | Provayder |
| Fizik xavfsizlik, uskunalar | Provayder | Provayder | Provayder |

Jadvalning yuqori uchta qatoriga e'tibor bering: **ma'lumot, identifikatsiya va kirish nazorati — har doim sizda**, model qanday bo'lishidan qat'i nazar. Dars boshidagi do'kon aynan shu qatorlardan birida xato qildi.

:::key
"Bulutda — demak xavfsiz" degan fikr — eng xavfli noto'g'ri tushuncha. Provayder sizga qulf beradi, lekin eshikni qulflash — sizning ishingiz. Gartner va boshqa tadqiqotchilar yillar davomida bir xil xulosaga keladi: bulutdagi buzilishlarning aksariyati provayderning emas, **mijozning** xatosi (noto'g'ri sozlash, o'g'irlangan kalit).
:::

Javobgarlik modeli amaliy savollarga javob beradi:

| Vaziyat | Kimning muammosi |
|---|---|
| Ma'lumot markazida qattiq disk buzildi | Provayder |
| S3 bucket internetga ochiq qoldi | Mijoz |
| EC2 serverda 2 yillik yangilanmagan OS | Mijoz |
| RDS bazasi dvigatelida zaiflik topildi | Provayder yangilanishni chiqaradi, siz uni o'rnatish vaqtini belgilaysiz |
| Xodimning Microsoft 365 paroli fishing orqali o'g'irlandi | Mijoz (MFA, o'qitish) |
| Gipervizordagi zaiflik orqali bir mijoz boshqasining xotirasiga yetdi | Provayder |

## Joylashtirish modellari

| Model | Ta'rif | Qachon |
|---|---|---|
| **Public cloud** | Provayder resurslari ko'p mijozlarga | Ko'p kompaniyalar uchun standart |
| **Private cloud** | Faqat bitta tashkilot uchun bulut (o'z ma'lumot markazida yoki ajratilgan) | Qat'iy talablar, katta tashkilotlar |
| **Hybrid** | Ofis yoki o'z ma'lumot markazi + public cloud, bog'langan | Bosqichma-bosqich ko'chish, eski tizimlar |
| **Multi-cloud** | Bir nechta provayder bir vaqtda | Bog'liqlikni kamaytirish, har birining kuchli tomoni |

Multi-cloud xavfsizlik uchun **qiyinroq**: har bir provayderning o'z IAM tizimi, o'z jurnallari, o'z sozlamalari bor. Ikki marta ko'proq bilim, ikki marta ko'proq xato qilish imkoniyati.

## Region va availability zone

Provayderning infratuzilmasi dunyo bo'ylab tarqalgan:

```
 Region: eu-central-1 (Frankfurt)
 ┌───────────────────────────────────────────────┐
 │  AZ a              AZ b              AZ c     │
 │ ┌────────┐       ┌────────┐       ┌────────┐  │
 │ │ma'lumot│       │ma'lumot│       │ma'lumot│  │
 │ │markazi │◀─────▶│markazi │◀─────▶│markazi │  │
 │ └────────┘       └────────┘       └────────┘  │
 │   alohida quvvat, sovutish, tarmoq; tez aloqa │
 └───────────────────────────────────────────────┘
```

| Atama | Ma'nosi | Xavfsizlik va ishonchlilik uchun |
|---|---|---|
| [[region|Region]] | Geografik hudud (Frankfurt, Irlandiya, Virjiniya…) | Ma'lumot qaysi mamlakatda saqlanishi |
| Availability Zone (AZ) | Region ichidagi mustaqil ma'lumot markazi (yoki guruhi) | Bitta AZ ishdan chiqsa, ilova boshqasida ishlaydi |
| Edge location | Foydalanuvchiga yaqin kesh nuqtalari (CDN) | Tezlik, DDoS himoyasi |

Region tanlash — huquqiy savol ham. Ko'p mamlakatlarda shaxsiy ma'lumotlar qayerda saqlanishi qonun bilan tartibga solinadi. O'zbekistonda ham fuqarolarning shaxsiy ma'lumotlarini mamlakat hududidagi serverlarda saqlash talabi mavjud ("Shaxsiy ma'lumotlar to'g'risida"gi qonun). Haqiqiy loyihada bu savolni huquqshunos bilan hal qiling — muhandis uchun muhimi, bunday talab borligini bilish va arxitekturani shunga moslash.

:::warn
Ishlatmaydigan regionlar ham xavf: hujumchi o'g'irlangan kalit bilan ko'pincha siz **qaramaydigan** regionda server ko'taradi (b4 bosqichidagi bulut loglari darsida `RunInstances` — g'ayrioddiy mintaqada). Kerak bo'lmagan regionlarni tashkilot siyosati bilan taqiqlash va monitoringni **barcha** regionlarga yoqish — c2 bosqichi mavzusi.
:::

## Bulut xavfsizlikni qanday o'zgartiradi

Beshta xususiyatga qaytamiz — har birining ikki tomoni bor:

| Xususiyat | Himoyachi uchun foyda | Yangi xavf |
|---|---|---|
| Self-service | Xavfsizlik vositalari ham bir tugma bilan | Har bir dasturchi resurs yarata oladi — nazoratsiz "soya IT" |
| Tarmoq orqali boshqaruv | Hamma amal API orqali va **jurnalga yoziladi** | Kalit o'g'irlansa — internetning istalgan joyidan boshqaruv |
| Resource pooling | Provayderning ulkan xavfsizlik jamoasi | Bitta fizik serverda begona mijozlar (izolyatsiya provayderga bog'liq) |
| Elasticity | Hujumdan keyin toza server soniyalarda | Hujumchi ham soniyalarda yuzlab server ko'taradi |
| Measured service | Xarajat — anomaliya signali | Hujum to'g'ridan-to'g'ri pul: kriptomayning, katta hisob |

Eng katta o'zgarish: an'anaviy tarmoqda chegara — firewall edi. Bulutda boshqaruv paneli internetda, hamma joydan ochiq. **Chegara — identifikatsiya**: kim, qaysi kalit bilan, nimaga ruxsati bor. Shuning uchun c2 bosqichi IAM'dan boshlanadi.

## Bulut nimani qilmaydi

- **Avtomatik zaxira emas.** Server diski provayderda ko'p nusxada saqlanadi — lekin bu uskunaning buzilishidan himoya, sizning xatoingizdan emas. Bazani o'zingiz o'chirsangiz yoki ransomware shifrlasa, provayder uni qaytarib bermaydi. Zaxira — sizning ishingiz.
- **Avtomatik muvofiqlik emas.** Provayderning ISO 27001 sertifikati **uning** infratuzilmasini qamraydi. Sizning ilovangiz standartga mosligini o'zingiz isbotlaysiz (c4 bosqichi).
- **Avtomatik arzon emas.** O'chirishni unutilgan resurs har soat pul oladi. Xarajat nazorati — keyingi darsning birinchi qadami.

:::try
1. Quyidagi xizmatlarni IaaS, PaaS, SaaS yoki FaaS ga ajrating: Google Docs, AWS Lambda, DigitalOcean droplet, Azure SQL Database, Zoom, AWS EC2, GitHub, Heroku.
2. Har bir vaziyatda kim javobgar — provayder yoki mijoz? (a) RDS bazasi "Publicly accessible: Yes" bilan yaratilgan va zaif parolga ega. (b) Microsoft 365 da administrator hisobida MFA yo'q edi. (c) EC2 serverning fizik diski ma'lumot markazidan o'g'irlandi. (d) Lambda funksiyasi kodida SQL injection bor.
3. O'zingiz ishlatadigan uchta SaaS xizmatni yozing (pochta, bulut disk, ijtimoiy tarmoq). Har birida sizning javobgarlik qismingiz nima va siz uni bajaryapsizmi (MFA, kim bilan ulashilgan fayllar)?

**Javoblar:**
1. SaaS: Google Docs, Zoom, GitHub. IaaS: DigitalOcean droplet, AWS EC2. PaaS: Azure SQL Database, Heroku. FaaS: AWS Lambda.
2. (a) Mijoz — tarmoqqa ochish va parol — sozlama. (b) Mijoz — hisoblar va MFA har doim mijozda. (c) Provayder — fizik xavfsizlik. (d) Mijoz — serverless'da ham kod sizniki.
3. Odatiy javob: MFA yoqilgan bo'lishi, "havola orqali hamma ko'ra oladi" bilan ulashilgan eski fayllarni tekshirish, ulangan uchinchi tomon ilovalarini (OAuth ruxsatlari, a1) ko'rib chiqish.
:::

## Xulosa

- Bulut — talab bo'yicha, tarmoq orqali, umumiy resurslardan, tez kengayadigan va o'lchanadigan xizmat (NIST'ning 5 xususiyati).
- IaaS — server sizda; PaaS — kod sizda; SaaS — faqat ma'lumot, foydalanuvchilar va sozlamalar sizda; FaaS — faqat funksiya.
- Umumiy javobgarlik: provayder — bulutning xavfsizligi, siz — bulut ichidagi xavfsizlik. Ma'lumot, identifikatsiya va kirish nazorati har doim sizda.
- Region tanlash — ishonchlilik va huquqiy savol; ishlatilmaydigan regionlar ham kuzatilishi kerak.
- Bulutda chegara — identifikatsiya. Hamma narsa API orqali va jurnalga yoziladi.
- Bulut avtomatik zaxira, avtomatik muvofiqlik va avtomatik arzonlik bermaydi.

:::quiz
? Onlayn do'konning S3 bucket'i internetga ochiq qolib, mijozlar ma'lumoti sizib chiqdi. Umumiy javobgarlik modeli bo'yicha kim javobgar?
- Bulut provayderi, chunki ma'lumot uning serverida
+ Do'kon, chunki bucket sozlamalari bulut ichidagi xavfsizlikka kiradi
- Ikkalasi teng
- Hech kim — bu texnik nosozlik
! Provayder bulutning o'zini himoya qiladi; resurslarni qanday sozlash — mijozning javobgarligi.

? IaaS modelida server OS yangilanishlarini kim o'rnatadi?
+ Mijoz
- Provayder
- Avtomatik, hech kim aralashmaydi
- Faqat sertifikatlangan auditor
! IaaS'da provayder virtualizatsiya va uskunagacha javob beradi; OS va undan yuqorisi mijozda.

? Qaysi uchta narsa xizmat modelidan qat'i nazar har doim mijoz javobgarligida qoladi?
- OS, tarmoq, uskunalar
+ Ma'lumot, hisoblar va kirish nazorati
- Bino, quvvat, sovutish
- Virtualizatsiya, gipervizor, saqlash
! SaaS'da ham kim kirishi, qanday ruxsatlar va qanday ma'lumot saqlanishi mijozga bog'liq.

? Qaysi biri PaaS misoli?
- Gmail
+ AWS Elastic Beanstalk yoki Heroku
- AWS EC2
- Zoom
! PaaS'da kodni yuklaysiz, platforma (OS, runtime) provayder tomonidan boshqariladi.

? Qaydnoma'ni IaaS'dan PaaS'ga ko'chirdik. Ilovadagi IDOR zaifligi nima bo'ladi?
- Provayder uni avtomatik tuzatadi
- PaaS'da IDOR mumkin emas
+ U baribir mijozniki — ilova kodi PaaS'da ham mijoz javobgarligida
- Zaiflik WAF tufayli yo'qoladi
! PaaS OS va platformani olib qo'yadi, lekin ilova mantiqi va kodi sizda qoladi.

? Availability Zone nima?
- Bulut konsolidagi sahifa
+ Region ichidagi mustaqil quvvat, sovutish va tarmoqqa ega ma'lumot markazi (yoki guruhi)
- Mamlakat bo'yicha narx zonasi
- Foydalanuvchiga yaqin CDN keshi
! Bir nechta AZ'ga joylash bitta ma'lumot markazi ishdan chiqqanda ilovani ishlashda saqlaydi.

? Nega bulutda "chegara — identifikatsiya" deyiladi?
- Bulutda firewall yo'q
+ Boshqaruv paneli va API internetdan ochiq; kim qaysi kalit bilan nimaga ruxsatli ekani asosiy himoya chizig'i
- Faqat parol bilan kirish mumkin
- Bulutda tarmoq mavjud emas
! Kalit yoki parol o'g'irlansa, hujumchi internetning istalgan joyidan resurslarni boshqaradi — shuning uchun IAM markaziy.

? Kompaniya "Provayderimizda ISO 27001 sertifikati bor, demak biz ham ISO 27001 ga mosmiz" deydi. To'g'rimi?
- Ha, sertifikat avtomatik meros qilinadi
+ Yo'q, provayder sertifikati faqat uning infratuzilmasini qamraydi; mijoz o'z qismini alohida isbotlaydi
- Ha, agar bitta regionda ishlasa
- Faqat SaaS'da to'g'ri
! Provayder sertifikati sizning auditingizda dalil sifatida yordam beradi, lekin sizning nazoratlaringizni almashtirmaydi.

? Elasticity xususiyatining xavfsizlik uchun salbiy tomoni qaysi?
- Serverlar sekin ishlaydi
+ O'g'irlangan kalit bilan hujumchi ham soniyalarda ko'plab server ko'tarib, katta xarajat qilishi mumkin
- Ma'lumotlar shifrlanmaydi
- Loglar yozilmaydi
! Tez kengayish ikki tomonlama: kriptomayning hujumlari aynan shundan foydalanadi.

? Administrator RDS bazasini xato bilan o'chirib yubordi. Provayder uni qaytaradimi?
- Ha, provayder hamma narsaning nusxasini saqlaydi
+ Yo'q, agar mijoz zaxira yoki snapshot sozlamagan bo'lsa — bu mijoz javobgarligi
- Ha, lekin faqat SaaS'da
- Faqat region o'zgartirilsa
! Provayder uskuna nosozligidan himoya qiladi, mijozning o'z xatosidan emas. Zaxira — mijozning ishi.
:::

:::cards
Bulut (NIST) :: Talab bo'yicha, tarmoq orqali, umumiy resurslardan, tez kengayadigan va o'lchanadigan xizmat
IaaS :: Virtual server, disk, tarmoq; OS va undan yuqorisi mijozda
PaaS :: Platforma provayderda; mijoz kod va ma'lumotni joylaydi
SaaS :: Tayyor ilova; mijoz foydalanuvchilar, ruxsatlar va ma'lumotga javob beradi
FaaS / serverless :: Faqat funksiya yoziladi, u so'rov kelganda ishga tushadi (Lambda)
Shared responsibility :: Provayder — bulutning xavfsizligi; mijoz — bulut ichidagi xavfsizlik
Har doim mijozda :: Ma'lumot, hisoblar, kirish nazorati
Region :: Provayderning geografik hududi; ma'lumot qayerda saqlanishini belgilaydi
Availability Zone :: Region ichidagi mustaqil ma'lumot markazi
Multi-cloud :: Bir nechta provayder bir vaqtda — xavfsizlik uchun murakkabroq
Bulutda chegara :: Identifikatsiya — kim, qaysi kalit bilan, nimaga ruxsatli
:::
