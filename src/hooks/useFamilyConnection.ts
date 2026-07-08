"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchWithTimeout } from "@/lib/fetch-with-timeout";
import type { FamilyDashboardData } from "@/lib/family-dashboard-status";

export type FamilyConnectionSummary = {
  connected: boolean;
  displayLabel: string;
  patientName: string;
};

const emptyConnection: FamilyConnectionSummary = {
  connected: false,
  displayLabel: "",
  patientName: "",
};

/** Active family link where the current user cares for a patient. */
export function useFamilyConnection() {
  const [connection, setConnection] =
    useState<FamilyConnectionSummary>(emptyConnection);
  const [isLoading, setIsLoading] = useState(true);

  const loadConnection = useCallback(async () => {
    setIsLoading(true);

    try {
      const response = await fetchWithTimeout("/api/family-dashboard");

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
        displayLabel: data.member.displayLabel,
        patientName: data.member.name,
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

  return { connection, isLoading, reload: loadConnection };
}
