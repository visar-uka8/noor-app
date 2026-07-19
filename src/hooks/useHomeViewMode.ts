"use client";

import type { HomeViewMode } from "@/components/HomeViewModeContext";
import type { UserRole } from "@/types/profiles";

export function useHomeViewMode(
  isWatcher: boolean,
  profileRole: UserRole | null,
) {
  const mode: HomeViewMode =
    profileRole === "family_member" && isWatcher ? "family" : "self";

  return { mode };
}
