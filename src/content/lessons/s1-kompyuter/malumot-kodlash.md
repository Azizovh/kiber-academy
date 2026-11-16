Kompyuter faqat sonlarni biladi. Unda siz yozgan "Salom" so'zi qanday saqlanadi? Va nega veb-so'rovlarda, konfiguratsiya fayllarida, zararli skriptlarda `U2Fsb20=` kabi g'alati satrlar uchraydi?

Javob — **kodlash**. Bu mavzu sodda ko'rinadi, lekin unda yangi boshlovchilar eng ko'p qiladigan bitta jiddiy xato yashiringan. Dars oxirida siz uni qilmaydigan bo'lasiz.

## Harf qanday qilib songa aylanadi

G'oya juda oddiy: **har bir belgiga raqam beramiz** va hamma shu jadvalga rioya qiladi. Bunday jadval **belgilar kodirovkasi** deyiladi.

### ASCII

Eng birinchi va eng mashhur jadval — [[ascii|ASCII]] (1960-yillar, AQSH). Unda 128 ta belgi bor: lotin harflari, raqamlar, tinish belgilari va boshqaruv belgilari.

| Belgi | O'nlik | Hex | | Belgi | O'nlik | Hex |
|---|---|---|---|---|---|---|
| bo'sh joy | 32 | 20 | | `A` | 65 | 41 |
| `0` | 48 | 30 | | `Z` | 90 | 5A |
| `9` | 57 | 39 | | `a` | 97 | 61 |
| `=` | 61 | 3D | | `z` | 122 | 7A |

Bir necha foydali kuzatuv:

- Katta va kichik harf farqi doim **32**: `A` = 65, `a` = 97.
- **Raqam belgisi son emas**: `"5"` belgisi — bu 53 soni. Dasturlashda bu ko'p xatoga sabab bo'ladi.
- `Salom` so'zi baytlarda: `53 61 6C 6F 6D`.

Butun jadvalni yodlash shart emas. `A` = 65 (0x41), `a` = 97 (0x61), `0` = 48 (0x30) va bo'sh joy = 32 (0x20) ni bilsangiz — qolganini sanab topasiz.

### Unicode va UTF-8

ASCII'da 128 ta belgi bor, xolos. Kirill, arab, xitoy yozuvi, emoji? Sig'maydi.

Yechim — [[unicode|Unicode]]: dunyodagi **barcha** yozuvlar belgilariga yagona raqam beruvchi standart. Hozir unda 150 mingga yaqin belgi bor. Har bir raqam `U+` bilan yoziladi: `A` — `U+0041`, `ў` — `U+045E`, 😀 — `U+1F600`.

Lekin bu raqamlarni baytlarga qanday yozish kerak? Eng keng tarqalgan usul — [[utf-8|UTF-8]]. Uning aqlli jihati: belgi turiga qarab **1 dan 4 baytgacha** ishlatadi.

| Belgi | Baytlar soni | UTF-8 baytlari |
|---|---|---|
| `A` | 1 | `41` |
| `ў` | 2 | `D1 9E` |
| `€` | 3 | `E2 82 AC` |
| 😀 | 4 | `F0 9F 98 80` |

Lotin harflari UTF-8 da ASCII bilan bir xil — bir bayt. Shuning uchun eski ASCII matnlar UTF-8 da o'zgarishsiz o'qiladi. Bugun internetning deyarli hammasi UTF-8 da.

:::info
Matn o'rniga `Ð¡Ð°Ð»Ð¾Ð¼` kabi "ieroglif"larni ko'rganmisiz? Bu buzilgan fayl emas — matn bir kodirovkada yozilib, boshqasida o'qilgan. Baytlar to'g'ri, jadval noto'g'ri tanlangan.
:::

## Base64

Ba'zan ixtiyoriy baytlarni (rasm, fayl, shifrlangan ma'lumot) **faqat matn** o'tkazadigan joydan olib o'tish kerak: elektron pochta, URL, JSON. Ixtiyoriy baytlar ichida ko'rinmas va maxsus belgilar bor — ular yo'lda buzilishi mumkin.

[[base64|Base64]] bu muammoni hal qiladi: istalgan baytlarni **64 ta xavfsiz belgi** bilan yozadi — `A–Z`, `a–z`, `0–9`, `+` va `/`.

### Qanday ishlaydi

1. Baytlar uchtadan olinadi: 3 bayt = 24 bit.
2. 24 bit to'rtta 6 bitli bo'lakka bo'linadi (2⁶ = 64 — nomi shundan).
3. Har bir bo'lak jadvaldagi bitta belgiga almashtiriladi.

Demak, **har 3 bayt 4 belgiga aylanadi** — ma'lumot uchdan birga kattalashadi.

Oxirida baytlar uchtaga yetmay qolsa, bo'sh joy `=` belgisi bilan to'ldiriladi (padding).

```
Salom      →  U2Fsb20=
Kali       →  S2FsaQ==
admin:1234 →  YWRtaW46MTIzNA==
```

### Qanday taniladi

- Faqat harflar, raqamlar, `+` va `/` dan iborat.
- Ko'pincha oxirida bitta yoki ikkita `=` bor.
- Uzunligi 4 ga karrali.

Tajribali ko'z Base64 ni bir qarashda taniydi. Sizda ham shunday bo'ladi.

## Boshqa keng tarqalgan kodlashlar

| Kodlash | Ko'rinishi | Qayerda uchraydi |
|---|---|---|
| **Hex** | `53616c6f6d` | Xeshlar, baytlarni ko'rsatish, zararli kod |
| **URL kodlash** | `Salom%20dunyo%21` | Veb-manzillar va so'rovlar |
| **HTML entity** | `&lt;script&gt;` | Veb-sahifalar |
| **Base64** | `U2Fsb20=` | Pochta, tokenlar, veb, konfiguratsiya |

URL kodlashda maxsus belgi `%` va uning hex kodi bilan almashtiriladi: bo'sh joy — `%20`, `/` — `%2F`. Bu web xavfsizligida doim kerak bo'ladi.

## Eng muhim farq: kodlash ≠ shifrlash ≠ xeshlash

Mana o'sha jiddiy xato. Bu uch tushunchani adashtirish — intervyuda yiqilishning ishonchli yo'li, amalda esa — haqiqiy zaifliklarning manbai.

| | [[encoding|Kodlash]] | [[encryption|Shifrlash]] | [[hash|Xeshlash]] |
|---|---|---|---|
| **Maqsad** | Formatni o'zgartirish | Maxfiylik | Yaxlitlikni tekshirish, parol saqlash |
| **Kalit kerakmi?** | Yo'q | Ha | Yo'q |
| **Qaytarsa bo'ladimi?** | Ha, istalgan kishi | Ha, faqat kalit egasi | Yo'q |
| **Misol** | Base64, hex, UTF-8 | AES, RSA | SHA-256 |

:::warn
**Base64 — shifr emas.** U hech narsani yashirmaydi: uni istalgan odam bir soniyada ochadi. `cGFyb2w6IGFkbWluMTIz` ko'rinishidagi "parol" himoyalanmagan — u shunchaki boshqacha yozilgan. Dasturchilar ba'zan parol yoki kalitni Base64 qilib "yashirdim" deb o'ylaydi — siz esa pentestda aynan shularni topasiz.
:::

Oddiy tekshiruv: **kalit bormi?** Yo'q bo'lsa — bu shifrlash emas.

## Nega bu xavfsizlikchiga kerak

**Hujumchilar kodlashni niqob sifatida ishlatadi.** Zararli buyruq Base64 ichiga o'raladi — himoya vositasi `powershell -enc SQBFAFgA...` ni ko'radi, lekin ichidagi zararli buyruqni emas. Ba'zan bir necha qavat ustma-ust qo'yiladi: Base64 ichida hex, uning ichida yana Base64.

**Himoya filtrlarini aylanib o'tish.** Filtr `<script>` so'zini bloklaydi, lekin `%3Cscript%3E` ni o'tkazib yuboradi — server esa uni qaytadan `<script>` ga aylantiradi.

**Ma'lumot hamma joyda kodlangan holda uchraydi:** web tokenlar, cookie'lar, konfiguratsiya fayllari, tarmoq trafigi.

Shuning uchun mutaxassisning refleksi: **g'alati satr ko'rdingmi — tanib ol va och.**

## Vositalar

**CyberChef** (`gchq.github.io/CyberChef`) — brauzerda ishlaydigan "oshxona": chap tomondan amallarni sudrab tashlaysiz, o'ngda natija chiqadi. "Magic" amali kodlash turini o'zi taxmin qiladi. CTF'da ham, haqiqiy ishda ham doim ochiq turadi.

**Terminal:**

```bash
echo "Salom" | base64            # kodlash
echo "U2Fsb20K" | base64 -d      # ochish (-d = decode)
echo "Salom" | xxd -p            # hex ko'rinishi
echo "53616c6f6d" | xxd -r -p    # hex'dan matnga
```

Endi shularni qo'lda bajarib ko'ring:

:::lab kodlash-terminalda

## Xulosa

- **ASCII**: 128 ta belgi, `A` = 65, `a` = 97, `0` = 48.
- **Unicode** — barcha belgilar ro'yxati; **UTF-8** — ularni 1–4 baytda yozish usuli.
- **Base64**: har 3 bayt → 4 belgi; `A–Z a–z 0–9 + /`, oxirida ko'pincha `=`.
- **Kodlash** — kalitsiz, hamma qaytaradi. **Shifrlash** — kalit bilan. **Xeshlash** — qaytarib bo'lmaydi.
- Base64 hech narsani himoya qilmaydi.
- Hujumchilar kodlashni yashirinish uchun ishlatadi — uni tanish va ochish kerak.

:::quiz
? `dGVzdDoxMjM0NTY=` ko'rinishidagi satrni ko'rdingiz. Bu katta ehtimol bilan nima?
- Shifrlangan parol
- SHA-256 xeshi
+ Base64 bilan kodlangan matn
- Hex yozuv
! Harflar, raqamlar va oxiridagi `=` — Base64 belgisi. Uni kalitsiz, istalgan odam ochadi (bu yerda: test:123456).

? Dasturchi parolni konfiguratsiya faylida Base64 ko'rinishida saqladi va “himoyaladim” dedi. Bu to'g'rimi?
- Ha, Base64 kuchli shifr
- Ha, agar oxirida `=` bo'lsa
+ Yo'q — Base64 kodlash, uni istalgan odam kalitsiz ochadi
- Yo'q, chunki Base64 faqat rasmlar uchun
! Kodlash maxfiylik bermaydi. Kalit yo'q — demak, shifrlash ham yo'q.

? Kodlash, shifrlash va xeshlashdan qaysi birini orqaga qaytarib BO'LMAYDI?
- Kodlash
- Shifrlash
+ Xeshlash
- Uchalasini ham qaytarsa bo'ladi
! Xesh — bir tomonlama funksiya. Kodlashni hamma qaytaradi, shifrlashni — kalit egasi.

? ASCII jadvalida `A` harfi 65. `C` harfi nechchi?
- 66
+ 67
- 68
- 99
! Harflar ketma-ket joylashgan: A = 65, B = 66, C = 67. (99 — bu kichik `c`: 67 + 32.)

? UTF-8 haqida qaysi gaplar to'g'ri?
+ Lotin harflari unda ASCII bilan bir xil yoziladi
+ Bitta belgi 1 dan 4 baytgacha joy olishi mumkin
- Har bir belgi doim aniq 2 bayt
- U faqat ingliz tili uchun
! UTF-8 o'zgaruvchan uzunlikdagi kodlash: ASCII belgilar — 1 bayt, boshqalar — 2 dan 4 baytgacha.

? Veb-manzilda `%20` nimani bildiradi?
- 20 foizni
+ Bo'sh joyni (hex 20 = o'nlik 32)
- 20-raqamli sahifani
- Shifrlangan belgini
! URL kodlashda maxsus belgi `%` va uning hex kodi bilan yoziladi. Bo'sh joyning ASCII kodi — 0x20.

? Hujumchilar zararli buyruqlarni nega tez-tez Base64 ichiga o'raydi?
- Chunki bu buyruqni tezlashtiradi
- Chunki Base64 ni ochib bo'lmaydi
+ Chunki oddiy kalit so'z qidiradigan himoya filtrlari kodlangan matnni tanimaydi
- Chunki operatsion tizim buni talab qiladi
! Bu yashirinish (obfuscation) usuli: filtr zararli so'zni ko'rmaydi, tizim esa kodlangan buyruqni ochib bajaradi.
:::

:::cards
ASCII'da A, a va 0 ning kodlari? :: A = 65 (0x41), a = 97 (0x61), 0 = 48 (0x30). Bo'sh joy = 32 (0x20).
Unicode va UTF-8 farqi? :: Unicode — barcha belgilarga raqam beruvchi ro'yxat; UTF-8 — o'sha raqamlarni 1–4 baytda yozish usuli.
Base64 qanday taniladi? :: Faqat A–Z, a–z, 0–9, +, / belgilari; ko'pincha oxirida = yoki ==; uzunligi 4 ga karrali.
Base64 da 3 bayt nechta belgiga aylanadi? :: 4 ta belgiga — ma'lumot uchdan birga kattalashadi.
Kodlash va shifrlash farqi? :: Kodlash — kalitsiz, istalgan kishi qaytaradi, maxfiylik bermaydi. Shifrlash — kalit bilan, faqat kalit egasi ochadi.
Xeshlashning asosiy xususiyati? :: Bir tomonlama: natijadan asl ma'lumotni qaytarib bo'lmaydi.
URL kodlashda bo'sh joy qanday yoziladi? :: %20 (bo'sh joyning hex kodi — 0x20).
Base64 ni terminalda qanday ochiladi? :: echo "SATR" | base64 -d
:::
