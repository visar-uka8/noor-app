"use client";

import { ErrorBanner } from "@/components/AppStates";
import { Loader2, Share2, UsersRound } from "lucide-react";
import { useEffect, useState } from "react";
import {
  buildInviteShareMessage,
  formatInviteCountdown,
  type FamilyInvite,
} from "@/types/family-connect";

export function FamilyConnectInvite() {
  const [invite, setInvite] = useState<FamilyInvite | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<string | null>(null);

  useEffect(() => {
    if (!invite) return;

    const expiresAt = invite.expiresAt;

    function updateCountdown() {
      setCountdown(formatInviteCountdown(expiresAt));
    }

    updateCountdown();
    const interval = window.setInterval(updateCountdown, 1000);
    return () => window.clearInterval(interval);
  }, [invite]);

  async function createInvite() {
    setIsLoading(true);
    setErrorMessage(null);
    setShareFeedback(null);

    try {
      const response = await fetch("/api/family-invites", { method: "POST" });

      if (!response.ok) {
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

        <p className="mt-5 text-center text-base leading-relaxed text-muted">
          Teilen Sie diesen Code mit Ihrem Kind
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
          <p className="mt-4 text-center text-base text-muted">
            Noch gültig: <span className="font-semibold text-foreground">{countdown}</span>
          </p>
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

      <section className="noor-card p-6">
        <h2 className="heading-lg">Familie einladen</h2>
        <p className="text-body mt-2 text-muted">
          Erstellen Sie einen Code, damit Ihr Kind Ihre Gesundheit in Noor sehen
          kann.
        </p>

        <button
          type="button"
          onClick={createInvite}
          disabled={isLoading}
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
