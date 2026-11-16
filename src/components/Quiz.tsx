import { useMemo, useState } from 'react';
import { ArrowRight, Check, RotateCcw, Trophy, X } from 'lucide-react';
import type { QuizQuestion } from '../content/types';
import { PASS_SCORE } from '../engine/progress';
import { Bar, pct } from './ui';

function shuffle<T>(items: T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

/** Inline `code` inside a question or an option. */
function Rich({ text }: { text: string }) {
  const parts = text.split(/(`[^`]+`)/g);
  return (
    <>
      {parts.map((part, i) =>
        part.startsWith('`') && part.endsWith('`') && part.length > 2 ? <code key={i}>{part.slice(1, -1)}</code> : part,
      )}
    </>
  );
}

interface Props {
  questions: QuizQuestion[];
  /** Best result so far (0..1), shown on the start of a new attempt. */
  best?: number;
  onFinish: (score: number) => void;
  /** Rendered under the result when the quiz is passed. */
  passedAction?: React.ReactNode;
}

export function Quiz({ questions, best, onFinish, passedAction }: Props) {
  const [attempt, setAttempt] = useState(0);
  // Options are reshuffled on every attempt so answers are not memorised by position.
  const prepared = useMemo(
    () => questions.map((q) => ({ ...q, options: shuffle(q.options) })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [questions, attempt],
  );
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<number[]>([]);
  const [checked, setChecked] = useState(false);
  const [correct, setCorrect] = useState(0);
  const [score, setScore] = useState<number | null>(null);

  const restart = () => {
    setAttempt((a) => a + 1);
    setIndex(0);
    setPicked([]);
    setChecked(false);
    setCorrect(0);
    setScore(null);
  };

  if (score !== null) {
    const passed = score >= PASS_SCORE;
    return (
      <div className="card result">
        <Trophy size={40} style={{ color: passed ? 'var(--ok)' : 'var(--text-3)' }} />
        <h2>{passed ? "Test topshirildi!" : "Hali biroz qoldi"}</h2>
        <p>
          {correct} / {questions.length} to'g'ri — <b>{pct(score)}</b>.{' '}
          {passed
            ? "Mavzu o'zlashtirildi."
            : `O'tish uchun kamida ${pct(PASS_SCORE)} kerak. Darsning qiyin joylarini qayta o'qib, yana urinib ko'ring.`}
        </p>
        <div className="row wrap" style={{ justifyContent: 'center' }}>
          <button className="btn" onClick={restart}>
            <RotateCcw /> Qayta topshirish
          </button>
          {passed && passedAction}
        </div>
      </div>
    );
  }

  const q = prepared[index]!;
  const multi = q.options.filter((o) => o.correct).length > 1;
  const isRight = q.options.every((o, i) => o.correct === picked.includes(i));

  const toggle = (i: number) => {
    if (checked) return;
    setPicked((p) => (multi ? (p.includes(i) ? p.filter((x) => x !== i) : [...p, i]) : [i]));
  };

  const check = () => {
    setChecked(true);
    if (isRight) setCorrect((c) => c + 1);
  };

  const next = () => {
    if (index + 1 < prepared.length) {
      setIndex(index + 1);
      setPicked([]);
      setChecked(false);
      return;
    }
    const final = correct / questions.length;
    setScore(final);
    onFinish(final);
  };

  return (
    <div className="quiz">
      <div className="quiz-top">
        <span>
          {index + 1} / {prepared.length}
        </span>
        <Bar value={(index + (checked ? 1 : 0)) / prepared.length} />
        {best !== undefined && best > 0 && <span>Eng yaxshi: {pct(best)}</span>}
      </div>

      <div className="quiz-q">
        <Rich text={q.text} />
      </div>
      {multi && <div className="quiz-hint">Bir nechta to'g'ri javob bor — hammasini belgilang.</div>}

      <div>
        {q.options.map((o, i) => {
          const isPicked = picked.includes(i);
          let cls = 'opt';
          if (checked) {
            if (o.correct) cls += ' right';
            else if (isPicked) cls += ' wrong';
          } else if (isPicked) cls += ' picked';
          return (
            <button key={`${attempt}-${index}-${i}`} className={cls} onClick={() => toggle(i)} disabled={checked}>
              <span className={`mark ${multi ? 'sq' : ''}`}>
                {checked && o.correct ? <Check strokeWidth={3} /> : checked && isPicked ? <X strokeWidth={3} /> : String.fromCharCode(65 + i)}
              </span>
              <span>
                <Rich text={o.text} />
              </span>
            </button>
          );
        })}
      </div>

      {checked && (
        <div className="quiz-explain" style={{ '--tone': isRight ? 'var(--ok)' : 'var(--danger)' } as React.CSSProperties}>
          <b>{isRight ? "To'g'ri!" : "Noto'g'ri"}</b>
          {q.explanation && <Rich text={q.explanation} />}
        </div>
      )}

      <div className="quiz-actions">
        {checked ? (
          <button className="btn primary" onClick={next} autoFocus>
            {index + 1 < prepared.length ? 'Keyingi savol' : 'Natijani ko\'rish'} <ArrowRight />
          </button>
        ) : (
          <button className="btn primary" onClick={check} disabled={!picked.length}>
            Tekshirish
          </button>
        )}
      </div>
    </div>
  );
}
