Kod ko'rib chiqishda dasturchi so'raydi: "Nega bu so'rov xavfli? U ishlayapti-ku." Agar siz o'zingiz hech qachon login va ma'lumotlar bazasi bor ilova yozmagan bo'lsangiz, javobingiz nazariy bo'ladi — va dasturchi buni sezadi. Agar yozgan bo'lsangiz — siz uning tilida gapirasiz: "Mana shu qatorda foydalanuvchi matni SQL'ga yopishtirilmoqda; mana parametrlangan versiyasi, bir qator o'zgaradi."

Eng yaxshi AppSec muhandislari — kod yoza oladigan odamlar. Bu darsda siz **Qaydnoma**ning birinchi versiyasini yozasiz: ro'yxatdan o'tish, kirish, qaydlar yaratish va ko'rish, qidiruv. Va har bir qatorda — nega u shunday yozilgani.

Dasturlash bosqichidagi Python, SQL va HTML bilimlaringiz kerak bo'ladi. Freymvork — **Flask**: kichik, tushunarli va har bir qatlamni ko'rsatadi.

## Tayyorgarlik

```bash
mkdir qaydnoma && cd qaydnoma
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install flask
git init
```

Darhol `.gitignore` (dasturlash bosqichidagi Git darsi va SOAR darsidagi sirlar qoidasi):

```
.venv/
__pycache__/
*.db
.env
```

Loyiha tuzilishi:

```
qaydnoma/
├── app.py
├── schema.sql
├── templates/
│   ├── base.html
│   ├── login.html
│   ├── register.html
│   ├── notes.html
│   └── note.html
└── .gitignore
```

## Ma'lumotlar bazasi

`schema.sql`:

```sql
CREATE TABLE users (
    id            INTEGER PRIMARY KEY,
    username      TEXT    NOT NULL UNIQUE,
    password_hash TEXT    NOT NULL,
    role          TEXT    NOT NULL DEFAULT 'user'
);

CREATE TABLE notes (
    id        INTEGER PRIMARY KEY,
    owner_id  INTEGER NOT NULL REFERENCES users(id),
    title     TEXT    NOT NULL,
    body      TEXT    NOT NULL
);
```

Bazani yaratish:

```bash
python -c "import sqlite3; sqlite3.connect('qaydnoma.db').executescript(open('schema.sql').read())"
```

Ikki narsaga e'tibor bering:
- Parol emas, **`password_hash`** saqlanadi — xavfsizlik bosqichidagi xesh va parollar darsi.
- `role` maydoni bor — u keyinroq (a2 bosqichidagi mass assignment) muhim bo'ladi: foydalanuvchi uni o'zi o'zgartira olmasligi kerak.

## Ilova: asosiy qism

`app.py` — birinchi qism:

```python
import os
import sqlite3
from functools import wraps

from flask import Flask, abort, g, redirect, render_template, request, session, url_for
from werkzeug.security import check_password_hash, generate_password_hash

app = Flask(__name__)
# Sessiya cookie'sini imzolash kaliti — koddan emas, muhitdan
app.config["SECRET_KEY"] = os.environ["QAYDNOMA_SECRET_KEY"]
DATABASE = "qaydnoma.db"


def get_db():
    if "db" not in g:
        g.db = sqlite3.connect(DATABASE)
        g.db.row_factory = sqlite3.Row
    return g.db


@app.teardown_appcontext
def close_db(exc):
    db = g.pop("db", None)
    if db is not None:
        db.close()


def login_required(view):
    @wraps(view)
    def wrapped(*args, **kwargs):
        if "user_id" not in session:
            return redirect(url_for("login"))
        return view(*args, **kwargs)
    return wrapped
```

| Qism | Nega muhim |
|---|---|
| `SECRET_KEY` muhit o'zgaruvchisidan | Flask sessiyasi — **imzolangan cookie**. Kalitni bilgan odam istalgan foydalanuvchi sessiyasini soxtalashtira oladi. Kodda yoki Git'da — hech qachon |
| `get_db` / `close_db` | Har so'rov uchun bitta ulanish, oxirida yopiladi |
| `login_required` dekoratori | Autentifikatsiya tekshiruvi **bir joyda** — har bir funksiyaga qo'lda yozish o'rniga. Bitta joyda — unutish qiyinroq |

Kalitni yaratish va o'rnatish:

```bash
export QAYDNOMA_SECRET_KEY=$(python -c "import secrets; print(secrets.token_hex(32))")
```

`secrets` moduli — kriptografik jihatdan xavfsiz tasodifiy qiymatlar uchun. `random` emas! (a2 bosqichidagi kriptografik xatolar darsi.)

## Ro'yxatdan o'tish va kirish

```python
@app.route("/register", methods=["GET", "POST"])
def register():
    if request.method == "POST":
        username = request.form.get("username", "").strip()
        password = request.form.get("password", "")
        if not (3 <= len(username) <= 32) or len(password) < 12:
            return render_template("register.html", error="Nom 3–32 belgi, parol kamida 12 belgi"), 400
        try:
            db = get_db()
            db.execute(
                "INSERT INTO users (username, password_hash) VALUES (?, ?)",
                (username, generate_password_hash(password)),
            )
            db.commit()
        except sqlite3.IntegrityError:
            return render_template("register.html", error="Bu nom band"), 400
        return redirect(url_for("login"))
    return render_template("register.html")


@app.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        user = get_db().execute(
            "SELECT id, password_hash FROM users WHERE username = ?",
            (request.form.get("username", ""),),
        ).fetchone()
        if user is None or not check_password_hash(user["password_hash"], request.form.get("password", "")):
            return render_template("login.html", error="Login yoki parol noto'g'ri"), 401
        session.clear()
        session["user_id"] = user["id"]
        return redirect(url_for("notes"))
    return render_template("login.html")


@app.route("/logout", methods=["POST"])
def logout():
    session.clear()
    return redirect(url_for("login"))
```

Har bir qaror:

| Qator | Nega |
|---|---|
| `VALUES (?, ?)` | **Parametrlangan so'rov** — pastda batafsil |
| `generate_password_hash` | Parol tuzli (salt) va sekin funksiya bilan xeshlanadi; `check_password_hash` solishtiradi. Hech qachon ochiq yoki oddiy SHA-256 bilan emas |
| Parol kamida 12 belgi | Server tomonda tekshiruv — frontend'dagi tekshiruv chetlab o'tilishi mumkin (o'tgan dars) |
| "**Login yoki parol** noto'g'ri" — bitta xabar | "Bunday foydalanuvchi yo'q" va "parol noto'g'ri" deb alohida aytish — hujumchiga qaysi nomlar mavjudligini ochib beradi (**user enumeration**). b1 bosqichidagi 4625 SubStatus kodlarini eslang — ular faqat ichki logda, foydalanuvchiga emas |
| `session.clear()` kirishdan oldin | Kirishdan oldingi sessiya ma'lumotlarini olib tashlash — eski holat yangi sessiyaga o'tmasligi uchun |
| `/logout` faqat `POST` | Holatni o'zgartiruvchi amal GET bo'lmasligi kerak — a2 bosqichidagi CSRF darsi |

## Parametrlangan so'rov — eng muhim qator

Qidiruv funksiyasini ikki xil yozish mumkin. **Noto'g'ri** usul:

```python
# ❌ HECH QACHON BUNDAY YOZMANG
q = request.args.get("q", "")
rows = db.execute(f"SELECT id, title FROM notes WHERE title LIKE '%{q}%'").fetchall()
```

Bu yerda foydalanuvchi matni SQL so'rovining **o'ziga** yopishtirilmoqda. Agar matnda qo'shtirnoq bo'lsa, u SQL tuzilishini o'zgartiradi — foydalanuvchi ma'lumoti **kod**ga aylanadi. Bu — [[sql-injection|SQL injection]] (a2 bosqichida batafsil).

**To'g'ri** usul:

```python
@app.route("/search")
@login_required
def search():
    q = request.args.get("q", "")[:100]
    rows = get_db().execute(
        "SELECT id, title FROM notes WHERE owner_id = ? AND title LIKE ?",
        (session["user_id"], f"%{q}%"),
    ).fetchall()
    return render_template("notes.html", notes=rows, q=q)
```

[[prepared-statement|Parametrlangan so'rovda]] SQL tuzilishi (`... WHERE title LIKE ?`) va ma'lumot (`%salom%`) bazaga **alohida** yuboriladi. Baza ma'lumotni hech qachon kod sifatida talqin qilmaydi — qo'shtirnoqlar, izohlar, kalit so'zlar — hammasi shunchaki matn bo'lib qoladi.

E'tibor bering: qidiruv ham `owner_id = ?` bilan cheklangan — foydalanuvchi faqat **o'z** qaydlarini qidiradi. Bu avtorizatsiya, va u ham so'rovning bir qismi.

:::key
**Kod va ma'lumotni hech qachon aralashtirmang.** Bu — AppSec'ning eng muhim yagona tamoyili. SQL injection, XSS, buyruq injection, shablon injection — hammasi bitta xatodan kelib chiqadi: foydalanuvchi ma'lumoti boshqa tilning (SQL, HTML, shell) **kodi** ichiga yopishtirildi. Himoya ham har doim bir xil g'oya: ma'lumotni koddan ajratib yuboradigan mexanizm — parametrlangan so'rov, shablon kodlashi, argumentlar ro'yxati. Agar o'zingizni `f"... {foydalanuvchi_matni} ..."` ni boshqa til uchun yozayotganingizda ushlasangiz — to'xtang.
:::

### ORM

Ko'p loyihalar SQL'ni qo'lda yozmaydi — [[orm|ORM]] (SQLAlchemy, Django ORM) ishlatadi:

```python
# SQLAlchemy uslubida (taqqoslash uchun)
notes = Note.query.filter_by(owner_id=current_user.id).filter(Note.title.like(f"%{q}%")).all()
```

ORM so'rovlarni avtomatik parametrlaydi — bu katta yutuq. Lekin ORM'larda ham "xom SQL" funksiyalari bor (`text()`, `raw()`, `extra()`), va ular ichida f-string ishlatsangiz — xuddi o'sha zaiflik qaytadi. Kod ko'rib chiqishda (a3) aynan shu joylarni qidirasiz.

## Qaydlar: ko'rish va yaratish

```python
@app.route("/notes")
@login_required
def notes():
    rows = get_db().execute(
        "SELECT id, title FROM notes WHERE owner_id = ? ORDER BY id DESC",
        (session["user_id"],),
    ).fetchall()
    return render_template("notes.html", notes=rows)


@app.route("/notes/new", methods=["POST"])
@login_required
def note_create():
    title = request.form.get("title", "").strip()[:200]
    body = request.form.get("body", "")[:10000]
    if not title:
        abort(400)
    db = get_db()
    db.execute(
        "INSERT INTO notes (owner_id, title, body) VALUES (?, ?, ?)",
        (session["user_id"], title, body),
    )
    db.commit()
    return redirect(url_for("notes"))


@app.route("/notes/<int:note_id>")
@login_required
def note_view(note_id):
    note = get_db().execute(
        "SELECT id, title, body FROM notes WHERE id = ? AND owner_id = ?",
        (note_id, session["user_id"]),
    ).fetchone()
    if note is None:
        abort(404)
    return render_template("note.html", note=note)
```

Uchta muhim qaror:

1. **`owner_id` sessiyadan olinadi**, formadan emas. Agar forma `owner_id` maydonini yuborsa va kod uni ishlatsa — foydalanuvchi boshqa birov nomidan qayd yarata oladi (o'tgan darsdagi "JSON'dagi kutilmagan maydonlar").
2. **`note_view` da `AND owner_id = ?`** — dars boshidagi IDOR'ning himoyasi. Usiz `/notes/43` istalgan foydalanuvchining 43-qaydini ko'rsatadi.
3. **Begona qayd uchun `404`**, `403` emas. `403` — "bu qayd bor, lekin sizniki emas" degani; bu ham ma'lumot sizishi (qaysi ID'lar mavjud). `404` — "sizning nuqtai nazaringizdan bunday qayd yo'q".

`<int:note_id>` — Flask'ning o'zi ID raqam ekanini tekshiradi; raqam bo'lmasa, funksiya umuman chaqirilmaydi. Kiritishni tekshirishning eng oddiy shakli.

## Shablonlar — avtomatik kodlash

`templates/note.html`:

```html
{% extends "base.html" %}
{% block content %}
  <h1>{{ note.title }}</h1>
  <div class="note-body">{{ note.body }}</div>
{% endblock %}
```

Flask'ning shablon dvigateli — **Jinja2** — `.html` shablonlarda `{{ ... }}` ichidagi qiymatlarni **avtomatik kodlaydi** (autoescape): `<` → `&lt;`, `>` → `&gt;`, `"` → `&quot;`. Agar qayd matnida HTML teglari bo'lsa, ular brauzerda **matn** bo'lib ko'rinadi, kod bo'lib ishlamaydi. Bu — [[xss|XSS]]ga qarshi asosiy himoya, va siz uni bepul olasiz.

Xavf — bu himoyani o'chirish:

```html
<!-- ❌ |safe — "bu matn xavfsiz, kodlama" degani -->
<div>{{ note.body | safe }}</div>
```

`|safe`, `Markup()`, `{% autoescape false %}` — kod ko'rib chiqishda birinchi qidiriladigan narsalar (a3). Agar qaydlarda formatlash kerak bo'lsa (qalin matn, havolalar) — to'g'ri yo'l sanitizatsiya kutubxonasi (a2 bosqichidagi XSS darsi), `|safe` emas.

## Ishga tushirish — va bitta muhim ogohlantirish

```bash
flask --app app run --debug
```

Brauzerda `http://127.0.0.1:5000/register` — ro'yxatdan o'ting, kiring, qayd yarating.

:::warn
**Debug rejimi — faqat o'z kompyuteringizda.** Flask debug rejimida xato sahifasi interaktiv konsolni o'z ichiga oladi — bu brauzer orqali serverda kod bajarish imkoniyati (PIN bilan himoyalangan, lekin bu ishlab chiqarish uchun himoya emas). Debug rejimi ishlab chiqarishda — haqiqiy insidentlarning ma'lum sababi. Ishlab chiqarishda: `--debug` yo'q, Flask'ning o'rnatilgan serveri emas, balki to'g'ri WSGI server (masalan, gunicorn) va undan oldin reverse proxy. Bu — a2 bosqichidagi "Xavfsizlik konfiguratsiyasi xatolari" darsining birinchi bandi.
:::

## Ilovangizni sinang

Ikkinchi foydalanuvchi bilan ro'yxatdan o'ting (boshqa brauzerda yoki yashirin oynada) va tekshiring:

| Sinov | Kutilgan natija |
|---|---|
| 1-foydalanuvchi qaydi ID'sini 2-foydalanuvchi URL'iga yozish (`/notes/1`) | `404` |
| Qayd matniga HTML tegi yozish | Teg matn sifatida ko'rinadi |
| Qidiruvga qo'shtirnoq (`'`) yozish | Oddiy qidiruv, xato yo'q |
| Kirmasdan `/notes` ni ochish | Login sahifasiga yo'naltirish |
| Mavjud bo'lmagan nom bilan va noto'g'ri parol bilan kirish | Ikkalasida ham **bir xil** xabar |

Bu sinovlarni keyinroq **avtomatik testlar**ga aylantirasiz (a2 bosqichidagi xavfsiz kod yozish amaliyoti darsi): har bir xavfsizlik xususiyati — test bilan isbotlangan.

## GitHub'ga joylash

```bash
git add .
git status                 # .env va *.db ro'yxatda YO'Qligini tekshiring!
git commit -m "Qaydnoma: register, login, notes, search"
```

README'da: ilova nima qiladi, qanday ishga tushiriladi (`QAYDNOMA_SECRET_KEY` ni qanday o'rnatish), va **xavfsizlik qarorlari** bo'limi — yuqoridagi jadvallardan qisqacha. Bu ombor — AppSec portfoliongizning boshlanishi (a4 bosqichi).

## Bu dars nimani bermaydi

- **Ishlab chiqarishga tayyor ilovani** — CSRF himoyasi, xavfsizlik sarlavhalari, rate limiting, loglash hali yo'q; ular keyingi darslarda qo'shiladi.
- **Barcha freymvorklarni** — Django, Express, Spring'da tamoyillar bir xil, sintaksis boshqa.
- **To'liq Flask kursini** — rasmiy Flask tutorial va CS50W shu uchun.

:::try
**1. Qaydnoma'ni yozing.** Yuqoridagi kod asosida ilovani to'liq ishga tushiring. `base.html`, `login.html`, `register.html`, `notes.html` shablonlarini o'zingiz yozing (oddiy HTML formalar). Qayd yaratish formasi `POST /notes/new` ga yuborsin.

**2. Sinov jadvali.** Yuqoridagi 5 ta sinovni ikki foydalanuvchi bilan bajaring va natijalarni yozing.

**3. Xatoni ataylab qo'ying va toping.** `note_view` dan `AND owner_id = ?` ni olib tashlang. 2-foydalanuvchi bilan 1-foydalanuvchining qaydini oching. Keyin qaytaring. Siz hozirgina IDOR yaratdingiz va tuzatdingiz.

**4. Tahrirlash va o'chirish.** Qaydni tahrirlash (`POST /notes/<id>/edit`) va o'chirish (`POST /notes/<id>/delete`) funksiyalarini qo'shing. Ikkalasida ham egalik tekshiruvi bo'lishi shart. Qanday qilib `UPDATE` va `DELETE` so'rovlarida buni bir qatorda qilish mumkin?

**5. GitHub.** Loyihani GitHub'ga joylang va README'ga "Xavfsizlik qarorlari" bo'limini yozing.

*Javob (4): so'rovning o'zida — `UPDATE notes SET title = ?, body = ? WHERE id = ? AND owner_id = ?` va `DELETE FROM notes WHERE id = ? AND owner_id = ?`; keyin `cursor.rowcount == 0` bo'lsa — `404`.*
:::

## Xulosa

- AppSec muhandisi **kod yoza olishi** kerak — dasturchi tilida gapirish uchun.
- **Qaydnoma v1**: Flask + SQLite; register, login, qaydlar, qidiruv.
- `SECRET_KEY` — **muhitdan**, `secrets` moduli bilan; `.gitignore` — birinchi kundan.
- Parollar — `generate_password_hash` (salt + sekin); kirish xatosi — **bitta umumiy xabar**; kirishda `session.clear()`.
- **Parametrlangan so'rovlar** (`?`) — SQL va ma'lumot alohida; **kod va ma'lumotni hech qachon aralashtirmang**.
- ORM avtomatik parametrlaydi — lekin "xom SQL" funksiyalari xavfli bo'lib qolaveradi.
- **`owner_id` sessiyadan**, formadan emas; har bir so'rovda **egalik tekshiruvi**; begona obyekt uchun `404`.
- Jinja2 **avtomatik kodlaydi**; `|safe` — xavf belgisi.
- Debug rejimi — **faqat lokal**.

:::quiz
? Nega Flask SECRET_KEY kodga yozilmasligi kerak?
+ Sessiya cookie'lari shu kalit bilan imzolanadi; kalitni bilgan odam istalgan foydalanuvchi sessiyasini soxtalashtira oladi
- Kalit kodni sekinlashtiradi
- Flask buni taqiqlaydi
- Kalit faqat debug uchun kerak
! Kalit muhit o'zgaruvchisida yoki sirlar omborida saqlanadi.

? Tasodifiy kalit yaratish uchun Python'da qaysi modul to'g'ri?
- random
+ secrets
- math
- time
! random kriptografik jihatdan xavfsiz emas — uning qiymatlarini taxmin qilish mumkin.

? Nega login xatosida “Bunday foydalanuvchi yo'q” va “Parol noto'g'ri” deb alohida aytish yomon?
+ Hujumchiga qaysi foydalanuvchi nomlari mavjudligini ochib beradi (user enumeration)
- Bu juda uzun matn
- Foydalanuvchilar chalkashadi
- Bu tezlikni pasaytiradi
! Bitta umumiy xabar: “Login yoki parol noto'g'ri”.

? Parametrlangan so'rov SQL injection'dan qanday himoya qiladi?
- Foydalanuvchi matnidan qo'shtirnoqlarni o'chiradi
+ SQL tuzilishi va ma'lumot bazaga alohida yuboriladi — ma'lumot hech qachon kod sifatida talqin qilinmaydi
- So'rovni shifrlaydi
- So'rovni sekinlashtiradi
! Kod va ma'lumot ajratilgan — bu AppSec'ning asosiy tamoyili.

? Qaysi kod qatori xavfli?
+ db.execute(f"SELECT * FROM notes WHERE title = '{q}'")
- db.execute("SELECT * FROM notes WHERE title = ?", (q,))
- Note.query.filter_by(title=q)
- db.execute("SELECT * FROM notes WHERE id = ? AND owner_id = ?", (nid, uid))
! Foydalanuvchi matni SQL so'rovining o'ziga yopishtirilmoqda.

? Qayd yaratishda owner_id qayerdan olinishi kerak?
- Forma maydonidan
- URL parametridan
+ Server tomonidagi sessiyadan (joriy foydalanuvchi)
- Cookie'dagi ochiq qiymatdan
! Foydalanuvchi yuborgan owner_id'ga ishonsangiz, u boshqa birov nomidan qayd yarata oladi.

? Begona foydalanuvchining qaydi so'ralganda nega 403 emas, 404 qaytariladi?
+ 403 “bu obyekt mavjud, lekin sizniki emas” degan ma'lumotni sizdiradi; 404 mavjudlikni ham oshkor qilmaydi
- 404 tezroq
- 403 kodi mavjud emas
- Farqi yo'q
! Kichik detal, lekin ma'lumot sizishini kamaytiradi.

? Jinja2 shablonidagi {{ note.body | safe }} nima uchun xavf belgisi?
- U shablonni sekinlashtiradi
+ U avtomatik kodlashni o'chiradi — matndagi HTML kod sifatida ishlaydi (XSS)
- U matnni o'chiradi
- U faqat sarlavhalar uchun
! Formatlash kerak bo'lsa — sanitizatsiya kutubxonasi, |safe emas.

? Flask debug rejimi haqida qaysi gap to'g'ri?
+ Faqat o'z kompyuteringizda ishlatiladi; ishlab chiqarishda u serverda kod bajarish imkoniyatini ochishi mumkin
- Ishlab chiqarishda ham yoqiq bo'lishi kerak — xatolarni ko'rish uchun
- U xavfsizlikni oshiradi
- U faqat Linux'da ishlaydi
! Ishlab chiqarishda — WSGI server va reverse proxy, debug yo'q.

? ORM ishlatilsa, SQL injection haqida nimani yodda tutish kerak?
- ORM bilan injection umuman mumkin emas
+ ORM so'rovlarni parametrlaydi, lekin “xom SQL” funksiyalari ichida f-string ishlatilsa, zaiflik qaytadi
- ORM injection'ni kuchaytiradi
- ORM faqat NoSQL uchun
! Kod ko'rib chiqishda raw/text/extra funksiyalari tekshiriladi.
:::

:::cards
Qaydnoma v1 funksiyalari? :: Ro'yxatdan o'tish, kirish/chiqish, qaydlar ro'yxati, yaratish, ko'rish, qidiruv (Flask + SQLite).
SECRET_KEY qoidasi? :: Muhitdan o'qiladi, secrets.token_hex bilan yaratiladi; kodda va Git'da hech qachon.
Parol saqlash Flask'da? :: werkzeug generate_password_hash (salt + sekin funksiya), check_password_hash bilan tekshirish.
User enumeration'dan himoya? :: Kirish xatosida bitta umumiy xabar: “Login yoki parol noto'g'ri”.
Parametrlangan so'rov? :: SQL tuzilishi va ma'lumot alohida (? belgilar) — ma'lumot kod sifatida talqin qilinmaydi.
AppSec'ning asosiy tamoyili? :: Kod va ma'lumotni hech qachon aralashtirmang — SQL, HTML, shell uchun bir xil.
ORM va injection? :: ORM avtomatik parametrlaydi; xom SQL funksiyalaridagi f-string — baribir xavfli.
owner_id qayerdan? :: Sessiyadan (joriy foydalanuvchi), hech qachon forma yoki URL'dan.
IDOR himoyasi so'rovda? :: WHERE id = ? AND owner_id = ? — topilmasa 404.
Jinja2 autoescape? :: {{ }} ichidagi qiymatlarni avtomatik HTML-kodlaydi; |safe, Markup, autoescape false — xavf belgilari.
Debug rejimi? :: Faqat lokal; ishlab chiqarishda — WSGI server (gunicorn) va reverse proxy.
Holatni o'zgartiruvchi amallar? :: POST (yoki PUT/DELETE) bilan, GET bilan emas — CSRF himoyasi uchun asos.
:::
