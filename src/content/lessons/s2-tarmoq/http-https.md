Web pentester kun bo'yi bitta narsaga qaraydi: HTTP so'rov va javoblariga. SOC analitigi veb-server jurnallarida ham shuni ko'radi. SQL injection, XSS, sessiya o'g'irlash — web zaifliklarining deyarli hammasi shu protokol ustida yashaydi.

HTTP ni mukammal bilish — ixtiyoriy emas. Yaxshi xabar: u juda sodda va **oddiy matndan** iborat.

## HTTP nima

[[http|HTTP]] (HyperText Transfer Protocol) — brauzer va veb-server orasidagi muloqot tili. Model sodda: klient **so'rov** yuboradi, server **javob** qaytaradi.

Ikki muhim xususiyati:

- **Matnli.** So'rov va javobni odam o'qiy oladi (HTTP/1.1 da).
- **Holatsiz (stateless).** Server har bir so'rovni mustaqil ko'radi va oldingisini eslamaydi. Bu juda muhim — sababini quyida ko'rasiz.

## URL tuzilishi

[[url|URL]] — resursning to'liq manzili:

```
https://shop.example.com:443/mahsulot/ko'rish?id=42&til=uz#sharhlar
└─┬─┘   └──────┬───────┘└┬┘└───────┬───────┘└─────┬─────┘└───┬───┘
sxema        host      port      yo'l         so'rov       fragment
                                              parametrlari
```

| Qism | Vazifasi |
|---|---|
| Sxema | Protokol: `http` yoki `https` |
| Host | Server nomi (DNS orqali IP ga aylanadi) |
| Port | Ko'rsatilmasa: http — 80, https — 443 |
| Yo'l | Serverdagi resurs |
| Parametrlar | `?` dan keyin, `&` bilan ajratilgan `kalit=qiymat` juftliklari |
| Fragment | Sahifa ichidagi joy. **Serverga yuborilmaydi** |

Pentester uchun parametrlar — asosiy nishon: `id=42` ni `id=43` ga o'zgartirsam nima bo'ladi? `id=42'` deb yozsam-chi?

## So'rov (request)

```http
POST /login HTTP/1.1
Host: shop.example.com
User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64)
Content-Type: application/x-www-form-urlencoded
Content-Length: 29
Cookie: session=abc123

username=ali&password=sirli42
```

Uch qism:

1. **Birinchi qator:** metod, yo'l, protokol versiyasi.
2. **[[header|Sarlavhalar]]** (headers): `Nom: qiymat` ko'rinishidagi qo'shimcha ma'lumot.
3. **Bo'sh qator**, keyin **tana** (body) — yuborilayotgan ma'lumot (hamma so'rovda ham bo'lmaydi).

### Metodlar

| Metod | Vazifasi | Tana bormi |
|---|---|---|
| **GET** | Ma'lumot olish | Yo'q |
| **POST** | Ma'lumot yuborish, yangi narsa yaratish | Ha |
| **PUT** | Resursni to'liq almashtirish | Ha |
| **PATCH** | Resursni qisman o'zgartirish | Ha |
| **DELETE** | O'chirish | Odatda yo'q |
| **HEAD** | GET kabi, lekin faqat sarlavhalar qaytadi | Yo'q |
| **OPTIONS** | Qaysi metodlar ruxsat etilganini so'rash | Yo'q |

**GET va POST farqi** — doimiy intervyu savoli:

| | GET | POST |
|---|---|---|
| Ma'lumot qayerda | URL da (`?id=42`) | So'rov tanasida |
| Brauzer tarixida qoladimi | Ha | Yo'q |
| Server jurnaliga yoziladimi | Ha — URL bilan birga | Odatda yo'q |
| Nima uchun | O'qish | O'zgartirish |

Shuning uchun parol **hech qachon** GET bilan yuborilmasligi kerak: u brauzer tarixida, proksi jurnalida va server jurnalida ochiq qoladi.

### Muhim so'rov sarlavhalari

| Sarlavha | Ma'nosi |
|---|---|
| `Host` | Qaysi saytga (bitta serverda ko'p sayt bo'lishi mumkin) |
| `User-Agent` | Klient dasturi va tizimi |
| `Cookie` | Brauzer saqlagan cookie'lar |
| `Authorization` | Autentifikatsiya ma'lumoti (token, parol) |
| `Referer` | Qaysi sahifadan kelindi |
| `Content-Type` | Tanadagi ma'lumot formati |

:::key
Web xavfsizligining birinchi qonuni: **klientdan kelgan hamma narsa soxta bo'lishi mumkin.** Sarlavhalar, parametrlar, cookie, yashirin forma maydonlari — hammasini foydalanuvchi o'zi yuboradi va xohlagancha o'zgartira oladi. `User-Agent` ham, `Referer` ham, "admin=false" degan cookie ham. Serverning brauzerga ishonishi — zaifliklarning asosiy manbai.
:::

## Javob (response)

```http
HTTP/1.1 200 OK
Server: nginx/1.24.0
Content-Type: text/html; charset=UTF-8
Content-Length: 1523
Set-Cookie: session=xyz789; HttpOnly; Secure

<!DOCTYPE html>
<html>...
```

### Status kodlari

Birinchi qatordagi uch xonali son — [[status-code|status kodi]]. Birinchi raqami toifani bildiradi:

| Toifa | Ma'nosi | Eng muhimlari |
|---|---|---|
| **1xx** | Ma'lumot | Kam uchraydi |
| **2xx** | Muvaffaqiyat | **200** OK, **201** Created, **204** No Content |
| **3xx** | Yo'naltirish | **301** doimiy, **302** vaqtinchalik, **304** o'zgarmagan |
| **4xx** | Klient xatosi | **400**, **401**, **403**, **404**, **405**, **429** |
| **5xx** | Server xatosi | **500**, **502**, **503** |

4xx kodlarini aniq farqlang:

| Kod | Ma'nosi | Oddiy tilda |
|---|---|---|
| **400** Bad Request | So'rov noto'g'ri tuzilgan | "Nima deganingizni tushunmadim" |
| **401** Unauthorized | Autentifikatsiya kerak | "Kimsiz? Avval tizimga kiring" |
| **403** Forbidden | Ruxsat yo'q | "Kimligingizni bilaman, lekin sizga mumkin emas" |
| **404** Not Found | Resurs topilmadi | "Bunday narsa yo'q" |
| **429** Too Many Requests | So'rovlar juda ko'p | "Sekinroq" |

Pentester uchun kodlar — ma'lumot manbai. Yashirin kataloglarni qidirganda: **404** — yo'q, **403** — *bor, lekin yopiq* (demak, qiziq), **200** — ochiq. **500** esa ko'pincha "kiritgan narsam serverda nimanidir sindirdi" degani — bu zaiflik belgisi bo'lishi mumkin.

`Server: nginx/1.24.0` sarlavhasiga ham e'tibor bering: server o'z versiyasini e'lon qilyapti. Hujumchi shu versiya uchun ma'lum zaifliklarni qidiradi.

## Holatsizlik muammosi va cookie

HTTP holatsiz: server har so'rovni birinchi marta ko'rayotgandek qabul qiladi. Unda sayt tizimga kirganingizni qanday eslaydi?

Javob — [[cookie|cookie]]: server brauzerga beradigan va brauzer **har keyingi so'rovda avtomatik qaytarib yuboradigan** kichik ma'lumot.

```
1. Siz login va parol yuborasiz.
2. Server tekshiradi, tasodifiy identifikator yaratadi va eslab qoladi:
       "xyz789 → bu Ali"
   Javobda:  Set-Cookie: session=xyz789
3. Brauzer keyingi har so'rovda:  Cookie: session=xyz789
4. Server: "xyz789 — bu Ali. Marhamat."
```

Bu mexanizm [[session|sessiya]] deyiladi.

:::warn
Sessiya cookie'si — **vaqtinchalik parol**. Kimda u bo'lsa, o'sha siz hisoblanadi: login ham, parol ham, hatto ikki bosqichli tasdiq ham kerak emas. Shuning uchun hujumchilar parolni emas, ko'pincha aynan cookie'ni o'g'irlashga harakat qiladi.
:::

Cookie'ni himoyalovchi atributlar:

| Atribut | Nima qiladi | Nimadan himoya |
|---|---|---|
| `HttpOnly` | JavaScript cookie'ni o'qiy olmaydi | XSS orqali o'g'irlashdan |
| `Secure` | Faqat HTTPS orqali yuboriladi | Tarmoqda ushlab olishdan |
| `SameSite` | Boshqa saytdan kelgan so'rovda yuborilmaydi | CSRF hujumidan |

## HTTPS

Oddiy HTTP da hamma narsa **ochiq matn** bo'lib ketadi. Yo'ldagi har kim — kafedagi qo'shni, provayder, buzilgan router — parolingiz va cookie'ngizni o'qiy oladi.

[[https|HTTPS]] — HTTP ning [[tls|TLS]] bilan o'ralgan ko'rinishi. U uch narsani beradi:

1. **Shifrlash** — yo'ldagi kuzatuvchi mazmunni o'qiy olmaydi.
2. **Yaxlitlik** — ma'lumotni yo'lda sezdirmasdan o'zgartirib bo'lmaydi.
3. **Autentifikatsiya** — sertifikat orqali siz haqiqatan o'sha serverga ulanganingiz tasdiqlanadi.

Lekin HTTPS **nimani yashirmaydi** — buni ham bilish kerak:

| Kuzatuvchi ko'radi | Kuzatuvchi ko'rmaydi |
|---|---|
| Qaysi IP manzilga ulanyapsiz | URL ning yo'li va parametrlari |
| Sayt domen nomi (odatda) | Sarlavhalar va cookie'lar |
| Qachon va qancha ma'lumot | Sahifa mazmuni, parollar |

:::info
Qulf belgisi **"ulanish shifrlangan"** degani, **"sayt halol"** degani emas. Phishing saytlarining aksariyati bugun HTTPS da ishlaydi — sertifikat olish bepul va bir daqiqalik ish. Qulf sizni yo'ldagi tinglovchidan himoya qiladi, saytning o'zidan emas.
:::

TLS va sertifikatlar qanday ishlashini 5-bosqichda batafsil o'rganasiz.

## O'z ko'zingiz bilan ko'ring

**Brauzerda.** `F12` → **Network** yorlig'i → sahifani yangilang. Har bir qator — bitta so'rov. Ustiga bossangiz: **Headers** (so'rov va javob sarlavhalari), **Payload** (yuborilgan ma'lumot), **Response** (javob tanasi), **Cookies**.

**Terminalda** — `curl`:

```bash
curl https://example.com                 # sahifani olish
curl -I https://example.com              # faqat javob sarlavhalari
curl -v https://example.com              # to'liq muloqot: so'rov ham, javob ham
curl -X POST -d "user=ali&pass=123" https://example.com/login
curl -H "User-Agent: Mening-skanerim" https://example.com
curl -b "session=xyz789" https://example.com/profil
```

Oxirgi ikki qatorga qarang: sarlavhani ham, cookie'ni ham o'zingiz yozyapsiz. "Klientdan kelgan hamma narsa soxta bo'lishi mumkin" degan qoida — mana shu.

:::try
Brauzerda istalgan saytni oching, `F12` → **Network**, sahifani yangilang (`F5`).

1. Birinchi so'rovning status kodi qanday?
2. **Response Headers** ichidan `Server` sarlavhasini toping. Sayt o'zi haqida nima deyapti?
3. **Request Headers** ichidan `User-Agent` ni toping — brauzeringiz o'zini qanday tanishtiryapti?
4. **Application** (yoki **Storage**) yorlig'i → **Cookies**. Qaysi cookie'larda `HttpOnly` va `Secure` belgisi bor?

Keyin CMD'da: `curl -I https://google.com` — javobni o'qib, status kodini izohlang.
:::

## Xulosa

- **HTTP** — matnli, so'rov-javob, **holatsiz** protokol.
- So'rov: metod + yo'l + sarlavhalar + tana. Javob: status kodi + sarlavhalar + tana.
- **GET** — o'qish, ma'lumot URL da; **POST** — yuborish, ma'lumot tanada.
- Status: **2xx** muvaffaqiyat, **3xx** yo'naltirish, **4xx** klient xatosi, **5xx** server xatosi.
- **401** — kimligingiz noma'lum; **403** — ruxsat yo'q.
- **Cookie** holatsizlikni hal qiladi; sessiya cookie'si — vaqtinchalik parol.
- **HTTPS** = HTTP + TLS: shifrlash, yaxlitlik, autentifikatsiya. Qulf sayt halolligini kafolatlamaydi.
- Klientdan kelgan hamma narsani o'zgartirish mumkin.

:::quiz
? 401 va 403 status kodlari orasidagi farq nima?
- 401 — server xatosi, 403 — klient xatosi
+ 401 — autentifikatsiya kerak (kimligingiz noma'lum), 403 — kimligingiz ma'lum, lekin ruxsat yo'q
- Ular bir xil narsani anglatadi
- 401 — sahifa topilmadi, 403 — server band
! 401: “avval tizimga kiring”. 403: “sizni taniyman, lekin bu sizga mumkin emas”.

? Nega parolni GET so'rovi bilan yuborish xavfli?
- Chunki GET sekinroq ishlaydi
+ Chunki ma'lumot URL da bo'ladi va brauzer tarixi hamda server jurnallarida ochiq qoladi
- Chunki GET shifrlanmaydi, POST esa doim shifrlanadi
- Chunki GET faqat rasmlar uchun
! GET parametrlari URL ning bir qismi: ular tarixda, jurnallarda va Referer sarlavhasida saqlanib qoladi. POST ham o'zi shifrlamaydi — buning uchun HTTPS kerak.

? HTTP “holatsiz” (stateless) degani nimani anglatadi?
- U shifrlanmagan
+ Server har bir so'rovni mustaqil ko'radi va oldingilarini eslamaydi
- U faqat matn uzatadi
- U ulanish o'rnatmaydi
! Shuning uchun foydalanuvchini eslab qolish uchun cookie va sessiya mexanizmi kerak.

? Hujumchi sizning sessiya cookie'ngizni qo'lga kiritdi. U nima qila oladi?
- Hech narsa — unga parol ham kerak
- Faqat sahifalarni ko'ra oladi, o'zgartira olmaydi
+ Parolsiz, sizning nomingizdan saytdan to'liq foydalana oladi
- Faqat sizning kompyuteringizdan foydalansa ishlaydi
! Sessiya cookie'si server uchun “bu o'sha foydalanuvchi” degan dalil. U bilan login, parol va ikki bosqichli tasdiq ham kerak bo'lmaydi.

? Cookie'dagi `HttpOnly` atributi nimadan himoya qiladi?
- Cookie'ning tarmoqda ushlab olinishidan
+ Cookie'ni sahifadagi JavaScript (masalan XSS orqali) o'qib olishidan
- Cookie'ning muddati tugashidan
- Boshqa saytlardan kelgan so'rovlardan
! HttpOnly cookie'ni JavaScript'dan yashiradi. Tarmoqda ushlashdan Secure, boshqa saytdan kelgan so'rovdan SameSite himoya qiladi.

? Saytda qulf belgisi (HTTPS) bor. Bu nimani kafolatlaydi?
- Sayt xavfsiz va unga ishonsa bo'ladi
- Saytda viruslar yo'q
+ Brauzer va server orasidagi ulanish shifrlangan
- Sayt egasi davlat tomonidan tekshirilgan
! HTTPS faqat ulanishni himoya qiladi. Phishing sayti ham bepul sertifikat olib, qulf bilan ishlashi mumkin.

? Yashirin kataloglarni qidirayotganda `/admin` uchun 403 javobi keldi. Bu nimani bildiradi?
- Bunday katalog yo'q
+ Katalog mavjud, lekin kirish taqiqlangan — demak e'tiborga loyiq
- Server ishlamayapti
- So'rov noto'g'ri tuzilgan
! 404 “yo'q” degani, 403 esa “bor, lekin sizga mumkin emas”. Mavjudligining o'zi — foydali ma'lumot.

? Quyidagilardan qaysilarini klient (foydalanuvchi) o'zi xohlagancha o'zgartira oladi?
+ User-Agent sarlavhasi
+ Cookie qiymatlari
+ URL parametrlari
- Serverning status kodi
! So'rovdagi hamma narsa klient nazoratida. Status kodini esa server belgilaydi.
:::

:::cards
HTTP so'rovi qaysi qismlardan iborat? :: Birinchi qator (metod, yo'l, versiya), sarlavhalar, bo'sh qator va tana.
GET va POST farqi? :: GET — o'qish, ma'lumot URL da (tarix va jurnalda qoladi). POST — yuborish, ma'lumot so'rov tanasida.
Status kodlari toifalari? :: 2xx — muvaffaqiyat, 3xx — yo'naltirish, 4xx — klient xatosi, 5xx — server xatosi.
401, 403, 404 farqi? :: 401 — autentifikatsiya kerak; 403 — ruxsat yo'q; 404 — resurs topilmadi.
HTTP holatsiz degani nima? :: Server har so'rovni mustaqil ko'radi; foydalanuvchini eslash uchun cookie/sessiya kerak.
Sessiya cookie'si nega qimmatli nishon? :: U vaqtinchalik parol: kimda bo'lsa, o'sha foydalanuvchi nomidan parolsiz ishlay oladi.
HttpOnly, Secure, SameSite nima qiladi? :: HttpOnly — JavaScript o'qiy olmaydi; Secure — faqat HTTPS orqali; SameSite — boshqa saytdan kelgan so'rovda yuborilmaydi.
HTTPS nimani beradi? :: Shifrlash, yaxlitlik va server autentifikatsiyasi. Sayt halolligini kafolatlamaydi.
HTTP va HTTPS standart portlari? :: HTTP — 80, HTTPS — 443.
Faqat javob sarlavhalarini ko'rsatadigan curl buyrug'i? :: curl -I https://example.com
:::
