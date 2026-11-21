Phishing ogohlantirishi keldi. Siz bilasiz nima qilish kerak (b1 bosqichi): xatdan havolalar va ilovalarni ajratish, xeshlarni hisoblash, har bir domen, IP va xeshni VirusTotal'da, AbuseIPDB'da, whois'da tekshirish, natijalarni tiketga yozish, shu xatni yana kim olganini qidirish. 15 daqiqa.

Bugun shunday ogohlantirishlardan 40 ta. Bu — 10 soat bir xil, zerikarli, xato qilish oson bo'lgan ish. Analitik charchaydi, triage sifati tushadi, va haqiqiy hujum shovqinda yo'qoladi (SOC tuzilmasi darsidagi alert fatigue).

Yechim — **takroriy ishni mashinaga topshirish**. Bu darsda ikki darajada o'rganasiz: o'zingiz yozadigan kichik **Python** skriptlari va butun jamoa ishlatadigan **SOAR** platformalari. Dasturlash bosqichidagi Python bilimingiz shu yerda haqiqiy SOC quroliga aylanadi.

## Nimani avtomatlashtirish kerak

Hamma narsani emas. Yaxshi nomzodlar:

| Avtomatlashtirish uchun yaxshi | Odamda qolishi kerak |
|---|---|
| Takrorlanadigan, aniq qadamlar | Noaniq vaziyatlarda qaror |
| IOC'larni boyitish (VirusTotal, AbuseIPDB, whois) | "Bu insidentmi?" degan yakuniy hukm |
| Ma'lumot yig'ish va formatlash | Biznesga ta'sir qiladigan choralar (muhim serverni o'chirish) |
| Tiket ochish va to'ldirish | Rahbariyat va mijozlar bilan aloqa |
| Ma'lum, past xavfli choralar (ma'lum zararli domenni bloklash) | Yangi, noodatiy holatlar |

Qoida: **mashina yig'adi va tayyorlaydi, odam qaror qiladi.** Ayniqsa boshida. Ishonch ortgani sari ba'zi past xavfli qarorlar ham avtomatlashtiriladi (b2 bosqichidagi Wazuh active response haqidagi ehtiyotkorlik bilan).

## Python bilan IOC tekshiruvchi

Tahdid razvedkasi darsidagi qo'lda bajarilgan boyitishni avtomatlashtiramiz: IOC'lar ro'yxatini oladi, har birining turini aniqlaydi va mos xizmatlarda tekshiradi.

### API va kalitlar

Ko'p xavfsizlik xizmatlari **API** taqdim etadi — dasturlar uchun interfeys. Ro'yxatdan o'tganingizda **API kalit** olasiz: bu sizning paroliz.

:::warn
**API kalit — parol. Uni hech qachon kod ichiga yozmang va GitHub'ga joylamang.** Ochiq omborlarda sizib chiqqan kalitlarni avtomatik qidiradigan botlar bor — kalitingiz bir necha daqiqada topiladi. To'g'ri usul: kalitni **muhit o'zgaruvchisida** saqlash (Linux bosqichidagi environment variables) va `.env` kabi fayllarni `.gitignore` ga qo'shish (dasturlash bosqichidagi Git darsi). Bepul rejalarning **so'rovlar chegarasi** bor (masalan, VirusTotal'ning ommaviy API'si daqiqasiga bir necha so'rov) — skript shunga moslashishi kerak. Va xizmat shartlarini o'qing: ba'zi bepul API'lar tijoriy foydalanishga ruxsat bermaydi.
:::

```bash
# Linux/macOS: kalitlarni muhit o'zgaruvchisiga
export VT_API_KEY="sizning_kalitingiz"
export ABUSEIPDB_API_KEY="sizning_kalitingiz"
```

```powershell
# Windows PowerShell (joriy sessiya uchun)
$env:VT_API_KEY = "sizning_kalitingiz"
$env:ABUSEIPDB_API_KEY = "sizning_kalitingiz"
```

### Skript

```python
#!/usr/bin/env python3
"""IOC tekshiruvchi: xesh, IP va domenlarni VirusTotal va AbuseIPDB'da tekshiradi."""
import ipaddress
import os
import re
import sys
import time

import requests

VT_KEY = os.environ.get("VT_API_KEY")
ABUSE_KEY = os.environ.get("ABUSEIPDB_API_KEY")
VT_PAUZA = 16  # bepul VirusTotal API: daqiqasiga 4 ta so'rov


def refang(ioc: str) -> str:
    """hxxp://example[.]net → http://example.net (hisobotlardagi defang qilingan IOC'lar)."""
    return ioc.strip().replace("[.]", ".").replace("hxxp", "http")


def ioc_turi(ioc: str) -> str:
    if re.fullmatch(r"[A-Fa-f0-9]{64}", ioc):
        return "sha256"
    try:
        ipaddress.ip_address(ioc)
        return "ip"
    except ValueError:
        pass
    if re.fullmatch(r"(?:[A-Za-z0-9-]+\.)+[A-Za-z]{2,}", ioc):
        return "domen"
    return "noma'lum"


def virustotal(ioc: str, turi: str) -> str:
    yol = {"sha256": "files", "ip": "ip_addresses", "domen": "domains"}[turi]
    javob = requests.get(
        f"https://www.virustotal.com/api/v3/{yol}/{ioc}",
        headers={"x-apikey": VT_KEY},
        timeout=20,
    )
    if javob.status_code == 404:
        return "VT: topilmadi (noma'lum — 'toza' degani emas)"
    javob.raise_for_status()
    stat = javob.json()["data"]["attributes"]["last_analysis_stats"]
    return f"VT: {stat['malicious']} zararli, {stat['suspicious']} shubhali / {sum(stat.values())} jami"


def abuseipdb(ip: str) -> str:
    javob = requests.get(
        "https://api.abuseipdb.com/api/v2/check",
        headers={"Key": ABUSE_KEY, "Accept": "application/json"},
        params={"ipAddress": ip, "maxAgeInDays": 90},
        timeout=20,
    )
    javob.raise_for_status()
    d = javob.json()["data"]
    return f"AbuseIPDB: ishonch bali {d['abuseConfidenceScore']}%, {d['totalReports']} ta shikoyat"


def tekshir(ioc: str) -> list[str]:
    turi = ioc_turi(ioc)
    if turi == "noma'lum":
        return ["turi aniqlanmadi — o'tkazib yuborildi"]
    if turi == "ip" and not ipaddress.ip_address(ioc).is_global:
        # Ichki manzillarni tashqi xizmatlarga yubormaymiz (OPSEC)
        return ["ichki yoki maxsus manzil — tashqi xizmatlarga yuborilmadi"]
    natija = []
    if VT_KEY:
        natija.append(virustotal(ioc, turi))
        time.sleep(VT_PAUZA)
    if turi == "ip" and ABUSE_KEY:
        natija.append(abuseipdb(ioc))
    return natija or ["API kalitlari topilmadi"]


def main() -> None:
    if len(sys.argv) != 2:
        sys.exit("Foydalanish: python ioc_tekshir.py ioclar.txt")
    with open(sys.argv[1], encoding="utf-8") as f:
        ioclar = [refang(qator) for qator in f if qator.strip() and not qator.startswith("#")]
    for ioc in ioclar:
        print(f"\n{ioc}  [{ioc_turi(ioc)}]")
        try:
            for qator in tekshir(ioc):
                print("  " + qator)
        except requests.RequestException as xato:
            print(f"  xato: {xato}")


if __name__ == "__main__":
    main()
```

Ishlatish:

```bash
pip install requests
cat > ioclar.txt << 'EOF'
# Laboratoriya sinovi
8.8.8.8
example.com
10.10.10.23
EOF
python ioc_tekshir.py ioclar.txt
```

### Skriptdagi muhim qarorlar

| Qaror | Nega |
|---|---|
| `refang()` | Hisobotlardagi IOC'lar defang qilingan (trafik tahlili darsi) — avval asl ko'rinishga qaytarish kerak |
| `is_global` tekshiruvi | **Ichki IP'larni tashqi xizmatlarga yubormaslik** — tahdid razvedkasi darsidagi OPSEC qoidasi kodda |
| 404 → "noma'lum" | "Topilmadi" ≠ "toza" — skript ham buni aniq aytadi |
| `time.sleep` | Bepul API chegarasiga rioya qilish; aks holda xizmat bloklaydi |
| `timeout=20` | Xizmat javob bermasa, skript abadiy kutib qolmasligi uchun |
| `try / except` | Bitta IOC'dagi xato butun ro'yxatni to'xtatmasligi uchun |
| Kalitlar `os.environ` dan | Kodda maxfiy ma'lumot yo'q — uni bemalol GitHub'ga joylash mumkin |

Bu skriptni kengaytirish oson: whois (domen yoshi), urlscan.io, tahdid razvedkasi darsidagi boshqa xizmatlar; natijani CSV'ga yoki tiket tizimiga yozish. Shu bosqichning "Kamida bitta IOC tekshiruvchi skript yozdim" maqsadi — aynan shu.

## Python'ning boshqa SOC qo'llanishlari

| Vazifa | Kutubxona yoki usul |
|---|---|
| Loglarni tahlil qilish (CSV, JSON) | `csv`, `json`, `pandas` |
| SIEM'dan ma'lumot olish | Splunk, Elastic, Sentinel API'lari (Python SDK'lar) |
| Pochta tahlili (`.eml`) | `email` modul — sarlavhalar, havolalar, ilovalarni ajratish (phishing darsi) |
| Fayl xeshlari | `hashlib` (dasturlash bosqichi) |
| PE tahlili | `pefile` (statik tahlil darsi) |
| YARA | `yara-python` (YARA darsi) |
| Hisobotlar | Shablonlar, Markdown, CSV |

Masalan, phishing darsidagi `.eml` faylidan havolalarni ajratish — o'n qator kod:

```python
import email
import re
from email import policy

with open("shubhali.eml", "rb") as f:
    xat = email.message_from_binary_file(f, policy=policy.default)

print("From:       ", xat["From"])
print("Return-Path:", xat["Return-Path"])
print("Reply-To:   ", xat["Reply-To"])

tana = xat.get_body(preferencelist=("html", "plain"))
matn = tana.get_content() if tana else ""
for url in sorted(set(re.findall(r'https?://[^\s"\'<>]+', matn))):
    print("Havola:", url)
```

## SOAR — jamoa darajasida avtomatlashtirish

O'z skriptlaringiz — ajoyib boshlanish. Lekin jamoa uchun yagona, nazorat qilinadigan tizim kerak. b2 bosqichidagi SIEM darsida tilga olingan [[soar|SOAR]] — Security Orchestration, Automation and Response:

| Qism | Ma'nosi |
|---|---|
| **Orchestration** | Turli tizimlarni bog'lash: SIEM, EDR, pochta, firewall, tiket tizimi, tahdid razvedkasi |
| **Automation** | Qadamlarni avtomatik bajarish |
| **Response** | Choralarni ko'rish va boshqarish |

### Playbook

SOAR'ning markazida — [[playbook|playbook]]: ogohlantirish turi uchun qadamlar ketma-ketligi. b1 bosqichida playbook'ni analitik uchun **yo'riqnoma** sifatida ko'rgan edingiz; SOAR'da u **bajariladigan** oqimga aylanadi:

```
TRIGGER: "Phishing xabar qilindi" (pochta qutisi yoki SIEM ogohlantirishi)
   │
   ├─► Xatdan ajratish: From, Return-Path, havolalar, ilovalar xeshlari
   │
   ├─► Boyitish (parallel):
   │     ├─ havolalar → urlscan, VirusTotal
   │     ├─ jo'natuvchi domen → whois (yoshi), obro'
   │     └─ xeshlar → VirusTotal
   │
   ├─► Qamrov: pochta tizimida shu jo'natuvchi/mavzudan xatlarni qidirish → nechta qutiga keldi?
   │
   ├─► Proxy loglari: kim havolani bosdi? Kim POST yubordi?
   │
   ├─► Tiket yaratish: barcha natijalar bilan, ustuvorlik hisoblangan
   │
   └─► QAROR (analitik): ┬─ Zararli → [tasdiqlash] → xatlarni o'chirish, domenni bloklash,
                         │               POST yuborganlar parolini tiklash
                         └─ Zararsiz → yopish, xodimga javob
```

E'tibor bering: **yakuniy qaror va keskin choralar oldidan — odam tasdig'i**. Analitik 15 daqiqa o'rniga 2 daqiqa sarflaydi — chunki hamma ma'lumot tayyor.

### SOAR platformalari

| Platforma | Turi |
|---|---|
| **Splunk SOAR**, **Microsoft Sentinel** (Logic Apps), **Palo Alto Cortex XSOAR** | Tijoriy |
| **Shuffle** | Ochiq kod — laboratoriya uchun yaxshi |
| **TheHive** + **Cortex** | Ochiq kod: insidentlar boshqaruvi + avtomatik tahlil (analyzers) |
| **n8n**, **Tines** (bepul reja) | Umumiy avtomatlashtirish; xavfsizlik jamoalarida ham ishlatiladi |

Laboratoriyangizda (b2 bosqichi) Shuffle'ni Wazuh bilan bog'lashingiz mumkin: Wazuh ogohlantirishi → Shuffle → IOC boyitish → TheHive'da tiket. Bu — portfolio uchun juda kuchli loyiha (shu bosqichdagi laboratoriya darsi).

:::key
**Avtomatlashtirish yaxshi jarayonni tezlashtiradi — yomonini esa yomonroq qiladi.** Agar qo'lda bajariladigan triage jarayoni aniq va hujjatlashtirilmagan bo'lsa, uni avtomatlashtirish shunchaki xatolarni tezroq takrorlaydi. Avval jarayonni qo'lda bajaring, hujjatlashtiring, chegaraviy holatlarni tushuning — keyin avtomatlashtiring. Va avtomatlashtirilgan har bir harakat **yozib boriladi**: kim (qaysi playbook), qachon, nima qildi — IR'dagi kotib qoidasi mashinalarga ham tegishli.
:::

## Avtomatlashtirishning xavflari

| Xavf | Misol | Himoya |
|---|---|---|
| Noto'g'ri avtomatik chora | False positive sababli muhim xizmat IP'si bloklandi | Keskin choralar oldidan tasdiq; ruxsat etilgan ro'yxat (allowlist) |
| Hujumchi tomonidan suiiste'mol | Hujumchi soxta ogohlantirishlar bilan sizni o'z tizimlaringizni bloklashga majbur qiladi | Wazuh darsidagi active response ogohlantirishi |
| Maxfiy ma'lumot sizishi | Skript ichki fayllarni ommaviy sandbox'ga yuklaydi | Faqat xeshlar; ichki ma'lumotlar uchun filtr |
| Kalitlar sizishi | API kalit GitHub'da | Muhit o'zgaruvchilari, maxfiy ma'lumotlar ombori |
| Jim buzilish | API formati o'zgardi — skript bo'sh natija qaytaradi | Xatolarni aniq ko'rsatish, monitoring, testlar |
| Ko'nikmani yo'qotish | Analitiklar skript nima qilayotganini tushunmay qoladi | Avtomatlashtirilgan qadamlar hujjatlashtiriladi; qo'lda bajarishni bilish |

## Avtomatlashtirish nimani qilmaydi

- **Fikrlashning o'rnini bosmaydi** — u ma'lumot tayyorlaydi; qaror — analitikniki.
- **Yangi turdagi hujumlarni o'zi tushunmaydi** — playbook faqat oldindan ko'zda tutilgan stsenariylar uchun.
- **Yomon jarayonni tuzatmaydi** — tezlashtiradi.
- **O'z-o'zidan to'g'ri ishlamaydi** — API'lar, formatlar va tizimlar o'zgaradi; skriptlar va playbook'lar qo'llab-quvvatlanishi kerak.

:::try
**1. Skriptni ishga tushiring.** VirusTotal va AbuseIPDB'da bepul ro'yxatdan o'ting, kalitlarni muhit o'zgaruvchilariga qo'ying va yuqoridagi skriptni zararsiz IOC'lar bilan sinang (`8.8.8.8`, `example.com`, `10.10.10.23`). Ichki IP uchun skript nima dedi? Nega?

**2. Kengaytiring.** Skriptga quyidagilardan birini qo'shing:
- (a) natijalarni `natija.csv` fayliga yozish (`csv` moduli);
- (b) domenlar uchun ro'yxatdan o'tgan sanani olish (`python-whois` kutubxonasi);
- (c) tahdid razvedkasi darsidagi defang qilingan IOC'larni (`hxxps://...[.]net/...`) to'g'ri qayta ishlash — URL'dan domenni ajratish (`urllib.parse`).

**3. Git'ga xavfsiz joylang.** Skriptni GitHub'dagi portfolio omboringizga joylang. `.gitignore` ga `.env` ni qo'shing va `git log -p` bilan tekshiring: kalitlar hech qayerda yo'qmi?

**4. Playbook chizing.** "Ko'p muvaffaqiyatsiz kirish, keyin muvaffaqiyatli kirish" ogohlantirishi (b1 bosqichidagi Windows darsi) uchun SOAR playbook'ini yuqoridagi kabi chizing: trigger, boyitish, qamrov, tiket, qaror nuqtalari.

**5. TryHackMe** — "SOAR" xonasini bajaring.

*Javoblar: 1 — `10.10.10.23` xususiy (ichki) manzil, `is_global` False qaytaradi — skript uni tashqi xizmatlarga yubormaydi. Bu OPSEC qoidasining kodda amalga oshirilishi. 2c — maslahat: `refang()` dan keyin `urllib.parse.urlparse(url).hostname` domenni beradi.*
:::

## Xulosa

- Takroriy, aniq qadamlarni avtomatlashtiring; **mashina yig'adi va tayyorlaydi, odam qaror qiladi**.
- **API kalit — parol**: muhit o'zgaruvchilarida, hech qachon kodda yoki Git'da emas; so'rovlar chegarasiga rioya qiling.
- IOC tekshiruvchi skript: **refang → tur aniqlash → ichki IP'larni filtrlash (OPSEC) → VirusTotal / AbuseIPDB → xatolarni ushlash**; "topilmadi" ≠ "toza".
- Python SOC'da: loglar, SIEM API'lari, `.eml` tahlili, `hashlib`, `pefile`, `yara-python`.
- **SOAR** = orchestration + automation + response; markazida — **bajariladigan playbook**; keskin choralar oldidan odam tasdig'i.
- Platformalar: Splunk SOAR, Sentinel, Cortex XSOAR; ochiq — **Shuffle**, **TheHive + Cortex**.
- Avval jarayon, keyin avtomatlashtirish; har bir avtomatik harakat yoziladi.

:::quiz
? Qaysi vazifa avtomatlashtirish uchun eng mos?
+ IOC'larni bir nechta tahdid razvedkasi xizmatida tekshirib, natijani tiketga yozish
- Muhim serverni o'chirish haqida yakuniy qaror
- Rahbariyatga insident haqida xabar berish
- Yangi, hech qachon ko'rilmagan hujumni tahlil qilish
! Takrorlanadigan, aniq qadamlar — avtomatlashtirish uchun; noaniq qarorlar — odam uchun.

? API kalitni qayerda saqlash kerak?
- Skript kodining ichida
- GitHub'dagi README faylida
+ Muhit o'zgaruvchisida yoki maxfiy ma'lumotlar omborida, Git'ga tushmaydigan joyda
- Ommaviy chatda
! Sizib chiqqan kalitlarni botlar daqiqalar ichida topadi.

? Skriptda ichki IP manzillar (masalan, 10.10.10.23) tashqi xizmatlarga yuborilmaydi. Nega?
- Ular tekshirib bo'lmaydi
+ Ichki infratuzilma haqidagi ma'lumotni tashqi xizmatlarga oshkor qilmaslik uchun (OPSEC)
- API buni taqiqlaydi
- Ichki IP'lar har doim xavfsiz
! Bundan tashqari, ichki manzillar haqida tashqi xizmatlarda foydali ma'lumot bo'lmaydi.

? VirusTotal API 404 qaytardi. Skript nima deyishi kerak?
- “Toza”
+ “Topilmadi — noma'lum”
- “Zararli”
- Xato bilan to'xtashi kerak
! Topilmagan narsa — hali hech kim ko'rmagan narsa bo'lishi mumkin.

? Skriptda time.sleep nima uchun ishlatiladi?
+ Bepul API'ning so'rovlar chegarasidan oshmaslik uchun
- Kompyuterni sovutish uchun
- Natijani chiroyli ko'rsatish uchun
- Xatolarni yashirish uchun
! Chegaradan oshsa, xizmat so'rovlarni rad etadi yoki kalitni bloklaydi.

? SOAR'dagi playbook b1 bosqichidagi playbook'dan nimasi bilan farq qiladi?
- Hech narsasi bilan
+ U faqat yo'riqnoma emas, balki tizimlarni bog'lab avtomatik bajariladigan oqim
- U faqat qog'ozda bo'ladi
- U faqat rahbariyat uchun
! SOAR playbook'i boyitish, qidiruv va tiket kabi qadamlarni o'zi bajaradi.

? Nega SOAR playbook'ida keskin choralar oldidan odam tasdig'i qo'yiladi?
- SOAR buni qila olmaydi
+ False positive yoki hujumchi manipulyatsiyasi tufayli noto'g'ri avtomatik chora katta zarar keltirishi mumkin
- Qonun talab qiladi
- Tasdiq faqat vaqtni cho'zish uchun
! Ishonch ortgani sari past xavfli choralar avtomatlashtiriladi.

? “Avtomatlashtirish yomon jarayonni yomonroq qiladi” degan fikr nimani anglatadi?
+ Aniq va hujjatlashtirilmagan jarayon avtomatlashtirilsa, xatolar tezroq va ko'proq takrorlanadi
- Avtomatlashtirish har doim yomon
- Faqat yaxshi jarayonlar mavjud
- Jarayonni hech qachon o'zgartirmaslik kerak
! Avval jarayonni qo'lda bajarib, hujjatlashtirish, keyin avtomatlashtirish kerak.

? Qaysi platformalar ochiq kodli va laboratoriya uchun mos?
+ Shuffle
+ TheHive va Cortex
- Faqat tijoriy platformalar
- Microsoft Word
! Ularni b2 bosqichidagi Wazuh laboratoriyasi bilan bog'lash mumkin.

? API formati o'zgarib, skript jimgina bo'sh natija qaytara boshladi. Bu qanday xavf?
- Xavf yo'q
+ Jim buzilish — analitiklar tekshiruv bajarilgan deb o'ylaydi, aslida esa hech narsa tekshirilmagan
- Skript tezroq ishlaydi
- Bu faqat estetik muammo
! Xatolarni aniq ko'rsatish, monitoring va testlar kerak.
:::

:::cards
Nimani avtomatlashtirish kerak? :: Takrorlanadigan, aniq qadamlar: IOC boyitish, ma'lumot yig'ish, tiket to'ldirish, ma'lum past xavfli choralar.
Nima odamda qoladi? :: Noaniq vaziyatlarda qaror, biznesga ta'sir qiladigan choralar, aloqa, yangi holatlar.
API kalit qoidalari? :: Parol kabi: muhit o'zgaruvchisida, kodda va Git'da emas; .env .gitignore'da; so'rovlar chegarasiga rioya.
IOC tekshiruvchi skript qadamlari? :: Refang → tur aniqlash → ichki IP filtri → VirusTotal/AbuseIPDB → xatolarni ushlash → natija.
refang nima? :: Defang qilingan IOC'ni (hxxp, [.]) asl ko'rinishga qaytarish.
VirusTotal API manzili tuzilishi? :: https://www.virustotal.com/api/v3/{files|ip_addresses|domains}/{ioc}, x-apikey sarlavhasi bilan.
SOAR nima? :: Security Orchestration, Automation and Response — tizimlarni bog'lab, playbook asosida javobni avtomatlashtirish.
SOAR playbook tarkibi? :: Trigger → ajratish → boyitish → qamrov → tiket → odam qarori → choralar.
Ochiq kodli SOAR vositalari? :: Shuffle, TheHive + Cortex (shuningdek n8n kabi umumiy vositalar).
Avtomatlashtirish xavflari? :: Noto'g'ri avtomatik chora, hujumchi manipulyatsiyasi, ma'lumot va kalit sizishi, jim buzilish, ko'nikmani yo'qotish.
Avtomatlashtirishning asosiy qoidasi? :: Mashina yig'adi va tayyorlaydi, odam qaror qiladi; avval jarayon, keyin avtomatlashtirish.
Python'ning SOC'dagi qo'llanishlari? :: Log tahlili (csv, json, pandas), SIEM API'lari, .eml tahlili (email), hashlib, pefile, yara-python.
:::
