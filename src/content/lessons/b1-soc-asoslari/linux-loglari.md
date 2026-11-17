Kompaniyaning veb-sayti Linux serverda ishlaydi. Bir kuni ertalab server sekinlashdi, protsessor 100% band. Administrator `top` ni ochadi va tanimagan jarayonni ko'radi. U qayerdan keldi? Qachon? Kim ishga tushirdi?

Javoblar serverning o'zida — `/var/log` papkasida. Dunyodagi serverlarning katta qismi Linux'da ishlaydi, shuning uchun SOC analitigi Windows jurnallari kabi Linux loglarini ham erkin o'qiy olishi kerak.

Yaxshi xabar: siz buning yarmini allaqachon bilasiz. Linux bosqichida `grep`, `cut`, `sort`, `uniq` bilan ishlagansiz. Bu darsda shu bilimni haqiqiy tergovga aylantiramiz.

## /var/log — Linux'ning xotirasi

Windows'dan farqli o'laroq, Linux loglarining ko'pi **oddiy matn fayllari**. Ularni `cat`, `less`, `grep` bilan to'g'ridan-to'g'ri o'qish mumkin.

| Fayl | Nima yoziladi | Eslatma |
|---|---|---|
| `/var/log/auth.log` | Kirishlar, SSH, `sudo`, foydalanuvchi o'zgarishlari | Debian, Ubuntu |
| `/var/log/secure` | Xuddi shu | RHEL, CentOS, Fedora, Rocky |
| `/var/log/syslog` | Umumiy tizim xabarlari | Debian, Ubuntu |
| `/var/log/messages` | Umumiy tizim xabarlari | RHEL oilasi |
| `/var/log/kern.log` | Yadro xabarlari | Drayverlar, apparat |
| `/var/log/apache2/`, `/var/log/nginx/` | Veb-server so'rovlari va xatolari | `access.log`, `error.log` |
| `/var/log/audit/audit.log` | auditd yozuvlari | Pastda batafsil |
| `/var/log/wtmp` | Kirish va chiqishlar tarixi | Binar — `last` bilan o'qiladi |
| `/var/log/btmp` | Muvaffaqiyatsiz kirishlar | Binar — `sudo lastb` bilan |
| `/var/log/lastlog` | Har bir foydalanuvchining oxirgi kirishi | `lastlog` bilan |

Distributivga qarab fayl nomlari farq qiladi — `auth.log` yoki `secure`. Notanish serverga birinchi kirganingizda `ls -la /var/log/` dan boshlang.

### Log yozuvining tuzilishi

Klassik syslog qatori:

```
Nov 16 02:14:07 web01 sshd[2211]: Failed password for root from 203.0.113.45 port 51234 ssh2
└─── vaqt ────┘ └host┘ └dastur┘└PID┘ └──────────────── xabar ─────────────────────┘
```

Diqqat qiling: klassik formatda **yil yo'q** va **vaqt mintaqasi ko'rsatilmagan**. Triage darsidagi ogohlantirishni eslang — turli manbalarni solishtirishdan oldin server qaysi mintaqada ishlashini tekshiring (`timedatectl`).

### Log aylanishi (rotation)

Loglar cheksiz o'smaydi. `logrotate` xizmati ularni muntazam "aylantiradi":

```
auth.log        ← hozirgi
auth.log.1      ← o'tgan hafta
auth.log.2.gz   ← undan oldingi, siqilgan
auth.log.3.gz
```

Tergovda faqat `auth.log` ga qarab qolmang — hujum o'tgan hafta boshlangan bo'lishi mumkin. Siqilgan fayllar uchun `zgrep`, `zcat` bor:

```bash
# Barcha auth loglarida, siqilganlari bilan birga, qidirish
zgrep "Failed password" /var/log/auth.log*
```

## journald — zamonaviy jurnal

Zamonaviy distributivlarda loglarni [[systemd|systemd]]ning **journald** xizmati ham yig'adi. U binar formatda saqlaydi va `journalctl` buyrug'i bilan o'qiladi.

```bash
journalctl -u ssh                     # faqat SSH xizmati (RHEL'da: -u sshd)
journalctl --since "1 hour ago"       # oxirgi bir soat
journalctl --since "2026-11-16 02:00" --until "2026-11-16 03:00"
journalctl -p err                     # faqat xatolar va undan jiddiyroq
journalctl _COMM=sudo                 # faqat sudo yozuvlari
journalctl -f                         # yangi yozuvlarni jonli kuzatish (tail -f kabi)
journalctl -o json-pretty -n 1        # oxirgi yozuv barcha maydonlari bilan
```

`journalctl` ning afzalligi — strukturalangan maydonlar va yil bilan to'liq vaqt. Ba'zi yangi distributivlar (masalan, Debian 12) standart holatda `auth.log` ni umuman yaratmaydi — faqat journald'ga yozadi. Shuning uchun ikkalasini ham bilish kerak.

:::info
journald jurnali standart holatda faqat xotirada saqlanib, qayta yuklanganda yo'qolishi mumkin (agar `/var/log/journal/` papkasi bo'lmasa). Serverni "tozalash uchun" qayta yuklash — dalillarni yo'qotishning eng tez yo'li. IR bosqichida bu haqda batafsil gaplashamiz; hozircha qoida: **shubhali serverni tekshirmasdan qayta yuklamang.**
:::

## SSH hujumi izlari

Internetga ochiq SSH portiga ega har bir server kuniga minglab parol terish urinishlarini oladi. Bu — fon shovqini. Analitikning vazifasi — shovqindan **haqiqiy xavfni** ajratish: urinishlar **muvaffaqiyatli** bo'lganmi?

`auth.log` dagi asosiy SSH qatorlari:

| Qator | Ma'nosi |
|---|---|
| `Failed password for root from 203.0.113.45` | Mavjud hisobga noto'g'ri parol |
| `Failed password for invalid user admin from …` | Mavjud bo'lmagan hisobga urinish |
| `Invalid user test from 203.0.113.45` | Bunday foydalanuvchi yo'q |
| `Accepted password for deploy from …` | **Parol bilan muvaffaqiyatli kirish** |
| `Accepted publickey for deploy from …` | Kalit bilan muvaffaqiyatli kirish |
| `session opened for user deploy` | Seans boshlandi |
| `Disconnected from …` / `Connection closed by …` | Ulanish uzildi |

Windows'dagi 4625 → 4624 juftligini eslaysizmi? Bu yerda ham xuddi shunday: **ko'p `Failed`, keyin `Accepted` — xuddi shu IP'dan.**

### Tergov — qadam-baqadam

```bash
# 1. Qancha muvaffaqiyatsiz urinish bor?
grep -c "Failed password" /var/log/auth.log

# 2. Qaysi IP'lardan? Eng faollari tepada
grep "Failed password" /var/log/auth.log \
  | grep -oE "from [0-9.]+" | cut -d' ' -f2 \
  | sort | uniq -c | sort -nr | head

# 3. Qaysi hisoblar nishonda?
grep "Failed password" /var/log/auth.log \
  | grep -oE "for (invalid user )?[^ ]+" | awk '{print $NF}' \
  | sort | uniq -c | sort -nr | head

# 4. ENG MUHIM SAVOL: muvaffaqiyatli kirishlar qaysi IP'lardan?
grep "Accepted" /var/log/auth.log

# 5. Hujumchi IP'sidan muvaffaqiyatli kirish bormi?
grep "203.0.113.45" /var/log/auth.log | grep "Accepted"
```

5-buyruq bo'sh natija bersa — hujum muvaffaqiyatsiz bo'lgan, bu oddiy fon shovqini (lekin baribir IP'ni bloklash va parol bilan kirishni o'chirish tavsiya qilinadi). Natija **bo'sh bo'lmasa** — bu insident. Kirgandan keyin nima qilingan?

```bash
# Shu hisob kirgandan keyingi sudo buyruqlari
grep "sudo:" /var/log/auth.log | grep "deploy"

# Yangi foydalanuvchilar yaratilganmi?
grep -E "useradd|usermod|groupadd" /var/log/auth.log

# Kirish tarixi
last -a | head -20          # muvaffaqiyatli kirishlar, manba manzil bilan
sudo lastb -a | head -20    # muvaffaqiyatsizlar
lastlog                     # har bir hisobning oxirgi kirishi
```

Insident vaqtida `auth.log` dagi hikoya taxminan shunday ko'rinadi:

```
02:14:07 sshd: Failed password for root from 203.0.113.45 port 51234 ssh2
   ... (yana 1 800 ta xuddi shunday qator) ...
02:19:52 sshd: Accepted password for deploy from 203.0.113.45 port 53311 ssh2
02:19:52 sshd: pam_unix(sshd:session): session opened for user deploy
02:20:11 sudo:   deploy : TTY=pts/0 ; PWD=/home/deploy ; USER=root ; COMMAND=/usr/bin/cat /etc/shadow
02:21:40 useradd: new user: name=backup2, UID=1002, GID=1002, home=/home/backup2, shell=/bin/bash
02:21:55 usermod: add 'backup2' to group 'sudo'
```

O'qing: parol terildi → `deploy` hisobiga kirildi → root sifatida parol xeshlari fayli o'qildi → yangi hisob yaratildi va `sudo` guruhiga qo'shildi. Windows darsidagi zanjirning aynan Linux versiyasi: `4625 → 4624 → 4672 → 4720 → 4732`.

`sudo` qatorining tuzilishiga e'tibor bering: **kim** (`deploy`), **qayerdan** (`TTY`, `PWD`), **kim sifatida** (`USER=root`) va **nima** (`COMMAND`). Bu Linux'dagi eng qimmatli audit qatorlaridan biri.

:::lab grep-va-pipe

:::key
SSH loglarida asosiy savol "hujum bo'ldimi?" emas — internetdagi har bir server doimiy hujum ostida. Asosiy savol: **"hujum muvaffaqiyatli bo'ldimi va undan keyin nima bo'ldi?"** Ming qator `Failed` dan ko'ra bitta `Accepted` muhimroq. Va eng yaxshi himoya loglarda emas: SSH'da parol bilan kirishni o'chirib, faqat kalitga o'tish (`PasswordAuthentication no`) bu turdagi hujumni butunlay befoyda qiladi — Linux bosqichidagi SSH kalitlari darsini eslang.
:::

## Boshqa muhim manbalar

| Nima qidiriladi | Qayerda | Buyruq |
|---|---|---|
| Rejalashtirilgan vazifalar | `/etc/crontab`, `/etc/cron.d/`, `/var/spool/cron/` | `crontab -l -u user`, `grep CRON /var/log/syslog` |
| Yangi xizmatlar | `/etc/systemd/system/` | `systemctl list-unit-files --state=enabled` |
| Bash tarixi | `~/.bash_history` | Ishonchsiz: o'chirilishi va o'chirib qo'yilishi oson |
| SSH kalitlari | `~/.ssh/authorized_keys` | Yangi qo'shilgan kalit — kirish eshigi |
| Veb-server so'rovlari | `/var/log/nginx/access.log` | `awk '{print $1}' access.log \| sort \| uniq -c \| sort -nr` |

Windows'dagi 7045 (yangi xizmat) va 4698 (vazifa) ning Linux'dagi ekvivalentlari — **cron** va **systemd** unitlari. Persistence izlarini qidirganda birinchi bo'lib shularni tekshiring. `authorized_keys` ga qo'shilgan begona kalit esa — parolsiz qayta kirish yo'li: parol almashtirilsa ham ishlayveradi.

:::warn
**Root huquqiga ega hujumchi matnli loglarni tahrirlashi mumkin.** `auth.log` — oddiy fayl: undan bitta qatorni o'chirish qiyin emas. Shuning uchun loglarda "hech narsa yo'q" degani — "hech narsa bo'lmagan" degani emas. Himoya — loglarni **real vaqtda boshqa serverga** yuborish (rsyslog orqali yoki SIEM agenti bilan). Hujumchi lokal faylni tozalasa ham, markaziy nusxa qoladi. Windows darsidagi qoida bu yerda ham ishlaydi.
:::

## auditd — Linux'ning chuqur auditi

`auth.log` kirishlar va `sudo` haqida ko'p narsa aytadi, lekin "kim `/etc/passwd` faylini o'zgartirdi?" yoki "qaysi foydalanuvchi qaysi dasturni ishga tushirdi?" degan savollarga javob bermaydi. Buning uchun **auditd** bor — Linux yadrosining audit tizimi. U Windows'dagi Sysmon va kengaytirilgan audit siyosatining o'rnini egallaydi.

auditd yadro darajasida ishlaydi: tizim chaqiruvlarini (syscall) va fayllarga murojaatlarni kuzatadi va `/var/log/audit/audit.log` ga yozadi.

```bash
sudo apt install auditd          # Debian/Ubuntu (RHEL'da odatda o'rnatilgan)
sudo systemctl enable --now auditd
sudo auditctl -l                 # joriy qoidalar ro'yxati
```

### Qoidalar yozish

Ikki asosiy turdagi qoida bor.

**1. Faylni kuzatish (`-w`)** — eng oddiy va eng foydali:

```bash
# /etc/passwd ga yozish yoki atributlarini o'zgartirishni kuzatish
sudo auditctl -w /etc/passwd -p wa -k identity
sudo auditctl -w /etc/shadow -p wa -k identity
sudo auditctl -w /etc/sudoers -p wa -k sudoers
sudo auditctl -w /etc/ssh/sshd_config -p wa -k sshd
```

| Qism | Ma'nosi |
|---|---|
| `-w /etc/passwd` | Qaysi fayl yoki papka |
| `-p wa` | Qanday murojaat: `r` — o'qish, `w` — yozish, `x` — ishga tushirish, `a` — atribut o'zgarishi |
| `-k identity` | Kalit so'z — keyinchalik qidirish uchun yorliq |

**2. Tizim chaqiruvini kuzatish (`-a`)** — kuchliroq, lekin shovqinliroq:

```bash
# Haqiqiy foydalanuvchilar (auid>=1000) root huquqi bilan ishga tushirgan dasturlar
sudo auditctl -a always,exit -F arch=b64 -S execve -F euid=0 -F auid>=1000 -F auid!=4294967295 -k root_cmd
```

Bu qoidadagi **auid** (audit user ID) — auditd'ning eng aqlli g'oyasi. Foydalanuvchi tizimga kirganda unga auid beriladi va u **`sudo` yoki `su` dan keyin ham o'zgarmaydi**. Ya'ni `deploy` hisobi `sudo` orqali root bo'lsa, buyruq root nomidan bajariladi (`uid=0`), lekin auditd **asl kim ekanini** eslab qoladi (`auid=1001`). `4294967295` — "auid berilmagan" degani (tizim xizmatlari).

`auditctl` bilan qo'shilgan qoidalar qayta yuklanganda yo'qoladi. Doimiy qoidalar `/etc/audit/rules.d/` papkasidagi fayllarga yoziladi:

```bash
# /etc/audit/rules.d/soc.rules faylining mazmuni
-w /etc/passwd -p wa -k identity
-w /etc/shadow -p wa -k identity
-w /etc/sudoers -p wa -k sudoers
-w /etc/sudoers.d/ -p wa -k sudoers

# Qoidalarni yuklash
sudo augenrules --load
```

Noldan yozish shart emas — Sysmon'dagidek, tayyor to'plamlar bor (masalan, Florian Roth'ning `auditd` qoidalari GitHub'da). Va xuddi Sysmon'dagidek: hammasini yozish — SIEM'ni shovqinga ko'mish.

### Natijalarni qidirish

`audit.log` ni to'g'ridan-to'g'ri o'qish qiyin. Buning uchun maxsus vositalar bor:

```bash
# Kalit so'z bo'yicha qidirish, odam o'qiy oladigan formatda (-i)
sudo ausearch -k identity -i

# Bugungi hodisalar
sudo ausearch -k sudoers --start today -i

# Hisobotlar
sudo aureport --summary          # umumiy ko'rinish
sudo aureport --auth             # autentifikatsiya urinishlari
sudo aureport --login            # kirishlar
sudo aureport -x --summary       # eng ko'p ishga tushgan dasturlar
```

Xom yozuv taxminan shunday ko'rinadi (qisqartirilgan):

```
type=SYSCALL msg=audit(1794795611.204:845): arch=c000003e syscall=257 success=yes
  auid=1001 uid=0 euid=0 tty=pts0 comm="vim" exe="/usr/bin/vim" key="identity"
type=PATH msg=audit(1794795611.204:845): name="/etc/passwd" ...
```

O'qing: `auid=1001` (asl foydalanuvchi — `deploy`) root sifatida (`uid=0`) `vim` orqali `/etc/passwd` ni ochdi, qoida kaliti — `identity`. `msg=audit(...)` ichidagi birinchi raqam — Unix vaqti (1970-yildan beri soniyalar); `ausearch -i` uni oddiy sanaga aylantiradi. Bir xil raqamli (`:845`) qatorlar bitta hodisaga tegishli.

## Linux loglari nimani ko'rsatmaydi

- **Standart holatda buyruqlar tarixi yo'q** — faqat `sudo` bilan bajarilganlari. Oddiy foydalanuvchi buyruqlari uchun auditd kerak.
- **`.bash_history` ga ishonib bo'lmaydi** — u seans tugaganda yoziladi, o'chirilishi va o'chirib qo'yilishi mumkin.
- **Tarmoq ulanishlari** standart holatda yozilmaydi — ular uchun tarmoq loglari kerak (keyingi dars).
- **Root huquqiga ega hujumchi** lokal loglarni o'zgartira oladi — markaziy yig'ish shart.
- **auditd faqat qoidada yozilganini ko'radi** — qoida yo'q bo'lsa, yozuv ham yo'q.

:::try
**1. Simulyatorda.** Yuqoridagi "Log tahlili: grep va pipe" laboratoriyasini bajaring, keyin "Tungi mehmon" CTF topshirig'ini yeching.

**2. O'z Linux VM'ingizda** (Linux bosqichidagi laboratoriya):
- `ls -la /var/log/` — qaysi fayllar bor? Sizda `auth.log` bormi yoki `secure`? Yoki faqat journald?
- O'zingizga SSH orqali ulaning: bir marta noto'g'ri parol bilan, keyin to'g'risi bilan. Ikkala qatorni `auth.log` dan yoki `journalctl -u ssh` dan toping.
- `sudo cat /etc/shadow` ni bajaring va shu `sudo` qatorini logdan toping.

**3. auditd.** O'rnating, `/etc/passwd` uchun `-w ... -p wa -k identity` qoidasini qo'shing. Keyin `sudo useradd testuser` bajaring (laboratoriya VM'ida!). `sudo ausearch -k identity -i` — yozuvni topdingizmi? `auid` va `uid` qiymatlari qanday? Oxirida `sudo userdel testuser`.

**4. TryHackMe** — Linux loglari bo'yicha xonalarni bajaring.

*Javoblar: 2 — Ubuntu'da odatda `auth.log` bor, Debian 12 da faqat journald bo'lishi mumkin; `Failed password for <siz>` va `Accepted password for <siz>` qatorlari; `sudo` qatorida `COMMAND=/usr/bin/cat /etc/shadow`. 3 — `useradd` `/etc/passwd` ga yozadi, shuning uchun yozuv chiqadi; `uid=0` (root sifatida bajarilgan), `auid` esa sizning haqiqiy foydalanuvchi raqamingiz (odatda 1000) — auditd sudo'dan keyin ham asl foydalanuvchini eslab qoladi.*
:::

## Xulosa

- Linux loglari asosan `/var/log` da va ko'pi **matn** — `grep`, `cut`, `sort`, `uniq` bilan tahlil qilinadi.
- Kirishlar: Debian/Ubuntu'da `auth.log`, RHEL'da `secure`; zamonaviy tizimlarda **journald** (`journalctl`).
- Loglar aylanadi — `auth.log.1`, `.gz` fayllarni ham tekshiring (`zgrep`).
- SSH tergovida asosiy savol — `Failed` lar ichida **`Accepted`** bormi va undan keyin nima bo'lgan.
- `sudo` qatori: kim, qayerdan, kim sifatida, qanday buyruq.
- Persistence izlari: **cron**, **systemd** unitlari, `authorized_keys`.
- **auditd** — yadro darajasidagi audit: `-w` fayl kuzatuvi, `-a` syscall kuzatuvi, `-k` kalit; `ausearch` va `aureport` bilan qidiriladi.
- **auid** `sudo` dan keyin ham asl foydalanuvchini saqlaydi.
- Root huquqli hujumchi lokal loglarni o'zgartira oladi — loglar markaziy serverga yuborilishi kerak.

:::quiz
? Ubuntu'da SSH kirishlari va sudo buyruqlari odatda qaysi faylga yoziladi?
+ /var/log/auth.log
- /var/log/kern.log
- /etc/passwd
- /var/log/apache2/access.log
! Debian va Ubuntu'da — auth.log, RHEL oilasida — /var/log/secure.

? auth.log da 2 000 ta “Failed password” qatori bor. Eng muhim keyingi qadam qaysi?
- Serverni darhol qayta yuklash
+ Shu IP'lardan “Accepted” qatori bor-yo'qligini tekshirish
- auth.log ni o'chirish
- Hech narsa — bu oddiy holat
! Internetga ochiq SSH doimiy hujum ostida. Asosiy savol — urinishlardan biri muvaffaqiyatli bo'lganmi.

? auth.log da faqat bugungi yozuvlar bor, hujum esa o'tgan hafta boshlangan bo'lishi mumkin. Nima qilish kerak?
- Hech narsa qilib bo'lmaydi
+ Aylantirilgan fayllarni (auth.log.1, auth.log.2.gz) ham tekshirish, siqilganlari uchun zgrep bilan
- Faqat journalctl -f ni ishga tushirish
- Serverni qayta o'rnatish
! logrotate eski loglarni alohida va siqilgan fayllarga ko'chiradi.

? Quyidagi qatordagi USER=root nimani bildiradi: “sudo: deploy : TTY=pts/0 ; PWD=/home/deploy ; USER=root ; COMMAND=/usr/bin/cat /etc/shadow”?
- deploy hisobi root deb o'zgartirildi
+ deploy foydalanuvchisi buyruqni root sifatida bajardi
- root hisobi deploy ga kirdi
- Buyruq bajarilmadi
! sudo qatori kim (deploy), qayerdan (TTY, PWD), kim sifatida (USER) va nima (COMMAND) bajarilganini ko'rsatadi.

? auditd qoidasidagi “-p wa” nimani bildiradi?
- Faqat o'qishni kuzatish
+ Yozish va atribut o'zgarishini kuzatish
- Faqat ishga tushirishni kuzatish
- Qoidani o'chirish
! r — o'qish, w — yozish, x — ishga tushirish, a — atribut o'zgarishi.

? auditd'dagi auid ning asosiy afzalligi nima?
- U parollarni shifrlaydi
+ U sudo yoki su dan keyin ham asl tizimga kirgan foydalanuvchini saqlaydi
- U loglarni tezroq yozadi
- U root huquqini bloklaydi
! Buyruq root nomidan bajarilsa ham, auid haqiqiy shaxsni ko'rsatadi.

? auditctl bilan qo'shilgan qoida server qayta yuklangandan keyin yo'qoldi. Nega?
- auditd buzilgan
+ auditctl qoidalari vaqtinchalik; doimiy qoidalar /etc/audit/rules.d/ ga yozilib, augenrules --load bilan yuklanadi
- Qoidalar faqat bir soat ishlaydi
- Bu normal emas, qayta o'rnatish kerak
! auditctl joriy yadro holatini o'zgartiradi, rules.d fayllari esa har yuklanishda o'qiladi.

? Nega .bash_history ga to'liq ishonib bo'lmaydi?
- U shifrlangan
+ U seans oxirida yoziladi, o'chirilishi yoki o'chirib qo'yilishi oson
- U faqat root uchun yoziladi
- U faqat xatolarni saqlaydi
! Hujumchi tarixni o'chirishi mumkin. Ishonchli buyruqlar tarixi uchun auditd kerak.

? Qaysi joy Linux'da persistence izlarini qidirishda birinchi tekshiriladiganlardan emas?
- crontab va /etc/cron.d/
- /etc/systemd/system/ dagi unitlar
- ~/.ssh/authorized_keys
+ /usr/share/doc/ dagi hujjatlar
! Cron, systemd va authorized_keys — avtomatik ishga tushish va qayta kirish yo'llari. Hujjatlar papkasi bunday imkon bermaydi.

? Nega Linux loglarini markaziy serverga yuborish muhim?
- Lokal disk tezroq to'ladi
+ Root huquqiga ega hujumchi lokal matnli loglarni tahrirlashi yoki o'chirishi mumkin
- Linux loglarni lokal saqlay olmaydi
- Bu faqat qonun talabi
! Markaziy nusxa hujumchi lokal izlarini tozalagandan keyin ham saqlanib qoladi.
:::

:::cards
auth.log va secure? :: Kirishlar, SSH, sudo yozuvlari: Debian/Ubuntu'da /var/log/auth.log, RHEL oilasida /var/log/secure.
journalctl asosiy buyruqlari? :: -u xizmat, --since/--until vaqt oralig'i, -p err daraja, -f jonli kuzatish, _COMM=sudo dastur bo'yicha.
logrotate nima qiladi? :: Loglarni aylantiradi: auth.log → auth.log.1 → auth.log.2.gz. Siqilganlarida zgrep bilan qidiriladi.
SSH tergovidagi asosiy savol? :: “Failed” qatorlari orasida shu IP'dan “Accepted” bormi va kirgandan keyin nima qilingan?
last, lastb, lastlog? :: last — kirish tarixi (wtmp); lastb — muvaffaqiyatsiz kirishlar (btmp); lastlog — har bir hisobning oxirgi kirishi.
sudo log qatorida nima bor? :: Kim, TTY, PWD (qayerdan), USER (kim sifatida) va COMMAND (qaysi buyruq).
Linux'da persistence qayerda qidiriladi? :: cron (crontab, /etc/cron.d), systemd unitlari, ~/.ssh/authorized_keys.
auditd nima? :: Linux yadrosining audit tizimi: fayllarga murojaat va tizim chaqiruvlarini /var/log/audit/audit.log ga yozadi.
auditd -w qoidasi namunasi? :: -w /etc/passwd -p wa -k identity — /etc/passwd ga yozish va atribut o'zgarishini “identity” kaliti bilan kuzatadi.
auid nima? :: Audit user ID — tizimga kirgan asl foydalanuvchi; sudo va su dan keyin ham o'zgarmaydi.
ausearch va aureport? :: ausearch -k kalit -i — yozuvlarni qidirish; aureport — xulosa hisobotlari (--auth, --login, --summary).
Doimiy auditd qoidalari qayerda? :: /etc/audit/rules.d/*.rules fayllarida; augenrules --load bilan yuklanadi.
:::
