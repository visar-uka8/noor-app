"use client";

import { Sparkles } from "lucide-react";
import Link from "next/link";
import { useLanguage } from "@/components/LanguageProvider";
import { SHOW_PRICING } from "@/lib/feature-flags";
import type { SubscriptionTier } from "@/types/subscription";

type ProfileSubscriptionSectionProps = {
  subscriptionTier: SubscriptionTier;
};

function planLabel(
  tier: SubscriptionTier,
  t: ReturnType<typeof useLanguage>["t"],
) {
  if (tier === "familie_plus") {
    return t("plan_familie_plus");
  }

  if (tier === "familie") {
    return t("plan_familie");
  }

  return t("plan_free");
}

export function ProfileSubscriptionSection({
  subscriptionTier,
}: ProfileSubscriptionSectionProps) {
  const { t } = useLanguage();

  if (!SHOW_PRICING) {
    return null;
  }

  return (
    <div className="flex min-h-12 items-center justify-between gap-3 px-5 py-4">
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary-light text-primary">
        <Sparkles size={24} aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-base font-bold text-foreground">
          {planLabel(subscriptionTier, t)}
        </span>
        <span className="mt-1 block text-base leading-snug text-muted">
          {t("current_plan")}
        </span>
      </span>
      {subscriptionTier === "free" ? (
        <Link
          href="/settings/upgrade"
          className="shrink-0 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-dark"
        >
          {t("upgrade")}
        </Link>
      ) : (
        <span className="shrink-0 text-sm font-semibold text-primary">
          {t("subscription_active")}
        </span>
      )}
    </div>
  );
}
