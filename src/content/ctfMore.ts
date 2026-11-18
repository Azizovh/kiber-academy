import { dir, file } from '../engine/terminal/fs';
import { sha256Hex } from '../engine/terminal/text';
import type { CtfChallenge } from './types';

/*
 * The second set of CTF challenges: Linux administration, logs, AppSec and cloud. Flags are stored as hashes; the
 * plain answers and a scripted solution for every terminal challenge live in content.test.ts.
 */

/* ── shared data ───────────────────────────────────────────────────────── */

const LOGIN_ORIGINAL = 'ELF login (shadow-utils 4.13)\n';
const BIN_FILES: Record<string, string> = {
  '/usr/bin/login': LOGIN_ORIGINAL,
  '/usr/bin/passwd': 'ELF passwd (shadow-utils 4.13)\n',
  '/usr/bin/sudo': 'ELF sudo 1.9.15p5\n',
  '/usr/sbin/sshd': 'ELF sshd OpenSSH_9.6p1\n',
  '/usr/bin/crontab': 'ELF crontab (cronie 1.7)\n',
};
const INTEGRITY_BASELINE =
  Object.entries(BIN_FILES)
    .map(([p, c]) => `${sha256Hex(c)}  ${p}`)
    .join('\n') + '\n';

function webScanLog(): string {
  const rows: string[] = [];
  const add = (ip: string, t: string, req: string, code: number, ua: string) =>
    rows.push(`${ip} - - [18/Nov/2026:${t} +0000] "${req} HTTP/1.1" ${code} ${code === 200 ? 1840 : 162} "-" "${ua}"`);
  const ua = 'Mozilla/5.0 (X11; Linux x86_64) Firefox/132.0';
  add('192.0.2.14', '11:00:02', 'GET /', 200, ua);
  add('192.0.2.14', '11:00:09', 'GET /search?q=parol', 200, ua);
  for (let i = 0; i < 9; i++) {
    add('198.51.100.61', `11:0${2 + Math.floor(i / 3)}:${String(10 + i * 5).padStart(2, '0')}`, `GET /search?q=test${i}`, i % 3 ? 500 : 200, 'sqlmap/1.8.11#stable (https://sqlmap.org)');
  }
  add('203.0.113.5', '11:04:40', 'GET /', 200, 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1) Safari/604.1');
  add('192.0.2.14', '11:05:01', 'GET /notes', 200, ua);
  return rows.join('\n') + '\n';
}

function authLogWithUseradd(): string {
  return [
    'Nov 18 01:02:44 srv03 sshd[1201]: Failed password for root from 203.0.113.88 port 51234 ssh2',
    'Nov 18 01:02:51 srv03 sshd[1201]: Failed password for deploy from 203.0.113.88 port 51240 ssh2',
    'Nov 18 01:03:12 srv03 sshd[1207]: Accepted password for deploy from 203.0.113.88 port 51262 ssh2',
    'Nov 18 01:03:12 srv03 sshd[1207]: pam_unix(sshd:session): session opened for user deploy(uid=1001) by (uid=0)',
    'Nov 18 01:04:30 srv03 sudo:   deploy : TTY=pts/1 ; PWD=/home/deploy ; USER=root ; COMMAND=/usr/bin/id',
    'Nov 18 01:05:02 srv03 sudo:   deploy : TTY=pts/1 ; PWD=/home/deploy ; USER=root ; COMMAND=/usr/sbin/useradd -m -s /bin/bash support',
    'Nov 18 01:05:02 srv03 useradd[1288]: new group: name=support, GID=1002',
    'Nov 18 01:05:02 srv03 useradd[1288]: new user: name=support, UID=1002, GID=1002, home=/home/support, shell=/bin/bash, from=/dev/pts/1',
    'Nov 18 01:05:40 srv03 sudo:   deploy : TTY=pts/1 ; PWD=/home/deploy ; USER=root ; COMMAND=/usr/sbin/usermod -aG sudo support',
    'Nov 18 01:06:11 srv03 sshd[1207]: pam_unix(sshd:session): session closed for user deploy',
    'Nov 18 07:45:03 srv03 sshd[1502]: Accepted publickey for talaba from 10.10.20.31 port 50122 ssh2',
    '',
  ].join('\n');
}

function dnsLog(): string {
  const rows: string[] = [];
  const normal: [string, string][] = [
    ['10.10.20.31', 'www.google.com'],
    ['10.10.20.31', 'outlook.office365.com'],
    ['10.10.20.44', 'github.com'],
    ['10.10.20.44', 'api.github.com'],
    ['10.10.20.31', 'teams.microsoft.com'],
    ['10.10.20.52', 'update.microsoft.com'],
  ];
  const hex = ['4a6f2e91', 'c03b7d12', '9e11f0aa', '27bd6c4e', 'f5a90233', '0d7e81bc', 'b8c4129f', '6a03ee57', '31f9d0c8', 'e7b25a14'];
  for (let i = 0; i < hex.length; i++) {
    const mm = String(i).padStart(2, '0');
    rows.push(`2026-11-18T03:${mm}:01Z client=10.10.20.47 query=${hex[i]}.example-sync.net type=TXT`);
    if (i < normal.length) rows.push(`2026-11-18T03:${mm}:${String(17 + i * 3).padStart(2, '0')}Z client=${normal[i]![0]} query=${normal[i]![1]} type=A`);
  }
  rows.push('2026-11-18T03:11:40Z client=10.10.20.31 query=www.google.com type=A');
  return rows.join('\n') + '\n';
}

function trailWithUser(): string {
  const base = (time: string, eventName: string, extra: Record<string, unknown> = {}) =>
    JSON.stringify({
      eventTime: `2026-11-18T${time}Z`,
      eventSource: 'iam.amazonaws.com',
      eventName,
      awsRegion: 'us-east-1',
      sourceIPAddress: extra.ip ?? '198.51.100.99',
      userIdentity: { type: 'IAMUser', userName: extra.user ?? 'build-bot' },
      ...(extra.req ? { requestParameters: extra.req } : {}),
    });
  return (
    [
      base('08:10:00', 'GetUser', { ip: '192.0.2.50' }),
      base('19:20:05', 'GetCallerIdentity'),
      base('19:21:30', 'ListUsers'),
      base('19:22:02', 'CreateUser', { req: { userName: 'ops-temp' } }),
      base('19:22:15', 'CreateLoginProfile', { req: { userName: 'ops-temp', passwordResetRequired: false } }),
      base('19:22:40', 'AttachUserPolicy', { req: { userName: 'ops-temp', policyArn: 'arn:aws:iam::aws:policy/AdministratorAccess' } }),
      base('19:30:12', 'ListBuckets', { user: 'ops-temp' }),
    ].join('\n') + '\n'
  );
}

/* ── challenges ────────────────────────────────────────────────────────── */

export const CTF_MORE: CtfChallenge[] = [
  // ── Linux administration
  {
    id: 'lin-cron',
    title: 'Har o\'n daqiqada',
    category: 'linux',
    level: 2,
    description:
      "Serverda kimdir doimiy kirish yo'lini (persistence) qoldirgan: tizim har o'n daqiqada nimanidir bajaradi. Rejalashtirilgan vazifalarni tekshiring va yashirilgan buyruqni oching.",
    hints: [
      'Tizim bo\'yicha rejalashtirilgan vazifalar `/etc/cron.d/` va `/etc/crontab` da turadi.',
      "`*/10` — har o'n daqiqada. Qatordagi uzun satr Base64 ga o'xshaydi.",
      '`echo SATR | base64 -d`',
    ],
    flagHash: '0f6804d334c96b',
    shell: () => ({
      host: 'srv03',
      fs: {
        home: { talaba: {} },
        etc: {
          crontab: 'SHELL=/bin/sh\n17 * * * * root cd / && run-parts --report /etc/cron.hourly\n',
          'cron.d': {
            logrotate: '0 3 * * * root /usr/sbin/logrotate /etc/logrotate.conf\n',
            sysupdate: '*/10 * * * * root echo ZmxhZ3tjcm9uX2RvaW1fdGVrc2hpcmlsYWRpfQ== | base64 -d | sh\n',
          },
        },
        tmp: {},
      },
    }),
  },
  {
    id: 'lin-fake-process',
    title: 'Soxta sshd',
    category: 'linux',
    level: 1,
    description:
      "Jarayonlar ro'yxatida ikkita `sshd` bor. Bittasi haqiqiy SSH serveri, ikkinchisi unga o'xshatib qo'yilgan. Soxtasining PID'ini toping.\n\nFlag formati: `flag{PID}` — masalan `flag{1234}`.",
    hints: [
      '`ps aux` — har jarayonning to\'liq buyruq qatorini ko\'ring.',
      "Haqiqiy sshd `/usr/sbin/sshd` dan, root nomidan ishlaydi. `/dev/shm` — xotiradagi vaqtinchalik katalog, dastur o'rni emas.",
    ],
    flagHash: '07eff915cc624b',
    shell: () => ({
      host: 'srv03',
      fs: { home: { talaba: {} }, tmp: {} },
      system: {
        procs: [
          { pid: 1, ppid: 0, user: 'root', cmd: '/sbin/init' },
          { pid: 512, ppid: 1, user: 'root', cmd: 'sshd: /usr/sbin/sshd -D [listener] 0 of 10-100 startups' },
          { pid: 690, ppid: 1, user: 'root', cmd: '/usr/sbin/cron -f' },
          { pid: 3317, ppid: 1, user: 'www-data', cmd: '/dev/shm/.sshd -k -p 8443', cpu: 12.4 },
          { pid: 3402, ppid: 512, user: 'root', cmd: 'sshd: talaba [priv]' },
          { pid: 3410, ppid: 3402, user: 'talaba', cmd: '-bash' },
        ],
      },
    }),
  },
  {
    id: 'lin-suid',
    title: 'Root nomidan',
    category: 'linux',
    level: 2,
    description:
      "Serverdagi SUID dasturlarni tekshiring. Standart tizim dasturlaridan tashqari bittasi bor — u har kim ishga tushirganda root huquqi bilan ishlaydi. Uning **fayl nomi** qanday?\n\nFlag formati: `flag{fayl_nomi}`.",
    hints: ['`find / -perm -4000 -type f` — SUID bit o\'rnatilgan fayllar.', 'passwd, su, sudo, mount odatiy. /opt ichidagi dastur — qo\'lda o\'rnatilgan.'],
    flagHash: '126efedd922651',
    shell: () => ({
      fs: {
        home: { talaba: {} },
        usr: {
          bin: {
            passwd: file('ELF passwd\n', 0o4755),
            su: file('ELF su\n', 0o4755),
            sudo: file('ELF sudo\n', 0o4755),
            mount: file('ELF mount\n', 0o4755),
            ls: file('ELF ls\n', 0o755),
          },
        },
        opt: { tools: { netdiag: file('ELF netdiag 0.3 (vendor tool)\n', 0o4755), 'README.txt': 'Tarmoq diagnostikasi.\n' } },
        tmp: {},
      },
    }),
  },
  {
    id: 'for-integrity',
    title: 'Kim o\'zgardi?',
    category: 'forensics',
    level: 3,
    description:
      "O'rnatishdan keyin tizim fayllarining SHA-256 xeshlari `/root/baseline.sha256` ga yozib qo'yilgan. Bugun ulardan biri boshqacha. Qaysi dastur almashtirilgan?\n\nFlag formati: `flag{dastur_nomi}` — masalan `flag{ls}`.",
    hints: [
      'Fayl root\'niki — o\'qish uchun `sudo` kerak.',
      '`sha256sum -c` ro\'yxatdagi har bir faylni qayta xeshlab, solishtiradi.',
      '`sudo sha256sum -c /root/baseline.sha256`',
    ],
    flagHash: '159344f14d0296',
    shell: () => ({
      fs: {
        home: { talaba: {} },
        root: dir({ 'baseline.sha256': INTEGRITY_BASELINE }, 0o700),
        usr: {
          bin: {
            login: 'ELF login (shadow-utils 4.13)\n# pam bypass: magic password\n',
            passwd: BIN_FILES['/usr/bin/passwd']!,
            sudo: BIN_FILES['/usr/bin/sudo']!,
            crontab: BIN_FILES['/usr/bin/crontab']!,
          },
          sbin: { sshd: BIN_FILES['/usr/sbin/sshd']! },
        },
        tmp: {},
      },
    }),
  },

  // ── Logs
  {
    id: 'log-webscan',
    title: 'Avtomatik mehmon',
    category: 'loglar',
    level: 1,
    description:
      "`/var/log/nginx/access.log` da qidiruv sahifasiga avtomatik vosita bilan hujum qilingan. Qaysi IP dan va qaysi vosita bilan?\n\nFlag formati: `flag{IP_vosita}` — vosita nomi kichik harflarda, versiyasiz. Masalan `flag{1.2.3.4_curl}`.",
    hints: [
      "User-Agent — qatordagi oxirgi qo'shtirnoq ichidagi qism: `awk -F'\"' '{print $6}'`.",
      "`awk '{print $1}' access.log | sort | uniq -c` — eng faol IP.",
      '500 javoblari — vosita so\'rovlari ilovada xato chaqirgan.',
    ],
    flagHash: '0a11e4895a97b4',
    shell: () => ({
      fs: { home: { talaba: {} }, var: { log: { nginx: { 'access.log': webScanLog() } } }, tmp: {} },
      cwd: '/var/log/nginx',
    }),
  },
  {
    id: 'log-useradd',
    title: 'Yangi hamkasb',
    category: 'loglar',
    level: 2,
    description:
      "Kechasi `srv03` ga SSH orqali kirishgan. Hujumchi ketishdan oldin o'zi uchun qaytib kirish yo'lini qoldirgan. `/var/log/auth.log` dan toping: u qanday nomli foydalanuvchi yaratdi?\n\nFlag formati: `flag{foydalanuvchi}`.",
    hints: ['`grep -i useradd /var/log/auth.log`', "`sudo` qatorlari — kim, qachon, qaysi buyruqni root nomidan bajarganini ko'rsatadi."],
    flagHash: '1def5bf8fceff1',
    shell: () => ({ fs: { home: { talaba: {} }, var: { log: { 'auth.log': authLogWithUseradd() } }, tmp: {} } }),
  },
  {
    id: 'log-timeline',
    title: 'Necha daqiqa?',
    category: 'loglar',
    level: 3,
    description:
      "Insident hisobotida \"hujumning davomiyligi\" so'ralgan: hujumchi IP'sidan **birinchi** muvaffaqiyatsiz urinishdan **birinchi** muvaffaqiyatli kirishgacha necha daqiqa o'tgan? Log parchasi quyida.\n\nFlag formati: `flag{daqiqalar}` — butun son, masalan `flag{15}`.",
    data: [
      'Nov 18 00:58:30 srv sshd[880]: Accepted publickey for talaba from 10.10.20.31 port 50020 ssh2',
      'Nov 18 01:03:10 srv sshd[901]: Failed password for root from 203.0.113.45 port 41001 ssh2',
      'Nov 18 01:03:19 srv sshd[901]: Failed password for root from 203.0.113.45 port 41007 ssh2',
      'Nov 18 01:05:02 srv sshd[912]: Failed password for admin from 198.51.100.7 port 39004 ssh2',
      'Nov 18 01:20:44 srv sshd[930]: Failed password for deploy from 203.0.113.45 port 41190 ssh2',
      'Nov 18 01:31:05 srv sshd[947]: Accepted password for ali from 10.10.20.44 port 50991 ssh2',
      'Nov 18 01:47:10 srv sshd[960]: Accepted password for deploy from 203.0.113.45 port 41420 ssh2',
      'Nov 18 01:52:33 srv sshd[960]: Failed password for root from 203.0.113.45 port 41455 ssh2',
    ].join('\n'),
    hints: [
      'Faqat 203.0.113.45 qatorlarini oling. Boshqa IP va foydalanuvchilarning muvaffaqiyatli kirishlari — chalg\'ituvchi.',
      'Birinchi Failed: 01:03:10. Birinchi Accepted: shu IP dan keyingi Accepted qatori. Soniyalar teng bo\'lsa, farq butun daqiqa.',
    ],
    flagHash: '1dd26f0f24e87b',
  },
  {
    id: 'log-dns',
    title: 'Tungi so\'rovlar',
    category: 'loglar',
    level: 3,
    description:
      "Ofisda hech kim yo'q paytdagi DNS so'rovlari `/var/log/dns.log` da. Bitta kompyuter har daqiqada tasodifiy ko'rinishdagi subdomenlarni so'ramoqda — bu beaconing yoki DNS orqali ma'lumot chiqarish belgisi. Qaysi **domen** ishlatilmoqda?\n\nFlag formati: `flag{domen}` — ikkinchi darajali domen, masalan `flag{example.com}`.",
    hints: [
      "`cut -d= -f3 /var/log/dns.log | cut -d' ' -f1` — faqat so'ralgan nomlar.",
      "Domenning oxirgi ikki qismini ajratish: `rev | cut -d. -f1,2 | rev`, keyin `sort | uniq -c | sort -rn`.",
      "Shubhali belgilar: tunda, muntazam oraliq, har safar yangi tasodifiy subdomen, TXT turi.",
    ],
    flagHash: '0adfda264e5f0b',
    shell: () => ({ fs: { home: { talaba: {} }, var: { log: { 'dns.log': dnsLog() } }, tmp: {} } }),
  },
  {
    id: 'for-phish',
    title: 'Bankdan xat',
    category: 'forensics',
    level: 2,
    description:
      "Xodim \"bank\"dan kelgan xatni SOC'ga yubordi. Xatning sarlavhalari quyida. Ko'rinishdagi jo'natuvchi — `mybank.uz`. Xat **aslida** qaysi domendan yuborilgan?\n\nFlag formati: `flag{domen}`.",
    data: `Return-Path: <billing@mybank-secure.example>
Received: from mail.mybank-secure.example (mail.mybank-secure.example [198.51.100.140])
        by mx.qaydnoma.example.com with ESMTPS id 4f1c2a
        for <d.karimova@qaydnoma.example.com>; Tue, 18 Nov 2026 08:41:12 +0000
Authentication-Results: mx.qaydnoma.example.com;
       spf=pass (domain of billing@mybank-secure.example designates 198.51.100.140 as permitted sender) smtp.mailfrom=mybank-secure.example;
       dkim=pass header.d=mybank-secure.example;
       dmarc=fail (p=reject) header.from=mybank.uz
From: "MyBank Xavfsizlik xizmati" <security@mybank.uz>
Reply-To: <support@mybank-secure.example>
Subject: Hisobingiz vaqtincha bloklandi
Date: Tue, 18 Nov 2026 13:41:05 +0500`,
    hints: [
      "`From:` — xatda ko'rsatiladigan manzil, uni istalgan narsa qilib yozish mumkin.",
      "Haqiqiy jo'natuvchini `Return-Path`, `Received` va `smtp.mailfrom` ko'rsatadi. SPF va DKIM shu domen uchun o'tgan, DMARC esa `From` domeni uchun yiqilgan.",
    ],
    flagHash: '185dc75d3104f3',
  },

  // ── AppSec / web
  {
    id: 'web-jwt',
    title: 'Token ichida nima bor?',
    category: 'web',
    level: 1,
    description:
      "Ilovaning brauzerda saqlangan tokeni quyida. JWT shifrlanmaydi — faqat imzolanadi. Token kimga tegishli va unda qanday rol yozilgan?\n\nFlag formati: `flag{foydalanuvchi_rol}` — masalan `flag{ali_admin}`.",
    data: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjoiYXppeiIsInJvbGUiOiJhdWRpdG9yIiwidGVhbSI6InJpc2siLCJleHAiOjE3OTUwNDY0MDB9.Vh3mQ0pLx9sT2aK7nE1wR5yB8cZ4dF6gJ0uI3oP',
    hints: [
      'JWT uch qismdan iborat, nuqta bilan ajratilgan: header.payload.signature.',
      "O'rta qism — Base64: `echo PAYLOAD | base64 -d` yoki CyberChef'dagi \"From Base64\".",
    ],
    flagHash: '06b61695f1be51',
  },
  {
    id: 'web-headers',
    title: 'Qaysi sarlavha yo\'q?',
    category: 'web',
    level: 1,
    description:
      "HTTPS orqali ishlaydigan saytning javob sarlavhalari quyida. To'rtta asosiy xavfsizlik sarlavhasidan (CSP, X-Content-Type-Options, X-Frame-Options, HSTS) bittasi yetishmaydi. Qaysi biri?\n\nFlag formati: `flag{sarlavha-nomi}` — kichik harflarda, masalan `flag{x-frame-options}`.",
    data: `HTTP/2 200
date: Wed, 18 Nov 2026 09:12:44 GMT
content-type: text/html; charset=utf-8
content-security-policy: default-src 'self'; script-src 'self'; object-src 'none'
x-content-type-options: nosniff
x-frame-options: DENY
referrer-policy: strict-origin-when-cross-origin
set-cookie: sid=9f2c...; Path=/; Secure; HttpOnly; SameSite=Lax
cache-control: no-store`,
    hints: [
      'Har bir sarlavhani nomi bo\'yicha ro\'yxat bilan solishtiring.',
      "Yetishmayotgani brauzerga \"bu saytga keyingi safar ham faqat HTTPS orqali kir\" deydi.",
    ],
    flagHash: '17ceb14ae3ea90',
  },
  {
    id: 'web-code-review',
    title: 'Kod tekshiruvi',
    category: 'web',
    level: 2,
    description:
      "Pull request'dagi Flask kodi quyida (qator raqamlari bilan). Qaysi qatorda SQL injection'ga olib keladigan xato bor?\n\nFlag formati: `flag{qator_raqami}` — masalan `flag{7}`.",
    data: ` 1  from flask import Flask, request, abort
 2  from db import get_conn
 3  from auth import login_required, current_user
 4
 5  app = Flask(__name__)
 6
 7  @app.get("/api/v1/notes")
 8  @login_required
 9  def list_notes():
10      sort = request.args.get("sort", "created_at")
11      if sort not in ("created_at", "title"):
12          abort(400)
13      q = request.args.get("q", "")
14      sql = f"SELECT id, title FROM notes WHERE owner_id = {current_user.id} AND title LIKE '%{q}%' ORDER BY {sort}"
15      rows = get_conn().execute(sql).fetchall()
16      return {"notes": [dict(r) for r in rows]}
17
18  @app.get("/api/v1/notes/<int:note_id>")
19  @login_required
20  def get_note(note_id):
21      row = get_conn().execute(
22          "SELECT id, title, body FROM notes WHERE id = ? AND owner_id = ?",
23          (note_id, current_user.id),
24      ).fetchone()
25      return dict(row) if row else abort(404)`,
    hints: [
      "Foydalanuvchidan keladigan qiymatlar: `request.args` dan olinganlar. Ulardan qaysi biri tekshiruvsiz SQL matniga qo'shilyapti?",
      "`sort` ruxsat etilganlar ro'yxati (allowlist) bilan tekshirilgan. `note_id` parametr sifatida (`?`) uzatilgan. f-string ichidagi `q` esa…",
    ],
    flagHash: '0448139cad4192',
  },
  {
    id: 'web-authz',
    title: 'Rol tekshiruvi qayerda?',
    category: 'web',
    level: 2,
    description:
      "API jurnalidan parcha: har qatorda foydalanuvchi, uning roli, so'rov va javob kodi. Oddiy foydalanuvchi (`role=user`) admin funksiyasidan muvaffaqiyatli foydalangan. Qaysi endpoint rolni tekshirmaydi?\n\nFlag formati: `flag{yo'l}` — masalan `flag{/api/v1/admin/users}`.",
    data: `2026-11-18T10:01:12Z uid=17 role=user    GET  /api/v1/notes                 200
2026-11-18T10:01:40Z uid=17 role=user    GET  /api/v1/admin/users           403
2026-11-18T10:02:03Z uid=2  role=admin   GET  /api/v1/admin/users           200
2026-11-18T10:02:15Z uid=17 role=user    POST /api/v1/admin/users/17/role   403
2026-11-18T10:02:31Z uid=17 role=user    GET  /api/v1/admin/export          200
2026-11-18T10:02:58Z uid=2  role=admin   GET  /api/v1/admin/export          200
2026-11-18T10:03:20Z uid=17 role=user    GET  /api/v1/admin/audit-log       403`,
    hints: ["`role=user` va `/admin/` bo'lgan qatorlarni oling.", 'Ulardan qaysi biri 403 emas, 200 qaytargan?'],
    flagHash: '0ce35e37ed6c4f',
  },

  // ── Cloud
  {
    id: 'cloud-s3-policy',
    title: 'Ochiq bucket',
    category: 'cloud',
    level: 1,
    description:
      "Quyida ikki bucket siyosati. Biri ataylab ommaviy (saytdagi rasmlar uchun). Ikkinchisida xato bor: istalgan kishi uning **fayllar ro'yxatini** ko'ra oladi. Qaysi bucket?\n\nFlag formati: `flag{bucket-nomi}`.",
    data: `// 1-siyosat
{
  "Version": "2012-10-17",
  "Statement": [{
    "Sid": "PublicReadAssets",
    "Effect": "Allow",
    "Principal": "*",
    "Action": "s3:GetObject",
    "Resource": "arn:aws:s3:::qaydnoma-public-assets/*"
  }]
}

// 2-siyosat
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "BackupWriter",
      "Effect": "Allow",
      "Principal": { "AWS": "arn:aws:iam::111122223333:role/backup-job" },
      "Action": ["s3:PutObject"],
      "Resource": "arn:aws:s3:::qaydnoma-backups/*"
    },
    {
      "Sid": "TempDebug",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:ListBucket",
      "Resource": "arn:aws:s3:::qaydnoma-backups"
    }
  ]
}`,
    hints: [
      '`"Principal": "*"` — hamma, jumladan autentifikatsiyadan o\'tmaganlar.',
      "`s3:ListBucket` — bucket ichidagi fayllar ro'yxatini ko'rish. Resurs — bucket'ning o'zi (oxirida /* yo'q).",
    ],
    flagHash: '04c8a6887710d0',
  },
  {
    id: 'cloud-sg',
    title: 'Ochiq port',
    category: 'cloud',
    level: 1,
    description:
      "Ilova serverining security group qoidalari quyida. Ulardan biri ma'lumotlar bazasini butun internetga ochib qo'ygan. Qaysi port?\n\nFlag formati: `flag{port}`.",
    data: `{
  "GroupName": "qaydnoma-app-sg",
  "IpPermissions": [
    { "IpProtocol": "tcp", "FromPort": 443,  "ToPort": 443,  "IpRanges": [{ "CidrIp": "0.0.0.0/0", "Description": "HTTPS" }] },
    { "IpProtocol": "tcp", "FromPort": 22,   "ToPort": 22,   "IpRanges": [{ "CidrIp": "10.10.0.0/16", "Description": "SSH from VPN" }] },
    { "IpProtocol": "tcp", "FromPort": 5432, "ToPort": 5432, "IpRanges": [{ "CidrIp": "0.0.0.0/0", "Description": "temp - migration" }] },
    { "IpProtocol": "tcp", "FromPort": 8000, "ToPort": 8000, "UserIdGroupPairs": [{ "GroupId": "sg-0alb1234", "Description": "from ALB" }] }
  ]
}`,
    hints: ['`0.0.0.0/0` — butun internet. Shunday ikkita qoida bor.', '443 — sayt uchun kerak. Ikkinchisi qaysi xizmatning standart porti?'],
    flagHash: '0b5113850d917a',
  },
  {
    id: 'cloud-iam',
    title: 'Ruxsat bormi?',
    category: 'cloud',
    level: 3,
    description:
      "`report-app` roli uchun uchta siyosat amal qiladi. Rol `qaydnoma-reports` bucket'ida quyidagi to'rt amaldan qaysilarini **haqiqatan** bajara oladi: `s3:GetObject`, `s3:PutObject`, `s3:DeleteObject`, `s3:ListBucket`?\n\nFlag formati: ruxsat etilgan amallar nomi (`s3:` siz), kichik harflarda, alifbo tartibida, pastki chiziq bilan: masalan `flag{deleteobject_listbucket}`.",
    data: `// Identity policy (rolga biriktirilgan)
{ "Effect": "Allow", "Action": "s3:*",
  "Resource": ["arn:aws:s3:::qaydnoma-reports", "arn:aws:s3:::qaydnoma-reports/*"] }

// Permission boundary
{ "Effect": "Allow",
  "Action": ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"],
  "Resource": "*" }

// SCP (tashkilot darajasida)
[{ "Effect": "Allow", "Action": "*", "Resource": "*" },
 { "Effect": "Deny", "Action": "s3:DeleteObject", "Resource": "*" }]`,
    hints: [
      "Haqiqiy ruxsat = identity Allow ∩ boundary ∩ SCP. Boundary va SCP ruxsat bermaydi — faqat chegarani belgilaydi.",
      "ListBucket boundary'da yo'q. DeleteObject SCP'da aniq Deny — u har qanday Allow'dan ustun.",
    ],
    flagHash: '0a2862fb0bb83c',
  },
  {
    id: 'cloud-trail-user',
    title: 'Yangi admin',
    category: 'cloud',
    level: 2,
    description:
      "`build-bot` kaliti notanish IP'dan ishlatilgan. `cloudtrail.json` dan aniqlang: hujumchi qaysi IAM foydalanuvchisini yaratib, unga administrator huquqini berdi?\n\nFlag formati: `flag{foydalanuvchi}`.",
    hints: [
      "`jq -c 'select(.eventName == \"CreateUser\")' cloudtrail.json`",
      "Keyin `AttachUserPolicy` — qaysi siyosat biriktirilganini ham ko'ring.",
    ],
    flagHash: '050125b4f63935',
    shell: () => ({ fs: { home: { talaba: { 'cloudtrail.json': trailWithUser() } }, tmp: {} } }),
  },

  // ── Crypto
  {
    id: 'cry-hash-id',
    title: 'Qaysi xesh?',
    category: 'kripto',
    level: 1,
    description:
      "Eski bazadan uchta foydalanuvchining parol xeshlari topildi. Ulardan biri parol saqlash uchun yaroqsiz — tez ishlaydigan umumiy xesh funksiyasi bilan, saltsiz yaratilgan. U qaysi algoritm?\n\nFlag formati: `flag{algoritm}` — kichik harflarda, masalan `flag{md5}`.",
    data: `ali     $2b$12$Q9fN1uXr1y5o9z3pF0kGPeA1vG2dB8fV6uS0mL3wQ7eR4tY9iO2a
vali    5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8
sardor  $argon2id$v=19$m=65536,t=3,p=4$c2FsdHNhbHQ$0Z3Y8m4Q1r9T2wX5vB7nK6`,
    hints: [
      '`$2b$` — bcrypt, `$argon2id$` — Argon2id: ikkalasi ham salt va sekinlikni o\'z ichiga oladi.',
      "Ikkinchisi — 64 ta hex belgi, ya'ni 256 bit. Hech qanday prefiks va salt yo'q.",
    ],
    flagHash: '0c4305c43c9702',
  },
];
