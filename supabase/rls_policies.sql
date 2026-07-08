-- Row Level Security for Noor core tables.
-- Run after creating tables in setup-all.sql.

alter table public.profiles enable row level security;
alter table public.medication_confirmations enable row level security;
alter table public.lab_results enable row level security;
alter table public.health_passports enable row level security;
alter table public.family_links enable row level security;
alter table public.family_invites enable row level security;
alter table public.notifications_sent enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.notifications enable row level security;

drop policy if exists "Users manage own profile" on public.profiles;
create policy "Users manage own profile"
  on public.profiles for all
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists "Users manage own medication confirmations" on public.medication_confirmations;
create policy "Users manage own medication confirmations"
  on public.medication_confirmations for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users manage own lab results" on public.lab_results;
create policy "Users manage own lab results"
  on public.lab_results for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users manage own health passport" on public.health_passports;
create policy "Users manage own health passport"
  on public.health_passports for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users view own family links" on public.family_links;
create policy "Users view own family links"
  on public.family_links for select
  using (auth.uid() = patient_id or auth.uid() = family_member_id);

drop policy if exists "Patients manage family links" on public.family_links;
create policy "Patients manage family links"
  on public.family_links for insert
  with check (auth.uid() = patient_id);

drop policy if exists "Patients update family links" on public.family_links;
create policy "Patients update family links"
  on public.family_links for update
  using (auth.uid() = patient_id);

drop policy if exists "Patients manage family invites" on public.family_invites;
create policy "Patients manage family invites"
  on public.family_invites for all
  using (auth.uid() = patient_id)
  with check (auth.uid() = patient_id);

drop policy if exists "Users manage own push subscriptions" on public.push_subscriptions;
create policy "Users manage own push subscriptions"
  on public.push_subscriptions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users manage own notifications" on public.notifications;
create policy "Users manage own notifications"
  on public.notifications for all
  using (auth.uid()::text = user_id)
  with check (auth.uid()::text = user_id);
