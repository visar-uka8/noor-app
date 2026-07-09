import { createClient } from "@/lib/supabase/server";
import { determineFrequency } from "@/lib/medication-schedule";
import type { MedicationTimeEntry } from "@/types/medication";

type MedicationInsertInput = {
  name: string;
  dosage: string;
  times: MedicationTimeEntry[];
};

export async function getMedicationAuthContext() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  console.log("Medication auth user:", user);
  console.log("Medication auth error:", authError);

  return { supabase, user, authError };
}

export function buildMedicationInsertRecord(
  userId: string,
  input: MedicationInsertInput,
) {
  const frequency = determineFrequency(input.times.length);

  return {
    user_id: userId,
    name: input.name,
    dosage: input.dosage,
    times: input.times,
    frequency,
    start_date: new Date().toISOString().split("T")[0],
    is_active: true,
  };
}

export function formatSupabaseError(error: {
  message?: string;
  code?: string;
  details?: string;
  hint?: string;
} | null) {
  if (!error) return "Unbekannter Datenbankfehler";

  return [error.message, error.code, error.details, error.hint]
    .filter(Boolean)
    .join(" — ");
}
