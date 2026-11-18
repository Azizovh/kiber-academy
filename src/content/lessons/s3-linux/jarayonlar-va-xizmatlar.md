Server sekinlashib qoldi. Protsessor 100 foiz band. Nima yeyapti? Yoki boshqa holat: tizimda siz tanimaydigan dastur ishlayapti va u har besh daqiqada qayergadir ulanmoqda. U nima, uni kim ishga tushirgan va nega kompyuter qayta yoqilgandan keyin ham paydo bo'lyapti?

Bu savollarga javob berish uchun tizimda **hozir nima ishlayotganini** ko'ra olish kerak. Bu darsda jarayonlar, xizmatlar va rejalashtirilgan vazifalarni o'rganasiz — tizim ma'murining kundalik ishi va tergovchining birinchi qaraydigan joylari.

## Jarayon nima — eslatma

"Operatsion tizim" darsidan bilasiz: [[process|jarayon]] — ishlab turgan dastur nusxasi. Har birida:

- **PID** — yagona raqam;
- **PPID** — ota jarayonning PID'i (uni kim ishga tushirgan);
- **egasi** — qaysi foydalanuvchi huquqida ishlayapti;
- **buyruq satri** — qanday argumentlar bilan ishga tushirilgan.

Linux yoqilganda yadro birinchi jarayonni ishga tushiradi — **PID 1** (zamonaviy tizimlarda bu `systemd`). Qolgan hamma narsa uning "avlodi".

## ps — jarayonlarning surati

```bash
ps              # faqat shu terminaldagi jarayonlar
ps aux          # tizimdagi BARCHA jarayonlar
ps -ef          # xuddi shu, boshqa formatda (PPID ko'rinadi)
ps aux --sort=-%cpu | head      # protsessorni eng ko'p band qilganlar
ps aux --sort=-%mem | head      # xotirani eng ko'p band qilganlar
```

`ps aux` chiqishi:

```
USER       PID %CPU %MEM    VSZ   RSS TTY   STAT START   TIME COMMAND
root         1  0.0  0.1 168548 11920 ?     Ss   09:00   0:02 /sbin/init
www-data   812  0.3  1.2 215104 48320 ?     S    09:01   0:14 nginx: worker process
talaba    2341  0.0  0.2  10092  5320 pts/0 Ss   10:15   0:00 -bash
```

| Ustun | Ma'nosi |
|---|---|
| `USER` | Jarayon kimning huquqida ishlayapti |
| `PID` | Jarayon raqami |
| `%CPU`, `%MEM` | Protsessor va xotira ulushi |
| `TTY` | Qaysi terminalga bog'langan; `?` — hech qaysiga (fon xizmati) |
| `STAT` | Holati: `R` ishlayapti, `S` kutyapti, `Z` "zombi", `T` to'xtatilgan |
| `START` | Qachon ishga tushgan |
| `COMMAND` | To'liq buyruq satri |

Aniq jarayonni topish:

```bash
ps aux | grep nginx
pgrep -a nginx          # qisqaroq: PID va buyruq
```

### Daraxt ko'rinishi

Kim kimni ishga tushirganini ko'rish uchun:

```bash
pstree -p               # PID'lar bilan daraxt
ps -ef --forest         # ps ning daraxt ko'rinishi
```

```
systemd(1)─┬─sshd(701)───sshd(2301)───bash(2341)───pstree(2410)
           ├─nginx(810)─┬─nginx(811)
           │            └─nginx(812)
           └─cron(640)
```

Bu daraxtni o'qiy olish — muhim ko'nikma. Yuqoridagi qatordan ko'rinib turibdi: kimdir SSH orqali ulangan (`sshd`), unga `bash` ochilgan va u `pstree` ni ishga tushirgan. Hammasi mantiqli.

:::key
Tergovda asosiy savol: **"bu jarayonni kim tug'gan?"** Veb-server jarayonining "farzandi" sifatida buyruq qobig'i (`bash`, `sh`) paydo bo'lishi — odatiy ish tartibida uchramaydigan holat va darhol tekshirishni talab qiladi. Windows darsidagi "Word → PowerShell" misoli bilan aynan bir xil mantiq.
:::

## top — jonli kuzatuv

`ps` — bir lahzalik surat. `top` — jonli video:

```bash
top
```

Ekranning tepasida — tizimning umumiy holati (yuklama, xotira), pastida — jarayonlar, eng "ochko'zi" tepada.

`top` ichidagi tugmalar: `q` — chiqish, `P` — protsessor bo'yicha, `M` — xotira bo'yicha saralash, `k` — jarayonni to'xtatish, `1` — har bir yadro alohida.

`htop` — xuddi shu narsaning rangli va qulayroq ko'rinishi (alohida o'rnatiladi: `sudo apt install htop`). Sichqoncha bilan ham ishlaydi, daraxt rejimi bor (`F5`).

Tepadagi **load average** — uchta son (oxirgi 1, 5 va 15 daqiqa uchun o'rtacha yuklama). Taxminiy qoida: son yadrolar sonidan kichik bo'lsa — tizim ulgurmoqda.

## Jarayonni to'xtatish: signallar

Jarayonga [[signal|signal]] yuboriladi — bu unga qisqa xabar. Buning uchun `kill` buyrug'i ishlatiladi (nomi qo'rqinchli, lekin u shunchaki "signal yubor" degani).

| Signal | Raqami | Ma'nosi |
|---|---|---|
| `SIGTERM` | 15 | "Iltimos, ishingni tugatib, to'xta." Standart signal |
| `SIGKILL` | 9 | "Darhol to'xta." Jarayon buni rad eta olmaydi |
| `SIGINT` | 2 | `Ctrl + C` bosganingizda yuboriladigan signal |
| `SIGHUP` | 1 | Ko'p xizmatlar uchun: "sozlamalarni qayta o'qi" |
| `SIGSTOP` / `SIGCONT` | 19 / 18 | To'xtatib turish / davom ettirish |

```bash
kill 2341            # SIGTERM — odob bilan
kill -9 2341         # SIGKILL — majburan
pkill firefox        # nomi bo'yicha
killall firefox      # shu nomli hammasini
```

Tartib: avval oddiy `kill` (jarayon fayllarini saqlab, tartibli yopilsin), ishlamasa — `kill -9`. Birdaniga `-9` ishlatish — ma'lumot yo'qotishga olib kelishi mumkin.

Faqat **o'z** jarayonlaringizga signal yubora olasiz; boshqalarnikiga — `sudo` kerak.

## Fonda ishlash

Uzoq davom etadigan buyruq terminalni band qilib qo'yadi. Uni fonga o'tkazish mumkin:

```bash
uzoq_buyruq &            # darhol fonda ishga tushirish
jobs                     # shu terminaldagi fon vazifalari
fg %1                    # 1-vazifani oldinga qaytarish
bg %1                    # to'xtatilgan vazifani fonda davom ettirish
```

`Ctrl + Z` — ishlayotgan buyruqni to'xtatib turadi (o'chirmaydi); keyin `bg` bilan fonda davom ettirasiz.

Muammo: terminalni yopsangiz, undagi fon jarayonlari ham to'xtaydi. Yechimlar:

```bash
nohup uzoq_buyruq &      # terminal yopilsa ham davom etadi
```

Yoki — ancha qulayi — **tmux**: terminal ichidagi "virtual terminallar". SSH uzilib qolsa ham ichidagi ish davom etadi, keyin qayta ulanib olasiz. Serverda uzoq ish (katta skan, yangilanish) bajarayotganda bu standart amaliyot.

## Xizmatlar va systemd

[[daemon|Xizmat]] (daemon) — fonda, foydalanuvchisiz ishlaydigan jarayon: veb-server, SSH server, ma'lumotlar bazasi. Zamonaviy Linux'da ularni [[systemd|systemd]] boshqaradi, uning buyrug'i — `systemctl`.

```bash
systemctl status ssh             # holati va oxirgi jurnal qatorlari
sudo systemctl start ssh         # ishga tushirish
sudo systemctl stop ssh          # to'xtatish
sudo systemctl restart ssh       # qayta ishga tushirish
sudo systemctl reload nginx      # to'xtatmasdan sozlamani qayta o'qish

sudo systemctl enable ssh        # tizim yoqilganda avtomatik ishga tushsin
sudo systemctl disable ssh       # avtomatik ishga tushmasin
```

Ikki juftlikni adashtirmang:

| | Hozir | Tizim yoqilganda |
|---|---|---|
| Yoqish | `start` | `enable` |
| O'chirish | `stop` | `disable` |

`start` qilingan, lekin `enable` qilinmagan xizmat qayta yuklashdan keyin ishlamaydi. Ikkalasini birga qilish: `systemctl enable --now ssh`.

Umumiy manzara:

```bash
systemctl list-units --type=service --state=running    # hozir ishlayotganlar
systemctl list-unit-files --type=service --state=enabled   # avtomatik ishga tushadiganlar
```

Ikkinchi ro'yxat — server auditining majburiy qismi. Qoida oddiy: **kerak bo'lmagan xizmat o'chirilgan bo'lishi kerak.** Har bir ishlab turgan xizmat — hujum yuzasining bir bo'lagi (tarmoq bosqichidagi "hujum yuzasi" tushunchasini eslang).

Xizmat jurnali:

```bash
journalctl -u ssh                # shu xizmatning barcha yozuvlari
journalctl -u ssh -f             # jonli kuzatish
journalctl -u ssh --since "1 hour ago"
```

Xizmat ishga tushmasa, sababi deyarli doim shu yerda yozilgan.

## cron — jadval bo'yicha vazifalar

[[cron|cron]] — vazifalarni belgilangan vaqtda avtomatik bajaradigan xizmat: tungi zaxira nusxa, jurnallarni tozalash, hisobot yuborish.

Har bir foydalanuvchining o'z jadvali bor — **crontab**:

```bash
crontab -l               # mening vazifalarim
crontab -e               # tahrirlash
sudo crontab -l -u ali   # boshqa foydalanuvchiniki
```

Qator formati — beshta vaqt maydoni va buyruq:

```
┌───────── daqiqa (0–59)
│ ┌─────── soat (0–23)
│ │ ┌───── oyning kuni (1–31)
│ │ │ ┌─── oy (1–12)
│ │ │ │ ┌─ hafta kuni (0–7; 0 va 7 — yakshanba)
│ │ │ │ │
* * * * *  buyruq
```

| Yozuv | Qachon bajariladi |
|---|---|
| `0 3 * * *` | Har kuni soat 03:00 da |
| `*/5 * * * *` | Har 5 daqiqada |
| `0 9 * * 1` | Har dushanba 09:00 da |
| `30 2 1 * *` | Har oyning 1-kuni 02:30 da |
| `@reboot` | Tizim har yoqilganda |

`*` — "har qanday qiymat", `*/5` — "har beshinchi". Shubhangiz bo'lsa — `crontab.guru` sayti yozuvni oddiy tilda tushuntirib beradi.

Tizim darajasidagi vazifalar boshqa joylarda:

```
/etc/crontab              tizim jadvali
/etc/cron.d/              qo'shimcha jadval fayllari
/etc/cron.daily/          har kuni bajariladigan skriptlar
/etc/cron.hourly/         har soatda
/var/spool/cron/crontabs/ foydalanuvchilar crontab'lari
```

systemd'ning o'z rejalashtirgichi ham bor — **timer**lar: `systemctl list-timers`.

### cron va xavfsizlik

Rejalashtirilgan vazifalar — tizimda **avtomatik va takroriy** bajariladigan kod. Shuning uchun ular ikki sababga ko'ra alohida e'tiborni talab qiladi.

**Birinchisi — to'g'ri sozlash.** Root nomidan ishlaydigan cron vazifasi chaqiradigan skript va u turgan katalog **faqat root tomonidan** o'zgartirilishi mumkin bo'lishi kerak. Aks holda oddiy foydalanuvchi skriptni o'zgartirib, o'z kodini root huquqida bajartira oladi. Ruxsatlar darsidagi "katalog ruxsati ham muhim" qoidasi shu yerda amalda ishlaydi.

**Ikkinchisi — tergov.** Kompyuter qayta yoqilgandan keyin ham shubhali jarayon yana paydo bo'lyaptimi? Demak, uni nimadir qayta ishga tushiryapti. Tekshiriladigan joylar ro'yxati (Windows darsidagi "Run kalitlari"ning Linux'dagi o'xshashlari):

| Joy | Qanday ko'riladi |
|---|---|
| Foydalanuvchilar crontab'lari | `sudo ls -la /var/spool/cron/crontabs/` |
| Tizim cron kataloglari | `ls -la /etc/cron*` |
| systemd xizmatlari va timer'lari | `systemctl list-unit-files --state=enabled`, `systemctl list-timers` |
| Shell sozlama fayllari | `~/.bashrc`, `~/.profile`, `/etc/profile.d/` |

Bu ro'yxatda **tanish bo'lmagan** yozuv — batafsil o'rganishga arziydi.

## /proc — jarayonlarning ichki dunyosi

"Hamma narsa — fayl" tamoyilining eng yorqin misoli. Har bir jarayon uchun `/proc/<PID>/` katalogi bor:

```bash
cat /proc/812/cmdline          # to'liq buyruq satri
ls -l /proc/812/exe            # ishga tushirilgan dastur fayliga havola
ls -l /proc/812/cwd            # jarayonning ish katalogi
cat /proc/812/status           # holati, egasi, xotira
```

Tergovda foydali xususiyat: dastur fayli diskdan o'chirilgan bo'lsa ham, jarayon ishlab turar ekan, `/proc/<PID>/exe` u haqida ma'lumot beradi (`(deleted)` belgisi bilan). "Fayl yo'q, lekin jarayon bor" — o'z-o'zidan diqqatga sazovor holat.

Tizim haqida ham ma'lumot shu yerda: `/proc/cpuinfo`, `/proc/meminfo`, `/proc/version`.

## Shubhali jarayonni tekshirish tartibi

Hammasini bitta ketma-ketlikka yig'amiz. Notanish jarayonni ko'rdingiz — nima qilasiz?

```bash
ps -ef --forest                  # 1. U nima va uni kim tug'gan?
ls -l /proc/<PID>/exe            # 2. Dastur fayli qayerda?
cat /proc/<PID>/cmdline          # 3. Qanday argumentlar bilan?
sudo ss -tulpn | grep <PID>      # 4. Tarmoqda nima qilyapti?
ls -la /proc/<PID>/cwd           # 5. Qaysi katalogdan ishlayapti?
```

Diqqatni tortadigan belgilar: dastur `/tmp`, `/dev/shm` yoki uy katalogidan ishga tushgan; nomi tizim jarayoniga o'xshatilgan, lekin joylashuvi boshqa; egasi xizmat hisobi, lekin ichida buyruq qobig'i ishlayapti; fayli o'chirilgan.

:::warn
Haqiqiy insidentda jarayonni darhol "o'ldirishga" shoshilmang. Avval ma'lumot yig'ing — u xotirada turgan dalil. "Kompyuter qanday ishlaydi" darsidagi qoida: o'chirilgan jarayon bilan birga uning xotiradagi izlari ham yo'qoladi.
:::

:::lab jarayonlar-va-xizmatlar

:::try
Kali VM'ingizda (yoki istalgan Linux'da) bajaring:

```bash
ps aux | wc -l                          # nechta jarayon ishlayapti?
ps aux --sort=-%mem | head -5           # xotirani eng ko'p band qilgan 5 tasi
pstree -p | head -30                    # daraxtning boshi
systemctl list-units --type=service --state=running
crontab -l
```

Keyin kichik tajriba: `sleep 300 &` — 5 daqiqa "uxlaydigan" jarayonni fonda ishga tushiring. `jobs` bilan ko'ring, `ps aux | grep sleep` bilan PID'ini toping, `/proc/<PID>/cmdline` ni o'qing va `kill <PID>` bilan to'xtating.
:::

## Xulosa

- `ps aux` — barcha jarayonlar; `ps -ef --forest`, `pstree -p` — kim kimni tug'gan.
- `top` / `htop` — jonli kuzatuv.
- `kill PID` (SIGTERM) — odob bilan; `kill -9` (SIGKILL) — majburan, oxirgi chora.
- `&`, `jobs`, `fg`, `bg`, `nohup`, `tmux` — fonda ishlash.
- `systemctl start/stop` — hozir; `enable/disable` — tizim yoqilganda. Keraksiz xizmat — o'chiriladi.
- `journalctl -u xizmat` — xizmat jurnali.
- **cron**: `daqiqa soat kun oy hafta-kuni buyruq`; `crontab -l`, `/etc/cron*`.
- Avtomatik ishga tushadigan joylar (cron, systemd, shell sozlamalari) — audit va tergovning doimiy nuqtalari.
- `/proc/<PID>/` — jarayon haqida batafsil ma'lumot.

:::quiz
? Tizimdagi barcha jarayonlarni ko'rsatadigan buyruq qaysi?
- ps
+ ps aux
- top -1
- jobs
! Oddiy `ps` faqat joriy terminal jarayonlarini ko'rsatadi. `ps aux` — barcha foydalanuvchilarning barcha jarayonlari.

? `kill 1234` va `kill -9 1234` orasidagi farq nima?
- Farqi yo'q
+ Birinchisi jarayondan tartibli to'xtashni so'raydi (SIGTERM), ikkinchisi darhol majburan to'xtatadi (SIGKILL)
- Birinchisi faqat root uchun ishlaydi
- Ikkinchisi jarayonni qayta ishga tushiradi
! SIGTERM jarayonga ishini yakunlash imkonini beradi. SIGKILL ni rad etib bo'lmaydi — u oxirgi chora.

? `sudo systemctl enable nginx` buyrug'i nima qiladi?
- nginx ni hozir ishga tushiradi
+ nginx tizim yoqilganda avtomatik ishga tushadigan qiladi
- nginx ni o'rnatadi
- nginx sozlamalarini qayta o'qiydi
! enable — avtomatik ishga tushishni yoqadi, lekin hozir ishga tushirmaydi. Hozir uchun — start (yoki enable --now).

? `*/10 * * * *` cron yozuvi vazifani qachon bajaradi?
- Har kuni soat 10:00 da
+ Har 10 daqiqada
- Har oyning 10-kuni
- 10 kunda bir marta
! Birinchi maydon — daqiqa; `*/10` — har o'ninchi daqiqa. Qolgan maydonlar `*` — har qanday.

? Jarayonlar daraxtida veb-server jarayonining “farzandi” sifatida `bash` paydo bo'lganini ko'rdingiz. Bu nimani anglatadi?
- Bu mutlaqo odatiy holat
+ Odatiy ish tartibida uchramaydigan holat — tekshirish kerak
- Veb-server yangilanyapti
- bash buzilgan
! Veb-server odatda buyruq qobig'i ishga tushirmaydi. Kutilmagan ota-bola juftligi — tergovni boshlash uchun sabab.

? Kompyuter qayta yoqilgandan keyin ham notanish jarayon yana paydo bo'lyapti. Qayerlarni tekshirasiz?
+ Foydalanuvchilar va tizim crontab'larini
+ Avtomatik ishga tushadigan systemd xizmatlari va timer'larini
+ Shell sozlama fayllarini (~/.bashrc, /etc/profile.d/)
- Faqat /tmp katalogini
! Qayta ishga tushishni nimadir ta'minlayapti: cron, systemd yoki shell sozlamalari — avtomatik ishga tushirishning asosiy joylari.

? Xizmat ishga tushmayapti. Sababini qayerdan qidirasiz?
- /etc/passwd dan
+ journalctl -u xizmat_nomi (va systemctl status) dan
- crontab -l dan
- pstree dan
! systemctl status oxirgi jurnal qatorlarini, journalctl -u esa xizmatning to'liq jurnalini ko'rsatadi — xato sababi odatda shu yerda.

? Root nomidan ishlaydigan cron vazifasi skriptni chaqiradi. Bu skript haqida nima to'g'ri bo'lishi kerak?
- U hamma yoza oladigan katalogda turishi kerak
+ Skript va u turgan katalogni faqat root o'zgartira olishi kerak
- Uning ruxsati 777 bo'lishi kerak
- U /tmp da saqlanishi kerak
! Aks holda oddiy foydalanuvchi skriptni o'zgartirib, o'z kodini root huquqida bajartira oladi.

? SSH ulanishi uzilib qolsa ham serverdagi uzoq ish davom etishi uchun nima ishlatiladi?
- Ctrl + Z
+ tmux (yoki nohup)
- kill -9
- crontab -e
! tmux seansi serverda yashaydi: ulanish uzilsa ham ish davom etadi va keyin qayta ulanib olish mumkin.

? `/proc/1234/exe` nimani ko'rsatadi?
- Jarayon egasining parolini
+ 1234-jarayon ishga tushirilgan dastur fayliga havolani
- Jarayonning tarmoq ulanishlarini
- Tizim yadrosi versiyasini
! /proc/<PID>/exe — bajarilayotgan faylga havola. Fayl diskdan o'chirilgan bo'lsa ham ma'lumot beradi.
:::

:::cards
Barcha jarayonlarni ko'rish buyrug'i? :: ps aux (daraxt ko'rinishida: ps -ef --forest yoki pstree -p).
SIGTERM va SIGKILL farqi? :: SIGTERM (15) — tartibli to'xtashni so'raydi; SIGKILL (9) — darhol majburan to'xtatadi, rad etib bo'lmaydi.
systemctl start va enable farqi? :: start — hozir ishga tushiradi; enable — tizim yoqilganda avtomatik ishga tushadigan qiladi.
Xizmat holati va jurnalini ko'rish? :: systemctl status xizmat; journalctl -u xizmat
cron qatori formati? :: daqiqa soat oy-kuni oy hafta-kuni buyruq
0 3 * * * nimani bildiradi? :: Har kuni soat 03:00 da.
Mening cron vazifalarimni ko'rish? :: crontab -l (tizimniki: /etc/crontab, /etc/cron.d/)
Avtomatik ishga tushirish joylari (audit uchun)? :: crontab'lar, /etc/cron*, yoqilgan systemd xizmatlari va timer'lari, shell sozlama fayllari.
/proc/<PID>/ da nima bor? :: Jarayon haqida ma'lumot: cmdline (buyruq satri), exe (dastur fayli), cwd (ish katalogi), status.
Buyruqni fonda ishga tushirish? :: buyruq & — ro'yxati: jobs; oldinga qaytarish: fg
PID 1 nima? :: Tizimning birinchi jarayoni (odatda systemd); qolgan barcha jarayonlar uning avlodi.
:::
