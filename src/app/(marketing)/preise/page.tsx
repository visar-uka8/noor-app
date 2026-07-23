import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { LandingNav } from "@/components/marketing/LandingNav";
import { PricingSection } from "@/components/marketing/PricingSection";
import { SHOW_PRICING } from "@/lib/feature-flags";
import { getMarketingAuthUrls } from "@/lib/site-gate";
import { isStripeConfigured } from "@/lib/stripe";
import type { PaidSubscriptionTier } from "@/types/subscription";

function readPriceId(
  publicKey: string | undefined,
  serverKey: string | undefined,
) {
  return publicKey?.trim() || serverKey?.trim() || "";
}

export const dynamic = "force-dynamic";

export default async function PreisePage() {
  if (!SHOW_PRICING) {
    redirect("/");
  }

  const requestHeaders = await headers();
  const host = requestHeaders.get("host") ?? "";
  const { registerUrl, loginUrl } = getMarketingAuthUrls(host);

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
      <LandingNav registerUrl={registerUrl} loginUrl={loginUrl} />
      <PricingSection
        variant="checkout"
        checkoutEnabled={isStripeConfigured()}
        priceIds={priceIds}
        registerUrl={registerUrl}
      />
    </div>
  );
}
