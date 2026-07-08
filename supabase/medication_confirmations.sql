create table if not exists public.medication_confirmations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  medication_name text not null,
  dose_time text not null check (dose_time in ('morning', 'midday', 'evening')),
  scheduled_at timestamptz not null,
  confirmed_at timestamptz,
  missed boolean not null default false,
  created_at timestamptz not null default now(),
  unique (user_id, medication_name, dose_time, scheduled_at)
);

alter table public.medication_confirmations
  alter column confirmed_at drop not null;

alter table public.medication_confirmations
  add column if not exists missed boolean not null default false;

create index if not exists medication_confirmations_user_scheduled_idx
  on public.medication_confirmations (user_id, scheduled_at desc);
