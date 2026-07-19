import { createClient as createServerClient } from "@/lib/supabase/server";
import { createSupabaseDataClient } from "@/lib/supabase-data";
import { loadFamilyRoles } from "@/app/api/family-roles/route";
import {
  queryActiveWatcherLinksForUser,
} from "@/lib/family-links-query";
import {
  loadFamilyDashboardForPatient,
} from "@/lib/family-dashboard-load";
import { overallStatusCopy } from "@/lib/family-dashboard-status";
import { loadDashboardProfileRow } from "@/lib/load-settings-profile";
import { getProfileInitials } from "@/lib/profile-display";

export const runtime = "nodejs";

import { loadVisibleFamilyNoteSafe } from "@/lib/family-notes-data";
import type {
  FamilyHubResponse,
  FamilyHubWatchedPatient,
} from "@/lib/family-hub-types";

export type { FamilyHubResponse, FamilyHubWatchedPatient };

export async function GET() {
  try {
    const authSupabase = await createServerClient();
    const {
      data: { user },
      error: authError,
    } = await authSupabase.auth.getUser();

    if (authError || !user) {
      return Response.json({ error: "Bitte melden Sie sich an." }, { status: 401 });
    }

    const supabase = createSupabaseDataClient() ?? authSupabase;
    const roles = await loadFamilyRoles(user.id, supabase);
    const watcherLinks = await queryActiveWatcherLinksForUser(supabase, user.id);

    const watching: FamilyHubWatchedPatient[] = [];

    for (const link of watcherLinks) {
      try {
        const dashboard = await loadFamilyDashboardForPatient(
          supabase,
          link.patient_id,
          link,
        );

        if (!dashboard.member) continue;

        watching.push({
          linkId: link.id,
          patientId: link.patient_id,
          patientName: dashboard.member.name,
          patientFirstName: dashboard.member.firstName,
          relationship: dashboard.member.relationship,
          initials:
            getProfileInitials(
              dashboard.member.firstName,
              dashboard.member.name.replace(dashboard.member.firstName, "").trim(),
            ) || dashboard.member.firstName.slice(0, 2).toUpperCase(),
          avatarUrl: dashboard.member.avatarUrl ?? null,
          overallStatus: dashboard.overallStatus,
          overallStatusText: dashboard.overallStatusText,
          healthPassportAvailable: dashboard.healthPassportAvailable,
        });
      } catch (error) {
        console.error("Family hub patient summary failed", link.patient_id, error);

        const { profile } = await loadDashboardProfileRow(
          supabase,
          link.patient_id,
          "Family hub fallback profile",
        );
        const firstName = profile?.first_name?.trim() || "Angehörige";
        const lastName = profile?.last_name?.trim() || "";

        watching.push({
          linkId: link.id,
          patientId: link.patient_id,
          patientName: `${firstName}${lastName ? ` ${lastName}` : ""}`.trim(),
          patientFirstName: firstName,
          relationship: link.relationship,
          initials: getProfileInitials(firstName, lastName) || firstName.slice(0, 2).toUpperCase(),
          avatarUrl: profile?.avatar_url ?? null,
          overallStatus: "green",
          overallStatusText: overallStatusCopy.green.text,
          healthPassportAvailable: false,
        });
      }
    }

    const payload: FamilyHubResponse = {
      watching,
      watchers: roles.watchers,
      hasConnections: watching.length > 0 || roles.watchers.length > 0,
      unreadFamilyNote: await loadVisibleFamilyNoteSafe(supabase, user.id),
    };

    return Response.json(payload);
  } catch (error) {
    console.error("Family hub load failed", error);

    return Response.json(
      { error: "Familienübersicht konnte gerade nicht geladen werden." },
      { status: 500 },
    );
  }
}
