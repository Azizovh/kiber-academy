Oldingi uch darsda Python tilini o'rgandingiz. Endi uni ishga solamiz. Bu darsda to'rtta kichik, lekin haqiqiy vosita yozasiz — har biri xavfsizlik mutaxassisining kundalik vazifasini hal qiladi:

1. Fayl o'zgartirilmaganini tekshirish (`hashlib`).
2. O'z serveringizdagi xizmatlar ishlayotganini tekshirish (`socket`).
3. Veb-sayt sozlamalarini tekshirish (`requests`).
4. Hammasini bitta hisobotga yig'ish.

:::warn
Bu darsdagi tarmoq vositalarini **faqat o'zingizga tegishli tizimlarga** yoki o'z laboratoriyangizdagi mashinalarga qarating. "Etika va qonun" darsidagi oltin qoida vosita yozganda ham amal qiladi: begona tizimga ruxsatsiz so'rov yuborish — kim yozgan dastur bilan bo'lishidan qat'i nazar — qonunbuzarlik.
:::

## 1. Fayl yaxlitligi: hashlib

[[hash|Xesh]] — ma'lumotning "barmoq izi": bir xil kirish doim bir xil natija beradi, bitta bit o'zgarsa — natija butunlay boshqa bo'ladi.

```python
import hashlib

hashlib.sha256(b"salom").hexdigest()
# '038f270ca678c66f5bf393f958e8eebc...'  (64 ta hex belgi)

hashlib.sha256(b"Salom").hexdigest()
# butunlay boshqa qiymat — bitta harf o'zgardi
```

Bu xususiyat ikki joyda doim ishlatiladi:

- **Yuklab olingan faylni tekshirish.** Kali yoki boshqa dasturni yuklaganingizda sayt yonida SHA-256 qiymati beriladi. Faylingiz xeshi mos kelsa — u yo'lda buzilmagan va almashtirilmagan.
- **O'zgarishni aniqlash.** Muhim fayllar xeshini saqlab qo'yasiz; keyin qayta hisoblaysiz. Farq qilsa — fayl o'zgargan.

Faylning xeshini hisoblash — katta fayl uchun bo'laklab:

```python
import hashlib

def fayl_xeshi(yol):
    """Faylning SHA-256 xeshini qaytaradi."""
    h = hashlib.sha256()
    with open(yol, "rb") as f:              # "rb" — baytlar sifatida o'qish
        while bolak := f.read(65536):       # 64 KB dan
            h.update(bolak)
    return h.hexdigest()

print(fayl_xeshi("kali-linux.iso"))
```

`:=` — "o'qib, o'zgaruvchiga saqla va bo'sh emasligini tekshir" degan qisqa yozuv.

Endi shundan foydali vosita yasaymiz — katalogdagi fayllar o'zgarganini aniqlaydigan **yaxlitlik tekshiruvchisi**:

```python
#!/usr/bin/env python3
"""yaxlitlik.py — katalogdagi fayllar o'zgarganini aniqlaydi.

    python3 yaxlitlik.py saqla  /etc/ssh      — hozirgi holatni eslab qolish
    python3 yaxlitlik.py tekshir /etc/ssh     — saqlangan holat bilan solishtirish
"""
import hashlib
import json
import sys
from pathlib import Path

BAZA = "yaxlitlik.json"


def fayl_xeshi(yol):
    h = hashlib.sha256()
    with open(yol, "rb") as f:
        while bolak := f.read(65536):
            h.update(bolak)
    return h.hexdigest()


def katalog_holati(katalog):
    """{fayl yo'li: xesh} lug'atini qaytaradi."""
    holat = {}
    for yol in Path(katalog).rglob("*"):
        if yol.is_file():
            try:
                holat[str(yol)] = fayl_xeshi(yol)
            except PermissionError:
                print(f"  o'tkazib yuborildi (ruxsat yo'q): {yol}")
    return holat


def main():
    if len(sys.argv) != 3 or sys.argv[1] not in ("saqla", "tekshir"):
        print(__doc__)
        sys.exit(1)

    amal, katalog = sys.argv[1], sys.argv[2]
    hozir = katalog_holati(katalog)

    if amal == "saqla":
        with open(BAZA, "w") as f:
            json.dump(hozir, f, indent=2)
        print(f"{len(hozir)} ta fayl holati saqlandi")
        return

    with open(BAZA) as f:
        avval = json.load(f)

    yangi = set(hozir) - set(avval)
    ochgan = set(avval) - set(hozir)
    ozgargan = [y for y in hozir if y in avval and hozir[y] != avval[y]]

    for y in sorted(yangi):
        print(f"[+] yangi:      {y}")
    for y in sorted(ochgan):
        print(f"[-] o'chirilgan: {y}")
    for y in sorted(ozgargan):
        print(f"[!] O'ZGARGAN:  {y}")

    if not (yangi or ochgan or ozgargan):
        print("O'zgarish yo'q")


if __name__ == "__main__":
    main()
```

Bu yerda oldingi darslarning hammasi bor: funksiyalar, lug'at, **to'plamlar farqi** (yangi va yo'qolgan fayllar), JSON, xatolarni ushlash.

Bunday vosita **file integrity monitoring** (FIM) deyiladi va u himoyaning haqiqiy, keng qo'llaniladigan usuli: `/etc`, veb-sayt katalogi, tizim dasturlari kutilmaganda o'zgarsa — bu tekshirishni talab qiladigan signal. Professional vositalar (AIDE, Tripwire, Wazuh) aynan shu g'oyaga qurilgan.

:::info
Qaysi xesh algoritmi? **SHA-256** — bugungi standart. **MD5** va **SHA-1** eskirgan: ular uchun bir xil xeshli ikki xil fayl yasash mumkin. Ularni hali ham fayl identifikatori sifatida uchratasiz (masalan, zararli dastur namunalari bazalarida), lekin xavfsizlik qarori uchun ishlatilmaydi.
:::

## 2. Xizmat ishlayaptimi: socket

`socket` — tarmoq ulanishlarining eng past darajadagi moduli. Tarmoq bosqichidagi TCP ulanishini endi o'zingiz o'rnatasiz.

Eng oddiy savol: "serverimdagi falon port javob beryaptimi?"

```python
import socket

def port_ochiqmi(manzil, port, kutish=1.0):
    """TCP ulanish o'rnatilsa True qaytaradi."""
    try:
        with socket.create_connection((manzil, port), timeout=kutish):
            return True
    except (ConnectionRefusedError, socket.timeout, OSError):
        return False

print(port_ochiqmi("127.0.0.1", 22))
```

`create_connection` — TCP handshake'ni bajaradi (SYN → SYN-ACK → ACK). Muvaffaqiyatli bo'lsa — port ochiq. `timeout` — javob kutish vaqti: usiz dastur filtrlangan portda uzoq osilib qoladi.

Undan **xizmatlar monitoringi** yasaymiz — o'z serverlaringiz uchun "hammasi joyidami?" tekshiruvi:

```python
#!/usr/bin/env python3
"""xizmatlar.py — o'z serverlarimdagi xizmatlar holatini tekshiradi."""
import socket
from datetime import datetime

# Faqat o'zingiz boshqaradigan tizimlar!
KUTILGAN = {
    "127.0.0.1": {22: "SSH", 80: "HTTP", 5432: "PostgreSQL"},
}


def port_ochiqmi(manzil, port, kutish=1.0):
    try:
        with socket.create_connection((manzil, port), timeout=kutish):
            return True
    except OSError:
        return False


print(f"Tekshiruv: {datetime.now():%Y-%m-%d %H:%M}")
for manzil, xizmatlar in KUTILGAN.items():
    print(f"\n{manzil}")
    for port, nomi in xizmatlar.items():
        holat = "ishlayapti" if port_ochiqmi(manzil, port) else "JAVOB YO'Q"
        print(f"  {port:5}  {nomi:12} {holat}")
```

Buni cron'ga qo'shsangiz (Linux bosqichi) — har besh daqiqada xizmatlaringiz holatini biladigan oddiy monitoring tayyor.

Xizmat o'zini qanday tanishtirishini (bannerini) ham o'qish mumkin — tarmoq bosqichidagi `nc manzil port` ning o'xshashi:

```python
with socket.create_connection(("127.0.0.1", 22), timeout=2) as s:
    banner = s.recv(1024).decode(errors="replace").strip()
    print(banner)       # SSH-2.0-OpenSSH_9.6p1 ...
```

O'z serveringiz uchun bu foydali tekshiruv: **u tashqi dunyoga o'zi haqida nima deyapti?** Versiya ko'rinib turgan bo'lsa va u eski bo'lsa — yangilash vaqti kelgan.

## 3. Veb-saytni tekshirish: requests

`requests` — HTTP so'rovlar uchun eng mashhur kutubxona (`pip install requests`). HTTP darsidagi `curl` — endi Python'da:

```python
import requests

javob = requests.get("https://example.com", timeout=10)

javob.status_code           # 200
javob.headers               # sarlavhalar lug'ati
javob.text                  # sahifa matni
javob.url                   # yo'naltirishlardan keyingi manzil
javob.json()                # javob JSON bo'lsa — dict
```

Boshqa metodlar va sozlamalar:

```python
requests.post(url, data={"ism": "ali"})          # forma
requests.post(url, json={"ism": "ali"})          # JSON
requests.get(url, headers={"User-Agent": "mening-skriptim/1.0"})
requests.get(url, params={"q": "kali", "sahifa": 2})   # ?q=kali&sahifa=2
```

:::tip
`timeout` ni **doim** ko'rsating. Usiz javob bermaydigan server skriptingizni abadiy to'xtatib qo'yadi. Va o'z skriptingizga tanib bo'ladigan `User-Agent` bering — jurnalda u nima ekani ko'rinib tursin.
:::

### Xavfsizlik sarlavhalarini tekshirish

Veb-server javobga qo'shadigan ba'zi sarlavhalar brauzerga himoya ko'rsatmalarini beradi. Ular yo'q bo'lsa — sayt zaifroq. O'z saytingizni tekshiradigan vosita:

```python
#!/usr/bin/env python3
"""sarlavhalar.py — saytning xavfsizlik sarlavhalarini tekshiradi."""
import sys
import requests

KERAKLI = {
    "Strict-Transport-Security": "brauzerni faqat HTTPS ishlatishga majburlaydi",
    "Content-Security-Policy": "qaysi manbalardan skript yuklanishini cheklaydi (XSS ga qarshi)",
    "X-Content-Type-Options": "brauzerning fayl turini taxmin qilishini taqiqlaydi",
    "X-Frame-Options": "sahifani begona saytga ramka ichida joylashni taqiqlaydi",
    "Referrer-Policy": "boshqa saytlarga qancha manzil ma'lumoti ketishini cheklaydi",
}
OSHKOR_QILUVCHI = ["Server", "X-Powered-By"]


def main():
    if len(sys.argv) != 2:
        print(f"Ishlatilishi: {sys.argv[0]} https://mening-saytim.example.com")
        sys.exit(1)

    try:
        javob = requests.get(sys.argv[1], timeout=10)
    except requests.RequestException as xato:
        print(f"So'rov bajarilmadi: {xato}")
        sys.exit(1)

    print(f"{javob.url} — status {javob.status_code}\n")

    for nom, vazifa in KERAKLI.items():
        if nom in javob.headers:
            print(f"[+] {nom}")
        else:
            print(f"[-] {nom} YO'Q — {vazifa}")

    print()
    for nom in OSHKOR_QILUVCHI:
        if nom in javob.headers:
            print(f"[i] {nom}: {javob.headers[nom]} — versiya oshkor bo'lmoqda")

    if javob.url.startswith("http://"):
        print("[-] Sayt HTTPS ga yo'naltirmayapti")


if __name__ == "__main__":
    main()
```

```bash
python3 sarlavhalar.py https://mening-saytim.example.com
```

Bu vosita HTTP darsidagi uch g'oyani tekshiradi: sayt HTTPS ishlatadimi, brauzerga himoya ko'rsatmalarini beradimi va o'z versiyasini e'lon qilib yuboradimi. AppSec yo'nalishida har bir sarlavhani chuqur o'rganasiz.

### API bilan ishlash

Zamonaviy xavfsizlik ishining katta qismi — xizmatlarning API'lari bilan gaplashish: tahdid ma'lumotlari bazalari, tiket tizimlari, bulut provayderlari. Sxema doim bir xil:

```python
import os
import requests

KALIT = os.environ["API_KALITI"]        # kalit kodda EMAS, muhit o'zgaruvchisida

javob = requests.get(
    "https://api.example.com/v1/tekshir",
    params={"ip": "203.0.113.45"},
    headers={"Authorization": f"Bearer {KALIT}"},
    timeout=10,
)
javob.raise_for_status()                # 4xx/5xx bo'lsa — xato ko'taradi
malumot = javob.json()
print(malumot.get("obro", "noma'lum"))
```

:::key
**API kalitini hech qachon kodga yozmang.** Kalit — bu parol. Kod Git'ga tushadi, hamkasblarga yuboriladi, zaxira nusxalarda qoladi. GitHub'da tasodifan e'lon qilingan kalitlar bir necha daqiqa ichida avtomatik skanerlar tomonidan topiladi. To'g'ri joyi — muhit o'zgaruvchisi (`os.environ`) yoki alohida, Git'ga kiritilmaydigan `.env` fayl.
:::

## 4. Hammasi birga

Uch tekshiruvni bitta hisobotga yig'adigan "ertalabki tekshiruv" skripti — endi uni o'zingiz yoza olasiz. Tuzilishi:

```python
def main():
    hisobot = {
        "vaqt": datetime.now().isoformat(),
        "xizmatlar": xizmatlarni_tekshir(KUTILGAN),
        "fayllar": yaxlitlikni_tekshir("/etc/ssh"),
        "sayt": sarlavhalarni_tekshir("https://mening-saytim.example.com"),
    }
    with open("hisobot.json", "w") as f:
        json.dump(hisobot, f, indent=2, ensure_ascii=False)
```

Har bir funksiya lug'at qaytaradi; `main` ularni yig'ib, JSON'ga yozadi. Natijani boshqa dastur o'qiydi yoki u sizga xabar yuboradi.

Bu — **avtomatlashtirish**ning mohiyati: har kuni qo'lda qilinadigan o'n daqiqalik ish bir marta yozilgan skriptga aylanadi. SOC'da ham, tizim ma'murligida ham, pentestda ham Python aynan shu uchun kerak.

## Vosita yozish odobi

Tarmoq bilan ishlaydigan dastur yozganingizda mas'uliyat ham siz bilan:

| Qoida | Nega |
|---|---|
| **Faqat ruxsat berilgan nishonlar** | Vosita kimniki ekani ahamiyatsiz — javobgar uni ishga tushirgan odam |
| **Sekinlashtiring** | Sikl ichida `time.sleep()` — xizmatni so'rovlar bilan bosib qo'ymaslik uchun |
| **`timeout` qo'ying** | Dastur osilib qolmasin |
| **O'zingizni tanishtiring** | Aniq `User-Agent` — jurnalda kim ekaningiz ko'rinsin |
| **Sirlarni kodga yozmang** | Kalitlar, parollar — muhit o'zgaruvchilarida |
| **Kirishni tekshiring** | Foydalanuvchi bergan manzil va yo'lni tekshirmasdan ishlatmang |
| **Natijani ehtiyotkorlik bilan saqlang** | Hisobotda sezgir ma'lumot bo'lishi mumkin |

Oxirgi maslahat: tayyor vosita bor ishni qayta yozmang. Nmap, curl, Wireshark yillar davomida sayqallangan. Python — ularni **birlashtirish**, natijalarini **qayta ishlash** va tayyor vosita yo'q joyda **o'zingiznikini yozish** uchun.

:::try
1. `yaxlitlik.py` ni yozing. Sinov katalogi yarating, bir necha fayl qo'ying, `saqla` qiling. Keyin bitta faylni o'zgartiring, bittasini o'chiring, bitta yangi qo'shing va `tekshir` ni ishga tushiring.
2. Kali'da SSH'ni yoqing (`sudo systemctl start ssh`) va `xizmatlar.py` bilan `127.0.0.1` ni tekshiring. Keyin SSH'ni to'xtatib, qayta tekshiring.
3. Banner o'qish kodini `127.0.0.1:22` uchun ishga tushiring. Kali'ngizdagi OpenSSH versiyasi qanday?
4. `sarlavhalar.py` ni o'z saytingizga (yoki sinov uchun mo'ljallangan `https://example.com` ga) nisbatan ishga tushiring.
5. Yuklab olgan Kali faylingiz (yoki istalgan katta fayl) SHA-256 xeshini `fayl_xeshi()` bilan hisoblang va natijani terminaldagi `sha256sum fayl` (Windows'da `certutil -hashfile fayl SHA256`) bilan solishtiring.
:::

## Xulosa

- **hashlib** — xesh hisoblash; fayl uchun `"rb"` rejimida bo'laklab. SHA-256 — standart; MD5 va SHA-1 — eskirgan.
- Xeshlarni solishtirish = **yaxlitlik monitoringi**: yangi, o'chirilgan, o'zgargan fayllar.
- **socket** — `create_connection((manzil, port), timeout=...)` bilan port tekshirish; `recv` bilan banner o'qish.
- **requests** — `get/post`, `status_code`, `headers`, `json()`; `timeout` doim.
- Xavfsizlik sarlavhalari: HSTS, CSP, X-Content-Type-Options, X-Frame-Options.
- API kalitlari — kodda emas, muhit o'zgaruvchisida.
- Vositalarni faqat o'z tizimlaringiz va ruxsat berilgan nishonlarga qarating.

:::quiz
? Faylning xeshini hisoblash uchun uni qaysi rejimda ochish kerak?
- "r" — matn sifatida
+ "rb" — baytlar sifatida
- "w" — yozish uchun
- "a" — qo'shish uchun
! Xesh baytlar ustida hisoblanadi. Matn rejimida kodlash va qator oxirlari o'zgartirilishi mumkin — natija noto'g'ri chiqadi.

? Yuklab olingan fayl xeshi saytda ko'rsatilgan qiymatga mos kelmadi. Bu nimani anglatadi?
- Hech narsa — xeshlar har safar boshqacha chiqadi
+ Fayl yo'lda buzilgan yoki almashtirilgan — uni ishlatmaslik kerak
- Fayl juda katta
- Internet sekin
! Bir xil fayl doim bir xil xesh beradi. Farq — fayl asl nusxa emasligining belgisi.

? Bugun xavfsizlik maqsadida qaysi xesh algoritmi tavsiya etiladi?
- MD5
- SHA-1
+ SHA-256
- Base64
! MD5 va SHA-1 uchun to'qnashuvlar topilgan — ular eskirgan. Base64 esa umuman xesh emas, kodlash.

? `socket.create_connection((manzil, port), timeout=1)` muvaffaqiyatli bajarilsa, bu nimani bildiradi?
- Server o'chiq
+ Shu portda TCP ulanish o'rnatildi — xizmat tinglayapti
- Port firewall bilan to'silgan
- DNS ishlamayapti
! Funksiya TCP handshake'ni bajaradi. Muvaffaqiyat — port ochiq va xizmat javob beryapti degani.

? Nega tarmoq so'rovlarida `timeout` ko'rsatish muhim?
- So'rov tezroq bajariladi
+ Javob bermaydigan server dasturni cheksiz kutishga majburlamasligi uchun
- Bu shifrlashni yoqadi
- Bu majburiy sintaksis
! timeout'siz dastur javob kelmaguncha osilib turadi — bu skriptlarning eng keng tarqalgan muammosi.

? `javob = requests.get(url)` dan keyin status kodini qanday olinadi?
- javob.code
+ javob.status_code
- javob.status()
- javob.http
! status_code — javobning HTTP status kodi (200, 404, ...). Sarlavhalar — javob.headers, matn — javob.text.

? API kalitini qayerda saqlash to'g'ri?
- Kodning boshida o'zgaruvchi sifatida
- Izoh ichida
+ Muhit o'zgaruvchisida yoki Git'ga kiritilmaydigan alohida faylda
- Fayl nomida
! Kalit — parol. Kodga yozilsa, u Git tarixi, nusxalar va zaxiralar orqali tarqaladi.

? `Strict-Transport-Security` sarlavhasi nima qiladi?
- Sahifani shifrlaydi
+ Brauzerga bu sayt bilan faqat HTTPS orqali ishlashni buyuradi
- Cookie'larni o'chiradi
- JavaScript'ni taqiqlaydi
! HSTS brauzerni keyingi safar ham HTTPS ishlatishga majburlaydi — ochiq HTTP ga tushirish hujumlaridan himoya qiladi.

? Katalogdagi fayllar xeshini saqlab, keyin solishtirib turish nima deyiladi?
- Port skanerlash
+ Fayl yaxlitligi monitoringi (FIM)
- Zaxira nusxa
- Shifrlash
! FIM muhim fayllardagi kutilmagan o'zgarishni aniqlaydi — himoyaning keng qo'llaniladigan usuli.

? O'zingiz yozgan tarmoq vositasini qayerda ishlatish mumkin?
- Istalgan saytda — men faqat o'rganyapman
- Faqat chet el saytlarida
+ Faqat o'zimga tegishli yoki tekshirishga yozma ruxsat berilgan tizimlarda
- Kechasi, hech kim sezmaganda
! Ruxsat masalasi vosita kimniki ekaniga bog'liq emas. Ruxsatsiz so'rov yuborish — qonunbuzarlik.

? Serverning `Server: nginx/1.18.0` sarlavhasi nega e'tiborga loyiq?
- U sahifani sekinlashtiradi
+ U dastur va versiyani oshkor qiladi — shu versiya zaifliklari ma'lum bo'lishi mumkin
- U cookie'larni o'chiradi
- U noto'g'ri yozilgan
! Versiya ma'lumoti hujumchiga qidiruvni osonlashtiradi. Yashirish foydali, lekin asosiy chora — yangilab turish.
:::

:::cards
Faylning SHA-256 xeshini hisoblash? :: hashlib.sha256() yaratib, faylni "rb" rejimida bo'laklab o'qish va update() qilish; oxirida hexdigest().
Xesh nima uchun ishlatiladi? :: Fayl o'zgarmaganini tekshirish (yaxlitlik) va yuklab olingan fayl asl ekanini tasdiqlash.
Qaysi xesh algoritmlari eskirgan? :: MD5 va SHA-1. Standart — SHA-256.
FIM nima? :: File Integrity Monitoring — muhim fayllar xeshini saqlab, o'zgarishlarni aniqlash.
Python'da port ochiqligini tekshirish? :: socket.create_connection((manzil, port), timeout=1) — xato bermasa, port ochiq.
requests bilan GET so'rov va javob maydonlari? :: javob = requests.get(url, timeout=10); javob.status_code, javob.headers, javob.text, javob.json().
Nega timeout doim kerak? :: Javob bermaydigan server dasturni cheksiz kutishga majburlamasligi uchun.
API kaliti qayerda saqlanadi? :: Muhit o'zgaruvchisida (os.environ) yoki Git'ga kirmaydigan .env faylda — kodda emas.
Asosiy xavfsizlik sarlavhalari? :: Strict-Transport-Security, Content-Security-Policy, X-Content-Type-Options, X-Frame-Options.
Xizmat bannerini o'qish? :: Ulanib, s.recv(1024) bilan birinchi javobni o'qish — xizmat nomi va versiyasi.
Tarmoq vositasi yozish qoidalari? :: Faqat ruxsat berilgan nishon, timeout, sekinlashtirish, aniq User-Agent, sirlar kodda emas.
:::
