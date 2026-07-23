"use client";

import {
  CheckCircle2,
  Download,
  FileText,
  Info,
  LogOut,
  Mail,
  Trash2,
  Type,
  UserPlus,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { LanguageSelector } from "@/components/LanguageSelector";
import { PaymentSuccessBanner } from "@/components/PaymentSuccessBanner";
import { ProfileSubscriptionSection } from "@/components/ProfileSubscriptionSection";
import { AvatarUploadButton } from "@/components/AvatarUploadButton";
import { ErrorBanner, ErrorState, PageSkeleton } from "@/components/AppStates";
import { useElderMode } from "@/components/ElderModeProvider";
import { useLanguage } from "@/components/LanguageProvider";
import { SHOW_PRICING } from "@/lib/feature-flags";
import { Toggle } from "@/components/ui/Toggle";
import { appVersion, contactEmail } from "@/lib/app-info";
import { normalizeAppLanguage } from "@/lib/i18n/languages";
import {
  fontSizeStorageKey,
  readFontSizePreference,
  type FontSizePreference,
} from "@/lib/font-size";
import {
  buildProfileSettingsFields,
  loadUserProfileRow,
  logSupabaseError,
} from "@/lib/load-settings-profile";
import { createClient } from "@/lib/supabase/client";
import { notifyFamilyConnectionsChanged } from "@/lib/family-links-query";
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
    avatarUrl: null,
    subscriptionTier: "free",
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

export function SettingsScreen() {
  const router = useRouter();
  const { fontSize: contextFontSize, setFontSize } = useElderMode();
  const { t, language, setLanguage } = useLanguage();
  const [fontSize, setFontSizeState] = useState<FontSizePreference>("normal");
  const [settings, setSettings] = useState<SettingsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [showElderToast, setShowElderToast] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [disconnectingId, setDisconnectingId] = useState<string | null>(null);
  const [bannerError, setBannerError] = useState<string | null>(null);
  const [loadWarning, setLoadWarning] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const isDemo = settings?.profile.id === demoSettings.profile.id;

  useEffect(() => {
    const saved = window.localStorage.getItem(fontSizeStorageKey);
    if (saved === "large") {
      setFontSizeState("large");
      return;
    }

    if (saved === "normal") {
      setFontSizeState("normal");
      return;
    }

    setFontSizeState(readFontSizePreference());
  }, []);

  useEffect(() => {
    setFontSizeState(contextFontSize);
  }, [contextFontSize]);

  async function loadSettings() {
    setIsLoading(true);
    setLoadFailed(false);
    setLoadWarning(null);

    try {
      const supabase = createClient();
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error("User not authenticated.");
      }

      const { profile: profileData, error: profileError } = await loadUserProfileRow(
        supabase,
        user.id,
        "Settings page profile",
      );

      if (profileError) {
        logSupabaseError("Settings page profile", profileError);
      }

      const metadata = user.user_metadata as
        | { first_name?: string; last_name?: string }
        | undefined;

      let apiData: SettingsData | null = null;
      let apiFailed = false;

      try {
        const response = await fetch("/api/settings", {
          credentials: "include",
        });

        if (!response.ok) {
          const body = (await response.json().catch(() => null)) as
            | { error?: string; details?: string }
            | null;
          console.error("Settings API failed:", response.status, body);
          apiFailed = true;
        } else {
          apiData = (await response.json()) as SettingsData;
        }
      } catch (apiError) {
        console.error("Settings API crash:", apiError);
        apiFailed = true;
      }

      const fallbackProfile = buildProfileSettingsFields({
        userId: user.id,
        email: user.email,
        profile: profileData,
        metadata,
        elderModeOverride: contextFontSize === "large",
      });

      setSettings({
        profile: {
          ...(apiData?.profile ?? fallbackProfile),
          id: user.id,
          firstName: apiData?.profile.firstName || fallbackProfile.firstName,
          lastName: apiData?.profile.lastName || fallbackProfile.lastName,
          email: user.email ?? apiData?.profile.email ?? fallbackProfile.email,
          initials:
            apiData?.profile.initials ||
            fallbackProfile.initials,
          avatarUrl:
            apiData?.profile.avatarUrl ?? fallbackProfile.avatarUrl,
          elderMode: contextFontSize === "large",
          notificationPreferences:
            apiData?.profile.notificationPreferences ??
            fallbackProfile.notificationPreferences,
          subscriptionTier:
            apiData?.profile.subscriptionTier ??
            fallbackProfile.subscriptionTier,
        },
        familyConnections: apiData?.familyConnections ?? [],
      });

      if (profileError || apiFailed) {
        setLoadWarning(t("settings_load_warning"));
      }
    } catch (error) {
      console.error("Profile page crash:", error);

      if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
        setLoadFailed(true);
      } else {
        setSettings(demoSettings);
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
  }, []);

  async function patchSettings(updates: {
    elderMode?: boolean;
    notificationPreferences?: NotificationPreferences;
  }) {
    if (!settings || isDemo) return;

    const response = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        elder_mode: updates.elderMode,
        notification_preferences: updates.notificationPreferences,
      }),
    });

    if (!response.ok) {
      showError(t("settings_error_save"));
    }
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

  async function toggleFontSize(size: FontSizePreference) {
    setFontSizeState(size);
    setFontSize(size);

    if (!settings) return;

    const enabled = size === "large";
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

  async function setNotificationPreference(
    key: "medications" | "labResults" | "family" | "appointments",
    enabled: boolean,
  ) {
    if (!settings) return;

    const current = settings.profile.notificationPreferences;
    const nextPreferences: NotificationPreferences = {
      ...current,
      [key]: enabled,
      emailNotifications:
        (key === "medications" ? enabled : current.medications) ||
        (key === "labResults" ? enabled : current.labResults) ||
        (key === "family" ? enabled : current.family) ||
        (key === "appointments" ? enabled : current.appointments),
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
      notifyFamilyConnectionsChanged();
      showSuccess(t("settings_success_disconnect"));
    } catch {
      showError(t("settings_error_disconnect"));
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
      showSuccess(t("settings_success_export"));
    } catch {
      showError(t("settings_error_export"));
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
      showError(t("settings_error_delete"));
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
    return <PageSkeleton />;
  }

  if (loadFailed || !settings) {
    return (
      <main className="mx-auto flex w-full max-w-app flex-1 flex-col px-5 py-6">
        <ErrorState onRetry={loadSettings} />
      </main>
    );
  }

  const { profile, familyConnections } = settings;

  return (
    <>
      {bannerError ? (
        <ErrorBanner
          message={bannerError}
          actionLabel={t("understood")}
          onAction={() => setBannerError(null)}
          onDismiss={() => setBannerError(null)}
        />
      ) : null}

      {loadWarning ? (
        <div className="mx-5 mt-4 rounded-2xl border border-warning/30 bg-warning-light px-4 py-3">
          <p className="text-sm text-warning">{loadWarning}</p>
          <button
            type="button"
            onClick={() => void loadSettings()}
            className="mt-2 text-sm font-semibold text-primary underline-offset-2 hover:underline"
          >
            Erneut laden
          </button>
        </div>
      ) : null}

      <main className="mx-auto flex w-full max-w-app flex-1 flex-col px-5 py-6">
        <Suspense fallback={null}>
          {SHOW_PRICING ? <PaymentSuccessBanner /> : null}
        </Suspense>

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
            <AvatarUploadButton
              userId={profile.id}
              avatarUrl={profile.avatarUrl}
              name={`${profile.firstName} ${profile.lastName}`.trim()}
              firstName={profile.firstName}
              lastName={profile.lastName}
              size={96}
              onUploaded={(avatarUrl) =>
                setSettings((current) =>
                  current
                    ? {
                        ...current,
                        profile: { ...current.profile, avatarUrl },
                      }
                    : current,
                )
              }
            />
            <h1 className="heading-lg mt-4">
              {profile.firstName} {profile.lastName}
            </h1>
            <p className="text-body mt-1 text-muted">{profile.email}</p>
            <Link
              href="/settings/profile"
              className="mt-4 text-base font-semibold text-primary underline-offset-4 hover:underline"
            >
              {t("settings.editProfile")}
            </Link>
            <p className="text-body mt-2 text-muted">
              {t("settings_profile_subtitle")}
            </p>
          </div>
        </section>

        <SectionHeading title={t("settings.personal")} />
        <section className="noor-card overflow-hidden">
          <LanguageSelector
            variant="settings"
            value={language}
            disabled={isDemo || isLoading}
            onChange={(nextLanguage) => {
              void (async () => {
                await setLanguage(nextLanguage);
                setSettings((current) =>
                  current
                    ? {
                        ...current,
                        profile: {
                          ...current.profile,
                          language: nextLanguage,
                        },
                      }
                    : current,
                );
              })();
            }}
          />
          <TextSizeSettingsRow
            title={t("settings.textSize")}
            normalLabel={t("settings.normal")}
            largeLabel={t("settings.large")}
            fontSize={fontSize}
            onChange={toggleFontSize}
          />
        </section>

        <SectionHeading title={t("notifications")} />
        <section className="noor-card overflow-hidden">
          <div
            className="border-b border-[#F0EFE9] px-4 py-3.5"
            style={{ borderBottomWidth: "0.5px", padding: "14px 16px" }}
          >
            <p className="text-[15px] font-semibold text-[#1E1D1B]">
              {t("email_notifications")}
            </p>
            <p className="mt-1 text-sm text-muted">
              {t("settings_email_prefix")}: {profile.email || "—"}
            </p>
          </div>

          <NotificationToggleRow
            label={t("medications_notifications")}
            checked={profile.notificationPreferences.medications}
            onChange={(enabled) => void setNotificationPreference("medications", enabled)}
          />
          <NotificationToggleRow
            label={t("lab_notifications")}
            checked={profile.notificationPreferences.labResults}
            onChange={(enabled) => void setNotificationPreference("labResults", enabled)}
          />
          <NotificationToggleRow
            label={t("family_notifications")}
            checked={profile.notificationPreferences.family}
            onChange={(enabled) => void setNotificationPreference("family", enabled)}
          />
          <NotificationToggleRow
            label={t("settings_notifications_appointments")}
            checked={profile.notificationPreferences.appointments}
            onChange={(enabled) =>
              void setNotificationPreference("appointments", enabled)
            }
          />
        </section>

        <SectionHeading title={t("family_connections")} />
        <section className="noor-card p-5">
          {familyConnections.length === 0 ? (
            <p className="text-base text-muted">
              {t("settings_no_family_members")}
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
            {t("invite_family_button")}
          </Link>
        </section>

        {SHOW_PRICING ? (
          <>
            <SectionHeading title={t("settings_subscription")} />
            <section className="noor-card overflow-hidden">
              <ProfileSubscriptionSection
                subscriptionTier={profile.subscriptionTier}
              />
            </section>
          </>
        ) : null}

        <SectionHeading title={t("account")} />
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
              {isExporting ? t("settings_exporting") : t("export_data")}
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
            <span className="text-base font-bold text-foreground">{t("logout")}</span>
          </button>
          <button
            type="button"
            onClick={() => setShowDeleteDialog(true)}
            className="flex min-h-12 w-full items-center gap-4 border-t border-border px-5 py-4 text-left text-red-600 transition-colors hover:bg-red-50"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50">
              <Trash2 size={24} aria-hidden="true" />
            </span>
            <span className="text-base font-bold">{t("delete_account")}</span>
          </button>
        </section>

        <SectionHeading title={t("about_noor")} />
        <section className="noor-card overflow-hidden">
          <SettingsRow
            icon={<Info size={24} aria-hidden="true" />}
            title={t("app_version")}
            subtitle={appVersion}
          />
          <LinkRow
            icon={<FileText size={24} aria-hidden="true" />}
            title={t("privacy")}
            href="/datenschutz"
          />
          <LinkRow
            icon={<FileText size={24} aria-hidden="true" />}
            title={t("imprint")}
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
                {t("contact")}
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
          title={t("settings_delete_confirm_title")}
          message={t("settings_delete_confirm_message")}
          confirmLabel={isDeleting ? t("settings_deleting") : t("settings_delete_confirm_yes")}
          cancelLabel={t("cancel")}
          isLoading={isDeleting}
          onConfirm={() => void deleteAccount()}
          onCancel={() => setShowDeleteDialog(false)}
        />
      )}

    </>
  );
}

function NotificationToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div
      className="flex items-center justify-between border-b border-[#F0EFE9] last:border-b-0"
      style={{ padding: "14px 16px", borderBottomWidth: "0.5px" }}
    >
      <span
        className="flex-1 text-[15px] text-[#1E1D1B]"
        style={{ fontSize: "15px", color: "#1E1D1B", flex: 1 }}
      >
        {label}
      </span>
      <Toggle checked={checked} onChange={onChange} label={label} />
    </div>
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
  const { t } = useLanguage();

  return (
    <li className="rounded-2xl border border-border bg-background p-4">
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary-light text-primary">
          <Users size={20} aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-base font-bold text-foreground">{connection.name}</p>
          {connection.subtitle ? (
            <p className="mt-1 text-sm text-primary">{connection.subtitle}</p>
          ) : null}
          <p className="mt-1 text-base text-muted">{connection.relationship}</p>
          <p className="mt-1 text-sm text-muted">
            {t("settings_connected_since", { date: connection.connectedAt })}
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={onDisconnect}
        disabled={isDisconnecting}
        className="mt-4 min-h-12 w-full rounded-2xl border border-red-200 px-4 py-3 text-base font-semibold text-red-600 transition-colors hover:bg-red-50 disabled:opacity-60"
      >
        {isDisconnecting ? t("settings_disconnecting") : t("disconnect")}
      </button>
    </li>
  );
}

function TextSizeSettingsRow({
  title,
  normalLabel,
  largeLabel,
  fontSize,
  onChange,
}: {
  title: string;
  normalLabel: string;
  largeLabel: string;
  fontSize: FontSizePreference;
  onChange: (size: FontSizePreference) => void;
}) {
  return (
    <div
      className="flex flex-col gap-2.5 border-b border-border px-4 py-3.5"
      style={{ padding: "14px 16px", gap: "10px" }}
    >
      <div className="flex items-center gap-2.5" style={{ gap: "10px" }}>
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary-light text-primary">
          <Type size={24} aria-hidden="true" />
        </span>
        <span className="text-[15px] font-semibold text-foreground">{title}</span>
      </div>

      <div
        role="group"
        aria-label={title}
        className="flex gap-2"
        style={{ gap: "8px" }}
      >
        <button
          type="button"
          onClick={() => onChange("normal")}
          aria-pressed={fontSize === "normal"}
          className="flex-1 cursor-pointer rounded-[10px] border-0 py-2.5 text-sm font-semibold"
          style={{
            padding: "10px",
            borderRadius: "10px",
            fontWeight: "600",
            fontSize: "14px",
            backgroundColor: fontSize === "normal" ? "#1D9E75" : "#F0EFE9",
            color: fontSize === "normal" ? "#FFFFFF" : "#6B685A",
          }}
        >
          {normalLabel}
        </button>
        <button
          type="button"
          onClick={() => onChange("large")}
          aria-pressed={fontSize === "large"}
          className="flex-1 cursor-pointer rounded-[10px] border-0 py-2.5 text-sm font-semibold"
          style={{
            padding: "10px",
            borderRadius: "10px",
            fontWeight: "600",
            fontSize: "14px",
            backgroundColor: fontSize === "large" ? "#1D9E75" : "#F0EFE9",
            color: fontSize === "large" ? "#FFFFFF" : "#6B685A",
          }}
        >
          {largeLabel}
        </button>
      </div>
    </div>
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
    <div className="flex min-h-12 items-center justify-between gap-3 border-b border-border px-5 py-4 last:border-b-0">
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary-light text-primary">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-base font-bold text-foreground">{title}</span>
        <span className="mt-1 block text-base leading-snug text-muted">{subtitle}</span>
      </span>
      {action ? <span className="shrink-0">{action}</span> : null}
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
