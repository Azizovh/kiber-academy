import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { dayKey, type DayActivity } from '../engine/dates';

export interface ActivityData {
  days: Record<string, DayActivity>;
}

interface ActivityStore extends ActivityData {
  /** Add active study time to today. */
  addSeconds: (seconds: number) => void;
  /** Count one finished learning action (lesson, quiz, lab task, review, flag). */
  addEvent: () => void;
  reset: () => void;
}

function bump(days: Record<string, DayActivity>, seconds: number, events: number): Record<string, DayActivity> {
  const key = dayKey();
  const today = days[key] ?? { seconds: 0, events: 0 };
  return { ...days, [key]: { seconds: today.seconds + seconds, events: today.events + events } };
}

export const useActivity = create<ActivityStore>()(
  persist(
    (set) => ({
      days: {},
      addSeconds: (seconds) => set((s) => ({ days: bump(s.days, seconds, 0) })),
      addEvent: () => set((s) => ({ days: bump(s.days, 0, 1) })),
      reset: () => set({ days: {} }),
    }),
    { name: 'kiberakademiya:activity', version: 1 },
  ),
);
