export type MedicationTimeSlot = "morning" | "midday" | "evening";

export type MedicationFrequency =
  | "ONCE_DAILY"
  | "TWICE_DAILY"
  | "THREE_TIMES_DAILY";

export type MedicationTimeEntry = {
  slot: MedicationTimeSlot;
  time: string;
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
};

export type StoredConfirmation = {
  id: string;
  medication_id: string | null;
  dose_time: MedicationTimeSlot;
  medication_name: string;
  scheduled_at: string;
  confirmed_at: string | null;
  missed: boolean;
};

export const timeSlotLabels: Record<MedicationTimeSlot, string> = {
  morning: "Morgens",
  midday: "Mittags",
  evening: "Abends",
};

export const defaultTimeSlotValues: Record<MedicationTimeSlot, string> = {
  morning: "08:00",
  midday: "12:00",
  evening: "20:00",
};
