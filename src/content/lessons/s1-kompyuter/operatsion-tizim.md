Kompyuteringizda hozir yuzlab dastur bir vaqtda ishlayapti. Ularning hammasi bitta protsessorni, bitta xotirani, bitta diskni talashadi. Brauzer nega o'yin xotirasiga yozib yubormaydi? Nega oddiy dastur tizim fayllarini o'chira olmaydi? Kim bularni tartibga soladi?

**Operatsion tizim.** Va hujumlarning katta qismi aynan uning qoidalarini aylanib o'tishga qaratilgan.

## Operatsion tizim nima qiladi

[[os|Operatsion tizim]] (OT) — hardware va dasturlar orasidagi vositachi. Uning vazifalari:

1. **Resurslarni taqsimlash** — qaysi dastur qachon protsessordan foydalanadi, kimga qancha xotira beriladi.
2. **Qurilmalarni boshqarish** — dastur "faylni saqla" deydi; disk SSD'mi yoki fleshkami — bu OT'ning ishi.
3. **Chegaralarni qo'riqlash** — dasturlarni bir-biridan va foydalanuvchilarni bir-biridan ajratib turadi.
4. **Interfeys berish** — siz kompyuter bilan muloqot qiladigan oynalar yoki buyruqlar satri.

Asosiy operatsion tizimlar:

| Tizim | Qayerda ustun | Sizga nima uchun kerak |
|---|---|---|
| **Windows** | Ish kompyuterlari, korporativ tarmoqlar | Himoya qilinadigan asosiy muhit |
| **Linux** | Serverlar, bulut, xavfsizlik vositalari | Asosiy ish qurolingiz |
| **macOS** | Dasturchi va dizaynerlar kompyuterlari | Uchraydi, lekin kamroq |
| **Android / iOS** | Telefonlar | Mobil xavfsizlik |

Xavfsizlik mutaxassisi kamida ikkitasini — **Windows va Linux**ni — yaxshi bilishi shart.

## Yadro va ikki dunyo

OT'ning markaziy qismi — [[kernel|yadro]] (kernel). U hardware bilan bevosita gaplashadigan yagona dastur va tizimda hamma narsaga ruxsati bor.

Shu sababli OT ikki hududga bo'lingan:

```
┌─────────────────────────────────────────────┐
│  USER SPACE — foydalanuvchi hududi          │
│  Brauzer · O'yin · Matn muharriri · ...     │
│  Cheklangan huquqlar                        │
├──────────────  system call  ────────────────┤
│  KERNEL SPACE — yadro hududi                │
│  Xotira · Jarayonlar · Fayllar · Drayverlar │
│  To'liq huquqlar                            │
├─────────────────────────────────────────────┤
│  HARDWARE — CPU · RAM · Disk · Tarmoq       │
└─────────────────────────────────────────────┘
```

Oddiy dastur diskka o'zi yoza olmaydi. U yadrodan **so'raydi** — bu so'rov **system call** (tizim chaqiruvi) deyiladi. Yadro tekshiradi: "bu dasturga shu faylga yozish mumkinmi?" Mumkin bo'lsa — bajaradi, yo'q bo'lsa — rad etadi.

Bu chegara — butun tizim xavfsizligining poydevori. Brauzeringizdagi zararli sayt sizning fayllaringizni shifrlab tashlay olmasligining sababi shu.

:::key
Hujumchi nuqtai nazaridan: **yadroni egallagan — hamma narsani egallaydi.** Yadro darajasida ishlaydigan zararli dastur (rootkit) o'zini antivirusdan, fayllar ro'yxatidan, jarayonlar ro'yxatidan yashira oladi — chunki bu ro'yxatlarni beradigan aynan yadroning o'zi.
:::

[[driver|Drayverlar]] — qurilmalar bilan ishlash uchun yadroga qo'shiladigan dasturlar — ham yadro hududida ishlaydi. Shuning uchun zaif drayver — tizimning eng xavfli joylaridan biri.

## Jarayon

Diskdagi dastur — shunchaki fayl, o'lik ko'rsatmalar to'plami. Uni ishga tushirganingizda u **jarayon**ga aylanadi.

[[process|Jarayon]] (process) — ishlab turgan dastur nusxasi. Har birining o'ziga xos:

- **PID** (Process ID) — tizimdagi yagona raqami;
- **o'z xotira hududi** — boshqa jarayonlar unga kira olmaydi;
- **egasi** — uni qaysi foydalanuvchi ishga tushirgani;
- **ota jarayoni** (parent) — uni kim yaratgani.

Oxirgi band juda muhim. Jarayonlar bir-birini yaratadi va **daraxt** hosil qiladi:

```
explorer.exe                  ← ish stoli
 ├─ chrome.exe                ← siz brauzerni ochdingiz
 └─ WINWORD.EXE               ← siz Word'ni ochdingiz
     └─ powershell.exe        ← ⚠ Word nega PowerShell ishga tushirdi?
```

Oxirgi qatorga qarang. Word hujjati buyruq qobig'ini ishga tushirishining oddiy sababi yo'q. Bu — zararli makrosli hujjatning klassik belgisi, va SOC analitigi aynan shunday g'alati "ota-bola" juftliklarini qidiradi.

Fonda, oynasiz ishlaydigan jarayonlar [[service|xizmat]] (Windows'da *service*, Linux'da *daemon*) deyiladi: veb-server, antivirus, yangilanish xizmati. Ular kompyuter yoqilishi bilan o'zi ishga tushadi — shuning uchun hujumchilar tizimda mustahkam o'rnashib olish uchun ko'pincha o'z xizmatini yaratadi.

## Foydalanuvchilar va huquqlar

OT har bir harakat uchun "buni kim qilyapti?" degan savolni beradi. Javob — foydalanuvchi hisobi.

Ikki asosiy daraja mavjud:

| | Oddiy foydalanuvchi | Administrator |
|---|---|---|
| Windows'da | Standard user | **Administrator**, undan ham yuqori — **SYSTEM** |
| Linux'da | Oddiy user | **root** |
| O'z fayllari | Ha | Ha |
| Boshqalarning fayllari | Yo'q | Ha |
| Dastur o'rnatish, tizimni o'zgartirish | Yo'q | Ha |
| Himoya vositalarini o'chirish | Yo'q | Ha |

Muhim qoida: **jarayon o'z egasining huquqlarini meros qilib oladi.** Siz oddiy foydalanuvchi sifatida zararli faylni ochsangiz, u ham oddiy foydalanuvchi huquqida ishlaydi. Administrator sifatida ochsangiz — administrator huquqida.

Bundan xavfsizlikning eng asosiy tamoyillaridan biri kelib chiqadi:

:::key
**[[least-privilege|Eng kam imtiyoz]] tamoyili:** har kimga va har bir dasturga faqat ishini bajarish uchun zarur bo'lgan eng kam huquq beriladi. Kundalik ishni administrator hisobida qilmang — o'shanda bitta xato bosish butun tizimni emas, faqat sizning fayllaringizni xavf ostiga qo'yadi.
:::

## Hujumchining yo'li: imtiyozni oshirish

Hujum odatda oddiy foydalanuvchi darajasidan boshlanadi: kimdir soxta xatdagi faylni ochdi. Hujumchi ichkarida, lekin huquqi kam. Unga ko'proq kerak.

Past huquqdan yuqori huquqqa ko'tarilish [[privilege-escalation|imtiyozni oshirish]] (privilege escalation) deyiladi. Bunga erishish yo'llari:

- **OT yoki drayverdagi zaiflik** — yadrodagi xato orqali chegarani buzib o'tish.
- **Noto'g'ri sozlama** — masalan, administrator huquqida ishlaydigan xizmatning fayli hamma tomonidan o'zgartirilishi mumkin.
- **Qoldirilgan parollar** — skriptda, konfiguratsiya faylida, buyruqlar tarixida.

Pentest yo'nalishida bu alohida katta mavzu. Hozir esa g'oyani tushunish yetarli: **tizimga kirish — ishning yarmi; ikkinchi yarmi — tepaga ko'tarilish.**

## Yangilanishlar nega muhim

OT — millionlab qator kod. Unda xatolar bo'lishi muqarrar, va ularning bir qismi — xavfsizlik zaifliklari. Ishlab chiquvchi zaiflikni topsa, [[patch|tuzatish]] chiqaradi.

Lekin tuzatish chiqishi bilan butun dunyo zaiflik qayerda ekanini bilib oladi — hujumchilar ham. Yangilanmagan tizim shu kundan boshlab ochiq nishonga aylanadi. "Keyinroq eslat" tugmasini bosish odati — haqiqiy xavf.

:::try
Jarayonlarni o'z ko'zingiz bilan ko'ring.

**Windows:** Task Manager (`Ctrl + Shift + Esc`) → **Details** yorlig'i. Ustun sarlavhasiga o'ng tugma → **Select columns** → **PID** va **User name** ni yoqing. E'tibor bering: ba'zi jarayonlar sizning nomingizdan, ba'zilari **SYSTEM** nomidan ishlayapti.

**Kali VM (agar tayyor bo'lsa):** terminalda `ps aux | head -20` deb yozing — birinchi ustun foydalanuvchi, ikkinchisi PID. `root` nomidan ishlayotganlarini toping.
:::

## Xulosa

- **OT** resurslarni taqsimlaydi, qurilmalarni boshqaradi va chegaralarni qo'riqlaydi.
- **Yadro** — to'liq huquqli markaz; dasturlar undan **system call** orqali so'raydi.
- **Jarayon** — ishlab turgan dastur: PID, o'z xotirasi, egasi va ota jarayoni bor.
- G'alati ota-bola jarayon juftligi — hujum belgisi.
- Ikki daraja: oddiy foydalanuvchi va **administrator / root**.
- **Eng kam imtiyoz** — faqat zarur huquq.
- Hujumchi past huquqdan boshlab, **imtiyozni oshirishga** intiladi.

:::quiz
? Oddiy dastur diskdagi faylga yozmoqchi. Bu qanday amalga oshadi?
- Dastur diskka to'g'ridan-to'g'ri yozadi
+ Dastur system call orqali yadrodan so'raydi, yadro ruxsatni tekshirib bajaradi
- Dastur avval administrator bo'lib oladi
- Dastur BIOS'ga murojaat qiladi
! Faqat yadro hardware bilan bevosita ishlaydi. Dasturlar undan tizim chaqiruvi orqali so'raydi va yadro har safar ruxsatni tekshiradi.

? Nega yadro darajasidagi zararli dastur (rootkit) ayniqsa xavfli?
- Chunki u ko'p xotira egallaydi
- Chunki uni faqat Linux'da uchratish mumkin
+ Chunki u tizim haqidagi ma'lumotni beradigan qatlamning o'zini nazorat qiladi va o'zini yashira oladi
- Chunki u internetni sekinlashtiradi
! Antivirus va boshqa dasturlar jarayonlar, fayllar ro'yxatini yadrodan oladi. Yadroni egallagan dastur bu ro'yxatlarni soxtalashtira oladi.

? Jarayon daraxtida `WINWORD.EXE → powershell.exe` zanjirini ko'rdingiz. Bu nimani anglatishi mumkin?
- Word yangilanayotganini
- Bu mutlaqo oddiy holat
+ Hujjatdagi zararli makros buyruq bajarayotgan bo'lishi mumkin
- PowerShell buzilganini
! Matn muharririning buyruq qobig'ini ishga tushirishiga odatda sabab yo'q. Bu zararli hujjatlarning klassik belgisi.

? Siz oddiy (administrator bo'lmagan) hisobda ishlayapsiz va zararli faylni ochib qo'ydingiz. U qaysi huquqda ishlaydi?
- Administrator huquqida
- SYSTEM huquqida
+ Sizning oddiy foydalanuvchi huquqingizda
- Hech qanday huquqsiz
! Jarayon uni ishga tushirgan foydalanuvchining huquqlarini meros qilib oladi. Shuning uchun kundalik ishni oddiy hisobda qilish zararni cheklaydi.

? “Eng kam imtiyoz” (least privilege) tamoyili nimani anglatadi?
- Hech kimga hech qanday huquq bermaslik
- Faqat administratorlar kompyuterdan foydalanishi
+ Har kimga faqat ishi uchun zarur bo'lgan minimal huquqni berish
- Parolni iloji boricha qisqa qilish
! Huquq qancha kam bo'lsa, hisob buzilganda yoki xato qilinganda zarar shuncha kam bo'ladi.

? Privilege escalation nima?
- Kompyuter tezligini oshirish
+ Past huquqli hisobdan yuqori huquqqa (administrator/root) ko'tarilish
- Parolni murakkablashtirish
- Yangi foydalanuvchi yaratish
! Hujum odatda oddiy foydalanuvchi darajasidan boshlanadi. To'liq nazorat uchun hujumchi huquqini oshirishi kerak.

? Linux va Windows'dagi eng yuqori huquqli hisoblar qaysilar?
+ Linux'da root
+ Windows'da Administrator va SYSTEM
- Linux'da admin
- Windows'da root
! Linux'da bosh foydalanuvchi — root. Windows'da — Administrator, tizimning o'zi esa undan ham yuqori SYSTEM hisobida ishlaydi.
:::

:::cards
Yadro (kernel) nima? :: OT'ning markaziy qismi: hardware bilan bevosita ishlaydi, xotira va jarayonlarni boshqaradi, to'liq huquqqa ega.
System call nima? :: Dasturning yadrodan biror amalni (fayl ochish, tarmoqqa ulanish) bajarib berishni so'rashi.
Jarayon (process) nima? :: Ishlab turgan dastur nusxasi; o'z PID'i, xotirasi, egasi va ota jarayoni bor.
PID nima? :: Process ID — jarayonning tizimdagi yagona raqami.
Linux va Windows'dagi eng yuqori huquqli hisoblar? :: Linux — root. Windows — Administrator (undan ham yuqori — SYSTEM).
Eng kam imtiyoz tamoyili? :: Har kimga va har dasturga faqat ishi uchun zarur minimal huquq beriladi.
Privilege escalation nima? :: Past huquqli hisobdan administrator/root huquqiga ko'tarilish.
Service / daemon nima? :: Fonda, oynasiz ishlaydigan va odatda tizim bilan birga ishga tushadigan jarayon.
:::
