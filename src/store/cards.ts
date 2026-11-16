import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { newCard, review, type CardState, type Grade } from '../engine/srs';

export interface CardsData {
  cards: Record<string, CardState | undefined>;
}

interface CardsStore extends CardsData {
  /** Put cards into the review queue (no-op for cards already there). */
  unlock: (ids: string[]) => void;
  grade: (id: string, grade: Grade) => void;
  reset: () => void;
}

export const useCards = create<CardsStore>()(
  persist(
    (set) => ({
      cards: {},
      unlock: (ids) =>
        set((s) => {
          const fresh = ids.filter((id) => !s.cards[id]);
          if (!fresh.length) return s;
          const cards = { ...s.cards };
          for (const id of fresh) cards[id] = newCard();
          return { cards };
        }),
      grade: (id, grade) =>
        set((s) => {
          const card = s.cards[id];
          if (!card) return s;
          return { cards: { ...s.cards, [id]: review(card, grade) } };
        }),
      reset: () => set({ cards: {} }),
    }),
    { name: 'kiberakademiya:cards', version: 1 },
  ),
);
