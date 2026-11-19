import { parse, PsParseError, type Arg, type Expr, type Pipeline, type Statement } from './parse';
import { formatOutput } from './format';
import { makeBound, PsError, ACCESS_DENIED, wild, type Cmdlet, type CmdletCtx, type Session } from './types';
import {
  date,
  flat,
  getProp,
  isBytes,
  isDate,
  isHash,
  isObj,
  obj,
  parseDate,
  toNum,
  toStr,
  truthy,
  type PsBlock,
  type PsVal,
} from './values';
import { CORE } from './cmdlets/core';
import { FILES, winPath } from './cmdlets/files';
import { SYSTEM } from './cmdlets/system';
import { NETWORK } from './cmdlets/network';
import { SECURITY } from './cmdlets/security';

const ALL: Cmdlet[] = [...CORE, ...FILES, ...SYSTEM, ...NETWORK, ...SECURITY];
export const CMDLETS = new Map(ALL.map((c) => [c.name.toLowerCase(), c]));

export const ALIASES: Record<string, string> = {
  '?': 'Where-Object', where: 'Where-Object', '%': 'ForEach-Object', foreach: 'ForEach-Object',
  select: 'Select-Object', sort: 'Sort-Object', group: 'Group-Object', measure: 'Measure-Object',
  ft: 'Format-Table', fl: 'Format-List', gm: 'Get-Member', echo: 'Write-Output', write: 'Write-Output',
  ls: 'Get-ChildItem', dir: 'Get-ChildItem', gci: 'Get-ChildItem', cd: 'Set-Location', sl: 'Set-Location', chdir: 'Set-Location',
  pwd: 'Get-Location', gl: 'Get-Location', cat: 'Get-Content', gc: 'Get-Content', type: 'Get-Content',
  cp: 'Copy-Item', copy: 'Copy-Item', cpi: 'Copy-Item', mv: 'Move-Item', move: 'Move-Item', mi: 'Move-Item',
  rm: 'Remove-Item', del: 'Remove-Item', erase: 'Remove-Item', rd: 'Remove-Item', ri: 'Remove-Item', rmdir: 'Remove-Item',
  ren: 'Rename-Item', rni: 'Rename-Item', ni: 'New-Item', md: 'mkdir', gi: 'Get-Item', gp: 'Get-ItemProperty',
  ps: 'Get-Process', gps: 'Get-Process', kill: 'Stop-Process', spps: 'Stop-Process', gsv: 'Get-Service',
  sls: 'Select-String', tee: 'Tee-Object', cls: 'Clear-Host', clear: 'Clear-Host', h: 'Get-History', history: 'Get-History',
  gcm: 'Get-Command', help: 'Get-Help', man: 'Get-Help', diff: 'Compare-Object', compare: 'Compare-Object',
  gcim: 'Get-CimInstance', ipconfig: 'ipconfig.exe', whoami: 'whoami.exe', hostname: 'hostname.exe',
  netstat: 'netstat.exe', systeminfo: 'systeminfo.exe', tasklist: 'tasklist.exe', ping: 'ping.exe',
};

export function resolveCommand(name: string): Cmdlet | null {
  const lower = name.toLowerCase().replace(/^.*\\(?=[^\\]+\.exe$)/, '');
  const direct = CMDLETS.get(lower) ?? CMDLETS.get(lower + '.exe');
  if (direct) return direct;
  const alias = Object.entries(ALIASES).find(([a]) => a === lower)?.[1];
  return alias ? CMDLETS.get(alias.toLowerCase()) ?? null : null;
}

const blockCache = new Map<string, Statement[]>();

export class Interp {
  /** $_ stack for nested script blocks. */
  private items: PsVal[] = [];
  constructor(readonly s: Session) {}

  /* ── statements ── */

  runStatements(stmts: Statement[]): PsVal[] {
    const out: PsVal[] = [];
    for (const st of stmts) out.push(...this.runStatement(st));
    return out;
  }

  runStatement(st: Statement): PsVal[] {
    if (st.t === 'assign') {
      const values = this.runPipeline(st.value);
      let v: PsVal = collapse(values);
      if (st.op === '+=') {
        const old = this.getVar(st.name);
        v = add(old ?? null, v);
      }
      this.setVar(st.name, v);
      return [];
    }
    return this.runPipeline(st);
  }

  runPipeline(p: Pipeline): PsVal[] {
    let values: PsVal[] = [];
    p.stages.forEach((stage, i) => {
      if (stage.t === 'expr') {
        if (i > 0) throw new PsError('Expressions are only allowed as the first element of a pipeline.');
        const v = this.eval(stage.e);
        values = Array.isArray(v) ? flat(v) : v === null && stage.e.t === 'sub' ? [] : [v];
        return;
      }
      values = this.runCommand(stage.name, stage.args, values, i > 0);
    });
    if (p.redirect) {
      const path = toStr(this.eval(p.redirect.path));
      const text = formatOutput(values);
      const cmd = this.cmdlet('Out-File');
      cmd.run(this.ctx(cmd, 'Out-File', makeBound({ FilePath: path, Append: p.redirect.append, InputText: text }, []), [], false));
      return [];
    }
    return values;
  }

  private cmdlet(name: string): Cmdlet {
    return CMDLETS.get(name.toLowerCase())!;
  }

  runCommand(name: string, args: Arg[], input: PsVal[], piped: boolean): PsVal[] {
    const cmd = resolveCommand(name);
    if (!cmd) {
      throw new PsError(
        `${name}: The term '${name}' is not recognized as a name of a cmdlet, function, script file, or executable program.\nCheck the spelling of the name, or if a path was included, verify that the path is correct and try again.`,
      );
    }
    if (cmd.admin && !this.s.win.elevated) throw new PsError(`${name}: ${ACCESS_DENIED}`);
    const bound = this.bind(cmd, name, args);
    try {
      const res = cmd.run(this.ctx(cmd, name, bound, input, piped));
      return Array.isArray(res) ? res : res === undefined ? [] : [res];
    } catch (e) {
      if (e instanceof PsError && !e.message.startsWith(name + ':')) throw new PsError(`${name}: ${e.message}`);
      throw e;
    }
  }

  private ctx(cmd: Cmdlet, name: string, p: ReturnType<typeof makeBound>, input: PsVal[], piped: boolean): CmdletCtx {
    return {
      s: this.s,
      input: flat(input),
      piped,
      p,
      name,
      runBlock: (block, item) => this.runBlock(block, item),
      error: (msg) => this.s.errors.push(`${name}: ${msg}`),
    };
    void cmd;
  }

  bind(cmd: Cmdlet, name: string, args: Arg[]) {
    const values: Record<string, PsVal> = {};
    const rest: string[] = [];
    if (cmd.native) {
      for (const a of args) rest.push(a.kind === 'param' ? `-${a.name}${a.value ? ':' + toStr(this.eval(a.value)) : ''}` : toStr(this.eval(a.e)));
      return makeBound(values, rest);
    }
    const positional: PsVal[] = [];
    for (let i = 0; i < args.length; i++) {
      const a = args[i]!;
      if (a.kind === 'val') {
        positional.push(this.eval(a.e));
        continue;
      }
      const lower = a.name.toLowerCase();
      const common = ['erroraction', 'warningaction', 'confirm', 'whatif', 'verbose', 'outvariable', 'ea'];
      let spec = cmd.params.find((p) => p.name.toLowerCase() === lower || p.aliases?.some((x) => x.toLowerCase() === lower));
      if (!spec) {
        const hits = cmd.params.filter((p) => p.name.toLowerCase().startsWith(lower));
        if (hits.length > 1) {
          throw new PsError(
            `${name}: Parameter cannot be processed because the parameter name '${a.name}' is ambiguous. Possible matches include: ${hits.map((h) => '-' + h.name).join(' ')}.`,
          );
        }
        spec = hits[0];
      }
      if (!spec) {
        if (common.some((c) => c.startsWith(lower))) {
          // Common parameters are accepted and ignored; -ErrorAction's value is consumed.
          if (!a.value && /^(e|w|o)/.test(lower) && args[i + 1]?.kind === 'val') i++;
          continue;
        }
        throw new PsError(`${name}: A parameter cannot be found that matches parameter name '${a.name}'.`);
      }
      if (spec.switch) {
        values[spec.name] = a.value ? this.eval(a.value) : true;
        continue;
      }
      if (a.value) {
        values[spec.name] = this.eval(a.value);
        continue;
      }
      const next = args[i + 1];
      if (!next || next.kind !== 'val') {
        throw new PsError(`${name}: Missing an argument for parameter '${spec.name}'. Specify a parameter of type 'System.String' and try again.`);
      }
      values[spec.name] = this.eval(next.e);
      i++;
    }
    const free = cmd.params.filter((p) => p.pos !== undefined && !(p.name in values)).sort((x, y) => x.pos! - y.pos!);
    for (const v of positional) {
      const spec = free.shift();
      if (!spec) throw new PsError(`${name}: A positional parameter cannot be found that accepts argument '${toStr(v)}'.`);
      values[spec.name] = v;
    }
    return makeBound(values, rest);
  }

  runBlock(block: PsBlock, item?: PsVal): PsVal[] {
    let stmts = blockCache.get(block.src);
    if (!stmts) {
      stmts = parse(block.src);
      blockCache.set(block.src, stmts);
    }
    this.items.push(item === undefined ? null : item);
    try {
      return this.runStatements(stmts);
    } finally {
      this.items.pop();
    }
  }

  /* ── variables ── */

  getVar(name: string): PsVal | undefined {
    const lower = name.toLowerCase();
    if (lower === '_' || lower === 'psitem') return this.items.length ? this.items[this.items.length - 1]! : null;
    if (lower === 'true') return true;
    if (lower === 'false') return false;
    if (lower === 'null') return null;
    if (lower.startsWith('env:')) {
      const key = Object.keys(this.s.win.env).find((k) => k.toLowerCase() === lower.slice(4));
      return key ? this.s.win.env[key]! : null;
    }
    if (lower === 'pwd') return obj('System.Management.Automation.PathInfo', { Path: winPath(this.s.state.cwd) }, { str: winPath(this.s.state.cwd) });
    if (lower === 'home') return `C:\\Users\\${this.s.state.user}`;
    if (lower === 'psversiontable') {
      return { kind: 'hash', entries: { PSVersion: '7.4.6', PSEdition: 'Core', OS: this.s.win.os, Platform: 'Win32NT' } };
    }
    return this.s.win.vars[lower];
  }

  setVar(name: string, v: PsVal) {
    const lower = name.toLowerCase();
    if (lower.startsWith('env:')) {
      const key = Object.keys(this.s.win.env).find((k) => k.toLowerCase() === lower.slice(4)) ?? name.slice(4);
      this.s.win.env[key] = toStr(v);
      return;
    }
    this.s.win.vars[lower] = v;
  }

  /* ── expressions ── */

  eval(e: Expr): PsVal {
    switch (e.t) {
      case 'str':
        return e.v;
      case 'num':
        return e.v;
      case 'xstr':
        return e.parts.map((p) => (typeof p === 'string' ? p : toStr(this.eval(p)))).join('');
      case 'var': {
        const v = this.getVar(e.name);
        return v === undefined ? null : v;
      }
      case 'member': {
        const of = this.eval(e.of);
        return member(of, e.name);
      }
      case 'index': {
        const of = this.eval(e.of);
        const idx = this.eval(e.index);
        if (Array.isArray(of)) {
          const n = toNum(idx);
          return of[n < 0 ? of.length + n : n] ?? null;
        }
        if (typeof of === 'string') return of[toNum(idx)] ?? null;
        if (isBytes(of)) return of.data[toNum(idx)] ?? null;
        if (isHash(of) || isObj(of)) return getProp(of, toStr(idx)) ?? null;
        return toNum(idx) === 0 ? of : null;
      }
      case 'call':
        return this.call(this.eval(e.of), e.name, e.args.map((a) => this.eval(a)));
      case 'static':
        if (/^(system.)?datetime$/i.test(e.type) && /^(now|utcnow|today)$/i.test(e.name)) return date(this.s.win.now + this.s.state.history.length * 1000);
        return staticMember(e.type, e.name, e.args?.map((a) => this.eval(a)) ?? null);
      case 'cast':
        return cast(e.type, this.eval(e.of));
      case 'type':
        return e.type;
      case 'array': {
        const out: PsVal[] = [];
        for (const item of e.items) {
          if (item.t === 'sub') out.push(...flat(this.runStatements(item.body)));
          else out.push(this.eval(item));
        }
        return out;
      }
      case 'sub':
        return collapse(this.runStatements(e.body));
      case 'hash': {
        const entries: Record<string, PsVal> = {};
        for (const [k, v] of e.entries) entries[k] = this.eval(v);
        return { kind: 'hash', entries };
      }
      case 'block':
        return { kind: 'block', src: e.src };
      case 'not':
        return !truthy(this.eval(e.of));
      case 'neg':
        return -toNum(this.eval(e.of));
      case 'bin':
        return this.binary(e.op, e.l, e.r);
    }
  }

  binary(op: string, le: Expr, re: Expr): PsVal {
    if (op === 'and') return truthy(this.eval(le)) && truthy(this.eval(re));
    if (op === 'or') return truthy(this.eval(le)) || truthy(this.eval(re));
    if (op === 'xor') return truthy(this.eval(le)) !== truthy(this.eval(re));
    const l = this.eval(le);
    const r = this.eval(re);
    switch (op) {
      case '+':
        return add(l, r);
      case '-':
        if (isDate(l) && isDate(r)) return timespan(l.ms - r.ms);
        return toNum(l) - toNum(r);
      case '*':
        if (typeof l === 'string') return l.repeat(Math.max(0, toNum(r)));
        return toNum(l) * toNum(r);
      case '/':
        return toNum(l) / toNum(r);
      case '%':
        return toNum(l) % toNum(r);
    }
    const cs = op.startsWith('c') && op !== 'contains';
    const base = op.replace(/^[ci](?=[a-z]{2})/, '') as string;
    const realBase = ['eq', 'ne', 'gt', 'ge', 'lt', 'le', 'like', 'notlike', 'match', 'notmatch', 'contains', 'notcontains', 'in', 'notin', 'replace', 'split', 'join', 'is', 'isnot'].includes(op)
      ? op
      : base;
    return compareOp(realBase, l, r, cs, (m) => {
      this.s.win.vars.matches = m;
    });
  }

  call(of: PsVal, name: string, args: PsVal[]): PsVal {
    const lower = name.toLowerCase();
    if (isObj(of) && of.type.endsWith('Encoding')) {
      const enc = toStr(of.props.Name);
      if (lower === 'getstring') {
        const b = args[0];
        const bytes = isBytes(b ?? null) ? (b as { data: Uint8Array }).data : new Uint8Array((Array.isArray(b) ? b : []).map(toNum));
        if (enc === 'Unicode') {
          let s = '';
          for (let i = 0; i + 1 < bytes.length; i += 2) s += String.fromCharCode(bytes[i]! | (bytes[i + 1]! << 8));
          return s;
        }
        return new TextDecoder().decode(bytes);
      }
      if (lower === 'getbytes') {
        const s = toStr(args[0] ?? '');
        if (enc === 'Unicode') {
          const out = new Uint8Array(s.length * 2);
          for (let i = 0; i < s.length; i++) {
            out[i * 2] = s.charCodeAt(i) & 0xff;
            out[i * 2 + 1] = s.charCodeAt(i) >> 8;
          }
          return { kind: 'bytes', data: out };
        }
        return { kind: 'bytes', data: new TextEncoder().encode(s) };
      }
    }
    if (isDate(of)) {
      const n = toNum(args[0] ?? 0);
      const unit: Record<string, number> = { adddays: 864e5, addhours: 36e5, addminutes: 6e4, addseconds: 1e3 };
      if (lower in unit) return date(of.ms + n * unit[lower]!);
      if (lower === 'tostring') {
        const f = args[0] === undefined ? null : toStr(args[0]);
        if (!f) return toStr(of);
        const d = new Date(of.ms);
        const p2 = (x: number) => String(x).padStart(2, '0');
        return f
          .replace(/yyyy/g, String(d.getUTCFullYear()))
          .replace(/MM/g, p2(d.getUTCMonth() + 1))
          .replace(/dd/g, p2(d.getUTCDate()))
          .replace(/HH/g, p2(d.getUTCHours()))
          .replace(/mm/g, p2(d.getUTCMinutes()))
          .replace(/ss/g, p2(d.getUTCSeconds()));
      }
    }
    if (lower === 'tostring') return toStr(of);
    if (lower === 'gettype') return obj('System.RuntimeType', { Name: typeName(of) }, { str: typeName(of) });
    if (Array.isArray(of)) {
      if (lower === 'contains') return of.some((x) => toStr(x).toLowerCase() === toStr(args[0] ?? '').toLowerCase());
      // Method on a collection: applied to each element (member enumeration).
      return of.map((x) => this.call(x, name, args));
    }
    const s = toStr(of);
    const a = args.map((x) => toStr(x));
    switch (lower) {
      case 'toupper':
        return s.toUpperCase();
      case 'tolower':
        return s.toLowerCase();
      case 'trim':
        return a[0] ? s.replace(new RegExp(`^[${esc(a[0])}]+|[${esc(a[0])}]+$`, 'g'), '') : s.trim();
      case 'trimstart':
        return s.trimStart();
      case 'trimend':
        return s.trimEnd();
      case 'split':
        return s.split(a.length ? new RegExp(`[${esc(a.join(''))}]`) : /\s/);
      case 'replace':
        return s.split(a[0] ?? '').join(a[1] ?? '');
      case 'contains':
        return s.includes(a[0] ?? '');
      case 'startswith':
        return s.startsWith(a[0] ?? '');
      case 'endswith':
        return s.endsWith(a[0] ?? '');
      case 'indexof':
        return s.indexOf(a[0] ?? '');
      case 'substring':
        return args.length > 1 ? s.substr(toNum(args[0]!), toNum(args[1]!)) : s.slice(toNum(args[0] ?? 0));
      case 'padleft':
        return s.padStart(toNum(args[0] ?? 0), a[1] ?? ' ');
      case 'padright':
        return s.padEnd(toNum(args[0] ?? 0), a[1] ?? ' ');
    }
    throw new PsError(`Method invocation failed because [${typeName(of)}] does not contain a method named '${name}'.`);
  }
}

const esc = (s: string) => s.replace(/[\]\\^-]/g, '\\$&');

function typeName(v: PsVal): string {
  if (v === null) return 'null';
  if (typeof v === 'string') return 'String';
  if (typeof v === 'number') return Number.isInteger(v) ? 'Int32' : 'Double';
  if (typeof v === 'boolean') return 'Boolean';
  if (Array.isArray(v)) return 'Object[]';
  if (v.kind === 'obj') return v.type.split('.').pop()!;
  if (v.kind === 'date') return 'DateTime';
  if (v.kind === 'hash') return 'Hashtable';
  if (v.kind === 'bytes') return 'Byte[]';
  return 'ScriptBlock';
}

export function collapse(values: PsVal[]): PsVal {
  if (values.length === 0) return null;
  if (values.length === 1) return values[0]!;
  return values;
}

function member(of: PsVal, name: string): PsVal {
  if (Array.isArray(of)) {
    const lower = name.toLowerCase();
    if (lower === 'count' || lower === 'length') return of.length;
    const vals = of.map((x) => getProp(x, name)).filter((x): x is PsVal => x !== undefined);
    return flat(vals);
  }
  if (isHash(of)) {
    const lower = name.toLowerCase();
    if (lower === 'keys') return Object.keys(of.entries);
    if (lower === 'values') return Object.values(of.entries);
    if (lower === 'count') return Object.keys(of.entries).length;
  }
  const v = getProp(of, name);
  return v === undefined ? null : v;
}

function timespan(ms: number): PsVal {
  const total = Math.abs(ms) / 1000;
  const d = Math.floor(total / 86400);
  const h = Math.floor((total % 86400) / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = Math.floor(total % 60);
  const p2 = (x: number) => String(x).padStart(2, '0');
  return obj(
    'System.TimeSpan',
    { Days: d, Hours: h, Minutes: m, Seconds: s, TotalHours: Math.round((total / 3600) * 100) / 100, TotalMinutes: Math.round((total / 60) * 100) / 100, TotalSeconds: total },
    { str: `${d ? d + '.' : ''}${p2(h)}:${p2(m)}:${p2(s)}`, list: true },
  );
}

function add(l: PsVal, r: PsVal): PsVal {
  if (l === null) return r;
  if (Array.isArray(l)) return [...l, ...(Array.isArray(r) ? r : [r])];
  if (typeof l === 'string') return l + toStr(r);
  if (isDate(l)) return l;
  if (isHash(l) && isHash(r)) return { kind: 'hash', entries: { ...l.entries, ...r.entries } };
  return toNum(l) + toNum(r);
}

/** The left side decides the type, as in PowerShell. */
function cmp(l: PsVal, r: PsVal, cs: boolean): number {
  if (typeof l === 'number') {
    const rn = toNum(r);
    return Number.isNaN(rn) ? String(l).localeCompare(toStr(r)) : l - rn;
  }
  if (isDate(l)) {
    const rm = isDate(r) ? r.ms : parseDate(toStr(r));
    return rm === null ? NaN : l.ms - rm;
  }
  if (typeof l === 'boolean') return Number(l) - Number(truthy(r));
  const a = cs ? toStr(l) : toStr(l).toLowerCase();
  const b = cs ? toStr(r) : toStr(r).toLowerCase();
  return a < b ? -1 : a > b ? 1 : 0;
}

function compareOp(op: string, l: PsVal, r: PsVal, cs: boolean, setMatches: (m: PsVal) => void): PsVal {
  const flags = cs ? '' : 'i';
  const scalar = (x: PsVal): boolean => {
    switch (op) {
      case 'eq':
        return cmp(x, r, cs) === 0;
      case 'ne':
        return cmp(x, r, cs) !== 0;
      case 'gt':
        return cmp(x, r, cs) > 0;
      case 'ge':
        return cmp(x, r, cs) >= 0;
      case 'lt':
        return cmp(x, r, cs) < 0;
      case 'le':
        return cmp(x, r, cs) <= 0;
      case 'like':
        return new RegExp(wild(toStr(r)).source, cs ? 's' : 'is').test(toStr(x));
      case 'notlike':
        return !new RegExp(wild(toStr(r)).source, cs ? 's' : 'is').test(toStr(x));
      case 'match':
      case 'notmatch': {
        const m = new RegExp(toStr(r), flags).exec(toStr(x));
        if (m && op === 'match') {
          const entries: Record<string, PsVal> = {};
          m.forEach((g, i) => {
            if (g !== undefined) entries[String(i)] = g;
          });
          for (const [k, v] of Object.entries(m.groups ?? {})) if (v !== undefined) entries[k] = v;
          setMatches({ kind: 'hash', entries });
        }
        return op === 'match' ? !!m : !m;
      }
    }
    return false;
  };
  switch (op) {
    case 'contains':
    case 'notcontains': {
      const list = Array.isArray(l) ? l : [l];
      const hit = list.some((x) => cmp(x, r, cs) === 0);
      return op === 'contains' ? hit : !hit;
    }
    case 'in':
    case 'notin': {
      const list = Array.isArray(r) ? r : [r];
      const hit = list.some((x) => cmp(x, l, cs) === 0);
      return op === 'in' ? hit : !hit;
    }
    case 'replace': {
      const [pat, rep] = Array.isArray(r) ? [toStr(r[0] ?? ''), toStr(r[1] ?? '')] : [toStr(r), ''];
      const re = new RegExp(pat, 'g' + flags);
      const one = (x: PsVal) => toStr(x).replace(re, rep);
      return Array.isArray(l) ? l.map(one) : one(l);
    }
    case 'split':
      return toStr(l).split(new RegExp(toStr(r), flags));
    case 'join':
      return (Array.isArray(l) ? l : [l]).map(toStr).join(toStr(r));
    case 'is':
    case 'isnot': {
      const t = toStr(r).toLowerCase().replace(/^system\./, '');
      const name = typeName(l).toLowerCase();
      const hit = t === name || (t === 'int' && name === 'int32') || (t === 'datetime' && name === 'datetime') || (t === 'array' && Array.isArray(l));
      return op === 'is' ? hit : !hit;
    }
  }
  if (Array.isArray(l)) return l.filter((x) => scalar(x));
  return scalar(l);
}

function cast(type: string, v: PsVal): PsVal {
  const t = type.toLowerCase().replace(/^system\./, '');
  if (t === 'int' || t === 'int32' || t === 'long' || t === 'int64') return Math.round(toNum(v));
  if (t === 'double' || t === 'decimal') return toNum(v);
  if (t === 'string') return toStr(v);
  if (t === 'bool') return truthy(v);
  if (t === 'datetime') {
    const ms = isDate(v) ? v.ms : parseDate(toStr(v));
    if (ms === null) throw new PsError(`Cannot convert value "${toStr(v)}" to type "System.DateTime".`);
    return date(ms);
  }
  if (t === 'array' || t.endsWith('[]')) return Array.isArray(v) ? v : [v];
  if ((t === 'pscustomobject' || t === 'management.automation.pscustomobject') && isHash(v)) return obj('System.Management.Automation.PSCustomObject', { ...v.entries });
  return v;
}

function staticMember(type: string, name: string, args: PsVal[] | null): PsVal {
  const t = type.toLowerCase().replace(/^system\./, '');
  const n = name.toLowerCase();
  if (t === 'convert') {
    if (n === 'frombase64string') {
      const s = toStr(args?.[0] ?? '');
      let bin: string;
      try {
        bin = atob(s.trim());
      } catch {
        throw new PsError('Exception calling "FromBase64String" with "1" argument(s): "The input is not a valid Base-64 string as it contains a non-base 64 character, more than two padding characters, or an illegal character among the padding characters."');
      }
      return { kind: 'bytes', data: Uint8Array.from(bin, (c) => c.charCodeAt(0)) };
    }
    if (n === 'tobase64string') {
      const b = args?.[0] ?? null;
      const bytes = isBytes(b) ? b.data : new TextEncoder().encode(toStr(b));
      return btoa(String.fromCharCode(...bytes));
    }
  }
  if (t === 'text.encoding' || t === 'encoding') {
    const names: Record<string, string> = { unicode: 'Unicode', utf8: 'UTF8', ascii: 'ASCII' };
    if (names[n]) return obj(`System.Text.${names[n]}Encoding`, { Name: names[n]!, EncodingName: names[n]! });
  }
  if (t === 'math') {
    const a = (args ?? []).map(toNum);
    if (n === 'round') return a.length > 1 ? Math.round(a[0]! * 10 ** a[1]!) / 10 ** a[1]! : Math.round(a[0]!);
    if (n === 'floor') return Math.floor(a[0]!);
    if (n === 'ceiling') return Math.ceil(a[0]!);
    if (n === 'max') return Math.max(...a);
    if (n === 'min') return Math.min(...a);
  }
  throw new PsError(`Unable to find type [${type}] or member '${name}' in this simulator.`);
}

/** Run one PowerShell line: text output and an exit code. */
export function runPs(s: Session, line: string): { output: string; code: number; clear: boolean } {
  s.errors = [];
  const interp = new Interp(s);
  let stmts: Statement[];
  try {
    stmts = parse(line);
  } catch (e) {
    if (e instanceof PsParseError) return { output: `ParserError: ${e.message}`, code: 1, clear: false };
    throw e;
  }
  const parts: string[] = [];
  let code = 0;
  let clear = false;
  for (const st of stmts) {
    try {
      if (st.t === 'pipe' && st.stages.length === 1 && st.stages[0]!.t === 'cmd' && resolveCommand(st.stages[0]!.name)?.name === 'Clear-Host') {
        clear = true;
        continue;
      }
      const values = interp.runStatement(st);
      const text = formatOutput(values);
      if (s.errors.length) {
        parts.push(...s.errors);
        s.errors = [];
        code = 1;
      }
      if (text) parts.push(text);
    } catch (e) {
      if (s.errors.length) parts.push(...s.errors);
      s.errors = [];
      if (e instanceof PsError || e instanceof PsParseError) {
        parts.push(e.message);
        code = 1;
        break;
      }
      throw e;
    }
  }
  return { output: parts.join('\n'), code, clear };
}
