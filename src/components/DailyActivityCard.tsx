"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ActivityLogSheet } from "@/components/ActivityLogSheet";
import { useLanguage } from "@/components/LanguageProvider";
import { buildApiAuthHeaders } from "@/lib/api-auth";
import { fetchWithTimeout } from "@/lib/fetch-with-timeout";
import {
  formatLocalizedTodayActivityEntry,
  getActivityTypeOptions,
} from "@/lib/i18n/activity-labels";
import type { HealthGoalsApiResponse } from "@/types/health-goals";
import {
  type ActivityType,
  type StoredActivityLog,
} from "@/types/activity-log";

export function DailyActivityCard({
  embedded = false,
  onSaved,
}: {
  embedded?: boolean;
  onSaved?: () => void;
}) {
  const router = useRouter();
  const { t } = useLanguage();
  const activityTypeOptions = useMemo(() => getActivityTypeOptions(t), [t]);
  const [sheetType, setSheetType] = useState<ActivityType | null>(null);
  const [savedLogs, setSavedLogs] = useState<StoredActivityLog[]>([]);
  const [stepsToday, setStepsToday] = useState<number | "">("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showSavedMessage, setShowSavedMessage] = useState(false);

  useEffect(() => {
    void fetchTodayData(true);
  }, []);

  async function fetchTodayData(showLoading = false) {
    if (showLoading) {
      setIsLoading(true);
    }

    try {
      const headers = await buildApiAuthHeaders();
      const [activityResponse, goalsResponse] = await Promise.all([
        fetchWithTimeout("/api/activity-log", {
          credentials: "include",
          headers,
        }),
        fetchWithTimeout("/api/health-goals", {
          credentials: "include",
          headers,
        }),
      ]);

      if (activityResponse.ok) {
        const payload = (await activityResponse.json()) as {
          logs?: StoredActivityLog[];
          log?: StoredActivityLog | null;
        };
        const logs = payload.logs ?? (payload.log ? [payload.log] : []);
        setSavedLogs(logs);
      }

      if (goalsResponse.ok) {
        const payload = (await goalsResponse.json()) as HealthGoalsApiResponse;
        if (payload.today?.steps) {
          setStepsToday(payload.today.steps);
        }
      }
    } catch {
      // Non-blocking — card stays usable without prior log.
    } finally {
      if (showLoading) {
        setIsLoading(false);
      }
    }
  }

  async function saveActivity({
    activityType,
    durationMinutes,
    stepsValue,
    note,
  }: {
    activityType: ActivityType;
    durationMinutes: number | null;
    stepsValue: number | "";
    note: string;
  }) {
    setIsSaving(true);
    setSaveError(null);

    try {
      const headers = await buildApiAuthHeaders(true);

      const response = await fetchWithTimeout("/api/activity-log", {
        method: "POST",
        credentials: "include",
        headers,
        body: JSON.stringify({
          activity_type: activityType,
          duration_minutes: durationMinutes,
          note,
        }),
      });

      const payload = (await response.json().catch(() => null)) as {
        error?: string;
        log?: StoredActivityLog;
      } | null;

      if (!response.ok) {
        console.error("Activity save error:", payload?.error ?? response.status);
        throw new Error(payload?.error ?? t("common_save_failed"));
      }

      if (!payload?.log) {
        throw new Error(t("activity_saved_confirm_failed"));
      }

      if (typeof stepsValue === "number" && stepsValue > 0) {
        await fetchWithTimeout("/api/health-goals/today", {
          method: "PATCH",
          credentials: "include",
          headers,
          body: JSON.stringify({ steps: stepsValue }),
        });
      }

      setSheetType(null);
      setShowSavedMessage(true);
      await fetchTodayData();
      router.refresh();
      onSaved?.();
      window.setTimeout(() => setShowSavedMessage(false), 2500);
    } catch (error) {
      setSaveError(
        error instanceof Error ? error.message : t("activity_save_failed"),
      );
      return false;
    } finally {
      setIsSaving(false);
    }

    return true;
  }

  async function handleActivityTypeClick(type: ActivityType) {
    if (isSaving) return;

    setSaveError(null);

    if (type === "rest") {
      const success = await saveActivity({
        activityType: type,
        durationMinutes: null,
        stepsValue: stepsToday,
        note: "",
      });
      if (!success) {
        // saveActivity sets saveError
      }
      return;
    }

    setSheetType(type);
  }

  function closeSheet() {
    if (isSaving) return;
    setSheetType(null);
    setSaveError(null);
  }

  const sheetOption = activityTypeOptions.find(
    (option) => option.value === sheetType,
  );

  const content = (
    <>
      {!embedded ? (
        <>
          <h2 className="heading-lg">{t("activity_today")}</h2>
          <p className="text-body mt-1 text-muted">{t("how_active_today")}</p>
        </>
      ) : null}

      {isLoading ? (
        <p className="text-body mt-4 flex items-center gap-2 text-muted">
          <Loader2 size={18} className="animate-spin" aria-hidden="true" />
          {t("activity_loading_short")}
        </p>
      ) : (
        <>
          {savedLogs.length > 0 ? (
            <ul className="mt-4 flex flex-col gap-2">
              {savedLogs.map((log) => (
                <li
                  key={log.id}
                  className="rounded-2xl border border-border bg-background px-4 py-3 text-sm text-foreground"
                >
                  {formatLocalizedTodayActivityEntry(log, t)}
                </li>
              ))}
            </ul>
          ) : null}

          <div className="mt-4 grid grid-cols-2 gap-3">
            {activityTypeOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                disabled={isSaving}
                onClick={() => void handleActivityTypeClick(option.value)}
                className="flex min-h-[96px] flex-col items-start rounded-xl border border-border bg-background px-4 py-3.5 text-left transition-colors hover:border-primary/30 disabled:opacity-60"
                style={{ borderWidth: "0.5px", borderRadius: "12px" }}
              >
                <span className="text-2xl" aria-hidden="true">
                  {option.emoji}
                </span>
                <span className="mt-2 block text-base font-semibold text-[#085041]">
                  {option.title}
                </span>
                <span className="mt-0.5 block text-sm text-muted">
                  {option.subtitle}
                </span>
              </button>
            ))}
          </div>

          {saveError && !sheetType ? (
            <p className="mt-3 text-sm font-semibold text-danger" role="alert">
              {saveError}
            </p>
          ) : null}

          {showSavedMessage ? (
            <p
              className="mt-4 text-center text-base font-semibold text-primary"
              role="status"
            >
              {t("activity_saved")}
            </p>
          ) : null}
        </>
      )}

      <ActivityLogSheet
        open={sheetType != null}
        activityType={sheetType}
        activityTitle={sheetOption?.title ?? ""}
        activityEmoji={sheetOption?.emoji ?? ""}
        initialSteps={stepsToday}
        isSaving={isSaving}
        saveError={sheetType ? saveError : null}
        onClose={closeSheet}
        onSave={({ durationMinutes, stepsToday: stepsValue, note }) => {
          if (!sheetType) return;
          void saveActivity({
            activityType: sheetType,
            durationMinutes,
            stepsValue,
            note,
          }).then((success) => {
            if (success) {
              setSaveError(null);
            }
          });
        }}
      />
    </>
  );

  if (embedded) {
    return <div aria-label={t("activity_today")}>{content}</div>;
  }

  return (
    <section className="noor-card p-5" aria-label={t("activity_today")}>
      {content}
    </section>
  );
}
