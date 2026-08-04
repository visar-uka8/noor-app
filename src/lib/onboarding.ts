import type { SupabaseClient } from "@supabase/supabase-js";
import { isMissingColumnError } from "@/lib/load-settings-profile";
import type {
  OnboardingState,
  OnboardingStepKey,
  OnboardingSteps,
} from "@/types/onboarding";

export const DEFAULT_ONBOARDING_STEPS: OnboardingSteps = {
  profile: false,
  medication: false,
  lab: false,
  family: false,
};

const ONBOARDING_STEP_KEYS: OnboardingStepKey[] = [
  "profile",
  "medication",
  "lab",
  "family",
];

export function parseOnboardingSteps(raw: unknown): OnboardingSteps {
  if (!raw || typeof raw !== "object") {
    return { ...DEFAULT_ONBOARDING_STEPS };
  }

  const record = raw as Record<string, unknown>;

  return {
    profile: record.profile === true,
    medication: record.medication === true,
    lab: record.lab === true,
    family: record.family === true,
  };
}

export function mergeOnboardingSteps(
  stored: OnboardingSteps,
  updates: Partial<OnboardingSteps>,
): OnboardingSteps {
  return {
    ...stored,
    ...updates,
  };
}

export function isOnboardingFullyComplete(steps: OnboardingSteps) {
  return ONBOARDING_STEP_KEYS.every((key) => steps[key]);
}

export function detectOnboardingSteps(context: {
  dateOfBirth?: string | null;
  medicationCount: number;
  labResultCount: number;
  familyConnectedCount: number;
  familyWatchingCount?: number;
}): Partial<OnboardingSteps> {
  const updates: Partial<OnboardingSteps> = {};

  if (context.dateOfBirth) {
    updates.profile = true;
  }
  if (context.medicationCount > 0) {
    updates.medication = true;
  }
  if (context.labResultCount > 0) {
    updates.lab = true;
  }
  if (
    context.familyConnectedCount > 0 ||
    (context.familyWatchingCount ?? 0) > 0
  ) {
    updates.family = true;
  }

  return updates;
}

type OnboardingProfileRow = {
  onboarding_completed?: boolean | null;
  onboarding_steps?: unknown;
};

export async function loadOnboardingState(
  supabase: SupabaseClient,
  userId: string,
): Promise<OnboardingState | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("onboarding_completed, onboarding_steps")
    .eq("id", userId)
    .maybeSingle<OnboardingProfileRow>();

  if (error) {
    if (isMissingColumnError(error)) {
      return null;
    }
    throw error;
  }

  const steps = parseOnboardingSteps(data?.onboarding_steps);

  return {
    completed: data?.onboarding_completed === true,
    steps,
  };
}

export async function saveOnboardingState(
  supabase: SupabaseClient,
  userId: string,
  steps: OnboardingSteps,
  completed: boolean,
) {
  const { error } = await supabase
    .from("profiles")
    .update({
      onboarding_steps: steps,
      onboarding_completed: completed,
    })
    .eq("id", userId);

  if (error && !isMissingColumnError(error)) {
    throw error;
  }
}

export async function markOnboardingStep(
  supabase: SupabaseClient,
  userId: string,
  step: OnboardingStepKey,
) {
  const current = await loadOnboardingState(supabase, userId);
  if (!current || current.completed) {
    return current;
  }

  if (current.steps[step]) {
    return current;
  }

  const steps = mergeOnboardingSteps(current.steps, { [step]: true });
  const completed = isOnboardingFullyComplete(steps);

  await saveOnboardingState(supabase, userId, steps, completed);

  return { steps, completed };
}

export async function completeOnboarding(
  supabase: SupabaseClient,
  userId: string,
) {
  const current = await loadOnboardingState(supabase, userId);
  if (!current) {
    return null;
  }

  const steps: OnboardingSteps = {
    profile: true,
    medication: true,
    lab: true,
    family: true,
  };

  await saveOnboardingState(supabase, userId, steps, true);

  return { steps, completed: true };
}

export async function syncOnboardingForHome(
  supabase: SupabaseClient,
  userId: string,
  context: {
    dateOfBirth?: string | null;
    medicationCount: number;
    labResultCount: number;
    familyConnectedCount: number;
    familyWatchingCount?: number;
  },
): Promise<OnboardingState | null> {
  const current = await loadOnboardingState(supabase, userId);
  if (!current) {
    return null;
  }

  if (current.completed) {
    return current;
  }

  const inferred = detectOnboardingSteps(context);
  const merged = mergeOnboardingSteps(current.steps, inferred);
  const allComplete = isOnboardingFullyComplete(merged);

  const needsUpdate =
    allComplete ||
    ONBOARDING_STEP_KEYS.some((key) => merged[key] !== current.steps[key]);

  if (needsUpdate) {
    await saveOnboardingState(supabase, userId, merged, allComplete);
  }

  return {
    steps: merged,
    completed: allComplete,
  };
}
