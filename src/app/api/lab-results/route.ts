import { createClient } from "@/lib/supabase/server";
import { createSupabaseDataClient } from "@/lib/supabase-data";
import { listLabResultsForUser } from "@/lib/lab-results-db";

export const runtime = "nodejs";

export async function GET() {
  try {
    const authSupabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await authSupabase.auth.getUser();

    if (authError || !user?.id) {
      console.log("Lab results fetch: No user ID available", authError?.message);
      return Response.json(
        { error: "Bitte melden Sie sich an, um Laborwerte zu laden." },
        { status: 401 },
      );
    }

    const supabase = createSupabaseDataClient() ?? authSupabase;
    const { data, error } = await listLabResultsForUser(supabase, user.id);

    console.log("Lab results fetch:", {
      userId: user.id,
      count: data?.length ?? 0,
      error,
    });

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
