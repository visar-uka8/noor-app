import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizeAppLanguage } from "@/lib/i18n/languages";
import { resolveStoredAvatarUrl } from "@/lib/profile-avatar-store";
import { normalizeNotificationPreferences } from "@/lib/notification-preferences";
import { getProfileInitials, resolveProfileNames } from "@/lib/profile-display";
import {
  normalizeSubscriptionStatus,
  normalizeSubscriptionTier,
  resolveEffectiveTier,
} from "@/lib/subscription";
import {
  defaultNotificationPreferences,
  type NotificationPreferences,
} from "@/types/settings";

export type LoadedProfileRow = {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
  avatar_url?: string | null;
  role?: string | null;
  language?: "de" | "en" | "tr" | "sq" | null;
  elder_mode?: boolean | null;
  notification_preferences?: unknown;
  subscription_tier?: string | null;
  subscription_status?: string | null;
};

const profileColumnSets = [
  "id, first_name, last_name, avatar_url, role, language, elder_mode, notification_preferences, subscription_tier, subscription_status",
  "id, first_name, last_name, avatar_url, role, language, elder_mode, notification_preferences",
  "id, first_name, last_name, role, language, elder_mode, notification_preferences",
  "id, first_name, last_name, role, elder_mode, notification_preferences",
  "id, first_name, last_name, role, elder_mode",
  "id, first_name, last_name, role",
] as const;

const dashboardProfileColumnSets = [
  "first_name, last_name, phone, last_check_in_at, avatar_url",
  "first_name, last_name, phone, last_check_in_at",
  "first_name, last_name, phone",
  "first_name, last_name",
] as const;

export type DashboardProfileRow = {
  first_name?: string | null;
  last_name?: string | null;
  phone?: string | null;
  last_check_in_at?: string | null;
  avatar_url?: string | null;
};

export type ProfileEditRow = {
  first_name?: string | null;
  last_name?: string | null;
  role?: string | null;
  date_of_birth?: string | null;
  gender?: string | null;
  height_cm?: number | null;
  weight_kg?: number | string | null;
  activity_level?: string | null;
  sport_types?: string[] | null;
};

const profileEditColumnSets = [
  "first_name, last_name, role, date_of_birth, gender, height_cm, weight_kg, activity_level, sport_types",
  "first_name, last_name, role, date_of_birth",
  "first_name, last_name, role",
  "first_name, last_name",
] as const;

export function logSupabaseError(context: string, error: unknown) {
  if (!error || typeof error !== "object") {
    console.error(`${context}:`, error);
    return;
  }

  const record = error as Record<string, unknown>;
  console.error(`${context} code:`, record.code);
  console.error(`${context} message:`, record.message);
  console.error(`${context} details:`, record.details);
  console.error(`${context} hint:`, record.hint);
}

export function isMissingColumnError(error: unknown) {
  if (!error || typeof error !== "object") return false;

  const record = error as Record<string, unknown>;
  const code = String(record.code ?? "");
  const message = String(record.message ?? "").toLowerCase();

  return (
    code === "42703" ||
    code === "PGRST204" ||
    message.includes("does not exist") ||
    message.includes("column")
  );
}

export async function loadUserProfileRow(
  supabase: SupabaseClient,
  userId: string,
  context = "Profile load",
): Promise<{ profile: LoadedProfileRow | null; error: unknown | null }> {
  return loadProfileRowWithFallback<LoadedProfileRow>(
    supabase,
    userId,
    profileColumnSets,
    context,
  );
}

export async function loadDashboardProfileRow(
  supabase: SupabaseClient,
  userId: string,
  context = "Dashboard profile load",
): Promise<{ profile: DashboardProfileRow | null; error: unknown | null }> {
  return loadProfileRowWithFallback<DashboardProfileRow>(
    supabase,
    userId,
    dashboardProfileColumnSets,
    context,
  );
}

export async function loadProfileEditRow(
  supabase: SupabaseClient,
  userId: string,
  context = "Profile edit load",
): Promise<{ profile: ProfileEditRow | null; error: unknown | null }> {
  return loadProfileRowWithFallback<ProfileEditRow>(
    supabase,
    userId,
    profileEditColumnSets,
    context,
  );
}

async function loadProfileRowWithFallback<T>(
  supabase: SupabaseClient,
  userId: string,
  columnSets: readonly string[],
  context: string,
): Promise<{ profile: T | null; error: unknown | null }> {
  let lastError: unknown = null;

  for (const columns of columnSets) {
    const { data, error } = await supabase
      .from("profiles")
      .select(columns)
      .eq("id", userId)
      .maybeSingle<T>();

    if (!error) {
      return { profile: data, error: null as null };
    }

    lastError = error;
    logSupabaseError(`${context} (${columns})`, error);

    if (!isMissingColumnError(error)) {
      break;
    }
  }

  return { profile: null, error: lastError };
}

export function buildProfileSettingsFields(input: {
  userId: string;
  email?: string | null;
  profile?: LoadedProfileRow | null;
  metadata?: { first_name?: string; last_name?: string; avatar_url?: string } | null;
  elderModeOverride?: boolean;
}) {
  const { firstName, lastName } = resolveProfileNames(
    input.profile,
    input.metadata,
  );
  const displayFirstName =
    firstName ||
    input.metadata?.first_name?.trim() ||
    input.email?.split("@")[0] ||
    "Nutzer";

  const notificationPreferences = normalizeNotificationPreferences(
    input.profile?.notification_preferences ?? defaultNotificationPreferences,
  );

  return {
    id: input.userId,
    firstName: displayFirstName,
    lastName,
    email: input.email ?? "",
    initials: getProfileInitials(displayFirstName, lastName) || "?",
    avatarUrl: resolveStoredAvatarUrl({
      profileAvatarUrl: input.profile?.avatar_url,
      metadata: input.metadata,
    }),
    language: normalizeAppLanguage(input.profile?.language),
    elderMode:
      input.elderModeOverride ??
      input.profile?.elder_mode ??
      false,
    notificationPreferences,
    subscriptionTier: resolveEffectiveTier(
      normalizeSubscriptionTier(input.profile?.subscription_tier),
      normalizeSubscriptionStatus(input.profile?.subscription_status),
    ),
  };
}

export function getNotificationPreferences(
  value: unknown,
): NotificationPreferences {
  return normalizeNotificationPreferences(value ?? defaultNotificationPreferences);
}
