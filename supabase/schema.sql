-- KiberAkademiya — Supabase schema.
-- Run once in Supabase → SQL Editor → New query → paste → Run. Safe to run again.

-- ── Profiles: one row per account, created automatically on sign-up ──────────────────────────────────────────────
create table if not exists public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  email        text,
  display_name text,
  is_admin     boolean not null default false,
  created_at   timestamptz not null default now(),
  last_seen_at timestamptz
);

-- ── Learning data: the whole local state as JSON, plus a summary for the admin page ──────────────────────────────
create table if not exists public.user_state (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  data       jsonb not null,
  summary    jsonb,
  updated_at timestamptz not null default now()
);

alter table public.profiles   enable row level security;
alter table public.user_state enable row level security;

-- security definer: reads profiles without going through its own policies (avoids recursion).
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false);
$$;

-- Profiles: everyone sees their own row, admins see all.
drop policy if exists "profiles: read own or admin" on public.profiles;
create policy "profiles: read own or admin" on public.profiles
  for select using (id = auth.uid() or public.is_admin());

drop policy if exists "profiles: update own" on public.profiles;
create policy "profiles: update own" on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

-- Nobody can make themselves admin from the app: only these columns are writable by signed-in users.
revoke update on public.profiles from authenticated, anon;
grant update (display_name, last_seen_at) on public.profiles to authenticated;

-- Learning data: only the owner writes; the owner and admins read.
drop policy if exists "state: read own or admin" on public.user_state;
create policy "state: read own or admin" on public.user_state
  for select using (user_id = auth.uid() or public.is_admin());

drop policy if exists "state: insert own" on public.user_state;
create policy "state: insert own" on public.user_state
  for insert with check (user_id = auth.uid());

drop policy if exists "state: update own" on public.user_state;
create policy "state: update own" on public.user_state
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ── Create a profile for every new account (email or Google) ──────────────────────────────────────────────────────
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Accounts created before this script ran.
insert into public.profiles (id, email, display_name)
select id, email, coalesce(raw_user_meta_data ->> 'full_name', raw_user_meta_data ->> 'name')
from auth.users
on conflict (id) do nothing;

-- ── Make yourself admin (after you have signed in once). Replace the email and run this line alone: ────────────────
-- update public.profiles set is_admin = true where email = 'sizning@email.com';
