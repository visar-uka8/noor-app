create table if not exists public.family_notes (
  id uuid default gen_random_uuid() primary key,
  from_user_id uuid not null references public.profiles(id) on delete cascade,
  to_user_id uuid not null references public.profiles(id) on delete cascade,
  message text not null,
  read_at timestamptz,
  reply_message text,
  replied_at timestamptz,
  seen_by_sender_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists family_notes_to_user_unread_idx
  on public.family_notes (to_user_id, created_at desc)
  where read_at is null;

alter table public.family_notes enable row level security;

drop policy if exists "Users read own family notes" on public.family_notes;
drop policy if exists "Watchers insert family notes" on public.family_notes;
drop policy if exists "Patients mark notes read" on public.family_notes;

create policy "Users read own family notes"
  on public.family_notes for select
  using (auth.uid() = from_user_id or auth.uid() = to_user_id);

create policy "Watchers insert family notes"
  on public.family_notes for insert
  with check (auth.uid() = from_user_id);

drop policy if exists "Patients mark notes read" on public.family_notes;

create policy "Patients update family notes"
  on public.family_notes for update
  using (auth.uid() = to_user_id)
  with check (auth.uid() = to_user_id);

create policy "Senders mark replies seen"
  on public.family_notes for update
  using (auth.uid() = from_user_id)
  with check (auth.uid() = from_user_id);
