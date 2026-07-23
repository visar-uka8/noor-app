"use client";

import Link from "next/link";
import { Check, X } from "lucide-react";
import { CheckoutButton } from "@/components/CheckoutButton";
import { SHOW_PRICING } from "@/lib/feature-flags";
import { SUBSCRIPTION_PLANS } from "@/lib/subscription";
import type { PaidSubscriptionTier } from "@/types/subscription";

type PricingSectionProps = {
  variant?: "info" | "checkout";
  checkoutEnabled?: boolean;
  priceIds?: Record<PaidSubscriptionTier, string>;
  registerUrl?: string;
};

export function PricingSection({
  variant = "checkout",
  checkoutEnabled = false,
  priceIds = { familie: "", familie_plus: "" },
  registerUrl = "/register",
}: PricingSectionProps) {
  if (!SHOW_PRICING) {
    return null;
  }

  const isInfo = variant === "info";
  const TitleTag = isInfo ? "h2" : "h1";

  return (
    <section
      id={isInfo ? "preise" : undefined}
      className="landing-pricing-section"
    >
      <div className="landing-pricing-inner">
        <div className="landing-pricing-header">
          <p className="landing-pricing-label scroll-animate">PREISE</p>
          <TitleTag className="landing-pricing-title scroll-animate delay-1">
            Einfach. Transparent. Fair.
          </TitleTag>
          <p className="landing-pricing-subtitle scroll-animate delay-2">
            Starten Sie kostenlos — upgraden Sie, wenn Noor Teil Ihres
            Familienalltags wird.
          </p>
        </div>

        {!isInfo && !checkoutEnabled ? (
          <p className="landing-pricing-error" role="alert">
            Zahlungen sind gerade nicht verfügbar. Bitte versuchen Sie es später
            erneut.
          </p>
        ) : null}

        <div className="landing-pricing-grid">
          {SUBSCRIPTION_PLANS.map((plan) => {
            const isRecommended = Boolean(plan.recommended);
            const isPaid = plan.tier !== "free";
            const paidTier = isPaid ? (plan.tier as PaidSubscriptionTier) : null;

            return (
              <article
                key={plan.tier}
                className={`landing-pricing-card scroll-animate${
                  isRecommended ? " landing-pricing-card-featured" : ""
                }`}
              >
                <div className="landing-pricing-card-head">
                  <div className="landing-pricing-plan-name-row">
                    <h3 className="landing-pricing-plan-name">{plan.name}</h3>
                    {isRecommended ? (
                      <span className="landing-pricing-badge-inline">
                        Empfohlen
                      </span>
                    ) : null}
                  </div>
                  <p className="landing-pricing-price">{plan.priceLabel}</p>
                  {plan.tier !== "free" ? (
                    <p className="landing-pricing-description">
                      {plan.description}
                    </p>
                  ) : null}
                </div>

                <ul className="landing-pricing-features">
                  {plan.features.map((feature) => (
                    <li
                      key={feature.text}
                      className={
                        feature.included
                          ? "landing-pricing-feature"
                          : "landing-pricing-feature landing-pricing-feature-muted"
                      }
                    >
                      {feature.included ? (
                        <Check size={16} aria-hidden="true" />
                      ) : (
                        <X size={16} aria-hidden="true" />
                      )}
                      <span>{feature.text}</span>
                    </li>
                  ))}
                </ul>

                {isInfo ? (
                  paidTier ? (
                    <Link
                      href="/preise"
                      className={
                        isRecommended
                          ? "landing-pricing-cta landing-pricing-cta-primary"
                          : "landing-pricing-cta"
                      }
                    >
                      Mehr erfahren →
                    </Link>
                  ) : (
                    <Link
                      href="/register"
                      className="landing-pricing-cta landing-pricing-cta-secondary"
                    >
                      Kostenlos starten
                    </Link>
                  )
                ) : paidTier ? (
                  <CheckoutButton
                    plan={paidTier}
                    priceId={priceIds[paidTier]}
                    label={plan.ctaLabel}
                    disabled={!checkoutEnabled}
                    className={
                      isRecommended
                        ? "landing-pricing-cta landing-pricing-cta-primary"
                        : "landing-pricing-cta"
                    }
                    returnPath="/preise"
                  />
                ) : (
                  <Link
                    href="/register"
                    className="landing-pricing-cta landing-pricing-cta-secondary"
                  >
                    {plan.ctaLabel}
                  </Link>
                )}
              </article>
            );
          })}
        </div>

        <p className="landing-pricing-footnote">
          Alle Preise inkl. MwSt. · Jederzeit kündbar · Sichere Zahlung über
          Stripe
        </p>
      </div>
    </section>
  );
}
