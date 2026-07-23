export type FamilyLinkRow = {
  id: string;
  patient_id: string;
  watcher_id?: string | null;
  family_member_id?: string | null;
  relationship: string;
  active?: boolean;
  created_at?: string;
};

export function getWatcherId(link: Pick<FamilyLinkRow, "watcher_id" | "family_member_id">) {
  return link.watcher_id ?? link.family_member_id ?? "";
}

export function isWatcherLink(userId: string, link: FamilyLinkRow) {
  return getWatcherId(link) === userId;
}

export function isPatientLink(userId: string, link: FamilyLinkRow) {
  return link.patient_id === userId;
}

export type FamilyRoleState = {
  isWatcher: boolean;
  isPatient: boolean;
  watching: Array<{
    linkId: string;
    patientId: string;
    patientName: string;
    patientFirstName: string;
    relationship: string;
  }>;
  watchers: Array<{
    linkId: string;
    watcherId: string;
    watcherName: string;
    watcherFirstName: string;
    watcherInitials: string;
    watcherAvatarUrl?: string | null;
    relationship: string;
  }>;
};

export function formatWatcherFollowSubtitle(
  names: Array<string | null | undefined>,
  t?: (key: string, vars?: Record<string, string | number>) => string,
) {
  const cleaned = names.map((name) => name?.trim()).filter(Boolean) as string[];

  if (cleaned.length === 0) {
    return t ? t("invite_family") : "Familie einladen →";
  }

  if (cleaned.length === 1) {
    return t
      ? t("family_follow_one", { name: cleaned[0] })
      : `${cleaned[0]} folgt mit 💚`;
  }

  const joined = cleaned.join(" und ");
  return t
    ? t("family_follow_many", { names: joined })
    : `${joined} folgen mit 💚`;
}

export function buildWatcherFollowText(
  watchers: Array<{ watcherFirstName: string }>,
) {
  if (watchers.length === 0) {
    return "";
  }

  const names = watchers.map((watcher) => watcher.watcherFirstName);
  const subtitle = formatWatcherFollowSubtitle(names);

  if (subtitle === "Familie einladen →") {
    return "";
  }

  // Settings / longer copy uses "Ihrer Gesundheit".
  return subtitle.replace(" mit 💚", " Ihrer Gesundheit 💚");
}
