"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { ErrorBanner } from "@/components/AppStates";
import {
  InsulinMedicationSetup,
  type InsulinSetupValue,
} from "@/components/InsulinMedicationSetup";
import { InsulinHistorySection } from "@/components/InsulinHistorySection";
import { useLanguage } from "@/components/LanguageProvider";
import { Toggle } from "@/components/ui/Toggle";
import { filterCommonMedications, getSuggestedDoses } from "@/lib/common-medications";
import { fetchWithTimeout } from "@/lib/fetch-with-timeout";
import { isInsulinMedicationName, parseBasalDosageUnits } from "@/lib/insulin-medications";
import { normalizeTimeValue } from "@/lib/medication-schedule";
import {
  customSlotFromIndex,
  defaultTimeSlotValues,
  isCustomMedicationTimeSlot,
  isStandardMedicationTimeSlot,
  STANDARD_MEDICATION_TIME_SLOTS,
  type MedicationTimeEntry,
  type StandardMedicationTimeSlot,
  type StoredMedication,
} from "@/types/medication";
import {
  formatMedicationScheduleEntry,
  getMedicationTimeSlotLabel,
} from "@/lib/i18n/medication-labels";

type SlotState = {
  enabled: boolean;
  time: string;
};

type MedicationFormProps = {
  medicationId?: string;
};

const MAX_CUSTOM_TIMES = 6;

export function MedicationForm({ medicationId }: MedicationFormProps) {
  const router = useRouter();
  const { t } = useLanguage();
  const [name, setName] = useState("");
  const [dosage, setDosage] = useState("");
  const [slotStates, setSlotStates] = useState<
    Record<StandardMedicationTimeSlot, SlotState>
  >({
    morning: { enabled: false, time: defaultTimeSlotValues.morning },
    midday: { enabled: false, time: defaultTimeSlotValues.midday },
    evening: { enabled: false, time: defaultTimeSlotValues.evening },
    night: { enabled: false, time: defaultTimeSlotValues.night },
  });
  const [customTimes, setCustomTimes] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(Boolean(medicationId));
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [knownMedication, setKnownMedication] = useState<string | null>(null);
  const [loadedMedication, setLoadedMedication] = useState<StoredMedication | null>(
    null,
  );
  const [insulinSetup, setInsulinSetup] = useState<InsulinSetupValue | null>(
    null,
  );
  const nameFieldRef = useRef<HTMLDivElement>(null);

  const trimmedName = name.trim();
  const isInsulinMode =
    loadedMedication?.is_insulin === true ||
    isInsulinMedicationName(trimmedName);
  const nameSuggestions = useMemo(
    () => filterCommonMedications(name),
    [name],
  );
  const suggestedDoses = useMemo(
    () => (knownMedication ? getSuggestedDoses(knownMedication) : []),
    [knownMedication],
  );
  const showNameDropdown = showSuggestions && trimmedName.length > 0;

  const savePreview = useMemo(() => {
    if (isInsulinMode && insulinSetup) {
      const schedule = insulinSetup.times
        .map((entry) => formatMedicationScheduleEntry(entry, t))
        .join(", ");
      return [trimmedName, insulinSetup.dosage, schedule].filter(Boolean).join(" · ");
    }

    return buildMedicationSavePreview(name, dosage, slotStates, customTimes, t);
  }, [
    isInsulinMode,
    insulinSetup,
    name,
    dosage,
    slotStates,
    customTimes,
    t,
    trimmedName,
  ]);

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
        setLoadedMedication(data.medication);
        setName(data.medication.name);
        setDosage(data.medication.dosage);
        setKnownMedication(
          getSuggestedDoses(data.medication.name).length > 0
            ? data.medication.name.trim()
            : null,
        );

        const formState = createFormStateFromMedication(data.medication.times);
        setSlotStates(formState.slotStates);
        setCustomTimes(formState.customTimes);
      } catch {
        setError(t("med_load_failed_retry"));
      } finally {
        setIsLoading(false);
      }
    }

    void loadMedication();
  }, [medicationId, t]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    let payload: Record<string, unknown>;

    if (isInsulinMode) {
      if (!insulinSetup || insulinSetup.times.length === 0) {
        setError(t("med_select_time"));
        return;
      }

      if (
        insulinSetup.insulinType === "basal" &&
        !parseBasalDosageUnits(insulinSetup.dosage)
      ) {
        setError(t("insulin_basal_units_required"));
        return;
      }

      payload = {
        name,
        dosage: insulinSetup.dosage,
        times: insulinSetup.times,
        is_insulin: true,
        insulin_type: insulinSetup.insulinType,
      };
    } else {
      const times = buildTimesFromSlotStates(slotStates, customTimes, t);

      if (times.length === 0) {
        setError(t("med_select_time"));
        return;
      }

      payload = { name, dosage, times, is_insulin: false, insulin_type: null };
    }

    setIsSaving(true);

    try {
      const response = await fetchWithTimeout(
        medicationId ? `/api/medications/${medicationId}` : "/api/medications",
        {
          method: medicationId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(payload),
        },
      );

      const responseBody = (await response.json()) as {
        error?: string;
        code?: string;
        details?: string;
        hint?: string;
      };

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

  function addCustomTime() {
    if (customTimes.length >= MAX_CUSTOM_TIMES) return;
    setCustomTimes((current) => [...current, defaultTimeSlotValues.morning]);
  }

  function updateCustomTime(index: number, time: string) {
    setCustomTimes((current) =>
      current.map((entry, entryIndex) =>
        entryIndex === index ? normalizeTimeValue(time) : entry,
      ),
    );
  }

  function removeCustomTime(index: number) {
    setCustomTimes((current) =>
      current.filter((_, entryIndex) => entryIndex !== index),
    );
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

          {!isInsulinMode ? (
            <>
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
              {STANDARD_MEDICATION_TIME_SLOTS.map((slot) => (
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

              {customTimes.map((time, index) => (
                <div key={`custom-${index}`} className="noor-card p-4">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-base font-semibold text-foreground">
                      {t("med_custom_dose", { n: index + 1 })}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeCustomTime(index)}
                      className="flex h-10 w-10 items-center justify-center rounded-full text-[#BA7517] transition-colors hover:bg-[#FAEEDA]"
                      aria-label={t("med_remove_custom_time", { n: index + 1 })}
                    >
                      <Trash2 size={18} strokeWidth={2} />
                    </button>
                  </div>

                  <label className="mt-4 flex flex-col gap-2">
                    <span className="text-sm font-semibold text-muted">
                      {t("med_time_label")}
                    </span>
                    <input
                      type="time"
                      value={time}
                      onChange={(event) =>
                        updateCustomTime(index, event.target.value)
                      }
                      className="w-full rounded-xl border border-[#E4E2DB] bg-[#F7F6F2] px-4 py-3 text-base font-medium text-[#085041] outline-none"
                      style={{ borderWidth: "0.5px" }}
                    />
                  </label>
                </div>
              ))}

              {customTimes.length < MAX_CUSTOM_TIMES ? (
                <button
                  type="button"
                  onClick={addCustomTime}
                  className="mt-2 flex w-full cursor-pointer items-center justify-between rounded-xl bg-[#F7F6F2] px-4 py-3.5 text-left transition-colors hover:bg-[#F0EFE9]"
                >
                  <span className="text-[15px] font-medium text-[#085041]">
                    {t("med_add_custom_time")}
                  </span>
                  <span className="text-[#1D9E75]">→</span>
                </button>
              ) : null}
            </div>
          </section>
            </>
          ) : (
            <InsulinMedicationSetup
              medicationName={trimmedName}
              initialMedication={loadedMedication}
              onValuesChange={setInsulinSetup}
            />
          )}

          {loadedMedication?.is_insulin && medicationId ? (
            <InsulinHistorySection medicationId={medicationId} />
          ) : null}

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

function createDefaultSlotStates(): Record<
  StandardMedicationTimeSlot,
  SlotState
> {
  return {
    morning: { enabled: false, time: defaultTimeSlotValues.morning },
    midday: { enabled: false, time: defaultTimeSlotValues.midday },
    evening: { enabled: false, time: defaultTimeSlotValues.evening },
    night: { enabled: false, time: defaultTimeSlotValues.night },
  };
}

function createFormStateFromMedication(times: MedicationTimeEntry[]) {
  const slotStates = createDefaultSlotStates();
  const customTimes: string[] = [];

  for (const entry of times) {
    if (isStandardMedicationTimeSlot(entry.slot)) {
      slotStates[entry.slot] = {
        enabled: true,
        time: normalizeTimeValue(entry.time),
      };
      continue;
    }

    if (isCustomMedicationTimeSlot(entry.slot)) {
      customTimes.push(normalizeTimeValue(entry.time));
    }
  }

  return { slotStates, customTimes };
}

function buildMedicationSavePreview(
  name: string,
  dosage: string,
  slotStates: Record<StandardMedicationTimeSlot, SlotState>,
  customTimes: string[],
  t: ReturnType<typeof useLanguage>["t"],
) {
  const trimmedName = name.trim();
  const trimmedDosage = dosage.trim();

  if (!trimmedName || !trimmedDosage) {
    return null;
  }

  const times = buildTimesFromSlotStates(slotStates, customTimes, t);
  const scheduleParts = times.map((entry) => formatMedicationScheduleEntry(entry, t));
  const parts = [trimmedName, trimmedDosage];

  if (scheduleParts.length > 0) {
    parts.push(scheduleParts.join(", "));
  }

  return parts.join(" · ");
}

function buildTimesFromSlotStates(
  slotStates: Record<StandardMedicationTimeSlot, SlotState>,
  customTimes: string[],
  t: ReturnType<typeof useLanguage>["t"],
): MedicationTimeEntry[] {
  const times: MedicationTimeEntry[] = [];

  for (const slot of STANDARD_MEDICATION_TIME_SLOTS) {
    if (slotStates[slot].enabled) {
      times.push({
        slot,
        time: normalizeTimeValue(slotStates[slot].time),
        label: getMedicationTimeSlotLabel(slot, t),
      });
    }
  }

  customTimes.forEach((time, index) => {
    times.push({
      slot: customSlotFromIndex(index),
      time: normalizeTimeValue(time),
      label: t("med_custom_dose", { n: index + 1 }),
    });
  });

  return times;
}
