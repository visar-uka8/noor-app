type ProfileNameFields = {
  first_name?: string | null;
  last_name?: string | null;
};

type AuthMetadata = {
  first_name?: string;
  last_name?: string;
};

export function resolveProfileNames(
  profile: ProfileNameFields | null | undefined,
  metadata?: AuthMetadata | null,
) {
  const firstName =
    profile?.first_name?.trim() || metadata?.first_name?.trim() || "";
  const lastName =
    profile?.last_name?.trim() || metadata?.last_name?.trim() || "";

  return { firstName, lastName };
}

export function getProfileInitials(
  firstName?: string | null,
  lastName?: string | null,
) {
  return `${firstName?.[0] ?? ""}${lastName?.[0] ?? ""}`.trim().toUpperCase();
}
