PT-2026-07 loyihasining birinchi kuni. Qamrovda: `qaydnoma.example.com`, `api.qaydnoma.example.com` va 8 ta IP manzil. Siz hali birorta paketni mijoz serveriga yubormadingiz — va yubormaysiz ham. Birinchi kun **passiv razvedka**ga bag'ishlanadi: nishonga umuman tegmasdan, ochiq manbalardan ma'lumot yig'ish.

Kun oxirida eslatmalaringizda: qamrovda ko'rsatilmagan uchta subdomen (ulardan biri — `dev-old.qaydnoma.example.com`), GitHub'dagi bir dasturchining shaxsiy repozitoriysida Qaydnoma konfiguratsiya fayli, sayt PDF hujjatlarida ichki server nomlari va xodimlarning email formati. Bularning hammasini istalgan kishi — jumladan haqiqiy hujumchi — xuddi shu tarzda topishi mumkin edi.

[[osint|OSINT]] (Open Source Intelligence) — ochiq manbalardan razvedka. Hujumchi uchun bu birinchi qadam, himoyachi uchun esa — o'zining **hujum yuzasini** tashqaridan ko'rish imkoni. Bu darsda tester ko'zi bilan ko'ramiz, lekin har bir bo'limda savol bir xil: mijoz buni qanday kamaytiradi?

## Passiv va faol razvedka

| | Passiv | Faol |
|---|---|---|
| Nishonga paket yuboriladimi | Yo'q — uchinchi tomon manbalari | Ha — skanerlash, so'rovlar |
| Nishon jurnallarida ko'rinadimi | Yo'q | Ha |
| Misol | whois, sertifikat jurnallari, qidiruv tizimlari, Shodan | Nmap, katalog qidirish (keyingi darslar) |
| Qamrov kerakmi | Ochiq ma'lumot, lekin natijani ishlatish — qamrov doirasida | Ha, albatta |

Passiv razvedka nishonga tegmaydi, lekin u ham **loyiha doirasida** o'tkaziladi: topilgan narsalar faqat qamrov va RoE bo'yicha ishlatiladi. Qamrovdan tashqarida topilgan subdomen — oldingi darsdagi qoida: yozib qo'yish va mijozga xabar berish.

## Domen va ro'yxatga olish ma'lumotlari

```bash
whois example.com
# Registrar, ro'yxatga olingan va tugash sanasi, name server'lar.
# Ko'p domenlarda egasining shaxsiy ma'lumotlari maxfiylik xizmati bilan yashirilgan.

dig qaydnoma.example.com A +short          # IPv4 manzil
dig qaydnoma.example.com MX +short         # pochta serverlari
dig qaydnoma.example.com TXT +short        # SPF, domen tasdiqlash yozuvlari
dig example.com NS +short                  # name server'lar
```

Tarmoq bosqichidagi DNS darsi (s2) bu yerda ishga tushadi. Har bir yozuv bir narsa aytadi:

| Yozuv | Tester nimani bilib oladi |
|---|---|
| `A` / `AAAA` | Qaysi IP — bulut, hosting yoki o'z ma'lumot markazi |
| `MX` | Pochta qayerda (Microsoft 365, Google Workspace…) |
| `TXT` (SPF) | Pochta yuborishga ruxsat etilgan xizmatlar — kompaniya ishlatadigan SaaS ro'yxati (b1 SPF darsi) |
| `TXT` (tasdiqlash) | `google-site-verification`, `MS=…` kabi qatorlar — qaysi xizmatlar ulangan |
| `CNAME` | Subdomen qaysi tashqi xizmatga ishora qiladi |

**DNS zone transfer** (AXFR) — noto'g'ri sozlangan name server butun zona ro'yxatini istalgan kishiga beradi. Bu faol so'rov (nishon serveriga yuboriladi), shuning uchun faqat qamrovdagi server uchun tekshiriladi. Himoya: zone transfer faqat ishonchli ikkilamchi serverlarga.

## Subdomenlar: sertifikat jurnallari

Har bir ommaviy TLS sertifikati **Certificate Transparency** (CT) jurnallariga yoziladi — bu sertifikatlarni nazorat qilish uchun yaratilgan ochiq tizim (s5 PKI darsi). Natija: kompaniya qaysi subdomenlar uchun sertifikat olgan bo'lsa, ularning nomlari ommaviy.

```bash
# crt.sh — CT jurnallarida qidiruv (JSON natija)
curl -s "https://crt.sh/?q=%25.example.com&output=json" | jq -r '.[].name_value' | sort -u
# api.qaydnoma.example.com
# dev-old.qaydnoma.example.com
# qaydnoma.example.com
# staging.qaydnoma.example.com
```

`dev-old` va `staging` — qamrov hujjatida yo'q edi. Ko'pincha aynan shunday "unutilgan" muhitlar eng zaif bo'ladi: eski versiya, test ma'lumotlari, zaif parollar, monitoringsiz (c1 bosqichidagi "ishlatilmaydigan region" ogohlantirishining domen ko'rinishi).

Boshqa manbalar: passiv DNS bazalari, qidiruv tizimlari, `subfinder` va `amass` kabi vositalar — ular o'nlab ochiq manbalarni birlashtiradi.

:::warn
Topilgan subdomen avtomatik ravishda qamrovga kirmaydi. `dev-old.qaydnoma.example.com` uchun: IP'si mijozga tegishlimi? Qamrovga qo'shiladimi? Mijozga yozma ravishda xabar bering va javobni kuting. Ko'pincha mijozning o'zi bunday serverlar borligini bilmaydi — bu allaqachon qimmatli topilma.
:::

## Qidiruv tizimlari: dorking

Qidiruv tizimlari indekslagan narsalarni maxsus operatorlar bilan izlash — "Google dorking":

| Operator | Ma'nosi | Misol (faqat mijoz domeni) |
|---|---|---|
| `site:` | Faqat shu domen | `site:qaydnoma.example.com` |
| `filetype:` | Fayl turi | `site:qaydnoma.example.com filetype:pdf` |
| `inurl:` | URL'da so'z | `site:qaydnoma.example.com inurl:admin` |
| `intitle:` | Sarlavhada so'z | `site:qaydnoma.example.com intitle:"index of"` |
| `-` | Istisno | `site:example.com -site:www.example.com` |

Nima qidiriladi: indekslangan admin sahifalar, katalog ro'yxatlari ("index of"), xato sahifalari (texnologiya va yo'llar), hujjatlar.

**Hujjat metama'lumotlari.** PDF va Office fayllari ichida muallif ismi, dastur versiyasi, ba'zan ichki server yo'llari bo'ladi (`\\fileserver01\docs\...`). `exiftool hujjat.pdf` buni ko'rsatadi. Bu ichki infratuzilma va foydalanuvchi nomlari formatini ochib beradi. Himoya: chop etishdan oldin metama'lumotni tozalash.

**Wayback Machine** (`web.archive.org`) — saytning eski versiyalari: o'chirilgan sahifalar, eski API yo'llari, eski JavaScript fayllaridagi endpointlar.

## Internetdagi qurilmalar qidiruvchilari: Shodan, Censys

Shodan va Censys butun internetni doimiy skanerlab, natijalarni qidiriladigan bazaga yozadi. Ya'ni ular **siz uchun** skanerlab qo'ygan — passiv tarzda ko'rishingiz mumkin:

```
hostname:qaydnoma.example.com
net:203.0.113.16/29
ssl.cert.subject.cn:"qaydnoma.example.com"
```

Natijada: qaysi IP'da qaysi portlar ochiq, xizmat bannerlari va versiyalari, TLS sertifikatlari, ba'zan skrinshotlar. c2 bosqichidagi "temp — Jasur uchun" ochiq baza porti — Shodan'da aynan shunday ko'rinardi.

Bu ma'lumot eskirgan bo'lishi mumkin (skan bir necha kun oldin bo'lgan) — shuning uchun keyingi faol bosqichda tasdiqlanadi.

## Kod repozitoriylari

a3 bosqichidagi sirlar darsini eslang: kalitlar va parollar ko'pincha kodga tushadi. OSINT'da:

- Kompaniyaning ommaviy GitHub tashkiloti va repozitoriylari.
- **Xodimlarning shaxsiy** repozitoriylari — ishdan olingan kod, konfiguratsiyalar.
- Qidiruv: domen nomi, ichki server nomlari, API yo'llari bo'yicha.

Topilgan sir — darhol RoE'dagi kritik topilma tartibi. Uni **ishlatib ko'rmaysiz** (qamrov va RoE aniq ruxsat bermagan bo'lsa): mijozga xabar berasiz va u kalitni o'chiradi (c4 bulut IR).

## Odamlar

Kompaniya xodimlari — hujum yuzasining bir qismi (b1 fishing tahlili):

- LinkedIn va kompaniya sayti: kim qaysi lavozimda, IT jamoasi qanday texnologiyalarni ishlatadi (ish e'lonlari — juda boy manba: "Kubernetes, Terraform, PostgreSQL 15 tajribasi").
- Email formati: `ism.familiya@` yoki `i.familiya@` — hujjatlar va ochiq manbalardan.

Axloqiy chegara: maqsad — **tashkilotning** hujum yuzasini ko'rsatish, shaxslar haqida dosye yig'ish emas. Ijtimoiy injineriya qamrovda bo'lmasa, odamlar haqidagi ma'lumot hisobotda faqat umumiy xulosa sifatida qo'llanadi ("xodimlar email formati ochiq manbalardan aniqlanadi; ish e'lonlarida texnologiya versiyalari ko'rsatilgan").

**Sizib chiqqan parollar bazalari** — bu yerda qat'iy chegara: o'g'irlangan ma'lumotlar bazalarini yuklab olish va ulardan parollarni ishlatish noqonuniy va noaxloqiy. Qonuniy yo'l — "Have I Been Pwned" kabi xizmatlarning domen bo'yicha xabarnoma funksiyasi, uni **mijozning o'zi** o'z domeni uchun ishlatadi.

## Natija: aktivlar ro'yxati

Passiv razvedka oxirida — tartibli jadval, keyingi faol bosqich uchun reja:

| Aktiv | Manba | Qamrovda | Kuzatuv |
|---|---|---|---|
| `qaydnoma.example.com` — 203.0.113.20 | DNS | Ha | nginx, TLS — Shodan |
| `api.qaydnoma.example.com` — 203.0.113.21 | DNS, CT | Ha | — |
| `staging.qaydnoma.example.com` | CT | **Yo'q** — so'raldi | Sertifikat 2 oy oldin |
| `dev-old.qaydnoma.example.com` | CT, Wayback | **Yo'q** — so'raldi | Eski login sahifasi arxivda |
| 203.0.113.22 | Shodan | Ha | Ochiq 5432 port (3 kun oldingi skan) |
| GitHub: dasturchining shaxsiy repo | GitHub qidiruv | Mijozga xabar | Konfiguratsiya fayli, ichki host nomlari |

Oxirgi qatorlardagi narsalarning o'zi — hisobot uchun topilmalar, hali birorta ham faol so'rov yuborilmagan bo'lsa ham.

## Himoyachi uchun: hujum yuzasini boshqarish

Bu darsdagi hamma narsani mijoz o'zi muntazam qilishi kerak — bu **attack surface management**:

| Tester topgan narsa | Himoya |
|---|---|
| Unutilgan subdomenlar | Domen va sertifikatlar inventari; CT monitoring (yangi sertifikat chiqqanda xabar) |
| "Osilib qolgan" CNAME (o'chirilgan xizmatga ishora) | DNS yozuvlarini muntazam tozalash — aks holda subdomen egallanishi mumkin |
| Shodan'da ochiq portlar | c2 bosqichidagi security group auditi, tashqi skanerlash monitoringi |
| Hujjatlardagi metama'lumot | Chop etishdan oldin tozalash |
| Repozitoriylardagi sirlar | Sir skanerlash, xodimlar uchun qoidalar (a3) |
| Ish e'lonlaridagi texnologiya versiyalari | Kerakli darajada umumiylashtirish |

## OSINT nimani qilmaydi

- Ma'lumot eskirgan yoki noto'g'ri bo'lishi mumkin — har bir xulosa faol bosqichda tasdiqlanadi.
- Topilgan narsa qamrovni kengaytirmaydi.
- Axloqiy va huquqiy chegarani olib tashlamaydi: "ochiq" ma'lumot ham shaxsiy hayot va qonun himoyasida bo'lishi mumkin; sizib chiqqan bazalar — taqiqlangan.

:::try
Faqat **o'zingizga tegishli** domen bo'yicha (yoki `example.com` kabi ochiq namunalar bilan):

1. `whois` va `dig` bilan domeningizning registratori, name server'lari, MX va TXT yozuvlarini yozing. TXT yozuvlaridan qaysi xizmatlar ulangani ko'rinadi?
2. crt.sh'da domeningiz bo'yicha qidiring. Siz unutgan subdomen chiqdimi?
3. `site:` va `filetype:` operatorlari bilan o'z saytingizdagi indekslangan hujjatlarni toping. `exiftool` bilan bittasining metama'lumotini ko'ring.
4. TryHackMe'dagi "Passive Reconnaissance" xonasini o'ting.
5. Savol: OSINT davomida qamrovda yo'q `staging` subdomeni topildi va unda eski login sahifasi bor. Nima qilasiz?

**Javoblar:**
1. Odatda TXT'da SPF (`v=spf1 include:...`) — pochta xizmati, va domen tasdiqlash qatorlari (Google, Microsoft va boshqalar).
2. Ko'pincha eski test yoki vaqtinchalik xizmatlar uchun olingan sertifikatlar topiladi — ular hali ham ishlayotganini tekshiring va keraksizlarini o'chiring.
3. Metama'lumotda muallif ismi va yaratgan dastur bo'lishi mumkin. Shaxsiy ma'lumot bo'lsa — chop etishdan oldin tozalash odatini qo'shing.
4. Xona whois, nslookup/dig va DNSDumpster kabi vositalar bilan amaliyot beradi.
5. Unga tegmaysiz. Aktivlar ro'yxatiga "qamrovda emas" belgisi bilan yozasiz va mijozga yozma xabar berasiz: subdomen kimga tegishli, qamrovga qo'shiladimi. Mijoz bilmagan bo'lsa — bu hisobotdagi qimmatli kuzatuv (unutilgan aktiv).
:::

## Xulosa

- Passiv razvedka nishonga tegmaydi va jurnallarda ko'rinmaydi, lekin loyiha doirasida o'tkaziladi.
- DNS (A, MX, TXT, CNAME) infratuzilma va ulangan xizmatlarni ochadi; zone transfer — faol tekshiruv, faqat qamrovda.
- Certificate Transparency jurnallari subdomenlarni ochiq qiladi — ko'pincha unutilgan muhitlar topiladi.
- Dorking, hujjat metama'lumoti, Wayback Machine — yo'llar, texnologiyalar, ichki nomlar.
- Shodan va Censys — passiv ko'rinadigan ochiq portlar va bannerlar; natija tasdiqlanadi.
- Repozitoriylardagi sirlar — darhol xabar, ishlatilmaydi. Sizib chiqqan bazalar — taqiqlangan.
- Odamlar haqida — faqat tashkilot hujum yuzasi uchun kerakli darajada.
- Mijoz uchun xulosa: hujum yuzasini o'zi muntazam boshqarishi kerak.

:::quiz
? Passiv razvedkaning faol razvedkadan asosiy farqi nima?
+ Passiv razvedkada nishonga paket yuborilmaydi — ma'lumot uchinchi tomon manbalaridan olinadi
- Passiv razvedka noqonuniy
- Faol razvedka nishon jurnallarida ko'rinmaydi
- Farqi yo'q
! Passiv usullar nishon jurnallarida iz qoldirmaydi; faol skanerlash esa qamrov va RoE talab qiladi.

? Certificate Transparency jurnallari nega subdomen topishda foydali?
- Ular parollarni saqlaydi
+ Har bir ommaviy TLS sertifikati ochiq jurnalga yoziladi va unda domen nomlari bor
- Ular faqat ichki tarmoqni ko'rsatadi
- Ular DNS'ni o'chiradi
! crt.sh kabi xizmatlar orqali kompaniya sertifikat olgan barcha nomlarni ko'rish mumkin.

? DNS TXT yozuvlaridan tester nimani bilib olishi mumkin?
- Foydalanuvchilar parollarini
+ Pochta yuborishga ruxsat etilgan xizmatlar (SPF) va ulangan SaaS'lar (domen tasdiqlash yozuvlari)
- Server diskidagi fayllarni
- Faqat IP manzilni
! TXT yozuvlari kompaniya ishlatadigan tashqi xizmatlar xaritasini beradi.

? OSINT davomida qamrovda ko'rsatilmagan subdomen topildi. To'g'ri harakat?
- Darhol skanerlash
+ Ro'yxatga "qamrovda emas" deb yozish va mijozga yozma xabar berish
- Uni e'tiborsiz qoldirish
- Uni qamrovga o'zi qo'shish
! Topilgan aktiv avtomatik qamrovga kirmaydi; mijoz bilmagan aktiv — qimmatli kuzatuv.

? `site:qaydnoma.example.com filetype:pdf` qidiruvi nima beradi?
- Saytni buzadi
+ Qidiruv tizimi indekslagan, shu domendagi PDF hujjatlarni
- Sayt parollarini
- Serverning ochiq portlarini
! Hujjatlar va ularning metama'lumotlari ichki nomlar va foydalanuvchilar haqida ma'lumot berishi mumkin.

? Shodan natijalari haqida qaysi gap to'g'ri?
- Ular har doim real vaqtda yangilanadi
+ Ular Shodan'ning oldingi skanlariga asoslangan va eskirgan bo'lishi mumkin — faol bosqichda tasdiqlanadi
- Ulardan foydalanish har doim taqiqlangan
- Ular faqat ichki tarmoqni ko'rsatadi
! Passiv ko'rinish foydali, lekin tasdiq talab qiladi.

? Tester xodimning shaxsiy GitHub repozitoriysida mijozning API kalitini topdi. Nima qiladi?
- Kalit bilan tizimga kirib, nima ochilishini tekshiradi
+ Kritik topilma sifatida darhol mijozga xabar beradi; kalitni ishlatmaydi
- Kalitni hisobot oxirida eslatadi
- Xodimga to'g'ridan-to'g'ri yozadi
! Sir topilishi — darhol xabar; mijoz kalitni o'chiradi.

? Sizib chiqqan parollar bazalarini pentestda ishlatish haqida qaysi gap to'g'ri?
- Ochiq bo'lgani uchun ruxsat etilgan
+ O'g'irlangan bazalarni yuklab olish va ishlatish noqonuniy va noaxloqiy; mijoz o'z domeni uchun qonuniy xabarnoma xizmatlaridan foydalanadi
- Faqat black box'da ruxsat
- Faqat tunda ruxsat
! Qonuniy muqobil — domen egasining o'zi foydalanadigan xabarnoma xizmatlari.

? Qaysi himoya chorasi unutilgan subdomenlar muammosiga qarshi ishlaydi?
- Saytga CAPTCHA qo'yish
+ Domen va sertifikatlar inventari, yangi sertifikatlar uchun CT monitoring va DNS yozuvlarini muntazam tozalash
- Parolni uzaytirish
- Antivirus o'rnatish
! Mijoz o'z hujum yuzasini tester kabi tashqaridan muntazam ko'rishi kerak.

? Hujjatlardagi metama'lumot qanday xavf tug'diradi?
+ Muallif ismlari, dastur versiyalari va ichki server yo'llari hujumchiga foydalanuvchi nomlari va infratuzilma haqida ma'lumot beradi
- Hech qanday xavf yo'q
- U saytni sekinlashtiradi
- U faqat rasmlarda bo'ladi
! Chop etishdan oldin metama'lumotni tozalash oddiy va samarali chora.
:::

:::cards
OSINT :: Ochiq manbalardan razvedka
Passiv razvedka :: Nishonga paket yubormasdan ma'lumot yig'ish
whois :: Domen ro'yxatga olish ma'lumotlari: registrator, sanalar, name server'lar
DNS TXT / SPF :: Ulangan xizmatlar va pochta yuboruvchilar ro'yxati
Zone transfer (AXFR) :: Noto'g'ri sozlanganda butun DNS zonasini beradigan so'rov — faol tekshiruv
Certificate Transparency :: Ommaviy TLS sertifikatlari jurnali — subdomenlar manbasi
Google dorking :: site:, filetype:, inurl:, intitle: operatorlari bilan qidiruv
Wayback Machine :: Saytning eski versiyalari arxivi — eski yo'llar va fayllar
Shodan / Censys :: Internetni skanerlab, ochiq xizmatlar bazasini yurituvchi qidiruvchilar
Attack surface management :: Tashkilotning o'z hujum yuzasini tashqaridan muntazam ko'rishi
Sizib chiqqan bazalar :: Pentestda ishlatish taqiqlangan
:::
