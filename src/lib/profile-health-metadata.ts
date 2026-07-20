import type { SupabaseClient } from "@supabase/supabase-js";
import {
  emptyProfileHealthData,
  profileHealthFromRow,
  type ProfileHealthData,
} from "@/types/profile-health";

export const PROFILE_HEALTH_METADATA_KEY = "profile_health";

export type ProfileHealthMetadata = {
  date_of_birth?: string | null;
  gender?: string | null;
  height_cm?: number | null;
  weight_kg?: number | string | null;
  activity_level?: string | null;
  sport_types?: string[] | null;
};

export function healthUpdatesToMetadata(
  updates: Record<string, unknown>,
): ProfileHealthMetadata | null {
  const hasHealthField =
    "date_of_birth" in updates ||
    "gender" in updates ||
    "height_cm" in updates ||
    "weight_kg" in updates ||
    "activity_level" in updates ||
    "sport_types" in updates;

  if (!hasHealthField) return null;

  return {
    date_of_birth:
      typeof updates.date_of_birth === "string" ? updates.date_of_birth : null,
    gender: typeof updates.gender === "string" ? updates.gender : null,
    height_cm:
      typeof updates.height_cm === "number" ? updates.height_cm : null,
    weight_kg:
      typeof updates.weight_kg === "number" ? updates.weight_kg : null,
    activity_level:
      typeof updates.activity_level === "string"
        ? updates.activity_level
        : null,
    sport_types: Array.isArray(updates.sport_types)
      ? (updates.sport_types as string[])
      : [],
  };
}

export function mergeProfileHealthSources(
  row: Parameters<typeof profileHealthFromRow>[0],
  metadata?: ProfileHealthMetadata | null,
): ProfileHealthData {
  const fromRow = profileHealthFromRow(row);
  const fromMetadata = profileHealthFromRow(metadata);

  return {
    dateOfBirth: fromRow.dateOfBirth || fromMetadata.dateOfBirth,
    gender: fromRow.gender || fromMetadata.gender,
    heightCm: fromRow.heightCm || fromMetadata.heightCm,
    weightKg: fromRow.weightKg || fromMetadata.weightKg,
    activityLevel: fromRow.activityLevel || fromMetadata.activityLevel,
    sportTypes:
      fromRow.sportTypes.length > 0
        ? fromRow.sportTypes
        : fromMetadata.sportTypes,
  };
}

export function profileHealthToMetadata(
  health: ProfileHealthData,
): ProfileHealthMetadata {
  return {
    date_of_birth: health.dateOfBirth || null,
    gender: health.gender || null,
    height_cm: health.heightCm.trim() ? Number(health.heightCm) : null,
    weight_kg: health.weightKg.trim() ? Number(health.weightKg) : null,
    activity_level: health.activityLevel || null,
    sport_types:
      health.activityLevel && health.activityLevel !== "sedentary"
        ? health.sportTypes
        : [],
  };
}

export function readProfileHealthMetadata(
  metadata: Record<string, unknown> | null | undefined,
): ProfileHealthMetadata | null {
  const value = metadata?.[PROFILE_HEALTH_METADATA_KEY];

  if (!value || typeof value !== "object") {
    return null;
  }

  return value as ProfileHealthMetadata;
}

export async function saveProfileHealthMetadata(
  supabase: SupabaseClient,
  userId: string,
  health: ProfileHealthMetadata,
  existingMetadata: Record<string, unknown> | null | undefined,
) {
  const { data, error } = await supabase.auth.admin.updateUserById(userId, {
    user_metadata: {
      ...(existingMetadata ?? {}),
      [PROFILE_HEALTH_METADATA_KEY]: health,
    },
  });

  if (error) {
    throw error;
  }

  return data.user;
}

export function isProfileHealthEmpty(health: ProfileHealthData) {
  return (
    health === emptyProfileHealthData ||
    (!health.heightCm.trim() &&
      !health.weightKg.trim() &&
      !health.gender &&
      !health.activityLevel)
  );
}
