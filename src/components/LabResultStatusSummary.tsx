"use client";

import { getLabAnalysisCounts } from "@/lib/parse-lab-analysis";
import type { LabResultRecord } from "@/types/lab-results";

export function LabResultStatusSummary({ result }: { result: LabResultRecord }) {
  const counts = getLabAnalysisCounts(result.ai_analysis, result);
  const hasCounts = counts.normal + counts.watch + counts.high > 0;

  if (!hasCounts) {
    return (
      <p className="text-body mt-3 text-muted">Analyse verfügbar — tippen zum Ansehen</p>
    );
  }

  return (
    <div
      className="mt-3 flex flex-wrap items-center gap-2"
      aria-label={`${counts.normal} normal, ${counts.watch} beachten, ${counts.high} erhöht`}
    >
      {counts.normal > 0 ? (
        <StatusBadge
          emoji="🟢"
          count={counts.normal}
          label="Normal"
          background="#EAF3DE"
          color="#27500A"
        />
      ) : null}
      {counts.watch > 0 ? (
        <StatusBadge
          emoji="🟡"
          count={counts.watch}
          label="Beachten"
          background="#FAEEDA"
          color="#633806"
        />
      ) : null}
      {counts.high > 0 ? (
        <StatusBadge
          emoji="🔴"
          count={counts.high}
          label="Erhöht"
          background="#FCEBEB"
          color="#791F1F"
        />
      ) : null}
    </div>
  );
}

function StatusBadge({
  emoji,
  count,
  label,
  background,
  color,
}: {
  emoji: string;
  count: number;
  label: string;
  background: string;
  color: string;
}) {
  return (
    <span
      style={{
        background,
        color,
        padding: "2px 8px",
        borderRadius: "20px",
        fontSize: "11px",
        fontWeight: "600",
      }}
    >
      {emoji} {count} {label}
    </span>
  );
}
