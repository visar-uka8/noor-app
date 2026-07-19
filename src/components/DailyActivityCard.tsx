"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { buildApiAuthHeaders } from "@/lib/api-auth";
import { fetchWithTimeout } from "@/lib/fetch-with-timeout";
import {
  activityTypeOptions,
  durationOptions,
  formatTodayActivityEntry,
  type ActivityType,
  type StoredActivityLog,
} from "@/types/activity-log";

export function DailyActivityCard() {
  const router = useRouter();
  const [selectedType, setSelectedType] = useState<ActivityType | null>(null);
  const [durationMinutes, setDurationMinutes] = useState<number | null>(null);
  const [note, setNote] = useState("");
  const [savedLogs, setSavedLogs] = useState<StoredActivityLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showSavedMessage, setShowSavedMessage] = useState(false);

  useEffect(() => {
    void fetchTodayLogs(true);
  }, []);

  async function fetchTodayLogs(showLoading = false) {
    if (showLoading) {
      setIsLoading(true);
    }

    try {
      const headers = await buildApiAuthHeaders();
      const response = await fetchWithTimeout("/api/activity-log", {
        credentials: "include",
        headers,
      });
      if (!response.ok) return;

      const payload = (await response.json()) as {
        logs?: StoredActivityLog[];
        log?: StoredActivityLog | null;
      };
      const logs = payload.logs ?? (payload.log ? [payload.log] : []);

      setSavedLogs(logs);
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
      setSaveError("Bitte wählen Sie eine Aktivität aus.");
      return;
    }

    if (selectedType !== "rest" && durationMinutes == null) {
      setSaveError("Bitte wählen Sie eine Dauer aus.");
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
        throw new Error(payload?.error ?? "Speichern fehlgeschlagen.");
      }

      if (!payload?.log) {
        throw new Error(
          "Aktivität wurde gespeichert, konnte aber nicht bestätigt werden.",
        );
      }

      setSelectedType(null);
      setDurationMinutes(null);
      setNote("");
      setShowSavedMessage(true);
      await fetchTodayLogs();
      router.refresh();
      window.setTimeout(() => setShowSavedMessage(false), 2500);
    } catch (error) {
      setSaveError(
        error instanceof Error
          ? error.message
          : "Aktivität konnte nicht gespeichert werden.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  function selectType(type: ActivityType) {
    setSelectedType(type);
    setSaveError(null);

    if (type === "rest") {
      setDurationMinutes(null);
    }
  }

  return (
    <section
      className="noor-card p-5"
      aria-label="Aktivität heute"
    >
      <h2 className="heading-lg">Aktivität heute</h2>
      <p className="text-body mt-1 text-muted">Wie aktiv waren Sie heute?</p>

      {isLoading ? (
        <p className="text-body mt-4 flex items-center gap-2 text-muted">
          <Loader2 size={18} className="animate-spin" aria-hidden="true" />
          Wird geladen…
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
                  {formatTodayActivityEntry(log)}
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

          {selectedType ? (
            <div className="mt-5">
              {selectedType !== "rest" ? (
                <div>
                  <span className="block text-base font-semibold text-foreground">
                    Wie lange?
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
                  Notiz (optional)
                </span>
                <input
                  type="text"
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder="z.B. 10km gelaufen"
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
                Speichern
              </button>
            </div>
          ) : null}

          {showSavedMessage ? (
            <p
              className="mt-4 text-center text-base font-semibold text-primary"
              role="status"
            >
              Aktivität gespeichert ✓
            </p>
          ) : null}
        </>
      )}
    </section>
  );
}
