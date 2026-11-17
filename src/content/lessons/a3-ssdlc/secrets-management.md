b4 bosqichidagi bulut loglari darsining boshlanishini eslang: dasturchi kodni GitHub'ga joyladi, kod ichida — unutilgan bulut kaliti. To'rt daqiqadan keyin noma'lum IP shu kalit bilan hisobga kirdi. Bu — o'ylab topilgan stsenariy emas: ommaviy omborlarni sizib chiqqan kalitlar uchun avtomatik skanerlaydigan botlar haqiqatan mavjud.

Kriptografik xatolar darsida (a2) "kalitni kodga yozmang" dedik. Bu dars — "unda qayerga?" degan savolga javob: sirlarni qayerda saqlash, ilovaga qanday yetkazish, sizib chiqqanini qanday topish va sizib chiqqanda nima qilish.

## Sir nima

**Sir** (secret) — kimdir uni bilsa, tizimga kirish yoki ma'lumotni o'qish imkonini beradigan har qanday qiymat:

| Turi | Qaydnoma'da misol |
|---|---|
| Ilova kalitlari | `QAYDNOMA_SECRET_KEY` (sessiya imzosi), `QAYDNOMA_DATA_KEY` (Fernet) |
| Ma'lumotlar bazasi parollari | PostgreSQL ulanish satri |
| Tashqi API kalitlari | To'lov xizmati, pochta xizmati, VirusTotal (b4 bosqichi) |
| Webhook sirlari | `TOLOV_WEBHOOK_SECRET` (a2 bosqichi) |
| Bulut kalitlari | Fayllarni saqlash xizmatiga kirish |
| SSH kalitlari, sertifikat yopiq kalitlari | Serverga joylash, TLS |
| CI/CD tokenlari | GitHub'ga yozish, konteyner registry'ga joylash |

Ularning hammasi uchun qoida bir xil: **kodda emas, Git'da emas, loglarda emas.** Bulut tarmog'idagi [[access-key|access key]]lar va CI tokenlari ayniqsa xavfli — ular odatda keng huquqlarga ega.

## Sirlar qayerdan sizib chiqadi

| Joy | Qanday |
|---|---|
| **Manba kodi** | `API_KEY = "..."` — eng keng tarqalgan |
| **Git tarixi** | Sir o'chirilgan, lekin eski commit'da qolgan — `git log -p` uni ko'rsatadi |
| **Konfiguratsiya fayllari** | `.env`, `config.yml` — `.gitignore` ga qo'shilmagan |
| **Konteyner image'lari** | Dockerfile'dagi `ENV` yoki `COPY .env` — image qatlamlarida qoladi (a4) |
| **CI loglari** | Skript sirni ekranga chiqaradi (`echo $TOKEN`) |
| **Ilova loglari va xato xabarlari** | Ulanish satri parol bilan logga yoziladi; stack trace'da sozlamalar |
| **Frontend kodi va mobil ilovalar** | Brauzer yoki ilova ichidagi kalitni har kim ochadi (a4 bosqichidagi mobil darsi) |
| **Chatlar, tiketlar, wiki** | "Mana parol, tezda tekshirib ko'r" |
| **Skrinshotlar, ekranni ulashish** | Ochiq terminal yoki `.env` fayli |

Frontend haqida alohida: brauzerga yuborilgan **har qanday** narsa — ommaviy. "Faqat bizning JS kodimiz ishlatadi" — kalitni yashirmaydi. Brauzerga faqat **ommaviy** bo'lishi mo'ljallangan kalitlar (masalan, faqat bitta domen uchun cheklangan xarita kaliti) yuborilishi mumkin; qolgan barcha chaqiruvlar backend orqali.

## Sirlarni saqlash darajalari

| Daraja | Qayerda | Qachon mos | Cheklovlari |
|---|---|---|---|
| **1. Muhit o'zgaruvchilari** + `.env` (Git'dan tashqarida) | Server yoki konteyner muhiti | Kichik loyihalar, lokal ishlab chiqish | Kirish nazorati va audit yo'q; jarayon muhitini ko'ra oladiganlar ko'radi; aylantirish qo'lda |
| **2. Platforma sirlari** | CI/CD secrets, Kubernetes Secrets, PaaS sozlamalari | Ko'pchilik loyihalar | Platformaga bog'liq; Kubernetes Secrets standart holatda faqat Base64 (shifrlanmagan) — qo'shimcha sozlash kerak |
| **3. Sirlar ombori** | HashiCorp Vault, AWS Secrets Manager, Azure Key Vault, Google Secret Manager | Jiddiy tizimlar | Murakkablik; lekin: kirish nazorati, audit, aylantirish, qisqa muddatli sirlar |

Sirlar omborining afzalliklari b2–b4 bosqichlarida o'rganganlaringiz bilan bog'liq:

| Imkoniyat | Nega muhim |
|---|---|
| **Kirish nazorati** | Har bir ilova faqat o'z sirlarini oladi (eng kam huquq) |
| **Audit** | Kim, qachon, qaysi sirni o'qidi — SIEM'ga (b2 bosqichi) |
| **Aylantirish** (rotation) | Sirlar muntazam, avtomatik almashtiriladi |
| **Dinamik sirlar** | Ombor har bir ilova uchun **vaqtinchalik** baza foydalanuvchisi yaratadi, muddati tugagach o'chiradi — sizib chiqqan sir tez eskiradi |
| **Markazlashgan bekor qilish** | Insidentda bir joydan barcha sirlarni almashtirish |

### Qaydnoma'da: muhitdan o'qish

```python
import os

def required_env(name: str) -> str:
    value = os.environ.get(name)
    if not value:
        raise RuntimeError(f"{name} o'rnatilmagan")       # fail closed (a2 bosqichi)
    return value

SECRET_KEY = required_env("QAYDNOMA_SECRET_KEY")
DATA_KEY = required_env("QAYDNOMA_DATA_KEY")
```

Lokal ishlab chiqishda `.env` fayli (masalan, `python-dotenv` bilan o'qiladi) — va **`.gitignore` da**. Omborga esa namunaviy fayl:

```bash
# .env.example — Git'da; haqiqiy qiymatlarsiz, faqat nomlar
QAYDNOMA_SECRET_KEY=
QAYDNOMA_DATA_KEY=
TOLOV_WEBHOOK_SECRET=
```

### Sirlar omboridan o'qish (misol)

```python
import hvac   # HashiCorp Vault Python mijozi

client = hvac.Client(url=os.environ["VAULT_ADDR"], token=os.environ["VAULT_TOKEN"])
secret = client.secrets.kv.v2.read_secret_version(path="qaydnoma/prod")
db_password = secret["data"]["data"]["db_password"]
```

Bu yerda qiziq muammo bor: Vault'ga kirish uchun ham sir (`VAULT_TOKEN`) kerak — "birinchi sir" muammosi. Amalda u platformaning **identifikatsiyasi** bilan hal qilinadi: ilova bulutdagi rolini yoki Kubernetes xizmat hisobini ko'rsatib, Vault'dan vaqtinchalik token oladi — statik token umuman kerak bo'lmaydi. b4 bosqichidagi "statik kalitlar o'rniga qisqa muddatli identifikatsiya" tamoyili. CI uchun xuddi shu g'oya — **OIDC** (a4 bosqichi).

### Git'da shifrlangan sirlar

Ba'zan konfiguratsiyani Git'da saqlash qulay (IaC, a4). Buning uchun sirlarni **shifrlangan** holda saqlash vositalari bor — masalan, **SOPS**: fayldagi qiymatlar shifrlanadi (kalitlar bulut KMS'da yoki shaxsiy kalitda), tuzilma esa o'qiladi. Faqat ruxsatli odamlar va tizimlar ochadi.

## Sizib chiqqan sirlarni topish

Curriculum'dagi maqsad: "Repozitoriydan sizib chiqqan sirlarni topa olaman." Vositalar sir **naqshlarini** (ma'lum kalit formatlari) va **entropiyani** (tasodifiy ko'rinadigan uzun satrlar — YARA darsidagi entropiya tushunchasi) qidiradi:

| Vosita | Xususiyati |
|---|---|
| **Gitleaks** | Tez, ochiq kodli; joriy fayllar va **butun Git tarixi**; pre-commit hook |
| **TruffleHog** | Ko'p manbalar (Git, fayllar, bulut); ba'zi kalitlarni **haqiqiyligini tekshiradi** (verified) |
| **GitHub secret scanning** | GitHub'ning o'zida; **push protection** — ma'lum formatdagi kalitli push'ni to'xtatadi |
| detect-secrets | Yangi sirlar qo'shilishining oldini olish uchun asosiy nusxa (baseline) yondashuvi |

```bash
# Gitleaks — butun Git tarixini skanerlash
gitleaks git -v .
# (eski versiyalarda buyruq: gitleaks detect --source . -v — o'z versiyangiz hujjatini tekshiring)

# Gitleaks — Git'siz, oddiy papkani skanerlash
gitleaks dir -v .

# TruffleHog — Git tarixi, faqat haqiqiyligi tasdiqlangan topilmalar
trufflehog git file://. --only-verified

# TruffleHog — fayl tizimi
trufflehog filesystem .
```

`--only-verified` rejimi TruffleHog'ga topilgan kalitni tegishli xizmatda **tekshirib ko'rishga** imkon beradi — bu false positive'larni keskin kamaytiradi. Faqat o'z omboringizda va kompaniya siyosatiga muvofiq ishlating: tekshiruv tashqi xizmatga so'rov yuborishni anglatadi.

### Oldini olish: pre-commit hook

Sirni topishdan ko'ra — uni **commit'ga tushirmaslik** yaxshiroq. `pre-commit` freymvorki bilan har bir commit'dan oldin Gitleaks avtomatik ishlaydi:

```yaml
# .pre-commit-config.yaml
repos:
  - repo: https://github.com/gitleaks/gitleaks
    rev: vX.Y.Z            # joriy versiyani rasmiy sahifadan oling
    hooks:
      - id: gitleaks
```

```bash
pip install pre-commit
pre-commit install          # endi har bir git commit'dan oldin skanerlanadi
```

Va qatlamlar (b2 bosqichidagi defense in depth):

```
 Dasturchi kompyuteri       →   GitHub (push)            →   CI                 →   Muntazam skan
 pre-commit (Gitleaks)          push protection              Gitleaks/TruffleHog     butun tarix, barcha omborlar
```

Har bir qatlam boshqasi o'tkazib yuborganini ushlaydi: pre-commit o'rnatilmagan bo'lishi mumkin, push protection barcha formatlarni bilmaydi.

## Sir sizib chiqsa — nima qilish

Bu — eng muhim bo'lim. Tartib **qat'iy**:

```
 1. BEKOR QILISH VA ALMASHTIRISH  — darhol, birinchi navbatda
        ▼
 2. TA'SIRNI TEKSHIRISH           — sir ishlatilganmi? (loglar)
        ▼
 3. TOZALASH                      — kod, tarix, loglar
        ▼
 4. SABOQ                         — nega sizdi? qanday oldini olish?
```

**1. Bekor qilish va almashtirish — birinchi.** Sir sizib chiqqan zahoti uni **o'zi tegishli xizmatda** bekor qiling va yangisini yarating. Git'dan o'chirish, omborni yashirin qilish yoki tarixni qayta yozish — **himoya emas**: sir allaqachon nusxalangan bo'lishi mumkin (botlar, fork'lar, kesh, kimningdir lokal nusxasi). Faqat bekor qilish sizib chiqqan qiymatni yaroqsiz qiladi.

**2. Ta'sirni tekshirish.** Sir sizib chiqqan paytdan beri u ishlatilganmi? Xizmat loglarini tekshiring — b4 bosqichidagi bulut loglari darsidagi CloudTrail tahlili aynan shu: "kalit birinchi marta qachon va qayerdan ishlatilgan?" Agar ishlatilgan bo'lsa — bu endi **insident** (b3 bosqichidagi IR jarayoni).

**3. Tozalash.** Koddan olib tashlang va to'g'ri saqlash usuliga o'ting. Git tarixidan olib tashlash kerak bo'lsa — maxsus vositalar (`git filter-repo` yoki BFG) bilan, jamoa bilan kelishib (tarix qayta yoziladi, hamma qayta klonlashi kerak). Lekin yana bir bor: bu **1-qadamdan keyin**, uning o'rniga emas.

**4. Saboq.** Nega sizdi? `.gitignore` yo'qmidi? Pre-commit o'rnatilmaganmidi? Sir chatda yuborilganmidi? Jarayonni yaxshilang — b3 bosqichidagi "aybdorni qidirmaslik" tamoyili bilan.

:::key
**Sizib chiqqan sir — bekor qilinguncha sizib chiqqan bo'lib qoladi.** Git tarixini tozalash, faylni o'chirish, omborni yashirin qilish — bularning hech biri sirni "qaytarib olmaydi". To'g'ri tartib: **bekor qilish → ta'sirni tekshirish → tozalash → saboq**. Va eng yaxshi himoya — sirlar umuman sizmaydigan tizim: qisqa muddatli identifikatsiyalar (statik kalitlar o'rniga), sirlar ombori, pre-commit + push protection + CI skanerlari, va maxfiy qiymatlarni hech qachon chatga yozmaslik odati.
:::

## Aylantirish (rotation)

Sirlarni muntazam almashtirish — sizib chiqqan, lekin sezilmagan sirning "yashash vaqtini" cheklaydi.

| Sir turi | Tavsiya |
|---|---|
| Dinamik / qisqa muddatli (bulut rollari, OIDC, Vault dinamik sirlari) | **Eng yaxshi** — aylantirish avtomatik, muddat — daqiqalar yoki soatlar |
| Ma'lumotlar bazasi parollari, API kalitlari | Muntazam (masalan, har chorakda) va har qanday shubhada; avtomatlashtirish |
| Sessiya imzolash kalitlari | Rejalashtirilgan almashtirish (eski kalit bilan imzolangan sessiyalar bekor bo'ladi — buni hisobga oling) |
| Har qanday sir | Xodim ketganda, insidentdan keyin, sizib chiqish shubhasida — **darhol** |

Aylantirishni **mashq qiling**: agar sirni almashtirish "hamma narsani buzadi" va hech kim qanday qilishni bilmasa — insident paytida bu juda qimmatga tushadi (b3 bosqichidagi tayyorgarlik tamoyili).

## Bu dars nimani bermaydi

- **Vault yoki bulut sirlar omborlarini sozlashni batafsil** — rasmiy hujjatlar va Cloud tarmog'i.
- **CI/CD'dagi sirlar va OIDC'ni** — a4 bosqichi.
- **Kalitlarni boshqarish nazariyasini** (KMS, HSM) — Cloud tarmog'i va kriptografiya darslari.

:::try
**1. O'z omboringizni skanerlang.** Qaydnoma omboringizda `gitleaks git -v .` (yoki versiyangizga mos buyruq) va `trufflehog git file://.` ni ishga tushiring. Hech narsa topilmadimi? Endi vaqtincha **soxta** "kalit" (masalan, `API_KEY = "test_" + 40 ta tasodifiy belgi`) bilan commit qiling, qayta skanerlang, keyin commit'ni bekor qiling (`git reset --hard HEAD~1` — faqat push qilinmagan lokal commit uchun!).

**2. pre-commit.** `.pre-commit-config.yaml` ni qo'shing va `pre-commit install` qiling. Soxta kalitni commit qilishga urinib ko'ring — commit to'xtatildimi?

**3. `.env.example`.** Qaydnoma uchun `.env.example` yarating (faqat nomlar), `.env` ni `.gitignore` ga qo'shing va ilova sozlamalarini `required_env()` orqali o'qing.

**4. GitHub himoyalari.** GitHub'dagi omboringizda Secret scanning va Push protection'ni yoqing (ommaviy omborlarda mavjud). Sozlamalarda qayerda ekanini toping.

**5. Insident mashqi.** Stsenariy: Qaydnoma'ning to'lov xizmati API kaliti 3 kun oldin ommaviy omborga commit qilingan va bugun topildi. 4 qadamli tartib bo'yicha nima qilishingizni aniq yozing: har bir qadamda kim, nima, qaysi vosita bilan.

*Yo'nalish (5): 1 — to'lov xizmati panelida kalitni darhol bekor qilish, yangi kalit yaratib sirlar omboriga/muhitga qo'yish va ilovani qayta ishga tushirish; 2 — to'lov xizmati loglarida 3 kun ichida kalit bilan qilingan barcha so'rovlarni tekshirish (noma'lum IP'lar, g'ayrioddiy amallar) — topilsa, IR jarayoni; 3 — koddan olib tashlash, `required_env` ga o'tish, kerak bo'lsa jamoa bilan kelishib tarixni tozalash; 4 — nega sizdi (pre-commit yo'q? `.env` gitignore'da yo'q?) — himoya qatlamlarini qo'shish.*
:::

## Xulosa

- **Sir** — kirish yoki ma'lumot imkonini beradigan har qanday qiymat; **kodda, Git'da, loglarda emas**.
- Sizish joylari: kod, **Git tarixi**, konfiguratsiya fayllari, konteyner image'lari, CI va ilova loglari, **frontend va mobil ilovalar**, chatlar.
- Saqlash darajalari: **muhit + `.env`** (Git'dan tashqarida, `.env.example` bilan) → **platforma sirlari** → **sirlar ombori** (kirish nazorati, audit, aylantirish, dinamik sirlar).
- "Birinchi sir" muammosi — **platforma identifikatsiyasi** va qisqa muddatli tokenlar bilan; Git'da — **SOPS** kabi shifrlash.
- Topish: **Gitleaks, TruffleHog, GitHub secret scanning**; oldini olish: **pre-commit + push protection + CI**.
- Sizib chiqsa: **bekor qilish va almashtirish → ta'sirni tekshirish → tozalash → saboq** — tartib qat'iy.
- **Aylantirish** — muntazam, avtomatik, mashq qilingan; eng yaxshisi — qisqa muddatli sirlar.

:::quiz
? Qaysilar sirlar sizib chiqadigan keng tarqalgan joylar?
+ Git tarixidagi eski commit'lar
+ Brauzerga yuboriladigan frontend kodi va mobil ilova
- Parametrlangan SQL so'rovlari
- Jinja2 shablonlaridagi kodlangan matn
! Brauzer yoki ilovaga yuborilgan har qanday narsa — ommaviy.

? Sir sizib chiqqanda birinchi qadam qaysi?
+ Sirni tegishli xizmatda darhol bekor qilish va almashtirish
- Git tarixidan o'chirish
- Omborni yashirin qilish
- Hech kimga aytmaslik
! Tarixni tozalash sirni “qaytarib olmaydi” — u allaqachon nusxalangan bo'lishi mumkin.

? Nega Git tarixini tozalash yolg'iz o'zi yetarli emas?
+ Sir allaqachon botlar, fork'lar, keshlar yoki lokal nusxalarda nusxalangan bo'lishi mumkin — faqat bekor qilish uni yaroqsiz qiladi
- Git tarixini tozalab bo'lmaydi
- Bu juda uzoq vaqt oladi
- Tarix faqat administratorga ko'rinadi
! Tozalash — bekor qilishdan keyin, uning o'rniga emas.

? .env.example fayli nima uchun kerak?
+ Qaysi sozlamalar kerakligini ko'rsatish — haqiqiy qiymatlarsiz, Git'da saqlanadi
- Haqiqiy parollarni saqlash uchun
- Ilovani tezlashtirish uchun
- Faqat ishlab chiqarish uchun
! Haqiqiy .env esa .gitignore'da bo'ladi.

? Sirlar omborining (masalan, Vault) muhit o'zgaruvchilariga nisbatan afzalliklari qaysilar?
+ Kirish nazorati va kim qachon qaysi sirni o'qiganini audit qilish
+ Avtomatik aylantirish va qisqa muddatli dinamik sirlar
- Sirlarni kodga yozish imkoniyati
- Sirlarni ochiq saqlash
! Shuningdek, insidentda markazlashgan bekor qilish.

? “Birinchi sir” muammosi zamonaviy tizimlarda qanday hal qilinadi?
+ Ilova platforma identifikatsiyasi (bulut roli, Kubernetes xizmat hisobi, CI uchun OIDC) bilan vaqtinchalik token oladi — statik token kerak emas
- Birinchi sirni kodga yozish orqali
- Hamma sirlarni bitta faylga yig'ish orqali
- Bu muammoni hal qilib bo'lmaydi
! Statik kalitlar o'rniga qisqa muddatli identifikatsiya.

? Pre-commit hook'ning vazifasi nima?
+ Sir commit'ga tushishidan oldin uni topib, commit'ni to'xtatish
- Kodni formatlash
- Testlarni o'chirish
- Git tarixini o'chirish
! Topishdan ko'ra oldini olish yaxshiroq.

? Nega pre-commit, push protection va CI skanerlari birga ishlatiladi?
+ Har bir qatlam boshqasi o'tkazib yuborganini ushlaydi — pre-commit o'rnatilmagan bo'lishi, push protection barcha formatlarni bilmasligi mumkin
- Bitta qatlam yetarli emas, chunki ular sekin
- Bu faqat katta kompaniyalar uchun
- Ular bir xil ishni qiladi, bittasi yetarli
! Defense in depth.

? TruffleHog'ning --only-verified rejimi nima qiladi?
+ Topilgan kalitni tegishli xizmatda tekshirib, faqat haqiqiyligi tasdiqlanganlarini ko'rsatadi — false positive kamayadi
- Barcha kalitlarni o'chiradi
- Kalitlarni avtomatik almashtiradi
- Faqat bo'sh fayllarni tekshiradi
! Tekshiruv tashqi xizmatga so'rov yuborishni anglatadi — siyosatga muvofiq ishlating.

? Sirlarni aylantirish (rotation) haqida qaysi gap to'g'ri?
+ U sizib chiqqan, lekin sezilmagan sirning yashash vaqtini cheklaydi; eng yaxshisi — avtomatik qisqa muddatli sirlar
- Sirni hech qachon almashtirmaslik kerak
- Faqat yilda bir marta qo'lda
- Aylantirish xavfsizlikni pasaytiradi
! Aylantirish jarayonini oldindan mashq qilish ham muhim.
:::

:::cards
Sir nima? :: Kirish yoki ma'lumot imkonini beradigan qiymat: ilova kalitlari, baza parollari, API kalitlari, webhook sirlari, bulut kalitlari, SSH kalitlari, CI tokenlari.
Sirlar qayerdan sizadi? :: Kod, Git tarixi, .env va konfiguratsiya fayllari, konteyner image'lari, CI va ilova loglari, frontend/mobil kod, chatlar.
Frontend va sirlar? :: Brauzerga yuborilgan har qanday narsa ommaviy; maxfiy chaqiruvlar faqat backend orqali.
Saqlash darajalari? :: Muhit + .env (Git'dan tashqarida) → platforma sirlari → sirlar ombori (Vault, bulut Secrets Manager).
Sirlar ombori afzalliklari? :: Kirish nazorati, audit, aylantirish, dinamik qisqa muddatli sirlar, markazlashgan bekor qilish.
Birinchi sir muammosi? :: Platforma identifikatsiyasi (bulut roli, Kubernetes, OIDC) bilan vaqtinchalik token olish.
Git'da shifrlangan sirlar? :: SOPS kabi vositalar — qiymatlar shifrlangan, tuzilma o'qiladi.
Sirlarni topish vositalari? :: Gitleaks, TruffleHog (verified), GitHub secret scanning, detect-secrets.
Oldini olish qatlamlari? :: Pre-commit hook (Gitleaks), GitHub push protection, CI skanerlari, muntazam to'liq skan.
Sir sizib chiqsa — tartib? :: Bekor qilish va almashtirish → ta'sirni tekshirish (loglar) → tozalash → saboq.
Nega tarixni tozalash yetarli emas? :: Sir allaqachon nusxalangan bo'lishi mumkin — faqat bekor qilish uni yaroqsiz qiladi.
Aylantirish? :: Muntazam, avtomatik, mashq qilingan; eng yaxshisi — qisqa muddatli sirlar; xodim ketganda va insidentdan keyin darhol.
:::
