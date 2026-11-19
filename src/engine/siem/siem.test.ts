import { describe, expect, it } from 'vitest';
import { column, createSiem, resultText, runSiem, type SiemEvent } from './index';

const T0 = Date.UTC(2026, 10, 16, 4, 0, 0) / 1000;

function ev(index: string, sec: number, raw: string, fields: Record<string, string | number>): SiemEvent {
  return { _time: T0 + sec, _raw: raw, index, sourcetype: index === 'web' ? 'access_combined' : 'linux_secure', host: 'srv01', source: '/var/log/x', ...fields };
}

const web = [
  ev('web', 10, '10.0.0.5 - - "GET / HTTP/1.1" 200 512 "Mozilla"', { clientip: '10.0.0.5', method: 'GET', uri_path: '/', status: 200, bytes: 512 }),
  ev('web', 20, '203.0.113.7 - - "POST /login HTTP/1.1" 401 64 "python-requests"', { clientip: '203.0.113.7', method: 'POST', uri_path: '/login', status: 401, bytes: 64 }),
  ev('web', 30, '203.0.113.7 - - "POST /login HTTP/1.1" 401 64 "python-requests"', { clientip: '203.0.113.7', method: 'POST', uri_path: '/login', status: 401, bytes: 64 }),
  ev('web', 40, '203.0.113.7 - - "POST /login HTTP/1.1" 302 0 "python-requests"', { clientip: '203.0.113.7', method: 'POST', uri_path: '/login', status: 302, bytes: 0 }),
  ev('web', 3700, '10.0.0.9 - - "GET /notes HTTP/1.1" 200 2048 "Mozilla"', { clientip: '10.0.0.9', method: 'GET', uri_path: '/notes', status: 200, bytes: 2048 }),
];
const linux = [
  ev('linux', 15, 'sshd[811]: Failed password for root from 198.51.100.9 port 4242 ssh2', { action: 'failure', user: 'root', src_ip: '198.51.100.9' }),
  ev('linux', 25, 'sshd[811]: Accepted password for deploy from 10.0.0.5 port 5100 ssh2', { action: 'success', user: 'deploy', src_ip: '10.0.0.5' }),
  ev('linux', 35, 'powershell.exe launched by WINWORD.EXE', { process: 'powershell.exe' }),
];

const state = createSiem({
  now: '2026-11-16T06:00:00Z',
  indexes: { web, linux },
  lookups: { bad_ips: [{ ip: '203.0.113.7', threat: 'bruteforce' }] },
  tables: {
    SigninLogs: [
      { TimeGenerated: T0 + 10, UserPrincipalName: 'Aziz@example.com', IPAddress: '203.0.113.7', ResultType: '50126', AppDisplayName: 'Azure Portal' },
      { TimeGenerated: T0 + 20, UserPrincipalName: 'aziz@example.com', IPAddress: '203.0.113.7', ResultType: '50126', AppDisplayName: 'Azure Portal' },
      { TimeGenerated: T0 + 3700, UserPrincipalName: 'dilnoza@example.com', IPAddress: '10.0.0.9', ResultType: '0', AppDisplayName: 'Office 365 Exchange Online' },
    ],
    DeviceNetworkEvents: [
      { Timestamp: T0 + 60, DeviceName: 'ws-bux-014', RemoteIP: '203.0.113.45', RemotePort: 443 },
      { Timestamp: T0 + 120, DeviceName: 'ws-bux-014', RemoteIP: '203.0.113.45', RemotePort: 443 },
    ],
    DeviceInfo: [{ Timestamp: T0, DeviceName: 'ws-bux-014', OSPlatform: 'Windows11' }],
  },
});

const spl = (q: string) => runSiem(state, 'spl', q);
const kql = (q: string) => runSiem(state, 'kql', q);

describe('SPL search', () => {
  it('returns events newest first and filters by index and field', () => {
    const r = spl('index=web status=401');
    expect(r.mode).toBe('events');
    expect(r.rows).toHaveLength(2);
    expect(r.rows[0]!._time).toBeGreaterThan(r.rows[1]!._time as number);
  });

  it('matches whole terms, not substrings', () => {
    expect(spl('index=linux powershell').rows).toHaveLength(1);
    expect(spl('index=linux power').rows).toHaveLength(0);
    expect(spl('index=linux power*').rows).toHaveLength(1);
  });

  it('OR binds tighter than the implicit AND; NOT and != differ on missing fields', () => {
    expect(spl('index=linux user=root OR user=deploy').rows).toHaveLength(2);
    expect(spl('index=linux user!=root').rows).toHaveLength(1);
    expect(spl('index=linux NOT user=root').rows).toHaveLength(2);
  });

  it('values are case-insensitive in search, wildcards and IN work', () => {
    expect(spl('index=web METHOD=post').rows).toHaveLength(0); // field names are case-sensitive
    expect(spl('index=web method=post').rows).toHaveLength(3);
    expect(spl('index=web uri_path=/no*').rows).toHaveLength(1);
    expect(spl('index=web status IN (401, 302)').rows).toHaveLength(3);
    expect(spl('index=web status>=300').rows).toHaveLength(3);
  });

  it('honours earliest and latest', () => {
    expect(spl('index=web earliest="11/16/2026:05:00:00"').rows).toHaveLength(1);
    expect(spl('index=web earliest=-2h latest=-1h').rows).toHaveLength(4);
  });
});

describe('SPL commands', () => {
  it('stats count by sorts groups by key', () => {
    const r = spl('index=web | stats count by clientip');
    expect(r.mode).toBe('table');
    expect(resultText(r)).toBe('clientip\tcount\n10.0.0.5\t1\n10.0.0.9\t1\n203.0.113.7\t3');
  });

  it('stats with several aggregations and as', () => {
    const r = spl('index=web | stats count as hits, dc(uri_path) as paths, sum(bytes) as total, values(status) by clientip | sort - hits | head 1');
    expect(r.columns).toEqual(['clientip', 'hits', 'paths', 'total', 'values(status)']);
    expect(resultText(r).split('\n')[1]).toBe('203.0.113.7\t3\t1\t128\t302, 401');
  });

  it('where is case-sensitive and treats bare words as fields', () => {
    expect(spl('index=web | where method="POST"').rows).toHaveLength(3);
    expect(spl('index=web | where method="post"').rows).toHaveLength(0);
    expect(spl('index=web | where status>=400 AND clientip="203.0.113.7"').rows).toHaveLength(2);
    expect(spl('index=web | where like(uri_path, "/log%")').rows).toHaveLength(3);
  });

  it('eval with if, case, functions and string concatenation', () => {
    const r = spl('index=web | eval kind=if(status>=400, "fail", "ok"), label=method." ".uri_path, kb=round(bytes/1024, 1) | table clientip kind label kb | head 1');
    expect(resultText(r)).toBe('clientip\tkind\tlabel\tkb\n10.0.0.9\tok\tGET /notes\t2');
    expect(spl('index=web | eval x=status>400').error).toMatch(/boolean/);
  });

  it('top, rare, dedup, rename, fields, reverse, tail', () => {
    expect(resultText(spl('index=web | top limit=1 clientip'))).toBe('clientip\tcount\tpercent\n203.0.113.7\t3\t60');
    expect(column(spl('index=web | rare clientip'), 'clientip')[0]).toBe('10.0.0.5');
    expect(spl('index=web | dedup clientip').rows).toHaveLength(3);
    expect(spl('index=web | stats count by clientip | rename clientip as "Manba IP"').columns).toEqual(['Manba IP', 'count']);
    expect(spl('index=web | head 2 | reverse').rows[0]!._time).toBe(T0 + 40);
    expect(spl('index=web | tail 1').rows[0]!._time).toBe(T0 + 10);
  });

  it('timechart fills empty buckets and builds a chart', () => {
    const r = spl('index=web | timechart span=30m count');
    expect(r.chart).toEqual({ x: '_time', series: ['count'] });
    expect(column(r, 'count')).toEqual(['4', '0', '1']);
    expect(column(r, '_time')[0]).toBe('2026-11-16 04:00:00');
    const by = spl('index=web | timechart span=1h count by method');
    expect(by.columns).toEqual(['_time', 'GET', 'POST']);
  });

  it('bin, rex, lookup, inputlookup, makeresults, fillnull, eventstats', () => {
    expect(column(spl('index=web | bin _time span=1h | stats count by _time'), 'count')).toEqual(['4', '1']);
    expect(column(spl('index=linux sshd | rex "for (?<who>\\w+) from (?<ip>[\\d.]+)" | table who ip'), 'who')).toEqual(['deploy', 'root']);
    expect(spl('index=linux | rex "nothing"').error).toMatch(/named group/);
    const lk = spl('index=web | lookup bad_ips ip AS clientip OUTPUT threat | where isnotnull(threat) | stats count by threat');
    expect(resultText(lk)).toBe('threat\tcount\nbruteforce\t3');
    expect(spl('| inputlookup bad_ips').rows).toHaveLength(1);
    expect(resultText(spl('| makeresults | eval t=strftime(_time, "%H:%M") | table t'))).toBe('t\n06:00');
    expect(spl('index=web | stats count by clientip | eval x=null() | fillnull value=- x').rows[0]!.x).toBe('-');
    expect(spl('index=web | eventstats count as n by clientip | where n>2').rows).toHaveLength(3);
  });

  it('reports errors the way Splunk words them', () => {
    expect(spl('index=web | statz count').error).toBe("Unknown search command 'statz'.");
    expect(spl('index=web | stats').error).toMatch(/aggregation/);
    expect(spl('index=web "unterminated').error).toBe('Unbalanced quotes.');
    expect(spl('index=web | eval x=foo(1)').error).toMatch(/unsupported or undefined/);
  });
});

describe('Kusto', () => {
  it('where, project, take and case-sensitive ==', () => {
    expect(kql('SigninLogs | where UserPrincipalName == "aziz@example.com"').rows).toHaveLength(1);
    expect(kql('SigninLogs | where UserPrincipalName =~ "aziz@example.com"').rows).toHaveLength(2);
    expect(kql('SigninLogs | project UserPrincipalName, IPAddress | take 1').columns).toEqual(['UserPrincipalName', 'IPAddress']);
  });

  it('has matches terms, contains substrings', () => {
    expect(kql('SigninLogs | where AppDisplayName has "Exchange"').rows).toHaveLength(1);
    expect(kql('SigninLogs | where AppDisplayName has "Exch"').rows).toHaveLength(0);
    expect(kql('SigninLogs | where AppDisplayName contains "Exch"').rows).toHaveLength(1);
  });

  it('summarize names columns like Kusto and bins time', () => {
    const r = kql('SigninLogs | where ResultType != "0" | summarize count(), dcount(UserPrincipalName) by IPAddress');
    expect(r.columns).toEqual(['IPAddress', 'count_', 'dcount_UserPrincipalName']);
    expect(resultText(r)).toBe('IPAddress\tcount_\tdcount_UserPrincipalName\n203.0.113.7\t2\t2');
    const b = kql('SigninLogs | summarize n = count() by bin(TimeGenerated, 1h) | sort by TimeGenerated asc');
    expect(column(b, 'TimeGenerated')).toEqual(['2026-11-16T04:00:00Z', '2026-11-16T05:00:00Z']);
  });

  it('sort by defaults to descending; top, distinct, count, extend, ago', () => {
    expect(column(kql('SigninLogs | sort by TimeGenerated | take 1'), 'IPAddress')).toEqual(['10.0.0.9']);
    expect(column(kql('SigninLogs | top 1 by TimeGenerated asc'), 'IPAddress')).toEqual(['203.0.113.7']);
    expect(kql('SigninLogs | distinct IPAddress').rows).toHaveLength(2);
    expect(resultText(kql('SigninLogs | count'))).toBe('Count\n3');
    expect(kql('SigninLogs | where TimeGenerated > ago(1h)').rows).toHaveLength(1);
    expect(column(kql('SigninLogs | extend Hour = hourofday(TimeGenerated) | distinct Hour | sort by Hour asc'), 'Hour')).toEqual(['4', '5']);
  });

  it('arg_max, make_set, join and render', () => {
    const am = kql('SigninLogs | summarize arg_max(TimeGenerated, *) by IPAddress | where IPAddress == "203.0.113.7"');
    expect(column(am, 'UserPrincipalName')).toEqual(['aziz@example.com']);
    expect(kql('SigninLogs | summarize make_set(IPAddress)').rows[0]!.set_IPAddress).toEqual(['203.0.113.7', '10.0.0.9']);
    const j = kql('DeviceNetworkEvents | where RemoteIP == "203.0.113.45" | distinct DeviceName | join kind=inner (DeviceInfo | project DeviceName, OSPlatform) on DeviceName');
    expect(j.columns).toEqual(['DeviceName', 'DeviceName1', 'OSPlatform']);
    expect(kql('DeviceNetworkEvents | summarize count() by bin(Timestamp, 1m) | render timechart').chart).toEqual({ x: 'Timestamp', series: ['count_'] });
  });

  it('reports unknown tables and columns', () => {
    expect(kql('SecurityEvents | take 1').error).toBe("Failed to resolve table or column expression named 'SecurityEvents'.");
    expect(kql('SigninLogs | where Usr == "x"').error).toBe("Failed to resolve scalar expression named 'Usr'.");
    expect(kql('SigninLogs | frobnicate').error).toMatch(/not a recognized query operator/);
  });
});
