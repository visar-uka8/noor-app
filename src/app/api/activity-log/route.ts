import { createSupabaseDataClient } from "@/lib/supabase-data";
import { getAuthenticatedSupabase } from "@/lib/supabase/request-auth";
import {
  insertActivityLog,
  loadTodayActivityLogs,
  formatActivityLogSaveError,
  isMissingActivityLogsTableError,
} from "@/lib/activity-log-data";
import type { PostgrestError } from "@supabase/supabase-js";
import type { ActivityType } from "@/types/activity-log";

export const runtime = "nodejs";

type ActivityLogPayload = {
  activity_type?: unknown;
  duration_minutes?: unknown;
  note?: unknown;
};

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
    const logs = await loadTodayActivityLogs(user.id, supabase);

    return Response.json({ logs });
  } catch (error) {
    console.error("Activity log load failed", error);

    return Response.json(
      { error: "Aktivität konnte gerade nicht geladen werden." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const { user, authError, supabase: authSupabase } =
      await getAuthenticatedSupabase(request);

    if (authError || !user) {
      console.error("Activity log auth failed:", authError?.message ?? "no user");
      return Response.json(
        { error: "Bitte melden Sie sich an." },
        { status: 401 },
      );
    }

    const payload = (await request.json()) as ActivityLogPayload;
    const activityType = normalizeActivityType(payload.activity_type);
    const durationMinutes =
      activityType === "rest"
        ? null
        : normalizeDuration(payload.duration_minutes);
    const note = normalizeNote(payload.note);

    const supabase = createSupabaseDataClient() ?? authSupabase;
    const log = await insertActivityLog(user.id, supabase, {
      activity_type: activityType,
      duration_minutes: durationMinutes,
      note,
    });

    if (!log) {
      return Response.json(
        { error: "Aktivität konnte nicht gespeichert werden." },
        { status: 500 },
      );
    }

    return Response.json({ stored: true, log });
  } catch (error) {
    console.error("Activity log save failed", error);

    if (error && typeof error === "object" && "code" in error) {
      const pgError = error as PostgrestError;
      const message = formatActivityLogSaveError(pgError);
      const status = isMissingActivityLogsTableError(pgError) ? 503 : 400;

      return Response.json({ error: message, code: pgError.code }, { status });
    }

    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Aktivität konnte gerade nicht gespeichert werden.",
      },
      { status: 400 },
    );
  }
}

function normalizeActivityType(value: unknown): ActivityType {
  if (
    value === "walk" ||
    value === "sport" ||
    value === "intense" ||
    value === "rest"
  ) {
    return value;
  }

  throw new Error("Bitte wählen Sie eine Aktivität aus.");
}

function normalizeDuration(value: unknown) {
  if (value == null || value === "") {
    return null;
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error("Bitte wählen Sie eine Dauer aus.");
  }

  return Math.round(parsed);
}

function normalizeNote(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed.slice(0, 500) : null;
}
