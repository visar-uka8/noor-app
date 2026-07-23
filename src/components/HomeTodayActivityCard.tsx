"use client";

import { useRouter } from "next/navigation";
import { useLanguage } from "@/components/LanguageProvider";
import { HomeWaterProgress } from "@/components/WaterQuickLog";
import type { HomeScreenData } from "@/lib/home-screen";

type HomeTodayActivityCardProps = {
  activity: HomeScreenData["todayActivity"];
  week: HomeScreenData["activityWeek"];
  waterToday: HomeScreenData["waterToday"];
};

export function HomeTodayActivityCard({
  activity,
  week,
  waterToday,
}: HomeTodayActivityCardProps) {
  const router = useRouter();
  const { t } = useLanguage();

  const weekSubtitle = t("home_activity_week", {
    days: week.activeDays,
    minutes: week.totalMinutes,
  });

  function navigateToActivity() {
    router.push("/activity");
  }

  function handleKeyDown(event: React.KeyboardEvent) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      navigateToActivity();
    }
  }

  const emoji = activity?.emoji ?? "🏃";
  const totalMinutes = activity?.totalMinutes ?? 0;
  const title =
    activity && totalMinutes > 0
      ? t("home_active_today_minutes", { minutes: totalMinutes })
      : activity
        ? t("home_active_today")
        : t("activity_today");
  const subtitle = activity
    ? weekSubtitle
    : week.activeDays > 0
      ? weekSubtitle
      : t("home_no_activity_logged");

  return (
    <section
      role="button"
      tabIndex={0}
      onClick={navigateToActivity}
      onKeyDown={handleKeyDown}
      className="noor-card flex flex-col gap-3 p-4 transition-colors hover:border-primary/30 active:scale-[0.98]"
      style={{ cursor: "pointer" }}
      aria-label={
        activity ? t("home_activity_view_history") : t("home_activity_view_log")
      }
    >
      <div className="flex items-center gap-3">
        <span
          aria-hidden="true"
          style={{ fontSize: "28px", lineHeight: 1, flexShrink: 0 }}
        >
          {emoji}
        </span>

        <div className="min-w-0 flex-1">
          <h2 className="home-card-title font-bold text-[#085041]">{title}</h2>
          <p
            className={`home-card-subtitle mt-1 ${
              activity ? "text-primary" : "text-muted"
            }`}
          >
            {subtitle}
          </p>
        </div>

        {activity ? (
          <span
            aria-hidden="true"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "32px",
              height: "32px",
              borderRadius: "50%",
              backgroundColor: "#1D9E75",
              color: "#FFFFFF",
              fontSize: "16px",
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            ✓
          </span>
        ) : null}
      </div>

      <HomeWaterProgress waterToday={waterToday} />
    </section>
  );
}
