import { useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, BookOpenCheck, Map, SquareTerminal, Target } from 'lucide-react';
import { Brand } from '../components/Layout';
import { TRACKS, getTrack } from '../content/curriculum';
import { addDays, dayKey, formatHours, formatMonthYear, formatSpan } from '../engine/dates';
import { daysFor, topicsOf } from '../engine/progress';
import { DAILY_OPTIONS, WEEK_OPTIONS, useSettings } from '../store/settings';

function minutesOf(trackId: 'foundation' | 'pentest' | 'career'): number {
  return getTrack(trackId).stages.flatMap(topicsOf).reduce((sum, t) => sum + t.minutes, 0);
}

export function dailyLabel(minutes: number): string {
  return minutes < 60 ? `${minutes} daqiqa` : `${minutes / 60} soat`;
}

/** Live preview of how long the whole route takes at a given pace. */
export function PaceEstimate({ dailyMinutes, daysPerWeek }: { dailyMinutes: number; daysPerWeek: number }) {
  const data = useMemo(() => {
    const foundation = minutesOf('foundation');
    const total = foundation + minutesOf('pentest') + minutesOf('career');
    const fDays = daysFor(foundation, dailyMinutes, daysPerWeek);
    const tDays = daysFor(total, dailyMinutes, daysPerWeek);
    return { foundation, total, fDays, tDays };
  }, [dailyMinutes, daysPerWeek]);

  return (
    <div className="estimate">
      <div>
        <small>Poydevor ({formatHours(data.foundation)})</small>
        <b>{formatSpan(data.fDays)}</b>
      </div>
      <div>
        <small>Ishga tayyor ({formatHours(data.total)})</small>
        <b>{formatSpan(data.tDays)}</b>
      </div>
      <div>
        <small>Taxminiy tugash</small>
        <b>{formatMonthYear(addDays(new Date(), Math.ceil(data.tDays)))}</b>
      </div>
    </div>
  );
}

export function OnboardingPage() {
  const save = useSettings((s) => s.set);
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [dailyMinutes, setDaily] = useState(60);
  const [daysPerWeek, setDays] = useState(6);

  const topicCount = useMemo(() => TRACKS.flatMap((t) => t.stages).flatMap(topicsOf).length, []);

  const finish = () => {
    save({ name: name.trim(), dailyMinutes, daysPerWeek, onboarded: true, startedAt: dayKey() });
  };

  return (
    <div className="onb">
      <div className="card onb-card">
        <div className="row between">
          <Brand />
          <div className="onb-steps" aria-hidden>
            {[0, 1, 2].map((i) => (
              <i key={i} className={i <= step ? 'on' : ''} />
            ))}
          </div>
        </div>

        {step === 0 && (
          <>
            <h1>Noldan kiberxavfsizlik mutaxassisigacha</h1>
            <p className="muted">
              Bu dastur sizni kompyuter asoslaridan birinchi ishgacha bo'lgan yo'ldan olib o'tadi. Hech qanday
              boshlang'ich bilim shart emas — faqat muntazamlik kerak.
            </p>
            <ul className="onb-list">
              <li>
                <span>
                  <Map />
                </span>
                <div>
                  <strong>Aniq yo'l xaritasi</strong>
                  <small>{topicCount} ta mavzu: poydevor, 4 ta mutaxassislik va karyera. Keyingi qadam doim ma'lum.</small>
                </div>
              </li>
              <li>
                <span>
                  <BookOpenCheck />
                </span>
                <div>
                  <strong>Dars, test va takrorlash</strong>
                  <small>O'zbek tilidagi tushuntirish, bilimni tekshirish va unutmaslik uchun kartochkalar.</small>
                </div>
              </li>
              <li>
                <span>
                  <SquareTerminal />
                </span>
                <div>
                  <strong>Haqiqiy amaliyot</strong>
                  <small>Dastur ichidagi Linux terminali, CTF topshiriqlari va eng yaxshi tashqi laboratoriyalar.</small>
                </div>
              </li>
              <li>
                <span>
                  <Target />
                </span>
                <div>
                  <strong>Kunlik maqsad</strong>
                  <small>O'zingiz tanlagan sur'atda. Dastur qachon tugatishingizni hisoblab boradi.</small>
                </div>
              </li>
            </ul>
            <div className="row" style={{ justifyContent: 'flex-end' }}>
              <button className="btn primary lg" onClick={() => setStep(1)} autoFocus>
                Boshlash <ArrowRight />
              </button>
            </div>
          </>
        )}

        {step === 1 && (
          <>
            <h1>Tanishib olaylik</h1>
            <p className="muted">Ismingiz faqat shu kompyuterda saqlanadi.</p>
            <div className="field" style={{ margin: '24px 0' }}>
              <label htmlFor="name">Ismingiz</label>
              <input
                id="name"
                className="input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && setStep(2)}
                placeholder="Masalan: Dilshod"
                maxLength={40}
                autoFocus
              />
            </div>
            <div className="row between">
              <button className="btn ghost" onClick={() => setStep(0)}>
                <ArrowLeft /> Orqaga
              </button>
              <button className="btn primary lg" onClick={() => setStep(2)}>
                Davom etish <ArrowRight />
              </button>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <h1>Qanday sur'atda o'qiysiz?</h1>
            <p className="muted">
              Rostgo'y bo'ling: har kuni 1 soat — haftada bir marta 7 soatdan ancha samarali. Buni keyin istalgan
              payt o'zgartirish mumkin.
            </p>
            <div className="stack" style={{ margin: '24px 0', gap: 20 }}>
              <div className="field">
                <label>Kuniga qancha vaqt?</label>
                <div className="seg">
                  {DAILY_OPTIONS.map((m) => (
                    <button key={m} className={m === dailyMinutes ? 'on' : ''} onClick={() => setDaily(m)}>
                      {dailyLabel(m)}
                    </button>
                  ))}
                </div>
              </div>
              <div className="field">
                <label>Haftada necha kun?</label>
                <div className="seg">
                  {WEEK_OPTIONS.map((d) => (
                    <button key={d} className={d === daysPerWeek ? 'on' : ''} onClick={() => setDays(d)}>
                      {d} kun
                    </button>
                  ))}
                </div>
              </div>
              <PaceEstimate dailyMinutes={dailyMinutes} daysPerWeek={daysPerWeek} />
            </div>
            <div className="row between">
              <button className="btn ghost" onClick={() => setStep(1)}>
                <ArrowLeft /> Orqaga
              </button>
              <button className="btn primary lg" onClick={finish}>
                O'qishni boshlash <ArrowRight />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
