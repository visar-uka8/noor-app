#!/usr/bin/env node
/**
 * Configure Noor with Supabase API keys + optional DB password.
 * Usage:
 *   node scripts/configure-from-keys.mjs <url> <anon_key> <service_key> [db_password]
 */

import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const [url, anonKey, serviceKey, dbPassword] = process.argv.slice(2);

if (!url || !anonKey || !serviceKey) {
  console.error(
    "Usage: node scripts/configure-from-keys.mjs <url> <anon_key> <service_key> [db_password]",
  );
  process.exit(1);
}

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = join(root, ".env.local");

const env = `NEXT_PUBLIC_SUPABASE_URL=${url}
NEXT_PUBLIC_SUPABASE_ANON_KEY=${anonKey}
SUPABASE_SERVICE_ROLE_KEY=${serviceKey}
ANTHROPIC_API_KEY=
NEXT_PUBLIC_APP_URL=https://noor-nine-kohl.vercel.app
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
NEXT_PUBLIC_STRIPE_PRICE_FAMILIE=
NEXT_PUBLIC_STRIPE_PRICE_FAMILIE_PLUS=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_FAMILIE=
STRIPE_PRICE_FAMILIE_PLUS=
`;

writeFileSync(envPath, env);
console.log("Wrote .env.local");

function addVercelEnv(name, value) {
  for (const target of ["production", "preview", "development"]) {
    try {
      execSync(`npx vercel env add ${name} ${target} --force`, {
        cwd: root,
        input: value,
        stdio: ["pipe", "pipe", "pipe"],
      });
      console.log(`Vercel env ${name} (${target})`);
    } catch {
      // continue
    }
  }
}

console.log("Adding Vercel environment variables...");
addVercelEnv("NEXT_PUBLIC_SUPABASE_URL", url);
addVercelEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", anonKey);
addVercelEnv("SUPABASE_SERVICE_ROLE_KEY", serviceKey);

async function runSqlViaPg(password) {
  const ref = new URL(url).hostname.split(".")[0];
  const connectionString = `postgresql://postgres:${encodeURIComponent(password)}@db.${ref}.supabase.co:5432/postgres`;

  let pg;
  try {
    pg = await import("pg");
  } catch {
    console.log("Installing pg package for database setup...");
    execSync("npm install pg --no-save", { cwd: root, stdio: "inherit" });
    pg = await import("pg");
  }

  const client = new pg.default.Client({ connectionString, ssl: { rejectUnauthorized: false } });
  await client.connect();

  for (const file of ["setup.sql", "rls_policies.sql"]) {
    const sql = readFileSync(join(root, "supabase", file), "utf8");
    console.log(`Running ${file}...`);
    await client.query(sql);
    console.log(`Done: ${file}`);
  }

  await client.end();
}

if (dbPassword) {
  try {
    await runSqlViaPg(dbPassword);
  } catch (error) {
    console.error("Database setup failed:", error.message);
    console.log("Run supabase/setup.sql and supabase/rls_policies.sql manually in SQL Editor.");
  }
} else {
  console.log("\nNo DB password provided — skip SQL. Run setup.sql + rls_policies.sql in Supabase SQL Editor.");
}

console.log("\nNext: npx vercel --prod --yes");
