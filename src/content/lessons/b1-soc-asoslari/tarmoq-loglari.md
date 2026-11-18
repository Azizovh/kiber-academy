Kompyuterni buzib kirgan hujumchi uning jurnallarini tozalashi, Sysmon'ni o'chirishi, `bash_history` ni yo'q qilishi mumkin. Lekin bitta narsani o'zgartira olmaydi: **o'z ma'lumotlari tarmoq orqali o'tganini.** Har bir ulanish firewall'dan, har bir domen nomi DNS serverdan, har bir veb-so'rov proxy'dan o'tadi — va ular boshqa qurilmalarda, hujumchi qo'li yetmaydigan joyda yoziladi.

Undan tashqari, tarmoqda agent o'rnatib bo'lmaydigan qurilmalar ham bor: printerlar, kameralar, eski serverlar, xodimlarning shaxsiy telefonlari. Ularni faqat tarmoq orqali ko'rasiz.

Shuning uchun SOC'da tarmoq loglari — qurilma loglarining **mustaqil guvohi**.

## Tarmoqda kim nimani yozadi

Tarmoq bosqichidan eslaysiz: kompaniya tarmog'ida trafik bir necha nazorat nuqtasidan o'tadi. Ularning har biri o'z jurnalini yuritadi:

```
  Xodim kompyuteri ──► DNS server ──► "example.com qayerda?"       → DNS log
         │
         ├──────────► Proxy ────────► "GET https://example.com/…"  → Proxy log
         │
         └──────────► Firewall ─────► "10.10.10.23 → 203.0.113.45:443 ruxsat" → Firewall log
                                              │
                                          Internet
```

| Manba | Nimani ko'radi | Asosiy savol |
|---|---|---|
| **Firewall** | Kim kim bilan qaysi port orqali gaplashdi, ruxsat berildimi | "Ulanish bo'ldimi?" |
| **Proxy** | Qaysi URL ochildi, qanday dastur bilan, qancha ma'lumot | "Qaysi saytga, nima qilindi?" |
| **DNS** | Qaysi domen nomi so'raldi va qanday javob olindi | "Qayerga bormoqchi edi?" |
| **DHCP** | Qaysi qurilmaga qaysi IP berildi | "Bu IP aslida kim?" |
| **IDS/NSM** (Zeek, Suricata) | Trafik metama'lumotlari va ma'lum hujum belgilari | "Trafikda nima g'alati?" |

Bu darsda birinchi uchtasini chuqur o'rganamiz va oxirida Zeek bilan tanishamiz.

## Firewall loglari

[[firewall|Firewall]] — tarmoq chegarasidagi qo'riqchi. U har bir ulanish haqida qaror qabul qiladi va (sozlangan bo'lsa) yozib qo'yadi.

Har bir ishlab chiqaruvchining formati boshqacha, lekin maydonlar deyarli bir xil:

| Maydon | Misol | Ma'nosi |
|---|---|---|
| Vaqt | 2026-11-16 02:14:07 | Qachon |
| Harakat | `allow` / `deny` / `drop` | Ruxsat berildimi |
| Protokol | TCP | TCP, UDP, ICMP |
| Manba IP:port | 203.0.113.45:51234 | Kim |
| Manzil IP:port | 10.10.10.5:22 | Kimga, qaysi xizmatga |
| Qoida | rule 12 | Qaysi qoida qaror qildi |
| Baytlar | 4 280 | Qancha ma'lumot o'tdi |
| Yo'nalish | inbound / outbound | Ichkariga yoki tashqariga |

Linux'dagi UFW (oddiy firewall) logidan qator — Linux bosqichidagi bilim bilan o'qiy olasiz:

```
Nov 16 02:14:07 web01 kernel: [UFW BLOCK] IN=eth0 OUT= SRC=203.0.113.45 DST=10.10.10.5
  LEN=60 TTL=48 PROTO=TCP SPT=51234 DPT=23 WINDOW=1024 SYN
```

`SRC` — kimdan, `DST` — kimga, `DPT=23` — [[telnet|Telnet]] porti, `SYN` — ulanishga birinchi urinish ([[handshake|uch qadamli salomlashish]]ning birinchi qadami), `BLOCK` — rad etildi.

### Firewall'da nimani qidirish kerak

| Naqsh | Logda qanday ko'rinadi | Ma'nosi |
|---|---|---|
| **Vertikal skanerlash** | Bitta manba → bitta qurilma, ko'p turli portlar, ko'p `deny` | Kimdir qaysi xizmatlar ochiqligini tekshirmoqda ([[port-scan|port scan]]) |
| **Gorizontal skanerlash** | Bitta manba → ko'p qurilma, bitta port | Muayyan xizmatni (masalan, 3389) butun tarmoqda qidirish |
| **Ichkaridan rad etilgan chiqish** | Ichki qurilma → tashqi IP, `deny`, takrorlanadi | **Ichkaridagi nimadir tashqariga chiqmoqchi** |
| **Noodatiy port orqali chiqish** | Ichki → tashqi, `allow`, port 4444, 8081… | Ma'lum xizmatga mos kelmaydigan trafik |
| **Katta hajmdagi chiqish** | Bitta ulanishda gigabaytlar tashqariga | Ma'lumot olib chiqilishi bo'lishi mumkin |
| **Noodatiy vaqt** | Tunda, dam olish kunida faol trafik | Baseline'dan chetlanish |

:::key
Firewall loglarining eng muhim qoidasi: **tashqaridan kelgan rad etishlar — shovqin, ichkaridan chiqishga urinishlar — signal.** Internetdagi har bir IP'ni kuniga minglab botlar skanerlaydi; ularning bloklanishi — firewall o'z ishini qilyapti degani. Lekin buxgalteriyadagi kompyuter har besh daqiqada bloklangan tashqi manzilga ulanishga urinsa — bu kompyuter ichida siz bilmagan nimadir bor. Va ruxsat berilgan **kiruvchi** ulanishlar rad etilganlaridan doim muhimroq: ular aslida ichkariga yetib borgan.
:::

## Proxy loglari

Ko'p kompaniyalarda xodimlar internetga to'g'ridan-to'g'ri emas, [[proxy|proxy]] server orqali chiqadi. Proxy firewall'dan ko'proq narsani ko'radi: faqat IP va port emas, **to'liq URL, foydalanuvchi va dastur**.

| Maydon | Misol |
|---|---|
| Vaqt | 2026-11-16 09:32:15 |
| Mijoz IP | 10.10.10.23 |
| Foydalanuvchi | d.karimova |
| Metod | GET / POST / CONNECT |
| URL yoki host | `http://update-check.example-cdn.net/a.ps1` |
| Holat kodi | 200 |
| Baytlar (yuborilgan / olingan) | 412 / 18 640 |
| User-Agent | `Mozilla/5.0 …` yoki `WindowsPowerShell/5.1` |
| Kategoriya | Business / News / **Uncategorized** / **Newly registered** |
| Harakat | allowed / blocked |

### HTTPS va proxy

Zamonaviy trafikning deyarli hammasi [[https|HTTPS]]. Oddiy proxy shifrlangan ulanish ichini ko'rmaydi — u faqat `CONNECT example.com:443` ni, ya'ni **qaysi hostga** ulanilganini ko'radi, lekin to'liq yo'l va mazmunni emas.

Ba'zi kompaniyalar **TLS inspection** (shifrni ochib tekshirish) ishlatadi: proxy ulanishni ochadi, tekshiradi va qayta shifrlaydi. Bu ko'rinishni beradi, lekin maxfiylik, qonunchilik va texnik murakkablik bilan bog'liq — bank va tibbiyot saytlari odatda istisno qilinadi. Qaysi rejim ishlatilishini bilish — loglaringiz nimani ko'rsatishi mumkinligini bilish demak.

### Proxy'da nimani qidirish kerak

| Belgi | Nega shubhali |
|---|---|
| User-Agent: `WindowsPowerShell`, `curl`, `python-requests` — oddiy xodim kompyuteridan | Odamlar brauzer ishlatadi; skript emas |
| `.exe`, `.ps1`, `.hta`, `.js` yuklash — notanish yoki yangi domendan | Zararli fayl yetkazib berish |
| Kategoriya: **Uncategorized** yoki **Newly registered** | Kecha yaratilgan domen — klassik hujum infratuzilmasi |
| URL'da domen o'rniga **to'g'ridan-to'g'ri IP** | Qonuniy xizmatlar odatda domen ishlatadi |
| Juda uzun, Base64'ga o'xshash URL parametrlari | Ma'lumotni URL ichida yashirib yuborish |
| Katta **yuborilgan** hajm (POST) noma'lum manzilga | Ma'lumot olib chiqilishi |
| Bir xil manzilga **aniq bir xil oraliqda** so'rovlar | "Beaconing" — keyingi darsda batafsil |

Sysmon darsidagi hikoyani eslang: `powershell.exe` Word'dan ishga tushdi va `203.0.113.45:443` ga ulandi. Proxy logida xuddi shu daqiqada `d.karimova` foydalanuvchisidan `WindowsPowerShell` user-agent bilan `update-check.example-cdn.net` ga so'rov ko'rinadi. **Ikki mustaqil manba — bitta hikoya.** Bu dalilni kuchli qiladi.

## DNS loglari

Internetdagi deyarli har bir harakat [[dns|DNS]] so'rovidan boshlanadi: sayt ochish, pochta yuborish, dastur yangilanishi — va zararli dasturning o'z boshqaruv serveriga ulanishi ham. Shuning uchun DNS loglari — eng arzon va eng boy ma'lumot manbalaridan biri.

DNS logidagi asosiy maydonlar:

| Maydon | Misol | Ma'nosi |
|---|---|---|
| Mijoz | 10.10.10.23 | Kim so'radi |
| So'rov nomi | `update-check.example-cdn.net` | Qaysi domen |
| So'rov turi | `A`, `AAAA`, `MX`, `TXT`, `CNAME` | Qanday yozuv |
| Javob kodi | `NOERROR` / `NXDOMAIN` | Topildimi yoki bunday domen yo'qmi |
| Javob | 203.0.113.45 | Qaysi IP qaytarildi |

### Shubhali domenni qanday tanish mumkin

**1. Yangi ro'yxatdan o'tgan domen.** Qonuniy kompaniyalarning domenlari odatda yillar davomida mavjud. Hujumchilar esa ko'pincha hujumdan bir necha kun oldin domen sotib oladi. Whois orqali yaratilgan sanani tekshiring.

**2. O'xshatma domenlar (typosquatting).** Haqiqiy nomga ko'z ilg'amas darajada o'xshash:

| Haqiqiy | O'xshatma | Hiyla |
|---|---|---|
| `mybank.uz` | `rnybank.uz` | `rn` ↔ `m` |
| `mybank.uz` | `mybank-uz.com` | Chiziqcha va boshqa zona |
| `mybank.uz` | `mybank.uz.secure-login.example` | Haqiqiy nom — subdomen sifatida |
| `mybank.uz` | `mybamk.uz` | Bitta harf almashtirilgan |

Uchinchi qatorga alohida e'tibor bering: domenni **o'ngdan chapga** o'qing. Haqiqiy egasi — oxirgi qism (`secure-login.example`), boshidagi `mybank.uz` shunchaki bezak. Bu Phishing darsida yana kerak bo'ladi.

**3. Tasodifiy ko'rinadigan nomlar (DGA).** Ba'zi zararli dasturlar har kuni yuzlab tasodifiy domen nomlarini hosil qiladi va ulardan birortasi javob berishini kutadi. Hujumchi faqat bittasini ro'yxatdan o'tkazadi. Logda bu shunday ko'rinadi:

```
10.10.10.31  A  kq3vx8zjt2mwl.example  NXDOMAIN
10.10.10.31  A  p0dhw7rnb4yxa.example  NXDOMAIN
10.10.10.31  A  zt9mfe2kxq1lc.example  NXDOMAIN
   ... yana 200 ta ...
10.10.10.31  A  w8bnq3yfr6tod.example  NOERROR  198.51.100.66
```

Belgilar: talaffuz qilib bo'lmaydigan nomlar, **bitta qurilmadan ko'p NXDOMAIN**, va oxirida bittasi topiladi.

**4. DNS tunnellash.** DNS — deyarli hamma joyda ruxsat berilgan protokol. Shuning uchun ba'zan ma'lumotni DNS so'rovlari ichiga yashirib olib chiqishadi:

```
10.10.10.44  TXT  aXNtO2ZhbWlsaXlhO2thcnRhX3JhcWFt.t.example-data.net
10.10.10.44  TXT  MTIzNDU2Nzg5MDEyMzQ1Njc4OTAxMjM0.t.example-data.net
10.10.10.44  TXT  NTY3ODkwYWJjZGVmZ2hpamtsbW5vcHFy.t.example-data.net
```

Belgilar: **juda uzun subdomenlar**, bitta domen ostida **minglab noyob** subdomen, ko'p `TXT` so'rovlari, Base64'ga o'xshash matn.

**5. Ichki DNS'ni chetlab o'tish.** Kompaniya qurilmalari faqat kompaniya DNS serveridan foydalanishi kerak. Firewall logida ichki qurilmadan to'g'ridan-to'g'ri tashqi DNS serverga (port 53) ulanish ko'rinsa — bu dastur nazoratni chetlab o'tishga urinayotganini anglatishi mumkin.

### DNS loglarini tahlil qilish

Linux bosqichidagi quvurlar bu yerda ham asosiy vosita. Masalan, matnli DNS log uchun:

```bash
# Eng ko'p so'ralgan domenlar
awk '{print $3}' dns.log | sort | uniq -c | sort -nr | head -20

# Eng ko'p NXDOMAIN olgan qurilmalar — DGA belgisi
grep NXDOMAIN dns.log | awk '{print $1}' | sort | uniq -c | sort -nr | head

# Juda uzun so'rov nomlari — tunnellash belgisi
awk 'length($3) > 50 {print $1, $3}' dns.log | head
```

E'tibor bering: eng ko'p so'raladigan domenlar odatda zerikarli (yangilanish xizmatlari, ofis dasturlari, qidiruv tizimlari). Ko'pincha qiziq narsa ro'yxatning **pastida** — faqat bir marta, faqat bitta qurilma tomonidan so'ralgan domenlar orasida. Tahdid ovida buni "long tail" (uzun dum) tahlili deyishadi.

:::warn
**DNS loglari ham ko'r bo'lishi mumkin.** Brauzerlar va ba'zi dasturlar **DNS over HTTPS** (DoH) ishlatadi: so'rovlar oddiy HTTPS trafigi ichida shifrlangan holda ketadi va kompaniya DNS serveri ularni umuman ko'rmaydi. Ko'p kompaniyalar shuning uchun korporativ qurilmalarda DoH'ni o'chirib qo'yadi yoki uni faqat o'z serveriga yo'naltiradi. Tergovda "DNS logida bu domen yo'q" degani — "qurilma bu domenga murojaat qilmagan" degani emas.
:::

## IP manzil — bu hali qurilma emas

Tarmoq loglaridagi eng katta tuzoq: **IP manzil vaqt o'tishi bilan boshqa qurilmaga o'tadi.**

- [[dhcp|DHCP]] IP manzillarni vaqtincha beradi: bugun `10.10.10.23` — buxgalterning noutbuki, ertaga — boshqa birovniki.
- [[nat|NAT]] ortida yuzlab qurilma bitta tashqi IP bilan chiqadi: tashqi saytning logida butun ofis bitta manzil bo'lib ko'rinadi.
- VPN foydalanuvchilariga alohida manzillar hovuzidan IP beriladi.

Shuning uchun "10.10.10.23 shubhali saytga kirdi" degan xulosa yarim xulosa. To'liq javob uchun: **shu vaqtda** bu IP qaysi qurilmada bo'lganini DHCP logidan (yoki VPN, NAT jurnallaridan) aniqlang. Triage darsidagi "vaqt mintaqasi" tuzog'i bilan birga, bu yangi analitiklarning eng ko'p qiladigan xatolaridan biri.

## Zeek — tarmoqning bortdagi yozuvchisi

Firewall, proxy va DNS server — har biri o'z tor nuqtai nazaridan yozadi. **Zeek** (avvalgi nomi Bro) — boshqacha yondashuv: u tarmoq trafigini tinglaydi va undan **tuzilgan loglar** yaratadi. U trafikni to'xtatmaydi, faqat tasvirlaydi — tarmoq uchun Sysmon kabi.

| Zeek logi | Nima yoziladi |
|---|---|
| `conn.log` | Har bir ulanish: kim, kimga, port, davomiylik, baytlar, holat |
| `dns.log` | Barcha DNS so'rovlari va javoblari |
| `http.log` | HTTP so'rovlari: host, URI, user-agent, holat |
| `ssl.log` | TLS ulanishlari: server nomi (SNI), sertifikat, versiya |
| `files.log` | Tarmoq orqali o'tgan fayllar va ularning xeshlari |
| `notice.log` | Zeek'ning o'zi aniqlagan g'alati holatlar |

Eng kuchli xususiyati — **`uid`**: har bir ulanishga noyob identifikator beriladi va u barcha loglarda bir xil. `conn.log` dagi ulanishni `uid` bo'yicha `dns.log`, `http.log`, `files.log` bilan bog'laysiz — xuddi Sysmon'dagi `ProcessGuid` kabi.

`conn.log` dagi `conn_state` maydoni ulanish taqdirini aytadi:

| Holat | Ma'nosi |
|---|---|
| `SF` | Normal o'rnatildi va tugadi |
| `S0` | Urinish bo'ldi, javob kelmadi |
| `REJ` | Urinish rad etildi |

Bitta manbadan yuzlab `S0` yoki `REJ` — skanerlash belgisi.

Zeek loglarini `zeek-cut` vositasi bilan kerakli ustunlarga ajratish qulay:

```bash
# Kim kim bilan qancha ma'lumot almashdi — eng katta yuborilgan hajmlar
cat conn.log | zeek-cut id.orig_h id.resp_h id.resp_p orig_bytes \
  | sort -k4 -nr | head

# Eng ko'p so'ralgan domenlar
cat dns.log | zeek-cut query | sort | uniq -c | sort -nr | head
```

Zeek'ni amalda keyingi darsda — trafik tahlilida — PCAP fayllar bilan ishlatamiz.

## Hammasini birlashtirish

Hech bir tarmoq manbasi o'zi yetarli emas. Kuch — **bog'lashda**:

```
DNS log:      09:32:15  10.10.10.23  so'radi: update-check.example-cdn.net → 203.0.113.45
Firewall:     09:32:15  10.10.10.23:52144 → 203.0.113.45:443  allow  18 640 bayt
Proxy:        09:32:15  d.karimova  CONNECT update-check.example-cdn.net:443  WindowsPowerShell/5.1
DHCP:         09:00     10.10.10.23 → WS-BUX-014
Sysmon (3):   09:32:15  WS-BUX-014  powershell.exe → 203.0.113.45:443
```

Beshta manba, beshta nuqtai nazar: **nima** so'raldi (DNS), **ulanish bo'ldimi** (firewall), **kim va qanday dastur** (proxy), **qaysi qurilma** (DHCP), **qaysi jarayon** (Sysmon). Har biri alohida — gumon. Birgalikda — isbot.

Buni qo'lda bajarish sekin. Aynan shu sababli SOC'lar barcha loglarni bitta joyga — **SIEM**ga — yig'adi va ularni bitta so'rov bilan bog'laydi. Bu keyingi bosqichning mavzusi.

## Tarmoq loglari nimani ko'rsatmaydi

- **Shifrlangan trafik mazmunini** — kim kimga ulanganini, lekin nima uzatilganini emas.
- **Qaysi jarayon** ulanganini — buning uchun qurilma loglari (Sysmon ID 3) kerak.
- **IP ortidagi qurilmani** — DHCP, NAT, VPN jurnallarisiz.
- **Ichki trafikni** — agar u firewall yoki sensordan o'tmasa (bitta tarmoq segmentidagi ikki kompyuter o'zaro to'g'ridan-to'g'ri gaplashadi).
- **DoH so'rovlarini** — DNS serverda ko'rinmaydi.

:::lab veb-log-tergovi

:::try
**1. Mini-tahlil.** Quyidagi DNS log parchasida shubhali yozuvlarni toping va nega shubhali ekanini tushuntiring:

```
10.10.10.12  A    login.microsoftonline.com          NOERROR
10.10.10.12  A    mybank.uz                           NOERROR
10.10.10.18  A    rnybank.uz                          NOERROR
10.10.10.31  A    xq7kd9wzt3pvm.example               NXDOMAIN
10.10.10.31  A    b2ncf8hyl0ksr.example               NXDOMAIN
10.10.10.44  TXT  ZXhwb3J0LWRhdGEtMDAx.t.example-data.net  NOERROR
10.10.10.12  A    update.example-software.com         NOERROR
```

**2. Firewall logi — o'z laboratoriyangizda.** Linux VM'ingizda `sudo ufw enable` va `sudo ufw logging on` ni yoqing. Ikkinchi VM'dan (faqat o'z laboratoriyangizda!) birinchisiga yopiq portga ulanishga urining: `nc -zv <VM_IP> 23`. `/var/log/ufw.log` da `[UFW BLOCK]` qatorini toping. `SRC`, `DST`, `DPT` qiymatlari nima?

**3. O'z DNS keshingiz.** Windows'da `ipconfig /displaydns` ni ishga tushiring. Kompyuteringiz yaqinda qaysi domenlarni so'ragan? Hammasini taniysizmi?

**4. TryHackMe** — "Intro to Logs" va Zeek bo'yicha xonalarni bajaring.

*Javoblar: 1 — `rnybank.uz` (`m` o'rniga `rn` — mybank.uz ga o'xshatma); `10.10.10.31` dan tasodifiy nomlar va NXDOMAIN (DGA belgisi); `10.10.10.44` dan Base64'ga o'xshash subdomen bilan TXT so'rovi (tunnellash belgisi). Qolganlari odatiy xizmatlar. Keyingi qadam — DHCP logidan bu IP'lar qaysi qurilmalarga tegishli ekanini aniqlash. 2 — `SRC` — ikkinchi VM, `DST` — birinchi VM, `DPT=23`. 3 — ko'pchiligi brauzer, yangilanish va ofis xizmatlari bo'ladi; tanimagan domenni whois va obro' xizmatlari bilan tekshiring.*
:::

## Xulosa

- Tarmoq loglari — qurilmadan **mustaqil guvoh**: hujumchi ularni qurilmadan o'chira olmaydi, va agent o'rnatib bo'lmaydigan qurilmalarni ham ko'rsatadi.
- **Firewall** — kim, kimga, qaysi port, ruxsat berildimi. Tashqaridan rad etishlar — shovqin; **ichkaridan chiqishga urinishlar** — signal.
- **Proxy** — URL, foydalanuvchi, user-agent, hajm, kategoriya. HTTPS'da TLS inspection'siz faqat host ko'rinadi.
- **DNS** — qayerga bormoqchi edi. Belgilar: yangi domen, o'xshatma nom, DGA (ko'p NXDOMAIN), tunnellash (uzun subdomen, TXT).
- Domenni **o'ngdan chapga** o'qing.
- IP — hali qurilma emas: **DHCP, NAT, VPN** jurnallari bilan aniqlang.
- **Zeek** trafikdan tuzilgan loglar yaratadi; `uid` ulanishni barcha loglarda bog'laydi.
- Kuch — manbalarni **bog'lashda**; buni SIEM avtomatlashtiradi.

:::quiz
? Nega tarmoq loglari qurilma loglarini to'ldiradi?
- Ular har doim shifrlangan trafik mazmunini ko'rsatadi
+ Ular boshqa qurilmalarda saqlanadi va hujumchi buzilgan kompyuterdan ularni o'chira olmaydi
- Ular qurilma loglaridan har doim batafsilroq
- Ular faqat tunda yoziladi
! Mustaqil guvoh: buzilgan qurilmaning jurnallari tozalangan bo'lsa ham, firewall, proxy va DNS yozuvlari qoladi.

? Qaysi firewall yozuvi eng ko'p e'tiborga loyiq?
- Internetdagi turli IP'lardan 22-portga bloklangan ulanishlar
+ Ichki buxgalteriya kompyuteridan bir xil tashqi manzilga har 5 daqiqada bloklangan chiqish urinishlari
- Ichki kompyuterdan kompaniya veb-saytiga ruxsat berilgan ulanish
- DNS serverdan tashqi DNS'ga ruxsat berilgan so'rov
! Tashqaridan rad etilgan urinishlar — fon shovqini. Ichkaridagi qurilmaning tashqariga chiqishga takroriy urinishi — u ichida noma'lum dastur borligini ko'rsatishi mumkin.

? Bitta tashqi IP'dan bitta serverning 1 000 ta turli portiga rad etilgan ulanishlar bor. Bu nima?
+ Vertikal port skanerlash
- Gorizontal skanerlash
- DNS tunnellash
- Normal trafik
! Bitta nishon, ko'p port — vertikal; ko'p nishon, bitta port — gorizontal skanerlash.

? Proxy logida oddiy xodim kompyuteridan “WindowsPowerShell/5.1” user-agent bilan notanish domendan .ps1 fayl yuklangani ko'rindi. Nega bu shubhali?
- PowerShell internetga chiqa olmaydi
+ Odamlar odatda brauzer ishlatadi; skript orqali notanish domendan skript yuklash zararli yetkazib berish belgisi bo'lishi mumkin
- .ps1 fayllar har doim xavfsiz
- User-agent hech narsani anglatmaydi
! Brauzer o'rniga skript user-agent'i, notanish manba va bajariladigan fayl turi — birgalikda kuchli belgi.

? HTTPS ulanishida TLS inspection'siz oddiy proxy nimani ko'radi?
- To'liq URL va sahifa mazmunini
+ Faqat qaysi hostga (domen va port) ulanilganini
- Hech narsani
- Foydalanuvchi parolini
! CONNECT so'rovida host va port ko'rinadi; shifrlangan ulanish ichidagi yo'l va mazmun — yo'q.

? Bitta qurilma qisqa vaqtda yuzlab tasodifiy ko'rinadigan domenlarni so'radi va deyarli hammasiga NXDOMAIN javobi oldi. Bu nimaning belgisi?
- DNS server buzilgan
+ DGA — boshqaruv serverini qidirayotgan zararli dastur
- Foydalanuvchi ko'p sayt ochgan
- Normal yangilanish jarayoni
! DGA zararli dasturlari ko'p nom hosil qilib, hujumchi ro'yxatdan o'tkazgan bittasini topguncha urinadi.

? Qaysi domen mybank.uz kompaniyasiga tegishli EMAS?
- mybank.uz
- online.mybank.uz
+ mybank.uz.secure-login.example
- www.mybank.uz
! Domen o'ngdan chapga o'qiladi: egasi oxirgi qism — secure-login.example. Boshidagi mybank.uz faqat subdomen nomi.

? DNS tunnellashning belgilari qaysilar?
+ Juda uzun, Base64'ga o'xshash subdomenlar
+ Bitta domen ostida minglab noyob subdomenlar va ko'p TXT so'rovlari
- Faqat mashhur saytlarga qisqa so'rovlar
- Javob kodi doim NXDOMAIN bo'lishi
! Tunnellashda ma'lumot subdomen nomlari ichiga joylanadi — shuning uchun ular uzun, noyob va ko'pincha TXT turida bo'ladi.

? Proxy logida “10.10.10.23 shubhali saytga kirdi” deb yozilgan. To'liq xulosa uchun yana nima kerak?
- Hech narsa — IP manzil yetarli
+ Shu vaqtda 10.10.10.23 qaysi qurilmaga berilganini DHCP (yoki VPN) jurnalidan aniqlash
- Saytning rangini tekshirish
- Faqat firewall'ni qayta ishga tushirish
! DHCP IP'larni vaqtincha beradi — bir xil IP turli vaqtda turli qurilmada bo'ladi.

? Zeek loglaridagi uid maydoni nima uchun kerak?
- U foydalanuvchi parolini saqlaydi
+ U bitta ulanishni conn.log, dns.log, http.log, files.log bo'ylab bog'laydi
- U faqat xatolarni belgilaydi
- U IP manzilning boshqa nomi
! Xuddi Sysmon'dagi ProcessGuid kabi — bitta hodisaning turli loglardagi izlarini bog'laydi.

? Nega “DNS logida bu domen yo'q” degani qurilma unga murojaat qilmaganini isbotlamaydi?
- DNS loglari doim bo'sh
+ Dastur DNS over HTTPS ishlatishi yoki to'g'ridan-to'g'ri IP ga ulanishi mumkin — so'rov kompaniya DNS serveridan o'tmaydi
- DNS faqat ichki saytlar uchun ishlaydi
- Domenlar logga yozilmaydi
! DoH so'rovlarni HTTPS ichida shifrlaydi; IP orqali ulanish esa DNS'ni umuman chetlab o'tadi.
:::

:::cards
Firewall logining asosiy maydonlari? :: Vaqt, harakat (allow/deny), protokol, manba IP va port, manzil IP va port, qoida, baytlar.
Firewall'da shovqin va signal? :: Tashqaridan rad etilgan urinishlar — shovqin; ichkaridan tashqariga chiqishga takroriy urinishlar va ruxsat berilgan kiruvchi ulanishlar — signal.
Vertikal va gorizontal skanerlash? :: Vertikal — bitta qurilmaning ko'p portlari; gorizontal — ko'p qurilmadagi bitta port.
Proxy firewall'dan nimasi bilan ko'proq ko'radi? :: To'liq URL (HTTP'da), foydalanuvchi, user-agent, yuborilgan va olingan hajm, sayt kategoriyasi.
Proxy'dagi shubhali belgilar? :: Skript user-agent'i (PowerShell, curl), yangi yoki toifasiz domen, IP orqali URL, bajariladigan fayl yuklash, katta POST hajmi.
DGA belgilari? :: Tasodifiy, talaffuz qilib bo'lmaydigan domenlar; bitta qurilmadan ko'p NXDOMAIN; oxirida bittasi topiladi.
DNS tunnellash belgilari? :: Juda uzun subdomenlar, bitta domen ostida ko'p noyob subdomen, ko'p TXT so'rovlari, Base64'ga o'xshash matn.
Typosquatting nima? :: Haqiqiy domenga o'xshatib yaratilgan nom: rnybank.uz, mybamk.uz, mybank-uz.com.
Domenni qanday o'qish kerak? :: O'ngdan chapga: egasi oxirgi qism. mybank.uz.secure-login.example — secure-login.example ga tegishli.
Nega IP manzil hali qurilma emas? :: DHCP, NAT va VPN tufayli bir xil IP turli vaqtda turli qurilmaga tegishli bo'ladi — DHCP logi bilan aniqlanadi.
Zeek nima? :: Trafikni tinglab tuzilgan loglar (conn, dns, http, ssl, files) yaratadigan tarmoq monitoringi vositasi; trafikni to'xtatmaydi.
conn_state SF, S0, REJ? :: SF — normal ulanish; S0 — javob kelmagan urinish; REJ — rad etilgan urinish.
:::
