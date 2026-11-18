import { basename, canAccess, getNode, resolvePath, type FsDir } from './fs';
import { nowMs } from './files';
import { fail, ok, type CmdCtx, type Command } from './shell';

/*
 * A small simulated network, the same in every lab unless the lab adds to it: this machine, a router, a web
 * server, a database server and one "internet" site. Hosts, open ports, banners, web pages and DNS records are data;
 * the commands only read them. Every address is from a documentation or private range.
 */

export interface WebPage {
  status?: number;
  headers?: Record<string, string>;
  body: string;
}

export interface NetHost {
  ip: string;
  names: string[];
  /** port → service banner, e.g. 22: 'OpenSSH 9.6p1 Debian' */
  ports?: Record<number, string>;
  /** Web pages by path (served on 80/443 when open). */
  web?: Record<string, string | WebPage>;
  /** false: the host does not answer ping (firewall), though its ports may still be open. */
  ping?: boolean;
  mx?: string[];
  txt?: string[];
  ns?: string[];
}

export interface NetSpec {
  ip?: string;
  iface?: string;
  gateway?: string;
  hosts?: NetHost[];
}

export interface NetState {
  ip: string;
  prefix: number;
  iface: string;
  gateway: string;
  hosts: NetHost[];
}

const SITE_HTML = `<!doctype html>
<html>
<head><title>Laboratoriya serveri</title></head>
<body>
  <h1>srv.lab</h1>
  <p>Bu — o'quv tarmog'idagi veb-server.</p>
  <!-- TODO: /admin sahifasini parol bilan himoyalash -->
</body>
</html>`;

const DEFAULT_HOSTS: NetHost[] = [
  {
    ip: '10.10.10.1',
    names: ['gateway', 'router.lab'],
    ports: { 53: 'dnsmasq 2.89', 80: 'lighttpd 1.4.69' },
    web: { '/': '<html><body><h1>Router</h1><form>Login: <input name="user"></form></body></html>' },
  },
  {
    ip: '10.10.10.20',
    names: ['srv.lab', 'www.lab'],
    ports: { 22: 'OpenSSH 9.6p1 Debian', 80: 'nginx 1.24.0', 443: 'nginx 1.24.0' },
    web: {
      '/': { headers: { 'Content-Type': 'text/html; charset=utf-8', Server: 'nginx/1.24.0' }, body: SITE_HTML },
      '/robots.txt': 'User-agent: *\nDisallow: /admin/\nDisallow: /backup/',
      '/admin/': { status: 401, headers: { 'WWW-Authenticate': 'Basic realm="admin"' }, body: '401 Authorization Required' },
      '/api/status': { headers: { 'Content-Type': 'application/json' }, body: '{"status":"ok","version":"2.3.1","uptime":187200}' },
      '/old': { status: 301, headers: { Location: 'http://srv.lab/' }, body: '' },
    },
  },
  { ip: '10.10.10.30', names: ['db.lab'], ports: { 5432: 'PostgreSQL 16' }, ping: false },
  {
    ip: '203.0.113.80',
    names: ['example.com', 'www.example.com'],
    ports: { 80: 'ECS', 443: 'ECS' },
    web: { '/': '<!doctype html>\n<html><head><title>Example Domain</title></head>\n<body><h1>Example Domain</h1><p>This domain is for use in documentation examples.</p></body></html>' },
    mx: ['10 mail.example.com.'],
    txt: ['"v=spf1 -all"'],
    ns: ['a.iana-servers.net.', 'b.iana-servers.net.'],
  },
  { ip: '203.0.113.81', names: ['mail.example.com'], ports: { 25: 'Postfix smtpd' } },
];

export function createNet(spec: NetSpec | undefined): NetState {
  const [ip, prefix] = (spec?.ip ?? '10.10.10.2/24').split('/');
  const extra = spec?.hosts ?? [];
  const hosts = [...extra, ...DEFAULT_HOSTS.filter((h) => !extra.some((e) => e.ip === h.ip))];
  return { ip: ip!, prefix: Number(prefix ?? 24), iface: spec?.iface ?? 'eth0', gateway: spec?.gateway ?? '10.10.10.1', hosts };
}

function net(ctx: CmdCtx): NetState {
  return ctx.state.net;
}

function resolveHost(ctx: CmdCtx, name: string): NetHost | 'self' | null {
  const n = name.toLowerCase().replace(/\.$/, '');
  if (n === 'localhost' || n === '127.0.0.1' || n === net(ctx).ip || n === ctx.state.host) return 'self';
  return net(ctx).hosts.find((h) => h.ip === n || h.names.includes(n)) ?? null;
}

/* ── ip ────────────────────────────────────────────────────────────────── */

export const ip: Command = (args, ctx) => {
  const n = net(ctx);
  const obj = args.filter((a) => !a.startsWith('-'))[0] ?? '';
  const mac = '08:00:27:4e:66:a1';
  if (obj === 'a' || obj === 'addr' || obj === 'address') {
    return ok(
      [
        '1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 qdisc noqueue state UNKNOWN',
        '    link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00',
        '    inet 127.0.0.1/8 scope host lo',
        `2: ${n.iface}: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc fq_codel state UP`,
        `    link/ether ${mac} brd ff:ff:ff:ff:ff:ff`,
        `    inet ${n.ip}/${n.prefix} brd ${n.ip.split('.').slice(0, 3).join('.')}.255 scope global ${n.iface}`,
      ].join('\n'),
    );
  }
  if (obj === 'r' || obj === 'route') {
    const netAddr = n.ip.split('.').slice(0, 3).join('.') + '.0';
    return ok(`default via ${n.gateway} dev ${n.iface} proto dhcp\n${netAddr}/${n.prefix} dev ${n.iface} proto kernel scope link src ${n.ip}`);
  }
  if (obj === 'l' || obj === 'link') {
    return ok(`1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 state UNKNOWN\n    link/loopback 00:00:00:00:00:00\n2: ${n.iface}: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 state UP\n    link/ether ${mac}`);
  }
  if (obj === 'n' || obj === 'neigh') {
    return ok(net(ctx).hosts.filter((h) => h.ip.startsWith(n.ip.split('.').slice(0, 3).join('.'))).map((h, i) => `${h.ip} dev ${n.iface} lladdr 08:00:27:1${i}:2b:3c REACHABLE`).join('\n'));
  }
  return fail('Ishlatilishi: ip a (manzillar) | ip r (marshrutlar) | ip link | ip neigh');
};

/* ── ping, traceroute ─────────────────────────────────────────────────── */

export const ping: Command = (args, ctx) => {
  let count = 4;
  let target: string | undefined;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '-c') count = Math.min(10, Number(args[++i]) || 4);
    else if (!args[i]!.startsWith('-')) target = args[i];
  }
  if (!target) return fail('ping: usage error: Destination address required');
  const h = resolveHost(ctx, target);
  if (!h) {
    if (/^\d+\.\d+\.\d+\.\d+$/.test(target)) {
      return { out: `PING ${target} (${target}) 56(84) bytes of data.\n\n--- ${target} ping statistics ---\n${count} packets transmitted, 0 received, 100% packet loss, time ${count * 1000 - 1}ms`, code: 1 };
    }
    return fail(`ping: ${target}: Name or service not known`, 2);
  }
  const addr = h === 'self' ? '127.0.0.1' : h.ip;
  if (h !== 'self' && h.ping === false) {
    return { out: `PING ${target} (${addr}) 56(84) bytes of data.\n\n--- ${target} ping statistics ---\n${count} packets transmitted, 0 received, 100% packet loss, time ${count * 1000 - 1}ms\n(Javob yo'q — bu host yo'q degani emas: ICMP firewall'da yopilgan bo'lishi mumkin.)`, code: 1 };
  }
  const external = h !== 'self' && !h.ip.startsWith('10.');
  const times = Array.from({ length: count }, (_, i) => (h === 'self' ? 0.04 : external ? 21.3 + ((i * 7) % 5) * 0.4 : 0.4 + ((i * 3) % 4) * 0.1).toFixed(h === 'self' ? 3 : 1));
  const lines = [`PING ${target} (${addr}) 56(84) bytes of data.`, ...times.map((t, i) => `64 bytes from ${addr}: icmp_seq=${i + 1} ttl=${external ? 54 : 64} time=${t} ms`)];
  const nums = times.map(Number);
  lines.push('', `--- ${target} ping statistics ---`, `${count} packets transmitted, ${count} received, 0% packet loss, time ${count * 1000 - 1}ms`);
  lines.push(`rtt min/avg/max/mdev = ${Math.min(...nums).toFixed(3)}/${(nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(3)}/${Math.max(...nums).toFixed(3)}/0.120 ms`);
  return ok(lines.join('\n'));
};

export const traceroute: Command = (args, ctx) => {
  const target = args.filter((a) => !a.startsWith('-'))[0];
  if (!target) return fail('Ishlatilishi: traceroute HOST');
  const h = resolveHost(ctx, target);
  if (!h || h === 'self') return fail(`${target}: Name or service not known`);
  const hops = [`traceroute to ${target} (${h.ip}), 30 hops max, 60 byte packets`, ` 1  gateway (${net(ctx).gateway})  0.412 ms  0.388 ms  0.401 ms`];
  if (!h.ip.startsWith('10.')) {
    hops.push(' 2  198.51.100.1 (198.51.100.1)  4.120 ms  4.098 ms  4.233 ms', ' 3  * * *', ` 4  ${h.names[0]} (${h.ip})  21.511 ms  21.402 ms  21.630 ms`);
  } else if (h.ip !== net(ctx).gateway) hops.push(` 2  ${h.names[0]} (${h.ip})  0.611 ms  0.598 ms  0.640 ms`);
  return ok(hops.join('\n'));
};

/* ── DNS: dig, nslookup, host ─────────────────────────────────────────── */

function lookup(ctx: CmdCtx, name: string, type: string): string[] {
  const h = resolveHost(ctx, name);
  if (!h) return [];
  if (h === 'self') return type === 'A' ? ['127.0.0.1'] : [];
  if (type === 'A') return [h.ip];
  if (type === 'MX') return h.mx ?? [];
  if (type === 'TXT') return h.txt ?? [];
  if (type === 'NS') return h.ns ?? [];
  return [];
}

function reverse(ctx: CmdCtx, addr: string): string | null {
  const h = net(ctx).hosts.find((x) => x.ip === addr);
  return h ? h.names[0]! : null;
}

export const dig: Command = (args, ctx) => {
  const short = args.includes('+short');
  const words = args.filter((a) => !a.startsWith('+') && !a.startsWith('@') && !a.startsWith('-'));
  const rev = args.indexOf('-x');
  if (rev >= 0) {
    const addr = args[rev + 1] ?? '';
    const name = reverse(ctx, addr);
    const arpa = addr.split('.').reverse().join('.') + '.in-addr.arpa.';
    if (short) return ok(name ? name + '.' : '');
    return ok(`;; ANSWER SECTION:\n${name ? `${arpa}\t300\tIN\tPTR\t${name}.` : ''}\n\n;; SERVER: ${net(ctx).gateway}#53(${net(ctx).gateway}) (UDP)`);
  }
  const name = words[0];
  if (!name) return fail('Ishlatilishi: dig [+short] NOM [A|MX|TXT|NS]   yoki   dig -x IP');
  const type = (words[1] ?? 'A').toUpperCase();
  const answers = lookup(ctx, name, type);
  if (short) return ok(answers.join('\n'));
  const status = resolveHost(ctx, name) ? 'NOERROR' : 'NXDOMAIN';
  return ok(
    [
      `; <<>> DiG 9.18.28 <<>> ${name} ${type}`,
      `;; ->>HEADER<<- opcode: QUERY, status: ${status}, id: 4211`,
      '',
      ';; QUESTION SECTION:',
      `;${name}.\t\t\tIN\t${type}`,
      ...(answers.length ? ['', ';; ANSWER SECTION:', ...answers.map((a) => `${name}.\t\t300\tIN\t${type}\t${a}`)] : []),
      '',
      `;; SERVER: ${net(ctx).gateway}#53(${net(ctx).gateway}) (UDP)`,
    ].join('\n'),
  );
};

export const nslookup: Command = (args, ctx) => {
  const name = args.filter((a) => !a.startsWith('-'))[0];
  if (!name) return fail('Ishlatilishi: nslookup NOM');
  const server = [`Server:\t\t${net(ctx).gateway}`, `Address:\t${net(ctx).gateway}#53`, ''];
  if (/^\d+\.\d+\.\d+\.\d+$/.test(name)) {
    const n = reverse(ctx, name);
    if (!n) return fail(`** server can't find ${name.split('.').reverse().join('.')}.in-addr.arpa: NXDOMAIN`, 1);
    return ok([...server, `${name.split('.').reverse().join('.')}.in-addr.arpa\tname = ${n}.`].join('\n'));
  }
  const a = lookup(ctx, name, 'A');
  if (!a.length) return { out: server.join('\n'), err: `** server can't find ${name}: NXDOMAIN`, code: 1 };
  return ok([...server, 'Non-authoritative answer:', `Name:\t${name}`, `Address: ${a[0]}`].join('\n'));
};

export const host: Command = (args, ctx) => {
  const words = args.filter((a) => !a.startsWith('-'));
  const name = words[0];
  if (!name) return fail('Ishlatilishi: host NOM   yoki   host IP');
  if (/^\d+\.\d+\.\d+\.\d+$/.test(name)) {
    const n = reverse(ctx, name);
    return n ? ok(`${name.split('.').reverse().join('.')}.in-addr.arpa domain name pointer ${n}.`) : fail(`Host ${name.split('.').reverse().join('.')}.in-addr.arpa. not found: 3(NXDOMAIN)`);
  }
  const a = lookup(ctx, name, 'A');
  if (!a.length) return fail(`Host ${name} not found: 3(NXDOMAIN)`, 1);
  const lines = [`${name} has address ${a[0]}`, ...lookup(ctx, name, 'MX').map((m) => `${name} mail is handled by ${m.replace(/\.$/, '')}`)];
  return ok(lines.join('\n'));
};

/* ── nc ────────────────────────────────────────────────────────────────── */

export const nc: Command = (args, ctx) => {
  const flags = args.filter((a) => a.startsWith('-')).join('');
  const words = args.filter((a) => !a.startsWith('-'));
  const [target, portSpec] = words;
  if (flags.includes('l')) return fail("nc: tinglash rejimi (-l) bu simulyatorda yo'q.");
  if (!target || !portSpec) return fail('Ishlatilishi: nc -zv HOST PORT   (port oralig\'i: 20-25)');
  const h = resolveHost(ctx, target);
  if (!h) return fail(`nc: getaddrinfo for host "${target}" port ${portSpec}: Name or service not known`);
  const [from, to] = portSpec.split('-').map(Number) as [number, number | undefined];
  const ports = Array.from({ length: Math.min(1024, (to ?? from) - from + 1) }, (_, i) => from + i);
  const open = h === 'self' ? {} : h.ports ?? {};
  const addr = h === 'self' ? '127.0.0.1' : h.ip;
  if (flags.includes('z')) {
    const lines = ports
      .filter((p) => open[p] || flags.includes('v'))
      .filter((p) => open[p] || ports.length <= 5)
      .map((p) => (open[p] ? `Connection to ${target} (${addr}) ${p} port [tcp/*] succeeded!` : `nc: connect to ${target} (${addr}) port ${p} (tcp) failed: Connection refused`));
    return { out: lines.join('\n'), code: ports.some((p) => open[p]) ? 0 : 1 };
  }
  const banner = open[from];
  if (!banner) return fail(`nc: connect to ${target} (${addr}) port ${from} (tcp) failed: Connection refused`);
  if (from === 22) return ok(`SSH-2.0-${banner.replace(/ /g, '_')}`);
  if (from === 25) return ok(`220 ${h === 'self' ? 'localhost' : h.names[0]} ESMTP ${banner}`);
  return ok(`(${addr}:${from} ga ulandi — ${banner}. Simulyatorda interaktiv sessiya yo'q.)`);
};

/* ── curl, wget ────────────────────────────────────────────────────────── */

const REASONS: Record<number, string> = { 200: 'OK', 301: 'Moved Permanently', 302: 'Found', 401: 'Unauthorized', 403: 'Forbidden', 404: 'Not Found', 500: 'Internal Server Error' };

function fetchPage(ctx: CmdCtx, url: string): { error: string } | { status: number; headers: Record<string, string>; body: string; host: string } {
  const m = /^(?:(https?):\/\/)?([^/:?#]+)(?::(\d+))?(\/[^?#]*)?(\?[^#]*)?/.exec(url);
  if (!m) return { error: `curl: (3) URL rejected: Malformed input to a URL function` };
  const [, scheme = 'http', hostName = '', portStr, path = '/'] = m;
  const h = resolveHost(ctx, hostName);
  if (!h) return { error: `curl: (6) Could not resolve host: ${hostName}` };
  const port = Number(portStr ?? (scheme === 'https' ? 443 : 80));
  if (h === 'self' || !h.ports?.[port]) return { error: `curl: (7) Failed to connect to ${hostName} port ${port} after 0 ms: Couldn't connect to server` };
  const page = h.web?.[path] ?? h.web?.[path.replace(/\/$/, '') || '/'];
  if (page === undefined) return { status: 404, headers: { 'Content-Type': 'text/html', Server: h.ports[port]!.split(' ')[0]! }, body: '<html><body><h1>404 Not Found</h1></body></html>', host: hostName };
  const p: WebPage = typeof page === 'string' ? { body: page } : page;
  return { status: p.status ?? 200, headers: { 'Content-Type': 'text/html', Server: h.ports[port]!.replace(' ', '/'), ...p.headers }, body: p.body, host: hostName };
}

function writeOutput(ctx: CmdCtx, path: string, text: string): string | null {
  const abs = resolvePath(ctx.state.cwd, path, ctx.state.home);
  const parent = getNode(ctx.state.root, abs.slice(0, abs.lastIndexOf('/')) || '/') as FsDir | null;
  if (!parent || parent.type !== 'dir') return `${path}: No such file or directory`;
  if (!canAccess(parent, ctx.user, 'w')) return `${path}: Permission denied`;
  parent.children[basename(abs)] = { type: 'file', content: text, mode: 0o644, owner: ctx.user, mtime: nowMs(ctx) };
  return null;
}

export const curl: Command = (args, ctx) => {
  let include = false;
  let headOnly = false;
  let follow = false;
  let output: string | null = null;
  let url: string | undefined;
  for (let i = 0; i < args.length; i++) {
    const a = args[i]!;
    if (a === '-o') output = args[++i] ?? null;
    else if (a === '-O') output = '';
    else if (a === '-H' || a === '-X' || a === '-d' || a === '-A' || a === '--data' || a === '--header' || a === '-u') i++;
    else if (/^-[a-zA-Z]+$/.test(a)) {
      if (a.includes('i')) include = true;
      if (a.includes('I')) headOnly = true;
      if (a.includes('L')) follow = true;
    } else if (!a.startsWith('-')) url = a;
  }
  if (!url) return fail("curl: try 'curl --help' for more information\n(Ishlatilishi: curl [-i] [-I] [-L] [-o fayl] URL)", 2);
  let res = fetchPage(ctx, url);
  for (let hop = 0; follow && hop < 5 && !('error' in res) && res.status >= 300 && res.status < 400 && res.headers.Location; hop++) {
    res = fetchPage(ctx, res.headers.Location);
  }
  if ('error' in res) return fail(res.error, 6);
  const head = [`HTTP/1.1 ${res.status} ${REASONS[res.status] ?? ''}`.trim(), ...Object.entries(res.headers).map(([k, v]) => `${k}: ${v}`)].join('\n');
  if (headOnly) return ok(head);
  if (output !== null) {
    const name = output || basename(url.replace(/[?#].*$/, '')) || 'index.html';
    const problem = writeOutput(ctx, name, res.body + '\n');
    if (problem) return fail(`curl: (23) Failure writing output to destination: ${problem}`);
    return ok(`  % Total    % Received\n100  ${String(res.body.length).padStart(5)}  100  ${String(res.body.length).padStart(5)}    (${name} ga saqlandi)`);
  }
  return ok(include ? `${head}\n\n${res.body}` : res.body);
};

export const wget: Command = (args, ctx) => {
  let output: string | null = null;
  let quiet = false;
  let url: string | undefined;
  for (let i = 0; i < args.length; i++) {
    const a = args[i]!;
    if (a === '-O') output = args[++i] ?? null;
    else if (a === '-q') quiet = true;
    else if (!a.startsWith('-')) url = a;
  }
  if (!url) return fail('wget: missing URL');
  const res = fetchPage(ctx, url);
  if ('error' in res) return fail(res.error.replace(/^curl: \(\d+\) /, 'wget: '), 4);
  if (res.status >= 400) return fail(`--2026-11-18--  ${url}\nHTTP request sent, awaiting response... ${res.status} ${REASONS[res.status] ?? ''}\nERROR ${res.status}: ${REASONS[res.status] ?? ''}.`, 8);
  if (output === '-') return ok(res.body);
  const name = output ?? (basename(url.replace(/[?#].*$/, '').replace(/\/$/, '')) || 'index.html').replace(/^[^.]*\.(lab|com)$/, 'index.html');
  const problem = writeOutput(ctx, name, res.body + '\n');
  if (problem) return fail(`wget: ${problem}`);
  return ok(quiet ? '' : `--2026-11-18--  ${url}\nResolving ${res.host}... connected.\nHTTP request sent, awaiting response... 200 OK\nLength: ${res.body.length}\nSaving to: '${name}'\n\n'${name}' saved [${res.body.length}/${res.body.length}]`);
};
