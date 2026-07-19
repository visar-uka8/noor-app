"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  ConnectionErrorState,
  ErrorBanner,
  FeatureEmptyState,
  PageSkeleton,
} from "@/components/AppStates";
import {
  GroupedDoseRow,
  MedicationGroupCard,
} from "@/components/MedicationGroupCard";
import { MedicationConfirmationPreview } from "@/components/MedicationConfirmationPreview";
import { MedicationStreakCard } from "@/components/MedicationStreakCard";
import { SlowConnectionNotice } from "@/components/SlowConnectionNotice";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { useSlowConnection } from "@/hooks/useSlowConnection";
import { fetchWithTimeout } from "@/lib/fetch-with-timeout";
import {
  confirmationMatchesDose,
  expandMedicationsToDailyDoses,
  findConfirmationForDose,
  formatMedicationConfirmationName,
  getDoseVisualState,
  isDoseMoreThanTwoHoursEarly,
  normalizeMedicationTimes,
} from "@/lib/medication-schedule";
import { getSupabase } from "@/lib/supabase";
import { timeSlotLabels } from "@/types/medication";
import type {
  DailyDoseSlot,
  StoredConfirmation,
  StoredMedication,
} from "@/types/medication";

const UNDO_WINDOW_MS = 5_000;

export function MedicationConfirmation({
  previewMode = false,
}: { previewMode?: boolean } = {}) {
  if (previewMode) {
    return <MedicationConfirmationPreview />;
  }

  return <MedicationConfirmationConnected />;
}

function MedicationConfirmationConnected() {
  const router = useRouter();
  const isOnline = useOnlineStatus();
  const [medications, setMedications] = useState<StoredMedication[]>([]);
  const [confirmations, setConfirmations] = useState<StoredConfirmation[]>([]);
  const [streak, setStreak] = useState(0);
  const [pendingDoseIds, setPendingDoseIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoadError, setHasLoadError] = useState(false);
  const [loadErrorDetail, setLoadErrorDetail] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [doseToConfirm, setDoseToConfirm] = useState<DailyDoseSlot | null>(null);
  const [earlyConfirmDialog, setEarlyConfirmDialog] = useState<{
    dose: DailyDoseSlot;
    medicationName: string;
    scheduledTime: string;
  } | null>(null);
  const [medicationToDelete, setMedicationToDelete] =
    useState<StoredMedication | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [undoTarget, setUndoTarget] = useState<{
    dose: DailyDoseSlot;
    expiresAt: number;
  } | null>(null);
  const [isUndoing, setIsUndoing] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const isSlow = useSlowConnection(isLoading || pendingDoseIds.size > 0);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

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
      if (confirmedDoseIds.has(dose.id)) continue;

      if (
        getDoseVisualState(dose.time, { now }) === "missed"
      ) {
        missed.add(dose.id);
      }
    }

    return missed;
  }, [doses, confirmedDoseIds, now]);

  const doseVisualStates = useMemo(() => {
    const states = new Map<string, ReturnType<typeof getDoseVisualState>>();

    for (const dose of doses) {
      states.set(
        dose.id,
        getDoseVisualState(dose.time, {
          confirmed: confirmedDoseIds.has(dose.id),
          now,
        }),
      );
    }

    return states;
  }, [doses, confirmedDoseIds, now]);

  const groupedMedications = useMemo(() => {
    const groups = new Map<
      string,
      {
        key: string;
        name: string;
        dosage: string;
        doses: GroupedDoseRow[];
      }
    >();

    for (const dose of doses) {
      const key = dose.medicationId;
      const group = groups.get(key) ?? {
        key,
        name: dose.name,
        dosage: dose.dosage,
        doses: [],
      };

      group.doses.push({
        dose,
        visualState: doseVisualStates.get(dose.id) ?? "upcoming",
        confirmedAt: findConfirmationForDose(confirmations, dose)?.confirmed_at,
        pending: pendingDoseIds.has(dose.id),
      });

      groups.set(key, group);
    }

    return Array.from(groups.values()).map((group) => ({
      ...group,
      doses: group.doses.sort((left, right) =>
        left.dose.time.localeCompare(right.dose.time),
      ),
    }));
  }, [doses, doseVisualStates, confirmations, pendingDoseIds]);

  const pendingCount = useMemo(() => {
    let count = 0;

    for (const dose of doses) {
      const state = doseVisualStates.get(dose.id);
      if (state === "due" || state === "upcoming") count += 1;
    }

    return count;
  }, [doses, doseVisualStates]);

  async function loadMedicationData() {
    setIsLoading(true);
    setHasLoadError(false);
    setLoadErrorDetail(null);

    try {
      const [medicationsResponse, confirmationsResponse] = await Promise.all([
        fetchWithTimeout("/api/medications", { credentials: "include" }),
        fetchWithTimeout("/api/medication-confirmations", { credentials: "include" }),
      ]);

      if (!medicationsResponse.ok || !confirmationsResponse.ok) {
        const medicationsBody = medicationsResponse.ok
          ? null
          : await medicationsResponse.text();
        const confirmationsBody = confirmationsResponse.ok
          ? null
          : await confirmationsResponse.text();
        throw new Error(
          `Medication data failed (medications: ${medicationsResponse.status}${medicationsBody ? ` — ${medicationsBody}` : ""}, confirmations: ${confirmationsResponse.status}${confirmationsBody ? ` — ${confirmationsBody}` : ""})`,
        );
      }

      const medicationsData = (await medicationsResponse.json()) as {
        medications?: StoredMedication[];
      };
      const confirmationsData = (await confirmationsResponse.json()) as {
        confirmations?: StoredConfirmation[];
        streak?: number;
      };

      setMedications(medicationsData?.medications ?? []);
      setConfirmations(confirmationsData?.confirmations ?? []);
      setStreak(
        typeof confirmationsData?.streak === "number"
          ? confirmationsData.streak
          : 0,
      );
    } catch (error) {
      console.error("Medications fetch error:", error);
      setHasLoadError(true);
      setMedications([]);
      setConfirmations([]);
      setStreak(0);
      setLoadErrorDetail(
        error instanceof Error
          ? error.message
          : "Medikamente konnten nicht geladen werden.",
      );
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
        {loadErrorDetail ? (
          <p
            className="mt-4 rounded-2xl border border-danger/20 bg-danger-light px-4 py-3 text-sm text-danger"
            role="alert"
          >
            {loadErrorDetail}
          </p>
        ) : null}
      </main>
    );
  }

  async function refreshStreak() {
    try {
      const response = await fetchWithTimeout("/api/medication-confirmations", {
        credentials: "include",
      });
      if (!response.ok) return;
      const data = (await response.json()) as { streak?: number };
      if (typeof data.streak === "number") {
        setStreak(data.streak);
      }
    } catch (error) {
      console.error("Streak refresh failed:", error);
    }
  }

  async function confirmDose(dose: DailyDoseSlot) {
    console.log("Confirming:", dose.medicationId, dose.scheduledAt, dose.slot, dose.time);

    if (!dose?.medicationId) {
      console.error("No medication ID available to confirm");
      setSaveError("Bestätigung fehlgeschlagen: Medikament-ID fehlt.");
      return;
    }

    if (confirmedDoseIds.has(dose.id) || pendingDoseIds.has(dose.id)) {
      console.log("Confirm skipped — already confirmed or pending", dose.id);
      return;
    }

    setSaveError(null);
    setPendingDoseIds((current) => new Set(current).add(dose.id));

    const optimisticConfirmedAt = new Date().toISOString();
    const optimisticConfirmation: StoredConfirmation = {
      id: `optimistic-${dose.id}`,
      medication_id: dose.medicationId,
      dose_time: dose.slot,
      medication_name: formatMedicationConfirmationName(dose.name, dose.dosage),
      scheduled_at: dose.scheduledAt,
      confirmed_at: optimisticConfirmedAt,
      missed: doseVisualStates.get(dose.id) === "missed",
    };

    // Optimistic UI so the loader isn't stuck if the network is slow.
    setConfirmations((current) => [
      ...current.filter((confirmation) => !confirmationMatchesDose(confirmation, dose)),
      optimisticConfirmation,
    ]);

    try {
      const supabase = getSupabase();
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      console.log("User confirming:", user?.id);
      if (userError) console.log("User confirm auth error:", userError.message);

      const {
        data: { session },
      } = await supabase.auth.getSession();

      const headers: HeadersInit = {
        "Content-Type": "application/json",
      };
      if (session?.access_token) {
        headers.Authorization = `Bearer ${session.access_token}`;
      }

      const response = await fetchWithTimeout("/api/medication-confirmations", {
        method: "POST",
        headers,
        credentials: "include",
        timeoutMs: 20_000,
        body: JSON.stringify({
          medication_id: dose.medicationId,
          dose_time: dose.slot,
          scheduled_time: dose.time,
        }),
      });

      const data = (await response.json().catch(() => null)) as
        | { confirmation?: StoredConfirmation; error?: string }
        | null;

      console.log("Confirmation insert:", data, response.status);

      if (!response.ok || !data?.confirmation?.confirmed_at) {
        throw new Error(
          data?.error ?? `Bestätigung fehlgeschlagen (${response.status})`,
        );
      }

      const savedConfirmation: StoredConfirmation = {
        id: data.confirmation.id,
        medication_id: data.confirmation.medication_id ?? dose.medicationId,
        dose_time: data.confirmation.dose_time ?? dose.slot,
        medication_name:
          data.confirmation.medication_name ||
          formatMedicationConfirmationName(dose.name, dose.dosage),
        scheduled_at: data.confirmation.scheduled_at || dose.scheduledAt,
        confirmed_at: data.confirmation.confirmed_at,
        missed: Boolean(data.confirmation.missed),
      };

      setConfirmations((current) => [
        ...current.filter((confirmation) => !confirmationMatchesDose(confirmation, dose)),
        savedConfirmation,
      ]);
      setUndoTarget({
        dose,
        expiresAt: Date.now() + UNDO_WINDOW_MS,
      });
      void refreshStreak();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unbekannter Fehler";
      console.error("Confirm failed:", message, error);
      setConfirmations((current) =>
        current.filter((confirmation) => confirmation.id !== optimisticConfirmation.id),
      );
      setSaveError(`Bestätigung fehlgeschlagen: ${message}`);
    } finally {
      setPendingDoseIds((current) => {
        const next = new Set(current);
        next.delete(dose.id);
        return next;
      });
    }
  }

  function handleConfirmTap(dose: DailyDoseSlot) {
    console.log("Confirm tapped");
    console.log("Dose ID:", dose.id);
    console.log("Medication ID:", dose.medicationId);

    if (!dose.id && !dose.medicationId) {
      console.error("No ID available to confirm");
      return;
    }

    if (confirmedDoseIds.has(dose.id) || pendingDoseIds.has(dose.id)) return;

    const visualState = doseVisualStates.get(dose.id) ?? "upcoming";

    if (visualState === "missed") {
      void confirmDose(dose);
      return;
    }

    if (isDoseMoreThanTwoHoursEarly(dose.time, now)) {
      setEarlyConfirmDialog({
        dose,
        medicationName: dose.name,
        scheduledTime: dose.time,
      });
      return;
    }

    setDoseToConfirm(dose);
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
          confirmationMatchesDose(confirmation, undoTarget.dose)
            ? { ...confirmation, confirmed_at: null, missed: confirmation.missed }
            : confirmation,
        ),
      );
      setUndoTarget(null);
      await loadMedicationData();
      void refreshStreak();
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
          missedCount={missedDoseIds.size}
          pendingCount={pendingCount}
        />

        <MedicationStreakCard streak={streak} variant="medication" />

        <p className="instruction-text mb-6 text-[#555555]">
          Tippen Sie wenn Sie Ihr Medikament genommen haben 💚
        </p>

        {isSaving && isSlow ? (
          <SlowConnectionNotice message="Wird gespeichert — bei langsamem Internet kann das einen Moment dauern." />
        ) : null}

        <div
          className="flex flex-col gap-3"
          role="group"
          aria-label="Tägliche Medikamenteneinnahme"
        >
          {groupedMedications.map((group) => (
            <MedicationGroupCard
              key={group.key}
              name={group.name}
              dosage={group.dosage}
              doses={group.doses}
              onConfirm={handleConfirmTap}
            />
          ))}
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

      {earlyConfirmDialog ? (
        <EarlyConfirmDialog
          medicationName={earlyConfirmDialog.medicationName}
          scheduledTime={earlyConfirmDialog.scheduledTime}
          onConfirm={() => {
            const dose = earlyConfirmDialog.dose;
            setEarlyConfirmDialog(null);
            void confirmDose(dose);
          }}
          onCancel={() => setEarlyConfirmDialog(null)}
        />
      ) : null}

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
  const groupedMedications = groupMedicationsForManage(medications);

  return (
    <>
      <div
        className="h-px bg-[#E4E2DB]"
        style={{ margin: "24px 0 20px 0" }}
        aria-hidden="true"
      />

      <section>
        <h2 className="text-lg font-bold text-[#085041]">Medikamente verwalten</h2>
        <p className="mt-1 text-[13px] text-[#88856F]">
          Bearbeiten oder entfernen Sie Ihre Medikamente
        </p>

      <ul className="mt-4 flex flex-col gap-3">
        {groupedMedications.map(({ medication, scheduleLabel }) => (
          <li
            key={medication.id}
            className="flex items-center justify-between rounded-xl border border-[#E4E2DB] bg-white px-4 py-3.5"
            style={{ borderWidth: "0.5px" }}
          >
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-semibold text-[#085041]">
                {medication.name}
              </p>
              {medication.dosage ? (
                <p className="mt-0.5 text-[13px] text-[#88856F]">
                  {medication.dosage}
                </p>
              ) : null}
              <p className="mt-0.5 text-[12px] text-[#AAA79A]">
                {scheduleLabel}
              </p>
            </div>
            <div className="ml-3 flex shrink-0 flex-col gap-1.5">
              <Link
                href={`/medication/${medication.id}/edit`}
                className="whitespace-nowrap rounded-lg border border-[#1D9E75] bg-transparent px-4 py-1.5 text-center text-[13px] font-semibold text-[#1D9E75]"
              >
                Bearbeiten
              </Link>
              <button
                type="button"
                onClick={() => onDelete(medication)}
                className="whitespace-nowrap rounded-lg border border-[#A32D2D] bg-transparent px-4 py-1.5 text-[13px] font-semibold text-[#A32D2D]"
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
    </>
  );
}

function formatMedicationSchedule(medication: StoredMedication) {
  return normalizeMedicationTimes(medication?.times)
    .map((entry) => `${timeSlotLabels[entry.slot]} ${entry.time}`)
    .join(" · ");
}

function groupMedicationsForManage(medications: StoredMedication[]) {
  const groups = new Map<
    string,
    {
      medication: StoredMedication;
      scheduleParts: string[];
    }
  >();

  for (const medication of medications) {
    const key = `${medication.name.trim().toLowerCase()}::${medication.dosage.trim().toLowerCase()}`;
    const schedule = normalizeMedicationTimes(medication.times).map(
      (entry) => `${timeSlotLabels[entry.slot]} ${entry.time}`,
    );
    const existing = groups.get(key);

    if (!existing) {
      groups.set(key, { medication, scheduleParts: schedule });
      continue;
    }

    existing.scheduleParts.push(...schedule);
    existing.scheduleParts.sort((left, right) => {
      const leftTime = left.split(" ").pop() ?? "";
      const rightTime = right.split(" ").pop() ?? "";
      return leftTime.localeCompare(rightTime);
    });
  }

  return Array.from(groups.values()).map(({ medication, scheduleParts }) => ({
    medication,
    scheduleLabel: [...new Set(scheduleParts)].join(" · "),
  }));
}

function EarlyConfirmDialog({
  medicationName,
  scheduledTime,
  onConfirm,
  onCancel,
}: {
  medicationName: string;
  scheduledTime: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0,0,0,0.4)",
        zIndex: 100,
        display: "flex",
        alignItems: "flex-end",
        padding: "16px",
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="early-confirm-title"
      onClick={onCancel}
    >
      <div
        style={{
          backgroundColor: "#FFFFFF",
          borderRadius: "20px",
          padding: "24px",
          width: "100%",
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <div style={{ fontSize: "20px", marginBottom: "8px" }}>⏰</div>
        <div
          id="early-confirm-title"
          style={{
            fontSize: "17px",
            fontWeight: "600",
            color: "#085041",
            marginBottom: "8px",
          }}
        >
          Zu früh?
        </div>
        <div
          style={{
            fontSize: "15px",
            color: "#88856F",
            marginBottom: "20px",
            lineHeight: "1.5",
          }}
        >
          {medicationName} ist erst um {scheduledTime} Uhr geplant. Möchten Sie
          es trotzdem jetzt bestätigen?
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <button
            type="button"
            onClick={onCancel}
            style={{
              flex: 1,
              padding: "14px",
              borderRadius: "12px",
              border: "0.5px solid #E4E2DB",
              backgroundColor: "#F7F6F2",
              fontSize: "15px",
              fontWeight: "500",
              color: "#88856F",
              cursor: "pointer",
            }}
          >
            Abbrechen
          </button>
          <button
            type="button"
            onClick={onConfirm}
            style={{
              flex: 1,
              padding: "14px",
              borderRadius: "12px",
              border: "none",
              backgroundColor: "#1D9E75",
              fontSize: "15px",
              fontWeight: "600",
              color: "#FFFFFF",
              cursor: "pointer",
            }}
          >
            Ja, bestätigen
          </button>
        </div>
      </div>
    </div>
  );
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
  missedCount,
  pendingCount,
}: {
  allConfirmed: boolean;
  missedCount: number;
  pendingCount: number;
}) {
  if (allConfirmed) {
    return (
      <section
        className="mb-5 rounded-xl border border-[#1D9E75] bg-[#E1F5EE] px-4 py-3 text-[14px] font-semibold text-[#085041]"
        style={{ borderWidth: "0.5px" }}
        aria-live="polite"
      >
        Alle Medikamente heute genommen ✓
      </section>
    );
  }

  const outstandingCount = missedCount + pendingCount;
  if (outstandingCount === 0) {
    return null;
  }

  const message =
    outstandingCount === 1
      ? "Noch 1 Dosis ausstehend"
      : `Noch ${outstandingCount} Dosen ausstehend`;

  return (
    <section
      className="mb-5 rounded-xl border border-[#BA7517] bg-[#FAEEDA] px-4 py-3 text-[14px] font-semibold text-[#633806]"
      style={{ borderWidth: "0.5px" }}
      aria-live="polite"
    >
      {message}
    </section>
  );
}
