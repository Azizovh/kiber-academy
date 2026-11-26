Qaydnoma kodiga qarang: siz yozgan qatorlar — bir necha yuz. Endi `pip list` ni ishga tushiring: Flask, Werkzeug, Jinja2, itsdangerous, click, MarkupSafe, argon2-cffi, cryptography, pydantic, requests, urllib3, certifi... va ularning har birining o'z bog'liqliklari. Ilovangizdagi kodning **katta qismini siz yozmagansiz** — uni yuzlab notanish odamlar yozgan.

Agar ulardan birida zaiflik bo'lsa — u sizning ilovangizda ham bor. Agar ulardan biri **buzilgan** bo'lsa (hujumchi paketga zararli kod qo'shgan bo'lsa) — siz uni o'z qo'lingiz bilan o'rnatasiz va ishga tushirasiz.

Bu — **dasturiy ta'minot ta'minot zanjiri** (software supply chain) xavfsizligi. OWASP Top 10:2025 da u uchinchi o'rindagi alohida toifa — **Software Supply Chain Failures** (2021-yilgi "Vulnerable and Outdated Components" ning kengaytirilgani: endi faqat ma'lum zaifliklar emas, balki paketlar, yig'ish tizimi va tarqatish ham). Xavfsizlik bosqichidagi "supply chain" hujumlari haqidagi tushuncha va b3 bosqichidagi malware tahlili bilan bog'liq soha — endi dasturchi nuqtai nazaridan.

## Ikki xil xavf

| Xavf | Nima | Misol | Himoya |
|---|---|---|---|
| **Ma'lum zaifliklar** | Kutubxonada **tasodifiy** xato, CVE bilan e'lon qilingan | Freymvorkning eski versiyasida XSS yoki deserializatsiya zaifligi | **SCA** — skanerlash va yangilash |
| **Zararli paketlar** | Paket **ataylab** buzilgan yoki soxta | Mashhur kutubxonaga o'xshash nomli soxta paket; buzilgan muallif hisobi orqali chiqarilgan zararli versiya | Manba nazorati, versiyalarni qotirish, xeshlar, tekshiruv |

Birinchisi — e'tiborsizlik natijasi; ikkinchisi — hujum. Ikkalasiga qarshi ham himoya kerak.

## SCA — ma'lum zaifliklarni topish

[[sca|SCA]] (Software Composition Analysis) loyihangiz bog'liqliklarini (to'g'ridan-to'g'ri va **tranzitiv** — bog'liqliklarning bog'liqliklari) zaifliklar bazasi bilan solishtiradi.

```
 Sizning kodingiz
   └── flask 3.x               ← to'g'ridan-to'g'ri bog'liqlik (requirements.txt'da)
         ├── werkzeug          ← tranzitiv (siz yozmagansiz, lekin u bor)
         ├── jinja2
         │     └── markupsafe  ← tranzitivning tranzitivi
         ├── itsdangerous
         └── click
```

Tranzitiv bog'liqliklar ko'pincha unutiladi — "biz faqat Flask o'rnatdik". SCA ularni ham ko'radi.

### Python uchun: pip-audit

```bash
pip install pip-audit

# Joriy muhitni tekshirish
pip-audit

# requirements faylini tekshirish
pip-audit -r requirements.txt

# Avtomatik tuzatishga harakat (zaif versiyalarni xavfsiz versiyaga yangilash)
pip-audit -r requirements.txt --fix
```

Natija taxminan shunday ko'rinadi:

```
Name      Version  ID                   Fix Versions
--------- -------- -------------------- ------------
somelib   1.2.3    PYSEC-20XX-NNN       1.2.5
```

Har bir qatorda: paket, o'rnatilgan versiya, zaiflik identifikatori (CVE, GHSA, PYSEC) va **qaysi versiyada tuzatilgan**.

### Boshqa vositalar

| Vosita | Til / qamrov | Izoh |
|---|---|---|
| **pip-audit** | Python | PyPA'ning rasmiy vositasi, OSV bazasi |
| **npm audit** / `yarn audit` | JavaScript | Paket menejerining o'zida |
| **OSV-Scanner** | Ko'p tilli | Google; ochiq OSV bazasi asosida |
| **Trivy** | Ko'p tilli + konteynerlar + IaC | a4 bosqichida konteynerlar uchun ham ishlatamiz |
| **OWASP Dependency-Check** | Java, .NET va boshqalar | Klassik ochiq vosita |
| **Dependabot** (GitHub), **Renovate** | Ko'p tilli | Zaif versiyalar uchun **avtomatik PR** ochadi |

GitHub'da **Dependabot alerts** va **security updates** ni yoqish — eng oson qadam: omboringizdagi bog'liqliklarda zaiflik e'lon qilinsa, GitHub sizga xabar beradi va yangilash PR'ini o'zi tayyorlaydi.

## Ustuvorlik: hamma CVE bir xil emas

SCA ko'pincha o'nlab natija beradi. Hammasini birdan tuzatish imkonsiz. Ustuvorlik uchun savollar:

| Savol | Nega muhim |
|---|---|
| **Zaif funksiya haqiqatan ishlatiladimi?** (reachability) | Kutubxonaning XML parserida zaiflik bor, lekin siz faqat JSON qismini ishlatasiz — xavf ancha past |
| **CVSS bahosi** | Texnik jiddiylik (xavfsizlik bosqichidagi CVE/CVSS darsi) |
| **EPSS** — ekspluatatsiya ehtimoli | FIRST'ning modeli: yaqin kunlarda bu zaiflikdan foydalanilish ehtimoli |
| **CISA KEV** ro'yxatida bormi? | "Haqiqatan ekspluatatsiya qilinayotgan zaifliklar" katalogi — bor bo'lsa, eng yuqori ustuvorlik |
| **Ilova internetga ochiqmi?** | Ichki vositadagi zaiflik va ommaviy API'dagi zaiflik — har xil xavf |
| **Tuzatish mavjudmi va qanchalik oson?** | Patch versiyaga yangilash — tez; katta versiyaga o'tish — reja kerak |

b2 bosqichidagi tahdid razvedkasi darsini eslang: "hamma CVE bir xil emas" — kontekst hal qiladi. Ustuvorlik va muddatlar (SLA) haqida a4 bosqichidagi zaifliklarni boshqarish darsida batafsil.

## Zararli paketlar va ta'minot zanjiri hujumlari

| Hujum | Qanday ishlaydi | Himoya |
|---|---|---|
| **Typosquatting** | Mashhur paketga o'xshash nom (bitta harf farqi) bilan zararli paket — dasturchi nomni xato yozadi | Nomni diqqat bilan tekshirish; lock fayl; ichki allowlist |
| **Dependency confusion** | Kompaniyaning ichki paketi nomi bilan ommaviy registryga yuqoriroq versiyali zararli paket joylanadi — noto'g'ri sozlangan paket menejeri ommaviysini oladi | Ichki paketlar uchun alohida nomlar maydoni; paket menejerini faqat ichki registry'dan olishga sozlash |
| **Buzilgan muallif hisobi** | Hujumchi paket muallifining hisobini egallab, zararli versiya chiqaradi | Versiyalarni qotirish, xeshlar, yangilanishlarni darhol emas, ko'rib chiqib qabul qilish |
| **Buzilgan build tizimi** | Paket manba kodi toza, lekin build jarayonida zararli kod qo'shiladi | Kelib chiqishni tasdiqlash (provenance), imzolar — pastda |
| **O'rnatish skriptlari** | Paket o'rnatilayotganda o'z skriptini bajaradi | Ishonchsiz paketlarni izolyatsiyalangan muhitda; ba'zi menejerlarda skriptlarni o'chirish |

Karyera bo'limidagi ish qidirish darsidagi "soxta test topshiriq" ogohlantirishini eslang — ko'p hollarda u ham shu mexanizm: notanish loyihaning bog'liqliklari orasida zararli paket.

### Himoya amaliyotlari

**1. Versiyalarni qotirish va lock fayllar.** Har bir o'rnatishda aynan bir xil versiyalar o'rnatilsin:

```bash
# pip-tools bilan: requirements.in (to'g'ridan-to'g'ri) → requirements.txt (hammasi, aniq versiyalar va xeshlar)
pip install pip-tools
pip-compile --generate-hashes requirements.in

# O'rnatishda xeshlarni majburiy tekshirish — paket o'zgartirilgan bo'lsa, o'rnatish to'xtaydi
pip install --require-hashes -r requirements.txt
```

`requirements.txt` ichida har bir paket xeshlari bilan yoziladi. Agar registry'dagi fayl kimdir tomonidan almashtirilsa — xesh mos kelmaydi va o'rnatish rad etiladi. Xavfsizlik bosqichidagi xesh darsining amaliy qo'llanishi.

JavaScript'da xuddi shu vazifani `package-lock.json` va `npm ci` bajaradi.

**2. Yangilash — muntazam, lekin ko'rib chiqib.** Ikki xavf orasida muvozanat: juda eski versiyalar — ma'lum zaifliklar; har bir yangi versiyani darhol olish — buzilgan relizni birinchi bo'lib olish. Amaliyot: Dependabot/Renovate PR'lari → CI testlari → ko'rib chiqish → birlashtirish.

**3. Yangi bog'liqlik qo'shishdan oldin** (kod ko'rib chiqish darsidagi PR savollaridan biri):

| Savol | Qayerdan bilish |
|---|---|
| Paket kerakmi? Standart kutubxona yoki mavjud bog'liqlik yetarli emasmi? | Har bir bog'liqlik — hujum yuzasi |
| Faol qo'llab-quvvatlanadimi? Oxirgi reliz qachon? | Ombor, registry sahifasi |
| Nechta qo'llab-quvvatlovchi, qancha foydalanuvchi? | Ombor statistikasi |
| Xavfsizlik amaliyotlari qanday? | **OpenSSF Scorecard** — loyihaning xavfsizlik amaliyotlarini avtomatik baholaydi |
| Nom to'g'rimi? | Typosquatting'ga qarshi |

**4. Ichki registry yoki proxy** — yirik kompaniyalarda paketlar ommaviy registry'dan to'g'ridan-to'g'ri emas, tekshiriladigan ichki ombor orqali olinadi.

## SBOM — tarkib ro'yxati

Yangi kritik zaiflik e'lon qilindi: "falon kutubxonaning X versiyasida". Rahbar so'raydi: "Bizning qaysi ilovalarimizda bu kutubxona bor?" Javob berish uchun har bir ilovaning **tarkibini** bilish kerak.

[[sbom|SBOM]] (Software Bill of Materials) — dasturiy ta'minot tarkibidagi barcha komponentlar, ularning versiyalari va bog'liqliklarining mashina o'qiy oladigan ro'yxati. Oziq-ovqat mahsulotidagi "tarkibi" yorlig'iga o'xshaydi.

| Format | Izoh |
|---|---|
| **CycloneDX** | OWASP standarti; xavfsizlik vositalari bilan keng integratsiya |
| **SPDX** | Linux Foundation standarti; litsenziyalar uchun ham keng ishlatiladi |

```bash
# Syft bilan — papka yoki konteyner image'idan SBOM yaratish
syft dir:. -o cyclonedx-json > sbom.json

# Keyin SBOM'ni zaifliklarga skanerlash (masalan, Grype yoki Trivy bilan)
grype sbom:./sbom.json
```

SBOM nima beradi:
- **Tez javob**: yangi zaiflik e'lon qilinganda — barcha SBOM'larda qidiruv, daqiqalar ichida.
- **Shaffoflik**: mijozlar va regulyatorlar tobora ko'proq SBOM talab qilmoqda.
- **Litsenziyalar**: qaysi ochiq kod litsenziyalari ishlatilayotganini bilish (huquqiy masala).

SBOM odatda har bir relizda CI'da avtomatik yaratiladi va reliz bilan birga saqlanadi (a4 bosqichi).

## Kelib chiqish va imzolar

Ta'minot zanjirining eng yangi va rivojlanayotgan qismi — "bu paket haqiqatan aytilgan manba koddan, aytilgan tizimda qurilganmi?" degan savolga javob:

| Tushuncha | Nima |
|---|---|
| **SLSA** | Build jarayonining yaxlitligi uchun darajalar ramkasi ("Supply-chain Levels for Software Artifacts") |
| **Provenance** (kelib chiqish) | Artefakt qaysi manba koddan, qaysi build tizimida, qanday qurilgani haqidagi imzolangan ma'lumot |
| **Sigstore** | Artefaktlarni imzolash va tekshirish uchun ochiq infratuzilma (masalan, konteyner image'larini `cosign` bilan imzolash) |

Bu sohani boshlang'ich AppSec muhandisi uchun tushunchalar darajasida bilish yetarli; a4 bosqichida CI/CD va konteynerlar bilan birga yana uchrashamiz.

:::key
**Siz ilovangizdagi kodning faqat kichik qismini yozgansiz — lekin hammasiga javobgarsiz.** Ta'minot zanjiri xavfsizligi uch qatlamdan iborat: **bilish** (SBOM — nima bor), **kuzatish** (SCA — nimada ma'lum zaiflik bor, ustuvorlik bilan) va **nazorat qilish** (qotirilgan versiyalar va xeshlar, yangi bog'liqliklarni ko'rib chiqish, ishonchli manbalar). Eng oddiy birinchi qadamlar: Dependabot'ni yoqish, `pip-audit` ni CI'ga qo'shish va lock faylni xeshlar bilan yaratish — bir soatlik ish, doimiy himoya.
:::

## Bu dars nimani bermaydi

- **Har bir paket menejerining barcha sozlamalarini** — rasmiy hujjatlar.
- **Litsenziyalar bo'yicha huquqiy maslahatni** — huquqshunos bilan.
- **SLSA va imzolashni amalda batafsil** — a4 bosqichi va rasmiy hujjatlar.

:::try
**1. Bog'liqliklar daraxti.** Qaydnoma muhitida `pip install pipdeptree && pipdeptree` ni ishga tushiring. Nechta to'g'ridan-to'g'ri va nechta tranzitiv bog'liqlik bor?

**2. pip-audit.** `pip-audit` ni ishga tushiring. Zaifliklar topildimi? Topilmasa — vaqtincha bitta kutubxonaning eski versiyasini o'rnatib (masalan, `pip install "requests==2.19.0"` — **faqat virtual muhitda**), qayta tekshiring va natijani o'qing. Keyin qaytaring.

**3. Lock fayl.** `requirements.in` yarating (faqat to'g'ridan-to'g'ri bog'liqliklar), `pip-compile --generate-hashes` bilan `requirements.txt` yarating va yangi virtual muhitda `pip install --require-hashes -r requirements.txt` bilan o'rnating.

**4. Dependabot.** GitHub'dagi Qaydnoma omborida Dependabot alerts va security updates'ni yoqing; `.github/dependabot.yml` bilan haftalik pip yangilanishlarini sozlang.

**5. SBOM.** Syft (yoki Trivy) bilan Qaydnoma uchun CycloneDX formatida SBOM yarating. Uni ochib ko'ring: qaysi ma'lumotlar bor?

**6. OpenSSF Scorecard.** securityscorecards.dev saytida Qaydnoma ishlatadigan uchta kutubxonaning bahosini ko'ring. Qaysi mezonlar bo'yicha yaxshi va yomon?

*Javob (2): eski versiyalarda odatda bir nechta ma'lum zaiflik ko'rsatiladi, har biri ID va tuzatilgan versiya bilan; `pip-audit --fix` ularni xavfsiz versiyaga ko'tarishga harakat qiladi.*
:::

## Xulosa

- Ilovangizdagi kodning katta qismi — **bog'liqliklar**, shu jumladan **tranzitiv**.
- Ikki xavf: **ma'lum zaifliklar** (SCA bilan topiladi) va **zararli paketlar** (typosquatting, dependency confusion, buzilgan hisoblar va build'lar).
- **SCA vositalari**: pip-audit, npm audit, OSV-Scanner, Trivy, Dependency-Check; **Dependabot/Renovate** — avtomatik yangilash PR'lari.
- Ustuvorlik: **reachability**, CVSS, **EPSS**, **CISA KEV**, internetga ochiqlik, tuzatish mavjudligi.
- Himoya: **versiyalarni qotirish va xeshlar** (`pip-compile --generate-hashes`, `--require-hashes`), muntazam lekin ko'rib chiqilgan yangilash, yangi bog'liqlikdan oldin tekshiruv (**OpenSSF Scorecard**), ichki registry.
- **SBOM** (CycloneDX, SPDX) — tarkib ro'yxati: yangi zaiflikka tez javob, shaffoflik, litsenziyalar.
- Kelib chiqish: **SLSA, provenance, Sigstore**.

:::quiz
? Tranzitiv bog'liqlik nima?
+ Siz to'g'ridan-to'g'ri o'rnatmagan, lekin sizning bog'liqliklaringiz ishlatadigan paket
- Faqat test uchun paket
- O'chirilgan paket
- Faqat JavaScript paketi
! SCA tranzitiv bog'liqliklarni ham tekshiradi.

? SCA nima qiladi?
+ Loyiha bog'liqliklarini ma'lum zaifliklar bazasi bilan solishtiradi
- Manba kodni xatolarga tahlil qiladi
- Ishlab turgan ilovani skanerlaydi
- Parollarni tekshiradi
! Masalan, pip-audit yoki npm audit.

? Typosquatting hujumi qanday ishlaydi?
+ Mashhur paketga o'xshash nomli zararli paket joylanadi va dasturchi nomni xato yozganda uni o'rnatadi
- Parolni bir harf o'zgartirib terish
- Domenni o'g'irlash
- Serverni qayta yuklash
! Nomni diqqat bilan tekshirish va lock fayllar himoya qiladi.

? pip install --require-hashes nima uchun foydali?
+ Registry'dagi paket fayli o'zgartirilgan bo'lsa, xesh mos kelmaydi va o'rnatish rad etiladi
- O'rnatishni tezlashtiradi
- Paketlarni avtomatik yangilaydi
- Faqat chiroyli chiqish beradi
! Xesh — yaxlitlik isboti.

? SCA o'nlab zaiflik topdi. Qaysi omillar ustuvorlikni belgilashga yordam beradi?
+ Zaif funksiya haqiqatan ishlatiladimi (reachability) va zaiflik CISA KEV ro'yxatidami
+ EPSS (ekspluatatsiya ehtimoli) va ilova internetga ochiqmi
- Paket nomining uzunligi
- Paketning rangli logotipi
! Hamma CVE bir xil emas — kontekst hal qiladi.

? Dependency confusion hujumi qanday ishlaydi?
+ Ichki paket nomi bilan ommaviy registry'ga yuqoriroq versiyali zararli paket joylanadi va noto'g'ri sozlangan menejer uni oladi
- Ikki paket bir-biri bilan nizolashadi
- Paket juda katta bo'ladi
- Bog'liqliklar daraxti chalkashadi
! Himoya — ichki nomlar maydoni va faqat ichki registry'dan olish.

? SBOM nima?
+ Dasturiy ta'minot tarkibidagi barcha komponentlar va versiyalarning mashina o'qiy oladigan ro'yxati
- Zaiflik skaneri
- Antivirus
- Kod formatlovchi
! Yangi zaiflik e'lon qilinganda “qaysi ilovalarimizda bor?” savoliga tez javob beradi.

? Bog'liqliklarni yangilash haqida qaysi yondashuv to'g'ri?
+ Muntazam yangilash, lekin avtomatik PR → CI testlari → ko'rib chiqish orqali
- Hech qachon yangilamaslik
- Har bir yangi versiyani darhol, tekshirmasdan olish
- Faqat yilda bir marta
! Eski versiyalar — ma'lum zaifliklar; ko'r-ko'rona yangilash — buzilgan relizni olish xavfi.

? Yangi bog'liqlik qo'shishdan oldin qaysi savol eng muhim?
+ Bu paket haqiqatan kerakmi va u faol qo'llab-quvvatlanadigan, ishonchli loyihami?
- Paket nomi chiroylimi?
- Paket qancha yulduzchaga ega — boshqa hech narsa muhim emas
- Paket eng yangisimi?
! Har bir bog'liqlik — qo'shimcha hujum yuzasi.

? Ta'minot zanjiri xavfsizligining uch qatlami qaysi?
+ Bilish (SBOM), kuzatish (SCA) va nazorat qilish (qotirish, xeshlar, ko'rib chiqish)
- Faqat antivirus
- Faqat firewall
- Faqat parollar
! Eng oddiy birinchi qadamlar: Dependabot, CI'da pip-audit, xeshli lock fayl.
:::

:::cards
Ta'minot zanjiri xavflari? :: Ma'lum zaifliklar (tasodifiy xato, CVE) va zararli paketlar (ataylab buzilgan).
Tranzitiv bog'liqlik? :: Bog'liqliklaringizning bog'liqliklari — siz o'rnatmagansiz, lekin ilovangizda bor.
SCA vositalari? :: pip-audit, npm audit, OSV-Scanner, Trivy, OWASP Dependency-Check; Dependabot/Renovate — avtomatik PR.
CVE ustuvorligi omillari? :: Reachability, CVSS, EPSS, CISA KEV, internetga ochiqlik, tuzatish mavjudligi.
Typosquatting? :: Mashhur nomga o'xshash zararli paket — nomni tekshirish, lock fayl.
Dependency confusion? :: Ichki paket nomi bilan ommaviy registry'da zararli paket — ichki nomlar maydoni, faqat ichki registry.
Versiyalarni qotirish va xeshlar? :: pip-compile --generate-hashes va pip install --require-hashes; JS'da package-lock.json va npm ci.
Yangi bog'liqlikdan oldin? :: Kerakmi? Faol qo'llab-quvvatlanadimi? Qo'llab-quvvatlovchilar? OpenSSF Scorecard? Nom to'g'rimi?
SBOM? :: Software Bill of Materials — komponentlar va versiyalar ro'yxati; formatlar CycloneDX, SPDX.
SBOM nima beradi? :: Yangi zaiflikka tez javob, shaffoflik, litsenziyalarni bilish.
SLSA, provenance, Sigstore? :: Build yaxlitligi darajalari; artefakt kelib chiqishi haqidagi imzolangan ma'lumot; ochiq imzolash infratuzilmasi.
Birinchi oddiy qadamlar? :: Dependabot'ni yoqish, CI'ga pip-audit, xeshli lock fayl.
:::
