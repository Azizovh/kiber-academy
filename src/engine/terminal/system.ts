import { fail, ok, type CmdCtx, type Command } from './shell';

/*
 * A small model of a running Linux system: processes, systemd services and listening sockets. Labs describe it in
 * `ShellInit.system`; the commands below read and change it. Output imitates the real tools closely enough that a
 * learner recognises it on a real server, but only the columns the course uses are filled in.
 */

export interface Proc {
  pid: number;
  ppid: number;
  user: string;
  /** Full command line as `ps` shows it. */
  cmd: string;
  cpu?: number;
  mem?: number;
  /** Start time column, e.g. "03:12". */
  start?: string;
}

export interface Service {
  /** Unit name without ".service". */
  name: string;
  description: string;
  active: 'active' | 'inactive' | 'failed';
  enabled: boolean;
  /** Main process while active. */
  pid?: number;
  /** Command started by the unit; becomes the process command when started. */
  exec: string;
  user?: string;
  /** Path of the unit file. */
  unitPath?: string;
  /** journalctl -u lines (newest last). */
  journal?: string[];
  /** Starting fails (with these journal lines) until the condition holds. */
  startCheck?: (ctx: CmdCtx) => string[] | null;
}

export interface Socket {
  proto: 'tcp' | 'udp';
  /** "0.0.0.0:22", "127.0.0.1:5432", "[::]:80" */
  local: string;
  pid: number;
}

export interface SystemSpec {
  procs?: Proc[];
  services?: Service[];
  sockets?: Socket[];
}

export interface SystemState {
  procs: Proc[];
  services: Service[];
  sockets: Socket[];
  nextPid: number;
}

export function createSystem(spec: SystemSpec | undefined): SystemState {
  const procs = (spec?.procs ?? []).map((p) => ({ ...p }));
  const services = (spec?.services ?? []).map((s) => ({ ...s, journal: [...(s.journal ?? [])] }));
  const sockets = (spec?.sockets ?? []).map((s) => ({ ...s }));
  const nextPid = Math.max(4000, ...procs.map((p) => p.pid + 1));
  return { procs, services, sockets, nextPid };
}

function sys(ctx: CmdCtx): SystemState {
  return ctx.state.system;
}

function procName(p: Proc): string {
  const first = p.cmd.split(' ')[0]!;
  return first.slice(first.lastIndexOf('/') + 1).replace(/^\[|\]$/g, '');
}

/* ── ps / pgrep / kill ─────────────────────────────────────────────────── */

export const ps: Command = (args, ctx) => {
  const all = args.some((a) => /^-?[a-z]*[aex][a-z]*$/i.test(a) && a !== '-f');
  const full = args.some((a) => a.replace(/^-/, '').includes('u') || a === 'aux');
  const ef = args.includes('-ef') || (args.includes('-e') && args.includes('-f'));
  const list = all || ef ? sys(ctx).procs : sys(ctx).procs.filter((p) => p.user === ctx.state.user);
  if (ef) {
    const rows = list.map(
      (p) => `${p.user.padEnd(9)} ${String(p.pid).padStart(6)} ${String(p.ppid).padStart(6)}  0 ${(p.start ?? '09:00').padEnd(5)} ?        00:00:00 ${p.cmd}`,
    );
    return ok(['UID          PID   PPID  C STIME TTY          TIME CMD', ...rows].join('\n'));
  }
  if (full) {
    const rows = list.map(
      (p) =>
        `${p.user.padEnd(10)} ${String(p.pid).padStart(6)} ${(p.cpu ?? 0).toFixed(1).padStart(4)} ${(p.mem ?? 0.1).toFixed(1).padStart(4)} ${(p.start ?? '09:00').padEnd(5)} ${p.cmd}`,
    );
    return ok(['USER          PID %CPU %MEM START COMMAND', ...rows].join('\n'));
  }
  const rows = list.map((p) => `${String(p.pid).padStart(7)} pts/0    00:00:00 ${procName(p)}`);
  return ok(['    PID TTY          TIME CMD', ...rows].join('\n'));
};

export const pgrep: Command = (args, ctx) => {
  const full = args.includes('-f');
  const showName = args.includes('-l') || args.includes('-a');
  const pattern = args.filter((a) => !a.startsWith('-'))[0];
  if (!pattern) return fail('Ishlatilishi: pgrep [-l] [-f] NAMUNA');
  let re: RegExp;
  try {
    re = new RegExp(pattern);
  } catch {
    return fail(`pgrep: invalid pattern '${pattern}'`);
  }
  const hits = sys(ctx).procs.filter((p) => re.test(full ? p.cmd : procName(p)));
  if (!hits.length) return { out: '', code: 1 };
  return ok(hits.map((p) => (showName ? `${p.pid} ${args.includes('-a') ? p.cmd : procName(p)}` : String(p.pid))).join('\n'));
};

/** Stops a process; a service whose main process dies is marked failed (systemd would restart only if told to). */
function stopProcess(state: SystemState, pid: number): void {
  const victims = new Set([pid]);
  // Children go with their parent, as they would when a service's cgroup is stopped.
  let grew = true;
  while (grew) {
    grew = false;
    for (const p of state.procs) if (victims.has(p.ppid) && !victims.has(p.pid)) victims.add(p.pid), (grew = true);
  }
  state.procs = state.procs.filter((p) => !victims.has(p.pid));
  state.sockets = state.sockets.filter((s) => !victims.has(s.pid));
  for (const s of state.services) {
    if (s.pid !== undefined && victims.has(s.pid)) {
      s.active = 'failed';
      s.pid = undefined;
      s.journal?.push(`${stamp()} systemd[1]: ${s.name}.service: Main process exited, code=killed, status=9/KILL`);
    }
  }
}

export const kill: Command = (args, ctx) => {
  const pids = args.filter((a) => /^\d+$/.test(a)).map(Number);
  if (args.includes('-l')) return ok(' 1) SIGHUP\t 2) SIGINT\t 9) SIGKILL\t15) SIGTERM');
  if (!pids.length) return fail('Ishlatilishi: kill [-9] PID   (PID ni ps yoki pgrep bilan toping)');
  const state = sys(ctx);
  const errors: string[] = [];
  for (const pid of pids) {
    const p = state.procs.find((x) => x.pid === pid);
    if (!p) errors.push(`kill: (${pid}) - No such process`);
    else if (ctx.user !== 'root' && p.user !== ctx.user) errors.push(`kill: (${pid}) - Operation not permitted`);
    else stopProcess(state, pid);
  }
  return errors.length ? fail(errors.join('\n')) : ok();
};

/* ── systemctl / journalctl ───────────────────────────────────────────── */

function stamp(): string {
  return 'Nov 18 10:15:02 srv01';
}

function unitName(raw: string | undefined): string {
  return (raw ?? '').replace(/\.service$/, '');
}

function findService(ctx: CmdCtx, raw: string | undefined): Service | undefined {
  return sys(ctx).services.find((s) => s.name === unitName(raw));
}

function statusText(ctx: CmdCtx, s: Service): string {
  const state = sys(ctx);
  const main = s.pid !== undefined ? state.procs.find((p) => p.pid === s.pid) : undefined;
  const active =
    s.active === 'active'
      ? 'active (running) since Mon 2026-11-16 09:00:12 UTC; 2 days ago'
      : s.active === 'failed'
        ? 'failed (Result: exit-code) since Tue 2026-11-18 10:14:55 UTC; 7s ago'
        : 'inactive (dead)';
  const lines = [
    `${s.active === 'active' ? '●' : s.active === 'failed' ? '×' : '○'} ${s.name}.service - ${s.description}`,
    `     Loaded: loaded (${s.unitPath ?? `/lib/systemd/system/${s.name}.service`}; ${s.enabled ? 'enabled' : 'disabled'}; preset: enabled)`,
    `     Active: ${active}`,
  ];
  if (main) lines.push(`   Main PID: ${main.pid} (${procName(main)})`, `     CGroup: /system.slice/${s.name}.service`, `             └─${main.pid} ${main.cmd}`);
  const tail = (s.journal ?? []).slice(-5);
  if (tail.length) lines.push('', ...tail);
  return lines.join('\n');
}

const NEED_ROOT = (verb: string, unit: string) =>
  fail(`Failed to ${verb} ${unit}.service: Access denied\n(Xizmatni boshqarish uchun root huquqi kerak: sudo systemctl ${verb} ${unit})`, 1);

export const systemctl: Command = (args, ctx) => {
  const words = args.filter((a) => !a.startsWith('-'));
  const [verb = 'list-units', ...units] = words;
  const state = sys(ctx);

  if (verb === 'list-units' || verb === 'list-unit-files') {
    const onlyRunning = args.includes('--state=running');
    const onlyFailed = args.includes('--state=failed') || args.includes('--failed');
    let list = state.services;
    if (onlyRunning) list = list.filter((s) => s.active === 'active');
    if (onlyFailed) list = list.filter((s) => s.active === 'failed');
    if (verb === 'list-unit-files') {
      const rows = list.map((s) => `${(s.name + '.service').padEnd(32)} ${s.enabled ? 'enabled ' : 'disabled'} enabled`);
      return ok(['UNIT FILE                        STATE    PRESET', ...rows, '', `${rows.length} unit files listed.`].join('\n'));
    }
    const rows = list.map(
      (s) =>
        `  ${(s.name + '.service').padEnd(30)} loaded ${(s.active === 'active' ? 'active' : s.active).padEnd(8)} ${(s.active === 'active' ? 'running' : s.active === 'failed' ? 'failed' : 'dead').padEnd(7)} ${s.description}`,
    );
    return ok(['  UNIT                           LOAD   ACTIVE   SUB     DESCRIPTION', ...rows, '', `${rows.length} loaded units listed.`].join('\n'));
  }

  if (!units.length) return fail(`Ishlatilishi: systemctl ${verb} XIZMAT`);
  const out: string[] = [];
  let code = 0;
  for (const raw of units) {
    const s = findService(ctx, raw);
    const name = unitName(raw);
    if (!s) {
      if (verb === 'status') return fail(`Unit ${name}.service could not be found.`, 4);
      return fail(`Failed to ${verb} ${name}.service: Unit ${name}.service not found.`, 5);
    }
    switch (verb) {
      case 'status':
        out.push(statusText(ctx, s));
        if (s.active !== 'active') code = 3;
        break;
      case 'is-active':
        out.push(s.active === 'active' ? 'active' : s.active);
        if (s.active !== 'active') code = 3;
        break;
      case 'is-enabled':
        out.push(s.enabled ? 'enabled' : 'disabled');
        if (!s.enabled) code = 1;
        break;
      case 'cat':
        out.push(`# ${s.unitPath ?? `/lib/systemd/system/${s.name}.service`}`, '[Unit]', `Description=${s.description}`, '', '[Service]', `ExecStart=${s.exec}`, s.user ? `User=${s.user}` : '', 'Restart=on-failure', '', '[Install]', 'WantedBy=multi-user.target');
        break;
      case 'start':
      case 'restart':
      case 'stop': {
        if (ctx.user !== 'root') return NEED_ROOT(verb, name);
        if (verb !== 'start' && s.pid !== undefined) {
          stopProcess(state, s.pid);
          s.journal?.push(`${stamp()} systemd[1]: Stopping ${s.description}...`, `${stamp()} systemd[1]: ${s.name}.service: Deactivated successfully.`);
        }
        s.active = 'inactive';
        s.pid = undefined;
        if (verb === 'stop') break;
        const problem = s.startCheck?.(ctx) ?? null;
        if (problem) {
          s.active = 'failed';
          s.journal?.push(...problem, `${stamp()} systemd[1]: ${s.name}.service: Failed with result 'exit-code'.`, `${stamp()} systemd[1]: Failed to start ${s.description}.`);
          return fail(`Job for ${s.name}.service failed because the control process exited with error code.\nSee "systemctl status ${s.name}.service" and "journalctl -xeu ${s.name}.service" for details.`);
        }
        const pid = state.nextPid++;
        state.procs.push({ pid, ppid: 1, user: s.user ?? 'root', cmd: s.exec, start: '10:15' });
        s.pid = pid;
        s.active = 'active';
        s.journal?.push(`${stamp()} systemd[1]: Started ${s.description}.`);
        break;
      }
      case 'enable':
      case 'disable':
        if (ctx.user !== 'root') return NEED_ROOT(verb, name);
        s.enabled = verb === 'enable';
        out.push(
          verb === 'enable'
            ? `Created symlink /etc/systemd/system/multi-user.target.wants/${s.name}.service → ${s.unitPath ?? `/lib/systemd/system/${s.name}.service`}.`
            : `Removed "/etc/systemd/system/multi-user.target.wants/${s.name}.service".`,
        );
        if (args.includes('--now')) {
          const res = systemctl([verb === 'enable' ? 'start' : 'stop', s.name], ctx);
          if (res.code !== 0) return res;
        }
        break;
      default:
        return fail(`Unknown command verb '${verb}'. (status, start, stop, restart, enable, disable, is-active, is-enabled, cat, list-units)`);
    }
  }
  return { out: out.filter((l, i, a) => !(l === '' && a[i - 1] === '')).join('\n'), code };
};

export const journalctl: Command = (args, ctx) => {
  let unit: string | undefined;
  let lines = Infinity;
  for (let i = 0; i < args.length; i++) {
    const a = args[i]!;
    if (a === '-u') unit = args[++i];
    else if (a.startsWith('-u')) unit = a.slice(2);
    else if (a === '-n') lines = Number(args[++i]) || 10;
    else if (/^-[a-z]*u$/.test(a)) unit = args[++i]; // -xeu nginx
    else if (a.startsWith('--unit=')) unit = a.slice(7);
  }
  if (!unit) return fail('Ishlatilishi: journalctl -u XIZMAT [-n N]   (masalan: journalctl -u nginx)');
  const s = findService(ctx, unit);
  if (!s) return ok('-- No entries --');
  const all = s.journal ?? [];
  return ok(all.slice(Number.isFinite(lines) ? -lines : 0).join('\n') || '-- No entries --');
};

/* ── ss ────────────────────────────────────────────────────────────────── */

export const ss: Command = (args, ctx) => {
  const flags = args.filter((a) => a.startsWith('-')).join('').replace(/-/g, '');
  const tcp = flags.includes('t') || !flags.includes('u');
  const udp = flags.includes('u');
  const showProc = flags.includes('p');
  const state = sys(ctx);
  const rows = state.sockets
    .filter((s) => (s.proto === 'tcp' && tcp) || (s.proto === 'udp' && udp))
    .map((s) => {
      const p = state.procs.find((x) => x.pid === s.pid);
      // Like the real tool, process details of other users' sockets need root.
      const visible = showProc && p && (ctx.user === 'root' || p.user === ctx.user);
      const procCol = visible ? `users:(("${procName(p)}",pid=${p.pid},fd=3))` : '';
      const st = s.proto === 'tcp' ? 'LISTEN' : 'UNCONN';
      return `${s.proto.padEnd(5)} ${st.padEnd(7)} 0      ${s.proto === 'tcp' ? '511' : '0  '}    ${s.local.padEnd(22)} ${(s.local.startsWith('[') ? '[::]:*' : '0.0.0.0:*').padEnd(12)} ${procCol}`.trimEnd();
    });
  const note =
    showProc && ctx.user !== 'root' ? '\n(Boshqa foydalanuvchilarning jarayon nomlarini ko\'rish uchun: sudo ss -tulpn)' : '';
  return ok(['Netid State   Recv-Q Send-Q Local Address:Port     Peer Address:Port Process', ...rows].join('\n') + note);
};

export const SYSTEM_MANUAL: Record<string, { usage: string; text: string }> = {
  ps: { usage: 'ps [aux | -ef]', text: "Ishlayotgan jarayonlar. `ps aux` — hamma foydalanuvchilarniki, CPU va xotira bilan; `ps -ef` — ota jarayon (PPID) bilan." },
  pgrep: { usage: 'pgrep [-l] [-a] [-f] NAMUNA', text: "Nomi bo'yicha jarayon PID'ini topadi. -l nomi bilan, -a to'liq buyruq bilan, -f butun buyruq qatoridan qidiradi." },
  kill: { usage: 'kill [-9] PID', text: "Jarayonga signal yuboradi (odatda to'xtatadi). Boshqa foydalanuvchining jarayoni uchun sudo kerak." },
  systemctl: { usage: 'systemctl status|start|stop|restart|enable|disable|cat XIZMAT', text: "systemd xizmatlarini boshqaradi. `systemctl list-units --type=service` — ro'yxat; `--state=failed` — ishlamay qolganlar." },
  journalctl: { usage: 'journalctl -u XIZMAT [-n N]', text: "Xizmat jurnali: nima uchun ishga tushmagani shu yerda yoziladi." },
  ss: { usage: 'ss -tulpn', text: "Tinglayotgan portlar: -t TCP, -u UDP, -l faqat tinglayotganlar, -p jarayon, -n raqamlar bilan." },
};

