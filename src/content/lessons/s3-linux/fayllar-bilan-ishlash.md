Pentest paytida yuzlab fayl hosil bo'ladi: skan natijalari, topilgan parollar, ekran suratlari, eslatmalar. Tergovda minglab fayl ichidan bittasini topish kerak. Server sozlashda konfiguratsiyani o'zgartirishdan oldin nusxa olish shart. Bularning hammasi — fayllar bilan ishlash.

Bu darsda fayl yaratish, ko'chirish, o'chirish, o'qish va — eng muhimi — **topish**ni o'rganasiz.

## Yaratish

```bash
touch eslatma.txt              # bo'sh fayl
touch a.txt b.txt c.txt        # bir nechta birdan
mkdir loyiha                   # katalog
mkdir -p loyiha/skan/nmap      # oraliq kataloglari bilan birga
```

`-p` (parents) — yo'ldagi mavjud bo'lmagan barcha kataloglarni yaratadi va katalog allaqachon bor bo'lsa, xato bermaydi.

Yaxshi odat — har bir ish uchun tartibli papka:

```bash
mkdir -p ~/ish/mijoz-nomi/{skan,dalil,hisobot,eslatma}
```

Jingalak qavs ichidagilar alohida-alohida ochiladi — bitta buyruq to'rtta katalog yaratadi.

## Nusxalash, ko'chirish, nomlash

```bash
cp manba.txt nusxa.txt         # nusxa olish
cp manba.txt /tmp/             # boshqa katalogga nusxalash
cp -r loyiha loyiha-zaxira     # katalogni ichidagilari bilan (-r = recursive)

mv eski.txt yangi.txt          # nomini o'zgartirish
mv fayl.txt /tmp/              # ko'chirish
mv *.txt hujjatlar/            # barcha .txt fayllarni ko'chirish
```

Linux'da alohida "qayta nomlash" buyrug'i yo'q — bu ham `mv`: fayl o'sha joyga, boshqa nom bilan "ko'chiriladi".

:::tip
Konfiguratsiya faylini o'zgartirishdan oldin **doim nusxa oling**:

```bash
sudo cp /etc/ssh/sshd_config /etc/ssh/sshd_config.bak
```

Bu odat sizni ko'p marta qutqaradi. (Hujumchi uchun esa unutilgan `.bak`, `.old`, `~` fayllar — sovg'a: ularda ko'pincha eski parollar qoladi.)
:::

## O'chirish

```bash
rm fayl.txt                    # faylni o'chirish
rm -r katalog                  # katalogni ichidagilari bilan
rm -i fayl.txt                 # har biri uchun tasdiq so'raydi
rmdir bosh-katalog             # faqat bo'sh katalogni
```

:::warn
Linux'da **savat yo'q**. `rm` bilan o'chirilgan narsa oddiy yo'l bilan qaytmaydi. `rm -rf` (majburan, rekursiv) — eng xavfli buyruqlardan biri: u hech narsa so'ramaydi.

Enter bosishdan oldin ikki narsani tekshiring: **qaysi katalogdasiz** (`pwd`) va **yo'l to'g'rimi**. `rm -rf loyiha /` (ortiqcha bo'sh joy bilan) va `rm -rf loyiha/` orasidagi farq — bitta belgi va butun tizim.
:::

## O'qish

| Buyruq | Qachon |
|---|---|
| `cat fayl` | Kichik fayl — hammasini birdan chiqaradi |
| `less fayl` | Katta fayl — sahifalab ko'rish |
| `head fayl` | Boshidagi 10 qator |
| `head -n 30 fayl` | Boshidagi 30 qator |
| `tail fayl` | Oxiridagi 10 qator |
| `tail -n 50 fayl` | Oxiridagi 50 qator |
| `tail -f fayl` | **Jonli kuzatish**: yangi qatorlar paydo bo'lishi bilan ko'rsatadi |

`less` ichida: `Space` — keyingi sahifa, `b` — orqaga, `/so'z` — qidirish, `n` — keyingi topilma, `G` — oxiriga, `g` — boshiga, `q` — chiqish. `man` sahifalari ham aslida `less` ichida ochiladi.

`tail -f` — jurnallar bilan ishlashning asosiy quroli:

```bash
sudo tail -f /var/log/auth.log
```

Bu buyruqni yozib qo'ying — va kim tizimga kirishga urinayotganini real vaqtda ko'ring. To'xtatish — `Ctrl + C`.

## Yo'naltirish: natijani faylga yozish

Odatda buyruq natijasi ekranga chiqadi. Uni faylga yo'naltirish mumkin — bu [[redirect|redirection]]:

```bash
ls -la > royxat.txt            # faylga yozadi (bor bo'lsa — ustidan!)
ls -la >> royxat.txt           # fayl oxiriga qo'shadi
```

| Belgi | Ma'nosi |
|---|---|
| `>` | Chiqishni faylga yozish — **eski mazmun o'chadi** |
| `>>` | Chiqishni fayl **oxiriga qo'shish** |
| `<` | Faylni buyruqqa kirish sifatida berish |
| `2>` | **Xato xabarlarini** yo'naltirish |
| `2>/dev/null` | Xatolarni yo'q qilish |
| `&>` | Chiqish va xatolarni birga yo'naltirish |

`>` va `>>` ni adashtirish — ma'lumot yo'qotishning tez yo'li. Shubhangiz bo'lsa — `>>`.

### Uch oqim

Har bir dasturning uchta standart oqimi bor ([[stdin|stdin, stdout, stderr]]):

| Raqam | Nomi | Nima |
|---|---|---|
| 0 | stdin | Kirish (odatda klaviatura) |
| 1 | stdout | Oddiy natija |
| 2 | stderr | Xato xabarlari |

`2>` dagi "2" — aynan shu. Eng foydali qo'llanilishi — **shovqinni o'chirish**:

```bash
find / -name "*.conf" 2>/dev/null
```

`find` butun tizimni aylanganda yuzlab `Permission denied` xatosi chiqaradi. `2>/dev/null` ularni "qora tuynuk"ka yuboradi — ekranda faqat topilmalar qoladi. Bu shaklni har kuni ishlatasiz.

Faylga bir necha qator yozish — muharrirsiz:

```bash
echo "birinchi qator" > fayl.txt
echo "ikkinchi qator" >> fayl.txt
```

## O'rinbosar belgilar

[[wildcard|Wildcard]] — bir nechta faylni bitta namuna bilan ko'rsatish. Ularni shell o'zi ochadi:

| Belgi | Mos keladi | Misol |
|---|---|---|
| `*` | Istalgan sondagi istalgan belgilar | `*.log` — barcha .log fayllar |
| `?` | Aynan bitta belgi | `fayl?.txt` — fayl1.txt, faylA.txt |
| `[abc]` | Ko'rsatilganlardan bittasi | `fayl[123].txt` |
| `[a-z]` | Oraliqdan bittasi | `[0-9]*` — raqam bilan boshlanadiganlar |
| `{a,b}` | Har bir variant alohida | `cp fayl.{txt,bak}` |

```bash
ls *.txt                # barcha matn fayllar
ls /var/log/*.log       # jurnallar
rm skan-??.xml          # skan-01.xml, skan-02.xml…
cp sozlama.conf{,.bak}  # sozlama.conf → sozlama.conf.bak
```

`*` nuqta bilan boshlanadigan (yashirin) fayllarga mos kelmaydi — ular uchun `.*` yoziladi.

## find — qidirishning ustasi

`find` — eng kuchli va eng ko'p ishlatiladigan buyruqlardan biri. Tuzilishi:

```
find  QAYERDAN  SHARTLAR  [HARAKAT]
```

### Nom bo'yicha

```bash
find / -name "passwd"              # aniq nom
find / -name "*.conf"              # namuna bo'yicha
find / -iname "*parol*"            # katta-kichik harfga qaramasdan
find . -name "*.txt"               # hozirgi katalogdan boshlab
```

Namunani **qo'shtirnoqqa** oling — aks holda shell `*` ni `find` dan oldin o'zi ochib yuboradi.

### Tur, hajm, vaqt, ega bo'yicha

```bash
find /home -type f                 # faqat fayllar
find /home -type d                 # faqat kataloglar
find / -size +100M                 # 100 MB dan katta
find /var/log -mtime -1            # oxirgi 24 soatda o'zgargan
find / -mmin -30                   # oxirgi 30 daqiqada o'zgargan
find / -user ali                   # egasi ali
find / -perm -4000                 # SUID biti o'rnatilgan fayllar
find / -writable -type d           # yozish mumkin bo'lgan kataloglar
```

Shartlarni birlashtirish mumkin — ular standart holatda "va" bilan bog'lanadi:

```bash
find /home -type f -name "*.txt" -size +1M 2>/dev/null
```

### Xavfsizlikda eng ko'p ishlatiladigan qidiruvlar

| Savol | Buyruq |
|---|---|
| Tizimda nima yaqinda o'zgargan? | `find / -mmin -60 -type f 2>/dev/null` |
| SUID fayllar qaysilar? | `find / -perm -4000 -type f 2>/dev/null` |
| Men qayerga yoza olaman? | `find / -writable -type d 2>/dev/null` |
| Zaxira va eski fayllar bormi? | `find / -name "*.bak" -o -name "*.old" 2>/dev/null` |
| SSH kalitlari qayerda? | `find / -name "id_rsa*" 2>/dev/null` |

Birinchisi — tergovchining savoli, qolganlari — pentesterning. SUID nima ekanini ruxsatlar darsida o'rganasiz.

### Topilganlar ustida amal

```bash
find . -name "*.tmp" -delete                    # topib, o'chirish
find . -name "*.log" -exec grep -l "error" {} \; # har biridan qidirish
```

`-exec` topilgan har bir fayl uchun buyruq bajaradi; `{}` o'rniga fayl nomi qo'yiladi.

### Tezroq muqobillar

```bash
locate passwd          # oldindan tuzilgan baza bo'yicha — juda tez
which nmap             # buyruq dasturi qayerda
whereis nmap           # dastur, qo'llanma va manbasi qayerda
```

`locate` tez, lekin bazasi kuniga bir marta yangilanadi (`sudo updatedb`) — hozirgina yaratilgan faylni topmaydi.

## Matn muharriri

Terminalda fayl tahrirlash uchun ikki muharrir bor:

**nano** — sodda. Pastda buyruqlar ko'rsatilgan (`^` — `Ctrl`):

```bash
nano fayl.txt
```

`Ctrl + O` — saqlash, `Ctrl + X` — chiqish, `Ctrl + W` — qidirish.

**vim** — kuchli, lekin o'rganish qiyin. Hozircha bitta narsani biling — **undan qanday chiqiladi** (har bir serverda bor va tasodifan ochilib qoladi): `Esc`, keyin `:q!` va `Enter`.

## Arxivlar

```bash
tar -czf arxiv.tar.gz katalog/     # yaratish (c), siqish (z), fayl nomi (f)
tar -xzf arxiv.tar.gz              # ochish (x)
tar -tzf arxiv.tar.gz              # ichini ko'rish (t), ochmasdan

zip -r arxiv.zip katalog/
unzip arxiv.zip
```

`.tar.gz` — Linux dunyosidagi standart format. Dasturlar, zaxira nusxalar, CTF fayllari shu ko'rinishda keladi.

## Amaliyot

Labda ish papkasini yaratasiz, fayllarga yozasiz, nusxalaysiz, ko'chirasiz va tizimdan fayl qidirasiz:

:::lab fayllar-va-kataloglar

## Xulosa

- `touch` — fayl, `mkdir -p` — katalog (oraliqlari bilan).
- `cp -r` — nusxa, `mv` — ko'chirish **va** qayta nomlash.
- `rm -r` — qaytarib bo'lmaydi; savat yo'q.
- `cat`, `less`, `head`, `tail`; **`tail -f`** — jonli kuzatish.
- **`>`** ustidan yozadi, **`>>`** qo'shadi, **`2>/dev/null`** xatolarni yashiradi.
- `*` — istalgan belgilar, `?` — bitta belgi.
- **`find QAYERDAN SHARTLAR`** — nom, tur, hajm, vaqt, ruxsat bo'yicha.
- O'zgartirishdan oldin — nusxa.

:::quiz
? `echo "yangi" > hisobot.txt` buyrug'i faylda allaqachon matn bo'lsa nima qiladi?
- Matnni fayl oxiriga qo'shadi
+ Eski mazmunni o'chirib, o'rniga yangisini yozadi
- Xato beradi
- Yangi fayl yaratadi, eskisiga tegmaydi
! `>` faylni qaytadan yozadi. Oxiriga qo'shish uchun `>>` kerak.

? `find / -name "*.conf" 2>/dev/null` buyrug'idagi `2>/dev/null` nima uchun?
- Natijani faylga saqlash uchun
+ Xato xabarlarini (masalan Permission denied) yashirish uchun
- Qidiruvni tezlashtirish uchun
- Faqat yashirin fayllarni qidirish uchun
! 2 — stderr oqimi. /dev/null ga yo'naltirish xatolarni yo'q qiladi, ekranda faqat topilmalar qoladi.

? Katalogni ichidagi hamma narsa bilan nusxalash uchun qaysi buyruq kerak?
- cp katalog nusxa
+ cp -r katalog nusxa
- mv katalog nusxa
- copy katalog nusxa
! -r (recursive) — ichki fayl va kataloglar bilan birga. Opsiyasiz cp katalogni nusxalamaydi.

? Jurnalga yangi yozuvlar qo'shilishini real vaqtda kuzatish uchun qaysi buyruq ishlatiladi?
- cat /var/log/auth.log
- head /var/log/auth.log
+ tail -f /var/log/auth.log
- less /var/log/auth.log
! tail -f (follow) fayl oxirini ko'rsatib, yangi qatorlar paydo bo'lishi bilan chiqarib turadi.

? Linux'da faylning nomini qanday o'zgartirish mumkin?
- rename eski yangi — yagona usul
+ mv eski.txt yangi.txt
- cp eski.txt yangi.txt
- name eski.txt yangi.txt
! mv ham ko'chiradi, ham nomini o'zgartiradi. cp esa nusxa yaratadi — eski fayl ham qoladi.

? `rm -rf` buyrug'i nega xavfli?
- U juda sekin ishlaydi
+ U hech narsa so'ramasdan, kataloglarni ichidagilari bilan qaytarib bo'lmaydigan qilib o'chiradi
- U faqat root uchun ishlaydi
- U fayllarni shifrlaydi
! -r rekursiv, -f majburan (tasdiqsiz). Linux'da savat yo'q — xato yo'l bilan butun tizimni o'chirib yuborish mumkin.

? Oxirgi 60 daqiqada o'zgargan fayllarni topadigan buyruq qaysi?
- find / -name 60
- find / -size 60
+ find / -mmin -60 -type f
- find / -perm 60
! -mmin -60 — “60 daqiqadan kam vaqt oldin o'zgargan”. Tergovda “hozirgina nima o'zgardi?” savoliga javob.

? `ls *.txt` buyrug'idagi `*` nimani bildiradi?
- Faqat bitta belgini
+ Istalgan sondagi istalgan belgilarni
- Yashirin fayllarni
- Kataloglarni
! * — istalgan belgilar ketma-ketligi. Bitta belgi uchun ? ishlatiladi.

? Konfiguratsiya faylini tahrirlashdan oldin nima qilish to'g'ri?
- Faylni o'chirish
+ Undan zaxira nusxa olish (masalan .bak qo'shib)
- Tizimni qayta yuklash
- Faylni /tmp ga ko'chirish
! Xato qilsangiz, eski holatga bir buyruq bilan qaytasiz. Bu — tizim ma'murining asosiy odati.

? vim muharriridan saqlamasdan qanday chiqiladi?
- Ctrl + X
- exit
+ Esc, keyin :q! va Enter
- Ctrl + C ikki marta
! Esc buyruq rejimiga qaytaradi, :q! — o'zgarishlarni saqlamasdan chiqish. Ctrl+X — nano uchun.
:::

:::cards
Katalogni oraliq kataloglari bilan yaratish? :: mkdir -p yo'l/ichki/katalog
> va >> farqi? :: > faylni qaytadan yozadi (eski mazmun o'chadi); >> oxiriga qo'shadi.
2>/dev/null nima qiladi? :: Xato xabarlarini (stderr) yo'q qiladi — ekranda faqat foydali natija qoladi.
Uchta standart oqim? :: 0 — stdin (kirish), 1 — stdout (natija), 2 — stderr (xatolar).
Faylni jonli kuzatish buyrug'i? :: tail -f fayl
find buyrug'ining tuzilishi? :: find QAYERDAN SHARTLAR — masalan: find / -name "*.conf" -type f 2>/dev/null
SUID fayllarni topish buyrug'i? :: find / -perm -4000 -type f 2>/dev/null
* va ? o'rinbosar belgilari? :: * — istalgan sondagi belgilar; ? — aynan bitta belgi.
mv nima qiladi? :: Faylni ko'chiradi va/yoki nomini o'zgartiradi.
tar bilan arxiv yaratish va ochish? :: Yaratish: tar -czf arxiv.tar.gz katalog/ — ochish: tar -xzf arxiv.tar.gz
:::
