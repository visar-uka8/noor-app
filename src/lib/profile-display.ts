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
  const first = firstName?.[0]?.toUpperCase() ?? "";
  const last = lastName?.[0]?.toUpperCase() ?? "";
  return first + last || "N";
}

export function resolveHomeDisplayFields(input: {
  profile?: ProfileNameFields | null;
  metadata?: AuthMetadata | null;
  email?: string | null;
}) {
  const { profile, metadata, email } = input;

  const firstName =
    profile?.first_name?.trim() ||
    metadata?.first_name?.trim() ||
    email?.split("@")[0] ||
    "Nutzer";

  const lastName =
    profile?.last_name?.trim() || metadata?.last_name?.trim() || "";

  const initials =
    (
      (profile?.first_name?.[0] ?? metadata?.first_name?.[0] ?? "") +
      (profile?.last_name?.[0] ?? metadata?.last_name?.[0] ?? "")
    ).toUpperCase() || "N";

  return { firstName, lastName, initials };
}
