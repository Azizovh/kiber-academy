import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ProgressMap, TopicProgress } from '../engine/progress';

export interface LabProgress {
  /** The lab was finished at least once. A run itself is not saved: the shell lives in memory. */
  done: boolean;
  /** How many times it was finished. */
  runs: number;
}

export interface CtfProgress {
  solved: boolean;
  /** How many hints were opened. */
  hints: number;
}

export interface ProgressData {
  topics: ProgressMap;
  labs: Record<string, LabProgress | undefined>;
  ctf: Record<string, CtfProgress | undefined>;
}

interface ProgressStore extends ProgressData {
  patchTopic: (topicId: string, patch: Partial<TopicProgress>) => void;
  recordQuiz: (topicId: string, score: number) => void;
  toggleGoal: (topicId: string, index: number) => void;
  completeLab: (labId: string) => void;
  revealHint: (ctfId: string, count: number) => void;
  solveCtf: (ctfId: string) => void;
  reset: () => void;
}

export const PROGRESS_DEFAULTS: ProgressData = { topics: {}, labs: {}, ctf: {} };

export const useProgress = create<ProgressStore>()(
  persist(
    (set) => ({
      ...PROGRESS_DEFAULTS,
      patchTopic: (topicId, patch) =>
        set((s) => ({ topics: { ...s.topics, [topicId]: { ...s.topics[topicId], ...patch } } })),
      recordQuiz: (topicId, score) =>
        set((s) => {
          const prev = s.topics[topicId] ?? {};
          return {
            topics: {
              ...s.topics,
              [topicId]: {
                ...prev,
                quizBest: Math.max(prev.quizBest ?? 0, score),
                quizTries: (prev.quizTries ?? 0) + 1,
              },
            },
          };
        }),
      toggleGoal: (topicId, index) =>
        set((s) => {
          const prev = s.topics[topicId] ?? {};
          const goals = prev.goals ?? [];
          const next = goals.includes(index) ? goals.filter((g) => g !== index) : [...goals, index].sort((a, b) => a - b);
          return { topics: { ...s.topics, [topicId]: { ...prev, goals: next } } };
        }),
      completeLab: (labId) =>
        set((s) => ({ labs: { ...s.labs, [labId]: { done: true, runs: (s.labs[labId]?.runs ?? 0) + 1 } } })),
      revealHint: (ctfId, count) =>
        set((s) => {
          const prev = s.ctf[ctfId] ?? { solved: false, hints: 0 };
          return { ctf: { ...s.ctf, [ctfId]: { ...prev, hints: Math.max(prev.hints, count) } } };
        }),
      solveCtf: (ctfId) =>
        set((s) => {
          const prev = s.ctf[ctfId] ?? { solved: false, hints: 0 };
          return { ctf: { ...s.ctf, [ctfId]: { ...prev, solved: true } } };
        }),
      reset: () => set({ ...PROGRESS_DEFAULTS }),
    }),
    { name: 'kiberakademiya:progress', version: 1 },
  ),
);
