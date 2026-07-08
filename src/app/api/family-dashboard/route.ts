import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import {
  buildFamilyDashboardData,
  getAnalysisFirstSentence,
  getCaretakerLabel,
  getPatientRelationshipLabel,
} from "@/lib/family-dashboard-status";
import { formatLabResultDate } from "@/types/lab-results";
import type { MedicationTime } from "@/types/medication";
import { medicationDoses } from "@/types/medication";
import type { FamilyDashboardData } from "@/lib/family-dashboard-status";

export const runtime = "nodejs";

type FamilyLink = {
  patient_id: string;
  relationship: string;
};

type PatientProfile = {
  first_name: string;
  last_name: string;
  phone: string | null;
  last_check_in_at: string | null;
};

type StoredConfirmation = {
  dose_time: MedicationTime;
  medication_name: string;
  confirmed_at: string | null;
  missed: boolean;
};

type StoredLabResult = {
  id: string;
  ai_analysis: string;
  created_at: string;
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
        { connected: false, error: "Bitte melden Sie sich an." },
        { status: 401 },
      );
    }

    const supabase = createSupabaseDataClient() ?? authSupabase;
    const { data: familyLink, error: linkError } = await supabase
      .from("family_links")
      .select("patient_id, relationship")
      .eq("family_member_id", user.id)
      .eq("active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle<FamilyLink>();

    if (linkError) throw linkError;

    if (!familyLink) {
      return Response.json(emptyDashboardResponse());
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("first_name, last_name, phone, last_check_in_at")
      .eq("id", familyLink.patient_id)
      .maybeSingle<PatientProfile>();

    if (profileError) throw profileError;

    const { start, end } = getTodayRange();
    const { data: confirmations, error: confirmationsError } = await supabase
      .from("medication_confirmations")
      .select("dose_time, medication_name, confirmed_at, missed")
      .eq("user_id", familyLink.patient_id)
      .gte("scheduled_at", start.toISOString())
      .lt("scheduled_at", end.toISOString())
      .returns<StoredConfirmation[]>();

    if (confirmationsError) throw confirmationsError;

    await syncMissedDoses(familyLink.patient_id, supabase, confirmations ?? []);

    const { data: refreshedConfirmations, error: refreshedError } = await supabase
      .from("medication_confirmations")
      .select("dose_time, medication_name, confirmed_at, missed")
      .eq("user_id", familyLink.patient_id)
      .gte("scheduled_at", start.toISOString())
      .lt("scheduled_at", end.toISOString())
      .returns<StoredConfirmation[]>();

    if (refreshedError) throw refreshedError;

    const { data: labResult, error: labError } = await supabase
      .from("lab_results")
      .select("id, ai_analysis, created_at")
      .eq("user_id", familyLink.patient_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle<StoredLabResult>();

    if (labError) throw labError;

    const firstName = profile?.first_name?.trim() || "Mama";
    const lastName = profile?.last_name?.trim() || "";
    const dashboard = buildFamilyDashboardData({
      member: {
        patientId: familyLink.patient_id,
        displayLabel: getCaretakerLabel(firstName),
        name: `${firstName}${lastName ? ` ${lastName}` : ""}`.trim(),
        relationship: getPatientRelationshipLabel(familyLink.relationship),
        phone: profile?.phone?.trim() || "+493012345678",
      },
      confirmations: refreshedConfirmations ?? [],
      lastCheckIn: profile?.last_check_in_at ?? null,
      latestLabResult: labResult
        ? {
            id: labResult.id,
            date: formatLabResultDate(labResult.created_at),
            preview: getAnalysisFirstSentence(labResult.ai_analysis),
            analysis: labResult.ai_analysis,
          }
        : null,
    });

    return Response.json(dashboard);
  } catch (error) {
    console.error("Family dashboard load failed", error);

    return Response.json(
      { connected: false, error: "Dashboard konnte gerade nicht geladen werden." },
      { status: 500 },
    );
  }
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

function getTodayRange() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  return { start, end };
}

const doseSchedule: Record<MedicationTime, { hour: number; minute: number }> = {
  morning: { hour: 8, minute: 0 },
  midday: { hour: 12, minute: 0 },
  evening: { hour: 20, minute: 0 },
};

async function syncMissedDoses(
  userId: string,
  supabase: NonNullable<ReturnType<typeof createSupabaseDataClient>>,
  confirmations: StoredConfirmation[],
) {
  const missedRows = medicationDoses
    .filter((dose) => isMissed(dose.time))
    .map((dose) => {
      const medicationName = `${dose.name}${dose.dose ? ` ${dose.dose}` : ""}`.trim();
      const scheduledAt = getScheduledAt(dose.time).toISOString();
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

function emptyDashboardResponse(): FamilyDashboardData {
  return {
    connected: false,
    member: null,
    overallStatus: "green",
    overallStatusText: "Alles okay heute ✓",
    medications: [],
    lastCheckIn: null,
    lastCheckInText: "Noch kein Check-in heute",
    latestLabResult: null,
  };
}
