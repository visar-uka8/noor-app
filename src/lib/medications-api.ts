import { createClient } from "@/lib/supabase/server";
import { determineFrequency } from "@/lib/medication-schedule";
import type { InsulinType, MedicationTimeEntry } from "@/types/medication";

type MedicationInsertInput = {
  name: string;
  dosage: string;
  times: MedicationTimeEntry[];
  is_insulin?: boolean;
  insulin_type?: InsulinType | null;
};

export async function getMedicationAuthContext() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

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
    is_insulin: Boolean(input.is_insulin),
    insulin_type: input.is_insulin ? input.insulin_type ?? null : null,
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

export function normalizeInsulinType(value: unknown): InsulinType | null {
  if (value === "mahlzeit" || value === "basal") return value;
  return null;
}
