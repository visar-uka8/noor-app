"use client";

import { Copy, Loader2, Share2, UsersRound } from "lucide-react";
import type { FormEvent } from "react";
import { useState } from "react";
import {
  relationships,
  type FamilyInvitation,
  type Relationship,
} from "@/types/family-invitations";

type FlowStep = "form" | "created";

export function FamilyInvitationFlow() {
  const [step, setStep] = useState<FlowStep>("form");
  const [name, setName] = useState("");
  const [relationship, setRelationship] = useState<Relationship>("Tochter");
  const [contact, setContact] = useState("");
  const [invitation, setInvitation] = useState<FamilyInvitation | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);

  async function createInvitation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/family-invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          familyMemberName: name,
          relationship,
          contact,
        }),
      });

      if (!response.ok) throw new Error("Invitation creation failed.");

      const data = (await response.json()) as {
        invitation: FamilyInvitation;
      };

      setInvitation(data.invitation);
      setStep("created");
    } catch {
      setErrorMessage(
        "Die Einladung konnte gerade nicht erstellt werden. Bitte versuchen Sie es später erneut.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function shareInvitation() {
    if (!invitation) return;

    const message = `Ich benutze Noor für meine Gesundheit. Verbinde dich mit mir mit dem Code ${invitation.code} in der Noor App — noor.health`;

    try {
      if (navigator.share) {
        await navigator.share({
          title: "Noor Einladung",
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

  if (step === "created" && invitation) {
    return (
      <main className="mx-auto flex w-full max-w-app flex-1 flex-col px-5 py-6">
        <section className="rounded-2xl border border-border bg-surface p-6 text-center shadow-[var(--warm-shadow)]">
          <div
            className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-family-light text-family"
            aria-hidden="true"
          >
            <UsersRound size={32} strokeWidth={2.2} />
          </div>

          <h1 className="mt-5 text-2xl font-bold text-foreground">
            Einladungscode
          </h1>
          <p className="mt-3 text-base leading-relaxed text-muted">
            Teilen Sie diesen Code mit {invitation.familyMemberName}. Er ist 24
            Stunden gültig.
          </p>

          <div className="mt-6 rounded-2xl bg-family-light px-4 py-6">
            <p className="tracking-[0.18em] text-5xl font-bold text-family">
              {invitation.code}
            </p>
          </div>

          <button
            type="button"
            onClick={shareInvitation}
            className="mt-6 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-4 text-base font-semibold text-white transition-colors hover:bg-primary-dark active:scale-[0.98]"
          >
            <Share2 size={22} strokeWidth={2.4} aria-hidden="true" />
            Code teilen
          </button>

          {shareFeedback && (
            <p className="mt-3 text-base font-medium text-muted" role="status">
              {shareFeedback}
            </p>
          )}
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-app flex-1 flex-col px-5 py-6">
      <section className="rounded-2xl border border-border bg-surface p-5 shadow-[var(--warm-shadow)]">
        <h1 className="text-2xl font-bold text-foreground">
          Familienmitglied einladen
        </h1>
        <p className="mt-2 text-base leading-relaxed text-muted">
          Wen möchten Sie mit Ihrer Noor App verbinden?
        </p>

        <form className="mt-6 flex flex-col gap-5" onSubmit={createInvitation}>
          <label className="flex flex-col gap-2 text-base font-semibold text-foreground">
            Name
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              minLength={2}
              className="min-h-12 rounded-2xl border border-border bg-background px-4 py-3 text-base font-normal outline-none focus:border-primary"
              placeholder="z. B. Alex"
            />
          </label>

          <label className="flex flex-col gap-2 text-base font-semibold text-foreground">
            Beziehung
            <select
              value={relationship}
              onChange={(event) =>
                setRelationship(event.target.value as Relationship)
              }
              className="min-h-12 rounded-2xl border border-border bg-background px-4 py-3 text-base font-normal outline-none focus:border-primary"
            >
              {relationships.map((relationshipOption) => (
                <option key={relationshipOption} value={relationshipOption}>
                  {relationshipOption}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-2 text-base font-semibold text-foreground">
            Telefonnummer oder E-Mail
            <input
              value={contact}
              onChange={(event) => setContact(event.target.value)}
              required
              className="min-h-12 rounded-2xl border border-border bg-background px-4 py-3 text-base font-normal outline-none focus:border-primary"
              placeholder="z. B. alex@example.de"
            />
          </label>

          {errorMessage && (
            <p
              className="rounded-2xl bg-red-50 px-4 py-3 text-base font-medium text-red-700"
              role="alert"
            >
              {errorMessage}
            </p>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-4 text-base font-semibold text-white transition-colors hover:bg-primary-dark active:scale-[0.98] disabled:opacity-70"
          >
            {isLoading ? (
              <>
                <Loader2
                  size={22}
                  className="animate-spin"
                  aria-hidden="true"
                />
                Code wird erstellt...
              </>
            ) : (
              <>
                <Copy size={22} strokeWidth={2.4} aria-hidden="true" />
                Einladungscode erstellen
              </>
            )}
          </button>
        </form>
      </section>
    </main>
  );
}
