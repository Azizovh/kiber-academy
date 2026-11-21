import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { ArrowRight, Check, ChevronRight, FileCode2, Info, Lightbulb, Loader2, PartyPopper, Search, SquareTerminal } from 'lucide-react';
import { CommandCard } from '../components/CommandCard';
import { Markdown } from '../components/Markdown';
import { TeachPanel, teachGroups } from '../components/TeachPanel';
import { getDoc } from '../engine/terminal/docs';
import { TerminalView } from '../components/TerminalView';
import { SiemView } from '../components/SiemView';
import { resultText, type SiemLang, type SiemResult } from '../engine/siem';
import { createShell, type ShellState } from '../engine/terminal/shell';
import { Bar, Level } from '../components/ui';
import { LABS, getLab } from '../content/labs';
import type { Lab, LabCheckCtx, Pane } from '../content/types';
import { useStudyTimer } from '../hooks/useStudyTimer';
import { useActivity } from '../store/activity';
import { useProgress } from '../store/progress';
import { useRuntimes } from '../hooks/useRuntimes';
import { RUNTIME_NAMES } from '../engine/runtime';

// CodeMirror is only downloaded for labs that have an editor.
const CodeEditor = lazy(() => import('../components/CodeEditor'));

export const PANE_LABEL: Record<Pane, string> = { terminal: 'Terminal', siem: 'SIEM', editor: 'Kod' };
export function PaneIcon({ pane }: { pane: Pane }) {
  return pane === 'terminal' ? <SquareTerminal aria-hidden /> : pane === 'siem' ? <Search aria-hidden /> : <FileCode2 aria-hidden />;
}

/** Shown while a lab's WebAssembly runtime downloads (once; the browser caches it). */
export function RuntimeLoading({ names, error }: { names: string; error: string | null }) {
  return (
    <div className="page narrow">
      <div className="card pad row" style={{ gap: 12 }} role="status">
        {error ? (
          <span>
            <b>{names} yuklanmadi.</b> Sahifani yangilab ko'ring. ({error})
          </span>
        ) : (
          <>
            <Loader2 aria-hidden className="spin" /> <span>{names} yuklanmoqda… (faqat birinchi marta biroz vaqt oladi)</span>
          </>
        )}
      </div>
    </div>
  );
}

/** Backticks in task texts become inline code. */
function Inline({ text }: { text: string }) {
  return (
    <>
      {text.split(/(`[^`]+`|\*\*[^*`]+\*\*)/g).map((part, i) =>
        part.startsWith('`') && part.length > 2 ? (
          <code key={i} className="mono" style={{ color: 'var(--accent-strong)' }}>
            {part.slice(1, -1)}
          </code>
        ) : part.startsWith('**') && part.length > 4 ? (
          <b key={i}>{part.slice(2, -2)}</b>
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
  return <LabGate key={lab.id} lab={lab} />;
}

function LabGate({ lab }: { lab: Lab }) {
  const { ready, error } = useRuntimes(lab.runtimes);
  if (!ready) return <RuntimeLoading names={(lab.runtimes ?? []).map((r) => RUNTIME_NAMES[r]).join(', ')} error={error} />;
  return <LabRun lab={lab} />;
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

  // The terminal and the SIEM pane share one machine and one list of executed lines.
  const shellRef = useRef<ShellState | null>(null);
  if (!shellRef.current) shellRef.current = createShell(lab.shell());
  const linesRef = useRef<string[]>([]);
  const panes: Pane[] = lab.panes ?? ['terminal'];
  const [pane, setPane] = useState<Pane>(panes[0]!);
  // Bumped when the terminal resets the machine, so the SIEM pane starts over on the new one.
  const [runId, setRunId] = useState(0);
  const desktop = window.matchMedia('(min-width: 1001px)').matches;

  const onSearch = (lang: SiemLang, query: string, result: SiemResult): string | void => {
    linesRef.current.push(`${lang}> ${query}`);
    return onCommand({ state: shellRef.current!, line: query, output: resultText(result), lines: [...linesRef.current], siem: { lang, query, result } });
  };

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
    setRunId((n) => n + 1);
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
          <span>{lab.panes?.includes('siem') ? 'SIEM lablari' : lab.panes?.includes('editor') ? 'Kod lablari' : 'Terminal lablari'}</span>
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

          {panes.length > 1 && (
            <div className="seg pane-tabs" role="tablist" aria-label="Ish oynasi">
              {panes.map((p) => (
                <button key={p} role="tab" aria-selected={pane === p} className={pane === p ? 'on' : ''} onClick={() => setPane(p)}>
                  <PaneIcon pane={p} /> {PANE_LABEL[p]}
                </button>
              ))}
            </div>
          )}

          {panes.includes('terminal') && (
            <div className="lab-terminal" hidden={pane !== 'terminal'}>
              <TerminalView
                init={lab.shell}
                commands={lab.commands}
                onCommand={onCommand}
                onReset={onReset}
                shellRef={shellRef}
                linesRef={linesRef}
                fill
                // On phones focusing the input would open the keyboard over the task before it is read.
                autoFocus={desktop && panes[0] === 'terminal'}
                banner={"KiberAkademiya o'quv terminali. Buyruqlar ro'yxati: help  ·  to'ldirish: Tab  ·  tarix: ↑ ↓"}
              />
            </div>
          )}
          {panes.includes('editor') && lab.editor && (
            <div className="lab-terminal lab-editor" hidden={pane !== 'editor'}>
              <Suspense fallback={<div className="card pad">Muharrir yuklanmoqda…</div>}>
                <CodeEditor key={runId} getState={() => shellRef.current!} root={lab.editor.root} open={lab.editor.open} active={pane === 'editor'} />
              </Suspense>
            </div>
          )}
          {panes.includes('siem') && shellRef.current.siem && (
            <div className="lab-terminal lab-siem" hidden={pane !== 'siem'}>
              <SiemView key={runId} siem={shellRef.current.siem} onSearch={onSearch} autoFocus={desktop && panes[0] === 'siem'} />
            </div>
          )}
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
                    {getDoc(c)?.title ?? c}
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
