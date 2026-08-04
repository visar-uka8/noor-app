"use client";

import { useRouter } from "next/navigation";
import { useLanguage } from "@/components/LanguageProvider";
import { WaterTodayRow } from "@/components/WaterTodayRow";
import { getActivityTypeLabel } from "@/lib/i18n/activity-labels";
import type { HomeScreenData } from "@/lib/home-screen";

type HomeTodayActivityCardProps = {
  activity: HomeScreenData["todayActivity"];
  week: HomeScreenData["activityWeek"];
  healthGoals: HomeScreenData["healthGoals"];
  waterLiters?: number;
  isSavingWater?: boolean;
  waterError?: string | null;
  onQuickAddWater?: (amount: number) => void | Promise<boolean>;
};

function formatWaterLiters(value: number): string {
  return value.toLocaleString("de-DE", {
    minimumFractionDigits: value % 1 === 0 ? 0 : 1,
    maximumFractionDigits: 1,
  });
}

export function HomeTodayActivityCard({
  activity,
  week,
  healthGoals,
  waterLiters,
  isSavingWater = false,
  waterError = null,
  onQuickAddWater,
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

  const todayLog = healthGoals?.today;
  const waterGoalLiters = healthGoals?.goals?.waterGoalLiters ?? null;
  const totalMinutes = activity?.totalMinutes ?? 0;
  const activityTypeLabel =
    activity?.activityType != null
      ? getActivityTypeLabel(activity.activityType, t)
      : null;

  const waterToday = waterLiters ?? todayLog?.waterLiters ?? 0;
  const hasWaterGoal = waterGoalLiters != null && waterGoalLiters > 0;

  const waterLabelText = hasWaterGoal
    ? waterToday > 0
      ? `${formatWaterLiters(waterToday)}L / ${formatWaterLiters(waterGoalLiters)}L`
      : t("water_card_goal_hint", { goal: formatWaterLiters(waterGoalLiters) })
    : waterToday > 0
      ? t("water_card_today", { amount: formatWaterLiters(waterToday) })
      : t("water_card_track");

  return (
    <section
      role="button"
      tabIndex={0}
      onClick={navigateToActivity}
      onKeyDown={handleKeyDown}
      className="noor-card mb-3 flex flex-col p-4 transition-colors hover:border-primary/30 active:scale-[0.98]"
      style={{ cursor: "pointer" }}
      aria-label={
        activity ? t("home_activity_view_history") : t("home_activity_view_log")
      }
    >
      <h2 className="home-card-title mb-2 text-[15px] font-semibold text-[#085041]">
        {t("home_activity_goals_title")}
      </h2>
      <p className="home-card-subtitle mb-1 text-muted">{weekSubtitle}</p>

      <div className="mb-3">
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
          <div className="flex items-center gap-2.5">
            <span className="text-[22px]" aria-hidden="true">
              🏃
            </span>
            <span className="text-sm text-[#88856F]">
              {t("home_no_activity_today")}
            </span>
          </div>
        )}
      </div>

      {onQuickAddWater ? (
        <div
          onClick={(event) => event.stopPropagation()}
          onPointerDown={(event) => event.stopPropagation()}
          role="presentation"
          className="mt-3 border-t border-[#F0EFE9] pt-3"
          style={{ borderTopWidth: "0.5px" }}
        >
          <WaterTodayRow
            waterLiters={waterToday}
            waterGoalLiters={waterGoalLiters}
            isSaving={isSavingWater}
            error={waterError}
            statusText={waterLabelText}
            statusClassName="text-[13px] font-medium text-[#085041]"
            stopPropagation
            onQuickAdd={async (amount) => {
              const result = onQuickAddWater(amount);
              if (result instanceof Promise) {
                return result;
              }
              return true;
            }}
          />
        </div>
      ) : (
        <div
          className="border-t border-[#F0EFE9] pt-3"
          style={{ borderTopWidth: "0.5px", marginTop: "12px", paddingTop: "12px" }}
        >
          <div className="flex items-center gap-2">
            <span className="text-sm" aria-hidden="true">
              💧
            </span>
            <span className="text-[13px] font-medium text-[#085041]">
              {waterLabelText}
            </span>
          </div>
        </div>
      )}
    </section>
  );
}
