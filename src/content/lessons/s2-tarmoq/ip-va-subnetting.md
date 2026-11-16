Pentest shartnomasida shunday yozilgan: "Qamrov: `10.20.0.0/22`". Bu nechta manzil? Qaysi manzildan qaysi manzilgacha? `10.20.4.15` unga kiradimi? Javobni bilmasangiz, ruxsat berilmagan tizimni skanerlab qo'yishingiz mumkin — bu esa qonunbuzarlik.

Bu dars — bosqichning eng "matematik" qismi. Qo'rqmang: bu yerda qo'shish va ayirishdan boshqa narsa yo'q. Lekin qog'oz-qalam oling — o'qib emas, hisoblab o'rganiladi.

## IP manzil nima

[[ip-address|IP manzil]] — qurilmaning tarmoqdagi manzili. Uy manziliga o'xshaydi: usiz paket qayerga borishini bilmaydi.

IPv4 manzil — **32 bit**, ya'ni to'rt bayt. Qulaylik uchun har bayt o'nlik sonda, nuqta bilan ajratib yoziladi:

```
   192    .    168    .     1     .    10
11000000   10101000   00000001   00001010
```

Har bir qism — **oktet** (8 bit), shuning uchun qiymati 0 dan 255 gacha. "Sanoq tizimlari" darsida aynan shuni mashq qilgan edingiz.

Jami 2³² ≈ 4,3 milliard manzil bor. Bu yetarli emas — sababini va yechimini quyida ko'rasiz.

## Manzil ikki qismdan iborat

Telefon raqamiga o'xshatamiz: `+998 71 123-45-67`. Boshi — mamlakat va shahar kodi, oxiri — abonent raqami.

IP manzil ham ikki qismli:

- **Tarmoq qismi** — qurilma qaysi tarmoqda.
- **Host qismi** — shu tarmoq ichidagi aynan qaysi qurilma.

Chegara qayerdan o'tishini [[subnet-mask|tarmoq maskasi]] ko'rsatadi. Maskada **1** turgan bitlar — tarmoq qismi, **0** turgan bitlar — host qismi:

```
IP:     192.168.1.10     11000000.10101000.00000001 . 00001010
Maska:  255.255.255.0    11111111.11111111.11111111 . 00000000
                         └────── tarmoq qismi ─────┘ └─ host ─┘
```

### CIDR yozuvi

Maskani har safar to'liq yozish noqulay. Shuning uchun [[cidr|CIDR]] yozuvi ishlatiladi: sleshdan keyin **maskadagi birlar soni**.

```
192.168.1.10/24     ←  birinchi 24 bit — tarmoq, qolgan 8 bit — host
```

`255.255.255.0` va `/24` — bir xil narsa.

## Tarmoqdagi uchta maxsus narsa

`192.168.1.0/24` tarmog'ini olaylik. Host qismi — oxirgi 8 bit, ya'ni 256 ta kombinatsiya (`.0` dan `.255` gacha). Lekin ikkitasi band:

| Manzil | Nomi | Vazifasi |
|---|---|---|
| `192.168.1.0` | **Tarmoq manzili** | Tarmoqning "nomi". Host qismi — hammasi 0 |
| `192.168.1.1` – `192.168.1.254` | **Hostlar** | Qurilmalarga beriladi |
| `192.168.1.255` | **Broadcast** | "Tarmoqdagi hammaga". Host qismi — hammasi 1 |

Shuning uchun foydalanish mumkin bo'lgan manzillar soni:

:::key
**Hostlar soni = 2^(host bitlari) − 2**

/24 da host bitlari 32 − 24 = 8 ta → 2⁸ − 2 = **254** ta qurilma.
:::

## Eng ko'p uchraydigan maskalar

Bu jadvalni vaqt o'tishi bilan yoddan bilib olasiz:

| CIDR | Maska | Manzillar | Hostlar |
|---|---|---|---|
| /8 | 255.0.0.0 | 16 777 216 | 16 777 214 |
| /16 | 255.255.0.0 | 65 536 | 65 534 |
| /24 | 255.255.255.0 | 256 | 254 |
| /25 | 255.255.255.128 | 128 | 126 |
| /26 | 255.255.255.192 | 64 | 62 |
| /27 | 255.255.255.224 | 32 | 30 |
| /28 | 255.255.255.240 | 16 | 14 |
| /29 | 255.255.255.248 | 8 | 6 |
| /30 | 255.255.255.252 | 4 | 2 |
| /32 | 255.255.255.255 | 1 | bitta aniq manzil |

Qonuniyat: prefiks **bittaga oshsa, tarmoq ikki baravar kichrayadi**.

## Subnetting: blok usuli

Katta tarmoqni kichiklarga bo'lish [[subnet|subnetting]] deyiladi. Uni ikkilik sanoqsiz, tez hisoblash usuli bor.

**1-qadam.** Maskaning "qiziq" oktetini toping — 255 ham, 0 ham bo'lmagan oktet.

**2-qadam.** Blok hajmini hisoblang: **256 − o'sha oktet**.

**3-qadam.** Tarmoqlar 0 dan boshlab shu blok hajmi bilan ketadi. IP manzil qaysi blokka tushishini toping.

**4-qadam.** Blokning birinchi manzili — tarmoq, oxirgisi — broadcast, orasidagilar — hostlar.

### 1-misol: `10.0.5.200/27`

- /27 → maska `255.255.255.224`. Qiziq oktet — to'rtinchisi: **224**.
- Blok hajmi: 256 − 224 = **32**.
- Bloklar: 0, 32, 64, 96, 128, 160, **192**, 224.
- 200 qaysi blokda? 192 dan 223 gacha.

| | |
|---|---|
| Tarmoq manzili | `10.0.5.192` |
| Birinchi host | `10.0.5.193` |
| Oxirgi host | `10.0.5.222` |
| Broadcast | `10.0.5.223` |
| Hostlar soni | 2⁵ − 2 = 30 |

### 2-misol: `172.16.4.130/25`

- /25 → maska `255.255.255.128`. Blok: 256 − 128 = **128**.
- Bloklar: 0, **128**.
- 130 → 128 dan 255 gacha bo'lgan blokda.

Tarmoq: `172.16.4.128`, hostlar: `.129` – `.254`, broadcast: `172.16.4.255`, jami 126 ta host.

### 3-misol: dars boshidagi savol — `10.20.0.0/22`

Bu yerda qiziq oktet — **uchinchisi**. /22 → maska `255.255.252.0`. Blok: 256 − 252 = **4**.

Uchinchi oktetdagi bloklar: **0**, 4, 8, 12… Demak tarmoq `10.20.0.0` dan `10.20.3.255` gacha — 1024 ta manzil.

`10.20.4.15` kiradimi? **Yo'q** — u keyingi blokda (`10.20.4.0/22`). Unga tegish — qamrovdan chiqish.

## Bir tarmoqdami yoki yo'q?

Subnet hisoblashning eng amaliy natijasi shu savol. Kompyuter paket yuborishdan oldin o'zi ham aynan shuni hisoblaydi:

- Manzil **o'z tarmog'imda** → to'g'ridan-to'g'ri yuboraman.
- Manzil **boshqa tarmoqda** → [[gateway|default gateway]] ga (routerga) beraman, u yo'lini topadi.

`192.168.1.10/24` uchun `192.168.1.200` — qo'shni, `192.168.2.5` esa — boshqa tarmoq, faqat router orqali.

Xavfsizlikda bu **segmentatsiya**ning asosi: buxgalteriya `10.1.10.0/24` da, serverlar `10.1.20.0/24` da bo'lsa, ular orasidagi har bir paket routerdan (va firewall'dan) o'tadi — demak uni nazorat qilish mumkin.

## Xususiy va ommaviy manzillar

4,3 milliard manzil dunyodagi barcha qurilmalarga yetmaydi. Yechim: ba'zi oraliqlar **xususiy** (private) deb e'lon qilingan — ularni har kim o'z ichki tarmog'ida erkin ishlatadi, lekin ular internetda yo'naltirilmaydi.

:::key
Bu uch oraliqni yoddan biling — intervyuda so'raladi va har kuni kerak bo'ladi:

| Oraliq | CIDR | Qayerda uchraydi |
|---|---|---|
| `10.0.0.0` – `10.255.255.255` | 10.0.0.0/8 | Yirik korporativ tarmoqlar, bulut |
| `172.16.0.0` – `172.31.255.255` | 172.16.0.0/12 | O'rta tarmoqlar, Docker |
| `192.168.0.0` – `192.168.255.255` | 192.168.0.0/16 | Uy va kichik ofislar |
:::

Sizning uyingizdagi `192.168.1.10` qo'shningizda ham bor — bu muammo emas, chunki ular turli ichki tarmoqlarda. Internetga chiqishda router ularni bitta **ommaviy** manzilga almashtiradi — bu [[nat|NAT]], uni alohida darsda ko'ramiz.

Boshqa maxsus manzillar:

| Manzil | Ma'nosi |
|---|---|
| `127.0.0.1` (127.0.0.0/8) | [[loopback|Loopback]] — "men o'zim". Nomi: `localhost` |
| `169.254.x.x` | Qurilma avtomatik manzil ola olmadi (DHCP ishlamadi) |
| `0.0.0.0` | "Istalgan manzil" yoki "barcha interfeyslar" |
| `255.255.255.255` | Lokal tarmoqdagi hammaga (broadcast) |

`0.0.0.0` ga alohida e'tibor: agar xizmat `0.0.0.0:3306` da tinglayapti deyilsa, u **tarmoqdagi hammaga ochiq**. `127.0.0.1:3306` da tinglasa — faqat shu kompyuterning o'ziga. Bu farq ko'p ma'lumotlar bazalarining internetga "tasodifan" ochilib qolishiga sabab bo'lgan.

## IPv6 haqida qisqacha

Manzil tanqisligining uzoq muddatli yechimi — [[ipv6|IPv6]]: **128 bit**, manzillar soni amalda cheksiz.

```
2001:0db8:0000:0000:0000:ff00:0042:8329
```

Sakkizta guruh, har biri 4 ta hex raqam. Qisqartirish qoidalari:

- Guruh boshidagi nollar tashlanadi: `0db8` → `db8`, `0042` → `42`.
- Ketma-ket nol guruhlar **bir marta** `::` bilan almashtiriladi.

Natija: `2001:db8::ff00:42:8329`.

Tanib olish kerak bo'lganlari: `::1` — loopback (IPv4 dagi 127.0.0.1), `fe80::` bilan boshlanadiganlar — faqat lokal tarmoq ichida amal qiladigan manzillar.

Hozircha IPv6 ni **taniy olish** kifoya. Lekin unutmang: ko'p tizimlarda u standart holatda yoqilgan, himoya qoidalari esa faqat IPv4 uchun yozilgan bo'ladi — hujumchilar buni biladi.

:::try
Qog'ozda yeching, keyin javoblarni tekshiring.

1. `192.168.50.75/26` — tarmoq manzili va broadcast?
2. `10.10.10.130/28` — hostlar oralig'i?
3. `/29` tarmoqda nechta host bo'ladi?
4. `172.20.5.1` — xususiy manzilmi?
5. `192.168.1.10/24` va `192.168.2.10/24` bir tarmoqdami?

**Javoblar:** 1) Blok 64 → tarmoq `192.168.50.64`, broadcast `192.168.50.127`. 2) Blok 16 → tarmoq `.128`, hostlar `.129` – `.142`, broadcast `.143`. 3) 2³ − 2 = **6**. 4) Ha — 172.16–172.31 oralig'ida. 5) Yo'q — uchinchi oktet farq qiladi, /24 da u tarmoq qismiga kiradi.
:::

:::tip
Tezlik faqat mashq bilan keladi. Kuniga 5–10 ta misol yechib, ikki hafta ichida buni boshingizda hisoblaydigan bo'lasiz. Mavzu manbalaridagi mashq sayti aynan shu uchun.
:::

## Xulosa

- IPv4 — 32 bit, 4 oktet, har biri 0–255.
- **Maska** tarmoq va host qismini ajratadi; **/24** = 255.255.255.0.
- Har tarmoqda: birinchi manzil — **tarmoq**, oxirgisi — **broadcast**, orasi — hostlar.
- **Hostlar = 2^(32 − prefiks) − 2.**
- Blok usuli: **256 − maska okteti** = blok hajmi.
- Xususiy oraliqlar: **10.0.0.0/8**, **172.16.0.0/12**, **192.168.0.0/16**.
- `127.0.0.1` — o'zim; `0.0.0.0` da tinglash — hammaga ochiq.
- IPv6 — 128 bit, hex, `::` bilan qisqartiriladi.

:::quiz
? `/24` tarmoqda nechta qurilmaga manzil berish mumkin?
- 256
+ 254
- 255
- 24
! 8 ta host biti 256 ta manzil beradi, lekin birinchisi (tarmoq) va oxirgisi (broadcast) band: 256 − 2 = 254.

? `192.168.20.100/27` qaysi tarmoqda joylashgan?
- 192.168.20.0
- 192.168.20.64
+ 192.168.20.96
- 192.168.20.128
! /27 → maska 224 → blok 32. Bloklar: 0, 32, 64, 96, 128… 100 soni 96–127 blokida. Tarmoq manzili — 192.168.20.96.

? Quyidagilardan qaysi biri xususiy (private) IP manzil EMAS?
- 10.200.3.4
- 172.20.10.5
- 192.168.100.1
+ 172.40.1.1
! 172 bilan boshlanadigan xususiy oraliq faqat 172.16 dan 172.31 gacha. 172.40.x.x — ommaviy manzil.

? `10.5.5.5/30` tarmog'ida nechta host manzili bor?
- 4
+ 2
- 30
- 6
! /30 da 2 ta host biti: 2² − 2 = 2. Bunday tarmoqlar odatda ikki router orasidagi ulanish uchun ishlatiladi.

? Ma'lumotlar bazasi `0.0.0.0:5432` da tinglayapti. Bu nimani anglatadi?
- U o'chirilgan
- U faqat shu kompyuterning o'zidan ochiladi
+ U kompyuterning barcha tarmoq interfeyslarida, ya'ni tarmoqdan ham ochiq
- U faqat IPv6 orqali ishlaydi
! 0.0.0.0 — “barcha interfeyslar”. Faqat lokal kirish uchun 127.0.0.1 da tinglashi kerak edi.

? Pentest qamrovi `10.50.8.0/22`. Quyidagi manzillardan qaysi biri qamrovga KIRMAYDI?
- 10.50.8.1
- 10.50.10.200
- 10.50.11.254
+ 10.50.12.1
! /22 → uchinchi oktetda blok 4: tarmoq 10.50.8.0 dan 10.50.11.255 gacha. 10.50.12.1 — keyingi blok.

? `192.168.1.50/24` kompyuteri `192.168.3.20` ga paket yubormoqchi. Paket qayerga ketadi?
- To'g'ridan-to'g'ri 192.168.3.20 ga
+ Default gateway'ga (routerga), chunki manzil boshqa tarmoqda
- Broadcast manzilga
- Hech qayerga — bu mumkin emas
! /24 da birinchi uch oktet tarmoq qismi. 192.168.1 va 192.168.3 — turli tarmoqlar, shuning uchun paket router orqali o'tadi.

? `2001:0db8:0000:0000:0000:0000:0000:0001` IPv6 manzilining to'g'ri qisqartmasi qaysi?
- 2001:db8:1
+ 2001:db8::1
- 2001::db8::1
- 21:db8::1
! Boshidagi nollar tashlanadi (0db8 → db8) va ketma-ket nol guruhlar bir marta :: bilan almashtiriladi.
:::

:::cards
IPv4 manzil nechta bit va oktetdan iborat? :: 32 bit, 4 oktet; har oktet 0 dan 255 gacha.
Tarmoq maskasi nima qiladi? :: IP manzilning qaysi qismi tarmoqni, qaysi qismi hostni bildirishini ko'rsatadi.
/24 qaysi maskaga teng va nechta host beradi? :: 255.255.255.0 — 254 ta host.
Hostlar sonini hisoblash formulasi? :: 2^(32 − prefiks) − 2 (tarmoq va broadcast manzili ayiriladi).
Uchta xususiy IP oralig'i? :: 10.0.0.0/8, 172.16.0.0/12 (172.16–172.31), 192.168.0.0/16.
Blok usuli qanday ishlaydi? :: 256 − maskaning “qiziq” okteti = blok hajmi. Tarmoqlar 0 dan shu qadam bilan ketadi.
Tarmoq manzili va broadcast nima? :: Tarmoq manzili — blokning birinchi manzili (tarmoq nomi); broadcast — oxirgisi (hammaga yuborish).
127.0.0.1 nima? :: Loopback — kompyuterning o'ziga ishora qiluvchi manzil (localhost).
/26, /27, /28 da nechta host? :: /26 — 62, /27 — 30, /28 — 14.
0.0.0.0 da tinglash va 127.0.0.1 da tinglash farqi? :: 0.0.0.0 — barcha interfeyslarda, tarmoqdan ochiq; 127.0.0.1 — faqat shu kompyuterning o'zidan.
:::
