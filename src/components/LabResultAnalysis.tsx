"use client";

import { Share2 } from "lucide-react";
import { useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import type { LabAnalysisResult } from "@/types/lab-results";
import {
  isDoctorVisitUrgent,
  parseLabAnalysis,
  statusBadgeClass,
  type LabValueLevel,
  type ParsedLabValue,
} from "@/lib/parse-lab-analysis";

type LabResultAnalysisProps = {
  result: LabAnalysisResult;
};

const BORDER_BY_LEVEL: Record<LabValueLevel, string> = {
  green: "border-l-[#1D9E75]",
  amber: "border-l-[#BA7517]",
  red: "border-l-[#A32D2D]",
};

export function LabResultAnalysis({ result }: LabResultAnalysisProps) {
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);
  const parsed = useMemo(
    () => parseLabAnalysis(result.analysis),
    [result.analysis],
  );

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
      <h2 className="text-2xl font-bold text-[#085041]">Ihre Analyse</h2>

      {parsed.structured ? (
        <StructuredAnalysisView parsed={parsed} />
      ) : (
        <article className="noor-card mt-4 border-l-4 border-l-primary p-5">
          <div className="analysis-markdown">
            <ReactMarkdown>{result.analysis}</ReactMarkdown>
          </div>
        </article>
      )}

      <p className="mt-5 text-center text-sm text-muted">Erstellt von Noor KI</p>

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

function StructuredAnalysisView({
  parsed,
}: {
  parsed: ReturnType<typeof parseLabAnalysis>;
}) {
  const urgent = isDoctorVisitUrgent(parsed.doctorVisit);

  return (
    <div className="mt-4 flex flex-col gap-4">
      <SummaryBar counts={parsed.counts} />

      {parsed.summary ? (
        <section className="rounded-2xl border border-border border-l-4 border-l-[#1D9E75] bg-[#E1F5EE] p-5 shadow-[var(--warm-shadow)]">
          <h3 className="text-lg font-bold text-[#085041]">Zusammenfassung</h3>
          <div className="analysis-markdown mt-3">
            <ReactMarkdown>{parsed.summary}</ReactMarkdown>
          </div>
        </section>
      ) : null}

      {parsed.values.length > 0 ? (
        <section className="flex flex-col gap-3">
          <h3 className="text-lg font-bold text-[#085041]">
            Ihre Laborwerte im Detail
          </h3>
          {parsed.values.map((value) => (
            <LabValueCard key={`${value.name}-${value.patientValue}`} value={value} />
          ))}
        </section>
      ) : null}

      {parsed.nextSteps.length > 0 ? (
        <section className="noor-card p-5">
          <h3 className="text-lg font-bold text-[#085041]">Nächste Schritte</h3>
          <ol className="mt-4 flex list-none flex-col gap-3">
            {parsed.nextSteps.map((step, index) => (
              <li key={step} className="flex gap-3 text-[17px] leading-relaxed">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-light text-sm font-bold text-heading">
                  {index + 1}
                </span>
                <span className="pt-0.5 text-foreground">{step}</span>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      {parsed.doctorVisit ? (
        <section
          className={`rounded-2xl border border-border border-l-4 p-5 shadow-[var(--warm-shadow)] ${
            urgent
              ? "border-l-[#BA7517] bg-[#FDF4E7]"
              : "border-l-[#1D9E75] bg-[#E1F5EE]"
          }`}
        >
          <h3 className="text-lg font-bold text-[#085041]">Wann zum Arzt</h3>
          <div className="analysis-markdown mt-3">
            <ReactMarkdown>{parsed.doctorVisit}</ReactMarkdown>
          </div>
        </section>
      ) : null}

      {parsed.disclaimer ? (
        <p className="px-2 text-center text-sm italic text-muted">
          {parsed.disclaimer}
        </p>
      ) : null}
    </div>
  );
}

function SummaryBar({
  counts,
}: {
  counts: { green: number; amber: number; red: number };
}) {
  const items = [
    { emoji: "🟢", count: counts.green, label: "Normal", color: "text-[#1D9E75]" },
    { emoji: "🟡", count: counts.amber, label: "Beachten", color: "text-[#BA7517]" },
    { emoji: "🔴", count: counts.red, label: "Erhöht", color: "text-[#A32D2D]" },
  ];

  return (
    <section
      className="noor-card flex items-center justify-between gap-2 px-4 py-4"
      aria-label="Übersicht der Laborwerte"
    >
      {items.map((item) => (
        <div
          key={item.label}
          className="flex min-w-0 flex-1 flex-col items-center gap-1 text-center"
        >
          <span className="text-2xl" aria-hidden="true">
            {item.emoji}
          </span>
          <span className={`text-xl font-bold ${item.color}`}>{item.count}</span>
          <span className="text-sm font-semibold text-muted">{item.label}</span>
        </div>
      ))}
    </section>
  );
}

function LabValueCard({ value }: { value: ParsedLabValue }) {
  return (
    <article
      className={`noor-card border-l-4 bg-surface p-4 ${BORDER_BY_LEVEL[value.level]}`}
    >
      <h4 className="text-lg font-bold text-[#085041]">{value.name}</h4>

      {(value.patientValue || value.referenceRange) && (
        <p className="mt-2 text-sm text-muted">
          {value.patientValue ? (
            <>
              <span className="font-semibold">Ihr Wert:</span> {value.patientValue}
            </>
          ) : null}
          {value.patientValue && value.referenceRange ? (
            <span className="mx-2 text-muted/70">—</span>
          ) : null}
          {value.referenceRange ? (
            <>
              <span className="font-semibold">Normalbereich:</span>{" "}
              {value.referenceRange}
            </>
          ) : null}
        </p>
      )}

      {value.meaning ? (
        <p className="mt-3 text-[17px] leading-relaxed text-foreground">
          <span className="font-semibold text-heading">Was bedeutet das: </span>
          {value.meaning}
        </p>
      ) : null}

      {value.status ? (
        <span
          className={`mt-3 inline-flex rounded-full px-3 py-1 text-sm font-semibold ${statusBadgeClass(value.status, value.level)}`}
        >
          {value.status}
        </span>
      ) : null}

      {value.tip ? (
        <p className="mt-3 flex gap-2 text-[17px] leading-relaxed text-foreground">
          <span aria-hidden="true">💡</span>
          <span>{value.tip}</span>
        </p>
      ) : null}
    </article>
  );
}
