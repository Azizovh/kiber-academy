import { Link } from 'react-router-dom';
import { Award, Clock, GraduationCap, ListChecks, RotateCcw, SquareTerminal, Target } from 'lucide-react';
import { EXAMS, LEVEL_TEXT, trackReadiness } from '../content/exams';
import { TRACKS } from '../content/curriculum';
import { EXAM_RULES } from '../engine/exam';
import { useExams } from '../store/exams';
import { useProgress } from '../store/progress';
import { Ring, pct, tone } from '../components/ui';

export function ExamsPage() {
  const progress = useProgress();
  const attempts = useExams((s) => s.attempts);
  const active = useExams((s) => s.active);
  const waiting = TRACKS.filter((t) => t.id !== 'career' && !EXAMS.some((e) => e.id === t.id));

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1 className="page-title">Imtihonlar</h1>
          <p className="page-sub">
            Har yo'nalish oxirida — haqiqiy imtihon sharoitida bilimingizni tekshiring. Natija va darslar, lablar, CTF
            asosida “ishga tayyorlik” bahosi chiqariladi.
          </p>
        </div>
      </header>

      <div className="card pad exam-rules">
        <h2 className="side-title" style={{ marginBottom: 12 }}>
          Qoidalar
        </h2>
        <ul className="exam-rule-list">
          <li>
            <ListChecks aria-hidden /> <span><b>{EXAM_RULES.theoryCount} ta savol</b>, {EXAM_RULES.theoryMinutes} daqiqa — katta savollar bankidan har safar yangi to'plam</span>
          </li>
          <li>
            <SquareTerminal aria-hidden /> <span><b>{EXAM_RULES.practicalCount} ta amaliy topshiriq</b>, {EXAM_RULES.practicalMinutes} daqiqa — terminal, SIEM yoki kod, maslahatsiz</span>
          </li>
          <li>
            <Target aria-hidden /> <span>O'tish bali — <b>{pct(EXAM_RULES.pass)}</b> (nazariya {pct(EXAM_RULES.theoryWeight)}, amaliyot {pct(1 - EXAM_RULES.theoryWeight)})</span>
          </li>
          <li>
            <RotateCcw aria-hidden /> <span>Qayta topshirish — oldingi urinishdan <b>{EXAM_RULES.retakeHours} soat</b> keyin</span>
          </li>
          <li>
            <Clock aria-hidden /> <span>Vaqt to'xtamaydi: sahifani yopsangiz ham soat yuraveradi</span>
          </li>
        </ul>
      </div>

      <div className="grid c2 section" style={{ marginTop: 24 }}>
        {EXAMS.map((exam) => {
          const list = attempts[exam.id] ?? [];
          const r = trackReadiness(exam, progress, list);
          const running = active?.exam === exam.id;
          return (
            <Link key={exam.id} to={`/imtihon/${exam.id}`} className="card pad exam-card" style={tone(exam.id)}>
              <div className="row" style={{ gap: 16, alignItems: 'flex-start' }}>
                <Ring value={r.score} size={64} stroke={6} style={{ color: 'var(--tone)' }}>
                  {Math.round(r.score * 100)}
                </Ring>
                <div className="grow">
                  <div className="row wrap" style={{ gap: 8 }}>
                    <h2 className="exam-card-title">{exam.title}</h2>
                    {running && <span className="chip warn">Davom etmoqda</span>}
                    {!running && r.best?.score.passed && (
                      <span className="chip ok">
                        <Award aria-hidden /> O'tilgan
                      </span>
                    )}
                  </div>
                  <p className="small muted" style={{ marginTop: 6 }}>
                    {exam.summary}
                  </p>
                  <div className="row wrap small faint" style={{ gap: 14, marginTop: 10 }}>
                    <span>Tayyorlik: {LEVEL_TEXT[r.level].title}</span>
                    <span>{r.best ? `Eng yaxshi natija: ${pct(r.best.score.total)}` : 'Hali topshirilmagan'}</span>
                    {list.length > 0 && <span>{list.length} ta urinish</span>}
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
        {waiting.map((t) => (
          <div key={t.id} className="card pad exam-card soon" style={tone(t.id)}>
            <div className="row" style={{ gap: 16 }}>
              <span className="exam-soon-icon">
                <GraduationCap aria-hidden />
              </span>
              <div>
                <h2 className="exam-card-title">{t.title}</h2>
                <p className="small faint" style={{ marginTop: 4 }}>
                  Imtihon tayyorlanmoqda
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
