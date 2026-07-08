"use client";

import { useEffect, useState } from "react";
import {
  ConnectionErrorState,
  ErrorBanner,
  ErrorState,
  FeatureEmptyState,
  NoorStatusBanner,
  PageSkeleton,
} from "@/components/AppStates";
import { MedicationDoseButton } from "@/components/MedicationDoseButton";
import { SlowConnectionNotice } from "@/components/SlowConnectionNotice";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { useSlowConnection } from "@/hooks/useSlowConnection";
import { fetchWithTimeout } from "@/lib/fetch-with-timeout";
import {
  medicationDoses,
  type MedicationDose,
  type MedicationTime,
} from "@/types/medication";

const UNDO_WINDOW_MS = 60_000;

export function MedicationConfirmation() {
  const isOnline = useOnlineStatus();
  const [confirmed, setConfirmed] = useState<Set<MedicationTime>>(new Set());
  const [missed, setMissed] = useState<Set<MedicationTime>>(new Set());
  const [pending, setPending] = useState<Set<MedicationTime>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoadError, setHasLoadError] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [doseToConfirm, setDoseToConfirm] = useState<MedicationDose | null>(
    null,
  );
  const [undoTarget, setUndoTarget] = useState<{
    time: MedicationTime;
    label: string;
    expiresAt: number;
  } | null>(null);
  const [isUndoing, setIsUndoing] = useState(false);
  const isSlow = useSlowConnection(isLoading || pending.size > 0);

  async function loadConfirmations() {
    setIsLoading(true);
    setHasLoadError(false);

    try {
      const response = await fetchWithTimeout("/api/medication-confirmations");

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

  useEffect(() => {
    if (!undoTarget) return;

    const remainingMs = undoTarget.expiresAt - Date.now();
    if (remainingMs <= 0) {
      setUndoTarget(null);
      return;
    }

    const timer = window.setTimeout(() => setUndoTarget(null), remainingMs);
    return () => window.clearTimeout(timer);
  }, [undoTarget]);

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
    return (
      <>
        <PageSkeleton />
        {isSlow ? (
          <div className="px-5 pb-6">
            <SlowConnectionNotice message="Das dauert etwas länger — bitte warten Sie." />
          </div>
        ) : null}
      </>
    );
  }

  if (hasLoadError) {
    return (
      <main className="mx-auto w-full max-w-app flex-1 px-5 py-6">
        <ConnectionErrorState
          isOffline={!isOnline}
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
      const response = await fetchWithTimeout("/api/medication-confirmations", {
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
      setUndoTarget({
        time,
        label: `${dose.name} ${dose.dose}`.trim(),
        expiresAt: Date.now() + UNDO_WINDOW_MS,
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

  async function undoConfirmation() {
    if (!undoTarget || isUndoing) return;

    setIsUndoing(true);
    setSaveError(null);

    try {
      const response = await fetchWithTimeout("/api/medication-confirmations", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dose_time: undoTarget.time }),
      });

      if (!response.ok) {
        throw new Error("Undo failed.");
      }

      setConfirmed((current) => {
        const next = new Set(current);
        next.delete(undoTarget.time);
        return next;
      });
      setUndoTarget(null);
      await loadConfirmations();
    } catch {
      setSaveError(
        "Rückgängig machen ist gerade nicht möglich. Bitte versuchen Sie es erneut.",
      );
    } finally {
      setIsUndoing(false);
    }
  }

  const allConfirmed = confirmed.size === medicationDoses.length;
  const pendingCount = medicationDoses.length - confirmed.size - missed.size;
  const isSaving = pending.size > 0;

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

        {isSaving && isSlow ? (
          <SlowConnectionNotice message="Wird gespeichert — bei langsamem Internet kann das einen Moment dauern." />
        ) : null}

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
              onConfirm={() => setDoseToConfirm(dose)}
            />
          ))}
        </div>

        {undoTarget ? (
          <section className="noor-card mt-5 p-4" role="status">
            <p className="text-body text-foreground">
              <span className="font-bold">{undoTarget.label}</span> bestätigt.
            </p>
            <p className="text-body mt-1 text-muted">
              Versehentlich getippt? Sie können das noch rückgängig machen.
            </p>
            <button
              type="button"
              onClick={() => void undoConfirmation()}
              disabled={isUndoing}
              className="btn-touch mt-4 w-full rounded-2xl border-2 border-warning bg-warning-light px-4 py-3 text-base font-bold text-warning"
            >
              {isUndoing ? "Wird rückgängig gemacht…" : "Rückgängig machen"}
            </button>
          </section>
        ) : null}

        {allConfirmed && (
          <p
            className="text-body mt-6 rounded-2xl bg-primary-light px-5 py-4 text-center font-semibold text-heading"
            role="status"
          >
            Alle Einnahmen für heute bestätigt. Ihre Familie wird informiert.
          </p>
        )}
      </main>

      {doseToConfirm ? (
        <MedicationConfirmDialog
          dose={doseToConfirm}
          onConfirm={() => {
            const time = doseToConfirm.time;
            setDoseToConfirm(null);
            void confirmDose(time);
          }}
          onCancel={() => setDoseToConfirm(null)}
        />
      ) : null}
    </>
  );
}

function MedicationConfirmDialog({
  dose,
  onConfirm,
  onCancel,
}: {
  dose: MedicationDose;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const label = `${dose.name} ${dose.dose}`.trim();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-5"
      role="dialog"
      aria-modal="true"
      aria-labelledby="medication-confirm-title"
    >
      <div className="w-full max-w-app rounded-2xl border border-border bg-surface p-5 shadow-[var(--warm-shadow)]">
        <h3 id="medication-confirm-title" className="heading-lg">
          Wirklich genommen?
        </h3>
        <p className="text-body mt-3 text-muted">
          Haben Sie <span className="font-bold text-foreground">{label}</span>{" "}
          ({dose.label}) wirklich eingenommen?
        </p>
        <div className="mt-5 grid grid-cols-1 gap-3">
          <button
            type="button"
            onClick={onConfirm}
            className="btn-primary w-full"
          >
            Ja, genommen
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="btn-touch w-full rounded-2xl border border-border px-4 py-3 text-base font-semibold text-foreground"
          >
            Noch nicht
          </button>
        </div>
      </div>
    </div>
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
