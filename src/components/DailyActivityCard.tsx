"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useLanguage } from "@/components/LanguageProvider";
import { buildApiAuthHeaders } from "@/lib/api-auth";
import { fetchWithTimeout } from "@/lib/fetch-with-timeout";
import {
  formatLocalizedTodayActivityEntry,
  getActivityTypeOptions,
} from "@/lib/i18n/activity-labels";
import { WaterQuickLog } from "@/components/WaterQuickLog";
import type { HealthGoalsApiResponse } from "@/types/health-goals";
import {
  durationOptions,
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
  const [selectedType, setSelectedType] = useState<ActivityType | null>(null);
  const [durationMinutes, setDurationMinutes] = useState<number | null>(null);
  const [note, setNote] = useState("");
  const [savedLogs, setSavedLogs] = useState<StoredActivityLog[]>([]);
  const [waterLiters, setWaterLiters] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingWater, setIsSavingWater] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [waterSaveError, setWaterSaveError] = useState<string | null>(null);
  const [showSavedMessage, setShowSavedMessage] = useState(false);
  const [showWaterSavedMessage, setShowWaterSavedMessage] = useState(false);

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
        setWaterLiters(payload.today?.waterLiters ?? 0);
      }
    } catch {
      // Non-blocking — card stays usable without prior log.
    } finally {
      if (showLoading) {
        setIsLoading(false);
      }
    }
  }

  async function saveActivity() {
    if (!selectedType) {
      setSaveError(t("activity_select_type"));
      return;
    }

    if (selectedType !== "rest" && durationMinutes == null) {
      setSaveError(t("activity_select_duration"));
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    try {
      const headers = await buildApiAuthHeaders(true);

      const response = await fetchWithTimeout("/api/activity-log", {
        method: "POST",
        credentials: "include",
        headers,
        body: JSON.stringify({
          activity_type: selectedType,
          duration_minutes: selectedType === "rest" ? null : durationMinutes,
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

      setSelectedType(null);
      setDurationMinutes(null);
      setNote("");
      setShowSavedMessage(true);
      await fetchTodayData();
      router.refresh();
      onSaved?.();
      window.setTimeout(() => setShowSavedMessage(false), 2500);
    } catch (error) {
      setSaveError(
        error instanceof Error ? error.message : t("activity_save_failed"),
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function saveWater(liters: number) {
    setIsSavingWater(true);
    setWaterSaveError(null);
    const previousValue = waterLiters;
    setWaterLiters(liters);

    try {
      const headers = await buildApiAuthHeaders(true);
      const response = await fetchWithTimeout("/api/health-goals/today", {
        method: "PATCH",
        credentials: "include",
        headers,
        body: JSON.stringify({ waterLiters: liters }),
      });

      const payload = (await response.json().catch(() => null)) as {
        error?: string;
        today?: { waterLiters?: number };
      } | null;

      if (!response.ok) {
        throw new Error(payload?.error ?? t("common_save_failed"));
      }

      setWaterLiters(payload?.today?.waterLiters ?? liters);
      setShowWaterSavedMessage(true);
      router.refresh();
      window.setTimeout(() => setShowWaterSavedMessage(false), 2000);
    } catch (error) {
      setWaterLiters(previousValue);
      setWaterSaveError(
        error instanceof Error
          ? error.message
          : t("common_water_save_failed"),
      );
    } finally {
      setIsSavingWater(false);
    }
  }

  function selectType(type: ActivityType) {
    setSelectedType(type);
    setSaveError(null);

    if (type === "rest") {
      setDurationMinutes(null);
    }
  }

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
            {activityTypeOptions.map((option) => {
              const selected = selectedType === option.value;

              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => selectType(option.value)}
                  className={`flex min-h-[96px] flex-col items-start rounded-xl border px-4 py-3.5 text-left transition-colors ${
                    selected
                      ? "border-primary bg-primary-light"
                      : "border-border bg-background hover:border-primary/30"
                  }`}
                  style={{ borderWidth: "0.5px", borderRadius: "12px" }}
                  aria-pressed={selected}
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
              );
            })}
          </div>

          <WaterQuickLog
            value={waterLiters}
            isSaving={isSavingWater}
            error={waterSaveError}
            onSave={saveWater}
          />

          {selectedType ? (
            <div className="mt-5">
              {selectedType !== "rest" ? (
                <div>
                  <span className="block text-base font-semibold text-foreground">
                    {t("how_long")}
                  </span>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {durationOptions.map((option) => {
                      const selected = durationMinutes === option.value;

                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => {
                            setDurationMinutes(option.value);
                            setSaveError(null);
                          }}
                          className={`rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
                            selected
                              ? "border-primary bg-primary text-white"
                              : "border-border bg-background text-foreground hover:border-primary/40"
                          }`}
                          aria-pressed={selected}
                        >
                          {option.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              <label className="mt-5 block">
                <span className="mb-2 block text-base font-semibold text-foreground">
                  {t("note_optional")}
                </span>
                <input
                  type="text"
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder={t("activity_note_placeholder")}
                  className="min-h-12 w-full rounded-2xl border border-border bg-background px-4 text-base text-foreground outline-none focus:border-primary"
                />
              </label>

              {saveError ? (
                <p className="mt-3 text-sm font-semibold text-danger" role="alert">
                  {saveError}
                </p>
              ) : null}

              <button
                type="button"
                disabled={isSaving}
                onClick={() => void saveActivity()}
                className="btn-primary mt-5 w-full gap-2 disabled:opacity-70"
              >
                {isSaving && <Loader2 size={20} className="animate-spin" />}
                {t("save_activity")}
              </button>
            </div>
          ) : null}

          {showWaterSavedMessage ? (
            <p
              className="mt-3 text-center text-sm font-semibold text-[#378ADD]"
              role="status"
            >
              {t("activity_water_saved")}
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
