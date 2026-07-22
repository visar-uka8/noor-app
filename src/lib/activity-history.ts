import {
  getActivityTypeTitle,
  getTodayDateString,
  formatActivityTypeLabel,
  type StoredActivityLog,
} from "@/types/activity-log";

const WEEKDAY_LABELS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"] as const;

export type ActivityWeekDay = {
  date: string;
  dayLabel: string;
  hasActivity: boolean;
  minutes: number;
  isToday: boolean;
};

export type ActivityBarDay = {
  date: string;
  dayLabel: string;
  dayOfMonth: number;
  isToday: boolean;
  minutes: number;
};

export type ActivityHistorySummary = {
  week: {
    days: ActivityWeekDay[];
    activeDays: number;
    totalMinutes: number;
  };
  month: {
    activeDays: number;
    totalMinutes: number;
    daysInMonth: number;
    avgMinutesPerDay: number;
  };
  longestStreak: number;
  last14Days: ActivityBarDay[];
  entries: StoredActivityLog[];
};

function parseLocalDateString(dateStr: string) {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function isSameLocalDay(left: Date, right: Date) {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

function startOfLocalDay(value: Date) {
  const day = new Date(value);
  day.setHours(0, 0, 0, 0);
  return day;
}

function getMondayOfWeek(referenceDate: Date) {
  const day = referenceDate.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = startOfLocalDay(referenceDate);
  monday.setDate(referenceDate.getDate() + mondayOffset);
  return monday;
}

function sumMinutesForLogs(
  logs: Array<Pick<StoredActivityLog, "date" | "duration_minutes">>,
) {
  return logs.reduce((sum, log) => sum + (log.duration_minutes ?? 0), 0);
}

function groupMinutesByDate(
  logs: Array<Pick<StoredActivityLog, "date" | "duration_minutes">>,
) {
  const map = new Map<string, number>();

  for (const log of logs) {
    map.set(log.date, (map.get(log.date) ?? 0) + (log.duration_minutes ?? 0));
  }

  return map;
}

function getActiveDates(
  logs: Array<Pick<StoredActivityLog, "date">>,
) {
  return new Set(logs.map((log) => log.date));
}

export function buildActivityWeekSummary(
  logs: Array<Pick<StoredActivityLog, "date" | "duration_minutes">>,
  referenceDate = new Date(),
) {
  const monday = getMondayOfWeek(referenceDate);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const weekLogs = logs.filter((log) => {
    const date = parseLocalDateString(log.date);
    return date >= monday && date <= sunday;
  });

  const minutesByDate = groupMinutesByDate(weekLogs);
  const activeDates = getActiveDates(weekLogs);

  const days = WEEKDAY_LABELS.map((dayLabel, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    const dateKey = getTodayDateString(date);

    return {
      date: dateKey,
      dayLabel,
      hasActivity: activeDates.has(dateKey),
      minutes: minutesByDate.get(dateKey) ?? 0,
      isToday: isSameLocalDay(date, referenceDate),
    };
  });

  return {
    days,
    activeDays: days.filter((day) => day.hasActivity).length,
    totalMinutes: sumMinutesForLogs(weekLogs),
  };
}

export function buildActivityMonthSummary(
  logs: Array<Pick<StoredActivityLog, "date" | "duration_minutes">>,
  referenceDate = new Date(),
) {
  const year = referenceDate.getFullYear();
  const month = referenceDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const monthLogs = logs.filter((log) => {
    const date = parseLocalDateString(log.date);
    return date.getFullYear() === year && date.getMonth() === month;
  });

  const activeDays = getActiveDates(monthLogs).size;
  const totalMinutes = sumMinutesForLogs(monthLogs);

  return {
    activeDays,
    totalMinutes,
    daysInMonth,
    avgMinutesPerDay:
      activeDays > 0 ? Math.round(totalMinutes / activeDays) : 0,
  };
}

export function calculateLongestActivityStreak(
  logs: Array<Pick<StoredActivityLog, "date">>,
) {
  const activeDates = [...getActiveDates(logs)].sort();

  if (activeDates.length === 0) return 0;

  let longest = 1;
  let current = 1;

  for (let index = 1; index < activeDates.length; index += 1) {
    const previous = parseLocalDateString(activeDates[index - 1]);
    const currentDate = parseLocalDateString(activeDates[index]);
    const diffDays = Math.round(
      (currentDate.getTime() - previous.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (diffDays === 1) {
      current += 1;
      longest = Math.max(longest, current);
    } else if (diffDays > 1) {
      current = 1;
    }
  }

  return longest;
}

export function buildLast14DaysChart(
  logs: Array<Pick<StoredActivityLog, "date" | "duration_minutes">>,
  referenceDate = new Date(),
): ActivityBarDay[] {
  const minutesByDate = groupMinutesByDate(logs);

  return Array.from({ length: 14 }, (_, index) => {
    const date = startOfLocalDay(referenceDate);
    date.setDate(referenceDate.getDate() - (13 - index));
    const dateKey = getTodayDateString(date);

    return {
      date: dateKey,
      dayLabel: new Intl.DateTimeFormat("de-DE", {
        weekday: "narrow",
      }).format(date),
      dayOfMonth: date.getDate(),
      isToday: isSameLocalDay(date, referenceDate),
      minutes: minutesByDate.get(dateKey) ?? 0,
    };
  });
}

export function formatActivityBarDayTooltip(
  date: string,
  logs: Array<
    Pick<StoredActivityLog, "date" | "activity_type" | "duration_minutes">
  >,
) {
  const dateObj = parseLocalDateString(date);
  const weekday = new Intl.DateTimeFormat("de-DE", {
    weekday: "long",
  }).format(dateObj);
  const formattedDate = new Intl.DateTimeFormat("de-DE", {
    day: "numeric",
    month: "long",
  }).format(dateObj);
  const dayLogs = logs.filter((log) => log.date === date);

  if (dayLogs.length === 0) {
    return `${weekday}, ${formattedDate} — Keine Aktivität`;
  }

  const totalMinutes = dayLogs.reduce(
    (sum, log) => sum + (log.duration_minutes ?? 0),
    0,
  );
  const activityTitles = [
    ...new Set(dayLogs.map((log) => formatActivityTypeLabel(log.activity_type))),
  ];
  const activityLabel = activityTitles.join(" + ");

  if (totalMinutes > 0) {
    return `${weekday}, ${formattedDate} — ${totalMinutes} Min. ${activityLabel}`;
  }

  return `${weekday}, ${formattedDate} — ${activityLabel}`;
}

export function formatActivityHistoryEntry(
  log: Pick<StoredActivityLog, "date" | "activity_type" | "duration_minutes">,
) {
  const date = parseLocalDateString(log.date);
  const weekday = new Intl.DateTimeFormat("de-DE", {
    weekday: "short",
  }).format(date);
  const formattedDate = new Intl.DateTimeFormat("de-DE", {
    day: "numeric",
    month: "long",
  }).format(date);
  const title = getActivityTypeTitle(log.activity_type);

  if (log.duration_minutes != null && log.duration_minutes > 0) {
    return `${weekday}, ${formattedDate} · ${title} · ${log.duration_minutes} Min.`;
  }

  return `${weekday}, ${formattedDate} · ${title}`;
}

export function buildActivityHistorySummary(
  logs: StoredActivityLog[],
  referenceDate = new Date(),
): ActivityHistorySummary {
  const sortedEntries = [...logs].sort((left, right) => {
    if (left.date !== right.date) {
      return right.date.localeCompare(left.date);
    }

    return right.created_at.localeCompare(left.created_at);
  });

  return {
    week: buildActivityWeekSummary(logs, referenceDate),
    month: buildActivityMonthSummary(logs, referenceDate),
    longestStreak: calculateLongestActivityStreak(logs),
    last14Days: buildLast14DaysChart(logs, referenceDate),
    entries: sortedEntries,
  };
}

export function buildActivitySummary30Days(
  logs: Array<
    Pick<StoredActivityLog, "date" | "activity_type" | "duration_minutes">
  >,
  referenceDate = new Date(),
) {
  const startDate = startOfLocalDay(referenceDate);
  startDate.setDate(referenceDate.getDate() - 29);
  const startKey = getTodayDateString(startDate);
  const endLabel = new Intl.DateTimeFormat("de-DE", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(referenceDate);

  const recentLogs = logs.filter((log) => log.date >= startKey);
  const activeLogs = recentLogs.filter((log) => log.activity_type !== "rest");
  const activeDates = getActiveDates(activeLogs);
  const activeDays = activeDates.size;
  const totalMinutes = sumMinutesForLogs(activeLogs);
  const avgMinutesPerActiveDay =
    activeDays > 0 ? Math.round(totalMinutes / activeDays) : 0;

  const activityTypeCounts = activeLogs.reduce<Record<string, number>>(
    (counts, log) => {
      const label = getActivityTypeTitle(log.activity_type);
      counts[label] = (counts[label] ?? 0) + 1;
      return counts;
    },
    {},
  );

  const typeBreakdown = Object.entries(activityTypeCounts)
    .map(([label, count]) => `${label}: ${count}x`)
    .join(", ");

  return [
    `Zeitraum: letzte 30 Tage (bis ${endLabel})`,
    `Aktive Tage: ${activeDays} von 30`,
    `Gesamtminuten: ${totalMinutes}`,
    `Durchschnitt pro aktivem Tag: ${avgMinutesPerActiveDay} Minuten`,
    typeBreakdown ? `Aktivitätstypen: ${typeBreakdown}` : null,
    `Einträge gesamt: ${recentLogs.length}`,
  ]
    .filter(Boolean)
    .join("\n");
}

export function hasRecentActivityData(
  logs: Array<Pick<StoredActivityLog, "date" | "activity_type">>,
  referenceDate = new Date(),
) {
  const startDate = startOfLocalDay(referenceDate);
  startDate.setDate(referenceDate.getDate() - 29);
  const startKey = getTodayDateString(startDate);

  return logs.some(
    (log) => log.date >= startKey && log.activity_type !== "rest",
  );
}
