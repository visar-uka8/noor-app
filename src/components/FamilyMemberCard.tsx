"use client";

import { FileText, MessageCircle, Phone } from "lucide-react";
import { memo, useState } from "react";
import {
  FamilyLabAnalysisSheet,
  type FamilyLabAnalysisResult,
} from "@/components/FamilyLabAnalysisSheet";
import { FamilyHealthPassportSheet } from "@/components/FamilyHealthPassportSheet";
import { FamilyNoteComposeSheet } from "@/components/FamilyNoteComposeSheet";
import { Avatar } from "@/components/ui/Avatar";
import { MedicationStreakCard } from "@/components/MedicationStreakCard";
import {
  overallStatusCopy,
  type FamilyDashboardData,
  type FamilyLatestLabResult,
  type FamilyMedicationItem,
} from "@/lib/family-dashboard-status";
import { formatPatientStreakLabel } from "@/lib/medication-streak";
import type { HealthPassportData } from "@/types/health-passport";

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
  const [showPassport, setShowPassport] = useState(false);
  const [patientPassport, setPatientPassport] =
    useState<HealthPassportData | null>(null);
  const [isLoadingPassport, setIsLoadingPassport] = useState(false);
  const [passportError, setPassportError] = useState<string | null>(null);
  const [showNoteSheet, setShowNoteSheet] = useState(false);

  if (!data.member) return null;

  const patientQuery = data.member.patientId
    ? `?patientId=${encodeURIComponent(data.member.patientId)}`
    : "";

  const status = overallStatusCopy[data.overallStatus];
  const labResult = data.latestLabResult;

  async function openLabAnalysis() {
    setShowAnalysis(true);
    setAnalysisError(null);

    if (labResult) {
      setSelectedLabResult(toSheetLabResult(labResult));
    }

    setIsLoadingAnalysis(true);

    try {
      const response = await fetch(
        `/api/family-dashboard/lab-result${patientQuery}`,
        {
        credentials: "include",
      });

      const body = (await response.json().catch(() => null)) as {
        labResult?: {
          id: string;
          ai_analysis: string;
          date: string;
          created_at?: string;
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
          createdAt: body.labResult.created_at,
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

  async function openHealthPassport() {
    setShowPassport(true);
    setPassportError(null);
    setIsLoadingPassport(true);

    try {
      const response = await fetch(
        `/api/family-dashboard/health-passport${patientQuery}`,
        {
        credentials: "include",
      });

      const body = (await response.json().catch(() => null)) as {
        passport?: HealthPassportData | null;
        error?: string;
      } | null;

      if (!response.ok) {
        throw new Error(
          body?.error ?? "Gesundheitspass konnte nicht geladen werden.",
        );
      }

      setPatientPassport(body?.passport ?? null);
    } catch (error) {
      console.error("Failed to load patient health passport", error);
      setPassportError(
        error instanceof Error
          ? error.message
          : "Gesundheitspass konnte gerade nicht geladen werden.",
      );
    } finally {
      setIsLoadingPassport(false);
    }
  }

  function closeHealthPassport() {
    setShowPassport(false);
    setPassportError(null);
  }

  return (
    <>
      <article className="noor-card overflow-hidden">
        <header className="border-b border-border bg-background px-5 py-5">
          <div className="flex items-center gap-4">
            <Avatar
              url={data.member.avatarUrl}
              name={data.member.name}
              firstName={data.member.firstName}
              size={72}
            />
            <div className="min-w-0 flex-1">
              <p className="heading-lg leading-tight">{data.member.name}</p>
              <p className="text-body mt-1 text-muted">Ihre Verbindung ist aktiv</p>
              {data.member.relationship ? (
                <p className="mt-1 text-[13px] text-[#88856F]">
                  {data.member.relationship}
                </p>
              ) : null}
            </div>
          </div>

          <div className="mt-5 flex items-center gap-4 rounded-2xl bg-surface px-4 py-5">
            <span
              className={`h-10 w-10 shrink-0 rounded-full ${status.circleClass}`}
              aria-hidden="true"
            />
            <p className={`text-lg font-bold leading-snug ${status.textClass}`}>
              {data.overallStatusText}
            </p>
          </div>

          <MedicationStreakCard
            streak={data.medicationStreak ?? 0}
            variant="family"
            familyMessage={formatPatientStreakLabel(
              data.member.firstName,
              data.medicationStreak ?? 0,
            )}
          />
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

        <section className="px-5 pb-5" aria-label="Gesundheitspass">
          <button
            type="button"
            onClick={() => void openHealthPassport()}
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: "16px",
              border: "0.5px solid #E4E2DB",
              padding: "16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              cursor: "pointer",
              marginTop: "12px",
              width: "100%",
            }}
          >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
            }}
          >
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "10px",
                backgroundColor: "#E1F5EE",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "20px",
              }}
              aria-hidden="true"
            >
              🏥
            </div>
            <div style={{ textAlign: "left" }}>
              <div
                style={{
                  fontSize: "15px",
                  fontWeight: 600,
                  color: "#085041",
                }}
              >
                Gesundheitspass
              </div>
              <div
                style={{
                  fontSize: "13px",
                  color: "#88856F",
                }}
              >
                {data.member.firstName}s Gesundheitsdaten ansehen
              </div>
            </div>
          </div>
          <div
            style={{
              fontSize: "18px",
              color: "#88856F",
            }}
            aria-hidden="true"
          >
            →
          </div>
        </button>
        </section>

        {data.todayActivities.length > 0 && data.todayActivityText ? (
          <section className="border-t border-border px-5 py-5" aria-label="Aktivität heute">
            <p
              className="rounded-2xl px-4 py-3 text-base font-semibold leading-snug"
              style={{
                backgroundColor: "#E1F5EE",
                color: "#085041",
              }}
            >
              {data.todayActivityText}
            </p>
          </section>
        ) : null}

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
          <h3 className="mb-3 text-[13px] font-bold uppercase tracking-wide text-[#88856F]">
            Kontakt
          </h3>
          <div className="flex flex-col gap-3 rounded-2xl bg-[#E1F5EE] p-4">
            <div className="flex items-center gap-4">
              <Avatar
                url={data.member.avatarUrl}
                name={data.member.name}
                firstName={data.member.firstName}
                size={56}
              />
              <p className="text-base font-bold text-[#085041]">
                {data.member.name}
              </p>
            </div>
            <a
              href={toTelHref(data.member.phone)}
              className="btn-primary min-h-14 w-full gap-2 text-lg"
            >
              <Phone size={24} strokeWidth={2.4} aria-hidden="true" />
              Anrufen
            </a>
            <button
              type="button"
              onClick={() => setShowNoteSheet(true)}
              className="btn-touch flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl border-2 border-primary bg-surface px-5 py-3 text-lg font-semibold text-primary transition-colors hover:bg-primary-light"
            >
              <MessageCircle size={24} strokeWidth={2.2} aria-hidden="true" />
              Nachricht hinterlassen
            </button>
          </div>
        </div>
      </article>

      <FamilyLabAnalysisSheet
        open={showAnalysis}
        labResult={selectedLabResult}
        isLoading={isLoadingAnalysis}
        errorMessage={analysisError}
        onClose={closeLabAnalysis}
      />

      <FamilyHealthPassportSheet
        open={showPassport}
        patientName={data.member.name}
        patientFirstName={data.member.firstName}
        passport={patientPassport}
        isLoading={isLoadingPassport}
        errorMessage={passportError}
        onClose={closeHealthPassport}
      />

      <FamilyNoteComposeSheet
        open={showNoteSheet}
        patientFirstName={data.member.firstName}
        patientId={data.member.patientId}
        onClose={() => setShowNoteSheet(false)}
      />
    </>
  );
});

function toTelHref(phone: string) {
  const trimmed = phone.trim();
  const normalized = trimmed.replace(/[^\d+]/g, "");
  return `tel:${normalized || trimmed}`;
}

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
