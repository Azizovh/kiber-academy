import type { CustomCommand, ShellInit } from '../engine/terminal/shell';
import type { Runtime } from '../engine/runtime';
import type { EditorSpec, LabCheckCtx, Pane, TrackId } from './types';

/** A part of a track an exam reports a score for (and recommends lessons from). */
export interface ExamTopic {
  id: string;
  title: string;
  /** Roadmap stage ids whose lessons and labs belong to this part. */
  stages: string[];
}

export interface ExamQuestion {
  id: string;
  topic: string;
  /** Markdown (code spans, short code blocks). */
  text: string;
  options: { text: string; correct: boolean }[];
  explanation: string;
}

export interface ExamTask {
  id: string;
  text: string;
  solution: string[];
  check: (ctx: LabCheckCtx) => boolean;
}

/** A short timed investigation: like a lab, without hints or teaching notes. */
export interface ExamPractical {
  id: string;
  topic: string;
  title: string;
  /** Markdown: the situation and what is where. */
  intro: string;
  shell: () => ShellInit;
  commands?: Record<string, CustomCommand>;
  panes?: Pane[];
  editor?: EditorSpec;
  runtimes?: Runtime[];
  tasks: ExamTask[];
}

export interface Exam {
  id: TrackId;
  title: string;
  summary: string;
  topics: ExamTopic[];
  questions: ExamQuestion[];
  practicals: ExamPractical[];
}
