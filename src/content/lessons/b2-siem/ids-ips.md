Trafik tahlili darsida PCAP'dan hujumni qo'lda tikladingiz: filtrlar, oqimlar, fayllar. Yarim soat — bitta hodisa uchun. Endi tasavvur qiling, xuddi shu bilimni qoidalarga aylantirib, tarmoqdagi **har bir paketni** real vaqtda, kechayu kunduz tekshiradigan tizimga berasiz.

Bu — **IDS**. Firewall "kim kirishi mumkin?" degan savolga javob beradi. IDS esa boshqa savolni beradi: **"ruxsat berilgan trafik ichida nima bor?"**

## IDS va IPS

[[ids|IDS]] va [[ips|IPS]] — bir oilaning ikki a'zosi:

| | IDS | IPS |
|---|---|---|
| To'liq nomi | Intrusion Detection System | Intrusion Prevention System |
| Nima qiladi | Ko'radi va ogohlantiradi | Ko'radi, ogohlantiradi **va to'xtatadi** |
| Tarmoqdagi joyi | Trafik nusxasini tinglaydi (passiv) | Trafik yo'lida turadi (inline) |
| Xato qilsa | Ortiqcha ogohlantirish | **Qonuniy trafikni bloklaydi** |
| Ishdan chiqsa | Tarmoq ishlayveradi | Tarmoq uzilishi mumkin (sozlamaga qarab) |

```
 IDS (passiv)                                IPS (inline)

 Internet ── Firewall ── Switch ── Serverlar   Internet ── Firewall ── IPS ── Switch ── Serverlar
                           │                                         ▲
                     SPAN/TAP nusxa                        har bir paket shu yerdan
                           ▼                               o'tadi va to'xtatilishi mumkin
                          IDS
```

IDS trafik nusxasini olish uchun ikki usul bor:
- **SPAN** (port mirroring) — switch tanlangan portlar trafigini nusxalab, IDS ulangan portga yuboradi.
- **TAP** — kabelga o'rnatiladigan maxsus qurilma, trafikni jismonan nusxalaydi; ishonchliroq.

Ko'p tashkilotlar yangi qoidalarni avval IDS rejimida sinaydi va faqat ishonchli bo'lganlarini IPS rejimida bloklashga o'tkazadi — Wazuh darsidagi active response haqidagi ehtiyotkorlik bilan bir xil fikr.

### Aniqlash usullari

| Usul | Qanday | Afzallik | Kamchilik |
|---|---|---|---|
| **Imzo** (signature) | Ma'lum hujum naqshlarini qidiradi | Aniq, tushunarli | Yangi (noma'lum) hujumlarni ko'rmaydi |
| **Anomaliya** | Odatiy trafikdan chetlanishni qidiradi | Yangi hujumlarni ko'rishi mumkin | Ko'p false positive |
| **Protokol tahlili** | Protokol qoidalari buzilishini qidiradi | Niqoblangan trafikni ushlaydi | Murakkab |

Shuningdek, joylashuv bo'yicha: **NIDS** (tarmoq) — trafikni tinglaydi; **HIDS** (host) — qurilmada ishlaydi (Wazuh agenti — HIDS'ga misol).

## Suricata va Snort

| | **Snort** | **Suricata** |
|---|---|---|
| Yoshi | 1998-yildan, eng mashhur klassik IDS | 2009-yildan |
| Ishlab chiqaruvchi | Cisco Talos | OISF (notijorat fond) |
| Ko'p yadroli ishlash | Snort 3'da qo'shilgan | Boshidan ko'p oqimli |
| Qoida sintaksisi | Asos | Snort bilan deyarli mos, qo'shimcha imkoniyatlar bilan |
| Chiqish | Ogohlantirishlar | Ogohlantirishlar + protokol loglari (HTTP, DNS, TLS) + fayllar, **EVE JSON** formatida |

Bu darsda **Suricata** bilan ishlaymiz: u bepul, zamonaviy, va uning EVE JSON chiqishi SIEM'ga oson ulanadi. Qoidalar tili ikkalasida deyarli bir xil — birini bilsangiz, ikkinchisini o'qiy olasiz.

Suricata va trafik tahlili darsidagi Zeek bir-birini to'ldiradi: Zeek — "nima bo'lganini tasvirlaydi" (har bir ulanish loglari), Suricata — "nima yomonligini aytadi" (qoida bo'yicha ogohlantirishlar). Ko'p SOC'lar ikkalasini ham ishlatadi; **Security Onion** kabi tayyor bepul platformalar ularni bitta tizimda birlashtiradi.

## O'rnatish va ishga tushirish

O'z laboratoriyangizdagi Ubuntu VM'da (masalan, Wazuh darsidagi tarmoqda):

```bash
sudo add-apt-repository ppa:oisf/suricata-stable
sudo apt update && sudo apt install suricata

suricata --build-info | head          # versiya va imkoniyatlar
sudo suricata-update                  # bepul ET Open qoidalar to'plamini yuklash
```

Asosiy sozlamalar fayli — `/etc/suricata/suricata.yaml`. Eng muhim ikki narsa:

```yaml
vars:
  address-groups:
    HOME_NET: "[10.10.10.0/24]"        # sizning ichki tarmog'ingiz
    EXTERNAL_NET: "!$HOME_NET"

af-packet:
  - interface: eth0                    # qaysi tarmoq interfeysini tinglash
```

`HOME_NET` — qoidalarning "ichkari" va "tashqari" tushunchasi shunga bog'liq. Uni noto'g'ri yozsangiz, ko'p qoidalar umuman ishlamaydi.

```bash
sudo suricata -T -c /etc/suricata/suricata.yaml       # sozlamalarni tekshirish
sudo systemctl restart suricata
sudo tail -f /var/log/suricata/fast.log               # ogohlantirishlar — bir qatordan
```

### PCAP ustida ishga tushirish

Eng qulay o'rganish usuli — tirik tarmoq emas, tayyor PCAP fayllar (trafik tahlili darsidagi mashqlar):

```bash
mkdir natija
suricata -r hodisa.pcap -l natija/
ls natija/                  # fast.log  eve.json  stats.log ...
cat natija/fast.log
```

`eve.json` — har bir qator alohida JSON hodisa: ogohlantirishlar, DNS so'rovlari, HTTP so'rovlari, TLS ulanishlar, fayllar. Dasturlash bosqichidagi JSON bilimi va `jq` vositasi bilan:

```bash
# Faqat ogohlantirishlar: imzo nomi, manba, manzil
jq -c 'select(.event_type=="alert") | [.alert.signature, .src_ip, .dest_ip]' natija/eve.json

# Eng ko'p ishlagan imzolar
jq -r 'select(.event_type=="alert") | .alert.signature' natija/eve.json | sort | uniq -c | sort -nr

# Barcha DNS so'rovlari — Zeek'ning dns.log'i kabi
jq -r 'select(.event_type=="dns") | .dns.rrname' natija/eve.json | sort | uniq -c | sort -nr | head
```

## Qoida yozish

Suricata qoidasi bitta qatordan iborat va uch qismga bo'linadi:

```
alert http $HOME_NET any -> $EXTERNAL_NET any (msg:"LOCAL PowerShell user-agent tashqi saytga"; flow:established,to_server; http.user_agent; content:"WindowsPowerShell"; nocase; classtype:policy-violation; sid:1000001; rev:1;)
└─┬─┘ └┬─┘ └────┬─────┘ └┬┘ └┬┘ └─────┬─────┘ └┬┘ └──────────────────────────────── opsiyalar ─────────────────────────────────┘
harakat protokol manba port yo'nalish manzil   port
```

### Sarlavha

| Qism | Qiymatlar |
|---|---|
| **Harakat** | `alert` — ogohlantirish; `drop` — tashlab yuborish (IPS); `reject` — rad etish va javob yuborish; `pass` — o'tkazib yuborish |
| **Protokol** | `tcp`, `udp`, `icmp`, `ip` yoki ilova protokoli: `http`, `dns`, `tls`, `smb`, `ssh`… |
| **Manba / manzil** | IP, tarmoq, o'zgaruvchi (`$HOME_NET`), `any`, inkor (`!10.10.10.5`) |
| **Port** | Raqam, oraliq (`1024:`), `any` |
| **Yo'nalish** | `->` — bir tomonga; `<>` — ikkala tomonga |

### Opsiyalar

| Opsiya | Ma'nosi |
|---|---|
| `msg:"…"` | Ogohlantirish matni — analitik ko'radigan sarlavha |
| `content:"…"` | Paketda qidiriladigan matn yoki baytlar |
| `nocase` | Katta-kichik harfni farqlamaslik |
| `http.user_agent`, `http.uri`, `http.host`, `dns.query`, `tls.sni` | **Sticky buffer** — keyingi `content` aynan shu maydonda qidiriladi |
| `flow:established,to_server` | Faqat o'rnatilgan ulanishda, mijozdan serverga |
| `flags:S` | TCP bayroqlari (S — SYN) |
| `threshold` | Faqat ma'lum son va vaqtdan keyin ogohlantirish |
| `classtype` | Toifa (jiddiylikni belgilaydi) |
| `sid` | Qoidaning noyob raqami; shaxsiy qoidalar uchun **1000000–1999999** |
| `rev` | Qoida versiyasi — har o'zgarishda oshiriladi |

Sticky buffer — muhim tushuncha. `content:"WindowsPowerShell"` o'zi butun paketda qidiradi; `http.user_agent; content:"WindowsPowerShell"` esa faqat User-Agent sarlavhasida. Bu ham aniqroq, ham tezroq.

### Misollar — b1 bosqichidagi hodisalar uchun

```
# 1. Proxy darsidagi belgi: skript user-agent'i bilan tashqi HTTP so'rovi
alert http $HOME_NET any -> $EXTERNAL_NET any (msg:"LOCAL PowerShell user-agent tashqi saytga"; flow:established,to_server; http.user_agent; content:"WindowsPowerShell"; nocase; classtype:policy-violation; sid:1000001; rev:1;)

# 2. Tahdid razvedkasidan ma'lum domen uchun DNS so'rovi
alert dns $HOME_NET any -> any any (msg:"LOCAL Ma'lum C2 domeni so'raldi"; dns.query; content:"update-check.example-cdn.net"; nocase; classtype:trojan-activity; sid:1000002; rev:1;)

# 3. Tashqaridan Telnet portiga ulanish urinishi
alert tcp $EXTERNAL_NET any -> $HOME_NET 23 (msg:"LOCAL Tashqaridan Telnet urinishi"; flags:S; classtype:attempted-recon; sid:1000003; rev:1;)

# 4. Bitta manbadan 60 soniyada 20 ta yangi SSH ulanishi — parol terish belgisi
alert tcp any any -> $HOME_NET 22 (msg:"LOCAL Ehtimoliy SSH brute force"; flow:to_server; flags:S; threshold: type both, track by_src, count 20, seconds 60; classtype:attempted-admin; sid:1000004; rev:1;)

# 5. HTTPS'da shubhali server nomi (SNI) — shifrlangan trafikda ham ko'rinadi
alert tls $HOME_NET any -> $EXTERNAL_NET any (msg:"LOCAL TLS ulanish shubhali domenga"; tls.sni; content:"example-cdn.net"; endswith; nocase; classtype:trojan-activity; sid:1000005; rev:1;)
```

4-qoida — SIEM tushunchasi darsidagi **chegara korrelyatsiyasi** va Wazuh darsidagi `frequency/timeframe` ning tarmoq darajasidagi ekvivalenti. 5-qoida trafik tahlili darsidagi "shifrlangan trafikda ham SNI ko'rinadi" degan fikrni amalda ko'rsatadi.

Shaxsiy qoidalarni alohida faylga yozing (masalan, `/etc/suricata/rules/local.rules`) va uni `suricata.yaml` dagi `rule-files` ro'yxatiga qo'shing. PCAP ustida faqat shu qoidalar bilan sinash:

```bash
suricata -r sinov.pcap -l natija/ -S local.rules
```

`-S` — faqat ko'rsatilgan fayldagi qoidalarni yuklaydi; boshqa qoidalar shovqini aralashmaydi.

:::key
**Qoida yozish tartibi:** avval trafikni Wireshark'da ko'ring — aniq qaysi maydonda nima bor? Keyin eng **tor** sticky buffer'ni tanlang (butun paket emas, `http.uri` yoki `dns.query`). Keyin `flow` va yo'nalish bilan cheklang. Keyin PCAP ustida sinang: ishlashi kerak bo'lgan trafikda ishlaydimi? Oddiy trafikda jim turadimi? Detection engineering darsidagi hayot sikli bu yerda ham amal qiladi — faqat ma'lumot manbai boshqa.
:::

## Tayyor qoidalar to'plamlari

| To'plam | Narxi | Eslatma |
|---|---|---|
| **ET Open** (Emerging Threats) | Bepul | `suricata-update` standart holatda shuni yuklaydi; o'n minglab qoida |
| **ET Pro** | Pullik | Kengroq va tezroq yangilanadi |
| **Snort Talos qoidalari** | Hamjamiyat versiyasi bepul, to'liqrog'i ro'yxatdan o'tish yoki obuna bilan | Cisco Talos tahdid razvedkasi asosida |

Tayyor to'plamni to'liq yoqish — Sigma darsidagi kabi xato: ko'p qoida sizning muhitingizga mos emas va shovqin chiqaradi. `suricata-update` bilan keraksiz toifalarni o'chirish (`disable.conf`) va shovqinli qoidalarni sozlash — doimiy ish.

## IDS ogohlantirishini triage qilish

IDS ogohlantirishi ham boshqa ogohlantirishlar kabi triage qilinadi (alert triage darsi), lekin bir nechta o'ziga xos savol bor:

| Savol | Nega |
|---|---|
| Qoida **nimani** tekshiradi? | Qoida matnini oching — `msg` dan ko'ra `content` va buffer'lar ko'p narsa aytadi |
| Yo'nalish qanday? | Tashqaridan kelgan urinish — ko'pincha shovqin; ichkaridan chiqqan — ko'pincha signal (tarmoq loglari darsi) |
| Hujum **muvaffaqiyatli** bo'ldimi? | IDS urinishni ko'radi, natijani emas. Server javobiga qarang: 404 yoki 200? Ulanish davom etdimi? |
| Nishon zaifmi? | Linux serverga qarshi Windows zaifligi hujumi — xavfsiz urinish |
| Boshqa manbalar nima deydi? | Zeek, proxy, Sysmon — trafik tahlili darsidagi bog'lash |

Uchinchi qator eng muhimi: **IDS "kimdir urindi" deydi, "kimdir muvaffaqiyatga erishdi" demaydi.** Internetga ochiq veb-server kuniga yuzlab hujum urinishi ogohlantirishini oladi — ularning deyarli hammasi befoyda. Javob (server nima qaytardi) va keyingi hodisalar haqiqiy savolga javob beradi.

## Amaliyot: Zeek va Suricata

Quyidagi labda sensor yozib olgan trafikni avval Zeek loglariga aylantirasiz (nima bo'ldi?), keyin Suricata qoidalarini tuzatib va yozib sinaysiz (qoidaga mos narsa bo'ldimi?): skaner, parol hujumi, C2 domeni, TLS SNI va port skanerlash. Hamma narsa yozib olingan faylda — jonli tarmoqqa hech narsa yuborilmaydi.

:::lab aniqlash-suricata-zeek

## IDS/IPS nimani qilmaydi

- **Shifrlangan mazmunni ko'rmaydi** — faqat metama'lumot: IP, port, SNI, sertifikat, TLS barmoq izi. TLS inspection'siz HTTPS ichidagi hujum ko'rinmaydi.
- **Noma'lum hujumni imzo bilan ushlamaydi** — imzo yozilishi uchun hujum avval kimdadir ko'rilgan bo'lishi kerak.
- **Ko'rmagan trafikni tahlil qilmaydi** — sensor qayerda turganiga bog'liq; bitta segment ichidagi trafik sensordan o'tmasligi mumkin.
- **Muvaffaqiyatni aniqlamaydi** — urinish ≠ buzilish.
- **IPS xatosi qimmat** — noto'g'ri `drop` qoidasi biznes trafikni to'xtatadi.

:::try
Barcha mashqlar **o'z laboratoriyangizda**.

**1. O'rnating va sinang.** Suricata'ni Ubuntu VM'ga o'rnating, `suricata-update` bilan qoidalarni yuklang, `HOME_NET` ni laboratoriya tarmog'ingizga sozlang va `suricata -T` bilan tekshiring.

**2. O'z trafigingizda qoida sinang.** Bir terminalda `sudo tcpdump -i eth0 -w sinov.pcap` ni ishga tushiring, ikkinchisida `curl -A "WindowsPowerShell/5.1" http://example.com` (HTTP, HTTPS emas). tcpdump'ni to'xtating. Keyin yuqoridagi 1-qoidani `local.rules` ga yozing va `suricata -r sinov.pcap -l natija/ -S local.rules` bilan sinang. `fast.log` da ogohlantirish bormi?

**3. O'zingiz yozing.** `example.org` domeni uchun DNS so'rovini aniqlaydigan qoida yozing (sid 1000010). Uni `nslookup example.org` trafigi yozilgan PCAP ustida sinang.

**4. Tayyor PCAP.** Trafik tahlili darsidagi Malware-Traffic-Analysis mashqlaridan birini (laboratoriya VM'ida) Suricata orqali o'tkazing. Qaysi ET imzolari ishladi? Ular sizning qo'lda topgan xulosalaringizga mos keladimi?

*Javoblar: 2 — ha, agar so'rov HTTP orqali ketgan va `HOME_NET`/`EXTERNAL_NET` to'g'ri sozlangan bo'lsa; ogohlantirish chiqmasa, birinchi navbatda shu ikkisini tekshiring. 3 — `alert dns $HOME_NET any -> any any (msg:"LOCAL example.org so'raldi"; dns.query; content:"example.org"; nocase; sid:1000010; rev:1;)`.*
:::

## Xulosa

- **IDS** ko'radi va ogohlantiradi (passiv, SPAN/TAP); **IPS** trafik yo'lida turib to'xtatadi (inline) — xatosi qimmatroq.
- Usullar: **imzo**, **anomaliya**, **protokol tahlili**; NIDS va HIDS.
- **Suricata** — ko'p oqimli, EVE JSON chiqishi (ogohlantirishlar + DNS/HTTP/TLS loglari); **Snort** — klassik, qoida sintaksisi deyarli bir xil.
- Muhim sozlama — **HOME_NET**; PCAP ustida sinash: `suricata -r fayl.pcap -l natija/`.
- Qoida: **harakat, protokol, manba, port, yo'nalish, manzil, port** + opsiyalar (`msg`, `content`, sticky buffer, `flow`, `threshold`, `sid`, `rev`).
- Shaxsiy `sid` — 1000000 dan; eng tor buffer'ni tanlang.
- IDS **urinishni** ko'radi, **natijani** emas — javob va boshqa manbalar bilan tekshiring.

:::quiz
? IDS va IPS'ning asosiy farqi nima?
- IDS faqat Linux'da ishlaydi
+ IDS ko'radi va ogohlantiradi; IPS trafik yo'lida turib, uni to'xtata oladi
- IPS faqat loglarni saqlaydi
- Farqi yo'q
! IDS passiv nusxani tinglaydi; IPS inline ishlaydi va xato qilsa qonuniy trafikni bloklaydi.

? SPAN port nima?
+ Switch tanlangan portlar trafigining nusxasini IDS ulangan portga yuboradi
- Firewall qoidasi
- Shifrlash usuli
- Zararli dastur turi
! SPAN (port mirroring) yoki TAP orqali IDS trafik nusxasini oladi.

? Imzoga asoslangan aniqlashning asosiy kamchiligi nima?
- Juda ko'p false positive chiqaradi
+ Hali hech kim ko'rmagan, imzosi yo'q yangi hujumlarni aniqlay olmaydi
- Faqat shifrlangan trafikda ishlaydi
- Juda sekin
! Imzo ma'lum naqsh uchun yoziladi. Noma'lum hujumlar uchun anomaliya tahlili va tahdid ovi kerak.

? Suricata qoidasidagi sid nima?
- Manba IP manzil
+ Qoidaning noyob raqami; shaxsiy qoidalar uchun 1000000–1999999
- Ogohlantirish matni
- Port raqami
! rev esa qoida versiyasi — har o'zgarishda oshiriladi.

? http.user_agent; content:"WindowsPowerShell" yozuvidagi http.user_agent nima vazifani bajaradi?
- Qoidani o'chiradi
+ Sticky buffer — content faqat User-Agent maydonida qidiriladi
- Barcha HTTP trafigini bloklaydi
- User-Agent'ni o'zgartiradi
! Tor buffer qoidani aniqroq va tezroq qiladi.

? suricata.yaml da HOME_NET noto'g'ri yozilsa nima bo'ladi?
- Hech narsa o'zgarmaydi
+ $HOME_NET va $EXTERNAL_NET ga tayanadigan ko'p qoidalar ishlamay qoladi yoki noto'g'ri ishlaydi
- Suricata tezroq ishlaydi
- Barcha trafik bloklanadi
! Qoidalarning “ichkari” va “tashqari” tushunchasi aynan HOME_NET ga bog'liq.

? Qoidadagi threshold: type both, track by_src, count 20, seconds 60 nimani bildiradi?
- Har 20 soniyada ogohlantirish
+ Bitta manbadan 60 soniya ichida 20 ta mos kelish bo'lganda ogohlantirish (va shu davrda takrorlamaslik)
- 20 ta turli manba bo'lsa
- Qoida 60 kun ishlaydi
! Bu chegara korrelyatsiyasining tarmoq darajasidagi ko'rinishi.

? IDS veb-serverga qarshi hujum urinishi haqida ogohlantirdi. Eng muhim keyingi savol qaysi?
- Hujumchi qaysi mamlakatdan?
+ Hujum muvaffaqiyatli bo'ldimi — server nima javob berdi va keyin nima bo'ldi?
- Qoida qachon yozilgan?
- Ogohlantirish qaysi rangda?
! IDS urinishni ko'radi, natijani emas. Server javobi va keyingi hodisalar haqiqiy javobni beradi.

? TLS inspection'siz Suricata HTTPS trafigida nimani tekshira oladi?
+ SNI (server nomi), sertifikat ma'lumotlari, IP va portlar
- So'rov URL'i va mazmuni
- Yuklangan fayllar mazmuni
- Foydalanuvchi parollari
! Shifrlangan trafikda metama'lumot ko'rinadi — tls.sni kabi buffer'lar shu uchun.

? Nega ET Open qoidalarining hammasini o'ylamasdan yoqish yomon g'oya?
- Ular pullik
+ Ko'pi sizning muhitingizga mos emas va shovqin chiqaradi — alert fatigue
- Ular Suricata'da ishlamaydi
- Ular faqat Windows uchun
! Keraksiz toifalarni o'chirish va shovqinli qoidalarni sozlash — doimiy ish.
:::

:::cards
IDS va IPS? :: IDS — ko'radi va ogohlantiradi (passiv, nusxadan); IPS — trafik yo'lida turib to'xtatadi (inline).
SPAN va TAP? :: SPAN — switch'da port trafigini nusxalash; TAP — kabelga o'rnatiladigan jismoniy nusxalovchi qurilma.
Aniqlash usullari? :: Imzo (ma'lum naqshlar), anomaliya (odatiydan chetlanish), protokol tahlili (qoidalar buzilishi).
NIDS va HIDS? :: NIDS — tarmoq trafigini tahlil qiladi; HIDS — qurilmada ishlaydi (masalan, Wazuh agenti).
Suricata va Zeek farqi? :: Zeek nima bo'lganini tasvirlaydi (ulanish loglari); Suricata qoidalar bo'yicha nima yomonligini aytadi (ogohlantirishlar).
EVE JSON nima? :: Suricata'ning har qatori bitta JSON hodisa bo'lgan chiqishi: alert, dns, http, tls, fileinfo.
Suricata qoidasi sarlavhasi? :: Harakat (alert/drop/reject/pass), protokol, manba, port, yo'nalish (-> yoki <>), manzil, port.
Sticky buffer nima? :: http.user_agent, http.uri, dns.query, tls.sni kabi kalit so'z — keyingi content faqat shu maydonda qidiriladi.
sid va rev? :: sid — noyob qoida raqami (shaxsiy: 1000000–1999999); rev — qoida versiyasi.
PCAP ustida sinash buyrug'i? :: suricata -r fayl.pcap -l natija/ (faqat o'z qoidalari bilan: -S local.rules).
HOME_NET nima uchun muhim? :: Qoidalardagi ichki va tashqi tarmoq tushunchasi unga bog'liq; noto'g'ri bo'lsa, qoidalar ishlamaydi.
IDS ogohlantirishidagi asosiy savol? :: Urinish muvaffaqiyatli bo'ldimi? Server javobi va keyingi hodisalarni boshqa manbalar bilan tekshiring.
:::
