import { useRef, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { ArrowRight, Check, ChevronRight, Lightbulb, PartyPopper } from 'lucide-react';
import { Markdown } from '../components/Markdown';
import { TerminalView } from '../components/TerminalView';
import { Bar, Level } from '../components/ui';
import { LABS, getLab } from '../content/labs';
import type { Lab, LabCheckCtx } from '../content/types';
import { useStudyTimer } from '../hooks/useStudyTimer';
import { useActivity } from '../store/activity';
import { useProgress } from '../store/progress';

/** Backticks in task texts become inline code. */
function Inline({ text }: { text: string }) {
  return (
    <>
      {text.split(/(`[^`]+`)/g).map((part, i) =>
        part.startsWith('`') && part.length > 2 ? (
          <code key={i} className="mono" style={{ color: 'var(--accent-strong)' }}>
            {part.slice(1, -1)}
          </code>
        ) : (
          part
        ),
      )}
    </>
  );
}

export function LabPage() {
  const { labId = '' } = useParams();
  const lab = getLab(labId);
  if (!lab) return <Navigate to="/amaliyot" replace />;
  return <LabRun key={lab.id} lab={lab} />;
}

function LabRun({ lab }: { lab: Lab }) {
  useStudyTimer();
  const completeLab = useProgress((s) => s.completeLab);
  const everDone = useProgress((s) => s.labs[lab.id]?.done ?? false);
  const addEvent = useActivity((s) => s.addEvent);

  const [solved, setSolved] = useState(0);
  const [hint, setHint] = useState(false);
  // The terminal callback outlives renders, so the live count is mirrored in a ref.
  const solvedRef = useRef(0);

  const finished = solved >= lab.tasks.length;
  const next = LABS[LABS.findIndex((l) => l.id === lab.id) + 1];

  const onCommand = (ctx: LabCheckCtx): string | void => {
    const start = solvedRef.current;
    let index = start;
    // One command line may satisfy several tasks in a row (e.g. `cd docs && ls -a`).
    while (index < lab.tasks.length) {
      let passed = false;
      try {
        passed = lab.tasks[index]!.check(ctx);
      } catch {
        passed = false;
      }
      if (!passed) break;
      index++;
    }
    if (index === start) return;
    solvedRef.current = index;
    setSolved(index);
    setHint(false);
    addEvent();
    const numbers = Array.from({ length: index - start }, (_, i) => start + i + 1).join('- va ');
    if (index >= lab.tasks.length) {
      completeLab(lab.id);
      return `✓ ${numbers}-topshiriq bajarildi. Lab tugadi — barakalla!`;
    }
    return `✓ ${numbers}-topshiriq bajarildi.`;
  };

  const onReset = () => {
    solvedRef.current = 0;
    setSolved(0);
    setHint(false);
  };

  return (
    <div className="page">
      <nav className="crumbs">
        <Link to="/amaliyot">Amaliyot</Link>
        <ChevronRight />
        <span>Terminal lablari</span>
      </nav>

      <header className="page-head">
        <div>
          <h1 className="page-title">{lab.title}</h1>
          <div className="row wrap" style={{ marginTop: 12, gap: 8 }}>
            <Level level={lab.level} />
            <span className="chip">{lab.minutes} daqiqa</span>
            {everDone && (
              <span className="chip ok">
                <Check /> Avval bajarilgan
              </span>
            )}
          </div>
        </div>
      </header>

      <div className="lab-layout">
        <div className="stack">
          <div className="card pad">
            <Markdown text={lab.intro} className="prose small-prose" />
          </div>

          <div className="card pad">
            <div className="row between" style={{ marginBottom: 10 }}>
              <b>Topshiriqlar</b>
              <span className="small faint">
                {Math.min(solved, lab.tasks.length)} / {lab.tasks.length}
              </span>
            </div>
            <Bar value={solved / lab.tasks.length} style={{ marginBottom: 12 }} />
            <div className="stack" style={{ gap: 2 }}>
              {lab.tasks.map((task, i) => {
                const state = i < solved ? 'done' : i === solved ? 'current' : '';
                return (
                  <div key={task.id} className={`task ${state}`}>
                    <span className="num">{i < solved ? <Check strokeWidth={3.5} /> : i + 1}</span>
                    <div>
                      <Inline text={task.text} />
                      {i === solved &&
                        (hint ? (
                          <div className="task-hint">
                            <Inline text={task.hint} />
                          </div>
                        ) : (
                          <div style={{ marginTop: 8 }}>
                            <button className="btn sm ghost" onClick={() => setHint(true)} style={{ marginLeft: -10 }}>
                              <Lightbulb /> Maslahat
                            </button>
                          </div>
                        ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {finished && (
            <div className="notice ok">
              <PartyPopper />
              <div className="stack" style={{ gap: 10 }}>
                <span>
                  <b>Lab tugadi!</b> Terminalda bemalol tajriba qilishda davom etishingiz mumkin.
                </span>
                <div className="row wrap">
                  {next && (
                    <Link to={`/lab/${next.id}`} className="btn primary sm">
                      Keyingi lab: {next.title} <ArrowRight />
                    </Link>
                  )}
                  <Link to="/amaliyot" className="btn sm">
                    Barcha lablar
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>

        <TerminalView
          init={lab.shell}
          commands={lab.commands}
          onCommand={onCommand}
          onReset={onReset}
          height={520}
          banner={"KiberAkademiya o'quv terminali. Buyruqlar ro'yxati: help  ·  to'ldirish: Tab  ·  tarix: ↑ ↓"}
        />
      </div>
    </div>
  );
}
