import { createClient } from "@/lib/supabase/server";
import { createSupabaseDataClient } from "@/lib/supabase-data";
import { SHOW_PRICING } from "@/lib/feature-flags";
import {
  getStripeClient,
  getStripePriceId,
  stripe,
  tierFromStripePriceId,
} from "@/lib/stripe";
import {
  formatSubscriptionSetupError,
  getUserSubscription,
  paidTierFromPlan,
  updateUserSubscription,
} from "@/lib/subscription";
import type { PaidSubscriptionTier } from "@/types/subscription";

export const runtime = "nodejs";

type CheckoutPayload = {
  plan?: unknown;
  priceId?: unknown;
};

function resolvePlanFromPayload(payload: CheckoutPayload): {
  plan: PaidSubscriptionTier;
  priceId: string;
} | null {
  const priceId =
    typeof payload.priceId === "string" ? payload.priceId.trim() : "";

  if (priceId) {
    const plan = tierFromStripePriceId(priceId);
    if (!plan) {
      return null;
    }
    return { plan, priceId };
  }

  const plan = paidTierFromPlan(String(payload.plan ?? ""));
  if (!plan) {
    return null;
  }

  const resolvedPriceId = getStripePriceId(plan);
  if (!resolvedPriceId) {
    return null;
  }

  return { plan, priceId: resolvedPriceId };
}

export async function POST(request: Request) {
  if (!SHOW_PRICING) {
    return Response.json(
      { error: "Zahlungen sind derzeit nicht verfügbar." },
      { status: 404 },
    );
  }

  try {
    const authSupabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await authSupabase.auth.getUser();

    if (authError || !user) {
      return Response.json(
        { error: "Bitte melden Sie sich an, um fortzufahren." },
        { status: 401 },
      );
    }

    const stripeClient = stripe ?? getStripeClient();
    if (!stripeClient) {
      return Response.json(
        {
          error:
            "Zahlungen sind noch nicht eingerichtet. Bitte versuchen Sie es später erneut.",
        },
        { status: 503 },
      );
    }

    const payload = (await request.json()) as CheckoutPayload;
    const resolved = resolvePlanFromPayload(payload);

    if (!resolved) {
      return Response.json({ error: "Ungültiger Tarif." }, { status: 400 });
    }

    const { plan, priceId } = resolved;
    const supabase = createSupabaseDataClient() ?? authSupabase;
    const subscription = await getUserSubscription(supabase, user.id);
    let customerId = subscription.stripeCustomerId;

    if (!customerId) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("first_name, last_name")
        .eq("id", user.id)
        .maybeSingle<{ first_name: string; last_name: string }>();

      const customer = await stripeClient.customers.create({
        email: user.email ?? undefined,
        name: [profile?.first_name, profile?.last_name]
          .filter(Boolean)
          .join(" ")
          .trim() || undefined,
        metadata: {
          supabase_user_id: user.id,
          userId: user.id,
        },
      });
      customerId = customer.id;

      await updateUserSubscription(supabase, user.id, {
        stripeCustomerId: customerId,
      });
    }

    const session = await stripeClient.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ["card"],
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: "https://noorhealth.app/profil?success=true",
      cancel_url: "https://noorhealth.app/preise?cancelled=true",
      client_reference_id: user.id,
      metadata: {
        supabase_user_id: user.id,
        userId: user.id,
        plan,
      },
      subscription_data: {
        metadata: {
          supabase_user_id: user.id,
          userId: user.id,
          plan,
        },
      },
      allow_promotion_codes: true,
      billing_address_collection: "auto",
      locale: "de",
    });

    if (!session.url) {
      return Response.json(
        { error: "Checkout konnte nicht gestartet werden." },
        { status: 500 },
      );
    }

    return Response.json({ url: session.url });
  } catch (error) {
    console.error("Stripe checkout failed", error);
    return Response.json(
      { error: formatSubscriptionSetupError(error) },
      { status: 500 },
    );
  }
}
