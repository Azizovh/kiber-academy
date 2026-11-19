import { at, Capture, httpGet, httpResponse } from '../engine/terminal/pcapBuild';
import type { CtfChallenge } from './types';

/*
 * Traffic challenges: capture files read with tcpdump and tshark (and one to read on the page). Flags are stored
 * as hashes; plain answers and scripted solutions live in content.test.ts.
 */

const GW = '10.20.30.1';

function ftpCapture(): string {
  const c = new Capture();
  c.dns(at(14, 0, 0.5), '10.20.30.41', GW, 'backup.lab', ['10.20.30.9']);
  c.tcp(at(14, 0, 1), '10.20.30.41', 50111, '10.20.30.9', 21, [
    { s: '220 ProFTPD Server (backup)\r\n' },
    { c: 'USER zaxira\r\n', s: '331 Password required for zaxira\r\n' },
    { c: `PASS ${atob('dGFybW9xX2VzaGl0YWRp')}\r\n`, s: '230 User zaxira logged in\r\n' },
    { c: 'LIST\r\n', s: '150 Opening ASCII mode data connection\r\n' },
    { c: 'QUIT\r\n', s: '221 Goodbye.\r\n' },
  ]);
  c.tls(at(14, 0, 9), '10.20.30.41', 50120, '140.82.121.4', 'github.com');
  return c.build();
}

function dnsExfilCapture(): string {
  const c = new Capture();
  const host = '10.20.30.57';
  c.dns(at(15, 0, 1), host, GW, 'www.wikipedia.org', ['185.15.59.224']);
  c.tls(at(15, 0, 1.1), host, 51001, '185.15.59.224', 'www.wikipedia.org');
  ['666c61677b646e73', '5f74756e6e656c5f', '7573686c616e6469', '7d'].forEach((chunk, i) =>
    c.dns(at(15, 0, 20 + i * 1.3), host, GW, `${chunk}.s${i + 1}.cdn-metrics.example`, 'NXDOMAIN', 'TXT'),
  );
  c.dns(at(15, 0, 40), host, GW, 'outlook.office365.com', ['52.97.146.162']);
  c.dns(at(15, 0, 45), host, GW, 'time.windows.com', ['168.61.215.74']);
  return c.build();
}

function scanCapture(): string {
  const c = new Capture();
  const ports = [21, 22, 23, 25, 80, 110, 139, 443, 445, 1433, 3306, 3389, 5432, 6379, 8080, 9200];
  const open = [22, 3306, 8080];
  ports.forEach((p, i) => c.probe(at(16, 0, 1 + i * 0.05), '198.51.100.200', 45000, '10.20.30.15', p, open.includes(p)));
  c.tcp(at(16, 0, 30), '10.20.30.41', 50300, '10.20.30.15', 22, [{ s: 'SSH-2.0-OpenSSH_9.6\r\n' }, { c: 'SSH-2.0-OpenSSH_9.6p1\r\n' }]);
  return c.build();
}

function beaconCapture(): string {
  const c = new Capture();
  const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0 Safari/537.36';
  const browse = (t: number, host: string, ip: string, path: string, src: string, port: number) =>
    c.tcp(t, src, port, ip, 80, [{ c: httpGet(host, path, ua), s: httpResponse(200, 'OK', '<html>ok</html>') }]);
  // Ordinary browsing from three PCs at irregular times.
  [[2, 'news.example', '203.0.113.30', '/'], [7.3, 'news.example', '203.0.113.30', '/sport'], [13.9, 'weather.example', '203.0.113.31', '/toshkent'], [21.4, 'news.example', '203.0.113.30', '/iqtisod']].forEach(([m, h, ip, p], i) =>
    browse(at(9, 0, (m as number) * 60), h as string, ip as string, p as string, '10.20.30.41', 52000 + i),
  );
  [[4.1, 'shop.example', '203.0.113.40', '/'], [4.6, 'shop.example', '203.0.113.40', '/savat'], [19.2, 'shop.example', '203.0.113.40', '/buyurtma']].forEach(([m, h, ip, p], i) =>
    browse(at(9, 0, (m as number) * 60), h as string, ip as string, p as string, '10.20.30.44', 53000 + i),
  );
  // One PC calls home every five minutes, to the second.
  for (let i = 0; i < 6; i++) {
    c.tcp(at(9, 1 + i * 5, 12), '10.20.30.57', 54000 + i, '192.0.2.99', 80, [
      { c: httpGet('cdn-sync.example', '/sync/v1/ping', 'Microsoft-CryptoAPI/10.0'), s: httpResponse(200, 'OK', '{"ok":1}', 'application/json') },
    ]);
  }
  [[9.8, 'docs.example', '203.0.113.50', '/qollanma']].forEach(([m, h, ip, p], i) => browse(at(9, 0, (m as number) * 60), h as string, ip as string, p as string, '10.20.30.57', 55000 + i));
  return c.build();
}

export const CTF_TRAFFIC: CtfChallenge[] = [
  {
    id: 'pcap-ftp',
    title: 'Zaxira serverining paroli',
    category: 'tarmoq',
    level: 1,
    description: "`ftp.pcap` faylida zaxira serveriga FTP orqali kirish yozilgan. FTP parolni ochiq matnda yuboradi. Uni toping.\n\nFlag formati: `flag{PAROL}`",
    hints: [
      "`tshark -r ftp.pcap -Y ftp` — Request: qatorlariga qarang.",
      "Faqat parol: `tshark -r ftp.pcap -Y 'ftp.request.command == \"PASS\"' -T fields -e ftp.request.arg`",
    ],
    flagHash: '1371d7b4079ebd',
    shell: () => ({ fs: { home: { talaba: { 'ftp.pcap': ftpCapture() } }, tmp: {} } }),
  },
  {
    id: 'pcap-basic',
    title: 'Routerning veb-paneli',
    category: 'tarmoq',
    level: 1,
    description:
      "Kimdir router paneliga HTTP orqali kirgan. Quyida o'sha so'rov tshark'da ko'rinishi. Sarlavhadagi qiymat — shifrlash emas.\n\nFlag — paroldagi `flag{...}` qismi.",
    data: [
      '   14   3.218004    10.20.30.41 → 10.20.30.1      HTTP     412 GET /admin/status HTTP/1.1',
      '',
      '$ tshark -r router.pcap -Y http.authorization -T fields -e http.authorization',
      'Basic cm91dGVyOmZsYWd7YmFzaWNfYnVfYmFzZTY0fQ==',
    ].join('\n'),
    hints: ['HTTP Basic: `Basic ` dan keyingi qism `login:parol` ning Base64 ko\'rinishi.', '`echo QIYMAT | base64 -d`'],
    flagHash: '005ced7f910d2d',
  },
  {
    id: 'pcap-dns-exfil',
    title: "DNS orqali qochgan ma'lumot",
    category: 'tarmoq',
    level: 2,
    description:
      "`dns.pcap` da bir kompyuterning DNS so'rovlari bor. Ulardan biri oddiy emas: subdomenlarda bo'lib-bo'lib ma'lumot olib chiqilgan. Bo'laklarni tartib bilan yig'ib, oching.",
    hints: [
      "`tshark -r dns.pcap -Y 'dns.flags.response == 0' -T fields -e dns.qry.name` — g'alati domenlarni toping.",
      "Birinchi qism — o'n oltilik (hex) bo'lak: `cut -d. -f1`, keyin `tr -d '\\n'` bilan birlashtiring.",
      '`xxd -r -p` hex\'ni matnga aylantiradi.',
    ],
    flagHash: '19d8b9b05341e5',
    shell: () => ({ fs: { home: { talaba: { 'dns.pcap': dnsExfilCapture() } }, tmp: {} } }),
  },
  {
    id: 'pcap-scan',
    title: 'Skaner nimani topdi?',
    category: 'tarmoq',
    level: 2,
    description:
      "`skan.pcap` da serverga qilingan port skanerlashi yozilgan. Skaner qaysi portlarni **ochiq** deb topdi?\n\nFlag formati: portlar o'sish tartibida, pastki chiziq bilan — `flag{21_80_443}` kabi.",
    hints: [
      "Ochiq port SYN ga SYN-ACK bilan javob beradi, yopiq port — RST bilan.",
      "`tshark -r skan.pcap -Y 'tcp.flags.syn == 1 && tcp.flags.ack == 1' -T fields -e tcp.srcport | sort -n -u`",
      'Faqat skanerga berilgan javoblar: filtrga `&& ip.dst == SKANER_IP` qo\'shing.',
    ],
    flagHash: '0344f74a7f02c3',
    shell: () => ({ fs: { home: { talaba: { 'skan.pcap': scanCapture() } }, tmp: {} } }),
  },
  {
    id: 'pcap-beacon',
    title: 'Har besh daqiqada',
    category: 'tarmoq',
    level: 3,
    description:
      "`ofis-http.pcap` — yarim soatlik HTTP trafik. Odamlar saytlarni tartibsiz vaqtlarda ochadi; zararli dastur esa o'z serveriga **muntazam** murojaat qiladi. Shunday \"beacon\" domenini va uning davrini (soniyalarda) toping.\n\nFlag formati: `flag{domen_soniya}` — masalan `flag{example.com_60}`.",
    hints: [
      "Kim qaysi saytga necha marta: `tshark -r ofis-http.pcap -Y http.request -T fields -e ip.src -e http.host | sort | uniq -c`",
      "Shubhali domen uchun so'rovlar orasidagi vaqt: `-Y 'http.host == \"DOMEN\"' -T fields -e frame.time_delta_displayed`",
      "User-Agent ham ko'p narsani aytadi: `-e http.user_agent`",
    ],
    flagHash: '16b32ffd62000a',
    shell: () => ({ fs: { home: { talaba: { 'ofis-http.pcap': beaconCapture() } }, tmp: {} } }),
  },
];
