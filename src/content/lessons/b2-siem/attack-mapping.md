Rahbariyat yig'ilishida savol beriladi: "Bizning SOC qanchalik yaxshi himoya qiladi? Agar ertaga moliya sektoriga hujum qiladigan guruh bizni nishonga olsa — biz uni ko'ramizmi?"

"Bizda 340 ta qoida bor" — yomon javob. Bu hech narsani anglatmaydi: ularning 300 tasi bitta turdagi hujumni qidirayotgan bo'lishi mumkin.

Yaxshi javob — xarita: "Mana bu guruh ishlatadigan 47 ta texnikadan 31 tasini aniqlaymiz, 9 tasini qisman, 7 tasini umuman ko'rmaymiz — va mana ular." Bunday javobni **MITRE ATT&CK** bilan tuzish mumkin.

Xavfsizlik bosqichida ATT&CK bilan tanishgansiz: taktikalar, texnikalar, identifikatorlar. Endi uni **ish quroli** sifatida ishlatishni o'rganasiz.

## Tezkor takrorlash

[[mitre-attack|MITRE ATT&CK]] — haqiqiy hujumlardan yig'ilgan hujumchi xatti-harakatlari bilimlar bazasi. Enterprise matritsasining tuzilishi:

| Daraja | Savol | Misol |
|---|---|---|
| **Taktika** (TA…) | Hujumchi **nima uchun**? Maqsad | Persistence — tizimda qolish |
| **Texnika** (T…) | **Qanday** erishadi? | T1053 — Scheduled Task/Job |
| **Sub-texnika** (T….xxx) | Aniqroq qanday? | T1053.005 — Scheduled Task (Windows) |
| **Procedure** | Aniq guruh aniq qanday qilgan | "X guruhi schtasks bilan har soatda ishga tushadigan vazifa yaratgan" |

14 ta taktika — hujumning taxminiy oqimi:

```
Reconnaissance → Resource Development → Initial Access → Execution → Persistence →
Privilege Escalation → Defense Evasion → Credential Access → Discovery →
Lateral Movement → Collection → Command and Control → Exfiltration → Impact
```

Bu qat'iy tartib emas: hujumchi taktikalarni o'tkazib yuborishi, qaytarishi va takrorlashi mumkin. Lekin u **hikoyani** o'qishga yordam beradi.

Texnikalardan tashqari ATT&CK'da:

| Bo'lim | Nima |
|---|---|
| **Groups** (G…) | Ma'lum hujumchi guruhlar va ular ishlatgan texnikalar |
| **Software** (S…) | Zararli dasturlar va vositalar, ular nima qila olishi |
| **Mitigations** (M…) | Texnikaga qarshi himoya choralari |
| **Campaigns** (C…) | Muayyan hujum kampaniyalari |
| Aniqlash bo'limi | Har bir texnikani qaysi ma'lumot manbalarida va qanday aniqlash mumkin (tuzilishi versiyalar bilan yangilanib boradi) |

Enterprise matritsasida 200 dan ortiq texnika va 400 dan ortiq sub-texnika bor. Ularni yodlash shart emas — **qidirish va o'qishni** bilish kerak.

## Ogohlantirishni ATT&CK'ga bog'lash

O'tgan bosqichdagi barcha hodisalarni endi ATT&CK tilida ifodalay olasiz. Windows va Sysmon darslaridagi asosiy belgilar:

| Belgi (b1 bosqichidan) | Texnika |
|---|---|
| Ko'p 4625 bitta hisobga | T1110.001 — Brute Force: Password Guessing |
| Ko'p hisobga oz urinish | T1110.003 — Brute Force: Password Spraying |
| O'g'irlangan hisob bilan kirish | T1078 — Valid Accounts |
| 4624 Type 10 (RDP) | T1021.001 — Remote Services: Remote Desktop Protocol |
| 4720 — yangi lokal hisob | T1136.001 — Create Account: Local Account |
| 4732 — guruhga qo'shish | T1098 — Account Manipulation |
| 7045 — yangi xizmat | T1543.003 — Create or Modify System Process: Windows Service |
| 4698 — rejalashtirilgan vazifa | T1053.005 — Scheduled Task/Job: Scheduled Task |
| Registrdagi Run kaliti (Sysmon 13) | T1547.001 — Boot or Logon Autostart Execution: Registry Run Keys |
| 1102 — jurnal tozalandi | T1070.001 — Indicator Removal: Clear Windows Event Logs |
| Kodlangan PowerShell | T1059.001 (PowerShell) + T1027 (Obfuscated Files or Information) |
| AppData'dagi `svchost.exe` | T1036.005 — Masquerading: Match Legitimate Name or Location |
| Makrosli phishing ilovasi | T1566.001 — Phishing: Spearphishing Attachment |
| Foydalanuvchi faylni ochdi | T1204.002 — User Execution: Malicious File |
| DNS tunnellash | T1071.004 — Application Layer Protocol: DNS |
| DGA domenlar | T1568.002 — Dynamic Resolution: Domain Generation Algorithms |
| C2 orqali ma'lumot olib chiqish | T1041 — Exfiltration Over C2 Channel |

Bu bog'lash nima beradi?

1. **Umumiy til.** "Persistence via T1547.001" — dunyodagi har bir SOC analitigi tushunadi.
2. **Keyingi qadamni bashorat qilish.** Siz Execution bosqichida hujumni ko'rdingiz — demak, keyin Persistence, Credential Access, Discovery kutiladi. Nimani qidirish kerakligini bilasiz.
3. **Qamrovni o'lchash** — pastda.

### Hikoyani ATT&CK bilan o'qish

O'tgan bosqich bo'ylab davom etgan hodisa (buxgalter kompyuteri) ATT&CK tilida:

```
Initial Access       T1566.001  Makrosli hujjat pochta orqali keldi
Execution            T1204.002  Foydalanuvchi hujjatni ochdi
Execution            T1059.001  Word → PowerShell, kodlangan buyruq (T1027)
Command and Control  T1071.001  HTTPS orqali 203.0.113.45 ga beaconing
Persistence          T1547.001  HKCU\...\Run\Updater
Defense Evasion      T1036.005  AppData\Roaming\svchost.exe
Exfiltration         T1041      C2 kanali orqali 14 MB yuborildi
```

Insident hisobotida shunday jadval rahbariyat uchun ham, texnik jamoa uchun ham tushunarli. Va har bir qatorga savol bor: **"buni qaysi qoida ushladi — yoki ushlamadi?"**

:::tip
**Bog'lashdagi keng tarqalgan xatolar:**
- **Faqat taktikaga bog'lash** ("bu Persistence") — juda umumiy; texnika yoki sub-texnika darajasiga tushing.
- **Vositaga qarab bog'lash** — "PowerShell ishlatilgan, demak T1059.001". PowerShell orqali yangi hisob yaratilgan bo'lsa, asosiy texnika — T1136. Vosita emas, **xatti-harakat**.
- **Ortiqcha bog'lash** — bitta qoidaga o'nta texnika yozish. Qoida haqiqatan nimani aniqlaydi — faqat shuni yozing.
:::

## Qamrovni o'lchash

Siz qoidalaringizning har biriga ATT&CK texnikasini belgiladingiz (detection engineering darsidagi Sigma `tags`, Wazuh'dagi `<mitre>`). Endi ularni bitta xaritada ko'rish mumkin.

### ATT&CK Navigator

**ATT&CK Navigator** — matritsani ko'rish va bo'yash uchun bepul veb-vosita. U **qatlamlar** (layers) bilan ishlaydi: har bir qatlam — texnikalarga berilgan ballar va ranglar to'plami (JSON fayl).

Asosiy imkoniyatlar:

| Imkoniyat | Foydalanish |
|---|---|
| Texnikani tanlab ball berish | Har bir texnika uchun qamrov darajasi: 0 — yo'q, 1 — qisman, 2 — yaxshi |
| Rang sxemasi | Ballga qarab qizildan yashilgacha |
| Izoh qo'shish | Qaysi qoida qamraydi, qanday cheklovlar bor |
| Guruh texnikalarini yuklash | Ma'lum guruh ishlatgan texnikalarni bir tugma bilan belgilash |
| Qatlamlarni birlashtirish | Ikki qatlamni ifoda bilan qo'shish yoki solishtirish |
| Eksport | JSON, Excel, rasm — hisobot uchun |

### Tahdidga asoslangan himoya (threat-informed defense)

Barcha 600+ texnikani qamrashga urinish — befoyda. Savol boshqacha: **bizga kim hujum qilishi mumkin va ular nima qiladi?**

```
1-qatlam: TAHDID         — Sektorimizga hujum qiladigan guruhlar ishlatgan texnikalar
                            (masalan, moliya sektori uchun bir nechta guruhni tanlab, birlashtiramiz;
                             ko'p guruh ishlatgan texnika — yuqori ball)

2-qatlam: QAMROV         — Bizning aniqlash qoidalarimiz qamraydigan texnikalar

Solishtirish:            — Tahdidda bor, qamrovda yo'q  →  BO'SHLIQLAR (ustuvor ish ro'yxati)
```

Natijada ish ro'yxati paydo bo'ladi: "Sektorimizdagi guruhlarning to'rttasi T1003 (OS Credential Dumping) ishlatadi, bizda esa bu texnika uchun hech qanday qoida yo'q — keyingi sprint shu." Bu detection engineering darsidagi hayot siklining **1-qadami — gipoteza** — uchun eng yaxshi manba.

Tahdid qatlami uchun ma'lumot manbalari: ATT&CK Groups sahifalari, tahdid razvedkasi hisobotlari (keyingi darslardan birida), o'tgan insidentlaringiz, red team hisobotlari.

### Ma'lumot manbalari qamrovi

Qoida yozishdan oldin ham bitta savol bor (detection engineering darsidagi 2-qadam): **ma'lumot bormi?** Har bir texnika qaysi loglarda ko'rinishini ATT&CK aytadi. Siz qaysi loglarni yig'ishingizni bilasiz. Ularni solishtirsangiz — **ko'rinuvchanlik xaritasi** chiqadi: qaysi texnikalarni umuman ko'ra olmaysiz, chunki kerakli log yo'q.

Masalan: agar Sysmon yoki EDR bo'lmasa va 4688 da buyruq satri yoqilmagan bo'lsa, Execution taktikasining katta qismi siz uchun qorong'u. Bu SIEM tushunchasi darsidagi "qaysi loglarni yig'ish kerak" degan savolga ma'lumotga asoslangan javob beradi. Bunday tahlil uchun ochiq vositalar ham bor (masalan, DeTT&CT).

:::key
**Yashil katak — "himoyalanganmiz" degani emas.** Bitta texnikani o'nlab usulda bajarish mumkin (procedure'lar turlicha). T1059.001 uchun bitta qoidangiz bor — u faqat `-EncodedCommand` ni ushlaydi, lekin PowerShell'ni ishlatishning yuzlab boshqa yo'li bor. Navigator'da bu katak yashil, haqiqatda esa qamrov kichik. Shuning uchun: (1) "bor/yo'q" emas, **sifat darajasi** bilan baholang; (2) har bir katakka **qaysi procedure'lar** qamralganini izoh qilib yozing; (3) qamrovni faqat qoidalar soni bilan emas, **sinov natijalari** bilan tasdiqlang — Atomic Red Team kabi simulyatsiyalar qoida haqiqatan ishlashini ko'rsatadi.
:::

## ATT&CK'dan boshqa foydalanish yo'llari

| Kim | Qanday foydalanadi |
|---|---|
| **SOC analitigi** | Ogohlantirishni texnikaga bog'laydi va keyingi bosqichni bashorat qiladi |
| **Aniqlash muhandisi** | Qoidalarni texnikalar bo'yicha tartiblaydi, bo'shliqlarni topadi |
| **Threat hunter** | Ov gipotezalarini texnikalardan oladi (keyingi bosqich) |
| **Red team** | Hujum simulyatsiyasini real guruh texnikalari asosida rejalashtiradi |
| **CTI analitigi** | Hisobotlardagi xatti-harakatlarni texnikalarga aylantiradi |
| **Rahbariyat** | Qamrov xaritasi orqali investitsiya qarorlarini qabul qiladi |

Red team va blue team birgalikda ishlaganda — **purple team** — ATT&CK umumiy til bo'ladi: "Biz T1053.005 ni bajardik — siz ko'rdingizmi?" Har bir "ko'rmadik" — yangi qoida uchun vazifa.

## ATT&CK nimani qilmaydi

- **Hujumlarni aniqlamaydi** — u bilimlar bazasi, vosita emas.
- **Hamma narsani qamramaydi** — u kuzatilgan hujumlarga asoslangan; yangi usullar keyinroq qo'shiladi.
- **Ustuvorlikni o'zi bermaydi** — qaysi texnika siz uchun muhim, buni tahdid modelingiz belgilaydi.
- **Yashil xarita ≠ xavfsizlik** — yuqorida aytilganidek, sifat va sinov muhim.
- **Matritsa tartibi qat'iy emas** — haqiqiy hujumlar chapdan o'ngga chiziqli bormaydi.

:::try
**1. Texnikani o'qing.** attack.mitre.org saytida T1547.001 sahifasini oching. Qaysi registr kalitlari tilga olingan? Qaysi guruhlar bu texnikani ishlatgan? Qanday himoya choralari va aniqlash yo'llari ko'rsatilgan?

**2. Bog'lang.** Quyidagi hodisalarni texnikalarga bog'lang:
- (a) Linux serverda `~/.ssh/authorized_keys` ga yangi kalit qo'shildi.
- (b) Bitta hisob 2 daqiqada 40 ta serverga SMB orqali ulandi.
- (c) Kompyuterda `crontab` ga yangi qator qo'shildi.

**3. Navigator.** ATT&CK Navigator'ni oching, yangi qatlam yarating va shu bosqichda yozgan yoki o'rgangan qoidalaringiz qamraydigan texnikalarni belgilang (Word → PowerShell, SSH brute force, 1102 va h.k.). Keyin istalgan bitta guruhni yuklab, ikki qatlamni solishtiring. Eng katta bo'shliq qaysi taktikada?

**4. TryHackMe** — "MITRE" xonasini bajaring.

*Javoblar: 2a — T1098.004 (Account Manipulation: SSH Authorized Keys). 2b — T1021.002 (Remote Services: SMB/Windows Admin Shares); kontekstga qarab T1078 (Valid Accounts) ham. 2c — T1053.003 (Scheduled Task/Job: Cron). Har bir javobni ATT&CK saytida tekshiring — sub-texnikalar vaqti-vaqti bilan qayta tuziladi.*
:::

## Xulosa

- ATT&CK: **taktika** (nima uchun) → **texnika** (qanday) → **sub-texnika** → **procedure** (aniq guruh qanday); qo'shimcha: Groups, Software, Mitigations, aniqlash ma'lumotlari.
- Ogohlantirishlarni texnikaga bog'lash umumiy til beradi va **keyingi bosqichni bashorat qilishga** yordam beradi.
- Bog'lash — **xatti-harakat** bo'yicha, vosita bo'yicha emas; texnika yoki sub-texnika darajasida.
- **Navigator** qatlamlari: tahdid qatlami + qamrov qatlami → bo'shliqlar ro'yxati (**threat-informed defense**).
- Ma'lumot manbalari qamrovi qaysi texnikalar umuman ko'rinmasligini ko'rsatadi.
- **Yashil katak ≠ himoya**: sifat darajasi, procedure izohlari va sinov natijalari bilan baholang.

:::quiz
? ATT&CK'da taktika nimani bildiradi?
+ Hujumchining maqsadi — nima uchun bu harakatni qilyapti
- Aniq buyruq
- Zararli dasturning nomi
- Himoya chorasi
! Taktika — “nima uchun” (masalan, Persistence), texnika — “qanday” (masalan, T1053).

? T1053.005 identifikatoridagi .005 nimani bildiradi?
- Versiya raqamini
+ Sub-texnikani — T1053 texnikasining aniqroq turi
- Taktika raqamini
- Xavf darajasini
! T1053 — Scheduled Task/Job; T1053.005 — Windows Scheduled Task; T1053.003 — Cron.

? Windows Event ID 4720 (yangi lokal hisob) qaysi texnikaga mos keladi?
- T1110.001
+ T1136.001
- T1070.001
- T1566.001
! T1136.001 — Create Account: Local Account. Hujumchi o'ziga zaxira kirish yo'lini yaratadi.

? PowerShell orqali yangi foydalanuvchi yaratildi. Asosiy texnika qaysi?
- Faqat T1059.001, chunki PowerShell ishlatilgan
+ T1136 (Create Account) — xatti-harakat bo'yicha; PowerShell — qo'shimcha T1059.001
- Faqat Execution taktikasi
- Hech qanday texnika
! Bog'lash vosita bo'yicha emas, xatti-harakat bo'yicha qilinadi.

? Execution bosqichidagi hujum aniqlandi. ATT&CK bu yerda qanday yordam beradi?
- Hujumni avtomatik to'xtatadi
+ Keyin qaysi taktikalar (Persistence, Credential Access, Discovery) kutilishini va nimani qidirish kerakligini ko'rsatadi
- Hujumchining ismini aytadi
- Loglarni tiklaydi
! Taktikalar oqimi analitikka keyingi qadamlarni oldindan qidirish imkonini beradi.

? Threat-informed defense yondashuvining mohiyati nima?
- Barcha texnikalar uchun bir xil miqdorda qoida yozish
+ Sizga hujum qilishi mumkin bo'lgan guruhlar texnikalarini o'z qamrovingiz bilan solishtirib, bo'shliqlarni ustuvor yopish
- Faqat eng yangi texnikalarni kuzatish
- Faqat zaifliklarni yamash
! Tahdid qatlami + qamrov qatlami = ustuvor ish ro'yxati.

? ATT&CK Navigator'da “qatlam” (layer) nima?
+ Texnikalarga berilgan ballar, ranglar va izohlar to'plami (JSON fayl)
- SIEM indeksi
- Firewall qoidasi
- Tarmoq segmenti
! Qatlamlarni yaratish, birlashtirish va solishtirish mumkin.

? Navigator'da T1059.001 yashil, chunki unga bitta qoida bor. Nega bu adashtirishi mumkin?
- Yashil rang noto'g'ri tanlangan
+ Bitta texnikani ko'p usulda bajarish mumkin; bitta qoida faqat bir nechta procedure'ni qamrashi mumkin
- Qoidalar ATT&CK bilan ishlamaydi
- T1059.001 mavjud emas
! Qamrovni sifat darajasi, izohlar va simulyatsiya natijalari bilan baholash kerak.

? Ma'lumot manbalari qamrovini tahlil qilish nima beradi?
- Qoidalar sonini oshiradi
+ Kerakli loglar yo'qligi sababli umuman ko'rib bo'lmaydigan texnikalarni aniqlaydi
- Hujumchilarni bloklaydi
- Litsenziya narxini kamaytiradi
! Masalan, Sysmon yoki buyruq satri auditi bo'lmasa, Execution texnikalarining katta qismi ko'rinmaydi.

? Purple team mashg'ulotida ATT&CK qanday rol o'ynaydi?
- Faqat red team uchun hujjat
+ Red va blue jamoalar uchun umumiy til: bajarilgan har bir texnika ko'rildimi-yo'qmi tekshiriladi
- Blue team'ni almashtiradi
- Hech qanday rol o'ynamaydi
! Har bir “ko'rmadik” natijasi yangi aniqlash qoidasi uchun vazifaga aylanadi.
:::

:::cards
ATT&CK darajalari? :: Taktika (nima uchun) → texnika (qanday) → sub-texnika (aniqroq) → procedure (aniq guruh qanday qilgan).
Enterprise taktikalari nechta? :: 14 ta: Reconnaissance dan Impact gacha.
ATT&CK'ning qo'shimcha bo'limlari? :: Groups, Software, Mitigations, Campaigns va har bir texnikani aniqlash ma'lumotlari.
4720 va 4732 qaysi texnikalar? :: 4720 — T1136.001 Create Account: Local Account; 4732 — T1098 Account Manipulation.
7045 va 4698 qaysi texnikalar? :: 7045 — T1543.003 Windows Service; 4698 — T1053.005 Scheduled Task.
1102 qaysi texnika? :: T1070.001 — Indicator Removal: Clear Windows Event Logs.
Run kaliti va niqoblangan svchost? :: Run kaliti — T1547.001; AppData'dagi svchost.exe — T1036.005 Masquerading.
Bog'lashdagi uch xato? :: Faqat taktikaga bog'lash, vositaga qarab bog'lash, bitta qoidaga ortiqcha ko'p texnika yozish.
ATT&CK Navigator nima? :: Matritsani qatlamlar (ballar, ranglar, izohlar) bilan bo'yash, birlashtirish va eksport qilish uchun bepul veb-vosita.
Threat-informed defense? :: Sektoringizga hujum qiladigan guruhlar texnikalari (tahdid qatlami) bilan qamrovingizni solishtirib, bo'shliqlarni ustuvor yopish.
Nega yashil katak himoya emas? :: Bitta texnika ko'p procedure'ga ega; qamrovni sifat, izohlar va simulyatsiya natijalari bilan baholash kerak.
Purple team nima? :: Red va blue jamoalar birgalikda: texnika bajariladi va aniqlanganmi tekshiriladi; ATT&CK umumiy til.
:::
