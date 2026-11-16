Har bir jiddiy ilovaning yuragida ma'lumotlar bazasi turadi: foydalanuvchilar, parol xeshlari, buyurtmalar, to'lovlar, yozishmalar. Ma'lumot sizib chiqishi haqidagi yangiliklarda "X million foydalanuvchi ma'lumoti o'g'irlandi" deyilganda — gap aynan baza haqida.

Shuning uchun xavfsizlikchi bazalar tilini bilishi shart. SOC analitigi jurnallarni SQL'ga o'xshash tilda qidiradi; AppSec muhandisi so'rovlar xavfsiz yozilganini tekshiradi; va eng mashhur web zaifliklaridan biri — SQL injection — to'liq shu darsdagi bilimga tayanadi.

## Ma'lumotlar bazasi nima

[[database|Ma'lumotlar bazasi]] — tartibli saqlangan ma'lumot va uni boshqaradigan dastur. Eng keng tarqalgan turi — **relyatsion** baza: ma'lumot **jadvallarda** saqlanadi.

Jadval — Excel varag'iga o'xshaydi:

**`foydalanuvchilar`**

| id | ism | email | rol | yaratilgan |
|---|---|---|---|---|
| 1 | Ali | ali@example.com | admin | 2025-01-10 |
| 2 | Vali | vali@example.com | foydalanuvchi | 2025-03-22 |
| 3 | Sami | sami@example.com | foydalanuvchi | 2025-06-05 |

| Atama | Ma'nosi |
|---|---|
| **Jadval** (table) | Bir turdagi narsalar to'plami |
| **Ustun** (column) | Xususiyat: har birining nomi va turi bor |
| **Qator** (row) | Bitta yozuv |
| [[primary-key|Birlamchi kalit]] (primary key) | Har qatorni yagona aniqlaydigan ustun — odatda `id` |

Mashhur relyatsion bazalar: **PostgreSQL**, **MySQL / MariaDB**, **Microsoft SQL Server**, **Oracle**, **SQLite** (bitta faylda yashaydigan kichik baza — telefon ilovalari va brauzerlar ichida).

Ularning hammasi bitta tilda gaplashadi — [[sql|SQL]] (Structured Query Language). Kichik farqlari bor, lekin asosi bir xil.

:::info
Relyatsion bo'lmagan bazalar ham bor — **NoSQL**: MongoDB (hujjatlar), Redis (kalit–qiymat), Elasticsearch (qidiruv). Ularning o'z so'rov tillari bor, lekin "so'rov, filtr, saralash" g'oyalari o'sha-o'sha.
:::

## Mashq muhiti

Hech narsa o'rnatish shart emas — Python bilan birga **SQLite** keladi:

```bash
sqlite3 mashq.db
```

Yoki brauzerda: mavzu manbalaridagi **SQLBolt** — interaktiv darslar, har qadamda so'rovni o'zingiz yozasiz. Bu darsni u bilan birga o'tish — eng yaxshi usul.

## SELECT — ma'lumotni o'qish

Eng ko'p ishlatiladigan buyruq. [[query|So'rov]] deyarli ingliz tilidagi jumla kabi o'qiladi:

```sql
SELECT ism, email FROM foydalanuvchilar;
```

"`foydalanuvchilar` jadvalidan `ism` va `email` ustunlarini **tanla**."

```sql
SELECT * FROM foydalanuvchilar;      -- * — barcha ustunlar
```

SQL kalit so'zlari katta-kichik harfni farqlamaydi (`select` ham ishlaydi), lekin ularni katta harfda yozish — odat: so'rov o'qilishi osonlashadi. `--` dan keyin — izoh. So'rov `;` bilan tugaydi.

### WHERE — filtrlash

```sql
SELECT * FROM foydalanuvchilar WHERE rol = 'admin';
SELECT * FROM foydalanuvchilar WHERE id = 2;
SELECT * FROM foydalanuvchilar WHERE yaratilgan > '2025-03-01';
```

Matn qiymatlari **bittalik qo'shtirnoq** ichida yoziladi; sonlar — qo'shtirnoqsiz.

| Amal | Ma'nosi | Misol |
|---|---|---|
| `=`, `!=` (`<>`) | Teng, teng emas | `rol = 'admin'` |
| `<`, `>`, `<=`, `>=` | Solishtirish | `id > 10` |
| `AND`, `OR`, `NOT` | Mantiqiy bog'lash | `rol = 'admin' AND id > 1` |
| `LIKE` | Namuna bo'yicha | `email LIKE '%@example.com'` |
| `IN` | Ro'yxatdan biri | `rol IN ('admin', 'moderator')` |
| `BETWEEN` | Oraliq | `id BETWEEN 10 AND 20` |
| `IS NULL` | Qiymat yo'q | `telefon IS NULL` |

`LIKE` da `%` — istalgan sondagi belgilar, `_` — bitta belgi. Linux'dagi `*` va `?` ning o'xshashi.

`NULL` — "qiymat yo'q" degan maxsus belgi; u nol ham, bo'sh matn ham emas. Uni `= NULL` bilan emas, faqat `IS NULL` bilan tekshiriladi.

### Saralash va cheklash

```sql
SELECT ism, yaratilgan
FROM foydalanuvchilar
ORDER BY yaratilgan DESC        -- DESC: kamayish; ASC: o'sish (standart)
LIMIT 10;                       -- faqat birinchi 10 ta
```

### Sanash va guruhlash

```sql
SELECT COUNT(*) FROM foydalanuvchilar;

SELECT rol, COUNT(*) AS soni
FROM foydalanuvchilar
GROUP BY rol
ORDER BY soni DESC;
```

Natija:

| rol | soni |
|---|---|
| foydalanuvchi | 2 |
| admin | 1 |

Tanish tuyuldimi? Bu — `sort | uniq -c | sort -rn` va Python'dagi `Counter` — endi SQL'da. Uch xil vosita, bitta g'oya: **guruhla va sana**.

Boshqa agregat funksiyalar: `SUM`, `AVG`, `MIN`, `MAX`.

Jurnal jadvalidan "eng ko'p muvaffaqiyatsiz urinish qilgan manzillar":

```sql
SELECT ip, COUNT(*) AS urinishlar
FROM kirish_jurnali
WHERE natija = 'xato'
GROUP BY ip
HAVING COUNT(*) > 100           -- guruhlashdan KEYINGI filtr
ORDER BY urinishlar DESC
LIMIT 10;
```

`WHERE` qatorlarni guruhlashdan **oldin** filtrlaydi, `HAVING` — guruhlarni **keyin**. SIEM tizimlaridagi so'rov tillari (Splunk SPL, KQL) boshqacha yoziladi, lekin mantig'i aynan shu — bu so'rovni tushungan odam ularni tez o'rganadi.

## Jadvallarni bog'lash: JOIN

Relyatsion bazaning kuchi — jadvallar orasidagi **bog'lanish**. Ma'lumot takrorlanmaydi: buyurtma jadvalida foydalanuvchining ismi emas, uning `id` si saqlanadi.

**`buyurtmalar`**

| id | foydalanuvchi_id | mahsulot | summa |
|---|---|---|---|
| 101 | 1 | Noutbuk | 9000000 |
| 102 | 2 | Sichqoncha | 150000 |
| 103 | 1 | Klaviatura | 400000 |

`foydalanuvchi_id` — **tashqi kalit** (foreign key): boshqa jadvalning birlamchi kalitiga ishora.

Ikkala jadvaldan birga o'qish:

```sql
SELECT f.ism, b.mahsulot, b.summa
FROM buyurtmalar AS b
JOIN foydalanuvchilar AS f ON b.foydalanuvchi_id = f.id;
```

| ism | mahsulot | summa |
|---|---|---|
| Ali | Noutbuk | 9000000 |
| Vali | Sichqoncha | 150000 |
| Ali | Klaviatura | 400000 |

`ON` — jadvallar qaysi ustunlar bo'yicha bog'lanishini aytadi. `AS b` — qisqa taxallus.

Ikki asosiy turi:

| Tur | Natijaga nima kiradi |
|---|---|
| `INNER JOIN` (yoki shunchaki `JOIN`) | Faqat ikkala jadvalda mos keladigan qatorlar |
| `LEFT JOIN` | Chap jadvalning **hamma** qatorlari; o'ngda mos kelmasa — `NULL` |

`LEFT JOIN` bilan "hech narsa buyurtma qilmagan foydalanuvchilar"ni topish mumkin.

## Ma'lumotni o'zgartirish

```sql
INSERT INTO foydalanuvchilar (ism, email, rol)
VALUES ('Dilnoza', 'dilnoza@example.com', 'foydalanuvchi');

UPDATE foydalanuvchilar
SET rol = 'moderator'
WHERE id = 3;

DELETE FROM foydalanuvchilar
WHERE id = 3;
```

:::warn
`UPDATE` va `DELETE` da **`WHERE` ni unutish — halokat**. `DELETE FROM foydalanuvchilar;` jadvaldagi **hamma** qatorni o'chiradi; `UPDATE foydalanuvchilar SET rol = 'admin';` hammani admin qiladi. Odat: avval xuddi shu `WHERE` bilan `SELECT` yozib, qaysi qatorlar tanlanayotganini ko'ring, keyingina uni `UPDATE` yoki `DELETE` ga aylantiring.
:::

To'rt asosiy amal uchun qisqartma: **CRUD** — Create (`INSERT`), Read (`SELECT`), Update (`UPDATE`), Delete (`DELETE`). Veb-ilovalarning ko'p qismi shu to'rt amalning turli ko'rinishlari.

Jadval tuzilishining o'zi bilan ishlaydigan buyruqlar: `CREATE TABLE`, `ALTER TABLE`, `DROP TABLE` (jadvalni butunlay o'chiradi).

## Ilova baza bilan qanday gaplashadi

Endi eng muhim qism. Veb-ilova foydalanuvchi so'roviga javoban SQL so'rov yasaydi va bazaga yuboradi:

```
Brauzer ──HTTP──► Backend kodi ──SQL──► Ma'lumotlar bazasi
   "ali" ni qidir     SELECT ... WHERE ism = 'ali'
```

Savol: backend foydalanuvchi kiritgan qiymatni so'rovga **qanday** qo'yadi? Ikki usul bor — va ular orasidagi farq web xavfsizligidagi eng mashhur zaiflikni keltirib chiqaradi.

### Xavfli usul: matnlarni ulash

```python
# YOMON — hech qachon bunday yozmang
ism = sorov_parametri("ism")
sorov = "SELECT * FROM foydalanuvchilar WHERE ism = '" + ism + "'"
baza.execute(sorov)
```

Bu yerda kiritilgan qiymat so'rov matnining **bir qismiga** aylanadi. Foydalanuvchi oddiy ism yozsa — hammasi joyida. Lekin u ism o'rniga qo'shtirnoq va SQL kalit so'zlarini yozsa-chi? Baza uni ma'lumot emas, **buyruqning davomi** deb tushunadi — va foydalanuvchi so'rovning ma'nosini o'zgartira oladi.

Bu — [[sql-injection|SQL injection]]: kiritilgan **ma'lumot kodga aylanib qolishi**. Oqibatlari jiddiy: boshqalarning ma'lumotini o'qish, tekshiruvlarni chetlab o'tish, ma'lumotni o'zgartirish yoki o'chirish.

Muammoning ildizi bitta: **ma'lumot va buyruq bir matnga aralashtirilgan.** Web darsidagi XSS bilan solishtiring — o'sha yerda ham kiritilgan matn kodga (JavaScript'ga) aylanardi. Bu zaifliklarning butun oilasi — **injection** — bir xil xatodan tug'iladi.

### To'g'ri usul: parametrlangan so'rov

```python
# YAXSHI — parametrlangan so'rov
ism = sorov_parametri("ism")
baza.execute("SELECT * FROM foydalanuvchilar WHERE ism = ?", (ism,))
```

Bu yerda so'rov **qolipi** va **qiymat** bazaga alohida-alohida yuboriladi. Baza avval qolipni tushunadi ("ism bo'yicha qidiraman"), keyin qiymatni faqat **ma'lumot** sifatida joyiga qo'yadi. Foydalanuvchi nima yozmasin — u hech qachon buyruqqa aylanmaydi.

:::key
**SQL so'rovni hech qachon foydalanuvchi kiritgan matnni ulab yasamang.** Har doim parametrlangan so'rov (*prepared statement*) yoki uni o'zi bajaradigan ORM kutubxonasi. Bu — SQL injection'ga qarshi asosiy va deyarli to'liq himoya; qolgan hamma narsa (filtrlar, WAF) — faqat qo'shimcha qatlam.
:::

Kod tekshiruvida belgi oddiy: SQL matni ichida `+`, f-string yoki `.format()` bilan qo'yilgan o'zgaruvchi ko'rsangiz — bu qizil bayroq.

Python'da SQLite bilan to'liq, xavfsiz misol:

```python
import sqlite3

baza = sqlite3.connect("mashq.db")
kursor = baza.cursor()

kursor.execute("""
    CREATE TABLE IF NOT EXISTS foydalanuvchilar (
        id INTEGER PRIMARY KEY,
        ism TEXT NOT NULL,
        rol TEXT DEFAULT 'foydalanuvchi'
    )
""")

kursor.execute("INSERT INTO foydalanuvchilar (ism, rol) VALUES (?, ?)", ("Ali", "admin"))
baza.commit()

qidiruv = input("Ism: ")
kursor.execute("SELECT id, ism, rol FROM foydalanuvchilar WHERE ism = ?", (qidiruv,))
for qator in kursor.fetchall():
    print(qator)

baza.close()
```

## Bazani himoyalash

Parametrlangan so'rov — birinchi qatlam. Baza atrofida yana bir necha himoya bo'lishi kerak:

| Chora | Nima beradi |
|---|---|
| **Eng kam imtiyoz** | Ilova bazaga cheklangan hisob bilan ulanadi: faqat kerakli jadvallar, faqat kerakli amallar. `DROP TABLE` huquqi veb-ilovaga kerak emas |
| **Tarmoqdan yopish** | Baza porti internetga ochiq emas (tarmoq bosqichi); faqat ilova serveridan ulanish mumkin |
| **Parollarni xeshlash** | Bazada parolning o'zi emas, sekin algoritm bilan olingan xeshi saqlanadi — baza sizib chiqsa ham parollar darhol oshkor bo'lmaydi |
| **Sezgir ma'lumotni shifrlash** | Karta raqamlari, hujjat ma'lumotlari |
| **Zaxira nusxa** | Muntazam, sinab ko'rilgan, alohida joyda |
| **Jurnal va monitoring** | Kim qachon nimani so'ragan; g'ayrioddiy katta so'rovlar |
| **Xato xabarlarini yashirish** | Foydalanuvchiga SQL xatosi matni ko'rsatilmaydi — u jadval va ustun nomlarini oshkor qiladi |

Birinchi qator ayniqsa muhim: ilova bazaga `root` yoki to'liq huquqli hisob bilan ulansa, ilovadagi bitta xato butun bazani — ba'zan butun serverni — xavf ostiga qo'yadi. Linux bosqichidagi "xizmat alohida cheklangan hisobdan ishlaydi" qoidasining aynan o'zi.

:::try
**1.** SQLBolt'dagi 1–12-darslarni o'ting (mavzu manbalarida) — har birida so'rovni o'zingiz yozasiz.

**2.** O'z bazangizni yarating. Terminalda `sqlite3 mashq.db`, keyin:

```sql
CREATE TABLE kirishlar (id INTEGER PRIMARY KEY, ip TEXT, foydalanuvchi TEXT, natija TEXT);
INSERT INTO kirishlar (ip, foydalanuvchi, natija) VALUES
  ('203.0.113.45', 'root', 'xato'),
  ('203.0.113.45', 'admin', 'xato'),
  ('203.0.113.45', 'deploy', 'xato'),
  ('203.0.113.45', 'deploy', 'muvaffaqiyat'),
  ('198.51.100.7', 'root', 'xato'),
  ('10.0.0.5', 'ali', 'muvaffaqiyat');
```

Endi so'rovlar yozing:

- Barcha muvaffaqiyatsiz urinishlar.
- Har bir IP dan nechta muvaffaqiyatsiz urinish bo'lgan (kamayish tartibida).
- Qaysi foydalanuvchi nomlari sinab ko'rilgan (takrorlarsiz — `SELECT DISTINCT`).
- Ham xato, ham muvaffaqiyatli urinishi bor IP manzillar.

**3.** Yuqoridagi Python misolini ishga tushiring va uni shu `kirishlar` jadvali bilan ishlaydigan qilib o'zgartiring.
:::

## Bosqich yakuni

Dasturlash bosqichi tugadi. Siz endi Python'da o'z vositalaringizni yozasiz, kodni Git bilan boshqarasiz, veb-sahifa va ma'lumotlar bazasi qanday ishlashini tushunasiz. Eng muhimi — **kodni o'qiy olasiz**: zaifliklarning ko'pi aynan shu yerda yashaydi.

Keyingi bosqich — poydevorning oxirgisi: xavfsizlikning umumiy tushunchalari. U yerda shu paytgacha o'rgangan hamma narsa bitta manzaraga birlashadi.

## Xulosa

- Relyatsion baza — **jadvallar**: ustunlar, qatorlar, birlamchi kalit.
- `SELECT ustunlar FROM jadval WHERE shart ORDER BY ... LIMIT ...`.
- `LIKE` (`%`, `_`), `IN`, `BETWEEN`, `IS NULL`.
- `COUNT`, `GROUP BY`, `HAVING` — guruhlash va sanash.
- `JOIN ... ON` — jadvallarni kalit bo'yicha bog'lash.
- `INSERT`, `UPDATE`, `DELETE` — **`WHERE` ni unutmang**.
- **SQL injection** — kiritilgan ma'lumotning so'rov kodiga aylanishi; sababi — matnlarni ulash.
- Himoya — **parametrlangan so'rovlar**; qo'shimcha: eng kam imtiyoz, tarmoqdan yopish, parollarni xeshlash.

:::quiz
? `SELECT ism FROM foydalanuvchilar WHERE rol = 'admin';` so'rovi nima qiladi?
- Barcha foydalanuvchilarni o'chiradi
+ Roli admin bo'lgan foydalanuvchilarning ismlarini qaytaradi
- Hamma foydalanuvchini admin qiladi
- Yangi jadval yaratadi
! SELECT — o'qish; WHERE — faqat sharti to'g'ri keladigan qatorlar.

? `DELETE FROM buyurtmalar;` (WHERE siz) nima qiladi?
- Hech narsa — xato beradi
- Faqat oxirgi qatorni o'chiradi
+ Jadvaldagi barcha qatorlarni o'chiradi
- Jadvalni nusxalaydi
! WHERE bo'lmasa, amal hamma qatorga qo'llanadi. Avval xuddi shu shart bilan SELECT yozib tekshirish — yaxshi odat.

? `email LIKE '%@gmail.com'` sharti nimaga mos keladi?
- Aynan “%@gmail.com” matniga
+ @gmail.com bilan tugaydigan barcha manzillarga
- gmail so'zi bilan boshlanadiganlarga
- Hech narsaga
! LIKE da % — istalgan sondagi istalgan belgilar. Bu yerda u manzil boshidagi qismni almashtiradi.

? Har bir roldagi foydalanuvchilar sonini qaysi so'rov beradi?
- SELECT rol FROM foydalanuvchilar ORDER BY rol;
+ SELECT rol, COUNT(*) FROM foydalanuvchilar GROUP BY rol;
- SELECT COUNT(rol) FROM foydalanuvchilar WHERE rol;
- SELECT * FROM foydalanuvchilar LIMIT rol;
! GROUP BY qatorlarni rol bo'yicha guruhlaydi, COUNT(*) har guruhdagi qatorlarni sanaydi.

? JOIN nima uchun ishlatiladi?
- Jadvalni o'chirish uchun
+ Ikki jadval ma'lumotini umumiy ustun (kalit) bo'yicha birlashtirib o'qish uchun
- Ma'lumotni shifrlash uchun
- So'rovni tezlashtirish uchun
! Relyatsion bazada ma'lumot jadvallarga bo'lingan; JOIN ularni kalit orqali bog'laydi.

? SQL injection zaifligining asosiy sababi nima?
- Baza juda katta
+ Foydalanuvchi kiritgan matn so'rov matniga to'g'ridan-to'g'ri ulanadi va kod sifatida talqin qilinadi
- Parol qisqa
- Server sekin
! Ma'lumot va buyruq bitta matnga aralashganda, kiritilgan qiymat so'rov tuzilishini o'zgartira oladi.

? SQL injection'ga qarshi asosiy himoya qaysi?
- Baza portini o'zgartirish
- Foydalanuvchilarga ogohlantirish yozish
+ Parametrlangan so'rovlar (prepared statements)
- So'rovlarni katta harfda yozish
! Parametrlangan so'rovda qolip va qiymat alohida yuboriladi — qiymat hech qachon buyruqqa aylanmaydi.

? Kod tekshiruvida quyidagi qatorni ko'rdingiz: `sorov = "SELECT * FROM t WHERE id = " + user_id`. Bu nima?
- Yaxshi amaliyot
+ Qizil bayroq — kiritilgan qiymat so'rov matniga ulanmoqda
- Sintaksis xatosi
- Parametrlangan so'rov
! SQL matni ichiga o'zgaruvchini ulash (+, f-string, format) — injection xavfi belgisi.

? Veb-ilova bazaga qanday hisob bilan ulanishi kerak?
- root yoki to'liq huquqli administrator hisobi bilan
+ Faqat kerakli jadval va amallarga ruxsati bor cheklangan hisob bilan
- Parolsiz
- Har safar yangi hisob bilan
! Eng kam imtiyoz: ilovadagi xato butun bazani xavf ostiga qo'ymasligi uchun huquqlar minimal bo'lishi kerak.

? Nega foydalanuvchiga SQL xato xabarining to'liq matnini ko'rsatmaslik kerak?
- U juda uzun
+ U jadval va ustun nomlari kabi ichki tuzilishni oshkor qiladi
- U brauzerni buzadi
- U bazani o'chiradi
! Batafsil xato — hujumchi uchun bepul ma'lumot. Foydalanuvchiga umumiy xabar, tafsilot esa jurnalga.

? WHERE va HAVING farqi nima?
- Farqi yo'q
+ WHERE qatorlarni guruhlashdan oldin filtrlaydi; HAVING guruhlarni guruhlashdan keyin
- HAVING faqat sonlar uchun
- WHERE faqat JOIN bilan ishlaydi
! “100 dan ko'p urinish qilgan IP lar” kabi shart agregat natijasiga qo'yiladi — bu HAVING.
:::

:::cards
Relyatsion baza qanday tuzilgan? :: Jadvallardan: ustunlar (xususiyatlar), qatorlar (yozuvlar) va birlamchi kalit (har qatorni yagona aniqlaydi).
SELECT so'rovining to'liq shakli? :: SELECT ustunlar FROM jadval WHERE shart ORDER BY ustun LIMIT n;
LIKE dagi % va _ nimani bildiradi? :: % — istalgan sondagi belgilar; _ — aynan bitta belgi.
Guruhlab sanash so'rovi? :: SELECT ustun, COUNT(*) FROM jadval GROUP BY ustun ORDER BY COUNT(*) DESC;
JOIN nima qiladi? :: Ikki jadvalni umumiy kalit bo'yicha birlashtiradi: ... JOIN b ON a.id = b.a_id
CRUD nima? :: Create (INSERT), Read (SELECT), Update (UPDATE), Delete (DELETE).
UPDATE va DELETE dagi asosiy xavf? :: WHERE ni unutish — amal jadvaldagi barcha qatorga qo'llanadi.
SQL injection nima? :: Foydalanuvchi kiritgan ma'lumotning SQL so'rov kodiga aylanib qolishi.
SQL injection'ga qarshi asosiy himoya? :: Parametrlangan so'rovlar: qolip va qiymat bazaga alohida yuboriladi.
Bazani himoyalashning qo'shimcha choralari? :: Eng kam imtiyozli hisob, tarmoqdan yopish, parollarni xeshlash, zaxira nusxa, xato xabarlarini yashirish.
WHERE va HAVING farqi? :: WHERE — guruhlashdan oldin qatorlarni filtrlaydi; HAVING — guruhlashdan keyin guruhlarni.
:::
