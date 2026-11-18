import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Layers, PartyPopper } from 'lucide-react';
import { Bar } from '../components/ui';
import { getTopicRef } from '../content/curriculum';
import { loadCards } from '../content/lessons';
import type { Flashcard } from '../content/types';
import { INTERVALS, isMature, type Grade } from '../engine/srs';
import { useDueCards } from '../hooks/useLearning';
import { useStudyTimer } from '../hooks/useStudyTimer';
import { useActivity } from '../store/activity';
import { useCards } from '../store/cards';

function intervalLabel(box: number, grade: Grade): string {
  if (grade === 'again') return 'ertaga';
  const next = grade === 'good' ? Math.min(box + 1, INTERVALS.length) : Math.max(box, 1);
  const days = INTERVALS[next - 1]!;
  return days === 1 ? 'ertaga' : `${days} kundan keyin`;
}

export function ReviewPage() {
  useStudyTimer();
  const cards = useCards((s) => s.cards);
  const grade = useCards((s) => s.grade);
  const addEvent = useActivity((s) => s.addEvent);
  const due = useDueCards();

  // The queue is fixed when the session starts, so a graded card does not reshuffle it.
  // Card texts live in the lessons, which load on demand: fetch the ones behind today's queue first.
  const [deck, setDeck] = useState<Map<string, Flashcard> | null>(null);
  const [failed, setFailed] = useState(false);
  const [startDue] = useState(due);
  useEffect(() => {
    let alive = true;
    loadCards(startDue).then(
      (found) => alive && setDeck(found),
      () => alive && setFailed(true),
    );
    return () => {
      alive = false;
    };
  }, [startDue]);
  const queue = useMemo(() => (deck ? startDue.filter((id) => deck.has(id)) : []), [deck, startDue]);
  const [index, setIndex] = useState(0);
  const [shown, setShown] = useState(false);

  const total = Object.keys(cards).length;
  const mature = useMemo(() => Object.values(cards).filter((c) => c && isMature(c)).length, [cards]);
  const currentId = queue[index];
  const card = currentId ? deck?.get(currentId) ?? null : null;
  const state = currentId ? cards[currentId] : undefined;

  const answer = (g: Grade) => {
    if (!currentId) return;
    grade(currentId, g);
    if (index + 1 >= queue.length) addEvent();
    setIndex(index + 1);
    setShown(false);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!card) return;
      if (!shown && (e.key === ' ' || e.key === 'Enter')) {
        e.preventDefault();
        setShown(true);
      } else if (shown && e.key === '1') answer('again');
      else if (shown && e.key === '2') answer('hard');
      else if (shown && e.key === '3') answer('good');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <div className="page narrow">
      <header className="page-head">
        <div>
          <h1 className="page-title">Takrorlash</h1>
          <p className="page-sub">
            Unutish — tabiiy. Kartochka aynan unuta boshlagan paytingizda qayta so'raladi: har to'g'ri javobdan keyin
            oraliq ikki barobar uzayadi.
          </p>
        </div>
        <div className="row small faint">
          <span>{total} kartochka</span>·<span>{mature} mustahkam</span>
        </div>
      </header>

      {total > 0 && startDue.length > 0 && !deck ? (
        failed ? (
          <div className="empty">
            <Layers />
            <h3>Kartochkalarni yuklab bo'lmadi</h3>
            <p>Internet aloqasini tekshirib, sahifani yangilang.</p>
            <button className="btn primary" onClick={() => window.location.reload()}>
              Sahifani yangilash
            </button>
          </div>
        ) : (
          <div className="lesson-skeleton" aria-busy="true" aria-label="Kartochkalar yuklanmoqda">
            <i style={{ height: 180 }} />
          </div>
        )
      ) : total === 0 ? (
        <div className="empty">
          <Layers />
          <h3>Hali kartochka yo'q</h3>
          <p>Biror darsni tugatsangiz, uning asosiy tushunchalari shu yerga avtomatik qo'shiladi.</p>
          <Link to="/xarita" className="btn primary">
            Yo'l xaritasiga o'tish <ArrowRight />
          </Link>
        </div>
      ) : !card ? (
        <div className="empty">
          <PartyPopper />
          <h3>{queue.length ? 'Bugungi takrorlash tugadi!' : "Bugunga takrorlash yo'q"}</h3>
          <p>
            {queue.length
              ? `${queue.length} ta kartochka takrorlandi. Ertaga yana qayting — muntazamlik hamma narsadan muhim.`
              : 'Barcha kartochkalar keyingi kunlarga rejalashtirilgan. Yangi dars o\'qib, to\'plamni kengaytiring.'}
          </p>
          <Link to="/" className="btn primary">
            Bosh sahifa <ArrowRight />
          </Link>
        </div>
      ) : (
        <>
          <div className="quiz-top">
            <span>
              {index + 1} / {queue.length}
            </span>
            <Bar value={index / queue.length} />
          </div>

          <div className="card flash">
            <div className="eyebrow" style={{ justifyContent: 'center' }}>
              {getTopicRef(card.topicId)?.topic.title}
            </div>
            <div className="flash-front">{card.front}</div>
            {shown && <div className="flash-back">{card.back}</div>}
          </div>

          {shown ? (
            <div className="grades">
              <button className="btn danger" onClick={() => answer('again')}>
                Bilmadim
                <small>
                  {intervalLabel(state?.box ?? 0, 'again')} · <span className="kbd">1</span>
                </small>
              </button>
              <button className="btn" onClick={() => answer('hard')}>
                Qiyin bo'ldi
                <small>
                  {intervalLabel(state?.box ?? 0, 'hard')} · <span className="kbd">2</span>
                </small>
              </button>
              <button className="btn primary" onClick={() => answer('good')}>
                Bildim
                <small>
                  {intervalLabel(state?.box ?? 0, 'good')} · <span className="kbd">3</span>
                </small>
              </button>
            </div>
          ) : (
            <div className="row" style={{ justifyContent: 'center', marginTop: 18 }}>
              <button className="btn primary lg" onClick={() => setShown(true)}>
                Javobni ko'rsatish <span className="kbd">Space</span>
              </button>
            </div>
          )}
          <p className="small faint" style={{ textAlign: 'center', marginTop: 16 }}>
            Avval javobni ichingizda ayting, keyin tekshiring. O'zingizga rostgo'y baho bering.
          </p>
        </>
      )}
    </div>
  );
}
