Qaydnoma ishlayapti. Lekin brauzer DevTools'ida sessiya cookie'siga qarang: `Secure` yo'q, `SameSite` ko'rsatilmagan. Javob sarlavhalarida `Cache-Control` yo'q — ya'ni foydalanuvchining shaxsiy qaydlari sahifasi qandaydir oraliq keshda saqlanib qolishi mumkin. Bir kun kimdir "frontend uchun" degan izoh bilan CORS'ni `*` ga ochib qo'ydi.

Bularning hech biri kodda "xato" emas — ilova to'g'ri ishlayveradi. Lekin har biri — xavfsizlik teshigi. Ular HTTP darajasida yashaydi: sarlavhalarda, cookie atributlarida, brauzer qoidalarida.

s2 bosqichidagi HTTP darsida asoslarni o'rgangansiz: so'rov, javob, metodlar, holat kodlari. Bu darsda — AppSec muhandisi bilishi shart bo'lgan chuqurroq qatlam.

## Sarlavhalar — so'rov va javobning "pasporti"

```
POST /notes/new HTTP/1.1
Host: qaydnoma.example
Cookie: session=eyJ1c2VyX2lkIjo...
Content-Type: application/x-www-form-urlencoded
Origin: https://qaydnoma.example
Referer: https://qaydnoma.example/notes

title=Rejalar&body=...
```

```
HTTP/1.1 302 Found
Location: /notes
Set-Cookie: session=...; Secure; HttpOnly; SameSite=Lax; Path=/
Cache-Control: no-store
Strict-Transport-Security: max-age=31536000; includeSubDomains
X-Content-Type-Options: nosniff
Content-Security-Policy: default-src 'self'; ...
```

Javob sarlavhalari — brauzerga **qanday himoyalanish kerakligini** aytish usuli. Ko'p himoyalar faqat bitta sarlavha qo'shish bilan yoqiladi — va ularning yo'qligi eng ko'p uchraydigan topilmalardan.

## Cookie'lar chuqur

[[cookie|Cookie]] — server brauzerga saqlashni so'ragan kichik ma'lumot; brauzer uni shu saytga har bir so'rovda avtomatik yuboradi. Sessiya cookie'si — foydalanuvchining "kirish kaliti": uni o'g'irlagan odam parolsiz o'sha foydalanuvchi bo'ladi.

```
Set-Cookie: session=abc123; Secure; HttpOnly; SameSite=Lax; Path=/; Max-Age=3600
```

| Atribut | Nima qiladi | Nimadan himoya qiladi |
|---|---|---|
| **`Secure`** | Cookie faqat HTTPS orqali yuboriladi | Ochiq tarmoqda (HTTP) ushlab olinishi — s2 bosqichidagi MITM |
| **`HttpOnly`** | JavaScript (`document.cookie`) cookie'ni o'qiy olmaydi | XSS orqali sessiya o'g'irlanishi (XSS'ning o'zidan emas!) |
| **`SameSite=Strict`** | Cookie boshqa saytdan boshlangan so'rovlarda umuman yuborilmaydi | CSRF — eng kuchli, lekin boshqa saytdagi havoladan kelganda ham "chiqib ketgan" bo'lasiz |
| **`SameSite=Lax`** | Boshqa saytdan faqat oddiy navigatsiyada (havolani bosish, GET) yuboriladi | CSRF'ning ko'p turlari; qulaylik saqlanadi |
| **`SameSite=None`** | Har doim yuboriladi (faqat `Secure` bilan birga ruxsat) | Hech narsadan — faqat haqiqatan kerak bo'lganda (masalan, iframe ichidagi integratsiya) |
| `Domain` | Qaysi domen va subdomenlarga yuboriladi | Ko'rsatilmasa — faqat aniq shu host (xavfsizroq) |
| `Path` | Qaysi yo'llarga | — |
| `Max-Age` / `Expires` | Qachon o'chadi | Ko'rsatilmasa — brauzer yopilganda ("sessiya cookie'si") |

Ko'p zamonaviy brauzerlar `SameSite` ko'rsatilmagan cookie'larni `Lax` deb hisoblaydi — lekin bunga tayanmang: aniq yozing.

**Cookie prefikslari** — brauzer tomonidan majburlanadigan qo'shimcha kafolat:
- `__Host-session=...` — faqat `Secure` bilan, `Path=/` bilan va `Domain`'siz o'rnatilishi mumkin. Subdomen bu cookie'ni o'rnata yoki ustidan yoza olmaydi.
- `__Secure-...` — faqat `Secure` bilan.

### Qaydnoma'da

```python
app.config.update(
    SESSION_COOKIE_SECURE=True,        # faqat HTTPS (lokal HTTP sinovda vaqtincha False)
    SESSION_COOKIE_HTTPONLY=True,      # Flask'da standart holatda ham True
    SESSION_COOKIE_SAMESITE="Lax",
    PERMANENT_SESSION_LIFETIME=3600,   # 1 soat
)
```

:::warn
**`HttpOnly` XSS'ni to'xtatmaydi.** U faqat bitta oqibatni — cookie o'g'irlanishini — oldini oladi. XSS bo'lsa, hujumchi kodi sizning brauzeringizda, sizning sessiyangiz bilan **so'rovlar yubora oladi** — cookie'ni o'qimasdan ham. Shuning uchun `HttpOnly` — qo'shimcha qatlam, XSS'ni tuzatish (a2 bosqichi) o'rnini bosmaydi. Xuddi shunday, `SameSite` — CSRF'ga qarshi kuchli qatlam, lekin a2 bosqichidagi CSRF tokenlari bilan birga ishlatiladi.
:::

## CORS — eng ko'p noto'g'ri tushuniladigan mexanizm

Keyingi darsda batafsil ko'radigan **Same-Origin Policy** bo'yicha brauzer bir saytdagi JavaScript'ga boshqa origin'dan kelgan javobni **o'qishga** ruxsat bermaydi. [[cors|CORS]] — server bu qoidani **yumshatishi** uchun mexanizm: "falon origin'ga mening javoblarimni o'qishga ruxsat beraman".

```
 Brauzer (sahifa: https://app.qaydnoma.example)            Server (https://api.qaydnoma.example)

 1. fetch("https://api.qaydnoma.example/notes", {credentials: "include"})
    ──── GET /notes  Origin: https://app.qaydnoma.example ────────────►
                                                    ◄──── 200 OK
                                    Access-Control-Allow-Origin: https://app.qaydnoma.example
                                    Access-Control-Allow-Credentials: true
 2. Brauzer: Origin mos keladimi? Ha → JS javobni o'qiy oladi.
             Mos kelmasa → so'rov KETGAN, lekin JS javobni o'qiy OLMAYDI.
```

Murakkabroq so'rovlar (masalan, `PUT`, `DELETE`, JSON `Content-Type`, maxsus sarlavhalar) uchun brauzer avval **preflight** — `OPTIONS` so'rovini yuborib, ruxsat so'raydi.

| Sarlavha | Ma'nosi |
|---|---|
| `Access-Control-Allow-Origin` | Qaysi origin javobni o'qiy oladi (`*` yoki aniq bitta origin) |
| `Access-Control-Allow-Credentials: true` | Cookie bilan yuborilgan so'rov javobini ham o'qish mumkin |
| `Access-Control-Allow-Methods` | Preflight: qaysi metodlarga ruxsat |
| `Access-Control-Allow-Headers` | Preflight: qaysi sarlavhalarga ruxsat |

### Uchta muhim haqiqat

1. **CORS — himoya emas, himoyani yumshatish.** U hech qachon serverni himoyalamaydi — u brauzerga qoidani bo'shatishga ruxsat beradi.
2. **CORS faqat brauzerda ishlaydi.** `curl` yoki skript CORS'ni umuman bilmaydi — ular istalgan so'rovni yuboradi va istalgan javobni o'qiydi. Shuning uchun CORS **autentifikatsiya va avtorizatsiya o'rnini bosmaydi**.
3. **Xato sozlangan CORS — haqiqiy zaiflik.** Agar server *istalgan* origin'ga cookie bilan javob o'qishga ruxsat bersa, hujumchining saytiga kirgan foydalanuvchi brauzeri hujumchi uchun foydalanuvchining shaxsiy ma'lumotlarini o'qib beradi.

### Xavfli sozlamalar

| Sozlama | Nega xavfli |
|---|---|
| Kelgan `Origin` ni tekshirmasdan qaytarish + `Allow-Credentials: true` | Istalgan sayt foydalanuvchi nomidan ma'lumotlarni o'qiy oladi |
| `Origin` ni "`qaydnoma.example` bilan tugaydimi?" deb tekshirish | `evilqaydnoma.example` ham "tugaydi" |
| `null` origin'ga ruxsat | Ba'zi kontekstlar (sandbox iframe, lokal fayllar) `null` yuboradi — hujumchi buni yaratishi mumkin |
| `*` ni "hamma narsa ishlashi uchun" qo'yish | Cookie'siz ochiq ma'lumotlar uchun normal; shaxsiy API uchun — yo'q (brauzerlar `*` ni credentials bilan birga taqiqlaydi, shuning uchun dasturchilar ko'pincha Origin'ni qaytarishga o'tadi — yuqoridagi birinchi qator) |

To'g'ri yondashuv — **aniq allowlist**:

```python
ALLOWED_ORIGINS = {"https://app.qaydnoma.example"}

@app.after_request
def cors(resp):
    origin = request.headers.get("Origin")
    if origin in ALLOWED_ORIGINS:
        resp.headers["Access-Control-Allow-Origin"] = origin
        resp.headers["Access-Control-Allow-Credentials"] = "true"
        resp.headers["Vary"] = "Origin"
    return resp
```

`Vary: Origin` — keshga "bu javob Origin'ga qarab farq qiladi" deydi; usiz kesh bitta origin uchun javobni boshqasiga berib yuborishi mumkin. Amalda ko'pincha tayyor kutubxona (masalan, Flask-CORS) aniq ro'yxat bilan sozlanadi — muhimi `*` yoki "hamma narsani qaytarish" emas, **aniq ro'yxat**.

Agar frontend va API bir xil origin'da bo'lsa — CORS umuman kerak emas. Eng yaxshi CORS sozlamasi — keragi yo'q CORS.

## Keshlash va shaxsiy ma'lumotlar

Javob brauzer, proxy yoki CDN'da keshlanishi mumkin. Ochiq sahifalar uchun — yaxshi (tezlik). Shaxsiy sahifalar uchun — xavf:

| Sarlavha | Ma'nosi | Qayerda ishlatiladi |
|---|---|---|
| `Cache-Control: no-store` | Hech qayerda saqlanmasin | Shaxsiy ma'lumotli sahifalar va API javoblari (qaydlar, profil, to'lovlar) |
| `Cache-Control: private` | Faqat foydalanuvchi brauzerida, umumiy keshda emas | Shaxsiy, lekin unchalik maxfiy bo'lmagan |
| `Cache-Control: public, max-age=86400` | Hamma keshlay oladi, 1 kun | Statik fayllar (CSS, JS, rasmlar) |
| `Vary: Cookie` / `Vary: Origin` | Javob shu sarlavhaga qarab farq qiladi | Keshga javoblarni aralashtirmaslikni aytish |

Xavfli holat: CDN shaxsiy sahifani "statik fayl" deb o'ylab keshlaydi va keyingi foydalanuvchiga boshqa birovning ma'lumotini ko'rsatadi. Bu haqiqiy insidentlarda uchragan. Himoya: shaxsiy javoblarga **aniq** `no-store`, CDN qoidalarini faqat haqiqiy statik yo'llar uchun sozlash.

```python
@app.after_request
def no_cache_private(resp):
    if "user_id" in session:
        resp.headers["Cache-Control"] = "no-store"
    return resp
```

## Boshqa muhim javob sarlavhalari

| Sarlavha | Qiymat | Nima uchun |
|---|---|---|
| **`Strict-Transport-Security`** (HSTS) | `max-age=31536000; includeSubDomains` | Brauzer bu saytga **faqat HTTPS** orqali murojaat qiladi — birinchi HTTP so'rovni ushlab, foydalanuvchini aldash (SSL stripping) qiyinlashadi |
| **`X-Content-Type-Options`** | `nosniff` | Brauzer `Content-Type` ni "taxmin qilmaydi" — masalan, yuklangan matn faylni skript sifatida ishga tushirmaydi |
| **`Content-Type`** | aniq tur va `charset=utf-8` | Yuqoridagi bilan birga ishlaydi |
| **`Referrer-Policy`** | `strict-origin-when-cross-origin` yoki `no-referrer` | URL'dagi maxfiy ma'lumotlar (tokenlar, ID'lar) boshqa saytlarga `Referer` orqali sizmasligi uchun |
| `Server`, `X-Powered-By` | olib tashlash yoki umumiy qiymat | Versiyalarni oshkor qilmaslik — kichik, lekin bepul |

HSTS bilan ehtiyot bo'ling: `max-age` uzoq bo'lsa va keyin HTTPS'ni o'chirsangiz, foydalanuvchilar saytga kira olmay qoladi. Avval qisqa qiymat bilan sinang.

Keyingi darsda yana uchta muhim sarlavha: **CSP**, **frame-ancestors** (clickjacking) va **Permissions-Policy**.

## HTTP metodlarining semantikasi

| Metod | Xavfsiz (holatni o'zgartirmaydi) | Idempotent (takrorlansa natija bir xil) | Qachon |
|---|---|---|---|
| `GET` | Ha | Ha | Ma'lumot olish |
| `POST` | Yo'q | Yo'q | Yaratish, amallar |
| `PUT` | Yo'q | Ha | To'liq almashtirish |
| `PATCH` | Yo'q | Odatda yo'q | Qisman o'zgartirish |
| `DELETE` | Yo'q | Ha | O'chirish |

Qoida: **GET hech qachon holatni o'zgartirmasligi kerak.** `GET /notes/42/delete` — yomon: bunday havola rasm tegida, oldindan yuklashda yoki boshqa saytda bo'lsa, foydalanuvchi bilmagan holda qaydni o'chiradi. Bundan tashqari, GET so'rovlar URL bilan birga loglarga, brauzer tarixiga va `Referer` ga tushadi — shuning uchun maxfiy ma'lumotlar (tokenlar, parollar) hech qachon URL parametrida yuborilmaydi.

:::key
**HTTP darajasidagi himoyalar — arzon va kuchli, lekin faqat qo'shimcha qatlam.** Bir nechta sarlavha va cookie atributi bir qator hujumlarning oqibatini keskin kamaytiradi: `Secure`, `HttpOnly`, `SameSite`, `no-store`, HSTS, `nosniff`. Ularni yoqish — bir necha qator kod. Lekin ular koddagi zaifliklarni (injection, XSS, IDOR) tuzatmaydi — faqat ularning ta'sirini cheklaydi. To'g'ri yondashuv: kodni tuzating **va** sarlavhalarni yoqing.
:::

## Tekshirish vositalari

```bash
# Javob sarlavhalarini ko'rish
curl -sI https://qaydnoma.example/login

# CORS sinovi: begona Origin bilan so'rov — javobda Access-Control-Allow-Origin qaytdimi?
curl -sI -H "Origin: https://begona.example" https://api.qaydnoma.example/notes
```

Brauzerda: DevTools → **Network** (sarlavhalar) va **Application** → Cookies (atributlar jadvali). Keyinroq (a3) **OWASP ZAP** bularni avtomatik tekshiradi.

## Bu dars nimani bermaydi

- **Har bir sarlavhaning barcha tafsilotlarini** — MDN hujjatlari to'liq ma'lumot beradi.
- **Koddagi zaifliklarni tuzatishni** — buni a2 bosqichida qilasiz.
- **Brauzerlar orasidagi farqlarni** — ba'zi xatti-harakatlar (masalan, standart `SameSite`) brauzerga qarab farq qilishi mumkin; aniq yozish — eng ishonchli.

:::try
**1. Cookie atributlari.** Qaydnoma'ga kiring va DevTools → Application → Cookies'da sessiya cookie'sini toping. Qaysi atributlar bor? Yuqoridagi `app.config.update(...)` ni qo'shing (lokal HTTP sinov uchun `SESSION_COOKIE_SECURE=False` qoldiring) va farqni ko'ring.

**2. HttpOnly sinovi.** DevTools konsolida `document.cookie` ni yozing. Sessiya cookie'si ko'rinadimi? Nega?

**3. Kesh.** `no_cache_private` funksiyasini qo'shing. Kirgandan keyin qaydlar sahifasining javob sarlavhalarida `Cache-Control: no-store` borligini tekshiring.

**4. Haqiqiy saytlar.** `curl -sI` bilan uchta mashhur saytning bosh sahifasi sarlavhalarini ko'ring. Ularning qaysi birida HSTS, `nosniff`, `Referrer-Policy` bor? securityheaders.com'da ham tekshiring.

**5. CORS fikr tajribasi.** Dasturchi shunday kod yozdi: `resp.headers["Access-Control-Allow-Origin"] = request.headers.get("Origin"); resp.headers["Access-Control-Allow-Credentials"] = "true"`. Nima xavf? Qanday tuzatasiz?

*Javoblar: 2 — yo'q: `HttpOnly` cookie'lar JavaScript'ga ko'rinmaydi. 5 — istalgan sayt foydalanuvchi brauzeri orqali uning cookie'lari bilan API javoblarini o'qiy oladi; tuzatish — aniq allowlist, `Vary: Origin`, va ruxsat etilmagan origin'ga CORS sarlavhalarini umuman qaytarmaslik.*
:::

## Xulosa

- Javob sarlavhalari brauzerga **qanday himoyalanishni** aytadi; ularning yo'qligi — keng tarqalgan topilma.
- Cookie: **`Secure`** (faqat HTTPS), **`HttpOnly`** (JS o'qiy olmaydi), **`SameSite=Lax/Strict`** (CSRF'ga qarshi), `Domain` ko'rsatmaslik, `__Host-` prefiksi.
- `HttpOnly` XSS'ni emas, faqat cookie o'g'irlanishini to'xtatadi.
- **CORS — himoyani yumshatish**, himoya emas; faqat brauzerda; autentifikatsiya o'rnini bosmaydi. Origin'ni **aniq allowlist** bilan tekshiring, `Vary: Origin` qo'shing; kelgan Origin'ni ko'r-ko'rona qaytarish + credentials — zaiflik.
- Shaxsiy javoblar — **`Cache-Control: no-store`**; CDN shaxsiy sahifalarni keshlamasin.
- **HSTS**, **`nosniff`**, **`Referrer-Policy`**; versiya sarlavhalarini olib tashlash.
- **GET holatni o'zgartirmaydi**; maxfiy ma'lumot URL'da yuborilmaydi.

:::quiz
? Cookie'dagi Secure atributi nima qiladi?
+ Cookie faqat HTTPS orqali yuboriladi
- JavaScript cookie'ni o'qiy olmaydi
- Cookie boshqa saytlarga yuborilmaydi
- Cookie shifrlanadi
! Ochiq HTTP tarmog'ida ushlab olinishdan himoya qiladi.

? HttpOnly atributi XSS haqida qaysi gap to'g'ri?
- HttpOnly XSS'ni to'liq to'xtatadi
+ U faqat XSS orqali cookie o'g'irlanishini oldini oladi; XSS kodi baribir foydalanuvchi nomidan so'rov yubora oladi
- U XSS'ni kuchaytiradi
- U faqat CSRF uchun
! XSS'ni koddagi tuzatish bilan yo'qotish kerak; HttpOnly — qo'shimcha qatlam.

? SameSite=Lax cookie qachon boshqa saytdan boshlangan so'rovda yuboriladi?
+ Faqat oddiy yuqori darajadagi navigatsiyada (masalan, havolani bosish orqali GET)
- Har doim
- Hech qachon
- Faqat POST so'rovlarda
! Bu CSRF'ning ko'p turlarini to'xtatadi va qulaylikni saqlaydi.

? CORS haqida qaysi gap to'g'ri?
- CORS serverni barcha hujumlardan himoya qiladi
+ CORS — brauzerdagi Same-Origin qoidasini yumshatish mexanizmi; u autentifikatsiya va avtorizatsiya o'rnini bosmaydi
- CORS curl so'rovlarini ham bloklaydi
- CORS faqat rasmlar uchun
! Brauzerdan tashqari vositalar CORS'ni umuman hisobga olmaydi.

? Qaysi CORS sozlamasi eng xavfli?
+ Kelgan Origin'ni tekshirmasdan qaytarish va Access-Control-Allow-Credentials: true
- Aniq allowlist'dagi bitta origin
- Cookie'siz ochiq ma'lumotlar uchun *
- CORS umuman yo'q (bir xil origin)
! Istalgan sayt foydalanuvchi brauzeri orqali uning ma'lumotlarini o'qiy oladi.

? Origin'ni “qaydnoma.example bilan tugaydimi?” deb tekshirishning muammosi nima?
- Muammo yo'q
+ evilqaydnoma.example kabi begona domenlar ham shartdan o'tadi
- Bu juda sekin
- Bu faqat HTTP'da ishlaydi
! Aniq, to'liq origin'lar ro'yxati bilan solishtirish kerak.

? Shaxsiy qaydlar sahifasi uchun qaysi Cache-Control qiymati to'g'ri?
- public, max-age=86400
+ no-store
- Hech narsa yozmaslik
- immutable
! Shaxsiy ma'lumot umumiy keshlarda saqlanib qolmasligi kerak.

? HSTS sarlavhasi nima qiladi?
+ Brauzerga bu saytga faqat HTTPS orqali murojaat qilishni buyuradi
- Parollarni shifrlaydi
- XSS'ni bloklaydi
- Cookie'larni o'chiradi
! Birinchi HTTP so'rovni ushlab, foydalanuvchini aldashni qiyinlashtiradi.

? Nega GET so'rovi holatni (masalan, qaydni o'chirishni) o'zgartirmasligi kerak?
+ GET havolalar rasm teglari, oldindan yuklash yoki boshqa saytlar orqali foydalanuvchi bilmagan holda chaqirilishi mumkin; ular loglarga ham tushadi
- GET juda sekin
- GET faqat rasmlar uchun
- GET so'rovlarda cookie yuborilmaydi
! Holatni o'zgartiruvchi amallar — POST, PUT, PATCH, DELETE.

? X-Content-Type-Options: nosniff nimadan himoya qiladi?
- SQL injection'dan
+ Brauzer Content-Type'ni “taxmin qilib”, masalan, yuklangan faylni skript sifatida ishga tushirishidan
- Parol terishdan
- DDoS'dan
! Aniq Content-Type bilan birga ishlaydi.
:::

:::cards
Cookie atributlari? :: Secure (faqat HTTPS), HttpOnly (JS o'qiy olmaydi), SameSite (Strict/Lax/None), Domain, Path, Max-Age/Expires.
SameSite qiymatlari? :: Strict — boshqa saytdan hech qachon; Lax — faqat oddiy navigatsiyada; None — har doim (faqat Secure bilan).
__Host- prefiksi? :: Cookie faqat Secure, Path=/ va Domain'siz o'rnatiladi — subdomenlar uni o'zgartira olmaydi.
HttpOnly cheklovi? :: Faqat cookie o'g'irlanishini to'xtatadi; XSS kodi baribir foydalanuvchi nomidan so'rov yubora oladi.
CORS nima? :: Serverning brauzerga Same-Origin qoidasini yumshatishga ruxsati: qaysi origin javoblarni o'qiy olishi.
CORS haqidagi uch haqiqat? :: Himoya emas, yumshatish; faqat brauzerda ishlaydi; xato sozlansa — zaiflik.
Xavfli CORS sozlamalari? :: Origin'ni ko'r-ko'rona qaytarish + credentials, suffix tekshiruvi, null origin, shaxsiy API uchun *.
To'g'ri CORS? :: Aniq allowlist, Vary: Origin, ruxsatsiz origin'ga sarlavha qaytarmaslik; iloji bo'lsa — bir xil origin, CORS'siz.
Kesh sarlavhalari? :: no-store — shaxsiy javoblar; private — faqat brauzer; public, max-age — statik fayllar; Vary — javob farqlanishi.
Boshqa muhim sarlavhalar? :: HSTS, X-Content-Type-Options: nosniff, Referrer-Policy, versiya sarlavhalarini olib tashlash.
HTTP metodlari qoidasi? :: GET holatni o'zgartirmaydi; maxfiy ma'lumot URL'da yuborilmaydi.
HTTP himoyalarining o'rni? :: Arzon va kuchli qo'shimcha qatlam — koddagi zaifliklarni tuzatish o'rnini bosmaydi.
:::
