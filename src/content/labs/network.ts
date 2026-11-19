import type { Lab, LabCheckCtx } from '../types';
import { Capture, httpGet, httpPost, httpResponse, at } from '../../engine/terminal/pcapBuild';
import { decodeCapture, dissect } from '../../engine/terminal/pcap';
import { zeekLogs } from '../../engine/terminal/zeek';
import { fileAt } from './helpers';

/* ── 4. Network detection with Zeek and Suricata ─────────────────────── */

const SENSOR = '/home/talaba/sensor';
const SCAN_IP = '198.51.100.23';
const STUFF_IP = '203.0.113.64';
const QAYD = '203.0.113.20';
const WS = '10.10.20.47';
const C2N = '198.51.100.66';
const C2N_HOST = 'telemetry.example-stats.net';
const DNS_SRV = '10.10.0.2';
const PS_UA = 'Mozilla/5.0 (Windows NT; Windows NT 10.0; uz-UZ) WindowsPowerShell/5.1.22621.4391';
const SCAN_PORTS: [number, boolean][] = [[21, false], [22, true], [23, false], [25, false], [80, true], [110, false], [143, false], [443, true], [445, false], [3306, false], [3389, false], [8080, false]];
const BEACONS = 8;

function edgeCapture(): string {
  const c = new Capture();
  // Office users: DNS, then HTTPS.
  const office: [string, string, string][] = [
    ['10.10.20.31', 'portal.mybank.uz', '192.0.2.44'],
    ['10.10.20.15', 'docs.example.org', '198.51.100.27'],
    ['10.10.20.5', 'mail.example.com', '192.0.2.71'],
  ];
  office.forEach(([ip, host, addr], i) => {
    for (let k = 0; k < 3; k++) {
      const t = at(9, 0, 20 + i * 90 + k * 400);
      c.dns(t, ip, DNS_SRV, host, [addr]);
      c.tls(t + 0.2, ip, 50100 + i * 10 + k, addr, host, [700 + k * 50, 5200 + i * 300]);
    }
  });
  // Ordinary visitors of Qaydnoma.
  const visits: [string, string][] = [['192.0.2.14', '/'], ['192.0.2.31', '/notes'], ['192.0.2.14', '/notes/1042'], ['192.0.2.20', '/']];
  visits.forEach(([ip, path], i) => {
    c.tcp(at(9, 1, i * 70), ip, 50500 + i, QAYD, 80, [{ c: httpGet('qaydnoma.example.com', path), s: httpResponse(200, 'OK', '<html>Qaydnoma</html>') }]);
  });
  // 09:03 — a SYN scan of the web server.
  SCAN_PORTS.forEach(([port, open], i) => c.probe(at(9, 3, i * 0.3), SCAN_IP, 41000 + i, QAYD, port, open));
  // 09:05 — Nikto.
  const nikto: [string, number, string][] = [
    ['/admin', 302, ''],
    ['/wp-admin/', 404, 'Not Found'],
    ['/.env', 404, 'Not Found'],
    ['/backup.zip', 404, 'Not Found'],
    ['/.git/HEAD', 200, 'ref: refs/heads/main\n'],
    ['/.git/config', 200, '[core]\n\trepositoryformatversion = 0\n'],
    ['/phpmyadmin/', 404, 'Not Found'],
    ['/server-status', 404, 'Not Found'],
    ['/config.php.bak', 404, 'Not Found'],
    ['/old/', 404, 'Not Found'],
  ];
  nikto.forEach(([path, code, body], i) =>
    c.tcp(at(9, 5, i * 2), SCAN_IP, 42000 + i, QAYD, 80, [
      { c: httpGet('qaydnoma.example.com', path, 'Mozilla/5.00 (Nikto/2.5.0) (Evasions:None) (Test:007251)'), s: httpResponse(code, code === 200 ? 'OK' : code === 302 ? 'Found' : 'Not Found', body) },
    ]),
  );
  // 09:10 — credential stuffing against /login; the last attempt gets in.
  for (let i = 0; i < 13; i++) {
    const win = i === 12;
    c.tcp(at(9, 10, i * 3), STUFF_IP, 43000 + i, QAYD, 80, [
      { c: httpPost('qaydnoma.example.com', '/login', `username=user${i}&password=Qwerty123`, 'python-requests/2.32.3'), s: win ? httpResponse(302, 'Found', '', 'text/html', ['Location: /notes']) : httpResponse(401, 'Unauthorized', 'Login failed') },
    ]);
  }
  // 09:12 — a workstation fetches a script with PowerShell, then calls home over TLS every minute.
  c.dns(at(9, 12), WS, DNS_SRV, C2N_HOST, [C2N]);
  c.tcp(at(9, 12, 1), WS, 49710, C2N, 80, [{ c: httpGet(C2N_HOST, '/s.ps1', PS_UA), s: httpResponse(200, 'OK', "$u='https://telemetry.example-stats.net/c'; while($true){ Start-Sleep 60 }", 'text/plain') }]);
  for (let i = 0; i < BEACONS; i++) c.tls(at(9, 12, 30 + i * 60), WS, 49720 + i, C2N, C2N_HOST, [380, 240]);
  return c.build();
}

const EDGE = edgeCapture();
const ZEEK = zeekLogs(dissect(decodeCapture(EDGE)!));
const zcol = (path: string, field: string) => {
  const log = ZEEK.find((l) => l.path === path)!;
  const i = log.fields.indexOf(field);
  return log.rows.map((r) => String(r[i] ?? '-'));
};
const REJ_COUNT = zcol('conn', 'conn_state').filter((s) => s === 'REJ').length;
const NIKTO_REQS = zcol('http', 'user_agent').filter((u) => u.includes('Nikto')).length;

const LOCAL_RULES = `# Qaydnoma — mahalliy Suricata qoidalari (SOC jamoasi)
alert http $EXTERNAL_NET any -> $HOME_NET any (msg:"QAYDNOMA Nikto skaneri"; flow:to_server; http.user_agent; contnet:"Nikto"; nocase; classtype:attempted-recon; sid:1000001; rev:1;)
alert http $EXTERNAL_NET any -> $HOME_NET any (msg:"QAYDNOMA .git katalogiga murojaat"; flow:to_server; http.uri; content:"/.git/"; classtype:attempted-recon; sid:1000002; rev:1;)
`;

const SURICATA_YAML = `%YAML 1.1
---
vars:
  address-groups:
    HOME_NET: "[10.10.0.0/16,203.0.113.16/29]"
    EXTERNAL_NET: "!$HOME_NET"
  port-groups:
    HTTP_PORTS: "80"
default-log-dir: /var/log/suricata/
`;

const fast = (c: LabCheckCtx) => fileAt(c.state, `${SENSOR}/out/fast.log`) ?? '';
const rulesText = (c: LabCheckCtx) => fileAt(c.state, `${SENSOR}/rules/local.rules`) ?? '';
/** sids of the active rules in local.rules whose text matches `needle`. */
const sidsWith = (c: LabCheckCtx, needle: RegExp) =>
  rulesText(c)
    .split('\n')
    .filter((l) => !l.trim().startsWith('#') && needle.test(l))
    .map((l) => /sid:\s*(\d+)/.exec(l)?.[1])
    .filter((s): s is string => !!s);
const alertsFor = (c: LabCheckCtx, sids: string[]) => fast(c).split('\n').filter((l) => sids.some((s) => l.includes(`[1:${s}:`)));

const RERUN = 'suricata -r edge.pcap -S rules/local.rules -l out';
const rule = (s: string) => `echo '${s}' >> rules/local.rules`;
const BRUTE = 'alert http $EXTERNAL_NET any -> $HOME_NET any (msg:"QAYDNOMA login brute force"; flow:to_server; http.method; content:"POST"; http.uri; content:"/login"; threshold: type threshold, track by_src, count 5, seconds 60; classtype:attempted-user; sid:1000010; rev:1;)';
const DNS_RULE = 'alert dns $HOME_NET any -> any any (msg:"C2 domen sorovi"; dns.query; content:"example-stats.net"; nocase; endswith; classtype:trojan-activity; sid:1000011; rev:1;)';
const SNI_RULE = 'alert tls $HOME_NET any -> $EXTERNAL_NET any (msg:"C2 TLS SNI"; tls.sni; content:"telemetry.example-stats.net"; nocase; classtype:command-and-control; sid:1000012; rev:1;)';
const SCAN_RULE = 'alert tcp $EXTERNAL_NET any -> $HOME_NET any (msg:"Port skanerlash"; flags:S; threshold: type both, track by_src, count 5, seconds 10; classtype:network-scan; sid:1000013; rev:1;)';
const PS_RULE = 'alert http $HOME_NET any -> $EXTERNAL_NET any (msg:"PowerShell HTTP yuklash"; flow:to_server; http.user_agent; content:"WindowsPowerShell"; nocase; classtype:bad-unknown; sid:1000014; rev:1;)';

export const networkDetection: Lab = {
  id: 'aniqlash-suricata-zeek',
  title: 'Zeek va Suricata: tarmoqda aniqlash',
  summary: "Sensor yozib olgan trafikni Zeek loglariga aylantirib zeek-cut bilan tahlil qilish, so'ng Suricata qoidalarini tuzatish, yozish va sinash: skaner, parol hujumi, C2 domeni, TLS SNI, port skanerlash.",
  minutes: 80,
  level: 3,
  intro:
    "b2 bosqichidagi IDS/IPS darsining amaliyoti. Kompaniya chegarasidagi sensor 2026-yil 17-noyabr, 09:00–09:20 (UTC) oralig'idagi trafikni `~/sensor/edge.pcap` ga yozib olgan. Ichki tarmoq — `10.10.0.0/16`, Qaydnoma serveri — `203.0.113.20` (DMZ `203.0.113.16/29`).\n\n" +
    "Ikki vosita ikki xil savolga javob beradi. **Zeek** — \"nima bo'ldi?\": har bir ulanish, DNS so'rov, HTTP so'rov va TLS sessiyani jadvalga yozadi (`conn.log`, `dns.log`, `http.log`, `ssl.log`). **Suricata** — \"qoidaga mos narsa bo'ldimi?\": siz yozgan imzolar bo'yicha ogohlantiradi.\n\n" +
    "Qoidalar `rules/local.rules` da. Yangi qoida qo'shish: `echo 'alert ...' >> rules/local.rules` — qoida bir qatorda, bitta qo'shtirnoq ichida (shunda `$HOME_NET` o'zgarmay qoladi). Har o'zgarishdan keyin Suricata'ni qayta ishga tushiring.",
  shell: () => ({
    host: 'sensor01',
    fs: {
      home: { talaba: { sensor: { 'edge.pcap': EDGE, rules: { 'local.rules': LOCAL_RULES }, out: {} } } },
      etc: { suricata: { 'suricata.yaml': SURICATA_YAML } },
      var: { log: { suricata: {} } },
      tmp: {},
    },
    cwd: SENSOR,
  }),
  tasks: [
    {
      id: 'zeek',
      teach: ['zeek', 'zeek -r'],
      text: "Trafik faylini Zeek bilan qayta ishlang va qaysi loglar paydo bo'lganini ko'ring.",
      hint: '`zeek -r edge.pcap`, keyin `ls`',
      solution: ['zeek -r edge.pcap', 'ls'],
      check: (c) => !!fileAt(c.state, `${SENSOR}/conn.log`) && /\bls\b/.test(c.line) && c.output.includes('ssl.log'),
    },
    {
      id: 'conn',
      teach: ['zeek-cut', 'zeek-cut USTUN'],
      text: "`conn.log` dan har bir ulanishning manbasi, manzili, porti, xizmati va holatini (`conn_state`) chiqaring.",
      hint: '`cat conn.log | zeek-cut id.orig_h id.resp_h id.resp_p service conn_state`',
      solution: ['cat conn.log | zeek-cut id.orig_h id.resp_h id.resp_p service conn_state'],
      check: ({ line, output }) => line.includes('zeek-cut') && line.includes('conn_state') && /\tSF$/m.test(output),
    },
    {
      id: 'talkers',
      text: "Qaysi manba eng ko'p ulanish ochgan? Birinchi uchtasini kamayish tartibida chiqaring.",
      hint: '`cat conn.log | zeek-cut id.orig_h | sort | uniq -c | sort -rn | head -n 3`',
      solution: ['cat conn.log | zeek-cut id.orig_h | sort | uniq -c | sort -rn | head -n 3'],
      check: ({ output }) => (output.split('\n')[0] ?? '').includes(SCAN_IP),
    },
    {
      id: 'rej',
      text: "`REJ` — server SYN ga RST bilan javob bergan (port yopiq). Bunday ulanishlarni manba va port bilan chiqaring — bu kim?",
      hint: "`cat conn.log | zeek-cut id.orig_h id.resp_p conn_state | grep REJ` — bitta manba, ketma-ket portlar: SYN skaner. `RSTO` — port ochiq, lekin skaner ulanishni o'zi uzgan.",
      solution: ['cat conn.log | zeek-cut id.orig_h id.resp_p conn_state | grep REJ'],
      check: ({ output }) => output.trim().split('\n').filter((l) => l.endsWith('REJ')).length === REJ_COUNT && output.includes(SCAN_IP),
    },
    {
      id: 'dns',
      text: "Ichki qurilmalar qaysi domenlarni so'ragan? Takrorsiz ro'yxat, javoblari bilan.",
      hint: '`cat dns.log | zeek-cut id.orig_h query answers | sort -u`',
      solution: ['cat dns.log | zeek-cut id.orig_h query answers | sort -u'],
      check: ({ output }) => output.includes(C2N_HOST) && output.includes('portal.mybank.uz'),
    },
    {
      id: 'ua',
      text: "HTTP so'rovlarda qanday User-Agent'lar bor? Har biri necha marta?",
      hint: '`cat http.log | zeek-cut user_agent | sort | uniq -c | sort -rn` — Nikto (skaner), python-requests (parol hujumi) va WindowsPowerShell.',
      solution: ['cat http.log | zeek-cut user_agent | sort | uniq -c | sort -rn'],
      check: ({ output }) => output.includes('WindowsPowerShell') && output.includes('Nikto') && output.includes('python-requests'),
    },
    {
      id: 'ps-download',
      teach: ['zeek-cut -d'],
      text: "PowerShell nimani yuklab olgan? `http.log` dan vaqtni o'qiladigan ko'rinishda, manba, host, URI va status bilan chiqaring va PowerShell qatorini ajrating.",
      hint: '`cat http.log | zeek-cut -d ts id.orig_h host uri status_code user_agent | grep PowerShell`',
      solution: ['cat http.log | zeek-cut -d ts id.orig_h host uri status_code user_agent | grep PowerShell'],
      check: ({ output }) => output.includes('/s.ps1') && output.includes('2026-11-17T09:12'),
    },
    {
      id: 'sni',
      text: "Shifrlangan trafik ham iz qoldiradi: TLS ClientHello'dagi SNI. `ssl.log` da qaysi server nomlari necha marta uchraydi?",
      hint: '`cat ssl.log | zeek-cut server_name | sort | uniq -c | sort -rn`',
      solution: ['cat ssl.log | zeek-cut server_name | sort | uniq -c | sort -rn'],
      check: ({ output }) => new RegExp(`^\\s*${BEACONS} ${C2N_HOST.replace(/\./g, '\\.')}$`, 'm').test(output),
    },
    {
      id: 'timing',
      text: `\`${C2N_HOST}\` ga ulanishlar vaqtini chiqaring. Qanday qonuniyat bor?`,
      hint: '`cat ssl.log | zeek-cut -d ts id.orig_h server_name | grep telemetry` — har 60 soniyada: beaconing.',
      solution: ['cat ssl.log | zeek-cut -d ts id.orig_h server_name | grep telemetry'],
      check: ({ output }) => output.trim().split('\n').filter((l) => l.includes(C2N_HOST)).length === BEACONS && output.includes('T09:'),
    },
    {
      id: 'rules',
      text: "Endi Suricata. Avval SOC jamoasining mavjud qoidalarini o'qing.",
      hint: '`cat rules/local.rules` — sarlavha (harakat, protokol, manba -> manzil) va qavs ichidagi parametrlar.',
      solution: ['cat rules/local.rules'],
      check: ({ line, output }) => /\bcat\b/.test(line) && output.includes('sid:1000002'),
    },
    {
      id: 'test',
      teach: ['suricata', 'suricata -T', 'suricata -S'],
      text: "Qoidalarni trafiksiz tekshiring (`-T`). Ular yuklanadimi?",
      hint: "`suricata -T -S rules/local.rules` — `unknown rule keyword 'contnet'`: bitta imlo xatosi butun qoidani o'chiradi.",
      solution: ['suricata -T -S rules/local.rules'],
      check: ({ output }) => output.includes("unknown rule keyword 'contnet'"),
    },
    {
      id: 'fix',
      text: 'Xatoni tuzating va qayta tekshiring — 2 ta qoida yuklanishi kerak.',
      hint: "`sed -i 's/contnet/content/' rules/local.rules`, keyin `suricata -T -S rules/local.rules`",
      solution: ["sed -i 's/contnet/content/' rules/local.rules", 'suricata -T -S rules/local.rules'],
      check: ({ output }) => output.includes('2 rules successfully loaded, 0 rules failed'),
    },
    {
      id: 'run',
      teach: ['suricata -r', 'suricata -l'],
      text: 'Qoidalarni trafikda ishga tushiring, loglarni `out` katalogiga yozing.',
      hint: `\`${RERUN}\``,
      solution: [RERUN],
      check: (c) => alertsFor(c, ['1000001']).length === NIKTO_REQS,
    },
    {
      id: 'fast',
      text: "`out/fast.log` ni o'qing: har ogohlantirishda vaqt, `[1:SID:REV]`, xabar, sinf va yo'nalish.",
      hint: '`cat out/fast.log`',
      solution: ['cat out/fast.log'],
      check: ({ line, output }) => line.includes('fast.log') && output.includes('[1:1000002:1]'),
    },
    {
      id: 'eve',
      teach: ['jq -r'],
      text: "`eve.json` — har ogohlantirish JSON'da, SIEM'ga yuborish uchun. Qaysi qoida necha marta ishlaganini `jq` bilan sanang.",
      hint: "`jq -r '.alert.signature' out/eve.json | sort | uniq -c`",
      solution: ["jq -r '.alert.signature' out/eve.json | sort | uniq -c"],
      check: ({ output }) => output.includes('QAYDNOMA Nikto skaneri') && output.includes('QAYDNOMA .git'),
    },
    {
      id: 'brute',
      text: "Yangi qoida: bitta manbadan `/login` ga 60 soniyada 5 tadan ko'p POST — parol hujumi. `threshold` bilan yozing (sid 1000010), faylga qo'shing va Suricata'ni qayta ishga tushiring.",
      hint: `\`${rule(BRUTE)}\`, keyin \`${RERUN}\``,
      solution: [rule(BRUTE), RERUN],
      check: (c) => {
        const sids = sidsWith(c, /threshold/);
        return sids.length > 0 && alertsFor(c, sids).some((l) => l.includes(`${STUFF_IP}:`));
      },
    },
    {
      id: 'dns-rule',
      text: "C2 domeni so'ralganda ogohlantirish: `dns.query` buferida `example-stats.net` (sid 1000011).",
      hint: `\`${rule(DNS_RULE)}\`, keyin \`${RERUN}\``,
      solution: [rule(DNS_RULE), RERUN],
      check: (c) => {
        const sids = sidsWith(c, /dns\.query/);
        return sids.length > 0 && alertsFor(c, sids).some((l) => l.includes('{UDP}') && l.includes(`-> ${DNS_SRV}:53`));
      },
    },
    {
      id: 'sni-rule',
      text: "Shifrlangan beacon'larni ham ushlang: `tls.sni` buferida `telemetry.example-stats.net` (sid 1000012). Nechta ogohlantirish chiqdi?",
      hint: `\`${rule(SNI_RULE)}\`, keyin \`${RERUN}\` — har beacon uchun bittadan.`,
      solution: [rule(SNI_RULE), RERUN],
      check: (c) => {
        const sids = sidsWith(c, /tls\.sni/);
        return sids.length > 0 && alertsFor(c, sids).filter((l) => l.includes(`-> ${C2N}:443`)).length === BEACONS;
      },
    },
    {
      id: 'scan-rule',
      text: "Port skanerlash: bitta manbadan 10 soniyada 5 tadan ko'p **faqat SYN** paket (`flags:S`). `threshold: type both` — oynada bitta ogohlantirish (sid 1000013).",
      hint: `\`${rule(SCAN_RULE)}\`, keyin \`${RERUN}\``,
      solution: [rule(SCAN_RULE), RERUN],
      check: (c) => {
        const sids = sidsWith(c, /flags:\s*S/);
        return sids.length > 0 && alertsFor(c, sids).some((l) => l.includes(`${SCAN_IP}:`));
      },
    },
    {
      id: 'challenge',
      challenge: true,
      text: "Mustaqil vazifa. Ichki tarmoqdan tashqariga **PowerShell User-Agent'i** bilan HTTP so'rov — skript yuklab olishning belgisi. Shunday qoida yozing (o'z sid'ingiz bilan), Suricata'ni qayta ishga tushiring: u `s.ps1` yuklab olinishini ushlasin.",
      hint: 'Sarlavha: `alert http $HOME_NET any -> $EXTERNAL_NET any`; parametrlar: `flow:to_server; http.user_agent; content:"WindowsPowerShell"; nocase; sid:...;`',
      solution: [rule(PS_RULE), RERUN],
      check: (c) => {
        const sids = sidsWith(c, /http\.user_agent|http_user_agent/).filter((s) => s !== '1000001');
        return sids.length > 0 && alertsFor(c, sids).some((l) => l.includes(`${WS}:`) && l.includes(`-> ${C2N}:80`));
      },
    },
  ],
};
