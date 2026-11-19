/*
 * A PowerShell parser for the subset the labs teach: pipelines, parameters (with prefixes and -Name:value),
 * variables and assignment, script blocks, hashtables, arrays, member access and method calls, static calls such as
 * [Convert]::FromBase64String(), comparison and logical operators, arithmetic, sub-expressions, and > / >>.
 * PowerShell parses commands and expressions differently ("argument mode" vs "expression mode"); so does this.
 */

export type Expr =
  | { t: 'str'; v: string }
  | { t: 'xstr'; parts: (string | Expr)[] }
  | { t: 'num'; v: number }
  | { t: 'var'; name: string }
  | { t: 'member'; of: Expr; name: string }
  | { t: 'call'; of: Expr; name: string; args: Expr[] }
  | { t: 'index'; of: Expr; index: Expr }
  | { t: 'static'; type: string; name: string; args: Expr[] | null }
  | { t: 'cast'; type: string; of: Expr }
  | { t: 'type'; type: string }
  | { t: 'array'; items: Expr[] }
  | { t: 'sub'; body: Statement[] }
  | { t: 'hash'; entries: [string, Expr][] }
  | { t: 'block'; src: string }
  | { t: 'bin'; op: string; l: Expr; r: Expr }
  | { t: 'not'; of: Expr }
  | { t: 'neg'; of: Expr };

export type Arg = { kind: 'param'; name: string; value?: Expr } | { kind: 'val'; e: Expr };

export type Stage = { t: 'cmd'; name: string; args: Arg[] } | { t: 'expr'; e: Expr };

export type Statement =
  | { t: 'assign'; name: string; op: '=' | '+='; value: Pipeline }
  | Pipeline;

export interface Pipeline {
  t: 'pipe';
  stages: Stage[];
  redirect?: { path: Expr; append: boolean };
}

export class PsParseError extends Error {}

const COMPARE = [
  'eq', 'ne', 'gt', 'ge', 'lt', 'le', 'like', 'notlike', 'match', 'notmatch', 'contains', 'notcontains', 'in', 'notin',
  'replace', 'split', 'join', 'is', 'isnot',
];
const COMPARE_ALL = new Set([...COMPARE, ...COMPARE.map((o) => 'i' + o), ...COMPARE.map((o) => 'c' + o)]);

const isIdent = (c: string | undefined) => !!c && /[A-Za-z0-9_]/.test(c);

class Parser {
  i = 0;
  constructor(readonly src: string) {}

  peek(n = 0) {
    return this.src[this.i + n];
  }
  eof() {
    return this.i >= this.src.length;
  }
  ws(newlines = true) {
    while (!this.eof()) {
      const c = this.peek()!;
      if (c === ' ' || c === '\t' || c === '\r' || (newlines && c === '\n')) this.i++;
      else if (c === '`' && this.peek(1) === '\n') this.i += 2;
      else if (c === '#') {
        while (!this.eof() && this.peek() !== '\n') this.i++;
      } else break;
    }
  }
  expect(s: string) {
    this.ws();
    if (!this.src.startsWith(s, this.i)) throw new PsParseError(`Missing '${s}'.`);
    this.i += s.length;
  }

  /* ── statements ── */

  statements(end?: string): Statement[] {
    const out: Statement[] = [];
    for (;;) {
      this.ws();
      while (this.peek() === ';' || this.peek() === '\n') {
        this.i++;
        this.ws();
      }
      if (this.eof() || (end && this.peek() === end)) break;
      out.push(this.statement());
      this.ws(false);
      if (this.eof() || (end && this.peek() === end)) break;
      if (this.peek() === ';' || this.peek() === '\n') continue;
      throw new PsParseError(`Unexpected token '${this.src.slice(this.i, this.i + 12)}' in expression or statement.`);
    }
    return out;
  }

  statement(): Statement {
    const m = /^\$([A-Za-z_][\w]*(?::[\w]+)?)\s*(\+?=)(?!=)/.exec(this.src.slice(this.i));
    if (m) {
      this.i += m[0].length;
      return { t: 'assign', name: m[1]!, op: m[2] as '=' | '+=', value: this.pipeline() };
    }
    return this.pipeline();
  }

  pipeline(): Pipeline {
    const stages: Stage[] = [this.stage()];
    let redirect: Pipeline['redirect'];
    for (;;) {
      this.ws(false);
      const c = this.peek();
      if (c === '|' && this.peek(1) !== '|') {
        this.i++;
        this.ws();
        stages.push(this.stage());
      } else if (c === '>' || (c === '2' && this.peek(1) === '>') || (c === '*' && this.peek(1) === '>')) {
        const stream = c === '>' ? '1' : c;
        if (c !== '>') this.i++;
        this.i++;
        let append = false;
        if (this.peek() === '>') {
          append = true;
          this.i++;
        }
        if (this.peek() === '&') {
          this.i += 2; // 2>&1
          continue;
        }
        this.ws(false);
        const path = this.argValue();
        if (stream === '1' || stream === '*') redirect = { path, append };
      } else break;
    }
    return { t: 'pipe', stages, ...(redirect ? { redirect } : {}) };
  }

  stage(): Stage {
    this.ws();
    const c = this.peek();
    if (c && (/[A-Za-z_]/.test(c) || (c === '.' && /[\\/]/.test(this.peek(1) ?? '')) || c === '%' || c === '?')) {
      if ((c === '%' || c === '?') && !/[\s{]/.test(this.peek(1) ?? ' ')) return { t: 'expr', e: this.expr() };
      return this.command();
    }
    if (c === '&') {
      this.i++;
      this.ws();
      return this.command();
    }
    return { t: 'expr', e: this.expr() };
  }

  command(): Stage {
    const start = this.i;
    if (this.peek() === '%' || this.peek() === '?') this.i++;
    else while (!this.eof() && /[\w.\-\\/:]/.test(this.peek()!)) this.i++;
    const name = this.src.slice(start, this.i);
    const args: Arg[] = [];
    for (;;) {
      this.ws(false);
      const ch = this.peek();
      if (this.eof() || ch === '|' || ch === ';' || ch === '\n' || ch === ')' || ch === '}' || ch === '>') break;
      if (ch === '2' && this.peek(1) === '>') break;
      if (ch === '-' && /[A-Za-z]/.test(this.peek(1) ?? '')) {
        this.i++;
        const s = this.i;
        while (isIdent(this.peek())) this.i++;
        const pname = this.src.slice(s, this.i);
        if (this.peek() === ':' && this.peek(1) !== ':') {
          this.i++;
          args.push({ kind: 'param', name: pname, value: this.argValue() });
        } else args.push({ kind: 'param', name: pname });
        continue;
      }
      if (ch === '-' && this.peek(1) === '-' && /\s|$/.test(this.peek(2) ?? '')) {
        this.i += 2; // end of parameters marker
        continue;
      }
      args.push({ kind: 'val', e: this.argValue() });
    }
    return { t: 'cmd', name, args };
  }

  /** One argument in argument mode, including a comma list (a,b,c). */
  argValue(): Expr {
    const items = [this.argItem()];
    for (;;) {
      const save = this.i;
      this.ws(false);
      if (this.peek() === ',') {
        this.i++;
        this.ws(false);
        items.push(this.argItem());
      } else {
        this.i = save;
        break;
      }
    }
    return items.length === 1 ? items[0]! : { t: 'array', items };
  }

  argItem(): Expr {
    const c = this.peek();
    if (c === '$' || c === '(' || c === '@' || c === "'" || c === '"' || c === '{' || c === '[') return this.postfix(this.primary());
    // Bare word: a path, a name, a number.
    const start = this.i;
    let depth = 0;
    while (!this.eof()) {
      const ch = this.peek()!;
      if (/\s/.test(ch) || ch === '|' || ch === ';' || ch === ',' || ch === '>') break;
      if (ch === ')' || ch === '}') {
        if (depth === 0) break;
        depth--;
      }
      if (ch === '(') depth++;
      this.i++;
    }
    const word = this.src.slice(start, this.i);
    if (!word) throw new PsParseError(`Unexpected token '${this.peek() ?? ''}'.`);
    const num = parseNumber(word);
    if (num !== null) return { t: 'num', v: num };
    return { t: 'str', v: word };
  }

  /* ── expressions ── */

  expr(): Expr {
    return this.logical();
  }

  logical(): Expr {
    let l = this.compare();
    for (;;) {
      const op = this.peekOp(['and', 'or', 'xor']);
      if (!op) return l;
      this.i += op.length + 1;
      l = { t: 'bin', op, l, r: this.compare() };
    }
  }

  compare(): Expr {
    let l = this.additive();
    for (;;) {
      const op = this.peekOp([...COMPARE_ALL]);
      if (!op) return l;
      this.i += op.length + 1;
      l = { t: 'bin', op: op.toLowerCase(), l, r: this.additive() };
    }
  }

  /** "-eq" etc. ahead (after whitespace) — returns the operator name without the dash. */
  peekOp(names: string[]): string | null {
    this.ws();
    if (this.peek() !== '-') return null;
    const m = /^-([A-Za-z]+)\b/.exec(this.src.slice(this.i));
    if (!m) return null;
    const name = m[1]!.toLowerCase();
    return names.includes(name) ? m[1]! : null;
  }

  additive(): Expr {
    let l = this.multiplicative();
    for (;;) {
      this.ws();
      const c = this.peek();
      if ((c === '+' || c === '-') && !/[A-Za-z]/.test(this.peek(1) ?? '') && this.peek(1) !== '=') {
        this.i++;
        l = { t: 'bin', op: c, l, r: this.multiplicative() };
      } else return l;
    }
  }

  multiplicative(): Expr {
    let l = this.comma();
    for (;;) {
      this.ws();
      const c = this.peek();
      if (c === '*' || c === '/' || c === '%') {
        this.i++;
        l = { t: 'bin', op: c, l, r: this.comma() };
      } else return l;
    }
  }

  comma(): Expr {
    const items = [this.unary()];
    for (;;) {
      const save = this.i;
      this.ws();
      if (this.peek() === ',') {
        this.i++;
        items.push(this.unary());
      } else {
        this.i = save;
        break;
      }
    }
    return items.length === 1 ? items[0]! : { t: 'array', items };
  }

  unary(): Expr {
    this.ws();
    if (this.peek() === '!') {
      this.i++;
      return { t: 'not', of: this.unary() };
    }
    const m = /^-not\b/i.exec(this.src.slice(this.i));
    if (m) {
      this.i += 4;
      return { t: 'not', of: this.unary() };
    }
    if (this.peek() === '-' && /[\d.$(]/.test(this.peek(1) ?? '')) {
      this.i++;
      return { t: 'neg', of: this.unary() };
    }
    return this.postfix(this.primary());
  }

  postfix(e: Expr): Expr {
    for (;;) {
      const c = this.peek();
      if (c === '.' && /[A-Za-z_]/.test(this.peek(1) ?? '')) {
        this.i++;
        const s = this.i;
        while (isIdent(this.peek())) this.i++;
        const name = this.src.slice(s, this.i);
        if (this.peek() === '(') e = { t: 'call', of: e, name, args: this.callArgs() };
        else e = { t: 'member', of: e, name };
      } else if (c === '[') {
        this.i++;
        const index = this.expr();
        this.expect(']');
        e = { t: 'index', of: e, index };
      } else return e;
    }
  }

  callArgs(): Expr[] {
    this.expect('(');
    const args: Expr[] = [];
    this.ws();
    if (this.peek() === ')') {
      this.i++;
      return args;
    }
    for (;;) {
      args.push(this.unaryChain());
      this.ws();
      if (this.peek() === ',') {
        this.i++;
        continue;
      }
      this.expect(')');
      return args;
    }
  }

  /** A full expression without the comma operator (method arguments are comma-separated). */
  unaryChain(): Expr {
    let l = this.unary();
    for (;;) {
      this.ws();
      const c = this.peek();
      if ((c === '+' || c === '-' || c === '*' || c === '/') && !/[A-Za-z]/.test(this.peek(1) ?? '')) {
        this.i++;
        l = { t: 'bin', op: c, l, r: this.unary() };
        continue;
      }
      const op = this.peekOp([...COMPARE_ALL, 'and', 'or']);
      if (!op) return l;
      this.i += op.length + 1;
      l = { t: 'bin', op: op.toLowerCase(), l, r: this.unary() };
    }
  }

  primary(): Expr {
    this.ws();
    const c = this.peek();
    if (c === undefined) throw new PsParseError('You must provide a value expression following the operator.');
    if (c === "'") return { t: 'str', v: this.singleQuoted() };
    if (c === '"') return this.doubleQuoted();
    if (c === '$') return this.variable();
    if (c === '(') {
      this.i++;
      const body = this.statements(')');
      this.expect(')');
      return { t: 'sub', body };
    }
    if (c === '@' && this.peek(1) === '(') {
      this.i += 2;
      const body = this.statements(')');
      this.expect(')');
      return { t: 'array', items: [{ t: 'sub', body }] };
    }
    if (c === '@' && this.peek(1) === '{') {
      this.i += 2;
      return this.hash();
    }
    if (c === '{') return { t: 'block', src: this.block() };
    if (c === '[') {
      const m = /^\[([A-Za-z][\w.]*(?:\[\])?)\]/.exec(this.src.slice(this.i));
      if (!m) throw new PsParseError("Missing type name after '['.");
      this.i += m[0].length;
      const type = m[1]!;
      if (this.src.startsWith('::', this.i)) {
        this.i += 2;
        const s = this.i;
        while (isIdent(this.peek())) this.i++;
        const name = this.src.slice(s, this.i);
        return { t: 'static', type, name, args: this.peek() === '(' ? this.callArgs() : null };
      }
      this.ws();
      if (this.eof() || /[)|;,}]/.test(this.peek()!)) return { t: 'type', type };
      return { t: 'cast', type, of: this.unary() };
    }
    const num = /^(\d+(?:\.\d+)?)(kb|mb|gb)?\b/i.exec(this.src.slice(this.i));
    if (num) {
      this.i += num[0].length;
      return { t: 'num', v: parseNumber(num[0])! };
    }
    if (/[A-Za-z_]/.test(c)) {
      // A bare word in expression mode is a command: run it as a sub-pipeline (e.g. "Get-Date" inside parentheses).
      const stage = this.command();
      return { t: 'sub', body: [{ t: 'pipe', stages: [stage] }] };
    }
    throw new PsParseError(`Unexpected token '${c}' in expression or statement.`);
  }

  singleQuoted(): string {
    this.i++;
    let out = '';
    for (;;) {
      if (this.eof()) throw new PsParseError('The string is missing the terminator: \'.');
      const ch = this.src[this.i++]!;
      if (ch === "'") {
        if (this.peek() === "'") {
          out += "'";
          this.i++;
          continue;
        }
        return out;
      }
      out += ch;
    }
  }

  doubleQuoted(): Expr {
    this.i++;
    const parts: (string | Expr)[] = [];
    let buf = '';
    for (;;) {
      if (this.eof()) throw new PsParseError('The string is missing the terminator: ".');
      const ch = this.src[this.i]!;
      if (ch === '"') {
        if (this.peek(1) === '"') {
          buf += '"';
          this.i += 2;
          continue;
        }
        this.i++;
        break;
      }
      if (ch === '`') {
        const n = this.src[this.i + 1] ?? '';
        buf += n === 'n' ? '\n' : n === 't' ? '\t' : n === '0' ? '\0' : n;
        this.i += 2;
        continue;
      }
      if (ch === '$' && (this.peek(1) === '(' || /[A-Za-z_{]/.test(this.peek(1) ?? ''))) {
        if (buf) parts.push(buf);
        buf = '';
        if (this.peek(1) === '(') {
          this.i += 2;
          const body = this.statements(')');
          this.expect(')');
          parts.push({ t: 'sub', body });
        } else parts.push(this.variable(false));
        continue;
      }
      buf += ch;
      this.i++;
    }
    if (buf || !parts.length) parts.push(buf);
    return parts.every((p) => typeof p === 'string') ? { t: 'str', v: parts.join('') } : { t: 'xstr', parts };
  }

  variable(allowSub = true): Expr {
    this.i++; // $
    if (allowSub && this.peek() === '(') {
      this.i++;
      const body = this.statements(')');
      this.expect(')');
      return { t: 'sub', body };
    }
    if (this.peek() === '{') {
      const end = this.src.indexOf('}', this.i);
      const name = this.src.slice(this.i + 1, end);
      this.i = end + 1;
      return { t: 'var', name };
    }
    const m = /^([A-Za-z_]\w*(?::[A-Za-z_]\w*)?|_|\?)/.exec(this.src.slice(this.i));
    if (!m) throw new PsParseError("Variable reference is not valid. '$' was not followed by a valid variable name character.");
    this.i += m[0].length;
    return { t: 'var', name: m[1]! };
  }

  hash(): Expr {
    const entries: [string, Expr][] = [];
    for (;;) {
      this.ws();
      while (this.peek() === ';') {
        this.i++;
        this.ws();
      }
      if (this.peek() === '}') {
        this.i++;
        return { t: 'hash', entries };
      }
      let key: string;
      if (this.peek() === "'") key = this.singleQuoted();
      else if (this.peek() === '"') key = String((this.doubleQuoted() as { v?: string }).v ?? '');
      else {
        const s = this.i;
        while (isIdent(this.peek())) this.i++;
        key = this.src.slice(s, this.i);
        if (!key) throw new PsParseError('Missing key before \'=\' in hash literal.');
      }
      this.expect('=');
      this.ws();
      entries.push([key, this.unaryChain()]);
    }
  }

  /** A script block's source text, braces balanced, quotes respected. */
  block(): string {
    const start = ++this.i;
    let depth = 1;
    while (!this.eof()) {
      const ch = this.src[this.i]!;
      if (ch === "'" || ch === '"') {
        const q = ch;
        this.i++;
        while (!this.eof() && this.src[this.i] !== q) this.i += this.src[this.i] === '`' ? 2 : 1;
        this.i++;
        continue;
      }
      if (ch === '{') depth++;
      if (ch === '}' && --depth === 0) {
        const src = this.src.slice(start, this.i);
        this.i++;
        return src.trim();
      }
      this.i++;
    }
    throw new PsParseError("Missing closing '}' in statement block or type definition.");
  }
}

export function parseNumber(word: string): number | null {
  const m = /^(-?\d+(?:\.\d+)?)(kb|mb|gb)?$/i.exec(word);
  if (!m) return null;
  const mult = { kb: 1024, mb: 1024 ** 2, gb: 1024 ** 3 }[(m[2] ?? '').toLowerCase() as 'kb'] ?? 1;
  return Number(m[1]) * mult;
}

export function parse(src: string): Statement[] {
  return new Parser(src).statements();
}

export function parseExpr(src: string): Expr {
  const p = new Parser(src);
  const e = p.expr();
  p.ws();
  if (!p.eof()) throw new PsParseError(`Unexpected token '${src.slice(p.i, p.i + 12)}' in expression or statement.`);
  return e;
}
