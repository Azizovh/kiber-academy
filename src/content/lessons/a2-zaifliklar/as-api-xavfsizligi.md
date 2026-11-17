Qaydnoma'ning mobil ilovasi chiqdi. U server bilan JSON API orqali gaplashadi: `GET /api/notes`, `POST /api/notes`, `PATCH /api/users/me`. Web sahifalarda biz shablonlar, formalar va CSRF tokenlari bilan ishlagan edik. API'da hammasi boshqacha: HTML yo'q, foydalanuvchi interfeysi — mobil ilova, va har bir so'rov to'g'ridan-to'g'ri ma'lumot bilan ishlaydi.

Mobil ilovani ochib (a4 bosqichidagi mobil xavfsizlik darsi) yoki trafikni kuzatib, har kim API'ning barcha endpointlarini ko'radi. Va API — UI'ning cheklovlari yo'q joy: mobil ilova "role" maydonini yubormaydi, lekin foydalanuvchi uni o'zi qo'shib yuborishi mumkin.

API'lar bugun ko'p ilovalarning asosiy hujum yuzasi. OWASP buning uchun alohida ro'yxat yuritadi — **OWASP API Security Top 10**. Bu darsda eng muhimlarini Qaydnoma misolida ko'rasiz va API uchun **xavfsizlik talablarini** yozishni o'rganasiz.

## OWASP API Security Top 10 (2023)

| # | Nomi | Qisqacha | Qaysi darsda |
|---|---|---|---|
| API1 | **Broken Object Level Authorization (BOLA)** | Obyekt ID'si bo'yicha ruxsat tekshirilmaydi | Kirish nazorati + quyida |
| API2 | **Broken Authentication** | Zaif token, kirish va sessiya | a1 — autentifikatsiya |
| API3 | **Broken Object Property Level Authorization** | Ortiqcha ma'lumot qaytarish + **mass assignment** | Quyida |
| API4 | **Unrestricted Resource Consumption** | Limitsiz so'rovlar, hajm, sahifalash | Quyida |
| API5 | **Broken Function Level Authorization** | Administrator endpointlari himoyasiz | Kirish nazorati |
| API6 | **Unrestricted Access to Sensitive Business Flows** | Biznes oqimlarini avtomatlashtirib suiiste'mol qilish | Biznes mantiq |
| API7 | **Server Side Request Forgery** | — | SSRF darsi |
| API8 | **Security Misconfiguration** | — | Konfiguratsiya darsi |
| API9 | **Improper Inventory Management** | Eski, unutilgan API versiyalari va endpointlar | Quyida |
| API10 | **Unsafe Consumption of APIs** | Uchinchi tomon API javoblariga ko'r-ko'rona ishonish | Quyida |

Ko'rib turganingizdek, ro'yxatning yarmi — shu bosqichda allaqachon o'rganganlaringiz, API kontekstida. Endi yangi va API'ga xos qismlar.

## API1: BOLA — API'dagi IDOR

[[bola|BOLA]] — kirish nazorati darsidagi IDOR'ning API'dagi nomi. API'larda u ayniqsa keng tarqalgan, chunki ID'lar hamma joyda: URL'da (`/api/notes/42`), so'rov tanasida (`{"note_id": 42}`), so'rov parametrida (`?user_id=7`), hatto sarlavhalarda.

Himoya xuddi o'sha: markazlashgan `load_note(id, Action)` — web va API endpointlari **bir xil** ruxsat funksiyasidan o'tadi:

```python
@app.route("/api/notes/<int:note_id>", methods=["GET"])
@api_auth_required
def api_note_get(note_id):
    note = load_note(note_id, Action.READ)        # web bilan bir xil qaror funksiyasi
    return jsonify(NoteOut.from_row(note))
```

Keng tarqalgan xato: web versiya to'g'ri himoyalangan, API esa keyinroq "tezda" yozilgan va tekshiruvni unutgan. Shuning uchun ruxsat qarori **bitta joyda** bo'lishi kerak — UI'ga emas, ma'lumotga bog'langan.

## API3: obyekt xususiyatlari darajasida avtorizatsiya

Bu kategoriya ikki teskari xatoni birlashtiradi.

### Ortiqcha ma'lumot qaytarish

```python
# ❌ Bazadagi butun qator JSON'ga — password_hash, role, ichki maydonlar bilan
@app.route("/api/users/<int:uid>")
def api_user(uid):
    row = db.execute("SELECT * FROM users WHERE id = ?", (uid,)).fetchone()
    return jsonify(dict(row))
```

"Mobil ilova baribir faqat ismni ko'rsatadi" — lekin JSON'da hamma narsa bor, va uni har kim o'qiydi. Himoya — **chiqish sxemasi**: faqat aniq ko'rsatilgan maydonlar qaytariladi.

```python
from pydantic import BaseModel

class UserOut(BaseModel):
    id: int
    username: str
    # password_hash, role, email — YO'Q: ular ataylab ro'yxatga kiritilmagan
```

### Mass assignment

Teskari xato: so'rovdagi **barcha** maydonlar obyektga yoziladi.

```python
# ❌ Profilni yangilash — kelgan JSON'dagi har qanday maydon bazaga
@app.route("/api/users/me", methods=["PATCH"])
@api_auth_required
def api_update_me():
    data = request.get_json()
    for field, value in data.items():
        db.execute(f"UPDATE users SET {field} = ? WHERE id = ?", (value, g.user_id))
    db.commit()
```

Mobil ilova faqat `{"username": "yangi_nom"}` yuboradi. Lekin foydalanuvchi o'zi `{"username": "x", "role": "admin"}` yuborsa — u administrator bo'ladi. (Bu kodda yana bir muammo bor: maydon nomi to'g'ridan-to'g'ri SQL'ga yopishtirilgan — injection darsidagi "parametr bo'la olmaydigan joy". Xatolar ko'pincha birga yuradi.)

[[mass-assignment|Mass assignment]] himoyasi — **kirish sxemasi**, aniq ruxsat etilgan maydonlar bilan, ortiqchalari rad etiladi:

```python
from pydantic import BaseModel, ConfigDict, Field, ValidationError

class UserUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")       # kutilmagan maydon — xato
    username: str | None = Field(default=None, min_length=3, max_length=32)

@app.route("/api/users/me", methods=["PATCH"])
@api_auth_required
def api_update_me():
    try:
        upd = UserUpdate.model_validate(request.get_json(silent=True) or {})
    except ValidationError as e:
        return jsonify(error="invalid", details=e.errors(include_url=False)), 400
    if upd.username is not None:
        db.execute("UPDATE users SET username = ? WHERE id = ?", (upd.username, g.user_id))
        db.commit()
    return jsonify(UserOut(id=g.user_id, username=upd.username or current_username()).model_dump())
```

Sxema bir vaqtda bir nechta muammoni hal qiladi: ortiqcha maydonlar (mass assignment), noto'g'ri turlar (NoSQL injection darsidagi muammo), chegaralar (uzunlik, oraliq — biznes mantiq darsidagi kutilmagan qiymatlar).

:::key
**API xavfsizligining asosi — sxemalar ikki yo'nalishda.** **Kirish sxemasi**: faqat ruxsat etilgan maydonlar, to'g'ri turlar va chegaralar — qolgani rad etiladi (`extra="forbid"`). **Chiqish sxemasi**: faqat qaytarilishi kerak bo'lgan maydonlar — bazadagi qatorni ko'r-ko'rona JSON'ga aylantirish emas. Ikkalasi ham **allowlist**. "UI bu maydonni yubormaydi" va "UI bu maydonni ko'rsatmaydi" — xavfsizlik emas: API'ni UI'siz ham chaqirish mumkin.
:::

## API4: resurslar iste'moli cheklanmagan

API'ni skript bilan soniyada minglab marta chaqirish mumkin. Cheklovlarsiz bu: server resurslari tugashi, ma'lumotlar bazasini "qirib olish", katta hisob-kitoblar (SMS, pochta, bulut xarajatlari) va brute force.

| Chegara | Qaydnoma'da |
|---|---|
| **Rate limiting** — foydalanuvchi, IP, token bo'yicha | Login: daqiqasiga 5; API umumiy: daqiqasiga 60 |
| **So'rov hajmi** | `MAX_CONTENT_LENGTH` (konfiguratsiya darsi) |
| **Sahifalash** — maksimal hajm | `?limit=` maksimal 100; standart 20 |
| **Qimmat amallar** — alohida qattiq chegara | Eksport, qidiruv, parolni tiklash xati |
| **Vaqt chegaralari** | Uzoq so'rovlar to'xtatiladi |

[[rate-limiting|Rate limiting]] Flask'da — Flask-Limiter:

```python
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

limiter = Limiter(get_remote_address, app=app, default_limits=["200 per hour"],
                  storage_uri="redis://localhost:6379")   # bir nechta server uchun umumiy ombor

@app.route("/login", methods=["POST"])
@limiter.limit("5 per minute")
def login():
    ...

@app.route("/api/notes")
@api_auth_required
def api_notes():
    limit = min(request.args.get("limit", 20, type=int), 100)     # sahifa hajmi chegarasi
    offset = max(request.args.get("offset", 0, type=int), 0)
    ...
```

Proxy ortida `get_remote_address` haqiqiy mijoz IP'sini faqat `ProxyFix` to'g'ri sozlangan bo'lsa beradi (konfiguratsiya darsi). Aks holda barcha so'rovlar bitta IP'dan keladi deb hisoblanadi — yoki hujumchi `X-Forwarded-For` bilan limitni aylanib o'tadi.

## API9: inventarizatsiya

"Biz `/api/v1/` ni allaqachon `/api/v2/` ga almashtirdik" — lekin `v1` hali ishlayapti, va unda v2'da tuzatilgan BOLA hali ham bor. Yoki test serveri (`staging-api.qaydnoma.example`) ishlab chiqarish ma'lumotlari bilan ochiq qolgan.

| Muammo | Himoya |
|---|---|
| Eski API versiyalari ishlashda davom etadi | Rasmiy eskirish jarayoni; eski versiyalarni o'chirish yoki bir xil himoya bilan qo'llab-quvvatlash |
| Hujjatlanmagan endpointlar ("ichki", "debug") | Barcha endpointlar ro'yxati — **OpenAPI** spetsifikatsiyasi; spetsifikatsiyada yo'q endpoint — topilma |
| Test/staging muhitlari ochiq | Kirishni cheklash; ishlab chiqarish ma'lumotlari test muhitida bo'lmasin |
| Kim qaysi API'ni ishlatadi — noma'lum | API gateway, loglar, monitoring (b1–b2 bosqichlari) |

**OpenAPI** (avvalgi nomi Swagger) spetsifikatsiyasi — API'ning "pasporti": barcha endpointlar, parametrlar, sxemalar, autentifikatsiya. U xavfsizlik uchun ikki marta foydali: hujjat sifatida (nima bo'lishi kerak) va avtomatik tekshiruvlar uchun asos (a3 bosqichidagi DAST uni o'qiy oladi).

## API10: uchinchi tomon API'lariga ko'r-ko'rona ishonish

Qaydnoma tashqi xizmatlardan foydalanadi: to'lov, pochta, havola oldindan ko'rish. Ularning javoblari ham **ishonchsiz ma'lumot** (a1 bosqichidagi ishonch chegarasi):

- Tashqi API'dan kelgan matnni HTML'da ko'rsatishda — kodlash (XSS darsi).
- Javobni SQL'da ishlatishda — parametrlash.
- Javob sxemasini tekshirish — kutilmagan maydonlar, turlar.
- Yo'naltirishlarga ko'r-ko'rona ergashmaslik (SSRF darsi).
- TLS tekshiruvi yoqiq (kriptografik xatolar darsi).
- Timeout va xatolarga tayyorgarlik — tashqi xizmat ishlamasa ham ilova xavfsiz holatda qolsin.

## API autentifikatsiyasi — qisqa eslatma

a1 bosqichidan:

| Usul | Qachon | Diqqat |
|---|---|---|
| **Sessiya cookie** | Bir xil domendagi web frontend | CSRF himoyasi kerak |
| **Bearer token** (masalan, JWT yoki tasodifiy token) | Mobil ilova, SPA, xizmatlar | Token saqlash, muddati, bekor qilish |
| **API kalitlari** | Xizmatlararo, tashqi integratsiyalar | Kalit — **identifikatsiya**, ruxsat emas; aylantirish, minimal huquq |
| **OAuth 2.0** | Uchinchi tomon ilovalariga ruxsat | Authorization Code + PKCE |

API kaliti bilan keng tarqalgan xato: kalit bor — demak hamma narsaga ruxsat. Kalit faqat "kim chaqiryapti"ni aytadi; "nimaga ruxsat bor" — baribir avtorizatsiya qatlami hal qiladi.

## API uchun xavfsizlik talablari

Curriculum'dagi maqsad: "API uchun xavfsizlik talablarini yoza olaman." Talab — **tekshirsa bo'ladigan** jumla (a3 bosqichidagi ASVS darsida batafsil). Qaydnoma API uchun namuna:

```
AUTENTIFIKATSIYA
 A1. /api/health dan tashqari barcha endpointlar haqiqiy Bearer token talab qiladi; tokensiz — 401.
 A2. Tokenlar 15 daqiqa amal qiladi; refresh token bekor qilinishi mumkin.

AVTORIZATSIYA
 B1. Obyekt ID'si qabul qiladigan har bir endpoint load_*(id, action) orqali ruxsatni tekshiradi;
     ruxsat bo'lmasa — 404. (Ruxsatlar matritsasi testlari bilan tasdiqlanadi.)
 B2. /api/admin/* faqat role = admin uchun; rol har so'rovda bazadan o'qiladi.

KIRISH VA CHIQISH
 C1. Barcha so'rov tanalari Pydantic sxemalari bilan tekshiriladi; noma'lum maydonlar — 400.
 C2. Javoblar faqat chiqish sxemalaridagi maydonlarni o'z ichiga oladi; password_hash, role hech qachon qaytarilmaydi
     (role — faqat /api/admin/* da).

RESURSLAR
 D1. Login: IP bo'yicha daqiqasiga 5 urinish. API: token bo'yicha soatiga 1000 so'rov.
 D2. Sahifalash: standart 20, maksimal 100. So'rov tanasi maksimal 2 MB.

INVENTARIZATSIYA VA KUZATUV
 E1. Barcha endpointlar OpenAPI spetsifikatsiyasida; spetsifikatsiyada yo'q endpoint — CI'da xato.
 E2. Autentifikatsiya xatolari, 403/404 ko'pligi va rate limit hodisalari markaziy logga yoziladi.
```

Har bir talab — keyinchalik **test** yoki **avtomatik tekshiruv**ga aylanadi. "API xavfsiz bo'lishi kerak" — talab emas; "tokensiz so'rov 401 qaytaradi" — talab.

## Bu dars nimani bermaydi

- **GraphQL va gRPC xususiyatlarini** — ularning o'z tuzoqlari bor (masalan, GraphQL'da chuqur ichma-ich so'rovlar va introspection); tamoyillar bir xil.
- **API gateway va WAF sozlamalarini batafsil** — ular qo'shimcha qatlam.
- **Hujum vositalari bo'yicha qo'llanmani** — amaliyot uchun PortSwigger Academy'ning API testing bo'limi.

:::try
**1. API qo'shing.** Qaydnoma'ga `GET /api/notes`, `GET /api/notes/<id>`, `POST /api/notes`, `PATCH /api/users/me` endpointlarini qo'shing. Autentifikatsiya uchun oddiy Bearer token (masalan, `secrets.token_urlsafe` bilan yaratilib, bazada **xeshi** saqlanadigan) ishlating.

**2. Sxemalar.** Pydantic bilan kirish (`extra="forbid"`) va chiqish sxemalarini yozing. `{"username": "x", "role": "admin"}` yuborib, 400 qaytishini tekshiring. `GET` javoblarida `password_hash` yo'qligini tekshiring.

**3. BOLA.** API endpointlarini web'dagi `load_note()` orqali o'tkazing va kirish nazorati darsidagi matritsa testlariga API qatorlarini qo'shing.

**4. Rate limiting.** Flask-Limiter bilan login va API uchun chegaralarni qo'shing (lokal sinov uchun `storage_uri="memory://"`). Chegaradan oshganda qanday javob qaytadi?

**5. Talablar.** Yuqoridagi namuna asosida o'z Qaydnoma API'ingiz uchun kamida 10 ta tekshirsa bo'ladigan xavfsizlik talabini yozing va README'ga qo'shing.

**6. PortSwigger Academy.** API testing bo'limidagi nazariy qism va dastlabki laboratoriyalar (mass assignment ham shu yerda).

*Javob (4): Flask-Limiter standart holatda `429 Too Many Requests` qaytaradi.*
:::

## Xulosa

- API — UI cheklovlari yo'q hujum yuzasi; **OWASP API Security Top 10**.
- **BOLA** — API'dagi IDOR; web va API **bir xil** markazlashgan ruxsat funksiyasidan o'tadi.
- **API3**: ortiqcha ma'lumot qaytarish → **chiqish sxemasi**; **mass assignment** → **kirish sxemasi** (`extra="forbid"`).
- **API4**: rate limiting (ProxyFix bilan to'g'ri IP), hajm va sahifalash chegaralari, qimmat amallar uchun qattiq limitlar.
- **API9**: eski versiyalar va hujjatlanmagan endpointlar — **OpenAPI** inventarizatsiyasi.
- **API10**: tashqi API javoblari ham ishonchsiz.
- API kaliti — identifikatsiya, ruxsat emas.
- **Xavfsizlik talablari** — tekshirsa bo'ladigan jumlalar, testlarga aylanadi.

:::quiz
? BOLA nima?
+ API'da obyekt identifikatori bo'yicha ruxsat tekshirilmasligi — IDOR'ning API'dagi nomi
- Parolni noto'g'ri saqlash
- CORS xatosi
- Server sekinligi
! OWASP API Top 10'ning birinchi o'rni.

? Web versiya to'g'ri himoyalangan, lekin API endpointida ruxsat tekshiruvi yo'q. Bunga qarshi eng yaxshi dizayn qaysi?
+ Ruxsat qarorini web va API bir xil chaqiradigan markazlashgan funksiyada saqlash
- API'ni yashirin qilish
- Faqat mobil ilovada tekshirish
- API'ga boshqa URL berish
! Ruxsat UI'ga emas, ma'lumotga bog'langan bo'lishi kerak.

? Mass assignment zaifligi qanday paydo bo'ladi?
+ So'rovdagi barcha maydonlar (masalan, role) tekshirilmasdan obyektga yoziladi
- Juda ko'p foydalanuvchi bir vaqtda kiradi
- API juda katta javob qaytaradi
- Parol juda qisqa
! Himoya — faqat ruxsat etilgan maydonli kirish sxemasi.

? Pydantic modelida extra="forbid" nima qiladi?
+ Sxemada yo'q (kutilmagan) maydonlar kelsa, validatsiya xato beradi
- Barcha maydonlarni ixtiyoriy qiladi
- Maydonlarni shifrlaydi
- Javobni tezlashtiradi
! Mass assignment'ga qarshi allowlist.

? GET /api/users/7 javobida password_hash va role ham qaytmoqda, mobil ilova esa faqat ismni ko'rsatadi. Muammo nima?
+ Ortiqcha ma'lumot qaytarilmoqda — JSON'ni har kim o'qiydi; chiqish sxemasi bilan faqat kerakli maydonlarni qaytarish kerak
- Muammo yo'q, chunki UI ko'rsatmaydi
- Faqat dizayn muammosi
- Bu tezlikni oshiradi
! “UI ko'rsatmaydi” — xavfsizlik emas.

? Qaysilar API4 (cheklanmagan resurslar iste'moli) ga qarshi choralar?
+ Rate limiting va so'rov hajmi chegarasi
+ Sahifalashda maksimal hajm (masalan, limit ≤ 100)
- Barcha endpointlarni ochiq qoldirish
- Javoblarni keshlamaslik
! Qimmat amallar (SMS, eksport) uchun alohida qattiq chegaralar ham kerak.

? Proxy ortidagi ilovada rate limiting nega noto'g'ri ishlashi mumkin?
+ ProxyFix to'g'ri sozlanmasa, barcha so'rovlar bitta IP'dan kelgandek ko'rinadi yoki hujumchi X-Forwarded-For bilan limitni aylanib o'tadi
- Rate limiting proxy bilan umuman ishlamaydi
- Proxy so'rovlarni shifrlaydi
- Bu faqat Windows muammosi
! Haqiqiy mijoz IP'si faqat ishonchli proxy sarlavhasidan olinadi.

? /api/v1 o'rniga /api/v2 chiqarildi, lekin v1 hali ishlayapti va unda tuzatilmagan zaiflik bor. Bu qaysi kategoriya?
+ API9 — Improper Inventory Management
- API7 — SSRF
- API2 — Broken Authentication
- API4 — Resource Consumption
! Eski versiyalar rasmiy eskirish jarayoni bilan o'chiriladi yoki bir xil himoyalanadi.

? API kaliti haqida qaysi gap to'g'ri?
+ U kim chaqirayotganini aniqlaydi, lekin nimaga ruxsat borligini avtorizatsiya qatlami hal qiladi
- API kaliti bor — demak hamma narsaga ruxsat
- API kaliti hech qachon aylantirilmaydi
- API kaliti URL'da yuborilishi kerak
! Kalitlar minimal huquqli bo'lishi va aylantirilishi kerak.

? Qaysi jumla yaxshi, tekshirsa bo'ladigan xavfsizlik talabi?
+ “Tokensiz so'rov 401 qaytaradi; /api/health bundan mustasno”
- “API xavfsiz bo'lishi kerak”
- “Hujumchilar kira olmasligi kerak”
- “Eng yaxshi amaliyotlarga amal qilinsin”
! Har bir talab testga aylana olishi kerak.
:::

:::cards
OWASP API Security Top 10 (2023) birinchi uchtasi? :: API1 BOLA, API2 Broken Authentication, API3 Broken Object Property Level Authorization.
BOLA himoyasi? :: Web va API bir xil markazlashgan ruxsat funksiyasidan (load_obj(id, action)) o'tadi; ruxsat bo'lmasa 404.
API3 ikki xatosi? :: Ortiqcha ma'lumot qaytarish va mass assignment.
Chiqish sxemasi? :: Faqat qaytarilishi kerak bo'lgan maydonlar — bazadagi qatorni ko'r-ko'rona JSON'ga aylantirmaslik.
Mass assignment himoyasi? :: Kirish sxemasi: aniq ruxsat etilgan maydonlar, extra="forbid", turlar va chegaralar.
API4 choralari? :: Rate limiting, so'rov hajmi, sahifalash maksimumi, qimmat amallarga qattiq limit, vaqt chegaralari.
Flask'da rate limiting? :: Flask-Limiter: @limiter.limit("5 per minute"); bir nechta server uchun umumiy ombor (Redis); chegaradan oshsa — 429.
API9 Inventory? :: Eski versiyalar, hujjatlanmagan endpointlar, ochiq staging — OpenAPI ro'yxati va eskirish jarayoni.
OpenAPI? :: API spetsifikatsiyasi: endpointlar, parametrlar, sxemalar, autentifikatsiya — hujjat va avtomatik tekshiruv asosi.
API10? :: Uchinchi tomon API javoblari ham ishonchsiz: kodlash, parametrlash, sxema, TLS, yo'naltirishlar, timeout.
API kaliti? :: Identifikatsiya, ruxsat emas; minimal huquq, aylantirish.
Yaxshi xavfsizlik talabi? :: Tekshirsa bo'ladigan aniq jumla — keyin test yoki avtomatik tekshiruvga aylanadi.
:::
