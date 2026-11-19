import type { CtfChallenge } from './types';

/*
 * Windows challenges: four in a PowerShell terminal, one to read. Flags are stored as hashes; plain answers and the
 * scripted solutions live in content.test.ts.
 */

const BIG = (head: string, n: number) => head + 'x'.repeat(n) + '\n';

const baseProcs = [
  { id: 4, name: 'System', user: 'NT AUTHORITY\\SYSTEM', si: 0, ws: 0.14, cpu: 120.4 },
  { id: 640, name: 'services', path: 'C:\\Windows\\System32\\services.exe', user: 'NT AUTHORITY\\SYSTEM', si: 0, ws: 9.8, cpu: 12.1 },
  { id: 688, name: 'lsass', path: 'C:\\Windows\\System32\\lsass.exe', user: 'NT AUTHORITY\\SYSTEM', si: 0, ws: 21.6, cpu: 9.2 },
];

const NEW_ADMIN_EVENTS = [
  { TimeCreated: '2026-11-18T01:02:11Z', EventID: 4624, TargetUserName: 'svc_print', LogonType: 10, IpAddress: '203.0.113.90' },
  { TimeCreated: '2026-11-18T01:04:37Z', EventID: 4720, SubjectUserName: 'svc_print', TargetUserName: 'itsupport2' },
  { TimeCreated: '2026-11-18T01:04:52Z', EventID: 4732, SubjectUserName: 'svc_print', MemberName: 'itsupport2', TargetUserName: 'Administrators' },
  { TimeCreated: '2026-11-18T01:05:20Z', EventID: 4720, SubjectUserName: 'svc_print', TargetUserName: 'printtest' },
  { TimeCreated: '2026-11-18T01:05:41Z', EventID: 4732, SubjectUserName: 'svc_print', MemberName: 'printtest', TargetUserName: 'Remote Desktop Users' },
  { TimeCreated: '2026-11-18T01:09:03Z', EventID: 4634, TargetUserName: 'svc_print', LogonType: 10 },
]
  .map((e) => JSON.stringify(e))
  .join('\n');

export const CTF_WINDOWS: CtfChallenge[] = [
  {
    id: 'win-hidden',
    title: 'Yashirin belgisi',
    category: 'windows',
    level: 1,
    description:
      "Windows'da yashirin fayl nomi nuqta bilan boshlanmaydi — unga **Hidden** belgisi qo'yiladi va oddiy `Get-ChildItem` uni ko'rsatmaydi. Uy papkangizning qayerdadir shunday fayl bor, flag uning ichida.",
    hints: [
      '`Get-ChildItem -Force` — yashirinlarni ham ko\'rsatadi. Mode ustunida `h`.',
      'Ichki papkalar ham: `Get-ChildItem -Recurse -Force -File`. Faqat yashirinlar uchun: `-Hidden`.',
      'Topgach: `Get-Content YO\'L`',
    ],
    flagHash: '0f5532641a28a5',
    shell: () => ({
      user: 'talaba',
      fs: {
        Users: {
          talaba: {
            Desktop: { 'salom.txt': 'Bu yerda flag yo\'q.\n' },
            Documents: { 'reja.txt': 'dushanba: hisobot\n' },
            AppData: { Roaming: { Kesh: { 'eslatma.txt': 'flag{hidden_atributi}\n' } }, Local: {} },
          },
        },
        Windows: { System32: {} },
      },
      windows: { computer: 'WS-CTF-01', elevated: false, hidden: ['C:\\Users\\talaba\\AppData', 'C:\\Users\\talaba\\AppData\\Roaming\\Kesh\\eslatma.txt'] },
    }),
  },
  {
    id: 'win-runkey',
    title: 'Kirishda ishga tushadi',
    category: 'windows',
    level: 2,
    description:
      "Foydalanuvchi har safar tizimga kirganda begona dastur ishga tushmoqda. Avtomatik ishga tushish joylaridan birida (registrdagi **Run** kalitlari) u qayd etilgan. Shu dastur faylining nomini toping.\n\nFlag formati: `flag{fayl.exe}`",
    hints: [
      'Ikkita asosiy joy: `HKLM:\\Software\\Microsoft\\Windows\\CurrentVersion\\Run` (hamma uchun) va `HKCU:\\...\\Run` (joriy foydalanuvchi).',
      '`Get-ItemProperty HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Run`',
      "Qonuniy dasturlar Program Files'dan ishlaydi; Temp papkasidan ishlaydigani shubhali.",
    ],
    flagHash: '1ff2d56190bafb',
    shell: () => ({
      user: 'talaba',
      fs: {
        Users: { talaba: { AppData: { Local: { Temp: { 'edgeupd.exe': BIG('MZ', 900) }, Microsoft: { OneDrive: { 'OneDrive.exe': BIG('MZ', 1200) } } } } } },
        'Program Files': { 'Microsoft OneDrive': {} },
      },
      windows: {
        computer: 'WS-CTF-02',
        elevated: false,
        hidden: ['C:\\Users\\talaba\\AppData'],
        registry: {
          'HKLM:\\Software\\Microsoft\\Windows\\CurrentVersion\\Run': { SecurityHealth: 'C:\\Windows\\System32\\SecurityHealthSystray.exe' },
          'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Run': {
            OneDrive: '"C:\\Users\\talaba\\AppData\\Local\\Microsoft\\OneDrive\\OneDrive.exe" /background',
            EdgeUpdateCore: 'C:\\Users\\talaba\\AppData\\Local\\Temp\\edgeupd.exe --silent',
          },
        },
      },
    }),
  },
  {
    id: 'win-encoded',
    title: 'Kodlangan vazifa',
    category: 'windows',
    level: 2,
    description:
      "Rejalashtirilgan vazifalar orasida PowerShell'ni yashirin oynada, kodlangan buyruq bilan ishga tushiradigan bittasi bor. Buyruqni oching — flag o'sha yerda.",
    hints: [
      "Ildiz papkadagi vazifalar: `Get-ScheduledTask -TaskPath '\\'`. Vazifa nimani bajarishi: `(Get-ScheduledTask -TaskName NOM).Actions`",
      '`-enc` dan keyingi satr — Base64, ichida UTF-16 (Unicode) matn.',
      "`[System.Text.Encoding]::Unicode.GetString([Convert]::FromBase64String('SATR'))`",
    ],
    flagHash: '0f8d797b4854ca',
    shell: () => ({
      user: 'admin',
      fs: { Users: { admin: {} } },
      windows: {
        computer: 'SRV-CTF-03',
        tasks: [
          { path: '\\', name: 'GoogleUpdateTaskMachine', state: 'Ready', execute: 'C:\\Program Files (x86)\\Google\\Update\\GoogleUpdate.exe', arguments: '/c', author: 'Google LLC' },
          {
            path: '\\',
            name: 'WindowsTelemetry',
            state: 'Ready',
            execute: 'powershell.exe',
            arguments: '-NoProfile -w hidden -enc VwByAGkAdABlAC0ATwB1AHQAcAB1AHQAIAAnAGYAbABhAGcAewBrAG8AZABsAGEAbgBnAGEAbgBfAGIAdQB5AHIAdQBxAF8AbwBjAGgAaQBsAGQAaQB9ACcA',
            author: 'SRV-CTF-03\\backup',
          },
          { path: '\\Microsoft\\Windows\\Defrag\\', name: 'ScheduledDefrag', state: 'Ready', execute: '%windir%\\system32\\defrag.exe', arguments: '-c -h -o -$' },
        ],
      },
    }),
  },
  {
    id: 'win-new-admin',
    title: 'Yangi administrator',
    category: 'windows',
    level: 1,
    description:
      "SIEM'dan kechasi bo'lgan hodisalar keldi (har qatorda bitta JSON). Hujumchi ikkita akkaunt yaratgan, lekin faqat bittasini **Administrators** guruhiga qo'shgan. Shu akkaunt nomini toping.\n\nFlag formati: `flag{akkaunt}`",
    data: NEW_ADMIN_EVENTS,
    hints: [
      '4720 — akkaunt yaratildi, 4732 — xavfsizlik guruhiga a\'zo qo\'shildi.',
      "4732 da `MemberName` — kim qo'shildi, `TargetUserName` — qaysi guruhga.",
    ],
    flagHash: '089ac80b78d951',
  },
  {
    id: 'win-c2',
    title: 'Kim bilan gaplashyapti?',
    category: 'windows',
    level: 3,
    description:
      "Serverdan tashqi manzilga doimiy ulanish bor. Uni ochgan jarayonni toping, jarayon qaysi fayldan ishga tushganini aniqlang va shu faylning SHA256 xeshini oling.\n\nFlag formati: `flag{xeshning_birinchi_8_belgisi}` — masalan `flag{1a2b3c4d}` (kichik harf bilan ham bo'ladi).",
    hints: [
      '`Get-NetTCPConnection -State Established` — ichki tarmoq (10.x) emas, tashqi manzilni qidiring. OwningProcess — PID.',
      "`Get-Process -Id PID | Select-Object Name, Path` — nomi tanish, lekin yo'li g'alati.",
      '`Get-FileHash YO\'L` — Hash ustunining birinchi 8 belgisi.',
    ],
    flagHash: '071e323a400c27',
    shell: () => ({
      user: 'admin',
      fs: {
        Users: { admin: {}, Public: { Libraries: { 'svchost.exe': 'MZ fake svchost (lab sample 7731)\n' } } },
        Windows: { System32: { 'svchost.exe': 'MZ Microsoft svchost (genuine)\n' } },
      },
      windows: {
        computer: 'SRV-CTF-05',
        ip: '10.10.20.40',
        processes: [
          ...baseProcs,
          { id: 812, name: 'svchost', path: 'C:\\Windows\\System32\\svchost.exe', commandLine: 'C:\\Windows\\system32\\svchost.exe -k DcomLaunch -p', parentId: 640, user: 'NT AUTHORITY\\SYSTEM', si: 0, ws: 27.3, cpu: 31.7 },
          { id: 948, name: 'svchost', path: 'C:\\Windows\\System32\\svchost.exe', commandLine: 'C:\\Windows\\system32\\svchost.exe -k RPCSS -p', parentId: 640, user: 'NT AUTHORITY\\NETWORK SERVICE', si: 0, ws: 14.1, cpu: 9.8 },
          { id: 5512, name: 'svchost', path: 'C:\\Users\\Public\\Libraries\\svchost.exe', commandLine: 'C:\\Users\\Public\\Libraries\\svchost.exe -k netsvcs', parentId: 4980, user: 'SRV-CTF-05\\admin', si: 1, ws: 6.2, cpu: 210.9 },
        ],
        connections: [
          { localAddress: '0.0.0.0', localPort: 135, remoteAddress: '0.0.0.0', remotePort: 0, state: 'Listen', pid: 948 },
          { localAddress: '0.0.0.0', localPort: 445, remoteAddress: '0.0.0.0', remotePort: 0, state: 'Listen', pid: 4 },
          { localAddress: '10.10.20.40', localPort: 445, remoteAddress: '10.10.20.31', remotePort: 50321, state: 'Established', pid: 4 },
          { localAddress: '10.10.20.40', localPort: 51877, remoteAddress: '192.0.2.77', remotePort: 8443, state: 'Established', pid: 5512 },
        ],
      },
    }),
  },
];
