"use client";

import Link from "next/link";
import { memo, useCallback, useEffect, useRef, useState, startTransition } from "react";
import {
  CardListSkeleton,
  ConnectionErrorState,
  FeatureEmptyState,
} from "@/components/AppStates";
import { FamilyMemberCard } from "@/components/FamilyMemberCard";
import { FamilyEmailNotifications } from "@/components/FamilyEmailNotifications";
import { SlowConnectionNotice } from "@/components/SlowConnectionNotice";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { useSlowConnection } from "@/hooks/useSlowConnection";
import { fetchWithTimeout } from "@/lib/fetch-with-timeout";
import {
  applyLatestLabResultChange,
  applyMedicationConfirmationChange,
  applyProfileCheckInChange,
  type FamilyDashboardData,
} from "@/lib/family-dashboard-status";
import { createClient } from "@/lib/supabase/client";
import type { StoredConfirmation } from "@/types/medication";

const emptyDashboard: FamilyDashboardData = {
  connected: false,
  member: null,
  overallStatus: "green",
  overallStatusText: "Alles okay heute ✓",
  medications: [],
  medicationStreak: 0,
  lastCheckIn: null,
  lastCheckInText: "Noch keine Aktivität heute",
  todayActivities: [],
  todayActivityText: null,
  latestLabResult: null,
  healthPassportAvailable: false,
};

type FamilyDashboardPanelProps = {
  patientId?: string;
  showConnectLink?: boolean;
  className?: string;
};

type MedicationConfirmationRow = StoredConfirmation;

type ProfileCheckInRow = {
  last_check_in_at: string | null;
};

type LabResultRow = {
  id: string;
  ai_analysis: string;
  created_at: string;
};

async function fetchDashboardData(patientId?: string) {
  const query = patientId
    ? `?patientId=${encodeURIComponent(patientId)}`
    : "";
  const response = await fetchWithTimeout(`/api/family-dashboard${query}`);

  if (!response.ok) {
    throw new Error("Family dashboard request failed.");
  }

  const data = (await response.json()) as FamilyDashboardData;
  return data.connected ? data : emptyDashboard;
}

function FamilyDashboardPanelComponent({
  patientId,
  showConnectLink = true,
  className = "mt-6",
}: FamilyDashboardPanelProps) {
  const isOnline = useOnlineStatus();
  const [dashboard, setDashboard] = useState<FamilyDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoadError, setHasLoadError] = useState(false);
  const hasLoadedOnceRef = useRef(false);
  const isSlow = useSlowConnection(isLoading);

  const patchDashboard = useCallback(
    (updater: (current: FamilyDashboardData) => FamilyDashboardData) => {
      startTransition(() => {
        setDashboard((current) => {
          if (!current?.member) return current;
          return updater(current);
        });
      });
    },
    [],
  );

  const loadDashboard = useCallback(async (showLoading = false) => {
    if (showLoading) {
      setIsLoading(true);
      setHasLoadError(false);
    }

    try {
      const data = await fetchDashboardData(patientId);
      setDashboard(data);
      setHasLoadError(false);
      hasLoadedOnceRef.current = true;
      return data;
    } catch {
      if (showLoading) {
        setDashboard(null);
        setHasLoadError(true);
      }
      return null;
    } finally {
      if (showLoading) {
        setIsLoading(false);
      }
    }
  }, [patientId]);

  useEffect(() => {
    hasLoadedOnceRef.current = false;
    setDashboard(null);
  }, [patientId]);

  useEffect(() => {
    const supabase = createClient();
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let cancelled = false;

    async function start() {
      setIsLoading(true);
      setHasLoadError(false);

      let data: FamilyDashboardData | null = null;

      try {
        data = await fetchDashboardData(patientId);
        if (!cancelled) {
          setDashboard(data);
          setHasLoadError(false);
          hasLoadedOnceRef.current = true;
        }
      } catch {
        if (!cancelled) {
          setDashboard(null);
          setHasLoadError(true);
        }
        return;
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }

      if (cancelled) return;

      const subscribedPatientId = patientId ?? data?.member?.patientId;
      if (!subscribedPatientId) return;

      channel = supabase
        .channel(`family-dashboard-${subscribedPatientId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "medication_confirmations",
            filter: `user_id=eq.${subscribedPatientId}`,
          },
          (payload) => {
            const row = payload.new as MedicationConfirmationRow | null;
            if (!row?.dose_time) return;

            patchDashboard((current) =>
              applyMedicationConfirmationChange(current, row),
            );
          },
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "lab_results",
            filter: `user_id=eq.${subscribedPatientId}`,
          },
          (payload) => {
            const row = payload.new as LabResultRow | null;
            if (!row?.id) return;

            patchDashboard((current) =>
              applyLatestLabResultChange(current, row),
            );
          },
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "profiles",
            filter: `id=eq.${subscribedPatientId}`,
          },
          (payload) => {
            const row = payload.new as ProfileCheckInRow | null;
            if (!row) return;

            patchDashboard((current) =>
              applyProfileCheckInChange(current, row.last_check_in_at),
            );
          },
        )
        .subscribe();
    }

    void start();

    return () => {
      cancelled = true;
      if (channel) {
        void supabase.removeChannel(channel);
      }
    };
  }, [patchDashboard, patientId]);

  if (isLoading && !hasLoadedOnceRef.current) {
    return (
      <div className={className}>
        <CardListSkeleton />
        {isSlow ? (
          <SlowConnectionNotice message="Das dauert etwas länger — bitte warten Sie." />
        ) : null}
      </div>
    );
  }

  if (hasLoadError || !dashboard) {
    return (
      <div className={className}>
        <ConnectionErrorState
          isOffline={!isOnline}
          onRetry={() => void loadDashboard(true)}
        />
      </div>
    );
  }

  if (!dashboard.connected || !dashboard.member) {
    return (
      <div className={className}>
        <FeatureEmptyState
          emoji="👨‍👩‍👦"
          title="Noch keine Familienverbindung"
          subtitle="Verbinden Sie sich mit Ihren Eltern, damit Sie ihre Gesundheit liebevoll im Blick behalten können."
          actionLabel="Familie verbinden"
          href="/family/connect"
        />
      </div>
    );
  }

  return (
    <div className={className}>
      <FamilyMemberCard data={dashboard} />

      <FamilyEmailNotifications
        patientFirstName={dashboard.member.firstName}
        relationshipLabel={dashboard.member.relationship}
      />

      {showConnectLink ? (
        <Link
          href="/family/connect"
          className="btn-touch mt-6 w-full rounded-2xl border-2 border-primary bg-surface px-5 py-4 text-base font-semibold text-primary transition-colors hover:bg-primary-light"
        >
          Weitere Familie verbinden
        </Link>
      ) : null}
    </div>
  );
}

export const FamilyDashboardPanel = memo(FamilyDashboardPanelComponent);
