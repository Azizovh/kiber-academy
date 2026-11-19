import { describe, expect, it } from 'vitest';
import { createShell, execLine, type ShellInit } from './shell';
import { Capture, httpGet, httpPost, httpResponse, at } from './pcapBuild';

function sh(init: Partial<ShellInit> = {}) {
  const state = createShell({ fs: { home: { talaba: {} }, tmp: {}, ...(init.fs ?? {}) }, ...init });
  return (line: string) => execLine(state, line);
}

const WORD_RULE = `title: Word spawns PowerShell
id: 8f1e7c2a-3b4d-4e5f-9a6b-7c8d9e0f1a2b
status: test
description: Office application starting a shell
date: 2026/11/16
level: high
tags:
  - attack.execution
  - attack.t1059.001
logsource:
  product: windows
  category: process_creation
detection:
  selection:
    ParentImage|endswith: '\\WINWORD.EXE'
    Image|endswith:
      - '\\powershell.exe'
      - '\\cmd.exe'
  filter:
    CommandLine|contains: 'inventory.ps1'
  condition: selection and not filter
`;

describe('sigma', () => {
  const run = sh({ fs: { home: { talaba: { rules: { 'word.yml': WORD_RULE, 'bad.yml': WORD_RULE.replace('|endswith:', '|endwith:').replace(/^id:.*\n/m, ''), 'cond.yml': WORD_RULE.replace('selection and not filter', 'selection and not filtr'), 'noid.yml': WORD_RULE.replace(/^id:.*\n/m, '') } } } } });

  it('converts to Splunk with the sysmon pipeline', () => {
    expect(run('sigma convert -t splunk -p sysmon rules/word.yml').output).toBe('EventID=1 ParentImage="*\\\\WINWORD.EXE" Image IN ("*\\\\powershell.exe", "*\\\\cmd.exe") NOT CommandLine="*inventory.ps1*"');
  });

  it('converts to Defender KQL', () => {
    expect(run('sigma convert -t kusto -p microsoft_xdr rules/word.yml').output).toBe(
      'DeviceProcessEvents\n| where InitiatingProcessFolderPath endswith "\\\\WINWORD.EXE" and (FolderPath endswith "\\\\powershell.exe" or FolderPath endswith "\\\\cmd.exe") and not(ProcessCommandLine contains "inventory.ps1")',
    );
  });

  it('requires a pipeline and reports errors and issues', () => {
    expect(run('sigma convert -t splunk rules/word.yml').output).toMatch(/Processing pipeline required/);
    const check = run('sigma check rules').output;
    expect(check).toMatch(/Found 1 errors, 1 condition errors and 1 issues/);
    expect(check).toContain('Unknown modifier endwith');
    expect(check).toContain("detection identifier 'filtr' not found");
    expect(check).toContain('Rule has no identifier');
  });
});

function webCapture(): string {
  const c = new Capture();
  c.dns(at(9, 0), '10.10.10.23', '10.10.0.2', 'update-check.example-cdn.net', ['203.0.113.45']);
  c.tcp(at(9, 1), '198.51.100.23', 51000, '203.0.113.20', 80, [{ c: httpGet('qaydnoma.example.com', '/.git/HEAD', 'Mozilla/5.00 (Nikto/2.5.0)'), s: httpResponse(200, 'OK', 'ref: refs/heads/main\n', 'text/plain') }]);
  for (let i = 0; i < 6; i++) c.tcp(at(9, 2, i * 2), '203.0.113.64', 52000 + i, '203.0.113.20', 80, [{ c: httpPost('qaydnoma.example.com', '/login', 'user=x&pass=y', 'python-requests/2.32.3'), s: httpResponse(401, 'Unauthorized', 'no') }]);
  c.tls(at(9, 5), '10.10.10.23', 53000, '203.0.113.45', 'update-check.example-cdn.net');
  c.probe(at(9, 6), '198.51.100.23', 40000, '203.0.113.20', 22, true);
  c.probe(at(9, 6, 1), '198.51.100.23', 40001, '203.0.113.20', 23, false);
  return c.build();
}

describe('suricata', () => {
  const rules = [
    'alert http any any -> $HOME_NET any (msg:"Nikto scanner"; http.user_agent; content:"Nikto"; nocase; classtype:attempted-recon; sid:1000001; rev:1;)',
    'alert http any any -> $HOME_NET any (msg:"Login brute force"; flow:to_server; http.method; content:"POST"; http.uri; content:"/login"; threshold: type threshold, track by_src, count 5, seconds 60; classtype:attempted-user; sid:1000002;)',
    'alert dns $HOME_NET any -> any any (msg:"C2 domain lookup"; dns.query; content:"example-cdn.net"; endswith; sid:1000003;)',
    'alert tls $HOME_NET any -> any any (msg:"C2 SNI"; tls.sni; content:"update-check."; startswith; classtype:command-and-control; sid:1000004;)',
  ].join('\n');
  const run = sh({ fs: { home: { talaba: { 'cap.pcap': webCapture(), 'local.rules': rules, 'bad.rules': 'alert http any any -> any any (msg:"x"; contnet:"a"; sid:1;)\nalert tcp any any -> any any (msg:"no sid";)\n', out: {} } }, etc: { suricata: { 'suricata.yaml': 'vars:\n  address-groups:\n    HOME_NET: "[10.10.0.0/16,203.0.113.16/29]"\n' } } } });

  it('writes fast.log and eve.json alerts', () => {
    const r = run('suricata -r cap.pcap -S local.rules -l out');
    expect(r.output).toContain('4 rules successfully loaded, 0 rules failed');
    const fast = run('cat out/fast.log').output;
    expect(fast).toContain('[1:1000001:1] Nikto scanner [**] [Classification: Attempted Information Leak] [Priority: 2] {TCP} 198.51.100.23:51000 -> 203.0.113.20:80');
    expect(fast.split('\n').filter((l) => l.includes('Login brute force'))).toHaveLength(1);
    expect(fast).toContain('C2 domain lookup');
    expect(fast).toContain('C2 SNI');
    expect(run("jq -r '.alert.signature_id' out/eve.json | sort -u | wc -l").output.trim()).toBe('4');
  });

  it('reports rule errors in Suricata wording', () => {
    const r = run('suricata -r cap.pcap -S bad.rules -l out');
    expect(r.output).toContain("E: detect-parse: unknown rule keyword 'contnet'.");
    expect(r.output).toContain('E: detect-parse: Signature missing required value "sid".');
    expect(r.output).toContain('0 rules successfully loaded, 2 rules failed');
    expect(run('suricata -r cap.pcap -S local.rules -l nowhere').output).toMatch(/logging directory "nowhere".*doesn't exist/);
  });
});

describe('zeek', () => {
  const run = sh({ fs: { home: { talaba: { 'cap.pcap': webCapture() } } } });
  it('writes logs that zeek-cut reads', () => {
    expect(run('zeek -r cap.pcap').output).toBe('');
    expect(run('ls').output.split(/\s+/)).toEqual(expect.arrayContaining(['conn.log', 'dns.log', 'http.log', 'ssl.log']));
    expect(run('cat dns.log | zeek-cut query answers').output).toBe('update-check.example-cdn.net\t203.0.113.45');
    expect(run('cat ssl.log | zeek-cut server_name').output).toBe('update-check.example-cdn.net');
    expect(run('cat http.log | zeek-cut method uri status_code | head -n 2').output).toBe('GET\t/.git/HEAD\t200\nPOST\t/login\t401');
    const states = run('cat conn.log | zeek-cut id.resp_p conn_state | sort -u').output;
    expect(states).toContain('22\tRSTO');
    expect(states).toContain('23\tREJ');
    expect(states).toContain('80\tSF');
    expect(run('cat conn.log | zeek-cut -d ts | head -n 1').output).toBe('2026-11-17T09:00:00+0000');
  });
});

describe('yara', () => {
  const mz = 'MZ\x90\x00\x03\x00\x00\x00' + 'This program cannot be run in DOS mode.' + 'u\x00p\x00d\x00a\x00t\x00e\x00-\x00c\x00h\x00e\x00c\x00k\x00' + 'Software\\Microsoft\\Windows\\CurrentVersion\\Run';
  const rule = `rule Updater_Implant : implant
{
    meta:
        author = "SOC"
        description = "WS-BUX-014 payload"
    strings:
        $mz = { 4D 5A }
        $w = "update-check" wide
        $run = "CurrentVersion\\\\Run" nocase
    condition:
        $mz at 0 and $w and $run and filesize < 1MB
}
`;
  const run = sh({ fs: { home: { talaba: { 'r.yar': rule, 'bad.yar': rule.replace('$w and ', ''), 'imp.yar': 'import "pe"\nrule x { condition: true }', share: { 'svchost.exe': mz, 'notes.txt': 'update-check is a word here', sub: { 'copy.bin': mz } } } } } });

  it('matches, prints strings and meta, recurses', () => {
    expect(run('yara r.yar share').output).toBe('Updater_Implant share/svchost.exe');
    expect(run('yara -r r.yar share').output).toBe('Updater_Implant share/sub/copy.bin\nUpdater_Implant share/svchost.exe');
    expect(run('yara -s r.yar share/svchost.exe').output).toBe('Updater_Implant share/svchost.exe\n0x0:$mz: 4D 5A\n0x2f:$w: u\\x00p\\x00d\\x00a\\x00t\\x00e\\x00-\\x00c\\x00h\\x00e\\x00c\\x00k\\x00\n0x62:$run: CurrentVersion\\Run');
    expect(run('yara -m r.yar share/svchost.exe').output).toBe('Updater_Implant [author="SOC",description="WS-BUX-014 payload"] share/svchost.exe');
    expect(run('yara -c -r r.yar share').output).toBe('2');
    expect(run('yara -n r.yar share/notes.txt').output).toBe('Updater_Implant share/notes.txt');
  });

  it('reports YARA errors', () => {
    expect(run('yara bad.yar share').output).toBe('error: rule "Updater_Implant" in bad.yar(8): unreferenced string "$w"');
    expect(run('yara imp.yar share').output).toMatch(/^error: imp.yar\(1\): module "pe" is not available/);
  });
});
