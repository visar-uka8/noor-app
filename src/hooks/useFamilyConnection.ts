"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchWithTimeout } from "@/lib/fetch-with-timeout";
import { familyConnectionsChangedEvent } from "@/lib/family-links-query";
import { getFamilyToggleLabel } from "@/lib/family-dashboard-status";
import type { FamilyDashboardData } from "@/lib/family-dashboard-status";

export type FamilyConnectionSummary = {
  connected: boolean;
  displayLabel: string;
  patientName: string;
  toggleLabel: string;
};

const emptyConnection: FamilyConnectionSummary = {
  connected: false,
  displayLabel: "",
  patientName: "",
  toggleLabel: "Familie",
};

/** Active family link where the current user cares for a patient. */
export function useFamilyConnection() {
  const [connection, setConnection] =
    useState<FamilyConnectionSummary>(emptyConnection);
  const [isLoading, setIsLoading] = useState(true);

  const loadConnection = useCallback(async () => {
    setIsLoading(true);

    try {
      const response = await fetchWithTimeout("/api/family-dashboard", {
        credentials: "include",
      });

      if (!response.ok) {
        setConnection(emptyConnection);
        return;
      }

      const data = (await response.json()) as FamilyDashboardData;

      if (!data.connected || !data.member) {
        setConnection(emptyConnection);
        return;
      }

      setConnection({
        connected: true,
        displayLabel: data.member.firstName,
        patientName: data.member.name,
        toggleLabel: getFamilyToggleLabel(data.member.firstName),
      });
    } catch {
      setConnection(emptyConnection);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadConnection();
  }, [loadConnection]);

  useEffect(() => {
    const handleChange = () => {
      void loadConnection();
    };

    window.addEventListener(familyConnectionsChangedEvent, handleChange);
    return () =>
      window.removeEventListener(familyConnectionsChangedEvent, handleChange);
  }, [loadConnection]);

  return { connection, isLoading, reload: loadConnection };
}
