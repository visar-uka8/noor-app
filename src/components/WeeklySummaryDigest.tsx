"use client";

import { useLanguage } from "@/components/LanguageProvider";
import type { WeeklySummary } from "@/lib/weekly-summary";

type WeeklySummaryDigestProps = {
  summary: WeeklySummary;
};

export function WeeklySummaryDigest({ summary }: WeeklySummaryDigestProps) {
  const { t } = useLanguage();

  return (
    <div
      className="mt-2 flex flex-wrap items-center gap-3 rounded-[10px] px-3 py-2.5"
      style={{ backgroundColor: "#F7F6F2" }}
      role="status"
    >
      <span
        className="text-xs font-semibold"
        style={{ color: summary.medRate >= 80 ? "#1D9E75" : "#BA7517" }}
      >
        💊 {summary.medRate}%
      </span>
      <span className="text-xs font-semibold text-[#085041]">
        🏃 {summary.activeDays}/7
      </span>
      <span className="text-xs font-semibold text-[#085041]">
        💧 {summary.totalWater.toLocaleString("de-DE")}L
      </span>
      <span className="text-[11px] text-[#88856F]">
        {t("weekly_summary_heading")}
      </span>
    </div>
  );
}
