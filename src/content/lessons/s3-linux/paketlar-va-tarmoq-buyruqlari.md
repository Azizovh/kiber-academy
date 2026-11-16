Windows'da dastur o'rnatish — saytga kirish, faylni yuklab olish, "Next, Next, Finish". Linux'da — bitta qator: `sudo apt install nmap`. Tezroq, qulayroq va — to'g'ri ishlatilsa — ancha xavfsizroq.

Bu darsning ikkinchi yarmi — tarmoq buyruqlari. Tarmoq bosqichida o'rgangan hamma narsani — IP manzil, port, DNS, marshrut — endi Linux terminalidan ko'rasiz va tekshirasiz.

## Paket menejeri

**Paket** — dastur, uning fayllari va "unga yana nimalar kerak" degan ro'yxat bitta arxivda. [[package-manager|Paket menejeri]] paketlarni yuklaydi, o'rnatadi, yangilaydi va o'chiradi — bog'liqliklarni ham o'zi hal qiladi.

Paketlar [[repository|repozitoriy]]lardan olinadi — distributiv ishlab chiquvchilari yuritadigan ishonchli omborlardan. Har bir paket **raqamli imzolangan**: paket menejeri o'rnatishdan oldin imzoni tekshiradi.

| Distributiv oilasi | Paket menejeri | Paket formati |
|---|---|---|
| Debian, Ubuntu, **Kali** | `apt` | `.deb` |
| RHEL, Rocky, Fedora | `dnf` (eskisi `yum`) | `.rpm` |
| Arch | `pacman` | — |
| Alpine | `apk` | — |

Biz `apt` bilan ishlaymiz — Kali va Ubuntu'da shu.

## apt — asosiy buyruqlar

```bash
sudo apt update                  # paketlar ro'yxatini yangilash
sudo apt upgrade                 # o'rnatilgan paketlarni yangilash
sudo apt full-upgrade            # yangilash + bog'liqlik o'zgarishlari bilan

sudo apt install nmap            # o'rnatish
sudo apt install nmap htop tmux  # bir nechtasini birga
sudo apt remove nmap             # o'chirish (sozlamalar qoladi)
sudo apt purge nmap              # sozlamalari bilan o'chirish
sudo apt autoremove              # keraksiz bo'lib qolgan bog'liqliklarni tozalash

apt search wireshark             # qidirish
apt show nmap                    # paket haqida ma'lumot
apt list --installed             # o'rnatilgan paketlar
apt list --upgradable            # yangilanishi mumkin bo'lganlar
```

:::key
`update` va `upgrade` — ikki xil narsa. **`update`** hech narsani o'rnatmaydi — faqat "omborda nima bor" degan ro'yxatni yangilaydi. **`upgrade`** shu ro'yxat asosida dasturlarni yangilaydi. Shuning uchun ular doim juft keladi: `sudo apt update && sudo apt upgrade`.
:::

`&&` — "birinchisi muvaffaqiyatli bo'lsa, ikkinchisini bajar".

Kali'da tizimni yangilash:

```bash
sudo apt update && sudo apt full-upgrade -y
```

### Past daraja: dpkg

`apt` ortida `dpkg` ishlaydi. Ba'zan u to'g'ridan-to'g'ri kerak bo'ladi:

```bash
dpkg -l                     # o'rnatilgan barcha paketlar va versiyalari
dpkg -l | grep openssh      # aniq paket versiyasi
dpkg -L nmap                # paket qaysi fayllarni o'rnatgan
dpkg -S /usr/bin/nmap       # bu fayl qaysi paketga tegishli
sudo dpkg -i paket.deb      # qo'lda yuklangan .deb faylni o'rnatish
```

`dpkg -l` — server auditida muhim buyruq: o'rnatilgan dasturlar va ularning **aniq versiyalari** ro'yxati. Versiya ma'lum bo'lsa, unda e'lon qilingan zaifliklar bor-yo'qligini tekshirish mumkin.

### Repozitoriylar qayerda yozilgan

```
/etc/apt/sources.list
/etc/apt/sources.list.d/
```

Bu fayllar "paketlarni qayerdan olaman?" degan savolga javob beradi.

## Dastur o'rnatish va xavfsizlik

Paket menejerining xavfsizlikdagi roli ikki tomonlama.

**Yangilanish — eng samarali himoya choralaridan biri.** Birinchi darsdagi WannaCry misolini eslang: zarar ko'rganlar shunchaki yangilanishni o'rnatmagan. Linux'da bitta buyruq butun tizimni — yadro, kutubxonalar, dasturlarni — yangilaydi. Serverlarda xavfsizlik yangilanishlarini avtomatik o'rnatish sozlanadi (`unattended-upgrades`).

**Manba — ishonch masalasi.** Rasmiy repozitoriydagi paket tekshirilgan va imzolangan. Undan tashqaridagi hamma narsa — sizning javobgarligingizda:

| Manba | Ishonch darajasi |
|---|---|
| Distributivning rasmiy repozitoriysi | Yuqori |
| Dastur ishlab chiquvchisining rasmiy repozitoriysi | Odatda yuqori — manzilni rasmiy saytdan oling |
| Noma'lum uchinchi tomon repozitoriysi | Past |
| `curl ... \| sudo bash` ko'rinishidagi o'rnatish | **Ko'r-ko'rona ishonch** |

Oxirgi qator — internetdagi ko'p qo'llanmalarda uchraydigan usul: skriptni yuklab, o'qimasdan root huquqida ishga tushirish. Siz notanish odam yozgan kodga tizimingizda cheksiz huquq beryapsiz. Hech bo'lmaganda avval skriptni yuklab oling va o'qing.

:::warn
Xavfsizlik vositalarini ham faqat ishonchli manbadan oling. GitHub'dagi notanish "exploit" yoki "hack tool" ichida ko'pincha boshqa narsa yashiringan bo'ladi — nishon aynan siz kabi o'rganuvchilar. Kali'ning o'z repozitoriysida yuzlab tekshirilgan vosita bor; boshqasini faqat kodini ko'rib chiqqandan keyin va **virtual mashinada** ishga tushiring.
:::

Boshqa tillarning o'z paket menejerlari ham bor: Python — `pip`, JavaScript — `npm`. Ularning omborlarida hech kim paketlarni oldindan tekshirmaydi; mashhur paket nomiga o'xshash zararli paketlar (typosquatting — DNS darsidagi g'oyaning aynan o'zi) muntazam topiladi. Bu **ta'minot zanjiri** xavfi — AppSec yo'nalishining katta mavzusi.

## Tarmoq buyruqlari

Endi tarmoq bosqichidagi tushunchalarni Linux'da ko'ramiz. Har bir buyruq yonida — u qaysi darsdagi savolga javob berishi.

### Mening manzilim va interfeyslarim

```bash
ip a                    # interfeyslar va IP manzillar (ip addr)
ip -br a                # qisqa ko'rinish
ip link                 # interfeyslar va MAC manzillar
```

```
2: eth0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500
    link/ether 08:00:27:4e:66:a1 brd ff:ff:ff:ff:ff:ff
    inet 10.10.10.2/24 brd 10.10.10.255 scope global eth0
```

O'qiymiz: interfeys `eth0` yoqilgan (`UP`), MAC manzili `08:00:27:…`, IP manzili `10.10.10.2`, maska `/24`, broadcast `.255`. Subnetting darsi — amalda.

Eski tizim va qo'llanmalarda `ifconfig` uchraydi — u eskirgan, lekin tanib olish kerak.

### Marshrutlar va qo'shnilar

```bash
ip route                # marshrut jadvali; "default via" — gateway
ip neigh                # ARP keshi (lokal tarmoqdagi qo'shnilar)
```

### DNS

```bash
cat /etc/resolv.conf    # qaysi DNS serverdan foydalanyapman
cat /etc/hosts          # lokal nom → IP jadvali

dig example.com +short
nslookup example.com
host example.com
```

### Aloqani tekshirish

```bash
ping -c 4 8.8.8.8       # 4 ta so'rov yuborib to'xtaydi
traceroute 8.8.8.8      # yo'ldagi routerlar
```

Linux'da `ping` o'zi to'xtamaydi — `-c` bilan sonini bering yoki `Ctrl + C` bosing.

### Tinglayotgan portlar va ulanishlar

```bash
ss -tulpn               # tinglayotgan TCP/UDP portlar va ularni ochgan jarayonlar
ss -tn                  # o'rnatilgan TCP ulanishlar
```

Opsiyalar: `-t` TCP, `-u` UDP, `-l` faqat tinglayotganlar, `-p` jarayon, `-n` nomlar o'rniga raqamlar.

```
Netid State  Local Address:Port   Process
tcp   LISTEN 0.0.0.0:22           users:(("sshd",pid=701))
tcp   LISTEN 127.0.0.1:5432       users:(("postgres",pid=912))
tcp   LISTEN 0.0.0.0:80           users:(("nginx",pid=810))
```

Bu uch qatorni IP darsidagi bilim bilan o'qing: SSH va veb-server **tarmoqdan ochiq** (`0.0.0.0`), ma'lumotlar bazasi esa **faqat lokal** (`127.0.0.1`) — aynan shunday bo'lishi kerak.

`ss -tulpn` — server auditining birinchi buyruqlaridan biri: "bu mashina tashqi dunyoga nimalarni taklif qilyapti?" Jarayonlar darsidagi PID bilan bog'lab, har bir port ortida aynan nima turganini aniqlaysiz. Eski tizimlarda xuddi shu vazifani `netstat -tulpn` bajaradi.

### HTTP so'rovlar: curl va wget

```bash
curl https://example.com              # sahifani ekranga chiqarish
curl -I https://example.com           # faqat javob sarlavhalari
curl -v https://example.com           # butun muloqotni ko'rsatish
curl -o fayl.html https://example.com # faylga saqlash
curl -L https://example.com           # yo'naltirishlarga ergashish

wget https://example.com/fayl.zip     # faylni yuklab olish
```

`curl` — HTTP darsidagi so'rov va javoblarni qo'lda yuborish va ko'rish vositasi. API bilan ishlash, veb-serverni tekshirish, skriptlarda ma'lumot olish — hammasi shu orqali.

### netcat — tarmoq uchun "shveytsariya pichog'i"

`nc` (netcat) — istalgan TCP yoki UDP portga ulanadigan yoki portni tinglaydigan sodda vosita. Diagnostikada beqiyos:

```bash
nc -zv 10.10.10.5 22          # port ochiqmi? (-z: faqat tekshirish, -v: batafsil)
nc -zv 10.10.10.5 20-25       # portlar oralig'i
nc 10.10.10.5 22              # ulanib, xizmat bannerini ko'rish
```

"Xizmat ishlayaptimi yoki firewall to'syaptimi?" degan savolga eng tez javob shu. Tarmoq bosqichidagi "banner" tushunchasini ham `nc` bilan o'z ko'zingiz bilan ko'rasiz.

`nc` o'z laboratoriyangizdagi ikki mashina orasida oddiy matn almashish yoki fayl uzatishni sinab ko'rish uchun ham ishlatiladi. Pentest yo'nalishida u bilan chuqurroq tanishasiz.

### Vaqtinchalik veb-server

Fayllarni laboratoriyangizdagi boshqa mashinaga tez yetkazishning eng oson yo'li:

```bash
python3 -m http.server 8000
```

Hozirgi katalog `http://sizning-ip:8000` manzilida ochiladi. Ish tugagach — `Ctrl + C`.

:::warn
Bu server hozirgi katalogdagi **hamma narsani** tarmoqdagi **hammaga** parolsiz ko'rsatadi. Uni uy katalogingizda emas, alohida bo'sh papkada ishga tushiring va ish tugashi bilan to'xtating.
:::

## Hammasi birga: tarmoq diagnostikasi

Tarmoq bosqichidagi diagnostika ketma-ketligi — endi Linux buyruqlari bilan:

| Qadam | Savol | Buyruq |
|---|---|---|
| 1 | Interfeys yoqilganmi, manzil bormi? | `ip -br a` |
| 2 | Gateway kim? | `ip route` |
| 3 | Gateway javob beryaptimi? | `ping -c 2 <gateway>` |
| 4 | Internetga chiqyapmanmi? | `ping -c 2 8.8.8.8` |
| 5 | DNS ishlayaptimi? | `dig example.com +short` |
| 6 | Kerakli port ochiqmi? | `nc -zv manzil port` |
| 7 | Xizmat javob beryaptimi? | `curl -I http://manzil` |

Bu — OSI modelidagi "pastdan yuqoriga" tekshiruvning aynan o'zi.

Va serverning o'zini ko'zdan kechirish:

```bash
ip -br a            # qaysi tarmoqlarda turibdi
ss -tulpn           # nimalarni tinglayapti
ip route            # qayerga chiqa oladi
cat /etc/hosts      # qanday nomlarni biladi
dpkg -l | wc -l     # nechta paket o'rnatilgan
```

## Amaliyot

Labda notanish tarmoqda o'zingizni aniqlaysiz, qo'shni qurilmalarni va ulardagi xizmatlarni topasiz. U yerdagi tarmoq — o'quv simulyatsiyasi.

:::lab tarmoq-razvedka

:::try
Kali VM'ingizda bajaring:

```bash
ip -br a
ip route
cat /etc/resolv.conf
ss -tulpn
```

1. VM'ingizning IP manzili va maskasi qanday? "Virtualizatsiya" darsidagi NAT rejimiga mos keladimi?
2. Default gateway manzili nima?
3. Qaysi portlar tinglayapti? Ular `0.0.0.0` dami yoki `127.0.0.1` da?

Keyin: `sudo apt update`, `apt list --upgradable | head`, va biror kichik dasturni o'rnating: `sudo apt install tree`. `dpkg -L tree` bilan u qaysi fayllarni o'rnatganini ko'ring.
:::

## Xulosa

- **Paket menejeri** dasturlarni ishonchli, imzolangan repozitoriylardan o'rnatadi; Debian/Kali'da — `apt`.
- `apt update` — ro'yxatni yangilaydi; `apt upgrade` — dasturlarni. Doim juft.
- `dpkg -l` — o'rnatilgan paketlar va versiyalari.
- Yangilash — eng samarali himoya; noma'lum manba va `curl | sudo bash` — ko'r-ko'rona ishonch.
- `ip a`, `ip route`, `ip neigh` — manzil, marshrut, qo'shnilar.
- **`ss -tulpn`** — tinglayotgan portlar va ularning jarayonlari.
- `curl` — HTTP so'rovlar; `nc -zv` — port tekshirish.
- Diagnostika: interfeys → gateway → internet → DNS → port → xizmat.

:::quiz
? `sudo apt update` buyrug'i nima qiladi?
- Barcha dasturlarni yangi versiyaga o'tkazadi
+ Repozitoriylardagi paketlar ro'yxatini yangilaydi, hech narsa o'rnatmaydi
- Tizimni qayta yuklaydi
- Eski paketlarni o'chiradi
! update faqat “omborda nima bor” ro'yxatini yangilaydi. Dasturlarni yangilash — upgrade ning ishi.

? Serverda tinglayotgan portlar va ularni ochgan jarayonlarni qaysi buyruq ko'rsatadi?
- ip a
- ping -c 4
+ ss -tulpn
- apt list
! ss -tulpn: TCP va UDP, faqat tinglayotganlar, jarayon nomi va PID bilan, raqamli ko'rinishda.

? `ss -tulpn` natijasida ma'lumotlar bazasi `127.0.0.1:5432` da tinglayapti. Bu nimani anglatadi?
- Baza internetga ochiq
+ Bazaga faqat shu serverning o'zidan ulanish mumkin
- Baza o'chirilgan
- Port band emas
! 127.0.0.1 — loopback: faqat lokal ulanishlar. Tarmoqdan ochiq bo'lsa, 0.0.0.0 yoki aniq tarmoq manzili ko'rinardi.

? Nega `curl https://sayt/install.sh | sudo bash` ko'rinishidagi o'rnatish xavfli?
- curl sekin ishlaydi
+ Siz notanish skriptni o'qimasdan root huquqida ishga tushiryapsiz
- Bu faqat Windows'da ishlaydi
- sudo bu holatda ishlamaydi
! Skript ichida nima borligini bilmaysiz, lekin unga tizimda cheksiz huquq beryapsiz. Avval yuklab olib, o'qish kerak.

? O'rnatilgan paketlar va ularning versiyalarini qaysi buyruq ko'rsatadi?
+ dpkg -l
- apt update
- ip route
- which apt
! dpkg -l o'rnatilgan barcha paketlarni versiyalari bilan ro'yxat qiladi — auditda zaif versiyalarni aniqlash uchun kerak.

? Masofadagi serverda 443-port ochiq yoki yopiqligini tez tekshirish uchun qaysi buyruq mos?
- ping -c 4 server
+ nc -zv server 443
- ip a
- cat /etc/hosts
! ping faqat host javob berishini tekshiradi, portni emas. nc -zv aniq portga ulanib ko'radi.

? Linux'da default gateway manzilini qaysi buyruq ko'rsatadi?
- ip a
+ ip route
- ss -tn
- dig
! ip route chiqishidagi “default via ...” qatori — default gateway.

? Rasmiy repozitoriydagi paketlar nega ishonchliroq?
- Ular bepul
+ Ular distributiv jamoasi tomonidan yuritiladi va raqamli imzo bilan tekshiriladi
- Ular kichikroq
- Ular faqat ochiq kodli
! Paket menejeri har bir paketning imzosini tekshiradi — yo'lda almashtirilgan yoki soxta paket o'rnatilmaydi.

? `python3 -m http.server 8000` ishga tushirilganda nimaga ehtiyot bo'lish kerak?
- U kompyuterni sekinlashtiradi
+ U hozirgi katalogdagi hamma faylni tarmoqdagi hammaga parolsiz ochadi
- U faqat root uchun ishlaydi
- U fayllarni o'chiradi
! Bu sodda server autentifikatsiyasiz ishlaydi. Uni alohida papkada ishga tushirib, ish tugagach to'xtatish kerak.

? `apt update && apt upgrade` dagi `&&` nimani bildiradi?
- Ikkala buyruq parallel bajariladi
+ Ikkinchi buyruq faqat birinchisi muvaffaqiyatli tugasa bajariladi
- Birinchi buyruq natijasi ikkinchisiga uzatiladi
- Ikkinchi buyruq fonda bajariladi
! && — mantiqiy “va”: chapdagi muvaffaqiyatli bo'lsagina o'ngdagi ishga tushadi. Natijani uzatish — | ning ishi.
:::

:::cards
apt update va apt upgrade farqi? :: update — paketlar ro'yxatini yangilaydi; upgrade — o'rnatilgan dasturlarni yangilaydi.
Dastur o'rnatish va o'chirish? :: sudo apt install nomi; sudo apt remove nomi (sozlamalari bilan: purge).
O'rnatilgan paketlar va versiyalari? :: dpkg -l (aniq paket: dpkg -l | grep nomi).
IP manzil va interfeyslarni ko'rish? :: ip a (qisqa: ip -br a).
Marshrut jadvali va gateway? :: ip route — “default via” qatori.
Tinglayotgan portlar va jarayonlari? :: ss -tulpn
Port ochiqligini tekshirish? :: nc -zv manzil port
Faqat HTTP javob sarlavhalarini olish? :: curl -I https://manzil
DNS sozlamalari qaysi fayllarda? :: /etc/resolv.conf — DNS serverlar; /etc/hosts — lokal nom → IP jadvali.
Tarmoq diagnostikasi tartibi (Linux)? :: ip -br a → ip route → ping gateway → ping 8.8.8.8 → dig → nc -zv → curl -I
curl | sudo bash nega xavfli? :: Notanish skript o'qilmasdan root huquqida bajariladi.
:::
