import { AppHeader } from "@/components/AppHeader";
import { contactEmail } from "@/lib/app-info";

export default function PrivacyPage() {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <AppHeader showBack backHref="/settings" title="Datenschutz" />
      <main className="mx-auto w-full max-w-app flex-1 px-5 py-6">
        <section className="noor-card p-5">
          <h2 className="heading-lg">Datenschutzerklärung</h2>
          <p className="text-body mt-4 text-muted">
            Noor verarbeitet Ihre Gesundheitsdaten ausschließlich, um Ihnen und
            Ihren Angehörigen eine sichere Übersicht über Medikamente,
            Laborwerte und den Gesundheitspass zu bieten.
          </p>
          <p className="text-body mt-4 text-muted">
            Sie können Ihre Daten jederzeit in den Profileinstellungen
            exportieren oder Ihr Konto vollständig löschen.
          </p>
          <p className="text-body mt-4 text-muted">
            Bei Fragen zum Datenschutz erreichen Sie uns unter{" "}
            <a
              href={`mailto:${contactEmail}`}
              className="font-semibold text-primary underline-offset-4 hover:underline"
            >
              {contactEmail}
            </a>
            .
          </p>
        </section>
      </main>
    </div>
  );
}
