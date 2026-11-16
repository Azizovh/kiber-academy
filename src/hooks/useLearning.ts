import { useMemo } from 'react';
import { SPECIALITIES, TRACKS, getTrack } from '../content/curriculum';
import { lessonInfo } from '../content/lessons';
import { addDays, dayKey, longestStreak, streak } from '../engine/dates';
import { daysFor, learningPath, nextTopic, schedule, statsOf, topicsOf } from '../engine/progress';
import { isDue } from '../engine/srs';
import { useActivity } from '../store/activity';
import { useCards } from '../store/cards';
import { useProgress } from '../store/progress';
import { useSettings } from '../store/settings';

/** Average size of a speciality, used for estimates before one is chosen. */
const AVERAGE_TRACK_MINUTES =
  SPECIALITIES.reduce((sum, id) => sum + getTrack(id).stages.flatMap(topicsOf).reduce((s, t) => s + t.minutes, 0), 0) /
  SPECIALITIES.length;

/** Everything derived from the learner's route: stats, schedule, next topic. */
export function useLearning() {
  const topics = useProgress((s) => s.topics);
  const speciality = useSettings((s) => s.speciality);
  const dailyMinutes = useSettings((s) => s.dailyMinutes);
  const daysPerWeek = useSettings((s) => s.daysPerWeek);

  return useMemo(() => {
    const path = learningPath(TRACKS, speciality);
    const plan = schedule(path, topics, lessonInfo, dailyMinutes, daysPerWeek);
    const overall = statsOf(path.flatMap(topicsOf), topics, lessonInfo);
    // Until a speciality is picked, an average one is assumed for the "job ready" date.
    const minutesToJob = overall.minutesLeft + (speciality ? 0 : AVERAGE_TRACK_MINUTES);
    const daysToJob = daysFor(minutesToJob, dailyMinutes, daysPerWeek);
    return {
      path,
      plan,
      overall,
      next: nextTopic(path, topics, lessonInfo),
      minutesToJob,
      daysToJob,
      jobReadyDate: addDays(new Date(), Math.ceil(daysToJob)),
      finishOf: (stageId: string) => plan.find((p) => p.stage.id === stageId)?.finish ?? null,
    };
  }, [topics, speciality, dailyMinutes, daysPerWeek]);
}

/** Ids of the flashcards due today, oldest due date first. */
export function useDueCards(): string[] {
  const cards = useCards((s) => s.cards);
  return useMemo(() => {
    const today = dayKey();
    return Object.entries(cards)
      .filter(([, card]) => card && isDue(card, today))
      .sort(([, a], [, b]) => a!.due.localeCompare(b!.due))
      .map(([id]) => id);
  }, [cards]);
}

export function useToday() {
  const days = useActivity((s) => s.days);
  const dailyMinutes = useSettings((s) => s.dailyMinutes);
  return useMemo(() => {
    const today = days[dayKey()];
    const minutes = Math.floor((today?.seconds ?? 0) / 60);
    return {
      minutes,
      goal: dailyMinutes,
      ratio: dailyMinutes ? Math.min(1, minutes / dailyMinutes) : 0,
      streak: streak(days),
      longest: longestStreak(days),
      days,
    };
  }, [days, dailyMinutes]);
}
