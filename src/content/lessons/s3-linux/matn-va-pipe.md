Server jurnali — 2 million qator. Qayerdadir shu qatorlar orasida hujumchining izi bor. Uni ko'z bilan o'qib topish — imkonsiz. Tajribali analitik esa bitta qator buyruq yozadi va o'n soniyada javobni oladi: qaysi manzil, necha marta, qachon.

Bu sehr emas — bu Linux'ning eng kuchli g'oyasi: **kichik vositalarni zanjirga ulash**. Bu dars butun bosqichning eng muhimi: bu yerdagi ko'nikmalarni SOC analitigi ham, pentester ham har kuni, har soatda ishlatadi.

## Pipe — buyruqlarni ulash

Linux falsafasi: har bir dastur **bitta ishni yaxshi bajaradi**. Murakkab ishni esa ularni ketma-ket ulab hal qilamiz.

Ulaydigan belgi — [[pipe|pipe]]: `|`. U chapdagi buyruqning **chiqishini** o'ngdagisining **kirishiga** beradi:

```
buyruq1  |  buyruq2  |  buyruq3
   └── natija ──┘ └── natija ──┘
```

```bash
ls -la /etc | less              # uzun ro'yxatni sahifalab ko'rish
cat /etc/passwd | wc -l         # nechta foydalanuvchi bor?
history | tail -n 20            # oxirgi 20 ta buyruq
```

Zavoddagi konveyerni tasavvur qiling: har bir stanok o'z ishini qiladi va mahsulotni keyingisiga uzatadi.

## grep — qidirish

`grep` — matndan namuna uchragan **qatorlarni** topadi. Eng ko'p ishlatiladigan buyruqlardan biri.

```bash
grep "Failed" /var/log/auth.log         # fayldan qidirish
cat fayl.txt | grep "xato"              # pipe orqali
ps aux | grep nginx                     # boshqa buyruq natijasidan
```

| Opsiya | Vazifasi |
|---|---|
| `-i` | Katta-kichik harfga qaramaydi |
| `-v` | **Teskari**: namuna *uchramagan* qatorlar |
| `-n` | Qator raqamini ko'rsatadi |
| `-c` | Faqat **sonini** chiqaradi |
| `-r` | Katalog ichidagi barcha fayllardan qidiradi |
| `-l` | Faqat fayl nomlarini chiqaradi |
| `-o` | Qatorning faqat mos kelgan qismini chiqaradi |
| `-E` | Kengaytirilgan regex |
| `-A 3`, `-B 3`, `-C 3` | Topilmadan keyingi / oldingi / ikki tomondagi 3 qator |

```bash
grep -i "error" app.log                  # Error, ERROR, error — hammasi
grep -v "^#" /etc/ssh/sshd_config        # izoh bo'lmagan qatorlar
grep -rn "password" /var/www/            # kod ichidan parol qidirish
grep -c "Failed password" auth.log       # nechta muvaffaqiyatsiz urinish
grep -C 2 "segfault" /var/log/syslog     # kontekst bilan
```

Uchinchi misolga e'tibor bering: `grep -r "password"` — pentesterning serverga kirgandan keyingi sevimli buyrug'i. Dasturchilar parollarni kod va sozlama fayllarida qoldirishni yaxshi ko'radi.

### Regex asoslari

`grep` oddiy matndan tashqari [[regex|muntazam ifodalar]]ni (regex) tushunadi — bu matn *namunasini* tasvirlash tili:

| Belgi | Ma'nosi | Misol |
|---|---|---|
| `^` | Qator boshi | `^root` — root bilan boshlanadigan qatorlar |
| `$` | Qator oxiri | `bash$` — bash bilan tugaydigan |
| `.` | Istalgan bitta belgi | `a.c` — abc, a1c, a-c |
| `*` | Oldingi belgi 0 yoki ko'p marta | `ab*c` — ac, abc, abbc |
| `+` | 1 yoki ko'p marta (`-E` bilan) | `[0-9]+` — bir yoki ko'p raqam |
| `[abc]` | Ko'rsatilganlardan biri | `[aeiou]` |
| `[0-9]` | Oraliq | Istalgan raqam |
| `\.` | Aynan nuqta belgisi | `192\.168` |
| `(a\|b)` (`-E` bilan) | Yoki | `error\|fail` — error yoki fail |

Eng foydali misol — matndan barcha IP manzillarni ajratib olish:

```bash
grep -oE "[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}" auth.log
```

`{1,3}` — "1 tadan 3 tagacha". `-o` — faqat mos kelgan qismni chiqaradi. Bu qatorni yodlash shart emas, lekin o'qiy olishingiz kerak.

## Kesish va sanash

### cut — ustunni kesib olish

```bash
cut -d ":" -f 1 /etc/passwd         # ":" bilan ajratilgan 1-ustun
cut -d " " -f 1,4 fayl.txt          # bo'sh joy bilan ajratilgan 1 va 4-ustunlar
cut -c 1-10 fayl.txt                # har qatorning birinchi 10 belgisi
```

`-d` — ajratuvchi (delimiter), `-f` — ustun raqami (field).

### awk — aqlliroq kesish

`cut` bitta bo'sh joyni ajratuvchi deb biladi; ustunlar orasida bir nechta bo'sh joy bo'lsa — chalkashadi. `awk` esa ketma-ket bo'sh joylarni bitta deb hisoblaydi:

```bash
awk '{print $1}' access.log          # 1-ustun
awk '{print $1, $7}' access.log      # 1 va 7-ustunlar
awk -F ":" '{print $1}' /etc/passwd  # boshqa ajratuvchi bilan
awk '$9 == 404' access.log           # 9-ustuni 404 bo'lgan qatorlar
```

`awk` — to'laqonli dasturlash tili, lekin kundalik ishda `'{print $N}'` shaklining o'zi 90 foiz ehtiyojni qoplaydi.

### sort, uniq, wc

```bash
sort fayl.txt              # alifbo bo'yicha saralash
sort -n raqamlar.txt       # son sifatida saralash
sort -r fayl.txt           # teskari tartibda
sort -u fayl.txt           # takrorlarsiz

uniq fayl.txt              # ketma-ket takrorlarni olib tashlaydi
uniq -c fayl.txt           # har biri necha marta uchraganini sanaydi

wc -l fayl.txt             # qatorlar soni
wc -w fayl.txt             # so'zlar soni
```

:::warn
`uniq` faqat **yonma-yon** turgan takrorlarni ko'radi. Shuning uchun undan oldin doim `sort` keladi: `sort | uniq -c`. Bu juftlikni yaxlit bitta buyruq deb eslab qoling.
:::

## Oltin zanjir

Endi hammasini birlashtiramiz. Mana SOC analitigining eng ko'p yozadigan zanjiri:

```bash
... | sort | uniq -c | sort -rn | head
```

"Sarala → takrorlarni sana → soni bo'yicha kamayish tartibida sarala → eng yuqorilarini ko'rsat". Natija — **"eng ko'p uchragan N ta narsa"**.

### Misol: serverga kim hujum qilyapti?

SSH jurnalidagi muvaffaqiyatsiz kirish qatori shunday ko'rinadi:

```
Nov 16 03:12:01 srv sshd[2211]: Failed password for root from 203.0.113.45 port 51122 ssh2
```

Savol: qaysi IP manzildan eng ko'p urinish bo'lgan? Zanjirni qadam-baqadam quramiz:

```bash
# 1. Faqat muvaffaqiyatsiz urinishlar
grep "Failed password" /var/log/auth.log

# 2. Ulardan IP manzil turgan ustunni olamiz (11-so'z)
grep "Failed password" /var/log/auth.log | awk '{print $11}'

# 3. Saralaymiz va sanaymiz
grep "Failed password" /var/log/auth.log | awk '{print $11}' | sort | uniq -c

# 4. Eng ko'pini tepaga chiqaramiz
grep "Failed password" /var/log/auth.log | awk '{print $11}' | sort | uniq -c | sort -rn | head
```

Natija:

```
   1482 203.0.113.45
    311 198.51.100.7
     12 192.0.2.99
```

Ikki million qatorli fayl — bir qator buyruq — aniq javob.

:::key
Zanjirni **hech qachon birdaniga yozmang**. Bitta buyruq yozing, natijani ko'ring, `↑` bosib keyingi bo'g'inni qo'shing. Har qadamda nima chiqayotganini ko'rib turasiz va xato qayerda ekanini darhol bilasiz. Tajribali mutaxassislar ham aynan shunday ishlaydi.
:::

### Xuddi shu naqsh — boshqa savollar

Naqsh o'zgarmaydi, faqat nima qidirilayotgani o'zgaradi:

```bash
# Veb-serverga eng ko'p so'rov yuborgan manzillar
awk '{print $1}' access.log | sort | uniq -c | sort -rn | head

# Eng ko'p so'ralgan sahifalar
awk '{print $7}' access.log | sort | uniq -c | sort -rn | head

# Status kodlari taqsimoti (nechta 200, 404, 500…)
awk '{print $9}' access.log | sort | uniq -c | sort -rn

# Hujumchi qaysi foydalanuvchi nomlarini sinab ko'rgan?
grep "Failed password" auth.log | awk '{print $9}' | sort | uniq -c | sort -rn
```

## Matnni o'zgartirish

### tr — belgilarni almashtirish

```bash
echo "Salom" | tr 'a-z' 'A-Z'              # SALOM
echo "a,b,c" | tr ',' '\n'                 # vergulni yangi qatorga
echo "s a l o m" | tr -d ' '               # bo'sh joylarni o'chirish
cat sirli.txt | tr 'A-Za-z' 'N-ZA-Mn-za-m' # ROT13
```

### sed — qidirib almashtirish

```bash
sed 's/eski/yangi/' fayl.txt        # har qatordagi birinchi uchrashuvni
sed 's/eski/yangi/g' fayl.txt       # hammasini (g = global)
sed -n '10,20p' fayl.txt            # faqat 10–20-qatorlarni chiqarish
sed '/^#/d' fayl.txt                # izoh qatorlarini o'chirish
sed -i 's/eski/yangi/g' fayl.txt    # faylning o'zini o'zgartirish
```

`sed` standart holatda faylga tegmaydi — natijani ekranga chiqaradi. Faqat `-i` bilan faylni o'zgartiradi (avval `-i`siz sinab ko'ring).

## Pipe va yo'naltirishni birga ishlatish

```bash
# Natijani ham ekranda ko'rish, ham faylga saqlash
grep "Failed" auth.log | tee natija.txt

# Zanjir natijasini faylga yozish
grep "Failed" auth.log | awk '{print $11}' | sort -u > hujumchi-ipler.txt

# Faylni boshqa buyruqqa kirish sifatida berish
wc -l < hujumchi-ipler.txt
```

`tee` — "T" shaklidagi quvur: oqimni ikkiga bo'ladi. Uzoq ishlaydigan buyruq natijasini ham ko'rib turish, ham saqlab qolish uchun.

Oxirgi misoldagi `sort -u > fayl` — tergovda dalil saqlashning oddiy usuli: noyob manzillar ro'yxati alohida faylda.

## Amaliyot

Bu darsni o'qib tushunib bo'lmaydi — faqat qo'l bilan. Quyidagi labda siz SOC analitigisiz: serverga tunda hujum bo'lgan, jurnaldan hujumchini topishingiz kerak.

:::lab grep-va-pipe

Labdan keyin Amaliyot bo'limidagi **"Tungi mehmon"** CTF topshirig'ini maslahatlarsiz yechib ko'ring.

## Xulosa

- **Pipe** `|` — chapdagi buyruq chiqishini o'ngdagisining kirishiga beradi.
- **grep** — qatorlarni topadi: `-i`, `-v`, `-n`, `-c`, `-r`, `-o`, `-E`.
- Regex: `^` bosh, `$` oxir, `.` istalgan belgi, `[0-9]` oraliq.
- **cut** va **awk '{print $N}'** — ustunni ajratib olish.
- **`sort | uniq -c | sort -rn | head`** — "eng ko'p uchraganlar". Yoddan biling.
- `uniq` dan oldin doim `sort`.
- **tr** — belgilarni, **sed** — matnni almashtiradi.
- Zanjirni bo'g'in-bo'g'in quring.

:::quiz
? `|` (pipe) belgisi nima qiladi?
- Natijani faylga yozadi
+ Chapdagi buyruqning chiqishini o'ngdagi buyruqning kirishiga uzatadi
- Ikki buyruqni parallel ishga tushiradi
- Buyruqni fonda bajaradi
! Pipe buyruqlarni konveyerga ulaydi. Faylga yozish — `>` ning ishi.

? `grep -v "DEBUG" app.log` nimani chiqaradi?
- Faqat DEBUG so'zi bor qatorlarni
+ DEBUG so'zi YO'Q qatorlarni
- DEBUG so'zi necha marta uchraganini
- DEBUG so'zining o'zini
! -v — invert: namuna uchramagan qatorlar. Shovqinni olib tashlash uchun juda qulay.

? Nega `uniq -c` dan oldin `sort` ishlatiladi?
- sort natijani chiroyli qiladi
+ uniq faqat yonma-yon turgan takrorlarni birlashtiradi — saralanmasa, noto'g'ri sanaydi
- uniq sort'siz ishlamaydi va xato beradi
- sort faylni tezroq o'qiydi
! uniq ketma-ket takrorlarnigina ko'radi. Avval saralab, bir xil qatorlarni yonma-yon keltirish kerak.

? “Eng ko'p uchragan 10 ta qiymat”ni beradigan zanjir qaysi?
- sort | head | uniq
- uniq -c | sort | head
+ sort | uniq -c | sort -rn | head
- grep | sort | wc -l
! Sarala → sana → son bo'yicha kamayish tartibida sarala → birinchi 10 tasini ko'rsat.

? `awk '{print $1}' access.log` nima qiladi?
- Birinchi qatorni chiqaradi
+ Har bir qatorning birinchi ustunini (so'zini) chiqaradi
- Faylning birinchi belgisini chiqaradi
- Faylni o'chiradi
! $1 — birinchi maydon. Veb-server jurnalida bu odatda klient IP manzili.

? `grep -c "Failed password" auth.log` nimani qaytaradi?
- Mos kelgan qatorlarning o'zini
+ Mos kelgan qatorlar sonini
- Fayl nomini
- Birinchi mos kelgan qatorni
! -c (count) — faqat son. `grep ... | wc -l` bilan bir xil natija.

? Regex'da `^root` nimaga mos keladi?
- Istalgan joyida root so'zi bor qatorlarga
+ root so'zi bilan BOSHLANADIGAN qatorlarga
- root bilan tugaydigan qatorlarga
- Faqat aynan “root” dan iborat qatorga
! ^ — qator boshi. Qator oxiri uchun $ ishlatiladi.

? Veb-ilova kodida qoldirilgan parollarni qidirish uchun qaysi buyruq mos?
- find /var/www -name password
+ grep -rn "password" /var/www/
- cat /var/www | sort
- ls -la /var/www | wc -l
! grep -r katalog ichidagi barcha fayllarning MAZMUNIDAN qidiradi, -n qator raqamini ko'rsatadi. find esa fayl NOMIDAN qidiradi.

? Murakkab zanjirni qanday qurish to'g'ri?
- Hammasini birdan yozib, ishlamasa boshidan boshlash
+ Bitta buyruqdan boshlab, har qadamda natijani ko'rib, bo'g'in qo'shib borish
- Internetdan tayyorini nusxalash
- Avval skript faylga yozish
! Bosqichma-bosqich qurish har qadamdagi natijani ko'rsatadi va xatoni darhol topish imkonini beradi.

? `sed 's/http/https/g' fayl.txt` buyrug'i fayl bilan nima qiladi?
+ Faylga tegmaydi — o'zgartirilgan matnni ekranga chiqaradi
- Fayldagi barcha http ni https ga almashtirib, saqlaydi
- Faylni o'chiradi
- Faqat birinchi qatorni o'zgartiradi
! sed standart holatda faqat natijani chiqaradi. Faylning o'zini o'zgartirish uchun -i opsiyasi kerak.
:::

:::cards
Pipe (|) nima qiladi? :: Chapdagi buyruqning chiqishini o'ngdagi buyruqning kirishiga uzatadi.
“Eng ko'p uchraganlar” zanjiri? :: sort | uniq -c | sort -rn | head
grep ning -i, -v, -c, -r opsiyalari? :: -i harf katta-kichikligiga qaramaydi; -v teskari; -c sonini chiqaradi; -r kataloglar ichidan qidiradi.
Nega uniq dan oldin sort kerak? :: uniq faqat yonma-yon turgan takrorlarni birlashtiradi.
Qatordan N-ustunni olish? :: awk '{print $N}' — yoki cut -d "ajratuvchi" -f N
Regex'da ^ va $ nimani bildiradi? :: ^ — qator boshi; $ — qator oxiri.
Jurnaldan eng ko'p uringan IP ni topish? :: grep "Failed password" auth.log | awk '{print $11}' | sort | uniq -c | sort -rn | head
tee nima qiladi? :: Oqimni ikkiga bo'ladi: ham ekranga chiqaradi, ham faylga yozadi.
sed bilan matn almashtirish? :: sed 's/eski/yangi/g' fayl — faylni o'zgartirish uchun -i qo'shiladi.
tr nima qiladi? :: Belgilarni almashtiradi yoki o'chiradi: tr 'a-z' 'A-Z'; tr -d ' '
Kod ichidan parol qidirish buyrug'i? :: grep -rn "password" /var/www/
:::
