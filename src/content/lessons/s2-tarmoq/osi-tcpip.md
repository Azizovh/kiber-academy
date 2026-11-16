Xat yozdingiz. Uni konvertga soldingiz, manzil yozdingiz, pochtaga topshirdingiz. Pochta uni qopga, qopni mashinaga, mashinani samolyotga yukladi. Manzilda hammasi teskari tartibda ochildi. Sizga samolyot qanday uchishi qiziq emas, uchuvchiga esa xatingizda nima yozilgani.

Tarmoq ham aynan shunday ishlaydi: **qatlamlar** bilan. Har bir qatlam o'z ishini biladi va qo'shnisining ishiga aralashmaydi. Bu g'oyani tushunsangiz, har qanday tarmoq muammosini va hujumini "qaysi qatlamda?" degan savol bilan tartibga sola olasiz.

## Nega qatlamlar kerak

Tarmoq — juda murakkab tizim: elektr signallari, manzillar, yo'l tanlash, ishonchlilik, shifrlash, dasturlar. Hammasini bitta protokolga tiqishtirish imkonsiz bo'lardi.

Qatlamlarga bo'lish uch narsani beradi:

- **Mustaqillik.** Wi-Fi'dan simga o'tsangiz, brauzeringiz buni sezmaydi.
- **Almashtiriluvchanlik.** Bir qatlamdagi texnologiyani qolganlariga tegmasdan yangilash mumkin.
- **Tushunarlilik.** Muammoni qatlam-baqatlam tekshirish mumkin.

## OSI modeli: yetti qatlam

[[osi|OSI modeli]] — tarmoq aloqasini yetti qatlamga bo'lib tushuntiruvchi nazariy xarita. U haqiqiy tarmoqlarda aynan shu shaklda ishlatilmaydi, lekin butun soha u orqali gaplashadi: "bu 2-qatlam muammosi", "7-qatlam firewall'i".

| № | Qatlam | Nima qiladi | Ma'lumot birligi | Misollar |
|---|---|---|---|---|
| 7 | **Application** | Dasturlar uchun tarmoq xizmatlari | Ma'lumot | HTTP, DNS, SSH, FTP |
| 6 | **Presentation** | Format, kodlash, shifrlash | Ma'lumot | TLS, JPEG, UTF-8 |
| 5 | **Session** | Seanslarni ochish va yopish | Ma'lumot | Seans boshqaruvi |
| 4 | **Transport** | Dasturdan dasturgacha yetkazish, portlar | Segment | TCP, UDP |
| 3 | **Network** | Tarmoqlar orasida yo'l topish, IP manzil | Paket | IP, ICMP |
| 2 | **Data Link** | Bitta tarmoq ichida yetkazish, MAC manzil | Kadr (frame) | Ethernet, Wi-Fi, ARP |
| 1 | **Physical** | Bitlarni signal sifatida uzatish | Bit | Kabel, radioto'lqin |

Qatlamlar **pastdan yuqoriga** sanaladi: 1 — sim, 7 — dastur.

Tartibni yodlash uchun inglizcha ibora (pastdan yuqoriga): **P**lease **D**o **N**ot **T**hrow **S**ausage **P**izza **A**way — Physical, Data Link, Network, Transport, Session, Presentation, Application.

:::tip
Amalda eng ko'p tilga olinadigan to'rttasi: **2** (MAC, switch), **3** (IP, router), **4** (TCP/UDP, portlar) va **7** (HTTP, DNS). Avval shularni mustahkam eslab qoling — 5 va 6-qatlamlar kam ajratiladi.
:::

## TCP/IP modeli: amaldagi to'rt qatlam

Internet aslida soddaroq model bo'yicha ishlaydi — [[tcp-ip|TCP/IP modeli]]. U OSI ning bir nechta qatlamini birlashtiradi:

```
        OSI                      TCP/IP

  7  Application    ┐
  6  Presentation   ├──────►   Application     (HTTP, DNS, SSH, TLS)
  5  Session        ┘
  4  Transport      ────────►   Transport       (TCP, UDP)
  3  Network        ────────►   Internet        (IP, ICMP)
  2  Data Link      ┐
  1  Physical       ┴──────►   Link            (Ethernet, Wi-Fi, ARP)
```

Ikkalasini ham bilish kerak: **OSI** — gaplashish va tahlil uchun til, **TCP/IP** — haqiqatda ishlayotgan narsa.

## Inkapsulyatsiya: konvert ichida konvert

Endi eng muhim g'oya. Ma'lumot jo'natilganda u qatlamlardan **yuqoridan pastga** o'tadi va har bir qatlam unga o'z sarlavhasini (header) qo'shadi. Bu [[encapsulation|inkapsulyatsiya]] deyiladi.

Siz brauzerda sayt ochdingiz:

```
7  Application   [ HTTP so'rov: "GET /index.html" ]

4  Transport     [ TCP: port 51000 → 443 ][ HTTP so'rov ]
                 └────────── segment ──────────┘

3  Network       [ IP: 192.168.1.10 → 93.184.216.34 ][ TCP ][ HTTP ]
                 └──────────────── paket ─────────────────┘

2  Data Link     [ MAC: sizniki → router ][ IP ][ TCP ][ HTTP ][ tekshiruv ]
                 └──────────────────── kadr ─────────────────────┘

1  Physical      010110100101110100101...
```

Har bir qatlam yuqoridan kelgan narsani **ochmasdan**, shunchaki o'z konvertiga soladi:

- **Transport** qo'shadi: qaysi dasturdan qaysi dasturga (**portlar**).
- **Network** qo'shadi: qaysi kompyuterdan qaysi kompyuterga (**IP manzillar**).
- **Data Link** qo'shadi: shu tarmoq ichida keyingi qurilma kim (**MAC manzillar**).

Qabul qiluvchi tomonda hammasi teskari: har bir qatlam o'z sarlavhasini o'qib, olib tashlaydi va ichidagini yuqoriga uzatadi. Bu **dekapsulyatsiya**.

:::key
Uch xil manzil — uch xil savol: **Port** — qaysi dastur? **IP** — qaysi kompyuter? **MAC** — shu tarmoqdagi keyingi qadam kim? Paket internet bo'ylab sayohat qilganda IP manzillar **o'zgarmaydi**, MAC manzillar esa **har bir routerda almashadi**.
:::

## Qurilmalar va qatlamlar

Har bir tarmoq qurilmasi ma'lum qatlamgacha "o'qiydi":

| Qurilma | Qatlam | Nimaga qarab qaror qiladi |
|---|---|---|
| Kabel, hub | 1 | Hech narsaga — signalni uzatadi |
| Switch | 2 | MAC manzilga |
| Router | 3 | IP manzilga |
| Oddiy firewall | 3–4 | IP manzil va portga |
| Web application firewall (WAF) | 7 | HTTP so'rov mazmuniga |

Shuning uchun "bu 3-qatlam qurilmasi" degan gap nimani anglatishini endi bilasiz.

## Hujumlar ham qatlamlarga bo'linadi

Bu model xavfsizlikda shunchaki nazariya emas — u hujumlarni tasniflash va himoyani rejalashtirish uchun ishlatiladi.

| Qatlam | Hujum misoli | Himoya misoli |
|---|---|---|
| 7 Application | SQL injection, phishing | WAF, xavfsiz kod |
| 4 Transport | Port skanerlash, SYN flood | Firewall, tezlikni cheklash |
| 3 Network | IP spoofing, marshrutni o'g'irlash | Filtrlash, segmentatsiya |
| 2 Data Link | ARP spoofing, MAC flooding | Switch himoya funksiyalari |
| 1 Physical | Kabelga ulanish, signalni bo'g'ish | Jismoniy himoya |

Hazilomuz, lekin jiddiy qo'shimcha: mutaxassislar **"8-qatlam"** haqida ham gapiradi — bu inson. Eng ko'p muvaffaqiyatli hujumlar aynan shu qatlamga qaratilgan.

## Muammoni qatlam bo'yicha qidirish

"Internet ishlamayapti" degan shikoyatni tajribali odam pastdan yuqoriga tekshiradi:

1. **Physical:** kabel ulanganmi, Wi-Fi yoqilganmi?
2. **Data Link:** tarmoqqa ulandimi?
3. **Network:** IP manzil oldimi? Routerga `ping` boryaptimi?
4. **Transport:** kerakli port ochiqmi?
5. **Application:** DNS ishlayaptimi? Sayt o'zi ishlayaptimi?

Bu tartib sizni tasodifiy urinishlardan qutqaradi.

## Xulosa

- Tarmoq **qatlamlarga** bo'lingan; har biri o'z vazifasini bajaradi.
- **OSI** — 7 qatlam: Physical, Data Link, Network, Transport, Session, Presentation, Application.
- **TCP/IP** — amaldagi 4 qatlam: Link, Internet, Transport, Application.
- **Inkapsulyatsiya**: har qatlam o'z sarlavhasini qo'shadi. Segment → paket → kadr.
- **Port** — dastur, **IP** — kompyuter, **MAC** — lokal tarmoqdagi keyingi qadam.
- Switch — 2-qatlam, router — 3-qatlam.
- Hujum va himoya ham qatlamlar bo'yicha tasniflanadi.

:::quiz
? Router OSI modelining qaysi qatlamida ishlaydi?
- 2-qatlam (Data Link)
+ 3-qatlam (Network)
- 4-qatlam (Transport)
- 7-qatlam (Application)
! Router IP manzilga qarab yo'l tanlaydi — bu Network qatlami. Switch esa MAC manzil bilan ishlaydi — 2-qatlam.

? TCP va UDP qaysi qatlamga tegishli?
- Network
+ Transport
- Application
- Data Link
! Transport qatlami dasturdan dasturgacha yetkazish va portlar uchun javob beradi. Uning ikki asosiy protokoli — TCP va UDP.

? Inkapsulyatsiya nima?
- Ma'lumotni shifrlash
- Paketni kichik bo'laklarga bo'lish
+ Har bir qatlam yuqoridan kelgan ma'lumotga o'z sarlavhasini qo'shib, pastga uzatishi
- Ma'lumotni siqish
! Ma'lumot pastga tushgan sari har qatlam o'z “konvertini” qo'shadi: segment, keyin paket, keyin kadr.

? Paket bir necha router orqali internetdan o'tayotganda nima o'zgaradi?
- Manba va manzil IP manzillari
+ MAC manzillar — har bir tarmoq bo'lagida yangilanadi
- Portlar
- Hech narsa o'zgarmaydi
! IP manzillar yo'l davomida saqlanadi (NAT bundan mustasno). MAC manzillar esa faqat bitta lokal bo'lak ichida amal qiladi va har routerda almashadi.

? Network qatlamidagi ma'lumot birligi nima deb ataladi?
- Kadr (frame)
- Segment
+ Paket (packet)
- Bit
! 4-qatlam — segment, 3-qatlam — paket, 2-qatlam — kadr, 1-qatlam — bit.

? ARP spoofing hujumi qaysi qatlamda sodir bo'ladi?
- 7-qatlam
- 4-qatlam
- 3-qatlam
+ 2-qatlam
! ARP MAC manzillar bilan ishlaydi — bu Data Link qatlami. Shuning uchun bu hujum faqat bitta lokal tarmoq ichida mumkin.

? HTTP, DNS va SSH qaysi OSI qatlamiga kiradi?
+ Application (7)
- Transport (4)
- Network (3)
- Session (5)
! Bular dasturlar bevosita ishlatadigan protokollar — Application qatlami.

? TCP/IP modelining OSI dan farqi nimada?
- TCP/IP da qatlamlar ko'proq
+ TCP/IP 4 qatlamli va internet amalda shu model bo'yicha ishlaydi
- TCP/IP faqat simsiz tarmoqlar uchun
- Ular orasida farq yo'q
! OSI — 7 qatlamli nazariy model. TCP/IP uning yuqori uch qatlamini bitta Application ga, pastki ikkitasini Link ga birlashtiradi.
:::

:::cards
OSI ning 7 qatlami (pastdan yuqoriga)? :: Physical, Data Link, Network, Transport, Session, Presentation, Application.
TCP/IP modelining 4 qatlami? :: Link, Internet, Transport, Application.
Inkapsulyatsiya nima? :: Har bir qatlam yuqoridan kelgan ma'lumotga o'z sarlavhasini qo'shib, pastga uzatishi.
2, 3 va 4-qatlamlarda ma'lumot birligi nima deyiladi? :: 2 — kadr (frame), 3 — paket, 4 — segment.
Port, IP va MAC manzil qaysi savolga javob beradi? :: Port — qaysi dastur; IP — qaysi kompyuter; MAC — lokal tarmoqdagi keyingi qurilma.
Switch va router qaysi qatlamda ishlaydi? :: Switch — 2 (MAC manzil), router — 3 (IP manzil).
IP, TCP va HTTP qaysi OSI qatlamlarida? :: IP — 3 (Network), TCP — 4 (Transport), HTTP — 7 (Application).
Tarmoq muammosi qanday tartibda tekshiriladi? :: Pastdan yuqoriga: jismoniy ulanish → tarmoqqa ulanish → IP va ping → port → dastur (DNS, xizmat).
:::
