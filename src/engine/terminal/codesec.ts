/*
 * Code security tools: gitleaks (secrets in git history and files, with gitleaks' own rule IDs), npm audit
 * (known-vulnerable dependencies from package-lock.json against the lab's advisory list) and semgrep (the lab's
 * own rules file, pattern-regex rules).
 */
import { basename, getNode, resolvePath, walk, type FsDir } from './fs';
import { fail, ok, type CmdCtx, type CmdResult, type Command } from './shell';
import { findRepo, historyForScan } from './git';
import { parseYamlDocs, YamlError, type YamlValue } from './yaml';

/* ── gitleaks ── */

interface Rule {
  id: string;
  description: string;
  re: RegExp;
  /** Capture group holding the secret (0 = whole match). */
  group?: number;
  entropy?: number;
}

const RULES: Rule[] = [
  { id: 'aws-access-token', description: 'Identified a pattern that may indicate AWS credentials, risking unauthorized cloud resource access and data breaches on AWS platforms.', re: /\b((?:A3T[A-Z0-9]|AKIA|ASIA|ABIA|ACCA)[A-Z2-7]{16})\b/, group: 1 },
  { id: 'github-pat', description: 'Uncovered a GitHub Personal Access Token, potentially leading to unauthorized repository access and sensitive content exposure.', re: /ghp_[0-9a-zA-Z]{36}/ },
  { id: 'stripe-access-token', description: 'Found a Stripe Access Token, posing a risk to payment processing services and sensitive financial data.', re: /\b((?:sk|rk)_(?:test|live|prod)_[a-zA-Z0-9]{10,99})\b/, group: 1 },
  { id: 'private-key', description: 'Identified a Private Key, which may compromise cryptographic security and sensitive data encryption.', re: /-----BEGIN[ A-Z0-9_-]{0,100}PRIVATE KEY(?: BLOCK)?-----/ },
  { id: 'slack-webhook-url', description: 'Discovered a Slack Webhook, which could lead to unauthorized message posting and data leakage in Slack channels.', re: /(?:https?:\/\/)?hooks\.slack\.com\/(?:services|workflows|triggers)\/[A-Za-z0-9+/]{43,56}/ },
  { id: 'npm-access-token', description: 'Uncovered an npm access token, potentially compromising package management and code repository access.', re: /\b(npm_[a-zA-Z0-9]{36})\b/, group: 1 },
  { id: 'jwt', description: 'Uncovered a JSON Web Token, which may lead to unauthorized access to web applications and sensitive user data.', re: /\b(ey[a-zA-Z0-9]{17,}\.ey[a-zA-Z0-9/_-]{17,}\.(?:[a-zA-Z0-9/_-]{10,}={0,2})?)/, group: 1 },
  { id: 'generic-api-key', description: 'Detected a Generic API Key, potentially exposing access to various services and sensitive operations.', re: /(?:key|api|token|secret|passwd|password|pwd|auth|access)[\w.-]{0,20}["']?\s*[:=]+\s*["']?([0-9A-Za-z\-_.=!@#$%^&*+/]{10,150})["']?/i, group: 1, entropy: 3.5 },
];

export function shannon(s: string): number {
  const counts = new Map<string, number>();
  for (const ch of s) counts.set(ch, (counts.get(ch) ?? 0) + 1);
  let h = 0;
  for (const n of counts.values()) {
    const p = n / s.length;
    h -= p * Math.log2(p);
  }
  return h;
}

interface Finding {
  rule: Rule;
  match: string;
  secret: string;
  entropy: number;
  file: string;
  line: number;
  commit?: { id: string; author: string; date: number; message: string };
}

function scanLine(text: string): { rule: Rule; match: string; secret: string; entropy: number }[] {
  const line = text.trim().slice(0, 200);
  const out: { rule: Rule; match: string; secret: string; entropy: number }[] = [];
  for (const rule of RULES) {
    const m = rule.re.exec(text);
    if (!m) continue;
    const secret = m[rule.group ?? 0] ?? m[0];
    const entropy = shannon(secret);
    if (rule.entropy && entropy < rule.entropy) continue;
    // A specific rule beats the generic one on the same secret.
    if (rule.id === 'generic-api-key' && out.some((f) => f.secret.includes(secret) || secret.includes(f.secret))) continue;
    // Finding shows the line around the match, as gitleaks does.
    out.push({ rule, match: line.includes(secret) ? line : m[0], secret, entropy });
  }
  return out;
}

const BANNER = '\n    ○\n    │╲\n    │ ○\n    ○ ░\n    ░    gitleaks\n';

export const gitleaks: Command = (args, ctx) => {
  const [sub, ...rest] = args;
  if (!sub || sub === '--help' || sub === 'help') return ok('Usage:\n  gitleaks [command]\n\nSimulyatordagi buyruqlar:\n  git      git tarixini tekshirish (gitleaks git -v)\n  dir      papka/fayllarni tekshirish (gitleaks dir -v PATH)\n  detect   eski usul: gitleaks detect [--no-git] [-v] [--redact] [--source DIR] [--report-path F]');
  if (sub === 'version') return ok('8.21.2');
  const flags = new Set(rest.filter((a) => a.startsWith('-')));
  const value = (name: string) => {
    const i = rest.indexOf(name);
    if (i >= 0) return rest[i + 1];
    const eq = rest.find((a) => a.startsWith(name + '='));
    return eq?.slice(name.length + 1);
  };
  const positional = rest.filter((a, i) => !a.startsWith('-') && !['--source', '-s', '--report-path', '-r'].includes(rest[i - 1] ?? ''));
  const source = resolvePath(ctx.state.cwd, value('--source') ?? value('-s') ?? positional[0] ?? '.', ctx.state.home);
  const noGit = sub === 'dir' || flags.has('--no-git');
  if (!['detect', 'git', 'dir', 'protect'].includes(sub)) return fail(`Error: unknown command "${sub}" for "gitleaks"`);
  const verbose = flags.has('-v') || flags.has('--verbose');
  const redact = flags.has('--redact');
  const findings: Finding[] = [];
  let scannedLabel: string;
  let bytes = 0;
  if (noGit) {
    const node = getNode(ctx.state.root, source);
    if (!node) return fail(`ERR stat ${source}: no such file or directory`);
    const files = node.type === 'file' ? [{ path: source, node }] : walk(ctx.state.root, source).filter((w) => w.node.type === 'file' && !w.path.includes('/.git/') && !w.path.includes('/node_modules/'));
    for (const f of files) {
      if (f.node.type !== 'file') continue;
      bytes += f.node.content.length;
      f.node.content.split('\n').forEach((text, i) => {
        for (const hit of scanLine(text)) findings.push({ ...hit, file: f.path.startsWith(ctx.state.cwd + '/') ? f.path.slice(ctx.state.cwd.length + 1) : f.path, line: i + 1 });
      });
    }
    scannedLabel = `scanned ~${bytes} bytes (${(bytes / 1000).toFixed(2)} KB) in 41ms`;
  } else {
    const repo = findRepo(ctx.state, source);
    if (!repo) return fail(`ERR failed to scan Git repository: fatal: not a git repository (or any of the parent directories): .git`);
    const added = historyForScan(repo);
    const commits = new Set(added.map((a) => a.commit.id));
    for (const a of added) {
      bytes += a.text.length;
      for (const hit of scanLine(a.text)) findings.push({ ...hit, file: a.file, line: a.line, commit: a.commit });
    }
    scannedLabel = `${commits.size} commits scanned.\n9:00AM INF scanned ~${bytes} bytes (${(bytes / 1000).toFixed(2)} KB) in 85ms`;
  }
  // .gitleaksignore: fingerprints to skip.
  const ignoreNode = getNode(ctx.state.root, `${noGit ? source : findRepo(ctx.state, source)!.path}/.gitleaksignore`);
  const ignoreList = ignoreNode?.type === 'file' ? ignoreNode.content.split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#')) : [];
  const fingerprint = (f: Finding) => `${f.commit ? f.commit.id + ':' : ''}${f.file}:${f.rule.id}:${f.line}`;
  const kept = findings.filter((f) => !ignoreList.includes(fingerprint(f)));
  const out: string[] = [BANNER];
  if (verbose) {
    for (const f of kept) {
      const shown = redact ? f.match.replace(f.secret, 'REDACTED') : f.match;
      out.push(
        [
          `Finding:     ${shown}`,
          `Secret:      ${redact ? 'REDACTED' : f.secret}`,
          `RuleID:      ${f.rule.id}`,
          `Entropy:     ${f.entropy.toFixed(6)}`,
          `File:        ${f.file}`,
          `Line:        ${f.line}`,
          ...(f.commit
            ? [`Commit:      ${f.commit.id}`, `Author:      ${f.commit.author.replace(/\s*<.*>$/, '')}`, `Email:       ${/<(.*)>/.exec(f.commit.author)?.[1] ?? ''}`, `Date:        ${new Date(f.commit.date).toISOString().replace('.000', '')}`]
            : []),
          `Fingerprint: ${fingerprint(f)}`,
          '',
        ].join('\n'),
      );
    }
  }
  out.push(`9:00AM INF ${scannedLabel}`, kept.length ? `9:00AM WRN leaks found: ${kept.length}` : '9:00AM INF no leaks found');
  const report = value('--report-path') ?? value('-r');
  if (report) {
    const abs = resolvePath(ctx.state.cwd, report, ctx.state.home);
    const parent = getNode(ctx.state.root, abs.slice(0, abs.lastIndexOf('/')) || '/');
    if (parent?.type === 'dir') {
      (parent as FsDir).children[basename(abs)] = {
        type: 'file',
        mode: 0o644,
        owner: ctx.user,
        content:
          JSON.stringify(
            kept.map((f) => ({ Description: f.rule.description, StartLine: f.line, Match: redact ? 'REDACTED' : f.match, Secret: redact ? 'REDACTED' : f.secret, File: f.file, Commit: f.commit?.id ?? '', Entropy: Number(f.entropy.toFixed(6)), Author: f.commit?.author.replace(/\s*<.*>$/, '') ?? '', Email: /<(.*)>/.exec(f.commit?.author ?? '')?.[1] ?? '', Date: f.commit ? new Date(f.commit.date).toISOString().replace('.000', '') : '', Message: f.commit?.message.split('\n')[0] ?? '', RuleID: f.rule.id, Fingerprint: fingerprint(f) })),
            null,
            1,
          ) + '\n',
      };
    }
  }
  return { out: out.join('\n'), code: kept.length ? 1 : 0 };
};

/* ── npm audit ── */

export interface NpmAdvisory {
  name: string;
  /** Human range as npm prints it, e.g. "<=4.17.20". */
  range: string;
  /** Versions below this are affected. */
  fixed: string;
  /** Versions at or above this are affected (default: all below `fixed`). */
  from?: string;
  title: string;
  url: string;
  severity: 'low' | 'moderate' | 'high' | 'critical';
}

export interface NpmSpec {
  advisories: NpmAdvisory[];
}

const SEV = ['low', 'moderate', 'high', 'critical'] as const;

function cmpVer(a: string, b: string): number {
  const pa = a.split(/[.-]/).map((x) => Number(x) || 0);
  const pb = b.split(/[.-]/).map((x) => Number(x) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (d) return d;
  }
  return 0;
}

interface LockPkg {
  version: string;
  dev?: boolean;
  dependencies?: Record<string, string>;
}

function readLock(ctx: CmdCtx): { root: { name: string; version: string; dependencies?: Record<string, string>; devDependencies?: Record<string, string> }; pkgs: Map<string, LockPkg>; raw: Record<string, unknown>; path: string } | string {
  const path = resolvePath(ctx.state.cwd, 'package-lock.json', ctx.state.home);
  const node = getNode(ctx.state.root, path);
  if (!node || node.type !== 'file') return 'npm ERR! code ENOLOCK\nnpm ERR! audit This command requires an existing lockfile.\nnpm ERR! audit Try creating one first with: npm i --package-lock-only';
  try {
    const raw = JSON.parse(node.content) as { packages: Record<string, LockPkg & { name?: string; devDependencies?: Record<string, string> }> };
    const pkgs = new Map<string, LockPkg>();
    for (const [k, v] of Object.entries(raw.packages)) if (k.startsWith('node_modules/')) pkgs.set(k.slice(13), v);
    const r = raw.packages[''] ?? { name: 'app', version: '0.0.0' };
    return { root: { name: r.name ?? 'app', version: r.version, dependencies: r.dependencies, devDependencies: r.devDependencies }, pkgs, raw: raw as unknown as Record<string, unknown>, path };
  } catch {
    return 'npm ERR! code EJSONPARSE\nnpm ERR! JSON.parse Failed to parse package-lock.json';
  }
}

function affected(adv: NpmAdvisory, version: string): boolean {
  return cmpVer(version, adv.fixed) < 0 && (!adv.from || cmpVer(version, adv.from) >= 0);
}

export const npm: Command = (args, ctx) => {
  const [sub, ...rest] = args;
  const spec = ctx.state.npm;
  if (sub === undefined || sub === 'help') return ok('npm <command>\n\nSimulyatorda: npm audit [--omit=dev] [--audit-level=high] | npm audit fix | npm ls PAKET');
  if (sub === '-v' || sub === '--version') return ok('10.9.0');
  if (sub === 'install' || sub === 'i' || sub === 'ci' || sub === 'update') return fail(`npm ERR! bu simulyatorda internet yo'q (npm ${sub} ishlamaydi). Zaifliklarni ko'rish: npm audit`);
  const lock = readLock(ctx);
  if (typeof lock === 'string') return fail(lock);
  if (sub === 'ls' || sub === 'list') {
    const target = rest.find((a) => !a.startsWith('-'));
    const out = [`${lock.root.name}@${lock.root.version} ${ctx.state.cwd}`];
    const deps = Object.keys({ ...(lock.root.dependencies ?? {}), ...(lock.root.devDependencies ?? {}) }).sort();
    const contains = (name: string, seen = new Set<string>()): boolean => {
      if (name === target) return true;
      if (seen.has(name)) return false;
      seen.add(name);
      return Object.keys(lock.pkgs.get(name)?.dependencies ?? {}).some((d) => contains(d, seen));
    };
    const shown = target ? deps.filter((d) => contains(d)) : deps;
    const render = (name: string, prefix: string, last: boolean, depth: number) => {
      const pkg = lock.pkgs.get(name);
      const children = target ? Object.keys(pkg?.dependencies ?? {}).filter((d) => contains(d)) : depth === 0 ? [] : [];
      out.push(`${prefix}${last ? '└─' : '├─'}${children.length ? '┬' : '─'} ${name}@${pkg?.version ?? 'MISSING'}`);
      children.forEach((c, i) => render(c, prefix + (last ? '  ' : '│ '), i === children.length - 1, depth + 1));
    };
    if (!shown.length) out.push('└── (empty)');
    shown.forEach((d, i) => render(d, '', i === shown.length - 1, 0));
    return ok(out.join('\n'));
  }
  if (sub !== 'audit') return fail(`Unknown command: "${sub}"\n\nSimulyatorda: npm audit | npm audit fix | npm ls PAKET`);
  if (!spec) return ok('found 0 vulnerabilities');
  const omitDev = rest.includes('--omit=dev') || rest.includes('--production');
  const level = rest.find((a) => a.startsWith('--audit-level='))?.slice(14) as (typeof SEV)[number] | undefined;
  const hits = new Map<string, NpmAdvisory[]>();
  for (const [name, pkg] of lock.pkgs) {
    if (omitDev && pkg.dev) continue;
    for (const adv of spec.advisories) if (adv.name === name && affected(adv, pkg.version)) hits.set(name, [...(hits.get(name) ?? []), adv]);
  }
  if (rest[0] === 'fix') {
    let changed = 0;
    for (const [name, advs] of hits) {
      const target = advs.map((a) => a.fixed).sort(cmpVer).pop()!;
      const pkgs = (lock.raw.packages as Record<string, LockPkg>)[`node_modules/${name}`]!;
      pkgs.version = target;
      changed++;
    }
    const node = getNode(ctx.state.root, lock.path);
    if (node?.type === 'file') node.content = JSON.stringify(lock.raw, null, 2) + '\n';
    return ok(`\nchanged ${changed} package${changed === 1 ? '' : 's'}, and audited ${lock.pkgs.size + 1} packages in 2s\n\nfound 0 vulnerabilities`);
  }
  if (!hits.size) return ok(`found 0 vulnerabilities`);
  const out = ['# npm audit report', ''];
  const counts: Record<string, number> = {};
  for (const [name, advs] of [...hits].sort(([a], [b]) => a.localeCompare(b))) {
    const sev = advs.map((a) => a.severity).sort((a, b) => SEV.indexOf(b) - SEV.indexOf(a))[0]!;
    counts[sev] = (counts[sev] ?? 0) + 1;
    out.push(`${name}  ${advs[advs.length - 1]!.range}`, `Severity: ${sev}`, ...advs.map((a) => `${a.title} - ${a.url}`), 'fix available via `npm audit fix`', `node_modules/${name}`, '');
  }
  const total = hits.size;
  out.push(`${total} ${total === 1 ? 'vulnerability' : 'vulnerabilities'} (${SEV.filter((s) => counts[s]).map((s) => `${counts[s]} ${s}`).join(', ')})`, '', 'To address all issues, run:', '  npm audit fix');
  const worst = Math.max(...[...hits.values()].flat().map((a) => SEV.indexOf(a.severity)));
  return { out: out.join('\n'), code: !level || worst >= SEV.indexOf(level) ? 1 : 0 };
};

/* ── semgrep ── */

const LANG_EXT: Record<string, string[]> = {
  javascript: ['.js', '.jsx', '.mjs', '.cjs'],
  js: ['.js', '.jsx', '.mjs', '.cjs'],
  typescript: ['.ts', '.tsx'],
  ts: ['.ts', '.tsx'],
  python: ['.py'],
  py: ['.py'],
  go: ['.go'],
  java: ['.java'],
  php: ['.php'],
};

interface SemRule {
  id: string;
  re: RegExp;
  message: string;
  severity: 'ERROR' | 'WARNING' | 'INFO';
  exts: string[] | null;
  exclude: string[];
}

function loadRules(text: string): SemRule[] {
  const [doc] = parseYamlDocs(text) as [{ rules?: Record<string, YamlValue>[] } | undefined];
  const rules = doc?.rules;
  if (!Array.isArray(rules)) throw new YamlError('invalid configuration file: top-level key "rules" missing');
  return rules.map((r) => {
    const pat = r['pattern-regex'];
    if (typeof pat !== 'string') throw new YamlError(`rule ${String(r.id)}: bu simulyatorda faqat "pattern-regex" qoidalari bor`);
    const langs = (r.languages as string[] | undefined) ?? ['generic'];
    const exts = langs.includes('generic') ? null : langs.flatMap((l) => LANG_EXT[l] ?? []);
    const paths = (r.paths ?? {}) as { exclude?: string[] };
    return { id: String(r.id), re: new RegExp(pat), message: String(r.message ?? '').trim(), severity: (String(r.severity ?? 'WARNING').toUpperCase() as SemRule['severity']), exts, exclude: paths.exclude ?? [] };
  });
}

const MARK = { ERROR: '❯❯❱', WARNING: ' ❯❱', INFO: '  ❱' };

export const semgrep: Command = (args, ctx) => {
  const rest = args[0] === 'scan' ? args.slice(1) : args;
  if (!rest.length || rest.includes('--help')) return ok('Usage: semgrep [scan] --config QOIDALAR.yml [--severity ERROR] [YO\'L...]\n(simulyatorda faqat lokal qoidalar fayli, pattern-regex qoidalari)');
  if (rest[0] === '--version') return ok('1.95.0');
  let config: string | undefined;
  const sevs: string[] = [];
  const targets: string[] = [];
  for (let i = 0; i < rest.length; i++) {
    const a = rest[i]!;
    if (a === '--config' || a === '-c' || a === '-f') config = rest[++i];
    else if (a.startsWith('--config=')) config = a.slice(9);
    else if (a === '--severity') sevs.push(rest[++i]!.toUpperCase());
    else if (a === '--quiet' || a === '-q' || a === '--metrics=off') continue;
    else if (a.startsWith('-')) return fail(`semgrep: unrecognized option ${a}`);
    else targets.push(a);
  }
  if (!config) return fail('[ERROR] No config given. Bu simulyatorda: semgrep --config qoidalar.yml PAPKA (semgrep registry\'ga ulanish yo\'q)');
  if (/^(auto|p\/|r\/)/.test(config)) return fail(`[ERROR] Failed to download configuration from ${config}: bu simulyatorda internet yo'q — labdagi qoidalar faylini bering.`);
  const cfgNode = getNode(ctx.state.root, resolvePath(ctx.state.cwd, config, ctx.state.home));
  if (!cfgNode || cfgNode.type !== 'file') return fail(`[ERROR] invalid configuration file found: ${config} does not exist`);
  let rules: SemRule[];
  try {
    rules = loadRules(cfgNode.content);
  } catch (e) {
    if (e instanceof YamlError || e instanceof SyntaxError) return fail(`[ERROR] ${e.message}`);
    throw e;
  }
  if (sevs.length) rules = rules.filter((r) => sevs.includes(r.severity));
  const files: { rel: string; content: string }[] = [];
  for (const t of targets.length ? targets : ['.']) {
    const abs = resolvePath(ctx.state.cwd, t, ctx.state.home);
    for (const w of walk(ctx.state.root, abs)) {
      if (w.node.type !== 'file' || /\/(node_modules|\.git)\//.test(w.path + '/')) continue;
      const rel = w.path.startsWith(ctx.state.cwd + '/') ? w.path.slice(ctx.state.cwd.length + 1) : w.path;
      files.push({ rel, content: w.node.content });
    }
  }
  const findings: { file: string; rule: SemRule; line: number; text: string }[] = [];
  for (const f of files) {
    for (const r of rules) {
      if (r.exts && !r.exts.some((e) => f.rel.endsWith(e))) continue;
      if (r.exclude.some((ex) => f.rel.includes(ex.replace(/\*/g, '')))) continue;
      f.content.split('\n').forEach((line, i) => {
        if (r.re.test(line)) findings.push({ file: f.rel, rule: r, line: i + 1, text: line.trim() });
      });
    }
  }
  findings.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line);
  const scanned = files.filter((f) => rules.some((r) => !r.exts || r.exts.some((e) => f.rel.endsWith(e)))).length;
  const title = `${findings.length} Code Finding${findings.length === 1 ? '' : 's'}`;
  const out = [`┌${'─'.repeat(title.length + 2)}┐`, `│ ${title} │`, `└${'─'.repeat(title.length + 2)}┘`, ''];
  let lastFile = '';
  for (const f of findings) {
    if (f.file !== lastFile) {
      out.push(`    ${f.file}`);
      lastFile = f.file;
    }
    out.push(`   ${MARK[f.rule.severity]} ${f.rule.id}`, ...f.rule.message.split('\n').map((l) => `          ${l}`), '', `          ${String(f.line).padStart(3)}┆ ${f.text}`, '');
  }
  out.push(`Ran ${rules.length} rule${rules.length === 1 ? '' : 's'} on ${scanned} file${scanned === 1 ? '' : 's'}: ${findings.length} finding${findings.length === 1 ? '' : 's'}.`);
  return { out: out.join('\n'), code: 0 } as CmdResult;
};
