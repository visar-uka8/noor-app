import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import type { LabResultRecord } from "@/types/lab-results";

export const runtime = "nodejs";

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
    const { data, error } = await supabase
      .from("lab_results")
      .select("id, file_url, ai_analysis, created_at, normal_count, watch_count, high_count")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(5)
      .returns<LabResultRecord[]>();

    if (error) throw error;

    return Response.json({ results: data ?? [] });
  } catch (error) {
    console.error("Lab results load failed", error);

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
