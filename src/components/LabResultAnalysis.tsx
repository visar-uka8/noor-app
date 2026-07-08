"use client";

import { Share2 } from "lucide-react";
import { useState } from "react";
import type { LabAnalysisResult } from "@/types/lab-results";

type LabResultAnalysisProps = {
  result: LabAnalysisResult;
};

export function LabResultAnalysis({ result }: LabResultAnalysisProps) {
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);

  async function shareAnalysis(audience: "doctor" | "family") {
    const intro =
      audience === "doctor"
        ? "Meine Laborwerte — erklärt von Noor:"
        : "Hallo, hier sind meine Laborwerte — erklärt von Noor:";

    const message = `${intro}\n\n${result.analysis}`;

    try {
      if (navigator.share) {
        await navigator.share({
          title: "Noor Laboranalyse",
          text: message,
        });
        return;
      }

      await navigator.clipboard.writeText(message);
      setShareFeedback("Analyse wurde kopiert.");
    } catch {
      setShareFeedback("Teilen ist gerade nicht möglich.");
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-app flex-1 flex-col px-5 py-6">
      <article className="rounded-2xl border border-border border-l-4 border-l-primary bg-surface p-5 shadow-[var(--warm-shadow)]">
        <h2 className="text-2xl font-bold text-[#085041]">Ihre Analyse</h2>

        <div className="mt-4 whitespace-pre-wrap text-[17px] leading-relaxed text-foreground">
          {result.analysis}
        </div>

        <p className="mt-5 text-sm text-muted">Erstellt von Noor KI</p>
      </article>

      {shareFeedback ? (
        <p className="mt-4 text-center text-base text-muted" role="status">
          {shareFeedback}
        </p>
      ) : null}

      <div className="mt-8 flex flex-col gap-3 pb-2">
        <button
          type="button"
          onClick={() => shareAnalysis("doctor")}
          className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-4 text-base font-semibold text-white transition-colors hover:bg-primary-dark active:scale-[0.98]"
        >
          <Share2 size={20} aria-hidden="true" />
          Mit Hausarzt teilen
        </button>
        <button
          type="button"
          onClick={() => shareAnalysis("family")}
          className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border-2 border-primary bg-surface px-5 py-4 text-base font-semibold text-primary transition-colors hover:bg-primary-light active:scale-[0.98]"
        >
          <Share2 size={20} aria-hidden="true" />
          Mit Familie teilen
        </button>
      </div>
    </main>
  );
}
