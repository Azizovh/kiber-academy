Yolg'iz kompyuter — kuchli kalkulyator, xolos. U foydali va xavfli bo'lishi boshqa kompyuterlarga ulanganda boshlanadi. Hujumchi sizning kompyuteringizga eshikdan kirmaydi — tarmoq orqali keladi. Himoyachi ham hujumni tarmoqda ko'radi.

Shuning uchun tarmoq — bu dasturning eng muhim bosqichlaridan biri. Uni yaxshi bilgan odam uchun keyingi hamma narsa ancha oson bo'ladi.

## Tarmoq nima

[[network|Tarmoq]] — o'zaro ma'lumot almashadigan ikki yoki undan ortiq qurilma. Uyingizdagi telefon, noutbuk va televizor Wi-Fi orqali bir-birini "ko'radi" — bu tarmoq. Dunyodagi milliardlab qurilmalar bir-biriga ulangan — bu ham tarmoq, uning nomi internet.

Tarmoqlar hajmiga ko'ra ikki asosiy turga bo'linadi:

| | [[lan|LAN]] | [[wan|WAN]] |
|---|---|---|
| To'liq nomi | Local Area Network | Wide Area Network |
| Hajmi | Xonadon, ofis, bino | Shahar, mamlakat, dunyo |
| Egasi | Siz yoki tashkilotingiz | Provayderlar |
| Misol | Uydagi Wi-Fi tarmog'i | Internet |

**Internet** — yagona tarmoq emas. Bu minglab mustaqil tarmoqlarning bir-biriga ulanishi: "tarmoqlar tarmog'i". Sizning uy tarmog'ingiz [[isp|provayder]] (ISP) tarmog'iga, u boshqa provayderlarga ulangan — va shu tarzda butun dunyo bo'ylab.

## Tarmoq qurilmalari

Uyingizdagi "Wi-Fi router" degan quticha aslida bir nechta qurilmaning birlashmasi. Ularni alohida tushunish kerak — korporativ tarmoqlarda ular alohida turadi.

| Qurilma | Vazifasi | O'xshatish |
|---|---|---|
| [[switch|Switch]] | Bitta tarmoq **ichidagi** qurilmalarni bog'laydi | Ofis ichidagi xatlar tarqatuvchi |
| [[router|Router]] | Turli tarmoqlarni **bir-biriga** bog'laydi | Shaharlar orasidagi pochta |
| **Access point** | Simsiz qurilmalarni tarmoqqa ulaydi | Simsiz rozetka |
| **Modem** | Provayder signalini (optika, telefon liniyasi) tarmoq signaliga aylantiradi | Tarjimon |
| [[firewall|Firewall]] | Trafikni qoidalar bo'yicha o'tkazadi yoki to'sadi | Qorovul |

Eng muhim farq — **switch va router**:

- Switch faqat o'z tarmog'ini biladi. U "bu xabar 3-portdagi kompyuterga" deydi.
- Router tarmoqlar orasidagi yo'lni biladi. U "bu xabar boshqa tarmoqqa, uni provayderga uzataman" deydi.

Uy tarmog'ingiz sxemasi:

```
  Telefon   Noutbuk   Televizor
     \         |         /
      \        |        /          ← LAN (sizning tarmog'ingiz)
     ┌─────────────────────┐
     │  Uy routeri         │
     │  (switch + router   │
     │   + access point    │
     │   + firewall)       │
     └─────────────────────┘
               |
            Modem
               |
          Provayder (ISP)          ← WAN
               |
           Internet
```

## Klient va server

Tarmoqdagi muloqotning asosiy modeli juda sodda:

- [[server|Server]] — xizmat **ko'rsatadi** va so'rov kutib turadi.
- [[client|Klient]] — xizmat **so'raydi**.

Saytni ochganingizda brauzeringiz — klient, sayt joylashgan kompyuter — server. Klient so'raydi: "bosh sahifani ber". Server javob beradi: "mana".

Muhim nuqta: "server" — bu maxsus temir quti emas, bu **rol**. Sizning noutbukingiz ham server bo'la oladi: unda so'rov kutadigan dastur ishga tushirilsa bas. Kali'da bitta buyruq bilan veb-server ko'tarish mumkin — pentestda bu har kuni qilinadi.

:::key
Xavfsizlik nuqtai nazaridan: **so'rov kutib turgan har bir dastur — hujum uchun ochiq eshik.** Hujumchi tarmoqqa kirganda birinchi savoli: "bu yerda qanday xizmatlar tinglayapti?" Himoyachining birinchi qoidasi: "keraksiz xizmatni o'chir".
:::

## Ma'lumot qanday uzatiladi: paketlar

Siz 500 megabaytli fayl yuklayapsiz. U bitta ulkan bo'lak bo'lib ketmaydi. Ma'lumot kichik bo'laklarga — [[packet|paketlarga]] bo'linadi, har biri mustaqil yo'l oladi va manzilda qayta yig'iladi.

Har bir paket konvertga o'xshaydi:

- **Sarlavha** (header) — kimdan, kimga, nechanchi bo'lak.
- **Yuk** (payload) — ma'lumotning o'zi.

Nega shunday? Uch sabab:

1. **Ishonchlilik.** Bitta paket yo'qolsa, faqat o'shani qayta yuborish kifoya.
2. **Adolat.** Liniyani bitta katta fayl band qilib olmaydi — hamma navbat bilan o'tadi.
3. **Moslashuvchanlik.** Bir yo'l uzilsa, paketlar boshqasidan ketadi.

Tarmoq orqali o'tayotgan paketlar oqimi [[traffic|trafik]] deyiladi. Trafikni ushlab, ichini ko'rish mumkin — bu bosqich oxirida Wireshark bilan buni o'zingiz qilasiz.

## Protokol — kelishilgan til

Ikki kompyuter bir-birini tushunishi uchun qoidalar kerak: kim birinchi gapiradi, xabar qanday tuzilgan, xato bo'lsa nima qilinadi. Bunday qoidalar to'plami [[protocol|protokol]] deyiladi.

Har bir vazifaning o'z protokoli bor:

| Protokol | Vazifasi |
|---|---|
| **IP** | Paketni manzilga yetkazish |
| **TCP / UDP** | Dasturlar orasida ma'lumot tashish |
| **DNS** | Nomni manzilga aylantirish |
| **HTTP / HTTPS** | Veb-sahifalar |
| **SSH** | Masofadan boshqarish |

Bu bosqichning qolgan darslari — aynan shu protokollar haqida.

## Simli va simsiz

| | Simli (Ethernet) | Simsiz (Wi-Fi) |
|---|---|---|
| Tezlik va barqarorlik | Yuqori | Pastroq, to'siqlarga bog'liq |
| Qulaylik | Sim kerak | Erkin harakat |
| Xavfsizlik | Jismoniy ulanish kerak | Signal devordan tashqariga chiqadi |

Oxirgi qatorga e'tibor bering. Simli tarmoqqa ulanish uchun binoga kirish kerak. Wi-Fi signali esa ko'chada, qo'shni xonadonda, avtoturargohda ham ushlanadi. Shuning uchun Wi-Fi himoyasi alohida mavzu.

## Nega bularning hammasi xavfsizlikchiga kerak

Tarmoqni tushunmasdan quyidagi savollarning birortasiga javob berib bo'lmaydi:

- Hujumchi qayerdan kirdi va qayergacha yetib bordi?
- Bu kompyuter nega notanish serverga har besh daqiqada ulanyapti?
- Buxgalteriya kompyuterlari serverlar bilan bir tarmoqda turishi kerakmi?
- Bu port nega internetga ochiq?

Tarmoqni bilgan mutaxassis tizimni **xarita** sifatida ko'radi: qayerda eshiklar, qayerda devorlar, qayerdan o'tsa bo'ladi.

:::try
O'z tarmog'ingizni o'rganing. Windows'da CMD oching va yozing:

```
ipconfig
```

Natijadan toping: **IPv4 Address** — kompyuteringizning tarmoqdagi manzili; **Default Gateway** — routeringiz manzili (odatda `192.168.0.1` yoki `192.168.1.1`).

Keyin routerga "salom" bering — gateway manzilini yozing:

```
ping 192.168.1.1
```

Javob keldimi? Siz hozir tarmoq orqali birinchi diagnostika so'rovini yubordingiz.
:::

## Xulosa

- **Tarmoq** — ma'lumot almashadigan qurilmalar; **LAN** — lokal, **WAN** — keng hududli; internet — tarmoqlar tarmog'i.
- **Switch** tarmoq ichida bog'laydi, **router** — tarmoqlar orasida.
- **Klient** so'raydi, **server** xizmat ko'rsatadi; server — bu rol.
- Ma'lumot **paketlarga** bo'linib uzatiladi: sarlavha + yuk.
- **Protokol** — muloqot qoidalari.
- Tinglab turgan har bir xizmat — potensial kirish nuqtasi.

:::quiz
? Switch va router orasidagi asosiy farq nima?
- Switch simsiz, router simli ishlaydi
+ Switch bitta tarmoq ichidagi qurilmalarni, router esa turli tarmoqlarni bog'laydi
- Router sekinroq ishlaydi
- Ular bir xil qurilma, faqat nomi boshqa
! Switch kadrlarni o'z tarmog'i ichida tarqatadi. Router paketlarni bir tarmoqdan boshqasiga yo'naltiradi.

? Brauzerda sayt ochganingizda brauzeringiz qanday rolda?
- Server
+ Klient
- Router
- Protokol
! Brauzer xizmat so'raydi — u klient. Sayt joylashgan kompyuter so'rovga javob beradi — u server.

? “Server” haqida qaysi gap to'g'ri?
- Bu faqat ma'lumot markazlaridagi maxsus kompyuter
+ Bu rol: so'rov kutadigan dastur ishlayotgan har qanday kompyuter server bo'la oladi
- Server hech qachon klient bo'la olmaydi
- Server uchun albatta Windows kerak
! Server — bu vazifa, qurilma turi emas. Oddiy noutbukda veb-server dasturi ishga tushirilsa, u ham server.

? Nega ma'lumot tarmoqda paketlarga bo'lib uzatiladi?
+ Yo'qolgan qismni alohida qayta yuborish mumkin bo'lishi uchun
+ Liniyani bitta katta uzatish band qilib olmasligi uchun
- Paketlar ma'lumotni avtomatik shifrlaydi
- Chunki kompyuter katta fayllarni saqlay olmaydi
! Paketlarga bo'lish ishonchlilik va adolatli taqsimotni beradi. Lekin paketlash o'zi shifrlash emas — ma'lumot ochiq ketishi mumkin.

? Internet nima?
- Bitta ulkan kompaniyaga tegishli tarmoq
- Butun dunyoni qamragan yagona LAN
+ Bir-biriga ulangan minglab mustaqil tarmoqlar yig'indisi
- Faqat veb-saytlar to'plami
! Internet — “tarmoqlar tarmog'i”: provayderlar, tashkilotlar va uy tarmoqlari o'zaro ulangan.

? Xavfsizlik nuqtai nazaridan Wi-Fi ning simli tarmoqdan asosiy farqi nimada?
- Wi-Fi doim shifrlangan, simli tarmoq esa yo'q
+ Wi-Fi signali bino tashqarisiga chiqadi, unga ulanish uchun jismoniy kirish shart emas
- Wi-Fi da paketlar ishlatilmaydi
- Simli tarmoqqa hujum qilib bo'lmaydi
! Simli tarmoqqa ulanish uchun rozetkaga yetib borish kerak. Wi-Fi signalini esa ko'chadan ham ushlash mumkin.
:::

:::cards
LAN va WAN farqi? :: LAN — lokal tarmoq (uy, ofis). WAN — keng hududli tarmoq (shaharlar, mamlakatlar); internet — eng katta WAN.
Switch nima qiladi? :: Bitta lokal tarmoq ichidagi qurilmalarni bog'laydi va kadrlarni kerakli portga yuboradi.
Router nima qiladi? :: Turli tarmoqlarni bir-biriga bog'laydi va paketlarni ular orasida yo'naltiradi.
Klient va server farqi? :: Klient xizmat so'raydi; server so'rov kutib, xizmat ko'rsatadi. Server — bu rol, qurilma turi emas.
Paket nimalardan iborat? :: Sarlavha (kimdan, kimga, tartib raqami) va yuk (ma'lumotning o'zi).
Protokol nima? :: Qurilmalar qanday muloqot qilishini belgilovchi qoidalar to'plami.
ISP nima? :: Internet Service Provider — sizni internetga ulaydigan provayder.
Tinglab turgan xizmat nega xavf? :: Chunki so'rov kutayotgan har bir dastur — hujumchi murojaat qilishi mumkin bo'lgan ochiq eshik.
:::
