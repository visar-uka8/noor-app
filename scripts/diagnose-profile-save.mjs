#!/usr/bin/env node
/**
 * Diagnose profile save against Supabase (uses .env.local).
 * Usage: node scripts/diagnose-profile-save.mjs
 */

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split("\n")
    .filter((line) => line && !line.startsWith("#"))
    .map((line) => {
      const index = line.indexOf("=");
      return [line.slice(0, index), line.slice(index + 1)];
    }),
);

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY ?? env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(url, key, { auth: { persistSession: false } });

const { data: columns, error: columnsError } = await supabase
  .from("profiles")
  .select("*")
  .limit(1);

if (columnsError) {
  console.log("SELECT error:", columnsError.message);
  console.log("Code:", columnsError.code);
  process.exit(1);
}

if (columns?.[0]) {
  console.log("Profile columns:", Object.keys(columns[0]).join(", "));
}

const testProfile = {
  id: "00000000-0000-0000-0000-000000000099",
  first_name: "Diag",
  last_name: "Test",
  date_of_birth: null,
  role: "family_member",
  elder_mode: false,
  language: "de",
};

const { error } = await supabase
  .from("profiles")
  .upsert(testProfile, { onConflict: "id" });

if (error) {
  console.log("UPSERT error message:", error.message);
  console.log("UPSERT error code:", error.code);
  console.log("UPSERT error details:", error.details);
  console.log("UPSERT error hint:", error.hint);
} else {
  console.log("UPSERT succeeded (or FK blocked silently)");
  await supabase.from("profiles").delete().eq("id", testProfile.id);
}
