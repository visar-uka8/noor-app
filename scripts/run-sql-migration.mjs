#!/usr/bin/env node
/**
 * Apply a Supabase SQL migration via direct Postgres connection.
 * Usage:
 *   SUPABASE_DB_PASSWORD=... node scripts/run-sql-migration.mjs <sql-file>
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const migrationFile = process.argv[2] ?? "migration_optional_date_of_birth_and_trigger.sql";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split("\n")
    .filter((line) => line && !line.startsWith("#"))
    .map((line) => {
      const index = line.indexOf("=");
      return [line.slice(0, index), line.slice(index + 1)];
    }),
);

const password = process.env.SUPABASE_DB_PASSWORD;
const url = env.NEXT_PUBLIC_SUPABASE_URL;

if (!password || !url) {
  console.error(
    "Set SUPABASE_DB_PASSWORD and ensure NEXT_PUBLIC_SUPABASE_URL is in .env.local",
  );
  process.exit(1);
}

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const sql = readFileSync(join(root, "supabase", migrationFile), "utf8");
const ref = new URL(url).hostname.split(".")[0];
const connectionString = `postgresql://postgres:${encodeURIComponent(password)}@db.${ref}.supabase.co:5432/postgres`;

let pg;
try {
  pg = await import("pg");
} catch {
  const { execSync } = await import("node:child_process");
  execSync("npm install pg --no-save", { cwd: root, stdio: "inherit" });
  pg = await import("pg");
}

const client = new pg.default.Client({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

await client.connect();
await client.query(sql);
await client.end();

console.log(`Migration applied: ${migrationFile}`);
