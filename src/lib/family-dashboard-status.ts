import type { MedicationTime } from "@/types/medication";
import { medicationDoses } from "@/types/medication";

export type FamilyOverallStatus = "green" | "amber" | "red";

export type FamilyMedicationStatus = "confirmed" | "pending" | "missed";

export type FamilyMedicationItem = {
  id: string;
  name: string;
  timeLabel: string;
  status: FamilyMedicationStatus;
  statusText: string;
};

export type FamilyDashboardMember = {
  patientId: string;
  displayLabel: string;
  name: string;
  relationship: string;
  phone: string;
};

export type FamilyLatestLabResult = {
  id: string;
  date: string;
  preview: string;
  analysis: string;
};

export type FamilyDashboardData = {
  connected: boolean;
  member: FamilyDashboardMember | null;
  overallStatus: FamilyOverallStatus;
  overallStatusText: string;
  medications: FamilyMedicationItem[];
  lastCheckIn: string | null;
  lastCheckInText: string;
  latestLabResult: FamilyLatestLabResult | null;
};

type StoredConfirmation = {
  dose_time: MedicationTime;
  medication_name: string;
  confirmed_at: string | null;
  missed: boolean;
};

const doseSchedule: Record<MedicationTime, { hour: number; minute: number }> = {
  morning: { hour: 8, minute: 0 },
  midday: { hour: 12, minute: 0 },
  evening: { hour: 20, minute: 0 },
};

export const overallStatusCopy: Record<
  FamilyOverallStatus,
  { text: string; circleClass: string; textClass: string }
> = {
  green: {
    text: "Alles okay heute ✓",
    circleClass: "bg-primary",
    textClass: "text-heading",
  },
  amber: {
    text: "Eine Dosis noch ausstehend",
    circleClass: "bg-warning",
    textClass: "text-warning",
  },
  red: {
    text: "Dosis vergessen — bitte anrufen",
    circleClass: "bg-danger",
    textClass: "text-danger",
  },
};

export function buildFamilyDashboardData(input: {
  member: FamilyDashboardMember;
  confirmations: StoredConfirmation[];
  lastCheckIn: string | null;
  latestLabResult: FamilyLatestLabResult | null;
}): FamilyDashboardData {
  const medications = buildMedicationItems(input.confirmations);
  const overallStatus = getOverallStatus(medications);

  return {
    connected: true,
    member: input.member,
    overallStatus,
    overallStatusText: overallStatusCopy[overallStatus].text,
    medications,
    lastCheckIn: input.lastCheckIn,
    lastCheckInText: formatCheckInText(input.lastCheckIn),
    latestLabResult: input.latestLabResult,
  };
}

export function buildMedicationItems(
  confirmations: StoredConfirmation[],
): FamilyMedicationItem[] {
  return medicationDoses.map((dose) => {
    const medicationName = `${dose.name}${dose.dose ? ` ${dose.dose}` : ""}`.trim();
    const confirmation = confirmations.find(
      (entry) =>
        entry.dose_time === dose.time &&
        entry.medication_name.startsWith(dose.name),
    );

    if (confirmation?.confirmed_at) {
      return {
        id: dose.time,
        name: dose.name,
        timeLabel: dose.label,
        status: "confirmed",
        statusText: `${formatTime(confirmation.confirmed_at)} Uhr bestätigt`,
      };
    }

    if (confirmation?.missed || isMissed(dose.time)) {
      return {
        id: dose.time,
        name: dose.name,
        timeLabel: dose.label,
        status: "missed",
        statusText: "vergessen",
      };
    }

    return {
      id: dose.time,
      name: dose.name,
      timeLabel: dose.label,
      status: "pending",
      statusText: "noch ausstehend",
    };
  });
}

export function getOverallStatus(
  medications: FamilyMedicationItem[],
): FamilyOverallStatus {
  if (medications.some((item) => item.status === "missed")) {
    return "red";
  }

  if (medications.some((item) => item.status === "pending")) {
    return "amber";
  }

  return "green";
}

export function getCaretakerLabel(firstName: string) {
  const normalized = firstName.trim().toLowerCase();

  if (normalized === "hans") return "Papa";
  if (normalized === "renate") return "Mama";

  return "Mama";
}

export function getPatientRelationshipLabel(relationship: string) {
  if (relationship === "Sohn" || relationship === "Tochter") {
    return "Mutter";
  }

  if (relationship === "Ehepartner") {
    return "Ehepartner/in";
  }

  return "Angehörige";
}

export function getAnalysisFirstSentence(text: string) {
  const cleaned = text.trim();
  const sentenceMatch = cleaned.match(/^[^.!?]+[.!?]/);

  if (sentenceMatch) {
    return sentenceMatch[0].trim();
  }

  return cleaned.split("\n").find((line) => line.trim().length > 0) ?? cleaned;
}

export function formatCheckInText(timestamp: string | null) {
  if (!timestamp) {
    return "Noch keine Aktivität heute";
  }

  const date = new Date(timestamp);
  const now = new Date();
  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  if (isToday) {
    return `Heute um ${formatTime(timestamp)} Uhr`;
  }

  return `${date.toLocaleDateString("de-DE", {
    day: "numeric",
    month: "long",
  })} um ${formatTime(timestamp)} Uhr`;
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function isMissed(doseTime: MedicationTime) {
  const missedAfter = getScheduledAt(doseTime);
  missedAfter.setMinutes(missedAfter.getMinutes() + 90);

  return Date.now() > missedAfter.getTime();
}

function getScheduledAt(doseTime: MedicationTime) {
  const scheduledAt = new Date();
  const schedule = doseSchedule[doseTime];
  scheduledAt.setHours(schedule.hour, schedule.minute, 0, 0);
  return scheduledAt;
}

export const demoFamilyDashboard = buildFamilyDashboardData({
  member: {
    patientId: "demo-patient",
    displayLabel: "Mama",
    name: "Renate Leka",
    relationship: "Mutter",
    phone: "+493012345678",
  },
  confirmations: [
    {
      dose_time: "morning",
      medication_name: "Omega-3 1000mg",
      confirmed_at: new Date(
        new Date().setHours(8, 12, 0, 0),
      ).toISOString(),
      missed: false,
    },
  ],
  lastCheckIn: new Date(new Date().setHours(8, 12, 0, 0)).toISOString(),
  latestLabResult: {
    id: "demo-lab",
    date: "5. Juni 2026",
    preview:
      "Die meisten Werte sehen gut aus und Sie können beruhigt sein.",
    analysis:
      "Die meisten Werte sehen gut aus und Sie können beruhigt sein. Ein Wert sollte mit Ihrem Arzt besprochen werden.",
  },
});
