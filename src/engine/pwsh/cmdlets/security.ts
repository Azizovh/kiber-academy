import { basename, getNode, walk, type FsDir } from '../../terminal/fs';
import { PsError, type Cmdlet } from '../types';
import { date, isDate, isHash, obj, parseDate, toNum, toStr, type PsVal } from '../values';
import type { WinEvent } from '../state';
import { resolveWin, winPath } from './files';

/* ── event logs ── */

const DEFAULT_LOGS = ['Application', 'Security', 'System', 'Windows PowerShell', 'Microsoft-Windows-PowerShell/Operational', 'Microsoft-Windows-Windows Defender/Operational'];

const PROVIDERS: Record<string, string> = {
  Security: 'Microsoft-Windows-Security-Auditing',
  System: 'Service Control Manager',
  Application: 'Application',
  'Microsoft-Windows-PowerShell/Operational': 'Microsoft-Windows-PowerShell',
  'Microsoft-Windows-Windows Defender/Operational': 'Microsoft-Windows-Windows Defender',
  'Microsoft-Windows-Sysmon/Operational': 'Microsoft-Windows-Sysmon',
};

function eventObj(e: WinEvent, computer: string, n: number): PsVal {
  const provider = e.provider ?? PROVIDERS[e.log] ?? e.log;
  return obj('System.Diagnostics.Eventing.Reader.EventLogRecord', {
    TimeCreated: date(e.time),
    Id: e.id,
    LevelDisplayName: e.level ?? 'Information',
    Message: e.message,
    ProviderName: provider,
    LogName: e.log,
    RecordId: n,
    MachineName: computer,
  }, { view: ['TimeCreated', 'Id', 'LevelDisplayName', 'Message'], group: 'ev:' + provider, header: `   ProviderName: ${provider}` });
}

const getWinEvent: Cmdlet = {
  name: 'Get-WinEvent',
  admin: true,
  params: [{ name: 'LogName', pos: 0 }, { name: 'MaxEvents' }, { name: 'FilterHashtable' }, { name: 'Oldest', switch: true }, { name: 'ListLog' }],
  run: (c) => {
    const win = c.s.win;
    const logs = [...new Set([...DEFAULT_LOGS, ...win.events.map((e) => e.log)])];
    if (c.p.has('ListLog')) {
      return logs.map((l) => obj('System.Diagnostics.Eventing.Reader.EventLogConfiguration', { LogMode: 'Circular', MaximumSizeInBytes: 20971520, RecordCount: win.events.filter((e) => e.log === l).length, LogName: l }, { view: ['LogMode', 'MaximumSizeInBytes', 'RecordCount', 'LogName'] }));
    }
    let wanted: string[] | null = c.p.strs('LogName') ?? null;
    let ids: number[] | null = null;
    let start: number | null = null;
    let end: number | null = null;
    let provider: string | null = null;
    const fh = c.p.get('FilterHashtable');
    if (fh !== undefined) {
      if (!isHash(fh)) throw new PsError("Cannot bind parameter 'FilterHashtable'. Kutilgan ko'rinish: @{LogName='Security'; Id=4625}");
      for (const [k, v] of Object.entries(fh.entries)) {
        const key = k.toLowerCase();
        if (key === 'logname') wanted = (Array.isArray(v) ? v : [v]).map(toStr);
        else if (key === 'id') ids = (Array.isArray(v) ? v : [v]).map(toNum);
        else if (key === 'starttime') start = isDate(v) ? v.ms : parseDate(toStr(v));
        else if (key === 'endtime') end = isDate(v) ? v.ms : parseDate(toStr(v));
        else if (key === 'providername') provider = toStr(v);
        else throw new PsError(`The FilterHashtable key '${k}' is not supported here (simulyatorda: LogName, Id, StartTime, EndTime, ProviderName).`);
      }
    }
    if (!wanted) throw new PsError("Jurnal nomini bering: Get-WinEvent -LogName Security  yoki  -FilterHashtable @{LogName='Security'}");
    for (const w of wanted) {
      if (!logs.some((l) => l.toLowerCase() === w.toLowerCase())) throw new PsError(`There is not an event log on the localhost computer that matches "${w}".`);
    }
    const lower = wanted.map((w) => w.toLowerCase());
    let list = win.events
      .map((e, i) => ({ e, n: 1000 + i }))
      .filter(({ e }) => lower.includes(e.log.toLowerCase()))
      .filter(({ e }) => !ids || ids.includes(e.id))
      .filter(({ e }) => start === null || e.time >= start)
      .filter(({ e }) => end === null || e.time <= end)
      .filter(({ e }) => !provider || (e.provider ?? PROVIDERS[e.log] ?? '').toLowerCase() === provider.toLowerCase());
    list.sort((a, b) => (c.p.sw('Oldest') ? a.e.time - b.e.time : b.e.time - a.e.time));
    if (c.p.has('MaxEvents')) list = list.slice(0, c.p.num('MaxEvents'));
    if (!list.length) throw new PsError('No events were found that match the specified selection criteria.');
    return list.map(({ e, n }) => eventObj(e, win.computer, n));
  },
};

/* ── Microsoft Defender ── */

const getMpStatus: Cmdlet = {
  name: 'Get-MpComputerStatus',
  params: [],
  run: (c) => {
    const d = c.s.win.defender;
    return obj('MSFT_MpComputerStatus', {
      AMRunningMode: 'Normal',
      AMServiceEnabled: true,
      AntivirusEnabled: true,
      AntivirusSignatureLastUpdated: date(d.signatureUpdated),
      BehaviorMonitorEnabled: d.realtime,
      IsTamperProtected: false,
      OnAccessProtectionEnabled: d.realtime,
      RealTimeProtectionEnabled: d.realtime,
      QuickScanAge: 1,
    }, { list: true });
  },
};

const getMpPref: Cmdlet = {
  name: 'Get-MpPreference',
  params: [],
  run: (c) => {
    const d = c.s.win.defender;
    return obj('MSFT_MpPreference', {
      DisableBehaviorMonitoring: !d.realtime,
      DisableIOAVProtection: false,
      DisableRealtimeMonitoring: !d.realtime,
      ExclusionExtension: null,
      ExclusionPath: d.exclusionPaths.length ? [...d.exclusionPaths] : null,
      ExclusionProcess: null,
      MAPSReporting: 2,
      SubmitSamplesConsent: 1,
    }, { list: true });
  },
};

const setMpPref: Cmdlet = {
  name: 'Set-MpPreference',
  admin: true,
  params: [{ name: 'DisableRealtimeMonitoring' }, { name: 'ExclusionPath' }],
  run: (c) => {
    const d = c.s.win.defender;
    if (c.p.has('DisableRealtimeMonitoring')) d.realtime = !c.p.sw('DisableRealtimeMonitoring');
    if (c.p.has('ExclusionPath')) d.exclusionPaths = c.p.strs('ExclusionPath')!;
    return [];
  },
};

const addMpPref: Cmdlet = {
  name: 'Add-MpPreference',
  admin: true,
  params: [{ name: 'ExclusionPath' }],
  run: (c) => {
    for (const p of c.p.strs('ExclusionPath') ?? []) if (!c.s.win.defender.exclusionPaths.includes(p)) c.s.win.defender.exclusionPaths.push(p);
    return [];
  },
};

const removeMpPref: Cmdlet = {
  name: 'Remove-MpPreference',
  admin: true,
  params: [{ name: 'ExclusionPath' }],
  run: (c) => {
    const drop = (c.p.strs('ExclusionPath') ?? []).map((p) => p.toLowerCase().replace(/\\+$/, ''));
    c.s.win.defender.exclusionPaths = c.s.win.defender.exclusionPaths.filter((p) => !drop.includes(p.toLowerCase().replace(/\\+$/, '')));
    return [];
  },
};

const threatId = (name: string) => 2147700000 + [...name].reduce((n, ch) => (n * 31 + ch.charCodeAt(0)) % 90000, 7);

const getMpThreat: Cmdlet = {
  name: 'Get-MpThreat',
  params: [],
  run: (c) =>
    c.s.win.defender.threats.map((t) =>
      obj('MSFT_MpThreat', { CategoryID: 8, IsActive: !/removed|quarantined/i.test(t.action), Resources: [`file:_${t.path}`], SeverityID: 5, ThreatID: threatId(t.name), ThreatName: t.name }, { list: true }),
    ),
};

const getMpDetection: Cmdlet = {
  name: 'Get-MpThreatDetection',
  params: [],
  run: (c) =>
    c.s.win.defender.threats.map((t) =>
      obj('MSFT_MpThreatDetection', { ActionSuccess: true, DetectionSourceTypeID: 3, InitialDetectionTime: date(t.time), ProcessName: 'Unknown', Resources: [`file:_${t.path}`], ThreatID: threatId(t.name), ThreatStatusID: /quarantined/i.test(t.action) ? 3 : 1 }, { list: true }),
    ),
};

const startMpScan: Cmdlet = {
  name: 'Start-MpScan',
  admin: true,
  params: [{ name: 'ScanType' }, { name: 'ScanPath' }],
  run: (c) => {
    const win = c.s.win;
    const state = c.s.state;
    const root = c.p.has('ScanPath') ? resolveWin(state, c.p.str('ScanPath')!) : '/';
    const excluded = win.defender.exclusionPaths.map((p) => p.toLowerCase().replace(/\\+$/, ''));
    for (const { path, node } of walk(state.root, root)) {
      if (node.type !== 'file') continue;
      const wp = winPath(path).toLowerCase();
      if (excluded.some((e) => wp === e || wp.startsWith(e + '\\'))) continue;
      const sig = win.defender.signatures.find((s) => s.file.toLowerCase() === basename(path).toLowerCase());
      if (!sig) continue;
      const parent = getNode(state.root, path.slice(0, path.lastIndexOf('/')) || '/') as FsDir;
      delete parent.children[basename(path)];
      win.defender.threats.push({ name: sig.threat, time: win.now + state.history.length * 1000, path: winPath(path), action: 'Quarantined' });
    }
    return [];
  },
};

const getExecutionPolicy: Cmdlet = { name: 'Get-ExecutionPolicy', params: [{ name: 'List', switch: true }], run: () => 'RemoteSigned' };

export const SECURITY: Cmdlet[] = [getWinEvent, getMpStatus, getMpPref, setMpPref, addMpPref, removeMpPref, getMpThreat, getMpDetection, startMpScan, getExecutionPolicy];
