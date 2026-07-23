"use client";

import Link from "next/link";
import { CalendarClock } from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";
import {
  formatAppointmentDateShort,
} from "@/types/appointments";

type HomeAppointmentsCardProps = {
  nextAppointment: {
    id: string;
    doctorName: string;
    scheduledAt: string;
    needsNotes: boolean;
  } | null;
};

export function HomeAppointmentsCard({
  nextAppointment,
}: HomeAppointmentsCardProps) {
  const { t } = useLanguage();

  if (!nextAppointment) {
    return (
      <Link
        href="/appointments"
        className="noor-card flex items-center gap-3 p-4 transition-colors hover:border-primary/30"
      >
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary-light text-primary">
          <CalendarClock size={24} aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="home-card-title font-bold text-[#085041]">
            {t("appointments_title")}
          </h2>
          <p className="home-card-subtitle mt-1 text-muted">
            {t("appointments_empty_subtitle")}
          </p>
        </div>
      </Link>
    );
  }

  return (
    <Link
      href="/appointments"
      className="noor-card flex items-center gap-3 p-4 transition-colors hover:border-primary/30"
    >
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary-light text-primary">
        <CalendarClock size={24} aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <h2 className="home-card-title font-bold text-[#085041]">
          {nextAppointment.needsNotes
            ? t("appointments_add_notes")
            : t("appointments_next")}
        </h2>
        <p className="home-card-subtitle mt-1 text-primary">
          {nextAppointment.doctorName} ·{" "}
          {formatAppointmentDateShort(nextAppointment.scheduledAt)}
        </p>
      </div>
    </Link>
  );
}
