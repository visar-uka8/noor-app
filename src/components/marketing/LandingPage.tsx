import { headers } from "next/headers";
import Link from "next/link";
import { LandingAuthRedirect } from "@/components/marketing/LandingAuthRedirect";
import { LandingFeatureGridSection } from "@/components/marketing/LandingFeatureGridSection";
import { LandingHeroSection } from "@/components/marketing/LandingHeroSection";
import { LandingHowItWorksSection } from "@/components/marketing/LandingHowItWorksSection";
import { LandingNav } from "@/components/marketing/LandingNav";
import { LandingPassportSection } from "@/components/marketing/LandingPassportSection";
import { PricingSection } from "@/components/marketing/PricingSection";
import { LandingProblemSection } from "@/components/marketing/LandingProblemSection";
import { LandingScrollAnimator } from "@/components/marketing/LandingScrollAnimator";
import { LandingStatsBar } from "@/components/marketing/LandingStatsBar";
import { LandingTestimonialsSection } from "@/components/marketing/LandingTestimonialsSection";
import { SHOW_PRICING } from "@/lib/feature-flags";
import { getMarketingAuthUrls } from "@/lib/site-gate";

export async function LandingPage() {
  const requestHeaders = await headers();
  const host = requestHeaders.get("host") ?? "";
  const { registerUrl, loginUrl } = getMarketingAuthUrls(host);

  return (
    <>
      <LandingAuthRedirect />

      <LandingScrollAnimator>
        <div className="landing-page">
          <LandingNav registerUrl={registerUrl} loginUrl={loginUrl} />

          <LandingHeroSection registerUrl={registerUrl} />

          <LandingStatsBar />
          <LandingProblemSection />
          <LandingFeatureGridSection />
          <LandingHowItWorksSection />
          <LandingTestimonialsSection />
          <LandingPassportSection />
          {SHOW_PRICING ? (
            <PricingSection variant="info" registerUrl={registerUrl} />
          ) : null}

          <FinalCtaSection loginUrl={loginUrl} registerUrl={registerUrl} />
          <FooterSection />
        </div>
      </LandingScrollAnimator>
    </>
  );
}

function FinalCtaSection({
  loginUrl,
  registerUrl,
}: {
  loginUrl: string;
  registerUrl: string;
}) {
  return (
    <section className="landing-cta-section">
      <div className="landing-cta-inner">
        <h2 className="landing-cta-title scroll-animate">
          Starten Sie noch heute.
        </h2>
        <p className="landing-cta-lead">
          Kostenlos. Auf Deutsch. Für Sie und Ihre Familie.
        </p>
        <Link
          href={registerUrl}
          className="landing-cta-button scroll-animate scroll-scale delay-2"
        >
          Jetzt kostenlos starten
        </Link>
        <p className="landing-cta-login">
          Bereits registriert?{" "}
          <Link href={loginUrl} className="landing-cta-login-link">
            Anmelden →
          </Link>
        </p>
        <p className="landing-cta-domain">noorhealth.app</p>
      </div>
    </section>
  );
}

function FooterSection() {
  return (
    <footer className="landing-footer">
      <span className="landing-footer-brand">noor</span>
      <div className="landing-footer-links">
        {SHOW_PRICING ? (
          <Link href="/preise" className="landing-footer-link">
            Preise
          </Link>
        ) : null}
        <Link href="/datenschutz" className="landing-footer-link">
          Datenschutzerklärung
        </Link>
        <Link href="/impressum" className="landing-footer-link">
          Impressum
        </Link>
        <a href="mailto:hallo@noorhealth.de" className="landing-footer-link">
          Kontakt
        </a>
      </div>
      <p className="landing-footer-copyright">
        © 2026 Noor Health. Hamburg, Deutschland.
      </p>
    </footer>
  );
}
