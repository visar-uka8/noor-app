"use client";

import { MailCheck } from "lucide-react";
import { useEffect, useState } from "react";
import {
  dismissEmailConfirmationPrompt,
  isEmailConfirmationPromptDismissed,
} from "@/lib/email-confirmation-prompt-dismiss";

export function EmailConfirmationPromptCard() {
  const [dismissed, setDismissed] = useState<boolean | null>(null);

  useEffect(() => {
    setDismissed(isEmailConfirmationPromptDismissed());
  }, []);

  if (dismissed !== false) {
    return null;
  }

  return (
    <section
      className="flex flex-wrap items-center justify-between gap-4"
      style={{
        backgroundColor: "#FAEEDA",
        border: "0.5px solid #E4D4A8",
        borderRadius: "16px",
        padding: "16px",
      }}
      aria-label="E-Mail bestätigen"
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <span
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl"
          style={{ backgroundColor: "#F5E6C4", color: "#BA7517" }}
          aria-hidden="true"
        >
          <MailCheck size={26} strokeWidth={2.2} />
        </span>
        <div className="min-w-0">
          <p
            style={{
              margin: 0,
              fontSize: "15px",
              fontWeight: 600,
              color: "#633806",
            }}
          >
            E-Mail bestätigen
          </p>
          <p
            style={{
              margin: "2px 0 0",
              fontSize: "13px",
              color: "#BA7517",
            }}
          >
            Bitte klicken Sie den Link in Ihrer Bestätigungs-E-Mail, um Ihr
            Konto zu sichern.
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={() => {
          dismissEmailConfirmationPrompt();
          setDismissed(true);
        }}
        className="btn-touch shrink-0 rounded-2xl border-2 border-[#E4D4A8] bg-white px-4 py-3 text-base font-semibold text-[#633806] transition-opacity hover:opacity-80"
      >
        Später
      </button>
    </section>
  );
}
