import type { SupabaseClient } from "@supabase/supabase-js";
import { loadActiveMedications } from "@/lib/medication-data";
import { getTodayDateString } from "@/types/activity-log";

export type WeeklySummary = {
  medRate: number;
  activeDays: number;
  totalWater: number;
  totalConfirmed: number;
  totalScheduled: number;
};

export function getSevenDaysAgoDateString(now = new Date()) {
  const date = new Date(now);
  date.setDate(date.getDate() - 7);
  return getTodayDateString(date);
}

export function getSevenDaysAgoIso(now = new Date()) {
  const date = new Date(now);
  date.setDate(date.getDate() - 7);
  date.setHours(0, 0, 0, 0);
  return date.toISOString();
}

export function shouldShowWeeklySummary(
  accountCreatedAt: string | null | undefined,
  medicationCount: number,
  now = new Date(),
) {
  if (medicationCount <= 0) {
    return false;
  }

  if (!accountCreatedAt) {
    return false;
  }

  const createdAt = new Date(accountCreatedAt);
  if (Number.isNaN(createdAt.getTime())) {
    return false;
  }

  const accountAgeDays =
    (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24);

  return accountAgeDays >= 7;
}

export function getWeeklySummaryMessageKey(medRate: number) {
  if (medRate >= 90) {
    return "weekly_summary_message_excellent";
  }
  if (medRate >= 70) {
    return "weekly_summary_message_good";
  }
  return "weekly_summary_message_encourage";
}

export async function getWeeklySummary(
  supabase: SupabaseClient,
  userId: string,
): Promise<WeeklySummary> {
  const sevenDaysAgoStr = getSevenDaysAgoDateString();
  const sevenDaysAgoIso = getSevenDaysAgoIso();

  const medications = await loadActiveMedications(userId, supabase).catch(
    () => [],
  );

  const dosesPerDay = medications.reduce(
    (sum, medication) => sum + Math.max(medication.times.length, 1),
    0,
  );
  const totalScheduled = dosesPerDay * 7;

  const { data: confirmations, error: confirmationsError } = await supabase
    .from("medication_confirmations")
    .select("confirmed_at, missed")
    .eq("user_id", userId)
    .gte("scheduled_at", sevenDaysAgoIso);

  if (confirmationsError) {
    console.error("Weekly summary confirmations load failed:", confirmationsError);
  }

  const totalConfirmed =
    confirmations?.filter(
      (row) => row.confirmed_at != null && row.missed !== true,
    ).length ?? 0;

  const medRate =
    totalScheduled > 0
      ? Math.round((totalConfirmed / totalScheduled) * 100)
      : 0;

  const { data: activityLogs, error: activityError } = await supabase
    .from("activity_logs")
    .select("date, duration_minutes")
    .eq("user_id", userId)
    .gte("date", sevenDaysAgoStr);

  if (activityError) {
    console.error("Weekly summary activity load failed:", activityError);
  }

  const activeDays = new Set(
    (activityLogs ?? [])
      .filter((log) => (log.duration_minutes ?? 0) > 0)
      .map((log) => log.date),
  ).size;

  const { data: waterLogs, error: waterError } = await supabase
    .from("daily_goal_logs")
    .select("water_liters")
    .eq("user_id", userId)
    .gte("date", sevenDaysAgoStr);

  if (waterError) {
    console.error("Weekly summary water load failed:", waterError);
  }

  const totalWaterRaw =
    waterLogs?.reduce((sum, row) => {
      const liters =
        typeof row.water_liters === "number"
          ? row.water_liters
          : Number(row.water_liters ?? 0);
      return sum + (Number.isFinite(liters) ? liters : 0);
    }, 0) ?? 0;

  return {
    medRate,
    activeDays,
    totalWater: Math.round(totalWaterRaw * 10) / 10,
    totalConfirmed,
    totalScheduled,
  };
}
