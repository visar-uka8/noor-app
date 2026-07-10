"use client";

import { AppHeader } from "@/components/AppHeader";
import { useHomeViewModeContext } from "@/components/HomeViewModeContext";
import { useLanguage } from "@/components/LanguageProvider";
import { useFamilyConnection } from "@/hooks/useFamilyConnection";

export function LabResultsPageTitle() {
  const { t } = useLanguage();
  const { mode, hasFamilyConnection } = useHomeViewModeContext();
  const { connection } = useFamilyConnection();

  const isFamilyView =
    mode === "family" && hasFamilyConnection && connection.connected;

  const title = isFamilyView
    ? `${connection.displayLabel}s Laborwerte`
    : t("lab.title");

  const badge = isFamilyView ? (
    <span
      style={{
        background: "#DDDCFB",
        color: "#3C3489",
        padding: "2px 10px",
        borderRadius: "20px",
        fontSize: "12px",
        fontWeight: "600",
      }}
    >
      {connection.displayLabel}s Befunde
    </span>
  ) : (
    <span
      style={{
        background: "#E1F5EE",
        color: "#085041",
        padding: "2px 10px",
        borderRadius: "20px",
        fontSize: "12px",
        fontWeight: "600",
      }}
    >
      Meine Befunde
    </span>
  );

  return <AppHeader showBack title={title} badge={badge} />;
}
