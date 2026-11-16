O'tgan darsda bitta qiymat bilan ishladingiz: bitta port, bitta manzil. Haqiqiy ishda esa ma'lumot ko'p bo'ladi: yuzlab manzil, minglab jurnal qatori, har bir foydalanuvchi haqida bir necha maydon. Ularni tartibli saqlash uchun **ma'lumot tuzilmalari** kerak.

Va ikkinchi muammo: bir xil kodni qayta-qayta yozmaslik. Buning yechimi — **funksiyalar**.

Bu ikki mavzu sizni "bir necha qator yoza oladigan" darajadan "haqiqiy vosita yoza oladigan" darajaga olib chiqadi.

## Ro'yxat (list)

[[list|Ro'yxat]] — tartiblangan, o'zgartirish mumkin bo'lgan elementlar ketma-ketligi:

```python
portlar = [22, 80, 443]
manzillar = ["10.0.0.1", "10.0.0.2", "10.0.0.3"]
bosh = []
```

Indeks va kesim — matndagi kabi, 0 dan boshlab:

```python
portlar[0]        # 22
portlar[-1]       # 443
portlar[0:2]      # [22, 80]
len(portlar)      # 3
```

Ro'yxatni o'zgartirish:

```python
portlar.append(8080)        # oxiriga qo'shish
portlar.insert(0, 21)       # ko'rsatilgan joyga qo'shish
portlar.remove(80)          # qiymat bo'yicha o'chirish
oxirgi = portlar.pop()      # oxirgisini olib tashlash va qaytarish
portlar[0] = 2222           # elementni almashtirish
portlar.sort()              # saralash (ro'yxatning o'zini o'zgartiradi)
```

Foydali amallar:

```python
443 in portlar              # True — bormi?
sorted(portlar)             # saralangan YANGI ro'yxat
max(portlar), min(portlar), sum(portlar)
portlar.count(22)           # necha marta uchraydi
```

Eng ko'p ishlatiladigan naqsh — bo'sh ro'yxatdan boshlab, sikl ichida to'ldirish:

```python
shubhali = []
for qator in qatorlar:
    if "Failed password" in qator:
        shubhali.append(qator)

print(f"{len(shubhali)} ta muvaffaqiyatsiz urinish")
```

Bu — `grep "Failed password"` ning Python'dagi ko'rinishi.

### Matn ↔ ro'yxat

Jurnal tahlilining asosi — qatorni bo'laklarga ajratish:

```python
qator = "Failed password for root from 203.0.113.45 port 51122 ssh2"
qismlar = qator.split()         # bo'sh joy bo'yicha
qismlar[5]                      # '203.0.113.45'

"192.168.1.10".split(".")       # ['192', '168', '1', '10']
",".join(["a", "b", "c"])       # 'a,b,c' — teskari amal
```

`awk '{print $6}'` ni eslaysizmi? `qator.split()[5]` — aynan shu (awk 1 dan sanaydi, Python 0 dan).

## Lug'at (dict)

[[dictionary|Lug'at]] — **kalit → qiymat** juftliklari. Ro'yxatda elementni tartib raqami bo'yicha topasiz; lug'atda — nomi bo'yicha:

```python
xizmatlar = {
    22: "SSH",
    80: "HTTP",
    443: "HTTPS",
}

xizmatlar[22]                   # 'SSH'
xizmatlar[3389] = "RDP"         # yangi juftlik qo'shish
xizmatlar.get(21, "noma'lum")   # kalit yo'q bo'lsa — standart qiymat
22 in xizmatlar                 # True
del xizmatlar[80]               # o'chirish
```

`xizmatlar[21]` mavjud bo'lmagan kalit uchun `KeyError` beradi; `.get()` esa xato bermaydi — shuning uchun u xavfsizroq.

Lug'at bitta narsa haqidagi bir necha ma'lumotni birga saqlash uchun ham ishlatiladi:

```python
host = {
    "ip": "10.10.10.5",
    "nomi": "web-01",
    "portlar": [22, 80, 443],
    "tirik": True,
}

print(host["nomi"], host["portlar"][0])
```

Lug'at bo'yicha yurish:

```python
for port, nomi in xizmatlar.items():
    print(f"{port} → {nomi}")
```

### Sanash — eng muhim naqsh

Linux bosqichidagi "oltin zanjir"ni eslang: `sort | uniq -c | sort -rn`. Python'da buni lug'at bajaradi:

```python
hisob = {}
for ip in manzillar:
    hisob[ip] = hisob.get(ip, 0) + 1
```

"Shu IP uchun hozirgi sonni ol (bo'lmasa 0), bittaga oshir va qayta saqla." Bu qatorni tushunib oling — u jurnal tahlilining yuragi.

Saralab chiqarish:

```python
for ip, soni in sorted(hisob.items(), key=lambda x: x[1], reverse=True)[:5]:
    print(f"{soni:6} {ip}")
```

Yoki tayyor vosita bilan — xuddi shu natija ikki qatorda:

```python
from collections import Counter
print(Counter(manzillar).most_common(5))
```

:::key
**Guruhla va sana** — tahlilning eng ko'p takrorlanadigan amali. Siz uni allaqachon bir marta o'rgangansiz (`sort | uniq -c | sort -rn`), endi ikkinchi marta — Python lug'ati bilan. Keyinroq uchinchi marta ko'rasiz: SQL'da `GROUP BY`, SIEM tizimlarida `stats count by`. Vosita o'zgaradi, g'oya — yo'q. Shuning uchun vositani emas, **g'oyani** o'rganing.
:::

## Kortej va to'plam

Yana ikki tuzilma — kamroq ishlatiladi, lekin tanib olish kerak:

| | Yozilishi | Xususiyati | Qachon |
|---|---|---|---|
| **tuple** (kortej) | `("10.0.0.5", 22)` | O'zgartirib bo'lmaydi | Birga yuradigan juftlik: manzil va port |
| **set** (to'plam) | `{22, 80, 443}` | Takrorsiz, tartibsiz | Noyob qiymatlar, "bormi?" tekshiruvi |

To'plam takrorlarni o'zi olib tashlaydi:

```python
noyob = set(manzillar)          # sort -u ning o'xshashi
print(len(noyob), "ta noyob manzil")
```

Va to'plamlar ustida amallar — ikki ro'yxatni solishtirish uchun juda qulay:

```python
kecha = {"10.0.0.1", "10.0.0.2", "10.0.0.3"}
bugun = {"10.0.0.2", "10.0.0.3", "10.0.0.9"}

bugun - kecha        # {'10.0.0.9'} — yangi paydo bo'lganlar
kecha - bugun        # {'10.0.0.1'} — yo'qolganlar
kecha & bugun        # ikkalasida ham borlar
```

"Kechagi holatdan nima o'zgardi?" — monitoringning asosiy savoli. Ochiq portlar, ishlayotgan jarayonlar, foydalanuvchilar ro'yxati — hammasini shunday solishtirish mumkin.

### Qaysi birini tanlash

| Savol | Tuzilma |
|---|---|
| Tartib muhimmi, elementlar o'zgaradimi? | **list** |
| Nom bo'yicha qidiramanmi? Sanaymanmi? | **dict** |
| Faqat noyob qiymatlar kerakmi? | **set** |
| O'zgarmas juftlikmi? | **tuple** |

## Funksiyalar

[[function|Funksiya]] — nom berilgan kod bo'lagi: kirish qabul qiladi, ish bajaradi, natija qaytaradi. Siz allaqachon tayyorlaridan foydalangansiz: `print()`, `len()`, `int()`. Endi o'zingiznikini yozasiz.

```python
def hostlar_soni(prefiks):
    return 2 ** (32 - prefiks) - 2

print(hostlar_soni(24))     # 254
print(hostlar_soni(26))     # 62
```

Tuzilishi:

```
def  nomi ( parametrlar ) :
     ↓ chekinish bilan
     funksiya tanasi
     return natija
```

- `def` — e'lon qilish.
- **Parametrlar** — funksiyaga beriladigan kirish.
- `return` — natijani qaytaradi va funksiyani tugatadi.

### print emas, return

Yangi boshlovchilarning eng keng tarqalgan chalkashligi:

```python
def a(x):
    print(x * 2)        # faqat ekranga chiqaradi

def b(x):
    return x * 2        # qiymatni qaytaradi

natija = a(5)           # ekranga 10 chiqadi, lekin natija = None
natija = b(5)           # natija = 10 — endi uni ishlatish mumkin
```

`print` — odam ko'rishi uchun. `return` — dastur keyingi qadamda ishlatishi uchun.

:::tip
Funksiya odatda **qaytarishi** kerak; ekranga chiqarishni esa uni chaqirgan kod hal qiladi. Shunda bitta funksiyani ham ekranga chiqarish, ham faylga yozish, ham boshqa hisob-kitobda ishlatish mumkin bo'ladi.
:::

### Standart qiymatlar va nomli argumentlar

```python
def xabar(matn, daraja="INFO"):
    print(f"[{daraja}] {matn}")

xabar("Tekshiruv boshlandi")                    # [INFO] Tekshiruv boshlandi
xabar("Shubhali kirish", daraja="DIQQAT")       # [DIQQAT] Shubhali kirish
```

### Funksiya — bitta ish

Yaxshi funksiya **bitta narsani** qiladi va nomi shuni aytadi:

```python
def ip_ajrat(qator):
    """Jurnal qatoridan IP manzilni qaytaradi."""
    return qator.split()[10]

def xavfli_portmi(port):
    """Port shifrlanmagan protokolga tegishlimi?"""
    return port in [21, 23, 80, 110, 143]
```

Uch qo'shtirnoq ichidagi matn — **docstring**: funksiya nima qilishini tushuntiradi. `help(ip_ajrat)` uni ko'rsatadi.

Nega funksiyalarga bo'lish kerak?

1. **Takrorlamaslik.** Bir joyda tuzatasiz — hamma joyda tuzaladi.
2. **O'qilishi.** `if xavfli_portmi(port):` — izohsiz ham tushunarli.
3. **Sinash.** Kichik funksiyani alohida tekshirish oson.

### O'zgaruvchining ko'rinish doirasi

Funksiya ichida yaratilgan o'zgaruvchi faqat shu funksiya ichida yashaydi:

```python
def hisobla():
    natija = 42
    return natija

hisobla()
print(natija)       # NameError — natija tashqarida mavjud emas
```

Bu — himoya: funksiyalar bir-birining o'zgaruvchilarini tasodifan buzmaydi.

## Hammasi birga: jurnal tahlilchisi

Bu darsdagi hamma narsani birlashtiramiz. Dastur jurnal qatorlari ro'yxatini oladi va hisobot beradi:

```python
# tahlil.py — kirish urinishlari hisoboti

qatorlar = [
    "Nov 16 03:12:01 srv sshd[2211]: Failed password for root from 203.0.113.45 port 51122 ssh2",
    "Nov 16 03:12:08 srv sshd[2211]: Failed password for admin from 203.0.113.45 port 51135 ssh2",
    "Nov 16 03:12:15 srv sshd[2211]: Failed password for root from 198.51.100.7 port 40112 ssh2",
    "Nov 16 03:12:22 srv sshd[2211]: Failed password for deploy from 203.0.113.45 port 51148 ssh2",
    "Nov 16 03:12:29 srv sshd[2211]: Accepted password for deploy from 203.0.113.45 port 51161 ssh2",
    "Nov 16 09:00:02 srv sshd[2300]: Accepted password for ali from 10.0.0.5 port 50022 ssh2",
]


def ip_ajrat(qator):
    """Jurnal qatoridan manba IP manzilini qaytaradi."""
    return qator.split()[10]


def sanash(qatorlar, kalit_soz):
    """kalit_soz uchragan qatorlardagi IP manzillarni sanaydi."""
    hisob = {}
    for qator in qatorlar:
        if kalit_soz in qator:
            ip = ip_ajrat(qator)
            hisob[ip] = hisob.get(ip, 0) + 1
    return hisob


muvaffaqiyatsiz = sanash(qatorlar, "Failed password")
muvaffaqiyatli = sanash(qatorlar, "Accepted password")

print("Muvaffaqiyatsiz urinishlar:")
for ip, soni in sorted(muvaffaqiyatsiz.items(), key=lambda x: x[1], reverse=True):
    print(f"  {soni:4}  {ip}")

print()
for ip in muvaffaqiyatsiz:
    if ip in muvaffaqiyatli:
        print(f"[!] DIQQAT: {ip} — {muvaffaqiyatsiz[ip]} ta xato urinishdan keyin kira olgan")
```

Natija:

```
Muvaffaqiyatsiz urinishlar:
     3  203.0.113.45
     1  198.51.100.7

[!] DIQQAT: 203.0.113.45 — 3 ta xato urinishdan keyin kira olgan
```

Oxirgi sikl — "Loglar" darsidagi asosiy naqsh, endi avtomatik: **muvaffaqiyatsiz urinishlardan keyin kira olgan manzil**. Bash'da buni yozish ancha noqulay bo'lardi — mana nima uchun Python.

Keyingi darsda bu dasturni haqiqiy fayldan o'qiydigan qilamiz.

:::try
1. Yuqoridagi `tahlil.py` ni qo'lda terib, ishga tushiring.
2. Uni kengaytiring: hujumchi **qaysi foydalanuvchi nomlarini** sinab ko'rganini ham sanang (nom — `qator.split()[8]`).
3. `xavfli_portmi(port)` funksiyasini yozing va uni o'tgan darsdagi `portlar.py` da ishlating.
4. Ikki to'plam bering: kechagi va bugungi ochiq portlar. Dastur "yangi ochilgan" va "yopilgan" portlarni chiqarsin.
5. Interaktiv rejimda sinab ko'ring: `from collections import Counter`, keyin `Counter("mississippi")`. Nima qaytardi va nega?
:::

## Xulosa

- **list** `[...]` — tartiblangan, o'zgaruvchan; `.append()`, `in`, `len()`, `sorted()`.
- **dict** `{kalit: qiymat}` — nom bo'yicha qidirish; `.get(kalit, standart)`, `.items()`.
- Sanash naqshi: `hisob[x] = hisob.get(x, 0) + 1` yoki `Counter`.
- **set** — noyob qiymatlar; `a - b` — farq (nima o'zgardi?).
- `.split()` — matnni ro'yxatga; `.join()` — ro'yxatni matnga.
- **Funksiya**: `def nom(parametrlar): ... return natija`.
- `return` qiymat qaytaradi; `print` faqat ko'rsatadi.
- Bitta funksiya — bitta ish; nomi nima qilishini aytsin.

:::quiz
? `portlar = [22, 80, 443]` bo'lsa, `portlar[1]` nima?
- 22
+ 80
- 443
- Xato
! Indeks 0 dan boshlanadi: portlar[0] = 22, portlar[1] = 80.

? Ro'yxat oxiriga element qo'shadigan metod qaysi?
- add()
+ append()
- push()
- insert()
! append() oxiriga qo'shadi. insert() ko'rsatilgan joyga; add() esa to'plam (set) uchun.

? `xizmatlar = {22: "SSH"}` bo'lsa, `xizmatlar.get(80, "noma'lum")` nima qaytaradi?
- None
- KeyError xatosi
+ "noma'lum"
- 80
! Kalit mavjud bo'lmasa, .get() ikkinchi argumentni qaytaradi. xizmatlar[80] esa KeyError berardi.

? `hisob[ip] = hisob.get(ip, 0) + 1` qatori nima qiladi?
- ip ni lug'atdan o'chiradi
+ ip necha marta uchraganini sanaydi: bor bo'lsa oshiradi, yo'q bo'lsa 1 dan boshlaydi
- Lug'atni saralaydi
- ip ni ro'yxatga qo'shadi
! Bu sanash naqshi: hozirgi qiymatni (yo'q bo'lsa 0) olib, bittaga oshiradi.

? Ro'yxatdagi takrorlarni olib tashlashning eng oson yo'li?
- sort() ni ikki marta chaqirish
+ set(royxat) ga aylantirish
- remove() ni sikl ichida chaqirish
- len() dan foydalanish
! To'plam (set) har bir qiymatni faqat bir marta saqlaydi.

? Funksiyadagi `return` va `print` farqi nima?
- Farqi yo'q
+ return qiymatni chaqirgan kodga qaytaradi; print faqat ekranga chiqaradi
- print qiymatni qaytaradi, return chiqaradi
- return faqat sonlar uchun ishlaydi
! print dan keyin qiymat “yo'qoladi” (funksiya None qaytaradi). return qilingan qiymatni saqlash va ishlatish mumkin.

? `"10.0.0.5".split(".")` nima qaytaradi?
- "10005"
+ ['10', '0', '0', '5']
- [10, 0, 0, 5]
- ('10.0.0.5',)
! split matnni ajratuvchi bo'yicha bo'ladi va matnlar ro'yxatini qaytaradi — elementlar son emas, str.

? `kecha = {22, 80}` va `bugun = {22, 80, 3389}` bo'lsa, `bugun - kecha` nima?
- {22, 80}
+ {3389}
- {22, 80, 3389}
- Xato
! To'plamlar farqi — birinchisida bor, ikkinchisida yo'q elementlar: yangi ochilgan port.

? Funksiya ichida yaratilgan o'zgaruvchiga tashqaridan murojaat qilinsa nima bo'ladi?
- U 0 ga teng bo'ladi
+ NameError — u faqat funksiya ichida mavjud
- U None qaytaradi
- Dastur tezlashadi
! Lokal o'zgaruvchilar faqat o'z funksiyasi ichida yashaydi. Qiymatni tashqariga chiqarish uchun return kerak.

? Kodni funksiyalarga bo'lishning foydasi nima?
+ Bir xil kodni takrorlamaslik
+ Kodni o'qish va sinash osonlashadi
- Dastur doim tezroq ishlaydi
- Xatolar butunlay yo'qoladi
! Funksiyalar takrorni kamaytiradi, kodni tushunarli qiladi va alohida sinash imkonini beradi.
:::

:::cards
list nima va qanday yaratiladi? :: Tartiblangan, o'zgaruvchan ketma-ketlik: portlar = [22, 80, 443].
dict nima? :: Kalit → qiymat juftliklari: {22: "SSH", 80: "HTTP"}.
dict.get(kalit, standart) nima uchun? :: Kalit yo'q bo'lsa xato bermasdan standart qiymatni qaytaradi.
Sanash naqshi (dict bilan)? :: hisob[x] = hisob.get(x, 0) + 1
set nima uchun kerak? :: Noyob qiymatlarni saqlash va to'plamlarni solishtirish (a - b: nima o'zgardi).
split() va join() nima qiladi? :: split — matnni ro'yxatga bo'ladi; join — ro'yxatni matnga birlashtiradi.
Funksiya qanday e'lon qilinadi? :: def nom(parametrlar): ... return natija
return va print farqi? :: return qiymatni chaqirgan kodga qaytaradi; print faqat ekranga chiqaradi.
Ro'yxatga element qo'shish va borligini tekshirish? :: royxat.append(x); x in royxat
Eng ko'p uchragan elementlarni topishning tayyor vositasi? :: from collections import Counter — Counter(royxat).most_common(5)
:::
