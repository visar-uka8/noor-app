import { AppHeader } from "@/components/AppHeader";
import { contactEmail } from "@/lib/app-info";

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="noor-card p-5">
      <h2 className="text-lg font-bold text-heading">{title}</h2>
      <div className="text-body mt-3 space-y-3 text-muted">{children}</div>
    </section>
  );
}

export default function PrivacyPage() {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <AppHeader showBack backHref="/settings" title="Datenschutz" />
      <main className="mx-auto flex w-full max-w-app flex-1 flex-col gap-4 px-5 py-6">
        <section className="noor-card p-5">
          <h1 className="heading-lg">Datenschutzerklärung</h1>
          <p className="text-body mt-3 text-muted">
            Stand: Juli 2026. Diese Erklärung informiert Sie darüber, welche
            personenbezogenen Daten Noor verarbeitet, wie sie gespeichert
            werden und welche Rechte Sie haben.
          </p>
        </section>

        <Section title="1. Verantwortlicher">
          <p>
            Visar Uka
            <br />
            [Anschrift — siehe Impressum]
            <br />
            E-Mail:{" "}
            <a
              href={`mailto:${contactEmail}`}
              className="font-semibold text-primary underline-offset-4 hover:underline"
            >
              {contactEmail}
            </a>
          </p>
        </Section>

        <Section title="2. Welche Daten wir verarbeiten">
          <p>Bei der Nutzung von Noor verarbeiten wir folgende Daten:</p>
          <ul className="list-disc space-y-2 pl-5">
            <li>
              <span className="font-semibold text-foreground">Kontodaten:</span>{" "}
              E-Mail-Adresse, Name, Geburtsdatum und Passwort (verschlüsselt).
            </li>
            <li>
              <span className="font-semibold text-foreground">
                Gesundheitsdaten:
              </span>{" "}
              Medikamente und Einnahmebestätigungen, hochgeladene Laborbefunde
              und deren KI-Erklärungen sowie die Angaben in Ihrem
              Gesundheitspass (z.&nbsp;B. Blutgruppe, Allergien,
              Notfallkontakt).
            </li>
            <li>
              <span className="font-semibold text-foreground">
                Familienverbindungen:
              </span>{" "}
              Wen Sie eingeladen haben und welche Angehörigen Ihren Status
              sehen dürfen.
            </li>
          </ul>
          <p>
            Gesundheitsdaten sind besondere Kategorien personenbezogener Daten
            (Art. 9 DSGVO). Wir verarbeiten sie ausschließlich mit Ihrer
            ausdrücklichen Einwilligung, die Sie mit der Registrierung und der
            aktiven Nutzung der jeweiligen Funktion erteilen.
          </p>
        </Section>

        <Section title="3. Wie Ihre Daten gespeichert werden">
          <p>
            Ihre Daten werden bei unserem Auftragsverarbeiter Supabase in der
            Region Frankfurt am Main (Deutschland) gespeichert. Die Übertragung
            erfolgt verschlüsselt (TLS), Zugriffe sind durch
            Zeilen-Sicherheitsregeln auf Ihr eigenes Konto beschränkt.
          </p>
          <p>
            Zur Erklärung Ihrer Laborbefunde wird das hochgeladene Dokument an
            einen KI-Dienst (Google Gemini) übermittelt und dort nur zur
            Erstellung der Erklärung verarbeitet.
          </p>
        </Section>

        <Section title="4. Zwecke und Rechtsgrundlagen">
          <ul className="list-disc space-y-2 pl-5">
            <li>
              Bereitstellung der App-Funktionen — Art. 6 Abs. 1 lit. b DSGVO
              (Vertragserfüllung).
            </li>
            <li>
              Verarbeitung von Gesundheitsdaten — Art. 9 Abs. 2 lit. a DSGVO
              (ausdrückliche Einwilligung).
            </li>
            <li>
              Benachrichtigungen an verbundene Angehörige — Ihre Einwilligung,
              die Sie jederzeit in den Einstellungen widerrufen können.
            </li>
          </ul>
        </Section>

        <Section title="5. Ihre Rechte — Daten löschen und exportieren">
          <p>
            Sie haben jederzeit das Recht auf Auskunft, Berichtigung, Löschung
            und Datenübertragbarkeit sowie das Recht, erteilte Einwilligungen
            zu widerrufen.
          </p>
          <ul className="list-disc space-y-2 pl-5">
            <li>
              <span className="font-semibold text-foreground">Exportieren:</span>{" "}
              Profil → „Meine Daten exportieren" lädt alle Ihre Daten als Datei
              herunter.
            </li>
            <li>
              <span className="font-semibold text-foreground">Löschen:</span>{" "}
              Profil → „Konto löschen" entfernt Ihr Konto und alle
              gespeicherten Gesundheitsdaten dauerhaft.
            </li>
          </ul>
          <p>
            Sie haben außerdem das Recht, sich bei einer
            Datenschutz-Aufsichtsbehörde zu beschweren.
          </p>
        </Section>

        <Section title="6. Kontakt für Datenschutzanfragen">
          <p>
            Für alle Fragen und Anfragen zum Datenschutz erreichen Sie uns
            unter{" "}
            <a
              href={`mailto:${contactEmail}`}
              className="font-semibold text-primary underline-offset-4 hover:underline"
            >
              {contactEmail}
            </a>
            . Wir antworten innerhalb der gesetzlichen Frist von einem Monat.
          </p>
        </Section>
      </main>
    </div>
  );
}
