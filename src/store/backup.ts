import { useActivity, type ActivityData } from './activity';
import { useCards, type CardsData } from './cards';
import { useNotes, type NotesData } from './notes';
import { useExams } from './exams';
import type { ExamAttempt } from './exams';
import { PROGRESS_DEFAULTS, useProgress, type ProgressData } from './progress';
import { SETTINGS_DEFAULTS, useSettings, type Settings } from './settings';

export interface Backup {
  app: 'kiberakademiya';
  version: 1;
  exportedAt: string;
  settings: Settings;
  progress: ProgressData;
  activity: ActivityData;
  cards: CardsData;
  notes: NotesData;
  /** Finished exam attempts (added in v1.19; older backups have none). */
  exams?: Record<string, ExamAttempt[] | undefined>;
}

export function createBackup(): Backup {
  const { set: _set, ...settings } = useSettings.getState();
  const p = useProgress.getState();
  return {
    app: 'kiberakademiya',
    version: 1,
    exportedAt: new Date().toISOString(),
    settings,
    progress: { topics: p.topics, labs: p.labs, ctf: p.ctf },
    activity: { days: useActivity.getState().days },
    cards: { cards: useCards.getState().cards },
    notes: { notes: useNotes.getState().notes },
    exams: useExams.getState().attempts,
  };
}

/** Throws with an Uzbek message when the file is not a KiberAkademiya backup. */
export function restoreBackup(raw: string): void {
  let data: Partial<Backup>;
  try {
    data = JSON.parse(raw) as Partial<Backup>;
  } catch {
    throw new Error("Fayl o'qilmadi: bu JSON fayl emas.");
  }
  if (data.app !== 'kiberakademiya' || !data.progress || !data.settings) {
    throw new Error("Bu KiberAkademiya zaxira fayli emas.");
  }
  useSettings.setState({ ...SETTINGS_DEFAULTS, ...data.settings });
  useProgress.setState({ ...PROGRESS_DEFAULTS, ...data.progress });
  useActivity.setState({ days: data.activity?.days ?? {} });
  useCards.setState({ cards: data.cards?.cards ?? {} });
  useNotes.setState({ notes: data.notes?.notes ?? {} });
  useExams.setState({ attempts: data.exams ?? {}, active: null });
}

export function downloadBackup(): void {
  const blob = new Blob([JSON.stringify(createBackup(), null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `kiberakademiya-zaxira-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/** Wipe learning data; the profile (name, pace, theme) stays. */
export function resetLearningData(): void {
  useProgress.getState().reset();
  useActivity.getState().reset();
  useCards.getState().reset();
  useNotes.getState().reset();
  useExams.getState().reset();
}
