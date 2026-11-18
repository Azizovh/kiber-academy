import { useEffect, useRef, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { ArrowRight, Check, ChevronRight, Info, Lightbulb, PartyPopper } from 'lucide-react';
import { CommandCard } from '../components/CommandCard';
import { Markdown } from '../components/Markdown';
import { TeachPanel, teachGroups } from '../components/TeachPanel';
import { getDoc } from '../engine/terminal/docs';
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

  const current = lab.tasks[solved];
  // Every command the lab teaches, in order, for the side reference.
  const labCommands = [...new Set(lab.tasks.flatMap((t) => teachGroups(t.teach ?? []).map((g) => g.cmd)))];
  const [refOpen, setRefOpen] = useState<string | null>(null);
  const currentRef = useRef<HTMLLIElement>(null);

  // Keep the current task visible inside the task list (desktop only: on phones the list sits below the terminal,
  // and scrolling the page there would pull the learner away from what they are typing).
  useEffect(() => {
    if (window.matchMedia('(min-width: 1001px)').matches) currentRef.current?.scrollIntoView({ block: 'nearest' });
  }, [solved]);

  return (
    <div className="page workspace">
      <header className="workspace-head">
        <nav className="crumbs" aria-label="Yo'l">
          <Link to="/amaliyot">Amaliyot</Link>
          <ChevronRight aria-hidden />
          <span>Terminal lablari</span>
        </nav>
        <div className="row wrap" style={{ gap: 10 }}>
          <h1 className="page-title workspace-title">{lab.title}</h1>
          <Level level={lab.level} />
          <span className="chip">{lab.minutes} daqiqa</span>
          {everDone && (
            <span className="chip ok">
              <Check aria-hidden /> Avval bajarilgan
            </span>
          )}
        </div>
      </header>

      <div className="lab-layout">
        <section className="lab-main" aria-label="Terminal">
          <div className={`current-task card ${finished ? 'finished' : ''}`} aria-live="polite">
            {finished ? (
              <div className="row between wrap" style={{ gap: 12 }}>
                <span className="row" style={{ gap: 10 }}>
                  <PartyPopper aria-hidden className="current-icon" />
                  <span>
                    <b>Lab tugadi!</b> Terminalda tajriba qilishda davom etishingiz mumkin.
                  </span>
                </span>
                <span className="row wrap" style={{ gap: 8 }}>
                  {next && (
                    <Link to={`/lab/${next.id}`} className="btn primary sm">
                      Keyingi lab <ArrowRight aria-hidden />
                    </Link>
                  )}
                  <Link to="/amaliyot" className="btn sm">
                    Barcha lablar
                  </Link>
                </span>
              </div>
            ) : (
              current && (
                <>
                  <div className="current-head">
                    <span className="current-step">
                      {solved + 1}-topshiriq · {lab.tasks.length} tadan
                      {current.challenge && <span className="chip warn" style={{ marginLeft: 8 }}>Mustaqil vazifa</span>}
                    </span>
                    <Bar value={solved / lab.tasks.length} />
                  </div>
                  {current.teach && <TeachPanel key={current.id} entries={current.teach} />}
                  <p className="current-text" style={current.teach ? { marginTop: 12 } : undefined}>
                    <Inline text={current.text} />
                  </p>
                  {hint ? (
                    <div className="task-hint">
                      <Inline text={current.hint} />
                    </div>
                  ) : (
                    <button className="btn sm ghost current-hint-btn" onClick={() => setHint(true)}>
                      <Lightbulb aria-hidden /> {current.challenge ? "Maslahat (avval o'zingiz urinib ko'ring)" : 'Maslahat'}
                    </button>
                  )}
                </>
              )
            )}
          </div>

          <div className="lab-terminal">
            <TerminalView
              init={lab.shell}
              commands={lab.commands}
              onCommand={onCommand}
              onReset={onReset}
              fill
              // On phones focusing the input would open the keyboard over the task before it is read.
              autoFocus={window.matchMedia('(min-width: 1001px)').matches}
              banner={"KiberAkademiya o'quv terminali. Buyruqlar ro'yxati: help  ·  to'ldirish: Tab  ·  tarix: ↑ ↓"}
            />
          </div>
        </section>

        <aside className="lab-side" aria-label="Lab haqida va topshiriqlar">
          <details className="card lab-intro" open={!everDone}>
            <summary>
              <Info aria-hidden /> Lab haqida
            </summary>
            <Markdown text={lab.intro} className="prose small-prose" />
          </details>

          {labCommands.length > 0 && (
            <div className="card pad">
              <h2 className="side-title" style={{ marginBottom: 10 }}>
                Bu labdagi buyruqlar
              </h2>
              <div className="lab-cmds">
                {labCommands.map((c) => (
                  <button key={c} className={refOpen === c ? 'on' : ''} onClick={() => setRefOpen(refOpen === c ? null : c)} aria-expanded={refOpen === c}>
                    {c}
                  </button>
                ))}
              </div>
              {refOpen && getDoc(refOpen) && (
                <div style={{ marginTop: 12 }}>
                  <CommandCard doc={getDoc(refOpen)!} />
                </div>
              )}
            </div>
          )}

          <div className="card pad">
            <div className="row between" style={{ marginBottom: 10 }}>
              <h2 className="side-title">Topshiriqlar</h2>
              <span className="small faint">
                {Math.min(solved, lab.tasks.length)} / {lab.tasks.length}
              </span>
            </div>
            <ol className="task-list">
              {lab.tasks.map((task, i) => {
                const state = i < solved ? 'done' : i === solved ? 'current' : '';
                return (
                  <li key={task.id} ref={i === solved ? currentRef : undefined} className={`task ${state} ${task.challenge ? 'challenge' : ''}`} aria-current={i === solved ? 'step' : undefined}>
                    <span className="num" aria-hidden>
                      {i < solved ? <Check strokeWidth={3.5} /> : i + 1}
                    </span>
                    <div>
                      <Inline text={task.text} />
                      {i < solved && <span className="sr-only"> (bajarildi)</span>}
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
        </aside>
      </div>
    </div>
  );
}
