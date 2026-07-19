"use client";

import { getLabResultStatusDisplay } from "@/lib/parse-lab-analysis";
import type { LabResultRecord } from "@/types/lab-results";

export function LabResultStatusSummary({ result }: { result: LabResultRecord }) {
  const display = getLabResultStatusDisplay(result);

  if (display.mode === "tap") {
    return (
      <p
        style={{
          margin: 0,
          textAlign: "left",
          fontSize: "14px",
          color: "#88856F",
        }}
      >
        Analyse verfügbar — tippen zum Ansehen
      </p>
    );
  }

  const { counts } = display;

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "flex-start",
        gap: "8px",
        marginTop: 0,
        flexWrap: "wrap",
      }}
      aria-label={`${counts.normal} normal, ${counts.watch} beachten, ${counts.high} erhöht`}
    >
      {counts.normal > 0 ? (
        <StatusBadge
          emoji="🟢"
          count={counts.normal}
          label="Normal"
          background="#EAF3DE"
          color="#27500A"
        />
      ) : null}
      {counts.watch > 0 ? (
        <StatusBadge
          emoji="🟡"
          count={counts.watch}
          label="Beachten"
          background="#FAEEDA"
          color="#633806"
        />
      ) : null}
      {counts.high > 0 ? (
        <StatusBadge
          emoji="🔴"
          count={counts.high}
          label="Erhöht"
          background="#FCEBEB"
          color="#791F1F"
        />
      ) : null}
    </div>
  );
}

function StatusBadge({
  emoji,
  count,
  label,
  background,
  color,
}: {
  emoji: string;
  count: number;
  label: string;
  background: string;
  color: string;
}) {
  return (
    <span
      style={{
        background,
        color,
        padding: "2px 8px",
        borderRadius: "20px",
        fontSize: "11px",
        fontWeight: "600",
      }}
    >
      {emoji} {count} {label}
    </span>
  );
}
