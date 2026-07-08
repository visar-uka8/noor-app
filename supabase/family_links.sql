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
