#!/usr/bin/env node
/**
 * Apply profile role migration via Supabase Management API.
 * Usage: node scripts/apply-profile-migration.mjs <personal_access_token>
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const token = process.argv[2];
const projectRef = "scldfxufzjtghqmhphtp";

if (!token) {
  console.error(
    "Usage: node scripts/apply-profile-migration.mjs <personal_access_token>",
  );
  process.exit(1);
}

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const sql = readFileSync(
  join(root, "supabase", "migration_profile_role_columns.sql"),
  "utf8",
);

const response = await fetch(
  `https://api.supabase.com/v1/projects/${projectRef}/database/query`,
  {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: sql }),
  },
);

const body = await response.text();
if (!response.ok) {
  console.error("Migration failed:", response.status, body);
  process.exit(1);
}

console.log("Migration applied successfully.");
console.log(body.slice(0, 500));
