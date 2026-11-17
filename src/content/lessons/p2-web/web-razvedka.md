Qaydnoma pentestining to'rtinchi kuni. Ilovaning asosiy sahifalari tanish: kirish, qaydlar ro'yxati, qayd yaratish, ulashish, profil. Shu besh sahifani tekshirib, "web ilova tekshirildi" deyish mumkinmi?

Burp HTTP history'ni ochasiz va hayron qolasiz: brauzer orqali faqat besh sahifani ko'rgansiz, lekin JavaScript fayllari **37 ta** turli API yo'liga murojaat qiladi — ulardan ba'zilari interfeysda umuman ko'rinmaydi: `/api/v1/admin/export`, `/api/v1/users/{id}/sessions`, `/api/v1/debug/config`. Bundan tashqari, katalog qidiruvi `/backup/` papkasini topadi, `staging` subdomenida esa ilovaning eski versiyasi.

Topilmagan endpointni tekshirib bo'lmaydi. Web razvedkaning maqsadi — ilovaning **to'liq xaritasini** tuzish: barcha sahifalar, endpointlar, parametrlar, rollar va texnologiyalar. Keyingi darslardagi har bir zaiflik tekshiruvi shu xarita ustida bajariladi. p1 bosqichidagi OSINT va enumeratsiya — infratuzilma darajasida edi; bu dars — ilova ichida.

## Xarita: nimani to'playmiz

| Nima | Nega |
|---|---|
| Barcha sahifalar va API endpointlari | Har biri — alohida tekshiruv nuqtasi |
| HTTP metodlari (GET, POST, PUT, PATCH, DELETE) | Bir yo'lda turli metodlar turli ruxsat tekshiruviga ega bo'lishi mumkin |
| Parametrlar (URL, body, JSON, sarlavhalar, cookie'lar) | Kirish nuqtalari — injection va mantiq tekshiruvlari |
| Rollar va kim nimaga kira oladi | Access control tekshiruvi asosi (a2 ruxsatlar matritsasi) |
| Texnologiyalar va versiyalar | Ma'lum zaifliklar, freymvorkka xos tekshiruvlar |
| Biznes jarayonlar (ko'p bosqichli oqimlar) | Mantiq xatolari (a2 biznes mantiq darsi) |

## 1. Qo'lda ko'zdan kechirish

Eng muhim va eng ko'p o'tkazib yuboriladigan qadam: ilovadan **oddiy foydalanuvchi kabi** foydalanish, Burp orqali, har bir funksiyani bosib chiqish. Har bir rol uchun alohida (tester1, testadmin). Natija — Burp'ning **Target → Site map** daraxti.

Bu jarayonda kuzatiladi:

- Har bir forma qanday maydonlar yuboradi (yashirin maydonlar ham)?
- Qaysi so'rovlar ID'lar bilan ishlaydi (`/notes/1042`, `?user_id=17`)?
- Fayl yuklash, URL qabul qilish, eksport, import, qidiruv funksiyalari bormi? (Har biri — keyingi darslardagi alohida tekshiruv toifasi.)
- Xato xabarlari nima deydi?

## 2. JavaScript fayllari

Zamonaviy ilovalarda (React, Vue, Angular) frontend kodi brauzerga to'liq yuklanadi — demak, u o'qilishi mumkin. Ichida ko'pincha:

- barcha API yo'llari (interfeysda ko'rinmaydiganlari ham);
- rollarga bog'liq funksiyalar ("agar admin bo'lsa, shu tugmani ko'rsat");
- ba'zan unutilgan kalitlar va ichki manzillar (a3 sirlar darsi).

Burp'da: HTTP history'da `.js` fayllarni filtrlang, ichida `/api/` kabi qatorlarni qidiring. Katta, siqilgan (minified) fayllarni brauzerning "pretty print" funksiyasi o'qilishi oson qiladi. Source map (`.js.map`) fayllar ochiq qolgan bo'lsa — asl manba kodi to'liq ko'rinadi (a2 xavfsiz sozlamalar topilmasi).

```
 main.3f9a2c.js ichidan topilgan yo'llar:
   GET    /api/v1/notes
   POST   /api/v1/notes
   GET    /api/v1/notes/{id}
   POST   /api/v1/notes/{id}/share
   GET    /api/v1/admin/users            ← faqat admin interfeysida
   GET    /api/v1/admin/export           ← interfeysda tugmasi yo'q
   GET    /api/v1/debug/config           ← nima bu?
```

Oxirgi ikki qator — keyingi tekshiruvlarning birinchi nomzodlari: "admin endpointiga oddiy foydalanuvchi so'rov yuborsa-chi?" (access control darsi) va "debug endpoint ishlab chiqarishda nima qilyapti?"

## 3. API hujjatlari

Ko'p API'lar o'z hujjatini ochiq beradi — ba'zan ataylab, ba'zan unutilgan holda:

| Yo'l | Nima |
|---|---|
| `/openapi.json`, `/swagger.json`, `/v3/api-docs` | OpenAPI (Swagger) spetsifikatsiyasi — barcha endpointlar, parametrlar, sxemalar |
| `/swagger-ui/`, `/docs`, `/redoc` | Interaktiv hujjat sahifasi |
| GraphQL `/graphql` | Introspection yoqilgan bo'lsa — butun sxema (API darsi) |

Grey box'da hujjat mijozdan olinadi. Lekin ochiq qolgan hujjat ham topilma: ishlab chiqarishda kerak bo'lmasa, hujum yuzasini osonlashtiradi.

## 4. Katalog va fayl qidiruvi (content discovery)

Hech qayerda havola qilinmagan, lekin serverda mavjud yo'llarni topish: `/admin/`, `/backup/`, `/old/`, `.git/`, `config.php.bak`. Usul — ro'yxatdagi nomlarni ketma-ket so'rash va javobga qarash ([[fuzzing|fuzzing]]ning eng oddiy ko'rinishi).

Vositalar: **ffuf**, **gobuster**, **feroxbuster**; ro'yxatlar: **SecLists** to'plami.

```bash
# O'z laboratoriyangizda yoki qamrovdagi nishonda, RoE'dagi tezlik bilan
ffuf -u https://qaydnoma.example.com/FUZZ \
     -w /usr/share/seclists/Discovery/Web-Content/common.txt \
     -rate 20 -mc 200,204,301,302,401,403 -o 03-web/ffuf-root.json

# /admin/                 [Status: 302, Size: 0]      → login'ga yo'naltiradi
# /backup/                [Status: 403, Size: 162]    → mavjud, lekin taqiqlangan
# /.git/HEAD              [Status: 200, Size: 23]     → manba kod ochiq!
# /robots.txt             [Status: 200, Size: 67]
```

Javob kodlarini o'qish:

| Kod | Ma'nosi razvedkada |
|---|---|
| 200 | Mavjud va ochiq |
| 301/302 | Mavjud, boshqa joyga yo'naltiradi (ko'pincha login'ga) |
| 401 | Mavjud, autentifikatsiya talab qiladi |
| 403 | **Mavjud**, lekin taqiqlangan — e'tibor bering, 404 emas |
| 404 | Yo'q (yoki server shunday ko'rsatadi) |

`403` — muhim signal: resurs bor. Keyinchalik tekshiriladi: boshqa metod bilan, autentifikatsiya bilan, boshqa yo'l yozilishi bilan ruxsat beriladimi?

:::warn
Content discovery minglab so'rov yuboradi. Mijoz tizimida: faqat qamrovdagi hostlar, RoE'dagi tezlik (`-rate`), avval kichik ro'yxat bilan. Juda katta ro'yxatlar va yuqori tezlik — ishlab chiqarishni yuklash, jurnallarni to'ldirish va WAF tomonidan bloklanish. O'z laboratoriyangizda — xohlaganingizcha.
:::

## 5. Subdomen va virtual hostlar

p1 bosqichidagi passiv subdomen qidiruvini faol qadam to'ldiradi: bir IP'da bir nechta sayt bo'lishi mumkin (virtual hostlar), ular faqat `Host` sarlavhasi bilan farqlanadi. `staging`, `dev`, `admin`, `internal` kabi nomlar bilan `Host` sarlavhasini o'zgartirib so'rash — boshqa ilovani ochishi mumkin. Qamrov qoidasi bu yerda ham: topilgan yangi vhost — mijozga xabar va yozma tasdiq.

## 6. Texnologiyalarni aniqlash

| Manba | Nima beradi |
|---|---|
| Sarlavhalar: `Server`, `X-Powered-By`, `Set-Cookie` nomlari | nginx, Express, PHP; cookie nomi bo'yicha freymvork (`PHPSESSID`, `JSESSIONID`, `connect.sid`, `session` — Flask) |
| Xato sahifalari | Freymvork va versiya, ba'zan yo'llar va kod (a2) |
| HTML va JS | Kutubxonalar va versiyalar (jQuery, React), CMS belgilari |
| Wappalyzer, whatweb | Avtomatik aniqlash |
| Favicon, standart yo'llar | CMS va boshqaruv panellari |

Texnologiya ma'lum bo'lgach — o'sha texnologiyaga xos tekshiruvlar: Flask'da debug rejimi va `SECRET_KEY` (p1 Nmap darsidagi Werkzeug), PHP'da eski versiyalar, Java'da ma'lum deserializatsiya muammolari (a2), va har bir kutubxona versiyasi uchun ma'lum zaifliklar (p1 exploit topish).

## 7. Parametrlar

Ko'rinadigan parametrlardan tashqari, server **yashirin** parametrlarni qabul qilishi mumkin: `debug=true`, `admin=1`, `role`, `isAdmin`. Ular eski kodda, freymvorkning avtomatik bog'lashida (a2 mass assignment) yoki ishlab chiqish uchun qoldirilgan. Burp'ning Param Miner kengaytmasi yoki Arjun kabi vositalar ularni ro'yxat bo'yicha qidiradi.

## Natija: ilova xaritasi

Razvedka oxirida — keyingi darslar uchun ish rejasi:

| Endpoint | Metod | Kim uchun | Parametrlar | Tekshiruvlar |
|---|---|---|---|---|
| `/api/v1/notes/{id}` | GET, PUT, DELETE | Egasi | `id` | Access control (IDOR) — har bir metod uchun alohida |
| `/api/v1/notes/{id}/share` | POST | Egasi | `id`, `email`, `role` | Access control, mass assignment (`role`) |
| `/api/v1/notes?q=` | GET | Foydalanuvchi | `q` | SQL injection, XSS (natija qayerda ko'rsatiladi?) |
| `/api/v1/avatar` | POST | Foydalanuvchi | fayl | Fayl yuklash darsi |
| `/api/v1/import?url=` | POST | Foydalanuvchi | `url` | SSRF |
| `/api/v1/admin/export` | GET | Admin | — | Vertikal ruxsat (oddiy foydalanuvchi bilan) |
| `/api/v1/debug/config` | GET | ? | — | Ochiq bo'lishi kerakmi? |
| `/.git/` | GET | — | — | Kritik: manba kod ochiq — darhol xabar |

Bu jadval — OWASP WSTG bo'yicha ishning qamrovi. Pentest oxirida har bir qator uchun "tekshirildi — natija" ustuni to'ldirilgan bo'lishi kerak.

:::key
Web pentestdagi eng katta xato — topilgan birinchi zaiflikka shoshilib, xaritani tugatmaslik. Zaifliklar ko'pincha eng kam ko'rinadigan joyda: unutilgan admin endpoint, eski API versiyasi, debug yo'li. Avval xarita, keyin chuqur tekshiruv.
:::

## Himoyachi uchun

| Tester topgan narsa | Himoya |
|---|---|
| JS'da interfeysda yo'q endpointlar | Ko'rinmaslik himoya emas — har bir endpointda serverda ruxsat tekshiruvi (a2) |
| Ochiq source map'lar | Ishlab chiqarishda o'chirish |
| Ochiq API hujjati | Kerak bo'lmasa — yopish yoki autentifikatsiya ortiga |
| `.git/`, `.bak`, `/backup/` | Joylash jarayonida faqat kerakli fayllar (a4 CI/CD), web server sozlamasida taqiq |
| Debug endpointlar | Ishlab chiqarish build'ida o'chirilgan (a2 xavfsiz sozlamalar) |
| Versiyalar sarlavhalarda | `server_tokens off` va shunga o'xshash (c1) — qiyinlashtirish, himoya emas |
| Content discovery trafigi | WAF va rate limiting; jurnalda bir manbadan ko'p 404 — signal (b1 web loglari) |

## Web razvedka nimani qilmaydi

- Zaiflikni isbotlamaydi — u qayerni tekshirish kerakligini ko'rsatadi.
- Ro'yxatda yo'q nomni topmaydi: content discovery faqat lug'at qanchalik yaxshi bo'lsa shunchalik yaxshi.
- Qamrovni kengaytirmaydi: topilgan yangi subdomen yoki vhost — avval mijoz tasdig'i.

:::try
O'z laboratoriyangizda (OWASP Juice Shop — p2 oxirgi darsida qanday ko'tarish ko'rsatilgan):

1. Burp orqali ilovadan to'liq foydalaning — ro'yxatdan o'ting, mahsulotlarni ko'ring, savatga qo'shing, sharh yozing. Site map'da nechta yo'l paydo bo'ldi?
2. Asosiy JavaScript faylini oching va `/api/` yoki `/rest/` qatorlarini qidiring. Interfeysda ko'rmagan nechta yo'l topdingiz?
3. `ffuf` bilan kichik ro'yxat bo'yicha content discovery o'tkazing (laboratoriyada tezlik cheklovisiz bo'lishi mumkin). 403 qaytgan yo'llar bormi?
4. Sarlavhalar va cookie nomlari bo'yicha ilova texnologiyasini aniqlang.
5. Yuqoridagi namunaga o'xshash ilova xaritasi jadvalini kamida 10 qator bilan tuzing.
6. Savol: JS faylida `/api/v1/admin/export` topildi, lekin interfeysda unga havola yo'q. Mijoz: "Uni hech kim bilmaydi, xavf yo'q." Nima deysiz?

**Javoblar:**
1. Juice Shop — bir sahifali ilova: site map'da o'nlab REST/API yo'llari va statik fayllar paydo bo'ladi.
2. Odatda interfeysda to'g'ridan-to'g'ri ko'rinmaydigan bir nechta yo'l (masalan, administrator bilan bog'liq) topiladi — bu Juice Shop vazifalarining bir qismi, yechimlarni bu yerda bermaymiz.
3. Laboratoriyada ba'zi yo'llar 403 yoki ochiq kataloglar ko'rinishida chiqishi mumkin — har biri keyingi tekshiruv uchun nomzod.
4. Masalan, Express (Node.js) belgilari sarlavhalarda va xato sahifalarida.
5. Har bir qatorda "Tekshiruvlar" ustuni aniq bo'lsin — bu keyingi darslardagi ish rejangiz.
6. Endpoint JS fayl orqali har kimga ma'lum — brauzerga yuklangan kod ommaviy. "Yashirin" degani himoya emas. Tekshiruv: oddiy foydalanuvchi sessiyasi bilan unga so'rov yuborilsa nima bo'ladi? Agar ma'lumot qaytsa — vertikal access control topilmasi (keyingi darslar). Tavsiya — serverda rol tekshiruvi.
:::

## Xulosa

- Maqsad — ilovaning to'liq xaritasi: sahifalar, endpointlar, metodlar, parametrlar, rollar, texnologiyalar, jarayonlar.
- Qo'lda ko'zdan kechirish (har bir rol bilan, Burp orqali) — eng muhim qadam.
- JavaScript fayllari va source map'lar — yashirin endpointlar manbasi; ochiq API hujjati — tayyor xarita.
- Content discovery (ffuf, gobuster, SecLists): 403 — mavjud, lekin taqiqlangan. Tezlik va qamrovni unutmang.
- Virtual hostlar, texnologiya aniqlash, yashirin parametrlar.
- Natija — ilova xaritasi jadvali va har bir qator uchun tekshiruvlar rejasi (WSTG qamrovi).
- Himoyachi uchun: ko'rinmaslik himoya emas; har bir endpointda server tekshiruvi; keraksiz fayl va endpointlar ishlab chiqarishda yo'q.

:::quiz
? Web razvedkaning asosiy maqsadi nima?
+ Ilovaning to'liq xaritasini tuzish: endpointlar, parametrlar, rollar, texnologiyalar
- Birinchi zaiflikni tezroq ishlatish
- Saytni yuklash
- Faqat bosh sahifani tekshirish
! Topilmagan endpointni tekshirib bo'lmaydi.

? Nega JavaScript fayllarini o'qish razvedkada foydali?
- Ular serverda bajariladi
+ Ular brauzerga to'liq yuklanadi va ko'pincha barcha API yo'llarini, jumladan interfeysda ko'rinmaydiganlarini o'z ichiga oladi
- Ular parollarni saqlaydi
- Ular faqat dizayn uchun
! Frontend kodi ommaviy — undagi yo'llar ham ommaviy.

? Content discovery'da `403` javobi nimani bildiradi?
- Resurs mavjud emas
+ Resurs mavjud, lekin kirish taqiqlangan — keyingi tekshiruv uchun nomzod
- Server ishlamayapti
- Resurs ochiq
! 404 va 403 farqi — razvedka uchun muhim signal.

? Ochiq qolgan `/.git/` papkasi qanday baholanadi?
- Ahamiyatsiz
+ Kritik — ilovaning manba kodi va tarixi ochiq bo'lishi mumkin; darhol xabar
- Faqat dizayn muammosi
- Faqat sekinlik
! Manba kodda sirlar va ichki mantiq bo'lishi mumkin.

? Mijoz tizimida content discovery o'tkazishda nimaga e'tibor beriladi?
- Eng katta ro'yxat va maksimal tezlik
+ Faqat qamrovdagi hostlar, RoE'dagi tezlik, avval kichik ro'yxat
- Faqat tunda, cheklovsiz
- Barcha subdomenlarda, tasdiqsiz
! Minglab so'rov ishlab chiqarishni yuklashi va bloklanishga olib kelishi mumkin.

? Ochiq OpenAPI (`/openapi.json`) hujjati nima beradi?
+ Barcha endpointlar, parametrlar va sxemalar ro'yxatini — tayyor xarita
- Admin parolini
- Server diskini
- Hech narsa
! Ishlab chiqarishda kerak bo'lmasa — bu ham topilma.

? Qo'lda ko'zdan kechirish nega har bir rol uchun alohida bajariladi?
- Burp shuni talab qiladi
+ Turli rollar turli funksiya va endpointlarni ko'radi — access control tekshiruvi uchun ikkalasining xaritasi kerak
- Bu vaqtni tejaydi
- Admin rolini o'chirish uchun
! Ruxsatlar matritsasi rollar bo'yicha tuziladi.

? Yashirin parametrlar (masalan, `admin=1`) qayerdan paydo bo'lishi mumkin?
- Faqat brauzerdan
+ Eski kod, freymvorkning avtomatik bog'lashi (mass assignment) yoki ishlab chiqish uchun qoldirilgan funksiyalardan
- Faqat DNS'dan
- Ular mavjud emas
! Param Miner kabi vositalar ularni ro'yxat bo'yicha qidiradi.

? Mijoz: "Endpoint interfeysda yo'q, uni hech kim bilmaydi." To'g'ri javob?
+ Endpoint JS fayl orqali hammaga ma'lum; ko'rinmaslik himoya emas — serverda ruxsat tekshiruvi bo'lishi kerak
- To'g'ri, xavf yo'q
- Endpointni boshqa nomga o'zgartirish yetarli
- Faqat WAF qo'yish kerak
! "Security through obscurity" — haqiqiy himoyaning o'rnini bosmaydi.

? Virtual hostlarni tekshirishda qaysi sarlavha o'zgartiriladi?
- Cookie
- User-Agent
+ Host
- Accept
! Bir IP'dagi turli saytlar Host sarlavhasi bilan farqlanadi.
:::

:::cards
Ilova xaritasi :: Barcha endpointlar, metodlar, parametrlar, rollar va tekshiruvlar jadvali
Site map :: Burp'dagi ilova yo'llari daraxti
JS razvedka :: Frontend kodidan API yo'llari va yashirin funksiyalarni topish
Source map :: .js.map fayli — ochiq qolsa, asl manba kod ko'rinadi
OpenAPI / Swagger :: API hujjati — endpointlar va parametrlar ro'yxati
Content discovery :: Havola qilinmagan yo'llarni lug'at bo'yicha topish
ffuf / gobuster :: Content discovery vositalari
SecLists :: Razvedka va fuzzing uchun ro'yxatlar to'plami
403 javobi :: Resurs bor, lekin taqiqlangan
Virtual host :: Bir IP'dagi, Host sarlavhasi bilan farqlanadigan sayt
Yashirin parametr :: Interfeysda yo'q, lekin server qabul qiladigan parametr
:::
