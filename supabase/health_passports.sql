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
