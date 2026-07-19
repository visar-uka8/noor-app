import { createClient } from "@/lib/supabase/server";
import { createSupabaseDataClient } from "@/lib/supabase-data";
import { resolveWatcherPatientLink } from "@/lib/family-links-query";
import { formatLabResultDate } from "@/types/lab-results";

export const runtime = "nodejs";

type StoredLabResult = {
  id: string;
  ai_analysis: string;
  created_at: string;
  file_url: string;
};

export async function GET(request: Request) {
  try {
    const authSupabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await authSupabase.auth.getUser();

    if (authError || !user) {
      return Response.json({ error: "Bitte melden Sie sich an." }, { status: 401 });
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

    const { data: labResult, error: labError } = await supabase
      .from("lab_results")
      .select("id, ai_analysis, created_at, file_url")
      .eq("user_id", familyLink.patient_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle<StoredLabResult>();

    if (labError) throw labError;

    if (!labResult) {
      return Response.json({ labResult: null });
    }

    return Response.json({
      labResult: {
        id: labResult.id,
        ai_analysis: labResult.ai_analysis,
        created_at: labResult.created_at,
        date: formatLabResultDate(labResult.created_at),
        file_url: labResult.file_url,
      },
      patientId: familyLink.patient_id,
    });
  } catch (error) {
    console.error("Family lab result load failed", error);

    return Response.json(
      { error: "Laboranalyse konnte gerade nicht geladen werden." },
      { status: 500 },
    );
  }
}
