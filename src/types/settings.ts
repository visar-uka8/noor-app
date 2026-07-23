import type { SubscriptionTier } from "@/types/subscription";

export type NotificationPreferences = {
  emailNotifications: boolean;
  medications: boolean;
  labResults: boolean;
  family: boolean;
  appointments: boolean;
};

export type FamilyConnection = {
  id: string;
  name: string;
  relationship: string;
  connectedAt: string;
  subtitle?: string;
};

export type SettingsData = {
  profile: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    initials: string;
    avatarUrl: string | null;
    language: "de" | "en" | "tr" | "sq";
    elderMode: boolean;
    notificationPreferences: NotificationPreferences;
    subscriptionTier: SubscriptionTier;
  };
  familyConnections: FamilyConnection[];
};

export const defaultNotificationPreferences: NotificationPreferences = {
  emailNotifications: true,
  medications: true,
  labResults: true,
  family: true,
  appointments: true,
};

export function formatConnectionDate(dateString: string) {
  return new Date(dateString).toLocaleDateString("de-DE", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
