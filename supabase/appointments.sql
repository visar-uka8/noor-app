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
