import { columnsOf, formatList, formatOutput, formatTable, type Column } from '../format';
import { PS_DOCS, psManText } from '../docs';
import { PsError, wild, hasWild, type Cmdlet, type CmdletCtx } from '../types';
import {
  date,
  flat,
  fmtDate,
  getProp,
  isBlock,
  isDate,
  isHash,
  isObj,
  obj,
  parseDate,
  propNames,
  toNum,
  toStr,
  truthy,
  type PsObj,
  type PsVal,
} from '../values';
import { writeText, readText } from './files';

/* ── property specs: names (with wildcards) or @{Name=...; Expression={...}} ── */

interface PropSpec {
  label: string;
  get: (o: PsVal) => PsVal;
  descending?: boolean;
}

function propSpecs(c: CmdletCtx, raw: PsVal | undefined, sample: PsVal[]): PropSpec[] {
  if (raw === undefined) return [];
  const list = Array.isArray(raw) ? raw : [raw];
  const out: PropSpec[] = [];
  for (const item of list) {
    if (isHash(item)) {
      const e = item.entries;
      const key = (...names: string[]) => Object.keys(e).find((k) => names.some((n) => n.toLowerCase() === k.toLowerCase() || n.toLowerCase().startsWith(k.toLowerCase())));
      const labelKey = key('Name', 'Label');
      const exprKey = key('Expression');
      const descKey = key('Descending');
      const expr = exprKey ? e[exprKey]! : null;
      const label = labelKey ? toStr(e[labelKey]!) : expr && !isBlock(expr) ? toStr(expr) : 'Expression';
      out.push({
        label,
        get: (o) => (expr === null ? null : isBlock(expr) ? collapseVals(c.runBlock(expr, o)) : getProp(o, toStr(expr)) ?? null),
        ...(descKey ? { descending: truthy(e[descKey]!) } : {}),
      });
      continue;
    }
    if (isBlock(item)) {
      out.push({ label: item.src, get: (o) => collapseVals(c.runBlock(item, o)) });
      continue;
    }
    const name = toStr(item);
    if (hasWild(name)) {
      const re = wild(name);
      const names = new Set<string>();
      for (const s of sample) for (const n of propNames(s)) if (re.test(n)) names.add(n);
      for (const n of names) out.push({ label: n, get: (o) => getProp(o, n) ?? null });
      continue;
    }
    out.push({ label: realName(sample, name), get: (o) => getProp(o, name) ?? null });
  }
  return out;
}

/** "processname" → "ProcessName", as the object spells it. */
function realName(sample: PsVal[], name: string): string {
  for (const s of sample) {
    const hit = propNames(s).find((n) => n.toLowerCase() === name.toLowerCase());
    if (hit) return hit;
  }
  return name;
}

const collapseVals = (v: PsVal[]): PsVal => (v.length === 0 ? null : v.length === 1 ? v[0]! : v);

const toColumns = (specs: PropSpec[]): Column[] => specs.map((s) => ({ label: s.label, get: s.get }));

/* ── comparing values for Sort-Object, Group-Object, Compare-Object ── */

export function compareVals(a: PsVal, b: PsVal): number {
  if (a === null && b === null) return 0;
  if (a === null) return -1;
  if (b === null) return 1;
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  if (isDate(a) && isDate(b)) return a.ms - b.ms;
  if (typeof a === 'boolean' && typeof b === 'boolean') return Number(a) - Number(b);
  const x = toStr(a).toLowerCase();
  const y = toStr(b).toLowerCase();
  return x < y ? -1 : x > y ? 1 : 0;
}

const keyOf = (v: PsVal) => (isDate(v) ? String(v.ms) : toStr(v).toLowerCase());

/* ── cmdlets ── */

const OPS = ['EQ', 'NE', 'GT', 'GE', 'LT', 'LE', 'Like', 'NotLike', 'Match', 'NotMatch', 'Contains', 'NotContains', 'In', 'NotIn', 'CEQ', 'CLike', 'CMatch'];

const whereObject: Cmdlet = {
  name: 'Where-Object',
  params: [{ name: 'Property', pos: 0 }, { name: 'Value', pos: 1 }, { name: 'FilterScript' }, ...OPS.map((o) => ({ name: o, switch: true }))],
  run: (c) => {
    const first = c.p.get('FilterScript') ?? c.p.get('Property');
    if (first === undefined) throw new PsError('Shart kerak: Where-Object { $_.Status -eq "Running" } yoki Where-Object Status -eq Running');
    if (isBlock(first)) return c.input.filter((item) => truthy(collapseVals(c.runBlock(first, item))));
    const prop = toStr(first);
    const op = OPS.find((o) => c.p.sw(o));
    const value = c.p.get('Value');
    const src = op ? `$_.${prop} -${op.toLowerCase()} $__v` : `$_.${prop}`;
    c.s.win.vars.__v = value ?? null;
    return c.input.filter((item) => truthy(collapseVals(c.runBlock({ kind: 'block', src }, item))));
  },
};

const forEachObject: Cmdlet = {
  name: 'ForEach-Object',
  params: [{ name: 'Process', pos: 0, aliases: ['MemberName'] }, { name: 'Begin' }, { name: 'End' }, { name: 'ArgumentList', pos: 1 }],
  run: (c) => {
    const proc = c.p.get('Process');
    const out: PsVal[] = [];
    const begin = c.p.get('Begin');
    if (begin && isBlock(begin)) out.push(...c.runBlock(begin));
    if (proc === undefined) throw new PsError("Missing an argument for parameter 'Process'.");
    for (const item of c.input) {
      if (isBlock(proc)) out.push(...flat(c.runBlock(proc, item)));
      else {
        const v = getProp(item, toStr(proc));
        if (v !== undefined) out.push(...(Array.isArray(v) ? v : [v]));
      }
    }
    const end = c.p.get('End');
    if (end && isBlock(end)) out.push(...c.runBlock(end));
    return out;
  },
};

const selectObject: Cmdlet = {
  name: 'Select-Object',
  params: [
    { name: 'Property', pos: 0 },
    { name: 'ExpandProperty' },
    { name: 'ExcludeProperty' },
    { name: 'First' },
    { name: 'Last' },
    { name: 'Skip' },
    { name: 'Unique', switch: true },
    { name: 'Index' },
  ],
  run: (c) => {
    let items = c.input;
    if (c.p.sw('Unique')) {
      const seen = new Set<string>();
      items = items.filter((v) => {
        const k = isObj(v) ? JSON.stringify(Object.values(v.props).map(toStr)) : keyOf(v);
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      });
    }
    if (c.p.has('Skip')) items = items.slice(c.p.num('Skip'));
    if (c.p.has('Index')) items = (c.p.strs('Index') ?? []).map((i) => items[Number(i)]!).filter((x) => x !== undefined);
    if (c.p.has('First') || c.p.has('Last')) {
      const first = c.p.has('First') ? items.slice(0, c.p.num('First')) : [];
      const last = c.p.has('Last') ? items.slice(Math.max(0, items.length - c.p.num('Last')!)) : [];
      items = c.p.has('First') && c.p.has('Last') ? [...first, ...last] : c.p.has('First') ? first : last;
    }
    const expand = c.p.str('ExpandProperty');
    if (expand) {
      const out: PsVal[] = [];
      for (const v of items) {
        const x = getProp(v, expand);
        if (x === undefined) c.error(`Property "${expand}" cannot be found.`);
        else out.push(...(Array.isArray(x) ? x : [x]));
      }
      return out;
    }
    const raw = c.p.get('Property');
    if (raw === undefined) return items;
    let specs = propSpecs(c, raw, items);
    const exclude = c.p.strs('ExcludeProperty')?.map(wild);
    if (exclude) specs = specs.filter((s) => !exclude.some((r) => r.test(s.label)));
    return items.map((v) => {
      const props: Record<string, PsVal> = {};
      for (const s of specs) props[s.label] = s.get(v);
      const type = isObj(v) ? `Selected.${v.type}` : 'Selected.System.Object';
      return obj(type, props);
    });
  },
};

const sortObject: Cmdlet = {
  name: 'Sort-Object',
  params: [{ name: 'Property', pos: 0 }, { name: 'Descending', switch: true }, { name: 'Unique', switch: true }, { name: 'Top' }, { name: 'Bottom' }, { name: 'CaseSensitive', switch: true }],
  run: (c) => {
    const specs = propSpecs(c, c.p.get('Property'), c.input);
    const desc = c.p.sw('Descending');
    const keyed = c.input.map((v, i) => ({ v, i, keys: specs.length ? specs.map((s) => s.get(v)) : [v] }));
    keyed.sort((a, b) => {
      for (let k = 0; k < a.keys.length; k++) {
        const d = compareVals(a.keys[k]!, b.keys[k]!);
        const spec = specs[k];
        const down = spec?.descending ?? desc;
        if (d !== 0) return down ? -d : d;
      }
      return a.i - b.i;
    });
    let out = keyed.map((k) => k.v);
    if (c.p.sw('Unique')) {
      const seen = new Set<string>();
      out = out.filter((v, i) => {
        const k = specs.length ? keyed[i]!.keys.map(keyOf).join('\u0000') : keyOf(v);
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      });
    }
    if (c.p.has('Top')) out = out.slice(0, c.p.num('Top'));
    if (c.p.has('Bottom')) out = out.slice(Math.max(0, out.length - c.p.num('Bottom')!));
    return out;
  },
};

const groupObject: Cmdlet = {
  name: 'Group-Object',
  params: [{ name: 'Property', pos: 0 }, { name: 'NoElement', switch: true }],
  run: (c) => {
    const specs = propSpecs(c, c.p.get('Property'), c.input);
    const groups = new Map<string, { name: string; items: PsVal[] }>();
    for (const v of c.input) {
      const vals = specs.length ? specs.map((s) => s.get(v)) : [v];
      const name = vals.map(toStr).join(', ');
      const key = vals.map(keyOf).join('\u0000');
      const g = groups.get(key) ?? { name, items: [] };
      g.items.push(v);
      groups.set(key, g);
    }
    return [...groups.values()].map((g) =>
      obj(
        'Microsoft.PowerShell.Commands.GroupInfo',
        c.p.sw('NoElement') ? { Count: g.items.length, Name: g.name } : { Count: g.items.length, Name: g.name, Group: g.items },
        { view: c.p.sw('NoElement') ? ['Count', 'Name'] : ['Count', 'Name', 'Group'] },
      ),
    );
  },
};

const measureObject: Cmdlet = {
  name: 'Measure-Object',
  params: [
    { name: 'Property', pos: 0 },
    { name: 'Sum', switch: true },
    { name: 'Average', switch: true },
    { name: 'Maximum', switch: true },
    { name: 'Minimum', switch: true },
    { name: 'Line', switch: true },
    { name: 'Word', switch: true },
    { name: 'Character', switch: true },
  ],
  run: (c) => {
    if (c.p.sw('Line') || c.p.sw('Word') || c.p.sw('Character')) {
      const texts = c.input.map(toStr);
      const props: Record<string, PsVal> = {};
      if (c.p.sw('Line')) props.Lines = texts.reduce((n, t) => n + t.split('\n').filter((l) => l !== '').length, 0);
      if (c.p.sw('Word')) props.Words = texts.reduce((n, t) => n + t.split(/\s+/).filter(Boolean).length, 0);
      if (c.p.sw('Character')) props.Characters = texts.reduce((n, t) => n + t.length, 0);
      props.Property = null;
      return obj('Microsoft.PowerShell.Commands.TextMeasureInfo', props, { view: Object.keys(props) });
    }
    const prop = c.p.str('Property');
    const vals = c.input.map((v) => (prop ? getProp(v, prop) : v)).filter((v): v is PsVal => v !== undefined && v !== null);
    if (prop && c.input.length && !vals.length) throw new PsError(`The property "${prop}" cannot be found in the input for any objects.`);
    const nums = vals.map(toNum);
    const props: Record<string, PsVal> = { Count: vals.length, Average: null, Sum: null, Maximum: null, Minimum: null, Property: prop ?? null };
    const r = (n: number) => Math.round(n * 1e4) / 1e4;
    if (c.p.sw('Sum')) props.Sum = r(nums.reduce((a, b) => a + b, 0));
    if (c.p.sw('Average')) props.Average = nums.length ? r(nums.reduce((a, b) => a + b, 0) / nums.length) : null;
    if (c.p.sw('Maximum')) props.Maximum = nums.length ? Math.max(...nums) : null;
    if (c.p.sw('Minimum')) props.Minimum = nums.length ? Math.min(...nums) : null;
    return obj('Microsoft.PowerShell.Commands.GenericMeasureInfo', props, { list: true });
  },
};

const formatTableCmd: Cmdlet = {
  name: 'Format-Table',
  params: [{ name: 'Property', pos: 0 }, { name: 'AutoSize', switch: true }, { name: 'HideTableHeaders', switch: true }, { name: 'Wrap', switch: true }],
  run: (c) => {
    if (!c.input.length) return [];
    const raw = c.p.get('Property');
    const first = c.input.find(isObj);
    const cols = raw !== undefined ? toColumns(propSpecs(c, raw, c.input)) : first ? columnsOf(first.view ?? Object.keys(first.props)) : [{ label: 'Value', get: (o: PsVal) => o }];
    return obj('FormatText', {}, { str: formatTable(c.input, cols, { hideHeaders: c.p.sw('HideTableHeaders') }) });
  },
};

const formatListCmd: Cmdlet = {
  name: 'Format-List',
  params: [{ name: 'Property', pos: 0 }],
  run: (c) => {
    if (!c.input.length) return [];
    const raw = c.p.get('Property');
    const cols = raw !== undefined && !(toStr(raw) === '*') ? toColumns(propSpecs(c, raw, c.input)) : null;
    return obj('FormatText', {}, { str: formatList(c.input, cols) });
  },
};

const outString: Cmdlet = { name: 'Out-String', params: [{ name: 'Stream', switch: true }], run: (c) => formatOutput(c.input) + '\n' };
const outNull: Cmdlet = { name: 'Out-Null', params: [], run: () => [] };
const outHost: Cmdlet = { name: 'Out-Host', params: [], run: (c) => c.input };

const getMember: Cmdlet = {
  name: 'Get-Member',
  params: [{ name: 'Name', pos: 0 }, { name: 'MemberType' }],
  run: (c) => {
    const seen = new Set<string>();
    const out: PsVal[] = [];
    for (const v of c.input) {
      const type = isObj(v) ? v.type : typeof v === 'string' ? 'System.String' : typeof v === 'number' ? 'System.Int32' : isDate(v) ? 'System.DateTime' : 'System.Object';
      if (seen.has(type)) continue;
      seen.add(type);
      const names = isObj(v) ? Object.keys(v.props) : typeof v === 'string' ? ['Length'] : isDate(v) ? ['Day', 'Hour', 'Minute', 'Month', 'Year'] : [];
      const methods = typeof v === 'string' ? ['Contains', 'EndsWith', 'IndexOf', 'Replace', 'Split', 'StartsWith', 'Substring', 'ToLower', 'ToUpper', 'Trim'] : ['ToString'];
      const only = c.p.strs('Name')?.map(wild);
      const mt = c.p.str('MemberType')?.toLowerCase();
      const rows: PsVal[] = [];
      for (const n of [...names].sort((a, b) => a.localeCompare(b))) {
        const val = isObj(v) ? v.props[n] : getProp(v, n);
        const vt = val === null || val === undefined ? 'System.Object' : typeof val === 'number' ? 'int' : typeof val === 'boolean' ? 'bool' : isDate(val) ? 'datetime' : Array.isArray(val) ? 'Object[]' : 'string';
        if (only && !only.some((r) => r.test(n))) continue;
        if (mt && !'property'.startsWith(mt) && mt !== 'noteproperty') continue;
        rows.push(obj('MemberDefinition', { Name: n, MemberType: type.startsWith('Selected.') || type.endsWith('PSCustomObject') ? 'NoteProperty' : 'Property', Definition: `${vt} ${n} {get;}` }, { view: ['Name', 'MemberType', 'Definition'] }));
      }
      if (!mt || 'method'.startsWith(mt)) {
        for (const m of methods) if (!only || only.some((r) => r.test(m))) rows.push(obj('MemberDefinition', { Name: m, MemberType: 'Method', Definition: `${m}()` }, { view: ['Name', 'MemberType', 'Definition'] }));
      }
      out.push(obj('FormatText', {}, { str: `   TypeName: ${type}\n` }), ...rows);
    }
    return out;
  },
};

const writeOutput: Cmdlet = { name: 'Write-Output', params: [{ name: 'InputObject', pos: 0 }], run: (c) => (c.p.has('InputObject') ? flat([c.p.get('InputObject')!]) : c.input) };

const writeHost: Cmdlet = {
  name: 'Write-Host',
  params: [{ name: 'Object', pos: 0 }, { name: 'ForegroundColor' }, { name: 'BackgroundColor' }, { name: 'NoNewline', switch: true }, { name: 'Separator' }],
  run: (c) => {
    const v = c.p.get('Object');
    const list = v === undefined ? c.input : Array.isArray(v) ? v : [v];
    return list.map(toStr).join(c.p.str('Separator') ?? ' ');
  },
};

const compareObject: Cmdlet = {
  name: 'Compare-Object',
  params: [{ name: 'ReferenceObject', pos: 0 }, { name: 'DifferenceObject', pos: 1 }, { name: 'Property' }, { name: 'IncludeEqual', switch: true }, { name: 'ExcludeDifferent', switch: true }, { name: 'PassThru', switch: true }],
  run: (c) => {
    const ref = flat([c.p.get('ReferenceObject') ?? []]);
    const diff = flat([c.p.get('DifferenceObject') ?? c.input]);
    const props = c.p.strs('Property');
    const key = (v: PsVal) => (props ? props.map((p) => keyOf(getProp(v, p) ?? null)).join('\u0000') : keyOf(v));
    const refKeys = new Set(ref.map(key));
    const diffKeys = new Set(diff.map(key));
    const row = (v: PsVal, side: string): PsVal => {
      if (c.p.sw('PassThru')) return v;
      const p: Record<string, PsVal> = {};
      if (props) for (const n of props) p[n] = getProp(v, n) ?? null;
      else p.InputObject = v;
      p.SideIndicator = side;
      return obj('System.Management.Automation.PSCustomObject', p, { view: Object.keys(p) });
    };
    const out: PsVal[] = [];
    if (c.p.sw('IncludeEqual')) for (const v of diff) if (refKeys.has(key(v))) out.push(row(v, '=='));
    if (!c.p.sw('ExcludeDifferent')) {
      for (const v of diff) if (!refKeys.has(key(v))) out.push(row(v, '=>'));
      for (const v of ref) if (!diffKeys.has(key(v))) out.push(row(v, '<='));
    }
    return out;
  },
};

const teeObject: Cmdlet = {
  name: 'Tee-Object',
  params: [{ name: 'FilePath', pos: 0, aliases: ['Path'] }, { name: 'Append', switch: true }, { name: 'Variable' }],
  run: (c) => {
    const path = c.p.str('FilePath');
    if (path) writeText(c.s.state, path, formatOutput(c.input), c.p.sw('Append'));
    const variable = c.p.str('Variable');
    if (variable) c.s.win.vars[variable.toLowerCase()] = c.input.length === 1 ? c.input[0]! : c.input;
    return c.input;
  },
};

/* ── JSON and CSV ── */

function toJson(v: PsVal, depth: number): unknown {
  if (v === null || typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') return v;
  if (Array.isArray(v)) return v.map((x) => toJson(x, depth));
  if (v.kind === 'date') return new Date(v.ms).toISOString().replace('.000', '');
  if (depth <= 0) return toStr(v);
  if (v.kind === 'obj') return Object.fromEntries(Object.entries(v.props).map(([k, x]) => [k, toJson(x, depth - 1)]));
  if (v.kind === 'hash') return Object.fromEntries(Object.entries(v.entries).map(([k, x]) => [k, toJson(x, depth - 1)]));
  return toStr(v);
}

export function fromJson(x: unknown): PsVal {
  if (x === null || typeof x === 'number' || typeof x === 'boolean') return x as PsVal;
  if (typeof x === 'string') {
    // PowerShell 7 turns ISO 8601 strings into DateTime.
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?Z?$/.test(x)) {
      const ms = Date.parse(x.endsWith('Z') ? x : x + 'Z');
      if (!Number.isNaN(ms)) return date(ms);
    }
    return x;
  }
  if (Array.isArray(x)) return x.map(fromJson);
  const props: Record<string, PsVal> = {};
  for (const [k, v] of Object.entries(x as object)) props[k] = fromJson(v);
  return obj('System.Management.Automation.PSCustomObject', props);
}

const convertToJson: Cmdlet = {
  name: 'ConvertTo-Json',
  params: [{ name: 'InputObject', pos: 0 }, { name: 'Depth' }, { name: 'Compress', switch: true }, { name: 'AsArray', switch: true }],
  run: (c) => {
    const items = c.p.has('InputObject') ? [c.p.get('InputObject')!] : c.input;
    const depth = c.p.num('Depth') ?? 2;
    const value = items.length === 1 && !c.p.sw('AsArray') ? toJson(items[0]!, depth) : items.map((x) => toJson(x, depth));
    return c.p.sw('Compress') ? JSON.stringify(value) : JSON.stringify(value, null, 2);
  },
};

const convertFromJson: Cmdlet = {
  name: 'ConvertFrom-Json',
  params: [{ name: 'InputObject', pos: 0 }, { name: 'AsHashtable', switch: true }],
  run: (c) => {
    const text = (c.p.has('InputObject') ? [c.p.get('InputObject')!] : c.input).map(toStr).join('\n');
    try {
      const v = fromJson(JSON.parse(text));
      return Array.isArray(v) ? v : [v];
    } catch {
      try {
        // JSON Lines: one object per line, as SIEM exports often are.
        return text
          .split('\n')
          .filter((l) => l.trim())
          .map((l) => fromJson(JSON.parse(l)));
      } catch {
        throw new PsError('Conversion from JSON failed with error: Unexpected character encountered while parsing value.');
      }
    }
  },
};

const csvCell = (v: PsVal | undefined) => `"${cellStr(v).replace(/"/g, '""')}"`;
const cellStr = (v: PsVal | undefined) => (v === undefined || v === null ? '' : isDate(v) ? fmtDate(v.ms) : Array.isArray(v) ? 'System.Object[]' : toStr(v));

function toCsv(items: PsVal[]): string[] {
  const first = items.find(isObj) as PsObj | undefined;
  if (!first) return items.map((v) => csvCell(v));
  const cols = Object.keys(first.props);
  return [cols.map((c) => `"${c}"`).join(','), ...items.map((v) => cols.map((n) => csvCell(getProp(v, n))).join(','))];
}

function parseCsv(text: string): PsVal[] {
  const rows = text.split('\n').filter((l) => l.trim() && !l.startsWith('#TYPE'));
  const split = (l: string) => {
    const out: string[] = [];
    let cur = '';
    let q = false;
    for (let i = 0; i < l.length; i++) {
      const ch = l[i]!;
      if (q) {
        if (ch === '"' && l[i + 1] === '"') {
          cur += '"';
          i++;
        } else if (ch === '"') q = false;
        else cur += ch;
      } else if (ch === '"') q = true;
      else if (ch === ',') {
        out.push(cur);
        cur = '';
      } else cur += ch;
    }
    out.push(cur);
    return out;
  };
  const header = split(rows[0] ?? '');
  return rows.slice(1).map((r) => {
    const cells = split(r);
    return obj('System.Management.Automation.PSCustomObject', Object.fromEntries(header.map((h, i) => [h, cells[i] ?? ''])));
  });
}

const convertToCsv: Cmdlet = { name: 'ConvertTo-Csv', params: [{ name: 'NoTypeInformation', switch: true }], run: (c) => toCsv(c.input) };

const exportCsv: Cmdlet = {
  name: 'Export-Csv',
  params: [{ name: 'Path', pos: 0 }, { name: 'NoTypeInformation', switch: true }, { name: 'Append', switch: true }, { name: 'Encoding' }],
  run: (c) => {
    const path = c.p.str('Path');
    if (!path) throw new PsError("Missing an argument for parameter 'Path'.");
    writeText(c.s.state, path, toCsv(c.input).join('\n'), c.p.sw('Append'));
    return [];
  },
};

const importCsv: Cmdlet = {
  name: 'Import-Csv',
  params: [{ name: 'Path', pos: 0 }],
  run: (c) => parseCsv(readText(c, c.p.str('Path')!)),
};

/* ── help and session ── */

const getHelp: Cmdlet = {
  name: 'Get-Help',
  params: [{ name: 'Name', pos: 0 }, { name: 'Examples', switch: true }, { name: 'Full', switch: true }, { name: 'Detailed', switch: true }, { name: 'Online', switch: true }],
  run: (c) => {
    const name = c.p.str('Name');
    if (!name) {
      const rows = PS_DOCS.map((d) => `  ${d.name.padEnd(24)} ${d.summary}`);
      return [`Bu PowerShell simulyatoridagi buyruqlar (Get-Help NOM — batafsil, /buyruqlar sahifasida ham bor):\n${rows.join('\n')}`];
    }
    const doc = PS_DOCS.find((d) => d.name.toLowerCase() === name.toLowerCase() || d.aliases?.includes(name.toLowerCase()));
    if (!doc) throw new PsError(`Get-Help could not find ${name} in a help file in this session.`);
    return psManText(doc, c.p.sw('Examples'));
  },
};

const getCommand: Cmdlet = {
  name: 'Get-Command',
  params: [{ name: 'Name', pos: 0 }, { name: 'Verb' }, { name: 'Noun' }, { name: 'CommandType' }],
  run: (c) => {
    const names = c.p.strs('Name')?.map(wild);
    const verb = c.p.str('Verb');
    const noun = c.p.str('Noun');
    return PS_DOCS.filter((d) => {
      const [v, n] = d.name.split('-');
      if (names && !names.some((r) => r.test(d.name))) return false;
      if (verb && !(n && wild(verb).test(v!))) return false;
      if (noun && !(n && wild(noun).test(n))) return false;
      return true;
    }).map((d) =>
      obj('System.Management.Automation.CmdletInfo', { CommandType: d.name.includes('-') ? 'Cmdlet' : 'Application', Name: d.name, Version: d.name.includes('-') ? '7.0.0.0' : '10.0.20348', Source: d.module ?? '' }, {
        view: ['CommandType', 'Name', 'Version', 'Source'],
      }),
    );
  },
};

const getHistory: Cmdlet = {
  name: 'Get-History',
  params: [{ name: 'Count', pos: 0 }],
  run: (c) => {
    const h = c.s.state.history.slice(0, -1);
    const n = c.p.num('Count');
    const list = n ? h.slice(-n) : h;
    const offset = h.length - list.length;
    return list.map((line, i) => obj('Microsoft.PowerShell.Commands.HistoryInfo', { Id: offset + i + 1, CommandLine: line }, { view: ['Id', 'CommandLine'] }));
  },
};

const clearHost: Cmdlet = { name: 'Clear-Host', params: [], run: () => [] };

const getDate: Cmdlet = {
  name: 'Get-Date',
  params: [{ name: 'Date', pos: 0 }, { name: 'Format' }, { name: 'UFormat' }],
  run: (c) => {
    let ms = c.s.win.now + c.s.state.history.length * 1000;
    const given = c.p.get('Date');
    if (given !== undefined) {
      const parsed = isDate(given) ? given.ms : parseDate(toStr(given));
      if (parsed === null) throw new PsError(`Cannot bind parameter 'Date'. Cannot convert value "${toStr(given)}" to type "System.DateTime".`);
      ms = parsed;
    }
    const f = c.p.str('Format');
    if (!f) return date(ms);
    const d = new Date(ms);
    const p2 = (x: number) => String(x).padStart(2, '0');
    if (f === 'o') return d.toISOString().replace('Z', '0000Z');
    return f
      .replace(/yyyy/g, String(d.getUTCFullYear()))
      .replace(/MM/g, p2(d.getUTCMonth() + 1))
      .replace(/dd/g, p2(d.getUTCDate()))
      .replace(/HH/g, p2(d.getUTCHours()))
      .replace(/mm/g, p2(d.getUTCMinutes()))
      .replace(/ss/g, p2(d.getUTCSeconds()));
  },
};

const startSleep: Cmdlet = { name: 'Start-Sleep', params: [{ name: 'Seconds', pos: 0 }, { name: 'Milliseconds' }], run: () => [] };

export const CORE: Cmdlet[] = [
  whereObject,
  forEachObject,
  selectObject,
  sortObject,
  groupObject,
  measureObject,
  formatTableCmd,
  formatListCmd,
  outString,
  outNull,
  outHost,
  getMember,
  writeOutput,
  writeHost,
  compareObject,
  teeObject,
  convertToJson,
  convertFromJson,
  convertToCsv,
  exportCsv,
  importCsv,
  getHelp,
  getCommand,
  getHistory,
  clearHost,
  getDate,
  startSleep,
];
