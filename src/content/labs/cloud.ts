import type { Lab } from '../types';

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

export const cloudTrailInvestigation: Lab = {
  id: 'cloudtrail-tergovi',
  title: "CloudTrail: sizib chiqqan kalit tergovi",
  summary: "jq bilan CloudTrail yozuvlaridan hujumchi IP'si, yaratilgan kalit, regionlar, o'qilgan sirlar va zaxira fayllarini aniqlash.",
  minutes: 40,
  level: 3,
  intro:
    "c4 bosqichidagi insident: `ci-deploy` foydalanuvchisining doimiy kaliti ommaviy repozitoriyga tushib qoldi. Hisobning CloudTrail yozuvlari `cloudtrail.json` faylida — har qatorda bitta hodisa (JSON Lines).\n\n" +
    "Har yozuvning muhim maydonlari: `eventTime` (UTC), `eventName` (API chaqiruvi), `awsRegion`, `sourceIPAddress`, `userIdentity.userName` va `userIdentity.accessKeyId`, `requestParameters`, `errorCode`. Ichma-ich maydonga nuqta bilan murojaat qilinadi: `.userIdentity.userName`.\n\n" +
    "Maqsad — c4 darsidagi vaqt chizig'ini o'zingiz, xom yozuvlardan tiklash.",
  shell: () => ({
    fs: {
      home: { talaba: { 'cloudtrail.json': CLOUDTRAIL_JSONL } },
      tmp: {},
    },
  }),
  tasks: [
    {
      id: 'shape',
      text: 'Birinchi yozuvni chiroyli ko\'rinishda oching va tuzilishini o\'rganing.',
      hint: '`head -n 1 cloudtrail.json | jq .`',
      solution: ['head -n 1 cloudtrail.json | jq .'],
      check: ({ output }) => output.includes('"userIdentity"') && output.includes('"eventName"'),
    },
    {
      id: 'ips',
      text: '`ci-deploy` kaliti qaysi IP manzillardan ishlatilgan va necha martadan?',
      hint: "`jq -r 'select(.userIdentity.userName == \"ci-deploy\") | .sourceIPAddress' cloudtrail.json | sort | uniq -c` — CI runner'dan tashqari manzil bormi?",
      solution: ["jq -r 'select(.userIdentity.userName == \"ci-deploy\") | .sourceIPAddress' cloudtrail.json | sort | uniq -c"],
      check: ({ output }) => output.includes(LEAK_IP) && output.includes(CI_IP),
    },
    {
      id: 'timeline',
      text: `${LEAK_IP} manzilidan qilingan barcha chaqiruvlarni vaqt, foydalanuvchi va hodisa nomi bilan jadval qiling.`,
      hint: `\`jq -r 'select(.sourceIPAddress == "${LEAK_IP}") | [.eventTime, .userIdentity.userName, .eventName, .awsRegion] | @tsv' cloudtrail.json\``,
      solution: [`jq -r 'select(.sourceIPAddress == "${LEAK_IP}") | [.eventTime, .userIdentity.userName, .eventName, .awsRegion] | @tsv' cloudtrail.json`],
      check: ({ output }) => output.includes('GetCallerIdentity') && output.includes('CreateAccessKey') && output.includes('StopLogging'),
    },
    {
      id: 'persistence',
      text: 'Hujumchi o\'ziga zaxira kirish yo\'lini yaratgan. Kim uchun yangi kalit yaratildi va uning ID si qanday?',
      hint: "`jq -c 'select(.eventName == \"CreateAccessKey\") | .responseElements.accessKey' cloudtrail.json`",
      solution: ["jq -c 'select(.eventName == \"CreateAccessKey\") | .responseElements.accessKey' cloudtrail.json"],
      check: ({ output }) => output.includes('backup-svc') && output.includes(BACKUP_KEY),
    },
    {
      id: 'regions',
      text: 'Qaysi regionlarda faollik bo\'lgan? Kompaniya faqat eu-central-1 dan foydalanadi.',
      hint: "`jq -r '.awsRegion' cloudtrail.json | sort | uniq -c` — ishlatilmaydigan regionlar (c1 bosqichi): ap-southeast-1.",
      solution: ["jq -r '.awsRegion' cloudtrail.json | sort | uniq -c"],
      check: ({ output }) => output.includes('ap-southeast-1') && output.includes('us-east-1'),
    },
    {
      id: 'impact',
      text: 'ap-southeast-1 da qanday serverlar ishga tushirildi?',
      hint: "`jq -c 'select(.eventName == \"RunInstances\") | .requestParameters' cloudtrail.json` — p3 — GPU serverlar: kriptomayning.",
      solution: ["jq -c 'select(.eventName == \"RunInstances\") | .requestParameters' cloudtrail.json"],
      check: ({ output }) => output.includes('p3.8xlarge'),
    },
    {
      id: 'secrets',
      text: 'Qaysi sirlar o\'qildi? Ularning hammasini almashtirish kerak bo\'ladi.',
      hint: "`jq -r 'select(.eventName == \"GetSecretValue\") | .requestParameters.secretId' cloudtrail.json`",
      solution: ["jq -r 'select(.eventName == \"GetSecretValue\") | .requestParameters.secretId' cloudtrail.json"],
      check: ({ output }) => output.split('\n').filter(Boolean).length === 7 && output.includes('qaydnoma/db'),
    },
    {
      id: 'objects',
      text: '`qaydnoma-backups` bucket\'idan nechta fayl o\'qilgan?',
      hint: "`jq -r 'select(.eventName == \"GetObject\") | .requestParameters.key' cloudtrail.json | wc -l` (ro'yxatni ko'rish uchun `| wc -l` siz)",
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
  ],
};
