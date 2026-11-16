import type { CalloutKind, Flashcard, Lesson, LessonSegment, QuizQuestion } from './types';

const CALLOUTS: CalloutKind[] = ['tip', 'info', 'warn', 'key', 'try'];

/** Study-reading speed for dense technical text with tables and code: words per minute. */
const WPM = 90;

/**
 * [[term]] and [[term-id|shown text]] become links with a "#g:" target,
 * which the Markdown renderer turns into glossary popovers.
 */
export function linkGlossary(md: string): string {
  return md.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_, id: string, label?: string) => {
    const slug = id.trim().toLowerCase().replace(/\s+/g, '-');
    return `[${(label ?? id).trim()}](#g:${slug})`;
  });
}

/** Glossary ids referenced by a lesson (used by the content test). */
export function glossaryRefs(md: string): string[] {
  return [...md.matchAll(/\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g)].map((m) => m[1]!.trim().toLowerCase().replace(/\s+/g, '-'));
}

function parseQuiz(body: string): QuizQuestion[] {
  const questions: QuizQuestion[] = [];
  let current: QuizQuestion | null = null;
  for (const raw of body.split('\n')) {
    const line = raw.trim();
    if (!line) continue;
    const mark = line[0];
    const text = line.slice(1).trim();
    if (mark === '?') {
      current = { text, options: [] };
      questions.push(current);
    } else if (!current) {
      continue;
    } else if (mark === '+' || mark === '-') {
      current.options.push({ text, correct: mark === '+' });
    } else if (mark === '!') {
      current.explanation = text;
    } else if (current.options.length === 0) {
      // A question may run over several lines.
      current.text += '\n' + line;
    }
  }
  return questions;
}

function parseCards(body: string, topicId: string, offset: number): Flashcard[] {
  const cards: Flashcard[] = [];
  for (const raw of body.split('\n')) {
    const i = raw.indexOf('::');
    if (i === -1) continue;
    const front = raw.slice(0, i).trim();
    const back = raw.slice(i + 2).trim();
    if (front && back) cards.push({ id: `${topicId}#${offset + cards.length}`, topicId, front, back });
  }
  return cards;
}

export function parseLesson(topicId: string, source: string): Lesson {
  const segments: LessonSegment[] = [];
  const quiz: QuizQuestion[] = [];
  const cards: Flashcard[] = [];
  let words = 0;

  const lines = source.replace(/\r\n/g, '\n').split('\n');
  let buffer: string[] = [];
  const flush = () => {
    const text = buffer.join('\n').trim();
    buffer = [];
    if (!text) return;
    words += text.split(/\s+/).length;
    segments.push({ type: 'md', text: linkGlossary(text) });
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    const open = /^:::(\w+)\s*(.*)$/.exec(line.trim());
    if (!open) {
      buffer.push(line);
      continue;
    }
    const kind = open[1]!;
    const arg = open[2]!.trim();
    flush();

    if (kind === 'lab') {
      segments.push({ type: 'lab', labId: arg });
      continue;
    }
    const body: string[] = [];
    i++;
    while (i < lines.length && lines[i]!.trim() !== ':::') body.push(lines[i++]!);
    const text = body.join('\n').trim();

    if (kind === 'quiz') quiz.push(...parseQuiz(text));
    else if (kind === 'cards') cards.push(...parseCards(text, topicId, cards.length));
    else if ((CALLOUTS as string[]).includes(kind)) {
      words += text.split(/\s+/).length;
      segments.push({ type: 'callout', kind: kind as CalloutKind, text: linkGlossary(text) });
    } else {
      throw new Error(`${topicId}: noma'lum blok ":::${kind}"`);
    }
  }
  flush();

  return { topicId, segments, quiz, cards, readMinutes: Math.max(3, Math.round(words / WPM)) };
}
