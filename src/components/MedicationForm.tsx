"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { ErrorBanner } from "@/components/AppStates";
import { commonMedications, filterCommonMedications } from "@/lib/common-medications";
import { fetchWithTimeout } from "@/lib/fetch-with-timeout";
import { normalizeTimeValue } from "@/lib/medication-schedule";
import {
  defaultTimeSlotValues,
  timeSlotLabels,
  type MedicationTimeEntry,
  type MedicationTimeSlot,
  type StoredMedication,
} from "@/types/medication";

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
  const nameFieldRef = useRef<HTMLDivElement>(null);

  const nameSuggestions = useMemo(
    () => filterCommonMedications(name),
    [name],
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
          throw new Error("Medikament konnte nicht geladen werden.");
        }

        const data = (await response.json()) as { medication: StoredMedication };
        setName(data.medication.name);
        setDosage(data.medication.dosage);
        setSlotStates(createSlotStatesFromMedication(data.medication.times));
      } catch {
        setError("Medikament konnte gerade nicht geladen werden.");
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
      setError("Bitte wählen Sie mindestens eine Einnahmezeit.");
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
          : "Medikament konnte gerade nicht gespeichert werden.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <main className="mx-auto w-full max-w-app flex-1 px-5 py-6">
        <p className="text-body text-muted">Medikament wird geladen…</p>
      </main>
    );
  }

  return (
    <>
      {error ? (
        <ErrorBanner
          message={error}
          actionLabel="Verstanden"
          onAction={() => setError(null)}
          onDismiss={() => setError(null)}
        />
      ) : null}

      <main className="mx-auto w-full max-w-app flex-1 px-5 py-6">
        <form onSubmit={(event) => void handleSubmit(event)} className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <label htmlFor="medication-name" className="text-base font-bold text-foreground">
              Name des Medikaments
            </label>
            <div ref={nameFieldRef} className="relative">
              <input
                id="medication-name"
                type="text"
                required
                value={name}
                onChange={(event) => {
                  setName(event.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                placeholder="z.B. Omega-3, Metformin"
                autoComplete="off"
                list="common-medications"
                className="min-h-12 w-full rounded-2xl border border-border bg-surface px-4 text-base text-foreground"
              />
              <datalist id="common-medications">
                {commonMedications.map((medication) => (
                  <option key={medication} value={medication} />
                ))}
              </datalist>

              {showSuggestions && nameSuggestions.length > 0 ? (
                <ul
                  className="absolute left-0 right-0 top-full z-10 mt-2 overflow-hidden rounded-2xl border border-border bg-surface shadow-[var(--warm-shadow)]"
                  role="listbox"
                  aria-label="Häufige Medikamente"
                >
                  {nameSuggestions.map((medication) => (
                    <li key={medication}>
                      <button
                        type="button"
                        role="option"
                        onClick={() => {
                          setName(medication);
                          setShowSuggestions(false);
                        }}
                        className="flex min-h-12 w-full items-center px-4 text-left text-base text-foreground transition-colors hover:bg-primary-light"
                      >
                        {medication}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </div>

          <label className="flex flex-col gap-2">
            <span className="text-base font-bold text-foreground">Dosierung</span>
            <input
              type="text"
              required
              value={dosage}
              onChange={(event) => setDosage(event.target.value)}
              placeholder="z.B. 1000mg, 500mg, 1 Tablette"
              className="min-h-12 rounded-2xl border border-border bg-surface px-4 text-base text-foreground"
            />
          </label>

          <section>
            <h2 className="text-base font-bold text-foreground">
              Wann nehmen Sie dieses Medikament?
            </h2>

            <div className="mt-4 flex flex-col gap-3">
              {slots.map((slot) => (
                <div key={slot} className="noor-card p-4">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-base font-semibold text-foreground">
                      {timeSlotLabels[slot]}
                    </span>
                    <ToggleSwitch
                      checked={slotStates[slot].enabled}
                      onChange={(checked) =>
                        setSlotStates((current) => ({
                          ...current,
                          [slot]: { ...current[slot], enabled: checked },
                        }))
                      }
                      label={timeSlotLabels[slot]}
                    />
                  </div>

                  {slotStates[slot].enabled ? (
                    <label className="mt-4 flex flex-col gap-2">
                      <span className="text-sm font-semibold text-muted">Uhrzeit</span>
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
                        className="min-h-12 rounded-2xl border border-border bg-background px-4 text-base text-foreground"
                      />
                    </label>
                  ) : null}
                </div>
              ))}
            </div>
          </section>

          <button
            type="submit"
            disabled={isSaving}
            className="btn-primary min-h-[52px] w-full"
          >
            {isSaving ? "Wird gespeichert…" : "Medikament speichern"}
          </button>
        </form>
      </main>
    </>
  );
}

function ToggleSwitch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative h-8 min-h-8 w-14 shrink-0 rounded-full transition-colors ${
        checked ? "bg-primary" : "bg-zinc-300"
      }`}
    >
      <span
        className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-transform ${
          checked ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
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
