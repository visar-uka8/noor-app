-- Allow multiple activity logs per user per day.
-- Run in Supabase SQL Editor after migration_activity_logs.sql.

alter table public.activity_logs
  drop constraint if exists activity_logs_user_id_date_key;

drop index if exists activity_logs_user_date_idx;

create index if not exists activity_logs_user_date_created_idx
  on public.activity_logs (user_id, date, created_at);
