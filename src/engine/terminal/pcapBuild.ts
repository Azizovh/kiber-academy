import { encodeCapture, type Pkt } from './pcap';

/*
 * Builds capture files for labs and CTF: whole conversations (DNS lookups, TCP sessions with handshake, data and
 * teardown, TLS, scans, pings, ARP) instead of hand-written packets. Times are seconds since the epoch.
 */

export interface Exchange {
  /** Client → server payload. */
  c?: string;
  /** Server → client payload. */
  s?: string;
  /** Seconds to wait before this exchange (default 0.05). */
  dt?: number;
}

export class Capture {
  packets: Pkt[] = [];
  private dnsId = 0x1a20;

  add(p: Pkt): this {
    this.packets.push(p);
    return this;
  }

  arp(t: number, who: string, tell: string, mac: string): this {
    this.add({ t, src: tell, dst: who, p: 'ARP', arp: { op: 'request', mac: '00:00:00:00:00:00' }, dmac: 'ff:ff:ff:ff:ff:ff' });
    return this.add({ t: t + 0.0004, src: who, dst: tell, p: 'ARP', arp: { op: 'reply', mac }, smac: mac });
  }

  /** A query and its answer. `answers` empty or "NXDOMAIN" gives a "No such name" response. */
  dns(t: number, client: string, server: string, name: string, answers: string[] | 'NXDOMAIN', type = 'A', sport = 50000 + Math.floor((t * 7) % 9000)): this {
    const id = this.dnsId++;
    this.add({ t, src: client, dst: server, p: 'UDP', sp: sport, dp: 53, dns: { id, qr: false, name, type } });
    const nx = answers === 'NXDOMAIN';
    return this.add({
      t: t + 0.0181,
      src: server,
      dst: client,
      p: 'UDP',
      sp: 53,
      dp: sport,
      dns: { id, qr: true, name, type, ans: nx ? [] : answers, rcode: nx ? 'NXDOMAIN' : 'NOERROR' },
    });
  }

  ping(t: number, src: string, dst: string, count = 4, reply = true): this {
    for (let i = 0; i < count; i++) {
      this.add({ t: t + i, src, dst, p: 'ICMP', icmp: { type: 'request', id: 1, seq: i + 1 } });
      if (reply) this.add({ t: t + i + 0.0123, src: dst, dst: src, p: 'ICMP', icmp: { type: 'reply', id: 1, seq: i + 1 } });
    }
    return this;
  }

  /**
   * A TCP session: handshake, the exchanges in order, then FIN. With `open: false` the server answers the SYN with
   * RST (closed port). Returns the time the session ended.
   */
  tcp(t: number, client: string, cport: number, server: string, sport: number, exchanges: Exchange[] = [], opts: { open?: boolean; close?: boolean; rtt?: number } = {}): number {
    const rtt = opts.rtt ?? 0.02;
    const cs = { src: client, dst: server, p: 'TCP' as const, sp: cport, dp: sport };
    const sc = { src: server, dst: client, p: 'TCP' as const, sp: sport, dp: cport };
    this.add({ t, ...cs, fl: 'S', seq: 0 });
    if (opts.open === false) {
      this.add({ t: t + rtt, ...sc, fl: 'RA', seq: 0, ack: 1, win: 0 });
      return t + rtt;
    }
    this.add({ t: t + rtt, ...sc, fl: 'SA', seq: 0, ack: 1, win: 65160 });
    let now = t + rtt * 1.05;
    this.add({ t: now, ...cs, fl: 'A', seq: 1, ack: 1 });
    let cseq = 1;
    let sseq = 1;
    const len = (s: string) => new TextEncoder().encode(s).length;
    for (const ex of exchanges) {
      now += ex.dt ?? 0.05;
      if (ex.c !== undefined) {
        this.add({ t: now, ...cs, fl: 'PA', seq: cseq, ack: sseq, data: ex.c });
        cseq += len(ex.c);
        now += rtt;
        if (ex.s === undefined) this.add({ t: now, ...sc, fl: 'A', seq: sseq, ack: cseq });
      }
      if (ex.s !== undefined) {
        this.add({ t: now, ...sc, fl: 'PA', seq: sseq, ack: cseq, data: ex.s });
        sseq += len(ex.s);
        now += 0.0004;
        this.add({ t: now, ...cs, fl: 'A', seq: cseq, ack: sseq });
      }
    }
    if (opts.close !== false) {
      now += 0.01;
      this.add({ t: now, ...cs, fl: 'FA', seq: cseq, ack: sseq });
      this.add({ t: now + rtt, ...sc, fl: 'FA', seq: sseq, ack: cseq + 1 });
      this.add({ t: now + rtt * 1.05, ...cs, fl: 'A', seq: cseq + 1, ack: sseq + 1 });
      now += rtt * 1.05;
    }
    return now;
  }

  /** An HTTPS visit: handshake, TLS hellos with the SNI, some encrypted application data. */
  tls(t: number, client: string, cport: number, server: string, sni: string, appBytes = [612, 4380]): number {
    const cs = { src: client, dst: server, p: 'TCP' as const, sp: cport, dp: 443 };
    const sc = { src: server, dst: client, p: 'TCP' as const, sp: 443, dp: cport };
    this.add({ t, ...cs, fl: 'S', seq: 0 });
    this.add({ t: t + 0.03, ...sc, fl: 'SA', seq: 0, ack: 1, win: 65160 });
    this.add({ t: t + 0.031, ...cs, fl: 'A', seq: 1, ack: 1 });
    this.add({ t: t + 0.032, ...cs, fl: 'PA', seq: 1, ack: 1, plen: 517, tls: { hs: 'ClientHello', sni } });
    this.add({ t: t + 0.062, ...sc, fl: 'PA', seq: 1, ack: 518, plen: 1380, tls: { hs: 'ServerHello' } });
    let now = t + 0.07;
    let cseq = 518;
    let sseq = 1381;
    appBytes.forEach((n, i) => {
      now += 0.03;
      if (i % 2 === 0) {
        this.add({ t: now, ...cs, fl: 'PA', seq: cseq, ack: sseq, plen: n, tls: { hs: 'AppData' } });
        cseq += n;
      } else {
        this.add({ t: now, ...sc, fl: 'PA', seq: sseq, ack: cseq, plen: n, tls: { hs: 'AppData' } });
        sseq += n;
      }
    });
    now += 0.02;
    this.add({ t: now, ...cs, fl: 'FA', seq: cseq, ack: sseq });
    this.add({ t: now + 0.03, ...sc, fl: 'FA', seq: sseq, ack: cseq + 1 });
    this.add({ t: now + 0.031, ...cs, fl: 'A', seq: cseq + 1, ack: sseq + 1 });
    return now + 0.031;
  }

  /** One SYN probe of a port scan: SYN-ACK and the scanner's RST when open, RST-ACK when closed. */
  probe(t: number, src: string, sport: number, dst: string, dport: number, open: boolean): this {
    this.add({ t, src, dst, p: 'TCP', sp: sport, dp: dport, fl: 'S', seq: 0, win: 1024 });
    if (open) {
      this.add({ t: t + 0.0011, src: dst, dst: src, p: 'TCP', sp: dport, dp: sport, fl: 'SA', seq: 0, ack: 1, win: 65160 });
      return this.add({ t: t + 0.0013, src, dst, p: 'TCP', sp: sport, dp: dport, fl: 'R', seq: 1, win: 0 });
    }
    return this.add({ t: t + 0.0009, src: dst, dst: src, p: 'TCP', sp: dport, dp: sport, fl: 'RA', seq: 0, ack: 1, win: 0 });
  }

  build(): string {
    return encodeCapture([...this.packets].sort((a, b) => a.t - b.t));
  }
}

/** HTTP request text with the usual headers. */
export function httpGet(host: string, path: string, ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0 Safari/537.36', extra: string[] = []): string {
  return [`GET ${path} HTTP/1.1`, `Host: ${host}`, `User-Agent: ${ua}`, 'Accept: */*', ...extra, '', ''].join('\r\n');
}

export function httpPost(host: string, path: string, body: string, ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0 Safari/537.36', type = 'application/x-www-form-urlencoded', extra: string[] = []): string {
  return [`POST ${path} HTTP/1.1`, `Host: ${host}`, `User-Agent: ${ua}`, `Content-Type: ${type}`, `Content-Length: ${new TextEncoder().encode(body).length}`, ...extra, '', body].join('\r\n');
}

export function httpResponse(code: number, phrase: string, body: string, type = 'text/html; charset=utf-8', extra: string[] = []): string {
  return [`HTTP/1.1 ${code} ${phrase}`, 'Server: nginx/1.24.0', `Content-Type: ${type}`, `Content-Length: ${new TextEncoder().encode(body).length}`, ...extra, '', body].join('\r\n');
}

/** UTC seconds for 17 Nov 2026 at the given time. */
export const at = (h: number, m: number, s = 0) => Date.UTC(2026, 10, 17, h, m, 0) / 1000 + s;
