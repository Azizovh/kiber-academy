import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ChevronDown } from 'lucide-react';
import { Markdown } from '../components/Markdown';
import { INTERVIEW, INTERVIEW_SCOPES } from '../content/interview';
import { useSettings } from '../store/settings';

export function InterviewPage() {
  const speciality = useSettings((s) => s.speciality);
  const [scope, setScope] = useState<string>('umumiy');
  const [open, setOpen] = useState<string | null>(null);

  const list = INTERVIEW.filter((q) => q.track === scope);

  return (
    <div className="page narrow">
      <header className="page-head">
        <div>
          <h1 className="page-title">Intervyu savollari</h1>
          <p className="page-sub">
            Avval javobni ovoz chiqarib ayting, keyin namunaviy javobni oching. Yodlamang — tushuntira oladigan
            bo'ling.
          </p>
        </div>
      </header>

      <div className="row wrap" style={{ gap: 6, marginBottom: 20 }}>
        {INTERVIEW_SCOPES.map((s) => (
          <button key={s.id} className={`chip ${scope === s.id ? 'on' : ''}`} onClick={() => setScope(s.id)}>
            {s.title}
            {s.id === speciality ? ' · sizning yo\'nalishingiz' : ''}
            <span className="faint"> {INTERVIEW.filter((q) => q.track === s.id).length}</span>
          </button>
        ))}
      </div>

      <div>
        {list.map((q) => {
          const isOpen = open === q.id;
          return (
            <div key={q.id} className={`card acc ${isOpen ? 'open' : ''}`}>
              <button className="acc-head" onClick={() => setOpen(isOpen ? null : q.id)} aria-expanded={isOpen}>
                <span>
                  {q.question}
                  <span className="chip" style={{ marginLeft: 10, verticalAlign: 1 }}>
                    {q.level}
                  </span>
                </span>
                <ChevronDown />
              </button>
              {isOpen && (
                <div className="acc-body">
                  <Markdown text={q.answer} className="prose small-prose" />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="notice" style={{ marginTop: 28 }}>
        <ArrowRight />
        <div>
          Intervyuga to'liq tayyorgarlik — rezyume, portfolio va ish qidirish strategiyasi —{' '}
          <Link to="/bosqich/k1-karyera" style={{ color: 'var(--accent)', fontWeight: 600 }}>
            Karyera bosqichida
          </Link>
          .
        </div>
      </div>
    </div>
  );
}
