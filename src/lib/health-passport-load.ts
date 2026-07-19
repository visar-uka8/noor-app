import type { SupabaseClient } from "@supabase/supabase-js";
import { loadActiveMedications } from "@/lib/medication-data";
import { toPassportMedications } from "@/lib/health-passport-medications";
import { queryHealthPassportRow } from "@/lib/health-passport-db";
import type { HealthPassportData, PassportCondition } from "@/types/health-passport";

type StoredPassport = {
  personal: HealthPassportData["personal"];
  medications: HealthPassportData["medications"];
  allergies: HealthPassportData["allergies"];
  vaccinations?: HealthPassportData["vaccinations"];
  conditions?: PassportCondition[];
  surgeries: HealthPassportData["surgeries"];
  emergency_contact: HealthPassportData["emergencyContact"];
};

export async function loadHealthPassportForUser(
  userId: string,
  supabase: SupabaseClient,
): Promise<HealthPassportData | null> {
  const { data, vaccinationsSupported, conditionsSupported } =
    await queryHealthPassportRow<StoredPassport & { user_id?: string }>(
      supabase,
      userId,
    );

  if (!data) return null;

  let medications = data.medications;
  try {
    const activeMedications = await loadActiveMedications(userId, supabase);
    medications = toPassportMedications(activeMedications);
  } catch (syncError) {
    console.error("Health passport medication sync failed:", syncError);
  }

  return {
    userId,
    personal: data.personal,
    medications,
    allergies: data.allergies,
    conditions:
      conditionsSupported && "conditions" in data
        ? normalizeStoredConditions(data.conditions)
        : [],
    vaccinations:
      vaccinationsSupported && "vaccinations" in data
        ? (data.vaccinations ?? [])
        : [],
    surgeries: data.surgeries,
    emergencyContact: data.emergency_contact,
  };
}

export function normalizeStoredConditions(
  conditions: PassportCondition[] | null | undefined,
): PassportCondition[] {
  return (conditions ?? []).map((condition) => ({
    id: condition.id || crypto.randomUUID(),
    name: condition.name?.trim() ?? "",
    since: condition.since?.trim() ?? "",
    treatment: condition.treatment?.trim() ?? "",
  }));
}
