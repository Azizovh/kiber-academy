import { describe, expect, it } from 'vitest';
import { complete, createShell, execLine, promptPath, type ShellState } from '../terminal/shell';

const T = (h: number, m: number) => Date.UTC(2026, 10, 17, h, m, 0);

function win(elevated = true): ShellState {
  return createShell({
    user: 'talaba',
    fs: {
      Users: {
        talaba: { Desktop: { 'notes.txt': 'birinchi qator\nikkinchi Failed qator\nuchinchi\n', 'ip.txt': '10.0.0.1\n10.0.0.2\n10.0.0.1\n' }, Documents: {} },
        Public: { 'svcupd.exe': 'MZ fake binary\n' },
      },
      ProgramData: { WinUpd: { 'cfg.json': '{"server":"198.51.100.40","port":443}\n' } },
      Windows: { System32: { 'whoami.exe': 'MZ\n' } },
    },
    windows: {
      computer: 'SRV-FILE-01',
      elevated,
      hidden: ['C:\\ProgramData\\WinUpd'],
      processes: [
        { id: 4, name: 'System', user: 'NT AUTHORITY\\SYSTEM', si: 0, ws: 0.1 },
        { id: 688, name: 'lsass', path: 'C:\\Windows\\System32\\lsass.exe', user: 'NT AUTHORITY\\SYSTEM', si: 0, ws: 22 },
        { id: 4120, name: 'svcupd', path: 'C:\\Users\\Public\\svcupd.exe', commandLine: 'C:\\Users\\Public\\svcupd.exe -k', parentId: 812, cpu: 412.5, ws: 88, user: 'NT AUTHORITY\\SYSTEM', si: 0 },
        { id: 5200, name: 'explorer', path: 'C:\\Windows\\explorer.exe', cpu: 12.3, ws: 110, user: 'SRV-FILE-01\\talaba' },
      ],
      services: [
        { name: 'Spooler', displayName: 'Print Spooler', status: 'Running', startType: 'Automatic', path: 'C:\\Windows\\System32\\spoolsv.exe' },
        { name: 'WinUpdateSvc', displayName: 'Windows Update Helper', status: 'Running', startType: 'Automatic', path: 'C:\\Users\\Public\\svcupd.exe -k', pid: 4120 },
      ],
      tasks: [
        { path: '\\', name: 'OneDriveSync', state: 'Ready', execute: 'powershell.exe', arguments: '-w hidden -enc SQBFAFgA', author: 'SRV-FILE-01\\svc_backup' },
        { path: '\\Microsoft\\Windows\\Defrag\\', name: 'ScheduledDefrag', state: 'Ready', execute: '%windir%\\system32\\defrag.exe' },
      ],
      users: [
        { name: 'Administrator', enabled: false },
        { name: 'talaba', enabled: true },
        { name: 'helpdesk2', enabled: true, description: '', lastLogon: T(2, 19) },
      ],
      groups: [{ name: 'Administrators', members: ['talaba', 'helpdesk2'] }, { name: 'Users', members: ['talaba'] }],
      connections: [
        { localAddress: '0.0.0.0', localPort: 3389, remoteAddress: '0.0.0.0', remotePort: 0, state: 'Listen', pid: 1100 },
        { localAddress: '10.10.20.15', localPort: 50112, remoteAddress: '198.51.100.40', remotePort: 443, state: 'Established', pid: 4120 },
      ],
      registry: {
        'HKLM:\\Software\\Microsoft\\Windows\\CurrentVersion\\Run': { SecurityHealth: 'C:\\Windows\\System32\\SecurityHealthSystray.exe', WinUpd: 'C:\\Users\\Public\\svcupd.exe' },
        'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Run': {},
      },
      events: [
        { log: 'Security', id: 4625, time: T(2, 10), message: 'An account failed to log on.\n\nAccount Name:\t\tadministrator\nSource Network Address:\t198.51.100.40' },
        { log: 'Security', id: 4625, time: T(2, 11), message: 'An account failed to log on.\n\nAccount Name:\t\tsvc_backup\nSource Network Address:\t198.51.100.40' },
        { log: 'Security', id: 4624, time: T(2, 14), message: 'An account was successfully logged on.\n\nAccount Name:\t\tsvc_backup\nLogon Type:\t\t10' },
        { log: 'System', id: 7045, time: T(2, 21), message: 'A service was installed in the system.\n\nService Name:  WinUpdateSvc\nService File Name:  C:\\Users\\Public\\svcupd.exe -k' },
      ],
      defender: { exclusionPaths: ['C:\\Users\\Public'], signatures: [{ file: 'svcupd.exe', threat: 'Trojan:Win32/Lab.A' }] },
      dns: { 'update-cdn.example': '198.51.100.40' },
      openPorts: { '198.51.100.40': [443] },
    },
  });
}

const run = (s: ShellState, line: string) => execLine(s, line).output;

describe('PowerShell: basics', () => {
  it('shows a Windows prompt and resolves paths case-insensitively', () => {
    const s = win();
    expect(promptPath(s)).toBe('C:\\Users\\talaba');
    run(s, 'cd desktop');
    expect(promptPath(s)).toBe('C:\\Users\\talaba\\Desktop');
    expect(run(s, 'Get-Location')).toContain('C:\\Users\\talaba\\Desktop');
    run(s, 'cd ..\\..\\Public');
    expect(promptPath(s)).toBe('C:\\Users\\Public');
    run(s, 'Set-Location ~');
    expect(promptPath(s)).toBe('C:\\Users\\talaba');
  });

  it('lists directories like PowerShell, hides Hidden items without -Force', () => {
    const s = win();
    const out = run(s, 'Get-ChildItem C:\\ProgramData');
    expect(out).not.toContain('WinUpd');
    const forced = run(s, 'gci C:\\ProgramData -Force');
    expect(forced).toContain('Directory: C:\\ProgramData');
    expect(forced).toMatch(/d--h-\s+11\/16\/2026\s+9:00 AM\s+WinUpd/);
    expect(run(s, 'ls Desktop -Name')).toBe('ip.txt\nnotes.txt');
    expect(run(s, 'Get-ChildItem C:\\ -Recurse -Force -Filter *.json -Name')).toContain('cfg.json');
  });

  it('reports unknown commands and parameters with real error text', () => {
    const s = win();
    expect(run(s, 'Get-Proces')).toContain("The term 'Get-Proces' is not recognized");
    expect(run(s, 'Get-Process -Foo')).toContain("A parameter cannot be found that matches parameter name 'Foo'.");
    expect(run(s, 'Get-Content nope.txt')).toContain("Get-Content: Cannot find path 'C:\\Users\\talaba\\nope.txt' because it does not exist.");
  });
});

describe('PowerShell: the object pipeline', () => {
  it('filters, sorts, selects and counts objects', () => {
    const s = win();
    const top = run(s, 'Get-Process | Sort-Object CPU -Descending | Select-Object -First 1 Name, Id, CPU');
    expect(top).toMatch(/Name\s+Id\s+CPU/);
    expect(top).toMatch(/svcupd\s+4120\s+412\.5/);
    expect(run(s, 'Get-Service | Where-Object { $_.Status -eq "Running" } | Measure-Object | Select-Object -ExpandProperty Count')).toBe('2');
    expect(run(s, 'Get-Service | ? Status -eq Running | % Name')).toBe('Spooler\nWinUpdateSvc');
    expect(run(s, '(Get-Process).Count')).toBe('4');
    expect(run(s, 'Get-Process | Where-Object { $_.Path -like "C:\\Users\\*" } | Select-Object -ExpandProperty Path')).toBe('C:\\Users\\Public\\svcupd.exe');
    expect(run(s, 'Get-Content Desktop\\ip.txt | Group-Object -NoElement | Sort-Object Count -Descending')).toMatch(/Count Name\n-----\s?----\n\s+2 10\.0\.0\.1\n\s+1 10\.0\.0\.2/);
    expect(run(s, 'Get-Content Desktop\\ip.txt | Sort-Object -Unique')).toBe('10.0.0.1\n10.0.0.2');
  });

  it('formats tables, lists, calculated properties and variables', () => {
    const s = win();
    expect(run(s, 'Get-Service Spooler | Format-List Name, Status, BinaryPathName')).toBe('Name           : Spooler\nStatus         : Running\nBinaryPathName : C:\\Windows\\System32\\spoolsv.exe');
    expect(run(s, "Get-Process -Id 4120 | Select-Object Name, @{Name='MB'; Expression={ $_.WorkingSet64 / 1MB }}")).toMatch(/svcupd\s+88/);
    run(s, '$p = Get-Process -Name svcupd');
    expect(run(s, '$p.Path')).toBe('C:\\Users\\Public\\svcupd.exe');
    expect(run(s, '"PID: $($p.Id)"')).toBe('PID: 4120');
    expect(run(s, '$env:COMPUTERNAME')).toBe('SRV-FILE-01');
    expect(run(s, "'a,b,c' -split ','")).toBe('a\nb\nc');
    expect(run(s, '5 -gt 3 -and "Abc" -like "a*"')).toBe('True');
  });

  it('runs member methods and static calls (Base64 decoding of an encoded command)', () => {
    const s = win();
    const b64 = Buffer.from('Get-Date', 'utf16le').toString('base64');
    expect(run(s, `[System.Text.Encoding]::Unicode.GetString([Convert]::FromBase64String('${b64}'))`)).toBe('Get-Date');
    expect(run(s, "'Salom'.ToUpper()")).toBe('SALOM');
  });

  it('writes files with Out-File, > and Export-Csv, and reads them back', () => {
    const s = win();
    run(s, 'mkdir C:\\IR');
    run(s, 'Get-Service | Select-Object Name, Status | Export-Csv C:\\IR\\s.csv');
    expect(run(s, 'Get-Content C:\\IR\\s.csv -TotalCount 2')).toBe('"Name","Status"\n"Spooler","Running"');
    expect(run(s, "Import-Csv C:\\IR\\s.csv | Where-Object Name -eq 'WinUpdateSvc' | Select-Object -ExpandProperty Status")).toBe('Running');
    run(s, 'Get-Process -Id 4120 > C:\\IR\\p.txt');
    expect(run(s, 'Get-Content C:\\IR\\p.txt')).toContain('svcupd');
    run(s, "Add-Content C:\\IR\\t.txt -Value '02:14 kirish'");
    expect(run(s, 'Get-Content C:\\IR\\t.txt')).toBe('02:14 kirish');
  });

  it('searches text with Select-String and hashes files', () => {
    const s = win();
    expect(run(s, 'Select-String Failed -Path Desktop\\notes.txt')).toBe('Desktop\\notes.txt:2:ikkinchi Failed qator');
    expect(run(s, 'Get-Content Desktop\\notes.txt | Select-String -NotMatch qator')).toBe('uchinchi');
    expect(run(s, 'Get-FileHash C:\\Users\\Public\\svcupd.exe')).toMatch(/SHA256\s+[0-9A-F]{64}\s+C:\\Users\\Public\\svcupd\.exe/);
  });
});

describe('PowerShell: incident response cmdlets', () => {
  it('finds the process behind a connection and stops it', () => {
    const s = win();
    expect(run(s, 'Get-NetTCPConnection -State Established')).toMatch(/198\.51\.100\.40\s+443 Established Internet\s+4120/);
    expect(run(s, 'Get-Process -Id (Get-NetTCPConnection -RemoteAddress 198.51.100.40).OwningProcess | Select-Object -ExpandProperty Path')).toBe('C:\\Users\\Public\\svcupd.exe');
    expect(run(s, 'Get-CimInstance Win32_Process -Filter "ProcessId=4120" | Select-Object -ExpandProperty CommandLine')).toBe('C:\\Users\\Public\\svcupd.exe -k');
    expect(run(s, 'Stop-Process -Name lsass')).toContain('Access is denied');
    run(s, 'Stop-Process -Id 4120 -Force');
    expect(s.win!.processes.some((p) => p.id === 4120)).toBe(false);
    expect(s.win!.connections.some((c) => c.pid === 4120)).toBe(false);
  });

  it('removes persistence: service, scheduled task, Run key, Defender exclusion', () => {
    const s = win();
    expect(run(s, 'Get-ScheduledTask | Where-Object TaskPath -eq "\\"')).toMatch(/\\\s+OneDriveSync\s+Ready/);
    expect(run(s, '(Get-ScheduledTask -TaskName OneDriveSync).Actions | Select-Object -ExpandProperty Arguments')).toBe('-w hidden -enc SQBFAFgA');
    run(s, 'Unregister-ScheduledTask -TaskName OneDriveSync -Confirm:$false');
    expect(s.win!.tasks.map((t) => t.name)).toEqual(['ScheduledDefrag']);
    expect(run(s, 'Get-ItemProperty HKLM:\\Software\\Microsoft\\Windows\\CurrentVersion\\Run')).toContain('WinUpd         : C:\\Users\\Public\\svcupd.exe');
    run(s, 'Remove-ItemProperty HKLM:\\Software\\Microsoft\\Windows\\CurrentVersion\\Run -Name WinUpd');
    expect(run(s, 'Get-CimInstance Win32_StartupCommand | Select-Object -ExpandProperty Caption')).toBe('SecurityHealth');
    run(s, 'Stop-Service WinUpdateSvc');
    run(s, 'Set-Service WinUpdateSvc -StartupType Disabled');
    expect(run(s, 'Get-Service WinUpdateSvc | Select-Object Status, StartType')).toMatch(/Stopped\s+Disabled/);
    expect(run(s, 'Get-MpPreference | Select-Object -ExpandProperty ExclusionPath')).toBe('C:\\Users\\Public');
    run(s, 'Start-MpScan -ScanType QuickScan');
    expect(run(s, 'Get-MpThreat')).toBe('');
    run(s, "Remove-MpPreference -ExclusionPath 'C:\\Users\\Public'");
    run(s, 'Start-MpScan -ScanType QuickScan');
    expect(run(s, 'Get-MpThreat | Select-Object -ExpandProperty ThreatName')).toBe('Trojan:Win32/Lab.A');
    expect(run(s, 'Test-Path C:\\Users\\Public\\svcupd.exe')).toBe('False');
  });

  it('reads event logs with -FilterHashtable and searches messages', () => {
    const s = win();
    expect(run(s, "Get-WinEvent -FilterHashtable @{LogName='Security'; Id=4625} | Measure-Object | Select-Object -ExpandProperty Count")).toBe('2');
    const table = run(s, 'Get-WinEvent -LogName Security -MaxEvents 1');
    expect(table).toContain('ProviderName: Microsoft-Windows-Security-Auditing');
    expect(table).toMatch(/11\/17\/2026 2:14:00 AM\s+4624 Information\s+An account was successfully logged on\./);
    expect(run(s, "Get-WinEvent -LogName Security | Where-Object { $_.Message -match 'svc_backup' } | Measure-Object | % Count")).toBe('2');
    expect(run(s, "Get-WinEvent -FilterHashtable @{LogName='System'; Id=7045} | Format-List Id, Message")).toContain('Service Name:  WinUpdateSvc');
    expect(run(s, "Get-WinEvent -LogName Security | Group-Object Id -NoElement | Sort-Object Count -Descending | Select-Object -First 1 -ExpandProperty Name")).toBe('4625');
  });

  it('manages local users, groups and firewall rules', () => {
    const s = win();
    expect(run(s, 'Get-LocalGroupMember Administrators')).toContain('SRV-FILE-01\\helpdesk2');
    run(s, 'Remove-LocalGroupMember -Group Administrators -Member helpdesk2');
    run(s, 'Disable-LocalUser -Name helpdesk2');
    expect(run(s, 'Get-LocalUser helpdesk2 | Select-Object -ExpandProperty Enabled')).toBe('False');
    run(s, "New-NetFirewallRule -DisplayName 'Block C2' -Direction Outbound -Action Block -RemoteAddress 198.51.100.40");
    expect(run(s, "Test-NetConnection update-cdn.example -Port 443 | Select-Object -ExpandProperty TcpTestSucceeded")).toBe('False');
    expect(run(s, "Get-NetFirewallRule -DisplayName 'Block C2'")).toContain('Action        : Block');
  });

  it('needs an elevated session for admin cmdlets', () => {
    const s = win(false);
    expect(run(s, 'Stop-Service Spooler')).toContain('Access is denied');
    expect(run(s, 'whoami /groups')).toContain('Medium Mandatory Level');
    expect(run(s, 'whoami')).toBe('srv-file-01\\talaba');
  });

  it('completes cmdlet names, parameters and paths', () => {
    const s = win();
    expect(complete(s, 'Get-Proc').line).toBe('Get-Process ');
    expect(complete(s, 'Get-Process -Inc').line).toBe('Get-Process -IncludeUserName ');
    expect(complete(s, 'cd desk').line).toBe('cd Desktop\\');
    expect(run(s, 'Get-Help Get-Process')).toContain('-IncludeUserName');
  });
});
