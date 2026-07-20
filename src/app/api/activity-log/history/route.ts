import { buildActivityHistorySummary } from "@/lib/activity-history";
import { loadActivityHistoryLogs } from "@/lib/activity-log-data";
import { createSupabaseDataClient } from "@/lib/supabase-data";
import { getAuthenticatedSupabase } from "@/lib/supabase/request-auth";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const { user, authError, supabase: authSupabase } =
      await getAuthenticatedSupabase(request);

    if (authError || !user) {
      return Response.json(
        { error: "Bitte melden Sie sich an." },
        { status: 401 },
      );
    }

    const supabase = createSupabaseDataClient() ?? authSupabase;
    const logs = await loadActivityHistoryLogs(user.id, supabase);
    const summary = buildActivityHistorySummary(logs);

    return Response.json(summary);
  } catch (error) {
    console.error("Activity history load failed", error);

    return Response.json(
      { error: "Aktivitätsverlauf konnte gerade nicht geladen werden." },
      { status: 500 },
    );
  }
}
