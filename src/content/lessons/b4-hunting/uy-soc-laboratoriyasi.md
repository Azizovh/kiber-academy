Ikki nomzod bir xil SOC analitigi lavozimiga ariza topshirdi. Birinchisining rezyumesida: "SIEM, Splunk, Wireshark, Sysmon, MITRE ATT&CK bilaman." Ikkinchisining rezyumesida bitta havola: GitHub'dagi loyiha. Unda — o'zi qurgan SOC laboratoriyasining sxemasi, Wazuh va Sysmon sozlamalari, o'zi yozgan 8 ta aniqlash qoidasi, 5 ta simulyatsiya qilingan hujumning to'liq tahlili skrinshotlar bilan, va bitta ov hisoboti.

Intervyuga kim chaqiriladi?

Boshlang'ich darajadagi lavozimlarda ish beruvchining asosiy xavotiri: "bu odam haqiqatan **qila oladimi**, yoki faqat o'qiganmi?" Sertifikat bilimni ko'rsatadi; **portfolio esa ko'nikmani isbotlaydi**. Bu darsda b1–b4 bosqichlarida o'rganganlaringizning hammasini bitta loyihaga birlashtirasiz — va uni ish beruvchi ko'radigan shaklda hujjatlashtirasiz.

## Loyiha maqsadi

Oxirida sizda bo'ladi:

1. **Ishlaydigan laboratoriya** — SIEM, agentlar, telemetriya, tarmoq monitoringi.
2. **Aniqlash qoidalari** — o'zingiz yozgan va **sinalgan**.
3. **Hujum simulyatsiyalari va tahlillar** — kamida 5 ta, har biri to'liq hujjatlashtirilgan.
4. **Kamida bitta ov** va bitta mini IR hisoboti.
5. **GitHub ombori** — hammasi tushunarli tarzda tavsiflangan.

## 1. Arxitektura

b2 bosqichidagi Elastic va Wazuh darsida asosiy tuzilma qurilgan edi. Endi uni to'liq qilamiz:

```
 ┌─────────────────────────── Laboratoriya tarmog'i 10.10.10.0/24 (izolyatsiyalangan) ───────────────────────────┐
 │                                                                                                               │
 │  ┌─────────────────┐   ┌─────────────────┐   ┌──────────────────┐   ┌───────────────────────────────────────┐ │
 │  │ WIN-01          │   │ LNX-01          │   │ SENSOR           │   │ SIEM                                  │ │
 │  │ Windows 10/11   │   │ Ubuntu Server   │   │ Suricata + Zeek  │   │ Wazuh (yoki Splunk / Elastic)         │ │
 │  │ Sysmon          │   │ auditd          │   │ (SPAN yoki shu   │   │ + qoidalar, dashboard                 │ │
 │  │ Wazuh agent     │   │ Wazuh agent     │   │  tarmoqdagi      │   │ + (ixtiyoriy) Shuffle / TheHive       │ │
 │  │ Atomic Red Team │   │ SSH, veb-server │   │  trafik)         │   │                                       │ │
 │  └─────────────────┘   └─────────────────┘   └──────────────────┘   └───────────────────────────────────────┘ │
 │                                                                                                               │
 │  ┌─────────────────┐                                                                                          │
 │  │ ATTACK (ixtiyoriy) — hujum simulyatsiyalari uchun alohida VM (masalan, Kali)                               │
 │  └─────────────────┘                                                                                          │
 └───────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

| Komponent | Nima beradi | Qaysi dars |
|---|---|---|
| Windows + **Sysmon** | Jarayon, tarmoq, registr, DNS telemetriyasi | b1 — Sysmon |
| Windows **audit sozlamalari** | 4688 buyruq satri bilan, 4698, PowerShell 4104 | b1 — Windows Event loglari |
| Linux + **auditd** | `/etc/passwd`, `sudoers` o'zgarishlari, SSH | b1 — Linux loglari |
| **Suricata** + **Zeek** | Tarmoq ogohlantirishlari va tarmoq loglari | b1 — tarmoq; b2 — IDS/IPS |
| **SIEM** | Yig'ish, qidirish, qoidalar, dashboard | b2 — SIEM, Splunk, Wazuh |
| **Atomic Red Team** | Texnikalarni xavfsiz simulyatsiya qilish | b4 — purple team |
| SOAR (ixtiyoriy) | Avtomatik boyitish va tiketlar | b4 — SOAR |

**Resurslar.** Hammasi birdan ~16 GB RAM talab qiladi. Kam bo'lsa: SENSOR va ATTACK VM'larini ixtiyoriy qiling, yoki Suricata'ni Linux VM'ga o'rnating; bir vaqtda faqat kerakli VM'larni yoqing. Bulutdagi bepul darajalar ham variant — lekin xarajat ogohlantirishini yoqing (bulut loglari darsi).

**Xavfsizlik.** Laboratoriya tarmog'i uy tarmog'idan ajratilgan (host-only yoki ichki tarmoq); zaif sozlangan xizmatlar internetga **hech qachon** ochilmaydi; har bir VM uchun toza snapshot.

## 2. Qurish tartibi

Har bir qadamni qilgan zahoti hujjatlashtiring — keyin eslash qiyin.

```
 Hafta 1:  SIEM (Wazuh all-in-one) + Windows VM (Sysmon, agent) → birinchi hodisalar SIEM'da
 Hafta 2:  Linux VM (auditd, agent, SSH) + audit sozlamalari → har bir log manbasi tekshirilgan
 Hafta 3:  Suricata/Zeek → tarmoq ogohlantirishlari SIEM'da
 Hafta 4:  Atomic Red Team → birinchi purple team mashqi → birinchi o'z qoidalaringiz
 Hafta 5+: Stsenariylar, ov, IR hisoboti, GitHub'ni tartibga solish
```

Har bir manba ulangandan keyin **tekshiring**: SIEM'da shu manbadan oxirgi hodisa qachon keldi? Maydonlar to'g'ri parse qilinyaptimi? b2 bosqichidagi "jim qolgan manbalar" va "buzilgan parser" ogohlantirishlari laboratoriyada ham amal qiladi.

## 3. Stsenariylar: kamida 5 ta hujum

Har bir stsenariy — **bitta to'liq hikoya**: hujum → telemetriya → aniqlash → tahlil → xulosa. Tavsiya etilgan to'plam (barchasi b1–b4 bosqichlarida o'rganilgan):

| # | Stsenariy | Qanday simulyatsiya qilinadi | Kutiladigan aniqlash |
|---|---|---|---|
| 1 | **SSH brute force + muvaffaqiyatli kirish** | ATTACK VM'dan LNX-01 ga o'zingiz yaratgan test hisobiga ko'p noto'g'ri parol, keyin to'g'risi | auth.log, Wazuh chegara qoidasi, Suricata threshold qoidasi |
| 2 | **Yangi lokal administrator** | Atomic T1136.001 + hisobni Administrators guruhiga qo'shish | 4720, 4732; Sigma/Wazuh qoidasi |
| 3 | **Persistence: Run kaliti va vazifa** | Atomic T1547.001, T1053.005 | Sysmon 13, 4698; o'z qoidalaringiz |
| 4 | **Shubhali PowerShell** | Atomic T1059.001 (zararsiz sinovlar) | Sysmon 1, 4104; kodlangan buyruq qoidasi |
| 5 | **Jurnal tozalash** | Atomic T1070.001 (laboratoriyada!) | 1102 — "critical" ogohlantirish |
| 6 | **Shubhali DNS / C2 taqlidi** | O'zingiz belgilagan test domenini so'rash (masalan, hosts fayli yoki ichki DNS orqali) + muntazam `curl` | Suricata DNS qoidasi, Zeek dns.log, beaconing `timechart` |
| 7 | **Linux persistence** | Test cron vazifasi, test `authorized_keys` yozuvi (o'z hisobingizda) | auditd, Wazuh FIM |

1-stsenariydagi parol urinishlari **faqat o'z laboratoriyangizdagi, o'zingiz yaratgan test hisobiga** va oddiy qo'lda yoki kichik skript bilan — maqsad parol buzish emas, **loglar va aniqlash qoidasini** sinash.

### Stsenariy hujjati shabloni

```markdown
# Stsenariy 3: Run kaliti orqali persistence (T1547.001)

## Maqsad
Run kaliti orqali persistence aniqlanishini sinash.

## Simulyatsiya
- Sana/vaqt (UTC): 2026-11-22 10:15
- Vosita: Invoke-AtomicTest T1547.001 -TestNumbers 1 (tafsilotlar: ...)
- Xost: WIN-01

## Telemetriya
- Sysmon EID 13: TargetObject = HKCU\...\CurrentVersion\Run\..., Details = ...
- (skrinshot: SIEM'dagi hodisa)

## Aniqlash
- Dastlab: HECH NARSA — Sysmon konfiguratsiyasida Run kalitlari chiqarib tashlangan edi
- Tuzatish: sysmonconfig.xml, 47-qator (diff)
- Qoida: detections/sigma/run_key_user_path.yml
- Qayta sinov: ogohlantirish 38 soniyada (skrinshot)

## ATT&CK
T1547.001 — Persistence

## Xulosa va saboq
Sysmon konfiguratsiyasidagi keng istisno ko'r nuqta yaratgan edi.
Sinovsiz bu topilmasdi.
```

Oxirgi bo'lim — eng qimmatlisi. Ish beruvchi "nima qildingiz?" emas, "**nimani o'rgandingiz?**" degan savolga javob qidiradi.

## 4. Ov va IR hisoboti

Kamida bitta **ov** (threat hunting darsidagi shablon bo'yicha) — masalan, laboratoriyangizdagi barcha Run kalitlarini stacking qilish yoki barcha `schtasks /create` buyruqlarini tahlil qilish.

Va bitta **mini IR hisoboti** (b3 bosqichidagi IR hisoboti darsi tuzilishida): bir nechta stsenariyni bitta "insident"ga birlashtiring — masalan, SSH brute force → kirish → yangi hisob → cron persistence — va uni asosiy xulosa, vaqt chizig'i, texnik tahlil, ildiz sabab va tavsiyalar bilan yozing.

## 5. GitHub omborini tashkil qilish

```
soc-home-lab/
├── README.md                    ← eng muhim fayl: loyiha haqida, sxema, natijalar
├── architecture/
│   └── diagram.png
├── configs/
│   ├── sysmon/sysmonconfig.xml
│   ├── wazuh/local_rules.xml
│   ├── suricata/local.rules
│   └── auditd/soc.rules
├── detections/
│   ├── sigma/                   ← o'z Sigma qoidalaringiz
│   └── README.md                ← qoidalar ro'yxati, ATT&CK, sinov holati
├── scenarios/
│   ├── 01-ssh-bruteforce.md
│   ├── 02-local-admin.md
│   └── ...
├── hunts/
│   └── HUNT-001-scheduled-tasks.md
├── reports/
│   └── IR-001-linux-compromise.md
├── scripts/
│   └── ioc_check.py             ← SOAR darsidagi skript
└── attack-navigator/
    └── coverage-layer.json      ← sinalgan qamrov
```

### README — 2 daqiqalik taassurot

Ish beruvchi omboringizga 2 daqiqa sarflaydi. README shu vaqtda hamma narsani aytishi kerak:

```markdown
# SOC uy laboratoriyasi

Wazuh, Sysmon, auditd va Suricata asosidagi to'liq SOC laboratoriyasi:
telemetriya, o'z aniqlash qoidalarim, hujum simulyatsiyalari va tahlillar.

## Natijalar bir qarashda
- 4 VM, 5 ta log manbasi, barchasi SIEM'da tekshirilgan
- 9 ta o'z aniqlash qoidam (Sigma + Wazuh + Suricata), har biri Atomic Red Team bilan sinalgan
- 7 ta hujum stsenariysi — to'liq tahlil bilan
- 1 ta ov hisoboti, 1 ta IR hisoboti
- ATT&CK qamrovi: 14 texnika sinalgan, 11 tasi aniqlanadi

## Arxitektura
(sxema rasmi)

## Eng qiziq topilmalar
1. Sysmon konfiguratsiyasidagi istisno Run kalitlarini ko'rinmas qilgan — sinov orqali topildi
2. ...

## Stsenariylar | Qoidalar | Hisobotlar
(havolalar)

## Keyingi qadamlar
- Bulut loglari (CloudTrail) qo'shish
- Shuffle bilan avtomatik IOC boyitish
```

:::warn
**Omborni ommaga ochishdan oldin tozalang.** Laboratoriya bo'lsa ham: haqiqiy parollar, API kalitlar (SOAR darsidagi ogohlantirish), shaxsiy IP manzilingiz, uy tarmog'ingiz nomlari, ish joyingizga oid har qanday ma'lumot — olib tashlansin. `git log -p` bilan tarixni ham tekshiring: bir marta commit qilingan sir tarixda qoladi. Va **ish joyingizdagi** haqiqiy loglar, insidentlar yoki konfiguratsiyalarni hech qachon portfolioga qo'ymang — bu maxfiylik shartnomasini buzish.
:::

## Portfolioni ko'rsatish

| Joy | Nima qilish |
|---|---|
| **Rezyume** | Bitta qator: "SOC uy laboratoriyasi — Wazuh, Sysmon, Suricata; 9 ta sinalgan aniqlash qoidasi, 7 ta hujum tahlili" + havola |
| **LinkedIn** | Loyiha bo'limiga qo'shing; har bir muhim bosqichda qisqa post (masalan, "Sysmon konfiguratsiyasida ko'r nuqta topdim — qanday?") |
| **Blog yoki Medium** | Eng qiziq stsenariylar haqida batafsil maqolalar — o'zbek tilida ham (soha bo'yicha o'zbekcha kontent kam — bu sizni ajratib turadi) |
| **Intervyu** | "Menga laboratoriyangizni ko'rsating" — ekranni ulashib, bitta stsenariyni boshidan oxirigacha 5 daqiqada tushuntirib bering |

Oxirgi qatorni mashq qiling. Intervyuda eng kuchli javob — aniq misol: "Mana, men Run kalitlari uchun qoida yozdim, u ishlamadi, sababini topdim — mana Sysmon konfiguratsiyasidagi qator, mana tuzatish, mana qayta sinov." Bunday hikoyani o'ylab topib bo'lmaydi — uni faqat qilgan odam aytib bera oladi.

:::key
**Portfolio — bu sizning "ish tajribangiz" tajriba yo'q paytda.** U uch narsani isbotlaydi: siz vositalarni **ishlata olasiz** (laboratoriya ishlaydi), siz **o'ylay olasiz** (qoidalar, tahlillar, saboqlar), va siz **yoza olasiz** (hujjatlar va hisobotlar — SOC ishining katta qismi). Mukammal bo'lishini kutmang: kichik, lekin to'liq va halol hujjatlashtirilgan loyiha — chala qolgan ulkan loyihadan yaxshiroq. Boshlang, joylang, keyin kengaytiring.
:::

## Boshqa amaliy manbalar

Laboratoriyadan tashqari, portfolio uchun natijalar beradigan platformalar:

| Platforma | Nima beradi |
|---|---|
| **Blue Team Labs Online** | Tergov topshiriqlari — yechimlaringizni (qoidalar ruxsat bergan darajada) yozish mumkin |
| **CyberDefenders** | DFIR va SOC topshiriqlari |
| **LetsDefend** | SOC simulyatori: ogohlantirishlar navbati, tiketlar |
| **TryHackMe** | SOC Level 1/2 yo'llari, profilda ko'rinadigan yutuqlar |
| **Boss of the SOC** | Splunk musobaqasi ma'lumotlari (b2 bosqichi) |

Ko'p platformalar faol topshiriqlar yechimlarini ommaga joylashni taqiqlaydi — qoidalarini o'qing. Eskirgan (retired) topshiriqlar uchun writeup'lar odatda ruxsat etiladi.

## Portfolio nimani qilmaydi

- **Ish tajribasining to'liq o'rnini bosmaydi** — lekin uning yo'qligini sezilarli kompensatsiya qiladi.
- **Bir marta qilinib, tugamaydi** — yangi stsenariylar va qoidalar bilan yangilanib turishi kerak.
- **Hajm bilan baholanmaydi** — sifat, aniqlik va saboqlar muhimroq.
- **O'zi ish topib bermaydi** — uni ko'rsatish, gapirib berish va intervyuda tushuntirish kerak.

:::try
**1. Reja tuzing.** O'z kompyuteringiz resurslariga qarab laboratoriya arxitekturasini chizing: qaysi VM'lar, qancha RAM, qaysi vositalar. 5 haftalik rejani yozing.

**2. Omborni yarating.** GitHub'da `soc-home-lab` omborini yuqoridagi papkalar tuzilishi bilan yarating. README'ning dastlabki versiyasini yozing (hatto hali hech narsa qurilmagan bo'lsa ham — "Reja" bo'limi bilan).

**3. Birinchi stsenariy.** b2 bosqichida qurgan Wazuh laboratoriyangizda 1-stsenariyni (SSH brute force + muvaffaqiyatli kirish, o'z test hisobingizga) bajaring va shablon bo'yicha to'liq hujjatlashtiring — skrinshotlar bilan.

**4. Qolganlari.** Keyingi haftalarda yana kamida 4 ta stsenariy, 1 ta ov va 1 ta IR hisobotini qo'shing.

**5. Ko'rsating.** Do'stingiz yoki hamkasbingizga bitta stsenariyni 5 daqiqada tushuntirib bering. Qayerda chalkashdingiz? O'sha joyni hujjatda aniqroq yozing.
:::

## Xulosa

- **Portfolio ko'nikmani isbotlaydi**: sertifikat — bilim, laboratoriya va tahlillar — "qila olaman".
- Arxitektura: **Windows (Sysmon, audit) + Linux (auditd) + sensor (Suricata, Zeek) + SIEM (Wazuh/Splunk/Elastic) + Atomic Red Team**, izolyatsiyalangan tarmoqda.
- Bosqichma-bosqich quring va har bir manbani **tekshiring** (oxirgi hodisa, parsing).
- Kamida **5 ta stsenariy**: simulyatsiya → telemetriya → aniqlash → tahlil → **saboq**.
- Kamida bitta **ov** va bitta **IR hisoboti**.
- GitHub: tushunarli papkalar, **2 daqiqalik README** (natijalar raqamlarda), sinalgan qoidalar, Navigator qatlami.
- Ommaga ochishdan oldin **sirlarni tozalang**; ish joyidagi ma'lumotlarni hech qachon qo'ymang.
- Rezyume, LinkedIn, blog va intervyuda — **aniq hikoya** bilan ko'rsating.

:::quiz
? Boshlang'ich SOC lavozimi uchun portfolio asosan nimani isbotlaydi?
- Faqat nazariy bilimni
+ Vositalarni amalda ishlata olish, tahlil qilish va hujjatlashtirish ko'nikmasini
- Faqat ingliz tilini bilishni
- Faqat sertifikat borligini
! Ish beruvchining asosiy savoli — “bu odam haqiqatan qila oladimi?”

? Laboratoriya tarmog'i qanday bo'lishi kerak?
+ Uy tarmog'idan ajratilgan (host-only yoki ichki), zaif xizmatlar internetga ochilmagan
- To'g'ridan-to'g'ri internetga ochiq — real hujumlarni ko'rish uchun
- Ish tarmog'iga ulangan
- Tarmoqsiz — agentlar tarmoqsiz ishlaydi
! Laboratoriya ataylab zaif sozlamalarga ega bo'lishi mumkin — ular real tarmoqlarga chiqmasligi kerak.

? Har bir log manbasi ulangandan keyin nima qilish kerak?
- Hech narsa — hammasi avtomatik ishlaydi
+ SIEM'da shu manbadan hodisalar kelayotganini va maydonlar to'g'ri parse qilinayotganini tekshirish
- Manbani o'chirib qo'yish
- Faqat skrinshot olish
! Jim qolgan manba va buzilgan parser — laboratoriyada ham ko'rinmas bo'shliqlar.

? Stsenariy hujjatining eng qimmatli bo'limi qaysi?
- Sana
- Vosita nomi
+ Xulosa va saboq — nima topildi va nima o'rganildi
- Fayl hajmi
! Ish beruvchi “nimani o'rgandingiz?” degan savolga javob qidiradi.

? SSH brute force stsenariysini laboratoriyada qanday to'g'ri bajarish kerak?
+ Faqat o'z laboratoriyangizdagi, o'zingiz yaratgan test hisobiga — maqsad loglar va qoidani sinash
- Internetdagi istalgan serverga
- Ish joyidagi serverga ruxsatsiz
- Do'stingizning serveriga
! O'zingizga tegishli bo'lmagan tizimga urinish — noqonuniy; maqsad himoyani sinash.

? Yaxshi README'da birinchi navbatda nima bo'lishi kerak?
- Barcha konfiguratsiya fayllarining to'liq matni
+ Loyiha nima ekani va natijalar raqamlarda — 2 daqiqada tushunarli
- Faqat sxema rasmi
- Shaxsiy hayot haqida ma'lumot
! Ish beruvchi omborga taxminan 2 daqiqa sarflaydi.

? Omborni ommaga ochishdan oldin nimani tekshirish shart?
+ Parollar, API kalitlar va shaxsiy ma'lumotlar yo'qligini — Git tarixida ham
+ Ish joyiga oid hech qanday haqiqiy log yoki konfiguratsiya yo'qligini
- Fayllar soni juft ekanini
- README uzunligini
! Commit qilingan sir tarixda qoladi; ish joyi ma'lumotlari — maxfiylik shartnomasini buzish.

? Intervyuda laboratoriyani qanday ko'rsatish eng samarali?
- Barcha vositalar ro'yxatini o'qib berish
+ Bitta stsenariyni boshidan oxirigacha aniq misol bilan 5 daqiqada tushuntirish
- Faqat sertifikatlarni ko'rsatish
- Hech narsa ko'rsatmaslik
! Aniq hikoyani (muammo → sabab → tuzatish → qayta sinov) faqat uni qilgan odam aytib bera oladi.

? Platformalardagi faol topshiriqlar yechimlarini portfolioga joylash haqida qaysi gap to'g'ri?
- Har doim ruxsat etilgan
+ Ko'p platformalar taqiqlaydi — qoidalarni o'qish kerak; eskirgan topshiriqlar uchun odatda ruxsat bor
- Hech qachon ruxsat etilmaydi
- Faqat pullik obunada ruxsat
! Platforma qoidalarini buzish hisobni yopishga va obro'ga zarar keltirishi mumkin.

? Portfolio haqida qaysi gap to'g'ri?
- Qancha katta bo'lsa, shuncha yaxshi
+ Kichik, lekin to'liq va halol hujjatlashtirilgan loyiha chala qolgan ulkan loyihadan yaxshiroq
- U bir marta qilinadi va hech qachon yangilanmaydi
- U ish tajribasini to'liq almashtiradi
! Boshlang, joylang, keyin kengaytiring.
:::

:::cards
Portfolio nimani isbotlaydi? :: Vositalarni ishlata olish, tahlil qilish va hujjatlashtirish ko'nikmasini — tajriba yo'q paytdagi “ish tajribasi”.
Uy SOC laboratoriyasi tarkibi? :: Windows (Sysmon, audit), Linux (auditd), sensor (Suricata, Zeek), SIEM (Wazuh/Splunk/Elastic), Atomic Red Team, ixtiyoriy SOAR.
Laboratoriya xavfsizligi? :: Izolyatsiyalangan tarmoq, internetga ochiq xizmatlar yo'q, har bir VM uchun snapshot.
Manba ulangandan keyin? :: SIEM'da oxirgi hodisa vaqtini va maydonlar parsing'ini tekshirish.
Tavsiya etilgan stsenariylar? :: SSH brute force, yangi lokal admin, Run kaliti/vazifa, shubhali PowerShell, jurnal tozalash, DNS/C2 taqlidi, Linux persistence.
Stsenariy hujjati tuzilishi? :: Maqsad, simulyatsiya, telemetriya, aniqlash (va tuzatish), ATT&CK, xulosa va saboq.
Portfolioga yana nima kiradi? :: Kamida bitta ov hisoboti va bitta mini IR hisoboti.
GitHub ombori papkalari? :: architecture, configs, detections, scenarios, hunts, reports, scripts, attack-navigator.
Yaxshi README? :: Loyiha nima, natijalar raqamlarda, sxema, eng qiziq topilmalar, havolalar, keyingi qadamlar — 2 daqiqada tushunarli.
Ommaga ochishdan oldin? :: Parol, API kalit, shaxsiy IP va ish joyi ma'lumotlarini olib tashlash; git log -p bilan tarixni tekshirish.
Portfolioni qayerda ko'rsatish? :: Rezyume (bir qator + havola), LinkedIn, blog (o'zbekcha ham), intervyuda jonli namoyish.
Intervyudagi eng kuchli javob? :: Aniq hikoya: muammo → sabab → tuzatish → qayta sinov, dalillar bilan.
:::
