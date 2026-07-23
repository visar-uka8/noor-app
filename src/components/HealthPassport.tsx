"use client";

import { Loader2, Plus, Save, Trash2 } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PageSkeleton, ErrorBanner } from "@/components/AppStates";
import { HealthPassportEmergencyMode } from "@/components/HealthPassportEmergencyMode";
import { HealthPassportShareDialog } from "@/components/HealthPassportShareDialog";
import { fetchWithTimeout } from "@/lib/fetch-with-timeout";
import { filterCommonConditions } from "@/lib/common-conditions";
import { filterCommonVaccines } from "@/lib/common-vaccines";
import { calculateHealthPassportCompletionPercent } from "@/lib/health-passport-completion";
import {
  cacheEmergencyPassport,
  readEmergencyPassportCache,
} from "@/lib/health-passport-emergency-cache";
import { formatPassportMedicationLine, getPassportMedicationsForDisplay, toPassportMedications } from "@/lib/health-passport-medications";
import { parseStoredMedication } from "@/lib/medication-schedule";
import { createClient } from "@/lib/supabase/client";
import {
  bloodTypes,
  createEmptyAllergy,
  createEmptyCondition,
  createEmptyPassport,
  createEmptySurgery,
  createEmptyVaccination,
  type HealthPassportData,
  type PassportAllergy,
  type PassportCondition,
  type PassportSurgery,
  type PassportVaccination,
} from "@/types/health-passport";

type SaveMode = "manual" | "auto";

const inputClassName =
  "health-passport-input min-h-12 w-full rounded-2xl border border-border bg-background px-4 py-3 outline-none focus:border-primary";

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

  useEffect(() => {
    if (passport.personal.fullName.trim() || passport.userId) {
      cacheEmergencyPassport(passport);
    }
  }, [passport]);

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
        const body = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        console.error("Health passport save error:", body?.error ?? response.status);
        throw new Error(body?.error ?? "Save failed.");
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

      // Show cached emergency data immediately if available (works offline).
      const cached = readEmergencyPassportCache();
      if (cached) {
        setPassport(cached);
        setIsLoading(false);
      }

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
          let nextPassport = {
            ...data.passport,
            conditions: data.passport.conditions ?? [],
            userId: user?.id ?? data.passport.userId,
          };

          if (user) {
            const { data: medicationRows, error: medicationError } = await supabase
              .from("medications")
              .select("id, user_id, name, dosage, times, frequency, start_date, is_active, created_at, updated_at")
              .eq("user_id", user.id)
              .eq("is_active", true)
              .order("created_at", { ascending: true });

            console.log("Medications for passport:", medicationRows);

            if (!medicationError) {
              nextPassport = {
                ...nextPassport,
                medications: toPassportMedications(
                  (medicationRows ?? []).map(parseStoredMedication),
                ),
              };
            }
          }

          setPassport(nextPassport);
          cacheEmergencyPassport(nextPassport);
        } else if (!cached && user) {
          setPassport(createEmptyPassport(user.id));
        }
      } catch {
        if (!cached) {
          setPassport(createEmptyPassport());
        }
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

  const displayMedications = useMemo(
    () => getPassportMedicationsForDisplay(passport.medications),
    [passport.medications],
  );

  const completionPercent = calculateHealthPassportCompletionPercent(passport);
  const conditions = passport.conditions ?? [];

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
          onBeforeShare={async () => {
            if (isDirtyRef.current) {
              return savePassport("manual");
            }

            if (!passportRef.current.personal.fullName.trim()) {
              setStatusMessage(
                "Bitte geben Sie zuerst den vollständigen Namen ein.",
              );
              return false;
            }

            // Ensure the latest passport exists in Supabase before sharing.
            return savePassport("manual");
          }}
        />
      ) : null}

      <HealthPassportShareDialog
        open={isShareDialogOpen}
        onClose={() => setIsShareDialogOpen(false)}
      />

      <main className="mx-auto flex w-full max-w-app flex-1 flex-col px-5 py-6">
        <PassportCompletionBanner percent={completionPercent} />

        <Link
          href="/appointments"
          className="mb-5 rounded-2xl border border-border bg-background px-4 py-3 text-sm font-semibold text-primary transition-colors hover:border-primary/30"
        >
          Arzttermine planen & Vorbereitung anzeigen →
        </Link>

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
          {displayMedications.length === 0 ? (
            <p className="text-base text-muted">
              Noch keine aktiven Medikamente. Fügen Sie welche unter Medikamente
              hinzu.
            </p>
          ) : (
            <ul className="flex flex-col gap-3">
              {displayMedications.map((medication) => (
                <li
                  key={medication.id}
                  className="rounded-2xl border border-border bg-background px-4 py-3 text-base text-foreground"
                >
                  {formatPassportMedicationLine(medication)}
                </li>
              ))}
            </ul>
          )}

          <p className="text-sm leading-relaxed text-muted">
            Diese Medikamente werden automatisch aus Ihrer Medikamentenliste
            übernommen. Um Medikamente zu ändern, gehen Sie zu Medikamente →
            Verwalten.
          </p>

          <Link
            href="/medication"
            className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-border bg-background px-5 py-3 text-base font-semibold text-primary transition-colors hover:bg-primary-light/40"
          >
            Zu Medikamente →
          </Link>
        </FormSection>

        <FormSection title="Allergien">
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
              onDelete={() => {
                if (
                  !window.confirm(
                    "Möchten Sie diese Allergie wirklich löschen?",
                  )
                ) {
                  return;
                }

                updatePassport((current) => ({
                  ...current,
                  allergies: current.allergies.filter(
                    (_, itemIndex) => itemIndex !== index,
                  ),
                }));
              }}
            />
          ))}

          <button
            type="button"
            onClick={() =>
              updatePassport((current) => ({
                ...current,
                allergies: [...current.allergies, createEmptyAllergy()],
              }))
            }
            className="flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-3 text-base font-semibold text-white transition-colors hover:bg-primary-dark active:scale-[0.98]"
          >
            <Plus size={20} aria-hidden="true" />
            Allergie hinzufügen
          </button>
        </FormSection>

        <FormSection
          title="Erkrankungen & Diagnosen"
          description="Chronische Erkrankungen und wichtige Diagnosen"
        >
          {conditions.length === 0 ? (
            <p className="text-base text-muted">
              Noch keine Erkrankungen eingetragen.
            </p>
          ) : null}

          {conditions.map((condition, index) => (
            <ConditionRow
              key={condition.id}
              condition={condition}
              onChange={(updated) =>
                updatePassport((current) => ({
                  ...current,
                  conditions: current.conditions.map((item, itemIndex) =>
                    itemIndex === index ? updated : item,
                  ),
                }))
              }
              onDelete={() => {
                if (
                  !window.confirm(
                    "Möchten Sie diese Erkrankung wirklich löschen?",
                  )
                ) {
                  return;
                }

                updatePassport((current) => ({
                  ...current,
                  conditions: current.conditions.filter(
                    (_, itemIndex) => itemIndex !== index,
                  ),
                }));
              }}
            />
          ))}

          <button
            type="button"
            onClick={() =>
              updatePassport((current) => ({
                ...current,
                conditions: [...current.conditions, createEmptyCondition()],
              }))
            }
            className="flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-3 text-base font-semibold text-white transition-colors hover:bg-primary-dark active:scale-[0.98]"
          >
            <Plus size={20} aria-hidden="true" />
            Erkrankung hinzufügen
          </button>
        </FormSection>

        <FormSection title="Impfungen">
          {passport.vaccinations.length === 0 ? (
            <p className="text-base text-muted">
              Noch keine Impfungen eingetragen.
            </p>
          ) : null}

          {passport.vaccinations.map((vaccination, index) => (
            <VaccinationRow
              key={vaccination.id}
              vaccination={vaccination}
              onChange={(updated) =>
                updatePassport((current) => ({
                  ...current,
                  vaccinations: current.vaccinations.map((item, itemIndex) =>
                    itemIndex === index ? updated : item,
                  ),
                }))
              }
              onDelete={() => {
                if (
                  !window.confirm(
                    "Möchten Sie diese Impfung wirklich löschen?",
                  )
                ) {
                  return;
                }

                updatePassport((current) => ({
                  ...current,
                  vaccinations: current.vaccinations.filter(
                    (_, itemIndex) => itemIndex !== index,
                  ),
                }));
              }}
            />
          ))}

          <button
            type="button"
            onClick={() =>
              updatePassport((current) => ({
                ...current,
                vaccinations: [...current.vaccinations, createEmptyVaccination()],
              }))
            }
            className="flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-3 text-base font-semibold text-white transition-colors hover:bg-primary-dark active:scale-[0.98]"
          >
            <Plus size={20} aria-hidden="true" />
            Impfung hinzufügen
          </button>
        </FormSection>

        <FormSection title="Frühere Operationen">
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
              onDelete={() => {
                if (
                  !window.confirm(
                    "Möchten Sie diese Operation wirklich löschen?",
                  )
                ) {
                  return;
                }

                updatePassport((current) => ({
                  ...current,
                  surgeries: current.surgeries.filter(
                    (_, itemIndex) => itemIndex !== index,
                  ),
                }));
              }}
            />
          ))}

          <button
            type="button"
            onClick={() =>
              updatePassport((current) => ({
                ...current,
                surgeries: [...current.surgeries, createEmptySurgery()],
              }))
            }
            className="flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-3 text-base font-semibold text-white transition-colors hover:bg-primary-dark active:scale-[0.98]"
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

function PassportCompletionBanner({ percent }: { percent: number }) {
  return (
    <div
      style={{
        backgroundColor: "#FAEEDA",
        borderRadius: "12px",
        padding: "12px 16px",
        marginBottom: "20px",
      }}
      role="status"
      aria-live="polite"
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: "8px",
        }}
      >
        <span
          style={{
            fontSize: "14px",
            fontWeight: 600,
            color: "#633806",
          }}
        >
          Vollständigkeit
        </span>
        <span
          style={{
            fontSize: "14px",
            fontWeight: 600,
            color: "#633806",
          }}
        >
          {percent}%
        </span>
      </div>
      <div
        style={{
          height: "6px",
          backgroundColor: "#FAD9A0",
          borderRadius: "3px",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${percent}%`,
            backgroundColor: percent === 100 ? "#1D9E75" : "#BA7517",
            borderRadius: "3px",
            transition: "width 0.5s ease",
          }}
        />
      </div>
      {percent < 100 ? (
        <div
          style={{
            fontSize: "12px",
            color: "#BA7517",
            marginTop: "6px",
          }}
        >
          Im Notfall kann ein unvollständiger Pass Leben retten — bitte
          ausfüllen.
        </div>
      ) : null}
    </div>
  );
}

function FormSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-surface p-5 shadow-[var(--warm-shadow)]">
      <h2 className="text-xl font-bold text-foreground">{title}</h2>
      {description ? (
        <p className="mt-1 text-[13px] text-[#88856F]">{description}</p>
      ) : null}
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
    <label className="form-label health-passport-label flex flex-col gap-2 font-semibold text-foreground">
      {label}
      <span className="font-normal">{children}</span>
    </label>
  );
}

function VaccinationRow({
  vaccination,
  onChange,
  onDelete,
}: {
  vaccination: PassportVaccination;
  onChange: (vaccination: PassportVaccination) => void;
  onDelete: () => void;
}) {
  const fieldLabelStyle = {
    display: "block",
    fontSize: "13px",
    color: "#88856F",
    marginBottom: "6px",
  } as const;

  return (
    <div
      style={{
        border: "0.5px solid #E4E2DB",
        borderRadius: "12px",
        padding: "14px",
        position: "relative",
      }}
    >
      <button
        type="button"
        onClick={onDelete}
        aria-label="Impfung löschen"
        style={{
          position: "absolute",
          top: "12px",
          right: "12px",
          background: "none",
          border: "none",
          cursor: "pointer",
          color: "#A32D2D",
          fontSize: "18px",
          lineHeight: 1,
          padding: "4px",
        }}
      >
        🗑
      </button>

      <div style={{ paddingRight: "28px" }}>
        <VaccineNameInput
          value={vaccination.name}
          onChange={(name) => onChange({ ...vaccination, name })}
          style={{ width: "100%", marginBottom: "10px" }}
        />

        <label style={fieldLabelStyle}>Datum</label>
        <input
          type="date"
          value={vaccination.date}
          onChange={(event) =>
            onChange({ ...vaccination, date: event.target.value })
          }
          className={inputClassName}
          style={{ width: "100%", marginBottom: "10px" }}
        />

        <label style={fieldLabelStyle}>Nächste Impfung (optional)</label>
        <input
          type="date"
          value={vaccination.next_due}
          onChange={(event) =>
            onChange({ ...vaccination, next_due: event.target.value })
          }
          className={inputClassName}
          style={{ width: "100%" }}
        />
      </div>
    </div>
  );
}

function ConditionRow({
  condition,
  onChange,
  onDelete,
}: {
  condition: PassportCondition;
  onChange: (condition: PassportCondition) => void;
  onDelete: () => void;
}) {
  const fieldLabelStyle = {
    display: "block",
    fontSize: "13px",
    color: "#88856F",
    marginBottom: "6px",
  } as const;

  return (
    <div
      style={{
        border: "0.5px solid #E4E2DB",
        borderRadius: "12px",
        padding: "14px",
        backgroundColor: "#FFFFFF",
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div style={{ paddingRight: "4px" }} className="grid flex-1 gap-3">
          <div>
            <label style={fieldLabelStyle}>Name der Erkrankung</label>
            <ConditionNameInput
              value={condition.name}
              onChange={(name) => onChange({ ...condition, name })}
              style={{ width: "100%" }}
            />
          </div>

          <div>
            <label style={fieldLabelStyle}>Seit wann (optional)</label>
            <input
              type="text"
              value={condition.since}
              onChange={(event) =>
                onChange({ ...condition, since: event.target.value })
              }
              className={inputClassName}
              style={{ width: "100%" }}
              placeholder="z.B. seit 2019, seit Kindheit"
            />
          </div>

          <div>
            <label style={fieldLabelStyle}>Behandlung (optional)</label>
            <input
              type="text"
              value={condition.treatment}
              onChange={(event) =>
                onChange({ ...condition, treatment: event.target.value })
              }
              className={inputClassName}
              style={{ width: "100%" }}
              placeholder="z.B. Cortisoncreme, Insulin, keine"
            />
          </div>
        </div>

        <button
          type="button"
          onClick={onDelete}
          className="flex min-h-12 min-w-12 shrink-0 items-center justify-center rounded-xl text-red-600 transition-colors hover:bg-red-50"
          aria-label="Erkrankung löschen"
        >
          <Trash2 size={20} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

function ConditionNameInput({
  value,
  onChange,
  style,
}: {
  value: string;
  onChange: (value: string) => void;
  style?: React.CSSProperties;
}) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const fieldRef = useRef<HTMLDivElement>(null);
  const trimmedValue = value.trim();
  const suggestions = useMemo(
    () => filterCommonConditions(value),
    [value],
  );
  const showDropdown = showSuggestions && trimmedValue.length > 0;

  useEffect(() => {
    if (!showSuggestions) return;

    function handlePointerDown(event: MouseEvent) {
      if (!fieldRef.current?.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [showSuggestions]);

  return (
    <div ref={fieldRef} className="relative" style={style}>
      <input
        type="text"
        value={value}
        onChange={(event) => {
          onChange(event.target.value);
          setShowSuggestions(event.target.value.trim().length > 0);
        }}
        onFocus={() => {
          if (trimmedValue.length > 0) {
            setShowSuggestions(true);
          }
        }}
        className={`${inputClassName} ${
          showDropdown ? "rounded-b-none border-b-0" : ""
        }`}
        style={{ width: "100%" }}
        placeholder="z.B. Neurodermitis, Diabetes Typ 2"
        autoComplete="off"
        aria-label="Name der Erkrankung"
      />

      {showDropdown ? (
        <div
          className="absolute left-0 right-0 top-full z-[100] max-h-[200px] overflow-y-auto rounded-b-xl border border-t-0 border-[#E4E2DB] bg-white shadow-[0_4px_12px_rgba(0,0,0,0.08)]"
          style={{ borderWidth: "0.5px" }}
          role="listbox"
          aria-label="Erkrankungsvorschläge"
        >
          {suggestions.map((entry) => (
            <button
              key={entry}
              type="button"
              role="option"
              onClick={() => {
                onChange(entry);
                setShowSuggestions(false);
              }}
              className="flex min-h-12 w-full items-center border-b border-[#F0EFE9] px-4 text-left text-[15px] text-[#1E1D1B] transition-colors hover:bg-[#F7F6F2]"
              style={{ borderBottomWidth: "0.5px" }}
            >
              {entry}
            </button>
          ))}

          <button
            type="button"
            onClick={() => {
              onChange(trimmedValue);
              setShowSuggestions(false);
            }}
            className="sticky bottom-0 flex min-h-12 w-full items-center bg-[#F7F6F2] px-4 text-left text-sm font-semibold text-primary"
          >
            + {trimmedValue} hinzufügen
          </button>
        </div>
      ) : null}
    </div>
  );
}

function VaccineNameInput({
  value,
  onChange,
  style,
}: {
  value: string;
  onChange: (value: string) => void;
  style?: React.CSSProperties;
}) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const fieldRef = useRef<HTMLDivElement>(null);
  const trimmedValue = value.trim();
  const suggestions = useMemo(
    () => filterCommonVaccines(value),
    [value],
  );
  const showDropdown = showSuggestions && trimmedValue.length > 0;

  useEffect(() => {
    if (!showSuggestions) return;

    function handlePointerDown(event: MouseEvent) {
      if (!fieldRef.current?.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [showSuggestions]);

  return (
    <div ref={fieldRef} className="relative" style={style}>
      <input
        type="text"
        value={value}
        onChange={(event) => {
          onChange(event.target.value);
          setShowSuggestions(event.target.value.trim().length > 0);
        }}
        onFocus={() => {
          if (trimmedValue.length > 0) {
            setShowSuggestions(true);
          }
        }}
        className={`${inputClassName} ${
          showDropdown ? "rounded-b-none border-b-0" : ""
        }`}
        style={{ width: "100%" }}
        placeholder="z.B. COVID-19, Tetanus, Grippe"
        autoComplete="off"
        aria-label="Impfstoff"
      />

      {showDropdown ? (
        <div
          className="absolute left-0 right-0 top-full z-[100] max-h-[200px] overflow-y-auto rounded-b-xl border border-t-0 border-[#E4E2DB] bg-white shadow-[0_4px_12px_rgba(0,0,0,0.08)]"
          style={{ borderWidth: "0.5px" }}
          role="listbox"
          aria-label="Impfstoffvorschläge"
        >
          {suggestions.map((vaccine) => (
            <button
              key={vaccine}
              type="button"
              role="option"
              onClick={() => {
                onChange(vaccine);
                setShowSuggestions(false);
              }}
              className="flex min-h-12 w-full items-center border-b border-[#F0EFE9] px-4 text-left text-[15px] text-[#1E1D1B] transition-colors hover:bg-[#F7F6F2]"
              style={{ borderBottomWidth: "0.5px" }}
            >
              {vaccine}
            </button>
          ))}

          <button
            type="button"
            onClick={() => {
              onChange(trimmedValue);
              setShowSuggestions(false);
            }}
            className="sticky bottom-0 flex min-h-12 w-full items-center bg-[#F7F6F2] px-4 text-left text-sm font-semibold text-primary"
          >
            „{trimmedValue}" übernehmen
          </button>
        </div>
      ) : null}
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
