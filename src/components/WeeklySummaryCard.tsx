"use client";

import { useLanguage } from "@/components/LanguageProvider";
import { getWeeklySummaryMessageKey } from "@/lib/weekly-summary";
import type { WeeklySummary } from "@/lib/weekly-summary";

type WeeklySummaryCardProps = {
  summary: WeeklySummary;
};

export function WeeklySummaryCard({ summary }: WeeklySummaryCardProps) {
  const { t } = useLanguage();
  const messageKey = getWeeklySummaryMessageKey(summary.medRate);

  return (
    <section
      className="mb-3 rounded-2xl p-4 text-white"
      style={{ backgroundColor: "#085041" }}
      aria-label={t("weekly_summary_heading")}
    >
      <h2
        className="mb-3 text-xs font-medium uppercase tracking-[0.08em]"
        style={{ color: "rgba(255,255,255,0.6)" }}
      >
        {t("weekly_summary_heading")}
      </h2>

      <div className="grid grid-cols-3 gap-3">
        <SummaryStat
          value={`${summary.medRate}%`}
          label={t("weekly_summary_meds")}
          valueColor={summary.medRate >= 80 ? "#4ADE80" : "#FCD34D"}
        />
        <SummaryStat
          value={`${summary.activeDays}/7`}
          label={t("weekly_summary_active_days")}
        />
        <SummaryStat
          value={`${summary.totalWater.toLocaleString("de-DE")}L`}
          label={t("weekly_summary_water")}
        />
      </div>

      <p
        className="mt-3.5 rounded-[10px] px-3 py-2.5 text-[13px] leading-relaxed"
        style={{
          backgroundColor: "rgba(255,255,255,0.1)",
          color: "rgba(255,255,255,0.85)",
        }}
      >
        {t(messageKey)}
      </p>
    </section>
  );
}

function SummaryStat({
  value,
  label,
  valueColor = "#FFFFFF",
}: {
  value: string;
  label: string;
  valueColor?: string;
}) {
  return (
    <div className="text-center">
      <div
        className="text-2xl font-bold"
        style={{ color: valueColor, fontVariantNumeric: "tabular-nums" }}
      >
        {value}
      </div>
      <div
        className="mt-1 text-[11px]"
        style={{ color: "rgba(255,255,255,0.6)" }}
      >
        {label}
      </div>
    </div>
  );
}
