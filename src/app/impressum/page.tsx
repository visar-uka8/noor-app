import { AppHeader } from "@/components/AppHeader";
import { contactEmail } from "@/lib/app-info";

export default function ImpressumPage() {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <AppHeader showBack backHref="/settings" title="Impressum" />
      <main className="mx-auto w-full max-w-app flex-1 px-5 py-6">
        <section className="noor-card p-5">
          <h2 className="heading-lg">Impressum</h2>
          <dl className="text-body mt-4 space-y-4 text-muted">
            <div>
              <dt className="font-semibold text-foreground">Anbieter</dt>
              <dd className="mt-1">Noor Health GmbH</dd>
            </div>
            <div>
              <dt className="font-semibold text-foreground">Kontakt</dt>
              <dd className="mt-1">
                <a
                  href={`mailto:${contactEmail}`}
                  className="font-semibold text-primary underline-offset-4 hover:underline"
                >
                  {contactEmail}
                </a>
              </dd>
            </div>
            <div>
              <dt className="font-semibold text-foreground">Verantwortlich</dt>
              <dd className="mt-1">
                Noor Health GmbH, Deutschland
              </dd>
            </div>
          </dl>
        </section>
      </main>
    </div>
  );
}
