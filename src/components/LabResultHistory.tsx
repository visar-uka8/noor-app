"use client";

import { useEffect, useState } from "react";
import { CardListSkeleton, FeatureEmptyState } from "@/components/AppStates";
import {
  formatLabResultDate,
  getAnalysisPreview,
  type LabResultRecord,
} from "@/types/lab-results";

type LabResultHistoryProps = {
  onSelect: (result: LabResultRecord) => void;
  refreshKey?: number;
};

export function LabResultHistory({ onSelect, refreshKey = 0 }: LabResultHistoryProps) {
  const [results, setResults] = useState<LabResultRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadHistory() {
      setIsLoading(true);

      try {
        const response = await fetch("/api/lab-results");

        if (!response.ok) {
          if (!cancelled) setResults([]);
          return;
        }

        const data = (await response.json()) as { results: LabResultRecord[] };

        if (!cancelled) {
          setResults(data.results ?? []);
        }
      } catch {
        if (!cancelled) setResults([]);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void loadHistory();

    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  return (
    <section className="mt-8" aria-label="Frühere Laborwerte">
      <h2 className="heading-lg mb-4">Frühere Laborwerte</h2>

      {isLoading ? (
        <CardListSkeleton />
      ) : results.length === 0 ? (
        <FeatureEmptyState
          emoji="🧪"
          title="Noch keine Laborwerte"
          subtitle="Laden Sie Ihren ersten Befund hoch — wir erklären alles auf einfachem Deutsch."
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
              <div className="flex items-start justify-between gap-3">
                <p className="text-stat text-heading">
                  {formatLabResultDate(result.created_at)}
                </p>
                <span className="shrink-0 rounded-full bg-primary-light px-3 py-1 text-sm font-semibold text-heading">
                  Analysiert
                </span>
              </div>
              <p className="text-body mt-3 line-clamp-2 whitespace-pre-wrap text-muted">
                {getAnalysisPreview(result.ai_analysis)}
              </p>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
