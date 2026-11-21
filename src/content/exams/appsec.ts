import type { Exam, ExamPractical } from '../examTypes';
import type { GitRepoSpec } from '../../engine/terminal/git';
import { parseBank } from '../../engine/exam';
import { fileAt } from '../labs/helpers';
import { expectRows, hasRows, inserts, lastResult, queryDb } from '../labs/sqlHelpers';
import { APPSEC_BANK } from './appsecBank';

const HOME = '/home/talaba';
const single = (output: string) => output.trim().split('\n').filter((l) => l.trim()).length === 1;

/* ── practical 1: code review of a Flask app ─────────────────────────── */

const ROUTES = [
  'from flask import Blueprint, render_template, request, session, abort',
  'from .db import get_db',
  '',
  "bp = Blueprint('notes', __name__)",
  '',
  '',
  "@bp.route('/notes')",
  'def list_notes():',
  '    db = get_db()',
  "    rows = db.execute('SELECT id, title FROM notes WHERE owner_id = ?', (session['uid'],)).fetchall()",
  "    return render_template('list.html', notes=rows)",
  '',
  '',
  "@bp.route('/search')",
  'def search():',
  "    q = request.args.get('q', '')",
  '    db = get_db()',
  `    rows = db.execute(f"SELECT id, title FROM notes WHERE owner_id = {session['uid']} AND title LIKE '%{q}%'").fetchall()`,
  "    return render_template('list.html', notes=rows, q=q)",
  '',
  '',
  "@bp.route('/notes/<int:note_id>')",
  'def show_note(note_id):',
  '    db = get_db()',
  "    note = db.execute('SELECT * FROM notes WHERE id = ?', (note_id,)).fetchone()",
  '    if note is None:',
  '        abort(404)',
  "    return render_template('note.html', note=note)",
  '',
].join('\n');
const SQL_LINE = ROUTES.split('\n').findIndex((l) => l.includes('db.execute(f"')) + 1;

const NOTE_HTML = `{% extends "base.html" %}
{% block content %}
<h1>{{ note.title }}</h1>
<div class="body">{{ note.body|safe }}</div>
<p class="meta">Muallif: {{ note.owner }}</p>
{% endblock %}
`;
const BASE_HTML = `<!doctype html>
<html lang="uz">
<head><title>{% block title %}Qaydnoma{% endblock %}</title></head>
<body>{% block content %}{% endblock %}</body>
</html>
`;
const LIST_HTML = `{% extends "base.html" %}
{% block content %}
{% if q %}<p>Qidiruv: {{ q }}</p>{% endif %}
<ul>{% for n in notes %}<li><a href="/notes/{{ n.id }}">{{ n.title }}</a></li>{% endfor %}</ul>
{% endblock %}
`;

const reviewPractical: ExamPractical = {
  id: 'a-review',
  topic: 'injection',
  title: "Qaydnoma kodini ko'rib chiqish",
  intro:
    "Relizdan oldin `~/qaydnoma` dagi Flask ilovasini tekshiring: `app/` — kod va shablonlar, `run.py` — ishga tushirish fayli. Javob so'ralgan joyda buyruq **faqat javobni** chiqarsin (masalan, `grep` natijasining o'zi).",
  shell: () => ({
    fs: {
      home: {
        talaba: {
          qaydnoma: {
            'run.py': "from app import create_app\n\napp = create_app()\n\nif __name__ == '__main__':\n    app.run(host='0.0.0.0', port=5000, debug=True)\n",
            app: {
              '__init__.py': "from flask import Flask\n\n\ndef create_app():\n    app = Flask(__name__)\n    app.config.from_object('app.config')\n    from . import notes\n    app.register_blueprint(notes.bp)\n    return app\n",
              'config.py': "SECRET_KEY = 'qaydnoma-dev-key-2026'\nDATABASE = 'instance/qaydnoma.db'\nSESSION_COOKIE_HTTPONLY = True\n",
              'notes.py': ROUTES,
              'db.py': "import sqlite3\nfrom flask import current_app, g\n\n\ndef get_db():\n    if 'db' not in g:\n        g.db = sqlite3.connect(current_app.config['DATABASE'])\n        g.db.row_factory = sqlite3.Row\n    return g.db\n",
              templates: { 'base.html': BASE_HTML, 'note.html': NOTE_HTML, 'list.html': LIST_HTML },
            },
          },
        },
      },
      tmp: {},
    },
    cwd: `${HOME}/qaydnoma`,
  }),
  tasks: [
    {
      id: 'sqli',
      text: "SQL so'rov foydalanuvchi matnini to'g'ridan-to'g'ri qo'shib quriladigan qatorni toping: natijada fayl nomi va qator raqami bilan faqat shu qator bo'lsin.",
      solution: ['grep -rn \'execute(f"\' app'],
      check: ({ output }) => single(output) && output.includes(`notes.py:${SQL_LINE}:`),
    },
    {
      id: 'safe',
      text: "Qaysi shablon foydalanuvchi matnini avtomatik escape'siz chiqaradi? Faqat fayl yo'lini chiqaring.",
      solution: ["grep -rl '|safe' app/templates"],
      check: ({ output }) => single(output) && output.trim().endsWith('templates/note.html'),
    },
    {
      id: 'secret',
      text: "Sessiyalarni imzolovchi maxfiy kalit kodga yozib qo'yilgan. Qaysi faylda? Faqat fayl yo'lini chiqaring.",
      solution: ["grep -rl 'SECRET_KEY =' ."],
      check: ({ output }) => single(output) && output.trim().endsWith('app/config.py'),
    },
    {
      id: 'debug',
      text: '`run.py` da debug rejimini o\'chiring (`debug=False`).',
      solution: ["sed -i 's/debug=True/debug=False/' run.py"],
      check: ({ state }) => {
        const run = fileAt(state, `${HOME}/qaydnoma/run.py`) ?? '';
        return run.includes('debug=False') && !run.includes('debug=True');
      },
    },
  ],
};

/* ── practical 2: supply chain and secrets in a repository ───────────── */

const fake = (...parts: string[]) => parts.join('');
const D = (month: number, day: number, h = 10) => Date.UTC(2026, month - 1, day, h - 5, 0, 0);
const ALI = 'Ali Valiyev <ali@qaydnoma.lab>';
const JASUR = 'Jasur Toshmatov <jasur@qaydnoma.lab>';
const NODIRA = 'Nodira Karimova <nodira@qaydnoma.lab>';
const lock = (lodash: string, minimist: string) =>
  JSON.stringify(
    {
      name: 'qaydnoma-api',
      version: '2.4.0',
      lockfileVersion: 3,
      packages: {
        '': { name: 'qaydnoma-api', version: '2.4.0', dependencies: { express: '^4.21.1', lodash: '^4.17.15' }, devDependencies: { mocha: '^10.2.0' } },
        'node_modules/express': { version: '4.21.1' },
        'node_modules/lodash': { version: lodash },
        'node_modules/mocha': { version: '10.2.0', dev: true, dependencies: { mkdirp: '0.5.5' } },
        'node_modules/mkdirp': { version: '0.5.5', dev: true, dependencies: { minimist: '1.2.5' } },
        'node_modules/minimist': { version: minimist, dev: true },
      },
    },
    null,
    2,
  ) + '\n';

const API_REPO: GitRepoSpec = {
  path: `${HOME}/qaydnoma-api`,
  remotes: { origin: 'git@git.qaydnoma.lab:qaydnoma/api.git' },
  user: { name: 'Talaba', email: 'talaba@qaydnoma.lab' },
  commits: [
    { author: ALI, date: D(10, 1), message: 'Initial commit', changes: { 'README.md': '# Qaydnoma API\n', 'package.json': '{\n  "name": "qaydnoma-api",\n  "version": "2.4.0"\n}\n', 'package-lock.json': lock('4.17.15', '1.2.5'), '.gitignore': 'node_modules/\n' } },
    { author: NODIRA, date: D(10, 9), message: 'Add auth helpers', changes: { 'src/auth/password.js': "const crypto = require('crypto');\n\nexports.hash = (pw) => crypto.createHash('md5').update(pw).digest('hex');\n", 'src/auth/session.js': "exports.cookie = { httpOnly: true, sameSite: 'lax' };\n" } },
    { author: JASUR, date: D(10, 20, 18), message: 'Configure S3 export', changes: { '.env': `AWS_ACCESS_KEY_ID=${fake('AKIA', 'QAYDEXAMPLE7KEY0')}\nAWS_REGION=eu-central-1\n`, 'src/export.js': "module.exports = () => require('./s3').upload();\n" } },
    { author: ALI, date: D(10, 21, 9), message: 'Remove .env from repo', changes: { '.env': null, '.gitignore': 'node_modules/\n.env\n' } },
    { author: NODIRA, date: D(11, 5), message: 'Release 2.4.0', changes: { 'README.md': '# Qaydnoma API\n\nv2.4.0\n' } },
  ],
};

const supplyPractical: ExamPractical = {
  id: 'a-supply',
  topic: 'ssdlc',
  title: "Repozitoriy va bog'liqliklar",
  intro:
    "`~/qaydnoma-api` — Node.js API repozitoriysi. Tekshiruv: tarixdagi sirlar, kodda qolgan zaif kriptografiya va bog'liqliklardagi ma'lum zaifliklar (`npm audit`). Javob so'ralgan joyda buyruq **faqat javobni** chiqarsin.",
  shell: () => ({
    fs: { home: { talaba: {} }, tmp: {} },
    cwd: `${HOME}/qaydnoma-api`,
    git: [API_REPO],
    npm: {
      advisories: [
        { name: 'lodash', range: '<=4.17.18', fixed: '4.17.19', title: 'Prototype Pollution in lodash', url: 'https://github.com/advisories/GHSA-p6mc-m468-83gw', severity: 'high' },
        { name: 'lodash', range: '<=4.17.20', fixed: '4.17.21', title: 'Command Injection in lodash', url: 'https://github.com/advisories/GHSA-35jh-r3h4-6jhm', severity: 'high' },
        { name: 'minimist', range: '1.0.0 - 1.2.5', from: '1.0.0', fixed: '1.2.6', title: 'Prototype Pollution in minimist', url: 'https://github.com/advisories/GHSA-xvch-5gv4-984h', severity: 'critical' },
      ],
    },
  }),
  tasks: [
    {
      id: 'author',
      text: "Tarixda `.env` fayli bo'lgan, keyin o'chirilgan. Uni repozitoriyga **qo'shgan** muallifning ismini chiqaring (faqat ism-familiya).",
      solution: [`cd ${HOME}/qaydnoma-api && git log --diff-filter=A --format=%an -- .env`],
      check: ({ output }) => output.trim() === 'Jasur Toshmatov',
    },
    {
      id: 'md5',
      text: "Hozirgi kodda parol MD5 bilan xeshlanadi. Qaysi faylda? Faqat fayl yo'lini chiqaring.",
      solution: [`cd ${HOME}/qaydnoma-api && grep -rl md5 src`],
      check: ({ output }) => single(output) && output.trim().endsWith('src/auth/password.js'),
    },
    {
      id: 'fix',
      text: "Bog'liqliklardagi ma'lum zaifliklarni mos versiyalarga yangilab tuzating.",
      solution: [`cd ${HOME}/qaydnoma-api && npm audit fix`],
      check: ({ state }) => {
        const l = fileAt(state, `${HOME}/qaydnoma-api/package-lock.json`) ?? '';
        return l.includes('"version": "4.17.21"') && l.includes('"version": "1.2.6"');
      },
    },
  ],
};

/* ── practical 3: access control in the database ─────────────────────── */

const DB = `${HOME}/qaydnoma.db`;
function accessDb(): string {
  const users = [
    [1, 'aziz', 'admin'],
    [2, 'dilnoza', 'user'],
    [3, 'nodira', 'user'],
    [4, 'jasur', 'user'],
    [5, 'kamola', 'user'],
    [6, 'tester1', 'user'],
  ];
  const notes = Array.from({ length: 24 }, (_, i) => [1000 + i, 2 + (i % 4), `Qayd ${1000 + i}`, i % 3 === 0 ? 0 : 1]);
  const shares = [
    [1003, 4],
    [1006, 3],
    [1009, 5],
    [1012, 2],
  ];
  const log: (string | number)[][] = [];
  let id = 1;
  const add = (min: number, uid: number, note: number, status: number) => log.push([id++, `2026-11-19 0${8 + Math.floor(min / 60)}:${String(min % 60).padStart(2, '0')}:00`, uid, note, 'GET', status]);
  // Owners reading their own notes.
  notes.forEach((n, i) => add(i * 2, Number(n[1]), Number(n[0]), 200));
  // Shared notes read by the people they were shared with.
  shares.forEach((s, i) => add(60 + i, Number(s[1]), Number(s[0]), 200));
  // jasur walks through ids he does not own: the API answers 200 for the private ones too.
  for (let n = 1001; n <= 1014; n++) add(90 + n - 1001, 4, n, 200);
  // nodira tries two foreign notes.
  add(130, 3, 1001, 200);
  add(131, 3, 1002, 200);
  // A missing note.
  add(140, 5, 1999, 404);
  return [
    'CREATE TABLE users (id INTEGER PRIMARY KEY, ism TEXT, rol TEXT);',
    'CREATE TABLE notes (id INTEGER PRIMARY KEY, owner_id INTEGER, title TEXT, private INTEGER);',
    'CREATE TABLE shares (note_id INTEGER, user_id INTEGER);',
    'CREATE TABLE api_log (id INTEGER PRIMARY KEY, vaqt TEXT, user_id INTEGER, note_id INTEGER, method TEXT, status INTEGER);',
    inserts('users', ['id', 'ism', 'rol'], users),
    inserts('notes', ['id', 'owner_id', 'title', 'private'], notes),
    inserts('shares', ['note_id', 'user_id'], shares),
    inserts('api_log', ['id', 'vaqt', 'user_id', 'note_id', 'method', 'status'], log),
  ].join('\n');
}
const ACCESS_SQL = accessDb();
const FOREIGN =
  "FROM api_log l JOIN notes n ON n.id = l.note_id WHERE l.status = 200 AND n.private = 1 AND l.user_id <> n.owner_id AND NOT EXISTS (SELECT 1 FROM shares s WHERE s.note_id = n.id AND s.user_id = l.user_id)";

const accessPractical: ExamPractical = {
  id: 'a-access',
  topic: 'access',
  title: "Kirish nazorati: API logi bo'yicha tekshiruv",
  runtimes: ['sql'],
  intro:
    "`~/qaydnoma.db`: `users` (id, ism, rol), `notes` (id, owner_id, title, private: 1 — shaxsiy), `shares` (note_id, user_id — kimga ulashilgan) va `api_log` (user_id qaysi note_id ni ochgan, status). Shaxsiy qaydni faqat egasi va u ulashgan foydalanuvchi ko'rishi kerak. `sqlite3 qaydnoma.db \"SO'ROV;\"` bilan ishlang.",
  shell: () => ({ fs: { home: { talaba: {} }, tmp: {} }, sqlite: { [DB]: ACCESS_SQL } }),
  tasks: [
    {
      id: 'count',
      text: "Egasi bo'lmagan va ulashilmagan foydalanuvchi shaxsiy qaydni muvaffaqiyatli (200) ochgan so'rovlar nechta? Bitta son chiqaring.",
      solution: [`sqlite3 qaydnoma.db "SELECT COUNT(*) ${FOREIGN};"`],
      check: (c) => {
        const r = lastResult(c);
        return !!r && r.rows.length === 1 && r.rows[0]!.length === 1 && hasRows(r, expectRows(c.state, DB, `SELECT COUNT(*) ${FOREIGN}`));
      },
    },
    {
      id: 'who',
      text: "Bunday so'rovlarni eng ko'p qilgan foydalanuvchining ismi va so'rovlar soni — bitta qator.",
      solution: [`sqlite3 qaydnoma.db "SELECT u.ism, COUNT(*) ${FOREIGN.replace('FROM api_log l', 'FROM api_log l JOIN users u ON u.id = l.user_id')} GROUP BY u.ism ORDER BY 2 DESC LIMIT 1;"`],
      check: (c) => {
        const r = lastResult(c);
        const want = expectRows(c.state, DB, `SELECT u.ism, COUNT(*) ${FOREIGN.replace('FROM api_log l', 'FROM api_log l JOIN users u ON u.id = l.user_id')} GROUP BY u.ism ORDER BY 2 DESC LIMIT 1`);
        return !!r && r.rows.length === 1 && hasRows(r, want);
      },
    },
    {
      id: 'block',
      text: "Tekshiruv tugaguncha shu foydalanuvchini bloklang: uning `rol` qiymatini `bloklangan` qiling (faqat uning!).",
      solution: [`sqlite3 qaydnoma.db "UPDATE users SET rol = 'bloklangan' WHERE ism = 'jasur';"`],
      check: (c) => {
        const r = queryDb(c.state, DB, "SELECT ism FROM users WHERE rol = 'bloklangan'");
        return r.rows.length === 1 && r.rows[0]![0] === 'jasur';
      },
    },
  ],
};

export const APPSEC_EXAM: Exam = {
  id: 'appsec',
  title: 'AppSec imtihoni',
  summary: "Web mexanizmlari, injection va kirish nazorati zaifliklari, xavfsiz ishlab chiqish jarayoni va DevSecOps — vaziyatli savollar va kod, repozitoriy yoki baza bo'yicha ikki amaliy tekshiruv.",
  topics: [
    { id: 'web', title: 'Web va autentifikatsiya', stages: ['a1-web-chuqur'] },
    { id: 'injection', title: 'Injection, XSS, CSRF, SSRF', stages: ['a2-zaifliklar'] },
    { id: 'access', title: "Kirish nazorati va mantiq", stages: ['a2-zaifliklar'] },
    { id: 'ssdlc', title: 'Xavfsiz ishlab chiqish (SSDLC)', stages: ['a3-ssdlc'] },
    { id: 'devsecops', title: 'DevSecOps va zaiflik boshqaruvi', stages: ['a4-devsecops'] },
  ],
  questions: parseBank('appsec', APPSEC_BANK),
  practicals: [reviewPractical, supplyPractical, accessPractical],
};
