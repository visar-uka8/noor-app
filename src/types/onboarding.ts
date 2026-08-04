export type OnboardingStepKey = "profile" | "medication" | "lab" | "family";

export type OnboardingSteps = Record<OnboardingStepKey, boolean>;

export type OnboardingState = {
  completed: boolean;
  steps: OnboardingSteps;
};
