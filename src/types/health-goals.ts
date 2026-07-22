export type PersonalGoal = {
  emoji: string;
  name: string;
  target: string;
  why: string;
  current?: string;
};

export type ParsedHealthGoalNumbers = {
  stepsGoal: number | null;
  waterGoalLiters: number | null;
  proteinGoalGrams: number | null;
  sleepHoursMin: number | null;
  sleepHoursMax: number | null;
};

export type HealthGoalsApiResponse = {
  goals: {
    id: string;
    stepsGoal: number | null;
    waterGoalLiters: number | null;
    proteinGoalGrams: number | null;
    calculatedAt: string;
    goalDateLabel: string;
  } | null;
  today: {
    steps: number;
    waterLiters: number;
    proteinGrams: number;
  };
};

export type DailyGoalProgress = HealthGoalsApiResponse["today"];

export type ActiveHealthGoals = NonNullable<HealthGoalsApiResponse["goals"]>;
