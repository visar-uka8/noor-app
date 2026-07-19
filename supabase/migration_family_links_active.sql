alter table public.family_links
  add column if not exists active boolean default true;

update public.family_links
set active = true
where active is null;

alter table public.family_links
  alter column active set default true;

create index if not exists family_links_active_idx
  on public.family_links (active);

drop policy if exists "Patients update family links" on public.family_links;
drop policy if exists "Participants update family links" on public.family_links;

create policy "Participants update family links"
  on public.family_links
  for update
  using (
    auth.uid() = patient_id
    or auth.uid() = family_member_id
    or auth.uid() = watcher_id
  );
