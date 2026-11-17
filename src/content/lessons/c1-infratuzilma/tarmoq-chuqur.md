SOC tarmog'idagi insidentni eslang: buxgalter d.karimova Word faylini ochdi, kompyuter WS-BUX-014 hujumchi qo'liga o'tdi. Endi savol: **shu kompyuterdan hujumchi yana nimaga yeta oladi?**

Agar kompaniya tarmog'i "tekis" bo'lsa — hamma narsa bitta katta tarmoqda — javob qo'rqinchli: buxgalter kompyuteridan to'g'ridan-to'g'ri ma'lumotlar bazasi serveriga, domen kontrolleriga, zaxira serveriga, kamera tizimiga. Bitta xato xat — butun kompaniya.

Agar tarmoq **segmentlangan** bo'lsa, javob boshqacha: buxgalter kompyuteri faqat buxgalteriya dasturiga va internetga chiqa oladi. Server segmentiga, boshqaruv segmentiga yo'l — firewall orqali, faqat aniq ruxsat etilgan portlar bilan. Hujumchi bitta xonaga kirdi, lekin eshiklar qulflangan.

Tarmoq bosqichida (s2) IP, subnet, marshrutlash va NAT asoslarini o'rgandingiz. Bu dars — ularning muhandislik ko'rinishi: tarmoqni qanday bo'lish, segmentlar orasida trafikni qanday boshqarish va masofadan xavfsiz qanday ulanish.

## Tekis va segmentlangan tarmoq

```
 TEKIS TARMOQ (10.10.0.0/16)                SEGMENTLANGAN TARMOQ

 ┌──────────────────────────────┐          ┌────────┐  ┌────────┐  ┌────────┐
 │ PC  PC  printer  kamera      │          │Xodimlar│  │Serverlar│ │Mehmon  │
 │ server  baza  zaxira  DC     │          │  VLAN10│  │ VLAN20 │  │ VLAN50 │
 │   hamma hammaga yeta oladi   │          └───┬────┘  └───┬────┘  └───┬────┘
 └──────────────────────────────┘              │           │           │
                                            ┌──┴───────────┴───────────┴──┐
                                            │  firewall: kim kimga, qaysi │
                                            │  portda — aniq qoidalar     │
                                            └─────────────────────────────┘
```

| | Tekis | Segmentlangan |
|---|---|---|
| Sozlash | Oson | Reja kerak |
| Bitta qurilma buzilsa | Butun tarmoq xavf ostida | Zarar segment ichida qoladi |
| Hujumchining keyingi qadami | Erkin | Har bir o'tish firewall'dan o'tadi va jurnalga yoziladi |
| Muvofiqlik (PCI DSS va h.k.) | Butun tarmoq audit doirasida | Faqat karta ma'lumoti segmenti |

Hujumchining bitta tizimdan boshqasiga o'tishi — [[lateral-movement|lateral movement]]. [[segmentation|Segmentatsiya]] uni to'xtatmasa ham, qiyinlashtiradi va **ko'rinadigan** qiladi: segmentlar orasidagi har bir g'ayrioddiy ulanish firewall jurnalida qoladi — SOC uchun signal.

## VLAN: bitta switch — bir nechta tarmoq

Har bir segment uchun alohida switch sotib olish qimmat. [[vlan|VLAN]] (Virtual LAN) bitta fizik switch ichida mantiqiy ajratilgan tarmoqlar yaratadi.

Tarmoq bosqichidan eslaysiz: switch 2-qatlamda MAC manzillar bilan ishlaydi va broadcast'ni hamma portlarga yuboradi. VLAN bilan har bir port bitta VLAN'ga biriktiriladi va broadcast faqat shu VLAN ichida tarqaladi. VLAN 10 dagi kompyuter VLAN 20 dagi kompyuterni 2-qatlamda **umuman ko'rmaydi**.

| Port turi | Nima uchun | Kadr |
|---|---|---|
| **Access** | Oddiy qurilma (PC, printer) ulanadi | Teg yo'q; port bitta VLAN'ga tegishli |
| **Trunk** | Switch — switch yoki switch — router | 802.1Q teg qo'shiladi: "bu kadr VLAN 20 dan" |

```
 Ethernet kadri trunk portda:
 ┌────────┬────────┬───────────────┬──────┬─────────┐
 │ Dst MAC│ Src MAC│ 802.1Q: VLAN 20│ Type │ Ma'lumot│
 └────────┴────────┴───────────────┴──────┴─────────┘
```

:::warn
**VLAN o'zi firewall emas.** VLAN'lar orasida marshrutlash (inter-VLAN routing) yoqilgan va filtr qo'yilmagan bo'lsa, ular 3-qatlamda bir-biriga erkin yeta oladi — ajratish faqat qog'ozda qoladi. Haqiqiy segmentatsiya = VLAN + segmentlar orasidagi **firewall qoidalari**.
:::

Switch sozlamalarida ham xavfsizlik bor: ishlatilmaydigan portlarni o'chirish va ishlatilmaydigan VLAN'ga qo'yish, trunk'ni faqat kerakli portlarda yoqish, switch'larning avtomatik trunk kelishuvini (DTP) o'chirish, native VLAN'ni foydalanuvchi VLAN'laridan ajratish. Bu sozlamalar VLAN chegarasini aylanib o'tishga qaratilgan hujumlarni yopadi.

## Marshrutlash: segmentlar orasidagi yo'l

VLAN'lar — alohida subnetlar. Ular orasida paket o'tishi uchun 3-qatlam qurilmasi kerak: router, L3 switch yoki firewall. Tarmoq bosqichidagi qoida: **boshqa subnetga ketadigan paket gateway'ga yuboriladi**.

Linux'da marshrut jadvali:

```bash
ip route
# default via 10.10.10.1 dev eth0               ← boshqa hamma narsa — gateway orqali
# 10.10.10.0/24 dev eth0 proto kernel           ← o'z subneti — to'g'ridan-to'g'ri
# 10.10.99.0/24 dev wg0                          ← VPN tarmog'i — wg0 interfeysi orqali

# Statik marshrut qo'shish: 10.10.20.0/24 ga 10.10.10.254 orqali borilsin
sudo ip route add 10.10.20.0/24 via 10.10.10.254
```

| Usul | Qanday | Qayerda |
|---|---|---|
| **Statik** | Ma'mur qo'lda yozadi | Kichik tarmoq, aniq yo'llar, VPN |
| **OSPF** | Routerlar bir-biriga tarmoq holatini e'lon qiladi, eng qisqa yo'lni hisoblaydi | Kompaniya ichida |
| **BGP** | Avtonom tizimlar (provayderlar, yirik kompaniyalar) bir-biriga "bu manzillar menda" deb e'lon qiladi | Internetning o'zi |

Dinamik marshrutlashning xavfsizlik tomoni: routerlar bir-birining e'loniga **ishonadi**. Agar kimdir noto'g'ri e'lon yuborsa (xato yoki ataylab), trafik noto'g'ri tomonga ketadi. Internet darajasida bu "BGP hijack" deb ataladi va butun xizmatlarni vaqtincha yo'q qilgan holatlar bo'lgan. Himoya: qo'shni routerlar bilan autentifikatsiya, qabul qilinadigan e'lonlarni filtrlash, internetda RPKI (manzillar egaligini kriptografik tasdiqlash).

## Segmentatsiya rejasi

Kichik kompaniya uchun (masalan, Qaydnoma'ni ishlab chiqayotgan 30 kishilik jamoa) amaliy reja:

| Segment | VLAN | Subnet | Kimlar |
|---|---|---|---|
| Xodimlar | 10 | 10.10.10.0/24 | Noutbuk va kompyuterlar |
| Serverlar | 20 | 10.10.20.0/24 | Ichki serverlar, baza |
| Boshqaruv | 30 | 10.10.30.0/24 | Switch, firewall, hypervisor boshqaruv interfeyslari |
| Printer va IoT | 40 | 10.10.40.0/24 | Printer, kamera, aqlli qurilmalar |
| Mehmon Wi-Fi | 50 | 10.10.50.0/24 | Mehmonlar — faqat internet |
| DMZ | 60 | 10.10.60.0/24 | Internetdan ochiq serverlar |

Keyin eng muhim qism — **oqimlar jadvali** (kim kimga, qaysi port bilan). Qoida: ro'yxatda yo'q oqim — taqiqlangan.

| Qayerdan | Qayerga | Port | Nega |
|---|---|---|---|
| Xodimlar | Serverlar | 443 | Ichki web ilovalar |
| Xodimlar | Printer | 9100, 631 | Chop etish |
| Xodimlar | Internet | 80, 443 | Ish |
| Boshqaruv | Hamma segment | 22, 443 | Ma'murlar |
| Serverlar | Internet | 443 (faqat yangilanish manzillari) | Yangilanish |
| DMZ | Serverlar | 5432 (faqat bitta server) | Web ilova bazaga |
| Mehmon | Internet | 80, 443 | Faqat internet |
| Printer va IoT | Hech qayerga | — | Ular gapirmaydi, ularga gapiriladi |

Bu jadval nimani beradi:

- WS-BUX-014 buzilsa — hujumchi xodimlar segmentida, serverlarga faqat 443 orqali. Boshqaruv interfeyslari uning uchun ko'rinmas.
- Kamera buzilsa (IoT qurilmalari kam yangilanadi) — undan hech qayerga chiqib bo'lmaydi.
- Mehmon Wi-Fi'dagi notanish noutbuk ichki tarmoqni umuman ko'rmaydi.
- [[dmz|DMZ]]dagi web server buzilsa — faqat bitta baza portiga yo'l bor, butun server segmentiga emas.

:::key
Segmentatsiyaning qiyin qismi — VLAN yaratish emas, **oqimlar jadvalini** tuzish. Buning uchun qaysi tizim kimga nima uchun ulanishini bilish kerak. Ko'p kompaniyalarda buni hech kim aniq bilmaydi — shuning uchun avval kuzatish (firewall jurnali, flow loglar), keyin qoidalar.
:::

Xuddi shu g'oya bulutda ham ishlaydi: VPC ichida ommaviy va xususiy subnetlar, security group'lar orqali oqimlar (c2 bosqichi). Kubernetes'da esa network policy (c3). Nomlar o'zgaradi — tamoyil bir xil.

## VPN: ochiq tarmoq ustidan xususiy tunnel

[[vpn|VPN]] ikki asosiy holatda kerak:

```
 SITE-TO-SITE                               REMOTE ACCESS
 ┌────────┐  shifrlangan tunnel  ┌────────┐   ┌────────┐  tunnel   ┌────────┐
 │Toshkent│══════ internet ══════│Samarqand│  │noutbuk │══════════│ofis/   │
 │ ofisi  │                      │ filiali │  │(uydan) │          │bulut   │
 └────────┘                      └────────┘   └────────┘          └────────┘
 Ikki tarmoq bitta tarmoqdek                 Bitta qurilma ichki tarmoqqa
```

| Protokol | Xususiyati | Qayerda |
|---|---|---|
| **IPsec** | Standart, murakkab, routerlar va firewall'lar qo'llab-quvvatlaydi | Site-to-site, bulut VPN shlyuzlari |
| **OpenVPN** | TLS ustida, moslashuvchan, sertifikatlar bilan | Remote access, eski tizimlar |
| **WireGuard** | Kichik kod (audit qilish oson), tez, sozlash oddiy | Ikkalasi ham, zamonaviy loyihalar |

## WireGuard bilan amaliyot

Maqsad: `qaydnoma-web-01` serveriga SSH'ni internetdan butunlay yopish va faqat VPN orqali kirish.

[[wireguard|WireGuard]]'da har bir tomonning kalit juftligi bor, tomonlar bir-birini **ochiq kalit** orqali taniydi (SSH kalitlariga o'xshash g'oya).

```bash
# Serverda
sudo apt install -y wireguard
wg genkey | sudo tee /etc/wireguard/server.key | wg pubkey | sudo tee /etc/wireguard/server.pub
sudo chmod 600 /etc/wireguard/server.key
```

```ini
# /etc/wireguard/wg0.conf — server
[Interface]
Address    = 10.10.99.1/24
ListenPort = 51820
PrivateKey = <server-private-key>

[Peer]
# Aziz noutbuki
PublicKey  = <client-public-key>
AllowedIPs = 10.10.99.2/32
```

```ini
# Noutbukda: wg0.conf — mijoz
[Interface]
Address    = 10.10.99.2/24
PrivateKey = <client-private-key>

[Peer]
PublicKey  = <server-public-key>
Endpoint   = 203.0.113.20:51820
AllowedIPs = 10.10.99.0/24
PersistentKeepalive = 25
```

`AllowedIPs` — WireGuard'ning eng muhim va eng ko'p chalkashtiriladigan sozlamasi. U ikki ishni bajaradi:

| Tomonda | Ma'nosi |
|---|---|
| Serverda (peer uchun) | Bu peer'dan **qaysi manbali** paketlarni qabul qilaman — `10.10.99.2/32`: faqat o'z manzili bilan |
| Mijozda | **Qaysi manzillarga** ketadigan trafik tunnelga yo'naltiriladi — `10.10.99.0/24`: faqat VPN tarmog'i (split tunnel) |

Mijozda `AllowedIPs = 0.0.0.0/0` yozilsa — barcha internet trafigi tunnel orqali ketadi (full tunnel).

```bash
sudo systemctl enable --now wg-quick@wg0
sudo wg show                                  # peer'lar va oxirgi handshake vaqti

# Firewall: WireGuard porti ochiq, SSH esa faqat VPN interfeysidan
sudo ufw allow 51820/udp
sudo ufw allow in on wg0 to any port 22 proto tcp
sudo ufw delete allow OpenSSH                 # internetdan SSH yopildi
```

Natija: internetdan qaraganda serverda faqat 80, 443 (TCP) va 51820 (UDP) bor. WireGuard noto'g'ri kalit bilan kelgan paketga **umuman javob bermaydi** — skaner uchun port yopiqdek ko'rinadi. SSH esa faqat `ssh aziz@10.10.99.1` orqali, tunnel ichidan.

:::warn
`ufw delete allow OpenSSH` dan **oldin** VPN orqali SSH ishlashini ikkinchi terminalda tekshiring. Oldingi darsdagi qoida bu yerda ham amal qiladi: o'zingizni qulflab qo'ymang. Bulut provayderining serial konsoli qayerda ekanini oldindan biling.
:::

## VPN nimani qilmaydi

- VPN ga ulangan **buzilgan noutbuk** — hujumchi uchun ichki tarmoqqa tayyor tunnel. VPN "kim ulanmoqda" ni tekshiradi, "qurilma toza-mi" ni emas.
- VPN ichidagi hamma narsaga ishonish — eski "qal'a va xandaq" modeli: devordan o'tgan odam ichkarida erkin. Zamonaviy yondashuv — har bir so'rovni alohida tekshirish ([[zero-trust|zero trust]], c4 bosqichi).
- VPN kaliti o'g'irlansa — xuddi SSH kaliti kabi. Kalitlar ro'yxatini yuritish, ketgan xodim kalitini darhol o'chirish shart.
- Tijorat "maxfiylik VPN"lari boshqa narsa: ular trafikni provayderdan yashiradi, lekin VPN kompaniyasi uni ko'radi. Bu dars kompaniya infratuzilmasidagi VPN haqida.

:::try
1. O'z uyingiz yoki ofisingiz tarmog'i uchun segmentatsiya rejasini yozing: qaysi qurilmalar bor, ularni qaysi segmentlarga bo'lasiz, oqimlar jadvali qanday? (Uy routerlarining ko'pchiligida kamida "mehmon tarmog'i" bor — bu eng oddiy segment.)
2. `ip route` natijangizni o'qing: default gateway qaysi, qanday lokal subnetlar bor?
3. Ikki virtual mashina (yoki VM va bepul bulut serveri) orasida WireGuard tunnel ko'taring. `sudo wg show` da `latest handshake` qatori chiqishini va `ping 10.10.99.1` ishlashini tekshiring.
4. Savol: mijozda `AllowedIPs = 10.10.99.0/24` turibdi. `curl https://example.com` tunnel orqali ketadimi?

**Javoblar:**
1. Odatiy minimal reja: asosiy qurilmalar (noutbuk, telefon), IoT (televizor, kamera, aqlli rozetka) — mehmon tarmog'iga, mehmonlar — mehmon tarmog'iga. Oqim: IoT → faqat internet; asosiy → IoT (masalan, televizorga ekran uzatish uchun) — kerak bo'lsa.
2. `default via ...` — gateway (odatda routeringiz, masalan `192.168.1.1`); `... proto kernel` qatorlari — interfeyslaringizning o'z subnetlari.
3. `latest handshake` bo'lmasa: UDP 51820 bulut firewall'ida (security group) yoki ufw'da yopiq, yoki kalitlar almashib ketgan (har bir tomonda **boshqasining ochiq** kaliti turishi kerak).
4. Yo'q. `example.com` manzili `10.10.99.0/24` ga kirmaydi — trafik odatdagi default gateway orqali ketadi (split tunnel).
:::

## Xulosa

- Tekis tarmoqda bitta buzilgan qurilma — butun tarmoq xavfi. Segmentatsiya lateral movement'ni qiyinlashtiradi va ko'rinadigan qiladi.
- VLAN bitta switch'da ajratilgan tarmoqlar yaratadi, lekin o'zi firewall emas: segmentlar orasida filtr qoidalari shart.
- Marshrutlash: statik (qo'lda), OSPF (kompaniya ichida), BGP (internet). Dinamik protokollar e'lonlarga ishonadi — autentifikatsiya va filtr kerak.
- Segmentatsiyaning qiyin qismi — oqimlar jadvali. Ro'yxatda yo'q oqim — taqiqlangan.
- VPN: site-to-site va remote access. WireGuard — kichik, tez, kalitlarga asoslangan; `AllowedIPs` ikki tomonda ikki xil ma'noga ega.
- Boshqaruv portlarini (SSH) internetdan yopib, faqat VPN orqali ochish — kuchli va oddiy chora.
- VPN qurilma tozaligini tekshirmaydi; uning ichidagi hamma narsaga ishonish — eski model.

:::quiz
? Tekis tarmoqda buxgalter kompyuteri buzildi. Asosiy xavf nima?
- Faqat shu kompyuterdagi fayllar yo'qoladi
+ Hujumchi undan tarmoqdagi istalgan tizimga — serverlar, baza, boshqaruv interfeyslariga yeta oladi
- Internet ulanishi uziladi
- Hech qanday qo'shimcha xavf yo'q
! Tekis tarmoqda hamma hammaga yeta oladi; lateral movement uchun to'siq yo'q.

? VLAN'lar yaratildi, lekin ular orasida marshrutlash yoqilgan va hech qanday filtr yo'q. Natija?
- VLAN'lar bir-biridan to'liq ajratilgan
+ 3-qatlamda ular bir-biriga erkin yeta oladi — ajratish faqat qog'ozda
- Tarmoq ishlamaydi
- Faqat broadcast ajratiladi va bu yetarli
! VLAN 2-qatlamni ajratadi; haqiqiy segmentatsiya uchun segmentlar orasida firewall qoidalari kerak.

? Trunk port nima uchun ishlatiladi?
- Bitta kompyuterni ulash uchun
+ Switch va switch (yoki router) o'rtasida bir nechta VLAN trafigini 802.1Q teglari bilan o'tkazish uchun
- Faqat mehmon Wi-Fi uchun
- Portni o'chirish uchun
! Access port bitta VLAN'ga tegishli; trunk port kadrlarga VLAN tegini qo'shib, bir nechta VLAN'ni tashiydi.

? Segmentatsiyada eng qiyin qism odatda qaysi?
- VLAN raqamlarini tanlash
- Switch sotib olish
+ Qaysi tizim kimga nima uchun ulanishini bilib, oqimlar jadvalini tuzish
- Kabellarni ulash
! Texnik sozlash nisbatan oson; haqiqiy oqimlarni bilish va qoidalarga aylantirish — asosiy ish.

? IoT segmentidagi kamera buzildi. Yaxshi segmentatsiya rejasi bo'yicha undan qayerga chiqish mumkin?
- Serverlar segmentiga
- Boshqaruv segmentiga
+ Hech qayerga — IoT qurilmalari tashabbus bilan ulanmaydi, ularga faqat ulanadi
- Xodimlar segmentiga
! Kam yangilanadigan qurilmalar alohida segmentda, chiquvchi oqimsiz turadi — buzilsa ham zarar qamalib qoladi.

? Dinamik marshrutlash protokollarining asosiy xavfsizlik zaifligi nimada?
- Ular juda sekin
+ Routerlar bir-birining e'loniga ishonadi; noto'g'ri e'lon trafikni boshqa tomonga burib yuborishi mumkin
- Ular shifrlash ishlatmaydi va shuning uchun ishlamaydi
- Ular faqat IPv6 da ishlaydi
! BGP hijack kabi holatlar shu ishonchdan kelib chiqadi; himoya — autentifikatsiya, filtr, RPKI.

? WireGuard serverida peer uchun `AllowedIPs = 10.10.99.2/32` nimani bildiradi?
- Bu peer barcha internet trafigini tunnelga yuboradi
+ Bu peer'dan faqat 10.10.99.2 manbali paketlar qabul qilinadi
- Server 10.10.99.2 portini ochadi
- Bu peer'ga hech qanday trafik bormaydi
! Serverda AllowedIPs — shu peer'dan qabul qilinadigan manba manzillar (va unga yo'naltiriladigan manzillar).

? Mijozda `AllowedIPs = 10.10.99.0/24`. `https://example.com` ga so'rov qayerdan ketadi?
+ Odatdagi default gateway orqali, tunnelsiz (split tunnel)
- WireGuard tunnel orqali
- Hech qayerga — bloklanadi
- Server 203.0.113.20 orqali
! Mijozda AllowedIPs — tunnelga yo'naltiriladigan manzillar; example.com bu diapazonga kirmaydi.

? SSH'ni internetdan yopib, faqat VPN orqali ochishning asosiy foydasi nima?
- SSH tezroq ishlaydi
+ Boshqaruv eshigi internetdagi skanerlar va hujumlar uchun umuman ko'rinmaydi
- Parol kerak bo'lmaydi
- Server yangilanishlari avtomatik o'rnatiladi
! Hujum yuzasi kichrayadi: SSH faqat tunnel ichidan, WireGuard esa noto'g'ri kalitli paketlarga javob bermaydi.

? Xodim noutbuki zararli dastur bilan buzilgan va u VPN ga ulandi. VPN nima qiladi?
- Zararli dasturni aniqlab, ulanishni rad etadi
+ Ulanishga ruxsat beradi — VPN kim ulanayotganini tekshiradi, qurilma tozaligini emas
- Noutbukni avtomatik tozalaydi
- Trafikni shifrlamaydi
! Buzilgan qurilma VPN orqali hujumchiga ichki tarmoqqa tunnel beradi; shuning uchun qurilma holatini ham tekshiradigan zero trust yondashuvi kerak.
:::

:::cards
Segmentatsiya :: Tarmoqni ishonch darajasi va maqsadiga ko'ra alohida qismlarga bo'lish
Lateral movement :: Hujumchining buzilgan tizimdan tarmoqdagi boshqa tizimlarga o'tishi
VLAN :: Bitta switch ichidagi mantiqiy ajratilgan tarmoq; o'zi firewall emas
Access port :: Bitta VLAN'ga tegishli, oddiy qurilma ulanadigan port
Trunk port :: 802.1Q teglari bilan bir nechta VLAN'ni tashiydigan port
Oqimlar jadvali :: Kim kimga qaysi port orqali nima uchun ulanadi; ro'yxatda yo'q — taqiqlangan
BGP :: Internetda avtonom tizimlar orasida marshrut e'lon qilish protokoli
Site-to-site VPN :: Ikki tarmoqni internet ustidan bitta tarmoqdek bog'laydigan tunnel
Remote access VPN :: Bitta qurilmani masofadan ichki tarmoqqa ulaydigan tunnel
WireGuard :: Kichik kodli, tez, ochiq kalitlarga asoslangan VPN protokoli
AllowedIPs (mijozda) :: Qaysi manzillarga trafik tunnelga yo'naltiriladi
Split tunnel :: Faqat ichki manzillarga trafik VPN orqali, qolgani odatdagidek
:::
