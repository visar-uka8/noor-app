import type { SupabaseClient } from "@supabase/supabase-js";
import {
  type PaidSubscriptionTier,
  type SubscriptionPlanConfig,
  type SubscriptionQuotaCheck,
  type SubscriptionStatus,
  type SubscriptionTier,
  type UserSubscription,
} from "@/types/subscription";
import { queryActivePatientWatchers } from "@/lib/family-links-query";

type ProfileSubscriptionRow = {
  subscription_tier: string | null;
  subscription_status: string | null;
  stripe_customer_id: string | null;
};

const ACTIVE_PAID_STATUSES = new Set<SubscriptionStatus>([
  "active",
  "trialing",
]);

export const SUBSCRIPTION_PLANS: SubscriptionPlanConfig[] = [
  {
    tier: "free",
    name: "Basis",
    priceLabel: "Kostenlos",
    priceCents: 0,
    description: "Perfekt zum Ausprobieren",
    stripePriceEnvKey: "STRIPE_PRICE_FAMILIE",
    maxLabAnalysesPerMonth: 3,
    maxFamilyMembers: 1,
    ctaLabel: "Kostenlos starten",
    features: [
      { text: "Medikamente verfolgen", included: true },
      { text: "3 KI-Analysen pro Monat", included: true },
      { text: "1 Familienmitglied verbinden", included: true },
      { text: "Gesundheitspass", included: true },
      { text: "Unbegrenzte Analysen", included: false },
      { text: "Benachrichtigungen", included: false },
      { text: "Wöchentliche Zusammenfassung", included: false },
    ],
  },
  {
    tier: "familie",
    name: "Noor Familie",
    priceLabel: "€9,99/Monat",
    priceCents: 999,
    description: "Unbegrenzte KI-Analysen, Familien-Verbindung, alle Features",
    stripePriceEnvKey: "STRIPE_PRICE_FAMILIE",
    maxLabAnalysesPerMonth: null,
    maxFamilyMembers: 3,
    recommended: true,
    ctaLabel: "Familie starten",
    features: [
      { text: "Alles aus Basis", included: true },
      { text: "Unbegrenzte KI-Analysen", included: true },
      { text: "Bis zu 3 Familienmitglieder", included: true },
      { text: "Benachrichtigungen bei vergessener Dosis", included: true },
      { text: "Wöchentliche Zusammenfassung", included: true },
      { text: "Aktivitätsverfolgung", included: true },
      { text: "Prioritäts-Support", included: true },
    ],
  },
  {
    tier: "familie_plus",
    name: "Noor Familie Plus",
    priceLabel: "€14,99/Monat",
    priceCents: 1499,
    description: "Für größere Familien — bis zu 5 verbundene Personen",
    stripePriceEnvKey: "STRIPE_PRICE_FAMILIE_PLUS",
    maxLabAnalysesPerMonth: null,
    maxFamilyMembers: 5,
    ctaLabel: "Familie Plus starten",
    features: [
      { text: "Alles aus Familie", included: true },
      { text: "Bis zu 5 Familienmitglieder", included: true },
      { text: "Mehrere Patienten verwalten", included: true },
      { text: "Erweiterte Analysehistorie", included: true },
    ],
  },
];

export function normalizeSubscriptionTier(value: string | null | undefined): SubscriptionTier {
  if (value === "familie" || value === "familie_plus") {
    return value;
  }
  return "free";
}

export function normalizeSubscriptionStatus(
  value: string | null | undefined,
): SubscriptionStatus {
  if (
    value === "active" ||
    value === "past_due" ||
    value === "canceled" ||
    value === "unpaid" ||
    value === "trialing"
  ) {
    return value;
  }
  return "active";
}

export function getPlanConfig(tier: SubscriptionTier) {
  return SUBSCRIPTION_PLANS.find((plan) => plan.tier === tier) ?? SUBSCRIPTION_PLANS[0];
}

export function getFamilyMemberLimit(tier: SubscriptionTier) {
  return getPlanConfig(tier).maxFamilyMembers;
}

export function getLabAnalysisLimit(tier: SubscriptionTier) {
  return getPlanConfig(tier).maxLabAnalysesPerMonth;
}

export function isPaidTierActive(
  tier: SubscriptionTier,
  status: SubscriptionStatus,
) {
  if (tier === "free") {
    return false;
  }
  return ACTIVE_PAID_STATUSES.has(status);
}

export function resolveEffectiveTier(
  tier: SubscriptionTier,
  status: SubscriptionStatus,
): SubscriptionTier {
  if (isPaidTierActive(tier, status)) {
    return tier;
  }
  return "free";
}

function startOfCurrentMonthUtc() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
}

export async function getUserSubscription(
  supabase: SupabaseClient,
  userId: string,
): Promise<UserSubscription> {
  const { data, error } = await supabase
    .from("profiles")
    .select("subscription_tier, subscription_status, stripe_customer_id")
    .eq("id", userId)
    .maybeSingle<ProfileSubscriptionRow>();

  if (error) {
    throw error;
  }

  const tier = normalizeSubscriptionTier(data?.subscription_tier);
  const status = normalizeSubscriptionStatus(data?.subscription_status);

  return {
    tier,
    status,
    stripeCustomerId: data?.stripe_customer_id ?? null,
    isPaidActive: isPaidTierActive(tier, status),
  };
}

export async function countLabAnalysesThisMonth(
  supabase: SupabaseClient,
  userId: string,
) {
  const { count, error } = await supabase
    .from("lab_results")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", startOfCurrentMonthUtc());

  if (error) {
    throw error;
  }

  return count ?? 0;
}

export async function checkLabAnalysisQuota(
  supabase: SupabaseClient,
  userId: string,
): Promise<SubscriptionQuotaCheck> {
  const subscription = await getUserSubscription(supabase, userId);
  const effectiveTier = resolveEffectiveTier(
    subscription.tier,
    subscription.status,
  );
  const limit = getLabAnalysisLimit(effectiveTier);

  if (limit === null) {
    return {
      allowed: true,
      tier: effectiveTier,
      used: 0,
      limit: null,
    };
  }

  const used = await countLabAnalysesThisMonth(supabase, userId);

  if (used >= limit) {
    return {
      allowed: false,
      tier: effectiveTier,
      used,
      limit,
      code: "upgrade_required",
    };
  }

  return {
    allowed: true,
    tier: effectiveTier,
    used,
    limit,
  };
}

export async function checkFamilyMemberQuota(
  supabase: SupabaseClient,
  patientId: string,
): Promise<SubscriptionQuotaCheck> {
  const subscription = await getUserSubscription(supabase, patientId);
  const effectiveTier = resolveEffectiveTier(
    subscription.tier,
    subscription.status,
  );
  const limit = getFamilyMemberLimit(effectiveTier);
  const watchers = await queryActivePatientWatchers(supabase, patientId);
  const used = watchers.length;

  if (used >= limit) {
    return {
      allowed: false,
      tier: effectiveTier,
      used,
      limit,
      code: "upgrade_required",
    };
  }

  return {
    allowed: true,
    tier: effectiveTier,
    used,
    limit,
  };
}

export async function updateUserSubscription(
  supabase: SupabaseClient,
  userId: string,
  updates: {
    subscriptionTier?: SubscriptionTier;
    subscriptionStatus?: SubscriptionStatus;
    stripeCustomerId?: string | null;
  },
) {
  const payload: Record<string, string | null> = {};

  if (updates.subscriptionTier !== undefined) {
    payload.subscription_tier = updates.subscriptionTier;
  }
  if (updates.subscriptionStatus !== undefined) {
    payload.subscription_status = updates.subscriptionStatus;
  }
  if (updates.stripeCustomerId !== undefined) {
    payload.stripe_customer_id = updates.stripeCustomerId;
  }

  const { error } = await supabase
    .from("profiles")
    .update(payload)
    .eq("id", userId);

  if (error) {
    throw error;
  }
}

export async function findUserIdByStripeCustomerId(
  supabase: SupabaseClient,
  stripeCustomerId: string,
) {
  const { data, error } = await supabase
    .from("profiles")
    .select("id")
    .eq("stripe_customer_id", stripeCustomerId)
    .maybeSingle<{ id: string }>();

  if (error) {
    throw error;
  }

  return data?.id ?? null;
}

export function paidTierFromPlan(plan: string): PaidSubscriptionTier | null {
  if (plan === "familie" || plan === "familie_plus") {
    return plan;
  }
  return null;
}
