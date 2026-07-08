create table if not exists public.notifications_sent (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references auth.users(id) on delete cascade,
  family_email text not null,
  medication_name text not null,
  dose_time text not null check (dose_time in ('morning', 'midday', 'evening')),
  sent_at timestamptz not null default now()
);

create index if not exists notifications_sent_patient_sent_at_idx
  on public.notifications_sent (patient_id, sent_at desc);
