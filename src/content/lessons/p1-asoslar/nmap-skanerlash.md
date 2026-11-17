Ikkinchi kun. Passiv razvedka tugadi, mijoz `staging` subdomenini qamrovga qo'shishni yozma tasdiqladi, `dev-old` esa "o'chirish kerak bo'lgan eski server" ekan — mijoz uni o'zi o'chiradi. RoE bo'yicha skanerlash ish vaqtida, `198.51.100.50` manzilidan. Endi birinchi marta nishonga **faol** so'rov yuborasiz.

Bir buyruq yozib, natijani kutasiz:

```
PORT     STATE    SERVICE    VERSION
22/tcp   filtered ssh
80/tcp   open     http       nginx 1.24.0
443/tcp  open     ssl/http   nginx 1.24.0
5432/tcp open     postgresql PostgreSQL DB 13.x
```

To'rt qator — va har biri bir hikoya. 22-port filtrlangan (kimdir yaxshi ish qilgan — c1 bosqichidagi "SSH faqat VPN orqali"). 5432 — baza internetga ochiq va eskirgan versiya (c2 bosqichidagi "temp — Jasur uchun" qoidasi?). Pentesterning ishi — bu qatorlarni o'qib, keyingi qadamni rejalash.

Tarmoq bosqichida (s2) portlar va TCP qo'l siqishi haqida, oddiy skan turlari haqida gaplashdik va terminal labda `nmap` ni sinab ko'rdingiz. Bu dars — [[nmap|Nmap]]'ning professional ishlatilishi: skan turlari, opsiyalar, natijani o'qish va skanerlash himoyachiga qanday ko'rinishi.

:::warn
Nmap bilan faqat **o'zingizga tegishli** tizimlarni yoki yozma ruxsat bilan qamrovdagi tizimlarni skanerlang. Mashq uchun: o'z virtual mashinalaringiz, TryHackMe va HTB laboratoriyalari, yoki Nmap loyihasining o'zi ruxsat bergan `scanme.nmap.org` (yengil skanlar uchun). Begona tarmoqni "shunchaki qiziqib" skanerlash ham ko'p joylarda qonunbuzarlik va har doim provayderingiz shikoyat oladigan narsa.
:::

## Bosqichlar: kim tirik, nima ochiq, nima ishlayapti

```
 1. Host discovery      ──▶  qaysi manzillar javob beradi?
 2. Port scanning       ──▶  qaysi portlar ochiq?
 3. Service detection   ──▶  har bir portda qaysi dastur, qaysi versiya?
 4. Skriptlar / OS      ──▶  qo'shimcha ma'lumot
```

### Host discovery

```bash
nmap -sn 10.10.10.0/24        # faqat "kim tirik" — port skansiz
```

`-sn` turli usullar bilan (ICMP echo, TCP 443 ga SYN, TCP 80 ga ACK, lokal tarmoqda ARP) host tirikligini tekshiradi. Muhim cheklov: ko'p serverlar ping'ga javob bermaydi (firewall). Shuning uchun qamrovdagi aniq manzillar uchun discovery'ni o'tkazib yuborish mumkin:

```bash
nmap -Pn 203.0.113.20         # "hammasi tirik deb hisobla" — to'g'ridan-to'g'ri port skan
```

### Skan turlari

| Opsiya | Nomi | Qanday ishlaydi | Qachon |
|---|---|---|---|
| `-sS` | SYN ("yarim ochiq") | SYN → SYN-ACK kelsa ochiq, RST bilan uzadi — ulanish tugallanmaydi | Sukut (root huquqi bilan); tez |
| `-sT` | Connect | To'liq TCP ulanish (`connect()` tizim chaqiruvi) | Root huquqisiz; ilova jurnallarida ko'proq iz |
| `-sU` | UDP | UDP paket; javob yo'qligi noaniq | DNS, SNMP, NTP kabi UDP xizmatlar uchun — sekin |
| `-sV` | Versiya | Ochiq portga ulanib, banner va javoblarni bazaga solishtiradi | Deyarli har doim |
| `-sC` | Standart skriptlar | NSE'ning "default" toifasidagi skriptlari | Qo'shimcha ma'lumot |
| `-O` | OS aniqlash | TCP/IP stek xususiyatlari bo'yicha taxmin | Ba'zan; aniq emas |

UDP skanerlash alohida qiyin: yopiq UDP port ICMP "port unreachable" qaytaradi, ochiq port esa ko'pincha **jim** turadi. Jimlik — ochiqmi yoki firewall tashladimi? Shuning uchun `open|filtered` holati ko'p chiqadi va skan uzoq davom etadi. Lekin UDP'ni o'tkazib yubormang: SNMP (161) kabi xizmatlar ko'pincha eng ko'p ma'lumot beradi (keyingi dars).

### Portlarni tanlash

| Opsiya | Ma'nosi |
|---|---|
| (sukut) | Eng mashhur 1000 ta TCP port |
| `--top-ports 100` | Eng mashhur 100 ta |
| `-p 22,80,443` | Aniq portlar |
| `-p-` | Barcha 65535 TCP port |

Sukut bo'yicha 1000 port — ko'pincha yetarli emas: dasturchilar ilovalarni 8080, 8443, 3000, 5000, 9200 kabi portlarda ishga tushiradi, ba'zan esa butunlay g'alati portlarda. Amaliy yondashuv: avval tez skan (top ports), keyin fonda to'liq `-p-`, so'ng topilgan portlar uchun batafsil `-sV -sC`.

### Tezlik va ehtiyotkorlik

| Opsiya | Ma'nosi |
|---|---|
| `-T0` … `-T5` | Vaqt shablonlari: juda sekin … juda agressiv; sukut `-T3` |
| `--max-rate 100` | Soniyasiga ko'pi bilan 100 paket |
| `--min-rate 1000` | Kamida 1000 — tez, lekin shovqinli |

Ishlab chiqarish tizimlarida agressiv skan eski qurilmalarni yiqitishi, IPS'ni ishga tushirishi yoki ulanishlar jadvalini to'ldirishi mumkin. RoE'dagi "cheklangan tezlikda" aynan shu haqida. Laboratoriyada tez, mijozda — ehtiyotkor.

### Natijani saqlash

```bash
nmap -sS -sV -sC -p- -oA 02-hosts/203.0.113.20/full 203.0.113.20
```

`-oA` uch formatda saqlaydi: oddiy matn (`.nmap`), grep uchun (`.gnmap`) va XML (`.xml` — boshqa vositalarga import, hisobot). Har bir skan natijasi oldingi darsdagi eslatmalar papkasiga, vaqt bilan. Skan natijasi — hisobotdagi dalil.

## Natijani o'qish

Port holatlari:

| Holat | Ma'nosi | Paket darajasida (TCP) |
|---|---|---|
| `open` | Portda dastur tinglayapti | SYN → SYN-ACK |
| `closed` | Host javob beradi, lekin portda hech kim yo'q | SYN → RST |
| `filtered` | Firewall paketni tashlaydi — javob yo'q yoki ICMP xato | SYN → (jimlik) |
| `unfiltered` | Port yetib boriladi, lekin ochiqmi noma'lum | ACK skanida |
| `open\|filtered` | Ajratib bo'lmadi | Ko'pincha UDP |

c1 bosqichidagi `try` topshirig'ini eslang: "refused" — paket yetib bordi, lekin hech kim tinglamayapti (`closed`); "timeout" — firewall jimgina tashladi (`filtered`). Nmap aynan shu farqni ko'rsatadi.

Batafsil natija misoli:

```
Nmap scan report for qaydnoma.example.com (203.0.113.20)
PORT     STATE    SERVICE  VERSION
22/tcp   filtered ssh
80/tcp   open     http     nginx 1.24.0
|_http-title: Did not follow redirect to https://qaydnoma.example.com/
443/tcp  open     ssl/http nginx 1.24.0
| ssl-cert: Subject: commonName=qaydnoma.example.com
| Subject Alternative Name: DNS:qaydnoma.example.com, DNS:www.qaydnoma.example.com
|_Not valid after:  2027-02-10T12:00:00
|_http-title: Qaydnoma — kirish
8080/tcp open     http     Werkzeug httpd 3.0.1 (Python 3.12.3)
|_http-title: Qaydnoma (debug)
```

Bu natijadan keyingi qadamlar rejasi:

| Port | Kuzatuv | Keyingi qadam | Ehtimoliy topilma |
|---|---|---|---|
| 22 | Filtrlangan | Hech narsa — yaxshi | Ijobiy kuzatuv |
| 80 | HTTPS'ga yo'naltiradi | — | — |
| 443 | nginx, sertifikat SAN'ida `www` | Web pentest (p2) — asosiy ish | — |
| 8080 | **Werkzeug** — Flask'ning ishlab chiqish serveri, sarlavhada "debug" | Darhol tekshirish: debug rejimi ochiqmi? | Ishlab chiqish serveri internetga ochiq — jiddiy |

8080-port — bu skanning eng muhim qatori. Flask'ning o'rnatilgan serveri ishlab chiqarish uchun mo'ljallanmagan, debug rejimi esa ba'zi sozlamalarda serverda kod bajarishga yo'l ochadi (a2 bosqichidagi xavfsiz sozlamalar). Kimdir test uchun ishga tushirib, unutgan. Pentest hisobotida — kritik yoki yuqori topilma, va RoE'dagi tartib bo'yicha darhol xabar.

:::key
Versiya — eng qimmatli ma'lumot. "nginx 1.24.0", "PostgreSQL 13", "Werkzeug 3.0.1" — har biri keyingi darslardagi ikki savolga olib keladi: bu versiyada ma'lum zaifliklar bormi (exploit topish darsi) va bu xizmat umuman internetda nima qilyapti (enumeratsiya darsi)? Nmap — oxirgi qadam emas, xarita.
:::

## NSE — Nmap skriptlari

Nmap Scripting Engine — Lua'da yozilgan yuzlab skriptlar, toifalarga bo'lingan:

| Toifa | Nima | Xavfsizligi |
|---|---|---|
| `default` (`-sC`) | Asosiy ma'lumot yig'ish | Odatda xavfsiz |
| `safe` | Tizimga ta'sir qilmaydiganlar | Xavfsiz |
| `discovery` | Qo'shimcha ma'lumot (ulushlar, foydalanuvchilar, sertifikatlar) | Odatda xavfsiz |
| `vuln` | Ma'lum zaifliklarni tekshirish | Ba'zilari agressiv |
| `intrusive`, `brute`, `dos`, `exploit` | Tizimga ta'sir qilishi, hisoblarni bloklashi yoki yiqitishi mumkin | **RoE aniq ruxsat bermasa — yo'q** |

```bash
nmap --script-help ssl-enum-ciphers   # skript nima qilishini o'qish — ishga tushirishdan oldin
nmap -p 443 --script ssl-enum-ciphers qaydnoma.example.com   # TLS versiyalari va shifrlar
```

Har qanday vositada bo'lgani kabi qoida: **nima qilishini bilmagan skriptni mijoz tizimida ishga tushirmang**.

## Skanerlash himoyachiga qanday ko'rinadi

SOC tarmog'ida (b2 IDS/IPS, b1 tarmoq loglari) siz boshqa tomonda edingiz. Endi bilish muhim: sizning har bir skaningiz mijoz jurnallarida iz qoldiradi.

| Skan | Himoyachi nimani ko'radi |
|---|---|
| Port skan (har qanday) | Firewall jurnalida bitta manbadan ko'p portlarga ulanish urinishlari; IDS "port scan" signali |
| `-sT` | Ilova jurnallarida ham — to'liq ulanishlar (masalan, SSH jurnalida "connection closed") |
| `-sV` | Xizmat jurnallarida g'alati so'rovlar va xatolar |
| NSE skriptlari | Web jurnallarida skript tanish user-agent'lari, ko'p 404 |
| Agressiv tezlik | Bir necha soniyada minglab ulanishlar — har qanday monitoring ko'radi |

Shuning uchun RoE'dagi manba IP muhim: SOC sizni tanishi kerak. Va bu himoyachi uchun xulosa beradi: **tashqi skanerlash — normal fon**, internetdagi har bir server buni har kuni ko'radi (c1). Muhimi — skanerdan keyin nima bo'ldi: o'sha IP'dan muvaffaqiyatli login? Yangi xizmatga murojaat?

Himoyachi uchun skanerlashdan to'g'ri xulosa:

- Ochiq portlar soni minimal (c1, c2 — firewall, security group).
- Bannerlar kam ma'lumot beradi (`server_tokens off`, c1) — garchi bu himoya emas, faqat qiyinlashtirish.
- Mijozning o'zi o'z tashqi manzillarini muntazam skanerlaydi va kutilmagan ochiq port paydo bo'lsa xabar oladi — 8080-port kabi narsalar bir necha kun emas, bir necha soatda topiladi.

## Labda mashq

:::lab tarmoq-razvedka

## Nmap nimani qilmaydi

- Zaiflikni isbotlamaydi — versiya va ochiq portni ko'rsatadi. Versiya noto'g'ri aniqlanishi ham mumkin (backport qilingan yamoqlar: dastur versiya raqami eski, lekin zaiflik tuzatilgan).
- `filtered` port ortida xizmat yo'q degani emas — u faqat sizning manzilingizdan yopiq.
- Ilova ichini ko'rmaydi: 443-port ortida yuzlab web zaifliklar bo'lishi mumkin — p2 bosqichi.

:::try
O'z laboratoriyangizda (masalan, VirtualBox'da Metasploitable yoki o'zingizning Ubuntu VM'ingiz) yoki TryHackMe xonasida:

1. `nmap -sn` bilan laboratoriya tarmog'ingizdagi tirik hostlarni toping.
2. Bitta hostni `-sS` va `-sT` bilan skanerlang. Agar u SSH serveri bo'lsa, hostning `auth.log` yoki `journalctl -u ssh` jurnalida farqni ko'ring.
3. `-p-` bilan barcha portlarni, keyin topilgan portlarni `-sV -sC` bilan skanerlang. Natijani `-oA` bilan saqlang.
4. Natija asosida "Port — Kuzatuv — Keyingi qadam — Ehtimoliy topilma" jadvalini to'ldiring.
5. Hostda ufw bilan bitta portni `deny` qiling va qayta skanerlang. Holat qanday o'zgardi? `reject` bilan-chi?
6. TryHackMe'dagi "Nmap" xonasini o'ting.

**Javoblar:**
1. Lokal tarmoqda Nmap ARP ishlatadi — natija juda tez va ishonchli.
2. `-sT` da SSH jurnalida to'liq ulanishlar ko'rinadi ("Connection closed by ... [preauth]" kabi); `-sS` da ulanish tugallanmagani uchun SSH dasturi odatda hech narsa yozmaydi — lekin firewall va IDS ko'radi.
3. Metasploitable kabi ataylab zaif mashinada o'nlab ochiq portlar va eski versiyalar chiqadi — har biri keyingi darslar uchun material.
4. Har bir qator uchun "keyingi qadam" aniq bo'lishi kerak: enumeratsiya, versiyani tekshirish yoki "kerak emas, yopish tavsiya".
5. `deny` (drop) — `filtered`; `reject` — `closed` (RST yoki ICMP xato qaytadi). Himoyachi uchun `drop` skanni sekinlashtiradi, lekin ikkalasi ham bir xil himoya.
6. Xona skan turlari, NSE va natijani o'qish bo'yicha amaliyot beradi.
:::

## Xulosa

- Bosqichlar: host discovery (`-sn`, kerak bo'lsa `-Pn`), port skan, versiya (`-sV`), skriptlar (`-sC`) va OS (`-O`).
- `-sS` — tez, ulanishni tugatmaydi; `-sT` — root'siz, ilova jurnallarida iz; `-sU` — sekin, lekin muhim xizmatlarni topadi.
- Sukut 1000 port yetarli emas: tez skan + to'liq `-p-` + topilgan portlarga batafsil skan.
- Mijoz tizimida ehtiyotkor tezlik; natija `-oA` bilan saqlanadi — bu dalil.
- Holatlar: open, closed (RST), filtered (jimlik). Versiya — keyingi qadamlarning kaliti.
- NSE: `default`/`safe`/`discovery` — odatda xavfsiz; `intrusive`, `brute`, `dos`, `exploit` — RoE ruxsatisiz yo'q.
- Har bir skan mijoz jurnallarida ko'rinadi; himoyachi uchun skan — fon, muhimi undan keyingi voqealar.

:::quiz
? `-sS` (SYN) skani qanday ishlaydi?
+ SYN yuboradi, SYN-ACK kelsa port ochiq deb belgilaydi va ulanishni RST bilan uzadi
- To'liq TCP ulanishni o'rnatadi va ma'lumot yuboradi
- Faqat UDP paketlar yuboradi
- Faqat ping yuboradi
! Ulanish tugallanmagani uchun "yarim ochiq" deyiladi; root huquqi talab qiladi.

? `-sT` skanining `-sS` dan farqi nimada?
- U tezroq va jim
+ U to'liq TCP ulanish o'rnatadi — root huquqi kerak emas, lekin ilova jurnallarida ko'proq iz qoldiradi
- U faqat UDP uchun
- U OS'ni aniqlaydi
! Connect skan tizim chaqiruvi orqali ishlaydi va xizmat jurnallarida ko'rinadi.

? Port `filtered` holatda. Bu nimani bildiradi?
- Portda xizmat yo'q
+ Firewall paketni tashlamoqda — javob yo'q; ortida xizmat bo'lishi ham, bo'lmasligi ham mumkin
- Port ochiq va xavfsiz
- Host o'chirilgan
! closed — RST javobi; filtered — jimlik yoki ICMP xato.

? Nega sukut bo'yicha 1000 port skanerlash ko'pincha yetarli emas?
+ Ilovalar 8080, 8443, 3000 kabi yoki g'ayrioddiy portlarda ishlashi mumkin; to'liq `-p-` ularni topadi
- 1000 port skanerlash noqonuniy
- Nmap 1000 dan ortiq portni bilmaydi
- Barcha xizmatlar 80-portda ishlaydi
! Amaliy yondashuv: tez skan, keyin to'liq skan, so'ng topilgan portlarga batafsil tekshiruv.

? UDP skanerlash nega sekin va noaniq?
- UDP portlar mavjud emas
+ Ochiq UDP port ko'pincha javob bermaydi, shuning uchun jimlik ochiqmi yoki filtrlanganmi aniq emas
- UDP faqat Windows'da ishlaydi
- Nmap UDP'ni qo'llab-quvvatlamaydi
! Natijada ko'p `open|filtered` holatlari chiqadi.

? Skanda `8080/tcp open http Werkzeug httpd` va sarlavhada "debug" ko'rindi. Bu qanday baholanadi?
- Ahamiyatsiz kuzatuv
+ Ishlab chiqish serveri internetga ochiq — jiddiy topilma, darhol tekshirish va RoE bo'yicha xabar
- Bu normal ishlab chiqarish sozlamasi
- Faqat 80-port muhim
! Flask'ning ishlab chiqish serveri va debug rejimi ishlab chiqarishda bo'lmasligi kerak.

? Qaysi NSE skript toifalari RoE aniq ruxsat bermasa ishga tushirilmaydi?
- default va safe
+ intrusive, brute, dos va exploit
- discovery
- Hech qaysi, hammasi xavfsiz
! Ular hisoblarni bloklashi, xizmatlarni yiqitishi yoki tizimga ta'sir qilishi mumkin.

? `-oA` opsiyasi nima uchun kerak?
- Skanni tezlashtiradi
+ Natijani uch formatda (matn, grep uchun, XML) saqlaydi — dalil va boshqa vositalar uchun
- Barcha portlarni skanerlaydi
- OS'ni aniqlaydi
! Skan natijasi eslatmalar papkasida, vaqt bilan saqlanadi va hisobotda dalil bo'ladi.

? Himoyachi nuqtai nazaridan tashqi port skanerlash haqida qaysi gap to'g'ri?
+ Internetdagi har bir server uni doimiy ko'radi — bu fon; muhimi skandan keyin nima bo'lgani (muvaffaqiyatli login, yangi xizmatga murojaat)
- Har bir skan — kritik insident
- Skanerlashni aniqlab bo'lmaydi
- Skan faqat ichki tarmoqda bo'ladi
! SOC uchun kontekst muhim: skan + keyingi muvaffaqiyatli harakat — signal.

? Nmap versiyani "PostgreSQL 13" deb aniqladi. Bu zaiflik borligining isbotimi?
- Ha, har doim
+ Yo'q — versiya noto'g'ri aniqlanishi yoki yamoqlar backport qilingan bo'lishi mumkin; tekshirish kerak
- Faqat UDP'da
- Ha, agar port ochiq bo'lsa
! Versiya — gipoteza manbai, isbot emas.
:::

:::cards
Host discovery (-sn) :: Port skansiz qaysi manzillar tirikligini aniqlash
-Pn :: Discovery'siz — hostni tirik deb hisoblab to'g'ridan-to'g'ri port skan
-sS :: SYN skan: SYN-ACK kelsa ochiq, RST bilan uziladi
-sT :: Connect skan: to'liq ulanish, root'siz, jurnallarda ko'proq iz
-sU :: UDP skan: sekin, ko'p open|filtered
-sV :: Xizmat va versiyani aniqlash
-sC :: NSE default skriptlari
-p- :: Barcha 65535 TCP port
filtered :: Firewall jim tashlaydi — javob yo'q
closed :: Host RST bilan javob beradi — portda hech kim yo'q
-oA :: Natijani matn, grep va XML formatlarida saqlash
NSE xavfli toifalar :: intrusive, brute, dos, exploit — RoE ruxsatisiz yo'q
:::
