import type { ProfileHealthData } from "@/types/profile-health";
import {
  emptyProfileHealthData,
  profileHealthFromRow,
} from "@/types/profile-health";
import type { ProfileHealthMetadata } from "@/lib/profile-health-metadata";
import { mergeProfileHealthSources } from "@/lib/profile-health-metadata";

export function isProfileHealthIncomplete(
  health: ProfileHealthData = emptyProfileHealthData,
) {
  return (
    !health.gender ||
    !health.heightCm.trim() ||
    !health.weightKg.trim() ||
    !health.activityLevel
  );
}

export function isProfileHealthIncompleteFromRow(
  row: Parameters<typeof profileHealthFromRow>[0],
  metadata?: ProfileHealthMetadata | null,
) {
  return isProfileHealthIncomplete(mergeProfileHealthSources(row, metadata));
}

export function getProfileHealthMissingLabels(
  health: ProfileHealthData = emptyProfileHealthData,
) {
  const missing: string[] = [];

  if (!health.gender) missing.push("Geschlecht");
  if (!health.heightCm.trim()) missing.push("Größe");
  if (!health.weightKg.trim()) missing.push("Gewicht");
  if (!health.activityLevel) missing.push("Aktivität");

  return missing;
}

export function getProfileHealthCompletionPercent(
  health: ProfileHealthData = emptyProfileHealthData,
) {
  const total = 4;
  const missing = getProfileHealthMissingLabels(health).length;

  return Math.round(((total - missing) / total) * 100);
}

export function countProfileHealthFields(health: ProfileHealthData) {
  let count = 0;

  if (health.dateOfBirth.trim()) count += 1;
  if (health.gender) count += 1;
  if (health.heightCm.trim()) count += 1;
  if (health.weightKg.trim()) count += 1;
  if (health.activityLevel) count += 1;
  if (health.sportTypes.length > 0) count += 1;

  return count;
}
