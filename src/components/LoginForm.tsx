"use client";

import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ErrorBanner } from "@/components/AppStates";
import { AuthShell } from "@/components/AuthShell";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/types/profiles";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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
        window.localStorage.setItem("noor-home-view-mode", "family");
      }

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
          <AuthInput
            label="Passwort"
            value={password}
            onChange={setPassword}
            type="password"
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
          <Link href="#" className="font-semibold text-primary">
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

function AuthInput({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <label className="flex flex-col gap-2 text-base font-semibold text-foreground">
      {label}
      <input
        required
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-12 rounded-2xl border border-border bg-background px-4 py-3 text-base font-normal outline-none focus:border-primary"
      />
    </label>
  );
}
