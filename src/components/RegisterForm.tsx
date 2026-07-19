"use client";

import { Heart, Loader2, UsersRound } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ErrorBanner } from "@/components/AppStates";
import { AuthInput, AuthPasswordInput } from "@/components/AuthInput";
import { AuthShell } from "@/components/AuthShell";
import { ProfileHealthFields } from "@/components/ProfileHealthFields";
import { APP_BASE_URL, getAuthCallbackUrl } from "@/lib/site-gate";
import { supabase } from "@/lib/supabase";
import {
  emptyProfileHealthData,
  isValidHeightCm,
  isValidWeightKg,
  type ProfileHealthData,
} from "@/types/profile-health";
import type { PendingRegistrationProfile, UserRole } from "@/types/profiles";

type RegistrationStep = "form" | "profile-setup" | "role-select";

function isMarketingSite() {
  if (typeof window === "undefined") return false;

  const host = window.location.hostname.toLowerCase();
  return host === "noorhealth.de" || host === "www.noorhealth.de";
}

function redirectAfterRegistration(path: string) {
  if (isMarketingSite()) {
    window.location.href = `${APP_BASE_URL}${path}`;
    return;
  }

  window.location.href = path;
}

function buildProfileHealthPayload(
  userId: string,
  pendingProfile: PendingRegistrationProfile,
  health: ProfileHealthData,
) {
  return {
    id: userId,
    first_name: pendingProfile.firstName,
    last_name: pendingProfile.lastName,
    date_of_birth: health.dateOfBirth || null,
    gender: health.gender || null,
    height_cm: health.heightCm.trim() ? Number(health.heightCm) : null,
    weight_kg: health.weightKg.trim() ? Number(health.weightKg) : null,
    activity_level: health.activityLevel || null,
    sport_types:
      health.activityLevel && health.activityLevel !== "sedentary"
        ? health.sportTypes
        : [],
  };
}

function isEmailNotConfirmedError(error: { message?: string }) {
  const message = (error.message ?? "").toLowerCase();

  return (
    message.includes("email not confirmed") ||
    message.includes("not confirmed") ||
    message.includes("email link is invalid")
  );
}

function formatRegistrationError(error: unknown) {
  if (!(error instanceof Error) || !error.message.trim()) {
    return "Registrierung ist gerade nicht möglich. Bitte prüfen Sie Ihre Daten.";
  }

  const message = error.message.toLowerCase();

  if (message.includes("rate limit")) {
    return "Zu viele Versuche in kurzer Zeit. Bitte warten Sie 10–15 Minuten und versuchen Sie es erneut.";
  }

  if (
    message.includes("already registered") ||
    message.includes("already been registered") ||
    message.includes("user already registered")
  ) {
    return "Diese E-Mail ist bereits registriert. Bitte melden Sie sich an.";
  }

  return error.message;
}

async function getRegistrationAuthHeaders(
  email: string,
  password: string,
): Promise<Record<string, string>> {
  let {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      if (isEmailNotConfirmedError(error)) {
        throw new Error(
          "Bitte bestätigen Sie zuerst Ihre E-Mail-Adresse. Prüfen Sie Ihr Postfach und melden Sie sich danach an.",
        );
      }

      throw new Error(
        "Anmeldung nach der Registrierung fehlgeschlagen. Bitte melden Sie sich an und versuchen Sie es erneut.",
      );
    }

    ({
      data: { session },
    } = await supabase.auth.getSession());
  }

  return session?.access_token
    ? { Authorization: `Bearer ${session.access_token}` }
    : {};
}

export function RegisterForm() {
  const router = useRouter();
  const [step, setStep] = useState<RegistrationStep>("form");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [healthData, setHealthData] =
    useState<ProfileHealthData>(emptyProfileHealthData);
  const [pendingProfile, setPendingProfile] =
    useState<PendingRegistrationProfile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function register(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);

    if (password !== passwordConfirm) {
      setErrorMessage("Passwörter stimmen nicht überein.");
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: getAuthCallbackUrl(),
          data: {
            first_name: firstName,
            last_name: lastName,
          },
        },
      });

      if (error) throw error;
      if (!data.user) throw new Error("No user returned from Supabase.");

      if (!data.session) {
        await getRegistrationAuthHeaders(email, password);
      }

      setPendingProfile({
        id: data.user.id,
        firstName,
        lastName,
      });
      setStep("profile-setup");
    } catch (error) {
      setErrorMessage(formatRegistrationError(error));
    } finally {
      setIsLoading(false);
    }
  }

  async function saveProfileSetup(options?: { skip?: boolean }) {
    if (!pendingProfile) return false;

    setErrorMessage(null);

    if (!options?.skip) {
      if (!isValidHeightCm(healthData.heightCm)) {
        setErrorMessage("Körpergröße muss zwischen 140 und 220 cm liegen.");
        return false;
      }

      if (!isValidWeightKg(healthData.weightKg)) {
        setErrorMessage("Körpergewicht muss zwischen 40 und 200 kg liegen.");
        return false;
      }
    }

    setIsLoading(true);

    try {
      if (!options?.skip) {
        const authHeaders = await getRegistrationAuthHeaders(email, password);

        const response = await fetch("/api/profiles", {
          method: "PATCH",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            ...authHeaders,
          },
          body: JSON.stringify(
            buildProfileHealthPayload(pendingProfile.id, pendingProfile, healthData),
          ),
        });

        const body = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;

        if (!response.ok) {
          throw new Error(body?.error ?? "Profil konnte nicht gespeichert werden.");
        }
      }

      setStep("role-select");
      return true;
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Profil konnte nicht gespeichert werden.",
      );
      return false;
    } finally {
      setIsLoading(false);
    }
  }

  async function handleRoleSelect(role: UserRole) {
    if (!pendingProfile) return;

    setIsLoading(true);

    const destination = role === "family_member" ? "/family/connect" : "/";

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const userId = user?.id ?? pendingProfile.id;
      const profileRow = {
        id: userId,
        first_name: pendingProfile.firstName,
        last_name: pendingProfile.lastName,
        role,
        user_type: role,
        elder_mode: false,
        language: "de",
        ...(healthData.dateOfBirth ? { date_of_birth: healthData.dateOfBirth } : {}),
      };

      const { data, error } = await supabase
        .from("profiles")
        .upsert(profileRow, { onConflict: "id" })
        .select("id, role, first_name, last_name");

      if (error) {
        const authHeaders = await getRegistrationAuthHeaders(email, password);

        const response = await fetch("/api/profiles", {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            ...authHeaders,
          },
          body: JSON.stringify({
            id: userId,
            first_name: pendingProfile.firstName,
            last_name: pendingProfile.lastName,
            role,
          }),
        });

        const body = (await response.json().catch(() => null)) as {
          error?: string;
          supabaseError?: { message?: string };
        } | null;

        if (!response.ok) {
          throw new Error(
            body?.supabaseError?.message ?? body?.error ?? "Profile save failed",
          );
        }
      } else {
        console.log("Save result:", data);
      }
    } catch (error) {
      console.error(
        "Role save failed:",
        error instanceof Error ? error.message : error,
      );
    } finally {
      setIsLoading(false);
      router.refresh();
      redirectAfterRegistration(destination);
    }
  }

  if (pendingProfile && step === "profile-setup") {
    return (
      <AuthShell
        subtitle="Diese Angaben helfen uns Ihre Gesundheitsdaten besser einzuordnen."
      >
        {errorMessage ? (
          <ErrorBanner
            message={errorMessage}
            actionLabel="Erneut versuchen"
            onAction={() => setErrorMessage(null)}
            onDismiss={() => setErrorMessage(null)}
          />
        ) : null}

        <section className="noor-card p-5">
          <h2 className="heading-lg">Erzählen Sie uns etwas über sich</h2>
          <div className="mt-5">
            <ProfileHealthFields value={healthData} onChange={setHealthData} />
          </div>

          <button
            type="button"
            disabled={isLoading}
            onClick={() => void saveProfileSetup()}
            className="btn-primary mt-6 w-full gap-2 disabled:opacity-70"
          >
            {isLoading && <Loader2 size={22} className="animate-spin" />}
            Weiter
          </button>

          <button
            type="button"
            disabled={isLoading}
            onClick={() => void saveProfileSetup({ skip: true })}
            className="mt-4 w-full text-center text-sm font-semibold text-muted transition-colors hover:text-foreground disabled:opacity-70"
          >
            Überspringen — später ausfüllen
          </button>
        </section>
      </AuthShell>
    );
  }

  if (pendingProfile && step === "role-select") {
    return (
      <AuthShell subtitle="Nur noch eine kurze Frage.">
        <section className="noor-card p-5">
          <h2 className="heading-lg">Für wen nutzen Sie Noor?</h2>
          <div className="mt-5 grid gap-4">
            <RoleCard
              icon={<Heart size={30} aria-hidden="true" />}
              title="Für mich selbst"
              description="Ich möchte meine Gesundheit einfach verstehen."
              disabled={isLoading}
              onClick={() => void handleRoleSelect("patient")}
            />
            <RoleCard
              icon={<UsersRound size={30} aria-hidden="true" />}
              title="Für mein Familienmitglied"
              description="Ich begleite die Gesundheit eines Angehörigen."
              disabled={isLoading}
              onClick={() => void handleRoleSelect("family_member")}
            />
          </div>
          {isLoading ? (
            <p className="mt-4 flex items-center justify-center gap-2 text-sm text-muted">
              <Loader2 size={18} className="animate-spin" aria-hidden="true" />
              Wird gespeichert…
            </p>
          ) : null}
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
          <AuthPasswordInput
            label="Passwort"
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
  disabled = false,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex min-h-[120px] items-center gap-4 rounded-2xl border border-border bg-background p-5 text-left transition-colors hover:border-primary/40 disabled:opacity-70"
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
