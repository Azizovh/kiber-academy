import type { CardState } from './srs';
import type { DayActivity } from './dates';
import type { ProgressMap, TopicProgress } from './progress';

/**
 * Merging two copies of the learner's data (this device and the cloud).
 *
 * Every rule is "keep the furthest progress", so merging is safe to repeat:
 * merge(a, merge(a, b)) equals merge(a, b), and the order of the two sides
 * only matters for settings. Nothing a learner achieved on either device is
 * lost. The price: a deletion on one device (a cleared note) can come back
 * from the other copy; a full reset is written to the cloud separately.
 */

export interface SyncSettings {
  name: string;
  dailyMinutes: number;
  daysPerWeek: number;
  theme: string;
  speciality: string | null;
  onboarded: boolean;
  startedAt: string | null;
}

export interface SyncData {
  settings: SyncSettings;
  topics: ProgressMap;
  labs: Record<string, { done: boolean; runs: number } | undefined>;
  ctf: Record<string, { solved: boolean; hints: number } | undefined>;
  days: Record<string, DayActivity>;
  cards: Record<string, CardState | undefined>;
  notes: Record<string, { text: string; updatedAt: string } | undefined>;
}

function mergeRecords<T>(a: Record<string, T | undefined>, b: Record<string, T | undefined>, pick: (x: T, y: T) => T) {
  const out: Record<string, T | undefined> = { ...a };
  for (const [key, value] of Object.entries(b)) {
    if (value === undefined) continue;
    const mine = out[key];
    out[key] = mine === undefined ? value : pick(mine, value);
  }
  return out;
}

export function mergeTopic(a: TopicProgress, b: TopicProgress): TopicProgress {
  const out: TopicProgress = {};
  if (a.lessonDone || b.lessonDone) out.lessonDone = true;
  if (a.quizBest !== undefined || b.quizBest !== undefined) out.quizBest = Math.max(a.quizBest ?? 0, b.quizBest ?? 0);
  if (a.quizTries !== undefined || b.quizTries !== undefined) out.quizTries = Math.max(a.quizTries ?? 0, b.quizTries ?? 0);
  if (a.goals || b.goals) out.goals = [...new Set([...(a.goals ?? []), ...(b.goals ?? [])])].sort((x, y) => x - y);
  return out;
}

/** The card that has been reviewed more is the one the learner actually used. */
export function mergeCard(a: CardState, b: CardState): CardState {
  if (a.reps !== b.reps) return a.reps > b.reps ? a : b;
  return a.due >= b.due ? a : b;
}

/**
 * Settings follow the copy that finished onboarding; when both did, `primary`
 * (the cloud) wins, so a new device adopts the learner's own pace and speciality.
 */
export function mergeSettings(primary: SyncSettings, secondary: SyncSettings): SyncSettings {
  if (!primary.onboarded && secondary.onboarded) return mergeSettings(secondary, primary);
  const startedAt =
    primary.startedAt && secondary.startedAt
      ? primary.startedAt < secondary.startedAt
        ? primary.startedAt
        : secondary.startedAt
      : primary.startedAt ?? secondary.startedAt;
  return {
    ...primary,
    name: primary.name || secondary.name,
    speciality: primary.speciality ?? secondary.speciality,
    startedAt,
  };
}

export function mergeData(cloud: SyncData, local: SyncData): SyncData {
  return {
    settings: mergeSettings(cloud.settings, local.settings),
    topics: mergeRecords(cloud.topics, local.topics, mergeTopic),
    labs: mergeRecords(cloud.labs, local.labs, (a, b) => ({ done: a.done || b.done, runs: Math.max(a.runs, b.runs) })),
    ctf: mergeRecords(cloud.ctf, local.ctf, (a, b) => ({ solved: a.solved || b.solved, hints: Math.max(a.hints, b.hints) })),
    // Max, not sum: the same day may already be in both copies after an earlier merge.
    days: mergeRecords(cloud.days, local.days, (a, b) => ({
      seconds: Math.max(a.seconds, b.seconds),
      events: Math.max(a.events, b.events),
    })) as Record<string, DayActivity>,
    cards: mergeRecords(cloud.cards, local.cards, mergeCard),
    notes: mergeRecords(cloud.notes, local.notes, (a, b) => (a.updatedAt >= b.updatedAt ? a : b)),
  };
}

/** True when the copy holds nothing a learner did (a fresh install or a new account). */
export function isEmptyData(d: SyncData): boolean {
  return (
    !d.settings.onboarded &&
    [d.topics, d.labs, d.ctf, d.days, d.cards, d.notes].every((r) => Object.keys(r).length === 0)
  );
}
