import { useEffect, useState } from 'react';
import META from 'virtual:lesson-meta';
import { parseLesson } from './lessonParser';
import type { Flashcard, Lesson } from './types';
import type { LessonInfo } from '../engine/progress';

/*
 * Lessons are loaded on demand: each Markdown file becomes its own small chunk, so the site's first load does not
 * carry every lesson. What list pages need synchronously (has a lesson? a quiz? reading time?) comes from
 * `virtual:lesson-meta`, computed at build time by scripts/lessonMetaPlugin.ts.
 */
const loaders = import.meta.glob<string>('./lessons/**/*.md', { query: '?raw', import: 'default' });

const LOADERS: Record<string, () => Promise<string>> = {};
for (const [path, load] of Object.entries(loaders)) {
  LOADERS[path.slice(path.lastIndexOf('/') + 1).replace(/\.md$/, '')] = load;
}

const cache = new Map<string, Lesson>();
const pending = new Map<string, Promise<Lesson | null>>();

export function lessonMeta(topicId: string) {
  return META[topicId] ?? null;
}

export function lessonInfo(topicId: string): LessonInfo {
  const meta = META[topicId];
  return { hasLesson: !!meta, hasQuiz: !!meta && meta.quiz > 0 };
}

export function lessonIds(): string[] {
  return Object.keys(META);
}

/** The parsed lesson if it has been loaded already; null otherwise (or when the topic has none). */
export function getLoadedLesson(topicId: string): Lesson | null {
  return cache.get(topicId) ?? null;
}

export function loadLesson(topicId: string): Promise<Lesson | null> {
  const ready = cache.get(topicId);
  if (ready) return Promise.resolve(ready);
  const load = LOADERS[topicId];
  if (!load) return Promise.resolve(null);
  let promise = pending.get(topicId);
  if (!promise) {
    promise = load()
      .then((source) => {
        const lesson = parseLesson(topicId, source);
        cache.set(topicId, lesson);
        return lesson;
      })
      .finally(() => pending.delete(topicId));
    pending.set(topicId, promise);
  }
  return promise;
}

export type LessonState =
  | { status: 'none'; lesson: null }
  | { status: 'loading'; lesson: null }
  | { status: 'ready'; lesson: Lesson }
  | { status: 'error'; lesson: null };

/** Loads a topic's lesson for a component. A failed chunk (offline after a new deploy) reports 'error'. */
export function useLesson(topicId: string): LessonState & { retry: () => void } {
  const initial = (): LessonState => {
    if (!META[topicId]) return { status: 'none', lesson: null };
    const ready = cache.get(topicId);
    return ready ? { status: 'ready', lesson: ready } : { status: 'loading', lesson: null };
  };
  const [state, setState] = useState<LessonState>(initial);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!META[topicId]) {
      setState({ status: 'none', lesson: null });
      return;
    }
    let alive = true;
    const ready = cache.get(topicId);
    if (ready) setState({ status: 'ready', lesson: ready });
    else {
      setState({ status: 'loading', lesson: null });
      loadLesson(topicId).then(
        (lesson) => alive && setState(lesson ? { status: 'ready', lesson } : { status: 'none', lesson: null }),
        () => alive && setState({ status: 'error', lesson: null }),
      );
    }
    return () => {
      alive = false;
    };
  }, [topicId, attempt]);

  return { ...state, retry: () => setAttempt((n) => n + 1) };
}

/** Card ids are `<topicId>#<n>`, so the lesson that holds a card is known without loading anything. */
export function cardTopic(cardId: string): string {
  return cardId.slice(0, cardId.lastIndexOf('#'));
}

/** Loads the lessons behind the given cards and returns the cards that exist. */
export async function loadCards(cardIds: string[]): Promise<Map<string, Flashcard>> {
  const topics = [...new Set(cardIds.map(cardTopic))];
  const lessons = await Promise.all(topics.map((t) => loadLesson(t).catch(() => null)));
  const found = new Map<string, Flashcard>();
  for (const lesson of lessons) for (const card of lesson?.cards ?? []) found.set(card.id, card);
  return found;
}
