"use client";

import { Check, Loader2 } from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";
import {
  formatConfirmationTime,
  type DoseVisualState,
} from "@/lib/medication-schedule";
import type { DailyDoseSlot } from "@/types/medication";

export type GroupedDoseRow = {
  dose: DailyDoseSlot;
  visualState: DoseVisualState;
  confirmedAt?: string | null;
  pending: boolean;
  previewTheme?: "pending-amber";
};

type MedicationGroupCardProps = {
  name: string;
  dosage: string;
  doses: GroupedDoseRow[];
  onConfirm: (dose: DailyDoseSlot) => void;
  interactive?: boolean;
};

const rowBackground: Record<DoseVisualState, string> = {
  missed: "bg-[#FAEEDA]",
  confirmed: "bg-[#1D9E75]",
  due: "bg-white",
  upcoming: "bg-white",
};

const stateLabelColor: Record<DoseVisualState, string> = {
  missed: "text-[#BA7517]",
  confirmed: "text-white/90",
  due: "text-[#88856F]",
  upcoming: "text-[#88856F]",
};

const rowTimeColor: Record<DoseVisualState, string> = {
  missed: "text-[#1E1D1B]",
  confirmed: "text-white",
  due: "text-[#1E1D1B]",
  upcoming: "text-[#1E1D1B]",
};

function getDoseStateLabel(
  state: DoseVisualState,
  t: ReturnType<typeof useLanguage>["t"],
) {
  if (state === "missed") return t("missed");
  if (state === "confirmed") return t("confirmed");
  if (state === "due") return t("med_take_now");
  return t("pending");
}

export function MedicationGroupCard({
  name,
  dosage,
  doses,
  onConfirm,
  interactive = true,
}: MedicationGroupCardProps) {
  const { t } = useLanguage();
  return (
    <article
      className="relative z-[1] overflow-hidden rounded-2xl border border-[#E4E2DB] bg-white"
      style={{ borderWidth: "0.5px", pointerEvents: "auto" }}
    >
      <header
        className="border-b border-[#F0EFE9] px-4 py-3.5"
        style={{ borderBottomWidth: "0.5px" }}
      >
        <h3 className="text-[17px] font-bold text-[#085041]">{name}</h3>
        {dosage ? (
          <p className="mt-0.5 text-[13px] text-[#88856F]">{dosage}</p>
        ) : null}
      </header>

      <ul>
        {doses.map((row, index) => {
          const isPendingAmber = row.previewTheme === "pending-amber";
          const rowBg = isPendingAmber
            ? "bg-[#FAEEDA]"
            : rowBackground[row.visualState];
          const labelColor = isPendingAmber
            ? "text-[#BA7517]"
            : stateLabelColor[row.visualState];
          const timeColor = isPendingAmber
            ? "text-[#633806]"
            : rowTimeColor[row.visualState];
          const stateLabel = isPendingAmber
            ? t("pending")
            : getDoseStateLabel(row.visualState, t);

          return (
          <li
            key={row.dose.id}
            className={`relative z-[1] flex items-center justify-between gap-3 px-4 py-3 ${rowBg} ${
              index < doses.length - 1
                ? row.visualState === "confirmed"
                  ? "border-b border-white/20"
                  : "border-b border-[#F0EFE9]"
                : ""
            }`}
            style={{
              pointerEvents: interactive ? "auto" : "none",
              ...(index < doses.length - 1 ? { borderBottomWidth: "0.5px" } : {}),
            }}
          >
            <div className="min-w-0">
              <p
                className={`text-xs font-semibold uppercase tracking-wide ${labelColor}`}
              >
                {stateLabel}
              </p>
              <p
                className={`mt-0.5 text-[15px] font-medium ${timeColor}`}
              >
                {row.visualState === "confirmed" && row.confirmedAt
                  ? t("confirmed_at", {
                      time: formatConfirmationTime(row.confirmedAt),
                    })
                  : t("med_time_at", { time: row.dose.time })}
              </p>
            </div>

            <DoseConfirmCircle
              visualState={row.visualState}
              pending={row.pending}
              previewTheme={row.previewTheme}
              interactive={interactive}
              ariaLabel={t("med_confirm_dose_aria", {
                label: row.dose.displayLabel,
              })}
              onConfirm={() => onConfirm(row.dose)}
            />
          </li>
          );
        })}
      </ul>
    </article>
  );
}

function DoseConfirmPlusIcon({
  color = "#1D9E75",
  size = 20,
}: {
  color?: string;
  size?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2.5"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function DoseConfirmCircle({
  visualState,
  pending,
  previewTheme,
  interactive = true,
  ariaLabel,
  onConfirm,
}: {
  visualState: DoseVisualState;
  pending: boolean;
  previewTheme?: GroupedDoseRow["previewTheme"];
  interactive?: boolean;
  ariaLabel: string;
  onConfirm: () => void;
}) {
  const isPendingAmber = previewTheme === "pending-amber";

  if (visualState === "confirmed") {
    return (
      <div
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/20 ring-2 ring-white/30"
        aria-hidden="true"
      >
        <Check size={20} className="text-white" strokeWidth={2.5} />
      </div>
    );
  }

  const circleClass = isPendingAmber
    ? "border-2 border-dashed border-[#BA7517] bg-transparent"
    : visualState === "missed"
      ? "border-2 border-[#BA7517] bg-transparent"
      : visualState === "due"
        ? "border-2 border-[#1D9E75] bg-[#E1F5EE]"
        : "border-2 border-dashed border-[#1D9E75] bg-[#E1F5EE]";

  const plusColor = isPendingAmber || visualState === "missed" ? "#BA7517" : "#1D9E75";

  const circleContent = pending ? (
    <Loader2
      size={20}
      className={`animate-spin ${isPendingAmber || visualState === "missed" ? "text-[#BA7517]" : "text-[#1D9E75]"}`}
      strokeWidth={2.5}
    />
  ) : (
    <DoseConfirmPlusIcon color={plusColor} />
  );

  if (!interactive) {
    return (
      <div
        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${circleClass}`}
        aria-hidden="true"
      >
        {circleContent}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onConfirm();
      }}
      disabled={pending}
      aria-busy={pending}
      aria-label={ariaLabel}
      className={`relative z-[2] flex h-12 w-12 shrink-0 cursor-pointer items-center justify-center rounded-full transition-transform active:scale-95 disabled:opacity-70 ${circleClass}`}
      style={{ pointerEvents: "auto", touchAction: "manipulation" }}
    >
      {circleContent}
    </button>
  );
}
