"use client";

import { Clock3, FileText, Phone } from "lucide-react";
import { memo, useState } from "react";
import {
  FamilyLabAnalysisSheet,
  type FamilyLabAnalysisResult,
} from "@/components/FamilyLabAnalysisSheet";
import {
  overallStatusCopy,
  type FamilyDashboardData,
  type FamilyLatestLabResult,
  type FamilyMedicationItem,
} from "@/lib/family-dashboard-status";

type FamilyMemberCardProps = {
  data: FamilyDashboardData;
};

const medicationStatusStyles = {
  confirmed: {
    icon: "✓",
    textClass: "text-heading",
    badgeClass: "bg-primary-light text-heading",
  },
  pending: {
    icon: "⏳",
    textClass: "text-warning",
    badgeClass: "bg-warning-light text-warning",
  },
  missed: {
    icon: "✗",
    textClass: "text-danger",
    badgeClass: "bg-danger-light text-danger",
  },
} as const;

function toSheetLabResult(
  labResult: FamilyLatestLabResult,
): FamilyLabAnalysisResult {
  return {
    id: labResult.id,
    date: labResult.date,
    ai_analysis: labResult.analysis,
  };
}

export const FamilyMemberCard = memo(function FamilyMemberCard({
  data,
}: FamilyMemberCardProps) {
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [selectedLabResult, setSelectedLabResult] =
    useState<FamilyLabAnalysisResult | null>(null);
  const [isLoadingAnalysis, setIsLoadingAnalysis] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  if (!data.member) return null;

  const status = overallStatusCopy[data.overallStatus];
  const labResult = data.latestLabResult;

  async function openLabAnalysis() {
    console.log("Lab result ID:", labResult?.id);
    console.log("Lab result data:", labResult);
    console.log("Connected patient ID:", data.member?.patientId);

    setShowAnalysis(true);
    setAnalysisError(null);

    if (labResult) {
      setSelectedLabResult(toSheetLabResult(labResult));
    }

    setIsLoadingAnalysis(true);

    try {
      const response = await fetch("/api/family-dashboard/lab-result", {
        credentials: "include",
      });

      const body = (await response.json().catch(() => null)) as {
        labResult?: {
          id: string;
          ai_analysis: string;
          date: string;
        } | null;
        patientId?: string;
        error?: string;
      } | null;

      if (!response.ok) {
        throw new Error(body?.error ?? "Laboranalyse konnte nicht geladen werden.");
      }

      if (body?.labResult) {
        console.log("Fetched patient lab result:", body.labResult);
        console.log("Fetched for patient ID:", body.patientId);
        setSelectedLabResult({
          id: body.labResult.id,
          date: body.labResult.date,
          ai_analysis: body.labResult.ai_analysis,
        });
      } else if (!labResult) {
        setSelectedLabResult(null);
        setAnalysisError("Kein Laborbefund für den verbundenen Angehörigen gefunden.");
      }
    } catch (error) {
      console.error("Failed to load patient lab result", error);
      setAnalysisError(
        error instanceof Error
          ? error.message
          : "Laboranalyse konnte gerade nicht geladen werden.",
      );
    } finally {
      setIsLoadingAnalysis(false);
    }
  }

  function closeLabAnalysis() {
    setShowAnalysis(false);
    setAnalysisError(null);
  }

  return (
    <>
      <article className="noor-card overflow-hidden">
        <header className="border-b border-border bg-background px-5 py-5">
          <p className="heading-lg leading-tight">
            {data.member.displayLabel} — {data.member.name}
          </p>
          <p className="text-body mt-1 text-muted">
            Ihre Verbindung ist aktiv
          </p>

          <div className="mt-5 flex items-center gap-4 rounded-2xl bg-surface px-4 py-5">
            <span
              className={`h-10 w-10 shrink-0 rounded-full ${status.circleClass}`}
              aria-hidden="true"
            />
            <p className={`text-lg font-bold leading-snug ${status.textClass}`}>
              {data.overallStatusText}
            </p>
          </div>
        </header>

        <section className="px-5 py-5" aria-label="Medikamente heute">
          <h2 className="heading-lg">Medikamente heute</h2>
          {data.medications.length === 0 ? (
            <p className="text-body mt-4 text-muted">
              Noch keine Medikamente hinterlegt.
            </p>
          ) : (
            <ul className="mt-4 flex flex-col gap-3">
              {data.medications.map((medication) => (
                <MedicationStatusRow key={medication.id} medication={medication} />
              ))}
            </ul>
          )}
        </section>

        <section className="border-t border-border px-5 py-5">
          <div className="flex items-start gap-3">
            <div
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary-light text-primary"
              aria-hidden="true"
            >
              <Clock3 size={22} strokeWidth={2.2} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">Letzte Aktivität</h2>
              <p className="mt-1 text-base text-muted">
                Letzte Aktivität: {data.lastCheckInText}
              </p>
            </div>
          </div>
        </section>

        {labResult ? (
          <section className="border-t border-border px-5 py-5">
            <div className="flex items-start gap-3">
              <div
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary-light text-primary"
                aria-hidden="true"
              >
                <FileText size={22} strokeWidth={2.2} />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-lg font-bold text-foreground">
                  Letzter Befund: {labResult.date}
                </h2>
                <p className="mt-2 text-base leading-relaxed text-muted">
                  {labResult.preview}
                </p>
                <button
                  type="button"
                  onClick={() => void openLabAnalysis()}
                  className="btn-touch mt-4 w-full rounded-2xl border-2 border-primary bg-surface px-5 py-3 text-base font-semibold text-primary transition-colors hover:bg-primary-light"
                >
                  Vollständige Analyse ansehen
                </button>
              </div>
            </div>
          </section>
        ) : null}

        <div className="border-t border-border px-5 py-5">
          <a
            href={`tel:${data.member.phone}`}
            className="btn-primary mt-0 min-h-14 w-full gap-2 text-lg"
          >
            <Phone size={24} strokeWidth={2.4} aria-hidden="true" />
            {data.member.displayLabel} anrufen
          </a>
        </div>
      </article>

      <FamilyLabAnalysisSheet
        open={showAnalysis}
        labResult={selectedLabResult}
        isLoading={isLoadingAnalysis}
        errorMessage={analysisError}
        onClose={closeLabAnalysis}
      />
    </>
  );
});

function MedicationStatusRow({
  medication,
}: {
  medication: FamilyMedicationItem;
}) {
  const styles = medicationStatusStyles[medication.status];

  return (
    <li className={`text-body rounded-2xl px-4 py-3 ${styles.badgeClass}`}>
      <span className={`font-bold ${styles.textClass}`}>
        <span aria-hidden="true">{styles.icon} </span>
        {medication.name} — {medication.timeLabel} — {medication.statusText}
      </span>
    </li>
  );
}
