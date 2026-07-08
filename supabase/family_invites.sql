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
