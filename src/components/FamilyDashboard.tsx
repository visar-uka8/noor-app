"use client";

import { UsersRound } from "lucide-react";
import { memo } from "react";
import { FamilyDashboardPanel } from "@/components/FamilyDashboardPanel";

export function FamilyDashboard() {
  return (
    <div className="mx-auto flex w-full max-w-app flex-col px-5 py-6">
      <DashboardHeader />
      <FamilyDashboardPanel />
    </div>
  );
}

const DashboardHeader = memo(function DashboardHeader() {
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
          <h1 className="heading-lg text-[1.75rem] leading-tight">Familie</h1>
        </div>
      </div>
    </header>
  );
});
