"use client";

import { Loader2, UsersRound } from "lucide-react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useState } from "react";

const expiredMessage =
  "Dieser Code ist abgelaufen. Bitte fordern Sie einen neuen an.";
const invalidMessage = "Ungültiger Code. Bitte überprüfen Sie die Eingabe.";

export function FamilyJoinFlow() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function acceptInvitation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/family-invitations/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = (await response.json()) as {
        dashboardUrl?: string;
        error?: string;
      };

      if (!response.ok) {
        setErrorMessage(data.error ?? invalidMessage);
        return;
      }

      router.push(data.dashboardUrl ?? "/dashboard");
    } catch {
      setErrorMessage(invalidMessage);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-app flex-1 flex-col px-5 py-6">
      <section className="rounded-2xl border border-border bg-surface p-5 shadow-[var(--warm-shadow)]">
        <div
          className="flex h-14 w-14 items-center justify-center rounded-2xl bg-family-light text-family"
          aria-hidden="true"
        >
          <UsersRound size={30} strokeWidth={2.2} />
        </div>
        <h1 className="mt-5 text-2xl font-bold text-foreground">
          Mit Familie verbinden
        </h1>
        <p className="mt-2 text-base leading-relaxed text-muted">
          Geben Sie den 6-stelligen Code ein, den Sie erhalten haben.
        </p>

        <form className="mt-6 flex flex-col gap-5" onSubmit={acceptInvitation}>
          <label className="flex flex-col gap-2 text-base font-semibold text-foreground">
            Einladungscode
            <input
              value={code}
              onChange={(event) =>
                setCode(event.target.value.replace(/\D/g, "").slice(0, 6))
              }
              inputMode="numeric"
              pattern="[0-9]{6}"
              required
              className="min-h-12 rounded-2xl border border-border bg-background px-4 py-4 text-center text-3xl font-bold tracking-[0.18em] outline-none focus:border-primary"
              placeholder="123456"
              aria-describedby="code-help"
            />
          </label>
          <p id="code-help" className="text-base text-muted">
            Der Code ist 24 Stunden gültig.
          </p>

          {errorMessage && (
            <p
              className="rounded-2xl bg-red-50 px-4 py-3 text-base font-medium text-red-700"
              role="alert"
            >
              {errorMessage === expiredMessage ? expiredMessage : errorMessage}
            </p>
          )}

          <button
            type="submit"
            disabled={isLoading || code.length !== 6}
            className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-4 text-base font-semibold text-white transition-colors hover:bg-primary-dark active:scale-[0.98] disabled:opacity-70"
          >
            {isLoading ? (
              <>
                <Loader2
                  size={22}
                  className="animate-spin"
                  aria-hidden="true"
                />
                Wird verbunden...
              </>
            ) : (
              "Verbinden"
            )}
          </button>
        </form>
      </section>
    </main>
  );
}
