"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { ErrorBanner } from "@/components/AppStates";
import { useLanguage } from "@/components/LanguageProvider";
import { Toggle } from "@/components/ui/Toggle";
import { filterCommonMedications, getSuggestedDoses } from "@/lib/common-medications";
import { fetchWithTimeout } from "@/lib/fetch-with-timeout";
import { normalizeTimeValue } from "@/lib/medication-schedule";
import {
  defaultTimeSlotValues,
  type MedicationTimeEntry,
  type MedicationTimeSlot,
  type StoredMedication,
} from "@/types/medication";
import { getMedicationTimeSlotLabel } from "@/lib/i18n/medication-labels";

type SlotState = {
  enabled: boolean;
  time: string;
};

type MedicationFormProps = {
  medicationId?: string;
};

const slots: MedicationTimeSlot[] = ["morning", "midday", "evening"];

export function MedicationForm({ medicationId }: MedicationFormProps) {
  const router = useRouter();
  const { t } = useLanguage();
  const [name, setName] = useState("");
  const [dosage, setDosage] = useState("");
  const [slotStates, setSlotStates] = useState<Record<MedicationTimeSlot, SlotState>>({
    morning: { enabled: false, time: defaultTimeSlotValues.morning },
    midday: { enabled: false, time: defaultTimeSlotValues.midday },
    evening: { enabled: false, time: defaultTimeSlotValues.evening },
  });
  const [isLoading, setIsLoading] = useState(Boolean(medicationId));
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [knownMedication, setKnownMedication] = useState<string | null>(null);
  const nameFieldRef = useRef<HTMLDivElement>(null);

  const trimmedName = name.trim();
  const nameSuggestions = useMemo(
    () => filterCommonMedications(name),
    [name],
  );
  const suggestedDoses = useMemo(
    () => (knownMedication ? getSuggestedDoses(knownMedication) : []),
    [knownMedication],
  );
  const showNameDropdown = showSuggestions && trimmedName.length > 0;

  const savePreview = useMemo(
    () => buildMedicationSavePreview(name, dosage, slotStates, t),
    [name, dosage, slotStates, t],
  );

  useEffect(() => {
    if (!showSuggestions) return;

    function handlePointerDown(event: MouseEvent) {
      if (!nameFieldRef.current?.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [showSuggestions]);

  useEffect(() => {
    if (!medicationId) return;

    async function loadMedication() {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetchWithTimeout(`/api/medications/${medicationId}`);

        if (!response.ok) {
          throw new Error(t("med_load_failed"));
        }

        const data = (await response.json()) as { medication: StoredMedication };
        setName(data.medication.name);
        setDosage(data.medication.dosage);
        setKnownMedication(
          getSuggestedDoses(data.medication.name).length > 0
            ? data.medication.name.trim()
            : null,
        );
        setSlotStates(createSlotStatesFromMedication(data.medication.times));
      } catch {
        setError(t("med_load_failed_retry"));
      } finally {
        setIsLoading(false);
      }
    }

    void loadMedication();
  }, [medicationId]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const times = buildTimesFromSlotStates(slotStates);

    if (times.length === 0) {
      setError(t("med_select_time"));
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetchWithTimeout(
        medicationId ? `/api/medications/${medicationId}` : "/api/medications",
        {
          method: medicationId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ name, dosage, times }),
        },
      );

      const responseBody = (await response.json()) as {
        error?: string;
        code?: string;
        details?: string;
        hint?: string;
      };

      console.log("Medication save response status:", response.status);
      console.log("Medication save response body:", responseBody);

      if (!response.ok) {
        throw new Error(responseBody.error ?? "Speichern fehlgeschlagen.");
      }

      router.push("/medication");
      router.refresh();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : t("med_save_failed"),
      );
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <main className="mx-auto w-full max-w-app flex-1 px-5 py-6">
        <p className="text-body text-muted">{t("med_loading")}</p>
      </main>
    );
  }

  return (
    <>
      {error ? (
        <ErrorBanner
          message={error}
          actionLabel={t("understood")}
          onAction={() => setError(null)}
          onDismiss={() => setError(null)}
        />
      ) : null}

      <main className="mx-auto w-full max-w-app flex-1 px-5 py-6">
        <form onSubmit={(event) => void handleSubmit(event)} className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <label htmlFor="medication-name" className="text-base font-bold text-foreground">
              {t("medication_name")}
            </label>
            <div ref={nameFieldRef} className="relative">
              <input
                id="medication-name"
                type="text"
                required
                value={name}
                onChange={(event) => {
                  const nextName = event.target.value;
                  setName(nextName);
                  setKnownMedication((current) =>
                    current && nextName.trim() === current ? current : null,
                  );
                  setShowSuggestions(nextName.trim().length > 0);
                }}
                onFocus={() => {
                  if (trimmedName.length > 0) {
                    setShowSuggestions(true);
                  }
                }}
                placeholder={t("med_name_placeholder")}
                autoComplete="off"
                className={`min-h-12 w-full border border-border bg-surface px-4 text-base text-foreground ${
                  showNameDropdown
                    ? "rounded-t-2xl rounded-b-none border-b-0"
                    : "rounded-2xl"
                }`}
              />

              {showNameDropdown ? (
                <div
                  className="absolute left-0 right-0 top-full z-[100] max-h-[200px] overflow-y-auto rounded-b-xl border border-t-0 border-[#E4E2DB] bg-white shadow-[0_4px_12px_rgba(0,0,0,0.08)]"
                  style={{ borderWidth: "0.5px" }}
                  role="listbox"
                  aria-label={t("med_suggestions_aria")}
                >
                  {nameSuggestions.map((medication) => (
                    <button
                      key={medication}
                      type="button"
                      role="option"
                      onClick={() => {
                        setName(medication);
                        setKnownMedication(
                          getSuggestedDoses(medication).length > 0
                            ? medication
                            : null,
                        );
                        setShowSuggestions(false);
                      }}
                      className="flex min-h-12 w-full items-center border-b border-[#F0EFE9] px-4 text-left text-[15px] text-[#1E1D1B] transition-colors hover:bg-[#F7F6F2]"
                      style={{ borderBottomWidth: "0.5px" }}
                    >
                      {medication}
                    </button>
                  ))}

                  <button
                    type="button"
                    onClick={() => {
                      setName(trimmedName);
                      setKnownMedication(null);
                      setShowSuggestions(false);
                    }}
                    className="sticky bottom-0 flex min-h-12 w-full items-center bg-[#F7F6F2] px-4 text-left text-sm font-semibold text-primary"
                  >
                    + &quot;{trimmedName}&quot; hinzufügen
                  </button>
                </div>
              ) : null}
            </div>
          </div>

          <label className="flex flex-col gap-2">
            <span className="text-base font-bold text-foreground">{t("dosage")}</span>
            <input
              type="text"
              required
              value={dosage}
              onChange={(event) => setDosage(event.target.value)}
              placeholder={t("med_dosage_placeholder")}
              className="min-h-12 rounded-2xl border border-border bg-surface px-4 text-base text-foreground"
            />
            {suggestedDoses.length > 0 ? (
              <div className="mt-2 flex flex-wrap gap-2">
                {suggestedDoses.map((dose) => {
                  const selected = dosage === dose;

                  return (
                    <button
                      key={dose}
                      type="button"
                      onClick={() => setDosage(dose)}
                      className={`rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition-colors ${
                        selected
                          ? "border-primary bg-primary text-white"
                          : "border-primary bg-transparent text-primary"
                      }`}
                      style={{ borderWidth: "1px" }}
                    >
                      {dose}
                    </button>
                  );
                })}
              </div>
            ) : null}
          </label>

          <section>
            <h2 className="text-base font-bold text-foreground">
              {t("when_take")}
            </h2>

            <div className="mt-4 flex flex-col gap-3">
              {slots.map((slot) => (
                <div key={slot} className="noor-card p-4">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-base font-semibold text-foreground">
                      {getMedicationTimeSlotLabel(slot, t)}
                    </span>
                    <Toggle
                      checked={slotStates[slot].enabled}
                      onChange={(checked) =>
                        setSlotStates((current) => ({
                          ...current,
                          [slot]: { ...current[slot], enabled: checked },
                        }))
                      }
                      label={getMedicationTimeSlotLabel(slot, t)}
                    />
                  </div>

                  {slotStates[slot].enabled ? (
                    <label className="mt-4 flex flex-col gap-2">
                      <span className="text-sm font-semibold text-muted">
                        {t("med_time_label")}
                      </span>
                      <input
                        type="time"
                        value={slotStates[slot].time}
                        onChange={(event) =>
                          setSlotStates((current) => ({
                            ...current,
                            [slot]: {
                              ...current[slot],
                              time: normalizeTimeValue(event.target.value),
                            },
                          }))
                        }
                        className="w-full rounded-xl border border-[#E4E2DB] bg-[#F7F6F2] px-4 py-3 text-base font-medium text-[#085041] outline-none"
                        style={{ borderWidth: "0.5px" }}
                      />
                    </label>
                  ) : null}
                </div>
              ))}
            </div>
          </section>

          {savePreview ? (
            <p
              className="rounded-xl bg-[#E1F5EE] px-4 py-3 text-sm text-[#085041]"
              role="status"
              aria-live="polite"
            >
              {savePreview}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={isSaving}
            className="btn-primary min-h-[52px] w-full"
          >
            {isSaving ? t("med_saving") : t("save_medication")}
          </button>
        </form>
      </main>
    </>
  );
}

function createSlotStatesFromMedication(times: MedicationTimeEntry[]) {
  const next: Record<MedicationTimeSlot, SlotState> = {
    morning: { enabled: false, time: defaultTimeSlotValues.morning },
    midday: { enabled: false, time: defaultTimeSlotValues.midday },
    evening: { enabled: false, time: defaultTimeSlotValues.evening },
  };

  for (const entry of times) {
    next[entry.slot] = {
      enabled: true,
      time: normalizeTimeValue(entry.time),
    };
  }

  return next;
}

function buildMedicationSavePreview(
  name: string,
  dosage: string,
  slotStates: Record<MedicationTimeSlot, SlotState>,
  t: ReturnType<typeof useLanguage>["t"],
) {
  const trimmedName = name.trim();
  const trimmedDosage = dosage.trim();

  if (!trimmedName || !trimmedDosage) {
    return null;
  }

  const scheduleParts = slots
    .filter((slot) => slotStates[slot].enabled)
    .map(
      (slot) =>
        `${getMedicationTimeSlotLabel(slot, t)} ${slotStates[slot].time}`,
    );

  const parts = [trimmedName, trimmedDosage];

  if (scheduleParts.length > 0) {
    parts.push(scheduleParts.join(", "));
  }

  return parts.join(" · ");
}

function buildTimesFromSlotStates(
  slotStates: Record<MedicationTimeSlot, SlotState>,
) {
  return slots
    .filter((slot) => slotStates[slot].enabled)
    .map((slot) => ({
      slot,
      time: normalizeTimeValue(slotStates[slot].time),
    }));
}
