import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import {
  formatMedicationConfirmationName,
  getScheduledAtForTime,
  isDoseMissed,
  isMedicationTimeSlot,
  normalizeMedicationTimes,
  parseStoredMedication,
} from "@/lib/medication-schedule";
import {
  loadActiveMedications,
  loadTodayConfirmations,
  syncMissedDoses,
} from "@/lib/medication-data";
import type { MedicationTimeSlot, StoredConfirmation } from "@/types/medication";

export const runtime = "nodejs";

type ConfirmationPayload = {
  medication_id?: unknown;
  dose_time?: unknown;
  scheduled_time?: unknown;
};

type UndoPayload = {
  medication_id?: unknown;
  dose_time?: unknown;
  scheduled_time?: unknown;
};

export async function GET() {
  try {
    const authSupabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await authSupabase.auth.getUser();

    if (authError || !user) {
      return Response.json(
        { error: "Bitte melden Sie sich an, um Bestätigungen zu laden." },
        { status: 401 },
      );
    }

    const supabase = createSupabaseDataClient() ?? authSupabase;
    const medications = await loadActiveMedications(user.id, supabase);
    const confirmations = await loadTodayConfirmations(user.id, supabase);
    await syncMissedDoses(user.id, supabase, medications, confirmations);
    const refreshedConfirmations = await loadTodayConfirmations(user.id, supabase);

    return Response.json({ confirmations: refreshedConfirmations });
  } catch (error) {
    console.error("Medication confirmations load failed", error);

    return Response.json(
      { error: "Bestätigungen konnten gerade nicht geladen werden." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as ConfirmationPayload;
    const medicationId = normalizeMedicationId(payload.medication_id);
    const doseTime = normalizeDoseTime(payload.dose_time);
    const scheduledTime = normalizeScheduledTime(payload.scheduled_time);
    const authSupabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await authSupabase.auth.getUser();

    if (authError || !user) {
      return Response.json(
        { error: "Bitte melden Sie sich an, um Medikamente zu bestätigen." },
        { status: 401 },
      );
    }

    const supabase = createSupabaseDataClient() ?? authSupabase;
    const medication = await loadMedicationById(user.id, medicationId, supabase);

    if (!medication) {
      return Response.json({ error: "Medikament nicht gefunden." }, { status: 404 });
    }

    const timeEntry = normalizeMedicationTimes(medication.times).find(
      (entry) => entry.slot === doseTime && entry.time === scheduledTime,
    );

    if (!timeEntry) {
      return Response.json({ error: "Einnahmezeit nicht gefunden." }, { status: 404 });
    }

    const confirmation = {
      user_id: user.id,
      medication_id: medication.id,
      medication_name: formatMedicationConfirmationName(
        medication.name,
        medication.dosage,
      ),
      dose_time: doseTime,
      scheduled_at: getScheduledAtForTime(timeEntry.time).toISOString(),
      confirmed_at: new Date().toISOString(),
      missed: isDoseMissed(getScheduledAtForTime(timeEntry.time)),
    };

    const { data: existingConfirmation, error: existingError } = await supabase
      .from("medication_confirmations")
      .select("id, confirmed_at")
      .eq("user_id", user.id)
      .eq("medication_id", medication.id)
      .eq("scheduled_at", confirmation.scheduled_at)
      .maybeSingle<{ id: string; confirmed_at: string | null }>();

    if (existingError) throw existingError;

    if (existingConfirmation?.confirmed_at) {
      return Response.json({
        confirmation: existingConfirmation,
        alreadyConfirmed: true,
      });
    }

    if (existingConfirmation) {
      const { data, error } = await supabase
        .from("medication_confirmations")
        .update({
          confirmed_at: confirmation.confirmed_at,
          missed: confirmation.missed,
        })
        .eq("id", existingConfirmation.id)
        .select(
          "id, medication_id, dose_time, medication_name, scheduled_at, confirmed_at, missed",
        )
        .single<StoredConfirmation>();

      if (error) throw error;

      return Response.json({ confirmation: data, alreadyConfirmed: false });
    }

    const { data, error } = await supabase
      .from("medication_confirmations")
      .insert(confirmation)
      .select(
        "id, medication_id, dose_time, medication_name, scheduled_at, confirmed_at, missed",
      )
      .single<StoredConfirmation>();

    if (error) throw error;

    return Response.json({ confirmation: data, alreadyConfirmed: false });
  } catch (error) {
    console.error("Medication confirmation save failed", error);

    return Response.json(
      { error: "Bestätigung konnte gerade nicht gespeichert werden." },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const payload = (await request.json()) as UndoPayload;
    const medicationId = normalizeMedicationId(payload.medication_id);
    const doseTime = normalizeDoseTime(payload.dose_time);
    const scheduledTime = normalizeScheduledTime(payload.scheduled_time);
    const authSupabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await authSupabase.auth.getUser();

    if (authError || !user) {
      return Response.json({ error: "Bitte melden Sie sich an." }, { status: 401 });
    }

    const supabase = createSupabaseDataClient() ?? authSupabase;
    const medication = await loadMedicationById(user.id, medicationId, supabase);

    if (!medication) {
      return Response.json({ error: "Medikament nicht gefunden." }, { status: 404 });
    }

    const scheduledAt = getScheduledAtForTime(scheduledTime).toISOString();
    const { data: existing, error: existingError } = await supabase
      .from("medication_confirmations")
      .select("id, confirmed_at")
      .eq("user_id", user.id)
      .eq("medication_id", medication.id)
      .eq("dose_time", doseTime)
      .eq("scheduled_at", scheduledAt)
      .maybeSingle<{ id: string; confirmed_at: string | null }>();

    if (existingError) throw existingError;

    if (!existing?.confirmed_at) {
      return Response.json({ undone: true });
    }

    const { error } = await supabase
      .from("medication_confirmations")
      .update({
        confirmed_at: null,
        missed: isDoseMissed(scheduledAt),
      })
      .eq("id", existing.id);

    if (error) throw error;

    return Response.json({ undone: true });
  } catch (error) {
    console.error("Medication confirmation undo failed", error);

    return Response.json(
      { error: "Rückgängig machen ist gerade nicht möglich." },
      { status: 500 },
    );
  }
}

async function loadMedicationById(
  userId: string,
  medicationId: string,
  supabase: NonNullable<ReturnType<typeof createSupabaseDataClient>>,
) {
  const { data, error } = await supabase
    .from("medications")
    .select("*")
    .eq("id", medicationId)
    .eq("user_id", userId)
    .eq("is_active", true)
    .maybeSingle();

  if (error) throw error;

  return data ? parseStoredMedication(data) : null;
}

function normalizeMedicationId(value: unknown) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error("Medication id is required.");
  }

  return value.trim();
}

function normalizeDoseTime(value: unknown): MedicationTimeSlot {
  if (isMedicationTimeSlot(value)) return value;

  throw new Error("Dose time is invalid.");
}

function normalizeScheduledTime(value: unknown) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error("Scheduled time is required.");
  }

  return value.trim();
}

function createSupabaseDataClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) return null;

  return createAdminClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false },
  });
}
