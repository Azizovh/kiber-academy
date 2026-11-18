import { useMemo, useState } from 'react';
import { Search, SearchX } from 'lucide-react';
import { GLOSSARY, GLOSSARY_CATEGORIES } from '../content/glossary';
import type { GlossaryTerm } from '../content/types';

type Cat = GlossaryTerm['category'] | 'all';

export function GlossaryPage() {
  const [query, setQuery] = useState('');
  const [cat, setCat] = useState<Cat>('all');

  const terms = useMemo(() => {
    const q = query.trim().toLowerCase();
    return GLOSSARY.filter((t) => cat === 'all' || t.category === cat)
      .filter((t) => !q || `${t.term} ${t.uz ?? ''} ${t.text}`.toLowerCase().includes(q))
      .sort((a, b) => a.term.localeCompare(b.term));
  }, [query, cat]);

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1 className="page-title">Atamalar lug'ati</h1>
          <p className="page-sub">
            Soha tili — ingliz tili. Atamalarni tarjima qilmasdan, asl holida o'rganing: hujjatlar, vositalar va
            intervyularda aynan shu so'zlar ishlatiladi.
          </p>
        </div>
        <span className="small faint">{GLOSSARY.length} ta atama</span>
      </header>

      <div className="stack" style={{ gap: 14, marginBottom: 22 }}>
        <div className="search">
          <Search />
          <input
            className="input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Atama yoki izohdan qidirish…"
            aria-label="Lug'atdan qidirish"
            autoFocus
          />
        </div>
        <div className="row wrap" style={{ gap: 6 }}>
          <button className={`chip ${cat === 'all' ? 'on' : ''}`} onClick={() => setCat('all')}>
            Hammasi
          </button>
          {(Object.keys(GLOSSARY_CATEGORIES) as GlossaryTerm['category'][]).map((c) => (
            <button key={c} className={`chip ${cat === c ? 'on' : ''}`} onClick={() => setCat(c)}>
              {GLOSSARY_CATEGORIES[c]}
            </button>
          ))}
        </div>
      </div>

      {terms.length ? (
        <div className="grid c2">
          {terms.map((t) => (
            <article key={t.id} className="card term">
              <h2>
                {t.term}
                {t.uz && <span>{t.uz}</span>}
              </h2>
              <p>{t.text}</p>
            </article>
          ))}
        </div>
      ) : (
        <div className="empty">
          <SearchX />
          <h2>Hech narsa topilmadi</h2>
          <p>Boshqa so'z bilan qidirib ko'ring yoki toifani “Hammasi” qiling.</p>
        </div>
      )}
    </div>
  );
}
