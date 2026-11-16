Linux'da xavfsizlikning poydevori bitta savol: **kim nima qila oladi?** Veb-server nega tizim fayllarini o'chira olmaydi? Nega bir foydalanuvchi boshqasining hujjatlarini o'qiy olmaydi? Nega parol xeshlari hammaga ko'rinmaydi?

Javob — foydalanuvchilar, guruhlar va ruxsatlar tizimida. Uni to'g'ri sozlash — tizim ma'murining asosiy vazifasi; noto'g'ri sozlanganini topish — tekshiruvchining vazifasi. Bu darsda tizim qanday ishlashini va uni qanday to'g'ri sozlashni o'rganasiz.

## Foydalanuvchilar

Linux har bir foydalanuvchini nom bilan emas, **raqam** bilan taniydi — **UID** (User ID):

| UID | Kim |
|---|---|
| **0** | [[root|root]] — cheksiz huquq |
| 1 – 999 | Tizim hisoblari: xizmatlar uchun (`www-data`, `sshd`, `mysql`) |
| 1000 + | Oddiy odamlar |

Tizim hisoblari — muhim g'oya: veb-server `root` nomidan emas, o'zining cheklangan `www-data` hisobidan ishlaydi. Shunda veb-saytdagi muammo butun tizimga emas, faqat shu hisobning tor doirasiga ta'sir qiladi. Bu — [[least-privilege|eng kam imtiyoz]] tamoyilining amaldagi ko'rinishi.

### /etc/passwd

Barcha foydalanuvchilar ro'yxati — [[passwd-file|/etc/passwd]]. Uni **hamma o'qiy oladi**:

```
talaba:x:1000:1000:Talaba,,,:/home/talaba:/bin/bash
  │    │  │    │       │          │          │
  │    │  │    │       │          │          └─ kirishdagi shell
  │    │  │    │       │          └─ uy katalogi
  │    │  │    │       └─ izoh (to'liq ism)
  │    │  │    └─ asosiy guruh ID (GID)
  │    │  └─ UID
  │    └─ "x" — parol /etc/shadow da
  └─ foydalanuvchi nomi
```

Oxirgi maydonga e'tibor bering. `/bin/bash` — bu hisob bilan tizimga kirib, buyruq yozish mumkin. `/usr/sbin/nologin` yoki `/bin/false` — kirib bo'lmaydi; xizmat hisoblari shunday bo'lishi kerak.

Tekshiruvda foydali ikki qidiruv:

```bash
grep -v -e nologin -e false /etc/passwd     # tizimga kira oladigan hisoblar
awk -F: '$3 == 0' /etc/passwd               # UID 0 bo'lgan hisoblar
```

Ikkinchi buyruq faqat `root` ni ko'rsatishi kerak. Boshqa nom chiqsa — bu jiddiy signal: kimdir tizimda ikkinchi cheksiz huquqli hisob yaratgan. Server auditida bu doim tekshiriladi.

### /etc/shadow

Parollar (aniqrog'i, ularning xeshlari) — [[shadow-file|/etc/shadow]] da. Uni **faqat root** o'qiy oladi:

```
talaba:$y$j9T$Kx8...uzun_xesh...:19800:0:99999:7:::
  │      │
  │      └─ parol xeshi ($y$ — yescrypt, $6$ — SHA-512)
  └─ foydalanuvchi nomi
```

Xesh — parolning o'zi emas. Lekin u begona qo'lga tushsa, zaif parolni lug'at bo'yicha taxmin qilish mumkin bo'lib qoladi. Shuning uchun ikki himoya birga ishlaydi: **faylga qat'iy ruxsat** va **kuchli parollar**. Xesh va parollar mavzusiga 5-bosqichda batafsil qaytamiz.

### Guruhlar

[[group|Guruh]] — bir xil huquq beriladigan foydalanuvchilar to'plami. Ro'yxati — `/etc/group`.

```bash
id              # mening UID, GID va barcha guruhlarim
groups          # faqat guruhlar
```

```
uid=1000(talaba) gid=1000(talaba) groups=1000(talaba),27(sudo)
```

Guruhlar huquqni qulay boshqarish imkonini beradi: yangi dasturchi keldi — uni `dasturchilar` guruhiga qo'shasiz, va u kerakli hamma narsaga kirish oladi. Ketdi — guruhdan chiqarasiz.

Ba'zi guruhlar juda katta huquq beradi (`sudo`, `adm`, `docker`). Kim qaysi guruhda ekanini vaqti-vaqti bilan ko'zdan kechirish — xavfsizlik gigiyenasining bir qismi.

## Ruxsatlar

`ls -l` chiqishining birinchi ustuni:

```
-rwxr-xr--  1 talaba dasturchilar  2048 Nov 16 09:00 skript.sh
│└┬┘└┬┘└┬┘
│ │  │  └── boshqalar (others):  r--
│ │  └───── guruh (group):       r-x
│ └──────── egasi (user):        rwx
└────────── turi: - fayl, d katalog, l havola
```

Uch toifa — **egasi**, **guruh**, **boshqalar** — har biriga uch ruxsat:

| Belgi | Nomi | **Fayl** uchun | **Katalog** uchun |
|---|---|---|---|
| `r` | read | Mazmunini o'qish | Ichidagilar ro'yxatini ko'rish (`ls`) |
| `w` | write | Mazmunini o'zgartirish | Ichida fayl yaratish, o'chirish, nomini o'zgartirish |
| `x` | execute | Dastur sifatida ishga tushirish | Ichiga kirish (`cd`) va ichidagi fayllarga murojaat |

Katalog ustuni yangi boshlovchilarni ko'p chalg'itadi. Eng muhim oqibati:

:::key
**Faylni o'chirish yoki almashtirish huquqi fayl ruxsatiga emas, u turgan katalog ruxsatiga bog'liq.** Shuning uchun muhim fayllar turgan katalogga kim yoza olishi — faylning o'z ruxsati kabi muhim. Auditda ikkalasi ham tekshiriladi.
:::

Tizim ruxsatni shu tartibda tekshiradi: egasimisiz? → egasi ruxsatlari. Yo'q, guruhdamisiz? → guruh ruxsatlari. Yo'q? → boshqalar ruxsatlari. **Faqat bittasi** qo'llanadi.

## chmod — ruxsatni o'zgartirish

### Raqamli usul

Har bir ruxsatning qiymati bor: **r = 4, w = 2, x = 1**. Ular qo'shiladi:

| Raqam | Hisob | Ruxsat |
|---|---|---|
| 7 | 4 + 2 + 1 | `rwx` |
| 6 | 4 + 2 | `rw-` |
| 5 | 4 + 1 | `r-x` |
| 4 | 4 | `r--` |
| 0 | — | `---` |

Uchta raqam — egasi, guruh, boshqalar:

```bash
chmod 644 fayl.txt      # rw-r--r--   oddiy fayl
chmod 755 skript.sh     # rwxr-xr-x   dastur, katalog
chmod 600 kalit.pem     # rw-------   faqat men
chmod 700 maxfiy/       # rwx------   faqat men kira olaman
```

Tanish tuyulyaptimi? Bu — **ikkilik sanoq**: `rwx` = `111` = 7, `r-x` = `101` = 5. Birinchi bosqich yana ish berdi.

| Ruxsat | Qayerda ishlatiladi |
|---|---|
| **644** | Oddiy fayllar: men yozaman, hamma o'qiydi |
| **755** | Dasturlar va kataloglar |
| **600** | Maxfiy fayllar: SSH yopiq kaliti, parolli sozlamalar |
| **700** | Shaxsiy kataloglar (`~/.ssh`) |
| **777** | **Deyarli hech qachon** |

:::warn
`chmod 777` — muammoni "hal qilishning" eng yomon usuli. Internetdagi maslahatlarda tez-tez uchraydi: "ishlamayaptimi? 777 qiling". Ha, ishlaydi — chunki endi tizimdagi **har bir** hisob bu fayl bilan hamma narsani qila oladi. To'g'ri yo'l: kimga aynan qaysi huquq yetishmayotganini aniqlab, faqat shuni berish.
:::

### Belgili usul

```bash
chmod u+x skript.sh     # egasiga bajarish huquqini qo'shish
chmod g-w fayl.txt      # guruhdan yozish huquqini olib tashlash
chmod o-rwx fayl.txt    # boshqalardan hammasini olib tashlash
chmod a+r fayl.txt      # hammaga o'qish huquqi
chmod u=rw,go=r fayl    # aniq belgilash
```

`u` — user (egasi), `g` — group, `o` — others, `a` — all. `+` qo'shadi, `-` oladi, `=` aniq o'rnatadi.

Raqamli usul — hammasini birdan o'rnatish uchun; belgili — bitta narsani o'zgartirish uchun.

### chown — egasini o'zgartirish

```bash
sudo chown ali fayl.txt            # egasi
sudo chown ali:dasturchilar fayl   # egasi va guruhi
sudo chown -R www-data /var/www    # katalog va ichidagi hamma narsa
```

### umask — yangi fayllar qanday ruxsat bilan tug'iladi

Yangi fayl yaratganingizda u odatda `644`, katalog esa `755` bo'ladi. Buni `umask` qiymati belgilaydi (standart — `022`): u "olib tashlanadigan" ruxsatlarni ko'rsatadi. Maxfiy ma'lumot bilan ishlaydigan serverlarda `umask 077` qo'yiladi — yangi fayllar faqat egasiga ochiq bo'ladi.

## sudo — nazorat ostidagi root

Root sifatida doimiy ishlash xavfli: bitta xato buyruq butun tizimga ta'sir qiladi, va kim nima qilganini bilib bo'lmaydi. [[sudo|sudo]] buni hal qiladi:

- foydalanuvchi **o'z** paroli bilan tasdiqlaydi — root parolini hech kim bilmasligi mumkin;
- faqat **bitta buyruq** root huquqida bajariladi;
- har bir chaqiruv **jurnalga yoziladi** (`/var/log/auth.log`) — kim, qachon, nima.

Kim nima qila olishini `/etc/sudoers` fayli belgilaydi. Uni faqat `sudo visudo` orqali tahrirlang — u saqlashdan oldin sintaksisni tekshiradi (xato bilan saqlangan sudoers fayli sudo'ni butunlay ishdan chiqarishi mumkin).

O'z huquqlaringizni ko'rish:

```bash
sudo -l
```

```
User talaba may run the following commands on kali:
    (ALL : ALL) ALL
```

Serverlarda yaxshi amaliyot — **hammaga `ALL` bermaslik**. Masalan, zaxira nusxa oluvchi hisobga faqat zaxira skriptini ishga tushirish huquqi beriladi.

:::info
sudo qoidalarini yozishda ehtiyot bo'ling: ko'p oddiy dasturlar (muharrirlar, qidiruv va arxiv vositalari) ichidan boshqa buyruq ishga tushirish imkonini beradi. Bunday dasturga root huquqini berish — amalda to'liq root berish bilan teng. Shuning uchun sudoers qoidalari auditda alohida ko'rib chiqiladi, pentest yo'nalishida esa bu alohida mavzu.
:::

## Maxsus bitlar

Oddiy `rwx` dan tashqari uchta maxsus bit bor.

### SUID

Odatda dastur uni **ishga tushirgan** odam huquqida ishlaydi. [[suid|SUID]] biti o'rnatilgan dastur esa **fayl egasi** huquqida ishlaydi.

Nima uchun kerak? Oddiy foydalanuvchi o'z parolini o'zgartira olishi kerak — lekin parollar `/etc/shadow` da, uni faqat root o'zgartira oladi. Yechim: `passwd` dasturi root'ga tegishli va SUID bitiga ega.

```
$ ls -l /usr/bin/passwd
-rwsr-xr-x 1 root root 68208 /usr/bin/passwd
   ↑
   x o'rnida "s" — SUID biti
```

SUID — kerakli, lekin sezgir mexanizm: bunday dasturdagi har qanday xato root darajasidagi muammoga aylanadi. Shuning uchun:

- tizimda SUID fayllar **imkon qadar kam** bo'lishi kerak;
- ularning ro'yxati ma'lum bo'lishi va vaqti-vaqti bilan solishtirib turilishi kerak.

Auditda SUID fayllar ro'yxati shunday olinadi:

```bash
find / -perm -4000 -type f 2>/dev/null
```

Toza tizimda bu o'nlab standart dasturlarni ko'rsatadi (`passwd`, `sudo`, `su`, `mount`…). Ro'yxatda **kutilmagan** narsa paydo bo'lishi — masalan, uy katalogidagi yoki `/tmp` dagi SUID fayl — jiddiy ogohlantirish.

### SGID va sticky bit

| Bit | Belgisi | Nima qiladi |
|---|---|---|
| **SGID** | guruh ustunida `s` | Dastur fayl guruhi huquqida ishlaydi; katalogda — yangi fayllar katalog guruhini meros oladi |
| **Sticky** | oxirida `t` | Katalogda: faylni faqat **o'z egasi** o'chira oladi |

Sticky bit'ning klassik joyi — `/tmp`:

```
$ ls -ld /tmp
drwxrwxrwt 15 root root 4096 /tmp
         ↑
```

`/tmp` ga hamma yoza oladi (777), lekin `t` tufayli siz boshqa odamning faylini o'chira olmaysiz. Usiz umumiy katalog tartibsizlikka aylanardi.

## Ruxsatlarni tekshirish ro'yxati

Serverni ko'zdan kechirganda quyidagilarga qarang:

| Nimani | Qanday bo'lishi kerak |
|---|---|
| `/etc/shadow` | Faqat root o'qiydi (640 yoki 600) |
| `~/.ssh` katalogi | 700 |
| SSH yopiq kalitlari | 600 |
| Parolli sozlama fayllari | 600 yoki 640, tegishli xizmat hisobiga |
| UID 0 hisoblar | Faqat `root` |
| Hamma yoza oladigan fayllar | Minimal; tizim va veb kataloglarida — yo'q |
| SUID fayllar | Faqat standart, ma'lum ro'yxat |
| sudoers | Aniq, minimal qoidalar |
| Xizmatlar | Root emas, alohida cheklangan hisobdan ishlaydi |

Hamma yoza oladigan fayllarni topish:

```bash
find / -xdev -type f -perm -0002 2>/dev/null
```

Bu ro'yxat — CIS Benchmarks kabi mustahkamlash (hardening) standartlarining soddalashtirilgan ko'rinishi. Cloud va SOC yo'nalishlarida ular bilan to'liq ishlaysiz.

## Amaliyot

Labda ruxsatlarni o'qiysiz, `chmod` ni ikkala usulda ishlatasiz va `sudo` qachon kerakligini ko'rasiz:

:::lab ruxsatlar

## Xulosa

- Foydalanuvchi — bu **UID**; **0** — root; xizmatlar alohida cheklangan hisoblardan ishlaydi.
- `/etc/passwd` — hisoblar ro'yxati (hamma o'qiydi); `/etc/shadow` — xeshlar (faqat root).
- Ruxsatlar: **egasi / guruh / boshqalar** × **r / w / x**.
- Katalogda: `r` — ro'yxat, `w` — yaratish va o'chirish, `x` — kirish.
- **r=4, w=2, x=1**: 644, 755, 600, 700. **777 — deyarli hech qachon.**
- `chmod` — ruxsat, `chown` — ega.
- **sudo** — bitta buyruq root huquqida, jurnalga yoziladi; `sudo -l` — huquqlarim; tahrirlash — `visudo`.
- **SUID** — dastur egasi huquqida ishlaydi; ro'yxati qisqa va nazorat ostida bo'lishi kerak.
- **Sticky bit** — umumiy katalogda faylni faqat egasi o'chiradi.

:::quiz
? `chmod 640 hisobot.txt` dan keyin ruxsatlar qanday ko'rinadi?
- rwxr-----
+ rw-r-----
- rw-rw----
- rw-r--r--
! 6 = rw- (egasi), 4 = r-- (guruh), 0 = --- (boshqalar).

? `/etc/passwd` va `/etc/shadow` orasidagi farq nima?
- Ular bir xil ma'lumotni saqlaydi
+ passwd — hisoblar ro'yxati, hamma o'qiydi; shadow — parol xeshlari, faqat root o'qiydi
- passwd da parollar ochiq saqlanadi
- shadow faqat root hisobi uchun
! Parol xeshlari ataylab alohida, yopiq faylga ko'chirilgan — passwd ni esa ko'p dasturlar o'qishi kerak.

? Katalogdagi `x` (execute) ruxsati nimani anglatadi?
- Katalogni dastur sifatida ishga tushirish
+ Katalog ichiga kirish va ichidagi fayllarga murojaat qilish
- Katalogni o'chirish
- Katalog ichidagilar ro'yxatini ko'rish
! Katalog uchun x — “o'tish” huquqi. Ro'yxatni ko'rish — r, ichida yaratish va o'chirish — w.

? SSH yopiq kaliti fayli uchun qaysi ruxsat to'g'ri?
- 777
- 644
+ 600
- 755
! Yopiq kalitni faqat egasi o'qiy olishi kerak. SSH o'zi ham kengroq ruxsatli kalitni qabul qilishdan bosh tortadi.

? Nega `chmod 777` yomon amaliyot?
- U faylni o'chirib yuboradi
+ U tizimdagi har bir hisobga faylni o'qish, o'zgartirish va ishga tushirish huquqini beradi
- U faqat root uchun ishlaydi
- U faylni yashirin qiladi
! 777 — hamma uchun to'liq huquq. To'g'ri yo'l — kimga aynan nima kerakligini aniqlab, faqat shuni berish.

? `awk -F: '$3 == 0' /etc/passwd` buyrug'i `root` dan tashqari yana bir hisobni ko'rsatdi. Bu nimani anglatadi?
- Bu oddiy holat
- Tizim yangilanishi kerak
+ Tizimda root bilan teng huquqli ikkinchi hisob bor — jiddiy tekshiruv talab qiladi
- Parol muddati tugagan
! UID 0 — cheksiz huquq. Odatda u faqat root'da bo'ladi; boshqa UID 0 hisob — ruxsatsiz o'zgarish belgisi bo'lishi mumkin.

? sudo ning doim root sifatida ishlashdan afzalligi nimada?
+ Har bir chaqiruv jurnalga yoziladi — kim nima qilgani ma'lum
+ Root huquqi faqat bitta buyruq uchun beriladi
- sudo buyruqlarni tezroq bajaradi
- sudo parol talab qilmaydi
! sudo hisobdorlik va cheklash beradi: huquq qisqa muddatli va har bir amal qayd etiladi.

? SUID biti o'rnatilgan dastur kimning huquqida ishlaydi?
- Uni ishga tushirgan foydalanuvchining
+ Fayl egasining
- Doim oddiy foydalanuvchining
- Hech kimning
! SUID bilan dastur fayl egasi nomidan ishlaydi. Masalan, passwd root'ga tegishli — shuning uchun /etc/shadow ni yangilay oladi.

? `/tmp` katalogidagi sticky bit (`t`) nima uchun kerak?
- Fayllarni shifrlash uchun
+ Hamma yoza oladigan katalogda faylni faqat o'z egasi o'chira olishi uchun
- Katalogni yashirish uchun
- Fayllarni avtomatik o'chirish uchun
! Sticky bit'siz umumiy katalogda istalgan foydalanuvchi boshqalarning fayllarini o'chira olardi.

? `/etc/sudoers` faylini qanday tahrirlash to'g'ri?
- nano /etc/sudoers
+ sudo visudo
- echo bilan qator qo'shish
- chmod 777 qilib, keyin tahrirlash
! visudo saqlashdan oldin sintaksisni tekshiradi. Xato bilan saqlangan sudoers sudo'ni ishdan chiqarishi mumkin.
:::

:::cards
UID 0 kim? :: root — cheksiz huquqli bosh foydalanuvchi.
/etc/passwd va /etc/shadow da nima bor? :: passwd — hisoblar ro'yxati (hamma o'qiydi); shadow — parol xeshlari (faqat root).
r, w, x ning raqamli qiymatlari? :: r = 4, w = 2, x = 1.
644, 755, 600, 700 qanday ruxsatlar? :: 644 — rw-r--r--; 755 — rwxr-xr-x; 600 — rw-------; 700 — rwx------.
Katalog uchun r, w, x nima beradi? :: r — ichidagilar ro'yxati; w — fayl yaratish va o'chirish; x — ichiga kirish.
chmod va chown farqi? :: chmod — ruxsatlarni, chown — egasi va guruhini o'zgartiradi.
sudo -l nima ko'rsatadi? :: Joriy foydalanuvchi sudo bilan qaysi buyruqlarni bajara olishini.
SUID biti nima? :: Dastur uni ishga tushirgan kishi emas, fayl egasi huquqida ishlaydi (ls -l da x o'rnida s).
SUID fayllar ro'yxatini olish? :: find / -perm -4000 -type f 2>/dev/null
Sticky bit nima qiladi? :: Umumiy katalogda (masalan /tmp) faylni faqat o'z egasi o'chira oladi.
sudoers faylini qanday tahrirlanadi? :: sudo visudo — sintaksisni tekshirib saqlaydi.
:::
