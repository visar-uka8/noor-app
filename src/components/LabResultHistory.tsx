"use client";

import { useEffect, useState } from "react";
import { CardListSkeleton, FeatureEmptyState } from "@/components/AppStates";
import { LabResultStatusSummary } from "@/components/LabResultStatusSummary";
import { useLanguage } from "@/components/LanguageProvider";
import { formatLocalizedDate } from "@/lib/i18n/messages";
import type { LabResultRecord } from "@/types/lab-results";

type LabResultHistoryProps = {
  onSelect: (result: LabResultRecord) => void;
  refreshKey?: number;
  resultsEndpoint?: string;
};

export function LabResultHistory({
  onSelect,
  refreshKey = 0,
  resultsEndpoint = "/api/lab-results",
}: LabResultHistoryProps) {
  const { language, t } = useLanguage();
  const [results, setResults] = useState<LabResultRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadHistory() {
      setIsLoading(true);

      try {
        const response = await fetch(resultsEndpoint, {
          credentials: "include",
        });

        if (!response.ok) {
          const body = await response.text();
          console.error("Lab history fetch failed", response.status, body);
          if (!cancelled) setResults([]);
          return;
        }

        const data = (await response.json()) as { results?: LabResultRecord[] };

        if (!cancelled) {
          setResults(data?.results ?? []);
        }
      } catch (error) {
        console.error("Lab history fetch error:", error);
        if (!cancelled) setResults([]);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void loadHistory();

    return () => {
      cancelled = true;
    };
  }, [refreshKey, resultsEndpoint]);

  return (
    <section className="mt-8" aria-label={t("lab.historyTitle")}>
      <h2 className="heading-lg mb-4">{t("lab.historyTitle")}</h2>

      {isLoading ? (
        <CardListSkeleton />
      ) : results.length === 0 ? (
        <FeatureEmptyState
          emoji="🧪"
          title={t("lab.historyEmptyTitle")}
          subtitle={t("lab.historyEmptySubtitle")}
        />
      ) : (
        <div className="flex flex-col gap-3">
          {results.map((result) => (
            <button
              key={result.id}
              type="button"
              onClick={() => onSelect(result)}
              className="noor-card btn-touch min-h-12 p-4 text-left transition-colors hover:border-primary/30 active:scale-[0.99]"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-stat min-w-[110px] whitespace-nowrap text-heading">
                  {formatLocalizedDate(language, result.created_at)}
                </p>
                <span className="shrink-0 whitespace-nowrap rounded-full bg-primary-light px-3 py-1 text-sm font-semibold text-heading">
                  {t("lab.analyzed")}
                </span>
              </div>
              <LabResultStatusSummary result={result} />
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
