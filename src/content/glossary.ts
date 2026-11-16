import type { GlossaryTerm } from './types';

type Cat = GlossaryTerm['category'];

function g(category: Cat, id: string, term: string, text: string, uz?: string): GlossaryTerm {
  return { id, term, uz, text, category };
}

export const GLOSSARY_CATEGORIES: Record<Cat, string> = {
  umumiy: 'Umumiy',
  hujum: 'Hujum',
  himoya: 'Himoya',
  tizim: 'Tizim',
  tarmoq: 'Tarmoq',
  kripto: 'Kodlash va kriptografiya',
  web: 'Web',
  dasturlash: 'Dasturlash',
};

export const GLOSSARY: GlossaryTerm[] = [
  // ── umumiy
  g('umumiy', 'cia', 'CIA triad', "Xavfsizlikning uch ustuni: Confidentiality (maxfiylik), Integrity (yaxlitlik), Availability (foydalanuvchanlik).", 'CIA uchligi'),
  g('umumiy', 'threat', 'Threat', "Zarar yetkazishi mumkin bo'lgan har qanday narsa yoki shaxs: xaker, virus, yong'in, ehtiyotsiz xodim.", 'Tahdid'),
  g('umumiy', 'vulnerability', 'Vulnerability', "Tizimdagi tahdid foydalanishi mumkin bo'lgan kamchilik: dasturdagi xato, zaif parol, noto'g'ri sozlama.", 'Zaiflik'),
  g('umumiy', 'risk', 'Risk', "Tahdidning zaiflikdan foydalanib zarar yetkazish ehtimoli va shu zararning kattaligi.", 'Xavf'),
  g('umumiy', 'asset', 'Asset', "Himoya qilinadigan qimmatli narsa: ma'lumot, server, pul, obro'.", 'Aktiv'),
  g('umumiy', 'authorization', 'Authorization', "Biror amalni bajarishga berilgan ruxsat. Pentestda — tizim egasining yozma roziligi.", 'Ruxsat'),
  g('umumiy', 'scope', 'Scope', "Tekshirishga ruxsat berilgan tizimlar va amallar chegarasi.", 'Qamrov'),
  g('umumiy', 'pentest', 'Penetration testing', "Tizim egasining ruxsati bilan unga haqiqiy hujumchi kabi hujum qilib, zaifliklarni topish.", 'Pentest'),
  g('umumiy', 'red-team', 'Red Team', "Hujumchi rolini o'ynaydigan jamoa: tashkilot himoyasini haqiqiy hujum usullari bilan sinaydi.", 'Qizil jamoa'),
  g('umumiy', 'blue-team', 'Blue Team', "Himoyachilar jamoasi: hujumlarni kuzatadi, aniqlaydi va bartaraf etadi.", "Ko'k jamoa"),
  g('umumiy', 'soc', 'SOC', "Security Operations Center — tashkilot xavfsizligini kecha-kunduz kuzatadigan markaz va jamoa."),
  g('umumiy', 'ctf', 'CTF', "Capture The Flag — xavfsizlik bo'yicha musobaqa: topshiriqni yechib, yashirilgan “flag” satrini topish kerak."),
  g('umumiy', 'white-hat', 'White hat', "Faqat ruxsat bilan va himoya maqsadida ishlaydigan etik xaker.", 'Oq qalpoq'),
  g('umumiy', 'black-hat', 'Black hat', "Ruxsatsiz va g'arazli maqsadda tizimlarga kiruvchi jinoyatchi xaker.", 'Qora qalpoq'),
  g('umumiy', 'grey-hat', 'Grey hat', "Ruxsatsiz, lekin zarar yetkazish niyatisiz harakat qiluvchi. Niyati yaxshi bo'lsa ham, bu qonunbuzarlik.", 'Kulrang qalpoq'),
  g('umumiy', 'bug-bounty', 'Bug bounty', "Kompaniya o'z tizimidan zaiflik topganlarga mukofot to'laydigan dastur."),
  g('umumiy', 'osint', 'OSINT', "Open Source Intelligence — ochiq manbalardan (internet, ijtimoiy tarmoqlar, reyestrlar) ma'lumot yig'ish."),
  g('umumiy', 'incident', 'Incident', "Xavfsizlik buzilgan yoki buzilishi mumkin bo'lgan hodisa.", 'Insident'),
  g('umumiy', 'lab', 'Lab', "Mashq qilish uchun atayin qurilgan, haqiqiy tizimlardan ajratilgan muhit.", 'Laboratoriya'),

  // ── hujum
  g('hujum', 'exploit', 'Exploit', "Zaiflikdan foydalanib, tizimni istalmagan ishni bajarishga majbur qiladigan kod yoki usul."),
  g('hujum', 'payload', 'Payload', "Exploit muvaffaqiyatli ishlagach bajariladigan asosiy kod — masalan, masofadan boshqaruv ochish."),
  g('hujum', 'malware', 'Malware', "Zarar yetkazish uchun yaratilgan har qanday dastur: virus, troyan, ransomware va boshqalar.", 'Zararli dastur'),
  g('hujum', 'ransomware', 'Ransomware', "Fayllarni shifrlab, ochish uchun pul talab qiladigan zararli dastur.", "Tovlamachi dastur"),
  g('hujum', 'phishing', 'Phishing', "Ishonchli manba niqobida yuborilgan soxta xabar orqali parol yoki ma'lumotni aldab olish."),
  g('hujum', 'social-engineering', 'Social engineering', "Texnikani emas, insonni aldash orqali ma'lumot yoki kirish huquqini qo'lga kiritish.", 'Ijtimoiy muhandislik'),
  g('hujum', 'brute-force', 'Brute force', "To'g'risi topilguncha barcha mumkin bo'lgan parol yoki kalitlarni birma-bir sinash.", "Qo'pol kuch"),
  g('hujum', 'ddos', 'DDoS', "Distributed Denial of Service — ko'p qurilmadan so'rov yog'dirib, xizmatni ishdan chiqarish."),
  g('hujum', 'mitm', 'Man-in-the-Middle', "Ikki tomon orasidagi aloqaga yashirincha qo'shilib, ma'lumotni o'qish yoki o'zgartirish.", "O'rtadagi odam"),
  g('hujum', 'zero-day', 'Zero-day', "Ishlab chiquvchi hali bilmaydigan va tuzatmagan zaiflik."),
  g('hujum', 'backdoor', 'Backdoor', "Oddiy autentifikatsiyani chetlab o'tib, tizimga yashirin kirish yo'li.", 'Orqa eshik'),
  g('hujum', 'botnet', 'Botnet', "Hujumchi masofadan boshqaradigan, zararlangan qurilmalar tarmog'i."),
  g('hujum', 'privilege-escalation', 'Privilege escalation', "Oddiy foydalanuvchi huquqidan administrator huquqiga ko'tarilish.", 'Imtiyozni oshirish'),
  g('hujum', 'apt', 'APT', "Advanced Persistent Threat — aniq nishonga uzoq vaqt, yashirin hujum qiluvchi kuchli guruh (ko'pincha davlat tomonidan qo'llab-quvvatlanadi)."),
  g('hujum', 'script-kiddie', 'Script kiddie', "Qanday ishlashini tushunmasdan, boshqalar yozgan tayyor vositalarni ishlatuvchi tajribasiz hujumchi."),
  g('hujum', 'hacktivist', 'Hacktivist', "Siyosiy yoki ijtimoiy g'oya uchun hujum qiluvchi."),
  g('hujum', 'insider', 'Insider threat', "Tashkilot ichidan keladigan tahdid: norozi yoki ehtiyotsiz xodim.", 'Ichki tahdid'),

  // ── himoya
  g('himoya', 'patch', 'Patch', "Dasturdagi xato yoki zaiflikni tuzatadigan yangilanish.", 'Yamoq'),
  g('himoya', 'cve', 'CVE', "Common Vulnerabilities and Exposures — har bir ommaga ma'lum zaiflikka beriladigan yagona raqam, masalan CVE-2021-44228."),
  g('himoya', 'firewall', 'Firewall', "Tarmoq trafigini qoidalar asosida o'tkazadigan yoki to'sadigan filtr.", 'Tarmoq ekrani'),
  g('himoya', 'antivirus', 'Antivirus', "Ma'lum zararli dasturlarni aniqlab, bloklaydigan dastur."),
  g('himoya', 'edr', 'EDR', "Endpoint Detection and Response — kompyuterlardagi shubhali xatti-harakatni kuzatib, javob beradigan tizim."),
  g('himoya', 'siem', 'SIEM', "Barcha tizimlardan loglarni yig'ib, tahlil qilib, ogohlantirish beradigan tizim."),
  g('himoya', 'mfa', 'MFA', "Multi-Factor Authentication — paroldan tashqari yana bir tasdiq (kod, kalit, barmoq izi) talab qilish.", "Ko'p omilli autentifikatsiya"),
  g('himoya', 'backup', 'Backup', "Ma'lumot yo'qolganda tiklash uchun saqlanadigan nusxa.", 'Zaxira nusxa'),
  g('himoya', 'least-privilege', 'Least privilege', "Har kimga faqat ishi uchun zarur bo'lgan eng kam huquqni berish tamoyili.", 'Eng kam imtiyoz'),
  g('himoya', 'log', 'Log', "Tizimda sodir bo'lgan hodisalar yozib boriladigan jurnal.", 'Jurnal'),
  g('himoya', 'sandbox', 'Sandbox', "Shubhali dasturni asosiy tizimga zarar yetkazmasdan ishga tushirish uchun ajratilgan muhit.", 'Qumdon'),
  g('himoya', 'hardening', 'Hardening', "Keraksiz xizmatlarni o'chirish va sozlamalarni qat'iylashtirish orqali tizimni mustahkamlash.", 'Mustahkamlash'),

  // ── tizim
  g('tizim', 'hardware', 'Hardware', "Kompyuterning qo'l bilan ushlasa bo'ladigan qismlari.", 'Apparat ta\'minot'),
  g('tizim', 'software', 'Software', "Kompyuterga nima qilishni aytadigan dasturlar.", 'Dasturiy ta\'minot'),
  g('tizim', 'cpu', 'CPU', "Central Processing Unit — buyruqlarni bajaradigan “miya”.", 'Protsessor'),
  g('tizim', 'ram', 'RAM', "Random Access Memory — ishlab turgan dasturlar ma'lumoti turadigan tezkor xotira. Tok o'chsa, tozalanadi.", 'Tezkor xotira'),
  g('tizim', 'storage', 'Storage', "Ma'lumot doimiy saqlanadigan qurilma: SSD yoki HDD.", 'Doimiy xotira'),
  g('tizim', 'os', 'Operating system', "Qurilmalarni boshqaradigan va dasturlarga xizmat ko'rsatadigan asosiy dastur: Windows, Linux, macOS, Android.", 'Operatsion tizim'),
  g('tizim', 'kernel', 'Kernel', "Operatsion tizimning yadrosi: qurilmalar, xotira va jarayonlarni bevosita boshqaradi.", 'Yadro'),
  g('tizim', 'process', 'Process', "Ishga tushirilgan, xotirada ishlab turgan dastur nusxasi.", 'Jarayon'),
  g('tizim', 'driver', 'Driver', "Operatsion tizimga aniq qurilma bilan ishlashni o'rgatadigan dastur.", 'Drayver'),
  g('tizim', 'file-system', 'File system', "Diskdagi ma'lumotni fayl va kataloglarga tartiblash usuli: NTFS, ext4, FAT32.", 'Fayl tizimi'),
  g('tizim', 'path', 'Path', "Faylning fayl tizimidagi manzili, masalan /home/ali/reja.txt.", "Yo'l"),
  g('tizim', 'magic-bytes', 'Magic bytes', "Fayl boshidagi, uning haqiqiy turini bildiradigan bir necha bayt.", 'Sehrli baytlar'),
  g('tizim', 'root', 'root', "Linux'dagi cheksiz huquqli bosh foydalanuvchi."),
  g('tizim', 'administrator', 'Administrator', "Windows'dagi to'liq huquqli foydalanuvchi.", 'Ma\'mur'),
  g('tizim', 'sudo', 'sudo', "Linux'da bitta buyruqni root huquqi bilan bajarish uchun ishlatiladigan buyruq."),
  g('tizim', 'terminal', 'Terminal', "Kompyuterni matnli buyruqlar bilan boshqarish oynasi."),
  g('tizim', 'shell', 'Shell', "Buyruqlarni qabul qilib, bajaradigan dastur (masalan Bash). Xavfsizlikda — nishon tizimda buyruq bajarish imkoniyati.", 'Qobiq'),
  g('tizim', 'cli', 'CLI', "Command Line Interface — buyruqlar satri orqali boshqarish."),
  g('tizim', 'gui', 'GUI', "Graphical User Interface — oynalar va tugmalar orqali boshqarish."),
  g('tizim', 'linux', 'Linux', "Ochiq kodli operatsion tizim; serverlar va xavfsizlik vositalarining asosiy muhiti."),
  g('tizim', 'kali-linux', 'Kali Linux', "Xavfsizlik sinovlari uchun yuzlab vosita oldindan o'rnatilgan Linux distributivi."),
  g('tizim', 'distro', 'Distribution', "Linux yadrosi atrofida yig'ilgan tayyor operatsion tizim: Ubuntu, Debian, Kali.", 'Distributiv'),
  g('tizim', 'virtual-machine', 'Virtual machine', "Kompyuter ichida dastur sifatida ishlaydigan alohida “kompyuter”.", 'Virtual mashina'),
  g('tizim', 'hypervisor', 'Hypervisor', "Virtual mashinalarni yaratib, boshqaradigan dastur: VirtualBox, VMware, Hyper-V.", 'Gipervizor'),
  g('tizim', 'snapshot', 'Snapshot', "Virtual mashinaning ma'lum paytdagi holati; unga istalgan vaqtda qaytish mumkin.", 'Holat nusxasi'),
  g('tizim', 'host-guest', 'Host / Guest', "Host — asosiy (haqiqiy) tizim; Guest — uning ichidagi virtual mashina tizimi."),
  g('tizim', 'container', 'Container', "Dasturni kerakli hamma narsasi bilan o'rab, tizimning qolgan qismidan ajratib ishlatish usuli. VM'dan yengil: o'z yadrosi yo'q.", 'Konteyner'),
  g('tizim', 'registry', 'Registry', "Windows va dasturlar sozlamalari saqlanadigan ierarxik baza.", 'Reyestr'),
  g('tizim', 'powershell', 'PowerShell', "Windows'ning kuchli buyruq qobig'i va skript tili."),
  g('tizim', 'service', 'Service', "Fonda, foydalanuvchi oynasisiz ishlaydigan dastur.", 'Xizmat'),
  g('tizim', 'uac', 'UAC', "User Account Control — Windows'da administrator huquqini talab qiladigan amal oldidan tasdiq so'rash mexanizmi."),
  g('tizim', 'permissions', 'Permissions', "Fayl yoki resursni kim o'qishi, o'zgartirishi, ishga tushirishi mumkinligini belgilovchi qoidalar.", 'Ruxsatlar'),
  g('tizim', 'boot', 'Boot', "Kompyuter yoqilganda operatsion tizimni yuklash jarayoni.", 'Yuklanish'),
  g('tizim', 'firmware', 'Firmware', "Qurilmaning o'ziga yozilgan past darajali dastur (masalan BIOS/UEFI)."),

  // ── tarmoq
  g('tarmoq', 'network', 'Network', "O'zaro ma'lumot almashadigan qurilmalar to'plami.", 'Tarmoq'),
  g('tarmoq', 'ip-address', 'IP address', "Tarmoqdagi qurilmaning raqamli manzili, masalan 192.168.1.10.", 'IP manzil'),
  g('tarmoq', 'port', 'Port', "Bitta qurilmadagi turli xizmatlarni ajratuvchi raqam (0–65535). Masalan, 443 — HTTPS."),
  g('tarmoq', 'protocol', 'Protocol', "Qurilmalar qanday muloqot qilishini belgilovchi qoidalar to'plami.", 'Protokol'),
  g('tarmoq', 'packet', 'Packet', "Tarmoq orqali uzatiladigan ma'lumotning kichik bo'lagi.", 'Paket'),
  g('tarmoq', 'server', 'Server', "Boshqa kompyuterlarga xizmat ko'rsatadigan kompyuter yoki dastur."),
  g('tarmoq', 'client', 'Client', "Serverdan xizmat so'raydigan kompyuter yoki dastur.", 'Mijoz'),
  g('tarmoq', 'dns', 'DNS', "Domain Name System — domen nomini (google.com) IP manzilga aylantiruvchi tizim."),
  g('tarmoq', 'http', 'HTTP', "Web sahifalarni uzatish protokoli. Ma'lumot ochiq holda ketadi."),
  g('tarmoq', 'https', 'HTTPS', "HTTP ning TLS bilan shifrlangan ko'rinishi."),
  g('tarmoq', 'ssh', 'SSH', "Secure Shell — boshqa kompyuterga shifrlangan holda ulanib, buyruq bajarish protokoli."),
  g('tarmoq', 'nat', 'NAT', "Network Address Translation — ko'p ichki manzilni bitta tashqi manzil orqali internetga chiqarish."),
  g('tarmoq', 'vpn', 'VPN', "Virtual Private Network — ochiq tarmoq ustidan shifrlangan “tunnel”."),
  g('tarmoq', 'router', 'Router', "Tarmoqlar orasida paketlarni yo'naltiruvchi qurilma.", 'Marshrutizator'),
  g('tarmoq', 'traffic', 'Traffic', "Tarmoq orqali o'tayotgan ma'lumotlar oqimi.", 'Trafik'),
  g('tarmoq', 'nmap', 'Nmap', "Tarmoqdagi qurilmalar va ochiq portlarni aniqlovchi eng mashhur skaner."),
  g('tarmoq', 'wireshark', 'Wireshark', "Tarmoq paketlarini ushlab, ichini ko'rsatadigan dastur."),

  // ── kodlash va kriptografiya
  g('kripto', 'bit', 'Bit', "Eng kichik ma'lumot birligi: 0 yoki 1."),
  g('kripto', 'byte', 'Byte', "8 bit. 0 dan 255 gacha bo'lgan qiymatni saqlaydi.", 'Bayt'),
  g('kripto', 'binary', 'Binary', "Faqat 0 va 1 raqamlaridan iborat ikkilik sanoq tizimi.", 'Ikkilik'),
  g('kripto', 'hex', 'Hexadecimal', "0–9 va A–F belgilaridan iborat o'n oltilik sanoq tizimi. Bitta bayt — ikki hex belgi.", "O'n oltilik"),
  g('kripto', 'ascii', 'ASCII', "Lotin harflari, raqamlar va belgilarni 0–127 sonlariga bog'lovchi jadval. `A` = 65."),
  g('kripto', 'unicode', 'Unicode', "Dunyodagi barcha yozuvlar belgilariga yagona raqam beruvchi standart."),
  g('kripto', 'utf-8', 'UTF-8', "Unicode belgilarini 1–4 bayt bilan yozish usuli; internetdagi asosiy kodlash."),
  g('kripto', 'encoding', 'Encoding', "Ma'lumotni boshqa ko'rinishga o'tkazish (maxfiylik uchun emas). Kalitsiz, istalgan kishi qaytara oladi.", 'Kodlash'),
  g('kripto', 'base64', 'Base64', "Istalgan baytlarni 64 ta xavfsiz belgi (A–Z, a–z, 0–9, +, /) bilan yozish usuli. Shifr emas."),
  g('kripto', 'encryption', 'Encryption', "Ma'lumotni kalit yordamida o'qib bo'lmaydigan holga keltirish. Faqat kalit egasi qaytara oladi.", 'Shifrlash'),
  g('kripto', 'hash', 'Hash', "Ma'lumotdan hisoblanadigan qat'iy uzunlikdagi “barmoq izi”. Orqaga qaytarib bo'lmaydi.", 'Xesh'),
  g('kripto', 'key', 'Key', "Shifrlash va ochishda ishlatiladigan maxfiy qiymat.", 'Kalit'),
  g('kripto', 'plaintext', 'Plaintext', "Shifrlanmagan, o'qilishi mumkin bo'lgan ma'lumot.", 'Ochiq matn'),
  g('kripto', 'ciphertext', 'Ciphertext', "Shifrlangan ma'lumot.", 'Shifrlangan matn'),
  g('kripto', 'tls', 'TLS', "Transport Layer Security — tarmoq aloqasini shifrlovchi protokol; HTTPS shu asosda ishlaydi."),

  // ── web
  g('web', 'url', 'URL', "Internetdagi resurs manzili: https://example.com/sahifa."),
  g('web', 'cookie', 'Cookie', "Sayt brauzerda saqlaydigan kichik ma'lumot; ko'pincha foydalanuvchi sessiyasini eslab qolish uchun."),
  g('web', 'sql-injection', 'SQL injection', "Foydalanuvchi kiritgan ma'lumot orqali ma'lumotlar bazasi so'roviga begona buyruq qo'shish zaifligi."),
  g('web', 'xss', 'XSS', "Cross-Site Scripting — saytga begona JavaScript kodini joylab, boshqa foydalanuvchilar brauzerida ishlatish."),
  g('web', 'api', 'API', "Dasturlar bir-biri bilan muloqot qiladigan interfeys."),
  g('web', 'owasp', 'OWASP', "Web ilovalar xavfsizligi bo'yicha ochiq hamjamiyat; mashhur Top 10 ro'yxati muallifi."),

  // ── dasturlash
  g('dasturlash', 'algorithm', 'Algorithm', "Masalani yechish uchun aniq qadamlar ketma-ketligi.", 'Algoritm'),
  g('dasturlash', 'script', 'Script', "Bir necha buyruqni avtomatik bajaradigan kichik dastur.", 'Skript'),
  g('dasturlash', 'bug', 'Bug', "Dasturdagi xato: kod kutilganidan boshqacha ishlaydi. Ba'zi bug'lar xavfsizlik zaifligiga aylanadi.", 'Xato'),
  g('dasturlash', 'source-code', 'Source code', "Dasturchi yozgan, inson o'qiy oladigan dastur matni.", 'Manba kodi'),
  g('dasturlash', 'open-source', 'Open source', "Manba kodi hamma uchun ochiq dastur.", 'Ochiq kodli'),
  g('dasturlash', 'python', 'Python', "O'rganish oson, xavfsizlik sohasida eng ko'p ishlatiladigan dasturlash tili."),
  g('dasturlash', 'writeup', 'Writeup', "Topshiriq yoki mashina qanday yechilgani haqida yozilgan bosqichma-bosqich tahlil."),
];

const index = new Map(GLOSSARY.map((t) => [t.id, t]));

export function getTerm(id: string): GlossaryTerm | null {
  return index.get(id) ?? null;
}
