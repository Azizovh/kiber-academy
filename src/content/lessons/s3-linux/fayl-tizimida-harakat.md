Pentester serverga kirdi. Birinchi savoli: "bu yerda nima bor?" SOC analitigi shubhali serverni tekshiryapti. Birinchi savoli: "bu yerda nima bo'lmasligi kerak?" Ikkalasi ham bir xil ish qiladi: fayl tizimida yuradi va qaraydi.

Uch buyruq — `pwd`, `ls`, `cd` — Linux'dagi ishning yarmini tashkil qiladi. Bu darsda ularni oxirigacha o'rganamiz va tizimning xaritasini chizamiz.

## Bitta daraxt

"Fayl tizimlari" darsidan eslaysiz: Linux'da `C:`, `D:` kabi disklar yo'q. Hamma narsa **bitta ildiz**dan o'sadi — `/`.

```
/
├── bin      asosiy buyruqlar (ls, cat, cp…)
├── boot     yadro va yuklovchi
├── dev      qurilmalar fayl ko'rinishida
├── etc      SOZLAMALAR
├── home     foydalanuvchilar uylari
│   ├── ali
│   └── talaba
├── opt      qo'shimcha dasturlar
├── proc     yadro va jarayonlar haqida ma'lumot
├── root     root foydalanuvchining uyi
├── tmp      vaqtinchalik fayllar
├── usr      dasturlar va kutubxonalar
│   ├── bin
│   └── share
└── var      o'zgaruvchan ma'lumot
    ├── log  JURNALLAR
    └── www  veb-sayt fayllari
```

Linux'ning mashhur tamoyili: **"hamma narsa — fayl"**. Qurilmalar (`/dev/sda` — disk), jarayonlar (`/proc/1234/`), tizim sozlamalari — hammasi fayl sifatida ko'rinadi. Shuning uchun fayllar bilan ishlashni bilsangiz, butun tizim bilan ishlay olasiz.

## pwd — qayerdaman?

```bash
$ pwd
/home/talaba
```

`pwd` (print working directory) — hozir turgan katalogingizning mutlaq yo'li. Adashsangiz — birinchi yozadigan buyrug'ingiz.

## ls — bu yerda nima bor?

```bash
ls              # hozirgi katalog
ls /etc         # ko'rsatilgan katalog
ls -l           # batafsil ro'yxat
ls -a           # yashirin fayllar bilan
ls -la          # ikkalasi birga — eng ko'p ishlatiladigan shakl
ls -lh          # hajmlar o'qishga qulay ko'rinishda (K, M, G)
ls -lt          # vaqt bo'yicha saralangan, eng yangisi tepada
ls -ltr         # teskari: eng yangisi pastda
ls -R           # ichki kataloglar bilan birga
```

### `ls -l` chiqishini o'qish

```
-rw-r--r-- 1 talaba talaba  1482 Nov 16 09:00 reja.txt
drwxr-xr-x 2 talaba talaba  4096 Nov 15 18:22 hujjatlar
lrwxrwxrwx 1 root   root      11 Nov 10 12:00 python -> python3.12
```

| Ustun | Misol | Ma'nosi |
|---|---|---|
| 1 | `-rw-r--r--` | Turi va ruxsatlar |
| 2 | `1` | Havolalar soni |
| 3 | `talaba` | Egasi |
| 4 | `talaba` | Guruhi |
| 5 | `1482` | Hajmi (baytda) |
| 6 | `Nov 16 09:00` | Oxirgi o'zgartirilgan vaqt |
| 7 | `reja.txt` | Nomi |

Birinchi belgining o'zi — fayl turi: `-` — oddiy fayl, `d` — katalog, `l` — havola (symlink). Ruxsatlarni alohida darsda batafsil o'rganasiz.

`ls -lt` — tergovda juda foydali: "bu katalogda eng oxirgi nima o'zgargan?" Hujumdan keyin birinchi qaraladigan narsalardan biri.

### Yashirin fayllar

Nuqta bilan boshlanadigan fayl va kataloglar oddiy `ls` da ko'rinmaydi:

```bash
$ ls
hujjatlar  reja.txt

$ ls -a
.  ..  .bash_history  .bashrc  .ssh  hujjatlar  reja.txt
```

`.` — hozirgi katalogning o'zi, `..` — ota katalog. Qolganlari — sozlamalar va… qiziq narsalar:

| Fayl | Nima bor | Nega qiziq |
|---|---|---|
| `.bash_history` | Foydalanuvchi yozgan buyruqlar tarixi | Buyruqda parol yozilgan bo'lishi mumkin |
| `.ssh/` | SSH kalitlari | Yopiq kalit — boshqa serverlarga yo'l |
| `.bashrc` | Shell sozlamalari | Har kirishda bajariladi — persistence joyi |
| `.config/` | Dasturlar sozlamalari | Saqlangan tokenlar, parollar |

:::key
**Doim `ls -la` yozing.** Oddiy `ls` — yarim haqiqat. Eng qimmatli topilmalar (kalitlar, tarix, sozlamalar) ham, hujumchi yashirgan fayllar ham nuqta ortida turadi.
:::

## cd — boshqa joyga o'tish

```bash
cd hujjatlar        # nisbiy yo'l: hozirgi katalog ichidagi papkaga
cd /var/log         # mutlaq yo'l: ildizdan boshlab
cd ..               # bir pog'ona yuqoriga
cd ../..            # ikki pog'ona yuqoriga
cd ~                # uy katalogiga
cd                  # bu ham uy katalogiga
cd -                # oldingi turgan joyga qaytish
cd ~/hujjatlar      # uydagi hujjatlar papkasiga — qayerda bo'lsangiz ham
```

Maxsus belgilar:

| Belgi | Ma'nosi |
|---|---|
| `/` | Ildiz (yo'l boshida) yoki ajratuvchi |
| `~` | [[home-directory|Uy katalogi]] (`/home/siz`) |
| `.` | Hozirgi katalog |
| `..` | Ota katalog |
| `-` | Oldingi katalog (faqat `cd` bilan) |

`cd -` — ikki katalog orasida borib-kelishda juda qulay: `/var/log` va `/etc/nginx` orasida "sakrab" ishlaysiz.

### Mutlaq va nisbiy — qachon qaysi biri

- **Mutlaq yo'l** (`/etc/ssh/sshd_config`) — qayerda turganingizdan qat'i nazar ishlaydi. Skriptlarda va hujjatlarda doim shuni ishlating.
- **Nisbiy yo'l** (`../log/auth.log`) — qisqa, lekin hozirgi joyingizga bog'liq.

Xato chiqsa (`No such file or directory`) — birinchi navbatda `pwd` yozib, qayerda ekaningizni tekshiring. Yangi boshlovchilar xatosining yarmi shu.

## Tizim xaritasi: qayerda nima bor

Har bir katalogning aniq vazifasi bor. Bu jadval — sizning xaritangiz:

| Katalog | Nima saqlanadi | Xavfsizlikchi uchun |
|---|---|---|
| `/etc` | Tizim va xizmatlar sozlamalari | Foydalanuvchilar, parol xeshlari, SSH, veb-server, cron sozlamalari |
| `/home` | Foydalanuvchilarning shaxsiy fayllari | Kalitlar, tarix, hujjatlar |
| `/root` | root'ning uyi | Odatda yopiq; ochilsa — tizim sizniki |
| `/var/log` | Jurnallar | Kim kirdi, nima bo'ldi, qachon |
| `/var/www` | Veb-sayt fayllari | Manba kodi, sozlamalar, baza parollari |
| `/tmp` | Vaqtinchalik fayllar; **hamma yoza oladi** | Hujumchilar faylni shu yerga tashlaydi |
| `/opt` | Qo'lda o'rnatilgan dasturlar | Nostandart, ko'pincha yangilanmagan dasturlar |
| `/usr/bin` | Dasturlar | — |
| `/usr/share` | Dasturlarning umumiy ma'lumotlari | Kali'da: `/usr/share/wordlists` — parol lug'atlari |
| `/proc` | Ishlayotgan jarayonlar haqida "jonli" ma'lumot | Jarayon buyruq satri, muhit o'zgaruvchilari |
| `/dev` | Qurilmalar | `/dev/null` — "qora tuynuk" |
| `/boot` | Yadro | Yadro versiyasi |
| `/mnt`, `/media` | Ulangan disklar va fleshkalar | — |

`/etc` ichidagi eng muhim fayllar:

| Fayl | Nima |
|---|---|
| `/etc/passwd` | Foydalanuvchilar ro'yxati. Hamma o'qiy oladi |
| `/etc/shadow` | Parol xeshlari. Faqat root o'qiydi |
| `/etc/group` | Guruhlar |
| `/etc/hosts` | Lokal nom → IP jadvali |
| `/etc/hostname` | Kompyuter nomi |
| `/etc/sudoers` | Kim sudo ishlata oladi |
| `/etc/ssh/sshd_config` | SSH server sozlamalari |
| `/etc/crontab` | Rejalashtirilgan vazifalar |

:::info
`/tmp` — hamma yoza oladigan joy, shuning uchun u hujumchilarning sevimli maydoni: huquqi past bo'lsa ham, vositalarini shu yerga yuklaydi. Tergovda `/tmp`, `/var/tmp` va `/dev/shm` kataloglari birinchilardan tekshiriladi.
:::

## Fayl haqida ko'proq bilish

```bash
file hisobot.pdf        # faylning haqiqiy turi (sehrli baytlar bo'yicha)
stat reja.txt           # to'liq metadata: uchta vaqt, ruxsatlar, hajm
du -sh hujjatlar        # katalog jami qancha joy egallaydi
df -h                   # disklarda qancha bo'sh joy bor
tree                    # katalog daraxtini chizib beradi (o'rnatilgan bo'lsa)
```

`stat` uchta vaqtni ko'rsatadi — tergovda ular alohida ma'noga ega:

| Vaqt | Qachon yangilanadi |
|---|---|
| **Access** (atime) | Fayl oxirgi marta o'qilganda |
| **Modify** (mtime) | Fayl **mazmuni** o'zgarganda |
| **Change** (ctime) | Mazmun **yoki** metadata (ruxsat, egasi, nomi) o'zgarganda |

Hujumchi fayl vaqtini soxtalashtirishi mumkin (`touch` bilan mtime'ni o'zgartirish oson) — lekin ctime'ni to'g'ridan-to'g'ri o'zgartirib bo'lmaydi. mtime va ctime orasidagi g'alati farq — tergovchi uchun belgi.

## Tab — eng yaxshi do'stingiz

Yo'llarni to'liq yozmang:

```
cd /v[Tab]/l[Tab]     →     cd /var/log/
cat /etc/hostn[Tab]   →     cat /etc/hostname
```

Tab ikki marta — mos keladigan variantlar ro'yxati. Tab hech narsa qilmasa — bunday nom yo'q.

## Yangi tizimda birinchi besh daqiqa

Notanish Linux mashinasiga kirganda tajribali odam taxminan shu ketma-ketlikni bajaradi:

```bash
whoami; id                  # kimman, qaysi guruhlardaman
hostname; uname -a          # qayerdaman, qanday tizim
pwd; ls -la                 # qaysi katalog, nima bor
ls -la /home                # boshqa foydalanuvchilar
cat /etc/passwd             # barcha hisoblar
ls -la /tmp /opt /var/www   # qiziq joylar
```

`;` belgisi buyruqlarni ketma-ket bajaradi. Bu ro'yxat — "situatsion xabardorlik": harakat qilishdan oldin vaziyatni tushunish.

## Amaliyot

Labda fayl tizimi bo'ylab yuring: nisbiy va mutlaq yo'l, yashirin fayl, `cd ..` va `cd ~`.

:::lab terminal-birinchi-qadam

Keyin Amaliyot bo'limidagi **"Yashiringan fayl"** CTF topshirig'ini yeching — u aynan shu dars ko'nikmalarini tekshiradi.

## Xulosa

- Linux fayl tizimi — `/` dan boshlanadigan **bitta daraxt**; hamma narsa — fayl.
- `pwd` — qayerdaman; `ls` — nima bor; `cd` — o'tish.
- **`ls -la`** — yashirin fayllar bilan batafsil ro'yxat. Doim shuni yozing.
- `ls -lt` — eng oxirgi o'zgargan fayllar.
- `cd ..` yuqoriga, `cd ~` uyga, `cd -` oldingi joyga.
- `/etc` — sozlamalar, `/var/log` — jurnallar, `/home` — foydalanuvchilar, `/tmp` — hamma yozadigan joy.
- `.bash_history`, `.ssh/` — eng qiziq yashirin joylar.
- `stat` — uchta vaqt: access, modify, change.

:::quiz
? Yashirin fayllarni ham batafsil ko'rsatadigan buyruq qaysi?
- ls -l
- ls -h
+ ls -la
- ls --hidden
! -l batafsil ro'yxat beradi, -a esa nuqta bilan boshlanadigan fayllarni ham ko'rsatadi.

? Siz `/var/log/nginx` katalogidasiz. `cd ../..` buyrug'idan keyin qayerda bo'lasiz?
- /var/log
+ /var
- /
- /home
! Har `..` bir pog'ona yuqoriga: nginx → log → var. Natija: /var.

? Tizim va xizmatlarning sozlamalari qaysi katalogda saqlanadi?
- /var
- /home
+ /etc
- /bin
! /etc — sozlamalar katalogi: passwd, shadow, hosts, ssh, crontab va boshqalar shu yerda.

? `cd -` buyrug'i nima qiladi?
- Ildiz katalogga o'tadi
- Bir pog'ona yuqoriga chiqadi
+ Oldingi turgan katalogga qaytadi
- Uy katalogiga o'tadi
! `cd -` — “orqaga” tugmasi. Uy katalogi uchun `cd ~` yoki shunchaki `cd`.

? Nega hujumchilar o'z fayllarini ko'pincha `/tmp` ga joylaydi?
- Chunki u shifrlangan
+ Chunki unga har qanday foydalanuvchi yoza oladi
- Chunki uni antivirus tekshirmaydi
- Chunki u internetga ochiq
! /tmp hamma uchun yoziladigan katalog — past huquqli hisobdan ham foydalanish mumkin. Shuning uchun tergovda u birinchilardan tekshiriladi.

? Foydalanuvchining uy katalogidagi `.bash_history` fayli nega qiziq?
- U tizim parolini saqlaydi
+ Unda foydalanuvchi yozgan buyruqlar tarixi bor — ba'zan parollar ham
- U SSH kalitini saqlaydi
- U jurnallarni o'chiradi
! Odamlar ba'zan parolni buyruq ichida yozadi (masalan `mysql -u root -pParol123`) — va u tarixda qoladi.

? `ls -l` chiqishida qator `d` harfi bilan boshlansa, bu nima?
- O'chirilgan fayl
+ Katalog
- Qurilma
- Yashirin fayl
! Birinchi belgi tur: `-` oddiy fayl, `d` katalog (directory), `l` havola (link).

? Katalogda eng oxirgi o'zgartirilgan fayllarni birinchi ko'rsatadigan buyruq qaysi?
- ls -la
- ls -lh
+ ls -lt
- ls -R
! -t vaqt bo'yicha saralaydi, eng yangisi tepada. Tergovda “oxirgi nima o'zgargan?” degan savolga javob beradi.

? Parol xeshlari Linux'da qaysi faylda saqlanadi?
- /etc/passwd
+ /etc/shadow
- /etc/hosts
- /var/log/auth.log
! /etc/passwd da faqat foydalanuvchilar ro'yxati bor va uni hamma o'qiydi. Xeshlar /etc/shadow da — faqat root uchun.
:::

:::cards
pwd, ls, cd nima qiladi? :: pwd — hozirgi katalog yo'li; ls — katalog ichidagilar; cd — katalogni almashtirish.
Yashirin fayllar bilan batafsil ro'yxat? :: ls -la
cd .., cd ~ va cd - farqi? :: cd .. — bir pog'ona yuqoriga; cd ~ — uy katalogiga; cd - — oldingi katalogga.
/etc, /var/log, /home, /tmp da nima bor? :: /etc — sozlamalar; /var/log — jurnallar; /home — foydalanuvchilar uylari; /tmp — hamma yoza oladigan vaqtinchalik fayllar.
ls -l chiqishidagi birinchi belgi nimani bildiradi? :: Fayl turini: - oddiy fayl, d katalog, l havola.
/etc/passwd va /etc/shadow farqi? :: passwd — foydalanuvchilar ro'yxati, hamma o'qiydi; shadow — parol xeshlari, faqat root.
Qaysi yashirin fayllar eng qiziq? :: .bash_history (buyruqlar tarixi), .ssh/ (kalitlar), .bashrc (har kirishda bajariladi).
ls -lt nima beradi? :: Vaqt bo'yicha saralangan ro'yxat — eng oxirgi o'zgargan fayl tepada.
stat ko'rsatadigan uch vaqt? :: Access (o'qilgan), Modify (mazmun o'zgargan), Change (mazmun yoki metadata o'zgargan).
Kali'da parol lug'atlari qayerda? :: /usr/share/wordlists
:::
