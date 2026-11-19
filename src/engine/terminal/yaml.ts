/*
 * The YAML subset Kubernetes manifests use: block mappings and sequences, scalars, quoted strings, comments, flow
 * lists/maps on one line, and "---" between documents. Plus a serializer for `kubectl get -o yaml`.
 */

export type YamlValue = null | boolean | number | string | YamlValue[] | { [k: string]: YamlValue };

export class YamlError extends Error {}

interface Line {
  indent: number;
  text: string;
  n: number;
}

function scalar(raw: string): YamlValue {
  const s = raw.trim();
  if (s === '' || s === '~' || s === 'null') return null;
  if (s === 'true') return true;
  if (s === 'false') return false;
  if (/^-?\d+(\.\d+)?$/.test(s)) return Number(s);
  if (s.startsWith('"') && s.endsWith('"')) return s.slice(1, -1).replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\t/g, '\t');
  if (s.startsWith("'") && s.endsWith("'")) return s.slice(1, -1).replace(/''/g, "'");
  if (s.startsWith('[') && s.endsWith(']')) {
    const inner = s.slice(1, -1).trim();
    return inner ? splitFlow(inner).map(scalar) : [];
  }
  if (s.startsWith('{') && s.endsWith('}')) {
    const inner = s.slice(1, -1).trim();
    const out: Record<string, YamlValue> = {};
    if (inner) for (const part of splitFlow(inner)) {
      const i = part.indexOf(':');
      out[part.slice(0, i).trim().replace(/^["']|["']$/g, '')] = scalar(part.slice(i + 1));
    }
    return out;
  }
  return s;
}

function splitFlow(s: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let q = '';
  let cur = '';
  for (const ch of s) {
    if (q) {
      if (ch === q) q = '';
      cur += ch;
      continue;
    }
    if (ch === '"' || ch === "'") q = ch;
    if (ch === '[' || ch === '{') depth++;
    if (ch === ']' || ch === '}') depth--;
    if (ch === ',' && depth === 0) {
      out.push(cur.trim());
      cur = '';
    } else cur += ch;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

/** "key: value" split that ignores colons inside quotes and URLs without a following space. */
function splitKey(text: string): [string, string] | null {
  let q = '';
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!;
    if (q) {
      if (ch === q) q = '';
      continue;
    }
    if (ch === '"' || ch === "'") q = ch;
    else if (ch === ':' && (i === text.length - 1 || text[i + 1] === ' ')) return [text.slice(0, i).trim().replace(/^["']|["']$/g, ''), text.slice(i + 1).trim()];
  }
  return null;
}

function stripComment(s: string): string {
  let q = '';
  for (let i = 0; i < s.length; i++) {
    const ch = s[i]!;
    if (q) {
      if (ch === q) q = '';
    } else if (ch === '"' || ch === "'") q = ch;
    else if (ch === '#' && (i === 0 || s[i - 1] === ' ')) return s.slice(0, i);
  }
  return s;
}

function parseBlock(lines: Line[], start: number, indent: number): [YamlValue, number] {
  const first = lines[start];
  if (!first || first.indent < indent) return [null, start];
  if (first.text.startsWith('- ') || first.text === '-') {
    const arr: YamlValue[] = [];
    let i = start;
    while (i < lines.length && lines[i]!.indent === first.indent && (lines[i]!.text.startsWith('- ') || lines[i]!.text === '-')) {
      const rest = lines[i]!.text.slice(1).trimStart();
      if (!rest) {
        const [v, next] = parseBlock(lines, i + 1, first.indent + 1);
        arr.push(v);
        i = next;
        continue;
      }
      // "- key: value" starts a mapping whose other keys are indented to the item's content column.
      const kv = splitKey(rest);
      if (kv) {
        const itemIndent = first.indent + (lines[i]!.text.length - rest.length);
        const synthetic: Line[] = [{ indent: itemIndent, text: rest, n: lines[i]!.n }];
        let j = i + 1;
        while (j < lines.length && lines[j]!.indent >= itemIndent) synthetic.push(lines[j++]!);
        const [v] = parseBlock(synthetic, 0, itemIndent);
        arr.push(v);
        i = j;
      } else {
        arr.push(scalar(rest));
        i++;
      }
    }
    return [arr, i];
  }
  const obj: Record<string, YamlValue> = {};
  let i = start;
  while (i < lines.length && lines[i]!.indent === first.indent) {
    const kv = splitKey(lines[i]!.text);
    if (!kv) throw new YamlError(`line ${lines[i]!.n}: could not find expected ':'`);
    const [key, rest] = kv;
    if (rest === '' || rest === '|' || rest === '>') {
      const next = lines[i + 1];
      if (rest === '|' || rest === '>') {
        const block: string[] = [];
        let j = i + 1;
        while (j < lines.length && lines[j]!.indent > first.indent) block.push(lines[j++]!.text);
        obj[key] = block.join(rest === '|' ? '\n' : ' ') + (rest === '|' ? '\n' : '');
        i = j;
        continue;
      }
      if (next && (next.indent > first.indent || (next.indent === first.indent && next.text.startsWith('- ')))) {
        const [v, after] = parseBlock(lines, i + 1, next.indent);
        obj[key] = v;
        i = after;
      } else {
        obj[key] = null;
        i++;
      }
    } else {
      obj[key] = scalar(rest);
      i++;
    }
  }
  return [obj, i];
}

export function parseYamlDocs(src: string): YamlValue[] {
  const docs: YamlValue[] = [];
  for (const chunk of src.split(/^---\s*$/m)) {
    const lines: Line[] = [];
    chunk.split('\n').forEach((raw, idx) => {
      if (raw.includes('\t') && /^\t/.test(raw)) throw new YamlError(`line ${idx + 1}: found character that cannot start any token (tab)`);
      const noComment = stripComment(raw).replace(/\s+$/, '');
      if (!noComment.trim()) return;
      lines.push({ indent: noComment.length - noComment.trimStart().length, text: noComment.trim(), n: idx + 1 });
    });
    if (!lines.length) continue;
    const [v, end] = parseBlock(lines, 0, lines[0]!.indent);
    if (end < lines.length) throw new YamlError(`line ${lines[end]!.n}: bad indentation of a mapping entry`);
    docs.push(v);
  }
  return docs;
}

function needsQuote(s: string): boolean {
  return s === '' || /^[\s\-?:,[\]{}#&*!|>'"%@`]|: |\s#|^(true|false|null|~|-?\d+(\.\d+)?)$/.test(s) || s.includes('\n');
}

const q = (s: string) => (needsQuote(s) ? JSON.stringify(s) : s);

export function toYaml(v: YamlValue, indent = 0): string {
  const pad = ' '.repeat(indent);
  if (v === null || typeof v !== 'object') return pad + scalarText(v);
  if (Array.isArray(v)) {
    if (!v.length) return pad + '[]';
    return v
      .map((item) => {
        if (item !== null && typeof item === 'object' && !Array.isArray(item) && Object.keys(item).length) {
          const body = toYaml(item, indent + 2).slice(indent + 2);
          return `${pad}- ${body}`;
        }
        return `${pad}- ${toYaml(item, 0)}`;
      })
      .join('\n');
  }
  const keys = Object.keys(v);
  if (!keys.length) return pad + '{}';
  return keys
    .map((k) => {
      const val = v[k]!;
      if (val !== null && typeof val === 'object' && (Array.isArray(val) ? val.length : Object.keys(val).length)) {
        return `${pad}${q(k)}:\n${toYaml(val, Array.isArray(val) ? indent : indent + 2)}`;
      }
      return `${pad}${q(k)}: ${toYaml(val, 0)}`;
    })
    .join('\n');
}

function scalarText(v: YamlValue): string {
  if (v === null) return 'null';
  if (typeof v === 'string') return q(v);
  if (Array.isArray(v)) return '[]';
  if (typeof v === 'object') return '{}';
  return String(v);
}
