"use client";

import Link from "next/link";
import { formatHomeActivityWeekSubtitle } from "@/types/activity-log";
import type { HomeScreenData } from "@/lib/home-screen";

type HomeTodayActivityCardProps = {
  activity: HomeScreenData["todayActivity"];
  week: HomeScreenData["activityWeek"];
};

export function HomeTodayActivityCard({
  activity,
  week,
}: HomeTodayActivityCardProps) {
  const weekSubtitle = formatHomeActivityWeekSubtitle(week);

  if (!activity) {
    return (
      <section
        className="flex items-center justify-between gap-4"
        style={{
          backgroundColor: "#FFFFFF",
          border: "0.5px solid #E4E2DB",
          borderRadius: "16px",
          padding: "16px",
        }}
        aria-label="Aktivität heute"
      >
        <div className="flex min-w-0 items-center gap-3">
          <span
            aria-hidden="true"
            style={{ fontSize: "32px", lineHeight: 1, flexShrink: 0 }}
          >
            🏃
          </span>
          <div className="min-w-0">
            <p
              style={{
                margin: 0,
                fontSize: "15px",
                fontWeight: 600,
                color: "#085041",
              }}
            >
              Aktivität heute
            </p>
            <p
              style={{
                margin: "2px 0 0",
                fontSize: "13px",
                color: "#88856F",
              }}
            >
              {week.activeDays > 0
                ? weekSubtitle
                : "Noch keine Aktivität eingetragen"}
            </p>
          </div>
        </div>

        <Link
          href="/activity"
          className="shrink-0 transition-opacity hover:opacity-80"
          style={{
            backgroundColor: "#E1F5EE",
            color: "#1D9E75",
            borderRadius: "20px",
            padding: "6px 14px",
            fontSize: "13px",
            fontWeight: 600,
            textDecoration: "none",
            whiteSpace: "nowrap",
          }}
        >
          + Eintragen
        </Link>
      </section>
    );
  }

  return (
    <Link
      href="/activity"
      className="flex items-center justify-between gap-4 transition-opacity hover:opacity-95"
      style={{
        backgroundColor: "#E1F5EE",
        border: "0.5px solid #1D9E75",
        borderRadius: "16px",
        padding: "16px",
        textDecoration: "none",
      }}
      aria-label="Aktivität heute bearbeiten"
    >
      <div className="flex min-w-0 items-center gap-3">
        <span
          aria-hidden="true"
          style={{ fontSize: "32px", lineHeight: 1, flexShrink: 0 }}
        >
          {activity.emoji}
        </span>
        <div className="min-w-0">
          <p
            style={{
              margin: 0,
              fontSize: "15px",
              fontWeight: 600,
              color: "#085041",
            }}
          >
            {activity.title}
          </p>
          <p
            style={{
              margin: "2px 0 0",
              fontSize: "13px",
              color: "#1D9E75",
            }}
          >
            {activity.subtitle}
          </p>
        </div>
      </div>

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
    </Link>
  );
}
