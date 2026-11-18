import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search } from 'lucide-react';
import { CommandCard } from '../components/CommandCard';
import { DOCS, DOC_CATEGORIES, type DocCategory } from '../engine/terminal/docs';

export function CommandsPage() {
  const [query, setQuery] = useState('');
  const [cat, setCat] = useState<DocCategory | 'all'>('all');

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return DOCS.filter((d) => (cat === 'all' || d.category === cat))
      .filter(
        (d) =>
          !q ||
          d.name.includes(q) ||
          d.summary.toLowerCase().includes(q) ||
          d.flags.some(([f, t]) => f.toLowerCase().includes(q) || t.toLowerCase().includes(q)),
      )
      .sort((a, b) => (q && a.name === q ? -1 : q && b.name === q ? 1 : 0));
  }, [query, cat]);

  // Labs link here as #/buyruqlar?c=NAME: open on that command.
  const [params] = useSearchParams();
  const target = params.get('c');
  useEffect(() => {
    if (!target) return;
    setQuery(target);
    setCat('all');
    setTimeout(() => document.getElementById('cmd-' + target)?.scrollIntoView({ block: 'start' }), 50);
  }, [target]);

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1 className="page-title">Buyruqlar ma'lumotnomasi</h1>
          <p className="page-sub">
            Terminalda ishlatiladigan barcha buyruqlar: nima qiladi, qanday yoziladi, har bir flag misol bilan. Xuddi shu
            matnni terminalda <code>man BUYRUQ</code> ham ko'rsatadi.
          </p>
        </div>
        <span className="small faint">{DOCS.length} ta buyruq</span>
      </header>

      <div className="search" style={{ marginBottom: 14 }}>
        <Search aria-hidden />
        <input
          className="input"
          placeholder="Buyruq, flag yoki vazifa bo'yicha qidirish (masalan: grep, -r, yashirin)"
          aria-label="Buyruqlardan qidirish"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      <div className="seg wrap" style={{ marginBottom: 20 }}>
        <button className={cat === 'all' ? 'on' : ''} onClick={() => setCat('all')}>
          Hammasi
        </button>
        {(Object.keys(DOC_CATEGORIES) as DocCategory[]).map((c) => (
          <button key={c} className={cat === c ? 'on' : ''} onClick={() => setCat(c)}>
            {DOC_CATEGORIES[c]}
          </button>
        ))}
      </div>

      {shown.length ? (
        <div className="stack" style={{ gap: 14 }}>
          {shown.map((d) => (
            <CommandCard key={d.name} doc={d} />
          ))}
        </div>
      ) : (
        <div className="empty">
          <h2>Hech narsa topilmadi</h2>
          <p>Boshqa so'z bilan qidirib ko'ring.</p>
        </div>
      )}
    </div>
  );
}
