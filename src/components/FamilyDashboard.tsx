"use client";

import { UsersRound } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { CardListSkeleton, ErrorBanner, FeatureEmptyState } from "@/components/AppStates";
import { FamilyMemberCard } from "@/components/FamilyMemberCard";
import { FamilyNotificationSettings } from "@/components/FamilyNotificationSettings";
import { createClient } from "@/lib/supabase/client";
import {
  demoFamilyDashboard,
  type FamilyDashboardData,
} from "@/lib/family-dashboard-status";

const emptyDashboard: FamilyDashboardData = {
  connected: false,
  member: null,
  overallStatus: "green",
  overallStatusText: "Alles okay heute ✓",
  medications: [],
  lastCheckIn: null,
  lastCheckInText: "Noch kein Check-in heute",
  latestLabResult: null,
};

export function FamilyDashboard() {
  const [dashboard, setDashboard] = useState<FamilyDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoadError, setHasLoadError] = useState(false);

  const loadDashboard = useCallback(async () => {
    try {
      const response = await fetch("/api/family-dashboard");

      if (!response.ok) {
        throw new Error("Family dashboard request failed.");
      }

      const data = (await response.json()) as FamilyDashboardData;
      setDashboard(data.connected ? data : emptyDashboard);
      setHasLoadError(false);
    } catch {
      setDashboard(demoFamilyDashboard);
      setHasLoadError(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    if (!dashboard?.member?.patientId) return;

    const patientId = dashboard.member.patientId;
    const supabase = createClient();
    let pollTimer: number | undefined;

    const channel = supabase
      .channel(`family-dashboard-${patientId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "medication_confirmations",
          filter: `user_id=eq.${patientId}`,
        },
        () => {
          void loadDashboard();
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "lab_results",
          filter: `user_id=eq.${patientId}`,
        },
        () => {
          void loadDashboard();
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "profiles",
          filter: `id=eq.${patientId}`,
        },
        () => {
          void loadDashboard();
        },
      )
      .subscribe();

    pollTimer = window.setInterval(() => {
      void loadDashboard();
    }, 5000);

    return () => {
      window.clearInterval(pollTimer);
      void supabase.removeChannel(channel);
    };
  }, [dashboard?.member?.patientId, loadDashboard]);

  if (isLoading) {
    return (
      <main className="mx-auto flex min-h-full w-full max-w-app flex-1 flex-col px-5 py-6">
        <DashboardHeader />
        <div className="mt-6">
          <CardListSkeleton />
        </div>
      </main>
    );
  }

  if (!dashboard?.connected || !dashboard.member) {
    return (
      <main className="mx-auto flex min-h-full w-full max-w-app flex-1 flex-col px-5 py-6">
        <DashboardHeader />
        <FeatureEmptyState
          emoji="👨‍👩‍👦"
          title="Noch keine Familienverbindung"
          subtitle="Verbinden Sie sich mit Ihren Eltern, damit Sie ihre Gesundheit liebevoll im Blick behalten können."
          actionLabel="Familie verbinden"
          href="/family/connect"
        />
      </main>
    );
  }

  return (
    <>
      {hasLoadError ? (
        <ErrorBanner
          message="Live-Daten sind gerade nicht verfügbar. Es werden Beispieldaten angezeigt."
          actionLabel="Erneut laden"
          onAction={() => void loadDashboard()}
        />
      ) : null}

      <main className="mx-auto flex min-h-full w-full max-w-app flex-1 flex-col px-5 py-6">
        <DashboardHeader />

        <FamilyMemberCard data={dashboard} />

        <FamilyNotificationSettings patientLabel={dashboard.member.displayLabel} />

        <Link
          href="/family/connect"
          className="btn-touch mt-6 w-full rounded-2xl border-2 border-primary bg-surface px-5 py-4 text-base font-semibold text-primary transition-colors hover:bg-primary-light"
        >
          Weitere Familie verbinden
        </Link>
      </main>
    </>
  );
}

function DashboardHeader() {
  return (
    <header>
      <div className="flex items-center gap-3">
        <div
          className="flex h-12 w-12 items-center justify-center rounded-2xl bg-family-light text-family"
          aria-hidden="true"
        >
          <UsersRound size={28} strokeWidth={2.2} />
        </div>
        <div>
          <p className="text-sm font-medium text-muted">Für Alex</p>
          <h1 className="heading-lg text-[1.75rem] leading-tight">Familie</h1>
        </div>
      </div>
      <p className="mt-3 text-base leading-relaxed text-muted">
        Alles Wichtige auf einen Blick — ruhig, übersichtlich und liebevoll.
      </p>
    </header>
  );
}
