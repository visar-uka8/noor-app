import Image from "next/image";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import { LandingPhoneMockup } from "@/components/marketing/LandingPhoneMockup";
import { marketingHeroTrustPeople } from "@/lib/marketing-testimonials";

type LandingHeroSectionProps = {
  registerUrl: string;
};

export function LandingHeroSection({ registerUrl }: LandingHeroSectionProps) {
  return (
    <section className="landing-hero">
      <div className="landing-hero-glow landing-hero-glow-left" aria-hidden="true" />
      <div className="landing-hero-glow landing-hero-glow-right" aria-hidden="true" />

      <div className="landing-hero-inner">
        <div className="landing-hero-copy">
          <div className="landing-hero-badge animate-fade-in">
            <Sparkles size={14} aria-hidden="true" />
            Jetzt kostenlos verfügbar
          </div>

          <h1 className="landing-hero-headline">
            <span className="landing-hero-headline-line animate-fade-up delay-100">
              Ihre Gesundheit.
            </span>
            <span className="landing-hero-headline-line animate-fade-up delay-200">
              Endlich verständlich.
            </span>
          </h1>

          <p className="landing-hero-lead animate-fade-up delay-300">
            Noor erklärt Ihre Laborwerte auf einfachem Deutsch — und gibt Ihrer
            Familie die Gewissheit, dass es Ihnen gut geht.
          </p>

          <div className="landing-hero-actions animate-fade-up delay-400">
            <Link href={registerUrl} className="landing-hero-cta-primary">
              Kostenlos starten
            </Link>
            <a href="#features" className="landing-hero-cta-secondary">
              Funktionen ansehen
            </a>
          </div>

          <p className="landing-hero-note animate-fade-up delay-400">
            Keine Kreditkarte erforderlich
          </p>

          <div className="landing-hero-trust animate-fade-up delay-500">
            <div className="landing-hero-trust-avatars" aria-hidden="true">
              {marketingHeroTrustPeople.map((person, index) => (
                <span
                  key={person.name}
                  className="landing-hero-trust-avatar"
                  style={{ zIndex: marketingHeroTrustPeople.length - index }}
                  title={person.name}
                >
                  <Image
                    src={person.avatarSrc}
                    alt=""
                    width={36}
                    height={36}
                    className="landing-hero-trust-avatar-photo"
                  />
                </span>
              ))}
            </div>
            <div className="landing-hero-trust-copy">
              <strong className="landing-hero-trust-title">Für Eltern &amp; Kinder</strong>
              <span className="landing-hero-trust-detail">
                Kostenlos · Auf Deutsch · DSGVO-konform
              </span>
            </div>
          </div>
        </div>

        <div className="landing-hero-mockup-wrap animate-fade-in delay-300 phone-float">
          <LandingPhoneMockup />
        </div>
      </div>
    </section>
  );
}
