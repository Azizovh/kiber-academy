import { BASE_TIME, dir, file } from '../../engine/terminal/fs';
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
  summary: "uptime, free, ps, pgrep, ss, crontab, systemctl, kill va journalctl bilan kriptomaynerni topish, dalil saqlash, tozalash va ishdan chiqqan veb-serverni tiklash.",
  minutes: 50,
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
      var: {
        log: {},
        spool: { cron: { crontabs: { 'www-data': file('*/5 * * * * /tmp/.x/kworkerds --watchdog\n', 0o600, 'www-data') } } },
      },
    },
    sysinfo: {
      uptime: '2 days,  1:15',
      load: '3.97, 3.88, 3.91',
      sessions: [
        { user: 'talaba', tty: 'pts/0', from: '10.10.20.31', login: '10:02', what: '-bash' },
      ],
    },
    system: {
      procs: [
        { pid: 2290, ppid: 1, user: 'www-data', cmd: '/tmp/.x/kworkerds --watchdog', cpu: 1.2, mem: 0.4, start: '03:15' },
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
      id: 'uptime',
      teach: ['uptime'],
      text: 'Avval umumiy holat: server qancha vaqtdan beri ishlayapti va yuklama (load average) qanday?',
      hint: '`uptime` — load average uchta son: oxirgi 1, 5 va 15 daqiqa. 4 ga yaqin — 4 ta yadro to\'liq band.',
      solution: ['uptime'],
      check: ({ line, output }) => /^uptime\b/.test(line) && output.includes('load average: 3.97'),
    },
    {
      id: 'free',
      teach: ['free', 'free -h'],
      text: 'Operativ xotira yetarlimi? O\'qishga oson birliklarda ko\'ring.',
      hint: '`free -h` — `available` ustuni: haqiqatan bo\'sh xotira.',
      solution: ['free -h'],
      check: ({ line, output }) => /^free\b/.test(line) && output.includes('Mem:'),
    },
    {
      id: 'w',
      teach: ['w'],
      text: 'Hozir serverda kim ishlayapti? Begona sessiya bormi?',
      hint: '`w` — faqat siz (talaba) bor. Demak, yuklamani interaktiv foydalanuvchi emas, fon jarayoni beryapti.',
      solution: ['w'],
      check: ({ line, output }) => /^w\b/.test(line) && output.includes('talaba'),
    },
    {
      id: 'ps',
      teach: ['ps', 'ps aux'],
      text: 'Serverda ishlayotgan barcha jarayonlarni (hamma foydalanuvchilarniki) CPU va xotira bilan ko\'ring.',
      hint: '`ps aux` — a: hamma foydalanuvchilar, u: batafsil, x: terminalsiz jarayonlar ham.',
      solution: ['ps aux'],
      check: ({ line, output }) => /^ps\b/.test(line) && output.includes('%CPU') && output.includes('kworkerds'),
    },
    {
      id: 'top-cpu',
      teach: ['sort -k N', 'sort -n', 'sort -r'],
      text: 'Eng ko\'p CPU ishlatayotgan jarayonni ro\'yxat tepasiga chiqaring.',
      hint: '`ps aux | sort -k3 -rn | head -n 3` — 3-ustun (%CPU) bo\'yicha, son sifatida, kamayish tartibida.',
      solution: ['ps aux | sort -k3 -rn | head -n 3'],
      check: ({ output }) => (output.split('\n')[0] ?? '').includes('kworkerds'),
    },
    {
      id: 'ps-ef',
      teach: ['ps -ef'],
      text: 'Shubhali jarayonning ota jarayoni (PPID) kim? Uni kim ishga tushirgan?',
      hint: '`ps -ef | grep kworker` — 3-ustun PPID. 1 — systemd: demak uni tizim xizmati yoki cron ishga tushirgan.',
      solution: ['ps -ef | grep kworker'],
      check: ({ line, output }) => /ps\s+-ef/.test(line) && /www-data\s+2231\s+1\b/.test(output),
    },
    {
      id: 'pgrep',
      teach: ['pgrep', 'pgrep -a'],
      text: 'Nomi `kworker` ga o\'xshagan barcha jarayonlarni to\'liq buyruq qatori bilan toping. Nechta?',
      hint: '`pgrep -a kworker` — ikkita: asosiy (2231) va "watchdog" (2290).',
      solution: ['pgrep -a kworker'],
      check: ({ output }) => output.includes('2231 ') && output.includes('2290 '),
    },
    {
      id: 'ls-x',
      teach: ['ls -a'],
      text: 'Jarayon `/tmp/.x` dan ishga tushgan — nuqta bilan boshlangan, ya\'ni yashirin katalog. Ichini ko\'ring.',
      hint: '`ls -la /tmp/.x`',
      solution: ['ls -la /tmp/.x'],
      check: ({ output }) => output.includes('kworkerds') && output.includes('config.json'),
    },
    {
      id: 'config',
      text: 'Konfiguratsiya faylini o\'qing: u qayerga ulanmoqda?',
      hint: '`cat /tmp/.x/config.json` — "pool" — kriptovalyuta qazish hovuzi. Bu kriptomayner.',
      solution: ['cat /tmp/.x/config.json'],
      check: ({ output }) => output.includes('pool.example.net'),
    },
    {
      id: 'stat',
      teach: ['stat'],
      text: 'Dastur fayli qachon paydo bo\'lgan va kimga tegishli?',
      hint: '`stat /tmp/.x/kworkerds` — egasi www-data: veb-server foydalanuvchisi. Demak, kirish yo\'li — veb-ilova orqali bo\'lishi mumkin.',
      solution: ['stat /tmp/.x/kworkerds'],
      check: ({ output }) => output.includes('www-data') && output.includes('Modify:'),
    },
    {
      id: 'ss',
      teach: ['ss', 'ss -t', 'ss -u', 'ss -l', 'ss -p', 'ss -n'],
      text: 'Qaysi portlar tinglanmoqda va ularni qaysi jarayonlar ochgan? Boshqa foydalanuvchilarning jarayon nomlarini ko\'rish uchun root huquqi kerak.',
      hint: '`sudo ss -tulpn` — 0.0.0.0:4444 da kworkerds: tashqaridan boshqarish uchun ochilgan port bo\'lishi mumkin.',
      solution: ['sudo ss -tulpn'],
      check: ({ output }) => output.includes('kworkerds') && output.includes('4444'),
    },
    {
      id: 'unit',
      teach: ['systemctl', 'systemctl list-units --type=service', 'systemctl cat'],
      text: 'Jarayon qayta yuklanishdan keyin ham qaytib kelmoqda. Uni qaysi systemd xizmati ishga tushiradi? Ishlayotgan xizmatlarni ko\'rib, shubhalisining unit faylini o\'qing.',
      hint: '`systemctl list-units --type=service --state=running`, keyin `systemctl cat update-checker`',
      solution: ['systemctl list-units --type=service --state=running', 'systemctl cat update-checker'],
      check: ({ line, output }) => line.startsWith('systemctl cat') && output.includes('/tmp/.x/kworkerds'),
    },
    {
      id: 'cron',
      teach: ['crontab', 'crontab -u NOM', 'crontab -l'],
      text: 'Ikkinchi jarayon (watchdog) xizmatdan emas. www-data foydalanuvchisining rejalashtirilgan vazifalarini tekshiring.',
      hint: '`sudo crontab -u www-data -l` — har 5 daqiqada qayta ishga tushirish: persistence (qaytib kelish yo\'li).',
      solution: ['sudo crontab -u www-data -l'],
      check: ({ output }) => output.includes('*/5') && output.includes('kworkerds'),
    },
    {
      id: 'evidence',
      teach: ['cp -p'],
      text: 'Tozalashdan oldin dalil saqlang: `/tmp/.x` katalogini egasi va vaqtlarini o\'zgartirmasdan uy katalogingizdagi `dalil` ga nusxalang.',
      hint: '`cp -rp /tmp/.x ~/dalil` — -p: egasi, ruxsat va vaqt saqlanadi; tergovda bu muhim.',
      solution: ['cp -rp /tmp/.x ~/dalil'],
      check: ({ state }) => fileAt(state, `${HOME}/dalil/config.json`) !== null && nodeAt(state, `${HOME}/dalil/kworkerds`)?.owner === 'www-data',
    },
    {
      id: 'disable',
      teach: ['systemctl disable', 'systemctl --now'],
      text: 'Xizmatni to\'xtating va yuklanishda ishga tushmaydigan qiling — bitta buyruq bilan.',
      hint: '`sudo systemctl disable --now update-checker` — disable: avtomatik ishga tushishni o\'chiradi, --now: hozir to\'xtatadi ham.',
      solution: ['sudo systemctl disable --now update-checker'],
      check: ({ state }) => {
        const s = state.system.services.find((x) => x.name === 'update-checker');
        return !!s && !s.enabled && s.active !== 'active';
      },
    },
    {
      id: 'cron-rm',
      teach: ['crontab -r'],
      text: 'www-data ning shubhali cron vazifasini o\'chiring.',
      hint: '`sudo crontab -u www-data -r`, tekshirish: `sudo crontab -u www-data -l` → "no crontab".',
      solution: ['sudo crontab -u www-data -r'],
      check: ({ state }) => nodeAt(state, '/var/spool/cron/crontabs/www-data') === null,
    },
    {
      id: 'kill',
      teach: ['kill', 'kill -9'],
      text: 'Watchdog jarayoni hali ishlayapti. Uni majburan to\'xtating.',
      hint: '`pgrep -a kworker` bilan PID ni toping (2290), keyin `sudo kill -9 2290`.',
      solution: ['sudo kill -9 2290'],
      check: ({ state }) => !state.system.procs.some((p) => p.cmd.includes('kworkerds')),
    },
    {
      id: 'rm',
      teach: ['rm -r'],
      text: 'Dalil saqlandi — endi `/tmp/.x` ni butunlay o\'chiring.',
      hint: '`sudo rm -r /tmp/.x`',
      solution: ['sudo rm -r /tmp/.x'],
      check: ({ state }) => nodeAt(state, '/tmp/.x') === null,
    },
    {
      id: 'failed',
      teach: ['systemctl list-units --type=service'],
      text: 'Endi sayt muammosi. Qaysi xizmatlar ishdan chiqqan (failed)?',
      hint: '`systemctl list-units --state=failed` yoki `systemctl status nginx`',
      solution: ['systemctl list-units --state=failed'],
      check: ({ output }) => output.includes('nginx.service') && output.includes('failed'),
    },
    {
      id: 'journal',
      teach: ['journalctl', 'journalctl -u XIZMAT'],
      text: 'nginx nima uchun ishga tushmadi? Uning jurnalini o\'qing.',
      hint: '`journalctl -u nginx` — xato qaysi fayl va qaysi qatorda ekanini ko\'rsatadi.',
      solution: ['journalctl -u nginx'],
      check: ({ output }) => output.includes('unknown directive'),
    },
    {
      id: 'fix',
      teach: ['sed', 'sed -i'],
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
      teach: ['systemctl start / stop / restart', 'systemctl is-active / is-enabled'],
      text: 'nginx\'ni qayta ishga tushiring va ishlayotganini qisqa javob bilan tekshiring.',
      hint: '`sudo systemctl restart nginx`, keyin `systemctl is-active nginx` → active.',
      solution: ['sudo systemctl restart nginx', 'systemctl is-active nginx'],
      check: ({ state }) =>
        state.system.services.find((x) => x.name === 'nginx')?.active === 'active' &&
        state.system.sockets.some((s) => s.local === '0.0.0.0:80'),
    },
    {
      id: 'challenge',
      challenge: true,
      text: 'Mustaqil vazifa: hisobot uchun hozir tinglayotgan barcha portlar va ularni ochgan jarayonlar ro\'yxatini `~/portlar.txt` ga saqlang. 4444-port endi bo\'lmasligi kerak.',
      hint: '`sudo ss -tulpn > ~/portlar.txt`, tekshirish: `cat ~/portlar.txt`',
      solution: ['sudo ss -tulpn > ~/portlar.txt'],
      check: ({ state }) => {
        const t = fileAt(state, `${HOME}/portlar.txt`) ?? '';
        return t.includes('0.0.0.0:80') && t.includes('nginx') && !t.includes('4444');
      },
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
  summary: "Skript yaratish, o'zgaruvchilar, $1/$#/$@, set -e, jurnal yozish, muhit o'zgaruvchilari, cron bilan avtomatlashtirish va skriptlardagi sirlar xavfi.",
  minutes: 45,
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
      id: 'which',
      teach: ['which'],
      text: 'Skript qaysi dastur tomonidan bajariladi? Avval `bash` qayerda joylashganini toping.',
      hint: '`which bash` — shebang qatorida aynan shu yo\'l yoziladi.',
      solution: ['which bash'],
      check: ({ line, output }) => /^which\s+bash/.test(line) && output.includes('/bash'),
    },
    {
      id: 'shebang',
      teach: ['echo'],
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
      id: 'review',
      teach: ['cat -n'],
      text: 'Ishga tushirishdan oldin skriptni qator raqamlari bilan qayta o\'qib chiqing.',
      hint: '`cat -n zaxira.sh` — har doim avval o\'qing, keyin ishga tushiring.',
      solution: ['cat -n zaxira.sh'],
      check: ({ output }) => output.includes('     1\t#!/bin/bash') && output.includes('Zaxira tayyor'),
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
      teach: ['chmod u+x'],
      text: 'Faylga egasi uchun bajarish ruxsatini bering.',
      hint: '`chmod u+x zaxira.sh` (yoki `chmod 744 zaxira.sh`). Tekshirish: `ls -l zaxira.sh`',
      solution: ['chmod u+x zaxira.sh'],
      check: ({ state }) => ((modeAt(state, `${HOME}/zaxira.sh`) ?? 0) & 0o100) !== 0,
    },
    {
      id: 'run',
      teach: ['bash'],
      text: 'Skriptni ishga tushiring.',
      hint: '`./zaxira.sh` — "Zaxira tayyor: /tmp/zaxira" chiqishi kerak.',
      solution: ['./zaxira.sh'],
      check: ({ state }) => nodeAt(state, '/tmp/zaxira/loyiha/app.py')?.type === 'file',
    },
    {
      id: 'ls-r',
      teach: ['ls -R'],
      text: 'Zaxira haqiqatan to\'liq olinganini ichki kataloglari bilan tekshiring.',
      hint: '`ls -R /tmp/zaxira`',
      solution: ['ls -R /tmp/zaxira'],
      check: ({ line, output }) => /ls\s+-\w*R/.test(line) && output.includes('app.py'),
    },
    {
      id: 'diff',
      teach: ['diff'],
      text: 'Nusxa asl fayl bilan bir xilmi? `app.py` ning ikkala nusxasini solishtiring.',
      hint: '`diff loyiha/app.py /tmp/zaxira/loyiha/app.py` — hech narsa chiqmasa, fayllar bir xil.',
      solution: ['diff loyiha/app.py /tmp/zaxira/loyiha/app.py'],
      check: ({ line, output }) => /^diff\b/.test(line) && output === '',
    },
    {
      id: 'log',
      text: 'Skript har ishlaganda jurnalga yozsin: oxiriga `/tmp/zaxira.log` ga "zaxira olindi" qo\'shadigan qator qo\'shing va skriptni qayta ishga tushiring.',
      hint: "`echo 'echo \"zaxira olindi\" >> /tmp/zaxira.log' >> zaxira.sh`, keyin `./zaxira.sh` va `cat /tmp/zaxira.log`",
      solution: ["echo 'echo \"zaxira olindi\" >> /tmp/zaxira.log' >> zaxira.sh", './zaxira.sh'],
      check: ({ state }) => (fileAt(state, '/tmp/zaxira.log') ?? '').includes('zaxira olindi'),
    },
    {
      id: 'args',
      text: 'Ikkinchi skript argument qabul qilsin: `sanoq.sh FAYL` — berilgan logdagi muvaffaqiyatsiz kirishlar sonini chiqarsin. Uni `/var/log/auth.log` bilan ishga tushiring.',
      hint: "`echo 'grep -c \"Failed password\" $1' > sanoq.sh`, keyin `bash sanoq.sh /var/log/auth.log` ($1 — birinchi argument; `bash fayl` uchun x ruxsati shart emas).",
      solution: ["echo 'grep -c \"Failed password\" $1' > sanoq.sh", 'bash sanoq.sh /var/log/auth.log'],
      check: ({ line, output }) => /sanoq\.sh\s+\/var\/log\/auth\.log/.test(line) && output.trim() === '3',
    },
    {
      id: 'args-all',
      text: 'Skript nechta argument olganini ($#) va ularning hammasini ($@) chiqaradigan `arg.sh` yozing va uni `a b c` bilan ishga tushiring.',
      hint: "`echo 'echo \"Argumentlar soni: $#, ular: $@\"' > arg.sh`, keyin `bash arg.sh a b c`",
      solution: ["echo 'echo \"Argumentlar soni: $#, ular: $@\"' > arg.sh", 'bash arg.sh a b c'],
      check: ({ output }) => output.includes('Argumentlar soni: 3, ular: a b c'),
    },
    {
      id: 'set-e',
      text: 'Xatoda to\'xtash: `xato.sh` uch qatordan iborat bo\'lsin — `set -e`, mavjud bo\'lmagan faylni nusxalash va "bu chiqmasligi kerak" xabari. Ishga tushirib, oxirgi qator bajarilmaganini ko\'ring.',
      hint: "`echo 'set -e' > xato.sh`, `echo 'cp yoq.txt /tmp/' >> xato.sh`, `echo 'echo \"bu chiqmasligi kerak\"' >> xato.sh`, keyin `bash xato.sh`. set -e siz skript xatoga qaramay davom etardi.",
      solution: ["echo 'set -e' > xato.sh", "echo 'cp yoq.txt /tmp/' >> xato.sh", "echo 'echo \"bu chiqmasligi kerak\"' >> xato.sh", 'bash xato.sh'],
      check: ({ line, output }) => /xato\.sh/.test(line) && output.includes('cannot stat') && !output.includes('bu chiqmasligi'),
    },
    {
      id: 'export',
      teach: ['export'],
      text: 'Muhit o\'zgaruvchisi yarating: `LOYIHA` qiymati `qaydnoma` bo\'lsin, keyin uni chiqaring.',
      hint: '`export LOYIHA=qaydnoma`, keyin `echo $LOYIHA`',
      solution: ['export LOYIHA=qaydnoma', 'echo $LOYIHA'],
      check: ({ line, output }) => /echo\s+\$LOYIHA/.test(line) && output === 'qaydnoma',
    },
    {
      id: 'env',
      teach: ['env'],
      text: 'Barcha muhit o\'zgaruvchilari orasidan `LOYIHA` ni toping.',
      hint: '`env | grep LOYIHA`',
      solution: ['env | grep LOYIHA'],
      check: ({ output }) => output === 'LOYIHA=qaydnoma',
    },
    {
      id: 'date',
      teach: ['date', 'date +%F'],
      text: 'Bugungi sanani `YYYY-MM-DD` ko\'rinishida chiqaring — zaxira fayllar nomida ko\'p ishlatiladi.',
      hint: '`date +%F`',
      solution: ['date +%F'],
      check: ({ output }) => /^\d{4}-\d{2}-\d{2}$/.test(output.trim()),
    },
    {
      id: 'cron',
      teach: ['crontab', 'crontab FAYL', 'crontab -l'],
      text: 'Zaxirani har kuni soat 03:00 da avtomatik bajariladigan qiling va o\'rnatilganini tekshiring.',
      hint: "`echo '0 3 * * * /home/talaba/zaxira.sh' > mycron`, `crontab mycron`, `crontab -l`. Format: daqiqa soat kun oy hafta_kuni buyruq.",
      solution: ["echo '0 3 * * * /home/talaba/zaxira.sh' > mycron", 'crontab mycron', 'crontab -l'],
      check: ({ output }) => output.includes('0 3 * * * /home/talaba/zaxira.sh'),
    },
    {
      id: 'secret',
      teach: ['grep -r', 'grep -i'],
      text: 'Uy katalogingizdagi skriptlardan birida parol ochiq yozilgan. Uni `grep` bilan toping.',
      hint: '`grep -ri password ~` — -r: kataloglar ichida, -i: katta-kichik harfga qaramasdan.',
      solution: ['grep -ri password ~'],
      check: ({ output }) => output.includes('DB_PASSWORD=Qaydnoma2024!'),
    },
    {
      id: 'lock',
      teach: ['chmod 600'],
      text: 'Parol skriptdan sirlar menejeriga ko\'chirilguncha, hech bo\'lmasa faylni faqat o\'zingiz o\'qiy oladigan qiling.',
      hint: '`chmod 600 eski-zaxira.sh` (yoki 700). Haqiqiy yechim — parolni almashtirish va uni koddan olib tashlash (a3 sirlar darsi).',
      solution: ['chmod 600 eski-zaxira.sh'],
      check: ({ state }) => ((modeAt(state, `${HOME}/eski-zaxira.sh`) ?? 0o777) & 0o077) === 0,
    },
    {
      id: 'challenge',
      challenge: true,
      text: 'Mustaqil vazifa: `hisob.sh` yozing — u argument sifatida berilgan logdagi muvaffaqiyatsiz kirishlar sonini, keyingi qatorda esa eng ko\'p uringan IP va uning sonini chiqarsin. Uni `/var/log/auth.log` bilan ishga tushiring.',
      hint: "Ikki qator: `echo 'grep -c \"Failed password\" $1' > hisob.sh` va `echo 'grep \"Failed password\" $1 | cut -d \" \" -f 11 | sort | uniq -c | sort -rn | head -n 1' >> hisob.sh`, keyin `bash hisob.sh /var/log/auth.log`",
      solution: [
        "echo 'grep -c \"Failed password\" $1' > hisob.sh",
        "echo 'grep \"Failed password\" $1 | cut -d \" \" -f 11 | sort | uniq -c | sort -rn | head -n 1' >> hisob.sh",
        'bash hisob.sh /var/log/auth.log',
      ],
      check: ({ line, output }) => /hisob\.sh/.test(line) && output.split('\n')[0] === '3' && /2 198\.51\.100\.7/.test(output),
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
  minutes: 55,
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
        // Changed yesterday evening: that is when sysupd appeared.
        passwd: file(
          [
            'root:x:0:0:root:/root:/bin/bash',
            'daemon:x:1:1:daemon:/usr/sbin:/usr/sbin/nologin',
            'www-data:x:33:33:www-data:/var/www:/usr/sbin/nologin',
            'talaba:x:1000:1000:Talaba:/home/talaba:/bin/bash',
            'eski_admin:x:1001:1001:Ishdan ketgan admin:/home/eski_admin:/bin/bash',
            'sysupd:x:0:0:System update:/var/tmp:/bin/bash',
            'redis:x:110:115::/var/lib/redis:/usr/sbin/nologin',
            '',
          ].join('\n'),
          0o644,
          'root',
          BASE_TIME + 33 * 3_600_000,
        ),
        group: 'root:x:0:\nsudo:x:27:talaba,eski_admin\ntalaba:x:1000:\neski_admin:x:1001:\nredis:x:115:\n',
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
    sysinfo: {
      lastLogins: [
        'talaba   pts/0        10.10.20.31      Wed Nov 18 10:02   still logged in',
        'sysupd   pts/1        198.51.100.66    Tue Nov 17 18:41 - 19:02  (00:21)',
        'talaba   pts/0        10.10.20.31      Tue Nov 17 08:12 - 17:40  (09:28)',
        'eski_admin pts/0      10.10.20.50      Mon Sep 01 09:15 - 09:40  (00:25)',
      ],
    },
    system: {
      procs: [
        { pid: 1, ppid: 0, user: 'root', cmd: '/sbin/init' },
        { pid: 420, ppid: 1, user: 'root', cmd: '/usr/sbin/sshd -D' },
        { pid: 733, ppid: 1, user: 'redis', cmd: '/usr/bin/redis-server 0.0.0.0:6379' },
      ],
      services: [
        { name: 'ssh', description: 'OpenBSD Secure Shell server', active: 'active', enabled: true, pid: 420, exec: '/usr/sbin/sshd -D', listen: [{ proto: 'tcp', local: '0.0.0.0:22' }] },
        { name: 'telnet', description: 'Telnet server (shifrlanmagan masofaviy kirish)', active: 'inactive', enabled: true, exec: '/usr/sbin/in.telnetd' },
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
      id: 'uname',
      teach: ['uname', 'uname -r'],
      text: 'Audit tizim haqidagi ma\'lumotdan boshlanadi: yadro (kernel) versiyasi qanday?',
      hint: '`uname -r` — eski yadro versiyasi ma\'lum zaifliklarni qidirishga sabab bo\'ladi.',
      solution: ['uname -r'],
      check: ({ line, output }) => /^uname\s+-\w*r/.test(line) && /\d+\.\d+/.test(output),
    },
    {
      id: 'uid0',
      teach: ['awk', 'awk -F BELGI', 'awk SHART'],
      text: 'Qaysi akkauntlar UID 0 ga ega (ya\'ni amalda root)? `/etc/passwd` da 3-ustun — UID.',
      hint: "`awk -F: '$3 == 0 {print $1}' /etc/passwd` — -F: ajratgich ikki nuqta.",
      solution: ["awk -F: '$3 == 0 {print $1}' /etc/passwd"],
      check: ({ output }) => output.split('\n').includes('sysupd'),
    },
    {
      id: 'mtime',
      teach: ['find -mtime -N|+N'],
      text: '`/etc` da oxirgi 2 kunda qaysi fayllar o\'zgargan? `sysupd` qachon qo\'shilganini taxmin qilish mumkin.',
      hint: '`find /etc -mtime -2 -type f` — passwd yaqinda o\'zgargan.',
      solution: ['find /etc -mtime -2 -type f'],
      check: ({ output }) => output.includes('/etc/passwd'),
    },
    {
      id: 'last',
      teach: ['last', 'last -n N'],
      text: 'Oxirgi kirishlar tarixini ko\'ring. `sysupd` qachon va qayerdan kirgan?',
      hint: '`last -n 5` — sysupd 17-noyabr kechqurun tashqi IP (198.51.100.66) dan kirgan.',
      solution: ['last -n 5'],
      check: ({ line, output }) => /^last\b/.test(line) && output.includes('sysupd') && output.includes('198.51.100.66'),
    },
    {
      id: 'userdel',
      teach: ['userdel'],
      text: 'Ruxsatsiz root akkaunt `sysupd` ni o\'chiring (dalillar alohida saqlangan deb hisoblaymiz).',
      hint: '`sudo userdel sysupd`, tekshirish: `grep sysupd /etc/passwd` — hech narsa chiqmasligi kerak.',
      solution: ['sudo userdel sysupd'],
      check: ({ state }) => !(fileAt(state, '/etc/passwd') ?? '').includes('sysupd'),
    },
    {
      id: 'sudoers',
      teach: ['grep'],
      text: 'Kimlar `sudo` guruhida (administrator huquqi)? `/etc/group` dan toping.',
      hint: '`grep "^sudo" /etc/group` — ishdan ketgan `eski_admin` hali ham administrator.',
      solution: ['grep "^sudo" /etc/group'],
      check: ({ output }) => output.includes('eski_admin'),
    },
    {
      id: 'lock',
      teach: ['passwd', 'passwd -l'],
      text: '`eski_admin` akkauntini bloklang — u ishdan ketgan, lekin akkaunt ochiq qolgan.',
      hint: '`sudo passwd -l eski_admin` — parol bilan kirish yopiladi. Keyinroq akkauntni butunlay o\'chirish mumkin.',
      solution: ['sudo passwd -l eski_admin'],
      check: ({ line, output }) => /passwd\s+-l\s+eski_admin/.test(line) && output.includes('password changed'),
    },
    {
      id: 'suid',
      teach: ['find -perm -4000'],
      text: 'Egasi nomidan (ko\'pincha root) ishlaydigan SUID fayllarni toping. Standart ro\'yxatda bo\'lmagani qaysi?',
      hint: '`find / -perm -4000 -type f` — passwd, su, sudo odatiy; /usr/local/bin dagisi esa qo\'lda o\'rnatilgan.',
      solution: ['find / -perm -4000 -type f'],
      check: ({ output }) => output.includes('/usr/local/bin/backup-helper'),
    },
    {
      id: 'suid-fix',
      teach: ['chmod u-s'],
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
      teach: ['chmod 644'],
      text: 'Bu cron fayli root nomidan bajariladi — uni istalgan foydalanuvchi o\'zgartira olsa, root huquqini oladi. Ruxsatni 644 qiling.',
      hint: '`sudo chmod 644 /etc/cron.d/cleanup`',
      solution: ['sudo chmod 644 /etc/cron.d/cleanup'],
      check: ({ state }) => modeAt(state, '/etc/cron.d/cleanup') === 0o644,
    },
    {
      id: 'ssh',
      teach: ['grep -E'],
      text: 'SSH sozlamalarida root bilan va parol bilan kirish holatini tekshiring.',
      hint: '`grep -E "PermitRootLogin|PasswordAuthentication" /etc/ssh/sshd_config`',
      solution: ['grep -E "PermitRootLogin|PasswordAuthentication" /etc/ssh/sshd_config'],
      check: ({ output }) => output.includes('PermitRootLogin yes') || output.includes('PasswordAuthentication yes'),
    },
    {
      id: 'ssh-fix',
      teach: ['sed -i'],
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
      teach: ['sha256sum -c'],
      text: 'Tizim fayllari o\'zgartirilmaganmi? O\'rnatishdan keyin olingan xeshlar `/opt/baseline/sha256.txt` da. Ular bilan solishtiring.',
      hint: '`sha256sum -c /opt/baseline/sha256.txt` — FAILED chiqqan fayl o\'zgartirilgan.',
      solution: ['sha256sum -c /opt/baseline/sha256.txt'],
      check: ({ output }) => output.includes('/usr/bin/ps: FAILED'),
    },
    {
      id: 'unit-files',
      teach: ['systemctl list-unit-files'],
      text: 'Yuklanishda qaysi xizmatlar avtomatik yoqiladi? Keraksizi bormi?',
      hint: '`systemctl list-unit-files` — telnet: parollar ochiq matnda uzatiladigan eski protokol.',
      solution: ['systemctl list-unit-files'],
      check: ({ output }) => output.includes('telnet.service') && output.includes('enabled'),
    },
    {
      id: 'telnet',
      teach: ['systemctl disable'],
      text: 'telnet xizmatini yuklanishda ishga tushmaydigan qiling.',
      hint: '`sudo systemctl disable telnet`, tekshirish: `systemctl is-enabled telnet` → disabled.',
      solution: ['sudo systemctl disable telnet'],
      check: ({ state }) => state.system.services.find((s) => s.name === 'telnet')?.enabled === false,
    },
    {
      id: 'upgradable',
      teach: ['apt', 'apt list --upgradable'],
      text: 'Yangilanishi kerak bo\'lgan paketlar bormi?',
      hint: '`apt list --upgradable` — openssh-server va sudo xavfsizlik yangilanishini kutmoqda.',
      solution: ['apt list --upgradable'],
      check: ({ output }) => output.includes('openssh-server') && output.includes('upgradable'),
    },
    {
      id: 'upgrade',
      teach: ['apt update', 'apt upgrade'],
      text: 'Paketlar ro\'yxatini yangilang va o\'rnatilganlarni yangilang.',
      hint: '`sudo apt update`, keyin `sudo apt upgrade` — eng oddiy va eng muhim himoya.',
      solution: ['sudo apt update', 'sudo apt upgrade'],
      check: ({ output }) => output.includes('3 upgraded'),
    },
    {
      id: 'fail2ban',
      teach: ['apt install PAKET'],
      text: 'SSH ga parol tanlash hujumlaridan himoya uchun `fail2ban` ni o\'rnating.',
      hint: '`sudo apt install fail2ban` — u ko\'p marta noto\'g\'ri kirgan IP ni vaqtincha bloklaydi.',
      solution: ['sudo apt install fail2ban'],
      check: ({ state }) => state.packages.has('fail2ban'),
    },
    {
      id: 'df',
      teach: ['df', 'df -h'],
      text: 'Disklar holatini tekshiring: qaysi bo\'lim deyarli to\'lgan?',
      hint: '`df -h` — /var 90% dan oshgan: loglar diskni to\'ldirsa, xizmatlar to\'xtaydi va yangi jurnal yozilmaydi.',
      solution: ['df -h'],
      check: ({ line, output }) => /^df\b/.test(line) && output.includes('/var'),
    },
    {
      id: 'ports',
      teach: ['ss -l'],
      text: 'Qaysi xizmatlar barcha tarmoq interfeyslarida (0.0.0.0) tinglayapti?',
      hint: '`sudo ss -tulpn` — redis 0.0.0.0:6379 da: internetdan parolsiz ma\'lumotlar bazasi.',
      solution: ['sudo ss -tulpn'],
      check: ({ output }) => output.includes('0.0.0.0:6379'),
    },
    {
      id: 'redis-fix',
      teach: ['systemctl start / stop / restart'],
      text: 'Redis faqat shu serverdan foydalaniladi. Uni faqat 127.0.0.1 da tinglaydigan qilib, xizmatni qayta ishga tushiring.',
      hint: "`sudo sed -i 's/^bind 0.0.0.0/bind 127.0.0.1/' /etc/redis/redis.conf`, keyin `sudo systemctl restart redis-server` va `ss -tln`",
      solution: ["sudo sed -i 's/^bind 0.0.0.0/bind 127.0.0.1/' /etc/redis/redis.conf", 'sudo systemctl restart redis-server'],
      check: ({ state }) =>
        state.system.sockets.some((s) => s.local === '127.0.0.1:6379') && !state.system.sockets.some((s) => s.local === '0.0.0.0:6379'),
    },
    {
      id: 'challenge',
      challenge: true,
      text: 'Mustaqil vazifa: audit hisobotining ilovasi uchun `~/audit.txt` faylini tuzing — avval UID 0 bo\'lgan akkauntlar, keyin tizimdagi barcha SUID fayllar.',
      hint: "Ikki buyruq: `awk -F: '$3 == 0 {print $1}' /etc/passwd > ~/audit.txt`, keyin `find / -perm -4000 -type f >> ~/audit.txt` (>> — oxiriga qo'shadi).",
      solution: ["awk -F: '$3 == 0 {print $1}' /etc/passwd > ~/audit.txt", 'find / -perm -4000 -type f >> ~/audit.txt'],
      check: ({ state }) => {
        const t = fileAt(state, `${HOME}/audit.txt`) ?? '';
        return t.startsWith('root') && t.includes('/usr/bin/sudo') && !t.includes('sysupd');
      },
    },
  ],
};
