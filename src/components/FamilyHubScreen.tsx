"use client";

import { ChevronRight, UserPlus } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
  CardListSkeleton,
  ConnectionErrorState,
} from "@/components/AppStates";
import { FamilyConnectInvite } from "@/components/FamilyConnectInvite";
import { FamilyConnectJoin } from "@/components/FamilyConnectJoin";
import { FamilyDashboardPanel } from "@/components/FamilyDashboardPanel";
import { FamilyNoteHomeCard } from "@/components/FamilyNoteHomeCard";
import { FamilyNoteReplyHomeCard } from "@/components/FamilyNoteReplyHomeCard";
import { usePatientFamilyNote } from "@/hooks/usePatientFamilyNote";
import { useWatcherFamilyNoteReply } from "@/hooks/useWatcherFamilyNoteReply";
import { Avatar } from "@/components/ui/Avatar";
import { useUserRole } from "@/hooks/useUserRole";
import { fetchWithTimeout } from "@/lib/fetch-with-timeout";
import { familyConnectionsChangedEvent } from "@/lib/family-links-query";
import {
  overallStatusCopy,
  type FamilyOverallStatus,
} from "@/lib/family-dashboard-status";
import type { FamilyHubResponse } from "@/lib/family-hub-types";

const emptyHub: FamilyHubResponse = {
  watching: [],
  watchers: [],
  hasConnections: false,
  unreadFamilyNote: null,
};

export function FamilyHubScreen() {
  const role = useUserRole();
  const isFamilyMember = role === "family_member";
  const [hub, setHub] = useState<FamilyHubResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoadError, setHasLoadError] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(
    null,
  );
  const [showConnect, setShowConnect] = useState(false);
  const { note: patientFamilyNote, dismiss: dismissPatientFamilyNote } =
    usePatientFamilyNote();
  const { reply: watcherFamilyNoteReply, dismiss: dismissWatcherFamilyNoteReply } =
    useWatcherFamilyNoteReply();

  const loadHub = useCallback(async () => {
    setIsLoading(true);
    setHasLoadError(false);

    try {
      const response = await fetchWithTimeout("/api/family-hub", {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Family hub request failed.");
      }

      const data = (await response.json()) as FamilyHubResponse;
      setHub(data);
      setHasLoadError(false);
    } catch {
      setHub(emptyHub);
      setHasLoadError(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadHub();
  }, [loadHub]);

  useEffect(() => {
    if (hub?.watching.length === 1) {
      setSelectedPatientId(hub.watching[0]?.patientId ?? null);
    }
  }, [hub?.watching]);

  useEffect(() => {
    const handleChange = () => {
      void loadHub();
    };

    window.addEventListener(familyConnectionsChangedEvent, handleChange);
    return () =>
      window.removeEventListener(familyConnectionsChangedEvent, handleChange);
  }, [loadHub]);

  if (isLoading) {
    return (
      <main className="mx-auto flex w-full max-w-app flex-1 flex-col px-5 py-6">
        <CardListSkeleton />
      </main>
    );
  }

  if (hasLoadError || !hub) {
    return (
      <main className="mx-auto flex w-full max-w-app flex-1 flex-col px-5 py-6">
        <ConnectionErrorState onRetry={() => void loadHub()} />
      </main>
    );
  }

  if (isFamilyMember && hub.watching.length === 0) {
    return (
      <main className="mx-auto flex w-full max-w-app flex-1 flex-col px-5 py-6">
        <FamilyConnectJoin />
      </main>
    );
  }

  if (!hub.hasConnections) {
    return (
      <main className="mx-auto flex w-full max-w-app flex-1 flex-col gap-6 px-5 py-6">
        <FamilyConnectInvite />
        {!isFamilyMember ? (
          <>
            <div className="flex items-center gap-3" aria-hidden="true">
              <div className="h-px flex-1 bg-border" />
              <span className="text-sm font-medium text-muted">oder</span>
              <div className="h-px flex-1 bg-border" />
            </div>
            <FamilyConnectJoin />
          </>
        ) : null}
      </main>
    );
  }

  const selectedPatient = hub.watching.find(
    (patient) => patient.patientId === selectedPatientId,
  );

  return (
    <main className="mx-auto flex w-full max-w-app flex-1 flex-col gap-6 px-5 py-6">
      {watcherFamilyNoteReply ? (
        <FamilyNoteReplyHomeCard
          reply={watcherFamilyNoteReply}
          onDismiss={dismissWatcherFamilyNoteReply}
        />
      ) : null}

      {patientFamilyNote ? (
        <FamilyNoteHomeCard
          note={patientFamilyNote}
          onDismiss={dismissPatientFamilyNote}
        />
      ) : null}

      {hub.watching.length > 0 ? (
        <section aria-label="Angehörige im Blick">
          <SectionTitle>Ich passe auf … auf</SectionTitle>
          <ul className="mt-3 flex flex-col gap-3">
            {hub.watching.map((patient) => (
              <WatchedPatientCard
                key={patient.patientId}
                patient={patient}
                selected={selectedPatientId === patient.patientId}
                onSelect={() =>
                  setSelectedPatientId((current) =>
                    current === patient.patientId ? null : patient.patientId,
                  )
                }
              />
            ))}
          </ul>
        </section>
      ) : null}

      {selectedPatient ? (
        <section aria-label={`Gesundheit von ${selectedPatient.patientName}`}>
          <h2 className="mb-3 text-lg font-bold text-[#085041]">
            {selectedPatient.patientName}
          </h2>
          <p className="mb-4 text-sm text-muted">
            Medikamente, Gesundheitspass und Kontakt
          </p>
          <FamilyDashboardPanel
            patientId={selectedPatient.patientId}
            showConnectLink={false}
            className="mt-0"
          />
        </section>
      ) : hub.watching.length > 1 ? (
        <p className="rounded-2xl bg-[#FAFAF8] px-4 py-3 text-center text-[15px] text-muted">
          Wählen Sie eine Person, um Medikamente, Gesundheitspass und Befunde
          zu sehen.
        </p>
      ) : null}

      {hub.watchers.length > 0 ? (
        <section aria-label="Familie folgt mir">
          <SectionTitle>… folgt mir</SectionTitle>
          <ul className="mt-3 flex flex-col gap-3">
            {hub.watchers.map((watcher) => (
              <li
                key={watcher.linkId}
                className="noor-card flex items-center gap-4 p-4"
              >
                <Avatar
                  url={watcher.watcherAvatarUrl}
                  name={watcher.watcherName}
                  firstName={watcher.watcherFirstName}
                  initials={watcher.watcherInitials}
                  size={52}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-base font-bold text-[#085041]">
                    {watcher.watcherName}
                  </p>
                  <p className="mt-0.5 text-sm text-muted">
                    {watcher.relationship}
                  </p>
                  <p className="mt-1 text-sm font-medium text-primary">
                    Folgt Ihrer Gesundheit 💚
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section aria-label="Weitere Verbindungen">
        {showConnect ? (
          <div className="flex flex-col gap-6">
            {!isFamilyMember ? <FamilyConnectInvite /> : null}
            <FamilyConnectJoin />
            <button
              type="button"
              onClick={() => setShowConnect(false)}
              className="btn-touch w-full rounded-2xl border-2 border-border bg-surface px-5 py-3.5 text-base font-semibold text-muted"
            >
              Schließen
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowConnect(true)}
            className="btn-touch flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-primary bg-surface px-5 py-4 text-base font-semibold text-primary transition-colors hover:bg-primary-light"
          >
            <UserPlus size={22} aria-hidden="true" />
            Weitere Familie verbinden
          </button>
        )}
      </section>
    </main>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-[13px] font-bold uppercase tracking-wide text-[#88856F]">
      {children}
    </h2>
  );
}

function WatchedPatientCard({
  patient,
  selected,
  onSelect,
}: {
  patient: FamilyHubResponse["watching"][number];
  selected: boolean;
  onSelect: () => void;
}) {
  const status = overallStatusCopy[patient.overallStatus as FamilyOverallStatus];

  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        aria-pressed={selected}
        className={`noor-card flex w-full items-center gap-4 p-4 text-left transition-colors ${
          selected ? "border-primary ring-1 ring-primary/20" : ""
        }`}
      >
        <Avatar
          url={patient.avatarUrl}
          name={patient.patientName}
          firstName={patient.patientFirstName}
          initials={patient.initials}
          size={52}
        />
        <div className="min-w-0 flex-1">
          <p className="text-base font-bold text-[#085041]">
            {patient.patientName}
          </p>
          <p className="mt-0.5 text-sm text-muted">{patient.relationship}</p>
          <div className="mt-2 flex items-center gap-2">
            <span
              className={`h-2.5 w-2.5 shrink-0 rounded-full ${status.circleClass}`}
              aria-hidden="true"
            />
            <p className={`text-sm font-semibold leading-snug ${status.textClass}`}>
              {patient.overallStatusText}
            </p>
          </div>
          {patient.healthPassportAvailable ? (
            <p className="mt-1 text-xs font-semibold text-[#1D9E75]">
              🏥 Pass verfügbar
            </p>
          ) : null}
        </div>
        <ChevronRight
          size={22}
          className={`shrink-0 text-muted transition-transform ${
            selected ? "rotate-90" : ""
          }`}
          aria-hidden="true"
        />
      </button>
    </li>
  );
}
