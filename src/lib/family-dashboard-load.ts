import type { SupabaseClient } from "@supabase/supabase-js";
import { loadTodayActivityLogs } from "@/lib/activity-log-data";
import { loadHealthPassportForUser } from "@/lib/health-passport-load";
import { isHealthPassportAvailable } from "@/lib/health-passport-completion";
import {
  buildFamilyDashboardData,
  getAnalysisFirstSentence,
  getCaretakerLabel,
  getPatientRelationshipLabel,
  type FamilyDashboardData,
} from "@/lib/family-dashboard-status";
import type { ActiveFamilyLink } from "@/lib/family-links-query";
import { loadDashboardProfileRow } from "@/lib/load-settings-profile";
import {
  loadActiveMedications,
  loadConfirmationsForStreak,
  loadTodayConfirmations,
  syncMissedDoses,
} from "@/lib/medication-data";
import { calculateMedicationStreak } from "@/lib/medication-streak";
import { formatLabResultDate } from "@/types/lab-results";

export async function loadFamilyDashboardForPatient(
  supabase: SupabaseClient,
  patientId: string,
  familyLink: ActiveFamilyLink,
): Promise<FamilyDashboardData> {
  const { profile, error: profileError } = await loadDashboardProfileRow(
    supabase,
    patientId,
    "Family dashboard profile load",
  );

  if (profileError) throw profileError;

  const medications = await loadActiveMedications(patientId, supabase);
  const confirmations = await loadTodayConfirmations(patientId, supabase);

  await syncMissedDoses(patientId, supabase, medications, confirmations);

  const refreshedConfirmations = await loadTodayConfirmations(
    patientId,
    supabase,
  );
  const streakConfirmations = await loadConfirmationsForStreak(
    patientId,
    supabase,
  );
  const medicationStreak = calculateMedicationStreak(
    medications,
    streakConfirmations,
  );
  const todayActivities = await loadTodayActivityLogs(patientId, supabase);

  const { data: labResult, error: labError } = await supabase
    .from("lab_results")
    .select("id, ai_analysis, created_at")
    .eq("user_id", patientId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<{
      id: string;
      ai_analysis: string;
      created_at: string;
    }>();

  if (labError) throw labError;

  const patientPassport = await loadHealthPassportForUser(patientId, supabase);
  const healthPassportAvailable = isHealthPassportAvailable(patientPassport);

  const firstName = profile?.first_name?.trim() || "Angehörige";
  const lastName = profile?.last_name?.trim() || "";
  const displayLabel = getCaretakerLabel(firstName);

  return buildFamilyDashboardData({
    member: {
      firstName,
      patientId,
      displayLabel,
      name: `${firstName}${lastName ? ` ${lastName}` : ""}`.trim(),
      relationship: getPatientRelationshipLabel(familyLink.relationship),
      phone: profile?.phone?.trim() || "+493012345678",
      avatarUrl: profile?.avatar_url ?? null,
    },
    medications,
    confirmations: refreshedConfirmations,
    medicationStreak,
    lastCheckIn: profile?.last_check_in_at ?? null,
    todayActivities,
    latestLabResult: labResult
      ? {
          id: labResult.id,
          date: formatLabResultDate(labResult.created_at),
          preview: getAnalysisFirstSentence(labResult.ai_analysis),
          analysis: labResult.ai_analysis,
        }
      : null,
    healthPassportAvailable,
  });
}

export function emptyFamilyDashboardResponse(): FamilyDashboardData {
  return {
    connected: false,
    member: null,
    overallStatus: "green",
    overallStatusText: "Alles okay heute ✓",
    medications: [],
    medicationStreak: 0,
    lastCheckIn: null,
    lastCheckInText: "Noch keine Aktivität heute",
    todayActivities: [],
    todayActivityText: null,
    latestLabResult: null,
    healthPassportAvailable: false,
  };
}
