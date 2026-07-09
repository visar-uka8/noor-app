"use client";

import { useEffect, useState } from "react";
import type { HomeViewMode } from "@/components/HomeModeSwitcher";
import type { UserRole } from "@/types/profiles";

const storageKey = "noor-home-view-mode";

function readStoredMode(): HomeViewMode | null {
  if (typeof window === "undefined") return null;
  const stored = window.localStorage.getItem(storageKey);
  return stored === "self" || stored === "family" ? stored : null;
}

export function useHomeViewMode(
  hasFamilyConnection: boolean,
  role: UserRole | null,
) {
  const [mode, setMode] = useState<HomeViewMode>("self");

  useEffect(() => {
    const nextMode = (() => {
      if (!hasFamilyConnection) return "self" as const;
      const stored = readStoredMode();
      if (stored) return stored;
      return role === "family_member" ? ("family" as const) : ("self" as const);
    })();

    setMode((current) => (current === nextMode ? current : nextMode));
  }, [hasFamilyConnection, role]);

  function setViewMode(next: HomeViewMode) {
    setMode(next);
    window.localStorage.setItem(storageKey, next);
  }

  return { mode, setViewMode };
}
