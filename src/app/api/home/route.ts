import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import {
  buildHomeMedicationSummary,
  formatHomeLabDate,
  getInitials,
  isHealthPassportComplete,
  type HomeScreenData,
} from "@/lib/home-screen";
import type { HealthPassportData } from "@/types/health-passport";
import type { MedicationTime } from "@/types/medication";
import { medicationDoses } from "@/types/medication";

export const runtime = "nodejs";

type Profile = {
  first_name: string;
  last_name: string;
};

type StoredConfirmation = {
  dose_time: MedicationTime;
  medication_name: string;
  confirmed_at: string | null;
  missed: boolean;
};

type StoredPassport = {
  personal: HealthPassportData["personal"];
  medications: HealthPassportData["medications"];
  allergies: HealthPassportData["allergies"];
  surgeries: HealthPassportData["surgeries"];
  emergency_contact: HealthPassportData["emergencyContact"];
};

const doseSchedule: Record<MedicationTime, { hour: number; minute: number }> = {
  morning: { hour: 8, minute: 0 },
  midday: { hour: 12, minute: 0 },
  evening: { hour: 20, minute: 0 },
};

export async function GET() {
  try {
    const authSupabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await authSupabase.auth.getUser();

    if (authError || !user) {
      return Response.json({ error: "Bitte melden Sie sich an." }, { status: 401 });
    }

    const supabase = createSupabaseDataClient() ?? authSupabase;

    const [
      profileResult,
      confirmationsResult,
      labResult,
      familyLinksResult,
      passportResult,
    ] = await Promise.all([
      supabase
        .from("profiles")
        .select("first_name, last_name")
        .eq("id", user.id)
        .maybeSingle<Profile>(),
      loadTodayConfirmations(user.id, supabase),
      supabase
        .from("lab_results")
        .select("created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle<{ created_at: string }>(),
      supabase
        .from("family_links")
        .select("id", { count: "exact", head: true })
        .eq("patient_id", user.id)
        .eq("active", true),
      supabase
        .from("health_passports")
        .select("personal, medications, allergies, surgeries, emergency_contact")
        .eq("user_id", user.id)
        .maybeSingle<StoredPassport>(),
    ]);

    const firstName = profileResult.data?.first_name?.trim() || "Noor";
    const lastName = profileResult.data?.last_name?.trim() || "";
    const medication = buildHomeMedicationSummary(confirmationsResult);
    const passport = passportResult.data
      ? {
          userId: user.id,
          personal: passportResult.data.personal,
          medications: passportResult.data.medications,
          allergies: passportResult.data.allergies,
          surgeries: passportResult.data.surgeries,
          emergencyContact: passportResult.data.emergency_contact,
        }
      : null;

    const payload: HomeScreenData = {
      firstName,
      initials: getInitials(firstName, lastName),
      medication,
      labResult: {
        hasResult: Boolean(labResult.data?.created_at),
        lastDate: formatHomeLabDate(labResult.data?.created_at ?? null),
      },
      family: {
        connectedCount: familyLinksResult.count ?? 0,
      },
      healthPassport: {
        complete: isHealthPassportComplete(passport),
      },
    };

    return Response.json(payload);
  } catch (error) {
    console.error("Home screen load failed", error);

    return Response.json(
      { error: "Startseite konnte gerade nicht geladen werden." },
      { status: 500 },
    );
  }
}

async function loadTodayConfirmations(
  userId: string,
  supabase: NonNullable<ReturnType<typeof createSupabaseDataClient>>,
) {
  const { start, end } = getTodayRange();
  const { data, error } = await supabase
    .from("medication_confirmations")
    .select("dose_time, medication_name, confirmed_at, missed")
    .eq("user_id", userId)
    .gte("scheduled_at", start.toISOString())
    .lt("scheduled_at", end.toISOString())
    .returns<StoredConfirmation[]>();

  if (error) throw error;

  await syncMissedDoses(userId, supabase, data ?? []);

  const { data: refreshedData, error: refreshedError } = await supabase
    .from("medication_confirmations")
    .select("dose_time, medication_name, confirmed_at, missed")
    .eq("user_id", userId)
    .gte("scheduled_at", start.toISOString())
    .lt("scheduled_at", end.toISOString())
    .returns<StoredConfirmation[]>();

  if (refreshedError) throw refreshedError;

  return refreshedData ?? [];
}

async function syncMissedDoses(
  userId: string,
  supabase: NonNullable<ReturnType<typeof createSupabaseDataClient>>,
  confirmations: StoredConfirmation[],
) {
  const missedRows = medicationDoses
    .filter((dose) => isMissed(dose.time))
    .map((dose) => {
      const medicationName = `${dose.name}${dose.dose ? ` ${dose.dose}` : ""}`.trim();
      const existing = confirmations.find(
        (confirmation) =>
          confirmation.medication_name.startsWith(dose.name) &&
          confirmation.dose_time === dose.time,
      );

      return {
        existing,
        record: {
          user_id: userId,
          medication_name: medicationName,
          dose_time: dose.time,
          scheduled_at: getScheduledAt(dose.time).toISOString(),
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
          .eq("user_id", userId)
          .eq("dose_time", record.dose_time)
          .gte("scheduled_at", getTodayRange().start.toISOString());
      }

      return supabase.from("medication_confirmations").insert(record);
    }),
  );
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

function createSupabaseDataClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) return null;

  return createAdminClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false },
  });
}
