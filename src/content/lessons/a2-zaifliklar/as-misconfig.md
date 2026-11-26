Qaydnoma kodi toza: parametrlangan so'rovlar, kodlash, CSRF tokenlari, markazlashgan avtorizatsiya. Kod ko'rib chiqishdan a'lo baho bilan o'tdi. Keyin uni serverga joylashdi:

- `flask run --debug` — "vaqtincha, sozlab olgunimizcha".
- Veb-server papkasida `.git` qoldi — butun manba kodi va tarixi yuklab olinadi.
- Ma'lumotlar bazasi paneli internetga ochiq, standart parol bilan.
- Xato bo'lganda foydalanuvchiga to'liq stack trace ko'rsatiladi — fayl yo'llari, versiyalar, SQL so'rovlar bilan.

Kodda bitta ham zaiflik yo'q. Ilovada — to'rtta. **Xavfsizlik konfiguratsiyasi xatolari** — kod emas, uning **atrofi**: sozlamalar, standart qiymatlar, unutilgan fayllar, ochiq qoldirilgan xizmatlar. Ular OWASP Top 10'da doimiy — 2025-yilgi nashrda esa beshinchidan ikkinchi o'ringa ko'tarildi, chunki ularni yaratish oson va sezish qiyin.

## Eng keng tarqalgan xatolar

| Xato | Misol | Oqibat |
|---|---|---|
| **Debug rejimi ishlab chiqarishda** | Flask/Django `DEBUG=True` | Batafsil xatolar; Flask'da — interaktiv konsol (a1 bosqichi) |
| **Batafsil xato xabarlari** | Stack trace, SQL xatosi foydalanuvchiga | Ichki tuzilish, versiyalar, yo'llar oshkor bo'ladi — hujumchi uchun xarita |
| **Standart parollar va hisoblar** | Admin panel `admin/admin`, baza paneli parolsiz | To'g'ridan-to'g'ri kirish |
| **Keraksiz narsalar ochiq** | Namuna ilovalar, test endpointlari, eski versiyalar, `/phpinfo` kabi sahifalar | Qo'shimcha hujum yuzasi |
| **Maxfiy fayllar veb papkada** | `.git/`, `.env`, `backup.zip`, `db.sqlite3`, `config.yml.bak` | Manba kodi, sirlar, ma'lumotlar bazasi |
| **Katalog ro'yxati** (directory listing) | Veb-server papka ichidagi barcha fayllarni ko'rsatadi | Unutilgan fayllar topiladi |
| **Admin panellar internetga ochiq** | `/admin`, monitoring, baza boshqaruvi | Brute force nishoni |
| **Xavfsizlik sarlavhalari yo'q** | CSP, HSTS, `nosniff` yo'q | a1 bosqichidagi himoyalar ishlamaydi |
| **Ruxsat etuvchi CORS** | Origin'ni ko'r-ko'rona qaytarish | a1 bosqichidagi CORS darsi |
| **Eskirgan dasturiy ta'minot** | Yamalmagan veb-server, freymvork, kutubxonalar | Ma'lum CVE'lar (a3 bosqichidagi SCA darsi) |
| **Bulut sozlamalari** | Ochiq saqlash omborlari, keng huquqli rollar | Cloud tarmog'i, b4 bosqichidagi bulut loglari |
| **Ortiqcha fayl huquqlari** | Konfiguratsiya fayli hamma uchun o'qiladigan | Linux bosqichidagi ruxsatlar darsi |

## Ilova darajasida: Qaydnoma'ni mustahkamlash

### Konfiguratsiya — muhitga qarab

```python
import os

class Config:
    SECRET_KEY = os.environ.get("QAYDNOMA_SECRET_KEY")
    SESSION_COOKIE_SECURE = True
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = "Lax"
    MAX_CONTENT_LENGTH = 2 * 1024 * 1024        # so'rov hajmi chegarasi — 2 MB
    DEBUG = False
    TESTING = False

class DevConfig(Config):
    DEBUG = True
    SESSION_COOKIE_SECURE = False               # lokal HTTP uchun

app.config.from_object(DevConfig if os.environ.get("QAYDNOMA_ENV") == "dev" else Config)

if not app.config["SECRET_KEY"]:
    raise RuntimeError("QAYDNOMA_SECRET_KEY o'rnatilmagan")   # xavfsiz bo'lmagan holatda ishga tushmaslik
```

Uchta muhim tamoyil:

1. **Standart holat — xavfsiz.** Agar muhit o'zgaruvchisi o'rnatilmagan bo'lsa — ishlab chiqarish sozlamalari (`DEBUG=False`), dev sozlamalari emas. Xato bilan "dev" rejimida ishga tushib qolish — keng tarqalgan muammo.
2. **Xavfsiz bo'lmagan holatda — ishga tushmaslik** (fail closed). `SECRET_KEY` yo'qmi? Ilova xato bilan to'xtaydi — "biror standart kalit bilan" ishlamaydi.
3. **Chegaralar**: so'rov hajmi (`MAX_CONTENT_LENGTH`), yuklangan fayllar hajmi, sahifalash — resurslarni band qilishga qarshi (API darsida batafsil).

### Xato sahifalari

```python
@app.errorhandler(404)
def not_found(e):
    return render_template("404.html"), 404

@app.errorhandler(500)
def server_error(e):
    app.logger.exception("Kutilmagan xato")         # tafsilotlar — LOGGA
    return render_template("500.html"), 500          # foydalanuvchiga — umumiy xabar
```

Qoida: **tafsilotlar — logga, foydalanuvchiga — umumiy xabar** (ixtiyoriy ravishda, qo'llab-quvvatlash uchun noyob xato identifikatori bilan). Injection darsidagi "xato xabarlarini yashirish" bilan bir xil g'oya.

### Ishlab chiqarishda ishga tushirish

```bash
# ❌ flask run --debug
# ✅ WSGI server, debug yo'q, reverse proxy ortida
gunicorn --workers 4 --bind 127.0.0.1:8000 "app:app"
```

Gunicorn faqat `127.0.0.1` da tinglaydi — tashqaridan unga to'g'ridan-to'g'ri yetib bo'lmaydi; barcha trafik reverse proxy (nginx) orqali keladi.

## Server darajasida: reverse proxy

nginx sozlamasining xavfsizlik qismi (soddalashtirilgan):

```nginx
server {
    listen 443 ssl;
    server_name qaydnoma.example;

    server_tokens off;                          # versiyani yashirish
    autoindex off;                              # katalog ro'yxati yo'q
    client_max_body_size 2m;                    # so'rov hajmi chegarasi

    # Nuqta bilan boshlanadigan fayllar (.git, .env) — hech qachon berilmaydi
    location ~ /\. {
        deny all;
    }

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

server {
    listen 80;
    server_name qaydnoma.example;
    return 301 https://$host$request_uri;       # HTTP → HTTPS
}
```

Va eng yaxshisi: **`.git`, `.env`, zaxira nusxalar veb papkada umuman bo'lmasin.** Joylashtirish jarayoni faqat kerakli fayllarni ko'chirsin (a4 bosqichidagi CI/CD va konteynerlar). `deny` — ikkinchi qatlam.

Ilova proxy ortida bo'lsa, u haqiqiy mijoz IP'si va protokolni `X-Forwarded-*` sarlavhalaridan bilishi kerak — lekin **faqat ishonchli proxy'dan**. Aks holda hujumchi o'zi `X-Forwarded-For` yuborib, rate limiting yoki IP asosidagi qoidalarni aldaydi. Flask'da buning uchun `ProxyFix` (aniq proxy soni bilan) ishlatiladi.

## Mustahkamlash ro'yxati (hardening checklist)

Curriculum'dagi maqsad: "Ilova va serverni mustahkamlash ro'yxatim bor." Mana boshlang'ich ro'yxat — uni o'z loyihangizga moslang:

```
ILOVA
 □ DEBUG o'chirilgan; standart konfiguratsiya — ishlab chiqarish
 □ SECRET_KEY va boshqa sirlar — muhitdan/sirlar omboridan; yo'q bo'lsa ilova ishga tushmaydi
 □ Xato sahifalari umumiy; tafsilotlar faqat logda
 □ Cookie: Secure, HttpOnly, SameSite
 □ Xavfsizlik sarlavhalari: CSP, HSTS, nosniff, Referrer-Policy, frame-ancestors
 □ CORS — aniq allowlist yoki umuman yo'q
 □ So'rov va fayl hajmi chegaralari
 □ Test, debug va namuna endpointlari ishlab chiqarishda yo'q
 □ Administrator funksiyalari — faqat kerakli tarmoqdan yoki qo'shimcha himoya bilan

SERVER VA PLATFORMA
 □ WSGI server (gunicorn), reverse proxy ortida; ilova faqat localhost'da tinglaydi
 □ HTTPS majburiy, HTTP → HTTPS yo'naltirish, zamonaviy TLS sozlamalari
 □ server_tokens off, autoindex off, nuqtali fayllarga ruxsat yo'q
 □ .git, .env, zaxira nusxalar veb papkada yo'q
 □ Faqat kerakli portlar ochiq (firewall); ma'lumotlar bazasi internetga ochiq emas
 □ Barcha standart parollar almashtirilgan; keraksiz hisoblar o'chirilgan
 □ Ilova eng kam huquqli foydalanuvchi nomidan ishlaydi (root emas)
 □ Operatsion tizim, veb-server, freymvork va kutubxonalar yangilangan

KUZATUV
 □ Loglar markazlashtirilgan (b1–b2 bosqichlari); maxfiy ma'lumotlar loglarda yo'q
 □ Konfiguratsiya o'zgarishlari kuzatiladi (Git, IaC)
```

Bu ro'yxat — a3 bosqichidagi xavfsizlik talablari va a4 bosqichidagi CI/CD tekshiruvlari uchun asos. Ko'p bandlarni avtomatik tekshirish mumkin (DAST, IaC skanerlari).

:::key
**Konfiguratsiya — kodning bir qismi.** Konfiguratsiya xatolarining asosiy sababi — sozlamalar qo'lda, hujjatsiz va har bir serverda boshqacha qilinadi. Yechim: konfiguratsiyani **kod sifatida** saqlash (Git'da, ko'rib chiqiladigan, avtomatik qo'llanadigan — IaC, a4), **xavfsiz standartlar** (o'rnatilmagan narsa — xavfsiz holatda), va **avtomatik tekshiruv** (skanerlar). "Bu serverda kimdir bir paytlar qo'lda o'zgartirgan" — konfiguratsiya xatolarining eng keng tarqalgan ildizi.
:::

## Konfiguratsiya xatolarini topish

| Usul | Nima topadi |
|---|---|
| **Kod va konfiguratsiya ko'rib chiqish** | `DEBUG=True`, kodga yozilgan sirlar, keng CORS (a3) |
| **DAST** (OWASP ZAP) | Sarlavhalar, cookie atributlari, xato sahifalari, ochiq fayllar (a3) |
| **IaC va konteyner skanerlari** | Dockerfile, Terraform, Kubernetes sozlamalaridagi xatolar (a4) |
| **Port skanerlash** (o'z serveringizda) | Keraksiz ochiq xizmatlar — s2 bosqichidagi Nmap |
| **Konfiguratsiya standartlari** | CIS Benchmarks — operatsion tizim, veb-server, bulut uchun batafsil ro'yxatlar |
| **Tashqi tekshiruvlar** | securityheaders.com, Mozilla Observatory, TLS tekshiruv xizmatlari |

## Bu dars nimani bermaydi

- **Har bir server va platformaning to'liq sozlamalarini** — CIS Benchmarks va rasmiy hujjatlar.
- **Bulut konfiguratsiyasini batafsil** — Cloud tarmog'i.
- **Konteyner va IaC xavfsizligini** — a4 bosqichi.

:::try
**1. Konfiguratsiya klassi.** Qaydnoma'ga `Config` / `DevConfig` ni qo'shing. `QAYDNOMA_ENV` o'rnatilmaganda ilova ishlab chiqarish rejimida va `SECRET_KEY` yo'q bo'lsa — xato bilan to'xtashini tekshiring.

**2. Xato sahifalari.** 404 va 500 uchun umumiy sahifalar qo'shing. Ataylab xato chiqaradigan vaqtinchalik endpoint yarating va tekshiring: foydalanuvchi nima ko'radi, logda nima bor? Keyin endpointni o'chiring.

**3. Gunicorn.** Qaydnoma'ni `gunicorn` bilan ishga tushiring (Linux VM'da yoki WSL'da). `--bind 127.0.0.1:8000` bilan boshqa kompyuterdan unga yetib bo'lmasligini tekshiring.

**4. Ro'yxat.** Yuqoridagi mustahkamlash ro'yxatini Qaydnoma uchun to'ldiring: qaysi bandlar bajarilgan, qaysilari yo'q? Natijani README'ga "Hardening" bo'limi sifatida qo'shing.

**5. O'z serveringizni tekshiring.** Laboratoriyadagi Linux VM'da (s3 bosqichi) `sudo ss -tulpn` bilan qaysi xizmatlar tinglayotganini ko'ring. Ularning har biri kerakmi? Keraksizlarini o'chiring.
:::

## Xulosa

- **Konfiguratsiya xatolari** — kod emas, uning atrofi: debug, batafsil xatolar, standart parollar, unutilgan fayllar, ochiq panellar, eskirgan dasturlar, sarlavhalar yo'qligi.
- Ilovada: **xavfsiz standart** (o'rnatilmagan — ishlab chiqarish), **fail closed** (sir yo'q — ishga tushmaydi), hajm chegaralari.
- Xatolar: **tafsilotlar logga, foydalanuvchiga umumiy xabar**.
- Ishlab chiqarish: **WSGI server**, faqat localhost, **reverse proxy** ortida; `ProxyFix` faqat ishonchli proxy uchun.
- nginx: `server_tokens off`, `autoindex off`, nuqtali fayllarni rad etish, HTTPS'ga yo'naltirish; `.git`/`.env` veb papkada **umuman bo'lmasin**.
- **Mustahkamlash ro'yxati** — ilova, server, kuzatuv.
- **Konfiguratsiya — kodning bir qismi**: Git, IaC, avtomatik tekshiruv.

:::quiz
? Xavfsizlik konfiguratsiyasi xatolari haqida qaysi gap to'g'ri?
+ Ular koddan tashqarida — sozlamalar, standart qiymatlar, unutilgan fayllar va ochiq xizmatlarda — kod toza bo'lsa ham bo'lishi mumkin
- Ular faqat kod xatolari
- Ular faqat eski serverlarda bo'ladi
- Ularni faqat antivirus topadi
! Toza kod noto'g'ri sozlangan muhitda ham zaif bo'ladi.

? Foydalanuvchiga to'liq stack trace ko'rsatishning xavfi nima?
+ Ichki tuzilish, fayl yo'llari, versiyalar va so'rovlar oshkor bo'ladi — hujumchi uchun xarita
- Sahifa sekin yuklanadi
- Hech qanday xavf yo'q
- Faqat dizayn buziladi
! Tafsilotlar logga, foydalanuvchiga — umumiy xabar.

? “Xavfsiz standart holat” tamoyili konfiguratsiyada nimani anglatadi?
+ Muhit o'zgaruvchisi o'rnatilmagan bo'lsa, ilova ishlab chiqarish (xavfsiz) sozlamalari bilan ishlaydi, dev sozlamalari bilan emas
- Har doim debug rejimi yoqiq bo'ladi
- Barcha sozlamalar qo'lda kiritiladi
- Standart parollar ishlatiladi
! Xato bilan dev rejimida ishga tushib qolish — keng tarqalgan muammo.

? SECRET_KEY o'rnatilmagan bo'lsa, ilova qanday harakat qilishi kerak?
- Biror standart kalit bilan ishlashi
+ Xato bilan to'xtashi (fail closed)
- Kalitsiz ishlashi
- Kalitni foydalanuvchidan so'rashi
! Xavfsiz bo'lmagan holatda ishga tushmaslik — xavfsiz dizayn.

? Veb papkada .git katalogi qolishining oqibati nima?
+ Butun manba kodi va uning tarixi (ichidagi sirlar bilan) yuklab olinishi mumkin
- Sayt tezroq ishlaydi
- Hech qanday oqibat yo'q
- Faqat Git ishlamay qoladi
! Eng yaxshi himoya — bunday fayllar veb papkaga umuman tushmasligi; deny — ikkinchi qatlam.

? Nega ilova serveri (gunicorn) faqat 127.0.0.1'da tinglashi kerak?
+ Tashqaridan unga to'g'ridan-to'g'ri yetib bo'lmasin — barcha trafik HTTPS, sarlavhalar va cheklovlar sozlangan reverse proxy orqali o'tsin
- Shunda u tezroq ishlaydi
- Bu Flask talabi
- Bu faqat Windows uchun
! Proxy TLS, hajm chegaralari va qo'shimcha himoyalarni ta'minlaydi.

? X-Forwarded-For sarlavhasiga qachon ishonish mumkin?
- Har doim
+ Faqat u ishonchli reverse proxy tomonidan qo'yilgan bo'lsa (masalan, ProxyFix aniq proxy soni bilan)
- Hech qachon
- Faqat mobil ilovalardan kelsa
! Aks holda hujumchi o'zi sarlavha yuborib, IP asosidagi qoidalarni aldaydi.

? Qaysilari konfiguratsiya xatolariga misol?
+ Ma'lumotlar bazasi paneli internetga ochiq va standart parol bilan
+ Ishlab chiqarishda debug rejimi yoqiq
- Parametrlangan SQL so'rovlar
- Jinja2 avtomatik kodlashi
! Ikkinchi ikki band — to'g'ri amaliyotlar.

? Konfiguratsiya xatolarining eng keng tarqalgan ildizi qaysi?
+ Sozlamalarning qo'lda, hujjatsiz va har serverda turlicha qilinishi
- Dasturlash tilining tanlovi
- Foydalanuvchilar soni
- Monitor o'lchami
! Yechim — konfiguratsiyani kod sifatida saqlash va avtomatik tekshirish.

? CIS Benchmarks nima?
+ Operatsion tizimlar, veb-serverlar va bulut uchun batafsil xavfsiz konfiguratsiya standartlari
- Antivirus dasturi
- Dasturlash tili
- Sertifikat turi
! Mustahkamlash ro'yxatlarini tuzishda asosiy manba.
:::

:::cards
Konfiguratsiya xatolari nima? :: Kod atrofidagi xatolar: sozlamalar, standart qiymatlar, unutilgan fayllar, ochiq xizmatlar, eskirgan dasturlar.
Eng keng tarqalgan konfiguratsiya xatolari? :: Debug rejimi, batafsil xatolar, standart parollar, .git/.env veb papkada, katalog ro'yxati, ochiq admin panellar, sarlavhalar yo'qligi.
Xavfsiz standart holat? :: Hech narsa o'rnatilmagan bo'lsa — ishlab chiqarish sozlamalari, dev emas.
Fail closed? :: Muhim sozlama (masalan, SECRET_KEY) yo'q bo'lsa — ilova ishga tushmaydi.
Xato sahifalari qoidasi? :: Tafsilotlar logga, foydalanuvchiga umumiy xabar (ixtiyoriy xato identifikatori bilan).
Ishlab chiqarishda Flask? :: Gunicorn kabi WSGI server, faqat 127.0.0.1, reverse proxy ortida, debug yo'q.
nginx xavfsizlik sozlamalari? :: server_tokens off, autoindex off, client_max_body_size, nuqtali fayllarni rad etish, HTTP → HTTPS.
X-Forwarded-For ishonchi? :: Faqat ishonchli proxy qo'ygan bo'lsa; Flask'da ProxyFix aniq proxy soni bilan.
Mustahkamlash ro'yxati bo'limlari? :: Ilova (debug, sirlar, xatolar, cookie, sarlavhalar, CORS, chegaralar), server (WSGI, TLS, fayllar, portlar, parollar, huquqlar, yangilanishlar), kuzatuv.
Konfiguratsiya — kod? :: Git'da saqlash, ko'rib chiqish, IaC bilan avtomatik qo'llash va skanerlash.
Konfiguratsiya xatolarini topish usullari? :: Kod ko'rib chiqish, DAST, IaC/konteyner skanerlari, port skanerlash (o'z serveringizda), CIS Benchmarks, tashqi tekshiruvlar.
Eng yaxshi himoya .git va .env uchun? :: Ular veb papkaga umuman tushmasligi — joylashtirish faqat kerakli fayllarni ko'chiradi.
:::
