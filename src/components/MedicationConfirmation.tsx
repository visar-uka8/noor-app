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
import { MedicationPharmacySection } from "@/components/MedicationPharmacySection";
import { MedicationStreakCard } from "@/components/MedicationStreakCard";
import { SlowConnectionNotice } from "@/components/SlowConnectionNotice";
import { useLanguage } from "@/components/LanguageProvider";
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
import {
  formatMedicationScheduleEntry,
} from "@/lib/i18n/medication-labels";
import { getSupabase } from "@/lib/supabase";
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
  const { t } = useLanguage();
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
          : t("med_load_list_failed"),
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
          title={t("med_no_medications")}
          subtitle={t("med_empty_subtitle")}
          actionLabel={t("add_medication")}
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
            <SlowConnectionNotice message={t("common.slowConnection")} />
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
      setSaveError(t("med_confirm_failed"));
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
        t("med_undo_failed"),
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
      setSaveError(t("med_delete_failed"));
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
          actionLabel={t("understood")}
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
          {t("med_tap_instruction")}
        </p>

        {isSaving && isSlow ? (
          <SlowConnectionNotice message={t("common.slowConnection")} />
        ) : null}

        <div
          className="flex flex-col gap-3"
          role="group"
          aria-label={t("med_daily_aria")}
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

        <MedicationPharmacySection />

        {undoTarget ? (
          <section className="noor-card mt-5 p-4" role="status">
            <p className="text-body text-foreground">
              {t("med_dose_confirmed_undo", {
                label: undoTarget.dose.displayLabel,
              })}
            </p>
            <p className="text-body mt-1 text-muted">{t("med_undo_hint")}</p>
            <button
              type="button"
              onClick={() => void undoConfirmation()}
              disabled={isUndoing}
              className="btn-touch mt-4 w-full rounded-2xl border-2 border-warning bg-warning-light px-4 py-3 text-base font-bold text-warning"
            >
              {isUndoing ? t("med_undoing") : t("med_undo")}
            </button>
          </section>
        ) : null}

        {allConfirmed ? (
          <p
            className="text-body mt-6 rounded-2xl bg-primary-light px-5 py-4 text-center font-semibold text-heading"
            role="status"
          >
            {t("med_all_doses_confirmed")}
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
  const { t } = useLanguage();
  const groupedMedications = groupMedicationsForManage(medications, t);

  return (
    <section className="noor-card mt-5 p-5">
      <h2 className="text-lg font-bold text-[#085041]">{t("manage_medications")}</h2>
      <p className="mt-1 text-[13px] text-[#88856F]">
        {t("med_manage_subtitle")}
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
                {t("edit")}
              </Link>
              <button
                type="button"
                onClick={() => onDelete(medication)}
                className="whitespace-nowrap rounded-lg border border-[#A32D2D] bg-transparent px-4 py-1.5 text-[13px] font-semibold text-[#A32D2D]"
              >
                {t("delete")}
              </button>
            </div>
          </li>
        ))}
      </ul>

      <Link href="/medication/add" className="btn-primary mt-4 min-h-[52px] w-full">
        {t("add_medication")}
      </Link>
    </section>
  );
}

function groupMedicationsForManage(
  medications: StoredMedication[],
  t: ReturnType<typeof useLanguage>["t"],
) {
  const groups = new Map<
    string,
    {
      medication: StoredMedication;
      scheduleParts: string[];
    }
  >();

  for (const medication of medications) {
    const key = `${medication.name.trim().toLowerCase()}::${medication.dosage.trim().toLowerCase()}`;
    const schedule = normalizeMedicationTimes(medication.times).map((entry) =>
      formatMedicationScheduleEntry(entry, t),
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
  const { t } = useLanguage();

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
          {t("med_early_title")}
        </div>
        <div
          style={{
            fontSize: "15px",
            color: "#88856F",
            marginBottom: "20px",
            lineHeight: "1.5",
          }}
        >
          {t("med_early_body", { name: medicationName, time: scheduledTime })}
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
            {t("cancel")}
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
            {t("med_confirm_yes")}
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
  const { t } = useLanguage();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-5"
      role="dialog"
      aria-modal="true"
      aria-labelledby="medication-confirm-title"
    >
      <div className="w-full max-w-app rounded-2xl border border-border bg-surface p-5 shadow-[var(--warm-shadow)]">
        <h3 id="medication-confirm-title" className="heading-lg">
          {t("med_taken_title")}
        </h3>
        <p className="text-body mt-3 text-muted">
          {t("med_taken_body", { label: dose.displayLabel })}
        </p>
        <div className="mt-5 grid grid-cols-1 gap-3">
          <button type="button" onClick={onConfirm} className="btn-primary w-full">
            {t("med_taken_yes")}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="btn-touch w-full rounded-2xl border border-border px-4 py-3 text-base font-semibold text-foreground"
          >
            {t("med_taken_not_yet")}
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
  const { t } = useLanguage();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-5"
      role="dialog"
      aria-modal="true"
      aria-labelledby="medication-delete-title"
    >
      <div className="w-full max-w-app rounded-2xl border border-border bg-surface p-5 shadow-[var(--warm-shadow)]">
        <h3 id="medication-delete-title" className="heading-lg">
          {t("med_remove")}
        </h3>
        <p className="text-body mt-3 text-muted">
          {t("med_remove_confirm", { name })}
        </p>
        <div className="mt-5 grid grid-cols-1 gap-3">
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="min-h-12 rounded-2xl bg-red-600 px-4 py-3 text-base font-semibold text-white disabled:opacity-60"
          >
            {isDeleting ? t("med_removing") : t("delete")}
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={isDeleting}
            className="btn-touch w-full rounded-2xl border border-border px-4 py-3 text-base font-semibold text-foreground"
          >
            {t("cancel")}
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
  const { t } = useLanguage();

  if (allConfirmed) {
    return (
      <section
        className="mb-5 rounded-xl border border-[#1D9E75] bg-[#E1F5EE] px-4 py-3 text-[14px] font-semibold text-[#085041]"
        style={{ borderWidth: "0.5px" }}
        aria-live="polite"
      >
        {t("med_status_all_taken")}
      </section>
    );
  }

  const outstandingCount = missedCount + pendingCount;
  if (outstandingCount === 0) {
    return null;
  }

  const message =
    outstandingCount === 1
      ? t("med_outstanding_one")
      : t("med_outstanding_many", { count: outstandingCount });

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
