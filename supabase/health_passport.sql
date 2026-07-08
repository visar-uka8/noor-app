create table if not exists public.health_passport (
  user_id text primary key,
  patient jsonb not null,
  medications jsonb not null default '[]'::jsonb,
  allergies jsonb not null default '[]'::jsonb,
  operations jsonb not null default '[]'::jsonb,
  conditions jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);
