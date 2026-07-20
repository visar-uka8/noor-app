import { Quote } from "lucide-react";
import {
  LandingFamilyWorryMock,
  LandingLabReportMock,
} from "@/components/marketing/LandingMiniMocks";

const sectionLabelStyle = {
  fontSize: "11px",
  fontWeight: 500,
  letterSpacing: "0.1em",
  textTransform: "uppercase" as const,
  color: "#1D9E75",
  marginBottom: "12px",
};

export function LandingProblemSection() {
  return (
    <section className="landing-section landing-problem-section">
      <div className="landing-section-inner landing-problem-grid">
        <div className="landing-problem-copy">
          <p className="scroll-animate" style={sectionLabelStyle}>
            DAS PROBLEM
          </p>
          <h2 className="landing-problem-title scroll-animate delay-1">
            Laborwerte sind verwirrend.
          </h2>
          <p className="landing-problem-text scroll-animate delay-2">
            Sie bekommen einen Umschlag vom Arzt. Darin: Seiten voller Zahlen,
            Abkürzungen und Referenzwerte. Ist das normal? Sollten Sie sich
            Sorgen machen? Müssen Sie sofort den Arzt anrufen?
          </p>
          <div className="landing-problem-divider" />
          <p className="landing-problem-text scroll-animate delay-2">
            Und Ihre Kinder — die in einer anderen Stadt wohnen — machen sich
            Sorgen. Hat Papa seine Tabletten genommen? Wie waren die letzten
            Blutwerte? Ist alles okay?
          </p>
        </div>

        <div className="landing-problem-visuals scroll-animate delay-3">
          <LandingLabReportMock />
          <LandingFamilyWorryMock />

          <blockquote className="landing-problem-quote">
            <Quote
              size={28}
              className="landing-problem-quote-mark"
              aria-hidden="true"
            />
            <p className="landing-problem-quote-text">
              „Während meine Mutter vor der Operation bewusstlos war, fragte der
              Arzt sie, welche Medikamente sie einnehme. Ich hatte keine Ahnung.“
            </p>
            <footer className="landing-problem-quote-author">
              — Unternehmer aus Hamburg
            </footer>
          </blockquote>
        </div>
      </div>
    </section>
  );
}
