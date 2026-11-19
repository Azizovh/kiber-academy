import type { Lab } from '../types';
import { createRepos, gitDate, type GitRepoSpec } from '../../engine/terminal/git';
import { fileAt } from './helpers';

/*
 * Git and code security labs. Repositories are described commit by commit; commit ids are computed by the engine,
 * so tasks that need an id compute it the same way (idOf).
 */

const HOME = '/home/talaba';
const D = (month: number, day: number, h = 10, m = 0) => Date.UTC(2026, month - 1, day, h - 5, m, 0);

function idOf(spec: GitRepoSpec, message: string): string {
  const repo = createRepos([spec], { type: 'dir', children: {}, mode: 0o755, owner: 'root' }).get(spec.path)!;
  return [...repo.commits.values()].find((c) => c.message === message)!.id;
}

const ALI = 'Ali Valiyev <ali@qaydnoma.lab>';
const SEVARA = 'Sevara Karimova <sevara@qaydnoma.lab>';
const JASUR = 'Jasur Toshmatov <jasur@qaydnoma.lab>';

/* ── 1. Git basics: who broke the owner check? ─────────────────────────── */

const NOTES_OK = [
  "const db = require('../db');",
  '',
  'module.exports = (router) => {',
  "  router.get('/api/v1/notes/:id', async (req, res) => {",
  "    const note = await db.get('SELECT * FROM notes WHERE id = ? AND owner_id = ?', [req.params.id, req.user.id]);",
  "    if (!note) return res.status(404).json({ error: 'not found' });",
  '    res.json(note);',
  '  });',
  '};',
  '',
].join('\n');
const NOTES_BUG = NOTES_OK.replace("'SELECT * FROM notes WHERE id = ? AND owner_id = ?', [req.params.id, req.user.id]", "'SELECT * FROM notes WHERE id = ?', [req.params.id]");
const NOTES_LIST = NOTES_BUG.replace('};\n', "  router.get('/api/v1/notes', async (req, res) => {\n    res.json(await db.all('SELECT id, title FROM notes WHERE owner_id=?', [req.user.id]));\n  });\n};\n");
const NOTES_DEBUG = NOTES_LIST.replace("  router.get('/api/v1/notes/:id', async (req, res) => {\n", "  router.get('/api/v1/notes/:id', async (req, res) => {\n    console.log('note', req.params.id);\n");

const BASICS_REPO: GitRepoSpec = {
  path: `${HOME}/qaydnoma-api`,
  remotes: { origin: 'git@git.qaydnoma.lab:qaydnoma/api.git' },
  user: { name: 'Talaba', email: 'talaba@qaydnoma.lab' },
  commits: [
    { author: ALI, date: D(10, 1, 11), message: 'Initial commit', changes: { 'README.md': '# Qaydnoma API\n', 'package.json': '{\n  "name": "qaydnoma-api",\n  "version": "2.0.0"\n}\n', '.gitignore': 'node_modules/\n.env\n' } },
    { author: ALI, date: D(10, 3, 15), message: 'Add database layer', changes: { 'src/db.js': "const sqlite = require('better-sqlite3');\nmodule.exports = require('./db-wrapper')(sqlite('notes.db'));\n" } },
    { author: ALI, date: D(10, 20, 12), message: 'Add notes API', changes: { 'src/routes/notes.js': NOTES_OK } },
    { author: SEVARA, date: D(10, 24, 10), message: 'Add CI pipeline', changes: { '.github/workflows/ci.yml': 'name: ci\non: [push]\njobs:\n  test:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n      - run: npm ci && npm test\n' } },
    { author: SEVARA, date: D(11, 5, 17), message: 'Release 2.2.0', changes: { 'package.json': '{\n  "name": "qaydnoma-api",\n  "version": "2.2.0"\n}\n' } },
    { branch: 'feature/export', author: SEVARA, date: D(11, 8, 14), message: 'Add CSV export', changes: { 'src/routes/export.js': "module.exports = (router) => {\n  router.get('/api/v1/export', (req, res) => res.send('id,title'));\n};\n" } },
    { author: JASUR, date: D(11, 12, 23, 40), message: 'Speed up notes query (cache-friendly)', changes: { 'src/routes/notes.js': NOTES_BUG } },
    { author: JASUR, date: D(11, 13, 11), message: 'Add notes list endpoint', changes: { 'src/routes/notes.js': NOTES_LIST } },
    { author: ALI, date: D(11, 14, 9), message: 'Release 2.3.0', changes: { 'package.json': '{\n  "name": "qaydnoma-api",\n  "version": "2.3.0"\n}\n', 'README.md': '# Qaydnoma API\n\nNotes service for Qaydnoma.\n' } },
    { branch: 'fix/owner-check', author: SEVARA, date: D(11, 17, 16), message: 'Restore owner check on GET /notes/:id', changes: { 'src/routes/notes.js': NOTES_LIST.replace("'SELECT * FROM notes WHERE id = ?', [req.params.id]", "'SELECT * FROM notes WHERE id = ? AND owner_id = ?', [req.params.id, req.user.id]"), 'test/notes.test.js': "test('other users get 404', async () => {\n  expect((await asUser(2).get('/api/v1/notes/1')).status).toBe(404);\n});\n" } },
  ],
  tags: { 'v2.2.0': 'Release 2.2.0', 'v2.3.0': 'Release 2.3.0' },
  worktree: { 'src/routes/notes.js': NOTES_DEBUG, 'TODO.md': '- review IDOR report\n' },
};
const BUG_ID = idOf(BASICS_REPO, 'Speed up notes query (cache-friendly)');

export const gitBasics: Lab = {
  id: 'git-asoslari',
  title: 'Git asoslari: xatoni kim va qachon kiritgan?',
  summary: "Git tarixini o'qish: status, log (--oneline, -n, --author, --grep, --stat, --format, -S, YO'L bo'yicha), show va REV:YO'L, diff, blame, grep, tarmoqlar, teglar, restore, switch, add va commit.",
  minutes: 45,
  level: 1,
  intro:
    "Qaydnoma'da xatolik haqida xabar keldi: foydalanuvchi boshqa odamning qaydini ID ni o'zgartirib ochishi mumkin (AppSec bosqichidagi IDOR). `v2.2.0` da bu muammo yo'q edi, `v2.3.0` da bor. Repozitoriy: `~/qaydnoma-api`.\n\n" +
    "Git — kodning to'liq tarixi: har bir **commit** — loyihaning o'sha paytdagi holati, muallifi, sanasi va izohi bilan. Shuning uchun \"kim, qachon, nima uchun\" savollariga javob shu yerda.\n\n" +
    "Boshlash uchun: `cd qaydnoma-api`. Commitga qisqa ID (birinchi 7 belgi), tarmoq (branch) yoki teg nomi bilan murojaat qilish mumkin; `HEAD` — joriy commit, `HEAD~1` — undan oldingisi.",
  shell: () => ({ fs: { home: { talaba: {} }, tmp: {} }, git: [BASICS_REPO] }),
  tasks: [
    {
      id: 'status',
      teach: ['git', 'git status'],
      text: "Repozitoriyga kiring va uning holatini ko'ring: qaysi tarmoqdasiz, nima o'zgargan?",
      hint: "`cd qaydnoma-api`, keyin `git status` — modified: o'zgartirilgan, Untracked: git hali kuzatmayotgan fayl.",
      solution: ['cd qaydnoma-api', 'git status'],
      check: ({ output }) => output.includes('On branch main') && output.includes('modified:   src/routes/notes.js') && output.includes('TODO.md'),
    },
    {
      id: 'log',
      teach: ['git log'],
      text: "Commitlar tarixini ko'ring.",
      hint: '`git log` — har commit: ID, muallif, sana va izoh. Eng yangisi tepada.',
      solution: ['git log'],
      check: ({ line, output }) => line.trim() === 'git log' && output.includes('Author: Jasur Toshmatov'),
    },
    {
      id: 'oneline',
      teach: ['git log --oneline'],
      text: 'Tarixni ixcham — har commit bitta qatorda — ko\'rsating.',
      hint: '`git log --oneline` — qavs ichida: HEAD, tarmoqlar va teglar.',
      solution: ['git log --oneline'],
      check: ({ output }) => output.includes('tag: v2.3.0) Release 2.3.0') && output.split('\n').length === 8,
    },
    {
      id: 'n',
      teach: ['git log -n N'],
      text: 'Faqat oxirgi 3 ta commitni chiqaring.',
      hint: '`git log --oneline -n 3` (yoki `-3`).',
      solution: ['git log --oneline -n 3'],
      check: ({ output }) => output.split('\n').length === 3 && output.includes('Release 2.3.0'),
    },
    {
      id: 'author',
      teach: ['git log --author'],
      text: "Jasur qanday commitlar qilgan?",
      hint: '`git log --oneline --author=jasur`',
      solution: ['git log --oneline --author=jasur'],
      check: ({ output }) => output.split('\n').length === 2 && output.includes('Speed up notes query'),
    },
    {
      id: 'grep',
      teach: ['git log --grep'],
      text: '"Release" so\'zi bor commit izohlarini toping.',
      hint: '`git log --oneline --grep=Release`',
      solution: ['git log --oneline --grep=Release'],
      check: ({ output }) => output.includes('Release 2.2.0') && output.includes('Release 2.3.0') && output.split('\n').length === 2,
    },
    {
      id: 'stat',
      teach: ['git log --stat'],
      text: "Oxirgi 2 ta commitda qaysi fayllar va qancha o'zgargan?",
      hint: '`git log --stat -n 2`',
      solution: ['git log --stat -n 2'],
      check: ({ output }) => output.includes('src/routes/notes.js |') && output.includes('file changed'),
    },
    {
      id: 'tags',
      teach: ['git tag / remote -v'],
      text: "Qanday teglar (relizlar) bor va repozitoriy qayerdan klonlangan?",
      hint: '`git tag`, keyin `git remote -v`',
      solution: ['git tag', 'git remote -v'],
      check: ({ output }) => output.includes('origin\tgit@git.qaydnoma.lab:qaydnoma/api.git (fetch)'),
    },
    {
      id: 'between',
      text: "Xato v2.2.0 va v2.3.0 orasida paydo bo'lgan. Shu ikki reliz orasidagi commitlarni ko'rsating.",
      hint: '`git log --oneline v2.2.0..v2.3.0` — A..B: B da bor, A da yo\'q commitlar.',
      solution: ['git log --oneline v2.2.0..v2.3.0'],
      check: ({ output }) => output.split('\n').length === 3 && output.includes('Speed up notes query') && !output.includes('Release 2.2.0'),
    },
    {
      id: 'path',
      teach: ["git log -- YO'L"],
      text: "`src/routes/notes.js` fayliga tegishli commitlar qaysilar?",
      hint: '`git log --oneline -- src/routes/notes.js`',
      solution: ['git log --oneline -- src/routes/notes.js'],
      check: ({ output }) => output.split('\n').length === 3 && output.includes('Add notes API'),
    },
    {
      id: 'diff-tags',
      text: 'Ikki reliz orasida `notes.js` aynan qanday o\'zgargan?',
      hint: '`git diff v2.2.0 v2.3.0 -- src/routes/notes.js` — `-` bilan boshlangan qator o\'chirilgan, `+` — qo\'shilgan.',
      solution: ['git diff v2.2.0 v2.3.0 -- src/routes/notes.js'],
      check: ({ output }) => output.includes('-    const note = await db.get(\'SELECT * FROM notes WHERE id = ? AND owner_id = ?\'') && output.includes("+    const note = await db.get('SELECT * FROM notes WHERE id = ?', [req.params.id]);"),
    },
    {
      id: 'blame',
      teach: ['git blame'],
      text: "Hozirgi faylda qaysi qatorni kim yozganini ko'ring.",
      hint: '`git blame src/routes/notes.js` — 5-qator (so\'rov) kim tomonidan, qaysi commitda?',
      solution: ['git blame src/routes/notes.js'],
      check: ({ output }) => new RegExp(`^${BUG_ID.slice(0, 8)} \\(Jasur Toshmatov .*const note = await db.get\\('SELECT \\* FROM notes WHERE id = \\?', \\[req\\.params\\.id\\]\\);`, 'm').test(output),
    },
    {
      id: 'pickaxe',
      teach: ['git log -S'],
      text: "`owner_id = ?` matni qaysi commitlarda qo'shilgan yoki olib tashlangan?",
      hint: "`git log -S 'owner_id = ?' --oneline` — -S: shu matn soni o'zgargan commitlar. Ikki natija: qo'shilgan va olib tashlangan.",
      solution: ["git log -S 'owner_id = ?' --oneline"],
      check: ({ output }) => output.includes('Speed up notes query') && output.includes('Add notes API') && output.split('\n').length === 2,
    },
    {
      id: 'show',
      teach: ['git show'],
      text: "Xatoni kiritgan commitni to'liq ko'ring: izohi va o'zgarishi.",
      hint: `\`git show ${BUG_ID.slice(0, 7)}\` — izohi "tezlashtirish", lekin aslida egalik tekshiruvi olib tashlangan.`,
      solution: [`git show ${BUG_ID.slice(0, 7)}`],
      check: ({ output }) => output.includes('Speed up notes query (cache-friendly)') && output.includes('diff --git a/src/routes/notes.js'),
    },
    {
      id: 'show-path',
      teach: ["git show REV:YO'L"],
      text: "To'g'ri ishlagan versiyani ko'ring: `v2.2.0` dagi `notes.js` qanday edi?",
      hint: '`git show v2.2.0:src/routes/notes.js`',
      solution: ['git show v2.2.0:src/routes/notes.js'],
      check: ({ output }) => output.includes('AND owner_id = ?') && !output.includes('/api/v1/notes\''),
    },
    {
      id: 'format',
      teach: ['git log --format'],
      text: "Hisobot uchun: shu commitning qisqa ID si, muallifi, sanasi va izohini bitta qatorda chiqaring.",
      hint: `\`git log -n 1 --format='%h %an %ad %s' --date=short ${BUG_ID.slice(0, 7)}\``,
      solution: [`git log -n 1 --format='%h %an %ad %s' --date=short ${BUG_ID.slice(0, 7)}`],
      check: ({ output }) => output.trim() === `${BUG_ID.slice(0, 7)} Jasur Toshmatov ${gitDate(D(11, 12, 23, 40), 'short')} Speed up notes query (cache-friendly)`,
    },
    {
      id: 'git-grep',
      teach: ['git grep'],
      text: "Kodda `owner_id` hozir qayerlarda ishlatiladi?",
      hint: '`git grep -n owner_id` — ro\'yxat endpointida bor, bitta qaydni olishda yo\'q.',
      solution: ['git grep -n owner_id'],
      check: ({ output }) => output.split('\n').length === 1 && output.includes('src/routes/notes.js:') && output.includes('WHERE owner_id=?'),
    },
    {
      id: 'branches',
      teach: ['git branch'],
      text: "Qanday tarmoqlar bor? Kimdir tuzatish tayyorlaganmi?",
      hint: '`git branch -a -v` — fix/owner-check.',
      solution: ['git branch -a -v'],
      check: ({ output }) => output.includes('fix/owner-check') && output.includes('Restore owner check'),
    },
    {
      id: 'diff-local',
      teach: ['git diff'],
      text: "Siz ishchi papkada nimani o'zgartirgansiz? (Tarmoqni almashtirishdan oldin tekshiring.)",
      hint: '`git diff` — kimdir disk ustida debug uchun console.log qo\'shib qo\'ygan.',
      solution: ['git diff'],
      check: ({ output }) => output.includes("+    console.log('note', req.params.id);"),
    },
    {
      id: 'restore',
      teach: ['git restore', 'git checkout / switch'],
      text: "Bu debug qatori kerak emas. O'zgarishni bekor qiling va `fix/owner-check` tarmog'iga o'ting.",
      hint: '`git restore src/routes/notes.js`, keyin `git switch fix/owner-check` (o\'zgarish qolsa, git o\'tkazmaydi).',
      solution: ['git restore src/routes/notes.js', 'git switch fix/owner-check'],
      check: ({ state }) => state.git!.get(`${HOME}/qaydnoma-api`)!.head === 'fix/owner-check' && (fileAt(state, `${HOME}/qaydnoma-api/src/routes/notes.js`) ?? '').includes('AND owner_id = ?') && !(fileAt(state, `${HOME}/qaydnoma-api/src/routes/notes.js`) ?? '').includes('console.log'),
    },
    {
      id: 'review',
      text: "Tuzatish tarmog'i `main` ga nisbatan nimani o'zgartiradi? Fayllar ro'yxati va o'zgarishlar soni bilan.",
      hint: '`git diff main fix/owner-check --stat` — notes.js tuzatilgan va test qo\'shilgan.',
      solution: ['git diff main fix/owner-check --stat'],
      check: ({ output }) => output.includes('test/notes.test.js') && output.includes('2 files changed'),
    },
    {
      id: 'commit',
      teach: ['git add', 'git commit -m'],
      text: "Tuzatishga `CHANGELOG.md` qo'shing: unda bitta qator — `- IDOR fix: GET /notes/:id checks owner`. Faylni yarating, indeksga qo'shing va commit qiling.",
      hint: "`echo '- IDOR fix: GET /notes/:id checks owner' > CHANGELOG.md`, `git add CHANGELOG.md`, `git commit -m \"Add changelog entry for IDOR fix\"`",
      solution: ["echo '- IDOR fix: GET /notes/:id checks owner' > CHANGELOG.md", 'git add CHANGELOG.md', 'git commit -m "Add changelog entry for IDOR fix"'],
      check: ({ state }) => {
        const repo = state.git!.get(`${HOME}/qaydnoma-api`)!;
        const tip = repo.commits.get(repo.branches.get('fix/owner-check')!)!;
        return (tip.snapshot['CHANGELOG.md'] ?? '').includes('IDOR fix') && tip.author.startsWith('Talaba');
      },
    },
    {
      id: 'challenge',
      challenge: true,
      text: "Mustaqil vazifa: egalik tekshiruvini **olib tashlagan** commitning qisqa ID si, muallifi va qisqa sanasini `~/topilma.txt` ga yozing — `ID MUALLIF SANA` ko'rinishida, bitta qator.",
      hint: "Pickaxe (-S) eng yangi natijani birinchi beradi; -n 1 va o'z formatingiz, `>` bilan faylga.",
      solution: ["git log -S 'owner_id = ?' -n 1 --format='%h %an %ad' --date=short main > ~/topilma.txt"],
      check: ({ state }) => (fileAt(state, `${HOME}/topilma.txt`) ?? '').trim() === `${BUG_ID.slice(0, 7)} Jasur Toshmatov ${gitDate(D(11, 12, 23, 40), 'short')}`,
    },
  ],
};

/* ── 2. Secrets in a repository: find them everywhere, then clean up ─────── */

// Fake secrets for the lab. They are assembled from parts so the source file itself never contains a string that
// secret scanners (GitHub push protection, gitleaks on this repo) take for a real credential.
const fake = (...parts: string[]) => parts.join('');
const AWS_KEY = fake('AKIA', 'LABEXAMPLE7SECRT');
const AWS_SECRET = 'lab0EXAMPLE0secret0key0do0not0use000000';
const STRIPE = fake('sk_', 'live_', 'LAB0example0do0not0use0');
const SLACK = fake('https://hooks.', 'slack.com/services/', 'T0LAB0000/', 'B0LAB0000/', 'LabExampleWebhookToken00');
const GHP = fake('ghp', '_LAB0example0token0do0not0use0000000A');
const NPM_TOKEN = fake('npm', '_LAB0example0npmtoken0do0not0use00000');
const DB_PROD = 'Pr0d!Qaydnoma#2026';

const SECRETS_REPO: GitRepoSpec = {
  path: `${HOME}/qaydnoma-deploy`,
  remotes: { origin: 'git@git.qaydnoma.lab:qaydnoma/deploy.git' },
  user: { name: 'Talaba', email: 'talaba@qaydnoma.lab' },
  commits: [
    { author: ALI, date: D(10, 2, 11), message: 'Initial commit', changes: { 'README.md': '# qaydnoma-deploy\n\nDeployment scripts for Qaydnoma.\n', '.gitignore': 'node_modules/\n*.log\n', 'scripts/deploy.sh': '#!/bin/sh\nset -e\nansible-playbook -i deploy/hosts site.yml\n' } },
    { author: JASUR, date: D(10, 9, 18), message: 'Add deploy key and ansible config', changes: { 'deploy/id_ed25519': '-----BEGIN OPENSSH PRIVATE KEY-----\nb3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAEbm9uZQAAAAAAAAABAAAAMwAAAAtzc2gtZW\nLAB0EXAMPLE0KEY0MATERIAL0NOT0REAL0000000000000000000000000000000000==\n-----END OPENSSH PRIVATE KEY-----\n', 'deploy/ansible.cfg': '[defaults]\ninventory = deploy/hosts\nprivate_key_file = ~/.ssh/deploy\n' } },
    { author: JASUR, date: D(10, 15, 14), message: 'Add S3 backup script', changes: { 'scripts/backup.sh': `#!/bin/sh\nexport AWS_ACCESS_KEY_ID=${AWS_KEY}\nexport AWS_SECRET_ACCESS_KEY=${AWS_SECRET}\naws s3 cp /var/backups/db.sql.gz s3://qaydnoma-backups/\n` } },
    { author: SEVARA, date: D(10, 20, 10), message: 'Add production settings', changes: { 'config/settings.py': `import os\n\nDEBUG = False\nSTRIPE_SECRET_KEY = "${STRIPE}"\nALLOWED_HOSTS = ["qaydnoma.example.com"]\n`, 'config/.env.production': `DB_HOST=10.10.20.40\nDB_USER=qaydnoma\nDB_PASSWORD=${DB_PROD}\n` } },
    { author: ALI, date: D(10, 28, 16), message: 'Remove deploy key, read AWS keys from environment', changes: { 'deploy/id_ed25519': null, 'scripts/backup.sh': '#!/bin/sh\nexport AWS_ACCESS_KEY_ID="${BACKUP_AWS_KEY}"\nexport AWS_SECRET_ACCESS_KEY="${BACKUP_AWS_SECRET}"\naws s3 cp /var/backups/db.sql.gz s3://qaydnoma-backups/\n' } },
    { author: SEVARA, date: D(11, 3, 12), message: 'Add Slack notifications to deploy workflow', changes: { '.github/workflows/deploy.yml': `name: deploy\non:\n  push:\n    branches: [main]\njobs:\n  deploy:\n    runs-on: ubuntu-latest\n    env:\n      SLACK_WEBHOOK: ${SLACK}\n    steps:\n      - uses: actions/checkout@v4\n      - run: ./scripts/deploy.sh\n` } },
    { orphan: true, author: JASUR, date: D(11, 10, 19), message: 'WIP local testing', changes: { '.env': `GITHUB_TOKEN=${GHP}\n` } },
    { author: ALI, date: D(11, 12, 9), message: 'Bump ansible inventory', changes: { 'deploy/ansible.cfg': '[defaults]\ninventory = deploy/hosts.prod\nprivate_key_file = ~/.ssh/deploy\n' } },
  ],
  reflog: [
    { target: 'Bump ansible inventory', action: 'commit: Bump ansible inventory' },
    { target: 'Add Slack notifications to deploy workflow', action: 'reset: moving to HEAD~1' },
    { target: 'WIP local testing', action: 'commit: WIP local testing' },
    { target: 'Add Slack notifications to deploy workflow', action: 'commit: Add Slack notifications to deploy workflow' },
    { target: 'Remove deploy key, read AWS keys from environment', action: 'commit: Remove deploy key, read AWS keys from environment' },
    { target: 'Add production settings', action: 'commit: Add production settings' },
    { target: 'Add S3 backup script', action: 'commit: Add S3 backup script' },
    { target: 'Add deploy key and ansible config', action: 'commit: Add deploy key and ansible config' },
    { target: 'Initial commit', action: 'commit (initial): Initial commit' },
  ],
  stash: [{ message: 'WIP npm publish', changes: { '.npmrc': `//registry.npmjs.org/:_authToken=${NPM_TOKEN}\n` }, date: D(11, 14, 18) }],
  worktree: { '.env': 'DB_PASSWORD=LocalDev#Pass2026\n' },
};
const BACKUP_ID = idOf(SECRETS_REPO, 'Add S3 backup script');
const REMOVE_ID = idOf(SECRETS_REPO, 'Remove deploy key, read AWS keys from environment');
const REPLACE_RULES = [`${AWS_KEY}==>***REMOVED***`, `${AWS_SECRET}==>***REMOVED***`, `${STRIPE}==>***REMOVED***`, 'regex:hooks\\.slack\\.com/services/\\S+==>hooks.slack.com/services/***REMOVED***', `${DB_PROD}==>***REMOVED***`].join('\n') + '\n';

export const gitSecrets: Lab = {
  id: 'git-sirlar',
  title: 'Repozitoriydagi sirlar: topish va tarixni tozalash',
  summary: "gitleaks bilan tarix va fayllardagi kalit, token, shaxsiy kalit va parollarni topish; git log -S, show REV:YO'L, o'chirilgan fayllar, reflog, stash; .gitignore, rm --cached va git filter-repo bilan tozalash.",
  minutes: 55,
  level: 2,
  intro:
    "`qaydnoma-deploy` — deploy skriptlari repozitoriysi. Uni tez orada ochiq (public) qilishmoqchi. Sizning vazifangiz: undagi barcha sirlarni topish va tarixni tozalash.\n\n" +
    "Muhim qoida: **faylni o'chirib commit qilish sirni yo'q qilmaydi** — u eski commitlarda qoladi va repozitoriyni klonlagan har kim uni ko'radi. Shuning uchun:\n1. topish (`gitleaks`, `git log -S`),\n2. **sirni almashtirish** (kalitni bekor qilib, yangisini berish — bu labdan tashqarida, lekin birinchi navbatda),\n3. faylni kuzatuvdan chiqarish va `.gitignore`,\n4. tarixni qayta yozish (`git filter-repo`).\n\n" +
    "Repozitoriy: `~/qaydnoma-deploy`, almashtirish qoidalari: `~/ochiq-sirlar.txt`.",
  shell: () => ({ fs: { home: { talaba: { 'ochiq-sirlar.txt': REPLACE_RULES } }, tmp: {} }, git: [SECRETS_REPO] }),
  tasks: [
    {
      id: 'gitleaks',
      teach: ['gitleaks', 'gitleaks git'],
      text: "Repozitoriyga kiring va butun git tarixini sirlarga tekshiring.",
      hint: '`cd qaydnoma-deploy`, keyin `gitleaks git` — oxirgi qatorlar: nechta commit tekshirildi va nechta sir topildi.',
      solution: ['cd qaydnoma-deploy', 'gitleaks git'],
      check: ({ output }) => output.includes('commits scanned') && /leaks found: \d+/.test(output),
    },
    {
      id: 'verbose',
      teach: ['gitleaks -v', 'gitleaks --redact'],
      text: "Har bir topilmani batafsil ko'ring, lekin sir qiymatlarini ekranga chiqarmang.",
      hint: '`gitleaks git -v --redact` — RuleID: sir turi, File/Line: qayerda, Commit/Author: kim qo\'shgan.',
      solution: ['gitleaks git -v --redact'],
      check: ({ output }) => ['private-key', 'aws-access-token', 'stripe-access-token', 'slack-webhook-url', 'npm-access-token'].every((r) => output.includes(`RuleID:      ${r}`)) && !output.includes(STRIPE),
    },
    {
      id: 'report',
      teach: ['gitleaks --report-path'],
      text: "Topilmalarni `~/leaks.json` ga saqlang va undan qisqa jadval chiqaring: sir turi, fayl, muallif.",
      hint: "`gitleaks git --redact --report-path ~/leaks.json`, keyin `jq -r '.[] | [.RuleID, .File, .Author] | @tsv' ~/leaks.json`",
      solution: ['gitleaks git --redact --report-path ~/leaks.json', "jq -r '.[] | [.RuleID, .File, .Author] | @tsv' ~/leaks.json"],
      check: ({ output }) => output.includes('private-key\tdeploy/id_ed25519\tJasur Toshmatov') && output.includes('stripe-access-token\tconfig/settings.py\tSevara Karimova'),
    },
    {
      id: 'dir',
      teach: ['gitleaks dir'],
      text: "Endi tarixni emas, hozirgi fayllarni tekshiring (git'ga qo'shilmaganlari ham).",
      hint: '`gitleaks dir -v --redact .` — `.env` hali commit qilinmagan, lekin diskda turibdi.',
      solution: ['gitleaks dir -v --redact .'],
      check: ({ output }) => output.includes('File:        config/settings.py') && output.includes('File:        .env'),
    },
    {
      id: 'pickaxe',
      text: "AWS kaliti qaysi commitlarda paydo bo'lgan va yo'qolgan?",
      hint: '`git log -S AKIA --oneline` — ikki commit: qo\'shilgan va "olib tashlangan". Lekin birinchisida u hamon bor.',
      solution: ['git log -S AKIA --oneline'],
      check: ({ output }) => output.split('\n').length === 2 && output.includes('Add S3 backup script'),
    },
    {
      id: 'show-old',
      text: "Kalit qo'shilgan commitdagi `scripts/backup.sh` ni ko'ring — repozitoriyni klonlagan har kim shuni ko'radi.",
      hint: `\`git show ${BACKUP_ID.slice(0, 7)}:scripts/backup.sh\``,
      solution: [`git show ${BACKUP_ID.slice(0, 7)}:scripts/backup.sh`],
      check: ({ output }) => output.includes(`AWS_ACCESS_KEY_ID=${AWS_KEY}`),
    },
    {
      id: 'deleted',
      teach: ['git log --diff-filter'],
      text: "Tarixda qaysi fayllar o'chirilgan?",
      hint: '`git log --diff-filter=D --name-only --oneline` — deploy/id_ed25519: shaxsiy SSH kalit.',
      solution: ['git log --diff-filter=D --name-only --oneline'],
      check: ({ output }) => output.includes('deploy/id_ed25519'),
    },
    {
      id: 'key',
      text: "O'chirilgan kalit o'chirishdan oldingi commitda hamon bor-yo'qligini tekshiring (faqat birinchi qator yetadi).",
      hint: `\`git show ${REMOVE_ID.slice(0, 7)}~1:deploy/id_ed25519 | head -n 1\` — ~1: o'sha commitdan bitta oldingisi.`,
      solution: [`git show ${REMOVE_ID.slice(0, 7)}~1:deploy/id_ed25519 | head -n 1`],
      check: ({ output }) => output.trim() === '-----BEGIN OPENSSH PRIVATE KEY-----',
    },
    {
      id: 'grep',
      text: "Hozirgi kodda Slack webhook manzili bormi?",
      hint: '`git grep -n hooks.slack.com` — webhook ham sir: uni bilgan har kim kanalga xabar yubora oladi.',
      solution: ['git grep -n hooks.slack.com'],
      check: ({ output }) => output.includes('.github/workflows/deploy.yml:9:'),
    },
    {
      id: 'reflog',
      teach: ['git reflog'],
      text: "HEAD tarixini ko'ring. Kimdir commitni \"bekor qilgan\"mi?",
      hint: '`git reflog` — "reset: moving to HEAD~1": WIP commit tarmoqdan olib tashlangan, lekin hali yo\'q bo\'lmagan.',
      solution: ['git reflog'],
      check: ({ output }) => output.includes('HEAD@{1}: reset: moving to HEAD~1') && output.includes('HEAD@{2}: commit: WIP local testing'),
    },
    {
      id: 'orphan',
      text: "O'sha bekor qilingan commitda nima bor edi?",
      hint: '`git show HEAD@{2}` — GitHub tokeni. Bu commit hech qaysi tarmoqda yo\'q, shuning uchun gitleaks uni ko\'rmadi.',
      solution: ['git show HEAD@{2}'],
      check: ({ output }) => output.includes('WIP local testing') && output.includes(`GITHUB_TOKEN=${GHP}`),
    },
    {
      id: 'stash',
      teach: ['git stash list / show -p'],
      text: "Vaqtincha saqlangan (stash) o'zgarishlar bormi? Ularning mazmunini ko'ring.",
      hint: '`git stash list`, keyin `git stash show -p stash@{0}` — .npmrc dagi npm tokeni.',
      solution: ['git stash list', 'git stash show -p stash@{0}'],
      check: ({ output }) => output.includes(`_authToken=${NPM_TOKEN}`),
    },
    {
      id: 'status',
      text: "Ishchi papkada git kuzatmayotgan fayllar bormi?",
      hint: "`git status` — `.env` Untracked: `git add .` qilinsa, u ham commitga tushadi.",
      solution: ['git status'],
      check: ({ output }) => output.includes('Untracked files:') && output.includes('\t.env'),
    },
    {
      id: 'ignore',
      teach: ['git check-ignore -v'],
      text: "`.env` ni `.gitignore` ga qo'shing va git uni haqiqatan e'tiborsiz qoldirayotganini tekshiring.",
      hint: "`echo .env >> .gitignore`, keyin `git check-ignore -v .env` — qaysi fayl, qaysi qator, qaysi qoida.",
      solution: ['echo .env >> .gitignore', 'git check-ignore -v .env'],
      check: ({ output }) => output.trim() === '.gitignore:3:.env\t.env',
    },
    {
      id: 'rm-cached',
      teach: ['git rm --cached'],
      text: "`config/.env.production` git'da kuzatilmoqda. Uni repozitoriydan chiqaring (diskda qolsin) va `.gitignore` ga qo'shing.",
      hint: '`git rm --cached config/.env.production`, keyin `echo config/.env.production >> .gitignore`',
      solution: ['git rm --cached config/.env.production', 'echo config/.env.production >> .gitignore'],
      check: ({ state }) => {
        const repo = state.git!.get(`${HOME}/qaydnoma-deploy`)!;
        return !('config/.env.production' in repo.index) && fileAt(state, `${HOME}/qaydnoma-deploy/config/.env.production`) !== null && (fileAt(state, `${HOME}/qaydnoma-deploy/.gitignore`) ?? '').includes('config/.env.production');
      },
    },
    {
      id: 'settings',
      text: "`config/settings.py` dagi Stripe kalitini muhit o'zgaruvchisidan o'qiladigan qiling.",
      hint: "`sed -i 's/STRIPE_SECRET_KEY = .*/STRIPE_SECRET_KEY = os.environ[\"STRIPE_SECRET_KEY\"]/' config/settings.py`, tekshirish: `cat config/settings.py`",
      solution: ["sed -i 's/STRIPE_SECRET_KEY = .*/STRIPE_SECRET_KEY = os.environ[\"STRIPE_SECRET_KEY\"]/' config/settings.py"],
      check: ({ state }) => (fileAt(state, `${HOME}/qaydnoma-deploy/config/settings.py`) ?? '').includes('STRIPE_SECRET_KEY = os.environ["STRIPE_SECRET_KEY"]'),
    },
    {
      id: 'commit',
      text: "O'zgarishlarni commit qiling: `.gitignore`, `config/settings.py` va `.env.production` ning chiqarilishi.",
      hint: '`git add .gitignore config/settings.py`, keyin `git commit -m "Move secrets out of the repository"` (rm --cached allaqachon indeksda).',
      solution: ['git add .gitignore config/settings.py', 'git commit -m "Move secrets out of the repository"'],
      check: ({ state }) => {
        const repo = state.git!.get(`${HOME}/qaydnoma-deploy`)!;
        const tip = repo.commits.get(repo.branches.get('main')!)!;
        return !('config/.env.production' in tip.snapshot) && (tip.snapshot['config/settings.py'] ?? '').includes('os.environ') && !('.env' in tip.snapshot);
      },
    },
    {
      id: 'filter-path',
      teach: ['git filter-repo'],
      text: "Endi tarix: shaxsiy kalit va `.env.production` fayllarini **barcha** commitlardan olib tashlang.",
      hint: "`git filter-repo --path deploy/id_ed25519 --path config/.env.production --invert-paths --force` — --invert-paths: shu yo'llardan boshqa hammasini qoldir.",
      solution: ['git filter-repo --path deploy/id_ed25519 --path config/.env.production --invert-paths --force'],
      check: ({ state }) => [...state.git!.get(`${HOME}/qaydnoma-deploy`)!.commits.values()].every((c) => !('deploy/id_ed25519' in c.snapshot) && !('config/.env.production' in c.snapshot)),
    },
    {
      id: 'filter-text',
      text: "Qolgan sirlarni (AWS, Stripe, Slack, parol) tarixdagi fayllar ichida almashtiring. Qoidalar `~/ochiq-sirlar.txt` da.",
      hint: '`cat ~/ochiq-sirlar.txt`, keyin `git filter-repo --replace-text ~/ochiq-sirlar.txt --force`',
      solution: ['git filter-repo --replace-text ~/ochiq-sirlar.txt --force'],
      check: ({ state }) => [...state.git!.get(`${HOME}/qaydnoma-deploy`)!.commits.values()].every((c) => !Object.values(c.snapshot).some((v) => v.includes(AWS_KEY) || v.includes(STRIPE) || v.includes('LabExampleWebhookToken'))),
    },
    {
      id: 'verify',
      text: "Tarixni qayta tekshiring: gitleaks endi biror narsa topadimi?",
      hint: "`gitleaks git` — no leaks found. Eslatma: reflog va stash ham tozalandi.",
      solution: ['gitleaks git'],
      check: ({ output }) => output.includes('no leaks found'),
    },
    {
      id: 'remote',
      text: "filter-repo masofadagi repozitoriy sozlamasini ham olib tashladi. Tekshiring.",
      hint: "`git remote -v` — bo'sh. Tasodifan eski tarix bilan aralashib ketmasin deb shunday qilinadi. Keyin: remote qayta qo'shiladi, majburan push qilinadi va jamoa yangidan klonlaydi.",
      solution: ['git remote -v'],
      check: ({ line, output }) => /git remote -v/.test(line) && output.trim() === '',
    },
    {
      id: 'challenge',
      challenge: true,
      text: "Mustaqil vazifa: tozalangan tarixda (barcha tarmoqlarda) AKIA bilan boshlanuvchi kalit qo'shilgan yoki o'chirilgan commitlar sonini hisoblab, `~/tekshiruv.txt` ga yozing.",
      hint: 'Pickaxe, barcha tarmoqlar, bir qatorli ko\'rinish, qatorlarni sanash va faylga yozish.',
      solution: ['git log -S AKIA --all --oneline | wc -l > ~/tekshiruv.txt'],
      check: ({ state }) => (fileAt(state, `${HOME}/tekshiruv.txt`) ?? '').trim() === '0',
    },
  ],
};

/* ── 3. Code security: SAST, dependencies and a review ─────────────────── */

const DILSHOD = 'Dilshod Rahimov <dilshod@contractor.example>';

const RULES_YML = [
  'rules:',
  '  - id: sql-string-concat',
  "    pattern-regex: '(SELECT|INSERT|UPDATE|DELETE)[^;]*[\"''] \\+ req\\.'",
  '    message: SQL so\'rov foydalanuvchi ma\'lumotini satrga qo\'shib qurilmoqda (SQL injection). Parametrli so\'rov ishlating.',
  '    severity: ERROR',
  '    languages: [javascript]',
  '  - id: command-injection-exec',
  "    pattern-regex: 'exec\\([^)]*\\+ *req\\.'",
  "    message: Shell buyrug'iga foydalanuvchi ma'lumoti qo'shilmoqda (command injection). execFile va argumentlar ro'yxatidan foydalaning.",
  '    severity: ERROR',
  '    languages: [javascript]',
  '  - id: eval-usage',
  "    pattern-regex: '\\beval\\('",
  '    message: eval ixtiyoriy kodni bajaradi. Xavfsiz parser ishlating.',
  '    severity: WARNING',
  '    languages: [javascript]',
  '  - id: path-traversal-sendfile',
  "    pattern-regex: 'sendFile\\([^;]*req\\.(query|params|body)'",
  "    message: Fayl yo'li foydalanuvchidan olinmoqda (path traversal, ../). Ruxsat etilgan nomlar ro'yxatini tekshiring.",
  '    severity: ERROR',
  '    languages: [javascript]',
  '  - id: weak-hash',
  "    pattern-regex: 'createHash\\([\"''](md5|sha1)[\"'']\\)'",
  '    message: MD5/SHA-1 parol yoki imzo uchun yaroqsiz. Parollar uchun bcrypt yoki argon2.',
  '    severity: WARNING',
  '    languages: [javascript]',
  '  - id: hardcoded-secret',
  "    pattern-regex: '(SECRET|PASSWORD|TOKEN|API_KEY)\\s*=\\s*[\"''][^\"'']{8,}[\"'']'",
  "    message: Sir kod ichiga yozilgan. Muhit o'zgaruvchisi yoki sirlar menejeridan o'qing.",
  '    severity: ERROR',
  '    languages: [javascript]',
].join('\n') + '\n';

const LOCK = (lodash: string, axios: string, minimist: string) =>
  JSON.stringify(
    {
      name: 'qaydnoma-app',
      version: '3.1.0',
      lockfileVersion: 3,
      packages: {
        '': { name: 'qaydnoma-app', version: '3.1.0', dependencies: { axios: '^1.4.0', express: '^4.21.1', lodash: '^4.17.15' }, devDependencies: { mocha: '^10.2.0' } },
        'node_modules/axios': { version: axios },
        'node_modules/express': { version: '4.21.1', dependencies: { qs: '6.13.0' } },
        'node_modules/qs': { version: '6.13.0' },
        'node_modules/lodash': { version: lodash },
        'node_modules/mocha': { version: '10.2.0', dev: true, dependencies: { mkdirp: '0.5.5' } },
        'node_modules/mkdirp': { version: '0.5.5', dev: true, dependencies: { minimist: '1.2.5' } },
        'node_modules/minimist': { version: minimist, dev: true },
      },
    },
    null,
    2,
  ) + '\n';

const SAST_REPO: GitRepoSpec = {
  path: `${HOME}/qaydnoma-app`,
  remotes: { origin: 'git@git.qaydnoma.lab:qaydnoma/app.git' },
  user: { name: 'Talaba', email: 'talaba@qaydnoma.lab' },
  commits: [
    { author: ALI, date: D(9, 1, 10), message: 'Initial commit', changes: { 'README.md': '# Qaydnoma App\n', 'package.json': '{\n  "name": "qaydnoma-app",\n  "version": "3.0.0"\n}\n', 'package-lock.json': LOCK('4.17.15', '1.4.0', '1.2.5'), '.gitignore': 'node_modules/\n.env\n' } },
    { author: ALI, date: D(9, 5, 15), message: 'Add auth module', changes: { 'src/auth/password.js': "const crypto = require('crypto');\n\nexports.hash = (pw) => crypto.createHash('md5').update(pw).digest('hex');\n", 'src/config.js': "const JWT_SECRET = 'qaydnoma-jwt-secret-2026';\nmodule.exports = { JWT_SECRET, port: 3000 };\n" } },
    { author: JASUR, date: D(9, 18, 11), message: 'Add search endpoint', changes: { 'src/routes/search.js': "const db = require('../db');\n\nmodule.exports = (router) => {\n  router.get('/api/search', async (req, res) => {\n    const sql = \"SELECT * FROM notes WHERE title LIKE '%\" + req.query.q + \"%'\";\n    res.json(await db.all(sql));\n  });\n};\n" } },
    { author: SEVARA, date: D(10, 2, 14), message: 'Add backup endpoint for admins', changes: { 'src/utils/backup.js': "const { exec } = require('child_process');\n\nmodule.exports = (req, res) => {\n  exec('tar czf /backups/' + req.body.name + '.tgz /data', (err) => res.json({ ok: !err }));\n};\n" } },
    { author: JASUR, date: D(10, 21, 16), message: 'Add formula fields', changes: { 'src/utils/calc.js': 'module.exports = (expr) => {\n  return eval(expr);\n};\n' } },
    { branch: 'feature/export', author: DILSHOD, date: D(11, 15, 13), message: 'Add file export download', changes: { 'src/routes/export.js': "const path = require('path');\n\nmodule.exports = (router) => {\n  router.get('/api/export', (req, res) => {\n    res.sendFile(path.join(__dirname, '../../exports', req.query.file));\n  });\n};\n" } },
    { author: ALI, date: D(11, 16, 10), message: 'Release 3.1.0', changes: { 'package.json': '{\n  "name": "qaydnoma-app",\n  "version": "3.1.0"\n}\n' } },
  ],
  tags: { 'v3.1.0': 'Release 3.1.0' },
};
const EVAL_ID = idOf(SAST_REPO, 'Add formula fields');
const EXPORT_ID = idOf(SAST_REPO, 'Add file export download');

export const codeSecurity: Lab = {
  id: 'kod-xavfsizligi',
  title: "Kod xavfsizligi: SAST, bog'liqliklar va kod ko'rib chiqish",
  summary: "semgrep qoidalari bilan kodni tekshirish (SQL va buyruq injection, eval, path traversal, zaif xesh, kodga yozilgan sir), git blame/log -S bilan manbani topish, tarmoqni ko'rib chiqish, npm audit, npm ls, audit-level va audit fix, tuzatish va commit.",
  minutes: 60,
  level: 3,
  intro:
    "`qaydnoma-app` — Qaydnoma'ning yangi Node.js ilovasi. Relizdan oldin xavfsizlik tekshiruvi kerak: **SAST** (kodni ishga tushirmasdan tahlil qilish), **SCA** (bog'liqliklardagi ma'lum zaifliklar) va pudratchining `feature/export` tarmog'ini ko'rib chiqish.\n\n" +
    "SAST uchun `semgrep` va jamoaning qoidalar fayli `~/qoidalar.yml` (har qoida: id, andoza, xabar, daraja). Bog'liqliklar uchun `npm audit`: u `package-lock.json` dagi aniq versiyalarni ma'lum zaifliklar (advisory) bazasi bilan solishtiradi.\n\n" +
    "Topilmani faqat topish emas, **kim va qachon kiritganini** aniqlash ham muhim — shunda jamoa bilan gaplashib, takrorlanishining oldini olasiz.",
  shell: () => ({
    fs: { home: { talaba: { 'qoidalar.yml': RULES_YML } }, tmp: {} },
    git: [SAST_REPO],
    npm: {
      advisories: [
        { name: 'axios', range: '0.8.1 - 1.5.1', from: '0.8.1', fixed: '1.6.0', title: 'Axios Cross-Site Request Forgery Vulnerability', url: 'https://github.com/advisories/GHSA-wf5p-g6vw-rhxx', severity: 'moderate' },
        { name: 'lodash', range: '<=4.17.18', fixed: '4.17.19', title: 'Prototype Pollution in lodash', url: 'https://github.com/advisories/GHSA-p6mc-m468-83gw', severity: 'high' },
        { name: 'lodash', range: '<=4.17.20', fixed: '4.17.21', title: 'Command Injection in lodash', url: 'https://github.com/advisories/GHSA-35jh-r3h4-6jhm', severity: 'high' },
        { name: 'minimist', range: '1.0.0 - 1.2.5', from: '1.0.0', fixed: '1.2.6', title: 'Prototype Pollution in minimist', url: 'https://github.com/advisories/GHSA-xvch-5gv4-984h', severity: 'critical' },
      ],
    },
  }),
  tasks: [
    {
      id: 'semgrep',
      teach: ['semgrep', 'semgrep --config'],
      text: "Repozitoriyga kiring va kodni jamoa qoidalari bilan tekshiring.",
      hint: '`cd qaydnoma-app`, keyin `semgrep --config ~/qoidalar.yml src` — har topilma: fayl, qoida, xabar, qator.',
      solution: ['cd qaydnoma-app', 'semgrep --config ~/qoidalar.yml src'],
      check: ({ output }) => output.includes('5 Code Findings') && output.includes('sql-string-concat'),
    },
    {
      id: 'severity',
      teach: ['semgrep --severity'],
      text: 'Faqat eng jiddiy (ERROR) topilmalarni qoldiring.',
      hint: '`semgrep --config ~/qoidalar.yml --severity ERROR src`',
      solution: ['semgrep --config ~/qoidalar.yml --severity ERROR src'],
      check: ({ output }) => output.includes('3 Code Findings') && !output.includes('eval-usage'),
    },
    {
      id: 'context',
      text: "SQL injection topilgan qatorni atrofi bilan ko'ring.",
      hint: '`grep -n -B 1 -A 1 "req.query.q" src/routes/search.js`',
      solution: ['grep -n -B 1 -A 1 "req.query.q" src/routes/search.js'],
      check: ({ output }) => output.includes("5:    const sql = \"SELECT * FROM notes WHERE title LIKE '%\" + req.query.q"),
    },
    {
      id: 'blame',
      text: 'Bu qatorni kim, qachon yozgan?',
      hint: '`git blame -L 5,5 src/routes/search.js`',
      solution: ['git blame -L 5,5 src/routes/search.js'],
      check: ({ output }) => output.includes('Jasur Toshmatov') && output.split('\n').length === 1,
    },
    {
      id: 'eval',
      text: '`eval` koddagi qaysi commit bilan paydo bo\'lgan?',
      hint: "`git log -S 'eval(' --oneline`",
      solution: ["git log -S 'eval(' --oneline"],
      check: ({ output }) => output.trim() === `${EVAL_ID.slice(0, 7)} Add formula fields`,
    },
    {
      id: 'review-log',
      text: "Pudratchining `feature/export` tarmog'ida `main` da yo'q qanday commitlar bor?",
      hint: '`git log --oneline main..feature/export`',
      solution: ['git log --oneline main..feature/export'],
      check: ({ output }) => output.trim() === `${EXPORT_ID.slice(0, 7)} (feature/export) Add file export download`,
    },
    {
      id: 'review-diff',
      teach: ['git diff'],
      text: "Bu tarmoq `main` ga nisbatan kodga nima qo'shadi?",
      hint: "`git diff main feature/export -- src` — `req.query.file` to'g'ridan-to'g'ri fayl yo'liga qo'shilmoqda: `?file=../../etc/passwd`.",
      solution: ['git diff main feature/export -- src'],
      check: ({ output }) => output.includes('+    res.sendFile(path.join(__dirname, \'../../exports\', req.query.file));'),
    },
    {
      id: 'review-scan',
      text: "Tarmoqqa o'ting va ERROR darajadagi tekshiruvni qayta ishga tushiring. Yangi topilma paydo bo'ladimi?",
      hint: '`git switch feature/export`, keyin `semgrep --config ~/qoidalar.yml --severity ERROR src`',
      solution: ['git switch feature/export', 'semgrep --config ~/qoidalar.yml --severity ERROR src'],
      check: ({ output }) => output.includes('path-traversal-sendfile') && output.includes('4 Code Findings'),
    },
    {
      id: 'back',
      text: "Ko'rib chiqish tugadi (tarmoq tuzatilmaguncha qo'shilmaydi). `main` ga qayting.",
      hint: '`git switch main`',
      solution: ['git switch main'],
      check: ({ state }) => state.git!.get(`${HOME}/qaydnoma-app`)!.head === 'main',
    },
    {
      id: 'audit',
      teach: ['npm', 'npm audit'],
      text: "Endi bog'liqliklar: qaysi paketlarda ma'lum zaifliklar bor?",
      hint: '`npm audit` — har paket: zaif versiyalar oralig\'i, daraja va advisory havolasi.',
      solution: ['npm audit'],
      check: ({ output }) => output.includes('3 vulnerabilities (1 moderate, 1 high, 1 critical)'),
    },
    {
      id: 'omit-dev',
      teach: ['npm audit --omit=dev'],
      text: "Production'ga chiqadigan paketlarning o'zinigina tekshiring (dev bog'liqliklarisiz).",
      hint: '`npm audit --omit=dev` — minimist faqat test vositasi orqali keladi.',
      solution: ['npm audit --omit=dev'],
      check: ({ output }) => output.includes('2 vulnerabilities (1 moderate, 1 high)') && !output.includes('minimist'),
    },
    {
      id: 'ls',
      teach: ['npm ls PAKET'],
      text: '`minimist` loyihaga qaysi paket orqali kelgan?',
      hint: '`npm ls minimist` — mocha → mkdirp → minimist (tranzitiv bog\'liqlik).',
      solution: ['npm ls minimist'],
      check: ({ output }) => output.includes('mocha@10.2.0') && output.includes('mkdirp@0.5.5') && output.includes('minimist@1.2.5'),
    },
    {
      id: 'audit-level',
      teach: ['npm audit --audit-level'],
      text: "CI qoidasi: production bog'liqliklarida faqat **critical** bo'lsa quvur to'xtasin. Shunday tekshiruv o'tadimi? Muvaffaqiyatli bo'lsa `CI_OTDI` chiqsin.",
      hint: '`npm audit --omit=dev --audit-level=critical && echo CI_OTDI` — && dan keyingisi faqat oldingi buyruq xato kodisiz tugasa bajariladi.',
      solution: ['npm audit --omit=dev --audit-level=critical && echo CI_OTDI'],
      check: ({ output }) => output.trim().endsWith('CI_OTDI'),
    },
    {
      id: 'fix',
      teach: ['npm audit fix'],
      text: "Zaif paketlarni tuzatilgan versiyalarga yangilang va qayta tekshiring.",
      hint: '`npm audit fix`, keyin `npm audit`',
      solution: ['npm audit fix', 'npm audit'],
      check: ({ output }) => output.trim() === 'found 0 vulnerabilities',
    },
    {
      id: 'lock-diff',
      text: "`package-lock.json` da nima o'zgardi?",
      hint: '`git diff package-lock.json` — versiyalar yangilandi; bu o\'zgarish ham commit qilinadi.',
      solution: ['git diff package-lock.json'],
      check: ({ output }) => output.includes('+      "version": "4.17.21"') && output.includes('+      "version": "1.6.0"'),
    },
    {
      id: 'fix-sql',
      text: "SQL so'rovni parametrli qiling: 5-qatorni `const sql = 'SELECT * FROM notes WHERE title LIKE ?';` bilan almashtiring.",
      hint: "`sed -i \"s/const sql = .*/const sql = 'SELECT * FROM notes WHERE title LIKE ?';/\" src/routes/search.js` (qiymat `db.all(sql, ['%' + q + '%'])` bilan alohida beriladi).",
      solution: ["sed -i \"s/const sql = .*/const sql = 'SELECT * FROM notes WHERE title LIKE ?';/\" src/routes/search.js"],
      check: ({ state }) => (fileAt(state, `${HOME}/qaydnoma-app/src/routes/search.js`) ?? '').includes("const sql = 'SELECT * FROM notes WHERE title LIKE ?';"),
    },
    {
      id: 'fix-hash',
      text: "Zaif MD5 xeshni almashtiring. (Haqiqiy loyihada parollar uchun bcrypt/argon2; bu yerda kamida SHA-256.)",
      hint: "`sed -i \"s/createHash('md5')/createHash('sha256')/\" src/auth/password.js`",
      solution: ["sed -i \"s/createHash('md5')/createHash('sha256')/\" src/auth/password.js"],
      check: ({ state }) => (fileAt(state, `${HOME}/qaydnoma-app/src/auth/password.js`) ?? '').includes("createHash('sha256')"),
    },
    {
      id: 'fix-secret',
      text: "JWT sirini koddan olib, muhit o'zgaruvchisidan o'qiladigan qiling.",
      hint: '`sed -i "s/const JWT_SECRET = .*/const JWT_SECRET = process.env.JWT_SECRET;/" src/config.js`',
      solution: ['sed -i "s/const JWT_SECRET = .*/const JWT_SECRET = process.env.JWT_SECRET;/" src/config.js'],
      check: ({ state }) => (fileAt(state, `${HOME}/qaydnoma-app/src/config.js`) ?? '').startsWith('const JWT_SECRET = process.env.JWT_SECRET;'),
    },
    {
      id: 'rescan',
      text: 'semgrep bilan qayta tekshiring: nechta topilma qoldi?',
      hint: '`semgrep --config ~/qoidalar.yml src` — command injection va eval qoldi: ularni dasturchilar bilan birga qayta yozish kerak.',
      solution: ['semgrep --config ~/qoidalar.yml src'],
      check: ({ output }) => output.includes('2 Code Findings') && output.includes('command-injection-exec') && output.includes('eval-usage'),
    },
    {
      id: 'commit',
      text: "Tuzatishlarni bitta commit qiling.",
      hint: '`git add -A`, keyin `git commit -m "Fix SAST findings and update vulnerable dependencies"`',
      solution: ['git add -A', 'git commit -m "Fix SAST findings and update vulnerable dependencies"'],
      check: ({ state }) => {
        const repo = state.git!.get(`${HOME}/qaydnoma-app`)!;
        const tip = repo.commits.get(repo.branches.get('main')!)!;
        return tip.message.startsWith('Fix SAST') && (tip.snapshot['src/config.js'] ?? '').includes('process.env.JWT_SECRET') && (tip.snapshot['package-lock.json'] ?? '').includes('"version": "4.17.21"');
      },
    },
    {
      id: 'history',
      text: "Kodda JWT siri endi yo'q. Lekin tarixda-chi? gitleaks bilan tekshiring.",
      hint: "`gitleaks git -v --redact` — sir eski commitda qoldi: uni **almashtirish** shart (yangi JWT_SECRET va barcha tokenlarni bekor qilish), tarixni tozalash — qo'shimcha chora.",
      solution: ['gitleaks git -v --redact'],
      check: ({ output }) => output.includes('File:        src/config.js') && output.includes('RuleID:      generic-api-key'),
    },
    {
      id: 'challenge',
      challenge: true,
      text: "Mustaqil vazifa: ko'rib chiqish hisobotiga `feature/export` dagi path traversal kodini qaysi commit (qisqa ID) va kim yozganini `~/review.txt` ga yozing — `ID MUALLIF`.",
      hint: "Ikki tarmoq orasidagi commitlar va o'z formatingiz (%h, %an).",
      solution: ["git log main..feature/export --format='%h %an' > ~/review.txt"],
      check: ({ state }) => (fileAt(state, `${HOME}/review.txt`) ?? '').trim() === `${EXPORT_ID.slice(0, 7)} Dilshod Rahimov`,
    },
  ],
};
