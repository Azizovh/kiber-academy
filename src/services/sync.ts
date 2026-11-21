import type { User } from '@supabase/supabase-js';
import { TRACKS } from '../content/curriculum';
import { lessonInfo } from '../content/lessons';
import { streak } from '../engine/dates';
import { isEmptyData, mergeData, type SyncData } from '../engine/merge';
import { learningPath, statsOf, topicsOf } from '../engine/progress';
import { useActivity } from '../store/activity';
import { useAuth } from '../store/auth';
import { resetLearningData } from '../store/backup';
import { useCards } from '../store/cards';
import { useNotes } from '../store/notes';
import { useExams } from '../store/exams';
import { PROGRESS_DEFAULTS, useProgress } from '../store/progress';
import { SETTINGS_DEFAULTS, useSettings, type Settings } from '../store/settings';
import { siteUrl, supabase } from './supabase';

/*
 * Cloud sync. One row per learner in `user_state` (see supabase/schema.sql) holds the whole SyncData as JSON, plus a
 * small `summary` the admin page reads. Every save is read-merge-write, so two devices never overwrite each other's
 * progress (rules in engine/merge.ts). Guests and builds without keys never reach this code.
 */

/** Which account this browser's data belongs to; null for a guest. */
const OWNER_KEY = 'kiberakademiya:owner';
const SAVE_DELAY_MS = 2500;
const PULL_INTERVAL_MS = 60_000;

function readOwner(): string | null {
  try {
    return localStorage.getItem(OWNER_KEY);
  } catch {
    return null;
  }
}

function writeOwner(id: string | null): void {
  try {
    if (id) localStorage.setItem(OWNER_KEY, id);
    else localStorage.removeItem(OWNER_KEY);
  } catch {
    // Storage blocked: sync still works for this session.
  }
}

export function readLocal(): SyncData {
  const { set: _set, ...settings } = useSettings.getState();
  const p = useProgress.getState();
  return {
    settings,
    topics: p.topics,
    labs: p.labs,
    ctf: p.ctf,
    days: useActivity.getState().days,
    cards: useCards.getState().cards,
    notes: useNotes.getState().notes,
    exams: useExams.getState().attempts,
  };
}

/** Set while cloud data is written into the stores, so that write is not echoed back as a local change. */
let applying = false;

function applyLocal(d: SyncData): void {
  applying = true;
  try {
    useSettings.setState({ ...SETTINGS_DEFAULTS, ...(d.settings as Partial<Settings>) });
    useProgress.setState({ ...PROGRESS_DEFAULTS, topics: d.topics, labs: d.labs, ctf: d.ctf });
    useActivity.setState({ days: d.days });
    useCards.setState({ cards: d.cards });
    useNotes.setState({ notes: d.notes });
    // The attempt in progress stays on this device; only finished attempts travel.
    useExams.setState({ attempts: d.exams });
  } finally {
    applying = false;
  }
}

/** Fills gaps in a row written by an older app version. */
function normalize(raw: unknown): SyncData | null {
  if (!raw || typeof raw !== 'object') return null;
  const d = raw as Partial<SyncData>;
  return {
    settings: { ...SETTINGS_DEFAULTS, ...(d.settings ?? {}) },
    topics: d.topics ?? {},
    labs: d.labs ?? {},
    ctf: d.ctf ?? {},
    days: d.days ?? {},
    cards: d.cards ?? {},
    notes: d.notes ?? {},
    exams: d.exams ?? {},
  };
}

export interface Summary {
  name: string;
  speciality: string | null;
  topicsDone: number;
  topicsTotal: number;
  ratio: number;
  streak: number;
  minutesTotal: number;
  activeDays: number;
  lastActiveDay: string | null;
  doneTopicIds: string[];
}

/** What the admin page shows, computed here so it never has to load the curriculum logic for every learner. */
export function summarize(d: SyncData): Summary {
  const path = learningPath(TRACKS, d.settings.speciality as Parameters<typeof learningPath>[1]);
  const topics = path.flatMap(topicsOf);
  const stats = statsOf(topics, d.topics, lessonInfo);
  const all = TRACKS.flatMap((t) => t.stages.flatMap(topicsOf));
  const doneTopicIds = all
    .filter((t) => statsOf([t], d.topics, lessonInfo).done === 1)
    .map((t) => t.id);
  const active = Object.entries(d.days).filter(([, v]) => v.seconds > 0 || v.events > 0).map(([k]) => k).sort();
  return {
    name: d.settings.name,
    speciality: d.settings.speciality,
    topicsDone: stats.done,
    topicsTotal: stats.total,
    ratio: Math.round(stats.ratio * 1000) / 1000,
    streak: streak(d.days),
    minutesTotal: Math.round(Object.values(d.days).reduce((s, v) => s + v.seconds, 0) / 60),
    activeDays: active.length,
    lastActiveDay: active.at(-1) ?? null,
    doneTopicIds,
  };
}

function fail(context: string, error: { message: string } | null): boolean {
  if (!error) return false;
  console.warn(`[sync] ${context}: ${error.message}`);
  useAuth.getState().set({ sync: 'error', syncError: `${context}: ${error.message}` });
  return true;
}

async function fetchCloud(userId: string): Promise<SyncData | null | undefined> {
  if (!supabase) return undefined;
  const { data, error } = await supabase.from('user_state').select('data').eq('user_id', userId).maybeSingle();
  if (fail("Ma'lumotni yuklab bo'lmadi", error)) return undefined;
  return normalize(data?.data);
}

async function writeCloud(userId: string, d: SyncData): Promise<boolean> {
  if (!supabase) return false;
  const now = new Date().toISOString();
  const { error } = await supabase
    .from('user_state')
    .upsert({ user_id: userId, data: d, summary: summarize(d), updated_at: now });
  if (fail("Saqlab bo'lmadi", error)) return false;
  // Best effort: the admin list shows when someone was last here.
  void supabase.from('profiles').update({ last_seen_at: now }).eq('id', userId);
  useAuth.getState().set({ sync: 'idle', syncError: null, lastSync: now });
  return true;
}

/** Pull the cloud copy, merge it with this device and save the result on both sides. */
async function syncNow(userId: string): Promise<void> {
  useAuth.getState().set({ sync: 'syncing' });
  const cloud = await fetchCloud(userId);
  if (cloud === undefined) return;
  const local = readLocal();
  const merged = cloud ? mergeData(cloud, local) : local;
  applyLocal(merged);
  await writeCloud(userId, merged);
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleSave(): void {
  const { user } = useAuth.getState();
  if (applying || !user) return;
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveTimer = null;
    void syncNow(user.id);
  }, SAVE_DELAY_MS);
}

/**
 * First load after sign-in. A guest's progress is attached to the account; data cached for a different account is
 * never mixed in — that browser simply starts from this account's cloud copy.
 */
async function hydrate(userId: string): Promise<void> {
  useAuth.getState().set({ sync: 'syncing' });
  const cloud = await fetchCloud(userId);
  if (cloud === undefined) return;
  const owner = readOwner();
  const local = owner && owner !== userId ? null : readLocal();
  let next: SyncData;
  if (!local || isEmptyData(local)) next = cloud ?? readLocal();
  else next = cloud ? mergeData(cloud, local) : local;
  if (owner && owner !== userId) resetLearningData();
  applyLocal(next);
  writeOwner(userId);
  await writeCloud(userId, next);
}

async function onUser(user: User): Promise<void> {
  if (!supabase) return;
  const { data } = await supabase.from('profiles').select('display_name, is_admin').eq('id', user.id).maybeSingle();
  const meta = user.user_metadata as Record<string, unknown> | undefined;
  const name =
    (data?.display_name as string | null | undefined) ??
    (meta?.full_name as string | undefined) ??
    (meta?.name as string | undefined) ??
    user.email?.split('@')[0] ??
    '';
  useAuth.getState().set({
    status: 'user',
    user: { id: user.id, email: user.email ?? '', name, isAdmin: data?.is_admin === true },
  });
  await hydrate(user.id);
  // A Google account brings a name; use it when the learner has not typed one.
  if (!useSettings.getState().name && name) useSettings.getState().set({ name });
}

/** Removes `?code=` (PKCE) or `?error=` from the address bar after Supabase has read it. */
function cleanUrl(): void {
  const url = new URL(window.location.href);
  if (!url.searchParams.has('code') && !url.searchParams.has('error')) return;
  if (url.searchParams.get('error_description')) {
    useAuth.getState().set({ syncError: url.searchParams.get('error_description') });
  }
  ['code', 'error', 'error_code', 'error_description'].forEach((k) => url.searchParams.delete(k));
  window.history.replaceState(null, '', url.pathname + url.search + url.hash);
}

let started = false;

/** Wire up auth once, at app start. */
export function initSync(): void {
  if (started) return;
  started = true;
  if (!supabase) {
    useAuth.getState().set({ status: 'disabled' });
    return;
  }
  let currentId: string | null = null;
  supabase.auth.onAuthStateChange((event, session) => {
    // The link from a "forgot password" email signs the learner in; the account page then asks for a new password.
    if (event === 'PASSWORD_RECOVERY') useAuth.getState().set({ recovery: true });
    const user = session?.user ?? null;
    if (!user) {
      currentId = null;
      useAuth.getState().set({ status: 'guest', user: null, sync: 'idle' });
      cleanUrl();
      return;
    }
    // Token refreshes fire this too; only hydrate when the person changes.
    if (user.id === currentId) return;
    currentId = user.id;
    cleanUrl();
    // Supabase warns against awaiting its own client inside this callback.
    setTimeout(() => void onUser(user), 0);
  });

  for (const store of [useSettings, useProgress, useActivity, useCards, useNotes, useExams] as const) {
    (store as { subscribe: (fn: () => void) => () => void }).subscribe(scheduleSave);
  }

  // Coming back to the tab picks up what another device saved meanwhile.
  let lastPull = 0;
  document.addEventListener('visibilitychange', () => {
    const { user } = useAuth.getState();
    if (document.visibilityState !== 'visible' || !user || Date.now() - lastPull < PULL_INTERVAL_MS) return;
    lastPull = Date.now();
    void syncNow(user.id);
  });
}

export async function syncManually(): Promise<void> {
  const { user } = useAuth.getState();
  if (user) await syncNow(user.id);
}

/** The reset button: clears this device and overwrites the cloud copy, instead of merging old progress back. */
export async function resetEverywhere(): Promise<void> {
  resetLearningData();
  const { user } = useAuth.getState();
  if (user) await writeCloud(user.id, readLocal());
}

// ── Sign-in actions. Errors are thrown with Uzbek messages for the forms. ──

const MESSAGES: [RegExp, string][] = [
  [/invalid login credentials/i, "Email yoki parol noto'g'ri."],
  [/email not confirmed/i, "Email hali tasdiqlanmagan. Pochtangizdagi havolani bosing."],
  [/user already registered/i, "Bu email bilan akkaunt allaqachon bor. Kirish bo'limidan foydalaning."],
  [/password should be at least/i, "Parol kamida 8 belgidan iborat bo'lsin."],
  [/rate limit|too many/i, "Juda ko'p urinish. Bir necha daqiqadan keyin qayta urinib ko'ring."],
  [/unable to validate email|invalid email/i, "Email manzili noto'g'ri."],
  [/failed to fetch|network/i, "Internetga ulanib bo'lmadi."],
];

function uz(message: string): Error {
  return new Error(MESSAGES.find(([re]) => re.test(message))?.[1] ?? message);
}

function client() {
  if (!supabase) throw new Error("Akkauntlar bu nusxada sozlanmagan.");
  return supabase;
}

export async function signUp(email: string, password: string, name: string): Promise<{ needsConfirmation: boolean }> {
  const { data, error } = await client().auth.signUp({
    email,
    password,
    options: { data: { full_name: name }, emailRedirectTo: siteUrl() },
  });
  if (error) throw uz(error.message);
  return { needsConfirmation: !data.session };
}

export async function signIn(email: string, password: string): Promise<void> {
  const { error } = await client().auth.signInWithPassword({ email, password });
  if (error) throw uz(error.message);
}

export async function signInWithGoogle(): Promise<void> {
  const { error } = await client().auth.signInWithOAuth({ provider: 'google', options: { redirectTo: siteUrl() } });
  if (error) throw uz(error.message);
}

export async function sendPasswordReset(email: string): Promise<void> {
  const { error } = await client().auth.resetPasswordForEmail(email, { redirectTo: siteUrl() });
  if (error) throw uz(error.message);
}

export async function updatePassword(password: string): Promise<void> {
  const { error } = await client().auth.updateUser({ password });
  if (error) throw uz(error.message);
}

/** The next person at this device starts clean; their pace and theme stay. */
export async function signOut(): Promise<void> {
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
    const { user } = useAuth.getState();
    if (user) await syncNow(user.id);
  }
  await supabase?.auth.signOut();
  applying = true;
  try {
    resetLearningData();
  } finally {
    applying = false;
  }
  writeOwner(null);
}
