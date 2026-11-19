import type { Stage } from '../types';
import { mod, r, topic } from './helpers';

const attack = r.docs('MITRE ATT&CK', 'https://attack.mitre.org/');
const cyberdefenders = r.lab('CyberDefenders — Blue Team lablari', 'https://cyberdefenders.org/');
const letsdefend = r.lab('LetsDefend — SOC simulyatori', 'https://letsdefend.io/');
const sansPosters = r.article('SANS — posterlar va cheat sheet\'lar', 'https://www.sans.org/posters/');

export const SOC: Stage[] = [
  {
    id: 'b1-soc-asoslari',
    track: 'soc',
    title: 'SOC asoslari va loglar',
    summary: "SOC qanday ishlaydi va himoyachining asosiy xomashyosi — loglar.",
    outcome: "Ogohlantirishni (alert) birlamchi tahlil qilasiz, Windows, Linux va tarmoq loglarini o'qiysiz.",
    modules: [
      mod('b1-soc', 'SOC ishi', [
        topic('soc-tuzilmasi', 'SOC tuzilmasi va rollar', 5, "L1, L2, L3 analitiklar, navbatchilik, jarayonlar.", [
          "SOC darajalari va vazifalarini bilaman",
          "Alert, hodisa (event) va insident farqini tushuntira olaman",
        ], [r.thm('Junior Security Analyst Intro'), letsdefend]),
        topic('alert-triage', 'Alert triage', 10, "Ogohlantirish haqiqiymi? Tezkor tekshiruv va eskalatsiya.", [
          "True/false positive ni asoslab ajrata olaman",
          "Tekshiruv qadamlarimni tiketga aniq yoza olaman",
          "Qachon eskalatsiya qilishni bilaman",
        ], [letsdefend, r.thm('SOC Fundamentals')]),
      ]),
      mod('b1-log', 'Loglar', [
        topic('windows-event-loglari', 'Windows Event loglari', 14, "Security, System, PowerShell loglari va eng muhim Event ID'lar.", [
          "4624, 4625, 4688, 4720, 7045 kabi ID'larni yoddan bilaman",
          "Event Viewer va PowerShell bilan log qidira olaman",
          "Logon turlarini (Type 2, 3, 10) farqlayman",
        ], [r.thm('Windows Event Logs'), sansPosters], { labs: ['windows-hodisalari', 'windows-insident'], ctf: ['win-new-admin'] }),
        topic('sysmon', 'Sysmon', 10, "Jarayon, tarmoq ulanishi va fayl hodisalarini batafsil yozish.", [
          "Sysmon o'rnatib, konfiguratsiya qo'llay olaman",
          "Event ID 1, 3, 11, 13 ni tahlil qila olaman",
        ], [r.docs('Microsoft — Sysmon', 'https://learn.microsoft.com/en-us/sysinternals/downloads/sysmon'), r.thm('Sysmon')]),
        topic('linux-loglari', 'Linux loglari va auditd', 10, "auth.log, syslog, journald, auditd.", [
          "SSH brute force izini logdan topa olaman",
          "auditd qoidasi yoza olaman",
        ], [r.thm('Linux Logs Investigations'), cyberdefenders], { labs: ['grep-va-pipe'], ctf: ['log-bruteforce', 'log-useradd'] }),
        topic('tarmoq-loglari', 'Tarmoq loglari: firewall, proxy, DNS', 10, "Tarmoq qurilmalari nimani yozadi va undan nimani bilish mumkin.", [
          "Firewall va proxy logini o'qiy olaman",
          "DNS logidan shubhali domenni ajrata olaman",
        ], [r.thm('Intro to Logs'), r.docs('Zeek hujjatlari', 'https://docs.zeek.org/')], { labs: ['veb-log-tergovi'], ctf: ['log-dns', 'log-webscan'] }),
        topic('trafik-tahlili', 'Tarmoq trafigi tahlili', 16, "Wireshark chuqur, Zeek, PCAP'dan hujumni tiklash.", [
          "PCAP'dan yuklangan faylni ajratib ola olaman",
          "C2 trafigi belgilarini bilaman",
          "Kamida 5 ta PCAP topshirig'ini yechdim",
        ], [r.lab('Malware-Traffic-Analysis.net', 'https://www.malware-traffic-analysis.net/'), r.thm('Wireshark: Traffic Analysis')], { labs: ['trafik-insident', 'trafik-ochiq-matn'], ctf: ['pcap-dns-exfil', 'pcap-scan', 'pcap-beacon'] }),
        topic('phishing-tahlili', 'Phishing xat tahlili', 12, "Sarlavhalar, SPF/DKIM/DMARC, havola va ilova tahlili.", [
          "Xat sarlavhasidan haqiqiy jo'natuvchini aniqlay olaman",
          "Ilova va havolani xavfsiz muhitda tekshira olaman",
          "Phishing bo'yicha tahlil hisobotini yoza olaman",
        ], [r.thm('Phishing Analysis Fundamentals'), r.tool('VirusTotal', 'https://www.virustotal.com/')], { ctf: ['for-phish'] }),
      ]),
    ],
  },

  {
    id: 'b2-siem',
    track: 'soc',
    title: 'SIEM va aniqlash',
    summary: "Millionlab log ichidan hujumni topish: SIEM, qoidalar va tahdid razvedkasi.",
    outcome: "SIEM'da so'rov yozasiz, aniqlash qoidalari yaratasiz va ularni ATT&CK bilan bog'laysiz.",
    modules: [
      mod('b2-siem', 'SIEM', [
        topic('siem-tushunchasi', 'SIEM tushunchasi', 6, "Log yig'ish, normallashtirish, korrelyatsiya, ogohlantirish.", [
          "SIEM arxitekturasini chizib bera olaman",
          "Qaysi log manbalari eng muhimligini bilaman",
        ], [r.thm('Introduction to SIEM'), letsdefend]),
        topic('splunk', 'Splunk va SPL', 20, "Qidiruv tili, statistika, dashboard, alert.", [
          "SPL bilan qidirib, `stats`, `table`, `timechart` ishlataman",
          "Brute force ni aniqlovchi so'rov yoza olaman",
          "Boss of the SOC (BOTS) topshiriqlarini yechdim",
        ], [r.course('Splunk — bepul kurslar', 'https://www.splunk.com/en_us/training/free-courses/overview.html'), r.thm('Splunk: Basics')], { labs: ['siem-spl-asoslari', 'siem-ws-bux-014'], ctf: ['siem-spray'] }),
        topic('elastic-wazuh', 'Elastic va Wazuh', 18, "Ochiq kodli SIEM/XDR: o'z laboratoriyangizda o'rnatish.", [
          "Wazuh serverini o'rnatib, agent uladim",
          "KQL bilan qidira olaman",
        ], [r.docs('Wazuh hujjatlari', 'https://documentation.wazuh.com/'), r.thm('Wazuh')], { labs: ['siem-ws-bux-014'], ctf: ['siem-travel'] }),
      ]),
      mod('b2-aniqlash', 'Aniqlash muhandisligi', [
        topic('detection-engineering', 'Aniqlash qoidalari va Sigma', 14, "Qoida yozish, sinash, sozlash; Sigma formati.", [
          "Sigma qoidasi yozib, SIEM so'roviga aylantira olaman",
          "Qoidani false positive'ga qarshi sozlay olaman",
        ], [r.docs('Sigma', 'https://sigmahq.io/'), r.article('SigmaHQ qoidalar ombori', 'https://github.com/SigmaHQ/sigma')], { labs: ['aniqlash-sigma'], ctf: ['det-sigma'] }),
        topic('attack-mapping', 'ATT&CK bilan ishlash', 8, "Qamrovni o'lchash, Navigator, hujumchi guruhlari.", [
          "Aniqlash qoidalarimni ATT&CK texnikalariga bog'lay olaman",
          "Navigator'da qamrov xaritasini tuza olaman",
        ], [attack, r.thm('MITRE')]),
        topic('ids-ips', 'IDS/IPS: Suricata va Snort', 12, "Tarmoq darajasida aniqlash va qoida yozish.", [
          "Suricata o'rnatib, ishga tushira olaman",
          "Oddiy qoida yozib, PCAP ustida sinay olaman",
        ], [r.docs('Suricata hujjatlari', 'https://docs.suricata.io/'), r.thm('Snort')], { labs: ['aniqlash-suricata-zeek'], ctf: ['det-webshell'] }),
        topic('edr', 'EDR va endpoint himoyasi', 10, "Endpoint'da nima ko'rinadi: jarayon daraxti, telemetriya, javob choralari.", [
          "Jarayon daraxtidan shubhali zanjirni topa olaman",
          "LOLBins nima ekanini bilaman",
        ], [r.tool('LOLBAS', 'https://lolbas-project.github.io/'), r.thm('Intro to Endpoint Security')]),
        topic('threat-intelligence', 'Tahdid razvedkasi (CTI)', 12, "IOC, TTP, Pyramid of Pain, razvedka manbalari.", [
          "IOC va TTP farqini bilaman",
          "IP, domen, xeshni ochiq manbalardan tekshira olaman",
          "Pyramid of Pain'ni tushuntira olaman",
        ], [r.thm('Pyramid Of Pain'), r.tool('AbuseIPDB', 'https://www.abuseipdb.com/')]),
        topic('yara', 'YARA qoidalari', 10, "Fayl va xotiradan zararli dasturni namuna bo'yicha topish.", [
          "Oddiy YARA qoidasi yoza olaman",
          "Qoidani fayllar to'plamida sinay olaman",
        ], [r.docs('YARA hujjatlari', 'https://yara.readthedocs.io/'), r.thm('Yara')], { labs: ['aniqlash-yara'], ctf: ['det-yara-hex'] }),
      ]),
    ],
  },

  {
    id: 'b3-ir-forensics',
    track: 'soc',
    title: 'Incident response va forensics',
    summary: "Hujum sodir bo'ldi. Nima bo'lganini tiklash, to'xtatish va qayta takrorlanmasligini ta'minlash.",
    outcome: "Insidentga javob jarayonini boshqarasiz, disk va xotiradan dalil topasiz, zararli faylni tahlil qilasiz.",
    modules: [
      mod('b3-ir', 'Insidentga javob', [
        topic('ir-jarayoni', 'IR jarayoni', 10, "Tayyorgarlik, aniqlash, cheklash, yo'q qilish, tiklash, saboqlar.", [
          "NIST va SANS IR bosqichlarini bilaman",
          "Ransomware uchun javob rejasini (playbook) tuza olaman",
        ], [r.docs('NIST SP 800-61 — Incident Handling Guide', 'https://csrc.nist.gov/pubs/sp/800/61/r2/final'), r.thm('Incident Response Process')], { labs: ['windows-insident'] }),
        topic('dalil-yigish', 'Dalil yig\'ish va saqlash', 8, "O'zgaruvchanlik tartibi, disk va xotira nusxasi, chain of custody.", [
          "Dalilni buzmasdan nusxa ola olaman",
          "Order of volatility'ni bilaman",
        ], [sansPosters, r.thm('Intro to Digital Forensics')], { labs: ['windows-insident'] }),
      ]),
      mod('b3-forensics', 'Forensics', [
        topic('windows-forensics', 'Windows forensics', 20, "Registry, Prefetch, MFT, Amcache, brauzer tarixi, LNK.", [
          "Dastur ishga tushirilganini artefaktlardan isbotlay olaman",
          "USB ulanish tarixini tiklay olaman",
          "Eric Zimmerman vositalarini ishlataman",
        ], [r.video('13Cubed', 'https://www.youtube.com/@13Cubed'), r.thm('Windows Forensics 1 & 2')], { labs: ['windows-insident'], ctf: ['win-encoded', 'win-c2'] }),
        topic('disk-forensics', 'Disk tahlili: Autopsy', 12, "Disk tasviri, o'chirilgan fayllar, vaqt chizig'i.", [
          "Autopsy'da keys ochib, tahlil qila olaman",
          "O'chirilgan faylni tiklay olaman",
        ], [r.tool('Autopsy', 'https://www.autopsy.com/'), r.thm('Autopsy')], { ctf: ['for-magic'] }),
        topic('memory-forensics', 'Xotira tahlili: Volatility', 16, "RAM tasviridan jarayonlar, ulanishlar va yashirin kodni topish.", [
          "Volatility 3 bilan jarayonlar va tarmoq ulanishlarini chiqaraman",
          "Kod in'ektsiyasi belgilarini topa olaman",
        ], [r.docs('Volatility 3 hujjatlari', 'https://volatility3.readthedocs.io/'), r.thm('Volatility')]),
        topic('linux-forensics', 'Linux forensics', 10, "Bash tarixi, cron, loglar, persistence joylari.", [
          "Buzilgan Linux serverda izlarni topa olaman",
          "Persistence mexanizmlarini tekshirib chiqa olaman",
        ], [r.thm('Linux Forensics'), cyberdefenders], { ctf: ['for-integrity', 'lin-cron'] }),
      ]),
      mod('b3-malware', 'Malware tahlili', [
        topic('malware-statik', 'Statik tahlil', 14, "Xesh, satrlar, PE tuzilmasi, importlar, packer.", [
          "Faylni ishga tushirmasdan birlamchi xulosa bera olaman",
          "PE sarlavhasi va importlarni o'qiy olaman",
        ], [r.thm('Basic Static Analysis'), r.tool('VirusTotal', 'https://www.virustotal.com/')]),
        topic('malware-dinamik', 'Dinamik tahlil va sandbox', 14, "Izolyatsiyalangan muhitda ishga tushirib, xatti-harakatni kuzatish.", [
          "Xavfsiz tahlil laboratoriyasini qurdim",
          "Procmon, Wireshark va sandbox hisobotidan IOC chiqara olaman",
        ], [r.tool('ANY.RUN — interaktiv sandbox', 'https://any.run/'), r.thm('Basic Dynamic Analysis')]),
        topic('ir-hisobot', 'Vaqt chizig\'i va IR hisoboti', 16, "Topilmalarni yagona hikoyaga yig'ish.", [
          "Hujum vaqt chizig'ini tuza olaman",
          "To'liq insident hisobotini yozdim",
        ], [cyberdefenders, r.article('The DFIR Report — haqiqiy insident tahlillari', 'https://thedfirreport.com/')], { labs: ['siem-ws-bux-014'], ctf: ['log-timeline'] }),
      ]),
    ],
  },

  {
    id: 'b4-hunting',
    track: 'soc',
    title: 'Threat hunting va professional daraja',
    summary: "Ogohlantirishni kutmasdan hujumchini izlash; avtomatlashtirish; sertifikat va portfolio.",
    outcome: "Gipoteza asosida ov qilasiz, takroriy ishni avtomatlashtirasiz va SOC analitigi lavozimiga tayyorsiz.",
    modules: [
      mod('b4-hunt', 'Ov va avtomatlashtirish', [
        topic('threat-hunting', 'Threat hunting metodologiyasi', 16, "Gipoteza, ma'lumot, tahlil, xulosa.", [
          "ATT&CK texnikasi asosida ov gipotezasi tuza olaman",
          "Kamida 3 ta ovni hujjatlashtirdim",
        ], [r.thm('Threat Hunting: Introduction'), attack], { labs: ['siem-ws-bux-014'], ctf: ['siem-rare', 'siem-beacon'] }),
        topic('soar-avtomatlashtirish', 'SOAR va Python bilan avtomatlashtirish', 14, "Takroriy tekshiruvlarni skriptga aylantirish.", [
          "IOC'ni bir nechta manbadan avtomatik tekshiruvchi skript yozdim",
          "Playbook nima ekanini bilaman",
        ], [r.thm('SOAR'), r.docs('VirusTotal API', 'https://docs.virustotal.com/reference/overview')]),
        topic('bulut-loglari', 'Bulut loglari', 10, "CloudTrail, Azure Activity/Entra loglari.", [
          "CloudTrail logidan shubhali amalni topa olaman",
        ], [r.thm('AWS: Cloud 101'), r.docs('AWS CloudTrail', 'https://docs.aws.amazon.com/awscloudtrail/latest/userguide/')], { labs: ['cloudtrail-tergovi'], ctf: ['cloud-trail-user'] }),
        topic('purple-team', 'Purple team: hujumni o\'zingiz bajaring', 12, "Atomic Red Team bilan texnikani bajarib, aniqlashni sinash.", [
          "Atomic test ishga tushirib, uni SIEM'da topdim",
          "Aniqlanmagan texnika uchun qoida yozdim",
        ], [r.tool('Atomic Red Team', 'https://atomicredteam.io/'), r.thm('Atomic Red Team')]),
      ]),
      mod('b4-kasb', 'Kasbga tayyorgarlik', [
        topic('uy-soc-laboratoriyasi', 'Portfolio: uy SOC laboratoriyasi', 20, "SIEM + agentlar + hujum simulyatsiyasi — va hammasi hujjatlashtirilgan.", [
          "Laboratoriyamni qurib, GitHub'da tavsifladim",
          "Kamida 5 ta hujumni aniqlab, tahlilini yozdim",
        ], [r.docs('Wazuh hujjatlari', 'https://documentation.wazuh.com/'), r.lab('Blue Team Labs Online', 'https://blueteamlabs.online/')]),
        topic('soc-sertifikat', 'Sertifikatga tayyorgarlik', 8, "Security+ → BTL1 yoki CySA+.", [
          "Sertifikat rejamni tuzdim",
          "Sinov testlaridan barqaror 85%+ olaman",
        ], [r.docs('CompTIA Security+', 'https://www.comptia.org/certifications/security'), r.video('Professor Messer — Security+', 'https://www.professormesser.com/')]),
      ]),
    ],
  },
];
