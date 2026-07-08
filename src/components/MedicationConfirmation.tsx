"use client";

import { Pill } from "lucide-react";
import { useEffect, useState } from "react";
import {
  ErrorBanner,
  ErrorState,
  FeatureEmptyState,
  NoorStatusBanner,
  PageSkeleton,
} from "@/components/AppStates";
import { MedicationDoseButton } from "@/components/MedicationDoseButton";
import {
  medicationDoses,
  type MedicationTime,
} from "@/types/medication";

export function MedicationConfirmation() {
  const [confirmed, setConfirmed] = useState<Set<MedicationTime>>(new Set());
  const [missed, setMissed] = useState<Set<MedicationTime>>(new Set());
  const [pending, setPending] = useState<Set<MedicationTime>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoadError, setHasLoadError] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  async function loadConfirmations() {
    setIsLoading(true);
    setHasLoadError(false);

    try {
      const response = await fetch("/api/medication-confirmations");

      if (!response.ok) throw new Error("Medication confirmations failed.");

      const data = (await response.json()) as {
        confirmations: Array<{
          dose_time: MedicationTime;
          confirmed_at: string | null;
          missed: boolean;
        }>;
      };
      setConfirmed(
        new Set(
          data.confirmations
            .filter((confirmation) => confirmation.confirmed_at)
            .map((confirmation) => confirmation.dose_time),
        ),
      );
      setMissed(
        new Set(
          data.confirmations
            .filter(
              (confirmation) =>
                confirmation.missed && !confirmation.confirmed_at,
            )
            .map((confirmation) => confirmation.dose_time),
        ),
      );
    } catch {
      setHasLoadError(true);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadConfirmations();
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => {
      void loadConfirmations();
    }, 60_000);
    return () => window.clearInterval(interval);
  }, []);

  if (medicationDoses.length === 0) {
    return (
      <main className="mx-auto w-full max-w-app flex-1 px-5 py-6">
        <FeatureEmptyState
          emoji="💊"
          title="Noch keine Medikamente"
          subtitle="Fügen Sie Ihre täglichen Medikamente hinzu, um Erinnerungen zu erhalten."
          actionLabel="Medikament hinzufügen"
          onAction={() => undefined}
        />
      </main>
    );
  }

  if (isLoading) {
    return <PageSkeleton />;
  }

  if (hasLoadError) {
    return (
      <main className="mx-auto w-full max-w-app flex-1 px-5 py-6">
        <ErrorState
          message="Medikamente konnten nicht geladen werden."
          onRetry={loadConfirmations}
        />
      </main>
    );
  }

  async function confirmDose(time: MedicationTime) {
    if (confirmed.has(time) || pending.has(time)) return;

    const dose = medicationDoses.find(
      (medicationDose) => medicationDose.time === time,
    );
    if (!dose) return;

    setSaveError(null);
    setPending((current) => new Set(current).add(time));

    try {
      const response = await fetch("/api/medication-confirmations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          medication_name: `${dose.name}${dose.dose ? ` ${dose.dose}` : ""}`.trim(),
          dose_time: time,
        }),
      });

      if (!response.ok) {
        throw new Error("Medication confirmation save failed.");
      }

      setConfirmed((current) => new Set(current).add(time));
      setMissed((current) => {
        const next = new Set(current);
        next.delete(time);
        return next;
      });
    } catch {
      setSaveError(
        "Bestätigung konnte nicht gespeichert werden. Bitte tippen Sie erneut auf die Einnahme.",
      );
    } finally {
      setPending((current) => {
        const next = new Set(current);
        next.delete(time);
        return next;
      });
    }
  }

  const allConfirmed = confirmed.size === medicationDoses.length;
  const pendingCount = medicationDoses.length - confirmed.size - missed.size;

  return (
    <>
      {saveError ? (
        <ErrorBanner
          message={saveError}
          actionLabel="Verstanden"
          onAction={() => setSaveError(null)}
          onDismiss={() => setSaveError(null)}
        />
      ) : null}

      <main className="mx-auto w-full max-w-app flex-1 px-5 py-6">
        <MedicationStatusBanner
          allConfirmed={allConfirmed}
          hasMissed={missed.size > 0}
          pendingCount={pendingCount}
        />

        <p className="text-body mb-6 text-muted">
          Tippen Sie auf jede Einnahme, wenn Sie Ihr Medikament genommen haben.
        </p>

        <div
          className="flex flex-col gap-4"
          role="group"
          aria-label="Tägliche Medikamenteneinnahme"
        >
          {medicationDoses.map((dose) => (
            <MedicationDoseButton
              key={dose.time}
              dose={dose}
              confirmed={confirmed.has(dose.time)}
              missed={missed.has(dose.time)}
              pending={pending.has(dose.time)}
              onConfirm={() => void confirmDose(dose.time)}
            />
          ))}
        </div>

        {allConfirmed && (
          <p
            className="text-body mt-6 rounded-2xl bg-primary-light px-5 py-4 text-center font-semibold text-heading"
            role="status"
          >
            Alle Einnahmen für heute bestätigt. Ihre Familie wird informiert.
          </p>
        )}
      </main>
    </>
  );
}

function MedicationStatusBanner({
  allConfirmed,
  hasMissed,
  pendingCount,
}: {
  allConfirmed: boolean;
  hasMissed: boolean;
  pendingCount: number;
}) {
  if (hasMissed) {
    return (
      <div className="mb-5">
        <NoorStatusBanner level="danger">
          Dosis vergessen — bitte jetzt nehmen
        </NoorStatusBanner>
      </div>
    );
  }

  if (allConfirmed) {
    return (
      <div className="mb-5">
        <NoorStatusBanner level="success">
          Alle Medikamente heute genommen ✓
        </NoorStatusBanner>
      </div>
    );
  }

  if (pendingCount > 0) {
    return (
      <div className="mb-5">
        <NoorStatusBanner level="warning">
          {pendingCount === 1
            ? "Eine Dosis noch ausstehend"
            : `${pendingCount} Dosen noch ausstehend`}
        </NoorStatusBanner>
      </div>
    );
  }

  return null;
}
