/*
 * PowerShell values. Cmdlets pass objects down the pipeline, not text; text appears only at the end, when the
 * host formats whatever is left (table for four properties or fewer, list for more — the same rule PowerShell uses
 * for objects without a predefined view).
 */

export interface PsObj {
  kind: 'obj';
  /** .NET-style type name, shown by Get-Member. */
  type: string;
  props: Record<string, PsVal>;
  /** Default table columns (a formatting view). Without it the 4-property rule decides. */
  view?: string[];
  /** Always format as a list (e.g. Get-NetFirewallRule). */
  list?: boolean;
  /** How the object prints as a string ("$p" or inside a table cell). */
  str?: string;
  /** Objects with the same group key are formatted as one block under `header` (e.g. one directory listing). */
  group?: string;
  header?: string;
  /** Printed as its `str` text, one per line (MatchInfo). */
  plain?: boolean;
}

export interface PsDate {
  kind: 'date';
  ms: number;
}

export interface PsBlock {
  kind: 'block';
  src: string;
}

export interface PsHash {
  kind: 'hash';
  entries: Record<string, PsVal>;
}

export interface PsBytes {
  kind: 'bytes';
  data: Uint8Array;
}

export type PsVal = null | boolean | number | string | PsVal[] | PsObj | PsDate | PsBlock | PsHash | PsBytes;

export const obj = (type: string, props: Record<string, PsVal>, extra: Partial<Omit<PsObj, 'kind' | 'type' | 'props'>> = {}): PsObj => ({
  kind: 'obj',
  type,
  props,
  ...extra,
});

export const date = (ms: number): PsDate => ({ kind: 'date', ms });

export const isObj = (v: PsVal): v is PsObj => !!v && typeof v === 'object' && !Array.isArray(v) && v.kind === 'obj';
export const isDate = (v: PsVal): v is PsDate => !!v && typeof v === 'object' && !Array.isArray(v) && v.kind === 'date';
export const isHash = (v: PsVal): v is PsHash => !!v && typeof v === 'object' && !Array.isArray(v) && v.kind === 'hash';
export const isBlock = (v: PsVal): v is PsBlock => !!v && typeof v === 'object' && !Array.isArray(v) && v.kind === 'block';
export const isBytes = (v: PsVal): v is PsBytes => !!v && typeof v === 'object' && !Array.isArray(v) && v.kind === 'bytes';

/** Property lookup, case-insensitive as in PowerShell. */
export function getProp(v: PsVal, name: string): PsVal | undefined {
  const lower = name.toLowerCase();
  if (isObj(v)) {
    for (const [k, val] of Object.entries(v.props)) if (k.toLowerCase() === lower) return val;
    return undefined;
  }
  if (isHash(v)) {
    for (const [k, val] of Object.entries(v.entries)) if (k.toLowerCase() === lower) return val;
    return undefined;
  }
  if (typeof v === 'string' && lower === 'length') return v.length;
  if (Array.isArray(v) && (lower === 'count' || lower === 'length')) return v.length;
  if (isBytes(v) && (lower === 'count' || lower === 'length')) return v.data.length;
  if (isDate(v)) {
    const d = new Date(v.ms);
    const map: Record<string, number> = {
      year: d.getUTCFullYear(),
      month: d.getUTCMonth() + 1,
      day: d.getUTCDate(),
      hour: d.getUTCHours(),
      minute: d.getUTCMinutes(),
      second: d.getUTCSeconds(),
    };
    if (lower in map) return map[lower]!;
    if (lower === 'date') return date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  }
  if (v !== null && !Array.isArray(v) && (lower === 'count' || lower === 'length') && typeof v !== 'object') return 1;
  return undefined;
}

export function propNames(v: PsVal): string[] {
  if (isObj(v)) return Object.keys(v.props);
  if (isHash(v)) return Object.keys(v.entries);
  return [];
}

const pad2 = (n: number) => String(n).padStart(2, '0');

/** en-US short date and long time: 11/17/2026 2:14:51 AM. Lab times are UTC and the lab machines run in UTC. */
export function fmtDate(ms: number, withSeconds = true): string {
  const d = new Date(ms);
  const h = d.getUTCHours();
  const h12 = h % 12 === 0 ? 12 : h % 12;
  const time = `${h12}:${pad2(d.getUTCMinutes())}${withSeconds ? ':' + pad2(d.getUTCSeconds()) : ''} ${h < 12 ? 'AM' : 'PM'}`;
  return `${d.getUTCMonth() + 1}/${d.getUTCDate()}/${d.getUTCFullYear()} ${time}`;
}

/** Parse what people type for dates: 2026-11-17, 2026-11-17 02:00, 2026-11-17T02:00:00Z, 11/17/2026 2:00 AM. */
export function parseDate(s: string): number | null {
  const t = s.trim();
  let m = /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?Z?$/.exec(t);
  if (m) return Date.UTC(+m[1]!, +m[2]! - 1, +m[3]!, +(m[4] ?? 0), +(m[5] ?? 0), +(m[6] ?? 0));
  m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?)?$/i.exec(t);
  if (m) {
    let h = +(m[4] ?? 0);
    const ap = m[7]?.toUpperCase();
    if (ap === 'PM' && h < 12) h += 12;
    if (ap === 'AM' && h === 12) h = 0;
    return Date.UTC(+m[3]!, +m[1]! - 1, +m[2]!, h, +(m[5] ?? 0), +(m[6] ?? 0));
  }
  return null;
}

/** How a value prints on its own line or inside a cell. */
export function toStr(v: PsVal | undefined): string {
  if (v === null || v === undefined) return '';
  if (typeof v === 'boolean') return v ? 'True' : 'False';
  if (typeof v === 'number') return Number.isInteger(v) ? String(v) : String(Math.round(v * 100) / 100);
  if (typeof v === 'string') return v;
  if (Array.isArray(v)) return v.map(toStr).join(' ');
  if (v.kind === 'date') return fmtDate(v.ms);
  if (v.kind === 'block') return v.src;
  if (v.kind === 'hash') return 'System.Collections.Hashtable';
  if (v.kind === 'bytes') return Array.from(v.data).join(' ');
  return v.str ?? `@{${Object.entries(v.props).map(([k, x]) => `${k}=${toStr(x)}`).join('; ')}}`;
}

/** Cell text in tables and lists: collections print as {a, b, c}, as PowerShell does. */
export function cellStr(v: PsVal | undefined): string {
  if (Array.isArray(v)) return `{${v.map(toStr).join(', ')}}`;
  return toStr(v);
}

export function truthy(v: PsVal | undefined): boolean {
  if (v === null || v === undefined) return false;
  if (typeof v === 'boolean') return v;
  if (typeof v === 'number') return v !== 0;
  if (typeof v === 'string') return v.length > 0;
  if (Array.isArray(v)) return v.length > 1 || (v.length === 1 && truthy(v[0]!));
  return true;
}

export function toNum(v: PsVal | undefined): number {
  if (typeof v === 'number') return v;
  if (typeof v === 'boolean') return v ? 1 : 0;
  if (isDate(v as PsVal)) return (v as PsDate).ms;
  const n = Number(toStr(v).trim());
  return Number.isNaN(n) ? NaN : n;
}

/** Flatten one level, as the pipeline does with arrays. */
export function flat(values: PsVal[]): PsVal[] {
  const out: PsVal[] = [];
  for (const v of values) if (Array.isArray(v)) out.push(...v);
  else out.push(v);
  return out;
}
