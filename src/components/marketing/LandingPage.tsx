import Link from "next/link";
import { LandingAuthRedirect } from "@/components/marketing/LandingAuthRedirect";
import { LandingNav } from "@/components/marketing/LandingNav";
import { LandingPhoneMockup } from "@/components/marketing/LandingPhoneMockup";
import { LandingScrollAnimator } from "@/components/marketing/LandingScrollAnimator";
import { LandingStatsBar } from "@/components/marketing/LandingStatsBar";
import { APP_BASE_URL } from "@/lib/site-gate";

const loginUrl = `${APP_BASE_URL}/login`;
const registerUrl = `${APP_BASE_URL}/register`;

const sectionLabelStyle = {
  fontSize: "11px",
  fontWeight: 500,
  letterSpacing: "0.1em",
  textTransform: "uppercase" as const,
  color: "#1D9E75",
  marginBottom: "12px",
};

export function LandingPage() {
  return (
    <>
      <LandingAuthRedirect />

      <LandingScrollAnimator>
        <div className="landing-page">
          <LandingNav />

          <section className="landing-hero">
            <div className="landing-hero-inner">
              <div className="landing-hero-copy">
                <div
                  className="animate-fade-in"
                  style={{
                    display: "inline-block",
                    backgroundColor: "rgba(255,255,255,0.15)",
                    color: "#FFFFFF",
                    borderRadius: "50px",
                    padding: "6px 16px",
                    fontSize: "13px",
                    fontWeight: 500,
                    marginBottom: "20px",
                  }}
                >
                  Jetzt kostenlos verfügbar 🌿
                </div>

                <h1 className="landing-hero-headline">
                  <span className="landing-hero-headline-line animate-fade-up delay-100">
                    Ihre Gesundheit.
                  </span>
                  <br />
                  <span className="landing-hero-headline-line animate-fade-up delay-200">
                    Endlich verständlich.
                  </span>
                </h1>

                <p
                  className="animate-fade-up delay-300"
                  style={{
                    fontSize: "17px",
                    color: "rgba(255,255,255,0.85)",
                    lineHeight: 1.6,
                    maxWidth: "340px",
                    margin: "0 auto 32px",
                  }}
                >
                  Noor erklärt Ihre Laborwerte auf einfachem Deutsch — und gibt
                  Ihrer Familie die Gewissheit, dass es Ihnen gut geht.
                </p>

                <Link
                  href={registerUrl}
                  className="landing-hero-cta animate-fade-up delay-400"
                >
                  Kostenlos starten →
                </Link>

                <p
                  style={{
                    color: "rgba(255,255,255,0.6)",
                    fontSize: "13px",
                    margin: "0 0 28px",
                  }}
                >
                  Keine Kreditkarte erforderlich
                </p>

                <div
                  className="animate-fade-up delay-500"
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    justifyContent: "center",
                    gap: "16px",
                    color: "#FFFFFF",
                    fontSize: "12px",
                  }}
                >
                  <span>✓ Kostenlos starten</span>
                  <span>🔒 DSGVO-konform</span>
                  <span>🇩🇪 Auf Deutsch</span>
                </div>
              </div>

              <div className="landing-hero-mockup animate-fade-in delay-300 phone-float">
                <LandingPhoneMockup />
              </div>
            </div>
          </section>

          <LandingStatsBar />
          <ProblemSection />
          <SolutionSection />
          <HowItWorksSection />
          <TestimonialsSection />
          <PassportSection />

          <FinalCtaSection loginUrl={loginUrl} registerUrl={registerUrl} />
          <FooterSection />
        </div>
      </LandingScrollAnimator>
    </>
  );
}

function ProblemSection() {
  return (
    <section className="landing-section" style={{ backgroundColor: "#FFFFFF" }}>
      <div className="landing-section-inner landing-problem-grid">
        <div className="landing-problem-copy">
          <p className="scroll-animate" style={sectionLabelStyle}>
            DAS PROBLEM
          </p>
          <h2
            className="scroll-animate delay-1"
            style={{
              fontFamily: "var(--font-dm-serif), Georgia, serif",
              fontSize: "28px",
              color: "#085041",
              margin: "0 0 16px",
              fontWeight: 400,
            }}
          >
            Laborwerte sind verwirrend.
          </h2>
          <p
            className="scroll-animate delay-2"
            style={{
              fontSize: "16px",
              color: "#88856F",
              lineHeight: 1.7,
              margin: 0,
            }}
          >
            Sie bekommen einen Umschlag vom Arzt. Darin: Seiten voller Zahlen,
            Abkürzungen und Referenzwerte. Ist das normal? Sollten Sie sich
            Sorgen machen? Müssen Sie sofort den Arzt anrufen?
          </p>
          <div
            style={{
              borderTop: "0.5px solid #E4E2DB",
              margin: "24px 0",
            }}
          />
          <p
            style={{
              fontSize: "16px",
              color: "#88856F",
              lineHeight: 1.7,
              margin: 0,
            }}
          >
            Und Ihre Kinder — die in einer anderen Stadt wohnen — machen sich
            Sorgen. Hat Papa seine Tabletten genommen? Wie waren die letzten
            Blutwerte? Ist alles okay?
          </p>
        </div>

        <blockquote className="landing-problem-quote scroll-animate delay-3">
          <p className="landing-problem-quote-text">
            „Während meine Mutter vor der Operation bewusstlos war, fragte der
            Arzt sie, welche Medikamente sie einnehme. Ich hatte keine Ahnung.“
          </p>
          <footer className="landing-problem-quote-author">
            — Unternehmer aus Hamburg
          </footer>
        </blockquote>
      </div>
    </section>
  );
}

function SolutionSection() {
  const cards = [
    {
      icon: "🧪",
      title: "Laborwerte verstehen",
      text: "Foto vom Befund machen — fertig. Noor erklärt jeden Wert auf einfachem Deutsch. Was ist normal? Was sollte ich beachten? Was kann ich tun?",
      tag: "🟢 KI-Analyse in Sekunden",
      delay: "delay-1",
    },
    {
      icon: "💊",
      title: "Medikamente bestätigen",
      text: "Jeden Morgen tippt Mama auf einen großen grünen Knopf. Ihre Familie sieht sofort — alles okay. Wird eine Dosis vergessen, kommt eine sanfte Erinnerung.",
      tag: "💚 Familie automatisch informiert",
      delay: "delay-2",
    },
    {
      icon: "👨‍👩‍👦",
      title: "Familie verbinden",
      text: "Verbinden Sie sich mit Ihren Eltern oder Kindern. Sehen Sie auf einen Blick wie es ihnen geht — ohne täglich anzurufen. Ruhig. Übersichtlich. Liebevoll.",
      tag: "🔔 Stille Benachrichtigungen",
      delay: "delay-3",
    },
  ];

  return (
    <section className="landing-section" style={{ backgroundColor: "#F7F6F2" }}>
      <div className="landing-section-inner">
        <div className="landing-section-header">
          <p style={sectionLabelStyle}>DIE LÖSUNG</p>
          <h2
            style={{
              fontFamily: "var(--font-dm-serif), Georgia, serif",
              fontSize: "28px",
              color: "#085041",
              margin: "0 0 8px",
              fontWeight: 400,
            }}
          >
            Alles was Sie brauchen.
          </h2>
          <p
            style={{
              fontSize: "16px",
              color: "#88856F",
              margin: 0,
            }}
          >
            Noor begleitet Sie und Ihre Familie — jeden Tag.
          </p>
        </div>

        <div className="landing-card-grid">
          {cards.map((card) => (
            <article
              key={card.title}
              className={`landing-feature-card scroll-animate ${card.delay}`}
            >
              <div
                style={{
                  fontSize: "36px",
                  display: "block",
                  marginBottom: "14px",
                }}
              >
                {card.icon}
              </div>
              <h3
                style={{
                  fontSize: "17px",
                  fontWeight: 600,
                  color: "#085041",
                  margin: "0 0 8px",
                }}
              >
                {card.title}
              </h3>
              <p
                style={{
                  fontSize: "15px",
                  color: "#88856F",
                  lineHeight: 1.6,
                  margin: "0 0 12px",
                }}
              >
                {card.text}
              </p>
              <span
                style={{
                  display: "inline-block",
                  backgroundColor: "#E1F5EE",
                  color: "#085041",
                  borderRadius: "50px",
                  padding: "4px 12px",
                  fontSize: "12px",
                  fontWeight: 500,
                }}
              >
                {card.tag}
              </span>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorksSection() {
  const steps = [
    {
      number: "1",
      title: "Konto erstellen",
      text: "Kostenlos registrieren — dauert 2 Minuten. Keine Kreditkarte erforderlich.",
      delay: "delay-1",
    },
    {
      number: "2",
      title: "Befund hochladen",
      text: "Einfach ein Foto von Ihrem Laborbefund machen. Oder PDF hochladen.",
      delay: "delay-2",
    },
    {
      number: "3",
      title: "Sofort verstehen",
      text: "Noor erklärt jeden Wert auf einfachem Deutsch — mit konkreten Empfehlungen.",
      delay: "delay-3",
    },
  ];

  return (
    <section className="landing-section" style={{ backgroundColor: "#FFFFFF" }}>
      <div className="landing-section-inner">
        <div className="landing-section-header">
          <p style={sectionLabelStyle}>SO EINFACH</p>
          <h2
            style={{
              fontFamily: "var(--font-dm-serif), Georgia, serif",
              fontSize: "28px",
              color: "#085041",
              margin: 0,
              fontWeight: 400,
            }}
          >
            In 3 Schritten bereit.
          </h2>
        </div>

        <div className="landing-steps-grid">
          {steps.map((step, index) => (
            <div key={step.number} className={`scroll-animate ${step.delay}`}>
              <div className="landing-step">
                <div className="landing-step-circle">{step.number}</div>
                <div>
                  <h3 className="landing-step-title">{step.title}</h3>
                  <p
                    style={{
                      fontSize: "15px",
                      color: "#88856F",
                      lineHeight: 1.5,
                      margin: "4px 0 0",
                    }}
                  >
                    {step.text}
                  </p>
                </div>
              </div>
              {index < steps.length - 1 ? (
                <div className="landing-step-connector" aria-hidden="true" />
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function TestimonialsSection() {
  const quotes = [
    {
      text: "Ich würde das definitiv abonnieren für meine Eltern — damit ich sehe ob sie ihre Medikamente nehmen und wie ihre Laborwerte sind.",
      author: "Nachbar aus Hamburg",
      delay: "delay-1",
    },
    {
      text: "Während meine Mutter vor der Operation bewusstlos war, fragte der Arzt sie, welche Medikamente sie einnehme. Ich hatte keine Ahnung.",
      author: "Unternehmer aus Hamburg",
      delay: "delay-2",
    },
    {
      text: "Wir haben jeden Tag Fragen von Patienten was ein Laborwert bedeutet. Das kostet uns viel Zeit.",
      author: "Laborassistent aus Hamburg",
      delay: "delay-3",
    },
  ];

  return (
    <section className="landing-section" style={{ backgroundColor: "#E1F5EE" }}>
      <div className="landing-section-inner">
        <div className="landing-section-header">
          <p style={sectionLabelStyle}>ECHTE ERFAHRUNGEN</p>
          <h2
            style={{
              fontFamily: "var(--font-dm-serif), Georgia, serif",
              fontSize: "28px",
              color: "#085041",
              margin: 0,
              fontWeight: 400,
            }}
          >
            Was Menschen sagen.
          </h2>
        </div>

        <div className="landing-testimonials-grid">
          {quotes.map((quote) => (
            <blockquote
              key={quote.author}
              className={`landing-testimonial-card scroll-animate ${quote.delay}`}
            >
              <p className="landing-testimonial-text">„{quote.text}"</p>
              <footer className="landing-testimonial-author">
                — {quote.author}
              </footer>
            </blockquote>
          ))}
        </div>
      </div>
    </section>
  );
}

function PassportSection() {
  const bullets = [
    "Aktuelle Medikamente",
    "Allergien und Unverträglichkeiten",
    "Impfungen und Impfstatus",
    "Frühere Operationen",
    "Notfallkontakt",
    "QR-Code für Notfall",
  ];

  return (
    <section className="landing-section landing-passport-section">
      <div className="landing-section-inner landing-passport-grid">
        <div className="landing-passport-copy scroll-animate">
          <div className="landing-passport-emoji" aria-hidden="true">
            🏥
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

        <div className="landing-passport-checklist scroll-animate delay-2">
          {bullets.map((item) => (
            <div key={item} className="landing-passport-check-item">
              <span className="landing-passport-check-icon" aria-hidden="true">
                ✓
              </span>
              <span>{item}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
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
        <h2
          className="scroll-animate"
          style={{
            fontFamily: "var(--font-dm-serif), Georgia, serif",
            fontSize: "32px",
            color: "#FFFFFF",
            margin: "0 0 12px",
            fontWeight: 400,
          }}
        >
          Starten Sie noch heute.
        </h2>
        <p
          style={{
            fontSize: "16px",
            color: "rgba(255,255,255,0.75)",
            margin: "0 0 32px",
          }}
        >
          Kostenlos. Auf Deutsch. Für Sie und Ihre Familie.
        </p>
        <Link
          href={registerUrl}
          className="landing-cta-button scroll-animate scroll-scale delay-2"
        >
          Jetzt kostenlos starten
        </Link>
        <p
          style={{
            fontSize: "14px",
            color: "rgba(255,255,255,0.5)",
            margin: "16px 0 0",
          }}
        >
          Bereits registriert?{" "}
          <Link
            href={loginUrl}
            style={{
              color: "rgba(255,255,255,0.7)",
              textDecoration: "none",
              minHeight: "44px",
              display: "inline-flex",
              alignItems: "center",
            }}
          >
            Anmelden →
          </Link>
        </p>
        <p
          style={{
            fontSize: "13px",
            color: "rgba(255,255,255,0.35)",
            margin: "8px 0 0",
          }}
        >
          noorhealth.app
        </p>
      </div>
    </section>
  );
}

function FooterSection() {
  return (
    <footer className="landing-footer">
      <span className="landing-footer-brand">noor</span>
      <div className="landing-footer-links">
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
