import type { SupabaseClient } from "@supabase/supabase-js";
import { isAppLanguage } from "@/lib/i18n/languages";
import { createClient } from "@/lib/supabase/server";
import { createSupabaseDataClient } from "@/lib/supabase-data";
import {
  buildProfileSettingsFields,
  loadUserProfileRow,
  logSupabaseError,
} from "@/lib/load-settings-profile";
import { normalizeNotificationPreferences } from "@/lib/notification-preferences";
import { getWatcherId } from "@/lib/family-roles";
import { queryActiveFamilyLinksForUser } from "@/lib/family-links-query";
import {
  formatConnectionDate,
  type FamilyConnection,
  type SettingsData,
} from "@/types/settings";

export const runtime = "nodejs";

type SettingsPayload = {
  elder_mode?: unknown;
  language?: unknown;
  notification_preferences?: unknown;
};

type AuthMetadata = {
  first_name?: string;
  last_name?: string;
  avatar_url?: string;
};

type LinkedProfile = {
  id: string;
  first_name: string;
  last_name: string;
};

export async function GET() {
  try {
    const authSupabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await authSupabase.auth.getUser();

    if (authError || !user) {
      return Response.json({ error: "Bitte melden Sie sich an." }, { status: 401 });
    }

    const supabase = createSupabaseDataClient() ?? authSupabase;
    const { profile, error: profileError } = await loadUserProfileRow(
      supabase,
      user.id,
      "Settings API profile",
    );

    if (profileError && !profile) {
      logSupabaseError("Settings API profile fatal", profileError);
    }

    let resolvedProfile = profile;

    if (!resolvedProfile) {
      resolvedProfile = await ensureProfileFromMetadata(
        supabase,
        user.id,
        user.user_metadata as AuthMetadata | undefined,
      );
    }

    const metadata = user.user_metadata as AuthMetadata | undefined;
    const familyConnections = await loadFamilyConnectionsSafe(
      supabase,
      user.id,
    );

    const payload: SettingsData = {
      profile: buildProfileSettingsFields({
        userId: user.id,
        email: user.email,
        profile: resolvedProfile,
        metadata,
      }),
      familyConnections,
    };

    return Response.json(payload);
  } catch (error) {
    logSupabaseError("Settings load failed", error);

    return Response.json(
      {
        error: "Einstellungen konnten nicht geladen werden.",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const payload = (await request.json()) as SettingsPayload;
    const authSupabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await authSupabase.auth.getUser();

    if (authError || !user) {
      return Response.json({ error: "Bitte melden Sie sich an." }, { status: 401 });
    }

    const updates: Record<string, unknown> = {};

    if (typeof payload.elder_mode === "boolean") {
      updates.elder_mode = payload.elder_mode;
    }

    if (isAppLanguage(String(payload.language))) {
      updates.language = payload.language;
    }

    if (payload.notification_preferences) {
      updates.notification_preferences = normalizeNotificationPreferences(
        payload.notification_preferences,
      );
    }

    if (Object.keys(updates).length === 0) {
      return Response.json({ error: "Keine Änderungen übermittelt." }, { status: 400 });
    }

    const supabase = createSupabaseDataClient() ?? authSupabase;
    const { error } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", user.id);

    if (error) throw error;

    return Response.json({ stored: true });
  } catch (error) {
    logSupabaseError("Settings update failed", error);

    return Response.json(
      { error: "Einstellungen konnten nicht gespeichert werden." },
      { status: 500 },
    );
  }
}

async function loadFamilyConnectionsSafe(
  supabase: SupabaseClient,
  userId: string,
): Promise<FamilyConnection[]> {
  try {
    const links = await queryActiveFamilyLinksForUser(supabase, userId);
    const profileIds = new Set<string>();

    for (const link of links) {
      if (link.patient_id !== userId) {
        profileIds.add(link.patient_id);
      }

      const watcherId = getWatcherId(link);
      if (watcherId && watcherId !== userId) {
        profileIds.add(watcherId);
      }
    }

    let linkedProfiles: LinkedProfile[] = [];

    if (profileIds.size > 0) {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, first_name, last_name")
        .in("id", [...profileIds])
        .returns<LinkedProfile[]>();

      if (error) {
        logSupabaseError("Settings linked profiles", error);
      } else {
        linkedProfiles = data ?? [];
      }
    }

    const connections: FamilyConnection[] = [];

    for (const link of links) {
      const watcherId = getWatcherId(link);

      if (link.patient_id === userId && watcherId !== userId) {
        const member = linkedProfiles.find((profile) => profile.id === watcherId);
        const name = member
          ? `${member.first_name} ${member.last_name}`.trim()
          : "Familienmitglied";

        connections.push({
          id: link.id,
          name,
          relationship: link.relationship,
          connectedAt: formatConnectionDate(link.created_at ?? new Date().toISOString()),
          subtitle: "Folgt Ihrer Gesundheit",
        });
      }

      if (watcherId === userId && link.patient_id !== userId) {
        const member = linkedProfiles.find((profile) => profile.id === link.patient_id);
        const name = member
          ? `${member.first_name} ${member.last_name}`.trim()
          : "Angehörige";

        connections.push({
          id: link.id,
          name,
          relationship: link.relationship,
          connectedAt: formatConnectionDate(link.created_at ?? new Date().toISOString()),
          subtitle: "Sie verfolgen diese Person",
        });
      }
    }

    return connections;
  } catch (error) {
    logSupabaseError("Settings family connections crash", error);
    return [];
  }
}

async function ensureProfileFromMetadata(
  supabase: SupabaseClient,
  userId: string,
  metadata: AuthMetadata | undefined,
) {
  const firstName = metadata?.first_name?.trim() ?? "";
  const lastName = metadata?.last_name?.trim() ?? "";

  if (!firstName && !lastName) {
    return null;
  }

  const record = {
    id: userId,
    first_name: firstName,
    last_name: lastName,
    role: "patient",
    elder_mode: false,
    language: "de" as const,
  };

  const { data, error } = await supabase
    .from("profiles")
    .upsert(record, { onConflict: "id" })
    .select("id, first_name, last_name, role, elder_mode, language")
    .maybeSingle();

  if (error) {
    logSupabaseError("Profile recovery upsert failed", error);
    return null;
  }

  return data;
}
