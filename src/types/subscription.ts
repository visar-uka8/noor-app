export type SubscriptionTier = "free" | "familie" | "familie_plus";

export type SubscriptionStatus =
  | "active"
  | "past_due"
  | "canceled"
  | "unpaid"
  | "trialing";

export type PaidSubscriptionTier = Exclude<SubscriptionTier, "free">;

export type SubscriptionPlanConfig = {
  tier: SubscriptionTier;
  name: string;
  priceLabel: string;
  priceCents: number;
  description: string;
  stripePriceEnvKey: "STRIPE_PRICE_FAMILIE" | "STRIPE_PRICE_FAMILIE_PLUS";
  maxLabAnalysesPerMonth: number | null;
  maxFamilyMembers: number;
  recommended?: boolean;
  features: Array<{ text: string; included: boolean }>;
  ctaLabel: string;
};

export type UserSubscription = {
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  stripeCustomerId: string | null;
  isPaidActive: boolean;
};

export type SubscriptionQuotaCheck = {
  allowed: boolean;
  tier: SubscriptionTier;
  used: number;
  limit: number | null;
  code?: "upgrade_required";
};
