import type { CommandDoc } from '../engine/terminal/docs';

/** One command: what it does, how to call it, every flag with an example, and worked examples. */
export function CommandCard({ doc, only }: { doc: CommandDoc; only?: string[] }) {
  // A lab can ask to show just the flags its task uses; the full list stays in the reference.
  const flags = only?.length ? doc.flags.filter(([f]) => only.some((o) => f.split(/[\s/|,]+/).includes(o) || f === o)) : doc.flags;
  const ps = doc.category === 'powershell';
  return (
    <article className="card cmd-card" id={`cmd-${doc.name}`}>
      <header className="cmd-head">
        <h2 className="cmd-name">{doc.name}</h2>
        <p>{doc.summary}</p>
        {doc.aliases?.length ? <p className="small faint">Qisqa nomlari: {doc.aliases.join(', ')}</p> : null}
      </header>
      <code className="cmd-usage">{doc.usage}</code>
      {flags.length > 0 && (
        <table className="cmd-flags">
          <thead>
            <tr>
              <th>{ps ? 'Parametr' : 'Flag'}</th>
              <th>Nima qiladi</th>
              <th>Misol</th>
            </tr>
          </thead>
          <tbody>
            {flags.map(([f, text, example]) => (
              <tr key={f}>
                <td>
                  <code>{f}</code>
                </td>
                <td>{text}</td>
                <td>{example && <code>{example}</code>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {doc.examples.length > 0 && !only?.length && (
        <div className="cmd-examples">
          {doc.examples.map(([c, n]) => (
            <div key={c}>
              <code>{ps ? 'PS>' : '$'} {c}</code>
              {n && <span>{n}</span>}
            </div>
          ))}
        </div>
      )}
      {doc.note && !only?.length && <p className="cmd-note">{doc.note}</p>}
    </article>
  );
}
