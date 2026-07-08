"use client";

import { UsersRound } from "lucide-react";
import { AppBottomNav } from "@/components/AppBottomNav";
import { FamilyDashboardPanel } from "@/components/FamilyDashboardPanel";

export function FamilyDashboard() {
  return (
    <>
      <main className="content-bottom-nav mx-auto flex min-h-full w-full max-w-app flex-1 flex-col px-5 py-6">
        <DashboardHeader />
        <FamilyDashboardPanel />
      </main>
      <AppBottomNav />
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
          <h1 className="heading-lg text-[1.75rem] leading-tight">Familie</h1>
        </div>
      </div>
    </header>
  );
}
