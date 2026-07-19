-- Profile health & activity fields for onboarding and profile edit.

alter table public.profiles
  add column if not exists gender text;

alter table public.profiles
  add column if not exists height_cm integer;

alter table public.profiles
  add column if not exists weight_kg decimal(5, 2);

alter table public.profiles
  add column if not exists activity_level text;

alter table public.profiles
  add column if not exists sport_types text[];

-- Role is chosen after profile setup during onboarding.
alter table public.profiles
  alter column role drop not null;
