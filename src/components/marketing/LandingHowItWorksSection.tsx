import {
  Camera,
  MessageCircleHeart,
  UserPlus,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

const sectionLabelStyle = {
  fontSize: "11px",
  fontWeight: 500,
  letterSpacing: "0.1em",
  textTransform: "uppercase" as const,
  color: "#1D9E75",
  marginBottom: "12px",
};

type Step = {
  number: string;
  icon: LucideIcon;
  title: string;
  text: string;
  delay: string;
};

const steps: Step[] = [
  {
    number: "1",
    icon: UserPlus,
    title: "Konto erstellen",
    text: "Kostenlos registrieren — dauert 2 Minuten. Keine Kreditkarte erforderlich.",
    delay: "delay-1",
  },
  {
    number: "2",
    icon: Camera,
    title: "Befund hochladen",
    text: "Einfach ein Foto von Ihrem Laborbefund machen. Oder PDF hochladen.",
    delay: "delay-2",
  },
  {
    number: "3",
    icon: MessageCircleHeart,
    title: "Sofort verstehen",
    text: "Noor erklärt jeden Wert auf einfachem Deutsch — mit konkreten Empfehlungen.",
    delay: "delay-3",
  },
];

export function LandingHowItWorksSection() {
  return (
    <section className="landing-section landing-steps-section">
      <div className="landing-section-inner">
        <div className="landing-section-header landing-steps-header scroll-animate">
          <p style={sectionLabelStyle}>SO EINFACH</p>
          <h2 className="landing-steps-title">In 3 Schritten bereit.</h2>
          <p className="landing-steps-subtitle">
            Kein medizinisches Vorwissen nötig — Noor übersetzt für Sie.
          </p>
        </div>

        <div className="landing-steps-grid">
          {steps.map((step, index) => {
            const Icon = step.icon;

            return (
              <div key={step.number} className={`scroll-animate ${step.delay}`}>
                <div className="landing-step-card">
                  <div className="landing-step-top">
                    <div className="landing-step-circle">{step.number}</div>
                    <span className="landing-step-icon" aria-hidden="true">
                      <Icon size={22} strokeWidth={2.2} />
                    </span>
                  </div>
                  <h3 className="landing-step-title">{step.title}</h3>
                  <p className="landing-step-text">{step.text}</p>
                </div>
                {index < steps.length - 1 ? (
                  <div className="landing-step-connector" aria-hidden="true" />
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
