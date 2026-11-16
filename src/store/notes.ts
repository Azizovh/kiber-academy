import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Note {
  text: string;
  /** ISO timestamp. */
  updatedAt: string;
}

export interface NotesData {
  notes: Record<string, Note | undefined>;
}

interface NotesStore extends NotesData {
  setNote: (topicId: string, text: string) => void;
  reset: () => void;
}

export const useNotes = create<NotesStore>()(
  persist(
    (set) => ({
      notes: {},
      setNote: (topicId, text) =>
        set((s) => {
          const notes = { ...s.notes };
          if (text.trim()) notes[topicId] = { text, updatedAt: new Date().toISOString() };
          else delete notes[topicId];
          return { notes };
        }),
      reset: () => set({ notes: {} }),
    }),
    { name: 'kiberakademiya:notes', version: 1 },
  ),
);
