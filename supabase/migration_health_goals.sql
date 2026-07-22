-- Personal daily health goals calculated from lab analyses
create table if not exists public.health_goals (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  lab_result_id uuid references public.lab_results(id) on delete set null,
  steps_goal integer,
  water_goal_liters decimal(4, 2),
  protein_goal_grams integer,
  sleep_hours_min integer,
  sleep_hours_max integer,
  calculated_at timestamptz not null default now(),
  valid_until timestamptz
);

create index if not exists health_goals_user_id_idx
  on public.health_goals (user_id);

create index if not exists health_goals_lab_result_id_idx
  on public.health_goals (lab_result_id);

create index if not exists health_goals_valid_until_idx
  on public.health_goals (user_id, valid_until desc);

alter table public.health_goals enable row level security;

drop policy if exists "Users manage own health goals" on public.health_goals;
create policy "Users manage own health goals"
  on public.health_goals for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
