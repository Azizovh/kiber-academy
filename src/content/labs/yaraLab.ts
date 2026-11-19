import type { Lab, LabCheckCtx } from '../types';
import { createShell, execLine } from '../../engine/terminal/shell';
import { getNode } from '../../engine/terminal/fs';
import { fileAt } from './helpers';

/* ── 5. Hunting files with YARA ──────────────────────────────────────── */

const HOME = '/home/talaba';
const SHARE = '/srv/share';

/** UTF-16LE, as Windows programs store "wide" strings. */
const wide = (s: string) => [...s].map((c) => c + '\x00').join('');

/** A minimal PE file: DOS header, stub message, PE signature, then the body. One character is one byte. */
function pe(body: string, pad = 0): string {
  const dos = 'MZ\x90\x00\x03\x00\x00\x00\x04\x00\x00\x00\xff\xff\x00\x00\xb8' + '\x00'.repeat(43) + '\x80\x00\x00\x00';
  const stub = '\x0e\x1f\xba\x0e\x00\xb4\x09\xcd\x21\xb8\x01\x4c\xcd\x21This program cannot be run in DOS mode.\r\r\n$\x00\x00\x00\x00\x00\x00\x00';
  return dos + stub + 'PE\x00\x00\x64\x86\x05\x00' + '\x00'.repeat(16) + '.text\x00\x00\x00' + '\x00'.repeat(24) + body + '\x00'.repeat(pad);
}

const MUTEX = 'Global\\upd-7731';
const RUN = 'Software\\Microsoft\\Windows\\CurrentVersion\\Run';
const implant = (domain: string, version: string) =>
  pe(`\x55\x48\x8b\xec\x48\x83\xec\x20${wide(domain)}\x00\x00${wide('/c')}\x00\x00${wide(MUTEX)}\x00\x00${RUN}\x00Updater\x00Mozilla/5.0 (Windows NT 10.0; Win64; x64) upd/${version}\x00\xe8\x10\x00\x00\x00\xc3`);

const PAYLOAD = implant('update-check.example-cdn.net', '2.1');
const OLD1 = implant('sync.example-cdn.net', '1.4');
const OLD2 = implant('cdn-sync.example', '1.9');
const PUTTY = pe(`PuTTY\x00${wide('PuTTY Configuration')}\x00\x00Software\\SimonTatham\\PuTTY\\Sessions\x00ssh-connection\x00`);
// A real installer also writes to the Run key — the reason a rule on "Run" alone is not enough.
const TEAMS = pe(`${wide('Microsoft Teams')}\x00\x00${RUN}\x00Teams\x00--process-start-args\x00`, 3000);

const zip = (entries: string) => `PK\x03\x04\x14\x00\x06\x00\x08\x00[Content_Types].xml\x00word/document.xml\x00${entries}`;
const PHISH_DOC = zip('word/vbaProject.bin\x00Attribute VB_Name = "ThisDocument"\r\nSub AutoOpen()\r\n  CreateObject("WScript.Shell").Run "powershell -nop -w hidden -enc " & k, 0\r\nEnd Sub\r\n');
// The accounting team's approved template also has an AutoOpen macro and WScript.Shell — but no encoded PowerShell.
const TEMPLATE_DOC = zip('word/vbaProject.bin\x00Attribute VB_Name = "ThisDocument"\r\nSub AutoOpen()\r\n  CreateObject("WScript.Shell").Run "\\\\fs01\\shablonlar\\nomer.bat", 0\r\nEnd Sub\r\n');

const FIRST_YAR = `rule UpdateCheck_C2_Domain
{
    meta:
        author = "SOC"
        description = "WS-BUX-014 payload: C2 domeni"
    strings:
        $c2 = "update-check.example-cdn.net"
    condition:
        any of them
}
`;

const MACRO_YAR = `rule Invoice_Macro_Dropper
{
    meta:
        author = "SOC"
        description = "Hisob-faktura_1147.docm: AutoOpen makrosi kodlangan PowerShell ishga tushiradi"
    strings:
        $auto = "AutoOpen" nocase
        $shell = "WScript.Shell" nocase
        $enc = "-enc" nocase
    condition:
        $auto and $shell
}
`;

const yaraShell = () => ({
  host: 'ir-ws01',
  fs: {
    home: {
      talaba: {
        samples: { 'svchost.exe': PAYLOAD, 'Hisob-faktura_1147.docm': PHISH_DOC, 'README.txt': "WS-BUX-014 dan olingan namunalar. Faqat tahlil uchun — ishga tushirmang.\n" },
        hunt: { 'first.yar': FIRST_YAR, 'macro.yar': MACRO_YAR },
      },
    },
    srv: {
      share: {
        Buxgalteriya: {
          'hisobot_2026.txt': "2026-yil 3-chorak hisoboti\nTushum: ...\n",
          'Hisob-faktura_1147.docm': PHISH_DOC,
          'akt_sverka_noyabr.txt': 'Akt sverka, noyabr 2026\n',
        },
        Shablonlar: { 'hisob_faktura_shablon.docm': TEMPLATE_DOC, 'nomer.bat': '@echo off\r\nset /a N=%1+1\r\necho %N% > \\\\fs01\\shablonlar\\oxirgi.txt\r\n' },
        Umumiy: {
          'xavfsizlik_xabari.txt': "Hurmatli hamkasblar! update-check.example-cdn.net manzilidan kelgan havolalarni ochmang. Hisob-faktura_1147.docm faylini ochgan bo'lsangiz, SOC ga xabar bering.\n",
          'telefonlar.txt': "Buxgalteriya: 101\nIT: 105\nSOC: 112\n",
        },
        IT: {
          tools: { 'putty.exe': PUTTY, 'teams_setup.exe': TEAMS, 'updater.bin': PAYLOAD },
          old: { 'upd_old1.exe': OLD1, 'upd_old2.exe': OLD2 },
          scripts: { 'sccm_check.ps1': '# SCCM agenti holati\npowershell.exe -NoLogo -EncodedCommand RwBlAHQALQBTAGUAcgB2AGkAYwBlACAAQwBjAG0ARQB4AGUAYwA=\n' },
        },
      },
    },
    tmp: {},
  },
  cwd: HOME,
});

// Expected answers, computed by scanning with the lab's own data.
const expectedFor = (rule: string, target: string, recursive = true) => {
  const st = createShell(yaraShell());
  execLine(st, `echo '${rule.replace(/'/g, '')}' > /tmp/x.yar`);
  return execLine(st, `yara ${recursive ? '-r ' : ''}/tmp/x.yar ${target}`).output;
};
const SMALL_PE_COUNT = Number(expectedFor('rule Small_PE { strings: $mz = { 4D 5A } condition: $mz at 0 and filesize < 2KB }', SHARE).split('\n').filter(Boolean).length);
const FAMILY = ['IT/old/upd_old1.exe', 'IT/old/upd_old2.exe', 'IT/tools/updater.bin'].map((f) => `${SHARE}/${f}`).sort();

const yaraLine = (c: LabCheckCtx) => /^yara\b/.test(c.line);
const hits = (output: string) => output.split('\n').filter((l) => /^\w+( \[[^\]]*\])? \S/.test(l) && !l.startsWith('0x')).map((l) => l.split(' ').pop()!);

/** Runs a scan for a check without leaving it in the learner's history. */
function quietScan(c: LabCheckCtx, line: string): string {
  const n = c.state.history.length;
  const out = execLine(c.state, line).output;
  c.state.history.length = n;
  return out;
}

export const yaraHunt: Lab = {
  id: 'aniqlash-yara',
  title: 'YARA: zararli fayllarni ovlash',
  summary: "WS-BUX-014 dan olingan payload va phishing hujjatini strings bilan o'rganish, YARA qoidalarini tuzatish va yozish (wide satrlar, hex, PE sharti, filesize), fayl serverida nusxalar va eski variantlarni topish, false positive'larni yo'qotish.",
  minutes: 75,
  level: 3,
  intro:
    "b2 bosqichidagi YARA darsining amaliyoti. IR jamoasi WS-BUX-014 dan ikkita namuna olgan: `~/samples/svchost.exe` (payload) va `~/samples/Hisob-faktura_1147.docm` (phishing hujjati). Savol: bu fayllar yoki ularning qarindoshlari kompaniya fayl serverida (`/srv/share`) ham bormi?\n\n" +
    "Avval namunalarni **ochmasdan** o'rganasiz (`file`, `strings`), keyin `~/hunt/` dagi YARA qoidalarini tuzatib, yangilarini yozasiz. Qoidani o'zgartirish uchun `sed -i`, yangi qoida uchun `echo '...' > fayl.yar` (YARA qoidasi bitta qatorda ham yozilishi mumkin).\n\n" +
    "Namunalar — o'quv uchun yasalgan, ichida haqiqiy zararli kod yo'q. Haqiqiy namunalar bilan faqat izolyatsiya qilingan laboratoriyada ishlanadi.",
  shell: yaraShell,
  tasks: [
    {
      id: 'file',
      teach: ['file'],
      text: "Kengaytmaga ishonmang: `samples/` dagi ikki namunaning haqiqiy turini aniqlang.",
      hint: '`file samples/svchost.exe samples/Hisob-faktura_1147.docm` — PE (Windows dasturi) va Zip (docm aslida zip arxiv).',
      solution: ['file samples/svchost.exe samples/Hisob-faktura_1147.docm'],
      check: ({ output }) => output.includes('PE32+ executable') && output.includes('Zip archive data'),
    },
    {
      id: 'strings',
      teach: ['strings', 'strings -n'],
      text: "Payload ichida qanday o'qiladigan matnlar bor? Kamida 8 belgilik bo'laklarni chiqaring.",
      hint: "`strings -n 8 samples/svchost.exe` — Run kaliti, `Updater`, User-Agent. Lekin C2 domeni yo'q — nega?",
      solution: ['strings -n 8 samples/svchost.exe'],
      check: ({ output, line }) => line.startsWith('strings') && output.includes('CurrentVersion\\Run') && !output.includes('update-check'),
    },
    {
      id: 'wide',
      teach: ['strings -e'],
      text: 'Windows dasturlari matnni ko\'pincha UTF-16 ("wide": har belgidan keyin `00` bayt) saqlaydi. Wide satrlarni chiqaring.',
      hint: '`strings -e l samples/svchost.exe` — C2 domeni va mutex nomi `Global\\upd-7731`.',
      solution: ['strings -e l samples/svchost.exe'],
      check: ({ output }) => output.includes('update-check.example-cdn.net') && output.includes('Global\\upd-7731'),
    },
    {
      id: 'first',
      teach: ['yara'],
      text: "SOC tayyorlagan birinchi qoidani o'qing (`hunt/first.yar`) va uni payload'ga qarshi ishga tushiring. Natija?",
      hint: '`cat hunt/first.yar`, keyin `yara hunt/first.yar samples/svchost.exe` — hech narsa chiqmaydi: qoida oddiy (ascii) satrni qidiryapti, faylda esa wide.',
      solution: ['cat hunt/first.yar', 'yara hunt/first.yar samples/svchost.exe'],
      check: (c) => yaraLine(c) && c.line.includes('first.yar') && c.output.trim() === '',
    },
    {
      id: 'fix-wide',
      text: "Satrga `wide ascii` modifikatorlarini qo'shing — ikkala ko'rinishda ham qidirsin — va qayta ishga tushiring.",
      hint: "`sed -i 's/\"update-check.example-cdn.net\"/\"update-check.example-cdn.net\" wide ascii/' hunt/first.yar`, keyin `yara hunt/first.yar samples/svchost.exe`",
      solution: ["sed -i 's/\"update-check.example-cdn.net\"/\"update-check.example-cdn.net\" wide ascii/' hunt/first.yar", 'yara hunt/first.yar samples/svchost.exe'],
      check: (c) => yaraLine(c) && c.output.trim() === 'UpdateCheck_C2_Domain samples/svchost.exe',
    },
    {
      id: 'show',
      teach: ['yara -s'],
      text: "Qoida faylning qayerida nimani topdi? Topilgan satrlarni joyi bilan chiqaring.",
      hint: '`yara -s hunt/first.yar samples/svchost.exe` — `0x..:$c2: u\\x00p\\x00d...` — wide satr baytlari.',
      solution: ['yara -s hunt/first.yar samples/svchost.exe'],
      check: ({ output }) => /0x[0-9a-f]+:\$c2: u\\x00p\\x00/.test(output),
    },
    {
      id: 'share',
      teach: ['yara -r'],
      text: "Endi fayl serverini butunlay (ichki kataloglari bilan) tekshiring. Nechta fayl topildi va ularning hammasi zararlimi?",
      hint: '`yara -r hunt/first.yar /srv/share` — IT/tools/updater.bin — payload nusxasi; Umumiy/xavfsizlik_xabari.txt — SOC ning ogohlantirish xati (false positive).',
      solution: ['yara -r hunt/first.yar /srv/share'],
      check: (c) => yaraLine(c) && hits(c.output).sort().join() === [`${SHARE}/IT/tools/updater.bin`, `${SHARE}/Umumiy/xavfsizlik_xabari.txt`].sort().join(),
    },
    {
      id: 'pe-only',
      text: "Xatda domen nomi bo'lishi tabiiy. Qoidani faqat PE fayllarga cheklang: shartni `uint16(0) == 0x5A4D and any of them` qiling (`MZ` — fayl boshidagi ikki bayt, little-endian'da 0x5A4D) va qayta skanerlang.",
      hint: "`sed -i 's/any of them/uint16(0) == 0x5A4D and any of them/' hunt/first.yar`, keyin `yara -r hunt/first.yar /srv/share`",
      solution: ["sed -i 's/any of them/uint16(0) == 0x5A4D and any of them/' hunt/first.yar", 'yara -r hunt/first.yar /srv/share'],
      check: (c) => yaraLine(c) && hits(c.output).join() === `${SHARE}/IT/tools/updater.bin`,
    },
    {
      id: 'meta',
      teach: ['yara -m'],
      text: "Hisobot uchun: qoidaning meta ma'lumotlari bilan natija chiqaring.",
      hint: '`yara -m -r hunt/first.yar /srv/share`',
      solution: ['yara -m -r hunt/first.yar /srv/share'],
      check: ({ output }) => output.includes('author="SOC"') && output.includes('updater.bin'),
    },
    {
      id: 'variants',
      text: "`IT/old/` papkasida ikki eski \"updater\" bor — qoida ularni topmadi. Ulardan birining wide satrlarini ko'ring: domen boshqa, lekin nima o'xshash?",
      hint: '`strings -e l /srv/share/IT/old/upd_old1.exe` — domen `sync.example-cdn.net`, mutex esa o\'sha: `Global\\upd-7731`. Mutex — oilaning barqarorroq belgisi.',
      solution: ['strings -e l /srv/share/IT/old/upd_old1.exe'],
      check: ({ output, line }) => line.includes('upd_old') && output.includes('Global\\upd-7731'),
    },
    {
      id: 'macro-error',
      text: "Ikkinchi qoida — phishing hujjati uchun (`hunt/macro.yar`). Uni namunaga qarshi ishga tushiring. Nima bo'ldi?",
      hint: '`yara hunt/macro.yar samples/Hisob-faktura_1147.docm` — `unreferenced string "$enc"`: YARA ishlatilmagan satrni xato deb hisoblaydi.',
      solution: ['yara hunt/macro.yar samples/Hisob-faktura_1147.docm'],
      check: ({ output }) => output.includes('unreferenced string "$enc"'),
    },
    {
      id: 'macro-fix',
      text: "Shartga `$enc` ni qo'shing: `$auto and $shell and $enc`. Faqat `AutoOpen` + `WScript.Shell` — tasdiqlangan shablonda ham bor.",
      hint: "`sed -i 's/and .shell/and $shell and $enc/' hunt/macro.yar` (nuqta — istalgan belgi, `$` ni naqshda yozmaslik uchun), keyin `yara hunt/macro.yar samples/Hisob-faktura_1147.docm`",
      solution: ["sed -i 's/and .shell/and $shell and $enc/' hunt/macro.yar", 'yara hunt/macro.yar samples/Hisob-faktura_1147.docm'],
      check: (c) => yaraLine(c) && c.output.trim() === 'Invoice_Macro_Dropper samples/Hisob-faktura_1147.docm',
    },
    {
      id: 'macro-share',
      text: "Fayl serverida phishing hujjatining nusxalari bormi? Shablon (o'xshash makrosli, lekin zararsiz) topilmasligi kerak.",
      hint: '`yara -r hunt/macro.yar /srv/share` — Buxgalteriya papkasida nusxa bor: kimdir xatni saqlab qo\'ygan.',
      solution: ['yara -r hunt/macro.yar /srv/share'],
      check: (c) => yaraLine(c) && hits(c.output).join() === `${SHARE}/Buxgalteriya/Hisob-faktura_1147.docm`,
    },
    {
      id: 'both',
      text: "Ikkala qoidani bir vaqtda butun serverga qarshi ishga tushiring.",
      hint: '`yara -r hunt/first.yar hunt/macro.yar /srv/share` — bir nechta qoida fayli ketma-ket yoziladi, oxirgisi — nishon.',
      solution: ['yara -r hunt/first.yar hunt/macro.yar /srv/share'],
      check: ({ output }) => output.includes('UpdateCheck_C2_Domain') && output.includes('Invoice_Macro_Dropper'),
    },
    {
      id: 'hex',
      teach: ['yara -c'],
      text: "Hex satr va `filesize`: `hunt/mz.yar` faylida bitta qatorli qoida yozing — fayl `4D 5A` bilan boshlansin va 2 KB dan kichik bo'lsin. Serverda nechta shunday fayl borligini faqat son bilan chiqaring.",
      hint: "`echo 'rule Small_PE { strings: $mz = { 4D 5A } condition: $mz at 0 and filesize < 2KB }' > hunt/mz.yar`, keyin `yara -c -r hunt/mz.yar /srv/share`",
      solution: ["echo 'rule Small_PE { strings: $mz = { 4D 5A } condition: $mz at 0 and filesize < 2KB }' > hunt/mz.yar", 'yara -c -r hunt/mz.yar /srv/share'],
      check: (c) => yaraLine(c) && c.line.includes('-c') && c.output.trim() === String(SMALL_PE_COUNT),
    },
    {
      id: 'challenge',
      challenge: true,
      text: "Mustaqil vazifa. Butun **oilani** topadigan qoida yozing (`hunt/` ichida yangi `.yar` fayl): PE fayl, wide mutex `Global\\upd-7731` va Run kaliti satri. U serverdagi payload nusxasini va ikkala eski variantni topsin, PuTTY va Teams o'rnatuvchisini esa yo'q. `yara -r` bilan sinang.",
      hint: "Masalan: `rule Upd_Family { strings: $m = \"Global\\\\upd-7731\" wide $r = \"CurrentVersion\\\\Run\" condition: uint16(0) == 0x5A4D and $m and $r }`. YARA satrida teskari chiziq `\\\\` deb yoziladi.",
      solution: ["echo 'rule Upd_Family { strings: $m = \"Global\\\\upd-7731\" wide $r = \"CurrentVersion\\\\Run\" condition: uint16(0) == 0x5A4D and $m and $r }' > hunt/family.yar", 'yara -r hunt/family.yar /srv/share'],
      check: (c) => {
        if (!yaraLine(c)) return false;
        const dir = getNode(c.state.root, `${HOME}/hunt`);
        if (!dir || dir.type !== 'dir') return false;
        const mine = Object.keys(dir.children).filter((f) => f.endsWith('.yar') && !['first.yar', 'macro.yar', 'mz.yar'].includes(f));
        return mine.some((f) => {
          if (!fileAt(c.state, `${HOME}/hunt/${f}`)) return false;
          return hits(quietScan(c, `yara -r ${HOME}/hunt/${f} ${SHARE}`)).sort().join() === FAMILY.join();
        });
      },
    },
  ],
};
