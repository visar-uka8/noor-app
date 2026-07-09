import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { formatLabResultDate } from "@/types/lab-results";

export const runtime = "nodejs";

type FamilyLink = {
  patient_id: string;
};

type StoredLabResult = {
  id: string;
  ai_analysis: string;
  created_at: string;
  file_url: string;
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
    const { data: familyLink, error: linkError } = await supabase
      .from("family_links")
      .select("patient_id")
      .eq("family_member_id", user.id)
      .eq("active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle<FamilyLink>();

    if (linkError) throw linkError;

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
