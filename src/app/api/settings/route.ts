import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import {
  getProfileInitials,
  resolveProfileNames,
} from "@/lib/profile-display";
import {
  defaultNotificationPreferences,
  formatConnectionDate,
  type FamilyConnection,
  type NotificationPreferences,
  type SettingsData,
} from "@/types/settings";

export const runtime = "nodejs";

type SettingsPayload = {
  elder_mode?: unknown;
  language?: unknown;
  notification_preferences?: unknown;
};

type ProfileRow = {
  id: string;
  first_name: string;
  last_name: string;
  role?: string;
  language: "de" | "en";
  elder_mode: boolean;
  notification_preferences: NotificationPreferences | null;
};

type AuthMetadata = {
  first_name?: string;
  last_name?: string;
};

type FamilyLinkRow = {
  id: string;
  relationship: string;
  created_at: string;
  family_member_id: string;
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

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select(
        "id, first_name, last_name, role, language, elder_mode, notification_preferences",
      )
      .eq("id", user.id)
      .maybeSingle<ProfileRow>();

    if (profileError) throw profileError;

    let resolvedProfile = profile;

    if (!resolvedProfile) {
      resolvedProfile = await ensureProfileFromMetadata(
        supabase,
        user.id,
        user.user_metadata,
      );
    }

    const metadata = user.user_metadata as AuthMetadata | undefined;
    const { firstName, lastName } = resolveProfileNames(
      resolvedProfile,
      metadata,
    );

    const { data: familyLinks, error: linksError } = await supabase
      .from("family_links")
      .select("id, relationship, created_at, family_member_id")
      .eq("patient_id", user.id)
      .eq("active", true)
      .order("created_at", { ascending: false })
      .returns<FamilyLinkRow[]>();

    if (linksError) throw linksError;

    const memberIds = (familyLinks ?? []).map((link) => link.family_member_id);
    let linkedProfiles: LinkedProfile[] = [];

    if (memberIds.length > 0) {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, first_name, last_name")
        .in("id", memberIds)
        .returns<LinkedProfile[]>();

      if (error) throw error;
      linkedProfiles = data ?? [];
    }

    const familyConnections: FamilyConnection[] = (familyLinks ?? []).map((link) => {
      const member = linkedProfiles.find(
        (linkedProfile) => linkedProfile.id === link.family_member_id,
      );
      const name = member
        ? `${member.first_name} ${member.last_name}`.trim()
        : "Familienmitglied";

      return {
        id: link.id,
        name,
        relationship: link.relationship,
        connectedAt: formatConnectionDate(link.created_at),
      };
    });

    const payload: SettingsData = {
      profile: {
        id: user.id,
        firstName,
        lastName,
        email: user.email ?? "",
        initials: getProfileInitials(firstName, lastName),
        language: resolvedProfile?.language ?? "de",
        elderMode: resolvedProfile?.elder_mode ?? false,
        notificationPreferences:
          resolvedProfile?.notification_preferences ??
          defaultNotificationPreferences,
      },
      familyConnections,
    };

    return Response.json(payload);
  } catch (error) {
    console.error("Settings load failed", error);

    return Response.json(
      { error: "Einstellungen konnten nicht geladen werden." },
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

    if (payload.language === "de" || payload.language === "en") {
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
    console.error("Settings update failed", error);

    return Response.json(
      { error: "Einstellungen konnten nicht gespeichert werden." },
      { status: 500 },
    );
  }
}

function normalizeNotificationPreferences(value: unknown): NotificationPreferences {
  const preferences = value as Record<string, unknown>;

  if (typeof preferences.emailNotifications === "boolean") {
    return { emailNotifications: preferences.emailNotifications };
  }

  return defaultNotificationPreferences;
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

async function ensureProfileFromMetadata(
  supabase: NonNullable<ReturnType<typeof createSupabaseDataClient>> | Awaited<
    ReturnType<typeof createClient>
  >,
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
    .select(
      "id, first_name, last_name, role, language, elder_mode, notification_preferences",
    )
    .single<ProfileRow>();

  if (error) {
    console.error("Profile recovery upsert failed", error);
    return null;
  }

  return data;
}
