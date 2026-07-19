import { createClient } from "@/lib/supabase/server";
import { createSupabaseDataClient } from "@/lib/supabase-data";
import { resolveWatcherPatientLink } from "@/lib/family-links-query";
import {
  emptyFamilyDashboardResponse,
  loadFamilyDashboardForPatient,
} from "@/lib/family-dashboard-load";

export const runtime = "nodejs";

export async function GET(request: Request) {
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

    const patientId = new URL(request.url).searchParams.get("patientId");
    const supabase = createSupabaseDataClient() ?? authSupabase;
    const familyLink = await resolveWatcherPatientLink(
      supabase,
      user.id,
      patientId,
    );

    if (!familyLink) {
      return Response.json(emptyFamilyDashboardResponse());
    }

    const dashboard = await loadFamilyDashboardForPatient(
      supabase,
      familyLink.patient_id,
      familyLink,
    );

    return Response.json(dashboard);
  } catch (error) {
    console.error("Family dashboard load failed", error);

    return Response.json(
      { connected: false, error: "Dashboard konnte gerade nicht geladen werden." },
      { status: 500 },
    );
  }
}
