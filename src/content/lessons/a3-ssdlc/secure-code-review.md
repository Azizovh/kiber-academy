Pull request: "Qaydlarni tegs bo'yicha filtrlash qo'shildi." 14 ta fayl, 600 qator o'zgarish. Dasturchi ertaga ta'tilga chiqadi va bugun birlashtirishni so'rayapti. Sizda 40 daqiqa bor.

600 qatorni qatorma-qator o'qish — 40 daqiqada imkonsiz va samarasiz. Tajribali AppSec muhandisi boshqacha ishlaydi: u **qayerga qarash kerakligini** biladi. Ma'lumot qayerdan kiradi, qayerga boradi, qayerda ruxsat tekshiriladi. U 600 qatordan 40 tasini diqqat bilan o'qiydi — va xavfli 2 tasini topadi.

Bu darsda xavfsiz kod ko'rib chiqishning **usulini** o'rganasiz: manbadan sink'gacha kuzatish, xavfli joylar ro'yxati, pull request'da nimaga qarash, va topilmani dasturchiga qanday yetkazish.

## Kod ko'rib chiqish — nega kerak

| Usul | Nimani yaxshi topadi | Nimani topa olmaydi |
|---|---|---|
| **Kod ko'rib chiqish** (qo'lda) | Kirish nazorati, biznes mantiq, kriptografik xatolar, dizayn muammolari, kontekst | Juda katta hajm; charchash; bir xil naqshlarni minglab marta |
| **SAST** (keyingi dars) | Ma'lum naqshlarni tez va keng: injection, xavfli funksiyalar | Biznes mantiq, kontekst, ko'p false positive |
| **DAST** | Ishlab turgan ilovadagi muammolar, konfiguratsiya | Kodning ichini; ko'p kod yo'llari |
| **Pentest** | Haqiqiy hujum nuqtai nazari, zanjirlar | Barcha kod yo'llarini qamrash |

Ular bir-birini to'ldiradi. Lekin a2 bosqichidagi eng xavfli zaifliklar — **kirish nazorati** va **biznes mantiq** — asosan qo'lda ko'rib chiqishda topiladi. Skaner `load_note()` qayerda chaqirilishi kerakligini bilmaydi; siz bilasiz.

## Asosiy usul: manbadan sink'gacha

a2 bosqichidagi injection darsida kiritilgan g'oya — kod ko'rib chiqishning asosi:

```
 MANBA (source)                 ──► YO'L (oqim)                ──► SINK
 ishonchsiz ma'lumot kiradi         o'zgaruvchilar, funksiyalar      xavfli amal
 request.args/form/json             tekshiruv bormi?                 execute, subprocess,
 sarlavhalar, cookie'lar            kodlash bormi?                   render, redirect,
 fayllar, tashqi API                ruxsat tekshiruvi bormi?         open, requests.get
```

Ikki yo'nalishda ishlash mumkin:

| Yo'nalish | Qanday | Qachon yaxshi |
|---|---|---|
| **Manbadan oldinga** | Har bir kirish nuqtasidan boshlab, ma'lumot qayerga borishini kuzatish | Kichik o'zgarish, yangi endpoint |
| **Sink'dan orqaga** | Har bir xavfli funksiyani topib, unga nima yetib kelishini orqaga kuzatish | Katta, notanish kod bazasi — sink'lar kamroq, ularni topish oson |

Katta notanish kodda ko'pincha **sink'dan orqaga** samaraliroq: barcha `execute(`, `subprocess`, `|safe`, `redirect(` larni toping — ular odatda o'nlab, kirish nuqtalari esa yuzlab bo'ladi.

## Xavfli joylar ro'yxati

a2 bosqichidagi har bir darsdan — qidiriladigan "issiq nuqtalar" (Python/Flask misolida; boshqa tillarda o'xshashlari bor):

| Toifa | Qidiriladigan narsalar | Savol |
|---|---|---|
| **Injection** | `execute(f"`, `execute("..." %`, `.raw(`, `text(f"`, `subprocess(..., shell=True)`, `os.system`, `eval`, `exec`, `render_template_string` | Foydalanuvchi ma'lumoti kod sifatida yopishtiriladimi? |
| **XSS** | `\|safe`, `Markup(`, `autoescape false`, JS'da `innerHTML`, `href=` ga foydalanuvchi URL'i | Kodlash o'chirilganmi? Kontekst to'g'rimi? |
| **Kirish nazorati** | ID qabul qiladigan har bir marshrut (`<int:...>`, `request.args["id"]`), `@login_required` yo'q marshrutlar, admin funksiyalari | Ruxsat tekshiruvi bormi va markazlashganmi? |
| **CSRF** | `methods=["GET"]` da holat o'zgarishi, `@csrf.exempt` | Holatni o'zgartiruvchi amal himoyalanganmi? |
| **Kriptografiya** | `md5`, `sha1`, `random`, kodga yozilgan kalitlar, `verify=False`, `==` bilan imzo solishtirish | To'g'ri vosita, to'g'ri sozlama? |
| **SSRF** | `requests.get(foydalanuvchi_url)`, `urlopen`, webhook manzillari | URL tekshiriladimi? |
| **Deserializatsiya / XXE** | `pickle.load`, `yaml.load(`, `xml.etree` | Ishonchsiz ma'lumotmi? |
| **Fayllar** | `open(` va `send_file(` foydalanuvchi bergan yo'l bilan, yuklash funksiyalari | Yo'lni buzish (`../`)? Tur va hajm tekshiruvi? |
| **Yo'naltirish** | `redirect(request.args["next"])` | Ochiq yo'naltirish (phishing uchun) — faqat ichki yo'llarga ruxsatmi? |
| **Mass assignment** | `**request.json`, `setattr` tsikli, `Model(**data)` | Faqat ruxsat etilgan maydonlarmi? |
| **Biznes mantiq** | Narx, miqdor, holat mijozdan; "tekshir-keyin-yangila" | Server hal qiladimi? Atomikmi? |
| **Konfiguratsiya** | `DEBUG = True`, `SECRET_KEY = "..."`, keng CORS | Xavfsiz standartlar? |
| **Loglash** | Parol, token, karta ma'lumotlari loglarda | Maxfiy ma'lumot sizyaptimi? |

Bu jadvalni o'zingizning **ko'rib chiqish ro'yxatingiz**ga aylantiring va har bir loyihaning texnologiyasiga moslang.

### Tez qidiruv: ripgrep

`grep` (Linux bosqichi) yoki undan tezroq `rg` (ripgrep) — notanish kod bazasida birinchi qadam:

```bash
# Barcha marshrutlar — hujum yuzasi ro'yxati
rg -n "@(app|bp|\w+)\.route\(" --type py

# Autentifikatsiyasiz marshrutlar: marshrut bor, keyingi qatorlarda login_required yo'q
rg -n -A3 "\.route\(" --type py | rg -v "login_required|api_auth_required"

# Sink'lar
rg -n "execute\(f|shell=True|render_template_string|\|\s*safe|Markup\(|pickle\.load|yaml\.load\(" 

# Yo'naltirish va fayllar
rg -n "redirect\(request\.|send_file\(|open\(.*request\."
```

`grep` natijalari — **boshlang'ich nuqta**, hukm emas. Har bir natijani kontekstda o'qiysiz. Keyingi darsda bular **Semgrep qoidalari**ga aylanadi — aniqroq va CI'da avtomatik.

## Notanish kod bazasini ko'rib chiqish tartibi

```
 1. Tushunish (15–20%)    — ilova nima qiladi? kim foydalanadi? qanday ma'lumot?
                             README, arxitektura, tahdid modeli (agar bor bo'lsa)
        ▼
 2. Xarita (10–15%)       — kirish nuqtalari (marshrutlar, API), autentifikatsiya qayerda,
                             avtorizatsiya qayerda, baza bilan ishlash qayerda, konfiguratsiya
        ▼
 3. Markaziy mexanizmlar  — autentifikatsiya, sessiya, ruxsat funksiyasi, kodlash —
    (20–25%)               BIR MARTA chuqur tekshiriladi; to'g'ri bo'lsa, hamma joyda yordam beradi
        ▼
 4. Issiq nuqtalar        — yuqoridagi ro'yxat bo'yicha; sink'dan orqaga
    (30–40%)
        ▼
 5. Biznes mantiq         — pul, holat, oqimlar, limitlar
        ▼
 6. Hisobot               — topilmalar, ustuvorlik, tavsiyalar
```

3-qadam eng samarali: agar ilovada `can()` / `load_note()` kabi **markaziy** ruxsat funksiyasi bo'lsa, siz uni bir marta chuqur tekshirasiz, keyin har bir endpointda faqat "u chaqirilganmi?" deb so'raysiz. Agar markaziy mexanizm **bo'lmasa** — bu o'zi topilma (a2 bosqichidagi kirish nazorati darsi): har bir endpoint o'z tekshiruvini qo'lda yozgan bo'lsa, ulardan biri ertami-kechmi xato bo'ladi.

## Pull request'ni ko'rib chiqish

Kundalik ishda ko'pincha butun kod bazasini emas, **o'zgarishni** ko'rib chiqasiz. Dars boshidagi 40 daqiqalik PR uchun:

| Savol | Nega |
|---|---|
| **Yangi kirish nuqtasi** qo'shildimi? (marshrut, API, forma maydoni, fayl yuklash) | Har biri — yangi hujum yuzasi; autentifikatsiya, avtorizatsiya, tekshiruv kerak |
| **Yangi sink** qo'shildimi? (SQL, shell, shablon, tashqi so'rov) | Manbadan unga nima yetib keladi? |
| **Ruxsat mantig'i** o'zgardimi? | Eng xavfli o'zgarish turi — chuqur ko'rib chiqing |
| **Xavfsizlik mexanizmi o'chirildimi yoki chetlab o'tildimi?** | `@csrf.exempt`, `\|safe`, `verify=False`, testdan `skip`, yangi istisno |
| **Yangi bog'liqlik** qo'shildimi? | SCA darsi — kutubxona ishonchlimi, yangilanib turadimi? |
| **Sirlar** bormi? | Kalit, parol, token — kodda yoki konfiguratsiyada |
| **Xavfsizlik testlari** qo'shildimi yoki o'zgardimi? | Yangi endpoint — matritsa testiga qator; o'chirilgan test — nega? |

Dars boshidagi "tegs bo'yicha filtrlash" PR'ida diqqat qilish kerak bo'lgan joylar: yangi `GET /notes?tag=...` endpointi (ro'yxat — ruxsat filtri bormi? a2 bosqichidagi "unutiladigan joylar"), teg qiymati SQL'ga qanday tushadi (parametrlanganmi?), teg nomi sahifada qanday ko'rsatiladi (kodlanganmi?). 600 qatordan aynan shu uch joy.

### Diff'ni o'qishdagi tuzoqlar

- **O'chirilgan qatorlar** qo'shilganlardek muhim: olib tashlangan tekshiruv — yangi zaiflik.
- **Kontekstni oching**: diff faqat o'zgargan qatorlarni ko'rsatadi; o'zgargan funksiyaning qayerdan chaqirilishini ko'ring.
- **Test fayllarini o'tkazib yubormang**: `@pytest.mark.skip` qo'shilgan xavfsizlik testi — signal.
- **Konfiguratsiya fayllari**: CORS, cookie, CSP, Dockerfile, CI sozlamalari (a4).

## Ma'lum zaifliklarni o'rganish orqali o'rganish

Curriculum'dagi maqsadlardan biri: "Ochiq kodli loyihada kamida 3 ta zaiflikni topdim **yoki ma'lum CVE'larni tahlil qildim**." Ikkinchi yo'l — boshlang'ich uchun eng yaxshi mashq:

1. GitHub'da **Security Advisories** bo'limini oching (yoki GitHub Advisory Database) — o'zingiz biladigan tildagi (Python, JavaScript) web freymvork yoki kutubxona uchun.
2. Zaiflik tavsifini o'qing (masalan, "path traversal in file download").
3. **Tuzatish commit'ini** toping va diff'ni o'qing: zaif kod qanday edi? Tuzatish nima qildi?
4. O'zingizdan so'rang: "Men bu kodni ko'rib chiqsam, buni topardimmi? Qaysi issiq nuqta qoidasi buni ko'rsatardi?"
5. Natijani writeup sifatida yozing (karyera bo'limidagi portfolio darsi).

Bu usul uchta narsani beradi: haqiqiy zaifliklarning qanday ko'rinishini, ularning **to'g'ri tuzatilishini**, va sizning ko'rib chiqish ro'yxatingiz uchun yangi naqshlarni.

Agar ochiq loyihada **yangi** zaiflik topsangiz — uni ommaga yozmang: loyihaning `SECURITY.md` faylidagi tartib bo'yicha **xususiy** xabar bering (mas'uliyatli oshkor qilish). a4 bosqichidagi portfolio darsida batafsil.

## Topilmani yetkazish

Kod ko'rib chiqishning yarmi — **muloqot**. Topilma dasturchiga qanday yetkazilsa, shunday tuzatiladi:

| Yomon izoh | Yaxshi izoh |
|---|---|
| "Bu yerda SQL injection bor." | "**[Yuqori]** `tag` qiymati f-string orqali SQL'ga tushmoqda (`notes.py:48`). Foydalanuvchi qo'shtirnoq bilan so'rov tuzilishini o'zgartirib, boshqalarning qaydlarini o'qishi mumkin. Tuzatish: `execute("... AND t.name = ?", (uid, tag))`. Test: `test_tag_filter_with_quote`." |
| "Bu xavfsiz emas, qayta yozing." | Aniq muammo + nega + qanday tuzatish + (ixtiyoriy) qanday tekshirish |
| "Nega `load_note` ishlatmadingiz?!" | "Bu endpoint `load_note()` ni chetlab o'tadi — boshqa qayd ID'si bilan begona teglar ko'rinadi. `load_note(note_id, Action.READ)` qo'shilsa, matritsa testlari ham qamraydi." |

Yaxshi izohning tuzilishi: **daraja → joy → muammo → ta'sir → tuzatish → test**. a2 bosqichidagi tuzatish hisobotining qisqa shakli.

Muloqot madaniyati haqida: dasturchi — dushman emas, hamkor. Ayblovchi ohang odamlarni xavfsizlik jamoasidan qochishga o'rgatadi. Yaxshi AppSec muhandisi **o'rgatadi**: har bir izoh — keyingi safar xato qilmaslik uchun dars. Va yaxshi kodni ham ko'rsating: "Bu yerda `load_note` to'g'ri ishlatilgan — ajoyib."

:::key
**Kod ko'rib chiqishning siri — hamma narsani o'qish emas, to'g'ri joyni o'qish.** Uchta savol deyarli barcha jiddiy topilmalarga olib boradi: **"Ma'lumot qayerdan keladi va qayerga boradi?"** (manba → sink), **"Ruxsat qayerda tekshiriladi — va bu yerda chaqirilganmi?"** (markaziy mexanizm), **"Bu o'zgarish qaysi himoyani olib tashladi yoki chetlab o'tdi?"** (diff'dagi o'chirilganlar va istisnolar). Qolganini SAST (keyingi dars) kengroq qamraydi — siz esa skaner ko'ra olmaydigan narsaga e'tibor qaratasiz.
:::

## Bu dars nimani bermaydi

- **Har bir til va freymvorkning xavfli funksiyalari ro'yxatini** — OWASP Code Review Guide va har bir freymvorkning xavfsizlik hujjatlari.
- **Avtomatik tahlilni** — keyingi dars (SAST).
- **Chuqur reverse engineering'ni** — bu ilova kodi emas, ikkilik fayllar sohasi.

:::try
**1. Xarita.** O'z Qaydnoma loyihangizda `rg` (yoki `grep`) bilan barcha marshrutlar ro'yxatini chiqaring. Har biri uchun jadval: autentifikatsiya bormi, avtorizatsiya (qaysi `Action`), CSRF, kirish sxemasi.

**2. Sink'dan orqaga.** Qaydnoma'dagi barcha `execute(` chaqiruvlarini toping va har biriga nima yetib kelishini orqaga kuzating. Hammasi parametrlanganmi?

**3. Hamkor bilan almashing.** a2 bosqichidagi zaif branch'ni (yoki kichik PR'ni) hamkoringizga bering va uning kodini o'zingiz ko'rib chiqing — 40 daqiqa vaqt bilan. Topilmalarni "daraja → joy → muammo → ta'sir → tuzatish → test" formatida yozing.

**4. Ma'lum CVE tahlili.** GitHub Advisory Database'da Python yoki JavaScript web kutubxonasidagi 3 ta zaiflikni tanlang (masalan, path traversal, XSS, ochiq yo'naltirish). Har biri uchun tuzatish commit'ini toping va writeup yozing: zaif kod, tuzatish, siz uni qaysi issiq nuqta qoidasi bilan topgan bo'lardingiz.

**5. DVWA kodi.** DVWA'ning bir nechta zaiflik bo'limlarida "low" va "impossible" darajadagi kodni ko'rib chiqish mashqi sifatida o'qing va farqni yozing.
:::

## Xulosa

- Qo'lda kod ko'rib chiqish — **kirish nazorati va biznes mantiq** uchun eng samarali; SAST, DAST, pentest bilan birga.
- Asosiy usul — **manbadan sink'gacha**; katta notanish kodda — **sink'dan orqaga**.
- **Issiq nuqtalar ro'yxati** — injection, XSS, kirish nazorati, CSRF, kriptografiya, SSRF, deserializatsiya, fayllar, yo'naltirish, mass assignment, biznes mantiq, konfiguratsiya, loglar.
- `grep`/`rg` — boshlang'ich nuqta, hukm emas.
- Tartib: **tushunish → xarita → markaziy mexanizmlar (bir marta chuqur) → issiq nuqtalar → biznes mantiq → hisobot**; markaziy mexanizm yo'qligi — o'zi topilma.
- PR'da: yangi kirish nuqtalari va sink'lar, ruxsat o'zgarishlari, **o'chirilgan yoki chetlab o'tilgan himoyalar**, bog'liqliklar, sirlar, testlar.
- **Ma'lum CVE'larning tuzatish commit'larini o'qish** — eng yaxshi o'rganish usuli; yangi zaiflik — **xususiy** xabar.
- Izoh: **daraja → joy → muammo → ta'sir → tuzatish → test**; hamkor ohangida.

:::quiz
? Qaysi zaiflik turlarini qo'lda kod ko'rib chiqish skanerlardan yaxshiroq topadi?
+ Kirish nazorati va biznes mantiq xatolari
- Faqat sintaksis xatolari
- Faqat eski kutubxonalar
- Faqat tarmoq portlari
! Skaner qaysi joyda qanday ruxsat tekshiruvi bo'lishi kerakligini bilmaydi.

? Katta, notanish kod bazasida nega ko'pincha “sink'dan orqaga” usuli samaraliroq?
+ Xavfli funksiyalar (sink'lar) odatda kamroq va ularni topish oson; kirish nuqtalari esa juda ko'p
- Sink'lar har doim xavfsiz
- Manbalar mavjud emas
- Bu tezroq kompilyatsiya qiladi
! Masalan, barcha execute( va subprocess chaqiruvlarini topib, ularga nima yetib kelishini kuzatish.

? grep yoki ripgrep natijalari haqida qaysi gap to'g'ri?
+ Ular boshlang'ich nuqta — har bir natija kontekstda o'qib tekshiriladi
- Har bir natija — tasdiqlangan zaiflik
- Ular barcha zaifliklarni topadi
- Ular faqat testlar uchun
! Qidiruv naqshni topadi, hukmni esa tahlilchi chiqaradi.

? Ilovada markazlashgan ruxsat funksiyasi (masalan, load_note) bo'lsa, ko'rib chiqishda qanday foyda bor?
+ Uni bir marta chuqur tekshirib, har bir endpointda faqat u chaqirilganini tekshirish mumkin
- Endi kirish nazoratini tekshirish shart emas
- U testlarni almashtiradi
- U faqat admin uchun
! Markaziy mexanizm yo'qligi esa o'zi topilma.

? Pull request diff'ida eng xavfli o'zgarish turlaridan biri qaysi?
+ Mavjud xavfsizlik tekshiruvining o'chirilishi yoki chetlab o'tilishi (masalan, @csrf.exempt, |safe, verify=False)
- Izohlarning o'zgarishi
- O'zgaruvchi nomini o'zgartirish
- Bo'sh qatorlar qo'shilishi
! O'chirilgan qatorlar qo'shilganlardek muhim.

? “Tegs bo'yicha filtrlash” degan yangi ro'yxat endpointida nimani tekshirish kerak?
+ Natijalar foydalanuvchi ko'ra oladigan qaydlar bilan filtrlanganmi, teg SQL'ga parametr sifatida tushadimi, teg nomi sahifada kodlanadimi
- Faqat sahifa dizaynini
- Faqat tezlikni
- Hech narsani — ro'yxatlar xavfsiz
! Ro'yxatlar — kirish nazoratida eng ko'p unutiladigan joylardan.

? Ma'lum CVE'larning tuzatish commit'larini o'qish nima beradi?
+ Haqiqiy zaifliklar qanday ko'rinishini, ularning to'g'ri tuzatilishini va ko'rib chiqish ro'yxati uchun yangi naqshlarni
- Faqat Git'ni o'rganish
- Faqat sertifikat
- Hech narsa
! Boshlang'ich uchun eng yaxshi mashqlardan biri.

? Ochiq kodli loyihada yangi zaiflik topsangiz, nima qilish kerak?
+ Loyihaning SECURITY.md'dagi tartib bo'yicha xususiy xabar berish (mas'uliyatli oshkor qilish)
- Darhol ijtimoiy tarmoqda e'lon qilish
- Zaiflikdan foydalanish
- Hech kimga aytmaslik
! Ommaviy e'lon tuzatish chiqmaguncha foydalanuvchilarni xavf ostida qoldiradi.

? Yaxshi kod ko'rib chiqish izohining tuzilishi qanday?
+ Daraja → joy → muammo → ta'sir → tuzatish → test
- Faqat “bu xavfsiz emas”
- Faqat zaiflik nomi
- Dasturchini tanqid qilish
! Aniq izoh tez va to'g'ri tuzatishga olib keladi.

? Kod ko'rib chiqishda dasturchilar bilan muloqot qanday bo'lishi kerak?
+ Hamkor ohangida, o'rgatuvchi — muammo, sabab va yechim bilan; yaxshi kodni ham ta'kidlash
- Ayblovchi — xatolarni qattiq tanqid qilish
- Faqat rahbar orqali
- Izohsiz rad etish
! Ayblovchi ohang odamlarni xavfsizlik jamoasidan qochishga o'rgatadi.
:::

:::cards
Qo'lda kod ko'rib chiqish nimada kuchli? :: Kirish nazorati, biznes mantiq, kriptografiya, dizayn va kontekst — skanerlar ko'rmaydigan narsalar.
Manbadan sink'gacha? :: Ishonchsiz ma'lumot kirgan joydan xavfli amalgacha kuzatish: tekshiruv, kodlash, ruxsat bormi?
Manbadan oldinga va sink'dan orqaga? :: Oldinga — kichik o'zgarishlar uchun; orqaga — katta notanish kod uchun (sink'lar kamroq).
Asosiy issiq nuqtalar? :: execute(f", shell=True, eval, render_template_string, |safe, Markup, ID'li marshrutlar, csrf.exempt, md5/random, verify=False, requests.get(user_url), pickle/yaml.load, open/send_file, redirect(next).
Notanish kodni ko'rib chiqish tartibi? :: Tushunish → xarita → markaziy mexanizmlar → issiq nuqtalar → biznes mantiq → hisobot.
Markaziy mexanizm afzalligi? :: Bir marta chuqur tekshiriladi, keyin har joyda faqat chaqirilgani tekshiriladi; yo'qligi — topilma.
PR ko'rib chiqish savollari? :: Yangi kirish nuqtasi? Yangi sink? Ruxsat o'zgardimi? Himoya o'chirildimi? Yangi bog'liqlik? Sirlar? Testlar?
Diff tuzoqlari? :: O'chirilgan qatorlar, kontekstsiz ko'rish, test fayllaridagi skip, konfiguratsiya fayllari.
Ma'lum CVE'lardan o'rganish? :: Advisory'ni o'qish → tuzatish commit'ini topish → diff'ni tahlil qilish → “men topardimmi?” → writeup.
Yangi zaiflik topilsa? :: SECURITY.md bo'yicha xususiy xabar — mas'uliyatli oshkor qilish.
Yaxshi izoh tuzilishi? :: Daraja → joy → muammo → ta'sir → tuzatish → test.
Kod ko'rib chiqishning uch savoli? :: Ma'lumot qayerdan qayerga? Ruxsat qayerda va shu yerda chaqirilganmi? Qaysi himoya olib tashlandi?
:::
