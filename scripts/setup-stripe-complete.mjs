#!/usr/bin/env node
/**
 * Full Stripe setup for Noor — reads STRIPE_SECRET_KEY from .env.local.
 *
 * Usage: node scripts/setup-stripe-complete.mjs
 *
 * - Creates subscription products/prices (if missing)
 * - Creates production webhook endpoint (if missing)
 * - Writes STRIPE_* vars back to .env.local
 * - Optionally pushes env vars to Vercel (--vercel)
 */

import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import Stripe from "stripe";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = join(root, ".env.local");
const pushVercel = process.argv.includes("--vercel");
const appUrl =
  process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "") ||
  "https://noorhealth.app";
const webhookUrl = `${appUrl}/api/stripe/webhook`;

function parseEnvFile(path) {
  const lines = readFileSync(path, "utf8").split("\n");
  const map = new Map();

  for (const line of lines) {
    if (!line || line.startsWith("#")) continue;
    const index = line.indexOf("=");
    if (index === -1) continue;
    map.set(line.slice(0, index), line.slice(index + 1));
  }

  return map;
}

function writeEnvFile(path, map) {
  const keys = [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
    "ANTHROPIC_API_KEY",
    "GEMINI_API_KEY",
    "NEXT_PUBLIC_APP_URL",
    "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
    "STRIPE_SECRET_KEY",
    "STRIPE_WEBHOOK_SECRET",
    "STRIPE_PRICE_FAMILIE",
    "STRIPE_PRICE_FAMILIE_PLUS",
    "SUPABASE_DB_PASSWORD",
  ];

  const seen = new Set();
  const ordered = [];

  for (const key of keys) {
    if (map.has(key)) {
      ordered.push(`${key}=${map.get(key)}`);
      seen.add(key);
    }
  }

  for (const [key, value] of map.entries()) {
    if (!seen.has(key)) {
      ordered.push(`${key}=${value}`);
    }
  }

  writeFileSync(path, `${ordered.join("\n")}\n`);
}

function addVercelEnv(name, value) {
  for (const target of ["production", "preview", "development"]) {
    try {
      execSync(`npx vercel env add ${name} ${target} --force`, {
        cwd: root,
        input: value,
        stdio: ["pipe", "pipe", "pipe"],
      });
      console.log(`Vercel env set: ${name} (${target})`);
    } catch (error) {
      console.warn(`Vercel env skipped for ${name} (${target})`);
    }
  }
}

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

const webhookEvents = [
  "checkout.session.completed",
  "customer.subscription.updated",
  "customer.subscription.deleted",
];

async function findExistingProduct(stripe, name) {
  const products = await stripe.products.list({ limit: 100, active: true });
  return products.data.find((product) => product.name === name) ?? null;
}

async function findExistingPrice(stripe, productId, unitAmount) {
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

async function ensurePlan(stripe, plan) {
  let product = await findExistingProduct(stripe, plan.name);

  if (!product) {
    product = await stripe.products.create({
      name: plan.name,
      description: plan.description,
    });
    console.log(`Created product: ${product.name}`);
  } else {
    console.log(`Found product: ${product.name}`);
  }

  let price = await findExistingPrice(stripe, product.id, plan.unitAmount);

  if (!price) {
    price = await stripe.prices.create({
      product: product.id,
      currency: "eur",
      unit_amount: plan.unitAmount,
      recurring: { interval: "month" },
    });
    console.log(`Created price for ${plan.name}`);
  } else {
    console.log(`Found price for ${plan.name}`);
  }

  return price.id;
}

async function ensureWebhook(stripe) {
  const existing = await stripe.webhookEndpoints.list({ limit: 100 });
  const match = existing.data.find((endpoint) => endpoint.url === webhookUrl);

  if (match) {
    console.log(`Found webhook: ${webhookUrl}`);
    console.log(
      "If you need the signing secret, create a new endpoint in Stripe Dashboard or delete the old one and re-run this script.",
    );
    return null;
  }

  const endpoint = await stripe.webhookEndpoints.create({
    url: webhookUrl,
    enabled_events: webhookEvents,
    description: "Noor subscription billing",
  });

  console.log(`Created webhook: ${webhookUrl}`);
  return endpoint.secret;
}

async function main() {
  const env = parseEnvFile(envPath);
  const secretKey = env.get("STRIPE_SECRET_KEY")?.trim();

  if (!secretKey) {
    console.error("Missing STRIPE_SECRET_KEY in .env.local");
    process.exit(1);
  }

  const stripe = new Stripe(secretKey, {
    apiVersion: "2025-02-24.acacia",
  });

  console.log("Setting up Stripe products and prices...");
  for (const plan of plans) {
    const priceId = await ensurePlan(stripe, plan);
    env.set(plan.envKey, priceId);
    console.log(`${plan.envKey}=${priceId}`);
  }

  console.log("\nSetting up webhook...");
  const webhookSecret = await ensureWebhook(stripe);
  if (webhookSecret) {
    env.set("STRIPE_WEBHOOK_SECRET", webhookSecret);
    console.log("STRIPE_WEBHOOK_SECRET written to .env.local");
  }

  writeEnvFile(envPath, env);
  console.log("\nUpdated .env.local");

  if (pushVercel) {
    console.log("\nPushing Stripe env vars to Vercel...");
    for (const key of [
      "STRIPE_SECRET_KEY",
      "STRIPE_WEBHOOK_SECRET",
      "STRIPE_PRICE_FAMILIE",
      "STRIPE_PRICE_FAMILIE_PLUS",
      "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
    ]) {
      const value = env.get(key);
      if (value) addVercelEnv(key, value);
    }
  }

  console.log("\nDone. Redeploy production after Vercel env vars are set.");
  console.log(`Pricing page: ${appUrl}/preise`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
