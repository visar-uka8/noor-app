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
