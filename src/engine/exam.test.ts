import { describe, expect, it } from 'vitest';
import type { Exam } from '../content/examTypes';
import { drawAttempt, EXAM_RULES, isCorrect, nextAttemptAt, parseBank, readiness, scoreAttempt } from './exam';

const BANK = `
## tarmoq
? Port 443 odatda qaysi protokol?
- SSH
+ HTTPS
- DNS
! 443 — HTTPS.

? Qaysilari xususiy (ichki) manzil?
\`\`\`
10.1.2.3   8.8.8.8   192.168.1.1
\`\`\`
+ 10.1.2.3
- 8.8.8.8
+ 192.168.1.1
! RFC 1918.

## linux
? Fayl ruxsatlarini kim o'zgartiradi?
- ls
+ chmod
- cat
! chmod.
`;

function exam(n = 20): Exam {
  const qs = parseBank('t', BANK);
  const questions = Array.from({ length: n }, (_, i) => ({ ...qs[i % qs.length]!, id: `q${i}`, topic: i % 3 === 0 ? 'linux' : i % 3 === 1 ? 'tarmoq' : 'xavf' }));
  return {
    id: 'foundation',
    title: 'T',
    summary: '',
    topics: [
      { id: 'linux', title: 'Linux', stages: [] },
      { id: 'tarmoq', title: 'Tarmoq', stages: [] },
      { id: 'xavf', title: 'Xavfsizlik', stages: [] },
    ],
    questions,
    practicals: [
      { id: 'p1', topic: 'linux', title: '', intro: '', shell: () => ({ fs: {} }), tasks: [] },
      { id: 'p2', topic: 'linux', title: '', intro: '', shell: () => ({ fs: {} }), tasks: [] },
      { id: 'p3', topic: 'tarmoq', title: '', intro: '', shell: () => ({ fs: {} }), tasks: [] },
    ],
  };
}

describe('question bank', () => {
  it('parses topics, multi-line questions, multi-answer options and explanations', () => {
    const qs = parseBank('t', BANK);
    expect(qs.map((q) => q.id)).toEqual(['t-tarmoq-1', 't-tarmoq-2', 't-linux-1']);
    expect(qs[1]!.text).toContain('10.1.2.3   8.8.8.8');
    expect(qs[1]!.options.filter((o) => o.correct)).toHaveLength(2);
    expect(qs[0]!.explanation).toBe('443 — HTTPS.');
  });

  it('counts a multi-answer question only when exactly the right options are chosen', () => {
    const q = parseBank('t', BANK)[1]!;
    expect(isCorrect(q, [0, 2])).toBe(true);
    expect(isCorrect(q, [2, 0])).toBe(true);
    expect(isCorrect(q, [0])).toBe(false);
    expect(isCorrect(q, [0, 1, 2])).toBe(false);
    expect(isCorrect(q, undefined)).toBe(false);
  });
});

describe('drawing an attempt', () => {
  it('is balanced over topics, reproducible from the seed, and varies between seeds', () => {
    const e = exam(30);
    const a = drawAttempt(e, 42, 12, 2);
    const byTopic = (ids: string[]) => ids.map((id) => e.questions.find((q) => q.id === id)!.topic);
    const counts = byTopic(a.questions.map((q) => q.id)).reduce<Record<string, number>>((m, t) => ((m[t] = (m[t] ?? 0) + 1), m), {});
    expect(counts).toEqual({ linux: 4, tarmoq: 4, xavf: 4 });
    expect(drawAttempt(e, 42, 12, 2)).toEqual(a);
    expect(drawAttempt(e, 43, 12, 2).questions.map((q) => q.id)).not.toEqual(a.questions.map((q) => q.id));
    expect(new Set(a.questions.map((q) => q.id)).size).toBe(12);
    for (const q of a.questions) expect([...q.order].sort()).toEqual(e.questions.find((x) => x.id === q.id)!.options.map((_, i) => i));
  });

  it('prefers practicals from different topics', () => {
    for (let seed = 1; seed < 20; seed++) {
      const p = drawAttempt(exam(), seed).practicals;
      expect(p).toHaveLength(2);
      expect(p).toContain('p3');
    }
  });

  it('fills up from other topics when one is short', () => {
    const e = exam(7);
    expect(drawAttempt(e, 1, 7).questions).toHaveLength(7);
    expect(drawAttempt(e, 1, 30).questions).toHaveLength(7);
  });
});

describe('scoring', () => {
  it('weighs theory and practice and reports topic scores', () => {
    const e = exam(3);
    const ids = ['q0', 'q1', 'q2'];
    const right = (id: string) => e.questions.find((q) => q.id === id)!.options.map((o, i) => (o.correct ? i : -1)).filter((i) => i >= 0);
    const s = scoreAttempt(e, ids, { q0: right('q0'), q1: right('q1'), q2: [] }, [{ id: 'p3', topic: 'tarmoq', solved: 2, total: 4 }]);
    expect(s.correct).toBe(2);
    expect(s.theory).toBeCloseTo(2 / 3);
    expect(s.practical).toBe(0.5);
    expect(s.total).toBeCloseTo(EXAM_RULES.theoryWeight * (2 / 3) + (1 - EXAM_RULES.theoryWeight) * 0.5);
    expect(s.passed).toBe(false);
    expect(s.topics).toEqual({ linux: 1, tarmoq: 3 / 5, xavf: 0 });
  });

  it('passes at the pass mark', () => {
    const e = exam(10);
    const ids = e.questions.map((q) => q.id);
    const answers = Object.fromEntries(e.questions.map((q) => [q.id, q.options.map((o, i) => (o.correct ? i : -1)).filter((i) => i >= 0)]));
    expect(scoreAttempt(e, ids, answers, [{ id: 'p1', topic: 'linux', solved: 1, total: 4 }]).passed).toBe(true);
    expect(scoreAttempt(e, ids, {}, [{ id: 'p1', topic: 'linux', solved: 4, total: 4 }]).passed).toBe(false);
  });
});

describe('retakes and readiness', () => {
  it('waits 24 hours after the last finished attempt', () => {
    const t = Date.UTC(2026, 10, 20, 10);
    expect(nextAttemptAt([], t)).toBeNull();
    expect(nextAttemptAt([t - 3600_000], t)).toBe(t + 23 * 3600_000);
    expect(nextAttemptAt([t - 25 * 3600_000], t)).toBeNull();
  });

  it('combines exam, lessons, labs and CTFs', () => {
    const r = readiness({ examBest: 0.8, lessons: [{ done: true, quiz: 1 }, { done: false, quiz: 0 }], labs: [{ done: true }, { done: false }], ctf: [] });
    expect(r.parts).toEqual({ exam: 0.8, lessons: 0.5, labs: 0.5, ctf: 0 });
    expect(r.score).toBeCloseTo(0.4 + 0.1 + 0.075);
    expect(r.level).toBe('rivojlanmoqda');
    expect(readiness({ examBest: null, lessons: [], labs: [], ctf: [] }).level).toBe('boshlangich');
    expect(readiness({ examBest: 1, lessons: [{ done: true, quiz: 1 }], labs: [{ done: true }], ctf: [{ solved: true }] }).level).toBe('kuchli');
  });
});
