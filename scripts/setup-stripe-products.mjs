#!/usr/bin/env node
/**
 * Create Noor subscription products and prices in Stripe.
 *
 * Usage:
 *   STRIPE_SECRET_KEY=sk_... node scripts/setup-stripe-products.mjs
 *
 * Prints price IDs to add to .env.local / Vercel:
 *   STRIPE_PRICE_FAMILIE=
 *   STRIPE_PRICE_FAMILIE_PLUS=
 */

import Stripe from "stripe";

const secretKey = process.env.STRIPE_SECRET_KEY?.trim();

if (!secretKey) {
  console.error("Missing STRIPE_SECRET_KEY");
  process.exit(1);
}

const stripe = new Stripe(secretKey, {
  apiVersion: "2025-02-24.acacia",
});

const plans = [
  {
    envKey: "STRIPE_PRICE_FAMILIE",
    name: "Noor Familie",
    description:
      "Unbegrenzte KI-Analysen, Familien-Verbindung, alle Features",
    unitAmount: 999,
  },
  {
    envKey: "STRIPE_PRICE_FAMILIE_PLUS",
    name: "Noor Familie Plus",
    description: "Für größere Familien — bis zu 5 verbundene Personen",
    unitAmount: 1499,
  },
];

async function findExistingProduct(name) {
  const products = await stripe.products.list({ limit: 100, active: true });
  return products.data.find((product) => product.name === name) ?? null;
}

async function findExistingPrice(productId, unitAmount) {
  const prices = await stripe.prices.list({
    product: productId,
    active: true,
    limit: 100,
  });

  return (
    prices.data.find(
      (price) =>
        price.type === "recurring" &&
        price.currency === "eur" &&
        price.unit_amount === unitAmount &&
        price.recurring?.interval === "month",
    ) ?? null
  );
}

async function ensurePlan(plan) {
  let product = await findExistingProduct(plan.name);

  if (!product) {
    product = await stripe.products.create({
      name: plan.name,
      description: plan.description,
    });
    console.log(`Created product: ${product.name} (${product.id})`);
  } else {
    console.log(`Found product: ${product.name} (${product.id})`);
  }

  let price = await findExistingPrice(product.id, plan.unitAmount);

  if (!price) {
    price = await stripe.prices.create({
      product: product.id,
      currency: "eur",
      unit_amount: plan.unitAmount,
      recurring: { interval: "month" },
    });
    console.log(`Created price: ${price.id}`);
  } else {
    console.log(`Found price: ${price.id}`);
  }

  console.log(`${plan.envKey}=${price.id}`);
}

async function main() {
  for (const plan of plans) {
    await ensurePlan(plan);
    console.log("");
  }

  console.log("Add the price IDs above to your environment variables.");
  console.log("Then configure a webhook endpoint:");
  console.log("  https://noorhealth.app/api/stripe/webhook");
  console.log("Events: checkout.session.completed, customer.subscription.updated, customer.subscription.deleted");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
