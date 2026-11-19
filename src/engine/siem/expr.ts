/*
 * SPL's eval expression language (used by eval, where, and Kusto-free parts of the SIEM): a Pratt parser plus an
 * evaluator with Splunk's semantics — unquoted words are field names, "double quotes" are strings, 'single quotes'
 * are field names with odd characters, comparisons with a null field are false, `.` concatenates.
 */

import type { Row, Scalar, Val } from './types';
import { cidrMatch, first, fmtNum, isNumeric, num, relativeTime, str, strftime, strptime, values } from './values';

export class SplError extends Error {}

type Tok =
  | { t: 'num'; v: number }
  | { t: 'str'; v: string }
  | { t: 'field'; v: string }
  | { t: 'id'; v: string }
  | { t: 'op'; v: string };

export type Expr =
  | { k: 'lit'; v: Scalar }
  | { k: 'field'; name: string }
  | { k: 'call'; fn: string; args: Expr[] }
  | { k: 'bin'; op: string; a: Expr; b: Expr }
  | { k: 'not'; a: Expr }
  | { k: 'neg'; a: Expr }
  | { k: 'in'; a: Expr; list: Expr[] }
  | { k: 'like'; a: Expr; pat: Expr };

const OPS = ['==', '!=', '<=', '>=', '=', '<', '>', '+', '-', '*', '/', '%', '.', '(', ')', ','];

export function tokenizeExpr(src: string): Tok[] {
  const out: Tok[] = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i]!;
    if (/\s/.test(c)) {
      i++;
      continue;
    }
    if (c === '"' || c === "'") {
      let j = i + 1;
      let text = '';
      while (j < src.length && src[j] !== c) {
        // Only an escaped quote or backslash is unescaped; regex escapes such as \d stay as written.
        if (src[j] === '\\' && (src[j + 1] === c || src[j + 1] === '\\')) {
          text += src[j + 1];
          j += 2;
        } else text += src[j++];
      }
      if (j >= src.length) throw new SplError('Unbalanced quotes.');
      out.push(c === '"' ? { t: 'str', v: text } : { t: 'field', v: text });
      i = j + 1;
      continue;
    }
    if (/\d/.test(c) || (c === '.' && /\d/.test(src[i + 1] ?? ''))) {
      const m = /^\d*\.?\d+(?:[eE][-+]?\d+)?/.exec(src.slice(i))!;
      out.push({ t: 'num', v: Number(m[0]) });
      i += m[0].length;
      continue;
    }
    if (/[A-Za-z_]/.test(c)) {
      const m = /^[A-Za-z_][A-Za-z0-9_]*/.exec(src.slice(i))!;
      out.push({ t: 'id', v: m[0] });
      i += m[0].length;
      continue;
    }
    const op = OPS.find((o) => src.startsWith(o, i));
    if (!op) throw new SplError(`The expression is malformed. An unexpected character is reached at '${src.slice(i)}'.`);
    out.push({ t: 'op', v: op });
    i += op.length;
  }
  return out;
}

const KW = (tok: Tok | undefined, word: string) => tok?.t === 'id' && tok.v.toUpperCase() === word;

export class ExprParser {
  pos = 0;
  constructor(public toks: Tok[]) {}

  peek(): Tok | undefined {
    return this.toks[this.pos];
  }
  isOp(v: string): boolean {
    const t = this.peek();
    return t?.t === 'op' && t.v === v;
  }
  expectOp(v: string) {
    if (!this.isOp(v)) throw new SplError('The expression is malformed. Expected ' + v + '.');
    this.pos++;
  }
  done(): boolean {
    return this.pos >= this.toks.length;
  }

  parse(minPrec = 0): Expr {
    let left = this.prefix();
    for (;;) {
      const t = this.peek();
      if (!t) break;
      let op: string | null = null;
      let prec = 0;
      if (KW(t, 'OR')) [op, prec] = ['OR', 1];
      else if (KW(t, 'XOR')) [op, prec] = ['XOR', 1];
      else if (KW(t, 'AND')) [op, prec] = ['AND', 2];
      else if (KW(t, 'LIKE')) [op, prec] = ['LIKE', 4];
      else if (KW(t, 'IN')) [op, prec] = ['IN', 4];
      else if (t.t === 'op' && ['=', '==', '!=', '<', '>', '<=', '>='].includes(t.v)) [op, prec] = [t.v === '==' ? '=' : t.v, 4];
      else if (t.t === 'op' && ['+', '-', '.'].includes(t.v)) [op, prec] = [t.v, 5];
      else if (t.t === 'op' && ['*', '/', '%'].includes(t.v)) [op, prec] = [t.v, 6];
      if (!op || prec <= minPrec) break;
      this.pos++;
      if (op === 'IN') {
        this.expectOp('(');
        const list: Expr[] = [];
        if (!this.isOp(')')) {
          do list.push(this.parse());
          while (this.isOp(',') && ++this.pos);
        }
        this.expectOp(')');
        left = { k: 'in', a: left, list };
      } else if (op === 'LIKE') {
        left = { k: 'like', a: left, pat: this.parse(prec) };
      } else {
        left = { k: 'bin', op, a: left, b: this.parse(prec) };
      }
    }
    return left;
  }

  prefix(): Expr {
    const t = this.peek();
    if (!t) throw new SplError('The expression is malformed. An unexpected end of expression is reached.');
    this.pos++;
    if (t.t === 'num') return { k: 'lit', v: t.v };
    if (t.t === 'str') return { k: 'lit', v: t.v };
    if (t.t === 'field') return { k: 'field', name: t.v };
    if (t.t === 'op') {
      if (t.v === '(') {
        const e = this.parse();
        this.expectOp(')');
        return e;
      }
      if (t.v === '-') return { k: 'neg', a: this.parse(6) };
      throw new SplError(`The expression is malformed. An unexpected character is reached at '${t.v}'.`);
    }
    if (t.v.toUpperCase() === 'NOT') return { k: 'not', a: this.parse(3) };
    if (t.v === 'true' || t.v === 'TRUE') return { k: 'call', fn: 'true', args: [] };
    if (t.v === 'false' || t.v === 'FALSE') return { k: 'call', fn: 'false', args: [] };
    if (this.isOp('(')) {
      this.pos++;
      const args: Expr[] = [];
      if (!this.isOp(')')) {
        do args.push(this.parse());
        while (this.isOp(',') && ++this.pos);
      }
      this.expectOp(')');
      const fn = t.v.toLowerCase();
      if (!(fn in FUNCS)) throw new SplError(`The '${t.v}' function is unsupported or undefined.`);
      return { k: 'call', fn, args };
    }
    return { k: 'field', name: t.v };
  }
}

export function parseExpr(src: string): Expr {
  const p = new ExprParser(tokenizeExpr(src));
  const e = p.parse();
  if (!p.done()) throw new SplError('The expression is malformed.');
  return e;
}

/* ── evaluation ───────────────────────────────────────────────────── */

export type EvalVal = Val | boolean;

export interface EvalCtx {
  now: number;
}

const truthy = (v: EvalVal): boolean => v === true;

function toBool(v: EvalVal, fn: string): boolean {
  if (typeof v === 'boolean') return v;
  throw new SplError(`The arguments to the '${fn}' function are invalid.`);
}

function eqScalar(a: Scalar, b: Scalar): boolean {
  if (a === null || b === null) return false;
  if (isNumeric(a) && isNumeric(b)) return Number(a) === Number(b);
  return String(a) === String(b);
}

function cmpScalar(a: Scalar, b: Scalar, op: string): boolean {
  if (a === null || b === null) return false;
  let r: number;
  if (isNumeric(a) && isNumeric(b)) r = Number(a) - Number(b);
  else r = String(a) < String(b) ? -1 : String(a) > String(b) ? 1 : 0;
  return op === '<' ? r < 0 : op === '>' ? r > 0 : op === '<=' ? r <= 0 : r >= 0;
}

function likeRe(pattern: string): RegExp {
  let re = '';
  for (const ch of pattern) re += ch === '%' ? '.*' : ch === '_' ? '.' : ch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`^${re}$`, 's');
}

function regex(p: string): RegExp {
  try {
    return new RegExp(p.replace(/\(\?P</g, '(?<'));
  } catch {
    throw new SplError(`Regex: invalid pattern '${p}'.`);
  }
}

type Fn = (args: Expr[], row: Row, ctx: EvalCtx) => EvalVal;

const scalarArg = (e: Expr, row: Row, ctx: EvalCtx): Scalar => {
  const v = evalExpr(e, row, ctx);
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  return first(v);
};

const numFn = (f: (n: number) => number): Fn => (args, row, ctx) => {
  const n = num(scalarArg(args[0]!, row, ctx));
  return n === null ? null : f(n);
};

export const FUNCS: Record<string, Fn> = {
  true: () => true,
  false: () => false,
  null: () => null,
  if: (a, r, c) => (toBool(evalExpr(a[0]!, r, c), 'if') ? evalExpr(a[1]!, r, c) : evalExpr(a[2]!, r, c)),
  case: (a, r, c) => {
    for (let i = 0; i + 1 < a.length; i += 2) if (toBool(evalExpr(a[i]!, r, c), 'case')) return evalExpr(a[i + 1]!, r, c);
    return null;
  },
  coalesce: (a, r, c) => {
    for (const e of a) {
      const v = evalExpr(e, r, c);
      if (v !== null && v !== '' && !(Array.isArray(v) && !v.length)) return v;
    }
    return null;
  },
  isnull: (a, r, c) => {
    const v = evalExpr(a[0]!, r, c);
    return v === null || (Array.isArray(v) && !v.length);
  },
  isnotnull: (a, r, c) => !FUNCS.isnull!(a, r, c),
  isnum: (a, r, c) => num(scalarArg(a[0]!, r, c)) !== null,
  isstr: (a, r, c) => {
    const v = scalarArg(a[0]!, r, c);
    return typeof v === 'string' && !isNumeric(v);
  },
  len: (a, r, c) => {
    const v = scalarArg(a[0]!, r, c);
    return v === null ? null : str(v).length;
  },
  lower: (a, r, c) => mapStr(evalExpr(a[0]!, r, c), (s) => s.toLowerCase()),
  upper: (a, r, c) => mapStr(evalExpr(a[0]!, r, c), (s) => s.toUpperCase()),
  trim: (a, r, c) => mapStr(evalExpr(a[0]!, r, c), (s) => s.trim()),
  ltrim: (a, r, c) => mapStr(evalExpr(a[0]!, r, c), (s) => s.trimStart()),
  rtrim: (a, r, c) => mapStr(evalExpr(a[0]!, r, c), (s) => s.trimEnd()),
  substr: (a, r, c) => {
    const s = scalarArg(a[0]!, r, c);
    if (s === null) return null;
    const text = str(s);
    let start = num(scalarArg(a[1]!, r, c)) ?? 1;
    // Splunk counts from 1; a negative start counts from the end.
    start = start < 0 ? text.length + start : start - 1;
    const len = a[2] ? num(scalarArg(a[2], r, c)) : null;
    return len === null ? text.slice(start) : text.substr(Math.max(0, start), len);
  },
  replace: (a, r, c) => {
    const re = new RegExp(regex(str(scalarArg(a[1]!, r, c))).source, 'g');
    const to = str(scalarArg(a[2]!, r, c)).replace(/\\(\d)/g, '$$$1');
    return mapStr(evalExpr(a[0]!, r, c), (s) => s.replace(re, to));
  },
  split: (a, r, c) => {
    const s = scalarArg(a[0]!, r, c);
    if (s === null) return null;
    return str(s).split(str(scalarArg(a[1]!, r, c)));
  },
  mvcount: (a, r, c) => {
    const v = evalExpr(a[0]!, r, c);
    if (v === null || typeof v === 'boolean') return null;
    return values(v).length;
  },
  mvindex: (a, r, c) => {
    const vs = values(evalExpr(a[0]!, r, c) as Val);
    let i = num(scalarArg(a[1]!, r, c)) ?? 0;
    if (i < 0) i += vs.length;
    if (a[2]) {
      let j = num(scalarArg(a[2], r, c)) ?? i;
      if (j < 0) j += vs.length;
      return vs.slice(i, j + 1);
    }
    return vs[i] ?? null;
  },
  mvjoin: (a, r, c) => values(evalExpr(a[0]!, r, c) as Val).map((x) => str(x)).join(str(scalarArg(a[1]!, r, c))),
  mvdedup: (a, r, c) => [...new Set(values(evalExpr(a[0]!, r, c) as Val))],
  round: (a, r, c) => {
    const n = num(scalarArg(a[0]!, r, c));
    if (n === null) return null;
    const d = a[1] ? (num(scalarArg(a[1], r, c)) ?? 0) : 0;
    return Number(n.toFixed(d));
  },
  floor: numFn(Math.floor),
  ceil: numFn(Math.ceil),
  ceiling: numFn(Math.ceil),
  abs: numFn(Math.abs),
  sqrt: numFn(Math.sqrt),
  log: (a, r, c) => {
    const n = num(scalarArg(a[0]!, r, c));
    const base = a[1] ? (num(scalarArg(a[1], r, c)) ?? 10) : 10;
    return n === null ? null : Math.log(n) / Math.log(base);
  },
  pow: (a, r, c) => {
    const x = num(scalarArg(a[0]!, r, c));
    const y = num(scalarArg(a[1]!, r, c));
    return x === null || y === null ? null : x ** y;
  },
  min: (a, r, c) => {
    const ns = a.flatMap((e) => values(evalExpr(e, r, c) as Val)).map(num).filter((x): x is number => x !== null);
    return ns.length ? Math.min(...ns) : null;
  },
  max: (a, r, c) => {
    const ns = a.flatMap((e) => values(evalExpr(e, r, c) as Val)).map(num).filter((x): x is number => x !== null);
    return ns.length ? Math.max(...ns) : null;
  },
  tonumber: (a, r, c) => {
    const s = scalarArg(a[0]!, r, c);
    if (s === null) return null;
    const base = a[1] ? (num(scalarArg(a[1], r, c)) ?? 10) : 10;
    if (base === 10) return num(s);
    const n = parseInt(str(s), base);
    return Number.isNaN(n) ? null : n;
  },
  tostring: (a, r, c) => {
    const v = evalExpr(a[0]!, r, c);
    if (typeof v === 'boolean') return v ? 'True' : 'False';
    const s = first(v);
    if (s === null) return null;
    const mode = a[1] ? str(scalarArg(a[1], r, c)) : '';
    const n = num(s);
    if (mode === 'commas' && n !== null) return n.toLocaleString('en-US', { maximumFractionDigits: 2 });
    if (mode === 'hex' && n !== null) return '0x' + Math.trunc(n).toString(16).toUpperCase();
    if (mode === 'duration' && n !== null) {
      const t = Math.trunc(n);
      return `${String(Math.floor(t / 3600)).padStart(2, '0')}:${String(Math.floor((t % 3600) / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
    }
    return typeof s === 'number' ? fmtNum(s) : s;
  },
  now: (_a, _r, c) => c.now,
  time: (_a, _r, c) => c.now,
  relative_time: (a, r, c) => {
    const t = num(scalarArg(a[0]!, r, c));
    if (t === null) return null;
    return relativeTime(str(scalarArg(a[1]!, r, c)), t);
  },
  strftime: (a, r, c) => {
    const t = num(scalarArg(a[0]!, r, c));
    return t === null ? null : strftime(t, str(scalarArg(a[1]!, r, c)));
  },
  strptime: (a, r, c) => {
    const s = scalarArg(a[0]!, r, c);
    return s === null ? null : strptime(str(s), str(scalarArg(a[1]!, r, c)));
  },
  like: (a, r, c) => {
    const pat = likeRe(str(scalarArg(a[1]!, r, c)));
    return values(evalExpr(a[0]!, r, c) as Val).some((v) => v !== null && pat.test(str(v)));
  },
  match: (a, r, c) => {
    const re = regex(str(scalarArg(a[1]!, r, c)));
    return values(evalExpr(a[0]!, r, c) as Val).some((v) => v !== null && re.test(str(v)));
  },
  searchmatch: (a, r, c) => {
    const term = str(scalarArg(a[0]!, r, c)).toLowerCase();
    return str(r._raw).toLowerCase().includes(term);
  },
  cidrmatch: (a, r, c) => {
    const cidr = str(scalarArg(a[0]!, r, c));
    return values(evalExpr(a[1]!, r, c) as Val).some((v) => v !== null && cidrMatch(cidr, str(v)));
  },
  in: (a, r, c) => {
    const v = scalarArg(a[0]!, r, c);
    return a.slice(1).some((e) => eqScalar(v, scalarArg(e, r, c)));
  },
  urldecode: (a, r, c) =>
    mapStr(evalExpr(a[0]!, r, c), (s) => {
      try {
        return decodeURIComponent(s.replace(/\+/g, ' '));
      } catch {
        return s;
      }
    }),
  typeof: (a, r, c) => {
    const v = evalExpr(a[0]!, r, c);
    if (typeof v === 'boolean') return 'Boolean';
    if (v === null) return 'Invalid';
    if (Array.isArray(v)) return 'Multivalue';
    return num(v) !== null ? 'Number' : 'String';
  },
};

function mapStr(v: EvalVal, f: (s: string) => string): Val {
  if (v === null || typeof v === 'boolean') return v === null ? null : f(String(v));
  if (Array.isArray(v)) return v.map((x) => (x === null ? null : f(str(x))));
  return f(str(v));
}

export function evalExpr(e: Expr, row: Row, ctx: EvalCtx): EvalVal {
  switch (e.k) {
    case 'lit':
      return e.v;
    case 'field':
      return row[e.name] ?? null;
    case 'call':
      return FUNCS[e.fn]!(e.args, row, ctx);
    case 'not': {
      const v = evalExpr(e.a, row, ctx);
      if (typeof v !== 'boolean') throw new SplError("Type checking failed. 'NOT' only takes boolean arguments.");
      return !v;
    }
    case 'neg': {
      const n = num(scalarArg(e.a, row, ctx));
      return n === null ? null : -n;
    }
    case 'in': {
      const vs = values(evalExpr(e.a, row, ctx) as Val);
      const list = e.list.map((x) => scalarArg(x, row, ctx));
      return vs.some((v) => list.some((l) => eqScalar(v, l)));
    }
    case 'like': {
      const pat = likeRe(str(scalarArg(e.pat, row, ctx)));
      return values(evalExpr(e.a, row, ctx) as Val).some((v) => v !== null && pat.test(str(v)));
    }
    case 'bin':
      return binary(e.op, e.a, e.b, row, ctx);
  }
}

function binary(op: string, ea: Expr, eb: Expr, row: Row, ctx: EvalCtx): EvalVal {
  if (op === 'AND' || op === 'OR' || op === 'XOR') {
    const a = evalExpr(ea, row, ctx);
    if (typeof a !== 'boolean') throw new SplError(`Type checking failed. '${op}' only takes boolean arguments.`);
    if (op === 'AND' && !a) return false;
    if (op === 'OR' && a) return true;
    const b = evalExpr(eb, row, ctx);
    if (typeof b !== 'boolean') throw new SplError(`Type checking failed. '${op}' only takes boolean arguments.`);
    return op === 'XOR' ? a !== b : b;
  }
  const av = evalExpr(ea, row, ctx);
  const bv = evalExpr(eb, row, ctx);
  if (op === '=' || op === '!=') {
    const as = values(av as Val);
    const b = typeof bv === 'boolean' ? (bv ? 'true' : 'false') : first(bv);
    if (!as.length || b === null) return false;
    const eq = as.some((x) => eqScalar(x, b));
    return op === '=' ? eq : !eq;
  }
  const a = typeof av === 'boolean' ? null : first(av);
  const b = typeof bv === 'boolean' ? null : first(bv);
  if (['<', '>', '<=', '>='].includes(op)) return cmpScalar(a, b, op);
  if (op === '.') return a === null || b === null ? null : str(a) + str(b);
  if (op === '+') {
    if (a === null || b === null) return null;
    if (isNumeric(a) && isNumeric(b)) return Number(a) + Number(b);
    return str(a) + str(b);
  }
  const x = num(a);
  const y = num(b);
  if (x === null || y === null) return null;
  if (op === '-') return x - y;
  if (op === '*') return x * y;
  if (op === '/') return y === 0 ? null : x / y;
  if (op === '%') return y === 0 ? null : x % y;
  return null;
}

/** Evaluates a where-clause: anything but boolean true drops the row. */
export function test(e: Expr, row: Row, ctx: EvalCtx): boolean {
  const v = evalExpr(e, row, ctx);
  if (typeof v !== 'boolean') {
    // where status (a bare field) is not a boolean expression in Splunk either.
    throw new SplError("The expression is malformed. Expected a boolean expression.");
  }
  return truthy(v);
}
