Bu bosqichda tarmoq qanday ishlashini va uning deyarli har bir qismi qanday hujumga ochiqligini ko'rdingiz: ARP ishonchga qurilgan, DNS shifrlanmagan, eski protokollar parolni ochiq uzatadi. Endi savolning ikkinchi yarmi: **bularning hammasi qanday himoyalanadi?**

Bu dars — tarmoq himoyasining asosiy vositalari bilan tanishuv. Har biriga keyinroq chuqur qaytasiz; hozir maqsad — har biri **nima qilishi va nima qila olmasligini** aniq bilish.

## Firewall

[[firewall|Firewall]] — tarmoq trafigini **qoidalar asosida** o'tkazadigan yoki to'sadigan filtr. Bino kiraverishidagi qorovul: ro'yxatda borlarni o'tkazadi, qolganlarni yo'q.

### Qoida qanday ko'rinadi

Har bir qoida bir necha shart va bitta harakatdan iborat:

| № | Manba | Manzil | Port | Protokol | Harakat |
|---|---|---|---|---|---|
| 1 | Istalgan | Veb-server | 443 | TCP | **Ruxsat** |
| 2 | Admin tarmog'i `10.1.99.0/24` | Veb-server | 22 | TCP | **Ruxsat** |
| 3 | Veb-server | Baza serveri | 5432 | TCP | **Ruxsat** |
| 4 | Istalgan | Istalgan | Istalgan | Istalgan | **Taqiq** |

Qoidalar **yuqoridan pastga** tekshiriladi va **birinchi mos kelgani** ishlaydi. Shuning uchun tartib juda muhim.

Oxirgi qatorga qarang. Bu — xavfsizlikning asosiy tamoyillaridan biri:

:::key
**Default deny** — "aniq ruxsat berilmagan hamma narsa taqiqlangan". Teskarisi ("hammasi ochiq, faqat yomonlarini to'samiz") ishlamaydi: yomon narsalar ro'yxati hech qachon to'liq bo'lmaydi. Yaxshi narsalar ro'yxati esa qisqa va aniq.
:::

### Firewall turlari

| Tur | Nimaga qaraydi | Qatlam |
|---|---|---|
| **Packet filter** | IP manzil, port, protokol — har paketni alohida | 3–4 |
| **Stateful** | Yuqoridagilar + ulanish holati: "bu javob men ruxsat bergan so'rovgami?" | 3–4 |
| **Next-generation (NGFW)** | Yuqoridagilar + qaysi ilova, foydalanuvchi, mazmun | 3–7 |
| **WAF** (web application firewall) | HTTP so'rovlar mazmuni: SQL injection, XSS belgilari | 7 |

Bugungi firewall'larning deyarli hammasi **stateful**: ichkaridan boshlangan ulanishning javobi avtomatik o'tkaziladi, tashqaridan boshlangan so'ralmagan ulanish — yo'q.

Joylashuviga ko'ra ham ikki xil:

- **Tarmoq firewall'i** — tarmoqlar chegarasida turadi, butun tarmoqni himoya qiladi.
- **Host firewall'i** — har bir kompyuterning o'zida (Windows Firewall, Linux'da `ufw`/`nftables`). Hujumchi tarmoq ichiga kirib olgan bo'lsa ham ishlaydi.

Ikkalasi birga ishlatiladi — bu qatlamli himoya.

### Kiruvchi va chiquvchi

- **Ingress** (kiruvchi) — tashqaridan ichkariga. Hamma buni filtrlaydi.
- **Egress** (chiquvchi) — ichkaridan tashqariga. Ko'pchilik buni **unutadi**.

NAT darsidan eslang: zararli dastur tashqaridan kirishni kutmaydi — o'zi tashqariga ulanadi. Agar ichkaridan istalgan joyga chiqish ochiq bo'lsa, hujumchi uchun bu erkin aloqa kanali. Chiquvchi trafikni cheklash — hujumni to'xtatmasa ham, uni ancha qiyinlashtiradi va **ko'rinadigan** qiladi.

### Firewall nimani qila olmaydi

- **Ruxsat berilgan port orqali kelgan hujumni to'xtatmaydi.** 443-port ochiq — demak veb-ilovaga qaratilgan SQL injection ham o'tadi (WAF bundan mustasno).
- **Shifrlangan trafik ichini ko'rmaydi** (maxsus tekshiruv sozlanmagan bo'lsa).
- **Ichki tahdiddan himoya qilmaydi** — hujumchi allaqachon ichkarida bo'lsa.
- **Foydalanuvchi o'zi ochgan narsadan himoya qilmaydi** — phishing xatidagi fayl.

"Firewall'imiz bor, biz xavfsizmiz" — xavfli xomxayol.

## DMZ va segmentatsiya

Internetdan ko'rinishi kerak bo'lgan serverlar (veb-sayt, pochta) va ichki tarmoq (xodimlar, bazalar, buxgalteriya) bir joyda turmasligi kerak.

[[dmz|DMZ]] (demilitarized zone) — ular orasidagi oraliq hudud:

```
                      ┌─────────────┐
   Internet ──────────┤  Firewall   ├────────── Ichki tarmoq
                      └──────┬──────┘           (xodimlar, bazalar)
                             │
                            DMZ
                    (veb-server, pochta)
```

Qoidalar:

- Internet → DMZ: faqat kerakli portlar (80, 443, 25).
- DMZ → ichki tarmoq: **qat'iy cheklangan** — faqat aniq kerakli ulanishlar.
- Ichki tarmoq → DMZ: boshqaruv uchun.

G'oya: veb-server buzilsa (u internetga ochiq, demak xavf yuqori), hujumchi **DMZ ichida qamalib qoladi** va ichki tarmoqqa to'g'ridan-to'g'ri o'ta olmaydi.

## IDS va IPS

Firewall "bu portga kirish mumkinmi?" deb so'raydi. IDS/IPS boshqa savol beradi: **"bu trafik hujumga o'xshayaptimi?"**

| | IDS | IPS |
|---|---|---|
| To'liq nomi | Intrusion **Detection** System | Intrusion **Prevention** System |
| Nima qiladi | Aniqlaydi va ogohlantiradi | Aniqlaydi va **bloklaydi** |
| Joylashuvi | Trafik nusxasini kuzatadi | Trafik yo'lining o'zida turadi |
| Xato qilsa | Ortiqcha ogohlantirish | Qonuniy trafik to'silib qoladi |

Ular ikki usulda ishlaydi:

- **Signatura asosida** — ma'lum hujumlar namunalari bilan solishtiradi. Aniq, lekin yangi hujumni ko'rmaydi.
- **Anomaliya asosida** — "odatdagidan farqli" narsani qidiradi. Yangisini ushlashi mumkin, lekin ko'p yolg'on signal beradi.

Mashhur ochiq kodli vositalar: **Suricata**, **Snort**, **Zeek**. SOC yo'nalishida ular bilan ishlaysiz.

## VPN

Kafedagi ochiq Wi-Fi'dan ishlayapsiz. Yoki uydan kompaniya ichki serveriga kirishingiz kerak. Ikkala holatda ham trafik ishonchsiz tarmoq orqali o'tadi.

[[vpn|VPN]] (Virtual Private Network) — ochiq tarmoq ustidan quriladigan **shifrlangan tunnel**.

```
Siz ══════ shifrlangan tunnel ══════ VPN server ────── Manzil
     └── kafe Wi-Fi, provayder: ──┘
         faqat shifrlangan oqimni
         ko'radi
```

Ikki asosiy qo'llanilishi:

| Tur | Maqsad |
|---|---|
| **Remote access VPN** | Xodim uydan kompaniya ichki tarmog'iga ulanadi |
| **Site-to-site VPN** | Ikki ofis tarmog'i internet orqali xavfsiz birlashtiriladi |

Protokollar: **WireGuard** (zamonaviy, tez, sodda), **OpenVPN** (sinalgan, keng tarqalgan), **IPsec** (korporativ standart).

TryHackMe va Hack The Box'da ham laboratoriya tarmog'iga OpenVPN orqali ulanasiz.

### VPN haqidagi afsonalar

Reklamalar VPN ni "to'liq anonimlik va himoya" deb sotadi. Haqiqat ancha kamtarona:

| VPN nima qiladi | VPN nima **qilmaydi** |
|---|---|
| Trafikni siz va VPN server orasida shifrlaydi | Sizni anonim qilmaydi — sayt sizni cookie va akkaunt orqali taniydi |
| Lokal tarmoq va provayderdan mazmunni yashiradi | Viruslardan himoya qilmaydi |
| IP manzilingizni VPN serverniki bilan almashtiradi | Phishing saytdan himoya qilmaydi |
| | Ishonchni yo'q qilmaydi — uni provayderdan **VPN xizmatiga ko'chiradi** |

Oxirgi qator eng muhimi: VPN xizmati sizning butun trafigingizni ko'radi. Bepul va shubhali VPN — o'z ma'lumotingizni notanish odamga ixtiyoriy topshirish.

## Proxy

[[proxy|Proxy]] — klient va server orasidagi **vositachi**: so'rovni sizning nomingizdan o'zi yuboradi.

| | VPN | Proxy |
|---|---|---|
| Qamrovi | Qurilmaning **butun** trafigi | Odatda bitta dastur yoki protokol |
| Shifrlash | Doim | Har doim ham emas |
| Qatlam | 3 | 7 (HTTP proxy) yoki 5 (SOCKS) |

Xavfsizlikda proxy'ning uch qo'llanilishi:

- **Korporativ proxy** — xodimlarning veb-trafigi u orqali o'tadi: zararli saytlar bloklanadi, hammasi jurnalga yoziladi. SOC uchun qimmatli manba.
- **Reverse proxy** — serverlar *oldida* turadi: yuklamani taqsimlaydi, TLS ni boshqaradi, haqiqiy serverlarni yashiradi (nginx, Cloudflare).
- **Tutib oluvchi proxy** — pentester quroli. **Burp Suite** brauzer va sayt orasiga o'tiradi: har bir so'rovni ko'rasiz, to'xtatasiz, o'zgartirasiz va qayta yuborasiz. Web pentestning asosiy vositasi shu.

## Wi-Fi xavfsizligi

Simsiz tarmoqning asosiy muammosini bilasiz: signal devordan o'tadi. Shuning uchun himoya to'liq **shifrlashga** tayanadi.

| Standart | Holati |
|---|---|
| **Ochiq** (parolsiz) | Shifrlash yo'q — hamma hammaning trafigini ko'radi |
| **WEP** | Bir necha daqiqada buziladi. Ishlatilmasligi kerak |
| **WPA** | Eskirgan |
| **WPA2** | Hozirgi minimal daraja. Xavfsizligi parol kuchiga bog'liq |
| **WPA3** | Eng yangisi; parol terish hujumiga ancha chidamli |

[[wpa|WPA2]] ning asosiy zaif joyi: hujumchi qurilma ulanayotgan paytdagi "salomlashuv"ni ushlab olsa, parolni **o'z kompyuterida, tarmoqqa tegmasdan** terib topishga urinadi. Qisqa yoki lug'atdagi parol — soatlar ichida topiladi. Uzun, tasodifiy parol — amalda topilmaydi.

Ikki rejim bor:

- **Personal (PSK)** — hammaga bitta umumiy parol. Uy va kichik ofis uchun.
- **Enterprise (802.1X)** — har bir foydalanuvchi o'z login-paroli bilan kiradi. Xodim ketsa — faqat uning hisobi o'chiriladi.

### Simsiz tarmoqqa xos hujumlar

**Evil twin (yovuz egizak).** Hujumchi haqiqiy tarmoq bilan bir xil nomli ("Kafe_Free_WiFi") kirish nuqtasini ko'taradi, signali kuchliroq. Qurilmangiz unga ulanadi — va butun trafik hujumchi orqali o'tadi.

**Deauthentication.** Hujumchi qurilmangizni tarmoqdan majburan uzadi (soxta "uzilish" buyrug'i bilan). Qurilma qayta ulanadi — hujumchi shu paytda salomlashuvni ushlaydi yoki sizni o'z egizagiga tortadi.

### Uy tarmog'ingizni himoyalang

Bu darsning amaliy qismi — bugunoq bajarishingiz mumkin:

1. **WPA2 yoki WPA3**, uzun parol (kamida 14–16 belgi yoki bir necha so'zdan iborat ibora).
2. **Routerning administrator parolini o'zgartiring.** Standart `admin/admin` — eng keng tarqalgan teshik.
3. **WPS ni o'chiring** — tugma yoki PIN bilan ulanish funksiyasi zaif.
4. **Router dasturini (firmware) yangilang.**
5. **Mehmonlar uchun alohida tarmoq** — mehmon telefoni sizning qurilmalaringizni ko'rmaydi.
6. **Tashqaridan boshqaruvni (remote management) o'chiring.**

Ochiq Wi-Fi'da esa: HTTPS borligini tekshiring, sertifikat ogohlantirishini hech qachon o'tkazib yubormang, muhim ishlar uchun VPN yoki mobil internetdan foydalaning.

## Hammasi birga: qatlamli himoya

Hech bir vosita yolg'iz o'zi yetarli emas — har birining "ko'r nuqtasi" bor. Shuning uchun ular **ustma-ust** qo'yiladi:

```
Internet
   │
   ▼  Chegara firewall'i  ── keraksiz portlarni to'sadi
   ▼  IPS                 ── ma'lum hujumlarni bloklaydi
   ▼  DMZ / segmentatsiya ── buzilishni cheklaydi
   ▼  Host firewall       ── har bir kompyuterni alohida himoyalaydi
   ▼  Shifrlash (TLS/VPN) ── ushlab olingan trafik foydasiz
   ▼  Monitoring / jurnal ── o'tib ketganini aniqlaydi
```

Bu yondashuv **defense in depth** deyiladi: bir qatlam yiqilsa, keyingisi to'xtatadi — yoki hech bo'lmaganda sezadi. 5-bosqichda bunga batafsil qaytamiz.

:::try
**1.** Windows Firewall holatini ko'ring: `Win + R` → `wf.msc`. **Inbound Rules** ro'yxatini ko'zdan kechiring — qancha dasturga kiruvchi ulanish ruxsat etilgan? Hammasini taniysizmi?

**2.** Routeringiz boshqaruv sahifasiga kiring (brauzerda gateway manzili, odatda `192.168.1.1`). Tekshiring: shifrlash turi qanday (WPA2/WPA3)? WPS yoqiqmi? Administrator paroli standartmi?

**3.** Telefoningizda ko'rinadigan Wi-Fi tarmoqlar ro'yxatiga qarang. Ochiq (qulfsiz) tarmoqlar bormi? Endi ularga ulanishdan oldin nimani o'ylaysiz?
:::

## Xulosa

- **Firewall** trafikni qoidalar bo'yicha filtrlaydi; asosiy tamoyil — **default deny**.
- Stateful firewall ulanish holatini eslaydi. Chiquvchi (egress) trafikni ham cheklash kerak.
- Firewall ruxsat etilgan port orqali kelgan hujumni to'xtatmaydi.
- **DMZ** — internetga ochiq serverlar uchun ajratilgan hudud.
- **IDS** aniqlaydi, **IPS** bloklaydi.
- **VPN** — shifrlangan tunnel; anonimlik bermaydi, ishonchni VPN xizmatiga ko'chiradi.
- **Proxy** — vositachi; Burp Suite — pentesterning tutib oluvchi proxy'si.
- Wi-Fi: **WPA2/WPA3** + uzun parol; WEP va ochiq tarmoq — himoyasiz.
- Hech bir vosita yolg'iz yetarli emas — **qatlamli himoya**.

:::quiz
? “Default deny” tamoyili nimani anglatadi?
- Hamma narsa ochiq, faqat ma'lum yomon narsalar to'siladi
+ Aniq ruxsat berilmagan hamma narsa taqiqlangan
- Firewall standart holatda o'chirilgan
- Faqat administratorlar internetdan foydalanadi
! Ruxsat etilganlar ro'yxati qisqa va aniq bo'ladi. Taqiqlanganlar ro'yxatini esa hech qachon to'liq tuzib bo'lmaydi.

? Firewall'da 443-port ochiq. Veb-ilovaga SQL injection hujumi qilinmoqda. Oddiy firewall uni to'xtatadimi?
- Ha, firewall barcha hujumlarni to'xtatadi
+ Yo'q — hujum ruxsat etilgan port orqali kelyapti va oddiy firewall so'rov mazmuniga qaramaydi
- Ha, agar port raqami o'zgartirilsa
- Yo'q, chunki SQL injection UDP da ishlaydi
! Oddiy firewall IP va portga qaraydi. So'rov mazmunini tahlil qilish uchun WAF kerak — va eng to'g'risi, ilovaning o'zi xavfsiz yozilishi kerak.

? IDS va IPS orasidagi asosiy farq nima?
- IDS tezroq ishlaydi
+ IDS hujumni aniqlab ogohlantiradi, IPS esa uni bloklaydi ham
- IPS faqat Wi-Fi uchun
- Ular bir xil narsa
! IDS — kuzatuvchi, IPS — to'siq. IPS xato qilsa, qonuniy trafik to'silib qolishi mumkin.

? Nega chiquvchi (egress) trafikni ham cheklash muhim?
- Internet tezroq ishlashi uchun
+ Chunki zararlangan kompyuter o'zi tashqaridagi hujumchi serveriga ulanadi
- Chunki chiquvchi trafik shifrlanmagan
- Bu muhim emas — faqat kiruvchi trafik xavfli
! Zararli dasturlar ichkaridan tashqariga ulanadi. Chiquvchi trafikni cheklash bu kanalni qiyinlashtiradi va ko'rinadigan qiladi.

? VPN haqida qaysi gap to'g'ri?
- U foydalanuvchini to'liq anonim qiladi
- U viruslardan himoya qiladi
+ U trafikni siz va VPN server orasida shifrlaydi, lekin VPN xizmati trafigingizni ko'ra oladi
- U phishing saytlarini bloklaydi
! VPN ishonchni yo'q qilmaydi — uni provayderdan VPN xizmatiga ko'chiradi. Anonimlik va virusdan himoya — alohida narsalar.

? DMZ ning maqsadi nima?
- Wi-Fi signalini kuchaytirish
+ Internetga ochiq serverlarni ichki tarmoqdan ajratish — ular buzilsa, hujumchi ichkariga to'g'ridan-to'g'ri o'ta olmasin
- Barcha trafikni shifrlash
- Xodimlarga tezroq internet berish
! Internetdan ko'rinadigan serverlar xavf ostida. DMZ buzilish oqibatini cheklaydi.

? Qaysi Wi-Fi himoya standarti bugun ishlatilmasligi kerak?
+ WEP
- WPA2
- WPA3
- WPA2 Enterprise
! WEP bir necha daqiqada buziladi. WPA2 — minimal qabul qilinadigan daraja, WPA3 — eng yaxshisi.

? “Evil twin” hujumi nima?
- Routerning parolini terib topish
+ Haqiqiy tarmoq bilan bir xil nomli soxta kirish nuqtasi ko'tarib, qurbonlarni unga ulantirish
- Ikkita router o'rnatish
- MAC manzilni o'zgartirish
! Qurilma tanish nomli, signali kuchliroq tarmoqqa ulanadi — va butun trafik hujumchi orqali o'tadi.

? Burp Suite qanday vosita?
- Antivirus
- VPN xizmati
+ Brauzer va sayt orasida turib, so'rovlarni ko'rish va o'zgartirish imkonini beruvchi tutib oluvchi proxy
- Paket filtrlovchi firewall
! Burp Suite — web pentestning asosiy quroli: har bir HTTP so'rovni to'xtatib, o'zgartirib, qayta yuborish mumkin.

? Uy routerini himoyalash uchun qaysilari to'g'ri?
+ Administrator parolini standartdan o'zgartirish
+ WPS ni o'chirish
+ Firmware'ni yangilab turish
- Shifrlashni WEP ga o'tkazish
! Standart parol, yoqilgan WPS va eski firmware — eng keng tarqalgan teshiklar. WEP esa himoyani deyarli yo'q qiladi.
:::

:::cards
Firewall nima qiladi? :: Tarmoq trafigini qoidalar (manba, manzil, port, protokol) asosida o'tkazadi yoki to'sadi.
Default deny tamoyili? :: Aniq ruxsat berilmagan hamma narsa taqiqlangan.
Stateful firewall nima? :: Ulanish holatini eslab qoladigan firewall: ruxsat etilgan so'rovning javobi avtomatik o'tadi.
Ingress va egress filtrlash? :: Ingress — kiruvchi trafik; egress — chiquvchi. Egress ni cheklash zararli dasturning tashqariga ulanishini qiyinlashtiradi.
DMZ nima? :: Internetga ochiq serverlar joylashadigan, ichki tarmoqdan ajratilgan oraliq hudud.
IDS va IPS farqi? :: IDS aniqlaydi va ogohlantiradi; IPS trafik yo'lida turib, bloklaydi ham.
VPN nima beradi va nima bermaydi? :: Shifrlangan tunnel va IP almashishi beradi. Anonimlik, virusdan va phishingdan himoya bermaydi.
VPN va proxy farqi? :: VPN qurilmaning butun trafigini shifrlab o'tkazadi; proxy odatda bitta dastur/protokol uchun vositachi.
Wi-Fi himoya standartlari? :: WEP — buzilgan; WPA2 — minimal daraja; WPA3 — eng yangi va kuchli.
Evil twin hujumi? :: Haqiqiy tarmoq nomi bilan soxta kirish nuqtasi ko'tarib, qurbon trafigini o'zi orqali o'tkazish.
WAF nima? :: Web application firewall — HTTP so'rovlar mazmunini tekshirib, web hujumlarni to'sadigan 7-qatlam filtri.
:::
