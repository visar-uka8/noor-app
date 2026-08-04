"use client";

import { Check, Loader2 } from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";
import {
  formatConfirmationTime,
  type DoseVisualState,
} from "@/lib/medication-schedule";
import { getInsulinTypeLabel } from "@/lib/insulin-medications";
import type { DailyDoseSlot, InsulinType } from "@/types/medication";

type InsulinMealDoseCardProps = {
  dose: DailyDoseSlot;
  insulinType: InsulinType;
  visualState: DoseVisualState;
  confirmedAt?: string | null;
  confirmedUnits?: number | null;
  pending: boolean;
  insulinDose: string;
  onInsulinDoseChange: (value: string) => void;
  onConfirm: () => void;
};

export function InsulinMealDoseCard({
  dose,
  insulinType,
  visualState,
  confirmedAt,
  confirmedUnits,
  pending,
  insulinDose,
  onInsulinDoseChange,
  onConfirm,
}: InsulinMealDoseCardProps) {
  const { t } = useLanguage();
  const isConfirmed = visualState === "confirmed";
  const parsedDose = Number(insulinDose);
  const canConfirm =
    !isConfirmed &&
    !pending &&
    Number.isFinite(parsedDose) &&
    parsedDose > 0;

  return (
    <article
      className="overflow-hidden rounded-2xl bg-white"
      style={{ marginBottom: "12px" }}
    >
      <header
        className="border-b border-[#F0EFE9] px-4 py-3"
        style={{ borderBottomWidth: "0.5px" }}
      >
        <div className="flex items-center gap-2">
          <span className="text-lg" aria-hidden="true">
            💉
          </span>
          <div>
            <h3 className="text-base font-bold text-[#085041]">{dose.name}</h3>
            <p className="text-xs text-[#88856F]">
              {getInsulinTypeLabel(insulinType)} · {dose.slotLabel}
            </p>
          </div>
        </div>
      </header>

      {isConfirmed ? (
        <div className="bg-[#1D9E75] px-4 py-3 text-white">
          <p className="text-xs font-semibold uppercase tracking-wide text-white/90">
            {t("confirmed")}
          </p>
          <p className="mt-0.5 text-[15px] font-medium">
            {confirmedUnits
              ? t("insulin_confirmed_dose", {
                  units: confirmedUnits,
                  time: confirmedAt
                    ? formatConfirmationTime(confirmedAt)
                    : dose.time,
                })
              : t("confirmed_at", {
                  time: confirmedAt
                    ? formatConfirmationTime(confirmedAt)
                    : dose.time,
                })}
          </p>
        </div>
      ) : (
        <div className="flex items-center gap-3 bg-[#F7F6F2] px-4 py-3">
          <span className="text-sm font-medium text-[#085041]">
            {t("insulin_dose_today")}
          </span>
          <input
            type="number"
            min={1}
            max={200}
            placeholder="IE"
            value={insulinDose}
            onChange={(event) => onInsulinDoseChange(event.target.value)}
            className="w-20 rounded-[10px] border border-[#E4E2DB] px-3 py-2 text-center text-base font-semibold text-[#085041] outline-none"
            style={{ borderWidth: "0.5px" }}
          />
          <span className="text-sm text-[#88856F]">{t("insulin_units_ie")}</span>
          <button
            type="button"
            onClick={onConfirm}
            disabled={!canConfirm}
            className="ml-auto flex h-11 w-11 items-center justify-center rounded-full text-lg text-white transition-transform active:scale-95 disabled:cursor-default"
            style={{
              backgroundColor: canConfirm ? "#1D9E75" : "#E4E2DB",
            }}
            aria-label={t("med_confirm_dose_aria", { label: dose.displayLabel })}
          >
            {pending ? (
              <Loader2 size={18} className="animate-spin" strokeWidth={2.5} />
            ) : (
              <Check size={18} strokeWidth={2.5} />
            )}
          </button>
        </div>
      )}
    </article>
  );
}
