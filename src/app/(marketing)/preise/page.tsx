import { LandingNav } from "@/components/marketing/LandingNav";
import { PricingSection } from "@/components/marketing/PricingSection";
import { isStripeConfigured } from "@/lib/stripe";

export default function PreisePage() {
  return (
    <div className="landing-page">
      <LandingNav />
      <PricingSection checkoutEnabled={isStripeConfigured()} />
    </div>
  );
}
