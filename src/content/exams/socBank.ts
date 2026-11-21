/* SOC / Blue Team exam: scenario questions, grouped by exam topic. Format: see parseBank in engine/exam.ts.
 * Written with § for the backtick (the bank is a template literal); it becomes ` when loaded. Wrong options are
 * plausible misconceptions of about the same length as the right one (a content test checks the lengths). */

export const SOC_BANK = String.raw`
## loglar
? Domen kontrollerida bir hisob uchun 5 daqiqada 300 ta Security hodisasi chiqdi. Qaysi Event ID muvaffaqiyatsiz kirish urinishini bildiradi?
- 4624
+ 4625
- 4634
- 4688
! 4624 — muvaffaqiyatli kirish, 4625 — muvaffaqiyatsiz, 4634 — chiqish, 4688 — jarayon yaratilishi.

? 4624 hodisasida §Logon Type 10§ yozilgan. Bu qanday kirish?
- Klaviatura orqali joyida kirish
+ Masofaviy ish stoli (RDP) orqali kirish
- Tarmoq papkasiga (SMB) murojaat
- Xizmat (service) nomidan ishga tushish
! 2 — interaktiv, 3 — tarmoq (SMB), 5 — xizmat, 10 — RemoteInteractive (RDP). Tunda tashqi IP'dan Type 10 — tekshirish sababi.

? Serverda Security jurnalida §1102§ hodisasi paydo bo'ldi. Bu nimani bildiradi va nega muhim?
- Jurnal hajmi to'lib, eski yozuvlar avtomatik o'chdi
+ Audit jurnali tozalangan — iz yashirish belgisi
- Yangi audit siyosati muvaffaqiyatli qo'llandi
- Jurnal boshqa serverga zaxiralab yuborildi
! 1102 — "The audit log was cleared". Hujumchilar izni yashirish uchun shunday qiladi; shuning uchun loglar markaziy SIEM'ga darhol yuboriladi.

? Kechasi ish stantsiyasida §4720§ hodisasi chiqdi. Nima bo'lgan?
- Foydalanuvchi paroli o'zgartirilgan
+ Yangi foydalanuvchi hisobi yaratilgan
- Hisob ko'p xato tufayli bloklangan
- Foydalanuvchi guruhdan chiqarilgan
! 4720 — hisob yaratildi, 4740 — bloklandi, 4723/4724 — parol o'zgartirish. Kutilmagan yangi hisob — persistence belgisi.

? Sysmon'da qaysi Event ID DNS so'rovlarini yozadi?
- 1
- 3
- 11
+ 22
! 1 — jarayon yaratilishi, 3 — tarmoq ulanishi, 11 — fayl yaratilishi, 22 — DNS so'rovi.

? Sysmon EventID 1 ning standart Windows audit yozuvlariga nisbatan asosiy afzalligi nima?
- U Windows'ga o'rnatilmasdan ishlaydi
+ Fayl xeshi va ota-jarayon buyruq qatori yoziladi
- U zararli jarayonlarni avtomatik to'xtatadi
- Loglar hech qachon o'chirib bo'lmaydigan bo'ladi
! Sysmon jarayonning xeshi, ota-jarayoni va buyruq qatorlarini bir hodisada beradi. U faqat yozadi, bloklamaydi; jurnalni administrator o'chira oladi.

? Ubuntu serverda SSH orqali kirishlar qaysi faylda yoziladi?
- /var/log/syslog.1
+ /var/log/auth.log
- /var/log/kern.log
- /var/log/dpkg.log
! Debian/Ubuntu — /var/log/auth.log, RHEL oilasi — /var/log/secure. journald ishlatilsa — journalctl -u ssh.

? Phishing xatining sarlavhalarida SPF, DKIM va DMARC tekshiruvi natijasi qaysi sarlavhada bo'ladi?
- X-Originating-IP
+ Authentication-Results
- DKIM-Signature
- X-MS-Exchange-Organization-SCL
! Qabul qiluvchi server natijani Authentication-Results ga yozadi (spf=fail, dkim=none, dmarc=fail). DKIM-Signature — imzoning o'zi, natija emas.

? Xat §From: info@mybank.uz§ deb ko'rsatadi, lekin §Return-Path: bounce@mailer-pay.example§ va §spf=pass§. Qaysi xulosa to'g'ri?
- SPF o'tdi, demak xat haqiqatan mybank.uz dan
+ SPF From'ni emas, mailer-pay.example domenini tekshirgan
- Return-Path farqi oddiy hol, uni tekshirishning hojati yo'q
- SPF o'tgani uchun DKIM va DMARC ahamiyatsiz
! SPF konvert jo'natuvchisi (Return-Path) domenini tekshiradi. From domeniga moslikni DMARC tekshiradi — aynan shuning uchun DMARC kerak.

? EDR ma'lumoticha zararli PowerShell skripti ishlagan, lekin SIEM qoidasi hech qanday ogohlantirish bermagan. Bu holat nima deb ataladi?
- False positive
- True positive
+ False negative
- True negative
! Zararli harakat bo'ldi, lekin aniqlanmadi — false negative. Bunday holat qoidani yoki log manbasini qayta ko'rishni talab qiladi.

? Kelgan ogohlantirishni birinchi bo'lib ko'rib, haqiqiy yoki yolg'onligini aniqlab, kerak bo'lsa yuqoriga uzatadigan kim?
- L3 tahlilchi (hunting)
+ L1 tahlilchi (triage)
- SOC menejeri
- Detection muhandisi
! L1 — triage va eskalatsiya, L2 — chuqur tergov va javob, L3 — hunting, murakkab tahlil, qoidalar.

? Veb-server logida bitta IP 40 soniyada §/.env§, §/wp-admin§, §/phpmyadmin§, §/backup.zip§ kabi 900 ta manzilni so'ragan, deyarli hammasi 404. Bu nima?
- Qidiruv tizimi robotining saytni odatiy indekslashi
+ Avtomatik skaner sirli fayl va panellarni qidirmoqda
- Foydalanuvchi eski xatcho'plarni ochmoqda
- Sayt bosh sahifasi noto'g'ri yo'naltirilgan
! Qisqa vaqtda ko'p, tanish "qimmatli" yo'llar va 404 — avtomatik skan. Keyingi qadam: 200 javob olgan so'rov bormi?

? PowerShell'da bajarilgan skriptning ochiq matnini (hatto -EncodedCommand bilan berilgan bo'lsa ham) qaysi yozuv saqlaydi?
- Security 4688
+ PowerShell 4104
- System 7045
- Sysmon 3
! 4104 — Script Block Logging: PowerShell kodni dekodlab, bajarishdan oldin yozadi. 7045 — yangi xizmat o'rnatildi.

## siem
? SIEM'da "normalizatsiya" nima?
- Eski loglarni arxivga ko'chirish
+ Turli manbalar maydonlarini bir xil nomga keltirish
- Takroriy ogohlantirishlarni bittaga birlashtirib o'chirish
- Loglarni shifrlab, faqat o'qishga ochish
! Masalan, bir manbada src, boshqasida SourceIP — normalizatsiyadan keyin ikkalasi src_ip. Shunda bitta qoida hamma manbada ishlaydi.

? Splunk'da muvaffaqiyatsiz kirishlarni har foydalanuvchi bo'yicha sanash uchun qaysi so'rov to'g'ri?
- index=wineventlog EventCode=4625 | table count by user
+ index=wineventlog EventCode=4625 | stats count by user
- index=wineventlog EventCode=4625 | sort count by user
- index=wineventlog EventCode=4625 | count stats user
! stats count by — guruhlab sanash. table faqat ustunlarni ko'rsatadi, sort saralaydi.

? §index=firewall action=blocked | stats count by src_ip | where count > 100§ nima qaytaradi?
- 100 ta eng ko'p bloklangan IP ro'yxatini
+ 100 dan ortiq bloklangan ulanishi bor IP'larni
- Birinchi 100 ta bloklangan hodisani
- 100 soniyadan uzoq davom etgan ulanishlarni
! where stats natijasini filtrlaydi: count ustuni 100 dan katta bo'lgan qatorlar qoladi. "Birinchi 100 ta" — head 100.

? Splunk'dagi §stats count by Computer§ ning Sentinel (KQL) dagi muqobili qaysi?
- | project count() by Computer
+ | summarize count() by Computer
- | extend count() by Computer
- | where count() by Computer
! KQL'da guruhlab hisoblash — summarize. project ustun tanlaydi, extend yangi ustun qo'shadi.

? KQL'da faqat oxirgi bir soatdagi yozuvlarni olish uchun qaysi shart to'g'ri?
- | where TimeGenerated < ago(1h)
+ | where TimeGenerated > ago(1h)
- | where TimeGenerated == now(1h)
- | take TimeGenerated 1h
! ago(1h) — hozirdan bir soat oldin; undan keyingi (katta) vaqtlar kerak.

? Qaysi korrelyatsiya qoidasi "parol tanlash muvaffaqiyatli bo'ldi" holatini eng yaxshi ushlaydi?
- Bir hisobga kuniga 3 dan ortiq muvaffaqiyatli kirish
+ Bir IP'dan ko'p 4625, so'ng darhol 4624 shu hisobga
- Har qanday 4625 hodisasi uchun alohida ogohlantirish
- Ish vaqtidan tashqari har bir kirish uchun ogohlantirish
! Korrelyatsiya — bir nechta hodisani vaqt va maydon bo'yicha bog'lash: ko'p xato + keyin muvaffaqiyat, bir manba, qisqa oraliq.

? Sigma qoidasi nima?
- Splunk'ning ichki, yopiq qoida formati
+ Mahsulotdan mustaqil format, SPL/KQL ga o'giriladi
- Faqat tarmoq paketlariga yoziladigan qoida turi
- Antivirus imzolari uchun binary format
! Sigma YAML'da yoziladi va sigma convert bilan Splunk, Sentinel va boshqa SIEM tillariga aylantiriladi. Tarmoq uchun — Suricata, fayllar uchun — YARA.

? MITRE ATT&CK'dagi §T1059.001§ (PowerShell) nimani bildiradi?
- Execution taktikasining o'zi, alohida texnika ko'rsatilmagan
+ T1059 texnikasining sub-texnikasi (PowerShell varianti)
- PowerShell'dagi aniq bir zaiflikning (CVE) raqami
- Hujumchi guruhining (APT) MITRE'dagi identifikatori
! Taktika — maqsad (nima uchun: Execution), texnika — usul (T1059), sub-texnika — aniq varianti (.001 PowerShell). CVE — boshqa katalog.

? "PowerShell ishga tushdi" qoidasi kuniga 400 ta ogohlantirish beryapti, ularning 390 tasi IT'ning inventar skripti. To'g'ri yechim?
- Qoidani butunlay o'chirib qo'yish
+ Aniq yo'l va ota-jarayon bo'yicha istisno qo'shish
- Ogohlantirishlarni faqat haftada bir ko'rish
- Barcha PowerShell'ni korporativ tarmoqda taqiqlash
! Tor, hujjatlashtirilgan istisno (skript yo'li + ota-jarayon + hisob) shovqinni kamaytiradi va qolgan aniqlashni saqlaydi. Qoidani o'chirish — ko'r bo'lib qolish.

? "Pyramid of Pain" bo'yicha hujumchi uchun qaysi indikatorni almashtirish eng qiyin?
- Fayl xeshi (SHA-256)
- C2 serverining IP manzili
- Fishing domenining nomi
+ TTP — ishlash usullari
! Xeshni bir bayt bilan, IP va domenni pul bilan almashtirish oson; ishlash usulini (TTP) o'zgartirish — qimmat. Shuning uchun xulq-atvorga asoslangan aniqlash kuchliroq.

? Nega barcha serverlar va log manbalari NTP orqali vaqtni sinxronlashi kerak?
- Loglar diskda kamroq joy egallashi uchun
+ Turli manbalardagi hodisalarni vaqt bo'yicha bog'lash uchun
- SIEM litsenziyasi hajmini kamaytirish uchun
- Loglar tarmoq orqali faqat shifrlangan holda borishi uchun
! Vaqt 3 daqiqa farq qilsa, "avval nima bo'ldi" degan savolga noto'g'ri javob chiqadi. Korrelyatsiya qoidalari ham vaqt oralig'iga tayanadi.

? Word hujjatidan PowerShell ishga tushishini aniqlash uchun qaysi log manbasi albatta kerak?
- Firewall'ning chiquvchi trafik jurnali (NetFlow)
+ Jarayon yaratilishi logi (ota-jarayon bilan)
- Veb-proksining URL kirishlari jurnali
- DNS serverning so'rovlar jurnali
! "Kim kimni ishga tushirdi" — Sysmon EventID 1 yoki buyruq qatori yoqilgan 4688. Tarmoq loglari buni ko'rsatmaydi.

## aniqlash
? IDS va IPS farqi nima?
- IDS shifrlangan trafikni, IPS ochiq trafikni tekshiradi
+ IDS ogohlantiradi, IPS trafik yo'lida turib to'sadi
- IDS faqat Windows'da, IPS faqat Linux'da ishlaydi
- IDS imzolar bilan, IPS faqat sun'iy intellekt bilan
! IPS inline turadi va paketni tashlay oladi. Shuning uchun noto'g'ri IPS qoidasi oddiy xizmatni ham to'xtatishi mumkin.

? Imzoga (signature) asoslangan aniqlashning asosiy kamchiligi nima?
- Juda ko'p yolg'on ogohlantirish beradi
+ Yangi, imzosi yo'q hujumni ko'rmaydi
- Tarmoqni sezilarli darajada sekinlashtiradi
- Faqat Linux serverlarda ishlay oladi
! Imzo — ma'lum hujumning izi. Anomaliyaga asoslangan aniqlash yangi narsani ko'rishi mumkin, lekin yolg'on ogohlantirishlari ko'proq.

? Suricata qoidasidagi §sid:1000005;§ nima uchun kerak?
- Qoidaning qaysi portga tegishli ekanini bildiradi
+ Qoidaning noyob identifikatori, alertda ko'rinadi
- Qoida necha soniyada bir ishlashini belgilaydi
- Qoida qaysi tarmoq interfeysida ishlashini aytadi
! sid — signature ID; alert va eve.json da shu raqam chiqadi. 1000000 dan boshlab — mahalliy qoidalar uchun.

? Zeek tarmoq trafigidan asosan nima hosil qiladi?
- Faqat zararli paketlar uchun ogohlantirishlar
+ conn, dns, http, ssl kabi tuzilgan loglar
- Trafikning shifrlanmagan to'liq nusxasi
- Firewall uchun bloklash qoidalari ro'yxati
! Zeek — tarmoqni kuzatuvchi: har ulanish va protokol uchun jadval ko'rinishidagi log yozadi. Imzo bo'yicha alert berish — Suricata ishi.

? HTTPS trafigini deshifrlamasdan IDS nimani ko'ra oladi?
- So'ralgan to'liq URL manzil va uning parametrlarini
+ SNI (server nomi) va sertifikat ma'lumotlarini
- POST so'rovi ichidagi forma maydonlarini
- Javobdagi HTML sahifa matni va rasmlarini
! TLS ichidagi yo'l, so'rov tanasi va javob shifrlangan. Ochiq qoladi: IP, port, SNI, sertifikat, hajm va vaqt naqshlari.

? EDR an'anaviy antivirusdan nimasi bilan farq qiladi?
- EDR faqat fayl xeshlarini imzo bazasi bilan solishtiradi
+ EDR xulq telemetriyasini yozadi va javob choralarini beradi
- EDR internetga ulanmagan kompyuterlarda ishlamaydi
- EDR o'rnatilsa, SIEM va markaziy loglar kerak bo'lmay qoladi
! EDR jarayon, fayl, registr va tarmoq hodisalarini yozadi, tergov va izolyatsiya imkonini beradi. U SIEM'ning o'rnini bosmaydi.

? EDR konsolida "Isolate device" bosildi. Nima bo'ladi?
- Kompyuter darhol o'chiriladi va diski shifrlanadi
+ Tarmoq uziladi, faqat EDR serveri bilan aloqa qoladi
- Foydalanuvchi hisobi domendan o'chirib tashlanadi
- Barcha jarayonlar to'xtab, xotira tozalanadi
! Izolyatsiya tarqalishni to'xtatadi, lekin kompyuter yoniq qoladi: xotira dalillari saqlanadi va tahlilchi EDR orqali ishlashda davom etadi.

? YARA qoidasida §condition: uint16(0) == 0x5A4D and 2 of them§ nimani anglatadi?
- Fayl 2 baytdan katta va ichida 0x5A4D qiymati uchraydi
+ Fayl MZ bilan boshlanadi va kamida ikkita satr topildi
- Faylda 0x5A4D ikki marta uchraydi
- Fayl ZIP arxiv va unda ikkita fayl bor
! 0x5A4D — little-endian'da "MZ", PE (Windows dastur) fayllarining boshi. "2 of them" — qoidadagi satrlardan kamida ikkitasi.

? YARA qayerda ishlatiladi?
- Tarmoq paketlarini real vaqtda to'sishda
+ Fayl va xotirani naqshlar bo'yicha skanerlashda
- Foydalanuvchi kirishlarini korrelyatsiya qilishda
- Firewall qoidalarini avtomatik yozishda
! YARA — fayl va xotira uchun naqsh tili. Tarmoq uchun Suricata, loglar uchun Sigma ishlatiladi.

? Nega IP manzil ko'rinishidagi IOC'lar tez eskiradi?
- IP manzillar har kuni avtomatik o'zgaradi
+ Infratuzilma arzon almashtiriladi, IP qayta beriladi
- IOC bazalari IP'larni bir haftadan keyin o'chiradi
- IPv6 tufayli IPv4 manzillar ishlatilmay qoldi
! Hujumchi yangi VPS'ni daqiqalarda oladi, eski IP esa keyin boshqa (begunoh) mijozga beriladi. IOC'ning muddati va manbasi doim tekshiriladi.

? Hamkor tashkilot hisobotni §TLP:AMBER§ belgisi bilan yubordi. Uni kimga ko'rsatish mumkin?
- Hamma joyda, jumladan ijtimoiy tarmoqlarda
+ O'z tashkilotingiz ichida, bilishi kerak bo'lganlarga
- Faqat hisobotni yuborgan shaxsning o'ziga qaytarib
- Faqat davlat organlariga, boshqa hech kimga
! TLP:CLEAR — cheklovsiz, GREEN — hamjamiyat ichida, AMBER — o'z tashkiloti (va mijozlari) ichida zarurat bo'yicha, RED — faqat shaxsan qabul qiluvchilarga.

? STIX va TAXII farqi nima?
- STIX — almashish protokoli, TAXII — ma'lumot formati
+ STIX — ma'lumot formati, TAXII — almashish protokoli
- STIX — Windows uchun, TAXII — Linux uchun standart
- STIX — pullik baza, TAXII — bepul baza nomi
! STIX IOC, kampaniya va aloqalarni tuzilgan ko'rinishda ifodalaydi; TAXII ularni serverlar orasida avtomatik tarqatadi.

? IPS rejimiga yangi qoida qo'shildi va u keng tarqalgan qatorga mos keladi. Qanday xavf bor?
- Qoida ishlamasdan, hujumlar o'tib ketadi
+ Oddiy trafik ham to'silib, xizmatlar to'xtaydi
- IPS loglari to'lib, SIEM o'chib qoladi
- Qoida avtomatik ravishda IDS rejimiga o'tadi
! IPS'dagi xato — mavjudlikka (availability) zarba. Shuning uchun yangi qoidalar avval IDS (alert) rejimida sinab ko'riladi.

## ir
? NIST SP 800-61 bo'yicha incident response bosqichlarining to'g'ri tartibi qaysi?
- Aniqlash va tahlil → Tayyorgarlik → Cheklash, yo'qotish, tiklash → Xulosa
+ Tayyorgarlik → Aniqlash va tahlil → Cheklash, yo'qotish, tiklash → Xulosa
- Tayyorgarlik → Cheklash, yo'qotish, tiklash → Aniqlash va tahlil → Xulosa
- Cheklash, yo'qotish, tiklash → Aniqlash va tahlil → Tayyorgarlik → Xulosa
! Preparation → Detection & Analysis → Containment, Eradication & Recovery → Post-Incident Activity.

? Dalil to'plashda "o'zgaruvchanlik tartibi" (order of volatility) bo'yicha birinchi nima olinadi?
- Diskning to'liq bit-ma-bit obrazi (disk image)
+ Operativ xotira (RAM) va jarayonlar holati
- Zaxira lentalaridagi eski nusxalar
- Arxivlangan eski log fayllari (syslog)
! Eng tez yo'qoladigani birinchi: RAM, tarmoq ulanishlari, jarayonlar — keyin disk, keyin arxivlar.

? Zararlangan noutbuk topildi. Nega uni darhol tok manbasidan uzish tavsiya etilmaydi?
- Disk buzilib, Windows qayta o'rnatilishi kerak bo'ladi
+ RAM'dagi jarayon va ulanish dalillari yo'qoladi
- Hujumchi kompyuter o'chganini darhol sezadi
- EDR litsenziyasi o'chirilgan qurilmada bekor bo'ladi
! Yaxshiroq yo'l — tarmoqdan izolyatsiya (EDR yoki kabel), keyin xotira olish. O'chirish xotiradagi dalillarni yo'q qiladi.

? Chain of custody (dalillar zanjiri) hujjati nima uchun kerak?
- Dalillarni tezroq va avtomatik tahlil qilish uchun
+ Dalil kimda bo'lgani va o'zgarmaganini isbotlash uchun
- Dalillarni bulutga avtomatik zaxiralab qo'yish uchun
- Tahlil uchun kerakli dasturlar ro'yxatini yuritish uchun
! Har uzatish yozib boriladi; zanjir uzilsa, dalil sudda yoki ichki tergovda shubha ostida qoladi.

? Disk obrazi olingandan keyin uning yaxlitligini qanday isbotlaysiz?
- Obraz hajmini asl disk hajmi bilan solishtirib
+ Asl disk va obrazning xeshlarini hisoblab, solishtirib
- Obrazni ochib, fayllar sonini sanab
- Obrazni ikki marta nusxalab, nusxalarni solishtirib
! Bir xil SHA-256 — bit-ma-bit bir xil degani. Xesh obraz olinganda va har tahlildan oldin qayd etiladi.

? Write blocker (yozishni to'suvchi) qurilma nima qiladi?
- Diskni o'qishni tezlashtiradi va sektor xatolarini tuzatib boradi
+ Tekshirilayotgan diskka hech narsa yozilishiga yo'l qo'ymaydi
- Disk ichidagi ma'lumotni tahlildan oldin shifrlaydi
- Diskdagi o'chirilgan fayllarni avtomatik tiklaydi
! Oddiy ulash ham diskka metadata yozishi mumkin; write blocker dalilni o'zgartirmasdan o'qish imkonini beradi.

? Volatility bilan xotira obrazini tahlil qilganda nimani topish mumkin?
- Diskdan butunlay o'chirilgan eski hujjatlarni
+ Ishlab turgan jarayonlar va ochiq tarmoq ulanishlarini
- Kompyuter qachon sotib olinganini va kafolatini
- Foydalanuvchining o'tgan yilgi brauzer tarixini
! Xotirada: jarayonlar ro'yxati, ulanishlar, yuklangan DLL'lar, in'ektsiya qilingan kod, ba'zan ochiq parollar.

? Windows'da biror dastur shu kompyuterda ishga tushirilganini va qachon ishlaganini qaysi artefakt ko'rsatadi?
- hosts fayli
+ Prefetch fayllari
- Fonts papkasi
- Desktop.ini fayli
! C:\Windows\Prefetch — dastur nomi, ishga tushish soni va oxirgi vaqtlari. Amcache va Shimcache ham bajarilish izlarini saqlaydi.

? Windows'da hujumchi qayta yuklashdan keyin ham ishlash uchun ko'pincha nimadan foydalanadi? (Ikkita javob)
+ Registrdagi Run kalitlari
- Ish stolidagi fon rasmi
+ Rejalashtirilgan vazifalar (Scheduled Tasks)
- Brauzerning saqlangan xatcho'plari
! Run/RunOnce kalitlari, scheduled tasks, xizmatlar, Startup papkasi — Windows persistence'ning asosiy joylari.

? Linux serverda kim qachon tizimga kirganini ko'rish uchun qaysi buyruq /var/log/wtmp ni o'qiydi?
- history
+ last
- uptime
- dmesg
! last — wtmp dan kirishlar tarixi, lastb — muvaffaqiyatsiz urinishlar (btmp). history faqat joriy foydalanuvchi buyruqlarini ko'rsatadi va uni o'chirish oson.

? Statik va dinamik zararli dastur tahlili farqi nima?
- Statik — bulutda, dinamik — faqat kompyuterda
+ Statik — ishga tushirmasdan, dinamik — sandboxda ishlatib
- Statik — faqat skriptlar, dinamik — faqat exe fayllar
- Statik — avtomatik, dinamik — faqat qo'lda bajariladi
! Statik: xesh, strings, PE sarlavhalari, importlar. Dinamik: izolyatsiyalangan muhitda ishga tushirib, jarayon, fayl va tarmoq xulqini kuzatish.

? IR hisobotida vaqtlarni qanday yozish to'g'ri?
- Har log manbasining o'z vaqt zonasida, izohsiz qoldirib
+ Hammasini UTC'da, mahalliy vaqtni izohda ko'rsatib
- Faqat mahalliy vaqtda, soniyalarsiz
- Faqat sanani, chunki soat muhim emas
! Turli manbalar turli zonalarda yozadi. Hisobotda bitta zona (UTC) va aniq vaqt bo'lmasa, voqealar ketma-ketligi chalkashadi.

? Zararli fayl o'chirildi, lekin hujumchi qanday kirgani aniqlanmadi. Asosiy xavf nima?
- Hisobot kechikib, rahbariyat norozi bo'ladi
+ Hujumchi xuddi shu yo'l bilan qayta kiradi
- O'chirilgan fayl o'z-o'zidan tiklanadi
- Antivirus bazasi yangilanmay qoladi
! Ildiz sabab (root cause) yopilmasa, eradication tugallanmagan: zaiflik, o'g'irlangan parol yoki orqa eshik qolishi mumkin.

## hunting
? Threat hunting'ning ogohlantirishlarga javob berishdan asosiy farqi nima?
- Hunting faqat ogohlantirish kelganda boshlanadi
+ Ogohlantirishsiz, gipoteza asosida faol qidiriladi
- Hunting faqat tashqi kompaniya tomonidan qilinadi
- Hunting faqat zararli fayllar xeshini qidiradi
! Hunting "biz allaqachon buzilganmiz, lekin bilmaymiz" degan farazdan boshlanadi va qoidalar ushlamagan narsani qidiradi.

? Qaysi biri yaxshi hunting gipotezasi?
- "Tarmoqda biror yomon narsa bo'lishi mumkin"
+ "Hujumchi Run kalitlari orqali buxgalteriyada o'rnashgan"
- "Barcha serverlardagi loglarni bir marta ko'rib chiqish kerak"
- "Antivirus hamma narsani ushlab qolgan bo'lsa kerak"
! Yaxshi gipoteza aniq texnika (ATT&CK), joy va ma'lumot manbasini nomlaydi — uni tekshirib, tasdiqlash yoki rad etish mumkin.

? Firewall logida bir ichki host har 300 soniyada (±5 s) bir xil tashqi IP'ga 400 baytdan ulanadi. Bu nimaga o'xshaydi?
- Foydalanuvchi qo'lda sahifani yangilamoqda
+ Zararli dasturning C2 serverga beaconing'i
- Kompyuterning oddiy yuklanish jarayoni
- Printerning ichki tarmoqdagi so'rovlari
! Odam bunday muntazam ishlamaydi. Bir xil oraliq, bir xil hajm, bir manzil — beacon belgilari. Jitter oraliqni biroz o'zgartiradi, lekin naqsh qoladi.

? "Stack counting" (eng kam uchraydiganini qidirish) usulining g'oyasi nima?
- Eng ko'p uchraydigan qiymat eng xavfli hisoblanadi
+ Hammada bor narsa odatiy, kam uchraydigani shubhali
- Loglarni vaqt bo'yicha teskari tartibda o'qish kerak
- Har bir qiymatni tashqi IOC bazasi bilan solishtirish
! Masalan, 500 ta kompyuterdagi Run kalitlarini sanasangiz, faqat 1–2 tasida bor yozuv birinchi tekshiriladi.

? AWS'da kim qaysi API chaqiruvini (masalan, foydalanuvchi yaratish) qilganini qaysi xizmat yozadi?
- CloudWatch Metrics
+ CloudTrail
- AWS Config Rules
- S3 Inventory
! CloudTrail — boshqaruv API chaqiruvlari jurnali: kim, qachon, qayerdan, qaysi amal. Metrics — son ko'rsatkichlar.

? CloudTrail'da: yangi mamlakatdan §ConsoleLogin§, 3 daqiqadan keyin boshqa foydalanuvchi uchun §CreateAccessKey§. Bu nimaga o'xshaydi?
- Oddiy parol tiklash jarayoni
+ Hisob egallanib, persistence yaratilishi
- AWS'ning rejali texnik xizmati
- Foydalanuvchining VPN'ni yoqib qo'yishi
! Kirish → boshqa hisobga yangi kalit — hujumchi o'ziga zaxira yo'l ochmoqda. Kalitni o'chirish va kirgan hisobni tekshirish kerak.

? "Impossible travel" ogohlantirishi nimani bildiradi?
- Foydalanuvchi ta'tilda chet eldan turib ishlayotganini
+ Bir hisobga juda qisqa vaqtda uzoq joylardan kirilgan
- Kompyuterning vaqt zonasi noto'g'ri sozlanganini
- Hisob bir kunda ko'p marta parol o'zgartirganini
! Toshkentdan 10:00 da, 10:20 da boshqa qit'adan — biri hujumchi bo'lishi mumkin. Lekin VPN va bulutli proksilar yolg'on signal ham beradi.

? SOAR playbook'iga qaysi qadamni odam tasdig'isiz qoldirish xavfli?
- IP manzilni tahdid razvedkasi bazasida tekshirish
+ Muhim serverni tarmoqdan avtomatik uzish
- Ogohlantirishga tegishli loglarni yig'ib biriktirish
- Fayl xeshini VirusTotal'da qidirish
! Boyitish (enrichment) xavfsiz avtomatlashtiriladi. Biznesga ta'sir qiladigan choralar (izolyatsiya, bloklash) uchun odam tasdig'i qoldiriladi.

? Purple team mashg'ulotining asosiy maqsadi nima?
- Red team va blue team'dan qaysi biri kuchliroqligini aniqlash
+ Hujum texnikasini birga sinab, aniqlashni yaxshilash
- Xodimlarni phishing testlari bilan jazolash
- Tashqi auditorlar uchun hisobot tayyorlash
! Hujum qiluvchi texnikani bajaradi, himoyachi darhol ko'radi: log keldimi, qoida ishladimi, nima yetishmayapti.

? Atomic Red Team kabi to'plamlar nima uchun ishlatiladi?
- Ishlab chiqarish serverlarini ruxsatsiz buzib ko'rish uchun
+ ATT&CK texnikasini sinab, aniqlashni tekshirish uchun
- Zararli dasturlarni antiviruslardan yashirish uchun
- Xodimlarning parollarini tekshirib chiqish uchun
! Har bir test bitta texnikani taqlid qiladi. Faqat ruxsat bilan va test muhitida — maqsad aniqlash qamrovini o'lchash.

? Hunting hech qanday hujum topmadi. Bu ish behuda ketganmi?
- Ha, chunki hech qanday dalil topilmadi
+ Yo'q: ko'rinish bo'shliqlari va yangi qoidalar natija bo'ladi
- Ha, hunting natijasi faqat hujum topilganda hisobotga kiradi
- Yo'q, lekin natijani hech kimga aytmaslik kerak
! "Topilmadi" ham natija: qaysi ma'lumot yo'qligi, qaysi qoida yozilishi mumkinligi hujjatlashtiriladi.

? Uy SOC laboratoriyasida zararli namunalarni tahlil qilish uchun nima muhim?
- Laboratoriyani uy tarmog'idagi barcha qurilmalar bilan birlashtirish
+ Izolyatsiyalangan tarmoq va qaytariladigan snapshot'lar
- Namunalarni tezroq ishlashi uchun asosiy kompyuterda ochish
- Antivirusni butunlay o'chirib, internetga ochiq qoldirish
! Tahlil VM'i alohida tarmoqda, oldingi holatga qaytariladigan bo'lishi kerak — aks holda namuna uy tarmog'iga tarqaladi.

? Hunting boshlashdan oldin "baseline" (odatiy holat) nima uchun kerak?
- SIEM litsenziyasi narxini hisoblash uchun
+ Nima g'ayrioddiy ekanini ajratib olish uchun
- Barcha loglarni o'chirib, toza boshlash uchun
- Foydalanuvchilarga qoidalarni tushuntirish uchun
! Odatiy holat ma'lum bo'lmasa, har narsa shubhali yoki hech narsa shubhali ko'rinmaydi.
`.replace(/§/g, '`');
