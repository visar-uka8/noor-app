-- One-shot fix for lab_results save failures.
-- Run in Supabase SQL Editor.

-- 1) Table + columns
create table if not exists public.lab_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  file_url text not null,
  ai_analysis text not null,
  normal_count integer not null default 0,
  watch_count integer not null default 0,
  high_count integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.lab_results
  add column if not exists normal_count integer not null default 0;

alter table public.lab_results
  add column if not exists watch_count integer not null default 0;

alter table public.lab_results
  add column if not exists high_count integer not null default 0;

create index if not exists lab_results_user_created_idx
  on public.lab_results (user_id, created_at desc);

-- 2) RLS policies
alter table public.lab_results enable row level security;

drop policy if exists "Users manage own lab results" on public.lab_results;
drop policy if exists "Users can insert own lab results" on public.lab_results;
drop policy if exists "Users can read own lab results" on public.lab_results;
drop policy if exists "Users can select own lab results" on public.lab_results;
drop policy if exists "Users can update own lab results" on public.lab_results;
drop policy if exists "Users can delete own lab results" on public.lab_results;

create policy "Users can insert own lab results"
  on public.lab_results for insert
  with check (auth.uid() = user_id);

create policy "Users can select own lab results"
  on public.lab_results for select
  using (auth.uid() = user_id);

create policy "Users can update own lab results"
  on public.lab_results for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own lab results"
  on public.lab_results for delete
  using (auth.uid() = user_id);

-- 3) Verify (copy output back to Cursor)
-- SELECT column_name, data_type, is_nullable, column_default
-- FROM information_schema.columns
-- WHERE table_schema = 'public' AND table_name = 'lab_results'
-- ORDER BY ordinal_position;

-- SELECT policyname, cmd, qual, with_check
-- FROM pg_policies
-- WHERE schemaname = 'public' AND tablename = 'lab_results';
