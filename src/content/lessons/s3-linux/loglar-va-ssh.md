Serverda nimadir sodir bo'ldi. Kim kirdi? Qachon? Qayerdan? Nima qildi? Bu savollarga faqat bitta manba javob beradi — **jurnallar** (loglar). Ular tizimning xotirasi: har bir kirish, har bir xato, har bir `sudo` chaqiruvi yozib boriladi.

Bu darsning ikkinchi yarmi — **SSH**: serverlarga kirishning asosiy eshigi. Uni to'g'ri sozlash — himoyaning birinchi qadami, va uning jurnali — tergovning birinchi manbai. Shuning uchun bu ikki mavzu birga.

## Jurnallar qayerda

Linux'da jurnallarning asosiy uyi — `/var/log`:

| Fayl | Nima yoziladi |
|---|---|
| `/var/log/auth.log` | Kirishlar, `sudo`, SSH — **autentifikatsiyaga oid hamma narsa** (RHEL oilasida: `/var/log/secure`) |
| `/var/log/syslog` | Tizimning umumiy jurnali (RHEL'da: `/var/log/messages`) |
| `/var/log/kern.log` | Yadro xabarlari |
| `/var/log/dpkg.log`, `/var/log/apt/` | Qaysi paket qachon o'rnatilgan yoki o'chirilgan |
| `/var/log/nginx/`, `/var/log/apache2/` | Veb-server: `access.log` (har bir so'rov), `error.log` |
| `/var/log/wtmp`, `/var/log/btmp`, `/var/log/lastlog` | Kirishlar tarixi (ikkilik formatda — maxsus buyruqlar bilan o'qiladi) |

Ko'p jurnallarni o'qish uchun `sudo` kerak — ular sezgir ma'lumot.

[[log|Jurnal]] qatorining tuzilishi odatda bir xil:

```
Nov 16 03:12:01 srv sshd[2211]: Failed password for root from 203.0.113.45 port 51122 ssh2
└─────┬──────┘  └┬┘ └───┬────┘  └────────────────────────┬─────────────────────────────┘
    vaqt       host  dastur[PID]                       xabar
```

**Vaqt, qayerda, kim, nima** — to'rt savolga javob. Oldingi darslarda aynan shu qator ustida `grep` va `awk` bilan ishlagansiz.

## journalctl — systemd jurnali

Zamonaviy tizimlarda xizmatlarning xabarlari systemd'ning o'z jurnaliga ham tushadi. U ikkilik formatda, lekin qidirish uchun juda qulay:

```bash
journalctl                          # hammasi (eng eskisidan)
journalctl -e                       # oxiriga o'tish
journalctl -f                       # jonli kuzatish
journalctl -u ssh                   # faqat SSH xizmati
journalctl -u nginx --since today
journalctl --since "2026-11-16 03:00" --until "2026-11-16 04:00"
journalctl -p err                   # faqat xatolar va undan jiddiylari
journalctl -b                       # oxirgi yuklanishdan beri
journalctl _UID=1000                # aniq foydalanuvchining jarayonlari
```

`--since` va `--until` — tergovning asosiy quroli: "o'sha kecha soat 3 dan 4 gacha nima bo'lgan?"

Ba'zi yangi tizimlarda `/var/log/auth.log` umuman yo'q — hammasi faqat journald'da. Unda: `journalctl -u ssh`.

## Kim kirgan va hozir kim ichkarida

```bash
who                 # hozir tizimda kimlar bor
w                   # xuddi shu + nima qilishyapti
last                # oxirgi muvaffaqiyatli kirishlar tarixi
last -n 20          # oxirgi 20 tasi
sudo lastb          # MUVAFFAQIYATSIZ kirish urinishlari
lastlog             # har bir hisob oxirgi marta qachon kirgan
```

```
$ last -n 3
ali      pts/0    10.0.0.5         Mon Nov 16 09:12   still logged in
deploy   pts/1    203.0.113.45     Mon Nov 16 03:14 - 03:41  (00:27)
ali      pts/0    10.0.0.5         Sun Nov 15 18:02 - 22:15  (04:13)
```

Ikkinchi qatorga qarang: `deploy` hisobi tungi soat 3 da, notanish tashqi manzildan kirgan va 27 daqiqa ichkarida bo'lgan. Bitta buyruq — va tergov uchun boshlang'ich nuqta tayyor.

## Jurnaldan nimani qidirish kerak

Server jurnalini ko'zdan kechirganda diqqat qilinadigan narsalar:

| Belgi | Qanday qidiriladi |
|---|---|
| Ko'p muvaffaqiyatsiz kirish | `grep "Failed password" /var/log/auth.log` |
| Ulardan **keyingi** muvaffaqiyatli kirish | `grep "Accepted" /var/log/auth.log` |
| Odatiy bo'lmagan vaqt yoki manzildan kirish | `last`, `grep "Accepted"` |
| `sudo` ishlatilishi | `grep "sudo:" /var/log/auth.log` |
| Yangi hisob yaratilishi | `grep -E "useradd\|new user" /var/log/auth.log` |
| Yangi o'rnatilgan dasturlar | `grep " install " /var/log/dpkg.log` |
| Xizmatning to'xtashi yoki qayta ishga tushishi | `journalctl -u xizmat` |

Eng muhim naqsh — birinchi ikki qatorning birikmasi:

:::key
**Muvaffaqiyatsiz urinishlar — shovqin. Ulardan keyingi muvaffaqiyatli kirish — signal.** Internetga ochiq har qanday server kuniga minglab parol terish urinishini ko'radi; bu odatiy fon. Haqiqiy savol: shu manzillardan birortasi **kira oldimi?** Tahlilni doim shu savol bilan yakunlang.
:::

Veb-server jurnali (`access.log`) ham xuddi shunday o'qiladi:

```
203.0.113.45 - - [16/Nov/2026:03:20:11 +0500] "GET /admin HTTP/1.1" 404 162 "-" "Mozilla/5.0"
     │                    │                      │      │         │   │         │
   klient               vaqt                   metod   yo'l    status hajm   User-Agent
```

HTTP darsidagi hamma narsa shu yerda: metod, yo'l, status kodi, User-Agent. Bitta manzildan qisqa vaqtda yuzlab 404 — kimdir mavjud bo'lmagan sahifalarni izlayapti.

## Jurnallarning o'zini himoya qilish

Jurnallar faqat ishonchli bo'lsagina foydali. Uch muammo va uch yechim:

**Joy tugaydi.** Jurnallar cheksiz o'sadi. `logrotate` ularni muntazam aylantiradi: eskisini siqadi (`auth.log.1`, `auth.log.2.gz`…) va belgilangan muddatdan keyin o'chiradi. Shuning uchun eski hodisani qidirganda siqilgan fayllarga ham qarang: `zgrep "Failed" /var/log/auth.log.*.gz`.

**Tizimga root sifatida kirgan kishi jurnallarni o'zgartira oladi.** Yechim — **markazlashgan jurnal yig'ish**: har bir yozuv darhol boshqa, alohida himoyalangan serverga ham yuboriladi. Lokal nusxa o'zgartirilsa ham, markaziy nusxa saqlanib qoladi. [[siem|SIEM]] tizimlari aynan shu g'oya ustiga qurilgan — SOC yo'nalishida ular bilan ishlaysiz.

**Vaqt noto'g'ri.** Turli serverlar jurnallarini solishtirish uchun soatlar bir xil bo'lishi kerak. Shuning uchun vaqt sinxronlash (NTP) — xavfsizlik talabi: `timedatectl` bilan tekshiriladi.

:::info
Jurnalda **bo'shliq** — kutilmagan uzilish, soatlab yozuv yo'qligi yoki fayl hajmining birdan kichrayishi — o'zi ham topilma. "Nima yozilgan?" bilan birga "nima yozilmagan?" degan savolni ham bering.
:::

## SSH — serverga kirish eshigi

[[ssh|SSH]] haqida tarmoq bosqichida gaplashdik: shifrlangan masofaviy boshqaruv, TCP 22. Endi u bilan ishlaymiz.

```bash
ssh ali@10.10.10.5              # ulanish
ssh -p 2222 ali@10.10.10.5      # nostandart portda
ssh ali@server "uptime"         # bitta buyruq bajarib, chiqish
exit                            # seansni yopish (yoki Ctrl + D)
```

Birinchi ulanishda shunday savol chiqadi:

```
The authenticity of host '10.10.10.5' can't be established.
ED25519 key fingerprint is SHA256:Xk3...
Are you sure you want to continue connecting (yes/no)?
```

Bu — server o'z "barmoq izi"ni ko'rsatyapti. `yes` desangiz, u `~/.ssh/known_hosts` ga saqlanadi va keyingi safar jimgina solishtiriladi.

:::warn
Agar bir kuni **tanish** serverga ulanayotganda `WARNING: REMOTE HOST IDENTIFICATION HAS CHANGED!` degan ogohlantirish chiqsa — to'xtang. Ikki ehtimol bor: server qayta o'rnatilgan, yoki kimdir siz bilan server orasiga tushib olgan (tarmoq bosqichidagi Man-in-the-Middle). Sababini aniqlamasdan davom etmang.
:::

### Fayl ko'chirish

```bash
scp fayl.txt ali@server:/tmp/           # serverga yuborish
scp ali@server:/var/log/auth.log .      # serverdan olish
scp -r katalog ali@server:~/            # katalogni
```

## Kalit bilan kirish

Parol — zaif bo'g'in: uni terib topish mumkin, uni boshqa joyda ishlatgan bo'lishingiz mumkin. [[ssh-key|SSH kaliti]] — ancha kuchli usul.

Bu **juft kalit**:

| | Yopiq kalit (private) | Ochiq kalit (public) |
|---|---|---|
| Fayl | `~/.ssh/id_ed25519` | `~/.ssh/id_ed25519.pub` |
| Qayerda turadi | **Faqat sizning kompyuteringizda** | Serverda |
| Kimga beriladi | Hech kimga, hech qachon | Istalgan kishiga |
| O'xshatish | Kalit | Qulf |

Server sizga faqat yopiq kalit egasi yecha oladigan "jumboq" yuboradi. Yopiq kalitning o'zi tarmoq orqali **hech qachon uzatilmaydi** — shuning uchun uni yo'lda ushlab olib bo'lmaydi.

### Sozlash — uch qadam

**1. Juft kalit yaratish** (o'z kompyuteringizda):

```bash
ssh-keygen -t ed25519 -C "ali@noutbuk"
```

Saqlash joyini so'raydi (Enter — standart) va **passphrase** — kalitning o'z paroli. Uni bo'sh qoldirmang: noutbukingiz yoki kalit fayli begona qo'lga tushsa, passphrase oxirgi himoya bo'ladi.

**2. Ochiq kalitni serverga joylash:**

```bash
ssh-copy-id ali@10.10.10.5
```

Bu buyruq `.pub` fayl mazmunini serverdagi `~/.ssh/authorized_keys` fayliga qo'shadi.

**3. Tekshirish:**

```bash
ssh ali@10.10.10.5
```

Endi server parolini emas, (agar qo'ygan bo'lsangiz) kalit passphrase'ini so'raydi.

### Ruxsatlar — SSH ularga qattiq qaraydi

| Yo'l | Ruxsat |
|---|---|
| `~/.ssh/` | `700` |
| Yopiq kalit (`id_ed25519`) | `600` |
| `authorized_keys` | `600` |
| Ochiq kalit (`.pub`) | `644` |

Yopiq kalit boshqalarga o'qish uchun ochiq bo'lsa, SSH uni ishlatishdan **bosh tortadi** (`UNPROTECTED PRIVATE KEY FILE!`). Ruxsatlar darsidagi `600` — mana shu yerda.

### Kalitlar va xavfsizlik

Yopiq kalit — bu serverga kirish huquqining o'zi. Shuning uchun:

- Uni hech qachon pochta, messenjer yoki Git orqali yubormang.
- Har bir qurilma uchun **alohida** kalit yarating — biri yo'qolsa, faqat o'shani bekor qilasiz.
- Xodim ketganda uning ochiq kalitini `authorized_keys` dan olib tashlang.

`authorized_keys` — auditning doimiy nuqtasi: unda **kimga tegishli ekani noma'lum** kalit bo'lmasligi kerak. Bu fayldagi har bir qator — parolsiz kirish huquqi.

## SSH serverni mustahkamlash

Server sozlamalari — `/etc/ssh/sshd_config`. Asosiy qatorlar:

```
PermitRootLogin no              # root to'g'ridan-to'g'ri kira olmaydi
PasswordAuthentication no       # faqat kalit bilan
PubkeyAuthentication yes
MaxAuthTries 3                  # urinishlar soni cheklangan
AllowUsers ali deploy           # faqat shu hisoblar
```

| Sozlama | Nega |
|---|---|
| `PermitRootLogin no` | Hujumchi hisob nomini ham topishi kerak bo'ladi; har bir amal aniq odamga bog'lanadi |
| `PasswordAuthentication no` | Parol terish hujumi ma'nosini yo'qotadi |
| `AllowUsers` | Hujum yuzasi torayadi |

O'zgartirishdan keyin:

```bash
sudo sshd -t                    # sintaksisni tekshirish
sudo systemctl reload ssh       # sozlamani qo'llash
```

:::warn
Parol bilan kirishni o'chirishdan **oldin** kalit bilan kirish ishlayotganiga ishonch hosil qiling — va joriy seansni yopmasdan, **ikkinchi terminalda** yangi ulanishni sinab ko'ring. Aks holda o'zingizni serverdan qulflab qo'yasiz. Bu — tizim ma'murlarining klassik xatosi.
:::

Qo'shimcha qatlamlar:

- **fail2ban** — jurnalni kuzatadi va ko'p xato qilgan manzilni firewall orqali vaqtincha bloklaydi. Bu darsning ikki mavzusi shu yerda uchrashadi: jurnal → avtomatik himoya.
- **Firewall** — SSH ga faqat ma'lum manzillardan ruxsat.
- **VPN** — SSH ni internetga umuman ochmaslik.

Portni 22 dan boshqasiga ko'chirish jurnaldagi shovqinni kamaytiradi, lekin himoya emas — tarmoq bosqichidan bilasiz: port raqami shunchaki kelishuv.

## Amaliyot

Labda server jurnalini tahlil qilasiz: kim hujum qilgan va u ichkariga kira olganmi?

:::lab grep-va-pipe

:::try
Kali VM'ingizda:

```bash
last -n 10
sudo lastb | head
journalctl -u ssh --since today
ls -la ~/.ssh 2>/dev/null
```

Keyin o'zingiz uchun kalit yarating: `ssh-keygen -t ed25519`. `ls -la ~/.ssh` bilan ikkala faylning ruxsatlarini ko'ring va `cat ~/.ssh/id_ed25519.pub` bilan ochiq kalitni o'qing — u bitta uzun qator. Yopiq kalitni esa hech kimga ko'rsatmang.

Ikkita VM'ingiz bo'lsa, birida SSH serverni yoqing (`sudo systemctl enable --now ssh`), ikkinchisidan avval parol bilan, keyin `ssh-copy-id` orqali kalit bilan ulaning — va birinchi mashinada `sudo tail -f /var/log/auth.log` (yoki `journalctl -u ssh -f`) orqali o'z kirishingizni jurnalda kuzating.
:::

## Bosqich yakuni

Tabriklaymiz — Linux bosqichi tugadi. Siz endi terminalda yura olasiz, fayllarni topasiz va tahlil qilasiz, ruxsatlarni o'qiysiz va sozlaysiz, jarayon va xizmatlarni boshqarasiz, skript yozasiz va jurnaldan voqealar zanjirini tiklaysiz.

Bu ko'nikmalar faqat mashq bilan mustahkamlanadi. **OverTheWire Bandit** ni oxirigacha o'ting va Kali'ni kundalik mashq maydoningizga aylantiring.

## Xulosa

- Jurnallar — `/var/log`: **auth.log** (kirishlar, sudo, SSH), syslog, veb-server jurnallari.
- `journalctl -u xizmat --since ...` — systemd jurnalidan qidirish.
- `who`, `w`, `last`, `lastb` — kim ichkarida va kim kirgan.
- **Muvaffaqiyatsiz urinishlar — shovqin; ulardan keyingi muvaffaqiyatli kirish — signal.**
- Jurnallar markaziy serverga yuboriladi; vaqt sinxron bo'lishi kerak; jurnaldagi bo'shliq — topilma.
- SSH: `ssh foydalanuvchi@server`, `scp` — fayl ko'chirish.
- **Kalit juftligi**: yopiq kalit faqat sizda (600), ochiq kalit serverdagi `authorized_keys` da.
- Mustahkamlash: `PermitRootLogin no`, `PasswordAuthentication no`, fail2ban.
- Parolni o'chirishdan oldin kalit bilan kirishni ikkinchi terminalda sinab ko'ring.

:::quiz
? Debian/Ubuntu/Kali'da SSH kirishlari va sudo chaqiruvlari qaysi faylga yoziladi?
- /var/log/syslog
+ /var/log/auth.log
- /var/log/kern.log
- /etc/shadow
! auth.log — autentifikatsiyaga oid hodisalar jurnali. RHEL oilasida uning o'rnida /var/log/secure.

? Jurnalda bitta manzildan 800 ta “Failed password”, keyin shu manzildan “Accepted password” ko'rindi. Xulosa?
- Bu oddiy fon shovqini
- Foydalanuvchi parolini unutgan
+ Parol terib topilgan bo'lishi mumkin — bu jiddiy tekshirishni talab qiladi
- Server qayta yuklangan
! Ko'p muvaffaqiyatsiz urinishdan keyingi muvaffaqiyatli kirish — eng muhim signal. Keyingi qadam: shu seansda nima qilinganini aniqlash.

? Muvaffaqiyatsiz kirish urinishlari tarixini qaysi buyruq ko'rsatadi?
- last
- who
+ sudo lastb
- w
! last — muvaffaqiyatli kirishlar; lastb — muvaffaqiyatsizlari; who va w — hozir tizimda kimlar bor.

? SSH kalit juftligida qaysi kalit serverga joylanadi?
- Yopiq kalit (private)
+ Ochiq kalit (public)
- Ikkalasi ham
- Hech biri — faqat parol
! Ochiq kalit serverdagi authorized_keys ga qo'yiladi. Yopiq kalit hech qachon kompyuteringizni tark etmaydi.

? Yopiq SSH kalit fayli uchun to'g'ri ruxsat qaysi?
- 644
- 755
+ 600
- 777
! Yopiq kalitni faqat egasi o'qiy olishi kerak. Kengroq ruxsat bo'lsa, SSH kalitni ishlatishdan bosh tortadi.

? `sshd_config` dagi `PasswordAuthentication no` nima beradi?
- SSH ni butunlay o'chiradi
+ Parol bilan kirishni taqiqlaydi — faqat kalit bilan kirish mumkin bo'ladi
- Root kirishini taqiqlaydi
- Portni o'zgartiradi
! Parol bilan kirish o'chirilsa, parol terish hujumi ma'nosini yo'qotadi. Root kirishi uchun alohida sozlama: PermitRootLogin no.

? Parol bilan kirishni o'chirishdan oldin nima qilish shart?
- Serverni qayta yuklash
+ Kalit bilan kirish ishlayotganini joriy seansni yopmasdan, ikkinchi terminalda sinab ko'rish
- Barcha jurnallarni o'chirish
- SSH portini o'zgartirish
! Aks holda kalit ishlamasa, serverga kirish yo'li qolmaydi. Joriy seans — zaxira yo'lingiz.

? Tanish serverga ulanayotganda “REMOTE HOST IDENTIFICATION HAS CHANGED” ogohlantirishi chiqdi. Nima qilasiz?
- known_hosts faylini o'chirib, davom etaman
- “yes” deb yozaman
+ To'xtayman va sababini aniqlayman: server qayta o'rnatilganmi yoki aloqa o'rtasida kimdir bormi
- Kompyuterni qayta yoqaman
! Server kaliti o'zgargan. Qonuniy sabab bo'lishi mumkin, lekin bu Man-in-the-Middle belgisi ham — tekshirmasdan davom etilmaydi.

? Nega jurnallar alohida markaziy serverga ham yuboriladi?
- Diskda joy tejash uchun
+ Tizim buzilib, lokal jurnallar o'zgartirilsa ham ishonchli nusxa saqlanib qolishi uchun
- Jurnallar tezroq yozilishi uchun
- Bu faqat qonun talabi
! Root huquqiga ega bo'lgan kishi lokal jurnallarni o'zgartira oladi. Markaziy nusxa tergov uchun ishonchli manba bo'lib qoladi.

? fail2ban nima qiladi?
- Parollarni shifrlaydi
+ Jurnalni kuzatib, ko'p muvaffaqiyatsiz urinish qilgan manzilni vaqtincha bloklaydi
- SSH kalitlarini yaratadi
- Jurnallarni arxivlaydi
! U jurnaldagi naqshlarga qarab firewall qoidasi qo'shadi — parol terish hujumini sekinlashtiradi.

? Kecha soat 03:00 dan 04:00 gacha SSH xizmatida nima bo'lganini qaysi buyruq ko'rsatadi?
- last -n 3
+ journalctl -u ssh --since "03:00" --until "04:00" (kerakli sana bilan)
- ps aux | grep ssh
- systemctl status ssh
! --since va --until vaqt oralig'ini belgilaydi, -u esa aniq xizmatni tanlaydi.
:::

:::cards
Autentifikatsiya jurnali qayerda? :: /var/log/auth.log (RHEL oilasida /var/log/secure); yangi tizimlarda journalctl -u ssh.
Jurnal qatori qanday qismlardan iborat? :: Vaqt, host nomi, dastur[PID] va xabar.
Xizmat jurnalini vaqt oralig'i bilan ko'rish? :: journalctl -u xizmat --since "..." --until "..."
who, last, lastb nima ko'rsatadi? :: who — hozir tizimda kimlar bor; last — muvaffaqiyatli kirishlar tarixi; lastb — muvaffaqiyatsiz urinishlar.
Jurnal tahlilidagi eng muhim naqsh? :: Ko'p muvaffaqiyatsiz urinishdan keyingi muvaffaqiyatli kirish.
SSH kalit juftligi qanday ishlaydi? :: Yopiq kalit faqat sizda qoladi; ochiq kalit serverdagi ~/.ssh/authorized_keys ga qo'yiladi.
Kalit yaratish va serverga joylash buyruqlari? :: ssh-keygen -t ed25519, keyin ssh-copy-id foydalanuvchi@server
~/.ssh va yopiq kalit ruxsatlari? :: ~/.ssh — 700; yopiq kalit va authorized_keys — 600.
SSH serverni mustahkamlashning asosiy sozlamalari? :: PermitRootLogin no; PasswordAuthentication no; AllowUsers; MaxAuthTries.
known_hosts nima? :: Avval ulanilgan serverlarning “barmoq izlari” — keyingi ulanishda solishtiriladi.
Nega markazlashgan jurnal yig'ish kerak? :: Tizim buzilib, lokal jurnallar o'zgartirilsa ham ishonchli nusxa saqlanib qoladi.
Fayl ko'chirish (SSH ustidan)? :: scp fayl foydalanuvchi@server:/yo'l/
:::
