-- User questions & notes before a visit (Fragen & Notizen)
alter table public.appointments
  add column if not exists preparation_notes text;

comment on column public.appointments.preparation_notes is 'User questions and notes before the visit';
