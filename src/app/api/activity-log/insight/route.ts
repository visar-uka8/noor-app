import {
  hasRecentActivityData,
} from "@/lib/activity-history";
import { generateActivityInsight } from "@/lib/activity-insight";
import { loadActivityHistoryLogs } from "@/lib/activity-log-data";
import { listLabResultsForUser } from "@/lib/lab-results-db";
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

    const [logs, labResults] = await Promise.all([
      loadActivityHistoryLogs(user.id, supabase, 30),
      listLabResultsForUser(supabase, user.id, 1),
    ]);

    const latestLab = labResults.data?.[0];

    if (
      !hasRecentActivityData(logs) ||
      !latestLab?.ai_analysis?.trim()
    ) {
      return Response.json({ available: false });
    }

    const result = await generateActivityInsight({
      logs,
      labAnalysis: latestLab.ai_analysis,
      labCreatedAt: latestLab.created_at,
    });

    return Response.json(result);
  } catch (error) {
    console.error("Activity insight load failed", error);

    return Response.json(
      { error: "Einblick konnte gerade nicht geladen werden." },
      { status: 500 },
    );
  }
}
