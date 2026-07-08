"use client";

import { Phone, Share2 } from "lucide-react";
import {
  formatMedicationLine,
  formatPassportDate,
} from "@/lib/health-passport-share";
import {
  frequencyLabels,
  type HealthPassportData,
  type MedicationFrequency,
} from "@/types/health-passport";

type HealthPassportEmergencyViewProps = {
  passport: HealthPassportData;
  onShare?: () => void;
  showShareButton?: boolean;
};

export function HealthPassportEmergencyView({
  passport,
  onShare,
  showShareButton = false,
}: HealthPassportEmergencyViewProps) {
  const medications = passport.medications.filter(
    (medication) => medication.name.trim().length > 0,
  );
  const allergies = passport.allergies.filter(
    (allergy) => allergy.allergen.trim().length > 0,
  );

  return (
    <div className="flex flex-1 flex-col bg-background px-5 py-6">
      <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-center">
        <p className="text-lg font-bold uppercase tracking-wide text-red-700">
          Notfalldokument
        </p>
      </div>

      <section className="mt-6">
        <h1 className="text-[28px] font-bold leading-tight text-foreground">
          {passport.personal.fullName || "Unbekannt"}
        </h1>
        <p className="mt-2 text-[28px] leading-snug text-foreground">
          {formatPassportDate(passport.personal.dateOfBirth)}
        </p>
      </section>

      <section className="mt-8 text-center">
        <p className="text-base font-semibold uppercase tracking-wide text-muted">
          Blutgruppe
        </p>
        <p className="mt-2 text-[48px] font-bold leading-none text-foreground">
          {passport.personal.bloodType}
        </p>
      </section>

      <EmergencySection title="Aktuelle Medikamente">
        {medications.length === 0 ? (
          <p className="text-[28px] leading-snug text-muted">Keine eingetragen</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {medications.map((medication) => (
              <li
                key={medication.id}
                className="text-[28px] font-semibold leading-snug text-foreground"
              >
                {formatMedicationLine(
                  medication.name,
                  medication.dose,
                  medication.frequency.map(
                    (entry) => frequencyLabels[entry as MedicationFrequency],
                  ),
                )}
              </li>
            ))}
          </ul>
        )}
      </EmergencySection>

      <EmergencySection title="Allergien">
        {allergies.length === 0 ? (
          <p className="text-[28px] leading-snug text-red-900">Keine bekannt</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {allergies.map((allergy) => (
              <li
                key={allergy.id}
                className="rounded-2xl bg-red-600 px-4 py-4 text-[28px] font-semibold leading-snug text-white"
              >
                {allergy.allergen}
                {allergy.reaction ? ` — ${allergy.reaction}` : ""}
              </li>
            ))}
          </ul>
        )}
      </EmergencySection>

      <EmergencySection title="Hausarzt">
        <p className="text-[28px] font-semibold leading-snug text-foreground">
          {passport.personal.familyDoctorName || "—"}
        </p>
        {passport.personal.familyDoctorPhone ? (
          <a
            href={`tel:${passport.personal.familyDoctorPhone}`}
            className="mt-3 inline-flex min-h-12 items-center gap-2 text-[28px] font-semibold text-primary"
          >
            <Phone size={28} aria-hidden="true" />
            {passport.personal.familyDoctorPhone}
          </a>
        ) : null}
      </EmergencySection>

      <EmergencySection title="Notfallkontakt">
        <p className="text-[28px] font-semibold leading-snug text-foreground">
          {passport.emergencyContact.name || "—"}
          {passport.emergencyContact.relationship
            ? ` (${passport.emergencyContact.relationship})`
            : ""}
        </p>
        {passport.emergencyContact.phone ? (
          <a
            href={`tel:${passport.emergencyContact.phone}`}
            className="mt-3 inline-flex min-h-12 items-center gap-2 text-[28px] font-semibold text-primary"
          >
            <Phone size={28} aria-hidden="true" />
            {passport.emergencyContact.phone}
          </a>
        ) : null}
      </EmergencySection>

      {showShareButton && onShare ? (
        <button
          type="button"
          onClick={onShare}
          className="mt-8 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-4 text-base font-semibold text-white transition-colors hover:bg-primary-dark active:scale-[0.98]"
        >
          <Share2 size={22} aria-hidden="true" />
          Teilen
        </button>
      ) : null}
    </div>
  );
}

function EmergencySection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-8">
      <h2 className="mb-3 text-xl font-bold uppercase tracking-wide text-muted">
        {title}
      </h2>
      {children}
    </section>
  );
}
