"use client";

import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ErrorBanner } from "@/components/AppStates";
import { AuthInput, AuthPasswordInput } from "@/components/AuthInput";
import { AuthShell } from "@/components/AuthShell";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/types/profiles";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    const authError = searchParams.get("error");
    const resetSuccess = searchParams.get("reset");

    if (authError === "confirmation_failed") {
      setErrorMessage(
        "E-Mail-Bestätigung ist fehlgeschlagen. Bitte registrieren Sie sich erneut oder kontaktieren Sie den Support.",
      );
    }

    if (resetSuccess === "success") {
      setSuccessMessage("Ihr Passwort wurde erfolgreich geändert. Sie können sich jetzt anmelden.");
    }
  }, [searchParams]);

  async function login(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      if (!data.user) throw new Error("No user returned from Supabase.");

      const profileResponse = await fetch(`/api/profiles?userId=${data.user.id}`);
      const profileData = (await profileResponse.json()) as {
        profile: Profile | null;
      };
      const role = profileData.profile?.role ?? "patient";

      if (role === "family_member") {
        const dashResponse = await fetch("/api/family-dashboard", {
          credentials: "include",
        });
        const dashData = (await dashResponse.json()) as { connected?: boolean };

        router.refresh();
        router.push(dashData.connected ? "/" : "/family/connect");
        return;
      }

      router.refresh();
      router.push("/");
    } catch {
      setErrorMessage(
        "Anmeldung ist gerade nicht möglich. Bitte prüfen Sie E-Mail und Passwort.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <AuthShell>
      {successMessage ? (
        <div className="noor-card mb-4 border border-primary/20 bg-primary-light p-5 text-sm leading-relaxed text-foreground">
          {successMessage}
        </div>
      ) : null}

      {errorMessage ? (
        <ErrorBanner
          message={errorMessage}
          actionLabel="Erneut versuchen"
          onAction={() => setErrorMessage(null)}
          onDismiss={() => setErrorMessage(null)}
        />
      ) : null}

      <form className="noor-card p-5" onSubmit={login}>
        <div className="grid gap-4">
          <AuthInput
            label="E-Mail"
            value={email}
            onChange={setEmail}
            type="email"
          />
          <AuthPasswordInput
            label="Passwort"
            value={password}
            onChange={setPassword}
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="btn-primary mt-6 w-full gap-2 disabled:opacity-70"
        >
          {isLoading && <Loader2 size={22} className="animate-spin" />}
          Anmelden
        </button>

        <div className="mt-5 flex flex-col gap-3 text-center text-base">
          <Link
            href={
              email.trim()
                ? `/forgot-password?email=${encodeURIComponent(email.trim())}`
                : "/forgot-password"
            }
            className="font-semibold text-primary"
          >
            Passwort vergessen?
          </Link>
          <p className="text-muted">
            Noch kein Konto?{" "}
            <Link href="/register" className="font-semibold text-primary">
              Jetzt registrieren
            </Link>
          </p>
        </div>
      </form>
    </AuthShell>
  );
}
