import Stripe from "stripe";
import { createSupabaseDataClient } from "@/lib/supabase-data";
import { getStripeClient, tierFromStripePriceId } from "@/lib/stripe";
import {
  findUserIdByStripeCustomerId,
  normalizeSubscriptionStatus,
  updateUserSubscription,
} from "@/lib/subscription";
import type { SubscriptionStatus, SubscriptionTier } from "@/types/subscription";

export const runtime = "nodejs";

function mapStripeSubscriptionStatus(
  status: Stripe.Subscription.Status,
): SubscriptionStatus {
  switch (status) {
    case "active":
    case "trialing":
      return status;
    case "past_due":
      return "past_due";
    case "canceled":
      return "canceled";
    case "unpaid":
      return "unpaid";
    default:
      return "active";
  }
}

async function resolveUserId(
  supabase: NonNullable<ReturnType<typeof createSupabaseDataClient>>,
  params: {
    userId?: string | null;
    customerId?: string | null;
  },
) {
  if (params.userId) {
    return params.userId;
  }

  if (params.customerId) {
    return findUserIdByStripeCustomerId(supabase, params.customerId);
  }

  return null;
}

async function applyPaidSubscription(
  supabase: NonNullable<ReturnType<typeof createSupabaseDataClient>>,
  userId: string,
  tier: SubscriptionTier,
  status: SubscriptionStatus,
  stripeCustomerId?: string | null,
) {
  await updateUserSubscription(supabase, userId, {
    subscriptionTier: tier,
    subscriptionStatus: status,
    stripeCustomerId: stripeCustomerId ?? undefined,
  });
}

async function applyFreeSubscription(
  supabase: NonNullable<ReturnType<typeof createSupabaseDataClient>>,
  userId: string,
) {
  await updateUserSubscription(supabase, userId, {
    subscriptionTier: "free",
    subscriptionStatus: "canceled",
  });
}

export async function POST(request: Request) {
  const stripe = getStripeClient();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();

  if (!stripe || !webhookSecret) {
    return Response.json({ error: "Stripe webhook not configured." }, { status: 503 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return Response.json({ error: "Missing Stripe signature." }, { status: 400 });
  }

  const supabase = createSupabaseDataClient();
  if (!supabase) {
    return Response.json({ error: "Database not configured." }, { status: 503 });
  }

  let event: Stripe.Event;

  try {
    const rawBody = await request.text();
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (error) {
    console.error("Stripe webhook signature verification failed", error);
    return Response.json({ error: "Invalid signature." }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = await resolveUserId(supabase, {
          userId: session.metadata?.userId ?? session.client_reference_id,
          customerId:
            typeof session.customer === "string" ? session.customer : null,
        });
        const plan = session.metadata?.plan;

        if (!userId || (plan !== "familie" && plan !== "familie_plus")) {
          break;
        }

        await applyPaidSubscription(
          supabase,
          userId,
          plan,
          "active",
          typeof session.customer === "string" ? session.customer : null,
        );
        break;
      }

      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = await resolveUserId(supabase, {
          userId: subscription.metadata?.userId,
          customerId:
            typeof subscription.customer === "string"
              ? subscription.customer
              : null,
        });

        if (!userId) {
          break;
        }

        if (
          event.type === "customer.subscription.deleted" ||
          subscription.status === "canceled"
        ) {
          await applyFreeSubscription(supabase, userId);
          break;
        }

        const priceId = subscription.items.data[0]?.price.id;
        const tier =
          (subscription.metadata?.plan === "familie" ||
          subscription.metadata?.plan === "familie_plus"
            ? subscription.metadata.plan
            : priceId
              ? tierFromStripePriceId(priceId)
              : null) ?? "familie";

        await applyPaidSubscription(
          supabase,
          userId,
          tier,
          mapStripeSubscriptionStatus(subscription.status),
          typeof subscription.customer === "string"
            ? subscription.customer
            : null,
        );
        break;
      }

      default:
        break;
    }

    return Response.json({ received: true });
  } catch (error) {
    console.error("Stripe webhook handler failed", error);
    return Response.json({ error: "Webhook handler failed." }, { status: 500 });
  }
}
