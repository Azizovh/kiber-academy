import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import type { Plugin } from 'vite';
import { parseLesson } from '../src/content/lessonParser';

const ID = 'virtual:lesson-meta';
const RESOLVED = '\0' + ID;

/** The facts about a lesson that list pages need before (or without) loading its full text. */
export interface LessonMeta {
  readMinutes: number;
  quiz: number;
  cards: number;
}

/**
 * Lessons are loaded on demand, one chunk each, so the first page load stays small. Progress, the roadmap and the
 * admin summary still need to know synchronously which topics have a lesson, a quiz and how long it reads; this
 * plugin computes that at build time into a tiny module (`virtual:lesson-meta`).
 */
export function lessonMetaPlugin(root = process.cwd()): Plugin {
  const dir = resolve(root, 'src/content/lessons');

  const build = (): Record<string, LessonMeta> => {
    const meta: Record<string, LessonMeta> = {};
    for (const stage of readdirSync(dir)) {
      for (const file of readdirSync(join(dir, stage))) {
        if (!file.endsWith('.md')) continue;
        const id = file.slice(0, -3);
        const lesson = parseLesson(id, readFileSync(join(dir, stage, file), 'utf8'));
        meta[id] = { readMinutes: lesson.readMinutes, quiz: lesson.quiz.length, cards: lesson.cards.length };
      }
    }
    return meta;
  };

  return {
    name: 'kiberakademiya:lesson-meta',
    resolveId: (id) => (id === ID ? RESOLVED : null),
    load(id) {
      if (id !== RESOLVED) return null;
      this.addWatchFile(dir);
      return `export default ${JSON.stringify(build())};`;
    },
    handleHotUpdate({ file, server }) {
      if (!file.replace(/\\/g, '/').includes('/src/content/lessons/')) return;
      const mod = server.moduleGraph.getModuleById(RESOLVED);
      if (mod) server.moduleGraph.invalidateModule(mod);
    },
  };
}
