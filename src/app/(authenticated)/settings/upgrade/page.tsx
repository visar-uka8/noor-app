import { redirect } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { UpgradePlansScreen } from "@/components/UpgradePlansScreen";
import { SHOW_PRICING } from "@/lib/feature-flags";
import { createClient } from "@/lib/supabase/server";
import { createSupabaseDataClient } from "@/lib/supabase-data";
import { isStripeConfigured } from "@/lib/stripe";
import {
  getUserSubscription,
  resolveEffectiveTier,
} from "@/lib/subscription";

export const dynamic = "force-dynamic";

export default async function UpgradePage() {
  if (!SHOW_PRICING) {
    redirect("/settings");
  }

  let currentTier: "free" | "familie" | "familie_plus" = "free";

  try {
    const authSupabase = await createClient();
    const {
      data: { user },
    } = await authSupabase.auth.getUser();

    if (user) {
      const supabase = createSupabaseDataClient() ?? authSupabase;
      const subscription = await getUserSubscription(supabase, user.id);
      currentTier = resolveEffectiveTier(
        subscription.tier,
        subscription.status,
      );
    }
  } catch {
    // Show upgrade options even if subscription lookup fails.
  }

  return (
    <div className="flex flex-col">
      <AppHeader showBack backHref="/settings" title="Upgrade" />
      <UpgradePlansScreen
        checkoutEnabled={isStripeConfigured()}
        currentTier={currentTier}
      />
    </div>
  );
}
