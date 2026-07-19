import type { HealthPassportData } from "@/types/health-passport";
import { passportHasOverdueVaccination } from "@/lib/vaccination-status";

export type PassportCompletionStatus = "empty" | "low" | "high" | "complete";

export type PassportCompletion = {
  percent: number;
  status: PassportCompletionStatus;
  subtitle: string;
  dotColor: string;
  hasOverdueVaccination: boolean;
};

type CompletionCheck = {
  weight: number;
  isFilled: (passport: HealthPassportData) => boolean;
};

const COMPLETION_CHECKS: CompletionCheck[] = [
  {
    weight: 8,
    isFilled: (passport) => passport.personal.fullName.trim().length > 0,
  },
  {
    weight: 6,
    isFilled: (passport) => passport.personal.dateOfBirth.trim().length > 0,
  },
  {
    weight: 6,
    isFilled: (passport) =>
      Boolean(passport.personal.bloodType) &&
      passport.personal.bloodType !== "Unbekannt",
  },
  {
    weight: 5,
    isFilled: (passport) => passport.personal.insuranceName.trim().length > 0,
  },
  {
    weight: 6,
    isFilled: (passport) => passport.personal.insuranceNumber.trim().length > 0,
  },
  {
    weight: 5,
    isFilled: (passport) => passport.personal.familyDoctorName.trim().length > 0,
  },
  {
    weight: 4,
    isFilled: (passport) =>
      passport.personal.familyDoctorPhone.trim().length > 0,
  },
  {
    weight: 8,
    isFilled: (passport) =>
      passport.medications.some((medication) => medication.name.trim().length > 0),
  },
  {
    weight: 12,
    isFilled: (passport) =>
      passport.allergies.some((allergy) => allergy.allergen.trim().length > 0),
  },
  {
    weight: 10,
    isFilled: (passport) =>
      passport.conditions.some((condition) => condition.name.trim().length > 0),
  },
  {
    weight: 10,
    isFilled: (passport) =>
      passport.vaccinations.some(
        (vaccination) => vaccination.name.trim().length > 0,
      ),
  },
  {
    weight: 8,
    isFilled: (passport) => passport.emergencyContact.name.trim().length > 0,
  },
  {
    weight: 6,
    isFilled: (passport) =>
      passport.emergencyContact.relationship.trim().length > 0,
  },
  {
    weight: 6,
    isFilled: (passport) => passport.emergencyContact.phone.trim().length > 0,
  },
];

const COMPLETION_TOTAL_WEIGHT = COMPLETION_CHECKS.reduce(
  (sum, check) => sum + check.weight,
  0,
);

export function getHealthPassportCompletion(
  passport: HealthPassportData | null | undefined,
): PassportCompletion {
  const percent = calculateHealthPassportCompletionPercent(passport);
  const status = getCompletionStatus(percent);
  const hasOverdueVaccination = passportHasOverdueVaccination(passport);

  return {
    percent,
    status,
    subtitle: hasOverdueVaccination
      ? "Impfung fällig →"
      : getCompletionSubtitle(status),
    dotColor: hasOverdueVaccination
      ? "#BA7517"
      : getCompletionDotColor(status),
    hasOverdueVaccination,
  };
}

export function calculateHealthPassportCompletionPercent(
  passport: HealthPassportData | null | undefined,
): number {
  if (!passport) return 0;

  const earnedWeight = COMPLETION_CHECKS.reduce(
    (sum, check) => sum + (check.isFilled(passport) ? check.weight : 0),
    0,
  );

  return Math.round((earnedWeight / COMPLETION_TOTAL_WEIGHT) * 100);
}

export function isHealthPassportAvailable(
  passport: HealthPassportData | null | undefined,
) {
  return calculateHealthPassportCompletionPercent(passport) > 0;
}

function getCompletionStatus(percent: number): PassportCompletionStatus {
  if (percent <= 0) return "empty";
  if (percent < 60) return "low";
  if (percent < 100) return "high";
  return "complete";
}

function getCompletionSubtitle(status: PassportCompletionStatus) {
  if (status === "empty") return "Ausfüllen — im Notfall wichtig";
  if (status === "low") return "Noch nicht vollständig";
  if (status === "high") return "Fast fertig →";
  return "Vollständig ✓";
}

function getCompletionDotColor(status: PassportCompletionStatus) {
  if (status === "empty") return "#A32D2D";
  if (status === "complete") return "#1D9E75";
  return "#BA7517";
}
