/*
 * YARA: `yara [-r] [-s] [-m] [-c] [-n] [-t TAG] [-i RULE] RULES TARGET` scans files with rules. File contents are
 * treated as bytes (one character = one byte). Supported: meta, text strings (nocase, wide, ascii, fullword, escapes
 * \" \\ \n \t \xNN), hex strings (?? and nibble wildcards, [n-m] jumps, (a|b) alternatives), regular expressions
 * (/.../is), conditions with and/or/not, comparisons, $a, #a, @a[i], $a at N, $a in (A..B), filesize with KB/MB,
 * uint8/16/32(be), "N of them", "any/all/none of ($a*, $b)", true/false. Errors use YARA's wording, including
 * "unreferenced string". Modules (import "pe") are not available and the tool says so.
 */

import { fail, ok, type Command } from './shell';
import { listFiles, parseArgs, readText } from './toolio';

class YaraError extends Error {
  constructor(public line: number, msg: string, public rule?: string) {
    super(msg);
  }
}

type Tok = { t: 'id' | 'str' | 'hex' | 'regex' | 'num' | 'op' | 'var' | 'count' | 'offset' | 'len'; v: string; line: number; flags?: string };

function tokenize(src: string): Tok[] {
  const out: Tok[] = [];
  let i = 0;
  let line = 1;
  // After "=" in a strings section, "{" starts a hex string and "/" a regex.
  const expectValue = () => out.length > 0 && out[out.length - 1]!.t === 'op' && out[out.length - 1]!.v === '=';
  while (i < src.length) {
    const c = src[i]!;
    if (c === '\n') {
      line++;
      i++;
      continue;
    }
    if (/\s/.test(c)) {
      i++;
      continue;
    }
    if (src.startsWith('//', i)) {
      while (i < src.length && src[i] !== '\n') i++;
      continue;
    }
    if (src.startsWith('/*', i)) {
      const end = src.indexOf('*/', i + 2);
      const chunk = src.slice(i, end < 0 ? src.length : end + 2);
      line += chunk.split('\n').length - 1;
      i += chunk.length;
      continue;
    }
    if (c === '"') {
      let j = i + 1;
      let s = '';
      while (j < src.length && src[j] !== '"') {
        if (src[j] === '\n') throw new YaraError(line, 'unterminated string');
        if (src[j] === '\\') {
          const n = src[j + 1];
          if (n === 'n') s += '\n';
          else if (n === 't') s += '\t';
          else if (n === 'r') s += '\r';
          else if (n === 'x') {
            s += String.fromCharCode(parseInt(src.slice(j + 2, j + 4), 16));
            j += 2;
          } else s += n;
          j += 2;
        } else s += src[j++];
      }
      if (j >= src.length) throw new YaraError(line, 'unterminated string');
      out.push({ t: 'str', v: s, line });
      i = j + 1;
      continue;
    }
    if (c === '{' && expectValue()) {
      const end = src.indexOf('}', i);
      if (end < 0) throw new YaraError(line, 'unterminated hex string');
      out.push({ t: 'hex', v: src.slice(i + 1, end), line });
      line += src.slice(i, end).split('\n').length - 1;
      i = end + 1;
      continue;
    }
    if (c === '/' && expectValue()) {
      let j = i + 1;
      let s = '';
      while (j < src.length && src[j] !== '/') {
        if (src[j] === '\\') {
          s += src[j]! + src[j + 1]!;
          j += 2;
        } else s += src[j++];
      }
      if (j >= src.length) throw new YaraError(line, 'unterminated regular expression');
      const m = /^[is]*/.exec(src.slice(j + 1))!;
      out.push({ t: 'regex', v: s, flags: m[0], line });
      i = j + 1 + m[0].length;
      continue;
    }
    if (c === '$' || c === '#' || c === '@' || c === '!') {
      const m = /^[$#@!][A-Za-z0-9_]*\*?/.exec(src.slice(i))!;
      if (c === '!' && src[i + 1] === '=') {
        out.push({ t: 'op', v: '!=', line });
        i += 2;
        continue;
      }
      out.push({ t: c === '$' ? 'var' : c === '#' ? 'count' : c === '@' ? 'offset' : 'len', v: '$' + m[0].slice(1), line });
      i += m[0].length;
      continue;
    }
    if (/\d/.test(c)) {
      const m = /^(0x[0-9a-fA-F]+|\d+)(KB|MB)?/.exec(src.slice(i))!;
      let n = Number(m[1]);
      if (m[2] === 'KB') n *= 1024;
      if (m[2] === 'MB') n *= 1024 * 1024;
      out.push({ t: 'num', v: String(n), line });
      i += m[0].length;
      continue;
    }
    if (/[A-Za-z_]/.test(c)) {
      const m = /^[A-Za-z_][A-Za-z0-9_.]*/.exec(src.slice(i))!;
      out.push({ t: 'id', v: m[0], line });
      i += m[0].length;
      continue;
    }
    const op = ['==', '!=', '<=', '>=', '..', '<', '>', '=', '{', '}', '(', ')', '[', ']', ':', ',', '+', '-', '*', '\\', '%'].find((o) => src.startsWith(o, i));
    if (!op) throw new YaraError(line, `syntax error, unexpected character '${c}'`);
    out.push({ t: 'op', v: op, line });
    i += op.length;
  }
  return out;
}

/* ── strings ─────────────────────────────────────────────────────── */

interface YString {
  id: string;
  kind: 'text' | 'hex' | 'regex';
  source: string;
  re: RegExp;
  line: number;
}

const reEsc = (s: string) => s.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
const byteRe = (s: string) => [...s].map((ch) => reEsc(ch)).join('');

function hexToRegex(hex: string, line: number): string {
  const toks = hex.replace(/\/\/[^\n]*/g, '').match(/\[[^\]]*\]|\(|\)|\||[0-9A-Fa-f?]{2}|\S/g) ?? [];
  let re = '';
  for (const t of toks) {
    if (t === '(' || t === ')' || t === '|') re += t;
    else if (t.startsWith('[')) {
      const m = /^\[\s*(\d*)\s*(?:-\s*(\d*))?\s*\]$/.exec(t);
      if (!m) throw new YaraError(line, `invalid jump ${t}`);
      if (t.includes('-')) re += `[\\s\\S]{${m[1] || 0},${m[2] ?? ''}}`;
      else re += `[\\s\\S]{${m[1]}}`;
    } else if (/^[0-9A-Fa-f?]{2}$/.test(t)) {
      if (t === '??') re += '[\\s\\S]';
      else if (t.includes('?')) {
        const opts: string[] = [];
        for (let v = 0; v < 16; v++) {
          const byte = t[0] === '?' ? parseInt(`${v.toString(16)}${t[1]}`, 16) : parseInt(`${t[0]}${v.toString(16)}`, 16);
          opts.push(`\\x${byte.toString(16).padStart(2, '0')}`);
        }
        re += `[${opts.join('')}]`;
      } else re += `\\x${t.toLowerCase()}`;
    } else throw new YaraError(line, `invalid hex string: unexpected '${t}'`);
  }
  if (!re) throw new YaraError(line, 'empty hex string');
  return re;
}

function buildString(id: string, tok: Tok, mods: string[]): YString {
  let body: string;
  let flags = 'g';
  if (tok.t === 'str') {
    const wide = mods.includes('wide');
    const ascii = mods.includes('ascii') || !wide;
    const forms: string[] = [];
    if (ascii) forms.push(byteRe(tok.v));
    if (wide) forms.push([...tok.v].map((ch) => `${reEsc(ch)}\\x00`).join(''));
    body = forms.length > 1 ? `(?:${forms.join('|')})` : forms[0]!;
    if (mods.includes('nocase')) flags += 'i';
  } else if (tok.t === 'hex') {
    body = hexToRegex(tok.v, tok.line);
  } else {
    body = tok.v;
    if (tok.flags?.includes('i') || mods.includes('nocase')) flags += 'i';
    if (tok.flags?.includes('s')) flags += 's';
  }
  if (mods.includes('fullword')) body = `(?<![A-Za-z0-9])(?:${body})(?![A-Za-z0-9])`;
  let re: RegExp;
  try {
    re = new RegExp(body, flags);
  } catch {
    throw new YaraError(tok.line, `invalid regular expression "${tok.v}"`);
  }
  return { id, kind: tok.t === 'str' ? 'text' : tok.t === 'hex' ? 'hex' : 'regex', source: tok.v, re, line: tok.line };
}

/* ── rules ───────────────────────────────────────────────────────── */

type Cond =
  | { k: 'bool'; v: boolean }
  | { k: 'num'; v: number }
  | { k: 'filesize' }
  | { k: 'str'; id: string; at?: Cond; inRange?: [Cond, Cond] }
  | { k: 'count'; id: string }
  | { k: 'offset'; id: string; idx?: Cond }
  | { k: 'len'; id: string; idx?: Cond }
  | { k: 'int'; fn: string; arg: Cond }
  | { k: 'of'; quant: 'any' | 'all' | 'none' | number; ids: string[] }
  | { k: 'not'; a: Cond }
  | { k: 'bin'; op: string; a: Cond; b: Cond };

export interface YRule {
  name: string;
  tags: string[];
  meta: [string, string][];
  strings: YString[];
  cond: Cond;
  private: boolean;
}

class Parser {
  pos = 0;
  constructor(public toks: Tok[]) {}
  peek(o = 0) {
    return this.toks[this.pos + o];
  }
  line() {
    return (this.peek() ?? this.toks[this.toks.length - 1])?.line ?? 1;
  }
  isOp(v: string) {
    const t = this.peek();
    return t?.t === 'op' && t.v === v;
  }
  isId(v: string) {
    const t = this.peek();
    return t?.t === 'id' && t.v === v;
  }
  expectOp(v: string, rule?: string) {
    if (!this.isOp(v)) throw new YaraError(this.line(), `syntax error, unexpected ${this.describe()}, expecting '${v}'`, rule);
    this.pos++;
  }
  describe() {
    const t = this.peek();
    if (!t) return 'end of file';
    if (t.t === 'id') return `identifier "${t.v}"`;
    if (t.t === 'str') return 'text string';
    return `'${t.v}'`;
  }
}

function parseRules(src: string): YRule[] {
  const p = new Parser(tokenize(src));
  const rules: YRule[] = [];
  while (p.peek()) {
    if (p.isId('import') || p.isId('include')) {
      const kw = p.peek()!.v;
      const line = p.line();
      p.pos++;
      const mod = p.peek();
      if (kw === 'import') throw new YaraError(line, `module "${mod?.v ?? ''}" is not available in this simulator; write the condition with uint16(0) == 0x5A4D, filesize and strings instead`);
      throw new YaraError(line, `include is not available in this simulator`);
    }
    let isPrivate = false;
    while (p.isId('private') || p.isId('global')) {
      if (p.peek()!.v === 'private') isPrivate = true;
      p.pos++;
    }
    if (!p.isId('rule')) throw new YaraError(p.line(), `syntax error, unexpected ${p.describe()}, expecting rule`);
    p.pos++;
    const nameTok = p.peek();
    if (nameTok?.t !== 'id') throw new YaraError(p.line(), `syntax error, unexpected ${p.describe()}, expecting identifier`);
    const name = nameTok.v;
    if (rules.some((r) => r.name === name)) throw new YaraError(nameTok.line, `duplicated identifier "${name}"`, name);
    p.pos++;
    const tags: string[] = [];
    if (p.isOp(':')) {
      p.pos++;
      while (p.peek()?.t === 'id' && !p.isOp('{')) tags.push(p.peek()!.v), p.pos++;
    }
    p.expectOp('{', name);
    const meta: [string, string][] = [];
    const strings: YString[] = [];
    if (p.isId('meta')) {
      p.pos++;
      p.expectOp(':', name);
      while (p.peek()?.t === 'id' && !p.isId('strings') && !p.isId('condition')) {
        const k = p.peek()!.v;
        p.pos++;
        p.expectOp('=', name);
        const v = p.peek();
        if (!v || !['str', 'num', 'id'].includes(v.t)) throw new YaraError(p.line(), `syntax error, unexpected ${p.describe()}`, name);
        meta.push([k, v.v]);
        p.pos++;
      }
    }
    if (p.isId('strings')) {
      p.pos++;
      p.expectOp(':', name);
      while (p.peek()?.t === 'var') {
        const idTok = p.peek()!;
        const id = idTok.v;
        if (strings.some((s) => s.id === id)) throw new YaraError(idTok.line, `duplicated string identifier "${id}"`, name);
        p.pos++;
        p.expectOp('=', name);
        const val = p.peek();
        if (!val || !['str', 'hex', 'regex'].includes(val.t)) throw new YaraError(p.line(), `syntax error, unexpected ${p.describe()}, expecting text string or hex string or regular expression`, name);
        p.pos++;
        const mods: string[] = [];
        while (p.peek()?.t === 'id' && ['nocase', 'wide', 'ascii', 'fullword', 'private', 'xor', 'base64', 'base64wide'].includes(p.peek()!.v)) {
          const m = p.peek()!.v;
          if (['xor', 'base64', 'base64wide'].includes(m)) throw new YaraError(p.line(), `string modifier "${m}" is not available in this simulator`, name);
          if (val.t === 'hex') throw new YaraError(p.line(), `invalid modifier "${m}" for hex string`, name);
          mods.push(m);
          p.pos++;
        }
        strings.push(buildString(id, val, mods));
      }
    }
    if (!p.isId('condition')) throw new YaraError(p.line(), `syntax error, unexpected ${p.describe()}, expecting condition`, name);
    p.pos++;
    p.expectOp(':', name);
    const used = new Set<string>();
    const cond = parseCond(p, strings, used, name);
    p.expectOp('}', name);
    for (const s of strings) if (!used.has(s.id)) throw new YaraError(s.line, `unreferenced string "${s.id}"`, name);
    rules.push({ name, tags, meta, strings, cond, private: isPrivate });
  }
  return rules;
}

function parseCond(p: Parser, strings: YString[], used: Set<string>, rule: string): Cond {
  const resolve = (id: string, line: number): string[] => {
    if (id.endsWith('*')) {
      const pre = id.slice(0, -1);
      const found = strings.filter((s) => s.id.startsWith(pre)).map((s) => s.id);
      if (!found.length) throw new YaraError(line, `undefined string identifier "${id}"`, rule);
      found.forEach((f) => used.add(f));
      return found;
    }
    if (!strings.some((s) => s.id === id)) throw new YaraError(line, `undefined string identifier "${id}"`, rule);
    used.add(id);
    return [id];
  };
  const or = (): Cond => {
    let a = and();
    while (p.isId('or')) {
      p.pos++;
      a = { k: 'bin', op: 'or', a, b: and() };
    }
    return a;
  };
  const and = (): Cond => {
    let a = not();
    while (p.isId('and')) {
      p.pos++;
      a = { k: 'bin', op: 'and', a, b: not() };
    }
    return a;
  };
  const not = (): Cond => {
    if (p.isId('not')) {
      p.pos++;
      return { k: 'not', a: not() };
    }
    return cmp();
  };
  const cmp = (): Cond => {
    const a = add();
    const t = p.peek();
    if (t?.t === 'op' && ['==', '!=', '<', '>', '<=', '>='].includes(t.v)) {
      p.pos++;
      return { k: 'bin', op: t.v, a, b: add() };
    }
    return a;
  };
  const add = (): Cond => {
    let a = mul();
    while (p.isOp('+') || p.isOp('-')) {
      const op = p.peek()!.v;
      p.pos++;
      a = { k: 'bin', op, a, b: mul() };
    }
    return a;
  };
  const mul = (): Cond => {
    let a = primary();
    while (p.isOp('*') || p.isOp('\\') || p.isOp('%')) {
      const op = p.peek()!.v;
      p.pos++;
      a = { k: 'bin', op, a, b: primary() };
    }
    return a;
  };
  const ofSet = (): string[] => {
    if (p.isId('them')) {
      p.pos++;
      if (!strings.length) throw new YaraError(p.line(), 'no strings defined: "them" refers to nothing', rule);
      strings.forEach((s) => used.add(s.id));
      return strings.map((s) => s.id);
    }
    p.expectOp('(', rule);
    const ids: string[] = [];
    do {
      const t = p.peek();
      if (t?.t !== 'var') throw new YaraError(p.line(), `syntax error, unexpected ${p.describe()}, expecting string identifier`, rule);
      p.pos++;
      ids.push(...resolve(t.v, t.line));
    } while (p.isOp(',') && ++p.pos);
    p.expectOp(')', rule);
    return ids;
  };
  const primary = (): Cond => {
    const t = p.peek();
    if (!t) throw new YaraError(p.line(), 'syntax error, unexpected end of file', rule);
    p.pos++;
    if (t.t === 'op' && t.v === '(') {
      const e = or();
      p.expectOp(')', rule);
      return e;
    }
    if (t.t === 'num') {
      if (p.isId('of')) {
        p.pos++;
        return { k: 'of', quant: Number(t.v), ids: ofSet() };
      }
      return { k: 'num', v: Number(t.v) };
    }
    if (t.t === 'id') {
      if (t.v === 'true' || t.v === 'false') return { k: 'bool', v: t.v === 'true' };
      if (t.v === 'filesize') return { k: 'filesize' };
      if (['any', 'all', 'none'].includes(t.v) && p.isId('of')) {
        p.pos++;
        return { k: 'of', quant: t.v as 'any' | 'all' | 'none', ids: ofSet() };
      }
      if (/^u?int(8|16|32)(be)?$/.test(t.v) && p.isOp('(')) {
        p.pos++;
        const arg = or();
        p.expectOp(')', rule);
        return { k: 'int', fn: t.v, arg };
      }
      throw new YaraError(t.line, `undefined identifier "${t.v}"`, rule);
    }
    if (t.t === 'var') {
      const [id] = resolve(t.v, t.line);
      if (p.isId('at')) {
        p.pos++;
        return { k: 'str', id: id!, at: add() };
      }
      if (p.isId('in')) {
        p.pos++;
        p.expectOp('(', rule);
        const lo = add();
        p.expectOp('..', rule);
        const hi = add();
        p.expectOp(')', rule);
        return { k: 'str', id: id!, inRange: [lo, hi] };
      }
      return { k: 'str', id: id! };
    }
    if (t.t === 'count') return { k: 'count', id: resolve(t.v, t.line)[0]! };
    if (t.t === 'offset' || t.t === 'len') {
      const id = resolve(t.v, t.line)[0]!;
      let idx: Cond | undefined;
      if (p.isOp('[')) {
        p.pos++;
        idx = add();
        p.expectOp(']', rule);
      }
      return { k: t.t, id, idx };
    }
    throw new YaraError(t.line, `syntax error, unexpected '${t.v}'`, rule);
  };
  return or();
}

/* ── scanning ────────────────────────────────────────────────────── */

interface Hit {
  offset: number;
  data: string;
}

function findAll(s: YString, data: string): Hit[] {
  const hits: Hit[] = [];
  s.re.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = s.re.exec(data)) && hits.length < 1000) {
    hits.push({ offset: m.index, data: m[0] });
    if (m[0] === '') s.re.lastIndex++;
  }
  return hits;
}

function evalCond(c: Cond, hits: Map<string, Hit[]>, data: string): number | boolean {
  const n = (x: Cond) => {
    const v = evalCond(x, hits, data);
    return typeof v === 'boolean' ? (v ? 1 : 0) : v;
  };
  const b = (x: Cond) => {
    const v = evalCond(x, hits, data);
    return typeof v === 'boolean' ? v : v !== 0;
  };
  switch (c.k) {
    case 'bool':
      return c.v;
    case 'num':
      return c.v;
    case 'filesize':
      return data.length;
    case 'str': {
      const hs = hits.get(c.id) ?? [];
      if (c.at) {
        const at = n(c.at);
        return hs.some((h) => h.offset === at);
      }
      if (c.inRange) {
        const lo = n(c.inRange[0]);
        const hi = n(c.inRange[1]);
        return hs.some((h) => h.offset >= lo && h.offset <= hi);
      }
      return hs.length > 0;
    }
    case 'count':
      return (hits.get(c.id) ?? []).length;
    case 'offset':
    case 'len': {
      const hs = hits.get(c.id) ?? [];
      const i = c.idx ? n(c.idx) : 1;
      const h = hs[i - 1];
      if (!h) return -1;
      return c.k === 'offset' ? h.offset : h.data.length;
    }
    case 'int': {
      const off = n(c.arg);
      const size = /8/.test(c.fn) ? 1 : /16/.test(c.fn) ? 2 : 4;
      if (off < 0 || off + size > data.length) return 0;
      let v = 0;
      for (let i = 0; i < size; i++) {
        const byte = data.charCodeAt(off + i) & 0xff;
        v += c.fn.endsWith('be') ? byte * 256 ** (size - 1 - i) : byte * 256 ** i;
      }
      return v;
    }
    case 'of': {
      const matched = c.ids.filter((id) => (hits.get(id) ?? []).length > 0).length;
      if (c.quant === 'any') return matched >= 1;
      if (c.quant === 'all') return matched === c.ids.length;
      if (c.quant === 'none') return matched === 0;
      return matched >= c.quant;
    }
    case 'not':
      return !b(c.a);
    case 'bin': {
      if (c.op === 'and') return b(c.a) && b(c.b);
      if (c.op === 'or') return b(c.a) || b(c.b);
      const x = n(c.a);
      const y = n(c.b);
      switch (c.op) {
        case '==':
          return x === y;
        case '!=':
          return x !== y;
        case '<':
          return x < y;
        case '>':
          return x > y;
        case '<=':
          return x <= y;
        case '>=':
          return x >= y;
        case '+':
          return x + y;
        case '-':
          return x - y;
        case '*':
          return x * y;
        case '\\':
          return y ? Math.floor(x / y) : 0;
        case '%':
          return y ? x % y : 0;
      }
    }
  }
  return false;
}

export function scan(rules: YRule[], data: string): { rule: YRule; hits: Map<string, Hit[]> }[] {
  const out: { rule: YRule; hits: Map<string, Hit[]> }[] = [];
  for (const rule of rules) {
    const hits = new Map<string, Hit[]>();
    for (const s of rule.strings) hits.set(s.id, findAll(s, data));
    const v = evalCond(rule.cond, hits, data);
    if (v === true || (typeof v === 'number' && v !== 0)) out.push({ rule, hits });
  }
  return out;
}

function showData(s: YString, h: Hit): string {
  if (s.kind === 'hex' || /[^\x20-\x7e]/.test(h.data)) {
    if (s.kind !== 'hex' && /^([\x20-\x7e]\x00)+$/.test(h.data)) return h.data.replace(/\x00/g, '\\x00').replace(/\\x00$/, '\\x00');
    if (s.kind === 'hex') return [...h.data].map((ch) => (ch.charCodeAt(0) & 0xff).toString(16).toUpperCase().padStart(2, '0')).join(' ');
    return [...h.data].map((ch) => (/[\x20-\x7e]/.test(ch) ? ch : `\\x${(ch.charCodeAt(0) & 0xff).toString(16).padStart(2, '0')}`)).join('');
  }
  return h.data;
}

export const yara: Command = (args, ctx) => {
  if (!args.length || args.includes('-h') || args.includes('--help')) {
    return ok('YARA 4.5.2, the pattern matching swiss army knife.\nUsage: yara [OPTION]... [NAMESPACE:]RULES_FILE... FILE | DIR\n\n  -c,  --count             print only number of matches\n  -i,  --identifier=IDENTIFIER  print only rules named IDENTIFIER\n  -m,  --print-meta        print metadata\n  -n,  --negate            print only not satisfied rules (negate)\n  -r,  --recursive         recursively search directories\n  -s,  --print-strings     print matching strings\n  -t,  --tag=TAG           print only rules tagged as TAG\n  -w,  --no-warnings       disable warnings\n  -v,  --version           show version information');
  }
  if (args.includes('-v') || args.includes('--version')) return ok('4.5.2');
  const { opts, rest } = parseArgs(args, ['-t', '--tag', '-i', '--identifier']);
  const flag = (s: string, l: string) => !!(opts[s] || opts[l]);
  // Combined short flags such as -rs.
  for (const k of Object.keys(opts)) if (/^-[a-z]{2,}$/.test(k)) for (const ch of k.slice(1)) opts[`-${ch}`] = true;
  if (rest.length < 2) return fail('yara: wrong number of arguments\nUsage: yara [OPTION]... [NAMESPACE:]RULES_FILE... FILE | DIR\n\nTry `--help` for more options');
  const target = rest[rest.length - 1]!;
  const ruleFiles = rest.slice(0, -1);
  const rules: YRule[] = [];
  for (const rf of ruleFiles) {
    const r = readText(ctx, rf, 'yara');
    if (!r.ok) return fail(`error: could not open file: ${rf}`);
    try {
      rules.push(...parseRules(r.text));
    } catch (e) {
      if (!(e instanceof YaraError)) throw e;
      return fail(e.rule ? `error: rule "${e.rule}" in ${rf}(${e.line}): ${e.message}` : `error: ${rf}(${e.line}): ${e.message}`);
    }
  }
  const files = listFiles(ctx, target, flag('-r', '--recursive'));
  if (!files) return fail(`error scanning ${target}: could not open file`);
  const tag = (opts['-t'] ?? opts['--tag']) as string | undefined;
  const only = (opts['-i'] ?? opts['--identifier']) as string | undefined;
  const negate = flag('-n', '--negate');
  const showStrings = flag('-s', '--print-strings');
  const showMeta = flag('-m', '--print-meta');
  const out: string[] = [];
  let count = 0;
  for (const f of files) {
    const matches = scan(rules, f.content);
    const shown = rules
      .filter((r) => !r.private && (!tag || r.tags.includes(tag)) && (!only || r.name === only))
      .filter((r) => matches.some((m) => m.rule === r) !== negate);
    count += shown.length;
    if (flag('-c', '--count')) continue;
    for (const r of shown) {
      const meta = showMeta ? ` [${r.meta.map(([k, v]) => (/^\d+$/.test(v) || v === 'true' || v === 'false' ? `${k}=${v}` : `${k}="${v}"`)).join(',')}]` : '';
      const tags = r.tags.length ? ` [${r.tags.join(',')}]` : '';
      out.push(`${r.name}${tags && flag('-g', '--print-tags') ? tags : ''}${meta} ${f.display}`);
      if (showStrings && !negate) {
        const m = matches.find((x) => x.rule === r)!;
        for (const s of r.strings) for (const h of m.hits.get(s.id) ?? []) out.push(`0x${h.offset.toString(16)}:${s.id}: ${showData(s, h)}`);
      }
    }
  }
  if (flag('-c', '--count')) return ok(String(count));
  return ok(out.join('\n'));
};
