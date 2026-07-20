import { createClient as createServerSupabaseClient } from "@/lib/supabase/server";
import { getAuthenticatedUser } from "@/lib/supabase/request-auth";
import { normalizeProfileHealthFields } from "@/lib/profile-health";
import {
  isMissingColumnError,
  logSupabaseError,
} from "@/lib/load-settings-profile";
import { saveProfileUpdatesWithFallback } from "@/lib/profile-save";
import { createSupabaseDataClient } from "@/lib/supabase-data";
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
  date_of_birth?: unknown;
  gender?: unknown;
  height_cm?: unknown;
  weight_kg?: unknown;
  activity_level?: unknown;
  sport_types?: unknown;
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
    const adminClient = createSupabaseDataClient();
    const { user } = await getAuthenticatedUser(request);

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

    const supabase = adminClient ?? (await createServerSupabaseClient());

    console.log("[profiles POST] saving profile", {
      id: profile.id,
      role: profile.role,
      user_type: profile.user_type,
      usingServiceRole: Boolean(adminClient),
      hasAuthSession: Boolean(user),
    });

    const { data, error } = await supabase
      .from("profiles")
      .upsert(profile, { onConflict: "id" })
      .select("id, role, first_name, last_name")
      .maybeSingle();

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

    console.log("[profiles POST] save result:", data);

    return Response.json({ stored: true, profile: data ?? profile });
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

    const { user } = await getAuthenticatedUser(request);
    const adminClient = createSupabaseDataClient();

    if (!user || user.id !== payload.id) {
      if (!adminClient) {
        return Response.json({ error: "Bitte melden Sie sich an." }, { status: 401 });
      }
    }

    const settingsUpdates = normalizeSettings(payload);
    let healthUpdates = {};

    try {
      healthUpdates = normalizeProfileHealthFields(payload);
    } catch (error) {
      return Response.json(
        {
          error:
            error instanceof Error
              ? error.message
              : "Profildaten konnten nicht validiert werden.",
        },
        { status: 400 },
      );
    }

    const updates = { ...settingsUpdates, ...healthUpdates };
    const supabase = adminClient ?? (await createServerSupabaseClient());

    const existing = await loadExistingProfileRow(supabase, payload.id);

    const metadata = user?.user_metadata as
      | { first_name?: string; last_name?: string }
      | undefined;
    const firstName =
      settingsUpdates.first_name ??
      existing?.first_name ??
      metadata?.first_name?.trim() ??
      "Nutzer";
    const lastName =
      settingsUpdates.last_name ??
      existing?.last_name ??
      metadata?.last_name?.trim() ??
      "";

    const saveResult = await saveProfileUpdatesWithFallback(
      supabase,
      payload.id,
      updates,
      {
        existing: Boolean(existing),
        insertBase: {
          id: payload.id,
          first_name: firstName,
          last_name: lastName,
          elder_mode: false,
          language: "de",
          role: existing?.role ?? null,
        },
        userMetadata: user?.user_metadata as Record<string, unknown> | undefined,
        allowHealthMetadataFallback: Boolean(adminClient),
      },
    );

    if (!saveResult.ok) {
      return Response.json(
        {
          error:
            saveResult.message ||
            "Einstellungen konnten gerade nicht gespeichert werden.",
        },
        { status: 500 },
      );
    }

    return Response.json({
      stored: true,
      profile: { id: payload.id, ...updates },
      warning: saveResult.warning,
      healthFieldsSaved: saveResult.healthFieldsSaved,
    });
  } catch (error) {
    console.error("Profile settings save failed", error);

    const message =
      error instanceof Error && error.message.trim().length > 0
        ? error.message
        : "Einstellungen konnten gerade nicht gespeichert werden.";

    return Response.json({ error: message }, { status: 500 });
  }
}

function createSupabaseAdminClient() {
  return createSupabaseDataClient();
}

const existingProfileColumnSets = [
  "id, first_name, last_name, role",
  "id, first_name, last_name",
  "id, first_name",
] as const;

async function loadExistingProfileRow(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  userId: string,
) {
  for (const columns of existingProfileColumnSets) {
    const { data, error } = await supabase
      .from("profiles")
      .select(columns)
      .eq("id", userId)
      .maybeSingle<{
        id: string;
        first_name?: string | null;
        last_name?: string | null;
        role?: string | null;
      }>();

    if (!error) {
      return data;
    }

    logSupabaseError(`Existing profile lookup (${columns})`, error);

    if (!isMissingColumnError(error)) {
      throw error;
    }
  }

  return null;
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
    role,
    user_type: role,
    elder_mode: false,
    language: "de",
    ...(typeof payload.date_of_birth === "string" && payload.date_of_birth
      ? { date_of_birth: payload.date_of_birth }
      : {}),
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
