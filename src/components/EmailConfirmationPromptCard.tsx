"use client";

import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuthUser } from "@/hooks/useAuthUser";
import {
  dismissEmailConfirmationPrompt,
  isEmailConfirmationPromptDismissed,
} from "@/lib/email-confirmation-prompt-dismiss";
import { getRegistrationConfirmUrl } from "@/lib/registration-onboarding";
import { supabase } from "@/lib/supabase";

export function EmailConfirmationPromptCard() {
  const { user } = useAuthUser();
  const [dismissed, setDismissed] = useState<boolean | null>(null);
  const [isResending, setIsResending] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);

  const emailConfirmed = Boolean(user?.email_confirmed_at);

  useEffect(() => {
    setDismissed(isEmailConfirmationPromptDismissed());
  }, []);

  if (emailConfirmed || dismissed !== false || !user?.email) {
    return null;
  }

  async function resendConfirmationEmail() {
    if (!user?.email) return;

    setIsResending(true);
    setResendMessage(null);

    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: user.email,
        options: {
          emailRedirectTo: getRegistrationConfirmUrl(),
        },
      });

      if (error) {
        throw error;
      }

      setResendMessage("E-Mail wurde erneut gesendet.");
    } catch {
      setResendMessage(
        "E-Mail konnte gerade nicht gesendet werden. Bitte später erneut versuchen.",
      );
    } finally {
      setIsResending(false);
    }
  }

  function dismiss() {
    dismissEmailConfirmationPrompt();
    setDismissed(true);
  }

  return (
    <div
      className="mb-3 flex items-center justify-between gap-3 rounded-2xl px-4 py-3"
      style={{ backgroundColor: "#FAEEDA" }}
      role="status"
      aria-live="polite"
    >
      <div className="flex min-w-0 flex-1 items-center gap-2.5">
        <span className="text-lg" aria-hidden="true">
          ✉️
        </span>
        <div className="min-w-0">
          <div className="text-sm font-semibold text-[#633806]">
            E-Mail bestätigen
          </div>
          <div className="mt-0.5 text-xs text-[#BA7517]">
            {resendMessage ?? "Wir haben Ihnen eine E-Mail geschickt."}
          </div>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={() => void resendConfirmationEmail()}
          disabled={isResending}
          className="whitespace-nowrap rounded-[20px] border-none px-3.5 py-1.5 text-xs font-semibold text-white disabled:opacity-70"
          style={{ backgroundColor: "#BA7517", cursor: "pointer" }}
        >
          {isResending ? (
            <Loader2 size={14} className="animate-spin" aria-hidden="true" />
          ) : (
            "Erneut senden"
          )}
        </button>
        <button
          type="button"
          onClick={dismiss}
          className="border-none bg-transparent p-1 text-base text-[#88856F]"
          aria-label="Schließen"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
