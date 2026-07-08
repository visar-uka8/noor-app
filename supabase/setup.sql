-- Noor database setup. Run this once in Supabase SQL Editor.

-- >>> profiles.sql
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  first_name text not null,
  last_name text not null,
  date_of_birth date,
  role text not null,
  elder_mode boolean not null default false,
  language text not null default 'de',
  created_at timestamptz not null default now()
);

create index if not exists profiles_role_idx
  on public.profiles (role);

alter table public.profiles
  add column if not exists phone text;

alter table public.profiles
  add column if not exists last_check_in_at timestamptz;

alter table public.profiles
  add column if not exists notification_preferences jsonb not null default '{"medications": true, "labResults": true, "family": true}'::jsonb;

-- >>> medication_confirmations.sql
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

-- >>> notifications.sql
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  type text not null,
  title text not null,
  body text not null,
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create index if not exists notifications_user_id_created_at_idx
  on public.notifications (user_id, created_at desc);

-- >>> notifications_sent.sql
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

-- >>> lab_results.sql
create table if not exists public.lab_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  file_url text not null,
  ai_analysis text not null,
  created_at timestamptz not null default now()
);

create index if not exists lab_results_user_created_idx
  on public.lab_results (user_id, created_at desc);

-- >>> lab_results_storage.sql
insert into storage.buckets (id, name, public)
values ('lab-results', 'lab-results', false)
on conflict (id) do nothing;

create policy "Users can upload their own lab results"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'lab-results'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Users can view their own lab results"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'lab-results'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- >>> health_passports.sql
create table if not exists public.health_passports (
  user_id uuid primary key references auth.users(id) on delete cascade,
  personal jsonb not null,
  medications jsonb not null default '[]'::jsonb,
  allergies jsonb not null default '[]'::jsonb,
  surgeries jsonb not null default '[]'::jsonb,
  emergency_contact jsonb not null,
  updated_at timestamptz not null default now()
);

create index if not exists health_passports_updated_at_idx
  on public.health_passports (updated_at desc);

-- >>> health_passport_shares.sql
create table if not exists public.health_passport_shares (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references auth.users(id) on delete cascade,
  token text not null unique,
  expires_at timestamptz not null,
  viewed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists health_passport_shares_token_idx
  on public.health_passport_shares (token);

create index if not exists health_passport_shares_patient_id_idx
  on public.health_passport_shares (patient_id, created_at desc);

-- >>> family_invites.sql
create table if not exists public.family_invites (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references auth.users(id) on delete cascade,
  code text not null unique,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  used boolean not null default false
);

create index if not exists family_invites_patient_id_created_at_idx
  on public.family_invites (patient_id, created_at desc);

create index if not exists family_invites_code_idx
  on public.family_invites (code);

-- >>> family_links.sql
create table if not exists public.family_links (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references auth.users(id) on delete cascade,
  family_member_id uuid not null references auth.users(id) on delete cascade,
  relationship text not null,
  created_at timestamptz not null default now(),
  active boolean not null default true,
  unique (patient_id, family_member_id)
);

create index if not exists family_links_patient_id_idx
  on public.family_links (patient_id);

create index if not exists family_links_family_member_id_idx
  on public.family_links (family_member_id);

-- >>> family_dashboard_realtime.sql
alter publication supabase_realtime add table public.medication_confirmations;
alter publication supabase_realtime add table public.lab_results;
alter publication supabase_realtime add table public.profiles;

-- >>> push_subscriptions.sql
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

-- >>> appointments.sql
create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  patient_id text not null,
  doctor_name text not null,
  doctor_specialization text not null,
  scheduled_at timestamptz not null,
  consultation_type text not null,
  fee integer not null,
  reason text,
  status text not null default 'confirmed',
  created_at timestamptz not null default now()
);

create index if not exists appointments_patient_id_scheduled_at_idx
  on public.appointments (patient_id, scheduled_at desc);
