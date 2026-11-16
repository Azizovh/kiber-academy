Himoya qilayotgan narsangizni tushunmasangiz, uni himoya qila olmaysiz. Hujumchi parolni kompyuter xotirasidan qanday o'g'irlaydi? Nega o'chirilgan faylni tiklab bo'ladi? Nega zararli dastur kompyuter o'chirib yoqilgandan keyin ham "tirik" qoladi? Bu savollarning javobi — kompyuter ichida.

Bu darsda kompyuterni qismlarga ajratamiz. Maqsad — muhandis bo'lish emas, balki keyingi hamma narsa tayanadigan aniq manzarani hosil qilish.

## Ikki dunyo: hardware va software

Kompyuter ikki qismdan iborat:

- [[hardware|Hardware]] — qo'l bilan ushlasa bo'ladigan qismlar: protsessor, xotira, disk, ekran.
- [[software|Software]] — bu qismlarga nima qilishni aytadigan ko'rsatmalar: operatsion tizim, brauzer, o'yin.

Hardware — musiqa asbobi, software — nota. Asbobsiz nota jim, notasiz asbob ham.

## Oshxona misoli

Kompyuterning asosiy qismlarini eslab qolishning eng oson yo'li — restoran oshxonasini tasavvur qilish.

| Qism | Oshxonada | Vazifasi |
|---|---|---|
| **CPU** (protsessor) | Oshpaz | Hamma ishni bajaradi |
| **RAM** (tezkor xotira) | Ish stoli | Hozir ishlatilayotgan narsalar turadi |
| **Disk** (SSD/HDD) | Omborxona | Hamma narsa uzoq muddat saqlanadi |
| **Motherboard** | Oshxonaning o'zi | Hammasini bir-biriga bog'laydi |
| **Kiritish/chiqarish** | Ofitsiantlar | Buyurtma olib kiradi, taomni olib chiqadi |

Endi har birini ko'rib chiqamiz.

## CPU — protsessor

[[cpu|CPU]] (Central Processing Unit) — kompyuterning "miyasi". U faqat bitta ishni biladi, lekin uni aql bovar qilmas tezlikda bajaradi:

1. **Fetch** — xotiradan navbatdagi buyruqni oladi.
2. **Decode** — bu qanday buyruq ekanini aniqlaydi.
3. **Execute** — uni bajaradi.

Va yana boshidan. Soniyasiga milliardlab marta.

Buyruqlarning o'zi juda sodda: "ikki sonni qo'sh", "bu sonni xotiraga yoz", "agar natija nol bo'lsa, boshqa joyga sakra". Siz ko'rib turgan har qanday murakkablik — video, o'yin, sun'iy intellekt — shunday oddiy qadamlarning milliardlab takrori.

Protsessorning ikki asosiy ko'rsatkichi:

- **Chastota (GHz)** — soniyasiga nechta qadam. 3 GHz — soniyasiga taxminan 3 milliard takt.
- **Yadrolar soni** — nechta "oshpaz" bir vaqtda ishlaydi. 8 yadro — 8 ta ishni parallel bajarish mumkin.

## RAM — tezkor xotira

[[ram|RAM]] (Random Access Memory) — ish stoli. Oshpaz har bir sabzavot uchun omborxonaga yugurmaydi: kerakli narsalarni oldindan stolga terib qo'yadi. Stol kichik bo'lsa, u tez-tez omborga qatnaydi va ish sekinlashadi.

Dasturni ishga tushirganingizda u diskdan RAM'ga **nusxalanadi** va shu yerda ishlaydi. Ochiq hujjatingiz, brauzerdagi sahifalar, kiritgan parolingiz — hammasi hozir RAM'da.

RAM'ning ikki muhim xususiyati:

- **Juda tez** — diskdan yuzlab marta tezroq.
- **O'zgaruvchan** (volatile) — tok o'chsa, ichidagi hamma narsa yo'qoladi. Saqlanmagan hujjat nega yo'qolishini endi bilasiz.

:::key
**Xavfsizlik uchun muhim:** dastur ishlashi uchun ma'lumot RAM'da **ochiq holda** turishi kerak. Diskda shifrlangan fayl ochilganda — xotirada u shifrsiz. Parol, shifrlash kaliti, yozishma — hujumchi xotiraga yetib borsa, hammasini o'qiy oladi. Shuning uchun tergovchilar ham buzilgan kompyuterni o'chirmasdan avval RAM nusxasini oladi: u yerda diskda yo'q dalillar bor.
:::

## Disk — doimiy xotira

[[storage|Disk]] — omborxona. Tok o'chganda ham saqlanib qoladi. Ikki turi keng tarqalgan:

- **HDD** — aylanuvchi magnit disklar. Arzon, sig'imi katta, sekin.
- **SSD** — harakatlanuvchi qismlarsiz, chiplarda. Ancha tez, qimmatroq.

RAM va diskni adashtirmang — bu yangi boshlovchilarning eng ko'p uchraydigan chalkashligi:

| | RAM | Disk |
|---|---|---|
| Tezlik | Juda tez | Sekinroq |
| Hajm | 8–32 GB | 256 GB – bir necha TB |
| Tok o'chsa | Tozalanadi | Saqlanadi |
| Nima turadi | Hozir ishlayotgan narsalar | Hamma narsa |

:::info
**O'chirilgan fayl haqiqatan o'chmaydi.** Faylni o'chirganingizda tizim odatda faqat "bu joy bo'sh" deb belgi qo'yadi — ma'lumotning o'zi ustiga boshqa narsa yozilmaguncha diskda turaveradi. Shu sababli o'chirilgan fayllarni tiklash mumkin, va shu sababli eski kompyuterni sotishdan oldin diskni maxsus tozalash kerak.
:::

## Motherboard va qolganlar

**Motherboard** (ona plata) — barcha qismlar ulanadigan asosiy plata. O'zi hisoblamaydi, lekin hammani bir-biri bilan bog'laydi.

Unda [[firmware|firmware]] ham joylashgan — **BIOS** yoki uning zamonaviy ko'rinishi **UEFI**. Bu kompyuter yoqilganda birinchi bo'lib ishga tushadigan, qurilmalarni tekshirib, operatsion tizimni yuklaydigan kichik dastur.

Yana bir necha muhim qism:

- **GPU** (videokarta) — tasvirni hisoblaydi. Bir xil amalni juda ko'p marta parallel bajarishga usta — shuning uchun parol xeshlarini buzishda ham ishlatiladi.
- **NIC** (tarmoq kartasi) — kompyuterni tarmoqqa ulaydi: simli yoki Wi-Fi.
- **Kiritish/chiqarish qurilmalari** — klaviatura, sichqoncha, ekran, USB portlar.

## Hammasi birga: dasturni ochganda nima bo'ladi

Brauzer belgisini ikki marta bosdingiz. Keyin:

1. Operatsion tizim **diskdan** brauzer faylini topadi.
2. Uni **RAM**'ga yuklaydi.
3. **CPU** uning buyruqlarini birma-bir bajara boshlaydi.
4. Brauzer sayt so'raydi → so'rov **tarmoq kartasi** orqali chiqib ketadi.
5. Javob keladi → CPU uni qayta ishlaydi → **GPU** tasvirni chizadi → **ekran**da ko'rasiz.

Bularning hammasi soniyaning bir bo'lagida sodir bo'ladi.

## Nega bu xavfsizlikchiga kerak

Har bir qism — hujum uchun alohida maydon:

- **RAM** — ishlab turgan dasturlardan parol va kalitlarni o'g'irlash; tergovda — xotira tahlili.
- **Disk** — o'chirilgan ma'lumotni tiklash; shifrlanmagan diskli o'g'irlangan noutbuk.
- **Firmware** — operatsion tizim qayta o'rnatilgandan keyin ham saqlanib qoladigan zararli kod.
- **USB portlar** — jismoniy kirishi bor hujumchi uchun ochiq eshik.
- **CPU** — protsessor darajasidagi zaifliklar (mashhur misollar: Spectre va Meltdown).

Hozircha bularni eslab qolish shart emas. Muhimi — "kompyuter" degan qora quti endi siz uchun qismlardan iborat tushunarli tizimga aylansin.

:::try
O'z kompyuteringizni o'rganing. **Task Manager** ni oching (`Ctrl + Shift + Esc`) → **Performance** yorlig'i. U yerdan toping: protsessoringiz nomi va yadrolar soni, RAM hajmi va hozir qanchasi band, disk turi (SSD yoki HDD). Keyin bir nechta dastur ochib, RAM band bo'lishi qanday o'zgarishini kuzating.
:::

## Xulosa

- **CPU** buyruqlarni bajaradi: fetch → decode → execute, soniyasiga milliardlab marta.
- **RAM** — tez, lekin vaqtinchalik ish joyi; ishlayotgan dastur ma'lumoti u yerda ochiq turadi.
- **Disk** — sekinroq, lekin doimiy; o'chirilgan fayl darhol yo'qolmaydi.
- **Firmware** (BIOS/UEFI) kompyuter yoqilganda birinchi ishga tushadi.
- Har bir qism — potensial hujum yuzasi.

:::quiz
? Kompyuter kutilmaganda o'chib qoldi. Saqlanmagan hujjat nega yo'qoldi?
- Chunki disk buzildi
+ Chunki u RAM'da edi, RAM esa tok o'chganda tozalanadi
- Chunki protsessor uni o'chirib yubordi
- Chunki operatsion tizim uni yashirdi
! Saqlanmagan ma'lumot faqat tezkor xotirada turadi. RAM o'zgaruvchan (volatile): tok o'chsa, ichidagi ma'lumot yo'qoladi.

? Protsessor ishlash siklining to'g'ri tartibi qaysi?
- Execute → Fetch → Decode
- Decode → Execute → Fetch
+ Fetch → Decode → Execute
- Fetch → Execute → Decode
! Avval buyruq xotiradan olinadi (fetch), keyin nima ekani aniqlanadi (decode), so'ng bajariladi (execute).

? Nega tergovchilar buzilgan kompyuterni darhol o'chirib qo'ymaydi?
- Chunki o'chirish diskni buzadi
+ Chunki RAM'da diskda yo'q dalillar bor va ular o'chirilganda yo'qoladi
- Chunki qayta yoqib bo'lmaydi
- Chunki bu qonun bilan taqiqlangan
! Ishlab turgan zararli dastur, tarmoq ulanishlari, shifrlash kalitlari — bular faqat xotirada bo'lishi mumkin. Shuning uchun avval RAM nusxasi olinadi.

? Faylni o'chirib, savatni bo'shatdingiz. Ma'lumot bilan nima bo'ldi?
- U diskdan darhol va butunlay yo'q bo'ldi
+ Joyi “bo'sh” deb belgilandi, lekin ustiga yozilmaguncha ma'lumot diskda turibdi
- U RAM'ga ko'chirildi
- U internetga yuborildi
! Tizim odatda faqat belgini o'zgartiradi. Shu sababli maxsus dasturlar o'chirilgan fayllarni tiklay oladi.

? BIOS/UEFI nima?
- Antivirus dasturi
- Operatsion tizimning bir turi
+ Kompyuter yoqilganda birinchi ishga tushadigan va operatsion tizimni yuklaydigan firmware
- Tezkor xotira turi
! BIOS/UEFI ona platadagi chipda saqlanadi, qurilmalarni tekshiradi va operatsion tizimni ishga tushiradi.

? RAM va disk haqidagi qaysi gaplar to'g'ri?
+ RAM diskdan ancha tez
+ Disk tok o'chganda ham ma'lumotni saqlaydi
- RAM hajmi odatda diskdan katta
- Dasturlar to'g'ridan-to'g'ri diskda ishlaydi, RAM kerak emas
! RAM — tez, lekin vaqtinchalik va hajmi kichikroq. Dastur ishlashi uchun diskdan RAM'ga yuklanadi.
:::

:::cards
CPU nima qiladi? :: Buyruqlarni bajaradi: fetch (olish) → decode (aniqlash) → execute (bajarish), soniyasiga milliardlab marta.
RAM ning ikki asosiy xususiyati? :: Juda tez va o'zgaruvchan (volatile) — tok o'chsa, tozalanadi.
RAM va disk farqi? :: RAM — hozir ishlayotgan narsalar uchun tez vaqtinchalik xotira; disk — hamma narsa uchun sekinroq doimiy xotira.
Nega RAM xavfsizlik uchun muhim? :: Ishlayotgan dastur ma'lumoti (parollar, kalitlar) u yerda ochiq holda turadi.
O'chirilgan faylni nega tiklab bo'ladi? :: Tizim faqat joyni “bo'sh” deb belgilaydi; ustiga yozilmaguncha ma'lumot diskda qoladi.
Firmware (BIOS/UEFI) nima? :: Qurilmaga yozilgan past darajali dastur; kompyuter yoqilganda birinchi ishga tushib, operatsion tizimni yuklaydi.
HDD va SSD farqi? :: HDD — aylanuvchi magnit disk, arzon va sekin; SSD — chiplarda, tez va qimmatroq.
:::
