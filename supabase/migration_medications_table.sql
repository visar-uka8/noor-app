-- Run in Supabase SQL Editor to enable user-managed medications.

create table if not exists public.medications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  dosage text not null,
  times jsonb not null default '[]'::jsonb,
  frequency text default 'ONCE_DAILY',
  start_date date not null default current_date,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists medications_user_active_idx
  on public.medications (user_id, is_active, created_at);

alter table public.medication_confirmations
  add column if not exists medication_id uuid references public.medications(id) on delete set null;

create unique index if not exists medication_confirmations_user_med_scheduled_idx
  on public.medication_confirmations (user_id, medication_id, scheduled_at)
  where medication_id is not null;

alter table public.medications enable row level security;

drop policy if exists "Users manage own medications" on public.medications;
drop policy if exists "Users can insert own medications" on public.medications;
drop policy if exists "Users can read own medications" on public.medications;
drop policy if exists "Users can update own medications" on public.medications;
drop policy if exists "Users can delete own medications" on public.medications;

create policy "Users can insert own medications"
  on public.medications for insert
  with check (auth.uid() = user_id);

create policy "Users can read own medications"
  on public.medications for select
  using (auth.uid() = user_id);

create policy "Users can update own medications"
  on public.medications for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own medications"
  on public.medications for delete
  using (auth.uid() = user_id);
