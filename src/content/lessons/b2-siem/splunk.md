Linux bosqichida bitta buyruq satri bilan log faylidan hujumchini topgan edingiz:

```bash
grep "Failed password" auth.log | grep -oE "from [0-9.]+" | sort | uniq -c | sort -nr | head
```

Endi xuddi shu savolni 500 ta serverning bir oylik loglari ustida berish kerak. Splunk'da bu shunday ko'rinadi:

```
index=linux sourcetype=linux_secure "Failed password"
| rex "from (?<src_ip>\d+\.\d+\.\d+\.\d+)"
| stats count by src_ip
| sort -count
| head 10
```

Tanish ko'rindimi? Splunk'ning qidiruv tili — **SPL** — xuddi Linux quvurlari kabi ishlaydi: har bir buyruq natijani keyingisiga uzatadi. Linux bosqichidagi mehnatingiz bu yerda o'z samarasini beradi.

Splunk — ish e'lonlarida eng ko'p uchraydigan SIEM'lardan biri. Bu darsda uning asosiy tushunchalarini va SOC analitigiga kerak bo'ladigan SPL buyruqlarini o'rganasiz.

## Splunk qanday tuzilgan

| Tushuncha | Ma'nosi | O'xshatish |
|---|---|---|
| **Event** | Bitta log yozuvi | Fayldagi bitta qator |
| **Index** | Loglar saqlanadigan "ombor" | Papka |
| **Sourcetype** | Log formati turi — Splunk qanday parse qilishni shundan biladi | Fayl turi |
| **Source** | Log kelgan aniq joy (fayl yo'li, kanal) | Fayl nomi |
| **Host** | Logni yuborgan qurilma | Kompyuter nomi |
| **Field** | Eventdan ajratilgan maydon (`src_ip`, `user`) | Jadval ustuni |
| **Forwarder** | Qurilmaga o'rnatiladigan agent | Pochtachi |

Har bir eventda doim bor bo'lgan maydonlar: `_time` (vaqt), `host`, `source`, `sourcetype`, `index`, `_raw` (xom matn).

Nomlarga e'tibor bering: `index`, `sourcetype` va maydon nomlari **har bir kompaniyada boshqacha** bo'lishi mumkin. Windows loglari bir joyda `index=windows`, boshqasida `index=wineventlog` bo'ladi. Yangi muhitda birinchi ish — qanday indekslar va sourcetype'lar borligini bilish:

```
| eventcount summarize=false index=* | table index count
```

```
index=* earliest=-24h | stats count by index, sourcetype | sort -count
```

## Qidiruvning tuzilishi

```
index=windows EventCode=4625 earliest=-24h     ← 1. Filtr: qaysi eventlar
| stats count by src_ip                        ← 2. Qayta ishlash
| where count > 20                             ← 3. Yana filtr
| sort -count                                  ← 4. Tartiblash
```

Birinchi qism (birinchi `|` gacha) — **qidiruv**: Splunk indeksdan kerakli eventlarni oladi. Keyingi har bir `|` dan keyin — **buyruq**.

### Birinchi qism: filtrlash

| Yozuv | Ma'nosi |
|---|---|
| `index=windows` | Faqat shu indeks |
| `EventCode=4625` | Maydon qiymati |
| `"Failed password"` | Matn qidiruvi (qo'shtirnoq — aniq ibora) |
| `user=admin*` | Yulduzcha — har qanday davom |
| `EventCode=4625 OR EventCode=4624` | Yoki (OR katta harflarda!) |
| `EventCode IN (4624, 4625, 4648)` | Ro'yxatdan biri |
| `NOT user=svc-backup` | Inkor |
| `src_ip!=10.*` | Teng emas |
| `earliest=-24h latest=now` | Vaqt oralig'i |

Splunk'da `AND` yashirin: `index=windows EventCode=4625` — ikkala shart ham. `OR`, `NOT`, `AND` — **katta harflarda** yoziladi.

### Vaqt

Vaqtni ekrandagi tanlagich (time picker) bilan yoki to'g'ridan-to'g'ri so'rovda berish mumkin:

| Yozuv | Ma'nosi |
|---|---|
| `earliest=-15m` | Oxirgi 15 daqiqa |
| `earliest=-24h` | Oxirgi 24 soat |
| `earliest=-7d@d` | 7 kun oldin, kun boshidan |
| `earliest="11/16/2026:02:00:00" latest="11/16/2026:03:00:00"` | Aniq oraliq |

:::tip
**Tezlik qoidasi:** har doim `index` va vaqt oralig'ini ko'rsating, va filtrlarni iloji boricha **birinchi qismga** qo'ying. `index=* "parol"` "barcha davr" bilan — butun Splunk'ni bir necha daqiqa band qiladi va hamkasblaringiz sizni yaxshi so'z bilan eslamaydi. So'rov qancha tor boshlansa, shuncha tez ishlaydi.
:::

## Eng muhim buyruqlar

### table va fields — ustunlarni tanlash

```
index=windows EventCode=4625
| table _time, host, user, src_ip, Logon_Type
```

`table` natijani jadval qilib ko'rsatadi. `fields` esa keraksiz maydonlarni olib tashlaydi (`| fields - _raw`) va katta qidiruvlarni tezlashtiradi.

### stats — SPL'ning eng kuchli buyrug'i

`stats` — Linux'dagi `sort | uniq -c` ning juda kuchaytirilgan versiyasi:

```
# Har bir IP'dan nechta muvaffaqiyatsiz kirish
index=windows EventCode=4625 | stats count by src_ip

# Har bir IP nechta TURLI hisobga urindi — password spraying belgisi
index=windows EventCode=4625
| stats count dc(user) as hisoblar values(user) as nomlar by src_ip
| sort -hisoblar

# Har bir foydalanuvchining birinchi va oxirgi kirishi
index=windows EventCode=4624
| stats min(_time) as birinchi max(_time) as oxirgi count by user
| convert ctime(birinchi) ctime(oxirgi)
```

| Funksiya | Nima qiladi |
|---|---|
| `count` | Nechta |
| `dc(field)` | Nechta **turli** qiymat (distinct count) |
| `values(field)` | Barcha turli qiymatlar ro'yxati |
| `min`, `max`, `avg`, `sum` | Raqamli hisob |
| `earliest(field)`, `latest(field)` | Birinchi va oxirgi qiymat |

`by` — guruhlash: `by src_ip` — har bir IP uchun alohida qator; `by src_ip, user` — har bir juftlik uchun.

### top va rare

```
index=proxy | top limit=10 url_domain          # eng ko'p uchraydigan 10 ta
index=proxy | rare limit=20 url_domain         # eng KAM uchraydigan 20 ta
```

Tarmoq loglari darsidagi "uzun dum" g'oyasini eslang: qiziq narsa ko'pincha ro'yxatning pastida. `rare` — aynan shu uchun.

### where va eval — shartlar va hisoblash

```
# stats natijasini filtrlash
index=windows EventCode=4625 | stats count by src_ip | where count > 20

# Yangi maydon hisoblash
index=proxy
| eval mb = round(bytes_out / 1024 / 1024, 2)
| where mb > 100
| table _time, user, url_domain, mb
```

`eval` yangi maydon yaratadi yoki mavjudini o'zgartiradi: arifmetika, matn birlashtirish, shartlar (`if`, `case`), uzunlik (`len`). Masalan, DNS tunnellash belgisini qidirish:

```
index=dns
| eval uzunlik = len(query)
| where uzunlik > 50
| stats count dc(query) as noyob by src_ip
| sort -noyob
```

### rex — maydonni o'zingiz ajratish

Agar kerakli maydon parse qilinmagan bo'lsa, uni [[regex|regex]] bilan ajratasiz. Linux bosqichidagi `grep -oE` ning SPL versiyasi:

```
index=linux sourcetype=linux_secure "Failed password"
| rex "for (invalid user )?(?<user>\S+) from (?<src_ip>\S+) port"
| stats count by src_ip, user
```

`(?<nom>...)` — regex guruhiga nom berish; Splunk shu nom bilan yangi maydon yaratadi.

### timechart — vaqt bo'yicha grafik

```
# Har soatda nechta muvaffaqiyatsiz kirish
index=windows EventCode=4625 earliest=-7d | timechart span=1h count

# Eng faol 5 ta IP'ning vaqt bo'yicha faolligi
index=windows EventCode=4625 earliest=-24h | timechart span=10m count by src_ip limit=5
```

`timechart` natijasini **Visualization** yorlig'ida chiziqli grafik sifatida ko'rasiz. To'satdan ko'tarilgan cho'qqi — tergov boshlanish nuqtasi. Trafik tahlili darsidagi beaconing esa bunday grafikda tekis, muntazam "taroq" bo'lib ko'rinadi.

### dedup, sort, head

```
index=windows EventCode=4624 Logon_Type=10
| dedup user, src_ip                  # har bir juftlikdan faqat bittasi
| sort - _time                        # eng yangisi tepada
| head 20
```

### Boshqa foydali buyruqlar

| Buyruq | Vazifasi |
|---|---|
| `lookup` | Tashqi jadval bilan boyitish (masalan, aktivlar ro'yxati yoki tahdid ro'yxati) |
| `iplocation src_ip` | IP'ga mamlakat va shahar qo'shish |
| `bin _time span=5m` | Vaqtni bo'laklarga ajratish (stats bilan birga) |
| `transaction` | Bog'liq eventlarni bitta "seans"ga birlashtirish — qulay, lekin sekin |
| `spath` | JSON formatidagi loglardan maydon ajratish |

## Amaliy so'rovlar: SOC'ning kundalik savollari

### Brute force va undan keyingi muvaffaqiyat

Linux darsidagi asosiy savol — "`Failed` lar orasida `Accepted` bormi?" — SPL'da bitta so'rov:

```
index=linux sourcetype=linux_secure ("Failed password" OR "Accepted password")
| rex "(?<natija>Failed|Accepted) password for (invalid user )?(?<user>\S+) from (?<src_ip>\S+)"
| stats count(eval(natija="Failed")) as xato
        count(eval(natija="Accepted")) as muvaffaqiyat
        by src_ip, user
| where xato > 10 AND muvaffaqiyat > 0
```

Natija bo'sh bo'lmasa — bu insident: ko'p xatodan keyin kirish muvaffaqiyatli bo'lgan.

### Windows: tunda RDP orqali kirish

```
index=windows EventCode=4624 Logon_Type=10 earliest=-7d
| eval soat = tonumber(strftime(_time, "%H"))
| where soat < 7 OR soat > 21
| table _time, user, src_ip, host
```

### Yangi administratorlar

```
index=windows EventCode IN (4720, 4728, 4732, 4756) earliest=-24h
| table _time, host, EventCode, user, Group_Name, src_user
```

### Ofis dasturidan buyruq qobig'i (Sysmon)

```
index=sysmon EventCode=1
  (ParentImage="*\\WINWORD.EXE" OR ParentImage="*\\EXCEL.EXE" OR ParentImage="*\\OUTLOOK.EXE")
  (Image="*\\powershell.exe" OR Image="*\\cmd.exe" OR Image="*\\wscript.exe")
| table _time, host, User, ParentImage, Image, CommandLine
```

Yo'llardagi teskari chiziq (`\`) SPL'da ikki marta yoziladi: `\\`.

### Proxy: notanish domenlarga ko'p ma'lumot yuborish

```
index=proxy earliest=-24h
| stats sum(bytes_out) as yuborilgan by user, url_domain
| eval mb = round(yuborilgan / 1024 / 1024, 1)
| where mb > 50
| sort -mb
```

Bu so'rovlarning maydon nomlari (`user`, `src_ip`, `Logon_Type`, `bytes_out`) sizning muhitingizda boshqacha bo'lishi mumkin. Avval bitta eventni oching va maydonlar ro'yxatiga qarang (chap paneldagi **Interesting Fields**) — keyin so'rovni moslang.

:::key
SPL'ni o'rganishning eng tez yo'li — **savoldan boshlash**, buyruqdan emas. "Kecha tunda kim RDP orqali kirdi?" → qaysi index? qaysi EventCode? qaysi maydon tunni bildiradi? → so'rov. Har bir so'rovni bosqichma-bosqich quring: avval faqat filtr qismini ishga tushirib, eventlar to'g'ri kelayotganini ko'ring, keyin bitta-bitta `|` qo'shing. Xato qayerda ekanini shunda darhol ko'rasiz — Linux quvurlarini qurgandek.
:::

## Qidiruvdan ogohlantirishgacha

Yaxshi so'rov yozdingiz. Endi u har kuni o'zi ishlashi kerak.

**Saved search → Alert.** Qidiruvni saqlab, uni jadvalga qo'yasiz:

| Sozlama | Misol | Ma'nosi |
|---|---|---|
| Jadval | Har 15 daqiqada | Qanchalik tez-tez ishga tushadi |
| Vaqt oralig'i | Oxirgi 15 daqiqa | Qaysi davrni tekshiradi |
| Shart | Natijalar soni > 0 | Qachon ogohlantirish chiqadi |
| Throttle | Bir IP uchun 1 soatda bir marta | Bir xil ogohlantirish bilan to'ldirib tashlamaslik |
| Harakat | Tiket ochish, pochta, SOAR'ga yuborish | Ogohlantirish qayerga ketadi |

Jadval va vaqt oralig'i bir-biriga mos bo'lishi kerak: har 15 daqiqada oxirgi 5 daqiqani tekshirsangiz, 10 daqiqalik bo'shliqlar qoladi. Loglar kechikib kelishini ham hisobga oling — ko'pincha oraliq biroz orqaga suriladi (`earliest=-20m latest=-5m`).

**Dashboard** — bir nechta saqlangan qidiruvning grafiklari bitta sahifada: muvaffaqiyatsiz kirishlar dinamikasi, eng faol IP'lar, yangi administratorlar. Smena boshida bir qarashda vaziyatni ko'rish uchun.

Qoidani qanday to'g'ri yozish, sinash va false positive'larga qarshi sozlash — shu bosqichning aniqlash qoidalari darsida.

## Qayerda mashq qilish mumkin

| Manba | Nima |
|---|---|
| **Splunk** — bepul o'quv kurslari | Rasmiy boshlang'ich kurslar (Splunk Fundamentals va boshqalar) |
| **Splunk Enterprise** — sinov versiyasi | O'z kompyuteringizga o'rnatib, o'z loglaringizni yuklash; sinov muddati tugagach uni cheklangan bepul litsenziyaga o'tkazish mumkin (kunlik hajm kichik, ba'zi imkoniyatlar yo'q) — joriy shartlarni Splunk saytida tekshiring |
| **Boss of the SOC (BOTS)** | Splunk'ning SOC musobaqasi; ma'lumotlar to'plamlari ochiq — haqiqiy hujumlar loglari ustida savollar |
| **TryHackMe** — "Splunk: Basics" va boshqa Splunk xonalari | Brauzerda tayyor muhit |
| **CyberDefenders** | Splunk asosidagi tergov topshiriqlari |

Maqsad — kamida bitta BOTS to'plamidagi savollarning ko'pchiligini yechish. Har bir yechimni o'z so'zingiz bilan yozib boring — bu intervyuda "Splunk bilan ishlaganmisiz?" degan savolga eng yaxshi javob.

## Splunk nimani qilmaydi

- **Maydon nomlarini taxmin qilmaydi** — noto'g'ri nom bilan so'rov xato bermaydi, shunchaki **bo'sh natija** beradi. "Natija yo'q" ≠ "hodisa yo'q".
- **Kelmagan logni qidirmaydi** — forwarder to'xtagan bo'lsa, o'sha qurilma jim. Har bir manbaning oxirgi event vaqtini kuzatib boring.
- **Sekin so'rovni o'zi tuzatmaydi** — `index=*` va "barcha davr" sizning javobgarligingiz.
- **Kontekstni bilmaydi** — `lookup` bilan aktivlar va foydalanuvchilar ro'yxati berilmasa.

Oxirgi ikkinchi qator uchun foydali qoida — "jim qolgan manbalar" so'rovi:

```
| tstats latest(_time) as oxirgi where index=* by host
| eval jim_soat = round((now() - oxirgi) / 3600, 1)
| where jim_soat > 4
| sort -jim_soat
```

Bu 4 soatdan beri log yubormayotgan qurilmalarni ko'rsatadi. Hujumchining birinchi qiladigan ishlaridan biri — agentni to'xtatish; bu so'rov shuni ushlaydi.

:::try
**1. Muhitni o'rganing.** TryHackMe'dagi Splunk xonasida (yoki o'zingiz o'rnatgan Splunk'da) qanday indekslar va sourcetype'lar borligini toping: `index=* | stats count by index, sourcetype`.

**2. Quvurni quring.** Bosqichma-bosqich: avval `index=... EventCode=4625`, keyin `| stats count by ...`, keyin `| where count > 5`, keyin `| sort -count`. Har qadamda natija qanday o'zgarishini kuzating.

**3. O'zingiz yozing.** Quyidagi savollar uchun SPL so'rov yozing (maydon nomlarini muhitingizga moslang):
- (a) Oxirgi 24 soatda eng ko'p muvaffaqiyatsiz kirishga uchragan 5 ta hisob.
- (b) Bitta IP'dan 10 dan ortiq turli hisobga urinish.
- (c) Har soatlik muvaffaqiyatli kirishlar grafigi, oxirgi 7 kun.

**4. BOTS.** Boss of the SOC to'plamlaridan biri bo'yicha kamida 10 ta savolni yeching.

*Javoblar: 3a — `index=windows EventCode=4625 earliest=-24h | stats count by user | sort -count | head 5` (yoki `| top limit=5 user`). 3b — `index=windows EventCode=4625 | stats dc(user) as hisoblar by src_ip | where hisoblar > 10`. 3c — `index=windows EventCode=4624 earliest=-7d | timechart span=1h count`.*
:::

## Xulosa

- Splunk: **event, index, sourcetype, source, host, field**; har eventda `_time`, `host`, `source`, `sourcetype`, `_raw`.
- SPL — Linux quvurlari kabi: birinchi qism filtrlaydi, har `|` dan keyin buyruq.
- Har doim **index va vaqt** bilan, filtrlar birinchi qismda — tezlik uchun.
- Asosiy buyruqlar: `table`, `stats` (`count`, `dc`, `values`, `min`, `max` + `by`), `top`/`rare`, `where`, `eval`, `rex`, `timechart`, `dedup`, `sort`, `head`.
- `rare` — "uzun dum"ni ko'rish; `timechart` — cho'qqilar va beaconing.
- Saqlangan qidiruv → **alert**: jadval, vaqt oralig'i, shart, throttle, harakat.
- Noto'g'ri maydon nomi xato emas, **bo'sh natija** beradi; jim qolgan manbalarni kuzating.

:::quiz
? SPL so'rovidagi birinchi `|` belgisigacha bo'lgan qism nima qiladi?
- Natijani grafikka aylantiradi
+ Indeksdan kerakli eventlarni filtrlab oladi
- Yangi maydon hisoblaydi
- Natijani saralaydi
! Birinchi qism — qidiruv (filtr). Keyingi har bir quvurdan keyin buyruqlar natijani qayta ishlaydi.

? Bitta IP manzil nechta TURLI hisobga urinib ko'rganini qaysi funksiya hisoblaydi?
- count
+ dc(user)
- values(src_ip)
- max(user)
! dc — distinct count, ya'ni turli qiymatlar soni. Ko'p turli hisob — password spraying belgisi.

? Eng kam uchraydigan domenlarni ko'rish uchun qaysi buyruq qulay?
- top
+ rare
- head
- dedup
! Qiziq va shubhali narsalar ko'pincha ro'yxatning pastida — “uzun dum”da bo'ladi.

? Maydon parse qilinmagan bo'lsa, uni regex bilan ajratish uchun qaysi buyruq ishlatiladi?
- eval
- table
+ rex
- lookup
! rex "(?<nom>...)" — nomli guruhdan yangi maydon yaratadi.

? Qaysi so'rov tezroq ishlaydi?
+ index=windows EventCode=4625 earliest=-1h | stats count by src_ip
- index=* | search EventCode=4625 | stats count by src_ip (barcha davr)
- index=* "4625" (barcha davr)
- Farqi yo'q
! Index va vaqt oralig'ini ko'rsatish va filtrlarni birinchi qismga qo'yish qidiruvni ko'p marta tezlashtiradi.

? stats count by src_ip | where count > 20 qismidagi where nima qiladi?
- Eventlarni indeksdan oladi
+ stats natijasidan faqat 20 dan ortiq urinishli IP'larni qoldiradi
- Yangi indeks yaratadi
- Vaqtni o'zgartiradi
! where hisoblangan natijalar ustida shart qo'yadi.

? Har soatlik grafik uchun qaysi buyruq ishlatiladi?
- stats count by host
+ timechart span=1h count
- table _time
- sort _time
! timechart vaqtni bo'laklarga ajratib, har bo'lakda hisoblaydi — cho'qqilar va muntazam naqshlar ko'rinadi.

? So'rov natijasi bo'sh chiqdi. Qaysi xulosa noto'g'ri bo'lishi mumkin?
- Maydon nomi muhitda boshqacha bo'lishi mumkin
- Manba log yubormay qo'ygan bo'lishi mumkin
+ Albatta hech qanday hodisa bo'lmagan
- Vaqt oralig'i noto'g'ri tanlangan bo'lishi mumkin
! Noto'g'ri maydon nomi yoki jim qolgan manba ham bo'sh natija beradi. “Natija yo'q” ≠ “hodisa yo'q”.

? Alert har 15 daqiqada ishga tushadi, lekin faqat oxirgi 5 daqiqani tekshiradi. Muammo nima?
- Hech qanday muammo yo'q
+ Har safar 10 daqiqalik bo'shliq qoladi — o'sha davrdagi hodisalar tekshirilmaydi
- Alert juda ko'p ishlaydi
- Splunk xato beradi
! Jadval va tekshiriladigan vaqt oralig'i mos kelishi (va loglar kechikishi hisobga olinishi) kerak.

? Alert sozlamalaridagi throttle nima uchun kerak?
- Qidiruvni tezlashtirish uchun
+ Bir xil ogohlantirish qisqa vaqtda qayta-qayta chiqib, navbatni to'ldirib yubormasligi uchun
- Loglarni o'chirish uchun
- Parollarni yashirish uchun
! Masalan, bitta IP uchun bir soatda faqat bitta ogohlantirish.

? Nega “jim qolgan manbalar” so'rovi muhim?
- U litsenziyani tejaydi
+ Hujumchi agentni to'xtatishi yoki manba buzilishi mumkin; jim qurilma ko'rinmas bo'shliq bo'ladi
- U parollarni topadi
- U loglarni siqadi
! Kelmayotgan log — qidirib bo'lmaydigan log. Har manbaning oxirgi event vaqtini kuzatish kerak.
:::

:::cards
Splunk asosiy tushunchalari? :: Event — bitta yozuv; index — ombor; sourcetype — format; source — aniq manba; host — qurilma; field — maydon.
Har eventda doim bor maydonlar? :: _time, host, source, sourcetype, index, _raw.
SPL qanday tuzilgan? :: Birinchi qism — filtr (qidiruv); har bir | dan keyin buyruq natijani qayta ishlaydi, Linux quvurlari kabi.
SPL'da tezlik qoidasi? :: Har doim index va vaqt oralig'ini ko'rsating; filtrlarni birinchi qismga qo'ying; index=* va “barcha davr”dan qoching.
stats funksiyalari? :: count, dc (turli qiymatlar soni), values, min, max, avg, sum, earliest, latest — by bilan guruhlanadi.
top va rare? :: top — eng ko'p uchraydiganlar; rare — eng kam uchraydiganlar (uzun dum).
eval va where? :: eval — yangi maydon hisoblaydi (round, len, if, strftime); where — hisoblangan qiymatlar bo'yicha filtrlaydi.
rex nima qiladi? :: Regex nomli guruhi (?<nom>...) orqali xom matndan yangi maydon ajratadi.
timechart nima uchun? :: Vaqt bo'yicha grafik: timechart span=1h count — cho'qqilar va muntazam naqshlarni ko'rsatadi.
Brute force + muvaffaqiyat SPL g'oyasi? :: Failed va Accepted ni rex bilan ajratish, stats count(eval(...)) by src_ip, user, keyin where xato > 10 AND muvaffaqiyat > 0.
Alert sozlamalari? :: Jadval, tekshiriladigan vaqt oralig'i, ishga tushish sharti, throttle, harakat (tiket, pochta, SOAR).
BOTS nima? :: Boss of the SOC — Splunk'ning SOC musobaqasi; ochiq ma'lumotlar to'plamlarida haqiqiy hujum loglari bo'yicha savollar.
:::
