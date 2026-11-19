import { PsError, wild, type Cmdlet, type CmdletCtx } from '../types';
import { obj, toStr, type PsObj, type PsVal } from '../values';
import type { WinFwRule, WinState } from '../state';

const connObj = (c: WinState['connections'][number]): PsObj =>
  obj('Microsoft.Management.Infrastructure.CimInstance#ROOT/StandardCimv2/MSFT_NetTCPConnection', {
    LocalAddress: c.localAddress,
    LocalPort: c.localPort,
    RemoteAddress: c.remoteAddress,
    RemotePort: c.remotePort,
    State: c.state,
    AppliedSetting: c.state === 'Listen' ? null : 'Internet',
    OwningProcess: c.pid,
  }, { view: ['LocalAddress', 'LocalPort', 'RemoteAddress', 'RemotePort', 'State', 'AppliedSetting', 'OwningProcess'] });

const getTcp: Cmdlet = {
  name: 'Get-NetTCPConnection',
  params: [{ name: 'LocalAddress' }, { name: 'LocalPort', pos: 1 }, { name: 'RemoteAddress' }, { name: 'RemotePort' }, { name: 'State' }, { name: 'OwningProcess' }],
  run: (c) => {
    let list = [...c.s.win.connections].sort((a, b) => a.localAddress.localeCompare(b.localAddress) || a.localPort - b.localPort);
    const states = c.p.strs('State')?.map((s) => s.toLowerCase());
    if (states) {
      const valid = ['listen', 'established', 'timewait', 'closewait', 'synsent', 'bound', 'closed'];
      for (const s of states) if (!valid.includes(s)) throw new PsError(`Cannot process argument transformation on parameter 'State'. Cannot convert value "${s}" to type "TcpState". Possible values: Listen, Established, TimeWait, CloseWait, SynSent, Bound.`);
      list = list.filter((x) => states.includes(x.state.toLowerCase()));
    }
    const num = (n: string) => c.p.strs(n)?.map(Number);
    const lp = num('LocalPort');
    if (lp) list = list.filter((x) => lp.includes(x.localPort));
    const rp = num('RemotePort');
    if (rp) list = list.filter((x) => rp.includes(x.remotePort));
    const op = num('OwningProcess');
    if (op) list = list.filter((x) => op.includes(x.pid));
    const ra = c.p.strs('RemoteAddress');
    if (ra) list = list.filter((x) => ra.some((r) => wild(r).test(x.remoteAddress)));
    const la = c.p.strs('LocalAddress');
    if (la) list = list.filter((x) => la.some((r) => wild(r).test(x.localAddress)));
    if (!list.length) c.error('No matching MSFT_NetTCPConnection objects found by CIM query for instances of the ROOT/StandardCimv2/MSFT_NetTCPConnection class on the  CIM server.');
    return list.map(connObj);
  },
};

const getIp: Cmdlet = {
  name: 'Get-NetIPAddress',
  params: [{ name: 'AddressFamily' }, { name: 'InterfaceAlias' }],
  run: (c) => {
    const fam = c.p.str('AddressFamily')?.toLowerCase();
    const rows: PsVal[] = [];
    const add = (ip: string, alias: string, family: string, prefix: number) =>
      rows.push(obj('Microsoft.Management.Infrastructure.CimInstance#ROOT/StandardCimv2/MSFT_NetIPAddress', { IPAddress: ip, InterfaceIndex: alias === 'Ethernet0' ? 6 : 1, InterfaceAlias: alias, AddressFamily: family, Type: 'Unicast', PrefixLength: prefix, PrefixOrigin: alias === 'Ethernet0' ? 'Manual' : 'WellKnown' }, { list: true }));
    if (fam !== 'ipv4') add('fe80::4c1a:9b2e:71d3:a5c2%6', 'Ethernet0', 'IPv6', 64);
    if (fam !== 'ipv6') {
      add(c.s.win.ip, 'Ethernet0', 'IPv4', 24);
      add('127.0.0.1', 'Loopback Pseudo-Interface 1', 'IPv4', 8);
    }
    return rows;
  },
};

const ipconfig: Cmdlet = {
  name: 'ipconfig.exe',
  native: true,
  params: [],
  run: (c) => {
    const w = c.s.win;
    const gw = w.ip.replace(/\.\d+$/, '.1');
    const arg = (c.p.rest[0] ?? '').toLowerCase();
    if (arg === '/displaydns') {
      return ['', 'Windows IP Configuration', '', ...w.dnsCache.flatMap((d) => [`    ${d.entry}`, '    ----------------------------------------', `    Record Name . . . . . : ${d.entry}`, `    Record Type . . . . . : ${d.type === 'A' ? 1 : 5}`, `    Time To Live  . . . . : ${d.ttl}`, `    A (Host) Record . . . : ${d.data}`, ''])].join('\n');
    }
    if (arg === '/flushdns') {
      w.dnsCache = [];
      return '\nWindows IP Configuration\n\nSuccessfully flushed the DNS Resolver Cache.';
    }
    const lines = ['', 'Windows IP Configuration', ''];
    if (arg === '/all') lines.push(`   Host Name . . . . . . . . . . . . : ${w.computer}`, `   Primary Dns Suffix  . . . . . . . : ${w.domain === 'WORKGROUP' ? '' : w.domain}`, '');
    lines.push('Ethernet adapter Ethernet0:', '', '   Connection-specific DNS Suffix  . : lab', '   Link-local IPv6 Address . . . . . : fe80::4c1a:9b2e:71d3:a5c2%6', `   IPv4 Address. . . . . . . . . . . : ${w.ip}`, '   Subnet Mask . . . . . . . . . . . : 255.255.255.0', `   Default Gateway . . . . . . . . . : ${gw}`);
    if (arg === '/all') lines.push('   Physical Address. . . . . . . . . : 00-50-56-A1-3C-7E', '   DHCP Enabled. . . . . . . . . . . : No', `   DNS Servers . . . . . . . . . . . : ${gw}`);
    return lines.join('\n');
  },
};

const netstat: Cmdlet = {
  name: 'netstat.exe',
  native: true,
  params: [],
  run: (c) => {
    const rows = [...c.s.win.connections].sort((a, b) => a.localPort - b.localPort);
    const showPid = c.p.rest.some((a) => /o/i.test(a));
    const fmt = (st: string) => ({ Listen: 'LISTENING', Established: 'ESTABLISHED', TimeWait: 'TIME_WAIT', CloseWait: 'CLOSE_WAIT', SynSent: 'SYN_SENT' })[st] ?? st.toUpperCase();
    return [
      '',
      'Active Connections',
      '',
      `  Proto  Local Address          Foreign Address        State${showPid ? '           PID' : ''}`,
      ...rows.map((r) => {
        const remote = r.state === 'Listen' ? '0.0.0.0:0' : `${r.remoteAddress}:${r.remotePort}`;
        return `  TCP    ${`${r.localAddress}:${r.localPort}`.padEnd(23)}${remote.padEnd(23)}${fmt(r.state).padEnd(16)}${showPid ? String(r.pid) : ''}`.trimEnd();
      }),
    ].join('\n');
  },
};

function resolve(win: WinState, name: string): string | null {
  if (/^\d+\.\d+\.\d+\.\d+$/.test(name)) return name;
  const key = Object.keys(win.dns).find((k) => k.toLowerCase() === name.toLowerCase());
  return key ? win.dns[key]! : null;
}

const resolveDns: Cmdlet = {
  name: 'Resolve-DnsName',
  params: [{ name: 'Name', pos: 0 }, { name: 'Type', pos: 1 }, { name: 'Server' }],
  run: (c) => {
    const name = c.p.str('Name');
    if (!name) throw new PsError("Missing an argument for parameter 'Name'.");
    const ip = resolve(c.s.win, name);
    if (!ip) throw new PsError(`${name} : DNS name does not exist`);
    return obj('Microsoft.DnsClient.Commands.DnsRecord_A', { Name: name, Type: 'A', TTL: 300, Section: 'Answer', IPAddress: ip }, { view: ['Name', 'Type', 'TTL', 'Section', 'IPAddress'] });
  },
};

const blockedBy = (win: WinState, addr: string, port: number | null, dir: 'Inbound' | 'Outbound') =>
  win.firewall.some(
    (r) =>
      r.enabled &&
      r.action === 'Block' &&
      r.direction === dir &&
      (!r.remoteAddress || r.remoteAddress === 'Any' || r.remoteAddress.split(',').includes(addr)) &&
      (port === null || !r.localPort || r.localPort === 'Any' || r.localPort.split(',').map(Number).includes(port)),
  );

const testNet: Cmdlet = {
  name: 'Test-NetConnection',
  params: [{ name: 'ComputerName', pos: 0 }, { name: 'Port' }, { name: 'InformationLevel' }],
  run: (c) => {
    const host = c.p.str('ComputerName') ?? 'internetbeacon.msedge.net';
    const ip = resolve(c.s.win, host);
    if (!ip) return obj('TestNetConnectionResult', { ComputerName: host, RemoteAddress: null, NameResolutionSucceeded: false, PingSucceeded: false }, { list: true });
    const port = c.p.num('Port');
    const blocked = blockedBy(c.s.win, ip, null, 'Outbound');
    const props: Record<string, PsVal> = { ComputerName: host, RemoteAddress: ip };
    if (port !== undefined) {
      props.RemotePort = port;
      props.InterfaceAlias = 'Ethernet0';
      props.SourceAddress = c.s.win.ip;
      props.TcpTestSucceeded = !blocked && (c.s.win.openPorts[ip] ?? []).includes(port);
    } else {
      props.InterfaceAlias = 'Ethernet0';
      props.SourceAddress = c.s.win.ip;
      props.PingSucceeded = !blocked && ip in c.s.win.openPorts;
      props.PingReplyDetails_RTT = props.PingSucceeded ? '1 ms' : null;
    }
    return obj('TestNetConnectionResult', props, { list: true });
  },
};

const ping: Cmdlet = {
  name: 'ping.exe',
  native: true,
  params: [],
  run: (c) => {
    const host = c.p.rest.find((a) => !a.startsWith('-') && !a.startsWith('/') && !/^\d+$/.test(a));
    if (!host) return 'Usage: ping [-n count] target_name';
    const ip = resolve(c.s.win, host);
    if (!ip) return `Ping request could not find host ${host}. Please check the name and try again.`;
    const ok = !blockedBy(c.s.win, ip, null, 'Outbound') && ip in c.s.win.openPorts;
    const reply = ok ? `Reply from ${ip}: bytes=32 time=1ms TTL=64` : 'Request timed out.';
    return [`\nPinging ${host === ip ? ip : `${host} [${ip}]`} with 32 bytes of data:`, reply, reply, reply, reply, '', `Ping statistics for ${ip}:`, `    Packets: Sent = 4, Received = ${ok ? 4 : 0}, Lost = ${ok ? 0 : 4} (${ok ? 0 : 100}% loss),`].join('\n');
  },
};

const dnsCache: Cmdlet = {
  name: 'Get-DnsClientCache',
  params: [{ name: 'Entry', pos: 0 }],
  run: (c) => {
    const f = c.p.strs('Entry')?.map(wild);
    return c.s.win.dnsCache.filter((d) => !f || f.some((r) => r.test(d.entry))).map((d) => obj('Microsoft.Management.Infrastructure.CimInstance#ROOT/StandardCimv2/MSFT_DNSClientCache', { Entry: d.entry, RecordType: d.type, TimeToLive: d.ttl, Data: d.data }, { view: ['Entry', 'RecordType', 'TimeToLive', 'Data'] }));
  },
};

const clearDns: Cmdlet = {
  name: 'Clear-DnsClientCache',
  params: [],
  run: (c) => {
    c.s.win.dnsCache = [];
    return [];
  },
};

/* ── firewall ── */

const ruleObj = (r: WinFwRule): PsObj =>
  obj('Microsoft.Management.Infrastructure.CimInstance#root/standardcimv2/MSFT_NetFirewallRule', {
    Name: r.name,
    DisplayName: r.displayName,
    Enabled: r.enabled,
    Direction: r.direction,
    Action: r.action,
    Profile: 'Any',
    RemoteAddress: r.remoteAddress ?? 'Any',
    LocalPort: r.localPort ?? 'Any',
    Protocol: r.protocol ?? 'Any',
  }, { list: true, str: r.displayName });

function findRules(c: CmdletCtx): WinFwRule[] {
  let list = c.s.win.firewall;
  const dn = c.p.strs('DisplayName')?.map(wild);
  const nm = c.p.strs('Name')?.map(wild);
  if (dn) list = list.filter((r) => dn.some((x) => x.test(r.displayName)));
  if (nm) list = list.filter((r) => nm.some((x) => x.test(r.name)));
  if ((dn || nm) && !list.length) throw new PsError(`No MSFT_NetFirewallRule objects found with property '${dn ? 'DisplayName' : 'Name'}' equal to '${c.p.str(dn ? 'DisplayName' : 'Name')}'.  Verify the value of the property and retry.`);
  return list;
}

const getFw: Cmdlet = {
  name: 'Get-NetFirewallRule',
  params: [{ name: 'Name', pos: 0 }, { name: 'DisplayName' }, { name: 'Enabled' }, { name: 'Direction' }, { name: 'Action' }],
  run: (c) => {
    let list = findRules(c);
    const en = c.p.str('Enabled')?.toLowerCase();
    if (en) list = list.filter((r) => String(r.enabled).toLowerCase() === en);
    const dir = c.p.str('Direction')?.toLowerCase();
    if (dir) list = list.filter((r) => r.direction.toLowerCase() === dir);
    const act = c.p.str('Action')?.toLowerCase();
    if (act) list = list.filter((r) => r.action.toLowerCase() === act);
    return list.map(ruleObj);
  },
};

const newFw: Cmdlet = {
  name: 'New-NetFirewallRule',
  admin: true,
  params: [{ name: 'DisplayName' }, { name: 'Name' }, { name: 'Direction' }, { name: 'Action' }, { name: 'RemoteAddress' }, { name: 'LocalPort' }, { name: 'Protocol' }, { name: 'Enabled' }, { name: 'Profile' }],
  run: (c) => {
    const displayName = c.p.str('DisplayName');
    if (!displayName) throw new PsError("Missing an argument for parameter 'DisplayName'.");
    const direction = (c.p.str('Direction') ?? 'Inbound').toLowerCase() === 'outbound' ? 'Outbound' : 'Inbound';
    const action = (c.p.str('Action') ?? 'Allow').toLowerCase() === 'block' ? 'Block' : 'Allow';
    const rule: WinFwRule = {
      name: c.p.str('Name') ?? `{${(c.s.win.firewall.length + 1).toString(16).padStart(8, '0')}-4f2a-4c1e-9b7d-2a6c0e1f3b5d}`,
      displayName,
      enabled: (c.p.str('Enabled') ?? 'True').toLowerCase() !== 'false',
      direction,
      action,
      ...(c.p.has('RemoteAddress') ? { remoteAddress: c.p.strs('RemoteAddress')!.join(',') } : {}),
      ...(c.p.has('LocalPort') ? { localPort: c.p.strs('LocalPort')!.join(',') } : {}),
      ...(c.p.has('Protocol') ? { protocol: c.p.str('Protocol')!.toUpperCase() } : {}),
    };
    c.s.win.firewall.push(rule);
    return ruleObj(rule);
  },
};

const removeFw: Cmdlet = {
  name: 'Remove-NetFirewallRule',
  admin: true,
  params: [{ name: 'Name', pos: 0 }, { name: 'DisplayName' }],
  run: (c) => {
    const hit = new Set(findRules(c));
    c.s.win.firewall = c.s.win.firewall.filter((r) => !hit.has(r));
    return [];
  },
};

function fwToggle(name: string, enabled: boolean): Cmdlet {
  return {
    name,
    admin: true,
    params: [{ name: 'Name', pos: 0 }, { name: 'DisplayName' }],
    run: (c) => {
      for (const r of findRules(c)) r.enabled = enabled;
      return [];
    },
  };
}

export const NETWORK: Cmdlet[] = [
  getTcp,
  getIp,
  ipconfig,
  netstat,
  resolveDns,
  testNet,
  ping,
  dnsCache,
  clearDns,
  getFw,
  newFw,
  removeFw,
  fwToggle('Enable-NetFirewallRule', true),
  fwToggle('Disable-NetFirewallRule', false),
];
void toStr;
