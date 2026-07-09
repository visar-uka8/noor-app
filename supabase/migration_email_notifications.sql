-- Schedule missed-dose email checks every 15 minutes.
-- Requires pg_cron and pg_net extensions in Supabase.
-- Replace YOUR_PROJECT_REF and YOUR_SERVICE_ROLE_KEY before running.

-- select cron.unschedule('check-missed-doses');

-- select cron.schedule(
--   'check-missed-doses',
--   '*/15 * * * *',
--   $$
--   select net.http_post(
--     url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/check-missed-doses',
--     headers := jsonb_build_object(
--       'Content-Type', 'application/json',
--       'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY'
--     ),
--     body := '{}'::jsonb
--   );
--   $$
-- );

-- Update default notification preferences to email-only MVP shape.
alter table public.profiles
  alter column notification_preferences
  set default '{"emailNotifications": true}'::jsonb;
