import type { CSSProperties, ReactNode } from 'react';
import { Check } from 'lucide-react';
import type { TrackId } from '../content/types';
import type { TopicStatus } from '../engine/progress';

export const TRACK_TONE: Record<TrackId, string> = {
  foundation: 'var(--t-foundation)',
  pentest: 'var(--t-pentest)',
  soc: 'var(--t-soc)',
  appsec: 'var(--t-appsec)',
  cloud: 'var(--t-cloud)',
  career: 'var(--t-career)',
};

/** Inline style that sets the --tone custom property used by tinted components. */
export function tone(track: TrackId): CSSProperties {
  return { '--tone': TRACK_TONE[track] } as CSSProperties;
}

export function Ring({
  value,
  size = 44,
  stroke = 4,
  children,
  style,
}: {
  /** 0..1 */
  value: number;
  size?: number;
  stroke?: number;
  children?: ReactNode;
  style?: CSSProperties;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.min(Math.max(value, 0), 1);
  return (
    <span className="ring" style={{ width: size, height: size, ...style }}>
      <svg width={size} height={size} aria-hidden>
        <circle className="track" cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke} />
        <circle
          className="value"
          cx={size / 2}
          cy={size / 2}
          r={r}
          strokeWidth={stroke}
          strokeDasharray={c}
          strokeDashoffset={c * (1 - clamped)}
        />
      </svg>
      {children !== undefined && (
        <span className="ring-label" style={{ fontSize: size * 0.28 }}>
          {children}
        </span>
      )}
    </span>
  );
}

export function Bar({ value, style }: { value: number; style?: CSSProperties }) {
  const pct = Math.round(Math.min(Math.max(value, 0), 1) * 100);
  return (
    <div className="bar" style={style} role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
      <i style={{ width: `${pct}%` }} />
    </div>
  );
}

const STATUS_LABEL: Record<TopicStatus, string> = {
  new: 'Boshlanmagan',
  progress: 'Jarayonda',
  done: 'Tugallangan',
};

export function StatusDot({ status }: { status: TopicStatus }) {
  return (
    <span className={`status-dot ${status}`} title={STATUS_LABEL[status]} aria-label={STATUS_LABEL[status]}>
      {status === 'done' && <Check strokeWidth={3} />}
    </span>
  );
}

export function Level({ level }: { level: 1 | 2 | 3 }) {
  const label = ['Oson', "O'rta", 'Qiyin'][level - 1];
  return (
    <span className="chip" title={`Daraja: ${label}`}>
      <span className="level">
        {[1, 2, 3].map((n) => (
          <i key={n} className={n <= level ? 'on' : ''} />
        ))}
      </span>
      {label}
    </span>
  );
}

export function pct(value: number): string {
  return `${Math.round(value * 100)}%`;
}
