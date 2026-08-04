import type { InsulinType, MealInsulinTimeSlot } from "@/types/medication";
import {
  customDoseIndexFromSlot,
  getMedicationTimeEntryLabel,
  isMealInsulinTimeSlot,
  isStandardMedicationTimeSlot,
  mealInsulinTimeLabels,
} from "@/types/medication";

type TranslateFn = (
  key: string,
  vars?: Record<string, string | number>,
) => string;

const TIME_SLOT_KEYS: Record<
  "morning" | "midday" | "evening" | "night",
  string
> = {
  morning: "morning",
  midday: "midday",
  evening: "evening",
  night: "night",
};

const MEAL_SLOT_KEYS: Record<MealInsulinTimeSlot, string> = {
  before_breakfast: "insulin_before_breakfast",
  before_lunch: "insulin_before_lunch",
  before_dinner: "insulin_before_dinner",
};

export function getMedicationTimeSlotLabel(
  slot: Parameters<typeof getMedicationTimeEntryLabel>[0]["slot"],
  t: TranslateFn,
) {
  if (isStandardMedicationTimeSlot(slot)) {
    return t(TIME_SLOT_KEYS[slot]);
  }

  if (isMealInsulinTimeSlot(slot)) {
    return t(MEAL_SLOT_KEYS[slot]);
  }

  const doseIndex = customDoseIndexFromSlot(slot);
  if (doseIndex !== null) {
    return t("med_custom_dose", { n: doseIndex });
  }

  return String(slot);
}

export function formatMedicationScheduleEntry(
  entry: Parameters<typeof getMedicationTimeEntryLabel>[0] & { time: string },
  t: TranslateFn,
) {
  const label = entry.label?.trim()
    ? entry.label.trim()
    : getMedicationTimeSlotLabel(entry.slot, t);

  return `${label} ${entry.time}`;
}

export function formatMedicationSchedule(
  times: Array<Parameters<typeof formatMedicationScheduleEntry>[0]>,
  t: TranslateFn,
) {
  return times
    .map((entry) => formatMedicationScheduleEntry(entry, t))
    .join(" · ");
}

export function formatMedicationScheduleEntryGerman(
  entry: Parameters<typeof getMedicationTimeEntryLabel>[0] & { time: string },
) {
  return `${getMedicationTimeEntryLabel(entry)} ${entry.time}`;
}

export function getMealInsulinSlotLabelGerman(slot: MealInsulinTimeSlot) {
  return mealInsulinTimeLabels[slot];
}
