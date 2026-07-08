"use client";

import { Check, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import type { MedicationDose } from "@/types/medication";

type MedicationDoseButtonProps = {
  dose: MedicationDose;
  confirmed: boolean;
  missed?: boolean;
  pending?: boolean;
  onConfirm: () => void;
};

export function MedicationDoseButton({
  dose,
  confirmed,
  missed = false,
  pending = false,
  onConfirm,
}: MedicationDoseButtonProps) {
  const [justConfirmed, setJustConfirmed] = useState(false);

  useEffect(() => {
    if (!confirmed) return;

    setJustConfirmed(true);
    const timer = window.setTimeout(() => setJustConfirmed(false), 550);
    return () => window.clearTimeout(timer);
  }, [confirmed]);

  return (
    <button
      type="button"
      onClick={onConfirm}
      disabled={confirmed || pending}
      aria-pressed={confirmed}
      aria-busy={pending}
      aria-label={
        confirmed
          ? `${dose.label}: ${dose.name} ${dose.dose} eingenommen`
          : `${dose.label}: ${dose.name} ${dose.dose} als eingenommen bestätigen`
      }
      className={`flex min-h-[120px] w-full items-center gap-5 rounded-2xl border-2 px-6 py-5 text-left transition-all active:scale-[0.98] disabled:active:scale-100 ${
        justConfirmed ? "animate-confirm-bounce" : ""
      } ${
        confirmed
          ? "border-primary bg-primary text-white shadow-md"
          : missed
            ? "border-warning bg-warning-light text-foreground shadow-[var(--warm-shadow)] hover:bg-warning-light/80"
            : "noor-card border-2 hover:border-primary/40"
      }`}
    >
      <div className="min-w-0 flex-1">
        <p
          className={`text-stat ${
            confirmed
              ? "text-white/90"
              : missed
                ? "text-warning"
                : "text-primary"
          }`}
        >
          {missed && !confirmed ? "Vergessen — bitte jetzt nehmen" : dose.label}
        </p>
        <p className="text-stat mt-1 leading-tight">
          {dose.name} {dose.dose}
        </p>
      </div>

      <div
        className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full ${
          confirmed
            ? "bg-white/20"
            : missed
              ? "border-2 border-warning/30 bg-warning-light text-warning"
              : "border-2 border-dashed border-primary/30 bg-primary-light"
        }`}
        aria-hidden="true"
      >
        {pending ? (
          <Loader2 size={30} className="animate-spin" strokeWidth={2.5} />
        ) : (
          confirmed && <Check size={32} strokeWidth={3} />
        )}
      </div>
    </button>
  );
}
