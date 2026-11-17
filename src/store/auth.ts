import { create } from 'zustand';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  isAdmin: boolean;
}

/**
 * disabled — the build has no Supabase keys, the app is local-only
 * loading  — checking for an existing session
 * guest    — cloud available, nobody signed in
 * user     — signed in
 */
export type AuthStatus = 'disabled' | 'loading' | 'guest' | 'user';

/** idle — nothing pending; syncing — a request is running; error — the last request failed (see `syncError`). */
export type SyncStatus = 'idle' | 'syncing' | 'error';

interface AuthStore {
  status: AuthStatus;
  user: AuthUser | null;
  sync: SyncStatus;
  syncError: string | null;
  /** ISO time of the last successful save or load. */
  lastSync: string | null;
  /** Arrived through a password-reset link: show the "new password" form. */
  recovery: boolean;
  set: (patch: Partial<Omit<AuthStore, 'set'>>) => void;
}

export const useAuth = create<AuthStore>()((set) => ({
  status: 'loading',
  user: null,
  sync: 'idle',
  syncError: null,
  lastSync: null,
  recovery: false,
  set: (patch) => set(patch),
}));
