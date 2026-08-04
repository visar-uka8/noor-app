-- Schedule missed-dose email checks every 10 minutes via Supabase pg_cron.
-- Timing thresholds (see src/lib/medication-notification-timing.ts):
--   patient reminder: 15 minutes after scheduled dose
--   family alert:     30 minutes after scheduled dose
-- Vercel Hobby only allows daily crons, so frequent checks must run here
-- (not in vercel.json). Requires pg_cron and pg_net.
-- Replace YOUR_PROJECT_REF and YOUR_SERVICE_ROLE_KEY before running.

-- select cron.unschedule('check-missed-doses');

-- select cron.schedule(
--   'check-missed-doses',
--   '*/10 * * * *',
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
