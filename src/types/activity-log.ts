export type ActivityType = "walk" | "sport" | "intense" | "rest";

export type StoredActivityLog = {
  id: string;
  user_id: string;
  date: string;
  activity_type: ActivityType;
  duration_minutes: number | null;
  note: string | null;
  created_at: string;
};

export const activityTypeOptions: Array<{
  value: ActivityType;
  emoji: string;
  title: string;
  subtitle: string;
}> = [
  {
    value: "walk",
    emoji: "🚶",
    title: "Spaziergang",
    subtitle: "Leichte Bewegung",
  },
  {
    value: "sport",
    emoji: "🏃",
    title: "Sport gemacht",
    subtitle: "Training absolviert",
  },
  {
    value: "intense",
    emoji: "💪",
    title: "Intensives Training",
    subtitle: "Hartes Workout",
  },
  {
    value: "rest",
    emoji: "🛋️",
    title: "Ruhiger Tag",
    subtitle: "Wenig Bewegung",
  },
];

export const durationOptions = [
  { value: 15, label: "15 min" },
  { value: 30, label: "30 min" },
  { value: 45, label: "45 min" },
  { value: 60, label: "60 min" },
  { value: 90, label: "90 min" },
  { value: 120, label: "2h+" },
] as const;

const activityTypeLabels: Record<ActivityType, string> = {
  walk: "Spaziergang",
  sport: "Sport",
  intense: "Intensives Training",
  rest: "Ruhetag",
};

const activityTypeEmojis: Record<ActivityType, string> = {
  walk: "🚶",
  sport: "🏃",
  intense: "💪",
  rest: "🛋️",
};

export function getTodayDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function formatActivityTypeLabel(type: ActivityType) {
  return activityTypeLabels[type];
}

export function formatActivityLogLine(log: Pick<StoredActivityLog, "date" | "activity_type" | "duration_minutes">) {
  const label = activityTypeLabels[log.activity_type];
  if (log.duration_minutes != null && log.duration_minutes > 0) {
    return `${log.date}: ${label}, ${log.duration_minutes} Min.`;
  }
  return `${log.date}: ${label}`;
}

export function formatTodayActivityEntry(
  log: Pick<StoredActivityLog, "activity_type" | "duration_minutes">,
) {
  const label = getActivityTypeTitle(log.activity_type);
  if (log.duration_minutes != null && log.duration_minutes > 0) {
    return `${label} — ${log.duration_minutes} Min.`;
  }
  return label;
}

export function formatTodayActivityShortLabel(type: ActivityType) {
  if (type === "walk") return "Spaziergang heute ✓";
  if (type === "rest") return "Ruhiger Tag ✓";
  return "Sport heute ✓";
}

export function getActivityTypeEmoji(type: ActivityType) {
  return activityTypeEmojis[type];
}

export function getActivityTypeTitle(type: ActivityType) {
  const option = activityTypeOptions.find((entry) => entry.value === type);
  return option?.title ?? activityTypeLabels[type];
}

const activityIntensityRank: Record<ActivityType, number> = {
  rest: 0,
  walk: 1,
  sport: 2,
  intense: 3,
};

export type ActivityLogSummaryInput = Pick<
  StoredActivityLog,
  "activity_type" | "duration_minutes"
>;

export function sumActivityMinutes(
  logs: ActivityLogSummaryInput[],
) {
  return logs.reduce((sum, log) => sum + (log.duration_minutes ?? 0), 0);
}

export function getMostIntenseActivityType(
  logs: ActivityLogSummaryInput[],
): ActivityType {
  return logs.reduce<ActivityType>(
    (mostIntense, log) =>
      activityIntensityRank[log.activity_type] >
      activityIntensityRank[mostIntense]
        ? log.activity_type
        : mostIntense,
    logs[0]?.activity_type ?? "walk",
  );
}

export function formatJoinedActivityTitles(
  logs: ActivityLogSummaryInput[],
) {
  return logs.map((log) => getActivityTypeTitle(log.activity_type)).join(" + ");
}

export function formatHomeActivitySubtitle(
  activityType: ActivityType,
  durationMinutes: number | null,
  options?: { multiple?: boolean; totalMinutes?: number },
) {
  if (options?.multiple) {
    const total = options.totalMinutes ?? 0;
    if (total > 0) {
      return `${total} Minuten heute insgesamt ✓`;
    }
    return "Heute eingetragen ✓";
  }

  if (activityType === "rest") {
    return "Heute eingetragen ✓";
  }

  if (durationMinutes != null && durationMinutes > 0) {
    return `${durationMinutes} Minuten heute ✓`;
  }

  return "Heute eingetragen ✓";
}

export function buildHomeActivityWeekSummary(
  logs: Array<Pick<StoredActivityLog, "date" | "duration_minutes">>,
) {
  return {
    activeDays: new Set(logs.map((entry) => entry.date)).size,
    totalMinutes: logs.reduce(
      (sum, entry) => sum + (entry.duration_minutes ?? 0),
      0,
    ),
  };
}

export function formatHomeActivityWeekSubtitle(week: {
  activeDays: number;
  totalMinutes: number;
}) {
  return `Diese Woche: ${week.activeDays} von 7 Tagen aktiv · ${week.totalMinutes} Min. gesamt`;
}

export function buildHomeTodayActivitySummary(
  logs: ActivityLogSummaryInput[],
  week: { activeDays: number; totalMinutes: number } = {
    activeDays: 0,
    totalMinutes: 0,
  },
) {
  const weekSubtitle = formatHomeActivityWeekSubtitle(week);

  if (logs.length === 0) {
    return null;
  }

  const totalMinutes = sumActivityMinutes(logs);
  const mostIntenseType = getMostIntenseActivityType(logs);

  return {
    activityType: mostIntenseType,
    emoji: getActivityTypeEmoji(mostIntenseType),
    title:
      totalMinutes > 0
        ? `Aktiv heute — ${totalMinutes} Min.`
        : "Aktiv heute",
    durationMinutes: totalMinutes > 0 ? totalMinutes : null,
    subtitle: weekSubtitle,
    shortLabel: formatTodayActivityShortLabelFromLogs(logs),
    count: logs.length,
    totalMinutes,
    weekActiveDays: week.activeDays,
    weekTotalMinutes: week.totalMinutes,
  };
}

export function formatTodayActivityShortLabelFromLogs(
  logs: ActivityLogSummaryInput[],
) {
  if (logs.length === 0) {
    return "";
  }

  if (logs.length === 1) {
    return formatTodayActivityShortLabel(logs[0].activity_type);
  }

  const totalMinutes = sumActivityMinutes(logs);
  return `Aktiv heute — ${totalMinutes} Min. ✓`;
}

export function formatFamilyActivitySummary(
  patientLabel: string,
  log: ActivityLogSummaryInput,
) {
  const emoji = activityTypeEmojis[log.activity_type];

  if (log.activity_type === "rest") {
    return `${emoji} ${patientLabel} hatte heute einen ruhigen Tag`;
  }

  if (log.activity_type === "walk") {
    if (log.duration_minutes != null && log.duration_minutes > 0) {
      return `${emoji} ${patientLabel} hat heute ${log.duration_minutes} Min. spazieren gegangen`;
    }
    return `${emoji} ${patientLabel} war heute spazieren`;
  }

  if (log.activity_type === "intense") {
    if (log.duration_minutes != null && log.duration_minutes > 0) {
      return `${emoji} ${patientLabel} hat heute ${log.duration_minutes} Min. intensiv trainiert`;
    }
    return `${emoji} ${patientLabel} hatte heute ein intensives Training`;
  }

  if (log.duration_minutes != null && log.duration_minutes > 0) {
    return `${emoji} ${patientLabel} hat heute ${log.duration_minutes} Min. Sport gemacht`;
  }

  return `${emoji} ${patientLabel} hat heute Sport gemacht`;
}

export function formatFamilyActivitySummaryFromLogs(
  patientLabel: string,
  logs: ActivityLogSummaryInput[],
) {
  if (logs.length === 0) {
    return null;
  }

  if (logs.length === 1) {
    return formatFamilyActivitySummary(patientLabel, logs[0]);
  }

  const totalMinutes = sumActivityMinutes(logs);
  const emoji = getActivityTypeEmoji(getMostIntenseActivityType(logs));
  return `${emoji} ${patientLabel} war heute ${totalMinutes} Min. aktiv`;
}

export function formatFamilyCardActivitySubtitle(
  patientLabel: string,
  log: ActivityLogSummaryInput,
) {
  if (log.activity_type === "walk") {
    return `${patientLabel}: Spaziergang heute ✓`;
  }

  if (log.activity_type === "rest") {
    return `${patientLabel}: Ruhiger Tag ✓`;
  }

  return `${patientLabel}: Sport heute ✓`;
}

export function formatFamilyCardActivitySubtitleFromLogs(
  patientLabel: string,
  logs: ActivityLogSummaryInput[],
) {
  if (logs.length === 0) {
    return null;
  }

  if (logs.length === 1) {
    return formatFamilyCardActivitySubtitle(patientLabel, logs[0]);
  }

  const totalMinutes = sumActivityMinutes(logs);
  return `${patientLabel}: Aktiv heute — ${totalMinutes} Min. ✓`;
}
