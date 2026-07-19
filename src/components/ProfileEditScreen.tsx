"use client";

import { useEffect, useState } from "react";
import { ErrorBanner, ErrorState, PageSkeleton } from "@/components/AppStates";
import { ProfileHealthFields } from "@/components/ProfileHealthFields";
import { resolveProfileNames } from "@/lib/profile-display";
import { createClient } from "@/lib/supabase/client";
import {
  emptyProfileHealthData,
  isValidHeightCm,
  isValidWeightKg,
  profileHealthFromRow,
  type ProfileHealthData,
} from "@/types/profile-health";

type ProfileForm = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  health: ProfileHealthData;
};

const emptyProfile: ProfileForm = {
  id: "",
  firstName: "",
  lastName: "",
  email: "",
  health: emptyProfileHealthData,
};

export function ProfileEditScreen() {
  const [profile, setProfile] = useState<ProfileForm>(emptyProfile);
  const [isLoading, setIsLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  async function loadProfile() {
    setIsLoading(true);
    setLoadFailed(false);

    try {
      const supabase = createClient();
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error("User not authenticated.");
      }

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select(
          "first_name, last_name, role, date_of_birth, gender, height_cm, weight_kg, activity_level, sport_types",
        )
        .eq("id", user.id)
        .maybeSingle();

      if (profileError) {
        throw profileError;
      }

      const metadata = user.user_metadata as
        | { first_name?: string; last_name?: string }
        | undefined;
      const { firstName, lastName } = resolveProfileNames(
        profileData,
        metadata,
      );

      setProfile({
        id: user.id,
        firstName,
        lastName,
        email: user.email ?? "",
        health: profileHealthFromRow(profileData),
      });
    } catch {
      if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
        setLoadFailed(true);
      }
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadProfile();
  }, []);

  async function saveProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!profile.id) {
      return;
    }

    if (!isValidHeightCm(profile.health.heightCm)) {
      setSaveError("Körpergröße muss zwischen 140 und 220 cm liegen.");
      return;
    }

    if (!isValidWeightKg(profile.health.weightKg)) {
      setSaveError("Körpergewicht muss zwischen 40 und 200 kg liegen.");
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    try {
      const response = await fetch("/api/profiles", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          id: profile.id,
          first_name: profile.firstName,
          last_name: profile.lastName,
          date_of_birth: profile.health.dateOfBirth || null,
          gender: profile.health.gender || null,
          height_cm: profile.health.heightCm.trim()
            ? Number(profile.health.heightCm)
            : null,
          weight_kg: profile.health.weightKg.trim()
            ? Number(profile.health.weightKg)
            : null,
          activity_level: profile.health.activityLevel || null,
          sport_types:
            profile.health.activityLevel &&
            profile.health.activityLevel !== "sedentary"
              ? profile.health.sportTypes
              : [],
        }),
      });

      const body = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;

      if (!response.ok) {
        throw new Error(body?.error ?? "Save failed.");
      }

      setSaved(true);
      window.setTimeout(() => setSaved(false), 1800);
    } catch (error) {
      setSaveError(
        error instanceof Error
          ? error.message
          : "Profil konnte nicht gespeichert werden. Bitte versuchen Sie es erneut.",
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

          <div className="border-t border-border pt-5">
            <ProfileHealthFields
              value={profile.health}
              onChange={(health) =>
                setProfile((current) => ({
                  ...current,
                  health,
                }))
              }
            />
          </div>

          <button
            type="submit"
            disabled={isSaving}
            className="btn-primary w-full disabled:opacity-60"
          >
            {isSaving ? "Wird gespeichert…" : "Speichern"}
          </button>

          {saved && (
            <p
              className="text-center text-base font-semibold text-primary"
              role="status"
            >
              Profil gespeichert ✓
            </p>
          )}
        </form>
      </main>
    </>
  );
}
