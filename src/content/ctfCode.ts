import type { CtfChallenge } from './types';

/*
 * Git and code security challenges. Flags are stored as hashes; plain answers and scripted solutions live in
 * content.test.ts. Flag text inside repositories is Base64-decoded at build time so it is not greppable here.
 */

const D = (month: number, day: number, h = 10) => Date.UTC(2026, month - 1, day, h - 5, 0, 0);
const A = 'Aziza Yusupova <aziza@qaydnoma.lab>';
const B = 'Bekzod Ergashev <bekzod@qaydnoma.lab>';
const N = 'Nodir Qodirov <nodir@contractor.example>';

export const CTF_CODE: CtfChallenge[] = [
  {
    id: 'git-deleted',
    title: "O'chirilgan fayl",
    category: 'linux',
    level: 1,
    description: "`~/landing` repozitoriysida kimdir maxfiy faylni commit qilgan, keyin \"o'chirib tashlagan\". Fayl hozir yo'q — lekin git tarixida bor. Flag o'sha faylda.",
    hints: ["Qaysi fayllar o'chirilgan: `git log --diff-filter=D --name-only --oneline`", "O'chirilishidan oldingi holat: `git show COMMIT~1:YO'L`"],
    flagHash: '08abee6ab3b215',
    shell: () => ({
      fs: { home: { talaba: {} }, tmp: {} },
      git: [
        {
          path: '/home/talaba/landing',
          commits: [
            { author: A, date: D(10, 1), message: 'Initial landing page', changes: { 'index.html': '<h1>Qaydnoma</h1>\n', 'style.css': 'body { font-family: sans-serif; }\n' } },
            { author: B, date: D(10, 4), message: 'Add analytics config', changes: { 'config/analytics.json': `{"site": "qaydnoma", "note": "${atob('ZmxhZ3tvY2hpcmlsZ2FuX2ZheWxfdGFyaXhkYX0=')}"}\n` } },
            { author: A, date: D(10, 6), message: 'Update hero text', changes: { 'index.html': '<h1>Qaydnoma — qaydlaringiz bir joyda</h1>\n' } },
            { author: B, date: D(10, 9), message: 'Remove analytics config', changes: { 'config/analytics.json': null } },
            { author: A, date: D(10, 12), message: 'Add footer', changes: { 'index.html': '<h1>Qaydnoma — qaydlaringiz bir joyda</h1>\n<footer>2026</footer>\n' } },
          ],
        },
      ],
    }),
  },
  {
    id: 'git-stash',
    title: 'Yarim qolgan ish',
    category: 'linux',
    level: 1,
    description: "`~/api` repozitoriysida ishchi papka toza, tarixda ham hech narsa yo'q. Lekin dasturchi ishini vaqtincha bir chetga qo'yib ketgan. Flag o'sha joyda.",
    hints: ['`git stash list` — vaqtincha saqlangan o\'zgarishlar.', '`git stash show -p stash@{0}` — mazmuni.'],
    flagHash: '176740d39b6509',
    shell: () => ({
      fs: { home: { talaba: {} }, tmp: {} },
      git: [
        {
          path: '/home/talaba/api',
          commits: [
            { author: A, date: D(10, 2), message: 'Initial commit', changes: { 'server.js': "require('./app').listen(3000);\n" } },
            { author: B, date: D(10, 7), message: 'Add health check', changes: { 'app.js': "module.exports = require('express')().get('/health', (q, r) => r.send('ok'));\n" } },
          ],
          stash: [{ message: 'WIP: payment config', changes: { 'config/payment.js': `module.exports = { mode: 'test', note: '${atob('ZmxhZ3tzdGFzaF9oYW1fc2FxbGF5ZGl9')}' };\n` }, date: D(10, 8, 18) }],
        },
      ],
    }),
  },
  {
    id: 'git-reflog',
    title: 'Bekor qilingan commit',
    category: 'linux',
    level: 2,
    description: "`~/infra` da kimdir xato commit qildi va uni `git reset` bilan \"yo'q qildi\". `git log --all` da u ko'rinmaydi. Lekin git hali eslaydi.",
    hints: ["`git reflog` — HEAD qayerlarda bo'lgan.", "\"reset: moving to\" dan oldingi yozuv — bekor qilingan commit. `git show HEAD@{N}`"],
    flagHash: '15545cdd5362af',
    shell: () => ({
      fs: { home: { talaba: {} }, tmp: {} },
      git: [
        {
          path: '/home/talaba/infra',
          commits: [
            { author: A, date: D(11, 1), message: 'Initial terraform layout', changes: { 'main.tf': 'terraform {\n  required_version = ">= 1.6"\n}\n' } },
            { author: B, date: D(11, 3), message: 'Add VPC module', changes: { 'vpc.tf': 'module "vpc" {\n  source = "./modules/vpc"\n}\n' } },
            { orphan: true, author: B, date: D(11, 4), message: 'temp: debug values', changes: { 'debug.auto.tfvars': `debug_note = "${atob('ZmxhZ3tyZWZsb2dfaGVjaF9uYXJzYW5pX3VudXRtYXlkaX0=')}"\n` } },
            { author: A, date: D(11, 5), message: 'Add outputs', changes: { 'outputs.tf': 'output "vpc_id" {\n  value = module.vpc.id\n}\n' } },
          ],
          reflog: [
            { target: 'Add outputs', action: 'commit: Add outputs' },
            { target: 'Add VPC module', action: 'reset: moving to HEAD~1' },
            { target: 'temp: debug values', action: 'commit: temp: debug values' },
            { target: 'Add VPC module', action: 'commit: Add VPC module' },
            { target: 'Initial terraform layout', action: 'commit (initial): Initial terraform layout' },
          ],
        },
      ],
    }),
  },
  {
    id: 'git-blame',
    title: 'Bu qatorni kim yozgan?',
    category: 'web',
    level: 2,
    description:
      "`~/billing` dagi `src/report.js` faylida foydalanuvchi kiritgan ifodani `eval` bilan bajaradigan qator bor. Uni qaysi muallif qo'shgan? Flag — o'sha muallifning email manzili.\n\nFlag formati: `flag{email}`",
    hints: ['`grep -n eval src/report.js` — qaysi qator.', "`git blame -L N,N src/report.js` — kim va qaysi commit; email uchun `git show COMMIT` yoki `git log -n 1 --format='%ae' COMMIT`."],
    flagHash: '1fd84333b5a0c0',
    shell: () => ({
      fs: { home: { talaba: {} }, tmp: {} },
      git: [
        {
          path: '/home/talaba/billing',
          commits: [
            { author: A, date: D(9, 10), message: 'Add report module', changes: { 'src/report.js': "const db = require('./db');\n\nexports.total = async (month) => {\n  const rows = await db.invoices(month);\n  return rows.reduce((s, r) => s + r.amount, 0);\n};\n" } },
            { author: B, date: D(9, 20), message: 'Add currency formatting', changes: { 'src/report.js': "const db = require('./db');\nconst fmt = require('./fmt');\n\nexports.total = async (month) => {\n  const rows = await db.invoices(month);\n  return fmt(rows.reduce((s, r) => s + r.amount, 0));\n};\n" } },
            { author: N, date: D(10, 14), message: 'Support custom report formulas', changes: { 'src/report.js': "const db = require('./db');\nconst fmt = require('./fmt');\n\nexports.total = async (month) => {\n  const rows = await db.invoices(month);\n  return fmt(rows.reduce((s, r) => s + r.amount, 0));\n};\n\nexports.custom = (formula, row) => eval(formula);\n" } },
            { author: A, date: D(10, 30), message: 'Rename total to monthlyTotal', changes: { 'src/report.js': "const db = require('./db');\nconst fmt = require('./fmt');\n\nexports.monthlyTotal = async (month) => {\n  const rows = await db.invoices(month);\n  return fmt(rows.reduce((s, r) => s + r.amount, 0));\n};\n\nexports.custom = (formula, row) => eval(formula);\n" } },
          ],
        },
      ],
    }),
  },
  {
    id: 'npm-prod',
    title: "Production'ga nima ta'sir qiladi?",
    category: 'web',
    level: 1,
    description:
      "Quyida `npm audit` va `npm ls` natijasi. Jamoa production'ga ta'sir qiladigan eng jiddiy zaiflikni birinchi tuzatmoqchi. Qaysi paket?\n\nFlag formati: `flag{paket}`",
    data: [
      '$ npm audit',
      '# npm audit report',
      '',
      'lodash  <=4.17.20',
      'Severity: high',
      'Command Injection in lodash - https://github.com/advisories/GHSA-35jh-r3h4-6jhm',
      'fix available via `npm audit fix`',
      'node_modules/lodash',
      '',
      'minimist  1.0.0 - 1.2.5',
      'Severity: critical',
      'Prototype Pollution in minimist - https://github.com/advisories/GHSA-xvch-5gv4-984h',
      'fix available via `npm audit fix`',
      'node_modules/minimist',
      '',
      '2 vulnerabilities (1 high, 1 critical)',
      '',
      '$ npm ls minimist',
      'shop@2.0.0 /srv/shop',
      '└─┬ mocha@10.2.0  (devDependencies)',
      '  └─┬ mkdirp@0.5.5',
      '    └── minimist@1.2.5',
    ].join('\n'),
    hints: ["Critical paket qaysi bog'liqlik orqali keladi — test vositasi (devDependencies) production'ga o'rnatilmaydi.", '`npm audit --omit=dev` natijasini tasavvur qiling.'],
    flagHash: '0f24d087c863ce',
  },
];
