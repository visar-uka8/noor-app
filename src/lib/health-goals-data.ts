import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";
import type {
  ActiveHealthGoals,
  DailyGoalProgress,
} from "@/types/health-goals";
import { getTodayDateString } from "@/types/activity-log";

type HealthGoalRow = {
  id: string;
  steps_goal: number | null;
  water_goal_liters: number | string | null;
  protein_goal_grams: number | null;
  calculated_at: string;
  valid_until: string | null;
};

type DailyGoalLogRow = {
  steps: number | null;
  water_liters: number | string | null;
  protein_grams: number | null;
};

function formatGoalDateLabel(isoDate: string) {
  return new Intl.DateTimeFormat("de-DE", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(isoDate));
}

function toNumber(value: number | string | null | undefined) {
  if (value == null) return null;
  const parsed = typeof value === "number" ? value : Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function mapHealthGoalRow(row: HealthGoalRow): ActiveHealthGoals {
  return {
    id: row.id,
    stepsGoal: row.steps_goal,
    waterGoalLiters: toNumber(row.water_goal_liters),
    proteinGoalGrams: row.protein_goal_grams,
    calculatedAt: row.calculated_at,
    goalDateLabel: formatGoalDateLabel(row.calculated_at),
  };
}

function mapDailyGoalLogRow(row: DailyGoalLogRow | null): DailyGoalProgress {
  return {
    steps: row?.steps ?? 0,
    waterLiters: toNumber(row?.water_liters) ?? 0,
    proteinGrams: row?.protein_grams ?? 0,
  };
}

export async function loadActiveHealthGoalsForUser(
  supabase: SupabaseClient,
  userId: string,
) {
  const nowIso = new Date().toISOString();

  const { data, error } = await supabase
    .from("health_goals")
    .select(
      "id, steps_goal, water_goal_liters, protein_goal_grams, calculated_at, valid_until",
    )
    .eq("user_id", userId)
    .or(`valid_until.is.null,valid_until.gte.${nowIso}`)
    .order("calculated_at", { ascending: false })
    .limit(1)
    .maybeSingle<HealthGoalRow>();

  if (error) {
    if (isMissingHealthGoalsTable(error)) {
      return null;
    }
    throw error;
  }

  if (!data) {
    return null;
  }

  return mapHealthGoalRow(data);
}

export async function loadTodayGoalProgress(
  supabase: SupabaseClient,
  userId: string,
  date = getTodayDateString(),
) {
  const { data, error } = await supabase
    .from("daily_goal_logs")
    .select("steps, water_liters, protein_grams")
    .eq("user_id", userId)
    .eq("date", date)
    .maybeSingle<DailyGoalLogRow>();

  if (error) {
    if (isMissingDailyGoalLogsTable(error)) {
      return mapDailyGoalLogRow(null);
    }
    throw error;
  }

  return mapDailyGoalLogRow(data);
}

export async function upsertTodayGoalProgress(
  supabase: SupabaseClient,
  userId: string,
  updates: Partial<DailyGoalProgress>,
  date = getTodayDateString(),
) {
  const existing = await loadTodayGoalProgress(supabase, userId, date);

  const payload = {
    user_id: userId,
    date,
    steps: updates.steps ?? existing.steps,
    water_liters: updates.waterLiters ?? existing.waterLiters,
    protein_grams: updates.proteinGrams ?? existing.proteinGrams,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("daily_goal_logs")
    .upsert(payload, { onConflict: "user_id,date" })
    .select("steps, water_liters, protein_grams")
    .single<DailyGoalLogRow>();

  if (error) {
    throw formatDailyGoalLogSaveError(error);
  }

  return mapDailyGoalLogRow(data);
}

export function isMissingDailyGoalLogsTable(error: PostgrestError | null) {
  if (!error) return false;

  const message = `${error.message ?? ""} ${error.details ?? ""}`.toLowerCase();

  return (
    error.code === "42P01" ||
    error.code === "PGRST205" ||
    (message.includes("daily_goal_logs") && message.includes("does not exist"))
  );
}

function isMissingHealthGoalsTable(error: PostgrestError | null) {
  if (!error) return false;

  const message = `${error.message ?? ""} ${error.details ?? ""}`.toLowerCase();

  return (
    error.code === "42P01" ||
    error.code === "PGRST205" ||
    (message.includes("health_goals") && message.includes("does not exist"))
  );
}

function isDailyGoalLogsRlsError(error: PostgrestError | null) {
  if (!error) return false;

  const message = `${error.message ?? ""} ${error.details ?? ""}`.toLowerCase();

  return (
    error.code === "42501" ||
    message.includes("row-level security") ||
    message.includes("permission denied")
  );
}

export function formatDailyGoalLogSaveError(error: PostgrestError | Error) {
  if (!(error && typeof error === "object" && "code" in error)) {
    return error instanceof Error
      ? error
      : new Error("Wasser konnte gerade nicht gespeichert werden.");
  }

  const pgError = error as PostgrestError;

  if (isMissingDailyGoalLogsTable(pgError)) {
    return new Error(
      "Wasserprotokoll ist noch nicht eingerichtet. Bitte migration_daily_goal_logs.sql in Supabase ausführen.",
    );
  }

  if (isDailyGoalLogsRlsError(pgError)) {
    return new Error("Speichern nicht erlaubt. Bitte melden Sie sich erneut an.");
  }

  const message = pgError.message?.trim();
  if (message) {
    return new Error(message);
  }

  return new Error("Wasser konnte gerade nicht gespeichert werden.");
}

export function formatGoalProgressValue(
  value: number,
  unit: string,
  options?: { decimals?: number },
) {
  const decimals = options?.decimals ?? (unit === "L" ? 1 : 0);
  const formatted = value.toLocaleString("de-DE", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  return unit ? `${formatted}${unit === "L" ? " L" : ` ${unit}`}` : formatted;
}

export function formatGoalTargetValue(
  value: number,
  unit: string,
  options?: { decimals?: number },
) {
  const decimals = options?.decimals ?? (unit === "L" ? 1 : 0);
  const formatted = value.toLocaleString("de-DE", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  if (unit === "L") {
    return `${formatted} L`;
  }

  if (unit === "g") {
    return `${formatted} g`;
  }

  if (unit) {
    return `${formatted} ${unit}`;
  }

  return formatted;
}

export function getGoalProgressRatio(current: number, goal: number) {
  if (goal <= 0) return 0;
  return Math.min(current / goal, 1);
}

export function resolveWaterGoalLiters(options: {
  labGoalLiters?: number | null;
  gender?: string | null;
}) {
  if (options.labGoalLiters != null && options.labGoalLiters > 0) {
    return options.labGoalLiters;
  }

  if (options.gender === "male") {
    return 2.5;
  }

  return 2;
}

export async function loadHomeWaterSummary(
  supabase: SupabaseClient,
  userId: string,
  gender?: string | null,
) {
  const [goals, today] = await Promise.all([
    loadActiveHealthGoalsForUser(supabase, userId),
    loadTodayGoalProgress(supabase, userId),
  ]);

  return {
    liters: today.waterLiters,
    goalLiters: resolveWaterGoalLiters({
      labGoalLiters: goals?.waterGoalLiters ?? null,
      gender,
    }),
  };
}
