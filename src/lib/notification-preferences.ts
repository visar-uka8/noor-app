import {
  defaultNotificationPreferences,
  type NotificationPreferences,
} from "@/types/settings";

export type NotificationPreferenceType = "medications" | "labResults" | "family";

export function normalizeNotificationPreferences(
  value: unknown,
): NotificationPreferences {
  if (!value || typeof value !== "object") {
    return defaultNotificationPreferences;
  }

  const preferences = value as Record<string, unknown>;
  const emailNotifications =
    typeof preferences.emailNotifications === "boolean"
      ? preferences.emailNotifications
      : defaultNotificationPreferences.emailNotifications;

  return {
    emailNotifications,
    medications:
      typeof preferences.medications === "boolean"
        ? preferences.medications
        : emailNotifications,
    labResults:
      typeof preferences.labResults === "boolean"
        ? preferences.labResults
        : emailNotifications,
    family:
      typeof preferences.family === "boolean"
        ? preferences.family
        : emailNotifications,
  };
}

export function isNotificationEnabled(
  preferences: unknown,
  type: NotificationPreferenceType,
) {
  const normalized = normalizeNotificationPreferences(preferences);

  if (normalized.emailNotifications === false) {
    return false;
  }

  return normalized[type] !== false;
}
