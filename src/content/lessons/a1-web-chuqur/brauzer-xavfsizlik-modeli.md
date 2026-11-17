Brauzeringizda bir vaqtning o'zida uchta yorliq ochiq: internet-bankingiz, ish pochtangiz va kecha Telegram'da kimdir yuborgan notanish sayt. Uchalasi ham JavaScript ishga tushiradi — bitta dasturda, bitta kompyuterda.

Nima uchun notanish saytdagi skript bank sahifasidagi balansingizni o'qiy olmaydi? Pochtangizdagi xatlarni ko'chira olmaydi? Bank nomidan pul o'tkazish tugmasini bosa olmaydi?

Chunki brauzer — juda murakkab xavfsizlik tizimi. U har bir saytni alohida "qafas"da ushlaydi va ular orasidagi chegaralarni qat'iy qo'riqlaydi. Bu chegaralarni tushunish — XSS, CSRF va clickjacking kabi zaifliklarni tushunishning kaliti. Va bu chegaralarni **kuchaytirish** — sarlavhalar bilan — AppSec muhandisining kundalik vositasi.

## Origin — brauzerdagi "davlat chegarasi"

**Origin** — uchta qismdan iborat: **protokol + domen + port**. Ikkita URL faqat uchalasi bir xil bo'lsagina bir xil origin'ga tegishli.

`https://qaydnoma.example/notes` bilan solishtiramiz:

| URL | Bir xil origin? | Sabab |
|---|---|---|
| `https://qaydnoma.example/search?q=a` | **Ha** | Faqat yo'l farq qiladi |
| `http://qaydnoma.example/notes` | Yo'q | Protokol farq qiladi |
| `https://app.qaydnoma.example/notes` | Yo'q | Domen farq qiladi (subdomen ham boshqa origin) |
| `https://qaydnoma.example:8443/notes` | Yo'q | Port farq qiladi |
| `https://qaydnoma.example.begona.example/` | Yo'q | Butunlay boshqa domen (b1 bosqichidagi "o'ngdan chapga o'qing") |

## Same-Origin Policy

[[same-origin-policy|Same-Origin Policy]] (SOP) — brauzerning asosiy qoidasi: **bir origin'dagi skript boshqa origin'ning ma'lumotlarini o'qiy olmaydi.**

Lekin SOP haqida eng muhim narsa — u **nimani to'smasligini** bilish:

| SOP to'sadi | SOP to'smaydi |
|---|---|
| Boshqa origin'dan kelgan javobni JavaScript bilan **o'qish** | Boshqa origin'ga so'rov **yuborish** (forma, rasm, havola) |
| Boshqa origin'dagi sahifa DOM'iga kirish (iframe ichida) | Boshqa origin'dan rasm, stil, **skript yuklash** va **ishga tushirish** |
| Boshqa origin cookie'larini JavaScript'da o'qish | Boshqa origin'ni iframe'ga joylash (agar u o'zi taqiqlamasa) |

Bu jadvalning o'ng ustuni — uchta zaiflikning sababi:

1. **So'rov yuborish to'silmaydi → CSRF.** Hujumchi sayti sizning bankingizga forma yuborishi mumkin, va brauzer unga bank cookie'larini avtomatik qo'shadi. Javobni o'qiy olmaydi — lekin amal **bajarilib bo'lgan**. (a2 bosqichidagi CSRF darsi; o'tgan darsdagi `SameSite`.)
2. **Skript yuklash va ishga tushirish to'silmaydi → XSS va ta'minot zanjiri.** Sahifangizdagi har qanday skript — qayerdan yuklanganidan qat'i nazar — **sizning origin'ingiz huquqlari bilan** ishlaydi. Agar hujumchi sahifangizga o'z skriptini kiritsa (XSS) yoki siz ishlatadigan CDN'dagi kutubxona buzilsa — SOP hech narsa qila olmaydi.
3. **Iframe'ga joylash to'silmaydi → clickjacking.** Hujumchi sizning saytingizni o'z sahifasiga ko'rinmas iframe sifatida joylab, foydalanuvchini "boshqa tugmani" bosayotganiga ishontiradi.

O'tgan darsdagi **CORS** — SOP'ning birinchi qatorini (o'qishni) server ruxsati bilan yumshatish.

:::key
**XSS nega shunchalik xavfli — endi tushunarli.** SOP — brauzerdagi asosiy himoya, va u origin'lar o'rtasidagi chegarani qo'riqlaydi. XSS esa hujumchi kodini **chegaraning ichiga** — sizning origin'ingizga — olib kiradi. Shundan keyin u kod uchun SOP to'siq emas: u sahifadagi hamma narsani o'qiy oladi, foydalanuvchi nomidan har qanday so'rov yuboradi, CSRF tokenlarini ham ko'radi. Shuning uchun XSS — web'dagi eng muhim zaifliklardan biri, va unga qarshi bir nechta qatlam kerak: kodlash (a2), CSP (pastda), `HttpOnly` (o'tgan dars).
:::

## Content Security Policy

[[csp|CSP]] — server brauzerga sahifa **qaysi manbalardan** resurslarni yuklashi va ishga tushirishi mumkinligini aytadigan sarlavha. Asosiy maqsad — XSS bo'lib qolsa ham, hujumchi kodi **ishlamasligi** yoki zarari cheklanishi.

```
Content-Security-Policy: default-src 'self'; script-src 'self'; object-src 'none'; frame-ancestors 'none'
```

### Asosiy direktivalar

| Direktiva | Nimani boshqaradi |
|---|---|
| `default-src` | Boshqa direktiva ko'rsatilmagan resurslar uchun standart |
| `script-src` | JavaScript manbalari — **eng muhimi** |
| `style-src` | CSS manbalari |
| `img-src`, `font-src`, `media-src` | Rasm, shrift, media |
| `connect-src` | `fetch`, XHR, WebSocket qayerga ulana oladi |
| `frame-ancestors` | Bu sahifani **kim** iframe'ga joylay oladi — clickjacking himoyasi |
| `form-action` | Formalar qayerga yuborilishi mumkin |
| `object-src` | Plaginlar — deyarli har doim `'none'` |
| `base-uri` | `<base>` tegini cheklash — `'none'` yoki `'self'` |

### Manba qiymatlari

| Qiymat | Ma'nosi |
|---|---|
| `'self'` | Faqat shu origin |
| `https://cdn.example` | Aniq domen |
| `'none'` | Hech narsa |
| `'nonce-<tasodifiy>'` | Faqat shu tasodifiy qiymat yozilgan skriptlar |
| `'strict-dynamic'` | Ishonchli (nonce'li) skript yuklagan boshqa skriptlar ham ishonchli |
| **`'unsafe-inline'`** | Sahifa ichidagi barcha `<script>` va `onclick=` — **CSP'ning XSS himoyasini deyarli yo'qqa chiqaradi** |
| **`'unsafe-eval'`** | `eval()` va shunga o'xshashlar — xavfli |

Eng keng tarqalgan xato — CSP yozib, unga `'unsafe-inline'` qo'shish ("aks holda sayt ishlamayapti"). Natija: sarlavha bor, himoya yo'q.

### Nonce'ga asoslangan "qat'iy" CSP

Domen ro'yxatlari (allowlist) ko'pincha aylanib o'tiladi: ruxsat etilgan katta CDN'da hujumchi uchun foydali skript topilishi mumkin. Zamonaviy tavsiya — **nonce**: har bir javob uchun yangi tasodifiy qiymat; faqat shu qiymat yozilgan skriptlar ishlaydi. Hujumchi kiritgan skriptda to'g'ri nonce bo'lmaydi.

Qaydnoma'da:

```python
import secrets
from flask import g

@app.before_request
def make_nonce():
    g.csp_nonce = secrets.token_urlsafe(16)

@app.after_request
def security_headers(resp):
    resp.headers["Content-Security-Policy"] = (
        "default-src 'self'; "
        f"script-src 'nonce-{g.csp_nonce}' 'strict-dynamic'; "
        "object-src 'none'; base-uri 'none'; "
        "frame-ancestors 'none'; form-action 'self'"
    )
    resp.headers["X-Content-Type-Options"] = "nosniff"
    resp.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    resp.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
    return resp
```

Shablonda har bir skriptga nonce qo'shiladi (Flask `g` ni shablonlarga avtomatik uzatadi):

```html
<script nonce="{{ g.csp_nonce }}" src="{{ url_for('static', filename='app.js') }}"></script>
```

Va `onclick="..."` kabi inline hodisa ishlovchilari o'rniga — `addEventListener` alohida JS faylda. Bu yaxshi kod amaliyoti ham.

### Report-Only — xavfsiz joriy etish

Mavjud katta ilovaga CSP qo'shish — biror narsani buzish xavfi. Shuning uchun avval **faqat kuzatish** rejimi:

```
Content-Security-Policy-Report-Only: default-src 'self'; script-src 'nonce-...' 'strict-dynamic'; report-uri /csp-report
```

Brauzer hech narsani bloklamaydi, faqat buzilishlar haqida xabar beradi (va konsolga yozadi). Bir necha hafta kuzatib, siyosatni sozlab, keyin haqiqiy `Content-Security-Policy` ga o'tasiz — b2 bosqichidagi aniqlash qoidalarini "avval kuzatish rejimida" joriy etish g'oyasi bilan bir xil.

### CSP nimani qilmaydi

- **XSS'ni tuzatmaydi** — u ta'sirni kamaytiradi. Koddagi kodlash xatosi baribir tuzatilishi kerak (a2).
- **`'unsafe-inline'` bilan deyarli himoya bermaydi.**
- **Hamma brauzerda bir xil emas** — eski brauzerlar ba'zi direktivalarni bilmaydi.
- **Noto'g'ri sozlansa — saytni buzadi**, shuning uchun Report-Only bilan boshlanadi.

## Clickjacking

Hujumchi sizning saytingizni o'z sahifasiga **shaffof iframe** sifatida joylaydi va ustiga "Sovg'ani olish" tugmasini qo'yadi. Foydalanuvchi tugmani bosadi — aslida esa ko'rinmas iframe ichidagi sizning "Hisobni o'chirish" tugmangizni bosadi. Foydalanuvchi o'z sessiyasi bilan kirgan — amal bajariladi.

Himoya — saytni boshqalar iframe'ga joylashini taqiqlash:

```
Content-Security-Policy: frame-ancestors 'none'          ← zamonaviy usul
X-Frame-Options: DENY                                     ← eski brauzerlar uchun
```

Agar sayt o'z subdomenlari ichida iframe'ga joylanishi kerak bo'lsa — `frame-ancestors 'self'` yoki aniq origin'lar.

## Boshqa brauzer himoyalari

| Mexanizm | Nima qiladi | Qachon kerak |
|---|---|---|
| **Subresource Integrity (SRI)** | Tashqi skript/stil kutilgan xeshga mos kelmasa, brauzer uni yuklamaydi | CDN'dan kutubxona yuklaganda — CDN buzilsa ham o'zgartirilgan fayl ishlamaydi |
| **iframe `sandbox`** | Iframe ichidagi kontentni cheklaydi: skriptlar, formalar, yuqori oynaga o'tish | Foydalanuvchi kontenti yoki uchinchi tomon vidjetlarini ko'rsatganda |
| **Permissions-Policy** | Kamera, mikrofon, joylashuv kabi imkoniyatlarni o'chiradi | Sayt ularni ishlatmasa — har doim o'chiring |
| **Cross-Origin-Opener-Policy** | Boshqa saytlar sizning oynangizga `window.opener` orqali ta'sir qilishini cheklaydi | Nozik ilovalar uchun |

SRI misoli:

```html
<script src="https://cdn.example/lib.min.js"
        integrity="sha384-...fayl xeshi..."
        crossorigin="anonymous"></script>
```

Xesh faylning o'zidan hisoblanadi (masalan, `openssl dgst -sha384 -binary lib.min.js | openssl base64 -A`) — xavfsizlik bosqichidagi xesh darsining amaliy qo'llanishi. Xeshni hech qachon "taxmin qilmang" — hisoblang.

`sandbox` haqida bitta tuzoq: `sandbox="allow-scripts allow-same-origin"` birgalikda — iframe ichidagi skript o'z sandbox'ini olib tashlashi mumkin. Ikkalasini birga faqat ishonchli kontent uchun bering.

## Sarlavhalarni tekshirish

| Vosita | Nima |
|---|---|
| **securityheaders.com** | Saytning xavfsizlik sarlavhalarini baholaydi (A–F) |
| **Mozilla Observatory** | Sarlavhalar, cookie'lar, TLS — tavsiyalar bilan |
| **Google CSP Evaluator** | CSP siyosatini tahlil qilib, zaif joylarni ko'rsatadi |
| Brauzer DevTools konsoli | CSP buzilishlari shu yerda ko'rinadi |

## Bu dars nimani bermaydi

- **Barcha direktivalarning to'liq ro'yxatini** — MDN'dagi CSP hujjatlari.
- **Brauzer ichki tuzilishini** — bu alohida chuqur mavzu.
- **XSS va CSRF'ni tuzatishni** — ular a2 bosqichida.

:::try
**1. Origin jadvali.** `https://bank.example:443/account` uchun quyidagilardan qaysilari bir xil origin? `https://bank.example/login`, `http://bank.example/account`, `https://www.bank.example/account`, `https://bank.example:8443/account`.

**2. CSP'ni Report-Only bilan qo'shing.** Qaydnoma'ga `security_headers` funksiyasini qo'shing, lekin avval sarlavha nomini `Content-Security-Policy-Report-Only` qilib qo'ying. Brauzer konsolida qanday ogohlantirishlar chiqdi? Shablonlardagi skriptlarga nonce qo'shib, ogohlantirishlar yo'qolguncha tuzating, keyin haqiqiy `Content-Security-Policy` ga o'ting.

**3. Clickjacking sinovi.** Kompyuteringizda oddiy HTML fayl yarating: `<iframe src="http://127.0.0.1:5000/notes" width="800" height="600"></iframe>` va uni brauzerda oching. `frame-ancestors 'none'` qo'shilishidan oldin va keyin nima bo'ladi?

**4. CSP Evaluator.** Qaydnoma CSP'sini va istalgan katta saytning CSP'sini Google CSP Evaluator'da tekshiring. Qaysi ogohlantirishlar chiqdi?

**5. securityheaders.com.** Uchta tanish saytni tekshiring va baholarni solishtiring. Eng ko'p yetishmaydigan sarlavha qaysi?

*Javoblar: 1 — faqat `https://bank.example/login` (443 — HTTPS'ning standart porti); qolganlari protokol, domen yoki port bo'yicha farq qiladi. 3 — sarlavhadan oldin Qaydnoma iframe ichida ochiladi; keyin brauzer uni ko'rsatishni rad etadi (konsolda xabar chiqadi).*
:::

## Xulosa

- **Origin** = protokol + domen + port; subdomen — boshqa origin.
- **SOP** boshqa origin ma'lumotlarini **o'qishni** to'sadi, lekin so'rov **yuborish**, skript **yuklash** va iframe'ga **joylashni** to'smaydi — CSRF, XSS ta'siri va clickjacking shu yerdan.
- XSS hujumchi kodini SOP chegarasining **ichiga** olib kiradi — shuning uchun bir necha qatlam kerak.
- **CSP**: `script-src` eng muhim; `'unsafe-inline'` — himoyani yo'qqa chiqaradi; zamonaviy usul — **nonce + `'strict-dynamic'`**, `object-src 'none'`, `base-uri 'none'`; joriy etish — **Report-Only** bilan.
- **Clickjacking** himoyasi: `frame-ancestors 'none'` (+ `X-Frame-Options: DENY`).
- **SRI** — CDN skriptlari xesh bilan; **sandbox** — ishonchsiz iframe kontenti; **Permissions-Policy** — keraksiz imkoniyatlarni o'chirish.
- Tekshirish: securityheaders.com, Mozilla Observatory, CSP Evaluator.

:::quiz
? Origin qaysi qismlardan iborat?
+ Protokol, domen va port
- Faqat domen
- Domen va yo'l
- IP manzil va yo'l
! Uchalasidan biri farq qilsa — boshqa origin.

? https://qaydnoma.example va https://app.qaydnoma.example bir xil origin'mi?
- Ha, chunki asosiy domen bir xil
+ Yo'q — subdomen ham boshqa origin
- Faqat port bir xil bo'lsa
- Faqat HTTP'da bir xil
! Domen to'liq mos kelishi kerak.

? Same-Origin Policy nimani TO'SMAYDI?
+ Boshqa origin'ga forma orqali so'rov yuborishni
- Boshqa origin'dan kelgan javobni JavaScript bilan o'qishni
- Boshqa origin sahifasining DOM'iga kirishni
- Boshqa origin cookie'larini JavaScript'da o'qishni
! Shuning uchun CSRF mumkin — so'rov ketadi, javob o'qilmasa ham amal bajariladi.

? Nega XSS SOP'ni “chetlab o'tadi”?
+ Hujumchi kodi saytning o'z origin'i ichida ishlaydi — u uchun SOP chegarasi yo'q
- SOP XSS'ni ko'rmaydi, chunki u CSS
- XSS boshqa brauzerda ishlaydi
- SOP faqat rasmlar uchun
! Shuning uchun XSS'ga qarshi bir necha qatlam kerak.

? CSP'ga 'unsafe-inline' qo'shishning oqibati nima?
- CSP kuchayadi
+ Sahifa ichidagi barcha skriptlarga ruxsat beriladi — CSP'ning XSS himoyasi deyarli yo'qoladi
- Faqat rasmlar bloklanadi
- Hech qanday o'zgarish yo'q
! Eng keng tarqalgan CSP xatosi.

? Nonce'ga asoslangan CSP qanday ishlaydi?
+ Har bir javob uchun yangi tasodifiy qiymat yaratiladi; faqat shu qiymat yozilgan skriptlar ishlaydi
- Barcha skriptlar bloklanadi
- Faqat CDN'dagi skriptlar ishlaydi
- Nonce — parolning boshqa nomi
! Hujumchi kiritgan skriptda to'g'ri nonce bo'lmaydi.

? Mavjud katta ilovaga CSP'ni xavfsiz joriy etish usuli qaysi?
- Darhol eng qat'iy siyosatni yoqish
+ Avval Content-Security-Policy-Report-Only bilan kuzatish, sozlash, keyin haqiqiy siyosatga o'tish
- CSP'ni faqat test serverda yoqish va ishlab chiqarishda hech qachon
- 'unsafe-inline' bilan boshlash va hech qachon olib tashlamaslik
! Report-Only hech narsani bloklamaydi, faqat buzilishlarni ko'rsatadi.

? Clickjacking'ga qarshi asosiy himoya qaysi?
+ Content-Security-Policy: frame-ancestors 'none' (yoki X-Frame-Options: DENY)
- HttpOnly cookie
- SQL so'rovlarini parametrlash
- Parol uzunligini oshirish
! Sayt boshqa saytlarda iframe ichida ko'rsatilmaydi.

? Subresource Integrity (SRI) nima uchun kerak?
- Skriptni tezroq yuklash uchun
+ CDN'dan yuklangan fayl kutilgan xeshga mos kelmasa, brauzer uni ishga tushirmasligi uchun
- Parollarni saqlash uchun
- Cookie'larni shifrlash uchun
! CDN buzilsa ham o'zgartirilgan kutubxona ishlamaydi.

? CSP haqida qaysi gap to'g'ri?
+ CSP XSS ta'sirini kamaytiradi, lekin koddagi kodlash xatosini tuzatish o'rnini bosmaydi
- CSP XSS'ni to'liq yo'q qiladi va kodni tuzatish shart emas
- CSP faqat CSS uchun
- CSP serverda ishlaydi, brauzerda emas
! Defense in depth: kodlash + CSP + HttpOnly.
:::

:::cards
Origin? :: Protokol + domen + port; uchalasi bir xil bo'lsagina bir xil origin.
SOP nimani to'sadi? :: Boshqa origin javoblarini o'qish, iframe DOM'iga kirish, boshqa origin cookie'larini JS'da o'qish.
SOP nimani to'smaydi? :: So'rov yuborish (CSRF), skript va resurs yuklash (XSS ta'siri, ta'minot zanjiri), iframe'ga joylash (clickjacking).
Nega XSS xavfli? :: Hujumchi kodi saytning o'z origin'ida ishlaydi — SOP unga to'siq emas.
CSP nima? :: Sahifa qaysi manbalardan resurs yuklashi va skript ishga tushirishi mumkinligini cheklovchi sarlavha.
Muhim CSP direktivalari? :: default-src, script-src, style-src, connect-src, frame-ancestors, form-action, object-src, base-uri.
Qat'iy CSP? :: script-src 'nonce-...' 'strict-dynamic'; object-src 'none'; base-uri 'none' — har javobda yangi nonce.
CSP xatolari? :: 'unsafe-inline', 'unsafe-eval', juda keng domen ro'yxatlari; Report-Only'siz to'satdan joriy etish.
Report-Only? :: Content-Security-Policy-Report-Only — bloklamaydi, faqat buzilishlarni xabar qiladi.
Clickjacking himoyasi? :: frame-ancestors 'none' (yoki 'self'), eski brauzerlar uchun X-Frame-Options: DENY.
SRI? :: integrity atributi bilan tashqi skript xeshini tekshirish; mos kelmasa — yuklanmaydi.
Boshqa brauzer himoyalari? :: iframe sandbox, Permissions-Policy, Cross-Origin-Opener-Policy.
:::
