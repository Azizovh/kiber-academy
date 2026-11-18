import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Per-device interface preferences. Deliberately not part of cloud sync: a narrow laptop and a wide monitor want
 * different layouts.
 */
interface UiStore {
  /** The learner's own choice for ordinary pages. */
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
}

export const useUi = create<UiStore>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
    }),
    { name: 'kiberakademiya:ui', version: 1 },
  ),
);
