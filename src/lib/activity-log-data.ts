import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";
import { getTodayDateString } from "@/types/activity-log";
import type { ActivityType, StoredActivityLog } from "@/types/activity-log";

export function isMissingActivityLogsTableError(error: PostgrestError | null) {
  if (!error) return false;

  const message = `${error.message ?? ""} ${error.details ?? ""}`.toLowerCase();

  return (
    error.code === "42P01" ||
    error.code === "PGRST205" ||
    (message.includes("relation") &&
      message.includes("does not exist") &&
      message.includes("activity_logs"))
  );
}

export function isActivityLogsDuplicateDayError(error: PostgrestError | null) {
  if (!error) return false;

  const message = `${error.message ?? ""} ${error.details ?? ""}`.toLowerCase();

  return (
    error.code === "23505" &&
    (message.includes("activity_logs") ||
      message.includes("user_id") ||
      message.includes("date"))
  );
}

export function isActivityLogsRlsError(error: PostgrestError | null) {
  if (!error) return false;

  const message = `${error.message ?? ""} ${error.details ?? ""}`.toLowerCase();

  return (
    error.code === "42501" ||
    message.includes("row-level security") ||
    message.includes("permission denied")
  );
}

export function formatActivityLogSaveError(error: PostgrestError) {
  if (isMissingActivityLogsTableError(error)) {
    return "Aktivitätsprotokoll ist noch nicht eingerichtet. Bitte migration_activity_logs.sql in Supabase ausführen.";
  }

  if (isActivityLogsDuplicateDayError(error)) {
    return "Mehrere Aktivitäten pro Tag sind noch nicht freigeschaltet. Bitte migration_activity_logs_multiple.sql in Supabase ausführen.";
  }

  if (isActivityLogsRlsError(error)) {
    return "Speichern nicht erlaubt. Bitte melden Sie sich erneut an.";
  }

  const message = error.message?.trim();
  if (message) {
    return message;
  }

  return "Aktivität konnte gerade nicht gespeichert werden.";
}

export async function loadTodayActivityLogs(
  userId: string,
  supabase: SupabaseClient,
) {
  const today = getTodayDateString();

  const { data, error } = await supabase
    .from("activity_logs")
    .select("*")
    .eq("user_id", userId)
    .eq("date", today)
    .order("created_at", { ascending: true })
    .returns<StoredActivityLog[]>();

  if (error && isMissingActivityLogsTableError(error)) {
    console.warn(
      "activity_logs table missing — run supabase/migration_activity_logs.sql",
    );
    return [];
  }

  if (error) throw error;

  return data ?? [];
}

/** @deprecated Use loadTodayActivityLogs — returns the first log if any. */
export async function loadTodayActivityLog(
  userId: string,
  supabase: SupabaseClient,
) {
  const logs = await loadTodayActivityLogs(userId, supabase);
  return logs[0] ?? null;
}

export async function loadRecentActivityLogs(
  userId: string,
  supabase: SupabaseClient,
) {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const { data, error } = await supabase
    .from("activity_logs")
    .select("activity_type, duration_minutes, date")
    .eq("user_id", userId)
    .gte("date", getTodayDateString(sevenDaysAgo))
    .order("date", { ascending: false });

  if (error && isMissingActivityLogsTableError(error)) {
    return [];
  }

  if (error) throw error;

  return (data ?? []) as Array<
    Pick<StoredActivityLog, "date" | "activity_type" | "duration_minutes">
  >;
}

export async function insertActivityLog(
  userId: string,
  supabase: SupabaseClient,
  input: {
    activity_type: ActivityType;
    duration_minutes: number | null;
    note: string | null;
  },
) {
  const today = getTodayDateString();
  const payload = {
    user_id: userId,
    date: today,
    activity_type: input.activity_type,
    duration_minutes: input.duration_minutes,
    note: input.note,
  };

  const { data, error } = await supabase
    .from("activity_logs")
    .insert(payload)
    .select("*")
    .maybeSingle<StoredActivityLog>();

  if (error) {
    console.error("Activity save error:", error);
    throw error;
  }

  return data;
}

/** @deprecated Use insertActivityLog — kept for callers during migration. */
export async function upsertActivityLog(
  userId: string,
  supabase: SupabaseClient,
  input: {
    activity_type: ActivityType;
    duration_minutes: number | null;
    note: string | null;
  },
) {
  return insertActivityLog(userId, supabase, input);
}
