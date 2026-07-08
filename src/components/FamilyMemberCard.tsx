"use client";

import { Clock3, FileText, Phone, X } from "lucide-react";
import { useState } from "react";
import { LabResultAnalysis } from "@/components/LabResultAnalysis";
import {
  overallStatusCopy,
  type FamilyDashboardData,
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

export function FamilyMemberCard({ data }: FamilyMemberCardProps) {
  const [showLabAnalysis, setShowLabAnalysis] = useState(false);

  if (!data.member) return null;

  const status = overallStatusCopy[data.overallStatus];

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
          <ul className="mt-4 flex flex-col gap-3">
            {data.medications.map((medication) => (
              <MedicationStatusRow key={medication.id} medication={medication} />
            ))}
          </ul>
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

        {data.latestLabResult ? (
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
                  Letzter Befund: {data.latestLabResult.date}
                </h2>
                <p className="mt-2 text-base leading-relaxed text-muted">
                  {data.latestLabResult.preview}
                </p>
                <button
                  type="button"
                  onClick={() => setShowLabAnalysis(true)}
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

      {showLabAnalysis && data.latestLabResult ? (
        <div className="fixed inset-0 z-50 flex flex-col bg-background">
          <div className="mx-auto flex w-full max-w-app items-center justify-between px-5 py-4">
            <h2 className="text-xl font-bold text-foreground">Laboranalyse</h2>
            <button
              type="button"
              onClick={() => setShowLabAnalysis(false)}
              className="flex min-h-12 min-w-12 items-center justify-center rounded-xl text-muted transition-colors hover:bg-primary-light hover:text-primary"
              aria-label="Schließen"
            >
              <X size={24} strokeWidth={2.4} />
            </button>
          </div>
          <LabResultAnalysis
            result={{ analysis: data.latestLabResult.analysis }}
          />
        </div>
      ) : null}
    </>
  );
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
