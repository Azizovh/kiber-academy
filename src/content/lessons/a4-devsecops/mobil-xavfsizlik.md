a2 bosqichidagi API darsida Qaydnoma'ning mobil ilovasi paydo bo'ldi. Dasturchi mamnun: "Mobil ilova ichidagi kodni hech kim ko'rmaydi — u telefonda, kompilyatsiya qilingan." Shuning uchun u ilova ichiga API'ning administrator kalitini, analitika xizmati tokenini va "faqat ichki" test endpointlari manzillarini qo'yib qo'ydi.

Lekin Android ilovasi (`.apk` fayl) — aslida **ZIP arxiv**. Uni yuklab olish, ochish va ichidagi kodni deyarli asl holiga qaytarish mumkin — bepul vositalar bilan, bir necha daqiqada. Ilova ichidagi har qanday narsa — **foydalanuvchi qo'lida**.

Bu darsda mobil ilovalar xavfsizligining asoslarini ko'rasiz: mobil platformaning o'ziga xosliklari, OWASP MASVS standarti, APK'ni ochib, ichini ko'rish va eng keng tarqalgan xatolar. Asosiy g'oya a1 bosqichidan tanish: **mijoz — foydalanuvchi nazoratida**, faqat endi mijoz — telefon.

## Mobil ilovada nima boshqacha

| Web ilova | Mobil ilova |
|---|---|
| Kod asosan serverda; brauzerga faqat frontend | Ilova kodining katta qismi **foydalanuvchi qurilmasida** |
| Har bir yuklashda serverning joriy versiyasi | Foydalanuvchilar **eski versiyalar**ni oylab ishlatadi — tuzatish hammaga yetib bormaydi |
| Brauzer xavfsizlik modeli (SOP, CSP) | Operatsion tizim modeli: **ruxsatlar**, sandbox, ilovalararo aloqa |
| Ma'lumot asosan serverda | Ma'lumot **qurilmada saqlanishi** mumkin — fayllar, baza, kesh |
| Tarmoq — brauzer orqali | Ilova o'zi tarmoq bilan ishlaydi — TLS'ni to'g'ri tekshirish ilova zimmasida |
| — | Qurilma yo'qolishi, o'g'irlanishi, root/jailbreak qilinishi mumkin |

Eng muhim xulosa — a2 bosqichidagi API darsidan: **mobil ilova — API'ning bir mijozi xolos.** Haqiqiy himoya serverda: autentifikatsiya, avtorizatsiya, kiritishni tekshirish. Mobil ilovadagi har qanday tekshiruv (masalan, "Pro funksiyasi faqat to'laganlarga ko'rinadi") — UI qulayligi, xavfsizlik emas.

## OWASP MASVS va MASTG

a3 bosqichidagi ASVS'ning mobil ekvivalenti — **OWASP MAS** loyihasi:

| Hujjat | Nima |
|---|---|
| **MASVS** (Mobile Application Security Verification Standard) | **Nima** tekshirilishi kerak — talablar |
| **MASTG** (Mobile Application Security Testing Guide) | **Qanday** tekshiriladi — batafsil sinash usullari |
| **MAS Checklist** | MASVS talablari va MASTG testlari bog'langan ro'yxat |

MASVS toifalari:

| Toifa | Nima haqida | Qaydnoma mobil ilovasida savol |
|---|---|---|
| **MASVS-STORAGE** | Maxfiy ma'lumotni qurilmada xavfsiz saqlash | Token qayerda saqlanadi? Qaydlar keshida shifrlanganmi? |
| **MASVS-CRYPTO** | Kriptografiyadan to'g'ri foydalanish | a2 bosqichidagi kriptografik xatolar — mobil kontekstda |
| **MASVS-AUTH** | Autentifikatsiya va avtorizatsiya | Server tomonda tekshiriladimi? Biometrik kirish to'g'ri joriy etilganmi? |
| **MASVS-NETWORK** | Tarmoq aloqasi xavfsizligi | Faqat HTTPS? Sertifikat tekshiriladimi? |
| **MASVS-PLATFORM** | Platforma bilan xavfsiz o'zaro aloqa | Boshqa ilovalar Qaydnoma komponentlarini chaqira oladimi? WebView? |
| **MASVS-CODE** | Xavfsiz kod va bog'liqliklar | Kiritishni tekshirish, eskirgan kutubxonalar (a3 bosqichidagi SCA) |
| **MASVS-RESILIENCE** | Teskari muhandislik va o'zgartirishga chidamlilik | Faqat yuqori xavfli ilovalar uchun (bank, to'lov) |
| **MASVS-PRIVACY** | Foydalanuvchi maxfiyligi | Qanday ma'lumot yig'iladi, kimga yuboriladi? |

Curriculum'dagi maqsad — "MASVS toifalarini bilaman" — shu jadval.

## APK ichiga qarash

Android ilovasini tahlil qilish — b3 bosqichidagi statik tahlil darsining mobil versiyasi.

:::warn
**Faqat o'zingizning ilovangizni yoki tahlil qilishga ruxsat berilgan ilovalarni tahlil qiling.** O'z Qaydnoma ilovangiz, ataylab zaif qilib yaratilgan o'quv ilovalari (pastda) yoki rasmiy bug bounty dasturi qamrovidagi ilovalar. Begona tijoriy ilovalarni ochish ko'pincha foydalanish shartlariga zid va ba'zi mamlakatlarda qonun bilan cheklangan. b3 bosqichidagi malware tahlili qoidalari ham amal qiladi: notanish APK'larni faqat izolyatsiyalangan muhitda.
:::

### APK tuzilishi

```
qaydnoma.apk  (ZIP arxiv)
├── AndroidManifest.xml      ← ilova "pasporti": ruxsatlar, komponentlar, sozlamalar (binar XML)
├── classes.dex              ← kompilyatsiya qilingan kod (Dalvik bytecode)
├── classes2.dex ...
├── resources.arsc           ← kompilyatsiya qilingan resurslar (matnlar, sozlamalar)
├── res/                     ← rasmlar, layout'lar
├── assets/                  ← ilova bilan birga keladigan ixtiyoriy fayllar
├── lib/                     ← native kutubxonalar (.so)
└── META-INF/                ← imzo
```

### Vositalar

| Vosita | Nima qiladi |
|---|---|
| **jadx** (jadx-gui) | `.dex` kodini o'qiladigan Java kodiga qaytaradi — grafik interfeys bilan qidiruv |
| **apktool** | Manifest va resurslarni o'qiladigan XML'ga ochadi |
| **MobSF** (Mobile Security Framework) | Avtomatik statik (va dinamik) tahlil — hisobot bilan; Docker'da ishga tushadi |
| **strings** / **grep** | b3 bosqichidagi kabi — tez qidiruv |

```bash
# Kodni Java'ga qaytarish
jadx -d qaydnoma_src qaydnoma.apk

# Manifest va resurslarni ochish
apktool d qaydnoma.apk -o qaydnoma_res

# Tez qidiruv: kalitlar, tokenlar, URL'lar (b3 bosqichidagi satrlar tahlili)
grep -rniE "api[_-]?key|secret|token|password|https?://" qaydnoma_src/ qaydnoma_res/

# MobSF — avtomatik tahlil (brauzerda http://localhost:8000)
docker run -it --rm -p 8000:8000 opensecurity/mobile-security-framework-mobsf:latest
```

Kod obfuskatsiya qilingan bo'lsa (masalan, R8/ProGuard bilan — sinf va funksiya nomlari `a`, `b`, `c` ga aylanadi), o'qish qiyinroq — lekin satrlar (URL'lar, kalitlar) ko'pincha baribir ochiq qoladi. **Obfuskatsiya — sirni yashirish usuli emas.**

## Keng tarqalgan xatolar

### 1. Ilova ichidagi sirlar (MASVS-STORAGE / CODE)

Dars boshidagi holat. Ilova ichidagi **har qanday** kalit — ommaviy kalit (a3 bosqichidagi sirlarni boshqarish darsidagi "frontend va mobil kod" qatori).

| Noto'g'ri | To'g'ri |
|---|---|
| API administrator kaliti ilovada | Ilova faqat **foydalanuvchining o'z tokeni** bilan ishlaydi (login orqali olingan); maxfiy amallar — serverda |
| Uchinchi tomon xizmati maxfiy kaliti ilovada | Chaqiruv backend orqali — kalit serverda |
| "Kalitni shifrlab qo'yamiz" | Shifrlash kaliti ham ilovada — demak, u ham ochiladi |

Ba'zi kalitlar ataylab **ommaviy** bo'lishi uchun mo'ljallangan (masalan, faqat sizning ilovangiz paketi uchun cheklangan xarita kaliti) — farq: ular bilan maxfiy amal qilib bo'lmaydi.

### 2. Xavfsiz bo'lmagan saqlash (MASVS-STORAGE)

| Noto'g'ri | To'g'ri |
|---|---|
| Token yoki parol `SharedPreferences` da (oddiy matn) | **Android Keystore** / iOS **Keychain** asosidagi xavfsiz saqlash (masalan, `EncryptedSharedPreferences`) |
| Maxfiy ma'lumot loglarda (`Log.d`) | Ishlab chiqarishda maxfiy loglar yo'q (a2 bosqichidagi loglash qoidasi) |
| Qaydlar keshi — ochiq fayllarda | Faqat kerakli minimum; shifrlangan; chiqishda tozalanadi |
| Ilova zaxira nusxaga hamma narsani beradi | `android:allowBackup` va zaxira qoidalarini ongli sozlash |

### 3. Manifest sozlamalari (MASVS-PLATFORM / CODE)

`AndroidManifest.xml` da qidiriladigan narsalar:

| Sozlama | Nega muhim |
|---|---|
| `android:debuggable="true"` | Ishlab chiqarishda — debugger ulash va ilova ichini boshqarish imkoni (a2 bosqichidagi debug rejimi muammosining mobil versiyasi) |
| `android:allowBackup="true"` | Ilova ma'lumotlari zaxira orqali olinishi mumkin |
| `android:usesCleartextTraffic="true"` | Shifrlanmagan HTTP'ga ruxsat |
| `android:exported="true"` komponentlar | Boshqa ilovalar bu Activity, Service yoki BroadcastReceiver'ni chaqira oladi — ichki funksiyalar tashqariga ochiladi |
| Keraksiz ruxsatlar (`READ_CONTACTS`, `ACCESS_FINE_LOCATION`) | Hujum yuzasi va maxfiylik (MASVS-PRIVACY) |

### 4. Tarmoq (MASVS-NETWORK)

- Faqat **HTTPS**; Android'da **Network Security Config** bilan shifrlanmagan trafikni taqiqlash.
- Sertifikat tekshiruvini **o'chirmaslik** — a2 bosqichidagi `verify=False` muammosining mobil versiyasi ("barcha sertifikatlarga ishonadigan" maxsus TrustManager — klassik xato).
- **Certificate pinning** — ilova faqat ma'lum sertifikat yoki kalitga ishonadi. Yuqori xavfli ilovalarda (bank) qo'shimcha himoya; lekin noto'g'ri boshqarilsa (sertifikat almashtirilganda) ilovani ishlamay qoldirishi mumkin — ehtiyotkorlik bilan.

### 5. WebView (MASVS-PLATFORM)

Ko'p ilovalar ichida web sahifalarni **WebView** orqali ko'rsatadi. Xavf: WebView'da JavaScript yoqilgan va ilovaning native funksiyalari JavaScript'ga ochilgan bo'lsa (`addJavascriptInterface`), WebView'dagi XSS yoki zararli sahifa ilova funksiyalarini chaqira oladi. Qoida: WebView'da faqat ishonchli kontent; JavaScript faqat kerak bo'lsa; native interfeyslarni minimal va tekshirilgan holda ochish. a2 bosqichidagi XSS darsi — endi XSS'ning oqibati brauzer emas, ilova ichida.

## Dinamik tahlil — qisqa tanishuv

Statik tahlildan tashqari, ilovani **ishlab turgan holda** kuzatish mumkin — b3 bosqichidagi dinamik tahlilning mobil versiyasi:

| Usul | Nima beradi |
|---|---|
| **Emulyator** (Android Studio) | Izolyatsiyalangan sinov qurilmasi |
| **Proxy** (ZAP yoki Burp) | Ilova va server orasidagi trafikni ko'rish — API so'rovlari (a3 bosqichidagi DAST) |
| **Fayl tizimini kuzatish** | Ilova qurilmaga nima yozadi — `adb shell` orqali emulyatorda |
| **Instrumentatsiya** (masalan, Frida) | Ish vaqtida funksiyalarni kuzatish — MASTG'da batafsil, ilg'or mavzu |

Bitta amaliy nuance: zamonaviy Android ilovalari standart holatda foydalanuvchi o'rnatgan sertifikatlarga (masalan, proxy sertifikatiga) ishonmaydi. O'z ilovangizni sinash uchun debug build'da Network Security Config orqali bunga ruxsat beriladi — ishlab chiqarish build'ida emas.

Va eng muhimi: mobil ilova trafigini ko'rganingizda — siz **API**ni ko'rasiz. Ko'p "mobil zaifliklar" aslida **API zaifliklari** (BOLA, mass assignment — a2 bosqichi), shunchaki mobil ilova orqali topilgan.

:::key
**Mobil ilova — foydalanuvchi qo'lidagi kod.** Uni ochish, o'qish, o'zgartirish va trafigini ko'rish mumkin — shuning uchun undagi hech narsa sir emas va undagi hech qanday tekshiruv xavfsizlik emas. Mobil xavfsizlikning asosiy qoidalari: **sirlar ilovada emas, serverda; haqiqiy himoya — API'da; qurilmada saqlanadigan ma'lumot — minimal va Keystore/Keychain bilan; tarmoq — faqat HTTPS, tekshiruv yoqiq; manifest — debug yo'q, keraksiz eksport va ruxsatlar yo'q.** MASVS — tekshiruv ro'yxati, MobSF — birinchi avtomatik qadam.
:::

## Mashq ilovalari

Ataylab zaif qilib yaratilgan, o'rganish uchun mo'ljallangan ilovalar:

| Ilova | Platforma | Izoh |
|---|---|---|
| **OWASP MASTG ilovalari** (MASTestApp va boshqalar) | Android, iOS | MASTG testlariga mos namunalar |
| **InsecureBankv2** | Android | Klassik o'quv ilovasi |
| **DIVA** (Damn Insecure and Vulnerable App) | Android | Toifalar bo'yicha topshiriqlar |

Ularni faqat **emulyatorda** yoki maxsus sinov qurilmasida ishga tushiring.

## Bu dars nimani bermaydi

- **iOS tahlilini batafsil** — tamoyillar o'xshash, vositalar boshqa (MASTG'da iOS bo'limlari).
- **Chuqur reverse engineering va instrumentatsiyani** — bu alohida mutaxassislik.
- **Mobil ilova yozishni** — Android/iOS dasturlash alohida soha.

:::try
**1. MASVS.** OWASP MAS sahifasidan MASVS'ni oching va har bir toifadan bitta talabni o'qing. Qaydnoma mobil ilovasi uchun har bir toifada bitta savol yozing.

**2. APK ichiga qarash.** Mashq ilovalaridan birini (masalan, InsecureBankv2) yuklab oling va jadx-gui bilan oching. `grep` bilan kalitlar, tokenlar va URL'larni qidiring. Nimani topdingiz?

**3. Manifest.** Xuddi shu ilovani `apktool d` bilan oching va `AndroidManifest.xml` ni o'qing: `debuggable`, `allowBackup`, `usesCleartextTraffic`, `exported` komponentlar bormi? Har biri qanday xavf tug'diradi?

**4. MobSF.** MobSF'ni Docker'da ishga tushiring va mashq ilovasini yuklang. Hisobotdagi eng muhim 5 ta topilmani MASVS toifalariga bog'lang.

**5. Fikr tajribasi.** Qaydnoma mobil ilovasida "Pro" funksiyalari ilova ichida `isPro` o'zgaruvchisi bilan yoqiladi. Nega bu himoya emas va to'g'ri dizayn qanday?

*Javob (5): foydalanuvchi ilovani o'zgartirib yoki ish vaqtida qiymatni almashtirib `isPro = true` qila oladi; to'g'ri dizayn — Pro huquqi **serverda** tekshiriladi: Pro funksiyasining ma'lumoti yoki amali faqat server foydalanuvchining obunasini tasdiqlagandan keyin beriladi (a2 bosqichidagi biznes mantiq va kirish nazorati). Ilovadagi `isPro` faqat UI'ni boshqaradi.*
:::

## Xulosa

- Mobil ilova — **foydalanuvchi qurilmasidagi kod**: ochiladi, o'qiladi, o'zgartiriladi; eski versiyalar oylab ishlatiladi.
- **Mobil ilova — API'ning bir mijozi**: haqiqiy himoya serverda; ilovadagi tekshiruvlar — faqat UI.
- **OWASP MASVS** (nima) va **MASTG** (qanday): STORAGE, CRYPTO, AUTH, NETWORK, PLATFORM, CODE, RESILIENCE, PRIVACY.
- APK — ZIP: **jadx** (kod), **apktool** (manifest, resurslar), **MobSF** (avtomatik tahlil), `grep`; obfuskatsiya sirni yashirmaydi.
- Keng tarqalgan xatolar: **ilova ichidagi sirlar**, xavfsiz bo'lmagan saqlash (**Keystore/Keychain** o'rniga oddiy matn), **manifest** (`debuggable`, `allowBackup`, cleartext, `exported`), sertifikat tekshiruvini o'chirish, xavfli **WebView**.
- Dinamik tahlil: emulyator, proxy (ko'pincha topilma — **API zaifligi**), fayl tizimi.
- Faqat o'z yoki ruxsat etilgan ilovalarni tahlil qiling.

:::quiz
? Nega mobil ilova ichidagi API kaliti sir emas?
+ APK'ni ochib, kodini va satrlarini o'qish mumkin — ilova ichidagi har qanday narsa foydalanuvchi qo'lida
- Mobil ilovalar shifrlangan, shuning uchun kalit xavfsiz
- Kalitni faqat Google ko'ra oladi
- Obfuskatsiya kalitni to'liq yashiradi
! Maxfiy chaqiruvlar backend orqali, kalit serverda.

? Mobil ilova xavfsizligining asosiy tamoyili qaysi?
+ Mobil ilova — API'ning bir mijozi; haqiqiy autentifikatsiya, avtorizatsiya va tekshiruvlar serverda bo'lishi kerak
- Barcha tekshiruvlar ilova ichida bo'lishi kifoya
- Server tekshiruvlari mobil ilovalar uchun kerak emas
- Faqat obfuskatsiya yetarli
! Ilovadagi tekshiruv — UI qulayligi, xavfsizlik emas.

? OWASP MASVS va MASTG farqi nima?
+ MASVS — nima tekshirilishi kerak (talablar); MASTG — qanday tekshiriladi (sinash qo'llanmasi)
- Ular bir xil hujjat
- MASVS — faqat iOS, MASTG — faqat Android
- MASTG — sertifikat
! ASVS'ning mobil ekvivalenti.

? APK fayli aslida nima?
+ Manifest, kompilyatsiya qilingan kod (.dex), resurslar va imzoni o'z ichiga olgan ZIP arxiv
- Shifrlangan disk tasviri
- Faqat rasm fayli
- Ochib bo'lmaydigan ikkilik fayl
! jadx kodni, apktool manifest va resurslarni ochadi.

? Android'da token kabi maxfiy ma'lumotni qayerda saqlash to'g'ri?
+ Android Keystore asosidagi xavfsiz saqlashda (masalan, EncryptedSharedPreferences)
- Oddiy SharedPreferences'da ochiq matn sifatida
- Loglarda
- SD-kartadagi faylda
! MASVS-STORAGE toifasi.

? AndroidManifest.xml'da qaysi sozlamalar ishlab chiqarishda xavf belgisi?
+ android:debuggable="true"
+ android:usesCleartextTraffic="true"
- android:minSdkVersion
- Ilova nomi
! Keraksiz exported komponentlar va allowBackup ham tekshiriladi.

? Mobil ilovada barcha sertifikatlarga ishonadigan maxsus TrustManager qanday xavf tug'diradi?
+ TLS sertifikat tekshiruvi o'chadi — o'rtadagi hujumchi trafikni o'qishi va o'zgartirishi mumkin
- Ilova tezroq ishlaydi
- Hech qanday xavf yo'q
- Faqat batareya tez tugaydi
! a2 bosqichidagi verify=False muammosining mobil versiyasi.

? WebView'da addJavascriptInterface bilan native funksiyalarni ochishning xavfi nima?
+ WebView'dagi XSS yoki zararli sahifa ilovaning native funksiyalarini chaqira oladi
- WebView sekinlashadi
- Rasm ko'rinmaydi
- Bu faqat iOS muammosi
! Faqat ishonchli kontent va minimal, tekshirilgan interfeyslar.

? Mobil ilova trafigini proxy orqali kuzatganda topilgan ko'p zaifliklar aslida nima?
+ API zaifliklari (BOLA, mass assignment) — shunchaki mobil ilova orqali topilgan
- Faqat telefon apparat xatolari
- Faqat dizayn xatolari
- Mobil zaifliklar mavjud emas
! Server tomonidagi tuzatish kerak.

? Obfuskatsiya (R8/ProGuard) haqida qaysi gap to'g'ri?
+ U kodni o'qishni qiyinlashtiradi, lekin sirlarni yashirish usuli emas — satrlar ko'pincha ochiq qoladi
- U barcha sirlarni to'liq himoyalaydi
- U ilovani tahlil qilib bo'lmaydigan qiladi
- U serverni himoyalaydi
! Sirlar ilovada bo'lmasligi kerak.
:::

:::cards
Mobil ilovada nima boshqacha? :: Kod foydalanuvchi qurilmasida, eski versiyalar uzoq ishlatiladi, OS ruxsatlari va sandbox, qurilmada saqlash, ilova o'zi TLS'ni tekshiradi.
Mobil xavfsizlikning asosiy tamoyili? :: Mobil ilova — API'ning bir mijozi; haqiqiy himoya serverda.
MASVS va MASTG? :: MASVS — talablar (nima); MASTG — sinash qo'llanmasi (qanday); MAS Checklist — ularni bog'laydi.
MASVS toifalari? :: STORAGE, CRYPTO, AUTH, NETWORK, PLATFORM, CODE, RESILIENCE, PRIVACY.
APK tuzilishi? :: ZIP: AndroidManifest.xml, classes.dex, resources.arsc, res/, assets/, lib/, META-INF/.
APK tahlil vositalari? :: jadx (kod), apktool (manifest, resurslar), MobSF (avtomatik tahlil), grep/strings.
Ilova ichidagi sirlar? :: Har qanday kalit ommaviy; maxfiy chaqiruvlar backend orqali; obfuskatsiya yashirmaydi.
Xavfsiz saqlash? :: Android Keystore/EncryptedSharedPreferences, iOS Keychain; maxfiy loglar yo'q; minimal kesh.
Manifestdagi xavf belgilari? :: debuggable="true", allowBackup="true", usesCleartextTraffic="true", keraksiz exported komponentlar va ruxsatlar.
Mobil tarmoq xavfsizligi? :: Faqat HTTPS, Network Security Config, sertifikat tekshiruvini o'chirmaslik, pinning — ehtiyotkorlik bilan.
WebView xavfi? :: JS yoqilgan va addJavascriptInterface ochilgan bo'lsa, XSS native funksiyalarni chaqiradi.
Mobil mashq ilovalari? :: OWASP MASTG ilovalari, InsecureBankv2, DIVA — faqat emulyatorda.
:::
