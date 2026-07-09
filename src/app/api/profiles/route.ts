import { createClient } from "@supabase/supabase-js";
import { createClient as createServerSupabaseClient } from "@/lib/supabase/server";
import type { Profile, UserRole } from "@/types/profiles";

export const runtime = "nodejs";

type ProfilePayload = {
  id?: unknown;
  first_name?: unknown;
  last_name?: unknown;
  date_of_birth?: unknown;
  role?: unknown;
};

type ProfileSettingsPayload = {
  id?: unknown;
  elder_mode?: unknown;
  language?: unknown;
  first_name?: unknown;
  last_name?: unknown;
};

export async function GET(request: Request) {
  const userId = new URL(request.url).searchParams.get("userId");

  if (!userId) {
    return Response.json({ error: "Profil-ID fehlt." }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();

  if (!supabase) {
    return Response.json({
      profile: null,
      reason: "Supabase ist lokal noch nicht konfiguriert.",
    });
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle<Profile>();

  if (error) {
    return Response.json(
      { error: "Profil konnte nicht geladen werden." },
      { status: 500 },
    );
  }

  return Response.json({ profile: data });
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as ProfilePayload;
    const profile = normalizeProfile(payload);
    const adminClient = createSupabaseAdminClient();
    const authClient = await createServerSupabaseClient();
    const {
      data: { user },
    } = await authClient.auth.getUser();

    if (!adminClient) {
      if (!user || user.id !== profile.id) {
        return Response.json(
          { error: "Nicht angemeldet oder Profil-ID stimmt nicht überein." },
          { status: 401 },
        );
      }
    } else if (user && user.id !== profile.id) {
      return Response.json(
        { error: "Profil-ID stimmt nicht mit dem angemeldeten Konto überein." },
        { status: 403 },
      );
    }

    const supabase = adminClient ?? authClient;

    console.log("[profiles POST] saving profile", {
      id: profile.id,
      role: profile.role,
      usingServiceRole: Boolean(adminClient),
      hasAuthSession: Boolean(user),
    });

    const { error } = await supabase
      .from("profiles")
      .upsert(profile, { onConflict: "id" });

    if (error) {
      console.error("[profiles POST] Supabase error:", {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      });

      return Response.json(
        {
          error: "Profil konnte gerade nicht gespeichert werden.",
          supabaseError: {
            message: error.message,
            code: error.code,
            details: error.details,
            hint: error.hint,
          },
        },
        { status: 500 },
      );
    }

    return Response.json({ stored: true, profile });
  } catch (error) {
    console.error("[profiles POST] Profile save failed", error);

    return Response.json(
      {
        error: "Profil konnte gerade nicht gespeichert werden.",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const payload = (await request.json()) as ProfileSettingsPayload;

    if (typeof payload.id !== "string") {
      return Response.json({ error: "Profil-ID fehlt." }, { status: 400 });
    }

    const updates = normalizeSettings(payload);
    const supabase = createSupabaseAdminClient();

    if (!supabase) {
      return Response.json({
        stored: false,
        reason: "Supabase ist lokal noch nicht konfiguriert.",
        profile: { id: payload.id, ...updates },
      });
    }

    const { error } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", payload.id);

    if (error) throw error;

    return Response.json({ stored: true, profile: { id: payload.id, ...updates } });
  } catch (error) {
    console.error("Profile settings save failed", error);

    return Response.json(
      { error: "Einstellungen konnten gerade nicht gespeichert werden." },
      { status: 500 },
    );
  }
}

function createSupabaseAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) return null;

  return createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false },
  });
}

function normalizeProfile(payload: ProfilePayload) {
  if (
    typeof payload.id !== "string" ||
    typeof payload.first_name !== "string" ||
    typeof payload.last_name !== "string"
  ) {
    throw new Error("Profile payload is incomplete.");
  }

  const role = normalizeRole(payload.role);

  return {
    id: payload.id,
    first_name: payload.first_name.trim(),
    last_name: payload.last_name.trim(),
    date_of_birth:
      typeof payload.date_of_birth === "string" && payload.date_of_birth
        ? payload.date_of_birth
        : null,
    role,
    elder_mode: false,
    language: "de",
  };
}

function normalizeRole(role: unknown): UserRole {
  if (role === "patient" || role === "family_member") {
    return role;
  }

  throw new Error("Invalid role.");
}

function normalizeSettings(payload: ProfileSettingsPayload) {
  const updates: {
    elder_mode?: boolean;
    language?: "de" | "en";
    first_name?: string;
    last_name?: string;
  } = {};

  if (typeof payload.elder_mode === "boolean") {
    updates.elder_mode = payload.elder_mode;
  }

  if (payload.language === "de" || payload.language === "en") {
    updates.language = payload.language;
  }

  if (typeof payload.first_name === "string" && payload.first_name.trim()) {
    updates.first_name = payload.first_name.trim();
  }

  if (typeof payload.last_name === "string" && payload.last_name.trim()) {
    updates.last_name = payload.last_name.trim();
  }

  return updates;
}
