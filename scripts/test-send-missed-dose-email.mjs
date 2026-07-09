#!/usr/bin/env node
/**
 * Send one test missed-dose email via the deployed edge function.
 *
 * Usage:
 *   node scripts/test-send-missed-dose-email.mjs your@email.com
 *
 * With Plan A (onboarding@resend.dev), use the same email as your Resend account.
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const email = process.argv[2]?.trim();

if (!email) {
  console.error("Usage: node scripts/test-send-missed-dose-email.mjs your@email.com");
  process.exit(1);
}

if (email === "YOUR_RESEND_LOGIN_EMAIL" || !email.includes("@")) {
  console.error(
    "Replace YOUR_RESEND_LOGIN_EMAIL with your real Resend account email, e.g.:\n" +
      "  node scripts/test-send-missed-dose-email.mjs you@gmail.com",
  );
  process.exit(1);
}

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

const supabase = createClient(url, serviceRoleKey);

const { data: medication, error: medicationError } = await supabase
  .from("medications")
  .select("user_id, name, dosage")
  .eq("is_active", true)
  .limit(1)
  .maybeSingle();

if (medicationError) {
  console.error("Could not load a patient medication:", medicationError.message);
  process.exit(1);
}

if (!medication) {
  console.error(
    "No active medications found. Log in as the patient and add one medication first.",
  );
  process.exit(1);
}

const { data: profile, error: profileError } = await supabase
  .from("profiles")
  .select("first_name, last_name")
  .eq("id", medication.user_id)
  .maybeSingle();

if (profileError) {
  console.error("Could not load patient profile:", profileError.message);
  process.exit(1);
}

const patientName =
  `${profile?.first_name?.trim() || "Test"} ${profile?.last_name?.trim() || "Patient"}`.trim();
const medicationName = `${medication.name} ${medication.dosage}`.trim();

console.log(`Sending test email to: ${email}`);
console.log(`Patient: ${patientName} (${medication.user_id})`);

const response = await fetch(`${url}/functions/v1/send-missed-dose-alert`, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${serviceRoleKey}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    patient_id: medication.user_id,
    patient_name: patientName,
    medication_name: medicationName,
    dose_time: "morning",
    scheduled_time: "08:00",
    family_email: email,
  }),
});

const body = await response.text();

console.log(`Status: ${response.status}`);
console.log(body);

if (!response.ok) {
  console.error(
    "\nIf this is still 500, open Supabase → Edge Functions → send-missed-dose-alert → Logs " +
      "and look for the exact error (often Resend API key/from-address or invalid recipient).",
  );
  process.exit(1);
}
