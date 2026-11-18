import { parseLesson } from './lessonParser';
import type { Lesson } from './types';

// For the content tests only: every lesson, synchronously. The app itself loads lessons on demand (lessons.ts), so
// nothing outside *.test.ts may import this file — it would pull every lesson back into the main bundle.
const sources = import.meta.glob<string>('./lessons/**/*.md', { query: '?raw', import: 'default', eager: true });

export const LESSON_SOURCES: Record<string, string> = {};
for (const [path, source] of Object.entries(sources)) {
  LESSON_SOURCES[path.slice(path.lastIndexOf('/') + 1).replace(/\.md$/, '')] = source;
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

export function lessonIds(): string[] {
  return Object.keys(LESSON_SOURCES);
}
