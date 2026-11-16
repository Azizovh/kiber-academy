import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowRight, FlaskConical, Info, KeyRound, Lightbulb, SquareTerminal } from 'lucide-react';
import { getLab } from '../content/labs';
import type { CalloutKind, Lesson } from '../content/types';
import { Markdown } from './Markdown';

const CALLOUT: Record<CalloutKind, { title: string; icon: typeof Info }> = {
  tip: { title: 'Maslahat', icon: Lightbulb },
  info: { title: "Bilib qo'ying", icon: Info },
  warn: { title: 'Diqqat', icon: AlertTriangle },
  key: { title: "Asosiy g'oya", icon: KeyRound },
  try: { title: "Sinab ko'ring", icon: FlaskConical },
};

export function LessonView({ lesson }: { lesson: Lesson }) {
  return (
    <article>
      {lesson.segments.map((seg, i) => {
        if (seg.type === 'md') return <Markdown key={i} text={seg.text} />;
        if (seg.type === 'callout') {
          const { title, icon: Icon } = CALLOUT[seg.kind];
          return (
            <aside key={i} className={`callout ${seg.kind}`}>
              <Icon />
              <div>
                <div className="callout-title">{title}</div>
                <Markdown text={seg.text} />
              </div>
            </aside>
          );
        }
        const lab = getLab(seg.labId);
        if (!lab) return null;
        return (
          <Link key={i} to={`/lab/${lab.id}`} className="lab-link">
            <span className="ic">
              <SquareTerminal />
            </span>
            <span>
              <small>Terminal labi · {lab.minutes} daqiqa</small>
              <strong>{lab.title}</strong>
            </span>
            <ArrowRight />
          </Link>
        );
      })}
    </article>
  );
}
