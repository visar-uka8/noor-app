"use client";

import { AppBottomNav } from "@/components/AppBottomNav";
import {
  HomeViewModeProvider,
  useHomeViewModeContext,
} from "@/components/HomeViewModeContext";
import { useFamilyConnection } from "@/hooks/useFamilyConnection";
import { useHomeViewMode } from "@/hooks/useHomeViewMode";
import { useUserRole } from "@/hooks/useUserRole";

function AuthenticatedAppShellInner({
  children,
}: {
  children: React.ReactNode;
}) {
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
  const role = useUserRole();
  const { connection } = useFamilyConnection();
  const { mode, setViewMode } = useHomeViewMode(
    connection.connected,
    role,
  );

  return (
    <HomeViewModeProvider
      mode={mode}
      hasFamilyConnection={connection.connected}
      setViewMode={setViewMode}
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
