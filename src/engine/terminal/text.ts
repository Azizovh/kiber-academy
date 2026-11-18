import { canAccess } from './fs';
import { locate, parseFlags, readInput, toLines } from './commands';
import { fail, ok, type Command } from './shell';

/*
 * Text tools for log and config work: a useful subset of awk, sed and jq, plus sha256sum. Each one supports exactly
 * what the labs teach and says so plainly when a learner goes beyond it, instead of silently doing something else.
 */

/* ── awk ───────────────────────────────────────────────────────────────── */

interface AwkProgram {
  cond: ((fields: string[], nr: number, line: string) => boolean) | null;
  print: ((fields: string[], nr: number, line: string) => string) | null;
}

function awkValue(token: string, fields: string[], nr: number, line: string): string {
  const t = token.trim();
  if (t === '$0') return line;
  if (t === 'NR') return String(nr);
  if (t === 'NF') return String(fields.length - 1);
  if (t === '$NF') return fields[fields.length - 1] ?? '';
  const field = /^\$(\d+)$/.exec(t);
  if (field) return Number(field[1]) === 0 ? line : fields[Number(field[1])] ?? '';
  const str = /^"(.*)"$/.exec(t);
  if (str) return str[1]!.replace(/\\t/g, '\t').replace(/\\n/g, '\n');
  return t;
}

function compileAwkCond(src: string): AwkProgram['cond'] | string {
  const parts = src.split('&&').map((p) => p.trim()).filter(Boolean);
  const tests: ((f: string[], nr: number, line: string) => boolean)[] = [];
  for (const part of parts) {
    const re = /^\/(.*)\/$/.exec(part);
    if (re) {
      const rx = new RegExp(re[1]!);
      tests.push((_f, _n, line) => rx.test(line));
      continue;
    }
    const m = /^(\$\w+|NR|NF)\s*(==|!=|>=|<=|>|<|~|!~)\s*(.+)$/.exec(part);
    if (!m) return `awk: bu simulyatorda faqat "$N == qiymat", "$N ~ /regex/", "/regex/" va "NR > N" shartlari bor: ${part}`;
    const [, left, op, rightRaw] = m as unknown as [string, string, string, string];
    const reRight = /^\/(.*)\/$/.exec(rightRaw.trim());
    tests.push((f, nr, line) => {
      const l = awkValue(left, f, nr, line);
      if (op === '~' || op === '!~') {
        const hit = new RegExp(reRight ? reRight[1]! : rightRaw.trim()).test(l);
        return op === '~' ? hit : !hit;
      }
      const r = awkValue(rightRaw, f, nr, line);
      const numeric = l !== '' && r !== '' && !isNaN(Number(l)) && !isNaN(Number(r));
      const a: string | number = numeric ? Number(l) : l;
      const b: string | number = numeric ? Number(r) : r;
      switch (op) {
        case '==': return a === b;
        case '!=': return a !== b;
        case '>': return a > b;
        case '<': return a < b;
        case '>=': return a >= b;
        default: return a <= b;
      }
    });
  }
  return (f, nr, line) => tests.every((t) => t(f, nr, line));
}

function splitPrintArgs(src: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inStr = false;
  for (const ch of src) {
    if (ch === '"') inStr = !inStr;
    if (ch === ',' && !inStr) {
      out.push(cur);
      cur = '';
    } else cur += ch;
  }
  if (cur.trim()) out.push(cur);
  return out;
}

function compileAwk(program: string, ofs: string): AwkProgram | string {
  const m = /^\s*([^{]*?)\s*(?:\{\s*(.*?)\s*;?\s*\})?\s*$/s.exec(program);
  if (!m) return `awk: dasturni tushunmadim: ${program}`;
  const condSrc = m[1]!;
  const action = m[2];
  let cond: AwkProgram['cond'] = null;
  if (condSrc) {
    const c = compileAwkCond(condSrc);
    if (typeof c === 'string') return c;
    cond = c;
  }
  let print: AwkProgram['print'] = null;
  if (action !== undefined) {
    const p = /^print\s*(.*)$/.exec(action);
    if (!p) return "awk: bu simulyatorda faqat { print ... } amali bor (masalan: awk '{print $1, $9}')";
    const args = p[1] ? splitPrintArgs(p[1]) : ['$0'];
    print = (f, nr, line) =>
      args
        .map((a) => {
          // Juxtaposed values ("$1" ":" "$2") concatenate, as in real awk.
          const pieces = a.trim().match(/"[^"]*"|\S+/g) ?? [];
          return pieces.map((x) => awkValue(x, f, nr, line)).join('');
        })
        .join(ofs);
  }
  return { cond, print };
}

export const awk: Command = (args, ctx) => {
  let sep: string | null = null;
  const rest: string[] = [];
  for (let i = 0; i < args.length; i++) {
    const a = args[i]!;
    if (a === '-F') sep = args[++i] ?? ' ';
    else if (a.startsWith('-F')) sep = a.slice(2);
    else rest.push(a);
  }
  const [program, ...files] = rest;
  if (!program) return fail("Ishlatilishi: awk [-F AJRATGICH] '[shart] {print $N, ...}' [FAYL]");
  const compiled = compileAwk(program, ' ');
  if (typeof compiled === 'string') return fail(compiled);
  const input = readInput('awk', files, ctx);
  if ('err' in input) return fail(input.err);
  const delim = sep === '\\t' ? '\t' : sep;
  const out: string[] = [];
  toLines(input.text).forEach((line, i) => {
    const parts = delim === null || delim === ' ' ? line.trim().split(/\s+/).filter(Boolean) : line.split(delim);
    const fields = ['', ...parts];
    const nr = i + 1;
    if (compiled.cond && !compiled.cond(fields, nr, line)) return;
    out.push(compiled.print ? compiled.print(fields, nr, line) : line);
  });
  return ok(out.join('\n'));
};

/* ── sed ───────────────────────────────────────────────────────────────── */

type SedOp = { kind: 's'; re: RegExp; rep: string } | { kind: 'd' | 'p'; re: RegExp | null; line: number | null };

function parseSed(script: string): SedOp | string {
  const s = /^s(.)(.*?)\1(.*?)\1([gI]*)$/.exec(script);
  if (s) {
    const flags = (s[4]!.includes('g') ? 'g' : '') + (s[4]!.includes('I') ? 'i' : '');
    try {
      return { kind: 's', re: new RegExp(s[2]!, flags), rep: s[3]!.replace(/\\(\d)/g, '$$$1').replace(/&/g, '$$&') };
    } catch {
      return `sed: -e expression #1: invalid regex: ${s[2]}`;
    }
  }
  const addr = /^(?:\/(.*)\/|(\d+))([dp])$/.exec(script);
  if (addr) {
    return { kind: addr[3] as 'd' | 'p', re: addr[1] !== undefined ? new RegExp(addr[1]) : null, line: addr[2] ? Number(addr[2]) : null };
  }
  return "sed: bu simulyatorda faqat 's/eski/yangi/g', '/namuna/d', '/namuna/p' (-n bilan) va 'Nd' buyruqlari bor";
}

export const sed: Command = (args, ctx) => {
  const { flags, values, rest } = parseFlags(args, 'e');
  const script = values.e ?? rest.shift();
  if (!script) return fail("Ishlatilishi: sed [-i] [-n] 's/eski/yangi/g' [FAYL]");
  const op = parseSed(script);
  if (typeof op === 'string') return fail(op);
  const quiet = flags.has('n');
  const transform = (text: string): string => {
    const out: string[] = [];
    toLines(text).forEach((line, i) => {
      const hit = op.kind === 's' ? false : op.re ? op.re.test(line) : op.line === i + 1;
      if (op.kind === 's') {
        const next = line.replace(op.re, op.rep);
        if (!quiet) out.push(next);
      } else if (op.kind === 'd') {
        if (!hit && !quiet) out.push(line);
      } else {
        if (!quiet) out.push(line);
        if (hit) out.push(line);
      }
    });
    return out.join('\n');
  };

  if (flags.has('i')) {
    if (!rest.length) return fail('sed: -i uchun fayl nomi kerak');
    for (const f of rest) {
      const { node, denied } = locate(ctx, f);
      if (denied || (node && !canAccess(node, ctx.user, 'r'))) return fail(`sed: couldn't open file ${f}: Permission denied`);
      if (!node) return fail(`sed: can't read ${f}: No such file or directory`);
      if (node.type === 'dir') return fail(`sed: couldn't edit ${f}: not a regular file`);
      if (!canAccess(node, ctx.user, 'w')) return fail(`sed: couldn't open temporary file ${f}: Permission denied`);
      const body = transform(node.content);
      node.content = body ? body + '\n' : '';
    }
    return ok();
  }
  const input = readInput('sed', rest, ctx);
  if ('err' in input) return fail(input.err);
  return ok(transform(input.text));
};

/* ── jq ────────────────────────────────────────────────────────────────── */

type Json = null | boolean | number | string | Json[] | { [k: string]: Json };

type Node =
  | { t: 'identity' }
  | { t: 'field'; of: Node; key: string; opt: boolean }
  | { t: 'index'; of: Node; index: number }
  | { t: 'iterate'; of: Node; opt: boolean }
  | { t: 'literal'; value: Json }
  | { t: 'pipe'; left: Node; right: Node }
  | { t: 'comma'; left: Node; right: Node }
  | { t: 'binop'; op: string; left: Node; right: Node }
  | { t: 'array'; body: Node | null }
  | { t: 'object'; fields: { key: string | Node; value: Node }[] }
  | { t: 'call'; name: string; args: Node[] }
  | { t: 'format'; name: string };

class JqError extends Error {}

function tokenizeJq(src: string): string[] {
  const tokens: string[] = [];
  let i = 0;
  while (i < src.length) {
    const ch = src[i]!;
    if (/\s/.test(ch)) {
      i++;
      continue;
    }
    if (ch === '"') {
      let j = i + 1;
      while (j < src.length && src[j] !== '"') j += src[j] === '\\' ? 2 : 1;
      tokens.push(src.slice(i, j + 1));
      i = j + 1;
      continue;
    }
    const two = src.slice(i, i + 2);
    if (['==', '!=', '>=', '<=', '//'].includes(two)) {
      tokens.push(two);
      i += 2;
      continue;
    }
    if ('|,()[]{}:<>+-?'.includes(ch)) {
      tokens.push(ch);
      i++;
      continue;
    }
    const word = /^(\.\.|\.[A-Za-z_][\w]*|\.|@?[A-Za-z_][\w]*|\d+(?:\.\d+)?)/.exec(src.slice(i));
    if (!word) throw new JqError(`jq: error: syntax error near "${src.slice(i, i + 10)}"`);
    tokens.push(word[0]);
    i += word[0].length;
  }
  return tokens;
}

function parseJq(src: string): Node {
  const tokens = tokenizeJq(src);
  let pos = 0;
  const peek = () => tokens[pos];
  const next = () => tokens[pos++];
  const expect = (tok: string) => {
    if (next() !== tok) throw new JqError(`jq: error: syntax error: "${tok}" kutilgan edi`);
  };

  const pipe = (): Node => {
    let left = comma();
    while (peek() === '|') {
      next();
      left = { t: 'pipe', left, right: comma() };
    }
    return left;
  };
  const comma = (): Node => {
    let left = alt();
    while (peek() === ',') {
      next();
      left = { t: 'comma', left, right: alt() };
    }
    return left;
  };
  const alt = (): Node => {
    let left = or();
    while (peek() === '//') {
      next();
      left = { t: 'binop', op: '//', left, right: or() };
    }
    return left;
  };
  const or = (): Node => {
    let left = and();
    while (peek() === 'or') {
      next();
      left = { t: 'binop', op: 'or', left, right: and() };
    }
    return left;
  };
  const and = (): Node => {
    let left = cmp();
    while (peek() === 'and') {
      next();
      left = { t: 'binop', op: 'and', left, right: cmp() };
    }
    return left;
  };
  const cmp = (): Node => {
    const left = add();
    const op = peek();
    if (op && ['==', '!=', '>', '<', '>=', '<='].includes(op)) {
      next();
      return { t: 'binop', op, left, right: add() };
    }
    return left;
  };
  const add = (): Node => {
    let left = postfix();
    while (peek() === '+' || peek() === '-') {
      const op = next()!;
      left = { t: 'binop', op, left, right: postfix() };
    }
    return left;
  };
  const suffixes = (base: Node): Node => {
    let node = base;
    for (;;) {
      const tok = peek();
      if (tok && /^\.[A-Za-z_]\w*$/.test(tok)) {
        next();
        const opt = peek() === '?';
        if (opt) next();
        node = { t: 'field', of: node, key: tok.slice(1), opt };
      } else if (tok === '[') {
        next();
        if (peek() === ']') {
          next();
          const opt = peek() === '?';
          if (opt) next();
          node = { t: 'iterate', of: node, opt };
        } else {
          const inner = next()!;
          expect(']');
          if (/^\d+$/.test(inner)) node = { t: 'index', of: node, index: Number(inner) };
          else if (/^".*"$/.test(inner)) node = { t: 'field', of: node, key: JSON.parse(inner) as string, opt: false };
          else throw new JqError(`jq: error: [${inner}] ni tushunmadim`);
        }
      } else return node;
    }
  };
  const postfix = (): Node => suffixes(primary());
  const primary = (): Node => {
    const tok = next();
    if (tok === undefined) throw new JqError('jq: error: filtr tugallanmagan');
    if (tok === '.') return { t: 'identity' };
    if (/^\.[A-Za-z_]\w*$/.test(tok)) {
      const opt = peek() === '?';
      if (opt) next();
      return { t: 'field', of: { t: 'identity' }, key: tok.slice(1), opt };
    }
    if (tok.startsWith('"')) return { t: 'literal', value: JSON.parse(tok) as string };
    if (/^\d/.test(tok)) return { t: 'literal', value: Number(tok) };
    if (tok === 'true' || tok === 'false') return { t: 'literal', value: tok === 'true' };
    if (tok === 'null') return { t: 'literal', value: null };
    if (tok === '(') {
      const inner = pipe();
      expect(')');
      return inner;
    }
    if (tok === '[') {
      if (peek() === ']') {
        next();
        return { t: 'array', body: null };
      }
      const body = pipe();
      expect(']');
      return { t: 'array', body };
    }
    if (tok === '{') {
      const fields: { key: string | Node; value: Node }[] = [];
      while (peek() !== '}') {
        const k = next()!;
        const key = k.startsWith('"') ? (JSON.parse(k) as string) : k.replace(/^\./, '');
        if (peek() === ':') {
          next();
          fields.push({ key, value: alt() });
        } else fields.push({ key, value: { t: 'field', of: { t: 'identity' }, key, opt: false } });
        if (peek() === ',') next();
      }
      expect('}');
      return { t: 'object', fields };
    }
    if (tok.startsWith('@')) return { t: 'format', name: tok };
    if (/^[A-Za-z_]\w*$/.test(tok)) {
      const args: Node[] = [];
      if (peek() === '(') {
        next();
        args.push(pipe());
        while (peek() === ';') {
          next();
          args.push(pipe());
        }
        expect(')');
      }
      return { t: 'call', name: tok, args };
    }
    throw new JqError(`jq: error: syntax error near "${tok}"`);
  };

  const ast = pipe();
  if (pos < tokens.length) throw new JqError(`jq: error: syntax error near "${tokens[pos]}"`);
  return ast;
}

const typeName = (v: Json): string =>
  v === null ? 'null' : Array.isArray(v) ? 'array' : typeof v === 'object' ? 'object' : typeof v;

const truthy = (v: Json): boolean => v !== false && v !== null;

function compare(a: Json, b: Json): number {
  const order = ['null', 'boolean', 'number', 'string', 'array', 'object'];
  const ta = typeName(a);
  const tb = typeName(b);
  if (ta !== tb) return order.indexOf(ta) - order.indexOf(tb);
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  if (typeof a === 'string' && typeof b === 'string') return a < b ? -1 : a > b ? 1 : 0;
  if (typeof a === 'boolean' && typeof b === 'boolean') return Number(a) - Number(b);
  return JSON.stringify(a) < JSON.stringify(b) ? -1 : JSON.stringify(a) > JSON.stringify(b) ? 1 : 0;
}

function tsvCell(v: Json): string {
  if (v === null) return '';
  return typeof v === 'string' ? v.replace(/\t/g, '\\t') : JSON.stringify(v);
}

function evalJq(node: Node, input: Json): Json[] {
  switch (node.t) {
    case 'identity':
      return [input];
    case 'literal':
      return [node.value];
    case 'field':
      return evalJq(node.of, input).flatMap((v) => {
        if (v === null) return [null];
        if (typeof v === 'object' && !Array.isArray(v)) return [v[node.key] ?? null];
        if (node.opt) return [];
        throw new JqError(`jq: error: Cannot index ${typeName(v)} with "${node.key}"`);
      });
    case 'index':
      return evalJq(node.of, input).map((v) => {
        if (Array.isArray(v)) return v[node.index] ?? null;
        if (v === null) return null;
        throw new JqError(`jq: error: Cannot index ${typeName(v)} with number`);
      });
    case 'iterate':
      return evalJq(node.of, input).flatMap((v) => {
        if (Array.isArray(v)) return v;
        if (v && typeof v === 'object') return Object.values(v);
        if (node.opt) return [];
        throw new JqError(`jq: error: Cannot iterate over ${typeName(v)}`);
      });
    case 'pipe':
      return evalJq(node.left, input).flatMap((v) => evalJq(node.right, v));
    case 'comma':
      return [...evalJq(node.left, input), ...evalJq(node.right, input)];
    case 'array':
      return [node.body ? evalJq(node.body, input) : []];
    case 'object': {
      let results: { [k: string]: Json }[] = [{}];
      for (const f of node.fields) {
        const keys = typeof f.key === 'string' ? [f.key] : evalJq(f.key, input).map(String);
        const values = evalJq(f.value, input);
        const nextResults: { [k: string]: Json }[] = [];
        for (const r of results) for (const k of keys) for (const v of values) nextResults.push({ ...r, [k]: v });
        results = nextResults;
      }
      return results;
    }
    case 'binop': {
      if (node.op === 'and' || node.op === 'or') {
        return evalJq(node.left, input).flatMap((l) => {
          if (node.op === 'and' && !truthy(l)) return [false];
          if (node.op === 'or' && truthy(l)) return [true];
          return evalJq(node.right, input).map(truthy);
        });
      }
      if (node.op === '//') {
        const left = evalJq(node.left, input).filter(truthy);
        return left.length ? left : evalJq(node.right, input);
      }
      const out: Json[] = [];
      for (const r of evalJq(node.right, input)) {
        for (const l of evalJq(node.left, input)) {
          switch (node.op) {
            case '==': out.push(compare(l, r) === 0); break;
            case '!=': out.push(compare(l, r) !== 0); break;
            case '>': out.push(compare(l, r) > 0); break;
            case '<': out.push(compare(l, r) < 0); break;
            case '>=': out.push(compare(l, r) >= 0); break;
            case '<=': out.push(compare(l, r) <= 0); break;
            case '+':
              if (typeof l === 'number' && typeof r === 'number') out.push(l + r);
              else if (typeof l === 'string' && typeof r === 'string') out.push(l + r);
              else if (Array.isArray(l) && Array.isArray(r)) out.push([...l, ...r]);
              else if (l === null) out.push(r);
              else throw new JqError(`jq: error: ${typeName(l)} and ${typeName(r)} cannot be added`);
              break;
            case '-':
              if (typeof l === 'number' && typeof r === 'number') out.push(l - r);
              else throw new JqError(`jq: error: ${typeName(l)} and ${typeName(r)} cannot be subtracted`);
              break;
          }
        }
      }
      return out;
    }
    case 'format':
      if (!Array.isArray(input)) throw new JqError(`jq: error: ${typeName(input)} cannot be ${node.name}-formatted, only an array can be`);
      if (node.name === '@tsv') return [input.map(tsvCell).join('\t')];
      if (node.name === '@csv') return [input.map((v) => (typeof v === 'string' ? `"${v.replace(/"/g, '""')}"` : tsvCell(v))).join(',')];
      throw new JqError(`jq: error: ${node.name} is not a valid format (bu simulyatorda: @tsv, @csv)`);
    case 'call':
      return callJq(node.name, node.args, input);
  }
}

function strArg(args: Node[], input: Json, name: string): string {
  const v = args[0] ? evalJq(args[0], input)[0] : undefined;
  if (typeof v !== 'string') throw new JqError(`jq: error: ${name}() matn argument kutadi`);
  return v;
}

function callJq(name: string, args: Node[], input: Json): Json[] {
  switch (name) {
    case 'select':
      return evalJq(args[0]!, input).some(truthy) ? [input] : [];
    case 'length':
      if (input === null) return [0];
      if (typeof input === 'string' || Array.isArray(input)) return [input.length];
      if (typeof input === 'object') return [Object.keys(input).length];
      if (typeof input === 'number') return [Math.abs(input)];
      throw new JqError('jq: error: boolean has no length');
    case 'keys':
      if (input && typeof input === 'object' && !Array.isArray(input)) return [Object.keys(input).sort()];
      if (Array.isArray(input)) return [input.map((_, i) => i)];
      throw new JqError(`jq: error: ${typeName(input)} has no keys`);
    case 'not':
      return [!truthy(input)];
    case 'tostring':
      return [typeof input === 'string' ? input : JSON.stringify(input)];
    case 'tonumber':
      return [Number(input)];
    case 'ascii_downcase':
      return [String(input).toLowerCase()];
    case 'test':
      return [new RegExp(strArg(args, input, name)).test(String(input ?? ''))];
    case 'contains':
      if (typeof input === 'string') return [input.includes(strArg(args, input, name))];
      throw new JqError('jq: error: bu simulyatorda contains() faqat matn uchun');
    case 'startswith':
      return [String(input).startsWith(strArg(args, input, name))];
    case 'endswith':
      return [String(input).endsWith(strArg(args, input, name))];
    case 'join': {
      if (!Array.isArray(input)) throw new JqError(`jq: error: Cannot iterate over ${typeName(input)}`);
      const sep = strArg(args, input, name);
      return [input.map((v) => (v === null ? '' : typeof v === 'string' ? v : JSON.stringify(v))).join(sep)];
    }
    case 'map':
      if (!Array.isArray(input)) throw new JqError(`jq: error: Cannot iterate over ${typeName(input)}`);
      return [input.flatMap((v) => evalJq(args[0]!, v))];
    case 'sort':
      if (!Array.isArray(input)) throw new JqError(`jq: error: ${typeName(input)} cannot be sorted`);
      return [[...input].sort(compare)];
    case 'unique':
      if (!Array.isArray(input)) throw new JqError(`jq: error: ${typeName(input)} cannot be sorted`);
      return [[...input].sort(compare).filter((v, i, a) => i === 0 || compare(a[i - 1]!, v) !== 0)];
    case 'empty':
      return [];
    default:
      throw new JqError(
        `jq: error: ${name}/${args.length} is not defined (bu simulyatorda: select, length, keys, test, contains, startswith, endswith, join, map, sort, unique, not, tostring)`,
      );
  }
}

function render(v: Json, raw: boolean, compact: boolean): string {
  if (raw && typeof v === 'string') return v;
  return compact ? JSON.stringify(v) : JSON.stringify(v, null, 2);
}

/** Whole input as one JSON value, or one value per line (JSON Lines, as CloudTrail and many log shippers write). */
function parseInputs(text: string): Json[] {
  const trimmed = text.trim();
  if (!trimmed) return [];
  try {
    return [JSON.parse(trimmed) as Json];
  } catch {
    return toLines(trimmed)
      .filter((l) => l.trim())
      .map((l, i) => {
        try {
          return JSON.parse(l) as Json;
        } catch {
          throw new JqError(`jq: error (at line ${i + 1}): Invalid JSON text`);
        }
      });
  }
}

export const jq: Command = (args, ctx) => {
  const flags = new Set<string>();
  const rest: string[] = [];
  for (const a of args) {
    if (/^-[rcs]+$/.test(a)) for (const ch of a.slice(1)) flags.add(ch);
    else rest.push(a);
  }
  const [filter = '.', ...files] = rest;
  const input = readInput('jq', files, ctx);
  if ('err' in input) return fail(input.err);
  try {
    const ast = parseJq(filter);
    let values = parseInputs(input.text);
    if (flags.has('s')) values = [values];
    const out = values.flatMap((v) => evalJq(ast, v)).map((v) => render(v, flags.has('r'), flags.has('c')));
    return ok(out.join('\n'));
  } catch (err) {
    if (err instanceof JqError) return fail(err.message, 5);
    if (err instanceof SyntaxError) return fail(`jq: error: ${err.message}`, 5);
    throw err;
  }
};

/* ── sha256sum ─────────────────────────────────────────────────────────── */

const K = Uint32Array.from([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01,
  0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc,
  0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147,
  0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070, 0x19a4c116, 0x1e376c08,
  0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
  0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

/** SHA-256 of the UTF-8 bytes of `text`, as lower-case hex. */
export function sha256Hex(text: string): string {
  const bytes = new TextEncoder().encode(text);
  const bitLen = bytes.length * 8;
  const padded = new Uint8Array(Math.ceil((bytes.length + 9) / 64) * 64);
  padded.set(bytes);
  padded[bytes.length] = 0x80;
  const view = new DataView(padded.buffer);
  view.setUint32(padded.length - 8, Math.floor(bitLen / 2 ** 32));
  view.setUint32(padded.length - 4, bitLen >>> 0);
  const h = Uint32Array.from([0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19]);
  const w = new Uint32Array(64);
  const rotr = (x: number, n: number) => (x >>> n) | (x << (32 - n));
  for (let off = 0; off < padded.length; off += 64) {
    for (let i = 0; i < 16; i++) w[i] = view.getUint32(off + i * 4);
    for (let i = 16; i < 64; i++) {
      const s0 = rotr(w[i - 15]!, 7) ^ rotr(w[i - 15]!, 18) ^ (w[i - 15]! >>> 3);
      const s1 = rotr(w[i - 2]!, 17) ^ rotr(w[i - 2]!, 19) ^ (w[i - 2]! >>> 10);
      w[i] = (w[i - 16]! + s0 + w[i - 7]! + s1) >>> 0;
    }
    let [a, b, c, d, e, f, g, hh] = h as unknown as number[];
    for (let i = 0; i < 64; i++) {
      const S1 = rotr(e!, 6) ^ rotr(e!, 11) ^ rotr(e!, 25);
      const ch = (e! & f!) ^ (~e! & g!);
      const t1 = (hh! + S1 + ch + K[i]! + w[i]!) >>> 0;
      const S0 = rotr(a!, 2) ^ rotr(a!, 13) ^ rotr(a!, 22);
      const maj = (a! & b!) ^ (a! & c!) ^ (b! & c!);
      const t2 = (S0 + maj) >>> 0;
      hh = g;
      g = f;
      f = e;
      e = (d! + t1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (t1 + t2) >>> 0;
    }
    h[0] = (h[0]! + a!) >>> 0;
    h[1] = (h[1]! + b!) >>> 0;
    h[2] = (h[2]! + c!) >>> 0;
    h[3] = (h[3]! + d!) >>> 0;
    h[4] = (h[4]! + e!) >>> 0;
    h[5] = (h[5]! + f!) >>> 0;
    h[6] = (h[6]! + g!) >>> 0;
    h[7] = (h[7]! + hh!) >>> 0;
  }
  return Array.from(h, (x) => x.toString(16).padStart(8, '0')).join('');
}

export const sha256sum: Command = (args, ctx) => {
  const check = args.includes('-c') || args.includes('--check');
  const files = args.filter((a) => !a.startsWith('-'));
  if (check) {
    const list = readInput('sha256sum', files, ctx);
    if ('err' in list) return fail(list.err);
    const out: string[] = [];
    let failed = 0;
    for (const line of toLines(list.text)) {
      const m = /^([0-9a-f]{64})\s+\*?(.+)$/.exec(line.trim());
      if (!m) continue;
      const target = readInput('sha256sum', [m[2]!], ctx);
      const good = !('err' in target) && sha256Hex(target.text) === m[1];
      if (!good) failed++;
      out.push(`${m[2]}: ${'err' in target ? 'FAILED open or read' : good ? 'OK' : 'FAILED'}`);
    }
    if (failed) out.push(`sha256sum: WARNING: ${failed} computed checksum${failed > 1 ? 's' : ''} did NOT match`);
    return { out: out.join('\n'), code: failed ? 1 : 0 };
  }
  if (!files.length) {
    if (ctx.stdin === null) return fail('Ishlatilishi: sha256sum FAYL...   yoki   sha256sum -c ROYXAT');
    return ok(`${sha256Hex(ctx.stdin)}  -`);
  }
  const out: string[] = [];
  for (const f of files) {
    const input = readInput('sha256sum', [f], ctx);
    if ('err' in input) return fail(input.err);
    out.push(`${sha256Hex(input.text)}  ${f}`);
  }
  return ok(out.join('\n'));
};


