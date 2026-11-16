import { useState, type FormEvent } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { ArrowRight, CheckCircle2, ChevronRight, Flag, Lightbulb } from 'lucide-react';
import { CodeBlock, Markdown } from '../components/Markdown';
import { TerminalView } from '../components/TerminalView';
import { Level } from '../components/ui';
import { CTF, CTF_CATEGORIES, getCtf } from '../content/ctf';
import type { CtfChallenge } from '../content/types';
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
      setWrong((w) => w + 1);
    }
  };

  return (
    <div className="page narrow">
      <nav className="crumbs">
        <Link to="/amaliyot">Amaliyot</Link>
        <ChevronRight />
        <span>CTF · {CTF_CATEGORIES[challenge.category]}</span>
      </nav>

      <header className="page-head">
        <div>
          <h1 className="page-title">{challenge.title}</h1>
          <div className="row wrap" style={{ marginTop: 12, gap: 8 }}>
            <Level level={challenge.level} />
            <span className="chip">{CTF_CATEGORIES[challenge.category]}</span>
            {solved && (
              <span className="chip ok">
                <CheckCircle2 /> Yechilgan
              </span>
            )}
          </div>
        </div>
      </header>

      <div className="stack" style={{ gap: 20 }}>
        <Markdown text={challenge.description} />
        {challenge.data && <CodeBlock code={challenge.data} />}
        {challenge.shell && (
          <TerminalView
            init={challenge.shell}
            height={340}
            autoFocus={false}
            banner="Topshiriq terminali. Buyruqlar ro'yxati: help"
          />
        )}

        <div className="card pad">
          <div className="row between" style={{ marginBottom: 10 }}>
            <b>Maslahatlar</b>
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
                <Lightbulb /> {hints === 0 ? 'Maslahat olish' : 'Yana bir maslahat'}
              </button>
            ) : (
              <span className="small faint">Barcha maslahatlar ochildi.</span>
            )}
          </div>
          <p className="small faint" style={{ marginTop: 10 }}>
            Avval kamida 10 daqiqa o'zingiz urinib ko'ring — tiqilib qolish o'rganishning bir qismi.
          </p>
        </div>

        {solved ? (
          <div className="notice ok">
            <CheckCircle2 />
            <div className="row between wrap">
              <span>
                <b>Flag to'g'ri!</b> Topshiriq yechildi.
              </span>
              {nextOpen ? (
                <Link to={`/ctf/${nextOpen.id}`} className="btn primary sm">
                  Keyingi topshiriq <ArrowRight />
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
                <Flag size={14} style={{ verticalAlign: -2 }} /> Flag
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
                <div className="hint" style={{ color: 'var(--danger)' }}>
                  Noto'g'ri flag. Formatga e'tibor bering: <code>flag{'{...}'}</code>
                </div>
              )}
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
