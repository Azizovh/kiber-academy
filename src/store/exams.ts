import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { TrackId } from '../content/types';
import type { AttemptScore, DrawnQuestion, PracticalScore } from '../engine/exam';

/** A finished attempt: what was asked, what was answered, and the score. Never changed afterwards. */
export interface ExamAttempt {
  id: string;
  exam: TrackId;
  startedAt: number;
  finishedAt: number;
  questions: DrawnQuestion[];
  answers: Record<string, number[]>;
  practicals: PracticalScore[];
  score: AttemptScore;
}

/** The attempt in progress. Kept across reloads; the timers are deadlines, so a reload does not stop the clock. */
export interface ActiveExam {
  exam: TrackId;
  startedAt: number;
  phase: 'theory' | 'practice';
  theoryEndsAt: number;
  practiceEndsAt: number | null;
  questions: DrawnQuestion[];
  practicals: string[];
  answers: Record<string, number[]>;
  /** Practical id → ids of the tasks solved. */
  solved: Record<string, string[]>;
}

export interface ExamsData {
  attempts: Record<string, ExamAttempt[] | undefined>;
  active: ActiveExam | null;
}

interface ExamsStore extends ExamsData {
  begin: (active: ActiveExam) => void;
  answer: (questionId: string, chosen: number[]) => void;
  toPractice: (endsAt: number) => void;
  solve: (practicalId: string, taskId: string) => void;
  finish: (attempt: ExamAttempt) => void;
  reset: () => void;
}

export const EXAMS_DEFAULTS: ExamsData = { attempts: {}, active: null };

export const useExams = create<ExamsStore>()(
  persist(
    (set) => ({
      ...EXAMS_DEFAULTS,
      begin: (active) => set({ active }),
      answer: (questionId, chosen) =>
        set((s) => (s.active && s.active.phase === 'theory' ? { active: { ...s.active, answers: { ...s.active.answers, [questionId]: chosen } } } : {})),
      toPractice: (endsAt) => set((s) => (s.active ? { active: { ...s.active, phase: 'practice', practiceEndsAt: endsAt } } : {})),
      solve: (practicalId, taskId) =>
        set((s) => {
          if (!s.active) return {};
          const done = s.active.solved[practicalId] ?? [];
          if (done.includes(taskId)) return {};
          return { active: { ...s.active, solved: { ...s.active.solved, [practicalId]: [...done, taskId] } } };
        }),
      finish: (attempt) =>
        set((s) => ({ active: null, attempts: { ...s.attempts, [attempt.exam]: [...(s.attempts[attempt.exam] ?? []), attempt] } })),
      reset: () => set({ ...EXAMS_DEFAULTS }),
    }),
    { name: 'kiberakademiya:exams', version: 1 },
  ),
);
