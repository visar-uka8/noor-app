"use client";

import { Check, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { formatConfirmationTime } from "@/lib/medication-schedule";
import type { DailyDoseSlot } from "@/types/medication";

type MedicationDoseButtonProps = {
  dose: DailyDoseSlot;
  confirmed: boolean;
  missed?: boolean;
  pending?: boolean;
  confirmedAt?: string | null;
  onConfirm: () => void;
};

export function MedicationDoseButton({
  dose,
  confirmed,
  missed = false,
  pending = false,
  confirmedAt,
  onConfirm,
}: MedicationDoseButtonProps) {
  const [justConfirmed, setJustConfirmed] = useState(false);

  useEffect(() => {
    if (!confirmed) return;

    setJustConfirmed(true);
    const timer = window.setTimeout(() => setJustConfirmed(false), 550);
    return () => window.clearTimeout(timer);
  }, [confirmed, confirmedAt]);

  const timeLabel =
    missed && !confirmed ? "Vergessen — jetzt nehmen" : dose.slotLabel;

  return (
    <div
      className={`medication-dose-button flex w-full items-center justify-between gap-4 rounded-2xl px-5 py-4 transition-all ${
        justConfirmed ? "animate-confirm-bounce" : ""
      } ${
        confirmed
          ? "bg-[#1D9E75] text-white shadow-md"
          : missed
            ? "bg-[#FAEEDA] text-[#633806] shadow-[var(--warm-shadow)]"
            : "noor-card border-2 border-border shadow-[var(--warm-shadow)]"
      }`}
    >
      <div className="min-w-0 flex-1">
        <p
          className={`medication-button-time text-base font-semibold ${
            confirmed
              ? "text-white/90"
              : missed
                ? "text-[#BA7517]"
                : "text-[#1D9E75]"
          }`}
        >
          {timeLabel}
        </p>
        <p
          className={`medication-button-name mt-1 font-bold leading-tight ${
            confirmed
              ? "text-white"
              : missed
                ? "text-[#633806]"
                : "text-foreground"
          }`}
        >
          {dose.name}
        </p>
        <p
          className={`medication-button-time mt-1 ${
            confirmed
              ? "text-white/85"
              : missed
                ? "text-[#633806]/80"
                : "text-muted"
          }`}
        >
          {confirmed && confirmedAt
            ? `Bestätigt um ${formatConfirmationTime(confirmedAt)} Uhr`
            : `${dose.dosage ? `${dose.dosage} · ` : ""}${dose.time} Uhr`}
        </p>
      </div>

      {confirmed ? (
        <div
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#1D9E75] ring-2 ring-white/30"
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
          className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-2 border-dashed transition-transform active:scale-95 disabled:opacity-70 ${
            missed
              ? "border-[#BA7517] bg-[#FAEEDA]"
              : "border-[#1D9E75] bg-[#E1F5EE]"
          }`}
        >
          {pending ? (
            <Loader2
              size={28}
              className={`animate-spin ${missed ? "text-[#BA7517]" : "text-[#1D9E75]"}`}
              strokeWidth={2.5}
            />
          ) : (
            <Check
              size={28}
              className={missed ? "text-[#BA7517]/80" : "text-[#1D9E75]/60"}
              strokeWidth={2.8}
            />
          )}
        </button>
      )}
    </div>
  );
}
