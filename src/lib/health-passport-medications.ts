import { normalizeMedicationTimes } from "@/lib/medication-schedule";
import type { PassportMedication } from "@/types/health-passport";
import type { MedicationTimeSlot, StoredMedication } from "@/types/medication";
import { timeSlotLabels } from "@/types/medication";

type LegacyPassportMedication = Partial<PassportMedication> & {
  dosage?: string;
  times?: unknown;
};

function isMedicationTimeSlot(value: unknown): value is MedicationTimeSlot {
  return value === "morning" || value === "midday" || value === "evening";
}

export function coercePassportMedication(
  input: LegacyPassportMedication,
): PassportMedication | null {
  const name = typeof input.name === "string" ? input.name.trim() : "";
  if (!name) return null;

  const dose =
    (typeof input.dose === "string" ? input.dose : input.dosage ?? "").trim();

  let frequency = Array.isArray(input.frequency)
    ? input.frequency.filter(isMedicationTimeSlot)
    : [];

  if (frequency.length === 0 && input.times !== undefined) {
    frequency = [
      ...new Set(
        normalizeMedicationTimes(input.times).map((entry) => entry.slot),
      ),
    ];
  }

  return {
    id: typeof input.id === "string" && input.id.trim() ? input.id : crypto.randomUUID(),
    name,
    dose,
    frequency,
  };
}

export function normalizePassportMedications(
  medications: LegacyPassportMedication[] | null | undefined,
): PassportMedication[] {
  return (medications ?? [])
    .map(coercePassportMedication)
    .filter((medication): medication is PassportMedication => medication !== null);
}

export function toPassportMedications(
  medications: StoredMedication[] | null | undefined,
): PassportMedication[] {
  return (medications ?? [])
    .filter((medication) => medication.is_active !== false)
    .map((medication) => {
      const slots = [
        ...new Set(
          normalizeMedicationTimes(medication.times).map((entry) => entry.slot),
        ),
      ];

      return {
        id: medication.id,
        name: medication.name.trim(),
        dose: medication.dosage?.trim() ?? "",
        frequency: slots,
      };
    })
    .filter((medication) => medication.name.length > 0);
}

export function formatPassportMedicationLine(
  medication: LegacyPassportMedication,
) {
  const normalized = coercePassportMedication(medication);
  if (!normalized) return "";

  const labels = normalized.frequency.map((slot) => timeSlotLabels[slot]);
  const schedule = labels.join(", ");
  const dosePart = normalized.dose ? ` ${normalized.dose}` : "";
  const schedulePart = schedule ? ` — ${schedule}` : "";

  return `${normalized.name}${dosePart}${schedulePart}`;
}

export function getPassportMedicationsForDisplay(
  medications: LegacyPassportMedication[] | null | undefined,
) {
  return normalizePassportMedications(medications);
}
