Qaydnoma'da pullik "Pro" tarif paydo bo'ldi: bepul foydalanuvchilarga 50 ta qayd, Pro — cheksiz. Promo-kodlar ham bor: `YANGI2026` — bir oy bepul Pro, har bir foydalanuvchiga bir marta.

Bir hafta o'tib ma'lum bo'ldi:
- Kimdir bitta promo-kodni **yuz marta** ishlatgan — u tugmani bir vaqtning o'zida ko'p marta bosgan.
- Kimdir bepul tarifda 3 000 ta qayd yaratgan — limit faqat "Qayd yaratish" formasida tekshirilgan, API'da emas.
- To'lov sahifasida narx yashirin maydonda yuborilgan — kimdir uni `0` ga o'zgartirgan.

Hech qanday injection, XSS yoki IDOR yo'q. Har bir so'rov — texnik jihatdan to'g'ri. Skaner hech narsa topmaydi. Lekin ilova **mantiqi** buzilgan: u foydalanuvchi qiladi deb kutilmagan narsani qilishiga ruxsat bergan.

Bu — **biznes mantiq zaifliklari**. Ularni topish uchun texnik bilim emas, **hujumchi kabi fikrlash** kerak: "Ilova menga nimani qilishga ruxsat beradi — va qaysi qoidani buzsam, kimdir pul yoki ma'lumot yo'qotadi?"

## Nega skanerlar topa olmaydi

| Texnik zaiflik (XSS, injection) | Biznes mantiq zaifligi |
|---|---|
| Naqsh bor: xavfli funksiya, xavfli belgi | Har bir ilovada o'ziga xos — umumiy naqsh yo'q |
| Skaner "bu javob noto'g'ri" deb aniqlay oladi | Javob texnik jihatdan to'g'ri — faqat **biznes nuqtai nazaridan** noto'g'ri |
| Kodning bir joyida | Ko'pincha **oqim** bo'ylab — bir nechta so'rov, ketma-ketlik, vaqt |
| Freymvork ko'pincha himoya qiladi | Freymvork sizning biznes qoidalaringizni bilmaydi |

Shuning uchun biznes mantiq — AppSec muhandisi va pentesterning **qo'lda** tekshiradigan asosiy sohasi.

## Asosiy turlar

### 1. Mijozga ishonish

Mijoz tomonidan yuborilgan har qanday qiymat — o'zgartirilishi mumkin (a1 bosqichidagi ishonch chegarasi). Biznes kontekstida eng xavflisi — **pul va miqdor**:

```python
# ❌ Narx formadan keladi
price = float(request.form["price"])
charge(user, price)

# ✅ Narx serverda, tarif identifikatoridan aniqlanadi
PLANS = {"pro_month": 49_000, "pro_year": 490_000}     # so'mda, serverda
plan = request.form.get("plan")
if plan not in PLANS:
    abort(400)
charge(user, PLANS[plan])
```

| Mijozdan kelsa — xavfli | Server qanday aniqlashi kerak |
|---|---|
| Narx, chegirma, umumiy summa | Mahsulot/tarif ID'sidan, serverdagi narxlar jadvalidan |
| Foydalanuvchi ID'si, rol, tarif | Sessiyadan va bazadan |
| "To'lov muvaffaqiyatli" belgisi | To'lov xizmatining **imzolangan webhook'i** yoki to'g'ridan-to'g'ri API so'rovi (kriptografik xatolar darsi) |
| Miqdor | Tekshirish: musbat butun son, maksimal chegara |

### 2. Kutilmagan qiymatlar

Dasturchi "foydalanuvchi oddiy qiymat kiritadi" deb o'ylaydi. Hujumchi esa chegaraviy holatlarni sinaydi:

| Qiymat | Mumkin bo'lgan oqibat |
|---|---|
| **Manfiy son** (`quantity = -5`) | Umumiy summa kamayadi yoki balans oshadi |
| **Nol** | Bepul xarid, nolga bo'lish xatosi |
| **Juda katta son** | To'lib ketish (overflow), resurslarni band qilish |
| **Kasr son** (`0.0001`) | Yaxlitlash xatolari — ko'p takrorlanganda pul "paydo bo'ladi" |
| **Bo'sh, `null`, yo'q maydon** | Tekshiruv o'tkazib yuboriladi |
| **Boshqa tur** (son o'rniga satr yoki ro'yxat) | Kutilmagan xatti-harakat (injection darsidagi NoSQL misoli) |

Himoya — server tomonda **qat'iy tekshiruv** (API darsidagi sxemalar): tur, oraliq, majburiy maydonlar. Pul bilan ishlashda — `float` emas, butun sonlar (tiyin, so'm) yoki `Decimal`.

### 3. Oqimni chetlab o'tish (workflow bypass)

Ko'p bosqichli jarayonlar: ro'yxatdan o'tish → email tasdiqlash → profil; savatcha → to'lov → tasdiqlash. Hujumchi to'g'ridan-to'g'ri **oxirgi bosqich**ga so'rov yuboradi:

```python
# ❌ "Tasdiqlash" sahifasi faqat to'lov sahifasidan keyin ko'rsatiladi — deb o'ylangan
@app.route("/upgrade/confirm", methods=["POST"])
@login_required
def upgrade_confirm():
    set_plan(session["user_id"], "pro")

# ✅ Holat serverda: to'lov haqiqatan tasdiqlanganmi?
@app.route("/upgrade/confirm", methods=["POST"])
@login_required
def upgrade_confirm():
    payment = get_payment(request.form.get("payment_id"), user_id=session["user_id"])
    if payment is None or payment["status"] != "paid" or payment["used"]:
        abort(400)
    activate_pro(session["user_id"], payment["id"])
```

Qoida: har bir bosqich **oldingi bosqichlar haqiqatan bajarilganini serverda tekshiradi**. "Foydalanuvchi bu sahifaga faqat tugma orqali keladi" — taxmin, tekshiruv emas.

### 4. Limitlar va kvotalar faqat bir joyda

Dars boshidagi "50 ta qayd" limiti faqat forma endpointida tekshirilgan, API'da emas. Xuddi shunday: import funksiyasi, nusxa ko'chirish, "andozadan yaratish" — har biri yangi qayd yaratadi.

Himoya — limitni **bitta joyda**, yaratish yo'lining o'zida tekshirish (kirish nazorati darsidagi markazlashtirish g'oyasi):

```python
def create_note(owner_id: int, title: str, body: str) -> int:
    """Qayd yaratishning YAGONA yo'li — forma, API, import shu funksiyani chaqiradi."""
    if not is_pro(owner_id) and count_notes(owner_id) >= FREE_NOTE_LIMIT:
        raise QuotaExceeded()
    ...
```

### 5. Poyga holati (race condition)

Eng nozik tur. Promo-kod kodi:

```python
# ❌ Tekshirish va yangilash — ikki alohida qadam
promo = db.execute("SELECT id, used FROM promos WHERE code = ?", (code,)).fetchone()
if promo is None or promo["used"]:
    abort(400)
activate_pro(uid)                                         # ← shu oraliqda boshqa so'rov ham tekshiruvdan o'tadi
db.execute("UPDATE promos SET used = 1 WHERE id = ?", (promo["id"],))
db.commit()
```

Agar 20 ta so'rov **bir vaqtda** kelsa, ularning hammasi `used = 0` ni ko'radi (hali hech kim yangilamagan) — va hammasi Pro'ni faollashtiradi. Bu — **TOCTOU** (time-of-check to time-of-use): tekshirish vaqti va ishlatish vaqti orasidagi bo'shliq.

```python
# ✅ Tekshirish va yangilash — bitta atomik amal
cur = db.execute(
    "UPDATE promos SET used = 1, used_by = ? WHERE code = ? AND used = 0",
    (uid, code),
)
if cur.rowcount != 1:            # boshqa so'rov allaqachon ishlatgan yoki kod yo'q
    db.rollback()
    abort(400)
activate_pro(uid)
db.commit()
```

Baza `UPDATE ... WHERE used = 0` ni atomik bajaradi: faqat **bitta** so'rov qatorni o'zgartiradi, qolganlari `rowcount == 0` oladi.

Poyga holatlariga qarshi vositalar:

| Vosita | Qachon |
|---|---|
| **Atomik shartli yangilash** (`UPDATE ... WHERE holat = eski`) | Oddiy hisoblagichlar, "bir martalik" bayroqlar |
| **Noyoblik cheklovi** (`UNIQUE (promo_id, user_id)`) | "Har foydalanuvchiga bir marta" — baza ikkinchisini rad etadi |
| **Tranzaksiyalar va qulflash** (`SELECT ... FOR UPDATE` PostgreSQL'da) | Murakkab ko'p qadamli o'zgarishlar |
| **Idempotentlik kalitlari** | To'lov kabi amallar: bir xil kalit bilan takroriy so'rov — bir marta bajariladi |

Poyga holatlari bank o'tkazmalari, sovg'a kartalari, ovoz berish, chegirmalar, "oxirgi mahsulot" kabi joylarda haqiqiy zararga olib kelgan.

### 6. Funksiyalarni suiiste'mol qilish

Ba'zan har bir so'rov o'zi to'g'ri, lekin **miqyos** muammo:

| Funksiya | Suiiste'mol |
|---|---|
| "Do'stni taklif qilish — ikkalangizga bonus" | Soxta hisoblar yaratib, cheksiz bonus |
| Parolni tiklash / SMS kod yuborish | Kimningdir telefoniga minglab SMS (va sizning to'lovingiz) |
| Ochiq qidiruv yoki eksport | Butun bazani "qirib olish" (scraping) |
| Bepul sinov davri | Har safar yangi email bilan qayta ro'yxatdan o'tish |

Himoya — biznes amallariga **rate limiting** (API darsi), qo'shimcha tekshiruvlar (telefon/email tasdiqlash), anomaliyalarni kuzatish (b1–b2 bosqichlari: g'ayrioddiy faollik — SIEM qoidasi).

:::key
**Biznes mantiq zaifliklarini topish — "suiiste'mol stsenariylari"ni o'ylash.** Har bir funksiya uchun "foydalanish stsenariysi" bilan birga **"suiiste'mol stsenariysi"** yozing: "Foydalanuvchi promo-kodni ishlatadi" → "Foydalanuvchi promo-kodni bir vaqtda 50 marta ishlatadi", "boshqa birovning kodini ishlatadi", "muddati o'tgan kodni ishlatadi". Savollar doim bir xil: **qiymatni o'zgartirsam? bosqichni o'tkazib yuborsam? ko'p marta takrorlasam? bir vaqtda yuborsam? boshqa yo'l bilan (API, import) qilsam?** Bu savollar a3 bosqichidagi tahdid modelining ham qismi.
:::

## Kodda va jarayonda topish

**Kod ko'rib chiqishda:**
- Pul, miqdor, rol, holat **mijozdan** olinadimi?
- "Tekshir, keyin o'zgartir" naqshi — atomikmi yoki ikki alohida so'rovmi?
- Limit va kvota tekshiruvlari **barcha** yo'llarda bormi?
- Ko'p bosqichli oqimlarda holat serverda tekshiriladimi?

**Dinamik sinashda** (faqat o'z ilovangizda yoki ruxsat etilgan nishonda):
- Proxy (Burp, ZAP) orqali so'rovlardagi qiymatlarni o'zgartirish: narx, miqdor, ID.
- Oqimdagi bosqichlarni o'tkazib yuborish yoki tartibini o'zgartirish.
- Bir xil so'rovni parallel yuborish (vositalarda buning uchun maxsus imkoniyatlar bor).

**Testlarda** — har bir biznes qoidasi uchun test, xuddi kirish nazorati matritsasi kabi:

```python
def test_promo_used_only_once_concurrently(app):
    """20 ta parallel so'rovdan faqat bittasi muvaffaqiyatli bo'lishi kerak."""
    from concurrent.futures import ThreadPoolExecutor
    ...
    with ThreadPoolExecutor(max_workers=20) as pool:
        results = list(pool.map(lambda c: c.post("/promo", data={"code": "YANGI2026"}), clients))
    assert sum(r.status_code == 200 for r in results) == 1
```

(Parallel testlar SQLite bilan murakkab bo'lishi mumkin — haqiqiy loyihalarda ular odatda ishlab chiqarishdagi bilan bir xil bazada o'tkaziladi.)

## Bu dars nimani bermaydi

- **Har bir sohaning qoidalarini** — bank, elektron tijorat, o'yinlar — har birining o'z mantiqiy tuzoqlari bor; ularni biznes egalari bilan birga aniqlaysiz.
- **Avtomatik aniqlash vositasini** — bunday universal vosita yo'q.
- **Ma'lumotlar bazasi tranzaksiyalarining to'liq nazariyasini** — izolyatsiya darajalari — alohida mavzu.

:::try
**1. Suiiste'mol stsenariylari.** Qaydnoma'ning uchta funksiyasi (qaydni ulashish, promo-kod, parolni tiklash) uchun har biriga kamida 3 tadan suiiste'mol stsenariysini yozing.

**2. Limit.** Qaydnoma'ga bepul foydalanuvchilar uchun qaydlar limitini qo'shing — yagona `create_note()` funksiyasida. Barcha yaratish yo'llari shu funksiyadan o'tishini tekshiring.

**3. Promo-kod.** Promo-kod funksiyasini avval "tekshir, keyin yangila" usulida, keyin atomik `UPDATE ... WHERE used = 0` usulida yozing. Qo'shimcha ravishda `UNIQUE (promo_id, user_id)` cheklovini qo'shing (agar bitta kod ko'p foydalanuvchiga mo'ljallangan bo'lsa).

**4. Narx.** Kod ko'rib chiqish mashqi: quyidagi kodda qanday muammolar bor?

```python
@app.route("/buy", methods=["POST"])
def buy():
    qty = int(request.form["qty"])
    price = float(request.form["price"])
    total = qty * price
    if session.get("balance", 0) >= total:
        session["balance"] -= total
        give_item(qty)
```

**5. PortSwigger Academy.** Business logic vulnerabilities bo'limidagi nazariy qism va dastlabki laboratoriyalar; keyin Race conditions bo'limiga nazar tashlang.

*Javob (4): narx mijozdan keladi; miqdor manfiy bo'lishi mumkin (balans oshadi); `float` pul uchun; balans **sessiyada** (Flask'da bu imzolangan cookie — foydalanuvchi uni o'zgartira olmaydi, lekin eski cookie'ni qayta yuborib balansni "qaytarishi" mumkin) — balans bazada bo'lishi kerak; tekshirish va yechish atomik emas (poyga holati); autentifikatsiya yo'q.*
:::

## Xulosa

- **Biznes mantiq zaifliklari** — har bir so'rov texnik jihatdan to'g'ri, lekin ilova qoidalari buziladi; skanerlar topa olmaydi.
- **Mijozga ishonmang**: narx, chegirma, rol, tarif, "to'lov muvaffaqiyatli" — serverda aniqlanadi.
- **Kutilmagan qiymatlar**: manfiy, nol, juda katta, kasr, bo'sh, boshqa tur — qat'iy tekshiruv; pul — `float` emas.
- **Oqimni chetlab o'tish** — har bir bosqich oldingilarini serverda tekshiradi.
- **Limitlar** — yaratishning yagona yo'lida.
- **Poyga holatlari (TOCTOU)** — atomik shartli yangilash, noyoblik cheklovlari, tranzaksiyalar, idempotentlik kalitlari.
- **Funksiyalarni suiiste'mol qilish** — rate limiting, tasdiqlash, anomaliyalarni kuzatish.
- Asosiy usul — **suiiste'mol stsenariylari**: o'zgartirsam, o'tkazib yuborsam, takrorlasam, bir vaqtda yuborsam, boshqa yo'l bilan qilsam.

:::quiz
? Nega avtomatik skanerlar biznes mantiq zaifliklarini deyarli topa olmaydi?
+ Javob texnik jihatdan to'g'ri bo'ladi; zaiflik faqat ilovaning o'ziga xos biznes qoidalari nuqtai nazaridan ko'rinadi
- Skanerlar juda sekin
- Bu zaifliklar faqat mobil ilovalarda
- Biznes mantiq zaifliklari mavjud emas
! Har bir ilovaning qoidalari o'ziga xos — umumiy naqsh yo'q.

? To'lov summasi qayerdan aniqlanishi kerak?
- Formadagi yashirin maydondan
- Cookie'dan
+ Serverda, tarif yoki mahsulot identifikatori bo'yicha narxlar jadvalidan
- JavaScript hisob-kitobidan
! Mijozdan kelgan narxni o'zgartirish mumkin.

? Savatchaga miqdor sifatida -5 kiritildi. Bu qanday xavf tug'dirishi mumkin?
+ Umumiy summa kamayishi yoki balans oshishi — server miqdorni musbat butun son va chegarada ekanini tekshirishi kerak
- Hech qanday xavf yo'q
- Faqat dizayn buziladi
- Server avtomatik tuzatadi
! Chegaraviy qiymatlar — biznes mantiqni sinashning asosi.

? Ko'p bosqichli oqimda (to'lov → tasdiqlash) to'g'ri himoya qaysi?
+ Har bir bosqich oldingi bosqichlar haqiqatan bajarilganini serverda tekshiradi (masalan, to'lov holati “paid” va ishlatilmagan)
- Tasdiqlash sahifasini faqat tugma orqali ochish mumkin deb taxmin qilish
- Bosqichlar tartibini JavaScript'da tekshirish
- Referer sarlavhasiga ishonish
! Foydalanuvchi istalgan bosqichga to'g'ridan-to'g'ri so'rov yuborishi mumkin.

? Bepul tarif limiti faqat formada tekshirilgan, API'da yo'q. To'g'ri tuzatish qaysi?
+ Limitni barcha yo'llar chaqiradigan yagona yaratish funksiyasida tekshirish
- API'ni o'chirish
- Formaga yana bitta tekshiruv qo'shish
- Foydalanuvchilarga ogohlantirish yozish
! Markazlashtirish — unutilgan yo'llarning oldini oladi.

? “Tekshir, keyin yangila” naqshidagi poyga holati nima?
+ Parallel so'rovlar tekshiruvdan bir vaqtda o'tadi, chunki yangilash hali bajarilmagan — bir martalik amal ko'p marta bajariladi
- Server juda tez ishlaydi
- So'rovlar tartibsiz keladi, lekin zarar yo'q
- Bu faqat ko'p yadroli kompyuterlarda bo'ladi
! TOCTOU: tekshirish va ishlatish vaqti orasidagi bo'shliq.

? Promo-kodni bir marta ishlatishni kafolatlashning to'g'ri usullari qaysilar?
+ Atomik shartli yangilash: UPDATE ... WHERE code = ? AND used = 0 va rowcount tekshiruvi
+ Ma'lumotlar bazasida noyoblik cheklovi (UNIQUE)
- Avval SELECT, keyin alohida UPDATE
- Tugmani bosilgandan keyin JavaScript'da o'chirish
! Baza darajasidagi atomiklik parallel so'rovlarda ham ishlaydi.

? Pul summalari uchun nega float ishlatmaslik kerak?
+ Kasr sonlarda yaxlitlash xatolari bo'ladi va ko'p takrorlanganda pul “paydo bo'lishi” yoki yo'qolishi mumkin
- float juda katta joy egallaydi
- float faqat Linux'da ishlaydi
- Farqi yo'q
! Butun sonlar (eng kichik birlikda) yoki Decimal ishlatiladi.

? “Do'stni taklif qil — bonus ol” funksiyasining asosiy suiiste'mol xavfi qaysi?
+ Soxta hisoblar yaratib, cheksiz bonus olish
- XSS
- SQL injection
- CORS xatosi
! Himoya — tasdiqlash, rate limiting va anomaliyalarni kuzatish.

? Biznes mantiq zaifliklarini topishning asosiy usuli qaysi?
+ Har bir funksiya uchun suiiste'mol stsenariylarini o'ylash: o'zgartirsam, o'tkazib yuborsam, takrorlasam, bir vaqtda yuborsam, boshqa yo'l bilan qilsam
- Faqat avtomatik skanerni ishga tushirish
- Faqat kodni formatlash
- Faqat parollarni tekshirish
! Hujumchi kabi fikrlash — bu sohaning asosiy ko'nikmasi.
:::

:::cards
Biznes mantiq zaifligi? :: Har bir so'rov texnik jihatdan to'g'ri, lekin ilova qoidasi buziladi — skanerlar topa olmaydi.
Mijozdan kelsa xavfli qiymatlar? :: Narx, chegirma, summa, foydalanuvchi ID, rol, tarif, “to'lov muvaffaqiyatli” belgisi.
Kutilmagan qiymatlar? :: Manfiy, nol, juda katta, kasr, bo'sh/null, boshqa tur — qat'iy server tekshiruvi.
Pul bilan ishlash? :: float emas — butun sonlar (eng kichik birlik) yoki Decimal.
Oqimni chetlab o'tish himoyasi? :: Har bir bosqich oldingi bosqichlar haqiqatan bajarilganini serverda tekshiradi.
Limitlar qayerda tekshiriladi? :: Yaratishning yagona yo'lida — forma, API, import shu funksiyani chaqiradi.
Poyga holati (TOCTOU)? :: Tekshirish va ishlatish orasidagi bo'shliq — parallel so'rovlar bir martalik amalni ko'p marta bajaradi.
Poyga holatiga qarshi vositalar? :: Atomik shartli UPDATE, UNIQUE cheklovlari, tranzaksiyalar va qulflash, idempotentlik kalitlari.
Atomik shartli yangilash namunasi? :: UPDATE promos SET used = 1 WHERE code = ? AND used = 0 — keyin rowcount == 1 tekshiruvi.
Funksiyalarni suiiste'mol qilish? :: Bonuslar, SMS yuborish, scraping, bepul sinovlar — rate limiting, tasdiqlash, monitoring.
Suiiste'mol stsenariylari savollari? :: O'zgartirsam? O'tkazib yuborsam? Takrorlasam? Bir vaqtda yuborsam? Boshqa yo'l bilan qilsam?
Biznes qoidalarini testlash? :: Har qoida uchun test, shu jumladan parallel so'rovlar testi.
:::
