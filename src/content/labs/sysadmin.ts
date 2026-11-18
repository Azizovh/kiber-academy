import { dir, file } from '../../engine/terminal/fs';
import type { CmdCtx } from '../../engine/terminal/shell';
import { sha256Hex } from '../../engine/terminal/text';
import type { Lab } from '../types';
import { fileAt, modeAt, nodeAt } from './helpers';

const HOME = '/home/talaba';

/* ── 1. Processes and services ─────────────────────────────────────────── */

const NGINX_SITE = '/etc/nginx/sites-enabled/qaydnoma';

const nginxSite = (typo: boolean) =>
  [
    'server {',
    '    listen 80;',
    `    ${typo ? 'sever_name' : 'server_name'} qaydnoma.example.com;`,
    '    location / {',
    '        proxy_pass http://127.0.0.1:8000;',
    '    }',
    '}',
    '',
  ].join('\n');

const nginxConfigProblem = (ctx: CmdCtx): string[] | null =>
  (fileAt(ctx.state, NGINX_SITE) ?? '').includes('sever_name')
    ? [`Nov 18 10:15:02 srv01 nginx[3311]: nginx: [emerg] unknown directive "sever_name" in ${NGINX_SITE}:3`]
    : null;

export const processesAndServices: Lab = {
  id: 'jarayonlar-va-xizmatlar',
  title: 'Jarayonlar va xizmatlar',
  summary: "ps, ss, systemctl va journalctl bilan sekinlashgan serverni tekshirish va ishdan chiqqan xizmatni tiklash.",
  minutes: 35,
  level: 2,
  intro:
    "Qaydnoma serveri `srv01` dan shikoyat: sayt ochilmayapti, server esa juda sekin. Siz — navbatchi tizim ma'muri. Avval nima ishlayotganini ko'ring, keyin begona jarayonni toping va to'xtating, oxirida veb-serverni qayta ishga tushiring.\n\n" +
    "Haqiqiy insidentda begona jarayonni o'chirishdan **oldin** dalillarni saqlash kerak (b3 bosqichi: xotira, fayllar, vaqt chizig'i) va SOC'ga xabar beriladi. Bu lab — buyruqlarni o'rganish uchun.",
  shell: () => ({
    host: 'srv01',
    fs: {
      home: { talaba: {} },
      etc: {
        nginx: { 'sites-enabled': { qaydnoma: nginxSite(true) } },
        hostname: 'srv01\n',
      },
      tmp: {
        '.x': dir(
          {
            kworkerds: file('ELF 64-bit LSB executable, stripped\n', 0o755, 'www-data'),
            'config.json': file('{\n  "pool": "pool.example.net:3333",\n  "threads": 4,\n  "background": true\n}\n', 0o644, 'www-data'),
          },
          0o755,
          'www-data',
        ),
      },
      var: { log: {} },
    },
    system: {
      procs: [
        { pid: 1, ppid: 0, user: 'root', cmd: '/sbin/init', mem: 0.3, start: 'Nov16' },
        { pid: 412, ppid: 1, user: 'root', cmd: '/usr/sbin/sshd -D', mem: 0.2, start: 'Nov16' },
        { pid: 640, ppid: 1, user: 'qaydnoma', cmd: '/srv/qaydnoma/venv/bin/gunicorn app:app -b 127.0.0.1:8000', cpu: 0.4, mem: 2.1, start: 'Nov16' },
        { pid: 655, ppid: 1, user: 'postgres', cmd: '/usr/lib/postgresql/16/bin/postgres -D /var/lib/postgresql/16/main', cpu: 0.2, mem: 3.4, start: 'Nov16' },
        { pid: 2231, ppid: 1, user: 'www-data', cmd: '/tmp/.x/kworkerds -c /tmp/.x/config.json', cpu: 97.8, mem: 6.2, start: '03:12' },
        { pid: 2240, ppid: 1, user: 'talaba', cmd: '-bash', mem: 0.1, start: '10:02' },
      ],
      services: [
        { name: 'ssh', description: 'OpenBSD Secure Shell server', active: 'active', enabled: true, pid: 412, exec: '/usr/sbin/sshd -D', listen: [{ proto: 'tcp', local: '0.0.0.0:22' }] },
        { name: 'qaydnoma', description: 'Qaydnoma web application (gunicorn)', active: 'active', enabled: true, pid: 640, exec: '/srv/qaydnoma/venv/bin/gunicorn app:app -b 127.0.0.1:8000', user: 'qaydnoma' },
        { name: 'postgresql', description: 'PostgreSQL RDBMS', active: 'active', enabled: true, pid: 655, exec: '/usr/lib/postgresql/16/bin/postgres', user: 'postgres' },
        {
          name: 'nginx',
          description: 'A high performance web server and a reverse proxy server',
          active: 'failed',
          enabled: true,
          exec: 'nginx: master process /usr/sbin/nginx -g daemon on; master_process on;',
          journal: [
            'Nov 18 09:58:40 srv01 systemd[1]: Starting A high performance web server and a reverse proxy server...',
            `Nov 18 09:58:40 srv01 nginx[2302]: nginx: [emerg] unknown directive "sever_name" in ${NGINX_SITE}:3`,
            'Nov 18 09:58:40 srv01 nginx[2302]: nginx: configuration file /etc/nginx/nginx.conf test failed',
            "Nov 18 09:58:40 srv01 systemd[1]: nginx.service: Control process exited, code=exited, status=1/FAILURE",
            'Nov 18 09:58:40 srv01 systemd[1]: Failed to start A high performance web server and a reverse proxy server.',
          ],
          startCheck: nginxConfigProblem,
          listen: [{ proto: 'tcp', local: '0.0.0.0:80' }],
        },
        {
          name: 'update-checker',
          description: 'System update checker',
          active: 'active',
          enabled: true,
          pid: 2231,
          exec: '/tmp/.x/kworkerds -c /tmp/.x/config.json',
          user: 'www-data',
          unitPath: '/etc/systemd/system/update-checker.service',
        },
      ],
      sockets: [
        { proto: 'tcp', local: '0.0.0.0:22', pid: 412 },
        { proto: 'tcp', local: '127.0.0.1:8000', pid: 640 },
        { proto: 'tcp', local: '127.0.0.1:5432', pid: 655 },
        { proto: 'tcp', local: '0.0.0.0:4444', pid: 2231 },
      ],
    },
  }),
  tasks: [
    {
      id: 'ps',
      text: 'Serverda ishlayotgan barcha jarayonlarni (hamma foydalanuvchilarniki) CPU va xotira bilan ko\'ring.',
      hint: '`ps aux` — a: hamma foydalanuvchilar, u: batafsil, x: terminalsiz jarayonlar ham.',
      solution: ['ps aux'],
      check: ({ line, output }) => /^ps\b/.test(line) && output.includes('%CPU') && output.includes('kworkerds'),
    },
    {
      id: 'top-cpu',
      text: 'Eng ko\'p CPU ishlatayotgan jarayonni ro\'yxat tepasiga chiqaring.',
      hint: '`ps aux | sort -k3 -rn | head -n 3` — 3-ustun (%CPU) bo\'yicha, son sifatida, kamayish tartibida.',
      solution: ['ps aux | sort -k3 -rn | head -n 3'],
      check: ({ output }) => (output.split('\n')[0] ?? '').includes('kworkerds'),
    },
    {
      id: 'config',
      text: 'Jarayon nomi yadro jarayoniga (kworker) o\'xshatilgan, lekin u `/tmp/.x` dan ishga tushgan. Uning konfiguratsiya faylini o\'qing: u qayerga ulanmoqda?',
      hint: '`ls -la /tmp/.x`, keyin `cat /tmp/.x/config.json`',
      solution: ['cat /tmp/.x/config.json'],
      check: ({ output }) => output.includes('pool.example.net'),
    },
    {
      id: 'ss',
      text: 'Qaysi portlar tinglanmoqda va ularni qaysi jarayonlar ochgan? Boshqa foydalanuvchilarning jarayon nomlarini ko\'rish uchun root huquqi kerak.',
      hint: '`sudo ss -tulpn` — t: TCP, u: UDP, l: tinglayotganlar, p: jarayon, n: raqamlar bilan.',
      solution: ['sudo ss -tulpn'],
      check: ({ output }) => output.includes('kworkerds') && output.includes('4444'),
    },
    {
      id: 'unit',
      text: 'Jarayon qayta yuklanishdan keyin ham qaytib kelmoqda. Uni qaysi systemd xizmati ishga tushiradi? Ishlayotgan xizmatlarni ko\'rib, shubhalisining unit faylini o\'qing.',
      hint: '`systemctl list-units --type=service --state=running`, keyin `systemctl cat update-checker`',
      solution: ['systemctl list-units --type=service --state=running', 'systemctl cat update-checker'],
      check: ({ line, output }) => line.startsWith('systemctl cat') && output.includes('/tmp/.x/kworkerds'),
    },
    {
      id: 'disable',
      text: 'Xizmatni to\'xtating va yuklanishda ishga tushmaydigan qiling — bitta buyruq bilan.',
      hint: '`sudo systemctl disable --now update-checker` — disable: avtomatik ishga tushishni o\'chiradi, --now: hozir to\'xtatadi ham.',
      solution: ['sudo systemctl disable --now update-checker'],
      check: ({ state }) => {
        const s = state.system.services.find((x) => x.name === 'update-checker');
        return !!s && !s.enabled && s.active !== 'active' && !state.system.procs.some((p) => p.cmd.includes('kworkerds'));
      },
    },
    {
      id: 'failed',
      text: 'Endi sayt muammosi. Qaysi xizmatlar ishdan chiqqan (failed)?',
      hint: '`systemctl list-units --state=failed` yoki `systemctl status nginx`',
      solution: ['systemctl list-units --state=failed'],
      check: ({ output }) => output.includes('nginx.service') && output.includes('failed'),
    },
    {
      id: 'journal',
      text: 'nginx nima uchun ishga tushmadi? Uning jurnalini o\'qing.',
      hint: '`journalctl -u nginx` — xato qaysi fayl va qaysi qatorda ekanini ko\'rsatadi.',
      solution: ['journalctl -u nginx'],
      check: ({ output }) => output.includes('unknown directive'),
    },
    {
      id: 'fix',
      text: 'Konfiguratsiyadagi xatoni (`sever_name` → `server_name`) tuzating. Fayl root\'niki.',
      hint: "`sudo sed -i 's/sever_name/server_name/' /etc/nginx/sites-enabled/qaydnoma`",
      solution: ["sudo sed -i 's/sever_name/server_name/' /etc/nginx/sites-enabled/qaydnoma"],
      check: ({ state }) => {
        const conf = fileAt(state, NGINX_SITE) ?? '';
        return conf.includes('server_name qaydnoma') && !conf.includes('sever_name');
      },
    },
    {
      id: 'restart',
      text: 'nginx\'ni qayta ishga tushiring va 80-port ochilganini tekshiring.',
      hint: '`sudo systemctl restart nginx`, keyin `systemctl status nginx` va `ss -tln`',
      solution: ['sudo systemctl restart nginx', 'ss -tln'],
      check: ({ state }) =>
        state.system.services.find((x) => x.name === 'nginx')?.active === 'active' &&
        state.system.sockets.some((s) => s.local === '0.0.0.0:80'),
    },
  ],
};

/* ── 2. Bash scripts ───────────────────────────────────────────────────── */

const AUTH_SAMPLE = [
  'Nov 18 02:11:03 srv01 sshd[901]: Failed password for root from 198.51.100.7 port 40112 ssh2',
  'Nov 18 02:11:09 srv01 sshd[901]: Failed password for admin from 198.51.100.7 port 40118 ssh2',
  'Nov 18 02:12:40 srv01 sshd[905]: Accepted publickey for talaba from 10.10.20.31 port 51022 ssh2',
  'Nov 18 02:13:02 srv01 sshd[909]: Failed password for root from 203.0.113.45 port 41203 ssh2',
  '',
].join('\n');

export const bashScripts: Lab = {
  id: 'bash-skriptlar',
  title: 'Bash skriptlar: zaxira nusxani avtomatlashtirish',
  summary: "Skript yaratish, o'zgaruvchilar, argumentlar, bajarish ruxsati va skriptlardagi sirlar xavfi.",
  minutes: 25,
  level: 2,
  intro:
    "Har kuni qo'lda bajariladigan ishni skriptga aylantirish — tizim ma'muri va SOC analitigining asosiy odati. Bu labda loyiha papkasining zaxira nusxasini oladigan skript yozasiz.\n\n" +
    "Simulyatorda matn muharriri yo'q, shuning uchun skript `echo '...' >> fayl` bilan qatorma-qator yoziladi. Diqqat: **bittalik qo'shtirnoq** ichida `$MANZIL` o'zgarmaydi va faylga aynan shunday yoziladi — bizga aynan shu kerak. Simulyator skriptni qatorma-qator bajaradi: o'zgaruvchilar va `$1` bor, `if`/`for` yo'q.",
  shell: () => ({
    fs: {
      home: {
        talaba: {
          loyiha: { 'app.py': 'print("Qaydnoma")\n', 'README.md': '# Qaydnoma\n' },
          'eski-zaxira.sh': '#!/bin/bash\n# 2024-yilda yozilgan\nDB_USER=qaydnoma\nDB_PASSWORD=Qaydnoma2024!\npg_dump -U $DB_USER qaydnoma > /tmp/db.sql\n',
        },
      },
      var: { log: { 'auth.log': AUTH_SAMPLE } },
      tmp: {},
    },
  }),
  tasks: [
    {
      id: 'shebang',
      text: '`zaxira.sh` faylini yarating. Birinchi qatori — qaysi interpretator bajarishini aytadigan "shebang": `#!/bin/bash`.',
      hint: "`echo '#!/bin/bash' > zaxira.sh`",
      solution: ["echo '#!/bin/bash' > zaxira.sh"],
      check: ({ state }) => (fileAt(state, `${HOME}/zaxira.sh`) ?? '').startsWith('#!/bin/bash'),
    },
    {
      id: 'vars',
      text: 'Ikkita o\'zgaruvchi qo\'shing: `MANBA=/home/talaba/loyiha` va `MANZIL=/tmp/zaxira`.',
      hint: "`echo 'MANBA=/home/talaba/loyiha' >> zaxira.sh` va `echo 'MANZIL=/tmp/zaxira' >> zaxira.sh` (>> — oxiriga qo'shadi, > esa faylni qayta yozib yuboradi!)",
      solution: ["echo 'MANBA=/home/talaba/loyiha' >> zaxira.sh", "echo 'MANZIL=/tmp/zaxira' >> zaxira.sh"],
      check: ({ state }) => {
        const s = fileAt(state, `${HOME}/zaxira.sh`) ?? '';
        return s.startsWith('#!/bin/bash') && s.includes('MANBA=/home/talaba/loyiha') && s.includes('MANZIL=/tmp/zaxira');
      },
    },
    {
      id: 'body',
      text: 'Skriptning asosiy qismi: manzil papkasini yarating, loyihani unga nusxalang va natijani xabar qiling.',
      hint: "Uch qator: `echo 'mkdir -p $MANZIL' >> zaxira.sh`, `echo 'cp -r $MANBA $MANZIL/' >> zaxira.sh`, `echo 'echo \"Zaxira tayyor: $MANZIL\"' >> zaxira.sh`",
      solution: [
        "echo 'mkdir -p $MANZIL' >> zaxira.sh",
        "echo 'cp -r $MANBA $MANZIL/' >> zaxira.sh",
        "echo 'echo \"Zaxira tayyor: $MANZIL\"' >> zaxira.sh",
      ],
      check: ({ state }) => {
        const s = fileAt(state, `${HOME}/zaxira.sh`) ?? '';
        return s.includes('mkdir -p $MANZIL') && s.includes('cp -r $MANBA $MANZIL') && s.includes('Zaxira tayyor');
      },
    },
    {
      id: 'denied',
      text: 'Skriptni `./zaxira.sh` bilan ishga tushirib ko\'ring. Nima bo\'ldi?',
      hint: '`./zaxira.sh` — yangi faylda bajarish (x) ruxsati yo\'q, shuning uchun "Permission denied".',
      solution: ['./zaxira.sh'],
      check: ({ line, output }) => line.startsWith('./zaxira.sh') && output.includes('Permission denied'),
    },
    {
      id: 'chmod',
      text: 'Faylga egasi uchun bajarish ruxsatini bering.',
      hint: '`chmod u+x zaxira.sh` (yoki `chmod 744 zaxira.sh`). Tekshirish: `ls -l zaxira.sh`',
      solution: ['chmod u+x zaxira.sh'],
      check: ({ state }) => ((modeAt(state, `${HOME}/zaxira.sh`) ?? 0) & 0o100) !== 0,
    },
    {
      id: 'run',
      text: 'Skriptni ishga tushiring va zaxira haqiqatan paydo bo\'lganini tekshiring.',
      hint: '`./zaxira.sh`, keyin `ls /tmp/zaxira/loyiha`',
      solution: ['./zaxira.sh', 'ls /tmp/zaxira/loyiha'],
      check: ({ state }) => nodeAt(state, '/tmp/zaxira/loyiha/app.py')?.type === 'file',
    },
    {
      id: 'args',
      text: 'Ikkinchi skript argument qabul qilsin: `sanoq.sh FAYL` — berilgan logdagi muvaffaqiyatsiz kirishlar sonini chiqarsin. Uni `/var/log/auth.log` bilan ishga tushiring.',
      hint: "`echo 'grep -c \"Failed password\" $1' > sanoq.sh`, keyin `bash sanoq.sh /var/log/auth.log` ($1 — birinchi argument; `bash fayl` uchun x ruxsati shart emas).",
      solution: ["echo 'grep -c \"Failed password\" $1' > sanoq.sh", 'bash sanoq.sh /var/log/auth.log'],
      check: ({ line, output }) => /sanoq\.sh\s+\/var\/log\/auth\.log/.test(line) && output.trim() === '3',
    },
    {
      id: 'secret',
      text: 'Uy katalogingizdagi skriptlardan birida parol ochiq yozilgan. Uni `grep` bilan toping.',
      hint: '`grep -ri password ~` — -r: kataloglar ichida, -i: katta-kichik harfga qaramasdan.',
      solution: ['grep -ri password ~'],
      check: ({ output }) => output.includes('DB_PASSWORD=Qaydnoma2024!'),
    },
    {
      id: 'lock',
      text: 'Parol skriptdan sirlar menejeriga ko\'chirilguncha, hech bo\'lmasa faylni faqat o\'zingiz o\'qiy oladigan qiling.',
      hint: '`chmod 700 eski-zaxira.sh` (yoki 600). Haqiqiy yechim — parolni almashtirish va uni koddan olib tashlash (a3 sirlar darsi).',
      solution: ['chmod 700 eski-zaxira.sh'],
      check: ({ state }) => ((modeAt(state, `${HOME}/eski-zaxira.sh`) ?? 0o777) & 0o077) === 0,
    },
  ],
};

/* ── 3. Server audit ───────────────────────────────────────────────────── */

const BINARIES: Record<string, string> = {
  '/usr/bin/ls': 'ELF ls coreutils 9.4\n',
  '/usr/bin/ps': 'ELF ps procps-ng 4.0.4\n',
  '/usr/bin/ssh': 'ELF ssh OpenSSH_9.6p1\n',
  '/usr/bin/sudo': 'ELF sudo 1.9.15p5\n',
};
/** /usr/bin/ps was replaced after the baseline was taken: it hides a process name. */
const TAMPERED_PS = 'ELF ps procps-ng 4.0.4\n# hide: kworkerds\n';

const BASELINE = Object.entries(BINARIES)
  .map(([path, content]) => `${sha256Hex(content)}  ${path}`)
  .join('\n') + '\n';

const REDIS_CONF = '/etc/redis/redis.conf';

export const serverAudit: Lab = {
  id: 'server-auditi',
  title: 'Server auditi va hardening',
  summary: "UID 0 akkauntlar, SUID fayllar, hamma yoza oladigan fayllar, SSH sozlamalari, fayl yaxlitligi va ochiq portlar.",
  minutes: 40,
  level: 3,
  intro:
    "Sizga `srv02` serverining xavfsizlik auditi topshirildi. Ro'yxat — CIS Benchmark kabi standartlardagi eng muhim tekshiruvlar: kim root huquqiga ega, qaysi dasturlar root nomidan ishlaydi, kim nimani o'zgartira oladi, SSH qanday sozlangan, tizim fayllari o'zgartirilmaganmi va nima tashqariga ochiq.\n\n" +
    "Har bir topilmani tuzatgandan keyin uni hisobotga yozish odat bo'lsin (p4 hisobot darsi).",
  shell: () => ({
    host: 'srv02',
    fs: {
      home: { talaba: {} },
      root: { $dir: { '.bash_history': 'ls\n' }, mode: 0o700 },
      etc: {
        passwd: [
          'root:x:0:0:root:/root:/bin/bash',
          'daemon:x:1:1:daemon:/usr/sbin:/usr/sbin/nologin',
          'www-data:x:33:33:www-data:/var/www:/usr/sbin/nologin',
          'talaba:x:1000:1000:Talaba:/home/talaba:/bin/bash',
          'sysupd:x:0:0:System update:/var/tmp:/bin/bash',
          'redis:x:110:115::/var/lib/redis:/usr/sbin/nologin',
          '',
        ].join('\n'),
        ssh: {
          sshd_config: [
            '# srv02 — o\'rnatishdan qolgan sozlamalar',
            'Port 22',
            'PermitRootLogin yes',
            'PasswordAuthentication yes',
            'PubkeyAuthentication yes',
            'X11Forwarding yes',
            '',
          ].join('\n'),
        },
        'cron.d': { cleanup: file('*/5 * * * * root /opt/scripts/cleanup.sh\n', 0o666) },
        redis: { 'redis.conf': 'bind 0.0.0.0\nport 6379\nprotected-mode no\n' },
      },
      usr: {
        bin: {
          ls: BINARIES['/usr/bin/ls']!,
          ps: TAMPERED_PS,
          ssh: BINARIES['/usr/bin/ssh']!,
          sudo: file(BINARIES['/usr/bin/sudo']!, 0o4755),
          passwd: file('ELF passwd\n', 0o4755),
          su: file('ELF su\n', 0o4755),
        },
        local: { bin: { 'backup-helper': file('ELF backup-helper (custom, 2023)\n', 0o4755) } },
      },
      opt: { baseline: { 'sha256.txt': BASELINE }, scripts: { 'cleanup.sh': file('#!/bin/bash\nfind /tmp -mtime +7 -delete\n', 0o755) } },
      tmp: {},
    },
    system: {
      procs: [
        { pid: 1, ppid: 0, user: 'root', cmd: '/sbin/init' },
        { pid: 420, ppid: 1, user: 'root', cmd: '/usr/sbin/sshd -D' },
        { pid: 733, ppid: 1, user: 'redis', cmd: '/usr/bin/redis-server 0.0.0.0:6379' },
      ],
      services: [
        { name: 'ssh', description: 'OpenBSD Secure Shell server', active: 'active', enabled: true, pid: 420, exec: '/usr/sbin/sshd -D', listen: [{ proto: 'tcp', local: '0.0.0.0:22' }] },
        {
          name: 'redis-server',
          description: 'Advanced key-value store',
          active: 'active',
          enabled: true,
          pid: 733,
          user: 'redis',
          exec: '/usr/bin/redis-server /etc/redis/redis.conf',
          listen: [
            {
              proto: 'tcp',
              local: (ctx) => `${/^bind\s+(\S+)/m.exec(fileAt(ctx.state, REDIS_CONF) ?? '')?.[1] ?? '0.0.0.0'}:6379`,
            },
          ],
        },
      ],
      sockets: [
        { proto: 'tcp', local: '0.0.0.0:22', pid: 420 },
        { proto: 'tcp', local: '0.0.0.0:6379', pid: 733 },
      ],
    },
  }),
  tasks: [
    {
      id: 'uid0',
      text: 'Qaysi akkauntlar UID 0 ga ega (ya\'ni amalda root)? `/etc/passwd` da 3-ustun — UID.',
      hint: "`awk -F: '$3 == 0 {print $1}' /etc/passwd` — -F: ajratgich ikki nuqta.",
      solution: ["awk -F: '$3 == 0 {print $1}' /etc/passwd"],
      check: ({ output }) => output.split('\n').includes('sysupd'),
    },
    {
      id: 'suid',
      text: 'Egasi nomidan (ko\'pincha root) ishlaydigan SUID fayllarni toping. Standart ro\'yxatda bo\'lmagani qaysi?',
      hint: '`find / -perm -4000 -type f` — passwd, su, sudo odatiy; /usr/local/bin dagisi esa qo\'lda o\'rnatilgan.',
      solution: ['find / -perm -4000 -type f'],
      check: ({ output }) => output.includes('/usr/local/bin/backup-helper'),
    },
    {
      id: 'suid-fix',
      text: '`backup-helper` dan SUID bitini olib tashlang.',
      hint: '`sudo chmod u-s /usr/local/bin/backup-helper`, tekshirish: `ls -l /usr/local/bin/backup-helper` (s harfi yo\'qolishi kerak).',
      solution: ['sudo chmod u-s /usr/local/bin/backup-helper'],
      check: ({ state }) => ((modeAt(state, '/usr/local/bin/backup-helper') ?? 0o4000) & 0o4000) === 0,
    },
    {
      id: 'world',
      text: 'Hamma foydalanuvchi o\'zgartira oladigan (world-writable) fayllarni toping.',
      hint: '`find / -perm -0002 -type f` — oxirgi raqam 2: "boshqalar" uchun yozish.',
      solution: ['find / -perm -0002 -type f'],
      check: ({ output }) => output.includes('/etc/cron.d/cleanup'),
    },
    {
      id: 'world-fix',
      text: 'Bu cron fayli root nomidan bajariladi — uni istalgan foydalanuvchi o\'zgartira olsa, root huquqini oladi. Ruxsatni 644 qiling.',
      hint: '`sudo chmod 644 /etc/cron.d/cleanup`',
      solution: ['sudo chmod 644 /etc/cron.d/cleanup'],
      check: ({ state }) => modeAt(state, '/etc/cron.d/cleanup') === 0o644,
    },
    {
      id: 'ssh',
      text: 'SSH sozlamalarida root bilan va parol bilan kirish holatini tekshiring.',
      hint: '`grep -E "PermitRootLogin|PasswordAuthentication" /etc/ssh/sshd_config` (yoki ikkita alohida grep).',
      solution: ['grep -E "PermitRootLogin|PasswordAuthentication" /etc/ssh/sshd_config'],
      check: ({ output }) => output.includes('PermitRootLogin yes') || output.includes('PasswordAuthentication yes'),
    },
    {
      id: 'ssh-fix',
      text: 'Ikkalasini ham `no` qiling: root to\'g\'ridan-to\'g\'ri kirmasin, kirish faqat kalit bilan bo\'lsin.',
      hint: "`sudo sed -i 's/^PermitRootLogin yes/PermitRootLogin no/' /etc/ssh/sshd_config` va xuddi shunday PasswordAuthentication uchun. Haqiqiy serverda keyin `sudo systemctl restart ssh` (avval kalit bilan kira olishingizni tekshiring!).",
      solution: [
        "sudo sed -i 's/^PermitRootLogin yes/PermitRootLogin no/' /etc/ssh/sshd_config",
        "sudo sed -i 's/^PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config",
      ],
      check: ({ state }) => {
        const c = fileAt(state, '/etc/ssh/sshd_config') ?? '';
        return c.includes('PermitRootLogin no') && c.includes('PasswordAuthentication no');
      },
    },
    {
      id: 'integrity',
      text: 'Tizim fayllari o\'zgartirilmaganmi? O\'rnatishdan keyin olingan xeshlar `/opt/baseline/sha256.txt` da. Ular bilan solishtiring.',
      hint: '`sha256sum -c /opt/baseline/sha256.txt` — FAILED chiqqan fayl o\'zgartirilgan.',
      solution: ['sha256sum -c /opt/baseline/sha256.txt'],
      check: ({ output }) => output.includes('/usr/bin/ps: FAILED'),
    },
    {
      id: 'ports',
      text: 'Qaysi xizmatlar barcha tarmoq interfeyslarida (0.0.0.0) tinglayapti?',
      hint: '`sudo ss -tulpn` — redis 0.0.0.0:6379 da: internetdan parolsiz ma\'lumotlar bazasi.',
      solution: ['sudo ss -tulpn'],
      check: ({ output }) => output.includes('0.0.0.0:6379'),
    },
    {
      id: 'redis-fix',
      text: 'Redis faqat shu serverdan foydalaniladi. Uni faqat 127.0.0.1 da tinglaydigan qilib, xizmatni qayta ishga tushiring.',
      hint: "`sudo sed -i 's/^bind 0.0.0.0/bind 127.0.0.1/' /etc/redis/redis.conf`, keyin `sudo systemctl restart redis-server` va `ss -tln`",
      solution: ["sudo sed -i 's/^bind 0.0.0.0/bind 127.0.0.1/' /etc/redis/redis.conf", 'sudo systemctl restart redis-server'],
      check: ({ state }) =>
        state.system.sockets.some((s) => s.local === '127.0.0.1:6379') && !state.system.sockets.some((s) => s.local === '0.0.0.0:6379'),
    },
  ],
};
