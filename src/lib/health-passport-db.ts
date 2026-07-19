import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";

export const HEALTH_PASSPORT_SELECT_WITH_VACCINATIONS =
  "user_id, personal, medications, allergies, vaccinations, conditions, surgeries, emergency_contact";

export const HEALTH_PASSPORT_SELECT_WITHOUT_VACCINATIONS =
  "user_id, personal, medications, allergies, conditions, surgeries, emergency_contact";

export const HEALTH_PASSPORT_SELECT_WITHOUT_CONDITIONS =
  "user_id, personal, medications, allergies, vaccinations, surgeries, emergency_contact";

export const HEALTH_PASSPORT_SELECT_LEGACY =
  "user_id, personal, medications, allergies, surgeries, emergency_contact";

export function isMissingVaccinationsColumnError(error: PostgrestError | null) {
  if (!error) return false;

  const message = `${error.message ?? ""} ${error.details ?? ""}`.toLowerCase();

  return (
    error.code === "42703" ||
    error.code === "PGRST204" ||
    message.includes("vaccinations") ||
    (message.includes("column") && message.includes("does not exist"))
  );
}

export function isMissingConditionsColumnError(error: PostgrestError | null) {
  if (!error) return false;

  const message = `${error.message ?? ""} ${error.details ?? ""}`.toLowerCase();

  return (
    error.code === "42703" ||
    error.code === "PGRST204" ||
    message.includes("conditions") ||
    (message.includes("column") && message.includes("does not exist"))
  );
}

export function isMissingPassportColumnError(error: PostgrestError | null) {
  return (
    isMissingVaccinationsColumnError(error) ||
    isMissingConditionsColumnError(error)
  );
}

const HEALTH_PASSPORT_SELECT_ATTEMPTS = [
  {
    select: HEALTH_PASSPORT_SELECT_WITH_VACCINATIONS,
    vaccinationsSupported: true,
    conditionsSupported: true,
  },
  {
    select: HEALTH_PASSPORT_SELECT_WITHOUT_CONDITIONS,
    vaccinationsSupported: true,
    conditionsSupported: false,
  },
  {
    select: HEALTH_PASSPORT_SELECT_WITHOUT_VACCINATIONS,
    vaccinationsSupported: false,
    conditionsSupported: true,
  },
  {
    select: HEALTH_PASSPORT_SELECT_LEGACY,
    vaccinationsSupported: false,
    conditionsSupported: false,
  },
] as const;

export async function queryHealthPassportRow<T extends Record<string, unknown>>(
  supabase: SupabaseClient,
  userId: string,
) {
  let lastError: PostgrestError | null = null;

  for (const attempt of HEALTH_PASSPORT_SELECT_ATTEMPTS) {
    const result = await supabase
      .from("health_passports")
      .select(attempt.select)
      .eq("user_id", userId)
      .maybeSingle<T>();

    if (!result.error) {
      return {
        data: result.data,
        vaccinationsSupported: attempt.vaccinationsSupported,
        conditionsSupported: attempt.conditionsSupported,
      };
    }

    lastError = result.error;

    if (!isMissingPassportColumnError(result.error)) {
      throw result.error;
    }
  }

  throw lastError ?? new Error("Health passport query failed.");
}
