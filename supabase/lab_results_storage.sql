insert into storage.buckets (id, name, public)
values ('lab-results', 'lab-results', false)
on conflict (id) do nothing;

create policy "Users can upload their own lab results"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'lab-results'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Users can view their own lab results"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'lab-results'
  and (storage.foldername(name))[1] = auth.uid()::text
);
