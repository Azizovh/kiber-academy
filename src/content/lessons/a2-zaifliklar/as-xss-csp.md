Qaydnoma'ga yangi funksiya qo'shildi: qaydlarni boshqa foydalanuvchilar bilan ulashish. Endi bitta foydalanuvchi yozgan matn **boshqa** foydalanuvchining brauzerida ko'rsatiladi. Agar shu matn HTML yoki JavaScript sifatida talqin qilinsa — qayd muallifi qaydni ochgan har bir odamning brauzerida, **o'sha odamning sessiyasi bilan** o'z kodini ishga tushiradi.

Bu — **XSS** (Cross-Site Scripting). a1 bosqichidagi brauzer xavfsizlik modeli darsida nega u shunchalik xavfli ekanini ko'rgansiz: XSS hujumchi kodini Same-Origin Policy chegarasining **ichiga** olib kiradi. Shundan keyin u kod sahifadagi hamma narsani ko'radi va foydalanuvchi nomidan har qanday amalni bajaradi.

Bu darsda — XSS turlari, uning ildiz sababi va eng muhimi: **har bir kontekst uchun to'g'ri himoya**.

## XSS turlari

| Turi | Zararli ma'lumot qayerdan keladi | Qaydnoma'da misol |
|---|---|---|
| **Stored** (saqlangan) | Bazadan — bir marta saqlanadi, ko'p marta ko'rsatiladi | Ulashilgan qayd matni |
| **Reflected** (aks ettirilgan) | So'rovdan (URL parametri) — darhol javobda aks etadi | `/search?q=...` — "Siz qidirdingiz: ..." |
| **DOM-based** | Brauzerdagi JavaScript o'zi xavfli joyga yozadi — server ishtirok etmasligi mumkin | JS URL'dagi `#` qismini o'qib, sahifaga joylaydi |

Stored XSS odatda eng xavflisi: hujumchi faqat bir marta qayd yozadi, va uni ochgan **har bir** foydalanuvchi — shu jumladan administrator — ta'sirlanadi. Reflected XSS uchun hujumchi qurbonni maxsus havolani bosishga undashi kerak (phishing — b1 bosqichi).

### XSS bilan nima qilish mumkin

Foydalanuvchining brauzerida, uning sessiyasi bilan:
- Foydalanuvchi nomidan har qanday amalni bajarish (qaydlarni o'chirish, parolni o'zgartirish so'rovi, administrator funksiyalari).
- Sahifadagi ma'lumotlarni (shaxsiy qaydlar, CSRF tokenlari) o'qish va tashqariga yuborish.
- Soxta login formasini ko'rsatib, parolni so'rash.
- `HttpOnly` bo'lmagan cookie'larni o'g'irlash.

a1 bosqichidagi `HttpOnly` haqidagi ogohlantirishni eslang: u faqat oxirgi bandni to'xtatadi.

## Ildiz sabab: kontekst

XSS ham injection'ning bir turi: foydalanuvchi ma'lumoti **HTML yoki JavaScript kodiga** aylanadi. Lekin uning himoyasi injection'dagidan murakkabroq, chunki bitta HTML sahifa ichida **bir nechta til** bor — va har birida maxsus belgilar boshqacha:

```html
<p>QAYD MATNI</p>                                ← 1. HTML matni
<input value="QAYD SARLAVHASI">                   ← 2. HTML atributi
<a href="FOYDALANUVCHI HAVOLASI">Havola</a>      ← 3. URL
<script>var title = "QAYD SARLAVHASI";</script>   ← 4. JavaScript
<div style="color: FOYDALANUVCHI RANGI">          ← 5. CSS
```

| Kontekst | Xavfli belgilar | To'g'ri himoya |
|---|---|---|
| **1. HTML matni** | `<` `>` `&` | HTML kodlash: `<` → `&lt;` |
| **2. Atribut** (qo'shtirnoq ichida) | `"` `'` va yuqoridagilar | Atribut kodlash; atribut **doim qo'shtirnoq ichida** |
| **3. URL** (`href`, `src`) | Sxema: `javascript:` | **Sxema allowlist** (`http`, `https`, `mailto`) + kodlash |
| **4. JavaScript** | `"` `'` `</script>` va boshqalar | Foydalanuvchi ma'lumotini JS ichiga **yozmang**; kerak bo'lsa — JSON sifatida (`tojson`) yoki `data-` atributi orqali |
| **5. CSS** | Turli konstruksiyalar | Foydalanuvchi ma'lumotini CSS'ga yozmang; kerak bo'lsa — qat'iy allowlist (masalan, faqat `#RRGGBB`) |

Asosiy qoida: **[[output-encoding|chiqishni kodlash]] kontekstga mos bo'lishi kerak.** HTML kodlash atribut ichida yordam beradi (qo'shtirnoq bilan birga), lekin `href="..."` ichida `javascript:` sxemasidan himoya qilmaydi — unda `<` yoki `"` belgilari umuman yo'q.

## Freymvorklar sizni himoya qiladi — ko'pincha

Zamonaviy freymvorklar standart holatda kodlaydi:

| Freymvork | Avtomatik himoya | Xavfli "chiqish yo'li" |
|---|---|---|
| **Jinja2 / Flask** | `{{ x }}` — HTML kodlash | `\|safe`, `Markup()`, `{% autoescape false %}` |
| **Django** | `{{ x }}` | `\|safe`, `mark_safe()`, `{% autoescape off %}` |
| **React** | `{x}` — matn sifatida | `dangerouslySetInnerHTML` |
| **Vue** | `{{ x }}` | `v-html` |
| **Angular** | Interpolatsiya va sanitizatsiya | `bypassSecurityTrust...()` |
| **Vanilla JS** | `textContent` — xavfsiz | `innerHTML`, `outerHTML`, `document.write`, `insertAdjacentHTML` |

O'ng ustun — kod ko'rib chiqishda (a3) birinchi qidiriladigan narsalar. Ularning nomlari ham ogohlantiradi: React "dangerously" deb ataydi.

### Avtomatik himoya ishlamaydigan joylar

Freymvork kodlashi **faqat HTML matn va atribut kontekstida** ishonchli. U quyidagilarni avtomatik hal qilmaydi:

1. **`href` va `src` dagi `javascript:` sxemasi.** `<a href="{{ note.link }}">` — Jinja2 qo'shtirnoqlarni kodlaydi, lekin `javascript:...` qiymati baribir ishlaydi.

```python
from urllib.parse import urlparse

def safe_url(url: str) -> str:
    return url if urlparse(url).scheme in {"http", "https", "mailto"} else "#"
```

2. **`<script>` bloklari ichiga ma'lumot yozish.** HTML kodlash JavaScript satri uchun to'g'ri kontekst emas. Jinja2'da to'g'ri yo'l — `tojson` filtri:

```html
<!-- ❌ -->
<script>var title = "{{ note.title }}";</script>

<!-- ✅ JSON sifatida — qo'shtirnoqlar va maxsus belgilar to'g'ri kodlanadi -->
<script nonce="{{ g.csp_nonce }}">var title = {{ note.title | tojson }};</script>

<!-- ✅ Yanada yaxshi: data- atributi, JS alohida faylda o'qiydi -->
<div id="note" data-title="{{ note.title }}"></div>
```

3. **Qo'shtirnoqsiz atributlar.** `<input value={{ x }}>` — bo'shliq bilan yangi atribut qo'shish mumkin. Atributlarni doim qo'shtirnoq ichiga oling.

4. **Brauzerdagi JS'ning o'zi** — DOM-based XSS (pastda).

## HTML kerak bo'lganda — sanitizatsiya

Qaydnoma foydalanuvchilari qaydlarda formatlashni xohlashdi: qalin matn, ro'yxatlar, havolalar. `|safe` ishlatish — darhol XSS. To'g'ri yo'l — **[[sanitization|sanitizatsiya]]**: HTML'dan faqat ruxsat etilgan teg va atributlarni qoldirib, qolganini olib tashlash. **Allowlist** — taqiqlanganlar ro'yxati emas.

```python
import nh3   # Rust'dagi ammonia kutubxonasi asosidagi Python sanitizer

ALLOWED_TAGS = {"b", "i", "strong", "em", "p", "ul", "ol", "li", "a", "br", "code", "pre"}
ALLOWED_ATTRS = {"a": {"href"}}

def clean_html(html: str) -> str:
    return nh3.clean(html, tags=ALLOWED_TAGS, attributes=ALLOWED_ATTRS,
                     url_schemes={"http", "https", "mailto"})
```

Brauzer tomonida — **DOMPurify** kutubxonasi. Ikkalasi ham maqsadga mo'ljallangan, sinalgan vositalar.

Yana ham yaxshiroq variant: foydalanuvchiga HTML emas, **Markdown** yozdirish va uni xavfsiz sozlangan kutubxona bilan HTML'ga aylantirib, keyin baribir sanitizatsiya qilish.

Muhim qoidalar:
- **O'zingiz regex bilan sanitizer yozmang.** HTML tahlili juda murakkab, va brauzerlar noto'g'ri HTML'ni kutilmagan tarzda tuzatadi. Regex asosidagi "tozalagichlar" deyarli har doim aylanib o'tiladi.
- Sanitizatsiyani **chiqarishda** (yoki saqlashda va chiqarishda) qiling — va kutubxonani yangilab turing.

## DOM-based XSS

Server hech narsa qilmasa ham, brauzerdagi JavaScript o'zi xavfli ish qilishi mumkin:

```javascript
// ❌ URL'dagi qismni to'g'ridan-to'g'ri HTML sifatida joylash
const q = new URLSearchParams(location.search).get("q");
document.getElementById("result").innerHTML = "Siz qidirdingiz: " + q;

// ✅ Matn sifatida
document.getElementById("result").textContent = "Siz qidirdingiz: " + q;
```

DOM XSS uchun ham manba va sink tushunchasi (injection darsi):

| Manbalar (ishonchsiz) | Sink'lar (xavfli) |
|---|---|
| `location.search`, `location.hash`, `document.referrer` | `innerHTML`, `outerHTML`, `insertAdjacentHTML` |
| `postMessage` orqali kelgan ma'lumot | `document.write` |
| `localStorage`, API javoblari (agar foydalanuvchi ma'lumoti bo'lsa) | `eval`, `setTimeout("satr")`, `new Function()` |
| | `element.src`, `href` (`javascript:` bilan) |

Zamonaviy brauzerlarda **Trusted Types** mexanizmi bor — CSP orqali yoqiladi va xavfli sink'larga oddiy satrlarni berishni taqiqlaydi. Katta ilovalarda DOM XSS'ni tizimli yo'q qilish uchun kuchli vosita.

## CSP — ikkinchi qatlam

a1 bosqichidagi CSP darsini eslang: nonce asosidagi qat'iy CSP bilan, hatto kodlash xatosi qolib ketsa ham, hujumchi kiritgan `<script>` **ishlamaydi** — unda to'g'ri nonce yo'q. Inline hodisa ishlovchilari (`onerror=`, `onclick=`) ham bloklanadi.

| Qatlam | Nima qiladi |
|---|---|
| **Kontekstga mos kodlash** | XSS'ni ildizidan yo'q qiladi — **asosiy himoya** |
| **Sanitizatsiya** | HTML kerak bo'lganda — faqat ruxsat etilganini qoldiradi |
| **CSP** (nonce, `strict-dynamic`, `unsafe-inline`'siz) | Xato qolib ketsa — skript ishlamaydi |
| **`HttpOnly` cookie** | Sessiya cookie'si o'g'irlanmaydi |
| **Trusted Types** | DOM sink'lariga xavfli satrlarni taqiqlaydi |

:::key
**XSS himoyasining tartibi: kodlash → sanitizatsiya (faqat HTML kerak bo'lsa) → CSP → HttpOnly.** Birinchisi — ildizni yo'q qiladi; qolganlari — xato qolib ketgan holat uchun sug'urta. Eng keng tarqalgan xatolar ham shu tartibda: `|safe` yoki `innerHTML` ishlatish (kodlashni o'chirish), regex bilan "tozalash" (noto'g'ri sanitizatsiya), `'unsafe-inline'` (CSP'ni o'chirish). Kod ko'rib chiqishda har bir xavfli chiqish yo'li uchun so'rang: "bu yerga foydalanuvchi ma'lumoti yetib keladimi va u qanday kontekstda?"
:::

## Kiritishni tekshirish yordam beradimi?

Qisman. Agar maydon faqat raqam yoki email bo'lishi kerak bo'lsa — qat'iy tekshiruv XSS imkoniyatini kamaytiradi. Lekin qayd matni yoki ism kabi erkin matnni "xavfli belgilardan tozalash" — noto'g'ri yo'l: `<` va `'` belgilari qonuniy matnda ham bo'ladi (masalan, "O'zbekiston" yoki "2 < 3"). Ma'lumot **qanday** bo'lsa, shunday saqlanadi; xavfsizlik **chiqarishda**, kontekstga qarab ta'minlanadi.

## Sinash — faqat o'z ilovangizda

O'z Qaydnoma'ingizda: qayd matniga oddiy HTML tegi (masalan, `<b>salom</b>`) yozing. Kodlash ishlasa — teg **matn** sifatida ko'rinadi. Keyin vaqtincha `|safe` qo'shing — teg qalin matnga aylanadi: kodlash o'chdi, demak skript ham ishlashi mumkin edi. Qaytaring. Bu — XSS'ning eng xavfsiz namoyishi: hech qanday zararli kod kerak emas.

## Bu dars nimani bermaydi

- **Payload'lar katalogini** — maqsad himoya; amaliyot uchun PortSwigger Academy'ning ruxsat etilgan laboratoriyalari.
- **Har bir freymvorkning barcha tafsilotlarini** — OWASP XSS Prevention va DOM XSS Prevention cheat sheet'lari.
- **CSP'ni batafsil** — a1 bosqichidagi brauzer xavfsizlik modeli darsi.

:::try
**1. Kodlashni ko'ring.** Qaydnoma'da `<b>salom</b>` matnli qayd yarating. Brauzerda qanday ko'rinadi? Sahifa manbasida (Ctrl+U) qanday yozilgan?

**2. `|safe` tajribasi.** Vaqtincha `note.html` da `{{ note.body | safe }}` qiling, natijani ko'ring, keyin qaytaring. Git'ga zaif versiyani commit qilmang.

**3. Havola maydoni.** Qaydlarga "manba havolasi" maydonini qo'shing va `href` da ko'rsating. `safe_url` funksiyasini qo'shing va `javascript:` bilan boshlanadigan qiymat `#` ga aylanishini sinang.

**4. Formatlash.** `nh3` bilan qayd matnida faqat `b`, `i`, `ul`, `li`, `a` teglariga ruxsat bering. Ruxsat etilmagan teg (masalan, `<img>`) va `onclick` atributi olib tashlanishini tekshiring.

**5. Kod ko'rib chiqish.** O'zingiz yozgan (yoki GitHub'dagi kichik) loyihada `innerHTML`, `|safe`, `dangerouslySetInnerHTML`, `v-html` qidiring. Har bir topilma uchun: foydalanuvchi ma'lumoti yetib keladimi?

**6. PortSwigger Academy.** XSS bo'limidagi nazariy qismni va dastlabki laboratoriyalarni bajaring.

*Javoblar: 1 — teg matn sifatida ko'rinadi; manbada `&lt;b&gt;salom&lt;/b&gt;`. 3 — `urlparse("javascript:...").scheme` `javascript` qaytaradi, u allowlist'da yo'q, shuning uchun `#`.*
:::

## Xulosa

- **XSS** — foydalanuvchi ma'lumoti sahifada HTML/JS kodiga aylanadi; hujumchi kodi SOP chegarasi ichida, qurbon sessiyasi bilan ishlaydi.
- Turlari: **stored** (eng xavfli), **reflected**, **DOM-based**.
- Ildiz — **kontekst**: HTML matni, atribut, URL, JavaScript, CSS — har biri uchun alohida himoya.
- Freymvorklar avtomatik kodlaydi; xavfli chiqish yo'llari: `|safe`, `Markup`, `mark_safe`, `dangerouslySetInnerHTML`, `v-html`, `innerHTML`.
- Avtomatik himoya ishlamaydi: **`javascript:` URL**'lar (sxema allowlist), **`<script>` ichidagi ma'lumot** (`tojson` yoki `data-`), qo'shtirnoqsiz atributlar, DOM XSS.
- HTML kerak bo'lsa — **sanitizatsiya kutubxonasi** (nh3, DOMPurify), allowlist; o'zingiz regex bilan yozmang.
- DOM XSS: `textContent`, xavfli sink'lardan qochish, **Trusted Types**.
- Qatlamlar: **kodlash → sanitizatsiya → CSP → HttpOnly**.

:::quiz
? Qaysi XSS turi odatda eng xavfli va nega?
+ Stored — bir marta saqlanadi va uni ko'rgan har bir foydalanuvchiga, shu jumladan administratorga ta'sir qiladi
- Reflected — chunki u faqat bitta foydalanuvchiga ta'sir qiladi
- DOM-based — chunki u serverni buzadi
- Hammasi bir xil xavfli emas
! Reflected XSS'da hujumchi qurbonni havolani bosishga undashi kerak.

? Nega bitta “HTML kodlash” funksiyasi barcha XSS holatlari uchun yetarli emas?
+ Sahifada turli kontekstlar (HTML, atribut, URL, JavaScript, CSS) bor va har birida xavfli belgilar boshqacha
- HTML kodlash juda sekin
- Brauzerlar HTML kodlashni tushunmaydi
- U faqat ingliz harflari uchun ishlaydi
! Masalan, href dagi javascript: sxemasida kodlanadigan belgi yo'q.

? Jinja2'da <a href="{{ note.link }}"> qatori qanday xavf tug'diradi?
- Hech qanday — Jinja2 hamma narsani kodlaydi
+ Jinja2 qo'shtirnoqlarni kodlaydi, lekin javascript: sxemali qiymat baribir ishlaydi — sxema allowlist kerak
- Faqat CSS buziladi
- Havola ochilmaydi
! URL kontekstida sxema tekshiruvi kerak.

? <script> bloki ichiga foydalanuvchi ma'lumotini xavfsizroq joylashning to'g'ri usuli qaysi?
- {{ x }} — HTML kodlash yetarli
- {{ x | safe }}
+ {{ x | tojson }} yoki ma'lumotni data- atributi orqali berib, JS'ni alohida faylda o'qish
- Ma'lumotni eval() bilan o'qish
! JavaScript konteksti HTML kodlashdan boshqacha himoya talab qiladi.

? Qaysi kod qatorlari XSS uchun xavfli “chiqish yo'li”?
+ element.innerHTML = userText
+ React'da dangerouslySetInnerHTML
- element.textContent = userText
- Jinja2'da {{ userText }}
! textContent va standart interpolatsiya matnni kod sifatida talqin qilmaydi.

? Foydalanuvchilarga qaydlarda formatlash (qalin, ro'yxat) kerak. To'g'ri yechim qaysi?
- Shablonda |safe ishlatish
+ Sanitizatsiya kutubxonasi (masalan, nh3 yoki DOMPurify) bilan faqat ruxsat etilgan teg va atributlarni qoldirish
- O'zingiz regex bilan <script> teglarini olib tashlash
- Hech narsa qilmaslik
! Regex asosidagi tozalagichlar deyarli har doim aylanib o'tiladi.

? DOM-based XSS'ning xususiyati nima?
+ Brauzerdagi JavaScript ishonchsiz manbani (masalan, location.hash) xavfli sink'ga (innerHTML) o'zi yozadi — server ishtirok etmasligi mumkin
- U faqat serverda bo'ladi
- U faqat ma'lumotlar bazasida saqlanadi
- U faqat CSS orqali ishlaydi
! Himoya — textContent, xavfsiz API'lar va Trusted Types.

? Kodlash xatosi qolib ketgan bo'lsa ham, hujumchi kiritgan skript ishlamasligiga qaysi qatlam yordam beradi?
- HttpOnly cookie
+ Nonce asosidagi, 'unsafe-inline'siz CSP
- HTTPS
- Parol xeshlash
! CSP — ikkinchi qatlam; asosiy himoya baribir kodlash.

? Erkin matn maydoni (qayd matni) uchun qaysi yondashuv to'g'ri?
- Saqlashdan oldin barcha < va ' belgilarini o'chirish
+ Ma'lumotni qanday bo'lsa saqlash va chiqarishda kontekstga mos kodlash
- Bunday maydonlarni taqiqlash
- Faqat frontend'da tekshirish
! Qonuniy matnda ham bu belgilar bo'ladi (O'zbekiston, 2 < 3).

? XSS himoya qatlamlarining to'g'ri tartibi qaysi?
+ Kontekstga mos kodlash → (kerak bo'lsa) sanitizatsiya → CSP → HttpOnly
- Faqat WAF
- Faqat HttpOnly
- CSP → hech narsa
! Birinchisi ildizni yo'q qiladi, qolganlari — sug'urta.
:::

:::cards
XSS nima? :: Foydalanuvchi ma'lumoti sahifada HTML/JS kodiga aylanishi; hujumchi kodi qurbon brauzerida uning sessiyasi bilan ishlaydi.
XSS turlari? :: Stored (bazadan, eng xavfli), reflected (so'rovdan), DOM-based (brauzerdagi JS).
XSS bilan nima qilish mumkin? :: Foydalanuvchi nomidan amallar, sahifa ma'lumotlarini o'qish, soxta login formasi, HttpOnly bo'lmagan cookie'larni o'g'irlash.
XSS kontekstlari? :: HTML matni, atribut, URL (href/src), JavaScript, CSS — har biriga alohida himoya.
URL konteksti himoyasi? :: Sxema allowlist: http, https, mailto — javascript: rad etiladi.
<script> ichidagi ma'lumot? :: Jinja2'da | tojson yoki data- atributi + alohida JS fayl.
Xavfli chiqish yo'llari? :: |safe, Markup, mark_safe, dangerouslySetInnerHTML, v-html, innerHTML, document.write.
Sanitizatsiya? :: HTML kerak bo'lganda — nh3 (server) yoki DOMPurify (brauzer), allowlist; regex bilan o'zingiz yozmang.
DOM XSS manba va sink'lari? :: Manbalar: location, referrer, postMessage. Sink'lar: innerHTML, document.write, eval, javascript: URL.
Trusted Types? :: CSP orqali yoqiladigan brauzer mexanizmi — xavfli DOM sink'lariga oddiy satr berishni taqiqlaydi.
XSS himoya qatlamlari? :: Kontekstga mos kodlash → sanitizatsiya → CSP (nonce) → HttpOnly.
Erkin matnga yondashuv? :: Ma'lumotni o'zgartirmasdan saqlash, chiqarishda kontekstga mos kodlash.
:::
