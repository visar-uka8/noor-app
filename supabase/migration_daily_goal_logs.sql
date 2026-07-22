-- Daily progress toward health goals (steps, water, protein)
create table if not exists public.daily_goal_logs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null default current_date,
  steps integer not null default 0,
  water_liters decimal(4, 2) not null default 0,
  protein_grams integer not null default 0,
  updated_at timestamptz not null default now(),
  unique (user_id, date)
);

create index if not exists daily_goal_logs_user_date_idx
  on public.daily_goal_logs (user_id, date desc);

-- Fix older installs that referenced profiles(id) instead of auth.users(id).
alter table public.daily_goal_logs
  drop constraint if exists daily_goal_logs_user_id_fkey;

alter table public.daily_goal_logs
  add constraint daily_goal_logs_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete cascade;

alter table public.daily_goal_logs enable row level security;

drop policy if exists "Users manage own daily goal logs" on public.daily_goal_logs;
create policy "Users manage own daily goal logs"
  on public.daily_goal_logs for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
