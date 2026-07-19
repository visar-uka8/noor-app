"use client";

import { CheckCircle2, Loader2, UsersRound } from "lucide-react";
import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { notifyFamilyConnectionsChanged } from "@/lib/family-links-query";
import { supabase } from "@/lib/supabase";
import {
  familyInviteErrors,
  familyRelationships,
  type FamilyRelationship,
} from "@/types/family-connect";

type ConnectStep = "form" | "success";

export function FamilyConnectJoin() {
  const router = useRouter();
  const [step, setStep] = useState<ConnectStep>("form");
  const [code, setCode] = useState("");
  const [relationship, setRelationship] = useState<FamilyRelationship>("Tochter");
  const [patientName, setPatientName] = useState("");
  const [previewPatientName, setPreviewPatientName] = useState<string | null>(
    null,
  );
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (step !== "success") return;

    const timer = window.setTimeout(() => {
      router.push("/");
    }, 2800);

    return () => window.clearTimeout(timer);
  }, [step, router]);

  useEffect(() => {
    if (code.length !== 6) {
      setPreviewPatientName(null);
      return;
    }

    let cancelled = false;

    async function lookupPatient() {
      setIsLookingUp(true);

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        const response = await fetch(
          `/api/family-invites/lookup?code=${encodeURIComponent(code)}`,
          {
            credentials: "include",
            headers: session?.access_token
              ? { Authorization: `Bearer ${session.access_token}` }
              : {},
          },
        );

        const data = (await response.json().catch(() => null)) as {
          found?: boolean;
          patientName?: string | null;
          ownCode?: boolean;
        } | null;

        if (cancelled) return;

        if (response.ok && data?.found && data.patientName && !data.ownCode) {
          setPreviewPatientName(data.patientName);
        } else {
          setPreviewPatientName(null);
        }
      } catch {
        if (!cancelled) setPreviewPatientName(null);
      } finally {
        if (!cancelled) setIsLookingUp(false);
      }
    }

    void lookupPatient();

    return () => {
      cancelled = true;
    };
  }, [code]);

  async function connectFamily(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        console.error("Connect auth error:", userError);
      }

      if (!user) {
        setErrorMessage("Bitte melden Sie sich an.");
        return;
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      const response = await fetch("/api/family-invites/connect", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...(session?.access_token
            ? { Authorization: `Bearer ${session.access_token}` }
            : {}),
        },
        body: JSON.stringify({ code, relationship }),
      });

      const data = (await response.json()) as {
        patientName?: string;
        error?: string;
        code?: string;
      };

      if (!response.ok) {
        setErrorMessage(
          data.error ??
            (data.code === "expired"
              ? familyInviteErrors.expired
              : data.code === "used"
                ? familyInviteErrors.used
                : familyInviteErrors.invalid),
        );
        return;
      }

      setPatientName(
        data.patientName ?? previewPatientName ?? "Ihrem Angehörigen",
      );
      notifyFamilyConnectionsChanged();
      setStep("success");
    } catch (error) {
      console.error("Family connect failed:", error);
      setErrorMessage(familyInviteErrors.invalid);
    } finally {
      setIsLoading(false);
    }
  }

  const displayPatientName = previewPatientName ?? "Ihrem Angehörigen";

  if (step === "success") {
    return (
      <section className="rounded-2xl border border-border bg-surface p-6 text-center shadow-[var(--warm-shadow)]">
        <div
          className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-primary-light text-primary"
          aria-hidden="true"
        >
          <CheckCircle2 size={44} strokeWidth={2.2} />
        </div>
        <h2 className="mt-5 text-2xl font-bold text-foreground">
          Verbunden mit {patientName} ✓
        </h2>
        <p className="mt-3 text-[15px] leading-relaxed text-[#085041]">
          Sie sehen jetzt deren Medikamente, Laborwerte und Gesundheitsstatus.
        </p>
        <p className="mt-2 text-base leading-relaxed text-muted">
          Sie werden zur Startseite weitergeleitet...
        </p>
        <a
          href="/"
          className="mt-6 flex min-h-12 w-full items-center justify-center rounded-2xl bg-primary px-5 py-4 text-base font-semibold text-white transition-colors hover:bg-primary-dark active:scale-[0.98]"
        >
          Zur Startseite
        </a>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-border bg-surface p-6 shadow-[var(--warm-shadow)]">
      <div
        className="flex h-14 w-14 items-center justify-center rounded-2xl bg-family-light text-family"
        aria-hidden="true"
      >
        <UsersRound size={30} strokeWidth={2.2} />
      </div>

      <h2 className="mt-5 text-2xl font-bold text-foreground">Code eingeben</h2>

      <div
        className="mt-3 rounded-2xl border border-[#E4E2DB] bg-[#F7F6F2] px-4 py-3"
        role="status"
      >
        <p className="text-[15px] font-semibold leading-relaxed text-[#085041]">
          Sie verbinden sich als Familienmitglied.
        </p>
        <p className="mt-1 text-[14px] leading-relaxed text-[#555555]">
          Sie werden die Gesundheit von{" "}
          <span className="font-semibold text-[#085041]">
            {isLookingUp ? "…" : displayPatientName}
          </span>{" "}
          im Blick behalten können.
        </p>
      </div>

      <p className="mt-3 text-base leading-relaxed text-muted">
        Geben Sie den 6-stelligen Code ein, den Sie von Ihrem Angehörigen
        erhalten haben.
      </p>

      <form className="mt-6 flex flex-col gap-5" onSubmit={connectFamily}>
        <label className="flex flex-col gap-2 text-base font-semibold text-foreground">
          Code eingeben
          <input
            value={code}
            onChange={(event) =>
              setCode(
                event.target.value
                  .toUpperCase()
                  .replace(/[^A-Z0-9]/g, "")
                  .slice(0, 6),
              )
            }
            inputMode="text"
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck={false}
            required
            className="min-h-14 rounded-2xl border border-border bg-background px-4 py-4 text-center text-[40px] font-bold tracking-[0.12em] outline-none focus:border-primary"
            placeholder="NR7K2M"
            aria-describedby="family-code-help"
          />
        </label>
        <p id="family-code-help" className="text-base text-muted">
          Der Code ist 48 Stunden gültig.
        </p>

        <fieldset className="flex flex-col gap-3">
          <legend className="text-base font-semibold text-foreground">
            Wie bist du verwandt?
          </legend>
          <div className="grid grid-cols-2 gap-3">
            {familyRelationships.map((option) => {
              const selected = relationship === option;

              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => setRelationship(option)}
                  className={`min-h-12 rounded-2xl border px-4 py-3 text-base font-semibold transition-colors active:scale-[0.98] ${
                    selected
                      ? "border-primary bg-primary-light text-primary"
                      : "border-border bg-background text-foreground hover:border-primary/30"
                  }`}
                  aria-pressed={selected}
                >
                  {option}
                </button>
              );
            })}
          </div>
        </fieldset>

        {errorMessage ? (
          <p
            className="rounded-2xl bg-red-50 px-4 py-3 text-base font-medium text-red-700"
            role="alert"
          >
            {errorMessage}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={isLoading || code.length !== 6}
          className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-4 text-base font-semibold text-white transition-colors hover:bg-primary-dark active:scale-[0.98] disabled:opacity-70"
        >
          {isLoading ? (
            <>
              <Loader2 size={22} className="animate-spin" aria-hidden="true" />
              Wird verbunden...
            </>
          ) : (
            "Verbinden"
          )}
        </button>
      </form>
    </section>
  );
}
