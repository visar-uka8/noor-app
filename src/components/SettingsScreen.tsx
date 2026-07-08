"use client";

import {
  Bell,
  CheckCircle2,
  Download,
  FileText,
  Info,
  Languages,
  LogOut,
  Mail,
  Trash2,
  Type,
  UserPlus,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AppBottomNav } from "@/components/AppBottomNav";
import { ErrorBanner, ErrorState, PageSkeleton } from "@/components/AppStates";
import { useElderMode } from "@/components/ElderModeProvider";
import { appVersion, contactEmail } from "@/lib/app-info";
import { createClient } from "@/lib/supabase/client";
import {
  defaultNotificationPreferences,
  type FamilyConnection,
  type NotificationPreferences,
  type SettingsData,
} from "@/types/settings";

const demoSettings: SettingsData = {
  profile: {
    id: "local-demo",
    firstName: "Hans",
    lastName: "Leka",
    email: "hans@example.de",
    initials: "HL",
    language: "de",
    elderMode: false,
    notificationPreferences: defaultNotificationPreferences,
  },
  familyConnections: [
    {
      id: "demo-1",
      name: "Anna Leka",
      relationship: "Tochter",
      connectedAt: "12. März 2025",
    },
  ],
};

const notificationLabels: Record<keyof NotificationPreferences, string> = {
  medications: "Medikamente",
  labResults: "Laborwerte",
  family: "Familie",
};

export function SettingsScreen() {
  const router = useRouter();
  const { elderMode, setElderMode } = useElderMode();
  const [settings, setSettings] = useState<SettingsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [showElderToast, setShowElderToast] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [disconnectingId, setDisconnectingId] = useState<string | null>(null);
  const [bannerError, setBannerError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const isDemo = settings?.profile.id === demoSettings.profile.id;

  async function loadSettings() {
    setIsLoading(true);
    setLoadFailed(false);

    try {
      const response = await fetch("/api/settings");

      if (!response.ok) {
        throw new Error("Settings request failed.");
      }

      const data = (await response.json()) as SettingsData;
      setSettings(data);
      setElderMode(data.profile.elderMode);
    } catch {
      if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
        setLoadFailed(true);
      } else {
        setSettings(demoSettings);
        setElderMode(demoSettings.profile.elderMode);
      }
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadSettings();
    }, 0);

    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setElderMode]);

  async function patchSettings(updates: {
    elderMode?: boolean;
    language?: "de" | "en";
    notificationPreferences?: NotificationPreferences;
  }) {
    if (!settings || isDemo) return;

    await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        elder_mode: updates.elderMode,
        language: updates.language,
        notification_preferences: updates.notificationPreferences,
      }),
    });
  }

  function showError(message: string) {
    setBannerError(message);
    setSuccessMessage(null);
  }

  function showSuccess(message: string) {
    setSuccessMessage(message);
    setBannerError(null);
    window.setTimeout(() => setSuccessMessage(null), 2200);
  }

  async function setLanguage(language: "de" | "en") {
    if (!settings) return;

    setSettings({
      ...settings,
      profile: { ...settings.profile, language },
    });
    await patchSettings({ language });
  }

  async function setTextSize(enabled: boolean) {
    setElderMode(enabled);

    if (!settings) return;

    setSettings({
      ...settings,
      profile: { ...settings.profile, elderMode: enabled },
    });
    await patchSettings({ elderMode: enabled });

    if (enabled) {
      setShowElderToast(true);
      window.setTimeout(() => setShowElderToast(false), 1800);
    }
  }

  async function toggleNotification(key: keyof NotificationPreferences) {
    if (!settings) return;

    const nextPreferences = {
      ...settings.profile.notificationPreferences,
      [key]: !settings.profile.notificationPreferences[key],
    };

    setSettings({
      ...settings,
      profile: {
        ...settings.profile,
        notificationPreferences: nextPreferences,
      },
    });
    await patchSettings({ notificationPreferences: nextPreferences });
  }

  async function disconnectFamily(connectionId: string) {
    if (!settings) return;

    setDisconnectingId(connectionId);

    try {
      if (!isDemo) {
        const response = await fetch(`/api/family-connections/${connectionId}`, {
          method: "DELETE",
        });

        if (!response.ok) {
          throw new Error("Disconnect failed.");
        }
      }

      setSettings({
        ...settings,
        familyConnections: settings.familyConnections.filter(
          (connection) => connection.id !== connectionId,
        ),
      });
      showSuccess("Verbindung getrennt");
    } catch {
      showError("Verbindung konnte nicht getrennt werden. Bitte versuchen Sie es erneut.");
    } finally {
      setDisconnectingId(null);
    }
  }

  async function exportData() {
    setIsExporting(true);

    try {
      const response = await fetch("/api/account/export");

      if (!response.ok) {
        throw new Error("Export failed.");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `noor-datenexport-${new Date().toISOString().slice(0, 10)}.json`;
      anchor.click();
      window.URL.revokeObjectURL(url);
      showSuccess("Datenexport gestartet");
    } catch {
      showError("Datenexport fehlgeschlagen. Bitte versuchen Sie es später erneut.");
    } finally {
      setIsExporting(false);
    }
  }

  async function deleteAccount() {
    setIsDeleting(true);

    try {
      const response = await fetch("/api/account", { method: "DELETE" });

      if (!response.ok) {
        throw new Error("Delete failed.");
      }

      try {
        const supabase = createClient();
        await supabase.auth.signOut();
      } catch {
        // Continue to login even without Supabase env vars.
      }

      router.push("/login");
    } catch {
      showError("Konto konnte nicht gelöscht werden. Bitte versuchen Sie es erneut.");
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  }

  async function logout() {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch {
      // Continue to login even if local Supabase env vars are not configured.
    }

    router.push("/login");
  }

  if (isLoading) {
    return (
      <>
        <PageSkeleton />
        <AppBottomNav />
      </>
    );
  }

  if (loadFailed || !settings) {
    return (
      <>
        <main className="content-bottom-nav mx-auto flex w-full max-w-app flex-1 flex-col px-5 py-6">
          <ErrorState onRetry={loadSettings} />
        </main>
        <AppBottomNav />
      </>
    );
  }

  const { profile, familyConnections } = settings;

  return (
    <>
      {bannerError ? (
        <ErrorBanner
          message={bannerError}
          actionLabel="Verstanden"
          onAction={() => setBannerError(null)}
          onDismiss={() => setBannerError(null)}
        />
      ) : null}

      <main className="content-bottom-nav mx-auto flex w-full max-w-app flex-1 flex-col px-5 py-6">
        {showElderToast && (
          <div
            className="fixed left-1/2 top-6 z-50 flex -translate-x-1/2 items-center gap-2 rounded-2xl bg-primary px-5 py-3 text-body font-semibold text-white shadow-xl"
            role="status"
          >
            <CheckCircle2 size={22} aria-hidden="true" />
            Großschrift aktiviert
          </div>
        )}

        {successMessage && (
          <div
            className="fixed left-1/2 top-6 z-50 -translate-x-1/2 rounded-2xl bg-primary px-5 py-3 text-body font-semibold text-white shadow-xl"
            role="status"
          >
            {successMessage}
          </div>
        )}

        <section className="noor-card p-5">
          <div className="flex flex-col items-center text-center">
            <div
              className="flex h-24 w-24 items-center justify-center rounded-full bg-primary text-3xl font-bold text-white"
              aria-hidden="true"
            >
              {profile.initials}
            </div>
            <h1 className="heading-lg mt-4">
              {profile.firstName} {profile.lastName}
            </h1>
            <p className="text-body mt-1 text-muted">{profile.email}</p>
            <Link
              href="/settings/profile"
              className="mt-4 text-base font-semibold text-primary underline-offset-4 hover:underline"
            >
              Profil bearbeiten
            </Link>
          </div>
        </section>

        <SectionHeading title="Persönliche Einstellungen" />
        <section className="noor-card overflow-hidden">
          <SettingsRow
            icon={<Languages size={24} aria-hidden="true" />}
            title="Sprache"
            subtitle="Deutsch oder English"
            action={
              <SegmentedToggle
                leftLabel="Deutsch"
                rightLabel="English"
                checked={profile.language === "en"}
                onChange={(isEnglish) =>
                  setLanguage(isEnglish ? "en" : "de")
                }
                label="Sprache"
              />
            }
          />
          <SettingsRow
            icon={<Type size={24} aria-hidden="true" />}
            title="Schriftgröße"
            subtitle="Normal oder Groß für bessere Lesbarkeit"
            action={
              <SegmentedToggle
                leftLabel="Normal"
                rightLabel="Groß"
                checked={elderMode}
                onChange={setTextSize}
                label="Schriftgröße"
              />
            }
          />
          <div className="border-t border-border px-5 py-4">
            <div className="flex items-center gap-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary-light text-primary">
                <Bell size={24} aria-hidden="true" />
              </span>
              <span className="text-base font-bold text-foreground">
                Benachrichtigungen
              </span>
            </div>
            <div className="mt-4 space-y-3">
              {(Object.keys(notificationLabels) as Array<
                keyof NotificationPreferences
              >).map((key) => (
                <div
                  key={key}
                  className="flex min-h-12 items-center justify-between gap-4 rounded-2xl bg-background px-4 py-3"
                >
                  <span className="text-base text-foreground">
                    {notificationLabels[key]}
                  </span>
                  <ToggleSwitch
                    checked={profile.notificationPreferences[key]}
                    onChange={() => toggleNotification(key)}
                    label={notificationLabels[key]}
                  />
                </div>
              ))}
            </div>
          </div>
        </section>

        <SectionHeading title="Familienverbindungen" />
        <section className="noor-card p-5">
          {familyConnections.length === 0 ? (
            <p className="text-base text-muted">
              Noch keine Familienmitglieder verbunden.
            </p>
          ) : (
            <ul className="space-y-4">
              {familyConnections.map((connection) => (
                <FamilyConnectionCard
                  key={connection.id}
                  connection={connection}
                  isDisconnecting={disconnectingId === connection.id}
                  onDisconnect={() => disconnectFamily(connection.id)}
                />
              ))}
            </ul>
          )}

          <Link
            href="/family/connect"
            className="btn-primary mt-5 w-full gap-2"
          >
            <UserPlus size={22} aria-hidden="true" />
            Familie einladen
          </Link>
        </section>

        <SectionHeading title="Konto" />
        <section className="noor-card overflow-hidden">
          <button
            type="button"
            onClick={() => void exportData()}
            disabled={isExporting}
            className="flex min-h-12 w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-background/70 disabled:opacity-60"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-light text-primary">
              <Download size={24} aria-hidden="true" />
            </span>
            <span className="text-base font-bold text-foreground">
              {isExporting ? "Export wird erstellt…" : "Meine Daten exportieren"}
            </span>
          </button>
          <button
            type="button"
            onClick={logout}
            className="flex min-h-12 w-full items-center gap-4 border-t border-border px-5 py-4 text-left transition-colors hover:bg-background/70"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-light text-primary">
              <LogOut size={24} aria-hidden="true" />
            </span>
            <span className="text-base font-bold text-foreground">Abmelden</span>
          </button>
          <button
            type="button"
            onClick={() => setShowDeleteDialog(true)}
            className="flex min-h-12 w-full items-center gap-4 border-t border-border px-5 py-4 text-left text-red-600 transition-colors hover:bg-red-50"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50">
              <Trash2 size={24} aria-hidden="true" />
            </span>
            <span className="text-base font-bold">Konto löschen</span>
          </button>
        </section>

        <SectionHeading title="Über Noor" />
        <section className="noor-card overflow-hidden">
          <SettingsRow
            icon={<Info size={24} aria-hidden="true" />}
            title="App-Version"
            subtitle={appVersion}
          />
          <LinkRow
            icon={<FileText size={24} aria-hidden="true" />}
            title="Datenschutzerklärung"
            href="/datenschutz"
          />
          <LinkRow
            icon={<FileText size={24} aria-hidden="true" />}
            title="Impressum"
            href="/impressum"
          />
          <a
            href={`mailto:${contactEmail}`}
            className="flex min-h-12 items-center gap-4 px-5 py-4 transition-colors hover:bg-background/70"
          >
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary-light text-primary">
              <Mail size={24} aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-base font-bold text-foreground">
                Kontakt
              </span>
              <span className="mt-1 block text-base text-primary">
                {contactEmail}
              </span>
            </span>
          </a>
        </section>
      </main>

      {showDeleteDialog && (
        <ConfirmDialog
          title="Konto löschen"
          message="Sind Sie sicher? Alle Ihre Daten werden gelöscht."
          confirmLabel={isDeleting ? "Wird gelöscht…" : "Ja, Konto löschen"}
          cancelLabel="Abbrechen"
          isLoading={isDeleting}
          onConfirm={() => void deleteAccount()}
          onCancel={() => setShowDeleteDialog(false)}
        />
      )}

      <AppBottomNav />
    </>
  );
}

function SectionHeading({ title }: { title: string }) {
  return (
    <h2 className="mb-3 mt-6 text-base font-bold uppercase tracking-wide text-muted">
      {title}
    </h2>
  );
}

function FamilyConnectionCard({
  connection,
  isDisconnecting,
  onDisconnect,
}: {
  connection: FamilyConnection;
  isDisconnecting: boolean;
  onDisconnect: () => void;
}) {
  return (
    <li className="rounded-2xl border border-border bg-background p-4">
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary-light text-primary">
          <Users size={20} aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-base font-bold text-foreground">{connection.name}</p>
          <p className="mt-1 text-base text-muted">{connection.relationship}</p>
          <p className="mt-1 text-sm text-muted">
            Verbunden seit {connection.connectedAt}
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={onDisconnect}
        disabled={isDisconnecting}
        className="mt-4 min-h-12 w-full rounded-2xl border border-red-200 px-4 py-3 text-base font-semibold text-red-600 transition-colors hover:bg-red-50 disabled:opacity-60"
      >
        {isDisconnecting ? "Wird getrennt…" : "Verbindung trennen"}
      </button>
    </li>
  );
}

function SettingsRow({
  icon,
  title,
  subtitle,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-12 items-center gap-4 border-b border-border px-5 py-4 last:border-b-0">
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary-light text-primary">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-base font-bold text-foreground">{title}</span>
        <span className="mt-1 block text-base leading-snug text-muted">
          {subtitle}
        </span>
      </span>
      {action}
    </div>
  );
}

function LinkRow({
  icon,
  title,
  href,
}: {
  icon: React.ReactNode;
  title: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="flex min-h-12 items-center gap-4 border-t border-border px-5 py-4 transition-colors hover:bg-background/70"
    >
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary-light text-primary">
        {icon}
      </span>
      <span className="text-base font-bold text-foreground">{title}</span>
    </Link>
  );
}

function SegmentedToggle({
  leftLabel,
  rightLabel,
  checked,
  onChange,
  label,
}: {
  leftLabel: string;
  rightLabel: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className="grid shrink-0 grid-cols-2 rounded-2xl bg-background p-1"
    >
      <button
        type="button"
        onClick={() => onChange(false)}
        className={`min-h-10 rounded-xl px-3 text-sm font-semibold transition-colors ${
          !checked ? "bg-primary text-white" : "text-muted"
        }`}
      >
        {leftLabel}
      </button>
      <button
        type="button"
        onClick={() => onChange(true)}
        className={`min-h-10 rounded-xl px-3 text-sm font-semibold transition-colors ${
          checked ? "bg-primary text-white" : "text-muted"
        }`}
      >
        {rightLabel}
      </button>
    </div>
  );
}

function ToggleSwitch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative h-8 min-h-8 w-14 shrink-0 rounded-full transition-colors ${
        checked ? "bg-primary" : "bg-zinc-300"
      }`}
    >
      <span
        className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-transform ${
          checked ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );
}

function ConfirmDialog({
  title,
  message,
  confirmLabel,
  cancelLabel,
  isLoading,
  onConfirm,
  onCancel,
}: {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  isLoading: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-5"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
    >
      <div className="w-full max-w-app rounded-2xl border border-border bg-surface p-5 shadow-[var(--warm-shadow)]">
        <h3
          id="confirm-dialog-title"
          className="text-xl font-bold text-foreground"
        >
          {title}
        </h3>
        <p className="mt-3 text-base leading-relaxed text-muted">{message}</p>
        <div className="mt-5 grid grid-cols-1 gap-3">
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className="min-h-12 rounded-2xl bg-red-600 px-4 py-3 text-base font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-60"
          >
            {confirmLabel}
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="min-h-12 rounded-2xl border border-border px-4 py-3 text-base font-semibold text-foreground transition-colors hover:bg-background disabled:opacity-60"
          >
            {cancelLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
