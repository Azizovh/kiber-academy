Bugungi dunyoda deyarli hamma narsa — bank, pochta, do'kon, davlat xizmatlari — veb-ilova. Shuning uchun xavfsizlik ishining eng katta qismi ham veb bilan bog'liq: zaifliklarning aksariyati veb-ilovalarda topiladi.

Web xavfsizligini o'rganishdan oldin bitta narsani bilish shart: **veb-sahifa nimadan iborat va brauzer uni qanday ishlatadi.** Bu dars — aynan shu. Maqsad veb-dasturchi bo'lish emas: sahifa kodini **o'qiy olish** va brauzerda nima sodir bo'layotganini **ko'ra olish**.

## Uch til, uch vazifa

Har bir veb-sahifa uchta texnologiyadan iborat:

| Til | Vazifasi | O'xshatish |
|---|---|---|
| [[html|HTML]] | **Tuzilish**: nima bor — sarlavha, matn, forma, havola | Uyning devorlari va xonalari |
| [[css|CSS]] | **Ko'rinish**: rang, o'lcham, joylashuv | Bo'yoq va jihozlar |
| [[javascript|JavaScript]] | **Xatti-harakat**: tugma bosilganda nima bo'ladi | Elektr va mexanizmlar |

Xavfsizlik uchun eng muhimlari — HTML (ayniqsa formalar) va JavaScript.

## Klient va server: kim qayerda ishlaydi

Tarmoq bosqichidan bilasiz: brauzer — klient, sayt — server. Veb-ilova ham ikki qismga bo'linadi ([[frontend|frontend va backend]]):

```
        BRAUZER (klient)                          SERVER
  ┌──────────────────────────┐          ┌────────────────────────┐
  │  HTML  — tuzilish        │  HTTP    │  Backend kodi          │
  │  CSS   — ko'rinish       │ ◄──────► │  (Python, PHP, Java…)  │
  │  JavaScript — mantiq     │          │           │            │
  │                          │          │   Ma'lumotlar bazasi   │
  │  FRONTEND                │          │  BACKEND               │
  └──────────────────────────┘          └────────────────────────┘
   foydalanuvchi nazoratida               ilova egasi nazoratida
```

Pastki qatordagi yozuv — web xavfsizligining eng muhim g'oyasi:

:::key
**Brauzerga yuborilgan hamma narsa foydalanuvchi qo'lida.** U HTML'ni ko'ra oladi, JavaScript'ni o'qiy va o'zgartira oladi, formadagi cheklovlarni olib tashlay oladi, so'rovni butunlay qo'lda yasay oladi. Shuning uchun **brauzerdagi tekshiruv — qulaylik, himoya emas.** Haqiqiy tekshiruv faqat serverda bo'lishi mumkin. Bu qoidani buzish — web zaifliklarining eng katta manbai.
:::

HTTP darsidagi "klientdan kelgan hamma narsa soxta bo'lishi mumkin" degan gapning ildizi shu yerda.

## HTML

HTML hujjat **teglardan** iborat. Teg — burchakli qavs ichidagi nom; ko'pchiligi juft bo'ladi (ochuvchi va yopuvchi):

```html
<!DOCTYPE html>
<html>
  <head>
    <title>Mening sahifam</title>
  </head>
  <body>
    <h1>Xush kelibsiz</h1>
    <p>Bu — <b>birinchi</b> sahifam.</p>
    <a href="https://example.com">Havola</a>
    <img src="rasm.png" alt="Rasm tavsifi">
    <!-- Bu izoh: sahifada ko'rinmaydi, lekin kodda turadi -->
  </body>
</html>
```

| Qism | Ma'nosi |
|---|---|
| `<h1>…</h1>` | **Element**: ochuvchi teg, mazmun, yopuvchi teg |
| `href="…"`, `src="…"` | **Atribut**: elementga qo'shimcha ma'lumot |
| `<head>` | Sahifa haqida ma'lumot (ko'rinmaydi) |
| `<body>` | Ko'rinadigan mazmun |
| `<!-- … -->` | Izoh |

Eng ko'p uchraydigan teglar:

| Teg | Nima |
|---|---|
| `<h1>` … `<h6>` | Sarlavhalar |
| `<p>` | Paragraf |
| `<a href="…">` | Havola |
| `<img src="…">` | Rasm |
| `<div>`, `<span>` | Umumiy "quti"lar — tuzilish uchun |
| `<ul>`, `<li>` | Ro'yxat |
| `<table>` | Jadval |
| `<form>`, `<input>`, `<button>` | Forma va uning maydonlari |
| `<script>` | JavaScript kodi yoki unga havola |
| `<iframe>` | Boshqa sahifani shu sahifa ichida ko'rsatish |

Izohlarga alohida e'tibor: ular sahifada ko'rinmaydi, lekin **manba kodida turadi** va har kim o'qiy oladi. Dasturchilar u yerda eslatmalar, eski kod, ba'zan esa test parollari va ichki manzillarni unutib qoldiradi. Sahifa manbasini ko'zdan kechirish — veb-ilovani tekshirishning birinchi qadami.

### Formalar

Forma — foydalanuvchi serverga ma'lumot yuboradigan asosiy joy, shuning uchun xavfsizlik nuqtai nazaridan eng muhim element:

```html
<form action="/login" method="POST">
  <input type="text" name="username">
  <input type="password" name="password">
  <input type="hidden" name="rol" value="foydalanuvchi">
  <button type="submit">Kirish</button>
</form>
```

| Qism | Ma'nosi |
|---|---|
| `action` | Ma'lumot qaysi manzilga yuboriladi |
| `method` | Qaysi HTTP metodi bilan (GET yoki POST) |
| `name` | Maydon nomi — serverga shu nom bilan ketadi |
| `type="password"` | Kiritilgan belgilar ekranda yashiriladi (faqat ekranda!) |
| `type="hidden"` | Ko'rinmaydigan maydon — lekin so'rovda ketadi |

Tugma bosilganda brauzer HTTP so'rov yasaydi:

```http
POST /login HTTP/1.1
Content-Type: application/x-www-form-urlencoded

username=ali&password=sirli42&rol=foydalanuvchi
```

HTTP darsida ko'rgan so'rovingiz — mana qayerdan paydo bo'ladi.

Uchinchi maydonga qarang: `type="hidden"`. U sahifada ko'rinmaydi, lekin "yashirin" degani "himoyalangan" degani emas: foydalanuvchi uni manba kodida ko'radi va qiymatini o'zgartirib yubora oladi. Agar server shu maydonga ishonib, rolni undan o'qisa — bu jiddiy xato. Xuddi shunday: `maxlength="10"`, `disabled`, `readonly` kabi cheklovlar ham faqat brauzerda amal qiladi.

## CSS — qisqacha

CSS sahifa ko'rinishini belgilaydi. Xavfsizlik uchun bir narsani bilish kifoya — u elementlarni **selektorlar** orqali tanlaydi:

```css
h1        { color: navy; }          /* teg bo'yicha */
.xato     { color: red; }           /* class="xato" bo'lgan elementlar */
#kirish   { font-size: 20px; }      /* id="kirish" bo'lgan element */
```

`class` va `id` — elementlarga beriladigan nomlar. Ular JavaScript'da va brauzer vositalarida elementni topish uchun ham ishlatiladi.

CSS elementni yashirishi mumkin (`display: none`), lekin u HTML'da qoladi. Sahifada "ko'rinmayotgan" narsa manba kodida ko'rinib turishi mumkin.

## JavaScript

JavaScript — brauzer ichida ishlaydigan dasturlash tili. Python'ni bilganingiz uchun uni o'qish oson:

```javascript
// O'zgaruvchilar
let ism = "Ali";
const port = 22;

// Shart
if (port === 22) {
  console.log("SSH");
} else {
  console.log("Boshqa port");
}

// Sikl
for (let i = 0; i < 3; i++) {
  console.log(i);
}

// Funksiya
function salom(ism) {
  return "Salom, " + ism;
}
```

Python'dan asosiy farqlar: bloklar chekinish bilan emas, **jingalak qavslar** bilan; qatorlar oxirida `;`; solishtirish — `===`.

### DOM: sahifani o'zgartirish

Brauzer HTML'ni o'qib, undan elementlar daraxtini quradi — [[dom|DOM]] (Document Object Model). JavaScript shu daraxtni o'qiydi va o'zgartiradi:

```javascript
// Elementni topish
const sarlavha = document.querySelector("h1");
const maydon = document.getElementById("parol");

// O'qish va o'zgartirish
sarlavha.textContent = "Yangi sarlavha";
console.log(maydon.value);

// Hodisaga javob berish
document.querySelector("button").addEventListener("click", function () {
  alert("Tugma bosildi");
});
```

### JavaScript brauzerda nimalarga qodir

Sahifadagi skript quyidagilarni qila oladi:

- sahifadagi istalgan mazmunni o'qish va o'zgartirish;
- formaga kiritilayotgan ma'lumotni ko'rish;
- shu sayt nomidan serverga so'rov yuborish (`fetch`);
- shu saytning cookie'larini o'qish (`document.cookie`) — agar ular `HttpOnly` bilan himoyalanmagan bo'lsa;
- foydalanuvchini boshqa sahifaga yo'naltirish.

Bu ro'yxat nega muhim? Agar hujumchi qandaydir yo'l bilan **o'z** JavaScript kodini begona sayt sahifasiga joylay olsa, u kod shu saytning to'liq huquqlari bilan, shu saytga kirgan har bir foydalanuvchi brauzerida ishlaydi. Bu zaiflik [[xss|XSS]] (Cross-Site Scripting) deyiladi — web zaifliklarining eng keng tarqalganlaridan biri. HTTP darsidagi `HttpOnly` atributi aynan shuning oqibatini yumshatadi.

Asosiy sababi doim bir xil: sayt foydalanuvchi kiritgan matnni **tekshirmasdan va zararsizlantirmasdan** sahifaga qo'yadi. To'g'ri yozilgan ilova maxsus belgilarni almashtiradi (`<` → `&lt;`), shunda brauzer uni kod emas, oddiy matn deb ko'rsatadi. 5-bosqichda va AppSec yo'nalishida bu mavzuga qaytasiz.

### Same-Origin Policy

Tabiiy savol: unda `yomon-sayt.com` dagi skript mening bankim sahifasini o'qiy olmaydimi?

Yo'q — brauzerning asosiy himoya qoidasi tufayli: **Same-Origin Policy** (bir xil manba siyosati). Sahifadagi skript faqat **o'z manbasi**dagi ma'lumotni o'qiy oladi.

**Manba** (origin) = sxema + host + port:

| URL | `https://bank.uz` bilan bir manbami? |
|---|---|
| `https://bank.uz/hisob` | Ha — faqat yo'l farq qiladi |
| `http://bank.uz` | Yo'q — sxema boshqa |
| `https://api.bank.uz` | Yo'q — host boshqa |
| `https://bank.uz:8443` | Yo'q — port boshqa |

Bu qoida — veb xavfsizligining poydevori. XSS aynan shuning uchun xavfli: hujumchi kodi bank sahifasining **o'zida** ishlaydi, demak qoida uni to'xtatmaydi.

## DevTools — sizning asosiy vositangiz

Har bir brauzerda ishlab chiquvchi vositalari bor — [[devtools|DevTools]]. Ochish: `F12` yoki sahifada o'ng tugma → **Inspect**.

| Yorliq | Nima ko'rsatadi | Nima uchun |
|---|---|---|
| **Elements** | Jonli DOM daraxti | Sahifa tuzilishi, yashirin maydonlar, izohlar |
| **Console** | JavaScript konsoli | Kod bajarish, xatolarni ko'rish |
| **Network** | Barcha HTTP so'rovlar | So'rov va javoblar, sarlavhalar, yuborilgan ma'lumot |
| **Sources** | Sahifa yuklagan barcha fayllar | JavaScript kodini o'qish |
| **Application** | Cookie, localStorage, sessiya | Brauzerda nima saqlangan |

Ikki xil "manba" bor va farqi muhim:

- **View Source** (`Ctrl + U`) — server yuborgan **asl** HTML.
- **Elements** — JavaScript ishlaganidan keyingi **hozirgi** holat.

Elements yorlig'ida istalgan elementni ikki marta bosib, **tahrirlash** mumkin: matnni, atributni, `maxlength` cheklovini, `disabled` belgisini. Bu faqat sizning brauzeringizda o'zgaradi — lekin shu orqali "brauzerdagi cheklov himoya emas" degan qoidani o'z ko'zingiz bilan ko'rasiz.

Console'da sahifa kontekstida kod yozish mumkin:

```javascript
document.title
document.cookie
document.querySelectorAll("input[type=hidden]")
document.querySelectorAll("a").length
```

:::warn
Console'ga **tushunmagan kodingizni hech qachon yopishtirmang.** "Mana bu kodni F12 ga tashlang, sirli funksiya ochiladi" degan firibgarlik keng tarqalgan: yopishtirilgan kod sizning nomingizdan ishlaydi va sessiyangizni o'g'irlashi mumkin. Brauzerlar aynan shuning uchun konsolda ogohlantirish ko'rsatadi.
:::

## Zamonaviy veb: API va JSON

Eski saytlarda har bosishda server butun sahifani qaytadan yuborardi. Zamonaviy ilovalarda sahifa bir marta yuklanadi, keyin JavaScript fonda serverdan faqat **ma'lumot** so'raydi — odatda [[json|JSON]] ko'rinishida:

```javascript
fetch("/api/foydalanuvchi/42")
  .then(javob => javob.json())
  .then(malumot => console.log(malumot.ism));
```

```json
{"id": 42, "ism": "Ali", "rol": "foydalanuvchi", "email": "ali@example.com"}
```

Bunday so'rovlar sahifada ko'rinmaydi — ularni **Network** yorlig'ida (**Fetch/XHR** filtri bilan) ko'rasiz. Veb-ilovani tekshirganda aynan shu yerga qaraladi: ilova serverdan qanday manzillar orqali nimalarni so'rayapti va javobda sahifada ko'rsatilganidan **ko'proq** ma'lumot kelmayaptimi.

Tabiiy savol: yuqoridagi manzilda `42` ni `43` ga o'zgartirsam, boshqa odamning ma'lumoti keladimi? Kelmasligi kerak — server har so'rovda "bu foydalanuvchiga shu ma'lumotni ko'rish mumkinmi?" deb tekshirishi shart. Tekshirmasa — bu kirish nazorati xatosi, eng keng tarqalgan web zaifliklaridan biri.

## Veb-ilovani o'qish tartibi

Hammasini bitta ketma-ketlikka yig'amiz. O'z ilovangizni (yoki ruxsat berilgan nishonni) ko'zdan kechirganda:

1. **View Source** — izohlar, yashirin maydonlar, ulangan skript fayllari.
2. **Network** — sahifa qanday so'rovlar yuboradi, qaysi API manzillariga.
3. **Formalar** — qanday maydonlar bor, qayerga va qaysi metod bilan ketadi.
4. **Application** — qanday cookie'lar, ularda `HttpOnly` va `Secure` bormi.
5. **Sources** — JavaScript fayllarida nima bor: manzillar, kalitlar, mantiq.

Bu — hali hujum emas, bu **tushunish**. Web pentest ham, AppSec ham shundan boshlanadi.

Amaliyot bo'limidagi **"Manba kodida nima bor?"** CTF topshirig'i aynan shu ko'nikmani tekshiradi.

:::try
**1. O'z sahifangiz.** `sahifa.html` fayl yarating, yuqoridagi HTML misolini yozing va brauzerda oching (faylni ikki marta bosing). Forma qo'shing va unga `hidden` maydon kiriting.

**2. DevTools.** Sahifangizda `F12` → **Elements**. Sarlavha matnini o'zgartiring. Yashirin maydonni toping va `type="hidden"` ni `type="text"` ga almashtiring — u ko'rinib qoladi.

**3. Console.** Yozing: `document.querySelector("h1").textContent = "O'zgartirildi"`. Keyin: `document.querySelectorAll("input")`.

**4. Haqiqiy sayt.** Istalgan saytni oching, `Ctrl + U` bilan manbasini ko'ring: izohlar bormi? Nechta `<script>` ulangan? Keyin **Network** yorlig'ida **Fetch/XHR** filtrini yoqib, sahifani yangilang — sayt fonda qanday so'rovlar yuboryapti va qanday JSON olyapti?

**5. Amaliyot.** MDN Web Docs'dagi "HTML basics" va "JavaScript basics" qo'llanmalarini o'ting (mavzu manbalarida).
:::

## Xulosa

- **HTML** — tuzilish, **CSS** — ko'rinish, **JavaScript** — xatti-harakat.
- **Frontend** brauzerda va foydalanuvchi nazoratida; **backend** serverda.
- **Brauzerdagi tekshiruv himoya emas** — haqiqiy tekshiruv faqat serverda.
- Forma: `action`, `method`, `name`; `hidden` maydon yashirin, lekin himoyalanmagan.
- HTML izohlari va JavaScript kodini har kim o'qiy oladi.
- **DOM** — sahifa daraxti; JavaScript uni o'qiydi va o'zgartiradi.
- Begona skript sahifaga tushsa — **XSS**; sababi — kiritilgan matn zararsizlantirilmagan.
- **Same-Origin Policy**: skript faqat o'z manbasini (sxema + host + port) o'qiydi.
- **DevTools** (`F12`): Elements, Console, Network, Sources, Application.
- Zamonaviy ilovalar fonda API orqali JSON almashadi — Network yorlig'ida ko'rinadi.

:::quiz
? Veb-sahifaning tuzilishini (sarlavha, matn, forma) qaysi til belgilaydi?
+ HTML
- CSS
- JavaScript
- SQL
! HTML — tuzilish, CSS — ko'rinish, JavaScript — xatti-harakat.

? Formada `<input maxlength="10">` cheklovi bor. Bu serverni uzun ma'lumotdan himoya qiladimi?
- Ha, brauzer hech qachon uzunroq matn yubormaydi
+ Yo'q — bu cheklov faqat brauzerda; foydalanuvchi uni olib tashlashi yoki so'rovni qo'lda yuborishi mumkin
- Ha, agar HTTPS ishlatilsa
- Yo'q, chunki maxlength ishlamaydi
! Brauzerdagi har qanday cheklov — qulaylik. Haqiqiy tekshiruv serverda bo'lishi shart.

? `<input type="hidden" name="narx" value="100">` maydoni haqida qaysi gap to'g'ri?
- Uni foydalanuvchi ko'ra olmaydi va o'zgartira olmaydi
+ U sahifada ko'rinmaydi, lekin manba kodida turadi va qiymatini o'zgartirib yuborish mumkin
- U shifrlangan
- U serverga yuborilmaydi
! “Yashirin” — “himoyalangan” degani emas. Server bunday maydon qiymatiga ishonmasligi kerak.

? HTML izohlari (`<!-- ... -->`) haqida nima to'g'ri?
- Ular serverda qoladi, brauzerga yuborilmaydi
+ Ular sahifada ko'rinmaydi, lekin manba kodida har kim o'qiy oladi
- Ular faqat administratorga ko'rinadi
- Ular avtomatik shifrlanadi
! Izohlar HTML'ning bir qismi sifatida brauzerga yuboriladi. Ularda sezgir ma'lumot qoldirish — keng tarqalgan xato.

? Same-Origin Policy nima qiladi?
- Barcha saytlarni HTTPS ga o'tkazadi
+ Sahifadagi skriptga faqat o'z manbasidagi (sxema + host + port) ma'lumotni o'qishga ruxsat beradi
- Cookie'larni o'chiradi
- JavaScript'ni taqiqlaydi
! Bu qoida tufayli bir saytdagi skript boshqa sayt ma'lumotini o'qiy olmaydi — veb xavfsizligining poydevori.

? `https://shop.uz` va `https://api.shop.uz` bir manbami (same origin)?
- Ha, domen bir xil
+ Yo'q — host boshqa
- Ha, ikkalasi HTTPS
- Faqat dam olish kunlari
! Manba = sxema + host + port. Subdomen — boshqa host, demak boshqa manba.

? XSS zaifligining asosiy sababi nima?
- Server juda sekin
+ Ilova foydalanuvchi kiritgan matnni zararsizlantirmasdan sahifaga qo'yadi
- Brauzer eskirgan
- Parol qisqa
! Kiritilgan matn kod sifatida talqin qilinsa, u sahifa huquqlari bilan ishlaydi. Himoya — maxsus belgilarni almashtirish (encoding).

? Sahifa fonda serverga yuborayotgan API so'rovlarini qayerda ko'rasiz?
- Elements yorlig'ida
- Console yorlig'ida
+ Network yorlig'ida
- Manzil satrida
! Network barcha HTTP so'rovlarni ko'rsatadi; Fetch/XHR filtri fondagi API so'rovlarini ajratadi.

? View Source (`Ctrl+U`) va Elements yorlig'i farqi nima?
- Farqi yo'q
+ View Source — server yuborgan asl HTML; Elements — JavaScript ishlaganidan keyingi hozirgi holat
- Elements faqat CSS ko'rsatadi
- View Source faqat rasmlarni ko'rsatadi
! JavaScript sahifani o'zgartirgach, DOM asl HTML'dan farq qilishi mumkin. Ikkalasini ham ko'rish foydali.

? Notanish odam “mana bu kodni F12 konsoliga yopishtiring” desa, nima qilish kerak?
- Yopishtirish — konsol xavfsiz
+ Yopishtirmaslik — kod sizning nomingizdan ishlaydi va sessiyangizni o'g'irlashi mumkin
- Avval antivirusni o'chirish
- Kodni do'stlarga ham yuborish
! Konsoldagi kod sahifa kontekstida, sizning huquqlaringiz bilan bajariladi. Bu keng tarqalgan firibgarlik usuli.

? Manzildagi `/api/buyurtma/1001` ni `/api/buyurtma/1002` ga o'zgartirganda boshqa odamning buyurtmasi ko'rindi. Muammo qayerda?
- Brauzerda
+ Serverda — u foydalanuvchining shu ma'lumotga huquqi borligini tekshirmayapti
- Internet provayderida
- Hech qanday muammo yo'q
! Har bir so'rovda server kirish huquqini tekshirishi shart. Identifikatorni bilishning o'zi ruxsat bo'lmasligi kerak.
:::

:::cards
HTML, CSS, JavaScript vazifalari? :: HTML — tuzilish; CSS — ko'rinish; JavaScript — xatti-harakat (interaktivlik).
Frontend va backend farqi? :: Frontend brauzerda ishlaydi va foydalanuvchi nazoratida; backend serverda ishlaydi.
Nega brauzerdagi tekshiruv himoya emas? :: Foydalanuvchi HTML va JavaScript'ni o'zgartira oladi yoki so'rovni qo'lda yubora oladi. Haqiqiy tekshiruv serverda.
Forma atributlari action, method, name? :: action — qayerga yuboriladi; method — GET yoki POST; name — maydonning serverga ketadigan nomi.
DOM nima? :: Brauzer HTML'dan quradigan sahifa daraxti; JavaScript uni o'qiydi va o'zgartiradi.
Same-Origin Policy? :: Skript faqat o'z manbasidagi ma'lumotni o'qiy oladi. Manba = sxema + host + port.
XSS nima va nega yuz beradi? :: Begona JavaScript'ning sahifaga tushib ishlashi; sababi — kiritilgan matn zararsizlantirilmasdan sahifaga qo'yiladi.
DevTools'ning asosiy yorliqlari? :: Elements (DOM), Console (JS), Network (so'rovlar), Sources (fayllar), Application (cookie, saqlangan ma'lumot).
View Source va Elements farqi? :: View Source — server yuborgan asl HTML; Elements — JavaScript'dan keyingi jonli holat.
Veb-ilovani ko'zdan kechirish tartibi? :: Manba kodi → Network so'rovlari → formalar → cookie'lar → JavaScript fayllari.
:::
