import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  CalendarDays,
  Clock,
  FileText,
} from "lucide-react";

export type FamilyStatusTone = "green" | "amber" | "red" | "gray";

export type FamilyStatusRow = {
  id: string;
  label: string;
  subtext: string;
  tone: FamilyStatusTone;
  icon: LucideIcon;
  statusText: string;
};

export const connectedFamilyMember = {
  initials: "HL",
  name: "Hans Leka",
  relationship: "Vater",
  status: "Verbunden",
  phone: "+493012345678",
};

export const familyStatusRows: FamilyStatusRow[] = [
  {
    id: "medication",
    label: "Medikamente heute",
    subtext: "Morgendliche Medikamente nicht bestätigt",
    tone: "amber",
    icon: AlertTriangle,
    statusText: "Bitte prüfen",
  },
  {
    id: "labs",
    label: "Letzte Laborwerte",
    subtext: "Hochgeladen am 7. Juli · 2 Werte beachten",
    tone: "amber",
    icon: FileText,
    statusText: "Beachten",
  },
  {
    id: "appointment",
    label: "Nächster Arzttermin",
    subtext: "15. Juli · Dr. Schneider",
    tone: "green",
    icon: CalendarDays,
    statusText: "Geplant",
  },
  {
    id: "check-in",
    label: "Letzte Aktivität",
    subtext: "Heute um 8:12",
    tone: "green",
    icon: Clock,
    statusText: "Aktiv",
  },
];

export const missedMedicationRow: FamilyStatusRow = {
  id: "medication-missed",
  label: "Medikamente heute",
  subtext: "Morgendliche Medikamente nicht bestätigt",
  tone: "amber",
  icon: AlertTriangle,
  statusText: "Bitte prüfen",
};

export type FamilyNotification = {
  id: string;
  type: "missed_medication";
  title: string;
  body: string;
  createdAt: string;
  readAt: string | null;
};

export const missedMedicationNotification: FamilyNotification = {
  id: "missed-morning-medication",
  type: "missed_medication",
  title: "Medikamente nicht bestätigt",
  body: "Mama hat ihre Medikamente um 8:00 noch nicht bestätigt. Jetzt anrufen?",
  createdAt: new Date().toISOString(),
  readAt: null,
};

export const parentUserId = "hans-leka-demo";
