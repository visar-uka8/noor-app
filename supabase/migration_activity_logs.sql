-- Daily activity logs for patients.
-- Run in Supabase SQL Editor if activity save fails.

create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null default current_date,
  activity_type text not null,
  duration_minutes integer,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists activity_logs_user_created_idx
  on public.activity_logs (user_id, date desc);

create index if not exists activity_logs_user_date_created_idx
  on public.activity_logs (user_id, date, created_at);

-- Allow multiple activities per day (safe if constraint was never added).
alter table public.activity_logs
  drop constraint if exists activity_logs_user_id_date_key;

drop index if exists activity_logs_user_date_idx;

-- Fix older installs that referenced profiles(id) instead of auth.users(id).
alter table public.activity_logs
  drop constraint if exists activity_logs_user_id_fkey;

alter table public.activity_logs
  add constraint activity_logs_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete cascade;

alter table public.activity_logs enable row level security;

drop policy if exists "Users can insert own activity logs" on public.activity_logs;
drop policy if exists "Users can select own activity logs" on public.activity_logs;
drop policy if exists "Users can update own activity logs" on public.activity_logs;
drop policy if exists "Users can delete own activity logs" on public.activity_logs;
drop policy if exists "Users can insert own activity" on public.activity_logs;
drop policy if exists "Users can read own activity" on public.activity_logs;
drop policy if exists "Users can update own activity" on public.activity_logs;
drop policy if exists "Users can delete own activity" on public.activity_logs;

create policy "Users can insert own activity"
  on public.activity_logs for insert
  with check (auth.uid() = user_id);

create policy "Users can read own activity"
  on public.activity_logs for select
  using (auth.uid() = user_id);

create policy "Users can update own activity"
  on public.activity_logs for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own activity"
  on public.activity_logs for delete
  using (auth.uid() = user_id);
