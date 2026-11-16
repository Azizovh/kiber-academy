import type { Module, SpecialityId, Stage, Topic, Track } from '../content/types';
import { addDays } from './dates';

/** Share of correct answers needed to pass a topic's quiz. */
export const PASS_SCORE = 0.8;

export interface TopicProgress {
  lessonDone?: boolean;
  /** Best quiz result so far, 0..1. */
  quizBest?: number;
  quizTries?: number;
  /** Indexes of the goals the learner has ticked. */
  goals?: number[];
}

export type ProgressMap = Record<string, TopicProgress | undefined>;
export type TopicStatus = 'new' | 'progress' | 'done';

export interface LessonInfo {
  hasLesson: boolean;
  hasQuiz: boolean;
}

export type LessonLookup = (topicId: string) => LessonInfo;

export function topicStatus(topic: Topic, p: TopicProgress | undefined, info: LessonInfo): TopicStatus {
  if (!p) return 'new';
  const ticked = p.goals?.length ?? 0;
  if (info.hasLesson) {
    const quizPassed = !info.hasQuiz || (p.quizBest ?? 0) >= PASS_SCORE;
    if (p.lessonDone && quizPassed) return 'done';
    // Passing the quiz alone closes the topic too: that is how a learner skips what they already know.
    if (info.hasQuiz && (p.quizBest ?? 0) >= PASS_SCORE) return 'done';
    return p.lessonDone || p.quizTries || ticked ? 'progress' : 'new';
  }
  if (topic.goals.length && ticked >= topic.goals.length) return 'done';
  return ticked ? 'progress' : 'new';
}

export interface Stats {
  total: number;
  done: number;
  started: number;
  minutesTotal: number;
  minutesLeft: number;
  /** 0..1, weighted by study time so long topics count for more. */
  ratio: number;
}

export function topicsOf(stage: Stage): Topic[] {
  return stage.modules.flatMap((m) => m.topics);
}

export function statsOf(topics: Topic[], progress: ProgressMap, lookup: LessonLookup): Stats {
  let done = 0;
  let started = 0;
  let minutesTotal = 0;
  let minutesLeft = 0;
  for (const topic of topics) {
    const status = topicStatus(topic, progress[topic.id], lookup(topic.id));
    minutesTotal += topic.minutes;
    if (status === 'done') done++;
    else {
      // A topic in progress is counted as half done for the time estimate.
      minutesLeft += status === 'progress' ? topic.minutes / 2 : topic.minutes;
      if (status === 'progress') started++;
    }
  }
  return {
    total: topics.length,
    done,
    started,
    minutesTotal,
    minutesLeft,
    ratio: minutesTotal ? (minutesTotal - minutesLeft) / minutesTotal : 0,
  };
}

export function stageStats(stage: Stage, progress: ProgressMap, lookup: LessonLookup): Stats {
  return statsOf(topicsOf(stage), progress, lookup);
}

/** The learner's own route: foundation, then the chosen speciality, then career. */
export function learningPath(tracks: Track[], speciality: SpecialityId | null): Stage[] {
  const pick = (id: string) => tracks.find((t) => t.id === id)?.stages ?? [];
  return [...pick('foundation'), ...(speciality ? pick(speciality) : []), ...pick('career')];
}

export interface TopicRef {
  stage: Stage;
  module: Module;
  topic: Topic;
}

export function flattenStages(stages: Stage[]): TopicRef[] {
  return stages.flatMap((stage) => stage.modules.flatMap((module) => module.topics.map((topic) => ({ stage, module, topic }))));
}

/** First unfinished topic on the path; topics already in progress win over new ones before them. */
export function nextTopic(path: Stage[], progress: ProgressMap, lookup: LessonLookup): TopicRef | null {
  const refs = flattenStages(path);
  return refs.find((r) => topicStatus(r.topic, progress[r.topic.id], lookup(r.topic.id)) !== 'done') ?? null;
}

/** Calendar days needed for `minutes` of study at the given pace. */
export function daysFor(minutes: number, dailyMinutes: number, daysPerWeek: number): number {
  if (minutes <= 0) return 0;
  const perCalendarDay = Math.max(dailyMinutes, 1) * (Math.min(Math.max(daysPerWeek, 1), 7) / 7);
  return minutes / perCalendarDay;
}

export interface ScheduleEntry {
  stage: Stage;
  stats: Stats;
  /** null when the stage is already finished. */
  finish: Date | null;
}

/** Projected finish date of every stage on the path, studying them in order. */
export function schedule(
  path: Stage[],
  progress: ProgressMap,
  lookup: LessonLookup,
  dailyMinutes: number,
  daysPerWeek: number,
  from: Date = new Date(),
): ScheduleEntry[] {
  let elapsed = 0;
  return path.map((stage) => {
    const stats = stageStats(stage, progress, lookup);
    if (stats.minutesLeft <= 0) return { stage, stats, finish: null };
    elapsed += daysFor(stats.minutesLeft, dailyMinutes, daysPerWeek);
    return { stage, stats, finish: addDays(from, Math.ceil(elapsed)) };
  });
}
