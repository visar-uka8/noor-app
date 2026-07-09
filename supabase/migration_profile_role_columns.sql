-- Ensures profiles supports role selection during registration.
-- Run once in the Supabase SQL Editor.

alter table public.profiles
  add column if not exists role text default 'patient';

alter table public.profiles
  add column if not exists user_type text default 'patient';

alter table public.profiles
  alter column date_of_birth drop not null;

alter table public.profiles
  add column if not exists elder_mode boolean not null default false;

alter table public.profiles
  add column if not exists language text not null default 'de';

alter table public.profiles
  add column if not exists notification_preferences jsonb not null default '{"medications": true, "labResults": true, "family": true}'::jsonb;

-- Keep user_type in sync with role for legacy readers.
update public.profiles
set user_type = role
where user_type is distinct from role;

alter table public.profiles enable row level security;

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists "Users manage own profile" on public.profiles;
create policy "Users manage own profile"
  on public.profiles for all
  using (auth.uid() = id)
  with check (auth.uid() = id);
