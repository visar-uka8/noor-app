import type { SupabaseClient } from "@supabase/supabase-js";
import { getWatcherId, type FamilyLinkRow } from "@/lib/family-roles";
import { isMissingColumnError, logSupabaseError } from "@/lib/load-settings-profile";

export type ActiveFamilyLink = FamilyLinkRow & {
  id: string;
  patient_id: string;
  relationship: string;
  created_at?: string;
  active?: boolean | null;
};

const linkSelect =
  "id, patient_id, watcher_id, family_member_id, relationship, created_at, active";

export async function queryActiveFamilyLinksForUser(
  supabase: SupabaseClient,
  userId: string,
) {
  // Filter `active` in JS so null/missing-column rows are not dropped by SQL.
  const { data, error } = await supabase
    .from("family_links")
    .select(linkSelect)
    .or(
      `patient_id.eq.${userId},watcher_id.eq.${userId},family_member_id.eq.${userId}`,
    );

  if (!error) {
    return filterActiveLinks(data as ActiveFamilyLink[] | null);
  }

  logSupabaseError("Active family links query", error);

  if (!isMissingColumnError(error)) {
    throw error;
  }

  const fallback = await supabase
    .from("family_links")
    .select(
      "id, patient_id, watcher_id, family_member_id, relationship, created_at",
    )
    .or(
      `patient_id.eq.${userId},watcher_id.eq.${userId},family_member_id.eq.${userId}`,
    );

  if (fallback.error) throw fallback.error;

  return filterActiveLinks(fallback.data as ActiveFamilyLink[] | null);
}

/** Patient-only watcher links for the home Familie card. */
export async function queryPatientFamilyLinks(
  supabase: SupabaseClient,
  patientId: string,
) {
  const { data, error } = await supabase
    .from("family_links")
    .select(linkSelect)
    .eq("patient_id", patientId);

  console.log("Family links on home:", data, error);

  if (!error) {
    return filterActiveLinks(data as ActiveFamilyLink[] | null);
  }

  logSupabaseError("Patient family links query", error);

  if (isMissingColumnError(error)) {
    const legacy = await supabase
      .from("family_links")
      .select(
        "id, patient_id, watcher_id, family_member_id, relationship, created_at",
      )
      .eq("patient_id", patientId);

    console.log("Family links on home (legacy):", legacy.data, legacy.error);
    if (legacy.error) throw legacy.error;
    return filterActiveLinks(legacy.data as ActiveFamilyLink[] | null);
  }

  throw error;
}

export async function queryActiveWatcherLinksForUser(
  supabase: SupabaseClient,
  userId: string,
) {
  const links = await queryActiveFamilyLinksForUser(supabase, userId);

  return links
    .filter((link) => getWatcherId(link) === userId && link.patient_id !== userId)
    .sort((left, right) =>
      String(left.created_at ?? "").localeCompare(String(right.created_at ?? "")),
    );
}

export async function queryActiveWatcherLinkForUser(
  supabase: SupabaseClient,
  userId: string,
) {
  const links = await queryActiveWatcherLinksForUser(supabase, userId);
  return links[0] ?? null;
}

export async function queryWatcherLinkForPatient(
  supabase: SupabaseClient,
  watcherId: string,
  patientId: string,
) {
  const links = await queryActiveWatcherLinksForUser(supabase, watcherId);
  return links.find((link) => link.patient_id === patientId) ?? null;
}

/** Includes inactive links — used when reconnecting with a fresh invite code. */
export async function queryFamilyLinkForPair(
  supabase: SupabaseClient,
  patientId: string,
  watcherId: string,
) {
  const { data, error } = await supabase
    .from("family_links")
    .select(linkSelect)
    .eq("patient_id", patientId)
    .eq("family_member_id", watcherId)
    .maybeSingle<ActiveFamilyLink>();

  if (error) throw error;
  return data;
}

export async function resolveWatcherPatientLink(
  supabase: SupabaseClient,
  watcherId: string,
  patientId?: string | null,
) {
  if (patientId) {
    return queryWatcherLinkForPatient(supabase, watcherId, patientId);
  }

  return queryActiveWatcherLinkForUser(supabase, watcherId);
}

export async function queryActivePatientWatchers(
  supabase: SupabaseClient,
  patientId: string,
) {
  try {
    return await queryPatientFamilyLinks(supabase, patientId);
  } catch (error) {
    console.error("Family fetch error (patient query):", error);
    const links = await queryActiveFamilyLinksForUser(supabase, patientId);
    return links.filter((link) => link.patient_id === patientId);
  }
}

export async function queryActivePatientWatchersSafe(
  supabase: SupabaseClient,
  patientId: string,
) {
  try {
    return await queryActivePatientWatchers(supabase, patientId);
  } catch (error) {
    console.error("Family fetch error:", error);
    return [];
  }
}

function filterActiveLinks(links: ActiveFamilyLink[] | null) {
  return (links ?? []).filter((link) => link.active !== false);
}

export const familyConnectionsChangedEvent = "noor-family-connections-changed";

export function notifyFamilyConnectionsChanged() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(familyConnectionsChangedEvent));
}
