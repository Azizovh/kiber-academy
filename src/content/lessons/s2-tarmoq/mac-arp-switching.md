Kafedagi bepul Wi-Fi'ga ulandingiz. Yon stolda o'tirgan odam bir necha buyruq yozdi — va endi sizning barcha trafigingiz internetga chiqishdan oldin uning noutbuki orqali o'tyapti. U hech qanday parolni buzmadi, hech qanday zaiflikdan foydalanmadi. U shunchaki lokal tarmoq qanday ishlashini biladi.

Bu darsda siz ham bilib olasiz — va nega bunga yo'l qo'yilganini tushunasiz.

## Ikki xil manzil nega kerak

Oldingi darsda IP manzilni o'rgandingiz. Lekin lokal tarmoq ichida qurilmalar bir-birini IP bilan emas, boshqa manzil bilan topadi.

[[mac-address|MAC manzil]] — tarmoq kartasiga ishlab chiqaruvchi tomonidan yozilgan 6 baytli apparat manzili:

```
00:1A:2B:3C:4D:5E
└──┬───┘ └──┬───┘
ishlab      qurilmaning
chiqaruvchi tartib raqami
```

Birinchi uch bayt — ishlab chiqaruvchi kodi (OUI). Undan qurilma kimniki ekanini bilish mumkin: Apple, Samsung, Cisco. Razvedkada bu foydali: tarmoqdagi notanish qurilma printer, kamera yoki telefon ekanini taxmin qilsa bo'ladi.

| | IP manzil | MAC manzil |
|---|---|---|
| Qatlam | 3 (Network) | 2 (Data Link) |
| Kim beradi | Tarmoq (DHCP yoki qo'lda) | Ishlab chiqaruvchi |
| O'zgaradimi | Ha — har tarmoqda yangisi | Odatda yo'q (lekin soxtalashtirish oson) |
| Qayerda amal qiladi | Butun internetda | Faqat bitta lokal tarmoq ichida |
| O'xshatish | Pochta manzili | Pasport raqami |

Nega ikkalasi kerak? IP — **yakuniy manzil**: xat qaysi shahar, qaysi uyga. MAC — **keyingi qadam**: xatni hozir aynan kimning qo'liga topshirish kerak. Paket internet bo'ylab o'tganda IP manzili o'zgarmaydi, MAC esa har bir bo'lakda yangilanadi.

## Switch qanday ishlaydi

[[switch|Switch]] — lokal tarmoqning markazi. Uning vazifasi: kelgan [[frame|kadrni]] faqat kerakli portga yuborish.

Buning uchun u **MAC jadvali** yuritadi va uni o'zi o'rganadi:

1. Kadr keldi. Switch **manba** MAC manzilga qaraydi: "3-portdan `AA:AA` kelyapti — demak `AA:AA` 3-portda". Jadvalga yozadi.
2. **Manzil** MAC ga qaraydi. Jadvalda bormi?
   - **Bor** → faqat o'sha portga yuboradi.
   - **Yo'q** → hamma portga yuboradi (flooding) va javob kelishini kutadi.

| MAC manzil | Port |
|---|---|
| AA:AA:AA:AA:AA:AA | 3 |
| BB:BB:BB:BB:BB:BB | 7 |
| CC:CC:CC:CC:CC:CC | 12 |

Natija: sog'lom tarmoqda siz faqat **o'zingizga** yuborilgan trafikni ko'rasiz. Qo'shni kompyuterning suhbatini eshitib bo'lmaydi.

Maxsus manzil: `FF:FF:FF:FF:FF:FF` — **broadcast**. Unga yuborilgan kadr tarmoqdagi hammaga boradi.

## ARP: "bu IP kimniki?"

Kompyuteringiz `192.168.1.20` ga paket yubormoqchi. IP ni biladi, lekin kadr yasash uchun **MAC** kerak. Qayerdan oladi?

[[arp|ARP]] (Address Resolution Protocol) aynan shu savolga javob beradi.

```
1. Siz (hammaga, broadcast):
   "192.168.1.20 kimda? 192.168.1.10 ga ayting."

2. 192.168.1.20 (faqat sizga):
   "Menda. Mening MAC manzilim BB:BB:BB:BB:BB:BB."

3. Siz javobni ARP keshiga yozib qo'yasiz va paketni yuborasiz.
```

Javob bir necha daqiqa **ARP keshi**da saqlanadi — har safar so'ramaslik uchun.

O'z keshingizni ko'rish (Windows va Linux'da bir xil):

```
arp -a
```

### Manzil boshqa tarmoqda bo'lsa

`8.8.8.8` ga paket yuboryapsiz. U sizning tarmog'ingizda emas, ARP so'rovi unga yetib bormaydi. Shuning uchun kompyuter boshqacha ish tutadi: **gateway**ning (routerning) MAC manzilini so'raydi.

Kadr shunday ko'rinadi:

```
MAC:  sizniki  →  router            ← keyingi qadam
IP:   192.168.1.10  →  8.8.8.8      ← yakuniy manzil
```

Router kadrni ochadi, IP ga qaraydi, yangi kadr yasaydi (o'z MAC manzili → keyingi router) va uzatadi. OSI darsidagi "IP o'zgarmaydi, MAC har bo'lakda almashadi" degan gap — mana shu.

## ARP ning tug'ma kamchiligi

ARP 1980-yillarda, tarmoqdagi hamma bir-biriga ishongan davrda yaratilgan. Unda **hech qanday tekshiruv yo'q**:

- Javob bergan qurilma haqiqatan o'sha IP egasimi — tekshirilmaydi.
- Hech kim so'ramagan bo'lsa ham, yuborilgan "javob" qabul qilinadi va keshga yoziladi.

Bundan kelib chiqadigan hujum — **ARP spoofing** (yoki ARP poisoning):

```
Odatda:      Jabrlanuvchi ───────────────► Router ───► Internet

Hujumdan     Jabrlanuvchi ──► Hujumchi ──► Router ───► Internet
keyin:
```

Hujumchi ikki tomonga soxta ARP javoblari yuboradi:

- Jabrlanuvchiga: "Router — bu men" (router IP si + hujumchi MAC i).
- Routerga: "Jabrlanuvchi — bu men".

Ikkalasi ham keshini yangilaydi. Endi butun trafik hujumchi orqali o'tadi. Bu — klassik [[mitm|Man-in-the-Middle]]: u trafikni o'qishi, o'zgartirishi yoki shunchaki o'tkazib yuborib, sezdirmasligi mumkin.

:::warn
ARP spoofing — haqiqiy tarmoqda ruxsatsiz bajarilsa jinoyat. Uni faqat o'z laboratoriyangizda, o'z virtual mashinalaringiz orasida sinab ko'ring. Pentest yo'nalishida bu alohida amaliy mavzu.
:::

### Bu hujumdan nima himoya qiladi

| Himoya | Qanday yordam beradi |
|---|---|
| **Shifrlash (HTTPS, VPN, SSH)** | Hujumchi trafikni ko'radi, lekin o'qiy olmaydi. Eng muhim himoya |
| **Dynamic ARP Inspection** | Boshqariladigan switch soxta ARP javoblarini tashlab yuboradi |
| **Tarmoqni segmentlash** | ARP faqat bitta tarmoq ichida ishlaydi — hujum doirasi torayadi |
| **Monitoring** | Bitta MAC manzil bir necha IP ga da'vo qilsa — signal |

Birinchi qatorga e'tibor bering. Bugun veb-trafikning ko'pi HTTPS bilan shifrlangan, shuning uchun kafedagi hujumchi parolingizni to'g'ridan-to'g'ri ko'ra olmaydi. Lekin u qaysi saytlarga kirayotganingizni ko'radi va sizni soxta sahifaga yo'naltirishga urinishi mumkin. Shuning uchun **brauzerning sertifikat ogohlantirishini hech qachon e'tiborsiz qoldirmang** — ayniqsa ochiq tarmoqda.

## Boshqa 2-qatlam hujumlari

**MAC flooding.** Switch'ning MAC jadvali cheklangan. Hujumchi minglab soxta MAC manzilli kadrlar yuborib, jadvalni to'ldiradi. To'lgan switch yangi manzillarni eslab qola olmaydi va kadrlarni hamma portga yubora boshlaydi — ya'ni hammaning trafigi hammaga ko'rinadi. Himoya: **port security** (har portga cheklangan sondagi MAC).

**MAC spoofing.** MAC manzilni dasturiy o'zgartirish bir buyruq bilan bajariladi. Demak, "faqat ruxsat etilgan MAC manzillar ulanadi" degan Wi-Fi filtri **jiddiy himoya emas**: hujumchi ruxsat etilgan qurilmaning manzilini efirdan ko'rib, o'zinikiga qo'yib oladi.

:::key
Lokal tarmoq **ishonch asosida** qurilgan. Shuning uchun xavfsizlikda muhim tamoyil: "tarmoq ichida — demak ishonchli" degan fikr noto'g'ri. Hujumchi bitta kompyuterni egallab, lokal tarmoqqa kirishi bilan uning imkoniyatlari keskin kengayadi.
:::

:::try
O'z ARP keshingizni ko'ring. CMD yoki terminalda:

```
arp -a
```

Ro'yxatdan routeringiz IP manzilini (gateway) va uning MAC manzilini toping. Birinchi uch baytni internetda "MAC vendor lookup" deb qidirib, routeringiz ishlab chiqaruvchisini aniqlang.

Windows'da o'z MAC manzilingiz: `ipconfig /all` → **Physical Address**. Linux'da: `ip link`.
:::

## Xulosa

- **MAC manzil** — 6 bayt, tarmoq kartasiga yozilgan, faqat lokal tarmoqda amal qiladi.
- **IP** — yakuniy manzil; **MAC** — keyingi qadam.
- **Switch** MAC jadvalini o'zi o'rganadi va kadrni faqat kerakli portga yuboradi.
- **ARP** IP bo'yicha MAC ni topadi; javoblar keshda saqlanadi.
- ARP da tekshiruv yo'q → **ARP spoofing** → Man-in-the-Middle.
- Asosiy himoya — **shifrlash**; qo'shimcha: Dynamic ARP Inspection, segmentatsiya.
- MAC manzilni soxtalashtirish oson — MAC filtri himoya emas.

:::quiz
? ARP protokoli nima vazifani bajaradi?
- Domen nomini IP manzilga aylantiradi
+ IP manzil bo'yicha MAC manzilni topadi
- Qurilmalarga IP manzil tarqatadi
- Trafikni shifrlaydi
! ARP lokal tarmoqda “bu IP kimda?” deb so'raydi va javoban MAC manzilni oladi. Nomni IP ga aylantirish — DNS ning ishi.

? Kompyuteringiz internetdagi 8.8.8.8 ga paket yuboryapti. Kadrdagi manzil MAC kimniki bo'ladi?
- 8.8.8.8 serverining MAC manzili
+ Default gateway'ning (routerning) MAC manzili
- Broadcast manzil FF:FF:FF:FF:FF:FF
- Kompyuterning o'z MAC manzili
! Manzil boshqa tarmoqda, shuning uchun kadr routerga topshiriladi. IP manzil esa 8.8.8.8 bo'lib qoladi.

? ARP spoofing nega mumkin?
- Chunki switch'lar sekin ishlaydi
+ Chunki ARP javoblarining haqiqiyligi hech qanday tekshirilmaydi
- Chunki MAC manzillar shifrlanmagan
- Chunki IP manzillar yetishmaydi
! ARP ishonchga qurilgan: har qanday qurilma “bu IP meniki” deb javob yuborishi mumkin va u qabul qilinadi.

? ARP spoofing hujumidan trafik mazmunini himoya qiluvchi eng muhim chora qaysi?
- MAC manzil filtri
- Kuchli Wi-Fi paroli
+ Trafikni shifrlash (HTTPS, VPN)
- Kompyuter nomini o'zgartirish
! Hujumchi o'rtaga tushishi mumkin, lekin shifrlangan trafikni o'qiy olmaydi. Qolganlari bu hujumni to'xtatmaydi.

? Wi-Fi tarmog'ida “faqat ruxsat etilgan MAC manzillar” filtri yoqilgan. Bu qanchalik ishonchli?
- Juda ishonchli — MAC manzilni o'zgartirib bo'lmaydi
+ Zaif — MAC manzilni dasturiy o'zgartirish oson
- Bu parolning o'rnini to'liq bosadi
- U faqat simli tarmoqda ishlaydi
! MAC manzil efirda ochiq ko'rinadi va bir buyruq bilan soxtalashtiriladi. Filtr jiddiy to'siq emas.

? Switch MAC jadvalini qanday to'ldiradi?
- Administrator har bir manzilni qo'lda kiritadi
+ Kelgan kadrlarning manba MAC manziliga qarab o'zi o'rganadi
- Routerdan tayyor jadvalni oladi
- Internetdan yuklab oladi
! Switch har kelgan kadrning manba manzilini va u kelgan portni eslab qoladi.

? MAC flooding hujumining maqsadi nima?
- Routerni o'chirib qo'yish
+ Switch jadvalini to'ldirib, uni kadrlarni hamma portga yuborishga majburlash
- IP manzillarni tugatish
- Wi-Fi parolini topish
! Jadval to'lganda switch o'zini hub kabi tutadi — trafik hammaga tarqaladi va hujumchi uni tinglay oladi.

? IP va MAC manzil haqida qaysi gaplar to'g'ri?
+ MAC manzil faqat bitta lokal tarmoq ichida amal qiladi
+ Paket yo'l davomida routerlardan o'tganda MAC manzillar almashadi
- MAC manzil 3-qatlamga tegishli
- IP manzilni ishlab chiqaruvchi qurilmaga yozib qo'yadi
! MAC — 2-qatlam manzili, lokal doirada ishlaydi va har bo'lakda yangilanadi. IP ni tarmoq beradi, ishlab chiqaruvchi emas.
:::

:::cards
MAC manzil nima? :: Tarmoq kartasining 6 baytli apparat manzili (masalan 00:1A:2B:3C:4D:5E); faqat lokal tarmoq ichida amal qiladi.
IP va MAC manzil vazifasi qanday farq qiladi? :: IP — paketning yakuniy manzili; MAC — shu tarmoq bo'lagidagi keyingi qadam.
ARP nima qiladi? :: Lokal tarmoqda IP manzil bo'yicha MAC manzilni topadi (“bu IP kimda?”).
ARP spoofing nima? :: Soxta ARP javoblari bilan qurbonlar keshini buzib, trafikni o'zi orqali o'tkazish — Man-in-the-Middle.
ARP spoofing'dan asosiy himoya? :: Trafikni shifrlash (HTTPS, VPN); qo'shimcha — Dynamic ARP Inspection va segmentatsiya.
Switch kadrni qayerga yuborishni qanday biladi? :: Manba MAC manzillardan o'zi tuzgan MAC jadvali bo'yicha; manzil noma'lum bo'lsa — hamma portga.
Broadcast MAC manzil? :: FF:FF:FF:FF:FF:FF — tarmoqdagi barcha qurilmalarga.
ARP keshini ko'rish buyrug'i? :: arp -a
MAC flooding nima? :: Switch jadvalini soxta manzillar bilan to'ldirib, uni trafikni hammaga tarqatishga majburlash.
:::
