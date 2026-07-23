"use client";

import {
  formatGoalProgressValue,
  getGoalProgressRatio,
} from "@/lib/health-goals-data";
import { useLanguage } from "@/components/LanguageProvider";
import type { HomeScreenData } from "@/lib/home-screen";

type HomeWaterProgressProps = {
  waterToday: HomeScreenData["waterToday"];
};

export function HomeWaterProgress({ waterToday }: HomeWaterProgressProps) {
  const { t } = useLanguage();
  const { liters, goalLiters } = waterToday;
  const reached = goalLiters > 0 && liters >= goalLiters;
  const progress = getGoalProgressRatio(liters, goalLiters);

  return (
    <div style={{ width: "100%" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "6px",
          gap: "8px",
        }}
      >
        <span
          style={{
            fontSize: "12px",
            fontWeight: 600,
            color: "#085041",
          }}
        >
          💧 {t("water_label")}
        </span>
        <span
          style={{
            fontSize: "12px",
            fontWeight: 600,
            color: reached ? "#1D9E75" : "#88856F",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {formatGoalProgressValue(liters, "L", { decimals: 1 })} /{" "}
          {formatGoalProgressValue(goalLiters, "L", { decimals: 1 })}
        </span>
      </div>

      <div
        aria-hidden="true"
        style={{
          height: "6px",
          borderRadius: "999px",
          backgroundColor: "#E4E2DB",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${Math.round(progress * 100)}%`,
            borderRadius: "999px",
            backgroundColor: reached ? "#1D9E75" : "#378ADD",
            transition: "width 0.25s ease, background-color 0.25s ease",
          }}
        />
      </div>
    </div>
  );
}

const WATER_QUICK_OPTIONS = [
  { value: 0.5, label: "0.5L" },
  { value: 1, label: "1L" },
  { value: 1.5, label: "1.5L" },
  { value: 2, label: "2L" },
  { value: 2.5, label: "2.5L" },
  { value: 3, label: "3L+" },
] as const;

type WaterQuickLogProps = {
  value: number;
  isSaving: boolean;
  error?: string | null;
  onSave: (liters: number) => Promise<void>;
};

function isWaterValueSelected(current: number, option: number) {
  return Math.abs(current - option) < 0.01;
}

export function WaterQuickLog({
  value,
  isSaving,
  error = null,
  onSave,
}: WaterQuickLogProps) {
  const { t } = useLanguage();

  return (
    <div className="mt-5 border-t border-border pt-5">
      <p className="text-base font-semibold text-[#085041]">
        {t("water_prompt")}
      </p>

      <div
        className="mt-3 flex gap-1.5"
        role="group"
        aria-label={t("water_intake_aria")}
      >
        {WATER_QUICK_OPTIONS.map((option) => {
          const selected = isWaterValueSelected(value, option.value);

          return (
            <button
              key={option.label}
              type="button"
              disabled={isSaving}
              aria-pressed={selected}
              onClick={() => void onSave(option.value)}
              className={`min-h-11 flex-1 rounded-xl border px-1 py-2 text-[11px] font-semibold transition-colors disabled:opacity-60 sm:text-xs ${
                selected
                  ? "border-[#378ADD] bg-[#E8F1FB] text-[#085041]"
                  : "border-border bg-background text-foreground hover:border-[#378ADD]/40"
              }`}
              style={{ borderWidth: "0.5px" }}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      {error ? (
        <p className="mt-3 text-sm font-semibold text-danger" role="alert">
          {error}
        </p>
      ) : null}

      {value > 0 && !error ? (
        <p className="mt-3 text-sm font-medium text-[#378ADD]" role="status">
          {t("water_saved_today", {
            amount: formatGoalProgressValue(value, "L", { decimals: 1 }),
          })}
        </p>
      ) : null}
    </div>
  );
}
