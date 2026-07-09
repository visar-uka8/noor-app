import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import {
  loadActiveMedications,
  loadTodayConfirmations,
  syncMissedDoses,
} from "@/lib/medication-data";
import {
  buildFamilyDashboardData,
  getAnalysisFirstSentence,
  getCaretakerLabel,
  getPatientRelationshipLabel,
} from "@/lib/family-dashboard-status";
import { formatLabResultDate } from "@/types/lab-results";
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

    const medications = await loadActiveMedications(familyLink.patient_id, supabase);
    const confirmations = await loadTodayConfirmations(
      familyLink.patient_id,
      supabase,
    );

    await syncMissedDoses(
      familyLink.patient_id,
      supabase,
      medications,
      confirmations,
    );

    const refreshedConfirmations = await loadTodayConfirmations(
      familyLink.patient_id,
      supabase,
    );

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
        firstName,
        patientId: familyLink.patient_id,
        displayLabel: getCaretakerLabel(firstName),
        name: `${firstName}${lastName ? ` ${lastName}` : ""}`.trim(),
        relationship: getPatientRelationshipLabel(familyLink.relationship),
        phone: profile?.phone?.trim() || "+493012345678",
      },
      medications,
      confirmations: refreshedConfirmations,
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

function emptyDashboardResponse(): FamilyDashboardData {
  return {
    connected: false,
    member: null,
    overallStatus: "green",
    overallStatusText: "Alles okay heute ✓",
    medications: [],
    lastCheckIn: null,
    lastCheckInText: "Noch keine Aktivität heute",
    latestLabResult: null,
  };
}
