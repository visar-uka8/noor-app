-- Family connect: watchers can join via invite code.

alter table public.family_links enable row level security;
alter table public.family_invites enable row level security;

drop policy if exists "Users can insert family links" on public.family_links;
drop policy if exists "Users can read own family links" on public.family_links;
drop policy if exists "Patients manage family links" on public.family_links;

create policy "Users can read own family links"
  on public.family_links for select
  using (
    auth.uid() = patient_id
    or auth.uid() = watcher_id
    or auth.uid() = family_member_id
  );

create policy "Users can insert family links"
  on public.family_links for insert
  with check (
    auth.uid() = watcher_id
    or auth.uid() = family_member_id
  );

drop policy if exists "Anyone can read valid invites" on public.family_invites;
drop policy if exists "Users can create invites" on public.family_invites;
drop policy if exists "Users can update own invites" on public.family_invites;
drop policy if exists "Authenticated users can redeem invites" on public.family_invites;
drop policy if exists "Patients manage family invites" on public.family_invites;

create policy "Anyone can read valid invites"
  on public.family_invites for select
  using (used = false);

create policy "Users can create invites"
  on public.family_invites for insert
  with check (auth.uid() = patient_id);

create policy "Users can update own invites"
  on public.family_invites for update
  using (auth.uid() = patient_id);

create policy "Authenticated users can redeem invites"
  on public.family_invites for update
  using (
    auth.uid() is not null
    and used = false
    and expires_at > now()
  )
  with check (used = true);
