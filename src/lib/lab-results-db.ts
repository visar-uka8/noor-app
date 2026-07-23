import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";
import type { AppLanguage } from "@/lib/i18n/languages";

export const LAB_RESULT_LIST_COLUMNS =
  "id, file_url, ai_analysis, created_at";

export type LabResultInsertInput = {
  user_id: string;
  file_url: string;
  ai_analysis: string;
  normal_count: number;
  watch_count: number;
  high_count: number;
  analysis_language?: AppLanguage;
};

export type LabResultInsertDebug = {
  client: "service_role" | "user_session";
  attempts: Array<{
    label: string;
    ok: boolean;
    code?: string;
    message?: string;
    details?: string;
    hint?: string;
  }>;
};

function logDbError(label: string, error: PostgrestError) {
  console.error(`[lab_results] ${label}`);
  console.error("DB Error code:", error.code);
  console.error("DB Error message:", error.message);
  console.error("DB Error details:", error.details);
  console.error("DB Error hint:", error.hint);
}

function isMissingCountColumnError(error: PostgrestError) {
  const message = error.message.toLowerCase();

  return (
    error.code === "PGRST204" ||
    message.includes("normal_count") ||
    message.includes("watch_count") ||
    message.includes("high_count") ||
    message.includes("analysis_language") ||
    message.includes("analysis_translations") ||
    message.includes("schema cache")
  );
}

function isMissingTableError(error: PostgrestError) {
  const message = error.message.toLowerCase();
  return (
    error.code === "42P01" ||
    error.code === "PGRST205" ||
    message.includes("lab_results") && message.includes("does not exist")
  );
}

function isRlsError(error: PostgrestError) {
  return (
    error.code === "42501" ||
    error.message.toLowerCase().includes("row-level security")
  );
}

export async function insertLabResult(
  supabase: SupabaseClient,
  input: LabResultInsertInput,
  options?: { client?: LabResultInsertDebug["client"] },
) {
  const debug: LabResultInsertDebug = {
    client: options?.client ?? "user_session",
    attempts: [],
  };

  const baseRow = {
    user_id: input.user_id,
    file_url: input.file_url,
    ai_analysis: input.ai_analysis,
  };

  const withCounts = {
    ...baseRow,
    normal_count: input.normal_count,
    watch_count: input.watch_count,
    high_count: input.high_count,
    analysis_language: input.analysis_language ?? "de",
  };

  let result = await supabase
    .from("lab_results")
    .insert(withCounts)
    .select("id")
    .single();

  debug.attempts.push({
    label: "full insert (with counts)",
    ok: !result.error,
    code: result.error?.code,
    message: result.error?.message,
    details: result.error?.details ?? undefined,
    hint: result.error?.hint ?? undefined,
  });

  if (result.error) {
    logDbError("full insert failed", result.error);
  }

  if (result.error && isMissingCountColumnError(result.error)) {
    console.warn(
      "lab_results count columns missing — retrying insert without counts",
    );

    result = await supabase
      .from("lab_results")
      .insert(baseRow)
      .select("id")
      .single();

    debug.attempts.push({
      label: "base insert (no counts)",
      ok: !result.error,
      code: result.error?.code,
      message: result.error?.message,
      details: result.error?.details ?? undefined,
      hint: result.error?.hint ?? undefined,
    });

    if (result.error) {
      logDbError("base insert failed", result.error);
    }
  }

  if (result.error && isRlsError(result.error)) {
    console.error(
      "[lab_results] RLS blocked insert. Ensure SUPABASE_SERVICE_ROLE_KEY is set in Vercel, or run supabase/migration_lab_results_policies.sql",
    );
  }

  if (result.error && isMissingTableError(result.error)) {
    console.error(
      "[lab_results] Table missing. Run supabase/lab_results.sql in Supabase SQL Editor.",
    );
  }

  return { ...result, debug };
}

export async function deleteLabResultForUser(
  supabase: SupabaseClient,
  labResultId: string,
  userId: string,
) {
  return supabase
    .from("lab_results")
    .delete()
    .eq("id", labResultId)
    .eq("user_id", userId)
    .select("id")
    .maybeSingle();
}

export async function listLabResultsForUser(
  supabase: SupabaseClient,
  userId: string,
  limit = 20,
) {
  const withCounts = await supabase
    .from("lab_results")
    .select(`${LAB_RESULT_LIST_COLUMNS}, normal_count, watch_count, high_count`)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (withCounts.error && isMissingCountColumnError(withCounts.error)) {
    console.warn(
      "lab_results count columns missing — fetching without counts:",
      withCounts.error.message,
    );

    return supabase
      .from("lab_results")
      .select(LAB_RESULT_LIST_COLUMNS)
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);
  }

  return withCounts;
}
