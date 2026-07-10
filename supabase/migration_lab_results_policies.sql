-- Lab results RLS policies (run in Supabase SQL Editor if inserts/selects fail).

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
