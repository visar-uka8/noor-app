"use client";

import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ErrorBanner } from "@/components/AppStates";
import { AuthInput } from "@/components/AuthInput";
import { AuthShell } from "@/components/AuthShell";
import { getPasswordResetUrl } from "@/lib/registration-onboarding";
import { formatAuthError } from "@/lib/auth-errors";
import { createClient } from "@/lib/supabase/client";

export function ForgotPasswordForm() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    const prefilledEmail = searchParams.get("email")?.trim();
    if (prefilledEmail) {
      setEmail(prefilledEmail);
    }
  }, [searchParams]);

  async function sendResetLink(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const trimmedEmail = email.trim();

      if (!trimmedEmail) {
        throw new Error("Bitte geben Sie Ihre E-Mail-Adresse ein.");
      }

      const supabase = createClient();
      const { error } = await supabase.auth.resetPasswordForEmail(trimmedEmail, {
        redirectTo: getPasswordResetUrl(),
      });

      if (error) throw error;

      setSuccessMessage(
        "Falls ein Konto mit dieser E-Mail existiert, haben wir Ihnen einen Link zum Zurücksetzen des Passworts gesendet.",
      );
    } catch (error) {
      setErrorMessage(
        formatAuthError(
          error,
          "password_reset",
          "Link konnte gerade nicht gesendet werden. Bitte versuchen Sie es erneut.",
        ),
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <AuthShell subtitle="Wir senden Ihnen einen Link zum Zurücksetzen Ihres Passworts.">
      {errorMessage ? (
        <ErrorBanner
          message={errorMessage}
          actionLabel="Erneut versuchen"
          onAction={() => setErrorMessage(null)}
          onDismiss={() => setErrorMessage(null)}
        />
      ) : null}

      {successMessage ? (
        <div className="noor-card mb-4 border border-primary/20 bg-primary-light p-5 text-sm leading-relaxed text-foreground">
          {successMessage}
        </div>
      ) : null}

      <form className="noor-card p-5" onSubmit={sendResetLink}>
        <div className="grid gap-4">
          <AuthInput
            label="E-Mail"
            value={email}
            onChange={setEmail}
            type="email"
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="btn-primary mt-6 w-full gap-2 disabled:opacity-70"
        >
          {isLoading && <Loader2 size={22} className="animate-spin" />}
          Link senden
        </button>

        <p className="mt-5 text-center text-base text-muted">
          <Link href="/login" className="font-semibold text-primary">
            Zurück zur Anmeldung
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}
