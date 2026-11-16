import { fail, ok, type CustomCommand } from '../../engine/terminal/shell';
import type { Lab } from '../types';
import { fileAt } from './helpers';

const HOME = '/home/talaba';

/* ── auth.log for the grep lab ───────────────────────────────────────── */

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

export const grepAndPipes: Lab = {
  id: 'grep-va-pipe',
  title: 'Log tahlili: grep va pipe',
  summary: "Serverga kim hujum qilganini logdan toping: grep, cut, sort, uniq, wc.",
  minutes: 25,
  level: 2,
  intro:
    "Siz SOC analitigisiz. Server ma'muri tunda g'alati narsa bo'lganini aytdi. `/var/log/auth.log` — SSH orqali kirishga urinishlar jurnali. Vazifangiz: kim hujum qilgani va u ichkariga kira olgan-olmaganini aniqlash.",
  shell: () => ({
    fs: {
      home: { talaba: {} },
      var: { log: { 'auth.log': AUTH_LOG } },
      tmp: {},
    },
  }),
  tasks: [
    {
      id: 'head',
      text: 'Log qanday ko\'rinishda ekanini bilish uchun uning birinchi 5 qatorini chiqaring.',
      hint: '`head -n 5 /var/log/auth.log`',
      solution: ['head -n 5 /var/log/auth.log'],
      check: ({ line, output }) => /\bhead\b/.test(line) && output.split('\n').length === 5,
    },
    {
      id: 'wc',
      text: 'Logda jami nechta qator bor?',
      hint: '`wc -l /var/log/auth.log`',
      solution: ['wc -l /var/log/auth.log'],
      check: ({ output }) => output.trim().startsWith(String(LOG_LINES.length)),
    },
    {
      id: 'grep',
      text: 'Faqat muvaffaqiyatsiz kirish urinishlarini (`Failed password`) ko\'rsating.',
      hint: '`grep "Failed password" /var/log/auth.log`',
      solution: ['grep "Failed password" /var/log/auth.log'],
      check: ({ line, output }) =>
        /\bgrep\b/.test(line) && output.split('\n').length === FAILED_TOTAL && !output.includes('Accepted'),
    },
    {
      id: 'count',
      text: 'Muvaffaqiyatsiz urinishlar sonini sanang.',
      hint: '`grep -c "Failed password" /var/log/auth.log` yoki natijani `| wc -l` ga uzating.',
      solution: ['grep "Failed password" /var/log/auth.log | wc -l'],
      check: ({ output }) => output.trim() === String(FAILED_TOTAL),
    },
    {
      id: 'top-ip',
      text: 'Qaysi IP manzildan eng ko\'p urinish bo\'lgan? Har bir IP necha marta uchraganini kamayish tartibida chiqaring.',
      hint: 'IP — qatordagi 11-so\'z. Zanjir: `grep "Failed password" /var/log/auth.log | cut -d " " -f 11 | sort | uniq -c | sort -rn`',
      solution: ['grep "Failed password" /var/log/auth.log | cut -d " " -f 11 | sort | uniq -c | sort -rn'],
      check: ({ output }) => new RegExp(`^\\s*\\d+\\s+${ATTACKER_IP.replace(/\./g, '\\.')}`).test(output.split('\n')[0] ?? ''),
    },
    {
      id: 'accepted',
      text: 'Eng muhim savol: hujumchi ichkariga kira oldimi? Muvaffaqiyatli kirishlarni (`Accepted`) ko\'ring.',
      hint: '`grep "Accepted" /var/log/auth.log` — hujumchi IP\'si bor qatorga e\'tibor bering.',
      solution: ['grep "Accepted" /var/log/auth.log'],
      check: ({ output }) => output.includes(`Accepted password for deploy from ${ATTACKER_IP}`),
    },
    {
      id: 'evidence',
      text: 'Hujumchi IP\'siga oid barcha qatorlarni dalil sifatida `~/dalil.txt` fayliga saqlang.',
      hint: `\`grep "${ATTACKER_IP}" /var/log/auth.log > ~/dalil.txt\``,
      solution: [`grep "${ATTACKER_IP}" /var/log/auth.log > ~/dalil.txt`],
      check: ({ state }) => {
        const text = fileAt(state, `${HOME}/dalil.txt`) ?? '';
        return text.includes('Accepted password for deploy') && !text.includes('10.0.0.5');
      },
    },
  ],
};

/* ── encodings ───────────────────────────────────────────────────────── */

export const encodings: Lab = {
  id: 'kodlash-terminalda',
  title: 'Terminalda kodlash va dekodlash',
  summary: "Base64, hex va ROT13 ni terminal buyruqlari bilan ochish.",
  minutes: 20,
  level: 1,
  intro:
    "Kodlangan ma'lumot hamma joyda uchraydi: web so'rovlarda, konfiguratsiya fayllarida, zararli skriptlarda. Mutaxassis uni ko'rgan zahoti tanishi va ocha olishi kerak. Esda tuting: **kodlash — shifrlash emas**, uni ochish uchun kalit kerak emas.",
  shell: () => ({
    fs: {
      home: {
        talaba: {
          'xabar.b64': 'QmFzZTY0IC0gYnUgc2hpZnIgZW1hcywga29kbGFzaCE=\n',
          'hex.txt': '706f72742032322d646120535348206973686c61796469\n',
          'sirli.txt': 'Xnyvg fb\'m: EBG13 unz fuvse rznf\n',
          'qatlam.txt': 'NjY2YzYxNjc3YjcxNjE3NDZjNjE2ZDVmNmY2MzY4Njk2YzY0Njk3ZA==\n',
        },
      },
      tmp: {},
    },
  }),
  tasks: [
    {
      id: 'encode',
      text: '`salom` so\'zini Base64 ga kodlang.',
      hint: '`echo salom | base64`',
      solution: ['echo salom | base64'],
      check: ({ output }) => output.trim() === 'c2Fsb20=',
    },
    {
      id: 'decode',
      text: '`xabar.b64` faylidagi Base64 matnni oching.',
      hint: '`base64 -d xabar.b64` (-d = decode).',
      solution: ['base64 -d xabar.b64'],
      check: ({ output }) => output.includes('bu shifr emas'),
    },
    {
      id: 'to-hex',
      text: '`Kali` so\'zining hex (o\'n oltilik) ko\'rinishini chiqaring.',
      hint: '`echo Kali | xxd -p` — har bir harf ikki hex belgiga aylanadi.',
      solution: ['echo Kali | xxd -p'],
      check: ({ output }) => output.trim() === '4b616c69',
    },
    {
      id: 'from-hex',
      text: '`hex.txt` dagi hex yozuvni matnga qaytaring.',
      hint: '`xxd -r -p hex.txt` (-r = reverse).',
      solution: ['xxd -r -p hex.txt'],
      check: ({ output }) => output.includes('port 22-da SSH ishlaydi'),
    },
    {
      id: 'rot13',
      text: '`sirli.txt` ROT13 bilan yozilgan (har harf alifboda 13 qadam surilgan). Uni o\'qing.',
      hint: "`cat sirli.txt | tr 'A-Za-z' 'N-ZA-Mn-za-m'`",
      solution: ["cat sirli.txt | tr 'A-Za-z' 'N-ZA-Mn-za-m'"],
      check: ({ output }) => output.includes('ROT13 ham shifr emas'),
    },
    {
      id: 'layers',
      text: '`qatlam.txt` ikki qavat kodlangan: avval hex, keyin Base64. Ikkalasini ketma-ket ochib, flagni toping.',
      hint: 'Tashqi qavatdan boshlang va natijani keyingisiga uzating: `base64 -d qatlam.txt | xxd -r -p`',
      solution: ['base64 -d qatlam.txt | xxd -r -p'],
      check: ({ output }) => output.includes('flag{qatlam_ochildi}'),
    },
  ],
};

/* ── network recon ───────────────────────────────────────────────────── */

const TARGET = '10.10.10.5';

const WEB: Record<string, string> = {
  '/': `<!DOCTYPE html>
<html>
  <head><title>Ichki portal</title></head>
  <body>
    <h1>Kompaniya ichki portali</h1>
    <p>Kirish faqat xodimlar uchun.</p>
    <!-- TODO: robots.txt ni tekshirib qo'yish kerak, zaxira papkasi ko'rinib qolmasin -->
  </body>
</html>`,
  '/robots.txt': 'User-agent: *\nDisallow: /zaxira/',
  '/zaxira/': `<html><body><h1>Index of /zaxira/</h1>
<a href="eslatma.txt">eslatma.txt</a>
<a href="db-2026.sql.gz">db-2026.sql.gz</a>
</body></html>`,
  '/zaxira/eslatma.txt': "Admin panel vaqtincha /boshqaruv-7731/ manzilida.\nParolni almashtirishni unutmang!\nflag{robots_txt_sir_saqlamaydi}",
};

const ip: CustomCommand = (args) => {
  if (!['a', 'addr', 'address'].includes(args[0] ?? '')) return fail("Bu labda: ip a");
  return `1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536
    inet 127.0.0.1/8 scope host lo
2: eth0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500
    link/ether 08:00:27:4e:66:a1 brd ff:ff:ff:ff:ff:ff
    inet 10.10.10.2/24 brd 10.10.10.255 scope global eth0`;
};

const ping: CustomCommand = (args) => {
  const host = args.filter((a) => !a.startsWith('-') && !/^\d+$/.test(a))[0];
  if (!host) return fail('Ishlatilishi: ping MANZIL');
  const alive = ['10.10.10.1', '10.10.10.2', TARGET, '127.0.0.1'];
  if (!alive.includes(host)) {
    return ok(`PING ${host} (${host}) 56(84) bytes of data.\n\n--- ${host} ping statistics ---\n3 packets transmitted, 0 received, 100% packet loss`);
  }
  const rows = [0.412, 0.388, 0.401].map((t, i) => `64 bytes from ${host}: icmp_seq=${i + 1} ttl=64 time=${t} ms`);
  return ok(`PING ${host} (${host}) 56(84) bytes of data.\n${rows.join('\n')}\n\n--- ${host} ping statistics ---\n3 packets transmitted, 3 received, 0% packet loss`);
};

const nmap: CustomCommand = (args) => {
  const target = args.find((a) => !a.startsWith('-'));
  if (!target) return fail('Ishlatilishi: nmap [-sn] [-sV] NISHON');
  const head = 'Starting Nmap 7.95 ( https://nmap.org )';
  if (args.includes('-sn')) {
    if (!target.startsWith('10.10.10.')) return ok(`${head}\nNmap done: 0 hosts up`);
    return ok(`${head}
Nmap scan report for 10.10.10.1
Host is up (0.00031s latency).
Nmap scan report for 10.10.10.2
Host is up.
Nmap scan report for ${TARGET}
Host is up (0.00040s latency).
Nmap done: 256 IP addresses (3 hosts up) scanned in 2.41 seconds`);
  }
  if (target !== TARGET) {
    return ok(`${head}\nNmap scan report for ${target}\nAll 1000 scanned ports are in ignored states.\nNmap done: 1 IP address (1 host up)`);
  }
  const versions = args.includes('-sV') || args.includes('-A');
  const table = versions
    ? `PORT     STATE SERVICE VERSION
22/tcp   open  ssh     OpenSSH 8.2p1 Ubuntu 4ubuntu0.5
80/tcp   open  http    Apache httpd 2.4.49 ((Unix))
3306/tcp open  mysql   MySQL 5.7.33`
    : `PORT     STATE SERVICE
22/tcp   open  ssh
80/tcp   open  http
3306/tcp open  mysql`;
  return ok(`${head}\nNmap scan report for ${TARGET}\nHost is up (0.00040s latency).\nNot shown: 997 closed tcp ports (reset)\n${table}\n\nNmap done: 1 IP address (1 host up) scanned in ${versions ? '8.73' : '0.52'} seconds`);
};

const curl: CustomCommand = (args) => {
  const url = args.find((a) => !a.startsWith('-'));
  if (!url) return fail('Ishlatilishi: curl URL');
  const m = /^(?:https?:\/\/)?([^/]+)(\/.*)?$/.exec(url);
  if (!m || m[1] !== TARGET) return fail(`curl: (7) Failed to connect to ${m?.[1] ?? url} port 80: Connection refused`);
  const path = m[2] ?? '/';
  const body = WEB[path] ?? WEB[path + '/'];
  if (body === undefined) return ok('<html><body><h1>404 Not Found</h1></body></html>');
  return ok(body);
};

export const networkRecon: Lab = {
  id: 'tarmoq-razvedka',
  title: 'Tarmoq razvedkasi',
  summary: "ip, ping, nmap va curl bilan notanish tarmoqda nishonni topish va o'rganish.",
  minutes: 25,
  level: 2,
  intro:
    "Sizga laboratoriya tarmog'iga ulanish berildi va shu tarmoqdagi serverni tekshirish topshirildi. Bu yerdagi `nmap`, `ping` va `curl` — o'quv simulyatsiyasi: natijalar oldindan tayyorlangan. Haqiqiy hayotda bu buyruqlarni **faqat ruxsat berilgan** tizimlarga nisbatan ishlating.",
  shell: () => ({ fs: { home: { talaba: {} }, tmp: {} } }),
  commands: { ip, ping, nmap, curl },
  tasks: [
    {
      id: 'ip',
      text: 'Avval o\'zingizni aniqlang: kompyuteringizning IP manzili va tarmog\'i qanday?',
      hint: '`ip a` — `inet` qatoriga qarang.',
      solution: ['ip a'],
      check: ({ output }) => output.includes('10.10.10.2/24'),
    },
    {
      id: 'sweep',
      text: 'Tarmog\'ingizda (10.10.10.0/24) qaysi qurilmalar tirik? Portlarni skanerlamasdan, faqat hostlarni aniqlang.',
      hint: '`nmap -sn 10.10.10.0/24` (-sn = ping scan, portlarsiz).',
      solution: ['nmap -sn 10.10.10.0/24'],
      check: ({ output }) => output.includes('3 hosts up'),
    },
    {
      id: 'ping',
      text: `Nishon — ${TARGET}. U javob berishini \`ping\` bilan tekshiring.`,
      hint: `\`ping ${TARGET}\``,
      solution: [`ping ${TARGET}`],
      check: ({ output }) => output.includes(`bytes from ${TARGET}`),
    },
    {
      id: 'ports',
      text: 'Nishonda qaysi portlar ochiq?',
      hint: `\`nmap ${TARGET}\``,
      solution: [`nmap ${TARGET}`],
      check: ({ output }) => output.includes('22/tcp') && output.includes('3306/tcp'),
    },
    {
      id: 'versions',
      text: 'Ochiq portlarda aynan qaysi dastur va versiya ishlayapti?',
      hint: `\`nmap -sV ${TARGET}\` (-sV = service version). Versiya — ma'lum zaifliklarni qidirish kaliti.`,
      solution: [`nmap -sV ${TARGET}`],
      check: ({ output }) => output.includes('Apache httpd 2.4.49'),
    },
    {
      id: 'web',
      text: '80-portda web server bor. Bosh sahifasining kodini oling va diqqat bilan o\'qing.',
      hint: `\`curl http://${TARGET}/\` — HTML izohlariga (<!-- ... -->) e'tibor bering.`,
      solution: [`curl http://${TARGET}/`],
      check: ({ output }) => output.includes('Ichki portal'),
    },
    {
      id: 'robots',
      text: 'Izohda eslatilgan faylni tekshiring.',
      hint: `\`curl http://${TARGET}/robots.txt\``,
      solution: [`curl http://${TARGET}/robots.txt`],
      check: ({ output }) => output.includes('Disallow: /zaxira/'),
    },
    {
      id: 'flag',
      text: '"Yashirilgan" katalogni ochib, ichidagi eslatmani o\'qing.',
      hint: `Avval \`curl http://${TARGET}/zaxira/\`, keyin \`curl http://${TARGET}/zaxira/eslatma.txt\``,
      solution: [`curl http://${TARGET}/zaxira/eslatma.txt`],
      check: ({ output }) => output.includes('flag{robots_txt_sir_saqlamaydi}'),
    },
  ],
};
