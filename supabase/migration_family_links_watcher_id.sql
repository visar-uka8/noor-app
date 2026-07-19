-- Adds explicit watcher_id alongside legacy family_member_id.
-- watcher_id and family_member_id always refer to the same person (the WATCHER).

alter table public.family_links
  add column if not exists watcher_id uuid references auth.users(id) on delete cascade;

update public.family_links
set watcher_id = family_member_id
where watcher_id is null;

create index if not exists family_links_watcher_id_idx
  on public.family_links (watcher_id);

create or replace function public.sync_family_link_watcher_id()
returns trigger
language plpgsql
as $$
begin
  if new.watcher_id is null and new.family_member_id is not null then
    new.watcher_id := new.family_member_id;
  end if;

  if new.family_member_id is null and new.watcher_id is not null then
    new.family_member_id := new.watcher_id;
  end if;

  return new;
end;
$$;

drop trigger if exists family_links_sync_watcher_id on public.family_links;

create trigger family_links_sync_watcher_id
before insert or update on public.family_links
for each row
execute function public.sync_family_link_watcher_id();
