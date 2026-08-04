import { track } from "@/lib/analytics";
import { getSupabase } from "@/lib/supabase";
import { fetchWithTimeout } from "@/lib/fetch-with-timeout";
import { buildApiAuthHeaders } from "@/lib/api-auth";
import { getTodayDateString } from "@/types/activity-log";

export function roundWaterLiters(value: number) {
  return Math.round(value * 10) / 10;
}

type DailyGoalLogRow = {
  id?: string;
  water_liters?: number | string | null;
  steps?: number | null;
  protein_grams?: number | null;
};

function toWaterNumber(value: number | string | null | undefined) {
  if (value == null) return 0;
  const parsed = typeof value === "number" ? value : Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export async function quickAddWater(liters: number) {
  console.log("quickAddWater called with:", liters);

  try {
    const supabase = getSupabase();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    console.log("User ID:", user?.id ?? null, userError);

    if (!user) {
      throw new Error("Bitte melden Sie sich an.");
    }

    const today = getTodayDateString();
    console.log("Today:", today);

    const { data: existing, error: fetchError } = await supabase
      .from("daily_goal_logs")
      .select("id, water_liters, steps, protein_grams")
      .eq("user_id", user.id)
      .eq("date", today)
      .maybeSingle<DailyGoalLogRow>();

    console.log("Existing log:", existing, fetchError);

    if (fetchError) {
      throw fetchError;
    }

    const currentWater = toWaterNumber(existing?.water_liters);
    const newTotal = roundWaterLiters(currentWater + liters);

    console.log("Updating water to:", newTotal);

    const payload = {
      user_id: user.id,
      date: today,
      water_liters: newTotal,
      steps: existing?.steps ?? 0,
      protein_grams: existing?.protein_grams ?? 0,
      updated_at: new Date().toISOString(),
    };

    const { data: saved, error: upsertError } = await supabase
      .from("daily_goal_logs")
      .upsert(payload, { onConflict: "user_id,date" })
      .select("water_liters")
      .maybeSingle<{ water_liters: number | string | null }>();

    console.log("Upsert result:", saved, upsertError);

    if (upsertError) {
      throw upsertError;
    }

    const savedTotal = toWaterNumber(saved?.water_liters) || newTotal;
    void track("water_logged", {
      amount: liters,
      daily_total: savedTotal,
    });

    return savedTotal;
  } catch (error) {
    console.error("quickAddWater error:", error);
    throw error;
  }
}

async function saveWaterLitersViaApi(liters: number) {
  const headers = await buildApiAuthHeaders(true);
  const response = await fetchWithTimeout("/api/health-goals/today", {
    method: "PATCH",
    credentials: "include",
    headers,
    body: JSON.stringify({ waterLiters: roundWaterLiters(liters) }),
  });

  const payload = (await response.json().catch(() => null)) as {
    error?: string;
    today?: { waterLiters?: number };
  } | null;

  if (!response.ok) {
    throw new Error(payload?.error ?? "Wasser konnte nicht gespeichert werden.");
  }

  return payload?.today?.waterLiters ?? roundWaterLiters(liters);
}

export async function saveWaterLiters(liters: number) {
  return saveWaterLitersViaApi(liters);
}

export async function addWaterLiters(currentLiters: number, amount: number) {
  console.log("addWaterLiters:", { currentLiters, amount });

  try {
    return await quickAddWater(amount);
  } catch (error) {
    console.warn("quickAddWater failed, falling back to API add:", error);
    return saveWaterLitersViaApi(roundWaterLiters(currentLiters + amount));
  }
}

export async function resetWaterToday() {
  return saveWaterLitersViaApi(0);
}

export function getWaterGlassCount(liters: number, glassSizeLiters = 0.25) {
  return Math.max(0, Math.round(liters / glassSizeLiters));
}

export function getWaterGoalGlassCount(goalLiters: number, glassSizeLiters = 0.25) {
  return Math.max(1, Math.round(goalLiters / glassSizeLiters));
}
