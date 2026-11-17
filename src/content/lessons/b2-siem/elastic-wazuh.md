Splunk kuchli, lekin qimmat. Ko'p kompaniyalar — ayniqsa kichik va o'rta biznes, davlat tashkilotlari, universitetlar — ochiq kodli yechimlarni tanlaydi. Siz uchun esa ularning yana bir katta afzalligi bor: **ularni bugun, bepul, o'z kompyuteringizda o'rnatib, haqiqiy SOC laboratoriyasini qurishingiz mumkin.**

Bu darsda ikkita tizim bilan tanishasiz: **Elastic Stack** — eng mashhur ochiq qidiruv platformasi, va **Wazuh** — undan tug'ilgan, to'liq bepul SIEM va endpoint himoyasi. Dars oxirida o'z laboratoriyangizda ishlaydigan mini-SOC bo'ladi — ish beruvchiga ko'rsatsa bo'ladigan portfolio loyihasi.

## Elastic Stack

Elastic — bir nechta komponentdan iborat to'plam (avval "ELK" deyilardi):

| Komponent | Vazifasi | Splunk'dagi o'xshashi |
|---|---|---|
| **Elasticsearch** | Ma'lumotlarni saqlash va qidirish dvigateli | Indekslar |
| **Kibana** | Veb-interfeys: qidiruv, grafiklar, dashboard | Search & Reporting |
| **Logstash** | Loglarni qayta ishlash quvuri (parsing, boyitish) | Parsing qatlami |
| **Beats** | Yengil agentlar: Filebeat (fayllar), Winlogbeat (Windows jurnallari), Packetbeat (tarmoq) | Universal Forwarder |
| **Elastic Agent + Fleet** | Yagona zamonaviy agent va uni markazdan boshqarish | Forwarder + Deployment Server |

**Elastic Security** — Kibana ichidagi xavfsizlik ilovasi: tayyor aniqlash qoidalari, ogohlantirishlar, tergov uchun "Timeline" va insidentlar (Cases).

### ECS — Elastic'ning umumiy tili

SIEM tushunchasi darsidagi normalizatsiyani eslang. Elastic'da u **ECS** (Elastic Common Schema) deyiladi — maydonlar nuqtali, ierarxik nomlanadi:

| ECS maydoni | Ma'nosi |
|---|---|
| `@timestamp` | Hodisa vaqti |
| `host.name` | Qurilma nomi |
| `user.name` | Foydalanuvchi |
| `source.ip`, `destination.ip`, `destination.port` | Tarmoq manzillari |
| `event.code` | Windows Event ID (4625 va h.k.) |
| `event.outcome` | `success` / `failure` |
| `process.name`, `process.command_line` | Jarayon |
| `process.parent.name` | Ota-jarayon |
| `dns.question.name` | So'ralgan domen |
| `url.domain` | Veb-so'rov domeni |

ECS nomlari mantiqiy, shuning uchun ularni tez yodlaysiz: `source.*` — kim, `destination.*` — kimga, `process.*` — qaysi dastur.

### KQL — Kibana so'rov tili

Kibana'ning **Discover** sahifasida qidiruv qatoriga [[kql|KQL]] (Kibana Query Language) yoziladi. U SPL'dan soddaroq — faqat **filtrlaydi**:

```
event.code: 4625
event.code: 4625 and source.ip: 203.0.113.45
event.code: (4624 or 4625)
event.code: 4625 and not user.name: svc-backup
process.name: power*
process.parent.name: "WINWORD.EXE" and process.name: ("powershell.exe" or "cmd.exe")
destination.port >= 1024
user.name: *                         # maydon mavjud bo'lgan har qanday yozuv
```

| Belgi | Ma'nosi |
|---|---|
| `field: value` | Maydon qiymati |
| `and`, `or`, `not` | Mantiqiy amallar |
| `( … )` | Guruhlash |
| `*` | Har qanday davom |
| `>`, `>=`, `<`, `<=` | Raqam yoki sana oralig'i |
| `"…"` | Aniq ibora |

KQL statistika qilmaydi. Hisoblash va guruhlash uchun Kibana'ning vizualizatsiyalari yoki yangi **ES|QL** tili ishlatiladi — u SPL kabi quvur bilan yoziladi:

```
FROM logs-*
| WHERE event.code == "4625"
| STATS urinishlar = COUNT(*) BY source.ip
| SORT urinishlar DESC
| LIMIT 10
```

Splunk darsidagi `stats count by src_ip | sort -count | head 10` bilan solishtiring — g'oya bir xil.

:::warn
**"KQL" ikki xil til.** Elastic'dagi KQL — Kibana Query Language. Microsoft Sentinel'dagi KQL — **Kusto** Query Language, butunlay boshqa til (u ham quvur bilan yoziladi: `SecurityEvent | where EventID == 4625 | summarize count() by IpAddress`). Ish e'lonida "KQL" ko'rsangiz — qaysi platforma haqida gap ketayotganini aniqlang. Yaxshi xabar: ikkalasining ham asosiy g'oyasi siz bilgan narsa — filtr, guruhlash, sanash.
:::

## Wazuh — bepul SIEM va XDR

**Wazuh** — to'liq ochiq kodli va bepul xavfsizlik platformasi. U OSSEC loyihasidan o'sib chiqqan va bugun bitta tizimda bir nechta vazifani bajaradi:

| Imkoniyat | Nima qiladi |
|---|---|
| **Log tahlili** | Agentlardan va syslog'dan loglarni yig'adi, qoidalar bilan tahlil qiladi |
| **Fayl yaxlitligi (FIM)** | Muhim fayllar o'zgarsa xabar beradi — `/etc/passwd`, tizim papkalari |
| **Zaifliklarni aniqlash** | O'rnatilgan dasturlarni ma'lum zaifliklar (CVE) bazasi bilan solishtiradi |
| **Konfiguratsiya bahosi (SCA)** | Tizim sozlamalarini CIS kabi standartlar bilan tekshiradi |
| **Inventarizatsiya** | Qurilmadagi dasturlar, jarayonlar, ochiq portlar ro'yxati |
| **Active response** | Qoida ishlaganda avtomatik javob (masalan, IP'ni bloklash) |

### Arxitektura

```
 ┌────────────────┐        1514/TCP (hodisalar)       ┌───────────────────────────────┐
 │ Wazuh agent    │ ────────────────────────────────► │ Wazuh server (manager)        │
 │ Windows, Linux │ ◄──────── 1515/TCP (ro'yxatdan) ──│  decoders → rules → alerts    │
 └────────────────┘                                   └──────────────┬────────────────┘
 ┌────────────────┐        syslog                                    │
 │ Firewall, va h.│ ──────────────────────────────────►              ▼
 └────────────────┘                                   ┌───────────────────────────────┐
                                                      │ Wazuh indexer (saqlash)       │
                                                      └──────────────┬────────────────┘
                                                                     ▼
                                                      ┌───────────────────────────────┐
                                                      │ Wazuh dashboard (veb, 443)    │
                                                      └───────────────────────────────┘
```

| Komponent | Vazifasi |
|---|---|
| **Agent** | Qurilmada ishlaydi: loglar, FIM, inventar, SCA |
| **Server (manager)** | Hodisalarni dekoderlar bilan parse qiladi va qoidalar bilan baholaydi |
| **Indexer** | Ogohlantirishlarni saqlaydi va qidiradi (OpenSearch asosida — Elasticsearch'ning ochiq tarmog'i) |
| **Dashboard** | Veb-interfeys (OpenSearch Dashboards asosida) |

Kichik laboratoriyada uchala server komponenti bitta virtual mashinada ishlay oladi ("all-in-one").

### Qoidalar qanday ishlaydi

Wazuh'da har bir log ikki bosqichdan o'tadi:

1. **Decoder** — logdan maydonlarni ajratadi (SIEM tushunchasi darsidagi parsing).
2. **Rule** — maydonlarga qarab qaror qiladi va **daraja** (level) beradi: 0 dan 15 gacha. Daraja qancha baland — shuncha jiddiy.

Qoidalar XML formatida. Tayyor qoidalar minglab; o'zingiznikini `/var/ossec/etc/rules/local_rules.xml` fayliga yozasiz (shaxsiy qoidalar uchun ID'lar 100000 dan boshlanadi):

```xml
<group name="local,sshd,">
  <!-- 2 daqiqada bitta IP'dan 8 ta muvaffaqiyatsiz SSH kirish -->
  <rule id="100100" level="10" frequency="8" timeframe="120">
    <if_matched_sid>5716</if_matched_sid>
    <same_source_ip />
    <description>SSH: bitta IP'dan qisqa vaqtda ko'p muvaffaqiyatsiz kirish</description>
    <mitre>
      <id>T1110</id>
    </mitre>
  </rule>
</group>
```

| Qism | Ma'nosi |
|---|---|
| `if_matched_sid` | Qaysi mavjud qoida ishlaganini sanaydi (5716 — tayyor "sshd: muvaffaqiyatsiz autentifikatsiya" qoidasi) |
| `frequency` / `timeframe` | Necha marta va necha soniya ichida |
| `same_source_ip` | Faqat bir xil manba IP'dan kelganlarini sanash |
| `mitre` | ATT&CK texnikasiga bog'lash — shu bosqichning ATT&CK darsida |

Bu — SIEM tushunchasi darsidagi **chegara korrelyatsiyasi**ning aynan o'zi. Tayyor qoida raqamlari Wazuh versiyasiga qarab o'zgarishi mumkin — haqiqiy ID'ni dashboard'dagi ogohlantirishdan yoki qoidalar faylidan tekshiring.

Qoidani sinash uchun Wazuh'da qulay vosita bor — namuna log qatorini kiritasiz va qaysi decoder va qoida ishlaganini ko'rasiz:

```bash
sudo /var/ossec/bin/wazuh-logtest
# Keyin auth.log'dan bitta "Failed password ..." qatorini joylashtiring
```

O'zgarishlardan keyin: `sudo systemctl restart wazuh-manager`.

### Sysmon'ni Wazuh'ga ulash

Windows agent standart holatda Security, System va Application jurnallarini o'qiydi. Sysmon darsidagi boy ma'lumotni qo'shish uchun agent sozlamasiga (`ossec.conf`) bitta blok qo'shiladi:

```xml
<localfile>
  <location>Microsoft-Windows-Sysmon/Operational</location>
  <log_format>eventchannel</log_format>
</localfile>
```

Endi Sysmon Event ID 1, 3, 22 Wazuh'ga keladi va ular ustida qoidalar ishlaydi.

### Fayl yaxlitligi (FIM)

Linux darsidagi auditd `-w /etc/passwd` qoidasini eslang. Wazuh'da shunga o'xshash vazifani FIM bajaradi:

```xml
<syscheck>
  <directories check_all="yes" realtime="yes">/etc</directories>
  <directories check_all="yes" realtime="yes">/root/.ssh</directories>
</syscheck>
```

`/root/.ssh/authorized_keys` ga begona kalit qo'shilsa — darhol ogohlantirish. Linux darsidagi persistence izlaridan birini endi avtomatik ushlaysiz.

:::key
**Active response — ehtiyotkorlik bilan.** Wazuh qoida ishlaganda IP'ni avtomatik bloklashi mumkin. Jozibali, lekin xavfli: noto'g'ri sozlangan qoida o'z administratoringizni, monitoring serverini yoki muhim hamkorni bloklab qo'yishi mumkin. Hujumchi esa soxta manzildan trafik yuborib, sizni o'z tizimlaringizni bloklashga majbur qilishi mumkin. Qoida: avval faqat ogohlantirish rejimida bir necha hafta ishlating, false positive'larni ko'ring, ishonchli manzillarni istisno ro'yxatiga qo'shing — keyingina avtomatik javobni yoqing.
:::

## O'z SOC laboratoriyangizni qurish

Bu — shu bosqichdagi eng muhim amaliy loyiha. Kompyuter bosqichidagi virtual mashinalar bilimingiz kerak bo'ladi.

### Tavsiya etilgan tuzilma

| VM | Tizim | Resurs (taxminan) | Vazifasi |
|---|---|---|---|
| **wazuh** | Ubuntu Server LTS | 4 vCPU, 8 GB RAM, 50 GB disk | Wazuh all-in-one |
| **win10** | Windows 10/11 (sinov versiyasi) | 2 vCPU, 4 GB RAM | Agent + Sysmon |
| **linux** | Ubuntu yoki Debian | 1 vCPU, 2 GB RAM | Agent, SSH server |

Jami ~14 GB RAM — 16 GB'li kompyuterda ishlaydi, lekin bir vaqtning o'zida hammasini yoqmasdan ham mashq qilish mumkin. Barcha VM'lar bitta **ichki (host-only yoki NAT network)** tarmoqda bo'lsin — laboratoriya trafigi uy tarmog'ingizga chiqmasin.

### Qadamlar

1. **Wazuh serverini o'rnating** — Wazuh hujjatlaridagi **Quickstart** bo'limidagi rasmiy o'rnatish skripti bilan. Buyruq versiyaga qarab o'zgaradi, shuning uchun uni hujjatdan oling. Oxirida dashboard manzili va administrator paroli chiqadi — parolni parol menejeringizga saqlang.
2. **Dashboard'ga kiring** — brauzerda `https://<wazuh-VM-IP>`. Sertifikat o'zi imzolangan bo'ladi — laboratoriyada bu normal (TLS darsidagi bilimingiz bilan nega ogohlantirish chiqishini tushuntira olasiz).
3. **Agent qo'shing** — dashboard'da **Deploy new agent**: tizimni tanlang, server IP'sini kiriting — Wazuh tayyor o'rnatish buyrug'ini beradi. Uni Windows va Linux VM'larida ishga tushiring.
4. **Sysmon'ni o'rnating** Windows VM'iga (Sysmon darsidagi kabi) va yuqoridagi `localfile` blokini qo'shing.
5. **Hodisa yarating va toping:**
   - Linux VM'ga SSH orqali bir necha marta noto'g'ri parol bilan ulaning.
   - Windows'da yangi lokal foydalanuvchi yarating (4720).
   - Linux'da `/etc` ichida fayl o'zgartiring (FIM).
   - Har birini dashboard'dagi **Threat Hunting** / **Security events** bo'limida toping.
6. **O'z qoidangizni yozing** — yuqoridagi SSH qoidasini qo'shing, `wazuh-logtest` bilan sinang, keyin haqiqiy urinishlar bilan tekshiring.

Har bir qadamni skrinshotlar bilan GitHub'dagi README'ga yozib boring. "O'z SOC laboratoriyamni qurdim: Wazuh + Sysmon + o'zim yozgan qoidalar" — boshlang'ich darajadagi intervyuda juda kuchli argument.

## Elastic va Wazuh nimani qilmaydi

- **O'z-o'zidan sozlanmaydi** — tayyor qoidalar shovqinli; ularni muhitingizga moslash kerak.
- **Resurs talab qiladi** — Elasticsearch va Wazuh indexer xotirani ko'p yeydi; kichik VM'da sekin ishlaydi yoki to'xtab qoladi.
- **Bepul ≠ tekin** — litsenziya yo'q, lekin serverlar, saqlash va eng muhimi — ularni boshqaradigan odamlarning vaqti bor.
- **Ochiq kod ≠ avtomatik xavfsiz** — dashboard'ni internetga ochiq qoldirmang va standart parollarni almashtiring.

:::try
**1. KQL mashqi.** TryHackMe'dagi Elastic yoki Wazuh xonasida (yoki o'z laboratoriyangizda) quyidagilarni KQL bilan toping:
- (a) Barcha muvaffaqiyatsiz kirishlar.
- (b) `svc-backup` dan tashqari barcha muvaffaqiyatsiz kirishlar.
- (c) Ota-jarayoni `WINWORD.EXE` bo'lgan barcha jarayonlar.

**2. Tarjima.** Splunk darsidagi `index=windows EventCode=4625 | stats count by src_ip | sort -count | head 10` so'rovini ES|QL'ga va Sentinel KQL (Kusto)'ga o'giring.

**3. Laboratoriya.** Yuqoridagi 6 qadamni bajaring. Kamida uchta turli ogohlantirishni (SSH, yangi foydalanuvchi, FIM) dashboard'da toping va skrinshot oling.

*Javoblar: 1a — `event.code: 4625` (Wazuh'da Windows maydonlari `data.win.system.eventID` kabi boshqacha nomlanishi mumkin — avval bitta hodisani ochib, maydon nomini ko'ring). 1b — `event.code: 4625 and not user.name: svc-backup`. 1c — `process.parent.name: "WINWORD.EXE"`. 2 — ES|QL: yuqoridagi `FROM logs-* | WHERE event.code == "4625" | STATS ... BY source.ip | SORT ... DESC | LIMIT 10`; Kusto: `SecurityEvent | where EventID == 4625 | summarize count() by IpAddress | top 10 by count_`.*
:::

## Xulosa

- **Elastic Stack**: Elasticsearch (saqlash), Kibana (interfeys), Logstash (quvur), Beats va Elastic Agent (yig'ish); xavfsizlik uchun — Elastic Security.
- **ECS** — ierarxik maydon nomlari: `source.ip`, `user.name`, `process.parent.name`, `event.code`.
- **KQL (Kibana)** faqat filtrlaydi: `field: value`, `and/or/not`, `*`; hisoblash uchun ES|QL yoki vizualizatsiyalar.
- Sentinel'dagi **KQL — Kusto**, boshqa til.
- **Wazuh** — bepul SIEM/XDR: log tahlili, FIM, zaifliklar, SCA, inventar, active response.
- Wazuh: agent → server (decoder → rule, daraja 0–15) → indexer → dashboard; qoidalar `local_rules.xml` da, `wazuh-logtest` bilan sinaladi.
- Active response — faqat sinab ko'rilgandan keyin.
- O'z laboratoriyangiz: Wazuh + Windows (Sysmon) + Linux — portfolio uchun eng yaxshi loyiha.

:::quiz
? Elastic Stack'da ma'lumotlarni saqlaydigan va qidiradigan komponent qaysi?
- Kibana
+ Elasticsearch
- Filebeat
- Fleet
! Elasticsearch — dvigatel; Kibana — interfeys; Beats va Elastic Agent — yig'uvchilar.

? ECS'da manba IP manzil qaysi maydon?
- src_ip
+ source.ip
- IpAddress
- SRC
! ECS ierarxik nomlardan foydalanadi: source.ip, destination.port, user.name.

? Quyidagi KQL so'rovi nimani topadi: event.code: 4625 and not user.name: svc-backup
- svc-backup hisobining barcha kirishlarini
+ svc-backup dan tashqari barcha muvaffaqiyatsiz kirishlarni
- Barcha muvaffaqiyatli kirishlarni
- Hech narsani — sintaksis xato
! and va not bilan shartlar birlashtiriladi.

? Kibana'dagi KQL bilan stats count by kabi hisoblash qilsa bo'ladimi?
- Ha, xuddi SPL kabi
+ Yo'q — KQL faqat filtrlaydi; hisoblash uchun ES|QL yoki vizualizatsiyalar ishlatiladi
- Faqat Wazuh'da
- Faqat Linux'da
! KQL — filtr tili. ES|QL esa quvurli va STATS ... BY bilan guruhlaydi.

? Ish e'lonida “KQL bilish talab etiladi” va Microsoft Sentinel tilga olingan. Qaysi til nazarda tutilgan?
- Kibana Query Language
+ Kusto Query Language
- Splunk SPL
- SQL
! Sentinel'da Kusto ishlatiladi. Ikki KQL — bir xil qisqartma, turli tillar.

? Wazuh'da logdan maydonlarni ajratadigan qism nima deyiladi?
+ Decoder
- Indexer
- Dashboard
- Active response
! Decoder parse qiladi, rule esa maydonlarga qarab daraja beradi.

? Wazuh qoidasidagi frequency="8" timeframe="120" va same_source_ip nimani bildiradi?
- Qoida har 8 daqiqada ishga tushadi
+ Bitta manba IP'dan 120 soniya ichida 8 marta asosiy qoida ishlasa, ogohlantirish chiqadi
- 8 ta turli IP 120 marta urinsa
- Qoida 120 kun saqlanadi
! Bu chegara korrelyatsiyasi: qisqa vaqtda bir xil manbadan ko'p hodisa.

? Wazuh FIM nima qiladi?
- Tarmoq trafigini shifrlaydi
+ Muhim fayl va papkalardagi o'zgarishlarni kuzatib, ogohlantirish beradi
- Parollarni tiklaydi
- Dasturlarni yangilaydi
! Masalan, /etc/passwd yoki authorized_keys o'zgarsa, darhol xabar beradi.

? Nega active response'ni darhol avtomatik bloklash rejimida yoqish xavfli?
- U Wazuh'ni sekinlashtiradi
+ Noto'g'ri qoida o'z administratorlaringiz yoki muhim xizmatlarni bloklashi, hujumchi esa buni ataylab qo'zg'atishi mumkin
- U litsenziyani buzadi
- U faqat Windows'da ishlaydi
! Avval ogohlantirish rejimida sinab, istisnolarni sozlash kerak.

? Laboratoriya VM'lari qanday tarmoqda bo'lishi kerak?
- To'g'ridan-to'g'ri internetga ochiq
+ Ichki (host-only yoki NAT network) tarmoqda — uy tarmog'idan ajratilgan
- Kompaniya tarmog'ida
- Tarmoqsiz — agentlar tarmoqsiz ishlaydi
! Laboratoriya trafigi va zaif sozlangan tizimlar real tarmoqlarga chiqmasligi kerak.
:::

:::cards
Elastic Stack komponentlari? :: Elasticsearch — saqlash va qidiruv; Kibana — interfeys; Logstash — qayta ishlash quvuri; Beats va Elastic Agent — yig'ish; Fleet — agentlarni boshqarish.
ECS nima? :: Elastic Common Schema — ierarxik maydon nomlari: source.ip, destination.port, user.name, process.parent.name, event.code.
Kibana KQL asoslari? :: field: value, and/or/not, qavslar, * davom, >= oraliq, "..." aniq ibora. Faqat filtrlaydi.
ES|QL nima? :: Elastic'ning quvurli so'rov tili: FROM … | WHERE … | STATS … BY … | SORT … | LIMIT.
Ikki xil KQL? :: Kibana Query Language (Elastic) va Kusto Query Language (Microsoft Sentinel) — turli tillar.
Wazuh nima? :: Bepul, ochiq kodli SIEM/XDR: log tahlili, FIM, zaifliklarni aniqlash, SCA, inventar, active response.
Wazuh arxitekturasi? :: Agent → server/manager (decoder, rules) → indexer (saqlash) → dashboard (veb). Agent portlari 1514 va 1515.
Wazuh qoida darajalari? :: 0 dan 15 gacha; qancha baland — shuncha jiddiy. Shaxsiy qoidalar local_rules.xml da, ID 100000 dan.
wazuh-logtest nima uchun? :: Namuna log qatori bo'yicha qaysi decoder va qoida ishlashini sinash.
Sysmon'ni Wazuh'ga qanday ulash mumkin? :: Agent ossec.conf ga localfile: location Microsoft-Windows-Sysmon/Operational, log_format eventchannel.
Wazuh FIM misoli? :: syscheck ichida /etc va /root/.ssh papkalarini realtime kuzatish — authorized_keys o'zgarishini ushlaydi.
Active response qoidasi? :: Avval faqat ogohlantirish rejimida sinash, istisnolarni sozlash, keyin avtomatik javobni yoqish.
:::
