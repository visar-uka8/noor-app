import { redirect } from "next/navigation";
import { LandingNav } from "@/components/marketing/LandingNav";
import { PricingSection } from "@/components/marketing/PricingSection";
import { SHOW_PRICING } from "@/lib/feature-flags";
import { isStripeConfigured } from "@/lib/stripe";
import type { PaidSubscriptionTier } from "@/types/subscription";

function readPriceId(
  publicKey: string | undefined,
  serverKey: string | undefined,
) {
  return publicKey?.trim() || serverKey?.trim() || "";
}

export const dynamic = "force-dynamic";

export default function PreisePage() {
  if (!SHOW_PRICING) {
    redirect("/");
  }

  const priceIds: Record<PaidSubscriptionTier, string> = {
    familie: readPriceId(
      process.env.NEXT_PUBLIC_STRIPE_PRICE_FAMILIE,
      process.env.STRIPE_PRICE_FAMILIE,
    ),
    familie_plus: readPriceId(
      process.env.NEXT_PUBLIC_STRIPE_PRICE_FAMILIE_PLUS,
      process.env.STRIPE_PRICE_FAMILIE_PLUS,
    ),
  };

  return (
    <div className="landing-page">
      <LandingNav />
      <PricingSection
        variant="checkout"
        checkoutEnabled={isStripeConfigured()}
        priceIds={priceIds}
      />
    </div>
  );
}
