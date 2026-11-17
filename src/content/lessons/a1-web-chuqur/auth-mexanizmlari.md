"Google orqali kirish" tugmasini har kuni bosasiz. Bir soniyada tizimga kirasiz — parol yozmasdan. Shu bir soniya ichida brauzeringiz, ilova va Google o'rtasida kamida to'rtta yo'naltirish, ikki xil token va bir nechta kriptografik tekshiruv sodir bo'ladi. Ularning birortasi noto'g'ri sozlansa — hujumchi sizning hisobingiz bilan kiradi.

Autentifikatsiya — ilovaning "old eshigi". Xavfsizlik bosqichida tushunchalarni (autentifikatsiya va avtorizatsiya, MFA, SSO) o'rgangansiz; Qaydnoma'da oddiy login yozdingiz. Bu darsda — eshik ichidagi mexanizmlar: parollar qanday saqlanadi, sessiya va token farqi, JWT'ning tuzoqlari, va OAuth/OpenID Connect aslida qanday ishlaydi.

## Parollarni saqlash

Xavfsizlik bosqichidagi xesh va parollar darsidan qisqacha: parol **ochiq** emas, **shifrlangan** emas, balki **sekin, tuzli (salt) xesh funksiyasi** bilan saqlanadi. Ma'lumotlar bazasi sizib chiqsa ham, parollarni tiklash juda qimmatga tushishi kerak.

| Funksiya | Holati | Izoh |
|---|---|---|
| **Argon2id** | **Tavsiya etiladi** | Zamonaviy; ham vaqt, ham xotira talab qiladi — GPU bilan buzish qiyin |
| **scrypt** | Yaxshi | Xotira talab qiladi |
| **bcrypt** | Yaxshi (eski tizimlarda keng) | Parolning faqat dastlabki 72 baytini hisobga oladi |
| **PBKDF2** | Qabul qilinadi, agar iteratsiyalar soni juda katta bo'lsa | Muvofiqlik talablari bo'lsa |
| MD5, SHA-1, SHA-256 (yolg'iz) | **Hech qachon** | Juda tez — milliardlab urinish soniyada |

Tavsiya etilgan funksiyalar: [[argon2|Argon2]] va [[bcrypt|bcrypt]].

Python'da Argon2id:

```python
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError

ph = PasswordHasher()        # xavfsiz standart parametrlar bilan

hash_ = ph.hash("foydalanuvchi_paroli")       # salt avtomatik, natijada parametrlar ham saqlanadi

def check(stored_hash: str, password: str) -> bool:
    try:
        ph.verify(stored_hash, password)
        return True
    except VerifyMismatchError:
        return False

# Parametrlar kuchaytirilgan bo'lsa — kirish paytida eski xeshni yangilash
if ph.check_needs_rehash(hash_):
    hash_ = ph.hash("foydalanuvchi_paroli")
```

Qaydnoma'dagi `werkzeug.security` ham xavfsiz standart funksiyadan foydalanadi. Muhimi — tayyor, sinalgan kutubxona; **o'z xesh sxemangizni o'ylab topmang**.

### Parol siyosati — zamonaviy yondashuv

| Eski amaliyot | Zamonaviy tavsiya (masalan, NIST yo'riqnomalari) |
|---|---|
| "Katta harf + raqam + belgi" majburiyati | **Uzunlik** muhimroq; murakkablik qoidalari ko'pincha `Parol1!` kabi taxmin qilinadigan parollarga olib keladi |
| Har 90 kunda majburiy almashtirish | Faqat buzilish belgisi bo'lganda almashtirish |
| Maksimal uzunlik 16 belgi | Uzun parollar va parol iboralariga ruxsat (o'nlab belgi) |
| — | **Sizib chiqqan parollar ro'yxatiga** qarshi tekshirish |
| Parolni joylashtirish (paste) taqiqlangan | Ruxsat — parol menejerlari uchun |

## Brute force va hisobni himoyalash

Login sahifasi — eng ko'p hujum qilinadigan endpoint (b1 bosqichidagi brute force va spraying).

| Himoya | Izoh |
|---|---|
| **Rate limiting** | IP va hisob bo'yicha urinishlar sonini cheklash |
| **Vaqtinchalik bloklash** | Ehtiyot: hujumchi ataylab boshqalarning hisoblarini bloklashi mumkin (DoS) — progressiv kechikish ko'pincha yaxshiroq |
| **MFA** | Parol sizib chiqsa ham — eng kuchli himoya |
| Bir xil xato xabari | User enumeration'ga qarshi (o'tgan darslar) |
| Loglash va monitoring | Muvaffaqiyatsiz urinishlar SIEM'ga — b2 bosqichidagi qoidalar |

### Parolni tiklash — keng tarqalgan zaif joy

| To'g'ri | Noto'g'ri |
|---|---|
| Token `secrets.token_urlsafe(32)` bilan — taxmin qilib bo'lmaydi | Ketma-ket raqam yoki vaqtga asoslangan token |
| Bir martalik, qisqa muddat (masalan, 30 daqiqa) | Abadiy amal qiladigan havola |
| Bazada token **xeshi** saqlanadi | Token ochiq saqlanadi |
| "Agar bunday hisob bo'lsa, xat yuborildi" — har doim bir xil javob | "Bunday email topilmadi" — user enumeration |
| Havola tiklash xatidagi domen **server sozlamasidan** olinadi | Havola domeni so'rovdagi `Host` sarlavhasidan olinadi — hujumchi o'z domenini qo'yishi mumkin |
| Tiklashdan keyin barcha faol sessiyalar bekor qilinadi | Eski sessiyalar ishlashda davom etadi |

## Sessiya va token

Foydalanuvchi parolini kiritdi va tekshirildi. Endi har bir keyingi so'rovda "bu o'sha foydalanuvchi" ekanini qanday bilasiz? Ikki asosiy yondashuv:

```
 SERVER SESSIYASI                                   TOKEN (masalan, JWT)

 Brauzer ── Cookie: sid=8f3a… ──► Server            Brauzer ── Authorization: Bearer eyJ… ──► Server
                                    │                                                      │
                                    ▼                                                      ▼
                         Sessiya ombori (Redis/DB):                         Token imzosini tekshiradi;
                         8f3a… → user_id=7, role=user                       ma'lumot token ICHIDA:
                                                                            {"sub": 7, "role": "user", "exp": …}
```

| | **Server sessiyasi** | **Token (JWT)** |
|---|---|---|
| Ma'lumot qayerda | Serverda; brauzerda faqat tasodifiy ID | Token ichida (imzolangan, lekin **shifrlanmagan**) |
| Bekor qilish (logout, bloklash) | Oson — serverda o'chiriladi | Qiyin — token muddati tugaguncha amal qiladi (qora ro'yxat yoki qisqa muddat kerak) |
| Kengayish (ko'p server) | Umumiy sessiya ombori kerak | Oson — har bir server imzoni o'zi tekshiradi |
| Odatiy qo'llanish | An'anaviy web ilovalar | API'lar, mobil ilovalar, xizmatlararo aloqa |

Qaydnoma'dagi Flask sessiyasi — o'rtadagi variant: ma'lumot cookie ichida, **imzolangan** (o'zgartirib bo'lmaydi), lekin shifrlanmagan va serverdan bekor qilish qiyin. Kichik ilova uchun yetarli; jiddiy ilovalarda ko'pincha server tomonidagi sessiya omboriga o'tiladi.

### Sessiyani boshqarish qoidalari

- **Kirishda yangi sessiya ID** — eski ID'ni qayta ishlatmaslik (session fixation'ga qarshi).
- **Muddatlar**: harakatsizlik (masalan, 30 daqiqa) va mutlaq (masalan, 12 soat).
- **Logout serverda** sessiyani yo'q qiladi — faqat cookie'ni o'chirish emas.
- **Muhim amallar oldidan qayta autentifikatsiya** — parolni yoki emailni o'zgartirish, to'lov.
- Cookie atributlari — o'tgan darsdagi `Secure`, `HttpOnly`, `SameSite`.

## JWT — imkoniyatlar va tuzoqlar

[[jwt|JWT]] uch qismdan iborat, nuqta bilan ajratilgan, har biri Base64URL'da kodlangan:

```
eyJhbGciOiJIUzI1NiJ9 . eyJzdWIiOiI3Iiwicm9sZSI6InVzZXIiLCJleHAiOjE3OTQ4MDAwMDB9 . <imzo>
└────── header ─────┘   └──────────────────────── payload ──────────────────────┘   └signature┘
  {"alg":"HS256"}        {"sub":"7","role":"user","exp":1794800000}
```

Kodlash bosqichidan eslaysiz: **Base64 — shifrlash emas.** Har kim token ichini o'qiy oladi. Imzo faqat **o'zgartirilmaganini** kafolatlaydi.

### JWT xatolari — himoyachi ro'yxati

| Xato | Oqibat | To'g'ri yo'l |
|---|---|---|
| Algoritmni tokendagi `alg` maydonidan olish | Hujumchi zaif yoki "imzosiz" algoritmni ko'rsatib, tekshiruvni chetlab o'tishi mumkin | Serverda ruxsat etilgan algoritmni **aniq** belgilash |
| Zaif HMAC kaliti (`secret`, `123456`) | Kalitni taxmin qilib, istalgan token yaratish | Uzun tasodifiy kalit (`secrets`), muhitdan |
| `exp` (muddat) yo'q yoki tekshirilmaydi | O'g'irlangan token abadiy ishlaydi | Qisqa muddat (daqiqalar) + refresh token |
| Maxfiy ma'lumot payload'da | Har kim o'qiydi | Faqat identifikator va kerakli minimal ma'lumot |
| Imzo tekshirilmasdan "decode" qilish | Soxta token qabul qilinadi | Har doim tekshiruv bilan decode |
| `aud` / `iss` tekshirilmaydi | Boshqa xizmat uchun berilgan token qabul qilinadi | Auditoriya va emitentni tekshirish |

PyJWT bilan to'g'ri tekshirish:

```python
import jwt   # PyJWT

payload = jwt.decode(
    token,
    key=os.environ["JWT_SECRET"],
    algorithms=["HS256"],          # aniq ro'yxat — tokendagi alg'ga ishonmaslik
    audience="qaydnoma-api",
    issuer="https://qaydnoma.example",
)   # muddati o'tgan yoki imzo noto'g'ri bo'lsa — istisno ko'tariladi
```

### Tokenni brauzerda qayerda saqlash

| Joy | XSS bo'lsa | CSRF |
|---|---|---|
| `localStorage` | Hujumchi skripti tokenni **o'qib, o'g'irlaydi** | Avtomatik yuborilmaydi — CSRF yo'q |
| `HttpOnly` cookie | Skript o'qiy olmaydi (lekin nomingizdan so'rov yubora oladi) | Avtomatik yuboriladi — CSRF himoyasi kerak (`SameSite` + token) |

Mukammal javob yo'q — har birida murosaga kelish bor. Ko'p mutaxassislar web ilovalar uchun `HttpOnly` + `SameSite` cookie va CSRF himoyasini afzal ko'radi. Eng muhimi — tanlovni **ongli** qilish va uning zaif tomonini boshqa qatlam bilan yopish.

## OAuth 2.0 va OpenID Connect

### Ular nima uchun

- **[[oauth|OAuth 2.0]]** — **avtorizatsiya** (ruxsat berish): "Bu ilovaga mening Google Drive'imdagi fayllarni o'qishga ruxsat beraman — parolimni bermasdan."
- **[[oidc|OpenID Connect]]** (OIDC) — OAuth ustiga qurilgan **autentifikatsiya**: "Bu foydalanuvchi — Google'dagi falonchi." "Google orqali kirish" — aslida OIDC.

### Rollar

| Rol | Misol |
|---|---|
| **Resource owner** | Foydalanuvchi |
| **Client** | Qaydnoma (ruxsat so'rayotgan ilova) |
| **Authorization server** | Google'ning kirish xizmati |
| **Resource server** | Google API (ma'lumot shu yerda) |

### Authorization Code oqimi (PKCE bilan)

Bugungi kunda tavsiya etiladigan asosiy oqim:

```
 Foydalanuvchi      Brauzer                    Qaydnoma (client)            Authorization server
      │                │                              │                              │
      │ "Google orqali │                              │                              │
      │  kirish"       │──────── 1 ──────────────────►│                              │
      │                │                              │ state, code_verifier yaratadi│
      │                │◄─────── 2: yo'naltirish ──────│                              │
      │                │  /authorize?client_id&redirect_uri&scope&state&code_challenge│
      │                │────────────────────────────────────────────────────────────►│
      │  login + rozilik ◄──────────────────────────────────────────────────────────►│
      │                │◄─────── 3: redirect_uri?code=…&state=… ───────────────────────│
      │                │──────── 4 ──────────────────►│                              │
      │                │                              │ state mos keladimi? ✓        │
      │                │                              │── 5: code + code_verifier ──►│
      │                │                              │◄─ 6: access_token, id_token ─│
      │                │◄─────── 7: tizimga kirdi ─────│                              │
```

Har bir elementning xavfsizlik vazifasi:

| Element | Nimadan himoya qiladi |
|---|---|
| **`state`** | CSRF — hujumchi o'z kodini sizning sessiyangizga "uloqtirishi" (3–4 qadamda tekshiriladi) |
| **`redirect_uri` aniq mosligi** | Kod hujumchi domeniga yuborilishi — server faqat oldindan ro'yxatdan o'tgan **aniq** URL'ga yo'naltiradi |
| **PKCE** (`code_verifier` / `code_challenge`) | Ushlab olingan `code` ni boshqasi tokenga almashtira olmaydi |
| **Kod brauzer orqali, token esa server orqali** | Access token brauzer tarixi va loglariga tushmaydi |
| **`id_token` (JWT) tekshiruvi** | Imzo, `iss`, `aud`, `exp`, `nonce` — OIDC'da foydalanuvchi kimligini isbotlaydi |
| **`scope` — minimal** | Ilova faqat haqiqatan kerak ruxsatlarni so'raydi |

Eski **Implicit** oqimi (token to'g'ridan-to'g'ri URL'da) — endi tavsiya etilmaydi.

:::warn
**OAuth'ni o'zingiz noldan yozmang.** Bu protokolda o'nlab nozik tekshiruvlar bor va bittasini o'tkazib yuborish — hisoblarni egallab olishga olib keladi (haqiqiy ilovalarda `state` yo'qligi, `redirect_uri` ni qisman tekshirish, `id_token` imzosini tekshirmaslik — tez-tez uchraydigan topilmalar). Freymvorkingiz uchun sinalgan, faol qo'llab-quvvatlanadigan kutubxonadan foydalaning va provayder hujjatiga amal qiling. AppSec muhandisi sifatida sizning vazifangiz — kod ko'rib chiqishda yuqoridagi jadvaldagi har bir element mavjudligini tekshirish.
:::

## SSO va korporativ autentifikatsiya

| Texnologiya | Qayerda |
|---|---|
| **OIDC** | Zamonaviy web va mobil ilovalar, "X orqali kirish" |
| **SAML** | Korporativ SSO — eski, XML asosidagi, lekin juda keng tarqalgan |
| **Kerberos / Active Directory** | Korporativ Windows tarmoqlari (b1 bosqichidagi 4768/4769) |

SSO'ning xavfsizlik tomoni: bitta kuchli markaziy kirish (MFA bilan) — yaxshi; lekin markaziy hisob buzilsa — hamma ilovalarga kirish ochiladi (b4 bosqichidagi bulut loglari darsi: "identifikatsiya — yangi chegara").

:::key
**Autentifikatsiya — o'zingiz yozmaydigan narsa.** Parol xeshlash, sessiya boshqaruvi, JWT, OAuth — hammasi uchun sinalgan kutubxonalar va freymvork imkoniyatlari bor. O'zingiz o'ylab topgan "maxsus" sxemalar — klassik zaiflik manbai. AppSec muhandisining roli: to'g'ri kutubxona tanlanganini, **to'g'ri sozlanganini** (algoritmlar, muddatlar, cookie atributlari, `state`, `redirect_uri`) va chegaraviy holatlar (parolni tiklash, logout, sessiya muddati) to'g'ri ishlashini tekshirish.
:::

## Bu dars nimani bermaydi

- **Har bir protokolning to'liq spetsifikatsiyasini** — OAuth va OIDC hujjatlari va OWASP cheat sheet'lari.
- **Kriptografik tafsilotlarni** — imzolar va kalitlar xavfsizlik bosqichidagi kriptografiya darslarida.
- **Avtorizatsiyani** — "kim nimaga haqli" a2 bosqichidagi kirish nazorati darsida.

:::try
**1. Argon2.** `pip install argon2-cffi` va yuqoridagi kod bilan parolni xeshlang. Bir xil parolni ikki marta xeshlang — natijalar bir xilmi? Nega? Xesh qatorida qaysi parametrlar ko'rinadi?

**2. JWT'ni o'qing.** jwt.io saytida (yoki Python'da `base64` bilan) yuqoridagi namunaviy tokenning header va payload qismlarini dekodlang. Imzo kalitisiz qanday ma'lumotni ko'ra oldingiz? Bu nimani anglatadi?

**3. Qaydnoma'ga parolni tiklash.** Yuqoridagi jadval bo'yicha parolni tiklash funksiyasini loyihalang (kod shart emas — qadamlar): token qanday yaratiladi, qayerda va qanday saqlanadi, qancha amal qiladi, javob matni qanday, havola domeni qayerdan olinadi, tiklashdan keyin nima bo'ladi?

**4. OAuth oqimini chizing.** "Qaydnoma'ga Google orqali kirish" uchun Authorization Code + PKCE oqimini o'z so'zlaringiz bilan chizing va har bir qadamda nima tekshirilishi kerakligini yozing.

**5. PortSwigger Academy.** OAuth autentifikatsiya bo'limidagi nazariy materialni o'qing va birinchi (Apprentice darajasidagi) laboratoriyani o'z brauzeringizda bajaring.

*Javoblar: 1 — yo'q, har safar yangi salt ishlatiladi, shuning uchun xeshlar farq qiladi; xesh qatorida algoritm (`argon2id`), versiya va xotira, vaqt, parallellik parametrlari ko'rinadi — shuning uchun tekshirishda ular avtomatik o'qiladi. 2 — header va payload to'liq o'qiladi: JWT shifrlanmagan, maxfiy ma'lumotni unga qo'ymaslik kerak.*
:::

## Xulosa

- Parollar: **Argon2id** (yoki scrypt, bcrypt), tayyor kutubxona, salt avtomatik; MD5/SHA yolg'iz — hech qachon.
- Parol siyosati: **uzunlik**, sizib chiqqan parollarga qarshi tekshirish, majburiy murakkablik va davriy almashtirishsiz.
- Login himoyasi: **rate limiting**, ehtiyotkor bloklash, **MFA**, bir xil xabar, loglash.
- Parolni tiklash: tasodifiy, bir martalik, qisqa muddatli, **xeshlangan** token; har doim bir xil javob; domen serverdan; sessiyalarni bekor qilish.
- **Server sessiyasi** (oson bekor qilinadi) va **token** (kengayadi, bekor qilish qiyin); kirishda yangi ID, muddatlar, server tomonida logout.
- **JWT** — imzolangan, **shifrlanmagan**; algoritm **serverda aniq**, kuchli kalit, qisqa `exp`, `aud`/`iss` tekshiruvi.
- **OAuth 2.0** — avtorizatsiya, **OIDC** — autentifikatsiya; **Authorization Code + PKCE**, `state`, aniq `redirect_uri`, `id_token` tekshiruvi; o'zingiz yozmang.

:::quiz
? Parollarni saqlash uchun qaysi funksiya tavsiya etiladi?
+ Argon2id
- MD5
- SHA-256 (yolg'iz)
- Base64
! Argon2id ataylab sekin va xotira talab qiladi — buzishni juda qimmatlashtiradi.

? Nega bir xil parolni ikki marta Argon2 bilan xeshlaganda natijalar farq qiladi?
+ Har safar yangi tasodifiy salt ishlatiladi
- Argon2 xato qiladi
- Parol har safar o'zgaradi
- Natija faqat vaqtga bog'liq
! Salt bir xil parollarning xeshlari bir xil bo'lmasligini va rainbow table'larni befoyda qiladi.

? Zamonaviy parol siyosati haqida qaysi gap to'g'ri?
+ Uzunlik va sizib chiqqan parollar ro'yxatiga qarshi tekshirish majburiy murakkablik qoidalaridan muhimroq
- Har 30 kunda majburiy almashtirish eng yaxshi amaliyot
- Parol 16 belgidan uzun bo'lmasligi kerak
- Parolni joylashtirish (paste) taqiqlanishi kerak
! Murakkablik qoidalari ko'pincha taxmin qilinadigan parollarga olib keladi.

? Parolni tiklash havolasining domeni qayerdan olinishi kerak?
- So'rovdagi Host sarlavhasidan
+ Server konfiguratsiyasidan
- Foydalanuvchi kiritgan emaildan
- Referer sarlavhasidan
! Host sarlavhasini hujumchi o'zgartirib, tiklash havolasini o'z domeniga yo'naltirishi mumkin.

? Server sessiyasining JWT'ga nisbatan asosiy afzalligi nima?
+ Uni serverda darhol bekor qilish (logout, bloklash) oson
- U ko'p serverda kengaytirish uchun osonroq
- U ma'lumotni brauzerda saqlaydi
- U imzo talab qilmaydi
! JWT muddati tugaguncha amal qiladi — bekor qilish uchun qo'shimcha mexanizm kerak.

? JWT payload'i haqida qaysi gap to'g'ri?
- U shifrlangan va hech kim o'qiy olmaydi
+ U faqat Base64URL'da kodlangan — har kim o'qiy oladi; imzo faqat o'zgartirilmaganini kafolatlaydi
- U parolni saqlash uchun eng yaxshi joy
- U serverda saqlanadi
! JWT'ga maxfiy ma'lumot qo'yilmaydi.

? JWT tekshirishda algoritm qayerdan olinishi kerak?
- Tokenning header'idagi alg maydonidan
+ Serverda aniq belgilangan ruxsat etilgan algoritmlar ro'yxatidan
- Foydalanuvchi tanlovidan
- Algoritm muhim emas
! Tokendagi alg'ga ishonish hujumchiga tekshiruvni chetlab o'tishga imkon berishi mumkin.

? OAuth 2.0 va OpenID Connect farqi nima?
+ OAuth — avtorizatsiya (ruxsat berish); OIDC — uning ustidagi autentifikatsiya (foydalanuvchi kimligi)
- Ular bir xil
- OAuth — autentifikatsiya, OIDC — shifrlash
- OIDC faqat mobil uchun
! “Google orqali kirish” — aslida OIDC.

? OAuth'dagi state parametri nimadan himoya qiladi?
- Parolni terishdan
+ CSRF — hujumchi o'z avtorizatsiya kodini foydalanuvchi sessiyasiga “uloqtirishidan”
- XSS'dan
- SQL injection'dan
! Client state qiymatini yaratadi va qaytishda mosligini tekshiradi.

? PKCE nima uchun kerak?
+ Ushlab olingan avtorizatsiya kodini boshqa birov tokenga almashtira olmasligi uchun
- Parolni xeshlash uchun
- Cookie'ni shifrlash uchun
- CORS'ni sozlash uchun
! Client code_verifier'ni faqat o'zi biladi.

? Ilovaga OAuth qo'shishda eng to'g'ri yondashuv qaysi?
- Protokolni noldan o'zingiz yozish
+ Sinalgan, faol qo'llab-quvvatlanadigan kutubxonani ishlatib, provayder hujjatiga amal qilish
- Eski Implicit oqimidan foydalanish
- redirect_uri'ni prefiks bo'yicha tekshirish
! O'nlab nozik tekshiruvning bittasini o'tkazib yuborish — hisoblarni egallab olishga olib keladi.
:::

:::cards
Parollar uchun tavsiya etilgan funksiyalar? :: Argon2id (birinchi), scrypt, bcrypt (72 bayt chegarasi), PBKDF2 (ko'p iteratsiya); MD5/SHA yolg'iz — hech qachon.
Zamonaviy parol siyosati? :: Uzunlik, sizib chiqqan parollarga qarshi tekshirish, paste'ga ruxsat; majburiy murakkablik va davriy almashtirishsiz.
Login himoyalari? :: Rate limiting, ehtiyotkor bloklash (progressiv kechikish), MFA, bir xil xato xabari, loglash.
Parolni tiklash qoidalari? :: Tasodifiy bir martalik token, qisqa muddat, bazada xeshi, har doim bir xil javob, domen serverdan, sessiyalarni bekor qilish.
Server sessiyasi va token? :: Sessiya — ma'lumot serverda, oson bekor qilinadi; token — ma'lumot ichida, kengayadi, bekor qilish qiyin.
Sessiya boshqaruvi qoidalari? :: Kirishda yangi ID, harakatsizlik va mutlaq muddat, serverda logout, muhim amallardan oldin qayta autentifikatsiya.
JWT tuzilishi? :: header.payload.signature — Base64URL; imzolangan, shifrlanmagan.
JWT xatolari? :: Tokendagi alg'ga ishonish, zaif kalit, exp yo'qligi, maxfiy ma'lumot payload'da, imzosiz decode, aud/iss tekshirilmasligi.
Tokenni qayerda saqlash? :: localStorage — XSS'da o'g'irlanadi; HttpOnly cookie — CSRF himoyasi kerak; murosani ongli tanlash.
OAuth va OIDC? :: OAuth 2.0 — avtorizatsiya; OpenID Connect — autentifikatsiya (ID token).
Authorization Code + PKCE himoyalari? :: state (CSRF), aniq redirect_uri, PKCE (kodni o'g'irlashga qarshi), token server orqali, id_token tekshiruvi, minimal scope.
Autentifikatsiya qoidasi? :: O'zingiz yozmang — sinalgan kutubxonalar; AppSec vazifasi — to'g'ri sozlanganini tekshirish.
:::
