import type { Stage } from '../types';
import { mod, r, topic } from './helpers';

const messer = r.video('Professor Messer — bepul Network+ / Security+ videolari', 'https://www.professormesser.com/');
const cs50 = r.course('CS50x — Harvard kompyuter fanlari kursi', 'https://cs50.harvard.edu/x/');
const bandit = r.lab('OverTheWire — Bandit', 'https://overthewire.org/wargames/bandit/', "Linux terminali bo'yicha eng yaxshi bepul o'yin.");
const cyberchef = r.tool('CyberChef — kodlash va shifrlash vositasi', 'https://gchq.github.io/CyberChef/');
const cloudflare = r.article('Cloudflare Learning Center', 'https://www.cloudflare.com/learning/', 'Tarmoq va xavfsizlik mavzulari sodda tilda.');

export const FOUNDATION: Stage[] = [
  {
    id: 's0-kirish',
    track: 'foundation',
    title: 'Kirish',
    summary: "Soha nima, unda kimlar ishlaydi, nima qonuniy va nima yo'q. O'qish usuli va shaxsiy laboratoriya.",
    outcome: "Kiberxavfsizlik sohasini, kasblarini va etik chegaralarini tushunasiz; kompyuteringizda xavfsiz mashq muhiti tayyor.",
    modules: [
      mod('s0-soha', 'Soha bilan tanishuv', [
        topic('kiberxavfsizlik-nima', 'Kiberxavfsizlik nima?', 1.5, "Soha nimani himoya qiladi, kimdan va nima uchun.", [
          "Kiberxavfsizlik nima ekanini o'z so'zlarim bilan tushuntira olaman",
          "Hujumchilarning asosiy turlari va maqsadlarini bilaman",
          "Maxfiylik, yaxlitlik va foydalanuvchanlik (CIA) nimaligini misol bilan ayta olaman",
        ], [
          r.article('Cloudflare — What is cyber security?', 'https://www.cloudflare.com/learning/security/what-is-cyber-security/'),
          r.thm('Intro to Cyber Security'),
        ]),
        topic('kasblar-xaritasi', 'Kasblar xaritasi', 2, "Red Team, Blue Team va boshqa yo'nalishlar: kim nima ish qiladi.", [
          "Hujum (Red) va himoya (Blue) jamoalarining farqini bilaman",
          "Kamida 6 ta kasbni va ularning kundalik ishini ayta olaman",
          "Qaysi yo'nalish menga yaqinroq ekanini taxminan bilaman",
        ], [
          r.article('roadmap.sh — Cyber Security yo\'l xaritasi', 'https://roadmap.sh/cyber-security'),
          r.thm('Careers in Cyber'),
        ]),
        topic('etika-va-qonun', 'Etika va qonun', 1.5, "Ruxsatsiz kirish — jinoyat. Etik xaker qayerda mashq qiladi va nimaga haqqi bor.", [
          "Ruxsat (authorization) nima uchun hamma narsadan muhimligini tushunaman",
          "Qonuniy mashq qilish mumkin bo'lgan joylarni bilaman",
          "White, grey va black hat farqini ayta olaman",
        ], [
          r.article("O'zbekiston Respublikasi Jinoyat kodeksi (lex.uz)", 'https://lex.uz/docs/111453', "XX¹ bob — axborot texnologiyalari sohasidagi jinoyatlar."),
          r.article('HackerOne — Disclosure guidelines', 'https://www.hackerone.com/disclosure-guidelines'),
        ]),
      ]),
      mod('s0-tayyorgarlik', 'Tayyorgarlik', [
        topic('qanday-organish', "Qanday o'rganish kerak", 2, "Samarali o'qish usullari, konspekt, takrorlash va ingliz tili masalasi.", [
          "O'zimga mos kunlik o'qish tartibini tuzdim",
          "Faol eslash va oraliqli takrorlash nima ekanini bilaman",
          "Qiyin joyda qanday qidirish va savol berishni bilaman",
        ], [
          r.course('Learning How to Learn (Coursera)', 'https://www.coursera.org/learn/learning-how-to-learn', 'Bepul tinglash mumkin.'),
          r.article('How To Ask Questions The Smart Way', 'http://www.catb.org/~esr/faqs/smart-questions.html'),
        ]),
        topic('laboratoriya-qurish', "O'z laboratoriyangizni quring", 8, "VirtualBox, Kali Linux va snapshot: xavfsiz mashq maydoni.", [
          "VirtualBox o'rnatdim va virtual mashina nima ekanini tushunaman",
          "Kali Linux virtual mashinasini ishga tushirdim",
          "Snapshot olib, undan qayta tiklay olaman",
          "TryHackMe'da akkaunt ochdim va birinchi xonani tugatdim",
        ], [
          r.docs('VirtualBox — yuklab olish', 'https://www.virtualbox.org/wiki/Downloads'),
          r.docs('Kali Linux — tayyor virtual mashinalar', 'https://www.kali.org/get-kali/#kali-virtual-machines'),
          r.thm('Tutorial'),
        ]),
      ]),
    ],
  },

  {
    id: 's1-kompyuter',
    track: 'foundation',
    title: 'Kompyuter asoslari',
    summary: "Kompyuter ichida nima sodir bo'ladi: qurilmalar, ikkilik sanoq, kodlash, operatsion tizim, fayllar.",
    outcome: "Kompyuter va operatsion tizim qanday ishlashini tushunasiz, ikkilik va o'n oltilik sanoqda erkin ishlaysiz.",
    modules: [
      mod('s1-qurilma', "Qurilma va ma'lumot", [
        topic('kompyuter-qanday-ishlaydi', 'Kompyuter qanday ishlaydi', 4, "Protsessor, xotira, disk va ular orasidagi ma'lumot oqimi.", [
          "CPU, RAM va disk vazifalarini tushuntira olaman",
          "Dastur ishga tushganda nima sodir bo'lishini ayta olaman",
          "RAM va disk farqi xavfsizlikda nima uchun muhimligini bilaman",
        ], [
          r.video('Crash Course Computer Science', 'https://www.youtube.com/playlist?list=PL8dPuuaLjXtNlUrzyH5r6jN9ulIgZBpdo'),
          cs50,
        ]),
        topic('sanoq-tizimlari', "Sanoq tizimlari: binary va hex", 5, "Ikkilik va o'n oltilik sanoq — kompyuterning ona tili.", [
          "O'nlik sonni ikkilikka va aksincha o'tkaza olaman",
          "Hex (o'n oltilik) yozuvni o'qiy olaman",
          "Bit, bayt, KB, MB, GB nisbatlarini bilaman",
        ], [
          r.article('Khan Academy — Bits and bytes', 'https://www.khanacademy.org/computing/computers-and-internet'),
          cyberchef,
        ], { ctf: ['enc-binary', 'enc-hex'] }),
        topic('malumot-kodlash', "Ma'lumotni kodlash: ASCII, Unicode, Base64", 4, "Matn qanday qilib raqamga aylanadi. Kodlash shifrlash emas.", [
          "ASCII va Unicode/UTF-8 nima ekanini bilaman",
          "Base64 ni ko'rganda taniyman va ocha olaman",
          "Kodlash, shifrlash va xeshlash farqini tushuntira olaman",
        ], [
          cyberchef,
          r.article('MDN — Base64', 'https://developer.mozilla.org/en-US/docs/Glossary/Base64'),
        ], { labs: ['kodlash-terminalda'], ctf: ['enc-base64', 'enc-layers'] }),
      ]),
      mod('s1-tizim', 'Operatsion tizim', [
        topic('operatsion-tizim', 'Operatsion tizim nima', 5, "Yadro, jarayon, foydalanuvchi va huquqlar.", [
          "Operatsion tizim va yadro (kernel) vazifasini tushuntira olaman",
          "Jarayon (process) nima ekanini bilaman",
          "Oddiy foydalanuvchi va administrator farqini bilaman",
        ], [
          r.video('Crash Course — Operating Systems', 'https://www.youtube.com/watch?v=26QPDBe-NB8'),
          r.thm('Windows Fundamentals 1'),
        ]),
        topic('fayl-tizimlari', 'Fayllar va fayl tizimlari', 4, "Fayl, katalog, yo'l, kengaytma va sehrli baytlar.", [
          "Mutlaq va nisbiy yo'l farqini bilaman",
          "Fayl kengaytmasi fayl turini kafolatlamasligini tushunaman",
          "Windows va Linux katalog tuzilmasi farqini bilaman",
        ], [
          r.article('Wikipedia — List of file signatures', 'https://en.wikipedia.org/wiki/List_of_file_signatures'),
          r.thm('Linux Fundamentals Part 1'),
        ], { labs: ['terminal-birinchi-qadam'], ctf: ['for-magic'] }),
        topic('windows-asoslari', 'Windows asoslari', 8, "CMD va PowerShell, foydalanuvchilar, xizmatlar, registry, Task Manager.", [
          "CMD va PowerShell'da asosiy buyruqlarni ishlata olaman",
          "Foydalanuvchi, guruh va UAC nima ekanini bilaman",
          "Xizmatlar, registry va Event Viewer'ni topa olaman",
        ], [
          r.thm('Windows Fundamentals 1, 2, 3'),
          r.docs('Microsoft Learn — PowerShell 101', 'https://learn.microsoft.com/en-us/powershell/scripting/learn/ps101/00-introduction'),
        ], { labs: ['powershell-asoslari', 'windows-server-auditi'], ctf: ['win-hidden', 'win-runkey'] }),
        topic('virtualizatsiya', 'Virtualizatsiya va konteynerlar', 5, "Bitta kompyuterda ko'p kompyuter: VM, gipervizor, konteyner.", [
          "Virtual mashina va gipervizor nima ekanini tushuntira olaman",
          "VM va konteyner farqini bilaman",
          "NAT, Bridged va Host-only tarmoq rejimlarini farqlay olaman",
        ], [
          r.docs('VirtualBox — User Manual', 'https://www.virtualbox.org/manual/'),
          r.article('Cloudflare — What is a virtual machine?', 'https://www.cloudflare.com/learning/cloud/what-is-a-virtual-machine/'),
        ]),
      ]),
    ],
  },

  {
    id: 's2-tarmoq',
    track: 'foundation',
    title: 'Tarmoq asoslari',
    summary: "Kompyuterlar bir-biri bilan qanday gaplashadi. Hujumlarning deyarli hammasi tarmoq orqali o'tadi.",
    outcome: "Paket manbadan manzilga qanday yetib borishini tushunasiz, subnet hisoblaysiz, Wireshark'da trafikni o'qiysiz.",
    modules: [
      mod('s2-asos', 'Tarmoq tuzilishi', [
        topic('tarmoq-nima', 'Tarmoq nima', 4, "LAN, WAN, internet va tarmoq qurilmalari.", [
          "LAN, WAN va internet farqini bilaman",
          "Switch, router va access point vazifalarini ayta olaman",
          "Klient–server modelini tushuntira olaman",
        ], [r.thm('What is Networking?'), cloudflare]),
        topic('osi-tcpip', 'OSI va TCP/IP modellari', 5, "Tarmoqni qatlamlarga bo'lib tushunish.", [
          "OSI ning 7 qatlamini tartib bilan ayta olaman",
          "Har qatlamga kamida bitta protokol misol keltira olaman",
          "Inkapsulyatsiya nima ekanini tushuntira olaman",
        ], [r.thm('OSI Model'), messer]),
        topic('ip-va-subnetting', 'IP manzillar va subnetting', 8, "IPv4, maska, CIDR, xususiy va ommaviy manzillar.", [
          "IP manzil va maska nimaligini bilaman",
          "/24, /26, /30 kabi tarmoqlarda manzillar sonini hisoblay olaman",
          "Xususiy (private) manzil oraliqlarini yoddan bilaman",
          "IPv6 manzilni taniyman",
        ], [
          r.video('Practical Networking — Subnetting Mastery', 'https://www.youtube.com/playlist?list=PLIFyRwBY_4bQUE4IB5c4VPRyDoLgOdExE'),
          r.lab('subnettingpractice.com', 'https://subnettingpractice.com/'),
        ], { ctf: ['net-subnet'] }),
        topic('mac-arp-switching', 'MAC manzil, ARP va switch', 4, "Lokal tarmoq ichida ma'lumot qanday yetkaziladi.", [
          "MAC va IP manzil farqini bilaman",
          "ARP qanday ishlashini tushuntira olaman",
          "ARP spoofing nima uchun mumkinligini tushunaman",
        ], [r.thm('Intro to LAN'), cloudflare]),
      ]),
      mod('s2-protokol', 'Protokollar', [
        topic('tcp-udp-portlar', 'TCP, UDP va portlar', 5, "Ishonchli va tez yetkazish; port — xizmat eshigi.", [
          "TCP uch bosqichli salomlashuvini (three-way handshake) chizib bera olaman",
          "TCP va UDP farqini va qayerda ishlatilishini bilaman",
          "Eng ko'p uchraydigan 15 ta portni yoddan bilaman",
        ], [r.thm('Packets & Frames'), messer]),
        topic('dns', 'DNS', 5, "Internetning telefon kitobi: nom qanday qilib manzilga aylanadi.", [
          "DNS so'rovi bosqichlarini tushuntira olaman",
          "A, AAAA, CNAME, MX, TXT, NS yozuvlarini bilaman",
          "`nslookup` yoki `dig` bilan so'rov yubora olaman",
        ], [r.thm('DNS in Detail'), r.article('Cloudflare — What is DNS?', 'https://www.cloudflare.com/learning/dns/what-is-dns/')]),
        topic('http-https', 'HTTP va HTTPS', 7, "Web'ning tili: so'rov, javob, metodlar, status kodlar, cookie.", [
          "HTTP so'rov va javob tuzilishini o'qiy olaman",
          "GET/POST farqini va asosiy status kodlarni bilaman",
          "Cookie va sessiya nima ekanini tushuntira olaman",
          "HTTPS nimani himoya qilishini bilaman",
        ], [r.thm('HTTP in Detail'), r.docs('MDN — HTTP', 'https://developer.mozilla.org/en-US/docs/Web/HTTP')], { ctf: ['web-headers'] }),
        topic('dhcp-nat-routing', 'DHCP, NAT va marshrutlash', 5, "Manzil qayerdan keladi va paket internetga qanday chiqadi.", [
          "DHCP manzil berish jarayonini bilaman",
          "NAT nima uchun kerakligini tushuntira olaman",
          "Default gateway va marshrut jadvali nimaligini bilaman",
        ], [r.thm('Extending Your Network'), messer]),
        topic('asosiy-protokollar', 'Asosiy xizmat protokollari', 6, "SSH, FTP, SMTP, SMB, RDP, SNMP — nima uchun va qanday xavfi bor.", [
          "Har bir protokol nima uchun ishlatilishini bilaman",
          "Qaysilari ma'lumotni ochiq (shifrsiz) uzatishini ayta olaman",
          "SSH orqali serverga ulana olaman",
        ], [r.thm('Network Services'), r.thm('Protocols and Servers')]),
      ]),
      mod('s2-amaliyot', 'Tahlil va himoya', [
        topic('wireshark', 'Wireshark bilan paket tahlili', 6, "Tarmoqdan o'tayotgan haqiqiy paketlarni ko'rish va o'qish.", [
          "Trafikni yozib ola olaman va filtr qo'llay olaman",
          "TCP oqimini (Follow Stream) kuzata olaman",
          "Ochiq uzatilgan parolni trafikdan topa olaman",
        ], [
          r.docs('Wireshark — User Guide', 'https://www.wireshark.org/docs/wsug_html_chunked/'),
          r.thm('Wireshark: The Basics'),
        ], { labs: ['trafik-asoslari', 'trafik-ochiq-matn'], ctf: ['pcap-ftp', 'pcap-basic'] }),
        topic('tarmoq-himoyasi-asoslari', 'Firewall, VPN, proxy va Wi-Fi', 5, "Tarmoqni himoyalovchi asosiy vositalar.", [
          "Firewall qoidasi qanday ishlashini tushuntira olaman",
          "VPN va proxy farqini bilaman",
          "WPA2/WPA3 va ochiq Wi-Fi xavfini bilaman",
        ], [r.thm('Firewalls'), cloudflare], { labs: ['tarmoq-razvedka'] }),
      ]),
    ],
  },

  {
    id: 's3-linux',
    track: 'foundation',
    title: 'Linux',
    summary: "Xavfsizlik mutaxassisining asosiy ish quroli — terminal. Serverlarning ko'pi Linux'da ishlaydi.",
    outcome: "Linux terminalida sichqonchasiz ishlaysiz: fayllar, ruxsatlar, jarayonlar, loglar va Bash skriptlar.",
    modules: [
      mod('s3-terminal', 'Terminal', [
        topic('linux-bilan-tanishuv', 'Linux bilan tanishuv', 4, "Linux nima, distributivlar, terminal va shell.", [
          "Linux, distributiv va shell nima ekanini bilaman",
          "Buyruq tuzilishini (buyruq, opsiya, argument) tushunaman",
          "`man` va `--help` orqali yordam topa olaman",
        ], [r.thm('Linux Fundamentals Part 1'), r.book('The Linux Command Line (bepul kitob)', 'https://linuxcommand.org/tlcl.php')], { labs: ['terminal-birinchi-qadam'] }),
        topic('fayl-tizimida-harakat', 'Fayl tizimida harakatlanish', 5, "pwd, ls, cd va Linux katalog tuzilmasi.", [
          "`pwd`, `ls -la`, `cd` ni erkin ishlataman",
          "/etc, /var, /home, /tmp, /bin nima uchunligini bilaman",
          "Yashirin fayllarni ko'ra olaman",
        ], [bandit, r.tool('explainshell — buyruqni tushuntirib beradi', 'https://explainshell.com/')], { labs: ['terminal-birinchi-qadam'], ctf: ['lin-hidden'] }),
        topic('fayllar-bilan-ishlash', 'Fayllar bilan ishlash', 6, "Yaratish, nusxalash, ko'chirish, o'chirish, qidirish.", [
          "`mkdir`, `touch`, `cp`, `mv`, `rm` ni ishlataman",
          "`find` bilan fayl qidira olaman",
          "`>` va `>>` farqini bilaman",
        ], [bandit, r.thm('Linux Fundamentals Part 2')], { labs: ['fayllar-va-kataloglar'] }),
        topic('matn-va-pipe', 'Matn bilan ishlash va pipe', 8, "grep, sort, uniq, cut, wc va ularni zanjirga ulash.", [
          "`grep` bilan katta fayldan kerakli qatorni topaman",
          "Buyruqlarni `|` bilan zanjirga ulay olaman",
          "Log fayldan eng ko'p uchragan IP manzilni chiqara olaman",
        ], [bandit, r.book('The Linux Command Line', 'https://linuxcommand.org/tlcl.php')], { labs: ['grep-va-pipe'], ctf: ['log-bruteforce'] }),
      ]),
      mod('s3-tizim', 'Tizim', [
        topic('foydalanuvchilar-va-ruxsatlar', 'Foydalanuvchilar va ruxsatlar', 8, "rwx, chmod, chown, sudo, /etc/passwd va /etc/shadow.", [
          "`ls -l` chiqishidagi ruxsatlarni o'qiy olaman",
          "`chmod` ni raqamli va belgili usulda ishlataman",
          "sudo va root nima ekanini, SUID xavfini bilaman",
        ], [r.thm('Linux Fundamentals Part 2'), bandit], { labs: ['ruxsatlar'], ctf: ['lin-suid'] }),
        topic('jarayonlar-va-xizmatlar', 'Jarayonlar va xizmatlar', 6, "ps, top, kill, systemctl, cron.", [
          "Ishlayotgan jarayonlarni ko'rib, to'xtata olaman",
          "`systemctl` bilan xizmatni boshqara olaman",
          "cron vazifasi nima ekanini bilaman",
        ], [r.thm('Linux Fundamentals Part 3'), r.docs('Kali Linux hujjatlari', 'https://www.kali.org/docs/')], { labs: ['jarayonlar-va-xizmatlar'], ctf: ['lin-fake-process'] }),
        topic('paketlar-va-tarmoq-buyruqlari', 'Paketlar va tarmoq buyruqlari', 6, "apt, ip, ss, ping, curl, wget, nc.", [
          "`apt` bilan dastur o'rnata olaman",
          "`ip a`, `ss -tlnp`, `ping` natijasini o'qiy olaman",
          "`curl` bilan HTTP so'rov yubora olaman",
        ], [r.thm('Linux Fundamentals Part 3'), r.docs('curl — tutorial', 'https://curl.se/docs/tutorial.html')], { labs: ['tarmoq-razvedka'] }),
        topic('bash-skript', 'Bash skript yozish', 11, "O'zgaruvchi, shart, sikl — takroriy ishni avtomatlashtirish.", [
          "Bajariladigan skript fayl yarata olaman",
          "O'zgaruvchi, `if`, `for`, `while` ishlataman",
          "IP ro'yxatini ping qiluvchi skript yoza olaman",
        ], [r.thm('Bash Scripting'), r.article('Bash Guide (Greg\'s Wiki)', 'https://mywiki.wooledge.org/BashGuide')], { labs: ['bash-skriptlar'], ctf: ['lin-cron'] }),
        topic('loglar-va-ssh', 'Loglar va SSH', 6, "/var/log, journalctl, SSH kalitlari.", [
          "Asosiy log fayllar qayerdaligini bilaman",
          "auth.log dan muvaffaqiyatsiz kirishlarni topa olaman",
          "SSH kalit juftligi yaratib, kalit bilan ulana olaman",
        ], [bandit, r.article('DigitalOcean — SSH Essentials', 'https://www.digitalocean.com/community/tutorials/ssh-essentials-working-with-ssh-servers-clients-and-keys')], { ctf: ['log-bruteforce', 'log-useradd', 'log-timeline'] }),
      ]),
    ],
  },

  {
    id: 's4-dasturlash',
    track: 'foundation',
    title: 'Dasturlash',
    summary: "Kod o'qiy olmagan odam zaiflikni tushunmaydi. Python, Git, web va SQL asoslari.",
    outcome: "Python'da o'z vositalaringizni yozasiz, Git bilan ishlaysiz, web sahifa va ma'lumotlar bazasi tuzilishini tushunasiz.",
    modules: [
      mod('s4-python', 'Python', [
        topic('dasturlashga-kirish', 'Dasturlashga kirish', 5, "Dastur nima, algoritm, Python o'rnatish va birinchi kod.", [
          "Python o'rnatdim va birinchi dasturimni ishga tushirdim",
          "Algoritm nima ekanini tushuntira olaman",
          "Xato xabarini o'qib, sababini qidira olaman",
        ], [r.course('CS50P — Python kursi', 'https://cs50.harvard.edu/python/'), r.docs('Python — rasmiy tutorial', 'https://docs.python.org/3/tutorial/')]),
        topic('python-asoslari', "Python: o'zgaruvchi, shart, sikl", 12, "Ma'lumot turlari, if, for, while.", [
          "O'zgaruvchi va asosiy turlarni ishlataman",
          "`if`, `for`, `while` bilan mantiq yoza olaman",
          "Son topish o'yini kabi kichik dastur yoza olaman",
        ], [r.course('CS50P', 'https://cs50.harvard.edu/python/'), r.book('Automate the Boring Stuff with Python', 'https://automatetheboringstuff.com/')]),
        topic('python-funksiya-va-tuzilmalar', "Python: funksiya va ma'lumot tuzilmalari", 12, "Funksiya, list, dict, set, string amallari.", [
          "Funksiya yozib, qayta ishlata olaman",
          "list va dict bilan erkin ishlayman",
          "Matnni bo'lib, qidirib, almashtira olaman",
        ], [r.book('Automate the Boring Stuff', 'https://automatetheboringstuff.com/'), r.thm('Python Basics')]),
        topic('python-fayl-va-modullar', 'Python: fayllar, xatolar, modullar', 9, "Fayl o'qish-yozish, try/except, pip va kutubxonalar.", [
          "Faylni o'qib, qayta ishlab, natijani yoza olaman",
          "Xatolarni `try/except` bilan ushlay olaman",
          "`pip` bilan kutubxona o'rnatib ishlataman",
        ], [r.docs('Python — rasmiy tutorial', 'https://docs.python.org/3/tutorial/'), r.book('Automate the Boring Stuff', 'https://automatetheboringstuff.com/')]),
        topic('python-xavfsizlik-uchun', 'Python xavfsizlik uchun', 14, "socket, requests, hashlib: tekshiruv va tahlil vositalarini o'zingiz yozish.", [
          "`socket` bilan o'z serverimdagi portlar holatini tekshiruvchi skript yozdim",
          "`requests` bilan web so'rov yuborib, javob va sarlavhalarni tahlil qila olaman",
          "`hashlib` bilan fayl yaxlitligini tekshiruvchi skript yoza olaman",
          "Jurnal faylini tahlil qilib, hisobot chiqaruvchi dastur yozdim",
        ], [r.docs('Python — socket hujjatlari', 'https://docs.python.org/3/library/socket.html'), r.docs('Requests kutubxonasi', 'https://requests.readthedocs.io/'), r.thm('Python Basics')]),
      ]),
      mod('s4-vosita', 'Vositalar va web', [
        topic('git', 'Git va GitHub', 7, "Versiyalarni boshqarish va kodni ulashish.", [
          "Repozitoriy yaratib, commit qila olaman",
          "Branch ochib, birlashtira olaman",
          "GitHub'ga kod joylay olaman",
        ], [r.lab('Learn Git Branching', 'https://learngitbranching.js.org/'), r.book('Pro Git (bepul kitob)', 'https://git-scm.com/book/en/v2')], { labs: ['git-asoslari'], ctf: ['git-deleted'] }),
        topic('web-asoslari', 'Web asoslari: HTML, CSS, JavaScript', 11, "Sahifa nimadan iborat va brauzer uni qanday ishlatadi.", [
          "HTML sahifa tuzilishini o'qiy olaman",
          "JavaScript brauzerda nima qila olishini bilaman",
          "Brauzer DevTools'da so'rovlar va sahifa kodini ko'ra olaman",
        ], [r.docs('MDN Web Docs', 'https://developer.mozilla.org/'), r.thm('How Websites Work')], { ctf: ['web-source'] }),
        topic('sql-asoslari', "SQL va ma'lumotlar bazasi", 10, "Jadval, SELECT, WHERE, JOIN — SQL injection'ni tushunish uchun poydevor.", [
          "Jadval, qator, ustun, kalit nima ekanini bilaman",
          "SELECT, WHERE, ORDER BY, JOIN so'rovlarini yoza olaman",
          "INSERT, UPDATE, DELETE ishlataman",
        ], [r.lab('SQLBolt — interaktiv SQL darslari', 'https://sqlbolt.com/'), r.thm('SQL Fundamentals')]),
      ]),
    ],
  },

  {
    id: 's5-xavfsizlik',
    track: 'foundation',
    title: 'Xavfsizlik asoslari',
    summary: "Barcha yo'nalishlar uchun umumiy til: tahdidlar, kriptografiya, autentifikatsiya, zaifliklar va himoya.",
    outcome: "Xavfsizlikning asosiy tushunchalarida erkin fikrlaysiz va o'zingizga mos yo'nalishni ongli tanlaysiz.",
    modules: [
      mod('s5-tahdid', 'Tahdidlar', [
        topic('cia-va-xavf', 'CIA uchligi va xavf', 3, "Maxfiylik, yaxlitlik, foydalanuvchanlik; tahdid, zaiflik, xavf.", [
          "CIA uchligining har biriga hujum misoli keltira olaman",
          "Tahdid, zaiflik va xavf (risk) farqini bilaman",
          "Xavfni kamaytirish, qabul qilish, o'tkazish nima ekanini bilaman",
        ], [messer, r.thm('Security Principles')]),
        topic('hujum-turlari-va-malware', 'Hujum turlari va zararli dasturlar', 5, "Virus, troyan, ransomware, DoS, MITM va boshqalar.", [
          "Asosiy malware turlarini farqlay olaman",
          "DoS/DDoS, MITM, brute force qanday ishlashini bilaman",
          "Mashhur hujumlardan 3 tasini tahlil qilib bera olaman",
        ], [messer, r.thm('Common Attacks')]),
        topic('ijtimoiy-muhandislik', 'Ijtimoiy muhandislik va phishing', 4, "Eng zaif bo'g'in — inson.", [
          "Phishing xatning belgilarini topa olaman",
          "Pretexting, baiting, tailgating nima ekanini bilaman",
          "Shubhali havolani xavfsiz tekshira olaman",
        ], [r.thm('Phishing Analysis Fundamentals'), r.lab('Google — Phishing Quiz', 'https://phishingquiz.withgoogle.com/')], { ctf: ['for-phish'] }),
      ]),
      mod('s5-kripto', 'Kriptografiya va kirish', [
        topic('kriptografiya-asoslari', 'Kriptografiya asoslari', 6, "Simmetrik va asimmetrik shifrlash, kalit almashish.", [
          "Simmetrik va asimmetrik shifrlash farqini tushuntira olaman",
          "Ochiq va yopiq kalit qanday ishlatilishini bilaman",
          "AES va RSA qayerda ishlatilishini ayta olaman",
        ], [r.lab('CryptoHack', 'https://cryptohack.org/'), r.thm('Cryptography Basics')], { ctf: ['cry-caesar', 'cry-xor'] }),
        topic('xesh-va-parollar', 'Xesh va parollar', 5, "Xesh funksiya, salt, parol saqlash va buzish.", [
          "Xesh va shifrlash farqini bilaman",
          "Salt nima uchun kerakligini tushuntira olaman",
          "Kuchli parol siyosati va parol menejeri haqida bilaman",
        ], [r.thm('Hashing Basics'), r.tool('CrackStation — xesh qidirish', 'https://crackstation.net/')], { ctf: ['cry-hash-id'] }),
        topic('tls-va-pki', 'TLS, sertifikatlar va PKI', 4, "HTTPS qulfi ortida nima bor.", [
          "TLS handshake'ni umumiy tushuntira olaman",
          "Sertifikat va sertifikat markazi (CA) nimaligini bilaman",
          "Brauzerda sertifikatni ko'rib, tekshira olaman",
        ], [r.article('Cloudflare — What is TLS?', 'https://www.cloudflare.com/learning/ssl/transport-layer-security-tls/'), r.thm('Public Key Cryptography Basics')]),
        topic('autentifikatsiya-va-kirish-nazorati', 'Autentifikatsiya va kirish nazorati', 5, "Kimligingni isbotla, keyin nimaga haqqing borligini bilamiz.", [
          "Autentifikatsiya va avtorizatsiya farqini bilaman",
          "MFA turlarini va zaif tomonlarini ayta olaman",
          "Eng kam imtiyoz (least privilege) tamoyilini tushuntira olaman",
        ], [messer, r.article('OWASP — Authentication Cheat Sheet', 'https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html')]),
      ]),
      mod('s5-himoya', 'Zaiflik va himoya', [
        topic('zaifliklar-cve-cvss', 'Zaifliklar: CVE, CVSS, patch', 4, "Zaiflik qanday nomlanadi, baholanadi va tuzatiladi.", [
          "CVE raqami bo'yicha zaiflik haqida ma'lumot topa olaman",
          "CVSS bahosini o'qiy olaman",
          "Zero-day va patch boshqaruvi nima ekanini bilaman",
        ], [r.docs('NVD — National Vulnerability Database', 'https://nvd.nist.gov/'), r.docs('FIRST — CVSS', 'https://www.first.org/cvss/')]),
        topic('kill-chain-va-attack', 'Hujum zanjiri: Kill Chain va MITRE ATT&CK', 4, "Hujum bosqichlari va hujumchi usullarining umumiy xaritasi.", [
          "Cyber Kill Chain bosqichlarini ayta olaman",
          "ATT&CK'da taktika va texnika farqini bilaman",
          "Biror hujumni ATT&CK bo'yicha tahlil qila olaman",
        ], [r.docs('MITRE ATT&CK', 'https://attack.mitre.org/'), r.thm('Cyber Kill Chain')]),
        topic('himoya-qatlamlari', 'Himoya qatlamlari va vositalari', 5, "Defense in depth: firewall, IDS/IPS, EDR, SIEM, zaxira nusxa.", [
          "Qatlamli himoya (defense in depth) g'oyasini tushuntira olaman",
          "IDS, IPS, EDR, SIEM vazifalarini farqlay olaman",
          "3-2-1 zaxira qoidasini bilaman",
        ], [messer, r.docs('CIS Critical Security Controls', 'https://www.cisecurity.org/controls')]),
        topic('owasp-top10-tanishuv', 'Web zaifliklari bilan tanishuv: OWASP Top 10', 4, "Web ilovalardagi eng keng tarqalgan o'nta xavf.", [
          "OWASP Top 10 toifalarini ayta olaman",
          "SQL injection va XSS g'oyasini tushuntira olaman",
          "Juice Shop'da birinchi zaiflikni topdim",
        ], [r.docs('OWASP Top Ten', 'https://owasp.org/www-project-top-ten/'), r.lab('OWASP Juice Shop', 'https://owasp.org/www-project-juice-shop/')], { ctf: ['web-source'] }),
        topic('yonalish-tanlash', "Yo'nalishni tanlash", 1, "Poydevor tugadi: Pentest, SOC, AppSec yoki Cloud?", [
          "To'rt yo'nalishning kundalik ishini solishtirdim",
          "O'zimga mos yo'nalishni tanladim va sozlamalarda belgiladim",
        ], [r.article('roadmap.sh — Cyber Security', 'https://roadmap.sh/cyber-security')]),
      ]),
    ],
  },
];
