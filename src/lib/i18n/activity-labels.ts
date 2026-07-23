import type { AppLanguage } from "@/lib/i18n/languages";
import { DATE_LOCALE } from "@/lib/i18n/languages";
import type { ActivityType, StoredActivityLog } from "@/types/activity-log";

type TranslateFn = (
  key: string,
  vars?: Record<string, string | number>,
) => string;

const ACTIVITY_TYPE_KEYS: Record<
  ActivityType,
  { title: string; subtitle: string; short: string }
> = {
  walk: {
    title: "walk",
    subtitle: "activity_walk_sub",
    short: "walk",
  },
  sport: {
    title: "sport",
    subtitle: "activity_sport_sub",
    short: "activity_sport_short",
  },
  intense: {
    title: "intense_training",
    subtitle: "activity_intense_sub",
    short: "intense_training",
  },
  rest: {
    title: "rest_day",
    subtitle: "activity_rest_sub",
    short: "activity_rest_short",
  },
};

function parseLocalDateString(dateStr: string) {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function getActivityTypeOptions(t: TranslateFn) {
  return (Object.keys(ACTIVITY_TYPE_KEYS) as ActivityType[]).map((value) => {
    const keys = ACTIVITY_TYPE_KEYS[value];
    const emoji =
      value === "walk"
        ? "🚶"
        : value === "sport"
          ? "🏃"
          : value === "intense"
            ? "💪"
            : "🛋️";

    return {
      value,
      emoji,
      title: t(keys.title),
      subtitle: t(keys.subtitle),
    };
  });
}

export function getActivityTypeLabel(type: ActivityType, t: TranslateFn) {
  return t(ACTIVITY_TYPE_KEYS[type].short);
}

export function formatLocalizedWeekday(
  language: AppLanguage,
  dateStr: string,
  style: "narrow" | "short" | "long" = "short",
) {
  return new Intl.DateTimeFormat(DATE_LOCALE[language] ?? "de-DE", {
    weekday: style,
  }).format(parseLocalDateString(dateStr));
}

export function formatLocalizedActivityDate(
  language: AppLanguage,
  dateStr: string,
  weekdayStyle: "short" | "long" = "short",
) {
  const date = parseLocalDateString(dateStr);
  const weekday = formatLocalizedWeekday(language, dateStr, weekdayStyle);
  const formattedDate = date.toLocaleDateString(DATE_LOCALE[language] ?? "de-DE", {
    day: "numeric",
    month: "long",
  });

  return { weekday, formattedDate };
}

export function formatLocalizedActivityEntry(
  log: Pick<StoredActivityLog, "date" | "activity_type" | "duration_minutes">,
  language: AppLanguage,
  t: TranslateFn,
) {
  const { weekday, formattedDate } = formatLocalizedActivityDate(
    language,
    log.date,
  );
  const title = getActivityTypeLabel(log.activity_type, t);

  if (log.duration_minutes != null && log.duration_minutes > 0) {
    return t("activity_entry_with_duration", {
      weekday,
      date: formattedDate,
      title,
      minutes: log.duration_minutes,
    });
  }

  return t("activity_entry", {
    weekday,
    date: formattedDate,
    title,
  });
}

export function formatLocalizedBarDayTooltip(
  date: string,
  logs: Array<
    Pick<StoredActivityLog, "date" | "activity_type" | "duration_minutes">
  >,
  language: AppLanguage,
  t: TranslateFn,
) {
  const { weekday, formattedDate } = formatLocalizedActivityDate(
    language,
    date,
    "long",
  );
  const dayLogs = logs.filter((log) => log.date === date);

  if (dayLogs.length === 0) {
    return t("activity_bar_empty", { weekday, date: formattedDate });
  }

  const totalMinutes = dayLogs.reduce(
    (sum, log) => sum + (log.duration_minutes ?? 0),
    0,
  );
  const activityTitles = [
    ...new Set(dayLogs.map((log) => getActivityTypeLabel(log.activity_type, t))),
  ];
  const activityLabel = activityTitles.join(" + ");

  if (totalMinutes > 0) {
    return t("activity_bar_with_minutes", {
      weekday,
      date: formattedDate,
      minutes: totalMinutes,
      activity: activityLabel,
    });
  }

  return t("activity_bar_with_activity", {
    weekday,
    date: formattedDate,
    activity: activityLabel,
  });
}

export function formatLocalizedTodayActivityEntry(
  log: Pick<StoredActivityLog, "activity_type" | "duration_minutes">,
  t: TranslateFn,
) {
  const label = getActivityTypeLabel(log.activity_type, t);

  if (log.duration_minutes != null && log.duration_minutes > 0) {
    return t("activity_today_entry_minutes", {
      label,
      minutes: log.duration_minutes,
    });
  }

  return label;
}
