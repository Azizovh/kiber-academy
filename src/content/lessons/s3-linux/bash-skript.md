Oldingi darslarda bir qatorli zanjirlar yozdingiz: jurnaldan eng faol manzillarni topish, o'zgargan fayllarni qidirish. Endi tasavvur qiling: shu tekshiruvlarni har kuni, yigirmata serverda bajarish kerak. Har safar qo'lda yozasizmi?

Yo'q. Buyruqlarni faylga yozasiz — va u **skript**ga aylanadi. Bir marta yozasiz, ming marta ishlatasiz. Xavfsizlik mutaxassisini oddiy foydalanuvchidan ajratadigan narsalardan biri shu: takroriy ishni kompyuterga topshira olish.

## Birinchi skript

[[script|Skript]] — buyruqlar ketma-ketligi yozilgan oddiy matn fayli.

```bash
nano salom.sh
```

```bash
#!/bin/bash
# Mening birinchi skriptim

echo "Salom, $USER!"
echo "Bugun: $(date +%F)"
echo "Siz $(hostname) kompyuteridasiz"
```

Birinchi qator — [[shebang|shebang]]: `#!` va dastur yo'li. U tizimga "bu faylni Bash bilan bajar" deydi. `#` bilan boshlanadigan qolgan qatorlar — izohlar.

Ishga tushirish uchun faylga **bajarish huquqi** kerak (ruxsatlar darsi):

```bash
chmod +x salom.sh
./salom.sh
```

Nega `./`? Shell buyruqni faqat [[path-variable|$PATH]] ro'yxatidagi kataloglardan qidiradi; hozirgi katalog u yerda yo'q. `./` — "aynan shu katalogdagi fayl" degani. (Bu ataylab shunday: aks holda kimdir katalogga `ls` nomli fayl tashlab qo'ysa, siz uni bilmasdan ishga tushirib yuborardingiz.)

## O'zgaruvchilar

```bash
ism="Ali"
port=22
echo "Foydalanuvchi: $ism, port: $port"
```

Uch qoida — yangi boshlovchilarning eng ko'p qoqiladigan joyi:

1. `=` atrofida **bo'sh joy bo'lmaydi**: `ism="Ali"` to'g'ri, `ism = "Ali"` — xato.
2. Qiymatni o'qishda `$` qo'yiladi: `$ism`.
3. O'zgaruvchini **qo'shtirnoq ichida** ishlating: `"$fayl"`.

Uchinchi qoida nega muhim:

```bash
fayl="mening hisobotim.txt"
cat $fayl        # xato: ikkita alohida fayl deb tushunadi
cat "$fayl"      # to'g'ri
```

### Qo'shtirnoq turlari

| Yozuv | Nima bo'ladi |
|---|---|
| `"$ism"` | O'zgaruvchi qiymati qo'yiladi |
| `'$ism'` | Hech narsa o'zgarmaydi — aynan `$ism` matni |
| `$(buyruq)` | Buyruq bajariladi va o'rniga natijasi qo'yiladi |

```bash
bugun=$(date +%F)
soni=$(wc -l < /etc/passwd)
echo "Sana: $bugun, hisoblar soni: $soni"
```

`$(...)` — **buyruq natijasini o'zgaruvchiga olish**. Skriptlarning asosiy qurilish g'ishti.

### Tayyor o'zgaruvchilar

| O'zgaruvchi | Ma'nosi |
|---|---|
| `$USER`, `$HOME`, `$PWD` | Foydalanuvchi, uy katalogi, hozirgi katalog |
| `$0` | Skriptning nomi |
| `$1`, `$2`, … | Skriptga berilgan 1-, 2-argument |
| `$#` | Argumentlar soni |
| `$@` | Barcha argumentlar |
| `$?` | Oxirgi buyruqning [[exit-code|chiqish kodi]] |

Argumentlar skriptni moslashuvchan qiladi:

```bash
#!/bin/bash
echo "Tekshirilayotgan fayl: $1"
wc -l "$1"
```

```bash
./sanash.sh /var/log/auth.log
```

Foydalanuvchidan so'rash:

```bash
read -p "Manzilni kiriting: " manzil
echo "Siz kiritdingiz: $manzil"
```

## Chiqish kodi

Har bir buyruq tugaganda son qaytaradi: **0 — muvaffaqiyat**, boshqa har qanday son — xato. U `$?` da saqlanadi:

```bash
ls /etc/passwd
echo $?            # 0

ls /yoq-fayl
echo $?            # 2
```

Skriptlardagi barcha qarorlar shu songa asoslanadi. Tanish `&&` va `||` ham:

```bash
mkdir zaxira && echo "Yaratildi"          # muvaffaqiyatli bo'lsa
ping -c 1 10.0.0.5 || echo "Javob yo'q"   # muvaffaqiyatsiz bo'lsa
```

O'z skriptingiz ham kod qaytarishi kerak: `exit 0` — hammasi joyida, `exit 1` — xato.

## Shartlar

```bash
if [[ shart ]]; then
    buyruqlar
elif [[ boshqa_shart ]]; then
    buyruqlar
else
    buyruqlar
fi
```

`[[` dan keyin va `]]` dan oldin **bo'sh joy shart**.

| Tekshiruv | Ma'nosi |
|---|---|
| `[[ -f fayl ]]` | Fayl mavjud |
| `[[ -d katalog ]]` | Katalog mavjud |
| `[[ -r fayl ]]`, `-w`, `-x` | O'qish / yozish / bajarish mumkin |
| `[[ -z "$a" ]]` | Satr bo'sh |
| `[[ -n "$a" ]]` | Satr bo'sh emas |
| `[[ "$a" == "$b" ]]` | Satrlar teng |
| `[[ "$a" != "$b" ]]` | Satrlar teng emas |
| `[[ $a -eq $b ]]` | Sonlar teng |
| `[[ $a -gt $b ]]`, `-lt`, `-ge`, `-le` | Katta, kichik, katta-yoki-teng, kichik-yoki-teng |
| `[[ shart1 && shart2 ]]` | Ikkalasi ham |
| `[[ shart1 \|\| shart2 ]]` | Hech bo'lmaganda biri |
| `[[ ! shart ]]` | Inkor |

Sonlar uchun `-eq`, `-gt` kabi harfli amallar ishlatilishiga e'tibor bering: `>` va `<` bu yerda satrlarni solishtiradi.

Misol — argument berilganini va fayl mavjudligini tekshirish:

```bash
#!/bin/bash

if [[ $# -eq 0 ]]; then
    echo "Ishlatilishi: $0 FAYL"
    exit 1
fi

if [[ ! -f "$1" ]]; then
    echo "Xato: $1 topilmadi"
    exit 1
fi

echo "$1 da $(wc -l < "$1") qator bor"
```

Yaxshi skript **kirishni tekshirishdan boshlanadi**: nima berildi, u mavjudmi, o'qib bo'ladimi. Bu — nafaqat qulaylik, balki xavfsizlik odati ham.

Buyruqning o'zini ham shart sifatida ishlatish mumkin — uning chiqish kodi tekshiriladi:

```bash
if grep -q "Failed password" /var/log/auth.log; then
    echo "Muvaffaqiyatsiz kirish urinishlari bor"
fi
```

`-q` — jim rejim: natija chiqarmaydi, faqat kod qaytaradi.

## Sikllar

### for — ro'yxat bo'yicha

```bash
for ism in ali vali sami; do
    echo "Salom, $ism"
done

for i in {1..5}; do
    echo "Qadam $i"
done

for fayl in /var/log/*.log; do
    echo "$fayl: $(wc -l < "$fayl") qator"
done
```

### while — shart bajarilguncha

```bash
son=1
while [[ $son -le 3 ]]; do
    echo "Urinish $son"
    son=$((son + 1))
done
```

`$(( ... ))` — arifmetik hisob.

Eng foydali shakli — **faylni qatorma-qator o'qish**:

```bash
while read -r qator; do
    echo "O'qildi: $qator"
done < royxat.txt
```

## Funksiyalar

Takrorlanadigan kodni nomlab, qayta ishlatish:

```bash
xabar() {
    echo "[$(date +%T)] $1"
}

xabar "Tekshiruv boshlandi"
xabar "Tekshiruv tugadi"
```

Funksiya ichida `$1`, `$2` — **funksiyaga** berilgan argumentlar.

## Uchta amaliy skript

### 1. Kirish urinishlari hisoboti

"Matn va pipe" darsidagi zanjirni qayta ishlatiladigan vositaga aylantiramiz:

```bash
#!/bin/bash
# kirish-hisoboti.sh — SSH ga muvaffaqiyatsiz kirish urinishlari xulosasi

log="${1:-/var/log/auth.log}"

if [[ ! -r "$log" ]]; then
    echo "Xato: $log ni o'qib bo'lmadi (sudo kerakdir?)"
    exit 1
fi

jami=$(grep -c "Failed password" "$log")
echo "Jurnal: $log"
echo "Muvaffaqiyatsiz urinishlar: $jami"
echo
echo "Eng faol 5 ta manzil:"
grep "Failed password" "$log" | awk '{print $11}' | sort | uniq -c | sort -rn | head -5
```

`${1:-/var/log/auth.log}` — "birinchi argument berilgan bo'lsa — shu, aks holda standart qiymat".

### 2. Serverlar tirikligini tekshirish

O'z laboratoriyangiz yoki o'zingiz boshqaradigan serverlar ro'yxati uchun:

```bash
#!/bin/bash
# tirikmi.sh — ro'yxatdagi manzillar javob beryaptimi

royxat="${1:-serverlar.txt}"

while read -r manzil; do
    [[ -z "$manzil" ]] && continue          # bo'sh qatorni o'tkazib yuborish
    if ping -c 1 -W 1 "$manzil" &> /dev/null; then
        echo "[+] $manzil — javob beryapti"
    else
        echo "[-] $manzil — javob yo'q"
    fi
done < "$royxat"
```

`&> /dev/null` — ping'ning butun chiqishini yashiradi; bizga faqat uning chiqish kodi kerak.

### 3. Zaxira nusxa

```bash
#!/bin/bash
# zaxira.sh — katalogdan sanali arxiv yaratadi

manba="$1"
manzil="$HOME/zaxiralar"
sana=$(date +%F)

if [[ ! -d "$manba" ]]; then
    echo "Xato: $manba katalog emas"
    exit 1
fi

mkdir -p "$manzil"
arxiv="$manzil/$(basename "$manba")-$sana.tar.gz"

if tar -czf "$arxiv" "$manba"; then
    echo "Tayyor: $arxiv ($(du -h "$arxiv" | cut -f1))"
else
    echo "Xato: arxiv yaratilmadi"
    exit 1
fi
```

Bu skriptni cron'ga qo'shsangiz (jarayonlar darsi) — har kecha avtomatik zaxira nusxa olinadi.

## Xatolarni topish

```bash
bash -x skript.sh        # har bir buyruqni bajarishdan oldin ko'rsatadi
bash -n skript.sh        # ishga tushirmasdan sintaksisni tekshiradi
```

Skript boshiga qo'yiladigan "xavfsizlik kamari":

```bash
#!/bin/bash
set -euo pipefail
```

| Qism | Nima qiladi |
|---|---|
| `-e` | Biror buyruq xato bersa — skript to'xtaydi |
| `-u` | E'lon qilinmagan o'zgaruvchi ishlatilsa — xato |
| `-o pipefail` | Zanjirdagi istalgan bo'g'in xatosi butun zanjir xatosi hisoblanadi |

Usiz skript xatodan keyin ham davom etaveradi — va bu juda yomon oqibatlarga olib kelishi mumkin.

**ShellCheck** (`shellcheck.net` yoki `sudo apt install shellcheck`) — skriptdagi xato va xavfli joylarni ko'rsatib beradigan vosita. Har bir skriptingizni undan o'tkazing: u sizga Bash'ni har qanday qo'llanmadan yaxshiroq o'rgatadi.

## Skriptlar va xavfsizlik

Skript yozish — kuch. U bilan birga mas'uliyat ham keladi.

:::warn
**O'zgaruvchini doim qo'shtirnoqqa oling — ayniqsa o'chirish buyruqlarida.** Klassik halokat:

```bash
rm -rf $katalog/*
```

Agar `$katalog` bo'sh bo'lib qolsa, buyruq `rm -rf /*` ga aylanadi. To'g'risi: `set -u` ni yoqish, o'zgaruvchini tekshirish va `"$katalog"` deb yozish.
:::

Yana bir necha qoida:

- **Parolni skriptga yozmang.** Skriptlar nusxalanadi, Git'ga tushadi, zaxira nusxalarda qoladi. Kod ichida qolgan parollar — real buzilishlarning doimiy sababi (`grep -r "password"` ni eslang).
- **Foydalanuvchi kiritgan narsaga ishonmang.** HTTP darsidagi qoida bu yerda ham amal qiladi: kiritilgan qiymatni tekshirmasdan buyruqqa qo'yish xavfli.
- **Root nomidan ishlaydigan skript faqat root tomonidan o'zgartirilishi kerak.** Jarayonlar darsidagi cron qoidasi.
- **Notanish skriptni ishga tushirishdan oldin o'qing.** Endi siz uni o'qiy olasiz.

Oxirgi band — bu darsning yashirin foydasi: Bash yozishni o'rgangan odam **Bash o'qishni** ham o'rganadi. Tergovda topilgan shubhali skript, internetdagi o'rnatish skripti, hamkasbingiz yozgan avtomatlashtirish — endi ularning nima qilishini tushuna olasiz.

## Bash yoki Python?

Taxminiy qoida:

| Bash | Python |
|---|---|
| Buyruqlarni ketma-ket ishga tushirish | Murakkab mantiq va ma'lumot tuzilmalari |
| Fayllar va matn bilan tez ish | JSON, API, tarmoq bilan ishlash |
| 50 qatorgacha | Undan uzun bo'lsa |

Keyingi bosqichda Python'ni o'rganasiz — u xavfsizlik sohasining asosiy tili.

:::lab bash-skriptlar

:::try
Yuqoridagi **kirish-hisoboti.sh** skriptini Kali VM'ingizda yozing va ishga tushiring:

```bash
nano kirish-hisoboti.sh
chmod +x kirish-hisoboti.sh
sudo ./kirish-hisoboti.sh
```

Keyin uni yaxshilang:

1. Muvaffaqiyatli kirishlar sonini ham chiqaradigan qiling (`Accepted password`).
2. Agar muvaffaqiyatsiz urinishlar 100 dan ko'p bo'lsa, "DIQQAT" degan ogohlantirish chiqarsin.
3. `bash -x` bilan ishga tushirib, har bir qadamni kuzating.
4. Skriptni `shellcheck` dan o'tkazing.

Kali'da SSH jurnali bo'sh bo'lsa, `journalctl -u ssh` chiqishidan yoki dasturdagi "Log tahlili" labidagi namunadan foydalaning.
:::

## Xulosa

- Skript — `#!/bin/bash` bilan boshlanadigan matn fayli; `chmod +x`, keyin `./skript.sh`.
- O'zgaruvchi: `ism="qiymat"` (bo'sh joysiz), o'qish: `"$ism"` (qo'shtirnoq ichida).
- `$(buyruq)` — buyruq natijasini olish; `$1`, `$#`, `$?` — argumentlar va chiqish kodi.
- Chiqish kodi: **0 — muvaffaqiyat**.
- `if [[ ... ]]; then ... fi`; fayl uchun `-f`, `-d`; sonlar uchun `-eq`, `-gt`, `-lt`.
- `for x in ...; do ... done`; `while read -r qator; do ... done < fayl`.
- `set -euo pipefail` va **ShellCheck** — xatolardan himoya.
- Parolni kodga yozmang; kirishni tekshiring; notanish skriptni avval o'qing.

:::quiz
? Skript faylining birinchi qatoridagi `#!/bin/bash` nima uchun kerak?
- Bu oddiy izoh, hech narsa qilmaydi
+ U tizimga faylni qaysi dastur bilan bajarishni ko'rsatadi
- U skriptga root huquqini beradi
- U skriptni shifrlaydi
! Bu shebang: tizim faylni ishga tushirganda aynan shu yerda ko'rsatilgan interpretatordan foydalanadi.

? Qaysi o'zgaruvchi e'loni to'g'ri?
- port = 22
- $port=22
+ port=22
- set port 22
! Bash'da = atrofida bo'sh joy bo'lmaydi va e'lon qilishda $ qo'yilmaydi.

? `echo '$USER'` (bittalik qo'shtirnoq bilan) nima chiqaradi?
- Joriy foydalanuvchi nomini
+ Aynan $USER matnini
- Bo'sh qator
- Xato
! Bittalik qo'shtirnoq ichida hech narsa almashtirilmaydi. O'zgaruvchi qiymati uchun ikkitalik qo'shtirnoq kerak.

? Buyruq muvaffaqiyatli bajarilganda uning chiqish kodi (`$?`) nechaga teng?
- 1
+ 0
- -1
- 200
! 0 — muvaffaqiyat; boshqa har qanday qiymat — xato. Skriptlardagi shartlar shunga tayanadi.

? `$1` skript ichida nimani bildiradi?
- Skript nomini
+ Skriptga berilgan birinchi argumentni
- Birinchi qatorni
- Oxirgi buyruq natijasini
! $0 — skript nomi, $1 — birinchi argument, $# — argumentlar soni.

? `bugun=$(date +%F)` qatori nima qiladi?
- “date +%F” matnini o'zgaruvchiga yozadi
+ date buyrug'ini bajarib, natijasini o'zgaruvchiga yozadi
- Sanani o'zgartiradi
- Xato beradi
! $(...) ichidagi buyruq bajariladi va o'rniga uning natijasi qo'yiladi.

? `[[ -f "$fayl" ]]` nimani tekshiradi?
- Fayl bo'shligini
+ Shu nomli oddiy fayl mavjudligini
- Fayl katalog ekanini
- Faylni o'qish mumkinligini
! -f — oddiy fayl mavjud; -d — katalog; -r — o'qish mumkin.

? `rm -rf $katalog/*` qatori nega xavfli?
- rm sekin ishlaydi
+ O'zgaruvchi bo'sh bo'lib qolsa, buyruq ildiz katalogdagi hamma narsani o'chirishga aylanadi
- U faqat fayllarni o'chiradi
- Unda sintaksis xatosi bor
! Bo'sh o'zgaruvchi bilan yo'l “/*” ga aylanadi. Himoya: set -u, o'zgaruvchini tekshirish va qo'shtirnoq.

? Skript boshidagi `set -e` nima qiladi?
- Skriptni tezlashtiradi
+ Biror buyruq xato bersa, skriptni to'xtatadi
- Barcha xatolarni yashiradi
- O'zgaruvchilarni tozalaydi
! Usiz skript xatodan keyin ham davom etadi. -u esa e'lon qilinmagan o'zgaruvchidan himoya qiladi.

? Nega parolni skript ichiga yozish yomon amaliyot?
+ Skriptlar nusxalanadi, Git'ga va zaxira nusxalarga tushadi — parol ular bilan birga tarqaladi
- Bash parollarni o'qiy olmaydi
- Bu skriptni sekinlashtiradi
- Parol avtomatik o'chib ketadi
! Kod ichida qolgan parollar real buzilishlarning tez-tez uchraydigan sababi.

? Faylni qatorma-qator o'qish uchun qaysi tuzilma ishlatiladi?
- for qator in fayl.txt
+ while read -r qator; do ... done < fayl.txt
- if read fayl.txt
- cat fayl.txt | for
! while read sikli har aylanishda fayldan bitta qator oladi. for esa faylni so'zlarga bo'lib yuborardi.
:::

:::cards
Shebang nima? :: Skriptning birinchi qatori (#!/bin/bash) — faylni qaysi dastur bajarishini ko'rsatadi.
Skriptni ishga tushirish uchun nima kerak? :: chmod +x skript.sh, keyin ./skript.sh
O'zgaruvchi e'loni va o'qilishi? :: ism="qiymat" (= atrofida bo'sh joysiz); o'qish: "$ism"
$(buyruq) nima qiladi? :: Buyruqni bajarib, o'rniga uning natijasini qo'yadi.
$1, $#, $? nima? :: $1 — birinchi argument; $# — argumentlar soni; $? — oxirgi buyruqning chiqish kodi.
Chiqish kodi 0 nimani bildiradi? :: Muvaffaqiyat. Boshqa har qanday qiymat — xato.
Bittalik va ikkitalik qo'shtirnoq farqi? :: "..." ichida o'zgaruvchilar almashtiriladi; '...' ichida hech narsa o'zgarmaydi.
Fayl va katalog mavjudligini tekshirish? :: [[ -f fayl ]] va [[ -d katalog ]]
Sonlarni solishtirish amallari? :: -eq teng, -ne teng emas, -gt katta, -lt kichik, -ge, -le.
Faylni qatorma-qator o'qish? :: while read -r qator; do ... done < fayl
set -euo pipefail nima beradi? :: Xatoda to'xtaydi (-e), e'lon qilinmagan o'zgaruvchida xato beradi (-u), zanjirdagi xatoni ushlaydi (pipefail).
Skriptni tekshirish vositalari? :: bash -x (qadamma-qadam), bash -n (sintaksis), shellcheck.
:::
