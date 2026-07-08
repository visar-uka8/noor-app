import type { HealthPassportData } from "@/types/health-passport";
import { medicationDoses } from "@/types/medication";
import { buildMedicationItems } from "@/lib/family-dashboard-status";
import { formatLabResultDate } from "@/types/lab-results";

export type HomeMedicationStatus = "green" | "amber" | "red";

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
  };
  healthPassport: {
    complete: boolean;
  };
};

export function getTimeGreeting(date: Date) {
  const hour = date.getHours();

  if (hour >= 5 && hour < 11) return "Guten Morgen";
  if (hour >= 11 && hour < 14) return "Guten Mittag";
  if (hour >= 14 && hour < 21) return "Guten Abend";

  return "Gute Nacht";
}

export function getInitials(firstName: string, lastName = "") {
  const first = firstName.trim().charAt(0);
  const last = lastName.trim().charAt(0);

  return `${first}${last}`.toUpperCase() || "N";
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
  confirmations: Array<{
    dose_time: "morning" | "midday" | "evening";
    medication_name: string;
    confirmed_at: string | null;
    missed: boolean;
  }>,
) {
  const items = buildMedicationItems(confirmations);
  const confirmed = items.filter((item) => item.status === "confirmed").length;
  const pending = items.filter((item) => item.status === "pending").length;
  const missed = items.filter((item) => item.status === "missed").length;

  let status: HomeMedicationStatus = "green";

  if (missed > 0) status = "red";
  else if (pending > 0) status = "amber";

  return {
    total: medicationDoses.length,
    confirmed,
    pending,
    missed,
    status,
  };
}

export function formatHomeLabDate(dateString: string | null) {
  if (!dateString) return null;

  return formatLabResultDate(dateString);
}

export const demoHomeScreenData: HomeScreenData = {
  firstName: "Renate",
  initials: "RL",
  medication: {
    total: 3,
    confirmed: 3,
    pending: 0,
    missed: 0,
    status: "green",
  },
  labResult: {
    hasResult: true,
    lastDate: "5. Juni 2026",
  },
  family: {
    connectedCount: 1,
  },
  healthPassport: {
    complete: true,
  },
};
