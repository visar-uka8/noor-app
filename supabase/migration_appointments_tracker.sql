-- Manual appointment tracker (Arzttermin)
alter table public.appointments
  add column if not exists user_id uuid references auth.users(id) on delete cascade,
  add column if not exists notes text,
  add column if not exists reminder_sent_at timestamptz,
  add column if not exists preparation_text text,
  add column if not exists preparation_notes text;

alter table public.appointments
  alter column patient_id drop not null,
  alter column doctor_specialization drop not null,
  alter column consultation_type drop not null,
  alter column fee drop not null;

alter table public.appointments
  alter column doctor_specialization set default '',
  alter column consultation_type set default 'Praxis',
  alter column fee set default 0;

create index if not exists appointments_user_id_scheduled_at_idx
  on public.appointments (user_id, scheduled_at desc)
  where user_id is not null;

alter table public.appointments enable row level security;

update public.appointments
set user_id = patient_id::uuid
where user_id is null
  and patient_id ~ '^[0-9a-f-]{36}$';

drop policy if exists "Users manage own appointments" on public.appointments;
create policy "Users manage own appointments"
  on public.appointments
  for all
  using (
    auth.uid() = user_id
    or patient_id = auth.uid()::text
  )
  with check (
    auth.uid() = user_id
    or patient_id = auth.uid()::text
  );

comment on column public.appointments.notes is 'Notes from the doctor after the visit';
comment on column public.appointments.preparation_text is 'AI-generated Vorbereitung based on lab values';
comment on column public.appointments.preparation_notes is 'User questions and notes before the visit';
