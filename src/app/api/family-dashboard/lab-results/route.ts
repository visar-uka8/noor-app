import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import type { LabResultRecord } from "@/types/lab-results";

export const runtime = "nodejs";

type FamilyLink = {
  patient_id: string;
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
        { error: "Bitte melden Sie sich an, um Laborwerte zu laden." },
        { status: 401 },
      );
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

    const { data, error } = await supabase
      .from("lab_results")
      .select("id, file_url, ai_analysis, created_at")
      .eq("user_id", familyLink.patient_id)
      .order("created_at", { ascending: false })
      .limit(5)
      .returns<LabResultRecord[]>();

    if (error) throw error;

    return Response.json({ results: data ?? [] });
  } catch (error) {
    console.error("Family lab results load failed", error);

    return Response.json(
      { error: "Laborwerte konnten gerade nicht geladen werden." },
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
