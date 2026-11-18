Siz birinchi marta bulutdan oyiga bir necha dollarlik kichik server ijaraga oldingiz. Provayder IP manzil berdi — `203.0.113.20`. Ulanib, hali hech narsa o'rnatmasdan `auth.log` ni ochasiz va hayron qolasiz: server yoqilganiga **o'n daqiqa** bo'lgan, jurnalda esa allaqachon yuzlab qatorlar bor — `Failed password for root from 198.51.100.73`, `Invalid user admin from 198.51.100.90`, `Invalid user oracle`…

Sizni hech kim tanimaydi, serveringiz haqida hech kim bilmaydi. Lekin internetdagi avtomatik skanerlar har bir ommaviy IP manzilni doimiy tekshirib turadi. Internetga chiqqan server birinchi daqiqadan **hujum ostida** bo'ladi.

Bulut xavfsizligi muhandisi himoya qiladigan narsaning o'zini qura olishi kerak. Bu dars — Cloud tarmog'ining poydevori: oddiy Linux serverni noldan olib, xavfsiz holga keltirish va unga ilova joylash. Linux bosqichida (s3) buyruqlarni o'rgangansiz; endi ularni bitta maqsad sari birlashtiramiz.

## Server ma'muri nima qiladi

| Vazifa | Savol | Bu darsda |
|---|---|---|
| Yangilash | Ma'lum zaifliklar yopilganmi? | `apt`, avtomatik yangilanish |
| Foydalanuvchilar | Kim kira oladi, kim `root` bo'la oladi? | alohida admin hisobi, `sudo` |
| Masofaviy kirish | Eshik qanchalik mustahkam? | SSH kalit, root taqiqi, fail2ban |
| Tarmoq | Qaysi portlar ochiq? | `ss`, ufw, nftables |
| Xizmatlar | Nima ishlab turibdi va nima keragi yo'q? | `systemctl` |
| Ilova | Sayt qanday ishlaydi? | nginx, TLS, reverse proxy |
| Disk va zaxira | Joy tugamaydimi? Yo'qotilsa, tiklay olamizmi? | `df`, `du`, zaxira rejasi |
| Jurnallar | Nima bo'lganini bilamizmi? | `journalctl`, `auth.log` |

Bu ro'yxatni bir marta bajarib qo'yish yetmaydi — server yashagan sari takrorlanadi. Shuning uchun keyinroq (c3) hammasini kodga aylantiramiz. Hozir esa qo'lda, har bir qadamni tushunib.

Bu tarmoqdagi barcha darslar bitta misol ustida quriladi: AppSec tarmog'idagi **Qaydnoma** ilovasini (Flask'dagi qaydlar ilovasi) internetga chiqaramiz. Server nomi — `qaydnoma-web-01`, domen — `qaydnoma.example.com`.

## 1-qadam: birinchi kirish va yangilash

Provayder odatda `root` yoki `ubuntu` hisobiga kalit bilan kirish beradi:

```bash
ssh ubuntu@203.0.113.20

# Birinchi ish — paketlar ro'yxatini yangilab, o'rnatilganlarni yangilash
sudo apt update
sudo apt upgrade -y

# Xavfsizlik yangilanishlarini avtomatik o'rnatish
sudo apt install -y unattended-upgrades
sudo dpkg-reconfigure --priority=low unattended-upgrades
```

Nega bu birinchi? Server tasviri (image) bir necha oy oldin tayyorlangan bo'lishi mumkin; shu orada topilgan zaifliklar unda hali yopilmagan. [[patch|Yangilash]] — eng arzon va eng samarali himoya. Zaiflik boshqaruvi darsida (a4) ko'rganingizdek, buzilishlarning katta qismi **ma'lum va tuzatilgan**, lekin o'rnatilmagan zaifliklar orqali sodir bo'ladi.

:::warn
`unattended-upgrades` odatda faqat xavfsizlik yangilanishlarini o'rnatadi va yadro (kernel) yangilangandan keyin serverni o'zi qayta yuklamaydi. `/var/run/reboot-required` fayli paydo bo'lsa — qayta yuklash kerak. Buni rejali vaqtga qo'ying, aks holda yangi yadro hech qachon ishga tushmaydi.
:::

## 2-qadam: alohida admin hisobi

Kundalik ishni `root` bilan qilish — xavfli: har bir xato buyruq tizimni buzishi mumkin va jurnalda "kim qildi" degan savol javobsiz qoladi. Linux bosqichidagi [[least-privilege|eng kam imtiyoz]] tamoyili:

```bash
# Shaxsiy admin hisobi
sudo adduser aziz
sudo usermod -aG sudo aziz      # sudo guruhiga qo'shish

# Ilova uchun alohida, kirish huquqisiz hisob
sudo adduser --system --group --no-create-home qaydnoma
```

| Hisob | Maqsad | SSH bilan kira oladimi |
|---|---|---|
| `root` | Faqat favqulodda holat | Yo'q |
| `aziz` | Odam — ma'mur, `sudo` orqali | Ha, kalit bilan |
| `qaydnoma` | Ilova shu nomdan ishlaydi | Yo'q (system hisobi, shell yo'q) |

Ilova alohida hisobda ishlashi muhim: Qaydnoma'da zaiflik qolgan bo'lsa ham, hujumchi faqat `qaydnoma` hisobi ruxsatlariga ega bo'ladi — `root` emas. Bu a2 bosqichidagi "chuqur himoya" g'oyasining server darajasidagi ko'rinishi.

## 3-qadam: SSH eshigini mustahkamlash

Linux bosqichida `sshd_config` asosiy sozlamalarini ko'rgansiz. Endi ularni haqiqiy serverda tartib bilan qo'llaymiz.

**Avval kalit**, o'z kompyuteringizda:

```bash
ssh-keygen -t ed25519 -C "aziz@noutbuk"      # kalit juftligi; parol iborasini qo'ying
ssh-copy-id aziz@203.0.113.20                # ochiq kalitni serverga nusxalash
ssh aziz@203.0.113.20                        # kalit bilan kirishni sinash
```

**Keyin server sozlamalari.** Asosiy faylni tahrirlash o'rniga alohida fayl qo'shish qulay — yangilanishlarda to'qnashmaydi:

```
# /etc/ssh/sshd_config.d/10-hardening.conf
PermitRootLogin no
PasswordAuthentication no
KbdInteractiveAuthentication no
PubkeyAuthentication yes
MaxAuthTries 3
LoginGraceTime 30
AllowUsers aziz
X11Forwarding no
```

```bash
sudo sshd -t && sudo systemctl reload ssh    # avval tekshiruv, keyin qo'llash
```

:::warn
**Joriy seansni yopmang.** Ikkinchi terminalda yangi ulanishni sinab ko'ring. Ishlasa — tayyor. Ishlamasa — birinchi oynada xatoni tuzatasiz. Bulutda o'zingizni serverdan qulflab qo'ysangiz, faqat provayder konsoli (serial console) yoki diskni boshqa serverga ulash orqali qaytasiz — bu soatlab vaqt.
:::

**fail2ban** — jurnalni kuzatib, ko'p xato qilgan IP'ni vaqtincha bloklaydi:

```bash
sudo apt install -y fail2ban
```

```
# /etc/fail2ban/jail.local
[sshd]
enabled  = true
maxretry = 5
findtime = 10m
bantime  = 1h
```

```bash
sudo systemctl restart fail2ban
sudo fail2ban-client status sshd     # nechta IP bloklangan
```

[[fail2ban|fail2ban]] haqida halol gapiraylik: parol bilan kirish o'chirilgan bo'lsa, parol terish hujumi baribir muvaffaqiyatsiz bo'ladi. fail2ban bu holatda asosan **shovqinni kamaytiradi** — jurnal tozaroq, haqiqiy hodisani ko'rish osonroq. U zaif parolni ham, o'g'irlangan kalitni ham himoya qilmaydi.

## 4-qadam: firewall

Avval — hozir nima tinglayotganini ko'ramiz (tarmoq bosqichidagi portlar):

```bash
sudo ss -tlnp
# State   Local Address:Port   Process
# LISTEN  0.0.0.0:22           sshd
# LISTEN  127.0.0.1:5432       postgres
# LISTEN  127.0.0.1:8000       gunicorn
```

`127.0.0.1` da tinglayotgan xizmat tashqaridan ko'rinmaydi — bu yaxshi. `0.0.0.0` da tinglayotgan har bir narsa — internetga ochiq eshik (firewall bo'lmasa).

**ufw** — Ubuntu'dagi oddiy [[firewall|firewall]] boshqaruvchisi:

```bash
sudo ufw default deny incoming     # sukut bo'yicha kiruvchi hammasi yopiq
sudo ufw default allow outgoing
sudo ufw allow OpenSSH             # SSH ni yopib qo'ymaslik uchun AVVAL shu
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
sudo ufw status verbose
```

Yaxshiroq variant — SSH'ni faqat o'z manzilingizdan ochish:

```bash
sudo ufw allow from 198.51.100.10 to any port 22 proto tcp
```

ufw orqasida aslida yadro filtri — **nftables** (eskiroq tizimlarda iptables) ishlaydi. Ko'p serverlarda to'g'ridan-to'g'ri nftables qoidalari yoziladi:

```
# /etc/nftables.conf (qisqartirilgan)
table inet filter {
  chain input {
    type filter hook input priority 0; policy drop;
    ct state established,related accept   # javob paketlari
    iif lo accept                         # lokal trafik
    tcp dport 22 ip saddr 198.51.100.10 accept
    tcp dport { 80, 443 } accept
  }
}
```

`policy drop` — "ruxsat berilmagan hamma narsa taqiqlangan". Bu — xavfsizlikdagi eng muhim sukut bo'yicha qoida. `ct state established,related` qatori firewall'ni **stateful** qiladi: ruxsat berilgan ulanishning javob paketlarini alohida yozish shart emas. Bu so'zni c2 bosqichida bulut firewall'larini solishtirganda yana uchratasiz.

:::info
Bulutda server oldida yana bir firewall bo'ladi — provayderning o'zi (AWS'da security group). Ikkalasini ham ishlatish — chuqur himoya: biri xato sozlansa, ikkinchisi ushlaydi. Lekin ikkita joyda qoidalar bo'lsa, "port nega ochilmayapti?" degan savolda ikkalasini ham tekshirishni unutmang.
:::

## 5-qadam: xizmatlar — ortiqchasini o'chirish

Har bir ishlab turgan xizmat — yangilanishi kerak bo'lgan va zaiflik chiqishi mumkin bo'lgan kod. Bu [[hardening|mustahkamlash]] ning asosiy g'oyasi: **hujum yuzasini kamaytirish**.

```bash
systemctl list-units --type=service --state=running   # nima ishlayapti
sudo systemctl disable --now cups                     # kerak bo'lmasa — o'chirish
```

Serverda printer xizmati, grafik muhit yoki "ehtimol keyin kerak bo'lar" deb o'rnatilgan dasturlar bo'lmasligi kerak. Savol har doim bitta: **bu xizmat nima uchun kerak va kim uchun?** Javob bo'lmasa — o'chiring.

## 6-qadam: web server va ilova

Qaydnoma — Flask ilovasi. Uni to'g'ridan-to'g'ri internetga ochmaymiz. Odatiy tuzilma:

```
 Internet
    │  443 (HTTPS)
    ▼
┌─────────┐   http://127.0.0.1:8000   ┌──────────┐   127.0.0.1:5432  ┌──────────┐
│  nginx  │ ────────────────────────▶ │ gunicorn │ ────────────────▶ │ postgres │
│ (TLS)   │                           │ Qaydnoma │                   │          │
└─────────┘                           └──────────┘                   └──────────┘
 0.0.0.0:443                           user: qaydnoma
```

**nginx** — [[reverse-proxy|reverse proxy]]: TLS'ni tugatadi, statik fayllarni beradi, so'rovni ichkaridagi ilovaga uzatadi. Ilova faqat `127.0.0.1` da tinglaydi — tashqaridan unga to'g'ridan-to'g'ri yetib bo'lmaydi.

Ilovani systemd xizmati sifatida ishga tushiramiz:

```ini
# /etc/systemd/system/qaydnoma.service
[Unit]
Description=Qaydnoma (gunicorn)
After=network.target

[Service]
User=qaydnoma
Group=qaydnoma
WorkingDirectory=/opt/qaydnoma
EnvironmentFile=/etc/qaydnoma/env
ExecStart=/opt/qaydnoma/venv/bin/gunicorn -w 3 -b 127.0.0.1:8000 app:app
Restart=on-failure
NoNewPrivileges=true
ProtectSystem=strict
ReadWritePaths=/var/lib/qaydnoma

[Install]
WantedBy=multi-user.target
```

Oxirgi uch qator — systemd'ning bepul himoyasi: jarayon imtiyozini oshira olmaydi, tizim fayllari unga faqat o'qish uchun ochiq, yozish faqat bitta papkaga. Sirlar (`SECRET_KEY`, baza paroli) kodda emas, `/etc/qaydnoma/env` faylida — ruxsati `600`, egasi `root` (a3 bosqichidagi sirlar darsi).

nginx sayt konfiguratsiyasi:

```nginx
# /etc/nginx/sites-available/qaydnoma
server {
    listen 80;
    server_name qaydnoma.example.com;
    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/qaydnoma /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

# Let's Encrypt'dan bepul TLS sertifikat; 80 → 443 yo'naltirishni ham qo'shadi
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d qaydnoma.example.com
```

Brauzer xavfsizlik modeli darsidagi (a1) sarlavhalarni ham shu yerda qo'shish mumkin: `Strict-Transport-Security`, `X-Content-Type-Options`. `server_tokens off;` — nginx versiyasini javoblarda ko'rsatmaslik (bu himoya emas, lekin skanerlarga bepul ma'lumot bermaslik).

## 7-qadam: disk va zaxira

```bash
df -h                       # disklar qanchalik to'lgan
sudo du -sh /var/log/*      # qaysi papka joy egallayapti
```

To'lib qolgan disk — xavfsizlik muammosi ham: jurnallar yozilmay qoladi, baza buziladi. Jurnallar uchun `logrotate` sozlangan bo'lishi kerak (Ubuntu'da sukut bo'yicha bor).

Zaxira uchun **3-2-1 qoidasi**:

| Raqam | Ma'nosi |
|---|---|
| 3 | Ma'lumotning 3 nusxasi (asl + 2 zaxira) |
| 2 | Kamida 2 xil saqlash muhitida |
| 1 | Bittasi boshqa joyda (boshqa server, boshqa region, oflayn) |

Qaydnoma uchun minimal reja: har kecha `pg_dump` bilan baza nusxasi, shifrlab, boshqa joyga. Ransomware zaxirani ham shifrlashga harakat qiladi — shuning uchun zaxira serverdan **yozib bo'lmaydigan** joyda bo'lishi kerak.

:::key
**Tiklashni sinab ko'rilmagan zaxira — zaxira emas.** Oyiga bir marta zaxiradan bazani alohida joyga tiklab, ilova ishlashini tekshiring. Ko'p kompaniyalar zaxira ishlamasligini aynan kerak bo'lgan kuni biladi.
:::

## 8-qadam: jurnallar

SOC tarmog'ida (b1) Linux jurnallarini tahlilchi sifatida o'qigansiz. Ma'mur sifatida ularni birinchi bo'lib siz ko'rasiz:

```bash
sudo journalctl -u ssh --since "1 hour ago"    # SSH xizmati
sudo journalctl -u qaydnoma -f                  # ilova jurnali, jonli
sudo tail -f /var/log/nginx/access.log          # kim saytga kirmoqda
sudo last -n 10                                 # oxirgi kirishlar
```

Bitta serverda jurnalni qo'lda o'qish mumkin. O'nta serverda — yo'q. Shuning uchun jurnallar markaziy joyga (SIEM, b2) yuboriladi — buni c2 bosqichida bulut monitoringida ko'ramiz.

## Tekshiruv ro'yxati: CIS Benchmark

Har bir qadamni o'zingiz o'ylab topishingiz shart emas. [[cis|CIS]] Benchmarks — Ubuntu, nginx, Docker va bulut akkauntlari uchun yuzlab tekshiriladigan sozlamalar ro'yxati. Bu darsda qilganlarimiz uning eng muhim qismi. To'liq audit uchun avtomatik vositalar bor (masalan, `lynis audit system`) — ular serverni ro'yxat bo'yicha tekshirib, hisobot beradi.

## Bu dars nimani qilmaydi

- Mustahkamlangan server **ilovadagi** zaiflikni yopmaydi. Qaydnoma'da SQL injection qolsa, firewall uni to'xtatmaydi — 443 port ochiq bo'lishi kerak. Ilova xavfsizligi — AppSec tarmog'i.
- fail2ban va port o'zgartirish — shovqinni kamaytiradi, xavfsizlik asosi emas. Asos — kalit bilan kirish va yangilanishlar.
- Bir martalik sozlash vaqt o'tib "suriladi" (configuration drift): kimdir tez yechim uchun portni ochadi va unutadi. Muntazam tekshiruv va IaC (c3) shuning uchun kerak.

:::lab server-auditi

:::try
O'z kompyuteringizda virtual mashina (VirtualBox, Ubuntu Server) yoki bepul darajadagi bulut serverida:

1. `sudo ss -tlnp` ni ishga tushiring. Har bir tinglayotgan port uchun yozing: qaysi xizmat, `0.0.0.0` yoki `127.0.0.1`, kerakmi?
2. Admin hisobi yarating, kalit bilan kirishni sozlang, so'ng `PermitRootLogin no` va `PasswordAuthentication no` ni yoqing. Ikkinchi terminalda tekshiring.
3. ufw bilan faqat 22, 80, 443 ni oching. Boshqa kompyuterdan `nc -zv <server-ip> 5432` bilan baza porti yopiqligini tekshiring (faqat o'z serveringizda!).
4. nginx o'rnatib, oddiy sahifa joylang. `curl -I http://<server-ip>` javobidagi `Server:` sarlavhasini `server_tokens off;` dan oldin va keyin solishtiring.

**Javoblar:**
1. Odatda: 22 (sshd) — `0.0.0.0`, kerak; 53 (`systemd-resolved`) — `127.0.0.53`, lokal, tegmang. Notanish xizmat chiqsa — `systemctl status` bilan nima ekanini aniqlang.
2. Agar ikkinchi terminalda `Permission denied (publickey)` chiqsa — ochiq kalit `~aziz/.ssh/authorized_keys` da emas yoki fayl ruxsatlari juda ochiq (`chmod 700 ~/.ssh`, `chmod 600 ~/.ssh/authorized_keys`).
3. `nc` "Connection refused" yoki javobsiz kutish (timeout) bersa — port tashqaridan yopiq. Timeout — firewall paketni jimgina tashladi (`drop`); refused — paket yetib bordi, lekin u portda hech kim tinglamayapti.
4. Oldin: `Server: nginx/1.24.0 (Ubuntu)` kabi; keyin: faqat `Server: nginx`.
:::

## Xulosa

- Internetdagi server birinchi daqiqadan avtomatik skanerlar nishoni. Himoya — birinchi soatda.
- Tartib: yangilash → alohida admin hisobi → SSH kalit va root taqiqi → firewall (sukut bo'yicha taqiq) → ortiqcha xizmatlarni o'chirish.
- Ilova alohida, imtiyozsiz hisobda, faqat `127.0.0.1` da; tashqariga nginx orqali, TLS bilan.
- Sirlar kodda emas, ruxsati cheklangan faylda.
- Zaxira: 3-2-1, va tiklash muntazam sinovdan o'tadi.
- fail2ban va port o'zgartirish — shovqinni kamaytiradi, himoya asosi emas.
- CIS Benchmark — tayyor tekshiruv ro'yxati; qo'lda sozlash vaqt o'tib suriladi, shuning uchun keyin hammasi kodga aylanadi.

:::quiz
? Yangi server internetga chiqqanidan o'n daqiqa o'tib `auth.log` da yuzlab muvaffaqiyatsiz kirish urinishlari bor. Bu nimani bildiradi?
- Serveringiz haqidagi ma'lumot sizib chiqqan
- Provayder serverni noto'g'ri sozlagan
+ Internetdagi avtomatik skanerlar har bir ommaviy IP'ni doimiy tekshiradi — bu odatiy holat
- Server allaqachon buzilgan
! Ommaviy IP manzillar doimiy avtomatik skanerlanadi. Muvaffaqiyatsiz urinishlar buzilish emas, lekin himoyani birinchi soatda qo'yish kerakligini ko'rsatadi.

? Nega ilova (Qaydnoma) `root` emas, alohida `qaydnoma` system hisobida ishlashi kerak?
- Shunda ilova tezroq ishlaydi
+ Ilovada zaiflik qolsa, hujumchi faqat shu hisob ruxsatlariga ega bo'ladi
- systemd root nomidan xizmat ishga tushira olmaydi
- Shunda SSL sertifikat olish osonlashadi
! Eng kam imtiyoz: ilova buzilsa ham zarar shu hisob ruxsatlari bilan cheklanadi.

? `PasswordAuthentication no` ni yoqishdan oldin eng muhim qadam qaysi?
- fail2ban'ni o'chirish
- SSH portini 2222 ga o'zgartirish
+ Kalit bilan kirish ishlashini tekshirish va joriy seansni yopmasdan ikkinchi terminalda sinash
- Serverni qayta yuklash
! Aks holda o'zingizni serverdan qulflab qo'yasiz; joriy seans ochiq tursa, xatoni tuzatish mumkin.

? Parol bilan kirish o'chirilgan serverda fail2ban asosan nima beradi?
- Kalit o'g'irlanishidan himoya
+ Jurnaldagi shovqinni kamaytiradi va skanerlarni vaqtincha to'sadi
- Ilovadagi zaifliklarni yopadi
- Root hisobni avtomatik o'chiradi
! Parol hujumi baribir muvaffaqiyatsiz; fail2ban shovqinni kamaytiradi, lekin o'g'irlangan kalitdan himoya qilmaydi.

? `ss -tlnp` natijasida `127.0.0.1:5432 postgres` ko'rindi. Bu nimani bildiradi?
+ Baza faqat serverning o'zidan ochiq, tashqaridan unga to'g'ridan-to'g'ri ulanib bo'lmaydi
- Baza butun internetga ochiq
- Baza ishlamayapti
- Firewall bazani bloklagan
! 127.0.0.1 — loopback manzil; bu yerda tinglayotgan xizmat faqat lokal ulanishlarni qabul qiladi.

? nftables qoidalaridagi `policy drop` nimani anglatadi?
- Barcha chiquvchi trafik taqiqlanadi
+ Aniq ruxsat berilmagan kiruvchi paketlar tashlanadi
- Faqat ICMP paketlar tashlanadi
- Firewall o'chirilgan
! Sukut bo'yicha taqiq — ruxsat berilmagan hamma narsa yopiq. Bu xavfsizlikdagi eng muhim sukut qoidasi.

? `ct state established,related accept` qatori firewall'ga nima beradi?
- Barcha portlarni ochadi
- Faqat UDP trafikni o'tkazadi
+ Ruxsat berilgan ulanishlarning javob paketlarini avtomatik o'tkazadi (stateful)
- Loglarni o'chiradi
! Stateful firewall ulanish holatini eslab qoladi, javob paketlari uchun alohida qoida shart emas.

? Nega Qaydnoma gunicorn orqali `127.0.0.1:8000` da tinglaydi, internetga esa nginx chiqadi?
- gunicorn 443 portda ishlay olmaydi
+ nginx TLS'ni tugatadi va so'rovni uzatadi; ilovaga tashqaridan to'g'ridan-to'g'ri yetib bo'lmaydi
- Flask faqat lokal ishlaydi
- Bu faqat tezlik uchun
! Reverse proxy tashqi dunyo bilan ilova o'rtasida turadi: TLS, sarlavhalar, statik fayllar — va ilova o'zi ochiq emas.

? 3-2-1 zaxira qoidasida "1" nimani bildiradi?
- Bitta zaxira yetarli
- Kuniga bir marta zaxira
+ Nusxalardan bittasi boshqa joyda (boshqa server, region yoki oflayn)
- Bitta parol bilan shifrlash
! Bir joydagi hodisa (yong'in, ransomware, akkaunt buzilishi) barcha nusxalarni yo'q qilmasligi uchun bittasi alohida joyda bo'ladi.

? Qaydnoma'da SQL injection bor. Serverdagi qaysi sozlama uni to'xtatadi?
- ufw firewall
- fail2ban
- SSH root taqiqi
+ Hech biri — bu ilova zaifligi, uni kodda tuzatish kerak
! Server mustahkamlash ilova zaifligini yopmaydi: 443 port ochiq bo'lishi shart. Zarar esa alohida hisob va cheklangan ruxsatlar tufayli kichrayadi.
:::

:::cards
Hujum yuzasi :: Tizimning tashqaridan hujum qilinishi mumkin bo'lgan barcha nuqtalari: ochiq portlar, xizmatlar, hisoblar
Hardening :: Keraksiz xizmat va ruxsatlarni olib tashlab, xavfsiz sozlamalarni qo'yish
unattended-upgrades :: Ubuntu'da xavfsizlik yangilanishlarini avtomatik o'rnatadigan paket
PermitRootLogin no :: root hisobiga SSH orqali to'g'ridan-to'g'ri kirishni taqiqlaydi
fail2ban :: Ko'p xato qilgan IP'ni vaqtincha bloklaydi; asosan shovqinni kamaytiradi
policy drop :: Firewall'da sukut bo'yicha taqiq — ruxsat berilmagan paket tashlanadi
Stateful firewall :: Ulanish holatini eslab, javob paketlarini avtomatik o'tkazadi
Reverse proxy :: Internet va ilova o'rtasidagi server (nginx): TLS, uzatish, sarlavhalar
NoNewPrivileges :: systemd sozlamasi — jarayon va uning bolalari imtiyozini oshira olmaydi
3-2-1 :: 3 nusxa, 2 xil muhit, 1 tasi boshqa joyda
Tiklash sinovi :: Zaxiradan haqiqatan tiklab ko'rish; sinalmagan zaxira — zaxira emas
CIS Benchmark :: Tizimlarni xavfsiz sozlash uchun tekshiriladigan sozlamalar ro'yxati
:::
