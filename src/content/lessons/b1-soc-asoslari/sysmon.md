O'tgan darsda Windows jurnallarining bo'shliqlarini sanab chiqdik: qaysi dastur qaysi manzilga ulangani yozilmaydi, ishga tushgan faylning xeshi yo'q, DNS so'rovlari ko'rinmaydi. Tasavvur qiling, kuzatuv kamerasi eshikdan kim kirganini ko'rsatadi, lekin uning qo'lida nima borligini, qaysi xonaga borganini va kim bilan telefonda gaplashganini — yo'q.

**Sysmon** — xuddi shu xonalarga qo'shimcha kamera o'rnatishdek. U Microsoft'ning bepul vositasi va dunyodagi deyarli har bir jiddiy SOC undan foydalanadi.

## Sysmon nima

[[sysmon|Sysmon]] (System Monitor) — Microsoft Sysinternals to'plamidagi bepul vosita. U Windows'ga **xizmat va drayver** sifatida o'rnatiladi va tizimdagi faoliyatni batafsil yozib boradi:

- qaysi jarayon ishga tushdi — **to'liq buyruq satri, xeshi va ota-jarayoni** bilan;
- qaysi jarayon qaysi IP va portga **tarmoq ulanishi** ochdi;
- qaysi fayl yaratildi;
- registrda nima o'zgardi;
- qaysi domen uchun **DNS so'rovi** yuborildi;
- va boshqalar.

Yozuvlar alohida jurnalga tushadi:

```
Event Viewer → Applications and Services Logs → Microsoft → Windows → Sysmon → Operational
```

Sysmon nima **qilmasligini** ham aniq biling:

| Sysmon | Sysmon emas |
|---|---|
| Ko'radi va yozadi | Hech narsani bloklamaydi |
| Bepul | Antivirus yoki [[edr|EDR]] o'rnini bosmaydi |
| Konfiguratsiyaga qarab yozadi | Konfiguratsiyasiz — yoki juda kam, yoki juda ko'p yozadi |
| Ma'lumot manbai | Tahlil qilmaydi: yozuvlarni SIEM ga yuborish va qoidalar yozish kerak |

Sysmon — "qora quti" (bortdagi yozuvchi). U samolyotni qulashdan qutqarmaydi, lekin keyin nima bo'lganini aniq aytib beradi.

## O'rnatish va konfiguratsiya

Sysmon bitta buyruq bilan o'rnatiladi (administrator sifatida):

```powershell
# O'rnatish — konfiguratsiya fayli bilan
sysmon64.exe -accepteula -i sysmonconfig.xml

# Konfiguratsiyani yangilash (qayta o'rnatmasdan)
sysmon64.exe -c sysmonconfig.xml

# Joriy konfiguratsiyani ko'rish
sysmon64.exe -c

# O'chirish
sysmon64.exe -u
```

Asosiy narsa — **konfiguratsiya fayli**. U XML formatida va Sysmon'ga nimani yozish, nimani yozmaslikni aytadi. Nega bu shunchalik muhim? Chunki hamma narsani yozsangiz, bitta kompyuter kuniga yuz minglab yozuv chiqaradi — SIEM to'lib ketadi, muhim yozuvlar shovqinda yo'qoladi. Hech narsa yozmasangiz — foydasi yo'q.

Noldan yozish shart emas. Hamjamiyat tayyorlagan, yaxshi sozlangan konfiguratsiyalar bor:

| Konfiguratsiya | Xususiyati |
|---|---|
| **SwiftOnSecurity sysmon-config** | Mashhur boshlang'ich nuqta, ko'p izohlar bilan — o'rganish uchun ideal |
| **Olaf Hartong sysmon-modular** | Modullarga bo'lingan, MITRE ATT&CK texnikalari bo'yicha belgilangan |

Odatda shulardan biri olinadi va kompaniya muhitiga moslab sozlanadi.

### Konfiguratsiya qanday tuzilgan

```xml
<Sysmon schemaversion="4.90">
  <HashAlgorithms>sha256</HashAlgorithms>
  <EventFiltering>

    <!-- Jarayonlar: hammasini yoz, lekin ma'lum shovqinni chiqarib tashla -->
    <ProcessCreate onmatch="exclude">
      <Image condition="is">C:\Windows\System32\backgroundTaskHost.exe</Image>
    </ProcessCreate>

    <!-- Tarmoq: faqat qiziq jarayonlarni yoz -->
    <NetworkConnect onmatch="include">
      <Image condition="end with">powershell.exe</Image>
      <Image condition="end with">rundll32.exe</Image>
      <DestinationPort condition="is">4444</DestinationPort>
    </NetworkConnect>

  </EventFiltering>
</Sysmon>
```

Ikki rejim bor va ularni adashtirmaslik kerak:

| Rejim | Ma'nosi | Bo'sh qolsa |
|---|---|---|
| `onmatch="include"` | Faqat mos kelganlarini yoz | **Hech narsa** yozilmaydi |
| `onmatch="exclude"` | Hammasini yoz, mos kelganlaridan tashqari | **Hamma narsa** yoziladi |

Shart turlari: `is`, `is not`, `contains`, `begins with`, `end with`, `image` va boshqalar. `schemaversion` qiymati Sysmon versiyasiga bog'liq — `sysmon64.exe -s` buyrug'i o'rnatilgan versiya sxemasini ko'rsatadi.

:::warn
**Sysmon konfiguratsiyasi — himoyaning bir qismi, va u ham hujum nishoni.** Hujumchi qurilmaga kirsa, birinchi navbatda nima kuzatilayotganini bilishga harakat qiladi — va `exclude` qoidalaridagi "ko'r nuqtalar"dan foydalanadi. Masalan, "C:\Tools\ papkasidagi hamma narsani yozma" degan qoida — tayyor yashirinish joyi. Istisnolarni iloji boricha aniq yozing: papka bo'yicha emas, to'liq yo'l, imzo yoki xesh bo'yicha. Sysmon konfiguratsiyasini o'zgartirish ham (Event ID 16) va Sysmon xizmatining to'xtashi ham (Event ID 4) alohida kuzatilishi kerak.
:::

## Eng muhim Event ID'lar

Sysmon'da 25 dan ortiq hodisa turi bor. Kundalik ishda eng ko'p kerak bo'ladiganlari:

| ID | Hodisa | Nimani beradi |
|---|---|---|
| **1** | Process Create | Jarayon: buyruq satri, xesh, ota-jarayon, foydalanuvchi |
| **3** | Network Connection | Qaysi jarayon qaysi IP:portga ulandi |
| **5** | Process Terminated | Jarayon tugadi |
| **7** | Image Loaded | Jarayon qaysi DLL ni yukladi (juda ko'p shovqin — ehtiyot bilan) |
| **8** | CreateRemoteThread | Bir jarayon boshqasi ichida kod ishga tushirdi |
| **10** | Process Access | Bir jarayon boshqasining xotirasiga murojaat qildi |
| **11** | File Create | Fayl yaratildi |
| **12** / **13** / **14** | Registry | Registr kaliti yaratildi yoki o'chirildi / qiymat yozildi / nomi o'zgardi |
| **15** | FileCreateStreamHash | Faylga qo'shimcha oqim yozildi — internetdan yuklangan fayl belgisi shu yerda |
| **16** | Config Change | Sysmon konfiguratsiyasi o'zgartirildi |
| **22** | DNS Query | Jarayon qaysi domenni so'radi |
| **4** | Service State Changed | Sysmon xizmati to'xtadi yoki ishga tushdi |

Yoddan bilish shart bo'lganlari (va maqsadlarda ham shular): **1, 3, 11, 13** — hamda **22**.

### Event ID 1 — eng qimmatli yozuv

Bitta Process Create yozuvi qanday ko'rinishini ko'raylik:

```
Event ID 1: Process Create
UtcTime:            2026-11-16 09:32:14.512
ProcessGuid:        {7c1f3e2a-6b1d-6745-1a03-000000001400}
ProcessId:          6248
Image:              C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe
CommandLine:        powershell.exe -NoProfile -WindowStyle Hidden -enc <uzun Base64 satr>
CurrentDirectory:   C:\Users\d.karimova\Documents\
User:               CORP\d.karimova
IntegrityLevel:     Medium
Hashes:             SHA256=...
ParentProcessGuid:  {7c1f3e2a-6b1a-6745-f802-000000001400}
ParentProcessId:    5120
ParentImage:        C:\Program Files\Microsoft Office\root\Office16\WINWORD.EXE
ParentCommandLine:  "WINWORD.EXE" /n "C:\Users\d.karimova\Downloads\Hisob-faktura_1147.docm"
```

Bitta yozuvdan qancha narsa bilinadi:

| Maydon | Nimani aytadi |
|---|---|
| `Image` | PowerShell ishga tushgan |
| `CommandLine` | Oynasiz, kodlangan buyruq bilan |
| `User` | Buxgalter hisobi |
| `ParentImage` | **Word** tomonidan ishga tushirilgan |
| `ParentCommandLine` | Yuklab olingan, makrosli (`.docm`) hujjat ochilganda |

Bu — alert triage darsidagi misolning o'zi, lekin endi uni tasdiqlaydigan dalil qo'lingizda. Oddiy Windows jurnalida bularning ko'pi yo'q edi.

### ProcessGuid — jarayonlarni bog'laydigan ip

Jarayon raqami (`ProcessId`) Windows tomonidan qayta ishlatiladi: bugun 6248 — PowerShell, ertaga — kalkulyator. Shuning uchun Sysmon har bir jarayonga noyob **ProcessGuid** beradi.

Bu juda muhim: Event ID 1, 3, 11, 22 — hammasida `ProcessGuid` bor. Uni bo'yicha qidirsangiz, **bitta jarayonning butun hikoyasini** yig'asiz:

```
ProcessGuid {…1400} bo'yicha qidiruv:

09:32:14  ID 1   powershell.exe ishga tushdi    (ota: WINWORD.EXE)
09:32:15  ID 22  DNS so'rovi: update-check.example-cdn.net
09:32:15  ID 3   Ulanish: 203.0.113.45:443
09:32:17  ID 11  Fayl yaratildi: C:\Users\d.karimova\AppData\Roaming\svchost.exe
09:32:18  ID 13  Registr: HKCU\...\CurrentVersion\Run\Updater = ...\svchost.exe
```

Endi hikoya to'liq: hujjat → PowerShell → domen so'rovi → tashqi ulanish → fayl yuklandi → avtomatik ishga tushish uchun registrga yozildi. Har bir qadam — dalil bilan.

E'tibor bering: `svchost.exe` — haqiqiy Windows jarayonining nomi. Lekin haqiqiysi faqat `C:\Windows\System32\` da yashaydi. `AppData` dagi `svchost.exe` — niqoblanish. Mana shuning uchun nom emas, **to'liq yo'l** va **xesh** muhim.

## Shubhali naqshlar: ota va bola jarayonlar

Event ID 1 dagi `ParentImage` + `Image` juftligi — eng kuchli aniqlash usullaridan biri. Ba'zi juftliklar normal ishda deyarli uchramaydi:

| Ota-jarayon | Bola-jarayon | Nega shubhali |
|---|---|---|
| `WINWORD.EXE`, `EXCEL.EXE` | `powershell.exe`, `cmd.exe`, `wscript.exe` | Hujjat buyruq qobig'ini ochmasligi kerak |
| `outlook.exe` | `powershell.exe` | Pochta dasturi skript ishga tushirmasligi kerak |
| Brauzer (`chrome.exe`, `msedge.exe`) | `cmd.exe`, `powershell.exe` | Brauzer orqali kod ishga tushishi |
| `w3wp.exe` (IIS veb-server) | `cmd.exe` | Veb-ilova orqali buyruq bajarilishi — veb-server buzilgan bo'lishi mumkin |
| `services.exe` | Notanish yo'ldagi `.exe` | Yangi, notanish xizmat |

Shuningdek, **joylashuv** bo'yicha:

| Belgi | Nega |
|---|---|
| Tizim nomli fayl tizim papkasidan tashqarida (`svchost.exe` AppData'da) | Niqoblanish |
| `C:\Users\Public\`, `%TEMP%`, `Downloads` dan ishga tushgan `.exe` | Odatiy dasturlar `Program Files` da yashaydi |
| Imlosi biroz farqli nomlar (`scvhost.exe`, `explorer .exe`) | Ko'zni aldash |

:::key
Sysmon tahlilining asosiy savoli: **"Bu jarayon bu yerda, bu ota-jarayondan, bu foydalanuvchi nomidan ishga tushishi normalmi?"** Har bir Windows jarayonining odatiy "oilasi" bor: `svchost.exe` ning otasi deyarli har doim `services.exe`, `explorer.exe` foydalanuvchi kirganda ishga tushadi. SANS'ning **"Hunt Evil"** plakati shu oilalarni bitta sahifada ko'rsatadi — uni chop etib, stol yoningizga osib qo'ying. Normalni bilmasangiz, g'ayritabiiyni ko'rmaysiz.
:::

## Sysmon yozuvlarini qidirish

Windows Event Log darsidagi vositalar bu yerda ham ishlaydi — faqat jurnal nomi boshqa:

```powershell
$log = 'Microsoft-Windows-Sysmon/Operational'

# Oxirgi 20 ta jarayon yaratilishi
Get-WinEvent -FilterHashtable @{ LogName = $log; Id = 1 } -MaxEvents 20 |
    Select-Object TimeCreated, Message

# Oxirgi bir soatdagi tarmoq ulanishlari
Get-WinEvent -FilterHashtable @{
    LogName = $log; Id = 3; StartTime = (Get-Date).AddHours(-1)
}

# Ota-jarayoni Word bo'lgan jarayonlar
Get-WinEvent -FilterHashtable @{ LogName = $log; Id = 1 } |
    Where-Object { $_.Message -match 'ParentImage:.*WINWORD\.EXE' } |
    Select-Object TimeCreated, Message

# Eng ko'p so'ralgan domenlar
Get-WinEvent -FilterHashtable @{ LogName = $log; Id = 22 } -MaxEvents 2000 |
    ForEach-Object {
        (([xml]$_.ToXml()).Event.EventData.Data | Where-Object Name -eq 'QueryName').'#text'
    } |
    Group-Object | Sort-Object Count -Descending | Select-Object -First 20 Count, Name
```

Haqiqiy SOC'da bu yozuvlar SIEM'da qidiriladi (keyingi bosqich) — lekin mantiq bir xil: filtrlash, guruhlash, sanash, noodatiyni topish.

## Sysmon va EDR

Savol tug'iladi: kompaniyada EDR bo'lsa, Sysmon kerakmi?

| | Sysmon | EDR |
|---|---|---|
| Narxi | Bepul | Pullik |
| Ko'radi | Ha | Ha, ko'pincha chuqurroq |
| To'xtatadi | Yo'q | Ha (jarayonni o'ldirish, qurilmani ajratish) |
| Tahlil | Yo'q — SIEM va qoidalar kerak | O'z aniqlash qoidalari va konsoli |
| Ma'lumot ustidan nazorat | To'liq — xom yozuvlar sizda | Ishlab chiqaruvchi tanlagan narsalar |

Ko'p kompaniyalar ikkalasini ham ishlatadi: EDR — himoya va tezkor javob uchun, Sysmon — mustaqil, to'liq nazorat qilinadigan ma'lumot manbai sifatida. Kichik kompaniyalar va uy laboratoriyalari uchun esa Sysmon + bepul SIEM — eng yaxshi boshlanish.

Sysmon Linux uchun ham bor (**Sysmon for Linux**), lekin Linux dunyosida asosiy vosita boshqa — keyingi darsdagi **auditd**.

## Sysmon nimani ko'rmaydi

- **Shifrlangan trafik mazmunini** — kim qayerga ulanganini ko'radi, nima uzatilganini emas.
- **Xotiradagi hamma narsani** — faqat konfiguratsiyada belgilangan hodisalarni.
- **Konfiguratsiyada chiqarib tashlangan narsalarni** — har bir `exclude` — ko'r nuqta.
- **O'zi o'chirilgandan keyingi narsalarni** — shuning uchun ID 4 va 16 kuzatiladi, va yozuvlar SIEM'ga darhol yuboriladi.
- Va u **hech narsani to'xtatmaydi**.

:::try
**O'z laboratoriyangizda** — virtual mashinadagi Windows'da (s1 bosqichidagi laboratoriya) bajaring, asosiy kompyuteringizda emas.

**1. O'rnating.** Sysmon'ni Microsoft Sysinternals sahifasidan yuklab oling, SwiftOnSecurity konfiguratsiyasini GitHub'dan oling va `sysmon64.exe -accepteula -i sysmonconfig-export.xml` bilan o'rnating. Event Viewer'da Sysmon/Operational jurnali paydo bo'ldimi?

**2. O'z izingizni toping.** Bloknot (`notepad.exe`) ni oching. Event ID 1 da uni toping. `ParentImage` nima? Nega?

**3. Tarmoq va DNS.** Brauzerda `example.com` ni oching. Event ID 22 da shu domen so'rovini va Event ID 3 da ulanishni toping (konfiguratsiyangiz yozsa). Ikkalasidagi `ProcessGuid` bir xilmi?

**4. Bog'lash.** PowerShell'ni oching va `Get-Date` ni ishga tushiring. PowerShell jarayonining `ProcessGuid` ini toping va shu GUID bo'yicha barcha Sysmon yozuvlarini qidiring.

**5. TryHackMe** — "Sysmon" xonasini bajaring.

*Javoblar: 2 — Bloknot Pusk menyusi yoki ish stolidan ochilgan bo'lsa, otasi `explorer.exe`; `cmd` dan ochsangiz — `cmd.exe`. 3 — agar so'rov va ulanishni bitta brauzer jarayoni qilgan bo'lsa, ha; zamonaviy brauzerlar tarmoq ishini alohida yordamchi jarayonga topshiradi, shuning uchun ba'zan GUID'lar farq qiladi — bu ham o'rganish uchun yaxshi misol. 1-qadamda jurnal ko'rinmasa — PowerShell administrator sifatida ochilganini tekshiring.*
:::

## Xulosa

- **Sysmon** — Microsoft'ning bepul vositasi; Windows jurnallarining bo'shliqlarini to'ldiradi: buyruq satri, xesh, ota-jarayon, tarmoq, fayllar, registr, DNS.
- U **ko'radi, lekin to'xtatmaydi**; antivirus yoki EDR o'rnini bosmaydi.
- Hamma narsa **konfiguratsiyaga** bog'liq; SwiftOnSecurity yoki sysmon-modular dan boshlang. `include` bo'sh — hech narsa, `exclude` bo'sh — hamma narsa.
- Yoddan: **1** — jarayon, **3** — tarmoq, **11** — fayl, **13** — registr qiymati, **22** — DNS; **4** va **16** — Sysmon'ning o'zini kuzatish.
- **ProcessGuid** bitta jarayonning butun hikoyasini bog'laydi.
- Kuchli belgi — **g'alati ota-bola juftligi** (Word → PowerShell) va **noto'g'ri joylashuv** (AppData'dagi `svchost.exe`).
- Normalni bilmasangiz, g'ayritabiiyni ko'rmaysiz: SANS "Hunt Evil" plakati.

:::quiz
? Sysmon nima qiladi?
- Zararli dasturlarni bloklaydi va o'chiradi
+ Tizimdagi faoliyatni (jarayonlar, tarmoq, fayllar, registr, DNS) batafsil yozib boradi
- Tarmoq trafigini shifrlaydi
- Windows'ni yangilaydi
! Sysmon — kuzatuvchi. U hech narsani to'xtatmaydi, faqat yozadi.

? Sysmon Event ID 1 nimani bildiradi?
- Tarmoq ulanishi
+ Jarayon yaratilishi
- Fayl yaratilishi
- DNS so'rovi
! ID 1 — Process Create: buyruq satri, xesh va ota-jarayon bilan. Eng qimmatli Sysmon yozuvi.

? Qaysi Sysmon Event ID jarayonning DNS so'rovini yozadi?
- 3
- 11
- 13
+ 22
! 3 — tarmoq ulanishi, 11 — fayl, 13 — registr qiymati, 22 — DNS so'rovi.

? NetworkConnect bo'limida onmatch="include" bo'lib, ichida hech qanday qoida yo'q. Natija qanday?
+ Hech qanday tarmoq ulanishi yozilmaydi
- Barcha tarmoq ulanishlari yoziladi
- Sysmon xato beradi va ishlamaydi
- Faqat tashqi ulanishlar yoziladi
! include — “faqat mos kelganlarini yoz”. Hech narsa mos kelmasa — hech narsa yozilmaydi. exclude bo'sh bo'lsa esa hammasi yoziladi.

? Nega jarayonlarni bog'lash uchun ProcessId emas, ProcessGuid ishlatiladi?
- ProcessGuid qisqaroq
+ ProcessId Windows tomonidan qayta ishlatiladi, ProcessGuid esa har bir jarayon uchun noyob
- ProcessId Sysmon'da yozilmaydi
- Farqi yo'q
! Bir xil ProcessId turli vaqtda turli dasturlarga tegishli bo'lishi mumkin. GUID adashtirmaydi.

? Qaysi ota-bola jarayon juftligi eng shubhali?
- explorer.exe → notepad.exe
- services.exe → C:\Windows\System32\svchost.exe
+ WINWORD.EXE → powershell.exe
- explorer.exe → chrome.exe
! Ofis hujjati buyruq qobig'ini ochmasligi kerak — bu makrosli zararli hujjatlarning klassik belgisi.

? C:\Users\ali\AppData\Roaming\svchost.exe ishga tushdi. Nega bu shubhali?
- svchost.exe har doim zararli
+ Haqiqiy svchost.exe faqat C:\Windows\System32 da bo'ladi — bu niqoblanish belgisi
- AppData papkasi mavjud emas
- Hech qanday shubha yo'q
! Nomni o'zgartirish oson. Shuning uchun nomga emas, to'liq yo'l va xeshga qaraladi.

? Nega Sysmon Event ID 4 va 16 alohida kuzatilishi kerak?
- Ular eng ko'p yozuv chiqaradi
+ Ular Sysmon xizmatining to'xtashi va konfiguratsiyasining o'zgarishini bildiradi — hujumchi kuzatuvni o'chirishga urinishi mumkin
- Ular faqat xatolarni ko'rsatadi
- Ular majburiy emas
! Kuzatuv vositasining o'zini kuzatish kerak: o'chirilgan Sysmon hech narsa yozmaydi.

? Nega hamma narsani yozadigan (filtrsiz) Sysmon konfiguratsiyasi yomon g'oya?
- Sysmon bunday rejimni qo'llamaydi
+ Juda ko'p yozuv chiqadi: SIEM to'lib ketadi, muhim hodisalar shovqinda yo'qoladi
- Bu litsenziyani buzadi
- Filtrsiz Sysmon hech narsa yozmaydi
! Yaxshi konfiguratsiya — muvozanat: muhimini yozish, ma'lum shovqinni chiqarib tashlash.

? Kompaniyada EDR bor. Sysmon'ning qo'shimcha foydasi nima bo'lishi mumkin?
- Sysmon EDR'ni tezlashtiradi
+ Mustaqil, bepul va to'liq nazorat qilinadigan xom ma'lumot manbai
- Sysmon tahdidlarni EDR'dan yaxshiroq bloklaydi
- Hech qanday foydasi yo'q
! EDR himoya qiladi va tezkor javob beradi; Sysmon esa siz o'zingiz boshqaradigan qo'shimcha ko'rinishni beradi.
:::

:::cards
Sysmon nima? :: Microsoft Sysinternals'ning bepul vositasi — jarayonlar, tarmoq, fayllar, registr va DNS faoliyatini batafsil yozadi. Hech narsani bloklamaydi.
Sysmon jurnali qayerda? :: Applications and Services Logs → Microsoft → Windows → Sysmon → Operational.
Sysmon Event ID 1? :: Process Create — buyruq satri, xesh, ota-jarayon va foydalanuvchi bilan.
Sysmon Event ID 3? :: Network Connection — qaysi jarayon qaysi IP va portga ulandi.
Sysmon Event ID 11 va 13? :: 11 — fayl yaratildi; 13 — registr qiymati yozildi.
Sysmon Event ID 22? :: DNS Query — jarayon qaysi domenni so'radi.
Sysmon Event ID 4 va 16? :: 4 — Sysmon xizmati holati o'zgardi; 16 — Sysmon konfiguratsiyasi o'zgardi. Kuzatuvni o'chirish urinishlari.
include va exclude farqi? :: include — faqat mos kelganlarini yoz (bo'sh = hech narsa); exclude — hammasini yoz, mos kelganlaridan tashqari (bo'sh = hammasi).
ProcessGuid nima uchun kerak? :: Har bir jarayon uchun noyob identifikator — bitta jarayonning barcha hodisalarini bog'laydi. ProcessId esa qayta ishlatiladi.
Mashhur Sysmon konfiguratsiyalari? :: SwiftOnSecurity sysmon-config va Olaf Hartong sysmon-modular.
Shubhali ota-bola juftligiga misol? :: WINWORD.EXE yoki EXCEL.EXE → powershell.exe yoki cmd.exe.
Niqoblanishni qanday aniqlash mumkin? :: Nomga emas, to'liq yo'l va xeshga qarash: haqiqiy svchost.exe faqat C:\Windows\System32 da bo'ladi.
:::
