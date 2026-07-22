"use client";

import { useRouter } from "next/navigation";
import { HomeWaterProgress } from "@/components/WaterQuickLog";
import { formatHomeActivityWeekSubtitle } from "@/types/activity-log";
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
  const weekSubtitle = formatHomeActivityWeekSubtitle(week);

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
  const title = activity?.title ?? "Aktivität heute";
  const subtitle =
    activity?.subtitle ??
    (week.activeDays > 0
      ? weekSubtitle
      : "Noch keine Aktivität eingetragen");

  return (
    <section
      role="button"
      tabIndex={0}
      onClick={navigateToActivity}
      onKeyDown={handleKeyDown}
      className="noor-card flex flex-col gap-3 p-4 transition-colors hover:border-primary/30 active:scale-[0.98]"
      style={{ cursor: "pointer" }}
      aria-label={
        activity ? "Aktivitätsverlauf ansehen" : "Aktivität ansehen und eintragen"
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
          <p
            style={{
              margin: 0,
              fontSize: "15px",
              fontWeight: 600,
              color: "#085041",
            }}
          >
            {title}
          </p>
          <p
            style={{
              margin: "2px 0 0",
              fontSize: "13px",
              color: activity ? "#1D9E75" : "#88856F",
            }}
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
