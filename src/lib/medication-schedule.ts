import type {
  DailyDoseSlot,
  MedicationFrequency,
  MedicationTimeEntry,
  MedicationTimeSlot,
  StoredConfirmation,
  StoredMedication,
} from "@/types/medication";
import { defaultTimeSlotValues, timeSlotLabels } from "@/types/medication";

const DUE_WINDOW_MS = 2 * 60 * 60 * 1000;

export type DoseVisualState = "confirmed" | "due" | "missed" | "upcoming";

export function getDoseVisualState(
  scheduledAt: Date | string | null | undefined,
  options: { confirmed?: boolean; now?: number } = {},
): DoseVisualState {
  try {
    if (options.confirmed) return "confirmed";
    if (!scheduledAt) return "upcoming";

    const now = options.now ?? Date.now();
    const scheduled = new Date(scheduledAt).getTime();
    if (Number.isNaN(scheduled)) return "upcoming";

    const dueStart = scheduled - DUE_WINDOW_MS;
    const dueEnd = scheduled + DUE_WINDOW_MS;

    if (now > dueEnd) return "missed";
    if (now >= dueStart) return "due";
    return "upcoming";
  } catch {
    return "upcoming";
  }
}

export function determineFrequency(count: number): MedicationFrequency {
  if (count >= 3) return "THREE_TIMES_DAILY";
  if (count === 2) return "TWICE_DAILY";
  return "ONCE_DAILY";
}

export function formatMedicationConfirmationName(name: string, dosage: string) {
  return `${name.trim()}${dosage.trim() ? ` ${dosage.trim()}` : ""}`.trim();
}

export function normalizeMedicationTimes(value: unknown): MedicationTimeEntry[] {
  if (!Array.isArray(value)) return [];

  const entries: MedicationTimeEntry[] = [];

  for (const item of value) {
    if (typeof item === "string") {
      const slot = inferSlotFromTime(item);
      if (slot) entries.push({ slot, time: item });
      continue;
    }

    if (
      item &&
      typeof item === "object" &&
      "slot" in item &&
      "time" in item &&
      isMedicationTimeSlot(item.slot) &&
      typeof item.time === "string" &&
      item.time.trim().length > 0
    ) {
      entries.push({
        slot: item.slot,
        time: normalizeTimeValue(item.time),
      });
    }
  }

  return entries.sort((left, right) => left.time.localeCompare(right.time));
}

export function expandMedicationsToDailyDoses(
  medications: StoredMedication[] | null | undefined,
): DailyDoseSlot[] {
  return (medications ?? []).flatMap((medication) =>
    normalizeMedicationTimes(medication.times).map((entry) => {
      const scheduledAt = getScheduledAtForTime(entry.time).toISOString();

      return {
        id: makeDoseSlotId(medication.id, entry.slot, entry.time),
        medicationId: medication.id,
        name: medication.name,
        dosage: medication.dosage,
        slot: entry.slot,
        slotLabel: timeSlotLabels[entry.slot],
        time: entry.time,
        scheduledAt,
        displayLabel: `${timeSlotLabels[entry.slot]} — ${medication.name} — ${entry.time}`,
      };
    }),
  );
}

export function makeDoseSlotId(
  medicationId: string,
  slot: MedicationTimeSlot,
  time: string,
) {
  return `${medicationId}:${slot}:${time}`;
}

export function parseDoseSlotId(id: string) {
  const [medicationId, slot, time] = id.split(":");
  if (!medicationId || !isMedicationTimeSlot(slot) || !time) return null;

  return { medicationId, slot, time };
}

export function getScheduledAtForTime(timeValue: string, baseDate = new Date()) {
  const [hours, minutes] = normalizeTimeValue(timeValue).split(":").map(Number);
  const scheduledAt = new Date(baseDate);
  scheduledAt.setHours(hours, minutes, 0, 0);
  return scheduledAt;
}

export function isDoseMissed(scheduledAt: Date | string, now = Date.now()) {
  return getDoseVisualState(scheduledAt, { now }) === "missed";
}

export function getTodayRange() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

export function findConfirmationForDose(
  confirmations: StoredConfirmation[],
  dose: DailyDoseSlot,
) {
  return confirmations.find(
    (confirmation) =>
      confirmation.medication_id === dose.medicationId &&
      confirmation.dose_time === dose.slot &&
      new Date(confirmation.scheduled_at).getTime() ===
        new Date(dose.scheduledAt).getTime(),
  );
}

export function buildMissedConfirmationRecords(
  userId: string,
  medications: StoredMedication[],
  confirmations: StoredConfirmation[],
) {
  const doses = expandMedicationsToDailyDoses(medications);

  return doses
    .filter((dose) => isDoseMissed(dose.scheduledAt))
    .map((dose) => {
      const existing = findConfirmationForDose(confirmations, dose);

      return {
        existing,
        record: {
          user_id: userId,
          medication_id: dose.medicationId,
          medication_name: formatMedicationConfirmationName(
            dose.name,
            dose.dosage,
          ),
          dose_time: dose.slot,
          scheduled_at: dose.scheduledAt,
          confirmed_at: existing?.confirmed_at ?? null,
          missed: true,
        },
      };
    })
    .filter(({ existing }) => !existing?.confirmed_at);
}

export function inferSlotFromTime(timeValue: string): MedicationTimeSlot | null {
  const [hours] = normalizeTimeValue(timeValue).split(":").map(Number);

  if (hours < 11) return "morning";
  if (hours < 17) return "midday";
  return "evening";
}

export function normalizeTimeValue(value: string) {
  const match = value.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return defaultTimeSlotValues.morning;

  const hours = Math.min(23, Math.max(0, Number(match[1])));
  const minutes = Math.min(59, Math.max(0, Number(match[2])));

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

export function isMedicationTimeSlot(value: unknown): value is MedicationTimeSlot {
  return value === "morning" || value === "midday" || value === "evening";
}

export function formatConfirmationTime(value: string) {
  return new Intl.DateTimeFormat("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function parseStoredMedication(row: {
  id: string;
  user_id: string;
  name: string;
  dosage: string;
  times: unknown;
  frequency: string;
  start_date: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}): StoredMedication {
  return {
    ...row,
    times: normalizeMedicationTimes(row.times),
    frequency: row.frequency as MedicationFrequency,
  };
}
