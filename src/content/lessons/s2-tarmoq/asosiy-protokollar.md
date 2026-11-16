Nmap skani tugadi va ekranda shunday ro'yxat turibdi: `21/tcp ftp`, `22/tcp ssh`, `23/tcp telnet`, `445/tcp microsoft-ds`, `3389/tcp ms-wbt-server`. Yangi boshlovchi uchun bu — tushunarsiz qatorlar. Tajribali odam uchun — reja: qaysi biri eng zaif, qaysidan boshlash kerak, qaysi biri nima berishi mumkin.

Bu dars sizni birinchi guruhdan ikkinchisiga o'tkazadi. Har bir protokol uchun to'rt savolga javob beramiz: **nima uchun kerak, qaysi portda, shifrlanganmi va nimasi xavfli.**

## Asosiy ajratuvchi: shifrlanganmi yoki yo'q

Protokollarning katta qismi internet kichik va "do'stona" bo'lgan davrda yaratilgan. Ular ma'lumotni — parollar bilan birga — **ochiq matn** holida uzatadi. Keyinchalik ularning shifrlangan o'rinbosarlari paydo bo'ldi.

| Vazifa | Eski, ochiq | Zamonaviy, shifrlangan |
|---|---|---|
| Masofadan buyruq bajarish | Telnet (23) | **SSH** (22) |
| Fayl uzatish | FTP (21) | **SFTP** (22), FTPS (990) |
| Veb | HTTP (80) | **HTTPS** (443) |
| Pochta jo'natish | SMTP (25) | SMTP + TLS (465, 587) |
| Pochta olish | POP3 (110), IMAP (143) | POP3S (995), IMAPS (993) |
| Qurilmalarni boshqarish | SNMP v1/v2c (161) | SNMP v3 |

:::key
Tekshiruvda chap ustundagi protokollardan birini ko'rsangiz — bu allaqachon topilma. Ochiq protokol degani: tarmoqdagi istalgan tinglovchi login va parolni o'qiy oladi.
:::

## SSH — xavfsiz masofaviy boshqaruv

[[ssh|SSH]] (Secure Shell) — boshqa kompyuterga shifrlangan holda ulanib, buyruq bajarish. **Port: TCP 22.**

Linux serverlarni boshqarishning asosiy usuli. Siz undan har kuni foydalanasiz.

```bash
ssh ali@10.10.10.5                # ulanish
ssh -p 2222 ali@10.10.10.5        # boshqa portda
scp fayl.txt ali@10.10.10.5:/tmp/ # SSH ustidan fayl nusxalash
```

Autentifikatsiyaning ikki usuli:

- **Parol** — oddiy, lekin terib topish hujumiga ochiq.
- **[[ssh-key|Kalit juftligi]]** — ancha xavfsiz: yopiq kalit sizda, ochiq kalit serverda. 3-bosqichda o'zingiz sozlaysiz.

**Nimasi xavfli:**

- Internetga ochiq SSH porti doimiy [[brute-force|brute force]] ostida — har qanday serverning jurnalida kuniga minglab urinish ko'rinadi.
- Zaif yoki standart parollar (`root:root`, `admin:admin`).
- Sizib chiqqan yopiq kalitlar: GitHub'ga tasodifan yuklangan, zaxira nusxada qolib ketgan.

**Himoya:** faqat kalit bilan kirish, root'ning to'g'ridan-to'g'ri kirishini taqiqlash, urinishlarni cheklash (fail2ban).

## Telnet — SSH ning himoyasiz ajdodi

[[telnet|Telnet]] ham masofadan buyruq bajaradi, lekin **hech narsa shifrlanmaydi**. **Port: TCP 23.**

Tarmoqni tinglayotgan odam siz yozgan har bir harfni ko'radi — login va parol bilan birga.

Bugun uni asosan eski tarmoq qurilmalari, kameralar va arzon IoT qurilmalarida uchratish mumkin. Mashhur Mirai botneti aynan ochiq Telnet va standart parollar orqali yuz minglab qurilmani egallagan.

Zamonaviy foydali ishlatilishi — diagnostika: `telnet manzil port` bilan istalgan TCP portga ulanib, xizmat javobini ko'rish.

## FTP — fayl uzatish

[[ftp|FTP]] (File Transfer Protocol). **Portlar: TCP 21** (buyruqlar) va **20** (ma'lumot).

**Nimasi xavfli:**

- Login va parol ochiq matnda.
- **Anonim kirish:** ba'zi serverlar `anonymous` nomi bilan parolsiz kirishga ruxsat beradi. Pentestda birinchi tekshiriladigan narsa: u yerda nima yotibdi va u yerga yozish mumkinmi?
- Agar FTP katalogi veb-server katalogi bilan bir xil bo'lsa va yozishga ruxsat bo'lsa — hujumchi zararli faylni yuklab, uni brauzer orqali ishga tushirishi mumkin.

O'rnini bosuvchi: **SFTP** — nomi o'xshash, lekin bu butunlay boshqa protokol: u SSH ustida ishlaydi (22-port).

## SMB — Windows fayl ulashish

[[smb|SMB]] (Server Message Block) — Windows tarmoqlarida umumiy papkalar va printerlar. **Port: TCP 445** (eskisi — 139).

Korporativ tarmoqlarda eng muhim protokollardan biri — va tarixan eng ko'p muammo keltirgan.

**Nimasi xavfli:**

- **Ochiq ulushlar:** parolsiz yoki hamma o'qiy oladigan papkalar. Ichida — zaxira nusxalar, skriptlar, parolli hujjatlar.
- **Jiddiy zaifliklar:** 2017-yilgi **EternalBlue** (MS17-010) — SMB dagi zaiflik; WannaCry aynan u orqali tarqalgan.
- **Tarmoq ichida ko'chish:** hujumchi bitta hisobni egallab, SMB orqali boshqa kompyuterlarga o'tadi.

**Qat'iy qoida:** 445-port **hech qachon internetga ochiq bo'lmasligi kerak.**

## RDP — masofaviy ish stoli

[[rdp|RDP]] (Remote Desktop Protocol) — Windows kompyuterning ekraniga masofadan ulanish. **Port: TCP 3389.**

**Nimasi xavfli:**

- Internetga ochiq RDP — ransomware guruhlarining eng sevimli kirish eshiklaridan biri: parol terib topiladi yoki o'g'irlangan hisob sotib olinadi.
- Jiddiy zaifliklar (masalan, 2019-yilgi BlueKeep).

**Himoya:** RDP ni internetga to'g'ridan-to'g'ri ochmaslik — faqat VPN orqali; ko'p omilli autentifikatsiya; urinishlar sonini cheklash.

## Pochta protokollari

Pochta uch protokol bilan ishlaydi:

| Protokol | Vazifa | Port |
|---|---|---|
| [[smtp|SMTP]] | Xat **jo'natish** va serverlar orasida uzatish | 25, 587, 465 |
| **POP3** | Xatni serverdan **yuklab olish** (odatda serverdan o'chadi) | 110, 995 |
| **IMAP** | Xatlar bilan **serverda ishlash** (qurilmalar orasida sinxron) | 143, 993 |

SMTP ning asosiy kamchiligi: u yaratilganda **jo'natuvchini tekshirish ko'zda tutilmagan**. Xatning "Kimdan" maydoniga istalgan manzilni yozish mumkin — xuddi konvertga istalgan qaytish manzilini yozish kabi. Phishing shunga tayanadi.

Buni tuzatish uchun uch mexanizm qo'shilgan (ular DNS dagi TXT yozuvlarida saqlanadi):

- **SPF** — shu domen nomidan qaysi serverlar xat jo'nata oladi.
- **DKIM** — xatga raqamli imzo qo'yadi.
- **DMARC** — tekshiruvdan o'tmagan xat bilan nima qilishni belgilaydi.

Phishing tahlilida bularni SOC yo'nalishida batafsil o'rganasiz.

## DNS va DHCP — eslatma

Ularni alohida darslarda ko'rdingiz, bu yerda faqat jadval uchun:

- **DNS** — UDP/TCP 53 — nomlarni manzilga aylantiradi.
- **DHCP** — UDP 67/68 — manzil tarqatadi.

## SNMP — qurilmalarni kuzatish

**SNMP** (Simple Network Management Protocol) — router, switch, printer va serverlar holatini kuzatish. **Port: UDP 161.**

1 va 2c versiyalarida "parol" vazifasini **community string** bajaradi va u ochiq matnda uzatiladi. Standart qiymatlari: `public` (o'qish) va `private` (yozish). Ularni o'zgartirishni unutish — juda keng tarqalgan xato.

To'g'ri community string bilan hujumchi qurilmadan juda ko'p narsani bilib oladi: interfeyslar, marshrutlar, ishlayotgan jarayonlar, foydalanuvchilar. UDP bo'lgani uchun skanerlarda ko'pincha e'tibordan chetda qoladi.

## Ma'lumotlar bazalari

| Baza | Port |
|---|---|
| MySQL / MariaDB | 3306 |
| PostgreSQL | 5432 |
| Microsoft SQL Server | 1433 |
| MongoDB | 27017 |
| Redis | 6379 |

Ma'lumotlar bazasi porti **internetga ochiq bo'lmasligi kerak**. Baza faqat o'z ilovasi bilan gaplashadi. Parolsiz, internetga ochiq qolgan MongoDB va Redis serverlari — millionlab yozuvlar sizib chiqishining takrorlanib turadigan sababi.

## Umumiy jadval

| Port | Protokol | Shifrlangan | Asosiy xavf |
|---|---|---|---|
| 21 | FTP | Yo'q | Ochiq parol, anonim kirish |
| 22 | SSH | Ha | Parol terish, sizib chiqqan kalitlar |
| 23 | Telnet | Yo'q | Hammasi ochiq |
| 25 | SMTP | Ixtiyoriy | Jo'natuvchini soxtalashtirish |
| 53 | DNS | Yo'q | Soxtalashtirish, tunneling |
| 80 | HTTP | Yo'q | Ochiq trafik, web zaifliklar |
| 161 | SNMP | v3 dan | Standart community string |
| 443 | HTTPS | Ha | Web zaifliklar |
| 445 | SMB | Qisman | Ochiq ulushlar, tarmoqda ko'chish |
| 3306 | MySQL | Ixtiyoriy | Internetga ochiq baza |
| 3389 | RDP | Ha | Parol terish, ransomware eshigi |

## Banner — xizmatning tashrif qog'ozi

Ko'p xizmatlar ulanganingiz zahoti o'zini tanishtiradi. Bu **banner** deyiladi:

```
$ nc 10.10.10.5 22
SSH-2.0-OpenSSH_7.2p2 Ubuntu-4ubuntu2.8

$ nc 10.10.10.5 21
220 (vsFTPd 2.3.4)
```

Ikki qator — va hujumchi dastur nomi, aniq versiyasi va operatsion tizimni biladi. Keyingi qadam: shu versiya uchun ma'lum zaiflik bormi? (`vsFTPd 2.3.4` — laboratoriyalarda mashhur misol: bu versiyaga orqa eshik joylangan edi.)

Bu jarayon **banner grabbing** deyiladi. Nmap'ning `-sV` opsiyasi aynan shuni avtomatik bajaradi.

Himoyachi uchun xulosa ikki qismli: bannerni yashirish foydali, lekin u faqat sekinlashtiradi. **Haqiqiy himoya — dasturni yangilash.**

## Hujum yuzasi

Bu darsning asosiy g'oyasi bitta tushunchaga jamlanadi: **hujum yuzasi** (attack surface) — hujumchi murojaat qila oladigan barcha nuqtalar yig'indisi.

Har bir ochiq port — yuzaning bir bo'lagi. Uni kichraytirish qoidalari sodda:

1. **Kerak bo'lmagan xizmatni o'chiring.**
2. **Kerak bo'lsa — faqat keraklilarga oching** (firewall, VPN, ichki tarmoq).
3. **Ochiq protokolni shifrlangani bilan almashtiring.**
4. **Standart parollarni o'zgartiring.**
5. **Yangilab turing.**

Ko'p buzilishlarning sababi murakkab hujum emas — shu besh qoidadan birining buzilishi.

Endi amaliyot. Quyidagi labda notanish tarmoqdagi serverni topib, undagi xizmatlar va versiyalarni aniqlaysiz:

:::lab tarmoq-razvedka

## Xulosa

- Protokollar ikki guruhga bo'linadi: **ochiq** (Telnet, FTP, HTTP, SNMP v1/2) va **shifrlangan** (SSH, SFTP, HTTPS).
- **SSH (22)** — xavfsiz boshqaruv; xavfi — parol terish.
- **SMB (445)** va **RDP (3389)** — Windows tarmoqlarining asosiy nishonlari; internetga ochilmaydi.
- **SMTP** jo'natuvchini tekshirmaydi → phishing; SPF, DKIM, DMARC buni tuzatadi.
- Ma'lumotlar bazasi portlari internetga ochiq bo'lmasligi kerak.
- **Banner** xizmat versiyasini oshkor qiladi.
- **Hujum yuzasi** — barcha ochiq nuqtalar; uni kichraytirish — himoyaning asosi.

:::quiz
? Telnet o'rniga SSH ishlatishning asosiy sababi nima?
- SSH tezroq ishlaydi
+ SSH butun aloqani, jumladan parolni shifrlaydi
- Telnet faqat Windows'da ishlaydi
- SSH bepul, Telnet pullik
! Telnet hamma narsani ochiq matnda uzatadi — tarmoqni tinglagan har kim parolni ko'radi. SSH esa butun seansni shifrlaydi.

? Skan natijasida 445-port internetga ochiq ekani aniqlandi. Bu nega jiddiy topilma?
- Bu port sekin ishlaydi
+ SMB internetga ochiq bo'lmasligi kerak: ochiq ulushlar va jiddiy zaifliklar xavfi bor
- 445 — zararli dasturlar porti
- Bu port faqat test uchun
! SMB ichki tarmoq protokoli. WannaCry kabi hujumlar aynan internetga ochiq SMB orqali tarqalgan.

? FTP serverni tekshirganda birinchi navbatda nimaga qaraladi?
- Server rangi qanaqaligiga
+ Anonim (anonymous) kirish yoqilgan-yoqilmaganiga
- Serverda nechta fayl borligiga
- FTP ning litsenziyasiga
! Anonim kirish parolsiz fayllarni ko'rish, ba'zan esa yozish imkonini beradi — bu eng tez tekshiriladigan narsa.

? Nega elektron xatning “Kimdan” maydonini soxtalashtirish mumkin?
- Chunki pochta serverlari sekin
+ Chunki SMTP yaratilganda jo'natuvchini tekshirish ko'zda tutilmagan
- Chunki barcha xatlar shifrlangan
- Chunki DNS ishlamaydi
! SMTP ishonchga qurilgan. SPF, DKIM va DMARC keyinchalik aynan shu kamchilikni yopish uchun qo'shilgan.

? `220 (vsFTPd 2.3.4)` qatori hujumchiga nima beradi?
- Serverning parolini
+ Xizmat nomi va aniq versiyasini — ma'lum zaifliklarni qidirish uchun
- Serverdagi fayllar ro'yxatini
- Administrator ismini
! Bu banner. Versiya ma'lum bo'lgach, hujumchi shu versiya uchun e'lon qilingan zaifliklarni qidiradi.

? Qaysi protokollar ma'lumotni standart holatda shifrlamaydi?
+ Telnet
+ FTP
+ HTTP
- SSH
! Telnet, FTP va HTTP ochiq matnda ishlaydi. SSH esa boshidanoq shifrlangan.

? SNMP v1/v2c dagi keng tarqalgan xato qaysi?
- Portni 161 dan o'zgartirish
+ Standart community string'larni (public, private) o'zgartirmaslik
- SNMP ni faqat ichki tarmoqda ishlatish
- SNMP v3 ga o'tish
! Community string — amalda parol va u ochiq uzatiladi. Standart qiymatlar hujumchiga qurilma haqida ko'p ma'lumot beradi.

? Hujum yuzasini (attack surface) kichraytirishning eng to'g'ri usuli qaysi?
- Barcha portlarni boshqa raqamlarga ko'chirish
- Kuchliroq kompyuter sotib olish
+ Keraksiz xizmatlarni o'chirish va qolganlariga kirishni cheklash
- Bannerlarni o'chirish — shuning o'zi yetarli
! Yo'q xizmatga hujum qilib bo'lmaydi. Portni ko'chirish va bannerni yashirish faqat sekinlashtiradi.

? Internetga ochiq RDP (3389) nega ayniqsa xavfli?
- Chunki RDP shifrlanmagan
+ Chunki u orqali parol terib topilsa, hujumchi to'liq ish stoliga ega bo'ladi; ransomware guruhlari buni keng ishlatadi
- Chunki u ko'p internet sarflaydi
- Chunki u faqat eski Windows'da ishlaydi
! RDP shifrlangan, lekin muammo unda emas: ochiq port doimiy parol terish ostida va muvaffaqiyatli kirish tizimni to'liq boshqarish demakdir.
:::

:::cards
SSH qaysi portda va nima uchun? :: TCP 22 — boshqa kompyuterga shifrlangan holda ulanib, buyruq bajarish.
Telnet va SSH farqi? :: Ikkalasi masofadan buyruq bajaradi; Telnet (23) hammasini ochiq uzatadi, SSH (22) shifrlaydi.
FTP ning asosiy xavflari? :: Parol ochiq matnda uzatiladi; anonim kirish yoqilgan bo'lishi mumkin.
SMB qaysi portda va nega xavfli? :: TCP 445 — Windows fayl ulashish. Ochiq ulushlar, jiddiy zaifliklar (EternalBlue), tarmoqda ko'chish.
RDP qaysi portda? :: TCP 3389 — Windows masofaviy ish stoli. Internetga ochiq bo'lmasligi kerak.
SMTP, POP3, IMAP vazifalari? :: SMTP — jo'natish; POP3 — yuklab olish; IMAP — serverda ishlash va sinxronlash.
SPF, DKIM, DMARC nima uchun? :: Xat jo'natuvchisini tekshirish: ruxsat etilgan serverlar, raqamli imzo va tekshiruvdan o'tmagan xat siyosati.
Banner grabbing nima? :: Xizmatga ulanib, u o'zi e'lon qiladigan nom va versiyani o'qib olish.
Hujum yuzasi (attack surface) nima? :: Hujumchi murojaat qila oladigan barcha nuqtalar: ochiq portlar, xizmatlar, kirish joylari.
MySQL, PostgreSQL, MSSQL portlari? :: MySQL — 3306, PostgreSQL — 5432, MSSQL — 1433.
:::
