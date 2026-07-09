#!/usr/bin/env node
/**
 * Apply email notification migration + deploy edge functions to Supabase.
 *
 * Usage:
 *   SUPABASE_ACCESS_TOKEN=sbp_... node scripts/apply-email-notifications-supabase.mjs
 *   node scripts/apply-email-notifications-supabase.mjs sbp_...
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const token = process.argv[2] ?? process.env.SUPABASE_ACCESS_TOKEN;
const projectRef = "scldfxufzjtghqmhphtp";
const root = join(dirname(fileURLToPath(import.meta.url)), "..");

if (!token) {
  console.error(
    "Missing Supabase access token.\n" +
      "Create one at https://supabase.com/dashboard/account/tokens\n" +
      "Then run: SUPABASE_ACCESS_TOKEN=sbp_... node scripts/apply-email-notifications-supabase.mjs",
  );
  process.exit(1);
}

const env = Object.fromEntries(
  readFileSync(join(root, ".env.local"), "utf8")
    .split("\n")
    .filter((line) => line && !line.startsWith("#"))
    .map((line) => {
      const index = line.indexOf("=");
      return [line.slice(0, index), line.slice(index + 1)];
    }),
);

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

async function runQuery(query) {
  const response = await fetch(
    `https://api.supabase.com/v1/projects/${projectRef}/database/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query }),
    },
  );

  const body = await response.text();
  if (!response.ok) {
    throw new Error(`SQL failed (${response.status}): ${body}`);
  }

  return body;
}

async function deployFunction(slug) {
  const filePath = join(root, "supabase", "functions", slug, "index.ts");
  const source = readFileSync(filePath, "utf8");
  const form = new FormData();
  form.append(
    "metadata",
    JSON.stringify({
      entrypoint_path: "index.ts",
      name: slug,
      verify_jwt: false,
    }),
  );
  form.append("file", new Blob([source], { type: "text/typescript" }), "index.ts");

  const response = await fetch(
    `https://api.supabase.com/v1/projects/${projectRef}/functions/deploy?slug=${slug}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: form,
    },
  );

  const body = await response.text();
  if (!response.ok) {
    throw new Error(`Deploy ${slug} failed (${response.status}): ${body}`);
  }

  return body;
}

const sql = `
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
    url := '${supabaseUrl}/functions/v1/check-missed-doses',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ${serviceRoleKey}'
    ),
    body := '{}'::jsonb
  );
  $$
);
`;

console.log("Applying SQL migration...");
const sqlResult = await runQuery(sql);
console.log("SQL applied:", sqlResult.slice(0, 400));

for (const slug of ["send-missed-dose-alert", "check-missed-doses"]) {
  console.log(`Deploying function: ${slug}...`);
  const deployResult = await deployFunction(slug);
  console.log(`Deployed ${slug}:`, deployResult.slice(0, 400));
}

console.log("Email notification Supabase setup complete.");
