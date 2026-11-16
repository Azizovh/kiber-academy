import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, NotebookPen, Search, Trash2 } from 'lucide-react';
import { getTopicRef } from '../content/curriculum';
import { formatDate } from '../engine/dates';
import { useNotes } from '../store/notes';

export function NotesPage() {
  const notes = useNotes((s) => s.notes);
  const setNote = useNotes((s) => s.setNote);
  const [query, setQuery] = useState('');

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return Object.entries(notes)
      .flatMap(([topicId, note]) => {
        const ref = getTopicRef(topicId);
        return note && ref ? [{ topicId, note, ref }] : [];
      })
      .filter(({ note, ref }) => !q || `${ref.topic.title} ${note.text}`.toLowerCase().includes(q))
      .sort((a, b) => b.note.updatedAt.localeCompare(a.note.updatedAt));
  }, [notes, query]);

  const total = Object.keys(notes).length;

  return (
    <div className="page narrow">
      <header className="page-head">
        <div>
          <h1 className="page-title">Qaydlar</h1>
          <p className="page-sub">Har bir mavzu sahifasida yozgan konspektlaringiz shu yerda yig'iladi.</p>
        </div>
        <span className="small faint">{total} ta qayd</span>
      </header>

      {total === 0 ? (
        <div className="empty">
          <NotebookPen />
          <h3>Hali qayd yo'q</h3>
          <p>
            Mavzu sahifasining o'ng tomonidagi “Mening qaydim” maydoniga yozing. O'z so'zingiz bilan yozilgan narsa
            ancha yaxshi esda qoladi.
          </p>
          <Link to="/xarita" className="btn primary">
            Yo'l xaritasiga o'tish <ArrowRight />
          </Link>
        </div>
      ) : (
        <>
          <div className="search" style={{ marginBottom: 18 }}>
            <Search />
            <input className="input" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Qaydlardan qidirish…" />
          </div>
          <div className="stack">
            {list.map(({ topicId, note, ref }) => (
              <article key={topicId} className="card note-card">
                <div className="row between">
                  <div>
                    <Link to={`/mavzu/${topicId}`}>
                      <b>{ref.topic.title}</b>
                    </Link>
                    <div className="small faint">
                      {ref.stage.title} · {formatDate(new Date(note.updatedAt))}
                    </div>
                  </div>
                  <button
                    className="icon-btn"
                    title="Qaydni o'chirish"
                    aria-label="Qaydni o'chirish"
                    onClick={() => window.confirm("Bu qayd o'chirilsinmi?") && setNote(topicId, '')}
                  >
                    <Trash2 />
                  </button>
                </div>
                <pre>{note.text}</pre>
              </article>
            ))}
            {!list.length && <p className="muted">Bu so'rov bo'yicha qayd topilmadi.</p>}
          </div>
        </>
      )}
    </div>
  );
}
