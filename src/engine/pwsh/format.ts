import { cellStr, flat, fmtDate, getProp, isDate, isObj, propNames, toStr, type PsObj, type PsVal } from './values';

/** Column spec: a property name, or a calculated column. */
export type Column = { label: string; get: (o: PsVal) => PsVal | undefined };

export const columnsOf = (names: string[]): Column[] => names.map((n) => ({ label: n, get: (o) => getProp(o, n) }));

const MAX_CELL = 72;

const isNumeric = (v: PsVal | undefined) => typeof v === 'number';

export function formatTable(rows: PsVal[], cols: Column[], opts: { hideHeaders?: boolean } = {}): string {
  if (!rows.length) return '';
  const cells = rows.map((r) =>
    cols.map((c) => {
      const v = c.get(r);
      let s = cellStr(v).split('\n')[0]!;
      return { s, num: isNumeric(v) };
    }),
  );
  const widths = cols.map((c, i) => {
    const w = Math.max(c.label.length, ...cells.map((row) => row[i]!.s.length));
    return i === cols.length - 1 ? w : Math.min(w, MAX_CELL);
  });
  const fit = (s: string, i: number, num: boolean) => {
    const w = widths[i]!;
    let t = s.length > w ? s.slice(0, w - 1) + '…' : s;
    if (i === cols.length - 1 && !num) return t;
    return num ? t.padStart(w) : t.padEnd(w);
  };
  const numCol = cols.map((_, i) => cells.every((row) => row[i]!.num || row[i]!.s === ''));
  const lines: string[] = [];
  if (!opts.hideHeaders) {
    lines.push(cols.map((c, i) => fit(c.label, i, numCol[i]!)).join(' ').trimEnd());
    lines.push(cols.map((c, i) => fit('-'.repeat(c.label.length), i, numCol[i]!)).join(' ').trimEnd());
  }
  for (const row of cells) lines.push(row.map((c, i) => fit(c.s, i, numCol[i]!)).join(' ').trimEnd());
  return lines.join('\n');
}

export function formatList(rows: PsVal[], cols: Column[] | null): string {
  const blocks: string[] = [];
  for (const r of rows) {
    const cs = cols ?? columnsOf(propNames(r));
    if (!cs.length) {
      blocks.push(toStr(r));
      continue;
    }
    const w = Math.max(...cs.map((c) => c.label.length));
    blocks.push(
      cs
        .map((c) => {
          const text = cellStr(c.get(r));
          const [first, ...rest] = text.split('\n');
          return `${c.label.padEnd(w)} : ${first}${rest.map((l) => `\n${''.padEnd(w + 3)}${l}`).join('')}`;
        })
        .join('\n'),
    );
  }
  return blocks.join('\n\n');
}

/** Default columns for an object: its view, or all properties. */
export function defaultColumns(o: PsObj): string[] {
  return o.view ?? Object.keys(o.props);
}

function useList(o: PsObj): boolean {
  if (o.list) return true;
  if (o.view) return false;
  return Object.keys(o.props).length > 4;
}

/** Out-Default: what the host prints for the values left at the end of a pipeline. */
export function formatOutput(values: PsVal[]): string {
  const items = flat(values);
  const parts: string[] = [];
  let i = 0;
  while (i < items.length) {
    const v = items[i]!;
    if (!isObj(v)) {
      parts.push(toStr(v));
      i++;
      continue;
    }
    let j = i + 1;
    const same = (o: PsObj) => (v.group ? o.group === v.group : o.type === v.type && !o.group);
    while (j < items.length && isObj(items[j]!) && same(items[j] as PsObj)) j++;
    const group = items.slice(i, j);
    if (v.header) parts.push(v.header + '\n');
    if (v.type === 'FormatText' || v.plain) parts.push(...group.map((g) => toStr(g)));
    else if (v.group?.startsWith('fs:')) parts.push(formatTable(group, fsColumns()) + '\n');
    else if (useList(v)) parts.push(formatList(group, columnsOf(defaultColumns(v))));
    else parts.push(formatTable(group, columnsOf(defaultColumns(v))));
    i = j;
  }
  return parts.join('\n');
}

/** Directory listings print LastWriteTime without seconds, date and time in their own padded fields. */
export function fsColumns(): Column[] {
  return [
    { label: 'Mode', get: (o) => getProp(o, 'Mode') },
    {
      label: '        LastWriteTime',
      get: (o) => {
        const v = getProp(o, 'LastWriteTime');
        if (!v || !isDate(v)) return '';
        const [d, t, ap] = fmtDate(v.ms, false).split(' ');
        return `${d!.padStart(10)} ${t!.padStart(5)} ${ap}`;
      },
    },
    { label: 'Length', get: (o) => getProp(o, 'Length') ?? '' },
    { label: 'Name', get: (o) => getProp(o, 'Name') },
  ];
}
