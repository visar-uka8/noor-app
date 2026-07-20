import type {
  DailyDoseSlot,
  MedicationFrequency,
  MedicationTimeEntry,
  MedicationTimeSlot,
  StoredConfirmation,
  StoredMedication,
} from "@/types/medication";
import { defaultTimeSlotValues, timeSlotLabels } from "@/types/medication";
import { MISSED_GRACE_MINUTES } from "@/lib/medication-notification-timing";

const UPCOMING_LEAD_MINUTES = 30;
export { MISSED_GRACE_MINUTES };
export const EARLY_CONFIRM_THRESHOLD_MINUTES = 120;

export type DoseVisualState = "confirmed" | "due" | "missed" | "upcoming";

export function getDoseDiffMinutes(
  scheduledTime: string,
  now: Date | number = Date.now(),
) {
  const current = typeof now === "number" ? new Date(now) : now;
  const [hours, minutes] = normalizeTimeValue(scheduledTime).split(":").map(Number);
  const scheduled = new Date(current);
  scheduled.setHours(hours, minutes, 0, 0);

  return (scheduled.getTime() - current.getTime()) / (1000 * 60);
}

export function getMinutesOverdue(
  scheduledTime: string,
  now: Date | number = Date.now(),
) {
  return Math.max(0, -getDoseDiffMinutes(scheduledTime, now));
}

export function isDoseOverdueBy(
  scheduledTime: string,
  thresholdMinutes: number,
  now: Date | number = Date.now(),
) {
  return getMinutesOverdue(scheduledTime, now) >= thresholdMinutes;
}

export function isDoseMoreThanTwoHoursEarly(
  scheduledTime: string,
  now: Date | number = Date.now(),
) {
  return getDoseDiffMinutes(scheduledTime, now) > EARLY_CONFIRM_THRESHOLD_MINUTES;
}

export function getDoseVisualState(
  scheduledTime: string | null | undefined,
  options: { confirmed?: boolean; now?: number } = {},
): DoseVisualState {
  try {
    if (options.confirmed) return "confirmed";
    if (!scheduledTime) return "upcoming";

    const diffMinutes = getDoseDiffMinutes(scheduledTime, options.now ?? Date.now());

    if (diffMinutes > UPCOMING_LEAD_MINUTES) return "upcoming";
    if (diffMinutes > -MISSED_GRACE_MINUTES) return "due";
    return "missed";
  } catch {
    return "upcoming";
  }
}

export function getDoseTimeLabel(
  visualState: DoseVisualState,
  scheduledTime: string,
  slotLabel: string,
  now: number = Date.now(),
) {
  if (visualState === "missed") return "Vergessen";
  if (visualState === "due") {
    const diffMinutes = getDoseDiffMinutes(scheduledTime, now);
    return diffMinutes >= -30 ? "Jetzt einnehmen" : "Fällig";
  }
  if (visualState === "confirmed") return slotLabel;
  return slotLabel;
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

export function isDoseMissed(
  scheduledAt: Date | string,
  now = Date.now(),
) {
  const scheduled = new Date(scheduledAt);
  if (Number.isNaN(scheduled.getTime())) return false;

  const time = `${String(scheduled.getHours()).padStart(2, "0")}:${String(scheduled.getMinutes()).padStart(2, "0")}`;
  return getDoseVisualState(time, { now }) === "missed";
}

export function getTodayRange() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

export function confirmationMatchesDose(
  confirmation: Pick<
    StoredConfirmation,
    "medication_id" | "dose_time" | "scheduled_at"
  >,
  dose: Pick<DailyDoseSlot, "medicationId" | "slot" | "scheduledAt">,
) {
  if (confirmation.medication_id !== dose.medicationId) return false;
  if (confirmation.dose_time !== dose.slot) return false;

  // Match by calendar day — server (UTC) and client (local) ISO strings often differ.
  return isSameLocalCalendarDay(confirmation.scheduled_at, dose.scheduledAt);
}

function isSameLocalCalendarDay(left: string, right: string) {
  const a = new Date(left);
  const b = new Date(right);

  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return false;

  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function findConfirmationForDose(
  confirmations: StoredConfirmation[],
  dose: DailyDoseSlot,
) {
  const matches = confirmations.filter((confirmation) =>
    confirmationMatchesDose(confirmation, dose),
  );

  return matches.find((confirmation) => confirmation.confirmed_at) ?? matches[0];
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
