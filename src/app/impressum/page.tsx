import { AppHeader } from "@/components/AppHeader";
import { contactEmail } from "@/lib/app-info";
import { PublicPageShell } from "@/components/PublicPageShell";

// TODO: Vor dem Start mit echten Nutzern die Platzhalter
// (Adresse, Telefonnummer) mit echten Angaben ersetzen — §5 TMG.

export default function ImpressumPage() {
  return (
    <PublicPageShell>
      <div className="flex flex-col">
      <AppHeader showBack backHref="/settings" title="Impressum" />
      <main className="mx-auto w-full max-w-app flex-1 px-5 py-6">
        <section className="noor-card p-5">
          <h2 className="heading-lg">Impressum</h2>
          <p className="mt-2 text-sm text-muted">Angaben gemäß § 5 TMG</p>

          <dl className="text-body mt-5 space-y-5 text-muted">
            <div>
              <dt className="font-semibold text-foreground">
                Anbieter / Verantwortlich
              </dt>
              <dd className="mt-1">Visar Uka</dd>
            </div>

            <div>
              <dt className="font-semibold text-foreground">Anschrift</dt>
              <dd className="mt-1">
                [Straße und Hausnummer]
                <br />
                [PLZ und Ort]
                <br />
                Deutschland
              </dd>
            </div>

            <div>
              <dt className="font-semibold text-foreground">Kontakt</dt>
              <dd className="mt-1">
                E-Mail:{" "}
                <a
                  href={`mailto:${contactEmail}`}
                  className="font-semibold text-primary underline-offset-4 hover:underline"
                >
                  {contactEmail}
                </a>
                <br />
                Telefon: [Telefonnummer]
              </dd>
            </div>

            <div>
              <dt className="font-semibold text-foreground">
                Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV
              </dt>
              <dd className="mt-1">
                Visar Uka
                <br />
                [Anschrift wie oben]
              </dd>
            </div>
          </dl>

          <div className="mt-6 border-t border-border pt-5">
            <h3 className="text-base font-bold text-foreground">
              Haftungsausschluss
            </h3>
            <p className="text-body mt-2 text-muted">
              Noor ist ein Gesundheitsbegleiter und ersetzt keine ärztliche
              Beratung, Diagnose oder Behandlung. Alle KI-generierten
              Erklärungen dienen ausschließlich der allgemeinen Information.
              Bei gesundheitlichen Fragen wenden Sie sich bitte immer an Ihren
              Arzt oder Apotheker.
            </p>
          </div>
        </section>
      </main>
      </div>
    </PublicPageShell>
  );
}
