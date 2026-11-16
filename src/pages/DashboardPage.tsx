import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CalendarCheck, CheckCircle2, Clock, Flame, Layers, PartyPopper, TrendingUp } from 'lucide-react';
import { Bar, Ring, pct, tone } from '../components/ui';
import { getTrack, stageNumber } from '../content/curriculum';
import { getLesson } from '../content/lessons';
import { addDays, dayKey, formatDate, formatMinutes, formatSpan, isActiveDay, weekdayShort } from '../engine/dates';
import { stageStats } from '../engine/progress';
import { useDueCards, useLearning, useToday } from '../hooks/useLearning';
import { lessonInfo } from '../content/lessons';
import { useProgress } from '../store/progress';
import { useSettings } from '../store/settings';

const WEEKS = 16;

function greeting(): string {
  const h = new Date().getHours();
  if (h < 5) return 'Xayrli tun';
  if (h < 11) return 'Xayrli tong';
  if (h < 18) return 'Xayrli kun';
  return 'Xayrli kech';
}

function Heatmap({ days, goalSeconds }: { days: Record<string, { seconds: number; events: number }>; goalSeconds: number }) {
  const cells = useMemo(() => {
    const today = new Date();
    // Columns are weeks starting on Monday; the last column is the current week.
    const mondayOffset = (today.getDay() + 6) % 7;
    const start = addDays(today, -(mondayOffset + (WEEKS - 1) * 7));
    return Array.from({ length: WEEKS * 7 }, (_, i) => {
      const date = addDays(start, i);
      const key = dayKey(date);
      const day = days[key];
      let level = 0;
      if (isActiveDay(day)) {
        const ratio = day!.seconds / Math.max(goalSeconds, 1);
        level = ratio >= 1 ? 3 : ratio >= 0.4 ? 2 : 1;
      }
      return { key, date, level, future: date > today, today: key === dayKey(today), minutes: Math.round((day?.seconds ?? 0) / 60) };
    });
  }, [days, goalSeconds]);

  return (
    <div className="heat" role="img" aria-label="Oxirgi haftalardagi faollik">
      {cells.map((c) => (
        <i
          key={c.key}
          data-l={c.level}
          className={`${c.future ? 'future' : ''} ${c.today ? 'today' : ''}`}
          title={`${weekdayShort(c.date)}, ${formatDate(c.date, false)} — ${c.minutes ? formatMinutes(c.minutes) : "o'qilmagan"}`}
        />
      ))}
    </div>
  );
}

export function DashboardPage() {
  const name = useSettings((s) => s.name);
  const topics = useProgress((s) => s.topics);
  const learning = useLearning();
  const today = useToday();
  const due = useDueCards();
  const { next, overall } = learning;

  const stage = next?.stage;
  const stats = stage ? stageStats(stage, topics, lessonInfo) : null;
  const lesson = next ? getLesson(next.topic.id) : null;
  const started = next ? !!topics[next.topic.id] : false;
  const remaining = Math.max(0, today.goal - today.minutes);

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <div className="eyebrow">{formatDate(new Date())}</div>
          <h1 className="page-title" style={{ marginTop: 8 }}>
            {greeting()}
            {name ? `, ${name}` : ''}
          </h1>
        </div>
      </header>

      {next && stage ? (
        <section className="hero" style={tone(stage.track)}>
          <div>
            <span className="chip tone">
              {getTrack(stage.track).short} · {stageNumber(stage)}-bosqich · {stage.title}
            </span>
            <h2>{next.topic.title}</h2>
            <p>{next.topic.summary}</p>
            <div className="hero-actions">
              <Link to={`/mavzu/${next.topic.id}`} className="btn primary lg">
                {started ? 'Davom etish' : 'Boshlash'} <ArrowRight />
              </Link>
              <span className="row small faint">
                <Clock size={14} />
                {lesson ? `Dars ~${lesson.readMinutes} daq · ` : ''}mavzu jami {formatMinutes(next.topic.minutes)}
              </span>
            </div>
          </div>
          <Ring value={stats?.ratio ?? 0} size={104} stroke={8}>
            {pct(stats?.ratio ?? 0)}
          </Ring>
        </section>
      ) : (
        <section className="hero">
          <div>
            <span className="chip ok">
              <PartyPopper /> Yo'l tugadi
            </span>
            <h2>Barcha mavzular tugallandi!</h2>
            <p>Siz tanlagan yo'ldagi hamma mavzuni yopdingiz. Endi portfolio va intervyularga e'tibor qarating.</p>
            <div className="hero-actions">
              <Link to="/intervyu" className="btn primary lg">
                Intervyu savollari <ArrowRight />
              </Link>
            </div>
          </div>
        </section>
      )}

      <section className="section grid c4">
        <div className="card stat">
          <span className="stat-label">
            <Flame /> Bugungi maqsad
          </span>
          <span className="stat-value">
            {today.minutes}
            <span className="faint" style={{ fontSize: '1rem' }}>
              {' '}
              / {today.goal} daq
            </span>
          </span>
          <Bar value={today.ratio} style={{ margin: '6px 0 4px' }} />
          <span className="stat-note">
            {today.ratio >= 1 ? 'Maqsad bajarildi — barakalla!' : `Yana ${formatMinutes(remaining)} qoldi`}
          </span>
        </div>

        <div className="card stat">
          <span className="stat-label">
            <CalendarCheck /> Ketma-ketlik
          </span>
          <span className="stat-value">{today.streak} kun</span>
          <span className="stat-note">Eng uzuni: {today.longest} kun</span>
        </div>

        <div className="card stat">
          <span className="stat-label">
            <TrendingUp /> Umumiy progress
          </span>
          <span className="stat-value">{pct(overall.ratio)}</span>
          <span className="stat-note">
            <CheckCircle2 size={12} style={{ verticalAlign: -2 }} /> {overall.done} / {overall.total} mavzu
          </span>
        </div>

        <Link to="/takrorlash" className="card stat">
          <span className="stat-label">
            <Layers /> Takrorlash
          </span>
          <span className="stat-value">{due.length}</span>
          <span className="stat-note">{due.length ? 'kartochka bugun kutmoqda →' : "bugunga kartochka yo'q"}</span>
        </Link>
      </section>

      <section className="section grid c2">
        <div className="card pad">
          <h2 className="section-title">
            Faollik <small>oxirgi {WEEKS} hafta</small>
          </h2>
          <Heatmap days={today.days} goalSeconds={today.goal * 60} />
          <p className="small faint" style={{ marginTop: 14 }}>
            To'q rang — kunlik maqsad bajarilgan kun.
          </p>
        </div>

        <div className="card pad">
          <h2 className="section-title">
            Reja <small>hozirgi sur'atda</small>
          </h2>
          <div className="stack" style={{ gap: 14 }}>
            <div className="row between">
              <span className="muted">Ishga tayyor bo'lish</span>
              <b>{formatDate(learning.jobReadyDate)}</b>
            </div>
            <div className="row between">
              <span className="muted">Qolgan o'quv vaqti</span>
              <b>
                {Math.round(learning.minutesToJob / 60)} soat · {formatSpan(learning.daysToJob)}
              </b>
            </div>
            {stage && stats && (
              <div>
                <div className="row between small" style={{ marginBottom: 6 }}>
                  <Link to={`/bosqich/${stage.id}`} className="muted">
                    Joriy bosqich: {stage.title}
                  </Link>
                  <span className="faint">
                    {stats.done} / {stats.total}
                  </span>
                </div>
                <Bar value={stats.ratio} style={tone(stage.track)} />
              </div>
            )}
            <Link to="/xarita" className="btn sm" style={{ alignSelf: 'flex-start' }}>
              Yo'l xaritasini ochish <ArrowRight />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
