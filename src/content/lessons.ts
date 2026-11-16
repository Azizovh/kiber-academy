import { parseLesson } from './lessonParser';
import type { Flashcard, Lesson } from './types';
import type { LessonInfo } from '../engine/progress';

// Lessons are plain text and small, so they are bundled eagerly: every page
// can then read them synchronously and the app works fully offline.
const sources = import.meta.glob<string>('./lessons/**/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
});

/** Raw Markdown by topic id (file name without extension). */
export const LESSON_SOURCES: Record<string, string> = {};
for (const [path, source] of Object.entries(sources)) {
  const id = path.slice(path.lastIndexOf('/') + 1).replace(/\.md$/, '');
  LESSON_SOURCES[id] = source;
}

const cache = new Map<string, Lesson>();

export function getLesson(topicId: string): Lesson | null {
  const source = LESSON_SOURCES[topicId];
  if (source === undefined) return null;
  let lesson = cache.get(topicId);
  if (!lesson) {
    lesson = parseLesson(topicId, source);
    cache.set(topicId, lesson);
  }
  return lesson;
}

export function lessonInfo(topicId: string): LessonInfo {
  const lesson = getLesson(topicId);
  return { hasLesson: !!lesson, hasQuiz: !!lesson && lesson.quiz.length > 0 };
}

export function lessonIds(): string[] {
  return Object.keys(LESSON_SOURCES);
}

let cardIndex: Map<string, Flashcard> | null = null;

export function getCard(cardId: string): Flashcard | null {
  if (!cardIndex) {
    cardIndex = new Map();
    for (const id of lessonIds()) for (const card of getLesson(id)!.cards) cardIndex.set(card.id, card);
  }
  return cardIndex.get(cardId) ?? null;
}
