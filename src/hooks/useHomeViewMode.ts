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
    if (!hasFamilyConnection) {
      setMode("self");
      return;
    }

    const stored = readStoredMode();
    if (stored) {
      setMode(stored);
      return;
    }

    setMode(role === "family_member" ? "family" : "self");
  }, [hasFamilyConnection, role]);

  function setViewMode(next: HomeViewMode) {
    setMode(next);
    window.localStorage.setItem(storageKey, next);
  }

  return { mode, setViewMode };
}
