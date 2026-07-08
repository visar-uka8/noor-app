"use client";

import { useEffect, useState } from "react";
import { ErrorBanner, ErrorState, PageSkeleton } from "@/components/AppStates";

type ProfileForm = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
};

const fallbackProfile: ProfileForm = {
  id: "local-demo",
  firstName: "Hans",
  lastName: "Leka",
  email: "hans@example.de",
};

export function ProfileEditScreen() {
  const [profile, setProfile] = useState<ProfileForm>(fallbackProfile);
  const [isLoading, setIsLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  async function loadProfile() {
    setIsLoading(true);
    setLoadFailed(false);

    try {
      const response = await fetch("/api/settings");

      if (!response.ok) {
        throw new Error("Profile request failed.");
      }

      const data = (await response.json()) as {
        profile: {
          id: string;
          firstName: string;
          lastName: string;
          email: string;
        };
      };

      setProfile({
        id: data.profile.id,
        firstName: data.profile.firstName,
        lastName: data.profile.lastName,
        email: data.profile.email,
      });
    } catch {
      if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
        setLoadFailed(true);
      } else {
        setProfile(fallbackProfile);
      }
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadProfile();
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  async function saveProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (profile.id === fallbackProfile.id) {
      setSaved(true);
      window.setTimeout(() => setSaved(false), 1800);
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    try {
      const response = await fetch("/api/profiles", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: profile.id,
          first_name: profile.firstName,
          last_name: profile.lastName,
        }),
      });

      if (!response.ok) {
        throw new Error("Save failed.");
      }

      setSaved(true);
      window.setTimeout(() => setSaved(false), 1800);
    } catch {
      setSaveError(
        "Profil konnte nicht gespeichert werden. Bitte versuchen Sie es erneut.",
      );
      setSaved(false);
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return <PageSkeleton />;
  }

  if (loadFailed) {
    return (
      <main className="mx-auto flex w-full max-w-app flex-1 flex-col px-5 py-6">
        <ErrorState onRetry={loadProfile} />
      </main>
    );
  }

  return (
    <>
      {saveError ? (
        <ErrorBanner
          message={saveError}
          actionLabel="Erneut speichern"
          onAction={() => setSaveError(null)}
          onDismiss={() => setSaveError(null)}
        />
      ) : null}

      <main className="mx-auto flex w-full max-w-app flex-1 flex-col px-5 py-6">
        <form onSubmit={saveProfile} className="space-y-5">
        <label className="block">
          <span className="mb-2 block text-base font-semibold text-foreground">
            Vorname
          </span>
          <input
            type="text"
            required
            value={profile.firstName}
            onChange={(event) =>
              setProfile((current) => ({
                ...current,
                firstName: event.target.value,
              }))
            }
            className="min-h-12 w-full rounded-2xl border border-border bg-surface px-4 text-base text-foreground outline-none focus:border-primary"
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-base font-semibold text-foreground">
            Nachname
          </span>
          <input
            type="text"
            required
            value={profile.lastName}
            onChange={(event) =>
              setProfile((current) => ({
                ...current,
                lastName: event.target.value,
              }))
            }
            className="min-h-12 w-full rounded-2xl border border-border bg-surface px-4 text-base text-foreground outline-none focus:border-primary"
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-base font-semibold text-foreground">
            E-Mail
          </span>
          <input
            type="email"
            readOnly
            value={profile.email}
            className="min-h-12 w-full rounded-2xl border border-border bg-background px-4 text-base text-muted"
          />
          <span className="mt-2 block text-sm text-muted">
            Die E-Mail-Adresse kann hier nicht geändert werden.
          </span>
        </label>

        <button
          type="submit"
          disabled={isSaving}
          className="btn-primary w-full disabled:opacity-60"
        >
          {isSaving ? "Wird gespeichert…" : "Speichern"}
        </button>

        {saved && (
          <p className="text-center text-base font-semibold text-primary" role="status">
            Profil gespeichert ✓
          </p>
        )}
      </form>
    </main>
    </>
  );
}
