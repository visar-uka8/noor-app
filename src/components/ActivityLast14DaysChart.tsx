"use client";

import { useState } from "react";
import {
  formatActivityBarDayTooltip,
  type ActivityBarDay,
} from "@/lib/activity-history";
import type { StoredActivityLog } from "@/types/activity-log";

type ActivityLast14DaysChartProps = {
  days: ActivityBarDay[];
  entries: StoredActivityLog[];
  maxMinutes: number;
};

export function ActivityLast14DaysChart({
  days,
  entries,
  maxMinutes,
}: ActivityLast14DaysChartProps) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const selectedDay = days.find((day) => day.date === selectedDate) ?? null;

  function handleBarPress(date: string) {
    setSelectedDate((current) => (current === date ? null : date));
  }

  return (
    <div>
      {selectedDay ? (
        <p
          role="status"
          aria-live="polite"
          style={{
            margin: "0 0 10px",
            padding: "10px 12px",
            borderRadius: "12px",
            backgroundColor: "#E1F5EE",
            color: "#085041",
            fontSize: "13px",
            fontWeight: 500,
            lineHeight: 1.45,
            textAlign: "center",
          }}
        >
          {formatActivityBarDayTooltip(selectedDay.date, entries)}
        </p>
      ) : null}

      <div
        className="flex items-end justify-between gap-1"
        style={{ minHeight: 96, paddingTop: 8 }}
      >
        {days.map((day) => {
          const isSelected = selectedDate === day.date;

          return (
            <button
              key={day.date}
              type="button"
              aria-label={formatActivityBarDayTooltip(day.date, entries)}
              aria-pressed={isSelected}
              onClick={() => handleBarPress(day.date)}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "4px",
                flex: 1,
                padding: 0,
                border: "none",
                background: "transparent",
                cursor: "pointer",
              }}
            >
              <div
                style={{
                  width: "20px",
                  height: `${Math.max(4, (day.minutes / maxMinutes) * 80)}px`,
                  backgroundColor: day.minutes > 0 ? "#1D9E75" : "#E4E2DB",
                  borderRadius: "4px",
                  minHeight: "4px",
                  transition: "height 0.3s ease, opacity 0.2s ease",
                  opacity: isSelected ? 1 : selectedDate ? 0.55 : 1,
                  outline: isSelected ? "2px solid #085041" : "none",
                  outlineOffset: "2px",
                }}
              />
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "1px",
                  lineHeight: 1.1,
                }}
              >
                <span
                  style={{
                    fontSize: "9px",
                    fontWeight: 600,
                    color: day.isToday ? "#085041" : "#88856F",
                  }}
                >
                  {day.dayOfMonth}
                </span>
                <span
                  style={{
                    fontSize: "10px",
                    color: "#88856F",
                  }}
                >
                  {day.dayLabel}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
