import type { SupabaseClient } from "@supabase/supabase-js";
import {
  buildMissedConfirmationRecords,
  getTodayRange,
  parseStoredMedication,
} from "@/lib/medication-schedule";
import type { StoredConfirmation, StoredMedication } from "@/types/medication";

export type SupabaseDataClient = SupabaseClient;

export async function loadActiveMedications(
  userId: string,
  supabase: SupabaseDataClient,
) {
  const { data, error } = await supabase
    .from("medications")
    .select("*")
    .eq("user_id", userId)
    .eq("is_active", true)
    .order("created_at", { ascending: true });

  if (error) throw error;

  return (data ?? []).map(parseStoredMedication);
}

export async function loadTodayConfirmations(
  userId: string,
  supabase: SupabaseDataClient,
) {
  const { start, end } = getTodayRange();
  const { data, error } = await supabase
    .from("medication_confirmations")
    .select(
      "id, medication_id, dose_time, medication_name, scheduled_at, confirmed_at, missed",
    )
    .eq("user_id", userId)
    .gte("scheduled_at", start.toISOString())
    .lt("scheduled_at", end.toISOString())
    .returns<StoredConfirmation[]>();

  if (error) throw error;

  return data ?? [];
}

export async function syncMissedDoses(
  userId: string,
  supabase: SupabaseDataClient,
  medications: StoredMedication[],
  confirmations: StoredConfirmation[],
) {
  const missedRows = buildMissedConfirmationRecords(
    userId,
    medications,
    confirmations,
  );

  await Promise.all(
    missedRows.map(({ existing, record }) => {
      if (existing) {
        return supabase
          .from("medication_confirmations")
          .update({ missed: true })
          .eq("id", existing.id);
      }

      return supabase.from("medication_confirmations").insert(record);
    }),
  );
}
