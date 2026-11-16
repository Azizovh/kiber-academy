Dunyodagi veb-serverlarning ko'pchiligi, deyarli barcha bulut infratuzilmasi, superkompyuterlarning hammasi, Android telefonlar, routerlar, aqlli televizorlar — bularning hammasi Linux'da ishlaydi. Xavfsizlik vositalarining aksariyati ham avval Linux uchun yoziladi.

Shuning uchun sohada shunday gap bor: Linux'ni bilmagan xavfsizlikchi — suzishni bilmagan qutqaruvchi. Bu bosqich oxirida siz terminalda sichqonchasiz, erkin ishlaydigan bo'lasiz.

## Linux nima

Aniq aytganda, [[linux|Linux]] — bu faqat **yadro** (kernel): hardware bilan gaplashadigan markaziy qism. Uni 1991-yilda fin talabasi Linus Torvalds yozgan va [[open-source|ochiq kodli]] qilib e'lon qilgan.

Yadroning o'zi bilan ishlab bo'lmaydi — unga buyruq qobig'i, vositalar, dasturlar kerak. Yadro va shularning yig'indisi — **distributiv** ([[distro|distro]]).

| Distributiv | Kim uchun | Xususiyati |
|---|---|---|
| **Ubuntu** | Boshlovchilar, serverlar | Eng ommabop, hujjati ko'p |
| **Debian** | Serverlar | Juda barqaror; Ubuntu va Kali uning asosida qurilgan |
| **Kali Linux** | Pentesterlar | Yuzlab xavfsizlik vositasi oldindan o'rnatilgan |
| **RHEL / Rocky / Alma** | Korporativ serverlar | Yirik tashkilotlar standarti |
| **Arch** | Tajribali foydalanuvchilar | Hammasini o'zingiz yig'asiz |
| **Alpine** | Konteynerlar | Juda kichik (bir necha megabayt) |

Yaxshi xabar: ular bir oilaga mansub. Kali'da o'rgangan buyruqlaringizning 95 foizi Ubuntu serverda ham, Rocky'da ham ishlaydi. Asosiy farq — dastur o'rnatish usulida.

### Nega xavfsizlikda Linux

- **Shaffoflik.** Hamma narsa — matnli fayl. Sozlamalar, jurnallar, hatto jarayonlar haqidagi ma'lumot ham. O'qish, qidirish va avtomatlashtirish oson.
- **Nazorat.** Tizim sizdan hech narsani yashirmaydi va hech narsaga majburlamaydi.
- **Vositalar.** Nmap, Metasploit, Wireshark, Burp — hammasi shu yerda "uyida".
- **Nishon.** Serverlarning ko'pi Linux — hujum qilinadigan ham, himoya qilinadigan ham shu.

## Terminal, shell va Bash

Bu uch so'z ko'pincha aralashtiriladi:

- [[terminal|Terminal]] — **oyna**: matn kiritiladigan va chiqadigan dastur.
- [[shell|Shell]] — **tarjimon**: siz yozgan buyruqni tushunib, tizimga bajartiradigan dastur.
- [[bash|Bash]] — eng keng tarqalgan shell. Kali'da standart shell — **Zsh**, lekin u Bash bilan deyarli bir xil ishlaydi.

Nega grafik oyna emas, buyruq satri?

1. **Serverlarda grafik interfeys yo'q.** Masofadagi mashinaga SSH orqali ulansangiz, faqat terminal bor.
2. **Tezlik.** Mingta fayl nomini o'zgartirish — bitta qator.
3. **Avtomatlashtirish.** Buyruqlarni skriptga yozib, qayta ishlatish mumkin.
4. **Aniqlik.** "Qaysi tugmani bosdingiz?" degan savol yo'q — buyruq matni turibdi.

## Taklif satri (prompt)

Terminalni ochganingizda shunga o'xshash qator ko'rasiz:

```
talaba@kali:~$
```

Har bir qismi ma'noga ega:

| Qism | Ma'nosi |
|---|---|
| `talaba` | Hozirgi foydalanuvchi |
| `kali` | Kompyuter nomi (hostname) |
| `~` | Hozirgi katalog. `~` — uy katalogingiz |
| `$` | Oddiy foydalanuvchi. **`#`** bo'lsa — siz **root**siz |

Oxirgi belgiga doim qarang. `#` — "ehtiyot bo'l, bu yerda xato qimmatga tushadi" degani. Kali'da prompt ikki qatorli va rangli ko'rinadi (`┌──(kali㉿kali)-[~]`), lekin ma'lumot o'sha.

Boshqa odamning serveriga ulanganingizda prompt o'zgaradi — bu sizga qayerda ekaningizni eslatadi. Pentestda bir vaqtning o'zida bir nechta mashinada ishlaysiz; buyruqni noto'g'ri oynaga yozib qo'yish — klassik xato.

## Buyruq tuzilishi

Deyarli har bir buyruq uch qismdan iborat:

```
ls        -la         /var/log
└┬┘       └┬┘         └───┬───┘
buyruq    opsiyalar   argument
(nima)    (qanday)    (nima ustida)
```

- **Buyruq** — dastur nomi.
- **Opsiyalar** (flags) — xatti-harakatni o'zgartiradi. Qisqa shakli bitta chiziqcha bilan (`-l`), uzuni ikkita bilan (`--all`). Qisqalarini birlashtirish mumkin: `-l -a` = `-la`.
- **Argumentlar** — buyruq nima ustida ishlashi.

Qismlar **bo'sh joy** bilan ajratiladi. Shuning uchun nomida bo'sh joy bor fayl bilan ishlashda qo'shtirnoq kerak: `cat "mening faylim.txt"`.

:::warn
Linux **katta-kichik harfni farqlaydi** — hamma joyda. `ls` ishlaydi, `LS` — yo'q. `Reja.txt` va `reja.txt` — ikki xil fayl. `-r` va `-R` — ikki xil opsiya bo'lishi mumkin.
:::

## Birinchi buyruqlar

```bash
whoami          # men kimman?
hostname        # bu qaysi kompyuter?
pwd             # qayerdaman?
date            # sana va vaqt
uname -a        # yadro va tizim haqida
id              # foydalanuvchi va guruhlarim
echo "Salom"    # matnni chiqarish
clear           # ekranni tozalash
history         # yozgan buyruqlarim
```

`#` belgisidan keyingi matn — **izoh**: shell uni e'tiborsiz qoldiradi.

Bu ro'yxat sizga tanish tuyulishi kerak: Windows darsidagi `whoami`, `hostname` bilan bir xil vazifa. Hujumchi Linux serverga kirganda ham birinchi yozadiganlari shular: `whoami`, `id`, `hostname`, `uname -a`.

## Yordam olish

Hech kim barcha buyruq va opsiyalarni yoddan bilmaydi. Mutaxassisni yangi boshlovchidan ajratadigan narsa — **yordamni tez topa olishi**.

| Usul | Nima beradi |
|---|---|
| `man ls` | To'liq qo'llanma ([[man-page|man page]]). Chiqish — `q`, qidirish — `/so'z` |
| `ls --help` | Qisqa ma'lumot — opsiyalar ro'yxati |
| `whatis ls` | Bir qatorli tavsif |
| `apropos "network"` | Tavsifida shu so'z uchraydigan buyruqlarni qidirish |
| `type ls`, `which ls` | Buyruq nima va qayerda joylashgan |

`man` sahifasi tuzilishi doim bir xil: **NAME** (nima), **SYNOPSIS** (qanday yoziladi), **DESCRIPTION**, **OPTIONS**, ba'zan **EXAMPLES**. To'liq o'qish shart emas — kerakli opsiyani `/` bilan qidiring.

Brauzerda: `explainshell.com` — murakkab buyruqni yopishtirsangiz, har bir qismini alohida tushuntirib beradi.

:::tip
Internetdan topilgan buyruqni tushunmasdan terminalga yopishtirmang — ayniqsa `sudo` bilan boshlansa. Avval `man` yoki explainshell orqali nima qilishini aniqlang. Bu ham xavfsizlik odati, ham o'rganishning eng yaxshi usuli.
:::

## Tezkor tugmalar

Bular sizni bir necha baravar tezlashtiradi. Birinchi kundan odat qiling:

| Tugma | Vazifasi |
|---|---|
| `Tab` | Buyruq yoki fayl nomini **to'ldirish**. Ikki marta — variantlar ro'yxati |
| `↑` / `↓` | Oldingi buyruqlar orasida yurish |
| `Ctrl + C` | Ishlayotgan buyruqni **to'xtatish** |
| `Ctrl + L` | Ekranni tozalash (`clear`) |
| `Ctrl + R` | Buyruqlar tarixidan **qidirish** |
| `Ctrl + A` / `Ctrl + E` | Qator boshiga / oxiriga |
| `Ctrl + U` | Kursordan qator boshigacha o'chirish |
| `Ctrl + D` | Sessiyani yopish (`exit`) |

Eng muhimi — **Tab**. U nafaqat tezlashtiradi, balki xatodan saqlaydi: agar Tab nomni to'ldirmasa — bunday fayl yo'q yoki siz noto'g'ri joydasiz.

Terminalda nusxalash: `Ctrl + Shift + C`, joylash: `Ctrl + Shift + V`. Oddiy `Ctrl + C` bu yerda **to'xtatish** degani.

## Buyruq natijasi: uch xil javob

1. **Natija chiqdi** — buyruq ma'lumot qaytardi.
2. **Hech narsa chiqmadi** — bu ko'pincha **muvaffaqiyat**. Linux'da "jim" degani "bajarildi" degani: `mkdir papka` hech narsa demaydi.
3. **Xato chiqdi** — o'qing. Eng ko'p uchraydiganlari:

| Xato | Ma'nosi | Odatiy sabab |
|---|---|---|
| `command not found` | Bunday buyruq yo'q | Imlo xatosi yoki dastur o'rnatilmagan |
| `No such file or directory` | Fayl yoki katalog topilmadi | Yo'l noto'g'ri, boshqa katalogdasiz |
| `Permission denied` | Ruxsat yo'q | `sudo` kerak yoki fayl sizniki emas |
| `Is a directory` | Bu fayl emas, katalog | `cat` ni katalogga qo'llagansiz |

Bu to'rt xabarni tanib olsangiz, dastlabki muammolaringizning aksariyati o'z-o'zidan hal bo'ladi.

## root va sudo

Linux'da cheksiz huquqli bosh foydalanuvchi — [[root|root]]. U istalgan faylni o'qiy, o'zgartira va o'chira oladi — tizimning o'zini ham.

Doim root sifatida ishlash xavfli: bitta xato buyruq tizimni yo'q qiladi. Shuning uchun oddiy foydalanuvchi sifatida ishlanadi, kerak bo'lgandagina [[sudo|sudo]] ishlatiladi:

```bash
apt update             # xato: ruxsat yo'q
sudo apt update        # parol so'raydi va root huquqida bajaradi
```

`sudo` — "**s**uper**u**ser **do**": faqat **shu bitta buyruqni** root nomidan bajaradi. Ruxsatlar haqida alohida darsda batafsil gaplashamiz.

## Amaliyot

O'qish yetarli. Quyidagi labda haqiqiy terminalga o'xshash muhitda birinchi buyruqlaringizni bajaring — `Tab` va `↑` ni ham sinab ko'ring:

:::lab terminal-birinchi-qadam

Kali virtual mashinangiz tayyor bo'lsa, xuddi shu buyruqlarni u yerda ham takrorlang. Keyin **OverTheWire Bandit** o'yinini boshlang (mavzu manbalarida) — u butun Linux bosqichi davomida sizga hamroh bo'ladi: har darajada bitta yangi ko'nikma.

## Xulosa

- **Linux** — yadro; **distributiv** — yadro + vositalar. Kali — pentest uchun Debian asosidagi distributiv.
- **Terminal** — oyna, **shell** — buyruq tarjimoni, **Bash/Zsh** — aniq shell dasturlari.
- Prompt: `foydalanuvchi@kompyuter:katalog$`. **`$`** — oddiy foydalanuvchi, **`#`** — root.
- Buyruq = **buyruq + opsiyalar + argumentlar**. Katta-kichik harf farqlanadi.
- Yordam: `man`, `--help`.
- **Tab** — to'ldirish, **↑** — tarix, **Ctrl+C** — to'xtatish, **Ctrl+R** — tarixdan qidirish.
- Jimlik — odatda muvaffaqiyat. Xato xabarini o'qing.
- `sudo` — bitta buyruqni root huquqida bajarish.

:::quiz
? Taklif satri `root@server:/etc#` ko'rinishida. Oxiridagi `#` nimani bildiradi?
- Bu izoh boshlanishi
+ Siz root foydalanuvchi sifatida ishlayapsiz
- Buyruq xato bilan tugadi
- Katalog bo'sh
! `$` — oddiy foydalanuvchi, `#` — root. Root sifatida har bir buyruqqa alohida e'tibor kerak.

? `ls -la /var/log` buyrug'ida `/var/log` nima?
- Buyruq
- Opsiya
+ Argument
- Izoh
! ls — buyruq, -la — opsiyalar, /var/log — argument (buyruq nima ustida ishlashi).

? Buyruqni bajardingiz va ekranga hech narsa chiqmadi. Bu odatda nimani anglatadi?
- Buyruq ishlamadi
- Terminal osilib qoldi
+ Buyruq muvaffaqiyatli bajarildi
- Ruxsat yetmadi
! Linux'da ko'p buyruqlar muvaffaqiyatli bajarilganda jim turadi. Xato bo'lsa — xabar chiqadi.

? Terminalda ishlayotgan buyruqni to'xtatish uchun qaysi tugmalar bosiladi?
- Ctrl + V
+ Ctrl + C
- Ctrl + Z
- Esc
! Ctrl+C jarayonga to'xtash signalini yuboradi. Terminalda nusxalash uchun esa Ctrl+Shift+C ishlatiladi.

? `Cat fayl.txt` buyrug'i `command not found` xatosini berdi. Sabab nima?
- Fayl mavjud emas
- Ruxsat yo'q
+ Linux katta-kichik harfni farqlaydi — buyruq `cat` deb yoziladi
- cat dasturi o'chirilgan
! `Cat` va `cat` — Linux uchun ikki xil nom. Buyruqlar deyarli doim kichik harflarda.

? Notanish buyruqning to'liq qo'llanmasini qanday ochasiz?
- help buyruq
+ man buyruq
- info --all
- buyruq /?
! man (manual) — o'rnatilgan qo'llanma. Qisqa ma'lumot uchun `buyruq --help`. `/?` — Windows usuli.

? Kali Linux va Ubuntu orasidagi munosabat qanday?
- Ular butunlay boshqa operatsion tizimlar, buyruqlari mos kelmaydi
+ Ikkalasi ham Debian asosidagi Linux distributivlari — buyruqlarning aksariyati bir xil
- Kali — Windows asosida
- Ubuntu — Kali'ning eski nomi
! Ikkalasi Debian oilasidan. Asosiy farq — oldindan o'rnatilgan dasturlar va maqsadda.

? Tab tugmasining terminaldagi vazifasi qanday?
+ Buyruq va fayl nomlarini avtomatik to'ldirish
- Yangi oyna ochish
- Buyruqni bekor qilish
- Ekranni tozalash
! Tab yozishni tezlashtiradi va xatodan saqlaydi: to'ldirmasa, demak bunday nom yo'q.

? `sudo` nima qiladi?
- Foydalanuvchini butunlay root'ga aylantiradi
+ Bitta buyruqni root huquqida bajaradi
- Tizimni qayta yuklaydi
- Parolni o'zgartiradi
! sudo faqat o'zidan keyingi buyruqni root nomidan bajaradi. Bu doim root bo'lib ishlashdan ancha xavfsiz.
:::

:::cards
Linux va distributiv farqi? :: Linux — yadro (kernel). Distributiv — yadro + shell, vositalar va dasturlar yig'indisi (Ubuntu, Debian, Kali).
Terminal, shell va Bash nima? :: Terminal — matnli oyna; shell — buyruqlarni bajaradigan dastur; Bash — eng keng tarqalgan shell.
Promptdagi $ va # nimani bildiradi? :: $ — oddiy foydalanuvchi; # — root.
Buyruq qaysi uch qismdan iborat? :: Buyruq (nima), opsiyalar (qanday), argumentlar (nima ustida): ls -la /var/log
Buyruq haqida yordam olishning ikki asosiy usuli? :: man buyruq (to'liq qo'llanma) va buyruq --help (qisqa).
Tab, Ctrl+C, Ctrl+R terminalda nima qiladi? :: Tab — to'ldirish; Ctrl+C — buyruqni to'xtatish; Ctrl+R — tarixdan qidirish.
“Permission denied” va “No such file or directory” nimani anglatadi? :: Birinchisi — ruxsat yo'q (sudo kerak yoki fayl sizniki emas); ikkinchisi — yo'l noto'g'ri yoki fayl mavjud emas.
sudo nima? :: Bitta buyruqni root (superuser) huquqida bajarish.
Yangi tizimga kirganda “kimman va qayerdaman” buyruqlari? :: whoami, id, hostname, pwd, uname -a
:::
