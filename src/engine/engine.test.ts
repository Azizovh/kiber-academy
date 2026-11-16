import { describe, expect, it } from 'vitest';
import type { Stage, Topic, Track } from '../content/types';
import { formatMinutes, formatSpan, longestStreak, shiftDay, streak } from './dates';
import { checkFlag, flagHash } from './hash';
import {
  daysFor,
  learningPath,
  nextTopic,
  schedule,
  stageStats,
  topicStatus,
  type LessonLookup,
  type ProgressMap,
} from './progress';
import { INTERVALS, isDue, isMature, newCard, review } from './srs';

const topic = (id: string, minutes = 60, goals = ['a', 'b']): Topic => ({
  id,
  title: id,
  summary: '',
  minutes,
  goals,
  resources: [],
});

const stage = (id: string, track: Stage['track'], topics: Topic[]): Stage => ({
  id,
  track,
  title: id,
  summary: '',
  outcome: '',
  modules: [{ id: `${id}-m`, title: 'm', topics }],
});

/** Topics whose id starts with "l" have a lesson with a quiz. */
const lookup: LessonLookup = (id) => ({ hasLesson: id.startsWith('l'), hasQuiz: id.startsWith('l') });

describe('topicStatus', () => {
  it('a lesson topic is done once its quiz is passed', () => {
    const t = topic('l1');
    expect(topicStatus(t, undefined, lookup(t.id))).toBe('new');
    expect(topicStatus(t, {}, lookup(t.id))).toBe('new');
    expect(topicStatus(t, { lessonDone: true }, lookup(t.id))).toBe('progress');
    expect(topicStatus(t, { lessonDone: true, quizBest: 0.6, quizTries: 1 }, lookup(t.id))).toBe('progress');
    expect(topicStatus(t, { lessonDone: true, quizBest: 0.8, quizTries: 2 }, lookup(t.id))).toBe('done');
  });

  it('passing the quiz alone closes the topic', () => {
    expect(topicStatus(topic('l1'), { quizBest: 1, quizTries: 1 }, lookup('l1'))).toBe('done');
  });

  it('a lesson without a quiz is done when read', () => {
    const info = { hasLesson: true, hasQuiz: false };
    expect(topicStatus(topic('x'), { lessonDone: true }, info)).toBe('done');
  });

  it('a map-only topic is done when every goal is ticked', () => {
    const t = topic('m1');
    expect(topicStatus(t, { goals: [0] }, lookup(t.id))).toBe('progress');
    expect(topicStatus(t, { goals: [0, 1] }, lookup(t.id))).toBe('done');
  });
});

describe('stats, path and schedule', () => {
  const s1 = stage('s1', 'foundation', [topic('l1', 60), topic('m1', 120)]);
  const s2 = stage('s2', 'foundation', [topic('m2', 180)]);
  const p1 = stage('p1', 'pentest', [topic('m3', 60)]);
  const k1 = stage('k1', 'career', [topic('m4', 60)]);
  const tracks: Track[] = [
    { id: 'foundation', title: '', short: '', summary: '', jobs: [], stages: [s1, s2] },
    { id: 'pentest', title: '', short: '', summary: '', jobs: [], stages: [p1] },
    { id: 'career', title: '', short: '', summary: '', jobs: [], stages: [k1] },
  ];

  it('weights progress by study time', () => {
    const progress: ProgressMap = { l1: { quizBest: 1, quizTries: 1 } };
    const stats = stageStats(s1, progress, lookup);
    expect(stats.done).toBe(1);
    expect(stats.minutesLeft).toBe(120);
    expect(stats.ratio).toBeCloseTo(60 / 180);
  });

  it('counts a topic in progress as half done', () => {
    const stats = stageStats(s1, { m1: { goals: [0] } }, lookup);
    expect(stats.minutesLeft).toBe(60 + 60);
    expect(stats.started).toBe(1);
  });

  it('builds the route with and without a speciality', () => {
    expect(learningPath(tracks, null).map((s) => s.id)).toEqual(['s1', 's2', 'k1']);
    expect(learningPath(tracks, 'pentest').map((s) => s.id)).toEqual(['s1', 's2', 'p1', 'k1']);
  });

  it('finds the first unfinished topic', () => {
    const path = learningPath(tracks, 'pentest');
    expect(nextTopic(path, {}, lookup)?.topic.id).toBe('l1');
    const progress: ProgressMap = { l1: { quizBest: 1 }, m1: { goals: [0, 1] } };
    expect(nextTopic(path, progress, lookup)?.topic.id).toBe('m2');
  });

  it('converts minutes to calendar days at the chosen pace', () => {
    expect(daysFor(600, 60, 7)).toBe(10);
    expect(daysFor(600, 120, 7)).toBe(5);
    expect(daysFor(300, 60, 5)).toBeCloseTo(7);
    expect(daysFor(0, 60, 7)).toBe(0);
  });

  it('projects cumulative finish dates and skips finished stages', () => {
    const from = new Date(2026, 0, 1);
    const path = learningPath(tracks, null);
    const plan = schedule(path, { m2: { goals: [0, 1] } }, lookup, 60, 7, from);
    expect(plan[0]!.finish).toEqual(new Date(2026, 0, 4)); // 180 min → 3 days
    expect(plan[1]!.finish).toBeNull();
    expect(plan[2]!.finish).toEqual(new Date(2026, 0, 5)); // +60 min → day 4
  });
});

describe('dates', () => {
  const day = { seconds: 600, events: 1 };

  it('counts a streak ending today or yesterday', () => {
    const today = '2026-11-16';
    expect(streak({}, today)).toBe(0);
    expect(streak({ '2026-11-16': day, '2026-11-15': day }, today)).toBe(2);
    // Not studied yet today: yesterday's streak still stands.
    expect(streak({ '2026-11-15': day, '2026-11-14': day, '2026-11-13': day }, today)).toBe(3);
    // A gap breaks it.
    expect(streak({ '2026-11-14': day }, today)).toBe(0);
  });

  it('ignores days with no real activity', () => {
    expect(streak({ '2026-11-16': { seconds: 20, events: 0 } }, '2026-11-16')).toBe(0);
  });

  it('finds the longest streak and crosses month borders', () => {
    const days = { '2026-10-30': day, '2026-10-31': day, '2026-11-01': day, '2026-11-05': day };
    expect(longestStreak(days)).toBe(3);
    expect(shiftDay('2026-10-31', 1)).toBe('2026-11-01');
  });

  it('formats durations in Uzbek', () => {
    expect(formatMinutes(40)).toBe('40 daq');
    expect(formatMinutes(95)).toBe('1 soat 35 daq');
    expect(formatMinutes(120)).toBe('2 soat');
    expect(formatSpan(5)).toBe('5 kun');
    expect(formatSpan(21)).toBe('3 hafta');
    expect(formatSpan(150)).toBe('5 oy');
    expect(formatSpan(430)).toBe('1 yil 2 oy');
  });
});

describe('spaced repetition', () => {
  const today = '2026-11-16';

  it('a new card is due at once', () => {
    expect(isDue(newCard(today), today)).toBe(true);
  });

  it('"good" doubles the interval each time', () => {
    let card = newCard(today);
    let now = today;
    const gaps: number[] = [];
    for (let i = 0; i < 4; i++) {
      card = review(card, 'good', now);
      gaps.push(INTERVALS[card.box - 1]!);
      expect(isDue(card, now)).toBe(false);
      now = card.due;
    }
    expect(gaps).toEqual([1, 2, 4, 8]);
  });

  it('"again" sends the card back to the start', () => {
    let card = review(review(newCard(today), 'good', today), 'good', today);
    card = review(card, 'again', today);
    expect(card.box).toBe(0);
    expect(card.due).toBe('2026-11-17');
    expect(card.lapses).toBe(1);
  });

  it('"hard" repeats the current interval', () => {
    const card = review(review(newCard(today), 'good', today), 'good', today);
    expect(review(card, 'hard', today).box).toBe(card.box);
  });

  it('never leaves the last box and becomes mature', () => {
    let card = newCard(today);
    for (let i = 0; i < 12; i++) card = review(card, 'good', today);
    expect(card.box).toBe(INTERVALS.length);
    expect(isMature(card)).toBe(true);
  });
});

describe('flags', () => {
  it('ignores case and surrounding spaces, rejects wrong answers', () => {
    const hash = flagHash('flag{salom_dunyo}');
    expect(checkFlag('  FLAG{Salom_Dunyo} ', hash)).toBe(true);
    expect(checkFlag('flag{salom}', hash)).toBe(false);
  });
});
