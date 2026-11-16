IP manzil paketni kerakli kompyuterga yetkazadi. Lekin o'sha kompyuterda bir vaqtda brauzer, messenjer, o'yin va pochta ishlayapti. Kelgan paket qaysi dasturga tegishli? Va agar paket yo'lda yo'qolib qolsa-chi?

Bu savollarga **Transport qatlami** javob beradi. Bu yerda ikki narsa bor: **portlar** va ikki protokol — **TCP** va **UDP**. Nmap bilan skanerlash, firewall qoidalari, tarmoq jurnallari — hammasi shu darsdagi tushunchalarga tayanadi.

## Port — dasturning eshigi

IP manzil — ko'p qavatli uyning manzili. [[port|Port]] — xonadon raqami.

Port — 0 dan 65535 gacha bo'lgan son. Har bir tarmoq ulanishi to'rt qiymat bilan aniqlanadi:

```
192.168.1.10 : 51432   →   93.184.216.34 : 443
   manba IP    manba        manzil IP      manzil
               port                        port
```

IP va portning birikmasi **socket** deyiladi. Shu tufayli brauzerda o'nta oyna bir vaqtda bitta saytga ulanib tura oladi: har birining manba porti boshqa.

Portlar uch guruhga bo'linadi:

| Oraliq | Nomi | Kim ishlatadi |
|---|---|---|
| 0 – 1023 | Well-known | Mashhur xizmatlar. Tinglash uchun administrator huquqi kerak |
| 1024 – 49151 | Registered | Dasturlar va ma'lumotlar bazalari |
| 49152 – 65535 | Dynamic / ephemeral | Klient ulanishlari uchun vaqtinchalik portlar |

Server ma'lum portda **tinglaydi** (masalan 443). Klient esa har ulanish uchun yuqori oraliqdan tasodifiy port oladi.

## Yoddan bilish kerak bo'lgan portlar

Bu jadval — kasbiy alifbo. Skan natijasiga qarab "nima ishlayapti" degan savolga bir qarashda javob bera olishingiz kerak.

| Port | Protokol | Xizmat |
|---|---|---|
| 20, 21 | TCP | FTP — fayl uzatish |
| 22 | TCP | SSH — xavfsiz masofaviy boshqaruv |
| 23 | TCP | Telnet — shifrlanmagan masofaviy boshqaruv |
| 25 | TCP | SMTP — pochta jo'natish |
| 53 | UDP / TCP | DNS |
| 67, 68 | UDP | DHCP |
| 80 | TCP | HTTP |
| 110 | TCP | POP3 — pochta olish |
| 143 | TCP | IMAP — pochta olish |
| 443 | TCP | HTTPS |
| 445 | TCP | SMB — Windows fayl ulashish |
| 3306 | TCP | MySQL |
| 3389 | TCP | RDP — Windows masofaviy ish stoli |
| 5432 | TCP | PostgreSQL |
| 8080 | TCP | HTTP ning muqobil porti |

:::info
Port raqami — **kelishuv, qonun emas**. Veb-serverni 8443-portda, SSH ni 2222-portda ishga tushirish mumkin. Shuning uchun skanerda faqat port raqamiga ishonmaydilar: Nmap'ning `-sV` opsiyasi portda aslida nima javob berayotganini tekshiradi.
:::

## TCP — ishonchli yetkazish

[[tcp|TCP]] (Transmission Control Protocol) — "buyurtma xat": yetib bordi-yo'qligi tasdiqlanadi.

TCP nimani kafolatlaydi:

- **Yetkazish.** Har bir bo'lak tasdiqlanadi; tasdiq kelmasa — qayta yuboriladi.
- **Tartib.** Bo'laklar raqamlanadi va manzilda to'g'ri tartibda yig'iladi.
- **Yaxlitlik.** Buzilgan bo'laklar aniqlanadi.

Buning narxi — tezlik va qo'shimcha trafik.

### Uch bosqichli salomlashuv

Ma'lumot yuborishdan oldin TCP **ulanish o'rnatadi**. Bu [[handshake|three-way handshake]] deyiladi:

```
  Klient                               Server
    │                                    │
    │ ──────────  SYN  ────────────────► │   "Ulanmoqchiman"
    │                                    │
    │ ◄────────  SYN-ACK  ────────────── │   "Roziman. Sen tayyormisan?"
    │                                    │
    │ ──────────  ACK  ────────────────► │   "Tayyorman"
    │                                    │
    │ ◄═══════  ma'lumot almashish  ════►│
```

**SYN** (synchronize) — boshlash so'rovi. **ACK** (acknowledge) — tasdiq. Bu uch qadamni yoddan biling va chizib bera oling — intervyuning doimiy savoli.

### TCP bayroqlari

Har bir TCP segmentida bir necha bitli **bayroqlar** (flags) bor:

| Bayroq | Ma'nosi |
|---|---|
| **SYN** | Ulanishni boshlash |
| **ACK** | Tasdiqlash |
| **FIN** | Ulanishni odob bilan yopish |
| **RST** | Ulanishni keskin uzish ("bu yerda hech kim yo'q" yoki "xato") |
| **PSH** | Ma'lumotni darhol dasturga uzatish |

## Port skanerlash shu yerdan kelib chiqadi

Endi siz Nmap qanday ishlashini tushunasiz. [[port-scan|Port skanerlash]] — portga SYN yuborib, javobni kuzatish:

| Siz yuborasiz | Javob | Xulosa |
|---|---|---|
| SYN | **SYN-ACK** | Port **ochiq** — xizmat tinglayapti |
| SYN | **RST** | Port **yopiq** — kompyuter bor, lekin xizmat yo'q |
| SYN | *jimlik* | **Filtrlangan** — firewall paketni tashlab yubordi |

Eng mashhur skan turi — **SYN scan** (`nmap -sS`): SYN yuboradi, SYN-ACK kelsa, ulanishni tugatmasdan RST bilan uzadi. Shuning uchun uni "yarim ochiq" skan deyiladi.

Himoyachi uchun shu narsaning o'zi — belgi: bitta manzildan qisqa vaqt ichida yuzlab turli portlarga SYN kelyaptimi? Bu skanerlash.

:::warn
Port skanerlash — razvedka harakati. O'zingizniki bo'lmagan va ruxsat berilmagan tizimni skanerlash ko'p joyda qonunbuzarlik yoki hech bo'lmaganda xizmat shartlarini buzish hisoblanadi. Mashq uchun — o'z laboratoriyangiz va o'quv platformalari.
:::

## UDP — tez, lekin kafolatsiz

[[udp|UDP]] (User Datagram Protocol) — "oddiy otkritka": tashladingiz va unutdingiz.

- Ulanish o'rnatilmaydi — handshake yo'q.
- Yetkazish kafolatlanmaydi, tartib saqlanmaydi.
- Sarlavhasi kichik, kechikish minimal.

Nega kerak? Chunki ba'zan **tezlik ishonchlilikdan muhim**. Videoqo'ng'iroqda yo'qolgan kadrni qayta yuborish ma'nosiz — u kelguncha suhbat oldinga ketib bo'ladi.

| | TCP | UDP |
|---|---|---|
| Ulanish | O'rnatiladi (handshake) | Yo'q |
| Yetkazish kafolati | Bor | Yo'q |
| Tartib | Saqlanadi | Saqlanmaydi |
| Tezlik | Sekinroq | Tez |
| Qayerda | Veb, pochta, SSH, fayl uzatish | DNS, video, ovoz, o'yinlar, DHCP |

UDP ning xavfsizlikka oid ikki xususiyati:

- **Skanerlash qiyin.** Handshake yo'q, shuning uchun ochiq port ko'pincha umuman javob bermaydi. UDP skan sekin va noaniq — himoyachilar ham UDP xizmatlarini ko'pincha unutib qo'yadi.
- **Manbani soxtalashtirish oson.** Ulanish o'rnatilmagani uchun jo'natuvchi IP ni almashtirish mumkin. Kuchaytirilgan [[ddos|DDoS]] hujumlari shunga asoslangan: hujumchi qurbon nomidan kichik so'rov yuboradi, server esa qurbonga katta javob qaytaradi.

## O'z kompyuteringizda nima tinglayapti

Eng foydali diagnostika buyruqlaridan biri — ochiq ulanishlar va tinglayotgan portlarni ko'rish:

```
netstat -ano            ← Windows
ss -tulpn               ← Linux
```

Natijada `LISTENING` (yoki `LISTEN`) holatidagi qatorlar — so'rov kutayotgan xizmatlar. Oldingi darsdan eslang: `0.0.0.0:port` — tarmoqdan ochiq, `127.0.0.1:port` — faqat lokal.

Bu buyruqni hujumchi ham, himoyachi ham birinchilardan yozadi. Hujumchi: "bu yerda qanday ichki xizmatlar bor?" Himoyachi: "bu port nega ochiq va uni qaysi dastur ochgan?"

:::try
CMD'ni oching va yozing:

```
netstat -ano | findstr LISTENING
```

Ro'yxatdan 445 va 135-portlarni toping — bular Windows'ning o'z xizmatlari. Oxirgi ustun — PID. Task Manager → **Details** yorlig'ida shu PID bo'yicha qaysi dastur ekanini aniqlang.

Savol: ro'yxatdagi qaysi portlar `0.0.0.0` da, qaysilari `127.0.0.1` da tinglayapti?
:::

## Xulosa

- **Port** (0–65535) kompyuterdagi aniq dasturni ko'rsatadi; 0–1023 — mashhur xizmatlar.
- Ulanish = manba IP:port + manzil IP:port.
- **TCP**: ulanish, kafolat, tartib. **Handshake**: SYN → SYN-ACK → ACK.
- **UDP**: ulanishsiz, kafolatsiz, tez.
- Port holati: SYN-ACK — ochiq, RST — yopiq, jimlik — filtrlangan.
- Port raqami — kelishuv; xizmatni versiya tekshiruvi aniqlaydi.
- `netstat -ano` / `ss -tulpn` — tinglayotgan portlar.

:::quiz
? TCP uch bosqichli salomlashuvining to'g'ri tartibi qaysi?
- ACK → SYN → SYN-ACK
- SYN → ACK → SYN-ACK
+ SYN → SYN-ACK → ACK
- SYN → SYN → ACK
! Klient SYN yuboradi, server SYN-ACK bilan javob beradi, klient ACK bilan tasdiqlaydi.

? Portga SYN yubordingiz va RST javobi keldi. Bu nimani anglatadi?
- Port ochiq
+ Port yopiq — kompyuter javob beryapti, lekin bu portda xizmat yo'q
- Firewall paketni to'sdi
- Kompyuter o'chiq
! RST — “bu yerda tinglovchi yo'q”. Ochiq port SYN-ACK qaytaradi; firewall esa odatda umuman javob bermaydi.

? Qaysi holatda UDP TCP dan afzal?
- Bank o'tkazmasi
- Fayl yuklab olish
+ Jonli videoqo'ng'iroq
- Elektron pochta jo'natish
! Jonli aloqada kechikish yo'qotishdan yomonroq: yo'qolgan kadrni qayta yuborishning ma'nosi yo'q.

? 3389-portda odatda qaysi xizmat ishlaydi?
- SSH
- MySQL
+ RDP — Windows masofaviy ish stoli
- SMB
! 3389 — RDP. SSH — 22, MySQL — 3306, SMB — 445.

? Skan natijasida 22, 80 va 445-portlar ochiq. Bu yerda qanday xizmatlar bo'lishi ehtimoli yuqori?
+ SSH, HTTP va SMB
- FTP, HTTPS va RDP
- DNS, SMTP va MySQL
- Telnet, HTTP va PostgreSQL
! 22 — SSH, 80 — HTTP, 445 — SMB. Lekin aniq bilish uchun versiya tekshiruvi (nmap -sV) kerak.

? Nega faqat port raqamiga qarab xizmatni aniq aytib bo'lmaydi?
- Chunki portlar har kuni o'zgaradi
+ Chunki har qanday xizmatni istalgan portda ishga tushirish mumkin
- Chunki port raqamlari shifrlangan
- Chunki bitta portda doim bir nechta xizmat ishlaydi
! Standart portlar — kelishuv. Administrator SSH ni 2222 ga, veb-serverni 8443 ga ko'chirishi mumkin.

? TCP haqida qaysi gaplar to'g'ri?
+ Ma'lumot yuborishdan oldin ulanish o'rnatadi
+ Yo'qolgan bo'laklarni qayta yuboradi
- UDP dan tezroq ishlaydi
- Handshake'siz ishlaydi
! TCP ishonchlilik uchun ulanish o'rnatadi va har bo'lakni tasdiqlaydi; buning narxi — tezlik.

? Windows'da tinglayotgan portlarni qaysi buyruq ko'rsatadi?
- ipconfig /all
+ netstat -ano
- arp -a
- ping localhost
! netstat -ano ulanishlar, tinglayotgan portlar va ularni ochgan jarayon PID'ini ko'rsatadi. Linux'dagi o'xshashi — ss -tulpn.
:::

:::cards
TCP handshake qadamlari? :: SYN → SYN-ACK → ACK.
TCP va UDP ning asosiy farqi? :: TCP — ulanish o'rnatadi, yetkazish va tartibni kafolatlaydi, sekinroq. UDP — ulanishsiz, kafolatsiz, tez.
22, 80, 443 portlari? :: 22 — SSH, 80 — HTTP, 443 — HTTPS.
21, 23, 25, 53 portlari? :: 21 — FTP, 23 — Telnet, 25 — SMTP, 53 — DNS.
445, 3306, 3389 portlari? :: 445 — SMB, 3306 — MySQL, 3389 — RDP.
SYN ga javoban SYN-ACK, RST va jimlik nimani bildiradi? :: SYN-ACK — port ochiq; RST — yopiq; jimlik — firewall filtrlagan.
Port raqamlari oralig'i va well-known portlar? :: 0–65535; 0–1023 — mashhur xizmatlar uchun.
SYN scan nima? :: SYN yuborib, SYN-ACK kelsa ulanishni tugatmasdan RST bilan uzadigan “yarim ochiq” skan (nmap -sS).
Tinglayotgan portlarni ko'rish buyruqlari? :: Windows: netstat -ano. Linux: ss -tulpn.
UDP nega DDoS da ishlatiladi? :: Ulanish o'rnatilmagani uchun manba IP ni soxtalashtirish oson — server javobni qurbonga yuboradi.
:::
