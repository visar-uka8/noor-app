import type {
  MedicationTimeSlot,
  StoredConfirmation,
  StoredMedication,
} from "@/types/medication";
import { formatLabResultDate } from "@/types/lab-results";
import {
  expandMedicationsToDailyDoses,
  findConfirmationForDose,
  formatConfirmationTime,
  isDoseMissed,
  makeDoseSlotId,
} from "@/lib/medication-schedule";

export type FamilyOverallStatus = "green" | "amber" | "red";

export type FamilyMedicationStatus = "confirmed" | "pending" | "missed";

export type FamilyMedicationItem = {
  id: string;
  medicationId: string;
  name: string;
  dosage: string;
  timeLabel: string;
  time: string;
  status: FamilyMedicationStatus;
  statusText: string;
};

export type FamilyDashboardMember = {
  firstName: string;
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
    text: "Dosis vergessen — jetzt anrufen?",
    circleClass: "bg-danger",
    textClass: "text-danger",
  },
};

export function buildOverallStatusText(
  status: FamilyOverallStatus,
  displayLabel: string,
) {
  if (status === "green") {
    return `${displayLabel} hat alle Medikamente heute genommen ✓`;
  }

  return overallStatusCopy[status].text;
}

export function applyMedicationConfirmationChange(
  dashboard: FamilyDashboardData,
  confirmation: StoredConfirmation,
): FamilyDashboardData {
  if (!dashboard.member) return dashboard;

  const itemId = confirmation.medication_id
    ? makeDoseSlotId(
        confirmation.medication_id,
        confirmation.dose_time,
        formatConfirmationTime(confirmation.scheduled_at),
      )
    : confirmation.dose_time;

  const medications = dashboard.medications.map((medication) => {
    if (medication.id !== itemId) return medication;

    if (confirmation.confirmed_at) {
      return {
        ...medication,
        status: "confirmed" as const,
        statusText: `${formatConfirmationTime(confirmation.confirmed_at)} Uhr bestätigt`,
      };
    }

    if (confirmation.missed || isDoseMissed(confirmation.scheduled_at)) {
      return {
        ...medication,
        status: "missed" as const,
        statusText: "vergessen",
      };
    }

    return {
      ...medication,
      status: "pending" as const,
      statusText: "noch ausstehend",
    };
  });

  const overallStatus = getOverallStatus(medications);

  return {
    ...dashboard,
    medications,
    overallStatus,
    overallStatusText: buildOverallStatusText(
      overallStatus,
      dashboard.member.displayLabel,
    ),
  };
}

export function applyProfileCheckInChange(
  dashboard: FamilyDashboardData,
  lastCheckIn: string | null,
): FamilyDashboardData {
  return {
    ...dashboard,
    lastCheckIn,
    lastCheckInText: formatCheckInText(lastCheckIn),
  };
}

export function applyLatestLabResultChange(
  dashboard: FamilyDashboardData,
  labResult: {
    id: string;
    ai_analysis: string;
    created_at: string;
  },
): FamilyDashboardData {
  return {
    ...dashboard,
    latestLabResult: {
      id: labResult.id,
      date: formatLabResultDate(labResult.created_at),
      preview: getAnalysisFirstSentence(labResult.ai_analysis),
      analysis: labResult.ai_analysis,
    },
  };
}

export function buildFamilyDashboardData(input: {
  member: FamilyDashboardMember;
  medications: StoredMedication[];
  confirmations: StoredConfirmation[];
  lastCheckIn: string | null;
  latestLabResult: FamilyLatestLabResult | null;
}): FamilyDashboardData {
  const medications = buildMedicationItems(input.medications, input.confirmations);
  const overallStatus = getOverallStatus(medications);

  return {
    connected: true,
    member: input.member,
    overallStatus,
    overallStatusText: buildOverallStatusText(
      overallStatus,
      input.member.displayLabel,
    ),
    medications,
    lastCheckIn: input.lastCheckIn,
    lastCheckInText: formatCheckInText(input.lastCheckIn),
    latestLabResult: input.latestLabResult,
  };
}

export function buildMedicationItems(
  medications: StoredMedication[],
  confirmations: StoredConfirmation[],
): FamilyMedicationItem[] {
  const doses = expandMedicationsToDailyDoses(medications);

  return doses.map((dose) => {
    const confirmation = findConfirmationForDose(confirmations, dose);

    if (confirmation?.confirmed_at) {
      return {
        id: dose.id,
        medicationId: dose.medicationId,
        name: dose.name,
        dosage: dose.dosage,
        timeLabel: dose.slotLabel,
        time: dose.time,
        status: "confirmed",
        statusText: `${formatConfirmationTime(confirmation.confirmed_at)} Uhr bestätigt`,
      };
    }

    if (confirmation?.missed || isDoseMissed(dose.scheduledAt)) {
      return {
        id: dose.id,
        medicationId: dose.medicationId,
        name: dose.name,
        dosage: dose.dosage,
        timeLabel: dose.slotLabel,
        time: dose.time,
        status: "missed",
        statusText: "vergessen",
      };
    }

    return {
      id: dose.id,
      medicationId: dose.medicationId,
      name: dose.name,
      dosage: dose.dosage,
      timeLabel: dose.slotLabel,
      time: dose.time,
      status: "pending",
      statusText: "noch ausstehend",
    };
  });
}

export function getOverallStatus(
  medications: FamilyMedicationItem[],
): FamilyOverallStatus {
  if (medications.length === 0) return "green";

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
    return `Heute um ${formatConfirmationTime(timestamp)} Uhr`;
  }

  return `${date.toLocaleDateString("de-DE", {
    day: "numeric",
    month: "long",
  })} um ${formatConfirmationTime(timestamp)} Uhr`;
}

export const demoFamilyDashboard = buildFamilyDashboardData({
  member: {
    firstName: "Renate",
    patientId: "demo-patient",
    displayLabel: "Mama",
    name: "Renate Leka",
    relationship: "Mutter",
    phone: "+493012345678",
  },
  medications: [
    {
      id: "demo-med",
      user_id: "demo-patient",
      name: "Omega-3",
      dosage: "1000mg",
      times: [{ slot: "morning", time: "08:00" }],
      frequency: "ONCE_DAILY",
      start_date: new Date().toISOString(),
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ],
  confirmations: [
    {
      id: "demo-confirmation",
      medication_id: "demo-med",
      dose_time: "morning",
      medication_name: "Omega-3 1000mg",
      scheduled_at: getScheduledAtForDemoMorning(),
      confirmed_at: new Date(new Date().setHours(8, 12, 0, 0)).toISOString(),
      missed: false,
    },
  ],
  lastCheckIn: new Date(new Date().setHours(8, 12, 0, 0)).toISOString(),
  latestLabResult: {
    id: "demo-lab",
    date: "5. Juni 2026",
    preview: "Die meisten Werte sehen gut aus und Sie können beruhigt sein.",
    analysis:
      "Die meisten Werte sehen gut aus und Sie können beruhigt sein. Ein Wert sollte mit Ihrem Arzt besprochen werden.",
  },
});

function getScheduledAtForDemoMorning() {
  const scheduledAt = new Date();
  scheduledAt.setHours(8, 0, 0, 0);
  return scheduledAt.toISOString();
}
