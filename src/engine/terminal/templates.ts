/*
 * Two small template languages used by the container tools:
 *   - Go templates for `docker inspect -f` and `docker ps --format`: {{.State.Status}}, {{json .Config.Env}},
 *     {{range .Mounts}}{{.Source}} {{end}}, {{index .Config.Labels "key"}}, {{if .X}}...{{else}}...{{end}}.
 *   - JSONPath for `kubectl -o jsonpath`: {.items[*].metadata.name}, {.data.password},
 *     {range .items[*]}{.metadata.name}{"\t"}{.spec.nodeName}{"\n"}{end}, [?(@.name=="x")].
 */

export class TemplateError extends Error {}

type Any = unknown;

const isObj = (v: Any): v is Record<string, Any> => !!v && typeof v === 'object' && !Array.isArray(v);

/* ── Go templates ── */

function goField(data: Any, path: string): Any {
  if (path === '.') return data;
  let cur: Any = data;
  for (const part of path.split('.').filter(Boolean)) {
    if (!isObj(cur)) return undefined;
    cur = cur[part];
  }
  return cur;
}

function goPrint(v: Any): string {
  if (v === undefined) return '<no value>';
  if (v === null) return '<nil>';
  if (Array.isArray(v)) return `[${v.map(goPrint).join(' ')}]`;
  if (isObj(v)) return `map[${Object.keys(v).sort().map((k) => `${k}:${goPrint(v[k])}`).join(' ')}]`;
  return String(v);
}

function goEval(expr: string, data: Any): Any {
  const parts = expr.match(/"[^"]*"|\S+/g) ?? [];
  const arg = (p: string | undefined) => (p === undefined ? undefined : p.startsWith('"') ? p.slice(1, -1) : p.startsWith('.') ? goField(data, p) : p);
  const fn = parts[0];
  if (fn === 'json') return JSON.stringify(arg(parts[1]) ?? null);
  if (fn === 'index') {
    const base = arg(parts[1]);
    const key = arg(parts[2]);
    if (Array.isArray(base)) return base[Number(key)];
    return isObj(base) ? base[String(key)] : undefined;
  }
  if (fn === 'join') {
    const base = arg(parts[1]);
    return Array.isArray(base) ? base.map(String).join(String(arg(parts[2]) ?? '')) : '';
  }
  if (fn === 'upper') return String(arg(parts[1]) ?? '').toUpperCase();
  if (fn === 'lower') return String(arg(parts[1]) ?? '').toLowerCase();
  if (fn === 'len') {
    const base = arg(parts[1]);
    return Array.isArray(base) ? base.length : isObj(base) ? Object.keys(base).length : String(base ?? '').length;
  }
  if (parts.length === 1 && fn?.startsWith('.')) return goField(data, fn);
  if (parts.length === 1 && fn?.startsWith('"')) return fn.slice(1, -1);
  throw new TemplateError(`template: :1: function "${fn}" not defined`);
}

type GoNode = { t: 'text'; v: string } | { t: 'expr'; v: string } | { t: 'range' | 'if'; v: string; body: GoNode[]; else: GoNode[] };

function goParse(tpl: string): GoNode[] {
  const tokens = tpl.split(/(\{\{-?\s*.*?\s*-?\}\})/s).filter((s) => s !== '');
  let i = 0;
  const block = (stop: string[]): [GoNode[], string] => {
    const out: GoNode[] = [];
    while (i < tokens.length) {
      const tok = tokens[i++]!;
      const m = /^\{\{-?\s*(.*?)\s*-?\}\}$/s.exec(tok);
      if (!m) {
        out.push({ t: 'text', v: tok });
        continue;
      }
      const inner = m[1]!;
      if (stop.includes(inner)) return [out, inner];
      const head = /^(range|if)\s+(.*)$/.exec(inner);
      if (head) {
        const [body, ended] = block(['end', 'else']);
        let elseBody: GoNode[] = [];
        if (ended === 'else') [elseBody] = block(['end']);
        out.push({ t: head[1] as 'range' | 'if', v: head[2]!, body, else: elseBody });
        continue;
      }
      out.push({ t: 'expr', v: inner });
    }
    if (stop.length) throw new TemplateError('template: :1: unexpected EOF');
    return [out, ''];
  };
  return block([])[0];
}

function goRun(nodes: GoNode[], data: Any): string {
  let out = '';
  for (const n of nodes) {
    if (n.t === 'text') out += n.v;
    else if (n.t === 'expr') out += goPrint(goEval(n.v, data));
    else if (n.t === 'range') {
      const v = goEval(n.v, data);
      const items = Array.isArray(v) ? v : isObj(v) ? Object.values(v) : [];
      out += items.length ? items.map((item) => goRun(n.body, item)).join('') : goRun(n.else, data);
    } else {
      const v = goEval(n.v, data);
      const truthy = Array.isArray(v) ? v.length > 0 : isObj(v) ? Object.keys(v).length > 0 : !!v;
      out += goRun(truthy ? n.body : n.else, data);
    }
  }
  return out;
}

export function goTemplate(tpl: string, data: Any): string {
  const expanded = tpl.replace(/\\t/g, '\t').replace(/\\n/g, '\n');
  return goRun(goParse(expanded), data);
}

/* ── JSONPath ── */

function jpSelect(data: Any, path: string): Any[] {
  let cur: Any[] = [data];
  let rest = path.trim();
  if (rest.startsWith('$')) rest = rest.slice(1);
  while (rest) {
    let m: RegExpExecArray | null;
    if ((m = /^\.\.?([A-Za-z0-9_\-]+)/.exec(rest))) {
      const key = m[1]!;
      cur = cur.flatMap((v) => (isObj(v) && key in v ? [v[key]] : []));
      rest = rest.slice(m[0].length);
    } else if ((m = /^\[\*\]/.exec(rest)) || (m = /^\.\*/.exec(rest))) {
      cur = cur.flatMap((v) => (Array.isArray(v) ? v : isObj(v) ? Object.values(v) : []));
      rest = rest.slice(m[0].length);
    } else if ((m = /^\[(-?\d+)\]/.exec(rest))) {
      const n = Number(m[1]);
      cur = cur.flatMap((v) => (Array.isArray(v) ? [v[n < 0 ? v.length + n : n]].filter((x) => x !== undefined) : []));
      rest = rest.slice(m[0].length);
    } else if ((m = /^\[['"]([^'"]+)['"]\]/.exec(rest))) {
      const key = m[1]!;
      cur = cur.flatMap((v) => (isObj(v) && key in v ? [v[key]] : []));
      rest = rest.slice(m[0].length);
    } else if ((m = /^\[\?\(@\.([\w.\-]+)\s*(==|!=)\s*["']?([^"')]*)["']?\)\]/.exec(rest))) {
      const [, field, op, want] = m;
      cur = cur.flatMap((v) => (Array.isArray(v) ? v : [])).filter((item) => {
        const got = jpSelect(item, '.' + field)[0];
        return op === '==' ? String(got) === want : String(got) !== want;
      });
      rest = rest.slice(m[0].length);
    } else throw new TemplateError(`error parsing jsonpath ${path}, unrecognized character in action: ${rest[0]}`);
  }
  return cur;
}

const jpPrint = (v: Any) => (typeof v === 'string' ? v : v === null || v === undefined ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v));

export function jsonPath(tpl: string, data: Any): string {
  const tokens: string[] = [];
  let i = 0;
  let text = '';
  while (i < tpl.length) {
    if (tpl[i] === '{') {
      if (text) tokens.push(text);
      text = '';
      const end = tpl.indexOf('}', i);
      if (end < 0) throw new TemplateError(`error parsing jsonpath ${tpl}, unclosed action`);
      tokens.push(tpl.slice(i, end + 1));
      i = end + 1;
    } else text += tpl[i++];
  }
  if (text) tokens.push(text);
  let pos = 0;
  const run = (ctx: Any, stopAtEnd: boolean): string => {
    let out = '';
    while (pos < tokens.length) {
      const tok = tokens[pos++]!;
      if (!tok.startsWith('{')) {
        out += tok;
        continue;
      }
      const inner = tok.slice(1, -1).trim();
      if (inner === 'end') {
        if (stopAtEnd) return out;
        throw new TemplateError('error parsing jsonpath: not in range, nothing to end');
      }
      const lit = /^"(.*)"$/.exec(inner);
      if (lit) {
        out += lit[1]!.replace(/\\t/g, '\t').replace(/\\n/g, '\n');
        continue;
      }
      const range = /^range\s+(.*)$/.exec(inner);
      if (range) {
        const items = jpSelect(ctx, range[1]!);
        const start = pos;
        if (!items.length) {
          // Skip to the matching end.
          let depth = 1;
          while (pos < tokens.length && depth) {
            const t = tokens[pos++]!.slice(1, -1).trim();
            if (t.startsWith('range ')) depth++;
            if (t === 'end') depth--;
          }
          continue;
        }
        for (const item of items) {
          pos = start;
          out += run(item, true);
        }
        continue;
      }
      out += jpSelect(ctx, inner).map(jpPrint).join(' ');
    }
    return out;
  };
  return run(data, false);
}
