import { describe, expect, it } from 'vitest';
import { isEmptyData, mergeCard, mergeData, mergeSettings, mergeTopic, type SyncData, type SyncSettings } from './merge';

const settings = (patch: Partial<SyncSettings> = {}): SyncSettings => ({
  name: '',
  dailyMinutes: 60,
  daysPerWeek: 6,
  theme: 'dark',
  speciality: null,
  onboarded: false,
  startedAt: null,
  ...patch,
});

const empty = (patch: Partial<SyncData> = {}): SyncData => ({
  settings: settings(),
  topics: {},
  labs: {},
  ctf: {},
  days: {},
  cards: {},
  notes: {},
  ...patch,
});

describe('mergeTopic', () => {
  it('keeps the furthest progress from both sides', () => {
    expect(mergeTopic({ lessonDone: true, quizBest: 0.6, goals: [0, 2] }, { quizBest: 0.9, quizTries: 3, goals: [1, 2] })).toEqual({
      lessonDone: true,
      quizBest: 0.9,
      quizTries: 3,
      goals: [0, 1, 2],
    });
  });

  it('does not invent fields neither side had', () => {
    expect(mergeTopic({ goals: [1] }, {})).toEqual({ goals: [1] });
  });
});

describe('mergeCard', () => {
  it('prefers the card reviewed more often', () => {
    const a = { box: 3, due: '2026-11-20', reps: 5, lapses: 0 };
    const b = { box: 1, due: '2026-11-30', reps: 2, lapses: 1 };
    expect(mergeCard(a, b)).toBe(a);
    expect(mergeCard(b, a)).toBe(a);
  });
});

describe('mergeSettings', () => {
  it('lets a finished onboarding win over a fresh device', () => {
    const cloud = settings({ onboarded: true, speciality: 'soc', dailyMinutes: 120, name: 'Ali' });
    expect(mergeSettings(settings(), cloud)).toMatchObject({ onboarded: true, speciality: 'soc', dailyMinutes: 120, name: 'Ali' });
  });

  it('keeps the earliest start date and fills a missing name', () => {
    const merged = mergeSettings(
      settings({ onboarded: true, startedAt: '2026-11-10' }),
      settings({ onboarded: true, startedAt: '2026-10-01', name: 'Ali' }),
    );
    expect(merged.startedAt).toBe('2026-10-01');
    expect(merged.name).toBe('Ali');
  });
});

describe('mergeData', () => {
  const cloud = empty({
    settings: settings({ onboarded: true }),
    topics: { a: { lessonDone: true } },
    days: { '2026-11-16': { seconds: 600, events: 2 } },
    notes: { a: { text: 'old', updatedAt: '2026-11-01T00:00:00Z' } },
    labs: { l1: { done: true, runs: 1 } },
  });
  const local = empty({
    topics: { b: { quizBest: 1 } },
    days: { '2026-11-16': { seconds: 300, events: 5 }, '2026-11-17': { seconds: 60, events: 1 } },
    notes: { a: { text: 'new', updatedAt: '2026-11-17T00:00:00Z' } },
    ctf: { c1: { solved: true, hints: 1 } },
  });

  it('combines both copies without losing anything', () => {
    const m = mergeData(cloud, local);
    expect(Object.keys(m.topics).sort()).toEqual(['a', 'b']);
    expect(m.days['2026-11-16']).toEqual({ seconds: 600, events: 5 });
    expect(m.days['2026-11-17']).toEqual({ seconds: 60, events: 1 });
    expect(m.notes.a?.text).toBe('new');
    expect(m.labs.l1?.done).toBe(true);
    expect(m.ctf.c1?.solved).toBe(true);
    expect(m.settings.onboarded).toBe(true);
  });

  it('is idempotent, so repeated syncs do not inflate numbers', () => {
    const once = mergeData(cloud, local);
    expect(mergeData(once, local)).toEqual(once);
    expect(mergeData(once, once)).toEqual(once);
  });
});

describe('isEmptyData', () => {
  it('recognises a fresh copy', () => {
    expect(isEmptyData(empty())).toBe(true);
    expect(isEmptyData(empty({ topics: { a: { lessonDone: true } } }))).toBe(false);
    expect(isEmptyData(empty({ settings: settings({ onboarded: true }) }))).toBe(false);
  });
});
