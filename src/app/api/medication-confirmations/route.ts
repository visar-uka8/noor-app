import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { medicationDoses, type MedicationTime } from "@/types/medication";

export const runtime = "nodejs";

const doseSchedule: Record<MedicationTime, { hour: number; minute: number }> = {
  morning: { hour: 8, minute: 0 },
  midday: { hour: 12, minute: 0 },
  evening: { hour: 20, minute: 0 },
};

type ConfirmationPayload = {
  medication_name?: unknown;
  dose_time?: unknown;
};

type StoredConfirmation = {
  id: string;
  dose_time: MedicationTime;
  medication_name: string;
  scheduled_at: string;
  confirmed_at: string | null;
  missed: boolean;
};

type SupabaseDataClient =
  | Awaited<ReturnType<typeof createClient>>
  | NonNullable<ReturnType<typeof createSupabaseDataClient>>;

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

    const { start, end } = getTodayRange();
    const supabase = createSupabaseDataClient() ?? authSupabase;
    const { data, error } = await supabase
      .from("medication_confirmations")
      .select("id, dose_time, medication_name, scheduled_at, confirmed_at, missed")
      .eq("user_id", user.id)
      .gte("scheduled_at", start.toISOString())
      .lt("scheduled_at", end.toISOString())
      .returns<StoredConfirmation[]>();

    if (error) throw error;

    await syncMissedDoses(user.id, supabase, data ?? []);

    const { data: refreshedData, error: refreshedError } = await supabase
      .from("medication_confirmations")
      .select("id, dose_time, medication_name, scheduled_at, confirmed_at, missed")
      .eq("user_id", user.id)
      .gte("scheduled_at", start.toISOString())
      .lt("scheduled_at", end.toISOString())
      .returns<StoredConfirmation[]>();

    if (refreshedError) throw refreshedError;

    return Response.json({ confirmations: refreshedData ?? [] });
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
    const medicationName = normalizeMedicationName(payload.medication_name);
    const doseTime = normalizeDoseTime(payload.dose_time);
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

    const confirmation = {
      user_id: user.id,
      medication_name: medicationName,
      dose_time: doseTime,
      scheduled_at: getScheduledAt(doseTime).toISOString(),
      confirmed_at: new Date().toISOString(),
      missed: isMissed(doseTime),
    };
    const supabase = createSupabaseDataClient() ?? authSupabase;

    const { data: existingConfirmation, error: existingError } = await supabase
      .from("medication_confirmations")
      .select("id, confirmed_at")
      .eq("user_id", user.id)
      .eq("medication_name", medicationName)
      .eq("dose_time", doseTime)
      .eq("scheduled_at", confirmation.scheduled_at)
      .maybeSingle<{ id: string; confirmed_at: string | null }>();

    if (existingError) throw existingError;

    if (existingConfirmation?.confirmed_at) {
      return Response.json({ confirmation: existingConfirmation, alreadyConfirmed: true });
    }

    if (existingConfirmation) {
      const { data, error } = await supabase
        .from("medication_confirmations")
        .update({
          confirmed_at: confirmation.confirmed_at,
          missed: confirmation.missed,
        })
        .eq("id", existingConfirmation.id)
        .select("id, dose_time, medication_name, scheduled_at, confirmed_at, missed")
        .single<StoredConfirmation>();

      if (error) throw error;

      return Response.json({ confirmation: data, alreadyConfirmed: false });
    }

    const { data, error } = await supabase
      .from("medication_confirmations")
      .insert(confirmation)
      .select("id, dose_time, medication_name, scheduled_at, confirmed_at, missed")
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

type UndoPayload = {
  dose_time?: unknown;
};

export async function DELETE(request: Request) {
  try {
    const payload = (await request.json()) as UndoPayload;
    const doseTime = normalizeDoseTime(payload.dose_time);
    const authSupabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await authSupabase.auth.getUser();

    if (authError || !user) {
      return Response.json(
        { error: "Bitte melden Sie sich an." },
        { status: 401 },
      );
    }

    const { start, end } = getTodayRange();
    const supabase = createSupabaseDataClient() ?? authSupabase;
    const dose = medicationDoses.find((item) => item.time === doseTime);

    if (!dose) {
      return Response.json({ error: "Dosis nicht gefunden." }, { status: 404 });
    }

    const medicationName = `${dose.name}${dose.dose ? ` ${dose.dose}` : ""}`.trim();
    const scheduledAt = getScheduledAt(doseTime).toISOString();

    const { data: existing, error: existingError } = await supabase
      .from("medication_confirmations")
      .select("id, confirmed_at")
      .eq("user_id", user.id)
      .eq("medication_name", medicationName)
      .eq("dose_time", doseTime)
      .eq("scheduled_at", scheduledAt)
      .maybeSingle<{ id: string; confirmed_at: string | null }>();

    if (existingError) throw existingError;

    if (!existing?.confirmed_at) {
      return Response.json({ undone: true });
    }

    const { error } = await supabase
      .from("medication_confirmations")
      .update({ confirmed_at: null, missed: isMissed(doseTime) })
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

function createSupabaseDataClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) return null;

  return createAdminClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false },
  });
}

async function syncMissedDoses(
  userId: string,
  supabase: SupabaseDataClient,
  confirmations: StoredConfirmation[],
) {
  const missedRows = medicationDoses
    .filter((dose) => isMissed(dose.time))
    .map((dose) => {
      const medicationName = `${dose.name}${dose.dose ? ` ${dose.dose}` : ""}`.trim();
      const scheduledAt = getScheduledAt(dose.time).toISOString();
      const existing = confirmations.find(
        (confirmation) =>
          confirmation.medication_name === medicationName &&
          confirmation.dose_time === dose.time &&
          new Date(confirmation.scheduled_at).getTime() ===
            new Date(scheduledAt).getTime(),
      );

      return {
        existing,
        record: {
          user_id: userId,
          medication_name: medicationName,
          dose_time: dose.time,
          scheduled_at: scheduledAt,
          confirmed_at: existing?.confirmed_at ?? null,
          missed: true,
        },
      };
    })
    .filter(({ existing }) => !existing?.confirmed_at);

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

  await Promise.all(
    missedRows.map(({ existing, record }) =>
      existing?.missed
        ? Promise.resolve()
        : sendMissedDoseAlert(userId, record, supabase),
    ),
  );
}

async function sendMissedDoseAlert(
  userId: string,
  record: {
    medication_name: string;
    dose_time: MedicationTime;
    scheduled_at: string;
  },
  supabase: SupabaseDataClient,
) {
  const familyEmail = process.env.FAMILY_ALERT_EMAIL;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) return;

  const { start, end } = getTodayRange();
  const { data: alreadySent, error } = await supabase
    .from("notifications_sent")
    .select("id")
    .eq("patient_id", userId)
    .eq("medication_name", record.medication_name)
    .eq("dose_time", record.dose_time)
    .gte("sent_at", start.toISOString())
    .lt("sent_at", end.toISOString())
    .maybeSingle<{ id: string }>();

  if (error || alreadySent) return;

  const { data: profile } = await supabase
    .from("profiles")
    .select("first_name, last_name")
    .eq("id", userId)
    .maybeSingle<{ first_name: string; last_name: string }>();

  const patientFirstName = profile?.first_name?.trim() || "Renate";
  const patientLastName = profile?.last_name?.trim() || "Leka";
  const patientName = `${patientFirstName} ${patientLastName}`.trim();
  const caretakerLabel = getCaretakerLabel(patientFirstName);
  const scheduledTime = new Intl.DateTimeFormat("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(record.scheduled_at));

  await fetch(`${supabaseUrl}/functions/v1/send-missed-dose-alert`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      patient_id: userId,
      patient_name: patientName,
      patient_first_name: patientFirstName,
      caretaker_label: caretakerLabel,
      medication_name: record.medication_name,
      dose_time: record.dose_time,
      scheduled_time: scheduledTime,
      family_email: familyEmail ?? undefined,
    }),
  }).catch((alertError) => {
    console.error("Missed dose alert trigger failed", alertError);
  });

  await supabase.from("notifications_sent").insert({
    patient_id: userId,
    family_email: familyEmail ?? "push-only@noor.local",
    medication_name: record.medication_name,
    dose_time: record.dose_time,
    sent_at: new Date().toISOString(),
  });
}

function getCaretakerLabel(firstName: string) {
  const normalized = firstName.trim().toLowerCase();

  if (normalized === "hans") return "Papa";
  if (normalized === "renate") return "Mama";

  return "Mama";
}

function normalizeMedicationName(value: unknown) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error("Medication name is required.");
  }

  return value.trim();
}

function normalizeDoseTime(value: unknown): MedicationTime {
  if (value === "morning" || value === "midday" || value === "evening") {
    return value;
  }

  throw new Error("Dose time is invalid.");
}

function getScheduledAt(doseTime: MedicationTime) {
  const scheduledAt = new Date();
  const schedule = doseSchedule[doseTime];
  scheduledAt.setHours(schedule.hour, schedule.minute, 0, 0);
  return scheduledAt;
}

function isMissed(doseTime: MedicationTime) {
  const missedAfter = getScheduledAt(doseTime);
  missedAfter.setMinutes(missedAfter.getMinutes() + 90);

  return Date.now() > missedAfter.getTime();
}

function getTodayRange() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  return { start, end };
}
