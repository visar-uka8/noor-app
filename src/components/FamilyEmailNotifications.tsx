"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Toggle } from "@/components/ui/Toggle";
import { useAuthUser } from "@/hooks/useAuthUser";
import {
  defaultNotificationPreferences,
  type NotificationPreferences,
} from "@/types/settings";

type FamilyEmailNotificationsProps = {
  patientFirstName: string;
  relationshipLabel?: string;
};

export function FamilyEmailNotifications({
  patientFirstName,
  relationshipLabel,
}: FamilyEmailNotificationsProps) {
  const { user } = useAuthUser();
  const email = user?.email ?? "Ihre E-Mail-Adresse";
  const [preferences, setPreferences] = useState<NotificationPreferences>(
    defaultNotificationPreferences,
  );
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadPreferences() {
      try {
        const response = await fetch("/api/settings", { credentials: "include" });
        if (!response.ok) return;

        const data = (await response.json()) as {
          profile?: { notificationPreferences?: NotificationPreferences };
        };

        if (!cancelled && data.profile?.notificationPreferences) {
          setPreferences(data.profile.notificationPreferences);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadPreferences();

    return () => {
      cancelled = true;
    };
  }, []);

  async function setMedicationNotifications(enabled: boolean) {
    const nextPreferences: NotificationPreferences = {
      ...preferences,
      medications: enabled,
      emailNotifications:
        enabled || preferences.labResults || preferences.family,
    };

    setPreferences(nextPreferences);

    await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        notification_preferences: nextPreferences,
      }),
    });
  }

  const notificationsEnabled = preferences.medications;

  return (
    <section className="mt-6 rounded-2xl bg-[#E1F5EE] px-5 py-4">
      <div
        className="flex items-center justify-between gap-3 border-b border-[#C8E8DC] pb-3"
        style={{ borderBottomWidth: "0.5px" }}
      >
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-[#1D9E75] text-lg"
            aria-hidden="true"
          >
            🔔
          </div>
          <div className="min-w-0">
            <p className="text-[15px] font-semibold text-[#085041]">
              E-Mail Benachrichtigungen
            </p>
            <p className="text-[13px] text-[#1D5B40]">
              {notificationsEnabled ? "Aktiv" : "Inaktiv"} für {patientFirstName}
            </p>
          </div>
        </div>
        <Toggle
          checked={notificationsEnabled}
          onChange={(enabled) => void setMedicationNotifications(enabled)}
          label={`E-Mail Benachrichtigungen für ${patientFirstName}`}
        />
      </div>

      <p className="mt-3 text-[13px] leading-[1.55] text-[#1D5B40]">
        Wenn {patientFirstName} eine Dosis vergisst, schicken wir Ihnen eine E-Mail
        damit Sie liebevoll nachfragen können.
      </p>
      {relationshipLabel ? (
        <p className="mt-2 text-[12px] text-[#88856F]">{relationshipLabel}</p>
      ) : null}

      <p className="mt-4 text-[13px] text-[#1D5B40]">
        Sie erhalten E-Mails an:{" "}
        <span className="font-semibold text-[#085041]">{email}</span>{" "}
        <Link
          href="/settings"
          className="font-semibold text-[#1D9E75] underline-offset-2 hover:underline"
        >
          Ändern
        </Link>
      </p>

      {isLoading ? (
        <p className="mt-2 text-[12px] text-[#88856F]">Einstellungen werden geladen…</p>
      ) : null}
    </section>
  );
}
