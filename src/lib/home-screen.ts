import type { PatientFamilyNote } from "@/types/family-notes";
import type { HealthPassportData } from "@/types/health-passport";
import type { StoredConfirmation, StoredMedication } from "@/types/medication";
import type { StoredActivityLog } from "@/types/activity-log";
import { formatTodayActivityShortLabelFromLogs } from "@/types/activity-log";
import {
  buildFamilyMemberCardSubtitle,
  buildMedicationItems,
} from "@/lib/family-dashboard-status";
import {
  getHealthPassportCompletion,
  type PassportCompletionStatus,
} from "@/lib/health-passport-completion";
import { getProfileInitials } from "@/lib/profile-display";

export type HomeMedicationStatus = "green" | "amber" | "red";

export type FamilyCardMode = "none" | "patient" | "family";

export type FamilyCardStatus = {
  mode: FamilyCardMode;
  iconBackground: string;
  iconColor: string;
  subtitle: string;
  subtitleColor?: string;
};

export type HomeScreenData = {
  firstName: string;
  lastName: string;
  initials: string;
  avatarUrl: string | null;
  medication: {
    total: number;
    confirmed: number;
    pending: number;
    missed: number;
    status: HomeMedicationStatus;
  };
  medicationStreak: number;
  labResult: {
    hasResult: boolean;
    lastDate: string | null;
  };
  family: {
    connectedCount: number;
    card: FamilyCardStatus;
    watchers: Array<{
      linkId: string;
      watcherId: string;
      watcherFirstName: string;
      watcherName: string;
    watcherInitials: string;
    watcherAvatarUrl?: string | null;
    relationship: string;
    }>;
    watcherFollowText: string;
    watchedPatientHealthPassportAvailable: boolean;
  };
  healthPassport: {
    complete: boolean;
    completionPercent: number;
    completionStatus: PassportCompletionStatus;
    subtitle: string;
    dotColor: string;
    hasOverdueVaccination: boolean;
  };
  todayActivity: {
    activityType: StoredActivityLog["activity_type"];
    emoji: string;
    title: string;
    subtitle: string;
    durationMinutes: number | null;
    shortLabel: string;
    count: number;
    totalMinutes: number;
    weekActiveDays: number;
    weekTotalMinutes: number;
  } | null;
  activityWeek: {
    activeDays: number;
    totalMinutes: number;
  };
  unreadFamilyNote: PatientFamilyNote | null;
  profileHealthIncomplete: boolean;
  profileHealthProgress: {
    percent: number;
    missingLabels: string[];
  } | null;
};

export function getTimeGreeting(date: Date) {
  const hour = date.getHours();

  if (hour >= 5 && hour < 11) return "Guten Morgen";
  if (hour >= 11 && hour < 14) return "Guten Tag";
  if (hour >= 14 && hour < 23) return "Guten Abend";

  return "Gute Nacht";
}

export function getInitials(firstName: string, lastName = "") {
  return getProfileInitials(firstName, lastName);
}

export function isHealthPassportComplete(passport: HealthPassportData | null) {
  return getHealthPassportCompletion(passport).percent === 100;
}

export function buildHomeHealthPassportSummary(
  passport: HealthPassportData | null,
) {
  const completion = getHealthPassportCompletion(passport);

  return {
    complete: completion.percent === 100,
    completionPercent: completion.percent,
    completionStatus: completion.status,
    subtitle: completion.subtitle,
    dotColor: completion.dotColor,
    hasOverdueVaccination: completion.hasOverdueVaccination,
  };
}

export function buildHomeMedicationSummary(
  medications: StoredMedication[],
  confirmations: StoredConfirmation[],
) {
  const items = buildMedicationItems(medications, confirmations);
  const confirmed = items.filter((item) => item.status === "confirmed").length;
  const pending = items.filter((item) => item.status === "pending").length;
  const missed = items.filter((item) => item.status === "missed").length;

  let status: HomeMedicationStatus = "green";

  if (missed > 0) status = "red";
  else if (pending > 0) status = "amber";

  return {
    total: items.length,
    confirmed,
    pending,
    missed,
    status,
  };
}

const FAMILY_CARD_COLORS = {
  none: { iconBackground: "#F0EFE9", iconColor: "#88856F" },
  green: { iconBackground: "#E1F5EE", iconColor: "#1D9E75", text: "#1D9E75" },
  amber: { iconBackground: "#FAEEDA", iconColor: "#BA7517", text: "#BA7517" },
  red: { iconBackground: "#FCEBEB", iconColor: "#A32D2D", text: "#A32D2D" },
} as const;

export function buildDisconnectedFamilyCard(): FamilyCardStatus {
  return {
    mode: "none",
    iconBackground: FAMILY_CARD_COLORS.none.iconBackground,
    iconColor: FAMILY_CARD_COLORS.none.iconColor,
    subtitle: "Familie einladen →",
  };
}

export function buildPatientFamilyCard(input: {
  watcherCount: number;
  watcherFirstName?: string;
  watcherNames?: string[];
}): FamilyCardStatus {
  const names =
    input.watcherNames?.filter((name) => name.trim().length > 0) ??
    (input.watcherFirstName ? [input.watcherFirstName] : []);

  let subtitle = `${input.watcherCount} Personen verbunden`;

  if (names.length === 1) {
    subtitle = `${names[0]} folgt mit 💚`;
  } else if (names.length > 1) {
    subtitle = `${names.join(" und ")} folgen mit 💚`;
  }

  return {
    mode: "patient",
    iconBackground: FAMILY_CARD_COLORS.green.iconBackground,
    iconColor: FAMILY_CARD_COLORS.green.iconColor,
    subtitle,
  };
}

export function buildFamilyMemberFamilyCard(input: {
  patientLabel: string;
  medication: {
    total: number;
    confirmed: number;
    pending: number;
    missed: number;
    status: HomeMedicationStatus;
  };
  todayActivity?: Pick<StoredActivityLog, "activity_type" | "duration_minutes">[] | null;
}): FamilyCardStatus {
  const subtitle = buildFamilyMemberCardSubtitle(input);
  const hasActivity = Boolean(input.todayActivity?.length);
  const colors = hasActivity || input.medication.status === "green"
    ? FAMILY_CARD_COLORS.green
    : input.medication.status === "red"
      ? FAMILY_CARD_COLORS.red
      : FAMILY_CARD_COLORS.amber;

  return {
    mode: "family",
    iconBackground: colors.iconBackground,
    iconColor: colors.iconColor,
    subtitle,
    subtitleColor: colors.text,
  };
}

export function buildPatientFamilyCardWithActivity(input: {
  watcherCount: number;
  watcherFirstName?: string;
  watcherNames?: string[];
  todayActivity?: Pick<StoredActivityLog, "activity_type" | "duration_minutes">[] | null;
}): FamilyCardStatus {
  if (input.todayActivity?.length) {
    const colors = FAMILY_CARD_COLORS.green;
    return {
      mode: "patient",
      iconBackground: colors.iconBackground,
      iconColor: colors.iconColor,
      subtitle: formatTodayActivityShortLabelFromLogs(input.todayActivity),
      subtitleColor: colors.text,
    };
  }

  return buildPatientFamilyCard(input);
}

export function formatHomeLabDate(dateString: string | null) {
  if (!dateString) return null;

  return new Date(dateString).toLocaleDateString("de-DE", {
    day: "numeric",
    month: "long",
  });
}

export type HomeScreenPreviewMockData = {
  firstName: string;
  streak: number;
  medicationsConfirmed: boolean;
  lastLabDate: string;
  familyStatus: string;
  activityWeek?: {
    activeDays: number;
    totalMinutes: number;
  };
};

export const landingHomePreviewMock: HomeScreenPreviewMockData = {
  firstName: "Hans",
  streak: 5,
  medicationsConfirmed: true,
  lastLabDate: "5. Juni",
  familyStatus: "Maria folgt mit 💚",
  activityWeek: {
    activeDays: 4,
    totalMinutes: 85,
  },
};

export function buildPreviewHomeScreenData(
  mock: HomeScreenPreviewMockData,
): HomeScreenData {
  const medicationTotal = 2;

  return {
    firstName: mock.firstName,
    lastName: "",
    initials: getInitials(mock.firstName),
    avatarUrl: null,
    medication: {
      total: medicationTotal,
      confirmed: mock.medicationsConfirmed ? medicationTotal : 0,
      pending: mock.medicationsConfirmed ? 0 : medicationTotal,
      missed: 0,
      status: mock.medicationsConfirmed ? "green" : "amber",
    },
    medicationStreak: mock.streak,
    labResult: {
      hasResult: true,
      lastDate: mock.lastLabDate,
    },
    family: {
      connectedCount: 1,
      card: {
        mode: "family",
        iconBackground: "#E1F5EE",
        iconColor: "#1D9E75",
        subtitle: mock.familyStatus,
        subtitleColor: "#1D9E75",
      },
      watchers: [
        {
          linkId: "preview-watcher",
          watcherId: "preview-watcher",
          watcherFirstName: "Mama",
          watcherName: "Mama",
          watcherInitials: "M",
          relationship: "Tochter",
        },
      ],
      watcherFollowText: mock.familyStatus,
      watchedPatientHealthPassportAvailable: false,
    },
    healthPassport: {
      complete: true,
      completionPercent: 100,
      completionStatus: "complete",
      subtitle: "Vollständig ✓",
      dotColor: "#1D9E75",
      hasOverdueVaccination: false,
    },
    todayActivity: null,
    activityWeek: mock.activityWeek ?? { activeDays: 0, totalMinutes: 0 },
    unreadFamilyNote: null,
    profileHealthIncomplete: false,
    profileHealthProgress: null,
  };
}

export const demoHomeScreenData: HomeScreenData = {
  firstName: "Renate",
  lastName: "L.",
  initials: "RL",
  avatarUrl: null,
  medication: {
    total: 1,
    confirmed: 1,
    pending: 0,
    missed: 0,
    status: "green",
  },
  medicationStreak: 0,
  labResult: {
    hasResult: true,
    lastDate: "5. Juni",
  },
  family: {
    connectedCount: 1,
    card: {
      mode: "patient",
      iconBackground: "#E1F5EE",
      iconColor: "#1D9E75",
      subtitle: "Alex folgt mit 💚",
    },
    watchers: [
      {
        linkId: "demo-watcher",
        watcherId: "demo-watcher",
        watcherFirstName: "Alex",
        watcherName: "Alex",
        watcherInitials: "A",
        relationship: "Sohn",
      },
    ],
    watcherFollowText: "Alex folgt Ihrer Gesundheit 💚",
    watchedPatientHealthPassportAvailable: false,
  },
  healthPassport: {
    complete: true,
    completionPercent: 100,
    completionStatus: "complete",
    subtitle: "Vollständig ✓",
    dotColor: "#1D9E75",
    hasOverdueVaccination: false,
  },
  todayActivity: null,
  activityWeek: { activeDays: 0, totalMinutes: 0 },
  unreadFamilyNote: null,
  profileHealthIncomplete: false,
  profileHealthProgress: null,
};
