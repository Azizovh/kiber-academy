import type { ShellInit, CustomCommand, ShellState } from '../engine/terminal/shell';
import type { SiemLang, SiemResult } from '../engine/siem/types';
import type { Runtime } from '../engine/runtime';

export type TrackId = 'foundation' | 'pentest' | 'soc' | 'appsec' | 'cloud' | 'career';

/** The four specialisations a learner picks one of after the foundation. */
export type SpecialityId = Exclude<TrackId, 'foundation' | 'career'>;

export type ResourceKind = 'video' | 'course' | 'article' | 'docs' | 'lab' | 'book' | 'tool';

export interface Resource {
  title: string;
  url: string;
  kind: ResourceKind;
  /** Language of the resource; most of the field's material is English. */
  lang?: 'en' | 'ru' | 'uz';
  note?: string;
}

export interface Topic {
  id: string;
  title: string;
  summary: string;
  /** Full study time: lesson + external practice. Every estimate derives from it. */
  minutes: number;
  /** "I can ..." statements: learning objectives and the self-check list. */
  goals: string[];
  resources: Resource[];
  labs?: string[];
  ctf?: string[];
}

export interface Module {
  id: string;
  title: string;
  topics: Topic[];
}

export interface Stage {
  id: string;
  track: TrackId;
  title: string;
  summary: string;
  /** What the learner can do once the stage is finished. */
  outcome: string;
  modules: Module[];
}

export interface Track {
  id: TrackId;
  title: string;
  short: string;
  summary: string;
  /** Typical first jobs this track leads to. */
  jobs: string[];
  stages: Stage[];
}

/* ── lessons ─────────────────────────────────────────────────────────── */

export type CalloutKind = 'tip' | 'info' | 'warn' | 'key' | 'try';

export interface QuizQuestion {
  text: string;
  options: { text: string; correct: boolean }[];
  explanation?: string;
}

export interface Flashcard {
  id: string;
  topicId: string;
  front: string;
  back: string;
}

export type LessonSegment =
  | { type: 'md'; text: string }
  | { type: 'callout'; kind: CalloutKind; text: string }
  | { type: 'lab'; labId: string };

export interface Lesson {
  topicId: string;
  segments: LessonSegment[];
  quiz: QuizQuestion[];
  cards: Flashcard[];
  /** Rough reading time of the lesson text itself, in minutes. */
  readMinutes: number;
}

/* ── practice ────────────────────────────────────────────────────────── */

export interface LabCheckCtx {
  state: ShellState;
  /** The command line just executed. */
  line: string;
  /** Its output. */
  output: string;
  /** Every command line executed in this lab run, oldest first. SIEM searches appear as "spl> query" / "kql> query". */
  lines: string[];
  /** Set when the action was a search in the SIEM pane (then `line` is the query and `output` its resultText). */
  siem?: { lang: SiemLang; query: string; result: SiemResult };
}

/** Panes a lab or CTF shows: the terminal, the SIEM search screen, or both as tabs. */
export type Pane = 'terminal' | 'siem' | 'editor';

/** The code editor pane: which directory it lists and which file it opens first. */
export interface EditorSpec {
  root: string;
  open?: string;
}

export interface LabTask {
  id: string;
  text: string;
  hint: string;
  /**
   * Commands or flags this task uses for the first time, explained above the task before the learner starts:
   * "ls" (the command), "ls -a" (one flag of it).
   */
  teach?: string[];
  /** A final, independent task: several commands combined, the hint only on request. */
  challenge?: boolean;
  /** One command line (or several) that solves the task; used by tests. */
  solution: string[];
  check: (ctx: LabCheckCtx) => boolean;
  /** When the check fails, an explanation shown under the command (e.g. which hidden test failed); null shows nothing. */
  feedback?: (ctx: LabCheckCtx) => string | null;
}

export interface Lab {
  id: string;
  title: string;
  summary: string;
  minutes: number;
  level: 1 | 2 | 3;
  intro: string;
  shell: () => ShellInit;
  commands?: Record<string, CustomCommand>;
  /** Defaults to ['terminal']. A SIEM pane needs `shell().siem`. The first pane opens first. */
  panes?: Pane[];
  /** Needed by the 'editor' pane. */
  editor?: EditorSpec;
  /** WebAssembly runtimes loaded before the shell is created (sqlite3 needs 'sql'). */
  runtimes?: Runtime[];
  tasks: LabTask[];
}

export type CtfCategory = 'kodlash' | 'kripto' | 'linux' | 'windows' | 'tarmoq' | 'web' | 'forensics' | 'loglar' | 'cloud';

export interface CtfChallenge {
  id: string;
  title: string;
  category: CtfCategory;
  level: 1 | 2 | 3;
  /** Markdown. */
  description: string;
  /** Text the learner has to work on (shown in a copyable block). */
  data?: string;
  hints: string[];
  /** cyrb53 hash of the trimmed, lower-cased flag. */
  flagHash: string;
  shell?: () => ShellInit;
  /** Defaults to ['terminal'] when there is a shell. */
  panes?: Pane[];
  editor?: EditorSpec;
  runtimes?: Runtime[];
}

export interface GlossaryTerm {
  id: string;
  term: string;
  /** Uzbek name when there is a natural one. */
  uz?: string;
  text: string;
  category: 'umumiy' | 'tarmoq' | 'tizim' | 'hujum' | 'himoya' | 'kripto' | 'web' | 'dasturlash';
}

export interface InterviewQuestion {
  id: string;
  track: TrackId | 'umumiy';
  level: 'junior' | 'middle';
  question: string;
  /** Markdown. */
  answer: string;
}
