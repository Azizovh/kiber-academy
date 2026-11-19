/*
 * Docker for the terminal: images with their build history and known vulnerabilities, containers with their
 * configuration, logs, processes, filesystem and changes. `docker exec` runs commands inside a container's own
 * filesystem. Plus `trivy image` (vulnerabilities and secrets in layers) and `hadolint` (Dockerfile rules).
 */
import { getNode, resolvePath, type FsSpec } from './fs';
import { createShell, execLine, fail, ok, type CmdCtx, type CmdResult, type Command, type ShellState } from './shell';
import { goTemplate, TemplateError } from './templates';

export interface Vuln {
  lib: string;
  id: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  installed: string;
  fixed?: string;
  title: string;
}

export interface ImageSpec {
  repo: string;
  tag: string;
  id: string;
  created: number;
  size: string;
  os?: string;
  user?: string;
  env?: string[];
  cmd?: string[];
  entrypoint?: string[];
  exposed?: string[];
  workdir?: string;
  labels?: Record<string, string>;
  /** Oldest first, as in the Dockerfile. */
  layers: { by: string; size: string }[];
  vulns?: Vuln[];
  secrets?: { file: string; line: number; rule: string; title: string; severity: Vuln['severity']; text: string; layer: string }[];
  /** Filesystem a new container of this image starts with. */
  fs?: FsSpec;
}

export interface ContainerSpec {
  id: string;
  name: string;
  image: string;
  status: 'running' | 'exited' | 'created' | 'paused';
  created: number;
  started?: number;
  finished?: number;
  exitCode?: number;
  command: string;
  user?: string;
  env?: string[];
  ports?: { host?: string; hostPort: number; port: number; proto?: 'tcp' | 'udp' }[];
  privileged?: boolean;
  capAdd?: string[];
  capDrop?: string[];
  mounts?: { type: 'bind' | 'volume'; source: string; destination: string; rw?: boolean }[];
  network?: string;
  ip?: string;
  readOnly?: boolean;
  memory?: number;
  pidsLimit?: number;
  restart?: string;
  securityOpt?: string[];
  labels?: Record<string, string>;
  logs?: string;
  fs?: FsSpec;
  procs?: { pid: number; user: string; cmd: string; cpu?: number; mem?: number }[];
  diff?: string[];
  /** docker stats: CPU %, memory MiB. */
  cpu?: number;
  memUsage?: number;
}

export interface DockerSpec {
  now?: number;
  images: ImageSpec[];
  containers: ContainerSpec[];
  networks?: { name: string; driver: string }[];
  volumes?: string[];
}

export interface DockerState {
  now: number;
  images: ImageSpec[];
  containers: ContainerSpec[];
  networks: { name: string; driver: string }[];
  volumes: string[];
  shells: Map<string, ShellState>;
}

export const DOCKER_NOW = Date.UTC(2026, 10, 18, 9, 0, 0);

export function createDocker(spec: DockerSpec): DockerState {
  const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x)) as T;
  return {
    now: spec.now ?? DOCKER_NOW,
    images: clone(spec.images),
    containers: clone(spec.containers),
    networks: clone(spec.networks ?? [{ name: 'bridge', driver: 'bridge' }, { name: 'host', driver: 'host' }, { name: 'none', driver: 'null' }]),
    volumes: [...(spec.volumes ?? [])],
    shells: new Map(),
  };
}

/* ── helpers ── */

const NO_DAEMON = 'Cannot connect to the Docker daemon at unix:///var/run/docker.sock. Is the docker daemon running?';

function ago(now: number, t: number): string {
  const s = Math.max(0, Math.round((now - t) / 1000));
  if (s < 1) return 'Less than a second ago';
  if (s < 60) return `${s} seconds ago`;
  const m = Math.round(s / 60);
  if (m < 60) return m === 1 ? 'About a minute ago' : `${m} minutes ago`;
  const h = Math.round(s / 3600);
  if (h < 48) return h === 1 ? 'About an hour ago' : `${h} hours ago`;
  const d = Math.round(s / 86400);
  if (d < 14) return `${d} days ago`;
  const w = Math.round(d / 7);
  if (d < 60) return `${w} weeks ago`;
  return `${Math.round(d / 30)} months ago`;
}

const since = (now: number, t: number) => ago(now, t).replace(/ ago$/, '').replace(/^About an? /, 'About an ');

function statusText(d: DockerState, c: ContainerSpec): string {
  if (c.status === 'running') return `Up ${since(d.now, c.started ?? c.created).replace('About an hour', 'About an hour')}`;
  if (c.status === 'paused') return `Up ${since(d.now, c.started ?? c.created)} (Paused)`;
  if (c.status === 'created') return 'Created';
  return `Exited (${c.exitCode ?? 0}) ${ago(d.now, c.finished ?? c.created)}`;
}

const portsText = (c: ContainerSpec, img?: ImageSpec) => {
  const pub = (c.ports ?? []).map((p) => `${p.host ?? '0.0.0.0'}:${p.hostPort}->${p.port}/${p.proto ?? 'tcp'}`);
  const exposed = (img?.exposed ?? []).filter((e) => !(c.ports ?? []).some((p) => `${p.port}/${p.proto ?? 'tcp'}` === e));
  return [...pub, ...(c.status === 'running' ? exposed : [])].join(', ');
};

function table(rows: string[][]): string {
  const widths = rows[0]!.map((_, i) => Math.max(...rows.map((r) => (r[i] ?? '').length)));
  return rows.map((r) => r.map((cell, i) => (i === r.length - 1 ? cell : cell.padEnd(widths[i]! + 3))).join('').trimEnd()).join('\n');
}

const imageName = (i: ImageSpec) => `${i.repo}:${i.tag}`;

function findImage(d: DockerState, ref: string): ImageSpec | undefined {
  const full = ref.includes(':') || ref.includes('@') ? ref : `${ref}:latest`;
  return d.images.find((i) => imageName(i) === full || i.id.startsWith(ref.replace(/^sha256:/, '')));
}

function findContainer(d: DockerState, ref: string): ContainerSpec | undefined {
  return d.containers.find((c) => c.name === ref || c.id.startsWith(ref));
}

const noSuchContainer = (ref: string) => `Error response from daemon: No such container: ${ref}`;

function shortCmd(c: string, trunc: boolean): string {
  const s = `"${c}"`;
  return trunc && s.length > 22 ? `${s.slice(0, 20)}…"` : s;
}

/* ── JSON documents for inspect and --format ── */

export function containerJson(d: DockerState, c: ContainerSpec): Record<string, unknown> {
  const img = findImage(d, c.image);
  const [path, ...args] = c.command.split(' ');
  const portMap: Record<string, { HostIp: string; HostPort: string }[] | null> = {};
  for (const p of c.ports ?? []) portMap[`${p.port}/${p.proto ?? 'tcp'}`] = [{ HostIp: p.host ?? '0.0.0.0', HostPort: String(p.hostPort) }];
  const iso = (t?: number) => (t ? new Date(t).toISOString() : '0001-01-01T00:00:00Z');
  return {
    Id: c.id,
    Created: iso(c.created),
    Path: path,
    Args: args,
    State: { Status: c.status, Running: c.status === 'running', Paused: c.status === 'paused', ExitCode: c.exitCode ?? 0, StartedAt: iso(c.started), FinishedAt: iso(c.finished) },
    Image: `sha256:${img?.id ?? ''}`,
    Name: `/${c.name}`,
    RestartCount: 0,
    HostConfig: {
      Binds: (c.mounts ?? []).filter((m) => m.type === 'bind').map((m) => `${m.source}:${m.destination}${m.rw === false ? ':ro' : ''}`),
      NetworkMode: c.network ?? 'bridge',
      PortBindings: portMap,
      RestartPolicy: { Name: c.restart ?? 'no', MaximumRetryCount: 0 },
      CapAdd: c.capAdd ?? null,
      CapDrop: c.capDrop ?? null,
      Privileged: !!c.privileged,
      ReadonlyRootfs: !!c.readOnly,
      SecurityOpt: c.securityOpt ?? null,
      Memory: c.memory ?? 0,
      PidsLimit: c.pidsLimit ?? null,
    },
    Mounts: (c.mounts ?? []).map((m) => ({ Type: m.type, Source: m.source, Destination: m.destination, Mode: m.rw === false ? 'ro' : '', RW: m.rw !== false })),
    Config: {
      Hostname: c.id.slice(0, 12),
      User: c.user ?? img?.user ?? '',
      ExposedPorts: Object.fromEntries((img?.exposed ?? []).map((e) => [e, {}])),
      Env: [...(img?.env ?? []), ...(c.env ?? [])],
      Cmd: args.length || path ? [path, ...args] : img?.cmd ?? null,
      Image: c.image,
      WorkingDir: img?.workdir ?? '',
      Labels: { ...(img?.labels ?? {}), ...(c.labels ?? {}) },
    },
    NetworkSettings: {
      IPAddress: c.status === 'running' && (c.network ?? 'bridge') === 'bridge' ? c.ip ?? '172.17.0.2' : '',
      Ports: portMap,
    },
  };
}

export function imageJson(i: ImageSpec): Record<string, unknown> {
  return {
    Id: `sha256:${i.id}`,
    RepoTags: [imageName(i)],
    Created: new Date(i.created).toISOString(),
    Size: i.size,
    Os: 'linux',
    Architecture: 'amd64',
    Config: {
      User: i.user ?? '',
      Env: i.env ?? [],
      Cmd: i.cmd ?? null,
      Entrypoint: i.entrypoint ?? null,
      ExposedPorts: Object.fromEntries((i.exposed ?? []).map((e) => [e, {}])),
      WorkingDir: i.workdir ?? '',
      Labels: i.labels ?? null,
    },
    RootFS: { Type: 'layers', Layers: i.layers.map((_, n) => `sha256:${(i.id + n).slice(0, 64).padEnd(64, String(n))}`) },
  };
}

function psRow(d: DockerState, c: ContainerSpec, trunc: boolean): Record<string, unknown> {
  const img = findImage(d, c.image);
  return {
    ID: trunc ? c.id.slice(0, 12) : c.id,
    Image: c.image,
    Command: shortCmd(c.command, trunc),
    CreatedAt: new Date(c.created).toISOString().replace('T', ' ').replace(/\.\d+Z$/, ' +0000 UTC'),
    RunningFor: ago(d.now, c.created),
    Ports: portsText(c, img),
    Status: statusText(d, c),
    State: c.status,
    Names: c.name,
    Labels: Object.entries(c.labels ?? {}).map(([k, v]) => `${k}=${v}`).join(','),
    Mounts: (c.mounts ?? []).map((m) => m.source).join(','),
    Networks: c.network ?? 'bridge',
  };
}

function format(fmt: string, rows: Record<string, unknown>[], headerNames: Record<string, string>): CmdResult {
  try {
    const isTable = fmt.startsWith('table');
    const body = isTable ? fmt.replace(/^table\s*/, '') : fmt;
    const lines = rows.map((r) => goTemplate(body, r));
    if (isTable) {
      const header = body.replace(/\{\{\s*\.(\w+)\s*\}\}/g, (_m, f: string) => headerNames[f] ?? f.toUpperCase()).replace(/\\t/g, '\t');
      const cells = [header, ...lines].map((l) => l.split('\t'));
      return ok(table(cells));
    }
    return ok(lines.join('\n'));
  } catch (e) {
    if (e instanceof TemplateError) return fail(e.message);
    throw e;
  }
}

/* ── container shells for docker exec ── */

function containerShell(d: DockerState, c: ContainerSpec): ShellState {
  let s = d.shells.get(c.id);
  if (!s) {
    const img = findImage(d, c.image);
    const fs = c.fs ?? img?.fs ?? { etc: { hostname: c.id.slice(0, 12) + '\n' }, tmp: {} };
    const user = (c.user ?? img?.user ?? 'root').split(':')[0] || 'root';
    s = createShell({
      fs,
      user: /^\d+$/.test(user) ? (user === '0' ? 'root' : `uid${user}`) : user,
      host: c.id.slice(0, 12),
      cwd: img?.workdir || '/',
      system: { procs: (c.procs ?? [{ pid: 1, user, cmd: c.command }]).map((p) => ({ pid: p.pid, ppid: p.pid === 1 ? 0 : 1, user: p.user, cmd: p.cmd, cpu: p.cpu, mem: p.mem })) },
    });
    for (const e of [...(img?.env ?? []), ...(c.env ?? [])]) {
      const i = e.indexOf('=');
      if (i > 0) s.vars[e.slice(0, i)] = e.slice(i + 1);
    }
    d.shells.set(c.id, s);
  }
  return s;
}

/* ── docker ── */

function parseOpts(args: string[], valueOpts: string[]): { opts: Record<string, string[]>; flags: Set<string>; rest: string[] } {
  const opts: Record<string, string[]> = {};
  const flags = new Set<string>();
  const rest: string[] = [];
  for (let i = 0; i < args.length; i++) {
    const a = args[i]!;
    if (rest.length) {
      rest.push(a);
      continue;
    }
    const eq = /^(--?[\w-]+)=(.*)$/.exec(a);
    if (eq && valueOpts.includes(eq[1]!)) {
      (opts[eq[1]!] ??= []).push(eq[2]!);
    } else if (valueOpts.includes(a)) {
      (opts[a] ??= []).push(args[++i] ?? '');
    } else if (/^-[a-zA-Z]{2,}$/.test(a) && !valueOpts.includes(a)) {
      for (const ch of a.slice(1)) flags.add('-' + ch);
    } else if (a.startsWith('-')) flags.add(a);
    else rest.push(a);
  }
  return { opts, flags, rest };
}

function dockerPs(d: DockerState, args: string[]): CmdResult {
  const { opts, flags } = parseOpts(args, ['--format', '--filter', '-f', '-n']);
  let list = d.containers.filter((c) => flags.has('-a') || flags.has('--all') || c.status === 'running');
  for (const f of [...(opts['--filter'] ?? []), ...(opts['-f'] ?? [])]) {
    const [k, v = ''] = f.split('=');
    if (k === 'status') list = list.filter((c) => c.status === v);
    else if (k === 'name') list = list.filter((c) => c.name.includes(v));
    else if (k === 'ancestor') list = list.filter((c) => c.image === v || c.image.split(':')[0] === v);
    else return fail(`Error response from daemon: invalid filter '${k}' (simulyatorda: status, name, ancestor)`);
  }
  list = [...list].sort((a, b) => b.created - a.created);
  const trunc = !flags.has('--no-trunc');
  if (flags.has('-q') || flags.has('--quiet')) return ok(list.map((c) => c.id.slice(0, 12)).join('\n'));
  const rows = list.map((c) => psRow(d, c, trunc));
  const fmt = opts['--format']?.[0];
  if (fmt) return format(fmt, rows, { ID: 'CONTAINER ID', Image: 'IMAGE', Command: 'COMMAND', RunningFor: 'CREATED', Status: 'STATUS', Ports: 'PORTS', Names: 'NAMES', State: 'STATE', Mounts: 'MOUNTS', Networks: 'NETWORKS', Labels: 'LABELS', CreatedAt: 'CREATED AT' });
  return ok(table([['CONTAINER ID', 'IMAGE', 'COMMAND', 'CREATED', 'STATUS', 'PORTS', 'NAMES'], ...rows.map((r) => [r.ID, r.Image, r.Command, r.RunningFor, r.Status, r.Ports, r.Names].map(String))]));
}

function dockerImages(d: DockerState, args: string[]): CmdResult {
  const { opts, flags } = parseOpts(args, ['--format', '--filter', '-f']);
  if (flags.has('-q')) return ok(d.images.map((i) => i.id.slice(0, 12)).join('\n'));
  const rows = [...d.images].sort((a, b) => b.created - a.created).map((i) => ({ Repository: i.repo, Tag: i.tag, ID: i.id.slice(0, 12), CreatedSince: ago(d.now, i.created), CreatedAt: new Date(i.created).toISOString(), Size: i.size }));
  const fmt = opts['--format']?.[0];
  if (fmt) return format(fmt, rows, { Repository: 'REPOSITORY', Tag: 'TAG', ID: 'IMAGE ID', CreatedSince: 'CREATED', Size: 'SIZE' });
  return ok(table([['REPOSITORY', 'TAG', 'IMAGE ID', 'CREATED', 'SIZE'], ...rows.map((r) => [r.Repository, r.Tag, r.ID, r.CreatedSince, r.Size])]));
}

function dockerInspect(d: DockerState, args: string[]): CmdResult {
  const { opts, rest } = parseOpts(args, ['-f', '--format', '--type']);
  if (!rest.length) return fail('"docker inspect" requires at least 1 argument.\nUsage:  docker inspect [OPTIONS] NAME|ID [NAME|ID...]');
  const fmt = opts['-f']?.[0] ?? opts['--format']?.[0];
  const docs: Record<string, unknown>[] = [];
  const errs: string[] = [];
  for (const ref of rest) {
    const c = opts['--type']?.[0] === 'image' ? undefined : findContainer(d, ref);
    const i = c ? undefined : findImage(d, ref);
    if (c) docs.push(containerJson(d, c));
    else if (i) docs.push(imageJson(i));
    else errs.push(`Error: No such object: ${ref}`);
  }
  try {
    const out = fmt ? docs.map((doc) => goTemplate(fmt, doc)).join('\n') : JSON.stringify(docs, null, 4);
    return { out: docs.length ? out : '', err: errs.join('\n') || undefined, code: errs.length ? 1 : 0 };
  } catch (e) {
    if (e instanceof TemplateError) return fail(e.message);
    throw e;
  }
}

function dockerHistory(d: DockerState, args: string[]): CmdResult {
  const { opts, flags, rest } = parseOpts(args, ['--format']);
  const img = rest[0] ? findImage(d, rest[0]) : undefined;
  if (!img) return fail(`Error response from daemon: No such image: ${rest[0] ?? ''}`);
  const trunc = !flags.has('--no-trunc');
  const layers = [...img.layers].reverse();
  const rows = layers.map((l, n) => {
    const by = trunc && l.by.length > 45 ? l.by.slice(0, 44) + '…' : l.by;
    return { ID: n === 0 ? img.id.slice(0, 12) : '<missing>', CreatedSince: ago(d.now, img.created), CreatedBy: by, Size: l.size, Comment: l.by.includes('buildkit') || /^(ENV|USER|EXPOSE|CMD|ENTRYPOINT|WORKDIR|LABEL|ARG)/.test(l.by) ? 'buildkit.dockerfile.v0' : '' };
  });
  const fmt = opts['--format']?.[0];
  if (fmt) return format(fmt, rows, { ID: 'IMAGE', CreatedSince: 'CREATED', CreatedBy: 'CREATED BY', Size: 'SIZE', Comment: 'COMMENT' });
  return ok(table([['IMAGE', 'CREATED', 'CREATED BY', 'SIZE', 'COMMENT'], ...rows.map((r) => [r.ID, r.CreatedSince, r.CreatedBy, r.Size, r.Comment])]));
}

function dockerLogs(d: DockerState, args: string[]): CmdResult {
  const { opts, rest } = parseOpts(args, ['--tail', '-n', '--since']);
  const c = rest[0] ? findContainer(d, rest[0]) : undefined;
  if (!c) return fail(noSuchContainer(rest[0] ?? ''));
  let lines = (c.logs ?? '').replace(/\n$/, '').split('\n').filter((l, i, a) => l !== '' || i < a.length - 1);
  const tail = opts['--tail']?.[0] ?? opts['-n']?.[0];
  if (tail && tail !== 'all') lines = lines.slice(Math.max(0, lines.length - Number(tail)));
  return ok(lines.join('\n'));
}

function dockerExec(d: DockerState, args: string[]): CmdResult {
  const { opts, flags, rest } = parseOpts(args, ['-u', '--user', '-e', '-w']);
  const [ref, ...cmd] = rest;
  const c = ref ? findContainer(d, ref) : undefined;
  if (!c) return fail(noSuchContainer(ref ?? ''));
  if (c.status !== 'running') return fail(`Error response from daemon: container ${c.id} is not running`);
  if (!cmd.length) return fail('"docker exec" requires at least 2 arguments.\nUsage:  docker exec [OPTIONS] CONTAINER COMMAND [ARG...]');
  const shellLike = ['sh', 'bash', '/bin/sh', '/bin/bash', 'ash'];
  if ((flags.has('-i') || flags.has('-t') || flags.has('-it')) && shellLike.includes(cmd[0]!) && cmd.length === 1) {
    return fail("Bu simulyatorda konteyner ichida interaktiv qobiq ochilmaydi. Buyruqni to'g'ridan-to'g'ri bering:\n  docker exec NOM ls -la /app\n  docker exec NOM cat /etc/passwd");
  }
  const s = containerShell(d, c);
  const asUser = opts['-u']?.[0] ?? opts['--user']?.[0];
  const prevUser = s.user;
  if (asUser) s.user = asUser === '0' ? 'root' : asUser;
  const line = shellLike.includes(cmd[0]!) && cmd[1] === '-c' ? cmd.slice(2).join(' ') : cmd.map((a) => (/[\s|;&]/.test(a) ? `'${a}'` : a)).join(' ');
  const res = execLine(s, line);
  s.user = prevUser;
  return { out: res.output, code: res.code };
}

function dockerRun(d: DockerState, args: string[]): CmdResult {
  const valueOpts = ['--name', '-p', '--publish', '-e', '--env', '-u', '--user', '--cap-drop', '--cap-add', '-m', '--memory', '--pids-limit', '-v', '--volume', '--network', '--net', '--security-opt', '--restart', '-w', '--workdir'];
  const { opts, flags, rest } = parseOpts(args, valueOpts);
  const [ref, ...cmd] = rest;
  if (!ref) return fail('"docker run" requires at least 1 argument.\nUsage:  docker run [OPTIONS] IMAGE [COMMAND] [ARG...]');
  const img = findImage(d, ref);
  if (!img) return fail(`Unable to find image '${ref.includes(':') ? ref : ref + ':latest'}' locally\ndocker: Error response from daemon: pull access denied (bu simulyatorda internetdan yuklab olinmaydi — mavjud image'lar: docker images).`);
  const name = opts['--name']?.[0] ?? `lab_${(d.containers.length + 1).toString(36)}`;
  if (d.containers.some((c) => c.name === name)) return fail(`docker: Error response from daemon: Conflict. The container name "/${name}" is already in use. You have to remove (or rename) that container to be able to reuse that name.`);
  const memRaw = opts['-m']?.[0] ?? opts['--memory']?.[0];
  const mem = memRaw ? Number(/^(\d+)/.exec(memRaw)?.[1] ?? 0) * ({ k: 1024, m: 1024 ** 2, g: 1024 ** 3 }[memRaw.slice(-1).toLowerCase() as 'k'] ?? 1) : undefined;
  const ports = [...(opts['-p'] ?? []), ...(opts['--publish'] ?? [])].map((p) => {
    const parts = p.split(':');
    const [cport, proto] = parts[parts.length - 1]!.split('/');
    return { host: parts.length === 3 ? parts[0] : '0.0.0.0', hostPort: Number(parts[parts.length - 2] ?? cport), port: Number(cport), proto: (proto as 'tcp' | 'udp') ?? 'tcp' };
  });
  const id = Array.from({ length: 64 }, (_, i) => '0123456789abcdef'[(name.charCodeAt(i % name.length) * (i + 7) + d.containers.length) % 16]).join('');
  const command = cmd.length ? cmd.join(' ') : [...(img.entrypoint ?? []), ...(img.cmd ?? [])].join(' ');
  const user = opts['-u']?.[0] ?? opts['--user']?.[0];
  const c: ContainerSpec = {
    id,
    name,
    image: imageName(img),
    status: 'running',
    created: d.now,
    started: d.now,
    command,
    ...(user ? { user } : {}),
    env: [...(opts['-e'] ?? []), ...(opts['--env'] ?? [])],
    ports,
    privileged: flags.has('--privileged'),
    capAdd: opts['--cap-add'],
    capDrop: opts['--cap-drop'],
    mounts: [...(opts['-v'] ?? []), ...(opts['--volume'] ?? [])].map((v) => {
      const [source, destination, mode] = v.split(':');
      return { type: source!.startsWith('/') ? ('bind' as const) : ('volume' as const), source: source!, destination: destination ?? source!, rw: mode !== 'ro' };
    }),
    network: opts['--network']?.[0] ?? opts['--net']?.[0] ?? 'bridge',
    readOnly: flags.has('--read-only'),
    ...(mem ? { memory: mem } : {}),
    ...(opts['--pids-limit'] ? { pidsLimit: Number(opts['--pids-limit'][0]) } : {}),
    securityOpt: opts['--security-opt'],
    restart: opts['--restart']?.[0],
    procs: [{ pid: 1, user: user ?? img.user ?? 'root', cmd: command }],
    logs: '',
    cpu: 0.1,
    memUsage: 12,
  };
  if (flags.has('--rm') && !flags.has('-d')) return ok('');
  d.containers.push(c);
  return ok(flags.has('-d') || flags.has('--detach') ? id : '');
}

function lifecycle(d: DockerState, verb: string, args: string[]): CmdResult {
  const { flags, rest } = parseOpts(args, ['-t', '--time', '-s', '--signal']);
  if (!rest.length) return fail(`"docker ${verb}" requires at least 1 argument.`);
  const out: string[] = [];
  const errs: string[] = [];
  for (const ref of rest) {
    const c = findContainer(d, ref);
    if (!c) {
      errs.push(verb === 'rm' ? `Error response from daemon: No such container: ${ref}` : noSuchContainer(ref));
      continue;
    }
    if (verb === 'stop' || verb === 'kill') {
      if (c.status === 'running' || c.status === 'paused') {
        c.status = 'exited';
        c.exitCode = verb === 'kill' ? 137 : 0;
        c.finished = d.now;
      }
    } else if (verb === 'start' || verb === 'restart') {
      c.status = 'running';
      c.started = d.now;
    } else if (verb === 'pause') c.status = 'paused';
    else if (verb === 'unpause') c.status = 'running';
    else if (verb === 'rm') {
      if (c.status === 'running' && !flags.has('-f') && !flags.has('--force')) {
        errs.push(`Error response from daemon: cannot remove container "/${c.name}": container is running: stop the container before removing or force remove`);
        continue;
      }
      d.containers = d.containers.filter((x) => x !== c);
      d.shells.delete(c.id);
    }
    out.push(ref);
  }
  return { out: out.join('\n'), err: errs.join('\n') || undefined, code: errs.length ? 1 : 0 };
}

function dockerTop(d: DockerState, args: string[]): CmdResult {
  const c = args[0] ? findContainer(d, args[0]) : undefined;
  if (!c) return fail(noSuchContainer(args[0] ?? ''));
  if (c.status !== 'running') return fail(`Error response from daemon: container ${c.id} is not running`);
  const procs = c.procs ?? [{ pid: 1, user: c.user ?? 'root', cmd: c.command }];
  return ok(table([['UID', 'PID', 'PPID', 'C', 'STIME', 'TTY', 'TIME', 'CMD'], ...procs.map((p, i) => [p.user, String(48210 + p.pid), String(i === 0 ? 48190 : 48210 + 1), String(Math.round(p.cpu ?? 0)), '08:12', '?', p.cpu && p.cpu > 50 ? '00:41:07' : '00:00:01', p.cmd])]));
}

function dockerStats(d: DockerState, args: string[]): CmdResult {
  const { flags, rest } = parseOpts(args, ['--format']);
  if (!flags.has('--no-stream')) return fail("Bu simulyatorda jonli yangilanish yo'q: docker stats --no-stream");
  const list = d.containers.filter((c) => c.status === 'running' && (!rest.length || rest.some((r) => c.name === r || c.id.startsWith(r))));
  const mib = (n: number) => (n >= 1024 ? `${(n / 1024).toFixed(2)}GiB` : `${n.toFixed(2)}MiB`);
  return ok(
    table([
      ['CONTAINER ID', 'NAME', 'CPU %', 'MEM USAGE / LIMIT', 'MEM %', 'PIDS'],
      ...list.map((c) => {
        const limit = c.memory ? c.memory / 1024 ** 2 : 7836;
        const used = c.memUsage ?? 20;
        return [c.id.slice(0, 12), c.name, `${(c.cpu ?? 0).toFixed(2)}%`, `${mib(used)} / ${mib(limit)}`, `${((used / limit) * 100).toFixed(2)}%`, String((c.procs ?? [1]).length)];
      }),
    ]),
  );
}

export const docker: Command = (args, ctx) => {
  const d = ctx.state.docker;
  if (!d) return fail(NO_DAEMON);
  let [sub, ...rest] = args;
  // docker container ls / docker image ls / docker image history ...
  if (sub === 'container' || sub === 'image') {
    const [verb, ...more] = rest;
    const map: Record<string, string> = sub === 'container' ? { ls: 'ps', list: 'ps' } : { ls: 'images', list: 'images', rm: 'rmi' };
    sub = map[verb ?? ''] ?? verb;
    rest = more;
  }
  switch (sub) {
    case 'ps':
      return dockerPs(d, rest);
    case 'images':
      return dockerImages(d, rest);
    case 'inspect':
      return dockerInspect(d, rest);
    case 'history':
      return dockerHistory(d, rest);
    case 'logs':
      return dockerLogs(d, rest);
    case 'exec':
      return dockerExec(d, rest);
    case 'run':
      return dockerRun(d, rest);
    case 'stop':
    case 'start':
    case 'restart':
    case 'kill':
    case 'rm':
    case 'pause':
    case 'unpause':
      return lifecycle(d, sub, rest);
    case 'top':
      return dockerTop(d, rest);
    case 'stats':
      return dockerStats(d, rest);
    case 'port': {
      const c = rest[0] ? findContainer(d, rest[0]) : undefined;
      if (!c) return fail(noSuchContainer(rest[0] ?? ''));
      return ok((c.ports ?? []).map((p) => `${p.port}/${p.proto ?? 'tcp'} -> ${p.host ?? '0.0.0.0'}:${p.hostPort}`).join('\n'));
    }
    case 'diff': {
      const c = rest[0] ? findContainer(d, rest[0]) : undefined;
      if (!c) return fail(noSuchContainer(rest[0] ?? ''));
      return ok((c.diff ?? []).join('\n'));
    }
    case 'network':
      if (rest[0] === 'ls') return ok(table([['NETWORK ID', 'NAME', 'DRIVER', 'SCOPE'], ...d.networks.map((n, i) => [`${(i + 1).toString(16).padStart(2, '0')}c4e1a9b7d2`, n.name, n.driver, 'local'])]));
      return fail('Usage:  docker network ls');
    case 'volume':
      if (rest[0] === 'ls') return ok(table([['DRIVER', 'VOLUME NAME'], ...d.volumes.map((v) => ['local', v])]));
      return fail('Usage:  docker volume ls');
    case 'rmi': {
      const img = rest[0] ? findImage(d, rest[0]) : undefined;
      if (!img) return fail(`Error response from daemon: No such image: ${rest[0] ?? ''}`);
      const user = d.containers.find((c) => c.image === imageName(img));
      if (user) return fail(`Error response from daemon: conflict: unable to remove repository reference "${imageName(img)}" (must force) - container ${user.id.slice(0, 12)} is using its referenced image ${img.id.slice(0, 12)}`);
      d.images = d.images.filter((i) => i !== img);
      return ok(`Untagged: ${imageName(img)}\nDeleted: sha256:${img.id}`);
    }
    case 'version':
      return ok('Client: Docker Engine - Community\n Version:           27.3.1\n API version:       1.47\n\nServer: Docker Engine - Community\n Engine:\n  Version:          27.3.1\n  API version:      1.47 (minimum version 1.24)');
    case 'info':
      return ok(
        [
          'Client: Docker Engine - Community',
          ' Version:    27.3.1',
          '',
          'Server:',
          ` Containers: ${d.containers.length}`,
          `  Running: ${d.containers.filter((c) => c.status === 'running').length}`,
          `  Paused: ${d.containers.filter((c) => c.status === 'paused').length}`,
          `  Stopped: ${d.containers.filter((c) => c.status === 'exited' || c.status === 'created').length}`,
          ` Images: ${d.images.length}`,
          ' Server Version: 27.3.1',
          ' Storage Driver: overlay2',
          ' Security Options:',
          '  apparmor',
          '  seccomp',
          '   Profile: builtin',
          ' Docker Root Dir: /var/lib/docker',
        ].join('\n'),
      );
    case undefined:
    case '--help':
      return ok('Usage:  docker COMMAND\n\nSimulyatordagi buyruqlar: ps, images, inspect, history, logs, exec, run, stop, start, restart, kill, rm, rmi, top, stats, port, diff, network ls, volume ls, version, info\nBatafsil: man docker');
    default:
      return fail(`docker: '${sub}' is not a docker command.\nSee 'docker --help'`);
  }
};

/* ── trivy ── */

const SEV_ORDER: Vuln['severity'][] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];

function boxTable(header: string[], rows: string[][]): string {
  const widths = header.map((h, i) => Math.max(h.length, ...rows.map((r) => (r[i] ?? '').length)) + 2);
  const line = (l: string, m: string, r: string) => l + widths.map((w) => '─'.repeat(w)).join(m) + r;
  const row = (cells: string[]) => '│' + cells.map((c, i) => ` ${c}`.padEnd(widths[i]!)).join('│') + '│';
  return [line('┌', '┬', '┐'), row(header), line('├', '┼', '┤'), ...rows.map(row), line('└', '┴', '┘')].join('\n');
}

export const trivy: Command = (args, ctx) => {
  const [sub, ...rest] = args;
  if (sub !== 'image') return fail("Ishlatilishi: trivy image [--severity HIGH,CRITICAL] [--scanners vuln,secret] [--ignore-unfixed] IMAGE\n(simulyatorda faqat 'trivy image')");
  const d = ctx.state.docker;
  const { opts, flags, rest: names } = parseOpts(rest, ['--severity', '-s', '--scanners', '--format', '-f']);
  const ref = names[0];
  const img = d && ref ? findImage(d, ref) : undefined;
  if (!img) return fail(`FATAL\timage scan error: unable to find the specified image "${ref ?? ''}" (simulyatorda faqat lokal image'lar)`);
  const sev = (opts['--severity']?.[0] ?? opts['-s']?.[0] ?? 'UNKNOWN,LOW,MEDIUM,HIGH,CRITICAL').split(',').map((s) => s.trim().toUpperCase());
  const scanners = (opts['--scanners']?.[0] ?? 'vuln,secret').split(',');
  const out: string[] = [];
  if (scanners.includes('vuln')) {
    let vulns = (img.vulns ?? []).filter((v) => sev.includes(v.severity));
    if (flags.has('--ignore-unfixed')) vulns = vulns.filter((v) => v.fixed);
    vulns.sort((a, b) => a.lib.localeCompare(b.lib) || SEV_ORDER.indexOf(a.severity) - SEV_ORDER.indexOf(b.severity) || a.id.localeCompare(b.id));
    const count = (s: string) => vulns.filter((v) => v.severity === s).length;
    const title = `${imageName(img)} (${img.os ?? 'debian 12.5'})`;
    out.push(title, '='.repeat(title.length), `Total: ${vulns.length} (UNKNOWN: 0, LOW: ${count('LOW')}, MEDIUM: ${count('MEDIUM')}, HIGH: ${count('HIGH')}, CRITICAL: ${count('CRITICAL')})`);
    if (vulns.length) out.push('', boxTable(['Library', 'Vulnerability', 'Severity', 'Status', 'Installed Version', 'Fixed Version', 'Title'], vulns.map((v) => [v.lib, v.id, v.severity, v.fixed ? 'fixed' : 'affected', v.installed, v.fixed ?? '', v.title])));
  }
  if (scanners.includes('secret')) {
    const secrets = (img.secrets ?? []).filter((s) => sev.includes(s.severity));
    for (const file of [...new Set(secrets.map((s) => s.file))]) {
      const list = secrets.filter((s) => s.file === file);
      const head = `${file} (secrets)`;
      out.push('', head, '='.repeat(head.length), `Total: ${list.length} (UNKNOWN: 0, LOW: 0, MEDIUM: 0, HIGH: ${list.filter((s) => s.severity === 'HIGH').length}, CRITICAL: ${list.filter((s) => s.severity === 'CRITICAL').length})`);
      for (const s of list) {
        const masked = s.text.replace(/=(.+)$/, (_m, v: string) => '=' + '*'.repeat(v.length));
        out.push('', `${s.severity}: ${s.title} (${s.rule})`, '═'.repeat(40), s.title, '─'.repeat(40), ` ${file}:${s.line} (added by '${s.layer}')`, '─'.repeat(40), `${String(s.line).padStart(4)} [ ${masked}`, '─'.repeat(40));
      }
    }
  }
  return ok(out.join('\n').replace(/^\n/, ''));
};

/* ── hadolint ── */

const RULES: Record<string, [string, string]> = {
  DL3002: ['warning', 'Last USER should not be root'],
  DL3006: ['warning', 'Always tag the version of an image explicitly'],
  DL3007: ['warning', 'Using latest is prone to errors if the image will ever update. Pin the version explicitly to a release tag'],
  DL3008: ['warning', 'Pin versions in apt get install. Instead of `apt-get install <package>` use `apt-get install <package>=<version>`'],
  DL3009: ['info', 'Delete the apt-get lists after installing something'],
  DL3013: ['warning', 'Pin versions in pip. Instead of `pip install <package>` use `pip install <package>==<version>`'],
  DL3015: ['info', 'Avoid additional packages by specifying `--no-install-recommends`'],
  DL3020: ['error', 'Use COPY instead of ADD for files and folders'],
  DL3025: ['warning', 'Use arguments JSON notation for CMD and ENTRYPOINT arguments'],
  DL3042: ['warning', 'Avoid use of cache directory with pip. Use `pip install --no-cache-dir <package>`'],
  DL4006: ['warning', 'Set the SHELL option -o pipefail before RUN with a pipe in it. If you are using /bin/sh in an alpine image or if your shell is symlinked to busybox then consider explicitly setting your SHELL to /bin/ash, or disable this check'],
};

export function lintDockerfile(text: string, name: string): string[] {
  const out: string[] = [];
  const add = (n: number, code: string) => out.push(`${name}:${n} ${code} ${RULES[code]![0]}: ${RULES[code]![1]}`);
  let lastUser: { n: number; user: string } | null = null;
  let pipefail = false;
  // Join continuation lines but remember where each instruction starts.
  const instrs: { n: number; text: string }[] = [];
  let buf = '';
  let start = 0;
  text.split('\n').forEach((line, i) => {
    if (!buf) start = i + 1;
    const trimmed = line.trim();
    if (!buf && (trimmed === '' || trimmed.startsWith('#'))) return;
    buf += (buf ? ' ' : '') + trimmed.replace(/\\$/, '').trim();
    if (!trimmed.endsWith('\\')) {
      instrs.push({ n: start, text: buf });
      buf = '';
    }
  });
  for (const { n, text: ins } of instrs) {
    const [kw = '', ...restParts] = ins.split(/\s+/);
    const rest = restParts.join(' ');
    switch (kw.toUpperCase()) {
      case 'FROM': {
        const image = rest.split(/\s+/)[0] ?? '';
        if (image !== 'scratch' && !image.includes('@')) {
          if (!image.includes(':')) add(n, 'DL3006');
          else if (image.endsWith(':latest')) add(n, 'DL3007');
        }
        break;
      }
      case 'RUN':
        if (/apt-get\s+install/.test(rest)) {
          const pkgs = rest.split(/apt-get\s+install/)[1]!.split(/&&|;/)[0]!.split(/\s+/).filter((p) => p && !p.startsWith('-'));
          if (pkgs.some((p) => !p.includes('='))) add(n, 'DL3008');
          if (!rest.includes('--no-install-recommends')) add(n, 'DL3015');
          if (!/rm\s+-rf\s+\/var\/lib\/apt\/lists/.test(rest)) add(n, 'DL3009');
        }
        if (/pip3?\s+install/.test(rest)) {
          const pkgs = rest.split(/pip3?\s+install/)[1]!.split(/&&|;/)[0]!.split(/\s+/).filter((p) => p && !p.startsWith('-'));
          if (pkgs.some((p) => !p.includes('==') && !p.endsWith('.txt'))) add(n, 'DL3013');
          if (!rest.includes('--no-cache-dir')) add(n, 'DL3042');
        }
        if (/\|/.test(rest.replace(/\|\|/g, '')) && !pipefail) add(n, 'DL4006');
        break;
      case 'SHELL':
        if (rest.includes('pipefail')) pipefail = true;
        break;
      case 'ADD':
        if (!/^(--\S+\s+)*(https?:\/\/|\S+\.(tar|tar\.gz|tgz|tar\.xz)\s)/.test(rest + ' ')) add(n, 'DL3020');
        break;
      case 'USER':
        lastUser = { n, user: rest.trim() };
        break;
      case 'CMD':
      case 'ENTRYPOINT':
        if (!rest.trim().startsWith('[')) add(n, 'DL3025');
        break;
    }
  }
  if (lastUser && /^(root|0)(:.*)?$/.test(lastUser.user)) add(lastUser.n, 'DL3002');
  return out.sort((a, b) => Number(/:(\d+) /.exec(a)![1]) - Number(/:(\d+) /.exec(b)![1]));
}

export const hadolint: Command = (args, ctx: CmdCtx) => {
  const files = args.filter((a) => !a.startsWith('-'));
  if (!files.length) return fail('Ishlatilishi: hadolint Dockerfile');
  const out: string[] = [];
  for (const f of files) {
    const node = getNode(ctx.state.root, resolvePath(ctx.state.cwd, f, ctx.state.home));
    if (!node || node.type !== 'file') return fail(`hadolint: ${f}: openBinaryFile: does not exist (No such file or directory)`);
    out.push(...lintDockerfile(node.content, f));
  }
  return { out: out.join('\n'), code: out.length ? 1 : 0 };
};
