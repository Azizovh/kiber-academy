import { useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import {
  ArrowRight,
  Book,
  BookOpenText,
  BookText,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  ExternalLink,
  FileText,
  Flag,
  FlaskConical,
  GraduationCap,
  Hammer,
  ListChecks,
  NotebookPen,
  PlayCircle,
  SquareTerminal,
  Wrench,
} from 'lucide-react';
import { LessonView } from '../components/LessonView';
import { Quiz } from '../components/Quiz';
import { StatusDot, pct, tone } from '../components/ui';
import { getCtf } from '../content/ctf';
import { getTopicRef, getTrack, neighbours, stageNumber } from '../content/curriculum';
import { getLab } from '../content/labs';
import { lessonInfo, lessonMeta, useLesson } from '../content/lessons';
import type { ResourceKind } from '../content/types';
import { formatMinutes } from '../engine/dates';
import { PASS_SCORE, topicStatus, type TopicRef } from '../engine/progress';
import { useStudyTimer } from '../hooks/useStudyTimer';
import { useActivity } from '../store/activity';
import { useCards } from '../store/cards';
import { useNotes } from '../store/notes';
import { useProgress } from '../store/progress';

const KIND: Record<ResourceKind, { label: string; icon: typeof Book }> = {
  video: { label: 'Video', icon: PlayCircle },
  course: { label: 'Kurs', icon: GraduationCap },
  article: { label: 'Maqola', icon: FileText },
  docs: { label: 'Hujjat', icon: BookText },
  lab: { label: 'Amaliy lab', icon: FlaskConical },
  book: { label: 'Kitob', icon: Book },
  tool: { label: 'Vosita', icon: Wrench },
};

type Tab = 'dars' | 'test' | 'manbalar';

export function TopicPage() {
  const { topicId = '' } = useParams();
  const ref = getTopicRef(topicId);
  if (!ref) return <Navigate to="/xarita" replace />;
  // Keyed so every piece of page state resets when moving to another topic.
  return <TopicView key={topicId} topicRef={ref} />;
}

function TopicView({ topicRef }: { topicRef: TopicRef }) {
  useStudyTimer();
  const { stage, module, topic } = topicRef;
  const loaded = useLesson(topic.id);
  const lesson = loaded.lesson;
  const meta = lessonMeta(topic.id);
  const info = lessonInfo(topic.id);

  const progress = useProgress((s) => s.topics[topic.id]);
  const labsDone = useProgress((s) => s.labs);
  const ctfDone = useProgress((s) => s.ctf);
  const patchTopic = useProgress((s) => s.patchTopic);
  const recordQuiz = useProgress((s) => s.recordQuiz);
  const toggleGoal = useProgress((s) => s.toggleGoal);
  const addEvent = useActivity((s) => s.addEvent);
  const unlock = useCards((s) => s.unlock);
  const note = useNotes((s) => s.notes[topic.id]?.text ?? '');
  const setNote = useNotes((s) => s.setNote);

  const [tab, setTab] = useState<Tab>(meta ? 'dars' : 'manbalar');
  const status = topicStatus(topic, progress, info);
  const { prev, next } = neighbours(topic.id);
  const track = getTrack(stage.track);
  const ticked = progress?.goals ?? [];

  // Remember that the topic was opened, so "Bugun" offers to continue it.
  useEffect(() => {
    if (!useProgress.getState().topics[topic.id]) patchTopic(topic.id, {});
  }, [topic.id, patchTopic]);

  const go = (t: Tab) => {
    setTab(t);
    window.scrollTo({ top: 0 });
  };

  const finishLesson = () => {
    if (!lesson) return;
    if (!progress?.lessonDone) {
      patchTopic(topic.id, { lessonDone: true });
      unlock(lesson.cards.map((c) => c.id));
      addEvent();
    }
    if (info.hasQuiz) go('test');
  };

  const finishQuiz = (score: number) => {
    recordQuiz(topic.id, score);
    addEvent();
    if (score >= PASS_SCORE && lesson && !progress?.lessonDone) {
      // Passing without reading still closes the topic and queues its cards for review.
      patchTopic(topic.id, { lessonDone: true });
      unlock(lesson.cards.map((c) => c.id));
    }
  };

  const onGoal = (index: number) => {
    if (!ticked.includes(index)) addEvent();
    toggleGoal(topic.id, index);
  };

  const nextLink = next && (
    <Link to={`/mavzu/${next.topic.id}`} className="btn primary">
      Keyingi mavzu <ArrowRight />
    </Link>
  );

  return (
    <div className="page" style={tone(stage.track)}>
      <nav className="crumbs">
        <Link to="/xarita">Yo'l xaritasi</Link>
        <ChevronRight />
        <Link to={`/bosqich/${stage.id}`}>
          {track.short} · {stageNumber(stage)}. {stage.title}
        </Link>
        <ChevronRight />
        <span>{module.title}</span>
      </nav>

      <header style={{ marginBottom: 24 }}>
        <h1 className="page-title">{topic.title}</h1>
        <p className="page-sub">{topic.summary}</p>
        <div className="row wrap" style={{ marginTop: 14, gap: 8 }}>
          <span className={`chip ${status === 'done' ? 'ok' : status === 'progress' ? 'warn' : ''}`}>
            <StatusDot status={status} />
            {status === 'done' ? 'Tugallangan' : status === 'progress' ? 'Jarayonda' : 'Boshlanmagan'}
          </span>
          <span className="chip" title="Dars, mashq va tashqi manbalar bilan birga">
            <Clock /> jami {formatMinutes(topic.minutes)}
          </span>
          {meta && (
            <span className="chip">
              <BookOpenText /> dars ~{meta.readMinutes} daq
            </span>
          )}
          {progress?.quizBest !== undefined && (
            <span className="chip">
              <ListChecks /> test: {pct(progress.quizBest)}
            </span>
          )}
        </div>
      </header>

      <div className="topic-layout">
        <div>
          {meta && (
            <div className="tabs" style={{ marginBottom: 28 }}>
              <button className={`tab ${tab === 'dars' ? 'active' : ''}`} onClick={() => setTab('dars')}>
                <BookOpenText /> Dars
              </button>
              {info.hasQuiz && (
                <button className={`tab ${tab === 'test' ? 'active' : ''}`} onClick={() => setTab('test')}>
                  <ListChecks /> Test · {meta.quiz}
                </button>
              )}
              <button className={`tab ${tab === 'manbalar' ? 'active' : ''}`} onClick={() => setTab('manbalar')}>
                <Hammer /> Amaliyot va manbalar
              </button>
            </div>
          )}

          {(tab === 'dars' || tab === 'test') && meta && !lesson && (
            <LessonPending status={loaded.status} onRetry={loaded.retry} />
          )}

          {tab === 'dars' && lesson && (
            <>
              <LessonView lesson={lesson} />
              <div className="lesson-end">
                <div>
                  <b>{progress?.lessonDone ? "Dars o'qilgan" : 'Darsni tugatdingizmi?'}</b>
                  <p className="muted small">
                    {info.hasQuiz
                      ? `Endi ${lesson.quiz.length} ta savolli test bilan bilimingizni tekshiring. O'tish chegarasi — ${pct(PASS_SCORE)}.`
                      : "Darsni tugallangan deb belgilang."}
                    {!progress?.lessonDone && lesson.cards.length > 0 && ` ${lesson.cards.length} ta kartochka takrorlashga qo'shiladi.`}
                  </p>
                </div>
                <button className="btn primary lg" onClick={finishLesson}>
                  {info.hasQuiz ? 'Testga o\'tish' : 'Tugatdim'} <ArrowRight />
                </button>
              </div>
            </>
          )}

          {tab === 'test' && lesson && (
            <Quiz questions={lesson.quiz} best={progress?.quizBest} onFinish={finishQuiz} passedAction={nextLink} />
          )}

          {tab === 'manbalar' && (
            <div className="stack" style={{ gap: 28 }}>
              {!meta && (
                <div className="notice">
                  <BookOpenText />
                  <div>
                    <b>Bu mavzuning to'liq darsi hali yozilmagan.</b> Hozircha yo'l xaritasi rejimida o'rganing: o'ngdagi
                    maqsadlar — nimani bilishingiz kerakligi, quyidagi manbalar — qayerdan o'rganish. Har bir maqsadga
                    erishgach, uni belgilang; hammasi belgilansa, mavzu yopiladi.
                  </div>
                </div>
              )}

              {(!!topic.labs?.length || !!topic.ctf?.length) && (
                <section>
                  <h2 className="section-title">Dastur ichidagi amaliyot</h2>
                  <div className="card" style={{ overflow: 'hidden' }}>
                    {topic.labs?.map((id) => {
                      const lab = getLab(id);
                      if (!lab) return null;
                      return (
                        <Link key={id} to={`/lab/${id}`} className="res">
                          <span className="res-icon">
                            <SquareTerminal />
                          </span>
                          <span>
                            <strong>{lab.title}</strong>
                            <small>
                              Terminal labi · {lab.minutes} daq · {lab.tasks.length} topshiriq
                            </small>
                          </span>
                          {labsDone[id]?.done ? <CheckCircle2 style={{ color: 'var(--ok)' }} /> : <ArrowRight />}
                        </Link>
                      );
                    })}
                    {topic.ctf?.map((id) => {
                      const ch = getCtf(id);
                      if (!ch) return null;
                      return (
                        <Link key={id} to={`/ctf/${id}`} className="res">
                          <span className="res-icon">
                            <Flag />
                          </span>
                          <span>
                            <strong>{ch.title}</strong>
                            <small>CTF topshirig'i</small>
                          </span>
                          {ctfDone[id]?.solved ? <CheckCircle2 style={{ color: 'var(--ok)' }} /> : <ArrowRight />}
                        </Link>
                      );
                    })}
                  </div>
                </section>
              )}

              <section>
                <h2 className="section-title">
                  Tashqi manbalar <small>tanlangan, asosan bepul va ingliz tilida</small>
                </h2>
                <div className="card" style={{ overflow: 'hidden' }}>
                  {topic.resources.map((res) => {
                    const { label, icon: Icon } = KIND[res.kind];
                    return (
                      <a key={res.url + res.title} href={res.url} target="_blank" rel="noreferrer" className="res">
                        <span className="res-icon">
                          <Icon />
                        </span>
                        <span>
                          <strong>{res.title}</strong>
                          <small>
                            {label}
                            {res.note ? ` · ${res.note}` : ''}
                          </small>
                        </span>
                        <ExternalLink />
                      </a>
                    );
                  })}
                </div>
              </section>
            </div>
          )}

          {status === 'done' && tab !== 'test' && (
            <div className="notice ok" style={{ marginTop: 28 }}>
              <CheckCircle2 />
              <div className="row between wrap">
                <span>
                  <b>Mavzu tugallangan.</b> Davom etamizmi?
                </span>
                {nextLink}
              </div>
            </div>
          )}

          <nav className="pager">
            {prev ? (
              <Link to={`/mavzu/${prev.topic.id}`}>
                <small>← Oldingi</small>
                <strong>{prev.topic.title}</strong>
              </Link>
            ) : (
              <span />
            )}
            {next && (
              <Link to={`/mavzu/${next.topic.id}`} className="next">
                <small>Keyingi →</small>
                <strong>{next.topic.title}</strong>
              </Link>
            )}
          </nav>
        </div>

        <aside className="topic-aside">
          <div className="card pad">
            <h2 className="aside-title">
              <ListChecks /> Maqsadlar
              <span className="faint small" style={{ marginLeft: 'auto', fontFamily: 'var(--font-body)', fontWeight: 400 }}>
                {ticked.length} / {topic.goals.length}
              </span>
            </h2>
            {topic.goals.map((goal, i) => (
              <button key={i} className={`goal ${ticked.includes(i) ? 'on' : ''}`} onClick={() => onGoal(i)}>
                <span className="box">
                  <Check strokeWidth={3.5} />
                </span>
                {goal}
              </button>
            ))}
            <p className="small faint" style={{ marginTop: 10 }}>
              {meta
                ? "O'zingizni tekshiring: har birini rostdan ham qila olasizmi?"
                : 'Hammasini belgilasangiz, mavzu tugallangan hisoblanadi.'}
            </p>
          </div>

          <div className="card pad">
            <h2 className="aside-title">
              <NotebookPen /> Mening qaydim
            </h2>
            <textarea
              className="textarea"
              aria-label="Mening qaydim"
              value={note}
              onChange={(e) => setNote(topic.id, e.target.value)}
              placeholder="O'z so'zlaringiz bilan yozing — shunda yaxshiroq eslab qolasiz…"
              rows={6}
            />
            <p className="small faint" style={{ marginTop: 8 }}>
              Avtomatik saqlanadi.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}

/** Shown while a lesson chunk is downloading, or when it could not be fetched (offline, or a newer deploy). */
function LessonPending({ status, onRetry }: { status: string; onRetry: () => void }) {
  if (status === 'error') {
    return (
      <div className="notice">
        <BookOpenText />
        <div className="row between wrap">
          <span>
            <b>Darsni yuklab bo'lmadi.</b> Internet aloqasini tekshiring. Sayt yangilangan bo'lsa, sahifani qayta yuklang.
          </span>
          <span className="row" style={{ gap: 8 }}>
            <button className="btn sm" onClick={onRetry}>
              Qayta urinish
            </button>
            <button className="btn sm ghost" onClick={() => window.location.reload()}>
              Sahifani yangilash
            </button>
          </span>
        </div>
      </div>
    );
  }
  return (
    <div className="lesson-skeleton" aria-busy="true" aria-label="Dars yuklanmoqda">
      <i style={{ width: '62%' }} />
      <i />
      <i />
      <i style={{ width: '84%' }} />
      <i style={{ width: '40%', marginTop: 28 }} />
      <i />
      <i style={{ width: '90%' }} />
    </div>
  );
}
