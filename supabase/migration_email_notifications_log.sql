create table if not exists public.email_notifications_log (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references auth.users(id) on delete cascade,
  recipient_email text not null,
  notification_type text not null,
  dedupe_key text not null,
  sent_at timestamptz not null default now()
);

create index if not exists email_notifications_log_patient_sent_at_idx
  on public.email_notifications_log (patient_id, sent_at desc);

create index if not exists email_notifications_log_dedupe_idx
  on public.email_notifications_log (
    patient_id,
    recipient_email,
    notification_type,
    dedupe_key,
    sent_at desc
  );

alter table public.email_notifications_log enable row level security;

drop policy if exists "Service role manages email notifications log"
  on public.email_notifications_log;

create policy "Service role manages email notifications log"
  on public.email_notifications_log for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
