"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { AppBottomNav } from "@/components/AppBottomNav";
import {
  HomeViewModeProvider,
  useHomeViewModeContext,
} from "@/components/HomeViewModeContext";
import { useFamilyRoles } from "@/hooks/useFamilyRoles";
import { useHomeViewMode } from "@/hooks/useHomeViewMode";
import { useUserRole } from "@/hooks/useUserRole";
import { isDedicatedFamilyMemberAccount } from "@/lib/family-member-flow";

function AuthenticatedAppShellInner({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  useEffect(() => {
    document
      .querySelector(".app-scroll-main")
      ?.classList.remove("home-scroll-lock");
  }, [pathname]);

  return (
    <div className="app-shell">
      <main className="app-scroll-main">{children}</main>
      <AppBottomNav />
    </div>
  );
}

function AuthenticatedAppShellProviders({
  children,
}: {
  children: React.ReactNode;
}) {
  const { roles } = useFamilyRoles();
  const profileRole = useUserRole();
  const { mode } = useHomeViewMode(
    roles.isWatcher,
    profileRole,
  );

  return (
    <HomeViewModeProvider
      mode={mode}
      hasFamilyConnection={roles.isWatcher}
    >
      <AuthenticatedAppShellInner>{children}</AuthenticatedAppShellInner>
    </HomeViewModeProvider>
  );
}

export function AuthenticatedAppShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthenticatedAppShellProviders>
      {children}
    </AuthenticatedAppShellProviders>
  );
}

export { useHomeViewModeContext };
