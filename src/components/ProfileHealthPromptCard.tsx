"use client";

import { UserRound } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  dismissProfileHealthPrompt,
  isProfileHealthPromptDismissed,
} from "@/lib/profile-health-prompt-dismiss";

type ProfileHealthPromptCardProps = {
  userId: string;
  missingLabels?: string[];
};

export function ProfileHealthPromptCard({
  userId,
  missingLabels = [],
}: ProfileHealthPromptCardProps) {
  const [dismissed, setDismissed] = useState<boolean | null>(null);

  useEffect(() => {
    setDismissed(isProfileHealthPromptDismissed(userId));
  }, [userId]);

  if (dismissed !== false) {
    return null;
  }

  const subtitle =
    missingLabels.length > 0
      ? `Noch: ${missingLabels.join(", ")}`
      : "Größe, Gewicht & Aktivität helfen bei Labor-Analysen";

  return (
    <section
      className="flex flex-wrap items-center justify-between gap-4"
      style={{
        backgroundColor: "#FFFFFF",
        border: "0.5px solid #E4E2DB",
        borderRadius: "16px",
        padding: "16px",
      }}
      aria-label="Profil vervollständigen"
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <span
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl"
          style={{ backgroundColor: "#E1F5EE", color: "#1D9E75" }}
          aria-hidden="true"
        >
          <UserRound size={26} strokeWidth={2.2} />
        </span>
        <div className="min-w-0">
          <p
            style={{
              margin: 0,
              fontSize: "15px",
              fontWeight: 600,
              color: "#085041",
            }}
          >
            Profil vervollständigen
          </p>
          <p
            style={{
              margin: "2px 0 0",
              fontSize: "13px",
              color: "#88856F",
            }}
          >
            {subtitle}
          </p>
        </div>
      </div>

      <div className="flex w-full shrink-0 flex-col gap-2 sm:w-auto sm:flex-row">
        <button
          type="button"
          onClick={() => {
            dismissProfileHealthPrompt(userId);
            setDismissed(true);
          }}
          className="btn-touch flex-1 rounded-2xl border-2 border-border bg-surface px-4 py-3 text-base font-semibold text-muted transition-opacity hover:opacity-80 sm:flex-none"
        >
          Später
        </button>
        <Link
          href="/settings/profile"
          className="btn-touch flex-1 rounded-2xl px-4 py-3 text-base font-semibold whitespace-nowrap transition-opacity hover:opacity-80 sm:flex-none"
          style={{
            backgroundColor: "#E1F5EE",
            color: "#1D9E75",
            textDecoration: "none",
          }}
        >
          Ausfüllen
        </Link>
      </div>
    </section>
  );
}
