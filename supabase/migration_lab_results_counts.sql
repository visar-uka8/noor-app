-- Add status count columns for lab result history cards.

alter table public.lab_results
  add column if not exists normal_count integer not null default 0;

alter table public.lab_results
  add column if not exists watch_count integer not null default 0;

alter table public.lab_results
  add column if not exists high_count integer not null default 0;
