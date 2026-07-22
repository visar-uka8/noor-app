"use client";

import Link from "next/link";
import { useState } from "react";
import { Check, X } from "lucide-react";
import { SUBSCRIPTION_PLANS } from "@/lib/subscription";
import type { PaidSubscriptionTier } from "@/types/subscription";

type PricingSectionProps = {
  checkoutEnabled: boolean;
};

export function PricingSection({ checkoutEnabled }: PricingSectionProps) {
  const [loadingPlan, setLoadingPlan] = useState<PaidSubscriptionTier | null>(
    null,
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function startCheckout(plan: PaidSubscriptionTier) {
    setLoadingPlan(plan);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });

      const payload = (await response.json()) as {
        url?: string;
        error?: string;
      };

      if (response.status === 401) {
        window.location.href = `/login?next=${encodeURIComponent("/preise")}`;
        return;
      }

      if (!response.ok || !payload.url) {
        throw new Error(payload.error ?? "Checkout fehlgeschlagen.");
      }

      window.location.href = payload.url;
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Checkout konnte nicht gestartet werden.",
      );
    } finally {
      setLoadingPlan(null);
    }
  }

  return (
    <section className="landing-pricing-section">
      <div className="landing-pricing-inner">
        <div className="landing-pricing-header">
          <p className="landing-pricing-label">PREISE</p>
          <h1 className="landing-pricing-title">Einfach. Transparent. Fair.</h1>
          <p className="landing-pricing-subtitle">
            Starten Sie kostenlos — upgraden Sie, wenn Noor Teil Ihres
            Familienalltags wird.
          </p>
        </div>

        {errorMessage ? (
          <p className="landing-pricing-error" role="alert">
            {errorMessage}
          </p>
        ) : null}

        <div className="landing-pricing-grid">
          {SUBSCRIPTION_PLANS.map((plan) => {
            const isRecommended = Boolean(plan.recommended);
            const isPaid = plan.tier !== "free";

            return (
              <article
                key={plan.tier}
                className={`landing-pricing-card${
                  isRecommended ? " landing-pricing-card-featured" : ""
                }`}
              >
                {isRecommended ? (
                  <span className="landing-pricing-badge">Empfohlen</span>
                ) : null}

                <div className="landing-pricing-card-head">
                  <h2 className="landing-pricing-plan-name">{plan.name}</h2>
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

                {isPaid ? (
                  <button
                    type="button"
                    className={
                      isRecommended
                        ? "landing-pricing-cta landing-pricing-cta-primary"
                        : "landing-pricing-cta"
                    }
                    disabled={!checkoutEnabled || loadingPlan === plan.tier}
                    onClick={() =>
                      startCheckout(plan.tier as PaidSubscriptionTier)
                    }
                  >
                    {loadingPlan === plan.tier
                      ? "Wird geladen…"
                      : plan.ctaLabel}
                  </button>
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
