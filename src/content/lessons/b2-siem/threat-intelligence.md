Ertalab milliy CERT'dan xabar keladi: "Mintaqadagi banklarga qarshi phishing kampaniyasi. Ilova qilingan ro'yxatda 40 ta IP manzil, 25 ta domen va 12 ta fayl xeshi."

Yangi analitik nima qiladi? Hammasini firewall'da bloklaydi va ishni tugatgan deb hisoblaydi.

Tajribali analitik boshqa savollar beradi: bu ro'yxat qanchalik ishonchli? Bu IP'lar orasida umumiy bulut xizmatlari yo'qmi — bloklasak, o'z xodimlarimizni to'xtatib qo'ymaymizmi? Bu belgilar **o'tmishda** bizning loglarimizda uchraganmi? Va eng muhimi: bu guruh **qanday ishlaydi** — ertaga IP va domenlarini almashtirganda ham biz ularni ko'ramizmi?

Bu savollarga javob berish — **tahdid razvedkasi** (Cyber Threat Intelligence, [[cti|CTI]]) ishi.

## Ma'lumot, axborot, razvedka

| Daraja | Misol | Foydasi |
|---|---|---|
| **Ma'lumot** (data) | `203.0.113.45` | O'zi hech narsa demaydi |
| **Axborot** (information) | "203.0.113.45 — phishing kampaniyasida ishlatilgan server" | Kontekst bor |
| **Razvedka** (intelligence) | "Bu guruh moliya sektoriga hujum qiladi, makrosli hujjatlar yuboradi, serverlarini har 3–5 kunda almashtiradi; bizning muhitda Office makroslari yoqilgan — ustuvor xavf" | Qaror qabul qilishga yordam beradi |

Razvedka — bu **tahlil qilingan, kontekstga solingan va harakatga yo'naltirilgan** ma'lumot. IOC ro'yxati — xomashyo, razvedka emas.

### Razvedka turlari

| Tur | Kim uchun | Savol | Misol |
|---|---|---|---|
| **Strategik** | Rahbariyat | "Qanday xavflar biznesimizga ta'sir qiladi?" | Sektor bo'yicha tahdidlar tendensiyasi |
| **Operatsion** | SOC va IR rahbarlari | "Qaysi kampaniya bizga qaratilgan, qachon?" | Mintaqaviy kampaniya haqida ogohlantirish |
| **Taktik** | Aniqlash muhandislari, hunter'lar | "Hujumchilar qanday ishlaydi?" | TTP'lar, ATT&CK texnikalari |
| **Texnik** | SOC analitiklari, vositalar | "Qaysi belgilarni qidirish kerak?" | IP, domen, xesh — IOC'lar |

### Razvedka sikli

```
  1. Yo'nalish     — Nimani bilishimiz kerak? (kimdan, qanday tahdidlardan xavotirdamiz)
        ▼
  2. Yig'ish       — Manbalar: hisobotlar, feed'lar, o'z insidentlarimiz, hamkorlar
        ▼
  3. Qayta ishlash — Tozalash, takrorlarni olib tashlash, formatga keltirish
        ▼
  4. Tahlil        — Ma'no berish: bu bizga qanday ta'sir qiladi?
        ▼
  5. Tarqatish     — Kerakli odamga, kerakli formatda (rahbarga — 1 sahifa, SIEM'ga — IOC ro'yxati)
        ▼
  6. Fikr-mulohaza — Foydali bo'ldimi? Nimani o'zgartirish kerak? ──► yana 1-qadamga
```

Birinchi qadam eng ko'p unutiladi. "Hamma narsani yig'amiz" — bu razvedka emas, axlatxona. Avval savol: kompaniyamizga kim va nima uchun hujum qilishi mumkin?

## IOC va TTP

[[ioc|IOC]] (Indicator of Compromise) — buzilish izi: "agar buni ko'rsangiz, nimadir sodir bo'lgan".

| IOC turi | Misol | Qayerda qidiriladi |
|---|---|---|
| IP manzil | `203.0.113.45` | Firewall, proxy, Zeek |
| Domen | `update-check.example-cdn.net` | DNS, proxy |
| URL | `hxxps://…/a.ps1` | Proxy |
| Fayl xeshi | SHA-256 | EDR, Sysmon |
| Pochta manzili / mavzu | `security@mybank-uz-support[.]example` | Pochta tizimi |
| Fayl nomi, yo'l | `AppData\Roaming\svchost.exe` | EDR, Sysmon |
| Registr kaliti | `…\Run\Updater` | EDR, Sysmon |
| User-Agent, JA3 | `WindowsPowerShell/5.1` | Proxy, Zeek, Suricata |

[[ttp|TTP]] (Tactics, Techniques, Procedures) — hujumchi **qanday ishlashi**: ATT&CK darsidagi texnikalar va procedure'lar. Masalan: "makrosli hujjat → PowerShell → Run kaliti → HTTPS beaconing".

Farqi hayotiy: IOC — **nima bilan** hujum qilingan; TTP — **qanday** hujum qilingan.

## Pyramid of Pain — chuqurroq

Xavfsizlik bosqichida [[pyramid-of-pain|Pyramid of Pain]] bilan tanishgansiz. Endi uni amaliy ko'z bilan ko'ramiz: har bir daraja **qancha yashaydi** va uni **qanday ishlatish** kerak.

```
                 ▲   TTP'lar                  — hujumchi uchun: JUDA QIYIN (usulini o'zgartirish)
                ▲▲▲  Vositalar                — QIYIN (yangi vosita yozish yoki topish)
               ▲▲▲▲▲ Tarmoq/host artefaktlari — BEZOVTA QILADI (user-agent, yo'llar, registr)
              ▲▲▲▲▲▲▲ Domen nomlari           — ODDIY (yangi domen sotib olish)
             ▲▲▲▲▲▲▲▲▲ IP manzillar           — OSON (yangi server)
            ▲▲▲▲▲▲▲▲▲▲▲ Xesh qiymatlari       — JUDA OSON (bitta baytni o'zgartirish)
```

| Daraja | Qancha yashaydi | Qanday ishlatish |
|---|---|---|
| **Xesh** | Kampaniya davomida ham o'zgarishi mumkin | Retro-qidiruv, EDR'da bloklash — tez, lekin qisqa umrli |
| **IP** | Kunlar yoki haftalar; ko'pincha boshqa mijozlar bilan **umumiy** | Ehtiyotkorlik bilan bloklash; muddatli |
| **Domen** | Kunlar yoki haftalar | DNS va proxy'da bloklash; yaxshi signal |
| **Artefaktlar** | Oylar | SIEM qoidalari (Splunk, Sigma darslari) |
| **Vositalar** | Oylar yoki yillar | YARA (keyingi dars), xulq qoidalari |
| **TTP** | Yillar | Mustahkam aniqlash qoidalari (detection engineering darsi) |

Amaliy xulosa: IOC'lar — tez, lekin tez eskiradi. Ularni ishlatish kerak, lekin **qoidalaringiz piramidaning tepasiga intilishi** kerak. Har bir CTI hisobotini o'qiganda o'zingizdan so'rang: "Bu yerdagi IOC'lardan tashqari qanday **TTP** bor va unga qoida yoza olamanmi?"

### IP bloklashning tuzog'i

IP manzil — eng ishonchsiz IOC'lardan biri:
- Hujumchilar ko'pincha **bulut va hosting** xizmatlaridan foydalanadi — xuddi shu IP ertaga qonuniy saytga tegishli bo'lishi mumkin.
- **CDN** ortida minglab sayt bitta IP'ni baham ko'radi — bloklasangiz, yuzlab qonuniy saytni to'sasiz.
- **Proxy va VPN** chiqish nuqtalari — o'nlab foydalanuvchi bitta IP.

Shuning uchun IOC'lar SIEM'ga **muddati** (aging) bilan qo'shiladi: masalan, IP — 30 kun, domen — 90 kun, keyin avtomatik olib tashlanadi yoki qayta ko'rib chiqiladi.

## IOC'ni boyitish — amaliy ish oqimi

Triage darsida "tez tekshirish vositalari" jadvalini ko'rgansiz. Endi ularni tizimli ishlatamiz.

| Vosita | Nima uchun | Nimaga qarash kerak |
|---|---|---|
| **VirusTotal** | Xesh, domen, IP, URL | Aniqlashlar soni, **birinchi ko'rilgan vaqt**, bog'liqliklar (qaysi domenlar shu IP'da, qaysi fayllar shu domen bilan bog'liq) |
| **AbuseIPDB** | IP obro'si | Shikoyatlar soni va turi, ishonch bali, oxirgi shikoyat vaqti |
| **GreyNoise** | IP — internet "fon shovqini"mi? | Ommaviy skaner (hammaga urinadi) yoki maqsadli (faqat sizga) |
| **urlscan.io** | URL | Skrinshot, sahifa qaysi resurslarni yuklaydi, yo'naltirishlar |
| **Shodan** | IP | Bu manzilda qaysi xizmatlar ochiq, qanday sertifikat |
| **whois / RDAP** | Domen | **Ro'yxatdan o'tgan sana**, registrator |
| **Passive DNS** | Domen va IP tarixi | Domen avval qaysi IP'larga bog'langan, IP'da qaysi domenlar bo'lgan |
| **abuse.ch** (URLhaus, ThreatFox, MalwareBazaar) | Zararli URL, IOC va namunalar bazasi | Ma'lum kampaniyalarga bog'liqlik |
| **AlienVault OTX** | Hamjamiyat "pulse"lari | Boshqalar shu IOC haqida nima yozgan |

### Natijani o'qish

Bitta domen uchun misol:

```
update-check.example-cdn.net
  whois:        ro'yxatdan o'tgan 2026-11-13 (3 kun oldin)
  Passive DNS:  203.0.113.45 (11-14 dan), avval hech qayerda yo'q
  VirusTotal:   4 / 92 aniqlash; birinchi ko'rilgan — 2026-11-15
  urlscan:      sahifa bo'sh; /a.ps1 yo'li PowerShell skript qaytaradi
  Shodan (IP):  443 ochiq, o'zi imzolagan sertifikat
```

Xulosa: **yangi** domen + **yangi** infratuzilma + bir nechta aniqlash + skript yetkazish + o'zi imzolagan sertifikat → yuqori ishonch bilan zararli.

Natijalarni o'qishda ehtiyot bo'ling:

| Natija | Noto'g'ri xulosa | To'g'ri xulosa |
|---|---|---|
| VirusTotal: 0 aniqlash | "Toza" | "Hali hech kim ko'rmagan" — yangi namunalar uchun odatiy |
| VirusTotal: 2 / 92 | "Zararli" | Ko'pincha false positive; boshqa belgilarni tekshiring |
| AbuseIPDB: 500 ta shikoyat | "Bizga hujum qilmoqda" | Ommaviy skaner bo'lishi mumkin — GreyNoise bilan tekshiring |
| Domen 5 yillik | "Xavfsiz" | Eski domenlar ham buziladi yoki sotib olinadi |

:::warn
**OPSEC — o'z izingizni qoldirmang.** Phishing darsidagi qoidani eslang: faylni ommaviy xizmatga **yuklamang**, faqat xeshini qidiring. Xuddi shunday: hujumchi serveriga ish kompyuteringizdan to'g'ridan-to'g'ri ulanmang — u kim tekshirayotganini ko'radi. Ichki IP, xodim ismi yoki maxfiy URL'larni ommaviy xizmatlarga kiritmang. Ommaviy skanerlash natijalari boshqalarga ko'rinishini doim yodda tuting.
:::

## Razvedkani ishga solish

Razvedka faqat **harakatga** aylansa foydali. Asosiy yo'llar:

**1. SIEM'da moslashtirish.** IOC ro'yxatlari SIEM'ga jadval (`lookup`) sifatida yuklanadi va har bir yangi log ular bilan solishtiriladi (SIEM tushunchasi darsidagi "ro'yxatga solishtirish" korrelyatsiyasi).

**2. Retro-qidiruv (retro-hunt).** Yangi IOC olganda faqat kelajakni emas, **o'tmishni** ham tekshiring: bu domen oxirgi 90 kunda bizning DNS loglarimizda uchraganmi? Ko'p insidentlar aynan shunday topiladi — hujumchi bir oy oldin kirgan, bugun esa uning belgilari e'lon qilindi.

```
index=dns earliest=-90d
| lookup yangi_ioc_domenlar domen AS query OUTPUT kampaniya
| where isnotnull(kampaniya)
| stats min(_time) as birinchi count by src_ip, query, kampaniya
| convert ctime(birinchi)
```

**3. TTP'larni qoidalarga aylantirish.** Hisobotdagi xatti-harakat tavsifi → Sigma qoidasi (detection engineering darsi) → ATT&CK qamrov xaritasi yangilanadi (ATT&CK darsi).

**4. Ov gipotezalari.** "Bu guruh LOLBins'dan foydalanadi — bizda certutil'ning g'alati ishlatilishi bormi?" (keyingi bosqich — threat hunting).

**5. Ustuvorlik.** Strategik razvedka qaysi zaifliklarni birinchi yamash, qaysi log manbalarini birinchi ulashni belgilaydi.

## Formatlar, platformalar va almashish

| Nima | Vazifasi |
|---|---|
| **STIX** | Tahdid ma'lumotlarini tasvirlash uchun standart format (JSON): indikatorlar, aktorlar, kampaniyalar, bog'liqliklar |
| **TAXII** | STIX ma'lumotlarini avtomatik almashish protokoli |
| **MISP** | Ochiq kodli tahdid razvedkasi platformasi — IOC'larni saqlash, bog'lash va hamkorlar bilan almashish |
| **OpenCTI** | Ochiq kodli platforma — bilim grafi ko'rinishida |
| **TIP** | Threat Intelligence Platform — umumiy nom |

### TLP — kim bilan bo'lishish mumkin

Razvedka almashilganda u **TLP** (Traffic Light Protocol) belgisi bilan keladi:

| Belgi | Kim bilan bo'lishish mumkin |
|---|---|
| **TLP:RED** | Faqat ko'rsatilgan shaxslar — boshqa hech kim |
| **TLP:AMBER+STRICT** | Faqat o'z tashkilotingiz ichida |
| **TLP:AMBER** | O'z tashkilotingiz va bilishi zarur bo'lgan mijozlaringiz |
| **TLP:GREEN** | Hamjamiyat ichida (sektor), lekin ommaviy emas |
| **TLP:CLEAR** | Cheklovsiz, ommaviy |

TLP'ni buzish — ishonchni yo'qotishning eng tez yo'li: keyingi safar sizga hech kim hech narsa yubormaydi.

### Manbalar

- **Milliy CERT'lar** — O'zbekistonda va boshqa mamlakatlarda; mintaqaviy kampaniyalar haqida ogohlantirishlar.
- **Davlat va xalqaro tashkilotlar** — masalan, CISA ogohlantirishlari (advisory'lar), ko'pincha IOC va ATT&CK texnikalari bilan.
- **Xavfsizlik kompaniyalari bloglari** va yillik hisobotlari.
- **Sektor hamjamiyatlari** (ISAC) — masalan, moliya sektori uchun.
- **Ochiq feed'lar** — abuse.ch, OTX va boshqalar.
- **O'z insidentlaringiz** — eng qimmatli va eng mos manba.

## Hisobot yozish

CTI hisoboti o'quvchiga qarab yoziladi, lekin tuzilishi o'xshash:

```
SARLAVHA:   Mintaqaviy banklarga qarshi makrosli phishing kampaniyasi
TLP:        AMBER

ASOSIY XULOSA (BLUF):
  Kampaniya moliya sektorini nishonga olmoqda. Bizning muhitda bir xodim
  zararlangan hujjatni ochgan (insident 2026-11-16). Yuqori ishonch bilan:
  kampaniya davom etmoqda.

ASOSIY BAHOLAR:
  - Yuqori ishonch: yetkazish usuli — "hisob-faktura" mavzusidagi makrosli .docm.
  - O'rtacha ishonch: infratuzilma har 3–5 kunda almashtiriladi.

TTP (ATT&CK):  T1566.001, T1204.002, T1059.001, T1547.001, T1071.001

IOC (defang):  update-check[.]example-cdn[.]net, 203.0.113[.]45, SHA-256: ...

TAVSIYALAR:
  1. Internetdan kelgan hujjatlarda makroslarni bloklash (T1204.002 ga qarshi).
  2. Word/Excel → PowerShell qoidasini "high" darajada yoqish (Sigma).
  3. IOC'lar 30 kunlik muddat bilan SIEM'ga; 90 kunlik retro-qidiruv bajarildi.
```

E'tibor bering: **ishonch darajasi** ochiq aytilgan. "Bu guruh — X davlati" kabi bayonotlar (attribution) juda ehtiyotkorlik talab qiladi — ko'pincha SOC uchun "kim" emas, "qanday" muhimroq.

:::key
Razvedkaning qiymati uning hajmida emas, **harakatga aylanishida**. 10 000 ta IOC feed'ini SIEM'ga ulab, hech qachon ularning sifatini tekshirmaslik — false positive'lar to'foniga yo'l. Bitta yaxshi o'qilgan hisobotdan chiqqan bitta mustahkam TTP qoidasi — ming IOC'dan ko'proq himoya beradi. Har bir razvedka bo'lagi uchun so'rang: **"Bu bilan nima qilaman?"** Javob yo'q bo'lsa — bu shunchaki ma'lumot.
:::

## Tahdid razvedkasi nimani qilmaydi

- **IOC ro'yxati himoya qilmaydi** — u tez eskiradi va hujumchi uni osonlikcha aylanib o'tadi.
- **Feed sifati kafolatlanmagan** — noto'g'ri yoki eskirgan yozuvlar qonuniy trafikni bloklaydi.
- **Kontekstsiz razvedka foydasiz** — sizning muhitingizga qanday ta'sir qilishini kimdir tahlil qilishi kerak.
- **Attribution ≠ himoya** — hujumchining nomini bilish odatda aniqlash qoidasini yaxshilamaydi.
- **Yangi, maqsadli hujumlar** ko'pincha hech qanday feed'da yo'q — ular uchun xulq qoidalari va tahdid ovi kerak.

:::try
**1. Boyitish mashqi.** Quyidagi ommaviy, zararsiz obyektlarni tekshiring va natijalarni yuqoridagi namunadek yozing:
- `example.com` domeni — whois (ro'yxatdan o'tgan sana), VirusTotal.
- O'z ommaviy IP manzilingiz — AbuseIPDB va GreyNoise'da bormi? (Faqat qidiruv; hech narsa yuklamang.)

**2. Hisobotni o'qing.** Istalgan bitta ochiq CTI hisobotini (masalan, CISA advisory) oching. Undan ajrating: (a) 3 ta IOC — piramidaning qaysi darajasida? (b) 3 ta TTP — ATT&CK ID'lari bilan; (c) ulardan biriga Sigma qoidasi g'oyasini yozing.

**3. TLP.** Hamkor tashkilotdan TLP:AMBER+STRICT belgili hisobot oldingiz. Uni (a) o'z SOC jamoangiz bilan, (b) shartnoma bo'yicha xizmat ko'rsatadigan tashqi MSSP bilan, (c) LinkedIn'da bo'lishish mumkinmi?

**4. TryHackMe** — "Pyramid Of Pain" va tahdid razvedkasi xonalarini bajaring.

*Javoblar: 1 — `example.com` — juda eski, maxsus zaxiralangan hujjat domeni, VirusTotal'da toza; bu "eski va obro'li" domen namunasi. 2 — odatda hisobotlarda IP va xeshlar ko'p, TTP'lar esa ATT&CK jadvalida beriladi. 3 — (a) ha; (b) yo'q — AMBER+STRICT faqat tashkilot ichida; (c) yo'q.*
:::

## Xulosa

- **Ma'lumot → axborot → razvedka**: razvedka — tahlil qilingan, kontekstli va harakatga yo'naltirilgan.
- Turlari: **strategik, operatsion, taktik, texnik**; sikl: yo'nalish → yig'ish → qayta ishlash → tahlil → tarqatish → fikr-mulohaza.
- **IOC** — nima bilan; **TTP** — qanday. Pyramid of Pain: xesh va IP tez eskiradi, TTP — yillab yashaydi.
- IOC'lar SIEM'ga **muddati bilan** qo'shiladi; IP bloklashda umumiy infratuzilmadan ehtiyot bo'ling.
- Boyitish: VirusTotal, AbuseIPDB, GreyNoise, urlscan, Shodan, whois, passive DNS, abuse.ch; "0 aniqlash" ≠ toza.
- Ishga solish: SIEM moslashtirish, **retro-qidiruv**, TTP → qoida, ov gipotezalari, ustuvorlik.
- Almashish: **STIX/TAXII**, **MISP**, **TLP** (RED, AMBER+STRICT, AMBER, GREEN, CLEAR).
- Hisobot: BLUF, ishonch darajalari, ATT&CK, defang qilingan IOC'lar, tavsiyalar.

:::quiz
? Qaysi biri “razvedka” darajasiga eng mos keladi?
- 203.0.113.45
- “203.0.113.45 — phishing serveri”
+ “Bu guruh moliya sektoriga makrosli hujjatlar bilan hujum qiladi va serverlarini tez-tez almashtiradi; bizda makroslar yoqilgan — ustuvor xavf”
- 40 ta IP ro'yxati
! Razvedka kontekstli va qaror qabul qilishga yo'naltirilgan bo'ladi.

? IOC va TTP farqi nima?
+ IOC — hujum nima bilan qilingani (IP, domen, xesh); TTP — hujumchi qanday ishlashi
- IOC faqat Linux uchun, TTP faqat Windows uchun
- Farqi yo'q
- TTP — IOC'ning qisqartmasi
! TTP'lar hujumchi uchun o'zgartirish ancha qiyin bo'lgan xatti-harakatlar.

? Pyramid of Pain bo'yicha hujumchi uchun qaysi belgini almashtirish eng oson?
+ Fayl xeshi
- TTP
- Vositalar
- Tarmoq artefaktlari
! Faylda bitta baytni o'zgartirish xeshni butunlay o'zgartiradi.

? Nega IP manzillarni o'ylamasdan bloklash xavfli?
- IP manzillar hech qachon o'zgarmaydi
+ Bulut, CDN va VPN IP'larini ko'p qonuniy xizmat va foydalanuvchilar baham ko'radi
- Firewall IP'larni bloklay olmaydi
- Bu qonunga zid
! Bitta CDN IP'sini bloklash yuzlab qonuniy saytni to'sishi mumkin; IOC'lar muddat bilan qo'llanadi.

? VirusTotal'da yangi fayl xeshi 0 ta aniqlash ko'rsatdi. To'g'ri xulosa qaysi?
- Fayl albatta xavfsiz
+ Fayl hali ko'p antiviruslarga ma'lum emas — yangi namunalar uchun odatiy; boshqa belgilarni tekshirish kerak
- Fayl albatta zararli
- VirusTotal ishlamayapti
! “Ro'yxatda yo'q” ≠ “xavfsiz”.

? Bir IP AbuseIPDB'da yuzlab shikoyatga ega. GreyNoise nima uchun foydali?
- U IP'ni avtomatik bloklaydi
+ IP butun internetni skanerlaydigan ommaviy “fon shovqini”mi yoki maqsadli faoliyatmi — farqlashga yordam beradi
- U parollarni tekshiradi
- U pochtani filtrlaydi
! Ommaviy skanerlar hammaga urinadi; maqsadli faoliyat ancha muhimroq.

? Retro-qidiruv (retro-hunt) nima?
- Faqat kelajakdagi loglarni kuzatish
+ Yangi olingan IOC'larni o'tmishdagi loglarda qidirish — hujum avvalroq sodir bo'lganmi tekshirish
- Eski IOC'larni o'chirish
- Hisobot yozish
! Ko'p insidentlar shunday topiladi: hujumchi bir oy oldin kirgan, belgilar esa bugun e'lon qilingan.

? TLP:AMBER+STRICT belgili hisobotni kim bilan bo'lishish mumkin?
- Hamma bilan
- Sektordagi barcha hamkorlar bilan
+ Faqat o'z tashkilotingiz ichida
- Faqat ijtimoiy tarmoqlarda
! RED — faqat ko'rsatilgan shaxslar; AMBER+STRICT — faqat tashkilot ichida; GREEN — hamjamiyat; CLEAR — ommaviy.

? STIX va TAXII nima?
+ STIX — tahdid ma'lumotlarini tasvirlash formati; TAXII — ularni avtomatik almashish protokoli
- Ikkita antivirus
- SIEM so'rov tillari
- Zararli dastur oilalari
! MISP va OpenCTI kabi platformalar shu standartlar bilan ishlaydi.

? Razvedka hisobotidan eng uzoq muddatli himoya qanday olinadi?
- Barcha IP'larni abadiy bloklash orqali
+ Hisobotdagi TTP'larni mustahkam aniqlash qoidalariga aylantirish orqali
- Hisobotni arxivlash orqali
- Faqat xeshlarni bloklash orqali
! TTP'lar yillab yashaydi; xesh va IP'lar kunlar ichida eskiradi.
:::

:::cards
Ma'lumot, axborot, razvedka? :: Ma'lumot — xom fakt; axborot — kontekstli; razvedka — tahlil qilingan, harakatga yo'naltirilgan, qaror uchun.
Razvedka turlari? :: Strategik (rahbariyat), operatsion (kampaniyalar), taktik (TTP'lar), texnik (IOC'lar).
Razvedka sikli? :: Yo'nalish → yig'ish → qayta ishlash → tahlil → tarqatish → fikr-mulohaza.
IOC va TTP? :: IOC — nima bilan (IP, domen, xesh, URL); TTP — qanday (taktika, texnika, procedure).
Pyramid of Pain darajalari? :: Pastdan: xesh, IP, domen, tarmoq/host artefaktlari, vositalar, TTP — tepaga qarab hujumchi uchun qiyinlashadi.
Nega IOC'lar muddati bilan qo'llanadi? :: Ular tez eskiradi; IP va domenlar qayta ishlatiladi va qonuniy egalarga o'tadi.
IOC boyitish vositalari? :: VirusTotal, AbuseIPDB, GreyNoise, urlscan.io, Shodan, whois/RDAP, passive DNS, abuse.ch, OTX.
VirusTotal 0 aniqlash nimani anglatadi? :: Hali ko'p antiviruslarga ma'lum emas — “toza” degani emas.
Retro-qidiruv nima? :: Yangi IOC'larni o'tmishdagi loglarda qidirish — avvalgi buzilishni topish uchun.
STIX, TAXII, MISP? :: STIX — format; TAXII — almashish protokoli; MISP — ochiq kodli razvedka platformasi.
TLP darajalari? :: RED — faqat ko'rsatilganlar; AMBER+STRICT — tashkilot ichida; AMBER — tashkilot va zarur mijozlar; GREEN — hamjamiyat; CLEAR — ommaviy.
CTI hisoboti tuzilishi? :: Sarlavha, TLP, asosiy xulosa (BLUF), ishonch darajali baholar, ATT&CK TTP'lari, defang qilingan IOC'lar, tavsiyalar.
:::
