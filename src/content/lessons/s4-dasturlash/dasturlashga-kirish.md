"Men dasturchi bo'lmoqchi emasman, menga xavfsizlik kerak" — ko'pchilik shunday o'ylaydi. Lekin zaiflik — bu **koddagi xato**. Zararli dastur — bu **kod**. Himoya vositasi — bu ham **kod**. Kod o'qiy olmaydigan xavfsizlikchi — nota o'qiy olmaydigan musiqa tanqidchisiga o'xshaydi.

Sizdan dasturchi bo'lish talab qilinmaydi. Sizga ikki ko'nikma kerak: **kodni o'qib tushunish** va **o'z ishingizni avtomatlashtirish uchun kichik vositalar yozish**. Bu bosqich shularni beradi.

## Dastur nima

Dastur — kompyuterga beriladigan **aniq ko'rsatmalar ketma-ketligi**. Kompyuter juda tez, lekin mutlaqo "tushunmaydigan" ijrochi: u aynan aytilgan narsani bajaradi — siz nazarda tutgan narsani emas.

Choy damlashni odamga tushuntirish: "choy damlab ber". Kompyuterga tushuntirish:

1. Choynakni ol.
2. Agar choynakda suv bo'lmasa — suv quy.
3. Choynakni yoq.
4. Suv qaynamaguncha — kut.
5. Piyolaga choy sol.
6. Piyolaga qaynoq suv quy.

Bunday aniq qadamlar ketma-ketligi — [[algorithm|algoritm]]. Unda dasturlashning uch asosiy g'oyasi allaqachon bor:

| G'oya | Misolda | Dasturlashda |
|---|---|---|
| **Ketma-ketlik** | Qadamlar tartib bilan | Buyruqlar yuqoridan pastga bajariladi |
| **Shart** | "Agar suv bo'lmasa…" | `if` |
| **Takrorlash** | "Qaynamaguncha kut" | `while`, `for` |

Har qanday dastur — operatsion tizimdan tortib o'yingacha — shu uch g'oyaning birikmasi.

## Dasturlash tillari

Protsessor faqat mashina kodini (ikkilik buyruqlarni) tushunadi. Odam esa unda yoza olmaydi. Dasturlash tili — ular orasidagi ko'prik: odam o'qiy oladigan matn, uni maxsus dastur mashina kodiga aylantiradi.

Aylantirishning ikki usuli bor:

| | [[compiler|Kompilyatsiya]] | [[interpreter|Interpretatsiya]] |
|---|---|---|
| Qanday | Butun dastur **oldindan** mashina kodiga aylantiriladi | Kod ishga tushganda **qatorma-qator** o'qib bajariladi |
| Natija | Tayyor bajariladigan fayl (`.exe`) | Manba kodining o'zi ishga tushiriladi |
| Tezlik | Tez ishlaydi | Sekinroq |
| Qulaylik | O'zgartirish — qayta kompilyatsiya | Yozdingiz — darhol sinab ko'rdingiz |
| Tillar | C, C++, Go, Rust | Python, JavaScript, Bash |

Xavfsizlikda uchraydigan asosiy tillar:

| Til | Qayerda kerak |
|---|---|
| **Python** | Avtomatlashtirish, vositalar, tahlil — sohaning asosiy tili |
| **Bash** | Linux'da buyruqlarni birlashtirish (o'tgan bosqich) |
| **PowerShell** | Windows muhitini boshqarish va tahlil |
| **JavaScript** | Veb — brauzerda ishlaydigan hamma narsa |
| **SQL** | Ma'lumotlar bazalari |
| **C / C++** | Operatsion tizimlar, past darajali zaifliklar, malware tahlili |

Biz **Python**dan boshlaymiz. Sababi oddiy: uni o'qish ingliz tilidagi jumlani o'qishga yaqin, u hamma tizimda ishlaydi va xavfsizlik vositalarining katta qismi unda yozilgan.

:::info
Yaxshi xabar: tillar bir-biriga juda o'xshaydi. O'zgaruvchi, shart, sikl, funksiya — hammasida bor, faqat yozilishi boshqacha. Birinchi tilni o'rganish qiyin; ikkinchisi — bir necha hafta.
:::

## Python'ni o'rnatish

**Kali Linux'da** Python allaqachon bor:

```bash
python3 --version
```

**Windows'da:** `python.org` → **Downloads** → o'rnatuvchini ishga tushiring. Birinchi oynada **"Add python.exe to PATH"** katagini albatta belgilang — aks holda terminal `python` buyrug'ini topa olmaydi. Keyin CMD'da tekshiring:

```
python --version
```

Linux'da buyruq `python3`, Windows'da odatda `python`. Darslarda `python3` deb yozamiz — Windows'da `python` deb o'qing.

## Ikki ish usuli

### Interaktiv rejim

Terminalda `python3` deb yozing — `>>>` belgisi chiqadi. Bu yerda har bir qator darhol bajariladi:

```python
>>> 2 + 2
4
>>> 2 ** 10
1024
>>> "kali".upper()
'KALI'
>>> len("parol123")
8
```

Chiqish: `exit()` yoki `Ctrl + D` (Windows'da `Ctrl + Z`, keyin Enter).

Interaktiv rejim — "qoralama daftar": biror narsa qanday ishlashini bir soniyada tekshirib ko'rish uchun. Tajribali dasturchilar ham undan doim foydalanadi.

### Fayl

Haqiqiy dastur faylga yoziladi. `salom.py` nomli fayl yarating:

```python
# Mening birinchi dasturim
ism = input("Ismingiz nima? ")
print("Salom,", ism)
print("Ismingizda", len(ism), "ta harf bor")
```

Ishga tushiring:

```bash
python3 salom.py
```

Bu to'rt qatorda allaqachon ko'p narsa bor:

- `#` — **izoh**: Python uni e'tiborsiz qoldiradi, u odam uchun.
- `input(...)` — foydalanuvchidan matn so'raydi.
- `ism = ...` — natijani [[variable|o'zgaruvchiga]] saqlaydi.
- `print(...)` — ekranga chiqaradi.
- `len(...)` — uzunlikni hisoblaydi.

### Qayerda yozish kerak

Kod — oddiy matn; uni istalgan muharrirda yozish mumkin. Lekin maxsus muharrir ancha qulay: u xatolarni tagiga chizadi, so'zlarni ranglaydi va to'ldirib beradi.

Tavsiya: **Visual Studio Code** (`code.visualstudio.com`) — bepul, hamma tizimda ishlaydi. O'rnatgach, Python kengaytmasini qo'shing. Kali'da terminalning o'zida `nano` ham yetarli.

## Python'ning bitta g'alati qoidasi: chekinish

Ko'p tillarda kod bloklari qavslar bilan ajratiladi. Python'da — **chekinish** (indentation) bilan:

```python
port = 22

if port == 22:
    print("Bu SSH porti")        # 4 ta bo'sh joy — bu qator if ichida
    print("Ehtiyot bo'ling")     # bu ham
print("Tekshiruv tugadi")        # chekinish yo'q — if dan tashqarida
```

Chekinish — bezak emas, **sintaksisning bir qismi**. Bitta ortiqcha yoki kam bo'sh joy — xato:

```
IndentationError: unexpected indent
```

Qoida: har bir daraja uchun **4 ta bo'sh joy**. `Tab` va bo'sh joyni aralashtirmang (VS Code buni o'zi to'g'rilaydi).

## Xato — bu do'st

Birinchi dasturingiz ishlamaydi. Ikkinchisi ham. Bu normal: dasturlash vaqtining katta qismi — xatolarni topish ([[debugging|debugging]]).

Python xato haqida batafsil xabar beradi. Uni o'qishni o'rganing:

```
Traceback (most recent call last):
  File "salom.py", line 3, in <module>
    print("Salom,", ims)
NameError: name 'ims' is not defined
```

**Pastdan yuqoriga** o'qing:

1. **Oxirgi qator** — xato turi va sababi: `NameError` — `ims` degan nom aniqlanmagan.
2. **Undan yuqorisi** — qayerda: `salom.py`, 3-qator.

Sabab aniq: `ism` o'rniga `ims` deb yozilgan.

Eng ko'p uchraydigan xatolar:

| Xato | Ma'nosi | Odatiy sabab |
|---|---|---|
| `SyntaxError` | Yozilish qoidasi buzilgan | Unutilgan qavs, qo'shtirnoq yoki `:` |
| `IndentationError` | Chekinish noto'g'ri | Bo'sh joylar soni mos emas |
| `NameError` | Bunday nom yo'q | Imlo xatosi, o'zgaruvchi e'lon qilinmagan |
| `TypeError` | Tur mos emas | Matn bilan sonni qo'shishga urinish |
| `ValueError` | Qiymat yaroqsiz | `int("abc")` |
| `FileNotFoundError` | Fayl topilmadi | Yo'l noto'g'ri |
| `IndexError`, `KeyError` | Bunday element yo'q | Ro'yxat chegarasidan chiqish |

:::key
Xato xabari — tanbeh emas, **ko'rsatma**. "Qanday o'rganish kerak" darsidagi tartib bu yerda ham amal qiladi: xabarni to'liq o'qing → qator raqamiga qarang → tushunmasangiz, xato matnini qidiruvga soling. Dasturlashni o'rganish — asosan xato xabarlarini tushunishni o'rganish.
:::

## Qanday o'rganish kerak

Dasturlash — o'qib emas, **yozib** o'rganiladi. Bu bosqich uchun uch qoida:

1. **Kodni ko'chirmang — qo'lda tering.** Sekinroq, lekin barmoqlar ham, miya ham eslab qoladi.
2. **Har bir misolni o'zgartirib ko'ring.** "Bu sonni o'zgartirsam nima bo'ladi? Bu qatorni o'chirsam-chi?"
3. **Kichik, lekin o'zingizning dasturlaringizni yozing.** Darsdagi misol emas — o'zingiz o'ylab topgan narsa.

Bu bosqich oxirida siz jurnal fayllarini tahlil qiladigan, veb-so'rov yuboradigan va fayllar yaxlitligini tekshiradigan o'z vositalaringizni yozasiz.

:::try
1. Python'ni o'rnating va versiyasini tekshiring.
2. Interaktiv rejimda hisoblang: `2 ** 16` (portlar soni tanishmi?), `255 * 255`, `bin(200)`, `hex(255)`, `int("11001000", 2)`. Oxirgi uchtasi — "Sanoq tizimlari" darsining javoblarini tekshirish vositasi.
3. `salom.py` ni yozing va ishga tushiring.
4. Uni ataylab buzing: qavsni o'chiring, o'zgaruvchi nomini noto'g'ri yozing, chekinishni olib tashlang. Har safar xato xabarini o'qib, turini aniqlang.
:::

## Xulosa

- Dastur — aniq ko'rsatmalar ketma-ketligi; uch asos: **ketma-ketlik, shart, takrorlash**.
- **Kompilyatsiya** — oldindan aylantirish (C, Go); **interpretatsiya** — qatorma-qator bajarish (Python).
- **Python** — xavfsizlik sohasining asosiy tili.
- Interaktiv rejim (`>>>`) — tez sinash uchun; fayl (`.py`) — haqiqiy dastur uchun.
- Python'da **chekinish** — sintaksisning bir qismi: 4 ta bo'sh joy.
- Xato xabari **pastdan yuqoriga** o'qiladi: turi, sababi, qator raqami.
- Dasturlash yozib o'rganiladi.

:::quiz
? Algoritm nima?
- Dasturlash tilining nomi
+ Masalani yechish uchun aniq qadamlar ketma-ketligi
- Kompyuter protsessorining qismi
- Xato xabarining turi
! Algoritm — tilga bog'liq bo'lmagan qadamlar rejasi. Dastur — shu rejaning aniq tilda yozilgan ko'rinishi.

? Python qanday til?
- Kompilyatsiya qilinadigan
+ Interpretatsiya qilinadigan — kod qatorma-qator o'qib bajariladi
- Faqat veb-sahifalar uchun
- Faqat Windows'da ishlaydigan
! Python kodi oldindan mashina kodiga aylantirilmaydi; interpretator uni ishga tushirish paytida bajaradi.

? Python'da kod bloki (masalan `if` ichidagi qatorlar) qanday belgilanadi?
- Jingalak qavslar bilan
- Nuqtali vergul bilan
+ Chekinish (bo'sh joylar) bilan
- BEGIN va END so'zlari bilan
! Python'da chekinish sintaksisning bir qismi: bir blokdagi qatorlar bir xil chekinishga ega bo'lishi kerak.

? `NameError: name 'prot' is not defined` xatosi nimani anglatadi?
- Fayl topilmadi
+ `prot` degan nom aniqlanmagan — ehtimol imlo xatosi yoki o'zgaruvchi e'lon qilinmagan
- Chekinish noto'g'ri
- Son matnga qo'shilgan
! NameError — ishlatilayotgan nom mavjud emas. Ko'pincha sabab — noto'g'ri yozilgan o'zgaruvchi nomi.

? Python xato xabarini (traceback) qanday o'qish to'g'ri?
- Faqat birinchi qatorini
+ Pastdan yuqoriga: avval oxirgi qatordagi xato turi va sababi, keyin qator raqami
- Uni o'qish shart emas
- O'rtasidan
! Oxirgi qator xato turi va sababini aytadi; undan yuqoridagi qatorlar xato qayerda yuz berganini ko'rsatadi.

? Nega xavfsizlik mutaxassisiga dasturlash kerak?
+ Zaifliklar koddagi xatolar — ularni tushunish uchun kodni o'qiy olish kerak
+ Takroriy ishlarni avtomatlashtirish uchun
- Chunki u albatta dasturchi bo'lib ishlaydi
- Chunki usiz kompyuterni yoqib bo'lmaydi
! Maqsad dasturchi bo'lish emas: kodni o'qiy olish va o'z ishini avtomatlashtiradigan vositalar yozish.

? Interaktiv rejim (`>>>`) nima uchun qulay?
- Katta dasturlarni saqlash uchun
+ Biror narsa qanday ishlashini darhol sinab ko'rish uchun
- Dasturni tezlashtirish uchun
- Faqat xatolarni yashirish uchun
! Har bir qator darhol bajariladi — bu tez tajriba qilish uchun “qoralama daftar”.

? `print("Javob:", 2 + 2)` nima chiqaradi?
- Javob: 2 + 2
+ Javob: 4
- "Javob:", 4
- Xato
! Qo'shtirnoq ichidagi matn o'zgarishsiz chiqadi, 2 + 2 esa hisoblanadi. print argumentlarni bo'sh joy bilan ajratadi.
:::

:::cards
Algoritm nima? :: Masalani yechish uchun aniq qadamlar ketma-ketligi.
Dasturlashning uch asosiy g'oyasi? :: Ketma-ketlik, shart (if) va takrorlash (sikl).
Kompilyatsiya va interpretatsiya farqi? :: Kompilyatsiya — butun kod oldindan mashina kodiga aylantiriladi (C, Go). Interpretatsiya — kod ishga tushganda qatorma-qator bajariladi (Python).
Python faylini qanday ishga tushiriladi? :: python3 fayl.py
Python'da kod bloki qanday belgilanadi? :: Chekinish bilan — har daraja uchun 4 ta bo'sh joy.
Traceback qanday o'qiladi? :: Pastdan yuqoriga: oxirgi qator — xato turi va sababi; yuqorisida — fayl va qator raqami.
SyntaxError, NameError, TypeError nimani bildiradi? :: SyntaxError — yozilish qoidasi buzilgan; NameError — bunday nom yo'q; TypeError — turlar mos kelmaydi.
print() va input() nima qiladi? :: print — ekranga chiqaradi; input — foydalanuvchidan matn so'raydi.
Python'da izoh qanday yoziladi? :: # belgisidan keyin — qator oxirigacha.
:::
