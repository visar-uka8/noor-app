create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  missed_dose_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists push_subscriptions_user_id_idx
  on public.push_subscriptions (user_id);

create table if not exists public.push_notifications_sent (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references auth.users(id) on delete cascade,
  family_member_id uuid not null references auth.users(id) on delete cascade,
  medication_name text not null,
  dose_time text not null check (dose_time in ('morning', 'midday', 'evening')),
  sent_at timestamptz not null default now()
);

create index if not exists push_notifications_sent_patient_sent_at_idx
  on public.push_notifications_sent (patient_id, sent_at desc);
