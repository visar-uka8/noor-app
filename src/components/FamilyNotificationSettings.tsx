"use client";

import { Bell, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import {
  fetchPushSubscriptionStatus,
  getPushPermissionState,
  isPushSupported,
  savePushSubscription,
  subscribeToPushNotifications,
  updateMissedDoseNotifications,
} from "@/lib/push-notifications";

const permissionPromptKey = "noor-family-push-prompted";

type FamilyNotificationSettingsProps = {
  patientLabel?: string;
};

export function FamilyNotificationSettings({
  patientLabel = "Mama",
}: FamilyNotificationSettingsProps) {
  const [missedDoseEnabled, setMissedDoseEnabled] = useState(true);
  const [hasSubscription, setHasSubscription] = useState(false);
  const [permissionState, setPermissionState] = useState<
    NotificationPermission | "unsupported"
  >("default");
  const [showPrompt, setShowPrompt] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    async function loadSettings() {
      setIsLoading(true);

      const permission = await getPushPermissionState();
      setPermissionState(permission);

      const status = await fetchPushSubscriptionStatus();

      if (status?.subscription) {
        setHasSubscription(true);
        setMissedDoseEnabled(status.subscription.missedDoseEnabled);
      }

      const alreadyPrompted = window.localStorage.getItem(permissionPromptKey);
      const shouldPrompt =
        isPushSupported() &&
        permission === "default" &&
        !alreadyPrompted &&
        !status?.subscription;

      setShowPrompt(shouldPrompt);
      setIsLoading(false);
    }

    void loadSettings();
  }, []);

  async function enablePushNotifications() {
    setIsUpdating(true);
    setStatusMessage(null);

    try {
      const { permission, subscription } = await subscribeToPushNotifications();
      setPermissionState(permission);
      window.localStorage.setItem(permissionPromptKey, "true");
      setShowPrompt(false);

      if (permission !== "granted" || !subscription) {
        setStatusMessage(
          "Benachrichtigungen sind deaktiviert. Sie erhalten weiterhin E-Mail-Hinweise.",
        );
        return;
      }

      const saved = await savePushSubscription(subscription, true);
      setHasSubscription(true);
      setMissedDoseEnabled(saved.subscription.missedDoseEnabled);
      setStatusMessage("Benachrichtigungen sind jetzt aktiv.");
    } catch {
      setStatusMessage(
        "Push-Benachrichtigungen konnten gerade nicht aktiviert werden.",
      );
    } finally {
      setIsUpdating(false);
    }
  }

  async function handleToggle(enabled: boolean) {
    if (!hasSubscription && enabled) {
      await enablePushNotifications();
      return;
    }

    setIsUpdating(true);
    setStatusMessage(null);

    try {
      const updated = await updateMissedDoseNotifications(enabled);
      setMissedDoseEnabled(updated.subscription.missedDoseEnabled);
    } catch {
      setStatusMessage("Die Einstellung konnte nicht gespeichert werden.");
    } finally {
      setIsUpdating(false);
    }
  }

  if (isLoading) {
    return (
      <section className="mt-6 rounded-2xl border border-border bg-surface p-4 shadow-[var(--warm-shadow)]">
        <div className="flex items-center gap-3 text-muted">
          <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
          Benachrichtigungen werden geladen...
        </div>
      </section>
    );
  }

  return (
    <section className="mt-6 rounded-2xl border border-border bg-surface p-5 shadow-[var(--warm-shadow)]">
      {showPrompt ? (
        <div className="mb-5 rounded-2xl bg-family-light px-4 py-4">
          <div className="flex items-start gap-3">
            <div
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-surface text-family"
              aria-hidden="true"
            >
              <Bell size={22} strokeWidth={2.2} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">
                Sanfte Erinnerungen erhalten
              </h2>
              <p className="mt-1 text-base leading-relaxed text-muted">
                Noor kann Sie informieren, wenn {patientLabel} eine Dosis
                verpasst hat — damit Sie liebevoll nachfragen können.
              </p>
              <button
                type="button"
                onClick={() => void enablePushNotifications()}
                disabled={isUpdating}
                className="mt-4 flex min-h-12 w-full items-center justify-center rounded-2xl bg-primary px-5 py-3 text-base font-semibold text-white transition-colors hover:bg-primary-dark active:scale-[0.98] disabled:opacity-70"
              >
                {isUpdating ? "Wird eingerichtet..." : "Benachrichtigungen erlauben"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="flex min-h-12 items-center justify-between gap-4">
        <div>
          <p className="text-base font-semibold text-foreground">
            Benachrichtigungen bei vergessener Dosis
          </p>
          <p className="mt-1 text-sm text-muted">
            {permissionState === "denied" || permissionState === "unsupported"
              ? "E-Mail-Hinweise bleiben als Fallback aktiv."
              : "Push-Hinweise kommen mit einer kurzen Verzögerung."}
          </p>
        </div>

        <button
          type="button"
          role="switch"
          aria-checked={missedDoseEnabled}
          disabled={isUpdating}
          onClick={() => void handleToggle(!missedDoseEnabled)}
          className={`relative h-8 w-14 shrink-0 rounded-full transition-colors ${
            missedDoseEnabled ? "bg-primary" : "bg-zinc-300"
          } disabled:opacity-70`}
        >
          <span
            className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-transform ${
              missedDoseEnabled ? "left-7" : "left-1"
            }`}
          />
        </button>
      </div>

      {statusMessage ? (
        <p className="mt-3 text-sm text-muted" role="status">
          {statusMessage}
        </p>
      ) : null}
    </section>
  );
}
