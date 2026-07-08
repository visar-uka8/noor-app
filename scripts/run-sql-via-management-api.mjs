#!/usr/bin/env node
/**
 * Run Noor SQL migrations via Supabase Management API.
 * Usage: node scripts/run-sql-via-management-api.mjs <personal_access_token>
 *
 * Get token: https://supabase.com/dashboard/account/tokens → Generate new token
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const token = process.argv[2];
const projectRef = "scldfxufzjtghqmhphtp";

if (!token) {
  console.error(
    "Usage: node scripts/run-sql-via-management-api.mjs <personal_access_token>",
  );
  process.exit(1);
}

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

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
    throw new Error(`${response.status} ${body}`);
  }

  return body;
}

for (const file of ["setup.sql", "rls_policies.sql"]) {
  const sql = readFileSync(join(root, "supabase", file), "utf8");
  console.log(`Running ${file}...`);
  const result = await runQuery(sql);
  console.log(`Done: ${file}`, result.slice(0, 200));
}

console.log("All SQL applied.");
