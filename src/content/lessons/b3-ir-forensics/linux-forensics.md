b1 bosqichidagi Linux loglari darsini eslang: SSH orqali parol terildi, `deploy` hisobiga kirildi, yangi `backup2` hisobi yaratildi va `sudo` guruhiga qo'shildi. O'shanda biz faqat **loglarni** o'qigan edik.

Endi siz IR jamoasidasiz va o'sha serverga kirdingiz. Savollar ko'proq: hujumchi yana nima qoldirdi? Qaysi fayllarni o'zgartirdi? Hali ham ichkaridami? Va eng muhimi — serverni tozalab, ishga qaytarish mumkinmi yoki uni noldan qurish kerakmi?

Bu darsda buzilgan Linux tizimni tizimli tekshirishni o'rganasiz. Linux bosqichidagi bilimlaringiz — fayl tizimi, ruxsatlar, jarayonlar, cron, systemd — bu yerda tergov qurollariga aylanadi.

## Avval — xavfsiz ishlash

Dalil yig'ish darsidagi qoidalar Linux'da ham amal qiladi:

| Qoida | Linux'da qanday |
|---|---|
| **Xotira birinchi** | LiME yoki AVML bilan, natija tashqi diskka |
| **Buzilgan tizim buyruqlariga to'liq ishonmang** | Hujumchi `ps`, `ls`, `netstat` ni o'zgartirgan bo'lishi mumkin — tashqi manbadan statik kompilyatsiya qilingan vositalar (masalan, busybox) ishlating |
| **Natijalarni tashqariga yozing** | Tashqi disk yoki tarmoq orqali (`... \| ssh analitik@10.10.10.50 'cat > natija.txt'`) |
| **Har bir buyruqni yozing** | `script` buyrug'i butun terminal sessiyasini faylga yozadi |
| **Qayta yuklamang** | Xotira yo'qoladi; `/tmp` va `/dev/shm` tozalanadi (Linux loglari darsidagi ogohlantirish) |

```bash
# Butun sessiyani faylga yozish — har bir buyruq va natija
script -a /mnt/usb/ir-sessiya-$(hostname)-$(date +%Y%m%d-%H%M).log
```

Tayyor vosita ham bor: **UAC** (Unix-like Artifacts Collector) — dalil yig'ish darsida tilga olingan; u quyidagi tekshiruvlarning ko'pini avtomatik bajaradi va natijalarni bitta arxivga yig'adi.

## 1. Hozir nima bo'lyapti: jonli holat

Avval eng o'zgaruvchan ma'lumotlar (o'zgaruvchanlik tartibi):

```bash
date; uptime                         # vaqt va qachondan beri ishlayapti
w                                    # hozir kim tizimda
ps auxf                              # jarayonlar daraxti
ss -tunap                            # tarmoq ulanishlari va tinglayotgan portlar, jarayon bilan
ip a; ip route; ip neigh             # tarmoq sozlamalari, ARP jadvali
lsof -nP -i                          # tarmoq ochgan fayllar/jarayonlar
```

Nimaga e'tibor berish kerak:

| Belgi | Nega shubhali |
|---|---|
| Notanish tashqi IP bilan `ESTAB` ulanish | C2 kanali (trafik tahlili darsi) |
| Notanish portda `LISTEN` | Hujumchi qoldirgan orqa eshik |
| `www-data` yoki `nobody` nomidan ishlayotgan qobiq (`sh`, `bash`) | Veb-ilova orqali buzilish belgisi |
| Nomi tizim jarayoniga o'xshash, lekin g'alati joyda | Niqoblanish (`[kworker]` kabi qavsli nomlar ham soxta bo'lishi mumkin) |
| Yuqori CPU ishlatayotgan notanish jarayon | Kriptomayner — dars boshidagi "server sekinlashdi" holati |

### Diski o'chirilgan jarayonlar

Hujumchi ko'pincha dasturini ishga tushirib, keyin faylini o'chiradi. Jarayon ishlashda davom etadi, lekin diskda fayl yo'q. Linux bunday holatni `/proc` da ko'rsatadi:

```bash
# Fayli o'chirilgan, lekin hali ishlayotgan jarayonlar
ls -l /proc/*/exe 2>/dev/null | grep deleted

# Shubhali jarayon haqida batafsil (PID = 2846 deb faraz qilamiz)
ls -l /proc/2846/exe            # qaysi fayldan ishga tushgan
cat /proc/2846/cmdline | tr '\0' ' '; echo   # buyruq satri
ls -l /proc/2846/cwd            # ishchi papkasi
cat /proc/2846/environ | tr '\0' '\n'        # muhit o'zgaruvchilari

# O'chirilgan faylni tiklash — u hali xotirada!
cp /proc/2846/exe /mnt/usb/dalil/2846.bin
sha256sum /mnt/usb/dalil/2846.bin
```

Oxirgi qadam juda qimmatli: fayl diskdan o'chirilgan bo'lsa ham, `/proc/<PID>/exe` orqali uning nusxasini olish mumkin — jarayon tirik ekan. Keyin xesh, YARA va statik tahlil (keyingi darslar).

## 2. Hisoblar va kirish

```bash
# UID 0 (root huquqi) bo'lgan barcha hisoblar — faqat root bo'lishi kerak
awk -F: '$3 == 0 {print $1}' /etc/passwd

# Kirish qobig'i bor hisoblar
grep -vE '(nologin|false)$' /etc/passwd

# Parol o'rnatilgan hisoblar va oxirgi o'zgarish
sudo awk -F: '$2 !~ /^[!*]/ {print $1}' /etc/shadow

# sudo huquqlari
sudo cat /etc/sudoers; sudo ls -la /etc/sudoers.d/
getent group sudo wheel

# SSH kalitlari — HAR BIR foydalanuvchida
sudo find / -name authorized_keys -type f 2>/dev/null -exec ls -la {} \; -exec cat {} \;

# Kirish tarixi
last -aF | head -30
sudo lastb -aF | head -30
lastlog
```

| Topilma | Ma'nosi |
|---|---|
| root'dan boshqa UID 0 hisob | Yashirin administrator — kuchli belgi |
| Tizim hisobi (`www-data`, `nobody`) uchun `/bin/bash` | Hujumchi xizmat hisobini kirish uchun moslagan |
| Yangi hisob, yaqinda yaratilgan uy papkasi | Linux loglari darsidagi `backup2` |
| `sudoers.d` da yangi fayl, `NOPASSWD` | Parolsiz root huquqi |
| `authorized_keys` da notanish kalit | Parolsiz qayta kirish yo'li — parol almashtirilsa ham ishlaydi |

## 3. Persistence — hamma joyni tekshiring

b1 bosqichida persistence haqida qisqacha gaplashgan edik. IR'da maqsad — **barcha** mexanizmlarni topish: bittasini o'tkazib yuborsangiz, hujumchi qaytadi (IR jarayoni darsi, yo'q qilish bosqichi).

| Joy | Tekshirish |
|---|---|
| **cron** | `/etc/crontab`, `/etc/cron.d/`, `/etc/cron.{hourly,daily,weekly,monthly}/`, `/var/spool/cron/` (har bir foydalanuvchi), `crontab -l -u <user>` |
| **systemd** | `/etc/systemd/system/`, `/usr/lib/systemd/system/`, `~/.config/systemd/user/`; `systemctl list-unit-files --state=enabled`; `systemctl list-timers --all` |
| **Qobiq ishga tushish fayllari** | `/etc/profile`, `/etc/profile.d/`, `/etc/bash.bashrc`, `~/.bashrc`, `~/.bash_profile`, `~/.profile` |
| **SSH** | `authorized_keys`, `/etc/ssh/sshd_config` (masalan, `PermitRootLogin`, qo'shimcha `AuthorizedKeysFile`) |
| **Eski ishga tushirish** | `/etc/rc.local`, `/etc/init.d/` |
| **Kutubxona yuklash** | `/etc/ld.so.preload` — odatda **bo'sh yoki mavjud emas**; unda yozuv bo'lsa — rootkit belgisi bo'lishi mumkin |
| **Yadro modullari** | `lsmod`; `/etc/modules`, `/etc/modules-load.d/` |
| **Veb-server** | Veb papkadagi yangi skript fayllar (web shell) |
| **at** vazifalari | `atq` |

```bash
# Oxirgi 7 kunda o'zgargan persistence fayllari — tez ko'rinish
sudo find /etc/cron* /var/spool/cron /etc/systemd /usr/lib/systemd /etc/profile.d \
     /etc/rc.local /etc/ld.so.preload /root /home -mtime -7 -type f -ls 2>/dev/null

# Yoqilgan xizmatlar va taymerlar
systemctl list-unit-files --state=enabled --no-pager
systemctl list-timers --all --no-pager

# Har bir foydalanuvchining crontab'i
for u in $(cut -d: -f1 /etc/passwd); do sudo crontab -l -u "$u" 2>/dev/null | sed "s/^/$u: /"; done
```

Har bir topilgan xizmat yoki cron vazifasi uchun so'rang: **bu nimani ishga tushiradi va bu fayl qayerda?** `/tmp`, `/dev/shm`, `/var/tmp` yoki yashirin papkalardagi (nomi nuqta bilan boshlanadigan) dasturlar — darhol e'tiborga loyiq.

## 4. Fayl tizimi: nima o'zgardi

```bash
# Insident davrida o'zgargan fayllar (masalan, 16-noyabrdan beri)
sudo find / -xdev -newermt "2026-11-16 02:00" ! -newermt "2026-11-16 06:00" -type f -ls 2>/dev/null

# Vaqtinchalik papkalardagi bajariladigan fayllar — odatda bo'lmasligi kerak
sudo find /tmp /var/tmp /dev/shm -type f -perm -u+x -ls 2>/dev/null

# Yashirin papka va fayllar g'alati joylarda
sudo find / -xdev -name ".*" -type d ! -path "/home/*" ! -path "/root/*" 2>/dev/null

# SUID fayllar ro'yxati — ma'lum ro'yxat bilan solishtirish uchun (audit)
sudo find / -xdev -perm -4000 -type f -ls 2>/dev/null
```

Linux bosqichidagi ruxsatlar darsida SUID haqida gaplashgansiz: SUID dastur egasining huquqi bilan ishlaydi. IR'da tekshiriladigan narsa — **ro'yxat o'zgarganmi**: tizimda odatda bo'lmagan yangi SUID fayl paydo bo'lganmi? Toza tizimning ro'yxati bilan solishtiring (tayyorgarlik bosqichida olingan "baseline").

### Paket fayllarini tekshirish

Hujumchi tizim dasturlarini (`ps`, `ls`, `sshd`) o'zgartirgan bo'lishi mumkin. Paket menejeri asl fayllar xeshlarini biladi:

```bash
# Debian/Ubuntu: o'rnatilgan paketlar fayllarini tekshirish
sudo apt install debsums
sudo debsums -c                 # faqat o'zgargan fayllarni ko'rsatadi

# RHEL/Fedora
sudo rpm -Va                    # 5 belgisi — xesh o'zgargan
```

`/usr/bin/ps` yoki `/usr/sbin/sshd` ning xeshi o'zgargan bo'lsa — bu juda jiddiy belgi: tizim dasturlari almashtirilgan. Bunday tizimda hech bir natijaga ishonib bo'lmaydi va uni **noldan qayta qurish** kerak.

(Eslatma: hujumchi paketlar bazasini ham o'zgartirishi mumkin, shuning uchun eng ishonchli tekshiruv — tashqi, toza manbadagi xeshlar bilan solishtirish.)

## 5. Loglar va tarix

Linux loglari darsidagi barcha bilim bu yerda ishlaydi — endi tergov nuqtai nazaridan:

| Manba | Nima qidiriladi |
|---|---|
| `auth.log` / `secure` (+ aylantirilganlari, `zgrep`) | SSH kirishlari, `sudo`, `useradd`, `usermod` |
| `journalctl` | Xizmatlar ishga tushishi, xatolar, `--since`/`--until` bilan insident oralig'i |
| `/var/log/audit/audit.log` | auditd yozuvlari — `ausearch -i`, **auid** asl foydalanuvchini ko'rsatadi |
| Veb-server loglari | Qaysi URL'ga so'rovlar — web shell'ga murojaatlar |
| `~/.bash_history` (har bir foydalanuvchi, root ham) | Buyruqlar — agar o'chirilmagan bo'lsa |
| `/var/log/wtmp`, `btmp`, `lastlog` | Kirish tarixi |

Bo'sh yoki g'alati qisqa `.bash_history`, yoki `HISTFILE=/dev/null` kabi sozlamalar `.bashrc` da — o'zi belgi: kimdir izlarini yashirishga harakat qilgan. Xotira tahlili darsidagi `linux.bash` plagini bunday holatda yordam beradi.

### Veb-server orqali buzilish

Ko'p Linux serverlar veb-ilova orqali buziladi. Belgilar:

```bash
# Veb papkada yaqinda o'zgargan skript fayllar
sudo find /var/www -type f \( -name "*.php" -o -name "*.jsp" -o -name "*.aspx" \) -mtime -14 -ls

# Veb-server loglarida eng ko'p murojaat qilingan noyob fayllar (rare — b2 bosqichi)
sudo awk '{print $7}' /var/log/nginx/access.log | sort | uniq -c | sort -n | head -20

# www-data foydalanuvchisi nomidan ishlayotgan jarayonlar
ps -u www-data -f
```

Yangi, g'alati nomli PHP fayl, unga faqat bitta IP'dan POST so'rovlar va `www-data` nomidan ishlayotgan `sh` — klassik web shell manzarasi (IR jarayoni darsidagi tasniflash mashqi).

:::key
**Linux IR'ning asosiy savoli: "bu tizimga hali ham ishonsa bo'ladimi?"** Hujumchi root huquqini olgan bo'lsa — javob deyarli har doim **yo'q**. Root huquqli hujumchi har qanday faylni, logni va hatto tizim dasturlarini o'zgartira oladi; siz topgan har bir persistence mexanizmi uchun yana bittasi topilmagan qolishi mumkin. Bunday holatda to'g'ri yo'l: dalillarni yig'ish, tahlil qilish (kirish yo'lini aniqlash uchun!), keyin serverni **toza manbadan qayta qurish**, ma'lumotlarni tekshirilgan zaxiradan tiklash va kirish yo'lini yopish.
:::

## Tekshiruv ro'yxati

Insident paytida unutmaslik uchun — qisqa ro'yxat:

```
□ Sessiyani yozish (script), vaqt va mintaqa (timedatectl)
□ Xotira nusxasi (LiME/AVML) → tashqi disk, xesh
□ Jarayonlar (ps auxf), ulanishlar (ss -tunap), o'chirilgan exe'lar (/proc/*/exe)
□ Shubhali jarayonlar fayllari /proc/<PID>/exe orqali nusxalandi
□ Hisoblar: UID 0, qobiqli hisoblar, sudoers, authorized_keys (hammasida)
□ Persistence: cron (hammasi), systemd (unit + timer), profile/bashrc, rc.local,
  ld.so.preload, modullar, at, veb papka
□ Fayl tizimi: insident oralig'ida o'zgargan fayllar, /tmp /dev/shm, yangi SUID
□ Paketlar yaxlitligi (debsums / rpm -Va)
□ Loglar: auth/secure, journal, audit, veb-server, bash_history (hammada)
□ Disk tasviri (kerak bo'lsa) yoki triage arxivi (UAC)
```

## Linux forensikasi nimani qilmaydi

- **Root huquqli hujumchi izlarini to'liq ko'rsatmaydi** — loglar, tarix va hatto tizim dasturlari o'zgartirilgan bo'lishi mumkin.
- **Ishonchli natija buzilgan vositalardan chiqmaydi** — tashqi, toza vositalar va xotira tahlili kerak.
- **Bitta tekshiruv ro'yxati hamma narsani qamramaydi** — hujumchilar yangi persistence usullarini topadi; ro'yxat — boshlanish nuqtasi.
- **Konteynerlar va bulut** o'ziga xos — vaqtinchalik konteynerlar izsiz yo'qoladi; ular uchun markaziy loglar muhim (Cloud tarmog'i).

:::try
Barcha mashqlar **o'z laboratoriya VM'ingizda**.

**1. Jonli holat.** Linux VM'da `script` bilan sessiyani yozishni boshlang va 1-bo'limdagi buyruqlarni bajaring. Qaysi portlar tinglanmoqda? Ularning har biri qaysi xizmatga tegishli?

**2. Persistence izlari yarating va toping.** Laboratoriyada "hujumchi" sifatida (zararsiz buyruqlar bilan) uchta iz qoldiring:

```bash
echo '*/5 * * * * root /usr/bin/true # test-iz' | sudo tee /etc/cron.d/test-iz
sudo useradd -m -s /bin/bash testiz
echo 'echo "salom" > /dev/null  # test-iz' >> ~/.bashrc
```

Endi 3-bo'limdagi buyruqlar bilan uchalasini toping. Qaysi buyruq qaysini topdi? Oxirida hammasini o'chiring: `sudo rm /etc/cron.d/test-iz; sudo userdel -r testiz` va `.bashrc` dagi qatorni olib tashlang.

**3. O'chirilgan jarayon.** VM'da: `cp /usr/bin/sleep /tmp/sir && /tmp/sir 600 &` keyin `rm /tmp/sir`. Endi `ls -l /proc/*/exe 2>/dev/null | grep deleted` bilan uni toping va `/proc/<PID>/exe` dan nusxa olib, xeshini asl `/usr/bin/sleep` bilan solishtiring.

**4. Paketlar.** Ubuntu VM'da `sudo debsums -c` ni ishga tushiring. Natija bo'sh bo'lishi kerak — nega?

**5. TryHackMe** — "Linux Forensics" xonasini bajaring.

*Javoblar: 2 — cron izini `find /etc/cron* -mtime -7` yoki `/etc/cron.d/` ni ko'rish topadi; hisobni `/etc/passwd` dagi qobiqli hisoblar ro'yxati; `.bashrc` ni `-mtime -7` qidiruvi. 3 — xeshlar bir xil: `/proc/<PID>/exe` asl faylning nusxasini beradi. 4 — toza tizimda paket fayllari o'zgartirilmagan; natija chiqsa — qaysi fayl va nega o'zgarganini tekshirish kerak (ba'zan qonuniy sozlama fayllari).*
:::

## Xulosa

- Xavfsiz ishlash: **xotira birinchi**, tashqi va toza vositalar, natijalar tashqariga, `script` bilan yozish, **qayta yuklamaslik**.
- Jonli holat: `w`, `ps auxf`, `ss -tunap`, `lsof -i`; **`/proc/*/exe` dagi `deleted`** — fayli o'chirilgan jarayon; `/proc/<PID>/exe` dan nusxa olish mumkin.
- Hisoblar: **UID 0**, qobiqli tizim hisoblari, **sudoers.d**, barcha **authorized_keys**, `last`/`lastb`.
- Persistence: **cron (hammasi), systemd unit va timer, profile/bashrc, rc.local, ld.so.preload, modullar, at, veb papka**.
- Fayl tizimi: insident oralig'idagi o'zgarishlar (`find -newermt`), `/tmp` va `/dev/shm` dagi bajariladiganlar, yangi SUID.
- **debsums / rpm -Va** — tizim dasturlari almashtirilganmi.
- Loglar va tarix — b1 bosqichidagi bilim; bo'sh tarix ham belgi.
- Root huquqli buzilishdan keyin — **qayta qurish**, tozalash emas.

:::quiz
? Buzilgan Linux serverda nega tizimning o'z ps va netstat buyruqlariga to'liq ishonib bo'lmaydi?
- Ular juda sekin
+ Hujumchi ularni o'zgartirib, o'z jarayon va ulanishlarini yashirgan bo'lishi mumkin
- Ular faqat root uchun ishlaydi
- Ular xotirani o'chiradi
! Tashqi manbadan statik vositalar va xotira tahlili ishonchliroq natija beradi.

? ls -l /proc/*/exe | grep deleted buyrug'i nimani topadi?
+ Fayli diskdan o'chirilgan, lekin hali ishlayotgan jarayonlarni
- O'chirilgan foydalanuvchilarni
- Bo'sh papkalarni
- Tugagan jarayonlarni
! Hujumchilar ko'pincha dasturini ishga tushirib, faylini o'chiradi.

? Fayli o'chirilgan jarayonning dasturini qanday saqlab qolish mumkin?
- Hech qanday yo'l yo'q
+ Jarayon tirik ekan, /proc/<PID>/exe dan nusxa olib
- Serverni qayta yuklab
- Savatdan tiklab
! /proc/<PID>/exe hali xotirada bo'lgan fayl mazmuniga murojaat qiladi.

? /etc/passwd da root'dan tashqari UID 0 bo'lgan hisob topildi. Bu nimani anglatadi?
- Bu oddiy holat
+ Bu yashirin administrator hisobi bo'lishi mumkin — kuchli shubhali belgi
- Bu tizim xatosi
- Bu xizmat hisobi
! UID 0 — root huquqi; odatda faqat root hisobida bo'ladi.

? Nega authorized_keys fayllarini barcha foydalanuvchilarda tekshirish kerak?
- Ular parollarni saqlaydi
+ Begona kalit parolsiz qayta kirish imkonini beradi — parol almashtirilsa ham ishlaydi
- Ular tarmoqni boshqaradi
- Ular faqat root uchun mavjud
! Persistence'ning eng oddiy va eng ko'p uchraydigan usullaridan biri.

? /etc/ld.so.preload faylida yozuv topildi. Nega bu e'tiborga loyiq?
+ Odatda u bo'sh yoki mavjud emas; undagi kutubxona barcha dasturlarga yuklanadi — rootkit belgisi bo'lishi mumkin
- Bu oddiy cron sozlamasi
- Bu SSH kaliti
- Bu jurnal fayli
! Bu mexanizm orqali yuklangan kutubxona tizim buyruqlari natijalarini o'zgartirishi mumkin.

? debsums -c yoki rpm -Va nima uchun ishlatiladi?
- Paketlarni yangilash uchun
+ O'rnatilgan paket fayllari o'zgartirilganmi — xeshlar bo'yicha tekshirish uchun
- Foydalanuvchilarni ro'yxatlash uchun
- Loglarni o'chirish uchun
! O'zgartirilgan /usr/bin/ps yoki sshd — tizim dasturlari almashtirilganining belgisi.

? Qaysi joylar Linux persistence tekshiruvida birinchi navbatda ko'riladi?
+ cron va systemd unit/timer fayllari
+ ~/.bashrc, /etc/profile.d va authorized_keys
- /usr/share/doc dagi hujjatlar
- /usr/share/fonts dagi shriftlar
! Avtomatik ishga tushish va qayta kirish yo'llari — persistence'ning asosiy joylari.

? Veb-serverda www-data foydalanuvchisi nomidan sh jarayoni ishlayapti va veb papkada yangi PHP fayl bor. Bu nimaning belgisi?
- Oddiy veb-sayt yangilanishi
+ Web shell orqali buzilish
- Disk to'lishi
- Zaxira nusxa jarayoni
! Veb-ilova buzilganda hujumchi buyruqlarni veb-server hisobi nomidan bajaradi.

? Hujumchi root huquqini olgan Linux serverga nisbatan eng to'g'ri qaror qaysi?
- Topilgan zararli fayllarni o'chirib, ishni davom ettirish
+ Dalillarni yig'ib tahlil qilish, keyin serverni toza manbadan qayta qurish va kirish yo'lini yopish
- Faqat parolni almashtirish
- Serverni qayta yuklash
! Root huquqli hujumchi har qanday narsani o'zgartira oladi — tizimga endi ishonib bo'lmaydi.
:::

:::cards
Linux IR'da xavfsiz ishlash qoidalari? :: Xotira birinchi, tashqi toza vositalar, natijalar tashqariga, script bilan yozish, qayta yuklamaslik.
Jonli holat buyruqlari? :: w, ps auxf, ss -tunap, lsof -nP -i, ip a, ip route, ip neigh.
Fayli o'chirilgan jarayonni qanday topish? :: ls -l /proc/*/exe 2>/dev/null | grep deleted; nusxa — /proc/<PID>/exe dan.
Hisoblar tekshiruvi? :: UID 0 hisoblar, qobiqli tizim hisoblari, sudoers va sudoers.d (NOPASSWD), barcha authorized_keys, last/lastb.
Linux persistence joylari? :: cron (barcha joylar), systemd unit va timer, profile/bashrc, rc.local, ld.so.preload, yadro modullari, at, veb papka.
ld.so.preload? :: Odatda bo'sh yoki yo'q; undagi kutubxona barcha dasturlarga yuklanadi — rootkit belgisi bo'lishi mumkin.
Insident oralig'idagi fayllar? :: find / -xdev -newermt "boshlanish" ! -newermt "tugash" -type f -ls
Vaqtinchalik papkalar tekshiruvi? :: /tmp, /var/tmp, /dev/shm dagi bajariladigan fayllar — odatda bo'lmasligi kerak.
Paketlar yaxlitligi? :: debsums -c (Debian/Ubuntu), rpm -Va (RHEL) — o'zgartirilgan tizim fayllari.
Web shell belgilari? :: Veb papkada yangi skript, unga bitta IP'dan POST, www-data nomidan sh/bash jarayoni.
UAC nima? :: Unix-like Artifacts Collector — Linux va Unix tizimlaridan artefaktlarni avtomatik yig'ish vositasi.
Root huquqli buzilishdan keyin? :: Dalil yig'ish va tahlil, keyin toza manbadan qayta qurish va kirish yo'lini yopish.
:::
