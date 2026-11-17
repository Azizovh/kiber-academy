import type { Summary } from './sync';
import { supabase } from './supabase';

export interface AdminRow {
  id: string;
  email: string;
  name: string;
  createdAt: string;
  lastSeenAt: string | null;
  isAdmin: boolean;
  summary: Summary | null;
}

/**
 * Every learner with their progress summary. Row-level security lets only accounts with `is_admin = true` read other
 * people's rows; for anyone else this returns just their own row.
 */
export async function fetchLearners(): Promise<AdminRow[]> {
  if (!supabase) return [];
  const [profiles, states] = await Promise.all([
    supabase.from('profiles').select('id, email, display_name, created_at, last_seen_at, is_admin'),
    supabase.from('user_state').select('user_id, summary'),
  ]);
  if (profiles.error) throw new Error(profiles.error.message);
  if (states.error) throw new Error(states.error.message);
  const summaries = new Map((states.data ?? []).map((s) => [s.user_id as string, s.summary as Summary | null]));
  return (profiles.data ?? [])
    .map((p) => ({
      id: p.id as string,
      email: (p.email as string | null) ?? '',
      name: (p.display_name as string | null) ?? '',
      createdAt: p.created_at as string,
      lastSeenAt: (p.last_seen_at as string | null) ?? null,
      isAdmin: p.is_admin === true,
      summary: summaries.get(p.id as string) ?? null,
    }))
    .sort((a, b) => (b.lastSeenAt ?? b.createdAt).localeCompare(a.lastSeenAt ?? a.createdAt));
}
