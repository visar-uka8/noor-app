import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import {
  buildWatcherFollowText,
  getWatcherId,
  type FamilyLinkRow,
  type FamilyRoleState,
} from "@/lib/family-roles";
import { queryActiveFamilyLinksForUser } from "@/lib/family-links-query";
import { getProfileInitials } from "@/lib/profile-display";
import { loadUserProfileRow } from "@/lib/load-settings-profile";

export const runtime = "nodejs";

export async function GET() {
  try {
    const authSupabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await authSupabase.auth.getUser();

    if (authError || !user) {
      return Response.json(
        { error: "Bitte melden Sie sich an." },
        { status: 401 },
      );
    }

    const supabase = createSupabaseDataClient() ?? authSupabase;
    const roles = await loadFamilyRoles(user.id, supabase);

    return Response.json(roles);
  } catch (error) {
    console.error("Family roles load failed", error);

    return Response.json(
      { error: "Familienrollen konnten gerade nicht geladen werden." },
      { status: 500 },
    );
  }
}

export async function loadFamilyRoles(
  userId: string,
  supabase: SupabaseClient,
): Promise<FamilyRoleState & { watcherFollowText: string }> {
  const activeLinks = await queryActiveFamilyLinksForUser(supabase, userId);
  const watching: FamilyRoleState["watching"] = [];
  const watchers: FamilyRoleState["watchers"] = [];

  for (const link of activeLinks as FamilyLinkRow[]) {
    const watcherId = getWatcherId(link);

    if (watcherId === userId && link.patient_id !== userId) {
      const patientProfile = await loadProfile(supabase, link.patient_id);
      const firstName = patientProfile.firstName || "Angehörige";
      const lastName = patientProfile.lastName || "";

      watching.push({
        linkId: link.id,
        patientId: link.patient_id,
        patientName: `${firstName}${lastName ? ` ${lastName}` : ""}`.trim(),
        patientFirstName: firstName,
        relationship: link.relationship,
      });
    }

    if (link.patient_id === userId && watcherId !== userId) {
      const watcherProfile = await loadProfile(supabase, watcherId);
      const firstName = watcherProfile.firstName || "Angehörige";
      const lastName = watcherProfile.lastName || "";

      watchers.push({
        linkId: link.id,
        watcherId,
        watcherName: `${firstName}${lastName ? ` ${lastName}` : ""}`.trim(),
        watcherFirstName: firstName,
        watcherInitials: getProfileInitials(firstName, lastName) || firstName.slice(0, 2).toUpperCase(),
        watcherAvatarUrl: watcherProfile.avatarUrl,
        relationship: link.relationship,
      });
    }
  }

  return {
    isWatcher: watching.length > 0,
    isPatient: watchers.length > 0,
    watching,
    watchers,
    watcherFollowText: buildWatcherFollowText(watchers),
  };
}

async function loadProfile(supabase: SupabaseClient, userId: string) {
  const { profile, error } = await loadUserProfileRow(
    supabase,
    userId,
    "Family roles profile load",
  );

  if (error) throw error;

  return {
    firstName: profile?.first_name?.trim() || "",
    lastName: profile?.last_name?.trim() || "",
    avatarUrl: profile?.avatar_url ?? null,
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
