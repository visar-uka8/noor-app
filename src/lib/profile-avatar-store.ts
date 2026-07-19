import type { SupabaseClient } from "@supabase/supabase-js";
import { isMissingColumnError } from "@/lib/load-settings-profile";

export function isMissingAvatarUrlColumnError(error: unknown) {
  if (!isMissingColumnError(error)) return false;

  const message = String(
    (error as Record<string, unknown>).message ?? "",
  ).toLowerCase();

  return message.includes("avatar_url");
}

export function resolveStoredAvatarUrl(input: {
  profileAvatarUrl?: string | null;
  metadata?: Record<string, unknown> | null;
}) {
  const fromProfile = input.profileAvatarUrl?.trim();
  if (fromProfile) return fromProfile;

  const fromMetadata = input.metadata?.avatar_url;
  if (typeof fromMetadata === "string" && fromMetadata.trim()) {
    return fromMetadata.trim();
  }

  return null;
}

export async function saveProfileAvatarUrl(
  supabase: SupabaseClient,
  admin: SupabaseClient | null,
  userId: string,
  avatarUrl: string,
): Promise<{ error: string | null; usedMetadataFallback: boolean }> {
  const { error } = await supabase
    .from("profiles")
    .update({ avatar_url: avatarUrl })
    .eq("id", userId);

  if (!error) {
    return { error: null, usedMetadataFallback: false };
  }

  if (!isMissingAvatarUrlColumnError(error)) {
    return { error: error.message, usedMetadataFallback: false };
  }

  if (!admin) {
    return {
      error:
        "Profilbild wurde hochgeladen, aber avatar_url fehlt in der Datenbank. Bitte migration_profile_avatars.sql in Supabase ausführen.",
      usedMetadataFallback: false,
    };
  }

  const { data: existingUser, error: readError } =
    await admin.auth.admin.getUserById(userId);

  if (readError) {
    return { error: readError.message, usedMetadataFallback: false };
  }

  const metadata = {
    ...(existingUser.user?.user_metadata ?? {}),
    avatar_url: avatarUrl,
  };

  const { error: metadataError } = await admin.auth.admin.updateUserById(
    userId,
    { user_metadata: metadata },
  );

  if (metadataError) {
    return { error: metadataError.message, usedMetadataFallback: false };
  }

  return { error: null, usedMetadataFallback: true };
}
