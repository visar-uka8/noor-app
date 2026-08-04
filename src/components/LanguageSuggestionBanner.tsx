"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useLanguage } from "@/components/LanguageProvider";
import {
  confirmDetectedLanguage,
  shouldShowLanguageSuggestion,
} from "@/lib/detectLanguage";
import { SUPPORTED_LANGUAGES } from "@/lib/i18n/languages";

export function LanguageSuggestionBanner() {
  const { t, language } = useLanguage();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(shouldShowLanguageSuggestion());
  }, []);

  if (!visible) {
    return null;
  }

  const languageLabel =
    SUPPORTED_LANGUAGES.find((entry) => entry.code === language)?.label ??
    language;

  function dismissConfirmed() {
    confirmDetectedLanguage();
    setVisible(false);
  }

  return (
    <div className="mb-3 flex items-center justify-between gap-3 rounded-2xl bg-[#F7F6F2] px-4 py-3.5">
      <div className="text-sm text-[#085041]">
        <span aria-hidden="true" className="mr-1.5">
          🌍
        </span>
        {t("language_suggestion_title", { language: languageLabel })}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={dismissConfirmed}
          className="rounded-full border border-[#E4E2DB] bg-white px-3.5 py-1.5 text-[13px] font-medium text-[#085041]"
        >
          {t("language_suggestion_yes")}
        </button>
        <Link
          href="/profil"
          onClick={dismissConfirmed}
          className="rounded-full bg-primary px-3.5 py-1.5 text-[13px] font-medium text-white no-underline"
        >
          {t("language_suggestion_change")}
        </Link>
      </div>
    </div>
  );
}
