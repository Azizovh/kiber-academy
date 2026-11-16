/** Local-time day key: YYYY-MM-DD. */
export function dayKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function parseDay(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y!, m! - 1, d!);
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function shiftDay(key: string, days: number): string {
  return dayKey(addDays(parseDay(key), days));
}

export interface DayActivity {
  seconds: number;
  events: number;
}

export function isActiveDay(day: DayActivity | undefined): boolean {
  return !!day && (day.events > 0 || day.seconds >= 60);
}

/**
 * Consecutive active days ending today — or yesterday, so the streak is not
 * shown as broken before the learner has had a chance to study today.
 */
export function streak(days: Record<string, DayActivity>, today: string = dayKey()): number {
  let cursor = isActiveDay(days[today]) ? today : shiftDay(today, -1);
  let count = 0;
  while (isActiveDay(days[cursor])) {
    count++;
    cursor = shiftDay(cursor, -1);
  }
  return count;
}

export function longestStreak(days: Record<string, DayActivity>): number {
  const keys = Object.keys(days).filter((k) => isActiveDay(days[k])).sort();
  let best = 0;
  let run = 0;
  let prev = '';
  for (const key of keys) {
    run = prev && shiftDay(prev, 1) === key ? run + 1 : 1;
    best = Math.max(best, run);
    prev = key;
  }
  return best;
}

const MONTHS = ['yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun', 'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr'];
const WEEKDAYS = ['Yak', 'Du', 'Se', 'Chor', 'Pay', 'Ju', 'Sha'];

export function formatDate(date: Date, withYear = true): string {
  const base = `${date.getDate()}-${MONTHS[date.getMonth()]}`;
  return withYear ? `${base} ${date.getFullYear()}` : base;
}

export function formatMonthYear(date: Date): string {
  return `${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

export function weekdayShort(date: Date): string {
  return WEEKDAYS[date.getDay()]!;
}

/** 95 → "1 soat 35 daq", 40 → "40 daq", 600 → "10 soat". */
export function formatMinutes(minutes: number): string {
  const total = Math.round(minutes);
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (!h) return `${m} daq`;
  if (!m) return `${h} soat`;
  return `${h} soat ${m} daq`;
}

/** Rounded hours for large amounts: 3540 → "59 soat". */
export function formatHours(minutes: number): string {
  if (minutes < 60) return `${Math.round(minutes)} daq`;
  return `${Math.round(minutes / 60)} soat`;
}

/** "3 hafta", "5 oy", "1 yil 2 oy" — a human-sized span for a number of days. */
export function formatSpan(days: number): string {
  if (days <= 0) return 'bugun';
  if (days < 14) return `${Math.ceil(days)} kun`;
  if (days < 60) return `${Math.round(days / 7)} hafta`;
  const months = Math.round(days / 30.4);
  if (months < 12) return `${months} oy`;
  const years = Math.floor(months / 12);
  const rest = months % 12;
  return rest ? `${years} yil ${rest} oy` : `${years} yil`;
}
