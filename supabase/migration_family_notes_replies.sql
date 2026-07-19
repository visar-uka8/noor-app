-- Quick replies on family notes. Run in Supabase SQL Editor if replies fail.

alter table public.family_notes
  add column if not exists reply_message text;

alter table public.family_notes
  add column if not exists replied_at timestamptz;

alter table public.family_notes
  add column if not exists seen_by_sender_at timestamptz;

drop policy if exists "Patients mark notes read" on public.family_notes;

create policy "Patients update family notes"
  on public.family_notes for update
  using (auth.uid() = to_user_id)
  with check (auth.uid() = to_user_id);

create policy "Senders mark replies seen"
  on public.family_notes for update
  using (auth.uid() = from_user_id)
  with check (auth.uid() = from_user_id);
