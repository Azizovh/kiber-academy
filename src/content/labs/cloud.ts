import type { Lab } from '../types';
import { fileAt } from './helpers';

/*
 * CloudTrail for the c4 incident (the b4 leaked-key story): ci-deploy's access key was pushed to a public repository
 * at 22:10 UTC on 2026-11-16 and used from 203.0.113.77. Times and events follow the timeline in c4/bulut-ir.md.
 */

export const LEAK_IP = '203.0.113.77';
const CI_IP = '192.0.2.50';
const ACCOUNT = '111122223333';
const CI_KEY = 'AKIAEXAMPLECIDEPLOY1';
const BACKUP_KEY = 'AKIAEXAMPLEBACKUPSV2';

type Rec = Record<string, unknown>;

function buildTrail(): Rec[] {
  const out: Rec[] = [];
  let id = 0;
  const rec = (
    time: string,
    user: 'ci-deploy' | 'backup-svc',
    ip: string,
    source: string,
    eventName: string,
    region: string,
    extra: Rec = {},
  ) => {
    out.push({
      eventVersion: '1.10',
      eventTime: `2026-11-16T${time}Z`,
      eventSource: `${source}.amazonaws.com`,
      eventName,
      awsRegion: region,
      sourceIPAddress: ip,
      userAgent: ip === CI_IP ? 'aws-cli/2.17.0 (GitHub Actions)' : 'aws-cli/2.15.30 Python/3.11.6 Linux/6.5.0',
      userIdentity: {
        type: 'IAMUser',
        userName: user,
        arn: `arn:aws:iam::${ACCOUNT}:user/${user}`,
        accountId: ACCOUNT,
        accessKeyId: user === 'ci-deploy' ? CI_KEY : BACKUP_KEY,
      },
      eventID: `e${String(++id).padStart(4, '0')}`,
      ...extra,
    });
  };

  // Daytime: the CI pipeline deploys as usual.
  rec('09:02:11', 'ci-deploy', CI_IP, 'sts', 'GetCallerIdentity', 'eu-central-1');
  rec('09:02:14', 'ci-deploy', CI_IP, 'ecr', 'GetAuthorizationToken', 'eu-central-1');
  rec('09:03:40', 'ci-deploy', CI_IP, 'ecs', 'UpdateService', 'eu-central-1', { requestParameters: { cluster: 'qaydnoma', service: 'web' } });
  rec('15:41:02', 'ci-deploy', CI_IP, 'ecs', 'UpdateService', 'eu-central-1', { requestParameters: { cluster: 'qaydnoma', service: 'web' } });

  // 22:14 — the leaked key is used from an unknown address.
  rec('22:14:03', 'ci-deploy', LEAK_IP, 'sts', 'GetCallerIdentity', 'us-east-1');
  rec('22:14:40', 'ci-deploy', LEAK_IP, 'iam', 'CreateAccessKey', 'us-east-1', {
    requestParameters: { userName: 'backup-svc' },
    responseElements: { accessKey: { accessKeyId: BACKUP_KEY, status: 'Active', userName: 'backup-svc' } },
  });
  // Discovery with the new key, in several regions.
  const regions = ['us-east-1', 'eu-central-1', 'ap-southeast-1'];
  let m = 15;
  for (const r of regions) {
    rec(`22:${m}:05`, 'backup-svc', LEAK_IP, 'ec2', 'DescribeInstances', r);
    rec(`22:${m}:20`, 'backup-svc', LEAK_IP, 's3', 'ListBuckets', r);
    m++;
  }
  rec('22:18:12', 'backup-svc', LEAK_IP, 'iam', 'ListUsers', 'us-east-1');
  // 22:26 — impact: GPU instances in a region the company never uses.
  for (let i = 0; i < 4; i++) {
    rec(`22:26:${String(10 + i * 7).padStart(2, '0')}`, 'backup-svc', LEAK_IP, 'ec2', 'RunInstances', 'ap-southeast-1', {
      requestParameters: { instanceType: 'p3.8xlarge', minCount: 5, maxCount: 5 },
    });
  }
  // 22:40 — secrets.
  const secrets = ['qaydnoma/db', 'qaydnoma/smtp', 'qaydnoma/jwt-key', 'qaydnoma/s3-backup', 'ci/github-token', 'ci/registry', 'monitoring/api-key'];
  secrets.forEach((s, i) =>
    rec(`22:40:${String(i * 6).padStart(2, '0')}`, 'backup-svc', LEAK_IP, 'secretsmanager', 'GetSecretValue', 'eu-central-1', {
      requestParameters: { secretId: s },
    }),
  );
  // 22:52 — backups (S3 data events).
  const keys = ['db/2026-11-14.sql.gz', 'db/2026-11-15.sql.gz', 'db/2026-11-16.sql.gz', 'uploads/archive-2026-10.tar'];
  keys.forEach((k, i) =>
    rec(`22:52:${String(i * 9).padStart(2, '0')}`, 'backup-svc', LEAK_IP, 's3', 'GetObject', 'eu-central-1', {
      requestParameters: { bucketName: 'qaydnoma-backups', key: k },
    }),
  );
  // 23:05 — trying to switch off the audit trail; an SCP denies it.
  rec('23:05:31', 'backup-svc', LEAK_IP, 'cloudtrail', 'StopLogging', 'us-east-1', {
    requestParameters: { name: 'org-trail' },
    errorCode: 'AccessDenied',
    errorMessage: `User: arn:aws:iam::${ACCOUNT}:user/backup-svc is not authorized to perform: cloudtrail:StopLogging with an explicit deny in a service control policy`,
  });
  return out.sort((a, b) => String(a.eventTime).localeCompare(String(b.eventTime)));
}

const TRAIL = buildTrail();
export const CLOUDTRAIL_JSONL = TRAIL.map((r) => JSON.stringify(r)).join('\n') + '\n';
const GET_OBJECTS = TRAIL.filter((r) => r.eventName === 'GetObject').length;

const LEAK_COUNT = TRAIL.filter((r) => r.sourceIPAddress === LEAK_IP).length;
const BACKUP_COUNT = TRAIL.filter((r) => (r.userIdentity as Rec).userName === 'backup-svc').length;
const RUN_COUNT = TRAIL.filter((r) => r.eventName === 'RunInstances').length;

export const cloudTrailInvestigation: Lab = {
  id: 'cloudtrail-tergovi',
  title: "CloudTrail: sizib chiqqan kalit tergovi",
  summary: "jq bilan CloudTrail yozuvlaridan hujumchi IP'si, User-Agent, yaratilgan kalit, razvedka chaqiruvlari, regionlar, o'qilgan sirlar va zaxira fayllarini aniqlash.",
  minutes: 50,
  level: 3,
  intro:
    "c4 bosqichidagi insident: `ci-deploy` foydalanuvchisining doimiy kaliti ommaviy repozitoriyga tushib qoldi (2026-11-16, 22:10 UTC). Hisobning CloudTrail yozuvlari `cloudtrail.json` faylida — har qatorda bitta hodisa (JSON Lines).\n\n" +
    "Har yozuvning muhim maydonlari: `eventTime` (UTC), `eventName` (API chaqiruvi), `awsRegion`, `sourceIPAddress`, `userAgent`, `userIdentity.userName` va `userIdentity.accessKeyId`, `requestParameters`, `errorCode`. Ichma-ich maydonga nuqta bilan murojaat qilinadi: `.userIdentity.userName`.\n\n" +
    "Maqsad — c4 darsidagi vaqt chizig'ini o'zingiz, xom yozuvlardan tiklash.",
  shell: () => ({
    fs: {
      home: { talaba: { 'cloudtrail.json': CLOUDTRAIL_JSONL } },
      tmp: {},
    },
  }),
  tasks: [
    {
      id: 'count',
      teach: ['wc -l'],
      text: 'Faylda nechta CloudTrail yozuvi bor?',
      hint: '`wc -l cloudtrail.json`',
      solution: ['wc -l cloudtrail.json'],
      check: ({ output }) => output.trim().startsWith(String(TRAIL.length)),
    },
    {
      id: 'shape',
      teach: ['jq', 'jq .'],
      text: 'Birinchi yozuvni chiroyli ko\'rinishda oching va tuzilishini o\'rganing.',
      hint: '`head -n 1 cloudtrail.json | jq .`',
      solution: ['head -n 1 cloudtrail.json | jq .'],
      check: ({ output }) => output.includes('"userIdentity"') && output.includes('"eventName"'),
    },
    {
      id: 'keys',
      teach: ['jq keys'],
      text: '`userIdentity` ichida qaysi maydonlar bor? Faqat nomlarini bir qatorda chiqaring.',
      hint: "`head -n 1 cloudtrail.json | jq -c '.userIdentity | keys'`",
      solution: ["head -n 1 cloudtrail.json | jq -c '.userIdentity | keys'"],
      check: ({ output }) => output.includes('"accessKeyId"') && output.includes('"userName"') && !output.includes('eventName'),
    },
    {
      id: 'users',
      teach: ['jq .maydon', 'jq -r'],
      text: 'Qaysi IAM foydalanuvchilari nechta chaqiruv qilgan?',
      hint: "`jq -r '.userIdentity.userName' cloudtrail.json | sort | uniq -c` — backup-svc odatda bunchalik faol emas.",
      solution: ["jq -r '.userIdentity.userName' cloudtrail.json | sort | uniq -c"],
      check: ({ output }) => output.includes('ci-deploy') && output.includes(`${BACKUP_COUNT} backup-svc`),
    },
    {
      id: 'ips',
      teach: ['jq select(SHART)'],
      text: '`ci-deploy` kaliti qaysi IP manzillardan ishlatilgan va necha martadan?',
      hint: "`jq -r 'select(.userIdentity.userName == \"ci-deploy\") | .sourceIPAddress' cloudtrail.json | sort | uniq -c` — CI runner'dan tashqari manzil bormi?",
      solution: ["jq -r 'select(.userIdentity.userName == \"ci-deploy\") | .sourceIPAddress' cloudtrail.json | sort | uniq -c"],
      check: ({ output }) => output.includes(LEAK_IP) && output.includes(CI_IP),
    },
    {
      id: 'ua',
      teach: ['jq [.a, .b] | @tsv', 'sort -u'],
      text: 'Har bir IP qaysi dastur (userAgent) bilan murojaat qilgan? Takrorsiz juftliklarni chiqaring.',
      hint: "`jq -r '[.sourceIPAddress, .userAgent] | @tsv' cloudtrail.json | sort -u` — CI: GitHub Actions; begona IP: oddiy Linux kompyuterdagi aws-cli.",
      solution: ["jq -r '[.sourceIPAddress, .userAgent] | @tsv' cloudtrail.json | sort -u"],
      check: ({ output }) => output.split('\n').filter(Boolean).length === 2 && output.includes('GitHub Actions') && output.includes(LEAK_IP),
    },
    {
      id: 'first',
      text: 'Kalit sizib chiqqandan (22:10) keyin begona IP dan birinchi chaqiruv qachon va qaysi bo\'lgan?',
      hint: `\`jq -r 'select(.sourceIPAddress == "${LEAK_IP}") | [.eventTime, .eventName] | @tsv' cloudtrail.json | head -n 1\` — 4 daqiqa! GetCallerIdentity: "bu kalit kimniki?" — avtomatik skanerlarning birinchi qadami.`,
      solution: [`jq -r 'select(.sourceIPAddress == "${LEAK_IP}") | [.eventTime, .eventName] | @tsv' cloudtrail.json | head -n 1`],
      check: ({ output }) => output.trim() === '2026-11-16T22:14:03Z\tGetCallerIdentity',
    },
    {
      id: 'timeline',
      text: `${LEAK_IP} manzilidan qilingan barcha chaqiruvlarni vaqt, foydalanuvchi, hodisa nomi va region bilan jadval qiling.`,
      hint: `\`jq -r 'select(.sourceIPAddress == "${LEAK_IP}") | [.eventTime, .userIdentity.userName, .eventName, .awsRegion] | @tsv' cloudtrail.json\``,
      solution: [`jq -r 'select(.sourceIPAddress == "${LEAK_IP}") | [.eventTime, .userIdentity.userName, .eventName, .awsRegion] | @tsv' cloudtrail.json`],
      check: ({ output }) => output.includes('GetCallerIdentity') && output.includes('CreateAccessKey') && output.includes('StopLogging'),
    },
    {
      id: 'leak-count',
      teach: ['jq -c'],
      text: 'Begona IP dan jami nechta chaqiruv bo\'lgan?',
      hint: `\`jq -c 'select(.sourceIPAddress == "${LEAK_IP}")' cloudtrail.json | wc -l\``,
      solution: [`jq -c 'select(.sourceIPAddress == "${LEAK_IP}")' cloudtrail.json | wc -l`],
      check: ({ output }) => output.trim() === String(LEAK_COUNT),
    },
    {
      id: 'persistence',
      text: 'Hujumchi o\'ziga zaxira kirish yo\'lini yaratgan. Kim uchun yangi kalit yaratildi va uning ID si qanday?',
      hint: "`jq -c 'select(.eventName == \"CreateAccessKey\") | .responseElements.accessKey' cloudtrail.json`",
      solution: ["jq -c 'select(.eventName == \"CreateAccessKey\") | .responseElements.accessKey' cloudtrail.json"],
      check: ({ output }) => output.includes('backup-svc') && output.includes(BACKUP_KEY),
    },
    {
      id: 'newkey',
      text: 'Yangi kalit bilan qanday API chaqiruvlari qilingan va necha martadan?',
      hint: `\`jq -r 'select(.userIdentity.accessKeyId == "${BACKUP_KEY}") | .eventName' cloudtrail.json | sort | uniq -c | sort -rn\` — ci-deploy kalitini o'chirishning o'zi yetmaydi: bu kalit ham o'chirilishi kerak.`,
      solution: [`jq -r 'select(.userIdentity.accessKeyId == "${BACKUP_KEY}") | .eventName' cloudtrail.json | sort | uniq -c | sort -rn`],
      check: ({ output }) => output.includes('GetSecretValue') && output.includes('RunInstances') && !output.includes('CreateAccessKey'),
    },
    {
      id: 'regions',
      text: 'Qaysi regionlarda faollik bo\'lgan? Kompaniya faqat eu-central-1 dan foydalanadi.',
      hint: "`jq -r '.awsRegion' cloudtrail.json | sort | uniq -c` — ishlatilmaydigan regionlar (c1 bosqichi): ap-southeast-1.",
      solution: ["jq -r '.awsRegion' cloudtrail.json | sort | uniq -c"],
      check: ({ output }) => output.includes('ap-southeast-1') && output.includes('us-east-1'),
    },
    {
      id: 'discovery',
      teach: ['jq test(REGEX)'],
      text: 'Razvedka bosqichi: nomi `Describe` yoki `List` bilan boshlangan chaqiruvlarni regex bilan toping.',
      hint: "`jq -r 'select(.eventName | test(\"^(Describe|List)\")) | [.eventTime, .eventName, .awsRegion] | @tsv' cloudtrail.json` — hujumchi nima borligini o'rganmoqda.",
      solution: ["jq -r 'select(.eventName | test(\"^(Describe|List)\")) | [.eventTime, .eventName, .awsRegion] | @tsv' cloudtrail.json"],
      check: ({ output }) => output.includes('DescribeInstances') && output.includes('ListBuckets') && output.includes('ListUsers') && !output.includes('GetSecretValue'),
    },
    {
      id: 'impact',
      text: 'ap-southeast-1 da qanday serverlar ishga tushirildi?',
      hint: "`jq -c 'select(.eventName == \"RunInstances\") | .requestParameters' cloudtrail.json` — p3 — GPU serverlar: kriptomayning.",
      solution: ["jq -c 'select(.eventName == \"RunInstances\") | .requestParameters' cloudtrail.json"],
      check: ({ output }) => output.includes('p3.8xlarge'),
    },
    {
      id: 'instances',
      teach: ['jq and / or'],
      text: 'ap-southeast-1 dagi RunInstances chaqiruvlari nechta? (Har birida 5 tadan server — jami qancha bo\'ldi?)',
      hint: "`jq -c 'select(.eventName == \"RunInstances\" and .awsRegion == \"ap-southeast-1\")' cloudtrail.json | wc -l` — 4 × 5 = 20 ta GPU server.",
      solution: ["jq -c 'select(.eventName == \"RunInstances\" and .awsRegion == \"ap-southeast-1\")' cloudtrail.json | wc -l"],
      check: ({ output }) => output.trim() === String(RUN_COUNT),
    },
    {
      id: 'secrets',
      text: 'Qaysi sirlar o\'qildi? Ularning hammasini almashtirish kerak bo\'ladi.',
      hint: "`jq -r 'select(.eventName == \"GetSecretValue\") | .requestParameters.secretId' cloudtrail.json`",
      solution: ["jq -r 'select(.eventName == \"GetSecretValue\") | .requestParameters.secretId' cloudtrail.json"],
      check: ({ output }) => output.split('\n').filter(Boolean).length === 7 && output.includes('qaydnoma/db'),
    },
    {
      id: 'secret-count',
      teach: ['jq -s', 'jq map(F)', 'jq length'],
      text: 'O\'qilgan sirlar sonini faqat jq bilan hisoblang: hamma yozuvlarni massivga yig\'ib, filtrlab, uzunligini oling.',
      hint: "`jq -s 'map(select(.eventName == \"GetSecretValue\")) | length' cloudtrail.json`",
      solution: ["jq -s 'map(select(.eventName == \"GetSecretValue\")) | length' cloudtrail.json"],
      check: ({ line, output }) => /-s/.test(line) && output.trim() === '7',
    },
    {
      id: 'objects',
      text: '`qaydnoma-backups` bucket\'idan qaysi fayllar o\'qilgan?',
      hint: "`jq -r 'select(.eventName == \"GetObject\") | [.requestParameters.bucketName, .requestParameters.key] | @tsv' cloudtrail.json` — ma'lumotlar bazasi zaxiralari: shaxsiy ma'lumotlar sizgan bo'lishi mumkin.",
      solution: ["jq -r 'select(.eventName == \"GetObject\") | [.requestParameters.bucketName, .requestParameters.key] | @tsv' cloudtrail.json"],
      check: ({ output }) => output.includes('qaydnoma-backups') && output.includes('db/2026-11-16.sql.gz'),
    },
    {
      id: 'objects-count',
      text: 'Nechta fayl o\'qilgan? Faqat son bo\'lsin.',
      hint: "`jq -r 'select(.eventName == \"GetObject\") | .requestParameters.key' cloudtrail.json | wc -l`",
      solution: ["jq -r 'select(.eventName == \"GetObject\") | .requestParameters.key' cloudtrail.json | wc -l"],
      check: ({ line, output }) => line.includes('GetObject') && output.trim() === String(GET_OBJECTS),
    },
    {
      id: 'denied',
      text: 'Qaysi urinish rad etilgan va uni nima to\'xtatgan?',
      hint: "`jq -r 'select(.errorCode != null) | [.eventName, .errorCode, .errorMessage] | @tsv' cloudtrail.json` — SCP'dagi aniq Deny hisob ichidagi har qanday huquqdan ustun (c2 IAM darsi).",
      solution: ["jq -r 'select(.errorCode != null) | [.eventName, .errorCode, .errorMessage] | @tsv' cloudtrail.json"],
      check: ({ output }) => output.includes('StopLogging') && output.includes('service control policy'),
    },
    {
      id: 'evidence',
      text: 'Begona IP ning barcha yozuvlarini dalil sifatida `~/hujum.json` ga, har birini bir qatorda saqlang.',
      hint: `\`jq -c 'select(.sourceIPAddress == "${LEAK_IP}")' cloudtrail.json > ~/hujum.json\`, tekshirish: \`wc -l ~/hujum.json\``,
      solution: [`jq -c 'select(.sourceIPAddress == "${LEAK_IP}")' cloudtrail.json > ~/hujum.json`],
      check: ({ state }) => (fileAt(state, '/home/talaba/hujum.json') ?? '').split('\n').filter((l) => l.startsWith('{')).length === LEAK_COUNT,
    },
    {
      id: 'challenge',
      challenge: true,
      text: 'Mustaqil vazifa: hujumchi yaratgan `backup-svc` kaliti bilan jami nechta API chaqiruv qilingan? Natija faqat son bo\'lsin.',
      hint: 'Ichma-ich maydon bo\'yicha filtrlang va natijani sanang.',
      solution: ["jq -c 'select(.userIdentity.userName == \"backup-svc\")' cloudtrail.json | wc -l"],
      check: ({ output }) => output.trim() === String(BACKUP_COUNT),
    },
  ],
};
