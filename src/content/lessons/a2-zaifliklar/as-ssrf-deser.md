Qaydnoma'ga qulay funksiya qo'shildi: qaydga havola yozsangiz, server o'sha sahifani ochib, uning sarlavhasi va rasmini "oldindan ko'rish" sifatida ko'rsatadi. Foydalanuvchi URL beradi — **server** unga so'rov yuboradi.

Endi tasavvur qiling, foydalanuvchi tashqi sayt emas, `http://localhost:8080/admin` yoki ichki tarmoqdagi `http://10.10.10.5/` ni yozdi. Yoki bulutdagi serverning maxsus ichki manzilini — u yerdan serverning **bulut kalitlari** qaytadi. Server buni bajonidil ochadi: axir u ichkarida, unga hamma narsa ochiq.

Bu — **SSRF** (Server-Side Request Forgery). Bu darsda server tomonidagi uchta murakkab zaiflik sinfini ko'rasiz: SSRF, xavfli deserializatsiya va XXE. OWASP Top 10:2025 da ular uch xil toifada turadi: SSRF — Broken Access Control (A01) ichida (2021-yilda alohida A10 edi), XXE — Security Misconfiguration (A02), deserializatsiya — Software or Data Integrity Failures (A08). Ularning umumiy jihati: **server ishonchsiz ma'lumotga o'z imkoniyatlari bilan ishlov beradi** — tarmoqqa chiqish, obyektlarni tiklash, fayllarni o'qish.

## SSRF

### Nega xavfli

Server odatda tashqaridan ko'rinmaydigan narsalarga kira oladi:

```
 Internet                │  Ichki tarmoq / bulut
                         │
 Hujumchi ── URL ──► [Qaydnoma serveri] ──► http://localhost:6379   (Redis — parolsiz)
                         │        │
                         │        ├────────► http://10.10.10.5/admin   (ichki admin panel)
                         │        │
                         │        └────────► http://169.254.169.254/... (bulut metadata xizmati
                         │                                                — server kalitlari!)
```

| Nishon | Oqibat |
|---|---|
| **Bulut metadata xizmati** (`169.254.169.254`) | Server rolining vaqtinchalik **kalitlari** — b4 bosqichidagi bulut loglari darsidagi hikoyaning boshlanishi bo'lishi mumkin |
| Ichki admin panellari, monitoring | Tashqaridan yopiq tizimlarga kirish |
| `localhost` dagi xizmatlar (Redis, ma'lumotlar bazasi panellari) | Ko'pincha autentifikatsiyasiz |
| Ichki tarmoqni skanerlash | Javob vaqti va xatolar orqali qaysi xost va portlar ochiqligini bilish |
| `file://` kabi boshqa sxemalar | Ba'zi kutubxonalarda — lokal fayllarni o'qish |

Tarmoq bosqichidagi firewall darsini eslang: firewall tashqaridan kelgan ulanishlarni to'xtatadi. SSRF'da so'rov **ichkaridan** — ishonchli serverdan — chiqadi. Firewall uni o'tkazadi.

### SSRF qayerda bo'ladi

URL yoki manzil qabul qiladigan har qanday funksiya: havola oldindan ko'rish, "URL'dan rasm yuklash", webhook manzili (foydalanuvchi o'z URL'ini kiritadi), PDF generatori (HTML ichidagi rasmlar va resurslar!), fayllarni import qilish, XML (pastdagi XXE), integratsiyalar.

### Himoya — qatlamlar

**1. Iloji bo'lsa — allowlist.** Agar server faqat ma'lum xizmatlarga murojaat qilishi kerak bo'lsa (masalan, faqat bitta to'lov API'si) — faqat shu domenlarga ruxsat. Bu — eng kuchli himoya.

**2. Erkin URL kerak bo'lsa** (havola oldindan ko'rish) — bir nechta tekshiruv birgalikda:

```python
import ipaddress
import socket
from urllib.parse import urlparse

def resolve_public(url: str) -> str:
    """URL faqat http(s) va faqat ommaviy IP manzillarga ishora qilishini tekshiradi."""
    parts = urlparse(url)
    if parts.scheme not in {"http", "https"} or not parts.hostname:
        raise ValueError("ruxsat etilmagan URL")
    addresses = {info[4][0] for info in socket.getaddrinfo(parts.hostname, parts.port or 443)}
    for addr in addresses:
        ip = ipaddress.ip_address(addr)
        if not ip.is_global:                 # localhost, 10/8, 172.16/12, 192.168/16, 169.254/16 ...
            raise ValueError("ichki manzil")
    return parts.hostname
```

| Tekshiruv | Nega |
|---|---|
| Faqat `http`/`https` sxemasi | `file://`, `gopher://` va boshqalar yopiladi |
| DNS'ni hal qilib, **IP manzilni** tekshirish | Domen nomi bo'yicha tekshiruv aldanadi — hujumchi domeni ichki IP'ga ishora qilishi mumkin |
| Barcha IP'lar tekshiriladi (`is_global`) | Domen bir nechta manzilga ega bo'lishi mumkin; IPv6 ham |
| **Yo'naltirishlarni** o'chirish yoki har birini qayta tekshirish | Tashqi sayt `302` bilan ichki manzilga yo'naltirishi mumkin |
| Kichik `timeout` va javob hajmi chegarasi | Resurslarni band qilishning oldini olish |
| Javobni foydalanuvchiga to'liq qaytarmaslik | Faqat kerakli qism (sarlavha, rasm) — ichki javoblar sizmasligi uchun |

Muhim cheklov: yuqoridagi kodda **DNS tekshiruv va haqiqiy so'rov orasida** domen boshqa IP'ga o'zgarishi mumkin (DNS rebinding). Ilova darajasidagi tekshiruv — kerak, lekin yolg'iz yetarli emas.

**3. Tarmoq darajasidagi himoya — eng ishonchli qatlam:**
- Tashqi so'rovlarni **alohida egress proxy** orqali yuborish — u ichki manzillarga umuman ruxsat bermaydi.
- Ilova serverining tarmoq qoidalari: faqat kerakli chiquvchi ulanishlar.
- Bulutda metadata xizmatining himoyalangan versiyasidan foydalanish (masalan, AWS'da IMDSv2 — oddiy GET so'rov bilan kalitlarni olib bo'lmaydi) va server roliga **eng kam huquq** (Cloud tarmog'i).

:::key
**SSRF — "ishonchli joylashuv"ning suiiste'moli.** Server ichki tarmoqda turadi va unga ko'p narsa ochiq; SSRF hujumchiga shu ishonchli joylashuvdan foydalanish imkonini beradi. Shuning uchun himoya ham ikki darajada: **ilovada** (allowlist, sxema, IP tekshiruvi, yo'naltirishlar) va **tarmoqda** (egress proxy, chiquvchi trafik qoidalari, metadata himoyasi, eng kam huquqli rol). Faqat bitta darajaga tayanish — b2 bosqichidan beri takrorlanayotgan "defense in depth" tamoyiliga zid.
:::

## Xavfli deserializatsiya

### Serializatsiya nima

**Serializatsiya** — obyektni saqlash yoki uzatish uchun baytlar yoki matnga aylantirish; **deserializatsiya** — teskarisi. JSON — eng oddiy misol. Lekin ba'zi formatlar faqat ma'lumotni emas, **obyekt turlari va xatti-harakatini** ham saqlaydi — va ularni tiklash paytida kod bajarilishi mumkin.

| Format / funksiya | Ishonchsiz ma'lumot uchun |
|---|---|
| Python **`pickle`**, `shelve`, `marshal` | **Hech qachon** — `pickle.loads` ishonchsiz ma'lumotda kod bajarishi mumkin (Python hujjatlarining o'zi bu haqda ogohlantiradi) |
| PyYAML `yaml.load` (xavfsiz bo'lmagan loader bilan) | **Hech qachon** — `yaml.safe_load` ishlating |
| Java `ObjectInputStream`, .NET `BinaryFormatter`, PHP `unserialize` | Juda xavfli — ma'lum ko'p insidentlar sababi |
| **JSON** (`json.loads`) | Xavfsiz — faqat ma'lumot (lekin tarkibini baribir tekshiring) |
| `yaml.safe_load` | Xavfsiz — oddiy turlar |

```python
import base64, json, pickle, yaml

# ❌ Cookie yoki so'rovdan kelgan ma'lumot pickle bilan tiklanadi
prefs = pickle.loads(base64.b64decode(request.cookies["prefs"]))

# ✅ JSON + sxema tekshiruvi
prefs = json.loads(request.cookies.get("prefs", "{}"))
if not isinstance(prefs, dict) or set(prefs) - {"theme", "lang"}:
    prefs = {}

# ❌ / ✅ YAML
config = yaml.load(text, Loader=yaml.Loader)    # ❌ ishonchsiz matn uchun
config = yaml.safe_load(text)                   # ✅
```

### Himoya

1. **Ishonchsiz ma'lumotni xavfli formatlar bilan deserializatsiya qilmang.** JSON kabi faqat ma'lumot formatlariga o'ting.
2. Xavfli format **majburiy** bo'lsa (masalan, eski tizim) — ma'lumotni **imzolang** (HMAC, kriptografik xatolar darsi) va deserializatsiyadan **oldin** imzoni tekshiring: shunda faqat server o'zi yaratgan ma'lumot tiklanadi. Flask'ning o'zi sessiya uchun shunday qiladi (`itsdangerous` — imzolangan JSON).
3. Deserializatsiyadan keyin **tarkibni tekshirish** (sxema) — JSON bilan ham.
4. Kod ko'rib chiqishda qidiring: `pickle.load`, `yaml.load(`, `jsonpickle`, `shelve`, boshqa tillarda — `ObjectInputStream`, `unserialize`, `BinaryFormatter`.

Statik tahlil darsidagi qoida bu yerda ham: bu zaiflikning ekspluatatsiya tafsilotlari murakkab va maxsus; AppSec muhandisi uchun eng muhimi — **xavfli sink'larni tanish va ularni xavfsiz muqobilga almashtirish**.

## XXE — XML External Entity

XML formatida **DTD** va **tashqi obyektlar** (external entities) degan imkoniyat bor: XML hujjati parserga "falon fayl yoki URL'dagi mazmunni shu yerga qo'y" deyishi mumkin. Agar parser bu imkoniyatni o'chirmagan holda ishonchsiz XML'ni qayta ishlasa:

| Oqibat | Izoh |
|---|---|
| Server fayllarini o'qish | Konfiguratsiya, kalitlar |
| SSRF | Parser ichki URL'larga so'rov yuboradi |
| Xizmatdan voz kechish (DoS) | Obyektlarning ichma-ich kengayishi ("billion laughs") xotirani to'ldiradi |

XML qayerda bo'lishi mumkin — ko'pincha kutilmagan joylarda: SOAP API'lari, SAML (a1 bosqichidagi SSO!), **DOCX, XLSX, SVG** fayllari (ular ichida XML), RSS, konfiguratsiya fayllari importi.

### Himoya

```python
# ❌ Standart kutubxona parserlari ishonchsiz XML uchun tavsiya etilmaydi
import xml.etree.ElementTree as ET
tree = ET.fromstring(untrusted_xml)

# ✅ defusedxml — xavfli imkoniyatlar o'chirilgan o'rash
from defusedxml.ElementTree import fromstring
tree = fromstring(untrusted_xml)

# ✅ lxml bilan — tashqi obyektlar va tarmoq o'chirilgan
from lxml import etree
parser = etree.XMLParser(resolve_entities=False, no_network=True, dtd_validation=False, load_dtd=False)
tree = etree.fromstring(untrusted_xml, parser)
```

| Qoida | Izoh |
|---|---|
| **DTD va tashqi obyektlarni o'chirish** | Asosiy himoya — har bir tilda o'z sozlamasi bor (OWASP XXE Prevention cheat sheet) |
| Python'da — **`defusedxml`** | Xavfli imkoniyatlarni o'chiradigan tayyor o'rash |
| Iloji bo'lsa — XML o'rniga JSON | Muammoni ildizidan yo'qotish |
| Fayl yuklashda — SVG va ofis fayllari ham XML | Ularni qayta ishlaydigan kutubxonalar sozlamalarini tekshirish |

## Uchalasining umumiy saboqlari

| Zaiflik | Server nima qiladi | Himoya g'oyasi |
|---|---|---|
| **SSRF** | Ishonchsiz URL'ga **o'zi** so'rov yuboradi | Allowlist + IP tekshiruvi + tarmoq cheklovlari |
| **Deserializatsiya** | Ishonchsiz baytlardan **obyekt va xatti-harakat** tiklaydi | Faqat ma'lumot formatlari (JSON) yoki imzo |
| **XXE** | Ishonchsiz XML'ning **ko'rsatmalarini** bajaradi (fayl o'qish, URL ochish) | Parserning xavfli imkoniyatlarini o'chirish |

Uchalasida ham savol bir xil: **"Bu kutubxona yoki funksiya ishonchsiz ma'lumot bilan nima QILA OLADI?"** Ko'p kutubxonalarning standart sozlamalari "qulaylik" uchun keng imkoniyatlar beradi — xavfsizlik uchun ularni toraytirish kerak.

## Bu dars nimani bermaydi

- **Ekspluatatsiya texnikalarini** — maqsad xavfli joylarni tanish va yopish; amaliyot uchun PortSwigger Academy'ning ruxsat etilgan laboratoriyalari.
- **Har bir til va kutubxonaning sozlamalarini** — OWASP SSRF Prevention, Deserialization va XXE Prevention cheat sheet'lari.
- **Bulut metadata himoyasini batafsil** — Cloud tarmog'ida.

:::try
**1. SSRF xaritasi.** Qaydnoma'da (yoki o'zingiz tanigan ilovada) server URL qabul qiladigan barcha joylarni sanang. Har biri uchun: allowlist mumkinmi?

**2. `resolve_public`.** Yuqoridagi funksiyani yozing va sinang: `http://example.com`, `http://localhost`, `http://127.0.0.1`, `http://10.10.10.5`, `http://169.254.169.254`, `file:///etc/passwd`. Qaysilari rad etildi? Keyin `requests.get(..., allow_redirects=False, timeout=5)` bilan havola oldindan ko'rish funksiyasini qo'shing.

**3. pickle o'rniga JSON.** Qaydnoma'ga foydalanuvchi sozlamalarini (mavzu, til) cookie'da saqlashni qo'shing — JSON va sxema tekshiruvi bilan (yoki Flask sessiyasining o'zida). Nega `pickle` bu yerda xavfli bo'lardi?

**4. Kod qidiruvi.** O'z loyihangizda va bitta ochiq loyihada qidiring: `pickle.load`, `yaml.load(`, `xml.etree`, `requests.get(` (foydalanuvchi URL'i bilan). Har bir topilmani baholang.

**5. PortSwigger Academy.** SSRF bo'limidagi nazariy qism va dastlabki laboratoriya.

*Javob (2): `example.com` dan boshqa hammasi rad etilishi kerak: localhost va 127.0.0.1 — loopback, 10.10.10.5 — xususiy tarmoq, 169.254.169.254 — link-local, `file://` — ruxsat etilmagan sxema.*
:::

## Xulosa

- **SSRF** — server ishonchsiz URL'ga o'zi so'rov yuboradi; nishonlar: **bulut metadata** (kalitlar), ichki panellar, localhost xizmatlari, ichki tarmoq.
- SSRF himoyasi: **allowlist** (eng yaxshi); aks holda — `http(s)` sxemasi, **DNS'dan keyin IP tekshiruvi** (`is_global`), yo'naltirishlarni nazorat qilish, timeout va hajm chegarasi; **tarmoq darajasida** — egress proxy, chiquvchi qoidalar, IMDSv2, eng kam huquqli rol.
- **Xavfli deserializatsiya** — `pickle`, `yaml.load`, Java/PHP/.NET serializatorlari ishonchsiz ma'lumotda kod bajarishi mumkin; **JSON + sxema** yoki **imzo**.
- **XXE** — XML tashqi obyektlari orqali fayl o'qish, SSRF, DoS; **DTD va tashqi obyektlarni o'chirish**, Python'da **`defusedxml`**; XML kutilmagan joylarda ham (SAML, DOCX, SVG).
- Umumiy savol: **"Bu kutubxona ishonchsiz ma'lumot bilan nima qila oladi?"**

:::quiz
? SSRF'da kim so'rov yuboradi?
- Hujumchining brauzeri
+ Zaif server — hujumchi bergan URL'ga o'zi
- Ma'lumotlar bazasi
- DNS server
! Server ichki tarmoqda turgani uchun tashqaridan yopiq tizimlarga yeta oladi.

? Nega bulut metadata xizmati (169.254.169.254) SSRF'ning eng xavfli nishonlaridan biri?
+ U serverning vaqtinchalik bulut kalitlarini qaytarishi mumkin
- U eng tez javob beradi
- U foydalanuvchi parollarini saqlaydi
- U DNS'ni boshqaradi
! Kalitlar bilan hujumchi bulut hisobida amallar bajarishi mumkin.

? SSRF himoyasida domen nomini emas, DNS'dan keyingi IP manzilni tekshirish nega muhim?
+ Hujumchi domeni ichki IP manzilga ishora qilishi mumkin — nom bo'yicha tekshiruv aldanadi
- IP tekshiruvi tezroq
- Domen nomlari har doim xavfsiz
- DNS ishlamaydi
! Barcha manzillar (IPv4 va IPv6) tekshiriladi.

? Tashqi sayt 302 javobi bilan ichki manzilga yo'naltirdi. Bunga qarshi himoya qaysi?
+ Yo'naltirishlarni o'chirish yoki har bir yo'naltirish manzilini qayta tekshirish
- Faqat birinchi URL'ni tekshirish yetarli
- HTTPS ishlatish
- Timeout'ni oshirish
! Birinchi tekshiruvdan o'tgan URL keyin ichkariga olib borishi mumkin.

? SSRF'ga qarshi eng ishonchli qatlamlardan biri qaysi?
+ Tashqi so'rovlarni ichki manzillarga ruxsat bermaydigan alohida egress proxy orqali yuborish
- Faqat frontend'da URL tekshirish
- Foydalanuvchilarga ogohlantirish yozish
- Faqat WAF
! Ilova darajasidagi tekshiruv DNS rebinding kabi holatlarda aldanishi mumkin.

? Python'da ishonchsiz ma'lumot uchun qaysi funksiya xavfli?
+ pickle.loads
- json.loads
- yaml.safe_load
- int()
! pickle ishonchsiz ma'lumotda kod bajarishi mumkin — Python hujjatlari ham ogohlantiradi.

? Eski tizimda xavfli serializatsiya formati majburiy. Qanday himoyalash mumkin?
+ Ma'lumotni server tomonda HMAC bilan imzolab, deserializatsiyadan oldin imzoni tekshirish
- Ma'lumotni Base64 bilan kodlash
- Faqat HTTPS ishlatish
- Hech narsa qilib bo'lmaydi
! Shunda faqat server o'zi yaratgan ma'lumot tiklanadi.

? XXE zaifligi qanday oqibatlarga olib kelishi mumkin?
+ Server fayllarini o'qish va ichki URL'larga so'rov yuborish (SSRF)
+ Obyektlar kengayishi orqali xizmatdan voz kechish (DoS)
- Faqat CSS buzilishi
- Faqat parol uzunligi o'zgarishi
! Asosiy himoya — DTD va tashqi obyektlarni o'chirish.

? Python'da ishonchsiz XML'ni xavfsizroq qayta ishlash uchun nima tavsiya etiladi?
- xml.etree.ElementTree standart sozlamalar bilan
+ defusedxml yoki tashqi obyektlar va tarmoq o'chirilgan lxml parser
- eval()
- XML'ni regex bilan tahlil qilish
! defusedxml xavfli imkoniyatlarni o'chiradigan tayyor o'rash.

? XML qayerda kutilmaganda paydo bo'lishi mumkin?
+ SAML, DOCX/XLSX va SVG fayllari ichida
- Faqat .xml kengaytmali fayllarda
- Faqat ma'lumotlar bazasida
- Hech qayerda — XML eskirgan
! Fayl yuklash va SSO funksiyalarida XML parser sozlamalarini tekshirish kerak.
:::

:::cards
SSRF nima? :: Server hujumchi bergan URL'ga o'zi so'rov yuboradi — ichki tarmoq va xizmatlarga yetish uchun.
SSRF nishonlari? :: Bulut metadata (169.254.169.254 — kalitlar), ichki admin panellari, localhost xizmatlari, ichki tarmoq skaneri, file:// kabi sxemalar.
SSRF qayerda bo'ladi? :: Havola oldindan ko'rish, URL'dan yuklash, webhook manzillari, PDF generatorlari, import, integratsiyalar, XML.
SSRF ilova darajasidagi himoyasi? :: Allowlist; aks holda http(s) sxemasi, DNS'dan keyin IP tekshiruvi (is_global), yo'naltirishlar nazorati, timeout, hajm chegarasi.
SSRF tarmoq darajasidagi himoyasi? :: Egress proxy, chiquvchi trafik qoidalari, IMDSv2, server roliga eng kam huquq.
DNS rebinding? :: Tekshiruv va so'rov orasida domen boshqa IP'ga o'zgaradi — shuning uchun tarmoq qatlami ham kerak.
Xavfli deserializatsiya? :: pickle, yaml.load, Java ObjectInputStream, PHP unserialize, .NET BinaryFormatter — ishonchsiz ma'lumotda kod bajarishi mumkin.
Deserializatsiya himoyasi? :: JSON + sxema; xavfli format majburiy bo'lsa — HMAC imzo va tiklashdan oldin tekshiruv.
XXE nima? :: XML parser tashqi obyektlarni qayta ishlashi — fayl o'qish, SSRF, DoS.
XXE himoyasi? :: DTD va tashqi obyektlarni o'chirish; Python'da defusedxml; iloji bo'lsa JSON.
Kutilmagan XML joylari? :: SAML, SOAP, DOCX/XLSX, SVG, RSS, konfiguratsiya importi.
Uchala zaiflikning umumiy savoli? :: Bu kutubxona ishonchsiz ma'lumot bilan nima qila oladi — tarmoq, obyekt, fayl?
:::
