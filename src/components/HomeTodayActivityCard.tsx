"use client";

import { useRouter } from "next/navigation";
import { useLanguage } from "@/components/LanguageProvider";
import { getActivityTypeLabel } from "@/lib/i18n/activity-labels";
import { getGoalProgressRatio } from "@/lib/health-goals-data";
import type { HomeScreenData } from "@/lib/home-screen";

type HomeTodayActivityCardProps = {
  activity: HomeScreenData["todayActivity"];
  week: HomeScreenData["activityWeek"];
  healthGoals: HomeScreenData["healthGoals"];
};

export function HomeTodayActivityCard({
  activity,
  week,
  healthGoals,
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

  const hasGoals = healthGoals != null;
  const todayLog = healthGoals?.today;
  const goals = healthGoals?.goals;
  const totalMinutes = activity?.totalMinutes ?? 0;
  const activityTypeLabel =
    activity?.activityType != null
      ? getActivityTypeLabel(activity.activityType, t)
      : null;

  return (
    <section
      role="button"
      tabIndex={0}
      onClick={navigateToActivity}
      onKeyDown={handleKeyDown}
      className="noor-card flex flex-col p-4 transition-colors hover:border-primary/30 active:scale-[0.98]"
      style={{ cursor: "pointer" }}
      aria-label={
        activity ? t("home_activity_view_history") : t("home_activity_view_log")
      }
    >
      <div className="mb-1">
        <h2 className="home-card-title font-bold text-[#085041]">
          {t("home_activity_goals_title")}
        </h2>
        <p className="home-card-subtitle mt-1 text-muted">{weekSubtitle}</p>
      </div>

      <div className={hasGoals ? "mb-3.5" : ""}>
        {activity && totalMinutes > 0 ? (
          <div className="flex items-center gap-2.5 rounded-[10px] bg-[#E1F5EE] p-2.5">
            <span className="text-xl" aria-hidden="true">
              {activity.emoji}
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-[#085041]">
                {activityTypeLabel}
              </div>
              <div className="text-xs text-[#1D5B40]">
                {t("home_activity_minutes_today", { minutes: totalMinutes })}
              </div>
            </div>
            <span
              aria-hidden="true"
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#1D9E75] text-sm text-white"
            >
              ✓
            </span>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="text-[22px]" aria-hidden="true">
                🏃
              </span>
              <span className="text-sm text-[#88856F]">
                {t("home_no_activity_today")}
              </span>
            </div>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                router.push("/activity");
              }}
              className="rounded-[20px] border-none bg-[#E1F5EE] px-3.5 py-1.5 text-[13px] font-semibold text-[#1D9E75]"
            >
              {t("home_activity_log_entry")}
            </button>
          </div>
        )}
      </div>

      {hasGoals && goals ? (
        <div className="border-t border-[#F0EFE9] pt-3">
          <div className="mb-2.5 text-[11px] font-medium uppercase tracking-[0.06em] text-[#88856F]">
            {t("daily_goals")}
          </div>

          {goals.stepsGoal != null ? (
            <GoalProgressRow
              emoji="🚶"
              label={t("steps_goal")}
              current={todayLog?.steps ?? 0}
              goal={goals.stepsGoal}
              color="#1D9E75"
              targetLabel={t("goal_target", {
                value: goals.stepsGoal.toLocaleString("de-DE"),
              })}
              formatValue={(value) => value.toLocaleString("de-DE")}
            />
          ) : null}

          {goals.waterGoalLiters != null ? (
            <GoalProgressRow
              emoji="💧"
              label={t("water_label")}
              current={todayLog?.waterLiters ?? 0}
              goal={goals.waterGoalLiters}
              color="#378ADD"
              targetLabel={t("goal_target", {
                value: `${goals.waterGoalLiters.toLocaleString("de-DE", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}L`,
              })}
              formatValue={(value) =>
                `${value.toLocaleString("de-DE", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}L`
              }
            />
          ) : null}

          <div
            role="presentation"
            onClick={(event) => {
              event.stopPropagation();
              router.push("/activity");
            }}
            className="mt-2 cursor-pointer text-right text-xs font-medium text-[#1D9E75]"
          >
            {t("home_log_steps_water")} →
          </div>
        </div>
      ) : null}
    </section>
  );
}

function GoalProgressRow({
  emoji,
  label,
  current,
  goal,
  color,
  targetLabel,
  formatValue,
}: {
  emoji: string;
  label: string;
  current: number;
  goal: number;
  color: string;
  targetLabel: string;
  formatValue: (value: number) => string;
}) {
  const reached = current >= goal;
  const progress = getGoalProgressRatio(current, goal);

  return (
    <div className="mb-2.5 last:mb-2">
      <div className="mb-1 flex justify-between">
        <span className="text-[13px] text-[#1E1D1B]">
          {emoji} {label}
        </span>
        <span
          className={`text-[13px] font-semibold ${reached ? "text-[#1D9E75]" : "text-[#085041]"}`}
        >
          {current > 0
            ? `${formatValue(current)} / ${formatValue(goal)}`
            : targetLabel}
        </span>
      </div>
      <div className="h-[5px] overflow-hidden rounded-[3px] bg-[#E4E2DB]">
        <div
          className="h-full rounded-[3px] transition-[width] duration-500 ease-out"
          style={{
            width: `${Math.round(progress * 100)}%`,
            backgroundColor: color,
          }}
        />
      </div>
    </div>
  );
}
