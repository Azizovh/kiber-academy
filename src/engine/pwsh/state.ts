/* What a Windows lab describes, and the mutable copy the PowerShell session works on. */

export interface WinProcess {
  id: number;
  name: string;
  path?: string;
  commandLine?: string;
  parentId?: number;
  user?: string;
  /** CPU seconds. */
  cpu?: number;
  /** Working set in MB. */
  ws?: number;
  /** Start time, ms since epoch (UTC). */
  start?: number;
  company?: string;
  /** Session id: 0 for services, 1+ for interactive sessions. */
  si?: number;
}

export interface WinService {
  name: string;
  displayName: string;
  status: 'Running' | 'Stopped';
  startType: 'Automatic' | 'Manual' | 'Disabled';
  path: string;
  account?: string;
  pid?: number;
  description?: string;
}

export interface WinTask {
  path: string;
  name: string;
  state: 'Ready' | 'Disabled' | 'Running';
  execute: string;
  arguments?: string;
  author?: string;
  runAs?: string;
  trigger?: string;
}

export interface WinUser {
  name: string;
  enabled: boolean;
  description?: string;
  lastLogon?: number;
  passwordLastSet?: number;
  sid?: string;
}

export interface WinGroup {
  name: string;
  description?: string;
  members: string[];
}

export interface WinConn {
  localAddress: string;
  localPort: number;
  remoteAddress: string;
  remotePort: number;
  state: 'Listen' | 'Established' | 'TimeWait' | 'CloseWait' | 'SynSent';
  pid: number;
}

export interface WinFwRule {
  name: string;
  displayName: string;
  enabled: boolean;
  direction: 'Inbound' | 'Outbound';
  action: 'Allow' | 'Block';
  remoteAddress?: string;
  localPort?: string;
  protocol?: string;
}

export interface WinEvent {
  log: string;
  id: number;
  time: number;
  provider?: string;
  level?: 'Information' | 'Warning' | 'Error' | 'Critical';
  message: string;
}

export interface WinThreat {
  name: string;
  time: number;
  path: string;
  action: string;
}

export interface WinSpec {
  computer?: string;
  /** "Run as Administrator". Defaults to true. */
  elevated?: boolean;
  domain?: string;
  os?: string;
  ip?: string;
  now?: number;
  processes?: WinProcess[];
  services?: WinService[];
  tasks?: WinTask[];
  users?: WinUser[];
  groups?: WinGroup[];
  connections?: WinConn[];
  firewall?: WinFwRule[];
  /** Name → address for Resolve-DnsName and Test-NetConnection; reachable ports per address. */
  dns?: Record<string, string>;
  openPorts?: Record<string, number[]>;
  dnsCache?: { entry: string; data: string; type?: string; ttl?: number }[];
  /** "HKLM:\Software\Microsoft\Windows\CurrentVersion\Run" → values. */
  registry?: Record<string, Record<string, string | number>>;
  events?: WinEvent[];
  defender?: {
    realtime?: boolean;
    exclusionPaths?: string[];
    signatureUpdated?: number;
    threats?: WinThreat[];
    /** File names Start-MpScan recognises as malware, and the threat name it reports. */
    signatures?: { file: string; threat: string }[];
  };
  hotfixes?: { id: string; description: string; installedOn: number }[];
  /** Windows paths with the Hidden attribute. */
  hidden?: string[];
  env?: Record<string, string>;
  /** Last boot time. */
  boot?: number;
}

export interface RegKey {
  path: string;
  values: Record<string, string | number>;
}

export interface WinState {
  computer: string;
  elevated: boolean;
  domain: string;
  os: string;
  ip: string;
  now: number;
  boot: number;
  processes: WinProcess[];
  services: WinService[];
  tasks: WinTask[];
  users: WinUser[];
  groups: WinGroup[];
  connections: WinConn[];
  firewall: WinFwRule[];
  dns: Record<string, string>;
  openPorts: Record<string, number[]>;
  dnsCache: { entry: string; data: string; type: string; ttl: number }[];
  /** Keyed by the lower-cased full path. */
  registry: Map<string, RegKey>;
  events: WinEvent[];
  defender: { realtime: boolean; exclusionPaths: string[]; signatureUpdated: number; threats: WinThreat[]; signatures: { file: string; threat: string }[] };
  hotfixes: { id: string; description: string; installedOn: number }[];
  hidden: Set<string>;
  env: Record<string, string>;
  vars: Record<string, import('./values').PsVal>;
}

/** 17 Nov 2026, 09:30 UTC — the morning after the night the Windows labs investigate. */
export const WIN_NOW = Date.UTC(2026, 10, 17, 9, 30, 0);

export const regKeyName = (p: string) => normRegPath(p).toLowerCase();

/** HKEY_LOCAL_MACHINE\x, HKLM:x, hklm:\x → HKLM:\x */
export function normRegPath(p: string): string {
  let s = p.replace(/\//g, '\\').replace(/^Registry::/i, '').replace(/\\+$/, '');
  s = s.replace(/^HKEY_LOCAL_MACHINE/i, 'HKLM:').replace(/^HKEY_CURRENT_USER/i, 'HKCU:');
  s = s.replace(/^(HKLM|HKCU):?\\?/i, (_m, h: string) => `${h.toUpperCase()}:\\`);
  return s;
}

export function createWin(spec: WinSpec, user: string): WinState {
  const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x)) as T;
  const computer = spec.computer ?? 'WIN-LAB';
  const registry = new Map<string, RegKey>();
  for (const [path, values] of Object.entries(spec.registry ?? {})) {
    const norm = normRegPath(path);
    registry.set(norm.toLowerCase(), { path: norm, values: { ...values } });
  }
  const users = clone(spec.users ?? [
    { name: 'Administrator', enabled: false, description: 'Built-in account for administering the computer/domain' },
    { name: user, enabled: true, description: '' },
    { name: 'Guest', enabled: false, description: 'Built-in account for guest access to the computer/domain' },
  ]);
  const groups = clone(spec.groups ?? [
    { name: 'Administrators', description: 'Administrators have complete and unrestricted access to the computer/domain', members: [user] },
    { name: 'Users', description: 'Users are prevented from making accidental or intentional system-wide changes', members: [user] },
    { name: 'Remote Desktop Users', description: 'Members in this group are granted the right to logon remotely', members: [] },
  ]);
  return {
    computer,
    elevated: spec.elevated ?? true,
    domain: spec.domain ?? 'WORKGROUP',
    os: spec.os ?? 'Microsoft Windows Server 2022 Standard',
    ip: spec.ip ?? '10.10.20.15',
    now: spec.now ?? WIN_NOW,
    boot: spec.boot ?? Date.UTC(2026, 10, 10, 6, 12, 0),
    processes: clone(spec.processes ?? []),
    services: clone(spec.services ?? []),
    tasks: clone(spec.tasks ?? []),
    users,
    groups,
    connections: clone(spec.connections ?? []),
    firewall: clone(spec.firewall ?? []),
    dns: { localhost: '127.0.0.1', ...(spec.dns ?? {}) },
    openPorts: clone(spec.openPorts ?? {}),
    dnsCache: (spec.dnsCache ?? []).map((c) => ({ type: 'A', ttl: 300, ...c })),
    registry,
    events: clone(spec.events ?? []),
    defender: {
      realtime: spec.defender?.realtime ?? true,
      exclusionPaths: [...(spec.defender?.exclusionPaths ?? [])],
      signatureUpdated: spec.defender?.signatureUpdated ?? Date.UTC(2026, 10, 16, 23, 5, 0),
      threats: clone(spec.defender?.threats ?? []),
      signatures: clone(spec.defender?.signatures ?? []),
    },
    hotfixes: clone(spec.hotfixes ?? []),
    hidden: new Set((spec.hidden ?? []).map((p) => p.toLowerCase())),
    env: {
      COMPUTERNAME: computer,
      USERNAME: user,
      USERPROFILE: `C:\\Users\\${user}`,
      SystemRoot: 'C:\\Windows',
      TEMP: `C:\\Users\\${user}\\AppData\\Local\\Temp`,
      PATH: 'C:\\Windows\\system32;C:\\Windows;C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\;C:\\Program Files\\PowerShell\\7\\',
      OS: 'Windows_NT',
      PROCESSOR_ARCHITECTURE: 'AMD64',
      ...(spec.env ?? {}),
    },
    vars: {},
  };
}
