import { Link, Navigate, useParams } from 'react-router-dom';
import { BookOpenText, ChevronRight, Clock, Flag, SquareTerminal, Target } from 'lucide-react';
import { Bar, Ring, StatusDot, pct, tone } from '../components/ui';
import { getStage, getTrack, stageNumber } from '../content/curriculum';
import { lessonInfo, lessonMeta } from '../content/lessons';
import { formatDate, formatHours, formatMinutes } from '../engine/dates';
import { stageStats, topicStatus } from '../engine/progress';
import { useLearning } from '../hooks/useLearning';
import { useProgress } from '../store/progress';

export function StagePage() {
  const { stageId = '' } = useParams();
  const stage = getStage(stageId);
  const topics = useProgress((s) => s.topics);
  const learning = useLearning();

  if (!stage) return <Navigate to="/xarita" replace />;

  const track = getTrack(stage.track);
  const stats = stageStats(stage, topics, lessonInfo);
  const finish = learning.finishOf(stage.id);
  const nextId = learning.next?.topic.id;
  const withLessons = stage.modules.flatMap((m) => m.topics).filter((t) => lessonMeta(t.id)).length;

  return (
    <div className="page" style={tone(stage.track)}>
      <nav className="crumbs">
        <Link to="/xarita">Yo'l xaritasi</Link>
        <ChevronRight />
        <span>{track.title}</span>
      </nav>

      <header className="page-head">
        <div className="grow">
          <span className="chip tone">
            {track.short} · {stageNumber(stage)}-bosqich
          </span>
          <h1 className="page-title" style={{ marginTop: 10 }}>
            {stage.title}
          </h1>
          <p className="page-sub">{stage.summary}</p>
        </div>
        <Ring value={stats.ratio} size={84} stroke={7}>
          {pct(stats.ratio)}
        </Ring>
      </header>

      <div className="card pad">
        <div className="row" style={{ alignItems: 'flex-start' }}>
          <Target size={20} style={{ color: 'var(--tone)', flex: 'none', marginTop: 2 }} />
          <div className="grow">
            <b>Bosqich oxirida</b>
            <p className="muted" style={{ marginTop: 2 }}>
              {stage.outcome}
            </p>
          </div>
        </div>
        <Bar value={stats.ratio} style={{ margin: '16px 0 10px' }} />
        <div className="stage-meta">
          <span>
            <BookOpenText /> {stats.done} / {stats.total} mavzu tugallangan
          </span>
          <span>
            <Clock /> jami {formatHours(stats.minutesTotal)}, qoldi {formatHours(stats.minutesLeft)}
          </span>
          {finish && (
            <span>
              <Flag /> taxminan {formatDate(finish)} gacha
            </span>
          )}
        </div>
      </div>

      {withLessons < stats.total && (
        <div className="notice" style={{ marginTop: 16 }}>
          <BookOpenText />
          <div>
            {withLessons === 0
              ? "Bu bosqichning to'liq darslari keyingi versiyalarda qo'shiladi. Hozircha har bir mavzuda o'quv maqsadlari va tanlangan manbalar bor — shular bo'yicha mustaqil o'rganib, maqsadlarni belgilab boring."
              : `${withLessons} ta mavzuning to'liq darsi bor; qolganlari maqsad va manbalar bilan.`}
          </div>
        </div>
      )}

      {stage.modules.map((module) => (
        <section key={module.id} className="module">
          <div className="module-head">
            <h2>{module.title}</h2>
            <span className="small faint">{formatHours(module.topics.reduce((s, t) => s + t.minutes, 0))}</span>
          </div>
          <div className="card topic-list">
            {module.topics.map((topic) => {
              const status = topicStatus(topic, topics[topic.id], lessonInfo(topic.id));
              const lesson = lessonMeta(topic.id);
              return (
                <Link key={topic.id} to={`/mavzu/${topic.id}`} className={`topic-row ${topic.id === nextId ? 'next' : ''}`}>
                  <StatusDot status={status} />
                  <div className="grow">
                    <h3>{topic.title}</h3>
                    <p>{topic.summary}</p>
                  </div>
                  <div className="topic-tags">
                    {topic.id === nextId && <span className="chip ok">Keyingi</span>}
                    {lesson && (
                      <span className="chip" title="To'liq dars bor">
                        <BookOpenText /> Dars
                      </span>
                    )}
                    {!!topic.labs?.length && (
                      <span className="chip" title="Terminal labi bor">
                        <SquareTerminal /> Lab
                      </span>
                    )}
                    <span style={{ minWidth: 62, textAlign: 'right' }}>{formatMinutes(topic.minutes)}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
