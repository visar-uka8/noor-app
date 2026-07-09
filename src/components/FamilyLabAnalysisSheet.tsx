"use client";

import { X } from "lucide-react";
import { useEffect } from "react";
import { createPortal } from "react-dom";
import { LabResultAnalysis } from "@/components/LabResultAnalysis";

export type FamilyLabAnalysisResult = {
  id: string;
  date: string;
  ai_analysis: string;
};

type FamilyLabAnalysisSheetProps = {
  open: boolean;
  labResult: FamilyLabAnalysisResult | null;
  isLoading?: boolean;
  errorMessage?: string | null;
  onClose: () => void;
};

export function FamilyLabAnalysisSheet({
  open,
  labResult,
  isLoading = false,
  errorMessage = null,
  onClose,
}: FamilyLabAnalysisSheetProps) {
  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  if (!open || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[80] bg-black/50"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="fixed inset-x-0 bottom-0 mx-auto w-full max-w-app rounded-t-[20px] bg-surface px-6 pb-8 pt-5 shadow-[var(--warm-shadow)]"
        style={{ maxHeight: "80vh" }}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="family-lab-analysis-title"
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2
            id="family-lab-analysis-title"
            className="text-xl font-bold text-foreground"
          >
            {labResult
              ? `Analyse vom ${labResult.date}`
              : "Laboranalyse"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex min-h-12 min-w-12 items-center justify-center rounded-xl text-muted transition-colors hover:bg-primary-light hover:text-primary"
            aria-label="Schließen"
          >
            <X size={24} strokeWidth={2.4} />
          </button>
        </div>

        <div className="-mx-1 overflow-y-auto px-1" style={{ maxHeight: "calc(80vh - 5rem)" }}>
          {isLoading ? (
            <p className="text-base text-muted">Analyse wird geladen...</p>
          ) : null}

          {!isLoading && errorMessage ? (
            <p className="text-base text-danger">{errorMessage}</p>
          ) : null}

          {!isLoading && !errorMessage && labResult?.ai_analysis ? (
            <LabResultAnalysis result={{ analysis: labResult.ai_analysis }} />
          ) : null}

          {!isLoading && !errorMessage && !labResult?.ai_analysis ? (
            <p className="text-base text-muted">
              Für diesen Befund ist noch keine Analyse verfügbar.
            </p>
          ) : null}
        </div>
      </div>
    </div>,
    document.body,
  );
}
