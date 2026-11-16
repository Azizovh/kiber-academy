import { dayKey, parseDay, addDays } from './dates';

/** Leitner boxes: days until the next review after a correct answer. */
export const INTERVALS = [1, 2, 4, 8, 16, 32, 64];

export interface CardState {
  box: number;
  /** Day key of the next review. */
  due: string;
  reps: number;
  lapses: number;
}

export type Grade = 'again' | 'hard' | 'good';

export function newCard(today: string = dayKey()): CardState {
  return { box: 0, due: today, reps: 0, lapses: 0 };
}

export function isDue(card: CardState, today: string = dayKey()): boolean {
  return card.due <= today;
}

export function review(card: CardState, grade: Grade, today: string = dayKey()): CardState {
  const base = parseDay(today);
  if (grade === 'again') {
    return { box: 0, due: dayKey(addDays(base, 1)), reps: card.reps + 1, lapses: card.lapses + 1 };
  }
  // "hard" repeats the current interval; "good" moves the card one box up.
  const box = grade === 'good' ? Math.min(card.box + 1, INTERVALS.length) : Math.max(card.box, 1);
  const interval = INTERVALS[box - 1]!;
  return { box, due: dayKey(addDays(base, interval)), reps: card.reps + 1, lapses: card.lapses };
}

/** A card that has reached the longest intervals counts as learned. */
export function isMature(card: CardState): boolean {
  return card.box >= 5;
}
