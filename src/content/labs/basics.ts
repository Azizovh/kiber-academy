import { file } from '../../engine/terminal/fs';
import type { Lab } from '../types';
import { fileAt, isDir, modeAt, nodeAt } from './helpers';

const HOME = '/home/talaba';

export const firstSteps: Lab = {
  id: 'terminal-birinchi-qadam',
  title: 'Terminalda birinchi qadamlar',
  summary: "pwd, ls, cd, cat — fayl tizimida yurish va fayl o'qish.",
  minutes: 15,
  level: 1,
  intro:
    "Bu — haqiqiy Linux terminaliga o'xshash simulyator. Hech narsani buzib qo'ymaysiz: xato qilsangiz, labni qayta boshlash mumkin. Buyruqni yozib **Enter** bosing. Qiynalsangiz `help` yoki `man ls` deb yozing.",
  shell: () => ({
    fs: {
      home: {
        talaba: {
          'salom.txt': "Xush kelibsiz, bo'lajak mutaxassis!\nTerminal — sizning asosiy ish qurolingiz.\n",
          hujjatlar: {
            'reja.txt': '1. Kompyuter asoslari\n2. Tarmoq\n3. Linux\n',
            '.maxfiy.txt': "Yashirin fayllar nuqta bilan boshlanadi. Kalit so'z: KUZATUVCHAN\n",
          },
          rasmlar: {},
        },
      },
      etc: { hostname: 'kali\n', passwd: 'root:x:0:0:root:/root:/bin/bash\ntalaba:x:1000:1000::/home/talaba:/bin/bash\n' },
      tmp: {},
    },
  }),
  tasks: [
    {
      id: 'pwd',
      text: "Hozir qaysi katalogda turganingizni aniqlang.",
      hint: '`pwd` — print working directory.',
      solution: ['pwd'],
      check: ({ line }) => /^pwd\b/.test(line),
    },
    {
      id: 'ls',
      text: 'Shu katalog ichida nimalar borligini ko\'ring.',
      hint: '`ls` — list.',
      solution: ['ls'],
      check: ({ line }) => /^ls\b/.test(line),
    },
    {
      id: 'cat',
      text: '`salom.txt` faylini o\'qing.',
      hint: '`cat salom.txt`',
      solution: ['cat salom.txt'],
      check: ({ output }) => output.includes('asosiy ish qurolingiz'),
    },
    {
      id: 'cd',
      text: '`hujjatlar` katalogiga kiring.',
      hint: '`cd hujjatlar`',
      solution: ['cd hujjatlar'],
      check: ({ state }) => state.cwd === `${HOME}/hujjatlar`,
    },
    {
      id: 'hidden',
      text: 'Bu katalogda yashirin fayl bor. Uni ko\'rsatadigan qilib ro\'yxatni chiqaring.',
      hint: '`ls -a` — yashirin (nuqta bilan boshlanuvchi) fayllarni ham ko\'rsatadi.',
      solution: ['ls -a'],
      check: ({ output }) => output.includes('.maxfiy.txt'),
    },
    {
      id: 'secret',
      text: 'Yashirin faylni o\'qib, kalit so\'zni toping.',
      hint: '`cat .maxfiy.txt`',
      solution: ['cat .maxfiy.txt'],
      check: ({ output }) => output.includes('KUZATUVCHAN'),
    },
    {
      id: 'etc',
      text: 'Bir buyruq bilan `/etc` katalogiga o\'ting (mutlaq yo\'l bilan).',
      hint: '`cd /etc` — yo\'l `/` bilan boshlansa, u ildizdan hisoblanadi.',
      solution: ['cd /etc'],
      check: ({ state }) => state.cwd === '/etc',
    },
    {
      id: 'home',
      text: 'Uy katalogingizga qayting.',
      hint: '`cd ~` yoki shunchaki `cd`.',
      solution: ['cd'],
      check: ({ state }) => state.cwd === HOME,
    },
  ],
};

export const filesAndDirs: Lab = {
  id: 'fayllar-va-kataloglar',
  title: 'Fayllar va kataloglar',
  summary: "mkdir, touch, echo, cp, mv, rm, find — yaratish, nusxalash, ko'chirish, o'chirish.",
  minutes: 20,
  level: 1,
  intro:
    "Pentest paytida ham, tergov paytida ham natijalarni tartibli saqlash kerak. Bu labda ish papkasini yaratasiz va fayllar bilan asosiy amallarni bajarasiz.",
  shell: () => ({
    fs: {
      home: {
        talaba: {
          'eski-fayllar': { 'a.tmp': 'x\n', 'b.tmp': 'y\n', ichki: { 'c.tmp': 'z\n' } },
        },
      },
      var: { backups: { 'parollar.bak': 'admin:Qwerty123\n', 'tizim.bak': '...\n' } },
      tmp: {},
    },
  }),
  tasks: [
    {
      id: 'mkdir',
      text: 'Uy katalogingizda `loyiha` nomli katalog yarating.',
      hint: '`mkdir loyiha`',
      solution: ['mkdir loyiha'],
      check: ({ state }) => isDir(state, `${HOME}/loyiha`),
    },
    {
      id: 'touch',
      text: '`loyiha` ichida `eslatma.txt` nomli bo\'sh fayl yarating.',
      hint: '`cd loyiha` keyin `touch eslatma.txt` — yoki bir yo\'la `touch loyiha/eslatma.txt`.',
      solution: ['touch loyiha/eslatma.txt'],
      check: ({ state }) => fileAt(state, `${HOME}/loyiha/eslatma.txt`) !== null,
    },
    {
      id: 'write',
      text: 'Faylga `skanerlash tugadi` degan matnni yozing.',
      hint: '`echo "skanerlash tugadi" > loyiha/eslatma.txt` — `>` faylni qaytadan yozadi.',
      solution: ['echo "skanerlash tugadi" > loyiha/eslatma.txt'],
      check: ({ state }) => (fileAt(state, `${HOME}/loyiha/eslatma.txt`) ?? '').includes('skanerlash tugadi'),
    },
    {
      id: 'append',
      text: 'Birinchi qatorni o\'chirmasdan, ikkinchi qator qilib `hisobot yozilmoqda` ni qo\'shing.',
      hint: '`>>` oxiriga qo\'shadi: `echo "hisobot yozilmoqda" >> loyiha/eslatma.txt`',
      solution: ['echo "hisobot yozilmoqda" >> loyiha/eslatma.txt'],
      check: ({ state }) => {
        const text = fileAt(state, `${HOME}/loyiha/eslatma.txt`) ?? '';
        return text.includes('skanerlash tugadi') && text.includes('hisobot yozilmoqda');
      },
    },
    {
      id: 'cp',
      text: '`eslatma.txt` dan shu katalogda `zaxira.txt` nomli nusxa oling.',
      hint: '`cp loyiha/eslatma.txt loyiha/zaxira.txt`',
      solution: ['cp loyiha/eslatma.txt loyiha/zaxira.txt'],
      check: ({ state }) => (fileAt(state, `${HOME}/loyiha/zaxira.txt`) ?? '').includes('hisobot yozilmoqda'),
    },
    {
      id: 'mv',
      text: '`zaxira.txt` nomini `arxiv.txt` ga o\'zgartiring.',
      hint: 'Nom o\'zgartirish ham `mv`: `mv loyiha/zaxira.txt loyiha/arxiv.txt`',
      solution: ['mv loyiha/zaxira.txt loyiha/arxiv.txt'],
      check: ({ state }) =>
        fileAt(state, `${HOME}/loyiha/arxiv.txt`) !== null && fileAt(state, `${HOME}/loyiha/zaxira.txt`) === null,
    },
    {
      id: 'rm',
      text: 'Uy katalogingizdagi keraksiz `eski-fayllar` katalogini ichidagilari bilan o\'chiring.',
      hint: 'Katalog uchun `-r` kerak: `rm -r ~/eski-fayllar`',
      solution: ['rm -r ~/eski-fayllar'],
      check: ({ state }) => nodeAt(state, `${HOME}/eski-fayllar`) === null,
    },
    {
      id: 'find',
      text: 'Tizimda nomida `parol` so\'zi bor faylni toping.',
      hint: '`find / -name "*parol*"` — `*` istalgan belgilar o\'rnini bosadi.',
      solution: ['find / -name "*parol*"'],
      check: ({ output }) => output.includes('/var/backups/parollar.bak'),
    },
  ],
};

export const permissions: Lab = {
  id: 'ruxsatlar',
  title: 'Ruxsatlar va sudo',
  summary: "rwx ni o'qish, chmod, sudo va nega /etc/shadow hammaga ochiq emas.",
  minutes: 20,
  level: 2,
  intro:
    "Linux'da har bir fayl uchun uch guruh — **egasi**, **guruh** va **boshqalar** — alohida o'qish (r), yozish (w) va bajarish (x) huquqiga ega. Noto'g'ri ruxsat — eng ko'p uchraydigan xavfsizlik xatolaridan biri.",
  shell: () => ({
    fs: {
      home: {
        talaba: {
          'skript.sh': '#!/bin/bash\necho "Skaner ishga tushdi"\n',
          'kalit.pem': '-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASC...\n-----END PRIVATE KEY-----\n',
        },
      },
      etc: {
        passwd: 'root:x:0:0:root:/root:/bin/bash\ntalaba:x:1000:1000::/home/talaba:/bin/bash\n',
        shadow: file('root:$6$Zk1x$9aV...xesh...:19800:0:99999:7:::\ntalaba:$6$Qp8m$3fT...xesh...:19800:0:99999:7:::\n', 0o640),
      },
      srv: { 'hisobot.txt': file('Choraklik hisobot: 3 ta jiddiy zaiflik topildi.\n', 0o600) },
      tmp: {},
    },
  }),
  tasks: [
    {
      id: 'ls-l',
      text: 'Uy katalogingizdagi fayllarning ruxsatlarini batafsil ko\'ring.',
      hint: '`ls -l` — birinchi ustun ruxsatlar: `-rw-r--r--`.',
      solution: ['ls -l'],
      check: ({ line, output }) => /^ls\b.*-\w*l/.test(line) && output.includes('kalit.pem'),
    },
    {
      id: 'denied',
      text: 'Parol xeshlari saqlanadigan `/etc/shadow` faylini o\'qib ko\'ring.',
      hint: '`cat /etc/shadow` — xato chiqishi kerak. Aynan shu xatoni ko\'rish topshiriq.',
      solution: ['cat /etc/shadow'],
      check: ({ line, output }) => !line.startsWith('sudo') && output.includes('Permission denied'),
    },
    {
      id: 'sudo',
      text: 'Endi o\'sha faylni administrator (root) huquqi bilan o\'qing.',
      hint: '`sudo cat /etc/shadow`',
      solution: ['sudo cat /etc/shadow'],
      check: ({ output }) => output.includes('root:$6$'),
    },
    {
      id: 'chmod-600',
      text: 'Maxfiy kalit `kalit.pem` ni hozir hamma o\'qiy oladi. Uni faqat egasi o\'qiy va yoza oladigan qiling.',
      hint: '`chmod 600 kalit.pem` — 6 = rw- (egasi), 0 = --- (guruh), 0 = --- (boshqalar).',
      solution: ['chmod 600 kalit.pem'],
      check: ({ state }) => modeAt(state, `${HOME}/kalit.pem`) === 0o600,
    },
    {
      id: 'chmod-x',
      text: '`skript.sh` ga egasi uchun bajarish (execute) huquqini bering.',
      hint: '`chmod u+x skript.sh` — u = egasi (user), + = qo\'shish, x = bajarish.',
      solution: ['chmod u+x skript.sh'],
      check: ({ state }) => ((modeAt(state, `${HOME}/skript.sh`) ?? 0) & 0o100) !== 0,
    },
    {
      id: 'id',
      text: 'Qaysi foydalanuvchi ekaningizni va qaysi guruhlarda turganingizni ko\'ring.',
      hint: '`id`',
      solution: ['id'],
      check: ({ line }) => /^id\b/.test(line),
    },
    {
      id: 'root-file',
      text: '`/srv/hisobot.txt` root\'ga tegishli va yopiq. Uni hamma o\'qiy oladigan (644) qiling.',
      hint: 'Fayl sizniki emas, shuning uchun `sudo` kerak: `sudo chmod 644 /srv/hisobot.txt`',
      solution: ['sudo chmod 644 /srv/hisobot.txt'],
      check: ({ state }) => modeAt(state, '/srv/hisobot.txt') === 0o644,
    },
    {
      id: 'read',
      text: 'Endi hisobotni `sudo`siz o\'qing.',
      hint: '`cat /srv/hisobot.txt`',
      solution: ['cat /srv/hisobot.txt'],
      check: ({ line, output }) => !line.startsWith('sudo') && output.includes('Choraklik hisobot'),
    },
  ],
};
