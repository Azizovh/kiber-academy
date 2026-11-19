/*
 * sigma-cli: `sigma check` validates rules, `sigma convert` turns them into Splunk SPL or Microsoft Defender KQL.
 * Supported: selections as maps or lists of maps, value lists (OR, or AND with |all), keyword lists, null values,
 * modifiers contains/startswith/endswith/all, conditions with and/or/not, parentheses, "1 of x*", "all of x*",
 * "1 of them" / "all of them". The sysmon pipeline adds EventID for the logsource category; microsoft_xdr maps
 * Sysmon fields to Defender tables. Not supported (and said so): |re, |cidr, |base64offset, aggregations.
 */

import { parseYamlDocs, YamlError, type YamlValue } from './yaml';
import { fail, ok, type Command, type CmdCtx } from './shell';
import { listFiles, parseArgs, writeText } from './toolio';

type Obj = { [k: string]: YamlValue };

const KNOWN_MODIFIERS = ['contains', 'startswith', 'endswith', 'all'];
const UNSUPPORTED_MODIFIERS = ['re', 'cidr', 'base64', 'base64offset', 'windash', 'wide', 'utf16le', 'utf16', 'exists', 'fieldref', 'gt', 'gte', 'lt', 'lte', 'expand'];

class SigmaError extends Error {}

interface FieldCond {
  field: string | null;
  mods: string[];
  values: (string | number | null)[];
}

/** One selection: an OR of AND-groups of field conditions. */
type Selection = FieldCond[][];

interface Rule {
  file: string;
  title: string;
  doc: Obj;
  logsource: Obj;
  selections: Record<string, Selection>;
  condition: string;
}

/** True when `word` occurs outside parentheses and quotes, so a part needs wrapping before a tighter join. */
function topLevel(p: string, word: string): boolean {
  let depth = 0;
  let quote = false;
  for (let i = 0; i < p.length; i++) {
    const c = p[i]!;
    if (c === '\\') {
      i++;
      continue;
    }
    if (c === '"') quote = !quote;
    if (quote) continue;
    if (c === '(') depth++;
    else if (c === ')') depth--;
    else if (depth === 0 && p.startsWith(word, i)) return true;
  }
  return false;
}

const isObj =(v: YamlValue | undefined): v is Obj => !!v && typeof v === 'object' && !Array.isArray(v);

function parseFieldKey(key: string): { field: string; mods: string[] } {
  const [field, ...mods] = key.split('|');
  for (const m of mods) {
    if (UNSUPPORTED_MODIFIERS.includes(m)) throw new SigmaError(`Modifier '${m}' is not supported in this simulator`);
    if (!KNOWN_MODIFIERS.includes(m)) throw new SigmaError(`Unknown modifier ${m}`);
  }
  return { field: field!, mods };
}

const scalarValue = (v: YamlValue): string | number | null => (v === null ? null : typeof v === 'number' ? v : typeof v === 'boolean' ? String(v) : String(v));

function parseSelection(name: string, v: YamlValue): Selection {
  const group = (m: Obj): FieldCond[] =>
    Object.entries(m).map(([k, val]) => {
      const { field, mods } = parseFieldKey(k);
      const values = Array.isArray(val) ? val.map(scalarValue) : [scalarValue(val)];
      return { field, mods, values };
    });
  if (isObj(v)) return [group(v)];
  if (Array.isArray(v)) {
    if (v.every((x) => isObj(x))) return v.map((x) => group(x as Obj));
    if (v.every((x) => !isObj(x) && !Array.isArray(x))) return [[{ field: null, mods: [], values: v.map(scalarValue) }]];
  }
  if (typeof v === 'string' || typeof v === 'number') return [[{ field: null, mods: [], values: [scalarValue(v)] }]];
  throw new SigmaError(`Detection item '${name}' has an invalid structure`);
}

function parseRule(file: string, text: string): Rule {
  let docs: YamlValue[];
  try {
    docs = parseYamlDocs(text);
  } catch (e) {
    throw new SigmaError(`YAML error: ${(e as YamlError).message}`);
  }
  const doc = docs[0];
  if (!isObj(doc)) throw new SigmaError('Sigma rule must be a YAML mapping');
  if (!isObj(doc.logsource)) throw new SigmaError("Sigma rule must have a log source definition ('logsource')");
  if (!isObj(doc.detection)) throw new SigmaError("Sigma rule must have a detection definitions ('detection')");
  const det = doc.detection;
  const cond = det.condition;
  if (cond === undefined || cond === null) throw new SigmaError("Sigma rule must contain at least one condition ('condition')");
  const selections: Record<string, Selection> = {};
  for (const [k, v] of Object.entries(det)) {
    if (k === 'condition' || k === 'timeframe') continue;
    selections[k] = parseSelection(k, v);
  }
  return { file, title: String(doc.title ?? ''), doc, logsource: doc.logsource, selections, condition: Array.isArray(cond) ? String(cond[0]) : String(cond) };
}

/* ── condition ───────────────────────────────────────────────────── */

type CNode = { k: 'and' | 'or'; a: CNode; b: CNode } | { k: 'not'; a: CNode } | { k: 'sel'; name: string } | { k: 'of'; quant: 'one' | 'all'; names: string[] };

function parseCondition(src: string, rule: Rule): CNode {
  const toks = src.match(/\(|\)|[^\s()]+/g) ?? [];
  let pos = 0;
  const names = Object.keys(rule.selections);
  const expandPattern = (p: string): string[] => {
    if (p === 'them') return names.filter((n) => !n.startsWith('_'));
    const re = new RegExp('^' + p.split('*').map((s) => s.replace(/[.+?^${}()|[\]\\]/g, '\\$&')).join('.*') + '$');
    const found = names.filter((n) => re.test(n));
    if (!found.length) throw new SigmaError(`Condition error: no detection identifier matches '${p}'`);
    return found;
  };
  const or = (): CNode => {
    let a = and();
    while (toks[pos]?.toLowerCase() === 'or') {
      pos++;
      a = { k: 'or', a, b: and() };
    }
    return a;
  };
  const and = (): CNode => {
    let a = not();
    while (toks[pos]?.toLowerCase() === 'and') {
      pos++;
      a = { k: 'and', a, b: not() };
    }
    return a;
  };
  const not = (): CNode => {
    if (toks[pos]?.toLowerCase() === 'not') {
      pos++;
      return { k: 'not', a: not() };
    }
    return atom();
  };
  const atom = (): CNode => {
    const t = toks[pos++];
    if (t === undefined) throw new SigmaError('Condition error: unexpected end of condition');
    if (t === '(') {
      const n = or();
      if (toks[pos++] !== ')') throw new SigmaError("Condition error: missing ')'");
      return n;
    }
    if ((t === '1' || t.toLowerCase() === 'all') && toks[pos]?.toLowerCase() === 'of') {
      pos++;
      const target = toks[pos++];
      if (!target) throw new SigmaError("Condition error: missing target after 'of'");
      return { k: 'of', quant: t === '1' ? 'one' : 'all', names: expandPattern(target) };
    }
    if (!names.includes(t)) throw new SigmaError(`Condition error: detection identifier '${t}' not found in rule`);
    return { k: 'sel', name: t };
  };
  const node = or();
  if (pos < toks.length) throw new SigmaError(`Condition error: unexpected '${toks[pos]}'`);
  return node;
}

/* ── backends ────────────────────────────────────────────────────── */

const SYSMON_IDS: Record<string, number> = { process_creation: 1, network_connection: 3, image_load: 7, create_remote_thread: 8, process_access: 10, file_event: 11, registry_add: 12, registry_set: 13, registry_event: 13, dns_query: 22 };

interface Backend {
  field(c: FieldCond): string;
  and(parts: string[]): string;
  or(parts: string[]): string;
  not(part: string): string;
}

const splEscape = (s: string) => s.replace(/\\/g, '\\\\').replace(/"/g, '\\"');

function splValue(v: string | number, mods: string[]): string {
  if (typeof v === 'number') return String(v);
  let s = splEscape(v);
  if (mods.includes('contains')) s = `*${s}*`;
  else if (mods.includes('startswith')) s = `${s}*`;
  else if (mods.includes('endswith')) s = `*${s}`;
  return `"${s}"`;
}

const SPL: Backend = {
  field(c) {
    if (c.field === null) return this.or(c.values.map((v) => `"${splEscape(String(v))}"`));
    const f = c.field;
    const nonNull = c.values.filter((v): v is string | number => v !== null);
    const parts = nonNull.map((v) => `${f}=${splValue(v, c.mods)}`);
    if (c.values.includes(null)) parts.push(`NOT ${f}=*`);
    if (c.mods.includes('all')) return this.and(parts);
    if (nonNull.length > 1 && !c.values.includes(null)) return `${f} IN (${nonNull.map((v) => splValue(v, c.mods)).join(', ')})`;
    return this.or(parts);
  },
  and: (parts) => (parts.length === 1 ? parts[0]! : parts.map((p) => (topLevel(p, ' OR ') ? `(${p})` : p)).join(' ')),
  or: (parts) => (parts.length === 1 ? parts[0]! : `(${parts.join(' OR ')})`),
  not: (p) => (topLevel(p, ' ') && !/^[\w.]+ IN \(/.test(p) ? `NOT (${p})` : `NOT ${p}`),
};

const XDR_TABLES: Record<string, string> = { process_creation: 'DeviceProcessEvents', network_connection: 'DeviceNetworkEvents', registry_set: 'DeviceRegistryEvents', registry_event: 'DeviceRegistryEvents', file_event: 'DeviceFileEvents', image_load: 'DeviceImageLoadEvents' };
const XDR_FIELDS: Record<string, Record<string, string>> = {
  process_creation: { Image: 'FolderPath', ParentImage: 'InitiatingProcessFolderPath', CommandLine: 'ProcessCommandLine', ParentCommandLine: 'InitiatingProcessCommandLine', User: 'AccountName', OriginalFileName: 'ProcessVersionInfoOriginalFileName', Hashes: 'SHA256', sha256: 'SHA256' },
  network_connection: { Image: 'InitiatingProcessFolderPath', DestinationIp: 'RemoteIP', DestinationPort: 'RemotePort', DestinationHostname: 'RemoteUrl', User: 'InitiatingProcessAccountName' },
  registry_set: { TargetObject: 'RegistryKey', Details: 'RegistryValueData', Image: 'InitiatingProcessFolderPath' },
  registry_event: { TargetObject: 'RegistryKey', Details: 'RegistryValueData', Image: 'InitiatingProcessFolderPath' },
  file_event: { TargetFilename: 'FolderPath', Image: 'InitiatingProcessFolderPath' },
};

const kqlString = (s: string) => `"${s.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;

function kqlBackend(category: string): Backend {
  const map = XDR_FIELDS[category] ?? {};
  const one = (f: string, v: string | number, mods: string[]): string => {
    if (typeof v === 'number') return `${f} == ${v}`;
    if (mods.includes('contains')) return `${f} contains ${kqlString(v)}`;
    if (mods.includes('startswith')) return `${f} startswith ${kqlString(v)}`;
    if (mods.includes('endswith')) return `${f} endswith ${kqlString(v)}`;
    if (v.startsWith('*') && v.endsWith('*') && v.length > 2) return `${f} contains ${kqlString(v.slice(1, -1))}`;
    if (v.endsWith('*')) return `${f} startswith ${kqlString(v.slice(0, -1))}`;
    if (v.startsWith('*')) return `${f} endswith ${kqlString(v.slice(1))}`;
    return `${f} =~ ${kqlString(v)}`;
  };
  const be: Backend = {
    field(c) {
      if (c.field === null) throw new SigmaError('Keyword detection (values without a field) cannot be converted to KQL by this backend');
      const f = map[c.field] ?? c.field;
      const nonNull = c.values.filter((v): v is string | number => v !== null);
      const plain = !c.mods.length && nonNull.every((v) => typeof v === 'string' && !v.includes('*'));
      const parts = plain && nonNull.length > 1 && !c.values.includes(null) ? [`${f} in~ (${nonNull.map((v) => kqlString(String(v))).join(', ')})`] : nonNull.map((v) => one(f, v, c.mods));
      if (c.values.includes(null)) parts.push(`isempty(${f})`);
      return c.mods.includes('all') ? be.and(parts) : be.or(parts);
    },
    and: (parts) => (parts.length === 1 ? parts[0]! : parts.map((p) => (topLevel(p, ' or ') ? `(${p})` : p)).join(' and ')),
    or: (parts) => (parts.length === 1 ? parts[0]! : `(${parts.join(' or ')})`),
    not: (p) => `not(${p.replace(/^\((.*)\)$/s, '$1')})`,
  };
  return be;
}

function render(node: CNode, rule: Rule, be: Backend): string {
  const sel = (name: string) => {
    const groups = rule.selections[name]!;
    return be.or(groups.map((g) => be.and(g.map((c) => be.field(c)))));
  };
  switch (node.k) {
    case 'sel':
      return sel(node.name);
    case 'of': {
      const parts = node.names.map(sel);
      return node.quant === 'one' ? be.or(parts) : be.and(parts);
    }
    case 'not':
      return be.not(render(node.a, rule, be));
    case 'and':
      return be.and([render(node.a, rule, be), render(node.b, rule, be)]);
    case 'or':
      return be.or([render(node.a, rule, be), render(node.b, rule, be)]);
  }
}

function convert(rule: Rule, target: string, pipeline: string | null): string {
  const cond = parseCondition(rule.condition, rule);
  const category = String(rule.logsource.category ?? '');
  if (target === 'splunk') {
    let q = render(cond, rule, SPL);
    if (pipeline === 'sysmon') {
      const id = SYSMON_IDS[category];
      if (id === undefined) throw new SigmaError(`The sysmon pipeline has no mapping for log source category '${category || '(none)'}'`);
      q = `EventID=${id} ${q.startsWith('(') || !/ OR /.test(q) ? q : `(${q})`}`;
    }
    return q;
  }
  const table = XDR_TABLES[category];
  if (!table) throw new SigmaError(`The microsoft_xdr pipeline has no table for log source category '${category || '(none)'}'`);
  return `${table}\n| where ${render(cond, rule, kqlBackend(category))}`;
}

/* ── validation issues (sigma check) ─────────────────────────────── */

function issues(rule: Rule): string[] {
  const out: string[] = [];
  const d = rule.doc;
  if (!d.id) out.push('Rule has no identifier (IdentifierExistenceValidator)');
  else if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(d.id))) out.push(`Rule identifier '${d.id}' is not a valid UUID (IdentifierValidator)`);
  if (!d.description) out.push('Rule has no description (DescriptionExistenceValidator)');
  if (!d.level) out.push('Rule has no level (LevelExistenceValidator)');
  if (!d.date) out.push('Rule has no date (DateExistenceValidator)');
  if (!rule.title) out.push('Rule has no title (TitleExistenceValidator)');
  if (rule.title.length > 110) out.push('Rule title is longer than 110 characters (TitleLengthValidator)');
  if (Array.isArray(d.tags) && !d.tags.some((t) => /^attack\.t\d{4}/i.test(String(t)))) out.push('Rule has no ATT&CK technique tag (ATTACKTagValidator)');
  return out;
}

/* ── command ─────────────────────────────────────────────────────── */

const HELP = `Usage: sigma [OPTIONS] COMMAND [ARGS]...

Commands:
  check    Check Sigma rules for validity and best practices.
  convert  Convert Sigma rules into queries.
  list     List available targets or processing pipelines.
  version  Print version of Sigma CLI.`;

function loadRules(ctx: CmdCtx, paths: string[]): { rules: Rule[]; errors: string[] } | string {
  const rules: Rule[] = [];
  const errors: string[] = [];
  for (const p of paths) {
    const files = listFiles(ctx, p, true);
    if (!files) return `Error: Invalid value for 'INPUT...': Path '${p}' does not exist.`;
    for (const f of files.filter((x) => /\.ya?ml$/i.test(x.path))) {
      try {
        rules.push(parseRule(f.display, f.content));
      } catch (e) {
        if (!(e instanceof SigmaError)) throw e;
        errors.push(`${f.display}: ${e.message}`);
      }
    }
  }
  return { rules, errors };
}

export const sigma: Command = (args, ctx) => {
  const sub = args[0];
  if (!sub || sub === '--help' || sub === '-h') return ok(HELP);
  if (sub === 'version') return ok('2.0.1');
  if (sub === 'list') {
    if (args[1] === 'targets') return ok('+------------+--------------------------------------------+\n| Identifier | Target query languages                     |\n+------------+--------------------------------------------+\n| kusto      | Kusto Query Language (Microsoft Defender)  |\n| splunk     | Splunk Search Processing Language (SPL)    |\n+------------+--------------------------------------------+');
    if (args[1] === 'pipelines') return ok('+---------------+----------------------------------------------+\n| Identifier    | Processing pipeline                          |\n+---------------+----------------------------------------------+\n| microsoft_xdr | Sysmon fields to Microsoft Defender tables   |\n| sysmon        | Sysmon log sources: adds EventID per category |\n+---------------+----------------------------------------------+');
    return fail("Error: Missing argument 'targets' or 'pipelines'.");
  }
  if (sub === 'check') {
    const paths = args.slice(1).filter((a) => !a.startsWith('-'));
    if (!paths.length) return fail("Usage: sigma check [OPTIONS] INPUT...\nError: Missing argument 'INPUT...'.");
    const loaded = loadRules(ctx, paths);
    if (typeof loaded === 'string') return fail(loaded);
    const condErrors: string[] = [];
    const found: string[] = [];
    for (const r of loaded.rules) {
      try {
        parseCondition(r.condition, r);
      } catch (e) {
        if (!(e instanceof SigmaError)) throw e;
        condErrors.push(`${r.file}: ${e.message}`);
      }
      for (const i of issues(r)) found.push(`${r.file}: ${i}`);
    }
    const lines = [
      'Parsing Sigma rules  [####################################]  100%',
      'Checking Sigma rules  [####################################]  100%',
      `Found ${loaded.errors.length} errors, ${condErrors.length} condition errors and ${found.length} issues.`,
    ];
    if (loaded.errors.length) lines.push('Errors:', ...loaded.errors.map((e) => `* ${e}`));
    if (condErrors.length) lines.push('Condition errors:', ...condErrors.map((e) => `* ${e}`));
    if (found.length) lines.push('Issues:', ...found.map((e) => `* ${e}`));
    if (!loaded.errors.length && !condErrors.length && !found.length) lines.push('No validation issues found.');
    return { out: lines.join('\n'), code: loaded.errors.length || condErrors.length ? 1 : 0 };
  }
  if (sub === 'convert') {
    const { opts, rest } = parseArgs(args.slice(1), ['-t', '--target', '-p', '--pipeline', '-o', '--output', '-f', '--format']);
    const target = String(opts['-t'] ?? opts['--target'] ?? '');
    const pipeline = (opts['-p'] ?? opts['--pipeline']) as string | undefined;
    const out = (opts['-o'] ?? opts['--output']) as string | undefined;
    if (!target) return fail("Usage: sigma convert [OPTIONS] INPUT...\nError: Missing option '--target' / '-t'. Choose from:\n\tkusto,\n\tsplunk");
    if (!['splunk', 'kusto'].includes(target)) return fail(`Error: Invalid value for '--target' / '-t': '${target}' is not one of 'kusto', 'splunk'.`);
    if (pipeline && !['sysmon', 'microsoft_xdr'].includes(pipeline)) return fail(`Error: Invalid value for '--pipeline' / '-p': '${pipeline}' is not a known pipeline. See: sigma list pipelines`);
    if (!pipeline && !opts['--without-pipeline']) return fail('Error: Processing pipeline required by backend! Define a processing pipeline with -p/--pipeline or use --without-pipeline to convert without one.');
    if (target === 'kusto' && pipeline && pipeline !== 'microsoft_xdr') return fail(`Error: Pipeline '${pipeline}' is not compatible with target 'kusto'. Use -p microsoft_xdr.`);
    if (target === 'splunk' && pipeline === 'microsoft_xdr') return fail("Error: Pipeline 'microsoft_xdr' is not compatible with target 'splunk'. Use -p sysmon.");
    if (!rest.length) return fail("Usage: sigma convert [OPTIONS] INPUT...\nError: Missing argument 'INPUT...'.");
    const loaded = loadRules(ctx, rest);
    if (typeof loaded === 'string') return fail(loaded);
    if (loaded.errors.length) return fail(`Error while parsing Sigma rules:\n${loaded.errors.map((e) => `* ${e}`).join('\n')}`);
    const queries: string[] = [];
    for (const r of loaded.rules) {
      try {
        queries.push(convert(r, target, pipeline ?? null));
      } catch (e) {
        if (!(e instanceof SigmaError)) throw e;
        return fail(`Error: ${r.file}: ${e.message}`);
      }
    }
    if (!queries.length) return fail('Error: No rules found in the given paths.');
    const text = queries.join('\n');
    if (out) {
      const err = writeText(ctx, out, text + '\n');
      if (err) return fail(`Error: ${err}`);
      return ok(`Parsing Sigma rules  [####################################]  100%\nWrote ${queries.length} queries to ${out}`);
    }
    return ok(text);
  }
  return fail(`Usage: sigma [OPTIONS] COMMAND [ARGS]...\nTry 'sigma --help' for help.\n\nError: No such command '${sub}'.`);
};
