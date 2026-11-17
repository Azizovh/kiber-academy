Pentester topilmani xabar qiladi: "Qaydlar sahifasida IDOR bor — URL'dagi raqamni o'zgartirib, boshqa foydalanuvchining qaydini o'qish mumkin." Dasturchi so'raydi: "Qanday tuzatay?" Va bu yerda AppSec muhandisining haqiqiy ishi boshlanadi: zaiflikni topish emas, balki **u qayerda va nima uchun paydo bo'lganini** tushunish, va dasturchiga to'g'ri tuzatish yo'lini ko'rsatish.

Buni qilish uchun ilovani **ichidan** bilish kerak: so'rov qayerdan kirib keladi, qaysi qatlamdan o'tadi, ma'lumot qayerda saqlanadi, va qaysi nuqtada "bu foydalanuvchi bu qaydni ko'rishga haqlimi?" degan savol berilishi kerak edi.

AppSec tarmog'ining tamoyili oddiy: **himoya qilish uchun avval qura olish kerak.** Bu bosqichda siz kichik web ilovani o'zingiz yozasiz va uning har bir qatlamini tushunasiz. Keyingi bosqichlarda aynan shu ilovada zaifliklarni topasiz, tuzatasiz va himoyani avtomatlashtirasiz.

## Butun tarmoq bo'ylab misol: "Qaydnoma"

Bu tarmoqda bitta o'quv ilovasi bilan ishlaymiz — **Qaydnoma**: foydalanuvchilar ro'yxatdan o'tadi, kiradi, qaydlar yozadi, ularni qidiradi va boshqalar bilan ulashadi; administrator foydalanuvchilarni boshqaradi.

| Bosqich | Qaydnoma bilan nima qilasiz |
|---|---|
| **a1** — Web ilova ichidan | Uni Flask'da **qurasiz** va har bir qatlamni tushunasiz |
| **a2** — Zaifliklar | Unga xos zaifliklarni (injection, XSS, IDOR…) **topasiz va tuzatasiz** |
| **a3** — SSDLC | Uning **tahdid modelini** tuzasiz, kodini ko'rib chiqasiz, SAST/DAST bilan skanerlaysiz |
| **a4** — DevSecOps | Tekshiruvlarni **CI/CD**ga o'rnatasiz — va hammasi portfolio loyihasiga aylanadi |

## Zamonaviy web ilova tuzilishi

s2 bosqichidagi HTTP darsida brauzer va server suhbatini ko'rgansiz. Haqiqiy ilova bundan murakkabroq:

```
                 Internet                   │                Kompaniya / bulut
                                            │
 ┌───────────┐   HTTPS   ┌────────────────┐ │ ┌──────────────┐     ┌──────────────┐
 │ Brauzer   │──────────►│ CDN / WAF /    │─┼►│ Web server / │────►│ Ilova        │
 │ (frontend │◄──────────│ Load balancer  │ │ │ reverse proxy│     │ (backend)    │
 │  JS)      │           └────────────────┘ │ │ (nginx)      │     │ Flask/Django │
 └───────────┘                              │ └──────────────┘     └──────┬───────┘
 ┌───────────┐   HTTPS/API                  │                             │
 │ Mobil     │──────────────────────────────┼──────────►            ┌─────┴─────┬────────────┬─────────────┐
 │ ilova     │                              │                       ▼           ▼            ▼             ▼
 └───────────┘                              │                ┌──────────┐ ┌─────────┐ ┌──────────┐ ┌─────────────┐
                                            │                │ Ma'lumot │ │ Kesh    │ │ Navbat   │ │ Tashqi API  │
                                            │                │ bazasi   │ │ (Redis) │ │ (fon     │ │ (to'lov,    │
                                            │                │ (Postgre)│ │         │ │ vazifa)  │ │  pochta)    │
                                            │                └──────────┘ └─────────┘ └──────────┘ └─────────────┘
```

| Komponent | Vazifasi | Xavfsizlik nuqtai nazari |
|---|---|---|
| **Frontend** (brauzerdagi HTML, CSS, JS) | Foydalanuvchi interfeysi | **Foydalanuvchi to'liq nazoratida** — har qanday tekshiruvni chetlab o'tish mumkin |
| **CDN / WAF / load balancer** | Tezlik, yuklamani taqsimlash, filtrlash | WAF — qo'shimcha qatlam, kodni tuzatish o'rnini bosmaydi |
| **Web server / reverse proxy** | TLS, statik fayllar, so'rovlarni ilovaga yo'naltirish | Sarlavhalar, TLS sozlamalari, xato sahifalari |
| **Backend** | Biznes mantiq, autentifikatsiya, avtorizatsiya | **Asosiy himoya shu yerda** |
| **Ma'lumotlar bazasi** | Saqlash | Injection, huquqlar, shifrlash, zaxira |
| **Kesh** | Tezlik | Boshqa foydalanuvchining keshlangan ma'lumoti ko'rinib qolishi |
| **Navbat / fon vazifalari** | Pochta yuborish, hisobotlar | Ichki ishonch — ular ham kiruvchi ma'lumotni tekshirishi kerak |
| **Tashqi API'lar** | To'lov, pochta, xarita | Kalitlarni saqlash, javoblarga ko'r-ko'rona ishonmaslik |

Jadvalning eng muhim qatori — birinchisi. Asosiy himoya esa [[backend|backend]]da — serverda ishlaydigan qismda. Frontend'dagi har qanday tekshiruv ("parol kamida 8 belgi", "tugma faqat administratorga ko'rinadi") — **qulaylik**, xavfsizlik emas. Foydalanuvchi brauzer DevTools'ida (s4 bosqichi) JavaScript'ni o'chirishi, so'rovni o'zgartirishi yoki umuman brauzersiz `curl` bilan so'rov yuborishi mumkin. **Har bir tekshiruv serverda takrorlanishi kerak.**

## So'rovning hayoti

Qaydnoma'da foydalanuvchi o'z qaydini ochadi. Nima sodir bo'ladi?

```
1. Brauzer:   GET /notes/42   Cookie: session=abc...
2. Proxy:     TLS'ni ochadi, so'rovni ilovaga uzatadi
3. Router:    /notes/<id> → note_view(id=42) funksiyasi
4. Middleware: sessiyani tekshiradi → current_user = d.karimova
5. Handler:   bazadan qaydni oladi: SELECT ... WHERE id = 42
6. AVTORIZATSIYA: bu qayd current_user'ga tegishlimi?  ← IDOR shu qadam yo'qligi
7. Shablon:   qayd matnini HTML'ga joylaydi (kodlab!)  ← XSS shu qadam noto'g'riligi
8. Javob:     200 OK + HTML + xavfsizlik sarlavhalari
```

Dars boshidagi IDOR — 6-qadamning yo'qligi. Keyingi bosqichdagi zaifliklarning deyarli hammasi shu ro'yxatdagi bitta qadamning noto'g'ri bajarilishi yoki yo'qligi:

| Qadam | Xato bo'lsa | a2 bosqichidagi dars |
|---|---|---|
| 4 — sessiya | Sessiyani o'g'irlash, autentifikatsiyani chetlab o'tish | Autentifikatsiya mexanizmlari |
| 5 — baza so'rovi | Injection | Injection |
| 6 — avtorizatsiya | IDOR / BOLA | Kirish nazorati dizayni |
| 7 — shablon | XSS | XSS va CSP |
| 8 — sarlavhalar | Clickjacking, keshlash, cookie xatolari | HTTP chuqur, brauzer xavfsizlik modeli |

## Ishonch chegarasi

AppSec'dagi eng muhim tushunchalardan biri — [[trust-boundary|ishonch chegarasi]] (trust boundary): **ma'lumot ishonch darajasi turlicha bo'lgan ikki joy o'rtasidan o'tadigan nuqta.**

```
  ┌──────────────┐          ┌────────────────────────────────┐          ┌──────────────┐
  │   Brauzer    │  ══╪══►  │           Backend              │  ══╪══►  │  Tashqi API  │
  │ (ishonchsiz) │          │      (biz nazorat qilamiz)     │          │ (qisman      │
  └──────────────┘          └───────────────┬────────────────┘          │  ishonchli)  │
                                     ══╪══  │                           └──────────────┘
                                            ▼
                                   ┌─────────────────┐
                                   │ Ma'lumot bazasi │
                                   └─────────────────┘

                  ══╪══  — ishonch chegarasi: shu yerda tekshiruv kerak
```

Qoida: **ishonch chegarasidan o'tgan har qanday ma'lumot — ishonchsiz**, uni tekshirmaguncha. Bu faqat formadagi maydonlar emas:

| Ishonchsiz ma'lumot manbalari | Ko'pincha unutiladi |
|---|---|
| Forma maydonlari, URL parametrlari | — |
| **Cookie'lar va sarlavhalar** (User-Agent, Referer, X-Forwarded-For) | Ha — "brauzer o'zi yuboradi" deb ishoniladi |
| Yuklangan fayllar (nomi, turi, mazmuni) | Ha |
| JSON so'rov tanasidagi **barcha** maydonlar (kutilmaganlari ham) | Ha — mass assignment (a2) |
| Tashqi API javoblari, webhook'lar | Ha |
| Bazadagi ma'lumot (agar uni foydalanuvchi kiritgan bo'lsa) | Ha — stored XSS (a2) |

Oxirgi qatorga e'tibor bering: foydalanuvchi bir hafta oldin kiritgan qayd matni bazadan o'qilganda ham **ishonchsiz** — u chiqarilganda kodlanishi kerak.

:::key
**AppSec'ning ikki asosiy savoli har bir ishonch chegarasida beriladi: "Bu ma'lumot qayerdan keldi?" va "Bu foydalanuvchi buni qilishga haqlimi?"** Birinchisi — kiritishni tekshirish va chiqishni kodlash (injection, XSS). Ikkinchisi — autentifikatsiya va avtorizatsiya (IDOR, huquqlarni oshirish). OWASP Top 10'ning katta qismi shu ikki savolga noto'g'ri javobdan kelib chiqadi. Kod ko'rib chiqishda (a3) ham, tahdid modelida ham — siz doim shu ikki savolni berasiz.
:::

## Ilova turlari

| Tur | Qanday ishlaydi | Xavfsizlikdagi xususiyati |
|---|---|---|
| **Server-rendered** (an'anaviy) | Server HTML'ni tayyorlab yuboradi (Flask + Jinja shablonlari) | Shablon kodlashi muhim; sessiya cookie'lari |
| **SPA** (Single Page Application) | Brauzer JS ilovasi (React, Vue) + backend REST/JSON API | API — asosiy hujum yuzasi; token saqlash, CORS |
| **Mobil ilova + API** | Mobil ilova API bilan gaplashadi | Mobil ilovadagi har narsa (kalitlar ham) ochilishi mumkin — a4 |
| **Mikroservislar** | Ko'p kichik xizmatlar bir-biri bilan gaplashadi | Xizmatlararo ishonch, ichki API'lar ham himoyalanishi kerak |

SPA va mobil ilovalar backend bilan odatda [[rest|REST API]] orqali gaplashadi. SPA'larda bir muhim tuzoq: frontend marshrutlari ("`/admin` sahifasi faqat administratorga ko'rinadi") hech narsani himoyalamaydi — haqiqiy ma'lumot **API**'dan keladi va API har bir so'rovda ruxsatni tekshirishi kerak.

## Hujum yuzasi

Ilovaning **hujum yuzasi** (attack surface, s5 bosqichi) — hujumchi ma'lumot kirita oladigan yoki ta'sir qila oladigan barcha nuqtalar:

| Kirish nuqtasi | Qaydnoma'da misol |
|---|---|
| Ochiq sahifalar va API endpointlar | `/login`, `/register`, `/notes`, `/notes/<id>`, `/search?q=`, `/api/notes` |
| Autentifikatsiyadan keyingi funksiyalar | Qayd yaratish, tahrirlash, ulashish |
| Administrator funksiyalari | `/admin/users` |
| Fayl yuklash | Qaydga rasm biriktirish |
| Tashqi integratsiyalar | Parolni tiklash pochtasi, webhook |
| Infratuzilma | Ochiq portlar, admin panellari, debug rejimi |

Hujum yuzasini **kamaytirish** — eng arzon himoya: ishlatilmaydigan endpointni o'chirish, debug rejimini ishlab chiqarishda o'chirish, admin panelini internetdan yashirish. Mavjud bo'lmagan funksiyada zaiflik ham bo'lmaydi.

## Bu dars nimani bermaydi

- **Har bir freymvorkning tafsilotlarini** — tamoyillar bir xil; aniq freymvork hujjatlarini o'qing.
- **Kod yozishni** — buni keyingi darsda o'zingiz qilasiz.
- **Xavfsizlikni o'zi** — arxitekturani tushunish — himoyaning boshlanishi, o'zi emas.

:::try
**1. Sxema.** Siz har kuni ishlatadigan bitta web ilova (masalan, internet-bank yoki onlayn do'kon) uchun yuqoridagi kabi arxitektura sxemasini taxminan chizing: qaysi komponentlar bo'lishi mumkin, ishonch chegaralari qayerda?

**2. Brauzerda kuzating.** O'z brauzeringizda istalgan saytni oching, DevTools → Network yorlig'ida sahifa yuklanishini kuzating (s4 bosqichi). Nechta so'rov ketdi? Ulardan qaysilari API (JSON) so'rovlari? Qaysi domenlarga (CDN, tashqi xizmatlar)?

**3. Ishonchsiz ma'lumot.** Qaydnoma'ning "qayd yaratish" funksiyasi uchun barcha ishonchsiz ma'lumot manbalarini sanang (forma maydonlaridan tashqari ham).

**4. So'rov hayoti.** "Qaydni o'chirish" so'rovi uchun yuqoridagi 8 qadamli ro'yxatni yozing. Qaysi qadamlarda qanday xavfsizlik tekshiruvi bo'lishi kerak?

*Javoblar: 3 — sarlavha va matn maydonlari, so'rov tanasidagi har qanday kutilmagan maydonlar (masalan, `owner_id`), sessiya cookie'si, User-Agent kabi sarlavhalar (agar loglanadigan bo'lsa), biriktirilgan fayl (nomi, turi, mazmuni). 4 — sessiya (kim?), CSRF himoyasi (o'chirish — holatni o'zgartiruvchi amal, a2), avtorizatsiya (qayd shu foydalanuvchinikimi?), baza so'rovi parametrlangan, javob va loglash.*
:::

## Xulosa

- **Himoya qilish uchun avval qura olish kerak** — bu tarmoq butun davomida **Qaydnoma** ilovasini quradi, buzadi va himoyalaydi.
- Zamonaviy ilova: frontend, CDN/WAF, proxy, **backend**, baza, kesh, navbat, tashqi API'lar.
- **Frontend foydalanuvchi nazoratida** — har bir tekshiruv serverda takrorlanadi.
- So'rov hayoti: sessiya → baza → **avtorizatsiya** → shablon (**kodlash**) → sarlavhalar; ko'p zaifliklar — shu qadamlarning biridagi xato.
- **Ishonch chegarasi**dan o'tgan har qanday ma'lumot ishonchsiz: forma, URL, **cookie, sarlavhalar, fayllar, JSON'dagi kutilmagan maydonlar, tashqi API, bazadagi foydalanuvchi ma'lumoti**.
- Ikki asosiy savol: **"qayerdan keldi?"** va **"bunga haqlimi?"**.
- SPA'da frontend marshrutlari himoya emas — **API** har so'rovda tekshiradi.
- **Hujum yuzasini kamaytirish** — eng arzon himoya.

:::quiz
? Nega frontend'dagi tekshiruvlar xavfsizlik emas, faqat qulaylik hisoblanadi?
+ Foydalanuvchi brauzer va so'rovlarni to'liq nazorat qiladi — JavaScript'ni o'chirishi yoki so'rovni to'g'ridan-to'g'ri yuborishi mumkin
- Frontend tekshiruvlari juda sekin
- Brauzerlar JavaScript'ni qo'llamaydi
- Frontend tekshiruvlari faqat mobil uchun
! Har bir tekshiruv serverda takrorlanishi kerak.

? Ishonch chegarasi (trust boundary) nima?
- Firewall qoidasi
+ Ma'lumot ishonch darajasi turlicha bo'lgan ikki joy o'rtasidan o'tadigan nuqta — shu yerda tekshiruv kerak
- Parol uzunligi chegarasi
- Server xotirasi chegarasi
! Masalan, brauzer va backend o'rtasi.

? Quyidagilardan qaysilari ishonchsiz ma'lumot manbalari?
+ Cookie'lar va HTTP sarlavhalari
+ Bazada saqlangan, avval foydalanuvchi kiritgan matn
- Server konfiguratsiyasidagi doimiy qiymat
- Dasturchi kodga yozgan konstanta
! Foydalanuvchidan kelgan har qanday ma'lumot — qachon va qanday yo'l bilan kelganidan qat'i nazar — ishonchsiz.

? So'rov hayotidagi qaysi qadamning yo'qligi IDOR zaifligiga olib keladi?
- Sessiyani tekshirish
- Shablonni chiqarish
+ Obyekt joriy foydalanuvchiga tegishli ekanini tekshirish (avtorizatsiya)
- TLS'ni ochish
! Foydalanuvchi tizimga kirgan, lekin begona obyektga murojaat qila olyapti.

? AppSec'dagi ikki asosiy savol qaysi?
+ “Bu ma'lumot qayerdan keldi?” va “Bu foydalanuvchi buni qilishga haqlimi?”
- “Server qaysi rangda?” va “Qancha turadi?”
- “Kim yozgan?” va “Qachon yozilgan?”
- “Qaysi til?” va “Qaysi freymvork?”
! Birinchisi — kiritish va chiqish (injection, XSS); ikkinchisi — autentifikatsiya va avtorizatsiya.

? SPA'da “/admin sahifasi faqat administratorga ko'rinadi” degan himoya haqida qaysi gap to'g'ri?
- Bu yetarli himoya
+ Bu himoya emas — haqiqiy ma'lumot API'dan keladi va API har bir so'rovda ruxsatni tekshirishi kerak
- SPA'larda avtorizatsiya kerak emas
- Faqat CSS bilan himoyalash kerak
! Frontend marshrutlarini foydalanuvchi chetlab o'tishi mumkin.

? Hujum yuzasini kamaytirishga misol qaysi?
+ Ishlatilmaydigan endpointlarni o'chirish va ishlab chiqarishda debug rejimini o'chirish
- Ko'proq funksiya qo'shish
- Barcha portlarni ochish
- Admin panelini hammaga ochiq qilish
! Mavjud bo'lmagan funksiyada zaiflik ham bo'lmaydi.

? WAF haqida qaysi gap to'g'ri?
- U kodni tuzatish o'rnini to'liq bosadi
+ U qo'shimcha himoya qatlami, lekin koddagi zaiflikni tuzatish o'rnini bosmaydi
- U faqat statik fayllarni himoyalaydi
- U foydalanuvchilarni ro'yxatdan o'tkazadi
! Defense in depth — WAF'ni chetlab o'tish usullari ko'p.
:::

:::cards
Qaydnoma nima? :: AppSec tarmog'i bo'ylab ishlatiladigan o'quv Flask ilovasi: a1 — qurish, a2 — zaifliklar, a3 — tahdid modeli va tahlil, a4 — CI/CD.
Web ilova komponentlari? :: Frontend, CDN/WAF/load balancer, web server/proxy, backend, ma'lumotlar bazasi, kesh, navbat, tashqi API.
Frontend tekshiruvlari? :: Faqat qulaylik — foydalanuvchi ularni chetlab o'ta oladi; har bir tekshiruv serverda takrorlanadi.
So'rov hayoti qadamlari? :: Brauzer → proxy → router → sessiya → baza → avtorizatsiya → shablon (kodlash) → javob va sarlavhalar.
Ishonch chegarasi? :: Ishonch darajasi o'zgaradigan nuqta; undan o'tgan har qanday ma'lumot tekshirilmaguncha ishonchsiz.
Ko'p unutiladigan ishonchsiz manbalar? :: Cookie, sarlavhalar, fayllar (nomi, turi, mazmuni), JSON'dagi kutilmagan maydonlar, tashqi API, bazadagi foydalanuvchi ma'lumoti.
AppSec'ning ikki savoli? :: Bu ma'lumot qayerdan keldi? Bu foydalanuvchi buni qilishga haqlimi?
Ilova turlari? :: Server-rendered, SPA + API, mobil + API, mikroservislar.
SPA xavfsizligi? :: Frontend marshrutlari himoya emas; API har bir so'rovda autentifikatsiya va ruxsatni tekshiradi.
Hujum yuzasini kamaytirish? :: Ishlatilmaydigan endpoint va funksiyalarni o'chirish, debug'ni o'chirish, admin panellarini yashirish.
:::
