import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Award,
  Check,
  ChevronRight,
  Clock,
  Flag,
  Lightbulb,
  Play,
  Printer,
  RotateCcw,
  X,
} from 'lucide-react';
import { Markdown } from '../components/Markdown';
import { TerminalView, type CommandMessage } from '../components/TerminalView';
import { SiemView } from '../components/SiemView';
import { Bar, Ring, pct, tone } from '../components/ui';
import { PANE_LABEL, PaneIcon, RuntimeLoading } from './LabPage';
import { getExam, LEVEL_TEXT, trackReadiness } from '../content/exams';
import type { Exam, ExamPractical, ExamQuestion } from '../content/examTypes';
import type { LabCheckCtx, Pane } from '../content/types';
import { drawAttempt, EXAM_RULES, isCorrect, nextAttemptAt, scoreAttempt, type PracticalScore } from '../engine/exam';
import { resultText, type SiemLang, type SiemResult } from '../engine/siem';
import { createShell, type ShellState } from '../engine/terminal/shell';
import { RUNTIME_NAMES, type Runtime } from '../engine/runtime';
import { useRuntimes } from '../hooks/useRuntimes';
import { useExams, type ActiveExam, type ExamAttempt } from '../store/exams';
import { useProgress } from '../store/progress';
import { useSettings } from '../store/settings';

const CodeEditor = lazy(() => import('../components/CodeEditor'));

/* ── small helpers ──────────────────────────────────────────────── */

function useNow(): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);
  return now;
}

function clock(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

export function dateTime(ms: number): string {
  const d = new Date(ms);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getDate())}.${p(d.getMonth() + 1)}.${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

/** Inline `code` inside an option. */
function Rich({ text }: { text: string }) {
  return (
    <>
      {text.split(/(`[^`]+`)/g).map((part, i) =>
        part.startsWith('`') && part.endsWith('`') && part.length > 2 ? <code key={i}>{part.slice(1, -1)}</code> : part,
      )}
    </>
  );
}

const rightCount = (q: ExamQuestion) => q.options.filter((o) => o.correct).length;

/** Typing the expected answer is not finding it: lines that only print text are not checked. */
function printsOnly(line: string): boolean {
  return line.split(/\|\||&&|[|;]/).some((seg) => /^\s*(sudo\s+)?(echo|printf|seq|yes)\b/.test(seg));
}

function Timer({ endsAt, now, label }: { endsAt: number; now: number; label: string }) {
  const left = endsAt - now;
  return (
    <span className={`exam-timer ${left < 5 * 60_000 ? 'low' : ''}`} role="timer" aria-label={`${label}: ${clock(left)} qoldi`}>
      <Clock aria-hidden /> {clock(left)}
    </span>
  );
}

/* ── the page ───────────────────────────────────────────────────── */

export function ExamPage() {
  const { examId = '' } = useParams();
  const exam = getExam(examId);
  const active = useExams((s) => s.active);
  if (!exam) return <Navigate to="/imtihonlar" replace />;
  if (active && active.exam === exam.id) return <Running key={active.startedAt} exam={exam} active={active} />;
  return <Intro exam={exam} other={active ? getExam(active.exam) : null} />;
}

function Intro({ exam, other }: { exam: Exam; other: Exam | null }) {
  const progress = useProgress();
  const attempts = useExams((s) => s.attempts[exam.id]) ?? [];
  const begin = useExams((s) => s.begin);
  const now = useNow();
  const r = trackReadiness(exam, progress, attempts);
  const wait = nextAttemptAt(attempts.map((a) => a.finishedAt), now);
  const [sure, setSure] = useState(false);

  const start = () => {
    const at = Date.now();
    const draw = drawAttempt(exam, at);
    begin({
      exam: exam.id,
      startedAt: at,
      phase: 'theory',
      theoryEndsAt: at + EXAM_RULES.theoryMinutes * 60_000,
      practiceEndsAt: null,
      questions: draw.questions,
      practicals: draw.practicals,
      answers: {},
      solved: {},
    });
  };

  return (
    <div className="page" style={tone(exam.id)}>
      <nav className="crumbs" aria-label="Yo'l">
        <Link to="/imtihonlar">Imtihonlar</Link>
        <ChevronRight aria-hidden />
        <span>{exam.title}</span>
      </nav>
      <header className="page-head" style={{ marginTop: 10 }}>
        <div>
          <h1 className="page-title">{exam.title}</h1>
          <p className="page-sub">{exam.summary}</p>
        </div>
      </header>

      <div className="exam-intro">
        <section className="card pad">
          <h2 className="side-title">Imtihon tarkibi</h2>
          <ul className="exam-rule-list" style={{ marginTop: 12 }}>
            <li>
              <span className="exam-step">1</span>
              <span>
                <b>Nazariya</b> — {EXAM_RULES.theoryCount} ta vaziyatli savol, {EXAM_RULES.theoryMinutes} daqiqa. Savollar orasida erkin yurasiz, javobni o'zgartirish mumkin.
              </span>
            </li>
            <li>
              <span className="exam-step">2</span>
              <span>
                <b>Amaliyot</b> — {EXAM_RULES.practicalCount} ta qisqa tekshiruv, {EXAM_RULES.practicalMinutes} daqiqa. Maslahat va buyruq qo'llanmasi yo'q; to'g'ri javob chiqargan buyruq qabul qilinadi.
              </span>
            </li>
            <li>
              <span className="exam-step">3</span>
              <span>
                <b>Natija</b> — o'tish bali {pct(EXAM_RULES.pass)}. Keyin har bir savol izohi bilan ko'rsatiladi va natija varaqasini chop etish mumkin.
              </span>
            </li>
          </ul>
          <p className="small faint" style={{ marginTop: 14 }}>
            Mavzular: {exam.topics.map((t) => t.title).join(' · ')}
          </p>

          <div className="exam-start">
            {other ? (
              <p className="small">
                <AlertTriangle aria-hidden className="inline-icon" /> Avval boshlangan imtihonni yakunlang:{' '}
                <Link to={`/imtihon/${other.id}`}>{other.title}</Link>
              </p>
            ) : wait ? (
              <p className="small">
                <Clock aria-hidden className="inline-icon" /> Keyingi urinish: <b>{dateTime(wait)}</b> dan keyin (
                {Math.ceil((wait - now) / 3600_000)} soatcha qoldi). Bu vaqtni zaif mavzularga sarflang.
              </p>
            ) : sure ? (
              <div className="row wrap" style={{ gap: 10 }}>
                <span className="small">
                  Boshlaganingizdan keyin soat to'xtamaydi. {EXAM_RULES.theoryMinutes + EXAM_RULES.practicalMinutes} daqiqa vaqtingiz bormi?
                </span>
                <button className="btn primary" onClick={start} autoFocus>
                  <Play aria-hidden /> Ha, boshlash
                </button>
                <button className="btn ghost" onClick={() => setSure(false)}>
                  Hozir emas
                </button>
              </div>
            ) : (
              <button className="btn primary lg" onClick={() => setSure(true)}>
                <Play aria-hidden /> Imtihonni boshlash
              </button>
            )}
          </div>
        </section>

        <ReadinessCard exam={exam} />
      </div>

      {attempts.length > 0 && (
        <section className="section">
          <h2 className="section-title">Urinishlar</h2>
          <div className="card">
            {[...attempts].reverse().map((a) => (
              <Link key={a.id} to={`/imtihon/${exam.id}/natija/${a.id}`} className="exam-attempt">
                <span className="mono small">{dateTime(a.finishedAt)}</span>
                <span className="grow">
                  <Bar value={a.score.total} />
                </span>
                <b>{pct(a.score.total)}</b>
                <span className={`chip ${a.score.passed ? 'ok' : 'warn'}`}>{a.score.passed ? "O'tdi" : "O'tmadi"}</span>
                <ChevronRight aria-hidden className="faint" />
              </Link>
            ))}
          </div>
        </section>
      )}
      {r.best && <p className="small faint" style={{ marginTop: 12 }}>Eng yaxshi natija tayyorlik bahosiga kiradi.</p>}
    </div>
  );
}

export function ReadinessCard({ exam }: { exam: Exam }) {
  const progress = useProgress();
  const attempts = useExams((s) => s.attempts[exam.id]) ?? [];
  const r = trackReadiness(exam, progress, attempts);
  const parts: [string, number, string][] = [
    ['Imtihon (eng yaxshi)', r.parts.exam, r.best ? pct(r.best.score.total) : '—'],
    ['Darslar va testlar', r.parts.lessons, `${r.counts.lessonsDone} / ${r.counts.lessons}`],
    ['Lablar', r.parts.labs, `${r.counts.labsDone} / ${r.counts.labs}`],
    ['CTF', r.parts.ctf, `${r.counts.ctfSolved} / ${r.counts.ctf}`],
  ];
  return (
    <section className="card pad">
      <h2 className="side-title">Ishga tayyorlik</h2>
      <div className="row" style={{ gap: 16, marginTop: 12 }}>
        <Ring value={r.score} size={72} stroke={7} style={{ color: 'var(--tone)' }}>
          {Math.round(r.score * 100)}
        </Ring>
        <div>
          <b>{LEVEL_TEXT[r.level].title}</b>
          <p className="small muted" style={{ marginTop: 4 }}>
            {LEVEL_TEXT[r.level].text}
          </p>
        </div>
      </div>
      <div className="exam-parts">
        {parts.map(([label, v, note]) => (
          <div key={label}>
            <div className="row between small">
              <span>{label}</span>
              <span className="faint">{note}</span>
            </div>
            <Bar value={v} />
          </div>
        ))}
      </div>
      {r.recommendations.length > 0 && (
        <>
          <h3 className="small faint" style={{ marginTop: 16, marginBottom: 6 }}>
            Tavsiyalar
          </h3>
          <ul className="exam-recs">
            {r.recommendations.map((rec) => (
              <li key={rec.text}>
                <Lightbulb aria-hidden />
                <Link to={rec.to}>{rec.text}</Link>
              </li>
            ))}
          </ul>
        </>
      )}
      <p className="small faint" style={{ marginTop: 12 }}>
        Baho taxminiy: yarmi imtihon natijasi, qolgani darslar, lablar va CTF. Ish beruvchi uchun hujjat emas.
      </p>
    </section>
  );
}

/* ── an attempt in progress ─────────────────────────────────────── */

function Running({ exam, active }: { exam: Exam; active: ActiveExam }) {
  const navigate = useNavigate();
  const finishStore = useExams((s) => s.finish);
  const toPractice = useExams((s) => s.toPractice);
  const now = useNow();
  const done = useRef(false);

  const finish = () => {
    if (done.current) return;
    done.current = true;
    const s = useExams.getState().active ?? active;
    const practicals: PracticalScore[] = s.practicals
      .map((id) => exam.practicals.find((p) => p.id === id))
      .filter((p): p is ExamPractical => !!p)
      .map((p) => ({ id: p.id, topic: p.topic, solved: (s.solved[p.id] ?? []).filter((t) => p.tasks.some((x) => x.id === t)).length, total: p.tasks.length }));
    const ids = s.questions.map((q) => q.id);
    const attempt: ExamAttempt = {
      id: `${exam.id}-${s.startedAt}`,
      exam: exam.id,
      startedAt: s.startedAt,
      finishedAt: Math.min(Date.now(), s.practiceEndsAt ?? Date.now()),
      questions: s.questions,
      answers: s.answers,
      practicals,
      score: scoreAttempt(exam, ids, s.answers, practicals),
    };
    finishStore(attempt);
    navigate(`/imtihon/${exam.id}/natija/${attempt.id}`, { replace: true });
  };

  const endTheory = () => {
    // The practical part gets its full time even when the theory ends early; after a long absence it starts now.
    toPractice(Date.now() + EXAM_RULES.practicalMinutes * 60_000);
  };

  useEffect(() => {
    if (active.phase === 'theory' && now >= active.theoryEndsAt) endTheory();
    if (active.phase === 'practice' && active.practiceEndsAt && now >= active.practiceEndsAt) finish();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [now, active.phase]);

  if (active.phase === 'theory') return <Theory exam={exam} active={active} now={now} onEnd={endTheory} />;
  return <Practice exam={exam} active={active} now={now} onFinish={finish} />;
}

function Theory({ exam, active, now, onEnd }: { exam: Exam; active: ActiveExam; now: number; onEnd: () => void }) {
  const answer = useExams((s) => s.answer);
  const [index, setIndex] = useState(0);
  const [flags, setFlags] = useState<string[]>([]);
  const [confirm, setConfirm] = useState(false);
  const bank = useMemo(() => new Map(exam.questions.map((q) => [q.id, q])), [exam]);
  const drawn = active.questions[index]!;
  const q = bank.get(drawn.id)!;
  const chosen = active.answers[drawn.id] ?? [];
  const multi = rightCount(q) > 1;
  const answered = active.questions.filter((d) => (active.answers[d.id] ?? []).length > 0).length;
  const total = active.questions.length;

  const pick = (i: number) => {
    if (multi) answer(drawn.id, chosen.includes(i) ? chosen.filter((x) => x !== i) : [...chosen, i]);
    else answer(drawn.id, [i]);
  };
  const go = (i: number) => {
    setIndex(Math.min(Math.max(i, 0), total - 1));
    setConfirm(false);
  };
  const topic = exam.topics.find((t) => t.id === q.topic);

  return (
    <div className="page exam-run" style={tone(exam.id)}>
      <header className="exam-bar">
        <span className="exam-bar-title">
          {exam.title} · <b>Nazariya</b>
        </span>
        <span className="small faint">
          Javob berildi: {answered} / {total}
        </span>
        <Timer endsAt={active.theoryEndsAt} now={now} label="Nazariya" />
      </header>

      <div className="exam-theory">
        <section className="card pad exam-question">
          <div className="row between small faint" style={{ marginBottom: 12 }}>
            <span>
              {index + 1}-savol · {total} tadan{topic ? ` · ${topic.title}` : ''}
            </span>
            <button className={`btn sm ghost ${flags.includes(drawn.id) ? 'flagged' : ''}`} onClick={() => setFlags((f) => (f.includes(drawn.id) ? f.filter((x) => x !== drawn.id) : [...f, drawn.id]))} aria-pressed={flags.includes(drawn.id)}>
              <Flag aria-hidden /> {flags.includes(drawn.id) ? 'Belgilangan' : 'Keyinroq qaytish'}
            </button>
          </div>
          <Markdown text={q.text} className="prose exam-q-text" />
          {multi && <div className="quiz-hint" style={{ marginTop: 8 }}>{rightCount(q)} ta javobni tanlang.</div>}
          <div style={{ marginTop: 14 }} role={multi ? 'group' : 'radiogroup'}>
            {drawn.order.map((oi, n) => {
              const o = q.options[oi]!;
              const on = chosen.includes(oi);
              return (
                <button key={oi} className={`opt ${on ? 'picked' : ''}`} onClick={() => pick(oi)} role={multi ? 'checkbox' : 'radio'} aria-checked={on}>
                  <span className={`mark ${multi ? 'sq' : ''}`}>{on ? <Check strokeWidth={3} /> : String.fromCharCode(65 + n)}</span>
                  <span>
                    <Rich text={o.text} />
                  </span>
                </button>
              );
            })}
          </div>
          <div className="row between" style={{ marginTop: 20 }}>
            <button className="btn" onClick={() => go(index - 1)} disabled={index === 0}>
              <ArrowLeft aria-hidden /> Oldingi
            </button>
            {index + 1 < total ? (
              <button className="btn primary" onClick={() => go(index + 1)}>
                Keyingi <ArrowRight aria-hidden />
              </button>
            ) : (
              <button className="btn primary" onClick={() => setConfirm(true)}>
                Nazariyani yakunlash <ArrowRight aria-hidden />
              </button>
            )}
          </div>
        </section>

        <aside className="card pad exam-nav" aria-label="Savollar">
          <div className="exam-grid">
            {active.questions.map((d, i) => {
              const has = (active.answers[d.id] ?? []).length > 0;
              return (
                <button key={d.id} className={`${has ? 'has' : ''} ${i === index ? 'here' : ''} ${flags.includes(d.id) ? 'flag' : ''}`} onClick={() => go(i)} aria-label={`${i + 1}-savol${has ? ', javob berilgan' : ''}${flags.includes(d.id) ? ', belgilangan' : ''}`}>
                  {i + 1}
                </button>
              );
            })}
          </div>
          <div className="exam-legend small faint">
            <span><i className="has" /> javob bor</span>
            <span><i className="flag" /> belgilangan</span>
          </div>
          {confirm ? (
            <div className="exam-confirm">
              <p className="small">
                {answered < total ? <><b>{total - answered} ta savol javobsiz.</b> </> : null}
                Nazariyaga qaytib bo'lmaydi. Amaliy qismga o'tasizmi?
              </p>
              <div className="row" style={{ gap: 8, marginTop: 10 }}>
                <button className="btn primary sm" onClick={onEnd} autoFocus>
                  Ha, amaliyotga
                </button>
                <button className="btn sm ghost" onClick={() => setConfirm(false)}>
                  Qaytish
                </button>
              </div>
            </div>
          ) : (
            <button className="btn sm" style={{ marginTop: 16, width: '100%' }} onClick={() => setConfirm(true)}>
              Nazariyani yakunlash
            </button>
          )}
        </aside>
      </div>
    </div>
  );
}

function Practice({ exam, active, now, onFinish }: { exam: Exam; active: ActiveExam; now: number; onFinish: () => void }) {
  const practicals = active.practicals.map((id) => exam.practicals.find((p) => p.id === id)).filter((p): p is ExamPractical => !!p);
  const runtimes = [...new Set(practicals.flatMap((p) => p.runtimes ?? []))] as Runtime[];
  const { ready, error } = useRuntimes(runtimes);
  const [tab, setTab] = useState(practicals[0]?.id ?? '');
  const [confirm, setConfirm] = useState(false);
  const solved = practicals.reduce((n, p) => n + (active.solved[p.id] ?? []).length, 0);
  const tasks = practicals.reduce((n, p) => n + p.tasks.length, 0);

  if (!ready) return <RuntimeLoading names={runtimes.map((r) => RUNTIME_NAMES[r]).join(', ')} error={error} />;

  return (
    <div className="page workspace exam-run" style={tone(exam.id)}>
      <header className="exam-bar">
        <span className="exam-bar-title">
          {exam.title} · <b>Amaliyot</b>
        </span>
        <span className="small faint">
          Bajarildi: {solved} / {tasks}
        </span>
        {active.practiceEndsAt && <Timer endsAt={active.practiceEndsAt} now={now} label="Amaliyot" />}
        {confirm ? (
          <span className="row" style={{ gap: 8 }}>
            <span className="small">Yakunlaysizmi?</span>
            <button className="btn primary sm" onClick={onFinish} autoFocus>
              Ha
            </button>
            <button className="btn sm ghost" onClick={() => setConfirm(false)}>
              Yo'q
            </button>
          </span>
        ) : (
          <button className="btn sm" onClick={() => setConfirm(true)}>
            Imtihonni yakunlash
          </button>
        )}
      </header>

      {practicals.length > 1 && (
        <div className="seg pane-tabs" role="tablist" aria-label="Amaliy topshiriqlar" style={{ marginBottom: 12 }}>
          {practicals.map((p, i) => (
            <button key={p.id} role="tab" aria-selected={tab === p.id} className={tab === p.id ? 'on' : ''} onClick={() => setTab(p.id)}>
              {i + 1}. {p.title} ({(active.solved[p.id] ?? []).length}/{p.tasks.length})
            </button>
          ))}
        </div>
      )}
      {practicals.map((p) => (
        <div key={p.id} className="exam-practical" hidden={tab !== p.id}>
          <PracticalView practical={p} solved={active.solved[p.id] ?? []} visible={tab === p.id} />
        </div>
      ))}
    </div>
  );
}

function PracticalView({ practical, solved, visible }: { practical: ExamPractical; solved: string[]; visible: boolean }) {
  const solve = useExams((s) => s.solve);
  const shellRef = useRef<ShellState | null>(null);
  if (!shellRef.current) shellRef.current = createShell(practical.shell());
  const linesRef = useRef<string[]>([]);
  const panes: Pane[] = practical.panes ?? ['terminal'];
  const [pane, setPane] = useState<Pane>(panes[0]!);
  const [runId, setRunId] = useState(0);

  const onCommand = (ctx: LabCheckCtx): CommandMessage => {
    if (!ctx.siem && printsOnly(ctx.line)) return;
    const already = useExams.getState().active?.solved[practical.id] ?? [];
    const hits: number[] = [];
    practical.tasks.forEach((task, i) => {
      if (already.includes(task.id)) return;
      let ok = false;
      try {
        ok = task.check(ctx);
      } catch {
        ok = false;
      }
      if (ok) {
        solve(practical.id, task.id);
        hits.push(i + 1);
      }
    });
    if (hits.length) return `✓ ${hits.join('- va ')}-topshiriq javobi qabul qilindi.`;
  };

  const onSearch = (lang: SiemLang, query: string, result: SiemResult): string | void => {
    linesRef.current.push(`${lang}> ${query}`);
    const msg = onCommand({ state: shellRef.current!, line: query, output: resultText(result), lines: [...linesRef.current], siem: { lang, query, result } });
    return typeof msg === 'object' && msg ? msg.warn : msg;
  };

  return (
    <div className="lab-layout">
      <section className="lab-main" aria-label="Ish oynasi">
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
              init={practical.shell}
              commands={practical.commands}
              onCommand={onCommand}
              onReset={() => setRunId((n) => n + 1)}
              shellRef={shellRef}
              linesRef={linesRef}
              fill
              autoFocus={false}
              banner="Imtihon terminali. Qabul qilingan javoblar saqlanadi, terminalni qayta boshlash ularni o'chirmaydi."
            />
          </div>
        )}
        {panes.includes('editor') && practical.editor && (
          <div className="lab-terminal lab-editor" hidden={pane !== 'editor'}>
            <Suspense fallback={<div className="card pad">Muharrir yuklanmoqda…</div>}>
              <CodeEditor key={runId} getState={() => shellRef.current!} root={practical.editor.root} open={practical.editor.open} active={visible && pane === 'editor'} />
            </Suspense>
          </div>
        )}
        {panes.includes('siem') && shellRef.current.siem && (
          <div className="lab-terminal lab-siem" hidden={pane !== 'siem'}>
            <SiemView key={runId} siem={shellRef.current.siem} onSearch={onSearch} autoFocus={false} />
          </div>
        )}
      </section>

      <aside className="lab-side" aria-label="Vaziyat va topshiriqlar">
        <div className="card pad">
          <h2 className="side-title" style={{ marginBottom: 8 }}>
            Vaziyat
          </h2>
          <Markdown text={practical.intro} className="prose small-prose" />
        </div>
        <div className="card pad">
          <div className="row between" style={{ marginBottom: 10 }}>
            <h2 className="side-title">Topshiriqlar</h2>
            <span className="small faint">
              {solved.length} / {practical.tasks.length}
            </span>
          </div>
          <p className="small faint" style={{ marginBottom: 10 }}>
            Istalgan tartibda bajaring. Javob — uni chiqargan yoki bajargan buyruq.
          </p>
          <ol className="task-list">
            {practical.tasks.map((task, i) => {
              const ok = solved.includes(task.id);
              return (
                <li key={task.id} className={`task ${ok ? 'done' : ''}`}>
                  <span className="num" aria-hidden>
                    {ok ? <Check strokeWidth={3.5} /> : i + 1}
                  </span>
                  <div>
                    <Markdown text={task.text} className="prose small-prose exam-task-text" />
                    {ok && <span className="sr-only"> (qabul qilindi)</span>}
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      </aside>
    </div>
  );
}

/* ── results ────────────────────────────────────────────────────── */

function useAttempt(): { exam: Exam; attempt: ExamAttempt } | null {
  const { examId = '', attemptId = '' } = useParams();
  const exam = getExam(examId);
  const attempt = useExams((s) => s.attempts[examId]?.find((a) => a.id === attemptId));
  return exam && attempt ? { exam, attempt } : null;
}

export function ExamResultPage() {
  const found = useAttempt();
  const [filter, setFilter] = useState<'all' | 'wrong'>('wrong');
  if (!found) return <Navigate to="/imtihonlar" replace />;
  const { exam, attempt } = found;
  const s = attempt.score;
  const bank = new Map(exam.questions.map((q) => [q.id, q]));
  const list = attempt.questions.filter((d) => bank.has(d.id)).filter((d) => filter === 'all' || !isCorrect(bank.get(d.id)!, attempt.answers[d.id]));

  return (
    <div className="page" style={tone(exam.id)}>
      <nav className="crumbs" aria-label="Yo'l">
        <Link to="/imtihonlar">Imtihonlar</Link>
        <ChevronRight aria-hidden />
        <Link to={`/imtihon/${exam.id}`}>{exam.title}</Link>
        <ChevronRight aria-hidden />
        <span>Natija</span>
      </nav>

      <section className={`card pad exam-result ${s.passed ? 'passed' : 'failed'}`} style={{ marginTop: 14 }}>
        <Ring value={s.total} size={110} stroke={9} style={{ color: s.passed ? 'var(--ok)' : 'var(--warn)' }}>
          {Math.round(s.total * 100)}%
        </Ring>
        <div className="grow">
          <h1 className="page-title">
            {s.passed ? (
              <>
                <Award aria-hidden className="inline-icon" /> Imtihondan o'tdingiz
              </>
            ) : (
              "Bu safar o'tmadi"
            )}
          </h1>
          <p className="muted" style={{ marginTop: 6 }}>
            {s.passed
              ? 'Tabriklaymiz! Quyida xato javoblarni ko\'rib chiqing — intervyuda aynan shular so\'raladi.'
              : `O'tish uchun ${pct(EXAM_RULES.pass)} kerak edi. Zaif mavzularni takrorlang va ${EXAM_RULES.retakeHours} soatdan keyin qayta urinib ko'ring.`}
          </p>
          <div className="row wrap" style={{ gap: 18, marginTop: 14 }}>
            <span>
              Nazariya: <b>{pct(s.theory)}</b> <span className="faint small">({s.correct}/{s.asked})</span>
            </span>
            <span>
              Amaliyot: <b>{pct(s.practical)}</b>{' '}
              <span className="faint small">
                ({attempt.practicals.reduce((n, p) => n + p.solved, 0)}/{attempt.practicals.reduce((n, p) => n + p.total, 0)})
              </span>
            </span>
            <span className="faint small">{dateTime(attempt.finishedAt)} · {Math.round((attempt.finishedAt - attempt.startedAt) / 60_000)} daqiqa</span>
          </div>
          <div className="row wrap" style={{ gap: 8, marginTop: 16 }}>
            <Link to={`/imtihon/${exam.id}/varaq/${attempt.id}`} className="btn primary sm">
              <Printer aria-hidden /> Natija varaqasi
            </Link>
            <Link to={`/imtihon/${exam.id}`} className="btn sm">
              <RotateCcw aria-hidden /> Imtihon sahifasi
            </Link>
          </div>
        </div>
      </section>

      <div className="exam-intro section">
        <section className="card pad">
          <h2 className="side-title" style={{ marginBottom: 12 }}>
            Mavzular bo'yicha
          </h2>
          <TopicBars exam={exam} attempt={attempt} />
          <h3 className="small faint" style={{ marginTop: 18, marginBottom: 8 }}>
            Amaliy topshiriqlar
          </h3>
          {attempt.practicals.map((p) => (
            <div key={p.id} className="row between small" style={{ padding: '4px 0' }}>
              <span>{exam.practicals.find((x) => x.id === p.id)?.title ?? p.id}</span>
              <b>
                {p.solved} / {p.total}
              </b>
            </div>
          ))}
        </section>
        <ReadinessCard exam={exam} />
      </div>

      <section className="section">
        <div className="row between wrap" style={{ marginBottom: 14 }}>
          <h2 className="section-title" style={{ margin: 0 }}>
            Javoblar tahlili
          </h2>
          <div className="seg" role="tablist">
            <button className={filter === 'wrong' ? 'on' : ''} onClick={() => setFilter('wrong')} role="tab" aria-selected={filter === 'wrong'}>
              Xatolar ({s.asked - s.correct})
            </button>
            <button className={filter === 'all' ? 'on' : ''} onClick={() => setFilter('all')} role="tab" aria-selected={filter === 'all'}>
              Hammasi ({s.asked})
            </button>
          </div>
        </div>
        {list.length === 0 && <p className="muted">Xato javob yo'q — barakalla!</p>}
        <div className="stack" style={{ gap: 14 }}>
          {list.map((d) => {
            const q = bank.get(d.id)!;
            const chosen = attempt.answers[d.id] ?? [];
            const ok = isCorrect(q, chosen);
            const n = attempt.questions.findIndex((x) => x.id === d.id) + 1;
            return (
              <article key={d.id} className="card pad exam-review">
                <div className="row between small faint" style={{ marginBottom: 8 }}>
                  <span>
                    {n}-savol · {exam.topics.find((t) => t.id === q.topic)?.title}
                  </span>
                  <span className={`chip ${ok ? 'ok' : chosen.length ? 'warn' : ''}`}>{ok ? "To'g'ri" : chosen.length ? "Noto'g'ri" : 'Javobsiz'}</span>
                </div>
                <Markdown text={q.text} className="prose exam-q-text" />
                <div style={{ marginTop: 12 }}>
                  {d.order.map((oi, k) => {
                    const o = q.options[oi]!;
                    const picked = chosen.includes(oi);
                    const cls = o.correct ? 'right' : picked ? 'wrong' : '';
                    return (
                      <div key={oi} className={`opt ${cls}`}>
                        <span className={`mark ${rightCount(q) > 1 ? 'sq' : ''}`}>{o.correct ? <Check strokeWidth={3} /> : picked ? <X strokeWidth={3} /> : String.fromCharCode(65 + k)}</span>
                        <span>
                          <Rich text={o.text} />
                          {picked && <span className="small faint"> — sizning javobingiz</span>}
                        </span>
                      </div>
                    );
                  })}
                </div>
                <div className="quiz-explain" style={{ '--tone': ok ? 'var(--ok)' : 'var(--danger)' } as React.CSSProperties}>
                  <b>Izoh</b>
                  <Rich text={q.explanation} />
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function TopicBars({ exam, attempt }: { exam: Exam; attempt: ExamAttempt }) {
  return (
    <div className="exam-parts" style={{ marginTop: 0 }}>
      {exam.topics
        .filter((t) => attempt.score.topics[t.id] !== undefined)
        .map((t) => {
          const v = attempt.score.topics[t.id]!;
          return (
            <div key={t.id} className={v < EXAM_RULES.pass ? 'weak' : ''}>
              <div className="row between small">
                <span>{t.title}</span>
                <b>{pct(v)}</b>
              </div>
              <Bar value={v} />
            </div>
          );
        })}
    </div>
  );
}

/* ── printable sheet ────────────────────────────────────────────── */

export function ExamSheetPage() {
  const found = useAttempt();
  const name = useSettings((s) => s.name);
  const progress = useProgress();
  const all = useExams((s) => s.attempts);
  if (!found) return <Navigate to="/imtihonlar" replace />;
  const { exam, attempt } = found;
  const s = attempt.score;
  const r = trackReadiness(exam, progress, all[exam.id] ?? []);

  return (
    <div className="page narrow">
      <div className="row between no-print" style={{ marginBottom: 16 }}>
        <Link to={`/imtihon/${exam.id}/natija/${attempt.id}`} className="btn sm ghost">
          <ArrowLeft aria-hidden /> Natijaga qaytish
        </Link>
        <button className="btn primary sm" onClick={() => window.print()}>
          <Printer aria-hidden /> Chop etish / PDF
        </button>
      </div>

      <article className="exam-sheet">
        <header className="exam-sheet-head">
          <div>
            <div className="eyebrow">KiberAkademiya · natija varaqasi</div>
            <h1>{exam.title}</h1>
          </div>
          <div className={`exam-sheet-badge ${s.passed ? 'passed' : 'failed'}`}>{s.passed ? "O'TDI" : "O'TMADI"}</div>
        </header>

        <dl className="exam-sheet-facts">
          <div>
            <dt>O'quvchi</dt>
            <dd>{name || '—'}</dd>
          </div>
          <div>
            <dt>Sana</dt>
            <dd>{dateTime(attempt.finishedAt)}</dd>
          </div>
          <div>
            <dt>Davomiyligi</dt>
            <dd>{Math.round((attempt.finishedAt - attempt.startedAt) / 60_000)} daqiqa</dd>
          </div>
          <div>
            <dt>Urinish raqami</dt>
            <dd className="mono">{attempt.id}</dd>
          </div>
        </dl>

        <div className="exam-sheet-scores">
          <div>
            <span>Umumiy ball</span>
            <b>{pct(s.total)}</b>
          </div>
          <div>
            <span>Nazariya ({s.correct}/{s.asked})</span>
            <b>{pct(s.theory)}</b>
          </div>
          <div>
            <span>Amaliyot</span>
            <b>{pct(s.practical)}</b>
          </div>
          <div>
            <span>O'tish bali</span>
            <b>{pct(EXAM_RULES.pass)}</b>
          </div>
        </div>

        <h2>Mavzular bo'yicha natija</h2>
        <table className="exam-sheet-table">
          <tbody>
            {exam.topics
              .filter((t) => s.topics[t.id] !== undefined)
              .map((t) => (
                <tr key={t.id}>
                  <td>{t.title}</td>
                  <td className="bar-cell">
                    <Bar value={s.topics[t.id]!} />
                  </td>
                  <td className="num">{pct(s.topics[t.id]!)}</td>
                </tr>
              ))}
          </tbody>
        </table>

        <h2>Amaliy qism</h2>
        <table className="exam-sheet-table">
          <tbody>
            {attempt.practicals.map((p) => (
              <tr key={p.id}>
                <td>{exam.practicals.find((x) => x.id === p.id)?.title ?? p.id}</td>
                <td className="num">
                  {p.solved} / {p.total}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <h2>Ishga tayyorlik bahosi (chop etilgan kun holatiga)</h2>
        <p>
          <b>{Math.round(r.score * 100)} / 100 — {LEVEL_TEXT[r.level].title}.</b> Darslar {r.counts.lessonsDone}/{r.counts.lessons}, lablar{' '}
          {r.counts.labsDone}/{r.counts.labs}, CTF {r.counts.ctfSolved}/{r.counts.ctf}.
        </p>

        <footer className="exam-sheet-foot">
          Bu varaqa rasmiy sertifikat emas. U KiberAkademiya o'quv dasturi ichidagi mustaqil imtihon natijasini ko'rsatadi:
          {' '}{EXAM_RULES.theoryCount} ta savol ({EXAM_RULES.theoryMinutes} daqiqa) va {EXAM_RULES.practicalCount} ta amaliy topshiriq
          ({EXAM_RULES.practicalMinutes} daqiqa), maslahatsiz. Natija o'quvchining qurilmasida saqlanadi va tashqi tomondan
          tasdiqlanmagan. Sohada tan olingan sertifikatlar uchun yo'l xaritasidagi “Sertifikatlash” mavzusiga qarang.
        </footer>
      </article>
    </div>
  );
}
