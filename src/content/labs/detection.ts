import type { Lab, LabCheckCtx } from '../types';
import { createShell, execLine, type ShellInit } from '../../engine/terminal/shell';
import { getNode } from '../../engine/terminal/fs';
import { fileAt } from './helpers';
import { kql, spl } from './run';
import { buildIncident, encodePs, OFFICE16, PAYLOAD_PATH, PS, VICTIM } from './siemIncident';

const W = String.raw;
const HOME = '/home/talaba';
const DET = `${HOME}/detections`;

/* ── 3. Detection engineering with Sigma ─────────────────────────────── */

const SCCM_CMD = `powershell.exe -NoLogo -NonInteractive -EncodedCommand ${encodePs('Get-CimInstance -Namespace root\\ccm -ClassName SMS_Client | Select-Object ClientVersion')}`;
const TEMPLATE_CMD = 'cmd.exe /c "\\\\fs01\\shablonlar\\nomer.bat" 1147';

const SIGMA_DATA = (() => {
  const d = buildIncident((x) => {
    // An approved macro template on WS-BUX-003 numbers invoices through cmd.exe — the Word rule's false positive.
    for (const [i, t] of ['04:40:10', '05:12:44', '06:03:09'].entries()) x.proc(Date.parse(`2026-11-16T${t}Z`) / 1000 + i, 'WS-BUX-003', 'C:\\Windows\\System32\\cmd.exe', TEMPLATE_CMD, `${OFFICE16}\\WINWORD.EXE`);
    // The SCCM client runs encoded PowerShell on many machines — the encoded-command rule's false positive.
    for (const [i, h] of ['WS-BUX-001', 'WS-BUX-004', 'WS-BUX-007', 'WS-BUX-010', 'WS-HR-005', 'WS-SAV-003', 'WS-DIR-001'].entries()) {
      x.proc(Date.parse('2026-11-16T04:50:00Z') / 1000 + i * 37, h, PS, SCCM_CMD, 'C:\\Windows\\CCM\\CcmExec.exe');
    }
    // An installer adds Teams to the machine Run key — persistence-looking, but not from AppData.
    x.registry(Date.parse('2026-11-16T04:07:00Z') / 1000, 'WS-BUX-005', 'C:\\Windows\\System32\\msiexec.exe', 'HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Run\\Teams', 'C:\\Program Files\\Microsoft\\Teams\\current\\Teams.exe');
  });
  // The Splunk add-on for Sysmon (XML) exposes EventID as well as EventCode; Sigma's sysmon pipeline uses EventID.
  d.indexes.sysmon = d.indexes.sysmon!.map((e) => ({ ...e, EventID: e.EventCode }));
  return d;
})();

const WORD_RULE = W`title: Word ishga tushirgan shell
id: 1d3c5a7e-0b2f-4c6d-8e9f-a1b2c3d4e5f6
status: experimental
description: Microsoft Word PowerShell yoki cmd ni ishga tushirdi - makrosli hujjatning odatiy belgisi
author: SOC jamoasi
date: 2026/11/16
level: high
tags:
  - attack.execution
  - attack.t1204.002
logsource:
  product: windows
  category: process_creation
detection:
  selection:
    ParentImage|endswith: '\WINWORD.EXE'
    Image|endwith:
      - '\powershell.exe'
      - '\cmd.exe'
#  filter_template:
#    CommandLine|contains: 'shablonlar\nomer.bat'
  condition: selection
falsepositives:
  - Tasdiqlangan makrosli shablonlar (\\fs01\shablonlar)
`;

const ENC_RULE = W`title: Kodlangan PowerShell buyrug'i
status: experimental
description: PowerShell -enc / -EncodedCommand bilan ishga tushdi - buyruq matni yashirilgan
author: SOC jamoasi
date: 2026/11/16
tags:
  - attack.execution
  - attack.t1059.001
logsource:
  product: windows
  category: process_creation
detection:
  selection:
    Image|endswith: '\powershell.exe'
    CommandLine|contains:
      - ' -enc '
      - ' -EncodedCommand '
#  filter_sccm:
#    ParentImage|endswith: '\CcmExec.exe'
  condition: selection
falsepositives:
  - SCCM / Intune agentlari
`;

const RUN_RULE = W`title: AppData'dagi dastur Run kalitiga yozildi
id: 9b2e4f61-5d3a-4c7b-8e0f-2a6d1c9e7b43
status: experimental
description: Foydalanuvchi AppData papkasidagi fayl avtomatik ishga tushirishga qo'shildi
author: SOC jamoasi
date: 2026/11/16
level: high
tags:
  - attack.persistence
  - attack.t1547.001
logsource:
  product: windows
  category: registry_set
detection:
  selection:
    TargetObject|contains: '\CurrentVersion\Run\'
    Details|contains: '\AppData\'
  condition: selection
`;

const TEMPLATE = W`title: Payload C2 ga ulanmoqda
id: 3a9d2f6e-7c41-4b8a-9e15-6f0c2d8b4a71
status: experimental
description: AppData ichidagi soxta svchost.exe tashqi serverga 443 port orqali ulanadi
author: SOC jamoasi
date: 2026/11/16
level: high
tags:
  - attack.command-and-control
  - attack.t1071.001
logsource:
  product: windows
  category: CATEGORY
detection:
  selection:
    Image|endswith: 'IMAGE'
    DestinationPort: PORT
  condition: selection
`;

const README = `Aniqlash qoidalari (detection-as-code)
=====================================
rules/      — ishlab chiqarishdagi Sigma qoidalari
templates/  — yangi qoida uchun andoza

Ish tartibi: qoidani o'zgartirish -> sigma check -> sigma convert -> SIEM'da sinash
-> false positive'larni filtr bilan olib tashlash -> qayta sinash.
`;

const sigmaShell = (files: Record<string, string> = {}): ShellInit => ({
  fs: {
    home: {
      talaba: {
        detections: {
          'README.md': README,
          rules: { 'word_spawns_shell.yml': WORD_RULE, 'encoded_powershell.yml': ENC_RULE, 'run_key_persistence.yml': RUN_RULE, ...files },
          templates: { 'network_template.yml': TEMPLATE },
        },
      },
    },
    tmp: {},
  },
  cwd: DET,
  siem: { now: '2026-11-16T08:00:00Z', indexes: SIGMA_DATA.indexes, tables: SIGMA_DATA.tables },
});

// Rule texts after each fix, and their conversions — computed by running the simulator's own sigma.
const WORD_FIXED = WORD_RULE.replace('|endwith:', '|endswith:');
const WORD_TUNED = WORD_FIXED.replace(/^#/gm, '').replace('condition: selection\n', 'condition: selection and not filter_template\n');
const ENC_TUNED = ENC_RULE.replace(/^#/gm, '').replace('condition: selection\n', 'condition: selection and not filter_sccm\n');
function convertWith(file: string, text: string, target = 'splunk'): string {
  const st = createShell(sigmaShell({ [file]: text }));
  return execLine(st, `sigma convert -t ${target} -p ${target === 'splunk' ? 'sysmon' : 'microsoft_xdr'} rules/${file}`).output;
}
const WORD_SPL = convertWith('word_spawns_shell.yml', WORD_FIXED);
const WORD_SPL_TUNED = convertWith('word_spawns_shell.yml', WORD_TUNED);
const WORD_KQL_TUNED = convertWith('word_spawns_shell.yml', WORD_TUNED, 'kusto');
const ENC_SPL = convertWith('encoded_powershell.yml', ENC_RULE);
const ENC_SPL_TUNED = convertWith('encoded_powershell.yml', ENC_TUNED);
const RUN_SPL = convertWith('run_key_persistence.yml', RUN_RULE);

const SY = SIGMA_DATA.indexes.sysmon!;
const BEACON_EVENTS = SY.filter((e) => e.EventCode === 3 && e.Image === PAYLOAD_PATH && e.DestinationPort === 443).length;

/** Runs a command for a check without leaving it in the learner's ↑ history. */
function quiet(c: LabCheckCtx, line: string): string {
  const n = c.state.history.length;
  const out = execLine(c.state, line).output;
  c.state.history.length = n;
  return out;
}

const hosts = (c: LabCheckCtx) => [...new Set((c.siem?.result.rows ?? []).map((r) => String(r.host ?? r.DeviceName)))].sort();
const isSpl = (c: LabCheckCtx) => c.siem?.lang === 'spl' && !c.siem.result.error;
const rule = (c: LabCheckCtx, name: string) => fileAt(c.state, `${DET}/rules/${name}`) ?? '';

export const sigmaLab: Lab = {
  id: 'aniqlash-sigma',
  title: 'Sigma: aniqlash qoidasini yozish, sinash va sozlash',
  summary: "Detection-as-code: Sigma qoidalarini sigma check bilan tekshirish, SPL va KQL'ga o'girish, SIEM'da sinash, false positive'larni filtr bilan olib tashlash va yangi qoida yozish.",
  minutes: 80,
  level: 3,
  panes: ['terminal', 'siem'],
  intro:
    "b2 bosqichidagi aniqlash qoidalari darsining amaliyoti. `~/detections/rules/` da SOC jamoasining uchta Sigma qoidasi bor: Word → shell, kodlangan PowerShell va Run kaliti. Ularni ishlab chiqarishga chiqarishdan oldin tekshirish, sinash va sozlash kerak.\n\n" +
    "Ikki oyna bor: **Terminal** — qoidalar bilan ishlash (`cat`, `sed -i`, `sigma`), **SIEM** — o'girilgan so'rovni WS-BUX-014 insidenti kunining ma'lumotlarida sinash. `sigma convert` chiqargan so'rovni nusxalab, SIEM oynasiga qo'ying.\n\n" +
    "Sigma'ning g'oyasi: qoida bir marta YAML'da yoziladi, keyin istalgan SIEM tiliga o'giriladi. Lekin o'girilgan so'rov ham ma'lumotda sinalmaguncha — faqat taxmin.",
  shell: () => sigmaShell(),
  tasks: [
    {
      id: 'read',
      text: "`rules/word_spawns_shell.yml` qoidasini o'qing: `logsource` (qaysi log), `detection` (nima qidiriladi), `condition` (qanday birlashtiriladi).",
      hint: '`cat rules/word_spawns_shell.yml` — `#` bilan boshlangan qatorlar izoh (o\'chirilgan filtr).',
      solution: ['cat rules/word_spawns_shell.yml'],
      check: ({ line, output }) => /\bcat\b/.test(line) && output.includes('ParentImage|endswith'),
    },
    {
      id: 'check',
      teach: ['sigma', 'sigma check'],
      text: "Hamma qoidalarni `sigma check` bilan tekshiring. Nechta xato va nechta ogohlantirish (issue) bor?",
      hint: '`sigma check rules/` — xato: noma\'lum modifikator; ogohlantirishlar: id va level yo\'q.',
      solution: ['sigma check rules/'],
      check: ({ output }) => output.includes('Unknown modifier endwith') && output.includes('Rule has no level'),
    },
    {
      id: 'fix',
      teach: ['sed -i'],
      text: '`endwith` — xato yozilgan modifikator (`endswith` bo\'lishi kerak). Uni faylning o\'zida tuzating.',
      hint: "`sed -i 's/endwith:/endswith:/' rules/word_spawns_shell.yml`",
      solution: ["sed -i 's/endwith:/endswith:/' rules/word_spawns_shell.yml"],
      check: (c) => rule(c, 'word_spawns_shell.yml').includes('Image|endswith:') && !rule(c, 'word_spawns_shell.yml').includes('endwith:'),
    },
    {
      id: 'check-ok',
      text: 'Tuzatilgan qoidani qayta tekshiring — xato qolmasligi kerak.',
      hint: '`sigma check rules/word_spawns_shell.yml`',
      solution: ['sigma check rules/word_spawns_shell.yml'],
      check: ({ output }) => output.includes('Found 0 errors, 0 condition errors'),
    },
    {
      id: 'no-pipeline',
      teach: ['sigma convert', 'sigma -t'],
      text: "Qoidani Splunk so'roviga o'girib ko'ring: `-t splunk`. Natija qanday?",
      hint: "`sigma convert -t splunk rules/word_spawns_shell.yml` — konveyer (pipeline) so'raladi: Sigma maydonlari qaysi log manbasiga tegishli ekanini bilishi kerak.",
      solution: ['sigma convert -t splunk rules/word_spawns_shell.yml'],
      check: ({ output }) => output.includes('Processing pipeline required'),
    },
    {
      id: 'convert',
      teach: ['sigma -p'],
      text: "Endi `sysmon` konveyeri bilan o'giring. U `logsource.category: process_creation` ni `EventID=1` ga aylantiradi.",
      hint: '`sigma convert -t splunk -p sysmon rules/word_spawns_shell.yml`',
      solution: ['sigma convert -t splunk -p sysmon rules/word_spawns_shell.yml'],
      check: ({ output }) => output.trim() === WORD_SPL,
    },
    {
      id: 'run',
      text: "**SIEM** yorlig'iga o'ting va o'girilgan so'rovni ishga tushiring. Qoida qaysi qurilmalarda ishladi?",
      hint: `So'rovni nusxalang: \`${WORD_SPL}\` — ikki qurilma chiqadi.`,
      solution: [spl(WORD_SPL)],
      check: (c) => isSpl(c) && hosts(c).join(',') === ['WS-BUX-003', VICTIM].sort().join(','),
    },
    {
      id: 'fp',
      teach: ['spl:table'],
      text: "WS-BUX-003 dagi natija haqiqiy hujummi? Xuddi shu so'rovga `| table _time host User CommandLine` qo'shib, buyruq qatorlarini solishtiring.",
      hint: "`... | table _time host User CommandLine` — WS-BUX-003 da `\\\\fs01\\shablonlar\\nomer.bat`: buxgalteriyaning tasdiqlangan hisob-faktura raqamlash makrosi. Bu false positive.",
      solution: [spl(`${WORD_SPL} | table _time host User CommandLine`)],
      check: (c) => isSpl(c) && (c.siem!.result.rows.some((r) => String(r.CommandLine ?? '').includes('shablonlar')) && c.siem!.result.columns.includes('CommandLine')),
    },
    {
      id: 'uncomment',
      text: "Qoidada tayyor filtr izohga olingan (`#filter_template`). Qator boshidagi `#` belgilarini olib tashlang.",
      hint: "`sed -i 's/^#//' rules/word_spawns_shell.yml` — `^#` qator boshidagi # ni bildiradi.",
      solution: ["sed -i 's/^#//' rules/word_spawns_shell.yml"],
      check: (c) => /^ {2}filter_template:/m.test(rule(c, 'word_spawns_shell.yml')),
    },
    {
      id: 'condition',
      text: '`condition` ni `selection and not filter_template` ga o\'zgartiring — filtrga tushgan hodisalar chiqarib tashlansin.',
      hint: "`sed -i 's/condition: selection$/condition: selection and not filter_template/' rules/word_spawns_shell.yml`",
      solution: ["sed -i 's/condition: selection$/condition: selection and not filter_template/' rules/word_spawns_shell.yml"],
      check: (c) => rule(c, 'word_spawns_shell.yml').includes('condition: selection and not filter_template'),
    },
    {
      id: 'reconvert',
      text: "Sozlangan qoidani qayta o'giring. So'rovning oxirida nima qo'shildi?",
      hint: '`sigma convert -t splunk -p sysmon rules/word_spawns_shell.yml` — `NOT CommandLine="*shablonlar\\\\nomer.bat*"`.',
      solution: ['sigma convert -t splunk -p sysmon rules/word_spawns_shell.yml'],
      check: ({ output }) => output.trim() === WORD_SPL_TUNED,
    },
    {
      id: 'rerun',
      text: "Yangi so'rovni SIEM'da sinang. Endi faqat haqiqiy hujum qolishi kerak.",
      hint: `\`${WORD_SPL_TUNED}\``,
      solution: [spl(WORD_SPL_TUNED)],
      check: (c) => isSpl(c) && c.siem!.query.includes('shablonlar') && hosts(c).join(',') === VICTIM,
    },
    {
      id: 'kusto',
      text: "Xuddi shu qoidani Microsoft Defender uchun KQL'ga o'giring: maqsad `kusto`, konveyer `microsoft_xdr`. Maydon nomlari qanday o'zgardi?",
      hint: '`sigma convert -t kusto -p microsoft_xdr rules/word_spawns_shell.yml` — ParentImage → InitiatingProcessFolderPath, Image → FolderPath.',
      solution: ['sigma convert -t kusto -p microsoft_xdr rules/word_spawns_shell.yml'],
      check: ({ output }) => output.trim() === WORD_KQL_TUNED,
    },
    {
      id: 'kusto-run',
      text: "SIEM oynasida **KQL (Sentinel)** tiliga o'tib, o'girilgan so'rovni ishga tushiring (ikki qatorini ham nusxalang).",
      hint: 'Natija: bitta qator, ws-bux-014.',
      solution: [kql(WORD_KQL_TUNED)],
      check: (c) => c.siem?.lang === 'kql' && !c.siem.result.error && hosts(c).join(',') === 'ws-bux-014.corp.local',
    },
    {
      id: 'enc-check',
      text: "Ikkinchi qoida — `encoded_powershell.yml`. Uni alohida tekshiring: qanday ogohlantirishlar bor?",
      hint: '`sigma check rules/encoded_powershell.yml` — id va level yo\'q. Ular qoida xato emasligini, lekin to\'liq emasligini bildiradi.',
      solution: ['sigma check rules/encoded_powershell.yml'],
      check: ({ output }) => output.includes('Rule has no identifier') && output.includes('Found 0 errors'),
    },
    {
      id: 'enc-run',
      text: "Bu qoidani o'girib, SIEM'da `| stats count by host, ParentImage` bilan ishga tushiring. Kim ko'proq: hujummi yoki boshqa narsa?",
      hint: `Avval \`sigma convert -t splunk -p sysmon rules/encoded_powershell.yml\`, keyin SIEM'da: \`${ENC_SPL} | stats count by host, ParentImage\` — CcmExec.exe (SCCM agenti) yetti qurilmada.`,
      solution: ['sigma convert -t splunk -p sysmon rules/encoded_powershell.yml', spl(`${ENC_SPL} | stats count by host, ParentImage`)],
      check: (c) => isSpl(c) && c.siem!.result.rows.some((r) => String(r.ParentImage).endsWith('CcmExec.exe')) && c.siem!.result.rows.some((r) => r.host === VICTIM),
    },
    {
      id: 'enc-tune',
      text: "SCCM — tasdiqlangan boshqaruv agenti. Qoidadagi `filter_sccm` ni izohdan chiqaring va `condition` ni `selection and not filter_sccm` qiling.",
      hint: "Ikki buyruq: `sed -i 's/^#//' rules/encoded_powershell.yml` va `sed -i 's/condition: selection$/condition: selection and not filter_sccm/' rules/encoded_powershell.yml`",
      solution: ["sed -i 's/^#//' rules/encoded_powershell.yml", "sed -i 's/condition: selection$/condition: selection and not filter_sccm/' rules/encoded_powershell.yml"],
      check: (c) => /^ {2}filter_sccm:/m.test(rule(c, 'encoded_powershell.yml')) && rule(c, 'encoded_powershell.yml').includes('condition: selection and not filter_sccm'),
    },
    {
      id: 'enc-rerun',
      text: "Qayta o'girib, SIEM'da sinang. Endi qaysi qurilma qoldi?",
      hint: `\`sigma convert -t splunk -p sysmon rules/encoded_powershell.yml\`, keyin SIEM'da: \`${ENC_SPL_TUNED}\``,
      solution: ['sigma convert -t splunk -p sysmon rules/encoded_powershell.yml', spl(ENC_SPL_TUNED)],
      check: (c) => isSpl(c) && c.siem!.query.includes('CcmExec') && hosts(c).join(',') === VICTIM,
    },
    {
      id: 'enc-meta',
      text: "Ogohlantirishlarni yoping: qoidaga `id` (UUID) va `level` qo'shing (fayl oxiriga yozish yetarli — YAML'da kalitlar tartibi muhim emas), keyin qayta tekshiring.",
      hint: "`echo 'id: 6c0b9e2d-41f7-4a83-b5d6-0e9f8a7c3b12' >> rules/encoded_powershell.yml`, `echo 'level: medium' >> rules/encoded_powershell.yml`, `sigma check rules/encoded_powershell.yml`",
      solution: ["echo 'id: 6c0b9e2d-41f7-4a83-b5d6-0e9f8a7c3b12' >> rules/encoded_powershell.yml", "echo 'level: medium' >> rules/encoded_powershell.yml", 'sigma check rules/encoded_powershell.yml'],
      check: ({ output, line }) => line.includes('encoded_powershell') && output.includes('Found 0 errors, 0 condition errors and 0 issues'),
    },
    {
      id: 'run-key',
      text: "Uchinchi qoida — Run kaliti. O'girib, SIEM'da sinang. Teams o'rnatuvchisining yozuvi nega chiqmadi?",
      hint: `\`sigma convert -t splunk -p sysmon rules/run_key_persistence.yml\`, keyin \`${RUN_SPL}\` — qoida faqat AppData ichidagi dasturlarni qidiradi; Teams Program Files'da.`,
      solution: ['sigma convert -t splunk -p sysmon rules/run_key_persistence.yml', spl(RUN_SPL)],
      check: (c) => isSpl(c) && c.siem!.query.includes('EventID=13') && c.siem!.result.rows.length > 0 && c.siem!.result.rows.every((r) => String(r.TargetObject).endsWith('\\Run\\Updater')),
    },
    {
      id: 'output',
      teach: ['sigma -o'],
      text: "Hamma qoidalarni bitta faylga o'giring (`queries.spl`) va faylni ko'ring — har qoidadan bitta qator.",
      hint: '`sigma convert -t splunk -p sysmon rules/ -o queries.spl`, keyin `cat queries.spl`',
      solution: ['sigma convert -t splunk -p sysmon rules/ -o queries.spl', 'cat queries.spl'],
      check: (c) => (fileAt(c.state, `${DET}/queries.spl`) ?? '').trim().split('\n').length === 3,
    },
    {
      id: 'challenge',
      challenge: true,
      text: "Mustaqil vazifa. `templates/network_template.yml` andozasidan `rules/c2_beacon.yml` qoidasini yarating: AppData'dagi soxta `svchost.exe` ning 443-portga tarmoq ulanishlarini topsin (Sysmon `network_connection`). `sigma check` dan xatosiz o'tsin, o'girib, SIEM'da sinang — natija aynan beacon ulanishlari bo'lsin.",
      hint: "`cp` bilan nusxa oling, keyin `sed -i` bilan CATEGORY → network_connection, IMAGE → `\\AppData\\Roaming\\svchost.exe` (sed'da teskari chiziq ikki marta: `\\\\`), PORT → 443. So'ng `sigma convert -t splunk -p sysmon rules/c2_beacon.yml` va SIEM.",
      solution: [
        'cp templates/network_template.yml rules/c2_beacon.yml',
        "sed -i 's/CATEGORY/network_connection/' rules/c2_beacon.yml",
        "sed -i 's/IMAGE/\\\\AppData\\\\Roaming\\\\svchost.exe/' rules/c2_beacon.yml",
        "sed -i 's/PORT/443/' rules/c2_beacon.yml",
        'sigma check rules/c2_beacon.yml',
        spl('EventID=3 Image="*\\\\AppData\\\\Roaming\\\\svchost.exe" DestinationPort=443'),
      ],
      check: (c) => {
        if (!isSpl(c)) return false;
        const r = c.siem!.result;
        if (r.rows.length !== BEACON_EVENTS || !r.rows.every((e) => e.EventCode === 3 && e.Image === PAYLOAD_PATH)) return false;
        // The search must be what one of the learner's new rules converts to.
        const dir = getNode(c.state.root, `${DET}/rules`);
        if (!dir || dir.type !== 'dir') return false;
        const mine = Object.keys(dir.children).filter((f) => f.endsWith('.yml') && !['word_spawns_shell.yml', 'encoded_powershell.yml', 'run_key_persistence.yml'].includes(f));
        return mine.some((f) => quiet(c, `sigma convert -t splunk -p sysmon ${DET}/rules/${f}`).trim().replace(/\s+/g, ' ') === c.siem!.query.trim().replace(/\s+/g, ' '));
      },
    },
  ],
};
