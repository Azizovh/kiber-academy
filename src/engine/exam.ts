/*
 * Exams: drawing a balanced set of questions, scoring an attempt, and the "job readiness" estimate. Pure functions;
 * the store keeps attempts, the pages show them.
 */

import type { Exam, ExamQuestion } from '../content/examTypes';

/** The rules every exam follows. */
export const EXAM_RULES = {
  theoryCount: 30,
  practicalCount: 2,
  theoryMinutes: 45,
  practicalMinutes: 45,
  /** Total score needed to pass, 0..1. */
  pass: 0.7,
  /** Weight of the theory part in the total; the practical part has the rest. */
  theoryWeight: 0.6,
  /** Hours between finished attempts. */
  retakeHours: 24,
};

/* ── randomness that can be replayed ─────────────────────────────── */

export function seededRandom(seed: number): () => number {
  let a = seed >>> 0 || 1;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle<T>(items: T[], rnd: () => number): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

/* ── drawing an attempt ──────────────────────────────────────────── */

export interface DrawnQuestion {
  id: string;
  /** Option indexes of the bank question, in the order they are shown. */
  order: number[];
}

export interface Draw {
  questions: DrawnQuestion[];
  practicals: string[];
}

/**
 * Picks `count` questions spread evenly over the exam's topics (each topic gets its share; leftovers go to random
 * topics that still have questions), shuffles their order and their options, and picks the practical tasks so that
 * they cover different topics when possible.
 */
export function drawAttempt(exam: Exam, seed: number, count = EXAM_RULES.theoryCount, practicals = EXAM_RULES.practicalCount): Draw {
  const rnd = seededRandom(seed);
  const byTopic = new Map<string, ExamQuestion[]>();
  for (const t of exam.topics) byTopic.set(t.id, shuffle(exam.questions.filter((q) => q.topic === t.id), rnd));
  const total = Math.min(count, exam.questions.length);
  const chosen: ExamQuestion[] = [];
  const topics = exam.topics.filter((t) => (byTopic.get(t.id) ?? []).length > 0);
  const share = Math.floor(total / Math.max(1, topics.length));
  for (const t of topics) chosen.push(...byTopic.get(t.id)!.splice(0, share));
  let order = shuffle(topics, rnd);
  while (chosen.length < total) {
    order = order.filter((t) => byTopic.get(t.id)!.length > 0);
    if (!order.length) break;
    for (const t of order) {
      if (chosen.length >= total) break;
      const q = byTopic.get(t.id)!.shift();
      if (q) chosen.push(q);
    }
  }
  const questions = shuffle(chosen, rnd).map((q) => ({ id: q.id, order: shuffle(q.options.map((_, i) => i), rnd) }));

  const pool = shuffle(exam.practicals, rnd);
  const picked: string[] = [];
  const usedTopics = new Set<string>();
  for (const p of pool) {
    if (picked.length >= practicals) break;
    if (!usedTopics.has(p.topic)) {
      picked.push(p.id);
      usedTopics.add(p.topic);
    }
  }
  for (const p of pool) if (picked.length < practicals && !picked.includes(p.id)) picked.push(p.id);
  return { questions, practicals: picked };
}

/* ── scoring ─────────────────────────────────────────────────────── */

/** A multi-answer question counts only when exactly the right options are chosen. */
export function isCorrect(q: ExamQuestion, chosen: number[] | undefined): boolean {
  if (!chosen || !chosen.length) return false;
  const right = q.options.map((o, i) => (o.correct ? i : -1)).filter((i) => i >= 0);
  return right.length === chosen.length && right.every((i) => chosen.includes(i));
}

export interface PracticalScore {
  id: string;
  topic: string;
  solved: number;
  total: number;
}

export interface AttemptScore {
  theory: number;
  practical: number;
  total: number;
  passed: boolean;
  /** Per exam topic: correct answers and solved tasks over everything asked, 0..1; topics not asked are absent. */
  topics: Record<string, number>;
  correct: number;
  asked: number;
}

export function scoreAttempt(exam: Exam, questionIds: string[], answers: Record<string, number[]>, practicals: PracticalScore[]): AttemptScore {
  const bank = new Map(exam.questions.map((q) => [q.id, q]));
  const perTopic = new Map<string, { got: number; of: number }>();
  const bump = (topic: string, got: number, of: number) => {
    const t = perTopic.get(topic) ?? { got: 0, of: 0 };
    t.got += got;
    t.of += of;
    perTopic.set(topic, t);
  };
  let correct = 0;
  for (const id of questionIds) {
    const q = bank.get(id);
    if (!q) continue;
    const ok = isCorrect(q, answers[id]);
    if (ok) correct++;
    bump(q.topic, ok ? 1 : 0, 1);
  }
  const asked = questionIds.filter((id) => bank.has(id)).length;
  const theory = asked ? correct / asked : 0;
  const solved = practicals.reduce((n, p) => n + p.solved, 0);
  const tasks = practicals.reduce((n, p) => n + p.total, 0);
  for (const p of practicals) bump(p.topic, p.solved, p.total);
  const practical = tasks ? solved / tasks : 0;
  const total = tasks ? EXAM_RULES.theoryWeight * theory + (1 - EXAM_RULES.theoryWeight) * practical : theory;
  const topics: Record<string, number> = {};
  for (const [t, v] of perTopic) if (v.of) topics[t] = v.got / v.of;
  return { theory, practical, total, passed: total >= EXAM_RULES.pass, topics, correct, asked };
}

/* ── retakes ─────────────────────────────────────────────────────── */

/** When the next attempt may start (ms), given the finish times of earlier attempts; null if it may start now. */
export function nextAttemptAt(finishedAts: number[], now: number): number | null {
  if (!finishedAts.length) return null;
  const at = Math.max(...finishedAts) + EXAM_RULES.retakeHours * 3600_000;
  return at > now ? at : null;
}

/* ── readiness ───────────────────────────────────────────────────── */

export interface ReadinessInput {
  /** Best exam total so far (0..1), or null when no exam was taken. */
  examBest: number | null;
  /** Lessons of the track: done flag and best quiz result (0..1). */
  lessons: { done: boolean; quiz: number }[];
  labs: { done: boolean }[];
  ctf: { solved: boolean }[];
}

export interface Readiness {
  score: number;
  parts: { exam: number; lessons: number; labs: number; ctf: number };
  level: 'boshlangich' | 'rivojlanmoqda' | 'tayyor' | 'kuchli';
}

export const READINESS_WEIGHTS = { exam: 0.5, lessons: 0.2, labs: 0.15, ctf: 0.15 };

const frac = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

/**
 * An estimate, not a promise: half of it is the exam (knowledge under time pressure), the rest is the work behind
 * it — lessons (read and self-tested), labs and CTFs of the track. Parts with nothing to measure count as zero.
 */
export function readiness(input: ReadinessInput): Readiness {
  const parts = {
    exam: input.examBest ?? 0,
    lessons: frac(input.lessons.map((l) => (l.done ? 0.5 : 0) + 0.5 * l.quiz)),
    labs: frac(input.labs.map((l) => (l.done ? 1 : 0))),
    ctf: frac(input.ctf.map((c) => (c.solved ? 1 : 0))),
  };
  const score = parts.exam * READINESS_WEIGHTS.exam + parts.lessons * READINESS_WEIGHTS.lessons + parts.labs * READINESS_WEIGHTS.labs + parts.ctf * READINESS_WEIGHTS.ctf;
  const level = score >= 0.85 ? 'kuchli' : score >= 0.7 ? 'tayyor' : score >= 0.4 ? 'rivojlanmoqda' : 'boshlangich';
  return { score, parts, level };
}

/* ── question bank format ────────────────────────────────────────── */

/**
 * Parses a bank written like lesson quizzes, grouped by topic:
 *   ## topic-id
 *   ? Question (more question lines may follow, before the options)
 *   - wrong option
 *   + right option
 *   ! explanation
 * Ids are `<exam>-<topic>-<n>`: stable as long as questions are only appended.
 */
export function parseBank(examId: string, source: string): ExamQuestion[] {
  const out: ExamQuestion[] = [];
  let topic = '';
  let cur: ExamQuestion | null = null;
  const counters = new Map<string, number>();
  const finish = () => {
    if (cur) out.push(cur);
    cur = null;
  };
  const lines = source.split('\n');
  let inFence = false;
  for (const raw of lines) {
    const line = raw.replace(/\s+$/, '');
    if (!inFence && line.startsWith('## ')) {
      finish();
      topic = line.slice(3).trim();
      continue;
    }
    if (!inFence && line.startsWith('? ')) {
      finish();
      const n = (counters.get(topic) ?? 0) + 1;
      counters.set(topic, n);
      cur = { id: `${examId}-${topic}-${n}`, topic, text: line.slice(2), options: [], explanation: '' };
      continue;
    }
    if (!cur) continue;
    if (!inFence && (line.startsWith('- ') || line.startsWith('+ '))) {
      cur.options.push({ text: line.slice(2), correct: line[0] === '+' });
      continue;
    }
    if (!inFence && line.startsWith('! ')) {
      cur.explanation = cur.explanation ? `${cur.explanation}\n${line.slice(2)}` : line.slice(2);
      continue;
    }
    // Further question lines (code blocks included) before the options.
    if (!cur.options.length) {
      if (line.startsWith('```')) inFence = !inFence;
      cur.text += '\n' + raw;
    }
  }
  finish();
  return out;
}
