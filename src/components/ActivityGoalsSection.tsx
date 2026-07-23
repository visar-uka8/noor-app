"use client";

import { useCallback, useEffect, useState } from "react";
import { GoalRow } from "@/components/GoalRow";
import { useLanguage } from "@/components/LanguageProvider";
import { buildApiAuthHeaders } from "@/lib/api-auth";
import { fetchWithTimeout } from "@/lib/fetch-with-timeout";
import type {
  DailyGoalProgress,
  HealthGoalsApiResponse,
} from "@/types/health-goals";

type ActivityGoalsSectionProps = {
  onUpdated?: () => void;
};

export function ActivityGoalsSection({ onUpdated }: ActivityGoalsSectionProps) {
  const { t } = useLanguage();
  const [data, setData] = useState<HealthGoalsApiResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [savingField, setSavingField] = useState<
    "steps" | "waterLiters" | "proteinGrams" | null
  >(null);

  const loadGoals = useCallback(async () => {
    setIsLoading(true);

    try {
      const headers = await buildApiAuthHeaders();
      const response = await fetchWithTimeout("/api/health-goals", {
        credentials: "include",
        headers,
      });

      if (!response.ok) {
        setData(null);
        return;
      }

      const payload = (await response.json()) as HealthGoalsApiResponse;
      setData(payload);
    } catch {
      setData(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadGoals();
  }, [loadGoals]);

  async function saveField(
    field: "steps" | "waterLiters" | "proteinGrams",
    value: number,
  ) {
    setSavingField(field);

    try {
      const headers = await buildApiAuthHeaders(true);
      const body: Partial<DailyGoalProgress> = { [field]: value };

      const response = await fetchWithTimeout("/api/health-goals/today", {
        method: "PATCH",
        credentials: "include",
        headers,
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        return;
      }

      const payload = (await response.json()) as { today: DailyGoalProgress };
      setData((current) =>
        current
          ? {
              ...current,
              today: payload.today,
            }
          : current,
      );
      onUpdated?.();
    } finally {
      setSavingField(null);
    }
  }

  if (isLoading || !data?.goals) {
    return null;
  }

  const { goals, today } = data;
  const hasTrackableGoal =
    goals.stepsGoal != null ||
    goals.waterGoalLiters != null ||
    goals.proteinGoalGrams != null;

  if (!hasTrackableGoal) {
    return null;
  }

  return (
    <section
      style={{
        backgroundColor: "#FFFFFF",
        borderRadius: "16px",
        border: "0.5px solid #E4E2DB",
        padding: "16px",
        marginBottom: "12px",
        boxShadow: "0 8px 24px rgba(8, 80, 65, 0.04)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "12px",
          marginBottom: "14px",
        }}
      >
        <div
          style={{
            fontSize: "11px",
            fontWeight: 500,
            letterSpacing: "0.08em",
            color: "#88856F",
            textTransform: "uppercase",
          }}
        >
          {t("daily_goals")}
        </div>
        <div
          style={{
            fontSize: "11px",
            color: "#1D9E75",
            textAlign: "right",
            lineHeight: 1.4,
          }}
        >
          {t("goals_based_on", { date: goals.goalDateLabel })}
        </div>
      </div>

      {goals.stepsGoal != null ? (
        <GoalRow
          emoji="🚶"
          label={t("steps_goal")}
          current={today.steps}
          goal={goals.stepsGoal}
          unit=""
          color="#1D9E75"
          showInput
          inputPlaceholder={t("activity_steps_placeholder")}
          isSaving={savingField === "steps"}
          isLast={
            goals.waterGoalLiters == null && goals.proteinGoalGrams == null
          }
          onSave={(value) => saveField("steps", value)}
        />
      ) : null}

      {goals.waterGoalLiters != null ? (
        <GoalRow
          emoji="💧"
          label={t("water_label")}
          current={today.waterLiters}
          goal={goals.waterGoalLiters}
          unit="L"
          color="#378ADD"
          showInput
          inputPlaceholder={t("activity_water_example")}
          quickButtons={["0.5", "1.0", "1.5", "2.0", "2.5", "3.0"]}
          isSaving={savingField === "waterLiters"}
          isLast={goals.proteinGoalGrams == null}
          onSave={(value) => saveField("waterLiters", value)}
        />
      ) : null}

      {goals.proteinGoalGrams != null ? (
        <GoalRow
          emoji="🥩"
          label={t("protein_goal")}
          current={today.proteinGrams}
          goal={goals.proteinGoalGrams}
          unit="g"
          color="#E8904A"
          showInput
          inputPlaceholder={t("activity_protein_example")}
          isSaving={savingField === "proteinGrams"}
          isLast
          onSave={(value) => saveField("proteinGrams", value)}
        />
      ) : null}
    </section>
  );
}
