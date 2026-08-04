"use client";

import { Loader2 } from "lucide-react";
import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import { useLanguage } from "@/components/LanguageProvider";
import {
  formatGoalProgressValue,
  getGoalProgressRatio,
} from "@/lib/health-goals-data";

const WATER_ADD_OPTIONS = [
  { amount: 0.25, emoji: "🥛" },
  { amount: 0.5, emoji: "🍶" },
  { amount: 0.75, emoji: "💧" },
  { amount: 1, emoji: "🫗" },
  { amount: 1.5, emoji: "🥤" },
  { amount: 2, emoji: "🍾" },
] as const;

type WaterAddSheetProps = {
  open: boolean;
  waterLiters: number;
  waterGoalLiters?: number | null;
  isSaving: boolean;
  error?: string | null;
  onClose: () => void;
  onAdd: (amount: number) => Promise<boolean>;
};

export function WaterAddSheet({
  open,
  waterLiters,
  waterGoalLiters,
  isSaving,
  error = null,
  onClose,
  onAdd,
}: WaterAddSheetProps) {
  const { t } = useLanguage();
  const titleId = useId();
  const [mounted, setMounted] = useState(false);
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [justAdded, setJustAdded] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) {
      setSelectedAmount(null);
      setValidationError(null);
      setJustAdded(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  if (!open || !mounted || typeof document === "undefined") {
    return null;
  }

  const hasGoal = waterGoalLiters != null && waterGoalLiters > 0;
  const formattedToday = formatGoalProgressValue(waterLiters, "L", {
    decimals: 1,
  });
  const progress = hasGoal
    ? getGoalProgressRatio(waterLiters, waterGoalLiters)
    : 0;
  const reached = hasGoal && waterLiters >= waterGoalLiters;

  async function handleSave() {
    if (selectedAmount == null) {
      setValidationError(t("water_select_amount"));
      return;
    }

    setValidationError(null);
    const success = await onAdd(selectedAmount);
    if (success) {
      setSelectedAmount(null);
      setJustAdded(true);
      window.setTimeout(() => setJustAdded(false), 1500);
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-end justify-center bg-black/30"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="w-full max-w-app rounded-t-[20px] bg-white p-6"
        style={{ paddingBottom: "calc(24px + env(safe-area-inset-bottom))" }}
        onClick={(event) => event.stopPropagation()}
        onPointerDown={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <h2 id={titleId} className="text-lg font-semibold text-[#085041]">
          {t("water_sheet_title")}
        </h2>

        <p className="mt-1.5 text-sm font-medium text-[#378ADD]">
          {hasGoal
            ? t("water_sheet_today", {
                current: formattedToday.replace(" L", ""),
                goal: formatGoalProgressValue(waterGoalLiters, "L", {
                  decimals: 1,
                }).replace(" L", ""),
              })
            : waterLiters > 0
              ? t("water_saved_today", { amount: formattedToday })
              : t("water_card_track")}
        </p>

        {hasGoal ? (
          <div className="my-4">
            <div className="h-2 overflow-hidden rounded-full bg-[#E4E2DB]">
              <div
                className="h-full rounded-full transition-[width] duration-500 ease-out"
                style={{
                  width: `${Math.round(progress * 100)}%`,
                  backgroundColor: reached ? "#1D9E75" : "#378ADD",
                }}
              />
            </div>
            {reached ? (
              <p className="mt-2 text-center text-xs font-semibold text-[#1D9E75]">
                {t("water_goal_reached")}
              </p>
            ) : null}
          </div>
        ) : null}

        {justAdded ? (
          <p
            className="mb-3 text-center text-sm font-semibold text-[#1D9E75]"
            role="status"
          >
            {t("water_added_confirm")}
          </p>
        ) : null}

        {validationError || error ? (
          <p className="mb-3 text-sm font-semibold text-danger" role="alert">
            {validationError ?? error}
          </p>
        ) : null}

        <p className="mb-2 text-xs font-medium text-[#88856F]">
          {t("water_select_prompt")}
        </p>

        <div
          className="grid grid-cols-3 gap-2.5"
          role="radiogroup"
          aria-label={t("water_select_prompt")}
        >
          {WATER_ADD_OPTIONS.map((option) => {
            const selected = selectedAmount === option.amount;

            return (
              <button
                key={option.amount}
                type="button"
                disabled={isSaving}
                role="radio"
                aria-checked={selected}
                onClick={() => {
                  setSelectedAmount(option.amount);
                  setValidationError(null);
                }}
                className={`cursor-pointer rounded-2xl border px-2 py-3.5 text-center transition-colors disabled:opacity-60 ${
                  selected
                    ? "border-[#378ADD] bg-[#E8F1FB]"
                    : "border-[#E4E2DB] bg-[#F7F6F2]"
                }`}
                style={{ borderWidth: selected ? "2px" : "0.5px" }}
              >
                <div className="mb-1 text-[26px]" aria-hidden="true">
                  {option.emoji}
                </div>
                <div className="text-sm font-semibold text-[#085041]">
                  +{option.amount.toLocaleString("de-DE")}L
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-4 flex gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="btn-touch flex-1 rounded-2xl border-2 border-border bg-surface px-4 py-3 text-base font-semibold text-muted disabled:opacity-60"
          >
            {t("close")}
          </button>
          <button
            type="button"
            disabled={isSaving}
            onClick={() => void handleSave()}
            className="btn-primary flex-1 gap-2 px-4 py-3 text-base disabled:opacity-70"
          >
            {isSaving && <Loader2 size={20} className="animate-spin" />}
            {t("save_activity")}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
