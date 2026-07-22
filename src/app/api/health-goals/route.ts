import {
  loadActiveHealthGoalsForUser,
  loadTodayGoalProgress,
} from "@/lib/health-goals-data";
import { createSupabaseDataClient } from "@/lib/supabase-data";
import { getAuthenticatedSupabase } from "@/lib/supabase/request-auth";
import type { HealthGoalsApiResponse } from "@/types/health-goals";

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
    const [goals, today] = await Promise.all([
      loadActiveHealthGoalsForUser(supabase, user.id),
      loadTodayGoalProgress(supabase, user.id),
    ]);

    const response: HealthGoalsApiResponse = {
      goals,
      today,
    };

    return Response.json(response);
  } catch (error) {
    console.error("Health goals load failed", error);

    return Response.json(
      { error: "Tagesziele konnten gerade nicht geladen werden." },
      { status: 500 },
    );
  }
}
