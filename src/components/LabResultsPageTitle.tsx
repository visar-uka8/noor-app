"use client";

import { AppHeader } from "@/components/AppHeader";
import { useLanguage } from "@/components/LanguageProvider";

export function LabResultsPageTitle() {
  const { t } = useLanguage();

  return <AppHeader showBack title={t("lab.title")} />;
}
