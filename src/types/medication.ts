export type StandardMedicationTimeSlot =
  | "morning"
  | "midday"
  | "evening"
  | "night";

export type MealInsulinTimeSlot =
  | "before_breakfast"
  | "before_lunch"
  | "before_dinner";

export type CustomMedicationTimeSlot = `custom_${number}`;

export type MedicationTimeSlot =
  | StandardMedicationTimeSlot
  | MealInsulinTimeSlot
  | CustomMedicationTimeSlot;

export type InsulinType = "mahlzeit" | "basal";

export type MedicationFrequency =
  | "ONCE_DAILY"
  | "TWICE_DAILY"
  | "THREE_TIMES_DAILY";

export type MedicationTimeEntry = {
  slot: MedicationTimeSlot;
  time: string;
  label?: string;
};

export type StoredMedication = {
  id: string;
  user_id: string;
  name: string;
  dosage: string;
  times: MedicationTimeEntry[];
  frequency: MedicationFrequency;
  start_date: string;
  is_active: boolean;
  is_insulin: boolean;
  insulin_type: InsulinType | null;
  created_at: string;
  updated_at: string;
};

export type DailyDoseSlot = {
  id: string;
  medicationId: string;
  name: string;
  dosage: string;
  slot: MedicationTimeSlot;
  slotLabel: string;
  time: string;
  scheduledAt: string;
  displayLabel: string;
  isInsulin: boolean;
  insulinType: InsulinType | null;
  requiresInsulinUnits: boolean;
};

export type StoredConfirmation = {
  id: string;
  medication_id: string | null;
  dose_time: MedicationTimeSlot;
  medication_name: string;
  scheduled_at: string;
  confirmed_at: string | null;
  missed: boolean;
  insulin_units?: number | null;
};

export const STANDARD_MEDICATION_TIME_SLOTS: StandardMedicationTimeSlot[] = [
  "morning",
  "midday",
  "evening",
  "night",
];

export const MEAL_INSULIN_TIME_SLOTS: MealInsulinTimeSlot[] = [
  "before_breakfast",
  "before_lunch",
  "before_dinner",
];

export const timeSlotLabels: Record<StandardMedicationTimeSlot, string> = {
  morning: "Morgens",
  midday: "Mittags",
  evening: "Abends",
  night: "Nachts",
};

export const mealInsulinTimeLabels: Record<MealInsulinTimeSlot, string> = {
  before_breakfast: "Vor dem Frühstück",
  before_lunch: "Vor dem Mittagessen",
  before_dinner: "Vor dem Abendessen",
};

export const defaultTimeSlotValues: Record<StandardMedicationTimeSlot, string> =
  {
    morning: "08:00",
    midday: "12:00",
    evening: "18:00",
    night: "22:00",
  };

export const defaultMealInsulinTimeValues: Record<MealInsulinTimeSlot, string> =
  {
    before_breakfast: "07:30",
    before_lunch: "12:00",
    before_dinner: "18:00",
  };

export function isStandardMedicationTimeSlot(
  value: unknown,
): value is StandardMedicationTimeSlot {
  return (
    value === "morning" ||
    value === "midday" ||
    value === "evening" ||
    value === "night"
  );
}

export function isMealInsulinTimeSlot(
  value: unknown,
): value is MealInsulinTimeSlot {
  return (
    value === "before_breakfast" ||
    value === "before_lunch" ||
    value === "before_dinner"
  );
}

export function isCustomMedicationTimeSlot(
  value: unknown,
): value is CustomMedicationTimeSlot {
  return typeof value === "string" && /^custom_\d+$/.test(value);
}

export function isMedicationTimeSlot(
  value: unknown,
): value is MedicationTimeSlot {
  return (
    isStandardMedicationTimeSlot(value) ||
    isMealInsulinTimeSlot(value) ||
    isCustomMedicationTimeSlot(value)
  );
}

export function customSlotFromIndex(index: number): CustomMedicationTimeSlot {
  return `custom_${index + 1}`;
}

export function customDoseIndexFromSlot(
  slot: MedicationTimeSlot,
): number | null {
  if (!isCustomMedicationTimeSlot(slot)) return null;
  return Number(slot.replace("custom_", ""));
}

export function getMedicationTimeEntryLabel(
  entry: Pick<MedicationTimeEntry, "slot" | "label">,
): string {
  if (entry.label?.trim()) return entry.label.trim();
  if (isStandardMedicationTimeSlot(entry.slot)) {
    return timeSlotLabels[entry.slot];
  }
  if (isMealInsulinTimeSlot(entry.slot)) {
    return mealInsulinTimeLabels[entry.slot];
  }

  const doseIndex = customDoseIndexFromSlot(entry.slot);
  if (doseIndex !== null) return `Dosis ${doseIndex}`;

  return String(entry.slot);
}
