import Image from "next/image";
import { Star } from "lucide-react";
import { marketingTestimonialPeople } from "@/lib/marketing-testimonials";

const sectionLabelStyle = {
  fontSize: "11px",
  fontWeight: 500,
  letterSpacing: "0.1em",
  textTransform: "uppercase" as const,
  color: "#1D9E75",
  marginBottom: "12px",
};

const delays = ["delay-1", "delay-2", "delay-3"] as const;

export function LandingTestimonialsSection() {
  return (
    <section className="landing-section landing-testimonials-section">
      <div className="landing-section-inner">
        <div className="landing-section-header landing-testimonials-header scroll-animate">
          <p style={sectionLabelStyle}>ECHTE ERFAHRUNGEN</p>
          <h2 className="landing-testimonials-title">Was Menschen sagen.</h2>
          <p className="landing-testimonials-subtitle">
            Aus Gesprächen in Hamburg — ehrlich, persönlich, ohne Filter.
          </p>
        </div>

        <div className="landing-testimonials-grid">
          {marketingTestimonialPeople.slice(0, 3).map((person, index) => (
            <blockquote
              key={person.authorLabel}
              className={`landing-testimonial-card scroll-animate ${delays[index]}`}
            >
              <div className="landing-testimonial-head">
                <span className="landing-testimonial-avatar" aria-hidden="true">
                  <Image
                    src={person.avatarSrc}
                    alt=""
                    width={44}
                    height={44}
                    className="landing-testimonial-avatar-photo"
                  />
                </span>
                <div className="landing-testimonial-stars" aria-hidden="true">
                  {Array.from({ length: 5 }).map((_, starIndex) => (
                    <Star
                      key={starIndex}
                      size={14}
                      fill="#1D9E75"
                      color="#1D9E75"
                    />
                  ))}
                </div>
              </div>
              <p className="landing-testimonial-text">„{person.quote}"</p>
              <footer className="landing-testimonial-footer">
                <strong>{person.authorLabel}</strong>
                <span>{person.role}</span>
              </footer>
            </blockquote>
          ))}
        </div>
      </div>
    </section>
  );
}
