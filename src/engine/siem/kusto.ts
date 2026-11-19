/*
 * Kusto Query Language (Microsoft Sentinel / Defender) over the lab's tables. Supported operators: where, project,
 * project-away, project-rename, extend, summarize, order/sort by, take/limit, top, count, distinct, join, getschema,
 * render. Kept from the real language because labs teach it: `==` is case-sensitive and `=~` is not, `has` matches
 * whole terms while `contains` matches any substring, `sort by` is descending unless told otherwise, summarize names
 * its columns count_, dcount_X, and an unknown column is an error rather than an empty result.
 */

import type { ChartSpec, Row, Scalar, SiemResult, SiemState, Val } from './types';
import { cidrMatch, compare, isNumeric, num, str, strftime } from './values';

class KqlError extends Error {}

type Tok =
  | { t: 'num'; v: number }
  | { t: 'span'; v: number }
  | { t: 'str'; v: string }
  | { t: 'dt'; v: number }
  | { t: 'id'; v: string }
  | { t: 'op'; v: string };

const OPS = ['$left.', '$right.', '|', '==', '!=', '=~', '!~', '<=', '>=', '..', '<', '>', '=', '+', '-', '*', '/', '%', '(', ')', ',', '.', '[', ']'];
const SPAN_UNITS: Record<string, number> = { d: 86400, day: 86400, days: 86400, h: 3600, hr: 3600, hrs: 3600, hour: 3600, hours: 3600, m: 60, min: 60, minute: 60, minutes: 60, s: 1, sec: 1, second: 1, seconds: 1, ms: 0.001 };

function tokenize(src: string): Tok[] {
  const out: Tok[] = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i]!;
    if (/\s/.test(c)) {
      i++;
      continue;
    }
    if (c === '/' && src[i + 1] === '/') {
      while (i < src.length && src[i] !== '\n') i++;
      continue;
    }
    const verbatim = c === '@' && (src[i + 1] === '"' || src[i + 1] === "'");
    if (c === '"' || c === "'" || verbatim) {
      const q = verbatim ? src[i + 1]! : c;
      let j = verbatim ? i + 2 : i + 1;
      let text = '';
      while (j < src.length && src[j] !== q) {
        if (!verbatim && src[j] === '\\' && j + 1 < src.length) {
          const n = src[j + 1]!;
          text += n === 'n' ? '\n' : n === 't' ? '\t' : n;
          j += 2;
        } else text += src[j++];
      }
      if (j >= src.length) throw new KqlError('Syntax error: unterminated string literal.');
      out.push({ t: 'str', v: text });
      i = j + 1;
      continue;
    }
    if (/\d/.test(c)) {
      const m = /^(\d+(?:\.\d+)?)(ms|min|minutes?|hours?|hrs?|days?|seconds?|sec|d|h|m|s)?(?![A-Za-z_])/.exec(src.slice(i));
      if (m) {
        if (m[2]) out.push({ t: 'span', v: Number(m[1]) * SPAN_UNITS[m[2]]! });
        else out.push({ t: 'num', v: Number(m[1]) });
        i += m[0].length;
        continue;
      }
    }
    if (/[A-Za-z_!]/.test(c)) {
      const m = /^!?[A-Za-z_][A-Za-z0-9_]*(?:-[a-z]+)*~?/.exec(src.slice(i));
      if (m) {
        const word = m[0];
        // datetime(2026-11-16 04:32) holds a raw literal.
        if (word === 'datetime' && src.slice(i + word.length).trimStart().startsWith('(')) {
          const open = src.indexOf('(', i);
          const close = src.indexOf(')', open);
          if (close < 0) throw new KqlError('Syntax error: datetime literal is not closed.');
          const raw = src.slice(open + 1, close).trim().replace(/^["']|["']$/g, '');
          const t = parseDate(raw);
          if (t === null) throw new KqlError(`Syntax error: '${raw}' is not a valid datetime literal.`);
          out.push({ t: 'dt', v: t });
          i = close + 1;
          continue;
        }
        // Operator names with dashes (project-away, mv-expand) are words; `a-b` with spaces stays arithmetic.
        const plain = /^!?[A-Za-z_][A-Za-z0-9_]*~?/.exec(word)![0];
        const isDashed = word !== plain && /^(project-away|project-rename|project-reorder|project-keep|mv-expand|make-series)$/.test(word);
        out.push({ t: 'id', v: isDashed ? word : plain });
        i += isDashed ? word.length : plain.length;
        continue;
      }
    }
    const op = OPS.find((o) => src.startsWith(o, i));
    if (!op) throw new KqlError(`Syntax error: Query could not be parsed at '${src.slice(i, i + 12)}'.`);
    out.push({ t: 'op', v: op });
    i += op.length;
  }
  return out;
}

function parseDate(s: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?Z?$/.exec(s.trim());
  if (!m) return null;
  return Date.UTC(+m[1]!, +m[2]! - 1, +m[3]!, +(m[4] ?? 0), +(m[5] ?? 0), +(m[6] ?? 0)) / 1000;
}

/* ── expressions ─────────────────────────────────────────────────── */

type Expr =
  | { k: 'lit'; v: Scalar; time?: boolean; span?: boolean }
  | { k: 'col'; name: string }
  | { k: 'call'; fn: string; args: Expr[] }
  | { k: 'bin'; op: string; a: Expr; b: Expr }
  | { k: 'neg'; a: Expr }
  | { k: 'list'; op: string; a: Expr; list: Expr[] }
  | { k: 'between'; neg: boolean; a: Expr; lo: Expr; hi: Expr }
  | { k: 'star' };

const STRING_OPS = ['contains', '!contains', 'contains_cs', '!contains_cs', 'has', '!has', 'has_cs', '!has_cs', 'startswith', '!startswith', 'startswith_cs', 'endswith', '!endswith', 'endswith_cs', 'matches', 'hasprefix', 'hassuffix'];
const LIST_OPS = ['in', '!in', 'in~', '!in~', 'has_any', 'has_all'];

class Parser {
  pos = 0;
  constructor(public toks: Tok[]) {}
  peek(o = 0) {
    return this.toks[this.pos + o];
  }
  isOp(v: string) {
    const t = this.peek();
    return t?.t === 'op' && t.v === v;
  }
  isId(v: string) {
    const t = this.peek();
    return t?.t === 'id' && t.v === v;
  }
  expectOp(v: string) {
    if (!this.isOp(v)) throw new KqlError(`Syntax error: expected '${v}'${this.peek() ? ` near '${tokText(this.peek()!)}'` : ' at the end of the query'}.`);
    this.pos++;
  }
  done() {
    return this.pos >= this.toks.length;
  }

  expr(min = 0): Expr {
    let left = this.prefix();
    for (;;) {
      const t = this.peek();
      if (!t) break;
      let op: string | null = null;
      let prec = 0;
      if (t.t === 'id' && t.v === 'or') [op, prec] = ['or', 1];
      else if (t.t === 'id' && t.v === 'and') [op, prec] = ['and', 2];
      else if (t.t === 'op' && ['==', '!=', '=~', '!~', '<', '>', '<=', '>='].includes(t.v)) [op, prec] = [t.v, 4];
      else if (t.t === 'id' && (STRING_OPS.includes(t.v) || LIST_OPS.includes(t.v) || t.v === 'between' || t.v === '!between')) [op, prec] = [t.v, 4];
      else if (t.t === 'op' && (t.v === '+' || t.v === '-')) [op, prec] = [t.v, 5];
      else if (t.t === 'op' && ['*', '/', '%'].includes(t.v)) [op, prec] = [t.v, 6];
      if (!op || prec <= min) break;
      this.pos++;
      if (LIST_OPS.includes(op)) {
        this.expectOp('(');
        const list: Expr[] = [];
        if (!this.isOp(')')) {
          do list.push(this.expr());
          while (this.isOp(',') && ++this.pos);
        }
        this.expectOp(')');
        left = { k: 'list', op, a: left, list };
      } else if (op === 'between' || op === '!between') {
        this.expectOp('(');
        const lo = this.expr();
        this.expectOp('..');
        const hi = this.expr();
        this.expectOp(')');
        left = { k: 'between', neg: op === '!between', a: left, lo, hi };
      } else if (op === 'matches') {
        if (!this.isId('regex')) throw new KqlError("Syntax error: expected 'regex' after 'matches'.");
        this.pos++;
        left = { k: 'bin', op: 'matches regex', a: left, b: this.expr(prec) };
      } else left = { k: 'bin', op, a: left, b: this.expr(prec) };
    }
    return left;
  }

  prefix(): Expr {
    const t = this.peek();
    if (!t) throw new KqlError('Syntax error: the expression ended unexpectedly.');
    this.pos++;
    if (t.t === 'num') return { k: 'lit', v: t.v };
    if (t.t === 'str') return { k: 'lit', v: t.v };
    if (t.t === 'span') return { k: 'lit', v: t.v, span: true };
    if (t.t === 'dt') return { k: 'lit', v: t.v, time: true };
    if (t.t === 'op') {
      if (t.v === '(') {
        const e = this.expr();
        this.expectOp(')');
        return e;
      }
      if (t.v === '-') return { k: 'neg', a: this.expr(6) };
      if (t.v === '*') return { k: 'star' };
      if (t.v === '$left.' || t.v === '$right.') {
        const id = this.peek();
        if (id?.t !== 'id') throw new KqlError('Syntax error: expected a column name.');
        this.pos++;
        return { k: 'col', name: `${t.v}${id.v}` };
      }
      throw new KqlError(`Syntax error: Query could not be parsed at '${t.v}'.`);
    }
    if (t.v === 'true' || t.v === 'false') return { k: 'lit', v: t.v };
    if (t.v === 'not' && this.isOp('(')) {
      this.pos++;
      const a = this.expr();
      this.expectOp(')');
      return { k: 'call', fn: 'not', args: [a] };
    }
    if (this.isOp('(')) {
      this.pos++;
      const args: Expr[] = [];
      if (!this.isOp(')')) {
        do args.push(this.expr());
        while (this.isOp(',') && ++this.pos);
      }
      this.expectOp(')');
      const fn = t.v;
      if (!(fn in SCALARS) && !(fn in AGGS) && fn !== 'arg_max' && fn !== 'arg_min') throw new KqlError(`Unknown function: '${fn}'.`);
      return { k: 'call', fn, args };
    }
    return { k: 'col', name: t.v };
  }
}

function tokText(t: Tok): string {
  return t.t === 'str' ? `"${t.v}"` : String(t.v);
}

/* ── evaluation ──────────────────────────────────────────────────── */

type KVal = Scalar | Scalar[] | boolean;

interface Env {
  cols: Set<string>;
  now: number;
}

const bool = (v: KVal): boolean => v === true || v === 'true';

function scalar(v: KVal): Scalar {
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

function termHas(text: string, term: string, cs: boolean): boolean {
  const t = cs ? term : term.toLowerCase();
  const s = cs ? text : text.toLowerCase();
  if (!t) return true;
  let i = s.indexOf(t);
  while (i >= 0) {
    const before = i === 0 || !/[A-Za-z0-9]/.test(s[i - 1]!);
    const after = i + t.length >= s.length || !/[A-Za-z0-9]/.test(s[i + t.length]!);
    if (before && after) return true;
    i = s.indexOf(t, i + 1);
  }
  return false;
}

function eqVal(a: Scalar, b: Scalar, ci: boolean): boolean {
  if (a === null || b === null) return false;
  if (typeof a === 'number' || typeof b === 'number') {
    if (isNumeric(a) && isNumeric(b)) return Number(a) === Number(b);
  }
  return ci ? String(a).toLowerCase() === String(b).toLowerCase() : String(a) === String(b);
}

function evalK(e: Expr, row: Row, env: Env): KVal {
  switch (e.k) {
    case 'lit':
      return e.v;
    case 'star':
      return null;
    case 'col': {
      if (!env.cols.has(e.name)) throw new KqlError(`Failed to resolve scalar expression named '${e.name}'.`);
      const v = row[e.name];
      return v === undefined ? null : v;
    }
    case 'neg': {
      const n = num(scalar(evalK(e.a, row, env)));
      return n === null ? null : -n;
    }
    case 'between': {
      const v = num(scalar(evalK(e.a, row, env)));
      const lo = num(scalar(evalK(e.lo, row, env)));
      const hi = num(scalar(evalK(e.hi, row, env)));
      if (v === null || lo === null || hi === null) return false;
      const inside = v >= lo && v <= hi;
      return e.neg ? !inside : inside;
    }
    case 'list': {
      const v = evalK(e.a, row, env);
      const list = e.list.flatMap((x) => {
        const r = evalK(x, row, env);
        return Array.isArray(r) ? r : [scalar(r)];
      });
      if (e.op === 'has_any') return list.some((l) => l !== null && termHas(str(scalar(v)), str(l), false));
      if (e.op === 'has_all') return list.every((l) => l !== null && termHas(str(scalar(v)), str(l), false));
      const ci = e.op.endsWith('~');
      const hit = list.some((l) => eqVal(scalar(v), l, ci));
      return e.op.startsWith('!') ? !hit : hit;
    }
    case 'call': {
      const f = SCALARS[e.fn];
      if (!f) throw new KqlError(`'${e.fn}' can only be used inside summarize.`);
      return f(e.args, row, env);
    }
    case 'bin':
      return binary(e, row, env);
  }
}

function binary(e: Extract<Expr, { k: 'bin' }>, row: Row, env: Env): KVal {
  if (e.op === 'and') return bool(evalK(e.a, row, env)) && bool(evalK(e.b, row, env));
  if (e.op === 'or') return bool(evalK(e.a, row, env)) || bool(evalK(e.b, row, env));
  const a = scalar(evalK(e.a, row, env));
  const b = scalar(evalK(e.b, row, env));
  switch (e.op) {
    case '==':
      return eqVal(a, b, false);
    case '!=':
      return a !== null && b !== null && !eqVal(a, b, false);
    case '=~':
      return eqVal(a, b, true);
    case '!~':
      return a !== null && b !== null && !eqVal(a, b, true);
    case '<':
    case '>':
    case '<=':
    case '>=': {
      if (a === null || b === null) return false;
      const c = compare(a, b);
      return e.op === '<' ? c < 0 : e.op === '>' ? c > 0 : e.op === '<=' ? c <= 0 : c >= 0;
    }
    case '+':
    case '-':
    case '*':
    case '/':
    case '%': {
      const x = num(a);
      const y = num(b);
      if (x === null || y === null) return null;
      if (e.op === '+') return x + y;
      if (e.op === '-') return x - y;
      if (e.op === '*') return x * y;
      if (y === 0) return null;
      return e.op === '/' ? x / y : x % y;
    }
    case 'matches regex': {
      let re: RegExp;
      try {
        re = new RegExp(str(b));
      } catch {
        throw new KqlError(`Invalid regular expression: '${str(b)}'.`);
      }
      return a !== null && re.test(str(a));
    }
  }
  const text = str(a);
  const pat = str(b);
  const neg = e.op.startsWith('!');
  const op = e.op.replace(/^!/, '');
  const cs = op.endsWith('_cs');
  const base = op.replace(/_cs$/, '');
  const t = cs ? text : text.toLowerCase();
  const p = cs ? pat : pat.toLowerCase();
  let hit = false;
  if (a !== null) {
    if (base === 'contains') hit = t.includes(p);
    else if (base === 'has') hit = termHas(text, pat, cs);
    else if (base === 'startswith') hit = t.startsWith(p);
    else if (base === 'endswith') hit = t.endsWith(p);
    else if (base === 'hasprefix') hit = t.split(/[^a-z0-9]+/i).some((w) => w.startsWith(p));
    else if (base === 'hassuffix') hit = t.split(/[^a-z0-9]+/i).some((w) => w.endsWith(p));
  }
  return neg ? a !== null && !hit : hit;
}

type ScalarFn = (args: Expr[], row: Row, env: Env) => KVal;
const arg = (args: Expr[], i: number, row: Row, env: Env): Scalar => (args[i] ? scalar(evalK(args[i]!, row, env)) : null);

const SCALARS: Record<string, ScalarFn> = {
  ago: (a, r, e) => e.now - (num(arg(a, 0, r, e)) ?? 0),
  now: (a, r, e) => e.now + (num(arg(a, 0, r, e)) ?? 0),
  bin: (a, r, e) => {
    const v = num(arg(a, 0, r, e));
    const size = num(arg(a, 1, r, e));
    if (v === null || !size) return null;
    return Math.floor(v / size) * size;
  },
  strcat: (a, r, e) => a.map((x) => str(scalar(evalK(x, r, e)))).join(''),
  tolower: (a, r, e) => str(arg(a, 0, r, e)).toLowerCase(),
  toupper: (a, r, e) => str(arg(a, 0, r, e)).toUpperCase(),
  strlen: (a, r, e) => str(arg(a, 0, r, e)).length,
  substring: (a, r, e) => {
    const s = str(arg(a, 0, r, e));
    const start = num(arg(a, 1, r, e)) ?? 0;
    const len = a[2] ? num(arg(a, 2, r, e)) : null;
    return len === null ? s.slice(start) : s.substr(start, len);
  },
  split: (a, r, e) => {
    const parts = str(arg(a, 0, r, e)).split(str(arg(a, 1, r, e)));
    if (a[2]) {
      const i = num(arg(a, 2, r, e)) ?? 0;
      return parts[i] !== undefined ? [parts[i]!] : [];
    }
    return parts;
  },
  tostring: (a, r, e) => {
    const v = arg(a, 0, r, e);
    return v === null ? '' : str(v);
  },
  toint: (a, r, e) => {
    const n = num(arg(a, 0, r, e));
    return n === null ? null : Math.trunc(n);
  },
  todouble: (a, r, e) => num(arg(a, 0, r, e)),
  todatetime: (a, r, e) => {
    const v = arg(a, 0, r, e);
    if (typeof v === 'number') return v;
    return v === null ? null : parseDate(String(v));
  },
  iff: (a, r, e) => (bool(evalK(a[0]!, r, e)) ? evalK(a[1]!, r, e) : evalK(a[2]!, r, e)),
  case: (a, r, e) => {
    let i = 0;
    for (; i + 1 < a.length; i += 2) if (bool(evalK(a[i]!, r, e))) return evalK(a[i + 1]!, r, e);
    return i < a.length ? evalK(a[i]!, r, e) : null;
  },
  not: (a, r, e) => !bool(evalK(a[0]!, r, e)),
  isempty: (a, r, e) => {
    const v = arg(a, 0, r, e);
    return v === null || v === '';
  },
  isnotempty: (a, r, e) => {
    const v = arg(a, 0, r, e);
    return v !== null && v !== '';
  },
  isnull: (a, r, e) => arg(a, 0, r, e) === null,
  isnotnull: (a, r, e) => arg(a, 0, r, e) !== null,
  coalesce: (a, r, e) => {
    for (const x of a) {
      const v = scalar(evalK(x, r, e));
      if (v !== null && v !== '') return v;
    }
    return null;
  },
  extract: (a, r, e) => {
    let re: RegExp;
    try {
      re = new RegExp(str(arg(a, 0, r, e)));
    } catch {
      throw new KqlError('extract(): invalid regular expression.');
    }
    const m = re.exec(str(arg(a, 2, r, e)));
    const g = num(arg(a, 1, r, e)) ?? 0;
    return m ? (m[g] ?? '') : '';
  },
  replace_string: (a, r, e) => str(arg(a, 0, r, e)).split(str(arg(a, 1, r, e))).join(str(arg(a, 2, r, e))),
  format_datetime: (a, r, e) => {
    const t = num(arg(a, 0, r, e));
    if (t === null) return null;
    const fmt = str(arg(a, 1, r, e));
    return fmt
      .replace(/yyyy/g, '%Y')
      .replace(/MM/g, '%m')
      .replace(/dd/g, '%d')
      .replace(/HH/g, '%H')
      .replace(/mm/g, '%M')
      .replace(/ss/g, '%S')
      .replace(/%[YmdHMS]/g, (m) => strftime(t, m));
  },
  hourofday: (a, r, e) => {
    const t = num(arg(a, 0, r, e));
    return t === null ? null : new Date(t * 1000).getUTCHours();
  },
  round: (a, r, e) => {
    const n = num(arg(a, 0, r, e));
    const d = num(arg(a, 1, r, e)) ?? 0;
    return n === null ? null : Number(n.toFixed(d));
  },
  abs: (a, r, e) => {
    const n = num(arg(a, 0, r, e));
    return n === null ? null : Math.abs(n);
  },
  array_length: (a, r, e) => {
    const v = a[0] ? evalK(a[0], r, e) : null;
    return Array.isArray(v) ? v.length : null;
  },
  ipv4_is_in_range: (a, r, e) => cidrMatch(str(arg(a, 1, r, e)), str(arg(a, 0, r, e))),
  ipv4_is_private: (a, r, e) => {
    const ip = str(arg(a, 0, r, e));
    return ['10.0.0.0/8', '172.16.0.0/12', '192.168.0.0/16'].some((c) => cidrMatch(c, ip));
  },
  base64_decode_tostring: (a, r, e) => {
    try {
      return atob(str(arg(a, 0, r, e)));
    } catch {
      return null;
    }
  },
};
SCALARS.iif = SCALARS.iff!;
SCALARS.floor = SCALARS.bin!;
SCALARS.tolong = SCALARS.toint!;
SCALARS.toreal = SCALARS.todouble!;

/* ── aggregates ──────────────────────────────────────────────────── */

type AggFn = (args: Expr[], rows: Row[], env: Env) => Val;

const AGGS: Record<string, AggFn> = {
  count: (_a, rows) => rows.length,
  countif: (a, rows, env) => rows.filter((r) => bool(evalK(a[0]!, r, env))).length,
  dcount: (a, rows, env) => new Set(rows.map((r) => scalar(evalK(a[0]!, r, env))).filter((v) => v !== null && v !== '').map((v) => str(v))).size,
  sum: (a, rows, env) => rows.reduce((s, r) => s + (num(scalar(evalK(a[0]!, r, env))) ?? 0), 0),
  avg: (a, rows, env) => {
    const ns = rows.map((r) => num(scalar(evalK(a[0]!, r, env)))).filter((n): n is number => n !== null);
    return ns.length ? ns.reduce((x, y) => x + y, 0) / ns.length : null;
  },
  min: (a, rows, env) => extreme(a, rows, env, -1),
  max: (a, rows, env) => extreme(a, rows, env, 1),
  make_set: (a, rows, env) => {
    const limit = a[1] ? (num(scalar(evalK(a[1], {}, env))) ?? 1048576) : 1048576;
    const out: string[] = [];
    for (const r of rows) {
      const v = evalK(a[0]!, r, env);
      for (const x of Array.isArray(v) ? v : [scalar(v)]) if (x !== null && x !== '' && !out.includes(str(x)) && out.length < limit) out.push(str(x));
    }
    return out;
  },
  make_list: (a, rows, env) => rows.flatMap((r) => {
    const v = evalK(a[0]!, r, env);
    return (Array.isArray(v) ? v : [scalar(v)]).filter((x) => x !== null).map((x) => str(x));
  }),
};
AGGS.make_set_if = AGGS.make_set!;

function extreme(a: Expr[], rows: Row[], env: Env, dir: 1 | -1): Val {
  let best: Scalar = null;
  for (const r of rows) {
    const v = scalar(evalK(a[0]!, r, env));
    if (v === null || v === '') continue;
    if (best === null || compare(v, best) * dir > 0) best = v;
  }
  return best;
}

/* ── pipeline ────────────────────────────────────────────────────── */

interface Tab {
  rows: Row[];
  columns: string[];
  time: Set<string>;
  chart?: ChartSpec;
}

/** Splits on `|` outside quotes and parentheses (a join's subquery keeps its own pipes). */
function splitPipes(q: string): string[] {
  const out: string[] = [];
  let cur = '';
  let quote: string | null = null;
  let depth = 0;
  for (let i = 0; i < q.length; i++) {
    const c = q[i]!;
    if (quote) {
      if (c === '\\' && quote !== '@') {
        cur += c + (q[i + 1] ?? '');
        i++;
        continue;
      }
      if (c === quote) quote = null;
      cur += c;
      continue;
    }
    if (c === '"' || c === "'") quote = c;
    if (c === '(') depth++;
    if (c === ')') depth--;
    if (c === '|' && depth === 0) {
      out.push(cur);
      cur = '';
    } else cur += c;
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

/** A default column name for an expression (Kusto: Column1 for anything that is not a plain column). */
function exprName(e: Expr, fallback: string): string {
  if (e.k === 'col') return e.name.replace(/^\$(left|right)\./, '');
  if (e.k === 'call' && (e.fn === 'bin' || e.fn === 'floor') && e.args[0]?.k === 'col') return e.args[0].name;
  return fallback;
}

function isTimeExpr(e: Expr, time: Set<string>): boolean {
  if (e.k === 'lit') return !!e.time;
  if (e.k === 'col') return time.has(e.name);
  if (e.k === 'call') {
    if (['ago', 'now', 'todatetime'].includes(e.fn)) return true;
    if (['bin', 'floor', 'min', 'max', 'iff', 'iif', 'coalesce'].includes(e.fn)) return e.args.some((x) => isTimeExpr(x, time));
  }
  if (e.k === 'bin' && (e.op === '+' || e.op === '-')) {
    // datetime ± timespan stays a datetime; datetime − datetime is a timespan.
    return isTimeExpr(e.a, time) && !isTimeExpr(e.b, time);
  }
  return false;
}

function toCell(v: KVal): Val {
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  return v;
}

/** Parses `name = expr, expr, ...` lists (project, extend, summarize by). */
function namedList(p: Parser, stopWords: string[] = []): { name: string | null; e: Expr }[] {
  const out: { name: string | null; e: Expr }[] = [];
  while (!p.done()) {
    const t = p.peek()!;
    if (t.t === 'id' && stopWords.includes(t.v)) break;
    let name: string | null = null;
    if (t.t === 'id' && p.peek(1)?.t === 'op' && (p.peek(1) as { v: string }).v === '=') {
      name = t.v;
      p.pos += 2;
    }
    out.push({ name, e: p.expr() });
    if (!p.isOp(',')) break;
    p.pos++;
  }
  return out;
}

function runOperator(seg: string, tab: Tab, st: SiemState): Tab {
  const toks = tokenize(seg);
  const head = toks[0];
  if (!head || head.t !== 'id') throw new KqlError(`Syntax error: Query could not be parsed at '${seg.slice(0, 12)}'.`);
  const p = new Parser(toks);
  p.pos = 1;
  const env: Env = { cols: new Set(tab.columns), now: st.now };
  const op = head.v;
  const finish = () => {
    if (!p.done()) throw new KqlError(`Syntax error: Query could not be parsed at '${tokText(p.peek()!)}'.`);
  };

  switch (op) {
    case 'where':
    case 'filter': {
      const e = p.expr();
      finish();
      return { ...tab, rows: tab.rows.filter((r) => bool(evalK(e, r, env))) };
    }
    case 'take':
    case 'limit': {
      const n = p.expr();
      finish();
      return { ...tab, rows: tab.rows.slice(0, num(scalar(evalK(n, {}, env))) ?? 0) };
    }
    case 'count': {
      finish();
      return { rows: [{ Count: tab.rows.length }], columns: ['Count'], time: new Set() };
    }
    case 'project':
    case 'extend': {
      const list = namedList(p);
      finish();
      if (!list.length) throw new KqlError(`Syntax error: '${op}' needs at least one column.`);
      let n = 1;
      const named = list.map(({ name, e }) => ({ name: name ?? exprName(e, `Column${n++}`), e }));
      const rows = tab.rows.map((r) => {
        const out: Row = op === 'extend' ? { ...r } : {};
        for (const { name, e } of named) {
          const v = toCell(evalK(e, r, env));
          if (v === null) delete out[name];
          else out[name] = v;
        }
        return out;
      });
      const newCols = named.map((x) => x.name);
      const columns = op === 'extend' ? [...tab.columns.filter((c) => !newCols.includes(c)), ...newCols] : newCols;
      const time = new Set(op === 'extend' ? tab.time : []);
      for (const { name, e } of named) {
        if (isTimeExpr(e, tab.time)) time.add(name);
        else time.delete(name);
      }
      return { rows, columns, time };
    }
    case 'project-away': {
      const names = namedList(p).map(({ e }) => exprName(e, ''));
      finish();
      for (const n of names) if (!tab.columns.includes(n)) throw new KqlError(`Failed to resolve scalar expression named '${n}'.`);
      return { ...tab, columns: tab.columns.filter((c) => !names.includes(c)), rows: tab.rows.map((r) => Object.fromEntries(Object.entries(r).filter(([k]) => !names.includes(k)))) };
    }
    case 'project-rename': {
      const list = namedList(p);
      finish();
      const pairs = list.map(({ name, e }) => [exprName(e, ''), name ?? ''] as const);
      for (const [from] of pairs) if (!tab.columns.includes(from)) throw new KqlError(`Failed to resolve scalar expression named '${from}'.`);
      const ren = (c: string) => pairs.find(([f]) => f === c)?.[1] ?? c;
      return {
        columns: tab.columns.map(ren),
        time: new Set([...tab.time].map(ren)),
        rows: tab.rows.map((r) => Object.fromEntries(Object.entries(r).map(([k, v]) => [ren(k), v]))),
      };
    }
    case 'distinct': {
      const star = p.isOp('*');
      const cols = star ? (p.pos++, tab.columns) : namedList(p).map(({ e }) => exprName(e, ''));
      finish();
      for (const c of cols) if (!tab.columns.includes(c)) throw new KqlError(`Failed to resolve scalar expression named '${c}'.`);
      const seen = new Set<string>();
      const rows: Row[] = [];
      for (const r of tab.rows) {
        const key = JSON.stringify(cols.map((c) => str(r[c])));
        if (seen.has(key)) continue;
        seen.add(key);
        rows.push(Object.fromEntries(cols.filter((c) => r[c] !== undefined).map((c) => [c, r[c]!])));
      }
      return { rows, columns: cols, time: new Set(cols.filter((c) => tab.time.has(c))) };
    }
    case 'sort':
    case 'order': {
      if (!p.isId('by')) throw new KqlError(`Syntax error: expected 'by' after '${op}'.`);
      p.pos++;
      const keys: { e: Expr; desc: boolean }[] = [];
      while (!p.done()) {
        const e = p.expr();
        let desc = true;
        if (p.isId('asc')) {
          desc = false;
          p.pos++;
        } else if (p.isId('desc')) p.pos++;
        if (p.isId('nulls')) p.pos += 2;
        keys.push({ e, desc });
        if (!p.isOp(',')) break;
        p.pos++;
      }
      finish();
      return { ...tab, rows: sortRows(tab.rows, keys, env) };
    }
    case 'top': {
      const n = num(scalar(evalK(p.expr(), {}, env))) ?? 0;
      if (!p.isId('by')) throw new KqlError("Syntax error: expected 'by' after 'top N'.");
      p.pos++;
      const e = p.expr();
      let desc = true;
      if (p.isId('asc')) {
        desc = false;
        p.pos++;
      } else if (p.isId('desc')) p.pos++;
      finish();
      return { ...tab, rows: sortRows(tab.rows, [{ e, desc }], env).slice(0, n) };
    }
    case 'summarize':
      return summarize(p, tab, env);
    case 'join':
      return join(p, seg, tab, st);
    case 'getschema': {
      finish();
      const rows = tab.columns.map((c, i) => {
        const sample = tab.rows.find((r) => r[c] !== undefined && r[c] !== null)?.[c];
        const type = tab.time.has(c) ? 'datetime' : Array.isArray(sample) ? 'dynamic' : typeof sample === 'number' ? (Number.isInteger(sample) ? 'long' : 'real') : 'string';
        return { ColumnName: c, ColumnOrdinal: i, DataType: `System.${type === 'datetime' ? 'DateTime' : type === 'long' ? 'Int64' : type === 'real' ? 'Double' : type === 'dynamic' ? 'Object' : 'String'}`, ColumnType: type };
      });
      return { rows, columns: ['ColumnName', 'ColumnOrdinal', 'DataType', 'ColumnType'], time: new Set() };
    }
    case 'render': {
      const kind = p.peek();
      if (kind?.t !== 'id') throw new KqlError("Syntax error: expected a visualization after 'render'.");
      p.pos++;
      while (!p.done()) p.pos++;
      const x = tab.columns.find((c) => tab.time.has(c)) ?? tab.columns[0] ?? '';
      const series = tab.columns.filter((c) => c !== x && tab.rows.some((r) => typeof r[c] === 'number'));
      const rows = tab.time.has(x) ? [...tab.rows].sort((a, b) => compare(a[x], b[x])) : tab.rows;
      return { ...tab, rows, chart: { x, series } };
    }
  }
  throw new KqlError(`Syntax error: '${op}' is not a recognized query operator.`);
}

function sortRows(rows: Row[], keys: { e: Expr; desc: boolean }[], env: Env): Row[] {
  const withKeys = rows.map((r) => ({ r, k: keys.map(({ e }) => scalar(evalK(e, r, env))) }));
  withKeys.sort((a, b) => {
    for (let i = 0; i < keys.length; i++) {
      const x = a.k[i]!;
      const y = b.k[i]!;
      if (x === null && y === null) continue;
      // Nulls go last when descending and first when ascending, like Kusto's defaults.
      if (x === null) return keys[i]!.desc ? 1 : -1;
      if (y === null) return keys[i]!.desc ? -1 : 1;
      const c = compare(x, y);
      if (c) return keys[i]!.desc ? -c : c;
    }
    return 0;
  });
  return withKeys.map((x) => x.r);
}

function hasAgg(e: Expr): boolean {
  if (e.k === 'call') return e.fn in AGGS || e.args.some(hasAgg);
  if (e.k === 'bin') return hasAgg(e.a) || hasAgg(e.b);
  if (e.k === 'neg') return hasAgg(e.a);
  return false;
}

/** Replaces every aggregate call in an expression by its value over the group's rows. */
function substituteAggs(e: Expr, rows: Row[], env: Env): Expr {
  if (e.k === 'call' && e.fn in AGGS) {
    const v = AGGS[e.fn]!(e.args, rows, env);
    return { k: 'lit', v: Array.isArray(v) ? (v[0] ?? null) : v };
  }
  if (e.k === 'call') return { ...e, args: e.args.map((x) => substituteAggs(x, rows, env)) };
  if (e.k === 'bin') return { ...e, a: substituteAggs(e.a, rows, env), b: substituteAggs(e.b, rows, env) };
  if (e.k === 'neg') return { ...e, a: substituteAggs(e.a, rows, env) };
  return e;
}

function summarize(p: Parser, tab: Tab, env: Env): Tab {
  const aggs: { name: string; fn: string; args: Expr[]; expand?: string[] }[] = [];
  while (!p.done() && !p.isId('by')) {
    let name: string | null = null;
    const t = p.peek()!;
    if (t.t === 'id' && p.peek(1)?.t === 'op' && (p.peek(1) as { v: string }).v === '=') {
      name = t.v;
      p.pos += 2;
    }
    const e = p.expr();
    const plainAgg = e.k === 'call' && (e.fn in AGGS || e.fn === 'arg_max' || e.fn === 'arg_min');
    if (!plainAgg) {
      // An expression over aggregates, e.g. Davr = max(T) - min(T).
      if (!hasAgg(e)) throw new KqlError('summarize: the expression must be an aggregation function such as count(), dcount(), sum(), make_set().');
      aggs.push({ name: name ?? `Column${aggs.length + 1}`, fn: '__expr', args: [e] });
    } else if (e.k === 'call' && (e.fn === 'arg_max' || e.fn === 'arg_min')) {
      const rest = e.args.slice(1);
      const expand = rest.some((x) => x.k === 'star') ? tab.columns : rest.map((x) => exprName(x, ''));
      aggs.push({ name: exprName(e.args[0]!, 'max'), fn: e.fn, args: e.args, expand });
    } else if (e.k === 'call') {
      const field = e.args[0] ? exprName(e.args[0], '') : '';
      const defaults: Record<string, string> = { count: 'count_', countif: 'countif_', make_set: `set_${field}`, make_list: `list_${field}`, make_set_if: `set_${field}` };
      aggs.push({ name: name ?? defaults[e.fn] ?? `${e.fn}_${field}`, fn: e.fn, args: e.args });
    }
    if (!p.isOp(',')) break;
    p.pos++;
  }
  let keys: { name: string; e: Expr }[] = [];
  if (p.isId('by')) {
    p.pos++;
    let n = 1;
    keys = namedList(p).map(({ name, e }) => ({ name: name ?? exprName(e, `Column${n++}`), e }));
  }
  if (!p.done()) throw new KqlError(`Syntax error: Query could not be parsed at '${tokText(p.peek()!)}'.`);
  if (!aggs.length && !keys.length) throw new KqlError('summarize: nothing to summarize.');
  const groups = new Map<string, { key: Scalar[]; rows: Row[] }>();
  for (const r of tab.rows) {
    const key = keys.map(({ e }) => scalar(evalK(e, r, env)));
    const id = JSON.stringify(key);
    let g = groups.get(id);
    if (!g) groups.set(id, (g = { key, rows: [] }));
    g.rows.push(r);
  }
  if (!keys.length && !groups.size) groups.set('[]', { key: [], rows: [] });
  const rows: Row[] = [];
  for (const g of groups.values()) {
    const out: Row = {};
    keys.forEach((k, i) => {
      if (g.key[i] !== null) out[k.name] = g.key[i]!;
    });
    for (const a of aggs) {
      if (a.expand) {
        let best: Row | null = null;
        let bestV: Scalar = null;
        for (const r of g.rows) {
          const v = scalar(evalK(a.args[0]!, r, env));
          if (v === null) continue;
          if (best === null || compare(v, bestV) * (a.fn === 'arg_max' ? 1 : -1) > 0) {
            best = r;
            bestV = v;
          }
        }
        if (bestV !== null) out[a.name] = bestV;
        for (const c of a.expand) if (c !== a.name && !keys.some((k) => k.name === c) && best && best[c] !== undefined) out[c] = best[c]!;
      } else {
        const v = a.fn === '__expr' ? toCell(evalK(substituteAggs(a.args[0]!, g.rows, env), {}, env)) : AGGS[a.fn]!(a.args, g.rows, env);
        if (v !== null) out[a.name] = v;
      }
    }
    rows.push(out);
  }
  const columns = [...keys.map((k) => k.name)];
  for (const a of aggs) {
    if (!columns.includes(a.name)) columns.push(a.name);
    for (const c of a.expand ?? []) if (!columns.includes(c)) columns.push(c);
  }
  const time = new Set<string>();
  keys.forEach((k) => isTimeExpr(k.e, tab.time) && time.add(k.name));
  for (const a of aggs) {
    if ((a.fn === 'min' || a.fn === 'max') && isTimeExpr(a.args[0]!, tab.time)) time.add(a.name);
    if (a.expand) {
      if (isTimeExpr(a.args[0]!, tab.time)) time.add(a.name);
      for (const c of a.expand) if (tab.time.has(c)) time.add(c);
    }
  }
  return { rows, columns, time };
}

function join(p: Parser, seg: string, left: Tab, st: SiemState): Tab {
  let kind = 'innerunique';
  if (p.isId('kind')) {
    p.pos++;
    p.expectOp('=');
    const k = p.peek();
    if (k?.t !== 'id') throw new KqlError("Syntax error: expected a join kind after 'kind='.");
    kind = k.v;
    p.pos++;
  }
  if (!['inner', 'innerunique', 'leftouter', 'leftanti', 'leftsemi'].includes(kind)) throw new KqlError(`join: kind '${kind}' is not supported in this simulator (use inner, innerunique, leftouter, leftanti or leftsemi).`);
  // The subquery is the text between the first "(" after the kind and its matching ")".
  const open = seg.indexOf('(');
  let depth = 0;
  let close = -1;
  for (let i = open; i < seg.length; i++) {
    if (seg[i] === '(') depth++;
    if (seg[i] === ')' && --depth === 0) {
      close = i;
      break;
    }
  }
  if (open < 0 || close < 0) throw new KqlError('join: expected a subquery in parentheses, e.g. join kind=inner (OtherTable | where ...) on Column.');
  const right = runTabular(seg.slice(open + 1, close), st);
  const onPart = seg.slice(close + 1).trim();
  const m = /^on\s+(.+)$/s.exec(onPart);
  if (!m) throw new KqlError("join: expected 'on' followed by the matching column.");
  let lk: string;
  let rk: string;
  const pair = /^\$left\.(\w+)\s*==\s*\$right\.(\w+)$/.exec(m[1]!.trim());
  if (pair) [lk, rk] = [pair[1]!, pair[2]!];
  else if (/^\w+$/.test(m[1]!.trim())) lk = rk = m[1]!.trim();
  else throw new KqlError('join: use "on Column" or "on $left.A == $right.B".');
  if (!left.columns.includes(lk)) throw new KqlError(`Failed to resolve scalar expression named '${lk}'.`);
  if (!right.columns.includes(rk)) throw new KqlError(`Failed to resolve scalar expression named '${rk}'.`);
  const index = new Map<string, Row[]>();
  for (const r of right.rows) {
    const k = str(r[rk]);
    if (!index.has(k)) index.set(k, []);
    index.get(k)!.push(r);
  }
  let leftRows = left.rows;
  if (kind === 'innerunique') {
    const seen = new Set<string>();
    leftRows = leftRows.filter((r) => {
      const k = str(r[lk]);
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  }
  if (kind === 'leftanti') return { ...left, rows: left.rows.filter((r) => !index.has(str(r[lk]))) };
  if (kind === 'leftsemi') return { ...left, rows: left.rows.filter((r) => index.has(str(r[lk]))) };
  // Right-side columns that clash with left ones get a "1" suffix, as Kusto does.
  const rename = new Map(right.columns.map((c) => [c, left.columns.includes(c) ? `${c}1` : c]));
  const rows: Row[] = [];
  for (const l of leftRows) {
    const matches = index.get(str(l[lk])) ?? [];
    if (!matches.length && kind === 'leftouter') rows.push({ ...l });
    for (const r of matches) {
      const out: Row = { ...l };
      for (const [k, v] of Object.entries(r)) out[rename.get(k) ?? k] = v;
      rows.push(out);
    }
  }
  const time = new Set(left.time);
  for (const c of right.time) time.add(rename.get(c) ?? c);
  return { rows, columns: [...left.columns, ...right.columns.map((c) => rename.get(c)!)], time };
}

function tableColumns(rows: Row[]): string[] {
  const cols: string[] = [];
  for (const r of rows) for (const k of Object.keys(r)) if (!cols.includes(k)) cols.push(k);
  return cols;
}

function runTabular(query: string, st: SiemState): Tab {
  const segs = splitPipes(query);
  const name = segs[0]!;
  if (!name) throw new KqlError('Syntax error: the query must start with a table name.');
  if (!/^[A-Za-z_]\w*$/.test(name)) throw new KqlError(`Syntax error: Query could not be parsed at '${name.split(/\s+/)[0]}'. A query starts with a table name, e.g. SecurityEvent | take 10.`);
  const rows = st.tables[name];
  if (!rows) throw new KqlError(`Failed to resolve table or column expression named '${name}'.`);
  const columns = tableColumns(rows);
  let tab: Tab = { rows: rows.map((r) => ({ ...r })), columns, time: new Set(columns.filter((c) => st.timeColumns.has(c))) };
  for (const seg of segs.slice(1)) {
    if (!seg) throw new KqlError("Syntax error: an operator is missing after '|'.");
    tab = runOperator(seg, tab, st);
  }
  return tab;
}

export function runKusto(st: SiemState, query: string): SiemResult {
  try {
    const tab = runTabular(query.trim(), st);
    return { lang: 'kql', mode: 'table', columns: tab.columns, rows: tab.rows, timeColumns: tab.columns.filter((c) => tab.time.has(c)), chart: tab.chart };
  } catch (err) {
    if (err instanceof KqlError) return { lang: 'kql', mode: 'table', columns: [], rows: [], timeColumns: [], error: err.message };
    throw err;
  }
}

