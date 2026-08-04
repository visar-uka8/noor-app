import type { SupabaseClient } from "@supabase/supabase-js";

export type AnalyticsProperties = Record<
  string,
  string | number | boolean | null | undefined
>;

function sanitizeProperties(properties: AnalyticsProperties) {
  return Object.fromEntries(
    Object.entries(properties).filter(([, value]) => value !== undefined),
  );
}

export async function trackServerEvent(
  supabase: SupabaseClient,
  userId: string,
  eventName: string,
  properties: AnalyticsProperties = {},
) {
  try {
    const { error } = await supabase.from("analytics_events").insert({
      user_id: userId,
      event_name: eventName,
      properties: sanitizeProperties(properties),
    });

    if (error) {
      console.error("Analytics error:", error);
    }
  } catch (err) {
    console.error("Analytics error:", err);
  }
}

export async function track(
  eventName: string,
  properties: AnalyticsProperties = {},
) {
  try {
    const { createClient } = await import("@/lib/supabase/client");
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return;
    }

    await trackServerEvent(supabase, user.id, eventName, properties);
  } catch (err) {
    console.error("Analytics error:", err);
  }
}
