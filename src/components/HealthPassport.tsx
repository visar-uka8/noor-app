"use client";

import { Loader2, Plus, Save, Trash2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { PageSkeleton, ErrorBanner } from "@/components/AppStates";
import { HealthPassportEmergencyMode } from "@/components/HealthPassportEmergencyMode";
import { HealthPassportShareDialog } from "@/components/HealthPassportShareDialog";
import { fetchWithTimeout } from "@/lib/fetch-with-timeout";
import { createClient } from "@/lib/supabase/client";
import {
  bloodTypes,
  createEmptyAllergy,
  createEmptyMedication,
  createEmptyPassport,
  createEmptySurgery,
  frequencyLabels,
  type HealthPassportData,
  type MedicationFrequency,
  type PassportAllergy,
  type PassportMedication,
  type PassportSurgery,
} from "@/types/health-passport";

type SaveMode = "manual" | "auto";

const inputClassName =
  "min-h-12 w-full rounded-2xl border border-border bg-background px-4 py-3 text-base outline-none focus:border-primary";

const emergencyRelationships = [
  "Mutter",
  "Vater",
  "Ehepartner",
  "Kind",
  "Andere",
];

export function HealthPassport() {
  const [passport, setPassport] = useState<HealthPassportData>(
    createEmptyPassport(),
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [saveIndicator, setSaveIndicator] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [autoSaveError, setAutoSaveError] = useState<string | null>(null);
  const [isEmergencyMode, setIsEmergencyMode] = useState(false);
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const passportRef = useRef(passport);
  const isDirtyRef = useRef(isDirty);

  useEffect(() => {
    passportRef.current = passport;
  }, [passport]);

  useEffect(() => {
    isDirtyRef.current = isDirty;
  }, [isDirty]);

  const savePassport = useCallback(async (mode: SaveMode = "manual") => {
    if (!passportRef.current.personal.fullName.trim()) {
      if (mode === "manual") {
        setStatusMessage("Bitte geben Sie zuerst den vollständigen Namen ein.");
      }
      return false;
    }

    setIsSaving(true);
    setStatusMessage(null);
    setSaveError(null);
    setAutoSaveError(null);

    try {
      const response = await fetchWithTimeout("/api/health-passport", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(passportRef.current),
      });

      if (!response.ok) {
        throw new Error("Save failed.");
      }

      setIsDirty(false);
      setAutoSaveError(null);

      if (mode === "auto") {
        setSaveIndicator("Gespeichert");
        window.setTimeout(() => setSaveIndicator(null), 2500);
      } else {
        setStatusMessage("Gesundheitspass gespeichert ✓");
      }

      return true;
    } catch {
      if (mode === "auto") {
        setAutoSaveError(
          "Automatisches Speichern fehlgeschlagen — wird erneut versucht.",
        );
      } else {
        setSaveError(
          "Gesundheitspass konnte nicht gespeichert werden. Bitte versuchen Sie es erneut.",
        );
      }
      return false;
    } finally {
      setIsSaving(false);
    }
  }, []);

  useEffect(() => {
    async function loadPassport() {
      setIsLoading(true);

      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        const response = await fetchWithTimeout("/api/health-passport");

        if (response.ok) {
          const data = (await response.json()) as {
            passport: HealthPassportData;
          };
          setPassport({
            ...data.passport,
            userId: user?.id ?? data.passport.userId,
          });
        } else if (user) {
          setPassport(createEmptyPassport(user.id));
        }
      } catch {
        setPassport(createEmptyPassport());
      } finally {
        setIsLoading(false);
      }
    }

    void loadPassport();
  }, []);

  useEffect(() => {
    if (!isDirty) return;

    const timer = window.setInterval(() => {
      if (isDirtyRef.current) {
        void savePassport("auto");
      }
    }, 30_000);

    return () => window.clearInterval(timer);
  }, [isDirty, savePassport]);

  function updatePassport(updater: (current: HealthPassportData) => HealthPassportData) {
    setPassport((current) => updater(current));
    setIsDirty(true);
    setStatusMessage(null);
  }

  if (isLoading) {
    return <PageSkeleton />;
  }

  return (
    <>
      {saveError ? (
        <ErrorBanner
          message={saveError}
          actionLabel="Erneut speichern"
          onAction={() => void savePassport("manual")}
          onDismiss={() => setSaveError(null)}
        />
      ) : null}

      {autoSaveError ? (
        <ErrorBanner
          message={autoSaveError}
          actionLabel="Jetzt speichern"
          onAction={() => void savePassport("manual")}
          onDismiss={() => setAutoSaveError(null)}
        />
      ) : null}

      {isEmergencyMode ? (
        <HealthPassportEmergencyMode
          passport={passport}
          onClose={() => setIsEmergencyMode(false)}
          onShare={async () => {
            if (isDirtyRef.current) {
              await savePassport("manual");
            }
            setIsShareDialogOpen(true);
          }}
        />
      ) : null}

      <HealthPassportShareDialog
        open={isShareDialogOpen}
        onClose={() => setIsShareDialogOpen(false)}
      />

      <main className="mx-auto flex w-full max-w-app flex-1 flex-col px-5 py-6">
        <button
          type="button"
          onClick={() => setIsEmergencyMode(true)}
          className="btn-touch mb-5 w-full rounded-2xl bg-danger px-5 py-4 text-lg font-bold uppercase tracking-wide text-white transition-colors hover:opacity-90"
        >
          NOTFALL ANZEIGEN
        </button>

        <div className="mb-5 flex items-center justify-between gap-3">
        <p className="text-base leading-relaxed text-muted">
          Gemeinsam ausfüllen — im Notfall sofort bereit für Ärzte.
        </p>
        {saveIndicator ? (
          <span
            className="shrink-0 rounded-full bg-primary-light px-3 py-1 text-sm font-semibold text-primary-dark"
            role="status"
          >
            {saveIndicator}
          </span>
        ) : null}
      </div>

      <form
        className="flex flex-col gap-6"
        onSubmit={(event) => {
          event.preventDefault();
          void savePassport("manual");
        }}
      >
        <FormSection title="Persönliche Daten">
          <FormField label="Vollständiger Name">
            <input
              value={passport.personal.fullName}
              onChange={(event) =>
                updatePassport((current) => ({
                  ...current,
                  personal: {
                    ...current.personal,
                    fullName: event.target.value,
                  },
                }))
              }
              className={inputClassName}
              placeholder="z. B. Renate Leka"
              required
            />
          </FormField>

          <FormField label="Geburtsdatum">
            <input
              type="date"
              value={passport.personal.dateOfBirth}
              onChange={(event) =>
                updatePassport((current) => ({
                  ...current,
                  personal: {
                    ...current.personal,
                    dateOfBirth: event.target.value,
                  },
                }))
              }
              className={inputClassName}
            />
          </FormField>

          <FormField label="Blutgruppe">
            <select
              value={passport.personal.bloodType}
              onChange={(event) =>
                updatePassport((current) => ({
                  ...current,
                  personal: {
                    ...current.personal,
                    bloodType: event.target.value as HealthPassportData["personal"]["bloodType"],
                  },
                }))
              }
              className={inputClassName}
            >
              {bloodTypes.map((bloodType) => (
                <option key={bloodType} value={bloodType}>
                  {bloodType}
                </option>
              ))}
            </select>
          </FormField>

          <FormField label="Krankenkasse">
            <input
              value={passport.personal.insuranceName}
              onChange={(event) =>
                updatePassport((current) => ({
                  ...current,
                  personal: {
                    ...current.personal,
                    insuranceName: event.target.value,
                  },
                }))
              }
              className={inputClassName}
              placeholder='z. B. TK — Techniker Krankenkasse'
            />
          </FormField>

          <FormField label="Versichertennummer">
            <input
              value={passport.personal.insuranceNumber}
              onChange={(event) =>
                updatePassport((current) => ({
                  ...current,
                  personal: {
                    ...current.personal,
                    insuranceNumber: event.target.value,
                  },
                }))
              }
              className={inputClassName}
            />
          </FormField>

          <FormField label="Hausarzt">
            <input
              value={passport.personal.familyDoctorName}
              onChange={(event) =>
                updatePassport((current) => ({
                  ...current,
                  personal: {
                    ...current.personal,
                    familyDoctorName: event.target.value,
                  },
                }))
              }
              className={inputClassName}
              placeholder="z. B. Dr. Schneider"
            />
          </FormField>

          <FormField label="Telefon Hausarzt">
            <input
              type="tel"
              value={passport.personal.familyDoctorPhone}
              onChange={(event) =>
                updatePassport((current) => ({
                  ...current,
                  personal: {
                    ...current.personal,
                    familyDoctorPhone: event.target.value,
                  },
                }))
              }
              className={inputClassName}
              placeholder="+49 30 1234567"
            />
          </FormField>
        </FormSection>

        <FormSection title="Aktuelle Medikamente">
          <div className="flex flex-col gap-4">
            {passport.medications.map((medication, index) => (
              <MedicationRow
                key={medication.id}
                medication={medication}
                onChange={(updated) =>
                  updatePassport((current) => ({
                    ...current,
                    medications: current.medications.map((item, itemIndex) =>
                      itemIndex === index ? updated : item,
                    ),
                  }))
                }
                onDelete={() =>
                  updatePassport((current) => ({
                    ...current,
                    medications: current.medications.filter(
                      (_, itemIndex) => itemIndex !== index,
                    ),
                  }))
                }
              />
            ))}
          </div>

          <button
            type="button"
            onClick={() =>
              updatePassport((current) => ({
                ...current,
                medications: [...current.medications, createEmptyMedication()],
              }))
            }
            className="mt-4 flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-3 text-base font-semibold text-white transition-colors hover:bg-primary-dark active:scale-[0.98]"
          >
            <Plus size={20} aria-hidden="true" />
            Medikament hinzufügen
          </button>
        </FormSection>

        <FormSection title="Allergien">
          <div className="flex flex-col gap-4">
            {passport.allergies.length === 0 ? (
              <p className="text-base text-muted">Noch keine Allergien eingetragen.</p>
            ) : null}

            {passport.allergies.map((allergy, index) => (
              <AllergyRow
                key={allergy.id}
                allergy={allergy}
                onChange={(updated) =>
                  updatePassport((current) => ({
                    ...current,
                    allergies: current.allergies.map((item, itemIndex) =>
                      itemIndex === index ? updated : item,
                    ),
                  }))
                }
                onDelete={() =>
                  updatePassport((current) => ({
                    ...current,
                    allergies: current.allergies.filter(
                      (_, itemIndex) => itemIndex !== index,
                    ),
                  }))
                }
              />
            ))}
          </div>

          <button
            type="button"
            onClick={() =>
              updatePassport((current) => ({
                ...current,
                allergies: [...current.allergies, createEmptyAllergy()],
              }))
            }
            className="mt-4 flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-3 text-base font-semibold text-white transition-colors hover:bg-primary-dark active:scale-[0.98]"
          >
            <Plus size={20} aria-hidden="true" />
            Allergie hinzufügen
          </button>
        </FormSection>

        <FormSection title="Frühere Operationen">
          <div className="flex flex-col gap-4">
            {passport.surgeries.length === 0 ? (
              <p className="text-base text-muted">Noch keine Operationen eingetragen.</p>
            ) : null}

            {passport.surgeries.map((surgery, index) => (
              <SurgeryRow
                key={surgery.id}
                surgery={surgery}
                onChange={(updated) =>
                  updatePassport((current) => ({
                    ...current,
                    surgeries: current.surgeries.map((item, itemIndex) =>
                      itemIndex === index ? updated : item,
                    ),
                  }))
                }
                onDelete={() =>
                  updatePassport((current) => ({
                    ...current,
                    surgeries: current.surgeries.filter(
                      (_, itemIndex) => itemIndex !== index,
                    ),
                  }))
                }
              />
            ))}
          </div>

          <button
            type="button"
            onClick={() =>
              updatePassport((current) => ({
                ...current,
                surgeries: [...current.surgeries, createEmptySurgery()],
              }))
            }
            className="mt-4 flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-3 text-base font-semibold text-white transition-colors hover:bg-primary-dark active:scale-[0.98]"
          >
            <Plus size={20} aria-hidden="true" />
            Operation hinzufügen
          </button>
        </FormSection>

        <FormSection title="Notfallkontakt">
          <FormField label="Name">
            <input
              value={passport.emergencyContact.name}
              onChange={(event) =>
                updatePassport((current) => ({
                  ...current,
                  emergencyContact: {
                    ...current.emergencyContact,
                    name: event.target.value,
                  },
                }))
              }
              className={inputClassName}
              placeholder="z. B. Alex Leka"
            />
          </FormField>

          <FormField label="Beziehung">
            <select
              value={passport.emergencyContact.relationship}
              onChange={(event) =>
                updatePassport((current) => ({
                  ...current,
                  emergencyContact: {
                    ...current.emergencyContact,
                    relationship: event.target.value,
                  },
                }))
              }
              className={inputClassName}
            >
              <option value="">Bitte wählen</option>
              {emergencyRelationships.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
              {passport.emergencyContact.relationship &&
              !emergencyRelationships.includes(
                passport.emergencyContact.relationship,
              ) ? (
                <option value={passport.emergencyContact.relationship}>
                  {passport.emergencyContact.relationship}
                </option>
              ) : null}
            </select>
          </FormField>

          <FormField label="Telefonnummer">
            <input
              type="tel"
              value={passport.emergencyContact.phone}
              onChange={(event) =>
                updatePassport((current) => ({
                  ...current,
                  emergencyContact: {
                    ...current.emergencyContact,
                    phone: event.target.value,
                  },
                }))
              }
              className={inputClassName}
              placeholder="+49 170 1234567"
            />
          </FormField>
        </FormSection>

        {statusMessage ? (
          <p
            className="text-body rounded-2xl bg-primary-light px-4 py-3 text-center font-semibold text-heading"
            role="status"
          >
            {statusMessage}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={isSaving}
          className="btn-primary w-full gap-2 disabled:opacity-70"
        >
          {isSaving ? (
            <>
              <Loader2 size={22} className="animate-spin" aria-hidden="true" />
              Wird gespeichert...
            </>
          ) : (
            <>
              <Save size={22} aria-hidden="true" />
              Gesundheitspass speichern
            </>
          )}
        </button>
      </form>
    </main>
    </>
  );
}

function FormSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-surface p-5 shadow-[var(--warm-shadow)]">
      <h2 className="text-xl font-bold text-foreground">{title}</h2>
      <div className="mt-5 flex flex-col gap-4">{children}</div>
    </section>
  );
}

function FormField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-2 text-base font-semibold text-foreground">
      {label}
      <span className="font-normal">{children}</span>
    </label>
  );
}

function MedicationRow({
  medication,
  onChange,
  onDelete,
}: {
  medication: PassportMedication;
  onChange: (medication: PassportMedication) => void;
  onDelete: () => void;
}) {
  function toggleFrequency(frequency: MedicationFrequency) {
    const nextFrequency = medication.frequency.includes(frequency)
      ? medication.frequency.filter((entry) => entry !== frequency)
      : [...medication.frequency, frequency];

    onChange({ ...medication, frequency: nextFrequency });
  }

  return (
    <div className="rounded-2xl border border-border bg-background p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="grid flex-1 gap-3">
          <input
            value={medication.name}
            onChange={(event) =>
              onChange({ ...medication, name: event.target.value })
            }
            className={inputClassName}
            placeholder="Name"
          />
          <input
            value={medication.dose}
            onChange={(event) =>
              onChange({ ...medication, dose: event.target.value })
            }
            className={inputClassName}
            placeholder="Dosis"
          />
          <div className="flex flex-wrap gap-2">
            {(Object.keys(frequencyLabels) as MedicationFrequency[]).map(
              (frequency) => {
                const selected = medication.frequency.includes(frequency);

                return (
                  <button
                    key={frequency}
                    type="button"
                    onClick={() => toggleFrequency(frequency)}
                    className={`min-h-10 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                      selected
                        ? "bg-primary-light text-primary-dark"
                        : "bg-surface text-muted"
                    }`}
                    aria-pressed={selected}
                  >
                    {frequencyLabels[frequency]}
                  </button>
                );
              },
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={onDelete}
          className="flex min-h-12 min-w-12 items-center justify-center rounded-xl text-red-600 transition-colors hover:bg-red-50"
          aria-label="Medikament löschen"
        >
          <Trash2 size={20} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

function AllergyRow({
  allergy,
  onChange,
  onDelete,
}: {
  allergy: PassportAllergy;
  onChange: (allergy: PassportAllergy) => void;
  onDelete: () => void;
}) {
  return (
    <div className="rounded-2xl border border-border bg-background p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="grid flex-1 gap-3">
          <input
            value={allergy.allergen}
            onChange={(event) =>
              onChange({ ...allergy, allergen: event.target.value })
            }
            className={inputClassName}
            placeholder="Allergen"
          />
          <input
            value={allergy.reaction}
            onChange={(event) =>
              onChange({ ...allergy, reaction: event.target.value })
            }
            className={inputClassName}
            placeholder="Reaktion hinzufügen..."
          />
        </div>

        <button
          type="button"
          onClick={onDelete}
          className="flex min-h-12 min-w-12 items-center justify-center rounded-xl text-red-600 transition-colors hover:bg-red-50"
          aria-label="Allergie löschen"
        >
          <Trash2 size={20} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

function SurgeryRow({
  surgery,
  onChange,
  onDelete,
}: {
  surgery: PassportSurgery;
  onChange: (surgery: PassportSurgery) => void;
  onDelete: () => void;
}) {
  return (
    <div className="rounded-2xl border border-border bg-background p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="grid flex-1 gap-3">
          <input
            value={surgery.name}
            onChange={(event) =>
              onChange({ ...surgery, name: event.target.value })
            }
            className={inputClassName}
            placeholder="Operation"
          />
          <input
            value={surgery.year}
            onChange={(event) =>
              onChange({ ...surgery, year: event.target.value })
            }
            className={inputClassName}
            placeholder="Jahr"
          />
          <input
            value={surgery.hospital}
            onChange={(event) =>
              onChange({ ...surgery, hospital: event.target.value })
            }
            className={inputClassName}
            placeholder="Krankenhaus"
          />
        </div>

        <button
          type="button"
          onClick={onDelete}
          className="flex min-h-12 min-w-12 items-center justify-center rounded-xl text-red-600 transition-colors hover:bg-red-50"
          aria-label="Operation löschen"
        >
          <Trash2 size={20} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
