import { createClient } from "@/lib/supabase/server";
import { createSupabaseDataClient } from "@/lib/supabase-data";
import { resolveWatcherPatientLink } from "@/lib/family-links-query";
import { listLabResultsForUser } from "@/lib/lab-results-db";
import type { LabResultRecord } from "@/types/lab-results";

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
        { error: "Bitte melden Sie sich an, um Laborwerte zu laden." },
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
      return Response.json(
        { error: "Keine aktive Familienverbindung gefunden." },
        { status: 404 },
      );
    }

    const { data, error } = await listLabResultsForUser(
      supabase,
      familyLink.patient_id,
      5,
    );

    if (error) throw error;

    return Response.json({ results: (data ?? []) as LabResultRecord[] });
  } catch (error) {
    console.error("Family lab results load failed", error);

    return Response.json(
      { error: "Laborwerte konnten gerade nicht geladen werden." },
      { status: 500 },
    );
  }
}
