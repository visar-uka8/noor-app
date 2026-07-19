import type { PatientFamilyNote } from "@/types/family-notes";

export type FamilyHubWatchedPatient = {
  linkId: string;
  patientId: string;
  patientName: string;
  patientFirstName: string;
  relationship: string;
  initials: string;
  avatarUrl: string | null;
  overallStatus: "green" | "amber" | "red";
  overallStatusText: string;
  healthPassportAvailable: boolean;
};

export type FamilyHubResponse = {
  watching: FamilyHubWatchedPatient[];
  watchers: Array<{
    linkId: string;
    watcherId: string;
    watcherName: string;
    watcherFirstName: string;
    watcherInitials: string;
    watcherAvatarUrl?: string | null;
    relationship: string;
  }>;
  hasConnections: boolean;
  unreadFamilyNote: PatientFamilyNote | null;
};
