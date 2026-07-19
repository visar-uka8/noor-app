"use client";

import { AppHeader } from "@/components/AppHeader";
import { useHomeViewModeContext } from "@/components/HomeViewModeContext";
import { useLanguage } from "@/components/LanguageProvider";
import { useFamilyConnection } from "@/hooks/useFamilyConnection";
import { useFamilyRoles } from "@/hooks/useFamilyRoles";
import { useUserRole } from "@/hooks/useUserRole";
import { isFamilyMemberAccount } from "@/lib/family-member-flow";

export function LabResultsPageTitle() {
  const { t } = useLanguage();
  const { mode, hasFamilyConnection } = useHomeViewModeContext();
  const { connection } = useFamilyConnection();
  const { roles } = useFamilyRoles();
  const profileRole = useUserRole();
  const isFamilyMember = isFamilyMemberAccount(profileRole, roles);

  const isFamilyView =
    connection.connected &&
    (isFamilyMember || (mode === "family" && hasFamilyConnection));

  const title = isFamilyView
    ? `${connection.toggleLabel}s Laborwerte`
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
      {connection.toggleLabel}s Befunde
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
