import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedUser } from "@/lib/supabase/request-auth";
import {
  formatMedicationConfirmationName,
  getScheduledAtForTime,
  getTodayRange,
  isDoseMissed,
  isMedicationTimeSlot,
  normalizeMedicationTimes,
  parseStoredMedication,
} from "@/lib/medication-schedule";
import {
  loadActiveMedications,
  loadConfirmationsForStreak,
  loadTodayConfirmations,
  syncMissedDoses,
} from "@/lib/medication-data";
import { calculateMedicationStreak } from "@/lib/medication-streak";
import type { MedicationTimeSlot, StoredConfirmation } from "@/types/medication";

export const runtime = "nodejs";

const confirmationSelect =
  "id, medication_id, dose_time, medication_name, scheduled_at, confirmed_at, missed";

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

export async function GET(request: Request) {
  try {
    const { user, authError } = await getAuthenticatedUser(request);

    if (authError || !user) {
      return Response.json(
        { error: "Bitte melden Sie sich an, um Bestätigungen zu laden." },
        { status: 401 },
      );
    }

    const authSupabase = await createClient();
    const supabase = createSupabaseDataClient() ?? authSupabase;
    const medications = await loadActiveMedications(user.id, supabase);
    const confirmations = await loadTodayConfirmations(user.id, supabase);
    await syncMissedDoses(user.id, supabase, medications, confirmations);
    const refreshedConfirmations = await loadTodayConfirmations(user.id, supabase);
    const streakConfirmations = await loadConfirmationsForStreak(user.id, supabase);
    const streak = calculateMedicationStreak(medications, streakConfirmations);

    return Response.json({
      confirmations: refreshedConfirmations,
      streak,
    });
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
    console.log("[medication-confirmations POST] payload:", payload);

    const medicationId = normalizeMedicationId(payload.medication_id);
    const doseTime = normalizeDoseTime(payload.dose_time);
    const scheduledTime = normalizeScheduledTime(payload.scheduled_time);
    const { user, authError } = await getAuthenticatedUser(request);

    console.log("[medication-confirmations POST] user:", user?.id ?? null);
    if (authError) {
      console.log("[medication-confirmations POST] auth error:", authError.message);
    }

    if (!user) {
      return Response.json(
        { error: "Bitte melden Sie sich an, um Medikamente zu bestätigen." },
        { status: 401 },
      );
    }

    const authSupabase = await createClient();
    const supabase = createSupabaseDataClient() ?? authSupabase;
    const medication = await loadMedicationById(user.id, medicationId, supabase);

    if (!medication) {
      console.error("[medication-confirmations POST] medication not found", {
        userId: user.id,
        medicationId,
      });
      return Response.json({ error: "Medikament nicht gefunden." }, { status: 404 });
    }

    const timeEntries = normalizeMedicationTimes(medication.times);
    const timeEntry =
      timeEntries.find(
        (entry) => entry.slot === doseTime && entry.time === scheduledTime,
      ) ??
      timeEntries.find((entry) => entry.slot === doseTime) ??
      timeEntries.find((entry) => entry.time === scheduledTime);

    if (!timeEntry) {
      console.error("[medication-confirmations POST] time entry not found", {
        doseTime,
        scheduledTime,
        times: medication.times,
      });
      return Response.json({ error: "Einnahmezeit nicht gefunden." }, { status: 404 });
    }

    const scheduledAt = getScheduledAtForTime(timeEntry.time).toISOString();
    const confirmation = {
      user_id: user.id,
      medication_id: medication.id,
      medication_name: formatMedicationConfirmationName(
        medication.name,
        medication.dosage,
      ),
      dose_time: timeEntry.slot,
      scheduled_at: scheduledAt,
      confirmed_at: new Date().toISOString(),
      missed: isDoseMissed(getScheduledAtForTime(timeEntry.time)),
    };

    const existingConfirmation = await findTodayConfirmation({
      supabase,
      userId: user.id,
      medicationId: medication.id,
      doseTime: timeEntry.slot,
      scheduledAt,
    });

    console.log(
      "[medication-confirmations POST] existing:",
      existingConfirmation,
    );

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
          medication_name: confirmation.medication_name,
          dose_time: confirmation.dose_time,
          scheduled_at: confirmation.scheduled_at,
        })
        .eq("id", existingConfirmation.id)
        .select(confirmationSelect)
        .single<StoredConfirmation>();

      console.log("[medication-confirmations POST] update:", data, error);

      if (error) throw error;

      return Response.json({ confirmation: data, alreadyConfirmed: false });
    }

    const { data, error } = await supabase
      .from("medication_confirmations")
      .insert(confirmation)
      .select(confirmationSelect)
      .single<StoredConfirmation>();

    console.log("[medication-confirmations POST] insert:", data, error);

    if (error) {
      // Unique race: fetch and update the existing row instead.
      if (error.code === "23505") {
        const raced = await findTodayConfirmation({
          supabase,
          userId: user.id,
          medicationId: medication.id,
          doseTime: timeEntry.slot,
          scheduledAt,
        });

        if (raced) {
          const { data: updated, error: updateError } = await supabase
            .from("medication_confirmations")
            .update({
              confirmed_at: confirmation.confirmed_at,
              missed: confirmation.missed,
            })
            .eq("id", raced.id)
            .select(confirmationSelect)
            .single<StoredConfirmation>();

          if (updateError) throw updateError;

          return Response.json({
            confirmation: updated,
            alreadyConfirmed: Boolean(raced.confirmed_at),
          });
        }
      }

      throw error;
    }

    return Response.json({ confirmation: data, alreadyConfirmed: false });
  } catch (error) {
    console.error("Medication confirmation save failed", error);
    const message =
      error instanceof Error
        ? error.message
        : "Bestätigung konnte gerade nicht gespeichert werden.";

    return Response.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const payload = (await request.json()) as UndoPayload;
    const medicationId = normalizeMedicationId(payload.medication_id);
    const doseTime = normalizeDoseTime(payload.dose_time);
    const scheduledTime = normalizeScheduledTime(payload.scheduled_time);
    const { user } = await getAuthenticatedUser(request);

    if (!user) {
      return Response.json({ error: "Bitte melden Sie sich an." }, { status: 401 });
    }

    const authSupabase = await createClient();
    const supabase = createSupabaseDataClient() ?? authSupabase;
    const medication = await loadMedicationById(user.id, medicationId, supabase);

    if (!medication) {
      return Response.json({ error: "Medikament nicht gefunden." }, { status: 404 });
    }

    const scheduledAt = getScheduledAtForTime(scheduledTime).toISOString();
    const existing = await findTodayConfirmation({
      supabase,
      userId: user.id,
      medicationId: medication.id,
      doseTime,
      scheduledAt,
    });

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

async function findTodayConfirmation(input: {
  supabase: NonNullable<ReturnType<typeof createSupabaseDataClient>> | Awaited<
    ReturnType<typeof createClient>
  >;
  userId: string;
  medicationId: string;
  doseTime: MedicationTimeSlot;
  scheduledAt: string;
}) {
  const { start, end } = getTodayRange();

  const { data, error } = await input.supabase
    .from("medication_confirmations")
    .select(confirmationSelect)
    .eq("user_id", input.userId)
    .eq("medication_id", input.medicationId)
    .eq("dose_time", input.doseTime)
    .gte("scheduled_at", start.toISOString())
    .lt("scheduled_at", end.toISOString())
    .order("scheduled_at", { ascending: false })
    .returns<StoredConfirmation[]>();

  if (error) throw error;

  if (!data?.length) {
    // Exact timestamp fallback for older rows outside computed day bounds.
    const exact = await input.supabase
      .from("medication_confirmations")
      .select(confirmationSelect)
      .eq("user_id", input.userId)
      .eq("medication_id", input.medicationId)
      .eq("dose_time", input.doseTime)
      .eq("scheduled_at", input.scheduledAt)
      .maybeSingle<StoredConfirmation>();

    if (exact.error) throw exact.error;
    return exact.data;
  }

  return (
    data.find((row) => row.confirmed_at) ??
    data.find((row) => row.scheduled_at === input.scheduledAt) ??
    data[0]
  );
}

async function loadMedicationById(
  userId: string,
  medicationId: string,
  supabase: NonNullable<ReturnType<typeof createSupabaseDataClient>> | Awaited<
    ReturnType<typeof createClient>
  >,
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
