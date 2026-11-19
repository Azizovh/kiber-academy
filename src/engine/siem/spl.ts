/*
 * Splunk SPL over the lab's indexes. The first segment of a query is an implicit `search`; every `|` starts a
 * command. Supported: search, where, eval, stats, eventstats, timechart, chart, bin/bucket, table, fields, rename,
 * sort, head, tail, reverse, dedup, top, rare, rex, lookup, inputlookup, fillnull, mvexpand, makeresults.
 *
 * Semantics kept from the real thing because labs teach them: search terms match whole tokens (`power` does not
 * find `powershell`), field values in `search` are case-insensitive while `where` compares case-sensitively,
 * `field!=x` drops events without the field but `NOT field=x` keeps them, OR binds tighter than the implicit AND,
 * events come newest first, and stats groups come sorted by the by-fields.
 */

import { evalExpr, ExprParser, parseExpr, SplError, test, tokenizeExpr, type EvalCtx } from './expr';
import type { ChartSpec, Row, Scalar, SiemEvent, SiemResult, SiemState, Val } from './types';
import { compare, first, fmtNum, isNumeric, num, relativeTime, spanSeconds, str, values, wildcard } from './values';

interface Pipe {
  rows: Row[];
  /** null while results are still raw events. */
  columns: string[] | null;
  chart?: ChartSpec;
  scanned: number;
}

/* ── splitting the query ─────────────────────────────────────────── */

/** Splits on `|` outside double quotes; a `[` subsearch is not supported and says so. */
function splitPipes(q: string): string[] {
  const out: string[] = [];
  let cur = '';
  let quote = false;
  for (let i = 0; i < q.length; i++) {
    const c = q[i]!;
    if (c === '\\' && quote && i + 1 < q.length) {
      cur += c + q[++i];
      continue;
    }
    if (c === '"') quote = !quote;
    if (c === '[' && !quote) throw new SplError('Subsearches ([ ... ]) are not supported in this simulator. Run the inner search first and copy its values.');
    if (c === '|' && !quote) {
      out.push(cur);
      cur = '';
    } else cur += c;
  }
  if (quote) throw new SplError('Unbalanced quotes.');
  out.push(cur);
  return out.map((s) => s.trim());
}

/* ── search expressions ──────────────────────────────────────────── */

type SNode =
  | { k: 'and' | 'or'; a: SNode; b: SNode }
  | { k: 'not'; a: SNode }
  | { k: 'term'; text: string; quoted: boolean }
  | { k: 'cmp'; field: string; op: string; value: string }
  | { k: 'in'; field: string; list: string[] }
  | { k: 'all' };

type STok = { t: 'paren'; v: '(' | ')' } | { t: 'word'; v: string } | { t: 'quoted'; v: string };

function tokenizeSearch(src: string): STok[] {
  const out: STok[] = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i]!;
    if (/\s/.test(c)) {
      i++;
    } else if (c === '(' || c === ')') {
      out.push({ t: 'paren', v: c });
      i++;
    } else if (c === '"') {
      let j = i + 1;
      let text = '';
      while (j < src.length && src[j] !== '"') {
        if (src[j] === '\\' && (src[j + 1] === '"' || src[j + 1] === '\\')) {
          text += src[j + 1];
          j += 2;
        } else text += src[j++];
      }
      if (j >= src.length) throw new SplError('Unbalanced quotes.');
      out.push({ t: 'quoted', v: text });
      i = j + 1;
    } else {
      let j = i;
      while (j < src.length && !/[\s()"]/.test(src[j]!)) j++;
      out.push({ t: 'word', v: src.slice(i, j) });
      i = j;
    }
  }
  return out;
}

const FIELD_CMP = /^([A-Za-z_][\w.:{}-]*?)(!=|<=|>=|==|=|<|>)(.*)$/s;

interface SearchParse {
  node: SNode;
  earliest: number | null;
  latest: number | null;
}

function parseSearch(src: string, now: number): SearchParse {
  const toks = tokenizeSearch(src);
  let pos = 0;
  let earliest: number | null = null;
  let latest: number | null = null;
  const isWord = (w: string) => toks[pos]?.t === 'word' && toks[pos]!.v === w;

  const andList = (): SNode => {
    let node: SNode | null = null;
    while (pos < toks.length && !(toks[pos]!.t === 'paren' && toks[pos]!.v === ')')) {
      if (isWord('AND')) {
        pos++;
        continue;
      }
      const n = orList();
      node = node ? { k: 'and', a: node, b: n } : n;
    }
    return node ?? { k: 'all' };
  };
  const orList = (): SNode => {
    let a = notNode();
    while (isWord('OR')) {
      pos++;
      a = { k: 'or', a, b: notNode() };
    }
    return a;
  };
  const notNode = (): SNode => {
    if (isWord('NOT')) {
      pos++;
      return { k: 'not', a: notNode() };
    }
    return primary();
  };
  const primary = (): SNode => {
    const t = toks[pos++];
    if (!t) throw new SplError("Error in 'search' command: Unable to parse the search: Missing a search term.");
    if (t.t === 'paren') {
      if (t.v === ')') throw new SplError("Error in 'search' command: Unable to parse the search: unbalanced parentheses.");
      const n = andList();
      if (!(toks[pos]?.t === 'paren' && toks[pos]!.v === ')')) throw new SplError("Error in 'search' command: Unable to parse the search: unbalanced parentheses.");
      pos++;
      return n;
    }
    if (t.t === 'quoted') return { k: 'term', text: t.v, quoted: true };
    const m = FIELD_CMP.exec(t.v);
    if (m) {
      const field = m[1]!;
      const op = m[2] === '==' ? '=' : m[2]!;
      let value = m[3]!;
      if (value === '' && toks[pos]?.t === 'quoted') value = (toks[pos++] as { v: string }).v;
      if (field === 'earliest' || field === 'latest') {
        const time = relativeTime(value, now);
        if (time === null) throw new SplError(`Invalid value "${value}" for time term '${field}'.`);
        if (field === 'earliest') earliest = time;
        else latest = time;
        return { k: 'all' };
      }
      return { k: 'cmp', field, op, value };
    }
    // field IN (a, b, c)
    if (isWord('IN') && toks[pos + 1]?.t === 'paren' && /^[A-Za-z_][\w.]*$/.test(t.v)) {
      pos += 2;
      const list: string[] = [];
      while (pos < toks.length && !(toks[pos]!.t === 'paren')) {
        const v = toks[pos++]!;
        for (const part of (v as { v: string }).v.split(',')) if (part.trim() || v.t === 'quoted') list.push(v.t === 'quoted' ? v.v : part.trim());
      }
      if (!(toks[pos]?.t === 'paren' && toks[pos]!.v === ')')) throw new SplError("Error in 'search' command: Unable to parse the search: unbalanced parentheses.");
      pos++;
      return { k: 'in', field: t.v, list };
    }
    return { k: 'term', text: t.v, quoted: false };
  };

  const node = andList();
  if (pos < toks.length) throw new SplError("Error in 'search' command: Unable to parse the search: unbalanced parentheses.");
  return { node, earliest, latest };
}

/** Characters Splunk splits raw text on when it indexes (major and minor breakers). */
const BREAK = `\\s\\[\\](){}<>|!;,'"/:=@.\\-$#%\\\\_&?+*`;

function termRegex(term: string): RegExp {
  const body = term
    .split('*')
    .map((p) => p.replace(/[.+?^${}()|[\]\\]/g, '\\$&'))
    .join(`[^\\s"'\\[\\](){}<>|;,!]*`);
  return new RegExp(`(?:^|[${BREAK}])${body}(?=$|[${BREAK}])`, 'i');
}

function rawText(row: Row): string {
  if (typeof row._raw === 'string') return row._raw;
  return Object.entries(row)
    .filter(([k]) => !k.startsWith('_'))
    .map(([, v]) => values(v).join(' '))
    .join(' ');
}

function matchNode(n: SNode, row: Row, cache: Map<string, RegExp>): boolean {
  switch (n.k) {
    case 'all':
      return true;
    case 'and':
      return matchNode(n.a, row, cache) && matchNode(n.b, row, cache);
    case 'or':
      return matchNode(n.a, row, cache) || matchNode(n.b, row, cache);
    case 'not':
      return !matchNode(n.a, row, cache);
    case 'term': {
      const raw = rawText(row);
      if (n.quoted) {
        if (!n.text.includes('*')) return raw.toLowerCase().includes(n.text.toLowerCase());
        return wildcard(n.text, true).test(raw);
      }
      let re = cache.get('t:' + n.text);
      if (!re) cache.set('t:' + n.text, (re = termRegex(n.text)));
      return re.test(raw);
    }
    case 'in':
      return n.list.some((v) => matchNode({ k: 'cmp', field: n.field, op: '=', value: v }, row, cache));
    case 'cmp': {
      const vs = values(row[n.field]).filter((v) => v !== null);
      if (n.value === '*' && n.op === '=') return vs.length > 0;
      if (!vs.length) return false;
      if (n.op === '=' || n.op === '!=') {
        let re = cache.get('w:' + n.value);
        if (!re) cache.set('w:' + n.value, (re = wildcard(n.value)));
        const hit = vs.some((v) => {
          if (isNumeric(v) && isNumeric(n.value)) return Number(v) === Number(n.value);
          return re!.test(str(v));
        });
        return n.op === '=' ? hit : !hit;
      }
      return vs.some((v) => {
        const a = num(v);
        const b = num(n.value);
        const r = a !== null && b !== null ? a - b : str(v).localeCompare(n.value);
        return n.op === '<' ? r < 0 : n.op === '>' ? r > 0 : n.op === '<=' ? r <= 0 : r >= 0;
      });
    }
  }
}

/* ── argument helpers ────────────────────────────────────────────── */

/** Splits on whitespace and commas, keeping "quoted strings" and parenthesised calls (dc(x), count(eval(...))) whole. */
function words(src: string): string[] {
  const out: string[] = [];
  let cur = '';
  let depth = 0;
  let quote = false;
  for (const c of src) {
    if (c === '"') quote = !quote;
    if (!quote) {
      if (c === '(') depth++;
      if (c === ')') depth--;
      if (depth === 0 && (/\s/.test(c) || c === ',')) {
        if (cur) out.push(cur);
        cur = '';
        continue;
      }
    }
    cur += c;
  }
  if (cur) out.push(cur);
  return out;
}

const unquote = (s: string) => (s.length >= 2 && s.startsWith('"') && s.endsWith('"') ? s.slice(1, -1) : s);

/** Pulls `name=value` options (span=1h, limit=5) off the front of an argument list. */
function options(ws: string[], names: string[]): [Record<string, string>, string[]] {
  const opts: Record<string, string> = {};
  const rest: string[] = [];
  for (const w of ws) {
    const m = /^([a-z_]+)=(.*)$/i.exec(w);
    if (m && names.includes(m[1]!.toLowerCase())) opts[m[1]!.toLowerCase()] = unquote(m[2]!);
    else rest.push(w);
  }
  return [opts, rest];
}

function fieldNames(rows: Row[]): string[] {
  const seen = new Set<string>();
  for (const r of rows) for (const k of Object.keys(r)) seen.add(k);
  return [...seen];
}

function expandFields(patterns: string[], known: string[]): string[] {
  const out: string[] = [];
  for (const p of patterns.map(unquote)) {
    if (p.includes('*')) {
      const re = wildcard(p);
      for (const k of known) if (re.test(k) && !out.includes(k)) out.push(k);
    } else if (!out.includes(p)) out.push(p);
  }
  return out;
}

/* ── aggregation ─────────────────────────────────────────────────── */

interface Agg {
  fn: string;
  field: string | null;
  name: string;
  /** Percentile for perc95/p95. */
  pct?: number;
}

const AGG_FNS = ['count', 'c', 'dc', 'distinct_count', 'sum', 'avg', 'mean', 'min', 'max', 'range', 'values', 'list', 'first', 'last', 'earliest', 'latest', 'median', 'stdev', 'mode'];

function parseAggs(ws: string[], command: string): { aggs: Agg[]; by: string[]; rest: string[] } {
  const aggs: Agg[] = [];
  let i = 0;
  while (i < ws.length) {
    const w = ws[i]!;
    if (/^by$/i.test(w) || /^over$/i.test(w)) break;
    const m = /^([a-z_]+?)(\d+)?(?:\((.*)\))?$/i.exec(w);
    const fn = m ? (m[1]!.toLowerCase() + (m[2] && !/^(perc|p)$/i.test(m[1]!) ? m[2] : '')) : '';
    const pct = m && m[2] && /^(perc|p)$/i.test(m[1]!) ? Number(m[2]) : undefined;
    if (!m || (!AGG_FNS.includes(fn) && pct === undefined)) throw new SplError(`Error in '${command}' command: The argument '${w}' is invalid.`);
    const field = m[3] !== undefined && m[3] !== '' ? unquote(m[3]) : null;
    if (field === null && !['count', 'c'].includes(fn)) throw new SplError(`Error in '${command}' command: The aggregation specifier '${w}' requires a field name.`);
    let name = w;
    if (fn === 'c' && field === null) name = 'count';
    i++;
    if (ws[i] && /^as$/i.test(ws[i]!)) {
      name = unquote(ws[i + 1] ?? '');
      if (!name) throw new SplError(`Error in '${command}' command: The argument 'as' requires a field name.`);
      i += 2;
    }
    aggs.push({ fn: pct !== undefined ? 'perc' : fn === 'c' ? 'count' : fn === 'distinct_count' ? 'dc' : fn === 'mean' ? 'avg' : fn, field, name, pct });
  }
  if (!aggs.length) throw new SplError(`Error in '${command}' command: You must specify at least one aggregation.`);
  let by: string[] = [];
  let rest: string[] = [];
  if (i < ws.length && /^by$/i.test(ws[i]!)) by = ws.slice(i + 1).map(unquote);
  else rest = ws.slice(i);
  return { aggs, by, rest };
}

function aggregate(agg: Agg, rows: Row[]): Val {
  const vs = (r: Row) => values(agg.field ? r[agg.field] : null).filter((v) => v !== null && v !== '');
  switch (agg.fn) {
    case 'count':
      return agg.field ? rows.reduce((n, r) => n + vs(r).length, 0) : rows.length;
    case 'dc':
      return new Set(rows.flatMap((r) => vs(r).map((v) => str(v)))).size;
    case 'values':
      return [...new Set(rows.flatMap((r) => vs(r).map((v) => str(v))))].sort();
    case 'list':
      return rows.flatMap((r) => vs(r).map((v) => str(v))).slice(0, 100);
    case 'first': {
      const r = rows.find((x) => vs(x).length);
      return r ? first(r[agg.field!]) : null;
    }
    case 'last': {
      const r = [...rows].reverse().find((x) => vs(x).length);
      return r ? first(r[agg.field!]) : null;
    }
    case 'earliest':
    case 'latest': {
      const withVal = rows.filter((x) => vs(x).length && typeof x._time === 'number');
      if (!withVal.length) return null;
      const pick = withVal.reduce((a, b) => ((agg.fn === 'earliest' ? (b._time as number) < (a._time as number) : (b._time as number) > (a._time as number)) ? b : a));
      return first(pick[agg.field!]);
    }
    case 'mode': {
      const counts = new Map<string, number>();
      for (const r of rows) for (const v of vs(r)) counts.set(str(v), (counts.get(str(v)) ?? 0) + 1);
      let best: string | null = null;
      for (const [k, n] of counts) if (best === null || n > counts.get(best)!) best = k;
      return best;
    }
  }
  const ns = rows.flatMap((r) => vs(r).map(num)).filter((x): x is number => x !== null);
  if (!ns.length) return null;
  switch (agg.fn) {
    case 'sum':
      return ns.reduce((a, b) => a + b, 0);
    case 'avg':
      return ns.reduce((a, b) => a + b, 0) / ns.length;
    case 'min':
      return Math.min(...ns);
    case 'max':
      return Math.max(...ns);
    case 'range':
      return Math.max(...ns) - Math.min(...ns);
    case 'median':
    case 'perc': {
      const s = [...ns].sort((a, b) => a - b);
      const p = agg.fn === 'median' ? 50 : agg.pct!;
      return s[Math.min(s.length - 1, Math.max(0, Math.round((p / 100) * (s.length - 1))))]!;
    }
    case 'stdev': {
      if (ns.length < 2) return 0;
      const mean = ns.reduce((a, b) => a + b, 0) / ns.length;
      return Math.sqrt(ns.reduce((a, b) => a + (b - mean) ** 2, 0) / (ns.length - 1));
    }
  }
  return null;
}

/** Groups rows by the by-fields; a row missing one of them is dropped, a multivalue one counts in each group. */
function group(rows: Row[], by: string[]): { key: Scalar[]; rows: Row[] }[] {
  const map = new Map<string, { key: Scalar[]; rows: Row[] }>();
  for (const r of rows) {
    let keys: Scalar[][] = [[]];
    for (const f of by) {
      const vs = values(r[f]).filter((v) => v !== null && v !== '');
      if (!vs.length) {
        keys = [];
        break;
      }
      keys = keys.flatMap((k) => vs.map((v) => [...k, v]));
    }
    for (const key of keys) {
      const id = JSON.stringify(key.map((v) => str(v)));
      let g = map.get(id);
      if (!g) map.set(id, (g = { key, rows: [] }));
      g.rows.push(r);
    }
  }
  const groups = [...map.values()];
  groups.sort((a, b) => {
    for (let i = 0; i < by.length; i++) {
      const c = compare(a.key[i], b.key[i]);
      if (c) return c;
    }
    return 0;
  });
  return groups;
}

/* ── time buckets ────────────────────────────────────────────────── */

function defaultSpan(rows: Row[]): number {
  const times = rows.map((r) => num(r._time)).filter((t): t is number => t !== null);
  if (!times.length) return 1800;
  const range = Math.max(...times) - Math.min(...times);
  if (range <= 15 * 60) return 10;
  if (range <= 3600) return 60;
  if (range <= 4 * 3600) return 300;
  if (range <= 86400) return 1800;
  if (range <= 7 * 86400) return 3600;
  return 86400;
}

function floorTime(t: number, span: number): number {
  return Math.floor(t / span) * span;
}

/* ── commands ────────────────────────────────────────────────────── */

type Cmd = (args: string, p: Pipe, st: SiemState, ctx: EvalCtx) => Pipe;

const asTable = (p: Pipe): string[] => p.columns ?? fieldNames(p.rows).filter((f) => f !== '_raw');

const COMMANDS: Record<string, Cmd> = {
  search(args, p, st) {
    const { node } = parseSearch(args, st.now);
    const cache = new Map<string, RegExp>();
    return { ...p, rows: p.rows.filter((r) => matchNode(node, r, cache)) };
  },

  where(args, p, _st, ctx) {
    let e;
    try {
      e = parseExpr(args);
    } catch (err) {
      throw new SplError(`Error in 'where' command: ${(err as Error).message}`);
    }
    try {
      return { ...p, rows: p.rows.filter((r) => test(e, r, ctx)) };
    } catch (err) {
      throw new SplError(`Error in 'where' command: ${(err as Error).message}`);
    }
  },

  eval(args, p, _st, ctx) {
    const parser = new ExprParser(tokenizeExpr(args));
    const assigns: [string, ReturnType<ExprParser['parse']>][] = [];
    try {
      for (;;) {
        const t = parser.peek();
        if (!t || (t.t !== 'id' && t.t !== 'field')) throw new SplError('The expression is malformed.');
        parser.pos++;
        parser.expectOp('=');
        assigns.push([t.v, parser.parse()]);
        if (parser.done()) break;
        parser.expectOp(',');
      }
    } catch (err) {
      throw new SplError(`Error in 'eval' command: ${(err as Error).message}`);
    }
    const rows = p.rows.map((r) => {
      const out = { ...r };
      for (const [name, e] of assigns) {
        let v;
        try {
          v = evalExpr(e, out, ctx);
        } catch (err) {
          throw new SplError(`Error in 'eval' command: ${(err as Error).message}`);
        }
        if (typeof v === 'boolean') throw new SplError("Error in 'eval' command: Fields cannot be assigned a boolean result. Instead, try if([bool expr], [expr], [expr]).");
        if (v === null) delete out[name];
        else out[name] = v;
      }
      return out;
    });
    const columns = p.columns ? [...p.columns, ...assigns.map(([n]) => n).filter((n) => !p.columns!.includes(n))] : null;
    return { ...p, rows, columns };
  },

  stats(args, p) {
    const { aggs, by } = parseAggs(words(args), 'stats');
    const groups = by.length ? group(p.rows, by) : [{ key: [], rows: p.rows }];
    const rows = groups.map((g) => {
      const r: Row = {};
      by.forEach((f, i) => (r[f] = g.key[i]!));
      for (const a of aggs) r[a.name] = aggregate(a, g.rows);
      return r;
    });
    return { rows, columns: [...by, ...aggs.map((a) => a.name)], scanned: p.scanned };
  },

  eventstats(args, p) {
    const { aggs, by } = parseAggs(words(args), 'eventstats');
    const groups = by.length ? group(p.rows, by) : [{ key: [], rows: p.rows }];
    const extra = new Map<Row, Row>();
    for (const g of groups) {
      const add: Row = {};
      for (const a of aggs) add[a.name] = aggregate(a, g.rows);
      for (const r of g.rows) extra.set(r, add);
    }
    const rows = p.rows.map((r) => ({ ...r, ...(extra.get(r) ?? {}) }));
    const columns = p.columns ? [...p.columns, ...aggs.map((a) => a.name).filter((n) => !p.columns!.includes(n))] : null;
    return { ...p, rows, columns };
  },

  timechart(args, p) {
    const [opts, ws] = options(words(args), ['span', 'limit', 'useother', 'usenull']);
    const { aggs, by } = parseAggs(ws, 'timechart');
    if (by.length > 1) throw new SplError("Error in 'timechart' command: The timechart command takes only one split-by field.");
    let span = defaultSpan(p.rows);
    if (opts.span) {
      const s = spanSeconds(opts.span);
      if (s === null) throw new SplError(`Error in 'timechart' command: Invalid value for span: '${opts.span}'.`);
      span = s;
    }
    const timed = p.rows.filter((r) => typeof r._time === 'number');
    if (!timed.length) return { rows: [], columns: ['_time'], scanned: p.scanned };
    const times = timed.map((r) => r._time as number);
    const start = floorTime(Math.min(...times), span);
    const end = floorTime(Math.max(...times), span);
    const buckets = new Map<number, Row[]>();
    for (let t = start; t <= end; t += span) buckets.set(t, []);
    for (const r of timed) buckets.get(floorTime(r._time as number, span))!.push(r);
    const countLike = (a: Agg) => a.fn === 'count' || a.fn === 'dc';
    const rows: Row[] = [];
    let series: string[];
    if (by.length) {
      const agg = aggs[0]!;
      const field = by[0]!;
      const limit = opts.limit !== undefined ? Number(opts.limit) : 10;
      const totals = new Map<string, number>();
      for (const r of timed) for (const v of values(r[field]).filter((x) => x !== null)) totals.set(str(v), (totals.get(str(v)) ?? 0) + 1);
      let keys = [...totals.keys()].sort((a, b) => totals.get(b)! - totals.get(a)! || (a < b ? -1 : 1));
      const other = limit > 0 && keys.length > limit && opts.useother !== 'false' && opts.useother !== 'f';
      if (limit > 0) keys = keys.slice(0, limit);
      keys.sort();
      series = other ? [...keys, 'OTHER'] : keys;
      for (const [t, rs] of buckets) {
        const row: Row = { _time: t };
        for (const k of keys) {
          const sub = rs.filter((r) => values(r[field]).some((v) => str(v) === k));
          row[k] = sub.length || countLike(agg) ? aggregate(agg, sub) : null;
        }
        if (other) {
          const sub = rs.filter((r) => !values(r[field]).some((v) => keys.includes(str(v))) && values(r[field]).length);
          row.OTHER = aggregate(agg, sub);
        }
        rows.push(row);
      }
    } else {
      series = aggs.map((a) => a.name);
      for (const [t, rs] of buckets) {
        const row: Row = { _time: t };
        for (const a of aggs) row[a.name] = rs.length || countLike(a) ? aggregate(a, rs) : null;
        rows.push(row);
      }
    }
    return { rows, columns: ['_time', ...series], chart: { x: '_time', series }, scanned: p.scanned };
  },

  chart(args, p) {
    const [opts, ws] = options(words(args), ['limit', 'useother']);
    const { aggs, by, rest } = parseAggs(ws, 'chart');
    let over: string | null = null;
    let split: string | null = null;
    if (rest.length && /^over$/i.test(rest[0]!)) {
      over = rest[1] ?? null;
      if (rest[2] && /^by$/i.test(rest[2])) split = rest[3] ?? null;
    } else if (by.length) {
      over = by[0]!;
      split = by[1] ?? null;
    }
    if (!over) return COMMANDS.stats!(args, p, undefined as never, undefined as never);
    if (!split) {
      const out = COMMANDS.stats!(`${aggs.map((a) => (a.field ? `${a.fn}(${a.field})` : a.fn) + ` as "${a.name}"`).join(' ')} by ${over}`, p, undefined as never, undefined as never);
      return { ...out, chart: { x: over, series: aggs.map((a) => a.name) } };
    }
    const agg = aggs[0]!;
    const limit = opts.limit !== undefined ? Number(opts.limit) : 10;
    const totals = new Map<string, number>();
    for (const r of p.rows) for (const v of values(r[split]).filter((x) => x !== null)) totals.set(str(v), (totals.get(str(v)) ?? 0) + 1);
    let keys = [...totals.keys()].sort((a, b) => totals.get(b)! - totals.get(a)! || (a < b ? -1 : 1));
    if (limit > 0) keys = keys.slice(0, limit);
    keys.sort();
    const rows = group(p.rows, [over]).map((g) => {
      const row: Row = { [over!]: g.key[0]! };
      for (const k of keys) row[k] = aggregate(agg, g.rows.filter((r) => values(r[split!]).some((v) => str(v) === k)));
      return row;
    });
    return { rows, columns: [over, ...keys], chart: { x: over, series: keys }, scanned: p.scanned };
  },

  bin(args, p) {
    const [opts, ws] = options(words(args), ['span', 'bins']);
    const field = unquote(ws[0] ?? '');
    if (!field) throw new SplError("Error in 'bin' command: You must specify a field to discretize.");
    const target = ws[1] && /^as$/i.test(ws[1]) ? unquote(ws[2] ?? field) : field;
    const isTime = field === '_time';
    let span = isTime ? defaultSpan(p.rows) : 10;
    if (opts.span) {
      const s = isTime ? spanSeconds(opts.span) : Number(opts.span);
      if (s === null || !Number.isFinite(s) || s <= 0) throw new SplError(`Error in 'bin' command: Invalid value for span: '${opts.span}'.`);
      span = s;
    }
    const rows = p.rows.map((r) => {
      const n = num(r[field]);
      if (n === null) return r;
      const lo = floorTime(n, span);
      return { ...r, [target]: isTime ? lo : `${fmtNum(lo)}-${fmtNum(lo + span)}` };
    });
    return { ...p, rows };
  },

  table(args, p) {
    const cols = expandFields(words(args), fieldNames(p.rows));
    return { rows: p.rows.map((r) => Object.fromEntries(cols.filter((c) => c in r).map((c) => [c, r[c]!]))), columns: cols, scanned: p.scanned };
  },

  fields(args, p) {
    let ws = words(args);
    let remove = false;
    if (ws[0] === '-' || ws[0] === '+') {
      remove = ws[0] === '-';
      ws = ws.slice(1);
    }
    const known = fieldNames(p.rows);
    const list = expandFields(ws, known);
    if (remove) {
      const rows = p.rows.map((r) => Object.fromEntries(Object.entries(r).filter(([k]) => !list.includes(k))));
      return { ...p, rows, columns: p.columns ? p.columns.filter((c) => !list.includes(c)) : null };
    }
    // Events keep _time and _raw, as in Splunk; a table keeps exactly the listed fields.
    const keep = p.columns ? list : [...list, '_time', '_raw', 'index'];
    const rows = p.rows.map((r) => Object.fromEntries(Object.entries(r).filter(([k]) => keep.includes(k))));
    return { ...p, rows, columns: p.columns ? list.filter((c) => p.columns!.includes(c) || known.includes(c)) : null };
  },

  rename(args, p) {
    const ws = words(args);
    const pairs: [string, string][] = [];
    for (let i = 0; i < ws.length; i += 3) {
      if (!ws[i + 1] || !/^as$/i.test(ws[i + 1]!) || !ws[i + 2]) throw new SplError("Error in 'rename' command: Usage: rename [old_name AS new_name]...");
      pairs.push([unquote(ws[i]!), unquote(ws[i + 2]!)]);
    }
    const rows = p.rows.map((r) => {
      const out: Row = {};
      for (const [k, v] of Object.entries(r)) out[pairs.find(([a]) => a === k)?.[1] ?? k] = v;
      return out;
    });
    return { ...p, rows, columns: p.columns ? p.columns.map((c) => pairs.find(([a]) => a === c)?.[1] ?? c) : null };
  },

  sort(args, p) {
    let ws = words(args);
    let limit = 10000;
    if (ws[0] && /^\d+$/.test(ws[0])) {
      limit = Number(ws[0]) || Infinity;
      ws = ws.slice(1);
    }
    const lm = ws.findIndex((w) => /^limit=\d+$/i.test(w));
    if (lm >= 0) {
      limit = Number(ws[lm]!.split('=')[1]) || Infinity;
      ws.splice(lm, 1);
    }
    let reverseAll = false;
    if (ws.length && /^(d|desc)$/i.test(ws[ws.length - 1]!)) {
      reverseAll = true;
      ws = ws.slice(0, -1);
    }
    const keys: { field: string; desc: boolean; mode: 'auto' | 'num' | 'str' }[] = [];
    let sign: '-' | '+' | null = null;
    for (const w of ws) {
      if (w === '-' || w === '+') {
        sign = w;
        continue;
      }
      let f = w;
      let desc = sign === '-';
      if (f.startsWith('-') || f.startsWith('+')) {
        desc = f[0] === '-';
        f = f.slice(1);
      }
      let mode: 'auto' | 'num' | 'str' = 'auto';
      const m = /^(num|str|auto|ip)\((.+)\)$/i.exec(f);
      if (m) {
        mode = m[1]!.toLowerCase() === 'num' ? 'num' : m[1]!.toLowerCase() === 'str' ? 'str' : 'auto';
        f = m[2]!;
      }
      keys.push({ field: unquote(f), desc: reverseAll ? !desc : desc, mode });
      sign = null;
    }
    if (!keys.length) throw new SplError("Error in 'sort' command: You must specify at least one field to sort by.");
    const rows = [...p.rows].sort((a, b) => {
      for (const k of keys) {
        let c: number;
        if (k.mode === 'str') c = str(a[k.field]) < str(b[k.field]) ? -1 : str(a[k.field]) > str(b[k.field]) ? 1 : 0;
        else c = compare(a[k.field], b[k.field]);
        // Missing values stay last in both directions.
        if (a[k.field] === undefined || b[k.field] === undefined) {
          if (a[k.field] === undefined && b[k.field] !== undefined) return 1;
          if (b[k.field] === undefined && a[k.field] !== undefined) return -1;
          continue;
        }
        if (c) return k.desc ? -c : c;
      }
      return 0;
    });
    return { ...p, rows: rows.slice(0, limit) };
  },

  head(args, p) {
    const m = /^(?:limit=)?(\d+)$/i.exec(args.trim());
    if (args.trim() && !m) throw new SplError(`Error in 'head' command: Invalid argument: '${args.trim()}'.`);
    return { ...p, rows: p.rows.slice(0, m ? Number(m[1]) : 10) };
  },

  tail(args, p) {
    const m = /^(\d+)$/.exec(args.trim());
    if (args.trim() && !m) throw new SplError(`Error in 'tail' command: Invalid argument: '${args.trim()}'.`);
    const n = m ? Number(m[1]) : 10;
    // Like Splunk, tail returns the last N in reverse order.
    return { ...p, rows: p.rows.slice(Math.max(0, p.rows.length - n)).reverse() };
  },

  reverse(_args, p) {
    return { ...p, rows: [...p.rows].reverse() };
  },

  dedup(args, p) {
    let ws = words(args);
    let n = 1;
    if (ws[0] && /^\d+$/.test(ws[0])) {
      n = Number(ws[0]);
      ws = ws.slice(1);
    }
    const sortAt = ws.findIndex((w) => /^sortby$/i.test(w));
    const fields = (sortAt >= 0 ? ws.slice(0, sortAt) : ws).filter((w) => !/^(keepempty|consecutive)=/i.test(w)).map(unquote);
    if (!fields.length) throw new SplError("Error in 'dedup' command: You must specify at least one field.");
    const seen = new Map<string, number>();
    let rows = p.rows.filter((r) => {
      if (fields.some((f) => r[f] === undefined || r[f] === null)) return false;
      const key = JSON.stringify(fields.map((f) => str(r[f])));
      const c = seen.get(key) ?? 0;
      if (c >= n) return false;
      seen.set(key, c + 1);
      return true;
    });
    if (sortAt >= 0) rows = COMMANDS.sort!(ws.slice(sortAt + 1).join(' '), { ...p, rows }, undefined as never, undefined as never).rows;
    return { ...p, rows };
  },

  top(args, p) {
    return topRare(args, p, 'top');
  },
  rare(args, p) {
    return topRare(args, p, 'rare');
  },

  rex(args, p) {
    const m = /^((?:\s*[a-z_]+=(?:"[^"]*"|\S+))*)\s*"((?:[^"\\]|\\.)*)"\s*$/is.exec(args);
    if (!m) throw new SplError("Error in 'rex' command: Usage: rex [field=<field>] [max_match=<int>] \"<regex>\"");
    const [opts] = options(words(m[1] ?? ''), ['field', 'max_match', 'mode']);
    const field = opts.field ?? '_raw';
    const max = opts.max_match !== undefined ? Number(opts.max_match) : 1;
    const pattern = m[2]!.replace(/\\"/g, '"').replace(/\(\?P</g, '(?<');
    let re: RegExp;
    try {
      re = new RegExp(pattern, 'g');
    } catch {
      throw new SplError(`Error in 'rex' command: Encountered the following error while compiling the regex '${pattern}': invalid pattern.`);
    }
    const names = [...pattern.matchAll(/\(\?<([A-Za-z_]\w*)>/g)].map((x) => x[1]!);
    if (!names.length) throw new SplError(`Error in 'rex' command: The regex '${pattern}' does not extract anything. It should specify at least one named group. Format: (?<name>...).`);
    const rows = p.rows.map((r) => {
      const text = str(r[field]);
      if (!text) return r;
      const out = { ...r };
      const found: Record<string, string[]> = {};
      re.lastIndex = 0;
      let hit: RegExpExecArray | null;
      let count = 0;
      while ((hit = re.exec(text)) && (max === 0 || count < max)) {
        count++;
        for (const n of names) if (hit.groups?.[n] !== undefined) (found[n] ??= []).push(hit.groups[n]!);
        if (hit[0] === '') re.lastIndex++;
      }
      for (const [n, vs] of Object.entries(found)) out[n] = vs.length === 1 ? vs[0]! : vs;
      return out;
    });
    const columns = p.columns ? [...p.columns, ...names.filter((n) => !p.columns!.includes(n))] : null;
    return { ...p, rows, columns };
  },

  lookup(args, p, st) {
    const ws = words(args);
    const name = unquote(ws[0] ?? '');
    const table = st.lookups[name] ?? st.lookups[name.replace(/\.csv$/, '')];
    if (!table) throw new SplError(`Error in 'lookup' command: Could not construct lookup '${ws.join(', ')}'. See search.log for more details.`);
    let i = 1;
    const lookupField = unquote(ws[i++] ?? '');
    let eventField = lookupField;
    if (ws[i] && /^as$/i.test(ws[i]!)) {
      eventField = unquote(ws[i + 1] ?? lookupField);
      i += 2;
    }
    let outputs: [string, string][] = [];
    let onlyNew = false;
    if (ws[i] && /^output(new)?$/i.test(ws[i]!)) {
      onlyNew = /new$/i.test(ws[i]!);
      i++;
      while (i < ws.length) {
        const src = unquote(ws[i]!);
        if (ws[i + 1] && /^as$/i.test(ws[i + 1]!)) {
          outputs.push([src, unquote(ws[i + 2] ?? src)]);
          i += 3;
        } else {
          outputs.push([src, src]);
          i++;
        }
      }
    } else {
      outputs = fieldNames(table).filter((f) => f !== lookupField).map((f) => [f, f]);
    }
    const index = new Map<string, Row>();
    for (const row of table) index.set(str(row[lookupField]).toLowerCase(), row);
    const rows = p.rows.map((r) => {
      const hit = values(r[eventField]).map((v) => index.get(str(v).toLowerCase())).find(Boolean);
      if (!hit) return r;
      const out = { ...r };
      for (const [src, dst] of outputs) if (!(onlyNew && out[dst] !== undefined) && hit[src] !== undefined) out[dst] = hit[src]!;
      return out;
    });
    const columns = p.columns ? [...p.columns, ...outputs.map(([, d]) => d).filter((d) => !p.columns!.includes(d))] : null;
    return { ...p, rows, columns };
  },

  fillnull(args, p) {
    const [opts, ws] = options(words(args), ['value']);
    const value: Scalar = opts.value !== undefined ? (isNumeric(opts.value) ? Number(opts.value) : opts.value) : 0;
    const fields = ws.length ? ws.map(unquote) : asTable(p);
    const rows = p.rows.map((r) => {
      const out = { ...r };
      for (const f of fields) if (out[f] === undefined || out[f] === null || out[f] === '') out[f] = value;
      return out;
    });
    return { ...p, rows };
  },

  mvexpand(args, p) {
    const field = unquote(words(args)[0] ?? '');
    if (!field) throw new SplError("Error in 'mvexpand' command: You must specify a field.");
    const rows = p.rows.flatMap((r) => {
      const vs = values(r[field]);
      if (vs.length <= 1) return [r];
      return vs.map((v) => ({ ...r, [field]: v }));
    });
    return { ...p, rows };
  },
};

COMMANDS.bucket = COMMANDS.bin!;

function topRare(args: string, p: Pipe, kind: 'top' | 'rare'): Pipe {
  const [opts, ws] = options(words(args), ['limit', 'countfield', 'percentfield', 'showperc', 'showcount', 'useother']);
  const byAt = ws.findIndex((w) => /^by$/i.test(w));
  const fields = (byAt >= 0 ? ws.slice(0, byAt) : ws).map(unquote);
  const by = byAt >= 0 ? ws.slice(byAt + 1).map(unquote) : [];
  if (!fields.length) throw new SplError(`Error in '${kind}' command: You must specify at least one field.`);
  const limit = opts.limit !== undefined ? Number(opts.limit) : 10;
  const countField = opts.countfield ?? 'count';
  const percentField = opts.percentfield ?? 'percent';
  const showPerc = !/^(f|false|0)$/i.test(opts.showperc ?? 'true');
  const outer = by.length ? group(p.rows, by) : [{ key: [] as Scalar[], rows: p.rows }];
  const rows: Row[] = [];
  for (const g of outer) {
    const inner = group(g.rows, fields);
    const total = g.rows.length;
    inner.sort((a, b) => (kind === 'top' ? b.rows.length - a.rows.length : a.rows.length - b.rows.length) || compare(a.key[0], b.key[0]));
    for (const ig of limit > 0 ? inner.slice(0, limit) : inner) {
      const r: Row = {};
      by.forEach((f, i) => (r[f] = g.key[i]!));
      fields.forEach((f, i) => (r[f] = ig.key[i]!));
      r[countField] = ig.rows.length;
      if (showPerc) r[percentField] = Number(((ig.rows.length / total) * 100).toFixed(6));
      rows.push(r);
    }
  }
  return { rows, columns: [...by, ...fields, countField, ...(showPerc ? [percentField] : [])], scanned: p.scanned };
}

/** Commands that start a search (`| makeresults`, `| inputlookup x`). */
function generate(seg: string, st: SiemState): Pipe {
  const [name = '', ...rest] = seg.split(/\s+/);
  const args = rest.join(' ');
  if (name === 'makeresults') {
    const m = /count=(\d+)/.exec(args);
    const n = m ? Number(m[1]) : 1;
    return { rows: Array.from({ length: n }, () => ({ _time: st.now })), columns: ['_time'], scanned: 0 };
  }
  if (name === 'inputlookup') {
    const lname = unquote(words(args)[0] ?? '');
    const table = st.lookups[lname] ?? st.lookups[lname.replace(/\.csv$/, '')];
    if (!table) throw new SplError(`Error in 'inputlookup' command: The lookup table '${lname}' requires a .csv or KV store lookup definition.`);
    return { rows: table.map((r) => ({ ...r })), columns: fieldNames(table), scanned: 0 };
  }
  if (!name) throw new SplError('Search pipeline may not be empty.');
  if (COMMANDS[name.toLowerCase()]) throw new SplError(`Error in '${name}' command: This command must be the first command of a search, or follow another command.`);
  throw new SplError(`Unknown search command '${name}'.`);
}

/** All events of all indexes, newest first. */
function allEvents(st: SiemState): SiemEvent[] {
  return Object.values(st.indexes)
    .flat()
    .sort((a, b) => b._time - a._time);
}

export function runSpl(st: SiemState, query: string): SiemResult {
  const ctx: EvalCtx = { now: st.now };
  const base = (p: Pipe): SiemResult => {
    const columns = p.columns ?? ['_time', '_raw'];
    const timeColumns = columns.filter((c) => c === '_time' || c === 'earliest_time' || c === 'latest_time');
    return { lang: 'spl', mode: p.columns ? 'table' : 'events', columns, rows: p.rows, timeColumns, chart: p.chart, scanned: p.scanned };
  };
  try {
    const segs = splitPipes(query.trim());
    if (!segs[0] && segs.length === 1) throw new SplError('Search pipeline may not be empty.');
    let p: Pipe;
    let rest: string[];
    if (segs[0] === '' && segs.length > 1) {
      p = generate(segs[1]!, st);
      rest = segs.slice(2);
    } else {
      const { node, earliest, latest } = parseSearch(segs[0]!.replace(/^search\s+/i, ''), st.now);
      const cache = new Map<string, RegExp>();
      const rows = allEvents(st).filter((e) => (earliest === null || e._time >= earliest) && (latest === null || e._time < latest) && matchNode(node, e, cache));
      p = { rows, columns: null, scanned: rows.length };
      rest = segs.slice(1);
    }
    for (const seg of rest) {
      if (!seg) throw new SplError('Search pipeline may not be empty.');
      const m = /^(\S+)\s*([\s\S]*)$/.exec(seg)!;
      const name = m[1]!.toLowerCase();
      const cmd = COMMANDS[name];
      if (!cmd) {
        if (name === 'makeresults' || name === 'inputlookup') throw new SplError(`Error in '${name}' command: This command must be the first command of a search.`);
        throw new SplError(`Unknown search command '${m[1]}'.`);
      }
      p = cmd(m[2]!, p, st, ctx);
    }
    return base(p);
  } catch (err) {
    if (err instanceof SplError) return { lang: 'spl', mode: 'table', columns: [], rows: [], timeColumns: [], error: err.message };
    throw err;
  }
}

/** Field names that appear in events, for the sidebar. */
export function eventFields(rows: Row[]): string[] {
  return fieldNames(rows).filter((f) => f !== '_raw' && f !== '_time');
}
