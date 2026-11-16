`192.168.1.1`, `00:1A:2B:3C:4D:5E`, `0x7ffe`, `d41d8cd98f00b204e9800998ecf8427e` — xavfsizlikda har kuni shunday yozuvlarga duch kelasiz. Ular tasodifiy belgilar emas: hammasi bitta narsaning — sonlarning — turli yozilishi. Bu darsdan keyin ularni o'qiy olasiz.

## Nega kompyuter faqat 0 va 1 ni tushunadi

Protsessor milliardlab mitti kalitlardan — tranzistorlardan iborat. Har bir kalitning ikki holati bor: tok o'tyapti yoki o'tmayapti. Yoqilgan — **1**, o'chirilgan — **0**.

Mana shu bitta kalit holati — [[bit|bit]] (binary digit), ma'lumotning eng kichik birligi. Matn, rasm, video, dastur — hammasi oxir-oqibat nol va birlar ketma-ketligi.

## Avval tanish narsa: o'nlik tizim

Biz o'nta raqam (0–9) bilan sanaymiz. `347` sonini qanday tushunamiz?

```
  3      4      7
 100     10     1       ← har xonaning "og'irligi" (10², 10¹, 10⁰)

3×100 + 4×10 + 7×1 = 347
```

Har bir xona o'ngdagisidan **10 baravar** og'irroq. Bu — **pozitsion tizim**: raqamning qiymati uning joyiga bog'liq.

## Ikkilik tizim (binary)

[[binary|Ikkilik tizim]]da qoida aynan shu, faqat raqamlar ikkita (0 va 1) va har bir xona o'ngdagisidan **2 baravar** og'irroq:

```
128   64   32   16    8    4    2    1
```

Bu qatorni yoddan biling — u doim kerak bo'ladi. Har biri oldingisining ikki barobari.

### Ikkilikdan o'nlikka

`01001101` nima? Og'irliklarni ustiga yozamiz va **1 turgan joylarni qo'shamiz**:

```
128   64   32   16    8    4    2    1
  0    1    0    0    1    1    0    1

64 + 8 + 4 + 1 = 77
```

### O'nlikdan ikkilikka

`200` ni o'tkazamiz. Chapdan boshlab har bir og'irlik uchun so'raymiz: "sig'adimi?"

| Og'irlik | Sig'adimi? | Bit | Qoldi |
|---|---|---|---|
| 128 | 200 ≥ 128 — ha | 1 | 72 |
| 64 | 72 ≥ 64 — ha | 1 | 8 |
| 32 | 8 < 32 — yo'q | 0 | 8 |
| 16 | yo'q | 0 | 8 |
| 8 | 8 ≥ 8 — ha | 1 | 0 |
| 4 | yo'q | 0 | 0 |
| 2 | yo'q | 0 | 0 |
| 1 | yo'q | 0 | 0 |

Natija: `11001000`. Tekshiramiz: 128 + 64 + 8 = 200 ✓

## Bayt

Sakkiz bit birga — [[byte|bayt]]. Kompyuter ma'lumotni asosan baytlab o'lchaydi va qayta ishlaydi.

Bir baytga nechta turli qiymat sig'adi? Har bir bit ikki holatda bo'la oladi, bitlar sakkizta: 2⁸ = **256** ta kombinatsiya. Ya'ni bir bayt **0 dan 255 gacha** sonni saqlaydi (`00000000` dan `11111111` gacha).

:::key
**255** soni sizni butun karyerangiz davomida ta'qib qiladi. IP manzildagi har bir son 255 dan oshmaydi — chunki u bir bayt. `192.168.1.1` — bu shunchaki to'rtta bayt: `11000000.10101000.00000001.00000001`. Tarmoq bosqichida subnet hisoblashning hammasi shu ikkilik yozuvga tayanadi.
:::

Katta birliklar:

| Birlik | Qancha |
|---|---|
| 1 bayt | 8 bit |
| 1 kilobayt (KB) | 1024 bayt |
| 1 megabayt (MB) | 1024 KB |
| 1 gigabayt (GB) | 1024 MB |
| 1 terabayt (TB) | 1024 GB |

Nega 1000 emas, 1024? Chunki 1024 = 2¹⁰ — ikkilik tizimda "yumaloq" son. (Disk ishlab chiqaruvchilari 1000 bilan hisoblaydi — shuning uchun "500 GB" disk kompyuterda 465 GB ko'rinadi.)

Va yana bir tuzoq: tarmoq tezligi **bit**da o'lchanadi, fayl hajmi — **bayt**da. 100 Mbit/s internet soniyasiga 100 megabayt emas, taxminan **12,5** megabayt yuklaydi (100 ÷ 8).

## O'n oltilik tizim (hex)

Ikkilik yozuv kompyuterga qulay, lekin odamga — azob: `11111111101011000001000000000001` ni xatosiz o'qib ko'ring.

Shuning uchun [[hex|o'n oltilik tizim]] (hexadecimal, qisqacha **hex**) ishlatiladi. Unda 16 ta raqam bor: `0–9`, keyin harflar `A–F`.

| O'nlik | Hex | Ikkilik | | O'nlik | Hex | Ikkilik |
|---|---|---|---|---|---|---|
| 0 | 0 | 0000 | | 8 | 8 | 1000 |
| 1 | 1 | 0001 | | 9 | 9 | 1001 |
| 2 | 2 | 0010 | | 10 | A | 1010 |
| 3 | 3 | 0011 | | 11 | B | 1011 |
| 4 | 4 | 0100 | | 12 | C | 1100 |
| 5 | 5 | 0101 | | 13 | D | 1101 |
| 6 | 6 | 0110 | | 14 | E | 1110 |
| 7 | 7 | 0111 | | 15 | F | 1111 |

Hex'ning butun siri shu jadvalda: **bitta hex raqam — aynan to'rt bit**. Demak, **bir bayt — aynan ikki hex raqam**: `00` dan `FF` gacha.

### Ikkilik ↔ hex

Bitlarni to'rttadan guruhlaysiz va har guruhni jadvaldan almashtirasiz:

```
1100 1000
  C    8        →  C8
```

Teskarisiga ham xuddi shunday: `4D` → `0100 1101`.

### Hex → o'nlik

Ikki xonali hex uchun: birinchi raqam × 16 + ikkinchi raqam.

```
C8  →  12 × 16 + 8  = 200
4D  →   4 × 16 + 13 = 77
FF  →  15 × 16 + 15 = 255
```

Hex sonni o'nlikdan farqlash uchun oldiga `0x` qo'yiladi: `0x10` — bu o'n olti, o'n emas.

## Hex'ni qayerda uchratasiz

| Qayerda | Misol |
|---|---|
| MAC manzil | `00:1A:2B:3C:4D:5E` — 6 bayt |
| IPv6 manzil | `2001:0db8:85a3::8a2e:0370:7334` |
| Xesh | `5d41402abc4b2a76b9719d911017c592` |
| Xotira manzili | `0x7ffe5367e044` |
| Rang kodi | `#FF0000` — qizil (R=255, G=0, B=0) |
| Fayl ichidagi baytlar | `89 50 4E 47` — PNG fayl boshi |
| URL'dagi maxsus belgilar | `%20` — bo'sh joy (0x20 = 32) |

Endi dars boshidagi "tasodifiy belgilar" siz uchun ma'noga ega.

:::try
Qog'oz va qalam oling — kalkulyatorsiz. Javoblar pastda, lekin avval o'zingiz yeching.

1. `00101010` — o'nlikda nechchi?
2. `172` — ikkilikda qanday yoziladi?
3. `10101100` — hex'da qanday?
4. `0x3F` — o'nlikda nechchi?
5. IP manzil `10.0.0.255` ning oxirgi baytini ikkilikda yozing.

**Javoblar:** 1) 32 + 8 + 2 = **42**. 2) 128 + 32 + 8 + 4 → **10101100**. 3) 1010 = A, 1100 = C → **AC**. 4) 3 × 16 + 15 = **63**. 5) **11111111**.
:::

:::tip
Tez hisoblashni qo'lda mashq qiling — dastlab sekin bo'ladi, bu normal. Tekshirish va katta sonlar uchun Windows kalkulyatorini **Programmer** rejimiga o'tkazing: u sonni bir vaqtda HEX, DEC va BIN ko'rinishida ko'rsatadi.
:::

## Xulosa

- **Bit** — 0 yoki 1; **bayt** — 8 bit, qiymati 0–255.
- Ikkilik xonalar og'irligi: `128 64 32 16 8 4 2 1`.
- **Hex**: 16 ta raqam (0–9, A–F); bir hex raqam = 4 bit; bir bayt = 2 hex raqam.
- `0x` — hex son belgisi.
- 1 KB = 1024 bayt; tarmoq tezligi bitda, fayl hajmi baytda.
- IP manzil, MAC manzil, xesh, rang kodi — hammasi baytlarning turli yozuvi.

:::quiz
? `00001101` ikkilik soni o'nlikda nechchi?
- 11
+ 13
- 14
- 26
! 1 turgan xonalar: 8, 4 va 1. Yig'indisi: 8 + 4 + 1 = 13.

? Bir bayt saqlay oladigan eng katta son qaysi?
- 128
- 256
+ 255
- 1024
! 8 bit 2⁸ = 256 ta kombinatsiya beradi, lekin sanoq 0 dan boshlanadi: 0 dan 255 gacha.

? `0xFF` o'nlikda nechchi?
- 15
- 16
- 1515
+ 255
! F = 15. Demak: 15 × 16 + 15 = 255. Bu — bir baytning maksimal qiymati.

? Bitta hex raqam nechta bitga teng?
- 2
+ 4
- 8
- 16
! 16 = 2⁴, shuning uchun bitta hex raqam aynan to'rt bitni ifodalaydi. Bir bayt (8 bit) — ikki hex raqam.

? `10100101` ikkilik soni hex'da qanday yoziladi?
- 5A
- AA
+ A5
- 165
! To'rttadan guruhlaymiz: 1010 = A, 0101 = 5 → A5. (165 — bu shu sonning o'nlik qiymati.)

? Internet tezligi 80 Mbit/s. 100 megabaytli faylni yuklash taxminan qancha vaqt oladi?
- 1 soniyadan sal ko'proq
+ 10 soniya atrofida
- 80 soniya
- 800 soniya
! 80 megabit ÷ 8 = 10 megabayt/soniya. 100 MB ÷ 10 MB/s = 10 soniya. Bit va baytni adashtirmang.

? IP manzilning har bir qismi nega 255 dan katta bo'la olmaydi?
- Bu shunchaki kelishuv
+ Chunki har bir qism — bir bayt, bayt esa 0–255 oralig'ini saqlaydi
- Chunki 256 raqami band qilingan
- Chunki tarmoqda 255 tadan ortiq kompyuter bo'lmaydi
! IPv4 manzil — to'rt bayt. Har bayt 8 bit, ya'ni 0 dan 255 gacha.
:::

:::cards
Bit va bayt nima? :: Bit — 0 yoki 1, eng kichik birlik. Bayt — 8 bit, 0 dan 255 gacha qiymat.
Ikkilik sanoqda 8 ta xonaning og'irliklari? :: 128, 64, 32, 16, 8, 4, 2, 1
Bitta hex raqam nechta bit? Bir bayt nechta hex raqam? :: Bitta hex raqam = 4 bit. Bir bayt = 2 hex raqam (00–FF).
0xFF o'nlikda nechchi? :: 255 (15 × 16 + 15).
Hex'da A, B, C, D, E, F qaysi sonlar? :: A=10, B=11, C=12, D=13, E=14, F=15.
0x belgisi nimani bildiradi? :: Undan keyingi son o'n oltilik (hex) tizimda yozilganini.
1 KB necha bayt va nega? :: 1024 bayt, chunki 1024 = 2¹⁰.
100 Mbit/s tezlik soniyasiga necha megabayt? :: Taxminan 12,5 MB (100 ÷ 8) — tezlik bitda, hajm baytda o'lchanadi.
:::
