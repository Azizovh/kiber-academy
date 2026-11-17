import type { InterviewQuestion, TrackId } from './types';

type Scope = TrackId | 'umumiy';

let counter = 0;
function q(track: Scope, level: 'junior' | 'middle', question: string, answer: string): InterviewQuestion {
  return { id: `iv-${++counter}`, track, level, question, answer };
}

export const INTERVIEW_SCOPES: { id: Scope; title: string }[] = [
  { id: 'umumiy', title: 'Umumiy' },
  { id: 'pentest', title: 'Pentest' },
  { id: 'soc', title: 'SOC' },
  { id: 'appsec', title: 'AppSec' },
  { id: 'cloud', title: 'Cloud' },
];

export const INTERVIEW: InterviewQuestion[] = [
  // ── umumiy
  q('umumiy', 'junior', 'CIA uchligi nima? Har biriga hujum misoli keltiring.',
    "**Confidentiality** (maxfiylik) — ma'lumotni faqat ruxsati borlar ko'radi; buzilishi: ma'lumotlar bazasining sizib chiqishi.\n\n**Integrity** (yaxlitlik) — ma'lumot ruxsatsiz o'zgartirilmagan; buzilishi: bank o'tkazmasidagi summani yo'lda o'zgartirish.\n\n**Availability** (foydalanuvchanlik) — tizim kerak paytda ishlaydi; buzilishi: DDoS yoki ransomware.\n\nYaxshi javob har bir nazoratni (shifrlash, xesh/imzo, zaxira nusxa) ham aytib o'tadi."),
  q('umumiy', 'junior', 'Tahdid, zaiflik va xavf (risk) orasidagi farq nima?',
    "**Zaiflik** — kamchilik (yamalmagan server). **Tahdid** — undan foydalanishi mumkin bo'lgan narsa (hujumchi). **Xavf** — tahdid zaiflikdan foydalanish ehtimoli × zarar hajmi.\n\nMisol: eshik qulfsiz (zaiflik), mahallada o'g'ri bor (tahdid), uyda qimmat narsa ko'p (ta'sir) → xavf yuqori."),
  q('umumiy', 'junior', 'Kodlash, shifrlash va xeshlash farqini tushuntiring.',
    "**Kodlash** (Base64, hex) — formatni o'zgartirish, kalit yo'q, hamma qaytara oladi. Maxfiylik bermaydi.\n\n**Shifrlash** (AES, RSA) — kalit bilan; kalit egasi qaytara oladi. Maxfiylik uchun.\n\n**Xeshlash** (SHA-256) — bir tomonlama, qaytarib bo'lmaydi. Yaxlitlikni tekshirish va parol saqlash uchun."),
  q('umumiy', 'junior', 'Brauzerga google.com yozib Enter bosganda nima sodir bo\'ladi?',
    "1. Brauzer va OT keshidan, keyin **DNS** orqali IP manzil topiladi.\n2. Shu IP ning 443-portiga **TCP** ulanish (three-way handshake).\n3. **TLS** handshake: sertifikat tekshiriladi, shifrlash kalitlari kelishiladi.\n4. **HTTP** GET so'rovi yuboriladi, server javob (HTML) qaytaradi.\n5. Brauzer HTML'ni tahlil qilib, CSS/JS/rasmlar uchun qo'shimcha so'rovlar yuboradi va sahifani chizadi.\n\nBu savol tarmoq bilimining chuqurligini tekshiradi — ARP, default gateway, NAT haqida ham gapira olsangiz, yanada yaxshi."),
  q('umumiy', 'junior', 'TCP va UDP farqi nima? Qayerda qaysi biri ishlatiladi?',
    "**TCP** — ulanish o'rnatadi (handshake), yetkazishni kafolatlaydi, tartibni saqlaydi; sekinroq. Web, SSH, pochta.\n\n**UDP** — ulanishsiz, kafolatsiz, tez. DNS so'rovlari, video qo'ng'iroq, o'yinlar."),
  q('umumiy', 'junior', 'Simmetrik va asimmetrik shifrlash farqi?',
    "**Simmetrik** — bitta kalit ham shifrlaydi, ham ochadi (AES). Tez, lekin kalitni xavfsiz yetkazish muammosi bor.\n\n**Asimmetrik** — juft kalit: ochiq kalit bilan shifrlanadi, yopiq kalit bilan ochiladi (RSA, ECC). Sekin, lekin kalit almashish muammosini hal qiladi.\n\nAmalda (TLS) ikkalasi birga ishlatiladi: asimmetrik bilan simmetrik kalit kelishiladi."),
  q('umumiy', 'junior', 'Parollarni bazada qanday saqlash kerak?',
    "Hech qachon ochiq yoki oddiy xesh (MD5, SHA-1) bilan emas. Har bir parolga alohida **salt** qo'shib, sekin ishlaydigan maxsus funksiya bilan xeshlanadi: **Argon2id**, bcrypt yoki scrypt. Salt rainbow table hujumini, sekinlik esa brute force'ni qiyinlashtiradi."),
  q('umumiy', 'junior', 'O\'zingiz haqingizda va nega kiberxavfsizlikni tanlaganingiz haqida gapirib bering.',
    "2 daqiqalik tayyor hikoya kerak: **o'tmish** (qayerdan keldingiz) → **hozir** (nimani o'rgandingiz, qanday loyiha/lablar qildingiz — aniq raqamlar bilan) → **kelajak** (nega aynan shu lavozim va kompaniya).\n\n“Xakerlik qiziq” emas, balki aniq misol: “uy laboratoriyamda Wazuh o'rnatib, o'z hujumlarimni aniqladim”."),
  q('umumiy', 'junior', 'Yangiliklar va yangi zaifliklardan qanday xabardor bo\'lasiz?',
    "Aniq manbalarni ayting: The Hacker News, BleepingComputer, Krebs on Security, CISA ogohlantirishlari, mutaxassislarning blog va X/LinkedIn sahifalari. Yaqinda o'qigan bitta zaiflik yoki hujumni qisqacha tahlil qilib bera olishingiz kerak — suhbat oldidan tayyorlab oling."),
  q('umumiy', 'middle', 'Defense in depth nima va nega kerak?',
    "Bitta himoya vositasiga ishonmaslik: bir necha mustaqil qatlam (tarmoq, host, ilova, ma'lumot, inson, jarayon). Biri buzilsa, keyingisi to'xtatadi yoki hech bo'lmasa aniqlaydi. Misol: firewall + EDR + MFA + segmentatsiya + zaxira nusxa + xodimlarni o'qitish."),

  // ── pentest
  q('pentest', 'junior', 'Pentest bosqichlarini aytib bering.',
    "1. **Kelishuv**: qamrov, qoidalar, yozma ruxsat.\n2. **Razvedka**: passiv (OSINT) va aktiv.\n3. **Skanerlash va enumeratsiya**: portlar, xizmatlar, versiyalar.\n4. **Ekspluatatsiya**: zaiflikdan foydalanib kirish.\n5. **Post-ekspluatatsiya**: imtiyozni oshirish, tarmoq bo'ylab harakat.\n6. **Hisobot**: topilmalar, ta'sir, isbot, tavsiyalar.\n7. Tuzatishdan keyin **qayta tekshirish**."),
  q('pentest', 'junior', 'Nmap\'ning SYN skani (-sS) va connect skani (-sT) orasidagi farq nima?',
    "**-sT** to'liq TCP ulanish o'rnatadi (SYN → SYN/ACK → ACK); root kerak emas, lekin ko'proq iz qoldiradi.\n\n**-sS** faqat SYN yuborib, SYN/ACK kelsa RST bilan uzadi (“yarim ochiq”); tezroq, root huquqi kerak. Zamonaviy IDS ikkalasini ham ko'radi."),
  q('pentest', 'junior', 'SQL injection nima va undan qanday himoyalanadi?',
    "Foydalanuvchi kiritgan ma'lumot SQL so'rovining bir qismi sifatida bajarilishi. Masalan `' OR '1'='1` login tekshiruvini chetlab o'tadi.\n\n**Himoya**: parametrlangan so'rovlar (prepared statements) — asosiy chora; qo'shimcha: kiritishni tekshirish, baza foydalanuvchisiga eng kam huquq, xato xabarlarini yashirish."),
  q('pentest', 'junior', 'Reverse shell va bind shell farqi?',
    "**Bind shell**: nishon portni ochib tinglaydi, hujumchi unga ulanadi — firewall kiruvchi ulanishni odatda to'sadi.\n\n**Reverse shell**: nishonning o'zi hujumchiga ulanadi — chiquvchi ulanishlar ko'pincha ruxsat etilgani uchun amalda shu ishlatiladi."),
  q('pentest', 'middle', 'Linux\'da imtiyozni oshirish uchun nimalarni tekshirasiz?',
    "`sudo -l`; SUID/SGID fayllar; cron vazifalari va ularning yoziladigan skriptlari; yoziladigan PATH kataloglari; capabilities; yadro va dastur versiyalari; saqlangan parollar (history, config fayllar); ichki xizmatlar (127.0.0.1 da tinglayotganlar); docker/lxd guruhlari. Avtomatlashtirish uchun LinPEAS, lekin har topilmani qo'lda tushunish shart."),

  // ── soc
  q('soc', 'junior', 'True positive, false positive, false negative nima?',
    "**True positive** — alert bor va hujum haqiqatan bor.\n**False positive** — alert bor, lekin hujum yo'q (shovqin).\n**False negative** — hujum bor, alert yo'q — eng xavflisi.\n**True negative** — hujum ham, alert ham yo'q.\n\nSOC ishining katta qismi — false positive'ni kamaytirib, false negative'ga yo'l qo'ymaslik."),
  q('soc', 'junior', 'Windows\'da muvaffaqiyatli va muvaffaqiyatsiz kirishning Event ID\'lari qanday?',
    "**4624** — muvaffaqiyatli kirish, **4625** — muvaffaqiyatsiz. Qo'shimcha: 4634/4647 — chiqish, 4672 — maxsus imtiyozli kirish, 4688 — yangi jarayon, 4720 — akkaunt yaratildi, 7045 — xizmat o'rnatildi. Logon Type ham muhim: 2 — lokal, 3 — tarmoq, 10 — RDP."),
  q('soc', 'junior', 'Bir IP manzildan 5 daqiqada 500 ta muvaffaqiyatsiz kirish alerti keldi. Nima qilasiz?',
    "1. **Tekshirish**: qaysi akkauntlar, qaysi xizmat, IP ichki yoki tashqi, obro'si (AbuseIPDB, VirusTotal).\n2. **Eng muhimi**: shu IP dan keyin **muvaffaqiyatli** kirish bo'lganmi?\n3. Bo'lgan bo'lsa — insident: akkauntni bloklash, sessiyani uzish, kirgandan keyingi harakatlarni tekshirish, eskalatsiya.\n4. Bo'lmagan bo'lsa — IP ni bloklash, hujjatlashtirish.\n5. Tiketga aniq yozish: nima ko'rildi, nima qilindi, xulosa."),
  q('soc', 'junior', 'IDS va IPS farqi nima?',
    "**IDS** (Intrusion Detection System) — faqat aniqlaydi va ogohlantiradi; trafik nusxasini ko'radi.\n\n**IPS** (Intrusion Prevention System) — trafik yo'lida turadi va zararli trafikni bloklaydi. Kamchiligi: false positive qonuniy trafikni to'sishi mumkin."),
  q('soc', 'junior', "Foydalanuvchi shubhali xatni xabar qildi. Uni qanday tahlil qilasiz?",
    "1. Xatni **ilova sifatida** olaman (sarlavhalar saqlanishi uchun).\n2. **Sarlavhalar**: From, Return-Path, Reply-To mosmi; Received zanjiri pastdan tepaga; Authentication-Results — SPF, DKIM, DMARC.\n3. **Domen**: o'ngdan chapga o'qiyman; o'xshatma nommi; whois — qachon ro'yxatdan o'tgan.\n4. **Havolalar**: haqiqiy manzil (href); urlscan (private) yoki sandbox — hech qachon ish kompyuterida ochmayman.\n5. **Ilovalar**: xesh bo'yicha qidiruv, fayl turi, makros bormi.\n6. **Ta'sir**: yana kim oldi, kim bosdi va kim ma'lumot kiritdi (proxy'dagi POST).\n7. Choralar va tiket.\n\nMuhim: `pass` natijasi xavfsizlik degani emas — o'xshatma domen hammasidan o'tadi."),
  q('soc', 'junior', "Sysmon nima va qaysi Event ID'lari eng muhim?",
    "Microsoft Sysinternals'ning bepul vositasi — Windows'da batafsil telemetriya yozadi, lekin hech narsani bloklamaydi. Muhim ID'lar: **1** — jarayon yaratilishi (buyruq satri, xesh, ota-jarayon), **3** — tarmoq ulanishi, **11** — fayl yaratilishi, **13** — registr qiymati, **22** — DNS so'rovi; **4** va **16** — Sysmon'ning o'zi to'xtatilgani yoki konfiguratsiyasi o'zgargani.\n\nHammasi konfiguratsiyaga bog'liq: har bir exclude — potentsial ko'r nuqta."),
  q('soc', 'junior', "svchost.exe jarayoni shubhali ekanini qanday aniqlaysiz?",
    "Normal svchost.exe: yo'li **C:\\Windows\\System32**, otasi **services.exe**, buyruq satrida `-k <guruh>`, Microsoft imzosi bilan. Shubhali belgilar: boshqa papkadan (AppData, Temp), boshqa ota-jarayon (explorer.exe, Word), `-k` yo'q, imzosiz yoki xeshi noma'lum, notanish tashqi manzilga ulanish, imlosi biroz farqli nom (scvhost.exe).\n\nNom — eng oson soxtalashtiriladigan narsa; to'liq yo'l, ota-jarayon va xeshga qarash kerak."),
  q('soc', 'junior', "Linux serverda SSH brute force muvaffaqiyatli bo'lgan-bo'lmaganini qanday tekshirasiz?",
    "auth.log (yoki RHEL'da secure, yoki journalctl -u ssh) da: avval `Failed password` qatorlaridan hujumchi IP'larni sanayman (`grep | sort | uniq -c`), keyin eng muhimi — **shu IP'lardan `Accepted` qatori bormi**. Aylantirilgan loglarni ham (`zgrep auth.log*`). Muvaffaqiyat bo'lsa — insident: shu hisobning keyingi harakatlari (sudo qatorlari, useradd, cron, authorized_keys), `last` bilan kirish tarixi, hisobni bloklash va eskalatsiya.\n\nUzoq muddatli yechim: SSH'da parol bilan kirishni o'chirib, faqat kalitlar."),
  q('soc', 'junior', "Incident response bosqichlarini aytib bering.",
    "**NIST SP 800-61**: tayyorgarlik → aniqlash va tahlil → cheklash, yo'q qilish va tiklash → insidentdan keyingi ish.\n\n**SANS PICERL**: Preparation, Identification, Containment, Eradication, Recovery, Lessons learned.\n\nYaxshi javob qo'shimcha aytadi: eng muhim bosqich — tayyorgarlik; cheklashda qurilmani o'chirmasdan tarmoqdan ajratish; saboqlar yig'ilishi aybdor qidirmasdan o'tkaziladi."),
  q('soc', 'junior', "Nega dalil yig'ishda xotira diskdan oldin olinadi?",
    "**O'zgaruvchanlik tartibi** (order of volatility): xotira elektr o'chganda yo'qoladi, disk esa qoladi. Xotirada faqat u yerda bo'ladigan dalillar bor: faylsiz zararli kod, in'ektsiya qilingan kod, faol tarmoq ulanishlari, ochilgan skriptlar, ba'zan shifrlash kalitlari. Disk tasvirini olish paytida xotira o'zgaradi. Shuning uchun: avval xotira (tashqi diskka, xesh bilan), keyin disk — va qurilmani o'chirmaslik, qayta yuklamaslik."),
  q('soc', 'junior', "IOC va TTP farqi nima? Pyramid of Pain'ni tushuntiring.",
    "**IOC** — hujum nima bilan qilingan: IP, domen, xesh, URL. **TTP** — hujumchi qanday ishlaydi: taktika, texnika, procedure.\n\n**Pyramid of Pain** belgilarni hujumchi uchun almashtirish qiyinligi bo'yicha tartiblaydi: pastda xesh (bitta bayt — yangi xesh) va IP, keyin domen, tarmoq/host artefaktlari, vositalar, eng tepada TTP. Xulosa: IOC'lar tez eskiradi — ularni muddat bilan ishlatamiz; qoidalarimiz esa iloji boricha TTP'larga, xatti-harakatga qaratilishi kerak."),
  q('soc', 'junior', "Beaconing nima va uni qanday aniqlash mumkin?",
    "Buzilgan qurilmaning C2 serveriga muntazam oraliqda ulanishi. Belgilar: **muntazam oraliq** (ozgina jitter bilan), **bir xil hajm**, soatlab va tunda ham davom etishi, faqat bitta qurilma ulanadigan noyob manzil. Aniqlash: proxy/firewall/Zeek loglarida bitta manba-manzil juftligi bo'yicha ulanishlar vaqtini tahlil qilish, `timechart` da tekis “taroq”, RITA kabi vositalar.\n\nEhtiyot: yangilanish va sinxronizatsiya xizmatlari ham beacon qiladi — farq manzil obro'si va noyobligida."),
  q('soc', 'middle', "LOLBins nima va ularni qanday aniqlaysiz?",
    "Living Off the Land Binaries — tizimda allaqachon bor, imzolangan qonuniy dasturlar (powershell, certutil, mshta, rundll32, regsvr32), hujumchilar ularni suiiste'mol qiladi, chunki antivirus ishonadi. Aniqlash — dastur nomi bilan emas, **kontekst** bilan: g'ayrioddiy argumentlar (certutil'da URL), ota-jarayon (Word → mshta), foydalanuvchi va qurilma turi, tashqi ulanish. Eng yaxshi himoya — cheklash: application control (WDAC/AppLocker), PowerShell Constrained Language Mode. Katalog — LOLBAS loyihasi."),
  q('soc', 'middle', "Threat hunting gipotezasiga misol keltiring va ovni qanday o'tkazasiz?",
    "Misol: “Hujumchi persistence uchun rejalashtirilgan vazifa yaratishi mumkin (T1053.005); bu Sysmon 1 dagi `schtasks /create` va Security 4698 da ko'rinadi; oxirgi 30 kunda oddiy foydalanuvchilar foydalanuvchi papkalaridagi skriptni ishga tushiruvchi vazifa yaratganmi?”\n\nOv: ma'lumot borligini tekshirish → so'rov va **stacking** (kam uchraydigan buyruq satrlari) → har birini triage → xulosa (topilsa — IR) → natijani mustahkamlash: yangi aniqlash qoidasi, log bo'shliqlarini yopish, hujjatlashtirish."),
  q('umumiy', 'junior', "Javobini bilmagan texnik savolga duch kelsangiz nima qilasiz?",
    "Halol aytaman: “Buni aniq bilmayman.” Keyin fikrlashni ko'rsataman: bilgan yaqin narsalarim asosida qanday taxmin qilardim va javobni qanday topardim (hujjatlar, laboratoriyada sinab ko'rish, ishonchli manbalar). Ish beruvchi junior'dan hamma narsani bilishni emas, **halollik va muammoni hal qilish yo'lini** kutadi. Yolg'on javob — eng yomon variant: xavfsizlikda noto'g'ri ishonch xavfli."),
  q('umumiy', 'junior', "Xato qilgan yoki qiyin vaziyatga tushgan vaqtingiz haqida gapirib bering.",
    "**STAR** usuli bilan: **Situation** — vaziyat (qisqa), **Task** — vazifangiz, **Action** — aniq nima qildingiz (“biz” emas, “men”), **Result** — natija va **nima o'rgandingiz**.\n\nMisol: laboratoriyada qoida yozdim, lekin sinovda ishlamadi (S/T) → sababini qidirib, Sysmon konfiguratsiyasidagi keng istisnoni topdim va tuzatdim (A) → qoida ishladi, va endi har bir qoidani Atomic Red Team bilan sinayman (R). Xatoni tan olish va undan saboq — yetuklik belgisi."),
  q('soc', 'middle', 'MITRE ATT&CK nima va undan kundalik ishda qanday foydalanasiz?',
    "Hujumchilarning haqiqiy kuzatilgan taktika (nima uchun) va texnikalari (qanday) bazasi. Foydalanish: alertlarni texnikalarga bog'lash, aniqlash qamrovidagi bo'shliqlarni topish, threat hunting gipotezalarini tuzish, hisobotda umumiy tilda gapirish."),

  // ── appsec
  q('appsec', 'junior', 'XSS turlari va himoyasi?',
    "**Reflected** — payload so'rovda keladi va darhol javobda aks etadi. **Stored** — bazada saqlanib, har ko'rgan foydalanuvchida ishlaydi. **DOM-based** — zaiflik brauzerdagi JavaScript kodining o'zida.\n\n**Himoya**: chiqishda kontekstga mos kodlash (output encoding), xavfsiz freymvork API'lari, HTML kerak bo'lsa sanitizatsiya (DOMPurify), qo'shimcha qatlam — CSP, cookie'ga HttpOnly."),
  q('appsec', 'junior', 'Autentifikatsiya va avtorizatsiya farqi?',
    "**Autentifikatsiya** — sen kimsan? (login, parol, MFA). **Avtorizatsiya** — senga nima mumkin? (rollar, ruxsatlar). IDOR — avtorizatsiya xatosi: foydalanuvchi tizimga to'g'ri kirgan, lekin begona obyektga murojaat qila olyapti."),
  q('appsec', 'middle', 'Threat modeling\'ni qanday o\'tkazasiz?',
    "1. Tizim sxemasi: komponentlar, ma'lumot oqimlari, ishonch chegaralari (DFD).\n2. Har bir element uchun tahdidlarni sanash — **STRIDE**: Spoofing, Tampering, Repudiation, Information disclosure, Denial of service, Elevation of privilege.\n3. Xavfni baholash va ustuvorlik.\n4. Har biriga chora: bartaraf etish, kamaytirish, qabul qilish.\n5. Natijani talab va testlarga aylantirish; arxitektura o'zgarsa yangilash."),

  // ── cloud
  q('cloud', 'junior', 'Shared responsibility modeli nima?',
    "Bulut provayderi **bulutning** xavfsizligiga javob beradi (ma'lumot markazi, apparat, gipervizor). Mijoz **bulut ichidagi** narsalarga javob beradi: ma'lumot, IAM, tarmoq sozlamalari, OT yamoqlari (IaaS'da). Xizmat qanchalik boshqariladigan bo'lsa (PaaS, SaaS), mijoz ulushi shunchalik kamayadi — lekin ma'lumot va kirish huquqlari doim mijozda."),
  q('cloud', 'junior', 'S3 bucket ochiq qolishining oldini qanday olasiz?',
    "Akkaunt darajasida **Block Public Access** yoqish; bucket siyosatlarini eng kam imtiyoz bilan yozish; ACL'larni o'chirish; standart shifrlash; kirish loglarini yoqish; AWS Config yoki Prowler bilan doimiy tekshirish; IaC'da skanerlash (Checkov)."),
  q('cloud', 'middle', 'IAM role va IAM user farqi? Nega rol afzal?',
    "**User** — doimiy kalitli shaxs. **Role** — kimdir (inson, xizmat, boshqa akkaunt) vaqtincha “kiyib oladigan” huquqlar to'plami; kalitlari qisqa muddatli va avtomatik almashadi. Doimiy kalit sizib chiqsa, uzoq vaqt ishlaydi; vaqtinchalik kalit tezda eskiradi. Shuning uchun EC2, Lambda va CI/CD uchun doim rol ishlatiladi."),
];
