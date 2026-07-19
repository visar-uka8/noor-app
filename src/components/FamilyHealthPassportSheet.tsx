"use client";

import { X } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { HealthPassportEmergencyView } from "@/components/HealthPassportEmergencyView";
import {
  formatEmergencyVaccinationLine,
  getVaccinationDueStatus,
} from "@/lib/vaccination-status";
import {
  frequencyLabels,
  type HealthPassportData,
  type MedicationFrequency,
} from "@/types/health-passport";

type FamilyHealthPassportSheetProps = {
  open: boolean;
  patientName: string;
  patientFirstName: string;
  passport: HealthPassportData | null;
  isLoading?: boolean;
  errorMessage?: string | null;
  onClose: () => void;
};

export function FamilyHealthPassportSheet({
  open,
  patientName,
  patientFirstName,
  passport,
  isLoading = false,
  errorMessage = null,
  onClose,
}: FamilyHealthPassportSheetProps) {
  const [showEmergency, setShowEmergency] = useState(false);

  useEffect(() => {
    if (!open) {
      setShowEmergency(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  if (!open || typeof document === "undefined") {
    return null;
  }

  if (showEmergency && passport) {
    return createPortal(
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Notfall — ${patientName}`}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 90,
          display: "flex",
          flexDirection: "column",
          backgroundColor: "#FFFFFF",
        }}
      >
        <div style={{ flex: 1, overflowY: "auto" }}>
          <HealthPassportEmergencyView passport={passport} />
        </div>
        <div
          style={{
            borderTop: "2px solid #111111",
            padding: "12px 16px calc(12px + env(safe-area-inset-bottom))",
          }}
        >
          <button
            type="button"
            onClick={() => setShowEmergency(false)}
            style={{
              width: "100%",
              minHeight: 56,
              borderRadius: 16,
              border: "2px solid #111111",
              backgroundColor: "#111111",
              color: "#FFFFFF",
              fontSize: 18,
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            ZURÜCK
          </button>
        </div>
      </div>,
      document.body,
    );
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[80] bg-black/50"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="fixed inset-x-0 bottom-0 mx-auto flex w-full max-w-app flex-col rounded-t-[20px] bg-surface shadow-[var(--warm-shadow)]"
        style={{ maxHeight: passport ? "85vh" : undefined }}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="family-passport-title"
      >
        <div
          className="mx-auto mt-3 h-1 w-10 shrink-0 rounded-full bg-[#E4E2DB]"
          aria-hidden="true"
        />

        <div className="shrink-0 border-b border-border px-5 pb-4 pt-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h2
                id="family-passport-title"
                className="text-xl font-bold leading-snug text-[#085041]"
              >
                {patientFirstName}s Gesundheitspass
              </h2>
              <span
                className="mt-2 inline-block rounded-full px-2.5 py-1 text-[11px] font-semibold"
                style={{
                  backgroundColor: "#FAEEDA",
                  color: "#BA7517",
                }}
              >
                Nur Ansicht
              </span>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex min-h-12 min-w-12 shrink-0 items-center justify-center rounded-xl text-[#88856F] transition-colors hover:bg-primary-light hover:text-primary"
              aria-label="Schließen"
            >
              <X size={24} strokeWidth={2.4} />
            </button>
          </div>
        </div>

        <div
          className={
            passport
              ? "min-h-0 flex-1 overflow-y-auto px-5 py-4"
              : "px-5 py-4"
          }
          style={passport ? { maxHeight: "calc(85vh - 12rem)" } : undefined}
        >
          {isLoading ? (
            <PassportSheetStatus message="Gesundheitspass wird geladen…" />
          ) : errorMessage ? (
            <PassportSheetStatus
              message={errorMessage}
              tone="error"
            />
          ) : passport ? (
            <FamilyHealthPassportReadOnlyContent passport={passport} />
          ) : (
            <PassportSheetEmptyState patientFirstName={patientFirstName} />
          )}
        </div>

        {passport ? (
          <div className="shrink-0 border-t border-border px-5 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
            <button
              type="button"
              onClick={() => setShowEmergency(true)}
              className="w-full min-h-14 rounded-2xl border-none text-base font-extrabold tracking-wide text-white"
              style={{
                backgroundColor: "#A32D2D",
                letterSpacing: "0.04em",
              }}
            >
              NOTFALL ANZEIGEN
            </button>
          </div>
        ) : (
          <div className="shrink-0 px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-1">
            <button
              type="button"
              onClick={onClose}
              className="btn-touch w-full rounded-2xl border-2 border-primary bg-surface px-5 py-3.5 text-base font-semibold text-primary transition-colors hover:bg-primary-light"
            >
              Schließen
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}

function PassportSheetEmptyState({
  patientFirstName,
}: {
  patientFirstName: string;
}) {
  return (
    <div className="flex flex-col items-center rounded-2xl bg-[#FAFAF8] px-5 py-8 text-center">
      <div
        className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl text-3xl"
        style={{ backgroundColor: "#E1F5EE" }}
        aria-hidden="true"
      >
        🏥
      </div>
      <p className="text-base font-semibold leading-snug text-[#085041]">
        Noch kein Gesundheitspass
      </p>
      <p className="mt-2 max-w-[260px] text-[15px] leading-relaxed text-[#88856F]">
        {patientFirstName} hat noch keine Gesundheitsdaten hinterlegt. Bitte
        bitten Sie {patientFirstName}, den Gesundheitspass in der App
        auszufüllen.
      </p>
    </div>
  );
}

function PassportSheetStatus({
  message,
  tone = "muted",
}: {
  message: string;
  tone?: "muted" | "error";
}) {
  return (
    <div className="rounded-2xl bg-[#FAFAF8] px-5 py-6 text-center">
      <p
        className={`text-[15px] leading-relaxed ${
          tone === "error" ? "font-semibold text-danger" : "text-[#88856F]"
        }`}
        role={tone === "error" ? "alert" : "status"}
      >
        {message}
      </p>
    </div>
  );
}

function FamilyHealthPassportReadOnlyContent({
  passport,
}: {
  passport: HealthPassportData;
}) {
  const medications = passport.medications.filter(
    (medication) => medication.name.trim().length > 0,
  );
  const allergies = passport.allergies.filter(
    (allergy) => allergy.allergen.trim().length > 0,
  );
  const conditions = passport.conditions.filter(
    (condition) => condition.name.trim().length > 0,
  );
  const vaccinations = passport.vaccinations.filter(
    (vaccination) => vaccination.name.trim().length > 0,
  );
  const surgeries = passport.surgeries.filter(
    (surgery) => surgery.name.trim().length > 0,
  );

  return (
    <div className="flex flex-col gap-6 pb-2">
      <ReadOnlySection title="Persönliche Daten">
        <ReadOnlyRow
          label="Geburtsdatum"
          value={formatPassportDate(passport.personal.dateOfBirth)}
        />
        <ReadOnlyRow
          label="Blutgruppe"
          value={passport.personal.bloodType || "—"}
        />
        <ReadOnlyRow
          label="Krankenkasse"
          value={passport.personal.insuranceName.trim() || "—"}
        />
        <ReadOnlyRow
          label="Versichertennummer"
          value={passport.personal.insuranceNumber.trim() || "—"}
        />
        <ReadOnlyRow
          label="Hausarzt"
          value={passport.personal.familyDoctorName.trim() || "—"}
        />
        <ReadOnlyRow
          label="Tel. Hausarzt"
          value={passport.personal.familyDoctorPhone.trim() || "—"}
          href={
            passport.personal.familyDoctorPhone.trim()
              ? toTelHref(passport.personal.familyDoctorPhone)
              : undefined
          }
        />
      </ReadOnlySection>

      <ReadOnlySection title="Aktuelle Medikamente">
        {medications.length === 0 ? (
          <p className="text-[15px] text-[#88856F]">Keine Medikamente hinterlegt</p>
        ) : (
          <ul className="m-0 list-none space-y-2 p-0">
            {medications.map((medication) => (
              <li
                key={medication.id}
                className="text-[15px] leading-relaxed text-[#085041]"
              >
                {formatMedicationLine(
                  medication.name,
                  medication.dose,
                  medication.frequency,
                )}
              </li>
            ))}
          </ul>
        )}
      </ReadOnlySection>

      <ReadOnlySection title="Allergien">
        {allergies.length === 0 ? (
          <p className="text-[15px] text-[#88856F]">Keine bekannt</p>
        ) : (
          <ul className="m-0 list-none space-y-2 p-0">
            {allergies.map((allergy) => (
              <li
                key={allergy.id}
                className="text-[15px] leading-relaxed text-[#085041]"
              >
                ⚠️ {allergy.allergen.trim()}
                {allergy.reaction.trim()
                  ? ` — ${allergy.reaction.trim()}`
                  : ""}
              </li>
            ))}
          </ul>
        )}
      </ReadOnlySection>

      <ReadOnlySection title="Erkrankungen">
        {conditions.length === 0 ? (
          <p className="text-[15px] text-[#88856F]">Keine bekannten Erkrankungen</p>
        ) : (
          <ul className="m-0 list-none space-y-2 p-0">
            {conditions.map((condition) => (
              <li
                key={condition.id}
                className="text-[15px] leading-relaxed text-[#085041]"
              >
                🩺 {condition.name.trim()}
                {condition.since.trim() ? ` — ${condition.since.trim()}` : ""}
                {condition.treatment.trim()
                  ? ` · Behandlung: ${condition.treatment.trim()}`
                  : ""}
              </li>
            ))}
          </ul>
        )}
      </ReadOnlySection>

      <ReadOnlySection title="Impfungen">
        {vaccinations.length === 0 ? (
          <p className="text-[15px] text-[#88856F]">Keine Impfungen eingetragen</p>
        ) : (
          <ul className="m-0 list-none space-y-2 p-0">
            {vaccinations.map((vaccination) => {
              const dueStatus = getVaccinationDueStatus(vaccination.next_due);
              const isOverdue = dueStatus === "overdue";

              return (
                <li
                  key={vaccination.id}
                  className="text-[15px] leading-relaxed"
                  style={{ color: isOverdue ? "#BA7517" : "#085041" }}
                >
                  💉 {formatEmergencyVaccinationLine(vaccination)}
                  {isOverdue ? " — fällig" : ""}
                </li>
              );
            })}
          </ul>
        )}
      </ReadOnlySection>

      <ReadOnlySection title="Frühere Operationen">
        {surgeries.length === 0 ? (
          <p className="text-[15px] text-[#88856F]">Keine eingetragen</p>
        ) : (
          <ul className="m-0 list-none space-y-2 p-0">
            {surgeries.map((surgery) => (
              <li
                key={surgery.id}
                className="text-[15px] leading-relaxed text-[#085041]"
              >
                {[
                  surgery.name.trim(),
                  surgery.year.trim(),
                  surgery.hospital.trim(),
                ]
                  .filter(Boolean)
                  .join(" — ")}
              </li>
            ))}
          </ul>
        )}
      </ReadOnlySection>

      <ReadOnlySection title="Notfallkontakt">
        <ReadOnlyRow
          label="Name"
          value={
            [
              passport.emergencyContact.name.trim(),
              passport.emergencyContact.relationship.trim(),
            ]
              .filter(Boolean)
              .join(" — ") || "—"
          }
        />
        <ReadOnlyRow
          label="Telefon"
          value={passport.emergencyContact.phone.trim() || "—"}
          href={
            passport.emergencyContact.phone.trim()
              ? toTelHref(passport.emergencyContact.phone)
              : undefined
          }
        />
      </ReadOnlySection>
    </div>
  );
}

function ReadOnlySection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h3
        className="mb-3 text-[13px] font-bold uppercase tracking-wide text-[#88856F]"
        style={{ letterSpacing: "0.06em" }}
      >
        {title}
      </h3>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

function ReadOnlyRow({
  label,
  value,
  href,
}: {
  label: string;
  value: string;
  href?: string;
}) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-2">
      <span className="shrink-0 text-[14px] font-semibold text-[#88856F]">
        {label}:
      </span>
      {href ? (
        <a
          href={href}
          className="text-[15px] font-semibold text-[#1D9E75] no-underline"
        >
          {value}
        </a>
      ) : (
        <span className="text-[15px] text-[#085041]">{value}</span>
      )}
    </div>
  );
}

function formatPassportDate(dateString: string) {
  if (!dateString.trim()) return "—";

  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return dateString;

  return date.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function toTelHref(phone: string) {
  const trimmed = phone.trim();
  const normalized = trimmed.replace(/[^\d+]/g, "");
  return `tel:${normalized || trimmed}`;
}

function formatMedicationLine(
  name: string,
  dose: string,
  frequency: MedicationFrequency[],
) {
  const labels = frequency.map((entry) => frequencyLabels[entry]);
  const schedule =
    labels.length === 0
      ? ""
      : labels.length === 1
        ? labels[0]
        : labels.length === 2
          ? `${labels[0]} und ${labels[1]}`
          : `${labels.slice(0, -1).join(", ")} und ${labels[labels.length - 1]}`;

  const dosePart = dose.trim() ? ` ${dose.trim()}` : "";
  const schedulePart = schedule ? ` — ${schedule}` : "";

  return `${name.trim()}${dosePart}${schedulePart}`;
}
