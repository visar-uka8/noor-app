"use client";

import Link from "next/link";
import { useAuthUser } from "@/hooks/useAuthUser";

type FamilyEmailNotificationsProps = {
  patientFirstName: string;
  patientLabel?: string;
};

export function FamilyEmailNotifications({
  patientFirstName,
  patientLabel = "Mama",
}: FamilyEmailNotificationsProps) {
  const { user } = useAuthUser();
  const email = user?.email ?? "Ihre E-Mail-Adresse";

  return (
    <section className="mt-6 rounded-2xl bg-[#E1F5EE] px-5 py-4">
      <div className="mb-3 flex items-center gap-3">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-[#1D9E75] text-lg"
          aria-hidden="true"
        >
          🔔
        </div>
        <div className="min-w-0">
          <p className="text-[15px] font-semibold text-[#085041]">
            E-Mail Benachrichtigungen
          </p>
          <p className="text-[13px] text-[#1D5B40]">
            Aktiv für {patientFirstName}
          </p>
        </div>
      </div>

      <p className="text-[13px] leading-[1.55] text-[#1D5B40]">
        Wenn {patientLabel} eine Dosis vergisst, schicken wir Ihnen eine E-Mail
        damit Sie liebevoll nachfragen können.
      </p>

      <p className="mt-4 text-[13px] text-[#1D5B40]">
        Sie erhalten E-Mails an:{" "}
        <span className="font-semibold text-[#085041]">{email}</span>{" "}
        <Link
          href="/settings"
          className="font-semibold text-[#1D9E75] underline-offset-2 hover:underline"
        >
          Ändern
        </Link>
      </p>
    </section>
  );
}
