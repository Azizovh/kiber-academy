/*
 * A small SIEM for the labs: indexed events searched with Splunk's SPL, and tables queried with Microsoft
 * Sentinel's Kusto (KQL). Both languages run over plain rows; times are Unix seconds (UTC).
 */

export type Scalar = string | number | null;
/** A field value; an array is a multivalue field (stats values(), split()). */
export type Val = Scalar | Scalar[];
export type Row = Record<string, Val>;

export interface SiemEvent extends Row {
  /** Unix seconds, UTC. */
  _time: number;
  /** The original log line, as the source wrote it. */
  _raw: string;
  index: string;
  sourcetype: string;
  host: string;
  source: string;
}

export interface SiemSpec {
  /** Splunk indexes and their events (any order; searches return newest first). */
  indexes?: Record<string, SiemEvent[]>;
  /** Sentinel tables (KQL). Each row should carry TimeGenerated (Unix seconds) or another datetime column. */
  tables?: Record<string, Row[]>;
  /** Columns of `tables` that hold datetimes (Unix seconds); TimeGenerated and Timestamp always do. */
  timeColumns?: string[];
  /** CSV-like lookup tables for `| lookup` and `| inputlookup`. */
  lookups?: Record<string, Row[]>;
  /** The lab's "now", ISO UTC — what -24h, ago(1h) and now() count from. */
  now: string;
}

export interface SiemState {
  indexes: Record<string, SiemEvent[]>;
  tables: Record<string, Row[]>;
  timeColumns: Set<string>;
  lookups: Record<string, Row[]>;
  now: number;
}

export type SiemLang = 'spl' | 'kql';

export interface ChartSpec {
  /** Column on the x axis (a time column for timechart / bin). */
  x: string;
  /** Numeric columns, one line or bar series each. */
  series: string[];
}

export interface SiemResult {
  lang: SiemLang;
  /** 'events': raw events with a field sidebar (an SPL search without a transforming command); 'table': a statistics table. */
  mode: 'events' | 'table';
  columns: string[];
  rows: Row[];
  /** Columns whose numbers are datetimes and print as dates. */
  timeColumns: string[];
  chart?: ChartSpec;
  error?: string;
  /** Searched event count before transforming commands (SPL), for the "N events" line. */
  scanned?: number;
}

export function createSiem(spec: SiemSpec): SiemState {
  const indexes: Record<string, SiemEvent[]> = {};
  for (const [name, events] of Object.entries(spec.indexes ?? {})) {
    indexes[name] = events.map((e) => ({ ...e, index: name })).sort((a, b) => b._time - a._time);
  }
  return {
    indexes,
    tables: Object.fromEntries(Object.entries(spec.tables ?? {}).map(([k, rows]) => [k, rows.map((r) => ({ ...r }))])),
    timeColumns: new Set(['TimeGenerated', 'Timestamp', ...(spec.timeColumns ?? [])]),
    lookups: spec.lookups ?? {},
    now: Math.floor(Date.parse(spec.now) / 1000),
  };
}
