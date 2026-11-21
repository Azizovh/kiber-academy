Bu darsda dasturlashning butun poydevorini qo'yamiz: ma'lumotni saqlash (**o'zgaruvchilar**), qaror qabul qilish (**shartlar**) va takrorlash (**sikllar**). Shu uch narsa bilan allaqachon foydali dasturlar yozish mumkin.

Maslahat: bu darsni terminal oldida o'qing. Har bir misolni interaktiv rejimda (`python3`) o'zingiz tering.

## O'zgaruvchilar

[[variable|O'zgaruvchi]] — qiymat saqlanadigan nomlangan "quti":

```python
manzil = "10.10.10.5"
port = 22
ochiq = True
```

`=` belgisi matematikadagi "teng" emas — bu **"o'ng tomondagini chap tomondagi nomga saqla"** degani. Shuning uchun bu mantiqli:

```python
urinishlar = 0
urinishlar = urinishlar + 1     # endi 1
urinishlar += 1                 # qisqa shakli; endi 2
```

Nom berish qoidalari: harflar, raqamlar va `_`; raqam bilan boshlanmaydi; katta-kichik harf farqlanadi (`Port` va `port` — ikki xil nom). Python'da so'zlar pastki chiziq bilan ajratiladi: `urinishlar_soni`.

:::tip
Nomga vaqt sarflang. `x`, `a1`, `temp` — bir haftadan keyin o'zingiz ham tushunmaysiz. `muvaffaqiyatsiz_urinishlar` — uzun, lekin izohsiz ham tushunarli. Kod bir marta yoziladi, o'n marta o'qiladi.
:::

## Ma'lumot turlari

Har bir qiymatning [[data-type|turi]] bor. To'rtta asosiysi:

| Tur | Nomi | Misol | Nima |
|---|---|---|---|
| `int` | integer | `22`, `-5`, `65535` | Butun son |
| `float` | float | `3.14`, `0.5` | O'nlik son |
| `str` | string | `"salom"`, `'10.0.0.1'` | Matn |
| `bool` | boolean | `True`, `False` | Mantiqiy qiymat |

Va maxsus qiymat: `None` — "hech narsa yo'q".

Turni bilish: `type(port)`.

Tur nega muhim? Chunki u amalning ma'nosini belgilaydi:

```python
>>> 2 + 2
4
>>> "2" + "2"
'22'
>>> "2" + 2
TypeError: can only concatenate str (not "int") to str
```

Sonlar qo'shiladi, matnlar ulanadi, aralashtirib bo'lmaydi. Bu xato sizga ko'p uchraydi, chunki `input()` **doim matn** qaytaradi:

```python
yosh = input("Yoshingiz: ")      # "25" — bu matn!
yosh = int(yosh)                 # endi son
```

Turni almashtirish: `int("22")` → `22`, `str(22)` → `"22"`, `float("3.5")` → `3.5`.

## Sonlar bilan amallar

| Amal | Ma'nosi | Misol | Natija |
|---|---|---|---|
| `+` `-` `*` | Qo'shish, ayirish, ko'paytirish | `7 * 3` | `21` |
| `/` | Bo'lish (doim float) | `7 / 2` | `3.5` |
| `//` | Butun bo'lish | `7 // 2` | `3` |
| `%` | Qoldiq | `7 % 2` | `1` |
| `**` | Daraja | `2 ** 8` | `256` |

`%` (qoldiq) kutilganidan ko'p ishlatiladi: son juftmi (`n % 2 == 0`), har o'ninchi qadam (`i % 10 == 0`).

Subnetting darsidagi formulani eslang — endi uni Python hisoblaydi:

```python
prefiks = 26
hostlar = 2 ** (32 - prefiks) - 2
print(hostlar)        # 62
```

## Matnlar (string)

Xavfsizlikda eng ko'p ishlanadigan tur — matn: jurnal qatorlari, manzillar, so'rovlar.

```python
qator = "Failed password for root from 203.0.113.45"

len(qator)                    # uzunligi: 42
qator.lower()                 # kichik harflarga
qator.upper()                 # katta harflarga
"root" in qator               # True — ichida bormi?
qator.startswith("Failed")    # True
qator.replace("root", "admin")
qator.split()                 # so'zlarga bo'lish → ro'yxat
qator.strip()                 # bosh va oxiridagi bo'sh joylarni olib tashlash
```

### Indeks va kesim

Matndagi har bir belgining tartib raqami bor — **0 dan boshlab**:

```python
s = "kali"
s[0]        # 'k'  — birinchi belgi
s[1]        # 'a'
s[-1]       # 'i'  — oxirgi belgi
s[0:2]      # 'ka' — 0 dan 2 gacha (2 kirmaydi)
s[2:]       # 'li' — 2 dan oxirigacha
```

Sanoq 0 dan boshlanishi — dasturlashning asosiy odatlaridan biri. Unga ko'nikasiz.

### f-string — matn ichiga qiymat qo'yish

```python
manzil = "10.10.10.5"
port = 22
print(f"{manzil} manzilining {port}-porti tekshirilmoqda")
```

Qo'shtirnoq oldidagi `f` va jingalak qavs ichidagi nom. Bu — matn yasashning eng qulay usuli; har kuni ishlatasiz.

## Shartlar

Dastur qaror qabul qilishi kerak. Buning uchun avval **solishtirish** — natijasi doim `True` yoki `False`:

| Amal | Ma'nosi |
|---|---|
| `==` | Teng |
| `!=` | Teng emas |
| `<` `>` `<=` `>=` | Kichik, katta, kichik-yoki-teng, katta-yoki-teng |
| `in` | Ichida bor |

:::warn
`=` va `==` — ikki xil narsa. `=` **saqlaydi**, `==` **solishtiradi**. `if port = 22:` — sintaksis xatosi. Bu yangi boshlovchilarning eng ko'p qiladigan xatosi.
:::

Endi [[condition|shart]]:

```python
port = 23

if port == 22:
    print("SSH — shifrlangan")
elif port == 23:
    print("Telnet — shifrlanmagan! Topilma.")
elif port == 80:
    print("HTTP — shifrlanmagan")
else:
    print("Noma'lum port")
```

Qoidalar: shartdan keyin `:`, ichidagi qatorlar **chekinish** bilan. Yuqoridan pastga tekshiriladi, **birinchi to'g'ri kelgan** tarmoq bajariladi, qolganlari o'tkazib yuboriladi.

### Mantiqiy amallar

```python
if port == 80 or port == 8080:
    print("HTTP")

if urinishlar > 100 and muvaffaqiyatli:
    print("DIQQAT: ko'p urinishdan keyin kirish bo'lgan")

if not ochiq:
    print("Port yopiq")
```

| Amal | Qachon `True` |
|---|---|
| `a and b` | Ikkalasi ham to'g'ri |
| `a or b` | Kamida bittasi to'g'ri |
| `not a` | `a` noto'g'ri bo'lsa |

Ikkinchi misolga qarang: bu — "Loglar" darsidagi asosiy naqsh ("ko'p muvaffaqiyatsiz urinish, keyin muvaffaqiyatli kirish"), endi kod ko'rinishida.

Ko'p qiymatdan birini tekshirish — `in` bilan chiroyliroq:

```python
if port in [21, 23, 80]:
    print("Shifrlanmagan protokol")
```

## Sikllar

Kompyuterning asosiy kuchi — zerikmasdan takrorlash.

### for — har bir element uchun

```python
for port in [22, 80, 443]:
    print(f"{port}-port tekshirilmoqda")
```

"Ro'yxatdagi **har bir** element uchun quyidagini bajar." O'zgaruvchi (`port`) har aylanishda navbatdagi qiymatni oladi.

Sonlar ketma-ketligi uchun — `range`:

```python
for i in range(5):            # 0, 1, 2, 3, 4
    print(i)

for i in range(1, 6):         # 1, 2, 3, 4, 5
    print(i)

for i in range(0, 100, 10):   # 0, 10, 20, ... 90
    print(i)
```

`range(5)` 0 dan boshlanadi va 5 ni **o'z ichiga olmaydi** — kesimdagi kabi.

Matn bo'yicha ham yurish mumkin:

```python
for harf in "kali":
    print(harf)
```

### while — shart bajarilguncha

```python
urinish = 0
while urinish < 3:
    parol = input("Parol: ")
    if parol == "sirli":
        print("Xush kelibsiz")
        break
    urinish += 1
    print(f"Xato. Qoldi: {3 - urinish}")
```

`for` — necha marta takrorlashni bilganingizda; `while` — "falon holat yuz bermaguncha" kerak bo'lganda.

:::warn
`while` sharti hech qachon `False` bo'lmasa — **cheksiz sikl**: dastur to'xtamaydi. Terminalda `Ctrl + C` bilan to'xtating. Odatiy sabab — sikl ichida o'zgaruvchini o'zgartirishni unutish (yuqoridagi `urinish += 1`).
:::

### break va continue

| So'z | Nima qiladi |
|---|---|
| `break` | Sikldan butunlay chiqadi |
| `continue` | Shu aylanishning qolganini o'tkazib, keyingisiga o'tadi |

```python
for qator in qatorlar:
    if qator.startswith("#"):
        continue              # izoh qatorlarini o'tkazib yuborish
    if "STOP" in qator:
        break                 # bu yerda to'xtash
    print(qator)
```

## Hammasi birga

Uch g'oyani birlashtirib, foydali narsa yozamiz. Dastur portlar ro'yxatini oladi va har biri haqida xulosa beradi:

```python
# portlar.py — port raqamlari bo'yicha qisqa xulosa

portlar = [21, 22, 23, 80, 443, 3389, 8080]
shifrlanmagan = [21, 23, 80, 8080]

topilmalar = 0

for port in portlar:
    if port in shifrlanmagan:
        print(f"[!] {port} — shifrlanmagan protokol")
        topilmalar += 1
    elif port == 3389:
        print(f"[!] {port} — RDP: internetga ochiq bo'lmasligi kerak")
        topilmalar += 1
    else:
        print(f"[ ] {port} — izohsiz")

print()
print(f"Jami {len(portlar)} ta port, {topilmalar} ta e'tiborga loyiq")
```

O'zgaruvchilar, ro'yxat, `for`, `if/elif/else`, `in`, hisoblagich, f-string — bu darsdagi hamma narsa shu 15 qatorda. Tarmoq bosqichidagi "Asosiy protokollar" darsining bilimini siz hozir kodga aylantirdingiz.

## Kodni o'qish mashqi

Xavfsizlikchi kodni yozishdan ko'ra ko'proq **o'qiydi**. Quyidagi kodni ishga tushirmasdan, nima chiqarishini ayting:

```python
jami = 0
for i in range(1, 6):
    if i % 2 == 0:
        continue
    jami += i
print(jami)
```

Qadamma-qadam: `i` 1 dan 5 gacha yuradi. Juft sonlar (`2`, `4`) o'tkazib yuboriladi. Qoladi: 1 + 3 + 5 = **9**.

Kodni shunday "boshda bajarish" — eng muhim ko'nikmalardan biri. Notanish skriptni tekshirganda aynan shunday qilasiz.

## Shu yerning o'zida mashq qiling

Python'ni kompyuteringizga o'rnatmasdan ham boshlash mumkin: quyidagi labda haqiqiy Python 3 brauzer ichida ishlaydi. Kodni muharrirda yozasiz, terminalda `python3 fayl.py` bilan ishga tushirasiz, funksiyalaringiz esa yashirin testlar bilan tekshiriladi — xato bo'lsa, qaysi kirishda nima kutilgani ko'rsatiladi.

:::lab python-asoslari

:::try
Quyidagilarni yozing (har biri alohida fayl):

1. **Subnet kalkulyatori.** Foydalanuvchidan prefiksni so'raydi (masalan `26`) va hostlar sonini chiqaradi. `input()` matn qaytarishini unutmang.
2. **Parol tekshiruvchi.** Parolni so'raydi va ayta oladi: uzunligi 12 dan kammi, ichida raqam bormi (`any(c.isdigit() for c in parol)` dan foydalaning yoki sikl bilan o'zingiz tekshiring), "parol" yoki "12345" so'zi uchraydimi.
3. **Son topish o'yini.** Dastur 1 dan 100 gacha son "o'ylaydi" (`import random` va `random.randint(1, 100)`), foydalanuvchi topguncha "kattaroq" yoki "kichikroq" deb javob beradi va oxirida urinishlar sonini aytadi.

Uchinchisi `while`, `if`, hisoblagich va `break` ni birga ishlatishni talab qiladi — bu darsning yakuniy imtihoni.
:::

## Xulosa

- **O'zgaruvchi** — nomlangan qiymat; `=` saqlaydi, `==` solishtiradi.
- Turlar: **int**, **float**, **str**, **bool**; `input()` doim matn qaytaradi — `int()` bilan aylantiring.
- Matn: `len`, `in`, `.split()`, `.lower()`, `.replace()`; indeks **0 dan**; **f-string**.
- `if / elif / else` — birinchi to'g'ri kelgan tarmoq bajariladi; `and`, `or`, `not`.
- `for` — har bir element uchun; `range(n)` — 0 dan n−1 gacha.
- `while` — shart bajarilguncha; cheksiz sikldan ehtiyot bo'ling.
- `break` — chiqish, `continue` — keyingi aylanishga.
- Kodni "boshda bajarish" — o'qishning asosi.

:::quiz
? `x = "5" + "3"` dan keyin `x` ning qiymati nima?
- 8
+ "53"
- "8"
- Xato chiqadi
! Ikkalasi ham matn — matnlar qo'shilmaydi, ulanadi. Son sifatida qo'shish uchun int() kerak.

? `input()` funksiyasi qanday turdagi qiymat qaytaradi?
- int
- Kiritilgan narsaga qarab
+ Doim str (matn)
- bool
! Foydalanuvchi raqam kiritsa ham, input() uni matn sifatida qaytaradi. Hisoblash uchun int() yoki float() bilan aylantirish kerak.

? `=` va `==` orasidagi farq nima?
- Farqi yo'q
+ `=` qiymatni saqlaydi, `==` ikki qiymatni solishtiradi
- `==` qiymatni saqlaydi
- `=` faqat sonlar uchun
! Tayinlash va solishtirish — ikki alohida amal. Shartda `=` yozish — sintaksis xatosi.

? `range(1, 5)` qaysi sonlarni beradi?
- 1, 2, 3, 4, 5
+ 1, 2, 3, 4
- 0, 1, 2, 3, 4
- 2, 3, 4, 5
! Boshlang'ich qiymat kiradi, oxirgisi kirmaydi.

? `s = "linux"` bo'lsa, `s[0]` va `s[-1]` nima?
- Xato chiqadi
- "i" va "u"
+ "l" va "x"
- "linux" va ""
! Indeks 0 dan boshlanadi — s[0] birinchi belgi. Manfiy indeks oxiridan sanaydi — s[-1] oxirgi belgi.

? Quyidagi kod nima chiqaradi: `for i in range(3): print(i * 2)`?
- 2, 4, 6
+ 0, 2, 4
- 0, 1, 2
- 1, 2, 3
! range(3) → 0, 1, 2. Har biri ikkiga ko'paytiriladi: 0, 2, 4.

? `break` va `continue` farqi nima?
- Ikkalasi ham dasturni to'xtatadi
+ break sikldan butunlay chiqadi; continue faqat joriy aylanishni o'tkazib yuboradi
- continue sikldan chiqadi, break davom ettiradi
- Ular faqat while da ishlaydi
! break — sikl tugadi. continue — shu aylanishning qolgani bajarilmaydi, keyingisi boshlanadi.

? `if port == 80 or port == 443:` sharti qachon bajariladi?
- Faqat port bir vaqtda 80 va 443 bo'lsa
+ Port 80 yoki 443 bo'lsa
- Port 80 dan katta bo'lsa
- Hech qachon
! or — kamida bitta shart to'g'ri bo'lsa yetarli. Ikkalasi ham kerak bo'lsa — and.

? `while True:` bilan boshlangan siklda `break` yo'q. Nima bo'ladi?
- Sikl bir marta bajariladi
- Xato chiqadi
+ Cheksiz sikl — dastur o'zi to'xtamaydi
- Sikl umuman bajarilmaydi
! Shart doim True — sikl hech qachon tugamaydi. Terminalda Ctrl+C bilan to'xtatiladi.

? `f"{manzil}:{port}"` yozuvidagi `f` nimani anglatadi?
- Bu fayl nomi
+ Bu f-string: jingalak qavs ichidagi o'zgaruvchilar qiymati matnga qo'yiladi
- Bu float turi
- Bu funksiya
! f-string matn ichiga qiymat joylashning qulay usuli: f"{a}:{b}".

? `7 % 2` va `7 // 2` natijalari?
+ 1 va 3
- 3.5 va 3
- 3 va 1
- 0 va 3.5
! % — qoldiq (7 ni 2 ga bo'lganda 1 qoladi); // — butun bo'lish (3).
:::

:::cards
O'zgaruvchi nima? :: Qiymat saqlanadigan nomlangan “quti”: port = 22.
Python'ning to'rt asosiy turi? :: int (butun son), float (o'nlik son), str (matn), bool (True/False).
= va == farqi? :: = qiymatni saqlaydi (tayinlash); == ikki qiymatni solishtiradi.
input() nima qaytaradi? :: Doim matn (str). Son kerak bo'lsa: int(input(...)).
f-string nima? :: Matn ichiga o'zgaruvchi qo'yish usuli: f"{manzil} porti {port}".
Indeks nechadan boshlanadi? :: 0 dan. s[0] — birinchi belgi, s[-1] — oxirgi.
range(5) va range(1, 6) nimani beradi? :: range(5) — 0,1,2,3,4; range(1, 6) — 1,2,3,4,5.
for va while qachon ishlatiladi? :: for — ketma-ketlikning har bir elementi uchun; while — shart bajarilib turguncha.
break va continue? :: break — sikldan chiqish; continue — keyingi aylanishga o'tish.
and, or, not? :: and — ikkalasi to'g'ri; or — kamida biri to'g'ri; not — inkor.
% va // amallari? :: % — bo'lishdagi qoldiq; // — butun bo'lish.
:::
