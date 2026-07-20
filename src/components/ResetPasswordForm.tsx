"use client";

import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ErrorBanner } from "@/components/AppStates";
import { AuthPasswordInput } from "@/components/AuthInput";
import { AuthShell } from "@/components/AuthShell";
import { createClient } from "@/lib/supabase/client";

export function ResetPasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function verifyRecoverySession() {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!cancelled && !session) {
        setErrorMessage(
          "Der Link ist ungültig oder abgelaufen. Bitte fordern Sie einen neuen Link an.",
        );
      }

      if (!cancelled) {
        setIsCheckingSession(false);
      }
    }

    void verifyRecoverySession();

    return () => {
      cancelled = true;
    };
  }, []);

  async function updatePassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);

    if (password !== passwordConfirm) {
      setErrorMessage("Passwörter stimmen nicht überein.");
      return;
    }

    if (password.length < 8) {
      setErrorMessage("Das Passwort muss mindestens 8 Zeichen lang sein.");
      return;
    }

    setIsLoading(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password });

      if (error) throw error;

      await supabase.auth.signOut();
      router.replace("/login?reset=success");
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Passwort konnte nicht gespeichert werden.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  if (isCheckingSession) {
    return (
      <AuthShell subtitle="Passwort wird vorbereitet…">
        <section className="noor-card flex items-center justify-center gap-2 p-8 text-muted">
          <Loader2 size={22} className="animate-spin" aria-hidden="true" />
          Einen Moment bitte…
        </section>
      </AuthShell>
    );
  }

  return (
    <AuthShell subtitle="Wählen Sie ein neues Passwort für Ihr Konto.">
      {errorMessage ? (
        <ErrorBanner
          message={errorMessage}
          actionLabel="Erneut versuchen"
          onAction={() => setErrorMessage(null)}
          onDismiss={() => setErrorMessage(null)}
        />
      ) : null}

      <form className="noor-card p-5" onSubmit={updatePassword}>
        <div className="grid gap-4">
          <AuthPasswordInput
            label="Neues Passwort"
            value={password}
            onChange={setPassword}
          />
          <AuthPasswordInput
            label="Passwort bestätigen"
            value={passwordConfirm}
            onChange={setPasswordConfirm}
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="btn-primary mt-6 w-full gap-2 disabled:opacity-70"
        >
          {isLoading && <Loader2 size={22} className="animate-spin" />}
          Passwort speichern
        </button>

        <p className="mt-5 text-center text-base text-muted">
          <Link href="/forgot-password" className="font-semibold text-primary">
            Neuen Link anfordern
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}
