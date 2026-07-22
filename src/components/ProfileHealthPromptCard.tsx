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
      className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
      style={{
        backgroundColor: "#FFFFFF",
        border: "0.5px solid #E4E2DB",
        borderRadius: "16px",
        padding: "16px",
      }}
      aria-label="Profil vervollständigen"
    >
      <div className="flex min-w-0 items-center gap-3 sm:flex-1">
        <span
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl"
          style={{ backgroundColor: "#E1F5EE", color: "#1D9E75" }}
          aria-hidden="true"
        >
          <UserRound size={26} strokeWidth={2.2} />
        </span>
        <div className="min-w-0 flex-1">
          <p
            className="text-[15px] font-semibold leading-snug text-[#085041]"
            style={{ margin: 0 }}
          >
            Profil vervollständigen
          </p>
          <p
            className="mt-0.5 line-clamp-2 text-[13px] text-[#88856F]"
            style={{ margin: 0 }}
          >
            {subtitle}
          </p>
        </div>
      </div>

      <div className="flex shrink-0 gap-2 self-stretch sm:self-auto">
        <button
          type="button"
          onClick={() => {
            dismissProfileHealthPrompt(userId);
            setDismissed(true);
          }}
          className="btn-touch flex-1 rounded-2xl border-2 border-border bg-surface px-4 py-3 text-sm font-semibold text-muted transition-opacity hover:opacity-80 sm:flex-none sm:min-w-[96px]"
        >
          Später
        </button>
        <Link
          href="/settings/profile"
          className="btn-touch flex-1 rounded-2xl px-4 py-3 text-sm font-semibold whitespace-nowrap transition-opacity hover:opacity-80 sm:flex-none"
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
