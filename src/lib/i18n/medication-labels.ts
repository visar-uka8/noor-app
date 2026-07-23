import type { MedicationTimeEntry, MedicationTimeSlot } from "@/types/medication";

type TranslateFn = (
  key: string,
  vars?: Record<string, string | number>,
) => string;

const TIME_SLOT_KEYS: Record<MedicationTimeSlot, string> = {
  morning: "morning",
  midday: "midday",
  evening: "evening",
};

export function getMedicationTimeSlotLabel(
  slot: MedicationTimeSlot,
  t: TranslateFn,
) {
  return t(TIME_SLOT_KEYS[slot]);
}

export function formatMedicationScheduleEntry(
  entry: MedicationTimeEntry,
  t: TranslateFn,
) {
  return `${getMedicationTimeSlotLabel(entry.slot, t)} ${entry.time}`;
}

export function formatMedicationSchedule(
  times: MedicationTimeEntry[],
  t: TranslateFn,
) {
  return times.map((entry) => formatMedicationScheduleEntry(entry, t)).join(" · ");
}
