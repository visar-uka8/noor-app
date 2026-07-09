"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  ConnectionErrorState,
  ErrorBanner,
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
  expandMedicationsToDailyDoses,
  findConfirmationForDose,
  normalizeMedicationTimes,
} from "@/lib/medication-schedule";
import { timeSlotLabels } from "@/types/medication";
import type {
  DailyDoseSlot,
  StoredConfirmation,
  StoredMedication,
} from "@/types/medication";

const UNDO_WINDOW_MS = 60_000;

export function MedicationConfirmation() {
  const router = useRouter();
  const isOnline = useOnlineStatus();
  const [medications, setMedications] = useState<StoredMedication[]>([]);
  const [confirmations, setConfirmations] = useState<StoredConfirmation[]>([]);
  const [pendingDoseIds, setPendingDoseIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoadError, setHasLoadError] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [doseToConfirm, setDoseToConfirm] = useState<DailyDoseSlot | null>(null);
  const [medicationToDelete, setMedicationToDelete] =
    useState<StoredMedication | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [undoTarget, setUndoTarget] = useState<{
    dose: DailyDoseSlot;
    expiresAt: number;
  } | null>(null);
  const [isUndoing, setIsUndoing] = useState(false);
  const isSlow = useSlowConnection(isLoading || pendingDoseIds.size > 0);

  const doses = useMemo(
    () => expandMedicationsToDailyDoses(medications),
    [medications],
  );

  const confirmedDoseIds = useMemo(() => {
    const confirmed = new Set<string>();

    for (const dose of doses) {
      const confirmation = findConfirmationForDose(confirmations, dose);
      if (confirmation?.confirmed_at) confirmed.add(dose.id);
    }

    return confirmed;
  }, [confirmations, doses]);

  const missedDoseIds = useMemo(() => {
    const missed = new Set<string>();

    for (const dose of doses) {
      const confirmation = findConfirmationForDose(confirmations, dose);
      if (confirmation?.missed && !confirmation.confirmed_at) {
        missed.add(dose.id);
      }
    }

    return missed;
  }, [confirmations, doses]);

  async function loadMedicationData() {
    setIsLoading(true);
    setHasLoadError(false);

    try {
      const [medicationsResponse, confirmationsResponse] = await Promise.all([
        fetchWithTimeout("/api/medications", { credentials: "include" }),
        fetchWithTimeout("/api/medication-confirmations", { credentials: "include" }),
      ]);

      if (!medicationsResponse.ok || !confirmationsResponse.ok) {
        throw new Error("Medication data failed.");
      }

      const medicationsData = (await medicationsResponse.json()) as {
        medications: StoredMedication[];
      };
      const confirmationsData = (await confirmationsResponse.json()) as {
        confirmations: StoredConfirmation[];
      };

      setMedications(medicationsData.medications ?? []);
      setConfirmations(confirmationsData.confirmations ?? []);
    } catch {
      setHasLoadError(true);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadMedicationData();
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => {
      void loadMedicationData();
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

  if (!isLoading && medications.length === 0) {
    return (
      <main className="mx-auto w-full max-w-app flex-1 px-5 py-6">
        <FeatureEmptyState
          emoji="💊"
          title="Noch keine Medikamente"
          subtitle="Fügen Sie Ihre Medikamente hinzu damit Noor Sie täglich erinnern kann."
          actionLabel="Medikament hinzufügen"
          href="/medication/add"
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
          onRetry={loadMedicationData}
        />
      </main>
    );
  }

  async function confirmDose(dose: DailyDoseSlot) {
    if (confirmedDoseIds.has(dose.id) || pendingDoseIds.has(dose.id)) return;

    setSaveError(null);
    setPendingDoseIds((current) => new Set(current).add(dose.id));

    try {
      const response = await fetchWithTimeout("/api/medication-confirmations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          medication_id: dose.medicationId,
          dose_time: dose.slot,
          scheduled_time: dose.time,
        }),
      });

      if (!response.ok) {
        throw new Error("Medication confirmation save failed.");
      }

      const data = (await response.json()) as {
        confirmation: StoredConfirmation;
      };

      setConfirmations((current) => {
        const next = current.filter(
          (confirmation) =>
            !(
              confirmation.medication_id === dose.medicationId &&
              confirmation.dose_time === dose.slot &&
              confirmation.scheduled_at === dose.scheduledAt
            ),
        );
        return [...next, data.confirmation];
      });
      setUndoTarget({
        dose,
        expiresAt: Date.now() + UNDO_WINDOW_MS,
      });
    } catch {
      setSaveError(
        "Bestätigung konnte nicht gespeichert werden. Bitte tippen Sie erneut auf die Einnahme.",
      );
    } finally {
      setPendingDoseIds((current) => {
        const next = new Set(current);
        next.delete(dose.id);
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
        credentials: "include",
        body: JSON.stringify({
          medication_id: undoTarget.dose.medicationId,
          dose_time: undoTarget.dose.slot,
          scheduled_time: undoTarget.dose.time,
        }),
      });

      if (!response.ok) {
        throw new Error("Undo failed.");
      }

      setConfirmations((current) =>
        current.map((confirmation) =>
          confirmation.medication_id === undoTarget.dose.medicationId &&
          confirmation.dose_time === undoTarget.dose.slot &&
          confirmation.scheduled_at === undoTarget.dose.scheduledAt
            ? { ...confirmation, confirmed_at: null, missed: confirmation.missed }
            : confirmation,
        ),
      );
      setUndoTarget(null);
      await loadMedicationData();
    } catch {
      setSaveError(
        "Rückgängig machen ist gerade nicht möglich. Bitte versuchen Sie es erneut.",
      );
    } finally {
      setIsUndoing(false);
    }
  }

  async function deleteMedication(medication: StoredMedication) {
    setIsDeleting(true);
    setSaveError(null);

    try {
      const response = await fetchWithTimeout(
        `/api/medications/${medication.id}`,
        { method: "DELETE", credentials: "include" },
      );

      if (!response.ok) {
        throw new Error("Delete failed.");
      }

      setMedicationToDelete(null);
      await loadMedicationData();
      router.refresh();
    } catch {
      setSaveError("Medikament konnte gerade nicht entfernt werden.");
    } finally {
      setIsDeleting(false);
    }
  }

  const allConfirmed =
    doses.length > 0 && confirmedDoseIds.size === doses.length;
  const pendingCount =
    doses.length - confirmedDoseIds.size - missedDoseIds.size;
  const isSaving = pendingDoseIds.size > 0;

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
          hasMissed={missedDoseIds.size > 0}
          pendingCount={pendingCount}
        />

        <p className="mb-6 text-[17px] leading-relaxed text-[#555555]">
          Tippen Sie wenn Sie Ihr Medikament genommen haben 💚
        </p>

        {isSaving && isSlow ? (
          <SlowConnectionNotice message="Wird gespeichert — bei langsamem Internet kann das einen Moment dauern." />
        ) : null}

        <div
          className="flex flex-col gap-4"
          role="group"
          aria-label="Tägliche Medikamenteneinnahme"
        >
          {doses.map((dose) => {
            const confirmation = findConfirmationForDose(confirmations, dose);

            return (
              <MedicationDoseButton
                key={dose.id}
                dose={dose}
                confirmed={confirmedDoseIds.has(dose.id)}
                missed={missedDoseIds.has(dose.id)}
                pending={pendingDoseIds.has(dose.id)}
                confirmedAt={confirmation?.confirmed_at}
                onConfirm={() => setDoseToConfirm(dose)}
              />
            );
          })}
        </div>

        <MedicationManageSection
          medications={medications}
          onDelete={setMedicationToDelete}
        />

        {undoTarget ? (
          <section className="noor-card mt-5 p-4" role="status">
            <p className="text-body text-foreground">
              <span className="font-bold">{undoTarget.dose.displayLabel}</span>{" "}
              bestätigt.
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

        {allConfirmed ? (
          <p
            className="text-body mt-6 rounded-2xl bg-primary-light px-5 py-4 text-center font-semibold text-heading"
            role="status"
          >
            Alle Einnahmen für heute bestätigt. Ihre Familie wird informiert.
          </p>
        ) : null}
      </main>

      {doseToConfirm ? (
        <MedicationConfirmDialog
          dose={doseToConfirm}
          onConfirm={() => {
            const nextDose = doseToConfirm;
            setDoseToConfirm(null);
            void confirmDose(nextDose);
          }}
          onCancel={() => setDoseToConfirm(null)}
        />
      ) : null}

      {medicationToDelete ? (
        <DeleteMedicationDialog
          name={medicationToDelete.name}
          isDeleting={isDeleting}
          onConfirm={() => void deleteMedication(medicationToDelete)}
          onCancel={() => setMedicationToDelete(null)}
        />
      ) : null}
    </>
  );
}

function MedicationManageSection({
  medications,
  onDelete,
}: {
  medications: StoredMedication[];
  onDelete: (medication: StoredMedication) => void;
}) {
  return (
    <section className="mt-10 border-t border-border pt-8">
      <h2 className="text-lg font-bold text-[#085041]">Medikamente verwalten</h2>
      <p className="mt-2 text-base text-muted">
        Bearbeiten oder entfernen Sie Ihre Medikamente hier — getrennt von der
        täglichen Bestätigung.
      </p>

      <ul className="mt-4 flex flex-col gap-3">
        {medications.map((medication) => (
          <li
            key={medication.id}
            className="noor-card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0">
              <p className="text-base font-bold text-foreground">
                {medication.name}
              </p>
              <p className="mt-1 text-base text-muted">
                {medication.dosage}
                {medication.dosage ? " · " : ""}
                {formatMedicationSchedule(medication)}
              </p>
            </div>
            <div className="flex shrink-0 gap-2">
              <Link
                href={`/medication/${medication.id}/edit`}
                className="btn-touch rounded-2xl border border-border px-4 py-3 text-base font-semibold text-foreground"
              >
                Bearbeiten
              </Link>
              <button
                type="button"
                onClick={() => onDelete(medication)}
                className="btn-touch rounded-2xl border border-red-200 px-4 py-3 text-base font-semibold text-red-600"
              >
                Löschen
              </button>
            </div>
          </li>
        ))}
      </ul>

      <Link href="/medication/add" className="btn-primary mt-4 min-h-[52px] w-full">
        + Medikament hinzufügen
      </Link>
    </section>
  );
}

function formatMedicationSchedule(medication: StoredMedication) {
  return normalizeMedicationTimes(medication.times)
    .map((entry) => `${timeSlotLabels[entry.slot]} ${entry.time}`)
    .join(", ");
}

function MedicationConfirmDialog({
  dose,
  onConfirm,
  onCancel,
}: {
  dose: DailyDoseSlot;
  onConfirm: () => void;
  onCancel: () => void;
}) {
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
          Haben Sie{" "}
          <span className="font-bold text-foreground">{dose.displayLabel}</span>{" "}
          wirklich eingenommen?
        </p>
        <div className="mt-5 grid grid-cols-1 gap-3">
          <button type="button" onClick={onConfirm} className="btn-primary w-full">
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

function DeleteMedicationDialog({
  name,
  isDeleting,
  onConfirm,
  onCancel,
}: {
  name: string;
  isDeleting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-5"
      role="dialog"
      aria-modal="true"
      aria-labelledby="medication-delete-title"
    >
      <div className="w-full max-w-app rounded-2xl border border-border bg-surface p-5 shadow-[var(--warm-shadow)]">
        <h3 id="medication-delete-title" className="heading-lg">
          Medikament entfernen
        </h3>
        <p className="text-body mt-3 text-muted">
          Möchten Sie <span className="font-bold text-foreground">{name}</span>{" "}
          wirklich entfernen?
        </p>
        <div className="mt-5 grid grid-cols-1 gap-3">
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="min-h-12 rounded-2xl bg-red-600 px-4 py-3 text-base font-semibold text-white disabled:opacity-60"
          >
            {isDeleting ? "Wird entfernt…" : "Löschen"}
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={isDeleting}
            className="btn-touch w-full rounded-2xl border border-border px-4 py-3 text-base font-semibold text-foreground"
          >
            Abbrechen
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
