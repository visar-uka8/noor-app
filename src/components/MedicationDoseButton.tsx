"use client";

import { Check, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { formatConfirmationTime, getDoseTimeLabel } from "@/lib/medication-schedule";
import type { DoseVisualState } from "@/lib/medication-schedule";
import type { DailyDoseSlot } from "@/types/medication";

type MedicationDoseButtonProps = {
  dose: DailyDoseSlot;
  visualState: DoseVisualState;
  pending?: boolean;
  confirmedAt?: string | null;
  now?: number;
  onConfirm: () => void;
};

const rowStyles: Record<
  DoseVisualState,
  { container: string; time: string; name: string; detail: string }
> = {
  confirmed: {
    container: "bg-[#1D9E75] text-white shadow-md",
    time: "text-white/90",
    name: "text-white",
    detail: "text-white/85",
  },
  due: {
    container:
      "noor-card border border-border border-l-4 border-l-[#1D9E75] bg-white shadow-[var(--warm-shadow)]",
    time: "text-[#1D9E75]",
    name: "text-foreground",
    detail: "text-muted",
  },
  missed: {
    container: "bg-[#FAEEDA] text-[#633806] shadow-[var(--warm-shadow)]",
    time: "text-[#633806]",
    name: "text-[#633806]",
    detail: "text-[#633806]/80",
  },
  upcoming: {
    container: "noor-card border border-border bg-[#F7F6F2] shadow-[var(--warm-shadow)]",
    time: "text-muted",
    name: "text-foreground",
    detail: "text-muted",
  },
};

const circleStyles: Record<
  Exclude<DoseVisualState, "confirmed">,
  { button: string; icon: string }
> = {
  due: {
    button:
      "medication-dose-circle animate-dose-due-pulse border-2 border-[#157A5C] bg-[#1D9E75] shadow-md",
    icon: "text-white",
  },
  missed: {
    button: "medication-dose-circle border-2 border-[#BA7517] bg-[#FAEEDA]",
    icon: "text-[#BA7517]",
  },
  upcoming: {
    button:
      "medication-dose-circle border-2 border-dashed border-[#C5C2BC] bg-[#F0EFE9]",
    icon: "text-[#A8A49A]",
  },
};

export function MedicationDoseButton({
  dose,
  visualState,
  pending = false,
  confirmedAt,
  now = Date.now(),
  onConfirm,
}: MedicationDoseButtonProps) {
  const [justConfirmed, setJustConfirmed] = useState(false);
  const confirmed = visualState === "confirmed";
  const styles = rowStyles[visualState];

  useEffect(() => {
    if (!confirmed) return;

    setJustConfirmed(true);
    const timer = window.setTimeout(() => setJustConfirmed(false), 550);
    return () => window.clearTimeout(timer);
  }, [confirmed, confirmedAt]);

  const timeLabel = getDoseTimeLabel(
    visualState,
    dose.time,
    dose.slotLabel,
    now,
  );

  return (
    <div
      className={`medication-dose-button flex w-full items-center justify-between gap-4 rounded-2xl px-5 py-4 transition-all ${
        justConfirmed ? "animate-confirm-bounce" : ""
      } ${styles.container}`}
    >
      <div className="min-w-0 flex-1">
        <p className={`medication-button-time text-base font-semibold ${styles.time}`}>
          {timeLabel}
        </p>
        <p className={`medication-button-name mt-1 font-bold leading-tight ${styles.name}`}>
          {dose.name}
        </p>
        <p className={`medication-button-time mt-1 ${styles.detail}`}>
          {confirmed && confirmedAt
            ? `Bestätigt um ${formatConfirmationTime(confirmedAt)} Uhr`
            : `${dose.dosage ? `${dose.dosage} · ` : ""}${dose.time} Uhr`}
        </p>
      </div>

      {confirmed ? (
        <div
          className="medication-dose-circle flex shrink-0 items-center justify-center rounded-full bg-[#1D9E75] ring-2 ring-white/30"
          aria-hidden="true"
        >
          <Check size={30} className="text-white" strokeWidth={3} />
        </div>
      ) : (
        <button
          type="button"
          onClick={onConfirm}
          disabled={pending}
          aria-busy={pending}
          aria-label={`${dose.displayLabel} als eingenommen bestätigen`}
          className={`flex shrink-0 items-center justify-center rounded-full transition-transform active:scale-95 disabled:opacity-70 ${
            circleStyles[visualState].button
          }`}
        >
          {pending ? (
            <Loader2
              size={28}
              className={`animate-spin ${circleStyles[visualState].icon}`}
              strokeWidth={2.5}
            />
          ) : (
            <Check
              size={28}
              className={circleStyles[visualState].icon}
              strokeWidth={visualState === "due" ? 3 : 2.8}
            />
          )}
        </button>
      )}
    </div>
  );
}
