Mahsulot egasi yangi funksiya uchun vazifa yozdi: "Foydalanuvchilar fayl yuklay olishi kerak. Xavfsiz bo'lsin." Dasturchi uni bajardi. Pentester ikki oydan keyin keldi: yuklangan HTML fayl brauzerda ochiladi (XSS), fayl hajmi cheklanmagan, begona fayllarni ID bo'yicha yuklab olish mumkin.

Kim aybdor? Dasturchi "xavfsiz bo'lsin" degan talabni bajardi — u qanday tushungan bo'lsa. Muammo — talabning o'zida: **"xavfsiz bo'lsin" tekshirib bo'lmaydi.** Dasturchi nima qilish kerakligini bilmagan, tester nimani tekshirishni bilmagan, va hech kim "tayyor"ni qanday aniqlashni bilmagan.

Bu darsda xavfsizlikni **aniq, tekshirsa bo'ladigan talablar**ga aylantirishni o'rganasiz — va buning uchun sohadagi eng foydali manbani: **OWASP ASVS**.

## Yaxshi va yomon talablar

| Yomon | Nega yomon | Yaxshi |
|---|---|---|
| "Ilova xavfsiz bo'lishi kerak" | Tekshirib bo'lmaydi | (bu talab emas — maqsad) |
| "Parollar himoyalangan bo'lsin" | Qanday? | "Parollar Argon2id bilan, OWASP tavsiya etgan minimal parametrlardan kam bo'lmagan holda xeshlanadi" |
| "Fayl yuklash xavfsiz bo'lsin" | Nima xavfsiz? | "Yuklangan fayllar: hajmi ≤ 5 MB; turi mazmun bo'yicha PNG/JPEG/PDF; tasodifiy nom bilan veb-ildizdan tashqarida saqlanadi; `Content-Disposition: attachment` va `nosniff` bilan beriladi" |
| "Hujumchilar kira olmasin" | Salbiy, cheksiz | "Login urinishlari IP bo'yicha daqiqasiga 5 ta bilan cheklanadi; 6-urinish 429 qaytaradi" |
| "Eng yaxshi amaliyotlarga amal qilinsin" | Qaysi? | "ASVS 2-daraja talablari bajariladi (istisnolar ro'yxati ilovada)" |

Yaxshi xavfsizlik talabining belgilari:

| Belgi | Savol |
|---|---|
| **Aniq** | Ikki xil odam uni bir xil tushunadimi? |
| **Tekshirsa bo'ladigan** | Bajarilganini test, kod ko'rib chiqish yoki skaner bilan isbotlash mumkinmi? |
| **Amalga oshiriladigan** | Dasturchi nima qilish kerakligini biladimi? |
| **Asoslangan** | Qaysi tahdidga qarshi? (threat modeling darsi) |
| **Texnologiyaga moslashuvchan** | "Nima" ni aytadimi, "qanday"ni haddan tashqari cheklamasdan? |

Oxirgi qator — muvozanat: "parollar xavfsiz saqlanadi" — juda umumiy; "Argon2id, xotira X MiB, iteratsiya Y" — ba'zan kerak, lekin odatda "OWASP Password Storage tavsiyalariga mos" — yetarli va eskirmaydi.

## OWASP ASVS

**[[asvs|ASVS]]** (Application Security Verification Standard) — web ilovalar xavfsizligi uchun **tekshirsa bo'ladigan talablar katalogi**. Har bir talab — bitta aniq jumla, raqam bilan. U uch xil maqsadda ishlatiladi:

| Maqsad | Qanday |
|---|---|
| **Talablar manbai** | Loyiha uchun xavfsizlik talablarini noldan o'ylab topish o'rniga — tayyor katalogdan tanlash |
| **Tekshiruv standarti** | Pentest yoki kod ko'rib chiqishda "nimani tekshirish kerak" ro'yxati |
| **Shartnoma va xarid** | Tashqi ishlab chiquvchidan "ASVS 2-darajaga mos" talab qilish |

### Darajalar

| Daraja | Kim uchun | Izoh |
|---|---|---|
| **L1** | Barcha ilovalar — minimal daraja | Eng muhim, keng tarqalgan zaifliklarga qarshi |
| **L2** | Maxfiy ma'lumot bilan ishlaydigan ko'p ilovalar — **tavsiya etilgan standart** | Biznes ilovalari, shaxsiy ma'lumotlar, ko'pchilik loyihalar |
| **L3** | Eng muhim ilovalar | Bank, tibbiyot, kritik infratuzilma — chuqur himoya va tekshiruv |

Qaydnoma — foydalanuvchilarning shaxsiy qaydlari bilan ishlaydi → **L2** mos maqsad.

### Tuzilishi

ASVS boblarga (mavzular bo'yicha) bo'lingan: autentifikatsiya, sessiya boshqaruvi, kirish nazorati, kiritishni tekshirish va kodlash, kriptografiya, xatolar va loglash, ma'lumotlar himoyasi, aloqa xavfsizligi, biznes mantiq, fayllar, API, konfiguratsiya va boshqalar. Har bir talabning raqami (masalan, `V3.4.1` ko'rinishida) va qaysi darajaga tegishliligi ko'rsatiladi.

:::info
**Versiyaga e'tibor bering.** ASVS'ning bir nechta versiyasi keng ishlatiladi (masalan, 4.0.3 va undan keyingi 5.0), va ular orasida boblar tartibi, talab raqamlari va hatto darajalar mazmuni o'zgargan. Talabga havola berganda doim versiyani ko'rsating: "ASVS 5.0 V…" yoki "ASVS 4.0.3 V…". Aks holda "V3.4.1" ikki versiyada ikki xil narsani anglatishi mumkin. Har doim rasmiy OWASP sahifasidagi joriy versiyani oching.
:::

ASVS talablari a1–a2 bosqichlarida o'rganganlaringizga to'g'ridan-to'g'ri mos keladi. Masalan, mavzular bo'yicha (raqamlarsiz, versiyadan qat'i nazar):

| Mavzu | ASVS talabi mazmuni (taxminiy) | Qaydnoma'dagi amalga oshirilishi |
|---|---|---|
| Parollar | Parollar xavfsiz, sekin, tuzli funksiya bilan saqlanadi | Argon2id / werkzeug (a1) |
| Sessiya | Kirishda yangi sessiya tokeni; cookie'lar Secure, HttpOnly, SameSite | `session.clear()`, cookie sozlamalari (a1) |
| Kirish nazorati | Ruxsatlar serverda, har so'rovda, standart — rad etish | `can()`, `load_note()` (a2) |
| Injection | Parametrlangan so'rovlar yoki xavfsiz API | `?` parametrlar (a1–a2) |
| Chiqishni kodlash | Kontekstga mos kodlash; CSP | Jinja2, `tojson`, nonce CSP (a1–a2) |
| Xatolar | Foydalanuvchiga umumiy xabar, tafsilotlar logda | Xato sahifalari (a2) |
| Sirlar | Sirlar kodda emas | Muhit, sirlar ombori (shu bosqich) |

## Talablarni ishlab chiqish jarayoniga kiritish

Talab hujjatda qolib ketsa — foydasiz. U ishlab chiqish jarayonining **har bir bosqichida** ko'rinishi kerak:

```
 Loyihalash ──► Vazifa (user story) ──► Kod ──► Kod ko'rib chiqish ──► Testlar / CI ──► Pentest
      │               │                  │            │                    │              │
 Threat model    Xavfsizlik          Dasturchi    Ko'rib chiqish       Avtomatik       ASVS bo'yicha
 + ASVS          qabul mezonlari     biladi       ro'yxati             tekshiruvlar    tekshiruv
 darajasi
```

### Xavfsizlik qabul mezonlari

Har bir vazifaga — oddiy qabul mezonlari bilan birga — **xavfsizlik qabul mezonlari**:

```markdown
## Vazifa: Qaydga fayl biriktirish

**Foydalanuvchi sifatida** qaydimga fayl biriktira olishni xohlayman, **toki** materiallarni bir joyda saqlay olay.

### Qabul mezonlari
- Qayd sahifasida "Fayl biriktirish" tugmasi bor; yuklangan fayllar ro'yxatda ko'rinadi.

### Xavfsizlik qabul mezonlari
- [ ] Faqat qayd egasi va "tahrirlash" huquqli foydalanuvchilar fayl yuklay oladi; o'qish huquqlilar — faqat yuklab oladi (load_note + Action).
- [ ] Fayl hajmi ≤ 5 MB; kattaroq — 413.
- [ ] Ruxsat etilgan turlar: PNG, JPEG, PDF — kengaytma emas, mazmun (magic bytes) bo'yicha tekshiriladi.
- [ ] Fayl tasodifiy nom bilan, veb-ildizdan tashqarida saqlanadi; asl nom faqat bazada.
- [ ] Yuklab olishda: `Content-Disposition: attachment`, to'g'ri `Content-Type`, `X-Content-Type-Options: nosniff`.
- [ ] Foydalanuvchi boshqa birovning faylini ID bo'yicha yuklab ololmaydi (matritsa testiga qatorlar qo'shilgan).
- [ ] Har bir mezon uchun avtomatik test bor.

Tahdid modeli: docs/threat-model.md#fayl-biriktirish   ASVS: fayllar va kirish nazorati boblari (L2)
```

Bu formatda dasturchi **nima** qilishni biladi, tester **nimani** tekshirishni biladi, va "tayyor" — barcha belgilar qo'yilganda.

### Suiiste'mol holatlari (abuse cases)

Biznes mantiq darsidagi g'oya — talablar yozishda ham: har bir "foydalanuvchi sifatida..." hikoyasiga bitta yoki ikkita "**hujumchi sifatida...**" hikoyasi:

| Foydalanish holati | Suiiste'mol holati | Talab |
|---|---|---|
| Foydalanuvchi qaydini do'sti bilan ulashadi | Hujumchi o'zini birovning qaydiga "ulashilgan" qilib qo'shadi | Faqat egasi `SHARE` amalini bajaradi |
| Foydalanuvchi profil rasmini yuklaydi | Hujumchi rasm o'rniga HTML/SVG yuklab, XSS qiladi | Tur mazmun bo'yicha; `attachment`; SVG taqiqlangan yoki sanitizatsiya qilinadi |
| Foydalanuvchi parolini tiklaydi | Hujumchi minglab tiklash xatlarini yuboradi | Email/IP bo'yicha rate limiting |

## Qaydnoma uchun talablar hujjati

Bosqich oxirida Qaydnoma omborida bo'lishi kerak bo'lgan hujjat (portfolio uchun ham):

```markdown
# Qaydnoma — xavfsizlik talablari

Maqsad darajasi: OWASP ASVS (versiya: …) L2.
Asos: docs/threat-model.md

| ID | Talab | ASVS bobi | Qanday tekshiriladi | Holat |
|----|-------|-----------|---------------------|-------|
| AUTH-1 | Parollar Argon2id bilan xeshlanadi | Autentifikatsiya | Kod ko'rib chiqish + unit test | ✓ |
| AUTH-2 | Login xatosi bitta umumiy xabar bilan, 401 | Autentifikatsiya | test_login_error_message_is_generic | ✓ |
| AUTH-3 | Login: IP bo'yicha 5/daqiqa | Autentifikatsiya | test_login_rate_limit | ✓ |
| SESS-1 | Sessiya cookie: Secure, HttpOnly, SameSite=Lax | Sessiya | test_session_cookie_flags | ✓ |
| ACC-1 | Barcha qayd endpointlari load_note() orqali | Kirish nazorati | Matritsa testi + Semgrep qoidasi | ✓ |
| ACC-2 | Admin qaydlarni o'qiy olmaydi | Kirish nazorati | Matritsa testi | ✓ |
| INP-1 | Barcha SQL — parametrlangan | Injection | Semgrep qoidasi (CI) | ✓ |
| OUT-1 | |safe / Markup ishlatilmaydi (sanitizatsiya funksiyasidan tashqari) | Kodlash | Semgrep qoidasi (CI) | ✓ |
| HDR-1 | CSP nonce bilan, unsafe-inline yo'q | Konfiguratsiya | test_security_headers_present + ZAP | ✓ |
| LOG-1 | Admin harakatlari audit logiga yoziladi | Loglash | test_admin_audit_log | Ochiq |
| DATA-1 | Zaxira nusxalar shifrlanadi | Ma'lumot himoyasi | Infratuzilma tekshiruvi | Qabul qilingan (2027-Q1) |
```

(Jadvaldagi `|safe` haqiqiy hujjatda `\|safe` bo'lib yoziladi — Markdown jadvali uchun.)

Har bir qatorda **"qanday tekshiriladi"** ustuni — talabni dalilga bog'laydi: test nomi, skaner qoidasi yoki qo'lda tekshiruv. Shu bosqichning keyingi darslarida (SAST, DAST, SCA) va a4 bosqichida (CI/CD) bu ustundagi tekshiruvlarning ko'pi **avtomatik** bo'ladi.

:::key
**Tekshirib bo'lmaydigan talab — talab emas, istak.** Xavfsizlik talablarining qiymati shundaki, ular "xavfsiz"ni **aniq ishlar ro'yxati**ga aylantiradi: dasturchi nima qilishni, tester nimani tekshirishni, rahbar "tayyor"ni qanday aniqlashni biladi. ASVS — noldan o'ylab topish o'rniga sohaning to'plangan tajribasi. Yo'l esa doim bir xil: **tahdid modeli → ASVS darajasi → loyiha talablari → xavfsizlik qabul mezonlari → testlar va avtomatik tekshiruvlar**.
:::

## Boshqa standartlar va ramkalar

| Standart | Nima uchun |
|---|---|
| **OWASP ASVS** | Web ilovalar — tekshirsa bo'ladigan talablar |
| **OWASP MASVS** | Mobil ilovalar — a4 bosqichidagi mobil xavfsizlik darsi |
| **OWASP SAMM** | Tashkilotning dasturiy ta'minot xavfsizligi **jarayonlari** yetukligi (a4) |
| **NIST SSDF** (SP 800-218) | Xavfsiz dasturiy ta'minot ishlab chiqish amaliyotlari — ko'pincha davlat talablari bilan bog'liq |
| **OWASP Top 10** | Xabardorlik hujjati — **talablar standarti emas** |
| **PCI DSS**, **ISO/IEC 27001** | Sanoat va tashkilot darajasidagi talablar (to'lov kartalari, axborot xavfsizligini boshqarish) |

Keng tarqalgan xato: "OWASP Top 10'ga mos" deb talab yozish. Top 10 — eng keng tarqalgan xavflar ro'yxati, xabardorlik uchun; u nima qilish kerakligini aniq aytmaydi. Talablar uchun — ASVS.

## Bu dars nimani bermaydi

- **ASVS'ning to'liq matnini** — u yuzlab talabdan iborat; rasmiy OWASP sahifasida.
- **Qonunchilik talablarini** — shaxsiy ma'lumotlar to'g'risidagi qonunlar mamlakatga qarab farq qiladi; huquqshunos bilan aniqlanadi.
- **Talablarni avtomatik tekshirishni** — keyingi darslar va a4 bosqichi.

:::try
**1. Talabni qayta yozing.** Quyidagi "talablar"ni tekshirsa bo'ladigan qilib qayta yozing: (a) "API himoyalangan bo'lsin"; (b) "Foydalanuvchi ma'lumotlari maxfiy saqlansin"; (c) "Tizim hujumlarga chidamli bo'lsin".

**2. ASVS bilan tanishing.** Rasmiy OWASP ASVS sahifasidan joriy versiyani oching. Autentifikatsiya va kirish nazorati boblaridan har biridan 5 tadan L1/L2 talabni tanlang va har biri Qaydnoma'da qanday amalga oshirilganini (yoki oshirilmaganini) yozing.

**3. Qabul mezonlari.** "Qaydni PDF'ga eksport qilish" funksiyasi uchun xavfsizlik qabul mezonlarini yozing (a2 bosqichidagi injection va SSRF darslarini eslang).

**4. Suiiste'mol holatlari.** Qaydnoma'ning 5 ta funksiyasi uchun foydalanish va suiiste'mol holatlari juftliklarini yozing.

**5. Talablar hujjati.** Yuqoridagi namuna asosida Qaydnoma uchun kamida 15 ta talabdan iborat `docs/security-requirements.md` hujjatini tuzing — har birida "qanday tekshiriladi" ustuni bilan.

*Yo'nalish (1): (a) "/api/* (health'dan tashqari) Bearer token talab qiladi, tokensiz — 401; obyekt ID'li endpointlar load_*() orqali ruxsatni tekshiradi — matritsa testi bilan"; (b) "parollar Argon2id bilan; maxfiy qaydlar Fernet bilan shifrlanadi; zaxira nusxalar shifrlanadi; maxfiy maydonlar loglarga yozilmaydi"; (c) bu talab emas — tahdid modelidan aniq tahdidlarni olib, har biri uchun alohida talab yozish kerak.*
:::

## Xulosa

- "Xavfsiz bo'lsin" — **tekshirib bo'lmaydi**; yaxshi talab: aniq, tekshirsa bo'ladigan, amalga oshiriladigan, asoslangan.
- **OWASP ASVS** — tekshirsa bo'ladigan talablar katalogi: talablar manbai, tekshiruv standarti, shartnomalar uchun.
- Darajalar: **L1** — minimal, **L2** — ko'pchilik ilovalar uchun tavsiya, **L3** — eng muhim ilovalar.
- Talabga havola berganda **ASVS versiyasini** ko'rsating.
- Jarayon: **tahdid modeli → ASVS darajasi → talablar → xavfsizlik qabul mezonlari → testlar va avtomatik tekshiruvlar**.
- Har bir vazifada **xavfsizlik qabul mezonlari**; har bir foydalanish holatiga **suiiste'mol holati**.
- Talablar hujjatida **"qanday tekshiriladi"** ustuni — talabni dalilga bog'laydi.
- **OWASP Top 10 — talablar standarti emas**; boshqa ramkalar: MASVS, SAMM, NIST SSDF.

:::quiz
? Nega “Ilova xavfsiz bo'lishi kerak” yaxshi talab emas?
+ Uni tekshirib bo'lmaydi — dasturchi nima qilishni, tester nimani tekshirishni bilmaydi
- U juda qisqa
- U ingliz tilida emas
- U juda qimmat
! Talab aniq va tekshirsa bo'ladigan bo'lishi kerak.

? Qaysi talab eng yaxshi?
+ “Login urinishlari IP bo'yicha daqiqasiga 5 ta bilan cheklanadi; 6-urinish 429 qaytaradi”
- “Hujumchilar kira olmasin”
- “Login xavfsiz bo'lsin”
- “Eng yaxshi amaliyotlarga amal qilinsin”
! Aniq qiymatlar va tekshirsa bo'ladigan natija.

? OWASP ASVS nima?
+ Web ilovalar xavfsizligi uchun tekshirsa bo'ladigan talablar standarti
- Eng keng tarqalgan 10 ta xavf ro'yxati
- Antivirus dasturi
- Dasturlash tili
! Talablar manbai, tekshiruv standarti va shartnomalar uchun ishlatiladi.

? Shaxsiy ma'lumotlar bilan ishlaydigan oddiy biznes ilovasi uchun qaysi ASVS darajasi tavsiya etiladi?
- L1
+ L2
- L3
- Hech qaysi
! L2 — ko'pchilik ilovalar uchun tavsiya etilgan standart; L3 — eng muhim ilovalar uchun.

? Nega ASVS talabiga havola berganda versiyani ko'rsatish kerak?
+ Versiyalar orasida boblar va talab raqamlari o'zgargan — bir xil raqam turli versiyada boshqa talab bo'lishi mumkin
- Versiya muhim emas
- Faqat chiroyli ko'rinishi uchun
- Bu qonun talabi
! Masalan, 4.0.3 va 5.0 tuzilishi farq qiladi.

? Xavfsizlik qabul mezonlari nima?
+ Vazifaga qo'shiladigan aniq, tekshirsa bo'ladigan xavfsizlik shartlari — ular bajarilmaguncha vazifa tayyor emas
- Foydalanuvchi interfeysi rangi
- Pentest hisoboti
- Sertifikat turi
! Dasturchi nima qilishni, tester nimani tekshirishni biladi.

? Suiiste'mol holati (abuse case) nima?
+ Foydalanish holatiga juft: “hujumchi sifatida...” — funksiyadan qanday noto'g'ri foydalanish mumkinligi
- Foydalanuvchi shikoyati
- Server xatosi
- Test muhiti
! Har bir suiiste'mol holati yangi talabga aylanadi.

? Talablar hujjatidagi “Qanday tekshiriladi” ustunining vazifasi nima?
+ Har bir talabni aniq dalilga — test, skaner qoidasi yoki qo'lda tekshiruvga bog'lash
- Hujjatni uzaytirish
- Mas'ulni ko'rsatish
- Narxni yozish
! Tekshiruvsiz talab — istak.

? “OWASP Top 10'ga mos bo'lsin” talabi haqida qaysi gap to'g'ri?
+ Top 10 — xabardorlik hujjati, talablar standarti emas; aniq talablar uchun ASVS ishlatiladi
- Bu eng aniq talab
- Top 10 ASVS'dan batafsilroq
- Top 10 faqat mobil uchun
! Top 10 nima qilish kerakligini aniq aytmaydi.

? Qaysi ketma-ketlik to'g'ri?
+ Tahdid modeli → ASVS darajasi → loyiha talablari → qabul mezonlari → testlar va avtomatik tekshiruvlar
- Testlar → tahdid modeli → kod → talablar
- Pentest → kod → talablar → tahdid modeli
- Kod → ishlab chiqarish → talablar
! Talablar tahdidlardan kelib chiqadi va dalillarga aylanadi.
:::

:::cards
Yaxshi xavfsizlik talabi belgilari? :: Aniq, tekshirsa bo'ladigan, amalga oshiriladigan, asoslangan (tahdidga bog'liq), texnologiyaga moslashuvchan.
OWASP ASVS? :: Web ilovalar uchun tekshirsa bo'ladigan xavfsizlik talablari katalogi.
ASVS'dan foydalanish maqsadlari? :: Talablar manbai, tekshiruv standarti (pentest, kod ko'rib chiqish), shartnoma va xarid talablari.
ASVS darajalari? :: L1 — minimal, barcha ilovalar; L2 — tavsiya etilgan standart; L3 — eng muhim ilovalar.
ASVS versiyasi qoidasi? :: Havola berganda versiyani ko'rsatish — boblar va raqamlar versiyalar orasida o'zgargan.
Talablar oqimi? :: Tahdid modeli → ASVS darajasi → loyiha talablari → xavfsizlik qabul mezonlari → testlar/avtomatik tekshiruvlar.
Xavfsizlik qabul mezonlari? :: Vazifadagi aniq xavfsizlik shartlari — bajarilmaguncha vazifa tayyor emas.
Suiiste'mol holati? :: “Hujumchi sifatida...” hikoyasi — har bir foydalanish holatiga juft; yangi talablarga aylanadi.
Talablar hujjati ustunlari? :: ID, talab, ASVS bobi, qanday tekshiriladi, holat.
OWASP Top 10 va ASVS farqi? :: Top 10 — xabardorlik uchun xavflar ro'yxati; ASVS — aniq tekshirsa bo'ladigan talablar.
Boshqa standartlar? :: MASVS (mobil), SAMM (jarayon yetukligi), NIST SSDF, PCI DSS, ISO/IEC 27001.
Tekshirib bo'lmaydigan talab? :: Talab emas, istak.
:::
