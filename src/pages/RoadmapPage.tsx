import { Link } from 'react-router-dom';
import { BookOpen, Briefcase, CalendarDays, Check, Cloud, Clock, Code2, Flag, Radar, Swords } from 'lucide-react';
import { Bar, Ring, pct, tone } from '../components/ui';
import { SPECIALITIES, getTrack, stageNumber } from '../content/curriculum';
import { lessonInfo } from '../content/lessons';
import type { SpecialityId, Stage } from '../content/types';
import { formatDate, formatHours } from '../engine/dates';
import { stageStats, statsOf, topicsOf } from '../engine/progress';
import { useLearning } from '../hooks/useLearning';
import { useProgress } from '../store/progress';
import { useSettings } from '../store/settings';

const TRACK_ICON: Record<SpecialityId, typeof Swords> = {
  pentest: Swords,
  soc: Radar,
  appsec: Code2,
  cloud: Cloud,
};

function StageStep({ stage, current }: { stage: Stage; current: boolean }) {
  const topics = useProgress((s) => s.topics);
  const { finishOf } = useLearning();
  const stats = stageStats(stage, topics, lessonInfo);
  const finish = finishOf(stage.id);
  const done = stats.done === stats.total;

  return (
    <div className={`path-step ${done ? 'done' : ''}`} style={tone(stage.track)}>
      <div className="path-node">
        <Ring value={stats.ratio} size={52} stroke={5}>
          {done ? <Check size={20} strokeWidth={3} style={{ color: 'var(--tone)' }} /> : stageNumber(stage)}
        </Ring>
      </div>
      <Link to={`/bosqich/${stage.id}`} className={`card stage-card ${current ? 'current' : ''}`}>
        <div className="row between wrap">
          <h3>{stage.title}</h3>
          {current && <span className="chip tone">Hozir shu yerdasiz</span>}
          {done && (
            <span className="chip ok">
              <Check /> Tugallangan
            </span>
          )}
        </div>
        <p>{stage.summary}</p>
        <Bar value={stats.ratio} />
        <div className="stage-meta">
          <span>
            <BookOpen /> {stats.done} / {stats.total} mavzu
          </span>
          <span>
            <Clock /> {formatHours(stats.minutesTotal)}
          </span>
          {finish && (
            <span>
              <CalendarDays /> taxminan {formatDate(finish)} gacha
            </span>
          )}
        </div>
      </Link>
    </div>
  );
}

export function RoadmapPage() {
  const topics = useProgress((s) => s.topics);
  const speciality = useSettings((s) => s.speciality);
  const setSettings = useSettings((s) => s.set);
  const learning = useLearning();
  const currentStageId = learning.next?.stage.id;

  const foundation = getTrack('foundation');
  const career = getTrack('career');
  const foundationStats = statsOf(foundation.stages.flatMap(topicsOf), topics, lessonInfo);

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1 className="page-title">Yo'l xaritasi</h1>
          <p className="page-sub">
            Noldan birinchi ishgacha. Tartib tavsiya etilgan, lekin hamma mavzu ochiq: bilgan narsangizni testini
            topshirib yopishingiz mumkin.
          </p>
        </div>
        <div className="row">
          <Ring value={learning.overall.ratio} size={58} stroke={6}>
            {pct(learning.overall.ratio)}
          </Ring>
          <div className="small">
            <div className="faint">Ishga tayyor bo'lish</div>
            <b>{formatDate(learning.jobReadyDate)}</b>
          </div>
        </div>
      </header>

      <section>
        <h2 className="section-title">
          1. Poydevor
          <small>
            hamma uchun majburiy · {formatHours(foundationStats.minutesTotal)} · {pct(foundationStats.ratio)} bajarildi
          </small>
        </h2>
        <div className="path">
          {foundation.stages.map((stage) => (
            <StageStep key={stage.id} stage={stage} current={stage.id === currentStageId} />
          ))}
        </div>
      </section>

      <section className="fork">
        <div className="eyebrow">2. Mutaxassislik</div>
        <h2 style={{ marginTop: 8 }}>Yo'nalishni tanlang</h2>
        <p>
          Poydevordan keyin yo'l to'rtga ayriladi. Ishga kirish uchun bittasini chuqur o'rganish kifoya. Hozir tanlash
          shart emas — poydevor oxiridagi “Yo'nalishni tanlash” mavzusida qaror qilasiz. Tanlov reja va muddatlarni
          o'zgartiradi, uni istalgan payt almashtirish mumkin.
        </p>
      </section>

      <div className="tracks">
        {SPECIALITIES.map((id) => {
          const track = getTrack(id);
          const Icon = TRACK_ICON[id];
          const stats = statsOf(track.stages.flatMap(topicsOf), topics, lessonInfo);
          const chosen = speciality === id;
          return (
            <article key={id} className={`card track-card ${chosen ? 'chosen' : ''}`} style={tone(id)}>
              <div className="row between">
                <h3>
                  <Icon /> {track.title}
                </h3>
                <span className="small faint nowrap">{formatHours(stats.minutesTotal)}</span>
              </div>
              <p className="muted small">{track.summary}</p>
              <div className="row wrap" style={{ gap: 6 }}>
                {track.jobs.map((job) => (
                  <span key={job} className="chip">
                    <Briefcase /> {job}
                  </span>
                ))}
              </div>
              <div className="track-stages">
                {track.stages.map((stage, i) => {
                  const s = stageStats(stage, topics, lessonInfo);
                  return (
                    <Link key={stage.id} to={`/bosqich/${stage.id}`} className="track-stage">
                      <b>{i + 1}</b>
                      <span>{stage.title}</span>
                      <span className="small faint">
                        {s.done}/{s.total}
                      </span>
                    </Link>
                  );
                })}
              </div>
              <div className="row between">
                <Bar value={stats.ratio} style={{ flex: 1 }} />
                <button
                  className={`btn sm ${chosen ? '' : 'primary'}`}
                  onClick={() => setSettings({ speciality: chosen ? null : id })}
                  title={chosen ? 'Tanlovni bekor qilish' : "Shu yo'nalishni mening yo'limga qo'shish"}
                >
                  {chosen ? (
                    <>
                      <Check /> Tanlangan
                    </>
                  ) : (
                    'Tanlash'
                  )}
                </button>
              </div>
            </article>
          );
        })}
      </div>

      <section className="section">
        <h2 className="section-title">
          3. Karyera <small>bilimni ishga aylantirish</small>
        </h2>
        <div className="path">
          {career.stages.map((stage) => (
            <StageStep key={stage.id} stage={stage} current={stage.id === currentStageId} />
          ))}
        </div>
        <div className="finish">
          <Flag />
          <div>
            <h3>Ishga tayyor</h3>
            <p className="muted small">
              Poydevor + bitta mutaxassislik + karyera. Hozirgi sur'atingizda — taxminan{' '}
              <b>{formatDate(learning.jobReadyDate)}</b>.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
