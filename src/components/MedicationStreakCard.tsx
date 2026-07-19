"use client";

import { getStreakMilestoneMessage } from "@/lib/medication-streak";

type MedicationStreakCardProps = {
  streak: number;
  variant?: "home" | "medication" | "family";
  patientFirstName?: string;
  familyMessage?: string;
  subtitleOverride?: string;
};

export function MedicationStreakCard({
  streak,
  variant = "home",
  familyMessage,
  subtitleOverride,
}: MedicationStreakCardProps) {
  if (streak < 2) return null;

  if (variant === "medication") {
    return (
      <p
        className="mb-4 text-[14px] font-semibold text-[#085041]"
        role="status"
        aria-live="polite"
      >
        🔥 {streak}-Tage-Streak — nicht aufhören!
      </p>
    );
  }

  if (variant === "family") {
    return (
      <div
        style={{
          backgroundColor: "#FFFFFF",
          borderRadius: "16px",
          border: "0.5px solid #E4E2DB",
          padding: "14px 16px",
          display: "flex",
          alignItems: "center",
          gap: "12px",
          marginTop: "12px",
        }}
        role="status"
        aria-live="polite"
      >
        <div style={{ fontSize: "28px", lineHeight: 1 }} aria-hidden="true">
          🔥
        </div>
        <div
          style={{
            fontSize: "15px",
            fontWeight: 600,
            color: "#085041",
            lineHeight: 1.35,
          }}
        >
          {familyMessage ??
            `Medikamente ${streak} Tage in Folge genommen`}
        </div>
      </div>
    );
  }

  const milestone = getStreakMilestoneMessage(streak);

  return (
    <div
      style={{
        backgroundColor: "#FFFFFF",
        borderRadius: "16px",
        border: "0.5px solid #E4E2DB",
        padding: "14px 16px",
        display: "flex",
        alignItems: "center",
        gap: "12px",
      }}
      role="status"
      aria-live="polite"
    >
      <div style={{ fontSize: "28px", lineHeight: 1 }} aria-hidden="true">
        🔥
      </div>
      <div>
        <div
          style={{
            fontSize: "15px",
            fontWeight: 600,
            color: "#085041",
          }}
        >
          {streak} Tage in Folge
        </div>
        <div
          style={{
            fontSize: "13px",
            color: "#88856F",
            marginTop: "2px",
          }}
        >
          {subtitleOverride ?? milestone ?? "Alle Medikamente genommen — weiter so!"}
        </div>
      </div>
    </div>
  );
}
