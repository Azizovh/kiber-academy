import { useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { ChevronDown, ChevronRight, Database, Play, Search } from 'lucide-react';
import { cell, eventFields, runSiem, type Row, type SiemLang, type SiemResult, type SiemState } from '../engine/siem';
import { fmtTime, str, values } from '../engine/siem/values';

interface Props {
  siem: SiemState;
  /** Called after every search; a returned string is shown as a green success line. */
  onSearch?: (lang: SiemLang, query: string, result: SiemResult) => string | void | Promise<string | void>;
  autoFocus?: boolean;
}

const PAGE = 50;
const LANG_NAME: Record<SiemLang, string> = { spl: 'SPL (Splunk)', kql: 'KQL (Sentinel)' };
const PLACEHOLDER: Record<SiemLang, string> = {
  spl: 'index=web status=404 | stats count by clientip',
  kql: 'SigninLogs | where ResultType != "0" | summarize count() by IPAddress',
};

/** The SIEM search screen: a query bar, the result (events with a timeline and field list, or a table), a chart. */
export function SiemView({ siem, onSearch, autoFocus = true }: Props) {
  const langs = useMemo(() => {
    const l: SiemLang[] = [];
    if (Object.keys(siem.indexes).length) l.push('spl');
    if (Object.keys(siem.tables).length) l.push('kql');
    return l;
  }, [siem]);
  const [lang, setLang] = useState<SiemLang>(langs[0] ?? 'spl');
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<SiemResult | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [sources, setSources] = useState(false);
  const history = useRef<Record<SiemLang, string[]>>({ spl: [], kql: [] });
  const [cursor, setCursor] = useState<number | null>(null);
  const input = useRef<HTMLTextAreaElement>(null);

  const run = (q = query, l = lang) => {
    const text = q.trim();
    if (!text) return;
    const r = runSiem(siem, l, text);
    const h = history.current[l];
    if (h[h.length - 1] !== text) h.push(text);
    setCursor(null);
    setResult(r);
    setMessage(null);
    void Promise.resolve(onSearch?.(l, text, r)).then((msg) => setMessage(msg || null));
  };

  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      run();
      return;
    }
    // History only while the query is one line, so the arrows still move between lines of a long query.
    const h = history.current[lang];
    if ((e.key === 'ArrowUp' || e.key === 'ArrowDown') && !query.includes('\n') && h.length) {
      e.preventDefault();
      if (e.key === 'ArrowUp') {
        const next = cursor === null ? h.length - 1 : Math.max(0, cursor - 1);
        setCursor(next);
        setQuery(h[next]!);
      } else if (cursor !== null) {
        const next = cursor + 1;
        setCursor(next >= h.length ? null : next);
        setQuery(next >= h.length ? '' : h[next]!);
      }
    }
  };

  /** Clicking a field value adds it to the search, as in Splunk. */
  const addFilter = (field: string, value: string) => {
    const quoted = /^[\w.:/-]+$/.test(value) ? value : `"${value.replace(/"/g, '\\"')}"`;
    const [head, ...rest] = query.split('|');
    const next = [`${head!.trimEnd()} ${field}=${quoted}`, ...rest].join(' |').replace(/\s+\|/g, ' |');
    setQuery(next);
    run(next);
  };

  const switchLang = (l: SiemLang) => {
    setLang(l);
    setQuery('');
    setResult(null);
    setMessage(null);
    setCursor(null);
    input.current?.focus();
  };

  return (
    <div className="siem-win">
      <div className="siem-bar">
        <Search aria-hidden />
        <span className="siem-app">{lang === 'spl' ? 'Search & Reporting' : 'Logs'}</span>
        {langs.length > 1 && (
          <div className="seg siem-langs" role="tablist" aria-label="So'rov tili">
            {langs.map((l) => (
              <button key={l} role="tab" aria-selected={lang === l} className={lang === l ? 'on' : ''} onClick={() => switchLang(l)}>
                {LANG_NAME[l]}
              </button>
            ))}
          </div>
        )}
        <button className="siem-sources-btn" onClick={() => setSources((s) => !s)} aria-expanded={sources}>
          <Database aria-hidden /> {lang === 'spl' ? 'Indekslar' : 'Jadvallar'}
        </button>
      </div>

      {sources && <Sources siem={siem} lang={lang} />}

      <div className="siem-query">
        <textarea
          ref={input}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setCursor(null);
          }}
          onKeyDown={onKey}
          rows={Math.min(5, Math.max(2, query.split('\n').length))}
          placeholder={PLACEHOLDER[lang]}
          spellCheck={false}
          autoCapitalize="off"
          autoComplete="off"
          autoCorrect="off"
          autoFocus={autoFocus}
          aria-label={`${LANG_NAME[lang]} so'rovi`}
        />
        <button className="btn primary siem-run" onClick={() => run()} disabled={!query.trim()}>
          <Play aria-hidden /> Qidirish
        </button>
      </div>
      <p className="siem-help small faint">Enter — qidirish · Shift+Enter — yangi qator · ↑ ↓ — oldingi so'rovlar · vaqtlar UTC da</p>

      {message && <div className="siem-ok">{message}</div>}

      <div className="siem-results">
        {!result ? (
          <p className="faint small siem-empty">Natija shu yerda chiqadi.</p>
        ) : result.error ? (
          <div className="siem-error" role="alert">
            {result.error}
          </div>
        ) : result.mode === 'events' ? (
          <EventsView key={result.rows.length + query} result={result} onFilter={lang === 'spl' ? addFilter : undefined} />
        ) : (
          <TableView key={result.rows.length + query} result={result} />
        )}
      </div>
    </div>
  );
}

function Sources({ siem, lang }: { siem: SiemState; lang: SiemLang }) {
  if (lang === 'spl') {
    return (
      <div className="siem-sources">
        {Object.entries(siem.indexes).map(([name, events]) => {
          const types = [...new Set(events.map((e) => e.sourcetype))];
          return (
            <div key={name}>
              <code>index={name}</code> <span className="faint">· {events.length} hodisa · sourcetype: {types.join(', ')}</span>
            </div>
          );
        })}
        {Object.keys(siem.lookups).length > 0 && (
          <div>
            <span className="faint">Lookup jadvallar:</span> {Object.keys(siem.lookups).map((l) => <code key={l}>{l} </code>)}
          </div>
        )}
      </div>
    );
  }
  return (
    <div className="siem-sources">
      {Object.entries(siem.tables).map(([name, rows]) => {
        const cols = [...new Set(rows.flatMap((r) => Object.keys(r)))];
        return (
          <div key={name}>
            <code>{name}</code> <span className="faint">· {rows.length} qator · {cols.join(', ')}</span>
          </div>
        );
      })}
    </div>
  );
}

/* ── events ──────────────────────────────────────────────────────── */

function EventsView({ result, onFilter }: { result: SiemResult; onFilter?: (field: string, value: string) => void }) {
  const [shown, setShown] = useState(PAGE);
  const [open, setOpen] = useState<number | null>(null);
  const [field, setField] = useState<string | null>(null);
  const rows = result.rows;
  const fields = useMemo(() => fieldSummary(rows), [rows]);

  return (
    <>
      <div className="siem-summary">
        <b>{rows.length}</b> ta hodisa
      </div>
      {rows.length > 0 && <Timeline rows={rows} />}
      <div className="siem-events-layout">
        <aside className="siem-fields" aria-label="Maydonlar">
          <p className="siem-fields-title">Maydonlar</p>
          {fields.map((f) => (
            <div key={f.name} className="siem-field">
              <button onClick={() => setField(field === f.name ? null : f.name)} aria-expanded={field === f.name}>
                <span className="mono">{f.name}</span>
                <span className="faint">{f.distinct}</span>
              </button>
              {field === f.name && (
                <ul className="siem-field-values">
                  {f.top.map(([v, n]) => (
                    <li key={v}>
                      {onFilter ? (
                        <button onClick={() => onFilter(f.name, v)} title="Qidiruvga qo'shish">
                          <span className="mono">{v}</span>
                          <span className="faint">{n}</span>
                        </button>
                      ) : (
                        <span>
                          <span className="mono">{v}</span> <span className="faint">{n}</span>
                        </span>
                      )}
                    </li>
                  ))}
                  <li className="faint small">{f.count} ta hodisada bor</li>
                </ul>
              )}
            </div>
          ))}
        </aside>
        <div className="siem-events">
          {rows.slice(0, shown).map((r, i) => (
            <div key={i} className={`siem-event ${open === i ? 'open' : ''}`}>
              <button className="siem-event-head" onClick={() => setOpen(open === i ? null : i)} aria-expanded={open === i}>
                {open === i ? <ChevronDown aria-hidden /> : <ChevronRight aria-hidden />}
                <span className="siem-time mono">{fmtTime(r._time as number)}</span>
                <span className="siem-raw mono">{str(r._raw)}</span>
              </button>
              {open === i && (
                <table className="siem-kv">
                  <tbody>
                    {Object.keys(r)
                      .filter((k) => k !== '_raw' && k !== '_time')
                      .sort()
                      .map((k) => (
                        <tr key={k}>
                          <th className="mono">{k}</th>
                          <td className="mono">{values(r[k]).map((v) => str(v)).join(', ')}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              )}
            </div>
          ))}
          {rows.length > shown && (
            <button className="btn sm" onClick={() => setShown((s) => s + PAGE)}>
              Yana {Math.min(PAGE, rows.length - shown)} ta ko'rsatish ({rows.length - shown} qoldi)
            </button>
          )}
        </div>
      </div>
    </>
  );
}

function fieldSummary(rows: Row[]) {
  return eventFields(rows)
    .map((name) => {
      const counts = new Map<string, number>();
      let count = 0;
      for (const r of rows) {
        const vs = values(r[name]).filter((v) => v !== null);
        if (vs.length) count++;
        for (const v of vs) counts.set(str(v), (counts.get(str(v)) ?? 0) + 1);
      }
      const top = [...counts.entries()].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)).slice(0, 10);
      return { name, count, distinct: counts.size, top };
    })
    .sort((a, b) => {
      // Splunk lists host, source, sourcetype first ("selected fields"), then the rest alphabetically.
      const sel = ['host', 'source', 'sourcetype', 'index'];
      const sa = sel.indexOf(a.name);
      const sb = sel.indexOf(b.name);
      if (sa >= 0 || sb >= 0) return (sa < 0 ? 99 : sa) - (sb < 0 ? 99 : sb);
      return a.name.localeCompare(b.name);
    });
}

function Timeline({ rows }: { rows: Row[] }) {
  const times = rows.map((r) => r._time as number);
  const min = Math.min(...times);
  const max = Math.max(...times);
  const spans = [60, 300, 600, 1800, 3600, 3 * 3600, 86400];
  const span = spans.find((s) => (max - min) / s <= 60) ?? 86400;
  const start = Math.floor(min / span) * span;
  const n = Math.floor((max - start) / span) + 1;
  const buckets = new Array<number>(n).fill(0);
  for (const t of times) buckets[Math.floor((t - start) / span)]!++;
  const peak = Math.max(...buckets);
  const w = 100 / n;
  return (
    <div className="siem-timeline">
      <svg viewBox="0 0 100 30" preserveAspectRatio="none" role="img" aria-label={`Vaqt bo'yicha taqsimot: ${fmtTime(min)} dan ${fmtTime(max)} gacha`}>
        {buckets.map((c, i) =>
          c ? (
            <rect key={i} x={i * w + w * 0.1} width={w * 0.8} y={30 - (c / peak) * 30} height={(c / peak) * 30}>
              <title>{`${fmtTime(start + i * span)} — ${c} ta`}</title>
            </rect>
          ) : null,
        )}
      </svg>
      <div className="siem-timeline-axis small faint mono">
        <span>{fmtTime(start)}</span>
        <span>{spanLabel(span)} oraliq</span>
        <span>{fmtTime(start + (n - 1) * span)}</span>
      </div>
    </div>
  );
}

function spanLabel(s: number): string {
  if (s >= 86400) return `${s / 86400} kun`;
  if (s >= 3600) return `${s / 3600} soat`;
  return `${s / 60} daqiqa`;
}

/* ── tables and charts ───────────────────────────────────────────── */

function TableView({ result }: { result: SiemResult }) {
  const [shown, setShown] = useState(PAGE * 2);
  const { rows, columns } = result;
  return (
    <>
      <div className="siem-summary">
        <b>{rows.length}</b> ta natija
      </div>
      {result.chart && rows.length > 1 && result.chart.series.length > 0 && <Chart result={result} />}
      {columns.length > 0 && (
        <div className="siem-table-wrap">
          <table className="siem-table">
            <thead>
              <tr>
                {columns.map((c) => (
                  <th key={c} className="mono">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, shown).map((r, i) => (
                <tr key={i}>
                  {columns.map((c) => {
                    const text = cell(result, r, c);
                    return (
                      <td key={c} className={`mono ${typeof r[c] === 'number' && !result.timeColumns.includes(c) ? 'num' : ''}`}>
                        {text.includes('\n') ? text.split('\n').map((line, j) => <div key={j}>{line}</div>) : text}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {rows.length > shown && (
        <button className="btn sm" style={{ marginTop: 10 }} onClick={() => setShown((s) => s + PAGE * 2)}>
          Yana ko'rsatish ({rows.length - shown} qoldi)
        </button>
      )}
    </>
  );
}

const SERIES_COLORS = ['var(--t-soc)', 'var(--warn)', 'var(--t-cloud)', 'var(--danger)', 'var(--accent)', 'var(--t-career)'];

function Chart({ result }: { result: SiemResult }) {
  const { x, series } = result.chart!;
  const rows = result.rows;
  const shownSeries = series.slice(0, SERIES_COLORS.length);
  const nums = rows.flatMap((r) => shownSeries.map((s) => (typeof r[s] === 'number' ? (r[s] as number) : Number(r[s]) || 0)));
  const peak = Math.max(1, ...nums);
  const W = 600;
  const H = 160;
  const n = rows.length;
  const bar = shownSeries.length === 1;
  const bw = W / n;
  const yOf = (v: number) => H - (v / peak) * (H - 8);
  const label = (r: Row) => cell(result, r, x);
  return (
    <figure className="siem-chart">
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" aria-label={`${shownSeries.join(', ')} — ${x} bo'yicha grafik`}>
        <line x1="0" y1={H - 0.5} x2={W} y2={H - 0.5} className="siem-axis" />
        {bar
          ? rows.map((r, i) => {
              const v = Number(r[shownSeries[0]!]) || 0;
              return (
                <rect key={i} x={i * bw + bw * 0.12} width={Math.max(1, bw * 0.76)} y={yOf(v)} height={H - yOf(v)} style={{ fill: SERIES_COLORS[0] }}>
                  <title>{`${label(r)} — ${v}`}</title>
                </rect>
              );
            })
          : shownSeries.map((s, si) => (
              <polyline
                key={s}
                fill="none"
                strokeWidth={2}
                vectorEffect="non-scaling-stroke"
                style={{ stroke: SERIES_COLORS[si] }}
                points={rows.map((r, i) => `${i * bw + bw / 2},${yOf(Number(r[s]) || 0)}`).join(' ')}
              />
            ))}
      </svg>
      <figcaption className="siem-chart-axis small faint">
        <span className="mono">{label(rows[0]!)}</span>
        <span>eng ko'pi: {peak}</span>
        <span className="mono">{label(rows[n - 1]!)}</span>
      </figcaption>
      {!bar && (
        <div className="siem-legend small">
          {shownSeries.map((s, i) => (
            <span key={s}>
              <i style={{ background: SERIES_COLORS[i] }} /> {s}
            </span>
          ))}
        </div>
      )}
    </figure>
  );
}
