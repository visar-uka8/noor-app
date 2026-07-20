import {
  FlaskConical,
  Pill,
  ShieldPlus,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import {
  LandingFamilyLinkMock,
  LandingLabExplainMock,
  LandingMedicationMock,
  LandingPassportQrMock,
} from "@/components/marketing/LandingMiniMocks";

const sectionLabelStyle = {
  fontSize: "11px",
  fontWeight: 500,
  letterSpacing: "0.1em",
  textTransform: "uppercase" as const,
  color: "#1D9E75",
  marginBottom: "12px",
};

type FeatureCard = {
  icon: LucideIcon;
  title: string;
  text: string;
  delay: string;
  mock: ReactNode;
};

const features: FeatureCard[] = [
  {
    icon: FlaskConical,
    title: "Laborwerte verstehen",
    text: "Foto vom Befund — Noor erklärt jeden Wert auf einfachem Deutsch.",
    delay: "delay-1",
    mock: <LandingLabExplainMock />,
  },
  {
    icon: Pill,
    title: "Medikamente bestätigen",
    text: "Ein Tipp am Morgen — Ihre Familie sieht sofort, dass alles okay ist.",
    delay: "delay-2",
    mock: <LandingMedicationMock />,
  },
  {
    icon: Users,
    title: "Familie verbinden",
    text: "Eltern und Kinder verbunden — ohne täglich anrufen zu müssen.",
    delay: "delay-3",
    mock: <LandingFamilyLinkMock />,
  },
  {
    icon: ShieldPlus,
    title: "Gesundheitspass",
    text: "Medikamente, Allergien und Notfallkontakt — als QR-Code griffbereit.",
    delay: "delay-4",
    mock: <LandingPassportQrMock />,
  },
];

export function LandingFeatureGridSection() {
  return (
    <section
      id="features"
      className="landing-section landing-features-section"
    >
      <div className="landing-section-inner">
        <div className="landing-section-header landing-features-header scroll-animate">
          <p style={sectionLabelStyle}>Funktionen</p>
          <h2 className="landing-features-title">
            <span>Alles was Sie brauchen,</span>
            <span>um smarter zu pflegen.</span>
          </h2>
          <p className="landing-features-subtitle">
            Noor begleitet Sie und Ihre Familie — jeden Tag.
          </p>
        </div>

        <div className="landing-feature-grid">
          {features.map((feature) => {
            const Icon = feature.icon;

            return (
              <article
                key={feature.title}
                className={`landing-feature-grid-card scroll-animate ${feature.delay}`}
              >
                <span className="landing-feature-grid-icon" aria-hidden="true">
                  <Icon size={26} strokeWidth={2.2} />
                </span>
                <h3 className="landing-feature-grid-title">{feature.title}</h3>
                <p className="landing-feature-grid-text">{feature.text}</p>
                <div className="landing-feature-grid-mock">{feature.mock}</div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
