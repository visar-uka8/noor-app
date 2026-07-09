#!/usr/bin/env node
/**
 * Test registration flow against live Supabase.
 * Usage: node scripts/test-registration.mjs
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
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error("Missing Supabase env vars in .env.local");
  process.exit(1);
}

const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

const stamp = Date.now();
const email = `noor.registration.${stamp}@gmail.com`;
const firstName = "Test";
const lastName = `User${stamp}`;
const password = `NoorTest-${stamp}!`;

console.log("Creating user:", email);

const { data: createdUser, error: createUserError } =
  await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      first_name: firstName,
      last_name: lastName,
    },
  });

if (createUserError) {
  console.error("User creation failed:", createUserError.message);
  process.exit(1);
}

const userId = createdUser.user?.id;
if (!userId) {
  console.error("No user id returned from sign up");
  process.exit(1);
}

console.log("User created:", userId);

const { data: profileAfterSignup, error: profileError } = await admin
  .from("profiles")
  .select("id, first_name, last_name, date_of_birth, role")
  .eq("id", userId)
  .maybeSingle();

if (profileError) {
  console.error("Profile read failed:", profileError.message);
  process.exit(1);
}

console.log("Profile after signup:", profileAfterSignup);

const profilePayload = {
  id: userId,
  first_name: firstName,
  last_name: lastName,
  date_of_birth: null,
  role: "patient",
  elder_mode: false,
  language: "de",
};

const { error: upsertError } = await admin
  .from("profiles")
  .upsert(profilePayload, { onConflict: "id" });

if (upsertError) {
  console.error("Profile upsert failed:", upsertError.message);
  console.error("Code:", upsertError.code);
  console.error("Details:", upsertError.details);
  process.exit(1);
}

const { data: profileAfterUpsert } = await admin
  .from("profiles")
  .select("id, first_name, last_name, date_of_birth, role")
  .eq("id", userId)
  .single();

console.log("Profile after upsert:", profileAfterUpsert);

const { error: deleteProfileError } = await admin
  .from("profiles")
  .delete()
  .eq("id", userId);

if (deleteProfileError) {
  console.warn("Cleanup profile failed:", deleteProfileError.message);
}

const { error: deleteUserError } = await admin.auth.admin.deleteUser(userId);

if (deleteUserError) {
  console.warn("Cleanup user failed:", deleteUserError.message);
}

console.log("Registration test passed.");
