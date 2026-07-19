-- Allow family_member role during onboarding.

alter table public.profiles
  add column if not exists role text default 'patient';

alter table public.profiles
  add column if not exists user_type text default 'patient';

alter table public.profiles
  alter column date_of_birth drop not null;

alter table public.profiles
  drop constraint if exists profiles_role_check;

update public.profiles
set user_type = role
where user_type is distinct from role;

alter table public.profiles enable row level security;

drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists "Users can read own profile" on public.profiles;
create policy "Users can read own profile"
  on public.profiles for select
  using (auth.uid() = id);
