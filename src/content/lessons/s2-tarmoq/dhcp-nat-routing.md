Yangi telefonni Wi-Fi'ga uladingiz va bir soniyadan keyin internet ishlay boshladi. Siz IP manzil kiritmadingiz, maska yozmadingiz, router manzilini ko'rsatmadingiz. Kimdir bularning hammasini siz uchun qildi.

Bu darsda uchta "ko'rinmas" mexanizmni ochamiz: manzil qayerdan keladi (**DHCP**), xususiy manzil bilan internetga qanday chiqiladi (**NAT**) va paket yo'lni qanday topadi (**marshrutlash**). Uchalasi ham hujumchi va himoyachi uchun muhim.

## DHCP: manzilni kim beradi

Tarmoqda ishlash uchun qurilmaga to'rtta narsa kerak:

1. **IP manzil**
2. **Tarmoq maskasi**
3. **Default gateway** — boshqa tarmoqlarga chiqish eshigi
4. **DNS server** manzili

Ularni qo'lda kiritish mumkin (statik sozlash) — serverlarda shunday qilinadi. Lekin yuzlab noutbuk va telefon uchun bu imkonsiz. Shuning uchun [[dhcp|DHCP]] (Dynamic Host Configuration Protocol) bor: u hammasini avtomatik tarqatadi.

### To'rt qadam: DORA

Qurilma tarmoqqa ulanganda hali manzili yo'q, DHCP server qayerdaligini ham bilmaydi. Shuning uchun u **hammaga** murojaat qiladi:

```
  Klient                                        DHCP server
    │                                               │
    │ ── DISCOVER (broadcast) ───────────────────► │  "DHCP server bormi?"
    │                                               │
    │ ◄── OFFER ─────────────────────────────────── │  "Bor. 192.168.1.57 ni taklif qilaman"
    │                                               │
    │ ── REQUEST (broadcast) ────────────────────► │  "Roziman, shuni olaman"
    │                                               │
    │ ◄── ACK ───────────────────────────────────── │  "Seniki. 24 soatga"
```

Bosh harflari: **D**iscover, **O**ffer, **R**equest, **A**ck — **DORA**.

Manzil abadiy berilmaydi — u **ijaraga** (lease) olinadi, masalan 24 soatga. Muddat tugashidan oldin qurilma uni uzaytiradi.

DHCP **UDP 67** (server) va **68** (klient) portlarida ishlaydi.

Agar DHCP server javob bermasa, Windows o'ziga `169.254.x.x` oralig'idan manzil tayinlaydi. Shu manzilni ko'rsangiz — tashxis tayyor: qurilma DHCP serverga yeta olmagan.

### DHCP va xavfsizlik

DHCP ham ARP kabi **ishonchga qurilgan**: klient birinchi javob bergan serverga ishonadi.

**Rogue DHCP (soxta DHCP server).** Hujumchi tarmoqda o'z DHCP serverini ishga tushiradi va haqiqiysidan tezroq javob beradi. U qurbonlarga beradi:

- gateway sifatida — **o'z manzilini** → butun trafik u orqali o'tadi;
- DNS server sifatida — **o'z serverini** → istalgan nomni istalgan IP ga yo'naltiradi.

Natija — yana [[mitm|Man-in-the-Middle]], lekin bu safar hech narsani "buzmasdan".

**DHCP starvation.** Hujumchi minglab soxta so'rov yuborib, barcha bo'sh manzillarni egallab oladi. Yangi qurilmalar manzil ola olmaydi (xizmatdan voz kechtirish), keyin esa hujumchi o'z soxta serverini ko'taradi.

Himoya: boshqariladigan switch'lardagi **DHCP snooping** — DHCP javoblari faqat ishonchli portdan kelishiga ruxsat beradi.

:::info
Himoyachi uchun DHCP jurnallari — oltin. "Kecha soat 14:30 da `10.1.5.87` manzili kimda edi?" degan savolga faqat ular javob beradi: manzil → MAC → kompyuter nomi. Dinamik manzillar o'zgarib turadi, shuning uchun tergovda vaqt bilan birga qaraladi.
:::

## NAT: bitta manzil ortida butun uy

IP darsidan eslang: uyingizdagi barcha qurilmalar xususiy manzilga ega (`192.168.1.x`), bunday manzillar internetda yo'naltirilmaydi. Unda ular internetga qanday chiqadi?

[[nat|NAT]] (Network Address Translation) — router paketdagi **xususiy manzilni o'zining ommaviy manziliga almashtiradi**.

```
  Noutbuk                        Router                         Sayt
192.168.1.10                 ichki: 192.168.1.1              93.184.216.34
                             tashqi: 84.54.70.20

1. 192.168.1.10:51000 ──►  [ almashtiradi ]  ──► 84.54.70.20:40001 ──►  :443

2.                         NAT jadvali:
                           40001 ↔ 192.168.1.10:51000

3. 192.168.1.10:51000 ◄──  [ qaytaradi ]  ◄──── 84.54.70.20:40001 ◄──  :443
```

Router har chiquvchi ulanishni **NAT jadvaliga** yozib qo'yadi: "tashqi 40001-port — bu ichkaridagi noutbukning 51000-porti". Javob kelganda jadvalga qarab, kimga tegishli ekanini aniqlaydi. Portlar ham almashtirilgani uchun bu tur aniqrog'i **PAT** (Port Address Translation) deyiladi.

Sayt nuqtai nazaridan faqat bitta manzil bor: `84.54.70.20`. Ortida bitta qurilma turibdimi yoki yuztami — u bilmaydi.

### NAT ning xavfsizlikka ta'siri

**Tasodifiy himoya.** Tashqaridan kelgan, hech kim so'ramagan paket uchun NAT jadvalida yozuv yo'q — router uni kimga berishni bilmaydi va tashlab yuboradi. Shuning uchun uydagi kompyuteringizga internetdan to'g'ridan-to'g'ri ulanib bo'lmaydi.

:::warn
NAT — **firewall emas** va xavfsizlik vositasi sifatida yaratilmagan. U faqat *kiruvchi* ulanishlarni to'sadi. Ichkaridagi kompyuter o'zi tashqariga ulansa — yo'l ochiq. Zararli dasturlar aynan shunday ishlaydi: ular tashqaridan kirishni kutmaydi, **o'zi ichkaridan hujumchi serveriga ulanadi**. Pentestdagi "reverse shell" ham shu g'oyaga asoslangan.
:::

**Port forwarding.** Ichkaridagi serverni tashqariga ochish kerak bo'lsa, routerga qoida yoziladi: "tashqi 8080-portga kelgan hamma narsani `192.168.1.50:80` ga uzat". Bu — ataylab ochilgan eshik. Unutilgan port forwarding qoidalari (eski kamera, test serveri) — internetdan topiladigan zaif qurilmalarning asosiy manbai.

**Tergovdagi qiyinchilik.** Jurnalda faqat tashqi manzil ko'rinadi. Tarmoq ichidagi aniq qaysi kompyuter ekanini bilish uchun NAT (yoki firewall) jurnali kerak.

## Marshrutlash: paket yo'lni qanday topadi

Har bir qurilmada — kompyuteringizda ham — **marshrut jadvali** bor. U bitta savolga javob beradi: "shu manzilga ketadigan paketni kimga beray?"

Windows'da ko'rish: `route print`. Linux'da: `ip route`.

```
$ ip route
default via 192.168.1.1 dev eth0
192.168.1.0/24 dev eth0 proto kernel scope link src 192.168.1.10
```

Ikki qatorni o'qiymiz:

- **Ikkinchi qator:** `192.168.1.0/24` — mening tarmog'im; u yerga to'g'ridan-to'g'ri yuboraman.
- **Birinchi qator:** `default` — qolgan **hamma narsa** `192.168.1.1` ga (routerga) ketadi. Bu — [[gateway|default gateway]].

Qoida: bir nechta marshrut mos kelsa, **eng aniq** (prefiksi eng uzun) tanlanadi. `default` — eng noaniq, shuning uchun u faqat boshqa hech narsa mos kelmaganda ishlatiladi.

### Sakrashlar va TTL

Paket manzilga bitta sakrashda yetib bormaydi. U routerdan routerga uzatiladi, har biri o'z jadvaliga qarab keyingi qadamni tanlaydi. Har bir router — bitta **hop** (sakrash).

Paket abadiy aylanib yurmasligi uchun unda [[ttl|TTL]] (Time To Live) hisoblagichi bor. Har router uni bittaga kamaytiradi. Nolga yetsa — paket tashlab yuboriladi va jo'natuvchiga [[icmp|ICMP]] xabari qaytadi.

Aynan shu xususiyatdan **traceroute** foydalanadi: u TTL = 1, keyin 2, keyin 3… bilan paket yuborib, har bir oraliq routerni "javob berishga majbur qiladi".

```
tracert 8.8.8.8          ← Windows
traceroute 8.8.8.8       ← Linux
```

Natija — siz bilan manzil orasidagi routerlar ro'yxati.

### Tarmoq diagnostikasining asosiy uchligi

| Buyruq | Savol | Qatlam |
|---|---|---|
| `ping manzil` | Manzil javob beryaptimi? | 3 (ICMP) |
| `tracert` / `traceroute` | Yo'l qayerda uzilyapti? | 3 |
| `nslookup` / `dig` | Nom to'g'ri IP ga aylanyaptimi? | 7 (DNS) |

"Internet ishlamayapti" degan muammoni tekshirish tartibi:

1. `ping 127.0.0.1` — tarmoq dasturi ishlayaptimi?
2. `ping <gateway>` — routerga yetyaptimi?
3. `ping 8.8.8.8` — internetga chiqyaptimi?
4. `ping google.com` — DNS ishlayaptimi?

Uchinchisi ishlasa, to'rtinchisi ishlamasa — muammo DNS da. Bu ketma-ketlikni yodlab oling.

:::info
`ping` javob bermasa, bu hali "kompyuter o'chiq" degani emas. Ko'p tizimlar va firewall'lar ICMP ni ataylab to'sadi (Windows standart holatda shunday). Shuning uchun Nmap host tirikligini bir necha usul bilan tekshiradi.
:::

## Marshrutlash va segmentatsiya

Marshrutlashning xavfsizlikdagi asosiy ahamiyati — **tarmoqni bo'laklarga ajratish**.

Bitta tekis tarmoqda (hamma `10.0.0.0/16` da) bitta buzilgan kompyuter hammaga to'g'ridan-to'g'ri yeta oladi. Tarmoq bo'laklarga ajratilsa:

```
Xodimlar   10.1.10.0/24 ──┐
Serverlar  10.1.20.0/24 ──┼── Router + Firewall ── Internet
Mehmonlar  10.1.30.0/24 ──┘
```

…bo'laklar orasidagi har bir paket router orqali o'tadi — demak uni **qoidalar bilan cheklash va jurnalga yozish** mumkin. Mehmon Wi-Fi'dagi telefon buxgalteriya serveriga yeta olmaydi.

Pentestda bu to'siqni aylanib o'tish alohida ko'nikma — **pivoting**: egallangan kompyuterdan boshqa segmentga yo'l ochish.

:::try
O'z kompyuteringizda bajaring.

```
ipconfig /all
```

Toping: **DHCP Enabled** (Yes bo'lsa — manzilni avtomatik olgansiz), **DHCP Server**, **Lease Obtained** va **Lease Expires**, **DNS Servers**.

```
route print
```

**IPv4 Route Table** bo'limidan `0.0.0.0` bilan boshlanadigan qatorni toping — bu sizning default marshrutingiz. Gateway ustunida nima yozilgan?

```
tracert 8.8.8.8
```

Nechta sakrash chiqdi? Birinchi sakrash — routeringiz. Brauzerda "what is my ip" deb qidirib, tashqi manzilingizni `ipconfig` dagi ichki manzil bilan solishtiring — NAT ishini o'z ko'zingiz bilan ko'rasiz.
:::

## Xulosa

- **DHCP** IP, maska, gateway va DNS ni avtomatik beradi: **DORA** — Discover, Offer, Request, Ack.
- `169.254.x.x` — DHCP serverga yetib bo'lmadi.
- Soxta DHCP server → trafik va DNS hujumchi qo'lida. Himoya: DHCP snooping.
- **NAT** xususiy manzillarni bitta ommaviy manzil ortiga yashiradi; kiruvchi ulanishlarni to'sadi, lekin firewall emas.
- Zararli dastur ichkaridan tashqariga o'zi ulanadi — NAT buni to'xtatmaydi.
- **Marshrut jadvali**: eng aniq marshrut tanlanadi; `default` — qolgan hamma narsa uchun.
- **TTL** har routerda kamayadi; `traceroute` shundan foydalanadi.
- Diagnostika: loopback → gateway → 8.8.8.8 → domen nomi.
- **Segmentatsiya** buzilgan kompyuterning ta'sir doirasini cheklaydi.

:::quiz
? DHCP jarayonining to'g'ri tartibi qaysi?
- Offer → Discover → Ack → Request
+ Discover → Offer → Request → Ack
- Request → Offer → Discover → Ack
- Discover → Request → Offer → Ack
! DORA: klient qidiradi (Discover), server taklif qiladi (Offer), klient so'raydi (Request), server tasdiqlaydi (Ack).

? Kompyuter `169.254.12.7` manzilini oldi. Bu nimani anglatadi?
- U internetga to'g'ridan-to'g'ri ulangan
- Unga statik manzil berilgan
+ U DHCP serverdan manzil ola olmagan
- U VPN orqali ishlayapti
! 169.254.x.x — qurilma DHCP javobini olmaganda o'ziga o'zi tayinlaydigan manzil. Bunday manzil bilan internet ishlamaydi.

? Soxta (rogue) DHCP server hujumchiga nima beradi?
- Qurbonning parolini to'g'ridan-to'g'ri
+ Qurbonlarga o'zini gateway va DNS server sifatida ko'rsatish imkonini
- Routerning administrator huquqini
- Wi-Fi parolini
! Klient birinchi javob bergan serverga ishonadi. Hujumchi gateway va DNS sifatida o'zini berib, trafikni o'zi orqali o'tkazadi.

? NAT haqida qaysi gap to'g'ri?
- U to'laqonli firewall vazifasini bajaradi
- U trafikni shifrlaydi
+ U xususiy manzillarni ommaviy manzilga almashtiradi va so'ralmagan kiruvchi ulanishlarni o'tkazmaydi
- U faqat IPv6 da ishlaydi
! NAT manzil tanqisligini hal qilish uchun yaratilgan. Kiruvchi ulanishlarni to'sishi — yon ta'sir, to'liq himoya emas.

? Uydagi kompyuter NAT ortida. Unga zararli dastur tushdi. Hujumchi uni qanday boshqaradi?
- Internetdan kompyuterga to'g'ridan-to'g'ri ulanadi
- Boshqara olmaydi — NAT himoya qiladi
+ Zararli dastur o'zi ichkaridan hujumchi serveriga ulanadi
- Routerni qayta o'rnatadi
! NAT faqat kiruvchi ulanishlarni to'sadi. Ichkaridan boshlangan chiquvchi ulanish erkin o'tadi — zararli dasturlar shundan foydalanadi.

? Marshrut jadvalidagi `default` marshruti nima uchun?
- Lokal tarmoqdagi qurilmalar uchun
+ Boshqa hech bir marshrutga mos kelmagan barcha manzillar uchun
- Faqat DNS so'rovlari uchun
- O'chirilgan marshrutlar uchun
! Default marshrut — “qolgan hamma narsa”. Odatda u routerga (default gateway) ishora qiladi.

? `ping 8.8.8.8` ishlayapti, `ping google.com` esa ishlamayapti. Muammo qayerda?
- Tarmoq kabeli uzilgan
- Router o'chiq
+ DNS ishlamayapti
- Provayder internetni to'sgan
! IP manzil bo'yicha aloqa bor — demak tarmoq va internet joyida. Nom IP ga aylanmayapti — bu DNS muammosi.

? traceroute qanday ishlaydi?
- Har routerga parol yuboradi
+ TTL ni 1 dan boshlab oshirib, har bir oraliq routerdan ICMP javobini oladi
- DNS serverdan yo'lni so'raydi
- MAC manzillarni tekshiradi
! TTL nolga yetgan router paketni tashlab, xabar qaytaradi. TTL ni birma-bir oshirib, yo'ldagi barcha routerlar aniqlanadi.

? Tarmoqni segmentlarga ajratishning xavfsizlikdagi asosiy foydasi nima?
- Internet tezlashadi
- IP manzillar tejaladi
+ Buzilgan qurilma boshqa segmentlarga erkin yeta olmaydi; segmentlar orasidagi trafik nazorat qilinadi
- Parollar kerak bo'lmay qoladi
! Segmentlar orasidagi paketlar router/firewall orqali o'tadi — ularni cheklash va jurnalga yozish mumkin.
:::

:::cards
DHCP qurilmaga nimalarni beradi? :: IP manzil, tarmoq maskasi, default gateway va DNS server manzilini.
DORA nima? :: DHCP qadamlari: Discover, Offer, Request, Ack.
169.254.x.x manzili nimani bildiradi? :: Qurilma DHCP serverdan manzil ola olmagan.
Rogue DHCP hujumi? :: Hujumchi soxta DHCP server ko'tarib, o'zini gateway va DNS sifatida beradi — trafik u orqali o'tadi.
NAT nima qiladi? :: Paketdagi xususiy IP manzilni routerning ommaviy manziliga almashtiradi va javoblarni jadval bo'yicha qaytaradi.
NAT nega to'liq himoya emas? :: U faqat so'ralmagan kiruvchi ulanishlarni to'sadi; ichkaridan boshlangan ulanishlar erkin chiqadi.
Port forwarding nima? :: Tashqi portga kelgan ulanishlarni ichki tarmoqdagi aniq qurilma va portga uzatish qoidasi.
Default gateway nima? :: Boshqa tarmoqlarga ketadigan paketlar yuboriladigan router manzili.
TTL paketda nima uchun kerak? :: Har routerda bittaga kamayadi; nolga yetsa paket tashlanadi — abadiy aylanishning oldini oladi.
Tarmoq diagnostikasi ketma-ketligi? :: ping 127.0.0.1 → gateway → 8.8.8.8 → domen nomi (DNS).
:::
