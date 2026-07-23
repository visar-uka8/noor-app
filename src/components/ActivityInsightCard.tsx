"use client";

import { Loader2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useLanguage } from "@/components/LanguageProvider";
import { buildApiAuthHeaders } from "@/lib/api-auth";
import type { ActivityInsightResult } from "@/lib/activity-insight";
import { fetchWithTimeout } from "@/lib/fetch-with-timeout";

type ActivityInsightCardProps = {
  enabled?: boolean;
};

export function ActivityInsightCard({
  enabled = true,
}: ActivityInsightCardProps) {
  const { t } = useLanguage();
  const [insight, setInsight] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(enabled);

  const loadInsight = useCallback(async () => {
    if (!enabled) {
      setInsight(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    try {
      const headers = await buildApiAuthHeaders();
      const response = await fetchWithTimeout("/api/activity-log/insight", {
        credentials: "include",
        headers,
      });

      if (!response.ok) {
        setInsight(null);
        return;
      }

      const payload = (await response.json()) as ActivityInsightResult;

      if (payload.available && payload.insight) {
        setInsight(payload.insight);
      } else {
        setInsight(null);
      }
    } catch {
      setInsight(null);
    } finally {
      setIsLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    void loadInsight();
  }, [loadInsight]);

  if (!enabled) {
    return null;
  }

  if (isLoading) {
    return (
      <div
        style={{
          backgroundColor: "#E1F5EE",
          borderRadius: "16px",
          padding: "16px",
          marginTop: "12px",
          display: "flex",
          alignItems: "center",
          gap: "8px",
          color: "#085041",
          fontSize: "14px",
        }}
      >
        <Loader2 size={16} className="animate-spin" aria-hidden="true" />
        {t("activity_insight_loading")}
      </div>
    );
  }

  if (!insight) {
    return null;
  }

  return (
    <div
      style={{
        backgroundColor: "#E1F5EE",
        borderRadius: "16px",
        padding: "16px",
        marginTop: "12px",
      }}
    >
      <div
        style={{
          fontSize: "13px",
          fontWeight: 600,
          color: "#085041",
          marginBottom: "8px",
        }}
      >
        💡 {t("activity_insight_title")}
      </div>
      <div
        style={{
          fontSize: "14px",
          color: "#1D5B40",
          lineHeight: 1.6,
        }}
      >
        {insight}
      </div>
    </div>
  );
}
