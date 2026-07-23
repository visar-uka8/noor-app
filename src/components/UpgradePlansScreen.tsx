"use client";

import { Check } from "lucide-react";
import { CheckoutButton } from "@/components/CheckoutButton";
import { SUBSCRIPTION_PLANS } from "@/lib/subscription";
import type { PaidSubscriptionTier, SubscriptionTier } from "@/types/subscription";

type UpgradePlansScreenProps = {
  checkoutEnabled: boolean;
  currentTier?: SubscriptionTier;
};

export function UpgradePlansScreen({
  checkoutEnabled,
  currentTier = "free",
}: UpgradePlansScreenProps) {
  return (
    <main className="mx-auto flex w-full max-w-app flex-1 flex-col px-5 py-6">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-foreground">
          Wählen Sie Ihren Plan
        </h2>
        <p className="text-body mt-2 text-muted">
          Upgraden Sie für unbegrenzte KI-Analysen, mehr Familienmitglieder und
          alle Noor-Features.
        </p>
      </div>

      {!checkoutEnabled ? (
        <div
          className="mb-4 rounded-2xl border border-warning/30 bg-warning-light px-4 py-3 text-sm text-warning"
          role="alert"
        >
          Zahlungen sind gerade nicht verfügbar. Bitte versuchen Sie es später
          erneut.
        </div>
      ) : null}

      <div className="space-y-4">
        {SUBSCRIPTION_PLANS.map((plan) => {
          const tier = plan.tier;
          const isCurrent = currentTier === tier;
          const isRecommended = Boolean(plan.recommended);
          const isPaid = tier !== "free";
          const paidTier = isPaid ? (tier as PaidSubscriptionTier) : null;

          return (
            <section
              key={plan.tier}
              className={`noor-card p-5${
                isRecommended ? " ring-2 ring-primary/20" : ""
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-lg font-bold text-foreground">
                    {plan.name}
                  </h3>
                  {isCurrent ? (
                    <span className="shrink-0 text-sm font-semibold text-primary">
                      Aktiv ✓
                    </span>
                  ) : isRecommended ? (
                    <span className="shrink-0 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-white">
                      Empfohlen
                    </span>
                  ) : null}
                </div>

                <p className="mt-1 text-base font-semibold text-primary">
                  {plan.priceLabel}
                </p>

                {plan.tier !== "free" ? (
                  <p className="text-body mt-2 text-muted">{plan.description}</p>
                ) : null}
              </div>

              <ul className="mt-4 space-y-2">
                {plan.features.map((feature) =>
                  feature.included ? (
                    <li
                      key={feature.text}
                      className="flex items-start gap-2 text-sm text-foreground"
                    >
                      <Check
                        size={16}
                        className="mt-0.5 shrink-0 text-primary"
                        aria-hidden="true"
                      />
                      <span>{feature.text}</span>
                    </li>
                  ) : null,
                )}
              </ul>

              {paidTier && !isCurrent ? (
                <CheckoutButton
                  plan={paidTier}
                  label={plan.ctaLabel}
                  disabled={!checkoutEnabled}
                  className="btn-primary mt-5 w-full"
                  returnPath="/settings/upgrade"
                />
              ) : null}
            </section>
          );
        })}
      </div>

      <p className="text-body mt-6 text-center text-muted">
        Alle Preise inkl. MwSt. · Jederzeit kündbar · Sichere Zahlung über Stripe
      </p>
    </main>
  );
}
