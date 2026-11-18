import { canAccess, getNode, resolvePath, type FsDir } from './fs';
import { nowMs } from './files';
import { fail, ok, type CmdCtx, type Command } from './shell';

/*
 * Users, groups, sessions, scheduled jobs, packages and the environment. Accounts live in the lab's own /etc/passwd
 * and /etc/group, so editing them with useradd is visible to cat, grep and awk too. Where a file is missing, a small
 * default set is used. Nothing here asks for a password: the simulator says so instead.
 */

export interface Session {
  user: string;
  tty: string;
  from: string;
  /** "10:02" */
  login: string;
  what?: string;
}

export interface SysInfoSpec {
  sessions?: Session[];
  /** last(1) lines, newest first: user, tty, from, "Wed Nov 18 08:12 - 09:40  (01:28)" */
  lastLogins?: string[];
  uptime?: string;
  load?: string;
  memMb?: { total: number; used: number; swapTotal: number; swapUsed: number };
  /** Installed package names (apt list --installed). */
  packages?: string[];
}

const DEFAULT_PACKAGES = ['bash', 'coreutils', 'curl', 'grep', 'openssh-server', 'procps', 'python3', 'sudo', 'tar', 'vim-tiny'];

const CATALOG: Record<string, string> = {
  bash: 'GNU Bourne Again SHell',
  coreutils: 'GNU core utilities (ls, cp, mv, cat...)',
  curl: 'command line tool for transferring data with URL syntax',
  'fail2ban': 'ban hosts that cause multiple authentication errors',
  git: 'fast, scalable, distributed revision control system',
  grep: 'GNU grep, egrep and fgrep',
  htop: 'interactive processes viewer',
  jq: 'lightweight and flexible command-line JSON processor',
  'net-tools': 'NET-3 networking toolkit (ifconfig, netstat) — eskirgan, o\'rniga ip va ss',
  nginx: 'small, powerful, scalable web/proxy server',
  nmap: 'The Network Mapper',
  'openssh-server': 'secure shell (SSH) server',
  procps: '/proc file system utilities (ps, top, free)',
  python3: 'interactive high-level object-oriented language',
  sudo: 'Provide limited super user privileges to specific users',
  tar: 'GNU version of the tar archiving utility',
  tree: 'displays an indented directory tree',
  ufw: 'program for managing a Netfilter firewall',
  unattended_upgrades: 'automatic installation of security upgrades',
  'vim-tiny': 'Vi IMproved - enhanced vi editor - compact version',
  wireshark: 'network traffic analyzer',
};

interface Account {
  name: string;
  uid: number;
  gid: number;
  home: string;
  shell: string;
}

const DEFAULT_PASSWD = 'root:x:0:0:root:/root:/bin/bash\ntalaba:x:1000:1000:Talaba:/home/talaba:/bin/bash\n';
const DEFAULT_GROUP = 'root:x:0:\nsudo:x:27:talaba\ntalaba:x:1000:\n';

function fileText(ctx: CmdCtx, path: string, fallback: string): string {
  const n = getNode(ctx.state.root, path);
  return n && n.type === 'file' ? n.content : fallback;
}

function accounts(ctx: CmdCtx): Account[] {
  return fileText(ctx, '/etc/passwd', DEFAULT_PASSWD)
    .split('\n')
    .filter(Boolean)
    .map((l) => {
      const [name, , uid, gid, , home, shell] = l.split(':');
      return { name: name!, uid: Number(uid), gid: Number(gid), home: home ?? '', shell: shell ?? '' };
    });
}

function groupsTable(ctx: CmdCtx): { name: string; gid: number; members: string[] }[] {
  return fileText(ctx, '/etc/group', DEFAULT_GROUP)
    .split('\n')
    .filter(Boolean)
    .map((l) => {
      const [name, , gid, members] = l.split(':');
      return { name: name!, gid: Number(gid), members: (members ?? '').split(',').filter(Boolean) };
    });
}

function groupsOf(ctx: CmdCtx, user: string): { name: string; gid: number }[] {
  const acc = accounts(ctx).find((a) => a.name === user);
  const table = groupsTable(ctx);
  const primary = table.find((g) => g.gid === acc?.gid) ?? { name: user, gid: acc?.gid ?? 1000 };
  const extra = table.filter((g) => g.members.includes(user) && g.gid !== primary.gid);
  return [primary, ...extra];
}

function setFile(ctx: CmdCtx, path: string, content: string): void {
  const parent = getNode(ctx.state.root, path.slice(0, path.lastIndexOf('/')) || '/') as FsDir | null;
  if (!parent || parent.type !== 'dir') return;
  const name = path.slice(path.lastIndexOf('/') + 1);
  const existing = parent.children[name];
  if (existing && existing.type === 'file') {
    existing.content = content;
    existing.mtime = nowMs(ctx);
  } else parent.children[name] = { type: 'file', content, mode: 0o644, owner: 'root', mtime: nowMs(ctx) };
}

const needRoot = (cmd: string) =>
  fail(`${cmd}: Permission denied.\n${cmd}: cannot lock /etc/passwd; try again later.\n(Foydalanuvchilarni boshqarish uchun root huquqi kerak: sudo ${cmd} ...)`, 1);

export const id: Command = (args, ctx) => {
  const user = args.filter((a) => !a.startsWith('-'))[0] ?? ctx.user;
  const acc = accounts(ctx).find((a) => a.name === user);
  if (!acc) return fail(`id: '${user}': no such user`);
  const gs = groupsOf(ctx, user);
  if (args.includes('-u')) return ok(String(acc.uid));
  if (args.includes('-G')) return ok(gs.map((g) => g.gid).join(' '));
  if (args.includes('-Gn') || (args.includes('-G') && args.includes('-n'))) return ok(gs.map((g) => g.name).join(' '));
  return ok(`uid=${acc.uid}(${acc.name}) gid=${gs[0]!.gid}(${gs[0]!.name}) groups=${gs.map((g) => `${g.gid}(${g.name})`).join(',')}`);
};

export const groups: Command = (args, ctx) => {
  const user = args[0] ?? ctx.user;
  if (!accounts(ctx).some((a) => a.name === user)) return fail(`groups: '${user}': no such user`);
  const names = groupsOf(ctx, user).map((g) => g.name).join(' ');
  return ok(args[0] ? `${user} : ${names}` : names);
};

export const useradd: Command = (args, ctx) => {
  if (ctx.user !== 'root') return needRoot('useradd');
  let shell = '/bin/sh';
  let groupsArg = '';
  let makeHome = false;
  let name: string | undefined;
  for (let i = 0; i < args.length; i++) {
    const a = args[i]!;
    if (a === '-m') makeHome = true;
    else if (a === '-s') shell = args[++i] ?? shell;
    else if (a === '-G') groupsArg = args[++i] ?? '';
    else if (!a.startsWith('-')) name = a;
  }
  if (!name) return fail('Ishlatilishi: sudo useradd [-m] [-s /bin/bash] [-G guruh1,guruh2] NOM');
  if (!/^[a-z_][a-z0-9_-]*$/.test(name)) return fail(`useradd: invalid user name '${name}'`, 3);
  const accs = accounts(ctx);
  if (accs.some((a) => a.name === name)) return fail(`useradd: user '${name}' already exists`, 9);
  const uid = Math.max(1000, ...accs.filter((a) => a.uid >= 1000 && a.uid < 60000).map((a) => a.uid + 1));
  setFile(ctx, '/etc/passwd', fileText(ctx, '/etc/passwd', DEFAULT_PASSWD) + `${name}:x:${uid}:${uid}::/home/${name}:${shell}\n`);
  let group = fileText(ctx, '/etc/group', DEFAULT_GROUP) + `${name}:x:${uid}:\n`;
  for (const g of groupsArg.split(',').filter(Boolean)) {
    if (!new RegExp(`^${g}:`, 'm').test(group)) return fail(`useradd: group '${g}' does not exist`, 6);
    group = group.replace(new RegExp(`^(${g}:[^:]*:[^:]*:)(.*)$`, 'm'), (_m, head: string, members: string) => head + (members ? `${members},${name}` : name));
  }
  setFile(ctx, '/etc/group', group);
  if (makeHome) {
    const home = getNode(ctx.state.root, '/home');
    if (home && home.type === 'dir' && !home.children[name]) home.children[name] = { type: 'dir', children: {}, mode: 0o750, owner: name, mtime: nowMs(ctx) };
  }
  return ok();
};

export const usermod: Command = (args, ctx) => {
  if (ctx.user !== 'root') return needRoot('usermod');
  const gi = args.findIndex((a) => a === '-aG' || a === '-G');
  const user = args[args.length - 1];
  if (gi < 0 || !user || user === args[gi + 1]) return fail('Ishlatilishi: sudo usermod -aG GURUH FOYDALANUVCHI');
  if (!accounts(ctx).some((a) => a.name === user)) return fail(`usermod: user '${user}' does not exist`, 6);
  let group = fileText(ctx, '/etc/group', DEFAULT_GROUP);
  for (const g of (args[gi + 1] ?? '').split(',')) {
    if (!new RegExp(`^${g}:`, 'm').test(group)) return fail(`usermod: group '${g}' does not exist`, 6);
    group = group.replace(new RegExp(`^(${g}:[^:]*:[^:]*:)(.*)$`, 'm'), (_m, head: string, members: string) =>
      members.split(',').includes(user) ? head + members : head + (members ? `${members},${user}` : user),
    );
  }
  setFile(ctx, '/etc/group', group);
  return ok();
};

export const userdel: Command = (args, ctx) => {
  if (ctx.user !== 'root') return needRoot('userdel');
  const user = args.filter((a) => !a.startsWith('-'))[0];
  if (!user) return fail('Ishlatilishi: sudo userdel [-r] FOYDALANUVCHI');
  const passwd = fileText(ctx, '/etc/passwd', DEFAULT_PASSWD);
  if (!new RegExp(`^${user}:`, 'm').test(passwd)) return fail(`userdel: user '${user}' does not exist`, 6);
  setFile(ctx, '/etc/passwd', passwd.split('\n').filter((l) => !l.startsWith(`${user}:`)).join('\n'));
  const group = fileText(ctx, '/etc/group', DEFAULT_GROUP)
    .split('\n')
    .filter((l) => !l.startsWith(`${user}:`))
    .map((l) => {
      const parts = l.split(':');
      if (parts.length === 4) parts[3] = parts[3]!.split(',').filter((m) => m !== user).join(',');
      return parts.join(':');
    })
    .join('\n');
  setFile(ctx, '/etc/group', group);
  if (args.includes('-r')) {
    const home = getNode(ctx.state.root, '/home');
    if (home && home.type === 'dir') delete home.children[user];
  }
  return ok();
};

export const passwd: Command = (args, ctx) => {
  const user = args.filter((a) => !a.startsWith('-'))[0] ?? ctx.user;
  if (user !== ctx.user && ctx.user !== 'root') return fail(`passwd: You may not view or modify password information for ${user}.`);
  if (args.includes('-S')) return ok(`${user} P 2026-11-10 0 99999 7 -1`);
  if (args.includes('-l')) return ok(`passwd: password changed.\n(${user} akkaunti bloklandi: parol bilan kira olmaydi)`);
  return ok("passwd: password updated successfully\n(Simulyatorda parol so'ralmaydi. Haqiqiy tizimda yangi parolni ikki marta yozasiz — ekranda ko'rinmaydi.)");
};

export const su: Command = () =>
  fail("su: Authentication failure\n(Simulyatorda boshqa foydalanuvchiga o'tilmaydi va parol so'ralmaydi. Root nomidan bajarish uchun har buyruq oldidan sudo yozing.)");

function info(ctx: CmdCtx): Required<Omit<SysInfoSpec, 'packages'>> {
  const s = ctx.state.sysinfo;
  return {
    sessions: s.sessions ?? [{ user: ctx.state.user, tty: 'pts/0', from: '10.10.20.31', login: '10:02', what: '-bash' }],
    lastLogins: s.lastLogins ?? [
      `${ctx.state.user.padEnd(9)}pts/0        10.10.20.31      Wed Nov 18 10:02   still logged in`,
      `${ctx.state.user.padEnd(9)}pts/0        10.10.20.31      Tue Nov 17 08:12 - 17:40  (09:28)`,
      'reboot   system boot  6.8.11-amd64     Mon Nov 16 09:00   still running',
    ],
    uptime: s.uptime ?? '2 days,  1:15',
    load: s.load ?? '0.08, 0.12, 0.10',
    memMb: s.memMb ?? { total: 3936, used: 1210, swapTotal: 2047, swapUsed: 0 },
  };
}

function clock(ctx: CmdCtx): string {
  return new Date(nowMs(ctx)).toISOString().slice(11, 19);
}

export const uptime: Command = (args, ctx) => {
  const i = info(ctx);
  if (args.includes('-p')) return ok(`up ${i.uptime.replace(/,\s+(\d+):(\d+)/, ', $1 hours, $2 minutes')}`);
  return ok(` ${clock(ctx)} up ${i.uptime},  ${i.sessions.length} user${i.sessions.length === 1 ? '' : 's'},  load average: ${i.load}`);
};

export const who: Command = (_a, ctx) =>
  ok(info(ctx).sessions.map((s) => `${s.user.padEnd(9)}${s.tty.padEnd(13)}2026-11-18 ${s.login} (${s.from})`).join('\n'));

export const w: Command = (_a, ctx) => {
  const i = info(ctx);
  return ok(
    [
      ` ${clock(ctx)} up ${i.uptime},  ${i.sessions.length} users,  load average: ${i.load}`,
      'USER     TTY      FROM             LOGIN@   IDLE   WHAT',
      ...i.sessions.map((s) => `${s.user.padEnd(9)}${s.tty.padEnd(9)}${s.from.padEnd(17)}${s.login.padEnd(9)}0.00s  ${s.what ?? '-bash'}`),
    ].join('\n'),
  );
};

export const last: Command = (args, ctx) => {
  const n = Number(args[args.indexOf('-n') + 1]) || Infinity;
  const user = args.filter((a) => !a.startsWith('-') && !/^\d+$/.test(a))[0];
  const rows = info(ctx).lastLogins.filter((l) => !user || l.startsWith(user + ' ') || l.startsWith(user.padEnd(9)));
  return ok([...rows.slice(0, n), '', 'wtmp begins Mon Nov 16 09:00:01 2026'].join('\n'));
};

export const free: Command = (args, ctx) => {
  const m = info(ctx).memMb;
  const h = args.some((a) => a.includes('h'));
  const f = (mb: number) => (h ? (mb >= 1024 ? `${(mb / 1024).toFixed(1)}Gi` : `${mb}Mi`) : String(mb * 1024));
  const cache = Math.round(m.total * 0.35);
  const freeMb = m.total - m.used - cache;
  return ok(
    [
      '               total        used        free      shared  buff/cache   available',
      `Mem:    ${f(m.total).padStart(12)}${f(m.used).padStart(12)}${f(freeMb).padStart(12)}${f(24).padStart(12)}${f(cache).padStart(12)}${f(m.total - m.used).padStart(12)}`,
      `Swap:   ${f(m.swapTotal).padStart(12)}${f(m.swapUsed).padStart(12)}${f(m.swapTotal - m.swapUsed).padStart(12)}`,
    ].join('\n'),
  );
};

/* ── crontab ───────────────────────────────────────────────────────────── */

export const crontab: Command = (args, ctx) => {
  const ui = args.indexOf('-u');
  const user = ui >= 0 ? args[ui + 1]! : ctx.user;
  if (user !== ctx.user && ctx.user !== 'root') return fail(`crontab: must be privileged to use -u`);
  const path = `/var/spool/cron/crontabs/${user}`;
  if (args.includes('-l')) {
    const n = getNode(ctx.state.root, path);
    return n && n.type === 'file' ? ok(n.content.replace(/\n$/, '')) : fail(`no crontab for ${user}`);
  }
  if (args.includes('-e')) {
    return fail("crontab: bu simulyatorda muharrir yo'q. Vazifani faylga yozib o'rnating:\n  echo '0 3 * * * /home/talaba/zaxira.sh' > mycron\n  crontab mycron");
  }
  if (args.includes('-r')) {
    const dir = getNode(ctx.state.root, '/var/spool/cron/crontabs');
    if (dir && dir.type === 'dir') delete dir.children[user];
    return ok();
  }
  const fileArg = args.filter((a) => !a.startsWith('-') && a !== user)[0];
  if (!fileArg) return fail('Ishlatilishi: crontab -l | crontab FAYL | crontab -r');
  const src = getNode(ctx.state.root, resolvePath(ctx.state.cwd, fileArg, ctx.state.home));
  if (!src || src.type !== 'file' || !canAccess(src, ctx.user, 'r')) return fail(`crontab: can't open '${fileArg}'`);
  for (const [i, line] of src.content.split('\n').entries()) {
    const t = line.trim();
    if (!t || t.startsWith('#') || /^[A-Z_]+=/.test(t)) continue;
    if (t.split(/\s+/).length < 6) return fail(`"${fileArg}":${i + 1}: bad minute\nerrors in crontab file, can't install.\n(Format: daqiqa soat kun oy hafta_kuni buyruq)`);
  }
  // Make the spool directories on first use, as cron's package would have.
  let node: FsDir = ctx.state.root;
  for (const part of ['var', 'spool', 'cron', 'crontabs']) {
    const next = node.children[part];
    if (next && next.type === 'dir') node = next;
    else {
      const made: FsDir = { type: 'dir', children: {}, mode: 0o755, owner: 'root' };
      node.children[part] = made;
      node = made;
    }
  }
  node.children[user] = { type: 'file', content: src.content, mode: 0o600, owner: user, mtime: nowMs(ctx) };
  return ok();
};

/* ── apt ───────────────────────────────────────────────────────────────── */

export const apt: Command = (args, ctx) => {
  const installed = ctx.state.packages;
  const [verb, ...rest] = args.filter((a) => a !== '-y');
  const names = rest.filter((a) => !a.startsWith('-'));
  const root = ctx.user === 'root';
  const denied = () =>
    fail('E: Could not open lock file /var/lib/dpkg/lock-frontend - open (13: Permission denied)\nE: Unable to acquire the dpkg frontend lock, are you root?\n(sudo apt ... deb ishlating)', 100);
  switch (verb) {
    case 'update':
      if (!root) return denied();
      return ok('Hit:1 http://deb.debian.org/debian bookworm InRelease\nGet:2 http://security.debian.org bookworm-security InRelease [48.0 kB]\nFetched 48.0 kB in 1s (52.1 kB/s)\nReading package lists... Done\n3 packages can be upgraded. Run \'apt list --upgradable\' to see them.');
    case 'upgrade':
      if (!root) return denied();
      return ok('Reading package lists... Done\nCalculating upgrade... Done\nThe following packages will be upgraded:\n  curl openssh-server sudo\n3 upgraded, 0 newly installed, 0 to remove and 0 not upgraded.');
    case 'list':
      if (rest.includes('--installed')) return ok(['Listing... Done', ...[...installed].sort().map((p) => `${p}/stable,now amd64 [installed]`)].join('\n'));
      if (rest.includes('--upgradable')) return ok('Listing... Done\ncurl/stable-security 7.88.1-10+deb12u8 amd64 [upgradable]\nopenssh-server/stable-security 1:9.2p1-2+deb12u4 amd64 [upgradable]\nsudo/stable-security 1.9.13p3-1+deb12u2 amd64 [upgradable]');
      return ok(['Listing... Done', ...Object.keys(CATALOG).sort().map((p) => `${p}/stable amd64${installed.has(p) ? ' [installed]' : ''}`)].join('\n'));
    case 'search': {
      const q = (names[0] ?? '').toLowerCase();
      const hits = Object.entries(CATALOG).filter(([n, d]) => n.includes(q) || d.toLowerCase().includes(q));
      return ok(hits.map(([n, d]) => `${n}/stable amd64\n  ${d}`).join('\n\n') || '');
    }
    case 'show': {
      const n = names[0] ?? '';
      if (!CATALOG[n]) return fail(`N: Unable to locate package ${n}`, 100);
      return ok(`Package: ${n}\nVersion: 1.0\nPriority: optional\nSection: utils\nStatus: ${installed.has(n) ? 'installed' : 'not installed'}\nDescription: ${CATALOG[n]}`);
    }
    case 'install':
      if (!root) return denied();
      if (!names.length) return fail('Ishlatilishi: sudo apt install PAKET');
      for (const n of names) if (!CATALOG[n]) return fail(`E: Unable to locate package ${n}`, 100);
      for (const n of names) installed.add(n);
      return ok(`Reading package lists... Done\nThe following NEW packages will be installed:\n  ${names.join(' ')}\n${names.length} newly installed, 0 to remove.\n${names.map((n) => `Setting up ${n} ...`).join('\n')}`);
    case 'remove':
    case 'purge':
      if (!root) return denied();
      for (const n of names) {
        if (!installed.has(n)) return ok(`Package '${n}' is not installed, so not removed`);
        installed.delete(n);
      }
      return ok(`The following packages will be REMOVED:\n  ${names.join(' ')}\n0 upgraded, 0 newly installed, ${names.length} to remove.`);
    default:
      return fail('Ishlatilishi: apt update | upgrade | install PAKET | remove PAKET | list --installed | search SO\'Z | show PAKET');
  }
};

export function createPackages(spec: SysInfoSpec | undefined): Set<string> {
  return new Set(spec?.packages ?? DEFAULT_PACKAGES);
}

/* ── environment ───────────────────────────────────────────────────────── */

export const exportCmd: Command = (args, ctx) => {
  if (!args.length) return ok(Object.entries(ctx.state.vars).map(([k, v]) => `declare -x ${k}="${v}"`).join('\n'));
  for (const a of args) {
    const m = /^([A-Za-z_]\w*)=(.*)$/s.exec(a);
    if (m) ctx.state.vars[m[1]!] = m[2]!;
    else if (!/^[A-Za-z_]\w*$/.test(a)) return fail(`bash: export: \`${a}': not a valid identifier`);
  }
  return ok();
};

export const unset: Command = (args, ctx) => {
  for (const a of args) delete ctx.state.vars[a];
  return ok();
};

export const env: Command = (_a, ctx) =>
  ok(
    [
      `USER=${ctx.state.user}`,
      `HOME=${ctx.state.home}`,
      `PWD=${ctx.state.cwd}`,
      'SHELL=/bin/bash',
      'PATH=/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin',
      'LANG=en_US.UTF-8',
      ...Object.entries(ctx.state.vars).map(([k, v]) => `${k}=${v}`),
    ].join('\n'),
  );

export const date: Command = (args, ctx) => {
  const d = new Date(nowMs(ctx));
  const fmt = args.find((a) => a.startsWith('+'));
  const pad = (n: number) => String(n).padStart(2, '0');
  if (fmt) {
    return ok(
      fmt
        .slice(1)
        .replace(/%F/g, `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`)
        .replace(/%T/g, `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`)
        .replace(/%Y/g, String(d.getUTCFullYear()))
        .replace(/%m/g, pad(d.getUTCMonth() + 1))
        .replace(/%d/g, pad(d.getUTCDate()))
        .replace(/%H/g, pad(d.getUTCHours()))
        .replace(/%M/g, pad(d.getUTCMinutes()))
        .replace(/%S/g, pad(d.getUTCSeconds()))
        .replace(/%s/g, String(Math.floor(d.getTime() / 1000))),
    );
  }
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return ok(`${days[d.getUTCDay()]} ${months[d.getUTCMonth()]} ${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())} UTC ${d.getUTCFullYear()}`);
};

export const uname: Command = (args, ctx) => {
  const kernel = '6.8.11-amd64';
  const parts: string[] = [];
  const has = (f: string) => args.some((a) => a.startsWith('-') && !a.startsWith('--') && a.includes(f));
  if (has('a')) return ok(`Linux ${ctx.state.host} ${kernel} #1 SMP PREEMPT_DYNAMIC Debian 6.8.11-1 x86_64 GNU/Linux`);
  if (has('s') || !args.length) parts.push('Linux');
  if (has('n')) parts.push(ctx.state.host);
  if (has('r')) parts.push(kernel);
  if (has('m')) parts.push('x86_64');
  if (has('o')) parts.push('GNU/Linux');
  return ok(parts.join(' '));
};
