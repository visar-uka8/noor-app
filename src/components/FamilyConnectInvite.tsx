"use client";

import { ErrorBanner } from "@/components/AppStates";
import { UpgradePromptCard } from "@/components/UpgradePromptCard";
import { Loader2, Share2, UsersRound } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  buildInviteShareMessage,
  formatInviteCountdown,
  type FamilyInvite,
} from "@/types/family-connect";

const PATIENT_ROLE_LABEL =
  "Sie sind der Patient. Teilen Sie diesen Code mit Ihrem Kind damit es Ihre Gesundheit im Blick behalten kann.";

export function FamilyConnectInvite() {
  const [invite, setInvite] = useState<FamilyInvite | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<string | null>(null);
  const [familyLimitReached, setFamilyLimitReached] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadQuota() {
      try {
        const response = await fetch("/api/subscription/status", {
          credentials: "include",
        });

        if (!response.ok) return;

        const data = (await response.json()) as {
          familyQuota?: { allowed?: boolean };
        };

        if (!cancelled) {
          setFamilyLimitReached(data.familyQuota?.allowed === false);
        }
      } catch {
        // Ignore quota load errors — invite flow still works.
      }
    }

    void loadQuota();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!invite) return;

    const expiresAt = invite.expiresAt;

    function updateCountdown() {
      setCountdown(formatInviteCountdown(expiresAt));
    }

    updateCountdown();
    const interval = window.setInterval(updateCountdown, 30_000);
    return () => window.clearInterval(interval);
  }, [invite]);

  async function createInvite() {
    setIsLoading(true);
    setErrorMessage(null);
    setShareFeedback(null);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const response = await fetch("/api/family-invites", {
        method: "POST",
        credentials: "include",
        headers: session?.access_token
          ? { Authorization: `Bearer ${session.access_token}` }
          : {},
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          code?: string;
        } | null;

        if (response.status === 403 && payload?.code === "upgrade_required") {
          setFamilyLimitReached(true);
          return;
        }

        throw new Error("Invite creation failed.");
      }

      const data = (await response.json()) as { invite: FamilyInvite };
      setInvite(data.invite);
    } catch {
      setErrorMessage(
        "Die Einladung konnte gerade nicht erstellt werden. Bitte versuchen Sie es später erneut.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function shareInvite() {
    if (!invite) return;

    const message = buildInviteShareMessage(invite.code);

    try {
      if (navigator.share) {
        await navigator.share({
          title: "Noor Familieneinladung",
          text: message,
        });
        return;
      }

      await navigator.clipboard.writeText(message);
      setShareFeedback("Einladung wurde kopiert.");
    } catch {
      setShareFeedback("Teilen ist gerade nicht möglich.");
    }
  }

  if (invite) {
    const isExpired = countdown === null;

    return (
      <section className="noor-card p-6">
        <div
          className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-family-light text-family"
          aria-hidden="true"
        >
          <UsersRound size={32} strokeWidth={2.2} />
        </div>

        <p
          className="mt-5 text-center text-[15px] leading-relaxed font-medium text-[#085041]"
          role="status"
        >
          {PATIENT_ROLE_LABEL}
        </p>

        <div className="mt-6 rounded-2xl bg-family-light px-4 py-6 text-center">
          <p className="text-stat tracking-[0.12em] text-family">
            {invite.code}
          </p>
        </div>

        {isExpired ? (
          <p className="text-body mt-4 text-center font-semibold text-danger" role="alert">
            Dieser Code ist abgelaufen. Bitte erstellen Sie einen neuen.
          </p>
        ) : (
          <p className="mt-4 text-center text-base text-muted">{countdown}</p>
        )}

        <button
          type="button"
          onClick={shareInvite}
          disabled={isExpired}
          className="btn-primary mt-6 w-full gap-2 disabled:opacity-60"
        >
          <Share2 size={22} strokeWidth={2.4} aria-hidden="true" />
          Code teilen
        </button>

        {shareFeedback ? (
          <p className="mt-3 text-center text-base text-muted" role="status">
            {shareFeedback}
          </p>
        ) : null}

        {isExpired ? (
          <button
            type="button"
            onClick={() => {
              setInvite(null);
              void createInvite();
            }}
            className="btn-touch mt-3 w-full rounded-2xl border-2 border-primary bg-surface px-5 py-4 text-base font-semibold text-primary transition-colors hover:bg-primary-light"
          >
            Neuen Code erstellen
          </button>
        ) : null}
      </section>
    );
  }

  return (
    <>
      {errorMessage ? (
        <ErrorBanner
          message={errorMessage}
          actionLabel="Erneut versuchen"
          onAction={() => {
            setErrorMessage(null);
            void createInvite();
          }}
          onDismiss={() => setErrorMessage(null)}
        />
      ) : null}

      {familyLimitReached ? (
        <UpgradePromptCard className="mb-5" />
      ) : null}

      <section className="noor-card p-6">
        <h2 className="heading-lg">Familie einladen</h2>
        <p className="mt-3 text-[15px] leading-relaxed font-medium text-[#085041]">
          {PATIENT_ROLE_LABEL}
        </p>
        <p className="text-body mt-3 text-muted">
          Erstellen Sie einen Code, damit Ihr Kind Ihre Gesundheit in Noor sehen
          kann.
        </p>

        <button
          type="button"
          onClick={createInvite}
          disabled={isLoading || familyLimitReached}
          className="btn-primary mt-6 w-full gap-2 disabled:opacity-70"
        >
          {isLoading ? (
            <>
              <Loader2 size={22} className="animate-spin" aria-hidden="true" />
              Code wird erstellt...
            </>
          ) : (
            "Familie einladen"
          )}
        </button>
      </section>
    </>
  );
}
