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
  add column if not exists notification_preferences jsonb not null default '{"emailNotifications": true}'::jsonb;
