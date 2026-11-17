Sizga 40 MB'lik fayl berishdi: `2026-11-16-hodisa.pcap`. Unda bir soatlik ofis tarmog'i trafigi — taxminan 60 000 paket. Topshiriq: "Shu soat ichida bitta kompyuter zararlangan. Qaysi biri, qanday, va keyin nima bo'lgan?"

60 000 paketni birma-bir o'qib chiqish imkonsiz. Lekin to'g'ri usul bilan javobni yarim soatda topasiz. Bu darsda shu usulni o'rganasiz — SOC va incident response'dagi eng qadrli amaliy ko'nikmalardan biri.

Tarmoq bosqichidagi Wireshark darsida paketlarni ushlash va filtrlashni o'rgangansiz. Endi — **tergov**.

## PCAP va loglar: farqi nimada

O'tgan darsda tarmoq loglari bilan ishladik — ular ulanishlar haqidagi **qisqa yozuvlar**. [[pcap|PCAP]] esa **trafikning o'zi**: har bir paket, to'liq mazmuni bilan.

| | Tarmoq loglari (Zeek, firewall) | PCAP |
|---|---|---|
| Hajmi | Kichik — oylab saqlanadi | Ulkan — odatda bir necha soat yoki kun |
| Mazmun | Metama'lumot: kim, kimga, qachon, qancha | **Hamma narsa**: so'rovlar, javoblar, fayllar |
| Tezlik | Tez qidiriladi | Sekin, chuqur |
| Qachon ishlatiladi | Har kuni, keng qidiruv | Aniq hodisani chuqur tekshirish |

Amaliy qoida: **loglar "qayerga qarash kerak"ligini, PCAP "aynan nima bo'lgan"ligini aytadi.** Haqiqiy SOC'da ko'pincha hamma trafik doimiy yozilmaydi — faqat muhim segmentlarda yoki ogohlantirishdan keyin yoqiladi.

:::warn
**Tahlil uchun olingan PCAP fayllarda haqiqiy zararli dasturlar bo'lishi mumkin.** Malware-Traffic-Analysis.net kabi saytlardagi mashq fayllari ataylab haqiqiy hujumlardan olingan. Shuning uchun:
- Ularni faqat **laboratoriya virtual mashinasida** oching (s1 bosqichidagi VM), asosiy kompyuteringizda emas.
- PCAP'dan ajratib olingan fayllarni **hech qachon ishga tushirmang** — faqat xeshini oling.
- Arxivlar parol bilan himoyalangan — parol saytning o'zida ko'rsatilgan; bu antivirus faylni o'chirib yubormasligi uchun.
- Tahlil tugagach, VM'ni snapshot'dan qayta tiklang.
:::

## Tahlil usuli: umumiydan xususiyga

Eng katta xato — PCAP'ni ochib, birinchi paketdan boshlab o'qish. To'g'ri yo'l — **voronka**: avval umumiy rasm, keyin toraytirish.

```
 1. Umumiy ko'rinish     — qancha vaqt, qanday protokollar, kim faol?
         ▼
 2. Qurilmalarni tanish  — qaysi IP qaysi kompyuter va foydalanuvchi?
         ▼
 3. Shubhalilarni topish — g'alati domenlar, fayl yuklashlar, takroriy ulanishlar
         ▼
 4. Chuqur tahlil        — oqimlarni o'qish, fayllarni ajratish
         ▼
 5. Vaqt chizig'i va IOC — hikoyani tiklash, hisobot
```

### 1-qadam: umumiy ko'rinish

Wireshark'ning **Statistics** menyusi — eng yaxshi boshlanish:

| Menyu | Nimani ko'rsatadi | Nima uchun |
|---|---|---|
| **Capture File Properties** | Boshlanish va tugash vaqti, paketlar soni | Qaysi davrni tahlil qilyapsiz |
| **Protocol Hierarchy** | Qaysi protokollar qancha foiz | Kutilmagan protokol bormi (masalan, ofisda IRC) |
| **Conversations** | Kim kim bilan qancha ma'lumot almashgan | Eng faol juftliklar, katta yuborishlar |
| **Endpoints** | Barcha IP manzillar va ularning trafigi | Ichki va tashqi ishtirokchilar ro'yxati |

**Conversations** oynasida "Bytes" bo'yicha saralang: eng ko'p ma'lumot almashgan juftliklar tepaga chiqadi. Ichki IP'dan tashqi IP'ga katta **yuborilgan** hajm (A → B) — darhol e'tiborga loyiq.

### 2-qadam: qurilma va foydalanuvchini tanish

O'tgan darsdan eslaysiz: IP — hali qurilma emas. Yaxshi xabar: PCAP ichida ko'pincha javob bor.

| Wireshark filtri | Nimani topadi |
|---|---|
| `dhcp` | Qurilma nomi (Host Name), MAC manzil, berilgan IP |
| `nbns` | Windows qurilma nomlari (NetBIOS) |
| `kerberos.CNameString` | Domen foydalanuvchi nomi — Windows domen muhitida |
| `http.user_agent` | Qanday operatsion tizim va brauzer |

DHCP paketini oching va **Option 12: Host Name** maydonini toping — u yerda `WS-BUX-014` kabi nom bo'ladi. Kerberos paketlarida esa `d.karimova` kabi hisob nomi. Endi sizda IP, MAC, qurilma nomi va foydalanuvchi bor — hisobotning birinchi qatori tayyor.

### 3-qadam: shubhalilarni topish

Endi DNS, HTTP va TLS — "qayerga borilgan"ini ko'ramiz:

| Filtr | Nimani ko'rsatadi |
|---|---|
| `dns.flags.response == 0` | Barcha DNS so'rovlari |
| `http.request` | Barcha HTTP so'rovlari (shifrlanmagan) |
| `http.request.method == "POST"` | Ma'lumot yuborish so'rovlari |
| `tls.handshake.type == 1` | TLS ulanish boshlanishi (Client Hello) |
| `tls.handshake.extensions_server_name` | HTTPS'da qaysi saytga ulanilgani (SNI) |
| `tcp.flags.syn == 1 and tcp.flags.ack == 0` | Barcha yangi TCP ulanish urinishlari |
| `ip.addr == 10.10.10.23` | Faqat bitta qurilma trafigi |
| `!(arp or dns or icmp or ssdp)` | Shovqinni olib tashlash |

Qulay usul: ustunlarga `http.host` va `tls.handshake.extensions_server_name` ni qo'shing (maydonni o'ng tugma bilan bosib → **Apply as Column**). Endi har bir qatorda qaysi saytga borilgani bir qarashda ko'rinadi.

Nimani qidirasiz — o'tgan darsdagi belgilar: yangi yoki o'xshatma domenlar, domen o'rniga IP, notanish domendan `.exe`/`.zip`/`.js` yuklash, skript user-agent'lari, DGA va tunnellash belgilari.

### 4-qadam: chuqur tahlil

**Oqimni o'qish.** Shubhali paketni o'ng tugma bilan bosing → **Follow → TCP Stream** (yoki HTTP Stream). Wireshark butun suhbatni bitta matn sifatida ko'rsatadi: qizil — mijoz so'rovi, ko'k — server javobi. Shifrlanmagan HTTP'da so'rov sarlavhalari, javob va hatto yuklangan faylning boshi ko'rinadi.

**Faylni ajratib olish.** **File → Export Objects → HTTP** (yoki SMB, FTP) — tarmoq orqali o'tgan barcha fayllar ro'yxati: nomi, turi, hajmi, qaysi hostdan. Keraklisini saqlang — **laboratoriya VM'ida** — va darhol xeshini oling:

```bash
sha256sum yuklangan_fayl.bin           # Linux
```

```powershell
Get-FileHash .\yuklangan_fayl.bin -Algorithm SHA256   # Windows
```

Keyin xeshni (faylni emas!) VirusTotal'da qidiring — triage darsidagi qoida. Kompyuter bosqichidagi **magic bytes**ni ham eslang: fayl nomi `invoice.pdf` bo'lsa ham, birinchi baytlari `MZ` bo'lsa — bu Windows dasturi.

E'tibor bering: fayllarni faqat **shifrlanmagan** protokollardan ajratib olish mumkin. HTTPS orqali yuklangan fayl PCAP'da shifrlangan holda yotadi — kalitlarsiz uni ochib bo'lmaydi.

**Terminalda — tshark.** Wireshark'ning buyruq satri versiyasi katta fayllar va avtomatlashtirish uchun qulay. Linux bosqichidagi quvurlar bilan birga:

```bash
# Barcha DNS so'rovlari, eng ko'p so'ralganlari tepada
tshark -r hodisa.pcap -Y "dns.flags.response == 0" -T fields -e dns.qry.name \
  | sort | uniq -c | sort -nr | head -20

# HTTPS'da ulanilgan saytlar (SNI)
tshark -r hodisa.pcap -Y "tls.handshake.type == 1" -T fields \
  -e ip.src -e tls.handshake.extensions_server_name | sort -u

# TCP suhbatlar statistikasi
tshark -r hodisa.pcap -q -z conv,tcp

# HTTP orqali o'tgan barcha fayllarni papkaga ajratish
tshark -r hodisa.pcap --export-objects http,./fayllar
```

### PCAP'ni Zeek orqali o'tkazish

O'tgan darsdagi Zeek PCAP fayllar bilan ham ishlaydi — va bu katta faylni tez tushunishning eng yaxshi yo'llaridan biri:

```bash
mkdir zeek-natija && cd zeek-natija
zeek -C -r ../hodisa.pcap        # -C: tekshiruv summasi xatolarini e'tiborsiz qoldirish
ls                               # conn.log dns.log http.log ssl.log files.log ...

# Eng ko'p ma'lumot yuborgan ulanishlar
cat conn.log | zeek-cut id.orig_h id.resp_h id.resp_p orig_bytes | sort -k4 -nr | head
```

Bir necha soniyada 60 000 paket bir necha yuz qatorli tushunarli jadvallarga aylanadi. Shundan keyin Wireshark'ni faqat aniq shubhali ulanishlar uchun ochasiz.

Xuddi shunday, **Suricata** ([[ids|IDS]]) PCAP'ni ma'lum hujum imzolari bilan solishtiradi va ogohlantirishlar ro'yxatini beradi (`suricata -r hodisa.pcap -l natija/`). Bu sizga "qayerdan boshlash kerak"ligini aytadi — lekin uning ogohlantirishlari ham triage qilinishi kerak.

## C2 trafigini tanish

Zararli dastur qurilmaga o'rnashgach, odatda hujumchining [[c2|C2]] (boshqaruv) serveri bilan aloqa o'rnatadi: buyruqlar olish va natijalarni yuborish uchun. Bu aloqa tarmoqda iz qoldiradi.

### Beaconing

Ko'p zararli dasturlar C2'ga doimiy ulanib turmaydi — ular muntazam "qo'ng'iroq qilib" turadi: "men shu yerdaman, menga buyruq bormi?" Buni [[beaconing|beaconing]] deyiladi.

```
10.10.10.23 → 203.0.113.45:443   09:33:15   412 bayt yuborildi,  210 bayt olindi
10.10.10.23 → 203.0.113.45:443   09:34:16   412 bayt yuborildi,  210 bayt olindi
10.10.10.23 → 203.0.113.45:443   09:35:14   412 bayt yuborildi,  210 bayt olindi
10.10.10.23 → 203.0.113.45:443   09:36:15   412 bayt yuborildi,  210 bayt olindi
   ... har ~60 soniyada, soatlab ...
```

Belgilar:

- **Muntazam oraliq** — har 60 soniyada (ko'pincha ozgina tasodifiy og'ish bilan — "jitter" — aniqlashni qiyinlashtirish uchun).
- **Bir xil hajm** — har safar deyarli bir xil baytlar.
- **Davomiylik** — soatlab, hatto foydalanuvchi kompyuterdan uzoqda bo'lganda ham (tunda!).
- **Bitta noyob manzil** — tarmoqda faqat shu bitta qurilma unga ulanadi.

Odam bunday ishlamaydi: odam sahifalarni tartibsiz ochadi, tushlikka ketadi, kechqurun kompyuterni o'chiradi. Lekin ehtiyot bo'ling — qonuniy dasturlar ham beacon qiladi: yangilanish tekshiruvlari, pochta mijozlari, antivirus, bulut sinxronizatsiyasi. Farq — **manzilda**: ma'lum, mashhur xizmatmi yoki faqat bitta qurilma ulanadigan, yaqinda ro'yxatdan o'tgan domenmi?

Wireshark'da muntazamlikni **Statistics → I/O Graphs** da ko'rish mumkin: bitta IP uchun filtr qo'ysangiz, beacon tekis "taroq" ko'rinishida chiqadi. Katta hajmdagi Zeek loglari uchun esa beaconing'ni avtomatik baholaydigan maxsus vositalar bor (masalan, RITA).

### Boshqa C2 belgilari

| Belgi | Nega shubhali |
|---|---|
| DNS so'rovisiz to'g'ridan-to'g'ri IP'ga ulanish | Qonuniy dasturlar deyarli har doim domen nomidan foydalanadi |
| Standart bo'lmagan port (4444, 8443, 1337…) | Kutilgan xizmatga mos kelmaydi |
| 443-portda HTTPS emas, boshqa protokol | Portni "niqob" sifatida ishlatish |
| G'alati yoki o'zi imzolagan TLS sertifikati | Qonuniy saytlar odatda tan olingan CA sertifikatini ishlatadi |
| Notanish user-agent yoki umuman yo'q | Dastur brauzerga o'xshashga harakat qiladi, lekin har doim ham uddalay olmaydi |
| Juda uzoq davom etgan bitta ulanish | Doimiy boshqaruv kanali |
| **Yuborilgan > olingan** (assimetriya) | Odatiy foydalanuvchi ko'proq yuklab oladi; ko'proq yuborish — ma'lumot olib chiqilishi |
| DNS tunnellash belgilari | O'tgan darsda |

### Shifrlangan trafik: hali ham nima ko'rinadi

Zamonaviy C2'ning ko'pi HTTPS ichida. Mazmuni ko'rinmaydi — lekin bu "hech narsa ko'rinmaydi" degani emas:

| Ko'rinadi | Ko'rinmaydi |
|---|---|
| IP manzillar va portlar | So'rovlar va javoblar mazmuni |
| Vaqt va oraliqlar (beaconing!) | URL yo'li va parametrlari |
| Paketlar hajmi | Yuklangan fayllar |
| SNI — server nomi (agar ECH ishlatilmasa) | Cookie va parollar |
| TLS 1.2'da — sertifikat ma'lumotlari | TLS 1.3'da — sertifikat ham shifrlangan |
| TLS "barmoq izi" (JA3/JA4) | |

**JA3/JA4** — TLS ulanishni boshlash usuliga qarab dasturning "barmoq izi". Har bir brauzer va dastur o'ziga xos tarzda salomlashadi; ba'zi zararli vositalarning barmoq izlari ma'lum va ular bo'yicha qidirish mumkin. Tafsilotlari keyingi bosqichlarda.

:::key
Trafik tahlilining oltin qoidasi: **"Bu trafik qaysi biznes ehtiyojga xizmat qiladi?"** Har bir ulanishning sababi bo'lishi kerak: veb-sayt, pochta, yangilanish, bulut xizmati. Sababini topa olmagan ulanishingiz — tergov yo'nalishingiz. Va hech qachon bitta belgiga tayanmang: beaconing + yangi domen + faqat bitta qurilma + tunda ham davom etadi — mana bu dalil.
:::

## Hikoyani tiklash: misol

Tahlil oxirida tarqoq faktlar **vaqt chizig'i**ga aylanishi kerak. Mana yuqoridagi PCAP'dan tiklangan hikoya:

| Vaqt | Hodisa | Dalil |
|---|---|---|
| 09:31:58 | `WS-BUX-014` (10.10.10.23, d.karimova) pochta serveriga ulanadi | DHCP, Kerberos, conn.log |
| 09:32:14 | DNS: `update-check.example-cdn.net` → 203.0.113.45 | `dns` filtri |
| 09:32:15 | `GET /a.ps1` — user-agent `WindowsPowerShell/5.1` | HTTP oqimi |
| 09:32:16 | `GET /upd.bin` — 248 KB, birinchi baytlari `MZ` | Export Objects, magic bytes |
| 09:33:15 → | 203.0.113.45:443 ga har ~60 soniyada ulanish | Conversations, I/O Graph |
| 10:05:40 | Xuddi shu manzilga **14 MB yuborildi** | conn.log `orig_bytes` |

Sysmon darsidagi qurilma ko'rinishi bilan solishtiring — xuddi shu hikoya, endi tarmoq tomonidan. Ikki mustaqil manba bir-birini tasdiqlaydi.

Hisobotda doim quyidagilar bo'ladi:

- **Zararlangan qurilma:** IP, MAC, qurilma nomi, foydalanuvchi.
- **Vaqt chizig'i** — yuqoridagi kabi.
- **IOC'lar** ([[ioc|Indicators of Compromise]]): domenlar, IP'lar, URL'lar, fayl xeshlari.
- **Xulosa va tavsiya:** qurilmani ajratish, IOC'larni bloklash, boshqa qurilmalarda shu IOC'larni qidirish.

IOC'larni hisobotda **"zararsizlantirib"** (defang) yozing — tasodifan bosilib ketmasligi uchun: `hxxp://update-check[.]example-cdn[.]net/a.ps1`, `203.0.113[.]45`.

## Amaliyot qayerda

Bu ko'nikma faqat amaliyotda o'sadi. Eng yaxshi manbalar:

| Manba | Nima |
|---|---|
| **Malware-Traffic-Analysis.net** | Yuzlab haqiqiy PCAP mashqlari, javoblari bilan — sohaning klassikasi |
| **TryHackMe** — "Wireshark: Traffic Analysis" | Bosqichma-bosqich, brauzerda |
| **CyberDefenders** | Ko'k jamoa topshiriqlari, ko'pi PCAP bilan |
| **Wireshark namunalari** (wiki.wireshark.org/SampleCaptures) | Turli protokollarni o'rganish uchun |

Maqsad — kamida **5 ta** PCAP topshirig'ini to'liq yechish va har biri uchun yuqoridagi tuzilishda qisqa hisobot yozish. Hisobotlaringizni GitHub'ga joylang — bu ish beruvchiga ko'rsatadigan portfoliongiz bo'ladi.

:::try
**1. Voronka mashqi.** Wireshark namunalari sahifasidan istalgan HTTP PCAP'ni yuklab oling. Faqat **Statistics** menyusidan foydalanib javob bering: qancha vaqtni qamraydi? Eng ko'p ishlatilgan protokol? Eng ko'p ma'lumot almashgan ikki IP?

**2. Ustunlar.** `http.host` va `tls.handshake.extensions_server_name` ni ustun qilib qo'shing. Endi `http.request or tls.handshake.type == 1` filtri bilan barcha borilgan saytlar ro'yxatini ko'ring.

**3. Fayl ajratish — laboratoriya VM'ida.** O'zingiz trafik yarating: VM'da Wireshark'ni yoqing, keyin `curl http://example.com -o sahifa.html` (HTTP, HTTPS emas). Ushlashni to'xtating va **File → Export Objects → HTTP** orqali sahifani ajratib oling. Ikkala faylning SHA-256 xeshi bir xilmi?

**4. Malware-Traffic-Analysis.** Sayt mashqlaridan birini (eng boshlang'ichlaridan) laboratoriya VM'ida yeching: zararlangan qurilmaning IP, MAC, nomi va foydalanuvchisini toping. Javobni sayt javobi bilan solishtiring.

*Javoblar: 1 — Capture File Properties, Protocol Hierarchy va Conversations (Bytes bo'yicha saralangan) yetarli. 3 — ha, agar sahifa siqilmasdan uzatilgan bo'lsa: tarmoqdan ajratilgan nusxa yuklangan fayl bilan bir xil; farq qilsa — server javobni siqqan yoki chunk'larga bo'lgan bo'lishi mumkin, Wireshark'ning qanday tiklaganini oqimda tekshiring. 4 — DHCP (Host Name, MAC), Kerberos (`kerberos.CNameString`) filtrlari bilan.*
:::

## Xulosa

- **PCAP** — trafikning o'zi; loglar "qayerga qarash"ni, PCAP "aynan nima bo'lgan"ni aytadi.
- Mashq PCAP'larida haqiqiy zararli dasturlar bor — faqat **laboratoriya VM'ida**, ajratilgan fayllarni ishga tushirmasdan.
- Usul — **voronka**: Statistics → qurilmani tanish (DHCP, Kerberos) → DNS/HTTP/TLS → oqim va fayllar → vaqt chizig'i.
- Fayllar **Export Objects** bilan ajratiladi (faqat shifrlanmagan protokollardan); keyin xeshi tekshiriladi.
- **tshark** va **Zeek** katta PCAP'larni tez jadvallarga aylantiradi.
- **C2 belgilari:** beaconing (muntazam oraliq, bir xil hajm, tunda ham), DNS'siz IP, noodatiy port, g'alati sertifikat, yuborilgan > olingan.
- Shifrlangan trafikda ham IP, vaqt, hajm, SNI va TLS barmoq izi ko'rinadi.
- Hisobot: qurilma, vaqt chizig'i, **defang qilingan IOC'lar**, tavsiya.

:::quiz
? PCAP va tarmoq loglarining asosiy farqi nima?
- PCAP faqat DNS so'rovlarini saqlaydi
+ PCAP har bir paketni to'liq mazmuni bilan saqlaydi; loglar faqat ulanishlar haqidagi qisqa ma'lumotni
- Loglar har doim PCAP'dan batafsilroq
- Farqi yo'q
! Loglar kichik va keng qidiruv uchun; PCAP ulkan, lekin aniq hodisani to'liq ko'rsatadi.

? Mashq uchun yuklab olingan PCAP faylni qayerda ochish kerak?
- Asosiy ish kompyuterida, antivirusni o'chirib
+ Laboratoriya virtual mashinasida, ajratilgan fayllarni ishga tushirmasdan
- Kompaniya serverida
- Telefonda
! Mashq PCAP'larida haqiqiy zararli dasturlar bo'lishi mumkin.

? Katta PCAP'ni tahlil qilishni qayerdan boshlash to'g'ri?
- Birinchi paketdan boshlab hammasini o'qish
+ Umumiy statistikadan: vaqt oralig'i, protokollar, eng faol suhbatlar
- Tasodifiy paketni tanlash
- Faqat oxirgi paketlarni ko'rish
! Voronka usuli: umumiy rasmdan aniq shubhali joyga qarab toraytiriladi.

? PCAP'da qurilma nomini qaysi filtr yordamida topish mumkin?
+ dhcp
- tcp.flags.syn == 1
- http.request.method == "POST"
- icmp
! DHCP so'rovidagi Option 12 (Host Name) qurilma nomini, shuningdek MAC manzilni ko'rsatadi.

? HTTPS ulanishida qaysi saytga ulanilganini qaysi maydon ko'rsatadi (ECH bo'lmasa)?
- http.host
+ tls.handshake.extensions_server_name (SNI)
- dns.flags.response
- tcp.port
! SNI TLS salomlashuvining boshida ochiq yuboriladi; mazmun esa shifrlangan.

? Nega PCAP'dan HTTPS orqali yuklangan faylni Export Objects bilan ajratib bo'lmaydi?
- Wireshark HTTPS'ni ko'rmaydi
+ Fayl shifrlangan holda uzatilgan; kalitlarsiz uni ochib bo'lmaydi
- HTTPS fayllar uzatmaydi
- Bu faqat Linux'da ishlaydi
! Export Objects faqat shifrlanmagan protokollar (HTTP, SMB, FTP) uchun ishlaydi.

? Qaysi naqsh beaconing'ga eng ko'p mos keladi?
- Foydalanuvchi ish vaqtida turli saytlarni tartibsiz ochadi
+ Bitta qurilma notanish manzilga har ~60 soniyada bir xil hajmda, tunda ham ulanadi
- Barcha qurilmalar ertalab yangilanish serveriga ulanadi
- Bitta katta fayl bir marta yuklab olinadi
! Muntazam oraliq, bir xil hajm, uzoq davomiylik va noyob manzil — beaconing belgilari.

? Qonuniy dasturlar ham muntazam ulanadi. Beaconing'ni ulardan qanday ajratish mumkin?
- Ajratib bo'lmaydi
+ Manzilga qarab: ma'lum mashhur xizmatmi yoki faqat bitta qurilma ulanadigan, yaqinda yaratilgan domenmi
- Faqat port raqamiga qarab
- Paketlar rangiga qarab
! Yangilanish va sinxronizatsiya xizmatlari ham beacon qiladi; farq — manzilning obro'si va noyobligida.

? Ichki qurilmadan tashqi manzilga yuborilgan ma'lumot olingan ma'lumotdan ancha ko'p. Bu nimani anglatishi mumkin?
- Bu oddiy veb-sahifa ko'rish
+ Ma'lumot olib chiqilishi (exfiltration) — tekshirish kerak
- Tarmoq tezligi past
- DNS xatosi
! Oddiy foydalanuvchi ko'proq yuklab oladi; katta yuborish assimetriyasi tashvishli belgi.

? Shifrlangan C2 trafigida analitik nimani hali ham ko'ra oladi?
+ Ulanish vaqtlari va oraliqlarini (beaconing)
+ IP manzillar, portlar va paketlar hajmini
- So'rovlar mazmuni va yuborilgan buyruqlarni
- Foydalanuvchi parollarini
! Shifrlash mazmunni yashiradi, lekin metama'lumot — kim, qachon, qancha — ko'rinib qoladi.

? Nega hisobotdagi IOC'lar “hxxp://…[.]net” ko'rinishida yoziladi?
- Bu xatoni yashirish uchun
+ Havolalar tasodifan bosilib ketmasligi va avtomatik ochilmasligi uchun (defang)
- Bu qonun talabi
- Shunday qisqaroq
! Defang qilingan IOC o'qiladi, lekin bosilmaydi.
:::

:::cards
PCAP va log farqi? :: Loglar — ulanishlar haqidagi qisqa yozuvlar (qayerga qarash kerak); PCAP — har bir paket to'liq mazmuni bilan (aynan nima bo'lgan).
Trafik tahlilining voronka usuli? :: Umumiy statistika → qurilma va foydalanuvchini tanish → DNS/HTTP/TLS → oqim va fayllar → vaqt chizig'i va IOC.
Wireshark Statistics'ning asosiy oynalari? :: Capture File Properties, Protocol Hierarchy, Conversations, Endpoints.
PCAP'dan qurilma va foydalanuvchini qanday topish mumkin? :: dhcp (Host Name, MAC), nbns (NetBIOS nomi), kerberos.CNameString (domen foydalanuvchisi).
HTTPS'da sayt nomi qaysi maydonda? :: tls.handshake.extensions_server_name — SNI (ECH ishlatilmasa).
PCAP'dan faylni qanday ajratish mumkin? :: File → Export Objects → HTTP/SMB/FTP, yoki tshark --export-objects. Faqat shifrlanmagan protokollardan.
Ajratilgan fayl bilan nima qilinadi? :: Faqat laboratoriya VM'ida saqlanadi, ishga tushirilmaydi; SHA-256 xeshi olinib, xesh bo'yicha qidiriladi.
Beaconing belgilari? :: Muntazam oraliq (jitter bilan), bir xil hajm, soatlab davom etadi, tunda ham, faqat bitta qurilma ulanadigan manzil.
Boshqa C2 belgilari? :: DNS'siz IP'ga ulanish, noodatiy port, g'alati sertifikat, notanish user-agent, uzoq ulanish, yuborilgan > olingan.
Shifrlangan trafikda nima ko'rinadi? :: IP, port, vaqt, hajm, SNI, TLS barmoq izi (JA3/JA4); TLS 1.2'da sertifikat ham.
zeek -C -r fayl.pcap nima qiladi? :: PCAP'ni o'qib conn.log, dns.log, http.log, ssl.log, files.log kabi tuzilgan loglar yaratadi.
IOC defang nima? :: IOC'ni bosilmaydigan qilib yozish: hxxp://domen[.]net, 203.0.113[.]45.
:::
