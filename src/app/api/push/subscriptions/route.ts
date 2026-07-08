import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type SubscriptionPayload = {
  endpoint?: unknown;
  p256dh?: unknown;
  auth?: unknown;
  missed_dose_enabled?: unknown;
};

type SettingsPayload = {
  missed_dose_enabled?: unknown;
};

type StoredSubscription = {
  id: string;
  missed_dose_enabled: boolean;
};

export async function GET() {
  try {
    const authSupabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await authSupabase.auth.getUser();

    if (authError || !user) {
      return Response.json({ subscription: null }, { status: 401 });
    }

    const supabase = createSupabaseDataClient() ?? authSupabase;
    const { data, error } = await supabase
      .from("push_subscriptions")
      .select("id, missed_dose_enabled")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle<StoredSubscription>();

    if (error) throw error;

    return Response.json({
      subscription: data
        ? {
            id: data.id,
            missedDoseEnabled: data.missed_dose_enabled,
            hasSubscription: true,
          }
        : null,
    });
  } catch (error) {
    console.error("Push subscription load failed", error);

    return Response.json(
      { error: "Push-Einstellungen konnten nicht geladen werden." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as SubscriptionPayload;
    const authSupabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await authSupabase.auth.getUser();

    if (authError || !user) {
      return Response.json({ error: "Nicht angemeldet." }, { status: 401 });
    }

    const record = {
      user_id: user.id,
      endpoint: normalizeString(payload.endpoint, "endpoint"),
      p256dh: normalizeString(payload.p256dh, "p256dh"),
      auth: normalizeString(payload.auth, "auth"),
      missed_dose_enabled:
        typeof payload.missed_dose_enabled === "boolean"
          ? payload.missed_dose_enabled
          : true,
      updated_at: new Date().toISOString(),
    };

    const supabase = createSupabaseDataClient() ?? authSupabase;
    const { data, error } = await supabase
      .from("push_subscriptions")
      .upsert(record, { onConflict: "endpoint" })
      .select("id, missed_dose_enabled")
      .single<StoredSubscription>();

    if (error) throw error;

    return Response.json({
      subscription: {
        id: data.id,
        missedDoseEnabled: data.missed_dose_enabled,
        hasSubscription: true,
      },
    });
  } catch (error) {
    console.error("Push subscription save failed", error);

    return Response.json(
      { error: "Push-Abonnement konnte nicht gespeichert werden." },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const payload = (await request.json()) as SettingsPayload;

    if (typeof payload.missed_dose_enabled !== "boolean") {
      return Response.json(
        { error: "Einstellung fehlt." },
        { status: 400 },
      );
    }

    const authSupabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await authSupabase.auth.getUser();

    if (authError || !user) {
      return Response.json({ error: "Nicht angemeldet." }, { status: 401 });
    }

    const supabase = createSupabaseDataClient() ?? authSupabase;
    const { data, error } = await supabase
      .from("push_subscriptions")
      .update({
        missed_dose_enabled: payload.missed_dose_enabled,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", user.id)
      .select("id, missed_dose_enabled")
      .maybeSingle<StoredSubscription>();

    if (error) throw error;

    if (!data) {
      return Response.json(
        { error: "Kein Push-Abonnement gefunden." },
        { status: 404 },
      );
    }

    return Response.json({
      subscription: {
        id: data.id,
        missedDoseEnabled: data.missed_dose_enabled,
        hasSubscription: true,
      },
    });
  } catch (error) {
    console.error("Push subscription update failed", error);

    return Response.json(
      { error: "Push-Einstellungen konnten nicht gespeichert werden." },
      { status: 500 },
    );
  }
}

export async function DELETE() {
  try {
    const authSupabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await authSupabase.auth.getUser();

    if (authError || !user) {
      return Response.json({ error: "Nicht angemeldet." }, { status: 401 });
    }

    const supabase = createSupabaseDataClient() ?? authSupabase;
    const { error } = await supabase
      .from("push_subscriptions")
      .delete()
      .eq("user_id", user.id);

    if (error) throw error;

    return Response.json({ removed: true });
  } catch (error) {
    console.error("Push subscription delete failed", error);

    return Response.json(
      { error: "Push-Abonnement konnte nicht entfernt werden." },
      { status: 500 },
    );
  }
}

function normalizeString(value: unknown, field: string) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${field} is required.`);
  }

  return value.trim();
}

function createSupabaseDataClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) return null;

  return createAdminClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false },
  });
}
