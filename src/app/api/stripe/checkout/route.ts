import { createClient } from "@/lib/supabase/server";
import { createSupabaseDataClient } from "@/lib/supabase-data";
import {
  getAppBaseUrl,
  getStripeClient,
  getStripePriceId,
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
};

export async function POST(request: Request) {
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

    const stripe = getStripeClient();
    if (!stripe) {
      return Response.json(
        {
          error:
            "Zahlungen sind noch nicht eingerichtet. Bitte versuchen Sie es später erneut.",
        },
        { status: 503 },
      );
    }

    const payload = (await request.json()) as CheckoutPayload;
    const plan = paidTierFromPlan(String(payload.plan ?? ""));

    if (!plan) {
      return Response.json({ error: "Ungültiger Tarif." }, { status: 400 });
    }

    const priceId = getStripePriceId(plan);
    if (!priceId) {
      return Response.json(
        { error: "Dieser Tarif ist noch nicht konfiguriert." },
        { status: 503 },
      );
    }

    const supabase = createSupabaseDataClient() ?? authSupabase;
    const subscription = await getUserSubscription(supabase, user.id);
    let customerId = subscription.stripeCustomerId;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email ?? undefined,
        metadata: {
          userId: user.id,
        },
      });
      customerId = customer.id;

      await updateUserSubscription(supabase, user.id, {
        stripeCustomerId: customerId,
      });
    }

    const appBaseUrl = getAppBaseUrl();
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appBaseUrl}/settings?checkout=success&plan=${plan}`,
      cancel_url: `${appBaseUrl}/preise?checkout=canceled`,
      client_reference_id: user.id,
      metadata: {
        userId: user.id,
        plan,
      },
      subscription_data: {
        metadata: {
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
