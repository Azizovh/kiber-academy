Shu paytgacha paketlar, sarlavhalar, handshake haqida **o'qidingiz**. Endi ularni **ko'rasiz**. Wireshark — tarmoq orqali o'tayotgan har bir paketni ushlab, qatlam-baqatlam ochib ko'rsatadigan dastur. Bu — tarmoq uchun mikroskop.

Bu darsdan keyin "Telnet parolni ochiq uzatadi" degan gap siz uchun nazariya bo'lmay qoladi: parolni o'z ekraningizda ko'rasiz.

## Wireshark nima va kim ishlatadi

[[wireshark|Wireshark]] — bepul, ochiq kodli **paket analizatori** (sniffer). U tarmoq kartasidan o'tayotgan trafikni yozib oladi va tahlil qilish imkonini beradi.

| Kim | Nima uchun |
|---|---|
| Tarmoq muhandisi | Nega sekin? Qayerda uzilyapti? |
| SOC analitigi | Bu kompyuter nima bilan va nima haqida gaplashyapti? |
| Insident tergovchisi | Hujumchi nimani yuklab oldi, nimani olib chiqdi? |
| Pentester | Tarmoqda ochiq uzatilayotgan parol bormi? |
| Malware analitigi | Zararli dastur qayerga ulanyapti? |

Ushlangan trafik fayl sifatida saqlanadi — [[pcap|PCAP]] (`.pcap`, `.pcapng`). CTF va Blue Team mashqlarining katta qismi shunday: sizga PCAP fayl beriladi va "nima sodir bo'lgan?" deb so'raladi.

:::warn
Faqat **o'zingizning** trafigingizni yoki ruxsat berilgan tarmoqni tinglang. Begona tarmoqdagi boshqa odamlar trafigini ushlash — shaxsiy hayotga tajovuz va qonunbuzarlik. Mashq uchun tayyor PCAP fayllar yetarli — manbalarda bor.
:::

## O'rnatish va birinchi ushlash

- **Kali Linux'da** allaqachon o'rnatilgan: terminalda `wireshark`.
- **Windows'da:** `wireshark.org` dan yuklab oling. O'rnatish paytida **Npcap** ni ham o'rnatishga rozi bo'ling — usiz paket ushlanmaydi.

Ishga tushirganda interfeyslar ro'yxati chiqadi. Yonida "yurak urishi" chizig'i harakatlanayotgani — trafik o'tayotgan interfeys (odatda Wi-Fi yoki Ethernet). Uni ikki marta bosing — ushlash boshlanadi.

Bir necha soniyada yuzlab paket to'planadi. To'xtatish — qizil kvadrat tugma.

Qo'rqmang: bu oqim dastlab hammani dovdiratadi. Sir — **filtrlash**da.

## Oyna tuzilishi

```
┌──────────────────────────────────────────────────────────────────┐
│ Filtr satri:  [ http                                         ]   │
├──────────────────────────────────────────────────────────────────┤
│ 1. PAKETLAR RO'YXATI                                             │
│ No.  Time     Source         Destination     Protocol  Info      │
│ 12   0.4521   192.168.1.10   93.184.216.34   TCP       51000→80  │
│ 13   0.4788   93.184.216.34  192.168.1.10    TCP       80→51000  │
│ 15   0.4801   192.168.1.10   93.184.216.34   HTTP      GET /     │
├──────────────────────────────────────────────────────────────────┤
│ 2. PAKET TAFSILOTLARI (qatlamlar bo'yicha)                       │
│ ▸ Frame 15: 432 bytes on wire                                    │
│ ▸ Ethernet II, Src: 08:00:27:4e:66:a1, Dst: 52:54:00:12:35:02    │
│ ▸ Internet Protocol Version 4, Src: 192.168.1.10, Dst: 93.184... │
│ ▸ Transmission Control Protocol, Src Port: 51000, Dst Port: 80   │
│ ▸ Hypertext Transfer Protocol                                    │
├──────────────────────────────────────────────────────────────────┤
│ 3. BAYTLAR (hex va ASCII)                                        │
│ 0000  52 54 00 12 35 02 08 00 27 4e 66 a1 08 00 45 00   RT..5... │
└──────────────────────────────────────────────────────────────────┘
```

O'rta panelga diqqat qiling. Bu — **OSI darsidagi inkapsulyatsiya**, endi jonli ko'rinishda:

| Wireshark'dagi qator | Qatlam | Nima bor |
|---|---|---|
| Frame | 1 | Paket haqida umumiy ma'lumot |
| Ethernet II | 2 | MAC manzillar |
| Internet Protocol | 3 | IP manzillar, TTL |
| Transmission Control Protocol | 4 | Portlar, bayroqlar (SYN, ACK…) |
| Hypertext Transfer Protocol | 7 | So'rovning o'zi |

Har bir qatorni ochsangiz, sarlavhaning barcha maydonlari chiqadi. Maydonni bosganingizda pastki panelda unga mos baytlar belgilanadi — hex darsida o'rgangan narsangiz.

## Filtrlar — eng muhim ko'nikma

Wireshark'da ikki xil filtr bor. Ularni adashtirmang:

- **Capture filter** — ushlashdan *oldin*: nimani yozib olish. Sintaksisi boshqacha (`port 80`, `host 10.0.0.5`).
- **Display filter** — ushlashdan *keyin*: yozilganlardan nimani ko'rsatish. Asosan shu ishlatiladi.

Display filter yuqoridagi satrga yoziladi. To'g'ri yozilsa satr **yashil**, xato bo'lsa — **qizil** bo'ladi.

### Eng kerakli filtrlar

| Filtr | Nimani ko'rsatadi |
|---|---|
| `http` | Faqat HTTP |
| `dns` | Faqat DNS |
| `tcp`, `udp`, `icmp`, `arp` | Shu protokol |
| `ip.addr == 10.10.10.5` | Shu IP qatnashgan hamma paket |
| `ip.src == 10.10.10.5` | Shu IP **dan** chiqqan |
| `ip.dst == 10.10.10.5` | Shu IP **ga** ketgan |
| `tcp.port == 443` | Shu port (manba yoki manzil) |
| `tcp.dstport == 22` | Manzil porti 22 |
| `http.request.method == "POST"` | Faqat POST so'rovlar |
| `http.response.code == 404` | Faqat 404 javoblar |
| `dns.qry.name contains "example"` | Nomida shu so'z bor DNS so'rovlar |
| `tcp.flags.syn == 1 && tcp.flags.ack == 0` | Faqat boshlang'ich SYN paketlar |
| `frame contains "password"` | Ichida shu matn uchraydigan paketlar |

Mantiqiy amallar:

| Belgi | Ma'nosi | Misol |
|---|---|---|
| `&&` yoki `and` | Va | `ip.addr == 10.0.0.5 && http` |
| `\|\|` yoki `or` | Yoki | `dns \|\| http` |
| `!` yoki `not` | Emas | `!arp` |

:::tip
Filtr sintaksisini yodlash shart emas. Paket tafsilotlarida istalgan maydonga **o'ng tugma → Apply as Filter → Selected** — Wireshark filtrni o'zi yozib beradi. Shu yo'l bilan sintaksisni tabiiy o'rganasiz.
:::

## Follow Stream — suhbatni to'liq o'qish

Bitta veb-sahifa yuklanishi o'nlab paketga bo'linadi. Ularni birma-bir o'qish — azob. **Follow Stream** bitta TCP ulanishidagi barcha paketlarni yig'ib, butun suhbatni matn sifatida ko'rsatadi.

Istalgan paketga **o'ng tugma → Follow → TCP Stream** (yoki **HTTP Stream**).

Shifrlanmagan HTTP login uchun natija shunday ko'rinadi (qizil — klient, ko'k — server):

```
POST /login HTTP/1.1
Host: testsayt.lab
Content-Type: application/x-www-form-urlencoded

username=ali&password=Bahor2026!

HTTP/1.1 302 Found
Set-Cookie: session=9f8e7d6c5b4a
Location: /dashboard
```

Parol ham, sessiya cookie'si ham — ochiq. "HTTP shifrlanmagan" degan jumla mana shuni anglatadi.

## Trafikda nimalarni ko'rasiz

### TCP handshake

`tcp.port == 80` filtri bilan ulanish boshini toping:

```
192.168.1.10 → 93.184.216.34   TCP   51000 → 80  [SYN]
93.184.216.34 → 192.168.1.10   TCP   80 → 51000  [SYN, ACK]
192.168.1.10 → 93.184.216.34   TCP   51000 → 80  [ACK]
```

TCP darsidagi sxema — aynan o'zi.

### DNS

`dns` filtri: har bir sayt ochilishidan oldin so'rov (`Standard query A example.com`) va javob (`Standard query response A 93.184.216.34`). Kompyuter qaysi nomlarni so'rayotgani — u nima bilan gaplashmoqchi ekanini aytib beradi.

### HTTPS

`tls` filtri: handshake ko'rinadi (`Client Hello`, `Server Hello`), keyin esa faqat `Application Data` — **o'qib bo'lmaydigan shifrlangan baytlar**.

Lekin `Client Hello` ichida bitta qiziq maydon bor: **Server Name Indication (SNI)** — ulanilayotgan sayt nomi, ochiq holda. HTTP darsida "kuzatuvchi domen nomini ko'radi" deganimiz shu.

### Port skanerlash

Bitta manbadan qisqa vaqtda ko'plab turli portlarga SYN, javobiga asosan RST — bu skanerlash izi. Filtr: `tcp.flags.syn == 1 && tcp.flags.ack == 0`.

## Foydali menyular

| Menyu | Nima beradi |
|---|---|
| **Statistics → Protocol Hierarchy** | Trafik qaysi protokollardan iborat — umumiy manzara |
| **Statistics → Conversations** | Kim kim bilan qancha gaplashgan |
| **Statistics → Endpoints** | Qatnashgan barcha manzillar |
| **File → Export Objects → HTTP** | HTTP orqali uzatilgan fayllarni ajratib olish |
| **Edit → Find Packet** (`Ctrl+F`) | Paketlar ichidan matn qidirish |

Notanish PCAP faylni ochganda tartib shunday:

1. **Protocol Hierarchy** — bu yerda umuman nima bor?
2. **Conversations** — eng ko'p kim gaplashgan?
3. Qiziq juftlikni filtrlash → **Follow Stream**.
4. Fayl uzatilgan bo'lsa → **Export Objects**.

:::key
Tahlilning oltin qoidasi: **avval umumiy manzara, keyin tafsilot.** Birinchi paketdan boshlab ketma-ket o'qishga urinmang — minglab paket ichida yo'qolib qolasiz. Savol bering ("kim eng ko'p trafik yuborgan?", "qanday fayllar yuklangan?") va javobni filtr bilan toping.
:::

## Terminalda: tcpdump

Serverlarda grafik oyna yo'q. U yerda `tcpdump` ishlatiladi — Wireshark'ning buyruq satridagi "akasi":

```bash
sudo tcpdump -i eth0                        # eth0 dagi hamma trafik
sudo tcpdump -i eth0 port 80                # faqat 80-port
sudo tcpdump -i eth0 host 10.10.10.5        # faqat shu manzil
sudo tcpdump -i eth0 -w ushlangan.pcap      # faylga yozish
sudo tcpdump -r ushlangan.pcap              # fayldan o'qish
```

Odatiy ish tartibi: serverda `tcpdump -w` bilan yozib olinadi, fayl o'z kompyuteringizga ko'chiriladi va Wireshark'da tahlil qilinadi.

:::try
Birinchi tahlilingiz. Wireshark o'rnatilgan bo'lishi kerak.

1. Ushlashni boshlang.
2. Terminalda `ping 8.8.8.8` va `nslookup example.com` ni bajaring.
3. Brauzerda `http://neverssl.com` ni oching — bu ataylab shifrlanmagan (HTTP) qoldirilgan sinov sayti.
4. Ushlashni to'xtating.

Endi toping:

- `icmp` filtri — ping so'rov va javoblari. Nechta juftlik?
- `dns` filtri — `example.com` uchun so'rov va javobdagi IP manzil.
- `http` filtri — GET so'rovi. **Follow → HTTP Stream** bilan butun sahifani o'qing.
- `tls` filtri — istalgan `Client Hello` ni ochib, ichidan **Server Name** maydonini toping.
:::

## Xulosa

- **Wireshark** paketlarni ushlaydi va qatlamlar bo'yicha ochib ko'rsatadi; trafik **PCAP** faylda saqlanadi.
- Uch panel: paketlar ro'yxati, tafsilotlar (qatlamlar), baytlar.
- **Display filter** — asosiy vosita: `http`, `dns`, `ip.addr == X`, `tcp.port == N`.
- **Follow Stream** butun suhbatni yig'ib beradi.
- Shifrlanmagan protokollarda parol va cookie ochiq ko'rinadi; HTTPS da — faqat kim bilan gaplashilayotgani.
- Tahlil tartibi: Protocol Hierarchy → Conversations → filtr → Follow Stream → Export Objects.
- Serverlarda — **tcpdump**.
- Faqat o'z trafigingizni yoki ruxsat berilgan tarmoqni tinglang.

:::quiz
? Faqat `10.10.10.5` manzilidan CHIQQAN paketlarni ko'rsatadigan display filter qaysi?
- ip.addr == 10.10.10.5
+ ip.src == 10.10.10.5
- ip.dst == 10.10.10.5
- host 10.10.10.5
! ip.src — manba manzili. ip.addr manba yoki manzil bo'lgan hamma paketni ko'rsatadi; `host ...` esa capture filter sintaksisi.

? Follow TCP Stream nima qiladi?
- Paketlarni o'chirib tashlaydi
+ Bitta ulanishdagi barcha paketlarni yig'ib, suhbatni to'liq matn sifatida ko'rsatadi
- Trafikni shifrlaydi
- Yangi ushlashni boshlaydi
! U bo'lak-bo'lak kelgan ma'lumotni tartib bilan birlashtiradi — so'rov va javobni butunligicha o'qish mumkin.

? HTTPS trafigini Wireshark'da ushlaganingizda nimani ko'ra olasiz?
- Parol va cookie'larni ochiq holda
- Sahifaning to'liq HTML kodini
+ Kim bilan gaplashilayotganini (IP, odatda sayt nomi), lekin mazmunni emas
- Hech narsani — HTTPS paketlari ushlanmaydi
! Mazmun shifrlangan. Lekin IP manzillar, vaqt, hajm va TLS handshake'dagi server nomi (SNI) ko'rinadi.

? Notanish PCAP faylni tahlil qilishni nimadan boshlash to'g'ri?
- Birinchi paketdan boshlab hammasini ketma-ket o'qishdan
+ Statistics → Protocol Hierarchy va Conversations orqali umumiy manzarani ko'rishdan
- Barcha paketlarni o'chirishdan
- Faylni nomini o'zgartirishdan
! Avval umumiy manzara: qanday protokollar bor, kim kim bilan gaplashgan. Keyin qiziq joy filtr bilan ajratiladi.

? Trafikda bitta manzildan bir necha soniya ichida yuzlab turli portlarga SYN paketlari ketganini ko'rdingiz. Bu nima?
- Oddiy veb-sahifa yuklanishi
- DNS so'rovlari
+ Port skanerlash
- Fayl yuklab olish
! Ko'p portga ketma-ket SYN — skanerning izi. Oddiy trafikda klient bir nechta ma'lum portga ulanadi, xolos.

? Display filter va capture filter farqi nima?
- Farqi yo'q
+ Capture filter nimani yozib olishni belgilaydi; display filter yozilganlardan nimani ko'rsatishni
- Display filter faqat Linux'da ishlaydi
- Capture filter trafikni shifrlaydi
! Capture filter ushlashdan oldin qo'llanadi va sintaksisi boshqa. Display filter keyin qo'llanadi va uni istalgancha o'zgartirish mumkin.

? HTTP orqali yuklab olingan faylni PCAP dan qanday ajratib olinadi?
+ File → Export Objects → HTTP
- Statistics → Endpoints
- Edit → Preferences
- Faylni qayta nomlash orqali
! Export Objects HTTP orqali uzatilgan barcha fayllarni ro'yxat qilib, saqlash imkonini beradi.

? Grafik interfeysi yo'q serverda trafik qaysi vosita bilan ushlanadi?
- Wireshark
+ tcpdump
- nslookup
- ipconfig
! tcpdump — buyruq satrida ishlaydigan paket ushlagich. `-w` bilan faylga yozib, keyin Wireshark'da tahlil qilinadi.

? Wireshark'dagi paket tafsilotlari panelida “Ethernet II” qatorida nima ko'rinadi?
- IP manzillar
- Portlar
+ MAC manzillar
- HTTP sarlavhalari
! Ethernet — 2-qatlam. IP manzillar “Internet Protocol”, portlar “Transmission Control Protocol” qatorida.
:::

:::cards
Wireshark nima? :: Tarmoq paketlarini ushlab, qatlamlar bo'yicha tahlil qilish imkonini beruvchi dastur (paket analizatori).
PCAP nima? :: Ushlab olingan tarmoq paketlari saqlanadigan fayl formati (.pcap, .pcapng).
Bitta IP qatnashgan barcha paketlar filtri? :: ip.addr == 10.10.10.5 (faqat manba: ip.src, faqat manzil: ip.dst).
Port bo'yicha filtr? :: tcp.port == 443 (yoki udp.port, tcp.dstport).
Follow Stream nima uchun? :: Bitta ulanishdagi barcha paketlarni yig'ib, butun suhbatni matn sifatida o'qish uchun.
PCAP tahlili qaysi tartibda? :: Protocol Hierarchy → Conversations → filtr → Follow Stream → Export Objects.
HTTPS trafigida nima ko'rinadi, nima ko'rinmaydi? :: Ko'rinadi: IP manzillar, sayt nomi (SNI), vaqt va hajm. Ko'rinmaydi: URL yo'li, sarlavhalar, mazmun.
tcpdump nima? :: Buyruq satrida ishlaydigan paket ushlagich: sudo tcpdump -i eth0 -w fayl.pcap
Faqat boshlang'ich SYN paketlar filtri? :: tcp.flags.syn == 1 && tcp.flags.ack == 0
HTTP orqali uzatilgan fayllarni qanday olinadi? :: File → Export Objects → HTTP.
:::
