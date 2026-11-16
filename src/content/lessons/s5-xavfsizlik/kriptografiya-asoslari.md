Kafedagi ochiq Wi-Fi orqali bank ilovasiga kirdingiz. Trafigingiz notanish router, provayder va o'nlab oraliq tarmoqlardan o'tdi — va hech kim parolingizni o'qiy olmadi. Messenjerdagi xabaringizni xizmat egasi ham o'qiy olmaydi. O'g'irlangan noutbukdagi fayllar o'g'ri uchun foydasiz baytlar to'plami.

Bularning hammasi ortida bitta fan turadi — **kriptografiya**. Shu paytgacha "shifrlangan" degan so'zni ko'p uchratdingiz: HTTPS, SSH, VPN, TLS. Endi uning ichiga qaraymiz.

Yaxshi xabar: matematikani bilish shart emas. Sizga kerak bo'lgani — **qaysi vosita qaysi muammoni hal qilishini** va **qayerda xato qilinishini** tushunish.

## Kriptografiya nimani beradi

Kriptografiya faqat "yashirish" emas. U to'rt maqsadga xizmat qiladi:

| Maqsad | Savol | Vosita |
|---|---|---|
| **Maxfiylik** | Begona o'qiy oladimi? | Shifrlash |
| **Yaxlitlik** | Yo'lda o'zgartirilmadimi? | Xesh, MAC |
| **Autentiklik** | Bu haqiqatan o'sha kishidanmi? | Raqamli imzo, sertifikat |
| **Rad etib bo'lmaslik** | Jo'natuvchi keyin inkor qila oladimi? | Raqamli imzo |

CIA darsidagi tushunchalar — endi ularni ta'minlaydigan mexanizmlar bilan.

## Asosiy atamalar

| Atama | Ma'nosi |
|---|---|
| [[plaintext|Plaintext]] | Ochiq, o'qiladigan ma'lumot |
| [[ciphertext|Ciphertext]] | Shifrlangan ma'lumot |
| **Algoritm** (cipher) | Shifrlash va ochish qoidasi |
| [[key|Kalit]] | Algoritmga beriladigan maxfiy qiymat |
| [[encryption|Shifrlash]] / deshifrlash | Ochiq matn ↔ shifrlangan matn |

```
                 kalit                          kalit
                   │                              │
Ochiq matn ──► [ Shifrlash ] ──► Shifrlangan ──► [ Deshifrlash ] ──► Ochiq matn
"Salom"                           "x8F#k2..."                         "Salom"
```

Va eslatma — "Ma'lumotni kodlash" darsidagi eng muhim farq:

| | Kodlash | Shifrlash | Xeshlash |
|---|---|---|---|
| Kalit | Yo'q | **Bor** | Yo'q |
| Qaytarish | Hamma | Faqat kalit egasi | Mumkin emas |

## Kerckhoffs tamoyili

Zamonaviy kriptografiyaning asosiy qoidasi XIX asrda aytilgan:

:::key
**Tizim xavfsizligi algoritmning sirligiga emas, faqat kalitning sirligiga tayanishi kerak.** Algoritm hammaga ma'lum bo'lsa ham, kalitsiz uni buzib bo'lmasligi kerak.
:::

Shuning uchun bugun ishlatiladigan barcha jiddiy algoritmlar (AES, RSA) **ochiq**: ularni dunyo bo'ylab minglab mutaxassis yillar davomida sinab ko'rgan va buza olmagan. "Biz o'zimiz ishlab chiqqan maxfiy shifrlash algoritmi" degan gap — maqtov emas, **ogohlantirish belgisi**. CIA darsidagi "yashirish — himoya emas" tamoyilining aynan o'zi.

Bundan kelib chiqadigan amaliy qoida: **o'z kriptografiyangizni yozmang.** Sinalgan kutubxonadan foydalaning.

## Eski shifrlar: nega ular ishlamaydi

Tarixiy shifrlar bugun o'yinchoq, lekin ular asosiy g'oyalarni yaxshi ko'rsatadi.

**Sezar shifri** — har bir harf alifboda bir xil qadamga suriladi. Kalit — qadam soni:

```
Kalit = 3
Ochiq:       S A L O M
Shifrlangan: V D O R P
```

Muammosi: kalit atigi 25 ta variant — hammasini qo'lda sinab chiqish mumkin. Kalit **maydoni** kichik.

**O'rniga qo'yish shifri** — har harf boshqa harfga almashtiriladi. Variantlar juda ko'p, lekin u ham oson buziladi: tilda harflar turli chastotada uchraydi. Eng ko'p uchragan belgi — katta ehtimol bilan eng ko'p ishlatiladigan harf. Bu **chastota tahlili**.

**XOR** — ikki bitni solishtiruvchi amal: bitlar har xil bo'lsa — 1, bir xil bo'lsa — 0.

| A | B | A ⊕ B |
|---|---|---|
| 0 | 0 | 0 |
| 0 | 1 | 1 |
| 1 | 0 | 1 |
| 1 | 1 | 0 |

Uning ajoyib xususiyati: **ikki marta XOR — asl holatga qaytaradi**. `(A ⊕ K) ⊕ K = A`. Shuning uchun bitta amal ham shifrlaydi, ham ochadi — va XOR zamonaviy shifrlarning asosiy "g'ishti".

Lekin qisqa, takrorlanuvchi kalit bilan XOR — zaif: ochiq matnning bir qismi ma'lum bo'lsa, kalit darhol topiladi (`C ⊕ A = K`).

Bu shifrlarni Amaliyot bo'limidagi **"Sezarning maktubi"** va **"Bitta baytli kalit"** CTF topshiriqlarida o'zingiz ochib ko'rasiz — va nega ular himoya emasligini his qilasiz.

Saboqlar: kalit maydoni katta bo'lishi kerak; shifrlangan matn ochiq matnning statistik izlarini saqlamasligi kerak; kalit takrorlanmasligi kerak.

## Simmetrik shifrlash

[[symmetric|Simmetrik shifrlash]] — shifrlash va ochish uchun **bitta kalit**.

```
Ali                                              Vali
 │    ┌──── bir xil maxfiy kalit ────┐            │
 ▼    ▼                              ▼            ▼
"Salom" ──[shifrlash]──► x8F#k2 ──[ochish]──► "Salom"
```

Uy kaliti kabi: bir xil kalit ham qulflaydi, ham ochadi.

Bugungi standart — [[aes|AES]] (Advanced Encryption Standard). Kalit uzunligi 128, 192 yoki 256 bit.

Kalit uzunligi nimani anglatadi? Har bir qo'shimcha bit variantlar sonini **ikki baravar** oshiradi. 128 bitli kalit — 2¹²⁸ ta variant; bu son shunchalik kattaki, dunyodagi barcha kompyuterlar birgalikda ham ularni koinot yoshidan uzoqroq vaqt sinab chiqadi. AES ni kalitni terib topish orqali buzish amalda mumkin emas.

Eskirganlari — tanib olish uchun: **DES** (kalit atigi 56 bit — bugun soatlar ichida teriladi), **3DES**, **RC4**. Ularni ko'rsangiz — bu topilma.

**Afzalligi:** juda tez — gigabaytlab ma'lumotni shifrlashga yaraydi.

**Muammosi:** kalitni ikkinchi tomonga **qanday yetkazasiz?** Uni shifrlanmagan kanal orqali yuborsangiz — tinglovchi ham oladi. Shifrlash uchun kalit kerak, kalitni yetkazish uchun esa shifrlash. Bu — **kalit almashish muammosi**, va u asrlar davomida hal qilinmagan edi.

### Rejimlar haqida bir og'iz

AES ma'lumotni 16 baytli bloklarda shifrlaydi. Bloklarni qanday bog'lash — **rejim** — ham muhim. Eng sodda rejim (**ECB**) har blokni mustaqil shifrlaydi, natijada bir xil ochiq bloklar bir xil shifrlangan bloklarni beradi — ma'lumotning "shakli" ko'rinib qoladi. To'g'ri tanlov — zamonaviy rejimlar (**GCM**), ular yaxlitlikni ham tekshiradi.

Xulosa oddiy: "AES ishlatyapmiz" degan gap hali yetarli emas — **qanday** ishlatilayotgani ham muhim. Va yana bir marta: tayyor, sinalgan kutubxona.

## Asimmetrik shifrlash

1970-yillarda kalit almashish muammosining yechimi topildi — va bu zamonaviy internetni mumkin qildi.

[[asymmetric|Asimmetrik shifrlash]] — **juft kalit**: [[public-key|ochiq va yopiq kalit]]. Ular matematik bog'langan, lekin biridan ikkinchisini hisoblab bo'lmaydi.

| | Ochiq kalit (public) | Yopiq kalit (private) |
|---|---|---|
| Kimda | Hammada — erkin tarqatiladi | **Faqat egasida** |
| Vazifasi | Shifrlaydi; imzoni tekshiradi | Ochadi; imzo qo'yadi |

Qoida: **bir kalit bilan qilingan ishni faqat ikkinchisi qaytara oladi.**

```
Ali Valiga maxfiy xabar yubormoqchi:

"Salom" ──[Valining OCHIQ kaliti]──► x8F#k2 ──[Valining YOPIQ kaliti]──► "Salom"
```

O'xshatish: Vali hammaga ochiq **qulflar** tarqatadi, kalitini esa o'zida saqlaydi. Istalgan kishi qutini uning qulfi bilan qulflay oladi — lekin ochishni faqat Vali uddalaydi. Qulfni (ochiq kalitni) dushman ko'rsa ham foydasi yo'q.

Kalit almashish muammosi hal bo'ldi: maxfiy narsani yuborish shart emas — **ochiq** kalitni ochiq kanal orqali yuborsa bo'ladi.

Asosiy algoritmlar: [[rsa|RSA]] (kalit 2048 bit va undan uzun) va **ECC** — elliptik egri chiziqlar (ancha qisqa kalit bilan o'sha darajadagi himoya; SSH darsidagi `ed25519` — shu oiladan).

Siz buni allaqachon ishlatgansiz: **SSH kaliti**. Ochiq kalit serverda, yopiq kalit sizda — aynan shu sxema.

**Kamchiligi:** simmetrikdan yuzlab marta **sekin**. Katta ma'lumotni u bilan shifrlash amaliy emas.

## Gibrid sxema: ikkalasining eng yaxshisi

| | Simmetrik | Asimmetrik |
|---|---|---|
| Tezlik | Tez | Sekin |
| Kalit almashish | Muammo | Hal qilingan |

Yechim — ikkalasini birlashtirish. Amalda deyarli hamma joyda shunday qilinadi:

1. **Asimmetrik** usul bilan tomonlar bitta vaqtinchalik **simmetrik kalitni** xavfsiz kelishib oladi.
2. Keyin butun ma'lumot shu kalit bilan, **simmetrik** (tez) shifrlanadi.

HTTPS, SSH, VPN, messenjerlar — hammasi shu sxemada ishlaydi. Keyingi darslardan birida TLS misolida buni batafsil ko'rasiz.

Kalit kelishishning maxsus usuli — **Diffie–Hellman**: ikki tomon ochiq kanal orqali gaplashib, tinglovchi bila olmaydigan umumiy sirni hosil qiladi. Uning zamonaviy ko'rinishi har bir seans uchun **yangi** kalit yaratadi — bu **forward secrecy**: server kaliti keyinchalik o'g'irlansa ham, avval yozib olingan seanslarni ochib bo'lmaydi.

## Raqamli imzo

Asimmetrik juftlikni teskari yo'nalishda ishlatsa-chi?

[[digital-signature|Raqamli imzo]]: **yopiq** kalit bilan imzolanadi, **ochiq** kalit bilan tekshiriladi.

```
Imzolash (Ali):     hujjat ──► xesh ──[Alining YOPIQ kaliti]──► imzo

Tekshirish (hamma): imzo ──[Alining OCHIQ kaliti]──► xesh  ═?═  hujjatning xeshi
```

Butun hujjat emas, uning **xeshi** imzolanadi (tez va qisqa). Tekshiruvchi hujjat xeshini o'zi hisoblab, imzodan chiqqani bilan solishtiradi.

Imzo ikki narsani isbotlaydi:

- **Autentiklik** — uni faqat yopiq kalit egasi yarata olardi.
- **Yaxlitlik** — hujjatning bitta biti o'zgarsa, xesh mos kelmaydi.

Shifrlash bilan adashtirmang:

| Maqsad | Qaysi kalit bilan | Kim bajara oladi |
|---|---|---|
| **Shifrlash** (maxfiylik) | Qabul qiluvchining **ochiq** kaliti | Hamma |
| **Imzolash** (autentiklik) | Jo'natuvchining **yopiq** kaliti | Faqat egasi |

Imzo ma'lumotni yashirmaydi — imzolangan hujjatni hamma o'qiy oladi. U faqat "kimdan" va "o'zgarmaganmi" degan savollarga javob beradi.

Qayerda uchratgansiz: dastur yangilanishlari va Linux paketlari (imzo tekshirilgach o'rnatiladi), Git commit'lari, veb-sertifikatlar, elektron hujjat aylanishi.

## Kalitlarni boshqarish — eng zaif bo'g'in

Algoritmlar mustahkam. Haqiqiy hayotda kriptografiya deyarli doim **boshqa joyda** sinadi:

| Xato | Oqibat |
|---|---|
| Kalit kodga yoki Git'ga yozilgan | Kalit oshkor — shifrlash foydasiz |
| Kalit shifrlangan ma'lumot yonida saqlanadi | Seyf kaliti seyf ustida turibdi |
| Zaif yoki standart parol kalitni himoya qiladi | Parol terib topiladi |
| Kalit hech qachon almashtirilmaydi | Bitta sizish — abadiy sizish |
| Eskirgan algoritm (DES, MD5, RC4) | Amalda buziladigan himoya |
| O'zi yozilgan "kriptografiya" | Deyarli aniq zaif |
| Tasodifiylik yomon | Kalitni bashorat qilish mumkin |

Shuning uchun mutaxassislar aytadi: **kriptografiya odatda buzilmaydi — chetlab o'tiladi.** Hujumchi AES ni terishga urinmaydi; u kalit yozilgan faylni, xotiradagi kalitni yoki parolni aytib beradigan odamni qidiradi.

Tekshiruvda so'raladigan savollar: kalit qayerda saqlanadi? Kimda unga kirish huquqi bor? Qachon almashtirilgan? Qaysi algoritm va qaysi rejim?

## Saqlashdagi va uzatishdagi shifrlash

Ma'lumot uch holatda bo'ladi va har biri alohida himoyalanadi:

| Holat | Inglizcha | Himoya |
|---|---|---|
| Saqlanayotgan | Data **at rest** | Disk shifrlash (BitLocker, LUKS), bazani shifrlash |
| Uzatilayotgan | Data **in transit** | TLS, VPN, SSH |
| Ishlatilayotgan | Data **in use** | Eng qiyini — xotirada u ochiq turadi |

"Kompyuter qanday ishlaydi" darsidan eslaysiz: dastur ishlashi uchun ma'lumot RAM'da ochiq bo'lishi kerak. Disk shifrlash **o'chirilgan** noutbukni himoya qiladi; yoqilgan va qulfdan chiqarilgan tizimni — yo'q.

**End-to-end shifrlash** (E2EE) — ma'lumot jo'natuvchi qurilmasida shifrlanib, faqat qabul qiluvchi qurilmasida ochiladi; o'rtadagi server ham o'qiy olmaydi. HTTPS esa faqat siz va server orasini himoya qiladi — serverning o'zi ma'lumotni ko'radi.

:::try
**1. Sezar shifrini qo'lda.** "KALI" so'zini 3 qadamli Sezar shifri bilan shifrlang. Keyin `WDUPRT` ni oching (qadam ham 3).

**2. XOR ni Python'da.**

```python
ochiq = b"Salom"
kalit = 0x2A
shifr = bytes(b ^ kalit for b in ochiq)
print(shifr.hex())
qayta = bytes(b ^ kalit for b in shifr)
print(qayta)
```

Ikkinchi XOR asl matnni qaytardimi? Endi tasavvur qiling: siz faqat `shifr` ni va matn `S` harfi bilan boshlanishini bilasiz. Kalitni qanday topasiz? (`shifr[0] ^ ord("S")`.)

**3. CTF.** Amaliyot bo'limidagi "Sezarning maktubi" va "Bitta baytli kalit" topshiriqlarini yeching.

**4. Kundalik hayot.** Telefoningiz va noutbukingizda disk shifrlash yoqilganmi? (Windows: BitLocker yoki "Device encryption"; zamonaviy telefonlarda odatda standart holatda yoqilgan.)

*1-savol javobi: KALI → NDOL; WDUPRT → TARMOQ.*
:::

## Xulosa

- Kriptografiya: **maxfiylik, yaxlitlik, autentiklik, rad etib bo'lmaslik**.
- **Kerckhoffs**: xavfsizlik kalitda, algoritm sirida emas. O'z kriptografiyangizni yozmang.
- **Simmetrik** (AES): bitta kalit, tez; muammo — kalitni yetkazish.
- **Asimmetrik** (RSA, ECC): ochiq kalit shifrlaydi, yopiq kalit ochadi; sekin.
- **Gibrid**: asimmetrik bilan kalit kelishiladi, simmetrik bilan ma'lumot shifrlanadi.
- **Raqamli imzo**: yopiq kalit bilan imzolanadi, ochiq kalit bilan tekshiriladi — autentiklik va yaxlitlik.
- Eskirgan: DES, 3DES, RC4, ECB rejimi.
- Kriptografiya odatda buzilmaydi — **chetlab o'tiladi**: kalitlarni boshqarish — eng zaif bo'g'in.
- At rest, in transit, in use; E2EE — o'rtadagi server ham o'qiy olmaydi.

:::quiz
? Simmetrik shifrlashning asosiy muammosi nima?
- U juda sekin
+ Maxfiy kalitni ikkinchi tomonga xavfsiz yetkazish
- U faqat matn uchun ishlaydi
- Uni buzish oson
! Ikkala tomon bitta kalitni bilishi kerak. Uni ochiq kanal orqali yuborish — tinglovchiga ham berish demak.

? Ali Valiga asimmetrik shifrlash bilan maxfiy xabar yubormoqchi. U qaysi kalit bilan shifrlaydi?
- O'zining yopiq kaliti bilan
- O'zining ochiq kaliti bilan
+ Valining ochiq kaliti bilan
- Valining yopiq kaliti bilan
! Qabul qiluvchining ochiq kaliti bilan shifrlanadi — uni faqat qabul qiluvchining yopiq kaliti ochadi.

? Raqamli imzo qaysi kalit bilan yaratiladi?
+ Imzolovchining yopiq kaliti bilan
- Imzolovchining ochiq kaliti bilan
- Qabul qiluvchining ochiq kaliti bilan
- Umumiy parol bilan
! Yopiq kalit faqat egasida — shuning uchun imzo uning egasidan ekanini isbotlaydi. Tekshirish — ochiq kalit bilan.

? Raqamli imzo nimani ta'minlamaydi?
- Autentiklikni
- Yaxlitlikni
+ Maxfiylikni
- Rad etib bo'lmaslikni
! Imzolangan hujjatni hamma o'qiy oladi. Maxfiylik uchun alohida shifrlash kerak.

? Kerckhoffs tamoyiliga ko'ra tizim xavfsizligi nimaga tayanishi kerak?
- Algoritmning sir saqlanishiga
+ Faqat kalitning sir saqlanishiga
- Kompyuter tezligiga
- Dasturchining tajribasiga
! Algoritm ochiq va sinalgan bo'lishi kerak; sir — faqat kalit.

? Nega HTTPS va SSH da ham asimmetrik, ham simmetrik shifrlash ishlatiladi?
- Ikki marta shifrlash xavfsizroq bo'lgani uchun
+ Asimmetrik bilan kalit xavfsiz kelishiladi, simmetrik bilan esa ma'lumot tez shifrlanadi
- Qonun shunday talab qiladi
- Asimmetrik usul eskirgani uchun
! Gibrid sxema ikkalasining kuchli tomonini birlashtiradi: xavfsiz kalit almashish va tezlik.

? “Biz o'zimiz ishlab chiqqan maxfiy shifrlash algoritmidan foydalanamiz” degan gapga qanday qarash kerak?
- Bu eng xavfsiz yondashuv
+ Bu ogohlantirish belgisi — sinalmagan algoritm deyarli aniq zaif
- Bu standart amaliyot
- Bu farqi yo'q
! Jiddiy algoritmlar ochiq va yillar davomida sinalgan. O'zi yozilgan kriptografiya — klassik xato.

? Quyidagilardan qaysi biri eskirgan va ishlatilmasligi kerak?
- AES-256
+ DES
- RSA-2048
- ECC
! DES kaliti atigi 56 bit — bugun tez terib topiladi. Uning o'rnini AES egallagan.

? Amalda kriptografik himoya ko'pincha qanday yengiladi?
- AES kalitini terib topish orqali
+ Kalitlarni noto'g'ri saqlash va boshqarish orqali — kalit kodda, faylda yoki zaif parol ortida
- Kvant kompyuterlar bilan
- Shifrlangan matnni taxmin qilish bilan
! Algoritmlar mustahkam; zaif joy — kalit qayerda va qanday saqlanishi.

? Disk shifrlash (BitLocker, LUKS) qaysi holatda himoya qiladi?
- Kompyuter yoqilgan va tizimga kirilgan paytda
+ Qurilma o'chirilgan holda yo'qolganda yoki o'g'irlanganda
- Internetdagi hujumlardan
- Phishing'dan
! Yoqilgan va qulfdan chiqarilgan tizimda ma'lumot ochiq ishlatiladi. Disk shifrlash saqlanayotgan (at rest) ma'lumotni himoya qiladi.

? End-to-end shifrlashning oddiy HTTPS dan farqi nima?
- U tezroq
+ Ma'lumotni o'rtadagi server ham o'qiy olmaydi — faqat ikki chekkadagi qurilmalar
- U faqat rasmlar uchun
- Farqi yo'q
! HTTPS siz va server orasini himoya qiladi; server ma'lumotni ko'radi. E2EE da kalit faqat suhbatdoshlar qurilmalarida.

? XOR amalining qaysi xususiyati uni shifrlashda foydali qiladi?
- U sonlarni ko'paytiradi
+ Bir xil kalit bilan ikki marta XOR asl ma'lumotni qaytaradi
- U ma'lumotni siqadi
- U faqat harflar bilan ishlaydi
! (A ⊕ K) ⊕ K = A — bitta amal ham shifrlaydi, ham ochadi.
:::

:::cards
Kriptografiyaning to'rt maqsadi? :: Maxfiylik, yaxlitlik, autentiklik, rad etib bo'lmaslik.
Kerckhoffs tamoyili? :: Xavfsizlik algoritmning sirligiga emas, faqat kalitning sirligiga tayanishi kerak.
Simmetrik shifrlash? :: Shifrlash va ochish uchun bitta kalit (AES). Tez; muammosi — kalitni xavfsiz yetkazish.
Asimmetrik shifrlash? :: Juft kalit: ochiq kalit shifrlaydi, yopiq kalit ochadi (RSA, ECC). Sekin, lekin kalit almashish muammosini hal qiladi.
Gibrid sxema? :: Asimmetrik usul bilan simmetrik kalit kelishiladi; ma'lumot shu kalit bilan tez shifrlanadi (HTTPS, SSH).
Raqamli imzo qanday ishlaydi? :: Hujjat xeshi yopiq kalit bilan imzolanadi; ochiq kalit bilan tekshiriladi. Autentiklik va yaxlitlikni beradi.
Shifrlash va imzolashda qaysi kalit? :: Shifrlash — qabul qiluvchining ochiq kaliti; imzolash — jo'natuvchining yopiq kaliti.
Eskirgan algoritmlar? :: DES, 3DES, RC4; ECB rejimi; xeshlardan MD5 va SHA-1.
Kriptografiyaning eng zaif bo'g'ini? :: Kalitlarni boshqarish: kalit kodda, ma'lumot yonida, zaif parol ortida yoki hech qachon almashtirilmaydi.
At rest, in transit, in use? :: Saqlanayotgan (disk shifrlash), uzatilayotgan (TLS, VPN), ishlatilayotgan (xotirada ochiq).
End-to-end shifrlash? :: Ma'lumot faqat ikki chekkadagi qurilmalarda ochiladi; o'rtadagi server ham o'qiy olmaydi.
Forward secrecy? :: Har seans uchun yangi kalit: server kaliti keyin o'g'irlansa ham, avvalgi seanslarni ochib bo'lmaydi.
:::
