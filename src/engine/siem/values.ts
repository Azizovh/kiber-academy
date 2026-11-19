import type { Row, Scalar, Val } from './types';

/** First value of a multivalue field, or the value itself. */
export function first(v: Val | undefined): Scalar {
  if (v === undefined) return null;
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

export function values(v: Val | undefined): Scalar[] {
  if (v === undefined || v === null) return [];
  return Array.isArray(v) ? v : [v];
}

export function isNumeric(v: Scalar): boolean {
  if (typeof v === 'number') return Number.isFinite(v);
  return typeof v === 'string' && /^\s*-?(\d+\.?\d*|\.\d+)([eE][-+]?\d+)?\s*$/.test(v);
}

export function num(v: Val | undefined): number | null {
  const s = first(v);
  if (s === null) return null;
  if (typeof s === 'number') return s;
  return isNumeric(s) ? Number(s) : null;
}

export function str(v: Val | undefined): string {
  const s = first(v);
  if (s === null) return '';
  return typeof s === 'number' ? fmtNum(s) : s;
}

export function fmtNum(n: number): string {
  if (Number.isInteger(n)) return String(n);
  // Up to 6 significant decimals, no trailing zeros — close to how Splunk prints averages.
  return String(Number(n.toFixed(6)));
}

/** Splunk-style wildcard (`*`) to a regular expression; case-insensitive, whole value unless `partial`. */
export function wildcard(pattern: string, partial = false): RegExp {
  const body = pattern
    .split('*')
    .map((p) => p.replace(/[.+?^${}()|[\]\\]/g, '\\$&'))
    .join('.*');
  return new RegExp(partial ? body : `^${body}$`, 'is');
}

/** Orders values the way sort and stats do: numbers numerically before strings, strings lexicographically. */
export function compare(a: Val | undefined, b: Val | undefined): number {
  const x = first(a);
  const y = first(b);
  if (x === null && y === null) return 0;
  if (x === null) return 1;
  if (y === null) return -1;
  const nx = num(x);
  const ny = num(y);
  if (nx !== null && ny !== null) return nx - ny;
  if (nx !== null) return -1;
  if (ny !== null) return 1;
  return String(x) < String(y) ? -1 : String(x) > String(y) ? 1 : 0;
}

/* ── time ──────────────────────────────────────────────────────────── */

const pad = (n: number, w = 2) => String(n).padStart(w, '0');
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** "2026-11-16 04:32:14" (UTC) — how the SIEM view prints _time. */
export function fmtTime(t: number): string {
  return strftime(t, '%Y-%m-%d %H:%M:%S');
}

/** Kusto prints datetimes as ISO 8601 with Z. */
export function fmtIso(t: number): string {
  const d = new Date(t * 1000);
  const ms = d.getUTCMilliseconds();
  return d.toISOString().replace(ms ? /(\.\d+)Z$/ : /\.\d+Z$/, ms ? '$1Z' : 'Z');
}

export function strftime(t: number, fmt: string): string {
  const d = new Date(Math.floor(t) * 1000);
  const map: Record<string, string> = {
    Y: String(d.getUTCFullYear()),
    y: pad(d.getUTCFullYear() % 100),
    m: pad(d.getUTCMonth() + 1),
    d: pad(d.getUTCDate()),
    e: String(d.getUTCDate()).padStart(2, ' '),
    H: pad(d.getUTCHours()),
    I: pad(d.getUTCHours() % 12 || 12),
    p: d.getUTCHours() < 12 ? 'AM' : 'PM',
    M: pad(d.getUTCMinutes()),
    S: pad(d.getUTCSeconds()),
    b: MONTHS[d.getUTCMonth()]!,
    a: DAYS[d.getUTCDay()]!,
    A: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][d.getUTCDay()]!,
    j: pad(Math.floor((Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) - Date.UTC(d.getUTCFullYear(), 0, 1)) / 86400000) + 1, 3),
    w: String(d.getUTCDay()),
    s: String(Math.floor(t)),
    z: '+0000',
    Z: 'UTC',
    F: '',
    T: '',
    '%': '%',
  };
  map.F = `${map.Y}-${map.m}-${map.d}`;
  map.T = `${map.H}:${map.M}:${map.S}`;
  return fmt.replace(/%([a-zA-Z%])/g, (m, c: string) => map[c] ?? m);
}

/** The strptime subset labs need: %Y %m %d %H %M %S %b %F %T and literal text. Returns null when it does not match. */
export function strptime(s: string, fmt: string): number | null {
  const parts: Record<string, number> = { Y: 1970, m: 1, d: 1, H: 0, M: 0, S: 0 };
  const order: string[] = [];
  let re = '^';
  for (let i = 0; i < fmt.length; i++) {
    const c = fmt[i]!;
    if (c === '%' && i + 1 < fmt.length) {
      const f = fmt[++i]!;
      if (f === 'F') {
        re += '(\\d{4})-(\\d{1,2})-(\\d{1,2})';
        order.push('Y', 'm', 'd');
      } else if (f === 'T') {
        re += '(\\d{1,2}):(\\d{2}):(\\d{2})';
        order.push('H', 'M', 'S');
      } else if (f === 'b') {
        re += '([A-Za-z]{3})';
        order.push('b');
      } else if (f === 'Y') {
        re += '(\\d{4})';
        order.push('Y');
      } else if ('mdHMS'.includes(f)) {
        re += '(\\d{1,2})';
        order.push(f);
      } else if (f === 'z') {
        re += '[+-]\\d{4}';
      } else re += f.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    } else re += c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
  const m = new RegExp(re).exec(s.trim());
  if (!m) return null;
  order.forEach((k, i) => {
    const v = m[i + 1]!;
    if (k === 'b') parts.m = MONTHS.findIndex((x) => x.toLowerCase() === v.toLowerCase()) + 1;
    else parts[k] = Number(v);
  });
  return Date.UTC(parts.Y!, parts.m! - 1, parts.d!, parts.H!, parts.M!, parts.S!) / 1000;
}

const UNIT: Record<string, number> = { s: 1, sec: 1, secs: 1, second: 1, seconds: 1, m: 60, min: 60, mins: 60, minute: 60, minutes: 60, h: 3600, hr: 3600, hrs: 3600, hour: 3600, hours: 3600, d: 86400, day: 86400, days: 86400, w: 604800, week: 604800, weeks: 604800 };

/** A span such as "1h", "5m", "30s", "1d" in seconds, or null. */
export function spanSeconds(s: string): number | null {
  const m = /^(\d+)\s*([a-z]+)$/i.exec(s.trim());
  if (!m) return null;
  const unit = UNIT[m[2]!.toLowerCase()];
  return unit ? Number(m[1]) * unit : null;
}

/**
 * Splunk time modifiers: "-24h", "-7d@d", "@h", "now", "0", absolute "11/16/2026:04:00:00", or epoch seconds.
 * Returns null when the text is not a time.
 */
export function relativeTime(spec: string, now: number): number | null {
  const s = spec.trim().replace(/^"|"$/g, '');
  if (s === 'now' || s === '') return now;
  if (/^\d{9,}$/.test(s) || s === '0') return Number(s);
  const abs = /^(\d{1,2})\/(\d{1,2})\/(\d{4}):(\d{1,2}):(\d{2}):(\d{2})$/.exec(s);
  if (abs) return Date.UTC(+abs[3]!, +abs[1]! - 1, +abs[2]!, +abs[4]!, +abs[5]!, +abs[6]!) / 1000;
  const m = /^([-+]\d+[a-z]+)?(@[a-z]+)?$/i.exec(s);
  if (!m || (!m[1] && !m[2])) return null;
  let t = now;
  if (m[1]) {
    const sign = m[1][0] === '-' ? -1 : 1;
    const span = spanSeconds(m[1].slice(1));
    if (span === null) return null;
    t += sign * span;
  }
  if (m[2]) {
    const unit = UNIT[m[2].slice(1).toLowerCase()];
    if (!unit) return null;
    t = Math.floor(t / unit) * unit;
  }
  return t;
}

/** Text of a cell for tables and lab checks: datetimes formatted, multivalues one per line. */
export function cellText(v: Val | undefined, isTime: boolean, iso = false): string {
  if (v === undefined || v === null) return '';
  if (Array.isArray(v)) return v.map((x) => cellText(x, isTime, iso)).join('\n');
  if (isTime && typeof v === 'number') return iso ? fmtIso(v) : fmtTime(v);
  return typeof v === 'number' ? fmtNum(v) : v;
}

export function cloneRow(r: Row): Row {
  return { ...r };
}

/** IPv4 CIDR membership. */
export function cidrMatch(cidr: string, ip: string): boolean {
  const [base, bitsText] = cidr.split('/');
  const bits = bitsText === undefined ? 32 : Number(bitsText);
  const a = ipNum(base ?? '');
  const b = ipNum(ip);
  if (a === null || b === null || !(bits >= 0 && bits <= 32)) return false;
  if (bits === 0) return true;
  const mask = (~0 << (32 - bits)) >>> 0;
  return ((a & mask) >>> 0) === ((b & mask) >>> 0);
}

function ipNum(ip: string): number | null {
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(ip.trim());
  if (!m) return null;
  const parts = m.slice(1).map(Number);
  if (parts.some((p) => p > 255)) return null;
  return ((parts[0]! << 24) | (parts[1]! << 16) | (parts[2]! << 8) | parts[3]!) >>> 0;
}
