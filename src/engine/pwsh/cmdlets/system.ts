import { PsError, ACCESS_DENIED, nameFilter, wild, type Cmdlet, type CmdletCtx } from '../types';
import { date, fmtDate, obj, toStr, type PsObj, type PsVal } from '../values';
import type { WinProcess, WinService, WinTask, WinState } from '../state';

const PROTECTED = new Set(['system', 'idle', 'smss', 'csrss', 'wininit', 'services', 'lsass', 'winlogon', 'registry']);

function processObj(win: WinState, p: WinProcess, withUser = false): PsObj {
  const ws = p.ws ?? 12;
  const props: Record<string, PsVal> = {
    'NPM(K)': 8 + (p.id % 37),
    'PM(M)': Math.round(ws * 0.62 * 100) / 100,
    'WS(M)': ws,
    'CPU(s)': p.cpu ?? 0,
    Id: p.id,
    SI: p.si ?? (p.user && /system|service/i.test(p.user) ? 0 : 1),
    ProcessName: p.name,
    Name: p.name,
    Path: p.path ?? null,
    CommandLine: p.commandLine ?? (p.path ? `"${p.path}"` : null),
    Company: p.company ?? null,
    CPU: p.cpu ?? 0,
    WorkingSet64: Math.round(ws * 1024 * 1024),
    WS: Math.round(ws * 1024 * 1024),
    StartTime: p.start !== undefined ? date(p.start) : date(win.boot),
    Parent: null,
    Handles: 100 + ((p.id * 7) % 900),
  };
  if (withUser) props.UserName = p.user ?? `${win.computer}\\${'talaba'}`;
  return obj('System.Diagnostics.Process', props, {
    view: withUser ? ['WS(M)', 'CPU(s)', 'Id', 'UserName', 'ProcessName'] : ['NPM(K)', 'PM(M)', 'WS(M)', 'CPU(s)', 'Id', 'SI', 'ProcessName'],
    str: `System.Diagnostics.Process (${p.name})`,
  });
}

const sortProcs = (list: WinProcess[]) => [...list].sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()) || a.id - b.id);

const getProcess: Cmdlet = {
  name: 'Get-Process',
  params: [{ name: 'Name', pos: 0, aliases: ['ProcessName'] }, { name: 'Id' }, { name: 'IncludeUserName', switch: true }],
  run: (c) => {
    const win = c.s.win;
    if (c.p.sw('IncludeUserName') && !win.elevated) throw new PsError(`The 'IncludeUserName' parameter requires elevated user rights. Try running the command again in a session that has been opened with elevated user rights (that is, Run as Administrator).`);
    let list = sortProcs(win.processes);
    const ids = c.p.strs('Id')?.map(Number);
    if (ids) {
      for (const id of ids) if (!list.some((p) => p.id === id)) c.error(`Cannot find a process with the process identifier ${id}.`);
      list = list.filter((p) => ids.includes(p.id));
    }
    const names = c.p.strs('Name');
    if (names) {
      const f = nameFilter(c.p)!;
      for (const n of names) if (!/[*?]/.test(n) && !list.some((p) => p.name.toLowerCase() === n.toLowerCase())) c.error(`Cannot find a process with the name "${n}". Verify the process name and call the cmdlet again.`);
      list = list.filter((p) => f(p.name));
    }
    return list.map((p) => processObj(win, p, c.p.sw('IncludeUserName')));
  },
};

function killProcess(c: CmdletCtx, p: WinProcess) {
  const win = c.s.win;
  if (PROTECTED.has(p.name.toLowerCase()) || (!win.elevated && p.user && !p.user.toLowerCase().endsWith(c.s.state.user.toLowerCase()))) {
    c.error(`Cannot stop process "${p.name} (${p.id})" because of the following error: Access is denied.`);
    return;
  }
  win.processes = win.processes.filter((x) => x.id !== p.id);
  win.connections = win.connections.filter((x) => x.pid !== p.id);
  for (const s of win.services) if (s.pid === p.id) {
    s.status = 'Stopped';
    s.pid = undefined;
  }
}

const stopProcess: Cmdlet = {
  name: 'Stop-Process',
  params: [{ name: 'Id', pos: 0 }, { name: 'Name', aliases: ['ProcessName'] }, { name: 'Force', switch: true }, { name: 'PassThru', switch: true }],
  run: (c) => {
    const win = c.s.win;
    let targets: WinProcess[] = [];
    const ids = c.p.strs('Id')?.map(Number);
    if (ids) {
      for (const id of ids) {
        const p = win.processes.find((x) => x.id === id);
        if (p) targets.push(p);
        else c.error(`Cannot find a process with the process identifier ${id}.`);
      }
    }
    const names = c.p.strs('Name');
    if (names) {
      const f = nameFilter(c.p)!;
      const hit = win.processes.filter((p) => f(p.name));
      if (!hit.length) c.error(`Cannot find a process with the name "${names.join(', ')}". Verify the process name and call the cmdlet again.`);
      targets.push(...hit);
    }
    for (const v of c.input) {
      const id = Number(toStr((v as PsObj).props?.Id ?? (v as PsObj).props?.ProcessId ?? v));
      const p = win.processes.find((x) => x.id === id);
      if (p) targets.push(p);
    }
    targets = [...new Set(targets)];
    if (!targets.length && !ids && !names && !c.input.length) throw new PsError("Missing an argument for parameter 'Id'.");
    for (const p of targets) killProcess(c, p);
    return [];
  },
};

/* ── services ── */

function serviceObj(s: WinService): PsObj {
  return obj(
    'System.ServiceProcess.ServiceController',
    {
      Status: s.status,
      Name: s.name,
      DisplayName: s.displayName,
      StartType: s.startType,
      ServiceName: s.name,
      BinaryPathName: s.path,
      UserName: s.account ?? 'LocalSystem',
      Description: s.description ?? null,
    },
    { view: ['Status', 'Name', 'DisplayName'], str: s.name },
  );
}

function findServices(c: CmdletCtx): WinService[] {
  const win = c.s.win;
  const names = c.p.strs('Name') ?? c.input.map((v) => toStr((v as PsObj).props?.Name ?? v));
  if (!names.length) throw new PsError("Missing an argument for parameter 'Name'.");
  const out: WinService[] = [];
  for (const n of names) {
    const re = wild(n);
    const hit = win.services.filter((s) => re.test(s.name));
    if (!hit.length) c.error(`Cannot find any service with service name '${n}'.`);
    out.push(...hit);
  }
  return out;
}

const getService: Cmdlet = {
  name: 'Get-Service',
  params: [{ name: 'Name', pos: 0, aliases: ['ServiceName'] }, { name: 'DisplayName' }],
  run: (c) => {
    let list = [...c.s.win.services].sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));
    const names = c.p.strs('Name');
    if (names) {
      for (const n of names) if (!/[*?]/.test(n) && !list.some((s) => s.name.toLowerCase() === n.toLowerCase())) c.error(`Cannot find any service with service name '${n}'.`);
      const f = nameFilter(c.p)!;
      list = list.filter((s) => f(s.name));
    }
    const dn = c.p.strs('DisplayName')?.map(wild);
    if (dn) list = list.filter((s) => dn.some((r) => r.test(s.displayName)));
    return list.map(serviceObj);
  },
};

function serviceAction(name: string, act: (c: CmdletCtx, s: WinService) => void): Cmdlet {
  return {
    name,
    admin: true,
    params: [{ name: 'Name', pos: 0, aliases: ['ServiceName'] }, { name: 'Force', switch: true }, { name: 'PassThru', switch: true }],
    run: (c) => {
      const out: PsVal[] = [];
      for (const s of findServices(c)) {
        act(c, s);
        if (c.p.sw('PassThru')) out.push(serviceObj(s));
      }
      return out;
    },
  };
}

function stopService(c: CmdletCtx, s: WinService) {
  if (s.status === 'Stopped') return;
  if (s.pid) c.s.win.processes = c.s.win.processes.filter((p) => p.id !== s.pid);
  if (s.pid) c.s.win.connections = c.s.win.connections.filter((x) => x.pid !== s.pid);
  s.status = 'Stopped';
  s.pid = undefined;
}

function startService(c: CmdletCtx, s: WinService) {
  if (s.startType === 'Disabled') {
    c.error(`Service '${s.displayName} (${s.name})' cannot be started due to the following error: Cannot start service '${s.name}' on computer '.'.`);
    return;
  }
  if (s.status === 'Running') return;
  const pid = 4000 + c.s.win.processes.length * 13 + c.s.state.history.length;
  const exe = s.path.replace(/^"([^"]+)".*$/, '$1').split(' ')[0]!;
  c.s.win.processes.push({ id: pid, name: exe.split('\\').pop()!.replace(/\.exe$/i, ''), path: exe, user: 'NT AUTHORITY\\SYSTEM', si: 0, ws: 9, start: c.s.win.now });
  s.status = 'Running';
  s.pid = pid;
}

const setService: Cmdlet = {
  name: 'Set-Service',
  admin: true,
  params: [{ name: 'Name', pos: 0 }, { name: 'StartupType', aliases: ['StartMode', 'st'] }, { name: 'Status' }, { name: 'DisplayName' }, { name: 'PassThru', switch: true }],
  run: (c) => {
    for (const s of findServices(c)) {
      const st = c.p.str('StartupType');
      if (st) {
        const norm = ['Automatic', 'Manual', 'Disabled'].find((x) => x.toLowerCase() === st.toLowerCase());
        if (!norm) throw new PsError(`Cannot bind parameter 'StartupType'. Cannot convert value "${st}" to type "Microsoft.PowerShell.Commands.ServiceStartupType". Possible enumeration values are "Automatic, Manual, Disabled".`);
        s.startType = norm as WinService['startType'];
      }
      const status = c.p.str('Status')?.toLowerCase();
      if (status === 'stopped') stopService(c, s);
      if (status === 'running') startService(c, s);
    }
    return [];
  },
};

const removeService: Cmdlet = {
  name: 'Remove-Service',
  admin: true,
  params: [{ name: 'Name', pos: 0 }],
  run: (c) => {
    for (const s of findServices(c)) {
      stopService(c, s);
      c.s.win.services = c.s.win.services.filter((x) => x !== s);
    }
    return [];
  },
};

/* ── CIM ── */

function whereFilter(filter: string | undefined): ((props: Record<string, PsVal>) => boolean) | null {
  if (!filter) return null;
  const m = /^\s*(\w+)\s*(=|!=|<>|like)\s*'?([^']*)'?\s*$/i.exec(filter);
  if (!m) throw new PsError(`Invalid query "${filter}" (simulyatorda: Name='qiymat', ProcessId=123, Name like '%qism%').`);
  const [, field, op, value] = m;
  return (props) => {
    const key = Object.keys(props).find((k) => k.toLowerCase() === field!.toLowerCase());
    const v = toStr(key ? props[key]! : null).toLowerCase();
    const target = value!.toLowerCase();
    if (op!.toLowerCase() === 'like') return new RegExp('^' + target.replace(/[.+^${}()|\\]/g, '\\$&').replace(/%/g, '.*').replace(/_/g, '.') + '$').test(v);
    return op === '=' ? v === target : v !== target;
  };
}

const cimDate = (ms: number) => date(ms);

const getCim: Cmdlet = {
  name: 'Get-CimInstance',
  params: [{ name: 'ClassName', pos: 0, aliases: ['Class'] }, { name: 'Filter' }, { name: 'Namespace' }, { name: 'Query' }],
  run: (c) => {
    const win = c.s.win;
    const cls = (c.p.str('ClassName') ?? '').toLowerCase();
    const f = whereFilter(c.p.str('Filter'));
    let rows: PsObj[];
    if (cls === 'win32_process') {
      rows = sortProcs(win.processes).map((p) =>
        obj('Microsoft.Management.Infrastructure.CimInstance#root/cimv2/Win32_Process', {
          ProcessId: p.id,
          Name: p.name.toLowerCase().endsWith('.exe') || ['system', 'idle', 'registry'].includes(p.name.toLowerCase()) ? p.name : `${p.name}.exe`,
          HandleCount: 100 + ((p.id * 7) % 900),
          WorkingSetSize: Math.round((p.ws ?? 12) * 1024 * 1024),
          VirtualSize: Math.round((p.ws ?? 12) * 4.3 * 1024 * 1024),
          ParentProcessId: p.parentId ?? 0,
          CommandLine: p.commandLine ?? (p.path ? `"${p.path}"` : null),
          ExecutablePath: p.path ?? null,
          CreationDate: cimDate(p.start ?? win.boot),
        }, { view: ['ProcessId', 'Name', 'HandleCount', 'WorkingSetSize', 'VirtualSize'] }),
      );
    } else if (cls === 'win32_service') {
      rows = [...win.services].sort((a, b) => a.name.localeCompare(b.name)).map((s) =>
        obj('Microsoft.Management.Infrastructure.CimInstance#root/cimv2/Win32_Service', {
          ProcessId: s.pid ?? 0,
          Name: s.name,
          StartMode: s.startType === 'Automatic' ? 'Auto' : s.startType,
          State: s.status,
          Status: 'OK',
          ExitCode: 0,
          DisplayName: s.displayName,
          PathName: s.path,
          StartName: s.account ?? 'LocalSystem',
          Description: s.description ?? null,
        }, { view: ['ProcessId', 'Name', 'StartMode', 'State', 'Status', 'ExitCode'] }),
      );
    } else if (cls === 'win32_operatingsystem') {
      rows = [
        obj('Microsoft.Management.Infrastructure.CimInstance#root/cimv2/Win32_OperatingSystem', {
          SystemDirectory: 'C:\\Windows\\system32',
          Organization: '',
          BuildNumber: '20348',
          RegisteredUser: 'Windows User',
          SerialNumber: '00454-60000-00001-AA000',
          Version: '10.0.20348',
          Caption: win.os,
          CSName: win.computer,
          LastBootUpTime: date(win.boot),
          LocalDateTime: date(win.now),
        }, { view: ['SystemDirectory', 'Organization', 'BuildNumber', 'RegisteredUser', 'SerialNumber', 'Version'] }),
      ];
    } else if (cls === 'win32_startupcommand') {
      rows = [];
      for (const key of win.registry.values()) {
        if (!/\\currentversion\\run(once)?$/i.test(key.path)) continue;
        const loc = key.path.replace(/^HKLM:\\/, 'HKLM\\').replace(/^HKCU:\\/, 'HKU\\S-1-5-21\\');
        for (const [name, cmd] of Object.entries(key.values)) {
          rows.push(obj('Microsoft.Management.Infrastructure.CimInstance#root/cimv2/Win32_StartupCommand', { Command: toStr(cmd), User: key.path.startsWith('HKCU') ? `${win.computer}\\${c.s.state.user}` : 'Public', Caption: name, Name: name, Location: loc }, { view: ['Command', 'User', 'Caption'] }));
        }
      }
    } else if (cls === 'win32_useraccount') {
      rows = win.users.map((u) => obj('Microsoft.Management.Infrastructure.CimInstance#root/cimv2/Win32_UserAccount', { Name: u.name, Caption: `${win.computer}\\${u.name}`, AccountType: 512, SID: u.sid ?? 'S-1-5-21-0-0-0-1001', Domain: win.computer, Disabled: !u.enabled }, { view: ['Name', 'Caption', 'AccountType', 'SID', 'Domain'] }));
    } else {
      throw new PsError(`Invalid class "${c.p.str('ClassName') ?? ''}". Simulyatordagi klasslar: Win32_Process, Win32_Service, Win32_OperatingSystem, Win32_StartupCommand, Win32_UserAccount.`);
    }
    return f ? rows.filter((r) => f(r.props)) : rows;
  },
};

/* ── scheduled tasks ── */

function taskObj(t: WinTask): PsObj {
  const action = obj('Microsoft.Management.Infrastructure.CimInstance#Root/Microsoft/Windows/TaskScheduler/MSFT_TaskExecAction', {
    Id: null,
    Arguments: t.arguments ?? null,
    Execute: t.execute,
    WorkingDirectory: null,
    PSComputerName: null,
  });
  return obj('Microsoft.Management.Infrastructure.CimInstance#Root/Microsoft/Windows/TaskScheduler/MSFT_ScheduledTask', {
    TaskPath: t.path,
    TaskName: t.name,
    State: t.state,
    Author: t.author ?? null,
    Actions: [action],
    Triggers: t.trigger ? [t.trigger] : [],
    Principal: obj('Microsoft.Management.Infrastructure.CimInstance#MSFT_TaskPrincipal2', { UserId: t.runAs ?? 'SYSTEM', RunLevel: 'Highest' }, { str: t.runAs ?? 'SYSTEM' }),
  }, { view: ['TaskPath', 'TaskName', 'State'], str: `MSFT_ScheduledTask (TaskName = "${t.name}", TaskPath = "${t.path}")` });
}

function findTasks(c: CmdletCtx, need: boolean): WinTask[] {
  const names = c.p.strs('TaskName') ?? c.input.map((v) => toStr((v as PsObj).props?.TaskName ?? v));
  let list = c.s.win.tasks;
  if (names.length) {
    const res = names.map(wild);
    list = list.filter((t) => res.some((r) => r.test(t.name)));
    if (!list.length) throw new PsError(`No MSFT_ScheduledTask objects found with property 'TaskName' equal to '${names.join(', ')}'.  Verify the value of the property and retry.`);
  } else if (need) throw new PsError("Missing an argument for parameter 'TaskName'.");
  const path = c.p.str('TaskPath');
  if (path) list = list.filter((t) => wild(path).test(t.path));
  return list;
}

const getScheduledTask: Cmdlet = {
  name: 'Get-ScheduledTask',
  params: [{ name: 'TaskName', pos: 0 }, { name: 'TaskPath', pos: 1 }],
  run: (c) => [...findTasks(c, false)].sort((a, b) => a.path.localeCompare(b.path) || a.name.localeCompare(b.name)).map(taskObj),
};

const disableTask: Cmdlet = {
  name: 'Disable-ScheduledTask',
  admin: true,
  params: [{ name: 'TaskName', pos: 0 }, { name: 'TaskPath', pos: 1 }],
  run: (c) =>
    findTasks(c, true).map((t) => {
      t.state = 'Disabled';
      return taskObj(t);
    }),
};

const enableTask: Cmdlet = {
  name: 'Enable-ScheduledTask',
  admin: true,
  params: [{ name: 'TaskName', pos: 0 }, { name: 'TaskPath', pos: 1 }],
  run: (c) =>
    findTasks(c, true).map((t) => {
      t.state = 'Ready';
      return taskObj(t);
    }),
};

const unregisterTask: Cmdlet = {
  name: 'Unregister-ScheduledTask',
  admin: true,
  params: [{ name: 'TaskName', pos: 0 }, { name: 'TaskPath', pos: 1 }],
  run: (c) => {
    const hit = new Set(findTasks(c, true));
    c.s.win.tasks = c.s.win.tasks.filter((t) => !hit.has(t));
    return [];
  },
};

/* ── local users and groups ── */

function userObj(win: WinState, u: WinState['users'][number]): PsObj {
  return obj('Microsoft.PowerShell.Commands.LocalUser', {
    Name: u.name,
    Enabled: u.enabled,
    Description: u.description ?? '',
    LastLogon: u.lastLogon !== undefined ? date(u.lastLogon) : null,
    PasswordLastSet: u.passwordLastSet !== undefined ? date(u.passwordLastSet) : null,
    SID: u.sid ?? `S-1-5-21-3623811015-3361044348-30300820-${1000 + win.users.indexOf(u)}`,
    PrincipalSource: 'Local',
  }, { view: ['Name', 'Enabled', 'Description'], str: u.name });
}

function findUser(c: CmdletCtx): WinState['users'][number][] {
  const names = c.p.strs('Name') ?? c.input.map((v) => toStr((v as PsObj).props?.Name ?? v));
  return names.flatMap((n) => {
    const re = wild(n);
    const hit = c.s.win.users.filter((u) => re.test(u.name));
    if (!hit.length) c.error(`User ${n} was not found.`);
    return hit;
  });
}

const getLocalUser: Cmdlet = {
  name: 'Get-LocalUser',
  params: [{ name: 'Name', pos: 0 }, { name: 'SID' }],
  run: (c) => (c.p.has('Name') ? findUser(c) : c.s.win.users).map((u) => userObj(c.s.win, u)),
};

function userToggle(name: string, enabled: boolean): Cmdlet {
  return {
    name,
    admin: true,
    params: [{ name: 'Name', pos: 0 }],
    run: (c) => {
      for (const u of findUser(c)) u.enabled = enabled;
      return [];
    },
  };
}

const removeLocalUser: Cmdlet = {
  name: 'Remove-LocalUser',
  admin: true,
  params: [{ name: 'Name', pos: 0 }],
  run: (c) => {
    for (const u of findUser(c)) {
      c.s.win.users = c.s.win.users.filter((x) => x !== u);
      for (const g of c.s.win.groups) g.members = g.members.filter((m) => m.toLowerCase() !== u.name.toLowerCase());
    }
    return [];
  },
};

const getLocalGroup: Cmdlet = {
  name: 'Get-LocalGroup',
  params: [{ name: 'Name', pos: 0 }],
  run: (c) => {
    const f = nameFilter(c.p);
    return c.s.win.groups.filter((g) => !f || f(g.name)).map((g) => obj('Microsoft.PowerShell.Commands.LocalGroup', { Name: g.name, Description: g.description ?? '' }, { view: ['Name', 'Description'], str: g.name }));
  },
};

function findGroup(c: CmdletCtx) {
  const name = c.p.str('Group');
  if (!name) throw new PsError("Missing an argument for parameter 'Group'.");
  const g = c.s.win.groups.find((x) => x.name.toLowerCase() === name.toLowerCase());
  if (!g) throw new PsError(`Group ${name} was not found.`);
  return g;
}

const getLocalGroupMember: Cmdlet = {
  name: 'Get-LocalGroupMember',
  params: [{ name: 'Group', pos: 0, aliases: ['Name'] }, { name: 'Member', pos: 1 }],
  run: (c) => {
    const g = findGroup(c);
    const win = c.s.win;
    return g.members.map((m) =>
      obj('Microsoft.PowerShell.Commands.LocalPrincipal', {
        ObjectClass: m.includes('\\') && !m.toUpperCase().startsWith(win.computer.toUpperCase()) ? 'Group' : 'User',
        Name: m.includes('\\') ? m : `${win.computer}\\${m}`,
        PrincipalSource: m.includes('\\') && !m.toUpperCase().startsWith(win.computer.toUpperCase()) ? 'ActiveDirectory' : 'Local',
      }, { view: ['ObjectClass', 'Name', 'PrincipalSource'] }),
    );
  },
};

function memberChange(name: string, add: boolean): Cmdlet {
  return {
    name,
    admin: true,
    params: [{ name: 'Group', pos: 0, aliases: ['Name'] }, { name: 'Member', pos: 1 }],
    run: (c) => {
      const g = findGroup(c);
      for (const m of c.p.strs('Member') ?? []) {
        const short = m.replace(/^.*\\/, '');
        const has = g.members.some((x) => x.replace(/^.*\\/, '').toLowerCase() === short.toLowerCase());
        if (add) {
          if (has) c.error(`${m} is already a member of group ${g.name}.`);
          else g.members.push(short);
        } else if (!has) c.error(`Member ${m} was not found in group ${g.name}.`);
        else g.members = g.members.filter((x) => x.replace(/^.*\\/, '').toLowerCase() !== short.toLowerCase());
      }
      return [];
    },
  };
}

/* ── system information and native tools ── */

const getHotFix: Cmdlet = {
  name: 'Get-HotFix',
  params: [{ name: 'Id', pos: 0 }],
  run: (c) => {
    const ids = c.p.strs('Id')?.map((x) => x.toLowerCase());
    return c.s.win.hotfixes
      .filter((h) => !ids || ids.includes(h.id.toLowerCase()))
      .map((h) => obj('System.Management.ManagementObject#root\\cimv2\\Win32_QuickFixEngineering', { Source: c.s.win.computer, Description: h.description, HotFixID: h.id, InstalledBy: 'NT AUTHORITY\\SYSTEM', InstalledOn: date(h.installedOn) }, { view: ['Source', 'Description', 'HotFixID', 'InstalledBy', 'InstalledOn'] }));
  },
};

const isAdminMember = (win: WinState, user: string) => win.groups.find((g) => g.name === 'Administrators')?.members.some((m) => m.replace(/^.*\\/, '').toLowerCase() === user.toLowerCase()) ?? false;

const whoami: Cmdlet = {
  name: 'whoami.exe',
  native: true,
  params: [],
  run: (c) => {
    const win = c.s.win;
    const me = `${win.computer.toLowerCase()}\\${c.s.state.user}`;
    const arg = (c.p.rest[0] ?? '').toLowerCase();
    if (!arg) return me;
    if (arg === '/priv') {
      const rows = win.elevated
        ? [['SeDebugPrivilege', 'Debug programs', 'Enabled'], ['SeBackupPrivilege', 'Back up files and directories', 'Disabled'], ['SeSecurityPrivilege', 'Manage auditing and security log', 'Disabled'], ['SeShutdownPrivilege', 'Shut down the system', 'Disabled'], ['SeChangeNotifyPrivilege', 'Bypass traverse checking', 'Enabled']]
        : [['SeShutdownPrivilege', 'Shut down the system', 'Disabled'], ['SeChangeNotifyPrivilege', 'Bypass traverse checking', 'Enabled'], ['SeIncreaseWorkingSetPrivilege', 'Increase a process working set', 'Disabled']];
      return ['', 'PRIVILEGES INFORMATION', '----------------------', '', 'Privilege Name                Description                       State', '============================= ================================= ========', ...rows.map(([a, b, s]) => `${a!.padEnd(29)} ${b!.padEnd(33)} ${s}`)].join('\n');
    }
    if (arg === '/groups') {
      const groups = ['Everyone', 'BUILTIN\\Users', ...(isAdminMember(win, c.s.state.user) ? ['BUILTIN\\Administrators'] : []), 'NT AUTHORITY\\INTERACTIVE', win.elevated ? 'Mandatory Label\\High Mandatory Level' : 'Mandatory Label\\Medium Mandatory Level'];
      return ['', 'GROUP INFORMATION', '-----------------', '', 'Group Name', '======================================', ...groups].join('\n');
    }
    if (arg === '/user') return ['', 'USER INFORMATION', '----------------', '', 'User Name           SID', '=================== =============================================', `${me.padEnd(19)} S-1-5-21-3623811015-3361044348-30300820-1001`].join('\n');
    throw new PsError(`ERROR: Invalid argument/option - '${c.p.rest[0]}'. (Simulyatorda: whoami, whoami /priv, whoami /groups, whoami /user)`);
  },
};

const hostname: Cmdlet = { name: 'hostname.exe', native: true, params: [], run: (c) => c.s.win.computer };

const systeminfo: Cmdlet = {
  name: 'systeminfo.exe',
  native: true,
  params: [],
  run: (c) => {
    const w = c.s.win;
    const rows: [string, string][] = [
      ['Host Name', w.computer],
      ['OS Name', w.os],
      ['OS Version', '10.0.20348 N/A Build 20348'],
      ['System Boot Time', fmtDate(w.boot).replace(/ (\d+:)/, ', $1')],
      ['System Type', 'x64-based PC'],
      ['Domain', w.domain],
      ['Hotfix(s)', `${w.hotfixes.length} Hotfix(s) Installed.`],
      ...w.hotfixes.map((h, i): [string, string] => ['', `[${String(i + 1).padStart(2, '0')}]: ${h.id}`]),
    ];
    return rows.map(([k, v]) => `${k ? (k + ':').padEnd(27) : ''.padEnd(27)}${v}`).join('\n');
  },
};

const tasklist: Cmdlet = {
  name: 'tasklist.exe',
  native: true,
  params: [],
  run: (c) => {
    const head = ['', 'Image Name                     PID Session Name        Session#    Mem Usage', '========================= ======== ================ =========== ============'];
    const rows = sortProcs(c.s.win.processes).map((p) => {
      const name = /\.exe$/i.test(p.name) || ['System', 'Idle', 'Registry'].includes(p.name) ? p.name : `${p.name}.exe`;
      const si = p.si ?? 1;
      return `${name.padEnd(25)} ${String(p.id).padStart(8)} ${(si === 0 ? 'Services' : 'Console').padEnd(16)} ${String(si).padStart(11)} ${(Math.round((p.ws ?? 12) * 1024).toLocaleString('en-US') + ' K').padStart(12)}`;
    });
    return [...head, ...rows].join('\n');
  },
};

export const SYSTEM: Cmdlet[] = [
  getProcess,
  stopProcess,
  getService,
  serviceAction('Stop-Service', stopService),
  serviceAction('Start-Service', startService),
  serviceAction('Restart-Service', (c, s) => {
    stopService(c, s);
    startService(c, s);
  }),
  setService,
  removeService,
  getCim,
  getScheduledTask,
  disableTask,
  enableTask,
  unregisterTask,
  getLocalUser,
  userToggle('Disable-LocalUser', false),
  userToggle('Enable-LocalUser', true),
  removeLocalUser,
  getLocalGroup,
  getLocalGroupMember,
  memberChange('Add-LocalGroupMember', true),
  memberChange('Remove-LocalGroupMember', false),
  getHotFix,
  whoami,
  hostname,
  systeminfo,
  tasklist,
];
void ACCESS_DENIED;
