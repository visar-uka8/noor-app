"use client";

import { MedicationGroupCard } from "@/components/MedicationGroupCard";
import { MedicationStreakCard } from "@/components/MedicationStreakCard";
import {
  medicationPreviewGroups,
  medicationPreviewStreak,
} from "@/lib/medication-preview";

export function MedicationConfirmationPreview() {
  return (
    <div className="mx-auto flex w-full max-w-app flex-col bg-background pointer-events-none select-none">
      <main className="flex-1 px-5 py-5">
        <MedicationStreakCard streak={medicationPreviewStreak} variant="medication" />

        <div className="mt-4 flex flex-col gap-3" aria-hidden="true">
          {medicationPreviewGroups.map((group) => (
            <MedicationGroupCard
              key={group.key}
              name={group.name}
              dosage={group.dosage}
              doses={group.doses}
              onConfirm={() => undefined}
              interactive={false}
            />
          ))}
        </div>

        <p
          className="mt-4 rounded-2xl bg-primary-light px-4 py-3 text-center text-[14px] font-semibold text-[#085041]"
          aria-hidden="true"
        >
          💚 Ihre Familie wird informiert
        </p>
      </main>
    </div>
  );
}
