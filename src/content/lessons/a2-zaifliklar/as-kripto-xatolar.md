Kod ko'rib chiqishda uchta qator e'tiboringizni tortadi:

```python
API_KEY = "live_key_51H...8f2"                        # 1
token = str(random.randint(100000, 999999))            # 2
requests.get(url, verify=False)                        # 3
```

Uchalasi ham ishlaydi. Testlar o'tadi. Lekin birinchisi — GitHub'ga joylangan kunidan boshlab hammaga ochiq kalit. Ikkinchisi — taxmin qilsa bo'ladigan parolni tiklash kodi. Uchinchisi — HTTPS'ning butun ma'nosini yo'qqa chiqaradi.

Kriptografik xatolar (OWASP Top 10'da doim yuqori o'rinlarda: 2021-yilda ikkinchi, 2025-yilda to'rtinchi) kamdan-kam hollarda "algoritmni buzish" haqida. Deyarli har doim — **to'g'ri vositadan noto'g'ri foydalanish**: noto'g'ri funksiya, kodga yozilgan kalit, o'chirilgan tekshiruv. Xavfsizlik bosqichidagi kriptografiya darslarida nazariyani o'rgangansiz; bu darsda — kodda bu xatolarni **tanish** va **tuzatish**.

## Asosiy qoida: o'zingiz kriptografiya yozmang

| Qiling | Qilmang |
|---|---|
| Sinalgan yuqori darajadagi kutubxonalar (`cryptography` ning Fernet'i, libsodium/PyNaCl) | O'z shifrlash algoritmingizni yoki "aralashtirish" usulingizni o'ylab topish |
| Kutubxonaning xavfsiz standart sozlamalari | Past darajadagi primitivlarni (AES rejimlari, padding) qo'lda yig'ish |
| Maqsadga mos vosita: parol — Argon2, yaxlitlik — HMAC, shifrlash — AEAD | Bitta vositani hamma narsa uchun (masalan, SHA-256 bilan "shifrlash") |

"Base64 bilan shifrladim" — kodlash bosqichidagi asosiy saboq: **kodlash — shifrlash emas.** Hamma qaytara oladi.

## Kodda uchraydigan kriptografik xatolar

### 1. Noto'g'ri vosita

| Maqsad | Noto'g'ri | To'g'ri |
|---|---|---|
| Parol saqlash | MD5, SHA-1, SHA-256, shifrlash | **Argon2id** / bcrypt / scrypt (a1 bosqichi) |
| Ma'lumot yaxlitligi va manbasi | Oddiy xesh (`sha256(data)`) — har kim qayta hisoblaydi | **HMAC** (maxfiy kalit bilan) yoki raqamli imzo |
| Ma'lumotni shifrlash | DES, RC4, AES-**ECB**, o'zingiz yozgan | **AES-GCM** yoki ChaCha20-Poly1305 (AEAD) — yaxshisi Fernet kabi tayyor qatlam orqali |
| Tasodifiy token | `random`, vaqt, ketma-ket raqam | **`secrets`** moduli |
| Fayl yaxlitligini tekshirish (xavfsizlik uchun) | MD5, SHA-1 (to'qnashuvlar ma'lum) | SHA-256 va undan yuqori |

**ECB rejimi** alohida misol: u bir xil ochiq matn bloklarini bir xil shifrlangan bloklarga aylantiradi — ma'lumotdagi naqshlar shifrlangandan keyin ham ko'rinadi. "AES ishlatyapman" — yaxshi; "AES-ECB" — yomon. Rejim algoritmdek muhim.

### 2. Tasodifiylik

```python
import random, secrets

# ❌ random — Mersenne Twister: tez, lekin kuzatilgan qiymatlardan keyingilarini taxmin qilsa bo'ladi
reset_code = str(random.randint(100000, 999999))

# ✅ secrets — operatsion tizimning kriptografik generatori
reset_token = secrets.token_urlsafe(32)        # parolni tiklash havolasi uchun
otp = f"{secrets.randbelow(10**6):06d}"        # 6 xonali kod (rate limiting bilan birga!)
```

Qayerda kriptografik tasodifiylik shart: sessiya ID'lari, CSRF tokenlari, parolni tiklash tokenlari, API kalitlari, OTP kodlari, shifrlash kalitlari, nonce'lar (a1 bosqichidagi CSP nonce'i ham). 6 xonali kod `secrets` bilan ham faqat **million** variant — shuning uchun urinishlar sonini cheklash (a1 bosqichidagi rate limiting) shart.

### 3. Kodga yozilgan kalitlar va sirlar

```python
# ❌
SECRET_KEY = "dev-secret-123"
DB_PASSWORD = "P@ssw0rd!"
AWS_ACCESS_KEY = "AKIA..."
```

Git tarixidagi sir — hech qachon o'chmaydi (b4 bosqichidagi bulut loglari darsidagi sizib chiqqan kalit hikoyasini eslang: kalit GitHub'ga tushganidan bir necha daqiqa o'tib ishlatilgan). Bu mavzu a3 bosqichidagi "Sirlarni boshqarish" darsida batafsil; qisqacha:

| Daraja | Qayerda saqlanadi |
|---|---|
| Lokal ishlab chiqish | `.env` fayli (`.gitignore` da!), muhit o'zgaruvchilari |
| Server / konteyner | Muhit o'zgaruvchilari, platforma sirlari (CI/CD secrets, Kubernetes secrets) |
| Jiddiy tizimlar | **Sirlar ombori** (HashiCorp Vault, bulut KMS va Secrets Manager) — kirish nazorati, audit, aylantirish (rotation) bilan |

Agar sir kodga tushib qolgan bo'lsa — uni Git'dan o'chirish **yetarli emas**: sirni **bekor qilib, almashtirish** kerak. b4 bosqichidagi qoida.

### 4. TLS tekshiruvini o'chirish

```python
# ❌ "Sertifikat xatosi chiqyapti — o'chirib qo'yaman"
requests.get("https://api.tolov.example/charge", verify=False)

# ✅ Tekshiruv yoqiq (standart). Ichki CA bo'lsa — uning sertifikatini ko'rsating
requests.get("https://internal-api.example/", verify="/etc/ssl/certs/company-ca.pem")
```

`verify=False` — xavfsizlik bosqichidagi TLS va PKI darsidagi butun sertifikat tizimini o'chirish: ulanish shifrlangan, lekin **kim bilan** — noma'lum. O'rtadagi hujumchi (MITM, s2 bosqichi) o'zini server deb ko'rsatishi mumkin. Boshqa tillarda ham xuddi shunday sozlamalar bor (`rejectUnauthorized: false`, `InsecureSkipVerify: true`, `CURLOPT_SSL_VERIFYPEER = 0`) — kod ko'rib chiqishda ularni qidiring.

### 5. Doimiy bo'lmagan vaqtda solishtirish

```python
import hmac

# ❌ == birinchi farq qilgan belgida to'xtaydi — javob vaqti qancha belgi to'g'ri ekanini sizdirishi mumkin
if provided_signature == expected_signature: ...

# ✅ Doimiy vaqtda solishtirish
if hmac.compare_digest(provided_signature, expected_signature): ...
```

Tokenlar, imzolar, API kalitlarini solishtirishda — `hmac.compare_digest` (yoki kutubxonaning o'z tekshiruv funksiyasi).

### 6. Nonce yoki IV'ni qayta ishlatish

AES-GCM kabi rejimlarda har bir shifrlash uchun **noyob nonce** kerak. Bir xil kalit bilan bir xil nonce'ni qayta ishlatish — shifrlashning xavfsizligini butunlay buzadi. Bu — past darajadagi API'larni qo'lda ishlatishning klassik xavfi, va nega yuqori darajadagi kutubxonalar (Fernet) afzal: ular nonce'ni o'zi to'g'ri boshqaradi.

### 7. JWT va imzolar

a1 bosqichidagi JWT xatolari ro'yxati ham kriptografik xatolar: tokendagi `alg` ga ishonish, zaif HMAC kaliti, imzoni tekshirmasdan decode qilish.

## To'g'ri namunalar

### Webhook imzosini tekshirish (HMAC)

Qaydnoma tashqi to'lov xizmatidan webhook qabul qiladi ("obuna to'landi"). Har kim bu URL'ga so'rov yuborishi mumkin — so'rov haqiqatan xizmatdan kelganini qanday bilasiz? Xizmat umumiy maxfiy kalit bilan HMAC imzo qo'shadi:

```python
import hashlib
import hmac
import os

WEBHOOK_SECRET = os.environ["TOLOV_WEBHOOK_SECRET"].encode()

@app.route("/webhooks/tolov", methods=["POST"])
@csrf.exempt                       # CSRF tokeni o'rniga — imzo tekshiruvi (CSRF darsi)
def tolov_webhook():
    body = request.get_data()      # imzo XOM tanadan hisoblanadi
    expected = hmac.new(WEBHOOK_SECRET, body, hashlib.sha256).hexdigest()
    received = request.headers.get("X-Signature", "")
    if not hmac.compare_digest(expected, received):
        abort(401)
    ...
```

Bu yerda uchta to'g'ri qaror: **HMAC** (oddiy xesh emas — kalitsiz hech kim yasay olmaydi), **xom tana** (JSON qayta formatlangan bo'lsa, imzo mos kelmaydi), **`compare_digest`**. Ko'p xizmatlar qayta yuborish hujumlariga qarshi **vaqt belgisi**ni ham imzolaydi — uni ham tekshiring.

### Maydonni shifrlash (Fernet)

Qaydnoma'da "maxfiy qaydlar" — bazada shifrlangan holda saqlanadigan qaydlar:

```python
from cryptography.fernet import Fernet

fernet = Fernet(os.environ["QAYDNOMA_DATA_KEY"])     # kalit — sirlar omboridan

ciphertext = fernet.encrypt(body.encode())           # AES + HMAC, nonce avtomatik
plaintext = fernet.decrypt(ciphertext).decode()      # o'zgartirilgan bo'lsa — istisno
```

Kalitni yaratish: `Fernet.generate_key()` — va uni kodga emas, sirlar omboriga.

Shifrlashning **chegaralarini** bilish muhim:
- Agar kalit ilova bilan bir serverda (muhit o'zgaruvchisida) bo'lsa, serverni to'liq egallagan hujumchi kalitni ham oladi. Shifrlash bazaning zaxira nusxasi yoki dump'i sizib chiqqanda himoya qiladi — serverni egallashdan emas.
- Shifrlangan maydon bo'yicha oddiy qidiruv ishlamaydi.
- Kalitni yo'qotish = ma'lumotni yo'qotish. Kalitlarni boshqarish (zaxira, aylantirish) — shifrlashning eng qiyin qismi.

## Qaysi ma'lumotni himoyalash kerak

Kriptografik xatolarning yana bir turi — **himoya umuman yo'qligi**:

| Savol | Tekshirish |
|---|---|
| Ma'lumot tarmoq orqali ochiq ketyaptimi? | Hamma joyda TLS, HSTS (a1 bosqichi), ichki xizmatlar orasida ham |
| Maxfiy ma'lumot bazada ochiq yotibdimi? | Parollar — xesh; juda maxfiy maydonlar — shifrlash; to'liq disk shifrlash |
| Maxfiy ma'lumot loglarga tushyaptimi? | Parollar, tokenlar, karta ma'lumotlari loglarda bo'lmasligi kerak |
| Zaxira nusxalar himoyalanganmi? | Shifrlangan, kirish cheklangan |
| Keraksiz ma'lumot saqlanyaptimi? | Saqlanmagan ma'lumot sizib chiqmaydi — eng yaxshi himoya |

Oxirgi qator eng muhimi: **eng xavfsiz ma'lumot — umuman saqlanmagan ma'lumot.** Karta raqamini saqlash shart emasmi — saqlamang (to'lov xizmati tokeni yetarli).

:::key
**Kriptografik xatolarning 90 foizi — "ishlatish" xatolari, "algoritm" xatolari emas.** Kodda qidiriladigan narsalar ro'yxati qisqa: `md5`/`sha1` (parol yoki xavfsizlik uchun), `random` (tokenlar uchun), kodga yozilgan kalitlar, `verify=False` va o'xshashlari, `==` bilan imzo solishtirish, `ECB`, past darajadagi shifrlash primitivlarini qo'lda ishlatish. Har birining to'g'ri muqobili bitta qator: Argon2, `secrets`, sirlar ombori, tekshiruv yoqiq, `compare_digest`, Fernet. Dasturchiga tushuntirishda — aynan shu juftliklarni ko'rsating.
:::

## Kodda topish

```bash
grep -rnE "hashlib\.(md5|sha1)\(|md5\(|sha1\(" .
grep -rnE "random\.(rand|choice|random)" .
grep -rnE "verify\s*=\s*False|rejectUnauthorized:\s*false|InsecureSkipVerify" .
grep -rnE "(SECRET|PASSWORD|API_KEY|TOKEN)\s*=\s*['\"]" .
grep -rn "MODE_ECB" .
```

Har bir natijani kontekstda tekshiring: `md5` fayl keshining kaliti uchun ishlatilsa (xavfsizlik bilan bog'liq emas) — muammo emas; parol uchun — muammo. a3 bosqichida bular Semgrep qoidalariga va sir skanerlariga aylanadi.

## Bu dars nimani bermaydi

- **Kriptografiya nazariyasini** — xavfsizlik bosqichidagi kriptografiya, xesh, TLS va PKI darslari.
- **Kalitlarni boshqarish tizimlarini batafsil** — a3 bosqichidagi sirlarni boshqarish va Cloud tarmog'i.
- **Kriptotahlilni** — bu alohida soha (CryptoHack kabi platformalar — qiziquvchilar uchun).

:::try
**1. Kodni baholang.** Quyidagilarning har biri uchun: xatomi? To'g'ri muqobili?
- (a) `password_hash = hashlib.sha256(password.encode()).hexdigest()`
- (b) `session_id = secrets.token_hex(32)`
- (c) `if request.headers["X-Api-Key"] == API_KEY:`
- (d) `cache_key = hashlib.md5(url.encode()).hexdigest()` (faqat kesh fayl nomi uchun)
- (e) `requests.post(url, json=data, verify=False)`

**2. Webhook.** Qaydnoma'ga HMAC bilan imzolangan webhook endpointini qo'shing. Python'da to'g'ri imzo bilan va noto'g'ri imzo bilan so'rov yuboruvchi kichik skript yozib, ikkala holatni sinang.

**3. Maxfiy qaydlar.** Fernet bilan "maxfiy" belgili qaydlarni bazada shifrlangan holda saqlang. Bazani `sqlite3` bilan oching — matn o'qiladimi? Kalitni o'zgartirsangiz nima bo'ladi?

**4. grep.** Yuqoridagi `grep` buyruqlarini o'z loyihangizda va bitta ochiq loyihada ishga tushiring; har bir topilmani "haqiqiy muammo / kontekstda normal" deb baholang.

*Javoblar: 1 — (a) xato: tez xesh, salt yo'q → Argon2id; (b) to'g'ri; (c) doimiy vaqtda emas → `hmac.compare_digest`; (d) xavfsizlik uchun emas, kesh kaliti — odatda muammo emas (lekin yangi kodda SHA-256 ishlatish odat sifatida yaxshi); (e) xato: TLS tekshiruvi o'chirilgan → `verify` ni olib tashlang yoki ichki CA yo'lini bering.*
:::

## Xulosa

- Kriptografik xatolar — deyarli har doim **noto'g'ri foydalanish**: noto'g'ri vosita, kodga yozilgan kalit, o'chirilgan tekshiruv.
- **O'zingiz kriptografiya yozmang** — yuqori darajadagi sinalgan kutubxonalar (Fernet, libsodium).
- Maqsadga mos vosita: parol — **Argon2id**; yaxlitlik — **HMAC**/imzo; shifrlash — **AEAD** (AES-GCM, ChaCha20-Poly1305); tasodifiylik — **`secrets`**. ECB, DES, RC4, MD5, SHA-1 — xavfsizlik uchun emas.
- Kalitlar kodda emas — **sirlar omborida**; sizib chiqsa — **bekor qilish va almashtirish**.
- **`verify=False`** — TLS'ni yo'qqa chiqaradi.
- Imzo va tokenlarni **`hmac.compare_digest`** bilan solishtiring; nonce'ni qayta ishlatmang.
- Webhook'lar — **HMAC imzo** (xom tana, doimiy vaqt, vaqt belgisi).
- Shifrlashning chegaralari: kalit qayerda — himoya shunchalik; **eng xavfsiz ma'lumot — saqlanmagani**.

:::quiz
? Kriptografik xatolarning eng keng tarqalgan sababi nima?
+ To'g'ri vositalardan noto'g'ri foydalanish: noto'g'ri funksiya, kodga yozilgan kalit, o'chirilgan tekshiruv
- Zamonaviy algoritmlarning buzilishi
- Kompyuterlar juda sekin
- Faqat eski tillar
! AES yoki SHA-256 kabi algoritmlar emas, ularning noto'g'ri ishlatilishi muammo.

? Parolni tiklash tokeni uchun Python'da qaysi usul to'g'ri?
- random.randint(100000, 999999)
- str(time.time())
+ secrets.token_urlsafe(32)
- ketma-ket raqam
! random va vaqtga asoslangan qiymatlarni taxmin qilish mumkin.

? Nega AES-ECB rejimi xavfli?
+ Bir xil ochiq matn bloklari bir xil shifrlangan bloklarga aylanadi — ma'lumotdagi naqshlar ko'rinib qoladi
- U juda sekin
- U kalitni talab qilmaydi
- U faqat rasmlar uchun
! Rejim algoritmning o'zidek muhim — AEAD rejimlari (GCM) tavsiya etiladi.

? requests.get(url, verify=False) qanday xavf tug'diradi?
+ TLS sertifikati tekshirilmaydi — o'rtadagi hujumchi o'zini server deb ko'rsatishi mumkin
- So'rov tezroq ketadi, xavf yo'q
- Faqat loglar yozilmaydi
- Ulanish umuman shifrlanmaydi
! Ulanish shifrlangan, lekin kim bilan — noma'lum.

? API kaliti GitHub'ga commit qilinib qoldi. To'g'ri harakat qaysi?
- Faylni o'chirib, yangi commit qilish yetarli
+ Kalitni darhol bekor qilish va almashtirish; keyin kodni tozalash va sirlar omboriga o'tish
- Omborni yashirin qilish yetarli
- Hech narsa — hech kim sezmaydi
! Git tarixidagi sir saqlanib qoladi va botlar uni tez topadi.

? Imzoni solishtirishda nega == o'rniga hmac.compare_digest ishlatiladi?
+ == birinchi farqda to'xtaydi va javob vaqti nechta belgi to'g'riligini sizdirishi mumkin; compare_digest doimiy vaqtda ishlaydi
- == Python'da ishlamaydi
- compare_digest imzoni shifrlaydi
- Farqi yo'q
! Tokenlar, imzolar va API kalitlari doimiy vaqtda solishtiriladi.

? Webhook so'rovi haqiqatan to'lov xizmatidan kelganini tekshirishning to'g'ri usuli qaysi?
+ Umumiy maxfiy kalit bilan xom tanadan hisoblangan HMAC imzoni doimiy vaqtda solishtirish
- So'rovning User-Agent sarlavhasini tekshirish
- Tananing SHA-256 xeshini (kalitsiz) solishtirish
- CSRF tokenini tekshirish
! Kalitsiz xeshni har kim qayta hisoblay oladi.

? Ma'lumotni shifrlash uchun eng to'g'ri yondashuv qaysi?
- O'zingiz yozgan XOR algoritmi
- Base64
+ Fernet kabi yuqori darajadagi kutubxona (AES + HMAC, nonce avtomatik)
- MD5
! Past darajadagi primitivlarni qo'lda yig'ish nonce va rejim xatolariga olib keladi.

? Kalit ilova bilan bir serverdagi muhit o'zgaruvchisida bo'lsa, maydonni shifrlash nimadan himoya qiladi?
+ Bazaning zaxira nusxasi yoki dump'i sizib chiqishidan — lekin serverni to'liq egallagan hujumchidan emas
- Barcha hujumlardan
- Hech narsadan
- Faqat XSS'dan
! Shifrlashning kuchi kalitning qayerda va qanday himoyalanganiga bog'liq.

? Qaysi qoida ma'lumotlarni himoyalashning eng samarali usuli?
+ Keraksiz maxfiy ma'lumotni umuman saqlamaslik
- Hamma narsani MD5 bilan saqlash
- Hamma narsani loglarga yozish
- Barcha ma'lumotni frontend'da saqlash
! Saqlanmagan ma'lumot sizib chiqmaydi.
:::

:::cards
Kriptografiyadagi asosiy qoida? :: O'zingiz yozmang — sinalgan yuqori darajadagi kutubxonalar va ularning xavfsiz standart sozlamalari.
Maqsad va vosita juftliklari? :: Parol — Argon2id; yaxlitlik — HMAC/imzo; shifrlash — AEAD (AES-GCM, ChaCha20-Poly1305); tasodifiylik — secrets.
Xavfsizlik uchun yaroqsiz? :: MD5, SHA-1 (parol va imzo uchun), DES, RC4, AES-ECB, random moduli, Base64 “shifrlash”.
random va secrets? :: random — taxmin qilsa bo'ladi; secrets — kriptografik generator: sessiya, CSRF, tiklash tokenlari, API kalitlari.
Kodga yozilgan sir? :: Git tarixida qoladi; sizib chiqsa — bekor qilish va almashtirish; saqlash — muhit yoki sirlar ombori.
verify=False? :: TLS sertifikat tekshiruvini o'chiradi — MITM mumkin; ichki CA bo'lsa uning sertifikatini ko'rsatish.
Doimiy vaqtda solishtirish? :: hmac.compare_digest — tokenlar, imzolar, API kalitlari uchun.
Nonce qayta ishlatilishi? :: Bir kalit bilan bir nonce — AES-GCM xavfsizligini buzadi; yuqori darajadagi kutubxonalar buni o'zi boshqaradi.
Webhook himoyasi? :: HMAC imzo xom tanadan, compare_digest, vaqt belgisi tekshiruvi, CSRF o'rniga imzo.
Fernet? :: cryptography kutubxonasidagi yuqori darajadagi shifrlash: AES + HMAC, nonce avtomatik, o'zgartirilsa — istisno.
Shifrlash chegaralari? :: Kalit qayerda bo'lsa — himoya shunchalik; qidiruv qiyinlashadi; kalitni yo'qotish — ma'lumotni yo'qotish.
Kodda qidiriladiganlar? :: md5/sha1, random, kodga yozilgan kalitlar, verify=False, == bilan imzo, MODE_ECB.
:::
