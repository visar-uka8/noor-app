"use client";

import { Loader2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { DailyActivityCard } from "@/components/DailyActivityCard";
import { ActivityGoalsSection } from "@/components/ActivityGoalsSection";
import { ActivityInsightCard } from "@/components/ActivityInsightCard";
import { ActivityLast14DaysChart } from "@/components/ActivityLast14DaysChart";
import { ConnectionErrorState } from "@/components/AppStates";
import { useLanguage } from "@/components/LanguageProvider";
import { buildApiAuthHeaders } from "@/lib/api-auth";
import {
  formatLocalizedActivityEntry,
  formatLocalizedWeekday,
} from "@/lib/i18n/activity-labels";
import { formatAppDate } from "@/lib/i18n/languages";
import {
  hasRecentActivityData,
  type ActivityHistorySummary,
} from "@/lib/activity-history";
import { fetchWithTimeout } from "@/lib/fetch-with-timeout";

function StatCard({
  value,
  label,
  suffix,
}: {
  value: number | string;
  label: string;
  suffix?: string;
}) {
  return (
    <div
      className="rounded-2xl border border-border bg-background px-3 py-4 text-center"
      style={{ borderWidth: "0.5px" }}
    >
      <p
        className="text-[22px] font-bold leading-none text-[#085041]"
        style={{ fontVariantNumeric: "tabular-nums" }}
      >
        {value}
        {suffix ? (
          <span className="text-[14px] font-semibold text-muted">{suffix}</span>
        ) : null}
      </p>
      <p className="mt-2 text-[13px] font-medium text-muted">{label}</p>
    </div>
  );
}

function SectionHeading({ title }: { title: string }) {
  return (
    <h2 className="mb-3 text-[13px] font-semibold uppercase tracking-wide text-muted">
      {title}
    </h2>
  );
}

export function ActivityHistoryScreen() {
  const { t, language } = useLanguage();
  const [summary, setSummary] = useState<ActivityHistorySummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoadError, setHasLoadError] = useState(false);
  const [showLogForm, setShowLogForm] = useState(false);

  const loadHistory = useCallback(async () => {
    setIsLoading(true);
    setHasLoadError(false);

    try {
      const headers = await buildApiAuthHeaders();
      const response = await fetchWithTimeout("/api/activity-log/history", {
        credentials: "include",
        headers,
      });

      if (!response.ok) {
        throw new Error("History request failed");
      }

      const payload = (await response.json()) as ActivityHistorySummary;
      setSummary(payload);
    } catch {
      setSummary(null);
      setHasLoadError(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  if (isLoading) {
    return (
      <section className="noor-card flex items-center justify-center gap-2 p-8 text-muted">
        <Loader2 size={22} className="animate-spin" aria-hidden="true" />
        {t("activity_loading")}
      </section>
    );
  }

  if (hasLoadError || !summary) {
    return (
      <ConnectionErrorState
        isOffline={false}
        onRetry={() => void loadHistory()}
      />
    );
  }

  const maxMinutes = Math.max(
    ...summary.last14Days.map((day) => day.minutes),
    1,
  );
  const currentMonthLabel = formatAppDate(language, new Date(), {
    month: "long",
    year: "numeric",
  });
  const canShowInsight = hasRecentActivityData(summary.entries);

  return (
    <div className="flex flex-col gap-5">
      <section className="noor-card p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="heading-lg">{t("activity_log_section_title")}</h2>
            <p className="text-body mt-1 text-muted">
              {t("activity_log_section_subtitle")}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowLogForm((current) => !current)}
            className="btn-touch shrink-0 rounded-2xl border-2 border-primary bg-surface px-4 py-3 text-sm font-semibold text-primary transition-colors hover:bg-primary-light"
          >
            {showLogForm ? t("close") : t("log_activity")}
          </button>
        </div>

        {showLogForm ? (
          <div className="mt-5 border-t border-border pt-5">
            <DailyActivityCard
              embedded
              onSaved={() => {
                void loadHistory();
                setShowLogForm(false);
              }}
            />
          </div>
        ) : null}
      </section>

      <ActivityGoalsSection />

      <section className="noor-card p-5">
        <SectionHeading title={t("activity_week_heading")} />
        <div className="flex justify-between gap-2">
          {summary.week.days.map((day) => (
            <div
              key={day.date}
              className="flex min-w-0 flex-1 flex-col items-center gap-2"
            >
              <div
                aria-hidden="true"
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  backgroundColor: day.hasActivity ? "#1D9E75" : "#E4E2DB",
                  border: day.isToday ? "2px solid #085041" : "2px solid transparent",
                  boxSizing: "border-box",
                }}
              />
              <span
                className="text-[12px] font-semibold"
                style={{ color: day.isToday ? "#085041" : "#88856F" }}
              >
                {formatLocalizedWeekday(language, day.date, "narrow")}
              </span>
            </div>
          ))}
        </div>
        <p className="mt-4 text-[15px] font-semibold text-[#085041]">
          {t("active_days_week", { count: summary.week.activeDays })}
        </p>
        <p className="mt-1 text-[13px] text-muted">
          {t("total_minutes", { minutes: summary.week.totalMinutes })}
        </p>
      </section>

      <section className="noor-card p-5">
        <SectionHeading title={currentMonthLabel} />
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "10px",
          }}
        >
          <StatCard
            value={summary.month.activeDays}
            label={t("active_days")}
            suffix={`/ ${summary.month.daysInMonth}`}
          />
          <StatCard
            value={summary.month.totalMinutes}
            label={t("minutes")}
          />
          <StatCard
            value={summary.month.avgMinutesPerDay}
            label={t("avg_per_day")}
          />
        </div>
      </section>

      <section className="noor-card p-5">
        <SectionHeading title={t("last_14_days")} />
        <ActivityLast14DaysChart
          days={summary.last14Days}
          entries={summary.entries}
          maxMinutes={maxMinutes}
        />

        <ActivityInsightCard enabled={canShowInsight} />
      </section>

      {summary.longestStreak >= 1 ? (
        <section
          className="noor-card flex items-center gap-3 p-5"
          role="status"
          aria-live="polite"
        >
          <span style={{ fontSize: "28px", lineHeight: 1 }} aria-hidden="true">
            🔥
          </span>
          <p className="text-[15px] font-semibold text-[#085041]">
            {summary.longestStreak === 1
              ? t("longest_streak_one", { count: summary.longestStreak })
              : t("longest_streak", { count: summary.longestStreak })}
          </p>
        </section>
      ) : null}

      <section className="noor-card overflow-hidden">
        <div className="px-5 pt-5">
          <SectionHeading title={t("activity_log_heading")} />
        </div>

        {summary.entries.length === 0 ? (
          <p className="px-5 py-6 text-sm text-muted">
            {t("activity_no_entries")}
          </p>
        ) : (
          <ul>
            {summary.entries.map((entry) => (
              <li
                key={entry.id}
                className="border-b border-border px-5 py-4 text-[15px] text-[#085041] last:border-b-0"
                style={{ borderBottomWidth: "0.5px" }}
              >
                {formatLocalizedActivityEntry(entry, language, t)}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
