#!/usr/bin/env node
/**
 * Print SQL to apply email notification migration + cron schedule.
 * Paste output into Supabase SQL Editor and run.
 *
 * Usage: node scripts/print-email-notifications-sql.mjs
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const env = Object.fromEntries(
  readFileSync(join(root, ".env.local"), "utf8")
    .split("\n")
    .filter((line) => line && !line.startsWith("#"))
    .map((line) => {
      const index = line.indexOf("=");
      return [line.slice(0, index), line.slice(index + 1)];
    }),
);

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRoleKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const projectRef = new URL(url).hostname.split(".")[0];

console.log(`-- Apply in Supabase SQL Editor for project ${projectRef}

create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

alter table public.profiles
  alter column notification_preferences
  set default '{"emailNotifications": true}'::jsonb;

select cron.unschedule(jobid)
from cron.job
where jobname = 'check-missed-doses';

select cron.schedule(
  'check-missed-doses',
  '*/15 * * * *',
  $$
  select net.http_post(
    url := '${url}/functions/v1/check-missed-doses',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ${serviceRoleKey}'
    ),
    body := '{}'::jsonb
  );
  $$
);
`);
