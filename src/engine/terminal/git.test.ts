import { describe, expect, it } from 'vitest';
import { writeFileSync } from 'fs';
import { createShell, execLine, type ShellState } from './shell';

const D = (day: number, h = 10) => Date.UTC(2026, 10, day, h, 0, 0);
const ALI = 'Ali Valiyev <ali@qaydnoma.lab>';
const SEVARA = 'Sevara Karimova <sevara@qaydnoma.lab>';
const KEY = 'AKIALABEXAMPLE7QWERT';

function shell(): ShellState {
  return createShell({
    fs: {
      home: {
        talaba: {
          'demo.js': 'const q = "SELECT * FROM notes WHERE id = " + req.params.id;\nconst r = eval(userInput);\n',
          'qoidalar.yml': 'rules:\n  - id: sql-concat\n    pattern-regex: \'SELECT .* \\+ req\\.\'\n    message: SQL so\'rov satr birlashtirish bilan qurilmoqda\n    severity: ERROR\n    languages: [javascript]\n  - id: eval-use\n    pattern-regex: \'\\beval\\(\'\n    message: eval xavfli\n    severity: WARNING\n    languages: [javascript]\n',
        },
      },
      tmp: {},
    },
    git: [
      {
        path: '/home/talaba/app',
        remotes: { origin: 'git@git.qaydnoma.lab:qaydnoma/app.git' },
        commits: [
          { author: ALI, date: D(1), message: 'Initial commit', changes: { 'README.md': '# App\n', 'src/db.js': 'const pg = require("pg");\n' } },
          { author: SEVARA, date: D(3), message: 'Add config', changes: { 'config/.env': `DB_HOST=db\nAWS_ACCESS_KEY_ID=${KEY}\n`, 'src/db.js': 'const pg = require("pg");\nconst q = "SELECT * FROM notes WHERE id = " + req.params.id;\n' } },
          { author: ALI, date: D(5), message: 'Remove .env, add gitignore', changes: { 'config/.env': null, '.gitignore': 'config/.env\nnode_modules/\n' } },
          { branch: 'feature/export', author: SEVARA, date: D(6), message: 'Export notes', changes: { 'src/export.js': 'module.exports = (p) => eval(p);\n' } },
          { author: ALI, date: D(7), message: 'Fix typo in README', changes: { 'README.md': '# Qaydnoma App\n' } },
        ],
        tags: { 'v1.0': 'Add config' },
        worktree: { 'src/db.js': 'const pg = require("pg");\nconst q = "SELECT * FROM notes WHERE id = $1";\n', 'notes.txt': 'todo\n' },
      },
    ],
    npm: {
      advisories: [
        { name: 'lodash', range: '<=4.17.20', fixed: '4.17.21', title: 'Command Injection in lodash', url: 'https://github.com/advisories/GHSA-35jh-r3h4-6jhm', severity: 'high' },
        { name: 'minimist', range: '<1.2.6', fixed: '1.2.6', from: '1.0.0', title: 'Prototype Pollution in minimist', url: 'https://github.com/advisories/GHSA-xvch-5gv4-984h', severity: 'critical' },
      ],
    },
  });
}

const run = (s: ShellState, l: string) => execLine(s, l).output;

function inApp(s: ShellState) {
  run(s, 'cd app');
  return s;
}

describe('git', () => {
  it('status, log and show', () => {
    const s = inApp(shell());
    const st = run(s, 'git status');
    expect(st).toContain('On branch main');
    expect(st).toContain('modified:   src/db.js');
    expect(st).toContain('Untracked files:');
    expect(st).toContain('notes.txt');
    expect(run(s, 'git status -s')).toBe(' M src/db.js\n?? notes.txt');
    const log = run(s, 'git log --oneline');
    expect(log.split('\n')).toHaveLength(4);
    expect(log.split('\n')[0]).toMatch(/^[0-9a-f]{7} \(HEAD -> main, origin\/main\) Fix typo in README$/);
    expect(log).toMatch(/\(tag: v1\.0\) Add config/);
    expect(run(s, 'git log --oneline --all').split('\n')).toHaveLength(5);
    expect(run(s, 'git log --author=sevara --oneline')).toMatch(/Add config$/);
    expect(run(s, `git log -S ${KEY} --oneline`).split('\n').map((l) => l.slice(8).replace(/^\(.*?\) /, ''))).toEqual(['Remove .env, add gitignore', 'Add config']);
    expect(run(s, "git log --format='%h|%an|%ad|%s' --date=short -n 1")).toMatch(/^[0-9a-f]{7}\|Ali Valiyev\|2026-11-07\|Fix typo in README$/);
    expect(run(s, 'git log --diff-filter=D --name-only --oneline')).toMatch(/Remove \.env, add gitignore\nconfig\/\.env/);
    const full = run(s, 'git log -n 1');
    expect(full).toContain('Author: Ali Valiyev <ali@qaydnoma.lab>');
    expect(full).toContain('Date:   Sat Nov 7 15:00:00 2026 +0500');
    expect(run(s, 'git show HEAD~1:config/.env')).toContain('fatal: path');
    expect(run(s, 'git show v1.0:config/.env')).toContain(KEY);
    expect(run(s, 'git show HEAD~1 --stat')).toMatch(/2 files changed, 2 insertions\(\+\), 2 deletions\(-\)/);
  });

  it('diff, blame, grep, branch, checkout', () => {
    const s = inApp(shell());
    const diff = run(s, 'git diff');
    expect(diff).toContain('diff --git a/src/db.js b/src/db.js');
    expect(diff).toContain('-const q = "SELECT * FROM notes WHERE id = " + req.params.id;');
    expect(diff).toContain('+const q = "SELECT * FROM notes WHERE id = $1";');
    expect(run(s, 'git diff main feature/export --name-status')).toBe('M\tREADME.md\nA\tsrc/export.js');
    const blame = run(s, 'git blame src/db.js');
    expect(blame.split('\n')[0]).toMatch(/^[0-9a-f]{8} \(Ali Valiyev +2026-11-01 15:00:00 \+0500 1\) const pg/);
    expect(blame.split('\n')[1]).toMatch(/Sevara Karimova .* 2\) const q = "SELECT/);
    expect(run(s, 'git grep -n SELECT HEAD')).toBe('HEAD:src/db.js:2:const q = "SELECT * FROM notes WHERE id = " + req.params.id;');
    expect(run(s, 'git branch -a')).toBe('  feature/export\n* main\n  remotes/origin/main');
    expect(run(s, 'git switch feature/export')).toBe("Switched to branch 'feature/export'");
    expect(run(s, 'cat src/db.js')).toContain('$1');
    expect(run(s, 'cat src/export.js')).toContain('eval');
    expect(run(s, 'cat README.md')).toBe('# App');
  });

  it('commits, ignores and rewrites history', () => {
    const s = inApp(shell());
    run(s, 'mkdir config');
    run(s, 'echo "SECRET=1" > config/.env');
    expect(run(s, 'git check-ignore -v config/.env')).toBe('.gitignore:1:config/.env\tconfig/.env');
    expect(run(s, 'git status -s')).not.toContain('.env');
    expect(run(s, 'git add config/.env')).toContain('ignored by one of your .gitignore files');
    run(s, 'git add src/db.js');
    expect(run(s, 'git commit -m "Use parameterized query"')).toMatch(/^\[main [0-9a-f]{7}\] Use parameterized query\n 1 file changed, 1 insertion\(\+\), 1 deletion\(-\)$/);
    expect(run(s, 'git log --oneline -n 1')).toContain('Use parameterized query');
    expect(run(s, 'git reflog').split('\n')[0]).toMatch(/HEAD@\{0\}: commit: Use parameterized query/);
    expect(run(s, 'git filter-repo --path config/.env --invert-paths')).toContain('Refusing');
    expect(run(s, 'git filter-repo --path config/.env --invert-paths --force')).toContain('Parsed 6 commits');
    expect(run(s, `git log -S ${KEY} --all --oneline`)).toBe('');
    expect(run(s, 'git remote -v')).toBe('');
    expect(run(s, 'git tag')).toBe('v1.0');
  });
});

describe('code security tools', () => {
  it('gitleaks finds the key in history but not in files', () => {
    const s = inApp(shell());
    const g = run(s, 'gitleaks git -v');
    expect(g).toContain('RuleID:      aws-access-token');
    expect(g).toContain(`Secret:      ${KEY}`);
    expect(g).toContain('File:        config/.env');
    expect(g).toContain('Author:      Sevara Karimova');
    expect(g).toContain('WRN leaks found: 1');
    expect(run(s, 'gitleaks git -v --redact')).toContain('AWS_ACCESS_KEY_ID=REDACTED');
    expect(run(s, 'gitleaks dir .')).toContain('no leaks found');
    run(s, 'gitleaks git --redact --report-path leaks.json');
    expect(run(s, "jq -r '.[0].RuleID' leaks.json")).toBe('aws-access-token');
  });

  it('npm audit and semgrep', () => {
    const s = shell();
    run(s, `echo '${JSON.stringify({ name: 'app', version: '1.0.0', lockfileVersion: 3, packages: { '': { name: 'app', version: '1.0.0', dependencies: { express: '^4', lodash: '4.17.15' } }, 'node_modules/express': { version: '4.21.1', dependencies: { qs: '6.13.0' } }, 'node_modules/qs': { version: '6.13.0', dependencies: { minimist: '1.2.5' } }, 'node_modules/minimist': { version: '1.2.5' }, 'node_modules/lodash': { version: '4.17.15' } } })}' > package-lock.json`);
    const a = run(s, 'npm audit');
    expect(a).toContain('# npm audit report');
    expect(a).toContain('minimist  <1.2.6\nSeverity: critical');
    expect(a).toContain('2 vulnerabilities (1 high, 1 critical)');
    expect(run(s, 'npm ls minimist')).toBe('app@1.0.0 /home/talaba\n└─┬ express@4.21.1\n  └─┬ qs@6.13.0\n    └── minimist@1.2.5');
    expect(run(s, 'npm audit fix')).toContain('changed 2 packages');
    expect(run(s, 'npm audit')).toBe('found 0 vulnerabilities');
    const sg = run(s, 'semgrep --config qoidalar.yml demo.js');
    expect(sg).toContain('2 Code Findings');
    expect(sg).toContain('    demo.js');
    expect(sg).toContain('❯❯❱ sql-concat');
    expect(sg).toContain('Ran 2 rules on');
  });

  it('prints a sample for review', () => {
    const s = inApp(shell());
    const out = ['git status', 'git log -n 2', 'git log --oneline --graph --all', 'git show HEAD~1', 'git blame src/db.js', 'gitleaks git -v --redact']
      .map((l) => `$ ${l}\n${run(s, l)}\n`)
      .join('\n');
    if (process.env.OUT) writeFileSync(process.env.OUT, out);
  });
});
