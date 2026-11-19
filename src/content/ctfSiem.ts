import type { CtfChallenge } from './types';
import type { Row, SiemEvent } from '../engine/siem/types';
import { strftime } from '../engine/siem/values';
import { prng, utc } from './labs/siem';

/*
 * SIEM challenges: each has its own small data set and opens the SIEM pane. Flags are stored as hashes; plain
 * answers and the SPL / KQL that finds them live in content.test.ts.
 */

const iso = (t: number) => strftime(t, '%Y-%m-%dT%H:%M:%SZ');
const SYSMON = 'XmlWinEventLog:Microsoft-Windows-Sysmon/Operational';

/* ── 1. a rare process among ordinary ones ──────────────────────────── */

function rareProcessData(): SiemEvent[] {
  const rnd = prng(41);
  const out: SiemEvent[] = [];
  const common: [string, string][] = [
    ['C:\\Windows\\explorer.exe', 'C:\\Windows\\System32\\userinit.exe'],
    ['C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', 'C:\\Windows\\explorer.exe'],
    ['C:\\Program Files\\Microsoft Office\\root\\Office16\\OUTLOOK.EXE', 'C:\\Windows\\explorer.exe'],
    ['C:\\Program Files\\Microsoft Office\\root\\Office16\\EXCEL.EXE', 'C:\\Windows\\explorer.exe'],
    ['C:\\Windows\\System32\\svchost.exe', 'C:\\Windows\\System32\\services.exe'],
    ['C:\\Windows\\System32\\rundll32.exe', 'C:\\Windows\\System32\\svchost.exe'],
    ['C:\\Windows\\System32\\taskhostw.exe', 'C:\\Windows\\System32\\svchost.exe'],
    ['C:\\Windows\\System32\\conhost.exe', 'C:\\Windows\\System32\\cmd.exe'],
    ['C:\\Users\\Public\\Teams\\current\\Teams.exe', 'C:\\Windows\\explorer.exe'],
  ];
  const t0 = utc('2026-11-12T03:00:00Z');
  for (let h = 1; h <= 12; h++) {
    const host = `WS-SAV-${String(h).padStart(3, '0')}`;
    for (let i = 0; i < 40; i++) {
      const [image, parent] = common[Math.floor(rnd() * common.length)]!;
      const t = t0 + Math.floor(rnd() * 5 * 86400);
      out.push({ _time: t, _raw: `${iso(t)} EventCode=1 Computer=${host} Image=${image} ParentImage=${parent}`, index: 'sysmon', sourcetype: SYSMON, host, source: SYSMON, EventCode: 1, Image: image, ParentImage: parent });
    }
  }
  // One machine runs a look-alike of rundll32 (digit 1 instead of the letter l) from ProgramData, started by a task.
  const bad = 'C:\\ProgramData\\winupd\\rundl132.exe';
  for (let i = 0; i < 3; i++) {
    const t = utc('2026-11-14T22:00:00Z') + i * 86400 / 4;
    out.push({ _time: t, _raw: `${iso(t)} EventCode=1 Computer=WS-SAV-007 Image=${bad} ParentImage=C:\\Windows\\System32\\svchost.exe`, index: 'sysmon', sourcetype: SYSMON, host: 'WS-SAV-007', source: SYSMON, EventCode: 1, Image: bad, ParentImage: 'C:\\Windows\\System32\\svchost.exe' });
  }
  return out;
}

/* ── 2. beaconing hidden in firewall traffic ────────────────────────── */

function beaconData(): SiemEvent[] {
  const rnd = prng(77);
  const out: SiemEvent[] = [];
  const t0 = utc('2026-11-15T04:00:00Z');
  const span = 8 * 3600;
  const add = (t: number, src: string, dst: string, port: number) =>
    out.push({ _time: t, _raw: `${strftime(t, '%Y/%m/%d %H:%M:%S')},TRAFFIC,end,${src},${dst},${port},ssl,allow`, index: 'firewall', sourcetype: 'pan:traffic', host: 'fw-edge-01', source: 'udp:514', src_ip: src, dest_ip: dst, dest_port: port, action: 'allow', bytes_out: 300 + Math.floor(rnd() * 5000) });
  const dests = ['192.0.2.10', '192.0.2.25', '192.0.2.88', '198.51.100.12', '198.51.100.40', '198.51.100.90', '203.0.113.150', '203.0.113.201'];
  for (let i = 0; i < 900; i++) {
    const src = `10.20.1.${10 + Math.floor(rnd() * 30)}`;
    add(t0 + Math.floor(rnd() * span), src, dests[Math.floor(rnd() * dests.length)]!, 443);
  }
  // A software updater checks in hourly — regular, but every hour on many machines and to a known vendor.
  for (let h = 0; h < 8; h++) for (let m = 10; m < 40; m += 3) add(t0 + h * 3600 + m, `10.20.1.${m}`, '192.0.2.200', 443);
  // The implant: one machine, every 300 s give or take two seconds.
  for (let t = t0 + 137; t < t0 + span; t += 298 + Math.floor(rnd() * 5)) add(t, '10.20.1.23', '198.51.100.77', 443);
  return out;
}

/* ── 3. password spraying vs brute force ────────────────────────────── */

function sprayData(): SiemEvent[] {
  const rnd = prng(4625);
  const out: SiemEvent[] = [];
  const add = (t: number, code: number, user: string, ip: string, type = 3) =>
    out.push({ _time: t, _raw: `${iso(t)} EventCode=${code} ComputerName=DC01.corp.local Account_Name=${user} Logon_Type=${type} Source_Network_Address=${ip}`, index: 'wineventlog', sourcetype: 'WinEventLog:Security', host: 'DC01', source: 'WinEventLog:Security', EventCode: code, Account_Name: user, Logon_Type: type, Source_Network_Address: ip });
  const users = ['a.qodirov', 'm.rahimova', 'z.yusupova', 'b.ergashev', 'n.saidova', 'o.tursunov', 'k.aminova', 's.aliyeva', 'f.karimov', 'r.nazarov', 'g.olimova', 'u.hasanov', 'l.sobirova', 't.jurayeva', 'h.mavlonova', 'e.xolmatov', 'v.ismoilov', 'p.qurbonova', 'x.normatov', 'y.alimova', 'q.sharipov', 'w.abdullayeva', 'c.raximov', 'i.mirzayev'];
  const t0 = utc('2026-11-17T03:30:00Z');
  // A normal morning: everyone logs on, some mistype once.
  users.forEach((u, i) => {
    const ip = `10.10.10.${30 + i}`;
    const t = t0 + Math.floor(rnd() * 7200);
    if (rnd() < 0.25) add(t - 15, 4625, u, ip);
    add(t, 4624, u, ip);
  });
  // Brute force: one address hammers a single account and never gets in.
  for (let i = 0; i < 60; i++) add(utc('2026-11-17T04:10:00Z') + i * 3, 4625, 'administrator', '198.51.100.31');
  // Spraying: another address tries one or two common passwords against every account, slowly.
  let t = utc('2026-11-17T05:00:00Z');
  for (const round of [0, 1]) {
    for (const u of users) {
      t += 20 + Math.floor(rnd() * 20);
      if (round === 1 && u === 't.jurayeva') add(t, 4624, u, '203.0.113.99');
      else add(t, 4625, u, '203.0.113.99');
    }
  }
  return out;
}

/* ── 4. impossible travel (KQL) ─────────────────────────────────────── */

function travelData(): Row[] {
  const rnd = prng(2026);
  const rows: Row[] = [];
  const users = ['a.qodirov', 'm.rahimova', 'z.yusupova', 'b.ergashev', 'n.saidova', 'o.tursunov', 'k.aminova', 's.aliyeva'];
  const t0 = utc('2026-11-18T03:00:00Z');
  for (const u of users) {
    for (let i = 0; i < 6; i++) {
      const t = t0 + Math.floor(rnd() * 10 * 3600);
      rows.push({ TimeGenerated: t, UserPrincipalName: `${u}@corp.example.uz`, IPAddress: `192.0.2.${10 + users.indexOf(u)}`, Location: 'UZ', City: 'Toshkent', AppDisplayName: 'Office 365 Exchange Online', ResultType: '0' });
    }
  }
  // A travelling employee: Tashkent by day, Istanbul late at night after a flight — possible.
  rows.push({ TimeGenerated: utc('2026-11-18T23:50:00Z'), UserPrincipalName: 'm.rahimova@corp.example.uz', IPAddress: '198.51.100.140', Location: 'TR', City: 'Istanbul', AppDisplayName: 'Office 365 Exchange Online', ResultType: '0' });
  // Not possible: Tashkent at 06:02, and 19 minutes later a successful sign-in from Brazil.
  rows.push({ TimeGenerated: utc('2026-11-18T06:02:00Z'), UserPrincipalName: 'b.ergashev@corp.example.uz', IPAddress: '192.0.2.13', Location: 'UZ', City: 'Toshkent', AppDisplayName: 'Office 365 Exchange Online', ResultType: '0' });
  rows.push({ TimeGenerated: utc('2026-11-18T06:21:00Z'), UserPrincipalName: 'b.ergashev@corp.example.uz', IPAddress: '203.0.113.180', Location: 'BR', City: 'Sao Paulo', AppDisplayName: 'Azure Portal', ResultType: '0' });
  // Failed attempts from abroad do not count as travel.
  rows.push({ TimeGenerated: utc('2026-11-18T07:00:00Z'), UserPrincipalName: 'z.yusupova@corp.example.uz', IPAddress: '203.0.113.181', Location: 'NL', City: 'Amsterdam', AppDisplayName: 'Azure Portal', ResultType: '50126' });
  return rows;
}

export const CTF_SIEM: CtfChallenge[] = [
  {
    id: 'siem-rare',
    title: 'Kam uchraydigan jarayon',
    category: 'loglar',
    level: 2,
    description:
      "12 ta kompyuterning besh kunlik Sysmon jarayon loglari (`index=sysmon`, EventCode 1) SIEM'da. Ulardan birida odatiy dastur nomiga juda o'xshash, lekin begona narsa ishlamoqda. Threat hunting'ning eng oddiy usuli — **kam uchraydigan** qiymatlarni ko'rish.\n\n" +
      'Flag: `flag{fayl_nomi}` — faqat fayl nomi, yo\'lsiz (masalan `flag{notepad.exe}`).',
    hints: ['`index=sysmon | rare limit=5 Image` — eng kam uchraydigan jarayonlar.', "Nomga diqqat bilan qarang: harf o'rnida raqam yo'qmi? Va u qaysi papkadan ishlayapti?"],
    flagHash: '0d80bf51dbf03c',
    panes: ['siem'],
    shell: () => ({ fs: { home: { talaba: {} } }, siem: { now: '2026-11-17T06:00:00Z', indexes: { sysmon: rareProcessData() } } }),
  },
  {
    id: 'siem-beacon',
    title: 'Muntazam qo\'ng\'iroq',
    category: 'loglar',
    level: 2,
    description:
      "Firewall loglarida (`index=firewall`) sakkiz soatlik chiquvchi trafik. Ichki kompyuterlardan biri tashqi serverga **muntazam oraliqda** ulanmoqda — implant beaconing'i. Bir dasturni yangilash xizmati ham muntazam ulanadi, lekin u ko'p kompyuterdan va soatiga bir marta.\n\n" +
      "Flag: `flag{manzil_IP_oraliq}` — oraliq soniyalarda, eng yaqin 10 ga yaxlitlangan (masalan `flag{192.0.2.1_60}`).",
    hints: [
      "Har bir manba–manzil juftligi uchun ulanishlar soni va vaqt oralig'i: `stats count, range(_time) as davr by src_ip, dest_ip`.",
      "O'rtacha oraliq = davr / (count − 1). Ko'p ulanishli juftliklarni qoldiring: `where count > 20`.",
    ],
    flagHash: '0833f440ccf13a',
    panes: ['siem'],
    shell: () => ({ fs: { home: { talaba: {} } }, siem: { now: '2026-11-15T13:00:00Z', indexes: { firewall: beaconData() } } }),
  },
  {
    id: 'siem-spray',
    title: 'Parol purkash',
    category: 'loglar',
    level: 2,
    description:
      "Domen kontrolleri DC01 ning xavfsizlik jurnali (`index=wineventlog`: 4625 — muvaffaqiyatsiz, 4624 — muvaffaqiyatli kirish). Ertalab ikki xil hujum bo'lgan: biri bitta hisobga ko'p marta urinadi (brute force), ikkinchisi har bir hisobga bir-ikki marta, lekin hamma hisoblarga (**password spraying**). Ulardan biri muvaffaqiyatli bo'lgan.\n\n" +
      'Flag: `flag{hisob_nomi}` — hujumchi kirib olgan hisob.',
    hints: [
      "Har bir manba IP uchun nechta urinish va nechta turli hisob: `index=wineventlog EventCode=4625 | stats count, dc(Account_Name) as hisoblar by Source_Network_Address`.",
      'Purkovchi IP topilgach, undan muvaffaqiyatli kirishni qidiring: `EventCode=4624 Source_Network_Address=...`.',
    ],
    flagHash: '0a4d15f6533ff2',
    panes: ['siem'],
    shell: () => ({ fs: { home: { talaba: {} } }, siem: { now: '2026-11-17T08:00:00Z', indexes: { wineventlog: sprayData() } } }),
  },
  {
    id: 'siem-travel',
    title: 'Imkonsiz sayohat',
    category: 'loglar',
    level: 3,
    description:
      "Microsoft Sentinel, **KQL**. `SigninLogs` jadvalida bir kunlik kirishlar (`Location` — mamlakat kodi, `ResultType` — `\"0\"` muvaffaqiyatli). Bir xodim Toshkentdan kirgan va bir soat ham o'tmay boshqa qit'adan **muvaffaqiyatli** kirgan — odam bunchalik tez ucha olmaydi.\n\n" +
      "Flag: `flag{foydalanuvchi}` — UPN ning `@` dan oldingi qismi (masalan `flag{a.qodirov}`).",
    hints: [
      'Faqat muvaffaqiyatli kirishlar: `where ResultType == "0"`. Har bir foydalanuvchi nechta mamlakatdan kirgan: `summarize dcount(Location), make_set(Location) by UserPrincipalName`.',
      "Chet eldan muvaffaqiyatli kirishlarni oling (`Location != \"UZ\"`) va har biri uchun o'sha xodimning Toshkentdagi kirishlariga eng yaqin vaqtni solishtiring. `join kind=inner (...) on UserPrincipalName` va `extend Farq = abs(Chet - Uy)` yordam beradi. Sayohat qilgan xodimni imkonsizidan ajrating.",
    ],
    flagHash: '1f195703c58a8d',
    panes: ['siem'],
    shell: () => ({ fs: { home: { talaba: {} } }, siem: { now: '2026-11-19T00:00:00Z', tables: { SigninLogs: travelData() } } }),
  },
];
