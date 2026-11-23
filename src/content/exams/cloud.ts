import type { Exam, ExamPractical } from '../examTypes';
import type { Row, SiemResult } from '../../engine/siem/types';
import { cell, column } from '../../engine/siem';
import { parseBank } from '../../engine/exam';
import { oneNumber, prng, utc } from '../labs/siem';
import { kql } from '../labs/run';
import { fileAt, modeAt } from '../labs/helpers';
import { CLOUD_BANK } from './cloudBank';

const single = (output: string) => output.trim().split('\n').filter((l) => l.trim()).length === 1;
const ok = (r: SiemResult | undefined): r is SiemResult => !!r && !r.error && r.rows.length > 0;

/* ── practical 1: CloudTrail in Sentinel ─────────────────────────────── */

const ATTACKER = '198.51.100.201';
const APP_IP = '203.0.113.20';
const NEW_USER = 'support-ops';

function trail(): Row[] {
  const rnd = prng(2026112);
  const rows: Row[] = [];
  const t0 = utc('2026-11-21T00:00:00Z');
  const ev = (t: number, name: string, source: string, user: string, ip: string, region: string, params: string, error = '') =>
    rows.push({ TimeGenerated: t, EventName: name, EventSource: source, UserIdentityUserName: user, SourceIpAddress: ip, AWSRegion: region, ErrorCode: error, RequestParameters: params });
  // The reporting job reads its bucket all day from the application server.
  for (let i = 0; i < 46; i++) ev(t0 + i * 1800 + Math.floor(rnd() * 600), 'GetObject', 's3.amazonaws.com', 'report-svc', APP_IP, 'eu-central-1', `{"bucketName":"qaydnoma-reports","key":"daily/${i}.csv"}`);
  // Administrators at the office.
  for (let i = 0; i < 12; i++) ev(t0 + 30000 + i * 900, ['DescribeInstances', 'ListBuckets', 'GetBucketPolicy', 'DescribeSecurityGroups'][i % 4]!, i % 2 ? 's3.amazonaws.com' : 'ec2.amazonaws.com', 'r.sobirov', '192.0.2.10', 'eu-central-1', '{}');
  ev(t0 + 33000, 'ConsoleLogin', 'signin.amazonaws.com', 'r.sobirov', '192.0.2.10', 'eu-central-1', '{}');
  // The leaked report-svc key used from outside.
  const a = t0 + 50000;
  const steps: [number, string, string, string, string, string][] = [
    [0, 'GetCallerIdentity', 'sts.amazonaws.com', 'us-east-1', '{}', ''],
    [40, 'ListBuckets', 's3.amazonaws.com', 'us-east-1', '{}', ''],
    [75, 'ListUsers', 'iam.amazonaws.com', 'us-east-1', '{}', ''],
    [130, 'CreateUser', 'iam.amazonaws.com', 'us-east-1', `{"userName":"${NEW_USER}"}`, ''],
    [150, 'CreateAccessKey', 'iam.amazonaws.com', 'us-east-1', `{"userName":"${NEW_USER}"}`, ''],
    [170, 'AttachUserPolicy', 'iam.amazonaws.com', 'us-east-1', `{"userName":"${NEW_USER}","policyArn":"arn:aws:iam::aws:policy/AdministratorAccess"}`, ''],
    [400, 'RunInstances', 'ec2.amazonaws.com', 'us-east-1', '{"instanceType":"c5.4xlarge","minCount":4}', 'Client.UnauthorizedOperation'],
    [420, 'RunInstances', 'ec2.amazonaws.com', 'us-east-2', '{"instanceType":"c5.4xlarge","minCount":4}', 'Client.UnauthorizedOperation'],
    [460, 'GetObject', 's3.amazonaws.com', 'eu-central-1', '{"bucketName":"qaydnoma-exports","key":"users.csv"}', 'AccessDenied'],
    [500, 'GetObject', 's3.amazonaws.com', 'eu-central-1', '{"bucketName":"qaydnoma-reports","key":"daily/12.csv"}', ''],
  ];
  for (const [dt, name, source, region, params, error] of steps) ev(a + dt, name, source, 'report-svc', ATTACKER, region, params, error);
  return rows;
}

const TRAIL = trail();
const ATTACK_COUNT = TRAIL.filter((r) => r.UserIdentityUserName === 'report-svc' && r.SourceIpAddress === ATTACKER).length;
const ATTACK_FAILS = TRAIL.filter((r) => r.SourceIpAddress === ATTACKER && r.ErrorCode !== '').length;

const trailPractical: ExamPractical = {
  id: 'c-trail',
  topic: 'professional',
  title: "Sentinel: sizgan kalit bilan nima qilingan?",
  panes: ['siem'],
  intro:
    "GuardDuty ogohlantirdi: `report-svc` xizmat hisobining kirish kaliti AWS'dan tashqaridagi manzildan ishlatilmoqda. Odatda bu kalitni faqat ilova serveri (`203.0.113.20`) ishlatadi. Sentinel'da **KQL**, jadval `AWSCloudTrail`: `EventName`, `EventSource`, `UserIdentityUserName`, `SourceIpAddress`, `AWSRegion`, `ErrorCode` (muvaffaqiyatli bo'lsa bo'sh), `RequestParameters`.",
  shell: () => ({ fs: { home: { talaba: {} } }, siem: { now: '2026-11-22T00:00:00Z', tables: { AWSCloudTrail: TRAIL } } }),
  tasks: [
    {
      id: 'sources',
      text: '`report-svc` hodisalarini manba IP bo\'yicha sanang (har IP bir qator, soni bilan).',
      solution: [kql('AWSCloudTrail | where UserIdentityUserName == "report-svc" | summarize count() by SourceIpAddress')],
      check: ({ siem }) => {
        const r = siem?.result;
        if (!ok(r) || siem!.lang !== 'kql') return false;
        return r.rows.some((row) => cell(r, row, 'SourceIpAddress') === ATTACKER && Object.values(row).includes(ATTACK_COUNT)) && r.rows.some((row) => cell(r, row, 'SourceIpAddress') === APP_IP);
      },
    },
    {
      id: 'persist',
      text: "Begona IP'dan yangi IAM foydalanuvchisi yaratilgan. Shu hodisani `RequestParameters` bilan chiqaring (natija 5 qatordan oshmasin).",
      solution: [kql(`AWSCloudTrail | where SourceIpAddress == "${ATTACKER}" and EventName == "CreateUser" | project TimeGenerated, EventName, RequestParameters`)],
      check: ({ siem }) => ok(siem?.result) && siem!.lang === 'kql' && siem!.result.rows.length <= 5 && column(siem!.result, 'RequestParameters').some((p) => p.includes(`"userName":"${NEW_USER}"`)),
    },
    {
      id: 'fails',
      text: "Shu IP'dan nechta so'rov rad etilgan (`ErrorCode` bo'sh emas)? Bitta son chiqaring.",
      solution: [kql(`AWSCloudTrail | where SourceIpAddress == "${ATTACKER}" and ErrorCode != "" | count`)],
      check: ({ siem }) => siem?.lang === 'kql' && oneNumber(siem.result) === ATTACK_FAILS,
    },
  ],
};

/* ── practical 2: hardening a cloud server ───────────────────────────── */

const serverPractical: ExamPractical = {
  id: 'c-server',
  topic: 'infra',
  title: 'Bulut serverini mustahkamlash',
  intro:
    "`qaydnoma-web-01` (EC2, Ubuntu). CSPM hisobotida serverga oid uchta topilma bor: ochiq xizmat, SSH sozlamasi va sirlar fayli. Siz root sifatida kirdingiz. Javob so'ralgan joyda buyruq **faqat javobni** chiqarsin.",
  shell: () => ({
    host: 'qaydnoma-web-01',
    user: 'root',
    cwd: '/root',
    fs: {
      root: {},
      home: { talaba: {} },
      etc: {
        redis: { 'redis.conf': 'bind 0.0.0.0\nprotected-mode no\nport 6379\ndaemonize no\n' },
        ssh: { sshd_config: 'Port 22\nPermitRootLogin yes\nPasswordAuthentication no\nPubkeyAuthentication yes\nX11Forwarding no\n' },
        qaydnoma: { '.env': { $file: 'DATABASE_URL=postgresql://qaydnoma:Q4ydn0ma-db@127.0.0.1/qaydnoma\nREDIS_URL=redis://127.0.0.1:6379/0\n', mode: 0o644, owner: 'root' } },
      },
      tmp: {},
    },
    system: {
      procs: [
        { pid: 1, ppid: 0, user: 'root', cmd: '/sbin/init' },
        { pid: 640, ppid: 1, user: 'root', cmd: 'sshd: /usr/sbin/sshd -D [listener] 0 of 10-100 startups' },
        { pid: 702, ppid: 1, user: 'root', cmd: 'nginx: master process /usr/sbin/nginx' },
        { pid: 715, ppid: 1, user: 'postgres', cmd: '/usr/lib/postgresql/16/bin/postgres -D /var/lib/postgresql/16/main' },
        { pid: 731, ppid: 1, user: 'redis', cmd: '/usr/bin/redis-server 0.0.0.0:6379' },
        { pid: 812, ppid: 1, user: 'www-data', cmd: 'gunicorn: master [qaydnoma]' },
      ],
      sockets: [
        { proto: 'tcp', local: '0.0.0.0:22', pid: 640 },
        { proto: 'tcp', local: '0.0.0.0:80', pid: 702 },
        { proto: 'tcp', local: '127.0.0.1:5432', pid: 715 },
        { proto: 'tcp', local: '0.0.0.0:6379', pid: 731 },
        { proto: 'tcp', local: '127.0.0.1:8000', pid: 812 },
      ],
    },
  }),
  tasks: [
    {
      id: 'redis-addr',
      text: "Redis qaysi manzil va portda tinglayapti? Faqat `manzil:port` ni chiqaring.",
      solution: ["ss -tlnp | grep redis | awk '{print $5}'"],
      check: ({ output }) => output.trim() === '0.0.0.0:6379',
    },
    {
      id: 'redis-bind',
      text: "Redis faqat shu serverning o'zidan ishlatiladi. `/etc/redis/redis.conf` da u faqat lokal manzilda (`127.0.0.1`) tinglaydigan qiling.",
      solution: ["sed -i 's/^bind 0.0.0.0/bind 127.0.0.1/' /etc/redis/redis.conf"],
      check: ({ state }) => {
        const conf = fileAt(state, '/etc/redis/redis.conf') ?? '';
        return /^bind 127\.0\.0\.1\s*$/m.test(conf) && !/^bind .*0\.0\.0\.0/m.test(conf);
      },
    },
    {
      id: 'root-login',
      text: "SSH orqali root bilan to'g'ridan-to'g'ri kirishni taqiqlang (`/etc/ssh/sshd_config`).",
      solution: ["sed -i 's/^PermitRootLogin yes/PermitRootLogin no/' /etc/ssh/sshd_config"],
      check: ({ state }) => {
        const conf = fileAt(state, '/etc/ssh/sshd_config') ?? '';
        return /^PermitRootLogin no\s*$/m.test(conf) && !/^PermitRootLogin yes/m.test(conf);
      },
    },
    {
      id: 'env',
      text: "`/etc/qaydnoma/.env` faylini faqat egasi o'qiy va yoza oladigan qiling.",
      solution: ['chmod 600 /etc/qaydnoma/.env'],
      check: ({ state }) => modeAt(state, '/etc/qaydnoma/.env') === 0o600,
    },
  ],
};

/* ── practical 3: IAM review from exported files ─────────────────────── */

const POLICY = (statements: object[]) => JSON.stringify({ Version: '2012-10-17', Statement: statements }, null, 2) + '\n';
const POLICIES: Record<string, string> = {
  'ci-deploy.json': POLICY([{ Effect: 'Allow', Action: ['ecr:PutImage', 'ecs:UpdateService'], Resource: 'arn:aws:ecs:eu-central-1:111122223333:service/qaydnoma/*' }]),
  'report-reader.json': POLICY([{ Effect: 'Allow', Action: 's3:GetObject', Resource: 'arn:aws:s3:::qaydnoma-reports/*' }]),
  'backup.json': POLICY([{ Effect: 'Allow', Action: 's3:*', Resource: ['arn:aws:s3:::qaydnoma-backups', 'arn:aws:s3:::qaydnoma-backups/*'] }]),
  'legacy-ops.json': POLICY([{ Effect: 'Allow', Action: '*', Resource: '*' }]),
};
const REPORT_ROWS: string[][] = [
  ['<root_account>', 'not_supported', 'true', 'false', 'N/A'],
  ['ci-deploy', 'false', 'false', 'true', '2025-09-14'],
  ['report-svc', 'false', 'false', 'true', '2026-08-02'],
  ['backup-svc', 'false', 'false', 'true', '2025-03-30'],
  ['m.yuldasheva', 'true', 'true', 'false', 'N/A'],
  ['s.nematov', 'true', 'false', 'false', 'N/A'],
  ['a.karimov', 'true', 'false', 'true', '2026-10-01'],
  ['r.sobirov', 'true', 'true', 'true', '2026-06-11'],
  ['legacy-ops', 'true', 'false', 'false', 'N/A'],
];
const REPORT = ['user,password_enabled,mfa_active,access_key_1_active,access_key_1_last_rotated', ...REPORT_ROWS.map((r) => r.join(','))].join('\n') + '\n';
const OLDEST = [...REPORT_ROWS].filter((r) => r[3] === 'true').sort((a, b) => a[4]!.localeCompare(b[4]!))[0]![0]!;
const NO_MFA = REPORT_ROWS.filter((r) => r[1] === 'true' && r[2] === 'false').length;

const iamPractical: ExamPractical = {
  id: 'c-iam',
  topic: 'iam',
  title: 'IAM auditi: siyosatlar va credential report',
  intro:
    "`~/iam/policies/` — hisobdagi IAM siyosatlari (JSON), `~/iam/credential-report.csv` — AWS credential report (ustunlar: `user, password_enabled, mfa_active, access_key_1_active, access_key_1_last_rotated`). Javob so'ralgan joyda buyruq **faqat javobni** chiqarsin.",
  shell: () => ({ fs: { home: { talaba: { iam: { policies: POLICIES, 'credential-report.csv': REPORT } } }, tmp: {} } }),
  tasks: [
    {
      id: 'admin',
      text: "Qaysi siyosat hamma amalga ruxsat beradi (`\"Action\": \"*\"`)? Faqat fayl yo'lini chiqaring.",
      solution: [String.raw`grep -rl '"Action": "\*"' iam/policies`],
      check: ({ output }) => single(output) && output.trim().endsWith('legacy-ops.json'),
    },
    {
      id: 'oldest',
      text: "Faol kirish kalitlari ichida eng uzoq almashtirilmagani qaysi foydalanuvchida? Faqat foydalanuvchi nomini chiqaring.",
      solution: ["awk -F, '$4 == \"true\"' iam/credential-report.csv | sort -t, -k5 | head -1 | cut -d, -f1"],
      check: ({ output }) => output.trim() === OLDEST,
    },
    {
      id: 'mfa',
      text: "Konsolga parol bilan kiradigan (`password_enabled` = true), lekin MFA yoqilmagan foydalanuvchilar nechta? Faqat sonni chiqaring.",
      solution: ["awk -F, '$2 == \"true\" && $3 == \"false\"' iam/credential-report.csv | wc -l"],
      check: ({ output }) => output.trim() === String(NO_MFA),
    },
  ],
};

export const CLOUD_EXAM: Exam = {
  id: 'cloud',
  title: 'Cloud xavfsizligi imtihoni',
  summary: "Bulut infratuzilmasi, IAM, ma'lumot va tarmoq himoyasi, konteynerlar va IaC, bulutda IR va muvofiqlik — vaziyatli savollar va SIEM yoki terminalda ikki amaliy tekshiruv.",
  topics: [
    { id: 'infra', title: 'Infratuzilma va serverlar', stages: ['c1-infratuzilma'] },
    { id: 'iam', title: 'IAM va sirlar', stages: ['c2-bulut-xavfsizligi'] },
    { id: 'himoya', title: "Ma'lumot, tarmoq va monitoring", stages: ['c2-bulut-xavfsizligi'] },
    { id: 'konteyner', title: 'Konteynerlar va IaC', stages: ['c3-konteyner'] },
    { id: 'professional', title: 'Bulutda IR, zero trust, muvofiqlik', stages: ['c4-professional'] },
  ],
  questions: parseBank('cloud', CLOUD_BANK),
  practicals: [trailPractical, serverPractical, iamPractical],
};
