-- Vaccination records stored as JSONB on health_passports.
-- Run in Supabase SQL Editor if save fails with a missing-column error.

alter table public.health_passports
  add column if not exists allergies jsonb not null default '[]'::jsonb;

alter table public.health_passports
  add column if not exists vaccinations jsonb not null default '[]'::jsonb;
