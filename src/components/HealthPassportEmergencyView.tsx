"use client";

import {
  formatEmergencyVaccinationLine,
} from "@/lib/vaccination-status";
import {
  frequencyLabels,
  type HealthPassportData,
  type MedicationFrequency,
} from "@/types/health-passport";

type HealthPassportEmergencyViewProps = {
  passport: HealthPassportData;
};

const textStyle = {
  fontSize: "18px",
  lineHeight: 1.45,
  color: "#111111",
} as const;

const labelStyle = {
  fontSize: "18px",
  fontWeight: 700,
  color: "#111111",
} as const;

const sectionTitleStyle = {
  fontSize: "20px",
  fontWeight: 800,
  letterSpacing: "0.04em",
  textTransform: "uppercase" as const,
  color: "#111111",
  margin: 0,
};

const phoneLinkStyle = {
  fontSize: "22px",
  fontWeight: 700,
  color: "#1D9E75",
  textDecoration: "none" as const,
  display: "block",
} as const;

export function HealthPassportEmergencyView({
  passport,
}: HealthPassportEmergencyViewProps) {
  const medications = passport.medications.filter(
    (medication) => medication.name.trim().length > 0,
  );
  const allergies = passport.allergies.filter(
    (allergy) => allergy.allergen.trim().length > 0,
  );
  const conditions = passport.conditions.filter(
    (condition) => condition.name.trim().length > 0,
  );
  const surgeries = passport.surgeries.filter(
    (surgery) => surgery.name.trim().length > 0,
  );
  const vaccinations = passport.vaccinations.filter(
    (vaccination) => vaccination.name.trim().length > 0,
  );

  const fullName = passport.personal.fullName.trim() || "Unbekannt";

  return (
    <div
      style={{
        flex: 1,
        backgroundColor: "#FFFFFF",
        color: "#111111",
        padding: "20px 16px 28px",
        overflowY: "auto",
      }}
    >
      <header
        style={{
          borderTop: "3px solid #111111",
          borderBottom: "3px solid #111111",
          padding: "14px 0",
          marginBottom: "18px",
        }}
      >
        <h1
          style={{
            margin: 0,
            fontSize: "28px",
            fontWeight: 800,
            lineHeight: 1.3,
            color: "#111111",
            textTransform: "uppercase",
          }}
        >
          🚨 NOTFALL — {fullName}
        </h1>
      </header>

      <section style={{ ...textStyle, marginBottom: "20px" }}>
        <InfoLine
          label="Geburtsdatum"
          value={formatEmergencyDate(passport.personal.dateOfBirth)}
        />
        <InfoLine label="Blutgruppe" value={passport.personal.bloodType || "—"} />
        <InfoLine
          label="Krankenkasse"
          value={passport.personal.insuranceName.trim() || "—"}
        />
        <InfoLine
          label="Versichertennummer"
          value={passport.personal.insuranceNumber.trim() || "—"}
        />
      </section>

      <Divider />

      <EmergencyBlock title="💊 AKTUELLE MEDIKAMENTE">
        {medications.length === 0 ? (
          <p style={{ ...textStyle, margin: 0 }}>Keine eingetragen</p>
        ) : (
          <ul style={{ margin: 0, paddingLeft: "20px" }}>
            {medications.map((medication) => (
              <li key={medication.id} style={{ ...textStyle, marginBottom: 8 }}>
                {formatEmergencyMedication(
                  medication.name,
                  medication.dose,
                  medication.frequency,
                )}
              </li>
            ))}
          </ul>
        )}
      </EmergencyBlock>

      <Divider />

      <EmergencyBlock title="⚠️ ALLERGIEN">
        {allergies.length === 0 ? (
          <p style={{ ...textStyle, margin: 0 }}>Keine bekannt</p>
        ) : (
          <ul style={{ margin: 0, paddingLeft: "20px" }}>
            {allergies.map((allergy) => (
              <li key={allergy.id} style={{ ...textStyle, marginBottom: 8 }}>
                {allergy.allergen.trim()}
                {allergy.reaction.trim()
                  ? ` — ${allergy.reaction.trim()}`
                  : ""}
              </li>
            ))}
          </ul>
        )}
      </EmergencyBlock>

      <Divider />

      <EmergencyBlock title="🩺 ERKRANKUNGEN">
        {conditions.length === 0 ? (
          <p style={{ ...textStyle, margin: 0 }}>Keine bekannten Erkrankungen</p>
        ) : (
          <ul style={{ margin: 0, paddingLeft: "20px" }}>
            {conditions.map((condition) => (
              <li key={condition.id} style={{ ...textStyle, marginBottom: 12 }}>
                <div>
                  {condition.name.trim()}
                  {condition.since.trim() ? ` — ${condition.since.trim()}` : ""}
                </div>
                {condition.treatment.trim() ? (
                  <div style={{ ...textStyle, marginTop: 4 }}>
                    Behandlung: {condition.treatment.trim()}
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </EmergencyBlock>

      <Divider />

      <EmergencyBlock title="💉 IMPFUNGEN">
        {vaccinations.length === 0 ? (
          <p style={{ ...textStyle, margin: 0 }}>Keine Impfungen eingetragen</p>
        ) : (
          <ul style={{ margin: 0, paddingLeft: "20px" }}>
            {vaccinations.map((vaccination) => (
              <li key={vaccination.id} style={{ ...textStyle, marginBottom: 8 }}>
                {formatEmergencyVaccinationLine(vaccination)}
              </li>
            ))}
          </ul>
        )}
      </EmergencyBlock>

      <Divider />

      <EmergencyBlock title="🏥 FRÜHERE OPERATIONEN">
        {surgeries.length === 0 ? (
          <p style={{ ...textStyle, margin: 0 }}>Keine eingetragen</p>
        ) : (
          <ul style={{ margin: 0, paddingLeft: "20px" }}>
            {surgeries.map((surgery) => (
              <li key={surgery.id} style={{ ...textStyle, marginBottom: 8 }}>
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
      </EmergencyBlock>

      <Divider />

      <EmergencyBlock title="📞 NOTFALLKONTAKT">
        <p style={{ ...textStyle, margin: "0 0 8px", fontWeight: 700 }}>
          {passport.emergencyContact.name.trim() || "—"}
          {passport.emergencyContact.relationship.trim()
            ? ` — ${passport.emergencyContact.relationship.trim()}`
            : ""}
        </p>
        {passport.emergencyContact.phone.trim() ? (
          <a
            href={toTelHref(passport.emergencyContact.phone)}
            style={{
              ...phoneLinkStyle,
              marginBottom: 16,
            }}
          >
            {passport.emergencyContact.phone.trim()}
          </a>
        ) : (
          <p style={{ ...textStyle, margin: "0 0 16px" }}>—</p>
        )}

        <p style={{ ...labelStyle, margin: "0 0 4px" }}>
          Hausarzt: {passport.personal.familyDoctorName.trim() || "—"}
        </p>
        {passport.personal.familyDoctorPhone.trim() ? (
          <a
            href={toTelHref(passport.personal.familyDoctorPhone)}
            style={phoneLinkStyle}
          >
            {passport.personal.familyDoctorPhone.trim()}
          </a>
        ) : null}
      </EmergencyBlock>

      <Divider />
    </div>
  );
}

function EmergencyBlock({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section style={{ marginBottom: 8 }}>
      <h2 style={{ ...sectionTitleStyle, marginBottom: 10 }}>{title}</h2>
      {children}
    </section>
  );
}

function Divider() {
  return (
    <div
      style={{
        borderTop: "2px solid #111111",
        margin: "16px 0",
      }}
      aria-hidden="true"
    />
  );
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <p style={{ ...textStyle, margin: "0 0 6px" }}>
      <span style={labelStyle}>{label}: </span>
      {value}
    </p>
  );
}

function formatEmergencyDate(dateString: string) {
  if (!dateString) return "—";

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

function formatEmergencyMedication(
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
