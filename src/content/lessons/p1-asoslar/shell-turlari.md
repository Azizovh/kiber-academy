SOC tarmog'idagi WS-BUX-014 insidentining eng muhim qatorini eslang: Word → PowerShell → **`203.0.113.45` ga chiquvchi ulanish**. Shu daqiqadan boshlab hujumchi buxgalter kompyuterida buyruq bajara boshladi. Bu — "shell": masofadan boshqariladigan buyruq qatori.

Pentesterlar orasida "shell oldim" iborasi — zaiflik isbotlangan va tizimda buyruq bajarish imkoni paydo bo'lgan lahza. Himoyachilar uchun esa bu — insidentning eng xavfli bosqichi boshlangan lahza.

Bu dars shell'larning **turlari va mexanizmi** haqida: reverse va bind shell nima, nega biri firewall'dan o'tadi, ikkinchisi yo'q, web shell nima, fayllar qanday uzatiladi — va eng muhimi, bularning hammasi jurnallarda qanday ko'rinadi va qanday to'xtatiladi. Shell olish bo'yicha amaliyot — TryHackMe'dagi "What the Shell?" kabi o'quv xonalarida.

## Shell nima

Linux bosqichidan (s3) bilasiz: shell — buyruqlarni qabul qilib bajaradigan dastur (`bash`, `sh`, Windows'da `cmd.exe`, `powershell.exe`). Masofaviy shell — shu dasturning kirish va chiqishi tarmoq ulanishiga ulangan: tarmoq orqali kelgan matn buyruq sifatida bajariladi, natija esa tarmoq orqali qaytadi.

Qonuniy masofaviy shell'lar har kuni ishlatiladi: SSH, WinRM, Session Manager (c1). Ulardan farqi — **autentifikatsiya, shifrlash va jurnal**. Hujumda olingan shell odatda hech birisiz: zaiflik orqali ochilgan, xom ulanish.

## Bind shell va reverse shell

```
 BIND SHELL                                   REVERSE SHELL
 Nishonda port ochiladi, tester ulanadi        Nishon testerga O'ZI ulanadi

 Tester ─────── ulanish ──────▶ Nishon         Tester ◀────── ulanish ─────── Nishon
 (198.51.100.50)               :4444 tinglaydi (198.51.100.50 :443 tinglaydi)
                                [shell]                                       [shell]

 Firewall: kiruvchi ulanish — odatda TO'SILADI  Firewall: chiquvchi ulanish — ko'pincha O'TADI
```

| | [[bind-shell|Bind shell]] | [[reverse-shell|Reverse shell]] |
|---|---|---|
| Kim tinglaydi | Nishon | Tester (hujumchi) |
| Ulanish yo'nalishi | Kiruvchi (nishonga) | Chiquvchi (nishondan) |
| Firewall | Kiruvchi qoidalar to'sadi (c1 `policy drop`) | Chiquvchi trafik ko'pincha ochiq — o'tadi |
| NAT ortidagi nishon | Yetib bo'lmaydi | Ishlaydi — nishon o'zi chiqadi |
| Port | Nishonda yangi ochiq port (skanerda ko'rinadi) | Ko'pincha 80/443 — "oddiy web trafik" ko'rinishida |

:::key
Shuning uchun hujumchilar deyarli har doim reverse shell'ni tanlaydi. Va shuning uchun c2 bosqichidagi saboq juda muhim: **chiquvchi trafikni nazorat qilish**. Sukut bo'yicha "chiquvchi — hammasi ochiq" bo'lgan security group reverse shell uchun ochiq eshik. Kiruvchi firewall'ni mukammal sozlagan, lekin chiquvchini unutgan tashkilot — eshigini qulflab, derazasini ochiq qoldirgan uy.
:::

## Web shell

[[web-shell|Web shell]] — web serverga joylangan skript fayli (PHP, ASPX, JSP…), brauzer orqali so'rov yuborilganda serverda buyruq bajaradi. U alohida ulanish ochmaydi — oddiy HTTP so'rovlari ichida ishlaydi.

Qanday paydo bo'ladi: fayl yuklash zaifligi (p2 bosqichi), kod bajarish zaifliklari, buzilgan CMS plaginlari, o'g'irlangan administrator hisobi.

Nega xavfli: oddiy web trafikka o'xshaydi, server qayta yuklansa ham saqlanib qoladi (fayl diskda) — ya'ni u **persistence** vositasi ham. Qamrov darsidagi holatni eslang: pentest davomida notanish skript fayli topilishi — avvalgi buzilish belgisi.

## Shell'ni "barqarorlashtirish" haqida

Zaiflik orqali olingan oddiy shell ko'pincha noqulay: `Ctrl+C` ulanishni uzadi, tahrirlovchilar ishlamaydi, buyruq tarixi yo'q. Sababi — unda haqiqiy terminal (**TTY**) yo'q, faqat xom matn oqimi bor. Pentesterlar uni to'liq interaktiv terminalga aylantirish usullarini o'rganadi — bu o'quv platformalarida batafsil ko'rsatiladi.

Himoyachi uchun bu bosqichning ahamiyati: TTY yaratish uchun ishlatiladigan buyruqlar va jarayonlar (masalan, web server foydalanuvchisi nomidan interaktiv terminal ochilishi) — jarayon jurnallarida juda g'ayrioddiy ko'rinadi.

## Fayl uzatish

Shell olingandan keyin tester (yoki hujumchi) ko'pincha nishonga vosita yuklashi yoki undan fayl olishi kerak bo'ladi. Usullar va ularning izlari:

| Usul | Qanday | Himoyachi nimani ko'radi |
|---|---|---|
| HTTP yuklab olish | Nishonda `curl`, `wget`, PowerShell yoki tizim yordamchi dasturlari bilan | Proxy/web jurnallari, g'ayrioddiy jarayon tashqi manzilga murojaat qilmoqda |
| Windows tizim dasturlari (LOLBins) | Qonuniy imzolangan dasturlarni yuklab olish uchun suiiste'mol qilish | Sysmon Event 1 da g'ayrioddiy argumentlar (b2 LOLBins darsi) |
| SMB | Tarmoq ulushidan nusxalash | SMB ulanishlari, yangi ulush |
| SCP / SFTP | SSH orqali | SSH jurnallari |
| Base64 matn sifatida | Faylni matnga aylantirib, shell orqali "yozish" | Uzun Base64 argumentli buyruqlar (b1 PowerShell `-enc`) |
| DNS orqali | Ma'lumotni DNS so'rovlari ichida | Juda uzun, tasodifiy subdomenli so'rovlar (b1 DNS tunnel belgilari) |

Bu jadval — SOC tarmog'ida o'rgangan aniqlash qoidalaringizning boshqa tomoni. Har bir usul iz qoldiradi; yaxshi yozilgan detection rule (b2) ularni ushlaydi.

## Shell'larni aniqlash

**Jarayonlar daraxti** — eng kuchli signal. Normal holatda web server faqat o'z ishchi jarayonlarini ishga tushiradi:

```
 NORMAL                                      SHUBHALI
 nginx                                       nginx / gunicorn / w3wp.exe / java
  └─ gunicorn (Qaydnoma)                      └─ sh -c ...
                                                  └─ bash -i
                                                      └─ curl http://198.51.100.x/...
```

Web server jarayonidan buyruq qatori (`sh`, `bash`, `cmd.exe`, `powershell.exe`) tug'ilishi — deyarli har doim kod bajarish zaifligi yoki web shell. Bu b1 bosqichidagi Sysmon Event 1 (ota-bola jarayon) va c3 bosqichidagi Falco qoidasi ("konteyner ichida shell ishga tushdi") bilan aniqlanadi.

**Tarmoq signallari:**

| Signal | Qayerda |
|---|---|
| Server notanish tashqi IP'ga chiquvchi ulanish ochdi | Firewall, VPC Flow Logs (c2) |
| G'ayrioddiy portga chiquvchi ulanish | Flow loglar; egress filtrlash bloklasa — REJECT yozuvlari |
| Uzoq davom etadigan, kichik hajmli interaktiv ulanish | Tarmoq tahlili (b1) |
| Nishonda yangi tinglayotgan port (bind shell) | Muntazam port skanerlash, `ss -tlnp` monitoringi |

**Fayl signallari:** web papkada yangi yoki o'zgargan skript fayllari — fayl yaxlitligi monitoringi (FIM), web papkaga yozish huquqini cheklash.

## Himoya

| Qatlam | Chora | Kursda |
|---|---|---|
| Zaiflikni yopish | Shell'ning sababi — kod bajarish yoki fayl yuklash zaifligi | a2, p2 |
| Eng kam imtiyoz | Web server alohida, imtiyozsiz hisobda; web papkaga yozish huquqi yo'q | c1 |
| Egress filtrlash | Serverlar faqat kerakli manzillarga chiqadi — reverse shell ulana olmaydi | c2 |
| Read-only va minimal muhit | Konteynerda read-only fayl tizimi, shell'siz image (distroless) | c3 |
| Monitoring | Ota-bola jarayonlar, chiquvchi ulanishlar, FIM | b1, b2, c3 |
| Segmentatsiya | Shell olingan serverdan boshqa tizimlarga yo'l cheklangan | c1 |

Shell'siz (distroless) konteyner image'lari alohida e'tiborga loyiq: image ichida `sh` umuman bo'lmasa, ko'p hujum usullari ishlamaydi. Bu — hujumchi uchun kerak bo'ladigan vositalarni oldindan olib tashlash.

## Shell mavzusi nimani anglatmaydi

- Shell olish pentestning maqsadi emas — maqsad ta'sirni isbotlash va mijozga foydali hisobot. Ko'p hollarda zaiflikni shell'siz, minimal isbot bilan ko'rsatish afzal (oldingi darslar).
- Shell olingan tizimda tester nima qilishi RoE bilan qat'iy cheklangan: ma'lumotni o'zgartirmaslik, qamrovdan chiqmaslik, sessiyani loyiha oxirida yopish va qoldirgan fayllarni o'chirish (va buni hisobotda qayd etish).

:::try
1. Reverse va bind shell farqini o'z so'zlaringiz bilan, firewall va NAT nuqtai nazaridan, besh qatorda tushuntiring.
2. O'z Linux VM'ingizda `ps -ef --forest` (yoki `pstree -p`) bilan jarayonlar daraxtini ko'ring. nginx yoki boshqa xizmat qanday bola jarayonlarga ega? Qaysi biri g'ayrioddiy bo'lardi?
3. b1 bosqichidagi Sysmon bilimingiz asosida "web server jarayonidan buyruq qatori tug'ildi" degan aniqlash qoidasini Sigma uslubida (b2) yozing — ota-jarayon va bola-jarayon nomlari bilan.
4. c2 bosqichidagi Qaydnoma app serverlari uchun egress qoidalari ro'yxatini qayta ko'ring: reverse shell 443-port orqali tashqi manzilga chiqa oladimi?
5. TryHackMe'dagi "What the Shell?" xonasini o'ting.
6. Savol: pentest davomida tester mijoz serverida test uchun kichik fayl joyladi. Loyiha oxirida nima qilishi kerak?

**Javoblar:**
1. Bind — nishon port ochib kutadi, tester ulanadi; kiruvchi ulanish firewall tomonidan odatda to'siladi va NAT ortidagi nishonga yetib bo'lmaydi. Reverse — nishon o'zi tester tinglayotgan manzilga ulanadi; chiquvchi trafik ko'pincha ochiq bo'lgani va NAT chiquvchi ulanishni o'tkazgani uchun ishlaydi. Himoya — egress filtrlash.
2. Odatda nginx master → nginx worker jarayonlari; gunicorn master → gunicorn worker'lar. Ulardan `sh`, `bash`, `curl`, `python -c` tug'ilishi — g'ayrioddiy.
3. Misol mantiq: `ParentImage` oxiri `nginx`, `httpd`, `w3wp.exe`, `java` va hokazo; `Image` oxiri `sh`, `bash`, `cmd.exe`, `powershell.exe` — yuqori darajadagi signal. Sigma'da `selection_parent` va `selection_child` bilan `condition: selection_parent and selection_child`.
4. Agar egress "443 hamma joyga" bo'lsa — ha, chiqa oladi. Shuning uchun c2 darsida yangilanishlar uchun ham domen bo'yicha filtr (Network Firewall) va AWS xizmatlari uchun VPC endpoint tavsiya qilingan.
5. Xona shell turlari va ularni olish usullarini o'quv nishonlarida ko'rsatadi.
6. Faylni o'chirish, sessiyalarni yopish, nima qoldirilgani va o'chirilganini faoliyat jurnaliga va hisobotga yozish ("tozalash" bo'limi). Agar biror narsa o'chirib bo'lmasa — mijozga aniq ro'yxat bilan xabar berish.
:::

## Xulosa

- Shell — masofadan boshqariladigan buyruq qatori; qonuniy shell'lardan (SSH, WinRM) farqi — autentifikatsiya, shifrlash va jurnal yo'qligi.
- Bind shell — nishonda port ochiladi, kiruvchi ulanish, firewall to'sadi. Reverse shell — nishon o'zi chiqadi, firewall va NAT'dan ko'pincha o'tadi.
- Web shell — web serverdagi skript, oddiy HTTP ichida ishlaydi va persistence beradi.
- Fayl uzatish usullari (HTTP, LOLBins, SMB, Base64, DNS) — har biri iz qoldiradi.
- Eng kuchli signal — web server jarayonidan buyruq qatori tug'ilishi; keyin g'ayrioddiy chiquvchi ulanishlar va web papkadagi yangi fayllar.
- Himoya: zaiflikni yopish, eng kam imtiyoz, egress filtrlash, read-only va shell'siz image'lar, monitoring, segmentatsiya.
- Tester loyiha oxirida qoldirgan hamma narsani tozalaydi va hujjatlashtiradi.

:::quiz
? Reverse shell'ning bind shell'dan asosiy farqi qaysi?
+ Reverse shell'da nishon o'zi tester tomonga chiquvchi ulanish ochadi; bind shell'da nishon port ochib kutadi
- Reverse shell shifrlangan, bind shell yo'q
- Bind shell faqat Windows'da
- Farqi yo'q
! Ulanish yo'nalishi firewall va NAT orqali o'tishni belgilaydi.

? Nega hujumchilar ko'pincha reverse shell'ni tanlaydi?
- U har doim tezroq
+ Kiruvchi ulanishlar firewall'da to'siladi, chiquvchi trafik esa ko'pincha ochiq va NAT'dan o'tadi
- Bind shell noqonuniy
- Reverse shell iz qoldirmaydi
! Himoya — egress filtrlash: serverlar faqat kerakli manzillarga chiqadi.

? Web shell haqida qaysi gap to'g'ri?
- U alohida tarmoq porti ochadi
+ U web serverdagi skript fayli — oddiy HTTP so'rovlari orqali buyruq bajaradi va diskda saqlanib qoladi
- U faqat xotirada ishlaydi va qayta yuklashda yo'qoladi
- U faqat SSH orqali ishlaydi
! Web shell — ham kirish, ham persistence vositasi.

? Qaysi signal web serverda kod bajarilganining eng kuchli belgisi?
- Ko'p 200 javoblari
+ Web server jarayonidan (nginx, w3wp.exe, java) buyruq qatori (sh, bash, cmd.exe, powershell.exe) tug'ilishi
- TLS sertifikatining yangilanishi
- Sahifa yuklanish tezligi
! Ota-bola jarayon tahlili — Sysmon Event 1 va Falco qoidalari.

? Qaysi himoya chorasi reverse shell'ning ulanishini to'g'ridan-to'g'ri to'xtatadi?
- Kuchli parol siyosati
+ Egress filtrlash — server faqat ruxsat etilgan manzil va portlarga chiqa oladi
- Antivirus imzolarini yangilash
- SSH portini o'zgartirish
! Chiquvchi trafik nazorati — c2 bosqichining asosiy saboqlaridan.

? Shell'siz (distroless) konteyner image'lari nima beradi?
+ Image ichida shell va yordamchi vositalar yo'q — ko'p hujum usullari ishlamaydi
- Image kattaroq bo'ladi
- Konteyner tezroq ishga tushmaydi
- Hech qanday foyda yo'q
! Hujumchi uchun kerak bo'ladigan vositalarni oldindan olib tashlash.

? Nishonga fayl uzatish uchun uzun Base64 argumentli buyruqlar ishlatildi. Himoyachi buni qayerda ko'radi?
- Hech qayerda
+ Jarayon yaratish jurnallarida (Sysmon Event 1, PowerShell jurnallari) uzun kodlangan argumentlar sifatida
- Faqat DNS jurnalida
- Faqat bulut billingida
! b1 bosqichidagi PowerShell `-enc` tahlili bilan bir xil belgi.

? Bind shell qanday aniqlanishi mumkin?
+ Nishonda yangi tinglayotgan port paydo bo'lishi — muntazam port skanerlash yoki `ss -tlnp` monitoringi
- Faqat chiquvchi ulanishlar orqali
- Uni aniqlab bo'lmaydi
- Faqat foydalanuvchi shikoyati orqali
! Kutilmagan ochiq port — signal.

? Pentest oxirida tester nishonda qoldirgan fayllar bilan nima qiladi?
- Keyingi pentest uchun qoldiradi
+ O'chiradi, sessiyalarni yopadi va hammasini faoliyat jurnali hamda hisobotda qayd etadi
- Mijozga aytmaydi
- Faqat ba'zilarini o'chiradi
! Tozalash — professional pentestning majburiy qismi.

? Qonuniy masofaviy shell (SSH, Session Manager) hujumda olingan shell'dan nimasi bilan farq qiladi?
- Hech narsasi bilan
+ Autentifikatsiya, shifrlash va jurnallar bilan
- Faqat rangi bilan
- Faqat tezligi bilan
! Shuning uchun boshqaruv faqat nazorat qilinadigan, jurnalga yoziladigan kanallar orqali bo'lishi kerak.
:::

:::cards
Shell :: Buyruqlarni qabul qilib bajaradigan dastur; masofaviy shell — tarmoq orqali
Bind shell :: Nishon port ochib kutadi, tester ulanadi — firewall odatda to'sadi
Reverse shell :: Nishon o'zi tester tomonga ulanadi — chiquvchi trafik orqali o'tadi
Web shell :: Web serverdagi skript — HTTP orqali buyruq bajaradi, persistence beradi
TTY :: Haqiqiy terminal; oddiy shell'da yo'q
Ota-bola jarayon signali :: Web server jarayonidan buyruq qatori tug'ilishi
Egress filtrlash :: Chiquvchi ulanishlarni cheklash — reverse shell'ga qarshi
FIM :: Fayl yaxlitligi monitoringi — web papkadagi yangi fayllarni ko'radi
Distroless image :: Shell va yordamchi vositalarsiz konteyner image
Tozalash :: Pentest oxirida qoldirilgan fayl va sessiyalarni olib tashlash va qayd etish
:::
