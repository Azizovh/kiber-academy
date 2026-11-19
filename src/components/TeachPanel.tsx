import { useState } from 'react';
import { BookOpen } from 'lucide-react';
import { getDoc } from '../engine/terminal/docs';
import { CommandCard } from './CommandCard';

/** "ls -a" → { cmd: 'ls', flag: '-a' }; "ls" → { cmd: 'ls' }. */
function parse(entry: string): { cmd: string; flag?: string } {
  const [cmd, ...rest] = entry.trim().split(/\s+/);
  return { cmd: cmd!, flag: rest.join(' ') || undefined };
}

/** Groups teach entries by command, keeping the order they first appear in. */
export function teachGroups(entries: string[]): { cmd: string; flags: string[] }[] {
  const groups: { cmd: string; flags: string[] }[] = [];
  for (const e of entries) {
    const { cmd, flag } = parse(e);
    let g = groups.find((x) => x.cmd === cmd);
    if (!g) groups.push((g = { cmd, flags: [] }));
    if (flag) g.flags.push(flag);
  }
  return groups;
}

/** Flags in the reference are written like "-n N" or "-H / -h"; a teach entry names just "-n" or "-H". */
function flagMatches(docFlag: string, wanted: string): boolean {
  return docFlag === wanted || docFlag.split(/\s*\/\s*|\s+/).includes(wanted);
}

/** Shown above a task that uses a command or flag for the first time: what it is, the flags, an example. */
export function TeachPanel({ entries }: { entries: string[] }) {
  const groups = teachGroups(entries);
  // The full reference opens in place: leaving the page would lose the terminal session.
  const [open, setOpen] = useState<string | null>(null);
  if (!groups.length) return null;
  return (
    <div className="teach">
      <p className="teach-title">
        <BookOpen aria-hidden /> {groups.every((g) => g.cmd.includes(':')) ? "Yangi so'rov qismi" : groups.length === 1 && !groups[0]!.flags.length ? 'Yangi buyruq' : 'Yangi buyruq va flaglar'}
      </p>
      {groups.map(({ cmd, flags }) => {
        const doc = getDoc(cmd);
        if (!doc) return null;
        const rows = flags.length ? doc.flags.filter(([f]) => flags.some((w) => flagMatches(f, w))) : [];
        const example = rows.find(([, , e]) => e)?.[2] ?? doc.examples[0]?.[0];
        return (
          <div key={cmd} className="teach-item">
            <code className="cmd-name" style={{ fontSize: '0.95rem' }}>
              {doc.title ?? cmd}
            </code>
            {!flags.length && <p>{doc.summary}</p>}
            {rows.length > 0 && (
              <dl className="teach-flags">
                {rows.map(([f, text]) => (
                  <div key={f} style={{ display: 'contents' }}>
                    <dt>
                      <code>{f}</code>
                    </dt>
                    <dd>{text}</dd>
                  </div>
                ))}
              </dl>
            )}
            {example && (
              <p className="small" style={{ margin: '6px 0 0' }}>
                Masalan: <code className="mono">{example}</code> ·{' '}
                <button className="link-btn" onClick={() => setOpen(open === cmd ? null : cmd)} aria-expanded={open === cmd}>
                  {open === cmd ? 'yopish' : cmd.includes(':') ? 'batafsil' : 'barcha flaglar'}
                </button>
              </p>
            )}
            {open === cmd && (
              <div style={{ marginTop: 10 }}>
                <CommandCard doc={doc} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
