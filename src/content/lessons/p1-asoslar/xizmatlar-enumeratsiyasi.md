Nmap ishini tugatdi: ochiq portlar ro'yxati tayyor. Yangi boshlovchi shu yerda "endi exploit qidiraman" deydi. Tajribali pentester esa sekinlashadi — chunki eng qimmatli topilmalar ko'pincha **exploit talab qilmaydi**. Anonim kirishga ruxsat bergan FTP serveri, parolsiz ochilgan fayl ulushi, "public" so'zi bilan butun tarmoq qurilmasi sozlamalarini beradigan SNMP, foydalanuvchi nomlarini ochib beradigan pochta serveri. Hech qanday zaiflik "ishlatilmagan" — shunchaki xizmat **so'ralgan narsani bergan**.

[[enumeration|Enumeration]] (enumeratsiya) — har bir topilgan xizmatdan iloji boricha ko'p ma'lumot olish: versiya, sozlamalar, foydalanuvchilar, ulushlar, ruxsatlar. Pentesterlar orasida mashhur gap bor: "Enumeratsiya — hammasi". Ko'pchilik laboratoriya mashinalarida yechim exploit'da emas, enumeratsiya paytida o'tkazib yuborilgan bitta qatorda bo'ladi.

Bu darsda eng ko'p uchraydigan xizmatlar bo'yicha **tekshiruv ro'yxati**ni tuzamiz. Har bir xizmat uchun: tester nimani tekshiradi, qanday buyruq bilan (o'z laboratoriyangizda), natija nimani anglatadi va himoyachi uni qanday yopadi. Tarmoq bosqichidagi protokollar darsi (s2) — shu darsning poydevori.

:::warn
Bu darsdagi buyruqlar — **o'qish va so'rash**, hech narsani o'zgartirmaydi. Shunga qaramay, ularni faqat o'z laboratoriyangizda (masalan, Metasploitable VM), TryHackMe xonalarida yoki yozma ruxsat bilan qamrovdagi tizimlarda ishlating. Begona serverdagi anonim FTP'ga kirish — "ochiq turgan edi" degan bahona bilan oqlanmaydi.
:::

## Umumiy yondashuv

Har bir port uchun bir xil savollar:

1. **Bu qanday xizmat va qaysi versiya?** (banner, Nmap `-sV`)
2. **Autentifikatsiyasiz nima beradi?** (anonim, mehmon, null session, "public")
3. **Qanday ma'lumot oshkor qiladi?** (foydalanuvchilar, ulushlar, sozlamalar, ichki nomlar)
4. **Bu xizmat umuman internetda bo'lishi kerakmi?**
5. **Ma'lum zaifliklari bormi?** (keyingi darslar)

To'rtinchi savolni unutmang: ko'p topilmalar "zaiflik" emas, "bu xizmat bu yerda bo'lmasligi kerak".

## FTP (21)

[[ftp|FTP]] — eski fayl uzatish protokoli; parollar ochiq matnda (s2).

```bash
nmap -p 21 -sV -sC 10.10.10.5
# 21/tcp open  ftp  vsftpd 3.0.3
# | ftp-anon: Anonymous FTP login allowed (FTP code 230)
# | -rw-r--r--    1 0   0   1024 Nov 10 09:12 backup-config.txt

ftp 10.10.10.5            # foydalanuvchi: anonymous, parol: bo'sh yoki email
ftp> ls -la
ftp> get backup-config.txt
```

| Tekshiruv | Natija nimani bildiradi |
|---|---|
| Anonim kirish | Har kim fayllarni o'qiydi — ichida konfiguratsiya, zaxira, parollar bo'lishi mumkin |
| Anonim **yozish** | Har kim fayl joylaydi — zararli fayl tarqatish yoki web papka bilan bog'liq bo'lsa, undan ham yomon |
| Ochiq matnli login | Tarmoqda parolni ushlash mumkin |

Himoya: anonim kirishni o'chirish; FTP o'rniga SFTP (SSH ustida); kerak bo'lmasa — umuman o'chirish.

## SSH (22)

```bash
nmap -p 22 -sV --script ssh-auth-methods,ssh2-enum-algos 10.10.10.5
# 22/tcp open  ssh  OpenSSH 7.4 (protocol 2.0)
# | ssh-auth-methods:
# |   Supported authentication methods:
# |     publickey
# |_    password
```

| Tekshiruv | Natija nimani bildiradi |
|---|---|
| Versiya | Eski OpenSSH — ma'lum zaifliklar; OS versiyasiga ham ishora (banner'da distributiv) |
| Autentifikatsiya usullari | `password` ruxsat etilgan — parol hujumlari mumkin (RoE'da cheklovlar bilan) |
| Algoritmlar | Eskirgan shifrlar va kalit almashinuvi usullari |

Himoya — c1 bosqichidagi SSH darsi: faqat kalit, root taqiqi, SSH'ni internetdan yopish (VPN, Session Manager).

## SMB (139, 445)

[[smb|SMB]] — Windows fayl ulashish protokoli (Linux'da Samba). Ichki pentestlarda eng boy ma'lumot manbalaridan biri (p3 bosqichidagi Active Directory bilan bog'liq).

```bash
nmap -p 445 --script smb-os-discovery,smb-security-mode 10.10.10.7

smbclient -L //10.10.10.7 -N          # ulushlar ro'yxati, parolsiz ("null session")
#   Sharename   Type   Comment
#   ADMIN$      Disk   Remote Admin
#   C$          Disk   Default share
#   Public      Disk   Umumiy fayllar
#   HR          Disk

smbclient //10.10.10.7/Public -N      # ulushga parolsiz ulanishga urinish
```

| Tekshiruv | Natija nimani bildiradi |
|---|---|
| Null session (parolsiz) | Ulushlar, ba'zan foydalanuvchilar va guruhlar ro'yxati — razvedka uchun oltin |
| Ulushlarga anonim o'qish | "Public", "Backup", ba'zan "HR" — ichida maxfiy hujjatlar, skriptlardagi parollar |
| SMB signing o'chirilgan | Relay hujumlariga yo'l ochadi (p3 tarmoq hujumlari) |
| SMBv1 yoqilgan | Eskirgan va tarixan eng xavfli zaifliklar bilan bog'liq protokol |
| SMB internetga ochiq | Hech qachon bo'lmasligi kerak |

Himoya: null session'ni o'chirish, ulushlarga eng kam imtiyoz, SMB signing majburiy, SMBv1 o'chirilgan, 445-port tashqariga yopiq (c1 segmentatsiya).

## SNMP (161/UDP)

[[snmp|SNMP]] — router, switch, printer va serverlarni kuzatish protokoli. v1 va v2c'da autentifikatsiya — "community string", ochiq matnda; sukut qiymati ko'pincha `public`.

```bash
nmap -sU -p 161 --script snmp-info 10.10.10.1
snmpwalk -v2c -c public 10.10.10.1 system      # tizim tavsifi, nomi, joylashuvi
```

Noto'g'ri sozlangan SNMP beradi: qurilma modeli va OS versiyasi, tarmoq interfeyslari va marshrutlar, ishlab turgan jarayonlar va o'rnatilgan dasturlar, ba'zan foydalanuvchi nomlari. Yozish huquqli community (`private`) esa qurilma sozlamalarini **o'zgartirish** imkonini beradi.

Himoya: SNMPv3 (autentifikatsiya va shifrlash), sukut community'larni o'zgartirish, faqat boshqaruv segmentidan ruxsat (c1). Bu yerda ham oldingi darsdagi saboq: UDP skanerlashni o'tkazib yuborgan tester bu topilmani ko'rmaydi.

## NFS (2049)

Linux/Unix tarmoq fayl tizimi.

```bash
showmount -e 10.10.10.5
# Export list for 10.10.10.5:
# /srv/backup *
# /home       10.10.10.0/24
```

`*` — har qanday manzil ulay oladi. Eksportlar sozlamasi (`/etc/exports`) noto'g'ri bo'lsa, tarmoqdagi istalgan kompyuter zaxira fayllarini o'qiydi yoki ba'zi sozlamalarda fayl ruxsatlarini suiiste'mol qilish mumkin. Himoya: eksportlarni aniq manzillarga cheklash, `root_squash` (sukut — o'chirmang), NFSv4 va Kerberos.

## SMTP (25)

Pochta serveri. Ba'zi buyruqlar foydalanuvchi mavjudligini ochib beradi:

| Buyruq | Ma'nosi |
|---|---|
| `VRFY ism` | "Bu foydalanuvchi bormi?" — server ha yoki yo'q deydi |
| `EXPN ro'yxat` | Pochta ro'yxati a'zolarini ochadi |
| `RCPT TO` | Qabul qiluvchi qabul qilinishi yoki rad etilishi bo'yicha |

Foydalanuvchi nomlari ro'yxati keyingi bosqichlar (parol hujumlari, fishing) uchun asos. Yana bir tekshiruv — **open relay**: server istalgan kishiga istalgan manzilga xat yuborishga ruxsat beradimi (spam va fishing uchun ideal, b1 bosqichidagi SPF/DMARC bilan bog'liq).

Himoya: `VRFY`/`EXPN` o'chirilgan, relay faqat autentifikatsiyalangan foydalanuvchilarga.

## Web (80, 443, 8080…)

Web — alohida bosqich (p2), lekin enumeratsiya darajasida birinchi qadamlar:

```bash
curl -sI https://qaydnoma.example.com            # sarlavhalar: Server, X-Powered-By, cookie'lar
whatweb https://qaydnoma.example.com             # texnologiyalarni aniqlash
curl -s https://qaydnoma.example.com/robots.txt  # "indekslamang" degan yo'llar — ko'pincha qiziq
```

| Kuzatuv | Nima beradi |
|---|---|
| `Server: nginx/1.24.0`, `X-Powered-By: PHP/7.4` | Versiyalar |
| `robots.txt` da `/admin/`, `/backup/` | Qaraladigan yo'llar |
| Xato sahifasi stack trace bilan | Freymvork, yo'llar, ba'zan kod parchalari (a2 xavfsiz sozlamalar) |
| TLS sertifikati SAN | Boshqa domen nomlari |

## Bazalar

| Port | Xizmat | Tekshiruv |
|---|---|---|
| 3306 | MySQL | Tashqaridan ochiqmi? Sukut yoki bo'sh parol? |
| 5432 | PostgreSQL | Xuddi shu; versiya |
| 1433 | MSSQL | Xuddi shu |
| 6379 | Redis | Ko'pincha **autentifikatsiyasiz** — butun ma'lumot ochiq |
| 27017 | MongoDB | Eski versiyalarda sukut bo'yicha autentifikatsiyasiz |
| 9200 | Elasticsearch | HTTP orqali butun indekslar — sizib chiqishlarning tez-tez sababi |

Internetga ochiq baza — o'zi topilma, ichiga kirmasdan ham. Autentifikatsiyasiz baza bo'lsa — minimal isbot (versiya so'rovi, jadvallar soni), ma'lumotni o'qimaslik, darhol xabar (qamrov darsidagi kritik topilma tartibi).

## Tekshiruv ro'yxati jadvali

Pentesterlar har bir port uchun o'z ro'yxatini yuritadi. Boshlanish uchun:

| Port | Xizmat | Birinchi tekshiruvlar | Tez-tez topiladigan muammo |
|---|---|---|---|
| 21 | FTP | Versiya, anonim kirish, yozish huquqi | Anonim o'qish/yozish, ochiq matn |
| 22 | SSH | Versiya, auth usullari, algoritmlar | Parol bilan kirish, eski versiya |
| 25 | SMTP | VRFY/EXPN, relay | Foydalanuvchi enumeratsiyasi, open relay |
| 53 | DNS | Zone transfer (qamrovdagi server) | AXFR ochiq |
| 80/443 | HTTP(S) | Sarlavhalar, texnologiya, robots.txt, sertifikat | Versiya oshkorligi, debug sahifalar |
| 111/2049 | RPC/NFS | `showmount -e` | Hammaga eksport |
| 139/445 | SMB | Null session, ulushlar, signing, SMBv1 | Ochiq ulushlar, signing yo'q |
| 161/UDP | SNMP | Sukut community'lar | `public` bilan to'liq ma'lumot |
| 3306, 5432, 1433 | SQL bazalar | Tashqi kirish, sukut hisoblar | Internetga ochiq |
| 6379, 27017, 9200 | NoSQL / qidiruv | Autentifikatsiya bormi | Autentifikatsiyasiz |
| 3389 | RDP | Versiya, NLA | Internetga ochiq RDP |

HackTricks kabi manbalar har bir port uchun batafsil ro'yxatlar beradi (roadmap havolasi) — lekin ulardagi har bir buyruqni ishlatishdan oldin u nima qilishini va RoE'ga mosligini tushuning.

## Himoyachi uchun

Bu darsdagi deyarli har bir topilma bitta sababga borib taqaladi: **sukut sozlamalar va ortiqcha xizmatlar**. c1 bosqichidagi hardening savoli — "bu xizmat nima uchun va kim uchun kerak?" — shu yerda to'liq javobini topadi:

| Tamoyil | Bu darsdagi misollar |
|---|---|
| Kerak bo'lmagan xizmat — o'chirilgan | FTP, SMBv1, Telnet, SNMP |
| Anonim kirish — yo'q | FTP, SMB null session, Redis |
| Ochiq matnli protokollar — shifrlanganiga almashtirilgan | FTP → SFTP, SNMPv2c → v3 |
| Boshqaruv xizmatlari — faqat boshqaruv segmentidan | SNMP, SSH, RDP, bazalar |
| Sukut parollar va community'lar — o'zgartirilgan | `public`, `admin/admin` |
| Muntazam ichki skanerlash | Yangi ochiq xizmat paydo bo'lsa — xabar |

CIS Benchmarks (c1–c3) aynan shu sozlamalarni tekshiradi.

## Enumeratsiya nimani qilmaydi

- Ma'lumot to'playdi, lekin ruxsatni kengaytirmaydi: anonim ulushdan topilgan parolni **sinab ko'rish** — alohida qadam va RoE doirasida.
- Har bir xizmatni tekshirish vaqt oladi — vaqt cheklangan pentestda ustuvorlik kerak: internetga ochiq va maxfiy ma'lumotga yaqin xizmatlar birinchi.
- Natija bir lahzaga tegishli: ertaga ulush yopilishi yoki yangisi ochilishi mumkin.

:::try
O'z laboratoriyangizda (Metasploitable 2 — ataylab zaif VM — juda mos keladi) yoki TryHackMe'dagi "Network Services" xonalarida:

1. Nmap natijasidagi har bir ochiq port uchun yuqoridagi jadval bo'yicha birinchi tekshiruvlarni bajaring va natijani eslatmalaringizga yozing.
2. FTP'da anonim kirishni tekshiring. Kirish mumkin bo'lsa — qaysi fayllar ko'rinadi va yozish mumkinmi?
3. `smbclient -L` bilan null session orqali ulushlar ro'yxatini oling. Qaysi ulushlar parolsiz ochiladi?
4. SNMP uchun `public` community bilan `snmpwalk` bajaring. Qanday ma'lumotlar chiqdi?
5. Har bir topilma uchun bitta qatorli "himoya tavsiyasi" yozing.
6. Savol: mijoz tarmog'ida ulush ichidan `deploy.ps1` skripti topildi, unda domen hisobining paroli yozilgan. Keyingi qadamingiz qanday?

**Javoblar:**
1. Metasploitable'da odatda FTP, SSH, Telnet, SMTP, HTTP, SMB, NFS, MySQL, PostgreSQL va boshqalar ochiq — har biri uchun kamida bitta qiziq kuzatuv chiqadi.
2. Anonim kirish ruxsat etilgan bo'lsa, `ls -la` ko'rsatadi; yozishni tekshirish uchun kichik test fayl yuklashga urinish mumkin — **faqat o'z laboratoriyangizda**; mijoz tizimida bu RoE ruxsatini talab qiladi.
3. Ko'pincha `tmp` yoki shunga o'xshash ulush parolsiz ochiladi; `IPC$` — null session belgisi.
4. Tizim tavsifi (OS va yadro versiyasi), host nomi, interfeyslar, ba'zan jarayonlar ro'yxati.
5. Masalan: "Anonim FTP — o'chirish yoki SFTP'ga o'tkazish"; "SNMP `public` — v3 ga o'tish, faqat boshqaruv segmentidan".
6. Topilmani darhol hujjatlashtirish (fayl yo'li, vaqt, skrinshotda parol qisman yashirilgan holda), RoE bo'yicha mijozga xabar berish. Parolni ishlatish — faqat RoE aniq ruxsat bergan bo'lsa (ichki pentestlarda ko'pincha ruxsat etiladi, chunki aynan shu hujum yo'lini ko'rsatish maqsad), aks holda yo'q. Har ikki holatda ham topilma hisobotda: skriptlarda ochiq parol + ulushga keng kirish.
:::

## Xulosa

- Enumeratsiya — har bir xizmatdan maksimal ma'lumot olish; eng qimmatli topilmalar ko'pincha exploit talab qilmaydi.
- Har bir port uchun savollar: qaysi xizmat va versiya, autentifikatsiyasiz nima beradi, nima oshkor qiladi, umuman kerakmi, ma'lum zaifliklari bormi.
- FTP — anonim kirish; SSH — auth usullari; SMB — null session, ulushlar, signing; SNMP — `public`; NFS — hammaga eksport; SMTP — VRFY va relay; web — sarlavhalar, robots.txt; bazalar — internetga ochiqlik va autentifikatsiya.
- O'z tekshiruv ro'yxatingizni yuriting; har bir buyruqni ishlatishdan oldin tushuning.
- Himoya: ortiqcha xizmatlarni o'chirish, anonim kirishsiz, shifrlangan protokollar, boshqaruv segmenti, sukut qiymatlarni o'zgartirish, muntazam ichki skanerlash.

:::quiz
? Nega "enumeratsiya — hammasi" deyiladi?
+ Ko'p topilmalar exploit'siz — noto'g'ri sozlangan xizmat so'ralgan ma'lumotni o'zi beradi; o'tkazib yuborilgan qator esa yechimni yo'qotadi
- Enumeratsiya exploitni avtomatik ishga tushiradi
- Enumeratsiya faqat hisobot uchun
- Exploit'lar mavjud emas
! Anonim FTP, null session, `public` SNMP — zaiflik ishlatilmasdan olingan ma'lumot.

? FTP serverda anonim kirish ruxsat etilgan. Qaysi qo'shimcha tekshiruv eng muhim?
- Server rangini aniqlash
+ Anonim foydalanuvchi faqat o'qiy oladimi yoki yoza ham oladimi va qanday fayllar ochiq
- Port raqamini o'zgartirish
- Serverni qayta yuklash
! Anonim yozish o'qishdan ham xavfliroq; fayllar ichida maxfiy ma'lumot bo'lishi mumkin.

? SMB null session nimani bildiradi?
- SMB o'chirilgan
+ Parolsiz ulanish — ulushlar, ba'zan foydalanuvchilar va guruhlar ro'yxatini olish mumkin
- Faqat admin kira oladi
- Shifrlangan ulanish
! Null session ichki razvedka uchun juda boy manba; himoya — uni o'chirish.

? SNMP v2c'da `public` community string bilan nima olinishi mumkin?
- Hech narsa, SNMP shifrlangan
+ Qurilma modeli va OS versiyasi, interfeyslar, marshrutlar, ba'zan jarayonlar va dasturlar
- Faqat vaqt
- Faqat IP manzil
! Himoya — SNMPv3, sukut community'larni o'zgartirish, faqat boshqaruv segmentidan.

? SMTP'dagi `VRFY` buyrug'i qanday xavf tug'diradi?
+ Foydalanuvchi mavjudligini tasdiqlab, foydalanuvchi nomlari ro'yxatini tuzishga imkon beradi
- Serverni o'chiradi
- Barcha xatlarni o'chiradi
- Hech qanday xavf yo'q
! Foydalanuvchilar ro'yxati keyingi parol hujumlari va fishing uchun asos.

? `showmount -e` natijasida `/srv/backup *` ko'rindi. Bu nimani bildiradi?
- Eksport faqat bitta kompyuterga
+ Zaxira papkasi istalgan manzildan ulanishga eksport qilingan
- NFS o'chirilgan
- Papka bo'sh
! Eksportlar aniq manzillarga cheklanishi kerak.

? Internetga ochiq Redis yoki Elasticsearch topildi. Tester qanday yo'l tutadi?
- Barcha ma'lumotni yuklab oladi
+ Minimal isbot (versiya, autentifikatsiya yo'qligi), ma'lumotni o'qimaslik va darhol xabar berish
- Ma'lumotni o'chiradi
- Hech narsa qilmaydi va hisobotda eslatmaydi
! Autentifikatsiyasiz baza — kritik topilma; ma'lumot mijozniki.

? Enumeratsiyada to'rtinchi savol — "bu xizmat umuman kerakmi?" — nega muhim?
+ Ko'p topilmalar zaiflik emas, balki internetda yoki tarmoqda bo'lmasligi kerak bo'lgan xizmat
- Bu savol muhim emas
- Faqat exploit topish uchun
- Faqat bulutda kerak
! Eng yaxshi tuzatish ko'pincha xizmatni o'chirish yoki yopish.

? SMB signing o'chirilgani nega topilma hisoblanadi?
- U SMB'ni sekinlashtiradi
+ Relay hujumlariga yo'l ochadi
- U parollarni o'chiradi
- U faqat printerlarga ta'sir qiladi
! Signing majburiy bo'lishi kerak (p3 bosqichidagi tarmoq hujumlari).

? Bu darsdagi topilmalarning eng umumiy ildiz sababi qaysi?
- Yangi zero-day zaifliklar
+ Sukut sozlamalar va ortiqcha xizmatlar
- Kuchli parollar
- Shifrlash
! Hardening — kerakmas xizmatni o'chirish, anonim kirishni yopish, sukut qiymatlarni o'zgartirish.
:::

:::cards
Enumeration :: Topilgan xizmatlardan maksimal ma'lumot olish
Banner :: Xizmat o'zi haqida yuboradigan matn — ko'pincha versiya bilan
Anonim FTP :: Parolsiz kirish — fayllarni o'qish, ba'zan yozish
SMB null session :: Parolsiz SMB ulanish — ulushlar va foydalanuvchilar ro'yxati
SMB signing :: SMB xabarlarini imzolash — relay hujumlariga qarshi
SNMP community :: v1/v2c'dagi ochiq matnli "parol"; sukut — public
showmount -e :: NFS eksportlari ro'yxati
VRFY / EXPN :: SMTP buyruqlari — foydalanuvchilarni oshkor qilishi mumkin
Open relay :: Istalgan kishiga xat yuborishga ruxsat beruvchi pochta serveri
robots.txt :: Indekslanmasin degan yo'llar — tester uchun qiziq ro'yxat
Autentifikatsiyasiz baza :: Redis, MongoDB, Elasticsearch — kritik topilma
:::
