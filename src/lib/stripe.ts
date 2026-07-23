import Stripe from "stripe";
import type { PaidSubscriptionTier } from "@/types/subscription";

let stripeClient: Stripe | null = null;

function createStripeClient() {
  const secretKey = process.env.STRIPE_SECRET_KEY?.trim();

  if (!secretKey) {
    return null;
  }

  return new Stripe(secretKey, {
    apiVersion: "2025-02-24.acacia",
    typescript: true,
  });
}

export function getStripeClient() {
  if (!stripeClient) {
    stripeClient = createStripeClient();
  }

  return stripeClient;
}

/** Server-side Stripe client (null when STRIPE_SECRET_KEY is missing). */
export const stripe = getStripeClient();

export function isStripeConfigured() {
  return Boolean(
    process.env.STRIPE_SECRET_KEY?.trim() &&
      process.env.STRIPE_WEBHOOK_SECRET?.trim() &&
      process.env.STRIPE_PRICE_FAMILIE?.trim() &&
      process.env.STRIPE_PRICE_FAMILIE_PLUS?.trim(),
  );
}

export function getStripePriceId(plan: PaidSubscriptionTier) {
  if (plan === "familie") {
    return process.env.STRIPE_PRICE_FAMILIE?.trim() ?? null;
  }

  return process.env.STRIPE_PRICE_FAMILIE_PLUS?.trim() ?? null;
}

export function tierFromStripePriceId(priceId: string): PaidSubscriptionTier | null {
  const familie = process.env.STRIPE_PRICE_FAMILIE?.trim();
  const familiePlus = process.env.STRIPE_PRICE_FAMILIE_PLUS?.trim();

  if (priceId === familie) return "familie";
  if (priceId === familiePlus) return "familie_plus";
  return null;
}

export function getAppBaseUrl() {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "");
  if (configured && !configured.includes("localhost")) {
    return configured;
  }
  return "https://noorhealth.app";
}
