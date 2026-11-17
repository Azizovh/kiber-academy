Qaydnoma foydalanuvchisi tizimga kirgan va boshqa yorliqda forum o'qiyapti. Forumdagi bitta postda ko'rinmas forma bor — sahifa ochilishi bilan u avtomatik ravishda Qaydnoma'ga yuboriladi: `POST /notes/42/delete`. Brauzer bu so'rovga Qaydnoma sessiya cookie'sini **o'zi qo'shadi**. Server uchun bu — foydalanuvchining o'zidan kelgan haqiqiy so'rov. Qayd o'chirildi.

Hujumchi foydalanuvchi parolini bilmaydi, cookie'sini o'g'irlamagan, Qaydnoma'da hech qanday kod ishga tushirmagan. U shunchaki foydalanuvchining brauzerini **uning nomidan so'rov yuborishga** majbur qildi.

Bu — **CSRF** (Cross-Site Request Forgery). a1 bosqichidagi brauzer xavfsizlik modeli darsidan sababini bilasiz: Same-Origin Policy boshqa saytga so'rov **yuborishni** to'smaydi — faqat javobni o'qishni. Bu darsda — CSRF qachon mumkin va uni qanday qatlamli himoya bilan yopish.

## CSRF qachon ishlaydi

CSRF uchun uchta shart kerak:

| Shart | Qaydnoma'da |
|---|---|
| **1. Muhim amal** — holatni o'zgartiradi | Qaydni o'chirish, parolni yoki emailni o'zgartirish, qaydni ulashish |
| **2. Avtomatik autentifikatsiya** — brauzer o'zi qo'shadigan narsa | Sessiya cookie'si (shuningdek, HTTP Basic auth, ba'zan IP asosidagi ishonch) |
| **3. Oldindan aytib bo'ladigan so'rov** — hujumchi barcha parametrlarni biladi | `POST /notes/42/delete` — hech qanday maxfiy qiymat yo'q |

Himoya — kamida bitta shartni buzish. Eng yaxshisi — bir nechtasini.

### CSRF bo'lmaydigan holatlar

| Holat | Nega |
|---|---|
| Faqat ma'lumot o'qiydigan GET | Hujumchi javobni o'qiy olmaydi (SOP) — agar GET holatni o'zgartirmasa (a1 bosqichi) |
| `Authorization: Bearer` sarlavhasi bilan token (cookie emas) | Brauzer sarlavhani avtomatik qo'shmaydi — 2-shart yo'q |
| Har so'rovda parol yoki maxfiy qiymat so'raladi | 3-shart yo'q |

Muhim nuance: agar API tokenni **cookie**da saqlasa — CSRF yana mumkin (a1 bosqichidagi tokenni qayerda saqlash jadvali).

## Himoya qatlamlari

### 1. CSRF tokeni — asosiy himoya

Server har bir sessiya (yoki forma) uchun **tasodifiy, taxmin qilib bo'lmaydigan** token yaratadi va uni formaga yashirin maydon sifatida qo'yadi. Har bir holatni o'zgartiruvchi so'rovda token tekshiriladi. Hujumchi sayti bu tokenni bilmaydi va o'qiy olmaydi (SOP) — demak, to'g'ri so'rov yasay olmaydi. 3-shart buziladi.

Flask'da tayyor kengaytma — **Flask-WTF** (`CSRFProtect`):

```python
from flask_wtf.csrf import CSRFProtect

csrf = CSRFProtect(app)   # barcha POST/PUT/PATCH/DELETE so'rovlarda token tekshiriladi
```

Har bir formada:

```html
<form method="post" action="{{ url_for('note_delete', note_id=note.id) }}">
  <input type="hidden" name="csrf_token" value="{{ csrf_token() }}">
  <button type="submit">O'chirish</button>
</form>
```

JavaScript (`fetch`) so'rovlari uchun token odatda sarlavhada yuboriladi:

```html
<meta name="csrf-token" content="{{ csrf_token() }}">
```

```javascript
const token = document.querySelector('meta[name="csrf-token"]').content;
await fetch(`/notes/${id}/delete`, { method: "POST", headers: { "X-CSRFToken": token } });
```

Token talablari — o'zingiz yozsangiz (yaxshisi — yozmang, tayyor kengaytmani ishlating):

| Talab | Nega |
|---|---|
| Kriptografik tasodifiy (`secrets`) | Taxmin qilib bo'lmasligi uchun |
| Sessiyaga bog'langan | Hujumchi o'z tokenini qurbonnikiga almashtira olmasligi uchun |
| Har bir holatni o'zgartiruvchi so'rovda **majburiy** | Token yo'q bo'lsa — rad etish, "token yo'q — tekshirmayman" emas |
| URL'da emas, forma yoki sarlavhada | URL'lar loglarga va `Referer` ga tushadi (a1 bosqichi) |
| Doimiy vaqtda solishtirish | Vaqt bo'yicha taxmin qilishning oldini olish |

Klassik xato: token faqat **mavjud bo'lsa** tekshiriladi. Hujumchi tokenni umuman yubormaydi — va tekshiruv o'tkazib yuboriladi.

### 2. SameSite cookie — kuchli qo'shimcha qatlam

a1 bosqichidagi `SameSite=Lax` boshqa saytdan boshlangan POST so'rovlarda cookie'ni yubormaydi — 2-shart buziladi. Ko'p zamonaviy brauzerlarda `Lax` standart holatga aylangan.

Lekin faqat `SameSite` ga tayanmang:
- **Eski brauzerlar** uni qo'llamasligi mumkin.
- `Lax` **GET** navigatsiyada cookie'ni yuboradi — agar biror GET holatni o'zgartirsa (bu o'zi xato), CSRF mumkin.
- **Bir saytning subdomenlari** "same-site" hisoblanadi: agar `blog.qaydnoma.example` da XSS yoki zaif sahifa bo'lsa, u yerdan `app.qaydnoma.example` ga so'rov "same-site" bo'ladi va cookie yuboriladi.

### 3. Origin va Referer tekshiruvi

Brauzer holatni o'zgartiruvchi so'rovlarga odatda `Origin` sarlavhasini qo'shadi. Server uni kutilgan qiymat bilan solishtirishi mumkin:

```python
ALLOWED_ORIGINS = {"https://qaydnoma.example"}

@app.before_request
def check_origin():
    if request.method in {"POST", "PUT", "PATCH", "DELETE"}:
        origin = request.headers.get("Origin")
        if origin is not None and origin not in ALLOWED_ORIGINS:
            abort(403)
```

Bu — qo'shimcha qatlam: `Origin` ba'zan yo'q bo'lishi mumkin (yuqoridagi kodda `None` o'tkazib yuboriladi — token asosiy himoya bo'lib qoladi). Zamonaviy brauzerlar **Fetch Metadata** sarlavhalarini ham yuboradi (`Sec-Fetch-Site: cross-site`) — ular asosida begona saytlardan kelgan holatni o'zgartiruvchi so'rovlarni rad etish mumkin.

### 4. Muhim amallar uchun qayta tasdiqlash

Parol, email yoki to'lov ma'lumotlarini o'zgartirishda — **joriy parolni** so'rash (a1 bosqichidagi qayta autentifikatsiya). Hujumchi parolni bilmaydi — 3-shart buziladi. Bu, shuningdek, XSS va o'g'irlangan sessiya holatlarida ham himoya qiladi.

### 5. GET holatni o'zgartirmasin

a1 bosqichidagi qoida: `GET /notes/42/delete` — CSRF uchun eng oson nishon (rasm tegi yoki havola bilan ishlaydi, `SameSite=Lax` ham to'smaydi). Holatni o'zgartiruvchi barcha amallar — `POST`/`PUT`/`PATCH`/`DELETE`.

## Qatlamlar birgalikda

| Qatlam | Qaysi shartni buzadi | Cheklovi |
|---|---|---|
| **CSRF tokeni** | 3 — so'rovni oldindan aytib bo'lmaydi | To'g'ri joriy etilishi kerak (majburiy tekshiruv) |
| **SameSite=Lax/Strict** | 2 — cookie avtomatik yuborilmaydi | Eski brauzerlar, subdomenlar, holatni o'zgartiruvchi GET |
| **Origin / Fetch Metadata** | 3 — begona manba aniqlanadi | Sarlavha har doim ham yo'q |
| **Qayta autentifikatsiya** | 3 — hujumchi parolni bilmaydi | Faqat eng muhim amallar uchun qulay |
| **To'g'ri HTTP metodlari** | GET orqali hujumni yo'q qiladi | Yolg'iz yetarli emas |

:::key
**XSS bo'lsa, CSRF himoyasi yo'qqa chiqadi.** CSRF tokeni hujumchi sayti tokenni o'qiy olmagani uchun ishlaydi (SOP). Lekin XSS hujumchi kodini **sizning origin'ingiz ichiga** olib kiradi — u kod sahifadagi tokenni o'qiydi va to'g'ri so'rov yuboradi. Shuning uchun CSRF va XSS himoyalari bir-birini to'ldiradi: CSRF tokeni tashqi saytlardan himoya qiladi, XSS'ni yo'q qilish esa ichkaridan kelgan tahdidni. Bitta zaiflik boshqasini kuchaytirishi — AppSec'da tez-tez uchraydigan holat (zanjir).
:::

## Login CSRF va boshqa variantlar

- **Login CSRF**: hujumchi qurbonni **o'zining** (hujumchining) hisobiga kiritadi. Qurbon buni sezmay, shaxsiy ma'lumotlarini (qaydlar, to'lov ma'lumotlari) hujumchi hisobiga yozadi. Himoya: login formasida ham CSRF tokeni.
- **OAuth `state`** — a1 bosqichidagi OAuth oqimidagi `state` parametri aynan CSRF himoyasi.
- **JSON API'lar**: brauzer formalari faqat ma'lum `Content-Type`'larni yubora oladi; `application/json` talab qilish va noto'g'ri `Content-Type`'ni rad etish qo'shimcha to'siq — lekin yolg'iz himoya emas (sozlamalarga qarab aylanib o'tilishi mumkin). CSRF tokeni yoki `Authorization` sarlavhasi — asosiy.

## Kodda CSRF'ni topish

Kod ko'rib chiqishda (a3):

- Holatni o'zgartiruvchi barcha marshrutlar ro'yxati: ularda CSRF himoyasi bormi?
- `@csrf.exempt` yoki shunga o'xshash istisnolar — har biri uchun asos bormi? (Masalan, tashqi xizmat webhook'i — uning o'rniga imzo tekshiruvi bo'lishi kerak.)
- `methods=["GET", "POST"]` va GET'da ham holat o'zgarishi.
- Cookie'ning `SameSite` atributi.
- Token tekshiruvi **ixtiyoriy** emasligi.

## Sinash — o'z ilovangizda

1. Flask-WTF'siz Qaydnoma'da kompyuteringizda oddiy HTML fayl yarating: Qaydnoma'ga `POST /notes/<id>/delete` yuboradigan forma. Qaydnoma'ga kirgan holda faylni oching va tugmani bosing — qayd o'chdimi? (Lokal sinovda `SameSite` va brauzer xatti-harakati natijaga ta'sir qilishi mumkin — kuzating va qayd eting.)
2. `CSRFProtect` ni qo'shing va formalarga token qo'ying — xuddi shu HTML fayldan so'rov endi `400` bilan rad etiladi.

## Bu dars nimani bermaydi

- **Har bir freymvorkning CSRF tafsilotlarini** — Django, Rails, Spring, Laravel'da o'rnatilgan himoya bor; uni o'chirmaslik kerak.
- **XSS himoyasini** — o'tgan dars.
- **Hujum yaratish texnikalarini** — maqsad himoyani tushunish va tekshirish.

:::try
**1. Uch shart.** Qaydnoma'ning quyidagi amallari uchun CSRF uchta shartini tekshiring: (a) qaydlar ro'yxatini ko'rish; (b) qaydni o'chirish; (c) parolni o'zgartirish; (d) `Authorization: Bearer` token bilan ishlaydigan API orqali qayd yaratish.

**2. CSRFProtect.** `pip install flask-wtf`, `CSRFProtect(app)` ni qo'shing va barcha formalarga `csrf_token()` ni joylang. Tokensiz `POST` so'rovi rad etilishini (`curl -X POST ...`) tekshiring.

**3. Parolni o'zgartirish.** Qaydnoma'ga parolni o'zgartirish funksiyasini qo'shing — joriy parolni so'rash, CSRF tokeni va o'zgartirishdan keyin boshqa sessiyalarni bekor qilish bilan.

**4. Kodni baholang.** Quyidagi kodda qanday muammo bor?

```python
@app.route("/notes/<int:nid>/delete", methods=["GET", "POST"])
@login_required
def note_delete(nid):
    if request.form.get("csrf_token") and request.form["csrf_token"] != session["csrf"]:
        abort(400)
    ...
```

**5. PortSwigger Academy.** CSRF bo'limidagi nazariy qism va dastlabki laboratoriyalar.

*Javoblar: 1 — (a) holat o'zgarmaydi — CSRF tahdid emas; (b) va (c) — uchala shart bor, himoya kerak; (d) brauzer `Authorization` sarlavhasini avtomatik qo'shmaydi — klassik CSRF yo'q. 4 — ikkita xato: GET orqali ham o'chirish mumkin; token yo'q bo'lsa tekshiruv umuman o'tkazib yuboriladi (shart `csrf_token` mavjud bo'lsagina tekshiradi).*
:::

## Xulosa

- **CSRF** — hujumchi qurbon brauzerini uning nomidan so'rov yuborishga majbur qiladi; SOP so'rov yuborishni to'smaydi.
- Uch shart: **muhim amal**, **avtomatik autentifikatsiya** (cookie), **oldindan aytib bo'ladigan so'rov**.
- **CSRF tokeni** — asosiy himoya: tasodifiy, sessiyaga bog'langan, **majburiy**, URL'da emas; tayyor kengaytma (Flask-WTF).
- **SameSite=Lax/Strict** — kuchli qo'shimcha qatlam (eski brauzerlar, subdomenlar, holatni o'zgartiruvchi GET — cheklovlari).
- **Origin / Fetch Metadata** tekshiruvi, muhim amallar uchun **qayta autentifikatsiya**, **GET holatni o'zgartirmaydi**.
- **XSS bo'lsa — CSRF himoyasi yo'qqa chiqadi**; ikkalasi birga kerak.
- Login CSRF, OAuth `state`, JSON API'lar — maxsus holatlar.

:::quiz
? CSRF qanday ishlaydi?
+ Hujumchi sayti qurbon brauzerini kerakli saytga so'rov yuborishga majbur qiladi va brauzer unga sessiya cookie'sini o'zi qo'shadi
- Hujumchi qurbon parolini o'g'irlaydi
- Hujumchi serverda kod bajaradi
- Hujumchi ma'lumotlar bazasini o'qiydi
! SOP so'rov yuborishni to'smaydi, faqat javobni o'qishni.

? CSRF uchun qaysi uch shart kerak?
+ Muhim (holatni o'zgartiruvchi) amal, avtomatik autentifikatsiya (cookie), oldindan aytib bo'ladigan so'rov
- HTTPS, parol va admin huquqi
- XSS, SQL injection va IDOR
- Faqat GET so'rovi
! Himoya — kamida bitta shartni buzish.

? Nega Authorization: Bearer sarlavhasi bilan ishlaydigan API odatda klassik CSRF'ga zaif emas?
+ Brauzer bu sarlavhani boshqa saytdan yuborilgan so'rovga avtomatik qo'shmaydi
- Bearer token shifrlangan
- API'lar CSRF'dan avtomatik himoyalangan
- Bearer faqat GET uchun
! Lekin token cookie'da saqlansa — CSRF yana mumkin.

? CSRF tokenining asosiy talablari qaysilar?
+ Kriptografik tasodifiy va sessiyaga bog'langan
+ Har bir holatni o'zgartiruvchi so'rovda majburiy tekshiriladi
- URL parametrida yuboriladi
- Faqat mavjud bo'lsa tekshiriladi
! Token yo'qligi — rad etish sababi, tekshiruvni o'tkazib yuborish emas.

? SameSite=Lax cookie haqida qaysi gap to'g'ri?
+ U kuchli qo'shimcha qatlam, lekin eski brauzerlar, subdomenlar va holatni o'zgartiruvchi GET so'rovlari tufayli yolg'iz yetarli emas
- U CSRF'ni har qanday holatda to'liq to'xtatadi
- U faqat XSS'dan himoya qiladi
- U cookie'ni shifrlaydi
! CSRF tokeni bilan birga ishlatiladi.

? Nega XSS bo'lsa, CSRF tokeni himoya qilmaydi?
+ XSS kodi saytning o'z origin'ida ishlaydi va sahifadagi tokenni o'qib, to'g'ri so'rov yubora oladi
- XSS tokenni o'chiradi
- Token XSS paytida o'zgaradi
- CSRF tokeni faqat GET uchun
! Ikkala himoya bir-birini to'ldiradi.

? Login CSRF nima?
+ Hujumchi qurbonni o'z (hujumchi) hisobiga kiritadi va qurbon shaxsiy ma'lumotlarini bilmagan holda shu hisobga yozadi
- Hujumchi login sahifasini o'chiradi
- Hujumchi parolni taxmin qiladi
- Bu CSRF emas, XSS
! Himoya — login formasida ham CSRF tokeni.

? Parolni o'zgartirish uchun qaysi qo'shimcha himoya ayniqsa foydali?
+ Joriy parolni so'rash (qayta autentifikatsiya)
- Formani GET bilan yuborish
- CSRF tokenini URL'ga qo'yish
- Cookie'dan SameSite'ni olib tashlash
! Hujumchi parolni bilmaydi — so'rovni yasay olmaydi; bu XSS va o'g'irlangan sessiyada ham yordam beradi.

? Kod ko'rib chiqishda @csrf.exempt topildi. To'g'ri munosabat qaysi?
+ Har bir istisno uchun asos bor-yo'qligini tekshirish (masalan, webhook bo'lsa — uning o'rniga imzo tekshiruvi bormi)
- Istisnolar har doim normal
- Darhol hamma joyga exempt qo'shish
- E'tiborsiz qoldirish
! Asossiz istisno — CSRF teshigi.

? Qaysi marshrut CSRF nuqtai nazaridan eng xavfli dizayn?
+ GET /notes/42/delete
- POST /notes/42/delete CSRF tokeni bilan
- GET /notes (faqat ro'yxat)
- DELETE /api/notes/42 Authorization sarlavhasi bilan
! Holatni o'zgartiruvchi GET rasm tegi yoki havola orqali ham chaqiriladi va SameSite=Lax uni to'smaydi.
:::

:::cards
CSRF nima? :: Qurbon brauzerini uning nomidan, avtomatik qo'shilgan cookie bilan so'rov yuborishga majbur qilish.
CSRF'ning uch sharti? :: Holatni o'zgartiruvchi amal, avtomatik autentifikatsiya (cookie), oldindan aytib bo'ladigan so'rov.
CSRF bo'lmaydigan holatlar? :: Holatni o'zgartirmaydigan GET, Authorization sarlavhasidagi token, har so'rovda maxfiy qiymat talab qilinishi.
CSRF tokeni talablari? :: Kriptografik tasodifiy, sessiyaga bog'langan, majburiy, URL'da emas, doimiy vaqtda solishtiriladi.
Flask'da CSRF himoyasi? :: Flask-WTF CSRFProtect(app) va har bir formada csrf_token(); JS uchun X-CSRFToken sarlavhasi.
Klassik token xatosi? :: Token faqat mavjud bo'lsa tekshiriladi — hujumchi tokenni yubormaydi va tekshiruv o'tkazib yuboriladi.
SameSite cheklovlari? :: Eski brauzerlar, bir saytning subdomenlari (same-site), holatni o'zgartiruvchi GET.
Origin va Fetch Metadata? :: Origin yoki Sec-Fetch-Site: cross-site asosida begona saytlardan kelgan so'rovlarni rad etish — qo'shimcha qatlam.
Qayta autentifikatsiya? :: Parol, email, to'lov o'zgarishida joriy parolni so'rash — CSRF, XSS va o'g'irlangan sessiyaga qarshi.
XSS va CSRF bog'liqligi? :: XSS bo'lsa, hujumchi kodi tokenni o'qiydi — CSRF himoyasi yo'qqa chiqadi.
Login CSRF? :: Qurbonni hujumchi hisobiga kiritish; himoya — login formasida ham token.
Kod ko'rib chiqishda nimaga qaraladi? :: Holatni o'zgartiruvchi marshrutlarda himoya, exempt istisnolari, GET'da holat o'zgarishi, SameSite, ixtiyoriy tekshiruv.
:::
