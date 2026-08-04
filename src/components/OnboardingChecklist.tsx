"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useLanguage } from "@/components/LanguageProvider";
import { buildApiAuthHeaders } from "@/lib/api-auth";
import { fetchWithTimeout } from "@/lib/fetch-with-timeout";
import type { OnboardingState, OnboardingStepKey } from "@/types/onboarding";

type OnboardingChecklistProps = {
  onboarding: OnboardingState;
  onCompleted?: () => void;
};

const STEP_DEFINITIONS: Array<{
  key: OnboardingStepKey;
  labelKey: string;
  sublabelKey: string;
  icon: string;
  route: string;
}> = [
  {
    key: "profile",
    labelKey: "onboarding_step_profile",
    sublabelKey: "onboarding_step_profile_sub",
    icon: "👤",
    route: "/settings/profile",
  },
  {
    key: "medication",
    labelKey: "onboarding_step_medication",
    sublabelKey: "onboarding_step_medication_sub",
    icon: "💊",
    route: "/medication/add",
  },
  {
    key: "lab",
    labelKey: "onboarding_step_lab",
    sublabelKey: "onboarding_step_lab_sub",
    icon: "🧪",
    route: "/lab-results",
  },
  {
    key: "family",
    labelKey: "onboarding_step_family",
    sublabelKey: "onboarding_step_family_sub",
    icon: "👨‍👩‍👦",
    route: "/family/connect",
  },
];

export function OnboardingChecklist({
  onboarding,
  onCompleted,
}: OnboardingChecklistProps) {
  const router = useRouter();
  const { t } = useLanguage();
  const [isCompleting, setIsCompleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const completedCount = Object.values(onboarding.steps).filter(Boolean).length;

  async function handleComplete() {
    setIsCompleting(true);
    setError(null);

    try {
      const headers = await buildApiAuthHeaders(true);
      const response = await fetchWithTimeout("/api/onboarding/complete", {
        method: "POST",
        credentials: "include",
        headers,
      });

      if (!response.ok) {
        throw new Error(t("onboarding_complete_failed"));
      }

      onCompleted?.();
      router.refresh();
    } catch (completeError) {
      setError(
        completeError instanceof Error
          ? completeError.message
          : t("onboarding_complete_failed"),
      );
    } finally {
      setIsCompleting(false);
    }
  }

  return (
    <section
      className="noor-card mb-3 p-4"
      style={{ borderWidth: "0.5px" }}
      aria-label={t("onboarding_title")}
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-[#085041]">
          {t("onboarding_title")}
        </h2>
        <span className="text-[13px] text-[#88856F]">
          {t("onboarding_progress", { count: completedCount, total: 4 })}
        </span>
      </div>

      <div className="mb-3.5 h-1.5 overflow-hidden rounded-sm bg-[#E4E2DB]">
        <div
          className="h-full rounded-sm bg-[#1D9E75] transition-[width] duration-500 ease-out"
          style={{ width: `${(completedCount / 4) * 100}%` }}
        />
      </div>

      <ul className="list-none">
        {STEP_DEFINITIONS.map((step, index) => {
          const done = onboarding.steps[step.key];

          return (
            <li
              key={step.key}
              className={
                index < STEP_DEFINITIONS.length - 1
                  ? "border-b border-[#F0EFE9]"
                  : undefined
              }
              style={{ borderBottomWidth: index < STEP_DEFINITIONS.length - 1 ? "0.5px" : undefined }}
            >
              <button
                type="button"
                disabled={done}
                onClick={() => {
                  if (!done) {
                    router.push(step.route);
                  }
                }}
                className="flex w-full items-center gap-3 py-2.5 text-left disabled:cursor-default"
                style={{ opacity: done ? 0.6 : 1 }}
              >
                <span
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm"
                  style={{
                    backgroundColor: done ? "#1D9E75" : "#F7F6F2",
                    border: done ? "none" : "0.5px solid #E4E2DB",
                    color: done ? "#FFFFFF" : undefined,
                  }}
                  aria-hidden="true"
                >
                  {done ? "✓" : step.icon}
                </span>

                <span className="min-w-0 flex-1">
                  <span
                    className={`block text-sm ${
                      done
                        ? "font-normal text-[#88856F] line-through"
                        : "font-semibold text-[#085041]"
                    }`}
                  >
                    {t(step.labelKey)}
                  </span>
                  {!done ? (
                    <span className="mt-0.5 block text-xs text-[#88856F]">
                      {t(step.sublabelKey)}
                    </span>
                  ) : null}
                </span>

                {!done ? (
                  <span className="text-base text-[#1D9E75]" aria-hidden="true">
                    →
                  </span>
                ) : null}
              </button>
            </li>
          );
        })}
      </ul>

      {completedCount === 4 ? (
        <button
          type="button"
          disabled={isCompleting}
          onClick={() => void handleComplete()}
          className="btn-primary mt-3 w-full py-3 text-sm disabled:opacity-70"
        >
          {isCompleting ? t("activity_loading_short") : t("onboarding_ready")}
        </button>
      ) : null}

      {error ? (
        <p className="mt-2 text-sm font-semibold text-danger" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}
