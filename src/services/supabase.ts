import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * The client wants the bare project URL (https://xxxx.supabase.co). The dashboard also shows the REST endpoint
 * (…/rest/v1/), which is easy to copy by mistake and makes every request fail — so keep only the origin.
 */
function projectUrl(raw: string | undefined): string | undefined {
  const value = raw?.trim();
  if (!value) return undefined;
  try {
    return new URL(value).origin;
  } catch {
    console.warn('[supabase] VITE_SUPABASE_URL is not a valid URL — running in local mode.');
    return undefined;
  }
}

const url = projectUrl(import.meta.env.VITE_SUPABASE_URL as string | undefined);
const anonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim();

/**
 * null when the build has no Supabase keys — the app then stays local-only, exactly as before.
 * PKCE returns the sign-in result as `?code=` in the query string; the default implicit flow would put tokens in the
 * URL hash, which HashRouter owns.
 */
export const supabase: SupabaseClient | null =
  url && anonKey ? createClient(url, anonKey, { auth: { flowType: 'pkce', detectSessionInUrl: true } }) : null;

export const cloudEnabled = supabase !== null;

/** The Electron window: Google sign-in cannot return to a file:// page, so it offers email and password only. */
export const isDesktop = typeof navigator !== 'undefined' && navigator.userAgent.includes('Electron');

/**
 * Where confirmation and Google links send the learner back. The desktop app has no web address, so it uses the
 * public site (VITE_SITE_URL). Every address must be listed in Supabase → Authentication → URL Configuration.
 */
export function siteUrl(): string | undefined {
  const configured = (import.meta.env.VITE_SITE_URL as string | undefined)?.trim();
  if (window.location.protocol.startsWith('http')) return window.location.origin + window.location.pathname;
  return configured || undefined;
}
