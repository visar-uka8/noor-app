import { Check, ShieldPlus } from "lucide-react";
import { LandingPassportQrMock } from "@/components/marketing/LandingMiniMocks";

const bullets = [
  "Aktuelle Medikamente",
  "Allergien und Unverträglichkeiten",
  "Impfungen und Impfstatus",
  "Frühere Operationen",
  "Notfallkontakt",
  "QR-Code für Notfall",
];

export function LandingPassportSection() {
  return (
    <section className="landing-section landing-passport-section">
      <div className="landing-section-inner landing-passport-grid">
        <div className="landing-passport-copy scroll-animate">
          <div className="landing-passport-icon-wrap" aria-hidden="true">
            <ShieldPlus size={32} strokeWidth={2.2} />
          </div>
          <h2 className="landing-passport-headline">
            Ihr digitaler Gesundheitspass.
          </h2>
          <p className="landing-passport-subheadline">
            Immer dabei. Immer aktuell.
          </p>
          <p className="landing-passport-body">
            Im Notfall zählt jede Sekunde. Noor speichert Ihre wichtigsten
            Gesundheitsdaten und zeigt sie mit einem Tippen als QR-Code an.
          </p>
        </div>

        <div className="landing-passport-visual scroll-animate delay-2">
          <LandingPassportQrMock />
          <div className="landing-passport-checklist">
            {bullets.map((item) => (
              <div key={item} className="landing-passport-check-item">
                <span className="landing-passport-check-icon" aria-hidden="true">
                  <Check size={13} strokeWidth={3} />
                </span>
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
