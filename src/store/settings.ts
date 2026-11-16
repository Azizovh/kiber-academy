import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { SpecialityId } from '../content/types';

export type ThemeChoice = 'dark' | 'light' | 'system';

/** Daily study time presets, in minutes. */
export const DAILY_OPTIONS = [30, 60, 120, 180, 240] as const;
export const WEEK_OPTIONS = [3, 4, 5, 6, 7] as const;

export interface Settings {
  name: string;
  dailyMinutes: number;
  daysPerWeek: number;
  theme: ThemeChoice;
  /** Chosen specialisation; null until the learner decides. */
  speciality: SpecialityId | null;
  onboarded: boolean;
  /** Day key of the first launch. */
  startedAt: string | null;
}

interface SettingsStore extends Settings {
  set: (patch: Partial<Settings>) => void;
}

export const SETTINGS_DEFAULTS: Settings = {
  name: '',
  dailyMinutes: 60,
  daysPerWeek: 6,
  theme: 'dark',
  speciality: null,
  onboarded: false,
  startedAt: null,
};

export const useSettings = create<SettingsStore>()(
  persist(
    (set) => ({
      ...SETTINGS_DEFAULTS,
      set: (patch) => set(patch),
    }),
    { name: 'kiberakademiya:settings', version: 1 },
  ),
);
