/* Exams, one per track, and the readiness estimate built from the learner's progress. */

// The shell first: the exam files import helpers from text.ts, and entering the terminal engine there (text.ts →
// commands.ts → text.ts) would read `awk` before it exists.
import '../../engine/terminal/shell';
import type { Exam } from '../examTypes';
import { FOUNDATION_EXAM } from './foundation';
import { SOC_EXAM } from './soc';
import { APPSEC_EXAM } from './appsec';
import { CLOUD_EXAM } from './cloud';
import { PENTEST_EXAM } from './pentest';
import type { Stage, TrackId } from '../types';
import { ALL_STAGES, getTrack } from '../curriculum';
import { lessonInfo } from '../lessons';
import { readiness, type Readiness } from '../../engine/exam';
import type { ProgressData } from '../../store/progress';
import type { ExamAttempt } from '../../store/exams';

export const EXAMS: Exam[] = [FOUNDATION_EXAM, SOC_EXAM, APPSEC_EXAM, CLOUD_EXAM, PENTEST_EXAM];

export function getExam(id: string): Exam | null {
  return EXAMS.find((e) => e.id === id) ?? null;
}


export interface Recommendation {
  kind: 'topic' | 'lab' | 'ctf' | 'lessons';
  text: string;
  to: string;
}

export interface TrackReadiness extends Readiness {
  best: ExamAttempt | null;
  last: ExamAttempt | null;
  counts: { lessons: number; lessonsDone: number; labs: number; labsDone: number; ctf: number; ctfSolved: number };
  recommendations: Recommendation[];
}

function stagesOf(exam: Exam): Stage[] {
  const ids = new Set(exam.topics.flatMap((t) => t.stages));
  return ALL_STAGES.filter((s) => ids.has(s.id));
}

export function trackReadiness(exam: Exam, progress: ProgressData, attempts: ExamAttempt[]): TrackReadiness {
  const topics = stagesOf(exam).flatMap((s) => s.modules.flatMap((m) => m.topics));
  const withLesson = topics.filter((t) => lessonInfo(t.id).hasLesson);
  const labIds = [...new Set(topics.flatMap((t) => t.labs ?? []))];
  const ctfIds = [...new Set(topics.flatMap((t) => t.ctf ?? []))];
  const best = attempts.reduce<ExamAttempt | null>((b, a) => (!b || a.score.total > b.score.total ? a : b), null);
  const last = attempts.length ? attempts[attempts.length - 1]! : null;
  const r = readiness({
    examBest: best ? best.score.total : null,
    lessons: withLesson.map((t) => ({ done: !!progress.topics[t.id]?.lessonDone, quiz: progress.topics[t.id]?.quizBest ?? 0 })),
    labs: labIds.map((id) => ({ done: !!progress.labs[id]?.done })),
    ctf: ctfIds.map((id) => ({ solved: !!progress.ctf[id]?.solved })),
  });

  const recs: Recommendation[] = [];
  if (last) {
    const weak = exam.topics.filter((t) => last.score.topics[t.id] !== undefined && last.score.topics[t.id]! < 0.7).sort((a, b) => last.score.topics[a.id]! - last.score.topics[b.id]!);
    for (const t of weak.slice(0, 3)) {
      const stage = ALL_STAGES.find((s) => t.stages.includes(s.id));
      recs.push({ kind: 'topic', text: `${t.title}: oxirgi imtihonda ${Math.round(last.score.topics[t.id]! * 100)}% — shu bosqich darslarini takrorlang`, to: stage ? `/bosqich/${stage.id}` : '/xarita' });
    }
  } else {
    recs.push({ kind: 'topic', text: "Hali imtihon topshirilmagan: tayyorlikning yarmi — imtihon natijasi", to: `/imtihon/${exam.id}` });
  }
  const undone = withLesson.filter((t) => !progress.topics[t.id]?.lessonDone);
  if (undone.length) recs.push({ kind: 'lessons', text: `${undone.length} ta dars hali tugatilmagan — keyingisi: ${undone[0]!.title}`, to: `/mavzu/${undone[0]!.id}` });
  const labTodo = labIds.filter((id) => !progress.labs[id]?.done);
  if (labTodo.length) recs.push({ kind: 'lab', text: `${labTodo.length} ta lab bajarilmagan`, to: `/lab/${labTodo[0]}` });
  const ctfTodo = ctfIds.filter((id) => !progress.ctf[id]?.solved);
  if (ctfTodo.length) recs.push({ kind: 'ctf', text: `${ctfTodo.length} ta CTF yechilmagan`, to: `/ctf/${ctfTodo[0]}` });

  return {
    ...r,
    best,
    last,
    counts: {
      lessons: withLesson.length,
      lessonsDone: withLesson.length - undone.length,
      labs: labIds.length,
      labsDone: labIds.length - labTodo.length,
      ctf: ctfIds.length,
      ctfSolved: ctfIds.length - ctfTodo.length,
    },
    recommendations: recs,
  };
}

export const LEVEL_TEXT: Record<Readiness['level'], { title: string; text: string }> = {
  boshlangich: { title: "Boshlang'ich", text: "Poydevor qurilmoqda: darslar va lablarni davom ettiring, keyin imtihonni sinang." },
  rivojlanmoqda: { title: 'Rivojlanmoqda', text: "Asos bor, lekin bo'shliqlar ko'p: zaif mavzular va bajarilmagan amaliyotga e'tibor bering." },
  tayyor: { title: 'Intervyuga tayyor', text: "Junior lavozimlarga ariza berish va intervyularga tayyorlanish vaqti." },
  kuchli: { title: 'Kuchli nomzod', text: "Bilim ham, amaliyot ham bor. Portfolio va sertifikat bilan mustahkamlang." },
};

export const trackTitle = (id: TrackId) => getTrack(id).title;
