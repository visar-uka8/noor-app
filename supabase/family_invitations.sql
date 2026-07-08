create table if not exists public.family_invitations (
  code text primary key,
  patient_id text not null,
  family_member_name text not null,
  relationship text not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  status text not null default 'pending'
);

create index if not exists family_invitations_patient_id_created_at_idx
  on public.family_invitations (patient_id, created_at desc);
