alter table public.profiles
  add column if not exists avatar_url text;

-- Optional helper for service-role auto-heal after this migration is applied once.
create or replace function public.ensure_avatar_url_column()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  alter table public.profiles add column if not exists avatar_url text;
end;
$$;

grant execute on function public.ensure_avatar_url_column() to service_role;

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do update
set public = excluded.public;

drop policy if exists "Users can upload their own avatar" on storage.objects;
drop policy if exists "Users can update their own avatar" on storage.objects;
drop policy if exists "Users can delete their own avatar" on storage.objects;

create policy "Users can upload their own avatar"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Users can update their own avatar"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Users can delete their own avatar"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Public avatar read access" on storage.objects;

create policy "Public avatar read access"
on storage.objects
for select
to public
using (bucket_id = 'avatars');
