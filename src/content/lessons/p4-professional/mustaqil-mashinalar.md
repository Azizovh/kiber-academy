TryHackMe'dagi xonalarni ketma-ket yechib keldingiz: har bir qadam yozilgan, "keyingi savol" sizni to'g'ri yo'lga boshlab boradi. Keyin Hack The Box'da birinchi "Easy" mashinani ochasiz. Bitta IP manzil. Boshqa hech narsa. Yo'riqnoma yo'q, savollar yo'q, maslahat yo'q.

Bir soat o'tadi. Ikki soat. Nmap natijasiga qarab o'tirasiz va nima qilishni bilmaysiz.

Bu holat — normal, va aynan shu holat sizni pentester qiladi. Haqiqiy loyihada ham mijoz faqat qamrovni beradi: "mana IP manzillar, mana ilova". Yo'riqnomasiz ishlash — eng muhim va eng qiyin o'rganiladigan ko'nikma. Bu dars uni qanday tizimli o'rganishni ko'rsatadi: qayerda, qanday tartibda, qachon yordam so'rash va har bir mashinadan qanday qilib maksimal foyda olish.

## Qayerda mashq qilish

Barcha platformalar **qonuniy**: siz ataylab zaif qilingan, platformaga tegishli mashinalarni ularning VPN'i orqali tekshirasiz.

| Platforma | Xususiyati | Qachon |
|---|---|---|
| **TryHackMe** | Yo'riqnomali xonalar va oddiy "challenge" mashinalar | Boshlang'ich; mustaqil ishga o'tish ko'prigi |
| **Hack The Box** (HTB) | Easy dan Insane gacha mashinalar; faol va nafaqaga chiqarilgan (retired) | Asosiy mustaqil amaliyot |
| **HTB Academy** | Modulli kurslar, CPTS sertifikati yo'li | Nazariya + amaliyot birga |
| **OffSec Proving Grounds** (Play / Practice) | OSCP uslubidagi mashinalar | OSCP'ga tayyorgarlik |
| **VulnHub** | Yuklab olinadigan zaif virtual mashinalar | Internetsiz, o'z laboratoriyangizda |

:::warn
**Faqat platforma ruxsat bergan nishonlar.** VPN'ga ulanganingizda siz boshqa foydalanuvchilar bilan bitta tarmoqda bo'lishingiz mumkin. Faqat platforma sizga bergan mashina IP manzilini tekshiring — boshqa o'yinchilarning kompyuterlari, platformaning o'z infratuzilmasi va VPN serveri qamrovda emas. Mashq uchun alohida virtual mashina (Kali yoki boshqa) ishlating, asosiy kompyuteringizni emas: VulnHub mashinalarini esa faqat ichki "host-only" tarmoqda ishga tushiring (s1 virtualizatsiya darsi).
:::

## Mashinaga qanday yondashish

Mustaqil ishda eng katta xavf — tartibsizlik: bir narsani yarim tekshirib, boshqasiga o'tib ketish. p1 metodologiyasini kichik hajmda qo'llang:

```
 1. Razvedka          to'liq port skani (p1 Nmap): barcha TCP portlar,
                      keyin topilgan portlarda xizmat va versiya
        │
 2. Enumeratsiya      har bir xizmat uchun p1 enumeratsiya ro'yxati:
                      web → web razvedka (p2), SMB → ulashilgan papkalar,
                      FTP → anonim kirish va h.k.
        │
 3. Gipoteza          "Bu versiya eski — ma'lum zaiflik bormi?"
                      "Bu login sahifasi — standart parol?"
                      "Bu fayl yuklash — nima tekshiriladi?"
        │
 4. Tekshirish        gipotezani bitta-bittadan sinash, natijani yozish
        │
 5. Hujjatlash        har bir qadam, ishlagan va ishlamagan narsa
        │
        └──► yangi ma'lumot topildi? → 2-qadamga qayting
```

Asosiy fikr: [[enumeration|enumeratsiya]] **hech qachon "tugamaydi"**. Tiqilib qolganingizda, deyarli har doim javob siz yetarlicha chuqur qaramagan joyda bo'ladi. Yangi parol, foydalanuvchi nomi yoki yo'l topdingizmi — avval tekshirgan xizmatlarga u bilan qayta qarang.

:::key
**Tiqilib qolganingizda o'zingizga beradigan savollar:**
- Barcha portlarni tekshirdimmi (faqat eng mashhur 1000 tasini emas)? UDP-chi?
- Har bir topilgan versiyani ma'lum zaifliklar bazasida qidirdimmi (p1 exploit topish darsi)?
- Web ilovaning har bir sahifasi, JS fayli va kataloglarini ko'rdimmi?
- Topilgan har bir foydalanuvchi nomi va parolni boshqa xizmatlarda ham sinadimmi?
- Xato xabarlari, sarlavhalar, manba kodidagi izohlarni o'qidimmi?
:::

## Qachon yordam so'rash: vaqt chegarasi

Ikki xato bor: o'n daqiqadan keyin writeup'ni ochish (hech narsa o'rganmaysiz) va uch kun bitta joyda o'tirish (motivatsiya yo'qoladi). Oraliq yo'l — **vaqt chegarasi**:

| Bosqich | Nima qilasiz |
|---|---|
| 0–60 daqiqa | Faqat o'zingiz. Metodologiya va yuqoridagi savollar ro'yxati |
| Yana 30 daqiqa | Eslatmalarni qayta o'qing, o'tkazib yuborgan narsani qidiring |
| Tiqilib qoldingizmi | **Kichik maslahat**: platforma forumi yoki rasmiy Discord'dagi "nudge" — faqat yo'nalish, yechim emas |
| Hali ham tiqilib qoldingizmi | Writeup'dan **faqat keyingi bitta qadamni** o'qing, yopib, davom eting |
| Yechgandan keyin | To'liq writeup va IppSec videosini ko'ring: boshqalar qanday boshqacha yo'l tutgan? |

Oxirgi qator — eng ko'p o'tkazib yuboriladigan va eng foydali qadam. Mashinani yechganingizdan keyin boshqa birovning yechimini ko'rish deyarli har doim siz bilmagan usul yoki vositani ko'rsatadi. IppSec (YouTube) retired HTB mashinalarining deyarli hammasini tahlil qilgan va uning ippsec.rocks saytida usul bo'yicha qidirish mumkin.

Writeup'dan foydalanganingizda buni o'z eslatmangizda halol belgilang ("3-qadamda writeup'dan yordam oldim"). Keyinroq aynan shu mavzular sizning zaif joylaringiz ro'yxati bo'ladi.

## Eslatma va writeup

Har bir mashina uchun eslatma — kelajakdagi o'zingiz uchun ma'lumotnoma va p4 hisobot ko'nikmasining mashqi. Uning boshqalar o'qishi uchun tartibga solingan ko'rinishi — [[writeup|writeup]].

```
 # HTB — <mashina nomi> (Easy, Linux)          2026-11-20
 Holat: yechildi (writeup yordami: yo'q / 1 maslahat)

 ## Razvedka
 nmap natijasi (qisqa): 22/ssh OpenSSH ..., 80/http nginx ...

 ## Enumeratsiya
 - 80: sayt texnologiyasi ..., topilgan kataloglar ...
 - ishlamagan yo'llar: ... (nega ishlamadi)

 ## Dastlabki kirish
 Zaiflik turi, qayerda, nega mavjud edi (ildiz sabab)

 ## Imtiyoz oshirish
 Qaysi sozlama xatosi, nega mavjud edi

 ## O'rganganlarim
 - yangi vosita / usul
 - keyingi safar birinchi tekshiraman: ...

 ## Himoya
 Bu mashinani qaysi 2–3 chora himoya qilgan bo'lardi?
```

Oxirgi bo'lim — kursning ruhi: har bir yechilgan mashina uchun "buni qanday to'xtatish mumkin edi?" deb javob berish sizni intervyuda ham, hisobotda ham kuchli qiladi. a2 va b-tarmoq darslaridagi himoya choralariga havola qiling.

:::info
**Writeup'ni ommaga e'lon qilish qoidalari.** HTB qoidalari faol (hali nafaqaga chiqmagan) mashinalar uchun yechimlarni ommaviy e'lon qilishni taqiqlaydi — writeup'ni faqat mashina retired bo'lgandan keyin chiqaring. Boshqa platformalarning qoidalarini ham o'qing. Retired mashinalar bo'yicha yaxshi yozilgan writeup'lar blogi yoki GitHub repozitoriysi — kuchli portfolio (k1 karyera bosqichi).
:::

Eslatma uchun vositalar: Obsidian, CherryTree, Joplin yoki oddiy Markdown fayllar git repozitoriysida. Muhimi vosita emas, **har safar bir xil tuzilma** va qidiruv: olti oydan keyin "SMB'da shunga o'xshash narsa ko'rgandim" degan fikr kelganda, eski eslatmani bir daqiqada topa olishingiz kerak.

## O'sish rejasi: 50 ta mashina

Maqsad — 30 ta oson va kamida 10 ta o'rta mashina, keyin sertifikat darajasidagi to'plamlar.

| Bosqich | Mashinalar | Belgisi |
|---|---|---|
| 1. Ko'prik | TryHackMe'ning yo'riqnomasiz challenge xonalari, 5–10 ta | Nmap natijasidan keyingi qadamni o'zingiz tanlaysiz |
| 2. Easy | HTB va PG Play'da 20–30 ta Easy | Ko'pchiligini writeup'siz, 2–4 soatda |
| 3. Medium | 10–20 ta Medium | Bir nechta zaiflikni zanjirga bog'lash kerak bo'ladi |
| 4. Imtihon to'plami | TJnull ro'yxati (OSCP'ga o'xshash mashinalar), PG Practice, HTB Pro Labs yoki Active Directory to'plamlari | Vaqt chegarasi bilan, imtihon formatida (p4 sertifikat darsi) |

Turli xillikka e'tibor bering: faqat Linux yoki faqat web mashinalarini tanlamang. Kamida uchdan bir qismi Windows bo'lsin — ko'p korporativ tarmoqlar Windows va Active Directory'da ishlaydi.

**Hisob jadvali.** Oddiy jadval yuriting: mashina, OS, qiyinlik, sana, sarflangan vaqt, writeup yordami (ha/yo'q), asosiy mavzu. Bir necha oydan keyin u ikki narsani ko'rsatadi: o'sishingiz (vaqt kamayadi, yordam kamayadi) va zaif mavzularingiz (yordam qayerda ko'p kerak bo'lgan).

:::tip
**Sifat soni emas.** 50 ta mashinani writeup'ga qarab "yechish" — 15 ta mashinani o'zingiz yechib, har biridan keyin to'liq eslatma yozib, IppSec videosini ko'rishdan ancha kam foyda beradi. Ish beruvchi sertifikat yoki HTB reytingiga emas, intervyuda mashinani qanday yechganingizni va nega u zaif bo'lganini tushuntira olishingizga qaraydi.
:::

## Mustaqil ishning odatlari

- **Muntazamlik.** Haftada uch marta ikki soat — dam olish kunlari bir marta 12 soatdan yaxshiroq.
- **Bitta mashinani oxirigacha.** Har safar tiqilib qolganda yangi mashinaga o'tish — mustaqillikni rivojlantirmaydi.
- **Vositani tushunish.** Har bir buyruqni "ishladi" deb emas, "nima qildi va nega" deb yozing. Avtomatik skriptlarning natijasini qo'lda tasdiqlang (p1 skanerlar darsidagi qoida).
- **Jamiyat.** Platforma Discord'lari va forumlarida savol bering — lekin faol mashinalar uchun spoiler bermang va so'ramang.
- **Charchoqni tan oling.** "Rabbit hole" — noto'g'ri yo'lda soatlab qazish — hammaga tanish. Agar 30 daqiqa hech qanday yangi ma'lumot bermagan bo'lsa, to'xtang, eslatmalarga qayting va boshqa gipotezani tanlang.

## Amaliyot

:::try
**1. Muhitni tayyorlang.** Mashq uchun alohida virtual mashina tayyorlang (snapshot bilan), TryHackMe yoki HTB VPN'iga ulaning va ulanish ishlaganini tekshiring (platforma beradigan test manzilini `ping` qiling). Eslatmalar uchun bitta papka yoki repozitoriy oching va yuqoridagi qolipni u yerga saqlang.

*Tekshirish:* VPN interfeysi (`ip a` da `tun0`) bor; snapshot olingan; qolip fayli tayyor.

**2. Birinchi mustaqil mashina.** TryHackMe yoki HTB'da Easy darajasidagi bitta mashinani tanlang va vaqt chegarasi jadvaliga qat'iy rioya qilib ishlang. Har bir yordam olgan joyingizni eslatmada belgilang.

*Tekshirish:* eslatmada barcha bo'limlar, jumladan "Himoya" bo'limi to'ldirilgan.

**3. Yechimdan keyingi tahlil.** Yechgan mashinangiz bo'yicha IppSec videosini (yoki rasmiy writeup'ni) ko'ring va "O'rganganlarim" bo'limiga kamida ikkita yangi narsa qo'shing.

*Javob yo'nalishi:* boshqacha enumeratsiya usuli, siz bilmagan vosita yoki siz o'tkazib yuborgan muqobil yo'l.

**4. Hisob jadvalini boshlang.** Ustunlar: mashina, OS, qiyinlik, sana, vaqt, yordam, asosiy mavzu. Birinchi qatorni to'ldiring.
:::

## Xulosa

- Yo'riqnomasiz ishlash — pentesterning eng muhim ko'nikmasi; boshida tiqilib qolish normal.
- Mashq faqat qonuniy platformalarda va faqat sizga berilgan mashinalarda: TryHackMe, HTB, Proving Grounds, VulnHub (host-only tarmoqda).
- Yondashuv: razvedka → enumeratsiya → gipoteza → tekshirish → hujjatlash, yangi ma'lumot bilan qaytadan.
- Vaqt chegarasi: avval o'zingiz, keyin kichik maslahat, keyin writeup'dan faqat bitta qadam; yechgandan keyin to'liq tahlil.
- Har bir mashina uchun bir xil tuzilmadagi eslatma, "Himoya" bo'limi bilan.
- Faol mashinalarning writeup'ini e'lon qilmang; retired mashinalar writeup'i — portfolio.
- Reja: ko'prik → 30 Easy → 10+ Medium → imtihon formatidagi to'plamlar; Windows'ni ham unutmang.
- Son emas, sifat: tushunib yechilgan 15 ta mashina writeup'ga qarab "yechilgan" 50 tadan qimmatroq.

:::quiz
? Nega mustaqil mashinalarda ishlash muhim?
- Sertifikat faqat HTB reytingiga qarab beriladi
+ Haqiqiy loyihada ham faqat qamrov beriladi, yo'riqnoma yo'q
- TryHackMe xonalari noto'g'ri ma'lumot beradi
! Mijoz faqat IP manzillar va ilovani beradi; keyingi qadamni tanlashni o'zingiz bilishingiz kerak.

? VPN orqali platformaga ulanganda nimani tekshirish mumkin?
- VPN tarmog'idagi barcha manzillarni
- Boshqa o'yinchilarning mashinalarini, agar ular zaif bo'lsa
+ Faqat platforma sizga bergan mashina manzilini
! Boshqa foydalanuvchilar va platforma infratuzilmasi qamrovda emas.

? VulnHub mashinasini qayerda ishga tushirish kerak?
+ Internetga chiqmaydigan host-only tarmoqda, alohida virtual mashinalar bilan
- Asosiy kompyuterda to'g'ridan-to'g'ri
- Uy tarmog'ida, boshqa qurilmalar bilan birga
! Ataylab zaif mashina tarmoqni xavf ostiga qo'ymasligi uchun izolyatsiya qilinadi.

? Tiqilib qolganingizda birinchi navbatda nima qilish kerak?
- Darhol yangi mashinaga o'tish
+ Enumeratsiyaga qaytish: barcha portlar, versiyalar, sahifalar, topilgan ma'lumotlarni qayta ko'rish
- To'liq writeup'ni o'qib, oxirigacha bajarish
! Javob deyarli har doim yetarlicha chuqur qaralmagan joyda bo'ladi.

? Writeup'dan to'g'ri foydalanish qaysi?
- O'n daqiqadan keyin ochib, qadamlarni takrorlash
+ Vaqt chegarasidan keyin faqat keyingi bitta qadamni o'qish va yordamni eslatmada belgilash
- Hech qachon ochmaslik, hatto yechgandan keyin ham
! Kichik yordam o'rganishni to'xtatmaydi; yechgandan keyin to'liq writeup ko'rish esa foydali.

? Mashinani yechgandan keyin IppSec videosini ko'rishning foydasi?
- Hech qanday foydasi yo'q, mashina allaqachon yechilgan
+ Boshqa usullar, vositalar va o'tkazib yuborilgan yo'llarni ko'rsatadi
- HTB reytingini oshiradi
! Boshqalarning yechimi deyarli har doim yangi narsa o'rgatadi.

? HTB'da faol mashina writeup'ini e'lon qilish mumkinmi?
- Ha, istalgan vaqtda
+ Yo'q, faqat mashina retired bo'lgandan keyin
- Faqat GitHub'da mumkin
! Platforma qoidalari faol mashinalar yechimini ommaga chiqarishni taqiqlaydi.

? Eslatmadagi "Himoya" bo'limining maqsadi?
- Platforma talab qiladi
+ Har bir zaiflikni qanday to'xtatish mumkinligini tushunish — hisobot va intervyu uchun
- Writeup'ni uzunroq qilish
! Pentesterning qiymati — topish bilan birga tuzatishni ham tavsiya qila olish.

? "Rabbit hole" belgisi va undan chiqish yo'li?
+ Uzoq vaqt yangi ma'lumot yo'q — to'xtab, eslatmalarga qaytib, boshqa gipotezani tanlash
- Bitta usulni ishlaguncha takrorlash
- Mashinani qayta ishga tushirib, xuddi shu narsani qilish
! Noto'g'ri yo'lda qazishni erta sezish va gipotezani almashtirish kerak.

? Mashinalarni tanlashda qaysi tavsiya to'g'ri?
- Faqat Linux, chunki u osonroq
+ Turli xil: kamida uchdan bir qismi Windows va Active Directory
- Faqat Insane darajasidagilar, tezroq o'sish uchun
! Korporativ tarmoqlarning ko'pchiligi Windows va AD'da ishlaydi.
:::

:::cards
Mustaqil amaliyot platformalari? :: TryHackMe (ko'prik), Hack The Box, HTB Academy, Proving Grounds, VulnHub (o'z laboratoriyangizda).
VPN tarmog'idagi qamrov? :: Faqat platforma sizga bergan mashina; boshqa o'yinchilar va infratuzilma emas.
Mashinaga yondashuv tsikli? :: Razvedka, enumeratsiya, gipoteza, tekshirish, hujjatlash; yangi ma'lumot bilan qaytadan.
Tiqilib qolganda birinchi qadam? :: Enumeratsiyaga qaytish: barcha portlar, versiyalar, sahifalar va topilgan ma'lumotlar.
Vaqt chegarasi g'oyasi? :: Avval o'zingiz, keyin kichik maslahat, keyin writeup'dan faqat bitta qadam.
Yechgandan keyin? :: To'liq writeup yoki IppSec videosini ko'rib, yangi usullarni eslatmaga yozish.
Eslatma qolipining bo'limlari? :: Razvedka, enumeratsiya, dastlabki kirish, imtiyoz oshirish, o'rganganlarim, himoya.
Writeup e'lon qilish qoidasi? :: Faqat retired mashinalar uchun; faol mashinalarga spoiler bermang.
O'sish rejasi? :: Ko'prik, 30 Easy, 10+ Medium, keyin imtihon formatidagi to'plamlar (TJnull, PG Practice, AD).
Hisob jadvalining foydasi? :: O'sishni (vaqt va yordam kamayishi) va zaif mavzularni ko'rsatadi.
Rabbit hole? :: Noto'g'ri yo'lda soatlab qazish; yangi ma'lumot bo'lmasa to'xtab, gipotezani almashtirish.
:::
