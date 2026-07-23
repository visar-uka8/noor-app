"use client";

import { useState } from "react";
import { SHOW_PRICING } from "@/lib/feature-flags";
import type { PaidSubscriptionTier } from "@/types/subscription";

type CheckoutButtonProps = {
  priceId?: string;
  plan?: PaidSubscriptionTier;
  label: string;
  disabled?: boolean;
  className?: string;
  style?: React.CSSProperties;
  returnPath?: string;
};

export function CheckoutButton({
  priceId,
  plan,
  label,
  disabled = false,
  className,
  style,
  returnPath = "/settings/upgrade",
}: CheckoutButtonProps) {
  const [loading, setLoading] = useState(false);

  if (!SHOW_PRICING) {
    return null;
  }

  const canCheckout = Boolean(priceId?.trim() || plan);

  async function handleCheckout() {
    if (!canCheckout) {
      alert(
        "Zahlungen sind noch nicht eingerichtet. Bitte versuchen Sie es später erneut.",
      );
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          priceId?.trim() ? { priceId: priceId.trim() } : { plan },
        ),
      });

      const payload = (await response.json()) as { url?: string; error?: string };

      if (response.status === 401) {
        window.location.href = `/login?next=${encodeURIComponent(returnPath)}`;
        return;
      }

      if (!response.ok || !payload.url) {
        throw new Error(payload.error ?? "Checkout fehlgeschlagen.");
      }

      window.location.href = payload.url;
    } catch (error) {
      console.error("Checkout error:", error);
      alert(
        error instanceof Error
          ? error.message
          : "Zahlung konnte nicht gestartet werden.",
      );
    } finally {
      setLoading(false);
    }
  }

  const useDefaultStyles = !className;

  return (
    <button
      type="button"
      onClick={handleCheckout}
      disabled={disabled || loading}
      className={className}
      style={
        useDefaultStyles
          ? {
              backgroundColor: "#1D9E75",
              color: "#FFFFFF",
              border: "none",
              borderRadius: "50px",
              padding: "14px 32px",
              fontSize: "16px",
              fontWeight: 600,
              cursor: disabled || loading ? "not-allowed" : "pointer",
              opacity: disabled || loading ? 0.7 : 1,
              width: "100%",
              ...style,
            }
          : style
      }
    >
      {loading ? "Wird geladen…" : label}
    </button>
  );
}
