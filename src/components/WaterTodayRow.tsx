"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import { WaterAddSheet } from "@/components/WaterAddSheet";
import { useLanguage } from "@/components/LanguageProvider";
import {
  formatGoalProgressValue,
  getGoalProgressRatio,
} from "@/lib/health-goals-data";

type WaterTodayRowProps = {
  waterLiters: number;
  waterGoalLiters?: number | null;
  isSaving?: boolean;
  error?: string | null;
  statusText?: string;
  statusClassName?: string;
  onQuickAdd: (amount: number) => Promise<boolean>;
  stopPropagation?: boolean;
  className?: string;
};

export function WaterTodayRow({
  waterLiters,
  waterGoalLiters = null,
  isSaving = false,
  error = null,
  statusText,
  statusClassName = "text-sm font-medium text-[#378ADD]",
  onQuickAdd,
  stopPropagation = false,
  className = "",
}: WaterTodayRowProps) {
  const { t } = useLanguage();
  const [sheetOpen, setSheetOpen] = useState(false);

  const hasGoal = waterGoalLiters != null && waterGoalLiters > 0;
  const reached = hasGoal && waterLiters >= waterGoalLiters;
  const progress = hasGoal
    ? getGoalProgressRatio(waterLiters, waterGoalLiters)
    : 0;

  const label =
    statusText ??
    (waterLiters > 0
      ? t("water_saved_today", {
          amount: formatGoalProgressValue(waterLiters, "L", { decimals: 1 }),
        })
      : t("water_card_track"));

  function openSheet(event: React.MouseEvent) {
    if (stopPropagation) {
      event.stopPropagation();
    }
    setSheetOpen(true);
  }

  return (
    <>
      <div className={className}>
        <div className="flex items-center gap-2">
          <span className="text-sm" aria-hidden="true">
            💧
          </span>
          <span className={`min-w-0 flex-1 ${statusClassName}`}>
            {label}
          </span>
          <button
            type="button"
            disabled={isSaving}
            onClick={openSheet}
            className="inline-flex shrink-0 cursor-pointer items-center gap-1 rounded-[20px] border border-[#378ADD] bg-white px-3 py-1 text-xs font-semibold text-[#378ADD] disabled:opacity-60"
          >
            <Plus size={14} strokeWidth={2.5} aria-hidden="true" />
            {t("water_add")}
          </button>
        </div>

        {hasGoal ? (
          <div className="mt-2 h-1 overflow-hidden rounded-sm bg-[#E4E2DB]">
            <div
              className="h-full rounded-sm transition-[width] duration-500 ease-out"
              style={{
                width: `${Math.round(progress * 100)}%`,
                backgroundColor: reached ? "#1D9E75" : "#378ADD",
              }}
            />
          </div>
        ) : null}

        {reached ? (
          <p className="mt-1 text-[11px] font-semibold text-[#1D9E75]" role="status">
            {t("water_goal_reached")}
          </p>
        ) : null}

        {error ? (
          <p className="mt-1 text-[11px] font-medium text-danger" role="alert">
            {error}
          </p>
        ) : null}
      </div>

      <WaterAddSheet
        open={sheetOpen}
        waterLiters={waterLiters}
        waterGoalLiters={waterGoalLiters}
        isSaving={isSaving}
        error={error}
        onClose={() => setSheetOpen(false)}
        onAdd={onQuickAdd}
      />
    </>
  );
}
