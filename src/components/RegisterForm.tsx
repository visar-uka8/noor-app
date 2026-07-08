"use client";

import { Heart, Loader2, UsersRound } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ErrorBanner } from "@/components/AppStates";
import { AuthShell } from "@/components/AuthShell";
import { createClient } from "@/lib/supabase/client";
import type { PendingRegistrationProfile, UserRole } from "@/types/profiles";

export function RegisterForm() {
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [pendingProfile, setPendingProfile] =
    useState<PendingRegistrationProfile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function register(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
            date_of_birth: dateOfBirth,
          },
        },
      });

      if (error) throw error;
      if (!data.user) throw new Error("No user returned from Supabase.");

      setPendingProfile({
        id: data.user.id,
        firstName,
        lastName,
        dateOfBirth,
      });
    } catch {
      setErrorMessage(
        "Registrierung ist gerade nicht möglich. Bitte prüfen Sie Ihre Daten.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function finishOnboarding(role: UserRole) {
    if (!pendingProfile) return;

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: pendingProfile.id,
          first_name: pendingProfile.firstName,
          last_name: pendingProfile.lastName,
          date_of_birth: pendingProfile.dateOfBirth,
          role,
        }),
      });

      if (!response.ok) throw new Error("Profile save failed.");

      router.push(role === "patient" ? "/" : "/dashboard");
    } catch {
      setErrorMessage(
        "Profil konnte gerade nicht gespeichert werden. Bitte versuchen Sie es erneut.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  if (pendingProfile) {
    return (
      <AuthShell subtitle="Nur noch eine kurze Frage.">
        {errorMessage ? (
          <ErrorBanner
            message={errorMessage}
            actionLabel="Erneut versuchen"
            onAction={() => setErrorMessage(null)}
            onDismiss={() => setErrorMessage(null)}
          />
        ) : null}
        <section className="noor-card p-5">
          <h2 className="heading-lg">Für wen nutzen Sie Noor?</h2>
          <div className="mt-5 grid gap-4">
            <RoleCard
              icon={<Heart size={30} aria-hidden="true" />}
              title="Für mich selbst"
              description="Ich möchte meine Gesundheit einfach verstehen."
              onClick={() => finishOnboarding("patient")}
            />
            <RoleCard
              icon={<UsersRound size={30} aria-hidden="true" />}
              title="Für mein Familienmitglied"
              description="Ich begleite die Gesundheit eines Angehörigen."
              onClick={() => finishOnboarding("family_member")}
            />
          </div>
        </section>
      </AuthShell>
    );
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

      <form className="noor-card p-5" onSubmit={register}>
        <div className="grid gap-4">
          <AuthInput label="Vorname" value={firstName} onChange={setFirstName} />
          <AuthInput label="Nachname" value={lastName} onChange={setLastName} />
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
          <AuthInput
            label="Geburtsdatum"
            value={dateOfBirth}
            onChange={setDateOfBirth}
            type="date"
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="btn-primary mt-6 w-full gap-2 disabled:opacity-70"
        >
          {isLoading && <Loader2 size={22} className="animate-spin" />}
          Konto erstellen
        </button>

        <p className="mt-5 text-center text-base text-muted">
          Bereits registriert?{" "}
          <Link href="/login" className="font-semibold text-primary">
            Anmelden
          </Link>
        </p>
      </form>

      <p className="mt-auto pt-8 text-center text-sm leading-relaxed text-muted">
        Mit der Registrierung stimmen Sie unseren Datenschutzbestimmungen zu
      </p>
    </AuthShell>
  );
}

function RoleCard({
  icon,
  title,
  description,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-[120px] items-center gap-4 rounded-2xl border border-border bg-background p-5 text-left transition-colors hover:border-primary/40"
    >
      <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary-light text-primary">
        {icon}
      </span>
      <span>
        <span className="heading-lg block">{title}</span>
        <span className="text-body mt-1 block text-muted">{description}</span>
      </span>
    </button>
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
