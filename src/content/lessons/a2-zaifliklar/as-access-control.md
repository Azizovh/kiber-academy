OWASP Top 10'ning birinchi o'rnida injection ham, XSS ham emas — **kirish nazoratining buzilishi** (Broken Access Control) turadi. Sababi oddiy: uni skaner deyarli topa olmaydi, freymvork avtomatik hal qilmaydi, va har bir yangi endpoint — uni unutish uchun yangi imkoniyat.

Qaydnoma'da bunga misol a1 bosqichidan beri tanish: `/notes/43` — boshqa foydalanuvchining qaydi. Biz uni `AND owner_id = ?` bilan tuzatgan edik. Lekin endi ilova o'smoqda: qaydlarni ulashish (o'qish yoki tahrirlash huquqi bilan), administrator paneli, API. Har bir endpointga qo'lda `AND owner_id = ?` yozish — ertami-kechmi biri unutiladi.

Bu darsda kirish nazoratini **tasodifiy tekshiruvlar to'plami** emas, balki **loyihalangan tizim** sifatida qurasiz — va uning to'g'ri ishlashini testlar bilan isbotlaysiz.

## Autentifikatsiya va avtorizatsiya — yana bir bor

| | Autentifikatsiya | Avtorizatsiya |
|---|---|---|
| Savol | **Sen kimsan?** | **Senga bu mumkinmi?** |
| Qachon | Bir marta (kirish) | **Har bir so'rovda**, har bir obyekt uchun |
| Xato bo'lsa | Begona odam kiradi | Kirgan odam **ruxsatsiz** narsaga yetadi |
| a1 bosqichi | Login, sessiya, OAuth | — bu dars |

Ko'p ilovalar autentifikatsiyani yaxshi qiladi va shu bilan to'xtaydi: "foydalanuvchi kirgan — demak, hammasi joyida". Kirish nazoratining buzilishi aynan shu yerda boshlanadi.

## Kirish nazorati buzilishi turlari

| Tur | Ma'nosi | Qaydnoma'da misol |
|---|---|---|
| **Gorizontal** (IDOR) | Bir xil darajadagi boshqa foydalanuvchining obyektiga murojaat | `/notes/43` — begona qayd |
| **Vertikal** | Yuqori darajadagi funksiyaga murojaat | Oddiy foydalanuvchi `/admin/users` ni ochadi |
| **Funksiya darajasida** | Endpoint himoyalanmagan, chunki "UI'da ko'rinmaydi" | `POST /api/users/7/role` — tugma faqat adminda, lekin endpoint hammaga ochiq |
| **Kontekstga bog'liq** | Holat yoki ketma-ketlik tekshirilmaydi | Arxivlangan qaydni tahrirlash; to'lanmagan buyurtmani yuborish (biznes mantiq darsi) |
| **Metadata manipulyatsiyasi** | Foydalanuvchi o'zining roli yoki ID'sini o'zgartiradi | Sessiya ichidagi, JWT'dagi yoki so'rovdagi `role=admin` ga ishonish |

### IDOR'ning ildizi

**IDOR** (Insecure Direct Object Reference) — eng keng tarqalgan tur. Uning ildizi: obyekt **identifikatori** foydalanuvchiga ochiq (URL, JSON), va server "bu obyekt shu foydalanuvchiga tegishlimi?" deb so'ramaydi.

Keng tarqalgan noto'g'ri "himoyalar":

| Noto'g'ri fikr | Haqiqat |
|---|---|
| "ID'lar UUID — taxmin qilib bo'lmaydi" | UUID ID'larni sanab chiqishni qiyinlashtiradi, lekin ular loglarda, URL'larda, ulashilgan havolalarda, API javoblarida **sizadi**. Taxmin qilib bo'lmaslik — avtorizatsiya emas |
| "Tugma UI'da ko'rinmaydi" | So'rovni to'g'ridan-to'g'ri yuborish mumkin (a1 bosqichi) |
| "Frontend ID'ni o'zgartirmaydi" | Foydalanuvchi so'rovni istalgancha o'zgartiradi |
| "Faqat kirgan foydalanuvchilar" | Kirgan foydalanuvchi — hali ruxsat etilgan foydalanuvchi emas |

## Kirish nazorati modellari

| Model | G'oya | Misol |
|---|---|---|
| **RBAC** — rolga asoslangan | Huquqlar rollarga beriladi; foydalanuvchi rolga ega | `admin`, `user` |
| **ABAC** — atributga asoslangan | Qaror atributlar asosida: foydalanuvchi, obyekt, harakat, kontekst | "Bo'lim boshlig'i o'z bo'limi hujjatlarini ish vaqtida tahrirlay oladi" |
| **ReBAC** — munosabatga asoslangan | Qaror foydalanuvchi va obyekt o'rtasidagi munosabatga qarab | "Qaydni egasi va u ulashgan odamlar ko'radi" |

Xavfsizlik bosqichida [[rbac|RBAC]] bilan tanishgansiz. Amalda ko'pincha aralash: Qaydnoma'da **RBAC** (administrator funksiyalari uchun) + **ReBAC** (qaydlar: egasi, o'qish huquqi, tahrirlash huquqi).

## Qaydnoma'da kirish nazoratini loyihalash

### 1. Ruxsatlar matritsasi

Kod yozishdan oldin — jadval. Kim, nima bilan, nima qila oladi?

| Harakat | Egasi | "Tahrirlash" huquqi bilan ulashilgan | "O'qish" huquqi bilan ulashilgan | Boshqa foydalanuvchi | Administrator | Kirmagan |
|---|---|---|---|---|---|---|
| Qaydni o'qish | ✓ | ✓ | ✓ | ✗ | ✗ | ✗ |
| Qaydni tahrirlash | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ |
| Qaydni o'chirish | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ |
| Qaydni ulashish | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ |
| Foydalanuvchilarni boshqarish | ✗ | ✗ | ✗ | ✗ | ✓ | ✗ |

E'tibor bering: **administrator boshqalarning qaydlarini o'qiy olmaydi.** Bu ataylab qilingan qaror — eng kam huquq tamoyili va maxfiylik. Administratorga foydalanuvchilarni boshqarish kerak, ularning shaxsiy yozuvlari emas. "Admin hamma narsani ko'radi" — standart emas, ongli tanlov bo'lishi kerak.

Bu matritsa — keyinchalik **testlar** uchun ham asos.

### 2. Ma'lumotlar modeli

```sql
CREATE TABLE shares (
    note_id     INTEGER NOT NULL REFERENCES notes(id),
    user_id     INTEGER NOT NULL REFERENCES users(id),
    permission  TEXT    NOT NULL CHECK (permission IN ('read', 'edit')),
    PRIMARY KEY (note_id, user_id)
);
```

### 3. Markazlashgan qaror funksiyasi

Asosiy g'oya: **ruxsat haqidagi qaror bitta joyda qabul qilinadi.** Har bir endpoint o'z tekshiruvini qo'lda yozmaydi — u markaziy funksiyani chaqiradi.

```python
from enum import Enum

class Action(Enum):
    READ = "read"
    EDIT = "edit"
    DELETE = "delete"
    SHARE = "share"

def can(user_id: int | None, action: Action, note) -> bool:
    """Qaydnoma'dagi qaydlar uchun yagona ruxsat qoidasi. Standart javob — YO'Q."""
    if user_id is None or note is None:
        return False
    if note["owner_id"] == user_id:
        return True                                   # egasi — hamma narsa
    share = get_db().execute(
        "SELECT permission FROM shares WHERE note_id = ? AND user_id = ?",
        (note["id"], user_id),
    ).fetchone()
    if share is None:
        return False
    if action is Action.READ:
        return share["permission"] in ("read", "edit")
    if action is Action.EDIT:
        return share["permission"] == "edit"
    return False                                      # DELETE, SHARE — faqat egasi


def load_note(note_id: int, action: Action):
    """Qaydni yuklaydi va ruxsatni tekshiradi; ruxsat bo'lmasa — 404."""
    note = get_db().execute(
        "SELECT id, owner_id, title, body FROM notes WHERE id = ?", (note_id,)
    ).fetchone()
    if not can(session.get("user_id"), action, note):
        abort(404)
    return note
```

Endpointlar endi oddiy va bir xil:

```python
@app.route("/notes/<int:note_id>")
@login_required
def note_view(note_id):
    note = load_note(note_id, Action.READ)
    return render_template("note.html", note=note)


@app.route("/notes/<int:note_id>/edit", methods=["POST"])
@login_required
def note_edit(note_id):
    note = load_note(note_id, Action.EDIT)
    ...


@app.route("/notes/<int:note_id>/delete", methods=["POST"])
@login_required
def note_delete(note_id):
    note = load_note(note_id, Action.DELETE)
    ...
```

Bu dizaynning afzalliklari:

| Afzallik | Nega muhim |
|---|---|
| **Standart — rad etish** (deny by default) | `can()` oxirida `return False` — yangi harakat qo'shilsa va unutilsa, u **yopiq** bo'lib qoladi, ochiq emas |
| **Bitta joy** | Qoida o'zgarsa — bitta funksiya o'zgaradi; kod ko'rib chiqishda bitta funksiya tekshiriladi |
| **Har bir endpoint bir xil naqshda** | `load_note(..., Action.X)` yo'q endpoint — kod ko'rib chiqishda darhol ko'zga tashlanadi |
| **Testlash oson** | `can()` ni alohida, barcha holatlar uchun sinash mumkin |

### 4. Vertikal kirish nazorati

Administrator funksiyalari uchun — alohida dekorator:

```python
def admin_required(view):
    @wraps(view)
    def wrapped(*args, **kwargs):
        user = get_db().execute(
            "SELECT role FROM users WHERE id = ?", (session.get("user_id"),)
        ).fetchone()
        if user is None or user["role"] != "admin":
            abort(404)
        return view(*args, **kwargs)
    return wrapped


@app.route("/admin/users")
@login_required
@admin_required
def admin_users():
    ...
```

Rol **har so'rovda bazadan** o'qiladi, sessiya yoki tokendagi nusxadan emas. Agar rol sessiyaga bir marta yozilsa va keyin administrator huquqi olib tashlansa — eski sessiya hali ham "admin" bo'lib qoladi. (JWT'da bu muammo yanada keskin — a1 bosqichidagi bekor qilish muammosi.)

## Ro'yxatlar va qidiruv — unutiladigan joy

Bitta obyektni ko'rsatish to'g'ri himoyalangan bo'lishi mumkin, lekin **ro'yxatlar**, **qidiruv**, **eksport** va **statistika** endpointlari ko'pincha unutiladi:

```python
# ❌ Qidiruv barcha qaydlar ichida — natijada begona qaydlar sarlavhalari
db.execute("SELECT id, title FROM notes WHERE title LIKE ?", (f"%{q}%",))

# ✅ Faqat foydalanuvchi ko'ra oladigan qaydlar ichida
db.execute(
    """SELECT n.id, n.title FROM notes n
       LEFT JOIN shares s ON s.note_id = n.id AND s.user_id = ?
       WHERE (n.owner_id = ? OR s.user_id IS NOT NULL) AND n.title LIKE ?""",
    (uid, uid, f"%{q}%"),
)
```

Xuddi shunday: fayl yuklab olish (`/attachments/<id>`), eksport (`/export`), "so'nggi faollik", API'dagi `?include=` kabi kengaytirishlar — har birida ruxsat filtri bo'lishi kerak.

:::key
**Kirish nazorati — loyiha qarori, keyinroq qo'shiladigan "patch" emas.** Uchta tamoyil: (1) **standart — rad etish**: aniq ruxsat berilmagan narsa taqiqlangan; (2) **markazlashgan qaror**: bitta funksiya yoki siyosat qatlami, har bir endpointda qo'lda yozilgan shartlar emas; (3) **har bir so'rovda serverda**: UI, ID'larning taxmin qilib bo'lmasligi yoki sessiyadagi eski rol — himoya emas. Va bularning hammasi **testlar** bilan isbotlanadi — chunki kirish nazorati xatolarini avtomatik skanerlar deyarli topmaydi.
:::

## Testlar bilan isbotlash

Curriculum'dagi maqsad: "Har bir endpointda ruxsat tekshirilishini test bilan isbotlayman." Ruxsatlar matritsasi to'g'ridan-to'g'ri testga aylanadi (pytest va Flask test mijozi; fixture'larni shu bosqichning oxirgi darsida to'liq quramiz):

```python
import pytest

# (kim, metod, URL, kutilgan holat kodi) — matritsadan
CASES = [
    ("owner",  "GET",  "/notes/1",        200),
    ("editor", "GET",  "/notes/1",        200),
    ("reader", "GET",  "/notes/1",        200),
    ("other",  "GET",  "/notes/1",        404),
    ("admin",  "GET",  "/notes/1",        404),
    ("reader", "POST", "/notes/1/edit",   404),
    ("editor", "POST", "/notes/1/delete", 404),
    ("other",  "GET",  "/admin/users",    404),
    ("admin",  "GET",  "/admin/users",    200),
    ("anon",   "GET",  "/notes/1",        302),   # login sahifasiga
]

@pytest.mark.parametrize("who,method,url,expected", CASES)
def test_access_matrix(client_as, who, method, url, expected):
    client = client_as(who)
    resp = client.open(url, method=method)
    assert resp.status_code == expected
```

Har bir yangi endpoint qo'shilganda — matritsaga yangi qatorlar. Agar kimdir `load_note` ni unutsa — test darhol qizil bo'ladi. Bu — kirish nazoratini **regressiyadan** himoya qilishning eng ishonchli yo'li.

## Kodda kirish nazorati xatolarini topish

Kod ko'rib chiqishda (a3):

- Barcha marshrutlar ro'yxati — har biri uchun: autentifikatsiya bormi? avtorizatsiya bormi?
- Obyekt ID'si so'rovdan olinadigan har bir joy — undan keyin ruxsat tekshiruvi bormi?
- Ro'yxat, qidiruv, eksport, fayl yuklab olish — ruxsat filtri bormi?
- Rol yoki foydalanuvchi ID'si qayerdan olinadi — sessiya/bazadan yoki so'rovdan?
- Ruxsat tekshiruvi bitta joydami yoki tarqoq?

Dinamik sinashda: ikki foydalanuvchi hisobi bilan har bir so'rovni takrorlash — birinchisining so'rovini ikkinchisining sessiyasi bilan yuborish. Bu qo'lda zerikarli; Burp Suite kabi vositalarda buni avtomatlashtiradigan kengaytmalar bor. Albatta — faqat o'z ilovangiz yoki ruxsat etilgan nishonlarda.

## Bu dars nimani bermaydi

- **Murakkab siyosat dvigatellarini** — katta tizimlarda OPA (Open Policy Agent), Cedar kabi vositalar ishlatiladi; tamoyillar bir xil.
- **Multi-tenant arxitekturani batafsil** — ko'p mijozli SaaS'da har bir so'rov tenant bo'yicha ham filtrlanadi; bu xuddi shu g'oyaning yana bir qatlami.
- **API'ga xos tafsilotlarni** — BOLA va mass assignment shu bosqichdagi API xavfsizligi darsida.

:::try
**1. Matritsa.** Qaydnoma uchun yuqoridagi ruxsatlar matritsasini o'z so'zlaringiz bilan qayta yozing va yana ikkita harakat qo'shing: "qaydni arxivlash" va "ulashishni bekor qilish". Ularga kim haqli?

**2. Ulashishni joriy eting.** `shares` jadvalini, `can()` va `load_note()` funksiyalarini qo'shing. Barcha qayd endpointlarini `load_note` orqali o'tkazing.

**3. Qidiruvni tuzating.** Qidiruv va ro'yxat endpointlari foydalanuvchiga ulashilgan qaydlarni ham ko'rsatsin, lekin boshqalarnikini — yo'q.

**4. Administrator.** `/admin/users` sahifasini `admin_required` bilan qo'shing. Rol sessiyadan emas, bazadan o'qilishini tekshiring: administrator rolini bazadan olib tashlang — ochiq sessiyada sahifa darhol yopiladimi?

**5. Testlar.** Matritsa asosidagi parametrlangan testni yozing (fixture'lar uchun shu bosqichning oxirgi darsiga qarang yoki o'zingiz soddalashtirilgan versiyasini yozing).

**6. PortSwigger Academy.** Access control bo'limidagi nazariy qism va dastlabki laboratoriyalar.

*Javob (1): taxminan — arxivlash: egasi (ehtimol, "tahrirlash" huquqli ham — bu biznes qaror, uni aniq yozing); ulashishni bekor qilish: egasi, va ulashilgan foydalanuvchi o'zini ro'yxatdan chiqara oladi. Muhimi — har bir qaror matritsada aniq yozilgan bo'lsin.*
:::

## Xulosa

- **Broken Access Control** — OWASP Top 10'ning birinchi o'rni; skanerlar deyarli topmaydi.
- **Autentifikatsiya** — kimsan; **avtorizatsiya** — har so'rovda, har obyekt uchun: bunga haqlimisan.
- Turlari: **gorizontal (IDOR)**, **vertikal**, **funksiya darajasida**, kontekstga bog'liq, metadata manipulyatsiyasi.
- UUID, yashirin tugma, "faqat kirganlar" — **avtorizatsiya emas**.
- Modellar: **RBAC**, **ABAC**, **ReBAC** — ko'pincha aralash.
- Loyihalash: **ruxsatlar matritsasi** → **markazlashgan `can()`** → **standart — rad etish** → har bir endpoint `load_note(..., Action)`.
- Rol **har so'rovda bazadan**; ro'yxat, qidiruv, eksport — ham filtrlanadi.
- Matritsa → **parametrlangan testlar** — regressiyadan himoya.

:::quiz
? Nega Broken Access Control OWASP Top 10'ning birinchi o'rnida?
+ U juda keng tarqalgan, avtomatik skanerlar uni deyarli topa olmaydi va har bir yangi endpointda unutilishi mumkin
- U eng yangi zaiflik
- U faqat eski ilovalarda bo'ladi
- U faqat mobil ilovalarda uchraydi
! Freymvork avtorizatsiyani avtomatik hal qilmaydi — bu biznes mantiqqa bog'liq.

? Oddiy foydalanuvchi /admin/users sahifasini ochdi. Bu qaysi turdagi buzilish?
- Gorizontal (IDOR)
+ Vertikal — yuqori darajadagi funksiyaga murojaat
- Injection
- XSS
! Gorizontal — bir xil darajadagi boshqa foydalanuvchining obyekti.

? Qaydlar ID'si UUID qilib o'zgartirildi. Bu IDOR'ni tuzatadimi?
- Ha, to'liq
+ Yo'q — UUID sanashni qiyinlashtiradi, lekin ID'lar sizadi; har bir so'rovda ruxsat tekshiruvi baribir kerak
- Ha, agar HTTPS bo'lsa
- UUID IDOR'ni kuchaytiradi
! Taxmin qilib bo'lmaslik — avtorizatsiya emas.

? Markazlashgan can() funksiyasi oxiridagi return False nima uchun muhim?
+ Standart javob — rad etish: yangi yoki unutilgan harakat avtomatik yopiq bo'ladi
- U funksiyani tezlashtiradi
- U faqat test uchun
- U ahamiyatsiz
! Deny by default — kirish nazoratining asosiy tamoyili.

? Foydalanuvchi roli qayerdan o'qilishi kerak?
- So'rovdagi role parametridan
- Bir marta sessiyaga yozilgan nusxadan, abadiy
+ Har so'rovda bazadan (yoki ishonchli, tez bekor qilinadigan manbadan)
- Cookie'dagi ochiq qiymatdan
! Aks holda huquq olib tashlangandan keyin ham eski sessiya admin bo'lib qoladi.

? Qaysi endpoint'lar kirish nazoratida ko'pincha unutiladi?
+ Qidiruv, ro'yxatlar va eksport
+ Fayl yuklab olish va statistika
- Faqat login sahifasi
- Faqat bosh sahifa
! Bitta obyekt to'g'ri himoyalangan bo'lsa ham, ro'yxatlar begona ma'lumotni ko'rsatishi mumkin.

? Ruxsatlar matritsasidan qanday foydalanish eng samarali?
+ Uni kod yozishdan oldin tuzib, keyin parametrlangan avtomatik testlarga aylantirish
- Uni faqat hujjatda saqlash
- Uni foydalanuvchilarga ko'rsatish
- Undan foydalanmaslik
! Har yangi endpoint matritsaga qo'shiladi va test regressiyani ushlaydi.

? Qaydnoma dizaynida administrator boshqalarning qaydlarini o'qiy olmaydi. Bu qaror nimaga asoslangan?
+ Eng kam huquq tamoyili va maxfiylik — administratorga foydalanuvchilarni boshqarish kerak, ularning shaxsiy yozuvlari emas
- Bu xato — admin hamma narsani ko'rishi kerak
- Bu faqat tezlik uchun
- Bu tasodif
! “Admin hamma narsani ko'radi” — standart emas, ongli tanlov bo'lishi kerak.

? Qaysi model “qaydni egasi va u ulashgan odamlar ko'radi” qoidasini eng tabiiy ifodalaydi?
- RBAC
- Faqat ACL'siz
+ ReBAC — munosabatga asoslangan
- Hech qaysi
! Ruxsat foydalanuvchi va obyekt o'rtasidagi munosabatga bog'liq.

? Dinamik sinashda IDOR'ni topishning oddiy usuli qaysi?
+ Ikki foydalanuvchi hisobi bilan birinchisining so'rovlarini ikkinchisining sessiyasi bilan takrorlash (faqat o'z yoki ruxsat etilgan ilovada)
- Faqat bosh sahifani ochish
- Faqat parolni o'zgartirish
- Brauzerni yangilash
! Burp Suite kabi vositalardagi kengaytmalar buni avtomatlashtiradi.
:::

:::cards
Autentifikatsiya va avtorizatsiya? :: Autentifikatsiya — kimsan (bir marta); avtorizatsiya — bunga haqlimisan (har so'rovda, har obyekt uchun).
Kirish nazorati buzilishi turlari? :: Gorizontal (IDOR), vertikal, funksiya darajasida, kontekstga bog'liq, metadata manipulyatsiyasi.
IDOR ildizi? :: Obyekt ID'si foydalanuvchiga ochiq va server egalik yoki ruxsatni tekshirmaydi.
Noto'g'ri IDOR “himoyalari”? :: UUID, yashirin UI tugmalari, frontend'ga ishonish, “faqat kirganlar”.
RBAC, ABAC, ReBAC? :: Rolga, atributlarga, munosabatga asoslangan modellar; amalda ko'pincha aralash.
Ruxsatlar matritsasi? :: Kim (rol/munosabat) × harakat jadvali — kod va testlar uchun asos.
Kirish nazoratining uch tamoyili? :: Standart — rad etish; markazlashgan qaror; har so'rovda serverda.
Markazlashgan qaror naqshi? :: can(user, action, obj) + load_obj(id, action) — topilmasa yoki ruxsat bo'lmasa 404.
Vertikal himoya? :: admin_required dekoratori; rol har so'rovda bazadan o'qiladi.
Unutiladigan joylar? :: Ro'yxatlar, qidiruv, eksport, fayl yuklab olish, statistika, API kengaytirishlari.
Kirish nazoratini testlash? :: Matritsadan parametrlangan testlar: (kim, metod, URL, kutilgan kod).
Kod ko'rib chiqishda savollar? :: Har marshrutda autentifikatsiya va avtorizatsiya bormi; ID'dan keyin tekshiruv bormi; rol qayerdan; tekshiruv bitta joydami.
:::
