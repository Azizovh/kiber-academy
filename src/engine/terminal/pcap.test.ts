import { describe, expect, it } from 'vitest';
import { createShell, execLine, type ShellState } from './shell';
import { at, Capture, httpGet, httpResponse } from './pcapBuild';

function capture(): string {
  const c = new Capture();
  c.arp(at(9, 0, 0.5), '10.0.0.1', '10.0.0.5', '00:50:56:c0:00:01');
  c.dns(at(9, 0, 1), '10.0.0.5', '10.0.0.1', 'shop.example', ['93.184.216.34']);
  c.tcp(at(9, 0, 1.1), '10.0.0.5', 51544, '93.184.216.34', 80, [{ c: httpGet('shop.example', '/login'), s: httpResponse(200, 'OK', '<h1>Kirish</h1>') }]);
  c.dns(at(9, 0, 3), '10.0.0.5', '10.0.0.1', 'nope.example', 'NXDOMAIN');
  c.tls(at(9, 0, 4), '10.0.0.5', 51600, '142.250.74.110', 'www.google.com');
  c.tcp(at(9, 0, 6), '10.0.0.5', 50021, '10.0.0.20', 21, [{ s: '220 FTP server ready\r\n' }, { c: 'USER anna\r\n', s: '331 Please specify the password.\r\n' }, { c: 'PASS Bahor2026\r\n', s: '230 Login successful.\r\n' }]);
  c.ping(at(9, 0, 8), '10.0.0.5', '8.8.8.8', 2);
  c.probe(at(9, 0, 10), '10.0.0.66', 40000, '10.0.0.20', 22, true);
  c.probe(at(9, 0, 10.1), '10.0.0.66', 40000, '10.0.0.20', 23, false);
  return c.build();
}

function shell(): ShellState {
  return createShell({ fs: { home: { talaba: { 'a.pcap': capture() } }, tmp: {} } });
}

const run = (s: ShellState, l: string) => execLine(s, l).output;

describe('pcap tools', () => {
  it('file and capinfos recognise the capture', () => {
    const s = shell();
    expect(run(s, 'file a.pcap')).toContain('pcap capture file');
    const info = run(s, 'capinfos a.pcap');
    expect(info).toMatch(/Number of packets:\s+\d+/);
    expect(info).toContain('First packet time:   2026-11-17 09:00:00.500000');
  });

  it('tcpdump prints packets, resolves names without -n, filters with BPF', () => {
    const s = shell();
    const all = run(s, 'tcpdump -r a.pcap');
    expect(all.split('\n')[0]).toBe('reading from file a.pcap, link-type EN10MB (Ethernet), snapshot length 262144');
    expect(all).toContain('ARP, Request who-has 10.0.0.1 tell 10.0.0.5, length 28');
    expect(all).toContain('IP 10.0.0.5.51544 > shop.example.http: Flags [S], seq 0, win 64240, length 0');
    expect(run(s, 'tcpdump -nn -r a.pcap port 53')).toMatch(/IP 10\.0\.0\.5\.\d+ > 10\.0\.0\.1\.53: \d+\+ A\? shop\.example\. \(\d+\)/);
    expect(run(s, 'tcpdump -nn -r a.pcap port 53')).toContain('NXDomain');
    expect(run(s, 'tcpdump -n -r a.pcap host 93.184.216.34 and tcp')).toContain('HTTP: GET /login HTTP/1.1');
    expect(run(s, 'tcpdump -nn -A -r a.pcap port 21')).toContain('PASS Bahor2026');
    expect(run(s, "tcpdump -nn -r a.pcap 'tcp[tcpflags] & (tcp-syn|tcp-ack) == tcp-syn'").split('\n').length).toBe(1 + 5);
    expect(run(s, 'tcpdump -nn -r a.pcap icmp | wc -l')).toContain('4');
    expect(run(s, 'tcpdump -r a.pcap host 1.2.3.4 port 80')).toContain('syntax error');
  });

  it('tcpdump -w writes a filtered capture', () => {
    const s = shell();
    run(s, 'tcpdump -r a.pcap -w ftp.pcap port 21');
    expect(run(s, 'capinfos ftp.pcap')).toMatch(/Number of packets:\s+1[0-9]/);
  });

  it('tshark lists frames with protocols and info, filters with display filters', () => {
    const s = shell();
    const all = run(s, 'tshark -r a.pcap');
    expect(all).toMatch(/^\s+1 +0\.000000 +10\.0\.0\.5 → 10\.0\.0\.1 +ARP +42 Who has 10\.0\.0\.1\? Tell 10\.0\.0\.5$/m);
    expect(all).toMatch(/DNS +\d+ Standard query 0x1a20 A shop\.example$/m);
    expect(all).toMatch(/HTTP +\d+ GET \/login HTTP\/1\.1$/m);
    expect(all).toMatch(/TLSv1\.3 +\d+ Client Hello \(SNI=www\.google\.com\)$/m);
    expect(all).toContain('Request: PASS Bahor2026');
    expect(run(s, 'tshark -r a.pcap -Y "http.request" -T fields -e ip.src -e http.host -e http.request.uri')).toBe('10.0.0.5\tshop.example\t/login');
    expect(run(s, 'tshark -r a.pcap -Y "dns.flags.response == 0" -T fields -e dns.qry.name | sort -u')).toBe('nope.example\nshop.example');
    expect(run(s, 'tshark -r a.pcap -Y "dns.flags.rcode == 3" -T fields -e dns.qry.name')).toBe('nope.example');
    expect(run(s, 'tshark -r a.pcap -Y \'ftp.request.command == "PASS"\' -T fields -e ftp.request.arg')).toBe('Bahor2026');
    expect(run(s, 'tshark -r a.pcap -Y "tcp.flags.syn == 1 && tcp.flags.ack == 1 && ip.src == 10.0.0.20" -T fields -e tcp.srcport')).toBe('21\n22');
    expect(run(s, 'tshark -r a.pcap -Y "ip.addr == 10.0.0.0/24 && icmp" -c 1 -T fields -e icmp.type')).toBe('8');
    expect(run(s, 'tshark -r a.pcap -Y "http contains Kirish" -T fields -e http.response.code')).toBe('200');
    expect(run(s, 'tshark -r a.pcap -Y "foo.bar == 1"')).toContain('is not a valid protocol or protocol field');
    expect(run(s, 'tshark -r a.pcap -Y "tls.handshake.type == 1" -T fields -e tls.handshake.extensions_server_name')).toBe('www.google.com');
  });

  it('tshark statistics and stream following', () => {
    const s = shell();
    const conv = run(s, 'tshark -r a.pcap -q -z conv,ip');
    expect(conv).toContain('IPv4 Conversations');
    expect(conv).toMatch(/10\.0\.0\.5 +<-> 142\.250\.74\.110/);
    expect(run(s, 'tshark -r a.pcap -q -z io,phs')).toMatch(/\n {6}http +frames:2/);
    const fol = run(s, 'tshark -r a.pcap -q -z follow,tcp,ascii,2');
    expect(fol).toContain('Node 1: 10.0.0.20:21');
    expect(fol).toContain('USER anna');
    expect(fol).toContain('\t22\n220 FTP server ready');
    expect(run(s, 'tshark -r a.pcap -q -z endpoints,ip')).toContain('IPv4 Endpoints');
    expect(run(s, 'tshark -r a.pcap -Y icmp.type==8 -T fields -e frame.time_delta_displayed')).toBe('0.000000\n1.000000');
  });
});
