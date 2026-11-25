import { lazy, Suspense, useRef, useState, type FormEvent } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { ArrowRight, CheckCircle2, ChevronRight, Flag, Lightbulb } from 'lucide-react';
import { PANE_LABEL, PaneIcon, RuntimeLoading } from './LabPage';
import { useRuntimes } from '../hooks/useRuntimes';
import { RUNTIME_NAMES } from '../engine/runtime';

const CodeEditor = lazy(() => import('../components/CodeEditor'));
import { CodeBlock, Markdown } from '../components/Markdown';
import { TerminalView } from '../components/TerminalView';
import { SiemView } from '../components/SiemView';
import { createShell, type ShellState } from '../engine/terminal/shell';
import { Level } from '../components/ui';
import { CTF, CTF_CATEGORIES, getCtf } from '../content/ctf';
import type { CtfChallenge, Pane } from '../content/types';
import { checkFlag } from '../engine/hash';
import { useStudyTimer } from '../hooks/useStudyTimer';
import { useActivity } from '../store/activity';
import { useProgress } from '../store/progress';

export function CtfPage() {
  const { ctfId = '' } = useParams();
  const challenge = getCtf(ctfId);
  if (!challenge) return <Navigate to="/amaliyot" replace />;
  return <Challenge key={challenge.id} challenge={challenge} />;
}

function Challenge({ challenge }: { challenge: CtfChallenge }) {
  useStudyTimer();
  const state = useProgress((s) => s.ctf[challenge.id]);
  const allCtf = useProgress((s) => s.ctf);
  const solveCtf = useProgress((s) => s.solveCtf);
  const revealHint = useProgress((s) => s.revealHint);
  const addEvent = useActivity((s) => s.addEvent);

  const [value, setValue] = useState('');
  const [wrong, setWrong] = useState(0);
  // A wrong answer in the right shape needs a different hint from one that is not a flag at all.
  const [badShape, setBadShape] = useState(false);
  const solved = state?.solved ?? false;
  const hints = state?.hints ?? 0;
  const nextOpen = CTF.find((c) => c.id !== challenge.id && !allCtf[c.id]?.solved);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!value.trim()) return;
    if (checkFlag(value, challenge.flagHash)) {
      if (!solved) {
        solveCtf(challenge.id);
        addEvent();
      }
    } else {
      setBadShape(!/^\s*flag\{.+\}\s*$/i.test(value));
      setWrong((w) => w + 1);
    }
  };

  const crumbs = (
    <nav className="crumbs" aria-label="Yo'l">
      <Link to="/amaliyot">Amaliyot</Link>
      <ChevronRight aria-hidden />
      <span>CTF · {CTF_CATEGORIES[challenge.category]}</span>
    </nav>
  );

  const chips = (
    <>
      <Level level={challenge.level} />
      <span className="chip">{CTF_CATEGORIES[challenge.category]}</span>
      {solved && (
        <span className="chip ok">
          <CheckCircle2 aria-hidden /> Yechilgan
        </span>
      )}
    </>
  );

  const hintsCard = (
    <div className="card pad">
      <div className="row between" style={{ marginBottom: 10 }}>
        <h2 className="side-title">Maslahatlar</h2>
        <span className="small faint">
          {hints} / {challenge.hints.length} ochilgan
        </span>
      </div>
      <div className="stack" style={{ gap: 8 }}>
        {challenge.hints.slice(0, hints).map((h, i) => (
          <div key={i} className="task-hint" style={{ marginTop: 0 }}>
            <Markdown text={h} className="prose small-prose" />
          </div>
        ))}
        {hints < challenge.hints.length ? (
          <button className="btn sm" style={{ alignSelf: 'flex-start' }} onClick={() => revealHint(challenge.id, hints + 1)}>
            <Lightbulb aria-hidden /> {hints === 0 ? 'Maslahat olish' : 'Yana bir maslahat'}
          </button>
        ) : (
          <span className="small faint">Barcha maslahatlar ochildi.</span>
        )}
      </div>
      <p className="small faint" style={{ marginTop: 10 }}>
        Avval kamida 10 daqiqa o'zingiz urinib ko'ring — tiqilib qolish o'rganishning bir qismi.
      </p>
    </div>
  );

  const flagBlock = solved ? (
    <div className="notice ok">
      <CheckCircle2 aria-hidden />
      <div className="row between wrap">
        <span>
          <b>Flag to'g'ri!</b> Topshiriq yechildi.
        </span>
        {nextOpen ? (
          <Link to={`/ctf/${nextOpen.id}`} className="btn primary sm">
            Keyingi topshiriq <ArrowRight aria-hidden />
          </Link>
        ) : (
          <Link to="/amaliyot" className="btn sm">
            Barcha topshiriqlar
          </Link>
        )}
      </div>
    </div>
  ) : (
    <form key={wrong} className={`card pad ${wrong ? 'shake' : ''}`} onSubmit={submit}>
      <div className="field">
        <label htmlFor="flag">
          <Flag size={14} aria-hidden style={{ verticalAlign: -2 }} /> Flag
        </label>
        <div className="flag-form">
          <input
            id="flag"
            className="input"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="flag{...}"
            autoFocus={wrong > 0}
            autoComplete="off"
            spellCheck={false}
          />
          <button className="btn primary" disabled={!value.trim()}>
            Tekshirish
          </button>
        </div>
        {wrong > 0 && (
          <div className="hint" style={{ color: 'var(--danger)' }} role="alert">
            {badShape ? (
              <>
                Bu flag emas: javob <code>flag{'{...}'}</code> ko'rinishida bo'lishi kerak.
              </>
            ) : (
              <>Noto'g'ri flag — ko'rinishi to'g'ri, lekin qiymat boshqa. Yana urinib ko'ring{wrong > 1 ? ` (${wrong}-urinish)` : ''}.</>
            )}
          </div>
        )}
      </div>
    </form>
  );

  if (challenge.shell) {
    // Terminal challenges use the workspace: everything to read and submit on the left, the terminal on the right.
    return (
      <div className="page workspace">
        <header className="workspace-head">
          {crumbs}
          <div className="row wrap" style={{ gap: 10 }}>
            <h1 className="page-title workspace-title">{challenge.title}</h1>
            {chips}
          </div>
        </header>
        <div className="ctf-layout">
          <div className="ctf-side">
            <div className="card pad">
              <Markdown text={challenge.description} />
            </div>
            {challenge.data && <CodeBlock code={challenge.data} />}
            {flagBlock}
            {hintsCard}
          </div>
          <CtfWork challenge={challenge} init={challenge.shell} />
        </div>
      </div>
    );
  }

  return (
    <div className="page narrow">
      {crumbs}
      <header className="page-head">
        <div>
          <h1 className="page-title">{challenge.title}</h1>
          <div className="row wrap" style={{ marginTop: 12, gap: 8 }}>
            {chips}
          </div>
        </div>
      </header>

      <div className="stack" style={{ gap: 20 }}>
        <Markdown text={challenge.description} />
        {challenge.data && <CodeBlock code={challenge.data} />}
        {hintsCard}
        {flagBlock}
      </div>
    </div>
  );
}

/** The terminal, the SIEM search screen, or both as tabs over one shared machine. */
function CtfWork(props: { challenge: CtfChallenge; init: NonNullable<CtfChallenge['shell']> }) {
  const { ready, error } = useRuntimes(props.challenge.runtimes);
  if (!ready) return <RuntimeLoading names={(props.challenge.runtimes ?? []).map((r) => RUNTIME_NAMES[r]).join(', ')} error={error} />;
  return <CtfPanes {...props} />;
}

function CtfPanes({ challenge, init }: { challenge: CtfChallenge; init: NonNullable<CtfChallenge['shell']> }) {
  const panes: Pane[] = challenge.panes ?? ['terminal'];
  const [pane, setPane] = useState<Pane>(panes[0]!);
  const shellRef = useRef<ShellState | null>(null);
  if (!shellRef.current) shellRef.current = createShell(init());
  const [runId, setRunId] = useState(0);
  return (
    <div className="ctf-terminal ctf-work">
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
        <div className="ctf-pane" hidden={pane !== 'terminal'}>
          <TerminalView init={init} shellRef={shellRef} onReset={() => setRunId((n) => n + 1)} fill autoFocus={false} banner="Topshiriq terminali. Buyruqlar ro'yxati: help" />
        </div>
      )}
      {panes.includes('editor') && challenge.editor && (
        <div className="ctf-pane" hidden={pane !== 'editor'}>
          <Suspense fallback={<div className="card pad">Muharrir yuklanmoqda…</div>}>
            <CodeEditor key={runId} getState={() => shellRef.current!} root={challenge.editor.root} open={challenge.editor.open} active={pane === 'editor'} />
          </Suspense>
        </div>
      )}
      {panes.includes('siem') && shellRef.current.siem && (
        <div className="ctf-pane" hidden={pane !== 'siem'}>
          <SiemView key={runId} siem={shellRef.current.siem} autoFocus={false} />
        </div>
      )}
    </div>
  );
}
