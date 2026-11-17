O'tgan bosqichda bitta hodisani besh xil manbadan tikladik: DNS server, firewall, proxy, DHCP va Sysmon. Har biri uchun boshqa qurilmaga kirdingiz, boshqa formatni o'qidingiz, vaqtlarni qo'lda solishtirdingiz. Bitta hodisa uchun — bir soat.

Endi tasavvur qiling: kompaniyada 3 000 ta kompyuter, 200 ta server, o'nlab tarmoq qurilmalari. Ular birgalikda kuniga **yuz millionlab** log yozuvi chiqaradi. Ularni qo'lda o'qish — okeanni choy qoshig'i bilan to'kib chiqarishdek.

Shuning uchun har bir jiddiy SOC'ning markazida bitta tizim turadi: **SIEM**. Bu bosqichda siz SIEM bilan ishlashni, unda so'rov yozishni va eng muhimi — hujumni avtomatik topadigan qoidalar yaratishni o'rganasiz.

## SIEM nima

[[siem|SIEM]] — Security Information and Event Management. Oddiy so'z bilan: **barcha loglar bitta joyda, bitta qidiruv bilan.**

SIEM to'rtta ishni bajaradi:

1. **Yig'adi** — barcha manbalardan loglarni markaziy joyga.
2. **Tushunadi** — har xil formatdagi yozuvlarni bir xil tuzilishga keltiradi.
3. **Bog'laydi** — turli manbalardagi hodisalarni qoidalar asosida birlashtiradi.
4. **Ogohlantiradi** — shubhali naqsh topilganda analitikka xabar beradi.

O'tgan bosqichdagi markaziy log yig'ish haqidagi ogohlantirishlarni eslang: "hujumchi lokal jurnalni o'chirishi mumkin, markaziy nusxani esa — qiyinroq". SIEM — aynan o'sha markaziy nusxa.

## SIEM ichida nima bo'ladi

Log manbadan analitik ekraniga yetguncha bir necha bosqichdan o'tadi:

```
  Manbalar              Yig'ish            Qayta ishlash                 Saqlash       Foydalanish
┌────────────┐
│ Windows    │──agent──┐
│ Linux      │──agent──┤      ┌──────────────────────────────┐    ┌───────┐   ┌──────────────┐
│ Firewall   │─syslog──┼─────►│ parsing → normalization →    │───►│ Indeks│──►│ Qidiruv      │
│ Proxy, DNS │─syslog──┤      │ enrichment                   │    │ (hot/ │   │ Qoidalar     │
│ EDR        │───API───┤      └──────────────────────────────┘    │ warm/ │   │ Ogohlantirish│
│ Bulut      │───API───┘                                          │ cold) │   │ Dashboard    │
└────────────┘                                                    └───────┘   └──────────────┘
```

### 1. Yig'ish (collection)

| Usul | Qanday | Qayerda ishlatiladi |
|---|---|---|
| **Agent** (forwarder) | Qurilmaga o'rnatilgan dastur loglarni o'qib yuboradi | Windows, Linux serverlar va kompyuterlar |
| **Syslog** | Qurilma loglarini tarmoq orqali o'zi yuboradi | Firewall, router, switch, proxy |
| **API** | SIEM xizmatdan loglarni so'rab oladi | Bulut xizmatlari, pochta, EDR |
| **Fayl yoki ma'lumotlar bazasidan o'qish** | Maxsus ulagich | Eski ilovalar |

### 2. Parsing va normalizatsiya

Uch xil manbadan kelgan bir xil ma'noli yozuvlarni ko'ring:

```
Windows 4625:   IpAddress: 203.0.113.45    TargetUserName: deploy
Linux auth.log: Failed password for deploy from 203.0.113.45 port 51234 ssh2
Firewall:       SRC=203.0.113.45 DST=10.10.10.5 DPT=22 BLOCK
```

Manba IP uchta joyda uch xil nomlangan: `IpAddress`, matn ichida, `SRC`. **Parsing** — xom matndan maydonlarni ajratish. **[[normalization|Normalizatsiya]]** — ularga bir xil nom berish:

| Normallashtirilgan maydon | Windows | Linux | Firewall |
|---|---|---|---|
| `src_ip` | IpAddress | "from" dan keyingi qism | SRC |
| `user` | TargetUserName | "for" dan keyingi qism | — |
| `action` | failure | failure | blocked |

Endi bitta so'rov — `src_ip=203.0.113.45` — uchala manbadan ham natija beradi. Bunday umumiy sxemalar bor: Splunk'da **CIM**, Elastic'da **ECS**, sanoat standarti sifatida **OCSF**.

Normalizatsiyaning yashirin xavfi: parser xato ishlasa, maydon **jimgina bo'sh qoladi**. So'rovingiz hech narsa topmaydi — va siz "hujum yo'q" deb o'ylaysiz. Yangi log manbasi qo'shilganda uning maydonlari to'g'ri ajratilayotganini albatta tekshiring.

### 3. Boyitish (enrichment)

[[enrichment|Boyitish]] — log yozuviga tashqi kontekst qo'shish. Triage darsida qo'lda yig'gan narsalaringizni SIEM avtomatik qiladi:

| Qo'shiladigan ma'lumot | Manba | Foydasi |
|---|---|---|
| IP joylashuvi (mamlakat, shahar) | GeoIP bazasi | "Bu kirish qaysi mamlakatdan?" |
| Qurilma egasi va muhimligi | Aktivlar ro'yxati (CMDB) | "Bu domen kontrollerimi yoki test VM'mi?" |
| Foydalanuvchi bo'limi va lavozimi | Active Directory | "Buxgalter yoki administrator?" |
| Tahdid ro'yxatidagi holat | Tahdid razvedkasi manbalari | "Bu IP ma'lum zararli manzilmi?" |

### 4. Saqlash

Loglar abadiy saqlanmaydi — bu juda qimmat. Odatda qatlamlarga bo'linadi:

| Qatlam | Muddat (taxminan) | Tezlik |
|---|---|---|
| **Hot** | Oxirgi kunlar va haftalar | Tez qidiriladi |
| **Warm** | Bir necha oy | Sekinroq |
| **Cold / arxiv** | Yil va undan ko'p | Sekin, ba'zan avval tiklash kerak |

Saqlash muddatini (retention) ko'pincha qonunlar va standartlar belgilaydi. Tergov nuqtai nazaridan esa muhim savol: **hujumchi tarmoqda o'rtacha qancha vaqt sezilmay yuradi?** Bu ko'pincha haftalar, ba'zan oylar. Loglar bir hafta saqlansa, hujumning boshlanishini hech qachon topa olmaysiz.

### 5. Foydalanish

- **Qidiruv** — analitik so'rov yozadi (keyingi darsda Splunk SPL).
- **Qoidalar** — saqlangan so'rovlar muntazam ishga tushadi va natija bo'lsa ogohlantirish yaratadi.
- **Dashboard** — vaziyatni bir qarashda ko'rsatuvchi grafiklar.
- **Hisobotlar** — rahbariyat va audit uchun.

## Korrelyatsiya — SIEM'ning yuragi

Bitta log yozuvi kamdan-kam hollarda o'zi hujum haqida gapiradi. Kuch — [[correlation|korrelyatsiya]]da: turli hodisalarni bitta qoida bilan bog'lash.

Windows darsidagi zanjirni eslang. Uni SIEM qoidasi sifatida yozsak:

```
QOIDA: "Parol terishdan keyin muvaffaqiyatli kirish va yangi administrator"

AGAR   bitta src_ip dan 10 daqiqa ichida ≥ 20 ta muvaffaqiyatsiz kirish (4625)
VA     keyin shu src_ip dan muvaffaqiyatli kirish (4624)
VA     keyingi 30 daqiqada shu foydalanuvchi yangi hisob yaratsa (4720)
       yoki uni administratorlar guruhiga qo'shsa (4732)
UNDA   ogohlantirish: Yuqori jiddiylik
```

Bu qoidaning har bir qismi alohida — kundalik hodisa. Faqat **ketma-ketlik** xavf haqida gapiradi. Qo'lda buni minglab qurilmada kuzatish imkonsiz; SIEM uni har bir necha daqiqada avtomatik tekshiradi.

Korrelyatsiya turlari:

| Tur | Misol |
|---|---|
| **Chegara** (threshold) | 5 daqiqada bitta hisobga 50 ta muvaffaqiyatsiz kirish |
| **Ketma-ketlik** | Muvaffaqiyatsiz kirishlar → muvaffaqiyatli kirish → yangi administrator |
| **Manbalararo** | Proxy'da zararli domenga murojaat + shu qurilmada yangi jarayon (Sysmon) |
| **Ro'yxatga solishtirish** | Har qanday log tahdid ro'yxatidagi IP bilan mos kelsa |
| **Noodatiylik** | Foydalanuvchi odatda 200 MB yuklaydi, bugun 20 GB |

Oxirgi turdagi xulq-atvor tahlili ko'pincha alohida modul sifatida keladi — [[ueba|UEBA]]. U har bir foydalanuvchi va qurilma uchun "odatiy holat"ni ([[baseline|baseline]]) o'rganadi va chetlanishlarni belgilaydi.

## Qaysi loglarni yig'ish kerak

SIEM litsenziyasi ko'pincha **kuniga yig'ilgan hajm** (GB/kun) bo'yicha to'lanadi. Hamma narsani yig'ish — juda qimmat va shovqinli. Shuning uchun ustuvorlik kerak.

| Ustuvorlik | Manba | Nega |
|---|---|---|
| **1** | Identifikatsiya: Active Directory, bulut kirish tizimi, VPN | Deyarli har bir hujum hisob ma'lumotlari bilan bog'liq |
| **1** | EDR / Sysmon | Qurilmada nima ishga tushgani |
| **1** | Firewall, proxy, DNS | Tashqi dunyo bilan har qanday aloqa |
| **2** | Pochta tizimi | Phishing — eng ko'p boshlanish nuqtasi |
| **2** | Muhim serverlar va bulut boshqaruv jurnallari | "Toj javohirlari" |
| **3** | Veb-serverlar, ma'lumotlar bazalari, ilovalar | Muayyan hujumlarni aniqlash uchun |

Savol doim bitta: **"Bu log qaysi hujumni aniqlashga yordam beradi?"** Javob bo'lmasa — balki uni yig'ish shart emasdir. Bu fikrni aniqlash muhandisligi darsida davom ettiramiz.

:::key
**SIEM o'zi hech narsani aniqlamaydi.** U faqat siz bergan loglar va siz yozgan qoidalar darajasida aqlli. "Axlat kirsa — axlat chiqadi": muhim manba ulanmagan bo'lsa, parser buzilgan bo'lsa yoki qoida yozilmagan bo'lsa, hujum SIEM ichida jimgina yotaveradi. Ko'p kompaniyalar qimmat SIEM sotib olib, uni bir yildan keyin ham faqat log arxivi sifatida ishlatadi. SIEM — vosita; uni foydali qiladigan narsa — analitik va aniqlash muhandisi.
:::

## Vaqt — hamma narsaning asosi

Korrelyatsiya hodisalarni **vaqt bo'yicha** bog'laydi. Agar qurilmalarning soatlari farq qilsa, hamma narsa buziladi: "avval kirish, keyin parol terish" bo'lib ko'rinadi.

- Barcha qurilmalar bitta vaqt manbasiga [[ntp|NTP]] orqali sinxronlanishi kerak.
- SIEM odatda hamma narsani **UTC** da saqlaydi va ekranda mahalliy vaqtda ko'rsatadi.
- Ikki vaqt bor: hodisa **sodir bo'lgan** vaqt va SIEM uni **qabul qilgan** vaqt. Agent bir soat uzilib qolsa, loglar kechikib keladi — qoidalar buni hisobga olishi kerak.

## SIEM bozori

| Tizim | Turi | Eslatma |
|---|---|---|
| **Splunk** | Tijoriy | Eng keng tarqalganlaridan; ish e'lonlarida ko'p so'raladi — keyingi dars |
| **Microsoft Sentinel** | Bulut, tijoriy | Microsoft muhitidagi kompaniyalarda; KQL (Kusto) tili |
| **Elastic Security** | Ochiq kod asosida | Elasticsearch + Kibana |
| **Wazuh** | Ochiq kod, bepul | SIEM + endpoint agenti; laboratoriya uchun ideal |
| **IBM QRadar**, **Google SecOps** va boshqalar | Tijoriy | Yirik korxonalarda |

Qaysi birini o'rganish kerak? **Tushuncha bir xil**: indeks, maydon, qidiruv, statistika, qoida. Bitta tizimni chuqur bilsangiz, boshqasiga bir-ikki haftada o'tasiz. Ish bozori uchun Splunk va Sentinel asoslari foydali; o'z laboratoriyangiz uchun Wazuh va Elastic bepul.

## SIEM atrofidagi tizimlar

| Tizim | Vazifasi |
|---|---|
| **SIEM** | Loglarni yig'ish, qidirish, aniqlash |
| **SOAR** | Ogohlantirishga javobni avtomatlashtirish: IOC'ni tekshirish, tiket ochish, qurilmani ajratish |
| **EDR** | Qurilmadagi chuqur telemetriya va javob |
| **XDR** | EDR + tarmoq + pochta + bulut, bitta platformada |
| **Case management** | Insidentlar va tiketlar |

[[edr|EDR]] va uning kengaytirilgan shakli [[xdr|XDR]] haqida shu bosqichning EDR darsida batafsil gaplashamiz. [[soar|SOAR]] misoli: "phishing xabar qilindi" ogohlantirishi kelganda, playbook avtomatik ravishda xatdan havolalar va xeshlarni ajratadi, ularni tahdid bazalarida tekshiradi, natijalarni tiketga yozadi va analitikka tayyor tahlilni beradi. Analitik endi 15 daqiqa emas, 2 daqiqa sarflaydi. Lekin qarorni baribir odam qabul qiladi.

## SIEM nimani qilmaydi

- **Ulanmagan manbani ko'rmaydi** — qamrovdagi bo'shliqlar ko'rinmas bo'shliqlar.
- **Yozilmagan qoidani ishga tushirmaydi** — standart qoidalar sizning muhitingizga moslashtirilmagan.
- **Kontekstni o'zi bilmaydi** — aktivlar va foydalanuvchilar ro'yxati berilmasa, "bu server muhimmi?" degan savolga javob yo'q.
- **Hujumni to'xtatmaydi** — u ko'radi va xabar beradi; to'xtatish — EDR, firewall va odamlarning ishi.
- **Shovqinni o'zi kamaytirmaydi** — sozlanmagan qoidalar alert fatigue'ning asosiy sababi.

:::try
**1. Arxitekturani chizing.** O'zingiz tasavvur qilgan kichik kompaniya uchun (50 xodim, bitta ofis, 3 ta server, firewall, bulut pochta) SIEM arxitekturasini qog'ozda chizing: qaysi manbalar, qanday yig'iladi (agent, syslog, API), qanday boyitiladi.

**2. Ustuvorlik.** Shu kompaniya uchun litsenziya faqat 5 ta log manbasiga yetadi. Qaysilarini tanlaysiz va nega?

**3. Normalizatsiya.** Quyidagi ikki yozuv uchun `src_ip`, `user`, `action` maydonlarini ajrating:
- `Nov 16 02:14:07 web01 sshd[2211]: Accepted publickey for deploy from 198.51.100.20 port 50022 ssh2`
- `2026-11-16T02:15:00Z fw01 action=deny src=203.0.113.45 dst=10.10.10.5 dport=3389`

**4. TryHackMe** — "Introduction to SIEM" xonasini bajaring.

*Javoblar: 2 — tavsiya: identifikatsiya (AD yoki bulut kirish tizimi), EDR/Sysmon, firewall, DNS yoki proxy, pochta tizimi. 3 — birinchisi: `src_ip=198.51.100.20`, `user=deploy`, `action=success`; ikkinchisi: `src_ip=203.0.113.45`, `user` yo'q, `action=blocked` (yoki deny).*
:::

## Xulosa

- **SIEM** — barcha loglar bitta joyda: yig'ish, tushunish, bog'lash, ogohlantirish.
- Yo'l: **yig'ish** (agent, syslog, API) → **parsing va normalizatsiya** → **boyitish** → **saqlash** (hot/warm/cold) → **qidiruv, qoidalar, dashboard**.
- Normalizatsiya bitta so'rovni barcha manbalarda ishlatish imkonini beradi (CIM, ECS, OCSF); buzilgan parser — jim bo'shliq.
- **Korrelyatsiya**: chegara, ketma-ketlik, manbalararo, ro'yxat, noodatiylik (UEBA).
- Manbalar ustuvorligi: **identifikatsiya, EDR, firewall/proxy/DNS** birinchi.
- Barcha qurilmalar **NTP** bilan sinxron, SIEM'da vaqt — UTC.
- SIEM o'zi aqlli emas: u loglar va qoidalar darajasida aqlli.

:::quiz
? SIEM'ning asosiy vazifasi nima?
- Zararli dasturlarni bloklash
+ Turli manbalardagi loglarni markazda yig'ish, qidirish, bog'lash va ogohlantirish chiqarish
- Tarmoq trafigini shifrlash
- Parollarni saqlash
! SIEM ko'radi va xabar beradi; u hujumni o'zi to'xtatmaydi.

? Normalizatsiya nima?
- Loglarni o'chirish
+ Turli manbalardagi maydonlarga bir xil nom va format berish
- Loglarni siqish
- Loglarni shifrlash
! Masalan, IpAddress, SRC va matn ichidagi IP — hammasi src_ip bo'ladi. Shunda bitta so'rov barcha manbalarda ishlaydi.

? Yangi firewall SIEM'ga ulandi, lekin parser src_ip maydonini ajratmayapti. Bu nega xavfli?
- SIEM ishdan chiqadi
+ src_ip bo'yicha qidiruv va qoidalar shu manbadan jimgina hech narsa topmaydi — hujum ko'rinmay qoladi
- Firewall o'chib qoladi
- Hech qanday xavf yo'q
! Buzilgan parser xato bermaydi — u shunchaki bo'sh maydon qoldiradi. Yangi manbani doim tekshirish kerak.

? Log yozuviga IP joylashuvi, qurilma egasi va tahdid ro'yxatidagi holatni qo'shish nima deyiladi?
- Normalizatsiya
+ Boyitish (enrichment)
- Arxivlash
- Korrelyatsiya
! Boyitish analitikka triage paytida qo'lda yig'adigan kontekstni avtomatik beradi.

? Qaysi qoida korrelyatsiyaga misol?
- Barcha 4624 yozuvlarini ko'rsatish
+ Bitta IP'dan ko'p muvaffaqiyatsiz kirish, keyin shu IP'dan muvaffaqiyatli kirish va yangi administrator yaratilishi
- Loglarni sana bo'yicha saralash
- Faqat firewall loglarini saqlash
! Korrelyatsiya alohida hodisalarni ketma-ketlik yoki shartlar bilan bitta ma'noli ogohlantirishga birlashtiradi.

? Litsenziya cheklangan. Qaysi manbalar birinchi navbatda ulanishi kerak?
+ Identifikatsiya (AD, VPN), EDR yoki Sysmon, firewall/proxy/DNS
- Printer va kondisioner loglari
- Faqat veb-sayt kirish statistikasi
- Ish stoli fon rasmi o'zgarishlari
! Hisob ma'lumotlari, qurilma faoliyati va tashqi aloqa — deyarli har bir hujumning asosiy izlari.

? Nega barcha qurilmalar NTP bilan sinxronlanishi kerak?
- Internet tezroq ishlashi uchun
+ Korrelyatsiya hodisalarni vaqt bo'yicha bog'laydi; soatlar farq qilsa, ketma-ketlik buziladi
- Bu litsenziya talabi
- Loglar kichikroq bo'lishi uchun
! Bir necha daqiqalik farq ham “avval kirish, keyin parol terish” kabi noto'g'ri hikoya yaratadi.

? Loglar faqat 7 kun saqlanadi. Bu nega muammo?
- Disk to'lib qoladi
+ Hujumchilar ko'pincha haftalab sezilmay yuradi — hujumning boshlanishini topib bo'lmaydi
- SIEM ishlamay qoladi
- Muammo emas
! Saqlash muddati tergov chuqurligini belgilaydi.

? UEBA nima qiladi?
- Firewall qoidalarini yozadi
+ Foydalanuvchi va qurilmalarning odatiy xulqini o'rganib, undan chetlanishlarni belgilaydi
- Pochtani shifrlaydi
- Zaxira nusxa oladi
! Masalan, odatda 200 MB yuklaydigan xodim bir kunda 20 GB yuklasa.

? SOAR'ning SIEM'dan asosiy farqi nima?
- SOAR loglarni saqlaydi
+ SOAR ogohlantirishga javob qadamlarini playbook asosida avtomatlashtiradi
- SOAR faqat dashboard chizadi
- Farqi yo'q
! SIEM aniqlaydi; SOAR IOC tekshirish, tiket ochish, qurilmani ajratish kabi qadamlarni avtomatlashtiradi.

? “SIEM sotib oldik, endi xavfsizmiz” degan fikr nega noto'g'ri?
- SIEM juda sekin
+ SIEM faqat ulangan manbalar va yozilgan qoidalar darajasida foydali; sozlanmagan SIEM — shunchaki log arxivi
- SIEM faqat Linux'da ishlaydi
- SIEM internetni o'chiradi
! Vosita o'zi aniqlamaydi — uni analitiklar va aniqlash muhandislari foydali qiladi.
:::

:::cards
SIEM nima? :: Security Information and Event Management — loglarni markazda yig'ish, normallashtirish, qidirish, korrelyatsiya qilish va ogohlantirish chiqarish tizimi.
SIEM'da logning yo'li? :: Yig'ish (agent, syslog, API) → parsing → normalizatsiya → boyitish → saqlash → qidiruv, qoidalar, dashboard.
Normalizatsiya nima? :: Turli manbalardagi maydonlarni bir xil nomga keltirish (IpAddress, SRC → src_ip). Sxemalar: CIM, ECS, OCSF.
Boyitish nima? :: Logga GeoIP, qurilma egasi va muhimligi, foydalanuvchi bo'limi, tahdid ro'yxatidagi holat kabi kontekstni qo'shish.
Korrelyatsiya turlari? :: Chegara, ketma-ketlik, manbalararo, ro'yxatga solishtirish, noodatiylik (UEBA).
Birinchi navbatdagi log manbalari? :: Identifikatsiya (AD, bulut kirish, VPN), EDR yoki Sysmon, firewall, proxy, DNS.
Hot, warm, cold saqlash? :: Hot — yangi, tez qidiriladi; warm — bir necha oy, sekinroq; cold — arxiv, uzoq muddat, sekin.
Nega NTP muhim? :: Korrelyatsiya vaqtga asoslanadi; soatlar farq qilsa, hodisalar ketma-ketligi buziladi. SIEM odatda UTC'da saqlaydi.
UEBA nima? :: Foydalanuvchi va qurilmalarning odatiy xulqini o'rganib, chetlanishlarni aniqlaydigan tahlil.
SOAR nima? :: Ogohlantirishlarga javob qadamlarini playbook asosida avtomatlashtiruvchi tizim.
XDR nima? :: Endpoint, tarmoq, pochta va bulut telemetriyasini birlashtirgan aniqlash va javob platformasi.
SIEM'ning asosiy cheklovi? :: U faqat ulangan manbalar va yozilgan qoidalar darajasida aqlli: axlat kirsa — axlat chiqadi.
:::
