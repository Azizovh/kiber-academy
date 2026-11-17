SOC tarmog'ida EDR darsini eslang (b2): ogohlantirish "Meterpreter xatti-harakati aniqlandi" deb keldi va tahlilchi sifatida siz uni yuqori ustuvorlik bilan ko'rdingiz. Nega EDR uni darhol taniydi? Chunki Metasploit — dunyodagi eng mashhur ochiq manbali hujum freymvorki, va uning izlari himoyachilarga yaxshi tanish.

Pentesterlar uchun Metasploit — ma'lum zaifliklarni standart, sinalgan usulda tekshirish vositasi: yuzlab exploit oldingi darsdagi "o'qilmagan GitHub kodi" emas, tekshirilgan modullar sifatida. Himoyachilar uchun esa — o'z nazoratlarini sinash va hujumchi qanday ishlashini tushunish vositasi.

Bu dars Metasploit'ning **tuzilishi** haqida: u qanday qismlardan iborat, atamalari nimani anglatadi, pentestda qayerda o'rni bor va qanday izlar qoldiradi. Modullarni ishga tushirish mashqi — TryHackMe'dagi "Metasploit" xonalarida va o'z laboratoriyangizda (Metasploitable — aynan shu maqsadda yaratilgan zaif VM).

## Metasploit nima

[[metasploit|Metasploit Framework]] — Rapid7 kompaniyasi qo'llab-quvvatlaydigan ochiq manbali freymvork. U birlashtiradi:

```
 ┌──────────────────────── Metasploit Framework ────────────────────────┐
 │                                                                      │
 │  Modullar bazasi:  exploit · auxiliary · post · payload · encoder …  │
 │                                                                      │
 │  msfconsole  ← asosiy interfeys (buyruq qatori)                      │
 │  msfvenom    ← payload'larni alohida fayl sifatida yaratish          │
 │  Ma'lumotlar bazasi (PostgreSQL) ← hostlar, xizmatlar, topilmalar    │
 │  Sessiyalar boshqaruvi ← ochilgan ulanishlar                         │
 └──────────────────────────────────────────────────────────────────────┘
```

Tijorat versiyasi (Metasploit Pro) ham bor, lekin o'qishda va ko'p pentestlarda bepul Framework ishlatiladi. Kali Linux'da o'rnatilgan holda keladi.

:::warn
Metasploit bilan mashq — faqat izolyatsiyalangan laboratoriyada: Kali va ataylab zaif VM (Metasploitable) **internetga chiqmaydigan** host-only tarmoqda, yoki TryHackMe/HTB'ning o'quv nishonlari. Metasploitable'ni ochiq tarmoqqa ulash — uni birinchi duch kelgan hujumchiga sovg'a qilish. Begona tizimga qarshi har qanday modul — ruxsatsiz hujum.
:::

## Modul turlari

| Tur | Nima qiladi | Misol vazifa |
|---|---|---|
| **auxiliary** | Exploit'siz yordamchi ishlar | Skanerlash, versiya aniqlash, xizmat enumeratsiyasi |
| **exploit** | Zaiflikdan foydalanib, payload'ni bajartiradi | Ma'lum zaif xizmatni sinash |
| **payload** | Exploit muvaffaqiyatli bo'lgach nishonda bajariladigan kod | Buyruq qatori, Meterpreter sessiyasi |
| **post** | Sessiya ochilgandan keyingi ishlar | Tizim haqida ma'lumot yig'ish |
| **encoder** | Payload'ni kodlash (masalan, ma'lum belgilardan qochish uchun) | — |
| **nop** | Xotira exploitlari uchun to'ldiruvchi | — |
| **evasion** | Himoya vositalaridan yashirish urinishlari | Bu kursda ko'rib chiqilmaydi |

Muhim: ko'p **auxiliary** modullari zararsiz va pentestning razvedka va enumeratsiya bosqichlarida foydali — oldingi darslardagi tekshiruvlarning ko'pchiligini (SMB versiyasi, FTP anonim kirishi, SSH versiyasi) auxiliary modullari bilan ham qilish mumkin, natijalar esa ma'lumotlar bazasiga yoziladi.

## Payload'lar: staged va stageless

Payload — exploit "eshikni ochgandan" keyin nishonda nima bo'lishini belgilaydi. Nomlash qoidasi tuzilishni ko'rsatadi:

| Nom ko'rinishi | Turi | Ma'nosi |
|---|---|---|
| `.../meterpreter/reverse_tcp` | **Staged** (bosqichli) | Avval kichik "stager" yuboriladi, u ulanib, asosiy qismni (stage) yuklab oladi. Belgi — `/` |
| `.../meterpreter_reverse_tcp` | **Stageless** (bir bo'lakli) | Hammasi bir bo'lakda. Belgi — `_` |
| `.../shell_reverse_tcp` | Stageless oddiy shell | Oddiy buyruq qatori |

| | Staged | Stageless |
|---|---|---|
| Hajm | Birinchi qism kichik | Katta |
| Tarmoq | Ikki bosqichli aloqa kerak | Bitta ulanish |
| Ishonchlilik | Beqaror tarmoqda muammoli bo'lishi mumkin | Barqarorroq |
| Qachon | Exploit faqat kichik joy beradigan holatlarda | Imkon bo'lsa — oddiyroq |

`reverse_tcp` va `bind_tcp` — keyingi darsning mavzusi: nishon sizga ulanadimi yoki siz nishonga.

## Meterpreter

**Meterpreter** — Metasploit'ning kengaytirilgan payload'i: oddiy buyruq qatoridan ko'proq — fayl tizimi, jarayonlar, tarmoq ma'lumotlari, kengaytmalar bilan interaktiv sessiya. U xotirada ishlaydi va diskka kam yozadi.

Himoyachi uchun Meterpreter juda yaxshi tanish: uning tarmoq trafigi, xotiradagi tuzilishi va xatti-harakati ko'p EDR va IDS imzolarida bor. Pentestda bu ikki tomonlama: Meterpreter mijozning EDR'i ishlayotganini tekshirish uchun yaxshi "o'lchov", lekin haqiqiy hujumchi bu qadar tanish vositadan ko'pincha qochadi (p4 bosqichidagi red team va himoya vositalari darslari).

## msfconsole: navigatsiya

Asosiy buyruqlar — modulni topish va tushunish uchun:

| Buyruq | Nima qiladi |
|---|---|
| `search <so'z>` | Modullarni nom, CVE, tur bo'yicha qidirish (`search type:auxiliary smb`) |
| `info <modul>` | Modul tavsifi, nishonlar, ishonchlilik darajasi, havolalar — **ishlatishdan oldin o'qing** |
| `use <modul>` | Modulni tanlash |
| `show options` | Kerakli parametrlar (masalan, `RHOSTS` — nishon, `RPORT` — port) |
| `check` | Ba'zi exploit modullarida — nishon zaifmi yoki yo'qligini **ekspluatatsiyasiz** tekshirish |
| `workspace`, `hosts`, `services`, `vulns` | Ma'lumotlar bazasi: loyiha bo'yicha natijalar |
| `sessions` | Ochiq sessiyalar ro'yxati |

`info` natijasidagi **Rank** maydoni muhim — modulning ishonchliligi va xavfsizligi:

| Rank | Ma'nosi |
|---|---|
| Excellent | Hech qachon xizmatni yiqitmaydi |
| Great / Good | Ishonchli, kichik xavf |
| Normal / Average | Ishonchsizroq |
| Low / Manual | Ko'pincha muvaffaqiyatsiz yoki xavfli |

Oldingi darsdagi barqarorlik qoidasi shu yerda: past rank'li modul mijoz tizimida — RoE va mijoz bilan alohida kelishuvsiz yo'q. `check` buyrug'i bor bo'lsa — avval u, chunki u ko'pincha zaiflikni ta'sirsiz tasdiqlaydi.

## Ma'lumotlar bazasi va loyiha

Metasploit o'z ma'lumotlar bazasida loyiha bo'yicha hostlar, xizmatlar, topilmalar va sessiyalarni saqlaydi. Har bir pentest uchun alohida `workspace` — bitta mijozning ma'lumoti boshqasiniki bilan aralashmaydi (qamrov darsidagi ma'lumot bilan ishlash qoidasi). Nmap XML natijasini import qilish mumkin (`db_import`), shunda oldingi darslardagi ish davom etadi.

## Pentestda Metasploit'ning o'rni

| Afzallik | Cheklov |
|---|---|
| Sinalgan modullar, standart interfeys | Faqat ma'lum zaifliklar — ilova mantiqini topmaydi |
| Tez tasdiqlash (`check`, auxiliary) | Juda tanish — EDR va IDS darhol ko'radi |
| Natijalar bazada, hisobotga qulay | "Tugmani bosish" tushunishsiz — xavfli va professional emas |
| Himoya nazoratlarini sinash uchun yaxshi o'lchov | Ba'zi sertifikat imtihonlari undan foydalanishni cheklaydi (masalan, OSCP — p4) |

Oxirgi qatorning sababi: imtihon mexanizmni **tushunganingizni** tekshiradi. Metasploit moduli qanday ishlashini tushunmasdan uni ishlatish — oldingi darsdagi "o'qilmagan kod" muammosining boshqa ko'rinishi.

## Metasploit qoldiradigan izlar

Bu bo'lim — SOC va AppSec tarmoqlari bilan ko'prik:

| Iz | Qayerda ko'rinadi |
|---|---|
| Ma'lum exploit so'rovlarining tarmoq naqshlari | IDS/IPS imzolari (b2), WAF jurnallari |
| Payload ulanishlari, ayniqsa sukut portlari (masalan, 4444) | Firewall va Flow loglar, egress filtrlash (c2) |
| Meterpreter'ning xotiradagi tuzilishi va xatti-harakati | EDR (b2) |
| G'ayrioddiy ota-bola jarayonlar (xizmat → shell) | Sysmon Event 1 (b1), Falco (c3) |
| Post modullari qiladigan so'rovlar (ko'p tizim ma'lumotlarini ketma-ket o'qish) | EDR va jurnal korrelyatsiyasi |

Pentest hisobotida bu ham qimmatli ma'lumot: "Meterpreter sessiyasi 40 daqiqa davomida faol bo'ldi va hech qanday ogohlantirish chiqmadi" — mijoz uchun exploit'ning o'zidan ham muhimroq topilma bo'lishi mumkin. Purple team darsidagi (b4) g'oya: hujum va aniqlashni birga sinash.

## Metasploit nimani qilmaydi

- Yangi zaiflik topmaydi — faqat ma'lumlarini sinaydi.
- Web ilova mantiqini, IDOR'ni, biznes mantiq xatolarini tekshirmaydi.
- Qamrov va RoE'ni bilmaydi: `RHOSTS` ga noto'g'ri diapazon yozsangiz, u begona tizimga ham hujum qiladi. Mas'uliyat — sizda.
- Tushunishni almashtirmaydi.

:::try
1. Kali Linux VM va Metasploitable 2 VM'ni **alohida, internetga chiqmaydigan** virtual tarmoqda (host-only) ko'taring.
2. `msfconsole` da `search type:auxiliary scanner` bilan skaner modullarini ko'ring. Bittasini tanlab `info` bilan o'qing: nima qiladi, qanday parametrlar kerak?
3. Metasploitable'dagi bitta xizmat uchun auxiliary versiya skanerini ishga tushiring va natijani Nmap `-sV` natijasi bilan solishtiring.
4. Bitta exploit modulining `info` sahifasini o'qing: Rank, nishonlar, `check` qo'llab-quvvatlanadimi?
5. TryHackMe'dagi "Metasploit: Introduction" va keyingi xonalarni o'ting — exploit va payload bilan amaliyot shu yerda, o'quv nishonlarida.
6. Savol: pentest davomida mijoz tarmog'ida Meterpreter sessiyasi ochildi va EDR hech narsa demadi. Bu hisobotda qanday yoziladi?

**Javoblar:**
1. Host-only tarmoq — Metasploitable internetga chiqmasligi shart: u ataylab juda zaif.
2. Har bir modul `info` sahifasida tavsif, mualliflar, parametrlar (`RHOSTS`, `RPORT`, `THREADS`) va havolalar bor.
3. Natijalar odatda mos keladi; farq bo'lsa — qaysi vosita qanday usul bilan aniqlaganini tushunishga harakat qiling.
4. Rank va `check` mavjudligi — mijoz tizimida modulni ishlatish yoki ishlatmaslik qarorining asosi.
5. Xonalar exploit/payload sozlash va sessiyalar bilan ishlashni o'quv muhitida beradi.
6. Alohida topilma: "Taniqli hujum vositasi (Meterpreter) bilan ochilgan sessiya X daqiqa davomida aniqlanmadi" — EDR siyosati, qamrovi (bu hostda agent bormi?) va SOC'ga ogohlantirish yetib borishini tekshirish tavsiyasi bilan. Bu ko'pincha mijoz uchun eng muhim xulosalardan biri.
:::

## Xulosa

- Metasploit — modullar, payload'lar, sessiyalar va ma'lumotlar bazasini birlashtirgan ochiq manbali freymvork; msfconsole — asosiy interfeys.
- Modul turlari: auxiliary (skan, enumeratsiya — ko'pincha zararsiz), exploit, payload, post, encoder, nop, evasion.
- Payload nomida `/` — staged, `_` — stageless. Meterpreter — kengaytirilgan, xotirada ishlaydigan sessiya.
- Ishlatishdan oldin: `info` (Rank, nishonlar), mavjud bo'lsa `check`. Past rank — mijoz tizimida yo'q.
- Har bir loyiha — alohida workspace; Nmap natijasini import qilish mumkin.
- Metasploit juda tanish: IDS, EDR, Sysmon, flow loglarda iz qoldiradi. Aniqlanmagan sessiya — muhim topilma.
- Metasploit qamrovni bilmaydi va tushunishni almashtirmaydi.

:::quiz
? Metasploit'dagi auxiliary modullari nima uchun ishlatiladi?
+ Exploit'siz yordamchi ishlar: skanerlash, versiya aniqlash, enumeratsiya
- Faqat payload yaratish uchun
- Faqat sessiyalarni boshqarish uchun
- Antivirusni o'chirish uchun
! Ko'p auxiliary modullari razvedka va enumeratsiya bosqichlarida foydali va zararsiz.

? Payload nomi `windows/meterpreter/reverse_tcp`. Bu qanday payload?
+ Staged — avval kichik stager, keyin asosiy qism yuklanadi
- Stageless
- Bind shell
- Encoder
! Nomdagi `/` staged, `_` stageless ekanini bildiradi.

? Stageless payload'ning afzalligi qaysi?
- U har doim kichikroq
+ Bitta ulanish va bir bo'lak — beqaror tarmoqda barqarorroq
- U aniqlanmaydi
- U faqat Linux'da ishlaydi
! Staged payload ikki bosqichli aloqa talab qiladi.

? Modulni ishlatishdan oldin `info` buyrug'ida qaysi maydon xavfsizlik uchun muhim?
- Modul muallifining ismi
+ Rank — modulning ishonchliligi va xizmatni yiqitish xavfi
- Modul hajmi
- Modulning rangi
! Past rank'li modullar mijoz tizimida kelishuvsiz ishlatilmaydi.

? Exploit modulidagi `check` buyrug'ining qiymati nimada?
+ Ko'p hollarda nishon zaifligini ekspluatatsiyasiz, ta'sirsiz tekshiradi
- U har doim shell ochadi
- U Metasploit'ni yangilaydi
- U jurnallarni o'chiradi
! Minimal ta'sir bilan isbot — pentestning asosiy qoidasi.

? Nega har bir pentest loyihasi uchun alohida workspace ishlatiladi?
- Metasploit tezroq ishlaydi
+ Bir mijozning hostlari, xizmatlari va topilmalari boshqasiniki bilan aralashmaydi
- Bu talab qilinmaydi
- Faqat litsenziya uchun
! Ma'lumot bilan ishlash qoidasi: mijoz ma'lumoti ajratilgan holda.

? Meterpreter haqida himoyachi nuqtai nazaridan qaysi gap to'g'ri?
- Uni hech qanday vosita aniqlay olmaydi
+ Uning tarmoq va xotira izlari ko'p EDR va IDS imzolarida bor — u yaxshi tanish
- U faqat Linux'da ishlaydi
- U diskka ko'p fayl yozadi va shuning uchun yashirin
! Shuning uchun Meterpreter sessiyasining aniqlanmagani — muhim topilma.

? `RHOSTS` parametriga xato bilan qamrovdan tashqaridagi diapazon yozildi. Kim javobgar?
- Metasploit ishlab chiquvchilari
+ Pentester — vosita qamrovni bilmaydi
- Mijoz
- Hech kim
! Har bir parametrni ishga tushirishdan oldin tekshirish — tester mas'uliyati.

? Nega ba'zi sertifikat imtihonlari Metasploit'dan foydalanishni cheklaydi?
- Metasploit noqonuniy
+ Imtihon mexanizmni tushunganingizni tekshiradi — "tugmani bosish" emas
- Metasploit ishlamaydi
- Imtihonda internet yo'q
! Modul qanday ishlashini bilmasdan ishlatish — o'qilmagan kod muammosining boshqa ko'rinishi.

? Metasploit pentestning qaysi qismini qila olmaydi?
- Ma'lum zaifliklarni sinash
- Natijalarni bazada saqlash
+ Web ilovadagi IDOR va biznes mantiq xatolarini topish
- Skanerlash
! Ilova mantiqi qo'lda, metodik tekshiruv talab qiladi (p2).
:::

:::cards
Metasploit Framework :: Modullar, payload'lar, sessiyalar va bazani birlashtirgan ochiq manbali freymvork
msfconsole :: Metasploit'ning asosiy buyruq qatori interfeysi
auxiliary :: Exploit'siz modul: skan, enumeratsiya
exploit moduli :: Zaiflikdan foydalanib payload'ni bajartiradigan modul
payload :: Exploit muvaffaqiyatli bo'lgach nishonda bajariladigan kod
Staged payload :: Avval kichik stager, keyin asosiy qism (nomda /)
Stageless payload :: Hammasi bir bo'lakda (nomda _)
Meterpreter :: Xotirada ishlaydigan kengaytirilgan sessiya payload'i
Rank :: Modul ishonchliligi va xizmatni yiqitish xavfi darajasi
check :: Nishon zaifligini ekspluatatsiyasiz tekshirish
workspace :: Loyiha bo'yicha ajratilgan ma'lumotlar maydoni
:::
