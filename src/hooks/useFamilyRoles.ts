"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchWithTimeout } from "@/lib/fetch-with-timeout";
import { familyConnectionsChangedEvent } from "@/lib/family-links-query";
import type { FamilyRoleState } from "@/lib/family-roles";

const emptyRoles: FamilyRoleState & { watcherFollowText: string } = {
  isWatcher: false,
  isPatient: false,
  watching: [],
  watchers: [],
  watcherFollowText: "",
};

export function useFamilyRoles() {
  const [roles, setRoles] = useState(emptyRoles);
  const [isLoading, setIsLoading] = useState(true);

  const loadRoles = useCallback(async () => {
    setIsLoading(true);

    try {
      const response = await fetchWithTimeout("/api/family-roles", {
        credentials: "include",
      });

      if (!response.ok) {
        setRoles(emptyRoles);
        return;
      }

      const data = (await response.json()) as FamilyRoleState & {
        watcherFollowText?: string;
      };

      setRoles({
        isWatcher: data.isWatcher,
        isPatient: data.isPatient,
        watching: data.watching ?? [],
        watchers: data.watchers ?? [],
        watcherFollowText: data.watcherFollowText ?? "",
      });
    } catch {
      setRoles(emptyRoles);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRoles();
  }, [loadRoles]);

  useEffect(() => {
    const handleChange = () => {
      void loadRoles();
    };

    window.addEventListener(familyConnectionsChangedEvent, handleChange);
    return () =>
      window.removeEventListener(familyConnectionsChangedEvent, handleChange);
  }, [loadRoles]);

  return { roles, isLoading, reload: loadRoles };
}
