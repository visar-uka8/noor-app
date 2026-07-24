"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "@/components/LanguageProvider";

const GOALS_UPDATED_KEY = "noor-goals-updated";
const GOALS_UPDATED_DATE_KEY = "noor-goals-updated-date";

export function markGoalsUpdatedInStorage() {
  if (typeof window === "undefined") return;

  localStorage.setItem(GOALS_UPDATED_KEY, "true");
  localStorage.setItem(GOALS_UPDATED_DATE_KEY, new Date().toISOString());
}

function readGoalsUpdatedToday() {
  if (typeof window === "undefined") return false;

  const goalsUpdated = localStorage.getItem(GOALS_UPDATED_KEY);
  const goalsUpdatedDate = localStorage.getItem(GOALS_UPDATED_DATE_KEY);

  if (!goalsUpdated || !goalsUpdatedDate) {
    return false;
  }

  return (
    new Date(goalsUpdatedDate).toDateString() === new Date().toDateString()
  );
}

function clearGoalsUpdatedStorage() {
  localStorage.removeItem(GOALS_UPDATED_KEY);
  localStorage.removeItem(GOALS_UPDATED_DATE_KEY);
}

export function GoalsUpdatedBanner() {
  const { t } = useLanguage();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(readGoalsUpdatedToday());
  }, []);

  if (!visible) {
    return null;
  }

  function dismiss() {
    clearGoalsUpdatedStorage();
    setVisible(false);
  }

  return (
    <div className="mb-3 flex items-center justify-between rounded-2xl bg-[#E1F5EE] px-4 py-3.5">
      <div className="flex items-center gap-2.5">
        <span className="text-xl" aria-hidden="true">
          🎯
        </span>
        <div>
          <div className="text-sm font-semibold text-[#085041]">
            {t("goals_updated_title")}
          </div>
          <div className="mt-0.5 text-xs text-[#1D5B40]">
            {t("goals_updated_subtitle")}
          </div>
        </div>
      </div>
      <button
        type="button"
        onClick={dismiss}
        className="border-none bg-transparent p-1 text-lg text-[#88856F]"
        aria-label={t("close")}
      >
        ✕
      </button>
    </div>
  );
}
