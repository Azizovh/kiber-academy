Bu bosqichda to'qqizta zaiflik sinfini ko'rdingiz. Har birida — zaif kod, tuzatilgan kod va tushuntirish. Lekin haqiqiy ishda zaifliklar alohida darslarda kelmaydi. Ular bitta ilovada, aralash, ko'pincha bir-biriga zanjir bo'lib keladi. Va tuzatish faqat yarim ish: ikki oydan keyin yangi dasturchi "kodni soddalashtirib", xuddi o'sha zaiflikni qaytarib qo'ymasligi kerak.

Bu dars — bosqichning amaliy yakuni. Siz:
1. Qaydnoma'ni **sinovdan o'tkaziladigan** shaklga keltirasiz (application factory).
2. Har bir xavfsizlik xususiyati uchun **avtomatik test** yozasiz.
3. Ataylab zaif versiyada zaifliklarni **topib, tuzatib**, har biri uchun **tuzatish hisoboti** yozasiz.
4. Mashq ilovalarida (Juice Shop, DVWA) ko'nikmani mustahkamlaysiz.

Natija — portfolio loyihasining markaziy qismi (a4 bosqichi).

## Nega testlar — xavfsizlik vositasi

| Testsiz | Test bilan |
|---|---|
| "Biz IDOR'ni tuzatdik" — so'z | "IDOR testi: begona qayd — 404" — tekshirsa bo'ladigan dalil |
| Refaktoring zaiflikni qaytarishi mumkin, hech kim sezmaydi | CI'da test qizil bo'ladi — o'zgarish birlashtirilmaydi (a4) |
| Kod ko'rib chiqish har safar hammasini qo'lda tekshiradi | Asosiy xususiyatlar avtomatik; ko'rib chiqish yangi narsalarga qaratiladi |

Xavfsizlik testlari — bu **regressiya testlari**: ular bir marta tuzatilgan narsa yana buzilmasligini kafolatlaydi.

## 1-qadam: sinovdan o'tkaziladigan ilova

a1 bosqichida Qaydnoma bitta `app.py` fayl edi, global `DATABASE` va `SECRET_KEY` bilan. Testlar uchun har bir test **toza**, alohida ma'lumotlar bazasi va sozlamalar bilan ishlashi kerak. Flask'da buning standart usuli — **application factory** (rasmiy Flask tutorial'dagi kabi):

```
qaydnoma/
├── qaydnoma/
│   ├── __init__.py        # create_app()
│   ├── db.py              # get_db, init_db
│   ├── auth.py            # register, login, logout (Blueprint)
│   ├── notes.py           # qaydlar (Blueprint)
│   ├── access.py          # Action, can(), load_note()
│   └── schema.sql
├── tests/
│   ├── conftest.py
│   ├── test_auth.py
│   ├── test_access.py
│   └── test_security.py
└── pyproject.toml
```

```python
# qaydnoma/__init__.py
import os
from flask import Flask
from flask_wtf.csrf import CSRFProtect

csrf = CSRFProtect()

def create_app(test_config: dict | None = None) -> Flask:
    app = Flask(__name__)
    app.config.from_mapping(
        SECRET_KEY=os.environ.get("QAYDNOMA_SECRET_KEY"),
        DATABASE=os.environ.get("QAYDNOMA_DB", "qaydnoma.db"),
        SESSION_COOKIE_SECURE=True,
        SESSION_COOKIE_HTTPONLY=True,
        SESSION_COOKIE_SAMESITE="Lax",
        MAX_CONTENT_LENGTH=2 * 1024 * 1024,
    )
    if test_config:
        app.config.update(test_config)
    if not app.config["SECRET_KEY"]:
        raise RuntimeError("SECRET_KEY o'rnatilmagan")          # fail closed (konfiguratsiya darsi)

    csrf.init_app(app)

    from . import db, auth, notes
    db.init_app(app)
    app.register_blueprint(auth.bp)
    app.register_blueprint(notes.bp)

    from .security import add_security_headers
    app.after_request(add_security_headers)                   # CSP, nosniff, ... (a1 bosqichi)
    return app
```

Muhimi — g'oya: sozlamalar tashqaridan beriladi, va test o'z bazasi bilan **o'z** ilova nusxasini yaratadi.

## 2-qadam: test infratuzilmasi

```python
# tests/conftest.py
import pytest
from qaydnoma import create_app
from qaydnoma.db import get_db, init_db

PASSWORD = "uzun-test-parol-123"

@pytest.fixture
def app(tmp_path):
    app = create_app({
        "TESTING": True,
        "SECRET_KEY": "faqat-test-uchun",
        "DATABASE": str(tmp_path / "test.db"),
        "WTF_CSRF_ENABLED": False,          # CSRF alohida testda yoqiladi
        "SESSION_COOKIE_SECURE": False,     # test mijozi HTTP orqali ishlaydi
    })
    with app.app_context():
        init_db()
    return app


@pytest.fixture
def client_as(app):
    """client_as("owner") — shu nomdagi foydalanuvchi bilan kirgan test mijozi."""
    clients = {}

    def _get(name: str):
        if name not in clients:
            client = app.test_client()
            if name != "anon":
                client.post("/register", data={"username": name, "password": PASSWORD})
                client.post("/login", data={"username": name, "password": PASSWORD})
            clients[name] = client
        return clients[name]

    return _get


@pytest.fixture
def note_of_owner(client_as):
    """'owner' foydalanuvchisining bitta qaydi; uning ID'sini qaytaradi."""
    client_as("owner").post("/notes/new", data={"title": "Maxfiy", "body": "Faqat egasi uchun"})
    return 1
```

## 3-qadam: xavfsizlik testlari

Har bir test — bir xavfsizlik xususiyatining **isboti**. Ular a1–a2 bosqichlaridagi har bir darsga mos keladi.

```python
# tests/test_security.py

def test_idor_foreign_note_is_404(client_as, note_of_owner):
    """Kirish nazorati: begona qayd ko'rinmaydi."""
    assert client_as("owner").get(f"/notes/{note_of_owner}").status_code == 200
    assert client_as("other").get(f"/notes/{note_of_owner}").status_code == 404


def test_note_body_is_html_escaped(client_as):
    """XSS: qayd matnidagi HTML matn sifatida ko'rsatiladi."""
    c = client_as("owner")
    c.post("/notes/new", data={"title": "t", "body": "<b>salom</b>"})
    html = c.get("/notes/1").get_data(as_text=True)
    assert "&lt;b&gt;salom&lt;/b&gt;" in html
    assert "<b>salom</b>" not in html


def test_search_with_quote_is_safe(client_as):
    """Injection: qo'shtirnoq so'rov tuzilishini buzmaydi va begona qaydlar chiqmaydi."""
    client_as("other").post("/notes/new", data={"title": "begona", "body": "x"})
    resp = client_as("owner").get("/search", query_string={"q": "' OR '1'='1"})
    assert resp.status_code == 200
    assert "begona" not in resp.get_data(as_text=True)


def test_login_error_message_is_generic(app, client_as):
    """Autentifikatsiya: user enumeration yo'q."""
    client_as("owner")                                   # 'owner' mavjud
    c = app.test_client()
    wrong_pass = c.post("/login", data={"username": "owner", "password": "noto'g'ri"})
    no_user = c.post("/login", data={"username": "yoq_odam", "password": "noto'g'ri"})
    assert wrong_pass.status_code == no_user.status_code == 401
    assert wrong_pass.get_data() == no_user.get_data()


def test_security_headers_present(client_as):
    """Brauzer himoyalari: asosiy sarlavhalar bor."""
    resp = client_as("anon").get("/login")
    assert "default-src" in resp.headers["Content-Security-Policy"]
    assert "frame-ancestors 'none'" in resp.headers["Content-Security-Policy"]
    assert resp.headers["X-Content-Type-Options"] == "nosniff"


def test_session_cookie_flags(app):
    """Cookie atributlari: HttpOnly va SameSite."""
    c = app.test_client()
    c.post("/register", data={"username": "u1", "password": "uzun-test-parol-123"})
    resp = c.post("/login", data={"username": "u1", "password": "uzun-test-parol-123"})
    cookie = resp.headers.get("Set-Cookie", "")
    assert "HttpOnly" in cookie
    assert "SameSite=Lax" in cookie


def test_csrf_token_required(tmp_path):
    """CSRF: tokensiz POST rad etiladi (bu testda CSRF yoqiq)."""
    from qaydnoma import create_app
    from qaydnoma.db import init_db
    app = create_app({"TESTING": True, "SECRET_KEY": "t", "DATABASE": str(tmp_path / "c.db"),
                      "SESSION_COOKIE_SECURE": False})
    with app.app_context():
        init_db()
    resp = app.test_client().post("/login", data={"username": "x", "password": "y"})
    assert resp.status_code == 400


def test_mass_assignment_role_rejected(client_as):
    """API: role maydoni orqali huquqni oshirib bo'lmaydi."""
    resp = client_as("owner").patch("/api/users/me", json={"username": "yangi", "role": "admin"})
    assert resp.status_code == 400
```

Va kirish nazorati darsidagi **matritsa testi** (`test_access.py`) — barcha endpointlar × barcha rollar.

Testlarni ishga tushirish:

```bash
pip install pytest
pytest -q
```

Testlar ilova kodining aniq tuzilishiga bog'liq — yuqoridagilar namuna; ularni o'z Qaydnoma'ingizga moslang. Muhimi — **har bir himoya uchun bitta test** tamoyili.

:::key
**"Har bir tuzatish — test bilan" qoidasi.** Zaiflikni tuzatganingizda tartib shunday: (1) avval zaiflikni ko'rsatadigan **test yozing** — u qizil bo'lishi kerak (zaiflik haqiqatan bor); (2) kodni tuzating — test yashil bo'ladi; (3) test abadiy qoladi. Bu "qizil → yashil" tartibi ikki narsani isbotlaydi: test haqiqatan zaiflikni ushlaydi (aks holda u hech narsani tekshirmayotgan bo'lishi mumkin) va tuzatish ishlaydi. Curriculum'dagi maqsad — "Har bir tuzatish uchun test yozdim" — aynan shu.
:::

## 4-qadam: zaif versiyada ov

Endi o'zingizni sinang. Qaydnoma'ning **ataylab zaif** nusxasini yarating (alohida Git branch'da — `vulnerable`), unga quyidagi zaifliklarni kiriting (har birini bu bosqichdagi darslardan biladigan usulda), keyin — bir necha kundan keyin, "yangi ko'z" bilan — ularni toping:

| # | Zaiflik | Qayerga |
|---|---|---|
| 1 | SQL injection | Qidiruv (f-string) |
| 2 | Stored XSS | Qayd matni (`\|safe`) |
| 3 | IDOR | Qaydni tahrirlash (egalik tekshiruvi yo'q) |
| 4 | CSRF | Qaydni o'chirish (GET, tokensiz) |
| 5 | Mass assignment | Profilni yangilash API'si |
| 6 | Zaif token | Parolni tiklash (`random`) |
| 7 | Ma'lumot sizishi | Batafsil xato sahifasi |
| 8 | Biznes mantiq | Qaydlar limiti faqat formada |

Yaxshisi: do'stingiz yoki o'quv hamkoringiz bilan almashing — har biringiz o'z zaif versiyangizni yaratasiz va boshqasinikidan ov qilasiz. Bu — haqiqiy kod ko'rib chiqish va pentestga eng yaqin mashq (a3 bosqichida avtomatik vositalar ham qo'shiladi).

## 5-qadam: tuzatish hisoboti

Har bir topilgan va tuzatilgan zaiflik uchun qisqa hisobot — AppSec muhandisining dasturchilar bilan kundalik muloqot formati (a4 bosqichidagi "Zaifliklarni boshqarish" darsida batafsil):

```markdown
## [YUQORI] Qaydni tahrirlashda IDOR (QAYD-SEC-003)

**Joy:** `qaydnoma/notes.py`, `note_edit()`, 48-qator
**Ta'sir:** Har qanday kirgan foydalanuvchi istalgan qaydni ID bo'yicha tahrirlay oladi.

**Qayta hosil qilish (o'z test muhitida):**
1. `alice` va `bob` hisoblarini yarating; `alice` qayd yaratadi (ID 1).
2. `bob` sessiyasi bilan `POST /notes/1/edit` yuboriladi — qayd o'zgaradi.

**Ildiz sabab:** `note_edit()` qaydni faqat ID bo'yicha yuklaydi; egalik yoki ulashish huquqi tekshirilmaydi.

**Tuzatish:** Qaydni `load_note(note_id, Action.EDIT)` orqali yuklash — markazlashgan ruxsat tekshiruvi.
Diff: (havola yoki parcha)

**Test:** `tests/test_access.py::test_access_matrix` — `("other", "POST", "/notes/1/edit", 404)` qatori;
tuzatishdan oldin qizil, keyin yashil.

**O'xshash joylar tekshirildi:** `note_delete`, `note_share`, `api_note_patch` — ular ham `load_note` ishlatadi ✓
```

Oxirgi qatorga e'tibor bering: bitta zaiflik topilsa — **xuddi shu naqshni boshqa joylarda ham qidiring**. Dasturchi bir joyda tekshiruvni unutgan bo'lsa, ehtimol boshqa joyda ham unutgan.

## 6-qadam: mashq ilovalari

O'z ilovangizdan tashqari, ataylab zaif qilib yaratilgan, **o'z kompyuteringizda** ishga tushiriladigan mashq ilovalari:

| Ilova | Xususiyati |
|---|---|
| **OWASP Juice Shop** | Zamonaviy (Node.js, Angular) onlayn do'kon; yuzdan ortiq topshiriq, qiyinlik darajalari bilan; ichki "ball jadvali" |
| **DVWA** | Klassik PHP ilova; har bir zaiflik uchun past/o'rta/yuqori/imkonsiz darajalar — **"imkonsiz" darajadagi kod — tuzatilgan versiya namunasi** |
| **OWASP WebGoat** | Darslar va topshiriqlar bilan (Java) |
| **OWASP Secure Coding Dojo** | Xavfsiz kod yozish bo'yicha mashg'ulotlar |
| **PortSwigger Web Security Academy** | Brauzerda, bepul; har bir zaiflik sinfi bo'yicha nazariya va laboratoriyalar |

Ularni **Docker** bilan ishga tushirish eng oson (masalan, Juice Shop'ning rasmiy image'i bor) — va faqat lokal yoki izolyatsiyalangan tarmoqda: ular ataylab zaif, internetga ochiq qolsa — haqiqiy hujumchilar uchun ham nishon.

DVWA'dagi darajalar ayniqsa foydali: har bir zaiflikning **"past"** darajasidagi kodni o'qing (zaif), keyin **"imkonsiz"** darajadagi kodni (tuzatilgan) — va farqni bu bosqichdagi darslar bilan tushuntiring. Bu — kod ko'rib chiqish (a3) uchun ajoyib mashq.

## Xavfsiz kod yozish odatlari

Butun bosqichning qisqa xulosasi — har kuni kod yozganda:

| Odat | Qaysi zaifliklarni yopadi |
|---|---|
| Kod va ma'lumotni ajrating: parametrlangan so'rovlar, argumentlar ro'yxati, shablon o'zgaruvchilari | Injection, SSTI |
| Chiqishni kontekstga mos kodlang; `\|safe` va `innerHTML` dan qoching | XSS |
| Har bir ID'dan keyin — markazlashgan ruxsat tekshiruvi; standart — rad etish | IDOR, BOLA, vertikal |
| Holatni o'zgartiruvchi amallar — POST + CSRF tokeni | CSRF |
| Kirish va chiqish sxemalari (allowlist) | Mass assignment, ortiqcha ma'lumot, kutilmagan qiymatlar |
| Pul, narx, rol — faqat serverda; "tekshir-va-yangila" — atomik | Biznes mantiq, poyga holatlari |
| `secrets`, Argon2, HMAC, TLS tekshiruvi yoqiq, sirlar koddan tashqarida | Kriptografik xatolar |
| Server so'rovlari — allowlist; `pickle`/`yaml.load` yo'q; `defusedxml` | SSRF, deserializatsiya, XXE |
| Xavfsiz standart sozlamalar, fail closed, umumiy xato sahifalari | Konfiguratsiya xatolari |
| Har bir himoya — test bilan | Regressiya |

## Bu dars nimani bermaydi

- **To'liq Flask arxitektura kursini** — rasmiy Flask tutorial (application factory, blueprints) shu uchun.
- **Testlashning barcha turlarini** — integratsiya, yuklama, fuzzing — alohida mavzular.
- **Avtomatik xavfsizlik tahlilini** — SAST, DAST, SCA a3 bosqichida; CI'ga ulash — a4 bosqichida.

:::try
**1. Factory'ga o'tkazing.** Qaydnoma'ni `create_app()` va Blueprint'lar tuzilishiga o'tkazing (rasmiy Flask tutorial yordam beradi).

**2. Testlar.** `conftest.py` va kamida 8 ta xavfsizlik testini yozing (yuqoridagi namunalar asosida) va kirish nazorati matritsa testini qo'shing. `pytest -q` — hammasi yashil.

**3. Qizil → yashil.** Bitta himoyani vaqtincha olib tashlang (masalan, `load_note` ni `note_edit` dan). Qaysi test qizil bo'ldi? Qaytaring.

**4. Zaif branch.** `vulnerable` branch'da 8 ta zaiflikni kiriting. Bir necha kundan keyin (yoki hamkoringiz bilan almashib) ularni toping, tuzating va har biri uchun tuzatish hisobotini yozing.

**5. Juice Shop.** Juice Shop'ni Docker bilan lokal ishga tushiring va kamida 10 ta oson topshiriqni bajaring. Har biri uchun: bu qaysi zaiflik sinfi va kodda qanday tuzatilardi?

**6. DVWA.** DVWA'da SQL injection va XSS bo'limlarining "low" va "impossible" darajadagi manba kodini solishtiring va farqni o'z so'zlaringiz bilan yozing.
:::

## Xulosa

- Xavfsizlik testlari — **regressiya himoyasi**: tuzatilgan narsa qaytib buzilmaydi.
- Sinovdan o'tkaziladigan ilova: **application factory**, tashqi sozlamalar, har testga toza baza.
- Har bir himoya — bitta test: IDOR, kodlash, injection, xato xabarlari, sarlavhalar, cookie, CSRF, mass assignment + **kirish nazorati matritsasi**.
- Tuzatish tartibi: **qizil test → tuzatish → yashil test** → test abadiy qoladi.
- **Zaif branch** va hamkor bilan almashinuv — kod ko'rib chiqish va pentest mashqi.
- **Tuzatish hisoboti**: joy, ta'sir, qayta hosil qilish, ildiz sabab, tuzatish, test, **o'xshash joylar tekshirildi**.
- Mashq ilovalari: **Juice Shop**, **DVWA** (low va impossible kodini solishtirish), WebGoat, PortSwigger Academy — faqat lokal.

:::quiz
? Nega xavfsizlik testlari “regressiya testlari” deyiladi?
+ Ular bir marta tuzatilgan zaiflik keyingi o'zgarishlarda qaytib kelmasligini kafolatlaydi
- Ular faqat eski kodni tekshiradi
- Ular dasturni sekinlashtiradi
- Ular faqat bir marta ishga tushiriladi
! Refaktoring zaiflikni qaytarsa, test qizil bo'ladi.

? Nega Flask'da application factory (create_app) testlash uchun qulay?
+ Har bir test o'z sozlamalari va toza ma'lumotlar bazasi bilan alohida ilova nusxasini yarata oladi
- U ilovani tezlashtiradi
- U CSRF'ni o'chiradi
- U faqat ishlab chiqarish uchun
! Global holat o'rniga sozlamalar tashqaridan beriladi.

? XSS himoyasini tekshiradigan test nimani tasdiqlashi kerak?
+ Qayd matnidagi <b>salom</b> javobda &lt;b&gt;salom&lt;/b&gt; ko'rinishida bo'lishi va xom teg bo'lmasligi
- Sahifa yuklanishi
- Qayd saqlanishi
- Server 500 qaytarishi
! Test aniq xavfsizlik xususiyatini — kodlashni — tekshiradi.

? Zaiflikni tuzatishda “qizil → yashil” tartibi nimani isbotlaydi?
+ Test haqiqatan zaiflikni ushlaydi (avval qizil) va tuzatish ishlaydi (keyin yashil)
- Test tez ishlaydi
- Kod chiroyli yozilgan
- Hech narsani
! Avvaldan yashil bo'lgan test zaiflikni umuman tekshirmayotgan bo'lishi mumkin.

? Tuzatish hisobotidagi “O'xshash joylar tekshirildi” bo'limi nega muhim?
+ Bitta joyda unutilgan tekshiruv ko'pincha boshqa joylarda ham unutilgan bo'ladi — xuddi shu naqshni boshqa endpointlarda qidirish kerak
- Hisobotni uzaytirish uchun
- Bu majburiy emas
- Faqat rahbariyat uchun
! Bir zaiflik — butun sinfni qidirish signali.

? DVWA'dagi “impossible” daraja kodini o'qish nima uchun foydali?
+ U zaifligi tuzatilgan versiya namunasi — “low” bilan solishtirib, to'g'ri himoyani ko'rish mumkin
- U eng zaif versiya
- U faqat administratorlar uchun
- Undan foyda yo'q
! Kod ko'rib chiqish uchun ajoyib mashq.

? Juice Shop va DVWA kabi mashq ilovalarini qanday ishga tushirish kerak?
+ Faqat lokal yoki izolyatsiyalangan tarmoqda (masalan, Docker bilan) — ular ataylab zaif
- Internetga ochiq serverda
- Kompaniya tarmog'ida
- Bulutda ochiq IP bilan
! Ochiq qolgan mashq ilovasi haqiqiy hujumchilar uchun nishon.

? Testlarda nega WTF_CSRF_ENABLED odatda o'chiriladi, lekin alohida test yoqilgan holda yoziladi?
+ Boshqa testlarni soddalashtirish uchun o'chiriladi, CSRF himoyasining o'zi esa alohida testda haqiqiy holatda tekshiriladi
- CSRF testlarda ishlamaydi
- CSRF muhim emas
- Bu Flask talabi
! Har bir himoya o'z testida, haqiqiy sozlama bilan isbotlanishi kerak.

? Qaysi odatlar injection va XSS'ni birdaniga kamaytiradi?
+ Kod va ma'lumotni ajratish (parametrlash) va chiqishni kontekstga mos kodlash
- Ko'proq log yozish
- Parollarni uzunroq qilish
- Serverni tezlashtirish
! AppSec'ning asosiy tamoyili — kod va ma'lumotni aralashtirmaslik.

? Zaif branch'ni hamkor bilan almashish mashqining qiymati nima?
+ “Yangi ko'z” bilan noma'lum koddan zaifliklarni topish — haqiqiy kod ko'rib chiqish va pentestga yaqin
- Kodni tezroq yozish
- Git'ni o'rganish
- Hech qanday qiymati yo'q
! O'z kodingizdagi xatolarni ko'rish ancha qiyin.
:::

:::cards
Xavfsizlik testlarining roli? :: Regressiya himoyasi — tuzatilgan zaiflik qaytib kelmasligi; tekshirsa bo'ladigan dalil.
Application factory? :: create_app(test_config) — sozlamalar tashqaridan; har test o'z ilovasi va toza bazasi bilan.
Har bir himoya uchun test misollari? :: IDOR (404), XSS (kodlash), injection (qo'shtirnoq), xato xabari bir xilligi, sarlavhalar, cookie atributlari, CSRF, mass assignment.
Kirish nazorati matritsa testi? :: Parametrlangan test: (kim, metod, URL, kutilgan kod) — barcha endpointlar × rollar.
Qizil → yashil? :: Avval zaiflikni ko'rsatadigan test (qizil), keyin tuzatish (yashil), test abadiy qoladi.
Zaif branch mashqi? :: Ataylab zaifliklar kiritish, keyin “yangi ko'z” yoki hamkor bilan topish va tuzatish.
Tuzatish hisoboti tuzilishi? :: Darajasi va nomi, joy, ta'sir, qayta hosil qilish, ildiz sabab, tuzatish, test, o'xshash joylar tekshiruvi.
Bitta zaiflik topilganda? :: Xuddi shu naqshni boshqa joylarda ham qidirish.
Mashq ilovalari? :: OWASP Juice Shop, DVWA, WebGoat, Secure Coding Dojo, PortSwigger Academy — faqat lokal.
DVWA darajalaridan foydalanish? :: low (zaif) va impossible (tuzatilgan) kodini solishtirish.
Xavfsiz kod odatlari (qisqa)? :: Kod/ma'lumot ajratish, kontekstli kodlash, markazlashgan ruxsat, POST+CSRF, sxemalar, server tomondagi biznes qoidalar, to'g'ri kriptografiya, xavfsiz standartlar, testlar.
Testlarda CSRF? :: Umumiy testlarda o'chiriladi, alohida testda yoqilgan holda himoya isbotlanadi.
:::
