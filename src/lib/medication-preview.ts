import type { GroupedDoseRow } from "@/components/MedicationGroupCard";
import { timeSlotLabels } from "@/types/medication";
import type { DailyDoseSlot } from "@/types/medication";

const previewConfirmedAt = "2026-07-17T08:12:00";

function buildPreviewDose(input: {
  id: string;
  name: string;
  dosage: string;
  time: string;
  slot: DailyDoseSlot["slot"];
}): DailyDoseSlot {
  return {
    id: input.id,
    medicationId: input.id,
    name: input.name,
    dosage: input.dosage,
    slot: input.slot,
    slotLabel: timeSlotLabels[input.slot],
    time: input.time,
    scheduledAt: `2026-07-17T${input.time}:00`,
    displayLabel: input.name,
  };
}

export const medicationPreviewGroups = [
  {
    key: "omega-3",
    name: "Omega-3",
    dosage: "1000mg",
    doses: [
      {
        dose: buildPreviewDose({
          id: "preview-omega-3",
          name: "Omega-3",
          dosage: "1000mg",
          time: "08:00",
          slot: "morning",
        }),
        visualState: "confirmed" as const,
        confirmedAt: previewConfirmedAt,
        pending: false,
      },
    ] satisfies GroupedDoseRow[],
  },
  {
    key: "vitamin-d3",
    name: "Vitamin D3",
    dosage: "2000 IE",
    doses: [
      {
        dose: buildPreviewDose({
          id: "preview-vitamin-d3",
          name: "Vitamin D3",
          dosage: "2000 IE",
          time: "20:00",
          slot: "evening",
        }),
        visualState: "upcoming" as const,
        pending: false,
        previewTheme: "pending-amber" as const,
      },
    ] satisfies GroupedDoseRow[],
  },
];

export const medicationPreviewStreak = 5;
