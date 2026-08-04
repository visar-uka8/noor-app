import { createClient } from "@/lib/supabase/server";
import { getTodayRange, parseStoredMedication } from "@/lib/medication-schedule";
import {
  formatSupabaseError,
  getMedicationAuthContext,
} from "@/lib/medications-api";
import type { StoredConfirmation } from "@/types/medication";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const { supabase, user, authError } = await getMedicationAuthContext();

    if (authError || !user) {
      return Response.json({ error: "Bitte melden Sie sich an." }, { status: 401 });
    }

    const { data: medication, error: medicationError } = await supabase
      .from("medications")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .eq("is_active", true)
      .maybeSingle();

    if (medicationError) {
      return Response.json(
        { error: formatSupabaseError(medicationError) },
        { status: 500 },
      );
    }

    if (!medication || !medication.is_insulin) {
      return Response.json({ error: "Insulin-Verlauf nicht verfügbar." }, { status: 404 });
    }

    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - 6);
    const { end } = getTodayRange();

    const { data, error } = await supabase
      .from("medication_confirmations")
      .select(
        "id, medication_id, dose_time, medication_name, scheduled_at, confirmed_at, missed, insulin_units",
      )
      .eq("user_id", user.id)
      .eq("medication_id", id)
      .gte("scheduled_at", start.toISOString())
      .lt("scheduled_at", end.toISOString())
      .order("scheduled_at", { ascending: true })
      .returns<StoredConfirmation[]>();

    if (error) {
      return Response.json({ error: formatSupabaseError(error) }, { status: 500 });
    }

    return Response.json({
      medication: parseStoredMedication(medication),
      confirmations: data ?? [],
    });
  } catch (error) {
    console.error("Insulin log load failed", error);

    return Response.json(
      { error: "Insulin-Verlauf konnte gerade nicht geladen werden." },
      { status: 500 },
    );
  }
}
