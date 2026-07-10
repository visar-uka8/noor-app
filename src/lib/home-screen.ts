import type { HealthPassportData } from "@/types/health-passport";
import type { StoredConfirmation, StoredMedication } from "@/types/medication";
import { buildMedicationItems } from "@/lib/family-dashboard-status";
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
  initials: string;
  medication: {
    total: number;
    confirmed: number;
    pending: number;
    missed: number;
    status: HomeMedicationStatus;
  };
  labResult: {
    hasResult: boolean;
    lastDate: string | null;
  };
  family: {
    connectedCount: number;
    card: FamilyCardStatus;
  };
  healthPassport: {
    complete: boolean;
  };
};

export function getTimeGreeting(date: Date) {
  const hour = date.getHours();

  if (hour >= 5 && hour < 11) return "Guten Morgen";
  if (hour >= 11 && hour < 14) return "Guten Tag";
  if (hour >= 14 && hour < 21) return "Guten Abend";

  return "Gute Nacht";
}

export function getInitials(firstName: string, lastName = "") {
  return getProfileInitials(firstName, lastName);
}

export function isHealthPassportComplete(passport: HealthPassportData | null) {
  if (!passport) return false;

  const hasPersonal =
    passport.personal.fullName.trim().length > 0 &&
    passport.personal.dateOfBirth.trim().length > 0;
  const hasEmergency =
    passport.emergencyContact.name.trim().length > 0 ||
    passport.personal.familyDoctorName.trim().length > 0;
  const hasMedication = passport.medications.some(
    (medication) => medication.name.trim().length > 0,
  );

  return hasPersonal && hasEmergency && hasMedication;
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
}): FamilyCardStatus {
  const subtitle =
    input.watcherCount === 1 && input.watcherFirstName
      ? `${input.watcherFirstName} verfolgt mit 💚`
      : `${input.watcherCount} Personen verbunden`;

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
}): FamilyCardStatus {
  const { patientLabel, medication } = input;

  if (medication.total === 0 || medication.status === "green") {
    const colors = FAMILY_CARD_COLORS.green;
    return {
      mode: "family",
      iconBackground: colors.iconBackground,
      iconColor: colors.iconColor,
      subtitle: `${patientLabel}: Alles okay ✓`,
      subtitleColor: colors.text,
    };
  }

  if (medication.status === "red") {
    const colors = FAMILY_CARD_COLORS.red;
    return {
      mode: "family",
      iconBackground: colors.iconBackground,
      iconColor: colors.iconColor,
      subtitle: `${patientLabel}: Dosis vergessen`,
      subtitleColor: colors.text,
    };
  }

  const colors = FAMILY_CARD_COLORS.amber;
  const pendingText =
    medication.pending === 1
      ? "1 Dosis ausstehend"
      : `${medication.pending} Dosen ausstehend`;

  return {
    mode: "family",
    iconBackground: colors.iconBackground,
    iconColor: colors.iconColor,
    subtitle: `${patientLabel}: ${pendingText}`,
    subtitleColor: colors.text,
  };
}

export function formatHomeLabDate(dateString: string | null) {
  if (!dateString) return null;

  return new Date(dateString).toLocaleDateString("de-DE", {
    day: "numeric",
    month: "long",
  });
}

export const demoHomeScreenData: HomeScreenData = {
  firstName: "Renate",
  initials: "RL",
  medication: {
    total: 1,
    confirmed: 1,
    pending: 0,
    missed: 0,
    status: "green",
  },
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
      subtitle: "Alex verfolgt mit 💚",
    },
  },
  healthPassport: {
    complete: true,
  },
};
