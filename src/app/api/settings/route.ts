import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { getInitials } from "@/lib/home-screen";
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
  language: "de" | "en";
  elder_mode: boolean;
  notification_preferences: NotificationPreferences | null;
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
      .select("id, first_name, last_name, language, elder_mode, notification_preferences")
      .eq("id", user.id)
      .maybeSingle<ProfileRow>();

    if (profileError) throw profileError;

    const firstName = profile?.first_name?.trim() || "Noor";
    const lastName = profile?.last_name?.trim() || "";

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
        initials: getInitials(firstName, lastName),
        language: profile?.language ?? "de",
        elderMode: profile?.elder_mode ?? false,
        notificationPreferences:
          profile?.notification_preferences ?? defaultNotificationPreferences,
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

function normalizeNotificationPreferences(value: unknown) {
  const preferences = value as Record<string, unknown>;

  return {
    medications:
      typeof preferences.medications === "boolean"
        ? preferences.medications
        : true,
    labResults:
      typeof preferences.labResults === "boolean" ? preferences.labResults : true,
    family: typeof preferences.family === "boolean" ? preferences.family : true,
  };
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
