import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";
import {
  formatEmergencyVaccinationLine,
} from "@/lib/vaccination-status";
import {
  frequencyLabels,
  type HealthPassportData,
  type MedicationFrequency,
} from "@/types/health-passport";

type HealthPassportPdfProps = {
  passport: HealthPassportData;
  generatedAt: Date;
};

const styles = StyleSheet.create({
  page: {
    padding: 36,
    backgroundColor: "#ffffff",
    color: "#2d2a26",
    fontFamily: "Helvetica",
    fontSize: 11,
    lineHeight: 1.45,
  },
  emergencyBanner: {
    marginBottom: 20,
    padding: 12,
    backgroundColor: "#fee2e2",
    border: "1 solid #dc2626",
  },
  emergencyText: {
    color: "#991b1b",
    fontSize: 13,
    fontWeight: 700,
  },
  generatedDate: {
    marginTop: 4,
    color: "#7f1d1d",
    fontSize: 10,
  },
  logo: {
    color: "#1D9E75",
    fontSize: 22,
    fontWeight: 700,
    marginBottom: 14,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    paddingBottom: 5,
    marginBottom: 8,
    borderBottom: "1 solid #1D9E75",
    color: "#1D9E75",
    fontSize: 14,
    fontWeight: 700,
  },
  item: {
    marginBottom: 6,
  },
  footer: {
    marginTop: 24,
    color: "#5c5750",
    fontSize: 10,
  },
});

export function HealthPassportPdf({
  passport,
  generatedAt,
}: HealthPassportPdfProps) {
  const formattedDate = generatedAt.toLocaleDateString("de-DE", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.emergencyBanner}>
          <Text style={styles.emergencyText}>
            NOTFALLDOKUMENT — Erstellt mit Noor Health
          </Text>
          <Text style={styles.generatedDate}>Erstellt am {formattedDate}</Text>
        </View>

        <Text style={styles.logo}>Noor</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Persönliche Daten</Text>
          <Text style={styles.item}>Name: {passport.personal.fullName}</Text>
          <Text style={styles.item}>
            Geburtsdatum: {passport.personal.dateOfBirth || "—"}
          </Text>
          <Text style={styles.item}>
            Blutgruppe: {passport.personal.bloodType}
          </Text>
          <Text style={styles.item}>
            Krankenkasse: {passport.personal.insuranceName || "—"}
          </Text>
          <Text style={styles.item}>
            Hausarzt: {passport.personal.familyDoctorName || "—"}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Aktuelle Medikamente</Text>
          {passport.medications
            .filter((medication) => medication.name.trim())
            .map((medication) => (
              <Text key={medication.id} style={styles.item}>
                {medication.name} — {medication.dose || "—"} —{" "}
                {formatFrequencies(medication.frequency)}
              </Text>
            ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Allergien</Text>
          {passport.allergies
            .filter((allergy) => allergy.allergen.trim())
            .map((allergy) => (
              <Text key={allergy.id} style={styles.item}>
                {allergy.allergen} — {allergy.reaction || "—"}
              </Text>
            ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Erkrankungen</Text>
          {passport.conditions
            .filter((condition) => condition.name.trim())
            .map((condition) => (
              <Text key={condition.id} style={styles.item}>
                {condition.name}
                {condition.since.trim() ? ` — ${condition.since.trim()}` : ""}
                {condition.treatment.trim()
                  ? ` — Behandlung: ${condition.treatment.trim()}`
                  : ""}
              </Text>
            ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Impfungen</Text>
          {passport.vaccinations
            .filter((vaccination) => vaccination.name.trim())
            .map((vaccination) => (
              <Text key={vaccination.id} style={styles.item}>
                {formatEmergencyVaccinationLine(vaccination) || vaccination.name}
              </Text>
            ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Frühere Operationen</Text>
          {passport.surgeries
            .filter((surgery) => surgery.name.trim())
            .map((surgery) => (
              <Text key={surgery.id} style={styles.item}>
                {surgery.name} — {surgery.year || "—"} —{" "}
                {surgery.hospital || "—"}
              </Text>
            ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notfallkontakt</Text>
          <Text style={styles.item}>
            {passport.emergencyContact.name || "—"} —{" "}
            {passport.emergencyContact.relationship || "—"} —{" "}
            {passport.emergencyContact.phone || "—"}
          </Text>
        </View>

        <Text style={styles.footer}>
          Dieses Dokument wurde von {passport.personal.fullName || "dem Patienten"}{" "}
          über die Noor Health App erstellt. Für medizinische Notfälle.
        </Text>
      </Page>
    </Document>
  );
}

function formatFrequencies(frequency: MedicationFrequency[]) {
  if (frequency.length === 0) return "—";

  return frequency.map((entry) => frequencyLabels[entry]).join(", ");
}
