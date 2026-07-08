import type { LucideIcon } from "lucide-react";
import {
  ClipboardList,
  FileText,
  LayoutDashboard,
  Stethoscope,
  Pill,
} from "lucide-react";

export type Feature = {
  href: string;
  title: string;
  description: string;
  icon: LucideIcon;
};

export const features: Feature[] = [
  {
    href: "/lab-results",
    title: "Laborwerte",
    description: "Ergebnisse hochladen und verständlich erklärt bekommen",
    icon: FileText,
  },
  {
    href: "/medication",
    title: "Medikamente",
    description: "Tägliche Einnahme bestätigen – Familie wird informiert",
    icon: Pill,
  },
  {
    href: "/dashboard",
    title: "Familien-Dashboard",
    description: "Gesundheit Ihrer Liebsten im Blick behalten",
    icon: LayoutDashboard,
  },
  {
    href: "/health-passport",
    title: "Gesundheitspass",
    description: "Wichtige Gesundheitsdaten an einem Ort",
    icon: ClipboardList,
  },
  {
    href: "/doctors",
    title: "Arzt buchen",
    description: "Schnell einen passenden Arzttermin finden",
    icon: Stethoscope,
  },
];
