import {
  upsertTodayGoalProgress,
  isMissingDailyGoalLogsTable,
} from "@/lib/health-goals-data";
import { createSupabaseDataClient } from "@/lib/supabase-data";
import { getAuthenticatedSupabase } from "@/lib/supabase/request-auth";
import type { DailyGoalProgress } from "@/types/health-goals";
import type { PostgrestError } from "@supabase/supabase-js";

export const runtime = "nodejs";

type UpdatePayload = {
  steps?: unknown;
  waterLiters?: unknown;
  proteinGrams?: unknown;
};

function parseNonNegativeInt(value: unknown) {
  if (value == null || value === "") return undefined;
  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error("INVALID_NUMBER");
  }
  return parsed;
}

function parseNonNegativeFloat(value: unknown) {
  if (value == null || value === "") return undefined;
  const normalized = String(value).trim().replace(",", ".");
  const parsed = Number.parseFloat(normalized);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error("INVALID_NUMBER");
  }
  return Math.round(parsed * 10) / 10;
}

export async function PATCH(request: Request) {
  try {
    const { user, authError, supabase: authSupabase } =
      await getAuthenticatedSupabase(request);

    if (authError || !user) {
      return Response.json(
        { error: "Bitte melden Sie sich an." },
        { status: 401 },
      );
    }

    const payload = (await request.json()) as UpdatePayload;
    const updates: Partial<DailyGoalProgress> = {};

    const steps = parseNonNegativeInt(payload.steps);
    const waterLiters = parseNonNegativeFloat(payload.waterLiters);
    const proteinGrams = parseNonNegativeInt(payload.proteinGrams);

    if (steps !== undefined) updates.steps = steps;
    if (waterLiters !== undefined) updates.waterLiters = waterLiters;
    if (proteinGrams !== undefined) updates.proteinGrams = proteinGrams;

    if (Object.keys(updates).length === 0) {
      return Response.json(
        { error: "Keine gültigen Werte übermittelt." },
        { status: 400 },
      );
    }

    const supabase = createSupabaseDataClient() ?? authSupabase;
    const today = await upsertTodayGoalProgress(supabase, user.id, updates);

    return Response.json({ today });
  } catch (error) {
    if (error instanceof Error && error.message === "INVALID_NUMBER") {
      return Response.json(
        { error: "Bitte geben Sie einen gültigen Wert ein." },
        { status: 400 },
      );
    }

    console.error("Daily goal update failed", error);

    const message =
      error instanceof Error
        ? error.message
        : "Tagesfortschritt konnte nicht gespeichert werden.";
    const status =
      error instanceof Error &&
      "code" in error &&
      isMissingDailyGoalLogsTable(error as PostgrestError)
        ? 503
        : message.includes("migration_daily_goal_logs.sql")
          ? 503
          : 500;

    return Response.json({ error: message }, { status });
  }
}
